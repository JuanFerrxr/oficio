-- Sprint 5A · IA: búsqueda por significado y asistente de solicitud
--
-- Búsqueda: cada oficio y cada servicio de un prestador verificado se convierte en un vector
-- (embedding de Voyage AI) y se guarda aquí, en Postgres con pgvector. La API convierte lo que
-- escribe el cliente ("se me tapó la coladera") en otro vector y la base busca los más parecidos.
-- El diccionario de A3.0 (match_categories) se queda: sigue funcionando sin IA y tiene prioridad.
--
-- Asistente: la base solo lleva la cuenta de cuántas veces usa la IA cada persona (para que nadie
-- dispare el costo). El modelo y sus llaves viven en la API, nunca en la app.

create extension if not exists vector with schema extensions;

-------------------------------------------------------------------------------
-- 1. Qué se busca: un texto por oficio y uno por servicio activo de un prestador verificado
-------------------------------------------------------------------------------
create or replace view public.ia_documentos as
  select 'categoria:' || c.id as clave,
         c.id as category_id,
         null::uuid as service_id,
         c.name || '. ' || coalesce(string_agg(k.term, ', ' order by k.term), '') as contenido
  from categories c
  left join category_keywords k on k.category_id = c.id
  where c.is_active
  group by c.id, c.name
  union all
  select 'servicio:' || s.id,
         s.category_id,
         s.id,
         cat.name || ': ' || s.title || coalesce('. ' || nullif(trim(s.description), ''), '')
  from provider_services s
  join categories cat on cat.id = s.category_id and cat.is_active
  join provider_profiles pp on pp.user_id = s.provider_id and pp.verification_status = 'verified'
  join profiles p on p.id = s.provider_id and p.deleted_at is null
  where s.is_active;

revoke all on public.ia_documentos from public, anon, authenticated;

-- Los vectores. Nadie los lee desde la app: solo la API (service role) y la función de búsqueda.
create table public.ia_embeddings (
  clave          text primary key,
  category_id    smallint not null references categories(id) on delete cascade,
  service_id     uuid references provider_services(id) on delete cascade,
  hash           text not null,                     -- md5 del contenido: si cambia, se vuelve a calcular
  modelo         text not null,                     -- si cambias de modelo, se recalcula todo
  embedding      extensions.vector(1024) not null,
  actualizado_at timestamptz not null default now()
);
create index ia_embeddings_hnsw on public.ia_embeddings using hnsw (embedding extensions.vector_cosine_ops);
alter table public.ia_embeddings enable row level security;   -- sin políticas: solo service role

-- Lo que falta por calcular (nuevo, cambiado o de otro modelo). Lo usa el indexado de la API.
create or replace function public.ia_documentos_pendientes(p_modelo text, p_limite int default 100)
returns table (clave text, category_id smallint, service_id uuid, contenido text, hash text)
language sql stable security definer set search_path = public as $$
  select d.clave, d.category_id, d.service_id, d.contenido, md5(d.contenido)
  from ia_documentos d
  left join ia_embeddings e on e.clave = d.clave
  where e.clave is null or e.hash <> md5(d.contenido) or e.modelo <> p_modelo
  order by d.clave
  limit least(greatest(p_limite, 1), 500);
$$;

-- Borra vectores de servicios que ya no existen, se desactivaron o cuyo prestador dejó de estar verificado
create or replace function public.ia_limpiar_embeddings()
returns int language sql security definer set search_path = public as $$
  with borrados as (
    delete from ia_embeddings e
    where not exists (select 1 from ia_documentos d where d.clave = e.clave)
    returning 1)
  select count(*)::int from borrados;
$$;

revoke all on function public.ia_documentos_pendientes(text, int) from public, anon, authenticated;
revoke all on function public.ia_limpiar_embeddings() from public, anon, authenticated;
grant execute on function public.ia_documentos_pendientes(text, int) to service_role;
grant execute on function public.ia_limpiar_embeddings() to service_role;

-- Caché de lo que escriben los clientes: la misma búsqueda no se vuelve a pagar
create table public.ia_consultas (
  texto     text not null,
  modelo    text not null,
  embedding extensions.vector(1024) not null,
  usos      int not null default 1,
  creado_at timestamptz not null default now(),
  primary key (texto, modelo)
);
alter table public.ia_consultas enable row level security;   -- sin políticas: solo service role

-------------------------------------------------------------------------------
-- 2. Búsqueda por significado (la llama la API con la sesión del cliente)
-------------------------------------------------------------------------------
-- Toma los 40 textos más parecidos y los agrupa por oficio. score = similitud coseno (0 a 1)
-- del texto más parecido de ese oficio. `servicios` = títulos que coincidieron (para "Servicios
-- relacionados"). El umbral lo decide la API (variable IA_UMBRAL_BUSQUEDA).
create or replace function public.categorias_por_significado(
  p_embedding extensions.vector,
  p_umbral    real default 0.35,
  p_limite    int  default 3
)
returns table (category_id smallint, slug text, name text, score real, servicios text[])
language sql stable security definer set search_path = public, extensions as $$
  with cerca as (
    select e.category_id, e.service_id, (1 - (e.embedding <=> p_embedding))::real as sim
    from ia_embeddings e
    order by e.embedding <=> p_embedding
    limit 40
  )
  select c.id, c.slug, c.name, max(cerca.sim),
         coalesce(array_agg(distinct s.title) filter (where s.title is not null), '{}')
  from cerca
  join categories c on c.id = cerca.category_id and c.is_active
  left join provider_services s on s.id = cerca.service_id
  group by c.id, c.slug, c.name, c.sort_order
  having max(cerca.sim) >= p_umbral
  order by max(cerca.sim) desc, c.sort_order
  limit least(greatest(p_limite, 1), 8);
$$;
revoke all on function public.categorias_por_significado(extensions.vector, real, int) from public, anon;
grant execute on function public.categorias_por_significado(extensions.vector, real, int) to authenticated;

-------------------------------------------------------------------------------
-- 3. Cuánto usa la IA cada persona
-------------------------------------------------------------------------------
create table public.ia_uso (
  id        bigserial primary key,
  user_id   uuid not null references profiles(id) on delete cascade,
  tipo      text not null check (tipo in ('busqueda', 'asistente', 'cotizar')),
  creado_at timestamptz not null default now()
);
create index ia_uso_usuario on public.ia_uso (user_id, tipo, creado_at desc);
alter table public.ia_uso enable row level security;   -- sin políticas: se escribe solo con la función

-- Registra un uso y regresa cuántos le quedan en las últimas 24 horas.
-- Si ya llegó al límite, falla con un mensaje en español (código P0001) y no registra nada.
create or replace function public.ia_registrar_uso(p_tipo text, p_limite int)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_usados int;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para usar esta función' using errcode = '42501';
  end if;
  if p_tipo not in ('busqueda', 'asistente', 'cotizar') then
    raise exception 'Tipo de uso desconocido' using errcode = '22023';
  end if;
  select count(*) into v_usados from ia_uso
  where user_id = v_uid and tipo = p_tipo and creado_at > now() - interval '24 hours';
  if v_usados >= p_limite then
    raise exception 'Llegaste al límite de sugerencias por hoy. Intenta mañana.' using errcode = 'P0001';
  end if;
  insert into ia_uso (user_id, tipo) values (v_uid, p_tipo);
  return p_limite - v_usados - 1;
end;
$$;
revoke all on function public.ia_registrar_uso(text, int) from public, anon;
grant execute on function public.ia_registrar_uso(text, int) to authenticated;
