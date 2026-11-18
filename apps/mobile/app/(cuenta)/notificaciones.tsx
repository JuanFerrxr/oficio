import { useCallback, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { BellRing } from 'lucide-react-native';
import { AppBar, Button, Note, Screen } from '@/components/ui';
import { registrarPush, type EstadoPush } from '@/features/avisos/push';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

// A9 / B8 · Notificaciones: en qué quedó el permiso de este teléfono y un aviso de prueba.
const TEXTO: Record<EstadoPush, { titulo: string; detalle: string; tono: 'privacy' | 'warning' | 'error' }> = {
  activo: { titulo: 'Activadas en este teléfono', detalle: 'Te avisamos de solicitudes nuevas, cotizaciones, confirmaciones, mensajes y reseñas.', tono: 'privacy' },
  'sin-permiso': { titulo: 'Sin permiso', detalle: 'El iPhone no deja que Oficio te mande avisos. Actívalos en Ajustes → Expo Go → Notificaciones.', tono: 'warning' },
  'sin-proyecto': { titulo: 'Falta conectar la app con Expo', detalle: 'Para recibir avisos hace falta el project ID de Expo (npx eas init). Ver docs/12.', tono: 'warning' },
  simulador: { titulo: 'No disponible en el simulador', detalle: 'Las notificaciones push solo llegan a un teléfono real.', tono: 'warning' },
  web: { titulo: 'No disponible en la versión web', detalle: 'Las notificaciones push solo llegan a la app en el teléfono.', tono: 'warning' },
  error: { titulo: 'No se pudieron activar', detalle: 'Algo falló al registrar este teléfono.', tono: 'error' },
};

export default function Notificaciones() {
  const [estado, setEstado] = useState<{ estado: EstadoPush; detalle?: string } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useFocusEffect(useCallback(() => { registrarPush(false).then(setEstado); }, []));

  async function activar() {
    setCargando(true);
    setEstado(await registrarPush(true));
    setCargando(false);
  }
  async function prueba() {
    setAviso(null);
    const { error } = await supabase.rpc('aviso_de_prueba');
    setAviso(error ? error.message : 'Listo. Debe llegarte en unos segundos (la API tiene que estar corriendo).');
  }

  const t = estado ? TEXTO[estado.estado] : null;
  return (
    <Screen header={<AppBar title="Notificaciones" />}>
      <View className="items-center gap-2 py-4">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-soft"><BellRing size={30} color={colors.primary} /></View>
      </View>
      {t ? (
        <Note tone={t.tono}>
          <Text className="font-sans-bold">{`${t.titulo}. `}</Text>
          {t.detalle}
          {estado?.estado === 'error' && estado.detalle ? ` (${estado.detalle})` : ''}
        </Note>
      ) : null}
      {estado && estado.estado !== 'activo' && estado.estado !== 'web' && estado.estado !== 'simulador' ? (
        <Button onPress={activar} loading={cargando}>Activar notificaciones</Button>
      ) : null}
      {estado?.estado === 'sin-permiso' ? <Button variant="secondary" onPress={() => Linking.openSettings()}>Abrir Ajustes</Button> : null}
      {estado?.estado === 'activo' ? <Button variant="secondary" onPress={prueba}>Mandarme un aviso de prueba</Button> : null}
      {aviso ? <Note>{aviso}</Note> : null}
      <Text className="font-sans text-xs text-muted-foreground">
        Si alguien más entra con su cuenta en este teléfono, los avisos pasan a esa cuenta. Al cerrar sesión, este teléfono deja de recibirlos.
      </Text>
    </Screen>
  );
}
