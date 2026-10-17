// AI Composition Tool Beta - Service Worker
// 策略: Precache 应用壳 + Runtime 缓存模型资产(跨域 CORS) + 网络优先回退缓存
const VERSION = "actb-v0.4.1";
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;
const SHELL_ASSETS = ["./", "./index.html", "./icon-192.png", "./icon-512.png", "./manifest.webmanifest", "./404.html"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // 模型资产 (HuggingFace): 缓存优先, 一次下载永久离线
  if (url.hostname.includes("huggingface.co") || url.hostname.includes("cdn.jsdelivr.net")) {
    e.respondWith(
      caches.open(RUNTIME).then(async cache => {
        const hit = await cache.match(e.request);
        if (hit) return hit;
        const resp = await fetch(e.request);
        if (resp.ok) cache.put(e.request, resp.clone());
        return resp;
      })
    );
    return;
  }
  // 同源: 缓存优先回网络 (应用壳)
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(resp => {
      if (resp.ok && url.origin === location.origin) {
        const clone = resp.clone();
        caches.open(SHELL).then(c => c.put(e.request, clone));
      }
      return resp;
    }).catch(() => caches.match("./index.html")))
  );
});
