import { Text, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import type { Punto } from '@/features/prestador/ubicacion';
import { colors } from '@/theme/colors';

// Sustituto del mapa para la versión web (solo pruebas automáticas): react-native-maps no
// funciona en el navegador. En el iPhone se usa MapaZona.tsx.
type Props = { punto: Punto; radioKm: number; onCambio: (p: Punto) => void; alto?: number; sinCirculo?: boolean };

export function MapaZona({ punto, radioKm, alto = 190, sinCirculo = false }: Props) {
  return (
    <View className="items-center justify-center gap-2 rounded-2xl border border-border bg-primary-soft" style={{ height: alto }}>
      <MapPin size={32} color={colors.primary} />
      <Text className="font-sans text-sm text-muted-foreground">
        {`${punto.lat.toFixed(4)}, ${punto.lng.toFixed(4)}${sinCirculo ? '' : ` · ${radioKm} km`}`}
      </Text>
    </View>
  );
}
