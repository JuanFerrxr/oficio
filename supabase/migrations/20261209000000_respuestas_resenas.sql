-- supabase/migrations/20261209000000_respuestas_resenas.sql
-- Sprint 3B · El prestador responde y el cliente califica:
--   B4 · B4.1 · B4.2  bandeja del prestador (nuevas, activas, historial)
--   B5                aceptar y cotizar (precio, hora y mensaje)
--   B4                rechazar con motivo
--   A3.1              el cliente confirma, dice "no me conviene" o marca "ya terminó"
--   A5.1 · B7         reseñas de un prestador
--   A8                calificar un servicio terminado
--
-- Las transiciones siguen pasando por transition_request (la base decide quién puede mover
-- qué). Las funciones nuevas solo agregan lo que cada pantalla necesita alrededor.

------------------------------------------------------------------------------
-- 1. Motivo de rechazo
------------------------------------------------------------------------------
alter table service_requests add column decline_reason text
  check (decline_reason in ('sin_disponibilidad', 'fuera_de_zona', 'no_lo_hago', 'otro'));

comment on column service_requests.decline_reason is
  'B4 · por qué el prestador rechazó: sin_disponibilidad, fuera_de_zona, no_lo_hago u otro';

------------------------------------------------------------------------------
-- 2. Tiempo de respuesta real
------------------------------------------------------------------------------
-- Promedio en minutos de las últimas 50 respuestas (aceptar o rechazar). Se recalcula cada
-- vez que el prestador responde, así "responde en ~15 min" de A5 deja de ser un dato fijo.
create or replace function public.actualizar_tiempo_respuesta(p_provider uuid)
returns void language sql security definer set search_path = public as $$
  update provider_profiles pp set avg_response_minutes = coalesce((
    select greatest(1, round(avg(t.minutos)))::int from (
      select extract(epoch from (e.created_at - r.created_at)) / 60 as minutos
      from request_events e join service_requests r on r.id = e.request_id
      where r.provider_id = p_provider and e.from_status = 'pending' and e.to_status in ('accepted', 'declined')
      order by e.created_at desc limit 50) t), pp.avg_response_minutes)
  where pp.user_id = p_provider;
$$;
revoke all on function public.actualizar_tiempo_respuesta(uuid) from public, anon, authenticated;

------------------------------------------------------------------------------
-- 3. B5 · Aceptar y cotizar
------------------------------------------------------------------------------
-- Precio, hora de llegada y un mensaje opcional. El mensaje queda como la primera línea del
-- chat (Sprint 4) y como nota del estado, que es lo que el cliente ve en su tarjeta.
create or replace function public.cotizar_solicitud(
  p_request_id uuid,
  p_precio     numeric,
  p_hora       timestamptz,
  p_mensaje    text default null
) returns service_requests
language plpgsql security definer set search_path = public as $$
declare
  r service_requests;
  v_msg text := nullif(btrim(coalesce(p_mensaje, '')), '');
begin
  if p_precio is null or p_precio <= 0 or p_precio > 100000 then
    raise exception 'Escribe un precio entre $1 y $100,000' using errcode = '22023';
  end if;
  if p_hora is null or p_hora < now() then
    raise exception 'Elige una hora que todavía no haya pasado' using errcode = '22023';
  end if;
  if p_hora > now() + interval '30 days' then
    raise exception 'La cita no puede ser en más de 30 días' using errcode = '22023';
  end if;
  if length(coalesce(v_msg, '')) > 500 then
    raise exception 'El mensaje puede tener hasta 500 caracteres' using errcode = '22023';
  end if;
  select * into r from service_requests where id = p_request_id;
  if found and r.status = 'pending' and r.expires_at < now() then
    raise exception 'Esta solicitud ya expiró' using errcode = '22023';
  end if;

  r := transition_request(p_request_id, 'accepted', p_precio, p_hora, null, v_msg);
  if v_msg is not null then
    insert into messages (request_id, sender_id, body) values (r.id, auth.uid(), v_msg);
  end if;
  perform actualizar_tiempo_respuesta(r.provider_id);
  return r;
end $$;
revoke all on function public.cotizar_solicitud(uuid, numeric, timestamptz, text) from public, anon;
grant execute on function public.cotizar_solicitud(uuid, numeric, timestamptz, text) to authenticated;

------------------------------------------------------------------------------
-- 4. B4 · Rechazar con motivo
------------------------------------------------------------------------------
create or replace function public.rechazar_solicitud(
  p_request_id uuid,
  p_motivo     text,
  p_nota       text default null
) returns service_requests
language plpgsql security definer set search_path = public as $$
declare
  r service_requests;
  v_nota text := nullif(btrim(coalesce(p_nota, '')), '');
