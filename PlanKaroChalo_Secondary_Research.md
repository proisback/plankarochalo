# Secondary Research — Validation of Primary Findings

**Product:** Plan Karo Chalo (plankarochalo.com)
**Author:** Prateek · Cohort 7 · Rethink Systems
**Date:** April 1, 2026
**Status:** Step 2 of 7 — Secondary Research

---

## Purpose

This document validates or contradicts the 12 pain points and key assumptions from the Primary Research Discovery Document using published market data, industry reports, competitive analysis, and behavioral studies.

---

## 1. Market Validation — Is the Opportunity Real?

### Finding: Group travel is a large and growing market

**VALIDATED — strongly.**

The primary research positioned group travel as a growing market. Secondary data confirms this emphatically:

- The global group travel market reached ~$168-370 billion in 2024 (estimates vary by scope; the narrower group travel services market was $168B, the broader market including all group leisure was $370B) and is projected to grow at 5.8-8% CAGR through 2033.
- Asia Pacific leads growth at 8.2-8.4% CAGR, outpacing all other regions, driven by rising middle-class incomes and expanding domestic tourism in India and Southeast Asia.
- India's travel & tourism market was valued at $22.47 billion in 2024, projected to reach $38.12 billion by 2033 at 6.1% CAGR. The online travel segment alone was $51 billion in 2024, projected to reach $124 billion by 2033 at 9.3% CAGR.
- Group travel is the dominant traveler type in the leisure market, accounting for approximately 73.5% of leisure travel in 2024. Approximately 60% of travelers globally express a desire to travel in groups.
- In India specifically, millennials (28-43) are the highest travel spenders at an average of $6,031 annually. 66% use mobile devices for research and booking.

**Implication for Plan Karo Chalo:** The market is not just large — it's structurally growing. India is one of the fastest-growth regions globally, and the target demographic (millennials, friend groups) is the highest-spending segment.

### Finding: India's domestic friend-group segment is significant

**VALIDATED — with nuance.**

- India recorded 2.5 billion domestic tourist visits in 2023, up 45% year-on-year.
- Average monthly domestic travel searches jumped from 103 million in 2022 to 141 million in 2024, with Tier-II and Tier-III cities driving growth.
- 9 out of 10 APAC travelers intend to travel with others (Klook 2024 research). Gen Z specifically: 23% prefer group trips with friends, 41% with partners.
- Indian Gen Z: 69% likely to travel with family, 61% with parents. Group travel remains structurally important even as solo travel grows.
- Booking.com 2024 data: 62% of Indian Gen Z are likely to take short domestic trips (1-4 nights) — exactly the trip type our interviewees described.

**What's missing:** No published data specifically sizes the "friend-group domestic coordination" sub-segment within India. Market reports segment by leisure/corporate/educational but not by "informal friend groups needing coordination tools." This is a white space in the data itself, which is actually positive — it means no one has formally defined or captured this segment yet.

---

## 2. Pain Point Validation — Does Secondary Data Support Primary Findings?

### PP-01: Date & Schedule Alignment — #1 pain point

**VALIDATED.**

- Multiple UX research studies confirm that coordinating logistics and making group decisions is the most difficult part of travel planning. One study notes this was the #1 finding across all interviewees.
- Booking.com 2024 data shows Gen Z travelers coordinate dates around school holidays, leave policies, and long weekends — exactly matching Amit's and Rakshitta's descriptions.
- The recommendation to start group trip planning 6-9 months ahead exists precisely because date alignment takes that long for larger groups.
- No existing tool solves multi-person date coordination for informal groups. When2Meet exists for meetings; Google Calendar has sharing — but neither is designed for the "find the best travel window across 5-8 people" problem.

**Verdict: CONFIRMED as the #1 universal pain point. No tool adequately solves it.**

### PP-02: Organizer Tax / Uneven Planning Burden

**VALIDATED — and quantified by industry data.**

- Industry guides consistently recommend appointing a "trip leader" — implicitly acknowledging that without one, group trips collapse. This validates the single-organizer pattern found in primary research.
- SquadTrip (a group travel planning platform) explicitly states: "Without a system, organizers often repeat the same mistakes" and "stress in group travel usually comes from uncertainty and manual work."
- The Nielsen statistic that the average traveler visits 28 websites over 53 days and 76 sessions for a single trip illustrates the research burden. For a group organizer doing this on behalf of 5-8 people, the cognitive load is multiplicative.
- No competitive tool effectively distributes planning tasks. Wanderlog allows collaborative editing but doesn't have task assignment, responsibility tracking, or stage-gate workflows.

