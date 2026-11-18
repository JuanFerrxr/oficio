import type { ReactNode } from 'react';
import { View } from 'react-native';
import { AppBar, ProgressBar } from '@/components/ui';

// Encabezado de los pasos del alta: "Paso 3 de 5" + barra. Desde B8 (editar) muestra el título.
export function EncabezadoAlta({ paso, titulo, editando }: { paso: number; titulo?: string; editando?: boolean }): ReactNode {
  if (editando) return <AppBar title={titulo} />;
  return (
    <>
      <AppBar right={`Paso ${paso} de 5`} />
      <View className="px-5 pb-2"><ProgressBar step={paso} total={5} /></View>
    </>
  );
}
