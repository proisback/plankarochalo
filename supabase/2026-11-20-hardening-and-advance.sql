-- =====================================================================
-- Plan Karo Chalo: security hardening and automatic stage advance
-- File: supabase/2026-11-20-hardening-and-advance.sql
-- Tested by: npm run test:db   (supabase/tests/run.mjs)
-- =====================================================================
--
-- WHAT THIS FILE DOES (plain language)
--
-- A security review of the database found ways for a stranger, or for a
-- member of one trip, to change things they should not be able to
-- change. This file closes them. It also adds the database half of the
-- new "the trip moves on by itself once everyone has answered" feature.
-- The numbers below match the numbers in the review.
--
-- Part A (this is what runs when you run the file):
--    1. Joining a trip now needs a signed-in visitor. The silent,
--       no-account sign-in the app already does counts. Before this,
--       anyone holding the public key could add any number of fake
--       members to any trip. Names are trimmed and cut at 50 characters.
--    2. Only the organiser can add member rows directly (their own row
--       and the people they answer for). Everyone else joins through
--       the join function.
--    3. A member can no longer make themselves the organiser, move their
--       row to another trip, or hand their row to another user. The
--       organiser can still take over a member and answer for them.
--       Nobody can vote for a place that belongs to a different trip.
--    4. A place can only be added by a member of that same trip. It
--       starts with zero votes and a tidied name. The same place cannot
--       be added twice to one trip.
--    5. Vote counts now stay right when a member is added with a vote
--       or removed. Existing wrong counts are recalculated once.
--    6. A trip can only move one stage at a time, forward or back.
--    7. New setting on a trip: how many people the organiser expects.
--    8. New function advance_trip: moves a trip to the next stage once
--       the whole expected group has answered.
--    9. New function trip_preview: who is asking and who is already in,
--       for the join screen.
--   10. New function get_trip_by_slug: opens one trip from its link.
--   12. Two older functions get a fixed search path (a standard safety
--       setting for functions that run with extra rights).
--   13. The organiser can remove a member from their own trip, but not
--       themselves. Be aware: because of how the tables were first set
--       up (schema.sql), removing a member also removes the places that
--       member added and clears the votes for those places.
--
-- Part B (switched off until you run it by hand, see below):
--   11. Today anyone holding the public key can list every trip and its
--       link, and a link is an invite. Part B stops that: only the
--       organiser and the members of a trip can read it. Everyone else
--       opens a trip through get_trip_by_slug, which needs the link.
--
-- IS IT SAFE TO RUN PART A WHILE THE CURRENT APP IS LIVE?
--
-- Yes. Part A keeps every call the current app makes working. People
-- using the current app can notice two small things. Adding a place
-- that is already on the trip's list (same name, ignoring capitals and
-- spaces at the ends) is now refused. And over-long text is cut: 50
-- characters for a person's name, 60 for a place, 140 for a place's
-- note. Part A is one transaction, so if any line fails, nothing at all
-- is changed. The whole file is safe to run more than once.
--
-- Part B is NOT safe with the current app. The current app reads trips
-- in a way Part B switches off, so every shared link would show "not
-- found" to people who have not joined yet. That is why Part B is
-- wrapped in a comment and does nothing until you run it yourself.
--
-- ORDER OF OPERATIONS
--
--   1. Optional: run the "look first" queries below.
--   2. Run this file as it is: Supabase dashboard, SQL Editor, paste the
--      whole file, Run. The editor may ask you to confirm because it
--      sees "drop policy" and "drop trigger" lines. Each of those is
--      re-created on the next line. Only Part A runs.
--   3. Deploy the new app.
--   4. Check: open a trip link in a private (incognito) window, type a
--      name and join.
--   5. Run Part B: copy the lines between "BEGIN PART B" and
--      "END PART B" near the end of this file, leave out the two lines
--      that are only /* and */, paste them into the SQL Editor, Run.
--   6. Repeat step 4 in a fresh private window. This is the check that
--      matters: it only passes if the new app opens trips through
--      get_trip_by_slug. If the link shows "not found", run ROLLBACK B
--      (the same way as Part B) and the links work again at once.
--
-- LOOK FIRST (read-only, these change nothing)
--
-- Blocks between /* and */ are switched off. To run one, copy the lines
-- between /* and */ into a new query.
--
-- Ghost members: rows that are neither a signed-in person nor someone
-- the organiser answers for. Through the app's API they can only have
-- come from the open join function (item 1). This file does not delete
-- them. They also hold up the automatic advance, because they count as
-- real members who never answer. The organiser can take them over or
-- remove them, or you can delete them by hand once you are sure they
-- are not real people.
--
-- >>> BEGIN CHECK GHOST MEMBERS
/*
select t.name as trip, m.id as member_id, m.name, m.status, m.created_at
from public.members m
join public.trips t on t.id = m.trip_id
where m.user_id is null and not m.is_proxy
order by t.name, m.created_at;
*/
-- <<< END CHECK GHOST MEMBERS
--
-- Places whose stored vote count differs from the real number of votes.
-- Part A corrects these.
--
-- >>> BEGIN CHECK VOTE COUNTS
/*
select t.name as trip, o.id as option_id, o.name as place,
       o.vote_count as stored_count, count(m.id) as real_count
from public.destination_options o
join public.trips t on t.id = o.trip_id
left join public.members m on m.destination_vote = o.id and m.trip_id = o.trip_id
group by t.name, o.id, o.name, o.vote_count
having o.vote_count <> count(m.id)
order by t.name, o.name;
*/
-- <<< END CHECK VOTE COUNTS
--
-- Trips that already have the same place twice. If this returns rows,
-- Part A still runs, but it leaves the "no duplicate places" rule off
-- (the SQL Editor may not show the notice it raises). Delete the extra
-- copies and run the file again to switch the rule on. No rows here
-- means the rule goes on the first time.
--
-- >>> BEGIN CHECK DUPLICATE PLACES
/*
select t.name as trip, lower(btrim(o.name)) as place, count(*) as copies
from public.destination_options o
join public.trips t on t.id = o.trip_id
group by t.id, t.name, lower(btrim(o.name))
having count(*) > 1
order by t.name, place;
*/
-- <<< END CHECK DUPLICATE PLACES
--
-- WHAT PART A CHANGES IN EXISTING DATA
--
-- Only votes. A vote that points at a place in a different trip is
-- cleared, and every place's vote count is recalculated from the real
-- votes. No row is deleted.
--
-- HOW TO ROLL BACK
--
-- Roll back Part B before Part A, never the other way round.
--   Part B: run the ROLLBACK B block at the end of this file. Trips are
--           readable the old way again immediately.
--   Part A: run the ROLLBACK A block at the end of this file. It puts
--           back the old join function, the old rules and the old vote
--           counter, and removes the new functions. That reopens the
--           holes listed above, and the new app needs the new functions,
--           so put the old app back first. The group size column and
--           the corrected vote counts are left in place: the old app
--           ignores the first and the second is simply correct.
--
-- =====================================================================
-- PART A: safe with the app that is live today
-- =====================================================================

