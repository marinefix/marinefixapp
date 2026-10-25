const CACHE_NAME = 'marine-fix-v6';
const OPTIONAL_ASSETS = [
  '/manifest.json',
  '/anchor.svg',
  '/boiler.png',
  '/motor.png',
  '/optimized/anchor.webp',
  '/optimized/hero-bg.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Do not activate a new worker unless the current app shell and its built
    // JS/CSS can be cached. This prevents a partial deployment from deleting
    // the last usable cache and producing a blank page during a brief outage.
    const htmlResponse = await fetch('/index.html', { cache: 'reload' });
    if (!htmlResponse.ok) throw new Error(`App shell fetch failed: ${htmlResponse.status}`);
    const html = await htmlResponse.clone().text();
    await cache.put('/index.html', htmlResponse);
    await cache.put('/', new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));

    const assetUrls = new Set();
    for (const match of html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/gi)) {
      const value = match[1];
      if (value.startsWith('/') && !value.startsWith('//')) assetUrls.add(value);
    }
    for (const assetUrl of assetUrls) {
      const response = await fetch(assetUrl, { cache: 'reload' });
      if (!response.ok) throw new Error(`Required app asset fetch failed: ${assetUrl} (${response.status})`);
      await cache.put(assetUrl, response);
    }

    await Promise.all(OPTIONAL_ASSETS.map(async (asset) => {
      try {
        const response = await fetch(asset, { cache: 'reload' });
        if (response.ok) await cache.put(asset, response);
      } catch (_) {
        // Optional images must not block worker installation.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => /^marine-fix-v\d+$/.test(key) && key !== CACHE_NAME
      ? caches.delete(key)
      : Promise.resolve()));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('.apk') || url.pathname.includes('MarineFix.apk')) return;

  // Never cache or disguise API writes/reads as successful responses.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request).catch(() => new Response(
      JSON.stringify({ success: false, error: 'Network unavailable. Check your connection and retry.' }),
      { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }
    )));
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response && response.ok && response.type !== 'opaque') {
        event.waitUntil(cache.put(request, response.clone()).catch(() => {}));
      }
      return response;
    } catch (_) {
      const cached = await cache.match(request) || await caches.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
        const appShell = await cache.match('/index.html') || await caches.match('/index.html') || await caches.match('/');
        if (appShell) return appShell;
      }
      return new Response('MarineFix could not reach the network and this resource is not cached yet. Reconnect and reload.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }
  })());
});
