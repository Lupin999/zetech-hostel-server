const CACHE_NAME = 'zetech-hostel-v4';

const PRECACHE = ['/'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Never intercept API calls, chrome-extension requests, or non-GET requests
    if (
        request.method !== 'GET' ||
        url.protocol === 'chrome-extension:' ||
        url.hostname.includes('onrender.com') ||
        url.hostname.includes('safaricom') ||
        url.hostname.includes('netlify')
    ) {
        return; // Let the browser handle it normally
    }

    event.respondWith(
        fetch(request)
            .then(response => {
                // Only cache successful same-origin responses
                if (response.ok && url.origin === self.location.origin) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                }
                return response;
            })
            .catch(async () => {
                // Network failed — try cache
                const cached = await caches.match(request);
                if (cached) return cached;

                // For navigation requests (page loads), return the app shell
                if (request.mode === 'navigate') {
                    const shell = await caches.match('/');
                    if (shell) return shell;
                }

                // For everything else return a proper empty 503, NOT Response.error()
                // Response.error() causes a blank black screen — avoid it
                return new Response('Offline', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: { 'Content-Type': 'text/plain' },
                });
            })
    );
});

// Handle messages from the page (prevents "went out of scope" warning)
self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
