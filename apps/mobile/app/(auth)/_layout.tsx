import { Stack } from 'expo-router';
import { colors } from '@/theme/colors';

// Bienvenida, registro (A1.1–A2), entrar (A0.1, A0.6) y recuperar contraseña (A0.2–A0.5).
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
