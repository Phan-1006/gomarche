import crypto from 'crypto';
import { Router } from 'express';
import type { Category, GatewayKey, Product, SiteConfig, StaffMember } from '../src/types';
import { STAFF_ROLES } from '../src/types';
import { GOMA_BOUNDS } from '../src/data/mockData';
import { audit, db, findStaff, isAdminEmail, newId, publicUser, save, store } from './db';
import { FIRESTORE_UPLOAD_LIMIT } from './store';
import { isHHMM, toMinutes } from './schedule';
import {
  AuthedRequest,
  endAllSessions,
  hashPassword,
  isEmail,
  normalizePhone,
  num,
  requireRole,
  safeImageUrl,
  str,
  TURNSTILE_SITE_KEY,
  validPassword,
  writeLimiter,
} from './security';
import { PUSH_PUBLIC_KEY } from './push';

export const publicConfig = (): SiteConfig => ({
  ...db.config,
  turnstileSiteKey: TURNSTILE_SITE_KEY || undefined,
  pushPublicKey: PUSH_PUBLIC_KEY,
  lensEnabled: !!process.env.GEMINI_API_KEY,
});

export const catalogRouter = Router();

// Tout ce dont la boutique a besoin en une requête. Le navigateur la rejoue régulièrement :
// grâce à l'ETag, elle ne retransmet rien tant que rien n'a changé.
catalogRouter.get('/bootstrap', (req: AuthedRequest, res) => {
  res.set('Cache-Control', 'no-cache');
  res.json({
    config: publicConfig(),
    categories: db.categories,
    products: db.products,
    user: req.user ? publicUser(req.user) : null,
  });
});

// ---------------------------------------------------------------- configuration (admin)

const admin = requireRole('admin');
const hex = (v: unknown, fallback: string) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback);