begin;

-- Give up after 10 seconds instead of queueing behind a long-running
-- query and holding up the app. If that happens, run the file again.
set local lock_timeout = '10s';

-- ---------------------------------------------------------------------
-- A1. Group size (review item 7)
-- ---------------------------------------------------------------------

alter table public.trips add column if not exists expected_size integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'trips_expected_size_check'
      and conrelid = 'public.trips'::regclass
  ) then
    alter table public.trips
      add constraint trips_expected_size_check
      check (expected_size is null or expected_size between 2 and 50);
  end if;
end
$$;

-- ---------------------------------------------------------------------
-- A2. Existing helper: pin its search path (review item 12)
-- ---------------------------------------------------------------------

-- is_member_of_trip: true when the signed-in caller has a member row in the trip (the row security rules call it).
alter function public.is_member_of_trip(uuid) set search_path = public;

-- ---------------------------------------------------------------------
-- A3. Member rows: what may change (review item 3)
-- ---------------------------------------------------------------------

-- pkc_members_guard: stops app callers from moving a member row to another trip, changing who is the organiser, handing a row to another user, or voting for another trip's place.
create or replace function public.pkc_members_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_organizer uuid;
  v_check_vote boolean := new.destination_vote is not null;
begin
  -- auth.uid() is null in the SQL Editor and for the service key: those are trusted.
  if tg_op = 'UPDATE' and v_uid is not null then
    if new.trip_id is distinct from old.trip_id then
      raise exception 'A member cannot be moved to another trip' using errcode = '42501';
    end if;
    if new.is_organizer is distinct from old.is_organizer then
      raise exception 'The organiser of a trip cannot be changed here' using errcode = '42501';
    end if;
    if new.user_id is distinct from old.user_id or new.is_proxy is distinct from old.is_proxy then
      -- The one allowed move: the organiser takes over someone else's row,
      -- which turns it into a proxy with no user behind it.
      select t.organizer_id into v_organizer from public.trips t where t.id = old.trip_id;
      if v_organizer is distinct from v_uid
         or old.user_id is not distinct from v_uid
         or old.is_proxy
         or not new.is_proxy
         or new.user_id is not null then
        raise exception 'Only the organiser can take over a member, and only by answering for them' using errcode = '42501';
      end if;
    end if;
  end if;

  -- For every caller: a vote must be for a place in the member's own trip.
  if v_check_vote and tg_op = 'UPDATE' then
    v_check_vote := new.destination_vote is distinct from old.destination_vote
                    or new.trip_id is distinct from old.trip_id;
  end if;
  if v_check_vote and not exists (
    select 1 from public.destination_options o
    where o.id = new.destination_vote and o.trip_id = new.trip_id
  ) then
    raise exception 'That place is not on this trip''s list' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists pkc_members_guard on public.members;
