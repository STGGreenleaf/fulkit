const CACHE_NAME = "fulkit-v2";

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(["/", "/index.html"]).catch(() => {})
    )
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith("http")) return;

  const url = new URL(event.request.url);

  // Never intercept JS/CSS — let browser handle naturally
  if (url.pathname.endsWith(".js") || url.pathname.endsWith(".css")) return;

  // Cache-first for same-origin static assets only (images + fonts)
  // External images (album art, YouTube thumbnails) pass through directly — no interception
  if (url.origin === self.location.origin && url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) =>
        cached || fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
      ).catch(() => new Response("", { status: 404 }))
    );
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((names) =>
        Promise.all(names.map((name) => name !== CACHE_NAME ? caches.delete(name) : undefined))
      ),
      self.clients.claim(),
    ])
  );
});
