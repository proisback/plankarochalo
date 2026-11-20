---
name: pkc-design
description: Design system, vocabulary and build rules for Plan Karo Chalo ("Chart Prepared"). Read before building or restyling any screen, component, page or copy in this repo.
---

# Plan Karo Chalo design system: "Chart Prepared"

## The idea

One culturally specific idea, used everywhere: **the Indian railway reservation**.

- Station name boards: signal yellow, black condensed capitals, Hindi above English.
- The printed ticket: hairlines, mono data, a perforated tear line.
- The moment a waitlisted name turns **CNF**. That is what the product does for a group trip.
- A route line of four stations: Dates, Place, Commit, Go.

Use the metaphor in type, layout and the two or three signature moments (route line, ticket, stamp). Never rename a control into railway jargon. Buttons say what they do in plain English. `CNF / WL / OUT` codes appear only on the ticket, always with a screen-reader label.

## Non-negotiable rules

1. **Tokens only.** Never write a hex colour or a Tailwind palette class (`stone-*`, `emerald-*`, `amber-*`, `white`, `black`). Use the tokens in `src/app/globals.css`.
2. **Every filled surface pairs with its `on-*` text token.** `bg-primary text-on-primary`, `bg-accent text-on-accent`, `bg-brand text-on-brand`, `bg-whatsapp text-on-whatsapp`. Never `text-white`. In dark mode primary is yellow, so white text on it is unreadable.
3. **No emoji in the interface.** Icons come from `<Icon name="..." />` in `src/components/icons.tsx`. If one is missing, add it there (24px grid, 1.75 stroke). Emoji are not used in text sent to WhatsApp either: opened through a `wa.me` link, WhatsApp on a computer turns them into question-mark boxes. Use plain words and WhatsApp's `*bold*`. The only emoji left are stored destination data (see "Destination icons"), which is never sent.
4. **No gradients, no blurred blobs, no glass, no glow.** Depth is a 1px hairline (`border-border`). Shadows (`shadow-lg`, `shadow-xl`) are for overlays only.
5. **Small radii.** `rounded-xl` is 6px, `rounded-2xl` 8px, `rounded-3xl` 10px here (overridden in `@theme`). `rounded-full` is for people (avatars) and dots only. No pill buttons, no pill badges.
6. **Not everything is a card.** Group with spacing, a `label-mono` caption, and hairline rules (`border-t border-border`, `divide-y divide-border`). Use `.panel` only when a block is a distinct object.
7. **Three type voices.** Display: `font-heading` (condensed, heavy; add `.display` for uppercase signage). Text: default sans. Data: `font-mono` for numbers, dates in tables, codes, and every small caption (`.label-mono`).
8. **44px touch targets.** `.btn`, `.btn-sm` and `.icon-btn` already are (`btn-sm` is smaller in type and padding, not in height). A standalone text link gets `inline-flex min-h-11 items-center`. Inputs are 16px text so iOS does not zoom.
9. **Every state exists.** Loading (`.skeleton`, not a lone spinner), empty (say what to do next), error (`friendlyError()` from `src/lib/errors.ts`, never a raw database string), success, disabled, focus-visible.
10. **Dates are day keys.** Use `src/lib/dates.ts` (`formatDay`, `formatRange`, `formatDayLong`, `parseDay`, `toDayKey`, `eachDay`, `memberDays`). Never `new Date("YYYY-MM-DD")`, never `toISOString().split("T")[0]`.
11. **Copy on the clipboard goes through `copyText()`** in `src/lib/format.ts`. Anything meant for the group offers WhatsApp first: `https://wa.me/?text=${encodeURIComponent(text)}`.
12. **Dialogs use `<Sheet>`** from `src/components/sheet.tsx` (bottom sheet on phones, dialog on desktop, focus trap, Escape, portal). Never a hand-rolled `fixed inset-0` div.
13. **Motion is CSS only.** `animate-in`, `animate-pop`, `animate-stamp`, `.stagger`, `.reveal`. Animate `transform` and `opacity` only. `prefers-reduced-motion` is already handled globally.
14. JSX text cannot contain a raw `'` or `"` (lint error). Write `&apos;` / `&quot;` or put the string in `{"..."}`.
15. **On a stage screen the answer comes first.** Order: the question, the control that answers it (or the member's own answer once given), then `<StageStatus>`, then lists. The exception is when everyone has answered: then the status carries the next action (lock, or ping the organiser) and leads.
16. **Amber means something needs attention**: a tie, a deadline, a conflict. Having answered is not a problem, so "You're done" is a plain `notice`. Do not stack more than two notices above the thing the screen is for.
17. **Say a fact once per screen.** If the ticket, the roll call or the route line already shows it, do not repeat it in a caption or a sentence. On Go, a phone shows the ticket on the first screen with "Send to the group" pinned.
18. **A picked day never shares a colour with the heat scale.** Picked is `bg-text text-background`; heat is the yellow scale. In dark mode `primary` is yellow, so `bg-primary` would make the two look the same.

## Tokens (Tailwind utility names)

| Role | Utilities |
|---|---|
| Page / surface | `bg-background`, `bg-surface`, `bg-subtle`, `bg-subtle-hover` |
| Text | `text-text`, `text-text-secondary`, `text-text-tertiary` |
| Hairlines | `border-border`, `border-border-light`, `border-border-strong` (ink) |
| Brand yellow | `bg-brand text-on-brand`, `bg-brand-soft` (pale tint), `border-ink` |
| Primary action | `bg-primary text-on-primary` (ink in light, yellow in dark), `bg-primary-light` (selected tint) |
| Go / in / locked | `bg-accent text-on-accent`, `bg-accent-light`, `text-accent` |
| Signals | `text-status-confirmed` + `bg-status-confirmed-bg`; `-responded` (blue, "answered"); `-waiting` (amber); `-out` (red) |
| Calendar heat | `bg-heat-low/medium/high` + `text-heat-*-text` (more people = more yellow) |
| Fixed ink / paper | `bg-ink`, `text-paper` (same in both themes; for the dark landing sections and the mark) |

## Component classes (defined in globals.css)

- Buttons: `btn` + one of `btn-primary`, `btn-brand` (yellow, marketing CTA only), `btn-go` (green), `btn-outline`, `btn-quiet`, `btn-danger`, `btn-whatsapp`; sizes `btn-sm`, `btn-lg`; `btn-block`.
- `icon-btn` (44px square), `link` (yellow underline).
- Forms: `field`, `field-label` (label always above the input), `field-hint`, `field-error`. Set `aria-invalid` and `aria-describedby`.
- `panel` (hairline container), `notice` + `notice-go | notice-wait | notice-stop | notice-info` (inline status with a signal bar).
- `chip` + `chip-go | chip-done | chip-wait | chip-out | chip-brand | chip-ink` (square mono status code).
- `avatar` (+ `avatar-sm`, `avatar-in`, `avatar-out`, `avatar-lead`). Avatars are never coloured decoratively: neutral by default, green when in, struck when out, yellow for the organiser.
- `label-mono` (every caption and field key), `display` (uppercase condensed headline), `rule` (caption on a hairline).
- Signature: `board` (station board), `ticket` + `ticket-tear` + `ticket-key` + `ticket-val`, `stamp` (+ `animate-stamp`), `barcode`, `marker` (yellow highlight behind a word), `sleepers` (track ticks), `skeleton`.

Shared React pieces: `Icon`, `Spinner`, `WhatsAppIcon`, `GoogleIcon` (`components/icons.tsx`); `Mark`, `Wordmark`, `StationBoard` (`components/brand.tsx`); `Sheet`; `TripTicket`; `RouteLine`, `StageStatus`, `ShareLink`, `LockButton` (under `app/trip/[slug]/`).

## Vocabulary (one name per thing)

| Thing | Say | Never |
|---|---|---|
| The four stages | **Dates, Place, Commit, Go** | Pick Dates, Choose Place, Confirm, Ready!, voting stage, commitment stage |
| Trip states | Picking dates, Choosing a place, Committing, Trip confirmed | Ready, Done, Completed, Finalized |
| A member's answer | Dates in, Voted, **In**, **Out**, Waiting | Confirmed (that word belongs to the trip), Responded |
| The person who made the trip | the organiser (British spelling in copy; code keeps `isOrganizer`) | host, admin, owner |
| Everyone | the group; person / people | members, users, participants |
| Someone the organiser answers for | "answered by {organiser}" | proxy, pre-added member |
| The organiser's action | Lock | finalize, close, submit |

Tone: plain, warm, short. Address people by first name. No exclamation marks on status. Hinglish is welcome in brand lines on the landing page and in messages that get pasted into WhatsApp, written as whole sentences. Interface labels stay in plain English.

Do not promise what the product does not do. There are no push notifications or emails: never write "we'll notify the group".

## Product rules that the design must respect

- Four gated stages. Members never create an account. Dates are tapped per day. Commit is hold-to-confirm.
- A stage locks by itself only when the organiser's expected group size has joined and every real member has answered (`stageProgress()` in `src/lib/types.ts`, `advanceTrip()` in `src/lib/advance.ts`). Otherwise the organiser locks, through `LockButton`, with a confirm sheet.
- The best dates are the window the most people can do **in full** (`findBestOverlap()` in `src/lib/overlap.ts`). Always show "4 of 6 can do all 3 days", plus who cannot.
- Budget is optional, asked after dates, as a single comfortable ceiling per person. Only the group aggregate is shown.
- The action comes before the explanation, and the primary action is visible without scrolling on a 375x700 screen.
- Out of scope forever: itinerary, expense splitting, booking, chat, profiles, AI recommendations.

## Destination icons

The database stores an emoji per destination and the locked destination as `"<emoji> <name>"`. The interface never renders that emoji. Use `destinationIcon(emoji)` and `parseDestination(locked)` from `src/lib/format.ts` to get one of our icons, and `DESTINATION_KINDS` for the picker. Keep writing the emoji to the database so old rows and the WhatsApp summary keep working.

## User flow

1. Organiser: `/` landing → `/login` → `/create` (My trips) → `/create/new` → `/trip/[slug]` → share the link on WhatsApp.
2. Friend: taps the link → `/trip/[slug]` → types a name → Dates → Place → Commit → the ticket.
3. Visitor with no group: `/` → `/demo`, the same screens on an in-memory trip with five simulated friends.

## Before calling a screen done

Open it at 360, 390, 768 and 1440 px in light and dark. Check: no horizontal scroll, the primary action is on the first screen of a 360 x 640 phone, no emoji, no `text-white`, no raw error strings, keyboard focus is visible, and it reads as part of the same printed system as the ticket.
