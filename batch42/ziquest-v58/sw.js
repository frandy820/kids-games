/* ziquest Service Worker v53 — 长缓存（github.io max-age=600 太短，10 分钟后整文件重拉；
   国内 80KB/s 拉 10MB 要 2 分钟）。策略=HTML stale-while-revalidate：
   - 二开秒开（缓存命中即返），后台静默拉新版（下次打开生效）
   - sw.js 自身浏览器按导航重取，byte 变化即重装 → 发新版换 CACHE_VER 推动全量刷新
   scope=本目录，只拦 navigation 请求，其他一律放行 */
'use strict';
const CACHE_VER = 'zq-v58';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_VER).then(c => c.add('./index.html')).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE_VER).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;                 /* 只管页面导航，资源全放行 */
  e.respondWith(
    caches.open(CACHE_VER).then(async c => {
      const hit = await c.match('./index.html');
      const net = fetch(e.request).then(r => { if (r && r.ok) c.put('./index.html', r.clone()); return r; })
        .catch(() => null);
      return hit || (await net) || new Response('离线且无缓存，请恢复网络后重开', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    })
  );
});
