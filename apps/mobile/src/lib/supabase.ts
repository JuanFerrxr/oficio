import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@oficio/shared/types/database';

// Vienen de apps/mobile/.env (las crea scripts\crear-env-mobile.ps1).
// Las variables EXPO_PUBLIC_* se copian dentro de la app al empaquetarla: solo pueden ser datos
// públicos. La llave pública lo es por diseño; la seguridad la ponen las reglas RLS de la base.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** false si falta el .env: la app abre igual y la pantalla de Diagnóstico explica qué hacer. */
export const supabaseConfigurado = Boolean(url && key);
export const supabaseUrl = url ?? '(sin configurar)';

// La sesión se guarda en el teléfono (AsyncStorage) para no pedir la contraseña cada vez.
export const supabase = createClient<Database>(url ?? 'http://sin-configurar.invalid', key ?? 'sin-configurar', {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Renueva la sesión solo mientras la app está en pantalla (ahorra batería y datos).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