begin
  if p_motivo is null or p_motivo not in ('sin_disponibilidad', 'fuera_de_zona', 'no_lo_hago', 'otro') then
    raise exception 'Elige un motivo' using errcode = '22023';
  end if;
  if length(coalesce(v_nota, '')) > 300 then
    raise exception 'La nota puede tener hasta 300 caracteres' using errcode = '22023';
  end if;
  r := transition_request(p_request_id, 'declined', null, null, null, v_nota);
  update service_requests set decline_reason = p_motivo where id = r.id returning * into r;
  perform actualizar_tiempo_respuesta(r.provider_id);
  return r;
end $$;
revoke all on function public.rechazar_solicitud(uuid, text, text) from public, anon;
grant execute on function public.rechazar_solicitud(uuid, text, text) to authenticated;

------------------------------------------------------------------------------
-- 5. B4 · B4.1 · B4.2 · Bandeja del prestador
------------------------------------------------------------------------------
-- Todas sus solicitudes, con lo que cada tarjeta necesita. Igual que provider_request_view:
-- la calle y el teléfono del cliente solo aparecen con la cita confirmada.
create or replace function public.bandeja_prestador()
returns table (
  id                 uuid,
  status             request_status,
  client_id          uuid,
  cliente            text,
  cliente_avatar     text,
  cliente_calificacion numeric,
  categoria          text,
  servicio           text,
  precio_perfil      numeric,
  precio_tipo        price_type,
  description        text,
  urgency            urgency_level,
  preferred_dates    date[],
  time_windows       text[],
  formas_pago        payment_method[],
  colonia            text,
  distancia_km       numeric,
  direccion          text,
  telefono           text,
  quoted_price_mxn   numeric,
  final_price_mxn    numeric,
  scheduled_at       timestamptz,
  viewed_at          timestamptz,
  expires_at         timestamptz,
  created_at         timestamptz,
  updated_at         timestamptz,
  respondida_at      timestamptz,
  decline_reason     text,
  cancelled_by       uuid,
  nota_estado        text,
  calificacion       smallint,
  fotos              text[],
  video              text
)
language sql stable security definer set search_path = public, extensions as $$
  select r.id, r.status, r.client_id,
         -- "Mariana G."
         concat_ws(' ', split_part(p.full_name, ' ', 1),
                   nullif(left(split_part(p.full_name, ' ', 2), 1) || '.', '.')),
         p.avatar_url,
         (select round(avg(v.rating), 1) from reviews v where v.reviewee_id = r.client_id),
         c.name, s.title, s.price_mxn, s.price_type, r.description, r.urgency,
         r.preferred_dates, r.time_windows, r.preferred_payment_methods,
         a.neighborhood,
         case when a.location is not null and pp.base_location is not null
              then round((st_distance(a.location, pp.base_location) / 1000)::numeric, 1) end,
         case when r.status in ('scheduled', 'in_progress', 'completed')
              then concat_ws(', ', concat_ws(' ', a.street, a.ext_number, nullif('int. ' || a.int_number, 'int. ')), a.neighborhood) end,
         case when r.status in ('scheduled', 'in_progress') then p.phone end,
         r.quoted_price_mxn, r.final_price_mxn, r.scheduled_at, r.viewed_at, r.expires_at,
         r.created_at, r.updated_at,
         (select min(e.created_at) from request_events e where e.request_id = r.id and e.from_status = 'pending'),
         r.decline_reason, r.cancelled_by,
         (select e.note from request_events e where e.request_id = r.id and e.to_status = r.status order by e.id desc limit 1),
         (select v.rating from reviews v where v.request_id = r.id and v.reviewee_id = r.provider_id),
         coalesce((select array_agg(m.storage_path order by m.sort_order) from request_media m
                   where m.request_id = r.id and m.kind = 'image'), '{}'),
         (select m.storage_path from request_media m where m.request_id = r.id and m.kind = 'video' limit 1)
  from service_requests r
  join profiles p on p.id = r.client_id
  join categories c on c.id = r.category_id
  join provider_profiles pp on pp.user_id = r.provider_id
  left join provider_services s on s.id = r.service_id
  left join addresses a on a.id = r.address_id
  where r.provider_id = auth.uid()
  order by r.created_at desc;
$$;
revoke all on function public.bandeja_prestador() from public, anon;
grant execute on function public.bandeja_prestador() to authenticated;

