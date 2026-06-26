// SS Traders Management System — Service Worker
// Strategy: network-first (always fresh when online), cache as offline fallback.
// Bump CACHE_NAME on each deploy to invalidate old caches.
const CACHE_NAME = "ss-traders-v3";

// Only precache the offline fallback — it's the one page guaranteed to load
// without auth. Auth-gated pages (/dashboard etc.) redirect to /login when
// fetched during install, which would break an atomic addAll(). Those pages
// are cached at runtime as the user actually visits them instead.
const PRECACHE_URLS = ["/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Use individual adds wrapped in catch so one failure can't abort install
      Promise.all(PRECACHE_URLS.map((url) => cache.add(url).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Never touch API calls or cross-origin — always straight to network
  if (url.pathname.startsWith("/api") || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache only successful same-origin responses for offline fallback.
        // Skip redirects (type "opaqueredirect"/302) so we never cache a
        // login bounce in place of a real page.
        if (response.ok && response.type === "basic" && !response.redirected) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === "navigate") {
            return caches.match("/offline");
          }
          return new Response("Offline", { status: 503, statusText: "Offline" });
        })
      )
  );
});

// Allow the page to trigger an immediate update
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
