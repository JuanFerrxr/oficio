import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Phone, UserRound } from 'lucide-react-native';
import { AppBar, BottomBar, Button, Logo, Note, Screen, TextField, TextLink } from '@/components/ui';
import { codigoDeError, mensajeDeError } from '@/features/auth/errores';
import { actualizarFlujo } from '@/features/auth/flujo';
import { aE164, esCorreo } from '@/features/auth/telefono';
import { supabase } from '@/lib/supabase';

// A0.1 · Qué bueno verte de nuevo. Un solo campo para teléfono o correo: si tiene "@" es correo.
// Al entrar, la sesión abierta hace que app/_layout.tsx mande a Inicio; aquí no se navega.
export default function Entrar() {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorUsuario, setErrorUsuario] = useState<string | undefined>();
  const [enviando, setEnviando] = useState<'contrasena' | 'codigo' | null>(null);

  function identificar(): { phone: string } | { email: string } | null {
    const v = usuario.trim();
    if (v.includes('@')) return esCorreo(v) ? { email: v.toLowerCase() } : null;
    const phone = aE164(v);
    return phone ? { phone } : null;
  }

  async function entrar() {
    setError(null);
    const id = identificar();
    if (!id) return setErrorUsuario('Escribe tu celular de 10 dígitos o tu correo');
    setErrorUsuario(undefined);
    setEnviando('contrasena');
    const { error } = await supabase.auth.signInWithPassword({ ...id, password: contrasena });
    setEnviando(null);
    if (!error) return;
    if (codigoDeError(error) === 'phone_not_confirmed' && 'phone' in id) {
      // Se registró pero no terminó el paso 3: se le manda otro código y se retoma ahí.
      await supabase.auth.resend({ type: 'sms', phone: id.phone });
      actualizarFlujo({ registro: { nombre: '', paterno: '', materno: '', telefono: id.phone, correo: '', rol: 'client' } });
      return router.push('/verify-phone');
    }
    setError(mensajeDeError(error));
  }

  async function entrarConCodigo() {
    setError(null);
    const phone = aE164(usuario);
    if (!phone) return setErrorUsuario('Escribe tu celular para mandarte el código');
    setErrorUsuario(undefined);
    setEnviando('codigo');
    const { error } = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } });
    setEnviando(null);
    if (error) return setError(mensajeDeError(error));
    router.push({ pathname: '/login-code', params: { telefono: phone } });
  }

  return (
    <Screen
      header={<AppBar />}
      footer={
        <BottomBar>
          <Button onPress={entrar} disabled={!usuario.trim() || !contrasena} loading={enviando === 'contrasena'}>Entrar</Button>
        </BottomBar>
      }
    >
      <View className="gap-3 pb-1">
        <Logo />
        <Text className="font-display text-2xl text-foreground">Qué bueno verte de nuevo</Text>
      </View>

      {error ? <Note tone="error">{error}</Note> : null}

      <TextField label="Teléfono o correo" icon={UserRound} value={usuario} onChangeText={(t) => { setUsuario(t); setErrorUsuario(undefined); }} error={errorUsuario}
        autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username"
        autoComplete="username" placeholder="222 418 0937 o tucorreo@ejemplo.com" testID="usuario" />
      <View className="gap-2">
        <TextField label="Contraseña" value={contrasena} onChangeText={setContrasena} password autoCapitalize="none"
          autoCorrect={false} textContentType="password" autoComplete="current-password" onSubmitEditing={entrar}
          testID="contrasena" />
        <Pressable onPress={() => router.push('/forgot')} hitSlop={8} className="self-end">
          <Text className="font-sans-semibold text-sm text-primary">¿Olvidaste tu contraseña?</Text>
        </Pressable>
      </View>

      <View className="flex-row items-center gap-3">
        <View className="h-px flex-1 bg-border" />
        <Text className="font-sans text-sm text-muted-foreground">o</Text>
        <View className="h-px flex-1 bg-border" />
      </View>

      <Button variant="secondary" icon={Phone} onPress={entrarConCodigo} loading={enviando === 'codigo'}>
        Entrar con código por SMS
      </Button>

      <Text className="text-center font-sans text-sm text-muted-foreground">
        ¿No tienes cuenta? <TextLink onPress={() => router.replace('/register')}>Regístrate</TextLink>
      </Text>
    </Screen>
  );
}
