import { ActivityIndicator, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppBar, Note, Screen } from '@/components/ui';
import { ConversationRow } from '@/components/chat/Mensajes';
import { lineaServicio, useConversaciones } from '@/features/chat/chat';
import { colors } from '@/theme/colors';

// A3.2 · Mensajes del cliente: una conversación por solicitud, la más reciente arriba.
export default function Mensajes() {
  const { lista, cargando, error } = useConversaciones();
  const mias = lista.filter((c) => c.rol === 'cliente');
  return (
    <Screen header={<AppBar title="Mensajes" back={false} />}>
      {error ? <Note tone="error">No pudimos cargar tus mensajes. Revisa tu conexión.</Note> : null}
      {cargando ? <View className="items-center py-8"><ActivityIndicator color={colors.primary} /></View> : null}
      {!cargando && !mias.length ? (
        <Text className="py-10 text-center font-sans text-sm text-muted-foreground">Cuando envíes una solicitud, aquí podrás platicar con el prestador.</Text>
      ) : null}
      <View>
        {mias.map((c) => (
          <ConversationRow key={c.request_id} c={c} linea={lineaServicio(c)} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: c.request_id } })} />
        ))}
      </View>
    </Screen>
  );
}
