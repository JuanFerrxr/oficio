import { forwardRef, useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors } from '@/theme/colors';

// Figma: TextField · label? · value · estado focus · error
type Props = Omit<TextInputProps, 'className'> & {
  label?: string;
  error?: string;
  hint?: string;
  /** Texto fijo antes del campo, p. ej. "+52" */
  prefix?: string;
  /** Muestra el botón de ojo para ver la contraseña */
  password?: boolean;
};

export const TextField = forwardRef<TextInputInstance, Props>(function TextField(
  { label, error, hint, prefix, password, onFocus, onBlur, ...input },
  ref,
) {
  const [enfocado, setEnfocado] = useState(false);
  const [visible, setVisible] = useState(false);
  const borde = error ? 'border-2 border-danger' : enfocado ? 'border-2 border-primary' : 'border border-border';

  return (
    <View className="gap-1.5">
      {label ? <Text className="font-sans-semibold text-sm text-foreground">{label}</Text> : null}
      <View className={`h-12 flex-row items-center rounded-xl bg-card px-3 ${borde}`}>
        {prefix ? <Text className="mr-2 font-sans-semibold text-base text-muted-foreground">{prefix}</Text> : null}
        <TextInput
          ref={ref}
          {...input}
          secureTextEntry={password ? !visible : input.secureTextEntry}
          placeholderTextColor={colors.mutedForeground}
          onFocus={(e) => { setEnfocado(true); onFocus?.(e); }}
          onBlur={(e) => { setEnfocado(false); onBlur?.(e); }}
          className="h-full flex-1 font-sans text-base text-foreground"
        />
        {password ? (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            hitSlop={10}
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {visible ? <EyeOff size={20} color={colors.mutedForeground} /> : <Eye size={20} color={colors.mutedForeground} />}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text className="font-sans-medium text-xs text-danger">{error}</Text>
      ) : hint ? (
        <Text className="font-sans-medium text-xs text-muted-foreground">{hint}</Text>
      ) : null}
    </View>
  );
});
