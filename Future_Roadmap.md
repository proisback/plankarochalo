# Future Roadmap — Plan Karo Chalo

Post-MVP features prioritized by impact and effort. Informed by Jetty competitive analysis, primary research (132+ data points), and build session learnings.

---

## V1.1 — Ship within 1-2 weeks post-launch

### 1. Lightweight Pre-Trip Preferences
- During trip creation, organizer picks 2-3 quick questions from presets: "Beach or mountains?", "Budget: chill or splurge?", "Vibe: adventure or relaxation?"
- Members answer during the join flow (after name, before dates)
- Results shown as visual summary on the dashboard (e.g., "4/6 prefer beach, 5/6 want adventure")
- **Why:** Jetty's survey feature captures context that structured voting misses. This is the lightweight version — 2 taps, not 12 questions.

### 2. WhatsApp-Formatted Nudge Messages
- On any stage with waiting members, organizer taps "Nudge" → copies a WhatsApp message like: "Hey! 3 people are waiting on you for the Goa trip. Drop your dates here: [link]"
- Pre-formatted with names of who's waiting + direct link
- **Why:** PKC complements WhatsApp, doesn't replace it. Give the organizer the exact message to paste. Addresses organizer tax (PP-02) and passive participation (PP-07).

### 3. Google OAuth Sign-In
- Enable Google OAuth for organizer login (currently magic link only)
- Requires: Google Cloud Console project + OAuth credentials + Supabase provider config
- Code is already written and commented out in `src/app/login-form.tsx` — just uncomment when configured
- **Why:** Reduces sign-in friction from ~30s (check email for magic link) to ~3s (tap Google).

### 4. Email Notifications
- Notify members when: stage advances (dates locked, destination locked), they're nudged, trip is finalized
- Notify organizer when: all members have responded, deadline is approaching
- Use Supabase Edge Functions or a simple email API (Resend/Postmark)
- **Why:** Not everyone checks WhatsApp immediately. Email is the fallback channel.

---

## V2 — Ship within 1-2 months

### 5. AI Itinerary Generation
- When trip reaches "Ready" stage, show a "Generate itinerary" button
- Uses Claude API to generate a day-by-day plan based on: destination, dates, number of people, budget, preference data
- Displayed as a card on the Ready stage, copyable to WhatsApp
- **Why:** Jetty has zero AI. 56% of travelers use AI for trip planning. This is PKC's technical moat. Group-aware AI that accounts for multiple preferences is something no competitor offers.

### 6. Budget Alignment Tool
- Each member submits their budget range anonymously (slider: ₹3K–₹15K per person)
- Dashboard shows the overlap zone where most budgets intersect
- Addresses the "budget taboo" pain point from research (Indians don't openly discuss money)
- **Why:** Jetty gathers budget via surveys but has no convergence. PKC can do budget alignment the same way it does date alignment — algorithm + visualization. Could become the 5th stage in the stage-gate progression.

### 7. Activity Voting Per Day (Itinerary Co-Creation)
- Once dates + destination are locked, members vote on activities per day
- Options: pre-populated from AI suggestions + member-added
- **Why:** Goes beyond Jetty's manual itinerary builder. Extends the convergence model to daily planning.

### 8. Trip Templates
- Pre-built templates for common trip types: "Goa Beach Trip", "Himalayan Trek", "Weekend Getaway"
- Auto-populate duration, budget range, and destination options
- **Why:** Reduces blank-page anxiety for organizers. Jetty's guided planning UX proves this pattern works.

---

## V3 — Ship within 3-6 months

### 9. Partner/Affiliate Recommendations
- On Ready stage, show relevant partner links (stays, experiences) for the locked destination
- Curated by destination, budget, and group size
- Affiliate revenue model
- **Why:** Jetty's partner program shows monetization path beyond subscriptions. But premature before traction.

### 10. Content/SEO Engine
- Build "Indian Group Trip Guides" blog: Goa planning guide, Manali budget breakdown, etc.
- SEO play for organic acquisition targeting "group trip planning India" keywords
- **Why:** Jetty's blog drives organic traffic. Post-launch, content marketing becomes the acquisition channel.

### 11. Trip History & Re-Plan
- Past trips visible on organizer dashboard
- "Plan another trip with this group" — pre-populates member list
- **Why:** Retention mechanism. Groups that travel together once tend to travel again.

### 12. Multi-Language Support
- Hindi/Hinglish UI option
- **Why:** India market depth. 70%+ of target users are more comfortable in Hindi for casual contexts.

---

## Explicitly NOT on Roadmap

These remain deliberately excluded per research validation:

| Feature | Why Not |
|---------|---------|
| Expense splitting | $512.5M mature market. Splitwise/UPI adequate. Defer to integration, never build. |
| Booking/OTA integration | Different business. We're coordination, not commerce. Architectural boundary. |
| In-app messaging/chat | WhatsApp has 500M+ Indian users. Duplicating chat = abandoned channel. |
| User profiles/social | Adds onboarding friction for zero coordination value. |
| Map-based planning | Wanderlog's strength, not ours. Coordination > visualization. |

---

## Prioritization Framework

Features are ranked by: **Research evidence (does data support it?) × User impact (does it reduce coordination failure?) × Build effort (can we ship it fast?)**

The guiding principle: **every feature must make the trip harder to cancel than to confirm.**