**Verdict: CONFIRMED. The organizer tax is an industry-recognized problem with no adequate solution.**

### PP-03: No Single Source of Truth

**VALIDATED — the fragmentation problem is well-documented.**

- The case study itself identifies the tool fragmentation: "travelers today typically need Wanderlog for itineraries, Splitwise for group expenses, Google Maps for navigation, and WhatsApp for communication — four separate apps for a single trip."
- Wanderlog is the closest to a unified platform (itinerary + map + budget + collaboration), but it still doesn't handle date coordination, destination voting, or structured group decision-making.
- In India specifically, WhatsApp is the universal coordination layer with 500M+ users. Every interviewee confirmed this. Secondary data confirms WhatsApp dominance among Indian millennials — 54% of the global WhatsApp user base is millennials.
- The problem isn't that tools don't exist — it's that no tool owns the coordination layer. Booking tools handle transactions. Communication tools handle chat. No tool handles structured group decisions.

**Verdict: CONFIRMED. The white space is specifically the coordination layer between communication and booking.**

### PP-04: Destination Decision Paralysis

**VALIDATED.**

- Research confirms that when presented with too many options, travelers experience decision overload. One study found that "lack of personalization" was cited as a pain point by 65% of travelers, and "difficulty in finding reliable information" by 50%.
- Gen Z data is particularly relevant: 68% trust AI to suggest lesser-known destinations, and 73% would use an AI trip planner — suggesting strong demand for structured destination recommendation that reduces choice overload.
- Wanderlog's approach (community guides + AI suggestions) partially addresses this for individual travelers, but doesn't help a group of 6 people converge on one destination from competing preferences.

**Verdict: CONFIRMED. The group dimension of destination selection is specifically unserved.**

### PP-05: Budget Misalignment & Taboo

**VALIDATED — with an important behavioral nuance.**

- Prateek's survey showed only ~25% of groups set a clear budget upfront. Shreya's survey showed "budget is never explicitly discussed" was the most common budget approach.
- Secondary data confirms that budget differences are a primary source of group travel friction. SquadTrip identifies money as "one of the biggest pain points in group travel planning."
- Splitwise's freemium restrictions (limiting free daily expenses to 3-4, adding cooldown periods) have frustrated Indian users, confirming our primary finding that Splitwise friction exists.
- Indian-made alternatives like SplitKaro and UPI-based splits (Google Pay, PhonePe) are emerging, but none integrate with trip planning.
- Jiddu Aditya's couples group (budget discussed openly) may be an outlier — secondary data suggests most groups avoid explicit budget conversations.

**Verdict: CONFIRMED. Budget misalignment is real. The anonymous budget range concept has no competitive precedent to validate or invalidate it — it would need user testing.**

### PP-06: Itinerary Planning Effort

**VALIDATED — and AI is rapidly changing this space.**

- The Nielsen statistic (53 days, 28 websites, 76 sessions) quantifies the research burden our interviewees described qualitatively.
- AI adoption for trip planning is accelerating rapidly: 56% of US leisure travelers used AI for at least one trip in the past 12 months (Phocuswright, March 2026), up from 43% just nine months earlier and below 25% in 2024.
- Among AI users, itinerary creation (73-75%) and general research (67-71%) are the top use cases.
- Indian Gen Z specifically: 73% would use an AI trip planner, 68% trust AI for destination suggestions.
- MakeMyTrip launched an advanced generative AI assistant in October 2024 for hyper-personalized itinerary planning.
- Wanderlog already offers AI-powered route optimization and place suggestions.

**CRITICAL NUANCE:** AI itinerary tools are multiplying rapidly. This is both validation (proves the pain is real enough for major investment) and a competitive threat (Plan Karo Chalo's AI itinerary won't be unique). The differentiation must be GROUP-AWARE AI — itineraries that account for multiple people's preferences, budget constraints, and group dynamics. No current tool does this.

**Verdict: CONFIRMED as a pain point. But AI itinerary generation alone is NOT a differentiator — group-aware AI is.**

