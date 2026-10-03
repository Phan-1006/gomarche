import { db } from './db';
import { IS_PROD } from './security';

// Envoi des e-mails de compte (confirmation d'adresse, mot de passe oublié) par l'API HTTP de
// Brevo : aucun serveur SMTP à gérer, et l'offre gratuite suffit pour ces messages.
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const MAIL_FROM = (process.env.MAIL_FROM || '').trim();

export const mailEnabled = !!(BREVO_API_KEY && MAIL_FROM);

// Adresse publique du site, utilisée dans les liens envoyés par e-mail. Elle ne vient jamais de
// la requête : un en-tête Host falsifié ferait sinon partir un lien vers un autre site.
export function publicUrl(): string | null {
  const configured = (process.env.PUBLIC_URL || '').trim().replace(/\/+$/, '');
  if (configured) return configured;
  const host = (process.env.ALLOWED_HOSTS || '').split(',')[0].trim();
  if (host) return `https://${host}`;
  return IS_PROD ? null : `http://localhost:${Number(process.env.PORT) || 3000}`;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export interface AccountMail {
  to: string;
  subject: string;
  intro: string;
  actionLabel: string;
  actionUrl: string;
  footnote: string;
}

let warned = false;

/** Envoie un e-mail de compte. Renvoie false si l'envoi n'a pas pu se faire. */
export async function sendAccountMail(mail: AccountMail): Promise<boolean> {
  if (!mailEnabled) {
    if (!IS_PROD) {
      // En développement, le lien s'affiche dans la console pour pouvoir tester sans fournisseur.
      console.log(`[e-mail non envoyé] ${mail.subject} → ${mail.to}\n  ${mail.actionUrl}`);
      return true;
    }
    if (!warned) {
      warned = true;
      console.error('E-mails désactivés : renseignez BREVO_API_KEY et MAIL_FROM pour la confirmation d’adresse et le mot de passe oublié.');
    }
    return false;
  }

  const site = db.config.siteName;
  const color = /^#[0-9a-fA-F]{6}$/.test(db.config.primaryColor) ? db.config.primaryColor : '#E2001A';
  const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:24px;background:#F3F4F6;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111827">
<div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px">
<h1 style="margin:0 0 16px;font-size:20px">${escapeHtml(site)}</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.5">${escapeHtml(mail.intro)}</p>
<p style="margin:0 0 20px"><a href="${escapeHtml(mail.actionUrl)}" style="display:inline-block;padding:12px 22px;border-radius:12px;background:${color};color:#ffffff;font-weight:700;text-decoration:none">${escapeHtml(mail.actionLabel)}</a></p>
<p style="margin:0 0 8px;font-size:12px;color:#6B7280;line-height:1.5">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>${escapeHtml(mail.actionUrl)}</p>
<p style="margin:16px 0 0;font-size:12px;color:#6B7280;line-height:1.5">${escapeHtml(mail.footnote)}</p>
</div></body></html>`;
  const text = `${mail.intro}\n\n${mail.actionLabel} : ${mail.actionUrl}\n\n${mail.footnote}`;

  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: MAIL_FROM, name: process.env.MAIL_FROM_NAME || site },
        to: [{ email: mail.to }],
        subject: mail.subject,
        htmlContent: html,
        textContent: text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (r.ok) return true;
    console.error(`Envoi d’e-mail refusé (${r.status}) :`, (await r.text()).slice(0, 300));
  } catch (e) {
    console.error('Envoi d’e-mail impossible :', e);
  }
  return false;
}
