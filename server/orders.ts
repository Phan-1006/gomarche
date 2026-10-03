import crypto from 'crypto';
import { Router } from 'express';
import type { Response } from 'express';
import {
  METHOD_TO_GATEWAY,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentRecord,
  Role,
} from '../src/types';
import { GOMA_BOUNDS, GOMA_QUARTIERS } from '../src/data/mockData';
import { audit, db, DbUser, findStaff, newId, roleOf, save } from './db';
import { deliveryOptions } from './schedule';
import {
  AuthedRequest,
  botCheck,
  clearFailures,
  isLocked,
  normalizePhone,
  orderLimiter,
  recordFailure,
  requireAuth,
  requireRole,
  safeEqual,
  str,
  writeLimiter,
} from './security';
import { pushToRole, pushToUsers } from './push';

const round2 = (n: number) => Math.round(n * 100) / 100;
const ACTIVE: OrderStatus[] = ['awaiting_payment', 'confirmed', 'preparing', 'ready', 'in_delivery'];
const isActive = (o: Order) => ACTIVE.includes(o.status);

// Positions GPS des livreurs : volatiles, gardées en mémoire uniquement.
const driverLocations = new Map<string, { lat: number; lng: number; at: number; accuracy?: number }>();

const inGoma = (lat: number, lng: number) =>
  lat >= GOMA_BOUNDS.minLat && lat <= GOMA_BOUNDS.maxLat && lng >= GOMA_BOUNDS.minLng && lng <= GOMA_BOUNDS.maxLng;

const STATUS_RANK: Record<OrderStatus, number> = {
  awaiting_payment: 0,
  confirmed: 1,
  preparing: 2,
  ready: 3,
  in_delivery: 4,
  delivered: 5,
  cancelled: 6,
};

// Ce que le client reçoit sur son téléphone à chaque étape franchie.
function customerNotice(order: Order, status: OrderStatus): string | null {
  switch (status) {
    case 'confirmed':
      return 'Paiement validé : votre commande est confirmée.';
    case 'preparing':
      return 'Votre commande est en cours de préparation.';
    case 'ready':
      return order.deliveryMode === 'delivery' ? 'Votre commande est prête, un livreur va la prendre en charge.' : 'Votre commande est prête : vous pouvez venir la retirer.';
    case 'in_delivery':
      return 'Votre livreur est en route.';
    case 'delivered':
      return 'Commande remise. Merci et à bientôt !';
    case 'cancelled':
      return 'Votre commande a été annulée.';
    default:
      return null;
  }
}

function setStatus(order: Order, status: OrderStatus, by: string) {
  const forward = STATUS_RANK[status] > STATUS_RANK[order.status];
  order.status = status;
  order.history.push({ at: Date.now(), status, by });
  // Un retour en arrière (employé retiré d'une commande) ne dérange personne.
  if (!forward) return;
  const tag = `order-${order.id}`;
  const notice = customerNotice(order, status);
  if (notice) pushToUsers([order.userId], { title: `Commande ${order.orderNumber}`, body: notice, tag, orderId: order.id });
  if (status === 'confirmed') {
    pushToRole('order_agent', { title: 'Nouvelle commande à préparer', body: `Commande ${order.orderNumber} confirmée.`, tag, orderId: order.id });
  } else if (status === 'ready' && order.deliveryMode === 'delivery' && !order.deliveryDriverId) {
    pushToRole('delivery_driver', { title: 'Course disponible', body: `La commande ${order.orderNumber} est prête à être livrée.`, tag, orderId: order.id });
  } else if (status === 'ready' && order.deliveryDriverId) {
    pushToUsers([order.deliveryDriverId], { title: `Commande ${order.orderNumber}`, body: 'La commande est prête : vous pouvez venir la chercher.', tag, orderId: order.id });
  }
}

// Messages des autres participants arrivés depuis la dernière lecture de la conversation.
const unreadCount = (order: Order, userId: string) => {
  const readAt = order.chatReadAt?.[userId] || 0;
  return db.messages.filter((m) => m.orderId === order.id && m.senderId !== userId && m.at > readAt).length;
};

