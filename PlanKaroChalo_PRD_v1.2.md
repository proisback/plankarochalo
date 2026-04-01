# Plan Karo Chalo
**A link-based group trip coordination tool that collapses weeks of WhatsApp chaos into minutes of structured decision-making.**

Version: 1.2 · April 1, 2026
Author: Prateek · Cohort 7 · Rethink Systems
Status: Draft
Domain: plankarochalo.com

---

## Discovery Insights

### Research Scope

This product is grounded in primary research across 132+ unique data points: 27 interviews spanning structured deep conversations (6), consolidated Q&A-format interviews (13), qualitative retrospective write-ups (7), and cross-group interviews (2) — plus 105 survey responses across three independent surveys (49, 40, and 11 respondents respectively, plus 5 short-form). The respondents covered friend groups, multi-family trips, women's treks, couples groups, motorcycle touring clubs, office offsites, and three-generation family vacations. Group sizes ranged from 2-3 (spontaneous) to 22+ (organized rides). Cities represented include Bangalore, Delhi, Chennai, Mumbai, Pune, and multiple Tier-II cities. Destinations discussed spanned Goa, Kodaikanal, Pondicherry, Manali, Coorg, North India treks, Gujarat circuits, Arunachal Pradesh, Thailand, Vietnam, and Europe.

The full interview registry — names, roles, group types, key quotes, and survey breakdowns — is available in the **Research Appendix** (linked separately). This document references interviewees by persona type, not by name.

Secondary research validated primary findings against published market data: the global group travel market reached ~$168B in 2024 at 7.2% CAGR, India's travel market was valued at $22.5B with 2.5 billion domestic tourist visits in 2023 (up 45% year-on-year), and Asia Pacific leads global growth at 8.2-8.4% CAGR. The full secondary research document is linked separately.

### What We Found

We entered this research expecting itinerary building to be the core pain point — the assumption that groups struggle most with figuring out what to do each day. We were wrong. The trip journey dies much earlier, and the kill zone is remarkably consistent across every group type.

**> 80% of all respondents named date alignment as their #1 friction point. 35% of trips that never happened died specifically because dates couldn't be aligned.**

The trip lifecycle has eight stages: spark → dates → destination → budget → accommodation → itinerary → on-trip → post-trip. Across every data source, the critical failure point is stages 2-4. In the 40-person survey, "coordinating dates and availability" was the most time-consuming stage for roughly half the respondents, and "dates couldn't be aligned" was the #1 reason trips didn't happen — cited by 14 of 40 respondents. The 49-person survey independently found the same result: "aligning everyone's dates" outranked every other friction stage including destination decisions, itinerary building, and bookings.

But dates are just the entry point to a deeper coordination failure. One interviewee — a frustrated non-lead who travels infrequently and cares deeply about trip quality but has no power to move the group forward — described the pattern precisely: excitement in the WhatsApp group, then 7-8 destination suggestions come in simultaneously, a poll gets created but only 3 people vote, preferences get debated with no structure, people stop responding, the group goes silent, and the trip quietly dies through inertia. He estimated that most of his planned trips had been "not cancelled, just quietly abandoned." The 40-person survey confirmed this: 20% of failed trips were attributed to "planning became too overwhelming and momentum died."

**> In 67% of groups, 1-2 people did most or all of the planning work. Organizers reported spending 5-15+ hours per trip while having the worst trip experience.**

The organizer tax emerged as structural, not incidental. In the 49-person survey, 55% said "1-2 people did most of it," another 12% said "one person did literally everything." Only 8% reported that "everyone contributed." In the 11-person detailed survey, 36% of organizers reported spending 15+ hours on planning.

The most extreme case was a super-organizer who plans 5-6 trips per year for a close friend group — destination research, accommodation, itinerary, everything. When he became unavailable for one trip due to a personal retreat, the trip was cancelled entirely. Nobody else stepped up. The group literally cannot travel without him. This isn't burnout — he enjoys the role — but it makes the entire system fragile.

