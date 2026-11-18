import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Circle, CircleCheck, Clock, ShieldCheck, TriangleAlert } from 'lucide-react-native';
import { Badge, Button } from '@/components/ui';
import { PASOS, pasoCompleto, siguientePaso, type DatosAlta } from '@/features/prestador/alta';
import { colors } from '@/theme/colors';

// Tarjeta de la bandeja (B4) mientras el perfil no está aprobado: qué falta y en qué va la revisión.
export function EstadoAlta({ perfil, faltantes }: Pick<DatosAlta, 'perfil' | 'faltantes'>) {
  const estado = perfil?.verification_status ?? 'unverified';

  if (estado === 'verified') return null;

  if (estado === 'pending') {
    return (
      <View className="gap-3 rounded-2xl border border-border bg-card p-4" testID="estado-alta">
        <Badge tone="warning" icon={Clock}>En revisión</Badge>
        <Text className="font-display text-lg text-foreground">Recibimos tu alta</Text>
        <Text className="font-sans text-sm text-muted-foreground">
          Estamos revisando tus documentos. Mientras tanto, tu perfil no aparece en las búsquedas. Te avisaremos por correo cuando
          terminemos.
        </Text>
        <Button size="sm" variant="secondary" onPress={() => router.push('/alta/verificacion')}>Ver mis documentos</Button>
      </View>
    );
  }

  if (estado === 'rejected') {
    return (
      <View className="gap-3 rounded-2xl border border-border bg-card p-4" testID="estado-alta">
        <Badge tone="danger" icon={TriangleAlert}>Necesita cambios</Badge>
        <Text className="font-sans text-sm text-muted-foreground">Revisa tus documentos y vuelve a enviarlos.</Text>
        <Button size="sm" onPress={() => router.push('/alta/verificacion')}>Revisar documentos</Button>
      </View>
    );
  }

  const completos = PASOS.filter((p) => pasoCompleto(p, faltantes)).length;
  return (
    <View className="gap-3 rounded-2xl border border-border bg-card p-4" testID="estado-alta">
      <Badge tone="primary" icon={ShieldCheck}>{`${completos} de ${PASOS.length} pasos`}</Badge>
      <Text className="font-display text-lg text-foreground">Termina tu alta</Text>
      <Text className="font-sans text-sm text-muted-foreground">
        Cuando la envíes a revisión y la aprobemos, tu perfil aparecerá en las búsquedas.
      </Text>
      <View className="gap-2">
        {PASOS.map((p) => {
          const ok = pasoCompleto(p, faltantes);
          return (
            <View key={p.clave} className="flex-row items-center gap-2">
              {ok ? <CircleCheck size={18} color={colors.success} /> : <Circle size={18} color={colors.mutedForeground} />}
              <Text className={`font-sans text-sm ${ok ? 'text-foreground' : 'text-muted-foreground'}`}>{p.titulo}</Text>
            </View>
          );
        })}
      </View>
      <Button onPress={() => router.push(siguientePaso(faltantes))}>
        {faltantes.length === 0 ? 'Enviar a revisión' : 'Continuar'}
      </Button>
    </View>
  );
}
