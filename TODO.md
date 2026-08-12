# TODO — Liga F5

> Se actualiza cada sesión para no depender de la memoria del chat.

## ✅ Sesión 2026-08-12 (continuación 3) — semáforo por equipo, fix de montos con puntos, seguro a $8.000 + cierre de inscripción a las 23hs, reset de contraseña más accesible, detección de jugadores duplicados

- **A pedido del usuario**, tanda 3 de "varias funciones":
- **1) Semáforo rojo/amarillo/verde en la lista de equipos (admin)**: reemplaza el punto de "pago aprobado" que había (solo miraba inscripción) por uno que combina inscripción Y seguro. `scoreInscripcionEquipo`/`scoreSeguroEquipo` puntúan cada proceso 0 (nada resuelto) / 0.5 (en curso) / 1 (completo) — verde si los dos están en 1, rojo si los dos están en 0 (a pedido explícito: "si falta alguno rojo"), amarillo en cualquier otra combinación. Tooltip al pasar el mouse explica el detalle de cada uno.
- **2) Fix: montos con puntos de miles se truncaban a la centena.** `Number("200.000")` da `200` (JS interpreta el punto como decimal, no como separador de miles) — así que un equipo que escribía "200.000" quedaba declarado por $200. Los 4 campos de "Monto transferido" (registro inicial, pago seña/saldo, seguro) pasaron de `type="number"` a `type="text" inputmode="numeric"`, y se agregó `parsearMonto()` (saca todo lo que no sea dígito antes de convertir) — ahora "200.000", "200000" o "$200.000" dan siempre 200000. Las correcciones de monto del admin (`editarMontoDeclarado...`) ya usaban este mismo criterio desde antes, así que quedan consistentes.
- **3) El seguro sube a $8.000 y la inscripción de equipos nuevos cierra, ambos a las 23:00 del día configurado como "Fecha límite seguro"** (confirmado con el usuario: es la MISMA fecha ya existente, no una nueva). `MONTO_SEGURO_POR_JUGADOR` pasó de `const` a `let`, recalculado automáticamente: se sincroniza contra la config cada 5 minutos y se re-chequea el reloj cada 30 segundos, así el cambio se aplica solo aunque alguien tenga la app abierta desde antes de las 23hs, sin recargar la página. El alta de equipos nuevos ahora también valida esa misma fecha+hora (además del `fechaLimiteInscripcion` que ya existía por separado, que sigue funcionando igual que antes a las 23:59:59).
- **4) Reset de contraseña más accesible**: ya existía `resetPasswordEquipo()` (con su Cloud Function `resetPasswordEquipoServer`), pero solo se podía usar entrando al panel completo de cada equipo. Se agregó el mismo botón "🔑" directo en cada fila de la lista de equipos, sin tener que entrar. Nota para el usuario: si un equipo también olvidó su USUARIO (no solo la contraseña), el login ya acepta el NOMBRE del equipo como usuario alternativo (está en el código desde antes) — no hace falta nada adicional para ese caso.
- **5) Detección de jugadores duplicados entre equipos**: nueva tarjeta "⚠️ Jugadores duplicados" en la pantalla de elegir división (admin), al lado del buscador global. Recorre TODOS los equipos de las dos divisiones buscando el mismo DNI cargado en más de una lista de buena fe, y lista cada caso con ambos equipos y un botón directo a cada uno. Si no hay ninguno, muestra un aviso verde de que está todo bien.
- **Sin probar en el navegador.**

## ✅ Sesión 2026-08-12 (continuación 2) — deseleccionar seguro pendiente, pestaña Comprobantes del equipo, buscadores en 4 lugares más, buscador global de jugadores

- **A pedido del usuario**, "varias funciones" — tanda 2:
- **1) Destildar un jugador de una tanda de seguro pendiente**: antes, apenas el equipo subía el comprobante, el checkbox quedaba bloqueado hasta que el admin aprobara o rechazara — si se habían marcado jugadores de más por error, no había forma de sacarlos sin esperar al admin. Ahora el checkbox de un jugador "Pendiente" se puede destildar: `quitarJugadorSeguroPendiente(dni, checkboxEl)` lo saca de esa tanda en `segurosTransacciones` (o borra la tanda entera si era el único jugador). Aprobado/Pago tardío/vencido siguen bloqueados, como antes.
- **2) Nueva pestaña "📎 Comprobantes" en el panel del equipo**: antes ningún equipo podía ver ni tocar los comprobantes que había subido — si se equivocaban de imagen, tenían que pedirle al admin que lo arreglara. Ahora tienen su propia lista (inscripción + seguro, con "Ver" y "🗑 Borrar") — el borrado está bloqueado para comprobantes ya **aprobados** (esos quedan fijos, es la prueba de un pago real), pero libre para pendientes/rechazados, así pueden corregir un error y volver a subir el correcto desde "Mi equipo". Sección de arancel como placeholder ("Próximamente"), a la espera de esa función futura. Nuevas funciones: `renderComprobantesPanel()`, `eliminarComprobantePropio(tipo, txId)`, `comprobanteRowEquipo()`. Al borrar el comprobante ACTIVO de una etapa, se limpia también el campo suelto (`pagoComprobante`/`pagoSaldoComprobante`) para que "Mi equipo" muestre el cargador vacío — `pagoEstado`/`pagoSaldoEstado` solo pueden volver a `'pendiente'` del lado del equipo (la regla de Firestore no deja otro valor), que además es el mismo estado con el que arranca cualquier equipo nuevo.
- **3) Buscador por nombre en 4 lugares más** (ya existía uno en la pestaña Seguro del admin, sesión anterior): arriba de "Lista de buena fe" del equipo, arriba de "Seguro médico" del equipo, arriba de la tabla de seguro del panel de cada equipo (admin), y arriba de la sección "Carnets" del panel de cada equipo (admin, es la lista de buena fe con foto). Nuevo helper genérico `filtrarPorNombre(inputEl, filaSelector, textoDeFila)` — OCULTA filas en vez de re-renderizar, para no perder texto que el equipo esté tipeando en la lista editable.
- **4) Buscador global de jugadores para el admin**: nueva caja en la pantalla de elegir división ("🔎 Buscar jugador (toda la liga)") — busca en TODOS los equipos de las DOS divisiones a la vez, sin necesidad de saber de antemano a qué equipo pertenece. División y equipo se muestran directo en el resultado (no hace falta entrar a "Ver equipo" para saberlo, a pedido explícito del usuario). `buscarJugadorGlobalAdmin()`.
- **Sin probar en el navegador.**

## ✅ Sesión 2026-08-12 (continuación 1) — buscador de jugador por nombre en la pestaña Seguro (admin)

