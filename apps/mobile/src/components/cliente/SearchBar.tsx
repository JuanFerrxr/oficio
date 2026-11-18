import { forwardRef } from 'react';
import { Pressable, Text, TextInput, View, type TextInputInstance } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { colors } from '@/theme/colors';

// Figma: SearchBar · placeholder. En A3 es un botón que abre A3.0; en A3.0 es el campo de texto.
type Props = {
  placeholder?: string;
  value?: string;
  onChangeText?: (t: string) => void;
  onPress?: () => void;
  onSubmit?: () => void;
  autoFocus?: boolean;
};

export const SearchBar = forwardRef<TextInputInstance, Props>(function SearchBar(
  { placeholder = 'Fuga, apagador, pintar recámara…', value, onChangeText, onPress, onSubmit, autoFocus },
  ref,
) {
  const caja = 'h-12 flex-row items-center gap-2 rounded-xl border border-border bg-card px-3';
  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="search" className={caja} testID="buscador">
        <Search size={20} color={colors.mutedForeground} />
        <Text className="flex-1 font-sans text-base text-muted-foreground" numberOfLines={1}>{placeholder}</Text>
      </Pressable>
    );
  }
  return (
    <View className={caja}>
      <Search size={20} color={colors.mutedForeground} />
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        autoFocus={autoFocus}
        returnKeyType="search"
        autoCorrect={false}
        className="flex-1 font-sans text-foreground"
        style={{ fontSize: 16, paddingVertical: 0, includeFontPadding: false }}
        testID="buscador-texto"
      />
      {value ? (
        <Pressable onPress={() => onChangeText?.('')} hitSlop={10} accessibilityLabel="Borrar búsqueda">
          <X size={18} color={colors.mutedForeground} />
        </Pressable>
      ) : null}
    </View>
  );
});
