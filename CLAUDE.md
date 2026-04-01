# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Plan Karo Chalo** — Link-based group trip coordination tool for Indian friend groups/families (4-10 people). Collapses weeks of WhatsApp chaos into structured decision-making: dates → destination → commitment. Members participate via link with zero account creation.

**Deadline:** April 4, 2026. MVP must be deployed, functional end-to-end, testable by 3+ people simultaneously on mobile.

## Context Files (Read Before Building)

- `memory.md` — **START HERE.** Complete product context, tech decisions, data model, auth architecture, overlap algorithm, build priority
- `PlanKaroChalo_Prototype.jsx` — React prototype (~1600 lines). Use as **visual reference only** for components, colors, layout. Not production code
- `PlanKaroChalo_PRD_v1.2.md` / `PlanKaroChalo_PRD.html` — Full PRD with product logic and requirements
- `PlanKaroChalo_Discovery_Document.md` — Primary research (27 interviews + 105 surveys)

## Tech Stack (Locked)

| Layer | Choice |
|-------|--------|
| Frontend | Next.js (App Router) + Tailwind CSS |
| Backend | Supabase (PostgreSQL + Auth + Realtime + RLS) |
| Auth | Supabase Anonymous Sign-Ins (members) + Email/Google (organizer) |
| Real-time | Supabase Realtime subscriptions |
| Deployment | Vercel |
| Domain | plankarochalo.com |

## Build Commands

```bash
npm run dev          # Local dev server (Next.js)
npm run build        # Production build
npm run lint         # ESLint
npm run start        # Start production server
```

## Architecture

### Authentication (Critical Path)
- **Organizer:** Supabase Auth (email/Google) → creates trip → gets shareable URL
- **Member:** Opens link → app silently calls `signInAnonymously()` → prompted for name only → full participation
- Anonymous users get real `auth.uid()` with `authenticated` role. RLS policies gate access by trip membership, not auth type
- Only organizer (`is_anonymous = false`) can lock stages

### Stage-Gate Progression (Non-Negotiable)
Exactly 4 sequential stages. Each must lock before next opens:
```
DATES_OPEN → DATES_LOCKED/DESTINATION_OPEN → DESTINATION_LOCKED/COMMITMENT → READY
```
Trip `status` enum drives which UI is interactive. Lock actions require organizer confirmation modal.

### Data Model (3 tables)
- **trips** — `id`, `slug` (unique, URL-friendly), `organizer_id`, `status` (enum), `trip_days`, `locked_dates_start/end`, `locked_destination`, `voting_deadline`
- **members** — `id`, `trip_id`, `user_id`, `name`, `is_organizer`, `status` (enum), `availability_start/end`, `destination_vote`, `is_proxy`, `constraint_note/start/end`
- **destination_options** — `id`, `trip_id`, `name`, `note`, `emoji`, `added_by`, `vote_count`

### Core Algorithm: Date Overlap
1. Collect all members' availability ranges
2. Build date→count map (how many available per day)
3. Slide window of `trip_days` length across consecutive overlapping dates
4. Score: primary = min overlap count across window, secondary = sum of counts
5. Cross-reference against proxy member constraints (warn if conflict)
6. Fallback: if no run fits `trip_days`, show longest available run

### Routing
- `/` — Landing/organizer dashboard
- `/trip/[slug]` — Shared trip page (anonymous auth on load, stage-aware UI)

### Real-time
Supabase Realtime subscriptions on `members` and `destination_options` tables. Dashboard updates live without refresh.

## Design System

- **Fonts:** DM Sans (body), Outfit (headings)
- **Colors:** Primary `#E86A33` (warm orange), Accent `#2D6A4F` (forest green), Background `#FAFAF8`
- **Status:** Green=confirmed, Teal=responded, Amber=waiting, Red=out, Purple=pending
- **Style:** 12-14px border-radius cards, 8-10px inputs/buttons, subtle shadows `0 1px 3px rgba(0,0,0,0.06)`
- **Mobile-first:** 44px touch targets, one-handed phone use

## Explicit Scope Boundaries

**Never build:** itinerary builder, expense splitting, booking/OTA integration, in-app messaging/chat, user profiles/social features, AI destination recommendations. These are deliberately excluded with research backing (see `memory.md`).

## RLS Policy Pattern

- Trip members (anonymous or permanent) → READ trip data
- Members → INSERT/UPDATE only their own responses
- Organizer only → LOCK decisions, modify trip settings
- All policies scoped by `trip_id` membership check
