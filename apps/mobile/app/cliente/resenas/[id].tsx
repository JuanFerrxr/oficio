import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppBar, BottomBar, Button, Chip, Note, Screen } from '@/components/ui';
import { FotoAmpliada } from '@/components/FotoAmpliada';
import { ResumenResenas } from '@/components/resenas/ResumenResenas';
import { ReviewCard } from '@/components/resenas/ReviewCard';
import { useSession } from '@/features/auth/session';
import { primerNombre } from '@/features/cliente/formato';
import { ETIQUETAS, filtrar, urlFoto, useResenas, type Filtro } from '@/features/resenas/resenas';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

// A5.1 · Todas las reseñas de un prestador, con las fotos de los clientes y filtros.
export default function ResenasDelPrestador() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const { resenas, resumen, error } = useResenas(id);
  const [nombre, setNombre] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [foto, setFoto] = useState<string | null>(null);

  useEffect(() => {
    supabase.rpc('perfil_prestador', { p_provider: id }).then(({ data }) => setNombre(primerNombre((data as { full_name?: string } | null)?.full_name)));
  }, [id]);

  const fotos = resenas.flatMap((r) => r.fotos ?? []);
  // Filtros: Todas, Con fotos (si hay) y las etiquetas que sí tienen reseñas, de la más común a la menos
  const etiquetas = ETIQUETAS.map((e) => ({ ...e, n: resumen?.etiquetas?.[e.value] ?? 0 })).filter((e) => e.n > 0).sort((a, b) => b.n - a.n);
  const filtros: { value: Filtro; label: string }[] = [
    { value: 'todas', label: 'Todas' },
    ...(fotos.length ? [{ value: 'fotos' as const, label: 'Con fotos' }] : []),
    ...etiquetas.map((e) => ({ value: e.value, label: e.label })),
  ];
  const lista = filtrar(resenas, filtro);
  const esYo = id === session?.user.id;

  return (
    <Screen
      header={<AppBar title={nombre ? `Reseñas de ${nombre}` : 'Reseñas'} />}
      footer={esYo ? undefined : <BottomBar><Button onPress={() => router.push({ pathname: '/cliente/solicitar/[id]', params: { id } })}>Solicitar servicio</Button></BottomBar>}
    >
      {error ? <Note tone="error">No pudimos cargar las reseñas. Revisa tu conexión.</Note> : null}
      {resumen === undefined ? <View className="items-center py-10"><ActivityIndicator color={colors.primary} /></View> : null}
      {resumen === null ? <Note tone="warning">Este prestador ya no está disponible.</Note> : null}
      {resumen ? (
        <>
          <ResumenResenas resumen={resumen} />
          {fotos.length ? (
            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="font-sans-bold text-sm text-foreground">{`Fotos de clientes · ${fotos.length}`}</Text>
                <Pressable onPress={() => setFiltro('fotos')} hitSlop={8}><Text className="font-sans-semibold text-sm text-primary">Ver todas</Text></Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                {fotos.map((f) => (
                  <Pressable key={f} onPress={() => setFoto(urlFoto(f))} accessibilityLabel="Ver foto">
                    <Image source={{ uri: urlFoto(f) }} className="h-20 w-20 rounded-xl bg-border" />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}
          {resenas.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
              {filtros.map((f) => <Chip key={f.value} selected={filtro === f.value} onPress={() => setFiltro(f.value)}>{f.label}</Chip>)}
            </ScrollView>
          ) : null}
          {lista.map((r) => <ReviewCard key={r.id} r={r} onFoto={setFoto} />)}
          {!resenas.length ? <Text className="py-6 text-center font-sans text-sm text-muted-foreground">{`${nombre || 'Este prestador'} todavía no tiene reseñas.`}</Text> : null}
        </>
      ) : null}
      <FotoAmpliada url={foto} onClose={() => setFoto(null)} />
    </Screen>
  );
}
