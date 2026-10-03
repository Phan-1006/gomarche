import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  AuditEntry,
  Category,
  ChatMessage,
  Order,
  Product,
  Role,
  SiteConfig,
  StaffMember,
} from '../src/types';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS, INITIAL_SITE_CONFIG } from '../src/data/mockData';
import { fileStore, firestoreStore, Snapshot, Store } from './store';

export interface DbUser {
  id: string;
  email: string; // toujours en minuscules
  name: string;
  avatar?: string;
  phone?: string;
  address?: string;
  commune?: string;
  loyaltyPoints: number;
  passwordHash?: string;
  // true si l'e-mail est prouvé (connexion Google, lien reçu par e-mail) ou si le mot de passe
  // a été posé par l'admin.
  // Un rôle employé/admin n'est jamais accordé à un e-mail non vérifié.
  emailVerified: boolean;
  createdAt: number;
  lastLoginAt?: number;
  disabled?: boolean;
  // Liens à usage unique envoyés par e-mail : seule l'empreinte du jeton est conservée.
  verifyTokenHash?: string;
  verifyTokenExpiresAt?: number;
  resetTokenHash?: string;
  resetTokenExpiresAt?: number;
}

// Appareil abonné aux notifications push d'un compte.
export interface DbPushSub {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: number;
}

export interface DbSession {
  tokenHash: string;
  userId: string;
  expiresAt: number;
}

interface DbShape {
  config: SiteConfig;
  categories: Category[];
  products: Product[];
  users: DbUser[];
  staff: StaffMember[];
  sessions: DbSession[];
  pushSubs: DbPushSub[];
  orders: Order[];
  messages: ChatMessage[];
  audit: AuditEntry[];
  orderSeq: number;
}

