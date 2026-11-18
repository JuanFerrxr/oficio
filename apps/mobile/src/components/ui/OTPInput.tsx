import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputInstance } from 'react-native';

// Figma: OTPCell × 6 · estados lleno / activo / vacío / error
// Un solo TextInput invisible recibe lo que se escribe; las 6 casillas solo lo dibujan.
// textContentType="oneTimeCode" hace que el iPhone ofrezca el código del SMS sobre el teclado.
type Props = {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  error?: boolean;
  length?: number;
};

export function OTPInput({ value, onChange, onComplete, error, length = 6 }: Props) {
  const ref = useRef<TextInputInstance>(null);
  const [enfocado, setEnfocado] = useState(true);

  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityLabel="Código de verificación">
      <View className="flex-row justify-between gap-2">
        {Array.from({ length }).map((_, i) => {
          const activa = enfocado && i === Math.min(value.length, length - 1);
          const borde = error ? 'border-2 border-danger' : activa ? 'border-2 border-primary' : 'border border-border';
          return (
            <View key={i} className={`h-14 flex-1 items-center justify-center rounded-xl bg-card ${borde}`}>
              <Text className="font-mono text-2xl text-foreground">{value[i] ?? ''}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => {
          const limpio = t.replace(/\D/g, '').slice(0, length);
          onChange(limpio);
          if (limpio.length === length) onComplete?.(limpio);
        }}
        onFocus={() => setEnfocado(true)}
        onBlur={() => setEnfocado(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        autoFocus
        caretHidden
        className="absolute h-px w-px opacity-0"
      />
    </Pressable>
  );
}
