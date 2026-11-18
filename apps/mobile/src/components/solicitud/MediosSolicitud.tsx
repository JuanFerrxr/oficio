import { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { FotoAmpliada } from '@/components/FotoAmpliada';
import { supabase } from '@/lib/supabase';

// Fotos y video que el cliente adjuntó a una solicitud (A6). Las ven el cliente (A7) y el
// prestador (detalle de B4). El bucket request-media es privado: se piden URLs firmadas por 1 h.
type Medio = { kind: 'image' | 'video'; storage_path: string; duration_s: number | null; url?: string };

export function useMediosSolicitud(requestId: string | undefined) {
  const [medios, setMedios] = useState<Medio[] | null>(null);
  useEffect(() => {
    if (!requestId) return;
    let vivo = true;
    (async () => {
      const { data } = await supabase.from('request_media').select('kind, storage_path, duration_s, sort_order').eq('request_id', requestId).order('sort_order');
      const lista = (data ?? []) as Medio[];
      if (!lista.length) { if (vivo) setMedios([]); return; }
      const { data: urls } = await supabase.storage.from('request-media').createSignedUrls(lista.map((x) => x.storage_path), 3600);
      if (vivo) setMedios(lista.map((x, i) => ({ ...x, url: urls?.[i]?.signedUrl ?? undefined })));
    })();
    return () => { vivo = false; };
  }, [requestId]);
  return medios;
}

/** Título de la sección: "Fotos y video · 3" */
export const tituloMedios = (m: Medio[] | null) => (m?.length ? `Fotos y video · ${m.length}` : 'Fotos y video');

export function MediosSolicitud({ medios, vacio }: { medios: Medio[] | null; vacio: string }) {
  const [foto, setFoto] = useState<string | null>(null);
  if (!medios) return null;
  const fotos = medios.filter((m) => m.kind === 'image' && m.url);
  const video = medios.find((m) => m.kind === 'video' && m.url);
  if (!fotos.length && !video) return <Text className="font-sans text-sm text-muted-foreground">{vacio}</Text>;
  return (
    <View className="gap-2">
      {fotos.length ? (
        <View className="flex-row flex-wrap gap-2" testID="galeria">
          {fotos.map((f) => (
            <Pressable key={f.storage_path} onPress={() => setFoto(f.url!)} accessibilityLabel="Ver foto" className="w-[31.5%]">
              <Image source={{ uri: f.url }} className="aspect-square w-full rounded-xl bg-border" />
            </Pressable>
          ))}
        </View>
      ) : null}
      {video ? <Reproductor uri={video.url!} segundos={video.duration_s} /> : null}
      <FotoAmpliada url={foto} onClose={() => setFoto(null)} />
    </View>
  );
}

export function Reproductor({ uri, segundos, alto = 320 }: { uri: string; segundos?: number | null; alto?: number }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = false; });
  useEffect(() => () => { try { player.pause(); } catch { /* ya liberado */ } }, [player]);
  return (
    <View className="gap-1" testID="video">
      <View className="w-full overflow-hidden rounded-xl bg-foreground" style={{ height: alto }}>
        <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" nativeControls />
      </View>
      {segundos !== undefined ? <Text className="font-sans text-xs text-muted-foreground">{`Video${segundos ? ` · ${segundos} s` : ''} · toca para reproducir`}</Text> : null}
    </View>
  );
}
