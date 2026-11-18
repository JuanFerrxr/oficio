import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { CalendarDays, Clock, CreditCard, MapPin, MessageSquare, Phone, Star } from 'lucide-react-native';
import { AppBar, Avatar, Badge, BottomBar, Button, Note, Screen } from '@/components/ui';
import { FotoAmpliada } from '@/components/FotoAmpliada';
import {
  FRANJAS, ORDEN_PAGOS, PAGO_DETALLE, URGENCIAS, diaRelativo, hace, hora, isoDe, pesos, precio, primerNombre,
} from '@/features/cliente/formato';
import { cuentaRegresiva, motivo, tarjetaPrestador, telefonoLegible, vencida, type Entrada } from '@/features/prestador/bandeja';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

// B4 · Detalle de una solicitud (prestador). Todo lo que mandó el cliente: descripción completa,
// todas las fotos y el video, días, horario, urgencia y forma de pago; la dirección y el teléfono
// solo con la cita confirmada. Desde aquí se cotiza, se rechaza o se inicia el trabajo.
type Medio = { kind: 'image' | 'video'; storage_path: string; duration_s: number | null; url?: string };
type Evento = { id: number; from_status: string | null; to_status: string; note: string | null; created_at: string };

const BADGE_TONO = { primary: 'primary', warning: 'warning', success: 'success', danger: 'danger' } as const;