// Ce que chaque profil a le droit de voir d'une commande.
function viewOrder(order: Order, user: DbUser, role: Role): Order {
  const isOwner = order.userId === user.id;
  const isDriver = order.deliveryDriverId === user.id;
  const view: Order = { ...order, customer: { ...order.customer } };
  delete view.chatReadAt;

  // Le code de remise est le secret du client : c'est lui qui le dicte au livreur.
  if (!isOwner && role !== 'admin') delete view.confirmationCode;

  if (!isOwner && role !== 'admin') {
    view.customer.email = '';
    // Un livreur qui n'a pas encore réclamé la course ne voit que le quartier.
    if (role === 'delivery_driver' && !isDriver) {
      view.customer.phone = '';
      view.customer.address = '';
      view.customer.deliveryNotes = undefined;
      view.customer.coordinates = undefined;
      view.customer.name = view.customer.name.split(' ')[0];
    }
  }

  if (order.status === 'in_delivery' && order.deliveryDriverId && (isOwner || isDriver || role === 'admin')) {
    const loc = driverLocations.get(order.deliveryDriverId);
    if (loc && Date.now() - loc.at < 10 * 60_000) view.driverLocation = loc;
  }
  view.unreadHint = unreadCount(order, user.id);
  return view;
}

function restock(order: Order) {
  for (const item of order.items) {
    const product = db.products.find((p) => p.id === item.productId);
    if (product) {
      product.stockCount += item.quantity;
      product.inStock = product.stockCount > 0;
    }
  }
}

function cancelOrder(order: Order, reason: string, by: string) {
  restock(order);
  for (const p of order.payments) {
    if (p.method === 'cash') {
      if (p.status !== 'confirmed') p.status = 'rejected';
    } else if (p.status === 'confirmed') {
      p.status = 'refund_due';
    } else if (p.status === 'submitted') {
      p.status = 'refund_due';
      p.note = 'Référence envoyée mais non vérifiée avant annulation : à contrôler avant remboursement.';
    } else if (p.status === 'pending') {
      p.status = 'rejected';
    }
  }
  order.cancelledAt = Date.now();
  order.cancelReason = reason;
  setStatus(order, 'cancelled', by);
  save();
}

// Une commande jamais payée libère son stock au bout du délai fixé par l'admin.
export function sweepUnpaidOrders() {
  const limit = Date.now() - db.config.paymentTimeoutMinutes * 60_000;
  for (const order of db.orders) {
    if (order.status !== 'awaiting_payment' || order.createdAt > limit) continue;
    if (order.payments.some((p) => p.status === 'submitted')) continue;
    cancelOrder(order, 'Paiement non reçu dans le délai imparti.', 'système');
  }
}

function confirmPayment(order: Order, payment: PaymentRecord, by: string, ref?: string) {
  payment.status = 'confirmed';
  payment.confirmedAt = Date.now();
  payment.confirmedByName = by;
  if (ref && !payment.transactionRef) payment.transactionRef = ref;
  if (order.status === 'awaiting_payment' && payment.purpose !== 'cod_balance') setStatus(order, 'confirmed', by);
  save();
}

export function applyWebhookPayment(input: { orderNumber: string; transactionRef: string; amount: number; currency: string }) {
  const order = db.orders.find((o) => o.orderNumber === input.orderNumber);
  if (!order) return { status: 404, error: 'Commande inconnue.' };
  const payment = order.payments.find((p) => p.method !== 'cash' && (p.status === 'pending' || p.status === 'submitted'));
  if (!payment) return { status: 409, error: 'Aucun paiement en attente pour cette commande.' };
  const expected = input.currency === 'CDF' ? payment.amountCdf : payment.amountUsd;
  if (!(input.currency === 'CDF' || input.currency === 'USD') || Math.abs(expected - input.amount) > 0.009) {
    return { status: 422, error: 'Montant ou devise inattendu.' };
  }
  if (order.status === 'cancelled') return { status: 409, error: 'Commande annulée.' };
  confirmPayment(order, payment, 'passerelle de paiement', input.transactionRef);
  audit('passerelle', 'paiement.webhook', `${order.orderNumber} ${input.amount} ${input.currency} réf ${input.transactionRef}`);
  return { status: 200 };
}

export const ordersRouter = Router();

