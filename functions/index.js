const { onDocumentCreated, onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const crypto = require('crypto');
const webpush = require('web-push');

initializeApp();
const db = getFirestore();

// Misma normalización que sha256Hex() en index.html — hashes existentes
// (creados en el navegador) tienen que seguir siendo válidos acá.
function sha256Hex(text) {
  return crypto.createHash('sha256').update(text || '', 'utf8').digest('hex');
}

function requireAdmin(request) {
  if (!request.auth || request.auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Necesitás ser administrador para esto.');
  }
  return request.auth.token.adminId;
}

// Verifica usuario+contraseña en el servidor (admin o equipo, mismo orden de
// búsqueda que tenía el login client-side) y devuelve un custom token de
// Firebase Auth con el rol adentro. El hash nunca llega al navegador.
exports.login = onCall(async (request) => {
  const { usuario, pass } = request.data || {};
  if (!usuario || !pass) throw new HttpsError('invalid-argument', 'Faltan usuario o contraseña.');
  const hash = sha256Hex(pass);

  let adminDoc = await db.collection('admins').doc(usuario).get();
  let adminId = usuario;
  if (!adminDoc.exists) {
    const lower = await db.collection('admins').doc(usuario.toLowerCase()).get();
    if (lower.exists) { adminDoc = lower; adminId = usuario.toLowerCase(); }
  }
  if (!adminDoc.exists) {
    const upper = await db.collection('admins').doc(usuario.toUpperCase()).get();
    if (upper.exists) { adminDoc = upper; adminId = usuario.toUpperCase(); }
  }
  if (!adminDoc.exists) {
    const snap = await db.collection('admins').where('usuario', '==', usuario).limit(1).get();
    if (!snap.empty) { adminDoc = snap.docs[0]; adminId = adminDoc.id; }
  }
  if (adminDoc.exists && adminDoc.data().pinHash === hash) {
    const token = await getAuth().createCustomToken('admin_' + adminId, { role: 'admin', adminId });
    return { token, role: 'admin', id: adminId };
  }

  let snap = await db.collection('equipos').where('usuarioLower', '==', usuario.toLowerCase()).limit(1).get();
  if (snap.empty) snap = await db.collection('equipos').where('nombreLower', '==', usuario.toLowerCase()).limit(1).get();
  if (snap.empty) throw new HttpsError('permission-denied', 'Usuario o contraseña incorrectos.');
  const doc = snap.docs[0];
  const credDoc = await db.collection('credenciales').doc(doc.id).get();
  // Durante la migración: si todavía no se migró este equipo, cae al hash
  // viejo guardado en el propio documento de equipos (contrasenaHash).
  const hashGuardado = credDoc.exists ? credDoc.data().contrasenaHash : doc.data().contrasenaHash;
  if (hashGuardado !== hash) throw new HttpsError('permission-denied', 'Usuario o contraseña incorrectos.');
  const token = await getAuth().createCustomToken('equipo_' + doc.id, { role: 'equipo', equipoId: doc.id });
  return { token, role: 'equipo', id: doc.id };
});

function requireEquipo(request) {
  if (!request.auth || request.auth.token.role !== 'equipo') {
    throw new HttpsError('permission-denied', 'Necesitás estar logueado como equipo para esto.');
  }
  return request.auth.token.equipoId;
}

exports.cambiarPasswordEquipo = onCall(async (request) => {
  const equipoId = requireEquipo(request);
  const { passActual, passNueva } = request.data || {};
  if (!passActual || !passNueva || passNueva.length < 6) throw new HttpsError('invalid-argument', 'Datos inválidos.');
  const credRef = db.collection('credenciales').doc(equipoId);
  const credDoc = await credRef.get();
  const eqDoc = await db.collection('equipos').doc(equipoId).get();
  const hashActual = credDoc.exists ? credDoc.data().contrasenaHash : eqDoc.data()?.contrasenaHash;
  if (hashActual !== sha256Hex(passActual)) throw new HttpsError('permission-denied', 'La contraseña actual es incorrecta.');
  await credRef.set({ contrasenaHash: sha256Hex(passNueva) }, { merge: true });
  return { ok: true };
});

exports.resetPasswordEquipoServer = onCall(async (request) => {
  requireAdmin(request);
  const { equipoId, passNueva } = request.data || {};
  if (!equipoId || !passNueva || passNueva.length < 6) throw new HttpsError('invalid-argument', 'Datos inválidos.');
  await db.collection('credenciales').doc(equipoId).set({ contrasenaHash: sha256Hex(passNueva) }, { merge: true });
  return { ok: true };
});

// Migración única: copia contrasenaHash de equipos/{id} a credenciales/{id}
// (colección no legible por clientes) y borra el campo del documento
// público. Idempotente — salta los equipos ya migrados.
exports.migrarCredencialesEquipos = onCall(async (request) => {
  requireAdmin(request);
  const snap = await db.collection('equipos').get();
  let migrados = 0, saltados = 0, sinHash = 0;
  for (const doc of snap.docs) {
    const hash = doc.data().contrasenaHash;
    if (!hash) { sinHash++; continue; }
    const credRef = db.collection('credenciales').doc(doc.id);
    const credDoc = await credRef.get();
    if (credDoc.exists) { saltados++; } else {
      await credRef.set({ contrasenaHash: hash, migradoDesde: 'equipos', fechaMigracion: new Date().toISOString() });
      migrados++;
    }
    await db.collection('equipos').doc(doc.id).update({ contrasenaHash: FieldValue.delete() });
  }
  return { ok: true, migrados, saltados, sinHash, total: snap.size };
});

exports.cambiarPasswordAdmin = onCall(async (request) => {
  const adminId = requireAdmin(request);
  const { passActual, passNueva } = request.data || {};
  if (!passActual || !passNueva || passNueva.length < 6) throw new HttpsError('invalid-argument', 'Datos inválidos.');
  const doc = await db.collection('admins').doc(adminId).get();
  if (!doc.exists || doc.data().pinHash !== sha256Hex(passActual)) throw new HttpsError('permission-denied', 'La contraseña actual es incorrecta.');
  await db.collection('admins').doc(adminId).update({ pinHash: sha256Hex(passNueva) });
  return { ok: true };
});

exports.crearAdminServer = onCall(async (request) => {
  requireAdmin(request);
  const { usuario, pass } = request.data || {};
  if (!usuario || !pass || pass.length < 6) throw new HttpsError('invalid-argument', 'Datos inválidos.');
  const existing = await db.collection('admins').doc(usuario).get();
  if (existing.exists) throw new HttpsError('already-exists', 'Ya existe un administrador con ese usuario.');
  await db.collection('admins').doc(usuario).set({ usuario, pinHash: sha256Hex(pass), fechaCreacion: new Date().toISOString() });
  return { ok: true };
});

exports.eliminarAdminServer = onCall(async (request) => {
  requireAdmin(request);
  const { usuario } = request.data || {};
  if (!usuario) throw new HttpsError('invalid-argument', 'Falta el usuario.');
  const snap = await db.collection('admins').get();
  if (snap.size <= 1) throw new HttpsError('failed-precondition', 'Debe quedar al menos un administrador.');
  await db.collection('admins').doc(usuario).delete();
  return { ok: true };
});

exports.listarAdminsServer = onCall(async (request) => {
  requireAdmin(request);
  const snap = await db.collection('admins').get();
  return { admins: snap.docs.map((d) => ({ usuario: d.id, fechaCreacion: d.data().fechaCreacion || null })) };
});

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return;
  webpush.setVapidDetails(
    'mailto:ligaf5.2026@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  vapidReady = true;
}

// Debe reflejar la misma lista que ASUNTOS_SOLO_ADMIN en index.html: respaldo
// para hilos viejos que quedaron sin soloAdmin:true seteado en Firestore.
const ASUNTOS_SOLO_ADMIN = ['Nueva inscripción', 'Comprobante de seguro médico', 'Lista de buena fe', 'Escudo del equipo', 'Comprobante de inscripción'];

// Se dispara con cada respuesta nueva en cualquier hilo de mensajes y decide
// a quién avisar (admin o el equipo dueño del hilo) según quién la escribió.
exports.enviarNotificacionPush = onDocumentCreated('mensajes/{mensajeId}/replies/{replyId}', async (event) => {
  ensureVapid();
  const reply = event.data.data();
  const mensajeId = event.params.mensajeId;

  const threadSnap = await db.collection('mensajes').doc(mensajeId).get();
  if (!threadSnap.exists) return;
  const thread = threadSnap.data();

  const esSoloAdmin = thread.soloAdmin || ASUNTOS_SOLO_ADMIN.includes(thread.asunto);
  let targetDocId = null;
  if (reply.de === 'equipo') targetDocId = 'admin';
  else if (reply.de === 'admin') targetDocId = 'equipo_' + thread.equipoId;
  else if (reply.de === 'sistema') targetDocId = esSoloAdmin ? 'admin' : 'equipo_' + thread.equipoId;
  if (!targetDocId) return;

  const subDoc = await db.collection('pushSubscriptions').doc(targetDocId).get();
  if (!subDoc.exists) return;
  const subscription = subDoc.data().subscription;
  if (!subscription) return;

  const textoParaDestino = targetDocId === 'admin' ? (reply.textoAdmin || reply.texto) : reply.texto;
  const cuerpo = (textoParaDestino || '').trim() || '📎 Imagen adjunta';
  const payload = JSON.stringify({
    title: `Liga F5 · ${thread.asunto || 'Nuevo mensaje'}`,
    body: cuerpo.slice(0, 140),
    rol: targetDocId === 'admin' ? 'admin' : 'equipo'
  });

  try {
    await webpush.sendNotification(subscription, payload);
  } catch (err) {
    console.error('Error enviando push a', targetDocId, err.statusCode, err.body);
    if (err.statusCode === 404 || err.statusCode === 410) {
      await db.collection('pushSubscriptions').doc(targetDocId).delete();
    }
  }
});

// Envía la notificación push a una suscripción guardada en pushSubscriptions/{docId} -- misma
// lógica de limpieza (borrar la suscripción si quedó vencida) que ya usaba
// enviarNotificacionPush, factorizada para reusar acá.
async function enviarPush(docId, payload) {
  const subDoc = await db.collection('pushSubscriptions').doc(docId).get();
  if (!subDoc.exists) return;
  const subscription = subDoc.data().subscription;
  if (!subscription) return;
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    console.error('Error enviando push a', docId, err.statusCode, err.body);
    if (err.statusCode === 404 || err.statusCode === 410) {
      await db.collection('pushSubscriptions').doc(docId).delete();
    }
  }
}

