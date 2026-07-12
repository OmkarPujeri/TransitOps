-- TransitOps RBAC — data-layer enforcement of the permission matrix.
--
-- Run this in the Supabase SQL editor AFTER schema.sql. It replaces the
-- permissive "auth_all" policies with role-aware ones:
--   * SELECT stays open to every authenticated user (dashboards/reports never break)
--   * INSERT/UPDATE/DELETE are gated to the roles that own each table
--
-- The matrix (mirrors src/lib/permissions.ts):
--   vehicles     write: fleet_manager
--   drivers      write: fleet_manager, safety_officer
--   trips        write: fleet_manager, driver
--   maintenance  write: fleet_manager
--   fuel_logs    write: fleet_manager, financial_analyst
--   expenses     write: fleet_manager, financial_analyst

-- Helper: the current user's role, read from their profile.
create or replace function public.current_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Rebuild every table's policies: open reads, role-gated writes.
do $$
declare
  rec record;
  writers text[];
begin
  for rec in
    select * from (values
      ('vehicles',         array['fleet_manager']),
      ('drivers',          array['fleet_manager','safety_officer']),
      ('trips',            array['fleet_manager','driver']),
      ('maintenance_logs', array['fleet_manager']),
      ('fuel_logs',        array['fleet_manager','financial_analyst']),
      ('expenses',         array['fleet_manager','financial_analyst'])
    ) as t(tbl, roles)
  loop
    writers := rec.roles;

    -- Drop the permissive policy from schema.sql and any prior run of this file.
    execute format('drop policy if exists "auth_all" on %I', rec.tbl);
    execute format('drop policy if exists "rbac_read" on %I', rec.tbl);
    execute format('drop policy if exists "rbac_write" on %I', rec.tbl);

    -- Reads: any authenticated user.
    execute format(
      'create policy "rbac_read" on %I for select to authenticated using (true)',
      rec.tbl
    );

    -- Writes (insert/update/delete): only roles in the writers list.
    execute format(
      'create policy "rbac_write" on %I for all to authenticated ' ||
      'using (public.current_role() = any (%L::app_role[])) ' ||
      'with check (public.current_role() = any (%L::app_role[]))',
      rec.tbl, writers, writers
    );
  end loop;
end $$;

-- Note: the "for all" write policy also grants select to writers, but the
-- separate "rbac_read" policy already covers select for everyone, so the net
-- SELECT permission is "all authenticated" — exactly what we want.