------------------------------------------------------------------------------
-- 6. A3.1 · Mis solicitudes (cliente): agrega el motivo de rechazo
------------------------------------------------------------------------------
drop function public.mis_solicitudes();
create function public.mis_solicitudes()
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
  mi_calificacion  smallint,
  decline_reason   text
)
language sql stable security definer set search_path = public as $$
  select r.id, r.status, r.provider_id, p.full_name, p.avatar_url, c.name, s.title, r.description, r.urgency,
         r.preferred_dates, r.time_windows, r.quoted_price_mxn, r.final_price_mxn, r.scheduled_at, r.viewed_at,
         r.expires_at, r.created_at, r.updated_at, r.cancelled_by,
         (select e.note from request_events e where e.request_id = r.id and e.to_status = r.status order by e.id desc limit 1),
         concat_ws(' · ', a.label, concat_ws(' ', a.street, a.ext_number), a.neighborhood),
         (select v.rating from reviews v where v.request_id = r.id and v.reviewer_id = auth.uid()),
         r.decline_reason
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
-- 7. A5.1 · B7 · Reseñas de un prestador
------------------------------------------------------------------------------
-- Etiquetas de A8. Se guardan como clave; la app pone el texto.
create or replace function public.etiquetas_resena()
returns text[] language sql immutable as $$
  select array['puntual', 'explico_bien', 'buen_precio', 'dejo_limpio', 'amable'];
$$;

-- Solo reseñas públicas de un prestador verificado (o las tuyas, si eres tú).
-- El autor sale como "Carmen R.", nunca el nombre completo.
create or replace function public.resenas_prestador(p_provider uuid, p_limit int default 100)
returns table (
  id           uuid,
  rating       smallint,
  tags         text[],
  comment      text,
  created_at   timestamptz,
  autor        text,
  autor_avatar text,
  servicio     text,
  fotos        text[]
)
language sql stable security definer set search_path = public as $$
  select v.id, v.rating, v.tags, v.comment, v.created_at,
         concat_ws(' ', split_part(p.full_name, ' ', 1), nullif(left(split_part(p.full_name, ' ', 2), 1) || '.', '.')),
         p.avatar_url,
         coalesce(s.title, c.name),
         coalesce((select array_agg(m.storage_path order by m.sort_order) from review_media m where m.review_id = v.id), '{}')
  from reviews v
  join service_requests r on r.id = v.request_id
  join provider_profiles pp on pp.user_id = v.reviewee_id
  left join profiles p on p.id = v.reviewer_id
  left join provider_services s on s.id = r.service_id
  left join categories c on c.id = r.category_id
  where v.reviewee_id = p_provider and v.is_public
    and (pp.verification_status = 'verified' or pp.user_id = auth.uid())
  order by v.created_at desc
  limit greatest(1, least(p_limit, 200));
$$;
revoke all on function public.resenas_prestador(uuid, int) from public, anon;
grant execute on function public.resenas_prestador(uuid, int) to authenticated;

-- Encabezado de A5.1 y B7: promedio, cuántas, cuántas por estrella, etiquetas y fotos.
create or replace function public.resumen_resenas(p_provider uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'rating_avg', pp.rating_avg,
    'rating_count', pp.rating_count,
    'por_estrella', (select jsonb_object_agg(n, (select count(*) from reviews v where v.reviewee_id = pp.user_id and v.is_public and v.rating = n))
                     from generate_series(1, 5) n),
    'etiquetas', coalesce((select jsonb_object_agg(t.tag, t.n) from (
                   select tag, count(*) n from reviews v, unnest(v.tags) tag
                   where v.reviewee_id = pp.user_id and v.is_public group by tag) t), '{}'::jsonb),
    'fotos', (select count(*) from review_media m join reviews v on v.id = m.review_id
              where v.reviewee_id = pp.user_id and v.is_public)
  )
  from provider_profiles pp
  where pp.user_id = p_provider
    and (pp.verification_status = 'verified' or pp.user_id = auth.uid());
$$;
revoke all on function public.resumen_resenas(uuid) from public, anon;
grant execute on function public.resumen_resenas(uuid) to authenticated;

