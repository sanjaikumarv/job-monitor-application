self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = {
        notification: { title: "Notification", body: event.data.text() },
      };
    }
  }

  const title =
    payload.notification?.title || payload.data?.title || "New Job Alert!";
  const options = {
    body:
      payload.notification?.body ||
      payload.data?.body ||
      "New scheduled notification received.",
    icon: payload.notification?.icon || "/favicon.ico",
    badge: payload.notification?.badge || "/favicon.ico",
    data: payload.data || {},
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const title = event.data.title || "Job Monitor Alert";
    const options = event.data.options || {};
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.link || event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      }),
  );
});