### PP-07: Passive Participation

**VALIDATED — behavioral data supports the design principle.**

- 70%+ of trip planning happens on mobile devices — confirmed by multiple data sources. India's online travel market is mobile-first, with Statista projecting 62% of travel revenue from online sales by 2030.
- 66% of Indian millennials book trips using smartphones.
- Gen Z's social media behavior (Instagram at 28%, Google at 20% for discovery) confirms the fragmented, mobile-first, short-attention-span planning pattern.
- Wanderlog's collaboration feature allows "one-click" adding from guides, which partially addresses the low-effort participation need. But it doesn't solve the "give me 3 choices and let me tap one" interaction pattern that Rohith and Aditya Deepak described.

**Verdict: CONFIRMED. Mobile-first, one-tap interactions are table stakes. The "structured options, not open-ended questions" insight from primary research is a design principle, not a standalone feature.**

### PP-08: Expense Tracking & Post-Trip Settlement

**PARTIALLY VALIDATED — but the competitive landscape has shifted.**

- Splitwise remains the dominant tool but its freemium restrictions (3-4 expenses/day on free tier, 10-second cooldowns) are driving user frustration, especially in India.
- Indian alternatives are emerging: SplitKaro (made-in-India, no daily limits), PhonePe/Google Pay UPI splits, and tricount.
- The global bill-splitting app market is $512.5 million (2024), growing at 8% CAGR.
- Amit's insight that Splitwise "disrupts vacation mood" is echoed in user reviews — the friction of logging expenses during a trip is a known UX problem.

**HOWEVER:** Expense splitting is a solved-enough problem. Multiple good tools exist. Building another expense splitter would not differentiate Plan Karo Chalo. The opportunity is integration — expense tracking that's embedded in the trip dashboard rather than a separate app.

**Verdict: CONFIRMED as a pain point, but CONTESTED as an MVP priority. Better to integrate with existing tools (Splitwise API, UPI) than build from scratch.**

### PP-09: Trip Momentum Loss

**VALIDATED — and quantified.**

- Shreya's survey: 20% of trips died because "planning became too overwhelming and momentum died." Prateek's survey: ~40% experienced trip cancellation or near-cancellation.
- Aditya Deepak's excitement → chaos → silence → quiet abandonment pattern is described in industry literature as a known group travel dynamic.
- The recommendation to plan 6-9 months ahead implicitly acknowledges the momentum problem — groups that don't maintain energy over that period lose the trip.
- No current tool has built-in momentum mechanisms (progress bars, deadlines, nudges). This is a genuine white space.

**Verdict: CONFIRMED. Momentum maintenance through structured progress visibility is a differentiator no competitor offers.**

### PP-10: Post-Decision Dropout

**VALIDATED — strongly supported by survey data.**

- Aishwarya's 12→5 dropout case is extreme but not unusual. Shreya's survey: 17% of trip failures were due to last-minute dropouts.
- Industry data confirms group size instability: the recommendation to get deposits or commitments early exists because drop-offs are a known problem.
- No tool currently handles the "commitment checkpoint" pattern — where members formally confirm at each decision stage (dates, destination, budget) before the group moves forward.

**Verdict: CONFIRMED. Commitment mechanisms would be a differentiator, though implementation complexity may push this to v2.**

---

## 3. Competitive Landscape — What Exists and Where Are the Gaps?

### Wanderlog (Closest Competitor)

**What it does well:**
- Collaborative itinerary editing (Google Docs-style real-time editing)
- Map-based visualization of all destinations
- Budget tracking and expense splitting
- Route optimization (Pro feature)
- AI-powered place suggestions
- Offline access
- Free tier is remarkably comprehensive

**What it DOESN'T do (our opportunity):**
- No group date coordination / availability matching
- No structured destination voting or decision-making workflow
- No budget range transparency or anonymous budget input
- No stage-gate progression (trip goes from "idea" to "booked" without checkpoints)
- No momentum/nudge system for passive members
- No commitment tracking (who's confirmed, who's still deciding)
- No WhatsApp integration or messaging-adjacent experience
- Not specifically designed for Indian group dynamics (UPI, Hinglish, domestic destinations)

### TripIt

