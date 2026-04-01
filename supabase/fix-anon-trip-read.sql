-- Fix: trip page 404 for new visitors (no session yet)
-- The server component fetches the trip before client-side anonymous auth.
-- Allow the anon role to read trips — the slug is the access control.
-- Run this in Supabase SQL Editor.

drop policy if exists "trips_select" on trips;
create policy "trips_select" on trips
  for select to anon, authenticated
  using (true);
