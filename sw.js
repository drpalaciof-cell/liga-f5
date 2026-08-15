// v14: agrega planilla.html/index.html (antes solo se cacheaban recién la primera vez que
// cargaban bien online — un tablet que nunca completó esa primera carga se quedaba sin nada) y
// los 2 scripts de CDN que planilla.html realmente usa y faltaban acá: firebase-auth-compat.js
// (sin él no hay login anónimo, y sin login anónimo ninguna escritura a Firestore funciona) y
// html2canvas.min.js (necesario para generar el PDF de la planilla).
// v15: sin cambios acá — el bump es a propósito. El chequeo automático de actualización de la
// app (cada 5min / al volver a primer plano) solo dispara cuando este archivo cambia de
// contenido; si un deploy toca solo index.html/planilla.html, una app ya abierta en una tablet
// puede quedar corriendo el JS viejo indefinidamente. Bumpear este número en CADA deploy que
// toque index.html o planilla.html es lo que hace que las tablets ya abiertas se actualicen
// solas sin que nadie tenga que cerrar la app a mano.
// v16: index.html agrega el mismo botón manual "🔄 Actualizar" que ya tenía planilla.html.
const CACHE = 'ligaf5-v16';
const ASSETS = [
  './index.html',
  './planilla.html',
  './manifest.json',
  './manifest-planilla.json',
  './assets/logo-liga-f5.png',
  './assets/logo-clausura.png',
  './assets/copa-primera.png',
  './assets/copa-segunda.png',
  './assets/bg-lacquer.jpg',
  './assets/bg-shapes.jpg',
  './assets/bg-shapes-segunda.jpg',
  './assets/favicon.png',
  './assets/apple-touch-icon.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/planilla-icon-192.png',
  './assets/planilla-icon-512.png',
  './assets/planilla-icon-maskable-512.png',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('firebase.googleapis.com') ||
      url.hostname.includes('identitytoolkit.googleapis.com')) return;
  const isHTML = url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname === '';
  if (isHTML) {
    event.respondWith(
      fetch(req).then(res => {
        if (res && res.status === 200) caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => caches.match(req))
    );
  } else {
    event.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(req);
        const fetchPromise = fetch(req).then(res => {
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        }).catch(() => null);
        return cached || fetchPromise;
      })
    );
  }
});

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Liga F5 Formosa', {
      body: data.body || '',
      icon: './assets/icon-192.png',
      badge: './assets/icon-192.png',
      vibrate: [200, 100, 200],
      data: { rol: data.rol || '' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data || {};
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      if (cs.length > 0) {
        cs[0].focus();
        cs[0].postMessage({ type: 'OPEN_MENSAJES', rol: data.rol });
        return;
      }
      return clients.openWindow('./index.html?abrir=mensajes');
    })
  );
});
