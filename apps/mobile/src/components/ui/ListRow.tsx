import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { colors } from '@/theme/colors';

// Figma: ListRow · icon · title · value? · chevron · destructive?
// Ej.: filas de Perfil (A9, B8): "Mis direcciones", "Cerrar sesión"…
type Props = {
  icon?: LucideIcon;
  title: string;
  value?: string;
  chevron?: boolean;
  destructive?: boolean;
  last?: boolean;
  onPress?: () => void;
};

export function ListRow({ icon: Icon, title, value, chevron = true, destructive = false, last = false, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      className={`flex-row items-center gap-3 px-3.5 py-3 active:bg-background ${last ? '' : 'border-b border-border'}`}
    >
      {Icon ? <Icon size={20} color={destructive ? colors.danger : colors.mutedForeground} /> : null}
      {/* El título ocupa lo que sobra; el valor, hasta 45 % del ancho y 2 líneas (después "…") */}
      <Text className={`flex-1 font-sans-semibold text-base ${destructive ? 'text-danger' : 'text-foreground'}`}>{title}</Text>
      {value ? <Text numberOfLines={2} className="max-w-[45%] text-right font-sans text-sm text-muted-foreground">{value}</Text> : null}
      {chevron && !destructive ? <ChevronRight size={18} color={colors.mutedForeground} /> : null}
    </Pressable>
  );
}

/** Tarjeta blanca que agrupa varias ListRow, como en Figma. */
export function ListGroup({ children }: { children: ReactNode }) {
  return <View className="overflow-hidden rounded-2xl border border-border bg-card">{children}</View>;
}
