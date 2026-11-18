// Comprueba el Sprint 2 · Alta de prestador contra tu Supabase LOCAL: la migración
// 20261125000000_alta_prestador (funciones, reglas de quién ve qué) y los archivos en Storage.
// No necesita la API. Corre después de "npm run demo" (usa a Mariana como "otra persona").
//
//   npm run alta
//
// Usa el correo alta@prueba.mx: lo borra al empezar y al terminar.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL!;
if (!/127\.0\.0\.1|localhost/.test(URL)) {
  console.error('Este script solo corre contra Supabase local. SUPABASE_URL =', URL);
  process.exit(1);
}
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const cliente = () => createClient(URL, process.env.SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

const CORREO = 'alta@prueba.mx';
const PASS = 'Oficio2026!';
// Una imagen JPEG mínima (1×1 px) para simular las fotos
const JPG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64',
);

let paso = 0;
const check = (cond: unknown, msg: string, detalle?: unknown) => {
  if (!cond) throw new Error(`FALLÓ: ${msg}${detalle !== undefined ? ` (${JSON.stringify(detalle)})` : ''}`);
  console.log(`  ✔ ${++paso}. ${msg}`);
};

async function limpiar() {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const u = data?.users.find((x) => x.email === CORREO);
  if (!u) return;
  for (const bucket of ['avatars', 'verification']) {
    const carpetas = bucket === 'verification' ? [u.id, `${u.id}/certificados`] : [u.id];
    for (const c of carpetas) {
      const { data: archivos } = await admin.storage.from(bucket).list(c);
      const rutas = (archivos ?? []).filter((a) => a.id).map((a) => `${c}/${a.name}`);
      if (rutas.length) await admin.storage.from(bucket).remove(rutas);
    }
  }
  await admin.auth.admin.deleteUser(u.id);
}

async function entrar(email: string): Promise<{ db: SupabaseClient; id: string }> {
  const db = cliente();
  const { data, error } = await db.auth.signInWithPassword({ email, password: PASS });
  if (error) throw new Error(`No pude entrar como ${email}. ¿Corriste "npm run demo"? (${error.message})`);
  return { db, id: data.user!.id };
}

const faltantes = async (db: SupabaseClient) => ((await db.rpc('mis_faltantes_alta')).data ?? []) as string[];

await limpiar();
const creado = await admin.auth.admin.createUser({
  email: CORREO, password: PASS, email_confirm: true,
  user_metadata: { full_name: 'Prestador de Prueba', accepted_terms: true, terms_version: '2026-11', intended_role: 'provider' },
});
if (creado.error) throw creado.error;
const { db: yo, id } = await entrar(CORREO);
const { db: otra } = await entrar('mariana@demo.mx');
const { data: cats } = await admin.from('categories').select('id, slug');
const cat = (slug: string) => cats!.find((c) => c.slug === slug)!.id;

console.log('\nB0.1 · Iniciar el alta\n');
let r: any = await yo.rpc('iniciar_alta_prestador', { p_years: 99, p_terms_version: '2026-11' });
check(r.error, 'Rechaza años de experiencia fuera de rango', r.error?.message);
r = await yo.rpc('iniciar_alta_prestador', { p_years: 12, p_terms_version: '2026-11' });
check(!r.error, 'Crea el perfil de prestador con los años de experiencia', r.error);
r = await yo.from('provider_profiles').select('years_experience, verification_status, terms_accepted_at, terms_version').eq('user_id', id).single();
check(r.data?.years_experience === 12 && r.data.verification_status === 'unverified', 'Empieza sin verificar', r.error ?? r.data);
check(r.data?.terms_accepted_at && r.data.terms_version === '2026-11', 'Guarda la aceptación de los Términos para prestadores (hora del servidor)', r.data);
r = await yo.from('provider_profiles').insert({ user_id: id, verification_status: 'verified' } as never);
check(r.error, 'No puede marcarse a sí mismo como verificado');

r = await yo.storage.from('avatars').upload(`${id}/foto-1.jpg`, JPG, { contentType: 'image/jpeg' });
check(!r.error, 'Sube su foto de perfil a avatars/<su id>/', r.error);
r = await yo.storage.from('avatars').upload('00000000-0000-0000-0000-000000000000/foto.jpg', JPG, { contentType: 'image/jpeg' });
check(r.error, 'No puede subir fotos a la carpeta de otra persona');
const avatarUrl = yo.storage.from('avatars').getPublicUrl(`${id}/foto-1.jpg`).data.publicUrl;
r = await yo.from('profiles').update({ avatar_url: avatarUrl }).eq('id', id).select('avatar_url');
check(r.data?.[0]?.avatar_url === avatarUrl, 'Guarda la foto en su perfil', r.data);

check((await faltantes(yo)).join(',') === 'servicios,zona,horario,ine_front,ine_back,selfie,proof_of_address',
  'Sabe qué le falta: servicios, zona, horario y documentos', await faltantes(yo));
r = await yo.rpc('enviar_a_revision');
check(r.error?.hint?.includes('servicios'), 'No deja enviar a revisión con el alta incompleta', r.error);

