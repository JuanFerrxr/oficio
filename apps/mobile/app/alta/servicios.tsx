import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Plus, X } from 'lucide-react-native';
import { Badge, BottomBar, Button, Chip, ListGroup, Note, Screen, SegmentedControl, TextField, Title, UploadRow } from '@/components/ui';
import { EncabezadoAlta } from '@/components/prestador/PasoAlta';
import { useAlta, type Servicio } from '@/features/prestador/alta';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

// B1 · ¿Qué servicios ofreces y a qué precio? (Paso 3 de 5)
// Los oficios se eligen con chips; cada servicio tiene oficio, nombre, tipo de precio y monto.
// "Cotizo" no lleva monto (la base lo exige para precio fijo y por hora).
type TipoPrecio = Servicio['price_type'];
type Borrador = { key: string; id?: string; category_id: number; title: string; price_type: TipoPrecio; precio: string };

const TIPOS = [
  { value: 'fixed', label: 'Precio fijo' },
  { value: 'hourly', label: 'Por hora' },
  { value: 'quote', label: 'Cotizo' },
] as const;

let contador = 0;
const nuevaClave = () => `n${++contador}`;

export default function ServiciosYPrecios() {
  const { editar } = useLocalSearchParams<{ editar?: string }>();
  const editando = editar === '1';
  const { uid, servicios, categorias, credenciales, perfil, cargando } = useAlta();
  const [borradores, setBorradores] = useState<Borrador[] | null>(null);
  const [elegidas, setElegidas] = useState<number[]>([]);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Precarga lo guardado (una sola vez; después manda lo que la persona va editando)
  useEffect(() => {
    if (cargando || borradores) return;
    setBorradores(servicios.map((s) => ({
      key: s.id, id: s.id, category_id: s.category_id, title: s.title, price_type: s.price_type,
      precio: s.price_mxn != null ? String(Number(s.price_mxn)) : '',
    })));
    setElegidas([...new Set(servicios.map((s) => s.category_id))]);
  }, [cargando, servicios, borradores]);

  const nombreCat = useMemo(() => new Map(categorias.map((c) => [c.id, c.name])), [categorias]);
  const lista = borradores ?? [];

  if (!cargando && !perfil) {
    return (
      <Screen header={<EncabezadoAlta paso={3} />}>
        <Note tone="warning">Primero crea tu perfil de prestador.</Note>
        <Button onPress={() => router.replace('/alta/datos')}>Ir a tus datos</Button>
      </Screen>
    );
  }

  function alternarCategoria(id: number) {
    if (elegidas.includes(id)) {
      setElegidas(elegidas.filter((c) => c !== id));
      setBorradores(lista.filter((b) => b.category_id !== id));
    } else {
      setElegidas([...elegidas, id]);
      setBorradores([...lista, { key: nuevaClave(), category_id: id, title: 'Visita de diagnóstico', price_type: 'fixed', precio: '' }]);
    }
  }

  const cambiar = (key: string, cambio: Partial<Borrador>) => {
    setBorradores(lista.map((b) => (b.key === key ? { ...b, ...cambio } : b)));
    setErrores((e) => ({ ...e, [key]: '' }));
  };

  function validar(): boolean {
    const e: Record<string, string> = {};
    for (const b of lista) {
      if (!b.title.trim()) e[b.key] = 'Escribe el nombre del servicio';
      else if (b.price_type !== 'quote' && !(Number(b.precio) > 0)) e[b.key] = 'Escribe el precio en pesos';
    }
    setErrores(e);
    if (lista.length === 0) setError('Elige al menos un oficio y escribe su precio.');
    return lista.length > 0 && Object.keys(e).length === 0;
  }

  async function continuar() {
    if (!uid || !validar()) return;
    setGuardando(true);
    setError(null);
    try {
      const fila = (b: Borrador) => ({
        provider_id: uid,
        category_id: b.category_id,
        title: b.title.trim(),
        price_type: b.price_type,
        price_mxn: b.price_type === 'quote' ? null : Number(b.precio),
        is_active: true,
      });
      // Quitados: se borran; si ya tienen solicitudes ligadas, la base no deja y se desactivan.
      const quitados = servicios.filter((s) => !lista.some((b) => b.id === s.id)).map((s) => s.id);
      if (quitados.length) {
        const del = await supabase.from('provider_services').delete().in('id', quitados);
        if (del.error) {
          const off = await supabase.from('provider_services').update({ is_active: false }).in('id', quitados);
          if (off.error) throw off.error;
        }
      }
      for (const b of lista.filter((x) => x.id)) {
        const { error } = await supabase.from('provider_services').update(fila(b)).eq('id', b.id!);
        if (error) throw error;
      }
      const nuevos = lista.filter((x) => !x.id).map(fila);
      if (nuevos.length) {
        const { error } = await supabase.from('provider_services').insert(nuevos);
        if (error) throw error;
      }
      if (editando) router.back();
      else router.push('/alta/zona');
    } catch {
      setError('No pudimos guardar tus servicios. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Screen
      header={<EncabezadoAlta paso={3} editando={editando} titulo="Servicios y precios" />}
      footer={
        <BottomBar>
          <Button onPress={continuar} loading={guardando} disabled={cargando}>{editando ? 'Guardar' : 'Continuar'}</Button>
        </BottomBar>
      }
    >
      <Title subtitle="Puedes ofrecer varios oficios. El precio es tu punto de partida; siempre puedes cotizar distinto.">
        ¿Qué servicios ofreces y a qué precio?
      </Title>
      {error ? <Note tone="error">{error}</Note> : null}

      <View className="flex-row flex-wrap gap-2">
        {categorias.map((c) => (
          <Chip key={c.id} selected={elegidas.includes(c.id)} onPress={() => alternarCategoria(c.id)}>{c.name}</Chip>
        ))}
      </View>

      {lista.map((b, i) => (
        <View key={b.key} className="gap-3 rounded-2xl border border-border bg-card p-4" testID={`servicio-${i}`}>
          <View className="flex-row items-center justify-between">
            <Badge tone="primary">{nombreCat.get(b.category_id) ?? ''}</Badge>
            <Pressable onPress={() => setBorradores(lista.filter((x) => x.key !== b.key))} hitSlop={10} accessibilityLabel="Quitar servicio">
              <X size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
          {elegidas.length > 1 ? (
            <View className="flex-row flex-wrap gap-2">
              {elegidas.map((id) => (
                <Chip key={id} selected={b.category_id === id} onPress={() => cambiar(b.key, { category_id: id })}>{nombreCat.get(id) ?? ''}</Chip>
              ))}
            </View>
          ) : null}
          <TextField label="Servicio" value={b.title} onChangeText={(t) => cambiar(b.key, { title: t })}
            placeholder="Visita de diagnóstico" testID={`servicio-${i}-nombre`} />
          <SegmentedControl options={TIPOS} value={b.price_type} onChange={(v) => cambiar(b.key, { price_type: v })} />
          {b.price_type === 'quote' ? (
            <Text className="font-sans text-sm text-muted-foreground">Darás el precio después de ver el trabajo.</Text>
          ) : (
            <TextField
              label={b.price_type === 'hourly' ? 'Precio por hora' : 'Precio'}
              prefix="$"
              value={b.precio}
              onChangeText={(t) => cambiar(b.key, { precio: t.replace(/[^\d]/g, '').slice(0, 6) })}
              keyboardType="number-pad"
              placeholder="350"
              hint="Pesos mexicanos (MXN)"
              testID={`servicio-${i}-precio`}
            />
          )}
          {errores[b.key] ? <Text className="font-sans-medium text-xs text-danger">{errores[b.key]}</Text> : null}
        </View>
      ))}

      <Button size="sm" variant="secondary" icon={Plus} disabled={elegidas.length === 0}
        onPress={() => setBorradores([...lista, { key: nuevaClave(), category_id: elegidas[0], title: '', price_type: 'fixed', precio: '' }])}>
        Agregar otro servicio
      </Button>

      <View className="gap-2 pt-2">
        <Text className="font-display text-lg text-foreground">
          Certificaciones y estudios <Text className="font-sans text-sm text-muted-foreground"> (opcional)</Text>
        </Text>
        <Text className="font-sans text-sm text-muted-foreground">
          Aparecen en tu perfil para que los clientes los vean. Los revisamos antes de publicarlos.
        </Text>
      </View>
      {credenciales.length ? (
        <ListGroup>
          {credenciales.map((c, i) => (
            <UploadRow
              key={c.id}
              title={c.institution ? `${c.title} · ${c.institution}` : c.title}
              detail={[c.year, c.status === 'verified' ? 'Revisada por Oficio' : 'En revisión'].filter(Boolean).join(' · ')}
              estado={c.status === 'verified' ? 'subido' : 'revision'}
              last={i === credenciales.length - 1}
              onPress={() => router.push({ pathname: '/alta/certificado', params: { id: c.id } })}
            />
          ))}
        </ListGroup>
      ) : null}
      <Button size="sm" variant="secondary" icon={Plus} onPress={() => router.push('/alta/certificado')}>
        Agregar certificado o título
      </Button>
    </Screen>
  );
}
