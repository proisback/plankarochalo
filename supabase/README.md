# Supabase SQL

These files are run by hand in the Supabase dashboard (SQL Editor). They are listed in the order they were applied. Files 1 to 4 are already on the live database. File 5: Part A and Part B were both run on the live database on 20 November 2026. If a shared link ever shows "not found" for a real trip, run ROLLBACK B from the end of the file.

The "no duplicate places" rule from Part A is on. It was switched on after deleting the second of two "Wayanad" entries (0 votes) on one trip, the only duplicate the database had.

| # | File | What it does |
|---|------|--------------|
| 1 | `schema.sql` | Creates everything: the `trips`, `members` and `destination_options` tables, the two status types, indexes, the row level security rules, the vote count trigger, and realtime. Run once only. |
| 2 | `fix-rls-recursion.sql` | Fixes "infinite recursion detected in policy for relation members" by adding `is_member_of_trip()` and rebuilding the two read rules around it. |
| 3 | `fix-anon-trip-read.sql` | Lets a visitor with no session read trips, so a shared link does not show "not found". |
| 4 | `fix-join-trip-function.sql` | Adds `join_trip()`, the function a friend's browser calls to join a trip. |
| 5 | `2026-11-20-hardening-and-advance.sql` | Security hardening plus the automatic stage advance. Two parts, described below. |

On the live database but in none of these files: `trips.date_window_start`, `trips.date_window_end`, `trips.updated_at`, `members.budget_min`, `members.budget_max`, `members.updated_at`, and the triggers that keep `updated_at` current. File 5 does not touch them.

## File 5 in two parts

Read the header of the file before running it. It has the order of operations, two read-only queries to look at existing damage first, and the rollback for each part.

**Part A** runs when you run the file. It works with the app that is live today and is safe to run more than once.

- Joining needs a signed-in visitor, and only the organiser can add member rows directly.
- A member cannot make themselves organiser, move to another trip, or vote for another trip's place.
- Places are added only by members of that trip, start at zero votes, and cannot be duplicated.
- Vote counts stay correct on insert and delete. Existing wrong counts are recalculated once.
- A trip moves one stage at a time.
- New column `trips.expected_size`, and new functions `advance_trip()`, `trip_preview()` and `get_trip_by_slug()`.
- The organiser can remove a member.

**Part B** is switched off inside a comment block at the end of the file. Run it only after the new app is deployed and a friend can join from a private window. It stops anyone with the public key from listing every trip. The app that is live today breaks if Part B runs before the new app is deployed.

## Tests

```bash
npm run test:db
```

Runs `supabase/tests/run.mjs`: an in-memory Postgres (PGlite) with files 1 to 4 applied, then file 5, then scenarios played as different users. It never connects to Supabase. It also compares `advance_trip()` with the real `findBestOverlap()` in `src/lib/overlap.ts`; that part needs Node 22.13 or newer and is skipped on older versions.
