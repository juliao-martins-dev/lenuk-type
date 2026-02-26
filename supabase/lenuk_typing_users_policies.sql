-- Apply in Supabase SQL Editor for project: aoppxfvdyfmiutopmwua
-- Table: public.lenuk_typing_users
--
-- Why this is needed:
-- - Your app uses Supabase Data API / supabase-js fallback for GET/POST.
-- - Without RLS policies, Dashboard (postgres role) can see rows, but your app cannot.

grant usage on schema public to anon, authenticated;
grant select, insert on table public.lenuk_typing_users to anon, authenticated;

alter table public.lenuk_typing_users enable row level security;

drop policy if exists "public can read typing results" on public.lenuk_typing_users;
drop policy if exists "public can insert typing results" on public.lenuk_typing_users;

create policy "public can read typing results"
on public.lenuk_typing_users
for select
to anon, authenticated
using (true);

create policy "public can insert typing results"
on public.lenuk_typing_users
for insert
to anon, authenticated
with check (true);

-- Optional verification (run after policies)
-- select count(*) from public.lenuk_typing_users;
