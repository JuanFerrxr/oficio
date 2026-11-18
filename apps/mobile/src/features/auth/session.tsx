import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useFlujo, type Pendiente } from './flujo';

// Quién tiene la sesión abierta, si está a mitad de un flujo (ver flujo.ts) y en qué modo usa la app.
// app/_layout.tsx y app/index.tsx lo usan para decidir qué pantallas se pueden ver.
//
// Modo: una misma cuenta puede ser cliente y prestador (Sprint 2). `esPrestador` dice si ya tiene
// perfil de prestador; `modo` es lo que eligió la última vez en este teléfono ("Usar Oficio como
// cliente" en B8, "Ofrecer mis servicios" en A9). Sin elección guardada, un prestador entra a su bandeja.
export type Modo = 'cliente' | 'prestador';

type Estado = {
  session: Session | null;
  cargando: boolean;
  pendiente: Pendiente;
  /** true cuando ya se sabe si la cuenta es prestador (para la sesión actual) */
  rolListo: boolean;
  esPrestador: boolean;
  modo: Modo;
  cambiarModo: (m: Modo) => Promise<void>;
  /** Vuelve a consultar si la cuenta tiene perfil de prestador (después de iniciar el alta) */
  refrescarRol: () => Promise<void>;
};

const Ctx = createContext<Estado>({
  session: null, cargando: true, pendiente: null, rolListo: false, esPrestador: false, modo: 'cliente',
  cambiarModo: async () => {}, refrescarRol: async () => {},
});

const claveModo = (uid: string) => `oficio.modo.${uid}`;

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);
  const [rol, setRol] = useState<{ uid: string; esPrestador: boolean; modo: Modo | null } | null>(null);
  const { pendiente } = useFlujo();
  const uid = session?.user.id ?? null;

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

  const cargarRol = useCallback(async (id: string) => {
    const [{ data }, guardado] = await Promise.all([
      supabase.from('provider_profiles').select('user_id').eq('user_id', id).maybeSingle(),
      AsyncStorage.getItem(claveModo(id)).catch(() => null),
    ]);
    setRol({ uid: id, esPrestador: !!data, modo: guardado === 'cliente' || guardado === 'prestador' ? guardado : null });
  }, []);

  useEffect(() => {
    if (uid) cargarRol(uid);
    else setRol(null);
  }, [uid, cargarRol]);

  const cambiarModo = useCallback(async (m: Modo) => {
    if (!uid) return;
    setRol((r) => (r && r.uid === uid ? { ...r, modo: m } : r));
    await AsyncStorage.setItem(claveModo(uid), m).catch(() => {});
  }, [uid]);

  const refrescarRol = useCallback(async () => { if (uid) await cargarRol(uid); }, [uid, cargarRol]);

  const actual = rol && rol.uid === uid ? rol : null;
  const esPrestador = actual?.esPrestador ?? false;
  const modo: Modo = actual?.modo ?? (esPrestador ? 'prestador' : 'cliente');

  return (
    <Ctx.Provider value={{ session, cargando, pendiente, rolListo: !uid || !!actual, esPrestador, modo, cambiarModo, refrescarRol }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSession = () => useContext(Ctx);
