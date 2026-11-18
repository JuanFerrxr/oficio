import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppBar, Badge, BottomBar, Button, Note, Screen, TextField, Title } from '@/components/ui';
import { OpcionesFoto } from '@/components/prestador/OpcionesFoto';
import { useSession } from '@/features/auth/session';
import { subirFoto, type Foto } from '@/features/prestador/archivos';
import { supabase } from '@/lib/supabase';

// B1 · Agregar certificado o título (o ver uno ya subido, ?id=…).
// La foto va al bucket privado "verification"; el certificado queda "En revisión" y solo se
// muestra a los clientes cuando Oficio lo aprueba (regla de la base).
export default function Certificado() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session } = useSession();
  const uid = session?.user.id;
  const [titulo, setTitulo] = useState('');
  const [institucion, setInstitucion] = useState('');
  const [anio, setAnio] = useState('');
  const [foto, setFoto] = useState<Foto | null>(null);
  const [existente, setExistente] = useState<{ status: string; storage_path: string | null; vista: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from('provider_credentials').select('*').eq('id', id).single().then(async ({ data }) => {
      if (!data) return;
      setTitulo(data.title);
      setInstitucion(data.institution ?? '');
      setAnio(data.year ? String(data.year) : '');
      const vista = data.storage_path
        ? (await supabase.storage.from('verification').createSignedUrl(data.storage_path, 300)).data?.signedUrl ?? null
        : null;
      setExistente({ status: data.status, storage_path: data.storage_path, vista });
    });
  }, [id]);

  async function guardar() {
    if (!uid) return;
    const y = Number(anio);
    if (!titulo.trim()) return setError('Escribe el nombre del certificado o título.');
    if (anio && (!Number.isInteger(y) || y < 1950 || y > new Date().getFullYear())) return setError('Revisa el año.');
    if (!foto) return setError('Agrega una foto del documento para poder revisarlo.');
    setGuardando(true);
    setError(null);
    try {
      const ruta = await subirFoto('verification', `${uid}/certificados/${Date.now()}`, foto);
      const { error } = await supabase.from('provider_credentials').insert({
        provider_id: uid, title: titulo.trim(), institution: institucion.trim() || null, year: anio ? y : null, storage_path: ruta,
      });
      if (error) throw error;
      router.back();
    } catch {
      setError('No pudimos subir el certificado. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  async function quitar() {
    if (!id || !existente) return;
    setGuardando(true);
    const { error } = await supabase.from('provider_credentials').delete().eq('id', id);
    if (!error && existente.storage_path) await supabase.storage.from('verification').remove([existente.storage_path]);
    setGuardando(false);
    if (error) return setError('No pudimos quitarlo. Intenta de nuevo.');
    router.back();
  }

  if (id) {
    return (
      <Screen
        header={<AppBar title="Certificado" />}
        footer={existente?.status === 'pending' ? (
          <BottomBar><Button variant="destructive" onPress={quitar} loading={guardando}>Quitar certificado</Button></BottomBar>
        ) : undefined}
      >
        {existente ? <Badge tone={existente.status === 'verified' ? 'success' : 'warning'}>{existente.status === 'verified' ? 'Revisado por Oficio' : 'En revisión'}</Badge> : null}
        <Text className="font-display text-xl text-foreground">{titulo}</Text>
        <Text className="font-sans text-base text-muted-foreground">{[institucion, anio].filter(Boolean).join(' · ')}</Text>
        {existente?.vista ? <Image source={{ uri: existente.vista }} style={{ width: '100%', height: 240, borderRadius: 12 }} resizeMode="contain" /> : null}
        {error ? <Note tone="error">{error}</Note> : null}
      </Screen>
    );
  }

  return (
    <Screen
      header={<AppBar title="Agregar certificado" />}
      footer={<BottomBar><Button onPress={guardar} loading={guardando}>Guardar</Button></BottomBar>}
    >
      <Title subtitle="Lo revisamos antes de mostrarlo en tu perfil.">Certificado o título</Title>
      {error ? <Note tone="error">{error}</Note> : null}
      <TextField label="Nombre" value={titulo} onChangeText={setTitulo} placeholder="Técnico en Electricidad" testID="cert-titulo" />
      <TextField label="Institución" value={institucion} onChangeText={setInstitucion} placeholder="CONALEP" testID="cert-institucion" />
      <TextField label="Año" value={anio} onChangeText={(t) => setAnio(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad"
        placeholder="2012" testID="cert-anio" />
      <View className="gap-2">
        <Text className="font-sans-semibold text-sm text-foreground">Foto del documento</Text>
        {foto ? <Image source={{ uri: foto.uri }} style={{ width: '100%', height: 200, borderRadius: 12 }} resizeMode="cover" /> : null}
        <OpcionesFoto onFoto={setFoto} textoCamara={foto ? 'Tomar otra' : 'Tomar foto'} />
      </View>
    </Screen>
  );
}
