begin;
alter table public.businesses add column logo_path text not null default ''
check(logo_path='' or (logo_path ~ '^[a-f0-9-]{36}/logo\.webp$' and split_part(logo_path,'/',1)=owner_id::text));
grant update(logo_path) on public.businesses to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('business-images','business-images',true,2097152,array['image/webp']);
create policy owner_images_select on storage.objects for select to authenticated
using(bucket_id='business-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy owner_images_insert on storage.objects for insert to authenticated
with check(bucket_id='business-images' and (storage.foldername(name))[1]=(select auth.uid())::text and name=(select auth.uid())::text||'/logo.webp');
create policy owner_images_update on storage.objects for update to authenticated
using(bucket_id='business-images' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check(bucket_id='business-images' and name=(select auth.uid())::text||'/logo.webp');
create policy owner_images_delete on storage.objects for delete to authenticated
using(bucket_id='business-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
