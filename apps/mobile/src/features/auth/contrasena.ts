// Reglas de la contraseña (A1.2 y A0.4). Las obligatorias son las mismas que exige Supabase
// (supabase/config.toml: minimum_password_length = 8, password_requirements =
// "lower_upper_letters_digits"); si cambian allá, cámbialas aquí.

export type Regla = { texto: string; cumple: boolean; recomendada?: boolean };

export function reglas(p: string): Regla[] {
  return [
    { texto: 'Mínimo 8 caracteres', cumple: p.length >= 8 },
    { texto: 'Al menos una mayúscula y una minúscula', cumple: /[A-Z]/.test(p) && /[a-z]/.test(p) },
    { texto: 'Al menos un número', cumple: /\d/.test(p) },
    { texto: 'Un símbolo (recomendado)', cumple: /[^A-Za-z0-9]/.test(p), recomendada: true },
  ];
}

export const esValida = (p: string) => reglas(p).every((r) => r.cumple || r.recomendada);

export type Nivel = { etiqueta: 'Débil' | 'Regular' | 'Buena' | 'Excelente'; valor: number; tono: 'danger' | 'warning' | 'primary' | 'success' };

/** Medidor de "Seguridad de la contraseña". Solo orienta; lo que decide es esValida. */
export function nivel(p: string): Nivel {
  if (!p) return { etiqueta: 'Débil', valor: 0, tono: 'danger' };
  const cumplidas = reglas(p).filter((r) => r.cumple).length + (p.length >= 12 ? 1 : 0);
  if (!esValida(p) || cumplidas <= 2) return { etiqueta: 'Débil', valor: 1, tono: 'danger' };
  if (cumplidas === 3) return { etiqueta: 'Regular', valor: 2, tono: 'warning' };
  if (cumplidas === 4) return { etiqueta: 'Buena', valor: 3, tono: 'primary' };
  return { etiqueta: 'Excelente', valor: 4, tono: 'success' };
}
