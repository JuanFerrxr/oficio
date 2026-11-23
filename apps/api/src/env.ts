// Lee y valida las variables de entorno al arrancar: si falta una, falla de inmediato
// con un mensaje claro en vez de fallar a la mitad de una petición.
import { z } from 'zod';

// Una llave vacía (ANTHROPIC_API_KEY=) cuenta como si no estuviera
const opcional = (min: number) => z.preprocess((v) => (v === '' ? undefined : v), z.string().min(min).optional());

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

  // Sprint 5A · IA. Todo es opcional: sin llaves, la app funciona igual que antes (sin IA).
  // Claude (Anthropic): asistente de solicitud. Sin llave y con IA_DEMO=true, responde ejemplos.
  ANTHROPIC_API_KEY: opcional(20),
  ANTHROPIC_URL: z.url().default('https://api.anthropic.com/v1/messages'),
  CLAUDE_MODELO: z.string().default('claude-haiku-5-5'),
  IA_DEMO: z.stringbool().default(false),
  // Voyage AI: embeddings para la búsqueda por significado
  VOYAGE_API_KEY: opcional(10),
  VOYAGE_URL: z.url().default('https://api.voyageai.com/v1/embeddings'),
  VOYAGE_MODELO: z.string().default('voyage-4'),
  // Similitud mínima (0 a 1) para sugerir un oficio. Súbela si sugiere oficios que no tienen que ver.
  IA_UMBRAL_BUSQUEDA: z.coerce.number().min(0).max(1).default(0.35),
  // Cada cuánto se recalculan los vectores de servicios nuevos o editados. 0 = solo con /jobs/ia-indexar
  IA_INDEXAR_CADA_MS: z.coerce.number().int().min(0).default(60_000),
  // Usos por persona en 24 horas
  IA_LIMITE_BUSQUEDA: z.coerce.number().int().min(1).default(200),
  IA_LIMITE_ASISTENTE: z.coerce.number().int().min(1).default(30),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Variables de entorno inválidas:\n' + z.prettifyError(parsed.error));
  process.exit(1);
}
export const env = parsed.data;
