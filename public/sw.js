/* M3E Canvas — a small, deterministic service worker for the static Next.js export.
 * No build plugin, no generated precache list: the core shell is named here and everything else
 * is cached the first time it is asked for. */

const CACHE = "m3e-studio-cache-v1";
const CORE = [
  "/",
  "/manifest.webmanifest",
  "/agent.md",
  "/icon.svg",
  "/apple-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE.map((path) => new URL(path, self.registration.scope).toString())))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("m3e-studio-cache-") && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

const cacheFirst = (request) =>
  caches.match(request).then((hit) => {
    if (hit) return hit;
    return fetch(request).then((response) => {
      if (response && response.status === 200 && response.type === "basic") {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    });
  });

const networkFirst = (request) =>
  fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    })
    .catch(() => caches.match(request).then((hit) => hit || caches.match(new URL("/", self.registration.scope).toString())));

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  /* AI providers, fonts and any other origin: never intercept, never cache a failed call */
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || /\.(?:png|svg|ico|woff2?|webp|jpg|jpeg)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
