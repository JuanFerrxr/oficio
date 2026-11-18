import { Text, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import type { Punto } from '@/features/prestador/ubicacion';
import { colors } from '@/theme/colors';

// Sustituto del mapa para la versión web (solo pruebas automáticas): react-native-maps no
// funciona en el navegador. En el iPhone se usa MapaZona.tsx.
type Props = { punto: Punto; radioKm: number; onCambio: (p: Punto) => void };

export function MapaZona({ punto, radioKm }: Props) {
  return (
    <View className="h-[190px] items-center justify-center gap-2 rounded-2xl border border-border bg-primary-soft">
      <MapPin size={32} color={colors.primary} />
      <Text className="font-sans text-sm text-muted-foreground">
        {`${punto.lat.toFixed(4)}, ${punto.lng.toFixed(4)} · ${radioKm} km`}
      </Text>
    </View>
  );
}
