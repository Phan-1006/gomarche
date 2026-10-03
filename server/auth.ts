import crypto from 'crypto';
import { Router } from 'express';
import { audit, db, DbUser, isReservedEmail, newId, publicUser, save } from './db';
import {
  AuthedRequest,
  authLimiter,
  botCheck,
  clearFailures,
  endAllSessions,
  endSession,
  hashPassword,
  isEmail,
  isLocked,
  normalizePhone,
  recordFailure,
  requireAuth,
  signupCeiling,
  startSession,
  str,
  validPassword,
  verifyFirebaseIdToken,
  verifyPassword,
  writeLimiter,
} from './security';
import { GOMA_QUARTIERS } from '../src/data/mockData';
import { publicUrl, sendAccountMail } from './mail';

const findUser = (email: string) => db.users.find((u) => u.email === email);

function createUser(fields: Pick<DbUser, 'email' | 'name' | 'emailVerified'> & Partial<DbUser>): DbUser {
  const user: DbUser = { id: newId('usr'), loyaltyPoints: 0, createdAt: Date.now(), ...fields };
  db.users.push(user);
  return user;
}

// ---------------------------------------------------------------- liens envoyés par e-mail

const VERIFY_TTL_MS = 24 * 60 * 60_000;
const RESET_TTL_MS = 60 * 60_000;
const tokenHash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('base64url');

// Trois e-mails par heure et par adresse au plus : personne ne peut s'en servir pour inonder
// la boîte de quelqu'un d'autre.
const mailLog = new Map<string, number[]>();
function mailBudget(email: string): boolean {
  const now = Date.now();
  const recent = (mailLog.get(email) || []).filter((at) => now - at < 60 * 60_000);
  if (recent.length >= 3) return false;
  recent.push(now);
  mailLog.set(email, recent);
  if (mailLog.size > 5000) mailLog.delete(mailLog.keys().next().value!);
  return true;
}

function clearMailTokens(user: DbUser) {
  delete user.verifyTokenHash;
  delete user.verifyTokenExpiresAt;
  delete user.resetTokenHash;
  delete user.resetTokenExpiresAt;
}

async function sendVerification(user: DbUser): Promise<boolean> {
  const base = publicUrl();
  if (!base || user.emailVerified || !mailBudget(user.email)) return false;
  const token = newToken();
  user.verifyTokenHash = tokenHash(token);
  user.verifyTokenExpiresAt = Date.now() + VERIFY_TTL_MS;
  save();
  return sendAccountMail({
    to: user.email,
    subject: `Confirmez votre adresse e-mail — ${db.config.siteName}`,
    intro: `Bonjour ${user.name}, confirmez votre adresse e-mail pour sécuriser votre compte ${db.config.siteName}.`,
    actionLabel: 'Confirmer mon adresse',
    actionUrl: `${base}/?verify=${token}`,
    footnote: 'Ce lien est valable 24 heures. Si vous n’avez pas créé de compte, ignorez ce message : sans confirmation, rien ne se passe.',
  });
}

async function sendReset(user: DbUser): Promise<boolean> {
  const base = publicUrl();
  if (!base || !mailBudget(user.email)) return false;
  const token = newToken();
  user.resetTokenHash = tokenHash(token);
  user.resetTokenExpiresAt = Date.now() + RESET_TTL_MS;
  save();
  return sendAccountMail({
    to: user.email,
    subject: `Réinitialisez votre mot de passe — ${db.config.siteName}`,
    intro: `Bonjour ${user.name}, vous avez demandé à choisir un nouveau mot de passe pour votre compte ${db.config.siteName}.`,
    actionLabel: 'Choisir un nouveau mot de passe',
    actionUrl: `${base}/?reset=${token}`,
    footnote: 'Ce lien est valable 1 heure et ne sert qu’une fois. Si vous n’êtes pas à l’origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.',
  });
}

