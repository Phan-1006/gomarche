import { Router } from 'express';
import webpush from 'web-push';
import type { Role } from '../src/types';
import { db, DbPushSub, roleOf, save } from './db';
import { AuthedRequest, requireAuth, str, writeLimiter } from './security';

// Notifications push du navigateur (Web Push). Les deux clés se génèrent une fois avec
// `npx web-push generate-vapid-keys` ; sans elles, la fonction est simplement désactivée.
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || `mailto:${(process.env.ADMIN_EMAILS || 'mughenyakavale@gmail.com').split(',')[0].trim()}`;

let enabled = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    enabled = true;
  } catch (e: any) {
    console.error('Notifications push désactivées : clés VAPID invalides —', e?.message || e);
  }
}

/** Clé publique transmise au navigateur, ou undefined si les notifications sont désactivées. */
export const PUSH_PUBLIC_KEY = enabled ? VAPID_PUBLIC_KEY : undefined;

// Le serveur n'écrit que vers les services de notification des navigateurs : une adresse
// d'abonnement fournie par un visiteur ne peut pas le faire appeler un autre serveur.
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^[a-z0-9-]+\.push\.services\.mozilla\.com$/,
  /^[a-z0-9.-]+\.notify\.windows\.com$/,
  /^[a-z0-9.-]+\.push\.apple\.com$/,
];

function safeEndpoint(v: unknown): string {
  const raw = str(v, 1000);
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && !u.username && PUSH_HOSTS.some((h) => h.test(u.hostname)) ? u.toString() : '';
  } catch {
    return '';
  }
}

const MAX_DEVICES_PER_USER = 5;

export const pushRouter = Router();

pushRouter.post('/push/subscribe', writeLimiter, requireAuth, (req: AuthedRequest, res) => {
  if (!enabled) return res.status(503).json({ error: 'Les notifications ne sont pas activées sur ce site.' });
  const endpoint = safeEndpoint(req.body?.endpoint);
  const p256dh = str(req.body?.keys?.p256dh, 200);
  const auth = str(req.body?.keys?.auth, 100);
  if (!endpoint || !/^[A-Za-z0-9_-]{20,}$/.test(p256dh) || !/^[A-Za-z0-9_-]{8,}$/.test(auth)) {
    return res.status(400).json({ error: 'Abonnement aux notifications invalide.' });
  }
  const userId = req.user!.id;
  // Un appareil n'appartient qu'à un compte : s'il change d'utilisateur, l'ancien lien est retiré.
  db.pushSubs = db.pushSubs.filter((s) => s.endpoint !== endpoint);
  const sub: DbPushSub = { userId, endpoint, p256dh, auth, createdAt: Date.now() };
  db.pushSubs.push(sub);
  const mine = db.pushSubs.filter((s) => s.userId === userId);
  if (mine.length > MAX_DEVICES_PER_USER) {
    const drop = new Set(mine.slice(0, mine.length - MAX_DEVICES_PER_USER).map((s) => s.endpoint));
    db.pushSubs = db.pushSubs.filter((s) => !drop.has(s.endpoint));
  }
  save();
  res.status(201).json({ ok: true });
});

// Sans connexion requise : à la déconnexion, l'appareil doit pouvoir se désabonner même si la
// session vient d'expirer. Connaître l'adresse d'abonnement (longue et aléatoire) suffit.
pushRouter.post('/push/unsubscribe', writeLimiter, (req, res) => {
  const endpoint = str(req.body?.endpoint, 1000);
  const before = db.pushSubs.length;
  db.pushSubs = db.pushSubs.filter((s) => s.endpoint !== endpoint);
  if (db.pushSubs.length !== before) save();
  res.json({ ok: true });
});

export interface PushPayload {
  title: string;
  body: string;
  // Regroupe les notifications d'un même sujet : la plus récente remplace la précédente.
  tag?: string;
  orderId?: string;
}

/** Envoie une notification à tous les appareils de ces comptes. Ne bloque ni n'échoue jamais. */
export function pushToUsers(userIds: (string | undefined)[], payload: PushPayload) {
  if (!enabled) return;
  const targets = new Set(userIds.filter(Boolean) as string[]);
  if (!targets.size) return;
  const icon = db.config.pwaIconUrl || db.config.customLogoUrl || undefined;
  const body = JSON.stringify({ ...payload, icon, title: payload.title.slice(0, 80), body: payload.body.slice(0, 180) });
  for (const sub of db.pushSubs.filter((s) => targets.has(s.userId))) {
    webpush
      .sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body, { TTL: 60 * 60, urgency: 'high' })
      .catch((e: any) => {
        // 404 / 410 : l'appareil s'est désabonné ou a été réinitialisé, l'abonnement est mort.
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          db.pushSubs = db.pushSubs.filter((s) => s.endpoint !== sub.endpoint);
          save();
        } else {
          console.warn('Notification push non remise :', e?.statusCode || e?.message || e);
        }
      });
  }
}

/** Envoie une notification à tout le personnel actif d'un rôle. */
export function pushToRole(role: Role, payload: PushPayload) {
  if (!enabled) return;
  const subscribed = new Set(db.pushSubs.map((s) => s.userId));
  pushToUsers(
    db.users.filter((u) => subscribed.has(u.id) && roleOf(u) === role).map((u) => u.id),
    payload
  );
}
