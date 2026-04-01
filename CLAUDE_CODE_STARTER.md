# Claude Code — Starter Prompt

Paste this as your first message in Claude Code after initializing the project.

---

## Prompt:

I'm building a production MVP for Plan Karo Chalo — a group trip coordination tool. Deadline is April 4th, 2026.

Read `memory.md` in the project root first — it contains the complete product context, tech stack decisions, data model, authentication architecture, overlap algorithm, and build priority order. Everything has been validated through research and prototyping.

The key files to reference:
- `memory.md` — Complete project context (START HERE)
- `PlanKaroChalo_Prototype.jsx` — React prototype with full UI (use as visual reference for components, colors, layout)
- `PlanKaroChalo_PRD.html` — Final PRD (reference for product logic)

**Tech stack (already decided):**
- Next.js (App Router) + Tailwind CSS
- Supabase (PostgreSQL + Auth + Realtime + RLS)
- Vercel deployment
- Domain: plankarochalo.com

**Build order:**
1. Initialize Next.js project with Tailwind. Deploy empty shell to Vercel immediately (get live URL on day 1)
2. Set up Supabase — create tables (trips, members, destination_options) with RLS policies. Enable anonymous sign-ins
3. Build trip creation flow — organizer auth (email/Google), create trip form (name, duration, budget, deadline, proxy constraints), generate slug
4. Build the shared trip page at `/trip/[slug]` — anonymous auth on load, name prompt for new members, trip dashboard with stage progression
5. Build dates stage — calendar picker, availability submission to Supabase, real-time subscription for updates, overlap algorithm, lock with confirmation
6. Build destination stage — add options, vote, real-time vote counts, lock
7. Build commitment stage — "I'm In" / "I'm Out", real-time status updates, lock
8. Build ready stage — trip summary + WhatsApp copy button
9. Polish — responsive cleanup, loading states, error handling

**Critical requirements:**
- Anonymous participation must work (Supabase `signInAnonymously()` — members don't create accounts)
- Real-time updates must work (members see each other's input without refreshing)
- Mobile-first (primary test device is a phone)
- Stage-gate progression is non-negotiable (dates must lock before destination opens)

Start with steps 1-2: initialize the project and set up Supabase schema. Show me the SQL for the tables and RLS policies.
