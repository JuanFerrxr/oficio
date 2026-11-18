import { Text, View } from 'react-native';
import { Checkbox } from '@/components/ui';

// Figma: PaymentOption · Método · Detalle · On/Off (A6)
export function PaymentOption({ metodo, detalle, on, onChange }: { metodo: string; detalle: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <View className={`rounded-xl border bg-card p-3 ${on ? 'border-primary' : 'border-border'}`}>
      <Checkbox checked={on} onChange={onChange}>
        <View className="gap-0.5">
          <Text className="font-sans-semibold text-base text-foreground">{metodo}</Text>
          <Text className="font-sans text-sm text-muted-foreground">{detalle}</Text>
        </View>
      </Checkbox>
    </View>
  );
}
