const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const webpush = require('web-push');

initializeApp();
const db = getFirestore();

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
