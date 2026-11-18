import { Text } from 'react-native';

// Logotipo provisional: "ofi" + "c" en cempasúchil + "io"
export function Logo({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  return (
    <Text className={`font-display-extrabold text-primary ${size === 'lg' ? 'text-3xl' : 'text-xl'}`}>
      ofi<Text className="text-accent">c</Text>io
    </Text>
  );
}
