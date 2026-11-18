import { Text, View } from 'react-native';
import type { Resumen } from '@/features/resenas/resenas';
import { Estrellas } from './Estrellas';

// Encabezado de A5.1 y B7: promedio grande y barras por estrella (5 → 1)
export function ResumenResenas({ resumen }: { resumen: Resumen }) {
  const total = resumen.rating_count || 0;
  const max = Math.max(1, ...Object.values(resumen.por_estrella ?? {}));
  return (
    <View className="flex-row items-center gap-5 rounded-2xl border border-border bg-card p-4" testID="resumen-resenas">
      <View className="items-center gap-1">
        <Text className="font-display text-4xl text-foreground">{total ? Number(resumen.rating_avg).toFixed(1) : '—'}</Text>
        <Estrellas valor={Math.round(Number(resumen.rating_avg))} />
        <Text className="font-sans text-xs text-muted-foreground">{`${total} ${total === 1 ? 'reseña' : 'reseñas'}`}</Text>
      </View>
      <View className="flex-1 gap-1">
        {[5, 4, 3, 2, 1].map((n) => {
          const c = resumen.por_estrella?.[String(n)] ?? 0;
          return (
            <View key={n} className="flex-row items-center gap-2">
              <Text className="w-3 font-sans-semibold text-xs text-muted-foreground">{n}</Text>
              <View className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                <View className="h-2 rounded-full bg-accent" style={{ width: `${(c / max) * 100}%` }} />
              </View>
              <Text className="w-7 text-right font-sans text-xs text-muted-foreground">{c}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
