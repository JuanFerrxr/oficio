import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useFlujo } from '@/features/auth/flujo';
import { useSession } from '@/features/auth/session';
import { colors } from '@/theme/colors';

// Punto de entrada: "/" decide a dónde va cada quien.
export default function Entrada() {
  const { session, pendiente, rolListo, esPrestador, modo } = useSession();
  const { despues } = useFlujo();

  if (!session) return <Redirect href="/welcome" />;
  if (pendiente === 'correo') return <Redirect href="/verify-email" />;
  if (pendiente === 'contrasena') return <Redirect href="/new-password" />;
  // Al terminar el registro del prestador → B1 (la pantalla de destino borra `despues`)
  if (despues) return <Redirect href={despues as never} />;
  if (!rolListo) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return <Redirect href={esPrestador && modo === 'prestador' ? '/prestador' : '/home'} />;
}
