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

const findUser = (email: string) => db.users.find((u) => u.email === email);

function createUser(fields: Pick<DbUser, 'email' | 'name' | 'emailVerified'> & Partial<DbUser>): DbUser {
  const user: DbUser = { id: newId('usr'), loyaltyPoints: 0, createdAt: Date.now(), ...fields };
  db.users.push(user);
  return user;
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
  res.status(201).json({ user: publicUser(user) });
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