ordersRouter.get('/delivery-options', (_req, res) => {
  res.json({ options: deliveryOptions(db.config).map(({ windowStart, windowEnd, ...o }) => o), serverTime: Date.now() });
});

ordersRouter.get('/orders', requireAuth, (req: AuthedRequest, res) => {
  const user = req.user!;
  const role = req.role!;
  const mine = db.orders.filter((o) => o.userId === user.id).slice(0, 60);
  let work: Order[] = [];
  if (role === 'admin') work = db.orders.slice(0, 1000);
  else if (role === 'cashier') work = db.orders.slice(0, 400);
  else if (role === 'order_agent') {
    work = db.orders.filter(
      (o) => (o.status === 'confirmed' && !o.preparerId) || (o.preparerId === user.id && (isActive(o) || Date.now() - o.createdAt < 86_400_000))
    );
  } else if (role === 'delivery_driver') {
    work = db.orders.filter(
      (o) =>
        o.deliveryMode === 'delivery' &&
        ((!o.deliveryDriverId && ['confirmed', 'preparing', 'ready'].includes(o.status)) || o.deliveryDriverId === user.id)
    ).slice(0, 200);
  }
  res.json({
    mine: mine.map((o) => viewOrder(o, user, role)),
    work: work.map((o) => viewOrder(o, user, role)),
    serverTime: Date.now(),
  });
});

