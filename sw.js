// Offline shell: cache-first for app files, network for everything else.
// Plan data is cached separately in localStorage by the app itself.
const VERSION = 'jt-v18';
const SHELL = [
  './', 'index.html', 'styles.css', 'config.js', 'secrets.enc.js', 'manifest.webmanifest',
  'js/app.js', 'js/sheet.js', 'js/parse.js', 'js/sync.js', 'js/time.js', 'js/ics.js', 'js/unlock.js',
  'js/util.js', 'js/content.js', 'js/live.js', 'js/kit.js', 'js/map.js', 'js/map-data.js', 'js/search.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const sameOrigin = url.origin === location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  const isFirebaseSdk = url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/');
  if (!sameOrigin && !isFont && !isFirebaseSdk) return;  // Sheets API, Firebase traffic: straight to network

  // Stale-while-revalidate: instant from cache, refresh in the background.
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(e.request, { ignoreSearch: sameOrigin });
    const fresh = fetch(e.request).then(res => {
      if (res.ok || res.type === 'opaque') cache.put(e.request, res.clone());
      return res;
    }).catch(() => hit);
    return hit || fresh;
  }));
});
