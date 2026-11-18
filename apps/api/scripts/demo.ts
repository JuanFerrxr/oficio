// Crea datos de prueba en tu Supabase LOCAL: una clienta, un prestador verificado,
// su servicio, horario y la dirección de la clienta. Al final imprime tokens de sesión
// para probar la API con curl. Se puede correr varias veces (reusa lo que ya existe).
//
//   npm run demo
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL!;
if (!/127\.0\.0\.1|localhost/.test(url)) {
  console.error('Este script solo corre contra Supabase local. SUPABASE_URL =', url);
  process.exit(1);
}
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const anon = createClient(url, process.env.SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const PASSWORD = 'Oficio2026!';

async function ensureUser(email: string, phone: string | undefined, full_name: string) {
  const { data: list } = await admin.auth.admin.listUsers();
  const found = list?.users.find((u) => u.email === email);
  if (found) return found.id;
  const { data, error } = await admin.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true,
    ...(phone ? { phone, phone_confirm: true } : {}),
    // Igual que el registro de la app (Sprint 1): constancia de que aceptó el aviso y los términos.
    user_metadata: { full_name, accepted_terms: true, terms_version: '2026-11' },
  });
  if (error) throw error;
  return data.user.id;
}

const must = <T>(r: { data: T; error: any }) => { if (r.error) throw r.error; return r.data; };

const mariana = await ensureUser('mariana@demo.mx', '+522224180937', 'Mariana García');
const rogelio = await ensureUser('rogelio@demo.mx', '+522221112233', 'Rogelio Hernández');

const elec = must(await admin.from('categories').select('id').eq('slug', 'electricidad').single()) as { id: number };

must(await admin.from('provider_profiles').upsert({
  user_id: rogelio, headline: 'Electricista residencial', years_experience: 12,
  base_location: 'SRID=4326;POINT(-98.2210 19.0500)', service_radius_km: 8,
  verification_status: 'verified', verified_at: new Date().toISOString(),
  payment_methods: ['cash', 'transfer'],
}));
const svc = must(await admin.from('provider_services').select('id').eq('provider_id', rogelio)) as unknown[];
if (!svc.length) {
  must(await admin.from('provider_services').insert([
    { provider_id: rogelio, category_id: elec.id, title: 'Visita de diagnóstico', price_type: 'fixed', price_mxn: 350 },
    { provider_id: rogelio, category_id: elec.id, title: 'Instalar contacto o apagador', price_type: 'fixed', price_mxn: 250 },
    { provider_id: rogelio, category_id: elec.id, title: 'Cambio de centro de carga', price_type: 'quote' },
  ]));
  must(await admin.from('provider_availability').insert(
    [1, 2, 3, 4, 5, 6].map((weekday) => ({ provider_id: rogelio, weekday, start_time: '08:00', end_time: '19:00' }))));
}
const addr = must(await admin.from('addresses').select('id').eq('user_id', mariana)) as unknown[];
if (!addr.length) {
  must(await admin.from('addresses').insert({
    user_id: mariana, label: 'Casa', street: '25 Sur', ext_number: '1302', neighborhood: 'La Paz',
    municipality: 'Puebla', state: 'Puebla', postal_code: '72160', is_default: true,
    location: 'SRID=4326;POINT(-98.2250 19.0450)',
  }));
}

// Rogelio: tiempo de respuesta inicial y certificaciones como en Figma (A5). Desde el Sprint 3B la
// calificación y los trabajos ya no se inventan: salen de las reseñas y solicitudes de abajo.
must(await admin.from('provider_profiles').update({ avg_response_minutes: 15 }).eq('user_id', rogelio));
const creds = must(await admin.from('provider_credentials').select('id').eq('provider_id', rogelio)) as unknown[];
if (!creds.length) {
  must(await admin.from('provider_credentials').insert([
    { provider_id: rogelio, title: 'Técnico en Electricidad', institution: 'CONALEP', year: 2012, status: 'verified', reviewed_at: new Date().toISOString() },
    { provider_id: rogelio, title: 'Certificación de competencia laboral', institution: 'CONOCER', year: 2019, status: 'verified', reviewed_at: new Date().toISOString() },
  ]));
}

