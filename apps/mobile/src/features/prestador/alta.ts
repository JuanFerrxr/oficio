import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { Database } from '@oficio/shared/types/database';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/features/auth/session';

// Todo lo del alta del prestador en un solo lugar: qué tiene guardado y qué le falta.
// Lo usan B1–B3 (para precargar), la bandeja (tarjeta "Termina tu alta") y B8 (resumen).
type Tablas = Database['public']['Tables'];
export type PerfilPrestador = Tablas['provider_profiles']['Row'];
export type Servicio = Tablas['provider_services']['Row'];
export type Horario = Tablas['provider_availability']['Row'];
export type Documento = Tablas['verification_documents']['Row'];
export type Credencial = Tablas['provider_credentials']['Row'];
export type Categoria = Pick<Tablas['categories']['Row'], 'id' | 'slug' | 'name' | 'requires_background_check'>;

export type DatosAlta = {
  perfil: PerfilPrestador | null;
  servicios: Servicio[];
  horario: Horario[];
  documentos: Documento[];
  credenciales: Credencial[];
  categorias: Categoria[];
  /** Lo que devuelve mis_faltantes_alta(): 'servicios', 'zona', 'horario', 'ine_front'… */
  faltantes: string[];
};

const VACIO: DatosAlta = { perfil: null, servicios: [], horario: [], documentos: [], credenciales: [], categorias: [], faltantes: [] };

export async function cargarAlta(uid: string): Promise<DatosAlta> {
  const [perfil, servicios, horario, documentos, credenciales, categorias, faltantes] = await Promise.all([
    supabase.from('provider_profiles').select('*').eq('user_id', uid).maybeSingle(),
    supabase.from('provider_services').select('*').eq('provider_id', uid).eq('is_active', true).order('title'),
    supabase.from('provider_availability').select('*').eq('provider_id', uid),
    supabase.from('verification_documents').select('*').eq('provider_id', uid).order('created_at', { ascending: false }),
    supabase.from('provider_credentials').select('*').eq('provider_id', uid).order('created_at'),
    supabase.from('categories').select('id, slug, name, requires_background_check').order('sort_order'),
    supabase.rpc('mis_faltantes_alta'),
  ]);
  const error = perfil.error ?? servicios.error ?? horario.error ?? documentos.error ?? credenciales.error ?? categorias.error ?? faltantes.error;
  if (error) throw error;
  return {
    perfil: perfil.data,
    servicios: servicios.data ?? [],
    horario: horario.data ?? [],
    documentos: documentos.data ?? [],
    credenciales: credenciales.data ?? [],
    categorias: categorias.data ?? [],
    faltantes: faltantes.data ?? [],
  };
}

/** Carga los datos cada vez que la pantalla se vuelve a mostrar (p. ej., al regresar de subir un documento). */
export function useAlta() {
  const { session } = useSession();
  const uid = session?.user.id;
  const [datos, setDatos] = useState<DatosAlta>(VACIO);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const recargar = useCallback(async () => {
    if (!uid) return;
    try {
      setDatos(await cargarAlta(uid));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  }, [uid]);

  useFocusEffect(useCallback(() => { recargar(); }, [recargar]));

  return { ...datos, uid, cargando, error, recargar };
}

// Los pasos que ve el prestador (B0.1 → B3) y a qué pantalla lleva cada uno
export const PASOS = [
  { clave: 'datos', titulo: 'Tus datos', ruta: '/alta/datos', faltan: ['perfil', 'terminos'] },
  { clave: 'servicios', titulo: 'Servicios y precios', ruta: '/alta/servicios', faltan: ['servicios'] },
  { clave: 'zona', titulo: 'Zona, horario y pagos', ruta: '/alta/zona', faltan: ['zona', 'horario'] },
  { clave: 'verificacion', titulo: 'Verificación de identidad', ruta: '/alta/verificacion', faltan: ['ine_front', 'ine_back', 'selfie', 'proof_of_address', 'criminal_record'] },
] as const;

export type RutaAlta = (typeof PASOS)[number]['ruta'];

export const pasoCompleto = (paso: (typeof PASOS)[number], faltantes: string[]) => !paso.faltan.some((f) => faltantes.includes(f));

/** Primer paso con algo pendiente; si no falta nada, la verificación (para enviarla a revisión). */
export function siguientePaso(faltantes: string[]): RutaAlta {
  return (PASOS.find((p) => !pasoCompleto(p, faltantes)) ?? PASOS[3]).ruta;
}

export const ESTADO_VERIFICACION = {
  unverified: { texto: 'Sin enviar', tono: 'warning' },
  pending: { texto: 'En revisión', tono: 'warning' },
  verified: { texto: 'Aprobada', tono: 'success' },
  rejected: { texto: 'Necesita cambios', tono: 'danger' },
} as const;
