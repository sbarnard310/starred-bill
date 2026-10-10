-- The Starred Bill: booking reminders (added 10 Oct 2026).
-- Run once in Supabase: SQL Editor > New query > paste all of this > Run. Safe to run again.
--
-- Members can ask for an email the day before bookings open for a date at a restaurant ("Email me the day before" on
-- restaurant pages), kept here as one row per restaurant and date. They can also ask, under Emails on Your account,
-- for the same reminder for every restaurant on their trips (email_alerts.booking): each trip item with a day, else the
-- trip's first day, unless it's marked booked. scripts/booking_reminders.py works out from the restaurants' booking
-- windows which reminders are due and sends them (.github/workflows/booking-reminders.yml, every morning). Only the
-- member can read or change their own rows; the sending job reads them through booking_reminders_pending().

create table if not exists public.booking_reminders (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  restaurant text not null check (restaurant ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(restaurant) <= 120),
  visit_on date not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  primary key (user_id, restaurant, visit_on)
);

alter table public.booking_reminders enable row level security;

drop policy if exists "Read own reminders" on public.booking_reminders;
drop policy if exists "Add own reminders" on public.booking_reminders;
drop policy if exists "Remove own reminders" on public.booking_reminders;
create policy "Read own reminders" on public.booking_reminders for select to authenticated using ((select auth.uid()) = user_id);
create policy "Add own reminders" on public.booking_reminders for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Remove own reminders" on public.booking_reminders for delete to authenticated using ((select auth.uid()) = user_id);

-- Members add and remove reminders; only the sending job marks them sent.
revoke all on public.booking_reminders from anon, authenticated;
grant select, delete on public.booking_reminders to authenticated;
grant insert (user_id, restaurant, visit_on) on public.booking_reminders to authenticated;

-- At most 100 waiting reminders per member, none for a day that has passed or more than two years ahead, and every
-- member with a reminder gets an email_alerts row, whose token is the unsubscribe link's.
create or replace function public.booking_reminders_check() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.visit_on < current_date or new.visit_on > current_date + 731 then
    raise exception 'Pick a date from today up to two years ahead.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.booking_reminders where user_id = new.user_id and sent_at is null and visit_on >= current_date) >= 100 then
    raise exception 'You can keep up to 100 booking reminders.' using errcode = 'P0001';
  end if;
  insert into public.email_alerts (user_id) values (new.user_id) on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists booking_reminders_check on public.booking_reminders;
create trigger booking_reminders_check before insert on public.booking_reminders for each row execute function public.booking_reminders_check();

-- "Booking reminders for my trips", chosen on Your account.
alter table public.email_alerts add column if not exists booking boolean not null default false;
grant insert (user_id, near_home, countries, booking), update (user_id, near_home, countries, booking) on public.email_alerts to authenticated;

-- Every reminder that could still be due, for the sending job only (it signs in with the secret key): the member's
-- email and unsubscribe token, the restaurant and date, and where it came from ('reminder', or 'trip' with its title).
-- Trips are read only if the trips table exists (supabase/trips.sql).
create or replace function public.booking_reminders_pending()
returns table (user_id uuid, email text, token uuid, restaurant text, visit_on date, source text, trip text)
language plpgsql stable security definer set search_path = '' as $$
begin
  return query
    select b.user_id, u.email::text, a.token, b.restaurant, b.visit_on, 'reminder'::text, null::text
    from public.booking_reminders b
    join auth.users u on u.id = b.user_id
    join public.email_alerts a on a.user_id = b.user_id
    where b.sent_at is null and b.visit_on >= current_date and u.email is not null and u.email <> '';
  if to_regclass('public.trips') is not null then
    return query execute $q$
      select t.user_id, u.email::text, a.token, i ->> 'r', coalesce(nullif(i ->> 'day', '')::date, t.starts_on), 'trip'::text, t.title
      from public.trips t
      cross join lateral jsonb_array_elements(t.items) i
      join auth.users u on u.id = t.user_id
      join public.email_alerts a on a.user_id = t.user_id and a.booking
      where t.kind = 'trip' and coalesce((i ->> 'booked')::boolean, false) = false
        and coalesce(nullif(i ->> 'day', '')::date, t.starts_on) >= current_date
        and u.email is not null and u.email <> ''
    $q$;
  end if;
end;
$$;
revoke execute on function public.booking_reminders_pending() from public, anon, authenticated;
grant execute on function public.booking_reminders_pending() to service_role;

-- The unsubscribe link: 'booking' stops trip reminders and removes waiting ones; 'all' now includes it. The same function
-- is in supabase/saved-searches.sql with its 'searches' part (saved-search emails): keep both parts in both files.
create or replace function public.email_unsubscribe(t uuid, what text default 'all') returns text
language plpgsql security definer set search_path = '' as $$
declare n int; who uuid;
begin
  update public.email_alerts set
    near_home = case when what in ('near', 'all') then false else near_home end,
    countries = case when what in ('countries', 'all') then '{}'::text[] else countries end,
    booking = case when what in ('booking', 'all') then false else booking end
  where token = t
  returning user_id into who;
  get diagnostics n = row_count;
  if n > 0 and what in ('booking', 'all') then
    delete from public.booking_reminders where user_id = who and sent_at is null;
  end if;
  if n > 0 and what in ('searches', 'all') and to_regclass('public.saved_searches') is not null then
    execute 'update public.saved_searches set emails = false where user_id = $1' using who;
  end if;
  return case when n = 0 then 'unknown' else 'ok' end;
end;
$$;
revoke execute on function public.email_unsubscribe(uuid, text) from public;
grant execute on function public.email_unsubscribe(uuid, text) to anon, authenticated;
