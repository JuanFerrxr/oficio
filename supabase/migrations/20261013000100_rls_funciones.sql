-- supabase/migrations/20261013000100_rls_funciones.sql
-- Reglas de negocio dentro de la base:
--   1. Perfil automático al registrarse
--   2. Transiciones de estado de una solicitud (única puerta para cambiar status)
--   3. Agregados (calificación, trabajos) y límites de archivos
--   4. Seguridad por fila (RLS) en TODAS las tablas
-- Convención: las funciones SECURITY DEFINER fijan search_path para que nadie
-- pueda colarles objetos con el mismo nombre.

------------------------------------------------------------------------------
-- 1. Perfil automático
------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(coalesce(new.phone, ''), ''),
    new.email
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at automático
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger profiles_touch before update on profiles
  for each row execute function touch_updated_at();
create trigger service_requests_touch before update on service_requests
  for each row execute function touch_updated_at();

-- Perfil público (sin teléfono ni correo). Lo que el resto de la app puede ver de otra persona.
create or replace view public_profiles as
  select id, full_name, avatar_url from profiles where deleted_at is null;
grant select on public_profiles to authenticated;

------------------------------------------------------------------------------
-- 2. Transiciones de estado
------------------------------------------------------------------------------
-- Quién puede mover qué:
--   prestador: pending→accepted (con precio y hora), pending→declined, scheduled→in_progress
--   cliente:   accepted→scheduled, in_progress→completed
--   cualquiera de los dos: pending/accepted/scheduled→cancelled (con motivo)
--   sistema (API con service role): pending→expired
create or replace function public.transition_request(
  p_request_id    uuid,
  p_to            request_status,
  p_quoted_price  numeric       default null,
  p_scheduled_at  timestamptz   default null,
  p_cancel_reason cancel_reason_t default null,
  p_note          text          default null
) returns service_requests
language plpgsql security definer set search_path = public as $$
declare
  r      service_requests;
  me     uuid := auth.uid();
  actor  text;
  v_from request_status;
begin
  select * into r from service_requests where id = p_request_id for update;
  if not found then raise exception 'Solicitud no encontrada' using errcode = 'P0002'; end if;
  v_from := r.status;

  if me = r.client_id then actor := 'client';
  elsif me = r.provider_id then actor := 'provider';
  else raise exception 'No participas en esta solicitud' using errcode = '42501';
  end if;

  if not (
       (actor = 'provider' and r.status = 'pending'     and p_to in ('accepted','declined'))
    or (actor = 'client'   and r.status = 'accepted'    and p_to = 'scheduled')
    or (actor = 'provider' and r.status = 'scheduled'   and p_to = 'in_progress')
    or (actor = 'client'   and r.status = 'in_progress' and p_to = 'completed')
    or (r.status in ('pending','accepted','scheduled')  and p_to = 'cancelled')
  ) then
    raise exception 'Transición no permitida: % → % (%)', r.status, p_to, actor using errcode = '22023';
  end if;

  if p_to = 'accepted' then
    if p_quoted_price is null or p_scheduled_at is null then
      raise exception 'Para aceptar hay que indicar precio y hora' using errcode = '22023';
    end if;
    r.quoted_price_mxn := p_quoted_price;
    r.scheduled_at     := p_scheduled_at;
  end if;

  if p_to = 'cancelled' then
    if p_cancel_reason is null then
      raise exception 'Cancelar exige un motivo' using errcode = '22023';
    end if;
    r.cancel_reason := p_cancel_reason;
    r.cancel_note   := p_note;
    r.cancelled_by  := me;
    r.cancelled_at  := now();
  end if;

  update service_requests set
    status           = p_to,
    quoted_price_mxn = r.quoted_price_mxn,
    scheduled_at     = r.scheduled_at,
    cancel_reason    = r.cancel_reason,
    cancel_note      = r.cancel_note,
    cancelled_by     = r.cancelled_by,
    cancelled_at     = r.cancelled_at
  where id = r.id
  returning * into r;

  insert into request_events (request_id, from_status, to_status, actor_id, note)
  values (r.id, v_from, p_to, me, p_note);
  return r;
