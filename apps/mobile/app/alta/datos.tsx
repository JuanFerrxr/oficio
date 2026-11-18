import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BottomBar, Button, Checkbox, Note, Screen, TextField, TextLink, Title } from '@/components/ui';
import { EncabezadoAlta } from '@/components/prestador/PasoAlta';
import { FotoPerfil } from '@/components/prestador/FotoPerfil';
import { VERSION_TERMINOS } from '@/features/auth/flujo';
import { abrirLegal } from '@/features/auth/legal';
import { useSession } from '@/features/auth/session';
import { formatear } from '@/features/auth/telefono';
import { guardarFotoDePerfil, type Foto } from '@/features/prestador/archivos';
import { supabase } from '@/lib/supabase';

// B0.1 · Crea tu perfil de prestador, para quien YA tiene cuenta (Perfil → "Ofrecer mis servicios").
// Es la misma cuenta: no repite nombre, teléfono, contraseña ni códigos. Solo foto, años de
// experiencia y los Términos para prestadores. También sirve para repetir B0.1 si algo falló.
export default function AltaDatosCuentaExistente() {
  const { session, cambiarModo, refrescarRol } = useSession();
  const { editar } = useLocalSearchParams<{ editar?: string }>();
  const editando = editar === '1';
  const uid = session?.user.id;
  const [perfil, setPerfil] = useState<{ full_name: string; phone: string | null; avatar_url: string | null } | null>(null);
  const [foto, setFoto] = useState<Foto | null>(null);
  const [anos, setAnos] = useState('');
  const [acepto, setAcepto] = useState(false);
  const [yaAcepto, setYaAcepto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorAnos, setErrorAnos] = useState<string | undefined>();
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!uid) return;
    supabase.from('profiles').select('full_name, phone, avatar_url').eq('id', uid).single().then(({ data }) => setPerfil(data));
    supabase.from('provider_profiles').select('years_experience, terms_accepted_at').eq('user_id', uid).maybeSingle().then(({ data }) => {
      if (data?.years_experience != null) setAnos(String(data.years_experience));
      if (data?.terms_accepted_at) { setYaAcepto(true); setAcepto(true); }
    });
  }, [uid]);

  async function continuar() {
    if (!uid) return;
    const n = Number(anos);
    if (anos === '' || !Number.isInteger(n) || n < 0 || n > 60) return setErrorAnos('Escribe un número entre 0 y 60');
    if (!acepto) return setError('Para continuar, acepta los Términos para prestadores.');
    setGuardando(true);
    setError(null);
    try {
      const { error } = await supabase.rpc('iniciar_alta_prestador', { p_years: n, p_terms_version: VERSION_TERMINOS });
      if (error) throw error;
      if (foto) await guardarFotoDePerfil(uid, foto);
      await cambiarModo('prestador');
      await refrescarRol();
      if (editando) router.back();
      else router.replace('/alta/servicios');
    } catch {
      setError('No pudimos guardar tus datos. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Screen
      header={<EncabezadoAlta paso={1} editando={editando} titulo="Datos del prestador" />}
      footer={
        <BottomBar helper={editando ? undefined : 'Usarás la misma cuenta para contratar y para ofrecer servicios.'}>
          <Button onPress={continuar} loading={guardando}>{editando ? 'Guardar' : 'Continuar'}</Button>
        </BottomBar>
      }
    >
      <Title subtitle="Así te verán los clientes. Tu teléfono y tu correo no aparecen en tu perfil.">Crea tu perfil de prestador</Title>
      {perfil ? (
        <Note tone="privacy">
          {`Usarás tu cuenta de ${perfil.full_name}${perfil.phone ? ` · ${formatear(perfil.phone)}` : ''}. No tienes que registrarte otra vez.`}
        </Note>
      ) : null}
      {error ? <Note tone="error">{error}</Note> : null}
      <FotoPerfil uri={foto?.uri ?? perfil?.avatar_url} onFoto={setFoto} />
      <TextField label="Años de experiencia" value={anos} onChangeText={(t) => { setAnos(t.replace(/\D/g, '').slice(0, 2)); setErrorAnos(undefined); }}
        error={errorAnos} keyboardType="number-pad" placeholder="12" testID="anos" />
      {yaAcepto ? null : (
        <Checkbox checked={acepto} onChange={(v) => { setAcepto(v); setError(null); }}>
          <Text className="font-sans text-sm text-foreground">
            Acepto los <TextLink onPress={() => abrirLegal('terminos-prestador')}>Términos para prestadores</TextLink> de Oficio.
          </Text>
        </Checkbox>
      )}
      <View />
    </Screen>
  );
}
