const CACHE_NAME = "fulkit-v3";

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("install", (event) => {
  self.skipWaiting(); // Force activate immediately
});

// No fetch interception — let the browser handle everything natively.
// Album art caching is handled by localStorage (fulkit-art-cache).
// Service worker exists only for PWA manifest + future push notifications.

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Clear all old caches
      caches.keys().then((names) =>
        Promise.all(names.map((name) => caches.delete(name)))
      ),
      self.clients.claim(),
    ])
  );
});
