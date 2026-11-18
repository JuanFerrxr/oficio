import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Navigation, Star } from 'lucide-react-native';
import { Avatar, Note } from '@/components/ui';
import { Composer, type Adjunto } from '@/components/chat/Composer';
import { MensajeChat, SeparadorDia, abrirMapa } from '@/components/chat/Mensajes';
import { useSession } from '@/features/auth/session';
import { fijarChatAbierto } from '@/features/avisos/estado';
import { enviar, useConversacion, type Mensaje } from '@/features/chat/chat';
import { diaRelativo, hora, isoDe, pesos } from '@/features/cliente/formato';
import { colors } from '@/theme/colors';

// A3.3 (cliente) · B9.3 (prestador) · Conversación de una solicitud. Texto, fotos, video, notas
// de voz y ubicación. Se puede escribir mientras la solicitud está vigente (desde que se envía
// hasta que termina); después queda para consulta.
type Fila = { tipo: 'dia'; id: string; texto: string } | { tipo: 'msg'; id: string; m: Mensaje };

export default function Conversacion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const uid = session?.user.id ?? '';
  const { info, mensajes, recargar } = useConversacion(id);
  const [aviso, setAviso] = useState<string | null>(null);
  const lista = useRef<FlatList<Fila>>(null);

  // Mientras está abierta, sus avisos no se muestran arriba de la pantalla
  useFocusEffect(useCallback(() => { fijarChatAbierto(id); return () => fijarChatAbierto(null); }, [id]));

  const filas = useMemo<Fila[]>(() => {
    const out: Fila[] = [];
    let dia = '';
    for (const m of mensajes) {
      const d = isoDe(m.created_at);
      if (d !== dia) { dia = d; out.push({ tipo: 'dia', id: `d-${d}`, texto: diaRelativo(d) }); }
      out.push({ tipo: 'msg', id: m.id, m });
    }
    return out;
  }, [mensajes]);
  // "Visto 10:33": solo bajo mi último mensaje, si ya lo leyó
  const ultimoMio = [...mensajes].reverse().find((m) => m.sender_id === uid);

  useEffect(() => { if (filas.length) setTimeout(() => lista.current?.scrollToEnd({ animated: false }), 50); }, [filas.length]);

  async function mandarTexto(t: string) {
    const { error } = await enviar(id, uid, { tipo: 'text', texto: t });
    if (error) { setAviso('No se pudo enviar. Revisa tu conexión.'); return false; }
    setAviso(null);
    await recargar();
    return true;
  }
  async function mandarAdjunto(a: Adjunto) {
    const { error } = await enviar(id, uid, a);
    if (error) { setAviso('No se pudo enviar el archivo. Intenta de nuevo.'); return false; }
    setAviso(null);
    await recargar();
    return true;
  }

  const encabezado = (
    <View className="flex-row items-center gap-3 border-b border-border bg-card px-4 py-2.5">
      <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Regresar"><ChevronLeft size={24} color={colors.foreground} /></Pressable>
      {info ? (
        <>
          <Avatar name={info.otro_nombre} id={info.otro_id} uri={info.otro_avatar} />
          <View className="flex-1">
            <Text numberOfLines={1} className="font-sans-bold text-base text-foreground">{info.otro_nombre}</Text>
            {info.rol === 'cliente' ? (
              <Text numberOfLines={1} className="font-sans text-xs text-muted-foreground">
                {[info.oficio, info.responde_min ? `responde en ~${info.responde_min} min` : null].filter(Boolean).join(' · ')}
              </Text>
            ) : (
              <View className="flex-row items-center gap-1">
                <Text className="font-sans text-xs text-muted-foreground">Cliente</Text>
                {info.cliente_calificacion != null ? <><Text className="font-sans text-xs text-muted-foreground">·</Text><Star size={11} color={colors.accent} fill={colors.accent} /><Text className="font-sans text-xs text-muted-foreground">{Number(info.cliente_calificacion).toFixed(1)}</Text></> : null}
                {info.colonia ? <Text numberOfLines={1} className="font-sans text-xs text-muted-foreground">{`· Col. ${info.colonia}`}</Text> : null}
              </View>
            )}
          </View>
        </>
      ) : <View className="flex-1" />}
    </View>
  );

  if (info === undefined) return <SafeAreaView className="flex-1 bg-background" edges={['top']}>{encabezado}<View className="items-center py-10"><ActivityIndicator color={colors.primary} /></View></SafeAreaView>;
  if (info === null) return <SafeAreaView className="flex-1 bg-background" edges={['top']}>{encabezado}<View className="p-5"><Note tone="warning">No encontramos esta conversación.</Note></View></SafeAreaView>;

  const resumen = [info.scheduled_at && ['scheduled', 'in_progress', 'completed'].includes(info.status) ? `${diaRelativo(isoDe(info.scheduled_at))} ${hora(info.scheduled_at)}` : null, info.servicio,
    info.quoted_price_mxn != null ? pesos(info.quoted_price_mxn) : null].filter(Boolean).join(' · ');
  const verDetalle = () => (info.rol === 'cliente'
    ? router.push({ pathname: '/cliente/solicitud/[id]', params: { id } })
    : router.push({ pathname: '/bandeja/[id]', params: { id } }));

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {encabezado}
        {/* La solicitud de la que se trata */}
        <View className="flex-row items-center gap-3 border-b border-border bg-primary-soft px-4 py-2">
          <Text numberOfLines={1} className="flex-1 font-sans-semibold text-sm text-foreground">{resumen}</Text>
          {info.destino ? (
            <Pressable onPress={() => abrirMapa(info.destino!.lat, info.destino!.lng, info.destino!.direccion)} className="flex-row items-center gap-1" accessibilityRole="link">
              <Navigation size={14} color={colors.primary} />
              <Text className="font-sans-semibold text-sm text-primary">Cómo llegar</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={verDetalle} hitSlop={8} accessibilityRole="link"><Text className="font-sans-semibold text-sm text-primary">Ver detalle</Text></Pressable>
        </View>

        <FlatList
          ref={lista}
          data={filas}
          keyExtractor={(f) => f.id}
          contentContainerClassName="gap-2 px-4 py-3"
          onContentSizeChange={() => lista.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={(
            <View className="items-center gap-2 py-10">
              <Text className="text-center font-sans text-sm text-muted-foreground">
                {info.rol === 'prestador'
                  ? 'Puedes resolver dudas antes de cotizar. Tu teléfono y la dirección exacta se comparten solo cuando el cliente confirma.'
                  : `Escríbele a ${info.otro_nombre.split(' ')[0]} para resolver dudas o coordinar la visita.`}
              </Text>
            </View>
          )}
          renderItem={({ item }) => item.tipo === 'dia'
            ? <SeparadorDia texto={item.texto} />
            : <MensajeChat m={item.m} mio={item.m.sender_id === uid} visto={item.m.id === ultimoMio?.id && item.m.read_at ? hora(item.m.read_at) : null} />}
        />

        {aviso ? <View className="px-4 pb-2"><Note tone="error">{aviso}</Note></View> : null}
        {info.abierto ? (
          <Composer onTexto={mandarTexto} onAdjunto={mandarAdjunto} onAviso={setAviso} />
        ) : (
          <View className="border-t border-border bg-card px-4 py-3">
            <Text className="text-center font-sans text-sm text-muted-foreground" testID="chat-cerrado">
              {info.status === 'completed' ? 'El trabajo terminó: la conversación queda para consulta.' : 'Esta solicitud ya no está vigente: la conversación queda para consulta.'}
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
