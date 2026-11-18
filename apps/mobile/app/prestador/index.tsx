import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronRight, Clock, MapPin, Phone, Play, Star } from 'lucide-react-native';
import { Avatar, Badge, Button, Note, Screen, SegmentedControl, Toggle } from '@/components/ui';
import { FotoAmpliada } from '@/components/FotoAmpliada';
import { RequestCard } from '@/components/cliente/RequestCard';
import { EstadoAlta } from '@/components/prestador/EstadoAlta';
import { useSession } from '@/features/auth/session';
import { detalleCuando } from '@/features/cliente/solicitudes';
import { diaLargo, diaRelativo, hace, isoDe, isoEnDias, mesDe, pesos } from '@/features/cliente/formato';
import { useAlta } from '@/features/prestador/alta';
import {
  cuentaRegresiva, pestana as pestanaDe, telefonoLegible, vencida, tarjetaPrestador, useBandeja, useFotosSolicitud, type Entrada, type Pestana,
} from '@/features/prestador/bandeja';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

// B4 · Solicitudes del prestador: Nuevas (con el contador de 2 horas), Activas (B4.1) e
// Historial (B4.2). Arriba, el interruptor Disponible. Mientras el alta no esté aprobada,
// solo se ve la tarjeta del Sprint 2 ("Termina tu alta" o "En revisión").
export default function Bandeja() {
  const { session } = useSession();
  const { perfil, faltantes, cargando: cargandoAlta } = useAlta();
  const { entradas, cargando, error, ahora, recargar, refrescar, refrescando } = useBandeja();
  const [pestana, setPestana] = useState<Pestana>('nuevas');
  const [disponible, setDisponible] = useState(true);
  const [foto, setFoto] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const params = useLocalSearchParams<{ aviso?: string; pestana?: Pestana }>();

  // Al volver de cotizar o rechazar: aviso y pestaña
  useEffect(() => {
    if (!params.aviso) return;
    setAviso(params.aviso);
    if (params.pestana) setPestana(params.pestana);
    router.setParams({ aviso: undefined, pestana: undefined });
  }, [params.aviso, params.pestana]);

  useEffect(() => { if (perfil) setDisponible(perfil.is_available); }, [perfil]);

  const verificado = perfil?.verification_status === 'verified';

  async function cambiarDisponible(v: boolean) {
    if (!session) return;
    setDisponible(v);
    const { error } = await supabase.from('provider_profiles').update({ is_available: v }).eq('user_id', session.user.id);
    if (error) setDisponible(!v);
  }

  const por = useMemo(() => {
    const g: Record<Pestana, Entrada[]> = { nuevas: [], activas: [], historial: [] };
    for (const e of entradas) g[pestanaDe(e, ahora)].push(e);
    // Las nuevas, la que vence primero arriba
    g.nuevas.sort((a, b) => a.expires_at.localeCompare(b.expires_at));
    return g;
  }, [entradas, ahora]);

  const encabezado = (
    <View className="h-[52px] flex-row items-center justify-between px-5">
      <Text className="font-display text-lg text-foreground">Solicitudes</Text>
      {verificado ? (
        <View className="flex-row items-center gap-2">
          <Text className="font-sans-semibold text-sm text-foreground">{disponible ? 'Disponible' : 'No disponible'}</Text>
          <Toggle value={disponible} onChange={cambiarDisponible} label="Disponible" testID="disponible" />
        </View>
      ) : null}
    </View>
  );

  if (cargandoAlta) return <Screen header={encabezado}><View className="items-center py-10"><ActivityIndicator color={colors.primary} /></View></Screen>;
  if (!verificado) return <Screen header={encabezado}><EstadoAlta perfil={perfil} faltantes={faltantes} /></Screen>;

  const opciones = [
    { value: 'nuevas', label: `Nuevas${por.nuevas.length ? ` · ${por.nuevas.length}` : ''}` },
    { value: 'activas', label: `Activas${por.activas.length ? ` · ${por.activas.length}` : ''}` },
    { value: 'historial', label: 'Historial' },
  ] as const;

  return (
    <Screen header={encabezado} onRefresh={refrescar} refreshing={refrescando}>
      <SegmentedControl options={opciones} value={pestana} onChange={setPestana} />
      {aviso ? <Note tone="privacy">{aviso}</Note> : null}
      {!disponible ? <Note tone="warning">Estás como no disponible: no apareces en las búsquedas ni te llegan solicitudes nuevas.</Note> : null}
      {error ? <Note tone="error">No pudimos cargar tus solicitudes. Revisa tu conexión.</Note> : null}
      {cargando ? <View className="items-center py-8"><ActivityIndicator color={colors.primary} /></View> : null}

      {!cargando && pestana === 'nuevas' ? <Nuevas lista={por.nuevas} ahora={ahora} onFoto={setFoto} recargar={recargar} /> : null}
      {!cargando && pestana === 'activas' ? <Activas lista={por.activas} recargar={recargar} /> : null}
      {!cargando && pestana === 'historial' ? <Historial lista={por.historial} perfil={perfil} ahora={ahora} /> : null}

      <FotoAmpliada url={foto} onClose={() => setFoto(null)} />
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Nuevas: la que vence primero se ve completa (y cuenta como vista: el cliente ve "Vista");
// las demás en una fila. Tocar una fila o "Ver detalle" abre el detalle con fotos y video.
// ---------------------------------------------------------------------------
function Nuevas({ lista, ahora, onFoto, recargar }: { lista: Entrada[]; ahora: number; onFoto: (u: string) => void; recargar: () => void }) {
  const actual = lista[0];

  useEffect(() => {
    if (actual && !actual.viewed_at) {
      supabase.rpc('mark_request_viewed', { p_request_id: actual.id }).then(() => recargar());
    }
  }, [actual?.id, actual?.viewed_at, recargar]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!lista.length) return <Vacio texto="No tienes solicitudes nuevas. Te avisaremos cuando llegue una." />;
  return (
    <>
      <NuevaCompleta e={actual} ahora={ahora} onFoto={onFoto} />
      {lista.filter((e) => e.id !== actual.id).map((e) => (
        <Pressable key={e.id} onPress={() => abrirDetalle(e.id)} accessibilityRole="button" testID="nueva-compacta"
          className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4 active:opacity-90">
          <Avatar name={e.cliente} id={e.client_id} uri={e.cliente_avatar} />
          <View className="flex-1 gap-0.5">
            <Text className="font-sans-bold text-sm text-foreground">{e.servicio ?? e.categoria}</Text>
            <Text className="font-sans text-xs text-muted-foreground">
              {[e.cliente, e.distancia_km != null ? `${Number(e.distancia_km).toFixed(1)} km` : null, detalleCuando(e).split(' · ')[0], hace(e.created_at)].filter(Boolean).join(' · ')}
            </Text>
            <Text numberOfLines={1} className="font-sans text-xs italic text-muted-foreground">{`“${e.description}”`}</Text>
          </View>
          <Text className="font-sans-semibold text-xs text-danger">{cuentaRegresiva(e.expires_at, ahora).replace('Responde en ', '')}</Text>
          <ChevronRight size={18} color={colors.mutedForeground} />
        </Pressable>
      ))}
    </>
  );
}

function NuevaCompleta({ e, ahora, onFoto }: { e: Entrada; ahora: number; onFoto: (u: string) => void }) {
  const fotos = useFotosSolicitud(e.fotos);
  return (
    <View className="gap-3 rounded-2xl border border-border bg-card p-4" testID="nueva-completa">
      <View className="flex-row items-center justify-between gap-2">
        <Badge tone="danger" icon={Clock}>{cuentaRegresiva(e.expires_at, ahora)}</Badge>
        <Text className="font-sans text-xs text-muted-foreground">{hace(e.created_at)}</Text>
      </View>
      <Text className="font-display text-lg text-foreground">{e.servicio ?? e.categoria}</Text>
      <View className="flex-row items-center gap-2">
        <Avatar name={e.cliente} id={e.client_id} uri={e.cliente_avatar} />
        <View className="flex-1 flex-row flex-wrap items-center">
          <Text className="font-sans-semibold text-sm text-foreground">{e.cliente}</Text>
          {e.cliente_calificacion != null ? (
            <View className="ml-1 flex-row items-center gap-0.5">
              <Star size={12} color={colors.accent} fill={colors.accent} />
              <Text className="font-sans-semibold text-sm text-foreground">{Number(e.cliente_calificacion).toFixed(1)}</Text>
            </View>
          ) : null}
          <Text className="font-sans text-sm text-muted-foreground">
            {[e.colonia ? ` · Col. ${e.colonia}` : '', e.distancia_km != null ? ` · ${Number(e.distancia_km).toFixed(1)} km` : ''].join('')}
          </Text>
        </View>
      </View>
      <Text className="font-sans text-sm text-foreground">{`“${e.description}”`}</Text>
      {fotos.length || e.video ? (
        <View className="flex-row flex-wrap gap-2">
          {fotos.slice(0, 4).map((u) => (
            <Pressable key={u} onPress={() => onFoto(u)} accessibilityLabel="Ver foto">
              <Image source={{ uri: u }} className="h-16 w-16 rounded-xl bg-border" />
            </Pressable>
          ))}
          {e.video ? (
            <Pressable onPress={() => abrirDetalle(e.id)} accessibilityLabel="Ver video" className="h-16 w-16 items-center justify-center rounded-xl bg-foreground">
              <Play size={22} color="#FFFFFF" fill="#FFFFFF" />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <Text className="font-sans-semibold text-sm text-foreground">{detalleCuando(e)}</Text>
      {e.urgency === 'urgent' ? <Text className="font-sans-semibold text-xs text-danger">Urgente: lo necesita hoy</Text> : null}
      <Pressable onPress={() => abrirDetalle(e.id)} hitSlop={8} className="flex-row items-center gap-1 self-start" accessibilityRole="link">
        <Text className="font-sans-semibold text-sm text-primary">{e.video ? 'Ver detalle, fotos y video' : 'Ver detalle completo'}</Text>
        <ChevronRight size={16} color={colors.primary} />
      </Pressable>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button size="sm" variant="secondary" onPress={() => router.push({ pathname: '/bandeja/rechazar/[id]', params: { id: e.id } })}>Rechazar</Button>
        </View>
        <View className="flex-1">
          <Button size="sm" onPress={() => router.push({ pathname: '/bandeja/cotizar/[id]', params: { id: e.id } })}>Aceptar y cotizar</Button>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// B4.1 · Activas: hoy (o atrasadas), esperando que el cliente confirme y próximos días
// ---------------------------------------------------------------------------
function Activas({ lista, recargar }: { lista: Entrada[]; recargar: () => void }) {
  const hoy = isoEnDias(0);
  const dia = (e: Entrada) => (e.scheduled_at ? isoDe(e.scheduled_at) : hoy);
  const confirmadas = lista.filter((e) => e.status !== 'accepted').sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''));
  const deHoy = confirmadas.filter((e) => dia(e) <= hoy);
  const proximas = confirmadas.filter((e) => dia(e) > hoy);
  const esperando = lista.filter((e) => e.status === 'accepted');

  if (!lista.length) return <Vacio texto="Aquí verás las solicitudes que cotizaste y las citas confirmadas." />;
  return (
    <>
      {deHoy.length ? <Titulo>{`Hoy · ${diaLargo(hoy)}`}</Titulo> : null}
      {deHoy.map((e) => <Activa key={e.id} e={e} recargar={recargar} />)}
      {esperando.length ? <Titulo>Esperando que el cliente confirme</Titulo> : null}
      {esperando.map((e) => <Activa key={e.id} e={e} recargar={recargar} />)}
      {proximas.length ? <Titulo>Próximos días</Titulo> : null}
      {proximas.map((e) => <Activa key={e.id} e={e} recargar={recargar} />)}
    </>
  );
}

function Activa({ e, recargar }: { e: Entrada; recargar: () => void }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function iniciar() {
    setEnviando(true);
    setError(null);
    const { error } = await supabase.rpc('transition_request', { p_request_id: e.id, p_to: 'in_progress' });
    setEnviando(false);
    if (error) setError('No se pudo marcar. Intenta de nuevo.');
    else recargar();
  }

  return (
    <RequestCard {...tarjetaPrestador(e)} onPress={() => abrirDetalle(e.id)}>
      {e.status === 'scheduled' || e.status === 'in_progress' ? (
        <View className="gap-2 border-t border-border pt-3">
          {e.direccion ? (
            <View className="flex-row items-start gap-2">
              <MapPin size={16} color={colors.mutedForeground} />
              <Text className="flex-1 font-sans text-sm text-foreground">{e.direccion}</Text>
            </View>
          ) : null}
          {e.telefono ? (
            <Pressable onPress={() => Linking.openURL(`tel:+${e.telefono}`)} className="flex-row items-center gap-2" accessibilityRole="link">
              <Phone size={16} color={colors.primary} />
              <Text className="font-sans-semibold text-sm text-primary">{telefonoLegible(e.telefono)}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {e.status === 'scheduled' ? <Button size="sm" onPress={iniciar} loading={enviando}>Iniciar trabajo</Button> : null}
      {e.status === 'in_progress' ? <Text className="font-sans text-xs text-muted-foreground">Cuando termines, el cliente lo marca como terminado y puede calificarte.</Text> : null}
      {error ? <Text className="font-sans text-sm text-danger">{error}</Text> : null}
    </RequestCard>
  );
}

// ---------------------------------------------------------------------------
// B4.2 · Historial: números del mes y las solicitudes por mes
// ---------------------------------------------------------------------------
function Historial({ lista, perfil, ahora }: { lista: Entrada[]; perfil: { rating_avg: number; rating_count: number } | null; ahora: number }) {
  const mesActual = mesDe(new Date(ahora).toISOString());
  const delMes = lista.filter((e) => e.status === 'completed' && mesDe(e.scheduled_at ?? e.updated_at) === mesActual).length;
  // Respondidas a tiempo: de las que recibió (sin contar las que todavía puede responder)
  const recibidas = lista.filter((e) => e.respondida_at || vencida(e, ahora));
  const aTiempo = recibidas.filter((e) => e.respondida_at && e.respondida_at <= e.expires_at).length;
  const porcentaje = recibidas.length ? `${Math.round((aTiempo / recibidas.length) * 100)}%` : '—';

  const grupos = lista.reduce<Record<string, Entrada[]>>((acc, e) => {
    (acc[mesDe(e.scheduled_at ?? e.updated_at)] ??= []).push(e);
    return acc;
  }, {});

  return (
    <>
      <View className="flex-row rounded-2xl border border-border bg-card py-3" testID="numeros-mes">
        {[
          { valor: String(delMes), texto: `trabajos en ${mesActual.split(' ')[0].toLowerCase()}` },
          { valor: perfil?.rating_count ? `${Number(perfil.rating_avg).toFixed(1)} ★` : '—', texto: 'calificación' },
          { valor: porcentaje, texto: 'respondidas a tiempo' },
        ].map((s, i) => (
          <View key={s.texto} className={`flex-1 items-center gap-0.5 px-1 ${i ? 'border-l border-border' : ''}`}>
            <Text className="font-display text-lg text-foreground">{s.valor}</Text>
            <Text className="text-center font-sans text-xs text-muted-foreground">{s.texto}</Text>
          </View>
        ))}
      </View>
      {lista.length ? Object.entries(grupos).map(([mes, xs]) => (
        <View key={mes} className="gap-3">
          <Titulo>{mes}</Titulo>
          {xs.map((e) => <RequestCard key={e.id} {...tarjetaPrestador(e)} onPress={() => abrirDetalle(e.id)} detalle={(e.scheduled_at || e.preferred_dates?.length) ? detalleCuando(e) : diaRelativo(isoDe(e.created_at))} />)}
        </View>
      )) : <Vacio texto="Aquí verás los trabajos terminados, las rechazadas y las canceladas." />}
      {lista.some((e) => e.status === 'completed') ? (
        <Text className="text-center font-sans text-xs text-muted-foreground">
          {`Llevas ${lista.filter((e) => e.status === 'completed').length} trabajos en Oficio por ${pesos(lista.filter((e) => e.status === 'completed').reduce((s, e) => s + Number(e.final_price_mxn ?? e.quoted_price_mxn ?? 0), 0))}.`}
        </Text>
      ) : null}
    </>
  );
}

const abrirDetalle = (id: string) => router.push({ pathname: '/bandeja/[id]', params: { id } });

function Titulo({ children }: { children: string }) {
  return <Text className="font-sans-bold text-sm text-muted-foreground">{children}</Text>;
}
function Vacio({ texto }: { texto: string }) {
  return <Text className="py-6 text-center font-sans text-sm text-muted-foreground">{texto}</Text>;
}
