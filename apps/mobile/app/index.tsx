import { Redirect } from 'expo-router';
import { useSession } from '@/features/auth/session';

// Punto de entrada: "/" decide a dónde va cada quien.
// El prestador tendrá su propia entrada cuando exista su alta (Sprint 2).
export default function Entrada() {
  const { session, pendiente } = useSession();
  if (!session) return <Redirect href="/welcome" />;
  if (pendiente === 'correo') return <Redirect href="/verify-email" />;
  if (pendiente === 'contrasena') return <Redirect href="/new-password" />;
  return <Redirect href="/home" />;
}
