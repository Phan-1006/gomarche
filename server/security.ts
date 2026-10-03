import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Role } from '../src/types';
import { db, DbUser, ROOT_DIR, roleOf, save } from './db';

export const IS_PROD = process.env.NODE_ENV === 'production';

// ---------------------------------------------------------------- mots de passe

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password: string, stored: string | undefined): boolean {
  if (!stored) return false;
  const [scheme, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

export const validPassword = (p: unknown): p is string => typeof p === 'string' && p.length >= 8 && p.length <= 200;

export function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// ---------------------------------------------------------------- sessions

const SESSION_COOKIE = 'gm_sid';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1 && part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

export function startSession(res: Response, user: DbUser) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  // Sessions expirées retirées ; au-delà de 3000, les plus anciennes sont fermées.
  db.sessions = db.sessions.filter((s) => s.expiresAt > now).slice(-2999);
  db.sessions.push({ tokenHash: sha256(token), userId: user.id, expiresAt: now + SESSION_TTL_MS });
  user.lastLoginAt = now;
  save();
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PROD,
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
}

export function endSession(req: Request, res: Response) {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) {
    const hash = sha256(token);
    db.sessions = db.sessions.filter((s) => s.tokenHash !== hash);
    save();
  }
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

export function endAllSessions(userId: string) {
  db.sessions = db.sessions.filter((s) => s.userId !== userId);
  save();
}

export interface AuthedRequest extends Request {
  user?: DbUser;
  role?: Role;
}

export function loadSession(req: AuthedRequest, _res: Response, next: NextFunction) {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) {
    const hash = sha256(token);
    const session = db.sessions.find((s) => s.tokenHash === hash && s.expiresAt > Date.now());
    const user = session && db.users.find((u) => u.id === session.userId && !u.disabled);
    if (user) {
      req.user = user;
      req.role = roleOf(user);
    }
  }
  next();
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Connexion requise.' });
  next();
}

export const requireRole =
  (...roles: Role[]) =>
  (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Connexion requise.' });
    if (!roles.includes(req.role!)) return res.status(403).json({ error: 'Accès refusé pour votre rôle.' });
    next();
  };

// ---------------------------------------------------------------- anti-CSRF

// Toute requête qui modifie des données doit porter un en-tête personnalisé (impossible à
// envoyer depuis un autre site sans autorisation CORS, que ce serveur n'accorde jamais) et,
// quand le navigateur l'indique, provenir de la même origine.
// Noms de domaine supplémentaires depuis lesquels le site est servi (ex. un hébergeur de pages
// qui relaie les requêtes vers ce serveur).
const ALLOWED_HOSTS = (process.env.ALLOWED_HOSTS || '')
  .split(',')
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

export function csrfGuard(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin) {
    let originHost = '';
    try {
      originHost = new URL(origin).hostname.toLowerCase();
    } catch {
      /* origine illisible => refus ci-dessous */
    }
    if (originHost !== req.hostname && !ALLOWED_HOSTS.includes(originHost)) {
      return res.status(403).json({ error: 'Origine refusée.' });
    }
  }
  if (req.headers['x-requested-with'] !== 'gomarche') return res.status(403).json({ error: 'Requête refusée.' });
  next();
}

// ---------------------------------------------------------------- limitation de débit

const limiter = (windowMs: number, limit: number, message: string) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: message },
  });

export const apiLimiter = limiter(60_000, 240, 'Trop de requêtes. Réessayez dans un instant.');
export const authLimiter = limiter(15 * 60_000, 20, 'Trop de tentatives de connexion. Réessayez dans 15 minutes.');
export const orderLimiter = limiter(60 * 60_000, 12, 'Trop de commandes en peu de temps. Réessayez plus tard.');
export const writeLimiter = limiter(60_000, 40, 'Trop d’actions en peu de temps. Ralentissez.');
export const lensLimiter = limiter(60 * 60_000, 60, 'Limite de recherches photo atteinte pour cette heure.');

