-- supabase/migrations/20261223000000_chat_avisos.sql
-- Sprint 4B · Chat y avisos:
--   A3.2 · B9 · B9.1 · B9.2   listas de conversaciones (cliente y prestador)
--   A3.3 · B9.3               conversación con texto, fotos, video, notas de voz y ubicación
--   Notificaciones push       cola de avisos que la API manda por Expo Push

------------------------------------------------------------------------------
-- 1. Mensajes: límites
------------------------------------------------------------------------------
alter table messages
  add constraint texto_corto check (body is null or length(body) <= 2000),
  add constraint nota_de_voz_2_min check (type <> 'audio' or duration_s between 1 and 120),
  add constraint ubicacion_valida check (type <> 'location' or (lat between -90 and 90 and lng between -180 and 180));

-- La lista y el contador de no leídos buscan por solicitud y por "no leído"
create index if not exists messages_no_leidos_idx on messages (request_id) where read_at is null;

------------------------------------------------------------------------------
-- 2. Leer mensajes
------------------------------------------------------------------------------
-- Marca como leídos los mensajes del otro en esa conversación ("Visto 10:33").
create or replace function public.marcar_leidos(p_request_id uuid)
returns int language sql security definer set search_path = public as $$
  with u as (
    update messages m set read_at = now()
    where m.request_id = p_request_id and m.read_at is null and m.sender_id <> auth.uid()
      and exists (select 1 from service_requests r where r.id = m.request_id and auth.uid() in (r.client_id, r.provider_id))
    returning 1)
  select count(*)::int from u;
$$;
revoke all on function public.marcar_leidos(uuid) from public, anon;
grant execute on function public.marcar_leidos(uuid) to authenticated;

-- Insignia de la pestaña Mensajes
create or replace function public.mis_no_leidos()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from messages m join service_requests r on r.id = m.request_id
  where m.read_at is null and m.sender_id <> auth.uid() and auth.uid() in (r.client_id, r.provider_id);
$$;
revoke all on function public.mis_no_leidos() from public, anon;
grant execute on function public.mis_no_leidos() to authenticated;

------------------------------------------------------------------------------
-- 3. A3.2 · B9 · Conversaciones
------------------------------------------------------------------------------
-- Una fila por solicitud en la que participas: las que ya tienen mensajes y las vigentes
-- (pendiente, aceptada, confirmada o en curso), aunque nadie haya escrito, para poder empezar.
-- El cliente ve el nombre completo del prestador; el prestador ve "Mariana G.".
create or replace function public.mis_conversaciones()
returns table (
  request_id    uuid,
  rol           text,           -- 'cliente' | 'prestador' (lo que soy yo en esa solicitud)
  status        request_status,
  expires_at    timestamptz,
  otro_id       uuid,
  otro_nombre   text,
  otro_avatar   text,
  servicio      text,
  scheduled_at  timestamptz,
  quoted_price_mxn numeric,
  ultimo_tipo   message_type,
  ultimo_texto  text,
  ultimo_duracion smallint,
  ultimo_at     timestamptz,
  ultimo_mio    boolean,
  no_leidos     int,
  actividad_at  timestamptz
)
language sql stable security definer set search_path = public as $$
  select r.id,
         case when r.client_id = auth.uid() then 'cliente' else 'prestador' end,
         r.status, r.expires_at,
         o.id,
         case when r.client_id = auth.uid() then o.full_name
              else concat_ws(' ', split_part(o.full_name, ' ', 1), nullif(left(split_part(o.full_name, ' ', 2), 1) || '.', '.')) end,
         o.avatar_url,
         coalesce(s.title, c.name), r.scheduled_at, r.quoted_price_mxn,
         u.type, u.body, u.duration_s, u.created_at, u.sender_id = auth.uid(),
         (select count(*)::int from messages m where m.request_id = r.id and m.read_at is null and m.sender_id <> auth.uid()),
         coalesce(u.created_at, r.updated_at)
  from service_requests r
  join profiles o on o.id = case when r.client_id = auth.uid() then r.provider_id else r.client_id end
  join categories c on c.id = r.category_id
  left join provider_services s on s.id = r.service_id
  left join lateral (select m.* from messages m where m.request_id = r.id order by m.created_at desc limit 1) u on true
  where auth.uid() in (r.client_id, r.provider_id)
    and (u.id is not null or r.status in ('accepted', 'scheduled', 'in_progress')
         or (r.status = 'pending' and r.expires_at > now()))
  order by coalesce(u.created_at, r.updated_at) desc;
