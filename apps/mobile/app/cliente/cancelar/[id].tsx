import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { AppBar, BottomBar, Button, Note, Screen, TextField } from '@/components/ui';
import { RequestCard } from '@/components/cliente/RequestCard';
import type { Solicitud } from '@/features/cliente/datos';
import { MOTIVOS_CANCELACION, primerNombre, type MotivoCancelacion } from '@/features/cliente/formato';
import { tarjeta } from '@/features/cliente/solicitudes';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

// A7.1 · Cancelar solicitud. Motivo obligatorio (cancel_reason_t) y nota opcional. Una
// solicitud cancelada no se reactiva. Desde "No me conviene" llega con el motivo "precio" marcado.
export default function CancelarSolicitud() {
  const { id, motivo: motivoInicial } = useLocalSearchParams<{ id: string; motivo?: MotivoCancelacion }>();
  const [s, setS] = useState<Solicitud | null | undefined>(undefined);
  const [motivo, setMotivo] = useState<MotivoCancelacion | null>(motivoInicial ?? null);
  const [nota, setNota] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    supabase.rpc('mis_solicitudes').then(({ data }) => setS((data ?? []).find((x) => x.id === id) ?? null));
  }, [id]);

  if (s === undefined) return <Screen header={<AppBar title="Cancelar solicitud" />}><View className="items-center py-10"><ActivityIndicator color={colors.primary} /></View></Screen>;
  if (s === null || !['pending', 'accepted', 'scheduled'].includes(s.status)) {
    return (
      <Screen header={<AppBar title="Cancelar solicitud" />}>
        <Note tone="warning">Esta solicitud ya no se puede cancelar.</Note>
        <Button variant="secondary" onPress={() => router.back()}>Volver</Button>
      </Screen>
    );
  }
  const nombre = primerNombre(s.provider_name);

  async function cancelar() {
    if (!motivo) return setError('Elige por qué la cancelas');
    setError(null);
    setEnviando(true);
    const { error } = await supabase.rpc('transition_request', {
      p_request_id: s!.id, p_to: 'cancelled', p_cancel_reason: motivo, p_note: nota.trim() || undefined,
    });
    setEnviando(false);
    if (error) return setError('No se pudo cancelar. Intenta de nuevo.');
    router.replace({ pathname: '/cliente/cancelada', params: { nombre } });
  }

  return (
    <Screen
      header={<AppBar title="Cancelar solicitud" />}
      footer={(
        <BottomBar helper="Esta acción no se puede deshacer.">
          <View className="gap-3">
            <Button variant="destructive" onPress={cancelar} loading={enviando}>Cancelar solicitud</Button>
            <Button variant="secondary" onPress={() => router.back()}>Mantener mi solicitud</Button>
          </View>
        </BottomBar>
      )}
    >
      <RequestCard {...tarjeta(s)} />

      {s.status !== 'pending' ? (
        <View className="gap-1 rounded-2xl bg-primary-soft p-4">
          <View className="flex-row items-center gap-2">
            <MessageCircle size={18} color={colors.primary} />
            <Text className="font-sans-bold text-sm text-foreground">¿Solo necesitas otro día u hora?</Text>
          </View>
          <Text className="font-sans text-sm text-foreground">{`Pídele a ${nombre} por el chat que mueva la cita; no tienes que cancelarla.`}</Text>
        </View>
      ) : null}

      <View className="gap-2" accessibilityRole="radiogroup">
        <Text className="font-sans-semibold text-sm text-foreground">¿Por qué la cancelas?</Text>
        {MOTIVOS_CANCELACION.map((m) => {
          const sel = motivo === m.value;
          return (
            <Pressable key={m.value} onPress={() => { setMotivo(m.value); setError(null); }} accessibilityRole="radio" accessibilityState={{ checked: sel }} aria-checked={sel}
              className={`flex-row items-center gap-3 rounded-xl border bg-card px-4 py-3 ${sel ? 'border-2 border-primary' : 'border-border'}`}>
              <View className={`h-5 w-5 items-center justify-center rounded-full border-2 ${sel ? 'border-primary' : 'border-border'}`}>
                {sel ? <View className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
              </View>
              <Text className="flex-1 font-sans text-base text-foreground">{m.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <TextField label="Cuéntanos más (opcional)" value={nota} onChangeText={setNota} multiline maxLength={500}
        placeholder="Me salió un compromiso de trabajo a esa hora." testID="nota-cancelar" />

      <Note tone="warning">{`Al cancelar, esta solicitud se cierra y no se puede reactivar. Si después necesitas el servicio, tendrás que enviar una solicitud nueva. ${nombre} recibirá un aviso.`}</Note>
      {error ? <Note tone="error">{error}</Note> : null}
    </Screen>
  );
}
