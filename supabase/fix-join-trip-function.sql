-- Fix: member INSERT blocked by RLS for anonymous users
-- Solution: security definer function bypasses RLS entirely
-- Run this in Supabase SQL Editor

create or replace function join_trip(p_trip_id uuid, p_name text)
returns json as $$
declare
  v_user_id uuid := auth.uid();
  v_result json;
begin
  -- If already a member, return existing record
  select row_to_json(m) into v_result
  from members m
  where m.trip_id = p_trip_id and m.user_id = v_user_id;

  if v_result is not null then
    return v_result;
  end if;

  -- Insert new member and return
  insert into members (trip_id, user_id, name, is_organizer, is_proxy, status)
  values (p_trip_id, v_user_id, p_name, false, false, 'invited')
  returning row_to_json(members) into v_result;

  return v_result;
end;
$$ language plpgsql security definer;
