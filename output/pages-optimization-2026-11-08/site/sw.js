'use strict';
// Cache only the explicit offline screen. Sports data and pages always use the network.
const CACHE = 'serie-a-offline-v1';
const offlineURL = new URL('offline.html', self.registration.scope).href;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(new Request(offlineURL, {cache: 'reload'}))));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('serie-a-offline-') && name !== CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request, {cache: 'no-store'}).catch(async () =>
      (await caches.match(offlineURL)) || Response.error()));
  } else if (url.pathname.includes('/data/')) {
    event.respondWith(fetch(event.request, {cache: 'no-store'}));
  }
});