create trigger pkc_members_guard
  before insert or update on public.members
  for each row execute function public.pkc_members_guard();

-- ---------------------------------------------------------------------
-- A4. Vote counts: cover insert and delete too (review items 5 and 12)
-- ---------------------------------------------------------------------

-- update_vote_counts: keeps each place's vote_count equal to the number of members voting for it.
create or replace function public.update_vote_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old uuid;
  v_new uuid;
  v_option uuid;
  v_delta integer;
begin
  if tg_op <> 'INSERT' then v_old := old.destination_vote; end if;
  if tg_op <> 'DELETE' then v_new := new.destination_vote; end if;
  if v_old is not distinct from v_new then
    return null;
  end if;

  -- Lowest id first, so two people swapping votes at the same moment cannot deadlock.
  for v_option, v_delta in
    select x.id, x.delta
    from (values (v_old, -1), (v_new, 1)) as x(id, delta)
    where x.id is not null
    order by x.id
  loop
    update public.destination_options
       set vote_count = greatest(vote_count + v_delta, 0)
     where id = v_option;
  end loop;
  return null;
end;
$$;

drop trigger if exists on_vote_change on public.members;
create trigger on_vote_change
  after insert or delete or update of destination_vote on public.members
  for each row execute function public.update_vote_counts();

-- ---------------------------------------------------------------------
-- A5. New places: tidy and start at zero votes (review item 4)
-- ---------------------------------------------------------------------

-- pkc_destination_options_clean: tidies a new place before it is saved (zero votes, trimmed name and note, default pin).
create or replace function public.pkc_destination_options_clean()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.vote_count := 0;

  new.name := rtrim(left(regexp_replace(coalesce(new.name, ''), '^\s+|\s+$', '', 'g'), 60));
  if new.name = '' then
    raise exception 'A place needs a name' using errcode = '22023';
  end if;

  new.note := nullif(rtrim(left(regexp_replace(coalesce(new.note, ''), '^\s+|\s+$', '', 'g'), 140)), '');

  if new.emoji is null or btrim(new.emoji) = '' then
    new.emoji := U&'\+01F4CD';
  end if;

  return new;
