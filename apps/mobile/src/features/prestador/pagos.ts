import type { Database } from '@oficio/shared/types/database';

// B2 · Formas de pago que acepta el prestador (provider_profiles.payment_methods).
// El pago sigue siendo directo entre prestador y cliente: Oficio no cobra ni procesa pagos.
export type FormaPago = Database['public']['Enums']['payment_method'];

export const FORMAS_PAGO: { value: FormaPago; label: string; corto: string }[] = [
  { value: 'cash', label: 'Efectivo', corto: 'efectivo' },
  { value: 'transfer', label: 'Transferencia', corto: 'transferencia' },
  { value: 'card', label: 'Tarjeta', corto: 'tarjeta' },
];

/** ['cash','card'] → "Efectivo y tarjeta" */
export function resumenPagos(formas: readonly FormaPago[] | null | undefined): string {
  const nombres = FORMAS_PAGO.filter((f) => formas?.includes(f.value)).map((f) => f.corto);
  if (!nombres.length) return 'Sin elegir';
  const texto = nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
  return texto[0].toUpperCase() + texto.slice(1);
}