A family coordinator planning for seven people (three generations: elderly parents, brother and wife, a one-year-old baby) described the subtler version of the same burden: "None of that is hard, it's just a lot of small things that are all in my head and nobody else is thinking about them. And if I forget something, it's my fault." He'd spent August to October going in circles on dates for a Coorg trip, sent four or five different date options in the family WhatsApp group, and watched each one get torpedoed by a different conflict — a hospital follow-up, a client visit, a maid going to her village. Eventually he just declared "this is when we're going, make it work" — and everyone was fine with it. The dates weren't the problem. The absence of a mechanism to converge was.

A college-age organizer from Pune echoed the same dynamic for friend groups: "I end up doing it because otherwise it won't happen. I don't love it, but also I don't trust them to not mess it up either." He'd made a Google Sheet for a Goa trip that nobody opened, then fielded the same questions in WhatsApp that the sheet already answered.

**> No group uses fewer than 5 tools per trip. The average is 6-8 apps, with information scattered across all of them.**

WhatsApp is universal — every single respondent uses it as the primary coordination layer. But every interviewee also described information getting buried, decisions getting lost, and the organizer becoming the living index of what's been decided. One survey respondent captured it cleanly: "Things which are important get lost in WhatsApp group chats and creates the need to scroll through and find things. There have been instances where important messages have been missed due to long conversations."

The tool fragmentation is consistent across all groups: WhatsApp for chat, Google Sheets for dates (used by ~40% of organizers), Splitwise for expenses (~60%), MakeMyTrip or Booking.com for research, Google Maps for navigation, Instagram and YouTube for inspiration — and nothing connecting any of it. The coordination layer between communication (WhatsApp) and booking (OTAs) is entirely unowned.

**> Two very different users independently described the same solution without prompting: "one link, no download, see the status, tap and done."**

Perhaps the most striking finding was the convergence between a college student planning casual friend trips and a family coordinator managing three generations. Both independently described wanting: a link they can share in WhatsApp (not an app to download), one screen showing what's decided and what's pending, the ability for others to participate with minimal effort, and automated nudging so they don't have to personally chase people. The family coordinator specifically asked for proxy input — the ability to enter constraints on behalf of family members who will never use the tool: "My dad barely opens anything that's not a WhatsApp forward." The college student was blunt about scope: "I don't want something that makes planning better. I want something that makes planning shorter."

Both also independently rejected the same features: expense tracking ("the real pain I want solved is 'why is this taking 2 weeks to decide dates,' not 'how do we split ₹1,200'"), in-app chat ("WhatsApp is where we talk"), and feature-heavy platforms ("If I see itinerary builder, expense tracker, booking integrations — I'll just ignore all of it").

### Assumptions We Started With vs. What We Found

| Assumption | Status | What Changed |
|-----------|--------|--------------|
| Itinerary building is the core pain point | **Overturned** | The trip dies at dates and destination, not itinerary. AI itinerary is commoditizing — 56% of US leisure travelers already used AI for trips in the past 12 months (Phocuswright, March 2026). The coordination layer is the white space |
| Users want an "all-in-one" travel platform | **Overturned** | Both cross-group interviewees explicitly rejected feature-heavy tools. Users want one problem solved well, not a platform to learn |
| Budget misalignment can be solved with anonymous ranges | **Partially wrong** | Survey response to anonymous budget input was lukewarm ("Maybe"). The family coordinator showed that families handle budget by sharing options at different price tiers and reading reactions — not by declaring numbers. The mechanism needs user testing |
| Everyone in the group needs to use the tool | **Overturned** | The tool must work even if only the organizer creates an account. In families with elderly members and in friend groups with 2-3 perpetually unresponsive people, universal adoption is impossible. Proxy input and link-based participation are essential |

---

## Problem Prioritization

Twelve distinct pain points emerged from primary research. After validating them against secondary market data and the competitive landscape, four are selected for V1 — chosen because they sit in the kill zone (stages 2-4 of the trip journey), are confirmed as high-frequency and high-severity, and have no adequate solution in the current market.

