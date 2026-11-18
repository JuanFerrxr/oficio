import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MessageSquare } from 'lucide-react-native';
import { AppBar, BottomBar, Button, Chip, Note, Screen, TextField } from '@/components/ui';
import { diaRelativo, hora, isoEnDias, primerNombre } from '@/features/cliente/formato';
import { opcionesDeHora, textoFranjas, vencida, type Bloqueo, type Entrada } from '@/features/prestador/bandeja';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

// B5 · Aceptar y cotizar. Precio (de inicio, el de su perfil), hora de llegada dentro de lo que
// pidió el cliente y un mensaje opcional. La base valida todo en cotizar_solicitud().
export default function Cotizar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [e, setE] = useState<Entrada | null | undefined>(undefined);
  const [precio, setPrecio] = useState('');
  const [dia, setDia] = useState<string | null>(null);
  const [horaIso, setHoraIso] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);

  useEffect(() => {
    supabase.rpc('mis_bloqueos', { p_desde: isoEnDias(0), p_hasta: isoEnDias(31) }).then(({ data }) => setBloqueos(data ?? []));
    supabase.rpc('bandeja_prestador').then(({ data }) => {
      const x = (data ?? []).find((r) => r.id === id) ?? null;
      setE(x);
      if (x?.precio_perfil != null && x.precio_tipo !== 'quote') setPrecio(String(Math.round(Number(x.precio_perfil))));
    });
  }, [id]);

  const opciones = useMemo(() => (e ? opcionesDeHora(e, new Date(), bloqueos) : []), [e, bloqueos]);
  useEffect(() => { if (!dia && opciones[0]) setDia(opciones[0].dia); }, [opciones, dia]);
  const horas = opciones.find((o) => o.dia === dia)?.horas ?? [];

  if (e === undefined) return <Screen header={<AppBar title="Responder" />}><View className="items-center py-10"><ActivityIndicator color={colors.primary} /></View></Screen>;
  if (e === null || e.status !== 'pending' || vencida(e)) {
    return (
      <Screen header={<AppBar title="Responder" />}>
        <Note tone="warning">{e && vencida(e) ? 'Esta solicitud ya expiró: pasaron las 2 horas para responder.' : 'Esta solicitud ya no está esperando respuesta.'}</Note>
        <Button variant="secondary" onPress={() => router.back()}>Volver a Solicitudes</Button>
      </Screen>
    );
  }

  const nombre = primerNombre(e.cliente);
  const cuando = [diaRelativo([...(e.preferred_dates ?? [])].sort()[0] ?? '').toLowerCase(), textoFranjas(e.time_windows)].filter(Boolean).join(', ');
  const subtitulo = [e.servicio ?? e.categoria, e.colonia ? `Col. ${e.colonia}` : null, cuando].filter(Boolean).join(' · ');
  const ayudaPrecio = e.precio_tipo === 'quote'
    ? 'MXN · en tu perfil dice "Cotizo": pon el precio de la visita o del trabajo'
    : e.precio_tipo === 'hourly' ? 'MXN · total estimado (tu perfil dice por hora)' : 'MXN · precio de tu perfil';

  async function enviar() {
    setError(null);
    const monto = Number(precio.replace(/[^\d.]/g, ''));
    if (!monto) return setError('Escribe tu precio');
    if (!horaIso) return setError('Elige a qué hora llegas');
    setEnviando(true);
    const { error } = await supabase.rpc('cotizar_solicitud', { p_request_id: e!.id, p_precio: monto, p_hora: horaIso, p_mensaje: mensaje.trim() || undefined });
    setEnviando(false);
    if (error) return setError(error.message || 'No se pudo enviar. Intenta de nuevo.');
    router.dismissTo({ pathname: '/prestador', params: { aviso: `Enviaste tu cotización a ${nombre}. Cuando la confirme, verás su dirección y teléfono.`, pestana: 'activas' } });
  }

  return (
    <Screen
      header={<AppBar title={`Responder a ${nombre}`} />}
      footer={<BottomBar><Button onPress={enviar} loading={enviando}>Enviar cotización</Button></BottomBar>}
    >
      <Text className="font-sans text-sm text-muted-foreground">{subtitulo}</Text>

      <TextField label="Tu precio" prefix="$" value={precio} onChangeText={(t) => { setPrecio(t.replace(/[^\d]/g, '')); setError(null); }}
        keyboardType="number-pad" hint={ayudaPrecio} placeholder="350" testID="precio" />

      <View className="gap-2">
        <Text className="font-sans-semibold text-sm text-foreground">¿A qué hora llegas?</Text>
        {opciones.length > 1 ? (
          <View className="flex-row flex-wrap gap-2">
            {opciones.map((o) => <Chip key={o.dia} selected={o.dia === dia} onPress={() => { setDia(o.dia); setHoraIso(null); }}>{diaRelativo(o.dia)}</Chip>)}
          </View>
        ) : null}
        {horas.length ? (
          <View className="flex-row flex-wrap gap-2">
            {horas.map((h) => <Chip key={h.iso} selected={h.iso === horaIso} onPress={() => { setHoraIso(h.iso); setError(null); }}>{hora(h.iso)}</Chip>)}
          </View>
        ) : (
          <Text className="font-sans text-sm text-muted-foreground">No quedan horas libres en lo que pidió (ya pasaron o las marcaste como no disponibles). Rechaza la solicitud o escríbele en el mensaje.</Text>
        )}
      </View>

      <TextField label={`Mensaje para ${nombre} (opcional)`} value={mensaje} onChangeText={setMensaje} multiline maxLength={500}
        placeholder="Llevo multímetro. Si es el centro de carga, te doy cotización ahí mismo." testID="mensaje" />

      <Note icon={MessageSquare}>{`${nombre} debe confirmar. Después podrán chatear y ver sus teléfonos.`}</Note>
      {error ? <Note tone="error">{error}</Note> : null}
    </Screen>
  );
}
