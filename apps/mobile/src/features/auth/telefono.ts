// Teléfonos de México. La app pide 10 dígitos; Supabase Auth los guarda como 52 + 10 dígitos
// (sin "+"), y así también quedan en profiles.phone.

/** Deja solo los 10 dígitos nacionales, o null si no es un celular válido. */
export function diezDigitos(entrada: string): string | null {
  let d = entrada.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('52')) d = d.slice(2);
  if (d.length === 13 && d.startsWith('521')) d = d.slice(3); // formato viejo con 1
  return /^[1-9]\d{9}$/.test(d) ? d : null;
}

/** "222 418 0937" → "+522224180937" (lo que espera Supabase), o null. */
export function aE164(entrada: string): string | null {
  const d = diezDigitos(entrada);
  return d ? `+52${d}` : null;
}

/** "522224180937" → "+52 222 418 0937" */
export function formatear(telefono: string | null | undefined): string {
  const d = diezDigitos(telefono ?? '');
  return d ? `+52 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : telefono ?? '';
}

/** "522224180937" → "+52 222 ••• 0937" (para pantallas que alguien más podría ver) */
export function ocultar(telefono: string | null | undefined): string {
  const d = diezDigitos(telefono ?? '');
  return d ? `+52 ${d.slice(0, 3)} ••• ${d.slice(6)}` : telefono ?? '';
}

/** Mientras se escribe: "2224180937" → "222 418 0937" */
export function mientrasEscribe(entrada: string): string {
  const d = entrada.replace(/\D/g, '').slice(0, 10);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6)].filter(Boolean).join(' ');
}

export const esCorreo = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
