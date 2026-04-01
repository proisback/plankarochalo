-- ============================================================
-- Plan Karo Chalo — Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. ENUMS
-- --------------------------------------------------------

create type trip_status as enum (
  'dates_open',
  'destination_open',
  'commitment',
  'ready'
);

create type member_status as enum (
  'invited',
  'responded',
  'confirmed_in',
  'confirmed_out',
  'no_response'
);

-- 2. TABLES
-- --------------------------------------------------------

create table trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  organizer_id uuid not null references auth.users(id),
  status trip_status not null default 'dates_open',
  budget text,  -- free-form, e.g. "₹5,000-10,000 per person"
  trip_days integer not null default 3,
  locked_dates_start date,
  locked_dates_end date,
  locked_destination text,
  voting_deadline text default 'none',  -- '24h', '48h', '72h', 'none'
  created_at timestamptz not null default now()
);

create table members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid references auth.users(id),  -- null for proxy members
  name text not null,
  is_organizer boolean not null default false,
  status member_status not null default 'invited',
  availability_start date,
  availability_end date,
  destination_vote uuid,  -- FK added after destination_options table
  constraint_note text,
  constraint_start date,
  constraint_end date,
  is_proxy boolean not null default false,
  created_at timestamptz not null default now(),
  -- one real member per user per trip (proxy members have null user_id)
  unique(trip_id, user_id)
);

create table destination_options (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  name text not null,
  note text,
  emoji text default '📍',
  added_by uuid not null references members(id) on delete cascade,
  vote_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Add FK for destination_vote now that destination_options exists
alter table members
  add constraint members_destination_vote_fkey
  foreign key (destination_vote) references destination_options(id)
  on delete set null;

-- 3. INDEXES
-- --------------------------------------------------------

create index idx_trips_slug on trips(slug);
create index idx_trips_organizer on trips(organizer_id);
create index idx_members_trip on members(trip_id);
create index idx_members_user on members(user_id);
create index idx_destination_options_trip on destination_options(trip_id);

-- 4. ROW LEVEL SECURITY
-- --------------------------------------------------------

alter table trips enable row level security;
alter table members enable row level security;
alter table destination_options enable row level security;

-- TRIPS policies
-- Any authenticated user can read a trip (the slug is the access control —
-- you only see a trip if someone shared the link with you)
create policy "trips_select" on trips
  for select to authenticated
  using (true);

-- Only non-anonymous users can create trips (organizers)
create policy "trips_insert" on trips
  for insert to authenticated
  with check (
    organizer_id = auth.uid()
    and (auth.jwt() ->> 'is_anonymous')::boolean is not true
  );

-- Only the organizer can update their trip (lock stages, etc.)
create policy "trips_update" on trips
  for update to authenticated
  using (organizer_id = auth.uid())
  with check (organizer_id = auth.uid());

-- Helper: check trip membership without triggering RLS recursion
create or replace function is_member_of_trip(p_trip_id uuid)
returns boolean as $$
  select exists (
    select 1 from members
    where members.trip_id = p_trip_id
    and members.user_id = auth.uid()
  );
$$ language sql security definer;

-- MEMBERS policies
-- Trip members can see all members of their trip
create policy "members_select" on members
  for select to authenticated
  using (
    is_member_of_trip(trip_id)
    or trip_id in (
      select id from trips where organizer_id = auth.uid()
    )
  );

-- Authenticated users can join a trip (create their own member record)
create policy "members_insert_self" on members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and is_proxy = false
  );

-- Organizer can add proxy members to their trips
create policy "members_insert_proxy" on members
  for insert to authenticated
  with check (
    is_proxy = true
    and user_id is null
    and trip_id in (
      select id from trips where organizer_id = auth.uid()
    )
  );

-- Members can update only their own record (availability, vote, commitment)
create policy "members_update_self" on members
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Organizer can update any member in their trip (for proxy data)
create policy "members_update_organizer" on members
  for update to authenticated
  using (
    trip_id in (
      select id from trips where organizer_id = auth.uid()
    )
  );

-- DESTINATION_OPTIONS policies
-- Trip members can see options for their trip
create policy "destination_options_select" on destination_options
  for select to authenticated
  using (
    is_member_of_trip(trip_id)
    or trip_id in (
      select id from trips where organizer_id = auth.uid()
    )
  );

-- Trip members can add destination options
create policy "destination_options_insert" on destination_options
  for insert to authenticated
  with check (
    added_by in (
      select id from members where user_id = auth.uid()
    )
  );

-- Organizer can update destination options (for vote_count via trigger)
create policy "destination_options_update" on destination_options
  for update to authenticated
  using (
    trip_id in (
      select id from trips where organizer_id = auth.uid()
    )
  );

-- Organizer can delete destination options
create policy "destination_options_delete" on destination_options
  for delete to authenticated
  using (
    trip_id in (
      select id from trips where organizer_id = auth.uid()
    )
  );

-- 5. VOTE COUNT TRIGGER
-- Keeps destination_options.vote_count in sync when members change votes
-- --------------------------------------------------------

create or replace function update_vote_counts()
returns trigger as $$
begin
  -- Decrement old vote
  if OLD.destination_vote is not null then
    update destination_options
    set vote_count = greatest(vote_count - 1, 0)
    where id = OLD.destination_vote;
  end if;

  -- Increment new vote
  if NEW.destination_vote is not null then
    update destination_options
    set vote_count = vote_count + 1
    where id = NEW.destination_vote;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_vote_change
  after update of destination_vote on members
  for each row
  when (OLD.destination_vote is distinct from NEW.destination_vote)
  execute function update_vote_counts();

-- 6. REALTIME
-- Enable realtime for all tables so dashboards update live
-- --------------------------------------------------------

alter publication supabase_realtime add table trips;
alter publication supabase_realtime add table members;
alter publication supabase_realtime add table destination_options;
