import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/theme/colors';

// Piezas que comparten los detalles de solicitud del cliente (A7) y del prestador (B4).
export function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="font-sans-bold text-sm text-muted-foreground">{titulo}</Text>
      {children}
    </View>
  );
}

export function Fila({ icono: Icono, texto }: { icono: LucideIcon; texto: string }) {
  return (
    <View className="flex-row items-start gap-2">
      <Icono size={16} color={colors.mutedForeground} />
      <Text className="flex-1 font-sans text-sm text-foreground">{texto}</Text>
    </View>
  );
}

/** Figma: TimelineItem · Título · Detalle · hecho / actual / pendiente */
export function PasoLinea({ titulo, detalle, estado, ultimo }: { titulo: string; detalle?: string; estado: 'hecho' | 'actual' | 'pendiente' | 'alerta'; ultimo?: boolean }) {
  const punto = estado === 'hecho' ? 'bg-success' : estado === 'actual' ? 'bg-primary' : estado === 'alerta' ? 'bg-danger' : 'border-2 border-border bg-card';
  return (
    <View className="flex-row gap-3" testID={`paso-${estado}`}>
      <View className="items-center">
        <View className={`mt-1 h-3 w-3 rounded-full ${punto}`} />
        {!ultimo ? <View className={`w-0.5 flex-1 ${estado === 'hecho' ? 'bg-success' : 'bg-border'}`} /> : null}
      </View>
      <View className="flex-1 gap-0.5 pb-4">
        <Text className={`font-sans-semibold text-sm ${estado === 'pendiente' ? 'text-muted-foreground' : 'text-foreground'}`}>{titulo}</Text>
        {detalle ? <Text className="font-sans text-xs text-muted-foreground">{detalle}</Text> : null}
      </View>
    </View>
  );
}
