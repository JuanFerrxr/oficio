import { Linking, Text, View } from 'react-native';
import { Hammer } from 'lucide-react-native';
import { AppBar, Badge, Button, Screen } from '@/components/ui';
import { colors } from '@/theme/colors';

const FIGMA = 'https://www.figma.com/design/0MlqQqhAWVo13XUES3fDrK';

// Pantalla provisional. Cada ruta existe y se puede navegar; su contenido
// real llega en el sprint indicado. El código (A3, B4…) es el mismo frame de Figma.
type Props = {
  code: string;
  title: string;
  description: string;
  /** Sprint en que se construye (1–4, antes de la beta) o 'post-beta' */
  sprint: number | 'post-beta';
  /** Muestra la nota de la cuenta (solo en las pestañas de inicio) */
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
        <Text className="font-sans text-sm text-muted-foreground">
          Tu cuenta ya funciona: puedes revisar tus datos o cerrar sesión en la pestaña Perfil.
        </Text>
      ) : null}
      <View className="items-center pt-4">
        <Hammer size={20} color={colors.border} />
      </View>
    </Screen>
  );
}
