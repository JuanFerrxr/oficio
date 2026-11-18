import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, MapPin } from 'lucide-react-native';
import { TextLink } from '@/components/ui';
import { CategoryTile } from '@/components/cliente/CategoryTile';
import { FavoriteCard } from '@/components/cliente/FavoriteCard';
import { ProviderCard } from '@/components/cliente/ProviderCard';
import { RequestCard } from '@/components/cliente/RequestCard';
import { SearchBar } from '@/components/cliente/SearchBar';
import { Seccion } from '@/components/cliente/Seccion';
import { useSession } from '@/features/auth/session';
import type { TarjetaPrestador } from '@/features/cliente/datos';
import { isoDe, primerNombre } from '@/features/cliente/formato';
import { useOrigen } from '@/features/cliente/origen';
import { grupo, tarjeta, useMisSolicitudes } from '@/features/cliente/solicitudes';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

// A3 · Inicio del cliente: ubicación, búsqueda por problema, oficios, tu próximo servicio,
// tus favoritos (♥ o calificados con 4.5+) y los mejor calificados cerca.
type Categoria = { id: number; slug: string; name: string; icon: string | null };

export default function Inicio() {
  const { session } = useSession();
  const origen = useOrigen();
  const { solicitudes } = useMisSolicitudes();
  const [nombre, setNombre] = useState('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [favoritos, setFavoritos] = useState<{ p: TarjetaPrestador; motivo: string; favorito: boolean }[]>([]);
  const [mejores, setMejores] = useState<TarjetaPrestador[]>([]);

  useEffect(() => {
    supabase.from('categories').select('id, slug, name, icon').eq('is_active', true).order('sort_order').then(({ data }) => setCategorias(data ?? []));
    if (session) supabase.from('profiles').select('full_name').eq('id', session.user.id).single().then(({ data }) => setNombre(primerNombre(data?.full_name)));
  }, [session]);

  // Favoritos y "mejor calificados" dependen de desde dónde busca; se recargan al volver a la pestaña
  useFocusEffect(useCallback(() => {
    if (!origen) return;
    (async () => {
      const { data: favs } = await supabase.rpc('home_favorites');
      const ids = (favs ?? []).map((f) => f.provider_id);
      const [tarjetas, top] = await Promise.all([
        ids.length ? supabase.rpc('buscar_prestadores', { p_lat: origen.lat, p_lng: origen.lng, p_ids: ids }) : Promise.resolve({ data: [] as TarjetaPrestador[] }),
        supabase.rpc('buscar_prestadores', { p_lat: origen.lat, p_lng: origen.lng, p_orden: 'calificacion', p_limit: 6 }),
      ]);
      setFavoritos((favs ?? []).map((f) => {
        const p = (tarjetas.data ?? []).find((t) => t.provider_id === f.provider_id);
        return p ? { p, favorito: f.reason === 'favorite', motivo: f.reason === 'favorite' ? 'En tus favoritos' : 'Lo calificaste con 4.5 ★ o más' } : null;
      }).filter(Boolean) as typeof favoritos);
      setMejores(top.data ?? []);
    })();
  }, [origen]));

  // Tu próximo servicio: la cita confirmada más cercana; si no hay, la última aceptada
  const proximas = solicitudes.filter((s) => grupo(s) === 'aceptadas')
    .sort((a, b) => (a.scheduled_at ?? 'z').localeCompare(b.scheduled_at ?? 'z'));
  const proxima = proximas.find((s) => !s.scheduled_at || isoDe(s.scheduled_at) >= isoDe(new Date().toISOString())) ?? proximas[0];
  const esperando = solicitudes.filter((s) => grupo(s) === 'esperando').length;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <ScrollView contentContainerClassName="gap-6 px-5 pb-8 pt-3" keyboardShouldPersistTaps="handled">
        <View className="gap-3">
          <Pressable onPress={() => router.push('/cliente/ubicacion')} className="flex-row items-center gap-1.5 self-start" accessibilityRole="button" testID="ubicacion">
            <MapPin size={16} color={colors.primary} />
            <Text className="font-sans-semibold text-sm text-foreground">{origen?.etiqueta ?? 'Buscando tu ubicación…'}</Text>
            <ChevronDown size={16} color={colors.mutedForeground} />
          </Pressable>
          <Text className="font-display text-2xl text-foreground">{`Hola${nombre ? `, ${nombre}` : ''}. ¿Qué necesitas resolver?`}</Text>
          <SearchBar onPress={() => router.push('/cliente/buscar')} />
        </View>

        {proxima ? (
          <Seccion titulo="Tu próximo servicio" accion="Ver todas" onAccion={() => router.push('/requests')}>
            <RequestCard {...tarjeta(proxima)} onPress={() => router.push({ pathname: '/cliente/solicitud/[id]', params: { id: proxima.id } })} />
            {esperando ? (
              <Text className="font-sans text-sm text-muted-foreground">
                <TextLink onPress={() => router.push('/requests')}>{`${esperando} ${esperando === 1 ? 'solicitud esperando' : 'solicitudes esperando'} respuesta`}</TextLink>
              </Text>
            ) : null}
          </Seccion>
        ) : esperando ? (
          <Text className="font-sans text-sm text-muted-foreground">
            <TextLink onPress={() => router.push('/requests')}>{`${esperando} ${esperando === 1 ? 'solicitud esperando' : 'solicitudes esperando'} respuesta`}</TextLink>
          </Text>
        ) : null}

        <View className="flex-row flex-wrap justify-between gap-y-4">
          {categorias.map((c) => (
            <CategoryTile key={c.id} icon={c.icon} label={c.name}
              onPress={() => router.push({ pathname: '/cliente/resultados', params: { categoria: String(c.id) } })} />
          ))}
        </View>

        {favoritos.length ? (
          <Seccion titulo="Tus favoritos" subtitulo="Los que marcaste con ♥ y los que calificaste con 4.5 ★ o más.">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 pr-5" className="-mr-5">
              {favoritos.map((f) => (
                <FavoriteCard key={f.p.provider_id} {...f}
                  onSolicitar={() => router.push({ pathname: '/cliente/solicitar/[id]', params: { id: f.p.provider_id } })} />
              ))}
            </ScrollView>
          </Seccion>
        ) : null}

        {mejores.length ? (
          <Seccion titulo="Mejor calificados cerca">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 pr-5" className="-mr-5">
              {mejores.map((p) => (
                <ProviderCard key={p.provider_id} p={p} variante="compacta"
                  onPress={() => router.push({ pathname: '/cliente/prestador/[id]', params: { id: p.provider_id } })} />
              ))}
            </ScrollView>
          </Seccion>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
