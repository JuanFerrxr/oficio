import { env } from '../env.js';
import { adminClient } from '../supabase.js';

// Sprint 5A · Clientes de IA.
//
// - Claude (Anthropic) lee y redacta. Siempre se le pide la respuesta a través de una "herramienta"
//   con esquema JSON fijo (tool_choice forzado): así contesta datos estructurados, no texto libre,
//   y la API los valida antes de usarlos.
// - Voyage AI convierte textos en vectores (embeddings) para buscar por significado.
//
// Las llaves solo existen aquí, en la API. La app nunca habla directo con estos servicios.

export type ModoAsistente = 'real' | 'demo' | 'apagado';

export function modoIA(): { busqueda: boolean; asistente: ModoAsistente } {
  return {
    busqueda: !!env.VOYAGE_API_KEY,
    asistente: env.ANTHROPIC_API_KEY ? 'real' : env.IA_DEMO ? 'demo' : 'apagado',
  };
}

export class ErrorIA extends Error {
  constructor(message: string, readonly status = 502) { super(message); }
}

// ---------------------------------------------------------------------------
// Claude
// ---------------------------------------------------------------------------
export type BloqueClaude =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/webp'; data: string } };

export type Herramienta = { name: string; description: string; input_schema: Record<string, unknown> };

export async function pedirAClaude<T>(opts: {
  sistema: string;
  contenido: BloqueClaude[];
  herramienta: Herramienta;
  maxTokens?: number;
}): Promise<T> {
  if (!env.ANTHROPIC_API_KEY) throw new ErrorIA('La IA no está configurada', 503);
  let res: Response;
  try {
    res = await fetch(env.ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: env.CLAUDE_MODELO,
        max_tokens: opts.maxTokens ?? 800,
        system: opts.sistema,
        tools: [opts.herramienta],
        tool_choice: { type: 'tool', name: opts.herramienta.name },
        messages: [{ role: 'user', content: opts.contenido }],
      }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch (e) {
    throw new ErrorIA(`No pudimos contactar a la IA (${(e as Error).name})`);
  }
  const json = (await res.json().catch(() => ({}))) as {
    content?: { type: string; name?: string; input?: unknown }[];
    error?: { message?: string };
  };
  if (!res.ok) {
    console.error('Claude respondió', res.status, json.error?.message);
    throw new ErrorIA(res.status === 429 ? 'La IA está saturada. Intenta en un momento.' : 'La IA no pudo responder');
  }
  const uso = json.content?.find((b) => b.type === 'tool_use' && b.name === opts.herramienta.name);
  if (!uso?.input || typeof uso.input !== 'object') throw new ErrorIA('La IA respondió en un formato inesperado');
  return uso.input as T;
}

// ---------------------------------------------------------------------------
// Voyage
// ---------------------------------------------------------------------------
const DIMENSION = 1024;

export async function embeber(textos: string[], tipo: 'query' | 'document'): Promise<number[][]> {
  if (!env.VOYAGE_API_KEY) throw new ErrorIA('La búsqueda por significado no está configurada', 503);
  let res: Response;
  try {
    res = await fetch(env.VOYAGE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.VOYAGE_API_KEY}` },
      body: JSON.stringify({ input: textos, model: env.VOYAGE_MODELO, input_type: tipo, output_dimension: DIMENSION }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    throw new ErrorIA(`No pudimos contactar a Voyage (${(e as Error).name})`);
  }
  const json = (await res.json().catch(() => ({}))) as { data?: { embedding: number[]; index: number }[]; detail?: string };
  if (!res.ok || !Array.isArray(json.data)) {
    console.error('Voyage respondió', res.status, json.detail);
    throw new ErrorIA('Voyage no pudo responder');
  }
  const vectores = [...json.data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
  if (vectores.length !== textos.length || vectores.some((v) => v.length !== DIMENSION)) {
    throw new ErrorIA('Voyage regresó vectores de un tamaño inesperado');
  }
  return vectores;
}

// pgvector recibe el vector como texto: "[0.1,0.2,…]"
export const aVector = (v: number[]) => `[${v.join(',')}]`;

// ---------------------------------------------------------------------------
// Indexado: calcula los vectores de oficios y servicios nuevos o editados
// ---------------------------------------------------------------------------
type Pendiente = { clave: string; category_id: number; service_id: string | null; contenido: string; hash: string };

export async function indexarEmbeddings(): Promise<{ calculados: number; borrados: number }> {
  if (!env.VOYAGE_API_KEY) return { calculados: 0, borrados: 0 };
  let calculados = 0;
  for (let vuelta = 0; vuelta < 20; vuelta++) {
    const { data, error } = await adminClient.rpc('ia_documentos_pendientes', { p_modelo: env.VOYAGE_MODELO, p_limite: 100 });
    if (error) throw error;
    const pendientes = (data ?? []) as Pendiente[];
    if (!pendientes.length) break;
    const vectores = await embeber(pendientes.map((p) => p.contenido), 'document');
    const filas = pendientes.map((p, i) => ({
      clave: p.clave, category_id: p.category_id, service_id: p.service_id, hash: p.hash,
      modelo: env.VOYAGE_MODELO, embedding: aVector(vectores[i]), actualizado_at: new Date().toISOString(),
    }));
    const { error: e2 } = await adminClient.from('ia_embeddings').upsert(filas);
    if (e2) throw e2;
    calculados += filas.length;
  }
  const { data: borrados, error: e3 } = await adminClient.rpc('ia_limpiar_embeddings');
  if (e3) throw e3;
  return { calculados, borrados: (borrados as number) ?? 0 };
}

let indexando = false;
export function iniciarIndexado() {
  if (!env.VOYAGE_API_KEY || !env.IA_INDEXAR_CADA_MS) return;
  const vuelta = async () => {
    if (indexando) return;
    indexando = true;
    try {
      const r = await indexarEmbeddings();
      if (r.calculados || r.borrados) console.log(`IA · vectores calculados: ${r.calculados}, borrados: ${r.borrados}`);
    } catch (e) {
      console.error('IA · no se pudieron calcular los vectores:', e instanceof Error ? e.message : e);
    } finally {
      indexando = false;
    }
  };
  void vuelta();
  setInterval(vuelta, env.IA_INDEXAR_CADA_MS).unref();
}