// Avisos rápidos admin <-> planillero por cancha (1 doc por cancha en avisosPlanilla, sin
// historial). Un solo trigger cubre los 3 casos: el admin manda un mensaje nuevo (push al
// planillero de esa cancha), el planillero llama al organizador (push al admin), o el
// planillero responde un mensaje (push al admin, para no depender de que esté mirando la
// pantalla en ese momento).
exports.enviarPushAvisoPlanilla = onDocumentWritten('avisosPlanilla/{cancha}', async (event) => {
  ensureVapid();
  const cancha = event.params.cancha;
  const before = event.data.before.exists ? event.data.before.data() : {};
  const after = event.data.after.exists ? event.data.after.data() : null;
  if (!after) return; // documento borrado, nada que avisar

  if (after.msgHora && after.msgHora !== before.msgHora) {
    await enviarPush('cancha_' + cancha, {
      title: `📣 Aviso — Cancha ${cancha}`,
      body: (after.msgTexto || '').slice(0, 140),
      target: 'planilla'
    });
  }
  if (after.llamada && !before.llamada) {
    const motivo = (after.llamadaTexto || '').trim();
    const quienLlama = (after.llamadaPlanillero || '').trim();
    const canchaTxt = `Cancha ${cancha}${quienLlama ? ' (' + quienLlama + ')' : ''}`;
    await enviarPush('admin', {
      title: '🚨 Llamando al organizador',
      body: motivo ? `${canchaTxt}: ${motivo}` : `${canchaTxt} necesita al organizador.`,
      rol: 'admin'
    });
  }
  if (after.msgRespuesta && after.msgRespuestaHora !== before.msgRespuestaHora) {
    const quienResp = (after.msgRespuestaDe || '').trim();
    await enviarPush('admin', {
      title: `💬 Cancha ${cancha}${quienResp ? ' — ' + quienResp : ''} respondió`,
      body: (after.msgRespuesta || '').slice(0, 140),
      rol: 'admin'
    });
  }
});

