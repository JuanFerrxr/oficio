import { Text } from 'react-native';

// Enlace dentro de un texto: "¿No tienes cuenta? Regístrate", "Cambiar", "Reenviar"…
export function TextLink({ children, onPress, disabled }: { children: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Text
      onPress={disabled ? undefined : onPress}
      accessibilityRole="link"
      suppressHighlighting
      className={`font-sans-bold ${disabled ? 'text-muted-foreground' : 'text-primary'}`}
    >
      {children}
    </Text>
  );
}
