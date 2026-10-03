import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import express from 'express';
import helmet from 'helmet';
import { db, initDb, ROOT_DIR, store, UPLOADS_DIR } from './server/db';
import { apiLimiter, csrfGuard, IS_PROD, loadSession, safeEqual } from './server/security';
import { authRouter, bootstrapAdmin } from './server/auth';
import { catalogRouter } from './server/catalog';
import { applyWebhookPayment, ordersRouter, sweepUnpaidOrders } from './server/orders';
import { lensRouter } from './server/lens';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable('x-powered-by');
// Derrière un proxy (Cloud Run, Nginx...) : nécessaire pour lire la vraie adresse IP du client
// (limitation de débit) et savoir que la connexion est en HTTPS (cookie sécurisé).
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));

app.use(
  helmet({
    // En développement, Vite injecte des scripts en ligne : la politique stricte ne vaut qu'en production.
    contentSecurityPolicy: IS_PROD
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", 'https://apis.google.com', 'https://challenges.cloudflare.com'],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
            connectSrc: ["'self'", 'https://*.googleapis.com', 'https://*.firebaseapp.com'],
            frameSrc: ['https://*.firebaseapp.com', 'https://accounts.google.com', 'https://challenges.cloudflare.com'],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
          },
        }
      : false,
    // La fenêtre de connexion Google (popup) doit pouvoir répondre à la page.
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    crossOriginEmbedderPolicy: false,
    // Les serveurs de tuiles OpenStreetMap exigent de connaître le site appelant (origine seule, jamais le chemin).
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// Fichiers envoyés : servis comme simples images, jamais interprétés comme page.
const uploadHeaders = (res: express.Response) => {
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.setHeader('X-Content-Type-Options', 'nosniff');
};
app.get('/uploads/:name', async (req, res, next) => {
  if (store.kind === 'file') return next();
  if (!/^[a-f0-9]{24}\.(jpg|png|webp)$/.test(req.params.name)) return res.status(404).end();
  try {
    const file = await store.readUpload(req.params.name);
    if (!file) return res.status(404).end();
    uploadHeaders(res);
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    res.type(file.contentType).send(file.data);
  } catch (e) {
    next(e);
  }
});
app.use('/uploads', express.static(UPLOADS_DIR, { index: false, maxAge: '30d', immutable: true, setHeaders: uploadHeaders }));

// Manifeste PWA généré depuis la configuration : le nom et l'icône choisis par l'admin
// s'appliquent à tous les appareils, sans redéploiement.
const DEFAULT_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%23E2001A'/%3E%3Cpath d='M25 35h50l-6 32H31z' fill='white'/%3E%3Ccircle cx='38' cy='75' r='6' fill='white'/%3E%3Ccircle cx='62' cy='75' r='6' fill='white'/%3E%3Ccircle cx='50' cy='48' r='10' fill='%23009640'/%3E%3C/svg%3E";

app.get('/manifest.webmanifest', (_req, res) => {
  const c = db.config;
  const icon = c.pwaIconUrl || c.customLogoUrl;
  const v = c.updatedAt || 0;
  const iconType = icon.endsWith('.png') ? 'image/png' : icon.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  res.set('Cache-Control', 'no-cache');
  res.type('application/manifest+json').send({
    name: `${c.siteName} - Supermarché en Ligne`,
    short_name: c.siteName.split(' ')[0],
    description: c.tagline,
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    theme_color: c.primaryColor,
    background_color: '#ffffff',
    icons: icon
      ? [192, 512].map((size) => ({ src: `${icon}${icon.includes('?') ? '&' : '?'}v=${v}`, sizes: `${size}x${size}`, type: iconType, purpose: 'any' }))
      : [{ src: DEFAULT_ICON, sizes: '192x192 512x512', type: 'image/svg+xml', purpose: 'any maskable' }],
  });
});

// ---------------------------------------------------------------- API

// Notification de paiement d'un agrégateur Mobile Money. Le corps brut est signé (HMAC-SHA256)
// avec PAYMENT_WEBHOOK_SECRET : sans signature valide, rien n'est validé.
app.post('/api/payments/webhook', apiLimiter, express.raw({ type: '*/*', limit: '64kb' }), (req, res) => {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) return res.status(404).end();
  const raw: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  if (!safeEqual(String(req.headers['x-gomarche-signature'] || ''), expected)) {
    return res.status(401).json({ error: 'Signature invalide.' });
  }
  let body: any;
  try {
    body = JSON.parse(raw.toString('utf-8'));
  } catch {
    return res.status(400).json({ error: 'JSON invalide.' });
  }
  if (body.status !== 'success') return res.json({ ok: true, ignored: true });
  const result = applyWebhookPayment({
    orderNumber: String(body.orderNumber || ''),
    transactionRef: String(body.transactionRef || '').slice(0, 40),
    amount: Number(body.amount),
    currency: String(body.currency || ''),
  });
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json({ ok: true });
});