| Pain Point | Disposition | Rationale |
|-----------|-------------|-----------|
| Date & Schedule Alignment | **Solving in V1** | #1 universal pain (80%+), confirmed by every data source, no tool solves it for informal groups. Trips literally die without this |
| Trip Status Visibility + Momentum | **Solving in V1** | Two sides of the same problem: no shared dashboard = no visible progress = momentum death. 20% of failed trips died from overwhelm and momentum loss. No competitor offers stage progression or "waiting on X people" clarity |
| Organizer Tax Reduction | **Solving in V1 (as design principle)** | 67% of groups have 1-2 people doing all work. The tool reduces organizer burden through automation, nudging, and proxy input — not by asking everyone to "plan together" |
| Destination Decision Convergence | **Solving in V1** | 60%+ frequency. Natural next step after dates. WhatsApp polls fail because they lack context, structure, and a lock mechanism |
| Budget Misalignment | Deferred to V1.1 | Validated as real pain (55%+) but the anonymous budget range concept is unvalidated. MVP uses a simple "group budget" field |
| Itinerary Planning Effort | Deferred to V2 | AI itinerary is commoditizing fast. Group-aware AI is the differentiator, but needs V1 data to build well |
| Passive Participation | Baked into UX | Not a feature — a design principle. One-tap interactions, structured options, 10-second comprehension |
| Expense Tracking | Eliminated | Mature market ($512.5M). Splitwise and UPI are adequate. Both cross-group interviewees explicitly rejected it in this tool |
| Post-Decision Dropout | Deferred to V2 | Commitment deposits are complex. V1 dashboard with visible commitment status partially addresses it |
| On-Trip Coordination | Deferred to V2 | Real-time coordination is post-launch scope |
| Food & Dietary Coordination | Eliminated | Too niche for MVP |
| Booking/OTA Integration | Eliminated permanently | We are a coordination layer, not a booking engine |

The reasoning for these cuts matters as much as the selections. Expense splitting was eliminated despite being mentioned by 50%+ of respondents because the market is already well-served — building another splitter adds engineering cost without differentiation. AI itinerary generation was deferred despite being the most "impressive" feature because it's rapidly becoming table stakes — MakeMyTrip, Wanderlog, and every major AI assistant already offer it. What none of them offer is the coordination layer that determines whether a trip happens at all.

### Problem Statement

**The "default planner" in Indian friend groups and families of 4-10 people** needs a way to **move their group from "let's go somewhere" to "dates locked, destination chosen, everyone confirmed"** because **the pre-booking coordination phase is entirely unstructured** — currently managed through **weeks of WhatsApp back-and-forth, manually piecing together availability from vague messages, chasing non-responders, and absorbing all cognitive load alone** — which results in **35% of planned trips never happening, organizer burnout across 5-15+ hours of unpaid project management per trip, late bookings at higher prices, and compounding social friction.**

### Cost of Inaction

Per trip, the organizer loses 5-15+ hours across 2-8 weeks of coordination. Across the survey respondents, 35% of planned trips never happened — representing lost deposits, missed group bonding, and accumulated frustration. One interviewee's Goa trip went from 12 committed people to 5 through cascading dropouts, requiring accommodation rebooking and budget recalculation at each stage. Late booking caused by coordination delays means higher prices — Indian hotel rates spike 20-40% within 2 weeks of travel dates for popular destinations. The hidden cost is relational: as one survey respondent put it, "Commitment issues, last minute backouts, no suggestions in the planning phase — but complaints later."

---

## Proposed Solution

### What It Is

Plan Karo Chalo is a link-based trip coordination tool that guides Indian groups through the pre-booking decision sequence — dates → destination → commitment — via a shared dashboard, with no app download required.

That single sentence is what a user should be able to repeat back. It's not a travel planner, not an itinerary builder, not a booking platform. It's the coordination layer that gets a group from "let's go somewhere" to "we're going."

### How It Solves Each Pain Point

The product maps directly to the four validated pain points. For date alignment, the organizer creates a trip, sets candidate date ranges, and shares a link. Members tap their availability via the link — no account needed. The system auto-calculates the best overlap window and surfaces it with a "Lock dates" action. The organizer can also enter constraints on behalf of others who won't use the tool (proxy input — designed specifically for the family coordinator whose father "still calls to ask how to download a PDF").

For trip status and momentum, a single-screen dashboard shows the current trip stage (dates → destination → committed → ready), what's been decided, what's pending, and who hasn't responded. A progress bar visualizes how close the trip is to being locked. The "Waiting on 3 people" indicator — requested independently by both cross-group interviewees — removes the ambiguity that lets trips quietly die.

