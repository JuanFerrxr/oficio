import { useState } from 'react';
import { Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { AppBar, BottomBar, Button, Note, ProgressBar, Screen, TextLink, Title } from '@/components/ui';
import { CamposContrasena } from '@/components/auth/CamposContrasena';
import { esValida } from '@/features/auth/contrasena';
import { mensajeDeError } from '@/features/auth/errores';
import { nombreCompleto, useFlujo, VERSION_TERMINOS } from '@/features/auth/flujo';
import { PASO_REGISTRO, TEXTOS_REGISTRO } from '@/features/auth/pasos';
import { supabase } from '@/lib/supabase';

// A1.2 · Crea una contraseña (Paso 2 de 4; para el prestador B0.1b, Paso 1 de 5). Aquí se crea la cuenta en Supabase con teléfono y
// contraseña; Supabase manda el SMS del paso 3. El correo se agrega en el paso 4.
export default function CreaContrasena() {
  const { registro } = useFlujo();
  const [contrasena, setContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [yaExiste, setYaExiste] = useState(false);
  const [enviando, setEnviando] = useState(false);

  if (!registro) return <Redirect href="/register" />;

  const lista = esValida(contrasena) && contrasena === confirmacion;
  const { paso, total } = PASO_REGISTRO[registro.rol].contrasena;

  async function continuar() {
    if (!registro || !lista) return;
    setEnviando(true);
    setError(null);
    setYaExiste(false);
    const { data, error } = await supabase.auth.signUp({
      phone: registro.telefono,
      password: contrasena,
      options: {
        // handle_new_user (migración 20261118) copia esto al perfil. La fecha del consentimiento
        // la pone el servidor, no el teléfono.
        data: {
          full_name: nombreCompleto(registro),
          accepted_terms: true,
          terms_version: VERSION_TERMINOS,
          intended_role: registro.rol,
        },
      },
    });
    setEnviando(false);
    if (error) return setError(mensajeDeError(error));
    // Si el teléfono ya tiene cuenta confirmada, Supabase responde "ok" sin crear nada (para no
    // revelar qué números existen) y sin identidades. Lo detectamos para orientar a la persona.
    if (data.user && data.user.identities?.length === 0) {
      setYaExiste(true);
      return;
    }
    router.push('/verify-phone');
  }

  return (
    <Screen
      header={
        <>
          <AppBar right={`Paso ${paso} de ${total}`} />
          <View className="px-5 pb-2"><ProgressBar step={paso} total={total} /></View>
        </>
      }
      footer={
        <BottomBar helper="Después verificaremos tu teléfono y tu correo.">
          <Button onPress={continuar} disabled={!lista} loading={enviando}>Continuar</Button>
        </BottomBar>
      }
    >
      <Title subtitle={TEXTOS_REGISTRO[registro.rol].subtituloContrasena}>Crea una contraseña</Title>
      {yaExiste ? (
        <Note tone="warning">
          <Text>
            Ese teléfono ya tiene una cuenta. <TextLink onPress={() => router.replace('/login')}>Entra</TextLink> o{' '}
            <TextLink onPress={() => router.replace('/forgot')}>recupera tu contraseña</TextLink>.
          </Text>
        </Note>
      ) : null}
      {error ? <Note tone="error">{error}</Note> : null}
      <CamposContrasena
        contrasena={contrasena}
        confirmacion={confirmacion}
        onContrasena={setContrasena}
        onConfirmacion={setConfirmacion}
      />
    </Screen>
  );
}
