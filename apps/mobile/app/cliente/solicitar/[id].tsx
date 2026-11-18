import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ChevronDown, Image as ImageIcon, MapPin, Play, Plus, Video, X } from 'lucide-react-native';
import { AppBar, BottomBar, Button, Chip, Note, Screen, SegmentedControl, TextField } from '@/components/ui';
import { CalendarDayCell } from '@/components/cliente/CalendarDayCell';
import { PaymentOption } from '@/components/cliente/PaymentOption';
import { useSession } from '@/features/auth/session';
import { textoDireccion, type Direccion, type PerfilPublico } from '@/features/cliente/datos';
import {
  FRANJAS, ORDEN_PAGOS, PAGO_DETALLE, URGENCIAS, diaCorto, diaLargo, diaSemana, isoEnDias, lista, numeroDia, precio, primerNombre,
  type FormaPago, type Urgencia,
} from '@/features/cliente/formato';
import { mensajePermiso } from '@/features/prestador/archivos';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

// A6 · Nueva solicitud. Se guarda directo en Supabase: RLS exige que la dirección sea tuya y el
// trigger validar_solicitud() revisa servicio, días, horario y forma de pago. Después se suben
// las fotos y el video a request-media/<solicitud>/ (solo cliente y prestador pueden verlos).
type Medio = { uri: string; tipo: 'image' | 'video'; mime: string; duracion?: number };
type Franja = (typeof FRANJAS)[number]['value'];
const MAX_FOTOS = 5;
const DIAS_VISIBLES = 7;