export default function DetalleSolicitud() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [e, setE] = useState<Entrada | null | undefined>(undefined);
  const [medios, setMedios] = useState<Medio[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [foto, setFoto] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [b, m, ev] = await Promise.all([
      supabase.rpc('bandeja_prestador'),
      supabase.from('request_media').select('kind, storage_path, duration_s, sort_order').eq('request_id', id).order('sort_order'),
      supabase.from('request_events').select('id, from_status, to_status, note, created_at').eq('request_id', id).order('id'),
    ]);
    const x = (b.data ?? []).find((r) => r.id === id) ?? null;
    setE(x);
    setEventos((ev.data ?? []) as Evento[]);
    const lista = (m.data ?? []) as Medio[];
    if (lista.length) {
      // El bucket request-media es privado: URLs firmadas por 1 hora
      const { data: urls } = await supabase.storage.from('request-media').createSignedUrls(lista.map((x) => x.storage_path), 3600);
      setMedios(lista.map((x, i) => ({ ...x, url: urls?.[i]?.signedUrl ?? undefined })));
    } else setMedios([]);
    // Abrir el detalle cuenta como "la vio"
    // (el .then hace que la llamada salga: las consultas de supabase-js no corren hasta esperarlas)
    if (x && x.status === 'pending' && !x.viewed_at) {
      const { error } = await supabase.rpc('mark_request_viewed', { p_request_id: x.id });
      if (!error) setE({ ...x, viewed_at: new Date().toISOString() });
    }
  }, [id]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  if (e === undefined) return <Screen header={<AppBar title="Solicitud" />}><View className="items-center py-10"><ActivityIndicator color={colors.primary} /></View></Screen>;
  if (e === null) return <Screen header={<AppBar title="Solicitud" />}><Note tone="warning">No encontramos esta solicitud.</Note></Screen>;

  const nombre = primerNombre(e.cliente);
  const t = tarjetaPrestador(e);
  const fotos = medios.filter((m) => m.kind === 'image' && m.url);
  const video = medios.find((m) => m.kind === 'video' && m.url);
  const nueva = e.status === 'pending' && !vencida(e);
  const urgencia = URGENCIAS.find((u) => u.value === e.urgency);
  const [monto, detallePrecio] = precio(e.precio_tipo, e.precio_perfil);
  const pagos = ORDEN_PAGOS.filter((p) => e.formas_pago?.includes(p));
  const conDatos = e.status === 'scheduled' || e.status === 'in_progress' || e.status === 'completed';
  const cotizacion = eventos.find((x) => x.to_status === 'accepted');

  async function iniciar() {
    setEnviando(true);
    setError(null);
    const { error } = await supabase.rpc('transition_request', { p_request_id: e!.id, p_to: 'in_progress' });
    setEnviando(false);
    if (error) setError('No se pudo marcar. Intenta de nuevo.');
    else cargar();
  }

  const footer = nueva ? (
    <BottomBar>
      <View className="flex-row gap-3">
        <View className="flex-1"><Button variant="secondary" onPress={() => router.push({ pathname: '/bandeja/rechazar/[id]', params: { id: e.id } })}>Rechazar</Button></View>
        <View className="flex-1"><Button onPress={() => router.push({ pathname: '/bandeja/cotizar/[id]', params: { id: e.id } })}>Aceptar y cotizar</Button></View>
      </View>
    </BottomBar>
  ) : e.status === 'scheduled' ? (
    <BottomBar><Button onPress={iniciar} loading={enviando}>Iniciar trabajo</Button></BottomBar>
  ) : undefined;

  return (
    <Screen header={<AppBar title={`Solicitud de ${nombre}`} />} footer={footer}>
      {/* Estado */}
      <View className="flex-row flex-wrap items-center gap-2">
        <Badge tone={BADGE_TONO[estadoTono(t.estado)]}>{etiquetaEstado(t.estado)}</Badge>
        {nueva ? <Badge tone="danger" icon={Clock}>{cuentaRegresiva(e.expires_at)}</Badge> : null}
        <Text className="font-sans text-xs text-muted-foreground">{`Recibida ${hace(e.created_at)}`}</Text>
      </View>

      {/* Servicio y cliente */}
      <View className="gap-1">
        <Text className="font-display text-2xl text-foreground">{e.servicio ?? e.categoria}</Text>
        <Text className="font-sans text-sm text-muted-foreground">
          {e.precio_tipo === 'quote' ? 'En tu perfil: cotizas' : `En tu perfil: ${monto}${detallePrecio ? ` ${detallePrecio}` : ''}`}
        </Text>
      </View>
      <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <Avatar name={e.cliente} id={e.client_id} uri={e.cliente_avatar} size="lg" />
        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-1">
            <Text className="font-sans-bold text-base text-foreground">{e.cliente}</Text>
            {e.cliente_calificacion != null ? (
              <>
                <Star size={13} color={colors.accent} fill={colors.accent} />
                <Text className="font-sans-semibold text-sm text-foreground">{Number(e.cliente_calificacion).toFixed(1)}</Text>
              </>
            ) : null}
          </View>
          <Text className="font-sans text-sm text-muted-foreground">
            {[e.colonia ? `Col. ${e.colonia}` : null, e.distancia_km != null ? `a ${Number(e.distancia_km).toFixed(1)} km de tu base` : null].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>

      {/* Lo que necesita */}
      <Seccion titulo="Lo que necesita">
        <Text className="font-sans text-base leading-6 text-foreground" testID="descripcion-completa">{e.description}</Text>
      </Seccion>

      {/* Fotos y video */}
      <Seccion titulo={fotos.length || video ? `Fotos y video · ${fotos.length + (video ? 1 : 0)}` : 'Fotos y video'}>
        {!fotos.length && !video ? <Text className="font-sans text-sm text-muted-foreground">{`${nombre} no mandó fotos ni video.`}</Text> : null}
        {fotos.length ? (
          <View className="flex-row flex-wrap gap-2" testID="galeria">
            {fotos.map((f) => (
              <Pressable key={f.storage_path} onPress={() => setFoto(f.url!)} accessibilityLabel="Ver foto" className="w-[31.5%]">
                <Image source={{ uri: f.url }} className="aspect-square w-full rounded-xl bg-border" />
              </Pressable>
            ))}
          </View>
        ) : null}
        {video ? <Reproductor uri={video.url!} segundos={video.duration_s} /> : null}
      </Seccion>

      {/* Cuándo */}
      <Seccion titulo="Cuándo">
        <Fila icono={CalendarDays} texto={[...(e.preferred_dates ?? [])].sort().map((d) => diaRelativo(d)).join(', ') || 'Sin días preferidos'} />
        <Fila icono={Clock} texto={FRANJAS.filter((f) => e.time_windows?.includes(f.value)).map((f) => f.label).join(' · ') || 'Cualquier hora'} />
        {urgencia ? <Text className={`font-sans-semibold text-sm ${e.urgency === 'urgent' ? 'text-danger' : 'text-muted-foreground'}`}>{urgencia.label}</Text> : null}
      </Seccion>

      {/* Pago */}
      <Seccion titulo="Cómo prefiere pagar">
        <Fila icono={CreditCard} texto={pagos.map((p) => PAGO_DETALLE[p].titulo).join(' · ') || 'Lo acuerdan al cotizar'} />
      </Seccion>

      {/* Dónde */}
      <Seccion titulo="Dónde">
        {conDatos && e.direccion ? <Fila icono={MapPin} texto={e.direccion} /> : (
          <Fila icono={MapPin} texto={`${e.colonia ? `Col. ${e.colonia}` : 'Su colonia'}. Verás la calle y su teléfono cuando ${nombre} confirme la cita.`} />
        )}
        {e.telefono ? (
          <Pressable onPress={() => Linking.openURL(`tel:+${e.telefono}`)} className="flex-row items-center gap-2" accessibilityRole="link">
            <Phone size={16} color={colors.primary} />
            <Text className="font-sans-semibold text-sm text-primary">{`Llamar · ${telefonoLegible(e.telefono)}`}</Text>
          </Pressable>
        ) : null}
      </Seccion>

      {/* Tu respuesta */}
      {e.quoted_price_mxn != null ? (
        <Seccion titulo="Tu cotización">
          <Text className="font-sans-semibold text-base text-foreground">
            {[pesos(e.quoted_price_mxn), e.scheduled_at ? `${diaRelativo(isoDe(e.scheduled_at))} · ${hora(e.scheduled_at)}` : null].filter(Boolean).join(' · ')}
          </Text>
          {cotizacion?.note ? <Fila icono={MessageSquare} texto={`“${cotizacion.note}”`} /> : null}
          {e.final_price_mxn != null ? <Text className="font-sans text-sm text-muted-foreground">{`Al final cobraste ${pesos(e.final_price_mxn)}`}</Text> : null}
        </Seccion>
      ) : null}
      {e.status === 'declined' ? (
        <Note tone="warning">{`La rechazaste${motivo(e.decline_reason) ? `: ${motivo(e.decline_reason)!.yo}` : ''}.`}</Note>
      ) : null}
      {e.status === 'in_progress' ? <Note>{`Cuando termines, ${nombre} lo marca como terminado y puede calificarte.`}</Note> : null}

      {/* Historial */}
      <Seccion titulo="Historial">
        <Paso texto={`${nombre} la envió`} cuando={e.created_at} />
        {e.viewed_at ? <Paso texto="La abriste" cuando={e.viewed_at} /> : null}
        {eventos.map((x) => <Paso key={x.id} texto={textoEvento(x, nombre)} cuando={x.created_at} />)}
        {vencida(e) ? <Paso texto="Expiró sin respuesta" cuando={e.expires_at} /> : null}
      </Seccion>

      {error ? <Note tone="error">{error}</Note> : null}
      <FotoAmpliada url={foto} onClose={() => setFoto(null)} />
    </Screen>
  );
}