// Sprint 3 · Prestadores de prueba ya verificados en colonias de Puebla, para que la búsqueda
// tenga a quién encontrar. Solo en local. Entran con su correo y la misma contraseña.
type Svc = { cat: string; title: string; type: 'fixed' | 'hourly' | 'quote'; price?: number };
const PRESTADORES: { email: string; nombre: string; colonia: string; lat: number; lng: number; anos: number; responde: number; radio: number; pagos: ('cash' | 'card' | 'transfer')[]; dias: number[]; desde: string; hasta: string; svc: Svc[] }[] = [
  { email: 'jorge@demo.mx', nombre: 'Jorge Cuautle', colonia: 'Huexotitla', lat: 19.0380, lng: -98.2120, anos: 9, responde: 25, radio: 10, pagos: ['cash', 'card'], dias: [1, 2, 3, 4, 5], desde: '09:00', hasta: '18:00',
    svc: [{ cat: 'electricidad', title: 'Visita de diagnóstico', type: 'fixed', price: 300 }, { cat: 'electricidad', title: 'Revisión de instalación', type: 'fixed', price: 450 }] },
  { email: 'ana@demo.mx', nombre: 'Ana Pérez', colonia: 'Volcanes', lat: 19.0280, lng: -98.2230, anos: 6, responde: 10, radio: 12, pagos: ['cash', 'transfer'], dias: [1, 2, 3, 4, 5, 6], desde: '08:00', hasta: '17:00',
    svc: [{ cat: 'electricidad', title: 'Revisión de instalación', type: 'quote' }, { cat: 'pintura', title: 'Pintar recámara', type: 'fixed', price: 1500 }] },
  { email: 'miguel@demo.mx', nombre: 'Miguel Tlapa', colonia: 'Gabriel Pastor', lat: 19.0400, lng: -98.1950, anos: 15, responde: 40, radio: 15, pagos: ['cash'], dias: [1, 2, 3, 4, 5, 6, 0], desde: '07:00', hasta: '20:00',
    svc: [{ cat: 'electricidad', title: 'Visita de diagnóstico', type: 'fixed', price: 280 }, { cat: 'electricidad', title: 'Cambio de pastilla térmica', type: 'fixed', price: 350 }] },
  { email: 'lucia@demo.mx', nombre: 'Lucía Morales', colonia: 'Centro', lat: 19.0435, lng: -98.1980, anos: 11, responde: 30, radio: 10, pagos: ['cash', 'transfer', 'card'], dias: [1, 2, 3, 4, 5, 6], desde: '08:00', hasta: '18:00',
    svc: [{ cat: 'pintura', title: 'Pintar recámara', type: 'fixed', price: 1200 }, { cat: 'pintura', title: 'Pintar sala', type: 'quote' }] },
  { email: 'luis@demo.mx', nombre: 'Luis Romero', colonia: 'Anzures', lat: 19.0560, lng: -98.2150, anos: 8, responde: 20, radio: 8, pagos: ['cash', 'transfer'], dias: [1, 2, 3, 4, 5, 6], desde: '08:00', hasta: '21:00',
    svc: [{ cat: 'plomeria', title: 'Reparar fuga', type: 'fixed', price: 300 }, { cat: 'plomeria', title: 'Destapar coladera', type: 'fixed', price: 350 }, { cat: 'plomeria', title: 'Instalar calentador', type: 'quote' }] },
  { email: 'patricia@demo.mx', nombre: 'Patricia Flores', colonia: 'El Carmen', lat: 19.0360, lng: -98.2000, anos: 10, responde: 15, radio: 10, pagos: ['cash', 'transfer'], dias: [1, 2, 3, 4, 5], desde: '08:00', hasta: '16:00',
    svc: [{ cat: 'limpieza', title: 'Limpieza general', type: 'hourly', price: 90 }] },
  { email: 'sofia@demo.mx', nombre: 'Sofía Ramírez', colonia: 'La Paz', lat: 19.0470, lng: -98.2290, anos: 5, responde: 12, radio: 6, pagos: ['cash', 'transfer'], dias: [1, 2, 3, 4, 5, 6], desde: '07:00', hasta: '21:00',
    svc: [{ cat: 'nineras', title: 'Cuidado por hora', type: 'hourly', price: 120 }] },
  { email: 'raul@demo.mx', nombre: 'Raúl Vázquez', colonia: 'Zavaleta', lat: 19.0480, lng: -98.2400, anos: 20, responde: 60, radio: 12, pagos: ['cash'], dias: [1, 2, 3, 4, 5, 6], desde: '09:00', hasta: '18:00',
    svc: [{ cat: 'carpinteria', title: 'Reparar puerta', type: 'fixed', price: 400 }, { cat: 'carpinteria', title: 'Mueble a la medida', type: 'quote' }] },
];
const { data: todasCats } = await admin.from('categories').select('id, slug');
for (const pr of PRESTADORES) {
  const id = await ensureUser(pr.email, undefined, pr.nombre);
  must(await admin.from('provider_profiles').upsert({
    user_id: id, headline: null, years_experience: pr.anos,
    base_location: `SRID=4326;POINT(${pr.lng} ${pr.lat})`, service_radius_km: pr.radio,
    verification_status: 'verified', verified_at: new Date().toISOString(), payment_methods: pr.pagos,
    avg_response_minutes: pr.responde,
    terms_accepted_at: new Date().toISOString(), terms_version: '2026-11',
  }));
  const ya = must(await admin.from('provider_services').select('id').eq('provider_id', id)) as unknown[];
  if (!ya.length) {
    must(await admin.from('provider_services').insert(pr.svc.map((s) => ({
      provider_id: id, category_id: todasCats!.find((c) => c.slug === s.cat)!.id, title: s.title,
      price_type: s.type, price_mxn: s.type === 'quote' ? null : s.price,
    }))));
    must(await admin.from('provider_availability').insert(
      pr.dias.map((weekday) => ({ provider_id: id, weekday, start_time: pr.desde, end_time: pr.hasta }))));
  }
}

