-- 1) Pin search_path on our trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2) Move pgvector out of the public schema
create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role;
alter extension vector set schema extensions;