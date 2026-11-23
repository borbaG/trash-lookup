// Increment VERSION whenever a precached file changes.
const VERSION = 'v2';
const scope = self.registration.scope;
const cachePrefix = 'trash-lookup:' + scope + ':';
const cacheName = cachePrefix + VERSION;
const shell = [
  'index.html', 'styles.css', 'app.js', 'search.js', 'manifest.json',
  'data/waste-items.json', 'data/categories.json', 'data/pending-items.json', 'icons/icon.svg',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable.png'
];
const assets = new Set(shell.map(path => new URL(path, scope).href));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll([...assets].map(url => new Request(url, { cache: 'reload' })));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(cachePrefix) && key !== cacheName).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const root = new URL(scope);
  const isAppNavigation = event.request.mode === 'navigate' && url.origin === root.origin
    && (url.pathname === root.pathname || url.pathname === root.pathname + 'index.html');
  if (!isAppNavigation && !assets.has(url.href)) return;

  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const key = isAppNavigation ? new URL('index.html', scope).href : url.href;
    return (await cache.match(key)) || fetch(event.request);
  })());
});
