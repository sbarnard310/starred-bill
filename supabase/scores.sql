-- The Starred Bill: members' scores (added 13 Oct 2026). Run after schema.sql: SQL Editor > New query > paste > Run.
--
-- A member who has ticked a restaurant as "been there" can give it a score from 1 to 5, kept in their own `saved` row
-- (one row per person per restaurant, so one score each). Only the person can read their row, as before. The site
-- publishes just each restaurant's average and count, once at least five members have scored it, through
-- member_scores(), which only the secret key can call (scripts/member_scores.py, run daily by
-- .github/workflows/member-scores.yml, writes them into content/member-scores.json). Nobody else ever sees who gave which score.

alter table public.saved
  add column if not exists score smallint check (score is null or score between 1 and 5),
  add column if not exists scored_at timestamptz;

-- A score needs "been there": unticking it clears the score (so older copies of the site, which don't send a score,
-- can't leave one behind), and scored_at records when it last changed, for the checks below.
create or replace function public.saved_score() returns trigger language plpgsql set search_path = '' as $$
begin
  if not new.visited then
    new.score := null;
  end if;
  if new.score is null then
    new.scored_at := null;
  elsif tg_op = 'INSERT' or new.score is distinct from old.score then
    new.scored_at := now();
  else
    new.scored_at := old.scored_at;
  end if;
  return new;
end;
$$;
drop trigger if exists saved_score on public.saved;
create trigger saved_score before insert or update on public.saved for each row execute function public.saved_score();

-- Members whose scores we leave out because they look fake (added by hand after member_score_checks() flags them).
-- Row-level security with no policies: only the secret key can read or change it.
create table if not exists public.score_excluded (
  user_id uuid primary key references auth.users (id) on delete cascade,
  reason text check (reason is null or length(reason) <= 300),
  created_at timestamptz not null default now()
);
alter table public.score_excluded enable row level security;
revoke all on public.score_excluded from anon, authenticated;

-- Each restaurant's average and number of scores, only where at least five members have scored it. Left out: members
-- in score_excluded, and accounts less than a day old (a cheap guard against accounts made just to score).
create or replace function public.member_scores(min_count int default 5)
returns table (restaurant_id text, average numeric, scores int)
language sql stable security definer set search_path = '' as $$
  select s.restaurant_id, round(avg(s.score)::numeric, 2), count(*)::int
  from public.saved s
  join auth.users u on u.id = s.user_id
  where s.score is not null and s.visited
    and u.created_at < now() - interval '1 day'
    and not exists (select 1 from public.score_excluded x where x.user_id = s.user_id)
  group by s.restaurant_id
  having count(*) >= greatest(min_count, 5)
  order by 1
$$;
revoke all on function public.member_scores(int) from public, anon, authenticated;
grant execute on function public.member_scores(int) to service_role;

-- The weekly check (the "Member reports" routine): members whose scoring looks unusual, by account only (no names or
-- emails): ten or more scores in a day, or five or more scores all the same. Each is looked at by hand before anyone
-- is added to score_excluded.
create or replace function public.member_score_checks()
returns table (user_id uuid, scores int, in_one_day int, all_same boolean, account_days int, excluded boolean)
language sql stable security definer set search_path = '' as $$
  with mine as (
    select s.user_id, count(*)::int as scores, count(distinct s.score) = 1 as all_same,
           (select max(c)::int from (select count(*) as c from public.saved d where d.user_id = s.user_id and d.scored_at is not null
                                     group by date_trunc('day', d.scored_at)) per_day) as in_one_day
    from public.saved s where s.score is not null group by s.user_id
  )
  select m.user_id, m.scores, m.in_one_day, m.all_same and m.scores >= 5,
         extract(day from now() - u.created_at)::int, exists (select 1 from public.score_excluded x where x.user_id = m.user_id)
  from mine m join auth.users u on u.id = m.user_id
  where m.in_one_day >= 10 or (m.all_same and m.scores >= 5)
  order by m.scores desc
$$;
revoke all on function public.member_score_checks() from public, anon, authenticated;
grant execute on function public.member_score_checks() to service_role;