export default function NuevaSolicitud() {
  const { id, servicio: servicioInicial } = useLocalSearchParams<{ id: string; servicio?: string }>();
  const { session } = useSession();
  const [p, setP] = useState<PerfilPublico | null>(null);
  const [ocupados, setOcupados] = useState<string[]>([]);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [servicioId, setServicioId] = useState<string | null>(servicioInicial ?? null);
  const [descripcion, setDescripcion] = useState('');
  const [medios, setMedios] = useState<Medio[]>([]);
  const [direccionId, setDireccionId] = useState<string | null>(null);
  const [urgencia, setUrgencia] = useState<Urgencia>('this_week');
  const [dias, setDias] = useState<string[]>([]);
  const [franjas, setFranjas] = useState<Franja[]>([]);
  const [pagos, setPagos] = useState<FormaPago[]>([]);
  const [lista_, setLista] = useState<'servicio' | 'direccion' | null>(null);
  const [opcionesMedio, setOpcionesMedio] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);

  useEffect(() => {
    supabase.rpc('perfil_prestador', { p_provider: id }).then(({ data }) => {
      const perfil = data as PerfilPublico | null;
      setP(perfil);
      if (!perfil) return;
      if (!servicioInicial && perfil.servicios[0]) setServicioId(perfil.servicios[0].id);
      setPagos(perfil.payment_methods.includes('cash') ? ['cash'] : perfil.payment_methods.slice(0, 1));
    });
    supabase.rpc('provider_busy_days', { p_provider: id, p_from: isoEnDias(0), p_to: isoEnDias(DIAS_VISIBLES - 1) })
      .then(({ data }) => setOcupados((data ?? []).filter((d) => d.all_day).map((d) => d.day)));
  }, [id, servicioInicial]);

  // Al volver de "Agregar dirección", se recargan y se elige la nueva o la principal
  useFocusEffect(useCallback(() => {
    supabase.from('addresses').select('id, label, street, ext_number, int_number, neighborhood, municipality, state, postal_code, directions, location, is_default')
      .order('is_default', { ascending: false }).order('created_at', { ascending: false })
      .then(({ data }) => {
        const ds = data ?? [];
        setDirecciones(ds);
        setDireccionId((actual) => (actual && ds.some((d) => d.id === actual) ? actual : ds[0]?.id ?? null));
      });
  }, []));

  const diasVisibles = useMemo(() => Array.from({ length: DIAS_VISIBLES }, (_, i) => isoEnDias(i)), []);
  const disponible = (iso: string) => !!p && p.dias.includes(diaSemana(iso)) && !ocupados.includes(iso);

  // "Urgente, hoy" marca hoy (si trabaja hoy)
  useEffect(() => {
    if (urgencia === 'urgent' && p && disponible(diasVisibles[0])) setDias([diasVisibles[0]]);
  }, [urgencia, p]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!p) {
    return <Screen header={<AppBar title="Nueva solicitud" />}><View className="items-center py-10"><ActivityIndicator color={colors.primary} /></View></Screen>;
  }

  const nombre = primerNombre(p.full_name);
  const servicio = p.servicios.find((s) => s.id === servicioId) ?? null;
  const direccion = direcciones.find((d) => d.id === direccionId) ?? null;
  const fotos = medios.filter((m) => m.tipo === 'image').length;
  const hayVideo = medios.some((m) => m.tipo === 'video');
  const pagosPrestador = ORDEN_PAGOS.filter((m) => p.payment_methods.includes(m));

  const alternarDia = (iso: string) => { setError(null); setDias(dias.includes(iso) ? dias.filter((d) => d !== iso) : [...dias, iso].sort()); };
  const alternarFranja = (f: Franja) => {
    setError(null);
    if (f === 'flexible') return setFranjas(franjas.includes('flexible') ? [] : ['flexible']);
    const sin = franjas.filter((x) => x !== 'flexible');
    setFranjas(sin.includes(f) ? sin.filter((x) => x !== f) : [...sin, f]);
  };

  async function agregarMedios(origen: 'foto' | 'video' | 'galeria') {
    setAviso(null);
    setOpcionesMedio(false);
    const camara = origen !== 'galeria';
    const permiso = camara ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) return setAviso(mensajePermiso(camara ? 'camara' : 'galeria'));
    const opciones: ImagePicker.ImagePickerOptions = {
      mediaTypes: origen === 'foto' ? ['images'] : origen === 'video' ? ['videos'] : hayVideo ? ['images'] : ['images', 'videos'],
      quality: 0.7,
      videoMaxDuration: 30,
      allowsMultipleSelection: origen === 'galeria',
      selectionLimit: Math.max(1, MAX_FOTOS - fotos + (hayVideo ? 0 : 1)),
    };
    const r = camara ? await ImagePicker.launchCameraAsync(opciones) : await ImagePicker.launchImageLibraryAsync(opciones);
    if (r.canceled) return;
    const nuevos = [...medios];
    let descartados = 0;
    for (const a of r.assets) {
      const esVideo = a.type === 'video';
      if (esVideo) {
        if (nuevos.some((m) => m.tipo === 'video') || (a.duration ?? 0) > 31_000) { descartados++; continue; }
        nuevos.push({ uri: a.uri, tipo: 'video', mime: a.mimeType ?? 'video/quicktime', duracion: Math.round((a.duration ?? 0) / 1000) });
      } else {
        if (nuevos.filter((m) => m.tipo === 'image').length >= MAX_FOTOS) { descartados++; continue; }
        nuevos.push({ uri: a.uri, tipo: 'image', mime: a.mimeType === 'image/png' ? 'image/png' : 'image/jpeg' });
      }
    }
    setMedios(nuevos);
    if (descartados) setAviso('Se pueden agregar hasta 5 fotos y 1 video de 30 segundos. Dejamos fuera los que no cabían.');
  }

  async function enviar() {
    if (!session || !p) return;
    if (!servicio) return setError('Elige el servicio que necesitas.');
    if (descripcion.trim().length < 10) return setError('Cuéntale qué está pasando (al menos 10 caracteres).');
    if (!direccion) return setError('Agrega la dirección donde será el servicio.');
    if (!dias.length) return setError('Elige al menos un día.');
    if (!franjas.length) return setError('Elige en qué horario te funciona.');
    if (!pagos.length) return setError('Elige cómo prefieres pagar.');
    setError(null);
    setEnviando('Enviando tu solicitud…');
    const { data, error } = await supabase.from('service_requests').insert({
      client_id: session.user.id, provider_id: p.id, service_id: servicio.id, category_id: servicio.category_id, address_id: direccion.id,
      description: descripcion.trim(), urgency: urgencia, preferred_dates: dias, time_windows: franjas, preferred_payment_methods: pagos,
    }).select('id').single();
    if (error || !data) {
      setEnviando(null);
      return setError(error?.message && /disponible|pasaron|pago|servicio|Horario/.test(error.message)
        ? error.message : 'No pudimos enviar tu solicitud. Revisa tu conexión e intenta de nuevo.');
    }
    // Fotos y video: si alguno falla, la solicitud ya se envió; solo se avisa
    let fallidos = 0;
    for (const [i, m] of medios.entries()) {
      setEnviando(`Subiendo ${m.tipo === 'video' ? 'el video' : 'fotos'} (${i + 1} de ${medios.length})…`);
      try {
        const ext = m.tipo === 'video' ? (m.mime === 'video/mp4' ? 'mp4' : 'mov') : m.mime === 'image/png' ? 'png' : 'jpg';
        const ruta = `${data.id}/${m.tipo === 'video' ? 'video' : `foto-${i + 1}`}.${ext}`;
        const contenido = await fetch(m.uri).then((r) => r.arrayBuffer());
        const sub = await supabase.storage.from('request-media').upload(ruta, contenido, { contentType: m.mime, upsert: true });
        if (sub.error) throw sub.error;
        const ins = await supabase.from('request_media').insert({ request_id: data.id, kind: m.tipo, storage_path: ruta, duration_s: m.duracion ?? null, sort_order: i });
        if (ins.error) throw ins.error;
      } catch {
        fallidos++;
      }
    }
    setEnviando(null);
    router.dismissTo({ pathname: '/requests', params: { enviada: nombre, fallidos: String(fallidos) } });
  }

  const resumenDias = dias.length ? lista(dias.map(diaLargo)) : null;
  const resumenFranjas = franjas.length ? lista(FRANJAS.filter((f) => franjas.includes(f.value)).map((f) => f.corto)) : null;

  return (
    <Screen
      header={<AppBar title={`Solicitud a ${nombre}`} />}
      footer={
        <BottomBar helper={`${nombre} confirma precio y hora. El pago es directo con ${nombre}.`}>
          <Button onPress={enviar} loading={!!enviando}>Enviar solicitud</Button>
        </BottomBar>
      }
    >
      {error ? <Note tone="error">{error}</Note> : null}
      {enviando ? <Note>{enviando}</Note> : null}

      {/* Servicio */}
      <Campo etiqueta="Servicio" valor={servicio ? `${servicio.title} · ${precioTexto(servicio)}` : 'Elige un servicio'} onPress={() => setLista('servicio')} testID="campo-servicio" />

      <TextField label="¿Qué está pasando?" value={descripcion} onChangeText={(t) => { setDescripcion(t); setError(null); }} multiline maxLength={1000}
        placeholder="Describe el problema: qué pasa, desde cuándo, qué ya intentaste…" testID="descripcion" />

      {/* Fotos o video */}
      <View className="gap-2">
        <Text className="font-sans-semibold text-sm text-foreground">Fotos o video (opcional)</Text>
        <View className="flex-row flex-wrap gap-2">
          {medios.map((m, i) => (
            <View key={m.uri} className="size-18 overflow-hidden rounded-xl bg-border">
              <Image source={{ uri: m.uri }} style={{ width: 72, height: 72 }} />
              {m.tipo === 'video' ? (
                <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: 'rgba(18,26,46,0.35)' }}>
                  <Play size={20} color={colors.card} fill={colors.card} />
                  <Text className="font-sans-bold text-xs text-primary-foreground">{`0:${String(m.duracion ?? 0).padStart(2, '0')}`}</Text>
                </View>
              ) : null}
              <Pressable onPress={() => setMedios(medios.filter((_, j) => j !== i))} hitSlop={8} accessibilityLabel="Quitar"
                className="absolute right-1 top-1 size-5 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(18,26,46,0.6)' }}>
                <X size={12} color={colors.card} />
              </Pressable>
            </View>
          ))}
          {fotos < MAX_FOTOS || !hayVideo ? (
            <Pressable onPress={() => setOpcionesMedio(!opcionesMedio)} accessibilityRole="button" accessibilityLabel="Agregar fotos o video"
              className="size-18 items-center justify-center rounded-xl border border-dashed border-border bg-card" testID="agregar-medio">
              <Plus size={24} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
        {opcionesMedio ? (
          <View className="flex-row flex-wrap gap-2">
            {fotos < MAX_FOTOS ? <Button size="sm" variant="secondary" icon={Camera} onPress={() => agregarMedios('foto')}>Tomar foto</Button> : null}
            {!hayVideo ? <Button size="sm" variant="secondary" icon={Video} onPress={() => agregarMedios('video')}>Grabar video</Button> : null}
            <Button size="sm" variant="secondary" icon={ImageIcon} onPress={() => agregarMedios('galeria')}>Elegir de mis fotos</Button>
          </View>
        ) : null}
        <Text className="font-sans text-xs text-muted-foreground">
          Hasta 5 fotos y 1 video de 30 segundos. Así el prestador entiende mejor el problema y cotiza con más precisión.
        </Text>
        {aviso ? <Note tone="warning">{aviso}</Note> : null}
      </View>

      {/* Dirección */}
      <Campo etiqueta="Dirección" icono valor={direccion ? textoDireccion(direccion) : 'Agrega una dirección'}
        onPress={() => (direcciones.length ? setLista('direccion') : router.push('/cliente/direccion'))} testID="campo-direccion" />

      {/* Urgencia */}
      <View className="gap-2">
        <Text className="font-sans-semibold text-sm text-foreground">¿Qué tan urgente es?</Text>
        <SegmentedControl options={URGENCIAS} value={urgencia} onChange={setUrgencia} />
        <Text className="font-sans text-xs text-muted-foreground">{URGENCIAS.find((u) => u.value === urgencia)!.ayuda(nombre)}</Text>
      </View>

      {/* Días */}
      <View className="gap-2">
        <Text className="font-sans-semibold text-sm text-foreground">¿Qué días te funcionan?</Text>
        <Text className="font-sans text-xs text-muted-foreground">{`Elige uno o varios. En gris, los días que ${nombre} no trabaja o ya tiene ocupados.`}</Text>
        <View className="flex-row justify-between">
          {diasVisibles.map((iso) => (
            <View key={iso} className="items-center gap-1">
              <Text className="font-sans-medium text-xs text-muted-foreground">{diaCorto(iso)}</Text>
              <CalendarDayCell dia={numeroDia(iso)} etiqueta={diaLargo(iso)} onPress={() => alternarDia(iso)}
                estado={!disponible(iso) ? 'no-disponible' : dias.includes(iso) ? 'seleccionado' : 'normal'} />
            </View>
          ))}
        </View>
      </View>

      {/* Horario */}
      <View className="gap-2">
        <Text className="font-sans-semibold text-sm text-foreground">¿En qué horario?</Text>
        <View className="flex-row flex-wrap gap-2">
          {FRANJAS.map((f) => <Chip key={f.value} selected={franjas.includes(f.value)} onPress={() => alternarFranja(f.value)}>{f.label}</Chip>)}
        </View>
      </View>
      {resumenDias && resumenFranjas ? (
        <Note>{`${nombre} verá: ${resumenDias}, ${resumenFranjas}. Te propone la hora exacta al aceptar.`}</Note>
      ) : null}

      {/* Pago */}
      <View className="gap-2">
        <Text className="font-sans-semibold text-sm text-foreground">¿Cómo prefieres pagar?</Text>
        <Text className="font-sans text-xs text-muted-foreground">{`${nombre} acepta estas formas. Puedes elegir más de una.`}</Text>
        {pagosPrestador.map((m) => (
          <PaymentOption key={m} metodo={PAGO_DETALLE[m].titulo} detalle={PAGO_DETALLE[m].detalle(nombre)} on={pagos.includes(m)}
            onChange={(v) => { setError(null); setPagos(v ? [...pagos, m] : pagos.filter((x) => x !== m)); }} />
        ))}
      </View>

      {/* Listas para elegir servicio o dirección */}
      <Modal visible={lista_ !== null} transparent animationType="slide" onRequestClose={() => setLista(null)}>
        <Pressable className="flex-1 justify-end" style={{ backgroundColor: 'rgba(18, 26, 46, 0.35)' }} onPress={() => setLista(null)}>
          <View className="max-h-[70%] rounded-t-3xl bg-card pb-8 pt-3">
            <Text className="px-5 pb-2 font-display text-lg text-foreground">{lista_ === 'servicio' ? 'Servicio' : 'Dirección'}</Text>
            {lista_ === 'servicio' ? (
              <FlatList data={p.servicios} keyExtractor={(s) => s.id} renderItem={({ item }) => (
                <Opcion texto={item.title} detalle={`${item.categoria} · ${precioTexto(item)}`} activa={item.id === servicioId}
                  onPress={() => { setServicioId(item.id); setLista(null); }} />
              )} />
            ) : (
              <FlatList data={direcciones} keyExtractor={(d) => d.id}
                ListFooterComponent={<Opcion texto="Agregar dirección" activa={false} onPress={() => { setLista(null); router.push('/cliente/direccion'); }} />}
                renderItem={({ item }) => (
                  <Opcion texto={textoDireccion(item)} detalle={item.is_default ? 'Principal' : undefined} activa={item.id === direccionId}
                    onPress={() => { setDireccionId(item.id); setLista(null); }} />
                )} />
            )}
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function precioTexto(s: { price_type: PerfilPublico['servicios'][number]['price_type']; price_mxn: number | null }) {
  const [monto, detalle] = precio(s.price_type, s.price_mxn);
  return s.price_type === 'hourly' ? `${monto} ${detalle}` : monto;
}

function Campo({ etiqueta, valor, onPress, icono, testID }: { etiqueta: string; valor: string; onPress: () => void; icono?: boolean; testID?: string }) {
  return (
    <View className="gap-1.5">
      <Text className="font-sans-semibold text-sm text-foreground">{etiqueta}</Text>
      <Pressable onPress={onPress} accessibilityRole="button" testID={testID}
        className="min-h-12 flex-row items-center gap-2 rounded-xl border border-border bg-card px-3 py-3">
        {icono ? <MapPin size={18} color={colors.mutedForeground} /> : null}
        <Text className="flex-1 font-sans text-base text-foreground">{valor}</Text>
        <ChevronDown size={18} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

function Opcion({ texto, detalle, activa, onPress }: { texto: string; detalle?: string; activa: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`gap-0.5 px-5 py-3 ${activa ? 'bg-primary-soft' : ''}`}>
      <Text className={`font-sans-semibold text-base ${activa ? 'text-primary' : 'text-foreground'}`}>{texto}</Text>
      {detalle ? <Text className="font-sans text-sm text-muted-foreground">{detalle}</Text> : null}
    </Pressable>
  );
}
