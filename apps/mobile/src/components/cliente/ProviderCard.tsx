import { Pressable, Text, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { Avatar } from '@/components/ui';
import type { TarjetaPrestador } from '@/features/cliente/datos';
import { precio } from '@/features/cliente/formato';
import { colors } from '@/theme/colors';

// Figma: ProviderCard · Variante=Compacta (carrusel de A3) | Resultado (listas de A3.0 y A4)
type Props = { p: TarjetaPrestador; variante?: 'compacta' | 'resultado'; onPress?: () => void };

export function ProviderCard({ p, variante = 'resultado', onPress }: Props) {
  const [monto, detalle] = precio(p.precio_tipo, p.precio_desde, true);
  const rating = Number(p.rating_avg).toFixed(1);

  if (variante === 'compacta') {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" className="w-[168px] gap-2 rounded-2xl border border-border bg-card p-3 active:opacity-80">
        <Avatar name={p.full_name} id={p.provider_id} uri={p.avatar_url} />
        <Text className="font-sans-bold text-base text-foreground" numberOfLines={1}>{p.full_name}</Text>
        <Text className="font-sans text-xs text-muted-foreground" numberOfLines={1}>{`${p.oficio ?? ''} · ${p.distance_km} km`}</Text>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1">
            <Star size={14} color={colors.accent} fill={colors.accent} />
            <Text className="font-sans-bold text-sm text-foreground">{rating}</Text>
          </View>
          <Text className="font-sans-bold text-sm text-foreground">{monto}<Text className="font-sans text-xs text-muted-foreground"> {detalle}</Text></Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} accessibilityRole="button" className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3 active:opacity-80" testID={`prestador-${p.full_name}`}>
      <Avatar name={p.full_name} id={p.provider_id} uri={p.avatar_url} />
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-bold text-base text-foreground" numberOfLines={1}>{p.full_name}</Text>
        <View className="flex-row items-center gap-1">
          <Star size={13} color={colors.accent} fill={colors.accent} />
          <Text className="font-sans-bold text-sm text-foreground">{rating}</Text>
          <Text className="font-sans text-sm text-muted-foreground">{`(${p.rating_count}) · ${p.distance_km} km`}</Text>
        </View>
      </View>
      <View className="items-end">
        <Text className="font-sans-bold text-base text-foreground">{monto}</Text>
        {detalle ? <Text className="font-sans text-xs text-muted-foreground">{detalle}</Text> : null}
      </View>
    </Pressable>
  );
}