const smallJson = express.json({ limit: '100kb' });
const imageJson = express.json({ limit: '8mb' });
const IMAGE_ROUTES = new Set(['/upload', '/lens/identify']);

const api = express.Router();
api.use(apiLimiter);
api.use(csrfGuard);
api.use((req, res, next) => (IMAGE_ROUTES.has(req.path) ? imageJson : smallJson)(req, res, next));
api.use(loadSession);
api.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
// Diagnostic de mise en ligne : montre à l'appelant sa propre adresse telle que le serveur la voit,
// pour vérifier le réglage TRUST_PROXY (la limitation de débit en dépend).
api.get('/ping', (req, res) => {
  res.json({ ok: true, ip: req.ip, hops: String(req.headers['x-forwarded-for'] || '').split(',').filter(Boolean).length });
});
api.use(authRouter);
api.use(catalogRouter);
api.use(ordersRouter);
api.use(lensRouter);
api.use((_req, res) => res.status(404).json({ error: 'Ressource inconnue.' }));
app.use('/api', api);

app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) return next(err);
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Envoi trop volumineux.' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Requête illisible.' });
  console.error(err);
  // Jamais de détail technique vers le client.
  res.status(500).json({ error: 'Erreur interne. Réessayez.' });
});

async function startServer() {
  await initDb();
  bootstrapAdmin();
  sweepUnpaidOrders();
  setInterval(sweepUnpaidOrders, 60_000).unref();

  if (!IS_PROD) {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(ROOT_DIR, 'dist');
    // Les fichiers à empreinte (assets/) peuvent être mis en cache longtemps ; index.html jamais,
    // pour que chaque visite charge la dernière version.
    app.use('/assets', express.static(path.join(dist, 'assets'), { maxAge: '1y', immutable: true, fallthrough: false }));
    app.use(
      express.static(dist, {
        index: false,
        maxAge: '1h',
        setHeaders: (res, file) => {
          if (file.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-cache');
        },
      })
    );
    const indexHtml = () => fs.readFileSync(path.join(dist, 'index.html'), 'utf-8');
    app.get('*', (_req, res) => {
      res.set('Cache-Control', 'no-cache');
      res.type('html').send(indexHtml());
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gomarché : serveur prêt sur http://localhost:${PORT}`);
    if (!process.env.ADMIN_PASSWORD) console.log('Admin : connexion Google uniquement (ADMIN_PASSWORD non défini).');
  });
}

startServer().catch((err) => {
  // Message seul : l'objet d'erreur complet peut embarquer des détails de configuration.
  console.error('ÉCHEC DU DÉMARRAGE :', err?.message || err);
  if (err?.code === 5) console.error('→ La base Firestore est introuvable : créez-la dans la console Firebase (Firestore Database).');
  if (err?.code === 7) console.error('→ Accès refusé : la clé de compte de service n’appartient pas à ce projet Firebase.');
  process.exit(1);
});