- **A pedido del usuario**, primera de "varias funciones" a agregar esta sesión.
- **Nuevo**: caja de búsqueda arriba de "Estado de aseguramiento por equipo" (pestaña Seguro del admin). Al escribir un nombre o apellido, la lista deja de mostrar un resultado por EQUIPO y pasa a mostrar un resultado por JUGADOR de toda la división (sin importar de qué equipo es), con su DNI, equipo, y estado de seguro (Asegurado / Pago tardío / Comprobante pendiente / Falta asegurar) — mismo criterio que ya usa la tabla de roster del panel de cada equipo. Cada resultado tiene un botón "🗂 Ver equipo" directo al panel completo de ese equipo. Sin texto en la búsqueda, se ve la lista por equipo de siempre.
- Nuevo helper reutilizable `normalizarBusqueda()` (minúsculas + sin tildes) para que "jose" encuentre "José" — pensado para reusarse en los próximos buscadores que pidió el usuario.
- **Sin probar en el navegador.**

## ✅ Sesión 2026-08-09 (continuación 3) — último ítem de la auditoría de Planillero: guard contra doble-tap en fin de tiempo/partido

- **Severidad baja, último ítem del ranking de la auditoría.** `finPrimerTiempo()`/`finPartido()` dependían solo del `confirm()` nativo — un doble-tap físico encola un segundo click que se procesa recién al cerrar el primer diálogo, reabriendo otro. En el peor caso (confirmado dos veces por reflejo), `finPrimerTiempo()` podía resetear las faltas del 2° tiempo aunque ya se hubiera cargado alguna en el medio.
- **Fix**: guard `_cambiandoTiempo`, mismo patrón que ya usaba `confirmarAlineacion()` (comentario BUG3) y `abrirPartido()` (BUG4).
- **Con esto se cierran los 6 hallazgos de la auditoría de Planillero de esta sesión** (jugador suspendido sin aviso, sync entre dispositivos, partidos `_sim` bloqueando cancha, reglas de Firestore de `partidos` demasiado abiertas, y este). **Quedan dos cosas que no son código, a cargo del usuario antes de que arranque la temporada**: (1) revisar a mano el panel de admin/Firestore por equipos o partidos de prueba de sesiones anteriores en una "Cancha 9" — no tengo forma de consultar la base en producción sin credenciales de admin, que correctamente no están en el repo; (2) avisarles a los planilleros que no borren/reinstalen la app hasta confirmar que hubo señal después de cerrar una planilla offline, porque "Cerrar planilla" puede confirmar éxito localmente antes de sincronizar con el servidor (comportamiento intencional del modo offline, no un bug).
- **Sin probar en el navegador.** Recomendado antes de que arranque la temporada: correr un partido de prueba real desde `planilla.html`, dos dispositivos si es posible.

## ✅ Sesión 2026-08-09 (continuación 2) — fix: dos celulares en el mismo partido se pisaban en silencio, partidos de prueba podían bloquear una cancha, reglas de partidos endurecidas

- **Bug corregido (severidad alta, siguiente de la auditoría) — sin sincronización entre dispositivos.** `guardarPartido()` en `planilla.html` pisaba TODO el documento del partido (goles, tarjetas, faltas, alineación) con lo que hubiera en memoria local, en cada toque (gol, tarjeta, falta, minuto) — sin fusión ni bloqueo. Si el celular titular se quedaba sin batería y otro retomaba el mismo partido, el que guardaba último borraba en silencio lo que había cargado el otro. La variable `st.unsub` ya existía declarada pero nunca se usaba — quedó a medio construir en algún momento.
- **Fix**: nuevo listener en vivo (`iniciarSyncPartido`, conectado en `irAPartido`) que escucha el documento del partido mientras se juega. Cuando llega un cambio real del servidor (no el eco de la propia escritura — se distingue con `snapshot.metadata.hasPendingWrites`/`fromCache`), se fusiona con `fusionarRemoto()` en vez de descartarse: eventos por unión de `id` (nunca se pierde un gol/tarjeta cargado del otro lado), faltas por el máximo de cada celda, minutos/firmas una vez en `true` quedan en `true`, alineaciones por unión de DNI (una sustitución cargada en el otro celular no desaparece), tiempo de juego el más avanzado gana. Si hubo fusión, se re-renderiza la pantalla y se vuelve a guardar el resultado combinado para que ambos dispositivos converjan. Se agregó el `unsub()` de limpieza en los puntos de salida que faltaban (`cargarLista`, `abrirPartido`, `cerrarPlanilla`).
- **Bug corregido (severidad media) — partidos de prueba (`_sim`) podían bloquear una cancha real.** `cargarLista()` no filtraba los documentos con `_sim:true` (creados por el botón "Crear partido de prueba") de la lista de partidos activos de una cancha — y el sistema solo deja abrir "el próximo partido no cerrado" por cancha, así que uno de prueba mal cerrado bloqueaba el real. Ahora se excluyen explícitamente de `cargarLista()`; el botón de prueba lo sigue pudiendo abrir/reiniciar igual, por fuera de esa lista. **Sigue pendiente revisar a mano el panel de admin/Firestore por si quedaron equipos o partidos de prueba de sesiones anteriores (mencionado en el TODO de 08/01-08/02, sin confirmación posterior de que se haya limpiado).**
- **Endurecido (severidad media-alta) — regla de Firestore de `partidos` demasiado abierta.** Cualquier sesión autenticada (el planillero entra anónimo, sin claim propio) podía reescribir cualquier campo de cualquier partido no cerrado, no solo el que tenía abierto — incluyendo `equipoLocalId`, `cancha`, `division`, etc. Como el planillero no tiene claim propio, no se puede restringir por identidad sin rehacer ese login (cambio grande, no se toca a días de arrancar la temporada) — pero si se pudo acotar qué campos puede tocar una sesión anónima: se agregó `soloCamposPlanilla()` en `firestore.rules`, que bloquea tocar los campos de identidad del fixture (equipos, cancha, división, fecha, horario) desde cualquier sesión que no sea admin. Se deployan reglas + hosting juntos por este cambio.
- **Sin probar en el navegador — en particular la fusión de dos dispositivos no se probó con dos celulares reales.** Recomendado antes de que arranque la temporada: abrir el mismo partido de prueba desde dos celulares (o dos pestañas) y cargar goles/tarjetas alternando entre ambos para confirmar que no se pierde nada.

## ✅ Sesión 2026-08-09 (continuación 1) — auditoría de Planillero + fix: alineación no avisaba jugadores suspendidos

- **A pedido del usuario**, con la temporada por arrancar en pocos días: auditoría completa de `planilla.html` (archivo separado de `index.html`, es su propia PWA) — cómo se accede, el flujo de un partido en vivo, y comparación contra `firestore.rules`. Quedó un ranking de hallazgos por severidad en el chat (no en este archivo, para no duplicar) — el más grave se resuelve acá, los siguientes quedan para continuar esta misma sesión.
- **Bug corregido (severidad alta) — un jugador suspendido por tarjetas podía salir a jugar sin ningún aviso.** La pantalla de armar la alineación (`renderAlineacion` en `planilla.html`) solo bloqueaba por seguro médico pendiente — nunca chequeaba roja directa, doble amarilla o acumulación de 3 amarillas, ese control solo existía en el panel de admin y siempre DESPUÉS del partido.
- **Fix**: nuevas funciones `cargarTarjetasDivision(division)` (cuenta tarjetas de todos los partidos jugados de la división, mismo cálculo que `calcularTarjetasPorJugador` de `index.html`) y `getSancionesActivas(counts, eq)` (mismo cálculo que `getEstadoSanciones` de `index.html` — respeta pagos de $5.000/$7.000 y fechas ya cumplidas cargadas por el admin). Se precarga por división al entrar a una cancha (`cargarLista`) para que quede disponible offline; si no se pudo verificar (sin conexión y sin caché previo), se avisa explícitamente al planillero en vez de asumir que está todo bien. Un jugador suspendido ahora bloquea su selección igual que el seguro médico vencido, mostrando el motivo exacto (roja/doble amarilla/acumulación).
- **Sin probar en el navegador.**

