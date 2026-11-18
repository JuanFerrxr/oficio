import { Linking, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Hammer } from 'lucide-react-native';
import { AppBar, Badge, Button, Screen } from '@/components/ui';
import { colors } from '@/theme/colors';

const FIGMA = 'https://www.figma.com/design/0MlqQqhAWVo13XUES3fDrK';

// Pantalla provisional del Sprint 0. Cada ruta existe y se puede navegar; su contenido
// real llega en el sprint indicado. El código (A3, B4…) es el mismo frame de Figma.
type Props = {
  code: string;
  title: string;
  description: string;
  /** Sprint en que se construye (1–4, antes de la beta) o 'post-beta' */
  sprint: number | 'post-beta';
  /** Muestra "Volver a la bienvenida" (solo en las pestañas de inicio) */
  showExit?: boolean;
  back?: boolean;
};

export function Proximamente({ code, title, description, sprint, showExit = false, back = false }: Props) {
  return (
    <Screen header={<AppBar title={title} back={back} />}>
      <View className="gap-4 rounded-2xl border border-border bg-card p-5">
        <View className="flex-row items-center justify-between">
          <Badge tone="primary">{code}</Badge>
          <Badge tone="warning" icon={Hammer}>{typeof sprint === 'number' ? `Sprint ${sprint}` : 'Después de la beta'}</Badge>
        </View>
        <Text className="font-display text-xl text-foreground">{title}</Text>
        <Text className="font-sans text-base text-muted-foreground">{description}</Text>
        <Button variant="secondary" size="sm" onPress={() => Linking.openURL(FIGMA)}>
          Ver el diseño en Figma
        </Button>
      </View>
      {showExit ? (
        <View className="gap-2">
          <Text className="font-sans text-sm text-muted-foreground">
            En el Sprint 0 puedes moverte libremente entre las pantallas. El acceso con cuenta llega en el Sprint 1.
          </Text>
          <Button variant="ghost" size="sm" onPress={() => router.replace('/welcome')}>
            Volver a la bienvenida
          </Button>
        </View>
      ) : null}
      <View className="items-center pt-4">
        <Hammer size={20} color={colors.border} />
      </View>
    </Screen>
  );
}
