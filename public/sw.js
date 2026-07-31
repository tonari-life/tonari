const CACHE_VERSION = "tonari-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter(
                (key) =>
                  key.startsWith("tonari-") &&
                  key !== CACHE_VERSION
              )
              .map((key) => caches.delete(key))
          )
        ),
    ])
  );
});

self.addEventListener("fetch", () => {
  // 今回は認証情報や回答データを古いキャッシュから表示しないため、
  // 通信内容はキャッシュしません。
});