import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Award, ChevronLeft, Heart, ShieldCheck, Star } from 'lucide-react-native';
import { Avatar, Badge, BottomBar, Button, ListGroup, ListRow, Note, Screen, TextLink } from '@/components/ui';
import { useSession } from '@/features/auth/session';
import type { PerfilPublico } from '@/features/cliente/datos';
import { ORDEN_PAGOS, PAGO_DETALLE, precio, primerNombre } from '@/features/cliente/formato';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

// A5 · Perfil del prestador como lo ve un cliente. Sin teléfono ni ubicación exacta: el teléfono
// solo se comparte con la cita confirmada.
export default function PerfilDelPrestador() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const [p, setP] = useState<PerfilPublico | null | undefined>(undefined);
  const [favorito, setFavorito] = useState(false);

  useFocusEffect(useCallback(() => {
    supabase.rpc('perfil_prestador', { p_provider: id }).then(({ data }) => {
      const perfil = (data as PerfilPublico | null) ?? null;
      setP(perfil);
      setFavorito(!!perfil?.es_favorito);
    });
  }, [id]));

  async function alternarFavorito() {
    if (!session || !p) return;
    const nuevo = !favorito;
    setFavorito(nuevo);
    const r = nuevo
      ? await supabase.from('client_favorites').insert({ client_id: session.user.id, provider_id: p.id })
      : await supabase.from('client_favorites').delete().eq('client_id', session.user.id).eq('provider_id', p.id);
    if (r.error) setFavorito(!nuevo);
  }

  const encabezado = (
    <View className="h-[52px] flex-row items-center justify-between px-5">
      <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Regresar"><ChevronLeft size={24} color={colors.foreground} /></Pressable>
      {p && p.id !== session?.user.id ? (
        <Pressable onPress={alternarFavorito} hitSlop={12} accessibilityLabel={favorito ? 'Quitar de favoritos' : 'Agregar a favoritos'} testID="favorito">
          <Heart size={24} color={favorito ? colors.danger : colors.foreground} fill={favorito ? colors.danger : 'transparent'} />
        </Pressable>
      ) : null}
    </View>
  );

  if (p === undefined) return <Screen header={encabezado}><View className="items-center py-10"><ActivityIndicator color={colors.primary} /></View></Screen>;
  if (p === null) return <Screen header={encabezado}><Note tone="warning">Este prestador ya no está disponible.</Note></Screen>;

  const nombre = primerNombre(p.full_name);
  const subtitulo = [p.headline ?? p.oficios.join(' y '), p.years_experience != null ? `${p.years_experience} años de experiencia` : null].filter(Boolean).join(' · ');
  const pagos = ORDEN_PAGOS.filter((m) => p.payment_methods.includes(m));
  const esYo = p.id === session?.user.id;

  return (
    <Screen
      header={encabezado}
      footer={esYo ? undefined : (
        <BottomBar>
          <Button onPress={() => router.push({ pathname: '/cliente/solicitar/[id]', params: { id: p.id } })}>Solicitar servicio</Button>
        </BottomBar>
      )}
    >
      <View className="items-center gap-2">
        <Avatar name={p.full_name} id={p.id} uri={p.avatar_url} size="xl" />
        {p.verificado ? <View className="flex-row justify-center"><Badge tone="success" icon={ShieldCheck}>INE verificada</Badge></View> : null}
        <Text className="text-center font-display text-2xl text-foreground">{p.full_name}</Text>
        <Text className="text-center font-sans text-sm text-muted-foreground">{subtitulo}</Text>
      </View>

      {p.certificaciones.length ? (
        <View className="gap-2 rounded-2xl border border-border bg-card p-4">
          {p.certificaciones.map((c) => (
            <View key={c.title + c.year} className="flex-row items-start gap-2">
              <Award size={18} color={colors.primary} />
              <Text className="flex-1 font-sans-semibold text-sm text-foreground">{[c.title, c.institution].filter(Boolean).join(' · ')}</Text>
            </View>
          ))}
          <Text className="font-sans text-xs text-muted-foreground">Documentos revisados por Oficio</Text>
        </View>
      ) : null}

      <View className="flex-row rounded-2xl border border-border bg-card py-3">
        {[
          { valor: p.rating_count ? `${Number(p.rating_avg).toFixed(1)} ★` : 'Nuevo', texto: `${p.rating_count} reseñas` },
          { valor: String(p.jobs_completed), texto: 'trabajos' },
          { valor: p.avg_response_minutes ? `~${p.avg_response_minutes} min` : '—', texto: 'responde' },
        ].map((s, i) => (
          <View key={s.texto} className={`flex-1 items-center gap-0.5 ${i ? 'border-l border-border' : ''}`}>
            <Text className="font-display text-lg text-foreground">{s.valor}</Text>
            <Text className="font-sans text-xs text-muted-foreground">{s.texto}</Text>
          </View>
        ))}
      </View>

      {p.rating_count > 0 ? (
        <View className="gap-2">
          {p.resena ? (
            <>
              <View className="flex-row items-center gap-1">
                {Array.from({ length: p.resena.rating }).map((_, i) => <Star key={i} size={14} color={colors.accent} fill={colors.accent} />)}
              </View>
              <Text className="font-sans text-sm text-foreground">{`“${p.resena.comment}” · ${p.resena.autor || 'Cliente'}`}</Text>
            </>
          ) : null}
          <Text className="text-sm">
            <TextLink onPress={() => router.push({ pathname: '/cliente/resenas/[id]', params: { id: p.id } })}>
              {p.rating_count === 1 ? 'Ver la reseña' : `Ver las ${p.rating_count} reseñas`}
            </TextLink>
          </Text>
        </View>
      ) : null}

      <View className="gap-2">
        <Text className="font-display text-lg text-foreground">Servicios y precios</Text>
        <Text className="font-sans text-sm text-muted-foreground">{`Precios de referencia. ${nombre} confirma el precio final al aceptar tu solicitud.`}</Text>
        <ListGroup>
          {p.servicios.map((s, i) => {
            const [monto, detalle] = precio(s.price_type, s.price_mxn);
            return <ListRow key={s.id} title={s.title} value={detalle && s.price_type === 'hourly' ? `${monto} ${detalle}` : monto} chevron={false} last={i === p.servicios.length - 1} />;
          })}
        </ListGroup>
      </View>

      <View className="gap-2">
        <Text className="font-display text-lg text-foreground">Formas de pago</Text>
        <Text className="font-sans text-sm text-muted-foreground">{`Le pagas directamente a ${nombre}. Oficio no cobra ni retiene tu pago.`}</Text>
        <ListGroup>
          {pagos.map((m, i) => <ListRow key={m} title={PAGO_DETALLE[m].titulo} value={PAGO_DETALLE[m].detalle(nombre)} chevron={false} last={i === pagos.length - 1} />)}
        </ListGroup>
      </View>
    </Screen>
  );
}
