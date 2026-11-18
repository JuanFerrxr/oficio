import { Proximamente } from '@/components/Proximamente';

export default function Bandeja() {
  return (
    <Proximamente
      code="B4"
      title="Solicitudes"
      description="Nuevas, activas e historial, con el interruptor Disponible y el contador de 2 horas. Desde aquí se cotiza (B5)."
      sprint={3}
      showExit
    />
  );
}
