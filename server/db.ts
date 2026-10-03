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
  // true si l'e-mail est prouvé (connexion Google) ou si le mot de passe a été posé par l'admin.
  // Un rôle employé/admin n'est jamais accordé à un e-mail non vérifié.
  emailVerified: boolean;
  createdAt: number;
  lastLoginAt?: number;
  disabled?: boolean;
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
  orders: Order[];
  messages: ChatMessage[];
  audit: AuditEntry[];
  orderSeq: number;
}

export const ROOT_DIR = path.resolve(import.meta.dirname, '..');
export const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT_DIR, 'data');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

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
    orders: [],
    messages: [],
    audit: [],
    orderSeq: 1000,
  };
}

function load(): DbShape {
  const existing = readJson(DB_FILE);
  if (existing && existing.config) {
    const fresh = initialDb();
    return { ...fresh, ...existing, config: { ...normalizeConfig(existing.config), updatedAt: existing.config.updatedAt || Date.now() } };
  }
  if (fs.existsSync(DB_FILE)) {
    // Fichier présent mais illisible : on le met de côté plutôt que de l'écraser.
    fs.renameSync(DB_FILE, `${DB_FILE}.corrupt-${Date.now()}`);
  }
  return initialDb();
}

export const db: DbShape = load();

let saveTimer: NodeJS.Timeout | null = null;

export function flush() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db), { encoding: 'utf-8', mode: 0o600 });
  fs.renameSync(tmp, DB_FILE);
}

// Écriture atomique regroupée : plusieurs modifications rapprochées = une seule écriture disque.
export function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      flush();
    } catch (e) {
      console.error('Échec de sauvegarde de la base :', e);
    }
  }, 150);
}

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    try {
      flush();
    } finally {
      process.exit(0);
    }
  });
}

export const newId = (prefix: string) => `${prefix}-${crypto.randomBytes(9).toString('base64url')}`;

export function audit(actorEmail: string, action: string, detail: string) {
  db.audit.unshift({ id: newId('aud'), at: Date.now(), actorEmail, action, detail });
  if (db.audit.length > 2000) db.audit.length = 2000;
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
    avatar: user.avatar,
    phone: user.phone || staff?.phone,
    address: user.address,
    commune: user.commune,
    assignedCategoryIds: staff?.assignedCategoryIds,
    loyaltyPoints: user.loyaltyPoints,
    hasPassword: !!user.passwordHash,
  };
}