end;
$$;

drop trigger if exists pkc_destination_options_clean on public.destination_options;
create trigger pkc_destination_options_clean
  before insert on public.destination_options
  for each row execute function public.pkc_destination_options_clean();

-- ---------------------------------------------------------------------
-- A6. Stage changes: one step at a time (review item 6)
-- ---------------------------------------------------------------------

-- pkc_trips_status_guard: lets app callers move a trip only to the stage next to the current one, forward or back.
create or replace function public.pkc_trips_status_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  c_stages constant public.trip_status[] :=
    array['dates_open', 'destination_open', 'commitment', 'ready']::public.trip_status[];
begin
  if auth.uid() is not null
     and new.status is distinct from old.status
     and abs(array_position(c_stages, new.status) - array_position(c_stages, old.status)) <> 1 then
    raise exception 'A trip moves one stage at a time (% to % is not allowed)', old.status, new.status
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists pkc_trips_status_guard on public.trips;
create trigger pkc_trips_status_guard
  before update of status on public.trips
  for each row execute function public.pkc_trips_status_guard();

-- ---------------------------------------------------------------------
-- A7. One-time repair of existing votes (review item 5)
-- ---------------------------------------------------------------------

-- Clear votes that point at a place in a different trip.
update public.members m
   set destination_vote = null
  from public.destination_options o
 where o.id = m.destination_vote
   and o.trip_id <> m.trip_id;

-- Recalculate every vote count from the real votes.
update public.destination_options o
   set vote_count = c.real_count
  from (
    select o2.id, count(m.id)::integer as real_count
    from public.destination_options o2
    left join public.members m on m.destination_vote = o2.id
    group by o2.id
  ) c
 where c.id = o.id
   and o.vote_count is distinct from c.real_count;

-- ---------------------------------------------------------------------
-- A8. No duplicate places within a trip (review item 4)
-- ---------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from public.destination_options
    group by trip_id, lower(btrim(name))
    having count(*) > 1
  ) then
    raise notice 'Skipped the no-duplicate-places rule: at least one trip already has the same place twice. Remove the duplicates and run this file again.';
  else
    create unique index if not exists destination_options_trip_name_key
      on public.destination_options (trip_id, lower(btrim(name)));
  end if;
end
$$;

-- ---------------------------------------------------------------------
-- A9. Row security rules (review items 2, 4 and 13)
-- ---------------------------------------------------------------------

-- Item 2: only the trip's organiser may insert their own member row directly.
-- Everyone else joins through join_trip().
drop policy if exists "members_insert_self" on public.members;
create policy "members_insert_self" on public.members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and is_proxy = false
    and trip_id in (select t.id from public.trips t where t.organizer_id = auth.uid())
  );

-- Item 4: a place must be added by the caller's own member row in that same trip.
drop policy if exists "destination_options_insert" on public.destination_options;
create policy "destination_options_insert" on public.destination_options
  for insert to authenticated
  with check (
    exists (
      select 1 from public.members m
      where m.id = destination_options.added_by
        and m.trip_id = destination_options.trip_id
        and m.user_id = auth.uid()
    )
  );

-- Item 13: the organiser may remove members of their own trip, but not their own row.
drop policy if exists "members_delete_organizer" on public.members;
create policy "members_delete_organizer" on public.members
  for delete to authenticated
  using (
    trip_id in (select t.id from public.trips t where t.organizer_id = auth.uid())
    and user_id is distinct from auth.uid()
  );

-- Supabase grants this by default. Stated here so item 13 does not depend on it.
grant delete on public.members to authenticated;

-- ---------------------------------------------------------------------
-- A10. Joining a trip (review item 1)
-- ---------------------------------------------------------------------