catalogRouter.put('/config', writeLimiter, admin, (req: AuthedRequest, res) => {
  const b = req.body || {};
  const cur = db.config;
  const next: SiteConfig = { ...cur };

  if (b.siteName !== undefined) next.siteName = str(b.siteName, 60) || cur.siteName;
  if (b.tagline !== undefined) next.tagline = str(b.tagline, 160);
  if (b.logoType !== undefined) next.logoType = b.logoType === 'custom_url' ? 'custom_url' : 'badge';
  if (b.customLogoUrl !== undefined) next.customLogoUrl = safeImageUrl(b.customLogoUrl);
  if (b.pwaIconUrl !== undefined) next.pwaIconUrl = safeImageUrl(b.pwaIconUrl);
  if (b.activeTheme !== undefined && ['classic_red', 'emerald_fresh', 'navy_modern', 'warm_gold'].includes(b.activeTheme)) next.activeTheme = b.activeTheme;
  if (b.primaryColor !== undefined) next.primaryColor = hex(b.primaryColor, cur.primaryColor);
  if (b.secondaryColor !== undefined) next.secondaryColor = hex(b.secondaryColor, cur.secondaryColor);
  if (b.backgroundColor !== undefined) next.backgroundColor = hex(b.backgroundColor, cur.backgroundColor);
  if (b.exchangeRateUsdToCdf !== undefined) next.exchangeRateUsdToCdf = Math.round(num(b.exchangeRateUsdToCdf, 100, 100000, cur.exchangeRateUsdToCdf));
  if (b.freeDeliveryThresholdUsd !== undefined) next.freeDeliveryThresholdUsd = num(b.freeDeliveryThresholdUsd, 0, 100000, cur.freeDeliveryThresholdUsd);
  if (b.storeAddress !== undefined) next.storeAddress = str(b.storeAddress, 200);
  if (b.storePhone !== undefined) next.storePhone = str(b.storePhone, 40);
  if (b.storeEmail !== undefined) next.storeEmail = str(b.storeEmail, 120);
  if (b.storeCity !== undefined) next.storeCity = str(b.storeCity, 60);
  if (b.storeOpeningHours !== undefined) next.storeOpeningHours = str(b.storeOpeningHours, 200);
  if (b.codEnabled !== undefined) next.codEnabled = !!b.codEnabled;
  if (b.paymentTimeoutMinutes !== undefined) next.paymentTimeoutMinutes = Math.round(num(b.paymentTimeoutMinutes, 10, 1440, cur.paymentTimeoutMinutes));
  if (b.maxActiveDeliveriesPerDriver !== undefined) next.maxActiveDeliveriesPerDriver = Math.round(num(b.maxActiveDeliveriesPerDriver, 1, 20, cur.maxActiveDeliveriesPerDriver));

  if (b.storeLocation !== undefined) {
    const lat = Number(b.storeLocation?.lat);
    const lng = Number(b.storeLocation?.lng);
    if (!(lat >= GOMA_BOUNDS.minLat && lat <= GOMA_BOUNDS.maxLat && lng >= GOMA_BOUNDS.minLng && lng <= GOMA_BOUNDS.maxLng)) {
      return res.status(400).json({ error: 'La position du magasin doit se trouver à Goma.' });
    }
    next.storeLocation = { lat, lng };
  }

  if (b.deliveryHours !== undefined) {
    const h = b.deliveryHours || {};
    if (!isHHMM(h.start) || !isHHMM(h.end) || toMinutes(h.end) <= toMinutes(h.start)) {
      return res.status(400).json({ error: 'Heures de service invalides : la dernière livraison doit être après la première.' });
    }
    next.deliveryHours = {
      start: h.start,
      end: h.end,
      prepMinutes: Math.round(num(h.prepMinutes, 0, 600, cur.deliveryHours.prepMinutes)),
      expressMinutes: Math.round(num(h.expressMinutes, 10, 240, cur.deliveryHours.expressMinutes)),
      daysAhead: Math.round(num(h.daysAhead, 0, 14, cur.deliveryHours.daysAhead)),
      closedWeekdays: Array.isArray(h.closedWeekdays) ? [...new Set<number>(h.closedWeekdays.map(Number))].filter((d) => d >= 0 && d <= 6) : [],
    };
    if (next.deliveryHours.closedWeekdays.length === 7) return res.status(400).json({ error: 'Au moins un jour de livraison doit rester ouvert.' });
  }

  if (b.deliverySlots !== undefined) {
    if (!Array.isArray(b.deliverySlots) || b.deliverySlots.length === 0 || b.deliverySlots.length > 24) {
      return res.status(400).json({ error: 'Il faut entre 1 et 24 créneaux de livraison.' });
    }
    const slots = [];
    for (const s of b.deliverySlots) {
      const label = str(s?.label, 60);
      const isExpress = !!s?.isExpress;
      if (!label) return res.status(400).json({ error: 'Chaque créneau doit avoir un nom.' });
      if (!isExpress && (!isHHMM(s.startTime) || !isHHMM(s.endTime) || toMinutes(s.endTime) <= toMinutes(s.startTime))) {
        return res.status(400).json({ error: `Créneau « ${label} » : l’heure de fin doit être après l’heure de début.` });
      }
      if (!isExpress && (toMinutes(s.startTime) < toMinutes(next.deliveryHours.start) || toMinutes(s.endTime) > toMinutes(next.deliveryHours.end))) {
        return res.status(400).json({
          error: `Créneau « ${label} » : il doit rester dans les heures de service (${next.deliveryHours.start} – ${next.deliveryHours.end}).`,
        });
      }
      slots.push({
        id: typeof s.id === 'string' && /^[\w-]{1,40}$/.test(s.id) ? s.id : newId('slot'),
        label,
        startTime: isExpress ? next.deliveryHours.start : s.startTime,
        endTime: isExpress ? next.deliveryHours.end : s.endTime,
        priceUsd: num(s.priceUsd, 0, 1000, 0),
        isExpress,
        active: s.active !== false,
      });
    }
    if (new Set(slots.map((s) => s.id)).size !== slots.length) return res.status(400).json({ error: 'Identifiants de créneaux en double.' });
    next.deliverySlots = slots;
  } else if (b.deliveryHours !== undefined) {
    const out = next.deliverySlots.find(
      (s) => !s.isExpress && (toMinutes(s.startTime) < toMinutes(next.deliveryHours.start) || toMinutes(s.endTime) > toMinutes(next.deliveryHours.end))
    );
    if (out) return res.status(400).json({ error: `Le créneau « ${out.label} » sort des nouvelles heures de service : ajustez-le d’abord.` });
  }

  if (b.heroBanners !== undefined) {
    if (!Array.isArray(b.heroBanners) || b.heroBanners.length > 10) return res.status(400).json({ error: 'Bannières invalides.' });
    next.heroBanners = b.heroBanners.map((h: any) => ({
      id: typeof h?.id === 'string' && /^[\w-]{1,40}$/.test(h.id) ? h.id : newId('banner'),
      image: safeImageUrl(h?.image),
      tag: str(h?.tag, 80),
      title: str(h?.title, 120),
      subtitle: str(h?.subtitle, 240),
      ctaText: str(h?.ctaText, 40),
      categoryId: str(h?.categoryId, 60) || undefined,
      badgeBg: hex(h?.badgeBg, '#E2001A'),
    }));
  }

  if (b.paymentGateways !== undefined) {
    const gateways = { ...cur.paymentGateways };
    for (const key of Object.keys(gateways) as GatewayKey[]) {
      const g = b.paymentGateways?.[key];
      if (!g) continue;
      const merchantNumber = g.merchantNumber ? normalizePhone(g.merchantNumber) || str(g.merchantNumber, 20).replace(/[^\d+*#]/g, '') : '';
      gateways[key] = {
        enabled: !!g.enabled,
        displayName: str(g.displayName, 60) || undefined,
        merchantNumber,
        merchantName: str(g.merchantName, 60),
        phonePrefix: str(g.phonePrefix, 60),
        customLogoUrl: safeImageUrl(g.customLogoUrl) || undefined,
        instructions: str(g.instructions, 400) || undefined,
      };
    }
    if (!Object.values(gateways).some((g) => g.enabled)) return res.status(400).json({ error: 'Au moins un opérateur doit rester actif.' });
    next.paymentGateways = gateways;
  }

  if (b.networkIcons !== undefined) {
    next.networkIcons = {
      airtel: !!b.networkIcons?.airtel,
      orange: !!b.networkIcons?.orange,
      mpesa: !!b.networkIcons?.mpesa,
      afrimoney: !!b.networkIcons?.afrimoney,
    };
  }

  next.updatedAt = Date.now();
  db.config = next;
  save();
  audit(req.user!.email, 'config.modifier', Object.keys(b).join(', ').slice(0, 200));
  res.json({ config: publicConfig() });
});

// ---------------------------------------------------------------- catégories (admin)

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'rayon';

function readCategory(b: any, existing?: Category): Category | string {
  const name = str(b?.name, 60);
  if (name.length < 2) return 'Nom de rayon requis.';
  const image = safeImageUrl(b?.image) || existing?.image || '';
  if (!image) return 'Image du rayon requise (lien https ou fichier envoyé).';
  return {
    id: existing?.id || newId('cat'),
    name,
    slug: slugify(name),
    description: str(b?.description, 300),
    image,
    iconName: str(b?.iconName, 30) || existing?.iconName || 'Layers',
    isPromoCategory: !!b?.isPromoCategory,
    displayOrder: Math.round(num(b?.displayOrder, 0, 999, existing?.displayOrder ?? db.categories.length + 1)),
  };
}

catalogRouter.post('/categories', writeLimiter, admin, (req: AuthedRequest, res) => {
  const cat = readCategory(req.body);
  if (typeof cat === 'string') return res.status(400).json({ error: cat });
  db.categories.push(cat);
  save();
  audit(req.user!.email, 'rayon.creer', cat.name);
  res.status(201).json({ category: cat });
});

catalogRouter.put('/categories/:id', writeLimiter, admin, (req: AuthedRequest, res) => {
  const idx = db.categories.findIndex((c) => c.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Rayon introuvable.' });
  const cat = readCategory(req.body, db.categories[idx]);
  if (typeof cat === 'string') return res.status(400).json({ error: cat });
  db.categories[idx] = cat;
  save();
  res.json({ category: cat });
});

catalogRouter.delete('/categories/:id', writeLimiter, admin, (req: AuthedRequest, res) => {
  const cat = db.categories.find((c) => c.id === req.params.id);
  if (!cat) return res.status(404).json({ error: 'Rayon introuvable.' });
  const count = db.products.filter((p) => p.categoryId === cat.id).length;
  if (count > 0) return res.status(409).json({ error: `Ce rayon contient encore ${count} article(s). Déplacez-les ou supprimez-les d’abord.` });
  db.categories = db.categories.filter((c) => c.id !== cat.id);
  save();
  audit(req.user!.email, 'rayon.supprimer', cat.name);
  res.json({ ok: true });
});

// ---------------------------------------------------------------- produits (admin + agents de rayon)

const catalogStaff = requireRole('admin', 'category_agent');

// Un agent de rayon ne touche qu'aux rayons que l'admin lui a confiés (aucun = tous).
function mayEditCategory(req: AuthedRequest, categoryId: string): boolean {
  if (req.role === 'admin') return true;
  const assigned = findStaff(req.user!.email)?.assignedCategoryIds;
  return !assigned || assigned.length === 0 || assigned.includes(categoryId);
}

function readProduct(b: any, existing?: Product): Product | string {
  const name = str(b?.name, 120);
  if (name.length < 2) return 'Nom du produit requis.';
  const categoryId = str(b?.categoryId, 60);
  if (!db.categories.some((c) => c.id === categoryId)) return 'Rayon inconnu.';
  const priceUsd = Number(b?.priceUsd);
  if (!Number.isFinite(priceUsd) || priceUsd <= 0 || priceUsd > 100000) return 'Prix invalide.';
  const image = safeImageUrl(b?.image) || existing?.image || '';
  if (!image) return 'Photo du produit requise (lien https, photo proposée ou fichier envoyé).';
  const stockCount = Math.round(num(b?.stockCount, 0, 1_000_000, existing?.stockCount ?? 0));
  const discountPercent = Math.round(num(b?.discountPercent, 0, 90, 0));
  return {
    id: existing?.id || newId('prod'),
    name,
    categoryId,
    brand: str(b?.brand, 60) || 'Gomarché Sélection',
    description: str(b?.description, 1000),
    priceUsd: Math.round(priceUsd * 100) / 100,
    discountPercent: discountPercent || undefined,
    unit: str(b?.unit, 40) || 'pièce',
    rating: existing?.rating ?? 0,
    reviewCount: existing?.reviewCount ?? 0,
    image,
    inStock: stockCount > 0,
    stockCount,
    isPromo: !!b?.isPromo || discountPercent > 0,
    isFoodEssential: !!b?.isFoodEssential,
    isPopular: !!b?.isPopular,
    isNewArrival: existing ? !!b?.isNewArrival : true,
    barcode: str(b?.barcode, 40) || undefined,
    origin: str(b?.origin, 60) || undefined,
  };
}

catalogRouter.post('/products', writeLimiter, catalogStaff, (req: AuthedRequest, res) => {
  const product = readProduct(req.body);
  if (typeof product === 'string') return res.status(400).json({ error: product });
  if (!mayEditCategory(req, product.categoryId)) return res.status(403).json({ error: 'Ce rayon ne vous est pas attribué.' });
  db.products.unshift(product);
  save();
  audit(req.user!.email, 'produit.creer', `${product.name} (${product.priceUsd} USD)`);
  res.status(201).json({ product });
});

catalogRouter.put('/products/:id', writeLimiter, catalogStaff, (req: AuthedRequest, res) => {
  const idx = db.products.findIndex((p) => p.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Produit introuvable.' });
  const before = db.products[idx];
  const product = readProduct(req.body, before);
  if (typeof product === 'string') return res.status(400).json({ error: product });
  if (!mayEditCategory(req, before.categoryId) || !mayEditCategory(req, product.categoryId)) {
    return res.status(403).json({ error: 'Ce rayon ne vous est pas attribué.' });
  }
  db.products[idx] = product;
  save();
  if (before.priceUsd !== product.priceUsd || before.discountPercent !== product.discountPercent) {
    audit(req.user!.email, 'produit.prix', `${product.name} : ${before.priceUsd} → ${product.priceUsd} USD, remise ${product.discountPercent || 0}%`);
  }
  res.json({ product });
});

catalogRouter.delete('/products/:id', writeLimiter, catalogStaff, (req: AuthedRequest, res) => {
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Produit introuvable.' });
  if (!mayEditCategory(req, product.categoryId)) return res.status(403).json({ error: 'Ce rayon ne vous est pas attribué.' });
  db.products = db.products.filter((p) => p.id !== product.id);
  save();
  audit(req.user!.email, 'produit.supprimer', product.name);
  res.json({ ok: true });
});

// ---------------------------------------------------------------- envoi d'images

// Le type est déterminé par les premiers octets du fichier, jamais par ce qu'annonce le client.
// Le SVG est refusé : il peut embarquer du script.
function sniffImage(buf: Buffer): string | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

catalogRouter.post('/upload', writeLimiter, catalogStaff, async (req: AuthedRequest, res) => {
  const match = /^data:image\/[a-z+]+;base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.imageBase64 || ''));
  if (!match) return res.status(400).json({ error: 'Image invalide.' });
  const buf = Buffer.from(match[1], 'base64');
  const ext = sniffImage(buf);
  if (!ext) return res.status(400).json({ error: 'Format non pris en charge : utilisez JPG, PNG ou WebP.' });
  const limit = store.kind === 'firestore' ? FIRESTORE_UPLOAD_LIMIT : 5 * 1024 * 1024;
  if (buf.length > limit) {
    return res.status(413).json({ error: `Image trop lourde (${Math.round(limit / 1024)} Ko maximum). Réduisez-la ou utilisez un lien.` });
  }
  const filename = `${crypto.randomBytes(12).toString('hex')}.${ext}`;
  try {
    await store.saveUpload(filename, buf, ext === 'jpg' ? 'image/jpeg' : `image/${ext}`);
  } catch (e) {
    console.error('Envoi d’image :', e);
    return res.status(502).json({ error: 'Enregistrement de l’image impossible pour le moment. Réessayez.' });
  }
  res.status(201).json({ url: `/uploads/${filename}` });
});

// ---------------------------------------------------------------- personnel (admin)

function staffView(s: StaffMember): StaffMember {
  const user = db.users.find((u) => u.email === s.email);
  return { ...s, hasAccount: !!user?.emailVerified, lastLoginAt: user?.lastLoginAt };
}

function readStaff(b: any, existing?: StaffMember): StaffMember | string {
  const email = existing?.email || str(b?.email, 254).toLowerCase();
  if (!isEmail(email)) return 'Adresse e-mail invalide.';
  if (isAdminEmail(email)) return 'Cette adresse est déjà administrateur.';
  if (!STAFF_ROLES.includes(b?.role)) return 'Rôle invalide.';
  const name = str(b?.name, 80);
  if (name.length < 2) return 'Nom de l’employé requis.';
  let phone: string | undefined;
  if (b?.phone) {
    phone = normalizePhone(b.phone) || undefined;
    if (!phone) return 'Numéro de téléphone invalide (format +243 suivi de 9 chiffres).';
  }
  if (b.role === 'delivery_driver' && !phone) return 'Le numéro de téléphone est obligatoire pour un livreur (le client doit pouvoir l’appeler).';
  const assignedCategoryIds = Array.isArray(b?.assignedCategoryIds)
    ? b.assignedCategoryIds.filter((id: unknown) => db.categories.some((c) => c.id === id))
    : [];
  return {
    email,
    role: b.role,
    name,
    phone,
    assignedCategoryIds: b.role === 'category_agent' ? assignedCategoryIds : undefined,
    active: b?.active !== false,
    createdAt: existing?.createdAt || Date.now(),
  };
}

// Mot de passe facultatif posé par l'admin, pour un employé sans compte Google.
function applyStaffPassword(staff: StaffMember, password: unknown): string | null {
  if (password === undefined || password === '') return null;
  if (!validPassword(password)) return 'Le mot de passe provisoire doit comporter au moins 8 caractères.';
  let user = db.users.find((u) => u.email === staff.email);
  if (!user) {
    user = { id: newId('usr'), email: staff.email, name: staff.name, loyaltyPoints: 0, createdAt: Date.now(), emailVerified: true };
    db.users.push(user);
  }
  user.passwordHash = hashPassword(password);
  user.emailVerified = true;
  if (staff.phone && !user.phone) user.phone = staff.phone;
  endAllSessions(user.id);
  return null;
}

catalogRouter.get('/admin/staff', admin, (_req, res) => {
  res.json({ staff: db.staff.map(staffView) });
});

catalogRouter.post('/admin/staff', writeLimiter, admin, (req: AuthedRequest, res) => {
  const staff = readStaff(req.body);
  if (typeof staff === 'string') return res.status(400).json({ error: staff });
  if (findStaff(staff.email)) return res.status(409).json({ error: 'Cet e-mail est déjà dans la liste du personnel.' });
  const err = applyStaffPassword(staff, req.body?.password);
  if (err) return res.status(400).json({ error: err });
  db.staff.push(staff);
  save();
  audit(req.user!.email, 'personnel.ajouter', `${staff.email} → ${staff.role}`);
  res.status(201).json({ staff: db.staff.map(staffView) });
});

catalogRouter.put('/admin/staff/:email', writeLimiter, admin, (req: AuthedRequest, res) => {
  const idx = db.staff.findIndex((s) => s.email === String(req.params.email).toLowerCase());
  if (idx < 0) return res.status(404).json({ error: 'Employé introuvable.' });
  const staff = readStaff(req.body, db.staff[idx]);
  if (typeof staff === 'string') return res.status(400).json({ error: staff });
  const err = applyStaffPassword(staff, req.body?.password);
  if (err) return res.status(400).json({ error: err });
  db.staff[idx] = staff;
  save();
  audit(req.user!.email, 'personnel.modifier', `${staff.email} → ${staff.role}${staff.active ? '' : ' (suspendu)'}`);
  res.json({ staff: db.staff.map(staffView) });
});

catalogRouter.delete('/admin/staff/:email', writeLimiter, admin, (req: AuthedRequest, res) => {
  const email = String(req.params.email).toLowerCase();
  if (!findStaff(email)) return res.status(404).json({ error: 'Employé introuvable.' });
  db.staff = db.staff.filter((s) => s.email !== email);
  const user = db.users.find((u) => u.email === email);
  if (user) endAllSessions(user.id);
  save();
  audit(req.user!.email, 'personnel.retirer', email);
  res.json({ staff: db.staff.map(staffView) });
});

catalogRouter.get('/admin/audit', admin, (_req, res) => {
  res.json({ audit: db.audit.slice(0, 300), customers: db.users.length });
});