ordersRouter.post('/orders', orderLimiter, requireAuth, botCheck, (req: AuthedRequest, res) => {
  const user = req.user!;
  const body = req.body || {};
  const config = db.config;

  if (db.orders.filter((o) => o.userId === user.id && o.status === 'awaiting_payment').length >= 3) {
    return res.status(429).json({ error: 'Vous avez déjà 3 commandes en attente de paiement. Réglez-les ou annulez-les d’abord.' });
  }

  const name = str(body.customer?.name, 80);
  const phone = normalizePhone(body.customer?.phone);
  const address = str(body.customer?.address, 200);
  const quartier = str(body.customer?.quartierGoma, 60);
  const deliveryMode = body.deliveryMode === 'drive' ? 'drive' : 'delivery';
  if (name.length < 2) return res.status(400).json({ error: 'Indiquez le nom du destinataire.' });
  if (!phone) return res.status(400).json({ error: 'Numéro de téléphone invalide (format +243 suivi de 9 chiffres).' });
  if (deliveryMode === 'delivery') {
    if (!GOMA_QUARTIERS.includes(quartier)) return res.status(400).json({ error: 'Choisissez un quartier de Goma.' });
    if (address.length < 5) return res.status(400).json({ error: 'Indiquez l’avenue, le numéro et un repère.' });
  }
  let coordinates: { lat: number; lng: number } | undefined;
  const c = body.customer?.coordinates;
  if (c && Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lng))) {
    if (!inGoma(Number(c.lat), Number(c.lng))) {
      return res.status(400).json({ error: 'La position indiquée est en dehors de la zone de livraison de Goma.' });
    }
    coordinates = { lat: Number(c.lat), lng: Number(c.lng) };
  }

  const option = deliveryOptions(config).find((o) => o.key === body.optionKey);
  if (!option) {
    return res.status(409).json({ error: 'Ce créneau n’est plus disponible. Choisissez une autre heure de livraison.', code: 'slot_unavailable' });
  }

  const method = body.paymentMethod as PaymentMethod;
  const gateway = config.paymentGateways[METHOD_TO_GATEWAY[method]];
  if (!gateway || !gateway.enabled) return res.status(400).json({ error: 'Opérateur Mobile Money indisponible.' });
  const paymentMode = body.paymentMode === 'cod' ? 'cod' : 'prepaid';
  if (paymentMode === 'cod' && !config.codEnabled) return res.status(400).json({ error: 'Le paiement à la livraison est désactivé.' });

  // Les prix viennent toujours du catalogue du serveur, jamais du navigateur.
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 80) {
    return res.status(400).json({ error: 'Panier vide ou invalide.' });
  }
  const wanted = new Map<string, number>();
  for (const it of body.items) {
    const qty = Number(it?.quantity);
    if (typeof it?.productId !== 'string' || !Number.isInteger(qty) || qty < 1 || qty > 99) {
      return res.status(400).json({ error: 'Panier invalide.' });
    }
    wanted.set(it.productId, (wanted.get(it.productId) || 0) + qty);
  }
  const items: OrderItem[] = [];
  for (const [productId, quantity] of wanted) {
    const product = db.products.find((p) => p.id === productId);
    if (!product) return res.status(409).json({ error: 'Un article de votre panier n’existe plus.', code: 'stock', productId });
    if (product.stockCount < quantity) {
      return res.status(409).json({
        error: product.stockCount > 0 ? `Il ne reste que ${product.stockCount} × « ${product.name} ».` : `« ${product.name} » est en rupture de stock.`,
        code: 'stock',
        productId,
      });
    }
    items.push({
      productId,
      name: product.name,
      brand: product.brand,
      unit: product.unit,
      image: product.image,
      unitPriceUsd: round2(product.priceUsd * (1 - (product.discountPercent || 0) / 100)),
      quantity,
    });
  }

  const subtotalUsd = round2(items.reduce((s, it) => s + it.unitPriceUsd * it.quantity, 0));
  const deliveryFeeUsd = deliveryMode === 'drive' || subtotalUsd >= config.freeDeliveryThresholdUsd ? 0 : option.priceUsd;
  const totalUsd = round2(subtotalUsd + deliveryFeeUsd);
  const rate = config.exchangeRateUsdToCdf;
  const toCdf = (usd: number) => Math.round(usd * rate);
  const payment = (purpose: PaymentRecord['purpose'], m: PaymentRecord['method'], usd: number): PaymentRecord => ({
    id: newId('pay'),
    purpose,
    method: m,
    amountUsd: usd,
    amountCdf: toCdf(usd),
    status: 'pending',
  });

  let payments: PaymentRecord[];
  if (paymentMode === 'prepaid') {
    payments = [payment('order_total', method, totalUsd)];
  } else {
    // Paiement à la livraison : le client règle d'abord une garantie (les frais de livraison),
    // le solde est encaissé en espèces à la remise.
    const deposit = round2(Math.min(totalUsd, Math.max(deliveryMode === 'delivery' ? option.priceUsd : 0, 1)));
    payments = [payment('delivery_deposit', method, deposit)];
    const balance = round2(totalUsd - deposit);
    if (balance > 0) payments.push(payment('cod_balance', 'cash', balance));
  }

  for (const it of items) {
    const product = db.products.find((p) => p.id === it.productId)!;
    product.stockCount -= it.quantity;
    product.inStock = product.stockCount > 0;
  }

  const now = Date.now();
  db.orderSeq += 1;
  const order: Order = {
    id: newId('ord'),
    orderNumber: `GM-${db.orderSeq}`,
    createdAt: now,
    userId: user.id,
    customer: {
      name,
      email: user.email,
      phone,
      address,
      quartierGoma: quartier,
      city: 'Goma',
      deliveryNotes: str(body.customer?.deliveryNotes, 300) || undefined,
      coordinates,
    },
    items,
    subtotalUsd,
    deliveryFeeUsd,
    totalUsd,
    exchangeRate: rate,
    totalCdf: toCdf(totalUsd),
    paymentMode,
    payments,
    status: 'awaiting_payment',
    deliveryMode,
    deliverySlotId: option.slotId,
    deliveryDate: option.date,
    deliverySlotName: `${option.dayLabel} • ${option.label} (${option.startTime} – ${option.endTime})`,
    deliveryWindowStart: option.windowStart,
    deliveryWindowEnd: option.windowEnd,
    loyaltyPointsEarned: Math.floor(totalUsd),
    confirmationCode: String(crypto.randomInt(0, 1_000_000)).padStart(6, '0'),
    history: [{ at: now, status: 'awaiting_payment', by: user.name }],
  };
  db.orders.unshift(order);
  if (!user.phone) user.phone = phone;
  if (!user.address && address) {
    user.address = address;
    user.commune = quartier;
  }
  save();
  res.status(201).json({ order: viewOrder(order, user, req.role!) });
});

