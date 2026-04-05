// Service Worker を無効化 - キャッシュを一切使わない
self.addEventListener('install', e => {
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  // 全キャッシュを削除
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  );
  self.clients.claim();
});
// キャッシュを使わず常にネットワークから取得
self.addEventListener('fetch', e => {
  if(e.request.mode === 'navigate'){
    e.respondWith(fetch(e.request.url + '?v=' + Date.now()));
  }
});
