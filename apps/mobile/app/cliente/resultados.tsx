import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppBar, Chip, Note, Screen } from '@/components/ui';
import { ProviderCard } from '@/components/cliente/ProviderCard';
import type { TarjetaPrestador } from '@/features/cliente/datos';
import { oficioPlural } from '@/features/cliente/formato';
import { useOrigen } from '@/features/cliente/origen';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

// A4 · Resultados de un oficio, ordenados por distancia, con 3 filtros rápidos.
export default function Resultados() {
  const { categoria } = useLocalSearchParams<{ categoria: string }>();
  const origen = useOrigen();
  const [cat, setCat] = useState<{ slug: string; name: string } | null>(null);
  const [cerca, setCerca] = useState(false);
  const [buenos, setBuenos] = useState(false);
  const [hoy, setHoy] = useState(false);
  const [lista, setLista] = useState<TarjetaPrestador[] | null>(null);

  useEffect(() => {
    supabase.from('categories').select('slug, name').eq('id', Number(categoria)).single().then(({ data }) => setCat(data));
  }, [categoria]);

  useEffect(() => {
    if (!origen) return;
    setLista(null);
    supabase.rpc('buscar_prestadores', {
      p_lat: origen.lat, p_lng: origen.lng, p_category: Number(categoria),
      p_max_km: cerca ? 5 : 15, p_min_rating: buenos ? 4.5 : 0, p_solo_hoy: hoy,
    }).then(({ data }) => setLista(data ?? []));
  }, [origen, categoria, cerca, buenos, hoy]);

  const plural = cat ? oficioPlural(cat.slug, cat.name) : '';

  return (
    <Screen header={<AppBar title={plural} />}>
      <View className="flex-row flex-wrap gap-2">
        <Chip selected={cerca} onPress={() => setCerca(!cerca)}>Hasta 5 km</Chip>
        <Chip selected={buenos} onPress={() => setBuenos(!buenos)}>4.5 o más</Chip>
        <Chip selected={hoy} onPress={() => setHoy(!hoy)}>Hoy</Chip>
      </View>
      {lista === null ? (
        <View className="items-center py-8"><ActivityIndicator color={colors.primary} /></View>
      ) : lista.length ? (
        <>
          <Text className="font-sans text-sm text-muted-foreground">
            {`${lista.length} ${plural.toLowerCase()} verificados cerca de ${origen?.etiqueta ?? 'ti'} · ordenados por distancia`}
          </Text>
          <View className="gap-3">
            {lista.map((p) => (
              <ProviderCard key={p.provider_id} p={p}
                onPress={() => router.push({ pathname: '/cliente/prestador/[id]', params: { id: p.provider_id } })} />
            ))}
          </View>
        </>
      ) : (
        <Note tone="warning">
          {cerca || buenos || hoy
            ? 'Nadie cumple con esos filtros. Quita alguno para ver más opciones.'
            : `Todavía no hay ${plural.toLowerCase()} verificados cerca de ${origen?.etiqueta ?? 'ti'}. Prueba con otra dirección.`}
        </Note>
      )}
    </Screen>
  );
}
