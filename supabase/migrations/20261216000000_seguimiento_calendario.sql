-- supabase/migrations/20261216000000_seguimiento_calendario.sql
-- Sprint 4A · Seguimiento y calendario:
--   A7 · A7.1 · A7.2   detalle y seguimiento del cliente, cancelar con motivo
--   B6.1 · B6.2 · B6.3 calendario del prestador (día, semana, mes)
--   B6.4               marcar como no disponible, con repetición

------------------------------------------------------------------------------
-- 1. Bloqueos que se repiten
------------------------------------------------------------------------------
-- La columna rrule (RFC 5545) existe desde v0.2. En el MVP solo se usan dos valores:
-- 'FREQ=DAILY' (cada día) y 'FREQ=WEEKLY' (cada semana, el mismo día). Sin fecha de fin.
alter table provider_unavailability
  add constraint rrule_soportada check (rrule is null or rrule in ('FREQ=DAILY', 'FREQ=WEEKLY')),
  add constraint motivo_corto check (reason is null or length(reason) <= 60);

-- Cada vez que cae un bloqueo entre dos fechas (en hora de México), con los que se repiten ya
-- desplegados. Lo usan el calendario, los días ocupados de A6, el filtro "Hoy" de A4 y B5.
create or replace function public.ocurrencias_bloqueos(p_provider uuid, p_desde date, p_hasta date)
returns table (bloqueo_id uuid, starts_at timestamptz, ends_at timestamptz, all_day boolean, reason text, rrule text)
language sql stable security definer set search_path = public as $$
  with b as (
    select u.*, (u.starts_at at time zone 'America/Mexico_City') as ini_local, (u.ends_at - u.starts_at) as dur
    from provider_unavailability u
    where u.provider_id = p_provider
  )
  -- sin repetición
  select b.id, b.starts_at, b.ends_at, b.all_day, b.reason, b.rrule
  from b
  where b.rrule is null
    and tstzrange(b.starts_at, b.ends_at) && tstzrange((p_desde::timestamp at time zone 'America/Mexico_City'),
                                                        ((p_hasta + 1)::timestamp at time zone 'America/Mexico_City'))
  union all
  -- repetidos: un día por cada fecha del rango desde que empezó (cada día, o el mismo día de la semana)
  select b.id,
         ((d::date + b.ini_local::time) at time zone 'America/Mexico_City'),
         ((d::date + b.ini_local::time) at time zone 'America/Mexico_City') + b.dur,
         b.all_day, b.reason, b.rrule
  from b
  cross join generate_series(greatest(p_desde, b.ini_local::date), p_hasta, interval '1 day') d
  where b.rrule is not null
    and (b.rrule = 'FREQ=DAILY' or extract(dow from d) = extract(dow from b.ini_local));
$$;
revoke all on function public.ocurrencias_bloqueos(uuid, date, date) from public, anon, authenticated;

-- A6 · días ocupados: ahora también con los bloqueos que se repiten (el cliente no ve motivos)
create or replace function public.provider_busy_days(p_provider uuid, p_from date, p_to date)
returns table (day date, all_day boolean)
language sql stable security definer set search_path = public as $$
  select x.day, bool_or(x.all_day) from (
    select d::date as day, o.all_day
    from generate_series(p_from, p_to, interval '1 day') d
    join ocurrencias_bloqueos(p_provider, p_from, p_to) o
      on tstzrange(o.starts_at, o.ends_at) && tstzrange((d::date::timestamp at time zone 'America/Mexico_City'),
                                                        ((d::date + 1)::timestamp at time zone 'America/Mexico_City'))
    union all
    -- días que no trabaja según su horario base
    select d::date, true
    from generate_series(p_from, p_to, interval '1 day') d
    where not exists (select 1 from provider_availability a where a.provider_id = p_provider and a.weekday = extract(dow from d))
      and exists (select 1 from provider_availability a where a.provider_id = p_provider)
  ) x
  group by x.day
  order by 1;
$$;

-- B5 · bloqueos del propio prestador en los próximos días (para no ofrecer esas horas al cotizar)
create or replace function public.mis_bloqueos(p_desde date, p_hasta date)
returns table (bloqueo_id uuid, starts_at timestamptz, ends_at timestamptz, all_day boolean, reason text, rrule text)
language sql stable security definer set search_path = public as $$
  select * from ocurrencias_bloqueos(auth.uid(), p_desde, least(p_hasta, p_desde + 62));
$$;
revoke all on function public.mis_bloqueos(date, date) from public, anon;
grant execute on function public.mis_bloqueos(date, date) to authenticated;