// Debe reflejar la misma normalización que _slugAsunto en index.html.
function _slugAsunto(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
}

// Réplica server-side de crearMensajeSistema() en index.html (mismo esquema
// de hilo determinístico equipoId+asunto dentro de una transacción, para
// poder avisarle al equipo desde una Cloud Function sin duplicar hilos).
async function crearMensajeSistemaServer(equipoId, equipoNombre, division, asunto, texto, para, textoAdmin) {
  const fecha = FieldValue.serverTimestamp();
  const taAdmin = textoAdmin || texto;
  const ref = db.collection('mensajes').doc(`${equipoId}_${_slugAsunto(asunto)}`);
  await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (doc.exists) {
      const upd = { ultimoTexto: texto, ultimoTextoAdmin: taAdmin, ultimaFecha: fecha };
      if (para === 'admin') upd.noLeidoAdmin = FieldValue.increment(1);
      else upd.noLeidoEquipo = FieldValue.increment(1);
      tx.update(ref, upd);
    } else {
      tx.set(ref, { equipoId, equipoNombre, division, asunto, ultimoTexto: texto, ultimoTextoAdmin: taAdmin, ultimaFecha: fecha, noLeidoAdmin: para === 'admin' ? 1 : 0, noLeidoEquipo: para === 'equipo' ? 1 : 0, iniciador: 'sistema', soloAdmin: para === 'admin' });
    }
  });
  await ref.collection('replies').add({ de: 'sistema', deNombre: 'Sistema', texto, textoAdmin: taAdmin, adjuntos: [], fecha });
}

