import type { Registro } from './flujo';

// El registro del cliente (A1.1–A2.1, 4 pasos) y el del prestador (B0.1–B0.3, primeros pasos de 5)
// usan las mismas pantallas. Aquí cambian el número de paso y los textos de Figma.
type Rol = Registro['rol'];

export const PASO_REGISTRO: Record<Rol, Record<'contrasena' | 'telefono' | 'correo', { paso: number; total: number }>> = {
  client: { contrasena: { paso: 2, total: 4 }, telefono: { paso: 3, total: 4 }, correo: { paso: 4, total: 4 } },
  provider: { contrasena: { paso: 1, total: 5 }, telefono: { paso: 2, total: 5 }, correo: { paso: 2, total: 5 } },
};

export const TEXTOS_REGISTRO: Record<Rol, {
  subtituloContrasena: string;
  tituloTelefono: string;
  notaTelefono: string;
  notaCorreo: string;
}> = {
  client: {
    subtituloContrasena: 'La usarás junto con tu teléfono o correo para entrar a Oficio.',
    tituloTelefono: 'Escribe el código que te enviamos',
    notaTelefono: 'Tu número solo se comparte con el prestador cuando confirmas una cita.',
    notaCorreo: 'Lo usaremos para avisarte de tus citas y para recuperar tu cuenta si olvidas tu contraseña.',
  },
  provider: {
    subtituloContrasena: 'Con ella entrarás a tu cuenta de prestador. Es la misma cuenta si después también contratas servicios.',
    tituloTelefono: 'Verifica tu teléfono',
    notaTelefono: 'Tu número no aparece en tu perfil. Un cliente solo lo ve cuando confirma una cita contigo.',
    notaCorreo: 'Ahí te avisaremos de solicitudes nuevas y del resultado de tu verificación.',
  },
};