export const ROOT_DIR = path.resolve(import.meta.dirname, '..');
export const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT_DIR, 'data');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const readJson = (file: string): any => {
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    return raw.trim() ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const hhmm = (s: string): string | null => {
  const m = /(\d{1,2})\s*[h:]\s*(\d{2})/.exec(s);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null;
};

// Reprend une configuration de l'ancien format (fichiers JSON à plat) sans rien perdre du
// branding, et en écartant ce qui ne doit plus s'y trouver (mot de passe admin, clés d'API).
export function normalizeConfig(raw: any): SiteConfig {
  const base = INITIAL_SITE_CONFIG;
  const src = raw && typeof raw === 'object' ? raw : {};
  const cfg: SiteConfig = { ...base };
  for (const key of Object.keys(base) as (keyof SiteConfig)[]) {
    if (src[key] !== undefined && typeof src[key] === typeof base[key]) (cfg as any)[key] = src[key];
  }
  cfg.deliveryHours = { ...base.deliveryHours, ...(src.deliveryHours || {}) };
  cfg.storeLocation = { ...base.storeLocation, ...(src.storeLocation || {}) };
  cfg.networkIcons = { ...base.networkIcons, ...(src.networkIcons || {}) };

  if (Array.isArray(src.deliverySlots) && src.deliverySlots.length) {
    cfg.deliverySlots = src.deliverySlots.map((s: any) => {
      const fallback = base.deliverySlots.find((b) => b.id === s.id);
      const parts = typeof s.timeRange === 'string' ? s.timeRange.split('-') : [];
      return {
        id: String(s.id),
        label: String(s.label || fallback?.label || 'Créneau'),
        startTime: s.startTime || (parts[0] && hhmm(parts[0])) || fallback?.startTime || cfg.deliveryHours.start,
        endTime: s.endTime || (parts[1] && hhmm(parts[1])) || fallback?.endTime || cfg.deliveryHours.end,
        priceUsd: Number(s.priceUsd) || 0,
        isExpress: !!s.isExpress,
        active: s.active !== false,
      };
    });
  }

  const gateways = { ...base.paymentGateways };
  for (const key of Object.keys(gateways) as (keyof typeof gateways)[]) {
    const g = src.paymentGateways?.[key] || {};
    gateways[key] = {
      enabled: g.enabled !== false,
      displayName: g.displayName || undefined,
      merchantNumber: g.merchantNumber || '',
      merchantName: g.merchantName || base.paymentGateways[key].merchantName,
      phonePrefix: g.phonePrefix || base.paymentGateways[key].phonePrefix,
      customLogoUrl: g.customLogoUrl || undefined,
      instructions: g.instructions || undefined,
    };
  }
  cfg.paymentGateways = gateways;
  return cfg;
}

function initialDb(): DbShape {
  // Première mise en route : on reprend les anciens fichiers s'ils existent.
  // Ils vivent dans le dossier data/ du dépôt, même quand DATA_DIR pointe vers un disque monté.
  const legacy = (file: string) => readJson(path.join(DATA_DIR, file)) ?? readJson(path.join(ROOT_DIR, 'data', file));
  const legacyConfig = legacy('site-config.json');
  const legacyProducts = legacy('products.json');
  const legacyCategories = legacy('categories.json');
  const stripAgent = ({ assignedAgentId, assignedAgentName, assignedAgentEmail, ...c }: any): Category => c;
  return {
    config: { ...normalizeConfig(legacyConfig), updatedAt: Date.now() },
    categories: (Array.isArray(legacyCategories) && legacyCategories.length ? legacyCategories : INITIAL_CATEGORIES).map(stripAgent),
    products: Array.isArray(legacyProducts) && legacyProducts.length ? legacyProducts : INITIAL_PRODUCTS,
    users: [],
    staff: [],
    sessions: [],
    pushSubs: [],
    orders: [],
    messages: [],
    audit: [],
    orderSeq: 1000,
  };
}

// Les listes qui changent peu sont rangées par morceaux (un document ne dépasse pas 1 Mo dans
// Firestore) ; commandes et conversations ont chacune leur document.
const CHUNKED = ['categories', 'products', 'users', 'staff', 'sessions', 'pushSubs', 'audit'] as const;
const CHUNK_BYTES = 600_000;

function chunk(name: string, items: unknown[], out: Record<string, unknown>) {
  let current: unknown[] = [];
  let size = 0;
  let index = 0;
  const push = () => {
    out[`${name}-${index++}`] = { items: current };
    current = [];
    size = 0;
  };
  for (const item of items) {
    const bytes = Buffer.byteLength(JSON.stringify(item));
    if (size + bytes > CHUNK_BYTES && current.length) push();
    current.push(item);
    size += bytes;
  }
  if (current.length || index === 0) push();
}

function toSnapshot(): Snapshot {
  const snapshot: Snapshot = { state: { config: { value: db.config }, meta: { orderSeq: db.orderSeq } }, orders: {}, chats: {} };
  for (const name of CHUNKED) chunk(name, db[name], snapshot.state);
  for (const order of db.orders) snapshot.orders[order.id] = order;
  const byOrder = new Map<string, ChatMessage[]>();
  for (const m of db.messages) {
    if (!byOrder.has(m.orderId)) byOrder.set(m.orderId, []);
    byOrder.get(m.orderId)!.push(m);
  }
  for (const [orderId, messages] of byOrder) {
    snapshot.chats[orderId] = { orderId, updatedAt: messages[messages.length - 1].at, messages: messages.slice(-300) };
  }
  return snapshot;
}

function fromSnapshot(snapshot: Snapshot): DbShape {
  const fresh = initialDb();
  const legacy = (snapshot.state as any).__legacy;
  if (legacy && legacy.config) {
    // Fichier db.json d'avant le découpage en documents.
    return { ...fresh, ...legacy, config: { ...normalizeConfig(legacy.config), updatedAt: legacy.config.updatedAt || Date.now() } };
  }
  const state = snapshot.state as Record<string, any>;
  const list = (name: string) =>
    Object.keys(state)
      .filter((k) => k.startsWith(`${name}-`))
      .sort((x, y) => Number(x.slice(name.length + 1)) - Number(y.slice(name.length + 1)))
      .flatMap((k) => state[k].items || []);
  const savedConfig = state.config?.value;
  return {
    config: savedConfig ? { ...normalizeConfig(savedConfig), updatedAt: savedConfig.updatedAt || Date.now() } : fresh.config,
    categories: list('categories'),
    products: list('products'),
    users: list('users'),
    staff: list('staff'),
    sessions: list('sessions'),
    pushSubs: list('pushSubs'),
    audit: list('audit'),
    orders: (Object.values(snapshot.orders) as Order[]).sort((x, y) => y.createdAt - x.createdAt),
    messages: (Object.values(snapshot.chats) as { messages: ChatMessage[] }[]).flatMap((c) => c.messages || []).sort((x, y) => x.at - y.at),
    orderSeq: Number(state.meta?.orderSeq) || fresh.orderSeq,
  };
}

// Rempli par initDb() avant que le serveur n'accepte la moindre requête.
export const db: DbShape = {} as DbShape;
export let store: Store;

export async function initDb() {
  const useFirestore = !!(process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIRESTORE_EMULATOR_HOST);
  store = useFirestore ? await firestoreStore() : fileStore(DATA_DIR, UPLOADS_DIR);
  const snapshot = await store.load();
  Object.assign(db, snapshot ? fromSnapshot(snapshot) : initialDb());
  // Première mise en route (ou reprise d'un ancien format) : on écrit tout de suite l'état complet.
  if (!snapshot || (snapshot.state as any).__legacy) await store.persist(toSnapshot());
  console.log(`Données : ${store.kind === 'firestore' ? 'Firestore' : `fichier ${DATA_DIR}/db.json`} — ${db.products.length} produits, ${db.orders.length} commandes chargées.`);
}

let saveTimer: NodeJS.Timeout | null = null;
let writing: Promise<void> = Promise.resolve();
let dirty = false;

// Les écritures se suivent une à une ; un échec (réseau) est retenté à la sauvegarde suivante.
export function flush(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  dirty = false;
  writing = writing
    .then(() => store.persist(toSnapshot()))
    .catch((e) => {
      console.error('Échec de sauvegarde de la base :', e);
      dirty = true;
    });
  return writing;
}

// Écriture regroupée : plusieurs modifications rapprochées = une seule sauvegarde.
export function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void flush();
  }, 250);
}

