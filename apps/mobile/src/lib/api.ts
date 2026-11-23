import { supabase } from './supabase';

// Sprint 5A · La app habla con la API de Oficio solo para lo que necesita llaves secretas (la IA).
// Todo lo demás sigue yendo directo a Supabase. Si falta EXPO_PUBLIC_API_URL o la API no responde,
// las funciones de IA se ocultan y la app funciona igual que antes.
const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
export const apiConfigurada = Boolean(base);

export type RespuestaApi<T> = { data: T; error: null; status: number } | { data: null; error: string; status: number };

export async function llamarApi<T>(ruta: string, opts: { body?: unknown; timeoutMs?: number } = {}): Promise<RespuestaApi<T>> {
  if (!base) return { data: null, error: 'La API no está configurada', status: 0 };
  const { data: s } = await supabase.auth.getSession();
  const token = s.session?.access_token;
  if (!token) return { data: null, error: 'Inicia sesión de nuevo', status: 401 };
  // AbortSignal.timeout no existe en todas las versiones de React Native: se hace a mano
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), opts.timeoutMs ?? 30_000);
  try {
    const res = await fetch(`${base}${ruta}`, {
      method: opts.body === undefined ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: control.signal,
    });
    const json = (await res.json().catch(() => ({}))) as { error?: unknown };
    if (!res.ok) {
      // Los errores de validación de la API no están pensados para el usuario
      const msg = typeof json.error === 'string' ? json.error : 'No pudimos completar la solicitud';
      return { data: null, error: msg, status: res.status };
    }
    return { data: json as T, error: null, status: res.status };
  } catch {
    return { data: null, error: 'No pudimos conectar con el servidor', status: 0 };
  } finally {
    clearTimeout(reloj);
  }
}
