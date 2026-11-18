import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { CircleCheck, CircleX, LoaderCircle, LogIn, LogOut, RefreshCw } from 'lucide-react-native';
import { AppBar, Badge, Button, Note, Screen } from '@/components/ui';
import { supabase, supabaseConfigurado, supabaseUrl } from '@/lib/supabase';
import { useSession } from '@/features/auth/session';
import { colors } from '@/theme/colors';

// Comprueba, desde el iPhone, que la app llega a tu Supabase local:
//   1. lectura pública (categorías)  2. función de la base (búsqueda por problema)
//   3. sesión que sobrevive a cerrar la app (usuario demo de `npm run demo`)
type Estado = { ok: boolean | null; detalle: string };
const pendiente: Estado = { ok: null, detalle: 'Comprobando…' };

function explicar(mensaje: string): string {
  if (/network request failed|failed to fetch|fetch failed|timed out|timeout/i.test(mensaje)) {
    return `No llego a ${supabaseUrl}. Revisa: 1) el iPhone y la computadora en la misma red Wi-Fi, 2) Supabase encendido, 3) la regla del firewall de Windows, 4) Ajustes del iPhone → Expo Go → Red local activado.`;
  }
  return mensaje;
}

function Fila({ titulo, estado }: { titulo: string; estado: Estado }) {
  const Icono = estado.ok === null ? LoaderCircle : estado.ok ? CircleCheck : CircleX;
  const color = estado.ok === null ? colors.mutedForeground : estado.ok ? colors.success : colors.danger;
  return (
    <View className="flex-row gap-3 border-b border-border px-4 py-3.5">
      <Icono size={22} color={color} />
      <View className="flex-1 gap-1">
        <Text className="font-sans-bold text-base text-foreground">{titulo}</Text>
        <Text className="font-sans text-sm text-muted-foreground">{estado.detalle}</Text>
      </View>
    </View>
  );
}

export default function Diagnostico() {
  const { session } = useSession();
  const [conexion, setConexion] = useState<Estado>(pendiente);
  const [funcion, setFuncion] = useState<Estado>(pendiente);
  const [entrando, setEntrando] = useState(false);
  const [errorSesion, setErrorSesion] = useState<string | null>(null);

  const comprobar = useCallback(async () => {
    if (!supabaseConfigurado) {
      const falta = { ok: false, detalle: 'Falta apps/mobile/.env. Ve a la wiki, página 6, paso 3.' };
      setConexion(falta);
      setFuncion(falta);
      return;
    }
    setConexion(pendiente);
    setFuncion(pendiente);

    // Las dos consultas van en paralelo. Si no hay conexión, supabase-js reintenta unos segundos
    // antes de rendirse: por eso "Comprobando…" puede tardar hasta ~10 s en convertirse en error.
    try {
      const [cat, fn] = await Promise.all([
        supabase.from('categories').select('name').order('sort_order'),
        supabase.rpc('match_categories', { p_text: 'se me bota la pastilla de la luz' }),
      ]);
      setConexion(
        cat.error
          ? { ok: false, detalle: explicar(cat.error.message) }
          : { ok: cat.data.length > 0, detalle: `${cat.data.length} oficios: ${cat.data.map((c) => c.name).join(', ')}` },
      );
      setFuncion(
        fn.error
          ? { ok: false, detalle: explicar(fn.error.message) }
          : {
              ok: fn.data?.[0]?.slug === 'electricidad',
              detalle: `“se me bota la pastilla de la luz” → ${fn.data?.[0]?.name ?? 'sin resultado'}`,
            },
      );
    } catch (e) {
      const falla = { ok: false, detalle: explicar(e instanceof Error ? e.message : String(e)) };
      setConexion(falla);
      setFuncion(falla);
    }
  }, []);

  useEffect(() => {
    comprobar();
  }, [comprobar]);

  async function entrarDemo() {
    setEntrando(true);
    setErrorSesion(null);
    const { error } = await supabase.auth.signInWithPassword({ email: 'mariana@demo.mx', password: 'Oficio2026!' });
    setEntrando(false);
    if (error) setErrorSesion(`${explicar(error.message)} ¿Ya corriste "npm run demo" en apps\\api?`);
  }

  const sesion: Estado = session
    ? { ok: true, detalle: `Dentro como ${session.user.email}. Cierra Expo Go por completo y vuelve a abrirlo: debe seguir aquí.` }
    : { ok: false, detalle: 'Sin sesión. Entra con la clienta de prueba para comprobar que la sesión se guarda en el teléfono.' };

  return (
    <Screen header={<AppBar title="Diagnóstico" />}>
      <View className="gap-1">
        <Text className="font-sans-semibold text-sm text-muted-foreground">Supabase</Text>
        <View className="flex-row items-center gap-2">
          <Text className="font-sans-bold text-base text-foreground" selectable>
            {supabaseUrl}
          </Text>
          {supabaseConfigurado ? null : <Badge tone="danger">sin .env</Badge>}
        </View>
      </View>

      <View className="overflow-hidden rounded-2xl border border-border bg-card">
        <Fila titulo="1 · Conexión con la base" estado={conexion} />
        <Fila titulo="2 · Función de búsqueda (A3.0)" estado={funcion} />
        <Fila titulo="3 · Sesión guardada" estado={sesion} />
      </View>

      <Button variant="secondary" icon={RefreshCw} onPress={comprobar}>
        Volver a comprobar
      </Button>

      {session ? (
        <Button variant="secondary" icon={LogOut} onPress={() => supabase.auth.signOut()}>
          Cerrar sesión
        </Button>
      ) : (
        <Button icon={LogIn} loading={entrando} onPress={entrarDemo} disabled={!supabaseConfigurado}>
          Entrar como Mariana (demo)
        </Button>
      )}
      {errorSesion ? <Note tone="warning">{errorSesion}</Note> : null}

      <Note tone="privacy">
        Esta pantalla usa la llave pública: ve lo mismo que verá cualquier usuario de la app. Si algo se lee aquí sin
        sesión, es porque las reglas RLS lo permiten.
      </Note>
    </Screen>
  );
}
