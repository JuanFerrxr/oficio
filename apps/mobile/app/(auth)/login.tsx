import { Proximamente } from '@/components/Proximamente';

export default function Entrar() {
  return (
    <Proximamente
      code="A0.1"
      title="Iniciar sesión"
      description="Teléfono o correo y contraseña, con 'Entrar con código por SMS' (A0.6) y '¿Olvidaste tu contraseña?' (A0.2)."
      sprint={1}
      back
    />
  );
}
