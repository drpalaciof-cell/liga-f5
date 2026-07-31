# TODO — Liga F5

> Se actualiza cada sesión para no depender de la memoria del chat.
> Lista original reconstruida el 2026-07-31 desde el transcript de la sesión del 2026-07-29/30 (session id `4ebc70a8`), que se cortó sin avisar a las 23:14 del 30/07.

## ✅ Completadas, commiteadas y deployadas a producción (1–11)

**Commit `229fe91`:**
1. Bajar monto de seguro de $6.000 a $5.000
2. Arreglar color violeta de Segunda en notificaciones admin
3. Arreglar error al descargar PDF de lista de buena fe
4. Fotos de jugadores en carnet (no se pudo reproducir el bug — posible caché del navegador)
5. Hacer obligatoria la edad antes de continuar en Carnet
6. Aviso de formato de foto (4x4 fondo blanco) al subir
7. Línea de firma del delegado/presidente en el dorso del carnet

**Commit `271e66f` (2026-07-31), deployado a producción (hosting + Cloud Function) el mismo día:**
8. Eliminar mensajes en panel admin — probado por el usuario, OK.
9. Reestructurar bandeja admin: tabs por división (Primera/Segunda) + filtros por categoría (Inscripciones/Pagos/Seguros/Consultas) — probado por el usuario, OK.
10. Texto en 3ª persona para el admin vs 2ª persona para el equipo (el bug real que recordaba el usuario: veía "Tu pago fue aprobado..." en su propia bandeja como si fuera el equipo). Ojo: mensajes viejos guardados antes de este deploy van a seguir mostrando el texto anterior — solo aplica a mensajes nuevos de ahora en adelante.
11. Duplicado de hilos (ID determinístico + transacción de Firestore) — probado por el usuario, OK.
12. Bug adicional encontrado en la auditoría del 31/07 (no era el que recordaba el usuario, pero real): badge de no leídos del equipo y la Cloud Function de push notifications dependían solo del flag `soloAdmin` sin respaldo — un hilo admin-only viejo mal flageado podía terminar como push notification real en el celular del equipo. Corregido en `iniciarBadgeEquipo` (index.html) y `enviarNotificacionPush` (functions/index.js), incluyendo que la push al admin ahora usa `textoAdmin`.

**Pendiente menor, no bloqueante:** hacer `git push` a `origin/main` cuando el usuario lo confirme (el commit está local, deploy a Firebase ya se hizo desde el working tree).

## ⬜ Sin empezar (12–15 de la lista original — features nuevas, no bugs de mensajería)

- [ ] **Aviso al equipo tras subir comprobante de seguro**: mostrar cuántos jugadores de la lista de buena fe aún no están asegurados, advirtiendo que si no se aseguran antes del 12/08 22:00hs el sistema los elimina automáticamente.
- [ ] **Cloud Function programada** (`onSchedule`) que corra una vez el 12/08/2026 22:00 hora Argentina: por cada equipo, filtra `jugadores[]` dejando solo asegurados (`seguroJugadoresDni`), guarda auditoría de eliminados (para período de gracia del 14/08) y notifica al admin con resumen por equipo. **Requiere confirmar con el usuario el diseño del guardado de auditoría antes de desplegar.**
- [ ] **Alertar al admin al cerrar plazos** (`fechaLimiteInscripcion` / `fechaLimiteSeguro`) con la lista de equipos que no completaron pago total o no aseguraron a todos los jugadores de la lista de buena fe.
- [ ] **"Monto del comprobante"** (próxima tarea a arrancar): agregar campo donde el equipo indique el MONTO que efectivamente transfirió en cada comprobante (inscripción/saldo y seguro), y mostrar cuánto queda pendiente restando lo declarado del total requerido — tanto para el equipo como para el admin (saldos reales por equipo). OCR automático queda fuera de alcance por ahora.
