# TODO — Liga F5

> Se actualiza cada sesión para no depender de la memoria del chat.

## ✅ Todo lo planeado (1–15) — commiteado y en producción

- **1-11**: mensajería completa (commits `229fe91`, `271e66f`).
- **13-15**: aviso de seguro pendiente al equipo, deshabilitación por seguro vencido + habilitación tardía con recargo $7.000, banner admin de plazos vencidos (commit `eef3ab7`).
- **Monto declarado + saldo pendiente real** (commit `0ad56b9`, 2026-07-31): al subir cualquier comprobante (inscripción, saldo, o cada tanda de seguro) el equipo ahora también declara el monto transferido. El sistema compara contra lo requerido (según división / seña-saldo / cantidad de jugadores asegurados) y muestra "coincide" / "falta $X" / "$X de más", tanto en el panel del equipo como en las listas de revisión del admin. Cada subida notifica a **ambos**: el equipo recibe confirmación con el desglose, el admin recibe el aviso ya con el monto declarado incluido. Verificado con llamadas directas a las mismas funciones que usa la UI (escritura, cálculo, y creación del mensaje) — el click-through visual del wizard se puso inestable en el navegador pero la lógica está confirmada.
  - Quedó 1 equipo de prueba para borrar del panel admin: **TEST MONTO DIRECT FC** (el otro intento, "TEST MONTO FC 20260731", no llegó a crearse).

## ✅ Seguridad — login + reglas de Firestore endurecidas (2026-07-31, commits `936124e` + reglas)

Hallazgo original: cualquier usuario (incluido un equipo) podía leer los hashes de contraseña de `admins/*` desde la consola del navegador, y escribir directamente cualquier campo de cualquier equipo (auto-aprobarse pago/seguro, editar o tomar el documento de *otro* equipo). Causa raíz: la app solo usaba auth anónima de Firebase, sin identidad real — el login comparaba un hash traído al cliente.

Se resolvió en dos fases, sin cortar el acceso a equipos en uso:

- **Fase 1**: nueva Cloud Function `login()` verifica usuario+contraseña en el servidor y devuelve un custom token de Firebase Auth con el rol adentro (`role: 'admin'|'equipo'`, `adminId`/`equipoId`). El hash ya no llega al navegador. Gestión de admins (crear/listar/eliminar, cambiar contraseña) movida a Cloud Functions equivalentes. Requirió un permiso de IAM (Service Account Token Creator) en la cuenta de servicio de las funciones — ya otorgado.
- **Fase 2**: `firestore.rules` reescritas usando la identidad real: `admins/*` ahora es solo para el servidor (`allow read, write: if false`), y en `equipos/{id}` un equipo solo puede escribir su **propio** documento. `pagoFechaRevision`, `pagoSaldoFechaRevision`, `seguroJugadoresDni`, `seguroHabilitadoManual` quedan exclusivos del admin; `pagoEstado`/`pagoSaldoEstado` el equipo solo puede ponerlos en `'pendiente'` (al subir un comprobante) — nunca en `'aprobado'`/`'rechazado'`. `config/*` ahora requiere admin para escribir.
  - Primera versión de esta regla bloqueaba `pagoEstado`/`pagoSaldoEstado` por completo, lo que rompía la inscripción de equipos nuevos y la subida del saldo (ambas legítimamente ponen ese campo en 'pendiente'). Corregido en commit `e13f224` tras probar una inscripción real de punta a punta.

**Verificado en producción, con pruebas reales (no simuladas):**
- Lectura anónima a `admins` → bloqueada.
- Escritura anónima de `pagoEstado` en un equipo ajeno → bloqueada.
- Aprobación real de pago por el admin logueado → funcionó y quedó guardada.
- Inscripción de un equipo nuevo de punta a punta (cuenta → datos → división → buena fe → subir comprobante de pago) → funcionó, quedó logueado automáticamente, `pagoEstado: 'pendiente'` guardado correctamente.
- Equipo editando su propia lista de jugadores → funciona.
- Equipo intentando auto-aprobarse el pago → bloqueado.
- Equipo intentando editar el documento de otro equipo → bloqueado.
- Equipo de prueba usado para el test, eliminado por el usuario.

