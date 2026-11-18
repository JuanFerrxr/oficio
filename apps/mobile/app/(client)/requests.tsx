import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppBar, Button, Note, Screen, SegmentedControl } from '@/components/ui';
import { RequestCard } from '@/components/cliente/RequestCard';
import type { Solicitud } from '@/features/cliente/datos';
import { mesDe, oficioPlural, primerNombre } from '@/features/cliente/formato';
import { grupo, tarjeta, useMisSolicitudes } from '@/features/cliente/solicitudes';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

// A3.1 · Solicitudes del cliente: En curso (aceptadas y esperando respuesta), Rechazadas
// (rechazadas o expiradas a las 2 h) e Historial (completadas y canceladas), por mes.
// El detalle de cada solicitud (A7) llega en el Sprint 4.
type Pestana = 'curso' | 'rechazadas' | 'historial';

export default function Solicitudes() {
  const { enviada, fallidos, aviso: avisoParam } = useLocalSearchParams<{ enviada?: string; fallidos?: string; aviso?: string }>();
  const { solicitudes, cargando, error, recargar, refrescar, refrescando } = useMisSolicitudes();
  const [pestana, setPestana] = useState<Pestana>('curso');
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!enviada) return;
    setPestana('curso');
    setAviso(Number(fallidos) > 0
      ? `Enviamos tu solicitud a ${enviada}, pero ${fallidos === '1' ? 'una foto no se pudo subir' : `${fallidos} fotos no se pudieron subir`}.`
      : `Enviamos tu solicitud a ${enviada}. Tiene 2 horas para responder; te avisaremos.`);
    router.setParams({ enviada: undefined, fallidos: undefined });
  }, [enviada, fallidos]);

  // Al volver de calificar (A8)
  useEffect(() => {
    if (!avisoParam) return;
    setPestana('historial');
    setAviso(avisoParam);
    router.setParams({ aviso: undefined });
  }, [avisoParam]);

  const por = (g: ReturnType<typeof grupo>) => solicitudes.filter((s) => grupo(s) === g);
  const aceptadas = por('aceptadas');
  const esperando = por('esperando');
  const rechazadas = por('rechazadas');
  const historial = por('historial');
  const enCurso = aceptadas.length + esperando.length;

  const opciones = [
    { value: 'curso', label: `En curso${enCurso ? ` · ${enCurso}` : ''}` },
    { value: 'rechazadas', label: `Rechazadas${rechazadas.length ? ` · ${rechazadas.length}` : ''}` },
    { value: 'historial', label: 'Historial' },
  ] as const;

  const abrir = (s: Solicitud) => router.push({
    pathname: '/proximamente',
    params: { code: 'A7', title: s.servicio ?? 'Solicitud', description: 'Detalle y seguimiento de la solicitud: estado, cita, chat con el prestador, cancelar y calificar.', sprint: '4' },
  });

  const lista = (xs: Solicitud[]) => xs.map((s) => (
    <RequestCard key={s.id} {...tarjeta(s)} onPress={() => abrir(s)}>
      <Acciones s={s} recargar={recargar} onAviso={setAviso} />
    </RequestCard>
  ));

  return (
    <Screen header={<AppBar title="Solicitudes" back={false} />} onRefresh={refrescar} refreshing={refrescando}>
      <SegmentedControl options={opciones} value={pestana} onChange={setPestana} />
      {aviso ? <Note tone="privacy">{aviso}</Note> : null}
      {error ? <Note tone="error">No pudimos cargar tus solicitudes. Revisa tu conexión.</Note> : null}
      {cargando ? <View className="items-center py-8"><ActivityIndicator color={colors.primary} /></View> : null}

      {!cargando && pestana === 'curso' ? (
        enCurso ? (
          <>
            {aceptadas.length ? <Titulo>{`Aceptadas · ${aceptadas.length}`}</Titulo> : null}
            {lista(aceptadas)}
            {esperando.length ? <Titulo>{`Esperando respuesta · ${esperando.length}`}</Titulo> : null}
            {lista(esperando)}
          </>
        ) : (
          <Vacio texto="No tienes solicitudes en curso. Busca a quien te ayude desde Inicio." />
        )
      ) : null}

      {!cargando && pestana === 'rechazadas' ? (
        <>
          <Note>Si un prestador no puede tomar tu solicitud, te sugerimos otros parecidos cerca de ti.</Note>
          {rechazadas.length ? lista(rechazadas) : <Vacio texto="Ninguna solicitud rechazada." />}
          {rechazadas[0] ? <BuscarOtros categoria={rechazadas[0].categoria} /> : null}
        </>
      ) : null}

      {!cargando && pestana === 'historial' ? (
        historial.length ? (
          Object.entries(historial.reduce<Record<string, Solicitud[]>>((acc, s) => {
            const m = mesDe(s.scheduled_at ?? s.updated_at);
            (acc[m] ??= []).push(s);
            return acc;
          }, {})).map(([mes, xs]) => (
            <View key={mes} className="gap-3">
              <Titulo>{mes}</Titulo>
              {lista(xs)}
            </View>
          ))
        ) : (
          <Vacio texto="Aquí verás los servicios terminados y cancelados." />
        )
      ) : null}
    </Screen>
  );
}

