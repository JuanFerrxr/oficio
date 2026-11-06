import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireUser, type AuthVars } from '../middleware/auth.js';
import { notify } from '../services/push.js';

// Cada ruta llama a la función transition_request de la base. La base decide si la
// transición es válida y quién puede hacerla; la API agrega lo que la base no puede
// hacer: avisar al otro participante con una notificación push.
export const requests = new Hono<{ Variables: AuthVars }>();
requests.use('*', requireUser);

type Status = 'accepted' | 'declined' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
type Row = { id: string; client_id: string; provider_id: string; status: string };

const PUSH: Record<Status, { to: 'client' | 'provider'; title: string; body: string }> = {
  accepted:    { to: 'client',   title: 'Tienes una cotización', body: 'El prestador aceptó y propuso precio y hora. Confírmala.' },
  declined:    { to: 'client',   title: 'Solicitud rechazada',   body: 'El prestador no puede atenderte. Te sugerimos otros cerca.' },
  scheduled:   { to: 'provider', title: 'Cita confirmada',       body: 'El cliente confirmó. Ya puedes ver la dirección y su teléfono.' },
  in_progress: { to: 'client',   title: 'Trabajo iniciado',      body: 'El prestador marcó que empezó el trabajo.' },
  completed:   { to: 'provider', title: 'Trabajo terminado',     body: 'El cliente confirmó el término. ¡Califícalo!' },
  cancelled:   { to: 'provider', title: 'Solicitud cancelada',   body: 'La solicitud se canceló.' },
};

async function move(c: any, to: Status, args: Record<string, unknown> = {}) {
  const db = c.get('db');
  const { data, error } = await db.rpc('transition_request', { p_request_id: c.req.param('id'), p_to: to, ...args });
  if (error) {
    // Los errores de la base ya vienen en español (ver transition_request)
    const status = error.code === '42501' ? 403 : error.code === 'P0002' ? 404 : 400;
    return c.json({ error: error.message }, status);
  }
  const row = data as Row;
  const me = c.get('user').id;
  const p = PUSH[to];
  // En cancelación se avisa a quien NO canceló
  const target = to === 'cancelled' ? (me === row.client_id ? row.provider_id : row.client_id)
                                    : (p.to === 'client' ? row.client_id : row.provider_id);
  await notify(target, p.title, p.body, { requestId: row.id, status: to });
  return c.json({ request: row });
}

// B5 · el prestador acepta con precio y hora
requests.post('/:id/accept',
  zValidator('json', z.object({
    quotedPrice: z.number().nonnegative().max(100000),
    scheduledAt: z.iso.datetime({ offset: true }),
    message: z.string().max(1000).optional(),
  })),
  async (c) => {
    const body = c.req.valid('json');
    const res = await move(c, 'accepted', { p_quoted_price: body.quotedPrice, p_scheduled_at: body.scheduledAt, p_note: body.message ?? null });
    if (res.status === 200 && body.message) {
      const db = c.get('db');
      await db.from('messages').insert({ request_id: c.req.param('id'), sender_id: c.get('user').id, body: body.message });
    }
    return res;
  });

requests.post('/:id/decline',  (c) => move(c, 'declined'));
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
