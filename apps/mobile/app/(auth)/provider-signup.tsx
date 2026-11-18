import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Mail, Phone } from 'lucide-react-native';
import { BottomBar, Button, Checkbox, Screen, TextField, TextLink, Title } from '@/components/ui';
import { EncabezadoAlta } from '@/components/prestador/PasoAlta';
import { FotoPerfil } from '@/components/prestador/FotoPerfil';
import { actualizarFlujo, leerFlujo } from '@/features/auth/flujo';
import { abrirLegal } from '@/features/auth/legal';
import { aE164, diezDigitos, esCorreo, mientrasEscribe } from '@/features/auth/telefono';
import type { Foto } from '@/features/prestador/archivos';

// B0.1 · Crea tu perfil de prestador (Paso 1 de 5), para quien todavía no tiene cuenta.
// Sigue el mismo registro que el cliente (contraseña → código SMS → código del correo) con los
// textos del prestador; la foto y los años se guardan en cuanto se verifica el teléfono.
// Quien ya tiene cuenta de cliente usa /alta/datos (no repite contraseña ni códigos).
type Errores = Partial<Record<'nombre' | 'paterno' | 'telefono' | 'correo' | 'anos' | 'terminos', string>>;

export default function AltaTusDatos() {
  const previo = leerFlujo().registro;
  const [foto, setFoto] = useState<Foto | null>(previo?.foto ?? null);
  const [nombre, setNombre] = useState(previo?.nombre ?? '');
  const [paterno, setPaterno] = useState(previo?.paterno ?? '');
  const [materno, setMaterno] = useState(previo?.materno ?? '');
  const [telefono, setTelefono] = useState(previo ? mientrasEscribe(diezDigitos(previo.telefono) ?? '') : '');
  const [correo, setCorreo] = useState(previo?.correo ?? '');
  const [anos, setAnos] = useState(previo?.anos != null ? String(previo.anos) : '');
  const [acepto, setAcepto] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const limpiar = (k: keyof Errores) => setErrores((e) => (e[k] ? { ...e, [k]: undefined } : e));

  function continuar() {
    const e: Errores = {};
    const nAnos = Number(anos);
    if (!nombre.trim()) e.nombre = 'Escribe tu nombre';
    if (!paterno.trim()) e.paterno = 'Escribe tu apellido';
    if (!aE164(telefono)) e.telefono = 'Escribe un celular de 10 dígitos';
    if (!esCorreo(correo)) e.correo = 'Revisa tu correo';
    if (anos.trim() === '' || !Number.isInteger(nAnos) || nAnos < 0 || nAnos > 60) e.anos = 'Escribe un número entre 0 y 60';
    if (!acepto) e.terminos = 'Para continuar, acepta el aviso de privacidad y los términos para prestadores';
    setErrores(e);
    if (Object.keys(e).length) return;

    actualizarFlujo({
      registro: {
        nombre: nombre.trim(),
        paterno: paterno.trim(),
        materno: materno.trim(),
        telefono: aE164(telefono)!,
        correo: correo.trim().toLowerCase(),
        rol: 'provider',
        anos: nAnos,
        foto,
      },
    });
    router.push('/register-password');
  }

  return (
    <Screen
      header={<EncabezadoAlta paso={1} />}
      footer={
        <BottomBar helper="Te enviaremos un código por SMS para verificar tu número.">
          <Button onPress={continuar}>Continuar</Button>
        </BottomBar>
      }
    >
      <Title subtitle="Así te verán los clientes. Tu teléfono y tu correo no aparecen en tu perfil.">Crea tu perfil de prestador</Title>
      <FotoPerfil uri={foto?.uri} onFoto={setFoto} />

      <TextField label="Nombre(s)" value={nombre} onChangeText={(t) => { setNombre(t); limpiar('nombre'); }} error={errores.nombre}
        autoCapitalize="words" textContentType="givenName" autoComplete="given-name" testID="nombre" />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <TextField label="Apellido paterno" value={paterno} onChangeText={(t) => { setPaterno(t); limpiar('paterno'); }} error={errores.paterno}
            autoCapitalize="words" textContentType="familyName" autoComplete="family-name" testID="paterno" />
        </View>
        <View className="flex-1">
          <TextField label="Apellido materno" value={materno} onChangeText={setMaterno} autoCapitalize="words" testID="materno" />
        </View>
      </View>
      <TextField label="Teléfono celular" icon={Phone} prefix="+52" value={telefono}
        onChangeText={(t) => { setTelefono(mientrasEscribe(t)); limpiar('telefono'); }} error={errores.telefono}
        keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel-national"
        placeholder="222 315 6620" testID="telefono" />
      <TextField label="Correo electrónico" icon={Mail} value={correo} onChangeText={(t) => { setCorreo(t); limpiar('correo'); }} error={errores.correo}
        keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress"
        autoComplete="email" placeholder="tucorreo@ejemplo.com" testID="correo" />
      <TextField label="Años de experiencia" value={anos} onChangeText={(t) => { setAnos(t.replace(/\D/g, '').slice(0, 2)); limpiar('anos'); }}
        error={errores.anos} keyboardType="number-pad" placeholder="12" testID="anos" />

      <View className="gap-1.5">
        <Checkbox checked={acepto} onChange={(v) => { setAcepto(v); if (v) setErrores((e) => ({ ...e, terminos: undefined })); }}>
          <Text className="font-sans text-sm text-foreground">
            Acepto el <TextLink onPress={() => abrirLegal('aviso')}>Aviso de privacidad</TextLink> y los{' '}
            <TextLink onPress={() => abrirLegal('terminos-prestador')}>Términos para prestadores</TextLink> de Oficio.
          </Text>
        </Checkbox>
        {errores.terminos ? <Text className="pl-[34px] font-sans-medium text-xs text-danger">{errores.terminos}</Text> : null}
      </View>
    </Screen>
  );
}
