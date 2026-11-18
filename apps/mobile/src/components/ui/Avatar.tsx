import { Text, View } from 'react-native';

// Figma: Avatar · size md|lg|xl · tone 1–4 · initials
// El tono sale del id de la persona, así cada quien conserva su color en todas las pantallas.
type Size = 'md' | 'lg' | 'xl';
type Tone = 1 | 2 | 3 | 4;

const caja: Record<Size, string> = { md: 'size-10', lg: 'size-14', xl: 'size-20' };
const letra: Record<Size, string> = { md: 'text-sm', lg: 'text-lg', xl: 'text-2xl' };
const fondo: Record<Tone, string> = { 1: 'bg-avatar-1', 2: 'bg-avatar-2', 3: 'bg-avatar-3', 4: 'bg-avatar-4' };
const tinta: Record<Tone, string> = {
  1: 'text-avatar-1-foreground',
  2: 'text-avatar-2-foreground',
  3: 'text-avatar-3-foreground',
  4: 'text-avatar-4-foreground',
};

/** Tono estable a partir de un id (uuid o cualquier texto). */
export function avatarTone(id: string): Tone {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ((h % 4) + 1) as Tone;
}

/** "Mariana García López" → "MG" */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

type Props = { name: string; size?: Size; tone?: Tone; id?: string };

export function Avatar({ name, size = 'md', tone, id }: Props) {
  const t = tone ?? avatarTone(id ?? name);
  return (
    <View className={`items-center justify-center rounded-full ${caja[size]} ${fondo[t]}`} accessibilityLabel={name}>
      <Text className={`font-sans-bold ${letra[size]} ${tinta[t]}`}>{initials(name)}</Text>
    </View>
  );
}
