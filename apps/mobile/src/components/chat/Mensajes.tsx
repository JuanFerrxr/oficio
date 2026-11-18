import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Platform, Pressable, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { MapPin, Pause, Play, X } from 'lucide-react-native';
import { Avatar } from '@/components/ui';
import { FotoAmpliada } from '@/components/FotoAmpliada';
import { Reproductor } from '@/components/solicitud/MediosSolicitud';
import { duracion, horaLista, useUrlArchivo, vistaPrevia, type Conversacion, type Mensaje } from '@/features/chat/chat';
import { colors } from '@/theme/colors';

// Figma: ConversationRow · ChatBubble · MessageAttachment (foto, video, nota de voz, ubicación)

export function ConversationRow({ c, linea, onPress }: { c: Conversacion; linea: string; onPress: () => void }) {
  const noLeido = c.no_leidos > 0;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" testID="conversacion"
      className="flex-row items-center gap-3 border-b border-border py-3 active:opacity-80">
      <Avatar name={c.otro_nombre} id={c.otro_id} uri={c.otro_avatar} />
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center gap-2">
          <Text numberOfLines={1} className={`flex-1 text-base text-foreground ${noLeido ? 'font-sans-bold' : 'font-sans-semibold'}`}>{c.otro_nombre}</Text>
          <Text className={`font-sans text-xs ${noLeido ? 'text-primary' : 'text-muted-foreground'}`}>{horaLista(c.ultimo_at ?? c.actividad_at)}</Text>
        </View>
        <Text numberOfLines={1} className="font-sans text-xs text-muted-foreground">{linea}</Text>
        <View className="flex-row items-center gap-2">
          <Text numberOfLines={1} className={`flex-1 text-sm ${noLeido ? 'font-sans-semibold text-foreground' : 'font-sans text-muted-foreground'}`}>{vistaPrevia(c)}</Text>
          {noLeido ? (
            <View className="h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5" testID="no-leidos">
              <Text className="font-sans-bold text-xs text-primary-foreground">{c.no_leidos}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

/** Un mensaje en la conversación: burbuja de texto o adjunto */
export function MensajeChat({ m, mio, visto }: { m: Mensaje; mio: boolean; visto?: string | null }) {
  return (
    <View className={`max-w-[82%] gap-1 ${mio ? 'self-end items-end' : 'self-start items-start'}`} testID={`mensaje-${m.type}`}>
      {m.type === 'text' ? (
        <View className={`rounded-2xl px-3.5 py-2.5 ${mio ? 'rounded-br-md bg-primary' : 'rounded-bl-md border border-border bg-card'}`}>
          <Text className={`font-sans text-base ${mio ? 'text-primary-foreground' : 'text-foreground'}`}>{m.body}</Text>
        </View>
      ) : m.type === 'image' ? <Foto ruta={m.media_url!} />
        : m.type === 'video' ? <VideoMsg ruta={m.media_url!} segundos={m.duration_s} />
        : m.type === 'audio' ? <NotaDeVoz ruta={m.media_url!} segundos={m.duration_s} mio={mio} />
        : <Ubicacion lat={m.lat!} lng={m.lng!} direccion={m.body} mio={mio} />}
      <Text className="font-sans text-[11px] text-muted-foreground">{[horaLista(m.created_at).includes(':') ? horaLista(m.created_at) : null, visto ? `Visto ${visto}` : null].filter(Boolean).join(' · ') || ' '}</Text>
    </View>
  );
}

function Foto({ ruta }: { ruta: string }) {
  const url = useUrlArchivo(ruta);
  const [grande, setGrande] = useState<string | null>(null);
  return (
    <Pressable onPress={() => url && setGrande(url)} accessibilityLabel="Ver foto">
      {url ? <Image source={{ uri: url }} className="h-48 w-56 rounded-2xl bg-border" resizeMode="cover" /> : <Cargando />}
      <FotoAmpliada url={grande} onClose={() => setGrande(null)} />
    </Pressable>
  );
}

function VideoMsg({ ruta, segundos }: { ruta: string; segundos: number | null }) {
  const url = useUrlArchivo(ruta);
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Pressable onPress={() => setAbierto(true)} accessibilityLabel="Ver video"
        className="h-40 w-56 items-center justify-center rounded-2xl bg-foreground">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-card/90"><Play size={22} color={colors.foreground} fill={colors.foreground} /></View>
        <Text className="absolute bottom-2 right-3 font-sans-semibold text-xs text-primary-foreground">{duracion(segundos)}</Text>
      </Pressable>
      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <View className="flex-1 justify-center bg-black/95 p-4">
          {url ? <Reproductor uri={url} alto={520} /> : <Cargando />}
          <Pressable onPress={() => setAbierto(false)} className="absolute right-5 top-14" accessibilityLabel="Cerrar video"><X size={28} color="#FFFFFF" /></Pressable>
        </View>
      </Modal>
    </>
  );
}

function NotaDeVoz({ ruta, segundos, mio }: { ruta: string; segundos: number | null; mio: boolean }) {
  const url = useUrlArchivo(ruta);
  return url ? <Reproduccion url={url} segundos={segundos} mio={mio} /> : <View className="h-12 w-56 justify-center rounded-2xl border border-border bg-card px-3"><Cargando /></View>;
}
function Reproduccion({ url, segundos, mio }: { url: string; segundos: number | null; mio: boolean }) {
  const player = useAudioPlayer({ uri: url });
  const st = useAudioPlayerStatus(player);
  useEffect(() => { if (st.didJustFinish) { player.pause(); player.seekTo(0); } }, [st.didJustFinish, player]);
  const total = st.duration || segundos || 1;
  const avance = Math.min(1, (st.currentTime || 0) / total);
  const fg = mio ? colors.primaryForeground : colors.primary;
  return (
    <View className={`h-12 w-56 flex-row items-center gap-3 rounded-2xl px-3 ${mio ? 'bg-primary' : 'border border-border bg-card'}`} testID="nota-de-voz">
      <Pressable onPress={() => (st.playing ? player.pause() : player.play())} hitSlop={8} accessibilityLabel={st.playing ? 'Pausar nota de voz' : 'Reproducir nota de voz'}>
        {st.playing ? <Pause size={20} color={fg} fill={fg} /> : <Play size={20} color={fg} fill={fg} />}
      </Pressable>
      <View className={`h-1 flex-1 overflow-hidden rounded-full ${mio ? 'bg-primary-foreground/30' : 'bg-border'}`}>
        <View className={`h-1 rounded-full ${mio ? 'bg-primary-foreground' : 'bg-primary'}`} style={{ width: `${avance * 100}%` }} />
      </View>
      <Text className={`font-sans-semibold text-xs ${mio ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
        {duracion(st.playing || st.currentTime ? Math.round(st.currentTime) : segundos)}
      </Text>
    </View>
  );
}

/** Ubicación compartida: tarjeta con la dirección; al tocarla abre Mapas */
export function abrirMapa(lat: number, lng: number, nombre?: string | null) {
  const q = encodeURIComponent(nombre || 'Ubicación');
  const url = Platform.OS === 'ios' ? `maps://?ll=${lat},${lng}&q=${q}` : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  Linking.openURL(url).catch(() => Linking.openURL(`https://maps.apple.com/?ll=${lat},${lng}&q=${q}`));
}
function Ubicacion({ lat, lng, direccion, mio }: { lat: number; lng: number; direccion: string | null; mio: boolean }) {
  return (
    <Pressable onPress={() => abrirMapa(lat, lng, direccion)} accessibilityRole="link" accessibilityLabel="Abrir ubicación en Mapas"
      className={`w-60 gap-2 overflow-hidden rounded-2xl ${mio ? 'bg-primary' : 'border border-border bg-card'}`}>
      <View className="h-24 items-center justify-center bg-primary-soft">
        <MapPin size={30} color={colors.primary} fill={colors.primarySoft} />
        <Text className="font-sans text-[10px] text-muted-foreground">{`${lat.toFixed(4)}, ${lng.toFixed(4)}`}</Text>
      </View>
      <View className="gap-0.5 px-3 pb-2.5">
        <Text className={`font-sans-semibold text-sm ${mio ? 'text-primary-foreground' : 'text-foreground'}`}>{direccion || 'Ubicación compartida'}</Text>
        <Text className={`font-sans text-xs ${mio ? 'text-primary-foreground' : 'text-primary'}`}>Abrir en Mapas</Text>
      </View>
    </Pressable>
  );
}

function Cargando() {
  return <ActivityIndicator color={colors.primary} />;
}

/** Separador de días: "Hoy", "Ayer", "Lun 16 nov" */
export function SeparadorDia({ texto }: { texto: string }) {
  return (
    <View className="items-center py-2">
      <Text className="rounded-full bg-border px-3 py-1 font-sans-semibold text-xs text-muted-foreground">{texto}</Text>
    </View>
  );
}