function Reproductor({ uri, segundos }: { uri: string; segundos: number | null }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = false; });
  useEffect(() => () => { try { player.pause(); } catch { /* ya liberado */ } }, [player]);
  return (
    <View className="gap-1" testID="video">
      <View className="h-[320px] w-full overflow-hidden rounded-xl bg-foreground">
        <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" nativeControls />
      </View>
      <Text className="font-sans text-xs text-muted-foreground">{`Video${segundos ? ` · ${segundos} s` : ''} · toca para reproducir`}</Text>
    </View>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="font-sans-bold text-sm text-muted-foreground">{titulo}</Text>
      {children}
    </View>
  );
}
function Fila({ icono: Icono, texto }: { icono: typeof MapPin; texto: string }) {
  return (
    <View className="flex-row items-start gap-2">
      <Icono size={16} color={colors.mutedForeground} />
      <Text className="flex-1 font-sans text-sm text-foreground">{texto}</Text>
    </View>
  );
}
function Paso({ texto, cuando }: { texto: string; cuando: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-2 w-2 rounded-full bg-primary" />
      <Text className="flex-1 font-sans text-sm text-foreground">{texto}</Text>
      <Text className="font-sans text-xs text-muted-foreground">{`${diaRelativo(isoDe(cuando))} · ${hora(cuando)}`}</Text>
    </View>
  );
}

function textoEvento(x: Evento, nombre: string) {
  switch (x.to_status) {
    case 'accepted': return 'Enviaste tu cotización';
    case 'declined': return 'La rechazaste';
    case 'scheduled': return `${nombre} confirmó la cita`;
    case 'in_progress': return 'Iniciaste el trabajo';
    case 'completed': return `${nombre} marcó el trabajo como terminado`;
    case 'cancelled': return 'Se canceló';
    case 'expired': return 'Expiró sin respuesta';
    default: return x.to_status;
  }
}

const ESTADOS: Record<string, [string, 'primary' | 'warning' | 'success' | 'danger']> = {
  enviada: ['Nueva', 'primary'], vista: ['Nueva', 'primary'], cotizada: ['Cotizada', 'primary'], aceptada: ['Aceptada', 'success'],
  confirmada: ['Confirmada', 'success'], trabajando: ['En curso', 'warning'], completada: ['Completada', 'success'],
  rechazada: ['Rechazada', 'danger'], expirada: ['Expirada', 'danger'], cancelada: ['Cancelada', 'danger'],
};
const etiquetaEstado = (e: string) => ESTADOS[e]?.[0] ?? e;
const estadoTono = (e: string) => ESTADOS[e]?.[1] ?? 'primary';
