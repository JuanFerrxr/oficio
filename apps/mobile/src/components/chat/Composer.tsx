import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { Camera, Image as ImageIcon, MapPin, Mic, Plus, Send, Square, Trash2, Video } from 'lucide-react-native';
import { duracion } from '@/features/chat/chat';
import { colors } from '@/theme/colors';

// Figma: ChatComposer · "Escribe un mensaje…". Con texto: enviar. Sin texto: micrófono (nota de
// voz, hasta 2 min). "+" abre: tomar foto, foto o video de la galería, grabar video (30 s) y
// compartir ubicación.
export type Adjunto =
  | { tipo: 'image' | 'video' | 'audio'; uri: string; mime: string; segundos?: number }
  | { tipo: 'location'; lat: number; lng: number; direccion?: string };

type Props = { onTexto: (t: string) => Promise<boolean>; onAdjunto: (a: Adjunto) => Promise<boolean>; onAviso: (t: string) => void };
const MAX_VOZ = 120;

export function Composer({ onTexto, onAdjunto, onAviso }: Props) {
  const [texto, setTexto] = useState('');
  const [menu, setMenu] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const rec = useAudioRecorderState(recorder, 250);
  const [grabando, setGrabando] = useState(false);
  const segundos = Math.floor((rec.durationMillis ?? 0) / 1000);

  // Tope de 2 minutos por nota de voz
  useEffect(() => { if (grabando && segundos >= MAX_VOZ) detener(true); }, [segundos, grabando]); // eslint-disable-line react-hooks/exhaustive-deps

  async function mandarTexto() {
    const t = texto.trim();
    if (!t) return;
    setEnviando(true);
    if (await onTexto(t)) setTexto('');
    setEnviando(false);
  }

  async function adjuntar(a: Adjunto) {
    setEnviando(true);
    await onAdjunto(a);
    setEnviando(false);
  }

  // ---- Fotos y video ----
  async function elegir(origen: 'camara-foto' | 'camara-video' | 'galeria') {
    setMenu(false);
    const camara = origen !== 'galeria';
    const permiso = camara ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) return onAviso(camara ? 'Activa la cámara para Expo Go en Ajustes del iPhone.' : 'Activa el acceso a tus fotos para Expo Go en Ajustes del iPhone.');
    const opciones: ImagePicker.ImagePickerOptions = {
      mediaTypes: origen === 'camara-foto' ? ['images'] : origen === 'camara-video' ? ['videos'] : ['images', 'videos'],
      quality: 0.7, videoMaxDuration: 30,
    };
    const r = camara ? await ImagePicker.launchCameraAsync(opciones) : await ImagePicker.launchImageLibraryAsync(opciones);
    if (r.canceled || !r.assets[0]) return;
    const a = r.assets[0];
    if (a.type === 'video') {
      if ((a.duration ?? 0) > 31_000) return onAviso('El video puede durar hasta 30 segundos.');
      await adjuntar({ tipo: 'video', uri: a.uri, mime: a.mimeType === 'video/mp4' ? 'video/mp4' : 'video/quicktime', segundos: (a.duration ?? 1000) / 1000 });
    } else {
      await adjuntar({ tipo: 'image', uri: a.uri, mime: a.mimeType === 'image/png' ? 'image/png' : 'image/jpeg' });
    }
  }

  // ---- Ubicación ----
  async function ubicacion() {
    setMenu(false);
    const p = await Location.requestForegroundPermissionsAsync();
    if (!p.granted) return onAviso('Activa la ubicación para Expo Go en Ajustes del iPhone.');
    setEnviando(true);
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      let direccion: string | undefined;
      try {
        const [d] = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        if (d) direccion = [[d.street, d.streetNumber].filter(Boolean).join(' '), d.district ? `Col. ${d.district}` : null].filter(Boolean).join(', ') || undefined;
      } catch { /* sin dirección, solo coordenadas */ }
      await onAdjunto({ tipo: 'location', lat: pos.coords.latitude, lng: pos.coords.longitude, direccion });
    } catch {
      onAviso('No pudimos obtener tu ubicación. Intenta de nuevo.');
    }
    setEnviando(false);
  }

  // ---- Nota de voz ----
  async function grabar() {
    const p = await requestRecordingPermissionsAsync();
    if (!p.granted) return onAviso('Activa el micrófono para Expo Go en Ajustes del iPhone.');
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setGrabando(true);
  }
  async function detener(enviar: boolean) {
    const dur = segundos;
    await recorder.stop();
    setGrabando(false);
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    if (!enviar) return;
    if (dur < 1 || !recorder.uri) return onAviso('Mantén la grabación al menos un segundo.');
    await adjuntar({ tipo: 'audio', uri: recorder.uri, mime: 'audio/mp4', segundos: dur });
  }

  if (grabando) {
    return (
      <View className="flex-row items-center gap-3 border-t border-border bg-card px-4 py-3" testID="grabando">
        <Pressable onPress={() => detener(false)} hitSlop={10} accessibilityLabel="Descartar nota de voz"><Trash2 size={22} color={colors.danger} /></Pressable>
        <View className="h-2.5 w-2.5 rounded-full bg-danger" />
        <Text className="flex-1 font-sans-semibold text-base text-foreground">{`Grabando · ${duracion(segundos)}`}</Text>
        <Pressable onPress={() => detener(true)} accessibilityLabel="Enviar nota de voz" className="h-11 w-11 items-center justify-center rounded-full bg-primary">
          <Square size={16} color={colors.primaryForeground} fill={colors.primaryForeground} />
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-row items-end gap-2 border-t border-border bg-card px-3 py-2.5">
      <Pressable onPress={() => setMenu(true)} accessibilityLabel="Adjuntar" testID="adjuntar" className="h-11 w-11 items-center justify-center rounded-full bg-primary-soft">
        <Plus size={22} color={colors.primary} />
      </Pressable>
      <TextInput
        value={texto} onChangeText={setTexto} placeholder="Escribe un mensaje…" placeholderTextColor={colors.mutedForeground}
        multiline maxLength={2000} testID="mensaje-texto" accessibilityLabel="Mensaje"
        className="max-h-28 min-h-11 flex-1 rounded-3xl border border-border bg-background px-4 py-2.5 font-sans text-base text-foreground"
      />
      {enviando ? <View className="h-11 w-11 items-center justify-center"><ActivityIndicator color={colors.primary} /></View>
        : texto.trim() ? (
          <Pressable onPress={mandarTexto} accessibilityLabel="Enviar" testID="enviar" className="h-11 w-11 items-center justify-center rounded-full bg-primary">
            <Send size={20} color={colors.primaryForeground} />
          </Pressable>
        ) : (
          <Pressable onPress={grabar} accessibilityLabel="Grabar nota de voz" testID="grabar" className="h-11 w-11 items-center justify-center rounded-full bg-primary">
            <Mic size={20} color={colors.primaryForeground} />
          </Pressable>
        )}

      <Modal visible={menu} transparent animationType="slide" onRequestClose={() => setMenu(false)}>
        <Pressable className="flex-1 justify-end" style={{ backgroundColor: 'rgba(18, 26, 46, 0.35)' }} onPress={() => setMenu(false)}>
          <View className="gap-1 rounded-t-3xl bg-card px-5 pb-10 pt-4">
            {[
              { icono: Camera, texto: 'Tomar foto', fn: () => elegir('camara-foto') },
              { icono: Video, texto: 'Grabar video (30 s)', fn: () => elegir('camara-video') },
              { icono: ImageIcon, texto: 'Foto o video de mi galería', fn: () => elegir('galeria') },
              { icono: MapPin, texto: 'Compartir mi ubicación', fn: ubicacion },
            ].map((o) => (
              <Pressable key={o.texto} onPress={o.fn} className="h-14 flex-row items-center gap-4 rounded-xl px-2 active:bg-primary-soft" accessibilityRole="button">
                <o.icono size={22} color={colors.primary} />
                <Text className="font-sans-semibold text-base text-foreground">{o.texto}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
