// Service worker de Gomarché : rend l'application installable sans jamais servir de contenu périmé.
// Rien n'est mis en cache ici ; l'API et les pages passent toujours par le réseau.
const OFFLINE_HTML =
  '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Hors connexion</title><body style="font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#F9FAFB">' +
  '<div style="text-align:center;padding:2rem"><h1 style="font-size:1.25rem">Vous êtes hors connexion</h1>' +
  '<p style="color:#4B5563">Vérifiez votre connexion Internet puis réessayez.</p>' +
  '<button onclick="location.reload()" style="padding:.75rem 1.5rem;border:0;border-radius:.75rem;background:#E2001A;color:#fff;font-weight:700">Réessayer</button></div></body></html>';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(() => new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }))
  );
});

// Notifications push : nouveau message de la conversation, étape franchie par une commande.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const url = data.orderId ? '/?order=' + encodeURIComponent(data.orderId) : '/';
  event.waitUntil(
    self.registration.showNotification(data.title || 'Nouvelle notification', {
      body: data.body || '',
      tag: data.tag,
      renotify: !!data.tag,
      icon: data.icon || undefined,
      data: { url },
    })
  );
});

// Un appui sur la notification ramène l'application au premier plan, sur la commande concernée.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          client.postMessage({ type: 'open-order', url });
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
