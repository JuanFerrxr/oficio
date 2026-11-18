import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Mail, Phone } from 'lucide-react-native';
import { AppBar, BottomBar, Button, Checkbox, ProgressBar, Screen, TextField, TextLink, Title } from '@/components/ui';
import { actualizarFlujo, leerFlujo } from '@/features/auth/flujo';
import { aE164, diezDigitos, esCorreo, mientrasEscribe } from '@/features/auth/telefono';
import { abrirLegal } from '@/features/auth/legal';

// A1.1 · Tus datos (Paso 1 de 4). Aquí todavía no se crea nada en Supabase: la cuenta se crea
// en el paso 2, cuando ya hay contraseña.
type Errores = Partial<Record<'nombre' | 'paterno' | 'telefono' | 'correo' | 'terminos', string>>;

export default function TusDatos() {
  const previo = leerFlujo().registro;
  const [nombre, setNombre] = useState(previo?.nombre ?? '');
  const [paterno, setPaterno] = useState(previo?.paterno ?? '');
  const [materno, setMaterno] = useState(previo?.materno ?? '');
  const [telefono, setTelefono] = useState(previo ? mientrasEscribe(diezDigitos(previo.telefono) ?? '') : '');
  const [correo, setCorreo] = useState(previo?.correo ?? '');
  const [acepto, setAcepto] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const limpiar = (k: keyof Errores) => setErrores((e) => (e[k] ? { ...e, [k]: undefined } : e));

  function continuar() {
    const e: Errores = {};
    if (!nombre.trim()) e.nombre = 'Escribe tu nombre';
    if (!paterno.trim()) e.paterno = 'Escribe tu apellido';
    if (!aE164(telefono)) e.telefono = 'Escribe un celular de 10 dígitos';
    if (!esCorreo(correo)) e.correo = 'Revisa tu correo';
    if (!acepto) e.terminos = 'Para continuar, acepta el aviso de privacidad y los términos';
    setErrores(e);
    if (Object.keys(e).length) return;

    actualizarFlujo({
      registro: {
        nombre: nombre.trim(),
        paterno: paterno.trim(),
        materno: materno.trim(),
        telefono: aE164(telefono)!,
        correo: correo.trim().toLowerCase(),
        rol: 'client',
      },
    });
    router.push('/register-password');
  }

  return (
    <Screen
      header={
        <>
          <AppBar right="Paso 1 de 4" />
          <View className="px-5 pb-2"><ProgressBar step={1} total={4} /></View>
        </>
      }
      footer={
        <BottomBar helper="Después crearás tu contraseña.">
          <Button onPress={continuar}>Continuar</Button>
        </BottomBar>
      }
    >
      <Title subtitle="Así te verán los prestadores. Tu teléfono solo se comparte cuando confirmas una cita.">
        Cuéntanos quién eres
      </Title>

      <TextField label="Nombre(s)" value={nombre} onChangeText={(t) => { setNombre(t); limpiar('nombre'); }} error={errores.nombre}
        autoCapitalize="words" textContentType="givenName" autoComplete="given-name" testID="nombre" />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <TextField label="Apellido paterno" value={paterno} onChangeText={(t) => { setPaterno(t); limpiar('paterno'); }} error={errores.paterno}
            autoCapitalize="words" textContentType="familyName" autoComplete="family-name" testID="paterno" />
        </View>
        <View className="flex-1">
          <TextField label="Apellido materno" value={materno} onChangeText={setMaterno}
            autoCapitalize="words" testID="materno" />
        </View>
      </View>
      <TextField label="Teléfono celular" icon={Phone} prefix="+52" value={telefono}
        onChangeText={(t) => { setTelefono(mientrasEscribe(t)); limpiar('telefono'); }} error={errores.telefono}
        keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel-national"
        placeholder="222 418 0937" testID="telefono" />
      <TextField label="Correo electrónico" icon={Mail} value={correo} onChangeText={(t) => { setCorreo(t); limpiar('correo'); }} error={errores.correo}
        keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress"
        autoComplete="email" placeholder="tucorreo@ejemplo.com" testID="correo" />

      <View className="gap-1.5">
        <Checkbox checked={acepto} onChange={(v) => { setAcepto(v); if (v) setErrores((e) => ({ ...e, terminos: undefined })); }}>
          <Text className="font-sans text-sm text-foreground">
            Acepto el <TextLink onPress={() => abrirLegal('aviso')}>Aviso de privacidad</TextLink> y los{' '}
            <TextLink onPress={() => abrirLegal('terminos')}>Términos y condiciones</TextLink> de Oficio.
          </Text>
        </Checkbox>
        {errores.terminos ? <Text className="pl-[34px] font-sans-medium text-xs text-danger">{errores.terminos}</Text> : null}
      </View>
    </Screen>
  );
}
