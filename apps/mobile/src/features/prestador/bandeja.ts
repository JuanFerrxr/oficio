import { useCallback, useEffect, useState } from 'react';
import type { Database } from '@oficio/shared/types/database';
import type { EstadoTarjeta } from '@/components/cliente/RequestCard';
import { detalleCuando } from '@/features/cliente/solicitudes';
import { FRANJAS, MOTIVOS_RECHAZO, ORDEN_PAGOS, isoEnDias, lista, pesos, type MotivoRechazo } from '@/features/cliente/formato';
import { useSession } from '@/features/auth/session';
import { useSolicitudesEnVivo } from '@/lib/enVivo';
import { supabase } from '@/lib/supabase';

// B4 · B4.1 · B4.2 · Bandeja del prestador: en qué pestaña va cada solicitud y qué dice su tarjeta.
export type Entrada = Database['public']['Functions']['bandeja_prestador']['Returns'][number];
export type Pestana = 'nuevas' | 'activas' | 'historial';

/** Pendiente y ya pasaron las 2 h */
export const vencida = (e: Pick<Entrada, 'status' | 'expires_at'>, ahora = Date.now()) =>
  e.status === 'expired' || (e.status === 'pending' && new Date(e.expires_at).getTime() <= ahora);

export function pestana(e: Entrada, ahora = Date.now()): Pestana {
  if (e.status === 'pending' && !vencida(e, ahora)) return 'nuevas';
  if (e.status === 'accepted' || e.status === 'scheduled' || e.status === 'in_progress') return 'activas';
  return 'historial';
}

/** "Responde en 1 h 38 min" */
export function cuentaRegresiva(expira: string, ahora = Date.now()): string {
  const min = Math.max(0, Math.ceil((new Date(expira).getTime() - ahora) / 60_000));
  if (min >= 60) return `Responde en ${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}`;
  return `Responde en ${min} min`;
}

export { MOTIVOS_RECHAZO, type MotivoRechazo };
export const motivo = (v: string | null | undefined) => MOTIVOS_RECHAZO.find((m) => m.value === v);

const PAGO_CORTO: Record<string, string> = { cash: 'efectivo', card: 'tarjeta', transfer: 'transferencia' };
const textoPagos = (ms: string[] | null) => lista(ORDEN_PAGOS.filter((m) => ms?.includes(m)).map((m) => PAGO_CORTO[m]));

/** "Mariana G. · Col. La Paz · 2.1 km" */
export const lineaCliente = (e: Entrada, km = true) =>
  [e.cliente, e.colonia ? `Col. ${e.colonia}` : null, km && e.distancia_km != null ? `${Number(e.distancia_km).toFixed(1)} km` : null]
    .filter(Boolean).join(' · ');

function estado(e: Entrada): EstadoTarjeta {
  if (vencida(e)) return 'expirada';
  switch (e.status) {
    case 'pending': return 'enviada';
    case 'accepted': return 'cotizada';
    case 'scheduled': return 'confirmada';
    case 'in_progress': return 'trabajando';
    case 'completed': return 'completada';
    case 'declined': return 'rechazada';
    default: return 'cancelada';
  }
}

function nota(e: Entrada): string {
  if (vencida(e)) return 'Expiró sin respuesta';
  const precio = e.quoted_price_mxn != null ? pesos(e.quoted_price_mxn) : null;
  switch (e.status) {
    case 'accepted': return `Cotizaste ${precio} · esperando su confirmación`;
    case 'scheduled': return `Confirmada · ${precio} acordado · paga en ${textoPagos(e.formas_pago)}`;
    case 'in_progress': return `Trabajando · ${precio} acordado`;
    case 'completed': {
      const cobro = e.final_price_mxn ?? e.quoted_price_mxn;
      return [cobro != null ? `Cobraste ${pesos(cobro)}` : null, e.calificacion ? `Te calificó con ${e.calificacion} ★` : 'Aún no te califica'].filter(Boolean).join(' · ');
    }
    case 'declined': {
      const m = motivo(e.decline_reason);
      return `La rechazaste${m ? `: ${m.yo}` : ''}`;
    }
    case 'cancelled': return e.cancelled_by === e.client_id ? 'El cliente la canceló' : 'La cancelaste';
    default: return '';
  }
}

