import { View } from 'react-native';
import { Proximamente } from '@/components/Proximamente';
import { EstadoAlta } from '@/components/prestador/EstadoAlta';
import { useAlta } from '@/features/prestador/alta';

// B4 · Solicitudes (bandeja). La bandeja real llega en el Sprint 3. Desde el Sprint 2 muestra arriba
// en qué va el alta: qué pasos faltan o si está en revisión.
export default function Bandeja() {
  const { perfil, faltantes, cargando } = useAlta();
  return (
    <Proximamente
      code="B4"
      title="Solicitudes"
      description="Nuevas, activas e historial, con el interruptor Disponible y el contador de 2 horas. Desde aquí se cotiza (B5)."
      sprint={3}
      arriba={cargando ? null : <View><EstadoAlta perfil={perfil} faltantes={faltantes} /></View>}
    />
  );
}
