import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { AppBar, BottomBar, Button, Note, Screen, TextField, Title } from '@/components/ui';
import { useSession } from '@/features/auth/session';
import { supabase } from '@/lib/supabase';

// A9 · Editar mis datos. Por ahora solo el nombre: el teléfono y el correo cambian con código
// (el correo desde Perfil → Correo electrónico; el teléfono, después de la beta).
// RLS: cada quien solo puede cambiar full_name y avatar_url de su propio perfil.
export default function EditarDatos() {
  const { session } = useSession();
  const [nombre, setNombre] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('profiles').select('full_name').single().then(({ data }) => {
      setNombre(data?.full_name ?? '');
      setCargando(false);
    });
  }, []);

  async function guardar() {
    if (!session) return;
    setGuardando(true);
    setError(null);
    const full_name = nombre.trim();
    // .select() devuelve la fila guardada. Si las reglas RLS no dejaran editar, Supabase no da
    // error: simplemente no cambia nada. Sin fila de regreso, avisamos en lugar de fingir que se guardó.
    const { data, error } = await supabase.from('profiles').update({ full_name }).eq('id', session.user.id).select('full_name');
    if (error || !data?.length) {
      setGuardando(false);
      return setError('No pudimos guardar tu nombre. Intenta de nuevo.');
    }
    // El nombre "de verdad" está en profiles. Supabase Auth guarda además una copia del registro
    // (auth.users → user_metadata.full_name, la columna "Display name" de Studio); la actualizamos
    // para que no quede el nombre viejo ahí.
    await supabase.auth.updateUser({ data: { full_name } });
    setGuardando(false);
    router.back();
  }

  return (
    <Screen
      header={<AppBar title="Editar mis datos" />}
      footer={
        <BottomBar>
          <Button onPress={guardar} disabled={cargando || nombre.trim().length < 2} loading={guardando}>Guardar</Button>
        </BottomBar>
      }
    >
      <Title subtitle="Así te verán los prestadores.">Tu nombre</Title>
      {error ? <Note tone="error">{error}</Note> : null}
      <TextField label="Nombre completo" value={nombre} onChangeText={setNombre} autoCapitalize="words"
        textContentType="name" autoComplete="name" editable={!cargando} testID="nombre-completo" />
    </Screen>
  );
}
