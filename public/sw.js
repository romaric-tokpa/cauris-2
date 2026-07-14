/* Cauris — Service Worker (PWA)
   - Coquille (CSS/JS/icônes) mise en cache pour une ouverture rapide et hors-ligne.
   - Navigation & app.js/sync.js : réseau d'abord (toujours à jour), cache en repli.
   - /api/* : réseau uniquement (données + authentification, jamais en cache).
*/
const VERSION = "cauris-v9";
const SHELL = "shell-" + VERSION;
const RUNTIME = "runtime-" + VERSION;

const PRECACHE = [
  "/macaisse.css",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

function networkFirst(req, cacheName) {
  return fetch(req)
    .then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(cacheName).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    })
    .catch(() => caches.match(req).then((hit) => hit || caches.match("/")));
}

function staleWhileRevalidate(req, cacheName) {
  return caches.open(cacheName).then((cache) =>
    cache.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Données & auth : jamais en cache.
  if (url.pathname.startsWith("/api/") || url.pathname === "/login") return;

  // Logique applicative + feuille de style (noms non hashés qui changent à
  // chaque déploiement) : toujours frais (réseau d'abord, cache en repli hors-ligne).
  if (url.pathname === "/app.js" || url.pathname === "/sync.js" || url.pathname === "/macaisse.css") {
    event.respondWith(networkFirst(req, RUNTIME));
    return;
  }

  // Navigations (l'app) : réseau d'abord, coquille en repli hors-ligne.
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req, RUNTIME));
    return;
  }

  // Polices Google : cache d'abord.
  if (url.origin !== self.location.origin) {
    event.respondWith(staleWhileRevalidate(req, RUNTIME));
    return;
  }

  // Autres ressources same-origin (CSS, icônes, chunks Next) : SWR.
  event.respondWith(staleWhileRevalidate(req, RUNTIME));
});