## ✅ Sesión 2026-08-08 (continuación 20) — fix: el PDF de carnets del propio equipo salía sin las fotos recién subidas por el admin

- **Reportado**: rotens (ya destrabado en continuaciones anteriores) quiso imprimir sus carnets y las fotos que el admin borró y volvió a subir por él no le aparecían al delegado — pero al usuario (admin) recién entrar a la cuenta de rotens sí le aparecía el PDF completo.
- **Causa**: `state.equipo.fotosJugadores` se carga UNA sola vez, al iniciar sesión (fix de sesiones anteriores). Si el delegado ya tenía la app/PWA abierta desde antes de que el admin subiera las fotos — muy común en el celular, donde la sesión queda abierta días — su copia en memoria queda vieja para siempre hasta que vuelva a loguearse. `generarCarnetsPDF()`/`generarCarnetIndividual()` (los botones de "Descargar carnet(s) PDF" del lado del equipo) usaban esa copia directamente sin volver a consultarla. El admin, en cambio, al entrar con una sesión nueva a la cuenta de rotens, sí disparaba la recarga de login y veía todo bien — de ahí la diferencia entre lo que veía el admin y lo que veía el delegado.
- **Fix**: ambas funciones ahora son `async` y llaman a `cargarFotosJugadores(state.equipoId, state.equipo.fotosJugadores)` justo antes de armar el PDF — mismo patrón que ya se había aplicado del lado admin (`generarCarnetIndividualAdmin`), ahora también del lado del equipo.
- **Recomendación para el usuario**: si esto vuelve a pasar con otro equipo, la solución inmediata mientras se probaba este fix es pedirle al delegado que cierre sesión y vuelva a entrar (o cierre y reabra la app) antes de descargar el PDF — con este fix ya no debería hacer falta.
- **Sin probar en el navegador.**

## ✅ Sesión 2026-08-08 (continuación 19) — corregir monto de seguro desde la cola de revisión, y fix de caché stale tras corregir un monto

- **Reportado**: "sigue erroneo" el monto de seguros, a pesar de que `editarMontoDeclaradoSeguro` ya existía. Causa real: esa herramienta solo vivía en el panel de equipo (`verDetalleEquipoAdmin`) — la pestaña "Seguro" (la cola de revisión división por división, donde el admin realmente aprueba/rechaza a medida que llegan los comprobantes) no tenía forma de corregir el monto, solo mostraba la cuenta teórica (jugadores × $5.000) sin avisar que no era el monto real confirmado.
- **Nuevo**: botón "✏️ Corregir monto" agregado en cada fila de `renderSegurosAdminList` y en el modal `verComprobanteSeguroAdmin` ("Ver detalle"). Se agregó también un badge "⚠️ Sin monto confirmado" en la fila cuando `tx.montoDeclarado` todavía no existe, para que sea visible de un vistazo cuáles faltan corregir en vez de asumir que la cuenta teórica ya es correcta.
- **Bug de fondo corregido**: `editarMontoDeclaradoInscripcion`/`editarMontoDeclaradoSeguro` reescribían el documento pero solo refrescaban el panel de equipo (que relee directo de Firestore) — nunca `pagosCacheAdmin`/`equiposCacheAdmin`. Resultado: corregías el monto viendo el número actualizado en el panel del equipo, pero la pestaña Seguro/Pagos y "Datos de la Temporada" seguían mostrando el monto viejo hasta recargar la página entera — esto es, con altísima probabilidad, la causa real de "sigue erroneo". Ahora ambas funciones llaman a `cargarPagosAdmin()` + `cargarEquiposAdmin()` (que ya re-renderizan todas las listas dependientes), y devuelven una promesa — los dos call sites dentro del panel de equipo encadenan `.then(()=>verDetalleEquipoAdmin(id))` para seguir refrescando el panel abierto también.
- **Sin probar en el navegador.**

## ✅ Sesión 2026-08-08 (continuación 18) — Aprobar/Rechazar directo en el panel de cada equipo

- **A pedido del usuario** ("me sacaste la función de aprobar los comprobantes de los seguros"): no era una función borrada — las cuatro ubicaciones (`renderPagosAdminList`, `verComprobanteAdmin`, `renderSegurosAdminList`, `verComprobanteSeguroAdmin`) seguían intactas. El gap real era que el panel consolidado de equipo (`verDetalleEquipoAdmin`, la pantalla completa a la que ahora se manda casi todo el tráfico de admin) nunca tuvo estos botones en sus propias filas de comprobante.
- **Fix**: `comprobanteRow` ahora acepta `aprobarOnclick`/`rechazarOnclick` opcionales y muestra "✓ Aprobar"/"✕ Rechazar" solo cuando `f.estado === 'pendiente'`. Se conectó en ambos call sites (comprobantes de inscripción → `aprobarPago`/`rechazarPago`; comprobantes de seguro → `aprobarSeguro`/`rechazarSeguro`), encadenado con `.then(() => verDetalleEquipoAdmin(id))` para refrescar el panel abierto sin tener que volver a entrar. `verDetalleEquipoAdmin` relee directo de Firestore (no de caché), así que el refresco siempre muestra el estado recién escrito.
- **Sin probar en el navegador.**

## ✅ Sesión 2026-08-08 (continuación 17) — fix urgente a la migración: compatibilidad con fotos viejas

- **Encontrado antes de que impactara**: la migración de la continuación 16, tal cual quedó, iba a hacer que **todas las fotos de carnet ya subidas por cualquier equipo desaparecieran** apenas se desplegó — el código dejó de leer el campo viejo `fotosJugadores` del documento, y la subcolección nueva arranca vacía para todo el mundo. Un regresión mucho peor que el problema que se estaba arreglando.
- **Fix**: `cargarFotosJugadores(equipoId, fotosViejas)` ahora arranca con el mapa viejo como base y lo pisa con lo que haya en la subcolección — las fotos de antes de la migración se siguen viendo con normalidad. Los 4 lugares que la llaman le pasan el campo viejo si existe.
- **Además**: subir o borrar una foto ahora también limpia esa misma clave del campo viejo embebido (`limpiarFotoViejaEmbebida`) — si no, el botón "🗑 Borrar" de un equipo que todavía tiene sus fotos viejas (como rotens, ahora mismo) no liberaba nada de espacio real, porque solo tocaba la subcolección (vacía) y la copia grande seguía intacta en el documento.
- **Sin probar en el navegador.**

## ✅ Sesión 2026-08-08 (continuación 16) — fix de fondo: fotos de carnet migradas a subcolección