// Corre cada hora. Cuando pasan las 23:00hs (Argentina) del día configurado
// como fechaLimiteSeguro y todavía no se avisó, le informa a cada equipo con
// jugadores sin seguro aprobado (ni habilitación tardía) cuáles quedaron no
// habilitados. No borra ni modifica jugadores — solo avisa; el estado "no
// habilitado" ya se calcula en el cliente comparando fechas.
exports.cerrarPlazoSeguro = onSchedule(
  { schedule: 'every 60 minutes', timeZone: 'America/Argentina/Buenos_Aires' },
  async () => {
    const cfgRef = db.collection('config').doc('general');
    const cfgSnap = await cfgRef.get();
    if (!cfgSnap.exists) return;
    const cfg = cfgSnap.data();
    if (!cfg.fechaLimiteSeguro || cfg.avisoSeguroCierreEnviado) return;

    const limite = new Date(cfg.fechaLimiteSeguro + 'T23:00:00-03:00');
    if (new Date() < limite) return;

    const equiposSnap = await db.collection('equipos').get();
    const avisos = [];
    equiposSnap.forEach((doc) => {
      const eq = doc.data();
      const equipoId = doc.id;
      const jugadoresConDni = (eq.jugadores || []).filter((j) => j.dni && (j.apellido || j.nombre));
      const aprobados = new Set(eq.seguroJugadoresDni || []);
      const manual = new Set((eq.seguroHabilitadoManual || []).map((h) => h.dni));
      const sinHabilitar = jugadoresConDni.filter((j) => !aprobados.has(j.dni) && !manual.has(j.dni));
      if (!sinHabilitar.length) return;
      const nombres = sinHabilitar.map((j) => `${j.apellido || ''} ${j.nombre || ''}`.trim()).join(', ');
      const texto = `⚠️ Venció el plazo del seguro médico. ${sinHabilitar.length} jugador(es) de tu lista de buena fe quedaron NO HABILITADOS para jugar hasta regularizar la situación con la organización: ${nombres}.`;
      const textoAdmin = `⚠️ ${eq.nombre || equipoId}: ${sinHabilitar.length} jugador(es) quedaron no habilitados por seguro médico vencido: ${nombres}.`;
      avisos.push(crearMensajeSistemaServer(equipoId, eq.nombre, eq.division, 'Seguro médico', texto, 'equipo', textoAdmin));
    });
    await Promise.all(avisos);
    await cfgRef.update({ avisoSeguroCierreEnviado: true });
  }
);
