# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Plan Karo Chalo** is a link-based group trip coordinator for Indian friend groups and families of 4 to 10 people. It replaces weeks of WhatsApp back-and-forth with four gated decisions: dates, place, commitment, go. Friends take part from a link with no account.

First version shipped April 2026 (8-day build in a PM cohort). Redesigned and hardened November 2026 ("Chart Prepared").

## Read before building

- `.claude/skills/pkc-design/SKILL.md`: **the design system, vocabulary and build rules. Binding for any UI or copy.**
- `memory.md`: original product context and decisions from April 2026. Its design-system, data-model and algorithm sections are superseded by this file and the skill above.
- `PlanKaroChalo_PRD_v2.html`: the PRD, with shipped features, decisions and measured results.
- `PlanKaroChalo_Discovery_Document.md`: primary research (27 interviews, 105 survey responses). The only allowed source for research numbers on public pages.
- `supabase/README.md`: SQL files in the order they were applied, and the pending migration.
- `docs/overnight-revival-prompt.md`: the brief the November 2026 redesign was run from.

## Tech stack (locked)

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS v4, TypeScript |
| Backend | Supabase (Postgres, Auth, Realtime, RLS) |
| Auth | Anonymous sign-in for friends, Google or magic link for the organiser |
| Fonts | Anek Latin + Anek Devanagari (variable width), IBM Plex Mono, via `next/font` |
| Deployment | Vercel: https://plankarochalo.vercel.app (plankarochalo.com does not resolve) |

No animation library, no icon library, no remote images. Motion is CSS. Icons are in `src/components/icons.tsx`.

## Commands

```bash
npm run dev          # local dev server
npm run build        # production build
npm run lint         # ESLint (flat config in eslint.config.mjs)
npm run test:db      # runs the SQL migration and its scenario tests against an embedded Postgres
```

Windows machine: in PowerShell, chain with `;` not `&&`.

## Routes

| Route | What |
|---|---|
| `/` | Marketing landing page. Static. |
| `/demo` | The real trip screens on an in-memory trip with five scripted friends. No sign-up, nothing saved. |
| `/story` | Case study. Static. |
| `/login` | Organiser sign-in. Accepts `?next=`. |
| `/create` | My trips (organiser only). |
| `/create/new` | Create a trip. |
| `/trip/[slug]` | The trip. Friends join here with a name. Not indexed. |
| `/auth/callback` | OAuth and magic-link return. |
| `/dev/og`, `/demo/preview/*` | Development-only. 404 in production. |

## Architecture

### Stages
Exactly four, in order, each locked before the next opens: `dates_open` → `destination_open` → `commitment` → `ready`. User-facing names are **Dates, Place, Commit, Go** (`STAGES` in `src/lib/types.ts`).

### Who can do what
- The organiser is whoever owns the trip row (`trips.organizer_id`). The UI derives organiser rights from that, never from `members.is_organizer`.
- Friends get a session when they submit their name, not when they open the link.
- Only the organiser can lock a stage, reopen one (one step back), change trip length, add or answer for someone who will not use the link.

### Locking
- A stage locks by itself only when the organiser's expected group size (`trips.expected_size`) has joined and every real member has answered. That decision is made in the database by `advance_trip()`; the client calls it through `advanceTrip()` in `src/lib/advance.ts` after every answer.
- Otherwise the organiser locks through `LockButton`, which always shows a confirm sheet naming who has not answered.
- "Everyone who has joined so far" is never treated as "everyone".

### Best dates
`findBestOverlap()` in `src/lib/overlap.ts`. A window is ranked by how many people are free on **every** day of it, then by person-days covered, then earliest start. It needs at least two such people. `advance_trip()` implements the same ranking in SQL: change one, change both, and run `npm run test:db`.

### Dates are day keys
A day is a `"YYYY-MM-DD"` string everywhere. Use `src/lib/dates.ts`. Never `new Date("YYYY-MM-DD")` (UTC midnight, wrong day west of Greenwich).

### Data model
- **trips**: `id`, `name`, `slug`, `organizer_id`, `status`, `trip_days`, `expected_size`, `date_window_start/end`, `locked_dates_start/end`, `locked_destination` (stored as `"<emoji> <name>"`), `voting_deadline`, `created_at`, `updated_at`
- **members**: `id`, `trip_id`, `user_id` (null when the organiser answers for them), `name`, `is_organizer`, `is_proxy`, `status`, `availability_start/end`, `constraint_note` (JSON list of day keys), `destination_vote`, `budget_min/max`, timestamps
- **destination_options**: `id`, `trip_id`, `name`, `note`, `emoji`, `added_by`, `vote_count`

### The demo backend
`src/lib/demo/backend.ts` is an in-memory stand-in for the Supabase client. `createClient()` in `src/lib/supabase/client.ts` returns it for any path under `/demo`. If a screen starts using a new Supabase call, add it there too or the demo breaks. `src/lib/demo/script.ts` seeds the trip and plays the five friends.

### Database migration status
`supabase/2026-11-20-hardening-and-advance.sql` is written and tested locally but **must be run by the owner** on the live project (Part A, then deploy, then Part B). Until Part A runs, the client degrades on purpose: no automatic locking, no "who is already in" on the join screen, and group size is not stored.

## Scope boundaries

**Never build:** itinerary builder, expense splitting, booking or OTA integration, in-app chat, user profiles or social features, AI destination recommendations. Each was excluded with research backing (see `memory.md` and `/story`).

## Content rules for public pages

- Every number must come from the research or PRD files in this repo. No invented testimonials, user counts or logos.
- Research participants are never named.
- The product has no notifications. Never write that it will notify anyone.
- Survey percentages are shares of respondents ("35% said a trip of theirs never happened because..."), never shares of trips.
- `site.linkRepo` in `src/lib/site.ts` stays false until the research files in the repository are anonymised.
- Uppercase `.display` is for short signage only. Sentences use `.headline`.
