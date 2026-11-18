import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppBar, Chip, Note, Screen } from '@/components/ui';
import { CategoryTile } from '@/components/cliente/CategoryTile';
import { ProviderCard } from '@/components/cliente/ProviderCard';
import { SearchBar } from '@/components/cliente/SearchBar';
import { Seccion } from '@/components/cliente/Seccion';
import type { TarjetaPrestador } from '@/features/cliente/datos';
import { oficioPlural } from '@/features/cliente/formato';
import { useOrigen } from '@/features/cliente/origen';
import { supabase } from '@/lib/supabase';

// A3.0 · Búsqueda por problema. El texto se compara con el diccionario de la base
// (match_categories: "se me bota la pastilla" → Electricidad). Sin IA.
type Categoria = { id: number; slug: string; name: string; icon: string | null };

export default function Busqueda() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const origen = useOrigen();
  const [texto, setTexto] = useState(q ?? '');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [encontrada, setEncontrada] = useState<Categoria | null>(null);
  const [buscado, setBuscado] = useState(false);
  const [relacionados, setRelacionados] = useState<string[]>([]);
  const [prestadores, setPrestadores] = useState<TarjetaPrestador[]>([]);
  const turno = useRef(0);

  useEffect(() => {
    supabase.from('categories').select('id, slug, name, icon').eq('is_active', true).order('sort_order').then(({ data }) => setCategorias(data ?? []));
  }, []);

  // Busca 400 ms después de la última tecla
  useEffect(() => {
    const t = texto.trim();
    if (t.length < 3) { setEncontrada(null); setBuscado(false); return; }
    const mio = ++turno.current;
    const espera = setTimeout(async () => {
      const { data } = await supabase.rpc('match_categories', { p_text: t });
      if (mio !== turno.current) return;
      const top = data?.[0];
      setBuscado(true);
      setEncontrada(top ? { id: top.category_id, slug: top.slug, name: top.name, icon: null } : null);
    }, 400);
    return () => clearTimeout(espera);
  }, [texto]);

  useEffect(() => {
    if (!encontrada || !origen) { setPrestadores([]); setRelacionados([]); return; }
    supabase.rpc('servicios_relacionados', { p_category: encontrada.id }).then(({ data }) => setRelacionados((data ?? []).map((s) => s.titulo)));
    supabase.rpc('buscar_prestadores', { p_lat: origen.lat, p_lng: origen.lng, p_category: encontrada.id })
      .then(({ data }) => setPrestadores(data ?? []));
  }, [encontrada, origen]);

  const plural = encontrada ? oficioPlural(encontrada.slug, encontrada.name) : '';
  const abrirResultados = (c: { id: number }) => router.push({ pathname: '/cliente/resultados', params: { categoria: String(c.id) } });

  return (
    <Screen header={<AppBar title="Buscar" />}>
      <SearchBar value={texto} onChangeText={setTexto} autoFocus placeholder="Fuga, apagador, pintar recámara…"
        onSubmit={() => encontrada && abrirResultados(encontrada)} />

      {encontrada ? (
        <>
          <Note>{`Parece algo de ${encontrada.name.toLowerCase()}. Te mostramos ${plural.toLowerCase()} verificados cerca de ${origen?.etiqueta ?? 'ti'}.`}</Note>
          {relacionados.length ? (
            <View className="gap-2">
              <Text className="font-sans-semibold text-sm text-foreground">Servicios relacionados</Text>
              <View className="flex-row flex-wrap gap-2">
                {relacionados.map((r) => <Chip key={r} onPress={() => abrirResultados(encontrada)}>{r}</Chip>)}
              </View>
            </View>
          ) : null}
          <Seccion titulo={`${plural} cerca · ${prestadores.length}`} accion="Ver todos" onAccion={() => abrirResultados(encontrada)}>
            {prestadores.length ? (
              <View className="gap-3">
                {prestadores.slice(0, 3).map((p) => (
                  <ProviderCard key={p.provider_id} p={p}
                    onPress={() => router.push({ pathname: '/cliente/prestador/[id]', params: { id: p.provider_id } })} />
                ))}
              </View>
            ) : (
              <Text className="font-sans text-sm text-muted-foreground">{`Todavía no hay ${plural.toLowerCase()} verificados cerca de ti.`}</Text>
            )}
          </Seccion>
        </>
      ) : (
        <View className="gap-4">
          {buscado ? <Note tone="warning">No reconocimos el problema. Elige el oficio que necesitas:</Note> : (
            <Text className="font-sans text-sm text-muted-foreground">Escribe qué está pasando con tus palabras, o elige un oficio:</Text>
          )}
          <View className="flex-row flex-wrap justify-between gap-y-4">
            {categorias.map((c) => <CategoryTile key={c.id} icon={c.icon} label={c.name} onPress={() => abrirResultados(c)} />)}
          </View>
        </View>
      )}
    </Screen>
  );
}
