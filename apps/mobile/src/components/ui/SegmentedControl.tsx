import { Pressable, Text, View } from 'react-native';

// Figma: SegmentedControl · options · value
// Ej.: Nuevas · Activas · Historial (B4)  /  Día · Semana · Mes (B6)
type Props<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View className="flex-row rounded-xl bg-border p-1" accessibilityRole="tablist">
      {options.map((o) => {
        const activo = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activo }}
            className={`h-9 flex-1 items-center justify-center rounded-lg ${activo ? 'bg-card' : ''}`}
          >
            <Text className={`font-sans-bold text-sm ${activo ? 'text-foreground' : 'text-muted-foreground'}`}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
