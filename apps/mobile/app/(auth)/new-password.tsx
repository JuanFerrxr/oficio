import { useState } from 'react';
import { router } from 'expo-router';
import { AppBar, BottomBar, Button, Note, Screen, Title } from '@/components/ui';
import { CamposContrasena } from '@/components/auth/CamposContrasena';
import { esValida } from '@/features/auth/contrasena';
import { mensajeDeError } from '@/features/auth/errores';
import { supabase } from '@/lib/supabase';

// A0.4 · Crea una nueva contraseña. Supabase rechaza la misma contraseña (same_password).
// Al guardar se cierran las sesiones en otros dispositivos.
export default function NuevaContrasena() {
  const [contrasena, setContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const lista = esValida(contrasena) && contrasena === confirmacion;

  async function guardar() {
    if (!lista) return;
    setEnviando(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password: contrasena });
    if (error) {
      setEnviando(false);
      return setError(mensajeDeError(error));
    }
    await supabase.auth.signOut({ scope: 'others' });
    setEnviando(false);
    router.replace('/password-updated');
  }

  return (
    <Screen
      header={<AppBar back={false} />}
      footer={
        <BottomBar>
          <Button onPress={guardar} disabled={!lista} loading={enviando}>Guardar contraseña</Button>
        </BottomBar>
      }
    >
      <Title subtitle="No puede ser igual a la anterior. Al guardarla cerraremos tu sesión en otros dispositivos.">
        Crea una nueva contraseña
      </Title>
      {error ? <Note tone="error">{error}</Note> : null}
      <CamposContrasena
        etiqueta="Nueva contraseña"
        contrasena={contrasena}
        confirmacion={confirmacion}
        onContrasena={setContrasena}
        onConfirmacion={setConfirmacion}
      />
    </Screen>
  );
}