- **A pedido explícito** (el usuario no quería seguir con borrado manual como única solución, y pidió prevenir el mismo problema para equipos con más jugadores en su lista) — se migraron las **fotos de carnet** de un campo `fotosJugadores` embebido en el documento del equipo a una subcolección `equipos/{id}/fotos/{dni}`, un documento por jugador. Cada foto tiene ahora su propio límite de 1MB para ella sola — el tamaño de la lista de buena fe ya no puede, por sí sola, empujar a un equipo contra el límite del documento.
- **Por qué solo fotos y no también comprobantes de pago/seguro todavía**: fotos escala directo con la cantidad de JUGADORES (hasta 25 por equipo, exactamente el riesgo que el usuario señaló — "rotens no llegó a los 25, llegó a los 22, a los que pasen esto les puede volver a pasar"). Comprobantes de pago/seguro escalan con cantidad de PAGOS, generalmente mucho menor, y están mucho más acoplados a la lógica de aprobación que se construyó esta sesión — mezclar esa migración con la de fotos en la misma pasada, sin poder probar en el navegador, era más riesgo del necesario. Queda pendiente como una migración aparte si se repite el problema del lado de comprobantes.
- **Cambios**: nueva regla de Firestore (`equipos/{id}/fotos/{dni}`, mismo criterio de permisos que el documento padre), nuevo helper `cargarFotosJugadores(equipoId)` que trae la subcolección y la mergea en memoria como `eq.fotosJugadores` (mismo formato de siempre, para no tocar el resto del código que ya lo lee). Se actualizaron los 3 puntos de escritura (equipo, admin subir, admin borrar), los 2 puntos de inicio de sesión del equipo (login + restauración de sesión), el panel de equipo del admin (que además ahora mide el tamaño del documento sobre los datos crudos, sin las fotos ya mergeadas, para no mostrar un tamaño falso), `generarCarnetIndividualAdmin` (buscaba el equipo en una caché que nunca tuvo fotos), y `eliminarEquipo` (para no dejar fotos huérfanas al borrar un equipo).
- **Se deployan reglas de Firestore además del hosting** (`firebase deploy` sin `--only`, o `--only firestore:rules,hosting`) — antes solo se deployaba hosting porque no se habían tocado las reglas en toda la sesión.
- **Sin probar en el navegador** — revisado exhaustivamente por lectura de código (inventario completo de cada lugar que toca `fotosJugadores` antes de tocar nada), pero es una migración de datos real y no hay forma de confirmar que funciona sin que alguien lo prueble en producción.

## ✅ Sesión 2026-08-08 (continuación 15) — CONFIRMADO: límite de 1MB de Firestore, con indicador visible

- **Confirmado en producción**: el usuario probó con las credenciales reales de "rotens" y le apareció el mensaje nuevo tal cual — "Este equipo ya no tiene espacio para guardar más comprobantes/fotos (llegó al límite de tamaño)". La hipótesis del límite de 1MB por documento (sesiones anteriores) queda 100% confirmada, ya no es una suposición.
- **Nuevo — visibilidad del tamaño, no solo el error cuando ya pasó**:
  - Barra de tamaño ("📦 Tamaño del documento: X KB / 1024 KB", con color verde/amarillo/rojo según % del límite) arriba de todo en el panel de cada equipo, con aviso explícito si está ≥70%.
  - Punto de color (amarillo ≥70%, rojo ≥90%) junto a cada fila en la lista de "Equipos" por división, para detectar equipos en riesgo ANTES de que se traben, sin tener que entrar a cada uno.
  - Aproximación vía `new Blob([JSON.stringify(eq)]).size` — no es byte-exacto contra la codificación interna de Firestore, pero como el documento es en su enorme mayoría strings base64 (puro ASCII), es una aproximación muy cercana.
- **Pendiente para el usuario, ahora mismo**: en el panel de "rotens", borrar algunas fotos de carnet o comprobantes viejos (botones 🗑 ya construidos en sesiones anteriores) hasta bajar del ~90%, y que el equipo reintente subir.
- **Pendiente de fondo, no resuelto esta sesión** (se le explicó el riesgo al usuario y decidió no hacerlo ahora): migrar el almacenamiento de imágenes de comprobantes/fotos de "incrustado en el documento de Firestore" a Firebase Storage, que no tiene este límite. Es el fix real y definitivo — hasta que se haga, cualquier equipo activo puede volver a toparse con este límite.
- **Sin probar en el navegador de mi lado** (el usuario sí probó en producción con la cuenta real del equipo).

## ✅ Sesión 2026-08-08 (continuación 14) — admin puede subir/borrar foto de carnet + fix real del detector de "documento lleno"

- **Bug encontrado en mi propio fix de la sesión anterior**: el chequeo de "documento de Firestore lleno" comparaba `err.code === 'resource-exhausted'`, pero ese código es para límites de cuota/velocidad — la validación de tamaño máximo (1 MB) es del lado del cliente, tira un `Error` sin ese código, con el tamaño en bytes mencionado en `.message`. Por eso, aunque "rotens" probablemente SÍ está chocando con el límite de tamaño (falla tanto la foto de carnet como el comprobante de seguro — dos subidas de imagen distintas, mismo síntoma genérico), mi mensaje específico nunca se disparaba. Ahora se detecta por contenido del mensaje ("longer than", "exceeds the maximum", etc.), no por código.
- **Nuevo**: el admin puede subir la foto de un jugador (`adminSubirFotoJugador`, mismo fix de dot-notation atómico que ya tenía la versión del equipo) y borrar la foto de un jugador puntual (`adminBorrarFotoJugador`, con `FieldValue.delete()`) desde la sección "🪪 Carnets" del panel de equipo — para poder liberar espacio en un equipo que ya llegó al límite, sin depender de que el equipo lo resuelva desde su lado (que es justo lo que no puede hacer ahora mismo).
- **Se descartó la hipótesis del navegador integrado de WhatsApp** — el usuario confirmó que no es eso.
- **Pendiente**: que el usuario borre algunas fotos/comprobantes viejos de "rotens" con las herramientas nuevas para liberar espacio, y que el equipo reintente subir — el mensaje de error debería confirmar ahora si el problema era realmente el tamaño del documento.
- **Sin probar en el navegador.**

## ✅ Sesión 2026-08-08 (continuación 13) — admin puede generar carnets + sección de carnets en el panel de equipo

- **Nuevo**: `abrirVentanaCarnets` (y sus dos wrappers, individual y de todo el plantel) ahora aceptan el equipo como parámetro en vez de depender siempre de `state.equipo` (la sesión del propio equipo). Nuevas funciones `generarCarnetsPDFAdmin(eq)` / `generarCarnetIndividualAdmin(equipoId, dni)` para que el admin pueda generar el carnet de cualquier equipo sin depender de que el equipo lo resuelva solo.
- **Nueva sección "🪪 Carnets"** en el panel de equipo (Admin → equipo): contador "X/Y con foto cargada", botón "⬇ Descargar todos los carnets", y una fila por jugador con su foto (o placeholder "4×4" si falta), DNI, edad, badge "Con foto"/"Sin foto", y botón "🖨️ Ver carnet" individual (deshabilitado si falta DNI o edad, igual que exige la generación real del carnet).
- **Sin probar en el navegador.**

