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
import { buscarConIA } from '@/features/ia/ia';
import { supabase } from '@/lib/supabase';

// A3.0 · Búsqueda por problema.
// Sprint 5A: el texto va a la API, que primero lo compara con el diccionario de la base
// ("se me bota la pastilla" → Electricidad) y, si no hay coincidencia clara, lo busca por
// significado con IA ("la coladera no traga" → Plomería). Si la API no está disponible, se usa
// el diccionario directo de Supabase, como antes.
type Categoria = { id: number; slug: string; name: string; icon: string | null };
type Encontrada = Categoria & { fuente: 'diccionario' | 'significado'; servicios: string[] };

export default function Busqueda() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const origen = useOrigen();
  const [texto, setTexto] = useState(q ?? '');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [opciones, setOpciones] = useState<Encontrada[]>([]);
  const [encontrada, setEncontrada] = useState<Encontrada | null>(null);
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
    if (t.length < 3) { setEncontrada(null); setOpciones([]); setBuscado(false); return; }
    const mio = ++turno.current;
    const espera = setTimeout(async () => {
      let lista: Encontrada[];
      const ia = await buscarConIA(t);
      if (ia) {
        lista = ia.categorias.map((c) => ({ id: c.id, slug: c.slug, name: c.name, icon: null, fuente: c.fuente, servicios: c.servicios }));
      } else {
        const { data } = await supabase.rpc('match_categories', { p_text: t });
        lista = (data ?? []).map((d) => ({ id: d.category_id, slug: d.slug, name: d.name, icon: null, fuente: 'diccionario' as const, servicios: [] }));
      }
      if (mio !== turno.current) return;
      setBuscado(true);
      setOpciones(lista);
      setEncontrada(lista[0] ?? null);
    }, 500);
    return () => clearTimeout(espera);
  }, [texto]);

  useEffect(() => {
    if (!encontrada || !origen) { setPrestadores([]); setRelacionados([]); return; }
    // Si la IA encontró servicios que coinciden con lo que escribió, van primero
    supabase.rpc('servicios_relacionados', { p_category: encontrada.id }).then(({ data }) => {
      const generales = (data ?? []).map((s) => s.titulo);
      setRelacionados([...new Set([...encontrada.servicios, ...generales])].slice(0, 4));
    });
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
          <Note>{`${encontrada.fuente === 'significado' ? 'Por lo que describes, parece' : 'Parece'} algo de ${encontrada.name.toLowerCase()}. Te mostramos ${plural.toLowerCase()} verificados cerca de ${origen?.etiqueta ?? 'ti'}.`}</Note>
          {opciones.length > 1 ? (
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className="font-sans text-sm text-muted-foreground">¿O es de…?</Text>
              {opciones.filter((o) => o.id !== encontrada.id).map((o) => (
                <Chip key={o.id} onPress={() => setEncontrada(o)}>{o.name}</Chip>
              ))}
            </View>
          ) : null}
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
