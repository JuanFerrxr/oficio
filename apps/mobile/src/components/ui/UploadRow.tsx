import { Pressable, Text, View } from 'react-native';
import { ChevronRight, CircleCheck, Clock, FileUp, type LucideIcon } from 'lucide-react-native';
import { colors } from '@/theme/colors';

// Figma: UploadRow · título · detalle · estado Subido|Pendiente
// B1 (certificaciones) y B3 (INE, selfie, comprobante). Va dentro de un ListGroup.
type Estado = 'subido' | 'pendiente' | 'revision';
const icono: Record<Estado, { I: LucideIcon; color: string; fondo: string }> = {
  subido: { I: CircleCheck, color: colors.success, fondo: 'bg-success-soft' },
  revision: { I: Clock, color: colors.warning, fondo: 'bg-warning-soft' },
  pendiente: { I: FileUp, color: colors.mutedForeground, fondo: 'bg-background' },
};

type Props = { title: string; detail?: string; estado: Estado; last?: boolean; onPress?: () => void; testID?: string };

export function UploadRow({ title, detail, estado, last = false, onPress, testID }: Props) {
  const { I, color, fondo } = icono[estado];
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      testID={testID}
      className={`flex-row items-center gap-3 px-3.5 py-3 active:bg-background ${last ? '' : 'border-b border-border'}`}
    >
      <View className={`size-10 items-center justify-center rounded-xl ${fondo}`}>
        <I size={20} color={color} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-semibold text-base text-foreground">{title}</Text>
        {detail ? <Text className="font-sans text-sm text-muted-foreground">{detail}</Text> : null}
      </View>
      {onPress ? <ChevronRight size={18} color={colors.mutedForeground} /> : null}
    </Pressable>
  );
}
