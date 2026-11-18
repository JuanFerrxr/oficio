import type { ColorValue } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/theme/colors';

// Figma: TabBar / TabItem. Mismo estilo para las pestañas del cliente (4) y del prestador (5).
export const tabBarOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.mutedForeground,
  tabBarLabelStyle: { fontFamily: 'Figtree_600SemiBold', fontSize: 11 },
  tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
  sceneStyle: { backgroundColor: colors.background },
} as const;

/** Ícono de Lucide para una pestaña: más grueso cuando está activa. */
export function tabIcon(Icon: LucideIcon) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Icon size={24} color={typeof color === 'string' ? color : undefined} strokeWidth={focused ? 2.4 : 1.8} />;
  };
}
