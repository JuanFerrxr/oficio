import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { chatAbierto } from './estado';

// Notificaciones push (Sprint 4B). La base deja cada aviso en la tabla `avisos` y la API los
// manda por Expo Push al token de cada teléfono. Aquí: pedir permiso, obtener el token,
// registrarlo en la base y abrir la pantalla correcta al tocar un aviso.
export type EstadoPush = 'activo' | 'sin-permiso' | 'sin-proyecto' | 'simulador' | 'web' | 'error';

let tokenActual: string | null = null;
const esWeb = Platform.OS === 'web';

// Con la app abierta, el aviso se muestra arriba, salvo si ya estás viendo esa conversación
if (!esWeb) {
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const d = (n.request.content.data ?? {}) as { ir?: string; requestId?: string };
      const ocultar = d.ir === 'chat' && d.requestId === chatAbierto();
      return { shouldShowBanner: !ocultar, shouldShowList: !ocultar, shouldPlaySound: !ocultar, shouldSetBadge: false };
    },
  });
}

/** El projectId de Expo (lo agrega `npx eas init` en app.json). Sin él, Expo no da token. */
export const projectId = (): string | undefined =>
  (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;

/**
 * Pide permiso (si `pedir`), obtiene el token de Expo y lo guarda en la base para esta cuenta.
 * Nunca truena: devuelve en qué quedó para mostrarlo en Perfil → Notificaciones.
 */
export async function registrarPush(pedir: boolean): Promise<{ estado: EstadoPush; detalle?: string }> {
  if (esWeb) return { estado: 'web' };
  if (!Device.isDevice) return { estado: 'simulador' };
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted' && pedir) ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== 'granted') return { estado: 'sin-permiso' };
    const id = projectId();
    if (!id) return { estado: 'sin-proyecto' };
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', { name: 'Avisos de Oficio', importance: Notifications.AndroidImportance.HIGH });
    }
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    const { error } = await supabase.rpc('registrar_dispositivo', { p_token: token, p_platform: Platform.OS === 'ios' ? 'ios' : 'android' });
    if (error) return { estado: 'error', detalle: error.message };
    tokenActual = token;
    return { estado: 'activo', detalle: token };
  } catch (e) {
    return { estado: 'error', detalle: e instanceof Error ? e.message : String(e) };
  }
}

/** Antes de cerrar sesión: este teléfono deja de recibir los avisos de esa cuenta */
export async function olvidarPush() {
  if (!tokenActual) return;
  await supabase.rpc('olvidar_dispositivo', { p_token: tokenActual });
  tokenActual = null;
}

/** Cierra sesión limpiando primero el token de este teléfono */
export async function cerrarSesion() {
  try { await olvidarPush(); } catch { /* sin conexión: se limpia solo cuando Expo lo rechace */ }
  await supabase.auth.signOut();
}

/** A dónde lleva cada aviso al tocarlo */
export function abrirAviso(d: { ir?: string; requestId?: string }) {
  if (!d.requestId && d.ir !== 'resenas') return;
  switch (d.ir) {
    case 'chat': router.push({ pathname: '/chat/[id]', params: { id: d.requestId! } }); break;
    case 'solicitud': router.push({ pathname: '/cliente/solicitud/[id]', params: { id: d.requestId! } }); break;
    case 'bandeja': router.push({ pathname: '/bandeja/[id]', params: { id: d.requestId! } }); break;
    case 'resenas': router.push('/prestador/reviews'); break;
    default: break;
  }
}

/** En el layout principal: registra el teléfono al entrar y abre el aviso que se tocó */
export function useAvisos(conSesion: string | null) {
  useEffect(() => {
    if (esWeb || !conSesion) return;
    registrarPush(true);
  }, [conSesion]);

  const ultima = esWeb ? null : Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!conSesion || !ultima || ultima.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    abrirAviso((ultima.notification.request.content.data ?? {}) as { ir?: string; requestId?: string });
  }, [ultima, conSesion]);
}
