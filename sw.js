/* =====================================================
   Adeep AG — Service Worker
   Handles: offline caching, push notifications
   ===================================================== */

const CACHE_NAME   = 'adeepag-v1';
const CACHE_STATIC = [
  '/',
  '/index.html',
  '/projects.html',
  '/contact.html',
  '/more.html',
  '/patents.html',
  '/fonts/HeyGotcha-Regular.ttf',
  '/fonts/Horizon.woff2',
  '/fonts/Horizon.otf',
  '/images/navis.png',
  '/images/icon-192.png',
  '/images/icon-512.png'
];

/* ── Install: pre-cache static shell ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_STATIC))
  );
  self.skipWaiting();
});

/* ── Activate: clear old caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ── Fetch: cache-first for static, network-first for HTML ── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin (except Google Fonts)
  if (request.method !== 'GET') return;
  if (url.origin !== location.origin && !url.hostname.includes('fonts.g')) return;

  // Network-first for HTML pages (always fresh content)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request).then(r => r || caches.match('/index.html')))
    );
    return;
  }

  // Cache-first for everything else (fonts, images, css)
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, clone));
        return res;
      });
    })
  );
});

/* ── Push Notifications ── */
self.addEventListener('push', event => {
  let data = { title: 'Adeep AG', body: 'Something new is up!', url: '/' };
  try { data = { ...data, ...event.data.json() }; } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    '/images/icon-192.png',
      badge:   '/images/icon-96.png',
      data:    { url: data.url },
      vibrate: [100, 50, 100],
      actions: [{ action: 'open', title: 'View' }]
    })
  );
});

/* ── Notification click → open/focus tab ── */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(target) && 'focus' in client) return client.focus();
      }
      return clients.openWindow(target);
    })
  );
});
