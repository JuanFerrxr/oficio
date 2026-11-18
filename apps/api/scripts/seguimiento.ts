// Comprueba el Sprint 4A · Seguimiento y calendario contra tu Supabase LOCAL: el detalle A7 del
// cliente, cancelar con motivo (A7.1), los bloqueos de B6.4 (con repetición) y el calendario B6.
// No necesita la API. Corre después de "npm run demo".
//
//   npm run seguimiento
//
// Lo que crea (solicitudes "PRUEBA 4A", bloqueos con motivo "Prueba 4A") lo borra al terminar.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL!;
if (!/127\.0\.0\.1|localhost/.test(URL)) {
  console.error('Este script solo corre contra Supabase local. SUPABASE_URL =', URL);
  process.exit(1);
}
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const PASS = 'Oficio2026!';
const MARCA = 'PRUEBA 4A';
const MOTIVO = 'Prueba 4A';

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
const { db: jorge, id: jorgeId } = await entrar('jorge@demo.mx');
const { data: svc } = await admin.from('provider_services').select('id, category_id').eq('provider_id', rogelioId).eq('title', 'Visita de diagnóstico').single();
const { data: dir } = await admin.from('addresses').select('id').eq('user_id', marianaId).eq('is_default', true).single();

async function limpiar() {
  const { data: reqs } = await admin.from('service_requests').select('id').like('description', `${MARCA}%`);
  if (reqs?.length) await admin.from('service_requests').delete().in('id', reqs.map((r) => r.id));
  await admin.from('provider_unavailability').delete().eq('reason', MOTIVO);
}
async function nueva() {
  const { data, error } = await mariana.from('service_requests').insert({
    client_id: marianaId, provider_id: rogelioId, service_id: svc!.id, category_id: svc!.category_id, address_id: dir!.id,
    description: `${MARCA} · revisar la pastilla de la cocina`, preferred_dates: [enDias(1)], time_windows: ['morning'], preferred_payment_methods: ['cash'],
  }).select('id').single();
  if (error) throw error;
  return data!.id as string;
}
const seguimiento = async (db: SupabaseClient, id: string) => (await db.rpc('seguimiento_solicitud', { p_request_id: id })).data as any;

