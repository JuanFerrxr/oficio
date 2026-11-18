import { env } from '../env.js';
import { adminClient } from '../supabase.js';

// Notificaciones con Expo Push (Expo se encarga de APNs en iOS y FCM en Android).
//
// Desde el Sprint 4B la base deja cada aviso en la tabla `avisos` (solicitud nueva, cotización,
// confirmación, mensaje, reseña…). Aquí se toman los pendientes, se mandan a los teléfonos de
// cada persona y se marcan como enviados. Si alguien no tiene teléfonos registrados, el aviso se
// marca como enviado sin más.
type Aviso = { id: number; user_id: string; titulo: string; cuerpo: string; datos: Record<string, unknown>; intentos: number };
type Ticket = { status: 'ok' | 'error'; message?: string; details?: { error?: string } };

const LOTE = 100; // Expo acepta hasta 100 mensajes por petición

export async function enviarAvisos(): Promise<{ enviados: number; sinTelefono: number; fallidos: number }> {
  const { data, error } = await adminClient.from('avisos')
    .select('id, user_id, titulo, cuerpo, datos, intentos')
    .is('enviado_at', null).lt('intentos', 5)
    .order('created_at').limit(LOTE);
  if (error) throw error;
  const avisos = (data ?? []) as Aviso[];
  if (!avisos.length) return { enviados: 0, sinTelefono: 0, fallidos: 0 };

  const usuarios = [...new Set(avisos.map((a) => a.user_id))];
  const { data: tokens } = await adminClient.from('push_tokens').select('token, user_id').in('user_id', usuarios);
  const porUsuario = new Map<string, string[]>();
  for (const t of tokens ?? []) porUsuario.set(t.user_id, [...(porUsuario.get(t.user_id) ?? []), t.token]);

  const ahora = new Date().toISOString();
  const sinTel = avisos.filter((a) => !porUsuario.get(a.user_id)?.length);
  if (sinTel.length) await adminClient.from('avisos').update({ enviado_at: ahora, error: 'sin teléfono registrado' }).in('id', sinTel.map((a) => a.id));

  // Un mensaje por teléfono; el badge es lo que lleva sin leer en la app
  const mensajes: { aviso: Aviso; token: string }[] = [];
  for (const a of avisos) for (const token of porUsuario.get(a.user_id) ?? []) mensajes.push({ aviso: a, token });
  if (!mensajes.length) return { enviados: 0, sinTelefono: sinTel.length, fallidos: 0 };

  let tickets: Ticket[] = [];
  try {
    const res = await fetch(env.EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(mensajes.map(({ aviso, token }) => ({
        to: token, title: aviso.titulo, body: aviso.cuerpo, data: aviso.datos, sound: 'default',
      }))),
    });
    const json = (await res.json().catch(() => ({}))) as { data?: Ticket[] };
    if (!res.ok || !Array.isArray(json.data)) throw new Error(`Expo Push respondió ${res.status}`);
    tickets = json.data;
  } catch (e) {
    // Sin conexión o Expo caído: se reintenta en la siguiente vuelta (hasta 5 veces)
    const ids = [...new Set(mensajes.map((m) => m.aviso.id))];
    for (const a of avisos.filter((x) => ids.includes(x.id))) {
      await adminClient.from('avisos').update({ intentos: a.intentos + 1, error: String(e) }).eq('id', a.id);
    }
    return { enviados: 0, sinTelefono: sinTel.length, fallidos: ids.length };
  }

  // Tokens que Expo ya no reconoce (la app se borró): se olvidan
  const muertos = mensajes.filter((_, i) => tickets[i]?.details?.error === 'DeviceNotRegistered').map((m) => m.token);
  if (muertos.length) await adminClient.from('push_tokens').delete().in('token', muertos);

  const errores = new Map<number, string>();
  mensajes.forEach((m, i) => { if (tickets[i]?.status === 'error') errores.set(m.aviso.id, tickets[i].message ?? 'error'); });
  const conTel = avisos.filter((a) => porUsuario.get(a.user_id)?.length);
  for (const a of conTel) {
    await adminClient.from('avisos').update({ enviado_at: ahora, intentos: a.intentos + 1, error: errores.get(a.id) ?? null }).eq('id', a.id);
  }
  return { enviados: conTel.length - errores.size, sinTelefono: sinTel.length, fallidos: errores.size };
}

/** En local (y en un servidor que siempre está prendido): revisa la cola cada AVISOS_CADA_MS. */
export function iniciarEnvioDeAvisos() {
  if (!env.AVISOS_CADA_MS) return;
  let ocupado = false;
  setInterval(async () => {
    if (ocupado) return;
    ocupado = true;
    try {
      const r = await enviarAvisos();
      if (r.enviados || r.fallidos) console.log(`Avisos: ${r.enviados} enviados, ${r.fallidos} con error`);
    } catch (e) {
      console.warn('No se pudo revisar la cola de avisos:', e);
    } finally {
      ocupado = false;
    }
  }, env.AVISOS_CADA_MS);
  console.log(`Avisos: revisando la cola cada ${env.AVISOS_CADA_MS / 1000} s`);
}
