import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Camera } from 'lucide-react-native';
import { OpcionesFoto } from './OpcionesFoto';
import type { Foto } from '@/features/prestador/archivos';
import { colors } from '@/theme/colors';

// B0.1 · Foto de perfil (Figma: Thumbnail / Tipo=Agregar + texto)
type Props = { uri?: string | null; onFoto: (foto: Foto) => void };

export function FotoPerfil({ uri, onFoto }: Props) {
  const [abierto, setAbierto] = useState(false);
  return (
    <View className="gap-3">
      <Pressable onPress={() => setAbierto((v) => !v)} className="flex-row items-center gap-4" accessibilityRole="button" accessibilityLabel="Foto de perfil">
        {uri ? (
          <Image source={{ uri }} style={{ width: 72, height: 72, borderRadius: 16 }} />
        ) : (
          <View className="size-18 items-center justify-center rounded-2xl border border-dashed border-border bg-card">
            <Camera size={26} color={colors.mutedForeground} />
          </View>
        )}
        <View className="flex-1 gap-0.5">
          <Text className="font-sans-semibold text-base text-foreground">Foto de perfil</Text>
          <Text className="font-sans text-sm text-muted-foreground">Una foto clara de tu cara genera más confianza.</Text>
          <Text className="font-sans-bold text-sm text-primary">{uri ? 'Cambiar foto' : 'Agregar foto'}</Text>
        </View>
      </Pressable>
      {abierto ? <OpcionesFoto cuadrada frontal onFoto={(f) => { onFoto(f); setAbierto(false); }} /> : null}
    </View>
  );
}
