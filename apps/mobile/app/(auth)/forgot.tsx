import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Lock, Mail, Phone } from 'lucide-react-native';
import { AppBar, BottomBar, Button, Note, Screen, SegmentedControl, TextField, Title } from '@/components/ui';
import { mensajeDeError } from '@/features/auth/errores';
import { actualizarFlujo, type Recuperacion } from '@/features/auth/flujo';
import { aE164, esCorreo, mientrasEscribe } from '@/features/auth/telefono';
import { supabase } from '@/lib/supabase';

// A0.2 · ¿Olvidaste tu contraseña? Manda un código por SMS, correo o WhatsApp.
type Metodo = Recuperacion['metodo'];
const OPCIONES = [
  { value: 'sms', label: 'Por SMS' },
  { value: 'correo', label: 'Por correo' },
  { value: 'whatsapp', label: 'Por WhatsApp' },
] as const;

export default function OlvideContrasena() {
  const params = useLocalSearchParams<{ metodo?: Metodo }>();
  const [metodo, setMetodo] = useState<Metodo>(params.metodo ?? 'sms');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const porCorreo = metodo === 'correo';
  const destino = porCorreo ? (esCorreo(correo) ? correo.trim().toLowerCase() : null) : aE164(telefono);

  async function enviar() {
    if (!destino) return;
    setEnviando(true);
    setError(null);
    const { error } = porCorreo
      ? await supabase.auth.resetPasswordForEmail(destino)
      : await supabase.auth.signInWithOtp({
          phone: destino,
          options: { shouldCreateUser: false, ...(metodo === 'whatsapp' ? { channel: 'whatsapp' as const } : {}) },
        });
    setEnviando(false);
    if (error) return setError(mensajeDeError(error));
    actualizarFlujo({ recuperacion: { metodo, destino } });
    router.push('/forgot-code');
  }

  return (
    <Screen
      header={<AppBar />}
      footer={
        <BottomBar>
          <Button onPress={enviar} disabled={!destino} loading={enviando}>Enviar código</Button>
        </BottomBar>
      }
    >
      <Title subtitle="Te enviaremos un código para que crees una nueva. Elige cómo quieres recibirlo.">
        ¿Olvidaste tu contraseña?
      </Title>
      <SegmentedControl options={OPCIONES} value={metodo} onChange={(m) => { setMetodo(m); setError(null); }} />
      {error ? <Note tone="error">{error}</Note> : null}
      {porCorreo ? (
        <TextField label="Correo electrónico" icon={Mail} value={correo} onChangeText={setCorreo}
          keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress"
          autoComplete="email" placeholder="tucorreo@ejemplo.com" testID="correo" />
      ) : (
        <TextField label="Teléfono celular" icon={Phone} prefix="+52" value={telefono}
          onChangeText={(t) => setTelefono(mientrasEscribe(t))} keyboardType="phone-pad"
          textContentType="telephoneNumber" autoComplete="tel-national" placeholder="222 418 0937" testID="telefono" />
      )}
      <Note icon={Lock}>Por seguridad, nunca te pediremos tu contraseña por mensaje o llamada.</Note>
    </Screen>
  );
}
