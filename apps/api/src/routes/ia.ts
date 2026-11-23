import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { env } from '../env.js';
import { adminClient } from '../supabase.js';
import { requireUser, type AuthVars } from '../middleware/auth.js';
import { ErrorIA, aVector, embeber, modoIA } from '../services/ia.js';
import { sugerirConClaude, sugerirDemo, type ServicioPrestador } from '../services/asistente.js';

// Sprint 5A · Rutas de IA. Todas piden la sesión del usuario (Authorization: Bearer …).
// Si la IA no está configurada, responden 503 y la app sigue sin ella.
export const ia = new Hono<{ Variables: AuthVars }>();
ia.use('*', requireUser);

const errorDe = (c: any, e: unknown) => {
  if (e instanceof ErrorIA) return c.json({ error: e.message }, e.status);
  throw e;
};

// Límite de usos por persona (lo cuenta la base)
async function registrarUso(c: any, tipo: 'busqueda' | 'asistente', limite: number) {
  const { error } = await c.get('db').rpc('ia_registrar_uso', { p_tipo: tipo, p_limite: limite });
  if (!error) return null;
  return c.json({ error: error.message }, error.code === 'P0001' ? 429 : 400);
}

// Qué está prendido (la app oculta lo que no)
ia.get('/estado', (c) => c.json(modoIA()));

// ---------------------------------------------------------------------------
// A3.0 · Búsqueda en lenguaje natural
// ---------------------------------------------------------------------------
// 1. El diccionario de siempre (match_categories): si encuentra una palabra exacta, gana.
// 2. Si hay llave de Voyage: el texto se convierte en vector (o se toma de la caché) y la base
//    busca los oficios y servicios más parecidos por significado. Le gana a los "parecidos" del
//    diccionario, que a veces se equivocan.
type Categoria = { id: number; slug: string; name: string; score: number; fuente: 'diccionario' | 'significado'; servicios: string[] };

ia.post('/buscar',
  zValidator('json', z.object({ texto: z.string().trim().min(3).max(200) })),
  async (c) => {
    const texto = c.req.valid('json').texto;
    const clave = texto.toLowerCase().normalize('NFC').replace(/\s+/g, ' ');
    const db = c.get('db');

    const { data: dic } = await db.rpc('match_categories', { p_text: texto });
    const categorias: Categoria[] = (dic ?? []).map((d: { category_id: number; slug: string; name: string; score: number }) => ({
      id: d.category_id, slug: d.slug, name: d.name, score: Number(d.score), fuente: 'diccionario', servicios: [],
    }));

    if (!modoIA().busqueda) return c.json({ categorias, significado: false });
    const limite = await registrarUso(c, 'busqueda', env.IA_LIMITE_BUSQUEDA);
    if (limite) return limite;

    try {
      // Caché: la misma búsqueda no se vuelve a mandar a Voyage
      const { data: guardada } = await adminClient.from('ia_consultas').select('embedding, usos')
        .eq('texto', clave).eq('modelo', env.VOYAGE_MODELO).maybeSingle();
      let vector: string;
      if (guardada) {
        vector = guardada.embedding as string;
        await adminClient.from('ia_consultas').update({ usos: guardada.usos + 1 }).eq('texto', clave).eq('modelo', env.VOYAGE_MODELO);
      } else {
        vector = aVector((await embeber([clave], 'query'))[0]);
        await adminClient.from('ia_consultas').upsert({ texto: clave, modelo: env.VOYAGE_MODELO, embedding: vector });
      }
      const { data: sem, error } = await db.rpc('categorias_por_significado', { p_embedding: vector, p_umbral: env.IA_UMBRAL_BUSQUEDA, p_limite: 3 });
      if (error) throw error;
      // Orden: 1) palabra exacta del diccionario ("pastilla"), 2) lo que encontró la IA por significado,
      // 3) parecidos del diccionario ("coladera" se parece a "colado", pero es de plomería, no de albañilería).
      const exactas = categorias.filter((x) => x.score >= 1);
      const parecidas = categorias.filter((x) => x.score < 1);
      const orden: Categoria[] = [...exactas];
      for (const s of (sem ?? []) as { category_id: number; slug: string; name: string; score: number; servicios: string[] }[]) {
        const ya = orden.find((x) => x.id === s.category_id);
        if (ya) ya.servicios = s.servicios;
        else orden.push({ id: s.category_id, slug: s.slug, name: s.name, score: Number(s.score), fuente: 'significado', servicios: s.servicios });
      }
      for (const x of parecidas) if (!orden.some((o) => o.id === x.id)) orden.push(x);
      return c.json({ categorias: orden.slice(0, 3), significado: true });
    } catch (e) {
      // Si Voyage falla, se queda con el diccionario: la búsqueda nunca se rompe por la IA
      console.error('IA · búsqueda por significado falló:', e instanceof Error ? e.message : e);
      return c.json({ categorias, significado: false });
    }
  });

// ---------------------------------------------------------------------------
// A6 · Asistente de solicitud
// ---------------------------------------------------------------------------
// Las fotos llegan ya reducidas por la app (JPEG de ~1024 px en base64): no se guardan aquí,
// solo se le muestran al modelo. Si el cliente no envía la solicitud, no queda rastro.
const MAX_FOTO_BASE64 = 2_000_000; // ~1.5 MB por foto

ia.post('/asistente-solicitud',
  bodyLimit({ maxSize: 12 * 1024 * 1024, onError: (c) => c.json({ error: 'Las fotos pesan demasiado' }, 413) }),
  zValidator('json', z.object({
    prestadorId: z.uuid(),
    servicioId: z.uuid().nullable().optional(),
    descripcion: z.string().trim().max(1000).default(''),
    fotos: z.array(z.object({
      data: z.string().min(100).max(MAX_FOTO_BASE64).regex(/^[A-Za-z0-9+/=]+$/),
      media_type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    })).max(5).default([]),
  }).refine((b) => b.descripcion.length >= 10 || b.fotos.length > 0, { message: 'Escribe qué pasa o agrega una foto' })),
  async (c) => {
    const modo = modoIA().asistente;
    if (modo === 'apagado') return c.json({ error: 'El asistente no está configurado' }, 503);
    const body = c.req.valid('json');

    // El perfil público del prestador, con la sesión del cliente (si no existe o no está verificado, no hay sugerencias)
    const { data: perfil } = await c.get('db').rpc('perfil_prestador', { p_provider: body.prestadorId });
    const p = perfil as { full_name: string; verificado: boolean; servicios: ServicioPrestador[] } | null;
    if (!p || !p.servicios?.length) return c.json({ error: 'Prestador no encontrado' }, 404);

    const limite = await registrarUso(c, 'asistente', env.IA_LIMITE_ASISTENTE);
    if (limite) return limite;

    try {
      const entrada = {
        prestador: p.full_name.split(' ')[0],
        servicios: p.servicios,
        servicioElegido: body.servicioId ?? null,
        descripcion: body.descripcion,
        fotos: body.fotos,
      };
      const sugerencia = modo === 'real' ? await sugerirConClaude(entrada) : sugerirDemo(entrada);
      return c.json({ sugerencia, modo });
    } catch (e) {
      return errorDe(c, e);
    }
  });