------------------------------------------------------------------------------
-- 2. B6.1 · B6.2 · B6.3 · Calendario del prestador
------------------------------------------------------------------------------
-- Citas (confirmadas, en curso y terminadas), cotizaciones esperando confirmación y bloqueos,
-- entre dos fechas. Las citas duran 1 h en el calendario (todavía no se pide la duración).
create or replace function public.calendario_prestador(p_desde date, p_hasta date)
returns table (
  tipo        text,          -- 'confirmada' | 'por_confirmar' | 'no_disponible'
  id          uuid,          -- solicitud o bloqueo
  starts_at   timestamptz,
  ends_at     timestamptz,
  all_day     boolean,
  titulo      text,
  detalle     text,
  status      request_status,
  rrule       text
)
language sql stable security definer set search_path = public as $$
  select case when r.status = 'accepted' then 'por_confirmar' else 'confirmada' end,
         r.id, r.scheduled_at, r.scheduled_at + interval '1 hour', false,
         coalesce(s.title, c.name),
         concat_ws(' · ',
           concat_ws(' ', split_part(p.full_name, ' ', 1), nullif(left(split_part(p.full_name, ' ', 2), 1) || '.', '.')),
           case when a.neighborhood is not null then 'Col. ' || a.neighborhood end,
           case when r.status = 'accepted' then 'cotizaste $' || to_char(r.quoted_price_mxn, 'FM999,999')
                else '$' || to_char(coalesce(r.final_price_mxn, r.quoted_price_mxn), 'FM999,999') end),
         r.status, null::text
  from service_requests r
  join profiles p on p.id = r.client_id
  join categories c on c.id = r.category_id
  left join provider_services s on s.id = r.service_id
  left join addresses a on a.id = r.address_id
  where r.provider_id = auth.uid()
    and r.status in ('accepted', 'scheduled', 'in_progress', 'completed')
    and r.scheduled_at is not null
    and r.scheduled_at >= (p_desde::timestamp at time zone 'America/Mexico_City')
    and r.scheduled_at <  ((p_hasta + 1)::timestamp at time zone 'America/Mexico_City')
  union all
  select 'no_disponible', o.bloqueo_id, o.starts_at, o.ends_at, o.all_day,
         'No disponible', o.reason, null::request_status, o.rrule
  from ocurrencias_bloqueos(auth.uid(), p_desde, least(p_hasta, p_desde + 62)) o
  order by 3;
$$;
revoke all on function public.calendario_prestador(date, date) from public, anon;
grant execute on function public.calendario_prestador(date, date) to authenticated;

------------------------------------------------------------------------------
-- 3. A4 · filtro "Hoy": también respeta los bloqueos que se repiten
------------------------------------------------------------------------------
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
        and not exists (select 1 from hoy, ocurrencias_bloqueos(pp.user_id, hoy.d, hoy.d) o where o.all_day)))
  )
  select c.user_id, c.full_name, c.avatar_url,
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

------------------------------------------------------------------------------
-- 4. A7 · Detalle y seguimiento (cliente)
------------------------------------------------------------------------------
-- Lo que A7 necesita además de mis_solicitudes(): datos públicos del prestador y su teléfono
-- (solo con la cita confirmada, igual que client_request_view).
create or replace function public.seguimiento_solicitud(p_request_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', r.id,
    'status', r.status,
    'provider_id', r.provider_id,
    'provider_name', p.full_name,
    'provider_avatar', p.avatar_url,
    'oficio', c.name,
    'rating_avg', pp.rating_avg,
    'rating_count', pp.rating_count,
    'avg_response_minutes', pp.avg_response_minutes,
    'servicio', coalesce(s.title, c.name),
    'precio_tipo', s.price_type,
    'precio_mxn', s.price_mxn,
    'description', r.description,
    'urgency', r.urgency,
    'preferred_dates', to_jsonb(r.preferred_dates),
    'time_windows', to_jsonb(r.time_windows),
    'formas_pago', to_jsonb(r.preferred_payment_methods),
    'quoted_price_mxn', r.quoted_price_mxn,
    'final_price_mxn', r.final_price_mxn,
    'scheduled_at', r.scheduled_at,
    'viewed_at', r.viewed_at,
    'expires_at', r.expires_at,
    'created_at', r.created_at,
    'cancelled_by', r.cancelled_by,
    'cancel_reason', r.cancel_reason,
    'cancel_note', r.cancel_note,
    'decline_reason', r.decline_reason,
    'direccion', concat_ws(' · ', a.label, concat_ws(', ', concat_ws(' ', a.street, a.ext_number), a.neighborhood)),
    'telefono', case when r.status in ('scheduled', 'in_progress') then p.phone end,
    'mi_calificacion', (select v.rating from reviews v where v.request_id = r.id and v.reviewer_id = auth.uid()),
    'eventos', coalesce((select jsonb_agg(jsonb_build_object('to_status', e.to_status, 'note', e.note, 'created_at', e.created_at, 'por_mi', e.actor_id = auth.uid()) order by e.id)
                         from request_events e where e.request_id = r.id), '[]'::jsonb)
  )
  from service_requests r
  join profiles p on p.id = r.provider_id
  join provider_profiles pp on pp.user_id = r.provider_id
  join categories c on c.id = r.category_id
  left join provider_services s on s.id = r.service_id
  left join addresses a on a.id = r.address_id
  where r.id = p_request_id and r.client_id = auth.uid();
$$;
revoke all on function public.seguimiento_solicitud(uuid) from public, anon;
grant execute on function public.seguimiento_solicitud(uuid) to authenticated;

-- A7.1 · la nota de la cancelación tiene tope
alter table service_requests add constraint cancel_note_corta check (cancel_note is null or length(cancel_note) <= 500);
