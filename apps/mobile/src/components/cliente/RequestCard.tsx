import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Badge } from '@/components/ui';

// Figma: RequestCard · Servicio · Prestador · Detalle · Nota · Estado
// Estados: Enviada · Vista · Aceptada · Rechazada · Completada · Cancelada
// Sprint 3B agrega los que usa la bandeja del prestador: Cotizada, En curso y Expirada.
export type EstadoTarjeta = 'enviada' | 'vista' | 'aceptada' | 'cotizada' | 'confirmada' | 'trabajando' | 'rechazada' | 'expirada' | 'completada' | 'cancelada';
const BADGE: Record<EstadoTarjeta, { texto: string; tono: 'primary' | 'warning' | 'success' | 'danger' }> = {
  enviada: { texto: 'Enviada', tono: 'primary' },
  vista: { texto: 'Vista', tono: 'warning' },
  aceptada: { texto: 'Aceptada', tono: 'success' },
  cotizada: { texto: 'Cotizada', tono: 'primary' },
  confirmada: { texto: 'Confirmada', tono: 'success' },
  trabajando: { texto: 'En curso', tono: 'warning' },
  rechazada: { texto: 'Rechazada', tono: 'danger' },
  expirada: { texto: 'Expirada', tono: 'danger' },
  completada: { texto: 'Completada', tono: 'success' },
  cancelada: { texto: 'Cancelada', tono: 'danger' },
};

type Props = {
  servicio: string;
  prestador: string;
  detalle: string;
  nota?: string;
  /** Lo que pidió el cliente, en una línea: ayuda a distinguir dos solicitudes del mismo servicio */
  descripcion?: string;
  estado: EstadoTarjeta;
  onPress?: () => void;
  /** Acciones debajo (Confirmar, Calificar, Iniciar trabajo…) */
  children?: ReactNode;
};

export function RequestCard({ servicio, prestador, detalle, nota, descripcion, estado, onPress, children }: Props) {
  const b = BADGE[estado];
  const contenido = (
    <>
      <View className="flex-row items-start justify-between gap-2">
        <Text className="flex-1 font-sans-bold text-base text-foreground">{servicio}</Text>
        <Badge tone={b.tono}>{b.texto}</Badge>
      </View>
      <Text className="font-sans text-sm text-muted-foreground">{prestador}</Text>
      {descripcion ? <Text numberOfLines={1} className="font-sans text-sm italic text-muted-foreground">{`“${descripcion}”`}</Text> : null}
      <Text className="font-sans-semibold text-sm text-foreground">{detalle}</Text>
      {nota ? <Text className="font-sans text-sm text-muted-foreground">{nota}</Text> : null}
      {children}
    </>
  );
  const clase = 'gap-2 rounded-2xl border border-border bg-card p-4';
  // Sin onPress es una vista normal: un Pressable deshabilitado también deshabilitaría los botones de adentro
  if (!onPress) return <View className={clase} testID="tarjeta-solicitud">{contenido}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" className={`${clase} active:opacity-90`} testID="tarjeta-solicitud">
      {contenido}
    </Pressable>
  );
}