// Charge la commande et vérifie que l'appelant y participe.
function loadOrder(req: AuthedRequest, res: Response, allow: (o: Order, role: Role) => boolean): Order | null {
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Commande introuvable.' });
    return null;
  }
  if (!allow(order, req.role!)) {
    res.status(403).json({ error: 'Vous n’avez pas accès à cette commande.' });
    return null;
  }
  return order;
}

const reply = (req: AuthedRequest, res: Response, order: Order) => res.json({ order: viewOrder(order, req.user!, req.role!) });

// ---------------------------------------------------------------- paiements

ordersRouter.post('/orders/:id/payments/:pid/submit', writeLimiter, requireAuth, (req: AuthedRequest, res) => {
  const order = loadOrder(req, res, (o) => o.userId === req.user!.id);
  if (!order) return;
  const payment = order.payments.find((p) => p.id === req.params.pid);
  if (!payment || payment.method === 'cash') return res.status(404).json({ error: 'Paiement introuvable.' });
  if (order.status === 'cancelled') return res.status(409).json({ error: 'Cette commande est annulée.' });
  if (payment.status !== 'pending' && payment.status !== 'rejected') {
    return res.status(409).json({ error: 'Ce paiement a déjà été transmis.' });
  }
  const ref = str(req.body?.transactionRef, 40).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9.\-]{5,39}$/.test(ref)) {
    return res.status(400).json({ error: 'Référence de transaction invalide. Recopiez l’ID reçu par SMS de votre opérateur.' });
  }
  const payerPhone = normalizePhone(req.body?.payerPhone);
  if (!payerPhone) return res.status(400).json({ error: 'Numéro payeur invalide.' });
  const reused = db.orders.some((o) => o.payments.some((p) => p !== payment && p.transactionRef === ref));
  if (reused) return res.status(409).json({ error: 'Cette référence de transaction a déjà été utilisée.' });
  payment.transactionRef = ref;
  payment.payerPhone = payerPhone;
  payment.status = 'submitted';
  payment.submittedAt = Date.now();
  payment.note = undefined;
  save();
  reply(req, res, order);
});

const cashierOnly = requireRole('cashier', 'admin');

ordersRouter.post('/orders/:id/payments/:pid/confirm', writeLimiter, cashierOnly, (req: AuthedRequest, res) => {
  const order = loadOrder(req, res, () => true);
  if (!order) return;
  const payment = order.payments.find((p) => p.id === req.params.pid);
  if (!payment) return res.status(404).json({ error: 'Paiement introuvable.' });
  if (order.status === 'cancelled') return res.status(409).json({ error: 'Commande annulée.' });
  if (payment.status !== 'submitted' && payment.status !== 'pending') {
    return res.status(409).json({ error: 'Ce paiement n’est pas en attente de validation.' });
  }
  if (payment.method === 'cash' && order.deliveryMode === 'delivery' && !payment.collectedByDriverAt) {
    return res.status(409).json({ error: 'Le livreur n’a pas encore encaissé ces espèces.' });
  }
  confirmPayment(order, payment, req.user!.name, str(req.body?.transactionRef, 40).toUpperCase() || undefined);
  audit(req.user!.email, 'paiement.valider', `${order.orderNumber} ${payment.purpose} ${payment.amountUsd} USD réf ${payment.transactionRef || '—'}`);
  reply(req, res, order);
});

ordersRouter.post('/orders/:id/payments/:pid/reject', writeLimiter, cashierOnly, (req: AuthedRequest, res) => {
  const order = loadOrder(req, res, () => true);
  if (!order) return;
  const payment = order.payments.find((p) => p.id === req.params.pid);
  if (!payment || payment.status !== 'submitted') return res.status(409).json({ error: 'Ce paiement n’est pas à vérifier.' });
  payment.status = 'rejected';
  payment.note = str(req.body?.note, 200) || 'Transaction introuvable chez l’opérateur.';
  save();
  audit(req.user!.email, 'paiement.rejeter', `${order.orderNumber} réf ${payment.transactionRef} : ${payment.note}`);
  reply(req, res, order);
});