For organizer tax reduction, the organizer's only job is: create the trip and share the link. The system auto-sends reminders to non-responders on a configurable cadence. The dashboard eliminates "repeating information 17 times." Proxy input lets the organizer enter constraints for tech-averse members. The tool does the chasing, not the human.

For destination convergence, once dates lock, the dashboard advances to the destination stage. Any member can propose 2-4 options. Members vote. Results are visible in real-time. The organizer taps "Lock destination" when consensus is clear. Simple, structured, with finality — replacing the WhatsApp threads where 7-8 suggestions come in simultaneously and nothing resolves.

### What It Deliberately Does Not Do

The product's boundaries are as important as its features. Plan Karo Chalo does not build itineraries — that's commoditizing fast, and groups can use Wanderlog or ChatGPT once dates and destination are locked. It does not split expenses — Splitwise and UPI are adequate, and both interviewees rejected expense tracking in this tool. It does not integrate with booking platforms — we're a coordination layer, not a booking engine, and OTAs are potential partners, not competitors. It does not include in-app messaging — WhatsApp is where groups talk, and duplicating chat fragments the conversation. And it does not offer AI destination recommendations in V1 — the group already has ideas from Instagram and YouTube; the problem is convergence, not discovery.

### Core User Flow

The organizer creates a trip: enters a name, proposes 2-4 date ranges, optionally adds known constraints for other members. The system generates a shareable link. The organizer drops this link into the WhatsApp group — one tap, no explanation needed.

Members open the link on their phone. They see the trip dashboard, are prompted to select their available dates from the proposed ranges. This takes under 30 seconds — one-tap interaction designed for the 2-3 minute mobile windows that account for 70%+ of Indian trip planning behavior.

The system calculates overlap and surfaces the best date window: "Works for 5 of 7 people." It shows who hasn't responded. The organizer — or the system, after a configurable deadline — locks the dates. The dashboard advances to the destination stage.

Members vote on destination options proposed by anyone in the group. The organizer locks when consensus is clear. The dashboard advances to the commitment stage. Every member explicitly taps "I'm in" or "I'm out" — clean commitment with instant group rebalance. The trip moves from "maybe" to "happening" with full transparency.

At any point, the organizer can generate a WhatsApp-formatted summary and paste it into the group chat: "Coorg trip — Oct 14-17. 5 people confirmed. Destination locked." For members who never opened the link, the trip still exists in the WhatsApp conversation. The tool works even for the people who don't use it.

### Success Metrics

| Metric | What It Measures | Target (V1) |
|--------|-----------------|-------------|
| Trip Completion Rate | % of created trips reaching "dates + destination locked" | >40% (vs. estimated <20% via WhatsApp-only, per survey data showing 35% of trips die) |
| Time to Lock Dates | Days from trip creation to date confirmation | <5 days (vs. 2-8 weeks currently reported) |
| Member Response Rate | % of invited members who complete availability input within 48 hours | >70% (vs. current pattern of 3-4 days for partial responses, with some never responding) |

---

## Implementation Plan

### V1 Feature Set

The V1 scope is organized by priority. The MUST features are the minimum for the product to deliver its core promise. The SHOULD features meaningfully improve the experience but the product works without them. The WON'T features are permanently or structurally excluded — and the reasoning behind each exclusion is where product judgment is most visible.

