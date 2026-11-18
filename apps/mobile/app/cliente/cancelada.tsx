import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck } from 'lucide-react-native';
import { BottomBar, Button, Screen } from '@/components/ui';
import { colors } from '@/theme/colors';

// A7.2 · Solicitud cancelada
export default function SolicitudCancelada() {
  const { nombre } = useLocalSearchParams<{ nombre?: string }>();
  return (
    <Screen footer={<BottomBar><Button onPress={() => router.dismissTo({ pathname: '/requests', params: { pestana: 'historial' } })}>Ver mis solicitudes</Button></BottomBar>}>
      <View className="items-center gap-4 pt-24">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-success-soft">
          <CircleCheck size={40} color={colors.success} />
        </View>
        <Text className="text-center font-display text-2xl text-foreground">Cancelaste tu solicitud</Text>
        <Text className="text-center font-sans text-base text-muted-foreground">
          {`${nombre ? `Le avisamos a ${nombre}` : 'Le avisamos al prestador'}. La encontrarás en Solicitudes › Historial.`}
        </Text>
      </View>
    </Screen>
  );
}
