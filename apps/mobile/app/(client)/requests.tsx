import { Proximamente } from '@/components/Proximamente';

export default function Solicitudes() {
  return (
    <Proximamente
      code="A3.1"
      title="Solicitudes"
      description="En curso, rechazadas e historial. Desde aquí se abre el detalle (A7), se cancela (A7.1) y se califica (A8)."
      sprint={4}
    />
  );
}
