import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { CircleCheck } from 'lucide-react-native';
import { BottomBar, Button, Screen } from '@/components/ui';
import { actualizarFlujo } from '@/features/auth/flujo';
import { colors } from '@/theme/colors';

// A0.5 · Listo. La sesión ya está abierta; al quitar `pendiente`, "/" manda a Inicio.
export default function ContrasenaActualizada() {
  return (
    <Screen
      footer={
        <BottomBar>
          <Button
            onPress={() => {
              actualizarFlujo({ pendiente: null, recuperacion: null });
              router.replace('/');
            }}
          >
            Ir al inicio
          </Button>
        </BottomBar>
      }
    >
      <View className="items-center gap-4 pt-20">
        <View className="size-20 items-center justify-center rounded-full bg-success-soft">
          <CircleCheck size={44} color={colors.success} />
        </View>
        <Text className="text-center font-display text-2xl text-foreground">Listo, tu contraseña se actualizó</Text>
        <Text className="text-center font-sans text-base text-muted-foreground">
          Ya puedes usarla para entrar. Si no fuiste tú, contáctanos desde Ayuda.
        </Text>
      </View>
    </Screen>
  );
}
