import { Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/theme/colors';

// Figma: Badge · tone success|warning|primary|danger · icon?
// Las clases van completas en cada mapa: NativeWind solo reconoce clases escritas tal cual en el código.
type Tone = 'success' | 'warning' | 'primary' | 'danger';
const fondo: Record<Tone, string> = {
  success: 'bg-success-soft',
  warning: 'bg-warning-soft',
  primary: 'bg-primary-soft',
  danger: 'bg-danger-soft',
};
const texto: Record<Tone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  primary: 'text-primary',
  danger: 'text-danger',
};

export function Badge({ children, tone = 'primary', icon: Icon }: { children: string; tone?: Tone; icon?: LucideIcon }) {
  return (
    <View className={`flex-row items-center gap-1 self-start rounded-full px-2 py-0.5 ${fondo[tone]}`}>
      {Icon ? <Icon size={12} color={colors[tone]} strokeWidth={2.5} /> : null}
      <Text className={`font-sans-bold text-xs ${texto[tone]}`}>{children}</Text>
    </View>
  );
}
