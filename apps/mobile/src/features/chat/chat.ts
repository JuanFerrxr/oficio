import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { Database } from '@oficio/shared/types/database';
import { useSession } from '@/features/auth/session';
import { diaRelativo, hora, isoDe, isoEnDias } from '@/features/cliente/formato';
import { supabase } from '@/lib/supabase';

// A3.2 · A3.3 · B9 · B9.3 · Chat. Los mensajes se guardan directo en la tabla messages (RLS deja
// escribir solo a los dos participantes y mientras la solicitud está vigente). Fotos, video y
// notas de voz van al bucket privado chat-media/<solicitud>/…; media_url guarda esa ruta.
export type Conversacion = Database['public']['Functions']['mis_conversaciones']['Returns'][number];
export type Mensaje = Database['public']['Tables']['messages']['Row'];
export type ChatInfo = {
  request_id: string; rol: 'cliente' | 'prestador'; status: string; abierto: boolean; servicio: string; oficio: string;
  scheduled_at: string | null; quoted_price_mxn: number | null; otro_id: string; otro_nombre: string; otro_avatar: string | null;
  responde_min: number | null; cliente_calificacion: number | null; colonia: string | null;
  destino: { lat: number; lng: number; direccion: string } | null;
};

/** "0:18" */
export const duracion = (s: number | null | undefined) => `${Math.floor((s ?? 0) / 60)}:${String((s ?? 0) % 60).padStart(2, '0')}`;

/** Vista previa del último mensaje en la lista */
export function vistaPrevia(c: Pick<Conversacion, 'ultimo_tipo' | 'ultimo_texto' | 'ultimo_duracion' | 'ultimo_mio'>) {
  if (!c.ultimo_tipo) return 'Escribe para resolver dudas o coordinar la visita';
  const txt = c.ultimo_tipo === 'text' ? c.ultimo_texto ?? ''
    : c.ultimo_tipo === 'image' ? 'Foto' : c.ultimo_tipo === 'video' ? 'Video'
    : c.ultimo_tipo === 'audio' ? `Nota de voz · ${duracion(c.ultimo_duracion)}` : 'Ubicación';
  return c.ultimo_mio ? `Tú: ${txt}` : txt;
}

/** "10:31" hoy · "Ayer" · "Lun" (esta semana) · "7 oct" */
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export function horaLista(ts: string | null) {
  if (!ts) return '';
  const d = isoDe(ts);
  if (d === isoEnDias(0)) return hora(ts);
  if (d === isoEnDias(-1)) return 'Ayer';
  const f = new Date(`${d}T12:00:00`);
  if (d > isoEnDias(-7)) return DIAS[f.getDay()];
  return `${f.getDate()} ${MESES[f.getMonth()]}`;
}

/** Lo que va debajo del nombre en la lista: "Visita de diagnóstico · hoy 16:00" */
export function lineaServicio(c: Pick<Conversacion, 'servicio' | 'status' | 'scheduled_at' | 'rol' | 'expires_at'>) {
  const cuando = c.scheduled_at ? `${diaRelativo(isoDe(c.scheduled_at)).toLowerCase()} ${hora(c.scheduled_at)}` : null;
  const vencida = c.status === 'pending' && new Date(c.expires_at).getTime() < Date.now();
  const estado = vencida ? 'expiró'
    : c.status === 'pending' ? (c.rol === 'prestador' ? 'solicitud nueva' : 'esperando respuesta')
    : c.status === 'accepted' ? (c.rol === 'prestador' ? 'esperando que confirme' : 'por confirmar')
    : c.status === 'scheduled' || c.status === 'in_progress' ? cuando
    : c.status === 'completed' ? 'terminado'
    : c.status === 'declined' ? (c.rol === 'prestador' ? 'la rechazaste' : 'rechazada')
    : c.status === 'cancelled' ? 'cancelada' : 'expiró';
  return [c.servicio, estado].filter(Boolean).join(' · ');
}

/** Pestaña de B9 (prestador): Nuevas · Activas · Historial */
export function grupoMensajes(c: Conversacion): 'nuevas' | 'activas' | 'historial' {
  const vencida = c.status === 'pending' && new Date(c.expires_at).getTime() < Date.now();
  if (c.status === 'pending' && !vencida) return 'nuevas';
  if (['accepted', 'scheduled', 'in_progress'].includes(c.status)) return 'activas';
  return 'historial';
}

/**
 * Escucha cambios en mensajes y solicitudes (tiempo real; la base solo manda los tuyos por RLS),
 * con respaldo cada `cada` ms y al volver a la app.
 */
