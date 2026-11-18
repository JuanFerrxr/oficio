// Comprueba el Sprint 4B · Chat y avisos contra tu Supabase LOCAL: conversaciones, mensajes de
// cada tipo, leídos, archivos privados, quién puede escribir, la cola de avisos y su envío por
// Expo Push (con un Expo de mentira en tu computadora: no sale nada a internet).
// Corre después de "npm run demo" y con la API apagada.
//
//   npm run chat
//
// Lo que crea (solicitudes "PRUEBA 4B", tokens de prueba) lo borra al terminar.
import { createServer } from 'node:http';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL_SB = process.env.SUPABASE_URL!;
if (!/127\.0\.0\.1|localhost/.test(URL_SB)) {
  console.error('Este script solo corre contra Supabase local. SUPABASE_URL =', URL_SB);
  process.exit(1);
}
// Si la API está prendida, su envío de avisos competiría con el Expo de mentira de esta prueba
const apiPrendida = await fetch(`http://localhost:${process.env.PORT ?? 8080}/health`).then((r) => r.ok).catch(() => false);
if (apiPrendida) {
  console.error('La API está corriendo (npm run dev). Apágala con Ctrl+C antes de "npm run chat": su envío de avisos se cruzaría con esta prueba.');
  process.exit(1);
}
const admin = createClient(URL_SB, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const PASS = 'Oficio2026!';
const MARCA = 'PRUEBA 4B';
const TOKEN_M = 'ExponentPushToken[prueba-4b-mariana]';
const TOKEN_R = 'ExponentPushToken[prueba-4b-rogelio]';
const TOKEN_MUERTO = 'ExponentPushToken[prueba-4b-borrado]';
const JPG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');

let paso = 0;
const check = (cond: unknown, msg: string, detalle?: unknown) => {
  if (!cond) throw new Error(`FALLÓ: ${msg}${detalle !== undefined ? ` (${JSON.stringify(detalle)})` : ''}`);
  console.log(`  ✔ ${++paso}. ${msg}`);
};
const enDias = (n: number) => new Date(Date.now() + n * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });

async function entrar(email: string): Promise<{ db: SupabaseClient; id: string }> {
  const db = createClient(URL_SB, process.env.SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.auth.signInWithPassword({ email, password: PASS });
  if (error) throw new Error(`No pude entrar como ${email}. ¿Corriste "npm run demo"? (${error.message})`);
  return { db, id: data.user!.id };
}

const { db: mariana, id: marianaId } = await entrar('mariana@demo.mx');
const { db: rogelio, id: rogelioId } = await entrar('rogelio@demo.mx');
const { db: jorge } = await entrar('jorge@demo.mx');
const { data: svc } = await admin.from('provider_services').select('id, category_id').eq('provider_id', rogelioId).eq('title', 'Visita de diagnóstico').single();
const { data: dir } = await admin.from('addresses').select('id').eq('user_id', marianaId).eq('is_default', true).single();
const pruebas: string[] = [];

async function limpiar() {
  const { data: reqs } = await admin.from('service_requests').select('id').like('description', `${MARCA}%`);
  for (const r of reqs ?? []) {
    const { data: a } = await admin.storage.from('chat-media').list(r.id);
    if (a?.length) await admin.storage.from('chat-media').remove(a.map((x) => `${r.id}/${x.name}`));
    await admin.from('avisos').delete().eq('datos->>requestId', r.id);
  }
  if (reqs?.length) await admin.from('service_requests').delete().in('id', reqs.map((r) => r.id));
  await admin.from('push_tokens').delete().in('token', [TOKEN_M, TOKEN_R, TOKEN_MUERTO]);
  await admin.from('avisos').delete().in('user_id', [marianaId, rogelioId]).eq('datos->>ir', 'prueba');
}
async function nueva() {
  const { data, error } = await mariana.from('service_requests').insert({
    client_id: marianaId, provider_id: rogelioId, service_id: svc!.id, category_id: svc!.category_id, address_id: dir!.id,
    description: `${MARCA} · ¿me ayuda con la pastilla?`, preferred_dates: [enDias(1)], time_windows: ['morning'], preferred_payment_methods: ['cash'],
  }).select('id').single();
  if (error) throw error;
  pruebas.push(data!.id);
  return data!.id as string;
}
const avisosDe = async (user: string, req: string) =>
  ((await admin.from('avisos').select('titulo, cuerpo, datos, enviado_at, error').eq('user_id', user).eq('datos->>requestId', req).order('id')).data ?? []) as any[];

// Expo de mentira: responde como Expo Push y guarda lo que le llegó
const recibidos: any[] = [];
const mock = createServer((req, res) => {
  let cuerpo = '';
  req.on('data', (c) => { cuerpo += c; });
  req.on('end', () => {
    const msgs = JSON.parse(cuerpo || '[]') as any[];
    recibidos.push(...msgs);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ data: msgs.map((m) => (m.to === TOKEN_MUERTO
      ? { status: 'error', message: 'no registrado', details: { error: 'DeviceNotRegistered' } }
      : { status: 'ok', id: 'x' })) }));
  });
});
await new Promise<void>((r) => mock.listen(0, '127.0.0.1', () => r()));
process.env.EXPO_PUSH_URL = `http://127.0.0.1:${(mock.address() as { port: number }).port}/push`;
process.env.AVISOS_CADA_MS = '0';
const { enviarAvisos } = await import('../src/services/push.js');

