-- The Starred Bill: members' saved searches (10 Oct 2026, to-do item members-saved-searches).
-- Run once in Supabase after schema.sql: SQL Editor > New query > paste all of this > Run. Safe to run again.
--
-- A member saves what they're waiting for ("two-star restaurants in Tokyo, dinner under ¥40,000", "vegan options in
-- London") from a destination page's filters or from Help me pick, and scripts/saved_searches.py emails them when a
-- restaurant newly matches (a new star, a lower price, a new vegan menu). One row per search, at most 20 a member.
-- `query` is the search itself (README, "Saved searches"); `label` its plain-English name, written by the page;
-- `page` the address that shows it again. `seen` (the restaurants that matched at the last check) and `checked_commit`
-- (the site's commit then) are written only by the sending job, so the next check knows what's new and why.
create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null check (length(label) between 1 and 200),
  query jsonb not null check (jsonb_typeof(query) = 'object' and pg_column_size(query) <= 2000),
  page text not null check (length(page) <= 500 and page ~ '^/'),
  emails boolean not null default true,
  seen text[] check (seen is null or cardinality(seen) <= 5000),
  checked_commit text check (checked_commit is null or checked_commit ~ '^[0-9a-f]{7,40}$'),
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists saved_searches_user on public.saved_searches (user_id, created_at);

alter table public.saved_searches enable row level security;
drop policy if exists "Read own searches" on public.saved_searches;
drop policy if exists "Add own searches" on public.saved_searches;
drop policy if exists "Change own searches" on public.saved_searches;
drop policy if exists "Remove own searches" on public.saved_searches;
create policy "Read own searches" on public.saved_searches for select to authenticated using ((select auth.uid()) = user_id);
create policy "Add own searches" on public.saved_searches for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Change own searches" on public.saved_searches for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Remove own searches" on public.saved_searches for delete to authenticated using ((select auth.uid()) = user_id);

-- Members add searches, turn their emails on or off, and delete them; only the sending job writes seen and checked_*.
revoke all on public.saved_searches from anon, authenticated;
grant select (id, label, query, page, emails, created_at), delete on public.saved_searches to authenticated;
grant insert (label, query, page, emails) on public.saved_searches to authenticated;
grant update (emails) on public.saved_searches to authenticated;

drop trigger if exists saved_searches_touch on public.saved_searches;
create trigger saved_searches_touch before update on public.saved_searches for each row execute function public.touch_saved();

-- At most 20 a member, and every member with a search has an email_alerts row, whose token makes the unsubscribe
-- link in each email work (the row says no to the star emails unless they chose them).
create or replace function public.saved_searches_add() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.saved_searches where user_id = new.user_id) >= 20 then
    raise exception 'You can keep up to 20 saved searches. Delete one on Your account to save another.' using errcode = 'P0001';
  end if;
  insert into public.email_alerts (user_id) values (new.user_id) on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists saved_searches_add on public.saved_searches;
create trigger saved_searches_add before insert on public.saved_searches for each row execute function public.saved_searches_add();
revoke execute on function public.saved_searches_add() from public, anon, authenticated;  -- runs only as the trigger

-- For the sending job only (it signs in with the secret key): every member with a search that sends emails,
-- with those searches.
create or replace function public.search_recipients()
returns table (user_id uuid, email text, token uuid, searches jsonb)
language sql stable security definer set search_path = '' as $$
  select s.user_id, u.email::text, a.token,
         jsonb_agg(jsonb_build_object('id', s.id, 'label', s.label, 'query', s.query, 'page', s.page, 'seen', s.seen,
                                      'checked_commit', s.checked_commit) order by s.created_at)
  from public.saved_searches s
  join auth.users u on u.id = s.user_id
  join public.email_alerts a on a.user_id = s.user_id
  where s.emails and u.email is not null and u.email <> ''
  group by s.user_id, u.email, a.token;
$$;
revoke execute on function public.search_recipients() from public, anon, authenticated;
grant execute on function public.search_recipients() to service_role;

-- The job records each check: [{"id": ..., "seen": [...], "commit": "..."}].
create or replace function public.searches_checked(rows jsonb) returns integer
language sql security definer set search_path = '' as $$
  with done as (
    update public.saved_searches s set
      seen = array(select jsonb_array_elements_text(r -> 'seen')), checked_commit = r ->> 'commit', checked_at = now()
    from jsonb_array_elements(rows) r
    where s.id = (r ->> 'id')::uuid
    returning 1
  )
  select count(*)::int from done;
$$;
revoke execute on function public.searches_checked(jsonb) from public, anon, authenticated;
grant execute on function public.searches_checked(jsonb) to service_role;

-- The unsubscribe link: email_unsubscribe() in schema.sql, as supabase/booking.sql extended it ('booking'), with
-- 'searches' added here (saved-search emails off, the searches kept); 'all' turns those off too. Run after booking.sql,
-- and keep the versions in step: whichever file runs last decides what the link can do.
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
  if n > 0 and what in ('searches', 'all') then
    update public.saved_searches set emails = false where user_id = who;
  end if;
  return case when n = 0 then 'unknown' else 'ok' end;
end;
$$;
revoke execute on function public.email_unsubscribe(uuid, text) from public;
grant execute on function public.email_unsubscribe(uuid, text) to anon, authenticated;