## ✅ Sesión 2026-08-08 (continuación 12) — fix: foto de carnet perdida por condición de carrera + mejores mensajes de error

- **Bug real en `subirFotoJugador`**: guardaba TODO el mapa `fotosJugadores` con lee-modifica-escribe local (`fotos[dni]=...; update({fotosJugadores: fotos})`). Si un delegado subía varias fotos de jugadores seguidas (caso típico armando los carnets de todo el plantel), dos subidas que terminan en momentos distintos podían pisarse entre sí — la última en escribir ganaba con SU copia del mapa (basada en el estado de cuando arrancó, no en lo que la otra subida ya había guardado), perdiendo fotos ya subidas sin ningún error visible. Coincide con el reporte de "rotens": la foto se sube (toast de éxito) pero no aparece en el carnet descargado.
- **Fix**: `subirFotoJugador` ahora actualiza un solo campo con notación de punto (`fotosJugadores.${dni}`), que Firestore mergea de forma atómica sin pisar el resto del mapa — elimina la carrera de raíz. También se agregó un fallback visual (`onerror`) en la foto del carnet por si la imagen de un jugador puntual estuviera corrupta.
- **Mensajes de error de Firestore más específicos**: `mensajeErrorComprobante` ahora distingue "documento lleno" (`resource-exhausted`), "sin permiso", y "sin conexión" del error genérico — antes cualquier causa mostraba el mismo "No se pudo cargar el comprobante" sin pista de qué hacer. Esto se aplica a los 4 lugares de comprobantes Y a la subida de foto de carnet.
- **Seguro médico de "rotens" sigue sin poder subirse** y no tengo más info todavía — con este mensaje más específico, el próximo intento debería decir la causa real (documento lleno / sin conexión / etc.) en vez del mensaje genérico; hace falta que el usuario reporte qué dice ese mensaje la próxima vez.
- **Sin probar en el navegador.**

## ✅ Sesión 2026-08-08 (continuación 11) — anillos de cobertura de seguro (sin objetivo en $)

- A pedido: 3 anillos más en "📊 Datos de la Temporada" (Primera/Segunda/Total) para seguros — sin objetivo en $ como pidió el usuario ("no se puede saber de antemano cuánto va a dar"). El techo de cada anillo es **% del plantel asegurado** (asegurados + habilitados manual, sobre el total de la lista de buena fe de esa división) — un techo natural que sí existe (100% = todos asegurados), a diferencia de la plata que no tiene límite conocido. Debajo del % se muestra "X/Y asegurados" y "$ recaudado" como dato informativo.
- Se generalizó el helper `anillo` en `anilloBase` (pct + subtítulo genérico) para poder reusar el mismo componente visual en ambos casos (objetivo en $ vs. % de cobertura) sin duplicar el SVG.
- Confirmado con el usuario que la corrección de monto declarado (sesión anterior) ya hace que estos anillos —y todo lo demás— se actualicen solos, sin pasos extra.
- Probado visualmente con datos de ejemplo en Chrome headless antes de deployar — se ve bien.

## ✅ Sesión 2026-08-08 (continuación 10) — mensaje de error específico para fotos formato HEIC (iPhone)

- El usuario aclaró que "rotens" no tiene NINGÚN comprobante subido todavía (0 previos) e iba a subir uno solo cubriendo a todo el plantel — descarta la hipótesis del límite de 1MB de la entrada anterior para este caso puntual.
- Causa más probable con 0 comprobantes previos: el navegador no puede decodificar la imagen elegida — típicamente una **foto sacada directo con la cámara de un iPhone**, que por default guarda en formato HEIC (Chrome no lo puede abrir vía `<img>`/canvas). Antes, esto cae en el mismo mensaje genérico "No se pudo cargar el comprobante" sin ninguna pista.
- **Fix**: `resizeImageFile` ahora distingue el error de decodificación de imagen del resto de errores, y los 4 lugares donde se sube un comprobante (registro, pago, saldo, seguro) muestran un mensaje específico sugiriendo sacarle una captura de pantalla a la foto en vez de subir la foto original cuando ese es el problema.
- **Sin probar en el navegador** — no hay forma de confirmar que HEIC sea la causa real sin que el equipo (o el usuario) reintente y vea el mensaje nuevo.

## ✅ Sesión 2026-08-08 (continuación 9) — equipo sin poder subir comprobante: límite de 1MB por documento

- **Diagnóstico**: equipo "rotens" no podía subir comprobante de seguro, error genérico "No se pudo cargar el comprobante". Causa más probable: cada equipo es UN documento de Firestore con límite duro de **1 MB**, y ahí adentro se guardan (como base64, sin usar Storage) el escudo + comprobante de inscripción + saldo + TODO el historial de comprobantes de seguro con imagen incluida. Un equipo que mandó muchos comprobantes sueltos (uno por jugador) puede llegar al límite y quedar sin poder guardar ninguno más.
- **Fix preventivo**: se bajó el tamaño máximo de las fotos de comprobante de 1100px/900KB a **900px/350KB** en los 4 lugares donde se suben (registro, pago principal, saldo, seguro) — deja mucho más margen para que un equipo pueda seguir subiendo antes de llegar al límite.
- **Herramienta para destrabar equipos ya al límite**: botón "🗑 Borrar" en cada comprobante del historial (inscripción y seguro) del panel de equipo, para liberar espacio borrando copias viejas o duplicadas. Si la tanda borrada estaba aprobada, los jugadores que cubría vuelven a figurar como no asegurados (avisa antes de borrar).
- **No confirmado con datos reales** — no tengo forma de ver el tamaño del documento de "rotens" en Firestore; esto es la explicación más consistente con el código y el síntoma reportado, pero valdría la pena chequear el tamaño real del documento en la consola de Firebase si el problema persiste.
- **Sin probar en el navegador.**

## ✅ Sesión 2026-08-08 (continuación 8) — corregir a mano un monto declarado mal tipeado

- **No era un bug**: el "$90" de ARCANGEL F.C. resultó ser un dato real — alguien declaró literalmente "90" al subir el comprobante el 6/8/2026 (probablemente le faltaron ceros). El código mostraba fielmente lo que hay guardado; no había forma de detectar esto automáticamente sin comparar contra la imagen.
- **Nuevo**: botón "✏️ Corregir monto" en cada fila de comprobante (inscripción y seguro) del panel de equipo — abre un `prompt()` para escribir el monto correcto después de mirar la foto, y lo guarda tanto en el campo actual (`pagoMontoDeclarado`/`pagoSaldoMontoDeclarado`/`montoDeclarado` de la tanda) como en la entrada correspondiente del historial, para que quede consistente en todos lados que lean ese dato.
- Aclaración para el usuario: los valores de Configuración (monto inscripción, objetivos, etc.) SIEMPRE se leen en vivo desde la base en cada cálculo — no hay caché ni copias que puedan quedar desactualizadas cuando se cambian ahí. El "$90" no tenía relación con eso.
- **Sin probar en el navegador.**

