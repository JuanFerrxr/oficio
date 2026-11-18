-- supabase/migrations/20261125000000_alta_prestador.sql
-- Sprint 2 · Alta de prestador (B0.1 → B3).
--
-- 1. El perfil de prestador se crea al inicio del alta (B0.1) y se completa paso a paso:
--    servicios (B1), zona y horario (B2), documentos (B3). Por eso la ubicación puede faltar
--    mientras el alta no se termina; enviar_a_revision() exige que exista.
-- 2. Constancia de los Términos para prestadores (aparte de los del cliente).
-- 3. "Enviar a revisión" lo hace una función que revisa que no falte nada y cambia el estado a
--    'pending'. La app no puede escribir verification_status (permisos por columna).
-- 4. Un prestador que no está verificado no se ve: ni su perfil, ni sus servicios, ni su horario.
-- 5. El prestador puede reemplazar sus documentos y certificaciones mientras no estén revisados.
-- 6. Formas de pago (B2): al menos una.

------------------------------------------------------------------------------
-- 1 y 2. Columnas
------------------------------------------------------------------------------
alter table provider_profiles alter column base_location drop not null;

alter table provider_profiles
  add column terms_accepted_at timestamptz,
  add column terms_version     text,
  add column submitted_at      timestamptz;

comment on column provider_profiles.terms_accepted_at is 'Momento (hora del servidor) en que aceptó los Términos para prestadores';
comment on column provider_profiles.terms_version     is 'Versión de los Términos para prestadores aceptados, p. ej. 2026-11';
comment on column provider_profiles.submitted_at      is 'Última vez que envió su alta a revisión (B3)';

-- B2 · Formas de pago: al menos una (el pago sigue fuera de la app)
alter table provider_profiles
  add constraint al_menos_una_forma_de_pago check (cardinality(payment_methods) >= 1);

