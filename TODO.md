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

**Pendiente menor, no urgente:** el hash de contraseña de los *equipos* (no de los admins) sigue siendo técnicamente legible vía lectura pública de `equipos/*` (necesaria para listados/standings). El riesgo real es bajo — con el login ahora server-side, tener el hash no alcanza para loguearse, haría falta crackearlo offline. Si se quiere cerrar del todo, requiere mover las credenciales de equipo a una subcolección separada no legible públicamente.
