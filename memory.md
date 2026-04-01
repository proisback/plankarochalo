# Plan Karo Chalo — Project Memory

> Use this file as context when building the production MVP in Claude Code.
> It captures every decision made during discovery, design, and prototyping.

---

## Product Identity

**Name:** Plan Karo Chalo ("Plan karo, chalo" — Hindi for "Make the plan, let's go")
**Domain:** plankarochalo.com (secured via GoDaddy)
**One-liner:** A link-based group trip coordination tool that collapses weeks of WhatsApp chaos into minutes of structured decision-making.
**What it is NOT:** Not a travel planner, not an itinerary builder, not a booking platform, not an expense splitter. It's the coordination layer that gets a group from "let's go somewhere" to "we're going."

---

## Context

**Author:** Prateek · Cohort 7 · Rethink Systems
**Deadline:** April 4, 2026, 11:59 PM
**Deliverables:** PRD (HTML — done) + Working MVP (live URL, functional end-to-end, testable by 3+ people, mobile-friendly)
**PRD location:** `/mnt/user-data/outputs/PlanKaroChalo_PRD.html`
**Prototype location:** `/mnt/user-data/outputs/PlanKaroChalo_Prototype.jsx` (React artifact with simulated data — use as UI reference, not production code)

---

## Research Foundation

**Data:** 132+ unique data points — 27 interviews + 105 survey responses across 3 surveys (49, 40, 11 respondents)
**Groups covered:** Friend groups, multi-family, women's treks, couples, motorcycle touring, three-generation families
**Key documents:**
- `PlanKaroChalo_Discovery_Document.md` — Primary research synthesis (Step 1)
- `PlanKaroChalo_Secondary_Research.md` — Market validation (Step 2)
- `PlanKaroChalo_Competitive_Analysis.md` — Deep competitive analysis (Step 4)
- `PlanKaroChalo_Research_Appendix.md` — Full interview registry, quotes, survey breakdowns

---

## Four Locked Pain Points (V1 Scope)

| # | Pain Point | Evidence | What "Solved" Looks Like |
|---|-----------|----------|--------------------------|
| 1 | **Date & Schedule Alignment** | 80%+ of respondents, #1 in all surveys, 35% of failed trips | Multi-person availability input → auto-overlap for target trip duration → best N-day window surfaced → one-tap lock |
| 2 | **Trip Status Visibility + Momentum** | 20% of trips died from momentum loss; info scattered across 6-8 apps | One screen: current stage, what's decided, what's pending, who's blocking, progress bar |
| 3 | **Organizer Tax Reduction** | 67% = 1-2 planners; 5-15+ hrs per trip | Organizer creates + shares link. System nudges non-responders. Proxy input for tech-averse members |
| 4 | **Destination Decision Convergence** | 60%+ frequency; WhatsApp polls lack structure/lock | Structured poll, any member adds options, real-time votes, organizer locks winner |

---

## What is EXPLICITLY Out of Scope

These were deliberately eliminated with reasoning — do NOT build these:

| Feature | Why Not |
|---------|---------|
| Itinerary builder | AI itinerary commoditizing (56% adoption). Wanderlog/ChatGPT serve this. Not our differentiation |
| Expense splitting | $512.5M mature market. Splitwise/UPI adequate. Both interviewees explicitly rejected it |
| Booking/OTA integration | Different business. We're coordination, OTAs are partners. Architectural boundary — NEVER build |
| In-app messaging/chat | WhatsApp is where 500M+ Indian users talk. Duplicating chat = abandoned channel. NEVER build |
| User profiles/social | Adds onboarding friction for zero coordination value |
| AI destination recommendations | V2. Group has ideas from Instagram/YouTube. Problem is convergence, not discovery |

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | **React (Next.js)** + Tailwind CSS | Fast to build, mobile-first, SSR for link previews |
| Backend | **Supabase** (PostgreSQL + Auth + Realtime + RLS) | Auth + DB + realtime in one. Free tier generous |
| Auth | **Supabase Anonymous Sign-Ins** | Members participate without accounts. Organizer uses email/Google auth |
| Real-time | **Supabase Realtime** subscriptions | Dashboard updates live as members interact |
| Deployment | **Vercel** | Zero-config for Next.js. Free tier sufficient |
| Domain | plankarochalo.com | Secured on GoDaddy |