// ---------------------------------------------------------------------------
// Sprint 3B · Reseñas reales y solicitudes para la bandeja
// ---------------------------------------------------------------------------
// Cada reseña necesita un trabajo terminado: aquí se crean solicitudes completadas en días
// pasados y la reseña de cada una. La calificación y el número de trabajos de cada prestador
// los calculan los disparadores de la base, igual que en producción.
const ZONA = 'America/Mexico_City';
const isoMx = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: ZONA });
const enDias = (n: number) => new Date(Date.now() + n * 86_400_000);

const CLIENTES_DEMO = [
  { email: 'carmen@demo.mx', nombre: 'Carmen Ruiz', calle: '31 Poniente', num: '2104', colonia: 'La Paz', lat: 19.0455, lng: -98.2270 },
  { email: 'oscar@demo.mx', nombre: 'Óscar Méndez', calle: '19 Sur', num: '3508', colonia: 'Huexotitla', lat: 19.0395, lng: -98.2105 },
  { email: 'daniela@demo.mx', nombre: 'Daniela Soto', calle: 'Av. Juárez', num: '2915', colonia: 'La Paz', lat: 19.0500, lng: -98.2230 },
];
for (const c of CLIENTES_DEMO) {
  const id = await ensureUser(c.email, undefined, c.nombre);
  const ya = must(await admin.from('addresses').select('id').eq('user_id', id)) as unknown[];
  if (!ya.length) {
    must(await admin.from('addresses').insert({
      user_id: id, label: 'Casa', street: c.calle, ext_number: c.num, neighborhood: c.colonia,
      municipality: 'Puebla', state: 'Puebla', postal_code: '72000', is_default: true,
      location: `SRID=4326;POINT(${c.lng} ${c.lat})`,
    }));
  }
}

