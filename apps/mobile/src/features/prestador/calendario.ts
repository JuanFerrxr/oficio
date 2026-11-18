import { useCallback, useState } from 'react';
import type { Database } from '@oficio/shared/types/database';
import { useSession } from '@/features/auth/session';
import { hora, isoDe, isoEnDias } from '@/features/cliente/formato';
import { useSolicitudesEnVivo } from '@/lib/enVivo';
import { supabase } from '@/lib/supabase';

// B6.1 · B6.2 · B6.3 · Calendario del prestador. Fechas siempre como "AAAA-MM-DD" en hora de México.
export type Evento = Database['public']['Functions']['calendario_prestador']['Returns'][number];
export type Vista = 'dia' | 'semana' | 'mes';

const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const INICIALES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const partes = (iso: string) => iso.split('-').map(Number) as [number, number, number];
const deUTC = (d: Date) => d.toISOString().slice(0, 10);
/** Suma días a una fecha "AAAA-MM-DD" (sin problemas de zona horaria) */
export function sumarDias(iso: string, n: number) {
  const [y, m, d] = partes(iso);
  return deUTC(new Date(Date.UTC(y, m - 1, d + n)));
}
/** 0 = domingo */
export const diaSemanaIso = (iso: string) => { const [y, m, d] = partes(iso); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
/** Lunes de la semana de esa fecha */
export const inicioSemana = (iso: string) => sumarDias(iso, -((diaSemanaIso(iso) + 6) % 7));
export const inicioMes = (iso: string) => `${iso.slice(0, 7)}-01`;
export function sumarMeses(iso: string, n: number) {
  const [y, m] = partes(iso);
  return deUTC(new Date(Date.UTC(y, m - 1 + n, 1)));
}
/** Cuadrícula del mes: semanas de lunes a domingo, con los días de los meses vecinos */
export function cuadriculaMes(iso: string): string[][] {
  const primero = inicioMes(iso);
  const ultimo = sumarDias(sumarMeses(primero, 1), -1);
  const semanas: string[][] = [];
  for (let d = inicioSemana(primero); d <= ultimo; d = sumarDias(d, 7)) semanas.push(Array.from({ length: 7 }, (_, i) => sumarDias(d, i)));
  return semanas;
}

/** "Hoy, jueves 16 de octubre" */
export function tituloDia(iso: string) {
  const [, m, d] = partes(iso);
  const base = `${DIAS_LARGOS[diaSemanaIso(iso)]} ${d} de ${MESES[m - 1]}`;
  if (iso === isoEnDias(0)) return `Hoy, ${base}`;
  if (iso === isoEnDias(1)) return `Mañana, ${base}`;
  return base.charAt(0).toUpperCase() + base.slice(1);
}
/** "13 – 19 de octubre" · "28 de octubre – 3 de noviembre" */
export function tituloSemana(lunes: string) {
  const domingo = sumarDias(lunes, 6);
  const [, m1, d1] = partes(lunes);
  const [, m2, d2] = partes(domingo);
  return m1 === m2 ? `${d1} – ${d2} de ${MESES[m1 - 1]}` : `${d1} de ${MESES[m1 - 1]} – ${d2} de ${MESES[m2 - 1]}`;
}
/** "Octubre 2026" */
export const tituloMes = (iso: string) => { const [y, m] = partes(iso); return `${MESES[m - 1].charAt(0).toUpperCase()}${MESES[m - 1].slice(1)} ${y}`; };
export const numeroDe = (iso: string) => partes(iso)[2];

/** Minutos desde la medianoche (hora de México) */
export const minutos = (ts: string) => { const [h, m] = hora(ts).split(':').map(Number); return h * 60 + m; };

/** Eventos que tocan ese día (un bloqueo puede empezar el día anterior) */
export function eventosDelDia(evs: Evento[], iso: string) {
  return evs.filter((e) => isoDe(e.starts_at) === iso || (e.all_day && isoDe(e.starts_at) <= iso && isoDe(new Date(new Date(e.ends_at).getTime() - 1).toISOString()) >= iso));
}

/** "13:00 – 15:00 · No disponible" · "16:00 · Visita de diagnóstico" · "Todo el día · No disponible" */
export function tituloEvento(e: Evento) {
  if (e.tipo === 'no_disponible') return e.all_day ? 'Todo el día · No disponible' : `${hora(e.starts_at)} – ${hora(e.ends_at)} · No disponible`;
  return `${hora(e.starts_at)} · ${e.titulo}`;
}
export function detalleEvento(e: Evento) {
  if (e.tipo === 'no_disponible') return [e.detalle, e.rrule === 'FREQ=WEEKLY' ? 'cada semana' : e.rrule === 'FREQ=DAILY' ? 'cada día' : null, 'lo marcaste tú'].filter(Boolean).join(' · ');
  return e.detalle ?? '';
}

/** Sombra sutil de los días y horas no disponibles (muted-foreground al 12 %) */
export const SOMBRA_NO_DISPONIBLE = 'rgba(93, 103, 130, 0.12)';

export const COLOR_EVENTO: Record<string, { fondo: string; borde: string; texto: string }> = {
  confirmada: { fondo: 'bg-success-soft', borde: 'border-success', texto: 'text-success' },
  por_confirmar: { fondo: 'bg-primary-soft', borde: 'border-primary', texto: 'text-primary' },
  no_disponible: { fondo: 'bg-border', borde: 'border-muted-foreground', texto: 'text-muted-foreground' },
};

/**
 * Vista de día: a cada evento le toca una columna y cuántas columnas hay en su grupo de eventos
 * que se enciman (así uno solo ocupa todo el ancho y dos a la misma hora se reparten).
 */
export function columnas(evs: Evento[]): { col: number; de: number }[] {
  const fin = (e: Evento) => minutos(e.starts_at) + Math.max(30, (new Date(e.ends_at).getTime() - new Date(e.starts_at).getTime()) / 60_000);
  const res: { col: number; de: number }[] = [];
  let grupo: number[] = [];
  let finGrupo = -1;
  let ocupadas: number[] = [];
  const cerrar = () => { const de = Math.max(1, ocupadas.length); grupo.forEach((i) => { res[i].de = de; }); grupo = []; ocupadas = []; };
  evs.forEach((e, i) => {
    const ini = minutos(e.starts_at);
    if (ini >= finGrupo) { cerrar(); finGrupo = -1; }
    let c = ocupadas.findIndex((f) => f <= ini);
    if (c === -1) { c = ocupadas.length; ocupadas.push(0); }
    ocupadas[c] = fin(e);
    res[i] = { col: c, de: 1 };
    grupo.push(i);
    finGrupo = Math.max(finGrupo, fin(e));
  });
  cerrar();
  return res;
}

export function useCalendario(desde: string, hasta: string) {
  const { session } = useSession();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [diasLibres, setDiasLibres] = useState<number[]>([]);
  const [horario, setHorario] = useState<{ desde: number; hasta: number }>({ desde: 8, hasta: 20 });
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    const uid = session?.user.id;
    if (!uid) return;
    const [c, h] = await Promise.all([
      supabase.rpc('calendario_prestador', { p_desde: desde, p_hasta: hasta }),
      supabase.from('provider_availability').select('weekday, start_time, end_time').eq('provider_id', uid),
    ]);
    setEventos(c.data ?? []);
    const filas = h.data ?? [];
    // Días que no trabaja según su horario base (se ven sombreados)
    setDiasLibres(filas.length ? [0, 1, 2, 3, 4, 5, 6].filter((d) => !filas.some((f) => f.weekday === d)) : []);
    if (filas.length) {
      const ini = Math.min(...filas.map((f) => Number(f.start_time.slice(0, 2))));
      const fin = Math.max(...filas.map((f) => Math.ceil(Number(f.end_time.slice(0, 2)) + Number(f.end_time.slice(3, 5)) / 60)));
      setHorario({ desde: Math.min(8, ini), hasta: Math.max(20, fin) });
    }
    setCargando(false);
  }, [desde, hasta, session?.user.id]);

  // Se pone al día con las solicitudes (tiempo real) y al volver de "Bloquear"
  useSolicitudesEnVivo('provider_id', session?.user.id, recargar);
  return { eventos, diasLibres, horario, cargando, recargar };
}