------------------------------------------------------------------------------
-- B0.1 · Iniciar el alta (o actualizar los años de experiencia si ya existía)
------------------------------------------------------------------------------
create or replace function public.iniciar_alta_prestador(p_years int, p_terms_version text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Necesitas iniciar sesión' using errcode = '42501';
  end if;
  if p_years is null or p_years not between 0 and 60 then
    raise exception 'Años de experiencia fuera de rango' using errcode = '22023';
  end if;
  if coalesce(p_terms_version, '') = '' then
    raise exception 'Falta aceptar los Términos para prestadores' using errcode = '22023';
  end if;

  insert into provider_profiles (user_id, years_experience, terms_accepted_at, terms_version)
  values (auth.uid(), p_years, now(), p_terms_version)
  on conflict (user_id) do update
    set years_experience  = excluded.years_experience,
        -- La fecha de aceptación solo cambia si acepta una versión nueva de los Términos
        terms_accepted_at = case when provider_profiles.terms_version is distinct from excluded.terms_version
                                 then now() else provider_profiles.terms_accepted_at end,
        terms_version     = excluded.terms_version;
end $$;

revoke all on function public.iniciar_alta_prestador(int, text) from public, anon;
grant execute on function public.iniciar_alta_prestador(int, text) to authenticated;

------------------------------------------------------------------------------
-- B3 · Enviar a revisión
------------------------------------------------------------------------------
-- Devuelve la lista de lo que falta (vacía si está completo). La app la usa para marcar los pasos.
create or replace function public.faltantes_alta_prestador(p_provider uuid default auth.uid())
returns text[] language sql stable security definer set search_path = public as $$
  with pp as (select * from provider_profiles where user_id = p_provider),
  docs as (select distinct doc_type from verification_documents where provider_id = p_provider),
  ninera as (
    select exists (
      select 1 from provider_services s join categories c on c.id = s.category_id
      where s.provider_id = p_provider and s.is_active and c.requires_background_check) as req)
  select array_remove(array[
    case when not exists (select 1 from pp) then 'perfil' end,
    case when not exists (select 1 from pp where terms_accepted_at is not null) then 'terminos' end,
    case when not exists (select 1 from provider_services where provider_id = p_provider and is_active) then 'servicios' end,
    case when not exists (select 1 from pp where base_location is not null) then 'zona' end,
    case when not exists (select 1 from provider_availability where provider_id = p_provider) then 'horario' end,
    case when not exists (select 1 from docs where doc_type = 'ine_front') then 'ine_front' end,
    case when not exists (select 1 from docs where doc_type = 'ine_back') then 'ine_back' end,
    case when not exists (select 1 from docs where doc_type = 'selfie') then 'selfie' end,
    case when not exists (select 1 from docs where doc_type = 'proof_of_address') then 'proof_of_address' end,
    case when (select req from ninera) and not exists (select 1 from docs where doc_type = 'criminal_record')
         then 'criminal_record' end
  ], null);
$$;

-- Solo para uno mismo: nadie puede preguntar por el alta de otra persona
create or replace function public.mis_faltantes_alta()
returns text[] language sql stable security definer set search_path = public as $$
  select public.faltantes_alta_prestador(auth.uid());
$$;

revoke all on function public.faltantes_alta_prestador(uuid) from public, anon, authenticated;
revoke all on function public.mis_faltantes_alta() from public, anon;
grant execute on function public.mis_faltantes_alta() to authenticated;

create or replace function public.enviar_a_revision()
returns verification_status language plpgsql security definer set search_path = public as $$
declare
  faltan text[] := public.faltantes_alta_prestador(auth.uid());
  estado verification_status;
begin
  if auth.uid() is null then
    raise exception 'Necesitas iniciar sesión' using errcode = '42501';
  end if;
  if array_length(faltan, 1) > 0 then
    raise exception 'Falta completar el alta' using errcode = 'P0001', hint = array_to_string(faltan, ',');
  end if;

  select verification_status into estado from provider_profiles where user_id = auth.uid();
  if estado = 'verified' then
    return estado; -- ya aprobado: no se regresa a revisión
  end if;

  update provider_profiles
     set verification_status = 'pending', submitted_at = now()
   where user_id = auth.uid();
  return 'pending';
end $$;

revoke all on function public.enviar_a_revision() from public, anon;
grant execute on function public.enviar_a_revision() to authenticated;

------------------------------------------------------------------------------
-- 4. Solo se ven los prestadores verificados (y cada quien ve lo suyo)
------------------------------------------------------------------------------
create or replace function public.es_prestador_visible(p_provider uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_provider = auth.uid() or exists (
    select 1 from provider_profiles where user_id = p_provider and verification_status = 'verified');
$$;

drop policy "prestadores visibles" on provider_profiles;
create policy "prestadores visibles" on provider_profiles for select
  using (verification_status = 'verified' or user_id = auth.uid());

drop policy "servicios visibles" on provider_services;
create policy "servicios visibles" on provider_services for select
  using (public.es_prestador_visible(provider_id));

drop policy "horarios visibles" on provider_availability;
create policy "horarios visibles" on provider_availability for select
  using (public.es_prestador_visible(provider_id));

drop policy "portafolio visible" on provider_media;
create policy "portafolio visible" on provider_media for select
  using (public.es_prestador_visible(provider_id));

------------------------------------------------------------------------------
-- 5. Reemplazar documentos y certificaciones que aún no se revisan
------------------------------------------------------------------------------
create policy "borrar mis documentos sin revisar" on verification_documents for delete
  using (provider_id = auth.uid() and status = 'pending');
create policy "borrar mis certificaciones sin revisar" on provider_credentials for delete
  using (provider_id = auth.uid() and status = 'pending');

create policy "reemplazo mis documentos" on storage.objects for update to authenticated
  using (bucket_id = 'verification' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'verification' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "borro mis documentos" on storage.objects for delete to authenticated
  using (bucket_id = 'verification' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "reemplazo mi foto y portafolio" on storage.objects for update to authenticated
  using (bucket_id in ('avatars','provider-media') and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id in ('avatars','provider-media') and (storage.foldername(name))[1] = auth.uid()::text);