// Quién reseña: Mariana, las clientas de arriba y cualquier otro cliente que ya exista en tu
// base con una dirección guardada (por ejemplo, las cuentas que creaste probando la app).
const verificados = new Set((must(await admin.from('provider_profiles').select('user_id').eq('verification_status', 'verified')) as { user_id: string }[]).map((p) => p.user_id));
const dirs = must(await admin.from('addresses').select('id, user_id, is_default').order('is_default', { ascending: false })) as { id: string; user_id: string }[];
const direccion = new Map<string, string>();
for (const d of dirs) if (!direccion.has(d.user_id)) direccion.set(d.user_id, d.id);
const { data: usuarios } = await admin.auth.admin.listUsers();
const idDe = (email: string) => usuarios!.users.find((u) => u.email === email)!.id;
const principales = [mariana, ...CLIENTES_DEMO.map((c) => idDe(c.email))];
const resenantes = [...principales, ...[...direccion.keys()].filter((id) => !principales.includes(id) && !verificados.has(id))];

type Resena = { estrellas: number; etiquetas: string[]; texto: string; servicio: string; hace: number; pago: number };
const r = (estrellas: number, etiquetas: string[], texto: string, servicio: string, hace: number, pago: number): Resena => ({ estrellas, etiquetas, texto, servicio, hace, pago });
const RESENAS: Record<string, Resena[]> = {
  'rogelio@demo.mx': [
    r(5, ['puntual', 'explico_bien', 'dejo_limpio'], 'Llegó a la hora, explicó qué falló y dejó todo limpio.', 'Visita de diagnóstico', 3, 350),
    r(5, ['buen_precio', 'dejo_limpio'], 'Cambió el centro de carga completo. Precio justo y trabajo muy ordenado.', 'Cambio de centro de carga', 8, 2400),
    r(4, ['amable'], 'Muy amable y buen trabajo, aunque llegó 20 minutos tarde. Avisó por el chat.', 'Instalar contacto o apagador', 15, 750),
    r(5, ['explico_bien'], 'Resolvió un corto que otro electricista no encontró. Lo vuelvo a contratar.', 'Visita de diagnóstico', 32, 350),
    r(5, ['puntual', 'amable'], 'Puntual y muy profesional. Me explicó cómo evitar que se vuelva a botar la pastilla.', 'Visita de diagnóstico', 45, 350),
    r(5, ['dejo_limpio', 'buen_precio'], 'Instaló cuatro contactos nuevos en la cocina y no dejó ni polvo.', 'Instalar contacto o apagador', 60, 1000),
  ],
  'jorge@demo.mx': [
    r(5, ['explico_bien'], 'Revisó toda la instalación y me dio un reporte muy claro.', 'Revisión de instalación', 6, 450),
    r(4, ['buen_precio'], 'Buen trabajo; tardó un poco en confirmar la hora.', 'Visita de diagnóstico', 20, 300),
    r(5, ['puntual'], 'Encontró la falla rápido y cobró lo acordado.', 'Visita de diagnóstico', 41, 300),
  ],
  'ana@demo.mx': [
    r(5, ['explico_bien', 'buen_precio'], 'Súper ordenada y clara con el presupuesto.', 'Revisión de instalación', 4, 600),
    r(5, ['dejo_limpio', 'puntual'], 'Pintó la recámara en un día y dejó todo limpio.', 'Pintar recámara', 18, 1500),
  ],
  'miguel@demo.mx': [
    r(5, ['puntual'], 'Cambió la pastilla en media hora. Muy práctico.', 'Cambio de pastilla térmica', 9, 350),
    r(4, ['buen_precio'], 'Cumplió, aunque llegó más tarde de lo acordado.', 'Visita de diagnóstico', 25, 280),
    r(5, ['explico_bien', 'amable'], 'Me explicó con calma qué había que cambiar y por qué.', 'Visita de diagnóstico', 50, 280),
  ],
  'lucia@demo.mx': [
    r(5, ['dejo_limpio'], 'Muy buen acabado y respetó los tiempos.', 'Pintar recámara', 7, 1200),
    r(5, ['amable', 'explico_bien'], 'Nos ayudó a elegir los colores. Quedó increíble.', 'Pintar recámara', 30, 1200),
    r(4, ['dejo_limpio'], 'Buen trabajo; necesitó un día más de lo previsto.', 'Pintar recámara', 55, 1200),
  ],
  'luis@demo.mx': [
    r(5, ['buen_precio', 'explico_bien'], 'Arregló la fuga del baño y revisó las demás llaves sin cobrar extra.', 'Reparar fuga', 5, 300),
    r(4, ['amable'], 'Destapó la coladera y volvió a los días para revisar.', 'Destapar coladera', 22, 350),
  ],
  'patricia@demo.mx': [
    r(5, ['dejo_limpio', 'puntual'], 'Dejó la casa impecable. Muy confiable.', 'Limpieza general', 3, 360),
    r(5, ['puntual', 'amable'], 'Puntual y detallista; ya viene cada quince días.', 'Limpieza general', 17, 360),
    r(5, ['dejo_limpio'], 'Excelente, se nota la experiencia.', 'Limpieza general', 40, 450),
  ],
  'sofia@demo.mx': [
    r(5, ['puntual', 'amable'], 'Mis hijos la adoran. Muy responsable y puntual.', 'Cuidado por hora', 6, 480),
    r(5, ['amable'], 'Nos mandó fotos y mensajes toda la tarde. Muy tranquila la experiencia.', 'Cuidado por hora', 26, 600),
  ],
  'raul@demo.mx': [
    r(4, ['buen_precio'], 'La puerta quedó bien, aunque tardó en conseguir la bisagra.', 'Reparar puerta', 12, 400),
    r(5, ['dejo_limpio', 'explico_bien'], 'Trabajo fino y precio justo.', 'Reparar puerta', 38, 400),
  ],
};

