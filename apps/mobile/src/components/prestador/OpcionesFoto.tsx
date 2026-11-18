import { useState } from 'react';
import { View } from 'react-native';
import { Camera, Image as ImageIcon } from 'lucide-react-native';
import { Button, Note } from '@/components/ui';
import { elegirFoto, mensajePermiso, type Foto } from '@/features/prestador/archivos';

// "Tomar foto" / "Elegir de mis fotos". Se usa en la foto de perfil, certificados y documentos.
type Props = {
  onFoto: (foto: Foto) => void | Promise<void>;
  frontal?: boolean;
  cuadrada?: boolean;
  /** La selfie solo se toma con la cámara */
  soloCamara?: boolean;
  textoCamara?: string;
  cargando?: boolean;
};

export function OpcionesFoto({ onFoto, frontal, cuadrada, soloCamara, textoCamara = 'Tomar foto', cargando }: Props) {
  const [aviso, setAviso] = useState<string | null>(null);

  async function abrir(origen: 'camara' | 'galeria') {
    setAviso(null);
    const r = await elegirFoto(origen, { frontal, cuadrada });
    if (r === 'sin-permiso') return setAviso(mensajePermiso(origen));
    if (r) await onFoto(r);
  }

  return (
    <View className="gap-2">
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button size="sm" variant="secondary" icon={Camera} onPress={() => abrir('camara')} loading={cargando}>{textoCamara}</Button>
        </View>
        {soloCamara ? null : (
          <View className="flex-1">
            <Button size="sm" variant="secondary" icon={ImageIcon} onPress={() => abrir('galeria')} disabled={cargando}>Elegir de mis fotos</Button>
          </View>
        )}
      </View>
      {aviso ? <Note tone="warning">{aviso}</Note> : null}
    </View>
  );
}
