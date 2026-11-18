import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppBar, Note, Screen, SegmentedControl } from '@/components/ui';
import { ConversationRow } from '@/components/chat/Mensajes';
import { grupoMensajes, lineaServicio, useConversaciones } from '@/features/chat/chat';
import { colors } from '@/theme/colors';

// B9 Nuevas · B9.1 Activas · B9.2 Historial · Mensajes del prestador.
type Pestana = 'nuevas' | 'activas' | 'historial';

export default function Mensajes() {
  const { lista, cargando, error } = useConversaciones();
  const [pestana, setPestana] = useState<Pestana>('nuevas');
  const mias = lista.filter((c) => c.rol === 'prestador');
  const por = (g: Pestana) => mias.filter((c) => grupoMensajes(c) === g);
  const cuenta = (g: Pestana) => { const n = por(g).length; return n ? ` · ${n}` : ''; };
  const visibles = por(pestana);
  return (
    <Screen header={<AppBar title="Mensajes" back={false} />}>
      <SegmentedControl
        options={[{ value: 'nuevas', label: `Nuevas${cuenta('nuevas')}` }, { value: 'activas', label: `Activas${cuenta('activas')}` }, { value: 'historial', label: 'Historial' }] as const}
        value={pestana} onChange={setPestana} />
      {pestana === 'nuevas' ? <Note>Puedes resolver dudas antes de cotizar. Tu teléfono y la dirección exacta se comparten solo cuando el cliente confirma.</Note> : null}
      {error ? <Note tone="error">No pudimos cargar tus mensajes. Revisa tu conexión.</Note> : null}
      {cargando ? <View className="items-center py-8"><ActivityIndicator color={colors.primary} /></View> : null}
      {!cargando && !visibles.length ? (
        <Text className="py-8 text-center font-sans text-sm text-muted-foreground">
          {pestana === 'nuevas' ? 'Sin solicitudes nuevas por ahora.' : pestana === 'activas' ? 'Aquí verás las conversaciones de lo que cotizaste y tus citas.' : 'Aquí quedan las conversaciones de trabajos terminados, rechazados o cancelados.'}
        </Text>
      ) : null}
      <View>
        {visibles.map((c) => (
          <ConversationRow key={c.request_id} c={c} linea={lineaServicio(c)} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: c.request_id } })} />
        ))}
      </View>
    </Screen>
  );
}
