-- supabase/migrations/20261006000000_init.sql
create extension if not exists postgis with schema extensions;

create type verification_status as enum ('unverified','pending','verified','rejected');
create type price_type        as enum ('fixed','hourly','quote');
create type day_slot          as enum ('morning','afternoon','evening','flexible');
create type request_status    as enum ('pending','accepted','declined','scheduled',
                                       'in_progress','completed','cancelled','expired');

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  phone       text unique,
  email       text,
  avatar_url  text,
  is_admin    boolean not null default false,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table addresses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  label         text,
  street        text not null,
  ext_number    text,
  int_number    text,
  neighborhood  text,                       -- colonia
  municipality  text not null,
  state         text not null,
  postal_code   char(5) not null,
  directions    text,                       -- referencias para llegar
  location      geography(Point,4326) not null,
  is_default    boolean not null default false,
  created_at    timestamptz not null default now()
);

create table categories (
  id                        smallserial primary key,
  parent_id                 smallint references categories(id),
  slug                      text unique not null,
  name                      text not null,
  icon                      text,
  requires_background_check boolean not null default false,
  sort_order                int not null default 0,
  is_active                 boolean not null default true
);

create table provider_profiles (
  user_id              uuid primary key references profiles(id) on delete cascade,
  headline             text,
  bio                  text,
  years_experience     smallint check (years_experience between 0 and 60),
  base_location        geography(Point,4326) not null,
  service_radius_km    smallint not null default 10 check (service_radius_km between 1 and 50),
  verification_status  verification_status not null default 'unverified',
  verified_at          timestamptz,
  is_available         boolean not null default true,
  rating_avg           numeric(2,1) not null default 0,
  rating_count         int not null default 0,
  jobs_completed       int not null default 0,
  avg_response_minutes int,
  created_at           timestamptz not null default now()
);
create index provider_location_gix on provider_profiles using gist (base_location);

create table provider_services (
  id           uuid primary key default gen_random_uuid(),
  provider_id  uuid not null references provider_profiles(user_id) on delete cascade,
  category_id  smallint not null references categories(id),
  title        text not null,
  description  text,
  price_type   price_type not null,
  price_mxn    numeric(10,2) check (price_mxn is null or price_mxn >= 0),
  is_active    boolean not null default true,
  check (price_type = 'quote' or price_mxn is not null)
);
create index on provider_services (category_id) where is_active;

create table provider_availability (
  provider_id uuid not null references provider_profiles(user_id) on delete cascade,
  weekday     smallint not null check (weekday between 0 and 6),
  start_time  time not null,
  end_time    time not null check (end_time > start_time),
  primary key (provider_id, weekday, start_time)
);

create table provider_media (
  id           uuid primary key default gen_random_uuid(),
  provider_id  uuid not null references provider_profiles(user_id) on delete cascade,
  storage_path text not null,
  caption      text,
  sort_order   int not null default 0
);

create table verification_documents (
  id           uuid primary key default gen_random_uuid(),
  provider_id  uuid not null references provider_profiles(user_id) on delete cascade,
  doc_type     text not null check (doc_type in
                 ('ine_front','ine_back','selfie','proof_of_address','criminal_record')),
  storage_path text,                       -- bucket privado; null si solo guardamos el resultado del KYC
  kyc_reference text,                      -- id de Truora/MetaMap
  status       verification_status not null default 'pending',
  reviewed_by  uuid references profiles(id),
  reviewed_at  timestamptz,
  notes        text,
  created_at   timestamptz not null default now()
);

create table service_requests (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references profiles(id),
  provider_id      uuid not null references provider_profiles(user_id),
  service_id       uuid references provider_services(id),
  category_id      smallint not null references categories(id),
  address_id       uuid not null references addresses(id),
  description      text not null check (length(description) between 10 and 1000),
  preferred_date   date,
  preferred_slot   day_slot not null default 'flexible',
  scheduled_at     timestamptz,
  quoted_price_mxn numeric(10,2),
  final_price_mxn  numeric(10,2),          -- lo reporta el cliente al calificar (opcional)
  status           request_status not null default 'pending',
  cancel_reason    text,
  expires_at       timestamptz not null default now() + interval '2 hours',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (client_id <> provider_id)
);
create index on service_requests (provider_id, status);
create index on service_requests (client_id, created_at desc);

