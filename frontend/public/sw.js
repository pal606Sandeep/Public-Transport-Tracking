/* Minimal push service worker.
 * The PWA-infra module replaces this with the Serwist build output (which keeps
 * these same push handlers). Kept at /sw.js so the registration path is stable. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Transit", body: event.data && event.data.text() };
  }
  const title = payload.title || "Transit";
  const options = {
    body: payload.body || "",
    tag: payload.tag || payload.type || "transit",
    data: payload.data || {},
    icon: "/icon-192.png",
    badge: "/badge-72.png",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const hit = wins.find((w) => w.url.includes(url));
      if (hit) return hit.focus();
      return self.clients.openWindow(url);
    })
  );
});
