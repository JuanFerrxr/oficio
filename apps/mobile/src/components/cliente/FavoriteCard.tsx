import { Text, View } from 'react-native';
import { Heart, Star } from 'lucide-react-native';
import { Avatar, Button } from '@/components/ui';
import type { TarjetaPrestador } from '@/features/cliente/datos';
import { colors } from '@/theme/colors';

// Figma: FavoriteCard · motivo ("En tus favoritos" / "Calificaste 5 ★") · "Volver a solicitar"
type Props = { p: TarjetaPrestador; motivo: string; favorito: boolean; onSolicitar: () => void; onPress?: () => void };

export function FavoriteCard({ p, motivo, favorito, onSolicitar }: Props) {
  return (
    <View className="w-[240px] gap-3 rounded-2xl border border-border bg-card p-3">
      <View className="flex-row items-center gap-3">
        <Avatar name={p.full_name} id={p.provider_id} uri={p.avatar_url} />
        <View className="flex-1">
          <Text className="font-sans-bold text-base text-foreground" numberOfLines={1}>{p.full_name}</Text>
          <View className="flex-row items-center gap-1">
            <Text className="font-sans text-xs text-muted-foreground">{p.oficio}</Text>
            <Star size={12} color={colors.accent} fill={colors.accent} />
            <Text className="font-sans-bold text-xs text-foreground">{Number(p.rating_avg).toFixed(1)}</Text>
          </View>
        </View>
        {favorito ? <Heart size={18} color={colors.danger} fill={colors.danger} /> : null}
      </View>
      <Text className="font-sans text-xs text-muted-foreground">{motivo}</Text>
      <Button size="sm" variant="secondary" onPress={onSolicitar}>Volver a solicitar</Button>
    </View>
  );
}
