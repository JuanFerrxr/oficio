// Recorre una solicitud completa contra tu Supabase LOCAL y la API corriendo en otra terminal
// (npm run dev). Comprueba las reglas que diseñamos: privacidad por etapas, transiciones,
// historial, calificación y favoritos.
//
//   npm run flujo
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL!;
const ANON = process.env.SUPABASE_ANON_KEY!;
const API = `http://localhost:${process.env.PORT ?? 8080}`;
const PASSWORD = 'Oficio2026!';

async function login(email: string) {
  const db = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await db.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`No pude entrar como ${email}. ¿Corriste "npm run demo"? (${error.message})`);
  return { db, token: data.session!.access_token, id: data.user!.id };
}

async function api(token: string, path: string, body?: unknown) {
  const res = await fetch(API + path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = res.status === 204 ? {} : await res.json();
  if (!res.ok) throw new Error(`${path} → ${res.status} ${JSON.stringify(json)}`);
  return json;
}

let paso = 0;
const ok = (msg: string) => console.log(`  ✔ ${++paso}. ${msg}`);
const check = (cond: boolean, msg: string) => { if (!cond) throw new Error('FALLÓ: ' + msg); ok(msg); };

const health = await fetch(API + '/health').catch(() => null);
if (!health?.ok) { console.error(`La API no responde en ${API}. Arráncala en otra terminal con "npm run dev".`); process.exit(1); }

const mariana = await login('mariana@demo.mx');
const rogelio = await login('rogelio@demo.mx');
console.log('\nFlujo de una solicitud (A6 → B5 → A7 → A8)\n');

// A3.0 · búsqueda por problema
const { data: cats } = await mariana.db.rpc('match_categories', { p_text: 'se me bota la pastilla de la luz' });
check(cats?.[0]?.slug === 'electricidad', '“se me bota la pastilla de la luz” → Electricidad');

// A4 · resultados cerca
const { data: provs } = await mariana.db.rpc('search_providers', { p_category: cats![0].category_id, p_lat: 19.045, p_lng: -98.225, p_max_km: 10 });
check(!!provs?.some((p: any) => p.provider_id === rogelio.id), 'Rogelio aparece en la búsqueda de electricistas');

// A6 · la clienta crea la solicitud directo en Supabase (RLS decide si puede)
const { data: addr } = await mariana.db.from('addresses').select('id').limit(1).single();
const { data: req, error: reqErr } = await mariana.db.from('service_requests').insert({
  client_id: mariana.id, provider_id: rogelio.id, category_id: cats![0].category_id, address_id: addr!.id,
  description: 'Se bota la pastilla cada vez que prendo el microondas y la cafetera',
  urgency: 'this_week', preferred_dates: ['2026-10-19', '2026-10-20'], time_windows: ['afternoon'],
  preferred_payment_methods: ['cash'],
}).select().single();
if (reqErr) throw reqErr;
ok('Mariana envía la solicitud (pendiente)');

// Chat abierto desde la solicitud
const { error: msgErr } = await mariana.db.from('messages').insert({ request_id: req.id, sender_id: mariana.id, body: '¿Puede venir esta semana?' });
check(!msgErr, 'Mariana puede escribir en el chat antes de que cotice');

// B4 · Rogelio abre la solicitud: ve colonia, no calle ni teléfono
await api(rogelio.token, `/requests/${req.id}/viewed`);
let { data: pv } = await rogelio.db.from('provider_request_view').select('*').eq('id', req.id).single();
check(pv.neighborhood === 'La Paz' && pv.street === null && pv.client_phone === null, 'Rogelio ve la colonia, pero no la calle ni el teléfono');

// Mariana no puede aceptar por él
const self = await fetch(`${API}/requests/${req.id}/accept`, { method: 'POST', headers: { Authorization: `Bearer ${mariana.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ quotedPrice: 1, scheduledAt: '2026-10-19T16:00:00-06:00' }) });
check(self.status === 400, 'La clienta no puede aceptar su propia solicitud');

// B5 · Rogelio acepta y cotiza
await api(rogelio.token, `/requests/${req.id}/accept`, { quotedPrice: 350, scheduledAt: '2026-10-19T16:00:00-06:00', message: 'Llevo multímetro.' });
let { data: cv } = await mariana.db.from('client_request_view').select('*').eq('id', req.id).single();
check(cv.status === 'accepted' && cv.viewed_at !== null && cv.provider_phone === null, 'Mariana ve “Vista”, la cotización, y todavía no el teléfono');

// A7 · Mariana confirma → se comparten teléfono y dirección
await api(mariana.token, `/requests/${req.id}/confirm`);
({ data: cv } = await mariana.db.from('client_request_view').select('*').eq('id', req.id).single());
({ data: pv } = await rogelio.db.from('provider_request_view').select('*').eq('id', req.id).single());
check(!!cv.provider_phone && !!pv.client_phone && !!pv.street, 'Al confirmar, ambos ven el teléfono y Rogelio la dirección');

await api(rogelio.token, `/requests/${req.id}/start`);
await api(mariana.token, `/requests/${req.id}/complete`);
ok('Trabajo iniciado y terminado');

const { data: events } = await mariana.db.from('request_events').select('from_status,to_status').eq('request_id', req.id).order('id');
check(events?.length === 4, 'El historial tiene las 4 transiciones');

// A8 · calificar y favorito
const { error: revErr } = await mariana.db.from('reviews').insert({ request_id: req.id, reviewer_id: mariana.id, reviewee_id: rogelio.id, rating: 5, tags: ['puntual'], comment: 'Llegó a la hora' });
check(!revErr, 'Mariana califica con 5 ★');
const { data: favs } = await mariana.db.rpc('home_favorites');
check(!!favs?.some((f: any) => f.provider_id === rogelio.id), 'Rogelio aparece en sus favoritos de Inicio');

// A7.1 · cancelar exige motivo
const { data: req2 } = await mariana.db.from('service_requests').insert({
  client_id: mariana.id, provider_id: rogelio.id, category_id: cats![0].category_id, address_id: addr!.id,
  description: 'Instalar tres contactos en la cocina',
}).select().single();
const sinMotivo = await fetch(`${API}/requests/${req2!.id}/cancel`, { method: 'POST', headers: { Authorization: `Bearer ${mariana.token}`, 'Content-Type': 'application/json' }, body: '{}' });
check(sinMotivo.status === 400, 'Cancelar sin motivo se rechaza');
await api(mariana.token, `/requests/${req2!.id}/cancel`, { reason: 'schedule', note: 'Ya no me queda el horario' });
ok('Cancelar con motivo funciona');

console.log('\nTodo en orden: la base y la API se comportan como el prototipo.\n');
