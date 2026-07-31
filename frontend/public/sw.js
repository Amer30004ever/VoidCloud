const CACHE_NAME = "voidcloud-shell-v3";

const SHELL_URLS = [
  "/",
  "/voidcloud/dashboard",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (self.location.hostname === 'localhost') return;
  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Navigations (HTML documents) must always be network-first: a stale cached
  // document can freeze old client-side auth/redirect logic in place forever,
  // causing pages to disagree with each other after a deploy (redirect loops).
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => {
          if (request.mode === "navigate") {
            return caches.match("/");
          }
        });
      })
    );
  }
});

