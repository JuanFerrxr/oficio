import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, ChevronRight, Clock, CreditCard, MapPin, MessageCircle, Phone, Star } from 'lucide-react-native';
import { AppBar, Avatar, Badge, BottomBar, Button, Note, Screen } from '@/components/ui';
import { Fila, PasoLinea, Seccion } from '@/components/solicitud/Bloques';
import { MediosSolicitud, tituloMedios, useMediosSolicitud } from '@/components/solicitud/MediosSolicitud';
import { useSession } from '@/features/auth/session';
import { MOTIVOS_CANCELACION, MOTIVOS_RECHAZO, FRANJAS, ORDEN_PAGOS, PAGO_DETALLE, URGENCIAS, diaRelativo, hora, isoDe, pesos, precio, primerNombre, type FormaPago } from '@/features/cliente/formato';
import { useSolicitudesEnVivo } from '@/lib/enVivo';
import { supabase } from '@/lib/supabase';
import { telefonoLegible } from '@/features/prestador/bandeja';
import { colors } from '@/theme/colors';

// A7 · Detalle y seguimiento (cliente). Estado, prestador (Mensaje / Llamar), línea de tiempo,
// lo que pidió con sus fotos y video, y lo que puede hacer según el estado: confirmar,
// cancelar (A7.1), marcar terminado o calificar. Se pone al día sola (tiempo real + 30 s).
type Evento = { to_status: string; note: string | null; created_at: string; por_mi: boolean };
export type Seguimiento = {
  id: string; status: string; provider_id: string; provider_name: string; provider_avatar: string | null; oficio: string;
  rating_avg: number; rating_count: number; avg_response_minutes: number | null; servicio: string;
  precio_tipo: 'fixed' | 'hourly' | 'quote' | null; precio_mxn: number | null; description: string; urgency: string;
  preferred_dates: string[]; time_windows: string[]; formas_pago: FormaPago[]; quoted_price_mxn: number | null;
  final_price_mxn: number | null; scheduled_at: string | null; viewed_at: string | null; expires_at: string; created_at: string;
  cancelled_by: string | null; cancel_reason: string | null; cancel_note: string | null; decline_reason: string | null;
  direccion: string | null; telefono: string | null; mi_calificacion: number | null; eventos: Evento[];
};

const ESTADO: Record<string, [string, 'primary' | 'warning' | 'success' | 'danger']> = {
  pending: ['Enviada', 'primary'], accepted: ['Por confirmar', 'primary'], scheduled: ['Programada', 'success'],
  in_progress: ['En curso', 'warning'], completed: ['Completada', 'success'], declined: ['Rechazada', 'danger'],
  cancelled: ['Cancelada', 'danger'], expired: ['Expirada', 'danger'],
};

