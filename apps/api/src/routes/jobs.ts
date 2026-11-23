import { Hono } from 'hono';
import { env } from '../env.js';
import { adminClient } from '../supabase.js';
import { enviarAvisos } from '../services/push.js';
import { indexarEmbeddings } from '../services/ia.js';

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
  // El aviso al cliente lo deja la base (disparador de avisos); aquí solo se cuenta
  const rows = (data ?? []) as { id: string }[];
  return c.json({ expired: rows.length });
});

// Cada minuto (Cloud Scheduler): manda los avisos pendientes por Expo Push
jobs.post('/enviar-avisos', async (c) => c.json(await enviarAvisos()));

// Sprint 5A · calcula los vectores de oficios y servicios nuevos o editados (búsqueda por significado).
// En local lo hace sola la API cada minuto; en Cloud Run (que se apaga) lo dispara Cloud Scheduler.
jobs.post('/ia-indexar', async (c) => c.json(await indexarEmbeddings()));
