// Lee y valida las variables de entorno al arrancar: si falta una, falla de inmediato
// con un mensaje claro en vez de fallar a la mitad de una petición.
import { z } from 'zod';

const schema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  CRON_SECRET: z.string().min(16, 'CRON_SECRET debe tener al menos 16 caracteres'),
  PORT: z.coerce.number().default(8080),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Variables de entorno inválidas:\n' + z.prettifyError(parsed.error));
  process.exit(1);
}
export const env = parsed.data;
