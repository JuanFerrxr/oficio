import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

// Fotos para el alta del prestador: foto de perfil (B0.1), certificados (B1) y documentos (B3).
export type Foto = { uri: string; mime: string };

/**
 * Abre la cámara o la galería. Devuelve null si la persona cancela o niega el permiso.
 * `quality` < 1 hace que el iPhone entregue JPEG (no HEIC), que es lo que aceptan los buckets.
 */
export async function elegirFoto(origen: 'camara' | 'galeria', opciones: { frontal?: boolean; cuadrada?: boolean } = {}): Promise<Foto | null | 'sin-permiso'> {
  const permiso = origen === 'camara'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) return 'sin-permiso';

  const config: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.7,
    allowsEditing: !!opciones.cuadrada,
    aspect: opciones.cuadrada ? [1, 1] : undefined,
    cameraType: opciones.frontal ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
  };
  const r = origen === 'camara' ? await ImagePicker.launchCameraAsync(config) : await ImagePicker.launchImageLibraryAsync(config);
  if (r.canceled || !r.assets[0]) return null;
  const a = r.assets[0];
  return { uri: a.uri, mime: a.mimeType === 'image/png' ? 'image/png' : 'image/jpeg' };
}

const extension = (mime: string) => (mime === 'image/png' ? 'png' : 'jpg');

/** Sube una foto a Storage y devuelve la ruta guardada (bucket/ruta). Reemplaza si ya existía. */
export async function subirFoto(bucket: 'avatars' | 'verification', rutaSinExtension: string, foto: Foto): Promise<string> {
  const ruta = `${rutaSinExtension}.${extension(foto.mime)}`;
  const contenido = await fetch(foto.uri).then((r) => r.arrayBuffer());
  const { error } = await supabase.storage.from(bucket).upload(ruta, contenido, { contentType: foto.mime, upsert: true });
  if (error) throw error;
  return ruta;
}

/**
 * B0.1 · Foto de perfil: se guarda con un nombre nuevo cada vez (así el teléfono no muestra la
 * foto vieja guardada en caché) y se apunta en profiles.avatar_url.
 */
export async function guardarFotoDePerfil(uid: string, foto: Foto): Promise<string> {
  const ruta = await subirFoto('avatars', `${uid}/foto-${Date.now()}`, foto);
  const url = supabase.storage.from('avatars').getPublicUrl(ruta).data.publicUrl;
  const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', uid);
  if (error) throw error;
  await supabase.auth.updateUser({ data: { avatar_url: url } });
  return url;
}

export const mensajePermiso = (origen: 'camara' | 'galeria') =>
  origen === 'camara'
    ? 'Oficio no tiene permiso para usar la cámara. Actívalo en Ajustes del iPhone → Expo Go → Cámara.'
    : 'Oficio no tiene permiso para ver tus fotos. Actívalo en Ajustes del iPhone → Expo Go → Fotos.';
