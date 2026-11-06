import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { env } from './env.js';
import { requests } from './routes/requests.js';
import { jobs } from './routes/jobs.js';

const app = new Hono();
app.use('*', logger());
app.use('*', cors()); // la app móvil no lo necesita; sirve si pruebas desde la versión web

app.get('/health', (c) => c.json({ ok: true, service: 'oficio-api', version: '0.2.0' }));
app.route('/requests', requests);
app.route('/jobs', jobs);

app.notFound((c) => c.json({ error: 'Ruta no encontrada' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Error interno' }, 500);
});

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`API de Oficio escuchando en http://localhost:${info.port}`);
});

export default app;