create table request_photos (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references service_requests(id) on delete cascade,
  storage_path text not null
);

create table request_events (
  id          bigserial primary key,
  request_id  uuid not null references service_requests(id) on delete cascade,
  from_status request_status,
  to_status   request_status not null,
  actor_id    uuid references profiles(id),
  note        text,
  created_at  timestamptz not null default now()
);

create table messages (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid not null references service_requests(id) on delete cascade,
  sender_id       uuid not null references profiles(id),
  body            text,
  attachment_path text,
  read_at         timestamptz,
  created_at      timestamptz not null default now(),
  check (body is not null or attachment_path is not null)
);
create index on messages (request_id, created_at);

create table reviews (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references service_requests(id) on delete cascade,
  reviewer_id uuid not null references profiles(id),
  reviewee_id uuid not null references profiles(id),
  rating      smallint not null check (rating between 1 and 5),
  tags        text[] not null default '{}',
  comment     text,
  is_public   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (request_id, reviewer_id)
);

create table push_tokens (
  token      text primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  platform   text not null check (platform in ('ios','android','web')),
  updated_at timestamptz not null default now()
);

create table reports (
  id             uuid primary key default gen_random_uuid(),
  reporter_id    uuid not null references profiles(id),
  target_user_id uuid not null references profiles(id),
  request_id     uuid references service_requests(id),
  reason         text not null,
  details        text,
  status         text not null default 'open' check (status in ('open','reviewing','closed')),
  created_at     timestamptz not null default now()
);

-- Búsqueda: prestadores verificados de una categoría, dentro de su radio y del radio del cliente
create or replace function search_providers(
  p_category smallint, p_lat float8, p_lng float8, p_max_km int default 10)
returns table (provider_id uuid, full_name text, headline text, rating_avg numeric,
               rating_count int, distance_km numeric, from_price_mxn numeric)
language sql stable as $$
  with origin as (select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography g)
  select pp.user_id, p.full_name, pp.headline, pp.rating_avg, pp.rating_count,
         round((st_distance(pp.base_location, o.g) / 1000)::numeric, 1),
         min(ps.price_mxn)
  from provider_profiles pp
  join profiles p           on p.id = pp.user_id and p.deleted_at is null
  join provider_services ps on ps.provider_id = pp.user_id
                           and ps.category_id = p_category and ps.is_active
  cross join origin o
  where pp.verification_status = 'verified'
    and pp.is_available
    and st_dwithin(pp.base_location, o.g, p_max_km * 1000)
    and st_dwithin(pp.base_location, o.g, pp.service_radius_km * 1000)
  group by pp.user_id, p.full_name, pp.headline, pp.rating_avg, pp.rating_count, pp.base_location, o.g
  order by 6 asc, pp.rating_avg desc
  limit 50;
$$;

-- Seguridad por fila (ejemplos; se activa en TODAS las tablas)
alter table service_requests enable row level security;
create policy "participantes ven su solicitud" on service_requests
  for select using (auth.uid() in (client_id, provider_id));
create policy "cliente crea solicitudes propias" on service_requests
  for insert with check (auth.uid() = client_id and status = 'pending');
-- Los cambios de estado pasan por la API o por una función SECURITY DEFINER
-- que valida la transición y escribe en request_events.

alter table reviews enable row level security;
create policy "reseñas públicas visibles" on reviews for select using (is_public);
create policy "solo participantes de una solicitud completada" on reviews
  for insert with check (
    auth.uid() = reviewer_id and exists (
      select 1 from service_requests r
      where r.id = request_id and r.status = 'completed'
        and auth.uid() in (r.client_id, r.provider_id)
        and reviewee_id in (r.client_id, r.provider_id) and reviewee_id <> auth.uid()));
-- Trigger after insert on reviews: recalcula rating_avg / rating_count del prestador.
