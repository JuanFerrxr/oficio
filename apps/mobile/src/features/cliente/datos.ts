import type { Database } from '@oficio/shared/types/database';
import type { FormaPago, TipoPrecio } from './formato';

// Formas de los datos que devuelven las funciones de la base (migración 20261202000000).
type Fn = Database['public']['Functions'];
export type TarjetaPrestador = Fn['buscar_prestadores']['Returns'][number];
export type Solicitud = Fn['mis_solicitudes']['Returns'][number];

/** perfil_prestador() devuelve JSON; esta es su forma */
export type PerfilPublico = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  headline: string | null;
  years_experience: number | null;
  verificado: boolean;
  rating_avg: number;
  rating_count: number;
  jobs_completed: number;
  avg_response_minutes: number | null;
  service_radius_km: number;
  payment_methods: FormaPago[];
  es_favorito: boolean;
  oficios: string[];
  servicios: { id: string; category_id: number; categoria: string; title: string; price_type: TipoPrecio; price_mxn: number | null }[];
  certificaciones: { title: string; institution: string | null; year: number | null }[];
  dias: number[];
  resena: { rating: number; comment: string; created_at: string; autor: string } | null;
};

export type Direccion = Pick<Database['public']['Tables']['addresses']['Row'],
  'id' | 'label' | 'street' | 'ext_number' | 'int_number' | 'neighborhood' | 'municipality' | 'state' | 'postal_code' | 'directions' | 'location' | 'is_default'>;

/** "Casa · 25 Sur 1302, La Paz" */
export const textoDireccion = (d: Pick<Direccion, 'label' | 'street' | 'ext_number' | 'neighborhood'>) =>
  [d.label, [[d.street, d.ext_number].filter(Boolean).join(' '), d.neighborhood].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
