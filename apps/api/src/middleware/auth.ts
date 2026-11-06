import { createMiddleware } from 'hono/factory';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { adminClient, userClient } from '../supabase.js';

export type AuthVars = { user: User; db: SupabaseClient };

// Valida el token que manda la app (Authorization: Bearer <access_token> de Supabase Auth)
// preguntándole a Supabase quién es. Si es válido, deja en el contexto al usuario y un
// cliente de base de datos que actúa como él.
export const requireUser = createMiddleware<{ Variables: AuthVars }>(async (c, next) => {
  const header = c.req.header('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return c.json({ error: 'Falta el token de sesión' }, 401);

  const { data, error } = await adminClient.auth.getUser(token);
  if (error || !data.user) return c.json({ error: 'Sesión inválida o vencida' }, 401);

  c.set('user', data.user);
  c.set('db', userClient(token));
  await next();
});
