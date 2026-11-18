import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Info, ShieldCheck, TriangleAlert } from 'lucide-react-native';
import { colors } from '@/theme/colors';

// Figma: Note · tone info|warning|privacy
type Tone = 'info' | 'warning' | 'privacy';
const estilos: Record<Tone, { fondo: string; color: string; Icono: typeof Info }> = {
  info: { fondo: 'bg-primary-soft', color: colors.primary, Icono: Info },
  privacy: { fondo: 'bg-primary-soft', color: colors.primary, Icono: ShieldCheck },
  warning: { fondo: 'bg-warning-soft', color: colors.warning, Icono: TriangleAlert },
};

export function Note({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  const { fondo, color, Icono } = estilos[tone];
  return (
    <View className={`flex-row gap-2.5 rounded-xl p-3 ${fondo}`}>
      <Icono size={16} color={color} style={{ marginTop: 2 }} />
      <Text className="flex-1 font-sans text-sm text-foreground">{children}</Text>
    </View>
  );
}
