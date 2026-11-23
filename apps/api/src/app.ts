import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { requests } from './routes/requests.js';
import { jobs } from './routes/jobs.js';
import { ia } from './routes/ia.js';

// La aplicación sin arrancar el servidor: así las pruebas la llaman directo con app.request().
export const app = new Hono();
if (process.env.NODE_ENV !== 'test') app.use('*', logger());
app.use('*', cors()); // la app móvil no lo necesita; sirve si pruebas desde la versión web

app.get('/health', (c) => c.json({ ok: true, service: 'oficio-api', version: '0.3.0' }));
app.route('/requests', requests);
app.route('/jobs', jobs);
app.route('/ia', ia);

app.notFound((c) => c.json({ error: 'Ruta no encontrada' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Error interno' }, 500);
});
