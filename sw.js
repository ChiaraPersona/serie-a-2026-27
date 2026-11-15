'use strict';
// Live sports data always use the network; content-addressed blocks are immutable.
importScripts('js/services/reading-shared.js?v=20261115-shared-v1');
const SHARED_CACHE='serie-a-reading-shared-v1';
const sharedReading=self[Symbol.for('prima-del-fischio.reading-shared')];
const CACHE = 'serie-a-offline-v4';
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
  const shared=url.pathname.match(/\/data\/generated\/readings\/shared\/([a-f0-9]{64})\.json$/);
  if(shared&&!url.search){
    event.respondWith((async()=>{
      const cache=await caches.open(SHARED_CACHE),cached=await cache.match(event.request);
      if(cached)return cached;
      const response=await fetch(event.request,{cache:'no-store'});
      if(response.ok){
        await sharedReading.verifyBlock(await response.clone().json(),shared[1]);
        await cache.put(event.request,response.clone());
        const keys=await cache.keys();
        await Promise.all(keys.slice(0,Math.max(0,keys.length-128)).map(key=>cache.delete(key)));
      }
      return response;
    })());
  } else if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request, {cache: 'no-store'}).catch(async () =>
      (await caches.match(offlineURL)) || Response.error()));
  } else if (url.pathname.includes('/data/')) {
    event.respondWith(fetch(event.request, {cache: 'no-store'}));
  }
});
