import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { AppBar, BottomBar, Button, Chip, Note, Screen, Toggle } from '@/components/ui';
import { HoraCampo } from '@/components/prestador/HoraCampo';
import { useSession } from '@/features/auth/session';
import { hora, isoDe, isoEnDias } from '@/features/cliente/formato';
import { INICIALES, cuadriculaMes, inicioMes, numeroDe, sumarDias, sumarMeses, tituloDia, tituloMes } from '@/features/prestador/calendario';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

// B6.4 · Marcar como no disponible. Un día completo o unas horas, con motivo privado y
// repetición (cada semana o cada día). Con ?id= se edita o se quita un bloqueo.
const MOTIVOS = ['Comida', 'Otro trabajo', 'Personal', 'Descanso'];
const REPETIR = [
  { value: null, label: 'No se repite' },
  { value: 'FREQ=WEEKLY', label: 'Cada semana' },
  { value: 'FREQ=DAILY', label: 'Cada día' },
] as const;
type Repetir = (typeof REPETIR)[number]['value'];
const OFFSET = '-06:00'; // México centro no tiene horario de verano desde 2022

export default function Bloquear() {
  const { id, dia: diaParam } = useLocalSearchParams<{ id?: string; dia?: string }>();
  const { session } = useSession();
  const [cargando, setCargando] = useState(!!id);
  const [dia, setDia] = useState(diaParam ?? isoEnDias(0));
  const [todoElDia, setTodoElDia] = useState(false);
  const [desde, setDesde] = useState('13:00');
  const [hasta, setHasta] = useState('15:00');
  const [motivo, setMotivo] = useState<string | null>(null);
  const [repetir, setRepetir] = useState<Repetir>(null);
  const [elegirDia, setElegirDia] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from('provider_unavailability').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      if (data) {
        setDia(isoDe(data.starts_at));
        setTodoElDia(data.all_day);
        if (!data.all_day) { setDesde(hora(data.starts_at)); setHasta(hora(data.ends_at)); }
        setMotivo(data.reason);
        setRepetir((data.rrule as Repetir) ?? null);
      }
      setCargando(false);
    });
  }, [id]);

  async function guardar() {
    if (!session) return;
    setError(null);
    if (!todoElDia && hasta <= desde) return setError('"Hasta" tiene que ser después de "Desde"');
    if (!id && dia < isoEnDias(0)) return setError('Elige hoy o un día que no haya pasado');
    const fila = {
      provider_id: session.user.id,
      starts_at: todoElDia ? `${dia}T00:00:00${OFFSET}` : `${dia}T${desde}:00${OFFSET}`,
      ends_at: todoElDia ? `${sumarDias(dia, 1)}T00:00:00${OFFSET}` : `${dia}T${hasta}:00${OFFSET}`,
      all_day: todoElDia,
      reason: motivo,
      rrule: repetir,
    };
    setEnviando('guardar');
    const r = id ? await supabase.from('provider_unavailability').update(fila).eq('id', id) : await supabase.from('provider_unavailability').insert(fila);
    setEnviando(null);
    if (r.error) return setError('No se pudo guardar. Intenta de nuevo.');
    router.back();
  }

  async function quitar() {
    setEnviando('quitar');
    const { error } = await supabase.from('provider_unavailability').delete().eq('id', id!);
    setEnviando(null);
    if (error) return setError('No se pudo quitar. Intenta de nuevo.');
    router.back();
  }

  if (cargando) return <Screen header={<AppBar title="Marcar como no disponible" />}><View className="items-center py-10"><ActivityIndicator color={colors.primary} /></View></Screen>;

  return (
    <Screen
      header={<AppBar title={id ? 'Editar no disponible' : 'Marcar como no disponible'} />}
      footer={(
        <BottomBar>
          <View className="gap-3">
            <Button onPress={guardar} loading={enviando === 'guardar'}>Guardar</Button>
            {id ? <Button variant="ghost" onPress={quitar} loading={enviando === 'quitar'}>{repetir ? 'Quitar (todas las repeticiones)' : 'Quitar bloqueo'}</Button> : null}
          </View>
        </BottomBar>
      )}
    >
      <View className="gap-1.5">
        <Text className="font-sans-semibold text-sm text-foreground">Día</Text>
        <Pressable onPress={() => setElegirDia(true)} accessibilityRole="button" accessibilityLabel={`Día: ${tituloDia(dia)}`} testID="campo-dia"
          className="h-12 flex-row items-center justify-between rounded-xl border border-border bg-card px-3">
          <Text className="font-sans text-base text-foreground">{tituloDia(dia)}</Text>
          <CalendarDays size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <View className="flex-1 gap-0.5">
          <Text className="font-sans-semibold text-sm text-foreground">Todo el día</Text>
          <Text className="font-sans text-xs text-muted-foreground">Actívalo si no trabajarás ese día. Se ocultan las horas.</Text>
        </View>
        <Toggle value={todoElDia} onChange={setTodoElDia} label="Todo el día" testID="todo-el-dia" />
      </View>

      {!todoElDia ? (
        <View className="flex-row gap-3">
          <View className="flex-1"><HoraCampo label="Desde" value={desde} onChange={setDesde} testID="bloqueo-desde" /></View>
          <View className="flex-1"><HoraCampo label="Hasta" value={hasta} onChange={setHasta} testID="bloqueo-hasta" /></View>
        </View>
      ) : null}

      <View className="gap-2">
        <Text className="font-sans-semibold text-sm text-foreground">Motivo (opcional, solo lo ves tú)</Text>
        <View className="flex-row flex-wrap gap-2">
          {MOTIVOS.map((m) => <Chip key={m} selected={motivo === m} onPress={() => setMotivo(motivo === m ? null : m)}>{m}</Chip>)}
        </View>
      </View>

      <View className="gap-2">
        <Text className="font-sans-semibold text-sm text-foreground">Repetir</Text>
        <View className="flex-row flex-wrap gap-2">
          {REPETIR.map((r) => <Chip key={r.label} selected={repetir === r.value} onPress={() => setRepetir(r.value)}>{r.label}</Chip>)}
        </View>
      </View>

      <Note>En ese horario no aparecerás para solicitudes nuevas. Tus citas ya confirmadas no cambian.</Note>
      {error ? <Note tone="error">{error}</Note> : null}

      <ElegirDia visible={elegirDia} valor={dia} onCerrar={() => setElegirDia(false)} onElegir={(d) => { setDia(d); setElegirDia(false); }} />
    </Screen>
  );
}

