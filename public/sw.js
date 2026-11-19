/* Scramjet V2 worker: routed documents only, no app-shell interception. */
importScripts('/controller/controller.sw.js');
self.addEventListener('fetch', event => {
  if (self.$scramjetController?.shouldRoute(event)) {
    event.respondWith(self.$scramjetController.route(event));
  }
});
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});