ordersRouter.post('/orders/:id/payments/:pid/refund', writeLimiter, cashierOnly, (req: AuthedRequest, res) => {
  const order = loadOrder(req, res, () => true);
  if (!order) return;
  const payment = order.payments.find((p) => p.id === req.params.pid);
  if (!payment || payment.status !== 'refund_due') return res.status(409).json({ error: 'Aucun remboursement dû sur ce paiement.' });
  payment.status = 'refunded';
  payment.note = str(req.body?.note, 200) || payment.note;
  save();
  audit(req.user!.email, 'paiement.rembourser', `${order.orderNumber} ${payment.amountUsd} USD`);
  reply(req, res, order);
});

// ---------------------------------------------------------------- annulation

ordersRouter.post('/orders/:id/cancel', writeLimiter, requireAuth, (req: AuthedRequest, res) => {
  const role = req.role!;
  const order = loadOrder(req, res, (o) => o.userId === req.user!.id || role === 'admin' || role === 'cashier');
  if (!order) return;
  const isStaff = role === 'admin' || role === 'cashier';
  if (order.status === 'delivered' || order.status === 'cancelled') {
    return res.status(409).json({ error: 'Cette commande ne peut plus être annulée.' });
  }
  if (!isStaff && !['awaiting_payment', 'confirmed'].includes(order.status)) {
    return res.status(409).json({ error: 'La préparation a commencé : contactez le magasin pour annuler.' });
  }
  cancelOrder(order, str(req.body?.reason, 200) || (isStaff ? 'Annulée par le magasin' : 'Annulée par le client'), req.user!.name);
  if (isStaff) audit(req.user!.email, 'commande.annuler', `${order.orderNumber} : ${order.cancelReason}`);
  reply(req, res, order);
});

// ---------------------------------------------------------------- préparation (agents)

ordersRouter.post('/orders/:id/claim-prep', writeLimiter, requireRole('order_agent', 'admin'), (req: AuthedRequest, res) => {
  const order = loadOrder(req, res, () => true);
  if (!order) return;
  // Premier arrivé, premier servi : la vérification et l'attribution se font dans le même tour
  // d'exécution, deux agents ne peuvent donc pas obtenir la même commande.
  if (order.status !== 'confirmed' || order.preparerId) {
    return res.status(409).json({ error: 'Cette commande vient d’être prise par un autre agent.', code: 'already_claimed' });
  }
  order.preparerId = req.user!.id;
  order.preparerName = req.user!.name;
  setStatus(order, 'preparing', req.user!.name);
  save();
  reply(req, res, order);
});

ordersRouter.post('/orders/:id/ready', writeLimiter, requireRole('order_agent', 'admin'), (req: AuthedRequest, res) => {
  const order = loadOrder(req, res, (o, role) => role === 'admin' || o.preparerId === req.user!.id);
  if (!order) return;
  if (order.status !== 'preparing') return res.status(409).json({ error: 'Cette commande n’est pas en préparation.' });
  setStatus(order, 'ready', req.user!.name);
  save();
  reply(req, res, order);
});

// ---------------------------------------------------------------- livraison (livreurs)

const driverOnly = requireRole('delivery_driver');

ordersRouter.post('/orders/:id/claim-delivery', writeLimiter, driverOnly, (req: AuthedRequest, res) => {
  const order = loadOrder(req, res, () => true);
  if (!order) return;
  const user = req.user!;
  if (order.deliveryMode !== 'delivery' || !['confirmed', 'preparing', 'ready'].includes(order.status) || order.deliveryDriverId) {
    return res.status(409).json({ error: 'Cette course vient d’être prise par un autre livreur.', code: 'already_claimed' });
  }
  const mine = db.orders.filter((o) => o.deliveryDriverId === user.id && isActive(o)).length;
  if (mine >= db.config.maxActiveDeliveriesPerDriver) {
    return res.status(409).json({ error: `Vous avez déjà ${mine} courses en cours. Terminez-en une avant d’en prendre une autre.` });
  }
  const phone = user.phone || findStaff(user.email)?.phone;
  if (!phone) return res.status(409).json({ error: 'Ajoutez votre numéro de téléphone à votre profil avant de prendre une course.' });
  order.deliveryDriverId = user.id;
  order.deliveryDriverName = user.name;
  order.deliveryDriverPhone = phone;
  order.claimedByDriverAt = Date.now();
  order.history.push({ at: Date.now(), status: order.status, by: `${user.name} (prise en charge livraison)` });
  pushToUsers([order.userId], { title: `Commande ${order.orderNumber}`, body: `${user.name} est votre livreur.`, tag: `order-${order.id}`, orderId: order.id });
  save();
  reply(req, res, order);
});

