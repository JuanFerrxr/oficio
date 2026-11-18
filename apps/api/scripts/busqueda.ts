// Comprueba el Sprint 3A · Búsqueda y solicitudes contra tu Supabase LOCAL: buscar prestadores,
// su perfil público, favoritos, direcciones y enviar una solicitud con fotos. No necesita la API.
// Corre después de "npm run demo" (usa a Mariana y a los prestadores de prueba).
//
//   npm run busqueda
//
// Lo que crea (solicitudes con "PRUEBA" en la descripción, direcciones "Prueba…") lo borra al terminar.
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
// La Paz, Puebla (la dirección de Mariana en npm run demo)
const LAT = 19.045, LNG = -98.225;

let paso = 0;
const check = (cond: unknown, msg: string, detalle?: unknown) => {
  if (!cond) throw new Error(`FALLÓ: ${msg}${detalle !== undefined ? ` (${JSON.stringify(detalle)})` : ''}`);
  console.log(`  ✔ ${++paso}. ${msg}`);
};
const enDias = (n: number) => new Date(Date.now() + n * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });

async function entrar(email: string): Promise<{ db: SupabaseClient; id: string }> {
  const db = createClient(URL, process.env.SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.auth.signInWithPassword({ email, password: PASS });
  if (error) throw new Error(`No pude entrar como ${email}. ¿Corriste "npm run demo"? (${error.message})`);
  return { db, id: data.user!.id };
}

const { db: mariana, id: marianaId } = await entrar('mariana@demo.mx');
const { db: rogelio, id: rogelioId } = await entrar('rogelio@demo.mx');
const { id: jorgeId } = await entrar('jorge@demo.mx');
const { data: cats } = await admin.from('categories').select('id, slug');
const cat = (slug: string) => cats!.find((c) => c.slug === slug)!.id;

async function limpiar() {
  const { data: reqs } = await admin.from('service_requests').select('id').like('description', 'PRUEBA%');
  for (const r of reqs ?? []) {
    const { data: archivos } = await admin.storage.from('request-media').list(r.id);
    if (archivos?.length) await admin.storage.from('request-media').remove(archivos.map((a) => `${r.id}/${a.name}`));
  }
  if (reqs?.length) await admin.from('service_requests').delete().in('id', reqs.map((r) => r.id));
  await admin.from('addresses').delete().eq('user_id', marianaId).like('label', 'Prueba%');
  await admin.from('client_favorites').delete().eq('client_id', marianaId);
  // Un prestador sin verificar para comprobar que no aparece
  await admin.from('provider_profiles').update({ verification_status: 'verified' }).eq('user_id', jorgeId);
}
await limpiar();

console.log('\nA3.0 · A4 · Buscar\n');
let r: any = await mariana.rpc('match_categories', { p_text: 'se me bota la pastilla de la luz' });
check(r.data?.[0]?.slug === 'electricidad', '"Se me bota la pastilla" → Electricidad', r.data);
r = await mariana.rpc('servicios_relacionados', { p_category: cat('electricidad') });
check(r.data?.some((s: any) => s.titulo === 'Visita de diagnóstico'), 'Servicios relacionados de Electricidad', r.data);

r = await mariana.rpc('buscar_prestadores', { p_lat: LAT, p_lng: LNG, p_category: cat('electricidad') });
const nombres = (r.data ?? []).map((p: any) => p.full_name);
check(['Rogelio Hernández', 'Jorge Cuautle', 'Ana Pérez', 'Miguel Tlapa'].every((n) => nombres.includes(n)), 'Encuentra a los 4 electricistas verificados cerca', nombres);
const kms = (r.data ?? []).map((p: any) => Number(p.distance_km));
check(kms.every((k: number, i: number) => i === 0 || k >= kms[i - 1]), 'Ordenados por distancia', kms);
const rog = r.data.find((p: any) => p.full_name === 'Rogelio Hernández');
check(rog.oficio === 'Electricidad' && Number(rog.precio_desde) === 250 && Number(rog.rating_avg) > 0 && rog.rating_count > 0, 'La tarjeta trae oficio, precio desde y calificación', rog);
const ana = r.data.find((p: any) => p.full_name === 'Ana Pérez');
check(ana.precio_tipo === 'quote' && ana.precio_desde === null, 'Si solo cotiza, la tarjeta lo dice (sin precio)', ana);
check(!('phone' in rog) && !('base_location' in rog), 'La búsqueda no devuelve teléfonos ni ubicaciones exactas', Object.keys(rog));

r = await mariana.rpc('buscar_prestadores', { p_lat: LAT, p_lng: LNG, p_category: cat('electricidad'), p_min_rating: 4.8 });
check(r.data.every((p: any) => Number(p.rating_avg) >= 4.8) && r.data.length >= 2, 'Filtro "4.5 o más" (aquí 4.8)', r.data.map((p: any) => p.rating_avg));
r = await mariana.rpc('buscar_prestadores', { p_lat: LAT, p_lng: LNG, p_category: cat('electricidad'), p_max_km: 2 });
check(r.data.every((p: any) => Number(p.distance_km) <= 2), 'Filtro de distancia ("Hasta 2 km")', r.data.map((p: any) => p.distance_km));
r = await mariana.rpc('buscar_prestadores', { p_lat: LAT, p_lng: LNG, p_category: cat('electricidad'), p_solo_hoy: true });
check(!r.error, 'Filtro "Hoy" (solo quien trabaja hoy)', r.error);
r = await mariana.rpc('buscar_prestadores', { p_lat: LAT, p_lng: LNG, p_orden: 'calificacion', p_limit: 5 });
const ratings = r.data.map((p: any) => Number(p.rating_avg));
check(r.data.length === 5 && ratings.every((x: number, i: number) => i === 0 || x <= ratings[i - 1]), '"Mejor calificados cerca": todos los oficios, por calificación', ratings);

await admin.from('provider_profiles').update({ verification_status: 'pending' }).eq('user_id', jorgeId);
r = await mariana.rpc('buscar_prestadores', { p_lat: LAT, p_lng: LNG, p_category: cat('electricidad') });
check(!r.data.some((p: any) => p.provider_id === jorgeId), 'Un prestador sin verificar no aparece', r.data.map((p: any) => p.full_name));
r = await mariana.rpc('perfil_prestador', { p_provider: jorgeId });
check(r.data === null, '…ni se puede abrir su perfil');
await admin.from('provider_profiles').update({ verification_status: 'verified' }).eq('user_id', jorgeId);

console.log('\nA5 · Perfil del prestador y favoritos\n');
r = await mariana.rpc('perfil_prestador', { p_provider: rogelioId });
const perfil = r.data;
check(perfil?.full_name === 'Rogelio Hernández' && perfil.verificado, 'Perfil público de Rogelio', r.error ?? perfil?.full_name);
check(perfil.servicios.length === 3 && perfil.certificaciones.length === 2, 'Con sus 3 servicios y 2 certificaciones revisadas', { s: perfil.servicios.length, c: perfil.certificaciones.length });
check(JSON.stringify(perfil.payment_methods) === '["cash","transfer"]' && perfil.dias.length === 6, 'Con formas de pago y días que trabaja', { p: perfil.payment_methods, d: perfil.dias });
check(!JSON.stringify(perfil).includes('522221112233') && !('phone' in perfil), 'Sin su teléfono');
r = await mariana.from('client_favorites').insert({ client_id: marianaId, provider_id: rogelioId });
check(!r.error, 'Marca a Rogelio como favorito', r.error);
r = await mariana.rpc('home_favorites');
check(r.data?.some((f: any) => f.provider_id === rogelioId && f.reason === 'favorite'), 'Aparece en "Tus favoritos"', r.data);
r = await mariana.rpc('buscar_prestadores', { p_lat: LAT, p_lng: LNG, p_ids: [rogelioId] });
check(r.data?.[0]?.full_name === 'Rogelio Hernández', 'La tarjeta del favorito se arma igual que en la búsqueda', r.data);

console.log('\nDirecciones guardadas\n');
r = await mariana.from('addresses').insert({
  user_id: marianaId, label: 'Prueba trabajo', street: '5 de Mayo', ext_number: '100', neighborhood: 'Centro',
  municipality: 'Puebla', state: 'Puebla', postal_code: '72000', location: 'SRID=4326;POINT(-98.1980 19.0430)', is_default: true,
}).select('id').single();
check(!r.error, 'Agrega una dirección como principal', r.error);
const dirPrueba = r.data.id;
r = await mariana.from('addresses').select('label, is_default').eq('user_id', marianaId).eq('is_default', true);
check(r.data?.length === 1 && r.data[0].label === 'Prueba trabajo', 'Solo una dirección queda como principal', r.data);
r = await rogelio.from('addresses').select('id').eq('user_id', marianaId);
check(r.data?.length === 0, 'Un prestador no puede ver las direcciones de la clienta');
await admin.from('addresses').update({ is_default: true }).eq('user_id', marianaId).eq('label', 'Casa');

console.log('\nA6 · Enviar la solicitud\n');
const { data: servRog } = await admin.from('provider_services').select('id, category_id, title').eq('provider_id', rogelioId).eq('title', 'Visita de diagnóstico').single();
const { data: servJorge } = await admin.from('provider_services').select('id').eq('provider_id', jorgeId).limit(1).single();
const base = {
  client_id: marianaId, provider_id: rogelioId, service_id: servRog!.id, category_id: servRog!.category_id, address_id: dirPrueba,
  description: 'PRUEBA · Se bota la pastilla cada vez que prendo el microondas y la cafetera juntos.',
  urgency: 'this_week', preferred_dates: [enDias(1), enDias(2)], time_windows: ['morning', 'afternoon'], preferred_payment_methods: ['cash', 'transfer'],
};
r = await mariana.from('service_requests').insert({ ...base, preferred_dates: [enDias(-1)] });
check(r.error?.message?.includes('ya pasaron'), 'No acepta días que ya pasaron', r.error?.message);
r = await mariana.from('service_requests').insert({ ...base, preferred_payment_methods: ['card'] });
check(r.error?.message?.includes('forma de pago'), 'No acepta una forma de pago que Rogelio no recibe', r.error?.message);
r = await mariana.from('service_requests').insert({ ...base, service_id: servJorge!.id });
check(r.error?.message?.includes('servicio'), 'No acepta un servicio de otro prestador', r.error?.message);
r = await mariana.from('service_requests').insert({ ...base, description: 'PRUEBA' });
check(r.error, 'La descripción necesita al menos 10 caracteres');
r = await mariana.from('service_requests').insert({ ...base, time_windows: ['madrugada'] });
check(r.error?.message?.includes('Horario'), 'Solo franjas válidas (mañana, tarde, noche, cualquier hora)', r.error?.message);
r = await mariana.from('service_requests').insert({ ...base, status: 'accepted' } as never);
check(r.error, 'No puede crearla ya aceptada');
r = await mariana.from('service_requests').insert(base).select('id, status, expires_at').single();
check(r.data?.status === 'pending', 'Envía la solicitud: queda "Enviada" (pendiente)', r.error);
const solicitud = r.data.id;
check(new Date(r.data.expires_at).getTime() - Date.now() > 110 * 60_000, 'Rogelio tiene 2 horas para responder', r.data.expires_at);

for (let i = 1; i <= 2; i++) {
  const sub = await mariana.storage.from('request-media').upload(`${solicitud}/foto-${i}.jpg`, JPG, { contentType: 'image/jpeg' });
  if (sub.error) throw sub.error;
  const ins = await mariana.from('request_media').insert({ request_id: solicitud, kind: 'image', storage_path: `${solicitud}/foto-${i}.jpg`, sort_order: i });
  if (ins.error) throw ins.error;
}
check(true, 'Sube 2 fotos a request-media/<solicitud>/');
r = await rogelio.storage.from('request-media').download(`${solicitud}/foto-1.jpg`);
check(!r.error, 'Rogelio (el prestador de la solicitud) puede ver las fotos', r.error);
const { db: jorge } = await entrar('jorge@demo.mx');
r = await jorge.storage.from('request-media').download(`${solicitud}/foto-1.jpg`);
check(r.error, 'Otro prestador NO puede ver las fotos');
for (let i = 3; i <= 5; i++) await mariana.from('request_media').insert({ request_id: solicitud, kind: 'image', storage_path: `${solicitud}/foto-${i}.jpg` });
r = await mariana.from('request_media').insert({ request_id: solicitud, kind: 'image', storage_path: `${solicitud}/foto-6.jpg` });
check(r.error, 'Máximo 5 fotos por solicitud');

console.log('\nA3.1 · Mis solicitudes\n');
r = await mariana.rpc('mis_solicitudes');
const mia = r.data?.find((s: any) => s.id === solicitud);
check(mia?.provider_name === 'Rogelio Hernández' && mia.servicio === 'Visita de diagnóstico' && mia.categoria === 'Electricidad', 'Aparece en sus solicitudes con prestador y servicio', mia);
check(mia.direccion.includes('5 de Mayo 100') && mia.status === 'pending' && mia.viewed_at === null, 'Con la dirección y el estado "Enviada"', mia);
r = await rogelio.rpc('mis_solicitudes');
check(!r.data?.some((s: any) => s.id === solicitud), 'Rogelio no la ve en "mis solicitudes" (es de la clienta)');
r = await rogelio.from('service_requests').select('id, description').eq('id', solicitud).single();
check(r.data?.id === solicitud, 'Pero sí la recibe (es su solicitud) — su bandeja llega en el Sprint 3B', r.error);

await limpiar();
console.log('\nTodo en orden: buscar y solicitar funciona como en Figma.\n');
