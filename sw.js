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
// v17: se saca el overlay de "girá la tablet a vertical" de planilla.html -- bloqueaba abrir
// la app desde una computadora (pantalla horizontal). El bloqueo de rotación queda a cargo del
// sistema operativo de cada tablet en vez de la app.
// v18: fix en cargarDivisionesCanchas() -- mostraba division/zona mezclando TODAS las fechas
// futuras para una misma cancha (la cancha de Primera y las zonas de Segunda rotan fecha a
// fecha), ahora se acota a la fecha activa (la más baja con partidos sin jugar).
// v19: nueva pestaña "🔴 En vivo" en el panel admin (index.html) -- una tarjeta por cancha con
// el partido en curso (marcador, goleadores, tarjetas) o el próximo, en tiempo real vía
// Firestore -- para seguir las 3 canchas desde una computadora sin abrir 3 pestañas del
// planillero.
// v20: cronómetro real en "En vivo". Nuevos estados 'esperando_inicio' y 'entretiempo' en
// planilla.html -- el planillero ahora marca el arranque real (pitazo) y el arranque del 2°
// tiempo con un botón dedicado, en vez de que el cronómetro empiece solo al cargar la
// alineación. Guarda horaArranque/horaFin1T/horaInicio2T/horaFin en cada partido.
// v21: URGENTE en pleno partido -- (1) editar el número de camiseta de un jugador ya
// confirmado en la alineación (antes no se podía corregir un typo sin pasar por "Corregir
// evento"), (2) agregar a la planilla un jugador que no está en la lista de buena fe del
// equipo, cargándolo a mano, (3) botón "Actualizar" agregado también en la pantalla del
// partido en vivo (antes solo estaba en la de elegir cancha).
// v22: URGENTE -- confirmarAlineacion() esperaba (await) el ack del servidor antes de avanzar,
// a diferencia de TODO el resto de la app (goles/tarjetas/faltas nunca esperan eso). Con señal
// mala/nula en la cancha, Firestore no resuelve ese await hasta reconectar, y se veía como
// "Error al guardar" justo al confirmar la alineación. Ahora guarda en segundo plano como el
// resto, sin bloquear.
// v23: el gate de "esperando arranque"/"entretiempo" tapaba TODA la pantalla del partido -- a
// pedido del usuario, ahora es un botón más dentro de la planilla (mismo lugar que "FIN DEL
// 1° TIEMPO"), para poder seguir viendo y tocando el resto de la planilla mientras se espera.
// v24: auditoria completa de "necesita internet" en planilla.html. cerrarPlanilla(),
// confirmarAgregarJugador() y agregarJugadorManual() esperaban (await) el ack del servidor
// antes de dar cualquier feedback -- mismo bug que ya se habia corregido en
// confirmarAlineacion(). Las tres ahora actualizan el estado local y avisan al toque, guardando
// en Firestore en segundo plano. Ya no deberia haber ninguna accion del planillero que quede
// colgada esperando señal -- todo se guarda local y sincroniza solo cuando vuelve la conexion.
// v25: (1) index.html -- pestaña pública "🔴 En vivo" en la home (sin login), misma tarjeta por
// cancha que ya tenía el panel admin, para que el público siga el resultado en tiempo real.
// (2) planilla.html -- cronómetro visible para el propio planillero (al lado de "1° TIEMPO"/
// "2° TIEMPO" en el header del partido), mismo criterio que el de "En vivo": de referencia, no
// es el reloj oficial que lleva el árbitro.
// v26: al abrir un partido nuevo, antes siempre arrancaba pidiendo la alineación del equipo
// local primero -- ahora, si ninguno de los dos cargó todavía, se le pregunta al planillero con
// cuál equipo arrancar (a veces uno está listo con lista y capitán antes que el otro).
const CACHE = 'ligaf5-v26';
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
