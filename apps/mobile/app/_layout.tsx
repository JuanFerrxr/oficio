import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { SessionProvider, useSession } from '@/features/auth/session';
import { colors } from '@/theme/colors';

// La pantalla de carga se queda hasta que estén las fuentes y se sepa si hay sesión guardada.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // En React Native cada peso de letra es una familia distinta: se cargan los 7 que usa Figma.
  const [fuentesListas] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    JetBrainsMono_700Bold,
  });

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <Navegador fuentesListas={fuentesListas} />
      </SessionProvider>
    </SafeAreaProvider>
  );
}

function Navegador({ fuentesListas }: { fuentesListas: boolean }) {
  const { cargando, session, pendiente } = useSession();
  const listo = fuentesListas && !cargando;

  useEffect(() => {
    if (listo) SplashScreen.hideAsync();
  }, [listo]);

  if (!listo) return null;

  const conSesion = !!session;
  const enFlujo = pendiente !== null;

  // Quién puede ver qué (Sprint 1). Si una condición deja de cumplirse, Expo Router saca a la
  // persona de ese grupo y la manda a "/" (app/index.tsx decide a dónde sigue).
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />

      {/* Bienvenida, registro, entrar y recuperar: sin sesión, o con sesión a mitad de un flujo */}
      <Stack.Protected guard={!conSesion || enFlujo}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/* Verificar correo y editar datos: con cualquier sesión */}
      <Stack.Protected guard={conSesion}>
        <Stack.Screen name="(cuenta)" />
      </Stack.Protected>

      {/* La app (cliente, prestador, alta y pantallas del cliente fuera de las pestañas): con sesión y sin flujos pendientes */}
      <Stack.Protected guard={conSesion && !enFlujo}>
        <Stack.Screen name="(client)" />
        <Stack.Screen name="prestador" />
        <Stack.Screen name="alta" />
        <Stack.Screen name="cliente" />
        <Stack.Screen name="bandeja" />
      </Stack.Protected>

      <Stack.Screen name="proximamente" />
      <Stack.Screen name="dev" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
