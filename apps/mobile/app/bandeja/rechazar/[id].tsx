import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppBar, BottomBar, Button, Chip, Note, Screen, TextField } from '@/components/ui';
import { primerNombre } from '@/features/cliente/formato';
import { MOTIVOS_RECHAZO, vencida, type Entrada, type MotivoRechazo } from '@/features/prestador/bandeja';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

// B4 · Rechazar con motivo. El cliente ve el motivo en su tarjeta ("no tiene disponibilidad
// esos días") y la sugerencia de buscar a otros prestadores cerca.
export default function Rechazar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [e, setE] = useState<Entrada | null | undefined>(undefined);
  const [motivo, setMotivo] = useState<MotivoRechazo | null>(null);
  const [nota, setNota] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    supabase.rpc('bandeja_prestador').then(({ data }) => setE((data ?? []).find((r) => r.id === id) ?? null));
  }, [id]);

  if (e === undefined) return <Screen header={<AppBar title="Rechazar" />}><View className="items-center py-10"><ActivityIndicator color={colors.primary} /></View></Screen>;
  if (e === null || e.status !== 'pending' || vencida(e)) {
    return (
      <Screen header={<AppBar title="Rechazar" />}>
        <Note tone="warning">Esta solicitud ya no está esperando respuesta.</Note>
        <Button variant="secondary" onPress={() => router.back()}>Volver a Solicitudes</Button>
      </Screen>
    );
  }
  const nombre = primerNombre(e.cliente);

  async function rechazar() {
    if (!motivo) return setError('Elige un motivo');
    if (motivo === 'otro' && !nota.trim()) return setError('Cuéntale brevemente por qué');
    setEnviando(true);
    const { error } = await supabase.rpc('rechazar_solicitud', { p_request_id: e!.id, p_motivo: motivo, p_nota: nota.trim() || undefined });
    setEnviando(false);
    if (error) return setError(error.message || 'No se pudo rechazar. Intenta de nuevo.');
    router.dismissTo({ pathname: '/prestador', params: { aviso: `Rechazaste la solicitud de ${nombre}. Le sugeriremos otros prestadores cerca.`, pestana: 'nuevas' } });
  }

  return (
    <Screen
      header={<AppBar title={`Rechazar la solicitud de ${nombre}`} />}
      footer={<BottomBar><Button variant="destructive" onPress={rechazar} loading={enviando}>Rechazar solicitud</Button></BottomBar>}
    >
      <Text className="font-sans text-sm text-muted-foreground">{`${e.servicio ?? e.categoria} · ${nombre} verá el motivo y te dejará de esperar.`}</Text>
      <View className="gap-2">
        <Text className="font-sans-semibold text-sm text-foreground">¿Por qué no puedes tomarla?</Text>
        <View className="flex-row flex-wrap gap-2">
          {MOTIVOS_RECHAZO.map((m) => <Chip key={m.value} selected={motivo === m.value} onPress={() => { setMotivo(m.value); setError(null); }}>{m.label}</Chip>)}
        </View>
      </View>
      <TextField label={motivo === 'otro' ? `Mensaje para ${nombre}` : `Mensaje para ${nombre} (opcional)`} value={nota} onChangeText={(t) => { setNota(t); setError(null); }}
        multiline maxLength={300} placeholder="Esta semana tengo la agenda llena. ¡Gracias por pensar en mí!" testID="nota-rechazo" />
      <Note>Rechazar a tiempo cuenta como respuesta: no afecta tu porcentaje de "respondidas a tiempo".</Note>
      {error ? <Note tone="error">{error}</Note> : null}
    </Screen>
  );
}