**Cost at launch:** $0/month (free tiers)
**Cost at 1000 users:** ~$25/month

---

## Authentication Architecture (CRITICAL)

This is the most important technical decision. The product must work with **zero friction for members**.

### How it works:
1. **Organizer** creates account via Supabase Auth (email or Google). Creates a trip. Gets a unique URL like `plankarochalo.com/trip/[trip_id]`
2. **Member** opens the link. The app silently calls `signInAnonymously()` — no UI, no prompt, no sign-up screen
3. Member now has a real `auth.uid()` in Supabase with full `authenticated` role access
4. App prompts only for a **name** (just a name, nothing else). Name stored in Member row
5. All interactions (availability, votes, commitment) tied to this anonymous user ID
6. Dashboard uses Supabase Realtime — anonymous users get full subscription access
7. If member later wants persistence across devices, they can link email/phone via `updateUser()`

### RLS Policy Design:
- **Anyone with a member record for this trip** can READ trip data (anonymous + permanent)
- **Only the organizer** (permanent user, `is_anonymous = false`) can LOCK decisions and modify trip settings
- **Members** (anonymous or permanent) can only INSERT/UPDATE their own responses

### Caveats to handle:
- Anonymous session doesn't persist across devices or cleared browsers → acceptable for MVP
- Enable Cloudflare Turnstile post-launch to prevent abuse of anonymous sign-in endpoint
- Rate limit: 30 anonymous sign-ins per hour per IP (Supabase default)

---

## Data Model

### Trip
```
id: uuid (PK)
name: text
slug: text (unique, URL-friendly, derived from name)
organizer_id: uuid (FK → auth.users)
status: enum ('dates_open', 'dates_locked', 'destination_open', 'destination_locked', 'committed', 'ready')
budget: text (optional, free-form like "₹5,000-10,000 per person")
trip_days: integer (target duration, e.g. 4)
locked_dates_start: date (null until locked)
locked_dates_end: date (null until locked)
locked_destination: text (null until locked)
voting_deadline: text ('24h', '48h', '72h', 'none')
created_at: timestamptz
```

### Member
```
id: uuid (PK)
trip_id: uuid (FK → trips)
user_id: uuid (FK → auth.users, nullable for proxy members)
name: text
is_organizer: boolean
status: enum ('invited', 'responded', 'confirmed_in', 'confirmed_out', 'no_response')
availability_start: date (null until responded)
availability_end: date (null until responded)
destination_vote: uuid (FK → destination_options, nullable)
constraint_note: text (for proxy members — e.g. "Apr 10-14 unavailable")
constraint_start: date (nullable)
constraint_end: date (nullable)
is_proxy: boolean (true if organizer entered this member's data)
created_at: timestamptz
```

### DestinationOption
```
id: uuid (PK)
trip_id: uuid (FK → trips)
name: text
note: text (optional, e.g. "Coffee plantations, 5hr drive")
emoji: text (e.g. "🌿")
added_by: uuid (FK → members)
vote_count: integer (computed or maintained via trigger)
created_at: timestamptz
```

---

## Core User Flow (Production)

### Organizer Flow:
1. Signs up / signs in (email or Google via Supabase Auth)
2. Creates trip: name, trip duration (days), date ranges, optional budget, optional voting deadline, optional proxy member constraints
3. Gets shareable link: `plankarochalo.com/trip/[slug]`
4. Shares link in WhatsApp group
5. Sees dashboard with real-time updates as members respond
6. At each stage, has "Lock" button (with confirmation modal) to advance to next stage
7. At final stage, gets WhatsApp-formatted summary to copy-paste

