import { useState } from 'react';
import { Text, View } from 'react-native';
import { Circle, CircleCheck } from 'lucide-react-native';
import { ProgressBar, TextField } from '@/components/ui';
import { nivel, reglas } from '@/features/auth/contrasena';
import { colors } from '@/theme/colors';

// A1.2 y A0.4: contraseña, medidor "Seguridad de la contraseña", requisitos y confirmación.
type Props = {
  contrasena: string;
  confirmacion: string;
  onContrasena: (v: string) => void;
  onConfirmacion: (v: string) => void;
  etiqueta?: string;
  error?: string;
};

const colorNivel = { danger: 'text-danger', warning: 'text-warning', primary: 'text-primary', success: 'text-success' } as const;

export function CamposContrasena({ contrasena, confirmacion, onContrasena, onConfirmacion, etiqueta = 'Contraseña', error }: Props) {
  const [tocoConfirmacion, setTocoConfirmacion] = useState(false);
  const n = nivel(contrasena);
  const coinciden = confirmacion.length > 0 && confirmacion === contrasena;
  const errorConfirmacion = tocoConfirmacion && confirmacion.length > 0 && !coinciden ? 'Las contraseñas no coinciden' : undefined;

  return (
    <View className="gap-4">
      <TextField
        label={etiqueta}
        value={contrasena}
        onChangeText={onContrasena}
        password
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        autoComplete="new-password"
        error={error}
        testID="contrasena"
      />

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="font-sans-semibold text-sm text-foreground">Seguridad de la contraseña</Text>
          {contrasena ? <Text className={`font-sans-bold text-sm ${colorNivel[n.tono]}`}>{n.etiqueta}</Text> : null}
        </View>
        <ProgressBar step={n.valor} total={4} />
      </View>

      <View className="gap-2">
        {reglas(contrasena).map((r) => (
          <View key={r.texto} className="flex-row items-center gap-2">
            {r.cumple ? <CircleCheck size={18} color={colors.success} /> : <Circle size={18} color={colors.mutedForeground} />}
            <Text className={`font-sans text-sm ${r.cumple ? 'text-foreground' : 'text-muted-foreground'}`}>{r.texto}</Text>
          </View>
        ))}
      </View>

      <View className="gap-1.5">
        <TextField
          label="Confirma tu contraseña"
          value={confirmacion}
          onChangeText={onConfirmacion}
          onBlur={() => setTocoConfirmacion(true)}
          password
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
          error={errorConfirmacion}
          testID="confirmacion"
        />
        {coinciden ? (
          <View className="flex-row items-center gap-1.5">
            <CircleCheck size={14} color={colors.success} />
            <Text className="font-sans-medium text-xs text-success">Las contraseñas coinciden</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
