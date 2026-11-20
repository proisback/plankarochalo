# Plan Karo Chalo

**Get the Goa plan out of the group chat.**

A link-based group trip coordinator for Indian friend groups of 4 to 10. Drop one link in WhatsApp. Everyone taps the days they are free, votes on a place, and commits. Friends need no app and no account. The group ends up with one confirmed ticket instead of "let's see".

- **Live:** https://plankarochalo.vercel.app
- **Try it without signing up:** [`/demo`](https://plankarochalo.vercel.app/demo) runs the real screens with five simulated friends. About a minute.
- **Case study:** [`/story`](https://plankarochalo.vercel.app/story) covers the research, the decisions and the results.

## What it does

Four stages, each locked before the next opens.

| Stage | What happens |
|---|---|
| **Dates** | Everyone taps the days they could travel. The calendar fills in where people overlap. The best window is the one the most people can do from start to finish. |
| **Place** | Anyone adds a place. One vote each. The organiser breaks ties. |
| **Commit** | A two-second hold to say you are in. Deliberately harder than a thumbs-up. |
| **Go** | One ticket with the place, the dates and who is confirmed, plus a calendar file and a WhatsApp summary. |

What it deliberately does not do: itineraries, expense splitting, bookings, chat. The research behind those decisions is in the case study.

## Why it exists

27 interviews and 105 survey responses about how group trips fall apart. The finding that changed the product: trips do not die at the itinerary, they die earlier, at dates, place and budget, usually in silence. In one survey, 35% of respondents said a trip of theirs never happened because the dates could not be aligned (14 of 40). The research, the decisions and the results are written up in the [case study](https://plankarochalo.vercel.app/story).

## Stack

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Supabase (Postgres, Auth, Realtime, row-level security), Vercel.

No animation library, no icon library, no remote images. Motion is CSS, icons are one file, and every visual is drawn in code.

## Run it locally

```bash
npm install
npm run dev
```

Create `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

The landing page, `/demo` and `/story` work without a database. Trip pages and sign-in need the Supabase project.

Other commands:

```bash
npm run build      # production build
npm run lint       # ESLint
npm run test:db    # runs the SQL migration and its scenario tests on an embedded Postgres
```

## How it is put together

```
src/app/
  page.tsx                 landing page (static)
  demo/                    live demo on an in-memory backend
  story/                   case study (static)
  login/                   organiser sign-in
  create/                  My trips, create a trip
  trip/[slug]/             the trip: join screen, route line, four stages
src/components/            icons, brand mark, ticket, sheet (dialog)
src/lib/
  overlap.ts               best-window and group-budget logic
  dates.ts                 calendar-day helpers (no timezone bugs)
  advance.ts               asks the database to move a trip to its next stage
  demo/                    in-memory stand-in for Supabase, plus the scripted friends
supabase/                  schema, fixes, and the hardening migration with tests
.claude/skills/pkc-design/ the design system, vocabulary and build rules
```

A few decisions worth knowing:

- **The demo runs the real screens.** `createClient()` returns an in-memory stand-in for the Supabase client on any `/demo` path. Nothing is mocked at the component level, and nothing touches the production database.
- **A stage locks by itself only when the whole expected group has answered.** The organiser gives a group size. "Everyone who has opened the link so far" is never treated as "everyone".
- **The best dates are ranked by who can do every day**, not by daily headcount. The same ranking is implemented in TypeScript and in SQL, and `npm run test:db` checks they agree.
- **A day is a `YYYY-MM-DD` string everywhere**, so dates read the same in every timezone.
- **Organiser rights come from owning the trip row**, which the database enforces, not from a flag a client could set.
- **Links to this repository from the public pages are off by default** (`linkRepo` in `src/lib/site.ts`). Turn them on once the research files here no longer name participants.

## Database

SQL lives in [`supabase/`](supabase/), listed in order in [`supabase/README.md`](supabase/README.md).

`supabase/2026-11-20-hardening-and-advance.sql` closes several row-level-security gaps and moves stage advancement into the database. It is tested locally but has to be run on the live project by its owner, in two parts. Until Part A runs, the app degrades on purpose: stages do not lock by themselves, the join screen does not show who is already in, and group size is not stored.

## Design

The design system is called "Chart Prepared". It takes one idea every Indian traveller already knows, the railway reservation, and uses it throughout: signal-yellow station boards, a route line of four stations, a printed ticket, and the moment a waitlisted name turns CNF. Tokens are in [`src/app/globals.css`](src/app/globals.css) and the rules are in [`.claude/skills/pkc-design/SKILL.md`](.claude/skills/pkc-design/SKILL.md).

To regenerate the social preview image and app icons after a design change:

```bash
npm run dev
python scripts/render-brand-assets.py http://localhost:3000
```

## Credits

Designed and built by Prateek. Research conducted with a Rethink Systems product management cohort, 2026.
