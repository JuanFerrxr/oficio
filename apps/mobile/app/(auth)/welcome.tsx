import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Baby, Droplet, Paintbrush, Wrench, Zap, type LucideIcon } from 'lucide-react-native';
import { Button, Logo } from '@/components/ui';
import { colors } from '@/theme/colors';

// A1 · Bienvenida. Se elige el rol desde el inicio para no mezclar flujos; la cuenta es la misma
// y el rol se puede cambiar después en Perfil.
const OFICIOS: { icon: LucideIcon; label: string }[] = [
  { icon: Droplet, label: 'Plomería' },
  { icon: Zap, label: 'Electricidad' },
  { icon: Paintbrush, label: 'Pintura' },
  { icon: Baby, label: 'Niñeras' },
];

export default function Bienvenida() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom', 'left', 'right']}>
      <View className="flex-1 justify-between px-5 pb-4 pt-10">
        <View className="gap-4">
          <Logo />
          <Text className="font-display-extrabold text-3xl text-foreground">
            Encuentra a quien sabe hacerlo, cerca de ti.
          </Text>
          <Text className="font-sans text-base text-muted-foreground">
            Plomeros, electricistas, pintores, niñeras y más. Verificados y con reseñas reales.
          </Text>
        </View>

        {/* Figma: CategoryTile */}
        <View className="flex-row justify-between">
          {OFICIOS.map(({ icon: Icon, label }) => (
            <View key={label} className="items-center gap-1.5">
              <View className="size-15 items-center justify-center rounded-2xl bg-primary-soft">
                <Icon size={26} color={colors.primary} />
              </View>
              <Text className="font-sans-medium text-xs text-muted-foreground">{label}</Text>
            </View>
          ))}
        </View>

        <View className="gap-3">
          <Button onPress={() => router.push('/register')}>Necesito un servicio</Button>
          <Button variant="secondary" onPress={() => router.push('/provider-signup')}>
            Ofrezco mis servicios
          </Button>
          <View className="items-center gap-2 py-1">
            <Pressable onPress={() => router.push('/login')} hitSlop={8}>
              <Text className="font-sans text-sm text-muted-foreground">
                ¿Ya tienes cuenta? <Text className="font-sans-bold text-primary">Entra</Text>
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push('/forgot')} hitSlop={8}>
              <Text className="font-sans-semibold text-sm text-primary">¿Olvidaste tu contraseña?</Text>
            </Pressable>
          </View>

          {__DEV__ ? (
            <Pressable onPress={() => router.push('/dev')} hitSlop={8} className="flex-row items-center justify-center gap-1.5 pt-2">
              <Wrench size={14} color={colors.mutedForeground} />
              <Text className="font-sans-semibold text-xs text-muted-foreground">Herramientas de desarrollo</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}
