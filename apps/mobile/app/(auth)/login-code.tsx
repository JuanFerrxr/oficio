import { useState } from 'react';
import { Text } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { AppBar, BottomBar, Button, Note, OTPInput, Screen, Title } from '@/components/ui';
import { Reenviar } from '@/components/auth/Reenviar';
import { mensajeDeError } from '@/features/auth/errores';
import { ocultar } from '@/features/auth/telefono';
import { supabase } from '@/lib/supabase';

// A0.6 · Entra con un código. Al verificar se abre la sesión y la app pasa sola a Inicio.
export default function EntrarConCodigo() {
  const { telefono } = useLocalSearchParams<{ telefono: string }>();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [canal, setCanal] = useState<'SMS' | 'WhatsApp'>('SMS');
  const [enviando, setEnviando] = useState(false);

  if (!telefono) return <Redirect href="/login" />;

  async function verificar(token = codigo) {
    if (token.length !== 6 || enviando) return;
    setEnviando(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ phone: telefono!, token, type: 'sms' });
    setEnviando(false);
    if (error) {
      setCodigo('');
      setError(mensajeDeError(error));
    }
  }

  async function reenviar(porWhatsApp: boolean) {
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      phone: telefono!,
      options: { shouldCreateUser: false, ...(porWhatsApp ? { channel: 'whatsapp' as const } : {}) },
    });
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
      header={<AppBar />}
      footer={
        <BottomBar>
          <Button onPress={() => verificar()} disabled={codigo.length !== 6} loading={enviando}>Entrar</Button>
        </BottomBar>
      }
    >
      <Title>Entra con un código</Title>
      <Text className="-mt-2 font-sans text-base text-muted-foreground">Te lo mandamos por {canal} al {ocultar(telefono)}.</Text>
      <OTPInput value={codigo} onChange={(v) => { setCodigo(v); setError(null); }} onComplete={verificar} error={!!error} />
      {error ? <Note tone="error">{error}</Note> : null}
      {aviso && !error ? <Note>{aviso}</Note> : null}
      <Reenviar onReenviar={() => reenviar(false)} alterna={{ texto: 'Recibir por WhatsApp', onPress: () => reenviar(true) }} />
    </Screen>
  );
}
