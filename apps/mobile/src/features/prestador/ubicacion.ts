// Ubicación del prestador (B2). La base guarda un punto geográfico (PostGIS); al leerlo, Supabase
// lo devuelve en formato EWKB hexadecimal ("0101000020E6100000…") y al escribirlo acepta EWKT.

export type Punto = { lat: number; lng: number };

/** Centro de Puebla: punto de partida si no hay ubicación guardada ni permiso de GPS. */
export const PUEBLA: Punto = { lat: 19.0414, lng: -98.2063 };

export function puntoDesdeBase(valor: unknown): Punto | null {
  if (!valor) return null;
  if (typeof valor === 'object' && valor !== null && 'coordinates' in valor) {
    const [lng, lat] = (valor as { coordinates: number[] }).coordinates;
    return { lat, lng };
  }
  if (typeof valor !== 'string' || !/^[0-9a-f]+$/i.test(valor)) return null;
  const bytes = new Uint8Array(valor.match(/../g)!.map((h) => parseInt(h, 16)));
  const dv = new DataView(bytes.buffer);
  const le = dv.getUint8(0) === 1;
  const tipo = dv.getUint32(1, le);
  const offset = 5 + (tipo & 0x20000000 ? 4 : 0); // con SRID vienen 4 bytes más
  return { lng: dv.getFloat64(offset, le), lat: dv.getFloat64(offset + 8, le) };
}

/** Para guardar: "SRID=4326;POINT(lng lat)" (primero longitud). */
export const puntoParaBase = (p: Punto) => `SRID=4326;POINT(${p.lng.toFixed(6)} ${p.lat.toFixed(6)})`;
