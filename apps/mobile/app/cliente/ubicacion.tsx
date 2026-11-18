import { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LocateFixed, MapPin, Plus } from 'lucide-react-native';
import { AppBar, ListGroup, ListRow, Note, Screen } from '@/components/ui';
import { textoDireccion, type Direccion } from '@/features/cliente/datos';
import { etiquetaDireccion, fijarOrigen, origenDesdeGps, useOrigen } from '@/features/cliente/origen';
import { puntoDesdeBase } from '@/features/prestador/ubicacion';
import { supabase } from '@/lib/supabase';

// A3 · ¿Desde dónde buscas? Ubicación actual del teléfono o una dirección guardada.
export default function ElegirUbicacion() {
  const origen = useOrigen();
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ubicando, setUbicando] = useState(false);

  useFocusEffect(useCallback(() => {
    supabase.from('addresses').select('id, label, street, ext_number, int_number, neighborhood, municipality, state, postal_code, directions, location, is_default')
      .order('is_default', { ascending: false }).order('created_at').then(({ data }) => setDirecciones(data ?? []));
  }, []));

  async function usarGps() {
    setAviso(null);
    setUbicando(true);
    const r = await origenDesdeGps();
    setUbicando(false);
    if (r === 'sin-permiso') return setAviso('Oficio no tiene permiso para usar tu ubicación. Actívalo en Ajustes del iPhone → Expo Go → Ubicación, o elige una dirección.');
    if (!r) return setAviso('No pudimos obtener tu ubicación. Elige una dirección guardada.');
    fijarOrigen(r);
    router.back();
  }

  return (
    <Screen header={<AppBar title="¿Desde dónde buscas?" />}>
      {aviso ? <Note tone="warning">{aviso}</Note> : null}
      <ListGroup>
        <ListRow icon={LocateFixed} title={ubicando ? 'Buscando…' : 'Usar mi ubicación actual'}
          value={origen?.fuente === 'gps' ? 'En uso' : undefined} last onPress={usarGps} />
      </ListGroup>
      <Text className="px-1 font-sans-bold text-xs uppercase tracking-wider text-muted-foreground">Mis direcciones</Text>
      <ListGroup>
        {direcciones.map((d) => (
          <ListRow key={d.id} icon={MapPin} title={textoDireccion(d)} value={origen?.direccionId === d.id ? 'En uso' : undefined}
            onPress={() => {
              const punto = puntoDesdeBase(d.location);
              if (punto) fijarOrigen({ ...punto, etiqueta: etiquetaDireccion(d), direccionId: d.id, fuente: 'direccion' });
              router.back();
            }} />
        ))}
        <ListRow icon={Plus} title="Agregar dirección" last onPress={() => router.push('/cliente/direccion')} />
      </ListGroup>
    </Screen>
  );
}
