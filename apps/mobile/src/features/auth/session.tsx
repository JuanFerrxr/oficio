import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useFlujo, type Pendiente } from './flujo';

// Quién tiene la sesión abierta y si está a mitad de un flujo (ver flujo.ts).
// app/_layout.tsx lo usa para decidir qué grupo de pantallas se puede ver.
type Estado = { session: Session | null; cargando: boolean; pendiente: Pendiente };
const Ctx = createContext<Estado>({ session: null, cargando: true, pendiente: null });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);
  const { pendiente } = useFlujo();

  useEffect(() => {
    // 1. Al abrir: lee la sesión guardada en el teléfono (no necesita internet)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCargando(false);
    });
    // 2. Después: se entera de cada entrada, salida o renovación
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  return <Ctx.Provider value={{ session, cargando, pendiente }}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);