ordersRouter.post('/orders/:id/release-delivery', writeLimiter, driverOnly, (req: AuthedRequest, res) => {
  const order = loadOrder(req, res, (o) => o.deliveryDriverId === req.user!.id);
  if (!order) return;
  if (order.status === 'in_delivery' || !isActive(order)) {
    return res.status(409).json({ error: 'Course déjà en route : contactez le magasin pour la réattribuer.' });
  }
  order.deliveryDriverId = undefined;
  order.deliveryDriverName = undefined;
  order.deliveryDriverPhone = undefined;
  order.claimedByDriverAt = undefined;
  order.history.push({ at: Date.now(), status: order.status, by: `${req.user!.name} (course libérée)` });
  save();
  reply(req, res, order);
});

ordersRouter.post('/orders/:id/depart', writeLimiter, driverOnly, (req: AuthedRequest, res) => {
  const order = loadOrder(req, res, (o) => o.deliveryDriverId === req.user!.id);
  if (!order) return;
  if (order.status !== 'ready') return res.status(409).json({ error: 'Le colis n’est pas encore prêt en magasin.' });
  order.departedAt = Date.now();
  setStatus(order, 'in_delivery', req.user!.name);
  save();
  reply(req, res, order);
});

ordersRouter.post('/orders/:id/handover', writeLimiter, requireAuth, (req: AuthedRequest, res) => {
  const role = req.role!;
  const user = req.user!;
  const order = loadOrder(req, res, (o) =>
    o.deliveryMode === 'delivery' ? o.deliveryDriverId === user.id : ['order_agent', 'cashier', 'admin'].includes(role)
  );
  if (!order) return;
  const expected = order.deliveryMode === 'delivery' ? 'in_delivery' : 'ready';
  if (order.status !== expected) return res.status(409).json({ error: 'Cette commande n’est pas en cours de remise.' });

  const lockKey = `handover:${order.id}`;
  if (isLocked(lockKey)) return res.status(429).json({ error: 'Trop de codes erronés. Réessayez dans 10 minutes.' });
  const code = String(req.body?.code || '').replace(/\D/g, '');
  if (!order.confirmationCode || !safeEqual(code, order.confirmationCode)) {
    recordFailure(lockKey);
    return res.status(400).json({ error: 'Code de remise incorrect. Demandez au client le code affiché sur sa commande.' });
  }
  const cash = order.payments.find((p) => p.method === 'cash' && p.status === 'pending');
  if (cash) {
    if (req.body?.cashCollected !== true) {
      return res.status(400).json({ error: 'Confirmez l’encaissement du solde en espèces avant de valider la remise.' });
    }
    cash.collectedByDriverAt = Date.now();
    // Au retrait en magasin, c'est la caisse qui encaisse directement.
    if (order.deliveryMode === 'drive') {
      cash.status = 'confirmed';
      cash.confirmedAt = Date.now();
      cash.confirmedByName = user.name;
    }
  }
  clearFailures(lockKey);
  order.deliveredAt = Date.now();
  setStatus(order, 'delivered', user.name);
  const customer = db.users.find((u) => u.id === order.userId);
  if (customer) customer.loyaltyPoints += order.loyaltyPointsEarned;
  save();
  reply(req, res, order);
});

ordersRouter.post('/driver/location', requireRole('delivery_driver'), (req: AuthedRequest, res) => {
  const lat = Number(req.body?.lat);
  const lng = Number(req.body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ error: 'Position invalide.' });
  }
  const accuracy = Number(req.body?.accuracy);
  driverLocations.set(req.user!.id, { lat, lng, at: Date.now(), accuracy: Number.isFinite(accuracy) ? accuracy : undefined });
  res.json({ ok: true });
});

// ---------------------------------------------------------------- réattribution par l'admin

