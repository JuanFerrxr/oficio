import { adminClient } from '../supabase.js';

// Notificaciones con Expo Push (Expo se encarga de FCM en Android y APNs en iOS).
// Si el usuario no tiene teléfonos registrados, no pasa nada.
export async function notify(userId: string, title: string, body: string, data: Record<string, unknown> = {}) {
  const { data: tokens, error } = await adminClient.from('push_tokens').select('token').eq('user_id', userId);
  if (error || !tokens?.length) return;

  const messages = tokens.map((t) => ({ to: t.token, title, body, data, sound: 'default' }));
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    if (!res.ok) console.warn('Expo Push respondió', res.status, await res.text());
  } catch (e) {
    // Una notificación fallida nunca debe tumbar la acción del usuario.
    console.warn('No se pudo enviar push:', e);
  }
}