end $$;

-- El prestador abre la solicitud → el cliente ve "Vista"
create or replace function public.mark_request_viewed(p_request_id uuid)
returns void language sql security definer set search_path = public as $$
  update service_requests set viewed_at = coalesce(viewed_at, now())
  where id = p_request_id and provider_id = auth.uid() and status = 'pending';
$$;

-- Expiración: la llama la API con service role (o pg_cron cada 5 min)
create or replace function public.expire_requests()
returns setof service_requests
language plpgsql security definer set search_path = public as $$
begin
  return query
  with ex as (
    update service_requests set status = 'expired'
    where status = 'pending' and expires_at < now()
    returning *
  ), ev as (
    insert into request_events (request_id, from_status, to_status, note)
    select id, 'pending', 'expired', '2 h sin respuesta' from ex
  )
  select * from ex;
end $$;
revoke execute on function public.expire_requests() from public, anon, authenticated;
grant execute on function public.expire_requests() to service_role;

-- Marcar mensajes como leídos (solo los que recibí)
create or replace function public.mark_messages_read(p_request_id uuid)
returns void language sql security definer set search_path = public as $$
  update messages m set read_at = now()
  from service_requests r
  where m.request_id = p_request_id and r.id = m.request_id
    and auth.uid() in (r.client_id, r.provider_id)
    and m.sender_id <> auth.uid() and m.read_at is null;
$$;

-- A6: días que el prestador no puede (para pintarlos en gris), sin exponer motivos
create or replace function public.provider_busy_days(p_provider uuid, p_from date, p_to date)
returns table (day date, all_day boolean)
language sql stable security definer set search_path = public as $$
  select d::date, bool_or(u.all_day)
  from generate_series(p_from, p_to, interval '1 day') d
  join provider_unavailability u
    on u.provider_id = p_provider
   and tstzrange(u.starts_at, u.ends_at) && tstzrange(d, d + interval '1 day')
  group by d::date
  union
  select d::date, true
  from generate_series(p_from, p_to, interval '1 day') d
  where not exists (select 1 from provider_availability a
                    where a.provider_id = p_provider and a.weekday = extract(dow from d))
    and exists (select 1 from provider_availability a where a.provider_id = p_provider)
  order by 1;
$$;

-- A3.0 · "pastilla de la luz" → Electricidad. Coincidencia exacta del término dentro del
-- texto, o parecido difuso (pg_trgm) para errores de dedo como "pastiya".
create or replace function public.match_categories(p_text text)
returns table (category_id smallint, slug text, name text, score real)
language sql stable set search_path = public, extensions as $$
  with q as (select lower(unaccent(p_text)) as t),
  hits as (
    select c.id, c.slug, c.name,
           greatest(case when q.t like '%' || k.term || '%' then 1.0 else 0 end,
                    word_similarity(k.term, q.t)) as s
    from category_keywords k
    join categories c on c.id = k.category_id and c.is_active
    cross join q
  )
  select id, slug, name, max(s)::real from hits
  group by id, slug, name
  having max(s) >= 0.7
  order by 4 desc
  limit 3;
$$;

-- Vista equivalente a provider_request_view, del lado del cliente:
-- el teléfono del prestador solo aparece con la cita confirmada.
create or replace view client_request_view as
select r.id, r.status, r.provider_id, p.full_name as provider_name,
       r.quoted_price_mxn, r.scheduled_at, r.viewed_at,
       case when r.status in ('scheduled','in_progress','completed') then p.phone end as provider_phone
from service_requests r
join profiles p on p.id = r.provider_id
where r.client_id = auth.uid();
grant select on client_request_view, provider_request_view to authenticated;

