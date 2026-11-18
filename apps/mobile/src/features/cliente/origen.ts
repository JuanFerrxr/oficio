import { useEffect, useSyncExternalStore } from 'react';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { PUEBLA, puntoDesdeBase, type Punto } from '@/features/prestador/ubicacion';

// Desde dónde busca el cliente (A3 "Col. La Paz, Puebla"): su dirección principal, otra
// dirección guardada o la ubicación del teléfono. Vive en memoria durante la sesión.
export type Origen = Punto & { etiqueta: string; direccionId: string | null; fuente: 'direccion' | 'gps' | 'puebla' };

let origen: Origen | null = null;
let cargando = false;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((o) => o());

export function fijarOrigen(o: Origen) {
  origen = o;
  avisar();
}
export const olvidarOrigen = () => { origen = null; avisar(); };

/** "Col. La Paz, Puebla" a partir de una dirección guardada */
export const etiquetaDireccion = (d: { neighborhood: string | null; municipality: string; label: string | null; street: string }) =>
  d.neighborhood ? `Col. ${d.neighborhood}, ${d.municipality}` : `${d.label ?? d.street}, ${d.municipality}`;

/** Ubicación actual del teléfono, con colonia si el iPhone la sabe (geocodificación inversa). */
export async function origenDesdeGps(): Promise<Origen | 'sin-permiso' | null> {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  if (!granted) return 'sin-permiso';
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const punto = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    let etiqueta = 'Tu ubicación';
    try {
      const [d] = await Location.reverseGeocodeAsync({ latitude: punto.lat, longitude: punto.lng });
      if (d) etiqueta = [d.district ? `Col. ${d.district}` : d.street, d.city ?? d.subregion].filter(Boolean).join(', ') || etiqueta;
    } catch { /* sin nombre de colonia: se queda "Tu ubicación" */ }
    return { ...punto, etiqueta, direccionId: null, fuente: 'gps' };
  } catch {
    return null;
  }
}

async function cargarInicial() {
  if (origen || cargando) return;
  cargando = true;
  try {
    const { data } = await supabase.from('addresses').select('id, label, street, neighborhood, municipality, location, is_default')
      .order('is_default', { ascending: false }).order('created_at').limit(1);
    const d = data?.[0];
    const punto = d ? puntoDesdeBase(d.location) : null;
    if (d && punto) return fijarOrigen({ ...punto, etiqueta: etiquetaDireccion(d), direccionId: d.id, fuente: 'direccion' });
    const gps = await origenDesdeGps();
    if (gps && gps !== 'sin-permiso') return fijarOrigen(gps);
    fijarOrigen({ ...PUEBLA, etiqueta: 'Puebla', direccionId: null, fuente: 'puebla' });
  } finally {
    cargando = false;
  }
}

export function useOrigen(): Origen | null {
  const o = useSyncExternalStore((f) => { oyentes.add(f); return () => oyentes.delete(f); }, () => origen);
  useEffect(() => { cargarInicial(); }, []);
  return o;
}
