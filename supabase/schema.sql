-- The Starred Bill: what each signed-in person saves.
-- Run once in Supabase: SQL Editor > New query > paste all of this > Run.

-- One row per person per restaurant: on their wishlist, been there, or both.
-- restaurant_id is the restaurant's file name on the site, e.g. 'the-ledbury'.
create table if not exists public.saved (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  restaurant_id text not null check (restaurant_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(restaurant_id) <= 120),
  wishlist boolean not null default false,
  visited boolean not null default false,
  visited_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);

-- The dining diary (added 9 Oct 2026): what they paid per person and in which currency, the menu they had, and a
-- private note (on any saved restaurant, e.g. 'ask for the counter seat'). Only the person themselves can read them.
alter table public.saved
  add column if not exists paid numeric(12,2) check (paid is null or (paid >= 0 and paid < 10000000)),
  add column if not exists paid_currency text check (paid_currency is null or paid_currency ~ '^[A-Z]{3}$'),
  add column if not exists menu text check (menu is null or length(menu) <= 200),
  add column if not exists note text check (note is null or length(note) <= 2000);

-- Each person can only see and change their own rows.
alter table public.saved enable row level security;

drop policy if exists "Read own saved" on public.saved;
drop policy if exists "Add own saved" on public.saved;
drop policy if exists "Change own saved" on public.saved;
drop policy if exists "Remove own saved" on public.saved;
create policy "Read own saved" on public.saved for select to authenticated using ((select auth.uid()) = user_id);
create policy "Add own saved" on public.saved for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Change own saved" on public.saved for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Remove own saved" on public.saved for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.saved from anon;
grant select, insert, update, delete on public.saved to authenticated;

-- Keep updated_at current.
create or replace function public.touch_saved() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists saved_touch on public.saved;
create trigger saved_touch before update on public.saved for each row execute function public.touch_saved();

-- One row per person: their home city and the currency and dietary needs every page starts from
-- (added 9 Oct 2026). home_place is a destination's id on the site, e.g. 'london'; home_name its English name.
-- Blank means "not chosen": local prices, no dietary filter, no home city.
create table if not exists public.profile (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  home_place text check (home_place is null or (home_place ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(home_place) <= 80)),
  home_name text check (home_name is null or length(home_name) <= 120),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  diet text check (diet is null or (diet ~ '^[a-z]+(-[a-z]+)*$' and length(diet) <= 30)),
  updated_at timestamptz not null default now()
);

alter table public.profile enable row level security;

drop policy if exists "Read own profile" on public.profile;
drop policy if exists "Add own profile" on public.profile;
drop policy if exists "Change own profile" on public.profile;
drop policy if exists "Remove own profile" on public.profile;
create policy "Read own profile" on public.profile for select to authenticated using ((select auth.uid()) = user_id);
create policy "Add own profile" on public.profile for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Change own profile" on public.profile for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Remove own profile" on public.profile for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.profile from anon;
grant select, insert, update, delete on public.profile to authenticated;

drop trigger if exists profile_touch on public.profile;
create trigger profile_touch before update on public.profile for each row execute function public.touch_saved();

-- Lets a signed-in person delete their own account (their saved rows and profile go with it).
create or replace function public.delete_my_account() returns void language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid();
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
