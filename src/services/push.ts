import { api } from './api';

/**
 * Notifications push du navigateur. Disponibles sur Android, sur ordinateur, et sur iPhone
 * uniquement lorsque l'application est installée sur l'écran d'accueil.
 */
export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const pushPermission = (): NotificationPermission | 'unsupported' => (pushSupported() ? Notification.permission : 'unsupported');

const toKey = (base64url: string) => {
  const padded = base64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64url.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
};

// Le service worker n'est enregistré qu'en production : en développement, on n'attend pas indéfiniment.
async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  if (!existing) return null;
  return navigator.serviceWorker.ready;
}

/**
 * Abonne cet appareil et l'associe au compte connecté. Si `ask` est faux, rien n'est demandé à
 * l'utilisateur : l'abonnement n'est (re)fait que si l'autorisation a déjà été donnée.
 */
export async function enablePush(publicKey: string, ask: boolean): Promise<'ok' | 'denied' | 'unavailable'> {
  if (!pushSupported()) return 'unavailable';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') {
    if (!ask) return 'unavailable';
    if ((await Notification.requestPermission()) !== 'granted') return 'denied';
  }
  const reg = await registration();
  if (!reg) return 'unavailable';
  let sub = await reg.pushManager.getSubscription();
  // Une clé serveur changée invalide l'ancien abonnement : on repart d'un abonnement neuf.
  const sameKey = sub?.options.applicationServerKey && btoa(String.fromCharCode(...new Uint8Array(sub.options.applicationServerKey)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') === publicKey;
  if (sub && !sameKey) {
    await sub.unsubscribe().catch(() => {});
    sub = null;
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) });
  const json = sub.toJSON();
  await api('POST', '/push/subscribe', { endpoint: json.endpoint, keys: json.keys });
  return 'ok';
}

/** À la déconnexion : cet appareil ne doit plus recevoir les notifications de ce compte. */
export async function disablePush(): Promise<void> {
  try {
    const reg = await registration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await api('POST', '/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  } catch {
    /* sans conséquence : le serveur retire de lui-même un abonnement mort */
  }
}
