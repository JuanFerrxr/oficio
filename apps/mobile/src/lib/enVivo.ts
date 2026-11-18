import { useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';

/**
 * Mantiene al día una lista de solicitudes mientras la pantalla está a la vista:
 *  · recarga al entrar a la pantalla y al volver a la app (desde segundo plano)
 *  · tiempo real: Supabase avisa cuando cambia una solicitud tuya (la base solo manda las que
 *    puedes ver por RLS)
 *  · y, por si el tiempo real se cae, recarga cada 30 s
 *
 * `columna` es 'client_id' (A3.1) o 'provider_id' (B4).
 */
export function useSolicitudesEnVivo(columna: 'client_id' | 'provider_id', uid: string | undefined, recargar: () => void) {
  const ultima = useRef(recargar);
  ultima.current = recargar;

  useFocusEffect(useCallback(() => {
    ultima.current();
    const t = setInterval(() => ultima.current(), 30_000);
    const app = AppState.addEventListener('change', (s) => { if (s === 'active') ultima.current(); });
    const canal = uid
      ? supabase
          .channel(`solicitudes-${columna}-${uid}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests', filter: `${columna}=eq.${uid}` }, () => ultima.current())
          .subscribe()
      : null;
    return () => {
      clearInterval(t);
      app.remove();
      if (canal) supabase.removeChannel(canal);
    };
  }, [columna, uid]));
}
