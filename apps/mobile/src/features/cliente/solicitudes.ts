import { useCallback, useState } from 'react';
import { useSession } from '@/features/auth/session';
import { useSolicitudesEnVivo } from '@/lib/enVivo';
import { supabase } from '@/lib/supabase';
import type { EstadoTarjeta } from '@/components/cliente/RequestCard';
import type { Solicitud } from './datos';
import { FRANJAS, MOTIVOS_RECHAZO, diaCorto, diaRelativo, hace, hora, isoDe, lista, numeroDia, pesos, primerNombre } from './formato';

// A3 y A3.1 · Mis solicitudes: en qué grupo va cada una y qué dice su tarjeta.

/** Pendiente y ya pasaron las 2 h: se trata como expirada aunque el trabajo que la marca no haya corrido. */
export const expirada = (s: Solicitud) => s.status === 'expired' || (s.status === 'pending' && new Date(s.expires_at).getTime() < Date.now());

export type Grupo = 'aceptadas' | 'esperando' | 'rechazadas' | 'historial';
export function grupo(s: Solicitud): Grupo {
  if (expirada(s) || s.status === 'declined') return 'rechazadas';
  if (s.status === 'pending') return 'esperando';
  if (s.status === 'accepted' || s.status === 'scheduled' || s.status === 'in_progress') return 'aceptadas';
  return 'historial';
}

function estado(s: Solicitud): EstadoTarjeta {
  if (expirada(s) || s.status === 'declined') return 'rechazada';
  if (s.status === 'pending') return s.viewed_at ? 'vista' : 'enviada';
  if (s.status === 'accepted') return 'aceptada';
  if (s.status === 'scheduled') return 'confirmada';
  if (s.status === 'in_progress') return 'trabajando';
  if (s.status === 'completed') return 'completada';
  return 'cancelada';
}

/** "Hoy · 16:00" con cita; si no, "Jue 16 o vie 17 · mañana o tarde" */
export function detalleCuando(s: Pick<Solicitud, 'scheduled_at' | 'preferred_dates' | 'time_windows'>): string {
  if (s.scheduled_at) return `${diaRelativo(isoDe(s.scheduled_at))} · ${hora(s.scheduled_at)}`;
  const dias = [...(s.preferred_dates ?? [])].sort();
  const textoDias = dias.length === 1 ? diaRelativo(dias[0]) : lista(dias.slice(0, 3).map((d, i) => (i === 0 ? `${diaCorto(d)} ${numeroDia(d)}` : `${diaCorto(d).toLowerCase()} ${numeroDia(d)}`)));
  const franjas = FRANJAS.filter((f) => s.time_windows?.includes(f.value));
  const textoFranjas = franjas.length === 1 ? franjas[0].tarjeta : lista(franjas.map((f) => f.tarjeta.split(' ')[0]));
  return [textoDias, textoFranjas].filter(Boolean).join(' · ');
}

function nota(s: Solicitud): string {
  const quien = primerNombre(s.provider_name);
  if (expirada(s)) return 'No respondió en 2 h y la solicitud expiró';
  switch (s.status) {
    case 'pending':
      return s.viewed_at
        ? `La vio ${hace(s.viewed_at)} · tiene hasta las ${hora(s.expires_at)} para responder`
        : `Enviada ${hace(s.created_at)} · si no responde en 2 h, te avisamos`;
    case 'accepted':
      return s.quoted_price_mxn != null ? `${quien} cotizó ${pesos(s.quoted_price_mxn)} · confírmala para apartar la cita` : `${quien} aceptó · confírmala para apartar la cita`;
    case 'scheduled':
      return `Cita confirmada${s.quoted_price_mxn != null ? ` · ${pesos(s.quoted_price_mxn)} acordado` : ''}`;
    case 'in_progress':
      return `${quien} está trabajando · cuando termine, márcalo aquí`;
    case 'declined': {
      const m = MOTIVOS_RECHAZO.find((x) => x.value === s.decline_reason);
      const base = m && m.value !== 'otro' ? `${quien} ${m.cliente}` : `${quien} no puede tomar esta solicitud`;
      return s.nota_estado ? `${base} · “${s.nota_estado}”` : base;
    }
    case 'completed': {
      const pago = s.final_price_mxn ?? s.quoted_price_mxn;
      return [pago != null ? `Pagaste ${pesos(pago)}` : null, s.mi_calificacion ? `Calificaste con ${s.mi_calificacion} ★` : 'Aún no la calificas'].filter(Boolean).join(' · ');
    }
    case 'cancelled':
      return s.cancelled_by === s.provider_id ? `${quien} canceló la solicitud` : 'Cancelaste la solicitud antes de la cita';
    default:
      return '';
  }
}

export function tarjeta(s: Solicitud) {
  return {
    servicio: s.servicio ?? s.categoria ?? 'Solicitud',
    prestador: `${s.provider_name} · ${s.categoria}`,
    detalle: detalleCuando(s),
    descripcion: s.description,
    nota: nota(s),
    estado: estado(s),
  };
}

export function useMisSolicitudes() {
  const { session } = useSession();
  const [datos, setDatos] = useState<Solicitud[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(false);
  const recargar = useCallback(async () => {
    const { data, error } = await supabase.rpc('mis_solicitudes');
    setError(!!error);
    if (data) setDatos(data);
    setCargando(false);
  }, []);
  // Al entrar, al volver a la app, en tiempo real (cuando el prestador cotiza o rechaza) y cada 30 s
  useSolicitudesEnVivo('client_id', session?.user.id, recargar);
  const refrescar = useCallback(async () => {
    setRefrescando(true);
    await recargar();
    setRefrescando(false);
  }, [recargar]);
  return { solicitudes: datos, cargando, error, recargar, refrescar, refrescando };
}