------------------------------------------------------------------------------
-- 8. A8 · Calificar
------------------------------------------------------------------------------
-- El cliente califica un servicio terminado. En la misma llamada: cuánto pagó al final
-- (privado, solo lo ven él y el prestador) y guardar al prestador en favoritos.
-- Las fotos se suben después a review-media/<id de la reseña>/ (la regla ya existe).
create or replace function public.calificar_solicitud(
  p_request_id uuid,
  p_rating     smallint,
  p_tags       text[]  default '{}',
  p_comment    text    default null,
  p_pago       numeric default null,
  p_favorito   boolean default false
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  r   service_requests;
  me  uuid := auth.uid();
  v_id uuid;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  select * into r from service_requests where id = p_request_id;
  if not found then raise exception 'Solicitud no encontrada' using errcode = 'P0002'; end if;
  if me is distinct from r.client_id then
    raise exception 'Solo quien contrató puede calificar' using errcode = '42501';
  end if;
  if r.status <> 'completed' then
    raise exception 'Podrás calificar cuando el trabajo esté terminado' using errcode = '22023';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'Elige de 1 a 5 estrellas' using errcode = '22023';
  end if;
  if not (coalesce(p_tags, '{}') <@ etiquetas_resena()) then
    raise exception 'Etiqueta no válida' using errcode = '22023';
  end if;
  if length(coalesce(v_comment, '')) > 1000 then
    raise exception 'El comentario puede tener hasta 1,000 caracteres' using errcode = '22023';
  end if;
  if p_pago is not null and (p_pago < 0 or p_pago > 100000) then
    raise exception 'Escribe un monto entre $0 y $100,000' using errcode = '22023';
  end if;
  if exists (select 1 from reviews where request_id = r.id and reviewer_id = me) then
    raise exception 'Ya calificaste este servicio' using errcode = '23505';
  end if;

  insert into reviews (request_id, reviewer_id, reviewee_id, rating, tags, comment)
  values (r.id, me, r.provider_id, p_rating, coalesce((select array_agg(distinct t) from unnest(p_tags) t), '{}'), v_comment)
  returning id into v_id;

  if p_pago is not null then
    update service_requests set final_price_mxn = p_pago where id = r.id;
  end if;
  if p_favorito then
    insert into client_favorites (client_id, provider_id) values (me, r.provider_id) on conflict do nothing;
  end if;
  return v_id;
end $$;
revoke all on function public.calificar_solicitud(uuid, smallint, text[], text, numeric, boolean) from public, anon;
grant execute on function public.calificar_solicitud(uuid, smallint, text[], text, numeric, boolean) to authenticated;

-- A partir de ahora las reseñas entran por calificar_solicitud (que valida etiquetas, monto
-- y que la reseña sea del cliente al prestador). Se quita la inserción directa.
drop policy "solo participantes de una solicitud completada" on reviews;

-- Máximo 3 fotos por reseña (A8)
create or replace function public.limitar_fotos_resena()
returns trigger language plpgsql as $$
begin
  if (select count(*) from review_media where review_id = new.review_id) >= 3 then
    raise exception 'Máximo 3 fotos por reseña' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger review_media_limite before insert on review_media
  for each row execute function public.limitar_fotos_resena();

------------------------------------------------------------------------------
-- 9. Calificación y trabajos reales
------------------------------------------------------------------------------
-- Hasta el Sprint 3A el script de demo ponía calificaciones y trabajos a mano. Desde aquí
-- solo los cambian los disparadores; esto los recalcula una vez con los datos que haya.
update provider_profiles pp set
  rating_avg     = coalesce((select round(avg(v.rating)::numeric, 1) from reviews v where v.reviewee_id = pp.user_id and v.is_public), 0),
  rating_count   = (select count(*) from reviews v where v.reviewee_id = pp.user_id and v.is_public),
  jobs_completed = (select count(*) from service_requests r where r.provider_id = pp.user_id and r.status = 'completed');

-- Si se borra una reseña o una solicitud terminada (por ejemplo, al limpiar datos de prueba),
-- la calificación y los trabajos se vuelven a calcular. Antes solo se recalculaban al insertar.
create or replace function public.refrescar_por_borrado()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'reviews' then
    update provider_profiles pp set
      rating_avg   = coalesce((select round(avg(rating)::numeric, 1) from reviews where reviewee_id = pp.user_id and is_public), 0),
      rating_count = (select count(*) from reviews where reviewee_id = pp.user_id and is_public)
    where pp.user_id = old.reviewee_id;
  elsif old.status = 'completed' then
    update provider_profiles set jobs_completed = greatest(0, jobs_completed - 1) where user_id = old.provider_id;
  end if;
  return old;
end $$;
create trigger reviews_refrescar_al_borrar after delete on reviews
  for each row execute function public.refrescar_por_borrado();
create trigger service_requests_refrescar_al_borrar after delete on service_requests
  for each row execute function public.refrescar_por_borrado();
