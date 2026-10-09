-- The Starred Bill: members' reports of a price, closure or new chef (9 Oct 2026, to-do item members-report-price).
-- Run once in Supabase after schema.sql: SQL Editor > New query > paste all of this > Run.
-- Then put the review token in private.review_settings (see the end) and deploy supabase/functions/report-photos.

-- One row per report. A signed-in member can add reports and read their own; nobody else can read them except us
-- (the SQL Editor, or the Supabase connector, which bypass these rules). We set the status once we've checked it.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  restaurant_id text not null check (restaurant_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(restaurant_id) <= 120),
  restaurant_name text check (length(restaurant_name) <= 200),
  kind text not null check (kind in ('price', 'closed', 'chef', 'other')),
  meal text check (meal in ('dinner', 'lunch', 'wine', 'other')),
  menu_name text check (length(menu_name) <= 120),
  price numeric(12, 2) check (price > 0 and price < 10000000),
  currency text check (currency ~ '^[A-Z]{3}$'),
  seen_on date check (seen_on between date '2020-01-01' and current_date + 1),
  chef text check (length(chef) <= 120),
  details text check (length(details) <= 1000),
  link text check (length(link) <= 500 and link ~ '^https?://'),
  -- The photo of the menu or receipt, in the private report-photos bucket at <user id>/<file>. Deleted once checked.
  photo_path text check (length(photo_path) <= 200),
  -- new: waiting to be checked; used: we changed the site with it; confirmed: our page already had it right;
  -- not-used: we couldn't confirm it. "Used" and "confirmed" earn the member the Price checker badge.
  status text not null default 'new' check (status in ('new', 'used', 'confirmed', 'not-used')),
  review_note text check (length(review_note) <= 500),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists reports_user on public.reports (user_id, created_at desc);
create index if not exists reports_status on public.reports (status, created_at);

alter table public.reports enable row level security;
drop policy if exists "Read own reports" on public.reports;
drop policy if exists "Add own reports" on public.reports;
create policy "Read own reports" on public.reports for select to authenticated using ((select auth.uid()) = user_id);
-- A new report is always waiting to be checked, and its photo must be in the member's own folder.
create policy "Add own reports" on public.reports for insert to authenticated with check (
  (select auth.uid()) = user_id and status = 'new' and review_note is null and reviewed_at is null
  and (photo_path is null or photo_path like (select auth.uid())::text || '/%')
);
revoke all on public.reports from anon;
grant select, insert on public.reports to authenticated;

-- At most 10 reports a day per member, which also caps the photos (and so the storage) one person can add.
create or replace function public.reports_daily_cap() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.reports where user_id = new.user_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'too many reports today' using errcode = 'P0001', hint = 'daily-cap';
  end if;
  return new;
end;
$$;
drop trigger if exists reports_cap on public.reports;
create trigger reports_cap before insert on public.reports for each row execute function public.reports_daily_cap();
revoke execute on function public.reports_daily_cap() from public, anon, authenticated;

-- Photos: private, up to 3 MB each (the form shrinks them to about 1600 pixels first), pictures only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Upload own report photos" on storage.objects;
create policy "Upload own report photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'report-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Read own report photos" on storage.objects;
create policy "Read own report photos" on storage.objects for select to authenticated
  using (bucket_id = 'report-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- The review token: lets the report-photos function open photos and delete checked ones, for whoever holds it (the
-- Mac's Keychain, "starredbill-review"). In a schema the website can't reach.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.review_settings (token text not null);

create or replace function public.review_token_ok(t text) returns boolean language sql security definer set search_path = '' as $$
  select exists (select 1 from private.review_settings where token = t and length(t) >= 32);
$$;
revoke execute on function public.review_token_ok(text) from public, anon, authenticated;
grant execute on function public.review_token_ok(text) to service_role;

-- Photos to delete: those of reports we've checked, of reports over 90 days old, and any whose report has gone
-- (a deleted account takes its reports with it). An hour's grace, as the photo goes up just before its report.
create or replace function public.report_photos_to_clean() returns setof text language sql security definer set search_path = '' as $$
  select o.name from storage.objects o
  where o.bucket_id = 'report-photos' and o.created_at < now() - interval '1 hour'
    and not exists (select 1 from public.reports r where r.photo_path = o.name and r.status = 'new' and r.created_at > now() - interval '90 days');
$$;
revoke execute on function public.report_photos_to_clean() from public, anon, authenticated;
grant execute on function public.report_photos_to_clean() to service_role;

-- Once, by hand (never in this file): insert into private.review_settings (token) values ('<the token in the Keychain>');