console.log('\nB1 · Servicios y certificaciones\n');
r = await yo.from('provider_services').insert([
  { provider_id: id, category_id: cat('electricidad'), title: 'Visita de diagnóstico', price_type: 'fixed', price_mxn: 350 },
  { provider_id: id, category_id: cat('electricidad'), title: 'Instalar contacto o apagador', price_type: 'fixed', price_mxn: 250 },
  { provider_id: id, category_id: cat('plomeria'), title: 'Reparar fuga', price_type: 'quote', price_mxn: null },
]).select('id');
check(r.data?.length === 3, 'Guarda 3 servicios (precio fijo y "Cotizo")', r.error);
r = await yo.from('provider_services').insert({ provider_id: id, category_id: cat('pintura'), title: 'Sin precio', price_type: 'fixed', price_mxn: null });
check(r.error, 'Un precio fijo necesita monto');
r = await yo.storage.from('verification').upload(`${id}/certificados/conalep.jpg`, JPG, { contentType: 'image/jpeg' });
check(!r.error, 'Sube un certificado a su carpeta privada', r.error);
r = await yo.from('provider_credentials').insert({ provider_id: id, title: 'Técnico en Electricidad', institution: 'CONALEP', year: 2012, storage_path: `${id}/certificados/conalep.jpg` }).select('id, status');
check(r.data?.[0]?.status === 'pending', 'La certificación queda pendiente de revisión', r.error);
const credId = r.data[0].id;
r = await otra.from('provider_credentials').select('id').eq('id', credId);
check(r.data?.length === 0, 'Otra persona no ve certificaciones sin revisar');

console.log('\nB2 · Zona, horario y formas de pago\n');
r = await yo.from('provider_profiles').update({ base_location: 'SRID=4326;POINT(-98.2063 19.0414)', service_radius_km: 8 }).eq('user_id', id).select('service_radius_km');
check(r.data?.[0]?.service_radius_km === 8, 'Guarda su ubicación y el radio de 8 km', r.error);
r = await yo.from('provider_profiles').update({ service_radius_km: 80 }).eq('user_id', id);
check(r.error, 'El radio no puede pasar de 50 km');
r = await yo.from('provider_profiles').update({ payment_methods: ['cash', 'transfer'] }).eq('user_id', id).select('payment_methods');
check(r.data?.[0]?.payment_methods?.join(',') === 'cash,transfer', 'Guarda sus formas de pago: efectivo y transferencia', r.error ?? r.data);
r = await yo.from('provider_profiles').update({ payment_methods: [] }).eq('user_id', id);
check(r.error, 'Tiene que aceptar al menos una forma de pago');
r = await yo.from('provider_availability').insert([1, 2, 3, 4, 5, 6].map((weekday) => ({ provider_id: id, weekday, start_time: '08:00', end_time: '19:00' })));
check(!r.error, 'Guarda el horario: lunes a sábado, 08:00 a 19:00', r.error);
r = await yo.from('provider_availability').insert({ provider_id: id, weekday: 0, start_time: '19:00', end_time: '08:00' });
check(r.error, 'La hora de fin tiene que ser después de la de inicio');

console.log('\nB3 · Documentos y envío a revisión\n');
for (const doc of ['ine_front', 'ine_back', 'selfie', 'proof_of_address']) {
  const ruta = `${id}/${doc}.jpg`;
  const sub = await yo.storage.from('verification').upload(ruta, JPG, { contentType: 'image/jpeg', upsert: true });
  if (sub.error) throw sub.error;
  const ins = await yo.from('verification_documents').insert({ provider_id: id, doc_type: doc, storage_path: ruta });
  if (ins.error) throw ins.error;
}
check((await faltantes(yo)).length === 0, 'Con INE, selfie y comprobante ya no le falta nada', await faltantes(yo));
r = await yo.storage.from('verification').upload(`${id}/selfie.jpg`, JPG, { contentType: 'image/jpeg', upsert: true });
check(!r.error, 'Puede reemplazar un documento (tomar otra selfie)', r.error);
r = await otra.storage.from('verification').download(`${id}/ine_front.jpg`);
check(r.error, 'Otra persona NO puede descargar su INE');
r = await yo.storage.from('verification').download(`${id}/ine_front.jpg`);
check(!r.error && r.data, 'Él sí puede ver su propia INE', r.error);

r = await yo.from('provider_services').insert({ provider_id: id, category_id: cat('nineras'), title: 'Cuidado por hora', price_type: 'hourly', price_mxn: 120 });
check(!r.error, 'Agrega un servicio de Niñeras', r.error);
check((await faltantes(yo)).join(',') === 'criminal_record', 'Niñeras pide además la constancia de antecedentes no penales', await faltantes(yo));
await yo.storage.from('verification').upload(`${id}/criminal_record.jpg`, JPG, { contentType: 'image/jpeg', upsert: true });
await yo.from('verification_documents').insert({ provider_id: id, doc_type: 'criminal_record', storage_path: `${id}/criminal_record.jpg` });

r = await otra.from('provider_profiles').select('user_id').eq('user_id', id);
check(r.data?.length === 0, 'Mientras no esté verificado, nadie más ve su perfil');
r = await otra.from('provider_services').select('id').eq('provider_id', id);
check(r.data?.length === 0, '…ni sus servicios');
r = await otra.rpc('search_providers', { p_category: cat('electricidad'), p_lat: 19.0414, p_lng: -98.2063, p_max_km: 10 });
check(!r.error && !r.data.some((p: { provider_id: string }) => p.provider_id === id), '…ni aparece en la búsqueda', r.error);
r = await otra.from('provider_profiles').select('user_id').eq('verification_status', 'verified');
check(r.data?.length >= 1, 'Los prestadores verificados (Rogelio) se siguen viendo', r.data);

r = await yo.rpc('enviar_a_revision');
check(r.data === 'pending', 'Envía su alta a revisión', r.error);
r = await yo.from('provider_profiles').select('verification_status, submitted_at').eq('user_id', id).single();
check(r.data?.verification_status === 'pending' && r.data.submitted_at, 'Queda "En revisión" con la fecha de envío', r.data);
r = await yo.from('provider_profiles').update({ verification_status: 'verified' } as never).eq('user_id', id);
check(r.error, 'No puede aprobarse a sí mismo');

await limpiar();
console.log('\nTodo en orden: el alta de prestador funciona como en Figma.\n');
