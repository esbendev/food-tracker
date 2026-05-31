var CACHE_NAME = "food-tracker-v20260531-9";
var APP_SHELL = [
  "./",
  "./index.html",
  "./correlations.html",
  "./history.html",
  "./resumen.html",
  "./settings.html",
  "./add-item.html",
  "./add-symptom.html",
  "./edit-item.html",
  "./edit-symptom.html",
  "./styles.css",
  "./js/shared.js",
  "./js/pwa.js",
  "./js/index.js",
  "./js/correlations.js",
  "./js/history.js",
  "./js/resumen.js",
  "./js/add-item.js",
  "./js/add-symptom.js",
  "./js/edit-item.js",
  "./js/edit-symptom.js",
  "./js/settings.js",
  "./manifest.webmanifest",
  "./assets/icons/icon-180.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
        return null;
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("message", function (event) {
  if (!event.data || event.data.type !== "GET_CACHE_NAME" || !event.ports || !event.ports[0]) {
    return;
  }

  event.ports[0].postMessage({ cacheName: CACHE_NAME });
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") {
    return;
  }

  var isNavigationRequest = event.request.mode === "navigate";

  event.respondWith(
    caches.match(event.request).then(function (cachedResponse) {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(function (networkResponse) {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
          return networkResponse;
        }

        var responseToCache = networkResponse.clone();

        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(function () {
        if (isNavigationRequest) {
          return caches.match("./index.html");
        }

        return Response.error();
      });
    })
  );
});

self.addEventListener("periodicsync", function (event) {
  if (event.tag !== "daily-reminder") {
    return;
  }

  event.waitUntil(
    self.registration.showNotification("Food Tracker", {
      body: "No te olvides de registrar tus comidas de hoy.",
      icon: "./assets/icons/icon-192.png",
      badge: "./assets/icons/icon-192.png",
      tag: "daily-reminder"
    })
  );
});