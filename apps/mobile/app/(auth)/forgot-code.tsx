import { useState } from 'react';
import { Text } from 'react-native';
import { Redirect, router } from 'expo-router';
import { AppBar, BottomBar, Button, Note, OTPInput, Screen, Title } from '@/components/ui';
import { Reenviar } from '@/components/auth/Reenviar';
import { mensajeDeError } from '@/features/auth/errores';
import { actualizarFlujo, useFlujo } from '@/features/auth/flujo';
import { ocultar } from '@/features/auth/telefono';
import { supabase } from '@/lib/supabase';

// A0.3 · Escribe el código. Un código correcto abre la sesión; `pendiente` = 'contrasena'
// mantiene a la persona aquí para crear la nueva contraseña (A0.4) antes de ir a Inicio.
const CANAL = { sms: 'SMS', whatsapp: 'WhatsApp', correo: 'correo' } as const;

export default function CodigoRecuperacion() {
  const { recuperacion } = useFlujo();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!recuperacion) return <Redirect href="/forgot" />;
  const { metodo, destino } = recuperacion;
  const porCorreo = metodo === 'correo';

  async function verificar(token = codigo) {
    if (token.length !== 6 || enviando) return;
    setEnviando(true);
    setError(null);
    actualizarFlujo({ pendiente: 'contrasena' });
    const { error } = porCorreo
      ? await supabase.auth.verifyOtp({ email: destino, token, type: 'recovery' })
      : await supabase.auth.verifyOtp({ phone: destino, token, type: 'sms' });
    setEnviando(false);
    if (error) {
      actualizarFlujo({ pendiente: null });
      setCodigo('');
      return setError(mensajeDeError(error));
    }
    router.replace('/new-password');
  }

  async function reenviar() {
    setError(null);
    const { error } = porCorreo
      ? await supabase.auth.resetPasswordForEmail(destino)
      : await supabase.auth.signInWithOtp({
          phone: destino,
          options: { shouldCreateUser: false, ...(metodo === 'whatsapp' ? { channel: 'whatsapp' as const } : {}) },
        });
    if (error) {
      setError(mensajeDeError(error));
      return false;
    }
    setAviso('Te mandamos un código nuevo.');
    return true;
  }

  return (
    <Screen
      header={<AppBar />}
      footer={
        <BottomBar>
          <Button onPress={() => verificar()} disabled={codigo.length !== 6} loading={enviando}>Continuar</Button>
        </BottomBar>
      }
    >
      <Title>Escribe el código</Title>
      <Text className="-mt-2 font-sans text-base text-muted-foreground">
        Lo mandamos por {CANAL[metodo]} {porCorreo ? `a ${destino}` : `al ${ocultar(destino)}`}. Vence en 10 minutos.
      </Text>
      <OTPInput value={codigo} onChange={(v) => { setCodigo(v); setError(null); }} onComplete={verificar} error={!!error} />
      {error ? <Note tone="error">{error}</Note> : null}
      {aviso && !error ? <Note>{aviso}</Note> : null}
      <Reenviar
        onReenviar={reenviar}
        alterna={
          porCorreo
            ? { texto: 'Probar por SMS', onPress: () => router.replace({ pathname: '/forgot', params: { metodo: 'sms' } }) }
            : { texto: 'Probar por correo', onPress: () => router.replace({ pathname: '/forgot', params: { metodo: 'correo' } }) }
        }
      />
    </Screen>
  );
}
