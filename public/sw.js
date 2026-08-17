/* OpinionX service worker — static assets only; never cache auth or private API data */
const CACHE_VERSION = "opinionx-static-v1";
const PRECACHE = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_VERSION)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isUnsafe(url) {
  const u = new URL(url);
  if (u.hostname.includes("supabase.co")) return true;
  if (u.pathname.startsWith("/auth")) return true;
  if (u.pathname.startsWith("/api")) return true;
  if (u.searchParams.has("code")) return true;
  return false;
}

function isStaticAsset(url) {
  const u = new URL(url);
  if (u.origin !== self.location.origin) return false;
  return (
    u.pathname.startsWith("/_next/static/") ||
    u.pathname.startsWith("/icons/") ||
    u.pathname === "/manifest.json" ||
    /\.(png|jpg|jpeg|gif|webp|svg|ico|woff2?|css|js)$/i.test(u.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = request.url;
  if (isUnsafe(url)) return;

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
            }
            return res;
          })
          .catch(() => cached);
      })
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => res)
        .catch(() =>
          caches.match("/offline.html").then((r) => r || caches.match("/"))
        )
    );
  }
});
