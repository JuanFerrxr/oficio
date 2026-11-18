import { Stack } from 'expo-router';
import { colors } from '@/theme/colors';

// Pantallas del prestador fuera de las pestañas: detalle de una solicitud (fotos y video),
// aceptar y cotizar (B5) y rechazar con motivo.
export default function BandejaLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