-- search_providers lee profiles; con RLS restringido debe correr como dueño
alter function public.search_providers(smallint, float8, float8, int) security definer set search_path = public, extensions;

------------------------------------------------------------------------------
-- 3. Agregados y límites
------------------------------------------------------------------------------
create or replace function public.refresh_provider_rating()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update provider_profiles pp set
    rating_avg   = coalesce((select round(avg(rating)::numeric, 1) from reviews where reviewee_id = pp.user_id and is_public), 0),
    rating_count = (select count(*) from reviews where reviewee_id = pp.user_id and is_public)
  where pp.user_id = new.reviewee_id;
  return new;
end $$;
create trigger reviews_refresh_rating after insert or update on reviews
  for each row execute function refresh_provider_rating();

create or replace function public.count_completed_job()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    update provider_profiles set jobs_completed = jobs_completed + 1 where user_id = new.provider_id;
  end if;
  return new;
end $$;
create trigger service_requests_count_job after update of status on service_requests
  for each row execute function count_completed_job();

create or replace function public.limit_request_media()
returns trigger language plpgsql as $$
begin
  if new.kind = 'image' and (select count(*) from request_media where request_id = new.request_id and kind = 'image') >= 5 then
    raise exception 'Máximo 5 fotos por solicitud' using errcode = '23514';
  end if;
  if new.kind = 'video' and exists (select 1 from request_media where request_id = new.request_id and kind = 'video') then
    raise exception 'Máximo 1 video por solicitud' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger request_media_limit before insert on request_media
  for each row execute function limit_request_media();

------------------------------------------------------------------------------
-- 4. RLS en todas las tablas
------------------------------------------------------------------------------
alter table profiles                enable row level security;
alter table addresses               enable row level security;
alter table categories              enable row level security;
alter table category_keywords       enable row level security;
alter table provider_profiles       enable row level security;
alter table provider_services       enable row level security;
alter table provider_availability   enable row level security;
alter table provider_unavailability enable row level security;
alter table provider_media          enable row level security;
alter table provider_credentials    enable row level security;
alter table verification_documents  enable row level security;
alter table request_media           enable row level security;
alter table request_events          enable row level security;
alter table messages                enable row level security;
alter table review_media            enable row level security;
alter table client_favorites        enable row level security;
alter table push_tokens             enable row level security;
alter table reports                 enable row level security;
-- service_requests y reviews ya tienen RLS desde la migración inicial

-- Perfil: cada quien ve y edita el suyo (los demás usan public_profiles)
create policy "perfil propio: ver"    on profiles for select using (id = auth.uid());
create policy "perfil propio: editar" on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Direcciones: solo el dueño
create policy "direcciones propias" on addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Catálogos públicos
create policy "categorías visibles" on categories        for select using (is_active);
create policy "términos visibles"   on category_keywords for select using (true);

-- Prestador: público para buscar; cada quien edita el suyo, sin tocar campos que calcula el sistema
create policy "prestadores visibles"      on provider_profiles for select using (true);
create policy "alta como prestador"        on provider_profiles for insert with check (user_id = auth.uid() and verification_status = 'unverified');
create policy "editar mi perfil prestador" on provider_profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "servicios visibles"  on provider_services     for select using (true);
create policy "mis servicios"       on provider_services     for all    using (provider_id = auth.uid()) with check (provider_id = auth.uid());
create policy "horarios visibles"   on provider_availability for select using (true);
create policy "mi horario"          on provider_availability for all    using (provider_id = auth.uid()) with check (provider_id = auth.uid());
create policy "portafolio visible"  on provider_media        for select using (true);
create policy "mi portafolio"       on provider_media        for all    using (provider_id = auth.uid()) with check (provider_id = auth.uid());

-- Bloqueos: solo el prestador (el cliente usa provider_busy_days, sin ver motivos)
create policy "mis bloqueos" on provider_unavailability for all using (provider_id = auth.uid()) with check (provider_id = auth.uid());

