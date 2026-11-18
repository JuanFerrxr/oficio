-- supabase/migrations/20261118000000_acceso_perfil.sql
-- Sprint 1 · Acceso. Dos cosas:
--
-- 1. El perfil solo guarda datos que Supabase Auth ya VERIFICÓ.
--    El registro crea al usuario con teléfono (A1.2) antes de confirmar el código (A2), y el
--    correo se agrega después (A2.1) con updateUser({ email }). handle_new_user solo corre al
--    crear al usuario, así que sin el trigger de actualización profiles.email quedaría vacío
--    para siempre, y profiles.phone tendría números que nadie confirmó.
--
-- 2. Constancia del consentimiento (LFPDPPP): cuándo y qué versión del aviso de privacidad y
--    términos aceptó cada persona. La fecha la pone el servidor, no el teléfono.

alter table profiles
  add column terms_accepted_at timestamptz,
  add column terms_version     text;

comment on column profiles.terms_accepted_at is 'Momento (hora del servidor) en que aceptó el aviso de privacidad y los términos';
comment on column profiles.terms_version     is 'Versión del aviso y términos aceptados, p. ej. 2026-11';

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  acepto boolean := coalesce((meta->>'accepted_terms')::boolean, false);
begin
  insert into public.profiles (id, full_name, phone, email, terms_accepted_at, terms_version)
  values (
    new.id,
    coalesce(meta->>'full_name', ''),
    case when new.phone_confirmed_at is not null then nullif(new.phone, '') end,
    case when new.email_confirmed_at is not null then new.email end,
    case when acepto then now() end,
    case when acepto then meta->>'terms_version' end
  );
  return new;
end $$;

create or replace function public.handle_user_updated()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles p set
    phone = case when new.phone_confirmed_at is not null then nullif(new.phone, '') else p.phone end,
    email = case when new.email_confirmed_at is not null then new.email else p.email end
  where p.id = new.id;
  return new;
end $$;

create trigger on_auth_user_updated
  after update of phone, email, phone_confirmed_at, email_confirmed_at on auth.users
  for each row execute function public.handle_user_updated();

-- Supabase guarda el teléfono sin "+" (5222…); en el perfil se guarda igual que en Auth.
-- El perfil propio ya es legible por su dueño (política "perfil propio: ver").
