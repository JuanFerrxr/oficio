import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Figma: BottomBar · helper? · children (Button)
export function BottomBar({ helper, children }: { helper?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="gap-2 border-t border-border bg-card px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
      {helper ? <Text className="text-center font-sans-medium text-xs text-muted-foreground">{helper}</Text> : null}
      {children}
    </View>
  );
}
