// 簡單安全的 Service Worker:新聞一律走網絡(永遠最新),靜態檔案先用快取。
const CACHE = "hkmd-v1";
const SHELL = ["/", "/index.html", "/favicon.svg", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // 新聞 API:永遠網絡,唔快取
  if (url.pathname.startsWith("/api/") || url.pathname.includes("/.netlify/")) return;
  // 頁面導覽:網絡優先,失敗先用快取
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("/index.html")));
    return;
  }
  // 其他靜態:快取優先
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((resp) => {
      const copy = resp.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return resp;
    }).catch(() => hit))
  );
});
