import { Pressable, Text } from 'react-native';

// Figma: DayToggle · día · On/Off (B2 · Días disponibles)
type Props = { label: string; on: boolean; onPress: () => void; nombre: string };

export function DayToggle({ label, on, onPress, nombre }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityLabel={nombre}
      accessibilityState={{ checked: on }}
      className={`size-[42px] items-center justify-center rounded-full ${on ? 'bg-primary' : 'border border-border bg-card'}`}
    >
      <Text className={`font-sans-bold text-sm ${on ? 'text-primary-foreground' : 'text-muted-foreground'}`}>{label}</Text>
    </Pressable>
  );
}
