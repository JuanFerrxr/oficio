import { Text } from 'react-native';

// Figma: heading/2xl + body/base debajo
export function Title({ children, subtitle }: { children: string; subtitle?: string }) {
  return (
    <>
      <Text className="font-display text-2xl text-foreground">{children}</Text>
      {subtitle ? <Text className="-mt-2 font-sans text-base text-muted-foreground">{subtitle}</Text> : null}
    </>
  );
}
