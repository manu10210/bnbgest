// BNBGest Service Worker — Push Notifications
const CACHE_NAME = 'bnbgest-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Réception d'une notification push
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'BNBGest', body: event.data.text() };
  }

  const title = data.title || 'BNBGest';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/favicon.ico',
    tag: data.tag || 'bnbgest-notif',
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Clic sur une notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Ouvrir dans un onglet existant si possible
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Sinon ouvrir un nouvel onglet
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
