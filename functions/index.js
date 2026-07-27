const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
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

// Se dispara con cada respuesta nueva en cualquier hilo de mensajes y decide
// a quién avisar (admin o el equipo dueño del hilo) según quién la escribió.
exports.enviarNotificacionPush = onDocumentCreated('mensajes/{mensajeId}/replies/{replyId}', async (event) => {
  ensureVapid();
  const reply = event.data.data();
  const mensajeId = event.params.mensajeId;

  const threadSnap = await db.collection('mensajes').doc(mensajeId).get();
  if (!threadSnap.exists) return;
  const thread = threadSnap.data();

  let targetDocId = null;
  if (reply.de === 'equipo') targetDocId = 'admin';
  else if (reply.de === 'admin') targetDocId = 'equipo_' + thread.equipoId;
  else if (reply.de === 'sistema') targetDocId = thread.soloAdmin ? 'admin' : 'equipo_' + thread.equipoId;
  if (!targetDocId) return;

  const subDoc = await db.collection('pushSubscriptions').doc(targetDocId).get();
  if (!subDoc.exists) return;
  const subscription = subDoc.data().subscription;
  if (!subscription) return;

  const cuerpo = (reply.texto || '').trim() || '📎 Imagen adjunta';
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
