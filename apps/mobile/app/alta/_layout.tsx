import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { actualizarFlujo, leerFlujo } from '@/features/auth/flujo';
import { colors } from '@/theme/colors';

// Alta del prestador con la sesión abierta: B0.1 (cuenta existente), B1, B2, B3 y sus subpantallas.
// También se abren desde Mi perfil (B8) para editar (?editar=1).
export default function AltaLayout() {
  // Si se llegó aquí desde el registro (app/index.tsx con `despues`), ya se usó: se borra.
  useEffect(() => {
    if (leerFlujo().despues) actualizarFlujo({ despues: null });
  }, []);
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