-- join_trip: adds the signed-in caller to a trip under the name they typed, or returns the row they already have.
create or replace function public.join_trip(p_trip_id uuid, p_name text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := rtrim(left(regexp_replace(coalesce(p_name, ''), '^\s+|\s+$', '', 'g'), 50));
  v_organizer uuid;
  v_result json;
begin
  if v_uid is null then
    raise exception 'Not authenticated: sign in before joining a trip' using errcode = '28000';
  end if;
  if v_name = '' then
    raise exception 'A name is needed to join a trip' using errcode = '22023';
  end if;

  select t.organizer_id into v_organizer from public.trips t where t.id = p_trip_id;
  if not found then
    raise exception 'This trip does not exist' using errcode = '22023';
  end if;

  -- Two taps at the same moment: the second insert does nothing and both get the same row.
  insert into public.members (trip_id, user_id, name, is_organizer, is_proxy, status)
  values (p_trip_id, v_uid, v_name, v_organizer = v_uid, false, 'invited')
  on conflict (trip_id, user_id) do nothing;

  select row_to_json(m) into v_result
  from public.members m
  where m.trip_id = p_trip_id and m.user_id = v_uid;

  return v_result;
end;
$$;

revoke all on function public.join_trip(uuid, text) from public, anon;
grant execute on function public.join_trip(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- A11. Automatic stage advance (review item 8)
-- ---------------------------------------------------------------------

-- pkc_day: turns a "YYYY-MM-DD" text into a date, or null when it is not a real calendar day.
create or replace function public.pkc_day(p_text text)
returns date
language plpgsql
stable
set search_path = public
as $$
begin
  if p_text is null or p_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    return null;
  end if;
  return p_text::date;
exception when others then
  return null;
end;
$$;

-- pkc_member_days: the days one member is free, read the same way as memberDays() in src/lib/dates.ts.
create or replace function public.pkc_member_days(m public.members)
returns setof date
language plpgsql
stable
set search_path = public
as $$
declare
  c_day_key constant text := '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';
  v_note jsonb;
begin
  -- No availability range means "has not answered", whatever the note says.
  if m.availability_start is null or m.availability_end is null then
    return;
  end if;

  -- The note is either JSON written by the app or free text typed by a person.
  -- Free text is not a date list and contributes nothing.
  if m.constraint_note is not null and m.constraint_note <> '' then
    begin
      v_note := m.constraint_note::jsonb;
    exception when others then
      v_note := null;
    end;
  end if;
  if v_note is null or jsonb_typeof(v_note) <> 'array' then
    v_note := '[]'::jsonb;
  end if;

  -- Current format: an explicit list of free days.
  if jsonb_array_length(v_note) > 0 and not exists (
    select 1 from jsonb_array_elements(v_note) as e(item)
    where jsonb_typeof(e.item) <> 'string' or (e.item #>> '{}') !~ c_day_key
  ) then
    return query
      select distinct public.pkc_day(e.item #>> '{}')
      from jsonb_array_elements(v_note) as e(item)
      where public.pkc_day(e.item #>> '{}') is not null;
    return;
  end if;

  -- Older format: the availability range minus blocked ranges. Blocked
  -- ranges come from the note if it lists any, otherwise from the
  -- constraint_start and constraint_end columns. Days are compared as
  -- "YYYY-MM-DD" text, exactly as the app does.
  return query
    with blocked_in_note as (
      select e.item ->> 'start' as range_start, e.item ->> 'end' as range_end
      from jsonb_array_elements(v_note) as e(item)
      where jsonb_typeof(e.item) = 'object'
        and jsonb_typeof(e.item -> 'start') = 'string' and (e.item ->> 'start') ~ c_day_key
        and jsonb_typeof(e.item -> 'end') = 'string' and (e.item ->> 'end') ~ c_day_key
    ),
    blocked as (
      select b.range_start, b.range_end from blocked_in_note b
      union all
      select to_char(m.constraint_start, 'YYYY-MM-DD'), to_char(m.constraint_end, 'YYYY-MM-DD')
      where m.constraint_start is not null
        and m.constraint_end is not null
        and not exists (select 1 from blocked_in_note)
    )
    select d.day
    from (
      select m.availability_start + i as day
      from generate_series(0, least(m.availability_end - m.availability_start, 3659)) as i
    ) d
    where not exists (
      select 1 from blocked b
      where to_char(d.day, 'YYYY-MM-DD') >= b.range_start collate "C"
        and to_char(d.day, 'YYYY-MM-DD') <= b.range_end collate "C"
    );
end;
$$;

-- advance_trip: moves a trip to its next stage once the whole expected group has joined and every real member has answered the current stage.
create or replace function public.advance_trip(p_trip_id uuid)
returns public.trips
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_trip public.trips;
  v_total integer;
  v_real integer;
  v_waiting integer;
  v_start date;
  v_destination text;
begin
  if v_uid is null then
    raise exception 'Not authenticated: sign in before using this trip' using errcode = '28000';
  end if;

  -- Same answer for "no such trip" and "not your trip".
  if not exists (
    select 1 from public.trips t
    where t.id = p_trip_id
      and (t.organizer_id = v_uid
           or exists (select 1 from public.members m where m.trip_id = t.id and m.user_id = v_uid))
  ) then
    raise exception 'Only people on this trip can move it forward' using errcode = '42501';
  end if;

  select * into v_trip from public.trips where id = p_trip_id for update;

  select count(*),
         count(*) filter (where not m.is_proxy),
         count(*) filter (where not m.is_proxy and not (
           case v_trip.status
             when 'dates_open' then m.availability_start is not null
             when 'destination_open' then m.destination_vote is not null
             when 'commitment' then m.status in ('confirmed_in', 'confirmed_out')
             else true
           end))
    into v_total, v_real, v_waiting
  from public.members m
  where m.trip_id = p_trip_id;

  -- Nothing locks by itself unless the organiser said how big the group is,
  -- that many people (proxies included) have joined, and every real member
  -- has answered. Proxies never hold a stage up: the organiser answers for them.
  if v_trip.expected_size is null
     or v_total < v_trip.expected_size
     or v_real = 0
     or v_waiting > 0 then
    return v_trip;
  end if;

  if v_trip.status = 'dates_open' then
    -- Same ranking as findBestOverlap() in src/lib/overlap.ts. Change one, change both.
    -- A window is scored by how many members are free on every one of its days,
    -- then by person-days covered, then the earliest start. It needs two people.
    if v_trip.trip_days < 1 then
      return v_trip;
    end if;

    with days as (
      select m.id as member_id, d.day
      from public.members m
      cross join lateral public.pkc_member_days(m) as d(day)
      where m.trip_id = p_trip_id
    ),
    -- A free day counts toward every window that contains it: the one starting
    -- that day and the ones starting up to trip_days - 1 days earlier. A window
    -- two people can do in full always starts on a day they are free, so this
    -- covers every start the app considers.
    per_member as (
      select d.day - k.back as start_day, d.member_id, count(*) as covered
      from days d
      cross join generate_series(0, v_trip.trip_days - 1) as k(back)
      group by 1, 2
    ),
    scored as (
      select p.start_day,
             count(*) filter (where p.covered = v_trip.trip_days) as full_count,
             sum(p.covered) as total
      from per_member p
      group by p.start_day
    )
    select s.start_day into v_start
    from scored s
    where s.full_count >= 2
    order by s.full_count desc, s.total desc, s.start_day asc
    limit 1;

    if v_start is null then
      return v_trip;
    end if;

    update public.trips
       set status = 'destination_open',
           locked_dates_start = v_start,
           locked_dates_end = v_start + (v_trip.trip_days - 1)
     where id = p_trip_id
    returning * into v_trip;

  elsif v_trip.status = 'destination_open' then
    -- Counted from the votes themselves, not from the stored vote_count. A tie locks nothing.
    with tally as (
      select coalesce(nullif(btrim(o.emoji), ''), U&'\+01F4CD') || ' ' || o.name as label,
             count(m.id) as votes
      from public.destination_options o
      left join public.members m on m.destination_vote = o.id and m.trip_id = o.trip_id
      where o.trip_id = p_trip_id
      group by o.id, o.emoji, o.name
    ),
    leaders as (
      select t.label from tally t
      where t.votes > 0 and t.votes = (select max(t2.votes) from tally t2)
    )
    select l.label into v_destination
    from leaders l
    where (select count(*) from leaders) = 1;

    if v_destination is null then
      return v_trip;
    end if;

    update public.trips
       set status = 'commitment',
           locked_destination = v_destination
     where id = p_trip_id
    returning * into v_trip;

  elsif v_trip.status = 'commitment' then
    if not exists (
      select 1 from public.members m
      where m.trip_id = p_trip_id and m.status = 'confirmed_in'
    ) then
      return v_trip;
    end if;

    update public.trips
       set status = 'ready'
     where id = p_trip_id
    returning * into v_trip;
  end if;

  return v_trip;
end;
$$;

revoke all on function public.advance_trip(uuid) from public, anon;
grant execute on function public.advance_trip(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- A12. Reading a trip from its link (review items 9 and 10)
-- ---------------------------------------------------------------------

-- trip_preview: who is organising a trip and who is already in, for the join screen shown to people who are not members yet.
create or replace function public.trip_preview(p_slug text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'organizer_name', (
      select m.name
      from public.members m
      where m.trip_id = t.id and (m.user_id = t.organizer_id or m.is_organizer)
      order by (m.user_id = t.organizer_id) desc nulls last, m.created_at, m.id
      limit 1
    ),
    'member_count', (select count(*)::integer from public.members m where m.trip_id = t.id),
    'names', coalesce((
      select json_agg(f.first_name order by f.created_at, f.id)
      from (
        select substring(m.name from '\S+') as first_name, m.created_at, m.id
        from public.members m
        where m.trip_id = t.id and m.name ~ '\S'
        order by m.created_at, m.id
        limit 8
      ) f
    ), '[]'::json)
  )
  from public.trips t
  where t.slug = p_slug;
$$;

revoke all on function public.trip_preview(text) from public;
grant execute on function public.trip_preview(text) to anon, authenticated;

-- get_trip_by_slug: returns the one trip a shared link points at, so the app never has to list trips.
create or replace function public.get_trip_by_slug(p_slug text)
returns setof public.trips
language sql
stable
security definer
set search_path = public
as $$
  select t.* from public.trips t where t.slug = p_slug;
$$;

revoke all on function public.get_trip_by_slug(text) from public;
grant execute on function public.get_trip_by_slug(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- A13. Internal functions are not part of the public API
-- ---------------------------------------------------------------------

-- Triggers still fire for everyone: Postgres does not check this right
-- when a trigger runs. advance_trip runs as its owner, so it can still
-- call the two pkc_ day helpers.
revoke all on function public.pkc_members_guard() from public, anon, authenticated;
revoke all on function public.update_vote_counts() from public, anon, authenticated;
revoke all on function public.pkc_destination_options_clean() from public, anon, authenticated;
revoke all on function public.pkc_trips_status_guard() from public, anon, authenticated;
revoke all on function public.pkc_day(text) from public, anon, authenticated;
revoke all on function public.pkc_member_days(public.members) from public, anon, authenticated;

commit;

-- Tell the API layer about the new functions and the new column.
notify pgrst, 'reload schema';

-- =====================================================================
-- END OF PART A. Nothing below runs unless you copy it out and run it.
-- =====================================================================


-- =====================================================================
-- PART B: run only after the new client is deployed
-- =====================================================================
--
-- Review item 11. Stops anyone holding the public key from listing every
-- trip and its link. After this, only the organiser and the members of a
-- trip can read its row. A visitor who is not a member yet opens the trip
-- through get_trip_by_slug(), which needs the link.
--
-- Do not run this while the old app is live: its trip page would show
-- "not found" for every shared link.
--
-- >>> BEGIN PART B
/*
begin;

set local lock_timeout = '10s';

drop policy if exists "trips_select" on public.trips;
create policy "trips_select" on public.trips
  for select to authenticated
  using (organizer_id = auth.uid() or public.is_member_of_trip(id));

commit;

notify pgrst, 'reload schema';
*/
-- <<< END PART B


-- =====================================================================
-- ROLLBACK B: makes trips readable the old way again
-- =====================================================================
--
-- >>> BEGIN ROLLBACK B
/*
begin;

drop policy if exists "trips_select" on public.trips;
create policy "trips_select" on public.trips
  for select to anon, authenticated
  using (true);

commit;

notify pgrst, 'reload schema';
*/
-- <<< END ROLLBACK B


-- =====================================================================
-- ROLLBACK A: puts the database back to how it was before Part A
-- =====================================================================
--
-- Run ROLLBACK B first if Part B was run. This reopens the holes Part A
-- closed and removes functions the new app calls, so put the old app
-- back before running it. The expected_size column and the corrected
-- vote counts stay.
--
-- >>> BEGIN ROLLBACK A
/*
begin;

set local lock_timeout = '10s';

drop trigger if exists pkc_members_guard on public.members;
drop trigger if exists pkc_destination_options_clean on public.destination_options;
drop trigger if exists pkc_trips_status_guard on public.trips;
drop trigger if exists on_vote_change on public.members;

-- update_vote_counts: the original vote counter from schema.sql.
create or replace function public.update_vote_counts()
returns trigger as $fn$
begin
  if OLD.destination_vote is not null then
    update destination_options
    set vote_count = greatest(vote_count - 1, 0)
    where id = OLD.destination_vote;
  end if;
  if NEW.destination_vote is not null then
    update destination_options
    set vote_count = vote_count + 1
    where id = NEW.destination_vote;
  end if;
  return NEW;
end;
$fn$ language plpgsql security definer;

create trigger on_vote_change
  after update of destination_vote on public.members
  for each row
  when (OLD.destination_vote is distinct from NEW.destination_vote)
  execute function public.update_vote_counts();

grant execute on function public.update_vote_counts() to public;

drop policy if exists "members_delete_organizer" on public.members;

drop policy if exists "members_insert_self" on public.members;
create policy "members_insert_self" on public.members
  for insert to authenticated
  with check (user_id = auth.uid() and is_proxy = false);

drop policy if exists "destination_options_insert" on public.destination_options;
create policy "destination_options_insert" on public.destination_options
  for insert to authenticated
  with check (added_by in (select id from public.members where user_id = auth.uid()));

-- join_trip: the original join function from fix-join-trip-function.sql.
create or replace function public.join_trip(p_trip_id uuid, p_name text)
returns json as $fn$
declare
  v_user_id uuid := auth.uid();
  v_result json;
begin
  select row_to_json(m) into v_result
  from members m
  where m.trip_id = p_trip_id and m.user_id = v_user_id;

  if v_result is not null then
    return v_result;
  end if;

  insert into members (trip_id, user_id, name, is_organizer, is_proxy, status)
  values (p_trip_id, v_user_id, p_name, false, false, 'invited')
  returning row_to_json(members) into v_result;

  return v_result;
end;
$fn$ language plpgsql security definer;

grant execute on function public.join_trip(uuid, text) to public, anon, authenticated;

drop function if exists public.advance_trip(uuid);
drop function if exists public.trip_preview(text);
drop function if exists public.get_trip_by_slug(text);
drop function if exists public.pkc_members_guard();
drop function if exists public.pkc_destination_options_clean();
drop function if exists public.pkc_trips_status_guard();
drop function if exists public.pkc_member_days(public.members);
drop function if exists public.pkc_day(text);

drop index if exists public.destination_options_trip_name_key;

alter function public.is_member_of_trip(uuid) reset search_path;

commit;

notify pgrst, 'reload schema';
*/
-- <<< END ROLLBACK A
