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
      {/* El título no se parte; el valor usa hasta 2 líneas y después se recorta con "…" */}
      <Text className={`shrink-0 font-sans-semibold text-base ${destructive ? 'text-danger' : 'text-foreground'}`}>{title}</Text>
      <Text numberOfLines={2} className="flex-1 text-right font-sans text-sm text-muted-foreground">{value ?? ''}</Text>
      {chevron && !destructive ? <ChevronRight size={18} color={colors.mutedForeground} /> : null}
    </Pressable>
  );
}

/** Tarjeta blanca que agrupa varias ListRow, como en Figma. */
export function ListGroup({ children }: { children: ReactNode }) {
  return <View className="overflow-hidden rounded-2xl border border-border bg-card">{children}</View>;
}
