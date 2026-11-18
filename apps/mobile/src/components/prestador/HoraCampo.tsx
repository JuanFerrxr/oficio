import { useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { HORAS } from '@/features/prestador/horario';
import { colors } from '@/theme/colors';

// B2 · Desde / Hasta. Se ve como un TextField; al tocarlo abre la lista de horas (cada 30 min).
type Props = { label: string; value: string; onChange: (h: string) => void; testID?: string };

export function HoraCampo({ label, value, onChange, testID }: Props) {
  const [abierto, setAbierto] = useState(false);
  return (
    <View className="gap-1.5">
      <Text className="font-sans-semibold text-sm text-foreground">{label}</Text>
      <Pressable
        onPress={() => setAbierto(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        testID={testID}
        className="h-12 flex-row items-center justify-between rounded-xl border border-border bg-card px-3"
      >
        <Text className="font-sans text-base text-foreground">{value}</Text>
        <ChevronDown size={18} color={colors.mutedForeground} />
      </Pressable>
      <Modal visible={abierto} transparent animationType="slide" onRequestClose={() => setAbierto(false)}>
        <Pressable className="flex-1 justify-end" style={{ backgroundColor: 'rgba(18, 26, 46, 0.35)' }} onPress={() => setAbierto(false)}>
          <View className="max-h-[60%] rounded-t-3xl bg-card pb-8 pt-3">
            <Text className="px-5 pb-2 font-display text-lg text-foreground">{label}</Text>
            <FlatList
              data={HORAS}
              keyExtractor={(h) => h}
              initialScrollIndex={Math.max(0, HORAS.indexOf(value) - 2)}
              getItemLayout={(_, i) => ({ length: 48, offset: 48 * i, index: i })}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { onChange(item); setAbierto(false); }}
                  className={`h-12 justify-center px-5 ${item === value ? 'bg-primary-soft' : ''}`}
                >
                  <Text className={`font-sans text-base ${item === value ? 'font-sans-bold text-primary' : 'text-foreground'}`}>{item}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
