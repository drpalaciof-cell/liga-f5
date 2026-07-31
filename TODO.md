# TODO — Liga F5

> Se actualiza cada sesión para no depender de la memoria del chat.
> Lista original reconstruida el 2026-07-31 desde el transcript de la sesión del 2026-07-29/30 (session id `4ebc70a8`), que se cortó sin avisar a las 23:14 del 30/07.

## ✅ Completadas y commiteadas (1–7) — commit `229fe91`

1. Bajar monto de seguro de $6.000 a $5.000
2. Arreglar color violeta de Segunda en notificaciones admin
3. Arreglar error al descargar PDF de lista de buena fe
4. Fotos de jugadores en carnet (no se pudo reproducir el bug — posible caché del navegador)
5. Hacer obligatoria la edad antes de continuar en Carnet
6. Aviso de formato de foto (4x4 fondo blanco) al subir
7. Línea de firma del delegado/presidente en el dorso del carnet

## 🟡 En curso — código escrito, sin commitear, sin deployar a producción

8. **Eliminar mensajes en panel admin** — listo.
9. **Reestructurar bandeja admin**: tabs por división (Primera/Segunda) + filtros por categoría (Inscripciones/Pagos/Seguros/Consultas) — listo.
10. **El bug real que recordabas** ("Rotens ha realizado el pago" mezclado): el mismo texto de `crearMensajeSistema()` se guardaba una sola vez y se mostraba igual en la bandeja del admin y en la del equipo — vos (admin) veías "Tu pago fue aprobado, ¡ya estás habilitado!" como si fueras el equipo, en 2ª persona, en vez de "Rotens ya pagó y está habilitado" en 3ª persona.
    - **Fix**: `crearMensajeSistema` ahora guarda dos textos (`texto` para el equipo en 2ª persona, `textoAdmin` para vos en 3ª persona) en los 4 avisos de aprobación/rechazo (pago y seguro).
    - Ya se deployó una vez a un **preview channel** (`https://liga-f5-3d80c--preview-mensajes-lx7mul1m.web.app`, puede haber expirado — tenía 2 días de vida desde el 29/07 19:05) y lo confirmaste como correcto.
    - Importante: esto sólo aplica a mensajes nuevos — los que ya estaban guardados en Firestore van a seguir mostrando el texto viejo.
11. **Duplicado de hilos** (viste dos hilos idénticos de "Estado de pago" para ROTENS FC): condición de carrera en `crearMensajeSistema` — si se llama dos veces casi al mismo tiempo (doble click en "Aprobar"), la consulta de "¿ya existe el hilo?" no ve todavía la escritura de la otra llamada y crea dos hilos.
    - **Fix**: ID de documento determinístico (`equipoId_asunto-slug`) dentro de una transacción de Firestore — imposible que se duplique.
    - Esto fue lo último que se estaba escribiendo cuando se cortó la sesión el 30/07 — quedó escrito y con el chequeo de sintaxis en Node OK, pero **nunca se probó en el preview channel ni se commiteó**.
12. **(Encontrado hoy 2026-07-31, bug adicional real pero distinto al que recordabas)**: el contador de no leídos del equipo y, más grave, la Cloud Function de push notifications dependían solo del flag `soloAdmin` sin respaldo, así que en hilos viejos con ese flag mal seteado, el equipo podía recibir una **push notification real en su celular** con contenido admin-only. Corregido en `index.html` (`iniciarBadgeEquipo`) y en `functions/index.js` (`enviarNotificacionPush`), incluyendo que ahora la push al admin también usa `textoAdmin`.

**Antes de commitear y deployar (hosting + functions):**
- [ ] Probar en preview channel: dual-text (admin ve 3ª persona, equipo ve 2ª persona), que no se dupliquen hilos al aprobar dos veces rápido, tabs por división, filtros por categoría, botón eliminar, y que un equipo de prueba no vea ni reciba push de hilos admin-only.
- [ ] Commitear `index.html` + `functions/index.js`
- [ ] `firebase deploy` (incluir `--only functions` para que la Cloud Function corregida se actualice)

## ⬜ Sin empezar (10–13 de la lista original — ojo, se pisa la numeración con lo de arriba; estas son las 4 features nuevas, no bugs de mensajería)

- [ ] **Aviso al equipo tras subir comprobante de seguro**: mostrar cuántos jugadores de la lista de buena fe aún no están asegurados, advirtiendo que si no se aseguran antes del 12/08 22:00hs el sistema los elimina automáticamente.
- [ ] **Cloud Function programada** (`onSchedule`) que corra una vez el 12/08/2026 22:00 hora Argentina: por cada equipo, filtra `jugadores[]` dejando solo asegurados (`seguroJugadoresDni`), guarda auditoría de eliminados (para período de gracia del 14/08) y notifica al admin con resumen por equipo. **Requiere confirmar con el usuario el diseño del guardado de auditoría antes de desplegar.**
- [ ] **Alertar al admin al cerrar plazos** (`fechaLimiteInscripcion` / `fechaLimiteSeguro`) con la lista de equipos que no completaron pago total o no aseguraron a todos los jugadores de la lista de buena fe.
- [ ] **"Monto del comprobante" — esto es lo que preguntaste hoy**: agregar campo donde el equipo indique el MONTO que efectivamente transfirió en cada comprobante (inscripción/saldo y seguro), y mostrar cuánto queda pendiente restando lo declarado del total requerido — tanto para el equipo como para el admin (saldos reales por equipo). OCR automático queda fuera de alcance por ahora.
