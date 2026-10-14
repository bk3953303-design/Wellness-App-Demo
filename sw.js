/* My Wellness — Self-Care — offline-first service worker (cache-first app shell) */
const CACHE = 'mywellness-pwa-v1';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './style.css',
  './app.js',
  './util.js',
  './db.js',
  './ui.js',
  './charts.js',
  './notify.js',
  './content.js',
  './router.js',
  './home.js',
  './routine.js',
  './meals.js',
  './water.js',
  './nutrition.js',
  './prayer.js',
  './work.js',
  './care.js',
  './wellness.js',
  './journal.js',
  './progress.js',
  './photos.js',
  './profile.js',
  './export.js',
  './settings.js',
  './about.js',
  './icon-192.png',
  './icon-512.png',
  './maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // app is fully local; never cache cross-origin
  e.respondWith(
    caches.match(request, { ignoreSearch: false }).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        return res;
      }).catch(() => {
        if (request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.route) || './';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) { c.navigate(target); return c.focus(); }
      return self.clients.openWindow(target);
    })
  );
});
