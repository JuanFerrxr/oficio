import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors } from '@/theme/colors';

// Figma: Checkbox · checked
export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      className="flex-row items-start gap-3"
    >
      <View
        className={`mt-0.5 size-[22px] items-center justify-center rounded-md ${checked ? 'bg-primary' : 'border-[1.5px] border-border bg-card'}`}
      >
        {checked ? <Check size={14} color={colors.primaryForeground} strokeWidth={3} /> : null}
      </View>
      <View className="flex-1">{children}</View>
    </Pressable>
  );
}