$$;
revoke all on function public.mis_conversaciones() from public, anon;
grant execute on function public.mis_conversaciones() to authenticated;

------------------------------------------------------------------------------
-- 4. A3.3 · B9.3 · Encabezado de la conversación
------------------------------------------------------------------------------
-- Quién es el otro y de qué solicitud se trata. "Cómo llegar" (coordenadas y calle) solo para
-- el prestador y solo con la cita confirmada, igual que en la bandeja.
create or replace function public.chat_info(p_request_id uuid)
returns jsonb language sql stable security definer set search_path = public, extensions as $$
  select jsonb_build_object(
    'request_id', r.id,
    'rol', case when r.client_id = auth.uid() then 'cliente' else 'prestador' end,
    'status', r.status,
    'abierto', r.status in ('pending', 'accepted', 'scheduled', 'in_progress'),
    'servicio', coalesce(s.title, c.name),
    'oficio', c.name,
    'scheduled_at', r.scheduled_at,
    'quoted_price_mxn', r.quoted_price_mxn,
    'otro_id', o.id,
    'otro_nombre', case when r.client_id = auth.uid() then o.full_name
                        else concat_ws(' ', split_part(o.full_name, ' ', 1), nullif(left(split_part(o.full_name, ' ', 2), 1) || '.', '.')) end,
    'otro_avatar', o.avatar_url,
    'responde_min', case when r.client_id = auth.uid() then pp.avg_response_minutes end,
    'cliente_calificacion', case when r.provider_id = auth.uid() then (select round(avg(v.rating), 1) from reviews v where v.reviewee_id = r.client_id) end,
    'colonia', case when r.provider_id = auth.uid() then a.neighborhood end,
    'destino', case when r.provider_id = auth.uid() and r.status in ('scheduled', 'in_progress') and a.location is not null then
                 jsonb_build_object('lat', st_y(a.location::geometry), 'lng', st_x(a.location::geometry),
                                    'direccion', concat_ws(', ', concat_ws(' ', a.street, a.ext_number), a.neighborhood, a.municipality)) end
  )
  from service_requests r
  join profiles o on o.id = case when r.client_id = auth.uid() then r.provider_id else r.client_id end
  join provider_profiles pp on pp.user_id = r.provider_id
  join categories c on c.id = r.category_id
  left join provider_services s on s.id = r.service_id
  left join addresses a on a.id = r.address_id
  where r.id = p_request_id and auth.uid() in (r.client_id, r.provider_id);
$$;
revoke all on function public.chat_info(uuid) from public, anon;
grant execute on function public.chat_info(uuid) to authenticated;

