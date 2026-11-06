-- supabase/migrations/20261013000000_v02_figma.sql
-- Aún no hay datos en producción, así que podrías editar la migración inicial.
-- Va aparte para que el cambio quede documentado.
create extension if not exists btree_gist with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create type urgency_level  as enum ('urgent','this_week','flexible');
create type cancel_reason_t as enum ('resolved','other_provider','schedule','price','other');
create type message_type   as enum ('text','image','video','audio','location');
create type payment_method as enum ('cash','card','transfer');
create type media_kind     as enum ('image','video');

-- A6 · urgencia, días y franjas preferidas, forma de pago · A3.1 · "Vista"
alter table service_requests
  add column viewed_at                 timestamptz,
  add column urgency                   urgency_level not null default 'flexible',
  add column preferred_dates           date[] not null default '{}',
  add column time_windows              text[] not null default '{}',  -- 'morning' · '14:00-18:00'
  add column preferred_payment_methods payment_method[] not null default '{}',
  drop column preferred_date,
  drop column preferred_slot;
drop type day_slot;

-- A7.1 · cancelar con motivo; una cancelada no se reactiva
alter table service_requests
  alter column cancel_reason type cancel_reason_t using cancel_reason::cancel_reason_t,
  add column cancel_note  text,
  add column cancelled_by uuid references profiles(id),
  add column cancelled_at timestamptz,
  add constraint cancel_complete check (
    status <> 'cancelled' or (cancel_reason is not null and cancelled_by is not null and cancelled_at is not null));

-- A5 · formas de pago que acepta el prestador (el pago sigue fuera de la app)
alter table provider_profiles
  add column payment_methods payment_method[] not null default '{cash}';

-- A6 · 5 fotos + 1 video de 30 s (reemplaza request_photos)
create table request_media (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references service_requests(id) on delete cascade,
  kind         media_kind not null,
  storage_path text not null,
  duration_s   smallint check (kind = 'image' or duration_s between 1 and 30),
  sort_order   smallint not null default 0
);
insert into request_media (request_id, kind, storage_path)
  select request_id, 'image', storage_path from request_photos;
drop table request_photos;
-- El límite de 5 fotos y 1 video se valida con un trigger before insert.

-- A8 · fotos en la reseña
create table review_media (
  id           uuid primary key default gen_random_uuid(),
  review_id    uuid not null references reviews(id) on delete cascade,
  storage_path text not null,
  sort_order   smallint not null default 0
);

-- A3 y A8 · favoritos
create table client_favorites (
  client_id   uuid not null references profiles(id) on delete cascade,
  provider_id uuid not null references provider_profiles(user_id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (client_id, provider_id)
);

-- B1 y A5 · certificaciones
create table provider_credentials (
  id           uuid primary key default gen_random_uuid(),
  provider_id  uuid not null references provider_profiles(user_id) on delete cascade,
  title        text not null,
  institution  text,
  year         smallint check (year between 1950 and 2100),
  storage_path text,
  status       verification_status not null default 'pending',
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- B6.4 · marcar horas o días como no disponibles
create table provider_unavailability (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references provider_profiles(user_id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null check (ends_at > starts_at),
  all_day     boolean not null default false,
  reason      text,                    -- privado, solo lo ve el prestador
  rrule       text,                    -- repetición opcional (RFC 5545)
  created_at  timestamptz not null default now()
);
create index on provider_unavailability using gist (provider_id, tstzrange(starts_at, ends_at));

-- A3.3 / B9.3 · chat con foto, video, nota de voz y ubicación
alter table messages rename column attachment_path to media_url;
alter table messages
  drop constraint messages_check,
  add column type       message_type not null default 'text',
  add column duration_s smallint,
  add column lat        float8,
  add column lng        float8,
  add constraint message_payload check (
    (type = 'text' and body is not null) or
    (type in ('image','video','audio') and media_url is not null) or
    (type = 'location' and lat is not null and lng is not null)),
  add constraint video_max_30s check (type <> 'video' or duration_s <= 30);

-- A3.0 · búsqueda por problema: un diccionario, no un modelo de IA
create table category_keywords (
  category_id smallint not null references categories(id) on delete cascade,
  term        text not null,           -- 'pastilla', 'apagador', 'fuga', 'gotea'
  primary key (category_id, term)
);
create index on category_keywords using gin (term gin_trgm_ops);

-- Privacidad por etapas: el chat se abre con la solicitud...
create policy "participantes escriben en su chat" on messages for insert with check (
  auth.uid() = sender_id and exists (
    select 1 from service_requests r
    where r.id = request_id and auth.uid() in (r.client_id, r.provider_id)
      and r.status in ('pending','accepted','scheduled','in_progress')));

-- ...pero calle y teléfono solo aparecen cuando el cliente confirma.
-- La vista corre con permisos de su dueño; el filtro auth.uid() es la barrera.
create or replace view provider_request_view as
select r.id, r.status, r.urgency, r.preferred_dates, r.time_windows,
       r.preferred_payment_methods, r.description,
       a.neighborhood, a.municipality,
       case when r.status in ('scheduled','in_progress','completed')
            then concat_ws(' ', a.street, a.ext_number) end as street,
       case when r.status in ('scheduled','in_progress','completed')
            then p.phone end as client_phone
from service_requests r
join addresses a on a.id = r.address_id
join profiles  p on p.id = r.client_id
where r.provider_id = auth.uid();

-- Inicio (A3): favoritos marcados + prestadores que el cliente calificó con ≥ 4.5
create or replace function home_favorites()
returns table (provider_id uuid, reason text)
language sql stable as $$
  select distinct on (s.provider_id) s.provider_id, s.reason from (
    select f.provider_id, 'favorite' as reason, 0 as k
    from client_favorites f where f.client_id = auth.uid()
    union all
    select rv.reviewee_id, 'rated', 1
    from reviews rv join service_requests r on r.id = rv.request_id
    where rv.reviewer_id = auth.uid() and r.client_id = auth.uid()
    group by rv.reviewee_id having avg(rv.rating) >= 4.5
  ) s order by s.provider_id, s.k;
$$;
