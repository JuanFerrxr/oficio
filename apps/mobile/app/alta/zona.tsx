import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Slider from '@react-native-community/slider';
import * as Location from 'expo-location';
import { LocateFixed } from 'lucide-react-native';
import { BottomBar, Button, Chip, DayToggle, Note, Screen, Title } from '@/components/ui';
import { EncabezadoAlta } from '@/components/prestador/PasoAlta';
import { HoraCampo } from '@/components/prestador/HoraCampo';
import { MapaZona } from '@/components/prestador/MapaZona';
import { useAlta } from '@/features/prestador/alta';
import { DIAS, hhmm } from '@/features/prestador/horario';
import { FORMAS_PAGO, type FormaPago } from '@/features/prestador/pagos';
import { PUEBLA, puntoDesdeBase, puntoParaBase, type Punto } from '@/features/prestador/ubicacion';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

// B2 · ¿Dónde y cuándo trabajas? (Paso 4 de 5)
// Punto en el mapa + distancia máxima (1–25 km) + días y horario base + formas de pago.
// Las formas de pago van aquí (y no en un paso más) para no alargar el alta: son 3 opciones.
// El horario es el mismo para
// todos los días elegidos; los bloqueos de días u horas llegan con el calendario (después de la beta).
const RADIO_MAX = 25;

export default function ZonaYHorario() {
  const { editar } = useLocalSearchParams<{ editar?: string }>();
  const editando = editar === '1';
  const { uid, perfil, horario, cargando } = useAlta();
  const [listo, setListo] = useState(false);
  const [punto, setPunto] = useState<Punto>(PUEBLA);
  const [tienePunto, setTienePunto] = useState(false);
  const [radio, setRadio] = useState(8);
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [desde, setDesde] = useState('08:00');
  const [hasta, setHasta] = useState('19:00');
  const [pagos, setPagos] = useState<FormaPago[]>(['cash']);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ubicando, setUbicando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Precarga lo guardado; si no hay ubicación, intenta con el GPS
  useEffect(() => {
    if (cargando || listo) return;
    setListo(true);
    const guardado = puntoDesdeBase(perfil?.base_location);
    // El radio guardado solo cuenta si ya había guardado su zona (la base pone 10 km por omisión)
    if (guardado && perfil?.service_radius_km) setRadio(Math.min(perfil.service_radius_km, RADIO_MAX));
    if (perfil?.payment_methods?.length) setPagos(perfil.payment_methods);
    if (horario.length) {
      setDias([...new Set(horario.map((h) => h.weekday))]);
      setDesde(hhmm(horario[0].start_time));
      setHasta(hhmm(horario[0].end_time));
    }
    if (guardado) {
      setPunto(guardado);
      setTienePunto(true);
    } else {
      usarMiUbicacion();
    }
  }, [cargando, listo, perfil, horario]);

  async function usarMiUbicacion() {
    setAviso(null);
    setUbicando(true);
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setAviso('Sin permiso de ubicación. Toca el mapa para marcar desde dónde trabajas, o actívalo en Ajustes del iPhone → Expo Go → Ubicación.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPunto({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setTienePunto(true);
    } catch {
      setAviso('No pudimos obtener tu ubicación. Toca el mapa para marcarla.');
    } finally {
      setUbicando(false);
    }
  }

  const alternarDia = (d: number) => { setError(null); setDias(dias.includes(d) ? dias.filter((x) => x !== d) : [...dias, d]); };
  const alternarPago = (f: FormaPago) => { setError(null); setPagos(pagos.includes(f) ? pagos.filter((x) => x !== f) : [...pagos, f]); };

  async function continuar() {
    if (!uid) return;
    if (!tienePunto) return setError('Marca en el mapa desde dónde trabajas (o usa tu ubicación).');
    if (dias.length === 0) return setError('Elige al menos un día.');
    if (hasta <= desde) return setError('La hora de fin tiene que ser después de la de inicio.');
    if (pagos.length === 0) return setError('Elige al menos una forma de pago.');
    setGuardando(true);
    setError(null);
    try {
      const perfilR = await supabase.from('provider_profiles')
        .update({ base_location: puntoParaBase(punto), service_radius_km: radio, payment_methods: pagos }).eq('user_id', uid);
      if (perfilR.error) throw perfilR.error;
      const borrar = await supabase.from('provider_availability').delete().eq('provider_id', uid);
      if (borrar.error) throw borrar.error;
      const ins = await supabase.from('provider_availability')
        .insert(dias.map((weekday) => ({ provider_id: uid, weekday, start_time: desde, end_time: hasta })));
      if (ins.error) throw ins.error;
      if (editando) router.back();
      else router.push('/alta/verificacion');
    } catch {
      setError('No pudimos guardar tu zona, horario y formas de pago. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Screen
      header={<EncabezadoAlta paso={4} editando={editando} titulo="Zona, horario y pagos" />}
      footer={
        <BottomBar>
          <Button onPress={continuar} loading={guardando} disabled={cargando}>{editando ? 'Guardar' : 'Continuar'}</Button>
        </BottomBar>
      }
    >
      <Title>¿Dónde y cuándo trabajas?</Title>
      {error ? <Note tone="error">{error}</Note> : null}

      <MapaZona punto={punto} radioKm={radio} onCambio={(p) => { setPunto(p); setTienePunto(true); }} />
      <View className="-mt-2 flex-row items-center justify-between">
        <Text className="flex-1 font-sans text-xs text-muted-foreground">Toca el mapa o arrastra el pin para ajustar.</Text>
        <Button size="sm" variant="ghost" icon={LocateFixed} onPress={usarMiUbicacion} loading={ubicando}>Usar mi ubicación</Button>
      </View>
      {aviso ? <Note tone="warning">{aviso}</Note> : null}

      <View className="gap-1">
        <View className="flex-row items-center justify-between">
          <Text className="font-sans-semibold text-sm text-foreground">Distancia máxima</Text>
          <Text className="font-sans-bold text-sm text-primary" testID="radio">{`${radio} km`}</Text>
        </View>
        <Slider
          minimumValue={1}
          maximumValue={RADIO_MAX}
          step={1}
          value={radio}
          onValueChange={(v) => setRadio(Math.round(v))}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
          accessibilityLabel="Distancia máxima en kilómetros"
        />
      </View>

      <View className="gap-2">
        <Text className="font-sans-semibold text-sm text-foreground">Días disponibles</Text>
        <View className="flex-row justify-between">
          {DIAS.map((d) => (
            <DayToggle key={d.weekday} label={d.corto} nombre={d.nombre} on={dias.includes(d.weekday)} onPress={() => alternarDia(d.weekday)} />
          ))}
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1"><HoraCampo label="Desde" value={desde} onChange={setDesde} testID="desde" /></View>
        <View className="flex-1"><HoraCampo label="Hasta" value={hasta} onChange={setHasta} testID="hasta" /></View>
      </View>

      <View className="gap-2">
        <Text className="font-sans-semibold text-sm text-foreground">Formas de pago que aceptas</Text>
        <View className="flex-row flex-wrap gap-2">
          {FORMAS_PAGO.map((f) => (
            <Chip key={f.value} selected={pagos.includes(f.value)} onPress={() => alternarPago(f.value)}>{f.label}</Chip>
          ))}
        </View>
        <Text className="font-sans text-xs text-muted-foreground">
          Tarjeta: con tu propia terminal. El cliente te paga directo a ti; Oficio no cobra ni maneja el dinero.
        </Text>
      </View>
    </Screen>
  );
}
