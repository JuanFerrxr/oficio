import { Pressable, Text, View } from 'react-native';
import { Baby, BrickWall, Droplet, Hammer, Leaf, Paintbrush, Sparkles, Wrench, Zap, type LucideIcon } from 'lucide-react-native';
import { colors } from '@/theme/colors';

// Figma: CategoryTile · ícono + etiqueta. El ícono viene de categories.icon (nombre de Lucide).
const ICONOS: Record<string, LucideIcon> = {
  droplet: Droplet, zap: Zap, paintbrush: Paintbrush, 'brick-wall': BrickWall, hammer: Hammer,
  baby: Baby, sparkles: Sparkles, leaf: Leaf,
};
export const iconoCategoria = (nombre: string | null | undefined) => (nombre && ICONOS[nombre]) || Wrench;

export function CategoryTile({ icon, label, onPress }: { icon: string | null; label: string; onPress?: () => void }) {
  const Icono = iconoCategoria(icon);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" className="w-[23%] items-center gap-1.5 active:opacity-70">
      <View className="size-15 items-center justify-center rounded-2xl bg-primary-soft">
        <Icono size={26} color={colors.primary} />
      </View>
      <Text className="text-center font-sans-medium text-xs text-muted-foreground" numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}