## ✅ Sesión 2026-08-08 (continuación 7) — fix: seguros sumaba $0 por cada tanda anterior al 31/07

- **Bug**: 10 jugadores asegurados a $5.000 c/u debería dar $50.000, pero "Recaudado" mostraba $45.000. Misma causa raíz que el "$90" de inscripción: el campo `montoDeclarado` se agregó el 31/07/2026 **en el mismo commit** para inscripción Y seguro — cualquier tanda de seguro aprobada antes de esa fecha no tiene ese campo, y `calcularIngresoSeguroNormal` la sumaba como `$0` en vez de estimarla.
- **Fix**: mismo criterio que inscripción — si `montoDeclarado` no existe en una tanda aprobada, se usa `cantidad de jugadores × $5.000` como estimación en vez de $0. Afecta a todos los lugares que ya calculaban esto (`calcularIngresoSeguro` es la función común): "Datos de la Temporada", los 2 PDF de informes, y el panel de equipo. También se corrigió la fila de cada comprobante de seguro en el panel de equipo, que **siempre** mostraba el monto teórico en vez del declarado real (aunque existiera) — ahora muestra el real cuando hay, y marca "· estimado" cuando no.
- Nuevo aviso ⚠️ en el panel de equipo si alguna tanda de ese equipo es de las viejas sin monto declarado.
- **Sin probar en el navegador.**

## ✅ Sesión 2026-08-08 (continuación 6) — fix: no se podía abrir la imagen del comprobante

- **Bug**: al tocar la miniatura de un comprobante en el panel de equipo, no pasaba nada. Causa: `window.open()` con una URL `data:` (que es como se guardan las imágenes, sin Storage) está bloqueado silenciosamente por Chrome desde hace varias versiones (política anti-phishing) — no tira error, simplemente no abre nada.
- **Fix**: nueva función `verImagenGrande(dataUrl)` que abre un modal con la imagen a tamaño completo + botón de descarga, mismo patrón que ya usaban `verComprobanteAdmin`/`verComprobanteSeguroAdmin` en otras partes de la app. Reemplaza el `window.open()` roto en las miniaturas del panel de equipo.
- **Sin probar en el navegador.**

## ✅ Sesión 2026-08-08 (continuación 5) — panel de equipo a pantalla completa + fix del "$90"

- **Pantalla completa, no modal**: a pedido explícito ("no quiero una ventanita"), `verDetalleEquipoAdmin` dejó de usar `openModal()` — ahora es una pantalla nueva (`#equipo-detalle-admin`) dentro del flujo normal: Torneo Clausura → división → lista de equipos → tocás un equipo → pantalla completa con todo (botón "← Volver a Equipos" arriba). Mismo contenido que el panel unificado de la iteración anterior (inscripción + seguro + roster verde/rojo), solo que ahora ocupa toda la pantalla en vez de un recuadro de 520px.
- **Bug real encontrado y corregido — el "$90 Aprobado" con "0 comprobantes"**: `pagoComprobantesHistorial` (el array nuevo) solo tiene entradas de subidas hechas DESPUÉS de que se agregó ese historial. Un equipo aprobado antes de eso (o cargado a mano por el admin con "+ Nuevo equipo", que arranca `pagoEstado:'aprobado'` sin comprobante) tenía su único comprobante viviendo solo en los campos sueltos `pagoComprobante`/`pagoSaldoComprobante` — el panel los ignoraba y por eso decía "0 comprobantes" mientras "Aprobado" mostraba un monto de otro lado. Fix: si esos campos sueltos existen y no están ya representados en el historial, se agregan como una entrada más (con su imagen real, si la tiene). Si un equipo figura aprobado y NO tiene comprobante en ningún lado (ninguna imagen), ahora se avisa explícito en rojo en vez de mostrar el monto mudo — probablemente sea un equipo cargado a mano por el admin, no una imagen real con el número mal.
- **Sin probar en el navegador** — no se logró acceso de admin en vivo esta sesión.

## ✅ Sesión 2026-08-08 (continuación 4) — panel único por equipo (inscripción + seguro juntos)

- **Motivo**: quejas de "todo disperso" — antes había 3 lugares distintos para ver datos de un mismo equipo (detalle del equipo, "🗂 Historial", "Ver jugadores" del seguro), cada uno con parte de la info.
- **Fix**: `verDetalleEquipoAdmin` (se abre tocando cualquier equipo, desde Equipos/Inscripciones/Seguro — todos los botones "🗂 Ver todo" y "Ver jugadores" ahora abren esto mismo) es ahora el panel único con:
  - **Inscripción**: cantidad de comprobantes + monto declarado total, resumen requerido/aprobado/falta, y la lista de cada comprobante con imagen.
  - **Seguro médico**: resumen cubiertos/recaudado/falta, tabla de TODA la lista de buena fe con la fila sombreada verde (asegurado) o roja (falta asegurar) — amarillo si tiene un comprobante pendiente de aprobar — y la lista de cada comprobante de seguro con imagen. El botón "Habilitar $7.000" (pago tardío) sigue ahí, en la fila del jugador vencido.
- Se borraron las funciones viejas (`verHistorialComprobantes`, `verDetalleSeguroEquipo`) que quedaron redundantes — ya no hay 3 lugares, hay 1.
- **Hallazgo de la sesión, no arreglado por mí (dato mal cargado, no bug)**: `montoInscripcionSegunda` en Configuración estaba guardado como `150` en vez de `150000` — el usuario ya lo corrigió a mano. Si el número de seguros sigue sin cerrar contra el banco, lo más probable es que haya comprobantes de seguro pendientes de aprobar (equipos que mandaron un comprobante por jugador en vez de agrupados) — no confirmado todavía, pendiente de que el usuario revise el filtro "Pendientes".
- **Sin probar en el navegador** — no se pudo lograr acceso de admin en vivo esta sesión (múltiples intentos fallidos de sincronizar la pestaña automatizada con la del usuario). Revisado por lectura de código y chequeo de sintaxis.

## ✅ Sesión 2026-08-08 (continuación 3) — objetivo de inscripciones: monto directo, no cupo × precio

- **Cambio de enfoque**: el objetivo dejó de calcularse como `cupo de equipos × monto de inscripción` (indirecto, generaba confusión y números que no cerraban) y ahora es un **monto fijo por división**, cargado directo en Admin → Configuración: "Objetivo de inscripciones Primera ($)" / "...Segunda ($)". Reemplaza los campos "Cupo de equipos" de la sesión anterior.
- **Confirmado con el usuario**: Primera $2.400.000, Segunda $3.300.000, total $5.700.000 (el usuario había escrito "$2.300.000" para Primera por error de tipeo — no cerraba con el total de $5.700.000 que pidió ni con el cálculo de 12 equipos × $200.000 de una sesión anterior; se le preguntó y confirmó $2.400.000).
- Esos dos valores son el default en código (`objetivoInscripcionPrimera || 2400000`, `...Segunda || 3300000`) si el campo de Configuración está vacío, así que los 3 anillos ("📊 Datos de la Temporada") muestran el objetivo correcto aunque nadie haya tocado Configuración todavía. Se pueden pisar ahí si cambia la temporada que viene.
- **Sin probar en el navegador.**