- Primarily a travel organizer for individual frequent travelers
- Imports booking confirmations automatically
- No group coordination, voting, or collaborative planning
- Focused on business travelers

### Other Competitors

- **Lambus, Tripsy, TripHobo:** Itinerary-focused tools with varying levels of group collaboration, but none own the pre-trip decision-making phase
- **SquadTrip:** Specifically targets group trip coordination with payments — but focused on professional organizers (travel agents, retreat planners), not informal friend groups
- **ChatGPT/Gemini:** Used for itinerary generation (56% of travelers in 2026), but no persistence, no group context, no shared state

### Competitive Gap Map

| Capability | WhatsApp | Wanderlog | Splitwise | ChatGPT | Plan Karo Chalo (proposed) |
|-----------|----------|-----------|-----------|---------|---------------------------|
| Group date finding | No | No | No | No | **YES** |
| Destination voting | Polls (expire) | No | No | No | **YES** |
| Budget alignment | No | Partial | No | No | **YES** |
| Shared itinerary | No | Yes | No | No | YES |
| AI itinerary (group-aware) | No | Yes (individual) | No | Yes (individual) | **YES (group)** |
| Expense splitting | No | Yes | Yes | No | Integrate |
| Trip progress/momentum | No | No | No | No | **YES** |
| Commitment tracking | No | No | No | No | **YES** |
| Mobile-first India UX | Yes | Partial | Yes | No | **YES** |
| Single source of truth | No | Partial | No | No | **YES** |

**Bold = unique differentiation vs. all existing tools.**

---

## 4. Assumption Validation Summary

| # | Assumption from Primary Research | Secondary Verdict | Evidence |
|---|--------------------------------|-------------------|----------|
| A1 | Group travel in India is large and growing | **VALIDATED** | $22.5B market, 6.1% CAGR; 2.5B domestic visits in 2023; Asia Pacific leads global growth |
| A2 | WhatsApp is the default coordination tool | **VALIDATED** | 500M+ Indian users; 54% of WhatsApp users globally are millennials; universally confirmed |
| A3 | Users will adopt a new tool alongside WhatsApp | **PLAUSIBLE** | No direct evidence, but the 56% AI adoption rate for travel shows willingness to use new tools. Key: the tool must reduce WhatsApp noise, not replace WhatsApp |
| A4 | AI-generated itineraries are a differentiator | **PARTIALLY VALIDATED** | AI itinerary generation is commoditizing fast (56% of travelers used AI in past 12 months). Individual AI itineraries are NOT a differentiator. Group-aware AI IS, since no competitor offers it |
| A5 | Budget transparency tools would be used if anonymous | **UNVALIDATED** | No secondary data supports or contradicts this specific feature. Primary data was lukewarm ("Maybe"). Needs user testing |
| A6 | The organizer persona would pay for this tool | **PLAUSIBLE** | Primary: 64% willing to pay ₹49-500+. Secondary: Splitwise Pro charges $3/month; Wanderlog Pro exists. Willingness to pay for travel tools is established, though price sensitivity in India is high |
| A7 | Distributed planning is achievable | **PLAUSIBLE** | Vignesh's group shows it works for small, high-trust groups. No tool currently facilitates it for larger/less-frequent groups. This is a product design challenge, not a market assumption |
| A8 | The coordination layer is the real white space | **STRONGLY VALIDATED** | Multiple industry sources confirm: booking is solved, itinerary tools exist, expense splitting exists — but no tool owns the group decision-making layer between "idea" and "booked" |
| A9 | 70%+ of planning happens on mobile | **VALIDATED** | 66% of Indian millennials book via mobile; 83% research on mobile; mobile-first is the norm in India's online travel market |
| A10 | Instagram/YouTube are primary discovery channels | **VALIDATED** | Agoda 2025: Instagram is #1 discovery source for Gen Z (28%). YouTube/vlogs at 13%. Friend recommendations at 15%. Travel apps at only 8% |

---

## 5. What Secondary Research CONTRADICTS or COMPLICATES

### 1. AI itinerary is not a moat
The primary research positioned AI itinerary generation as a key feature. Secondary research shows this is rapidly commoditizing — 56% of travelers already use AI, MakeMyTrip has an AI assistant, Wanderlog has AI suggestions. **The moat is not "AI itinerary" — it's "group-aware AI that helps 6 people converge on one plan."**

