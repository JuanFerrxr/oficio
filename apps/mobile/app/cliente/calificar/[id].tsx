import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Plus, X } from 'lucide-react-native';
import { AppBar, Avatar, BottomBar, Button, Chip, Note, Screen, TextField, Toggle } from '@/components/ui';
import { Estrellas, textoEstrellas } from '@/components/resenas/Estrellas';
import { OpcionesFoto } from '@/components/prestador/OpcionesFoto';
import { useSession } from '@/features/auth/session';
import type { Solicitud } from '@/features/cliente/datos';
import { diaRelativo, isoDe, primerNombre } from '@/features/cliente/formato';
import type { Foto } from '@/features/prestador/archivos';
import { ETIQUETAS } from '@/features/resenas/resenas';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

// A8 · Calificar un servicio terminado. La reseña se guarda con calificar_solicitud() (que
// también guarda cuánto pagó y el favorito); después se suben las fotos a review-media/<reseña>/.
const MAX_FOTOS = 3;

export default function Calificar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const [s, setS] = useState<Solicitud | null | undefined>(undefined);
  const [yaFavorito, setYaFavorito] = useState(false);
  const [estrellas, setEstrellas] = useState(0);
  const [etiquetas, setEtiquetas] = useState<string[]>([]);
  const [comentario, setComentario] = useState('');
  const [pago, setPago] = useState('');
  const [favorito, setFavorito] = useState(true);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [agregando, setAgregando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    supabase.rpc('mis_solicitudes').then(async ({ data }) => {
      const x = (data ?? []).find((r) => r.id === id) ?? null;
      setS(x);
      if (!x || !session) return;
      const monto = x.final_price_mxn ?? x.quoted_price_mxn;
      if (monto != null) setPago(String(Math.round(Number(monto))));
      const { data: fav } = await supabase.from('client_favorites').select('provider_id').eq('client_id', session.user.id).eq('provider_id', x.provider_id).maybeSingle();
      setYaFavorito(!!fav);
    });
  }, [id, session]);

  if (s === undefined) return <Screen header={<AppBar title="Calificar" />}><View className="items-center py-10"><ActivityIndicator color={colors.primary} /></View></Screen>;
  if (s === null || s.status !== 'completed' || s.mi_calificacion) {
    return (
      <Screen header={<AppBar title="Calificar" />}>
        <Note tone="warning">{s?.mi_calificacion ? 'Ya calificaste este servicio. ¡Gracias!' : 'Podrás calificar cuando el trabajo esté terminado.'}</Note>
        <Button variant="secondary" onPress={() => router.back()}>Volver</Button>
      </Screen>
    );
  }

  const nombre = primerNombre(s.provider_name);
  const cuando = s.scheduled_at ? diaRelativo(isoDe(s.scheduled_at)).toLowerCase() : '';
  const alternar = (v: string) => setEtiquetas((xs) => (xs.includes(v) ? xs.filter((x) => x !== v) : [...xs, v]));

  async function publicar() {
    if (!estrellas) return setError('Toca las estrellas para calificar');
    setError(null);
    setEnviando(true);
    const monto = pago ? Number(pago) : undefined;
    const { data: resenaId, error } = await supabase.rpc('calificar_solicitud', {
      p_request_id: s!.id, p_rating: estrellas, p_tags: etiquetas, p_comment: comentario.trim() || undefined,
      p_pago: monto, p_favorito: !yaFavorito && favorito,
    });
    if (error || !resenaId) {
      setEnviando(false);
      return setError(error?.message || 'No se pudo publicar. Intenta de nuevo.');
    }
    // Fotos: si alguna falla, la reseña ya quedó publicada
    let fallidas = 0;
    for (const [i, f] of fotos.entries()) {
      try {
        const ruta = `${resenaId}/${i + 1}-${Date.now()}.${f.mime === 'image/png' ? 'png' : 'jpg'}`;
        const contenido = await fetch(f.uri).then((r) => r.arrayBuffer());
        const sub = await supabase.storage.from('review-media').upload(ruta, contenido, { contentType: f.mime });
        if (sub.error) throw sub.error;
        const ins = await supabase.from('review_media').insert({ review_id: resenaId, storage_path: ruta, sort_order: i });
        if (ins.error) throw ins.error;
      } catch {
        fallidas++;
      }
    }
    setEnviando(false);
    router.dismissTo({
      pathname: '/requests',
      params: { aviso: fallidas ? `Publicamos tu reseña, pero ${fallidas === 1 ? 'una foto no se pudo subir' : `${fallidas} fotos no se pudieron subir`}.` : `¡Gracias! Publicamos tu reseña de ${nombre}.` },
    });
  }

  return (
    <Screen
      header={<AppBar title="Calificar" />}
      footer={<BottomBar><Button onPress={publicar} loading={enviando}>Publicar reseña</Button></BottomBar>}
    >
      <View className="items-center gap-2">
        <Avatar name={s.provider_name} id={s.provider_id} uri={s.provider_avatar} size="xl" />
        <Text className="text-center font-display text-2xl text-foreground">{`¿Cómo te fue con ${nombre}?`}</Text>
        <Text className="text-center font-sans text-sm text-muted-foreground">{[s.servicio ?? s.categoria, cuando].filter(Boolean).join(' · ')}</Text>
        <View className="mt-2"><Estrellas valor={estrellas} tamano={36} onChange={(n) => { setEstrellas(n); setError(null); }} /></View>
        <Text className="h-5 font-sans-semibold text-sm text-foreground">{textoEstrellas(estrellas)}</Text>
      </View>

      <View className="flex-row flex-wrap justify-center gap-2">
        {ETIQUETAS.map((e) => <Chip key={e.value} selected={etiquetas.includes(e.value)} onPress={() => alternar(e.value)}>{e.label}</Chip>)}
      </View>

      <TextField value={comentario} onChangeText={setComentario} multiline maxLength={1000}
        placeholder="Cuéntale a otros clientes qué hizo (opcional)" accessibilityLabel="Comentario" testID="comentario" />

      <View className="gap-2">
        <Text className="font-sans-semibold text-sm text-foreground">Fotos del resultado (opcional)</Text>
        <Text className="font-sans text-xs text-muted-foreground">{`Se mostrarán en el perfil de ${nombre} para que otros clientes vean su trabajo.`}</Text>
        <View className="flex-row gap-2">
          {fotos.map((f, i) => (
            <View key={f.uri}>
              <Image source={{ uri: f.uri }} className="h-20 w-20 rounded-xl bg-border" />
              <Pressable onPress={() => setFotos((xs) => xs.filter((_, j) => j !== i))} accessibilityLabel="Quitar foto"
                className="absolute -right-2 -top-2 h-6 w-6 items-center justify-center rounded-full bg-foreground">
                <X size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          ))}
          {fotos.length < MAX_FOTOS && !agregando ? (
            <Pressable onPress={() => setAgregando(true)} accessibilityLabel="Agregar foto"
              className="h-20 w-20 items-center justify-center rounded-xl border border-dashed border-border bg-card">
              <Plus size={24} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
        {agregando ? <OpcionesFoto onFoto={(f) => { setFotos((xs) => [...xs, f].slice(0, MAX_FOTOS)); setAgregando(false); }} /> : null}
      </View>

      <TextField label="¿Cuánto pagaste al final? · privado" prefix="$" value={pago} onChangeText={(t) => setPago(t.replace(/[^\d]/g, ''))}
        keyboardType="number-pad" hint={`Solo lo ven tú y ${nombre}; no aparece en la reseña.`} testID="pago" />

      {!yaFavorito ? (
        <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <View className="flex-1 gap-0.5">
            <Text className="font-sans-semibold text-sm text-foreground">{`Guardar a ${nombre} en favoritos`}</Text>
            <Text className="font-sans text-xs text-muted-foreground">Aparecerá en tu Inicio para volver a contratarlo en un toque.</Text>
          </View>
          <Toggle value={favorito} onChange={setFavorito} label="Guardar en favoritos" testID="favorito-calificar" />
        </View>
      ) : null}

      {error ? <Note tone="error">{error}</Note> : null}
    </Screen>
  );
}
