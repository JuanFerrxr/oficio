import { Pressable, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const TEXTO = ['', 'Muy mal', 'Mal', 'Regular', 'Bien', 'Excelente'];

/** Estrellas de una reseña. Con `onChange` se pueden tocar (A8). */
export function Estrellas({ valor, tamano = 14, onChange }: { valor: number; tamano?: number; onChange?: (n: number) => void }) {
  return (
    <View className="flex-row items-center gap-1" accessibilityLabel={`${valor} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const llena = n <= valor;
        const icono = <Star size={tamano} color={llena ? colors.accent : colors.border} fill={llena ? colors.accent : 'transparent'} />;
        return onChange ? (
          <Pressable key={n} onPress={() => onChange(n)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${n} ${n === 1 ? 'estrella' : 'estrellas'} · ${TEXTO[n]}`} testID={`estrella-${n}`}>
            {icono}
          </Pressable>
        ) : <View key={n}>{icono}</View>;
      })}
    </View>
  );
}
export const textoEstrellas = (n: number) => TEXTO[n] ?? '';
