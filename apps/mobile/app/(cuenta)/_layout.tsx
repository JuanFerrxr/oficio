import { Stack } from 'expo-router';
import { colors } from '@/theme/colors';

// Pantallas de la cuenta que se usan tanto en el registro como desde Perfil.
export default function CuentaLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
