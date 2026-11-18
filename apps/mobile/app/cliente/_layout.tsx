import { Stack } from 'expo-router';
import { colors } from '@/theme/colors';

// Pantallas del cliente fuera de las pestañas: búsqueda (A3.0), resultados (A4), perfil del
// prestador (A5), sus reseñas (A5.1), nueva solicitud (A6), calificar (A8), ubicación y
// direcciones guardadas.
export default function ClienteLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