function useEnVivo(nombre: string, recargar: () => void, cada: number, filtroMensajes?: string) {
  const ultima = useRef(recargar);
  ultima.current = recargar;
  useFocusEffect(useCallback(() => {
    ultima.current();
    const t = setInterval(() => ultima.current(), cada);
    const app = AppState.addEventListener('change', (s) => { if (s === 'active') ultima.current(); });
    const canal = supabase.channel(`${nombre}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', ...(filtroMensajes ? { filter: filtroMensajes } : {}) }, () => ultima.current())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'service_requests' }, () => ultima.current())
      .subscribe();
    return () => { clearInterval(t); app.remove(); supabase.removeChannel(canal); };
  }, [nombre, cada, filtroMensajes]));
}

export function useConversaciones() {
  const [lista, setLista] = useState<Conversacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const recargar = useCallback(async () => {
    const { data, error } = await supabase.rpc('mis_conversaciones');
    setError(!!error);
    if (data) setLista(data);
    setCargando(false);
  }, []);
  useEnVivo('conversaciones', recargar, 15_000);
  return { lista, cargando, error, recargar };
}

/** Insignia de la pestaña Mensajes */
export function useNoLeidos() {
  const { session } = useSession();
  const [n, setN] = useState(0);
  const recargar = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase.rpc('mis_no_leidos');
    setN(data ?? 0);
  }, [session]);
  // Las pestañas no pierden el foco: se escucha siempre mientras haya sesión
  useEffect(() => {
    if (!session) return;
    recargar();
    const t = setInterval(recargar, 20_000);
    const app = AppState.addEventListener('change', (s) => { if (s === 'active') recargar(); });
    const canal = supabase.channel(`no-leidos-${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => recargar())
      .subscribe();
    return () => { clearInterval(t); app.remove(); supabase.removeChannel(canal); };
  }, [session, recargar]);
  return n;
}

export function useConversacion(requestId: string) {
  const { session } = useSession();
  const uid = session?.user.id;
  const [info, setInfo] = useState<ChatInfo | null | undefined>(undefined);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const recargar = useCallback(async () => {
    const [i, m] = await Promise.all([
      supabase.rpc('chat_info', { p_request_id: requestId }),
      supabase.from('messages').select('*').eq('request_id', requestId).order('created_at').limit(500),
    ]);
    setInfo((i.data as ChatInfo | null) ?? null);
    if (m.data) {
      setMensajes(m.data);
      // Al ver mensajes nuevos del otro, se marcan como leídos ("Visto")
      if (m.data.some((x) => !x.read_at && x.sender_id !== uid)) await supabase.rpc('marcar_leidos', { p_request_id: requestId });
    }
  }, [requestId, uid]);
  // Mientras la conversación está abierta: tiempo real y, de respaldo, cada 4 s
  useEnVivo(`chat-${requestId}`, recargar, 4_000, `request_id=eq.${requestId}`);
  return { info, mensajes, recargar, setMensajes };
}

// ---- Archivos (bucket privado chat-media) ----
const cacheUrls = new Map<string, { url: string; vence: number }>();
export async function urlArchivo(ruta: string) {
  const c = cacheUrls.get(ruta);
  if (c && c.vence > Date.now()) return c.url;
  const { data } = await supabase.storage.from('chat-media').createSignedUrl(ruta, 3600);
  if (data?.signedUrl) cacheUrls.set(ruta, { url: data.signedUrl, vence: Date.now() + 50 * 60_000 });
  return data?.signedUrl ?? null;
}
export function useUrlArchivo(ruta: string | null) {
  const [url, setUrl] = useState<string | null>(ruta ? cacheUrls.get(ruta)?.url ?? null : null);
  useEffect(() => { if (ruta) urlArchivo(ruta).then(setUrl); }, [ruta]);
  return url;
}

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'audio/mp4': 'm4a', 'audio/m4a': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac',
};

// ---- Enviar ----
type Nuevo = { tipo: 'text'; texto: string }
  | { tipo: 'image' | 'video' | 'audio'; uri: string; mime: string; segundos?: number }
  | { tipo: 'location'; lat: number; lng: number; direccion?: string };

export async function enviar(requestId: string, uid: string, m: Nuevo) {
  if (m.tipo === 'text') {
    return supabase.from('messages').insert({ request_id: requestId, sender_id: uid, type: 'text', body: m.texto.trim() });
  }
  if (m.tipo === 'location') {
    return supabase.from('messages').insert({ request_id: requestId, sender_id: uid, type: 'location', lat: m.lat, lng: m.lng, body: m.direccion ?? null });
  }
  const ruta = `${requestId}/${uid.slice(0, 8)}-${Date.now()}.${EXT[m.mime] ?? 'bin'}`;
  const contenido = await fetch(m.uri).then((r) => r.arrayBuffer());
  const sub = await supabase.storage.from('chat-media').upload(ruta, contenido, { contentType: m.mime });
  if (sub.error) return { error: sub.error };
  return supabase.from('messages').insert({
    request_id: requestId, sender_id: uid, type: m.tipo, media_url: ruta,
    duration_s: m.tipo === 'image' ? null : Math.max(1, Math.round(m.segundos ?? 1)),
  });
}
