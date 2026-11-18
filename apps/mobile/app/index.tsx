import { Redirect } from 'expo-router';

// Punto de entrada: "/" decide a dónde va cada quien.
// Sprint 0: siempre a la bienvenida (A1), y desde ahí se puede recorrer todo.
// Sprint 1: sin sesión → /welcome · cliente → /home · prestador → /prestador.
export default function Entrada() {
  return <Redirect href="/welcome" />;
}