type Servicio = { id: string; category_id: number; title: string };
async function serviciosDe(provider: string) {
  return must(await admin.from('provider_services').select('id, category_id, title').eq('provider_id', provider)) as Servicio[];
}
async function pagosDe(provider: string) {
  return (must(await admin.from('provider_profiles').select('payment_methods').eq('user_id', provider).single()) as { payment_methods: string[] }).payment_methods;
}

/** Crea una solicitud ya terminada hace `hace` días. */
async function trabajoTerminado(cliente: string, provider: string, svc: Servicio, pago: number, hace: number, descripcion: string) {
  const pagos = await pagosDe(provider);
  const nueva = must(await admin.from('service_requests').insert({
    client_id: cliente, provider_id: provider, service_id: svc.id, category_id: svc.category_id,
    address_id: direccion.get(cliente)!, description: descripcion,
    preferred_dates: [isoMx(new Date())], time_windows: ['morning'], preferred_payment_methods: [pagos[0]],
  }).select('id').single()) as { id: string };
  const cuando = new Date(Date.now() - hace * 86_400_000);
  cuando.setUTCHours(17, 0, 0, 0); // 11:00 en Puebla
  must(await admin.from('service_requests').update({
    status: 'completed', created_at: new Date(cuando.getTime() - 86_400_000).toISOString(),
    viewed_at: new Date(cuando.getTime() - 86_000_000).toISOString(),
    scheduled_at: cuando.toISOString(), preferred_dates: [isoMx(cuando)],
    quoted_price_mxn: pago, final_price_mxn: pago,
  }).eq('id', nueva.id));
  // Su historial, como si hubiera pasado por la app (B4.2 cuenta las respondidas a tiempo)
  const en = (min: number) => new Date(cuando.getTime() - 86_400_000 + min * 60_000).toISOString();
  must(await admin.from('request_events').insert([
    { request_id: nueva.id, from_status: 'pending', to_status: 'accepted', actor_id: provider, created_at: en(18) },
    { request_id: nueva.id, from_status: 'accepted', to_status: 'scheduled', actor_id: cliente, created_at: en(60) },
    { request_id: nueva.id, from_status: 'scheduled', to_status: 'in_progress', actor_id: provider, created_at: en(24 * 60) },
    { request_id: nueva.id, from_status: 'in_progress', to_status: 'completed', actor_id: cliente, created_at: en(24 * 60 + 90) },
  ]));
  return { id: nueva.id, cuando };
}