------------------------------------------------------------------------------
-- 5. Dispositivos para notificaciones
------------------------------------------------------------------------------
-- Un token de Expo pertenece a un teléfono. Si en ese teléfono entra otra cuenta, el token
-- pasa a la cuenta nueva (si no, la anterior seguiría recibiendo sus avisos).
create or replace function public.registrar_dispositivo(p_token text, p_platform text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[.+\]$' then
    raise exception 'Token no válido' using errcode = '22023';
  end if;
  insert into push_tokens (token, user_id, platform, updated_at)
  values (p_token, auth.uid(), p_platform, now())
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end $$;
revoke all on function public.registrar_dispositivo(text, text) from public, anon;
grant execute on function public.registrar_dispositivo(text, text) to authenticated;

-- Al cerrar sesión, el teléfono deja de recibir avisos de esa cuenta
create or replace function public.olvidar_dispositivo(p_token text)
returns void language sql security definer set search_path = public as $$
  delete from push_tokens where token = p_token and user_id = auth.uid();
$$;
revoke all on function public.olvidar_dispositivo(text) from public, anon;
grant execute on function public.olvidar_dispositivo(text) to authenticated;

------------------------------------------------------------------------------
-- 6. Avisos (cola de notificaciones)
------------------------------------------------------------------------------
-- Cada evento importante deja aquí un aviso. La API los toma, los manda por Expo Push y marca
-- enviado_at. Así la app no depende de la API para nada: solo escribe en la base, como hasta ahora.
create table avisos (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references profiles(id) on delete cascade,
  titulo      text not null,
  cuerpo      text not null,
  datos       jsonb not null default '{}'::jsonb,   -- { requestId, ir: 'solicitud' | 'chat' | 'bandeja' | 'resenas' }
  created_at  timestamptz not null default now(),
  enviado_at  timestamptz,
  intentos    smallint not null default 0,
  error       text
);
create index avisos_pendientes_idx on avisos (created_at) where enviado_at is null;
alter table avisos enable row level security;
create policy "mis avisos" on avisos for select using (user_id = auth.uid());
-- Nadie inserta desde la app: solo los disparadores (security definer) y la API (service role)

create or replace function public.nombre_corto(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select concat_ws(' ', split_part(full_name, ' ', 1), nullif(left(split_part(full_name, ' ', 2), 1) || '.', '.')) from profiles where id = p_user;
$$;
revoke all on function public.nombre_corto(uuid) from public, anon, authenticated;

create or replace function public.avisar(p_user uuid, p_titulo text, p_cuerpo text, p_datos jsonb)
returns void language sql security definer set search_path = public as $$
  insert into avisos (user_id, titulo, cuerpo, datos) values (p_user, left(p_titulo, 120), left(p_cuerpo, 240), p_datos);
$$;
revoke all on function public.avisar(uuid, text, text, jsonb) from public, anon, authenticated;

-- Solicitud nueva y cambios de estado
create or replace function public.avisos_solicitud()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_servicio text;
  v_cliente  text := nombre_corto(new.client_id);
  v_prest    text := split_part((select full_name from profiles where id = new.provider_id), ' ', 1);
  v_cuando   text := case when new.scheduled_at is not null
                          then to_char(new.scheduled_at at time zone 'America/Mexico_City', 'DD/MM HH24:MI') end;
  v_monto    text := '$' || to_char(coalesce(new.final_price_mxn, new.quoted_price_mxn), 'FM999,999');
begin
  select coalesce(s.title, c.name) into v_servicio
  from categories c left join provider_services s on s.id = new.service_id where c.id = new.category_id;

  if tg_op = 'INSERT' then
    if new.status = 'pending' then
      perform avisar(new.provider_id, 'Nueva solicitud: ' || v_servicio, v_cliente || ' · tienes 2 horas para responder',
                     jsonb_build_object('requestId', new.id, 'ir', 'bandeja'));
    end if;
    return new;
  end if;
  if new.status is not distinct from old.status then return new; end if;

  case new.status
    when 'accepted' then
      perform avisar(new.client_id, v_prest || ' cotizó ' || v_monto, v_servicio || coalesce(' · ' || v_cuando, '') || '. Confírmala para apartar la cita.',
                     jsonb_build_object('requestId', new.id, 'ir', 'solicitud'));
    when 'declined' then
      perform avisar(new.client_id, v_prest || ' no puede tomar tu solicitud', v_servicio || '. Te sugerimos otros prestadores cerca.',
                     jsonb_build_object('requestId', new.id, 'ir', 'solicitud'));
    when 'scheduled' then
      perform avisar(new.provider_id, v_cliente || ' confirmó la cita', v_servicio || coalesce(' · ' || v_cuando, '') || '. Ya puedes ver su dirección y teléfono.',
                     jsonb_build_object('requestId', new.id, 'ir', 'bandeja'));
    when 'in_progress' then
      perform avisar(new.client_id, v_prest || ' empezó el trabajo', v_servicio || '. Cuando termine, márcalo en la app.',
                     jsonb_build_object('requestId', new.id, 'ir', 'solicitud'));
    when 'completed' then
      perform avisar(new.provider_id, v_cliente || ' marcó el trabajo como terminado', v_servicio || '. ¡Buen trabajo!',
                     jsonb_build_object('requestId', new.id, 'ir', 'bandeja'));
    when 'cancelled' then
      if new.cancelled_by = new.client_id then
        perform avisar(new.provider_id, v_cliente || ' canceló la solicitud', v_servicio,
                       jsonb_build_object('requestId', new.id, 'ir', 'bandeja'));
      else
        perform avisar(new.client_id, v_prest || ' canceló la solicitud', v_servicio,
                       jsonb_build_object('requestId', new.id, 'ir', 'solicitud'));
      end if;
    when 'expired' then
      perform avisar(new.client_id, 'Tu solicitud expiró', v_prest || ' no respondió en 2 horas. Prueba con otro prestador cerca.',
                     jsonb_build_object('requestId', new.id, 'ir', 'solicitud'));
    else null;
  end case;
  return new;
end $$;
create trigger service_requests_avisos after insert or update of status on service_requests
  for each row execute function public.avisos_solicitud();

-- Mensajes nuevos (no se avisa el mensaje que acompaña a la cotización: ya va en "cotizó $350")
create or replace function public.avisos_mensaje()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r      service_requests;
  v_para uuid;
  v_de   text;
  v_txt  text;
begin
  select * into r from service_requests where id = new.request_id;
  if exists (select 1 from request_events e where e.request_id = r.id and e.to_status = 'accepted' and e.created_at = now()) then
    return new;
  end if;
  v_para := case when new.sender_id = r.client_id then r.provider_id else r.client_id end;
  v_de := case when new.sender_id = r.client_id then nombre_corto(r.client_id)
               else (select full_name from profiles where id = r.provider_id) end;
  v_txt := case new.type
             when 'text' then new.body
             when 'image' then 'Te mandó una foto'
             when 'video' then 'Te mandó un video'
             when 'audio' then 'Nota de voz (' || coalesce(new.duration_s, 0) / 60 || ':' || lpad((coalesce(new.duration_s, 0) % 60)::text, 2, '0') || ')'
             when 'location' then 'Te compartió una ubicación'
           end;
  perform avisar(v_para, v_de, v_txt, jsonb_build_object('requestId', r.id, 'ir', 'chat'));
  return new;
end $$;
create trigger messages_avisos after insert on messages
  for each row execute function public.avisos_mensaje();

-- Reseña nueva
create or replace function public.avisos_resena()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from provider_profiles where user_id = new.reviewee_id) then
    perform avisar(new.reviewee_id, nombre_corto(new.reviewer_id) || ' te calificó con ' || new.rating || ' ★',
                   coalesce(left(new.comment, 120), 'Ve tu reseña en la pestaña Reseñas.'),
                   jsonb_build_object('requestId', new.request_id, 'ir', 'resenas'));
  end if;
  return new;
end $$;
create trigger reviews_avisos after insert on reviews
  for each row execute function public.avisos_resena();

-- Perfil → Notificaciones → "Mandarme un aviso de prueba" (uno por minuto)
create or replace function public.aviso_de_prueba()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  if exists (select 1 from avisos where user_id = auth.uid() and datos->>'ir' = 'prueba' and created_at > now() - interval '1 minute') then
    raise exception 'Espera un minuto para mandar otro aviso de prueba' using errcode = '22023';
  end if;
  perform avisar(auth.uid(), 'Aviso de prueba', 'Si ves esto, las notificaciones de Oficio funcionan en este teléfono.', jsonb_build_object('ir', 'prueba'));
end $$;
revoke all on function public.aviso_de_prueba() from public, anon;
grant execute on function public.aviso_de_prueba() to authenticated;
