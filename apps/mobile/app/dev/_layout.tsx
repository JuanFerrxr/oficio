import { Redirect, Stack } from 'expo-router';
import { colors } from '@/theme/colors';

// Herramientas solo para desarrollo. En una versión de tienda (__DEV__ = false) no se pueden abrir.
export default function DevLayout() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
