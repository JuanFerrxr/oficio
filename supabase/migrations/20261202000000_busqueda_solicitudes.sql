-- supabase/migrations/20261202000000_busqueda_solicitudes.sql
-- Sprint 3A · Búsqueda y solicitudes (lado del cliente): A3, A3.0, A4, A5, A6 y A3.1.
--
-- Las tablas ya existen desde v0.2; aquí van las funciones que arman lo que ve el cliente.
-- Todas corren como dueño (security definer) porque necesitan el nombre del prestador, que vive
-- en profiles (cada quien solo puede leer su propio perfil). Por eso cada función devuelve
-- solo datos públicos y solo de prestadores verificados.

------------------------------------------------------------------------------
-- A3 · A3.0 · A4 · Tarjetas de prestadores
------------------------------------------------------------------------------
-- Una sola función para todas las listas:
--   · búsqueda por oficio (A3.0, A4): p_category
--   · "Mejor calificados cerca" (A3): sin oficio, p_orden = 'calificacion'
--   · favoritos (A3): p_ids (sin límite de distancia)
-- Filtros de A4: p_max_km, p_min_rating y p_solo_hoy (trabaja hoy y no lo bloqueó).
create or replace function public.buscar_prestadores(
  p_lat        float8,
  p_lng        float8,
  p_category   smallint default null,
  p_max_km     int      default 10,
  p_min_rating numeric  default 0,
  p_solo_hoy   boolean  default false,
  p_orden      text     default 'distancia',
  p_ids        uuid[]   default null,
  p_limit      int      default 50
)
returns table (
  provider_id     uuid,
  full_name       text,
  avatar_url      text,
  oficio          text,
  years_experience smallint,
  rating_avg      numeric,
  rating_count    int,
  jobs_completed  int,
  distance_km     numeric,
  precio_desde    numeric,
  precio_tipo     price_type,
  precio_servicio text
)
language sql stable security definer set search_path = public, extensions as $$
  with origen as (select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography g),
  hoy as (select (now() at time zone 'America/Mexico_City')::date as d),
  candidatos as (
    select pp.*, p.full_name, p.avatar_url,
           round((st_distance(pp.base_location, o.g) / 1000)::numeric, 1) as km
    from provider_profiles pp
    join profiles p on p.id = pp.user_id and p.deleted_at is null
    cross join origen o
    where pp.verification_status = 'verified'
      and pp.is_available
      and pp.base_location is not null
      and (p_ids is null or pp.user_id = any (p_ids))
      and (p_ids is not null or (
            st_dwithin(pp.base_location, o.g, p_max_km * 1000)
        and st_dwithin(pp.base_location, o.g, pp.service_radius_km * 1000)))
      and pp.rating_avg >= coalesce(p_min_rating, 0)
      and (p_category is null or exists (
            select 1 from provider_services s
            where s.provider_id = pp.user_id and s.is_active and s.category_id = p_category))
      and (not p_solo_hoy or (
            exists (select 1 from provider_availability a cross join hoy
                    where a.provider_id = pp.user_id and a.weekday = extract(dow from hoy.d))
        and not exists (select 1 from provider_unavailability u cross join hoy
                        where u.provider_id = pp.user_id and u.all_day
                          and tstzrange(u.starts_at, u.ends_at) && tstzrange(hoy.d::timestamptz, (hoy.d + 1)::timestamptz))))
  )
  select c.user_id, c.full_name, c.avatar_url,
         -- Oficio que se muestra: el buscado, o el del servicio más barato
         (select cat.name from provider_services s join categories cat on cat.id = s.category_id
          where s.provider_id = c.user_id and s.is_active and (p_category is null or s.category_id = p_category)
          order by (s.price_type = 'quote'), s.price_mxn nulls last limit 1),
         c.years_experience, c.rating_avg, c.rating_count, c.jobs_completed, c.km,
         s.price_mxn, s.price_type, s.title
  from candidatos c
  left join lateral (
    select s.price_mxn, s.price_type, s.title from provider_services s
    where s.provider_id = c.user_id and s.is_active and (p_category is null or s.category_id = p_category)
    order by (s.price_type = 'quote'), s.price_mxn nulls last
    limit 1
  ) s on true
  order by
    case when p_orden = 'calificacion' then c.rating_avg end desc nulls last,
    case when p_orden = 'calificacion' then c.rating_count end desc nulls last,
    c.km asc
  limit greatest(1, least(p_limit, 100));