**MUST:** Trip creation with date range proposals (core entry point — the organizer defines the decision space). Shareable link with no auth for participants (the #1 adoption requirement — both interviewees demanded "no download"). Date availability input with auto-overlap calculation (the core value proposition — replaces weeks of back-and-forth with one interaction). Trip dashboard with stage progression (single source of truth — shows what's decided, what's pending, who's blocking). Destination voting with lock mechanism (structured convergence replacing WhatsApp poll chaos). "I'm in" / "I'm out" commitment toggle (clean commitment tracking visible to the group).

**SHOULD:** Auto-reminder nudges for non-responders (reduces organizer tax — configurable cadence so it doesn't become spam). Proxy input allowing the organizer to enter constraints for others (essential for family groups — the family coordinator's #1 request). Deadline-based auto-lock for date voting ("Voting closes in 24 hours" — the college-age organizer's explicit request to prevent indefinite drift).

**COULD:** WhatsApp-formatted trip summary for copy-paste (clean summary the organizer pastes into the WhatsApp group — bridges the gap for non-users). Simple group budget field (lightweight budget signal without the unvalidated anonymous range mechanism).

**WON'T:** Itinerary builder — AI itinerary generation is commoditizing; 56% of travelers already use AI for this; Wanderlog and ChatGPT serve the need. This is not our differentiation. Expense splitting — a $512.5M mature market with adequate tools; both cross-group interviewees explicitly said "not here"; building another splitter adds cost without value. In-app chat — WhatsApp is where 500M+ Indian users already talk; adding a parallel chat creates a second conversation that nobody uses and fragments the coordination. Booking integration — a different business with massive incumbents; we are a coordination layer, and OTAs are potential partners. User profiles and social features — adds onboarding friction for zero coordination value.

### Technical Approach

The product is a responsive web app, mobile-first. The stack is React for the frontend, Supabase for authentication, database, and real-time subscriptions, and Vercel for deployment. The domain plankarochalo.com is secured.

Three architectural decisions are worth noting. First, web app over native — the "no download" requirement is non-negotiable, and a PWA layer can be added post-launch for home screen installation without requiring app store distribution. Second, Supabase real-time subscriptions mean the dashboard updates live as members input their availability — no manual refresh, which matters for the "checking results, not doing work" experience the college-age organizer described. Third, anonymous participation via unique trip URLs — members interact through a link without creating accounts, while the organizer optionally authenticates for trip management persistence across sessions.

### What Comes After V1

Anonymous budget ranges move into V1.1 once user testing validates whether the concept works — primary research was lukewarm, and the family coordinator showed that implicit budget signaling (sharing options at different price tiers) may work better than explicit input. Group-aware AI itinerary generation comes in V2 — it's the true differentiator against commoditized individual AI planners, but it needs the group preference data that V1 usage generates. WhatsApp bot integration deepens the WhatsApp-adjacent positioning in V2, justified only if V1 adoption data shows the link-sharing pattern works. Commitment deposits (small financial commitment to reduce the dropout problem — one interviewee's trip went from 12 to 5 people) come in V2 once payment infrastructure is justified.

Two features are permanently excluded as architectural boundaries, not deferrals. Booking integration will never be built — we are a coordination layer, and becoming an OTA changes the product's identity and competitive position. In-app messaging will never be built — WhatsApp is where groups talk, and fragmenting conversation across two platforms guarantees abandonment of one of them.

### Open Gaps

One technical gap has been resolved; four product questions remain open.

**Resolved: Link-based anonymous participation is technically robust.** Supabase's Anonymous Sign-Ins feature (launched April 2024) is purpose-built for this pattern. Calling `signInAnonymously()` creates a real user with a unique ID, JWT, and full access to the `authenticated` role — without requiring email, phone, or any personal information. Anonymous users get the same Row Level Security enforcement and Realtime subscription access as permanent users, differentiated only by an `is_anonymous` claim in their JWT. When a member opens the trip link, the app silently creates an anonymous session, prompts only for a name, and ties all their interactions (availability, votes, commitment) to that user ID. If a member later wants cross-device persistence or wants to create their own trips, they can link an email or phone to upgrade their anonymous account without losing data. Two caveats planned for: session doesn't persist across devices or cleared browsers (acceptable for MVP — most members use one phone), and Cloudflare Turnstile should be enabled post-launch to prevent abuse of the anonymous sign-in endpoint.

The remaining four gaps are product-level, not technical:

The most critical: will users adopt a new tool alongside WhatsApp? The working assumption is yes — if it's link-based, takes under 30 seconds, and reduces WhatsApp noise rather than adding a new channel. If wrong, core adoption fails, though the WhatsApp-formatted summary feature provides a fallback where the tool remains "invisible" to resistant members.

Second: will the organizer persona pay? 64% of the detailed survey said they'd pay ₹49-500+, and Splitwise Pro ($3/month) and Wanderlog Pro ($5/month) establish that willingness to pay for travel tools exists. If not, freemium with premium features is the fallback — core coordination stays free permanently.

Third: does the "lock mechanism" feel too rigid for informal groups? The working assumption is that groups want clarity more than flexibility. If locks feel too formal, a "soft lock" (reversible with group consent) can supplement the "hard lock."

Fourth: will proxy input be used or feel patronizing? Organizers already mentally manage others' constraints — the tool formalizes what they do in their head. If it feels intrusive, making it optional and invisible to the proxied person is the adjustment.

---

## Instruction Design — Build Guide

### The Reasoning Behind Key Design Decisions

The choices that define this product aren't the features — they're the tradeoffs. Five decisions shaped the architecture, and each involved rejecting a plausible alternative.

**Link-based participation over universal accounts.** The alternative was to require all members to create accounts, which would enable richer features (persistent profiles, preference history, cross-trip data). We rejected it because every interviewee said the same thing: asking friends or family to install an app or create an account is where adoption dies. The family coordinator's father "still calls to ask how to download a PDF." The college-age organizer: "There will always be 2-3 people who don't download, forget, say 'just tell me here only.' And then the whole thing breaks." Howbout — the closest competitor on date coordination — requires app installation from all members. That's their adoption bottleneck and our key differentiator.

**Stage-gate progression over freeform dashboard.** The alternative was an open dashboard where any decision could be made in any order — more flexible, more "collaborative." We rejected it because that flexibility is exactly what WhatsApp already provides, and it produces chaos. The trip journey has a natural sequence confirmed across every interview: dates determine destination (you pick WHERE based on WHEN), destination determines budget, budget determines accommodation. One interviewee described the WhatsApp failure vividly — 7-8 destination suggestions flooding in before dates are even discussed. Stage gates enforce the discipline groups need but cannot self-impose. Dates lock before destination voting opens. Destination locks before commitment is requested. Each stage has one job.

**Organizer-created trips over group-created trips.** The alternative was to let any member create and modify the trip equally — more democratic, more distributed. We rejected it because the data is unambiguous: in 67% of groups, 1-2 people do all the work. One interviewee's distributed planning model (a motorcycle touring group of 4 with clear role assignments) is the only positive counter-example in the entire dataset — and it works because of small size and high frequency. For the typical group of 5-8 friends or family members who travel 2-3 times a year, the organizer IS the person who will set things up. Designing for "equal participation" sounds ideal but ignores behavioral reality. The tool makes the organizer's job easier rather than pretending the role doesn't exist. Others participate through responding, voting, and confirming.

**Automated nudging over manual reminders.** The alternative was to let the organizer manually ping non-responders through the tool — a "remind" button next to each name. We rejected the manual-only approach because the organizer tax isn't just about time — it's the social awkwardness of chasing friends and family. The family coordinator described reminding his brother as uncomfortable. The college-age organizer: "I hate chasing people." If the system sends the nudge, the social cost shifts from the organizer to the tool. The framing matters: "the group is waiting on your input" is neutral accountability, not personal pressure.

**Visible response status over private status.** The alternative was to keep individual response status private and show only aggregate numbers ("4 of 7 have responded"). We rejected full privacy because the college-age organizer specifically requested individual visibility: "Show me 'Waiting on 3 people' — because that's exactly how it feels. If I see that clearly, I know who to ping." However, both interviewees flagged the risk of public shaming. The design shows WHO hasn't responded (necessary for the organizer to follow up) but frames it neutrally — "hasn't responded yet" rather than "is delaying the group." The tone of the status label is a design decision, not just a feature decision.

### Screen-by-Screen Breakdown

**Trip Creation (Organizer only).** This is the entry point — the organizer defines the decision space. The screen contains a trip name field, a date range picker where the organizer adds 2-4 candidate windows, an optional group budget field, and a section for adding member constraints on behalf of others (proxy input). On submission, the system generates a unique shareable link. The organizer's only required action after this screen is to paste the link into a WhatsApp group. Edge cases to handle: no date ranges entered (require minimum 2), single-person trips (redirect — this tool is for groups), and very large date ranges (cap at 30 days per range to keep overlap calculations meaningful).

**Trip Dashboard (Shared — the core screen).** This is what every member sees when they open the link, and it's the heart of the product. At the top: trip name and a status banner that changes with the current stage ("Picking dates" → "Voting on destination" → "Confirm you're in" → "You're going!"). Below that: a 4-step progress bar showing the sequential stages, with the current one highlighted. The center of the screen shows stage-specific content — date availability inputs, or destination voting cards, or commitment buttons, depending on where the trip is. A member status sidebar lists everyone with clear icons: confirmed, pending, out, or hasn't responded. The "Waiting on X people" indicator sits prominently. This screen must communicate the full state of the trip within 10 seconds of opening — the college-age organizer's benchmark: "I open it and within 10 seconds I know what's happening, who's in, what the best option is, and what I need to do."

**Date Availability Input (Member view).** The member's first interaction with the tool. A calendar-style display shows the organizer's proposed date windows. The member taps to mark which ranges they're available for — designed for one-handed phone use in a 2-3 minute window. A submit button confirms their input. The entire interaction should take under 30 seconds. If a member is available for zero proposed ranges, a "none work for me" option surfaces and flags this to the organizer. Proxy-entered constraints appear as pre-filled but remain editable by the actual member.

**Date Overlap Results.** After responses come in, this view shows each proposed range with its availability count ("5 of 7 available") and the specific names underneath. The best option is highlighted automatically by the system. The organizer sees a "Lock these dates" button. An optional "Extend deadline" action appears if responses are incomplete. Edge cases: a perfect tie between two ranges (show both, let organizer choose), or a situation where only 2-3 of 7 can make any range (surface this clearly — the organizer may need to accept a smaller group or revisit).

**Destination Voting.** Unlocked only after dates are locked — the stage-gate in action. Any member can propose 2-4 destination options, each with a name, optional photo, and optional one-line note. Members cast a single vote. Results update in real-time. The organizer sees a "Lock destination" button. If there's an exact tie, the organizer breaks it. If a member adds a new option after voting has started, a "new option added" flag alerts others.

**Commitment Confirmation.** The final stage. A trip summary shows the locked destination, dates, current group size, and optional budget. Two large buttons: "I'm In" and "I'm Out." The member list updates in real-time as people confirm. If a member switches from "In" to "Out," the dashboard updates instantly and the organizer is notified. If enough people drop out that trip viability is questionable, the system surfaces a warning: "Only 3 of 7 confirmed — still want to proceed?" The organizer's "Trip Locked" action finalizes everything and generates the shareable summary.

### Data Model

The core entities are simple. A **Trip** holds the trip name, organizer reference, current status (dates_open, dates_locked, destination_open, destination_locked, confirmed), the proposed date ranges, an optional budget, the locked destination, creation timestamp, and voting deadline. A **Member** is linked to a trip and tracks their name, response status (invited, responded, confirmed_in, confirmed_out, no_response), their availability selections, their destination vote, and whether their data was proxy-entered by the organizer. **DateRange** objects belong to a trip and store start date, end date, and a computed available count. **DestinationOption** objects hold a name, description, optional photo URL, who added it, and a vote count.

### Edge Cases

If the organizer shares the link but nobody responds for 72+ hours, the system auto-sends a nudge. After the configurable deadline, the organizer sees: "No responses yet — resend link or extend deadline?" If the organizer accidentally locks the wrong dates, an "Unlock" option is available for 1 hour — after that, creating a new trip prevents the flip-flopping that kills group trust. For groups of 15+ people, the UI still works but date overlap becomes statistically unlikely, so the system shows a warning: "Large groups rarely find perfect overlap — consider the best partial match." If two organizers want to co-manage, V1 supports sharing the organizer link with a trusted co-planner informally; a formal co-organizer role comes in V2.

### Testing Plan

The minimum viable test: create a trip for an actual upcoming group outing (or a simulated one with 5 cohort members). Each member opens the link on their phone, inputs availability, votes on a destination, and confirms commitment. The test validates: link sharing works, no-account participation works, overlap calculation is correct, the dashboard updates in real-time, and the full flow completes in under 5 minutes per member. The key qualitative measure: after using the tool, does the organizer still feel the need to explain the plan separately in WhatsApp? If yes, the dashboard failed its job. If no, the single source of truth is working.

---

### Closing Principle

Every design decision in Plan Karo Chalo traces back to one belief: **the trip should be harder to cancel than to confirm.** If the tool makes deciding effortless and visible, the default shifts from inertia — where trips quietly die — to momentum, where trips happen.
