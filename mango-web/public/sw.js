const CACHE_NAME = "chemonei-shell-v2";
// Precache mínimo (el 512 se cachea on-demand vía fetch para no inflar la instalación)
const APP_SHELL = [
  "/", "/index.html", "/manifest.webmanifest", "/icons/icon-192.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match("/index.html"));
    }),
  );
});

// ── Push Notifications ────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? "CheMonei";
  const options = {
    body:    data.body ?? "",
    icon:    "/icons/icon-192.png",
    badge:   "/icons/icon-192.png",
    tag:     data.tag ?? "chemonei-alert",
    data:    { url: data.url ?? "/" },
    vibrate: [200, 100, 200],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});

// ── Scheduled local notifications (via postMessage) ──────────────────────────

self.addEventListener("message", (event) => {
  if (event.data?.type === "SCHEDULE_NOTIFICATIONS") {
    const alerts = event.data.alerts ?? [];
    for (const alert of alerts) {
      const delay = Math.max(0, new Date(alert.at).getTime() - Date.now());
      if (delay < 86400000 * 7) { // max 7 days ahead
        setTimeout(() => {
          self.registration.showNotification(alert.title, {
            body:  alert.body,
            icon:  "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            tag:   alert.tag,
            data:  { url: "/" },
          });
        }, delay);
      }
    }
  }
});
