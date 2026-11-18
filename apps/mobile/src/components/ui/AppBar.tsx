import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { colors } from '@/theme/colors';

// Figma: AppBar · title · back · action (aquí: "Paso 2 de 4")
type Props = { title?: string; back?: boolean; right?: string };

export function AppBar({ title, back = true, right }: Props) {
  return (
    <View className="h-[52px] flex-row items-center gap-2 px-5">
      {back && router.canGoBack() ? (
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Regresar" className="-ml-1">
          <ChevronLeft size={24} color={colors.foreground} />
        </Pressable>
      ) : null}
      {title ? <Text className="flex-1 font-display text-lg text-foreground">{title}</Text> : <View className="flex-1" />}
      {right ? <Text className="font-sans-semibold text-sm text-muted-foreground">{right}</Text> : null}
    </View>
  );
}
