import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  Bell, CircleHelp, FileText, LogOut, Mail, MapPin, Phone, ShieldCheck, Store, Trash2, UserRound,
} from 'lucide-react-native';
import { AppBar, Avatar, Badge, Button, ListGroup, ListRow, Note, Screen } from '@/components/ui';
import { abrirLegal } from '@/features/auth/legal';
import { useSession } from '@/features/auth/session';
import { formatear } from '@/features/auth/telefono';
import { supabase } from '@/lib/supabase';

// A9 · Perfil del cliente. Los datos salen de profiles (RLS: cada quien ve solo el suyo), que
// solo guarda teléfono y correo ya verificados.
type Perfil = { full_name: string; phone: string | null; email: string | null; avatar_url: string | null };

function proximamente(code: string, title: string, description: string, sprint: string) {
  router.push({ pathname: '/proximamente', params: { code, title, description, sprint } });
}

export default function PerfilCliente() {
  const { session, esPrestador, cambiarModo } = useSession();
  const uid = session?.user.id;
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [error, setError] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [confirmarBaja, setConfirmarBaja] = useState(false);

  // Se recarga cada vez que se vuelve a esta pestaña (p. ej., después de verificar el correo)
  useFocusEffect(
    useCallback(() => {
      if (!uid) return;
      supabase.from('profiles').select('full_name, phone, email, avatar_url').eq('id', uid).single().then(({ data, error }) => {
        setError(!!error);
        if (data) setPerfil(data);
      });
    }, [uid]),
  );

  const correoPorVerificar = session?.user.new_email;
  const nombre = perfil?.full_name || 'Tu cuenta';

  return (
    <Screen header={<AppBar title="Perfil" back={false} />}>
      {error ? <Note tone="error">No pudimos cargar tu perfil. Revisa tu conexión.</Note> : null}

      <View className="items-center gap-2 pt-2">
        <Avatar name={nombre} size="lg" id={session?.user.id} uri={perfil?.avatar_url} />
        <Text className="font-display text-xl text-foreground" testID="perfil-nombre">{nombre}</Text>
        {perfil?.phone ? <Text className="font-sans text-base text-muted-foreground">{formatear(perfil.phone)}</Text> : null}
        {perfil?.phone ? <View className="flex-row justify-center"><Badge tone="success" icon={ShieldCheck}>Teléfono verificado</Badge></View> : null}
        <View className="pt-1">
          <Button size="sm" variant="secondary" onPress={() => router.push('/edit-profile')}>Editar mis datos</Button>
        </View>
      </View>

      <View className="gap-2">
        <Text className="px-1 font-sans-bold text-xs uppercase tracking-wider text-muted-foreground">Mis datos</Text>
        <ListGroup>
          <ListRow icon={UserRound} title="Nombre" value={perfil?.full_name} onPress={() => router.push('/edit-profile')} />
          <ListRow icon={Phone} title="Teléfono" value={formatear(perfil?.phone)} chevron={false} />
          <ListRow
            icon={Mail}
            title="Correo electrónico"
            value={perfil?.email ?? (correoPorVerificar ? 'Sin verificar' : 'Agregar')}
            onPress={() => router.push('/verify-email')}
          />
          <ListRow icon={MapPin} title="Direcciones guardadas" last onPress={() => router.push('/cliente/direcciones')} />
        </ListGroup>
      </View>

      <View className="gap-2">
        <Text className="px-1 font-sans-bold text-xs uppercase tracking-wider text-muted-foreground">Ajustes</Text>
        <ListGroup>
          <ListRow icon={Bell} title="Notificaciones"
            onPress={() => proximamente('A9', 'Notificaciones', 'Avisos de solicitudes, citas y mensajes.', '4')} />
          <ListRow icon={ShieldCheck} title="Privacidad y datos"
            onPress={() => proximamente('A9', 'Privacidad y datos', 'Descarga o corrige tus datos personales (derechos ARCO).', '4')} />
          <ListRow icon={CircleHelp} title="Ayuda y soporte"
            onPress={() => proximamente('A9', 'Ayuda y soporte', 'Preguntas frecuentes y contacto con Oficio.', '4')} />
          <ListRow icon={FileText} title="Aviso de privacidad y términos" last onPress={() => abrirLegal('aviso')} />
        </ListGroup>
      </View>

      <View className="gap-2">
        <Text className="px-1 font-sans-bold text-xs uppercase tracking-wider text-muted-foreground">¿Eres prestador?</Text>
        <ListGroup>
          <ListRow
            icon={Store}
            title={esPrestador ? 'Ir a mi cuenta de prestador' : 'Ofrecer mis servicios'}
            value={esPrestador ? undefined : 'Con la misma cuenta'}
            last
            onPress={async () => {
              if (esPrestador) {
                await cambiarModo('prestador');
                router.replace('/prestador');
              } else {
                router.push('/alta/datos');
              }
            }}
          />
        </ListGroup>
      </View>

      <ListGroup>
        <ListRow
          icon={LogOut}
          title={saliendo ? 'Cerrando sesión…' : 'Cerrar sesión'}
          chevron={false}
          onPress={async () => {
            setSaliendo(true);
            await supabase.auth.signOut(); // la sesión se cierra y la app vuelve a la bienvenida
          }}
        />
        <ListRow icon={Trash2} title="Eliminar mi cuenta" destructive last onPress={() => setConfirmarBaja((v) => !v)} />
      </ListGroup>
      {confirmarBaja ? (
        <Note tone="warning">
          Eliminar la cuenta desde la app llega antes de publicarla en la App Store. Mientras tanto, escríbenos desde Ayuda y la
          eliminamos por ti.
        </Note>
      ) : null}
    </Screen>
  );
}