// Filet de sécurité : une sauvegarde échouée est rejouée même sans nouvelle modification.
setInterval(() => {
  if (dirty) save();
}, 15_000).unref();

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    // L'hébergeur prévient avant d'arrêter ou d'endormir le serveur : on écrit ce qui reste.
    flush().finally(() => process.exit(0));
  });
}

export const newId = (prefix: string) => `${prefix}-${crypto.randomBytes(9).toString('base64url')}`;

export function audit(actorEmail: string, action: string, detail: string) {
  db.audit.unshift({ id: newId('aud'), at: Date.now(), actorEmail, action, detail });
  if (db.audit.length > 800) db.audit.length = 800;
  save();
}

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'mughenyakavale@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const isAdminEmail = (email: string) => ADMIN_EMAILS.includes(email.toLowerCase());
export const findStaff = (email: string) => db.staff.find((s) => s.email === email.toLowerCase());
export const isReservedEmail = (email: string) => isAdminEmail(email) || !!findStaff(email);

// Le rôle n'est jamais stocké sur le compte : il est recalculé à chaque requête à partir de la
// liste des employés, donc un retrait par l'admin prend effet immédiatement.
export function roleOf(user: DbUser): Role {
  if (!user.emailVerified || user.disabled) return 'customer';
  if (isAdminEmail(user.email)) return 'admin';
  const staff = findStaff(user.email);
  return staff && staff.active ? staff.role : 'customer';
}

export function publicUser(user: DbUser) {
  const staff = findStaff(user.email);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: roleOf(user),
    emailVerified: user.emailVerified,
    avatar: user.avatar,
    phone: user.phone || staff?.phone,
    address: user.address,
    commune: user.commune,
    assignedCategoryIds: staff?.assignedCategoryIds,
    loyaltyPoints: user.loyaltyPoints,
    hasPassword: !!user.passwordHash,
  };
}
