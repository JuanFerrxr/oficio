import { serve } from '@hono/node-server';
import { app } from './app.js';
import { env } from './env.js';
import { iniciarEnvioDeAvisos } from './services/push.js';
import { iniciarIndexado, modoIA } from './services/ia.js';

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`API de Oficio escuchando en http://localhost:${info.port}`);
  const m = modoIA();
  console.log(`IA · búsqueda por significado: ${m.busqueda ? 'activa' : 'apagada (falta VOYAGE_API_KEY)'} · asistente: ${m.asistente}`);
  iniciarEnvioDeAvisos();
  iniciarIndexado();
});

export default app;
