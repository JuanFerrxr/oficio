import { Pressable, Text } from 'react-native';

// Figma: Chip · selected · label
type Props = { children: string; selected?: boolean; onPress?: () => void };

export function Chip({ children, selected = false, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`h-9 items-center justify-center rounded-full border px-4 active:opacity-80 ${
        selected ? 'border-primary bg-primary' : 'border-border bg-card'
      }`}
    >
      <Text className={`font-sans-semibold text-sm ${selected ? 'text-primary-foreground' : 'text-foreground'}`}>
        {children}
      </Text>
    </Pressable>
  );
}
