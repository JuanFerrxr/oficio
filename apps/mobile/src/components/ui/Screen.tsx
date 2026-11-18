import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Contenedor de todas las pantallas: respeta la muesca del iPhone, sube el contenido cuando
// aparece el teclado y deja el botón principal fijo abajo (BottomBar en `footer`).
type Props = { header?: ReactNode; children: ReactNode; footer?: ReactNode };

export function Screen({ header, children, footer }: Props) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {header}
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 px-5 pb-6 pt-2"
          keyboardShouldPersistTaps="handled"
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
