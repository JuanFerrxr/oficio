import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Check, Plus, Sparkles } from 'lucide-react-native';
import { Badge, Button, Note } from '@/components/ui';
import { URGENCIAS, type Urgencia } from '@/features/cliente/formato';
import { pedirSugerencias, type EstadoIA, type Sugerencia } from '@/features/ia/ia';
import { colors } from '@/theme/colors';

// Sprint 5A · Asistente de solicitud (A6). Lee la descripción y las fotos y sugiere:
// el servicio, la urgencia, lo que se ve en las fotos, los datos que faltan y, si hay riesgo,
// un aviso de seguridad. Nada cambia solo: cada sugerencia se aplica con un toque.
type Props = {
  estado: EstadoIA | null;
  nombre: string;
  prestadorId: string;
  servicioId: string | null;
  servicios: { id: string; title: string }[];
  descripcion: string;
  fotos: string[];
  urgencia: Urgencia;
  onServicio: (id: string) => void;
  onUrgencia: (u: Urgencia) => void;
  onAgregar: (texto: string) => void;
};

export function AsistenteIA(p: Props) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [s, setS] = useState<Sugerencia | null>(null);
  const [modo, setModo] = useState<'real' | 'demo' | null>(null);
  const [agregadas, setAgregadas] = useState<string[]>([]);

  if (!p.estado || p.estado.asistente === 'apagado') return null;
  const listo = p.descripcion.trim().length >= 10 || p.fotos.length > 0;

  async function revisar() {
    setCargando(true);
    setError(null);
    const r = await pedirSugerencias({ prestadorId: p.prestadorId, servicioId: p.servicioId, descripcion: p.descripcion, fotos: p.fotos });
    setCargando(false);
    if ('error' in r) return setError(r.error);
    setS(r.sugerencia);
    setModo(r.modo);
    setAgregadas([]);
  }

  const sugerido = s?.servicio_id ? p.servicios.find((x) => x.id === s.servicio_id) : null;
  const urg = s ? URGENCIAS.find((u) => u.value === s.urgencia)! : null;
  const preguntas = (s?.preguntas ?? []).filter((q) => !agregadas.includes(q));

  return (
    <View className="gap-3 rounded-2xl border border-primary-soft bg-card p-4" testID="asistente-ia">
      <View className="flex-row items-center gap-2">
        <Sparkles size={18} color={colors.primary} />
        <Text className="flex-1 font-sans-semibold text-base text-foreground">Revisa tu solicitud con IA</Text>
        {(modo ?? p.estado.asistente) === 'demo' ? <Badge tone="warning">Modo demo</Badge> : null}
      </View>

      {!s ? (
        <>
          <Text className="font-sans text-sm text-muted-foreground">
            {`Con tu descripción y tus fotos te sugerimos el servicio, la urgencia y qué más contarle a ${p.nombre} para que cotice mejor.`}
          </Text>
          <Button size="sm" variant="secondary" icon={Sparkles} onPress={revisar} loading={cargando} disabled={!listo}>
            Revisar mi solicitud
          </Button>
          {!listo ? <Text className="font-sans text-xs text-muted-foreground">Escribe qué está pasando o agrega una foto.</Text> : null}
        </>
      ) : (
        <>
          {s.aviso_seguridad ? <Note tone="warning">{s.aviso_seguridad}</Note> : null}

          {sugerido && sugerido.id !== p.servicioId ? (
            <Fila texto={`Parece que necesitas: ${sugerido.title}`} accion="Usar este" onPress={() => p.onServicio(sugerido.id)} />
          ) : sugerido ? (
            <Hecho texto="El servicio que elegiste coincide con lo que describes." />
          ) : null}

          {urg && urg.value !== p.urgencia ? (
            <Fila texto={`Parece ${urg.label.toLowerCase()}.${s.motivo_urgencia ? ` ${s.motivo_urgencia}` : ''}`} accion={`Cambiar a "${urg.label}"`}
              onPress={() => p.onUrgencia(urg.value)} />
          ) : null}

          {s.en_fotos ? (
            <View className="gap-1">
              <Text className="font-sans-semibold text-sm text-foreground">En tus fotos</Text>
              <Text className="font-sans text-sm text-foreground">{s.en_fotos}</Text>
            </View>
          ) : null}

          {preguntas.length ? (
            <View className="gap-2">
              <Text className="font-sans-semibold text-sm text-foreground">{`Para que ${p.nombre} cotice mejor, cuéntale:`}</Text>
              {preguntas.map((q) => (
                <Pressable key={q} accessibilityRole="button" accessibilityLabel={`Agregar a la descripción: ${q}`}
                  onPress={() => { p.onAgregar(q); setAgregadas([...agregadas, q]); }}
                  className="flex-row items-center gap-2 rounded-xl border border-border px-3 py-2.5 active:opacity-80">
                  <Plus size={16} color={colors.primary} />
                  <Text className="flex-1 font-sans text-sm text-foreground">{q}</Text>
                </Pressable>
              ))}
              <Text className="font-sans text-xs text-muted-foreground">Toca una pregunta para agregarla a tu descripción y contéstala ahí.</Text>
            </View>
          ) : agregadas.length ? <Hecho texto="Contesta en tu descripción lo que agregaste." /> : null}

          <View className="flex-row items-center justify-between gap-2">
            <Text className="flex-1 font-sans text-xs text-muted-foreground">Sugerencias hechas con IA. Revísalas antes de enviar.</Text>
            <Button size="sm" variant="ghost" onPress={revisar} loading={cargando}>Volver a revisar</Button>
          </View>
        </>
      )}
      {error ? <Note tone="error">{error}</Note> : null}
    </View>
  );
}

function Fila({ texto, accion, onPress }: { texto: string; accion: string; onPress: () => void }) {
  const [hecho, setHecho] = useState(false);
  if (hecho) return <Hecho texto="Listo, lo cambiamos." />;
  return (
    <View className="gap-2">
      <Text className="font-sans text-sm text-foreground">{texto}</Text>
      <View className="flex-row">
        <Button size="sm" variant="secondary" onPress={() => { onPress(); setHecho(true); }}>{accion}</Button>
      </View>
    </View>
  );
}

function Hecho({ texto }: { texto: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Check size={16} color={colors.success} />
      <Text className="flex-1 font-sans text-sm text-foreground">{texto}</Text>
    </View>
  );
}