// Verrouillage par compte, en plus de la limite par adresse IP.
const failures = new Map<string, { count: number; until: number }>();

export function isLocked(key: string): boolean {
  const f = failures.get(key);
  return !!f && f.until > Date.now() && f.count >= 5;
}

export function recordFailure(key: string, lockMs = 10 * 60_000) {
  const now = Date.now();
  const f = failures.get(key);
  if (!f || f.until < now) failures.set(key, { count: 1, until: now + lockMs });
  else f.count += 1;
}

export const clearFailures = (key: string) => failures.delete(key);

// ---------------------------------------------------------------- anti-robots

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY || '';
export const TURNSTILE_SITE_KEY = TURNSTILE_SECRET ? process.env.TURNSTILE_SITE_KEY || '' : '';

// Champ-piège invisible : un humain le laisse vide, un robot de formulaire le remplit.
// Si Cloudflare Turnstile est configuré, son jeton est en plus vérifié côté serveur.
export async function botCheck(req: Request, res: Response, next: NextFunction) {
  const body = req.body || {};
  if (typeof body.website === 'string' && body.website.length > 0) {
    return res.status(400).json({ error: 'Requête refusée.' });
  }
  if (!TURNSTILE_SECRET || !TURNSTILE_SITE_KEY) return next();
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret: TURNSTILE_SECRET, response: String(body.captchaToken || ''), remoteip: req.ip || '' }),
      signal: AbortSignal.timeout(8000),
    });
    const data: any = await r.json();
    if (data.success) return next();
    return res.status(400).json({ error: 'Vérification anti-robot échouée. Rechargez la page et réessayez.' });
  } catch {
    return res.status(503).json({ error: 'Vérification anti-robot indisponible. Réessayez.' });
  }
}

// ---------------------------------------------------------------- connexion Google (Firebase)

const firebaseFileConfig = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'firebase-applet-config.json'), 'utf-8'));
  } catch {
    return {};
  }
})();
const FIREBASE_PROJECT_ID: string = process.env.FIREBASE_PROJECT_ID || firebaseFileConfig.projectId || '';

const firebaseKeys = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

// Vérifie la signature du jeton Firebase auprès des clés publiques de Google : le serveur ne
// fait jamais confiance à une adresse e-mail simplement annoncée par le navigateur.
export async function verifyFirebaseIdToken(idToken: string) {
  if (!FIREBASE_PROJECT_ID) throw new Error('Projet Firebase non configuré.');
  const { payload } = await jwtVerify(idToken, firebaseKeys, {
    issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
    audience: FIREBASE_PROJECT_ID,
    algorithms: ['RS256'],
  });
  if (!payload.sub || typeof payload.email !== 'string' || payload.email_verified !== true) {
    throw new Error('Compte Google sans e-mail vérifié.');
  }
  return {
    email: payload.email.toLowerCase(),
    name: typeof payload.name === 'string' ? payload.name : payload.email.split('@')[0],
    picture: typeof payload.picture === 'string' ? payload.picture : undefined,
  };
}

// ---------------------------------------------------------------- validation d'entrées

export const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export const isEmail = (v: string) => v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

// Numéro congolais : +243 suivi de 9 chiffres (accepte 0XXXXXXXXX et les espaces).
export function normalizePhone(v: unknown): string | null {
  const digits = String(v || '').replace(/[^\d]/g, '');
  let national = '';
  if (digits.startsWith('243') && digits.length === 12) national = digits.slice(3);
  else if (digits.startsWith('0') && digits.length === 10) national = digits.slice(1);
  else if (digits.length === 9) national = digits;
  if (!/^[89]\d{8}$/.test(national)) return null;
  return `+243${national}`;
}

// Une image n'est acceptée que sous forme de lien https ou de fichier servi par ce serveur.
export function safeImageUrl(v: unknown): string {
  const s = str(v, 2000);
  if (/^\/uploads\/[A-Za-z0-9._-]+$/.test(s)) return s;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' ? u.toString() : '';
  } catch {
    return '';
  }
}

export const num = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
