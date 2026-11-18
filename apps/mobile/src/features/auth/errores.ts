import { AuthError } from '@supabase/supabase-js';

// Traduce los errores de Supabase Auth a mensajes para la persona. Se decide por `code`
// (estable entre versiones), no por el texto en inglés.
const MENSAJES: Record<string, string> = {
  invalid_credentials: 'Teléfono, correo o contraseña incorrectos.',
  weak_password: 'La contraseña no cumple los requisitos.',
  same_password: 'Tiene que ser distinta a tu contraseña anterior.',
  otp_expired: 'El código no es correcto o ya venció.',
  otp_disabled: 'No encontramos una cuenta con ese número.',
  email_exists: 'Ese correo ya está registrado en otra cuenta.',
  phone_exists: 'Ese teléfono ya tiene una cuenta.',
  user_already_exists: 'Ese teléfono ya tiene una cuenta.',
  over_sms_send_rate_limit: 'Espera unos segundos antes de pedir otro código.',
  over_email_send_rate_limit: 'Espera unos minutos antes de pedir otro código.',
  over_request_rate_limit: 'Demasiados intentos. Espera unos minutos.',
  phone_not_confirmed: 'Falta verificar tu teléfono.',
  email_not_confirmed: 'Ese correo todavía no está verificado. Entra con tu teléfono.',
  user_banned: 'Esta cuenta está suspendida. Contáctanos desde Ayuda.',
  session_not_found: 'Tu sesión venció. Vuelve a entrar.',
  email_address_invalid: 'Revisa el correo: parece que tiene un error.',
};

export function mensajeDeError(error: unknown): string {
  if (error instanceof AuthError || (error && typeof error === 'object' && 'message' in error)) {
    const e = error as AuthError;
    if (e.code && MENSAJES[e.code]) return MENSAJES[e.code];
    if (e.code === 'sms_send_failed') {
      return __DEV__
        ? 'No se pudo mandar el SMS. En tu computadora usa un número de prueba: 55 5000 0001 (código 123456).'
        : 'No pudimos mandar el SMS. Revisa el número e intenta de nuevo.';
    }
    if (e.code === 'validation_failed' && /whatsapp/i.test(e.message)) return 'Por ahora no podemos mandarlo por WhatsApp. Usa SMS.';
    if (e.name === 'AuthRetryableFetchError' || e.status === 0 || /network|fetch/i.test(e.message)) {
      return 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.';
    }
    return __DEV__ ? `Algo salió mal (${e.code ?? e.status ?? 'sin código'}): ${e.message}` : 'Algo salió mal. Intenta de nuevo.';
  }
  return 'Algo salió mal. Intenta de nuevo.';
}

export const codigoDeError = (error: unknown) => (error as AuthError | null)?.code;