export default function SeguimientoSolicitud() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const [s, setS] = useState<Seguimiento | null | undefined>(undefined);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const medios = useMediosSolicitud(id);

  const cargar = useCallback(async () => {
    const { data } = await supabase.rpc('seguimiento_solicitud', { p_request_id: id });
    setS((data as Seguimiento | null) ?? null);
  }, [id]);
  useSolicitudesEnVivo('client_id', session?.user.id, cargar);

  if (s === undefined) return <Screen header={<AppBar title="Solicitud" />}><View className="items-center py-10"><ActivityIndicator color={colors.primary} /></View></Screen>;
  if (s === null) return <Screen header={<AppBar title="Solicitud" />}><Note tone="warning">No encontramos esta solicitud.</Note></Screen>;

  const nombre = primerNombre(s.provider_name);
  const vencida = s.status === 'expired' || (s.status === 'pending' && new Date(s.expires_at).getTime() < Date.now());
  const status = vencida ? 'expired' : s.status;
  const [etiqueta, tono] = ESTADO[status] ?? [status, 'primary'];
  const cuando = (ts: string) => `${diaRelativo(isoDe(ts))} ${hora(ts)}`;
  const ev = (st: string) => s.eventos.find((e) => e.to_status === st);
  const acordado = s.final_price_mxn ?? s.quoted_price_mxn;
  const meta = s.scheduled_at && ['accepted', 'scheduled', 'in_progress', 'completed'].includes(status)
    ? `${cuando(s.scheduled_at)} · ${pesos(s.quoted_price_mxn)} ${status === 'accepted' ? 'cotizado' : 'acordado'}`
    : s.precio_tipo ? `${precio(s.precio_tipo, s.precio_mxn).join(' ').trim()} de referencia` : '';
  const sePuedeCancelar = ['pending', 'accepted', 'scheduled'].includes(status);

  async function mover(to: 'scheduled' | 'completed') {
    setEnviando(to);
    setError(null);
    const { error } = await supabase.rpc('transition_request', { p_request_id: s!.id, p_to: to });
    setEnviando(null);
    if (error) return setError('No se pudo guardar. Intenta de nuevo.');
    if (to === 'completed') return router.push({ pathname: '/cliente/calificar/[id]', params: { id: s!.id } });
    cargar();
  }

  // ---- Línea de tiempo (Figma: TimelineItem) ----
  type Paso = { titulo: string; detalle?: string; estado: 'hecho' | 'actual' | 'pendiente' | 'alerta' };
  const pasos: Paso[] = [{ titulo: 'Solicitud enviada', detalle: [hora(s.created_at), s.viewed_at ? `${nombre} la vio a las ${hora(s.viewed_at)}` : null].filter(Boolean).join(' · '), estado: 'hecho' }];
  const cancelada = status === 'cancelled';
  const textoCancelacion = () => {
    const m = MOTIVOS_CANCELACION.find((x) => x.value === s.cancel_reason);
    const quien = s.cancelled_by === session?.user.id ? 'Cancelaste la solicitud' : `${nombre} canceló la solicitud`;
    return { titulo: quien, detalle: [ev('cancelled') ? cuando(ev('cancelled')!.created_at) : null, m?.label, s.cancel_note ? `“${s.cancel_note}”` : null].filter(Boolean).join(' · ') };
  };
  if (status === 'declined') {
    const m = MOTIVOS_RECHAZO.find((x) => x.value === s.decline_reason);
    pasos.push({ titulo: `${nombre} no puede tomarla`, detalle: [m && m.value !== 'otro' ? `${nombre} ${m.cliente}` : null, ev('declined')?.note ? `“${ev('declined')!.note}”` : null].filter(Boolean).join(' · ') || undefined, estado: 'alerta' });
  } else if (status === 'expired') {
    pasos.push({ titulo: 'Expiró sin respuesta', detalle: `${nombre} no respondió en 2 horas`, estado: 'alerta' });
  } else {
    const acepto = ev('accepted');
    if (acepto) pasos.push({ titulo: `${nombre} aceptó y cotizó ${pesos(s.quoted_price_mxn)}`, detalle: [hora(acepto.created_at), s.scheduled_at ? `propuso ${cuando(s.scheduled_at)}` : null].filter(Boolean).join(' · '), estado: 'hecho' });
    else if (!cancelada) pasos.push({ titulo: `Esperando que ${nombre} responda`, detalle: `Tiene hasta las ${hora(s.expires_at)}`, estado: 'actual' });
    const confirmo = ev('scheduled');
    if (confirmo) pasos.push({ titulo: 'Confirmaste la cita', detalle: [cuando(confirmo.created_at), 'ya puede ver tu dirección y tu teléfono'].join(' · '), estado: 'hecho' });
    else if (acepto && !cancelada) pasos.push({ titulo: 'Confirma la cita', detalle: 'Para apartar el horario y compartir tu dirección', estado: 'actual' });
    else if (!cancelada) pasos.push({ titulo: 'Confirmas la cita', estado: 'pendiente' });
    if (cancelada) pasos.push({ ...textoCancelacion(), estado: 'alerta' });
    else {
      const inicio = ev('in_progress');
      pasos.push(inicio ? { titulo: 'Trabajo en curso', detalle: `${nombre} empezó a las ${hora(inicio.created_at)}`, estado: status === 'in_progress' ? 'actual' : 'hecho' } : { titulo: 'Trabajo en curso', estado: 'pendiente' });
      const fin = ev('completed');
      pasos.push(fin
        ? { titulo: s.mi_calificacion ? `Terminado y calificado con ${s.mi_calificacion} ★` : 'Terminado · falta calificar', detalle: [cuando(fin.created_at), acordado != null ? `pagaste ${pesos(acordado)}` : null].filter(Boolean).join(' · '), estado: s.mi_calificacion ? 'hecho' : 'actual' }
        : { titulo: 'Terminado y calificado', estado: 'pendiente' });
    }
  }

  // ---- Acciones abajo según el estado ----
  let footer: React.ReactNode = undefined;
  if (status === 'accepted') {
    footer = (
      <BottomBar helper={`${nombre} propuso ${s.scheduled_at ? cuando(s.scheduled_at) : ''} por ${pesos(s.quoted_price_mxn)}`}>
        <Button onPress={() => mover('scheduled')} loading={enviando === 'scheduled'}>Confirmar cita</Button>
      </BottomBar>
    );
  } else if (status === 'in_progress') {
    footer = <BottomBar><Button onPress={() => mover('completed')} loading={enviando === 'completed'}>Ya terminó</Button></BottomBar>;
  } else if (status === 'completed' && !s.mi_calificacion) {
    footer = <BottomBar><Button variant="accent" onPress={() => router.push({ pathname: '/cliente/calificar/[id]', params: { id: s.id } })}>{`Calificar a ${nombre}`}</Button></BottomBar>;
  } else if (status === 'declined' || status === 'expired') {
    footer = <BottomBar><Button variant="secondary" onPress={() => router.push('/cliente/buscar')}>Buscar a alguien más</Button></BottomBar>;
  }

  return (
    <Screen header={<AppBar title={s.servicio} />} footer={footer}>
      <View className="flex-row items-center gap-2">
        <Badge tone={tono}>{etiqueta}</Badge>
        {status === 'scheduled' && s.scheduled_at ? <Text className="font-sans-semibold text-sm text-foreground">{cuando(s.scheduled_at)}</Text> : null}
      </View>

      {/* Figma: ProviderCard con Mensaje y Llamar */}
      <View className="gap-3 rounded-2xl border border-border bg-card p-4">
        <Pressable onPress={() => router.push({ pathname: '/cliente/prestador/[id]', params: { id: s.provider_id } })} className="flex-row items-center gap-3" accessibilityRole="button">
          <Avatar name={s.provider_name} id={s.provider_id} uri={s.provider_avatar} size="lg" />
          <View className="flex-1 gap-0.5">
            <Text className="font-sans-bold text-base text-foreground">{s.provider_name}</Text>
            <View className="flex-row items-center gap-1">
              {s.rating_count ? <><Star size={13} color={colors.accent} fill={colors.accent} /><Text className="font-sans-semibold text-sm text-foreground">{Number(s.rating_avg).toFixed(1)}</Text></> : null}
              <Text className="font-sans text-sm text-muted-foreground">{`${s.rating_count ? '· ' : ''}${s.oficio}`}</Text>
            </View>
            {meta ? <Text className="font-sans-semibold text-sm text-foreground">{meta}</Text> : null}
          </View>
          <ChevronRight size={18} color={colors.mutedForeground} />
        </Pressable>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button size="sm" variant="secondary" icon={MessageCircle}
              onPress={() => router.push({ pathname: '/chat/[id]', params: { id: s.id } })}>
              Mensaje
            </Button>
          </View>
          <View className="flex-1">
            <Button size="sm" variant="secondary" icon={Phone} disabled={!s.telefono} onPress={() => s.telefono && Linking.openURL(`tel:+${s.telefono}`)}>Llamar</Button>
          </View>
        </View>
        {s.telefono ? <Text className="font-sans text-xs text-muted-foreground">{telefonoLegible(s.telefono)}</Text>
          : ['pending', 'accepted'].includes(status) ? <Text className="font-sans text-xs text-muted-foreground">Podrán llamarse cuando confirmes la cita.</Text> : null}
      </View>

      {/* Línea de tiempo */}
      <View testID="linea-tiempo">
        {pasos.map((p, i) => <PasoLinea key={p.titulo + i} {...p} ultimo={i === pasos.length - 1} />)}
      </View>

      {status === 'accepted' ? (
        <View className="gap-2">
          {ev('accepted')?.note ? <Note>{`${nombre}: “${ev('accepted')!.note}”`}</Note> : null}
          <Button variant="secondary" onPress={() => router.push({ pathname: '/cliente/cancelar/[id]', params: { id: s.id, motivo: 'price' } })}>No me conviene</Button>
        </View>
      ) : null}

      <Seccion titulo="Lo que pediste">
        <Text className="font-sans text-base leading-6 text-foreground">{s.description}</Text>
      </Seccion>
      <Seccion titulo={tituloMedios(medios)}>
        <MediosSolicitud medios={medios} vacio="No agregaste fotos ni video." />
      </Seccion>
      <Seccion titulo="Cuándo y dónde">
        <Fila icono={CalendarDays} texto={[...(s.preferred_dates ?? [])].sort().map((d) => diaRelativo(d)).join(', ') || 'Sin días preferidos'} />
        <Fila icono={Clock} texto={[FRANJAS.filter((f) => s.time_windows?.includes(f.value)).map((f) => f.label).join(' · '), URGENCIAS.find((u) => u.value === s.urgency)?.label].filter(Boolean).join(' · ')} />
        {s.direccion ? <Fila icono={MapPin} texto={s.direccion} /> : null}
        <Fila icono={CreditCard} texto={ORDEN_PAGOS.filter((p) => s.formas_pago?.includes(p)).map((p) => PAGO_DETALLE[p].titulo).join(' · ') || 'Lo acuerdan al cotizar'} />
      </Seccion>

      {sePuedeCancelar ? (
        <Pressable onPress={() => router.push({ pathname: '/cliente/cancelar/[id]', params: { id: s.id } })} className="items-center py-2" accessibilityRole="button" testID="cancelar-solicitud">
          <Text className="font-sans-semibold text-sm text-danger">Cancelar solicitud</Text>
        </Pressable>
      ) : null}
      {error ? <Note tone="error">{error}</Note> : null}
    </Screen>
  );
}
