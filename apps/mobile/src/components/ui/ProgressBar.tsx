import { View } from 'react-native';

// Figma: ProgressBar · value (paso / total)
export function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.max(0, Math.min(1, step / total)) * 100;
  return (
    <View
      className="h-1.5 overflow-hidden rounded-full bg-border"
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: step }}
    >
      <View className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </View>
  );
}
