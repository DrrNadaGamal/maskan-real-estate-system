// Service worker: browsing works with no connection.
// Static files: cache-first, refreshed in the background. /api/data (GET): network-first, last good copy as fallback.
const V = 'maskan-v1';
const SHELL = ['/', '/property', '/crm', '/common.js', '/shared.js', '/art.js', '/home.js', '/property.js', '/styles.css', '/icon.svg', '/manifest.webmanifest'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  if (url.pathname === '/api/data') {
    e.respondWith(fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(V).then((c) => c.put('/api/data', copy)); } return r; }).catch(() => caches.match('/api/data').then(async (m) => (m ? new Response(await m.blob(), { headers: { 'content-type': 'application/json', 'x-maskan-cache': '1' } }) : Response.error()))));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => {
    const net = fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(V).then((c) => c.put(req, copy)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
