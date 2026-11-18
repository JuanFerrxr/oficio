import { useSyncExternalStore } from 'react';

// Lo que la app necesita recordar mientras alguien recorre el registro o la recuperación.
// Vive en memoria: si la app se cierra a la mitad, se empieza de nuevo (nada sensible queda
// guardado en el teléfono; la contraseña nunca se guarda aquí).

export type Registro = {
  nombre: string;
  paterno: string;
  materno: string;
  telefono: string; // +52XXXXXXXXXX
  correo: string;
  rol: 'client' | 'provider';
};

export type Recuperacion = { metodo: 'sms' | 'whatsapp' | 'correo'; destino: string };

/**
 * Con sesión abierta, la app normalmente manda a /home. `pendiente` la detiene a mitad de un flujo:
 * - 'correo': ya verificó el teléfono (hay sesión) pero falta el paso 4, verificar el correo.
 * - 'contrasena': entró con el código de recuperación y falta crear la nueva contraseña.
 */
export type Pendiente = 'correo' | 'contrasena' | null;

type Estado = { registro: Registro | null; recuperacion: Recuperacion | null; pendiente: Pendiente };

let estado: Estado = { registro: null, recuperacion: null, pendiente: null };
const oyentes = new Set<() => void>();

export function actualizarFlujo(cambio: Partial<Estado>) {
  estado = { ...estado, ...cambio };
  oyentes.forEach((o) => o());
}

export const leerFlujo = () => estado;

export function useFlujo() {
  return useSyncExternalStore(
    (o) => { oyentes.add(o); return () => oyentes.delete(o); },
    () => estado,
  );
}

export const nombreCompleto = (r: Pick<Registro, 'nombre' | 'paterno' | 'materno'>) =>
  [r.nombre, r.paterno, r.materno].map((s) => s.trim()).filter(Boolean).join(' ');

/** Versión del aviso de privacidad y términos que se acepta en A1.1. Súbela cuando cambien. */
export const VERSION_TERMINOS = '2026-11';
