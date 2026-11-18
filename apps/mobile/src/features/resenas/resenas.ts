import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { Database } from '@oficio/shared/types/database';
import { supabase } from '@/lib/supabase';

// A5.1 · B7 · A8 · Reseñas. La base guarda las etiquetas como clave; aquí va su texto.
export const ETIQUETAS = [
  { value: 'puntual', label: 'Puntual' },
  { value: 'explico_bien', label: 'Explicó bien' },
  { value: 'buen_precio', label: 'Buen precio' },
  { value: 'dejo_limpio', label: 'Dejó limpio' },
  { value: 'amable', label: 'Amable' },
] as const;
export const etiqueta = (v: string) => ETIQUETAS.find((e) => e.value === v)?.label ?? v;

export type Resena = Database['public']['Functions']['resenas_prestador']['Returns'][number];
export type Resumen = {
  rating_avg: number;
  rating_count: number;
  por_estrella: Record<string, number>;
  etiquetas: Record<string, number>;
  fotos: number;
};

/** Las fotos de reseñas son públicas (bucket review-media) */
export const urlFoto = (ruta: string) => supabase.storage.from('review-media').getPublicUrl(ruta).data.publicUrl;

export function useResenas(prestador: string | undefined) {
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [resumen, setResumen] = useState<Resumen | null | undefined>(undefined);
  const [error, setError] = useState(false);

  const recargar = useCallback(async () => {
    if (!prestador) return;
    const [l, r] = await Promise.all([
      supabase.rpc('resenas_prestador', { p_provider: prestador, p_limit: 200 }),
      supabase.rpc('resumen_resenas', { p_provider: prestador }),
    ]);
    setError(!!(l.error || r.error));
    setResenas(l.data ?? []);
    setResumen((r.data as Resumen | null) ?? null);
  }, [prestador]);

  useFocusEffect(useCallback(() => { recargar(); }, [recargar]));
  return { resenas, resumen, error, recargar };
}

export type Filtro = 'todas' | 'fotos' | 'bajas' | (typeof ETIQUETAS)[number]['value'];
export function filtrar(xs: Resena[], f: Filtro) {
  if (f === 'todas') return xs;
  if (f === 'fotos') return xs.filter((r) => r.fotos?.length);
  if (f === 'bajas') return xs.filter((r) => r.rating <= 4);
  return xs.filter((r) => r.tags?.includes(f));
}
