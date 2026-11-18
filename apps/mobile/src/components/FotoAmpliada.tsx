import { Image, Modal, Pressable, View } from 'react-native';
import { X } from 'lucide-react-native';

/** Foto a pantalla completa; se cierra tocándola. */
export function FotoAmpliada({ url, onClose }: { url: string | null; onClose: () => void }) {
  return (
    <Modal visible={!!url} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 items-center justify-center bg-black/90 p-4" accessibilityLabel="Cerrar foto">
        {url ? <Image source={{ uri: url }} resizeMode="contain" className="h-full w-full" /> : null}
        <View className="absolute right-5 top-14"><X size={28} color="#FFFFFF" /></View>
      </Pressable>
    </Modal>
  );
}
