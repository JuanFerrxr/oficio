// Comprueba el Sprint 3B · Respuestas y reseñas contra tu Supabase LOCAL: la bandeja del
// prestador, cotizar, rechazar, confirmar, terminar y calificar, y las reseñas de un prestador.
// No necesita la API. Corre después de "npm run demo".
//
//   npm run respuestas
//
// Lo que crea (solicitudes con "PRUEBA 3B" en la descripción) lo borra al terminar.
import { readFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL!;
if (!/127\.0\.0\.1|localhost/.test(URL)) {
  console.error('Este script solo corre contra Supabase local. SUPABASE_URL =', URL);
  process.exit(1);
}
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const PASS = 'Oficio2026!';
const JPG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64',
);
const MARCA = 'PRUEBA 3B';

let paso = 0;
const check = (cond: unknown, msg: string, detalle?: unknown) => {
  if (!cond) throw new Error(`FALLÓ: ${msg}${detalle !== undefined ? ` (${JSON.stringify(detalle)})` : ''}`);
  console.log(`  ✔ ${++paso}. ${msg}`);
};
const enDias = (n: number) => new Date(Date.now() + n * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
const manana10 = () => `${enDias(1)}T10:00:00-06:00`;

async function entrar(email: string): Promise<{ db: SupabaseClient; id: string }> {
  const db = createClient(URL, process.env.SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.auth.signInWithPassword({ email, password: PASS });
  if (error) throw new Error(`No pude entrar como ${email}. ¿Corriste "npm run demo"? (${error.message})`);
  return { db, id: data.user!.id };
}

const { db: mariana, id: marianaId } = await entrar('mariana@demo.mx');
const { db: rogelio, id: rogelioId } = await entrar('rogelio@demo.mx');
const { db: jorge } = await entrar('jorge@demo.mx');
const { data: svc } = await admin.from('provider_services').select('id, category_id, title, price_mxn').eq('provider_id', rogelioId).eq('title', 'Visita de diagnóstico').single();
const { data: dir } = await admin.from('addresses').select('id').eq('user_id', marianaId).eq('is_default', true).single();
const { data: favAntes } = await admin.from('client_favorites').select('provider_id').eq('client_id', marianaId).eq('provider_id', rogelioId);
const { data: perfilAntes } = await admin.from('provider_profiles').select('rating_count, jobs_completed, avg_response_minutes').eq('user_id', rogelioId).single();

async function limpiar() {
  const { data: reqs } = await admin.from('service_requests').select('id, reviews(id)').like('description', `${MARCA}%`);
  for (const r of (reqs ?? []) as { id: string; reviews: { id: string }[] }[]) {
    for (const v of r.reviews) {
      const { data: archivos } = await admin.storage.from('review-media').list(v.id);
      if (archivos?.length) await admin.storage.from('review-media').remove(archivos.map((a) => `${v.id}/${a.name}`));
    }
  }
  for (const r of reqs ?? []) {
    const { data: archivos } = await admin.storage.from('request-media').list(r.id);
    if (archivos?.length) await admin.storage.from('request-media').remove(archivos.map((x) => `${r.id}/${x.name}`));
  }
  if (reqs?.length) await admin.from('service_requests').delete().in('id', reqs.map((r) => r.id));
  if (!favAntes?.length) await admin.from('client_favorites').delete().eq('client_id', marianaId).eq('provider_id', rogelioId);
  if (perfilAntes) await admin.from('provider_profiles').update({ avg_response_minutes: perfilAntes.avg_response_minutes }).eq('user_id', rogelioId);
}

async function nueva(extra: Record<string, unknown> = {}) {
  const { data, error } = await mariana.from('service_requests').insert({
    client_id: marianaId, provider_id: rogelioId, service_id: svc!.id, category_id: svc!.category_id, address_id: dir!.id,
    description: `${MARCA} · se bota la pastilla con el microondas`, preferred_dates: [enDias(1)], time_windows: ['morning'],
    preferred_payment_methods: ['cash'], ...extra,
  }).select('id').single();
  if (error) throw error;
  return data!.id as string;
}
const bandeja = async (db: SupabaseClient, id: string) => ((await db.rpc('bandeja_prestador')).data ?? []).find((r: any) => r.id === id);
const delCliente = async (id: string) => ((await mariana.rpc('mis_solicitudes')).data ?? []).find((r: any) => r.id === id);

try {
  await limpiar();
  console.log('\nB4 · Bandeja del prestador');
  const a = await nueva();
  let b = await bandeja(rogelio, a);
  check(b && b.cliente === 'Mariana G.' && b.colonia === 'La Paz' && Number(b.distancia_km) > 0, 'Llega a su bandeja con "Mariana G.", colonia y distancia', b && { c: b.cliente, col: b.colonia, km: b.distancia_km });
  check(b.direccion === null && b.telefono === null, 'Sin calle ni teléfono mientras no confirme');
  check(Number(b.precio_perfil) === Number(svc!.price_mxn) && b.servicio === 'Visita de diagnóstico', 'Trae el servicio y el precio de su perfil');
  check(!(await bandeja(jorge, a)) && !(await bandeja(mariana, a)), 'Nadie más la ve en su bandeja (ni otro prestador ni la clienta)');

  console.log('\nB4 · Detalle: fotos y video de la solicitud');
  for (const [i, m] of [{ ruta: `${a}/foto-1.jpg`, kind: 'image', tipo: 'image/jpeg', datos: JPG }, { ruta: `${a}/video.mp4`, kind: 'video', tipo: 'video/mp4', datos: readFileSync(new globalThis.URL('./demo-media/video.mp4', import.meta.url)) }].entries()) {
    const up = await mariana.storage.from('request-media').upload(m.ruta, m.datos, { contentType: m.tipo });
    if (up.error) throw up.error;
    const ins = await mariana.from('request_media').insert({ request_id: a, kind: m.kind, storage_path: m.ruta, sort_order: i, duration_s: m.kind === 'video' ? 6 : null });
    if (ins.error) throw ins.error;
  }
  b = await bandeja(rogelio, a);
  check(b.fotos.length === 1 && b.video === `${a}/video.mp4`, 'La bandeja sabe que trae 1 foto y 1 video', { f: b.fotos, v: b.video });
  const { data: medios } = await rogelio.from('request_media').select('kind, storage_path, duration_s').eq('request_id', a).order('sort_order');
  const { data: firmadas } = await rogelio.storage.from('request-media').createSignedUrls((medios ?? []).map((m: any) => m.storage_path), 3600);
  check(medios?.length === 2 && firmadas?.every((f: any) => !!f.signedUrl), 'Rogelio abre la foto y el video con enlaces firmados');
  const video = await fetch(firmadas!.find((f: any) => f.path.endsWith('.mp4'))!.signedUrl!);
  check(video.ok && Number(video.headers.get('content-length') ?? (await video.arrayBuffer()).byteLength) > 1000, 'El video se descarga completo');
  const { data: ajenos } = await jorge.from('request_media').select('id').eq('request_id', a);
  const { data: firmaAjena } = await jorge.storage.from('request-media').createSignedUrls([`${a}/video.mp4`], 60);
  check(!ajenos?.length && !firmaAjena?.[0]?.signedUrl, 'Otro prestador no ve ni puede abrir los archivos');
  const { data: hist } = await rogelio.from('request_events').select('to_status').eq('request_id', a);
  check(Array.isArray(hist), 'Rogelio puede leer el historial de la solicitud');

  await rogelio.rpc('mark_request_viewed', { p_request_id: a });
  check(!!(await delCliente(a)).viewed_at, 'Al abrirla, Mariana la ve como "Vista"');

  console.log('\nB5 · Aceptar y cotizar');
  let r = await rogelio.rpc('cotizar_solicitud', { p_request_id: a, p_precio: 0, p_hora: manana10() });
  check(r.error?.message.includes('precio'), 'Sin precio no se puede', r.error?.message);
  r = await rogelio.rpc('cotizar_solicitud', { p_request_id: a, p_precio: 350, p_hora: new Date(Date.now() - 3_600_000).toISOString() });
  check(r.error?.message.includes('hora'), 'Con una hora que ya pasó no se puede', r.error?.message);
  r = await mariana.rpc('cotizar_solicitud', { p_request_id: a, p_precio: 350, p_hora: manana10() });
  check(r.error, 'La clienta no puede cotizar su propia solicitud', r.error?.message);
  r = await rogelio.rpc('cotizar_solicitud', { p_request_id: a, p_precio: 350, p_hora: manana10(), p_mensaje: 'Llevo multímetro.' });
  check(!r.error && r.data.status === 'accepted' && Number(r.data.quoted_price_mxn) === 350, 'Rogelio cotiza $350 para mañana a las 10:00', r.error?.message);
  const c = await delCliente(a);
  check(c.status === 'accepted' && c.nota_estado === 'Llevo multímetro.', 'Mariana ve la cotización y el mensaje');
  const { data: msgs } = await mariana.from('messages').select('body, sender_id').eq('request_id', a);
  check(msgs?.length === 1 && msgs[0].sender_id === rogelioId, 'El mensaje queda como primera línea del chat');
  const { data: pr } = await admin.from('provider_profiles').select('avg_response_minutes').eq('user_id', rogelioId).single();
  check(pr!.avg_response_minutes != null && pr!.avg_response_minutes >= 1, 'Su tiempo de respuesta se recalcula con respuestas reales', pr);
  r = await rogelio.rpc('cotizar_solicitud', { p_request_id: a, p_precio: 400, p_hora: manana10() });
  check(r.error, 'No se puede cotizar dos veces');

  console.log('\nA3.1 · La clienta confirma, el prestador inicia, la clienta termina');
  r = await rogelio.rpc('transition_request', { p_request_id: a, p_to: 'scheduled' });
  check(r.error, 'El prestador no puede confirmar por ella');
  r = await mariana.rpc('transition_request', { p_request_id: a, p_to: 'scheduled' });
  check(!r.error, 'Mariana confirma la cita', r.error?.message);
  b = await bandeja(rogelio, a);
  check(b.status === 'scheduled' && !!b.direccion && !!b.telefono, 'Con la cita confirmada, Rogelio ve la calle y el teléfono');
  r = await mariana.rpc('calificar_solicitud', { p_request_id: a, p_rating: 5 });
  check(r.error?.message.includes('terminado'), 'No se puede calificar antes de terminar', r.error?.message);
  check(!(await rogelio.rpc('transition_request', { p_request_id: a, p_to: 'in_progress' })).error, 'Rogelio inicia el trabajo');
  check(!(await mariana.rpc('transition_request', { p_request_id: a, p_to: 'completed' })).error, 'Mariana marca "Ya terminó"');
  b = await bandeja(rogelio, a);
  check(b.status === 'completed' && b.telefono === null && b.respondida_at !== null, 'Terminada: deja de mostrarse el teléfono y queda la hora en que respondió');

  console.log('\nA8 · Calificar');
  r = await rogelio.rpc('calificar_solicitud', { p_request_id: a, p_rating: 5 });
  check(r.error, 'El prestador no puede calificarse');
  r = await mariana.rpc('calificar_solicitud', { p_request_id: a, p_rating: 6 });
  check(r.error, 'Más de 5 estrellas no');
  r = await mariana.rpc('calificar_solicitud', { p_request_id: a, p_rating: 5, p_tags: ['inventada'] });
  check(r.error?.message.includes('Etiqueta'), 'Etiquetas solo de la lista', r.error?.message);
  const directo = await mariana.from('reviews').insert({ request_id: a, reviewer_id: marianaId, reviewee_id: rogelioId, rating: 5 });
  check(directo.error, 'Ya no se puede insertar una reseña directo en la tabla');
  r = await mariana.rpc('calificar_solicitud', {
    p_request_id: a, p_rating: 4, p_tags: ['puntual', 'explico_bien', 'puntual'], p_comment: `${MARCA} · buen trabajo`, p_pago: 380, p_favorito: true,
  });
  check(!r.error && typeof r.data === 'string', 'Mariana publica 4 ★ con etiquetas, comentario, pago y favorito', r.error?.message);
  const resenaId = r.data as string;
  const { data: v } = await admin.from('reviews').select('rating, tags').eq('id', resenaId).single();
  check(v!.rating === 4 && v!.tags.length === 2, 'Las etiquetas repetidas se guardan una vez', v);
  check(Number((await delCliente(a)).final_price_mxn) === 380 && (await delCliente(a)).mi_calificacion === 4, 'Se guarda cuánto pagó y su calificación');
  const { data: fav } = await admin.from('client_favorites').select('provider_id').eq('client_id', marianaId).eq('provider_id', rogelioId);
  check(fav?.length === 1, 'Rogelio queda en sus favoritos');
  const { data: despues } = await admin.from('provider_profiles').select('rating_count, jobs_completed').eq('user_id', rogelioId).single();
  check(despues!.rating_count === perfilAntes!.rating_count + 1 && despues!.jobs_completed === perfilAntes!.jobs_completed + 1, 'Su calificación y sus trabajos se recalculan solos', { antes: perfilAntes, despues });
  b = await bandeja(rogelio, a);
  check(b.calificacion === 4 && Number(b.final_price_mxn) === 380, 'Rogelio ve "Te calificó con 4 ★" y lo que cobró');
  r = await mariana.rpc('calificar_solicitud', { p_request_id: a, p_rating: 5 });
  check(r.error?.message.includes('Ya calificaste'), 'No se puede calificar dos veces', r.error?.message);

  console.log('\nA8 · Fotos de la reseña');
  for (let i = 1; i <= 3; i++) {
    const up = await mariana.storage.from('review-media').upload(`${resenaId}/${i}.jpg`, JPG, { contentType: 'image/jpeg' });
    if (up.error) throw up.error;
    const ins = await mariana.from('review_media').insert({ review_id: resenaId, storage_path: `${resenaId}/${i}.jpg`, sort_order: i });
    if (ins.error) throw ins.error;
  }
  const cuarta = await mariana.from('review_media').insert({ review_id: resenaId, storage_path: `${resenaId}/4.jpg`, sort_order: 4 });
  check(cuarta.error?.message.includes('3 fotos'), 'Sube 3 fotos; la cuarta no', cuarta.error?.message);
  const ajena = await jorge.storage.from('review-media').upload(`${resenaId}/x.jpg`, JPG, { contentType: 'image/jpeg' });
  check(ajena.error, 'Otra persona no puede subir fotos a esa reseña');

  console.log('\nA5.1 · B7 · Reseñas del prestador');
  const { data: lista } = await jorge.rpc('resenas_prestador', { p_provider: rogelioId });
  const mia = (lista ?? []).find((x: any) => x.id === resenaId);
  check(mia && mia.autor === 'Mariana G.' && mia.fotos.length === 3 && mia.servicio === 'Visita de diagnóstico', 'Cualquier cliente la ve: "Mariana G.", 3 fotos y el servicio', mia && { a: mia.autor, f: mia.fotos.length });
  check(!(lista ?? []).some((x: any) => /García/.test(x.autor ?? '')), 'Nunca sale el apellido completo');
  const { data: res } = await jorge.rpc('resumen_resenas', { p_provider: rogelioId });
  const suma = Object.values(res.por_estrella as Record<string, number>).reduce((s, n) => s + n, 0);
  check(suma === res.rating_count && res.etiquetas.puntual >= 1 && res.fotos >= 3, 'Resumen: estrellas, etiquetas y fotos cuadran', { suma, count: res.rating_count });
  const { data: pendiente } = await admin.from('provider_profiles').select('user_id').neq('verification_status', 'verified').limit(1);
  if (pendiente?.length) {
    const { data: oculto } = await mariana.rpc('resumen_resenas', { p_provider: pendiente[0].user_id });
    check(oculto === null, 'De un prestador sin verificar no se ve nada');
  }

  console.log('\nB4 · Rechazar con motivo');
  const d = await nueva();
  r = await rogelio.rpc('rechazar_solicitud', { p_request_id: d, p_motivo: 'porque si' });
  check(r.error?.message.includes('motivo'), 'Hay que elegir un motivo válido', r.error?.message);
  r = await rogelio.rpc('rechazar_solicitud', { p_request_id: d, p_motivo: 'sin_disponibilidad', p_nota: 'Esta semana estoy lleno' });
  check(!r.error && r.data.status === 'declined' && r.data.decline_reason === 'sin_disponibilidad', 'Rogelio la rechaza: no tiene disponibilidad', r.error?.message);
  const cd = await delCliente(d);
  check(cd.decline_reason === 'sin_disponibilidad' && cd.nota_estado === 'Esta semana estoy lleno', 'Mariana ve el motivo y la nota');

  console.log('\nB4 · Solicitudes vencidas');
  const e = await nueva();
  await admin.from('service_requests').update({ expires_at: new Date(Date.now() - 60_000).toISOString() }).eq('id', e);
  r = await rogelio.rpc('cotizar_solicitud', { p_request_id: e, p_precio: 350, p_hora: manana10() });
  check(r.error?.message.includes('expiró'), 'Pasadas las 2 horas ya no se puede cotizar', r.error?.message);

  console.log('\nB4 · Disponible');
  const off = await rogelio.from('provider_profiles').update({ is_available: false }).eq('user_id', rogelioId).select('is_available').single();
  const { data: busq } = await mariana.rpc('buscar_prestadores', { p_lat: 19.045, p_lng: -98.225 });
  check(!off.error && !(busq ?? []).some((p: any) => p.provider_id === rogelioId), 'Con "Disponible" apagado no aparece en las búsquedas', off.error?.message);
  await rogelio.from('provider_profiles').update({ is_available: true }).eq('user_id', rogelioId);
} finally {
  await limpiar();
  const { data: final } = await admin.from('provider_profiles').select('rating_count, jobs_completed').eq('user_id', rogelioId).single();
  if (final && perfilAntes && (final.rating_count !== perfilAntes.rating_count || final.jobs_completed !== perfilAntes.jobs_completed)) {
    console.log('  (aviso) Los números de Rogelio no regresaron a como estaban', { antes: perfilAntes, final });
  }
}
console.log(`\nTodo en orden: ${paso} comprobaciones del Sprint 3B.\n`);