let k = 0;
let nuevasResenas = 0;
for (const [email, lista] of Object.entries(RESENAS)) {
  const provider = idDe(email);
  const svcs = await serviciosDe(provider);
  const ya = new Set((must(await admin.from('reviews').select('comment').eq('reviewee_id', provider)) as { comment: string | null }[]).map((x) => x.comment));
  for (const res of lista) {
    k++;
    if (ya.has(res.texto)) continue;
    const candidatos = resenantes.filter((id) => id !== provider);
    const cliente = candidatos[k % candidatos.length];
    const svc = svcs.find((s) => s.title === res.servicio) ?? svcs[0];
    const t = await trabajoTerminado(cliente, provider, svc, res.pago, res.hace, `${svc.title}. Lo necesito en mi casa, de preferencia en la mañana.`);
    must(await admin.from('reviews').insert({
      request_id: t.id, reviewer_id: cliente, reviewee_id: provider, rating: res.estrellas, tags: res.etiquetas,
      comment: res.texto, created_at: new Date(t.cuando.getTime() + 5 * 3_600_000).toISOString(),
    }));
    nuevasResenas++;
  }
}

// Bandeja de Rogelio (B4): dos solicitudes nuevas (de Óscar, con fotos y video, y de Carmen) si no
// tiene ninguna vigente. Vencen a las 2 horas; vuelve a correr "npm run demo" para tener nuevas.
// No son de Mariana a propósito: así, lo que Mariana envíe desde la app no se confunde con esto.
const carmen = idDe('carmen@demo.mx');
const oscar = idDe('oscar@demo.mx');
const svcRog = await serviciosDe(rogelio);
const vigentes = must(await admin.from('service_requests').select('id').eq('provider_id', rogelio).eq('status', 'pending').gt('expires_at', new Date().toISOString())) as unknown[];
if (!vigentes.length) {
  const diag = svcRog.find((s) => s.title === 'Visita de diagnóstico')!;
  const cont = svcRog.find((s) => s.title.startsWith('Instalar contacto'))!;
  // Por separado: en un insert de varias filas, PostgREST pone null en las columnas que falten
  const conMedios = must(await admin.from('service_requests').insert(
    { client_id: oscar, provider_id: rogelio, service_id: diag.id, category_id: diag.category_id, address_id: direccion.get(oscar)!,
      description: 'Se bota la pastilla cada vez que prendo el microondas y la cafetera juntos. Ya cambié la pastilla y sigue igual.',
      urgency: 'urgent', preferred_dates: [isoMx(new Date()), isoMx(enDias(1))], time_windows: ['afternoon', 'evening'], preferred_payment_methods: ['cash', 'transfer'] }).select('id').single()) as { id: string };
  // Sus fotos y su video (archivos de prueba en scripts/demo-media) para ver el detalle de la solicitud
  const MEDIOS = [
    { archivo: 'centro-de-carga.jpg', kind: 'image', tipo: 'image/jpeg' },
    { archivo: 'pastilla.jpg', kind: 'image', tipo: 'image/jpeg' },
    { archivo: 'contacto.jpg', kind: 'image', tipo: 'image/jpeg' },
    { archivo: 'video.mp4', kind: 'video', tipo: 'video/mp4', segundos: 6 },
  ] as const;
  for (const [i, m] of MEDIOS.entries()) {
    const ruta = `${conMedios.id}/${m.kind === 'video' ? 'video.mp4' : `foto-${i + 1}.jpg`}`;
    const contenido = readFileSync(new URL(`./demo-media/${m.archivo}`, import.meta.url));
    const sub = await admin.storage.from('request-media').upload(ruta, contenido, { contentType: m.tipo, upsert: true });
    if (sub.error) throw sub.error;
    must(await admin.from('request_media').insert({ request_id: conMedios.id, kind: m.kind, storage_path: ruta, sort_order: i, duration_s: 'segundos' in m ? m.segundos : null }));
  }
  must(await admin.from('service_requests').insert(
    { client_id: carmen, provider_id: rogelio, service_id: cont.id, category_id: cont.category_id, address_id: direccion.get(carmen)!,
      description: 'Quiero instalar 3 contactos en la cocina, junto a la barra. La pared es de tabique.',
      urgency: 'this_week', preferred_dates: [isoMx(enDias(1)), isoMx(enDias(2))], time_windows: ['morning'], preferred_payment_methods: ['transfer'],
      created_at: new Date(Date.now() - 22 * 60_000).toISOString(), expires_at: new Date(Date.now() + 98 * 60_000).toISOString() }));
}