**Pendiente menor, no urgente:** ~~el hash de contraseña de los equipos sigue siendo técnicamente legible vía lectura pública de equipos/*~~ → **resuelto 2026-08-01**, ver más abajo.

## ✅ Sesión 2026-08-01 — planilla, auditoría completa, sync en vivo, migración de credenciales, Primera sin zonas

**Planilla — bugs encontrados y corregidos** (commits `e96d1ca`…`555a6fe`):
- El simulador ("🧪 Simular partido de prueba") usaba un ID de documento reservado por Firestore (`__sim_planilla__`) — fallaba siempre. Corregido, y de paso se encontró que el mismo botón guardaba `cancha` como texto en vez de número, por lo que el partido que creaba nunca aparecía en "Ver partidos" aunque sí figurara en la pantalla de selección de cancha. Los dos, corregidos.
- Varios `catch` vacíos o solo con `console.error` dejaban fallas completamente invisibles para el planillero (auth anónima, carga de partidos por cancha, guardado de eventos en partido). Ahora avisan con un toast.
- La app, al reabrir, restauraba la sesión anterior (cancha/partido guardado) saltando directo a la pantalla del partido — lo que además la hacía saltarse la pantalla donde están los avisos de error nuevos. Sumado a que el `sw.js` (service worker) solo se autoactualiza cuando cambia su propio archivo, una tablet podía quedar corriendo código viejo indefinidamente sin ninguna señal. Se agregó chequeo de actualización cada vez que la app vuelve a primer plano (no solo al navegar), así no depende de forzar el cierre manual.
- Un resultado cargado a mano desde el panel admin no marcaba el partido como `cerrado`, así que la planilla lo podía abrir de nuevo y pisarlo con un partido vacío. Ahora el admin también cierra `estado`, y la planilla además rechaza abrir cualquier partido con `jugado:true` sin importar el `estado`.
- No se podía cargar cambio de jugador en el segundo tiempo (el botón solo aparecía en el primero).
- Nombre del PDF/impresión de cada planilla era siempre "Planilla · Liga F5" — ahora es `<fecha> - <equipo local> vs <equipo visitante>`, para poder buscarlas entre muchas.

**Sync en vivo (público + admin)** (commit `709c6c2`): posiciones, goleadores, fixture y sanciones ahora escuchan cambios en Firestore en tiempo real (`onSnapshot`) en vez de cargar una sola vez — cuando un planillero cierra un partido, se refleja solo en cualquier pantalla ya abierta (pública o admin), sin recargar. Antes hacía falta recargar la página a mano para ver un resultado nuevo. Demostrado en vivo con un partido de prueba: los goleadores se actualizan gol a gol (ni hace falta cerrar el partido), las posiciones recién al cerrar (correcto, para no contar partidos a medio jugar).

**Migración de credenciales** (commit `7d927fc`, ya desplegada — functions + rules + hosting): el hash de contraseña de cada equipo se movió de `equipos/{id}` (público, legible por cualquiera) a `credenciales/{id}` (nunca legible desde el cliente, solo Cloud Functions con Admin SDK). Login, cambio y reseteo de contraseña de equipo ahora pasan por Cloud Functions nuevas (`cambiarPasswordEquipo`, `resetPasswordEquipoServer`). Migración de equipos existentes es idempotente vía botón **"🔒 Migrar credenciales de equipos"** en Admin → pestaña Administradores → tarjeta "Mantenimiento" — **falta correrlo** (un clic, no lo hice yo porque requiere login real de admin).

**Primera División sin zonas** (commit `7d4b82f`): a pedido explícito, Primera pasó de 2 zonas (A/B) a una sola tabla de 12 equipos — top 8 a playoffs, el 12° desciende. Segunda sigue igual, con sus zonas. En el panel admin, división Primera ahora muestra un solo botón "⚙ Generar fixture" (round-robin de toda la división) en vez de los botones por zona.

**Herramienta nueva en admin**: botón "🗑 Borrar partidos" (por zona en Segunda, de toda la división en Primera) para limpiar un fixture sin tener que regenerarlo — junto a los botones de "Generar fixture".

**Pendiente, no lo pude hacer yo (requiere tu login real de admin, las reglas de seguridad correctamente no dejan borrar `equipos` con una sesión anónima):**
1. Borrar los equipos de prueba que quedaron en la base: **ZTEST HALCONES FC, ZTEST LOBOS FC, ZTEST TIGRES FC, ZTEST DRAGONES FC, ZTEST JAGUARES FC, ZTEST AGUILAS FC, ZTEST CONDORES FC, ZTEST PANTERAS FC, DEMO GATOS FC, DEMO PERROS FC** (Admin → Equipos, buscar por nombre). *Ojo: revisar caso por caso, puede haber algún equipo real mezclado en la lista según lo que dijiste.*
2. Correr el botón de migración de credenciales (arriba).
3. Regenerar el fixture real: Primera con el botón único nuevo, Segunda con los botones por zona de siempre. Ahora mismo la colección `partidos` está vacía (se limpió durante la sesión de hoy al aparecer un fixture mezclado con equipos de prueba).

**Hallazgos del audit completo de hoy, no urgentes, quedan para más adelante:**
- Goleadores/sanciones se acumulan sin límite de temporada — si se reusan las mismas divisiones en el próximo torneo sin archivar `partidos`, se van a mezclar con los datos viejos.
- Un puñado de `catch` silenciosos de bajo impacto en `index.html` (fallback de `config/general`, `jsPDF.addImage`) — no rompen nada hoy, pero enmascararían un error real si alguna vez fallan.
