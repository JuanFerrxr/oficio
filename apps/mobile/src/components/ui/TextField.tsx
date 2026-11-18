import { forwardRef, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react-native';
import { colors } from '@/theme/colors';

// Figma: TextField · label? · icon? · value · estado focus · error · Tipo=Una línea|Multilínea (multiline)
type Props = Omit<TextInputProps, 'className'> & {
  label?: string;
  error?: string;
  hint?: string;
  /** Texto fijo antes del campo, p. ej. "+52" */
  prefix?: string;
  /** Ícono a la izquierda (phone, mail, user…) */
  icon?: LucideIcon;
  /** Muestra el botón de ojo para ver la contraseña */
  password?: boolean;
};

export const TextField = forwardRef<TextInputInstance, Props>(function TextField(
  { label, error, hint, prefix, icon: Icon, password, onFocus, onBlur, ...input },
  ref,
) {
  const [enfocado, setEnfocado] = useState(false);
  const [visible, setVisible] = useState(false);
  const interno = useRef<TextInputInstance | null>(null);
  const asignarRef = (el: TextInputInstance | null) => {
    interno.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };
  const borde = error ? 'border-2 border-danger' : enfocado ? 'border-2 border-primary' : 'border border-border';

  return (
    <View className="gap-1.5">
      {label ? <Text className="font-sans-semibold text-sm text-foreground">{label}</Text> : null}
      {/* Toda la caja enfoca el campo: el TextInput solo mide lo que su texto (ver abajo). */}
      <Pressable
        onPress={() => interno.current?.focus()}
        accessible={false}
        className={`${input.multiline ? 'min-h-[104px] items-start py-3' : 'h-12 items-center'} flex-row rounded-xl bg-card px-3 ${borde}`}
      >
        {Icon ? <Icon size={18} color={colors.mutedForeground} style={{ marginRight: 8 }} /> : null}
        {prefix ? <Text className="mr-2 font-sans-semibold text-base text-muted-foreground">{prefix}</Text> : null}
        <TextInput
          ref={asignarRef}
          {...input}
          secureTextEntry={password ? !visible : input.secureTextEntry}
          placeholderTextColor={colors.mutedForeground}
          onFocus={(e) => { setEnfocado(true); onFocus?.(e); }}
          onBlur={(e) => { setEnfocado(false); onBlur?.(e); }}
          // El campo NO se estira a la altura de la caja (sin h-full): mide exactamente una línea de
          // texto y la fila (items-center) lo centra. En el iPhone, un TextInput más alto que su texto
          // con una fuente propia (Figtree) acomoda lo que escribes cerca del borde inferior.
          // Tampoco lleva lineHeight (la clase text-base trae 24): en iOS también baja el texto.
          className="flex-1 font-sans text-foreground"
          // Multilínea (A6 "¿Qué está pasando?", B5): crece con el texto desde arriba
          style={input.multiline
            ? { fontSize: 16, lineHeight: 22, minHeight: 78, paddingVertical: 0, textAlignVertical: 'top' }
            : { fontSize: 16, paddingVertical: 0, paddingTop: 0, paddingBottom: 0, includeFontPadding: false, textAlignVertical: 'center' }}
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
      </Pressable>
      {error ? (
        <Text className="font-sans-medium text-xs text-danger">{error}</Text>
      ) : hint ? (
        <Text className="font-sans-medium text-xs text-muted-foreground">{hint}</Text>
      ) : null}
    </View>
  );
});