function ElegirDia({ visible, valor, onCerrar, onElegir }: { visible: boolean; valor: string; onCerrar: () => void; onElegir: (d: string) => void }) {
  const [mes, setMes] = useState(inicioMes(valor));
  const hoy = isoEnDias(0);
  useEffect(() => { if (visible) setMes(inicioMes(valor)); }, [visible, valor]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <Pressable className="flex-1 justify-end" style={{ backgroundColor: 'rgba(18, 26, 46, 0.35)' }} onPress={onCerrar}>
        <Pressable className="gap-3 rounded-t-3xl bg-card px-5 pb-10 pt-4" onPress={() => {}}>
          <View className="flex-row items-center justify-between">
            <Pressable onPress={() => setMes(sumarMeses(mes, -1))} hitSlop={12} accessibilityLabel="Mes anterior"><ChevronLeft size={22} color={colors.foreground} /></Pressable>
            <Text className="font-display text-lg text-foreground">{tituloMes(mes)}</Text>
            <Pressable onPress={() => setMes(sumarMeses(mes, 1))} hitSlop={12} accessibilityLabel="Mes siguiente"><ChevronRight size={22} color={colors.foreground} /></Pressable>
          </View>
          <View className="flex-row">{INICIALES.map((l, i) => <Text key={i} className="flex-1 text-center font-sans text-xs text-muted-foreground">{l}</Text>)}</View>
          {cuadriculaMes(mes).map((s) => (
            <View key={s[0]} className="flex-row">
              {s.map((d) => {
                const pasado = d < hoy;
                const fuera = d.slice(0, 7) !== mes.slice(0, 7);
                const sel = d === valor;
                return (
                  <Pressable key={d} disabled={pasado} onPress={() => onElegir(d)} className="flex-1 items-center py-1" accessibilityRole="button" accessibilityLabel={tituloDia(d)}>
                    <View className={`h-10 w-10 items-center justify-center rounded-xl ${sel ? 'bg-primary' : ''}`}>
                      <Text className={`font-sans-bold text-sm ${sel ? 'text-primary-foreground' : pasado || fuera ? 'text-border' : 'text-foreground'}`}>{numeroDe(d)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
