import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';

// Contenedor de todas las pantallas: respeta la muesca del iPhone, sube el contenido cuando
// aparece el teclado y deja el botón principal fijo abajo (BottomBar en `footer`).
type Props = {
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Jalar hacia abajo para recargar (listas de solicitudes) */
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function Screen({ header, children, footer, onRefresh, refreshing = false }: Props) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {header}
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 px-5 pb-6 pt-2"
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
        >
          {children}
        </ScrollView>
        {footer ?? <SafeAreaView edges={['bottom']} />}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Spacer() {
  return <View className="flex-1" />;
}
