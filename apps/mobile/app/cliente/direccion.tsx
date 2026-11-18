import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { LocateFixed } from 'lucide-react-native';
import { AppBar, BottomBar, Button, Checkbox, Chip, Note, Screen, TextField } from '@/components/ui';
import { MapaZona } from '@/components/prestador/MapaZona';
import { useSession } from '@/features/auth/session';
import { etiquetaDireccion, fijarOrigen, useOrigen } from '@/features/cliente/origen';
import { PUEBLA, puntoDesdeBase, puntoParaBase, type Punto } from '@/features/prestador/ubicacion';
import { supabase } from '@/lib/supabase';

// Agregar o editar una dirección (A6 y A9). El pin en el mapa es lo que usa la búsqueda y lo que
// ve el prestador para calcular la distancia; los campos son lo que lee para llegar.
// La calle y el número solo los ve el prestador con la cita confirmada (provider_request_view).
const ETIQUETAS = ['Casa', 'Trabajo', 'Otra'];

export default function EditarDireccion() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session } = useSession();
  const origen = useOrigen();
  const [punto, setPunto] = useState<Punto | null>(null);
  const [etiqueta, setEtiqueta] = useState('Casa');
  const [calle, setCalle] = useState('');
  const [exterior, setExterior] = useState('');
  const [interior, setInterior] = useState('');
  const [colonia, setColonia] = useState('');
  const [cp, setCp] = useState('');
  const [municipio, setMunicipio] = useState('Puebla');
  const [estado, setEstado] = useState('Puebla');
  const [referencias, setReferencias] = useState('');
  const [principal, setPrincipal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!id) {
      supabase.from('addresses').select('id', { count: 'exact', head: true }).then(({ count }) => setPrincipal(!count));
      if (origen && !punto) setPunto({ lat: origen.lat, lng: origen.lng });
      return;
    }
    supabase.from('addresses').select('*').eq('id', id).single().then(({ data: d }) => {
      if (!d) return;
      setPunto(puntoDesdeBase(d.location));
      setEtiqueta(d.label ?? 'Casa');
      setCalle(d.street); setExterior(d.ext_number ?? ''); setInterior(d.int_number ?? '');
      setColonia(d.neighborhood ?? ''); setCp(d.postal_code); setMunicipio(d.municipality); setEstado(d.state);
      setReferencias(d.directions ?? ''); setPrincipal(d.is_default);
    });
  }, [id, origen]); // eslint-disable-line react-hooks/exhaustive-deps

  // El aviso de "falta…" se quita en cuanto se corrige algo
  useEffect(() => { setError(null); }, [calle, cp, municipio, estado, punto]);

  /** Llena calle, colonia y CP a partir del pin (si el iPhone sabe la dirección) */
  async function rellenar(p: Punto) {
    try {
      const [d] = await Location.reverseGeocodeAsync({ latitude: p.lat, longitude: p.lng });
      if (!d) return;
      if (d.street) setCalle(d.street);
      if (d.streetNumber) setExterior(d.streetNumber);
      if (d.district) setColonia(d.district);
      if (d.postalCode) setCp(d.postalCode.slice(0, 5));
      if (d.city) setMunicipio(d.city);
      if (d.region) setEstado(d.region);
    } catch { /* sin datos: se escribe a mano */ }
  }

  async function usarMiUbicacion() {
    setAviso(null);
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return setAviso('Sin permiso de ubicación. Toca el mapa para marcar la dirección.');
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setPunto(p);
      rellenar(p);
    } catch {
      setAviso('No pudimos obtener tu ubicación. Toca el mapa para marcarla.');
    }
  }

  async function guardar() {
    if (!session) return;
    if (!punto) return setError('Marca la dirección en el mapa.');
    if (!calle.trim()) return setError('Escribe la calle.');
    if (!/^\d{5}$/.test(cp)) return setError('El código postal tiene 5 dígitos.');
    if (!municipio.trim() || !estado.trim()) return setError('Escribe el municipio y el estado.');
    setGuardando(true);
    setError(null);
    const fila = {
      user_id: session.user.id, label: etiqueta, street: calle.trim(), ext_number: exterior.trim() || null, int_number: interior.trim() || null,
      neighborhood: colonia.trim() || null, municipality: municipio.trim(), state: estado.trim(), postal_code: cp,
      directions: referencias.trim() || null, location: puntoParaBase(punto), is_default: principal,
    };
    const r = id
      ? await supabase.from('addresses').update(fila).eq('id', id).select('id').single()
      : await supabase.from('addresses').insert(fila).select('id').single();
    setGuardando(false);
    if (r.error || !r.data) return setError('No pudimos guardar la dirección. Intenta de nuevo.');
    // Si es la principal (o la primera), se vuelve el punto de búsqueda
    if (principal || !origen || origen.fuente === 'puebla') {
      fijarOrigen({ ...punto, etiqueta: etiquetaDireccion({ neighborhood: fila.neighborhood, municipality: fila.municipality, label: fila.label, street: fila.street }), direccionId: r.data.id, fuente: 'direccion' });
    }
    router.back();
  }

  async function eliminar() {
    if (!id) return;
    setGuardando(true);
    const { error } = await supabase.from('addresses').delete().eq('id', id);
    setGuardando(false);
    if (error) return setError('Esta dirección se usó en una solicitud y no se puede borrar. Puedes editarla.');
    router.back();
  }

  return (
    <Screen
      header={<AppBar title={id ? 'Editar dirección' : 'Nueva dirección'} />}
      footer={
        <BottomBar>
          <Button onPress={guardar} loading={guardando}>Guardar dirección</Button>
          {id ? <Button variant="ghost" onPress={eliminar} disabled={guardando}>Eliminar</Button> : null}
        </BottomBar>
      }
    >
      {error ? <Note tone="error">{error}</Note> : null}
      <MapaZona punto={punto ?? PUEBLA} radioKm={0.3} sinCirculo alto={170} onCambio={(p) => { setPunto(p); rellenar(p); }} />
      <View className="-mt-2 flex-row items-center justify-between">
        <Text className="flex-1 font-sans text-xs text-muted-foreground">Toca el mapa o arrastra el pin hasta la puerta.</Text>
        <Button size="sm" variant="ghost" icon={LocateFixed} onPress={usarMiUbicacion}>Usar mi ubicación</Button>
      </View>
      {aviso ? <Note tone="warning">{aviso}</Note> : null}

      <View className="flex-row gap-2">
        {ETIQUETAS.map((e) => <Chip key={e} selected={etiqueta === e} onPress={() => setEtiqueta(e)}>{e}</Chip>)}
      </View>
      <TextField label="Calle" value={calle} onChangeText={setCalle} placeholder="25 Sur" testID="calle" />
      <View className="flex-row gap-3">
        <View className="flex-1"><TextField label="Número exterior" value={exterior} onChangeText={setExterior} placeholder="1302" testID="exterior" /></View>
        <View className="flex-1"><TextField label="Interior (opcional)" value={interior} onChangeText={setInterior} placeholder="Depto. 4" /></View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-[2]"><TextField label="Colonia" value={colonia} onChangeText={setColonia} placeholder="La Paz" testID="colonia" /></View>
        <View className="flex-1"><TextField label="C.P." value={cp} onChangeText={(t) => setCp(t.replace(/\D/g, '').slice(0, 5))} keyboardType="number-pad" placeholder="72160" testID="cp" /></View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1"><TextField label="Municipio" value={municipio} onChangeText={setMunicipio} /></View>
        <View className="flex-1"><TextField label="Estado" value={estado} onChangeText={setEstado} /></View>
      </View>
      <TextField label="Referencias (opcional)" value={referencias} onChangeText={setReferencias} multiline
        placeholder="Portón negro, entre 13 y 15 Poniente…" />
      <Checkbox checked={principal} onChange={setPrincipal}>
        <Text className="font-sans text-sm text-foreground">Usar como mi dirección principal</Text>
      </Checkbox>
      <Note tone="privacy">El prestador solo ve tu calle y número cuando confirmas una cita.</Note>
    </Screen>
  );
}
