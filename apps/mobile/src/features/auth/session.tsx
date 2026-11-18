import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// Quién tiene la sesión abierta. El Sprint 1 lo usará para decidir qué grupo de pantallas
// ve cada persona (bienvenida, cliente o prestador).
type Estado = { session: Session | null; cargando: boolean };
const Ctx = createContext<Estado>({ session: null, cargando: true });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);

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

  return <Ctx.Provider value={{ session, cargando }}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);
