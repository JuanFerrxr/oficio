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
  const { cargando } = useSession();
  const listo = fuentesListas && !cargando;

  useEffect(() => {
    if (listo) SplashScreen.hideAsync();
  }, [listo]);

  if (!listo) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(client)" />
      <Stack.Screen name="prestador" />
      <Stack.Screen name="dev" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
