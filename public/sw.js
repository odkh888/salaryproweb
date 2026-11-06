const CACHE_NAME = "moneyflow-v1";
const STATIC_ASSETS = [
  "/",
  "/accounts",
  "/categories",
  "/transactions",
  "/subscriptions",
];

// Install — cache static routes
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    }),
  );
});

// Activate — remove old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Fetch — network first, fallback to cache
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET, non-same-origin, API calls, next internals
  if (
    event.request.method !== "GET" ||
    !url.origin.startsWith(self.location.origin) ||
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful HTML responses
        if (response.ok && response.headers.get("content-type")?.includes("text/html")) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback: return cached version or offline page
        return caches.match(event.request).then(
          (cached) => cached || caches.match("/"),
        );
      }),
  );
});

// Push notifications (for subscription reminders)
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || "MoneyFlow";
  const options = {
    body: data.body || "Напоминание о платеже",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/subscriptions" },
    vibrate: [200, 100, 200],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existingClient = clients.find((c) => c.url === url);
        if (existingClient) return existingClient.focus();
        return self.clients.openWindow(url);
      }),
  );
});