-- Certificaciones: públicas si están verificadas; el dueño ve y sube las suyas
create policy "certificaciones verificadas visibles" on provider_credentials for select using (status = 'verified' or provider_id = auth.uid());
create policy "subir mis certificaciones" on provider_credentials for insert with check (provider_id = auth.uid() and status = 'pending');

-- Documentos de identidad: el dueño sube y ve; nadie más (revisión con service role)
create policy "ver mis documentos"   on verification_documents for select using (provider_id = auth.uid());
create policy "subir mis documentos" on verification_documents for insert with check (provider_id = auth.uid() and status = 'pending');

-- Archivos de la solicitud: participantes ven; el cliente sube mientras está pendiente
create policy "participantes ven archivos" on request_media for select using (
  exists (select 1 from service_requests r where r.id = request_id and auth.uid() in (r.client_id, r.provider_id)));
create policy "cliente sube archivos" on request_media for insert with check (
  exists (select 1 from service_requests r where r.id = request_id and r.client_id = auth.uid() and r.status = 'pending'));

-- Historial de estados: solo participantes (se escribe por transition_request)
create policy "participantes ven historial" on request_events for select using (
  exists (select 1 from service_requests r where r.id = request_id and auth.uid() in (r.client_id, r.provider_id)));

-- Mensajes: leer si participas (la política de escribir viene de la migración v0.2)
create policy "participantes leen su chat" on messages for select using (
  exists (select 1 from service_requests r where r.id = request_id and auth.uid() in (r.client_id, r.provider_id)));

-- Fotos de reseñas: públicas si la reseña lo es; las sube quien escribió la reseña
create policy "fotos de reseñas visibles" on review_media for select using (
  exists (select 1 from reviews v where v.id = review_id and (v.is_public or v.reviewer_id = auth.uid())));
create policy "subir fotos a mi reseña" on review_media for insert with check (
  exists (select 1 from reviews v where v.id = review_id and v.reviewer_id = auth.uid()));

-- Favoritos, tokens de push y reportes: del propio usuario
create policy "mis favoritos"  on client_favorites for all using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy "mis dispositivos" on push_tokens    for all using (user_id = auth.uid())   with check (user_id = auth.uid());
create policy "reportar"       on reports for insert with check (reporter_id = auth.uid());
create policy "mis reportes"   on reports for select using (reporter_id = auth.uid());

-- Reseñas: el autor puede ver las suyas aunque no sean públicas
create policy "mis reseñas" on reviews for select using (reviewer_id = auth.uid() or reviewee_id = auth.uid());

-- Columnas que el usuario puede escribir. RLS decide QUÉ FILAS; estos permisos deciden
-- QUÉ COLUMNAS. Sin esto, alguien podría ponerse is_admin = true o rating_avg = 5.
revoke insert, update on profiles, provider_profiles, service_requests, messages from authenticated;
grant update (full_name, avatar_url) on profiles to authenticated;
grant insert (user_id, headline, bio, years_experience, base_location, service_radius_km,
              is_available, payment_methods) on provider_profiles to authenticated;
grant update (headline, bio, years_experience, base_location, service_radius_km,
              is_available, payment_methods) on provider_profiles to authenticated;
grant insert (client_id, provider_id, service_id, category_id, address_id, description,
              urgency, preferred_dates, time_windows, preferred_payment_methods)
  on service_requests to authenticated;
grant insert (request_id, sender_id, type, body, media_url, duration_s, lat, lng)
  on messages to authenticated;

-- La dirección de la solicitud tiene que ser del cliente
drop policy "cliente crea solicitudes propias" on service_requests;
create policy "cliente crea solicitudes propias" on service_requests
  for insert with check (
    auth.uid() = client_id and status = 'pending'
    and exists (select 1 from addresses a where a.id = address_id and a.user_id = auth.uid()));

-- Tiempo real: el chat y los cambios de estado llegan sin recargar
alter publication supabase_realtime add table messages, service_requests;