$$;

revoke all on function public.buscar_prestadores(float8, float8, smallint, int, numeric, boolean, text, uuid[], int) from public, anon;
grant execute on function public.buscar_prestadores(float8, float8, smallint, int, numeric, boolean, text, uuid[], int) to authenticated;

-- A3.0 · "Servicios relacionados": los nombres de servicio más comunes del oficio
create or replace function public.servicios_relacionados(p_category smallint)
returns table (titulo text, prestadores int)
language sql stable security definer set search_path = public as $$
  select s.title, count(distinct s.provider_id)::int
  from provider_services s
  join provider_profiles pp on pp.user_id = s.provider_id and pp.verification_status = 'verified'
  where s.category_id = p_category and s.is_active
  group by s.title
  order by 2 desc, 1
  limit 4;
$$;
revoke all on function public.servicios_relacionados(smallint) from public, anon;
grant execute on function public.servicios_relacionados(smallint) to authenticated;

------------------------------------------------------------------------------
-- A5 · Perfil del prestador (lo que ve un cliente)
------------------------------------------------------------------------------
-- Sin teléfono, sin correo, sin ubicación exacta. Solo si está verificado (o si es uno mismo).
create or replace function public.perfil_prestador(p_provider uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', pp.user_id,
    'full_name', p.full_name,
    'avatar_url', p.avatar_url,
    'headline', pp.headline,
    'years_experience', pp.years_experience,
    'verificado', pp.verification_status = 'verified',
    'rating_avg', pp.rating_avg,
    'rating_count', pp.rating_count,
    'jobs_completed', pp.jobs_completed,
    'avg_response_minutes', pp.avg_response_minutes,
    'service_radius_km', pp.service_radius_km,
    'payment_methods', to_jsonb(pp.payment_methods),
    'es_favorito', exists (select 1 from client_favorites f where f.client_id = auth.uid() and f.provider_id = pp.user_id),
    'oficios', coalesce((
      select jsonb_agg(distinct c.name) from provider_services s join categories c on c.id = s.category_id
      where s.provider_id = pp.user_id and s.is_active), '[]'::jsonb),
    'servicios', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'category_id', s.category_id, 'categoria', c.name, 'title', s.title,
                                          'price_type', s.price_type, 'price_mxn', s.price_mxn)
                       order by c.sort_order, (s.price_type = 'quote'), s.price_mxn nulls last)
      from provider_services s join categories c on c.id = s.category_id
      where s.provider_id = pp.user_id and s.is_active), '[]'::jsonb),
    'certificaciones', coalesce((
      select jsonb_agg(jsonb_build_object('title', cr.title, 'institution', cr.institution, 'year', cr.year) order by cr.year desc nulls last)
      from provider_credentials cr where cr.provider_id = pp.user_id and cr.status = 'verified'), '[]'::jsonb),
    'dias', coalesce((select jsonb_agg(distinct a.weekday) from provider_availability a where a.provider_id = pp.user_id), '[]'::jsonb),
    'resena', (
      select jsonb_build_object('rating', r.rating, 'comment', r.comment, 'created_at', r.created_at,
                                'autor', split_part(coalesce(rp.full_name, ''), ' ', 1))
      from reviews r left join profiles rp on rp.id = r.reviewer_id
      where r.reviewee_id = pp.user_id and r.is_public and coalesce(r.comment, '') <> ''
      order by r.created_at desc limit 1)
  )
  from provider_profiles pp
  join profiles p on p.id = pp.user_id and p.deleted_at is null
  where pp.user_id = p_provider
    and (pp.verification_status = 'verified' or pp.user_id = auth.uid());
