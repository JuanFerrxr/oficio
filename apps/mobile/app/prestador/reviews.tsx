import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { AppBar, Chip, Note, Screen } from '@/components/ui';
import { FotoAmpliada } from '@/components/FotoAmpliada';
import { ResumenResenas } from '@/components/resenas/ResumenResenas';
import { ReviewCard } from '@/components/resenas/ReviewCard';
import { useSession } from '@/features/auth/session';
import { ETIQUETAS, filtrar, useResenas, type Filtro } from '@/features/resenas/resenas';
import { colors } from '@/theme/colors';

// B7 · Mis reseñas: lo que los clientes dicen del prestador. Responder a una reseña queda para
// después del MVP (por eso no está el filtro "Sin responder" de Figma).
export default function MisResenas() {
  const { session } = useSession();
  const { resenas, resumen, error } = useResenas(session?.user.id);
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [foto, setFoto] = useState<string | null>(null);

  const destacadas = ETIQUETAS
    .map((e) => ({ ...e, n: resumen?.etiquetas?.[e.value] ?? 0 }))
    .filter((e) => e.n > 0)
    .sort((a, b) => b.n - a.n);
  const lista = filtrar(resenas, filtro);

  return (
    <Screen header={<AppBar title="Mis reseñas" back={false} />}>
      {error ? <Note tone="error">No pudimos cargar tus reseñas. Revisa tu conexión.</Note> : null}
      {resumen === undefined ? <View className="items-center py-10"><ActivityIndicator color={colors.primary} /></View> : null}
      {resumen === null ? <Note>Cuando tu perfil esté aprobado y termines trabajos, aquí verás lo que dicen tus clientes.</Note> : null}
      {resumen ? (
        <>
          <ResumenResenas resumen={resumen} />
          {destacadas.length ? (
            <View className="gap-2">
              <Text className="font-sans-bold text-sm text-foreground">Lo que más destacan tus clientes</Text>
              <View className="flex-row flex-wrap gap-2">
                {destacadas.map((e) => <Chip key={e.value}>{`${e.label} · ${e.n}`}</Chip>)}
              </View>
            </View>
          ) : null}
          {resenas.length ? (
            <View className="flex-row flex-wrap gap-2">
              {([['todas', 'Todas'], ['fotos', 'Con fotos'], ['bajas', '4 ★ o menos']] as const).map(([v, l]) => (
                <Chip key={v} selected={filtro === v} onPress={() => setFiltro(v)}>{l}</Chip>
              ))}
            </View>
          ) : null}
          {lista.map((r) => <ReviewCard key={r.id} r={r} onFoto={setFoto} />)}
          {!resenas.length ? <Text className="py-6 text-center font-sans text-sm text-muted-foreground">Todavía no tienes reseñas. Llegan cuando tus clientes califican un trabajo terminado.</Text> : null}
          {resenas.length > 0 && !lista.length ? <Text className="py-6 text-center font-sans text-sm text-muted-foreground">Ninguna reseña con este filtro.</Text> : null}
        </>
      ) : null}
      <FotoAmpliada url={foto} onClose={() => setFoto(null)} />
    </Screen>
  );
}
