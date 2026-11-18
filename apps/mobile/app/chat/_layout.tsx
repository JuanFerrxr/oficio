import { Stack } from 'expo-router';
import { colors } from '@/theme/colors';

// A3.3 · B9.3 · Conversación (la misma pantalla para cliente y prestador)
export default function ChatLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
