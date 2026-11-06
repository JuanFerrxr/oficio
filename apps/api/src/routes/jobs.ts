import { Hono } from 'hono';
import { env } from '../env.js';
import { adminClient } from '../supabase.js';
import { notify } from '../services/push.js';

// Tareas que dispara Cloud Scheduler (en local las llamas tú con curl).
// Se protegen con un secreto compartido en el encabezado x-cron-secret.
export const jobs = new Hono();

jobs.use('*', async (c, next) => {
  if (c.req.header('x-cron-secret') !== env.CRON_SECRET) return c.json({ error: 'No autorizado' }, 401);
  await next();
});

// Cada 5 minutos: solicitudes pendientes con más de 2 h sin respuesta pasan a "expirada"
jobs.post('/expire-requests', async (c) => {
  const { data, error } = await adminClient.rpc('expire_requests');
  if (error) return c.json({ error: error.message }, 500);
  const rows = (data ?? []) as { id: string; client_id: string }[];
  await Promise.all(rows.map((r) =>
    notify(r.client_id, 'Tu solicitud expiró', 'El prestador no respondió en 2 horas. Prueba con otro cerca de ti.', { requestId: r.id })));
  return c.json({ expired: rows.length });
});