## ✅ Sesión 2026-08-08 (continuación 2) — botón "Historial" también visible desde la pestaña Seguro

- El botón "🗂 Historial" (agregado en una sesión anterior) solo estaba en la pestaña **Inscripciones**, aunque el modal que abre ya mezclaba ahí mismo los comprobantes de inscripción Y de seguro médico. El usuario no lo encontraba buscando desde la pestaña **Seguro**.
- Se agregó el mismo botón en dos lugares de la pestaña Seguro: en "Estado de aseguramiento por equipo" (arriba) y en cada fila de tanda de seguro (pendiente/aprobado/rechazado, abajo) — mismo modal, mismo comportamiento, ahora accesible desde donde el admin naturalmente esté mirando.
- **Sin probar en el navegador.**

## ✅ Sesión 2026-08-08 (continuación) — editar nombre de equipo desde admin

- **Nuevo**: botón "✏️ Cambiar nombre" en el detalle de equipo (Admin → Equipos → tocar un equipo). Valida que no exista otro equipo con ese nombre, y actualiza `nombre`/`nombreLower` en `equipos/{id}`.
- **Importante**: el fixture guarda una COPIA del nombre en cada partido (`equipoLocalNombre`/`equipoVisitanteNombre`), no una referencia al equipo — así que renombrar también actualiza esos campos en todos los partidos donde ese equipo ya jugó o tiene fecha generada, para no dejar el nombre viejo dando vueltas en fixture/posiciones/planillas. El historial de mensajes (`mensajes`) NO se toca — queda con el nombre con el que se mandó cada mensaje en su momento, como cualquier chat.
- **Pendiente, requiere que lo hagas vos**: cambiar **AURA → FONTANA F.C.** — no tengo credenciales de admin ni acceso a la base real, así que no puedo hacerlo yo directamente. Usá el botón nuevo.
- **Sin probar en el navegador.**

## ✅ Sesión 2026-08-08 — anillos circulares de objetivo + default de cupo 12/22

- **Motivo del ajuste**: el objetivo mostraba mal (o en $0) porque el cupo de equipos (`cfg.cupoEquiposPrimera/Segunda`) todavía no estaba cargado en Admin → Configuración. Ahora tiene default **12 (Primera) / 22 (Segunda)** si el campo está vacío — confirmados por el usuario como el cupo real ya cerrado — así que el objetivo (Primera $2.400.000 / Segunda $3.300.000 / Total $5.700.000) se ve bien apenas `montoInscripcionPrimera`/`montoInscripcionSegunda` estén en 200.000/150.000. Sigue siendo editable desde Config por si el cupo cambia.
- **"📊 Datos de la Temporada"**: las barras lineales de objetivo se reemplazaron por 3 medidores circulares (Primera / Segunda / Total) — arco relleno del mismo tono que el track, no un pie chart de 2 porciones (se consultó la skill de dataviz: para "ratio contra un límite" el pie de 2 porciones es explícitamente lo que NO usar; el medidor circular con track+arco es la variante que sí respeta esa guía y a la vez es lo que pidió el usuario). Probado con datos de prueba en Chrome headless antes de avisar — captura verificada visualmente.
- **Sigo sin poder confirmar**: si `montoInscripcionPrimera`/`montoInscripcionSegunda` realmente están en 200.000/150.000 en la base real — eso sigue siendo algo que solo se puede chequear con sesión de admin real.

## ✅ Sesión 2026-08-07 (continuación 4) — fix: equipos aprobados antes del 31/07 sin "monto declarado"

- **Confirmado con `git log`**: el sitio quedó en producción el 25/07/2026 (`fa43d86`) y el campo "monto declarado" recién se agregó el 31/07/2026 (`0ad56b9`). Cualquier equipo que subió su comprobante en esa ventana de 6 días quedó aprobado con `pagoMontoDeclarado`/`pagoSaldoMontoDeclarado` inexistente (no en `$0` — el campo directamente no existía todavía).
- Como `calcularIngresoInscripcion` suma ese campo, esos equipos se estaban contando como **$0** de ingreso pese a estar aprobados — subestimaba el total real. **No puedo saber cuántos son ni cuáles** sin acceso a la base en vivo.
- **Fix**: para un equipo aprobado sin monto declarado, se usa como respaldo el monto teórico configurado (mitad/mitad si es seña) — mejor estimación que $0, pero sigue siendo una estimación, no lo que dice el comprobante real.
- Se marcan en 3 lugares para que sea fácil encontrarlos y corregirlos a mano: badge **"⚠️ Monto estimado"** en cada equipo de la pestaña Inscripciones, aviso amarillo dentro del modal "🗂 Historial" de ese equipo, y un cartel con el conteo total arriba de "📊 Datos de la Temporada" si hay alguno.
- **Sin probar en el navegador**, igual que el resto de la sesión.

## ✅ Sesión 2026-08-07 (continuación 3) — objetivo de inscripciones + contador de jugadores

- **Nuevo en Admin → Configuración**: "Cupo de equipos Primera/Segunda" (ej. 12 y 22 — el cupo ya está cerrado, faltan que terminen de inscribirse). Guardado en `config/general.cupoEquiposPrimera/Segunda`. **Falta que lo cargues vos** — sin esto, la tarjeta de inscripciones no muestra objetivo, solo el monto acumulado.
- **"📊 Datos de la Temporada"**: la tarjeta de Mariano Gauna (inscripciones) ahora tiene barra de progreso por división contra el objetivo = cupo × monto configurado (ej. 12×$200.000 = $2.400.000 en Primera), con "falta $X (Y%)" o "✅ Objetivo cumplido". La de Facundo Palacio (seguros) sigue sin objetivo fijo, solo acumulando — no hay forma de saber de antemano cuánto va a dar porque depende de cuántos jugadores se terminen asegurando.
- Se agregó contador de **jugadores en lista de buena fe** (Primera / Segunda / Total), separado de la cantidad de equipos.
- **Aclaración importante sobre los montos que se ven**: no se sacan de mirar la imagen del comprobante — vienen de `pagoMontoDeclarado`/`montoDeclarado`, el número que el propio equipo tipeó al subir el comprobante. Nadie (ni el código, ni yo) lee el monto de la foto automáticamente; el admin es quien tiene que cotejar visualmente la imagen contra ese número declarado antes de aprobar. Si un equipo declaró mal el monto y el admin lo aprobó igual, ese error se arrastra a estos totales.
- **Sin probar en el navegador** todavía por mí (no tengo credenciales de admin), pero el usuario está probando en local (`node static-server.mjs`, puerto 8080) contra la base de datos real.

## ✅ Sesión 2026-08-07 (continuación 2) — rediseño "Datos de la Temporada": por cobrador, no por lista plana

