-- The Starred Bill: members' trips and lists (added 10 Oct 2026).
-- Run once in Supabase: SQL Editor > New query > paste all of this > Run. Safe to run again.
--
-- A trip ('Paris, May 2027') is a member's restaurants with dates, times, the meal and a note for each, and the settings
-- its bill is added up with (meal, wine pairings, currency, how many people). A list ('My top 10 London lunches') is the
-- same without dates, in the member's own order. Only the member can read or change their own rows. Sharing one gives it
-- a random share code: anyone with the link (/trips/?s=<code>) can then read it, through shared_trip() only, never the
-- table itself, and never who made it. Stopping sharing deletes the code, so the old link stops working.

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null default 'trip' check (kind in ('trip', 'list')),
  title text not null check (length(btrim(title)) between 1 and 120),
  starts_on date,
  ends_on date,
  people smallint not null default 2 check (people between 1 and 20),
  meal text not null default 'dinner' check (meal in ('dinner', 'lunch')),
  wine boolean not null default false,
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  note text check (note is null or length(note) <= 2000),
  -- The restaurants in order: [{"r": restaurant id, "day": "2027-05-14", "time": "19:30", "meal": "dinner"|"lunch",
  -- "booked": true, "note": "…"}], every key but r optional. Checked by trip_items_ok() below.
  items jsonb not null default '[]'::jsonb,
  share_code text unique check (share_code is null or share_code ~ '^[A-Za-z0-9]{12}$'),
  shared_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or (ends_on >= starts_on and ends_on - starts_on <= 366))
);
create index if not exists trips_user on public.trips (user_id, updated_at desc);

-- Each item must be an object with a restaurant id and only the keys above, in the shapes above; at most 60 of them.
create or replace function public.trip_items_ok(items jsonb) returns boolean language sql immutable set search_path = '' as $$
  select jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 60 and length(items::text) <= 40000 and not exists (
    select 1 from jsonb_array_elements(items) i
    where jsonb_typeof(i) <> 'object'
       or not (i ? 'r') or jsonb_typeof(i -> 'r') <> 'string'
       or not ((i ->> 'r') ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(i ->> 'r') <= 120)
       or exists (select 1 from jsonb_object_keys(i) k where k not in ('r', 'day', 'time', 'meal', 'booked', 'note'))
       or (i ? 'day' and jsonb_typeof(i -> 'day') <> 'null' and not (jsonb_typeof(i -> 'day') = 'string' and (i ->> 'day') ~ '^\d{4}-\d{2}-\d{2}$'))
       or (i ? 'time' and jsonb_typeof(i -> 'time') <> 'null' and not (jsonb_typeof(i -> 'time') = 'string' and (i ->> 'time') ~ '^([01]\d|2[0-3]):[0-5]\d$'))
       or (i ? 'meal' and jsonb_typeof(i -> 'meal') <> 'null' and coalesce(i ->> 'meal', '') not in ('dinner', 'lunch'))
       or (i ? 'booked' and jsonb_typeof(i -> 'booked') not in ('boolean', 'null'))
       or (i ? 'note' and jsonb_typeof(i -> 'note') <> 'null' and not (jsonb_typeof(i -> 'note') = 'string' and length(i ->> 'note') <= 300))
  );
$$;
alter table public.trips drop constraint if exists trips_items_ok;
alter table public.trips add constraint trips_items_ok check (public.trip_items_ok(items));

alter table public.trips enable row level security;

drop policy if exists "Read own trips" on public.trips;
drop policy if exists "Add own trips" on public.trips;
drop policy if exists "Change own trips" on public.trips;
drop policy if exists "Remove own trips" on public.trips;
create policy "Read own trips" on public.trips for select to authenticated using ((select auth.uid()) = user_id);
create policy "Add own trips" on public.trips for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Change own trips" on public.trips for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Remove own trips" on public.trips for delete to authenticated using ((select auth.uid()) = user_id);

-- Members write everything but the share code, which only share_trip() makes, so it's always random.
revoke all on public.trips from anon, authenticated;
grant select, delete on public.trips to authenticated;
grant insert (user_id, kind, title, starts_on, ends_on, people, meal, wine, currency, note, items),
      update (kind, title, starts_on, ends_on, people, meal, wine, currency, note, items) on public.trips to authenticated;

drop trigger if exists trips_touch on public.trips;
create trigger trips_touch before update on public.trips for each row execute function public.touch_saved();

-- At most 100 trips and lists per member.
create or replace function public.trips_limit() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.trips where user_id = new.user_id) >= 100 then
    raise exception 'You can keep up to 100 trips and lists.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
-- Only the trigger runs it.
revoke execute on function public.trips_limit() from public, anon, authenticated;
drop trigger if exists trips_limit on public.trips;
create trigger trips_limit before insert on public.trips for each row execute function public.trips_limit();

-- Shares one of your own trips: gives it a random 12-letter code (once; sharing again keeps the same link) and returns it.
create or replace function public.share_trip(t uuid) returns text language plpgsql security definer set search_path = '' as $$
declare
  abc constant text := 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  b bytea;
begin
  select share_code into code from public.trips where id = t and user_id = auth.uid();
  if not found then return null; end if;
  if code is not null then return code; end if;
  loop
    b := extensions.gen_random_bytes(12);
    code := '';
    for i in 0..11 loop
      code := code || substr(abc, 1 + get_byte(b, i) % length(abc), 1);
    end loop;
    begin
      update public.trips set share_code = code, shared_at = now() where id = t and user_id = auth.uid();
      return code;
    exception when unique_violation then
      -- vanishingly rare: try another code
    end;
  end loop;
end;
$$;
revoke execute on function public.share_trip(uuid) from public, anon;
grant execute on function public.share_trip(uuid) to authenticated;

-- Stops sharing one of your own trips: the old link stops working at once.
create or replace function public.unshare_trip(t uuid) returns void language sql security definer set search_path = '' as $$
  update public.trips set share_code = null, shared_at = null where id = t and user_id = auth.uid();
$$;
revoke execute on function public.unshare_trip(uuid) from public, anon;
grant execute on function public.unshare_trip(uuid) to authenticated;

-- What a share link shows, to anyone who has it, signed in or not: the trip, never who made it or its id.
create or replace function public.shared_trip(code text)
returns table (kind text, title text, starts_on date, ends_on date, people smallint, meal text, wine boolean, currency text, note text, items jsonb, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select t.kind, t.title, t.starts_on, t.ends_on, t.people, t.meal, t.wine, t.currency, t.note, t.items, t.updated_at
  from public.trips t
  where code ~ '^[A-Za-z0-9]{12}$' and t.share_code = code;
$$;
revoke execute on function public.shared_trip(text) from public;
grant execute on function public.shared_trip(text) to anon, authenticated;