try {
  await limpiar();

  console.log('\nAvisos · solicitud nueva');
  const a = await nueva();
  let av = await avisosDe(rogelioId, a);
  check(av.length === 1 && av[0].titulo === 'Nueva solicitud: Visita de diagnóstico' && av[0].datos.ir === 'bandeja', 'Al llegar la solicitud, queda un aviso para Rogelio', av);

  console.log('\nA3.2 · B9 · Conversaciones');
  let { data: convM } = await mariana.rpc('mis_conversaciones');
  let cm = (convM ?? []).find((c: any) => c.request_id === a);
  check(cm && cm.rol === 'cliente' && cm.otro_nombre === 'Rogelio Hernández' && cm.ultimo_tipo === null, 'Mariana ya ve la conversación (vacía) con Rogelio, nombre completo');
  let { data: convR } = await rogelio.rpc('mis_conversaciones');
  let cr = (convR ?? []).find((c: any) => c.request_id === a);
  check(cr && cr.rol === 'prestador' && cr.otro_nombre === 'Mariana G.', 'Rogelio la ve como prestador, con "Mariana G."');
  const { data: convJ } = await jorge.rpc('mis_conversaciones');
  check(!(convJ ?? []).some((c: any) => c.request_id === a), 'Nadie más la ve');

  console.log('\nA3.3 · Mensajes');
  let r = await mariana.from('messages').insert({ request_id: a, sender_id: marianaId, type: 'text', body: 'Hola, ¿trae escalera?' });
  check(!r.error, 'Mariana escribe antes de que cotice', r.error?.message);
  ({ data: convR } = await rogelio.rpc('mis_conversaciones'));
  cr = (convR ?? []).find((c: any) => c.request_id === a);
  check(cr.ultimo_texto === 'Hola, ¿trae escalera?' && cr.no_leidos === 1 && cr.ultimo_mio === false, 'Rogelio lo ve como último mensaje, 1 sin leer');
  const { data: nl } = await rogelio.rpc('mis_no_leidos');
  check(nl >= 1, 'La pestaña Mensajes de Rogelio tiene insignia', nl);
  av = await avisosDe(rogelioId, a);
  check(av.at(-1).titulo === 'Mariana G.' && av.at(-1).cuerpo === 'Hola, ¿trae escalera?' && av.at(-1).datos.ir === 'chat', 'Aviso para Rogelio con el mensaje');
  const { data: leidos } = await rogelio.rpc('marcar_leidos', { p_request_id: a });
  check(leidos === 1, 'Rogelio abre la conversación: se marca leído');
  const { data: msgM } = await mariana.from('messages').select('read_at').eq('request_id', a);
  check(msgM?.[0]?.read_at, 'Mariana ve "Visto"');
  const { data: leidosJ } = await jorge.rpc('marcar_leidos', { p_request_id: a });
  check(leidosJ === 0, 'Otro no puede marcar como leído');
  r = await jorge.from('messages').insert({ request_id: a, sender_id: (await jorge.auth.getUser()).data.user!.id, type: 'text', body: 'hola' });
  check(r.error, 'Otro no puede escribir en esa conversación');
  const { data: ajenos } = await jorge.from('messages').select('id').eq('request_id', a);
  check(!ajenos?.length, 'Ni leerla');
  r = await mariana.from('messages').insert({ request_id: a, sender_id: marianaId, type: 'text', body: 'x'.repeat(2001) });
  check(r.error, 'Un mensaje de texto tiene tope de 2,000 caracteres');

  console.log('\nA3.3 · Fotos, notas de voz, video y ubicación');
  let up = await mariana.storage.from('chat-media').upload(`${a}/foto.jpg`, JPG, { contentType: 'image/jpeg' });
  r = await mariana.from('messages').insert({ request_id: a, sender_id: marianaId, type: 'image', media_url: `${a}/foto.jpg` });
  check(!up.error && !r.error, 'Mariana manda una foto', up.error?.message ?? r.error?.message);
  const { data: firma } = await rogelio.storage.from('chat-media').createSignedUrl(`${a}/foto.jpg`, 60);
  check(firma?.signedUrl, 'Rogelio la abre con un enlace firmado');
  const { data: firmaJ } = await jorge.storage.from('chat-media').createSignedUrl(`${a}/foto.jpg`, 60);
  up = await jorge.storage.from('chat-media').upload(`${a}/intruso.jpg`, JPG, { contentType: 'image/jpeg' });
  check(!firmaJ?.signedUrl && up.error, 'Otro no puede ver ni subir archivos de esa conversación');
  r = await rogelio.from('messages').insert({ request_id: a, sender_id: rogelioId, type: 'audio', media_url: `${a}/nota.m4a`, duration_s: 121 });
  check(r.error, 'Nota de voz de más de 2 minutos no');
  r = await rogelio.from('messages').insert({ request_id: a, sender_id: rogelioId, type: 'audio', media_url: `${a}/nota.m4a`, duration_s: 18 });
  check(!r.error, 'Rogelio manda una nota de voz de 0:18', r.error?.message);
  r = await mariana.from('messages').insert({ request_id: a, sender_id: marianaId, type: 'video', media_url: `${a}/v.mp4`, duration_s: 31 });
  check(r.error, 'Video de más de 30 s no');
  r = await mariana.from('messages').insert({ request_id: a, sender_id: marianaId, type: 'location', lat: 120, lng: -98 });
  check(r.error, 'Ubicación inválida no');
  r = await mariana.from('messages').insert({ request_id: a, sender_id: marianaId, type: 'location', lat: 19.045, lng: -98.225, body: '25 Sur 1302, Col. La Paz' });
  check(!r.error, 'Mariana comparte su ubicación', r.error?.message);
  av = await avisosDe(marianaId, a);
  check(av.some((x) => x.cuerpo === 'Nota de voz (0:18)'), 'Aviso de nota de voz con su duración');
  av = await avisosDe(rogelioId, a);
  check(av.some((x) => x.cuerpo === 'Te mandó una foto') && av.some((x) => x.cuerpo === 'Te compartió una ubicación'), 'Avisos de foto y ubicación');

  console.log('\nB9.3 · Encabezado y "Cómo llegar"');
  let { data: info } = await rogelio.rpc('chat_info', { p_request_id: a });
  check(info.rol === 'prestador' && info.abierto && info.destino === null && info.colonia === 'La Paz', 'Antes de confirmar, Rogelio no tiene "Cómo llegar"');
  const antes = (await avisosDe(marianaId, a)).length;
  await rogelio.rpc('cotizar_solicitud', { p_request_id: a, p_precio: 350, p_hora: `${enDias(1)}T10:00:00-06:00`, p_mensaje: 'Sí llevo escalera.' });
  av = await avisosDe(marianaId, a);
  check(av.length === antes + 1 && av.at(-1).titulo === 'Rogelio cotizó $350' && av.at(-1).datos.ir === 'solicitud', 'Al cotizar llega un solo aviso ("cotizó $350"), no uno extra por el mensaje', av.slice(antes));
  await mariana.rpc('transition_request', { p_request_id: a, p_to: 'scheduled' });
  ({ data: info } = await rogelio.rpc('chat_info', { p_request_id: a }));
  check(info.destino && Math.abs(info.destino.lat - 19.045) < 0.01 && info.destino.direccion.includes('25 Sur'), 'Con la cita confirmada, Rogelio tiene "Cómo llegar"');
  const { data: infoM } = await mariana.rpc('chat_info', { p_request_id: a });
  check(infoM.rol === 'cliente' && infoM.destino === null && infoM.responde_min != null, 'Mariana ve "responde en ~N min" (y no hay "Cómo llegar" para ella)');
  av = await avisosDe(rogelioId, a);
  check(av.at(-1).titulo === 'Mariana G. confirmó la cita', 'Aviso a Rogelio: confirmó la cita');
  await rogelio.rpc('transition_request', { p_request_id: a, p_to: 'in_progress' });
  await mariana.rpc('transition_request', { p_request_id: a, p_to: 'completed' });
  r = await mariana.from('messages').insert({ request_id: a, sender_id: marianaId, type: 'text', body: '¡Gracias!' });
  check(r.error, 'Terminado el trabajo, la conversación queda solo para consulta');
  ({ data: info } = await mariana.rpc('chat_info', { p_request_id: a }));
  check(info.abierto === false, 'chat_info dice que está cerrada');
  await mariana.rpc('calificar_solicitud', { p_request_id: a, p_rating: 5, p_tags: ['puntual'] });
  av = await avisosDe(rogelioId, a);
  check(av.at(-1).titulo === 'Mariana G. te calificó con 5 ★' && av.at(-1).datos.ir === 'resenas', 'Aviso de reseña');
  const { data: misAvisos } = await mariana.from('avisos').select('user_id');
  check((misAvisos ?? []).every((x: any) => x.user_id === marianaId), 'Cada quien ve solo sus avisos');
  const ins = await mariana.from('avisos').insert({ user_id: rogelioId, titulo: 'x', cuerpo: 'x' });
  check(ins.error, 'Nadie puede crear avisos desde la app');

  console.log('\nTeléfonos');
  r = await mariana.rpc('registrar_dispositivo', { p_token: 'cualquier cosa', p_platform: 'ios' });
  check(r.error, 'Solo se aceptan tokens de Expo');
  await mariana.rpc('registrar_dispositivo', { p_token: TOKEN_M, p_platform: 'ios' });
  await rogelio.rpc('registrar_dispositivo', { p_token: TOKEN_R, p_platform: 'ios' });
  await rogelio.rpc('registrar_dispositivo', { p_token: TOKEN_MUERTO, p_platform: 'ios' });
  const { data: t1 } = await admin.from('push_tokens').select('user_id').eq('token', TOKEN_M).single();
  check(t1?.user_id === marianaId, 'Mariana registra su teléfono');
  await rogelio.rpc('registrar_dispositivo', { p_token: TOKEN_M, p_platform: 'ios' });
  const { data: t2 } = await admin.from('push_tokens').select('user_id').eq('token', TOKEN_M).single();
  check(t2?.user_id === rogelioId, 'Si Rogelio entra en ese mismo teléfono, el token pasa a Rogelio');
  await rogelio.rpc('olvidar_dispositivo', { p_token: TOKEN_M });
  await mariana.rpc('registrar_dispositivo', { p_token: TOKEN_M, p_platform: 'ios' });
  const { data: tokensM } = await mariana.from('push_tokens').select('token');
  check((tokensM ?? []).every((t: any) => t.token === TOKEN_M), 'Cada quien ve solo sus teléfonos');

  console.log('\nEnvío por Expo Push (Expo de mentira)');
  const b = await nueva();
  await mariana.from('messages').insert({ request_id: b, sender_id: marianaId, type: 'text', body: '¿Puede hoy?' });
  await rogelio.from('messages').insert({ request_id: b, sender_id: rogelioId, type: 'text', body: 'Sí, en la tarde.' });
  let vuelta = await enviarAvisos();
  for (let i = 0; i < 5 && vuelta.enviados + vuelta.sinTelefono + vuelta.fallidos > 0; i++) vuelta = await enviarAvisos();
  const aRogelio = recibidos.filter((m) => m.to === TOKEN_R && m.data?.requestId === b);
  const aMariana = recibidos.filter((m) => m.to === TOKEN_M && m.data?.requestId === b);
  check(aRogelio.some((m) => m.title === 'Nueva solicitud: Visita de diagnóstico') && aRogelio.some((m) => m.body === '¿Puede hoy?'), 'A Rogelio le llegan "Nueva solicitud" y el mensaje', aRogelio.map((m) => m.title));
  check(aMariana.length === 1 && aMariana[0].title === 'Rogelio Hernández' && aMariana[0].body === 'Sí, en la tarde.' && aMariana[0].data.ir === 'chat', 'A Mariana le llega la respuesta de Rogelio, con a dónde abrir');
  const pendientes = (await avisosDe(rogelioId, b)).filter((x) => !x.enviado_at);
  check(!pendientes.length, 'Los avisos quedan marcados como enviados');
  const { data: muerto } = await admin.from('push_tokens').select('token').eq('token', TOKEN_MUERTO);
  check(!muerto?.length, 'El teléfono que Expo ya no reconoce se borra');

  console.log('\nPerfil → Notificaciones');
  r = await mariana.rpc('aviso_de_prueba');
  check(!r.error, 'Aviso de prueba', r.error?.message);
  r = await mariana.rpc('aviso_de_prueba');
  check(r.error?.message.includes('minuto'), 'Uno por minuto', r.error?.message);
} finally {
  await limpiar();
  mock.close();
}
console.log(`\nTodo en orden: ${paso} comprobaciones del Sprint 4B.\n`);
process.exit(0);