### Member Flow:
1. Opens link on phone — NO download, NO account creation
2. App silently creates anonymous Supabase session
3. Prompted for name only ("What's your name?")
4. Sees dashboard at current stage
5. **Dates stage:** Calendar picker, taps start date and end date for their availability
6. **Destination stage:** Sees options, can add new ones, taps to vote
7. **Commitment stage:** Taps "I'm In" or "I'm Out"
8. **Ready stage:** Sees trip summary

---

## Stage-Gate Progression (CRITICAL Design Pattern)

The dashboard has exactly 4 stages. Each stage MUST complete before the next one unlocks. This is non-negotiable — it's the core design principle that differentiates us from WhatsApp chaos.

```
DATES_OPEN → [organizer locks] → DATES_LOCKED / DESTINATION_OPEN → [organizer locks] → DESTINATION_LOCKED / COMMITMENT → [organizer locks] → READY
```

Each stage shows:
- What's been decided (green ✓ banners for locked items)
- What needs input now (the stage-specific interactive element)
- Who hasn't responded ("Waiting on X people" banner with names)
- Progress bar (4 steps, current one highlighted)

---

## Overlap Algorithm

The date overlap algorithm is the core intellectual property of the product. Here's exactly how it works:

1. Collect all members' availability ranges (start date, end date per member)
2. Build a date→count map: for each calendar date, count how many members are available
3. Filter to dates where count ≥ 2 (at least 2 people overlap)
4. Find all consecutive runs of overlapping dates
5. For each run, slide a window of exactly `trip_days` length across it
6. Score each window: primary = minimum overlap count across all days in window (how many people can make ALL days), secondary = sum of counts (tiebreaker)
7. Pick the window with highest score
8. **Constraint checking:** cross-reference the best window against proxy member constraints. If the window overlaps with someone's unavailable dates, show a warning but still allow locking
9. **Fallback:** if no run is long enough for target days, show the longest available run with an info banner

---

## Key UI/UX Decisions

1. **Mobile-first:** 70%+ of Indian trip planning is on mobile. Every interaction designed for one-handed phone use in 2-3 minute windows
2. **Calendar-based date input:** Members pick their own from/to dates freely on a calendar (not pre-defined options). Calendar shows heatmap dots for other members' availability
3. **Collapsible member list:** Compact summary bar by default ("6 members · 3 responded"), expands on tap. Saves mobile scroll space
4. **Lock confirmation modals:** Every lock action triggers "Lock these dates? This will notify the group." with "Lock it" / "Wait, not yet" buttons. Prevents accidental irreversible actions
5. **Persistent share link:** Always visible (collapsible) throughout all stages except Ready. Not a disappearing toast
6. **Organizer/Member view toggle:** In prototype only — for testing both experiences. Production has separate views based on auth state
7. **Proxy input with date pickers:** Organizer can add member constraints using actual date inputs (not free text). Constraints show as orange dots on calendar and trigger conflict warnings in overlap
8. **Trip duration selector:** Organizer picks 2/3/4/5/7 days. Overlap algorithm finds the best window of exactly that length
9. **WhatsApp-formatted summary:** On Ready stage, generates a copy-pasteable message for WhatsApp group
10. **Deadline indicator:** Purple banner "⏰ Voting closes in 48h" when deadline is set

---

## Design System

