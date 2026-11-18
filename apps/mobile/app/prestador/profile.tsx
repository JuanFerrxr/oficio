import { Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  Award, Banknote, Bell, Briefcase, CalendarDays, CircleHelp, Clock, FileText, Image as ImageIcon, Lock, LogOut, MapPin,
  ShieldCheck, Trash2, TriangleAlert, UserRound,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { AppBar, Avatar, Badge, ListGroup, ListRow, Note, Screen } from '@/components/ui';
import { abrirLegal } from '@/features/auth/legal';
import { useSession } from '@/features/auth/session';
import { ESTADO_VERIFICACION, useAlta } from '@/features/prestador/alta';
import { hhmm, resumenDias } from '@/features/prestador/horario';
import { resumenPagos } from '@/features/prestador/pagos';
import { supabase } from '@/lib/supabase';
import { cerrarSesion } from '@/features/avisos/push';

// B8 · Mi perfil (prestador). Sprint 2: lo que ya existe (datos del alta, verificación, cambiar a
// modo cliente, cerrar sesión). Calificación, trabajos, formas de pago y portafolio llegan después.
function proximamente(code: string, title: string, description: string, sprint: string) {
  router.push({ pathname: '/proximamente', params: { code, title, description, sprint } });
}

export default function PerfilPrestador() {
  const { session, cambiarModo } = useSession();
  const { perfil, servicios, horario, credenciales, categorias } = useAlta();
  const [datos, setDatos] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [confirmarBaja, setConfirmarBaja] = useState(false);
  const uid = session?.user.id;

  useEffect(() => {
    if (uid) supabase.from('profiles').select('full_name, avatar_url').eq('id', uid).single().then(({ data }) => setDatos(data));
  }, [uid, perfil]);

  const oficios = [...new Set(servicios.map((s) => categorias.find((c) => c.id === s.category_id)?.name).filter(Boolean))] as string[];
  const estado = perfil?.verification_status ?? 'unverified';
  const nombre = datos?.full_name || 'Tu cuenta';
  const subtitulo = [oficios.join(' y '), perfil?.years_experience != null ? `${perfil.years_experience} años` : null].filter(Boolean).join(' · ');
  const revisadas = credenciales.filter((c) => c.status === 'verified').length;

  return (
    <Screen header={<AppBar title="Mi perfil" back={false} />}>
      <View className="items-center gap-2 pt-2">
        <Avatar name={nombre} size="lg" id={uid} uri={datos?.avatar_url} />
        <Text className="font-display text-xl text-foreground">{nombre}</Text>
        {subtitulo ? <Text className="font-sans text-sm text-muted-foreground">{subtitulo}</Text> : null}
        <View className="flex-row justify-center">
          {estado === 'verified' ? <Badge tone="success" icon={ShieldCheck}>Perfil verificado</Badge> : null}
          {estado === 'pending' ? <Badge tone="warning" icon={Clock}>En revisión</Badge> : null}
          {estado === 'unverified' ? <Badge tone="warning" icon={TriangleAlert}>Alta sin terminar</Badge> : null}
        </View>
      </View>

      <View className="gap-2">
        <Text className="px-1 font-sans-bold text-xs uppercase tracking-wider text-muted-foreground">Mi negocio</Text>
        <ListGroup>
          <ListRow icon={Briefcase} title="Servicios y precios"
            value={servicios.length ? `${servicios.length} ${servicios.length === 1 ? 'servicio' : 'servicios'}` : 'Sin servicios'}
            onPress={() => router.push({ pathname: '/alta/servicios', params: { editar: '1' } })} />
          <ListRow icon={MapPin} title="Zona de trabajo" value={perfil?.base_location ? `Hasta ${perfil.service_radius_km} km` : 'Sin marcar'}
            onPress={() => router.push({ pathname: '/alta/zona', params: { editar: '1' } })} />
          <ListRow icon={CalendarDays} title="Horario base"
            value={horario.length ? `${resumenDias(horario.map((h) => h.weekday))} · ${hhmm(horario[0].start_time)} – ${hhmm(horario[0].end_time)}` : 'Sin horario'}
            onPress={() => router.push({ pathname: '/alta/zona', params: { editar: '1' } })} />
          <ListRow icon={Banknote} title="Formas de pago" value={resumenPagos(perfil?.payment_methods)}
            onPress={() => router.push({ pathname: '/alta/zona', params: { editar: '1' } })} />
          <ListRow icon={Award} title="Certificaciones y estudios"
            value={!credenciales.length ? 'Ninguna' : revisadas ? `${revisadas} revisadas por Oficio` : `${credenciales.length} en revisión`}
            onPress={() => router.push({ pathname: '/alta/servicios', params: { editar: '1' } })} />
          <ListRow icon={ImageIcon} title="Portafolio" last
            onPress={() => proximamente('B8', 'Portafolio', 'Fotos de tus trabajos para que los clientes vean tu calidad.', '3')} />
        </ListGroup>
      </View>

      <View className="gap-2">
        <Text className="px-1 font-sans-bold text-xs uppercase tracking-wider text-muted-foreground">Cuenta</Text>
        <ListGroup>
          <ListRow icon={UserRound} title="Datos personales" value={datos?.full_name}
            onPress={() => router.push({ pathname: '/alta/datos', params: { editar: '1' } })} />
          <ListRow icon={ShieldCheck} title="Verificación de identidad" value={ESTADO_VERIFICACION[estado].texto}
            onPress={() => router.push({ pathname: '/alta/verificacion', params: { editar: '1' } })} />
          <ListRow icon={Bell} title="Notificaciones"
            onPress={() => router.push('/notificaciones')} />
          <ListRow icon={Lock} title="Privacidad y datos"
            onPress={() => proximamente('B8', 'Privacidad y datos', 'Descarga o corrige tus datos personales (derechos ARCO).', '4')} />
          <ListRow icon={CircleHelp} title="Ayuda y soporte"
            onPress={() => proximamente('B8', 'Ayuda y soporte', 'Preguntas frecuentes y contacto con Oficio.', '4')} />
          <ListRow icon={FileText} title="Términos para prestadores" last onPress={() => abrirLegal('terminos-prestador')} />
        </ListGroup>
      </View>

      <View className="gap-2">
        <Text className="px-1 font-sans-bold text-xs uppercase tracking-wider text-muted-foreground">¿También contratas servicios?</Text>
        <ListGroup>
          <ListRow icon={UserRound} title="Usar Oficio como cliente" value="La misma cuenta" last
            onPress={async () => { await cambiarModo('cliente'); router.replace('/home'); }} />
        </ListGroup>
      </View>

      <ListGroup>
        <ListRow icon={LogOut} title="Cerrar sesión" chevron={false} onPress={() => cerrarSesion()} />
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
