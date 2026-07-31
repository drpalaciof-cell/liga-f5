# TODO — Liga F5

> Se actualiza cada sesión para no depender de la memoria del chat.
> Lista original reconstruida el 2026-07-31 desde el transcript de la sesión del 2026-07-29/30 (session id `4ebc70a8`), que se cortó sin avisar a las 23:14 del 30/07.

## ✅ Completadas, commiteadas y deployadas a producción (1–11)

Ver historial de commits `229fe91` y `271e66f` — mensajería completa (tabs por división, filtros, eliminar, dual-text 3ra/2da persona, dedup, badge/push corregidos).

## 🟡 Tareas 13-15 — código escrito, sin commitear ni deployar (2026-07-31)

**13. Aviso al equipo tras subir comprobante de seguro** — listo (`avisarJugadoresSinAsegurar`, modal tras cada subida con la lista de jugadores sin gestión y advertencia del plazo).

**14. Deshabilitación por seguro vencido + habilitación tardía con recargo** — diseño confirmado con el usuario: no se elimina a nadie, se marca "no habilitado" (visible en rojo) y el admin puede reactivar individualmente con un recargo de $7.000, avisando siempre al equipo.
  - Equipo ve badge rojo "No habilitado" en su propia lista de buena fe/seguro (`renderSegurosPanel`) cuando venció el plazo y el jugador no tiene seguro aprobado ni habilitación manual.
  - Admin: en la ficha de equipo (`verDetalleEquipoAdmin`) nueva columna "Seguro" con botón "Habilitar $7.000" (`habilitarSeguroTardio`) — escribe `seguroHabilitadoManual: [{dni,fecha,monto}]` en el equipo, avisa al equipo por mensaje, y suma al reporte financiero (`calcularIngresoSeguro`).
  - `planilla.html`: al armar la alineación de un partido, los jugadores no habilitados por seguro (mismo cálculo: vencido + no aprobado + no habilitación manual) aparecen bloqueados con badge rojo "No habilitado por pago de seguro pendiente" y no se pueden seleccionar.
  - `functions/index.js`: nueva `onSchedule` (`cerrarPlazoSeguro`, corre cada hora, huso Argentina) que, pasadas las **23:00hs** del día de `fechaLimiteSeguro` (confirmado por el usuario: 12/08/2026 23hs) y solo una vez (flag `avisoSeguroCierreEnviado` en `config/general`, se resetea si el admin cambia la fecha), le avisa por mensaje/push a cada equipo con jugadores sin habilitar cuáles quedaron afuera.
  - Los 4 chequeos client-side de "venció el plazo" (`index.html` x3, `planilla.html` x1) usaban `T23:59:59` (fin de día) — se alinearon a `T23:00:00` para coincidir con la hora real del plazo (23hs) y con la Cloud Function.
  - Confirmado con el usuario: el plazo real es **12/08/2026 23:00hs Argentina**, todavía no pasó (hoy 31/07) — seguro deployar la función ahora, no se va a disparar de golpe.

**15. Banner admin con equipos incompletos al vencer plazos** — listo (`renderBannerPlazosVencidos`, se calcula al abrir el panel admin, sin Cloud Function).

## ⬜ Nueva — Endurecer firestore.rules (seguridad, prioridad alta)

**Hallazgo del 2026-07-31, no relacionado a las tareas de arriba pero confirmado por el usuario como pendiente:** `firestore.rules` permite que **cualquier usuario autenticado** (incluyendo cuentas de equipo) lea y escriba **cualquier documento** de `equipos`, `config`, `mensajes`, etc. — no está limitado a "solo tu propio equipo" ni a "solo el admin puede aprobar". Esto ya afectaba a `pagoEstado`, `seguroJugadoresDni`, etc. desde antes, y ahora también a `seguroHabilitadoManual`: en teoría un equipo con conocimientos técnicos podría auto-aprobarse el pago o el seguro escribiendo directo a Firestore desde la consola del navegador.

Requiere diseño aparte antes de tocar las reglas (hay que mapear con precisión qué puede escribir cada rol — equipo vs admin — sin romper flujos existentes: alta de equipo, subida de comprobantes, aprobación admin, mensajería, etc.). No apurar este cambio.

## Antes de deployar 13-15

- [ ] Probar en preview channel: aviso post-subida de seguro, badge rojo en vista equipo, botón de habilitación tardía en admin, bloqueo en planilla.html.
- [x] Confirmar fecha real de `fechaLimiteSeguro` — 12/08/2026 23hs, todavía no pasó.
- [ ] Commitear y `firebase deploy` (hosting + functions).
