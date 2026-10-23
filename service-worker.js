const CACHE_NAME = "cinepick-offline-v7";
const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    for (const file of APP_FILES) {
      try {
        const response = await fetch(file, { cache: "no-store" });
        if (response.ok) await cache.put(file, response.clone());
      } catch (_) {}
    }

    try {
      const response = await fetch("./movie-collection.json", {
        cache: "no-store"
      });
      if (response.ok) {
        await cache.put("./movie-collection.json", response.clone());
      }
    } catch (_) {}

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter(key =>
          key.startsWith("cinepick-offline-") &&
          key !== CACHE_NAME
        )
        .map(key => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  const isNavigation = request.mode === "navigate";
  const isIndex = url.pathname.endsWith("/index.html");

  if (isNavigation || isIndex) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, {
          cache: "no-store"
        });

        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put("./index.html", response.clone());
        }

        return response;
      } catch (_) {
        return (
          await caches.match("./index.html") ||
          await caches.match("./") ||
          Response.error()
        );
      }
    })());

    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);

      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }

      return response;
    } catch (_) {
      return Response.error();
    }
  })());
});