ordersRouter.post('/orders/:id/assign', writeLimiter, requireRole('admin'), (req: AuthedRequest, res) => {
  const order = loadOrder(req, res, () => true);
  if (!order) return;
  if (!isActive(order)) return res.status(409).json({ error: 'Commande terminée.' });
  const target = db.users.find((u) => u.email === str(req.body?.email, 254).toLowerCase());
  const kind = req.body?.kind === 'preparer' ? 'preparer' : 'driver';
  if (!req.body?.email) {
    if (kind === 'driver') {
      order.deliveryDriverId = order.deliveryDriverName = order.deliveryDriverPhone = undefined;
      if (order.status === 'in_delivery') setStatus(order, 'ready', req.user!.name);
    } else if (order.status === 'preparing') {
      order.preparerId = order.preparerName = undefined;
      setStatus(order, 'confirmed', req.user!.name);
    }
  } else {
    if (!target || roleOf(target) !== (kind === 'driver' ? 'delivery_driver' : 'order_agent')) {
      return res.status(400).json({ error: 'Cet employé n’a pas encore de compte actif avec ce rôle.' });
    }
    if (kind === 'driver') {
      order.deliveryDriverId = target.id;
      order.deliveryDriverName = target.name;
      order.deliveryDriverPhone = target.phone || findStaff(target.email)?.phone;
      order.claimedByDriverAt = Date.now();
    } else {
      order.preparerId = target.id;
      order.preparerName = target.name;
      if (order.status === 'confirmed') setStatus(order, 'preparing', req.user!.name);
    }
    pushToUsers([target.id], {
      title: kind === 'driver' ? 'Course attribuée' : 'Commande attribuée',
      body: `La commande ${order.orderNumber} vous a été confiée.`,
      tag: `order-${order.id}`,
      orderId: order.id,
    });
  }
  save();
  audit(req.user!.email, 'commande.attribuer', `${order.orderNumber} ${kind} → ${req.body?.email || 'personne'}`);
  reply(req, res, order);
});

// ---------------------------------------------------------------- messagerie client ↔ livreur

const canChat = (o: Order, user: DbUser, role: Role) =>
  o.userId === user.id || o.deliveryDriverId === user.id || o.preparerId === user.id || role === 'admin' || role === 'cashier';

ordersRouter.get('/orders/:id/messages', requireAuth, (req: AuthedRequest, res) => {
  const order = loadOrder(req, res, (o, role) => canChat(o, req.user!, role));
  if (!order) return;
  const messages = db.messages.filter((m) => m.orderId === order.id).slice(-300);
  // Ouvrir la conversation la marque comme lue. L'écriture n'a lieu que s'il y avait du nouveau :
  // le navigateur relit la conversation toutes les quelques secondes.
  if (unreadCount(order, req.user!.id) > 0) {
    order.chatReadAt = { ...order.chatReadAt, [req.user!.id]: Date.now() };
    save();
  }
  res.json({ messages });
});

ordersRouter.post('/orders/:id/messages', writeLimiter, requireAuth, (req: AuthedRequest, res) => {
  const order = loadOrder(req, res, (o, role) => canChat(o, req.user!, role));
  if (!order) return;
  const closedSince = order.deliveredAt || order.cancelledAt;
  if (closedSince && Date.now() - closedSince > 24 * 60 * 60_000) {
    return res.status(409).json({ error: 'Cette conversation est clôturée.' });
  }
  const text = str(req.body?.text, 1000);
  if (!text) return res.status(400).json({ error: 'Message vide.' });
  const message = {
    id: newId('msg'),
    orderId: order.id,
    senderId: req.user!.id,
    senderName: req.user!.name,
    senderRole: order.userId === req.user!.id ? ('customer' as Role) : req.role!,
    text,
    at: Date.now(),
  };
  db.messages.push(message);
  // Les autres participants sont prévenus sur leur téléphone, même application fermée.
  pushToUsers(
    [order.userId, order.deliveryDriverId, order.preparerId].filter((id) => id !== req.user!.id),
    { title: `${message.senderName} • commande ${order.orderNumber}`, body: text, tag: `chat-${order.id}`, orderId: order.id }
  );
  if (db.messages.length > 20000) db.messages.splice(0, db.messages.length - 20000);
  save();
  res.status(201).json({ message });
});
