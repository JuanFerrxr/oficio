// Comprueba el Sprint 5A · IA (búsqueda por significado y asistente de solicitud) contra tu
// Supabase LOCAL, con un Claude y un Voyage de mentira en tu computadora: no sale nada a internet
// y no cuesta nada, aunque tengas llaves reales en .env.
// Corre después de "npm run demo". No necesita la API prendida.
//
//   npm run ia
import { createServer, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createClient } from '@supabase/supabase-js';

const URL_SB = process.env.SUPABASE_URL!;
if (!/127\.0\.0\.1|localhost/.test(URL_SB)) {
  console.error('Este script solo corre contra Supabase local. SUPABASE_URL =', URL_SB);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Voyage de mentira: "embeddings" de bolsa de palabras (cada raíz de 5 letras suma en una
// posición del vector). No entiende nada, pero textos con palabras en común se parecen.
// ---------------------------------------------------------------------------
const VACIAS = new Set(['para', 'como', 'tiene', 'esta', 'esto', 'pero', 'porque', 'desde', 'cuando', 'muy']);
const normal = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function vectorFalso(texto: string): number[] {
  const v = new Array(1024).fill(0);
  for (const w of normal(texto).split(/[^a-zñ]+/)) {
    if (w.length < 4 || VACIAS.has(w)) continue;
    let h = 0;
    for (const ch of w.slice(0, 5)) h = (h * 31 + ch.charCodeAt(0)) % 1024;
    v[h] += 1;
  }
  const n = Math.sqrt(v.reduce((a, x) => a + x * x, 0)) || 1;
  return v.map((x) => x / n);
}

const leer = (req: IncomingMessage) => new Promise<any>((ok) => {
  let s = '';
  req.on('data', (d) => (s += d));
  req.on('end', () => ok(s ? JSON.parse(s) : {}));
});

const voyage = { llamadas: 0, caido: false, ultimo: null as any };
const sVoyage = createServer(async (req, res) => {
  const body = await leer(req);
  voyage.llamadas++;
  voyage.ultimo = { body, auth: req.headers.authorization };
  if (voyage.caido) { res.writeHead(500).end('{"detail":"caído"}'); return; }
  res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({
    object: 'list', model: body.model,
    data: (body.input as string[]).map((t, index) => ({ object: 'embedding', embedding: vectorFalso(t), index })),
  }));
});

// Claude de mentira: responde lo que la prueba le diga y guarda la última petición
const claude = { ultimo: null as any, headers: null as any, responder: (_b: any): { status: number; json: any } => ({ status: 200, json: {} }) };
const sClaude = createServer(async (req, res) => {
  const body = await leer(req);
  claude.ultimo = body;
  claude.headers = req.headers;
  const r = claude.responder(body);
  res.writeHead(r.status, { 'content-type': 'application/json' }).end(JSON.stringify(r.json));
});
const herramienta = (input: unknown) => ({ status: 200, json: { content: [{ type: 'tool_use', id: 't1', name: 'sugerir_solicitud', input }] } });

await new Promise<void>((ok) => sVoyage.listen(0, '127.0.0.1', ok));
await new Promise<void>((ok) => sClaude.listen(0, '127.0.0.1', ok));
const puerto = (s: typeof sVoyage) => (s.address() as AddressInfo).port;

// La API lee estas variables al importarse: van antes del import
Object.assign(process.env, {
  NODE_ENV: 'test',
  ANTHROPIC_API_KEY: 'sk-ant-prueba-local-no-es-real-000000',
  ANTHROPIC_URL: `http://127.0.0.1:${puerto(sClaude)}/v1/messages`,
  CLAUDE_MODELO: 'claude-prueba',
  VOYAGE_API_KEY: 'pa-prueba-local-000000',
  VOYAGE_URL: `http://127.0.0.1:${puerto(sVoyage)}/v1/embeddings`,
  VOYAGE_MODELO: 'voyage-prueba',
  IA_UMBRAL_BUSQUEDA: '0.05',
  IA_INDEXAR_CADA_MS: '0',
  IA_LIMITE_ASISTENTE: '6',
  IA_DEMO: 'false',
});
const { app } = await import('../src/app.js');
const { env } = await import('../src/env.js');
const { indexarEmbeddings } = await import('../src/services/ia.js');

const admin = createClient(URL_SB, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const PASS = 'Oficio2026!';
let paso = 0;
const check = (cond: unknown, msg: string, detalle?: unknown) => {
  if (!cond) throw new Error(`FALLÓ: ${msg}${detalle !== undefined ? ` (${JSON.stringify(detalle)})` : ''}`);
  console.log(`  ✔ ${++paso}. ${msg}`);
};

async function entrar(email: string) {
  const db = createClient(URL_SB, process.env.SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.auth.signInWithPassword({ email, password: PASS });
  if (error) throw new Error(`No pude entrar como ${email}. ¿Corriste "npm run demo"? (${error.message})`);
  return { db, id: data.user!.id, token: data.session!.access_token };
}
const mariana = await entrar('mariana@demo.mx');
const rogelio = await entrar('rogelio@demo.mx');

async function api(ruta: string, opts: { token?: string; body?: unknown; method?: string } = {}) {
  const res = await app.request(ruta, {
    method: opts.method ?? (opts.body === undefined ? 'GET' : 'POST'),
    headers: { 'content-type': 'application/json', ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as any };
}

const { data: svcRogelio } = await admin.from('provider_services').select('id, title, description').eq('provider_id', rogelio.id);
const svc = (t: string) => svcRogelio!.find((s) => s.title === t)!;
const FOTO = Buffer.alloc(300, 7).toString('base64');
const BUSQUEDAS = ['mi coladera del patio no traga agua', 'se me bota la pastilla', 'necesito que alguien barra el patio'];

async function limpiar() {
  await admin.from('ia_uso').delete().in('user_id', [mariana.id, rogelio.id]);
  await admin.from('ia_consultas').delete().in('texto', BUSQUEDAS);
  await admin.from('provider_services').update({ description: svc('Cambio de centro de carga').description }).eq('id', svc('Cambio de centro de carga').id);
}

try {
  await limpiar();
  console.log('\nEstado y permisos');
  check((await api('/ia/estado')).status === 401, 'Sin sesión, /ia/estado responde 401');
  const est = await api('/ia/estado', { token: mariana.token });
  check(est.json.busqueda === true && est.json.asistente === 'real', 'Con llaves: búsqueda activa y asistente real', est.json);

  const { data: verEmb } = await mariana.db.from('ia_embeddings').select('clave').limit(1);
  check(!verEmb?.length, 'Un cliente no puede leer los vectores');
  const { data: verUso } = await mariana.db.from('ia_uso').select('id').limit(1);
  check(!verUso?.length, 'Un cliente no puede leer la cuenta de usos');
  const { error: ePend } = await mariana.db.rpc('ia_documentos_pendientes', { p_modelo: 'x' });
  check(!!ePend, 'Un cliente no puede pedir los documentos pendientes de indexar');
  const { error: eDocs } = await mariana.db.from('ia_documentos').select('clave').limit(1);
  check(!!eDocs, 'Un cliente no puede leer la vista de documentos');

  console.log('\nIndexado (vectores de oficios y servicios)');
  await admin.from('ia_embeddings').delete().neq('clave', '');
  const r1 = await indexarEmbeddings();
  const { count: docs } = await admin.from('ia_embeddings').select('clave', { count: 'exact', head: true });
  check(r1.calculados > 0 && r1.calculados === docs, `Calcula un vector por oficio y por servicio (${r1.calculados})`);
  check(voyage.ultimo.body.input_type === 'document' && voyage.ultimo.body.output_dimension === 1024 && voyage.ultimo.body.model === 'voyage-prueba',
    'Pide a Voyage vectores de documento de 1024 dimensiones con el modelo configurado', voyage.ultimo.body);
  check(voyage.ultimo.auth === 'Bearer pa-prueba-local-000000', 'Manda la llave de Voyage en el encabezado');
  const r2 = await indexarEmbeddings();
  check(r2.calculados === 0, 'Si nada cambió, no recalcula nada');
  await admin.from('provider_services').update({ description: 'Cambio completo del centro de carga y sus pastillas' }).eq('id', svc('Cambio de centro de carga').id);
  const r3 = await indexarEmbeddings();
  check(r3.calculados === 1, 'Al editar un servicio, recalcula solo ese', r3);
  const { data: noVerif } = await admin.from('provider_profiles').select('user_id').neq('verification_status', 'verified');
  if (noVerif?.length) {
    const { data: svNo } = await admin.from('provider_services').select('id').in('provider_id', noVerif.map((x) => x.user_id));
    const { count } = await admin.from('ia_embeddings').select('clave', { count: 'exact', head: true }).in('service_id', (svNo ?? []).map((s) => s.id).concat(['00000000-0000-0000-0000-000000000000']));
    check(count === 0, 'Los servicios de prestadores sin verificar no se indexan');
  }

  console.log('\nBúsqueda en lenguaje natural');
  const b1 = await api('/ia/buscar', { token: mariana.token, body: { texto: 'se me bota la pastilla' } });
  check(b1.status === 200 && b1.json.categorias[0]?.slug === 'electricidad' && b1.json.categorias[0].fuente === 'diccionario',
    '"se me bota la pastilla" → Electricidad, por el diccionario', b1.json);
  const llamadasAntes = voyage.llamadas;
  const b2 = await api('/ia/buscar', { token: mariana.token, body: { texto: 'Mi coladera   del patio no traga agua' } });
  const plom = b2.json.categorias?.[0];
  check(b2.status === 200 && b2.json.significado === true && plom?.slug === 'plomeria' && plom.fuente === 'significado',
    '"mi coladera del patio no traga agua" → Plomería primero, por significado (no está en el diccionario)', b2.json);
  check(b2.json.categorias.findIndex((x: any) => x.slug === 'albanileria') > 0,
    'El parecido del diccionario ("colado" → Albañilería) queda después, como alternativa', b2.json.categorias);
  check(plom.servicios.includes('Destapar coladera'), 'Trae el servicio que coincidió ("Destapar coladera")', plom.servicios);
  check(voyage.llamadas === llamadasAntes + 1 && voyage.ultimo.body.input_type === 'query', 'Convierte la búsqueda en vector de consulta');
  const b3 = await api('/ia/buscar', { token: mariana.token, body: { texto: 'mi coladera del patio no traga agua' } });
  const { data: cache } = await admin.from('ia_consultas').select('usos').eq('texto', 'mi coladera del patio no traga agua').single();
  check(b3.status === 200 && voyage.llamadas === llamadasAntes + 1 && cache?.usos === 2, 'La misma búsqueda sale de la caché, sin volver a pagar a Voyage', cache);
  check(b2.json.categorias.length <= 3, 'Sugiere como máximo 3 oficios');

  voyage.caido = true;
  const b4 = await api('/ia/buscar', { token: mariana.token, body: { texto: 'necesito que alguien barra el patio' } });
  check(b4.status === 200 && b4.json.significado === false, 'Si Voyage falla, la búsqueda responde con el diccionario y no se rompe', b4.json);
  voyage.caido = false;

  const llave = env.VOYAGE_API_KEY;
  env.VOYAGE_API_KEY = undefined;
  const { count: usosAntes } = await admin.from('ia_uso').select('id', { count: 'exact', head: true }).eq('user_id', mariana.id);
  const b5 = await api('/ia/buscar', { token: mariana.token, body: { texto: 'se me bota la pastilla' } });
  const { count: usosDespues } = await admin.from('ia_uso').select('id', { count: 'exact', head: true }).eq('user_id', mariana.id);
  check(b5.status === 200 && b5.json.significado === false && b5.json.categorias[0]?.slug === 'electricidad' && usosAntes === usosDespues,
    'Sin llave de Voyage: solo diccionario y no cuenta como uso de IA');
  check((await api('/ia/estado', { token: mariana.token })).json.busqueda === false, 'Sin llave de Voyage, /ia/estado dice búsqueda apagada');
  env.VOYAGE_API_KEY = llave;
  check((await api('/ia/buscar', { token: mariana.token, body: { texto: 'a' } })).status === 400, 'Texto de menos de 3 letras → 400');

  console.log('\nAsistente de solicitud (Claude de mentira)');
  const base = { prestadorId: rogelio.id, servicioId: svc('Instalar contacto o apagador').id, descripcion: 'Se bota la pastilla cuando prendo el microondas y la cafetera', fotos: [{ data: FOTO, media_type: 'image/jpeg' }] };
  claude.responder = () => herramienta({
    servicio_id: svc('Visita de diagnóstico').id, urgencia: 'urgent', motivo_urgencia: 'Se queda sin luz en la cocina.',
    en_fotos: 'Se ve el centro de carga con una pastilla abajo.', aviso_seguridad: null,
    preguntas: ['¿Desde cuándo pasa?', '¿Pasa con otros aparatos?', '¿Qué amperaje tiene la pastilla?', '¿Cuarta?', 'ok'],
  });
  const a1 = await api('/ia/asistente-solicitud', { token: mariana.token, body: base });
  check(a1.status === 200 && a1.json.modo === 'real', 'Responde en modo real', a1.json);
  check(a1.json.sugerencia.servicio_id === svc('Visita de diagnóstico').id && a1.json.sugerencia.urgencia === 'urgent', 'Sugiere el servicio y la urgencia que dio el modelo');
  check(a1.json.sugerencia.preguntas.length === 3, 'Recorta a 3 preguntas como máximo', a1.json.sugerencia.preguntas);
  const u = claude.ultimo;
  check(u.model === 'claude-prueba' && u.tool_choice?.type === 'tool' && u.tool_choice.name === 'sugerir_solicitud', 'Usa el modelo configurado y fuerza la herramienta (respuesta estructurada)');
  check(claude.headers['x-api-key'] === 'sk-ant-prueba-local-no-es-real-000000' && claude.headers['anthropic-version'] === '2023-06-01', 'Manda la llave y la versión de la API de Anthropic');
  const bloques = u.messages[0].content as any[];
  check(bloques[0].type === 'image' && bloques[0].source.type === 'base64' && bloques[0].source.data === FOTO, 'Le manda la foto al modelo');
  const textoPrompt = bloques.find((b) => b.type === 'text').text as string;
  check(svcRogelio!.every((s) => textoPrompt.includes(s.id)) && textoPrompt.includes('<descripcion_del_cliente>'), 'Le da la lista de servicios del prestador y separa el texto del cliente');
  check(/no instrucciones/.test(u.system) && /Nunca pidas teléfono/.test(u.system), 'Las reglas piden ignorar órdenes del cliente y no pedir datos personales');

  claude.responder = () => herramienta({ servicio_id: '3d2e8f5b-2c3d-4e4f-9a01-23456789abcd', urgencia: 'ahora mismo', preguntas: 'no es lista', en_fotos: '', aviso_seguridad: '   ' });
  const a2 = await api('/ia/asistente-solicitud', { token: mariana.token, body: base });
  check(a2.status === 200 && a2.json.sugerencia.servicio_id === null && a2.json.sugerencia.urgencia === 'this_week'
    && a2.json.sugerencia.preguntas.length === 0 && a2.json.sugerencia.en_fotos === null && a2.json.sugerencia.aviso_seguridad === null,
    'Si el modelo inventa un servicio o responde mal, la API lo descarta', a2.json);

  claude.responder = () => ({ status: 200, json: { content: [{ type: 'text', text: 'hola' }] } });
  const a3 = await api('/ia/asistente-solicitud', { token: mariana.token, body: base });
  check(a3.status === 502 && /formato inesperado/.test(a3.json.error), 'Si el modelo no usa la herramienta → 502 con mensaje claro', a3.json);
  claude.responder = () => ({ status: 429, json: { error: { message: 'rate limit' } } });
  const a4 = await api('/ia/asistente-solicitud', { token: mariana.token, body: base });
  check(a4.status === 502 && /saturada/.test(a4.json.error), 'Si Anthropic está saturado → "La IA está saturada"', a4.json);

  check((await api('/ia/asistente-solicitud', { token: mariana.token, body: { ...base, descripcion: 'hola', fotos: [] } })).status === 400, 'Sin descripción de 10 letras ni fotos → 400');
  check((await api('/ia/asistente-solicitud', { token: mariana.token, body: { ...base, fotos: Array(6).fill(base.fotos[0]) } })).status === 400, 'Más de 5 fotos → 400');
  check((await api('/ia/asistente-solicitud', { token: mariana.token, body: { ...base, fotos: [{ data: 'no es base64!!', media_type: 'image/jpeg' }] } })).status === 400, 'Foto que no es base64 → 400');
  const a404 = await api('/ia/asistente-solicitud', { token: mariana.token, body: { ...base, prestadorId: '2c1f7e4a-1b2c-4d3e-8f90-123456789abc' } });
  check(a404.status === 404, 'Prestador que no existe → 404', a404);

  console.log('\nModo demo y apagado');
  const llaveC = env.ANTHROPIC_API_KEY;
  env.ANTHROPIC_API_KEY = undefined;
  env.IA_DEMO = true;
  check((await api('/ia/estado', { token: mariana.token })).json.asistente === 'demo', 'Sin llave de Claude y con IA_DEMO=true: asistente en modo demo');
  const d1 = await api('/ia/asistente-solicitud', { token: mariana.token, body: { ...base, descripcion: 'Quiero instalar un contacto nuevo en la cocina', fotos: [] } });
  check(d1.status === 200 && d1.json.modo === 'demo' && d1.json.sugerencia.servicio_id === svc('Instalar contacto o apagador').id && d1.json.sugerencia.preguntas.length > 0,
    'El demo sugiere un servicio por palabras y preguntas de ejemplo, sin llamar a Claude', d1.json);
  env.IA_DEMO = false;
  const d2 = await api('/ia/asistente-solicitud', { token: mariana.token, body: base });
  check(d2.status === 503, 'Sin llave y sin demo: el asistente responde 503 (la app lo oculta)');
  env.ANTHROPIC_API_KEY = llaveC;

  console.log('\nLímite de usos');
  // Se sigue pidiendo hasta llegar al límite de esta prueba (IA_LIMITE_ASISTENTE=6)
  claude.responder = () => herramienta({ servicio_id: null, urgencia: 'this_week', motivo_urgencia: null, en_fotos: null, preguntas: [], aviso_seguridad: null });
  let ultima = 200;
  for (let i = 0; i < 8 && ultima !== 429; i++) ultima = (await api('/ia/asistente-solicitud', { token: mariana.token, body: base })).status;
  const lim = await api('/ia/asistente-solicitud', { token: mariana.token, body: base });
  const { count: usosAsis } = await admin.from('ia_uso').select('id', { count: 'exact', head: true }).eq('user_id', mariana.id).eq('tipo', 'asistente');
  check(lim.status === 429 && /límite/.test(lim.json.error) && usosAsis === 6, 'Al llegar al límite diario (6 en esta prueba) responde 429 y deja de contar', { lim: lim.json, usosAsis });
  const otro = await api('/ia/asistente-solicitud', { token: rogelio.token, body: { ...base, prestadorId: rogelio.id } });
  check(otro.status === 200, 'El límite es por persona: otro usuario sí puede');

  console.log(`\nListo: ${paso} comprobaciones del Sprint 5A pasaron.`);
} finally {
  await limpiar();
  // Los vectores de mentira se borran: la API real los vuelve a calcular con tu modelo de Voyage
  await admin.from('ia_embeddings').delete().eq('modelo', 'voyage-prueba');
  sVoyage.close();
  sClaude.close();
}
process.exit(0);