try {
  await limpiar();

  console.log('\nA7 · Detalle y seguimiento');
  const a = await nueva();
  let s = await seguimiento(mariana, a);
  check(s && s.status === 'pending' && s.provider_name === 'Rogelio Hernández' && s.servicio === 'Visita de diagnóstico', 'Mariana ve su solicitud con el prestador y el servicio', s && s.status);
  check(s.telefono === null && Array.isArray(s.eventos) && s.eventos.length === 0, 'Sin cita confirmada no hay teléfono; todavía no hay eventos');
  check(!(await seguimiento(jorge, a)) && !(await seguimiento(rogelio, a)), 'Nadie más puede abrir el seguimiento del cliente (ni el prestador)');
  await rogelio.rpc('cotizar_solicitud', { p_request_id: a, p_precio: 350, p_hora: `${enDias(1)}T10:00:00-06:00`, p_mensaje: 'Llevo multímetro.' });
  await mariana.rpc('transition_request', { p_request_id: a, p_to: 'scheduled' });
  s = await seguimiento(mariana, a);
  check(s.status === 'scheduled' && !!s.telefono && s.eventos.map((e: any) => e.to_status).join(',') === 'accepted,scheduled', 'Confirmada: aparece el teléfono de Rogelio y la línea de tiempo');
  check(s.eventos[0].note === 'Llevo multímetro.' && s.eventos[1].por_mi === true, 'Los eventos traen el mensaje de la cotización y quién hizo cada paso');

  console.log('\nA7.1 · Cancelar con motivo');
  let r = await mariana.rpc('transition_request', { p_request_id: a, p_to: 'cancelled' });
  check(r.error?.message.includes('motivo'), 'Cancelar sin motivo no se puede', r.error?.message);
  r = await mariana.rpc('transition_request', { p_request_id: a, p_to: 'cancelled', p_cancel_reason: 'schedule', p_note: 'x'.repeat(501) });
  check(r.error, 'La nota tiene tope de 500 caracteres');
  r = await mariana.rpc('transition_request', { p_request_id: a, p_to: 'cancelled', p_cancel_reason: 'schedule', p_note: 'Me salió un compromiso.' });
  check(!r.error, 'Mariana cancela: "Ya no puedo en ese día u horario"', r.error?.message);
  s = await seguimiento(mariana, a);
  check(s.status === 'cancelled' && s.cancel_reason === 'schedule' && s.cancelled_by === marianaId && s.telefono === null, 'Queda cancelada por ella, con su motivo, y deja de verse el teléfono');
  const { data: band } = await rogelio.rpc('bandeja_prestador');
  check(band?.find((x: any) => x.id === a)?.status === 'cancelled', 'Rogelio la ve como cancelada en su bandeja');
  r = await mariana.rpc('transition_request', { p_request_id: a, p_to: 'scheduled' });
  check(r.error, 'Una cancelada no se reactiva');

  console.log('\nB6.4 · Marcar como no disponible');
  // Un día próximo que Rogelio trabaje (no domingo), para que no salga ocupado de todos modos
  const n = [1, 2, 3].find((k) => new Date(`${enDias(k)}T12:00:00`).getDay() !== 0)!;
  const manana = enDias(n);
  let ins = await rogelio.from('provider_unavailability').insert({ provider_id: rogelioId, starts_at: `${manana}T17:00:00-06:00`, ends_at: `${manana}T18:00:00-06:00`, reason: MOTIVO, rrule: 'FREQ=MONTHLY' });
  check(ins.error, 'Solo se aceptan "cada día" y "cada semana"');
  ins = await rogelio.from('provider_unavailability').insert({ provider_id: rogelioId, starts_at: `${manana}T17:00:00-06:00`, ends_at: `${manana}T18:00:00-06:00`, reason: MOTIVO, rrule: 'FREQ=WEEKLY' });
  check(!ins.error, 'Rogelio bloquea un día de 17:00 a 18:00, cada semana', ins.error?.message);
  ins = await jorge.from('provider_unavailability').insert({ provider_id: rogelioId, starts_at: `${manana}T09:00:00-06:00`, ends_at: `${manana}T10:00:00-06:00`, reason: MOTIVO });
  check(ins.error, 'Nadie puede bloquear la agenda de otro');
  const { data: ajenos } = await jorge.from('provider_unavailability').select('id').eq('provider_id', rogelioId);
  check(!ajenos?.length, 'Nadie ve los bloqueos (ni los motivos) de otro');

  console.log('\nB6 · Calendario');
  const { data: cal } = await rogelio.rpc('calendario_prestador', { p_desde: enDias(0), p_hasta: enDias(15) });
  const mios = (cal ?? []).filter((e: any) => e.tipo === 'no_disponible' && e.detalle === MOTIVO);
  check(mios.length >= 2 && mios.every((e: any) => e.rrule === 'FREQ=WEEKLY'), 'El bloqueo semanal aparece en ambas semanas', mios.length);
  const sieteDias = new Date(new Date(mios[1].starts_at).getTime() - new Date(mios[0].starts_at).getTime()).getTime() / 86_400_000;
  check(sieteDias === 7, 'La repetición cae el mismo día de la semana, a la misma hora', sieteDias);
  check((cal ?? []).some((e: any) => e.tipo === 'confirmada'), 'Las citas confirmadas aparecen en el calendario');
  const { data: calJorge } = await jorge.rpc('calendario_prestador', { p_desde: enDias(0), p_hasta: enDias(15) });
  check(!(calJorge ?? []).some((e: any) => e.detalle === MOTIVO), 'Cada prestador solo ve su propio calendario');

  console.log('\nA6 · A4 · Lo que ve el cliente');
  const { data: ocupados } = await mariana.rpc('provider_busy_days', { p_provider: rogelioId, p_from: enDias(0), p_to: enDias(14) });
  const diaBloq = (ocupados ?? []).find((d: any) => d.day === manana);
  check(diaBloq && diaBloq.all_day === false, 'Ese día sale con horas ocupadas (no el día completo)', ocupados);
  check((ocupados ?? []).some((d: any) => d.day === enDias(n + 7) && d.all_day === false), 'Y también una semana después');
  const hoy = enDias(0);
  await admin.from('provider_unavailability').insert({ provider_id: jorgeId, starts_at: `${hoy}T00:00:00-06:00`, ends_at: `${enDias(1)}T00:00:00-06:00`, all_day: true, reason: MOTIVO });
  const { data: hoyLista } = await mariana.rpc('buscar_prestadores', { p_lat: 19.045, p_lng: -98.225, p_solo_hoy: true });
  const { data: todos } = await mariana.rpc('buscar_prestadores', { p_lat: 19.045, p_lng: -98.225 });
  check((todos ?? []).some((p: any) => p.provider_id === jorgeId) && !(hoyLista ?? []).some((p: any) => p.provider_id === jorgeId), 'Filtro "Hoy": quien bloqueó todo el día de hoy no aparece');

  console.log('\nB5 · Al cotizar');
  const { data: mb } = await rogelio.rpc('mis_bloqueos', { p_desde: enDias(0), p_hasta: enDias(10) });
  check((mb ?? []).some((b: any) => b.reason === MOTIVO), 'Rogelio recibe sus bloqueos para no ofrecer esas horas');
  const { data: mbJ } = await jorge.rpc('mis_bloqueos', { p_desde: enDias(0), p_hasta: enDias(10) });
  check(!(mbJ ?? []).some((b: any) => b.reason === MOTIVO && b.starts_at.startsWith(manana)), 'mis_bloqueos solo devuelve los propios');
} finally {
  await limpiar();
}
console.log(`\nTodo en orden: ${paso} comprobaciones del Sprint 4A.\n`);
