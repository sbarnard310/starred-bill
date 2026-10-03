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

-- Lets a signed-in person delete their own account (their saved rows go with it).
create or replace function public.delete_my_account() returns void language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid();
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
