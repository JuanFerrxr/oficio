import { useEffect, useState } from 'react';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { apiConfigurada, llamarApi } from '@/lib/api';

// Sprint 5A · Funciones de IA de la app (búsqueda en lenguaje natural y asistente de solicitud).
// La IA vive en la API; aquí solo se llama y se adapta lo que regresa.

export type EstadoIA = { busqueda: boolean; asistente: 'real' | 'demo' | 'apagado' };
const APAGADA: EstadoIA = { busqueda: false, asistente: 'apagado' };

// Qué está prendido en la API. Se pregunta una vez por sesión de la app.
let cache: Promise<EstadoIA> | null = null;
export function estadoIA(): Promise<EstadoIA> {
  if (!apiConfigurada) return Promise.resolve(APAGADA);
  cache ??= llamarApi<EstadoIA>('/ia/estado', { timeoutMs: 6000 }).then((r) => {
    if (r.data) return r.data;
    cache = null; // si la API estaba apagada, se vuelve a preguntar la próxima vez
    return APAGADA;
  });
  return cache;
}

export function useEstadoIA(): EstadoIA | null {
  const [estado, setEstado] = useState<EstadoIA | null>(null);
  useEffect(() => {
    let vivo = true;
    estadoIA().then((e) => vivo && setEstado(e));
    return () => { vivo = false; };
  }, []);
  return estado;
}

// ---------------------------------------------------------------------------
// A3.0 · Búsqueda
// ---------------------------------------------------------------------------
export type CategoriaEncontrada = {
  id: number;
  slug: string;
  name: string;
  score: number;
  fuente: 'diccionario' | 'significado';
  servicios: string[];
};

/** null si la API no está disponible (la pantalla usa el diccionario directo de Supabase). */
export async function buscarConIA(texto: string): Promise<{ categorias: CategoriaEncontrada[]; significado: boolean } | null> {
  if (!apiConfigurada) return null;
  const r = await llamarApi<{ categorias: CategoriaEncontrada[]; significado: boolean }>('/ia/buscar', { body: { texto }, timeoutMs: 8000 });
  return r.data;
}

// ---------------------------------------------------------------------------
// A6 · Asistente de solicitud
// ---------------------------------------------------------------------------
export type Sugerencia = {
  servicio_id: string | null;
  urgencia: 'urgent' | 'this_week' | 'flexible';
  motivo_urgencia: string | null;
  en_fotos: string | null;
  preguntas: string[];
  aviso_seguridad: string | null;
};

/** Reduce cada foto a 1024 px de ancho en JPEG: menos datos, menos costo y la IA ve lo mismo. */
async function prepararFoto(uri: string) {
  const r = await manipulateAsync(uri, [{ resize: { width: 1024 } }], { compress: 0.6, format: SaveFormat.JPEG, base64: true });
  return { data: r.base64 ?? '', media_type: 'image/jpeg' as const };
}

export async function pedirSugerencias(entrada: {
  prestadorId: string;
  servicioId: string | null;
  descripcion: string;
  fotos: string[]; // uris locales
}): Promise<{ sugerencia: Sugerencia; modo: 'real' | 'demo' } | { error: string }> {
  let fotos: { data: string; media_type: 'image/jpeg' }[] = [];
  try {
    fotos = (await Promise.all(entrada.fotos.slice(0, 5).map(prepararFoto))).filter((f) => f.data.length > 100);
  } catch {
    // Si una foto no se puede leer, se pide sin fotos
    fotos = [];
  }
  const r = await llamarApi<{ sugerencia: Sugerencia; modo: 'real' | 'demo' }>('/ia/asistente-solicitud', {
    body: { prestadorId: entrada.prestadorId, servicioId: entrada.servicioId, descripcion: entrada.descripcion.trim(), fotos },
    timeoutMs: 40_000,
  });
  if (r.data) return r.data;
  return { error: r.status === 400 ? 'Escribe un poco más sobre el problema o agrega una foto.' : r.error };
}