/** "522224180937" → "+52 222 418 0937" */
export const telefonoLegible = (t: string) =>
  /^52\d{10}$/.test(t) ? `+52 ${t.slice(2, 5)} ${t.slice(5, 8)} ${t.slice(8)}` : `+${t}`;

export function tarjetaPrestador(e: Entrada) {
  return {
    servicio: e.servicio ?? e.categoria ?? 'Solicitud',
    prestador: lineaCliente(e, e.status !== 'completed'),
    detalle: detalleCuando(e),
    descripcion: e.description,
    nota: nota(e),
    estado: estado(e),
  };
}

// ---- B5 · horas para cotizar ----
const HORAS: Record<string, [number, number]> = { morning: [8, 12], afternoon: [14, 18], evening: [18, 21], flexible: [8, 20] };

/**
 * Horas de llegada que caben en lo que pidió el cliente: cada día preferido con las horas de sus
 * franjas (Tarde 14–18 → 14:00, 15:00, 16:00, 17:00). No ofrece horas que ya pasaron.
 * Si el cliente no eligió días (o ya pasaron), ofrece hoy y los dos días siguientes. Quita las horas que el
 * prestador marcó como no disponibles (B6.4).
 */
export type Bloqueo = { starts_at: string; ends_at: string };
export function opcionesDeHora(e: Pick<Entrada, 'preferred_dates' | 'time_windows'>, ahora = new Date(), bloqueos: Bloqueo[] = []) {
  const hoy = isoEnDias(0);
  let dias = [...(e.preferred_dates ?? [])].filter((d) => d >= hoy).sort();
  if (!dias.length) dias = [isoEnDias(0), isoEnDias(1), isoEnDias(2)];
  const franjas = (e.time_windows?.length ? e.time_windows : ['flexible']).filter((f) => HORAS[f]);
  const horas = [...new Set(franjas.flatMap((f) => {
    const [a, b] = HORAS[f];
    return Array.from({ length: b - a }, (_, i) => a + i);
  }))].sort((x, y) => x - y);
  return dias.map((dia) => ({
    dia,
    horas: horas
      .map((h) => ({ h, iso: `${dia}T${String(h).padStart(2, '0')}:00:00-06:00` }))
      .filter((o) => new Date(o.iso).getTime() > ahora.getTime() + 15 * 60_000)
      // B6.4 · sin las horas que marcó como no disponibles
      .filter((o) => {
        const ini = new Date(o.iso).getTime();
        return !bloqueos.some((b) => new Date(b.starts_at).getTime() < ini + 3_600_000 && new Date(b.ends_at).getTime() > ini);
      }),
  })).filter((d) => d.horas.length);
}

/** "tarde 14–18 h" a partir de las franjas */
export const textoFranjas = (fs: string[] | null) => lista(FRANJAS.filter((f) => fs?.includes(f.value)).map((f) => f.tarjeta));

// ---- Datos ----
export function useBandeja() {
  const { session } = useSession();
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(false);
  const [ahora, setAhora] = useState(Date.now());

  const recargar = useCallback(async () => {
    const { data, error } = await supabase.rpc('bandeja_prestador');
    setError(!!error);
    if (data) setEntradas(data);
    setAhora(Date.now());
    setCargando(false);
  }, []);

  // Al entrar, al volver a la app, en tiempo real y cada 30 s (también avanza el contador)
  useSolicitudesEnVivo('provider_id', session?.user.id, recargar);

  /** Jalar hacia abajo para recargar */
  const refrescar = useCallback(async () => {
    setRefrescando(true);
    await recargar();
    setRefrescando(false);
  }, [recargar]);

  return { entradas, cargando, error, ahora, recargar, refrescar, refrescando };
}

/** URLs firmadas (1 h) de las fotos de una solicitud: el bucket request-media es privado. */
export function useFotosSolicitud(rutas: string[] | null) {
  const [urls, setUrls] = useState<string[]>([]);
  const clave = (rutas ?? []).join('|');
  useEffect(() => {
    if (!clave) { setUrls([]); return; }
    supabase.storage.from('request-media').createSignedUrls(clave.split('|'), 3600)
      .then(({ data }) => setUrls((data ?? []).map((d) => d.signedUrl).filter((u): u is string => !!u)));
  }, [clave]);
  return urls;
}