// Sprint 3B · Lo que el cliente puede hacer desde la tarjeta:
//   aceptada → Confirmar cita / No me conviene (cancela con motivo "precio")
//   en curso → Ya terminó (y pasa a calificar)
//   terminada sin calificar → Calificar
function Acciones({ s, recargar, onAviso }: { s: Solicitud; recargar: () => void; onAviso: (t: string) => void }) {
  const [enviando, setEnviando] = useState<string | null>(null);
  const [seguro, setSeguro] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quien = primerNombre(s.provider_name);

  async function mover(to: 'scheduled' | 'completed' | 'cancelled') {
    setEnviando(to);
    setError(null);
    const { error } = await supabase.rpc('transition_request', {
      p_request_id: s.id, p_to: to, ...(to === 'cancelled' ? { p_cancel_reason: 'price' as const, p_note: 'La cotización no le convino' } : {}),
    });
    setEnviando(null);
    if (error) return setError('No se pudo guardar. Intenta de nuevo.');
    if (to === 'scheduled') onAviso(`Confirmaste tu cita con ${quien}. Ya puede ver tu dirección y tu teléfono.`);
    if (to === 'cancelled') onAviso(`Cancelaste la solicitud. Avisamos a ${quien}.`);
    if (to === 'completed') return router.push({ pathname: '/cliente/calificar/[id]', params: { id: s.id } });
    recargar();
  }

  if (s.status === 'accepted') {
    return (
      <View className="gap-2">
        {s.nota_estado ? <Text className="font-sans text-sm italic text-foreground">{`“${s.nota_estado}”`}</Text> : null}
        {seguro ? (
          <>
            <Text className="font-sans-semibold text-sm text-foreground">{`¿Cancelar la solicitud? ${quien} dejará de esperarte.`}</Text>
            <View className="flex-row gap-3">
              <View className="flex-1"><Button size="sm" variant="secondary" onPress={() => setSeguro(false)}>No</Button></View>
              <View className="flex-1"><Button size="sm" variant="destructive" loading={enviando === 'cancelled'} onPress={() => mover('cancelled')}>Sí, cancelar</Button></View>
            </View>
          </>
        ) : (
          <View className="flex-row gap-3">
            <View className="flex-1"><Button size="sm" variant="secondary" onPress={() => setSeguro(true)}>No me conviene</Button></View>
            <View className="flex-1"><Button size="sm" loading={enviando === 'scheduled'} onPress={() => mover('scheduled')}>Confirmar cita</Button></View>
          </View>
        )}
        {error ? <Text className="font-sans text-sm text-danger">{error}</Text> : null}
      </View>
    );
  }
  if (s.status === 'in_progress') {
    return (
      <View className="gap-2">
        <Button size="sm" loading={enviando === 'completed'} onPress={() => mover('completed')}>Ya terminó</Button>
        {error ? <Text className="font-sans text-sm text-danger">{error}</Text> : null}
      </View>
    );
  }
  if (s.status === 'completed' && !s.mi_calificacion) {
    return <Button size="sm" variant="accent" onPress={() => router.push({ pathname: '/cliente/calificar/[id]', params: { id: s.id } })}>{`Calificar a ${quien}`}</Button>;
  }
  return null;
}

function Titulo({ children }: { children: string }) {
  return <Text className="font-sans-bold text-sm text-muted-foreground">{children}</Text>;
}
function Vacio({ texto }: { texto: string }) {
  return <Text className="py-6 text-center font-sans text-sm text-muted-foreground">{texto}</Text>;
}
function BuscarOtros({ categoria }: { categoria: string }) {
  const [cat, setCat] = useState<{ id: number; slug: string } | null>(null);
  useEffect(() => {
    supabase.from('categories').select('id, slug').eq('name', categoria).maybeSingle().then(({ data }) => setCat(data));
  }, [categoria]);
  if (!cat) return null;
  return (
    <Button variant="secondary" onPress={() => router.push({ pathname: '/cliente/resultados', params: { categoria: String(cat.id) } })}>
      {`Buscar ${oficioPlural(cat.slug, categoria).toLowerCase()} cerca`}
    </Button>
  );
}
