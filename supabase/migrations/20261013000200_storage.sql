-- supabase/migrations/20261013000200_storage.sql
-- Buckets de archivos y quién puede leer/escribir en cada uno.
-- Convención de rutas (la primera carpeta decide el permiso):
--   avatars/<user_id>/foto.jpg
--   provider-media/<provider_id>/...        portafolio (público)
--   review-media/<review_id>/...            fotos de reseñas (público)
--   request-media/<request_id>/...          fotos y video de la solicitud (privado)
--   chat-media/<request_id>/...             fotos, video y notas de voz del chat (privado)
--   verification/<provider_id>/...          INE, selfie, certificaciones (privado)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars',        'avatars',        true,   2097152, array['image/jpeg','image/png','image/webp']),
  ('provider-media', 'provider-media', true,   5242880, array['image/jpeg','image/png','image/webp']),
  ('review-media',   'review-media',   true,   5242880, array['image/jpeg','image/png','image/webp']),
  ('request-media',  'request-media',  false, 31457280, array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime']),
  ('chat-media',     'chat-media',     false, 31457280, array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','audio/mp4','audio/m4a','audio/x-m4a','audio/mpeg','audio/aac']),
  ('verification',   'verification',   false, 10485760, array['image/jpeg','image/png','application/pdf'])
on conflict (id) do nothing;

-- ¿Participo en la solicitud cuya id es la primera carpeta?
create or replace function public.is_request_participant(p_folder text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from service_requests r
    where r.id::text = p_folder and auth.uid() in (r.client_id, r.provider_id));
$$;

-- Públicos: cualquiera lee; cada quien escribe en su carpeta
create policy "leer públicos" on storage.objects for select
  using (bucket_id in ('avatars','provider-media','review-media'));
create policy "subir a mi carpeta (avatar y portafolio)" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars','provider-media') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "borrar de mi carpeta (avatar y portafolio)" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars','provider-media') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "subir fotos de mi reseña" on storage.objects for insert to authenticated
  with check (bucket_id = 'review-media' and exists (
    select 1 from public.reviews v where v.id::text = (storage.foldername(name))[1] and v.reviewer_id = auth.uid()));

-- Solicitud y chat: solo los dos participantes
create policy "participantes leen archivos de la solicitud" on storage.objects for select to authenticated
  using (bucket_id in ('request-media','chat-media') and public.is_request_participant((storage.foldername(name))[1]));
create policy "participantes suben archivos de la solicitud" on storage.objects for insert to authenticated
  with check (bucket_id in ('request-media','chat-media') and public.is_request_participant((storage.foldername(name))[1]));

-- Verificación: solo el dueño (la revisión se hace con service role)
create policy "subo mis documentos" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "veo mis documentos" on storage.objects for select to authenticated
  using (bucket_id = 'verification' and (storage.foldername(name))[1] = auth.uid()::text);
