import { router } from 'expo-router';
import { Activity, LayoutGrid, Store, UserRound } from 'lucide-react-native';
import { AppBar, ListGroup, ListRow, Note, Screen } from '@/components/ui';

export default function Herramientas() {
  return (
    <Screen header={<AppBar title="Herramientas de desarrollo" />}>
      <Note>Solo aparecen mientras desarrollas. En la app de las tiendas no existen.</Note>
      <Note tone="privacy">
        Las pestañas piden sesión. La del prestador, además, una cuenta con alta de prestador (Sprint 2). Entra con mariana@demo.mx y Oficio2026!, o regístrate con un número de
        prueba: 55 5000 0001 a 55 5000 0005, código 123456.
      </Note>
      <ListGroup>
        <ListRow icon={Activity} title="Diagnóstico de conexión" onPress={() => router.push('/dev/diagnostico')} />
        <ListRow icon={LayoutGrid} title="Catálogo de componentes" onPress={() => router.push('/dev/catalogo')} />
        <ListRow icon={UserRound} title="Ver la app del cliente" onPress={() => router.push('/home')} />
        <ListRow icon={Store} title="Ver la app del prestador" onPress={() => router.push('/prestador')} last />
      </ListGroup>
    </Screen>
  );
}
