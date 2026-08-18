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
// v27: 3 pedidos del usuario en pleno partido --
// (1) el cronometro de 2do tiempo cortaba recien al terminar de cerrar la planilla (firmas +
// observaciones), no al tocar "FIN DEL PARTIDO" -- ahora corta ahi mismo.
// (2) se puede marcar la hora REAL de arranque desde la propia pantalla de alineacion
// (marcarArranqueTemprano()), para cuando el arbitro no espera a que se termine de cargar la
// lista -- el cronometro (tanto el del planillero como el de "En vivo") ya lo refleja aunque el
// partido siga tecnicamente en la pantalla de alineacion.
// (3) en "En vivo" (index.html), goleadores y tarjetas ahora se separan por equipo -- antes
// salian todos mezclados en una sola lista sin poder saber de que lado era cada uno.
// v28: nuevo boton "📋 Cargar alineacion por adelantado" en la pestana "En vivo" del panel admin
// (index.html) -- el admin puede cargar la lista de buena fe + capitan del proximo partido de
// cada cancha antes de que el planillero llegue a esa pantalla, para no perder tiempo cuando el
// partido ya tiene que arrancar. Escribe los mismos campos que usa planilla.html
// (alineacionLocal/Visitante, capitanLocalDni/VisitanteDni) -- iniciarAlineacion() detecta que
// ya estan cargadas y salta derecho a la pantalla del partido.
// v29: sistema de avisos rapidos admin <-> planillero, por cancha (coleccion avisosPlanilla,
// 1 doc por cancha, no un chat con historial). Planillero: franja fija abajo de la pantalla
// (no bloquea nada, no es alert/confirm nativo) con el mensaje del admin y una respuesta rapida
// ("OK" o texto libre) -- se cierra sola al responder. Nuevo boton "📣 Llamar al organizador"
// (pantalla de lista y header del partido). Admin: banner siempre visible (en cualquier pestana)
// cuando alguna cancha esta llamando, con boton "Atendi", y boton "✉️ Mandar aviso" +
// respuesta del planillero en cada tarjeta de "En vivo".
// v30: notificationclick ahora distingue destino segun data.target -- los avisos para el
// planillero (nuevo sistema admin<->planillero) abren/enfocan planilla.html en vez de
// index.html. push handler reenvia el campo target al abrir la notificacion.
// v31: 3 pedidos del usuario --
// (1) index.html: boton "📢 Mandar aviso a las 3 canchas a la vez" en "En vivo".
// (2) planilla.html: boton "⏸ Pausar"/"▶ Reanudar" cronometro (lesion u otro corte del
// arbitro) -- descuenta el tiempo pausado del cronometro, tanto el del planillero como el de
// "En vivo" (admin/publico), que ahora tambien lo refleja.
// (3) los nombres de arbitro se cargan una sola vez por cancha (guardados en
// avisosPlanilla/{cancha}) y se precargan solos en los proximos partidos de esa cancha, en vez
// de tener que tipearlos partido por partido.
// v32: "Llamar al organizador" ahora pide un motivo opcional (prompt, cancelable sin cancelar
// el llamado) -- se ve en el banner del admin y en el texto de la notificacion push.
// v33: en los avisos admin<->planillero, ahora se ve el NOMBRE del planillero ademas de la
// cancha (banner, tarjeta "En vivo" y notificacion push) -- el dato ya se guardaba, solo
// faltaba mostrarlo.
// v34: 2 pedidos del usuario --
// (1) botones del planillero mas grandes y separados (estaban chicos y pegados, se tocaban por
// error) -- 🔔/📣 movidos a una fila propia debajo del topbar de "Ver partidos", y ⏸ Pausar /
// 📣 Organizador / 🔄 Actualizar movidos del header apretado del partido a una fila nueva en el
// footer, mas grandes y con fondo/borde propios.
// (2) admin: "Cargar alineacion por adelantado" ya no espera a que cierre el partido en curso --
// busca el proximo partido de la cancha (por horario) al que le falte alineacion, sin importar
// si el anterior sigue jugandose.
// v35: auditoria offline completa de nuevo (a pedido del usuario, de cara a la proxima fecha).
// Encontrado y corregido: editarNumeroJugador() esperaba (.then) el ack del servidor para
// recien ahi actualizar la pantalla -- con mala señal, corregir un numero de camiseta no
// mostraba ningun cambio hasta que volviera la conexion. Mismo criterio que el resto: actualiza
// ya, guarda atras.
// v36: corregir el resultado de un partido YA CERRADO, desde el admin --
// (1) el editor de resultado ahora también está en la pantalla "Planillas"
// (antes solo en el fixture), que es donde uno busca una planilla ya cerrada.
// (2) BUG: el editor colapsaba las tarjetas de cada jugador en un solo select,
// así que corregir un gol le borraba la 2ª amarilla a quien la tuviera y le
// cambiaba la sanción sin avisar -- ahora son contador de amarillas + doble +
// roja, una entrada por tarjeta, igual que las que genera el planillero.
// (3) la planilla firmada (`eventos`, lo que arma el PDF) NO se toca: se
// conserva el documento tal cual lo firmaron los capitanes. La corrección
// guarda `planillaOriginal` + `rectificaciones[]` (fecha y motivo obligatorio)
// y marca el partido como rectificado, y tanto el fixture como Planillas
// muestran qué decía la planilla firmada para que la diferencia no sea
// silenciosa. Posiciones, goleadores y sanciones toman el valor corregido y se
// actualizan solos en las pantallas públicas (ya había onSnapshot).
// v37: FIX de v36. El aviso de "goles asignados vs marcador" estaba escrito
// asumiendo que solo podían FALTAR goles; cuando SOBRABAN (imposible: no puede
// haber más goleadores que goles) mostraba igual el texto de "puede ser un gol
// en contra, se guarda igual" y dejaba guardar. Resultado real: un partido
// quedó 7-5 con 12 goles cargados del lado local, y la tabla de goleadores
// pública mostró a un jugador con 8 goles. Ahora el exceso es un error rojo,
// nombra a los equipos, y `guardarResultadoPartido` NO guarda hasta corregirlo.
// Que falten goles sigue siendo solo un aviso (puede ser un gol en contra).
// v38: boton "🗑 Eliminar fecha" en el encabezado de cada fecha del fixture del
// admin -- borra TODOS los partidos de esa fecha de esa division (las dos zonas
// y el interzonal, no solo lo que se ve en la solapa abierta). Nace para poder
// sacar la "Fecha 999999" con dos partidos "Test Local vs Test Visitante" que
// dejo un script de diagnostico el 15/08 y que se veian en el fixture publico
// de Primera (no tienen _sim:true, asi que los filtros de la app no los
// tapaban). La confirmacion escala con el daño: si ningun partido de la fecha
// se jugo, alcanza con confirmar; si hay jugados, se listan uno por uno, se
// avisa cuantos pierden la planilla firmada y hay que ESCRIBIR el numero de
// fecha para que no se borre una fecha real de un clic distraido.
// v39: fixture público de Segunda -- se leía todo mezclado. Cada zona era una
// columna independiente que renderizaba TODAS sus fechas, así que bastaba con
// que una zona tuviera un partido más en una fecha (6 vs 5, por el interzonal)
// para que de ahí para abajo los encabezados "FECHA N" de las dos columnas
// quedaran a distinta altura. Ahora se agrupa por FECHA primero (título a todo
// el ancho) y adentro van las dos zonas, así cada fecha arranca siempre pareja
// y el hueco de la zona con un partido menos queda contenido en su fecha. Los
// títulos "Zona A/Zona B" van una sola vez arriba (en celular se ocultan: están
// las solapas, y cada fecha lleva su etiqueta de zona). Además las tarjetas
// eran innecesariamente grandes: menos padding y tipografías más chicas para
// que entren más partidos sin scrollear.
const CACHE = 'ligaf5-v39';
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
      data: { rol: data.rol || '', target: data.target || '' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data || {};
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      // Avisos para el planillero abren/enfocan planilla.html, nunca index.html -- el resto
      // (mensajes equipo<->admin) sigue yendo a index.html como siempre.
      if (data.target === 'planilla') {
        const cPlanilla = cs.find(c => c.url.includes('planilla.html'));
        if (cPlanilla) { cPlanilla.focus(); return; }
        return clients.openWindow('./planilla.html');
      }
      if (cs.length > 0) {
        cs[0].focus();
        cs[0].postMessage({ type: 'OPEN_MENSAJES', rol: data.rol });
        return;
      }
      return clients.openWindow('./index.html?abrir=mensajes');
    })
  );
});
