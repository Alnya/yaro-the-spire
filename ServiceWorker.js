const cacheName = "yaro-the-spire-0.0.3";
const contentToCache = [
  "./",
  "./index.html",
  "./Build/YTSBuild0722.loader.js",
  "./Build/YTSBuild0722.framework.js.unityweb",
  "./Build/YTSBuild0722.data.unityweb",
  "./Build/YTSBuild0722.wasm.unityweb",
  "./TemplateData/style.css"
];

self.addEventListener('install', function (e) {
  console.log('[Service Worker] Install');
  e.waitUntil((async function () {
    const cache = await caches.open(cacheName);
    console.log('[Service Worker] Caching all: app shell and content');
    await cache.addAll(contentToCache);
  })());
  // 新しいSWを即座にアクティブにする
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  console.log('[Service Worker] Activate');
  // 古いキャッシュを削除
  e.waitUntil((async function () {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(key => key !== cacheName).map(key => caches.delete(key))
    );
    // 既存のクライアントを即座に制御下に置く
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (e) {
  // ナビゲーションリクエスト（HTML）はネットワーク優先
  if (e.request.mode === 'navigate') {
    e.respondWith((async function () {
      try {
        const response = await fetch(e.request);
        const cache = await caches.open(cacheName);
        cache.put(e.request, response.clone());
        return response;
      } catch (err) {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        return caches.match('./index.html');
      }
    })());
    return;
  }

  // その他のリソースはキャッシュ優先、なければネットワーク
  e.respondWith((async function () {
    const cached = await caches.match(e.request);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(e.request);
      // 正常なレスポンスのみキャッシュ
      if (response && response.status === 200) {
        const cache = await caches.open(cacheName);
        cache.put(e.request, response.clone());
      }
      return response;
    } catch (err) {
      console.error('[Service Worker] Fetch failed:', e.request.url, err);
      return new Response('', { status: 503, statusText: 'Service Unavailable' });
    }
  })());
});
