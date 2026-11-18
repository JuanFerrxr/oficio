import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/theme/colors';

// Figma: Button · variant primary|secondary|accent|destructive · size lg|sm · icon?
type Props = {
  children: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'destructive' | 'ghost';
  size?: 'lg' | 'sm';
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
};

const fondo = {
  primary: 'bg-primary',
  secondary: 'bg-card border border-border',
  accent: 'bg-accent',
  destructive: 'bg-danger',
  ghost: 'bg-transparent',
};
const texto = {
  primary: 'text-primary-foreground',
  secondary: 'text-foreground',
  accent: 'text-foreground',
  destructive: 'text-primary-foreground',
  ghost: 'text-primary',
};
const colorIcono = {
  primary: colors.primaryForeground,
  secondary: colors.foreground,
  accent: colors.foreground,
  destructive: colors.primaryForeground,
  ghost: colors.primary,
};

export function Button({ children, onPress, variant = 'primary', size = 'lg', icon: Icon, loading, disabled }: Props) {
  const inactivo = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactivo, busy: !!loading }}
      className={`${size === 'lg' ? 'h-12 px-5 rounded-xl' : 'h-9 px-4 rounded-lg'} ${fondo[variant]} flex-row items-center justify-center gap-2 active:opacity-80 ${inactivo ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={colorIcono[variant]} />
      ) : (
        <View className="flex-row items-center gap-2">
          {Icon ? <Icon size={size === 'lg' ? 18 : 16} color={colorIcono[variant]} /> : null}
          <Text className={`font-sans-bold ${size === 'lg' ? 'text-base' : 'text-sm'} ${texto[variant]}`}>{children}</Text>
        </View>
      )}
    </Pressable>
  );
}
