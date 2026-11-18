import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { MapPin, Plus, Star } from 'lucide-react-native';
import { AppBar, ListGroup, ListRow, Note, Screen } from '@/components/ui';
import { textoDireccion, type Direccion } from '@/features/cliente/datos';
import { supabase } from '@/lib/supabase';

// A9 · Direcciones guardadas. La principal es la que se usa para buscar y para nuevas solicitudes.
export default function Direcciones() {
  const [direcciones, setDirecciones] = useState<Direccion[] | null>(null);
  useFocusEffect(useCallback(() => {
    supabase.from('addresses').select('id, label, street, ext_number, int_number, neighborhood, municipality, state, postal_code, directions, location, is_default')
      .order('is_default', { ascending: false }).order('created_at').then(({ data }) => setDirecciones(data ?? []));
  }, []));

  return (
    <Screen header={<AppBar title="Direcciones guardadas" />}>
      {direcciones && !direcciones.length ? <Note>Agrega tu casa o tu trabajo para pedir servicios más rápido.</Note> : null}
      <ListGroup>
        {(direcciones ?? []).map((d) => (
          <ListRow key={d.id} icon={d.is_default ? Star : MapPin} title={textoDireccion(d)} value={d.is_default ? 'Principal' : undefined}
            onPress={() => router.push({ pathname: '/cliente/direccion', params: { id: d.id } })} />
        ))}
        <ListRow icon={Plus} title="Agregar dirección" last onPress={() => router.push('/cliente/direccion')} />
      </ListGroup>
    </Screen>
  );
}
