import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { TextLink } from '@/components/ui';

// Encabezado de sección de A3/A3.0: "Tus favoritos" ··· "Ver todos"
export function Seccion({ titulo, accion, onAccion, subtitulo, children }: {
  titulo: string; accion?: string; onAccion?: () => void; subtitulo?: string; children: ReactNode;
}) {
  return (
    <View className="gap-3">
      <View className="gap-1">
        <View className="flex-row items-center justify-between">
          <Text className="font-display text-lg text-foreground">{titulo}</Text>
          {accion && onAccion ? <Text className="text-sm"><TextLink onPress={onAccion}>{accion}</TextLink></Text> : null}
        </View>
        {subtitulo ? <Text className="font-sans text-sm text-muted-foreground">{subtitulo}</Text> : null}
      </View>
      {children}
    </View>
  );
}
