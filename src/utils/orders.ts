import { LatLng, Order, OrderStatus, PaymentMethod, PaymentRecord, PaymentStatus } from '../types';

export const STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: 'En attente de paiement',
  confirmed: 'Confirmée • à préparer',
  preparing: 'En préparation au magasin',
  ready: 'Prête',
  in_delivery: 'En route vers vous',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

export const STATUS_STYLES: Record<OrderStatus, string> = {
  awaiting_payment: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-sky-100 text-sky-800',
  preparing: 'bg-indigo-100 text-indigo-800',
  ready: 'bg-violet-100 text-violet-800',
  in_delivery: 'bg-blue-100 text-blue-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

export const METHOD_LABELS: Record<PaymentMethod | 'cash', string> = {
  airtel_money: 'Airtel Money',
  orange_money: 'Orange Money',
  mpesa: 'M-Pesa',
  afrimoney: 'AfriMoney',
  cash: 'Espèces',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'En attente',
  submitted: 'À vérifier',
  confirmed: 'Validé',
  rejected: 'Refusé',
  refund_due: 'Remboursement dû',
  refunded: 'Remboursé',
};

export const PURPOSE_LABELS: Record<PaymentRecord['purpose'], string> = {
  order_total: 'Total de la commande',
  delivery_deposit: 'Garantie (frais de livraison)',
  cod_balance: 'Solde à la livraison',
};

export const isActiveOrder = (o: Order) => o.status !== 'delivered' && o.status !== 'cancelled';

// Paiement Mobile Money que le client doit encore effectuer ou corriger.
export const duePayment = (o: Order) =>
  o.status === 'cancelled' ? undefined : o.payments.find((p) => p.method !== 'cash' && (p.status === 'pending' || p.status === 'rejected'));

export const cashDue = (o: Order) => o.payments.find((p) => p.method === 'cash' && p.status === 'pending');

const GOMA_TZ = 'Africa/Lubumbashi';

export const formatDateTime = (ts: number) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: GOMA_TZ }).format(ts);

export const formatTime = (ts: number) =>
  new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: GOMA_TZ }).format(ts);

export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// Estimation grossière : distance à vol d'oiseau majorée pour les détours, moto à ~20 km/h en ville.
export const etaMinutes = (from: LatLng, to: LatLng) => Math.max(2, Math.round(((distanceKm(from, to) * 1.4) / 20) * 60));

export const directionsUrl = (to: LatLng) => `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}&travelmode=driving`;
