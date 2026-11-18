import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { AppBar, BottomBar, Button, Note, OTPInput, ProgressBar, Screen, TextField, TextLink, Title } from '@/components/ui';
import { mensajeDeError } from '@/features/auth/errores';
import { actualizarFlujo, useFlujo } from '@/features/auth/flujo';
import { useSession } from '@/features/auth/session';
import { esCorreo } from '@/features/auth/telefono';
import { supabase } from '@/lib/supabase';

// A2.1 · Verifica tu correo (Paso 4 de 4). Se llega de dos formas:
// - Registro: el paso 3 ya pidió el código (updateUser) y `pendiente` = 'correo'.
// - Perfil: "Correo electrónico · Agregar". Empieza pidiendo el correo.
// El correo solo se guarda en el perfil cuando el código es correcto (trigger handle_user_updated).
export default function VerificaCorreo() {
  const { registro, pendiente } = useFlujo();
  const { session } = useSession();
  const params = useLocalSearchParams<{ error?: string }>();
  const enRegistro = pendiente === 'correo';

  const pendienteDeAuth = session?.user.new_email ?? '';
  const inicial = registro?.correo ?? pendienteDeAuth;
  const [correo, setCorreo] = useState(inicial);
  const [editando, setEditando] = useState(!inicial || params.error === 'email_exists');
  const [nuevoCorreo, setNuevoCorreo] = useState(inicial);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (params.error === 'email_exists') setError('Ese correo ya está registrado en otra cuenta. Escribe otro.');
    else if (params.error === 'envio') setError('No pudimos mandar el código. Revisa el correo y vuelve a intentarlo.');
  }, [params.error]);

  function terminar() {
    if (enRegistro) {
      actualizarFlujo({ pendiente: null, registro: null });
      router.replace('/'); // "/" ve la sesión sin pendientes y manda a Inicio
    } else {
      router.back();
    }
  }

  async function enviarCodigo(destino: string) {
    setEnviando(true);
    setError(null);
    setAviso(null);
    const { error } = await supabase.auth.updateUser({ email: destino });
    setEnviando(false);
    if (error) {
      setError(mensajeDeError(error));
      return false;
    }
    setCorreo(destino);
    setEditando(false);
    setCodigo('');
    return true;
  }

  async function verificar(token = codigo) {
    if (token.length !== 6 || enviando) return;
    setEnviando(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email: correo, token, type: 'email_change' });
    setEnviando(false);
    if (error) {
      setCodigo('');
      return setError(mensajeDeError(error));
    }
    terminar();
  }

  const header = (
    <>
      <AppBar back={!enRegistro} right={enRegistro ? 'Paso 4 de 4' : undefined} />
      {enRegistro ? <View className="px-5 pb-2"><ProgressBar step={4} total={4} /></View> : null}
    </>
  );

  if (editando) {
    const valido = esCorreo(nuevoCorreo);
    return (
      <Screen
        header={header}
        footer={
          <BottomBar>
            <Button onPress={() => enviarCodigo(nuevoCorreo.trim().toLowerCase())} disabled={!valido} loading={enviando}>
              Enviar código
            </Button>
            {enRegistro ? <Button variant="ghost" onPress={terminar}>Lo haré después</Button> : null}
          </BottomBar>
        }
      >
        <Title subtitle="Te mandaremos un código de 6 dígitos para confirmar que es tuyo.">Verifica tu correo</Title>
        {error ? <Note tone="error">{error}</Note> : null}
        <TextField label="Correo electrónico" icon={Mail} value={nuevoCorreo} onChangeText={setNuevoCorreo}
          keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress"
          autoComplete="email" placeholder="tucorreo@ejemplo.com" testID="correo" />
        <Note icon={Mail}>Lo usaremos para avisarte de tus citas y para recuperar tu cuenta si olvidas tu contraseña.</Note>
      </Screen>
    );
  }

  return (
    <Screen
      header={header}
      footer={
        <BottomBar>
          <Button onPress={() => verificar()} disabled={codigo.length !== 6} loading={enviando}>Verificar correo</Button>
          {enRegistro ? <Button variant="ghost" onPress={terminar}>Lo haré después</Button> : null}
        </BottomBar>
      }
    >
      <Title>Verifica tu correo</Title>
      <Text className="-mt-2 font-sans text-base text-muted-foreground">
        Enviamos un código de 6 dígitos a {correo}.{'  '}
        <TextLink onPress={() => { setNuevoCorreo(correo); setEditando(true); setError(null); }}>Cambiar</TextLink>
      </Text>

      <OTPInput value={codigo} onChange={(v) => { setCodigo(v); setError(null); }} onComplete={verificar} error={!!error} />
      {error ? <Note tone="error">{error}</Note> : null}
      {aviso && !error ? <Note>{aviso}</Note> : null}

      <Text className="text-center font-sans text-sm text-muted-foreground">
        ¿No llegó? Revisa tu carpeta de spam o{' '}
        <TextLink onPress={async () => { if (await enviarCodigo(correo)) setAviso('Te mandamos un código nuevo.'); }}>
          reenvía el código
        </TextLink>
      </Text>

      <Note icon={Mail}>Lo usaremos para avisarte de tus citas y para recuperar tu cuenta si olvidas tu contraseña.</Note>
    </Screen>
  );
}
