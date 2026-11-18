import { Stack } from 'expo-router';
import { colors } from '@/theme/colors';

// Bienvenida, registro, entrar y recuperar contraseña (A0–A2). El Sprint 1 llena este grupo.
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
