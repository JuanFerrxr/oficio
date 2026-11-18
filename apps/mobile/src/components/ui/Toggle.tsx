import { Switch } from 'react-native';
import { colors } from '@/theme/colors';

// Figma: Toggle · Activo (B4 "Disponible", A8 "Guardar en favoritos")
type Props = { value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; testID?: string };

export function Toggle({ value, onChange, label, disabled, testID }: Props) {
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      accessibilityLabel={label}
      testID={testID}
      trackColor={{ false: colors.border, true: colors.primary }}
      thumbColor={colors.card}
      ios_backgroundColor={colors.border}
    />
  );
}
