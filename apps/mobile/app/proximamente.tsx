import { useLocalSearchParams } from 'expo-router';
import { Proximamente } from '@/components/Proximamente';

// Pantalla provisional para filas y botones cuyo contenido llega en otro sprint.
// Uso: router.push({ pathname: '/proximamente', params: { code, title, description, sprint } })
export default function PantallaProximamente() {
  const p = useLocalSearchParams<{ code: string; title: string; description: string; sprint: string }>();
  return (
    <Proximamente
      code={p.code ?? ''}
      title={p.title ?? 'Próximamente'}
      description={p.description ?? ''}
      sprint={p.sprint === 'post-beta' ? 'post-beta' : Number(p.sprint ?? 0)}
      back
    />
  );
}
