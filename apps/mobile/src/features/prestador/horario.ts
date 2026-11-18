// B2 · Días y horas. En la base, weekday sigue a PostgreSQL: 0 = domingo … 6 = sábado.
export const DIAS = [
  { weekday: 1, corto: 'L', nombre: 'Lunes', abrev: 'Lun' },
  { weekday: 2, corto: 'M', nombre: 'Martes', abrev: 'Mar' },
  { weekday: 3, corto: 'M', nombre: 'Miércoles', abrev: 'Mié' },
  { weekday: 4, corto: 'J', nombre: 'Jueves', abrev: 'Jue' },
  { weekday: 5, corto: 'V', nombre: 'Viernes', abrev: 'Vie' },
  { weekday: 6, corto: 'S', nombre: 'Sábado', abrev: 'Sáb' },
  { weekday: 0, corto: 'D', nombre: 'Domingo', abrev: 'Dom' },
] as const;

/** 05:00, 05:30 … 23:30 */
export const HORAS = Array.from({ length: 38 }, (_, i) => {
  const m = 5 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
});

/** "08:00:00" → "08:00" */
export const hhmm = (t: string) => t.slice(0, 5);

/** [1,2,3,4,5,6] → "Lun a sáb"; [1,3,5] → "Lun, mié y vie" */
export function resumenDias(weekdays: number[]): string {
  const orden = DIAS.filter((d) => weekdays.includes(d.weekday));
  if (orden.length === 0) return 'Sin días';
  if (orden.length === 7) return 'Todos los días';
  const idx = orden.map((d) => DIAS.findIndex((x) => x.weekday === d.weekday));
  const seguidos = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  if (seguidos && orden.length >= 3) return `${orden[0].abrev} a ${orden[orden.length - 1].abrev.toLowerCase()}`;
  const nombres = orden.map((d, i) => (i === 0 ? d.abrev : d.abrev.toLowerCase()));
  return nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}
