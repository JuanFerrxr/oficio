import { Image, Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/ui';
import { hace } from '@/features/cliente/formato';
import { etiqueta, urlFoto, type Resena } from '@/features/resenas/resenas';
import { Estrellas } from './Estrellas';

// Figma: ReviewCard · Nombre · Fecha · Texto · Servicio · Mostrar fotos
export function ReviewCard({ r, onFoto }: { r: Resena; onFoto?: (url: string) => void }) {
  return (
    <View className="gap-2 rounded-2xl border border-border bg-card p-4" testID="resena">
      <View className="flex-row items-center gap-3">
        <Avatar name={r.autor || 'Cliente'} id={r.autor || r.id} uri={r.autor_avatar} size="md" />
        <View className="flex-1">
          <Text className="font-sans-bold text-sm text-foreground">{r.autor || 'Cliente'}</Text>
          <Text className="font-sans text-xs text-muted-foreground">{hace(r.created_at)}</Text>
        </View>
        <Estrellas valor={r.rating} />
      </View>
      {r.comment ? <Text className="font-sans text-sm text-foreground">{r.comment}</Text> : null}
      {r.tags?.length ? <Text className="font-sans-semibold text-xs text-primary">{r.tags.map(etiqueta).join(' · ')}</Text> : null}
      {r.fotos?.length ? (
        <View className="flex-row gap-2">
          {r.fotos.map((f) => (
            <Pressable key={f} onPress={() => onFoto?.(urlFoto(f))} accessibilityLabel="Ver foto">
              <Image source={{ uri: urlFoto(f) }} className="h-16 w-16 rounded-xl bg-border" />
            </Pressable>
          ))}
        </View>
      ) : null}
      <Text className="font-sans text-xs text-muted-foreground">{`Servicio contratado en Oficio · ${r.servicio}`}</Text>
    </View>
  );
}