$$;
revoke all on function public.perfil_prestador(uuid) from public, anon;
grant execute on function public.perfil_prestador(uuid) to authenticated;

------------------------------------------------------------------------------
-- A3 · A3.1 · Mis solicitudes (cliente)
------------------------------------------------------------------------------
-- Todo lo que necesitan las tarjetas de Solicitudes y "Tu próximo servicio". El teléfono del
-- prestador sigue saliendo solo de client_request_view (con la cita confirmada).
create or replace function public.mis_solicitudes()
returns table (
  id               uuid,
  status           request_status,
  provider_id      uuid,
  provider_name    text,
  provider_avatar  text,
  categoria        text,
  servicio         text,
  description      text,
  urgency          urgency_level,
  preferred_dates  date[],
  time_windows     text[],
  quoted_price_mxn numeric,
  final_price_mxn  numeric,
  scheduled_at     timestamptz,
  viewed_at        timestamptz,
  expires_at       timestamptz,
  created_at       timestamptz,
  updated_at       timestamptz,
  cancelled_by     uuid,
  nota_estado      text,
  direccion        text,
  mi_calificacion  smallint
)
language sql stable security definer set search_path = public as $$
  select r.id, r.status, r.provider_id, p.full_name, p.avatar_url, c.name, s.title, r.description, r.urgency,
         r.preferred_dates, r.time_windows, r.quoted_price_mxn, r.final_price_mxn, r.scheduled_at, r.viewed_at,
         r.expires_at, r.created_at, r.updated_at, r.cancelled_by,
         (select e.note from request_events e where e.request_id = r.id and e.to_status = r.status order by e.id desc limit 1),
         concat_ws(' · ', a.label, concat_ws(' ', a.street, a.ext_number), a.neighborhood),
         (select v.rating from reviews v where v.request_id = r.id and v.reviewer_id = auth.uid())
  from service_requests r
  join profiles p on p.id = r.provider_id
  join categories c on c.id = r.category_id
  left join provider_services s on s.id = r.service_id
  left join addresses a on a.id = r.address_id
  where r.client_id = auth.uid()
  order by r.created_at desc;
$$;
revoke all on function public.mis_solicitudes() from public, anon;
grant execute on function public.mis_solicitudes() to authenticated;

------------------------------------------------------------------------------
-- A6 · Reglas extra de la solicitud
------------------------------------------------------------------------------
-- La solicitud tiene que ir a un prestador verificado, a uno de sus servicios activos, con una
-- forma de pago que él acepte, y no se puede pedir para días que ya pasaron.
create or replace function public.validar_solicitud()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  pp provider_profiles;
begin
  select * into pp from provider_profiles where user_id = new.provider_id;
  if pp.user_id is null or pp.verification_status <> 'verified' then
    raise exception 'Este prestador no está disponible' using errcode = 'P0001';
  end if;
  if new.service_id is not null and not exists (
       select 1 from provider_services s
       where s.id = new.service_id and s.provider_id = new.provider_id and s.is_active and s.category_id = new.category_id) then
    raise exception 'El servicio no pertenece a este prestador' using errcode = 'P0001';
  end if;
  if not (new.preferred_payment_methods <@ pp.payment_methods) then
    raise exception 'El prestador no acepta esa forma de pago' using errcode = 'P0001';
  end if;
  if exists (select 1 from unnest(new.preferred_dates) d where d < (now() at time zone 'America/Mexico_City')::date) then
    raise exception 'Hay días que ya pasaron' using errcode = 'P0001';
  end if;
  if not (new.time_windows <@ array['morning','afternoon','evening','flexible']) then
    raise exception 'Horario no válido' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger service_requests_validar before insert on service_requests
  for each row execute function public.validar_solicitud();

-- Direcciones: solo una puede ser la principal
create or replace function public.una_direccion_principal()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_default then
    update addresses set is_default = false where user_id = new.user_id and id <> new.id and is_default;
  end if;
  return new;
end $$;

create trigger addresses_una_principal after insert or update of is_default on addresses
  for each row when (new.is_default) execute function public.una_direccion_principal();