- A pedido explícito (no gustaba el listado plano de filas): la tarjeta "📊 Datos de la Temporada" ahora tiene 4 chips arriba (equipos 1ª/2ª, pago OK, asegurados) y dos tarjetas de "cobro" con acento de color — **Mariano Gauna** (Inscripciones, Primera + Segunda + subtotal) y **Facundo Palacio** (Seguros, ídem) — más un total general destacado abajo. Se sacó la tabla de desglose por concepto (seña/saldo/tardío) que se había agregado en la sesión anterior: no era lo que pedían y sumaba desorden — ese detalle línea por línea sigue disponible en el PDF ("📄 Descargar informe detallado").
- **Por qué "Mariano Gauna" / "Facundo Palacio"**: el usuario aclaró que las inscripciones se le pasan en mano a Mariano Gauna y los seguros a Facundo Palacio — necesitaba ver cuánto se va juntando para cada uno por separado, no solo el total. Si en algún momento cambia quién cobra qué, esos dos nombres están hardcodeados en `abrirModalDatosTemporada()`.

## ✅ Sesión 2026-08-07 (continuación) — fix: los ingresos usaban el monto teórico, no el declarado

- **Bug**: `calcularIngresoInscripcion`/`calcularIngresoSeguro` (y sus versiones "por concepto") calculaban la plata que entró a partir del monto configurado (`montoInscripcionPrimera/Segunda` dividido a la mitad, o jugadores asegurados × $5.000 fijo) — no de lo que el equipo realmente declaró en su comprobante. Si un equipo transfirió de más, de menos, o en un split distinto al 50/50, el reporte mostraba el número "teórico" en vez del real.
- **Fix**: ahora suman `pagoMontoDeclarado` / `pagoSaldoMontoDeclarado` (inscripción) y el `montoDeclarado` de cada tanda aprobada en `segurosTransacciones` (seguro médico) — la plata que dice el comprobante, sumada tal cual. Afecta: "📊 Datos de la Temporada" (totales y tabla por concepto), el PDF "Informe financiero", y el badge "Falta cancelar $X" / modal de historial de comprobantes de la sesión anterior.
- El monto configurado (`montoInscripcionPrimera/Segunda`) se sigue usando SOLO como referencia de "cuánto debería pagar" (columna "Requerido"), nunca para calcular lo que ya entró.
- **Sin probar en el navegador**, igual que las dos sesiones anteriores.

## ✅ Sesión 2026-08-07 — ingresos por concepto + estado de aseguramiento por equipo (en vivo)

- **Admin → Torneo → división → Seguro**: nueva sección arriba de todo, "Estado de aseguramiento por equipo" — por cada equipo muestra cuántos jugadores de su lista de buena fe ya están cubiertos (asegurados + habilitados manual) vs cuántos faltan, y cuánto dinero falta pagar (faltantes × $5.000). Botón "Ver jugadores" abre el detalle con nombre y DNI en 3 grupos: asegurados, habilitados manualmente, y faltantes.
- **Admin → Torneo → "📊 Datos de la Temporada"**: se agregó una tabla de ingresos por concepto (inscripción pago total / seña / saldo, seguro normal / habilitación tardía) cruzada por división, además de los totales que ya existían.
- **Sincronización en vivo de datos de equipos**: hasta ahora `equiposCacheAdmin`/`pagosCacheAdmin` solo se refrescaban cuando el admin hacía una acción propia (aprobar, rechazar, etc.). Como los equipos pueden seguir editando su lista de buena fe hasta el **12/08**, se agregó una suscripción `onSnapshot` (`iniciarSyncEquiposAdmin`, arranca al loguearse el admin) que mantiene esas vistas al día automáticamente aunque el cambio lo haga el equipo desde su propio panel, sin que el admin tenga que recargar nada.
- **Sin probar en el navegador** — mismo motivo que la sesión anterior (necesita sesión real de equipo + admin). Revisado por lectura de código y chequeo de sintaxis de todo el JS embebido.

## ✅ Sesión 2026-08-06 — historial de comprobantes de pago + saldo pendiente por equipo

- **Problema**: al aprobar un pago (inscripción o saldo), el comprobante de esa etapa quedaba "pisado" apenas se subía uno nuevo (el campo `pagoComprobante`/`pagoSaldoComprobante` es único, no un historial) — no había forma de volver a revisar comprobantes viejos.
- **Solución**: nuevo array `pagoComprobantesHistorial` en cada equipo (mismo patrón que ya usaba `segurosTransacciones` para el seguro médico). Cada vez que un equipo sube un comprobante (inscripción inicial, re-subida, saldo) se agrega una entrada nueva sin borrar las anteriores; al aprobar/rechazar desde el admin, se marca la entrada correspondiente en vez de perderla.
- **Admin → Pagos**: botón nuevo "🗂 Historial" por equipo que abre un modal con **todos** los comprobantes cargados alguna vez (inscripción y seguro médico juntos, distintas "índoles"), con imagen, monto declarado, fecha y estado de cada uno.
- **Saldo pendiente por equipo**: badge "Falta cancelar $X" / "Sin saldo pendiente" en cada fila de la lista de Pagos, calculado contra el monto total de inscripción configurado por división (`config/general.montoInscripcionPrimera/Segunda` — confirmar que estén en $200.000 / $150.000).
- No requirió cambios en `firestore.rules`: el equipo ya podía escribir cualquier campo propio salvo la lista puntual de campos de admin, y `pagoComprobantesHistorial` no está en esa lista (mismo criterio que `segurosTransacciones`, ya en producción).
- **Sin probar en el navegador** (requiere sesión real de equipo + admin para subir y aprobar un comprobante de punta a punta) — revisado por lectura de código y chequeo de sintaxis, no en vivo.

## ✅ Sesión 2026-08-02 (continuación) — bloqueo de partidos cerrados, orden por cancha, historial de PDFs

- **Seguridad**: `partidos` ya no se puede editar/borrar una vez `estado:'cerrado'`, salvo admin. Antes cualquier sesión (hasta anónima) podía tocar un partido cerrado.
- **Orden obligatorio por cancha**: en la planilla, solo el partido más temprano sin cerrar de cada cancha se puede abrir; los siguientes quedan bloqueados con candado hasta cerrar el anterior.
- **Confirmación al abrir partido**: "¿Abrir este partido?" + aviso "✓ Partido abierto y sincronizado".
- **Historial de planillas** (nuevo, en `index.html` y `planilla.html`): división → fecha → lista de partidos cerrados, cada uno con **Ver / Descargar / Compartir** un PDF real generado en el momento (jsPDF, sin Storage, sin costo). En planilla.html: botón chico "📄 Historial" junto a "Cambiar planillero". En admin: la vieja pestaña "Planillas" (dropdown de a uno) se rehízo como lista completa por fecha.
- **"Cerrar fecha"**: solo organizativo (no bloquea nada, eso ya lo hace el punto de seguridad de arriba), colección `fechasCerradas`, disponible en ambas apps.
- **Pendiente de limpieza (vos, requiere admin real)**: además de los ZTEST/DEMO de la sesión anterior, quedaron 2 partidos de prueba más en **Cancha "9"** (no es una cancha real) con equipos **TEST A, TEST B, TEST C, TEST D** — mismo motivo, borrar equipos/partidos requiere tu login real.

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