// Mariana (A8): un trabajo de Rogelio terminado ayer y todavía sin calificar.
const terminadas = must(await admin.from('service_requests').select('id, reviews(id)').eq('client_id', mariana).eq('provider_id', rogelio).eq('status', 'completed')) as { id: string; reviews: unknown[] }[];
if (!terminadas.some((t) => !t.reviews.length)) {
  await trabajoTerminado(mariana, rogelio, svcRog.find((s) => s.title === 'Visita de diagnóstico')!, 350, 1,
    'Revisar por qué se apagan las luces de la sala cuando llueve.');
}

// ---------------------------------------------------------------------------
// Sprint 4A · Calendario de Rogelio (B6): una cita confirmada mañana, su comida de cada día y
// un día de descanso. Solo si todavía no tiene nada de eso.
// ---------------------------------------------------------------------------
const daniela = idDe('daniela@demo.mx');
const futuras = must(await admin.from('service_requests').select('id').eq('provider_id', rogelio).eq('status', 'scheduled').gt('scheduled_at', new Date().toISOString())) as unknown[];
if (!futuras.length) {
  const cont = svcRog.find((s) => s.title.startsWith('Instalar contacto'))!;
  const manana = isoMx(enDias(1));
  const cita = must(await admin.from('service_requests').insert({
    client_id: daniela, provider_id: rogelio, service_id: cont.id, category_id: cont.category_id, address_id: direccion.get(daniela)!,
    description: 'Instalar 3 contactos en la recámara y revisar el apagador del pasillo.',
    urgency: 'this_week', preferred_dates: [manana], time_windows: ['morning'], preferred_payment_methods: ['cash'],
  }).select('id, created_at').single()) as { id: string; created_at: string };
  const hace = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
  must(await admin.from('service_requests').update({
    status: 'scheduled', quoted_price_mxn: 750, scheduled_at: `${manana}T10:00:00-06:00`, viewed_at: hace(170),
    created_at: hace(180),
  }).eq('id', cita.id));
  must(await admin.from('request_events').insert([
    { request_id: cita.id, from_status: 'pending', to_status: 'accepted', actor_id: rogelio, note: 'Llevo los contactos y el cable.', created_at: hace(150) },
    { request_id: cita.id, from_status: 'accepted', to_status: 'scheduled', actor_id: daniela, created_at: hace(120) },
  ]));
}
const bloqueos = must(await admin.from('provider_unavailability').select('id').eq('provider_id', rogelio)) as unknown[];
if (!bloqueos.length) {
  const hoy = isoMx(new Date());
  const descanso = isoMx(enDias(4));
  must(await admin.from('provider_unavailability').insert({
    provider_id: rogelio, starts_at: `${hoy}T13:00:00-06:00`, ends_at: `${hoy}T14:00:00-06:00`, all_day: false, reason: 'Comida', rrule: 'FREQ=DAILY',
  }));
  must(await admin.from('provider_unavailability').insert({
    provider_id: rogelio, starts_at: `${descanso}T00:00:00-06:00`, ends_at: `${isoMx(enDias(5))}T00:00:00-06:00`, all_day: true, reason: 'Descanso', rrule: null,
  }));
}

