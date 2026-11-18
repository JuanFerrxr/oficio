import type { Database } from '@oficio/shared/types/database';

// Textos que se repiten en las pantallas del cliente (A3–A6, A3.1).
type Enums = Database['public']['Enums'];
export type Urgencia = Enums['urgency_level'];
export type FormaPago = Enums['payment_method'];
export type TipoPrecio = Enums['price_type'];

/** Oficio en plural para títulos: "Electricistas cerca", A4 "Electricistas" */
const PLURAL: Record<string, string> = {
  plomeria: 'Plomeros', electricidad: 'Electricistas', pintura: 'Pintores', albanileria: 'Albañiles',
  carpinteria: 'Carpinteros', nineras: 'Niñeras', limpieza: 'Personal de limpieza', jardineria: 'Jardineros',
};
export const oficioPlural = (slug: string | undefined, nombre = '') => (slug && PLURAL[slug]) || nombre;

/** "$1,800" */
export const pesos = (n: number | string | null | undefined) =>
  n == null ? '' : `$${Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

/** Precio de una tarjeta o de un servicio: ["$350", "visita"] · ["$90", "por hora"] · ["Cotiza", "sin costo"] */
export function precio(tipo: TipoPrecio | null | undefined, monto: number | string | null | undefined, desde = false): [string, string] {
  if (!tipo || tipo === 'quote' || monto == null) return ['Cotiza', 'sin costo'];
  if (tipo === 'hourly') return [pesos(monto), 'por hora'];
  return [pesos(monto), desde ? 'desde' : ''];
}

export const URGENCIAS = [
  { value: 'urgent', label: 'Urgente, hoy', ayuda: (n: string) => `Urgente avisa a ${n} que lo necesitas hoy, lo antes posible.` },
  { value: 'this_week', label: 'Esta semana', ayuda: (n: string) => `${n} sabrá que lo necesitas en los próximos días.` },
  { value: 'flexible', label: 'Sin prisa', ayuda: (n: string) => `${n} sabrá que puedes esperar a que tenga espacio.` },
] as const;

export const FRANJAS = [
  { value: 'morning', label: 'Mañana 8–12', corto: 'en la mañana', tarjeta: 'mañana 8–12 h' },
  { value: 'afternoon', label: 'Tarde 14–18', corto: 'en la tarde', tarjeta: 'tarde 14–18 h' },
  { value: 'evening', label: 'Noche 18–21', corto: 'en la noche', tarjeta: 'noche 18–21 h' },
  { value: 'flexible', label: 'Cualquier hora', corto: 'a cualquier hora', tarjeta: 'cualquier hora' },
] as const;

export const PAGO_DETALLE: Record<FormaPago, { titulo: string; detalle: (nombre: string) => string }> = {
  cash: { titulo: 'Efectivo', detalle: () => 'Al terminar el trabajo' },
  card: { titulo: 'Tarjeta de débito o crédito', detalle: () => 'Con terminal en el lugar' },
  transfer: { titulo: 'Transferencia', detalle: (n) => `SPEI a la cuenta de ${n}` },
};
export const ORDEN_PAGOS: FormaPago[] = ['cash', 'card', 'transfer'];

/** B4 · Motivos para rechazar: cómo lo ve el prestador (yo) y cómo lo ve el cliente */
export const MOTIVOS_RECHAZO = [
  { value: 'sin_disponibilidad', label: 'No tengo disponibilidad', yo: 'no tenías disponibilidad ese día', cliente: 'no tiene disponibilidad esos días' },
  { value: 'fuera_de_zona', label: 'Queda fuera de mi zona', yo: 'quedaba fuera de tu zona', cliente: 'tu domicilio queda fuera de su zona' },
  { value: 'no_lo_hago', label: 'No hago ese trabajo', yo: 'no haces ese trabajo', cliente: 'no hace ese tipo de trabajo' },
  { value: 'otro', label: 'Otro motivo', yo: 'otro motivo', cliente: 'no puede tomarla' },
] as const;
export type MotivoRechazo = (typeof MOTIVOS_RECHAZO)[number]['value'];

/** A7.1 · Motivos para cancelar (enum cancel_reason_t de la base) */
export const MOTIVOS_CANCELACION = [
  { value: 'resolved', label: 'Ya lo resolví por mi cuenta' },
  { value: 'other_provider', label: 'Encontré otro prestador' },
  { value: 'schedule', label: 'Ya no puedo en ese día u horario' },
  { value: 'price', label: 'El precio no me convence' },
  { value: 'other', label: 'Otro motivo' },
] as const;
export type MotivoCancelacion = (typeof MOTIVOS_CANCELACION)[number]['value'];

export const primerNombre = (nombre: string | null | undefined) => (nombre ?? '').trim().split(/\s+/)[0] ?? '';
/** "Mariana García" → "Mariana G." */
export const nombreCorto = (nombre: string | null | undefined) => {
  const [a, b] = (nombre ?? '').trim().split(/\s+/);
  return b ? `${a} ${b[0]}.` : a ?? '';
};

// ---- Fechas (siempre en hora de México) ----
const ZONA = 'America/Mexico_City';
/** "2026-10-16" de hoy + n días, en hora de México */
export const isoEnDias = (n: number) => new Date(Date.now() + n * 86_400_000).toLocaleDateString('en-CA', { timeZone: ZONA });
const fechaDeIso = (iso: string) => new Date(`${iso}T12:00:00`);
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const diaSemana = (iso: string) => fechaDeIso(iso).getDay();
export const diaCorto = (iso: string) => DIAS_CORTOS[diaSemana(iso)];
export const numeroDia = (iso: string) => fechaDeIso(iso).getDate();

/** "Hoy" · "Mañana" · "Sáb 18 oct" */
export function diaRelativo(iso: string): string {
  if (iso === isoEnDias(0)) return 'Hoy';
  if (iso === isoEnDias(1)) return 'Mañana';
  const f = fechaDeIso(iso);
  return `${DIAS_CORTOS[f.getDay()]} ${f.getDate()} ${MESES[f.getMonth()]}`;
}
/** "jueves 16" */
export const diaLargo = (iso: string) => `${DIAS_LARGOS[diaSemana(iso)]} ${numeroDia(iso)}`;

/** "16:00" en hora de México */
export const hora = (ts: string) => new Date(ts).toLocaleTimeString('es-MX', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false });
/** Fecha ISO (en México) de un timestamp */
export const isoDe = (ts: string) => new Date(ts).toLocaleDateString('en-CA', { timeZone: ZONA });
export const mesDe = (ts: string) => {
  const [y, m] = isoDe(ts).split('-').map(Number);
  return `${MESES_LARGOS[m - 1]}${y !== new Date().getFullYear() ? ` ${y}` : ''}`;
};

/** "hace 12 min" · "hace 3 h" · "hace 2 días" */
export function hace(ts: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60_000));
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
}

/** "a, b o c" */
export const lista = (xs: string[], y = 'o') => (xs.length <= 1 ? xs[0] ?? '' : `${xs.slice(0, -1).join(', ')} ${y} ${xs[xs.length - 1]}`);