### 2. Expense splitting may not belong in the MVP
Primary research suggested expense tracking as a SHOULD HAVE. Secondary research shows the expense splitting market is mature ($512.5M), with multiple strong tools (Splitwise, SplitKaro, UPI-based splits). Building another splitter adds engineering cost without differentiation. **Better to integrate via API or link out.**

### 3. The "will they leave WhatsApp?" question remains open
Primary research universally confirmed WhatsApp dominance. Secondary data confirms it's deeply embedded. But AI adoption shows users WILL adopt new tools when the value is clear (56% adopted AI in 12 months). **The product shouldn't try to replace WhatsApp — it should be the structured layer that WhatsApp links TO.** Share a "trip dashboard" link in the WhatsApp group. Notifications go via WhatsApp. But decisions, voting, and status live in the app.

### 4. Solo travel is growing faster than group travel in some segments
While group travel dominates overall (73.5% of leisure market), solo travel among Gen Z is surging — 65% traveled solo in the past 6 months, 85% plan to. This doesn't invalidate the group travel opportunity but suggests the product should consider that users may toggle between group and solo modes.

### 5. Women's safety is confirmed as a real planning dimension but remains out of scope
Akansha, Preeti, and Aishwarya all flagged safety as a gender-dependent planning variable. Secondary data confirms that women's travel safety considerations are real and underserved. However, building a safety layer requires dedicated data (area-level safety ratings, hostel safety scores) that doesn't exist in structured form. **Correctly categorized as WON'T HAVE for MVP.**

---

## 6. Refined Problem Statement (Post-Secondary Research)

**Original (from primary research):**
Groups of friends and families struggle to plan trips together due to fragmented tools, unequal planning burden, unspoken budget conflicts, and passive participation.

**Refined (incorporating secondary validation):**
Group travel in India is a $22.5B and growing market where 73% of leisure travel is group-based, yet no product owns the coordination layer between "let's go somewhere" and "we're booked." Existing tools solve individual problems (Wanderlog for itineraries, Splitwise for expenses, WhatsApp for chat) but none handle the group decision-making sequence — date alignment, destination convergence, budget transparency, and commitment tracking — that determines whether a trip happens at all. AI is rapidly commoditizing itinerary generation, making the coordination layer (not the planning layer) the true white space.

---

## 7. What This Means for the MVP

### Double down on (validated, differentiated):
1. **Group date alignment** — no competitor solves this; confirmed as #1 pain
2. **Structured destination voting** — replaces WhatsApp chaos with structured convergence
3. **Trip dashboard as single source of truth** — confirmed white space
4. **Progress visibility / momentum mechanics** — unique, no competitor has this
5. **Commitment checkpoints** — confirmed as needed, no competitor offers it

### Include but don't over-invest (validated but commoditizing):
6. **AI itinerary generation** — must be group-aware to differentiate; individual AI itinerary is table stakes

### Defer or integrate (validated but better served by existing tools):
7. **Expense splitting** — link to Splitwise/UPI rather than build
8. **Booking** — link to MakeMyTrip/Airbnb rather than build

### Drop from consideration (not validated or too niche):
9. Route optimization for bikers
10. Women's safety layer
11. Pre-trip destination orientation/briefing

---

## 8. Next Steps

- [x] **Step 1:** Primary research synthesis
- [x] **Step 2:** Secondary research validation ← YOU ARE HERE
- [ ] **Step 3:** Finalize pain points to solve for (narrow to 3-4)
- [ ] **Step 4:** Competitive analysis deep-dive (Wanderlog feature-by-feature)
- [ ] **Step 5:** Prepare Discovery Document / PRD
- [ ] **Step 6:** Define features & solution design
- [ ] **Step 7:** Prototype in Claude → port to Claude Code for production MVP

**Deadline: April 4th, 2026**

---

*Sources: IMARC Group, Statista, Technavio, Mordor Intelligence, Phocuswright (March 2026), Global Rescue Traveler Surveys (2025), Booking.com Gen Z Report (2024), Klook Travel Pulse (2024), Agoda Gen Z Report (2025), Cleartrip/Skift India (2024), Condor Ferries Millennial Statistics, Collinson International (2024), MRFR Group Travel Report, GrowthMarketReports, various app store listings and industry publications.*
