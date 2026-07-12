-- TransitOps — Vehicle Document Management (bonus feature).
-- Run in the Supabase SQL editor after schema.sql. Creates a private storage
-- bucket for vehicle files plus a metadata table, both RLS-protected.

-- 1. Metadata table -----------------------------------------------------------
create table if not exists vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  name text not null,
  path text not null,
  size bigint not null default 0,
  mime text,
  uploaded_at timestamptz not null default now()
);

alter table vehicle_documents enable row level security;

drop policy if exists "vehicle_documents_read" on vehicle_documents;
create policy "vehicle_documents_read" on vehicle_documents
  for select to authenticated using (true);

-- Only fleet managers may add/remove document records (mirrors vehicles write access).
drop policy if exists "vehicle_documents_write" on vehicle_documents;
create policy "vehicle_documents_write" on vehicle_documents
  for all to authenticated
  using (public.current_role() = 'fleet_manager')
  with check (public.current_role() = 'fleet_manager');

-- 2. Private storage bucket ----------------------------------------------------
insert into storage.buckets (id, name, public)
values ('vehicle-docs', 'vehicle-docs', false)
on conflict (id) do nothing;

-- 3. Storage object policies ---------------------------------------------------
-- Any authenticated user may read (files are served via short-lived signed URLs).
drop policy if exists "vehicle_docs_read" on storage.objects;
create policy "vehicle_docs_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'vehicle-docs');

-- Fleet managers may upload / delete.
drop policy if exists "vehicle_docs_write" on storage.objects;
create policy "vehicle_docs_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'vehicle-docs' and public.current_role() = 'fleet_manager')
  with check (bucket_id = 'vehicle-docs' and public.current_role() = 'fleet_manager');

-- Note: public.current_role() is defined in rbac.sql — run that first.