// Compte administrateur de secours, défini uniquement par variables d'environnement.
// Sans ADMIN_PASSWORD, l'administrateur se connecte avec Google.
export function bootstrapAdmin() {
  const password = process.env.ADMIN_PASSWORD;
  const email = (process.env.ADMIN_EMAILS || 'mughenyakavale@gmail.com').split(',')[0].trim().toLowerCase();
  if (!password) return;
  if (password.length < 12) {
    console.warn('ADMIN_PASSWORD ignoré : 12 caractères minimum.');
    return;
  }
  const user = findUser(email) || createUser({ email, name: 'Administrateur', emailVerified: true });
  if (!verifyPassword(password, user.passwordHash)) user.passwordHash = hashPassword(password);
  user.emailVerified = true;
  save();
}

export const authRouter = Router();

authRouter.post('/auth/register', signupCeiling, authLimiter, botCheck, (req, res) => {
  const email = str(req.body?.email, 254).toLowerCase();
  const name = str(req.body?.name, 80);
  const password = req.body?.password;
  if (!isEmail(email)) return res.status(400).json({ error: 'Adresse e-mail invalide.' });
  if (name.length < 2) return res.status(400).json({ error: 'Indiquez votre nom.' });
  if (!validPassword(password)) return res.status(400).json({ error: 'Le mot de passe doit comporter au moins 8 caractères.' });
  // Une adresse d'employé ne peut pas être prise par inscription libre : sinon n'importe qui
  // pourrait s'approprier le rôle en devançant l'employé.
  if (isReservedEmail(email)) {
    return res.status(403).json({ error: 'Cette adresse est réservée au personnel : connectez-vous avec Google ou avec le mot de passe remis par l’administrateur.' });
  }
  if (findUser(email)) return res.status(409).json({ error: 'Un compte existe déjà avec cette adresse. Connectez-vous.' });
  const user = createUser({ email, name, emailVerified: false, passwordHash: hashPassword(password) });
  startSession(res, user);
  // L'adresse reste « non confirmée » tant que le lien reçu par e-mail n'a pas été ouvert.
  void sendVerification(user);
  res.status(201).json({ user: publicUser(user) });
});

authRouter.post('/auth/resend-verification', authLimiter, requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  if (user.emailVerified) return res.json({ ok: true, alreadyVerified: true });
  if (!(await sendVerification(user))) {
    return res.status(429).json({ error: 'E-mail non envoyé pour le moment. Réessayez dans une heure.' });
  }
  res.json({ ok: true });
});

authRouter.post('/auth/verify-email', authLimiter, (req: AuthedRequest, res) => {
  const hash = tokenHash(str(req.body?.token, 200));
  const user = db.users.find((u) => u.verifyTokenHash === hash && (u.verifyTokenExpiresAt || 0) > Date.now() && !u.disabled);
  if (!user) return res.status(400).json({ error: 'Ce lien de confirmation est invalide ou expiré. Demandez-en un nouveau depuis votre compte.' });
  user.emailVerified = true;
  delete user.verifyTokenHash;
  delete user.verifyTokenExpiresAt;
  save();
  audit(user.email, 'compte.email_confirme', 'Adresse e-mail confirmée');
  // Le compte n'est renvoyé qu'à son propriétaire déjà connecté : ouvrir le lien ne connecte personne.
  res.json({ ok: true, user: req.user?.id === user.id ? publicUser(user) : null });
});

authRouter.post('/auth/forgot-password', authLimiter, botCheck, (req, res) => {
  const email = str(req.body?.email, 254).toLowerCase();
  if (!isEmail(email)) return res.status(400).json({ error: 'Adresse e-mail invalide.' });
  const user = findUser(email);
  // Envoi en arrière-plan et réponse identique dans tous les cas : ni le contenu ni le délai
  // de la réponse ne révèlent si un compte existe pour cette adresse.
  if (user && !user.disabled) void sendReset(user);
  res.json({ ok: true });
});