// ---------------------------------------------------------------------------
// Sprint 4B · Mensajes de ejemplo: la cita de Daniela con Rogelio y la duda de Óscar
// ---------------------------------------------------------------------------
const conversacion = async (requestId: string, filas: { de: string; texto: string; hace: number; leido?: boolean }[]) => {
  const ya = must(await admin.from('messages').select('id').eq('request_id', requestId).limit(1)) as unknown[];
  if (ya.length) return;
  for (const f of filas) {
    const cuando = new Date(Date.now() - f.hace * 60_000).toISOString();
    must(await admin.from('messages').insert({ request_id: requestId, sender_id: f.de, type: 'text', body: f.texto, created_at: cuando, read_at: f.leido === false ? null : cuando }));
  }
};
const citaDaniela = must(await admin.from('service_requests').select('id').eq('provider_id', rogelio).eq('client_id', daniela).eq('status', 'scheduled').limit(1)) as { id: string }[];
if (citaDaniela[0]) {
  await conversacion(citaDaniela[0].id, [
    { de: rogelio, texto: 'Hola Daniela, confirmo mañana a las 10:00.', hace: 110 },
    { de: daniela, texto: 'Perfecto, gracias. ¿Necesita que compre algo?', hace: 100 },
    { de: rogelio, texto: 'No, yo llevo los contactos y el cable.', hace: 95 },
    { de: daniela, texto: 'Va, lo espero. El timbre no sirve, mejor me marca al llegar.', hace: 30, leido: false },
  ]);
}
const pendOscar = must(await admin.from('service_requests').select('id').eq('provider_id', rogelio).eq('client_id', oscar).eq('status', 'pending').gt('expires_at', new Date().toISOString()).limit(1)) as { id: string }[];
if (pendOscar[0]) {
  await conversacion(pendOscar[0].id, [{ de: oscar, texto: 'Hola, ¿tiene escalera para techo de 3 metros?', hace: 5, leido: false }]);
}

async function token(email: string) {
  const { data, error } = await anon.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return data.session!.access_token;
}

console.log('\nListo. Usuarios de prueba (contraseña para todos: ' + PASSWORD + ')');
console.log('  Clienta:   mariana@demo.mx   id', mariana);
console.log('  Prestador: rogelio@demo.mx   id', rogelio);
console.log('  Más prestadores verificados (Sprint 3): ' + PRESTADORES.map((p) => p.email).join(', '));
console.log('  Más clientas (Sprint 3B): ' + CLIENTES_DEMO.map((c) => c.email).join(', '));
console.log(`  Reseñas nuevas: ${nuevasResenas} · reseñan ${resenantes.length} clientes`);
console.log('\nTokens de sesión (duran 1 hora):');
console.log('MARIANA=' + (await token('mariana@demo.mx')));
console.log('ROGELIO=' + (await token('rogelio@demo.mx')));
