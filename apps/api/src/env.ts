// Lee y valida las variables de entorno al arrancar: si falta una, falla de inmediato
// con un mensaje claro en vez de fallar a la mitad de una petición.
import { z } from 'zod';

const schema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  CRON_SECRET: z.string().min(16, 'CRON_SECRET debe tener al menos 16 caracteres'),
  PORT: z.coerce.number().default(8080),
  // Sprint 4B · notificaciones: a dónde se mandan (Expo Push) y cada cuánto se revisa la cola de avisos.
  // AVISOS_CADA_MS=0 apaga el envío automático (en Cloud Run lo dispara Cloud Scheduler con /jobs/enviar-avisos).
  EXPO_PUSH_URL: z.url().default('https://exp.host/--/api/v2/push/send'),
  AVISOS_CADA_MS: z.coerce.number().int().min(0).default(3000),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Variables de entorno inválidas:\n' + z.prettifyError(parsed.error));
  process.exit(1);
}
export const env = parsed.data;