authRouter.post('/auth/reset-password', authLimiter, (req, res) => {
  const hash = tokenHash(str(req.body?.token, 200));
  const user = db.users.find((u) => u.resetTokenHash === hash && (u.resetTokenExpiresAt || 0) > Date.now() && !u.disabled);
  if (!user) return res.status(400).json({ error: 'Ce lien est invalide ou expiré. Refaites une demande de mot de passe oublié.' });
  if (!validPassword(req.body?.password)) return res.status(400).json({ error: 'Le mot de passe doit comporter au moins 8 caractères.' });
  user.passwordHash = hashPassword(req.body.password);
  // Avoir reçu le lien prouve que l'adresse appartient bien à cette personne.
  user.emailVerified = true;
  clearMailTokens(user);
  clearFailures(`login:${user.email}`);
  // Toutes les sessions ouvertes sont fermées : celui qui connaissait l'ancien mot de passe perd l'accès.
  endAllSessions(user.id);
  startSession(res, user);
  audit(user.email, 'compte.mot_de_passe', 'Mot de passe réinitialisé par e-mail');
  res.json({ user: publicUser(user) });
});

authRouter.post('/auth/login', authLimiter, botCheck, (req, res) => {
  const email = str(req.body?.email, 254).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password.slice(0, 200) : '';
  const lockKey = `login:${email}`;
  if (isLocked(lockKey)) return res.status(429).json({ error: 'Compte temporairement verrouillé après plusieurs échecs. Réessayez dans 10 minutes.' });
  const user = findUser(email);
  // Même message que l'adresse existe ou non, pour ne pas révéler les comptes.
  if (!user || user.disabled || !verifyPassword(password, user.passwordHash)) {
    recordFailure(lockKey);
    return res.status(401).json({ error: 'E-mail ou mot de passe incorrect.' });
  }
  clearFailures(lockKey);
  startSession(res, user);
  res.json({ user: publicUser(user) });
});

authRouter.post('/auth/google', authLimiter, async (req, res) => {
  try {
    const google = await verifyFirebaseIdToken(String(req.body?.idToken || ''));
    let user = findUser(google.email);
    if (user?.disabled) return res.status(403).json({ error: 'Ce compte est désactivé.' });
    if (!user) user = createUser({ email: google.email, name: google.name, emailVerified: true });
    else if (!user.emailVerified) {
      // Compte créé par mot de passe sans jamais confirmer l'adresse : rien ne prouve que son
      // créateur en était le propriétaire. Le vrai propriétaire, prouvé par Google, le reprend
      // seul : mot de passe effacé, sessions et liens en cours annulés.
      delete user.passwordHash;
      clearMailTokens(user);
      endAllSessions(user.id);
      audit(user.email, 'compte.repris_par_google', 'Compte non confirmé repris par connexion Google');
    }
    user.emailVerified = true;
    if (google.picture) user.avatar = google.picture;
    startSession(res, user);
    res.json({ user: publicUser(user) });
  } catch (e: any) {
    res.status(401).json({ error: 'Connexion Google refusée : jeton invalide ou expiré.' });
  }
});

authRouter.post('/auth/logout', (req, res) => {
  endSession(req, res);
  res.json({ ok: true });
});

authRouter.put('/me', writeLimiter, requireAuth, (req: AuthedRequest, res) => {
  const user = req.user!;
  const name = str(req.body?.name, 80);
  if (name.length >= 2) user.name = name;
  if (req.body?.phone !== undefined) {
    const phone = normalizePhone(req.body.phone);
    if (!phone) return res.status(400).json({ error: 'Numéro de téléphone invalide (format +243 suivi de 9 chiffres).' });
    user.phone = phone;
  }
  if (req.body?.address !== undefined) user.address = str(req.body.address, 200);
  if (req.body?.commune !== undefined && GOMA_QUARTIERS.includes(req.body.commune)) user.commune = req.body.commune;
  save();
  res.json({ user: publicUser(user) });
});

authRouter.post('/me/password', authLimiter, requireAuth, (req: AuthedRequest, res) => {
  const user = req.user!;
  if (user.passwordHash && !verifyPassword(String(req.body?.currentPassword || ''), user.passwordHash)) {
    return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });
  }
  if (!validPassword(req.body?.newPassword)) return res.status(400).json({ error: 'Le nouveau mot de passe doit comporter au moins 8 caractères.' });
  user.passwordHash = hashPassword(req.body.newPassword);
  // Toutes les autres sessions sont fermées : un appareil volé perd l'accès.
  endAllSessions(user.id);
  startSession(res, user);
  audit(user.email, 'compte.mot_de_passe', 'Mot de passe modifié');
  res.json({ ok: true });
});