**Fonts:** DM Sans (body), Outfit (headings)
**Primary color:** #E86A33 (warm orange)
**Accent color:** #2D6A4F (forest green — for success/confirmed states)
**Background:** #FAFAF8 (warm off-white)
**Status colors:**
- Confirmed: green (#2D6A4F on #E8F5EE)
- Responded: teal (#2D6A4F on #E8F5EE)
- Waiting: amber (#D4940A on #FFF8E1)
- Out: red (#C62828 on #FFEBEE)
- Pending/link: purple (#7B61FF on #F0ECFF)

**Border radius:** 12-14px (cards), 8-10px (inputs/buttons)
**Shadows:** Subtle — `0 1px 3px rgba(0,0,0,0.06)` for cards

---

## Competitive Positioning

**The real competitor is WhatsApp** (the status quo), not Wanderlog.

| Us vs. Them | WhatsApp | Wanderlog | Howbout | Plan Karo Chalo |
|---|---|---|---|---|
| Date alignment | ❌ | ❌ | ✅ (needs app) | ✅ (link-based) |
| Trip status dashboard | ❌ | ⚠️ (itinerary only) | ❌ | ✅ |
| Stage progression | ❌ | ❌ | ❌ | ✅ |
| "Waiting on X" clarity | ❌ | ❌ | ⚠️ | ✅ |
| Auto-nudge | ❌ | ❌ | ❌ | ✅ |
| Proxy input | ❌ | ❌ | ❌ | ✅ |
| No-account participation | N/A | ❌ | ❌ | ✅ |
| Destination voting + lock | ⚠️ (basic polls) | ❌ | ⚠️ | ✅ |
| India-optimized | ✅ | ❌ | ❌ | ✅ |

---

## MVP Requirements (from Case Study Brief)

The MVP MUST be:
- **Deployed and accessible** — live URL, not localhost
- **Functional end-to-end** — core flow works with real data
- **Testable by a group** — 3+ people simultaneously
- **Mobile-friendly** — 70%+ on phones

---

## Files in This Project

| File | What It Is |
|------|-----------|
| `PlanKaroChalo_PRD.html` | Portfolio-grade HTML PRD (final deliverable) |
| `PlanKaroChalo_PRD_v1.2.md` | Markdown PRD (latest) |
| `PlanKaroChalo_Prototype.jsx` | React prototype with simulated data (UI reference) |
| `PlanKaroChalo_Discovery_Document.md` | Primary research synthesis |
| `PlanKaroChalo_Secondary_Research.md` | Secondary research validation |
| `PlanKaroChalo_Competitive_Analysis.md` | Competitive deep-dive |
| `PlanKaroChalo_Research_Appendix.md` | Full interview registry + quotes |
| `memory.md` | This file — project context for Claude Code |

---

## What to Build in Claude Code

### Priority order:
1. **Supabase setup** — Create project, enable anonymous auth, create tables with RLS policies
2. **Next.js app** — Mobile-first, Tailwind, deployed on Vercel from day 1
3. **Trip creation flow** — Organizer auth + create trip + generate slug
4. **Shareable trip page** — `/trip/[slug]` with anonymous auth on load + name prompt
5. **Dates stage** — Calendar picker, availability submission, real-time updates, overlap algorithm, lock
6. **Destination stage** — Add options, vote, real-time counts, lock
7. **Commitment stage** — "I'm In" / "I'm Out", real-time updates, lock
8. **Ready stage** — Trip summary + WhatsApp copy
9. **Polish** — Nudge system (can be simulated for MVP), deadline display, proxy input

### Non-negotiables for the live demo:
- Link sharing must work (someone opens the URL on their phone and can participate)
- Anonymous participation must work (no sign-up for members)
- Real-time updates must work (two people see each other's input without refreshing)
- Stage progression must work (dates → destination → commitment → ready)
- Mobile must work (the primary test device is a phone)

---

## Iterations Made to the Initial Product

### Session: April 1–2, 2026

**Infrastructure & Auth:**
- Scaffolded Next.js 15 (App Router) + Tailwind CSS v4 + TypeScript manually (directory had existing docs, couldn't use create-next-app)
- Supabase client setup: browser (`createBrowserClient`), server (`createServerClient`), and middleware session refresh via `@supabase/ssr`
- SQL schema: 3 tables (trips, members, destination_options) with RLS, vote count trigger, realtime publication
- Simplified `trip_status` enum from 6 values to 4: `dates_open`, `destination_open`, `commitment`, `ready` — removed redundant intermediate "locked" states
- Fixed RLS infinite recursion on `members_select` policy by extracting membership check into `is_member_of_trip()` security definer function
- Fixed 404 on shared links: added `anon` role to `trips_select` policy so server component can fetch trip before client-side anonymous auth
- Fixed member join RLS failure: created `join_trip()` security definer function to bypass RLS for the insert — direct INSERT was blocked for anonymous users despite valid session
- Fixed Supabase Site URL config (magic link was redirecting to localhost:3000)

**Core Flow (all 4 stages built):**
- Landing page with Google OAuth + magic link sign-in (organizer)
- Trip creation form: name, duration (2/3/4/5/7 days), budget, voting deadline, proxy constraints
- Shared trip page at `/trip/[slug]` with anonymous auth on load + name prompt for members
- Dates stage: calendar picker, availability heatmap, overlap algorithm (sliding window), lock with confirmation
- Destination stage: add options with emoji, tap-to-vote toggle, real-time vote counts, lock
- Commitment stage: "I'm In" / "I'm Out" with live tally, organizer finalizes
- Ready stage: trip summary card + WhatsApp-formatted copy button

**Bug Fixes:**
- Fixed `currentMember` state going stale — `loadMembers()` now syncs `currentMember` from the updated members array. Previously it was set once at init and never updated, breaking vote toggles, date submission feedback, and commitment button highlights
- Fixed duplicate member handling — `join_trip()` function returns existing member if already joined instead of erroring
- Used `maybeSingle()` instead of `single()` in member lookup to distinguish "no row" from "query error"
- Fixed unicode escape sequences (`\u2013`, `\u26A0`, etc.) rendering as literal text in JSX — replaced with actual Unicode characters

**UI Matching Prototype:**
- Rebuilt calendar: proper 7-column monthly grid with ◂ ▸ month navigation, Su–Sa headers, heatmap coloring by member count, tap-to-select range, legend
- Rebuilt progress bar: numbered circles (1–4) connected by lines, ✓ on completed stages, ring shadow on current step, labels ("Pick Dates", "Choose Place", "Confirm", "Ready!")
- Rebuilt member list: avatar initials (colored by role), "Organizer" label, collapsible with "GROUP · N" header, status badges with icons (✓ Confirmed, ● Dates set, ⏳ Waiting, ✕ Out)
- Rebuilt lock confirmation: full-screen modal overlay with backdrop blur instead of inline card
- Commitment buttons: asymmetric layout matching prototype — "I'm In ✓" (2/3 width, green) + "I'm Out" (1/3, outlined red). Shows confirmation state after voting with "Changed your mind?" recovery option
- Share link hidden on Ready stage (per spec)
- Added "← New" nav button for organizers to create another trip

**Proxy Member Features:**
- Proxy constraints on create form: organizer adds member names + unavailable date ranges during trip creation. Inserted as `is_proxy: true` members with `constraint_start/end`
- Organizer edit (✎) for proxy members: inline form in member list to edit name, constraint dates, and set availability on their behalf
- Mark available with checkboxes: when best overlap window is found, organizer sees a checklist of waiting members. Members with constraint conflicts show ⚠ and are unchecked by default. Bulk "Mark N members as available" button sets their dates to the window

**Destination Stage Improvements:**
- Context-aware member badges: "Dates set" on dates page, "Voted"/"Waiting" on destination page, "Confirmed"/"Out" on commitment page
- Stage-aware member subtitle: shows voted destination (e.g. "🏔️ Coorg") under member name on destination page instead of dates
- Proxy voting: organizer can vote on behalf of proxy members via 🗳 ballot icon → inline destination picker
- Honest tie-handling: LEADING badge on clear winner, TIED badges when multiple options share top votes. Ties show "It's a tie! Pick the winner:" with buttons for each tied option. Lock button hidden when 0 votes
- Voter names displayed under each destination option card

**Deployed:** Live at plankarochalo.vercel.app, connected to Supabase with anonymous sign-ins enabled.

---

## Closing Principle

> Every design decision traces back to one belief: **the trip should be harder to cancel than to confirm.**
