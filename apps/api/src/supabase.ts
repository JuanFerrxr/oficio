import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';

const opts = { auth: { persistSession: false, autoRefreshToken: false } };

// Cliente "como el usuario": manda su token, así RLS y auth.uid() aplican igual que en la app.
// Es el que se usa en casi todas las rutas: la API no se salta las reglas de la base.
export function userClient(accessToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    ...opts,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// Cliente administrador (service role): solo para tareas del sistema
// (expirar solicitudes, leer tokens de push del otro participante, crear datos demo).
export const adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, opts);
