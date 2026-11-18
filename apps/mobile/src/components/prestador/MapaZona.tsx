import { View } from 'react-native';
import MapView, { Circle, Marker, type MapPressEvent } from 'react-native-maps';
import type { Punto } from '@/features/prestador/ubicacion';
import { colors } from '@/theme/colors';

// B2 · Mapa con el punto desde donde trabajas y el círculo de tu distancia máxima.
// También para marcar una dirección del cliente (sinCirculo).
// En el iPhone usa Apple Maps (no necesita llave). Toca el mapa o arrastra el pin para moverlo.
// La versión web (MapaZona.web.tsx) solo existe para las pruebas automáticas.
type Props = { punto: Punto; radioKm: number; onCambio: (p: Punto) => void; alto?: number; sinCirculo?: boolean };

export function MapaZona({ punto, radioKm, onCambio, alto = 190, sinCirculo = false }: Props) {
  // El encuadre se ajusta al radio: el círculo completo cabe en el mapa
  const delta = Math.max(0.02, (radioKm * 2.6) / 111);
  const mover = (e: MapPressEvent) => onCambio({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude });

  return (
    <View className="overflow-hidden rounded-2xl border border-border" style={{ height: alto }}>
      <MapView
        style={{ flex: 1 }}
        region={{ latitude: punto.lat, longitude: punto.lng, latitudeDelta: delta, longitudeDelta: delta }}
        onPress={mover}
        toolbarEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        {sinCirculo ? null : <Circle
          center={{ latitude: punto.lat, longitude: punto.lng }}
          radius={radioKm * 1000}
          strokeColor={colors.primary}
          strokeWidth={2}
          fillColor="rgba(31, 79, 209, 0.12)"
        />}
        <Marker
          coordinate={{ latitude: punto.lat, longitude: punto.lng }}
          draggable
          onDragEnd={(e) => onCambio({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })}
          pinColor={colors.primary}
        />
      </MapView>
    </View>
  );
}
