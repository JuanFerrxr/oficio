import { router } from 'expo-router';
import { Activity, LayoutGrid, Store, UserRound } from 'lucide-react-native';
import { AppBar, ListGroup, ListRow, Note, Screen } from '@/components/ui';

export default function Herramientas() {
  return (
    <Screen header={<AppBar title="Herramientas de desarrollo" />}>
      <Note>Solo aparecen mientras desarrollas. En la app de las tiendas no existen.</Note>
      <ListGroup>
        <ListRow icon={Activity} title="Diagnóstico de conexión" onPress={() => router.push('/dev/diagnostico')} />
        <ListRow icon={LayoutGrid} title="Catálogo de componentes" onPress={() => router.push('/dev/catalogo')} />
        <ListRow icon={UserRound} title="Ver la app del cliente" onPress={() => router.push('/home')} />
        <ListRow icon={Store} title="Ver la app del prestador" onPress={() => router.push('/prestador')} last />
      </ListGroup>
    </Screen>
  );
}
