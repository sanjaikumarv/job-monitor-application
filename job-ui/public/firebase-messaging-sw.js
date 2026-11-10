// Firebase Cloud Messaging Service Worker
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const notificationTitle = payload.notification?.title || 'New Job Alert!';
    const notificationOptions = {
      body: payload.notification?.body || 'A new matching job opportunity was found.',
      icon: '/next.svg',
      badge: '/file.svg',
      data: payload.data || {},
    };

    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions),
    );
  } catch (err) {
    console.error('Push handling error:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.applicationUrl || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    }),
  );
});

