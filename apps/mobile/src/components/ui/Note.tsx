import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { CircleAlert, Info, ShieldCheck, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import { colors } from '@/theme/colors';

// Figma: Note · tone info|warning|privacy · icon? (mail, lock, shield-check…)
// 'error' es para el mensaje de error de un formulario (no está en Figma como Note; usa los colores danger).
type Tone = 'info' | 'warning' | 'privacy' | 'error';
const estilos: Record<Tone, { fondo: string; color: string; Icono: LucideIcon }> = {
  info: { fondo: 'bg-primary-soft', color: colors.primary, Icono: Info },
  privacy: { fondo: 'bg-primary-soft', color: colors.primary, Icono: ShieldCheck },
  warning: { fondo: 'bg-warning-soft', color: colors.warning, Icono: TriangleAlert },
  error: { fondo: 'bg-danger-soft', color: colors.danger, Icono: CircleAlert },
};

export function Note({ tone = 'info', icon, children }: { tone?: Tone; icon?: LucideIcon; children: ReactNode }) {
  const { fondo, color, Icono } = estilos[tone];
  const I = icon ?? Icono;
  return (
    <View className={`flex-row gap-2.5 rounded-xl p-3 ${fondo}`} accessibilityRole={tone === 'error' ? 'alert' : undefined}>
      <I size={16} color={color} style={{ marginTop: 2 }} />
      <Text className="flex-1 font-sans text-sm text-foreground">{children}</Text>
    </View>
  );
}
