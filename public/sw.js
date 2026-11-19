/* Celestial Browser V2: narrow scope routing for Scramjet documents. */
importScripts('/v2/controller/controller.sw.js');
self.addEventListener('fetch', event => {
  if (self.$scramjetController?.shouldRoute(event)) {
    event.respondWith(self.$scramjetController.route(event));
  }
});
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
