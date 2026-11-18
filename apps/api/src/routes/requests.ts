import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireUser, type AuthVars } from '../middleware/auth.js';

// Cada ruta llama a una función de la base. La base decide si la transición es válida y
// quién puede hacerla, y desde el Sprint 4B también deja el aviso para el otro participante.
// La app ya no usa estas rutas (habla directo con la base); quedan para integraciones.
export const requests = new Hono<{ Variables: AuthVars }>();
requests.use('*', requireUser);

type Status = 'accepted' | 'declined' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
type Row = { id: string; client_id: string; provider_id: string; status: string };

async function move(c: any, to: Status, args: Record<string, unknown> = {}, fn = 'transition_request') {
  const db = c.get('db');
  const params = fn === 'transition_request' ? { p_request_id: c.req.param('id'), p_to: to, ...args } : { p_request_id: c.req.param('id'), ...args };
  const { data, error } = await db.rpc(fn, params);
  if (error) {
    // Los errores de la base ya vienen en español (ver transition_request)
    const status = error.code === '42501' ? 403 : error.code === 'P0002' ? 404 : 400;
    return c.json({ error: error.message }, status);
  }
  // El aviso al otro participante lo deja la base (tabla avisos) y lo manda el envío de avisos
  return c.json({ request: data as Row });
}

// B5 · el prestador acepta con precio, hora y mensaje (el mensaje lo guarda la base en el chat)
requests.post('/:id/accept',
  zValidator('json', z.object({
    quotedPrice: z.number().positive().max(100000),
    scheduledAt: z.iso.datetime({ offset: true }),
    message: z.string().max(500).optional(),
  })),
  (c) => {
    const body = c.req.valid('json');
    return move(c, 'accepted', { p_precio: body.quotedPrice, p_hora: body.scheduledAt, p_mensaje: body.message ?? null }, 'cotizar_solicitud');
  });

// B4 · rechazar con motivo
requests.post('/:id/decline',
  zValidator('json', z.object({
    reason: z.enum(['sin_disponibilidad', 'fuera_de_zona', 'no_lo_hago', 'otro']),
    note: z.string().max(300).optional(),
  })),
  (c) => {
    const { reason, note } = c.req.valid('json');
    return move(c, 'declined', { p_motivo: reason, p_nota: note ?? null }, 'rechazar_solicitud');
  });
requests.post('/:id/confirm',  (c) => move(c, 'scheduled'));   // A7 · cliente confirma la cita
requests.post('/:id/start',    (c) => move(c, 'in_progress'));
requests.post('/:id/complete', (c) => move(c, 'completed'));

// A7.1 · cancelar con motivo
requests.post('/:id/cancel',
  zValidator('json', z.object({
    reason: z.enum(['resolved', 'other_provider', 'schedule', 'price', 'other']),
    note: z.string().max(500).optional(),
  })),
  (c) => {
    const { reason, note } = c.req.valid('json');
    return move(c, 'cancelled', { p_cancel_reason: reason, p_note: note ?? null });
  });

// B4 · el prestador abrió la solicitud → el cliente ve "Vista"
requests.post('/:id/viewed', async (c) => {
  const { error } = await c.get('db').rpc('mark_request_viewed', { p_request_id: c.req.param('id') });
  return error ? c.json({ error: error.message }, 400) : c.body(null, 204);
});
