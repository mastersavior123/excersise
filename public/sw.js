const CACHE_NAME = "wod-compiler-shell-v1";
const APP_SHELL = ["/offline", "/icon-192.png", "/icon-512.png", "/icon-maskable-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 페이지 탐색: 네트워크 우선, 실패하면(오프라인) 폴백 페이지
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline")));
    return;
  }

  // 아이콘 등 정적 자산: 캐시 우선
  if (url.pathname.startsWith("/icon-")) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
    return;
  }

  // API·그 외 요청은 관여하지 않는다 — 훈련 데이터가 캐시로 낡아 보이는 걸 막기 위해
  // 항상 네트워크로 그대로 보낸다(Phase 6 README "의도적으로 축소한 범위" 참고).
});
