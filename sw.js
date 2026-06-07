const CACHE_NAME = 'zetech-hostel-v3';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).then(response => {
            return response;
        }).catch(() => {
            return caches.match(event.request).then(r => r || Response.error());
        })
    );
});
