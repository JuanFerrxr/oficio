import { useState } from 'react';
import { Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { AppBar, BottomBar, Button, Note, OTPInput, ProgressBar, Screen, TextLink, Title } from '@/components/ui';
import { Reenviar } from '@/components/auth/Reenviar';
import { codigoDeError, mensajeDeError } from '@/features/auth/errores';
import { actualizarFlujo, useFlujo } from '@/features/auth/flujo';
import { formatear } from '@/features/auth/telefono';
import { supabase } from '@/lib/supabase';

// A2 · Escribe el código que te enviamos (Paso 3 de 4). Al verificar, Supabase confirma el
// teléfono y abre la sesión. Enseguida se pide el código del correo (paso 4).
export default function VerificaTelefono() {
  const { registro } = useFlujo();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [canal, setCanal] = useState<'SMS' | 'WhatsApp'>('SMS');

  if (!registro) return <Redirect href="/register" />;
  const telefono = registro.telefono;

  async function verificar(token = codigo) {
    if (token.length !== 6 || enviando) return;
    setEnviando(true);
    setError(null);
    // Antes de que exista la sesión: que la app no salte a Inicio, falta el paso 4.
    actualizarFlujo({ pendiente: registro?.correo ? 'correo' : null });
    const { error } = await supabase.auth.verifyOtp({ phone: telefono, token, type: 'sms' });
    if (error) {
      actualizarFlujo({ pendiente: null });
      setEnviando(false);
      setCodigo('');
      return setError(mensajeDeError(error));
    }
    if (!registro?.correo) return; // sin correo: la sesión abierta lleva a Inicio

    // Paso 4: Supabase manda un código de 6 dígitos al correo (plantilla verificar-correo.html)
    const r = await supabase.auth.updateUser({ email: registro.correo });
    setEnviando(false);
    router.replace({
      pathname: '/verify-email',
      params: r.error ? { error: codigoDeError(r.error) === 'email_exists' ? 'email_exists' : 'envio' } : {},
    });
  }

  async function reenviar(porWhatsApp = false): Promise<boolean> {
    setError(null);
    setAviso(null);
    // El código de registro se reenvía con resend; por WhatsApp se usa el inicio con código,
    // que para un teléfono sin confirmar manda el mismo tipo de código.
    const { error } = porWhatsApp
      ? await supabase.auth.signInWithOtp({ phone: telefono, options: { shouldCreateUser: false, channel: 'whatsapp' } })
      : await supabase.auth.resend({ type: 'sms', phone: telefono });
    if (error) {
      setError(mensajeDeError(error));
      return false;
    }
    setCanal(porWhatsApp ? 'WhatsApp' : 'SMS');
    setAviso(porWhatsApp ? 'Te mandamos un código nuevo por WhatsApp.' : 'Te mandamos un código nuevo.');
    return true;
  }

  return (
    <Screen
      header={
        <>
          <AppBar right="Paso 3 de 4" />
          <View className="px-5 pb-2"><ProgressBar step={3} total={4} /></View>
        </>
      }
      footer={
        <BottomBar>
          <Button onPress={() => verificar()} disabled={codigo.length !== 6} loading={enviando}>Verificar</Button>
        </BottomBar>
      }
    >
      <Title>Escribe el código que te enviamos</Title>
      <Text className="-mt-2 font-sans text-base text-muted-foreground">
        Lo mandamos por {canal} al {formatear(telefono)}.{'  '}
        <TextLink onPress={() => router.dismissTo('/register')}>Cambiar</TextLink>
      </Text>

      <OTPInput value={codigo} onChange={(v) => { setCodigo(v); setError(null); }} onComplete={verificar} error={!!error} />
      {error ? <Note tone="error">{error}</Note> : null}
      {aviso && !error ? <Note>{aviso}</Note> : null}

      <Reenviar onReenviar={() => reenviar(false)} alterna={{ texto: 'Recibir por WhatsApp', onPress: () => reenviar(true) }} />

      <Note tone="privacy">Tu número solo se comparte con el prestador cuando confirmas una cita.</Note>
    </Screen>
  );
}
