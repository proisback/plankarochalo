-- Fix: "infinite recursion detected in policy for relation members"
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create a security definer function that bypasses RLS
--    to check trip membership without triggering the SELECT policy
create or replace function is_member_of_trip(p_trip_id uuid)
returns boolean as $$
  select exists (
    select 1 from members
    where members.trip_id = p_trip_id
    and members.user_id = auth.uid()
  );
$$ language sql security definer;

-- 2. Drop the recursive policies
drop policy if exists "members_select" on members;
drop policy if exists "destination_options_select" on destination_options;

-- 3. Recreate with the function (no more recursion)
create policy "members_select" on members
  for select to authenticated
  using (
    is_member_of_trip(trip_id)
    or trip_id in (select id from trips where organizer_id = auth.uid())
  );

create policy "destination_options_select" on destination_options
  for select to authenticated
  using (
    is_member_of_trip(trip_id)
    or trip_id in (select id from trips where organizer_id = auth.uid())
  );
