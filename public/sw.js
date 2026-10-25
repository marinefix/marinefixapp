const CACHE_NAME = 'marine-fix-v9';
const OPTIONAL_ASSETS = [
  '/manifest.json',
  '/anchor.svg',
  '/boiler.png',
  '/motor.png',
  '/optimized/anchor.webp',
  '/optimized/hero-bg.webp',
  '/optimized/equipment/auxiliary-systems.webp',
  '/optimized/equipment/ballast-systems.webp',
  '/optimized/equipment/boiler.webp',
  '/optimized/equipment/bridge-navigation-systems.webp',
  '/optimized/equipment/compressor.webp',
  '/optimized/equipment/deck-machinery.webp',
  '/optimized/equipment/electrical.webp',
  '/optimized/equipment/generator.webp',
  '/optimized/equipment/hvac.webp',
  '/optimized/equipment/instrumentation-control.webp',
  '/optimized/equipment/main-engine.webp',
  '/optimized/equipment/others-general-machinery.webp',
  '/optimized/equipment/pump.webp',
  '/optimized/equipment/purifier.webp',
  '/optimized/equipment/reefer-systems.webp',
  '/optimized/equipment/safety-fire-protection.webp',
  '/optimized/equipment/steering-gear.webp'
];

const isStaticAsset = (pathname) =>
  pathname.startsWith('/assets/') ||
  pathname.startsWith('/optimized/') ||
  /\.(?:png|jpe?g|webp|gif|avif|svg|ico|woff2?)$/i.test(pathname);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // The HTML and its current JS/CSS are required. If these cannot be fetched,
    // leave the existing active worker in place rather than activate a partial app.
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

    // Images are optional: cache every image that is available, but do not block install.
    await Promise.all(OPTIONAL_ASSETS.map(async (asset) => {
      try {
        const response = await fetch(asset, { cache: 'reload' });
        if (response.ok && response.type !== 'opaque') await cache.put(asset, response);
      } catch (_) {}
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

  // Let API requests pass through without Service Worker interception.
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    // JavaScript and CSS are revalidated against the deployed version first.
    // If the connection is weak/offline, fall back to the last known-good copy.
    // The cache version is bumped with this change so old shell/assets are retired.
    const isAppCode = /\.(?:js|css)$/i.test(url.pathname);
    if (isAppCode) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(request, { cache: 'no-cache', signal: controller.signal });
        if (response.ok && response.type !== 'opaque') {
          await cache.put(request, response.clone()).catch(() => {});
        }
        if (response.ok) return response;
        const cached = await cache.match(request) || await caches.match(request);
        return cached || response;
      } catch (_) {
        const cached = await cache.match(request) || await caches.match(request);
        if (cached) return cached;
        return new Response('MarineFix app code is not available offline yet. Reconnect and reload.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
        });
      } finally {
        clearTimeout(timeoutId);
      }
    }

    // Images and fonts use cache-first to reduce data use on weak connections.
    if (isStaticAsset(url.pathname)) {
      const cached = await cache.match(request) || await caches.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok && response.type !== 'opaque') await cache.put(request, response.clone()).catch(() => {});
        return response;
      } catch (_) {
        return new Response('This MarineFix resource is not cached yet. Reconnect and reload to download it.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
        });
      }
    }

    // HTML/navigation and other same-origin GET requests are network-first,
    // with an explicit Response fallback in every failure path.
    try {
      const response = await fetch(request);
      if (response.ok && response.type !== 'opaque') await cache.put(request, response.clone()).catch(() => {});
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


