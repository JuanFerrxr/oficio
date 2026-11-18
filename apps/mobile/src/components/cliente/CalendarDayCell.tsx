import { Pressable, Text } from 'react-native';

// Figma: CalendarDayCell · Día · Estado Normal|Seleccionado|No disponible (A6)
type Props = { dia: number; estado: 'normal' | 'seleccionado' | 'no-disponible'; onPress: () => void; etiqueta: string };

export function CalendarDayCell({ dia, estado, onPress, etiqueta }: Props) {
  const fondo = estado === 'seleccionado' ? 'bg-primary' : estado === 'no-disponible' ? 'bg-border' : 'border border-border bg-card';
  const texto = estado === 'seleccionado' ? 'text-primary-foreground' : estado === 'no-disponible' ? 'text-muted-foreground line-through' : 'text-foreground';
  return (
    <Pressable
      onPress={onPress}
      disabled={estado === 'no-disponible'}
      accessibilityRole="checkbox"
      accessibilityLabel={etiqueta}
      accessibilityState={{ checked: estado === 'seleccionado', disabled: estado === 'no-disponible' }}
      className={`size-11 items-center justify-center rounded-xl ${fondo}`}
    >
      <Text className={`font-sans-bold text-base ${texto}`}>{dia}</Text>
    </Pressable>
  );
}
