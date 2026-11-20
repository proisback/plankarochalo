import Link from "next/link";
import { Icon, WhatsAppIcon } from "@/components/icons";
import { TripTicket } from "@/components/trip-ticket";
import { SiteFooter, SiteNav } from "@/components/landing/site-chrome";
import { Reveal } from "@/components/landing/reveal";
import { FlapText } from "@/components/landing/flap-text";
import { HoldDemo } from "@/components/landing/hold-demo";
import { WalkthroughVideo } from "@/components/landing/walkthrough-video";
import { site } from "@/lib/site";

// Fully static: no cookies, no database. Sign-in state is handled on /login.
export const dynamic = "force-static";

/* ───────────────────────────── Content ─────────────────────────────
   Sources, so every claim can be checked:
   · 35%, 20%: PlanKaroChalo_Research_Appendix.md, "Why trips didn't happen"
     (14 and 8 of 40 survey respondents). These are shares of respondents,
     not shares of failed trips.
   · 67%: PlanKaroChalo_Discovery_Document.md (55% "1-2 people did most of
     it" plus 12% "one person did literally everything", 49-person survey).
   · 27 interviews, 105 survey responses: same document.
   No usage metrics are published: the April 2026 measurements are not
   recorded in a file in this repository.
   Nothing here is invented, and nobody who took part in the research is
   named. The trips on the departures board and the names on the sample
   ticket are illustrative. Change a number only with its source. */

const DEPARTURES: { trip: string; since: string; status: string[] }[] = [
  { trip: "Goa, pakka this time", since: "2023", status: ["Let's see", "Next month pakka", "Delayed"] },
  { trip: "Manali, college gang", since: "14 months", status: ["Dates not decided", "6 seen, 0 replies"] },
  { trip: "Coorg long weekend", since: "March", status: ["Waiting on Rohan", "Leave not approved"] },
  { trip: "Rishikesh rafting", since: "After appraisals", status: ["Quietly abandoned"] },
];

const FINDINGS = [
  {
    figure: "35%",
    text: "said a trip of theirs never happened because the dates never lined up.",
    source: "14 of 40 survey respondents",
  },
  {
    figure: "67%",
    text: "said one or two people ended up doing most or all of the planning.",
    source: "49-person survey",
  },
  {
    figure: "20%",
    text: "said one fell apart because planning got overwhelming and the momentum went.",
    source: "8 of 40 survey respondents",
  },
];

const VOICES = [
  { quote: "People don't respond properly. No follow-ups. Dates not decided. People go silent.", who: "Interview" },
  { quote: "Others expect that the one who initiated the trip will do all the work.", who: "Survey response" },
  { quote: "Keeping the momentum up so that plans don't die eventually.", who: "Survey response" },
];

const INCLUDED = [
  "As many trips and people as you like",
  "Live updates as friends answer",
  "Ready-to-send nudges in six tones",
  "Answer on behalf of anyone who won't tap a link",
  "A group budget limit that never shows who said what",
  "The confirmed ticket, a calendar file and a WhatsApp summary",
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Do my friends have to download or sign up for anything?",
    a: "No. They tap the link in the group chat and type the name the group knows them by. That is the whole onboarding. Only the person who starts the trip signs in, so the trip stays theirs.",
  },
  {
    q: "What about the one friend who never replies?",
    a: "Their name shows as waiting to the whole group, which does half the work. The organiser can send a nudge, answer on their behalf, or lock the stage without them.",
  },
  {
    q: "What if our dates just do not match?",
    a: "You see the longest stretch at least two of you share, and the organiser can shorten the trip to fit it with one tap. It tells you the truth early instead of three weeks in.",
  },
  {
    q: "What if plans change after we lock?",
    a: "The organiser can reopen the dates or the vote, one step back at a time. Nobody else can undo a decision, so it cannot be relitigated by whoever was offline.",
  },
  {
    q: "Does it book flights or stays, build an itinerary, or split expenses?",
    a: "No, on purpose. Good tools already do those. The part nobody had solved is getting a group to agree in the first place, so this does only that.",
  },
  {
    q: "What do you store about us?",
    a: "First names, the days each person marked, their vote, whether they are in, and an optional budget limit. Friends never give an email address or a phone number. There are no ads and nothing is sold.",
  },
  {
    q: "Is it really free?",
    a: "Yes. There is no paid plan and no card field anywhere. It was built as a product case study, so there is nothing to upsell.",
  },
];

/* ───────────────────────────── Small pieces ───────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="label-mono flex items-center gap-3">
      <span className="h-px w-8 bg-border-strong" aria-hidden="true" />
      {children}
    </p>
  );
}

/** One station on the route line: what the chat does, what the link does, and the thing itself. */
function Stop({
  number,
  name,
  inChat,
  children,
  visual,
}: {
  number: string;
  name: string;
  inChat: string;
  children: React.ReactNode;
  visual: React.ReactNode;
}) {
  return (
    <li className="relative grid items-center gap-8 md:grid-cols-2 md:gap-12 lg:gap-16">
      <span
        className="absolute -left-[calc(1.5rem+9px)] top-1 h-4 w-4 rounded-full border-2 border-ink bg-brand md:-left-[calc(2.5rem+9px)] lg:-left-[calc(3rem+9px)]"
        aria-hidden="true"
      />
      <Reveal>
        <p className="font-mono text-sm font-semibold text-text-tertiary">{number}</p>
        <h3 className="display mt-1 text-4xl sm:text-5xl">{name}</h3>
        <p className="mt-4 text-text-tertiary line-through decoration-1">
          <span className="sr-only">In the group chat: </span>
          {inChat}
        </p>
        <p className="mt-2 max-w-md text-lg leading-relaxed text-text-secondary">{children}</p>
      </Reveal>
      <Reveal delay={100} className="w-full max-w-sm md:justify-self-end">
        {visual}
      </Reveal>
    </li>
  );
}

/** Station 01: a calendar where yellow means overlap. */
function MiniCalendar() {
  // Three weeks from Mon 5 Jan 2026. 0 none, 1 to 3 heat, "me" my pick.
  const cells: (0 | 1 | 2 | 3 | "me")[] = [0, 1, 1, 0, 1, 2, 1, 1, 1, 2, 2, "me", "me", "me", 1, 0, 0, 1, 2, 3, 2];
  const best = new Set([11, 12, 13]);
  const heat = ["", "bg-heat-low text-heat-low-text", "bg-heat-medium text-heat-medium-text", "bg-heat-high text-heat-high-text"];
  return (
    <div className="panel p-4" aria-hidden="true">
      <div className="flex items-baseline justify-between">
        <p className="font-heading text-lg font-bold">January</p>
        <p className="label-mono">4 of 6 answered</p>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center font-mono text-[0.625rem] text-text-tertiary">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((c, i) => (
          <span
            key={i}
            className={[
              "flex aspect-square items-center justify-center rounded-lg font-mono text-xs font-medium",
              c === "me" ? "bg-primary text-on-primary" : c === 0 ? "text-text-tertiary" : heat[c],
              best.has(i) ? "outline outline-2 outline-offset-1 outline-border-strong" : "",
            ].join(" ")}
          >
            {i + 5}
          </span>
        ))}
      </div>
      <p className="mt-3 border-t border-border pt-3 text-sm">
        <span className="font-semibold">16 to 18 Jan.</span>{" "}
        <span className="text-text-secondary">4 of 6 can do all 3 days.</span>
      </p>
    </div>
  );
}

/** Station 02: votes as a results table. */
function MiniVote() {
  const rows = [
    { name: "Goa", note: "Beach shacks, 1 hr flight", votes: 4, icon: "beach" as const, mine: true },
    { name: "Gokarna", note: "Quieter, overnight train", votes: 2, icon: "water" as const, mine: false },
    { name: "Udaipur", note: "Lakes and forts", votes: 0, icon: "heritage" as const, mine: false },
  ];
  return (
    <div className="panel divide-y divide-border" aria-hidden="true">
      {rows.map((r) => (
        <div key={r.name} className={`px-4 py-3 ${r.mine ? "bg-primary-light" : ""}`}>
          <div className="flex items-center gap-3">
            <Icon name={r.icon} className="h-5 w-5 shrink-0 text-text-secondary" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight">
                {r.name} {r.mine && <span className="chip chip-ink ml-1 align-middle">Your vote</span>}
              </p>
              <p className="text-[0.8125rem] text-text-secondary">{r.note}</p>
            </div>
            <span className="font-mono text-xl font-semibold">{r.votes}</span>
          </div>
          <div className="mt-2 h-1 rounded-full bg-subtle">
            <div className="h-1 rounded-full bg-brand" style={{ width: `${(r.votes / 6) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Station 04: the plan going back into the chat it came from. */
function MiniMessage() {
  return (
    <div className="panel p-4" aria-hidden="true">
      <p className="label-mono flex items-center gap-2">
        <WhatsAppIcon className="h-3.5 w-3.5" /> Sent to the group
      </p>
      <div className="mt-3 rounded-xl rounded-tl-none bg-subtle px-3.5 py-3 text-[0.875rem] leading-relaxed">
        <p className="font-semibold">Goa, pakka this time is confirmed</p>
        <p className="mt-1.5 text-text-secondary">
          Goa
          <br />
          Fri 16 Jan to Sun 18 Jan (3 days)
          <br />
          Up to ₹15K per person
          <br />
          Going (5): Riya, Karthik, Meher, Zoya, Aanya
        </p>
        <p className="mt-1.5 break-all font-mono text-xs text-status-responded">plankarochalo.vercel.app/trip/goa-k7x2</p>
      </div>
    </div>
  );
}

/* ───────────────────────────── Page ───────────────────────────── */

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: site.name,
    applicationCategory: "TravelApplication",
    operatingSystem: "Web",
    description: site.description,
    url: site.url,
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav />

      <main id="main">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="mx-auto grid max-w-[1200px] gap-10 px-4 pb-16 pt-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14 lg:px-8 lg:pb-24 lg:pt-16">
          <div className="stagger">
            <p className="label-mono">For friend groups of 4 to 10 · Free</p>
            <h1 className="display mt-4 text-balance text-[clamp(2.875rem,7.6vw,5.5rem)] text-text">
              Get the <span className="marker">Goa plan</span> out of the group chat.
            </h1>
            <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-text-secondary">
              Drop one link in WhatsApp. Everyone taps the days they&apos;re free, votes on a place, and commits. Your
              friends don&apos;t download anything or sign up. You get a confirmed plan instead of &ldquo;let&apos;s
              see&rdquo;.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/demo" className="btn btn-brand btn-lg">
                Try it with five fake friends
                <Icon name="arrow-right" className="h-4 w-4" />
              </Link>
              <Link href="/login" className="btn btn-outline btn-lg">
                Start a trip
              </Link>
            </div>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.08em] text-text-tertiary">
              The demo needs no sign-up and takes about a minute
            </p>
            <p className="mt-6 border-t border-border pt-4 text-[0.9375rem] text-text-secondary">
              Built as a product case study.{" "}
              <Link href="/story" className="link inline-flex min-h-11 items-center">
                Read how it was made
              </Link>
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-[420px] lg:mt-2">
            <span
              lang="hi"
              className="stamp animate-stamp absolute bottom-[3.1rem] left-[41%] z-10 font-deva text-lg text-ink"
              style={{ animationDelay: "1.2s" }}
            >
              पक्का
            </span>
            <TripTicket
              className="paper animate-print lg:rotate-[1.5deg]"
              tripName="Goa, pakka this time"
              destination="Goa"
              destinationIcon="beach"
              dates="16 – 18 Jan"
              weekdays="Fri to Sun"
              days={3}
              budget="Up to ₹15K"
              pnr="K7X2"
              stamp="Confirmed"
              animateStamp
              passengers={[
                { name: "Riya", status: "in" },
                { name: "Karthik", status: "in" },
                { name: "Meher", status: "in" },
                { name: "Zoya", status: "in" },
                { name: "Aanya", status: "in" },
                { name: "Dev", status: "out" },
              ]}
            />
            <p className="mt-3 text-center font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-text-tertiary">
              A sample ticket. Yours has your group on it.
            </p>
          </div>
        </section>

        {/* ── Departures: the trips that never left ────────── */}
        <section className="bg-ink text-paper dark:border-y dark:border-border" aria-labelledby="departures-title">
          <div className="mx-auto max-w-[1200px] px-4 py-16 lg:px-8 lg:py-24">
            <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.09em] text-brand">Departures</p>
            <h2 id="departures-title" className="display mt-3 max-w-3xl text-[clamp(2.25rem,5.4vw,4rem)]">
              Every group has a trip that never left.
            </h2>

            <div className="mt-10 overflow-hidden rounded-xl border border-paper/20 font-mono">
              <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-4 border-b border-paper/20 px-4 py-2.5 text-[0.625rem] uppercase tracking-[0.14em] text-paper/60 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <span>Trip</span>
                <span className="hidden sm:block">Planned since</span>
                <span>Status</span>
              </div>
              {DEPARTURES.map((d, i) => (
                <div
                  key={d.trip}
                  className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] items-center gap-4 border-b border-paper/10 px-4 py-3.5 text-sm uppercase tracking-wide sm:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,1.2fr)] sm:text-base"
                >
                  <span className="truncate text-paper">{d.trip}</span>
                  <span className="hidden text-paper/60 sm:block">{d.since}</span>
                  <span className="text-brand">
                    <FlapText values={d.status} offset={i * 700} />
                  </span>
                </div>
              ))}
              <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] items-center gap-4 bg-brand px-4 py-3.5 text-sm font-semibold uppercase tracking-wide text-on-brand sm:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,1.2fr)] sm:text-base">
                <span>Your next one</span>
                <span className="hidden sm:block">This week</span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-ink animate-blink" aria-hidden="true" />
                  CNF
                </span>
              </div>
            </div>
            <p className="mt-3 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-paper/55">
              Illustrative. You know the real ones.
            </p>
          </div>
        </section>

        {/* ── The problem, in the words of the people who have it ── */}
        <section className="mx-auto max-w-[1200px] px-4 py-16 lg:px-8 lg:py-24" aria-labelledby="problem-title">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <Reveal className="lg:sticky lg:top-24 lg:self-start">
              <SectionLabel>What goes wrong</SectionLabel>
              <h2 id="problem-title" className="display mt-4 text-[clamp(2.25rem,5vw,3.75rem)]">
                It doesn&apos;t get cancelled. It just dies.
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-text-secondary">
                The research behind it: 27 interviews and 105 survey responses on how group trips fall apart.
                Nobody described a fight. They described silence.
              </p>
            </Reveal>

            <div>
              <dl className="divide-y divide-border border-y border-border">
                {FINDINGS.map((f) => (
                  <div
                    key={f.figure}
                    className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-4 py-5 sm:grid-cols-[8rem_minmax(0,1fr)]"
                  >
                    <dt className="display text-5xl text-text sm:text-6xl">{f.figure}</dt>
                    <dd>
                      <p className="text-lg leading-snug text-text">{f.text}</p>
                      <p className="mt-1 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-text-tertiary">
                        {f.source}
                      </p>
                    </dd>
                  </div>
                ))}
              </dl>

              <ul className="mt-10 space-y-6">
                {VOICES.map((v, i) => (
                  <li key={i}>
                    <Reveal delay={i * 80}>
                      <blockquote className="border-l-[3px] border-brand pl-4">
                        <p className="font-heading text-xl font-semibold leading-snug text-text sm:text-2xl">
                          &ldquo;{v.quote}&rdquo;
                        </p>
                        <footer className="mt-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-text-tertiary">
                          {v.who}, anonymised
                        </footer>
                      </blockquote>
                    </Reveal>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── How it works: four stations on one line ──────── */}
        <section id="how" className="scroll-mt-16 border-t border-border bg-surface" aria-labelledby="how-title">
          <div className="mx-auto max-w-[1200px] px-4 py-16 lg:px-8 lg:py-24">
            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
              <Reveal>
                <SectionLabel>How it works</SectionLabel>
                <h2 id="how-title" className="headline mt-4 text-[clamp(2.25rem,5vw,3.75rem)]">
                  Four stops. Each one locks before the next opens.
                </h2>
                <p className="mt-5 max-w-xl text-lg leading-relaxed text-text-secondary">
                  A group chat lets any decision be reopened by whoever was offline. Here, a decision stays decided
                  unless the organiser reopens it. This is a friend going from the link to the ticket, start to finish.
                </p>
                <Link href="/demo" className="link mt-4 inline-flex min-h-11 items-center gap-1.5">
                  Try the demo
                  <Icon name="arrow-right" className="h-4 w-4" />
                </Link>
              </Reveal>
              <Reveal delay={100}>
                <WalkthroughVideo />
              </Reveal>
            </div>

            <ol className="relative mt-16 space-y-16 border-l-2 border-border-strong pl-6 md:pl-10 lg:mt-24 lg:space-y-24 lg:pl-12">
              <Stop
                number="01"
                name="Dates"
                inChat="Scroll up through 200 messages and guess who is free when."
                visual={<MiniCalendar />}
              >
                Everyone taps the days they could travel. The calendar fills in yellow where people overlap, and the
                best window is the one the most people can do from start to finish.
              </Stop>
              <Stop
                number="02"
                name="Place"
                inChat="Eight suggestions, one poll, three votes."
                visual={<MiniVote />}
              >
                Anyone can add a place. One vote each, changeable until it locks. If it&apos;s a tie, the organiser
                breaks it.
              </Stop>
              <Stop
                number="03"
                name="Commit"
                inChat="A thumbs-up, which costs nothing and means little."
                visual={<HoldDemo />}
              >
                Saying yes takes a two-second hold the whole group can see. It is deliberately harder than a thumbs-up,
                so a yes means yes, and a no arrives early enough to plan around.
              </Stop>
              <Stop number="04" name="Go" inChat="The plan is somewhere above the memes." visual={<MiniMessage />}>
                Everyone gets the same ticket: where, when, who is in. One tap sends it back to the group, with a
                calendar entry for the dates.
              </Stop>
            </ol>

            <Reveal>
              <p className="mt-16 max-w-2xl border-t border-border pt-8 text-lg leading-relaxed text-text-secondary lg:mt-24">
                <span className="font-semibold text-text">It does one job.</span> No itineraries, no expense splitting,
                no bookings, no chat. Those have good tools already. This one gets a group from &ldquo;we should go
                somewhere&rdquo; to &ldquo;we&apos;re going&rdquo;.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── The deal ─────────────────────────────────────── */}
        <section className="border-t border-border bg-surface" aria-labelledby="offer-title">
          <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:px-8 lg:py-24">
            <Reveal className="lg:sticky lg:top-24 lg:self-start">
              <SectionLabel>The deal</SectionLabel>
              <h2 id="offer-title" className="mt-4">
                <span className="display block text-[clamp(5rem,15vw,10rem)] leading-[0.8] text-text">₹0</span>
                <span className="display mt-4 block text-3xl text-text sm:text-4xl">No card. No trial clock.</span>
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-text-secondary">
                Worst case, your group ignores the link and you are out one minute. Best case, you are the person who
                finally made the trip happen.
              </p>
            </Reveal>

            <Reveal delay={100}>
              <p className="label-mono">What you get</p>
              <ul className="mt-3 divide-y divide-border border-y border-border">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-3 py-3.5 text-lg text-text">
                    <Icon name="check" className="mt-1.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/demo" className="btn btn-primary btn-lg">
                  Try the demo
                  <Icon name="arrow-right" className="h-4 w-4" />
                </Link>
                <Link href="/login" className="btn btn-outline btn-lg">
                  Start a trip
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Questions ────────────────────────────────────── */}
        <section className="border-t border-border" aria-labelledby="faq-title">
          <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:px-8 lg:py-24">
            <Reveal className="lg:sticky lg:top-24 lg:self-start">
              <SectionLabel>Fair questions</SectionLabel>
              <h2 id="faq-title" className="headline mt-4 text-[clamp(2.25rem,5vw,3.75rem)]">
                &ldquo;My group will never use this.&rdquo;
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-text-secondary">
                The obvious objection, and a fair one. It is not an app: it is a link inside the chat they already use,
                and each step is a few taps. The conversation stays in WhatsApp. Only the deciding moves here.
              </p>
            </Reveal>
            <div className="border-t border-border-strong">
              {FAQ.map((item) => (
                <details key={item.q} className="group border-b border-border">
                  <summary className="flex min-h-[56px] items-center justify-between gap-4 py-4">
                    <span className="font-heading text-xl font-bold leading-tight text-text">{item.q}</span>
                    <Icon
                      name="plus"
                      className="h-5 w-5 shrink-0 text-text-secondary transition-transform duration-200 group-open:rotate-45"
                    />
                  </summary>
                  <p className="max-w-2xl pb-5 text-lg leading-relaxed text-text-secondary">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Last call ────────────────────────────────────── */}
        <section className="border-t border-ink bg-brand text-on-brand" aria-labelledby="cta-title">
          <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-8 px-4 py-16 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-24">
            <div>
              <p lang="hi" className="font-deva text-2xl font-bold">
                प्लान करो, चलो।
              </p>
              <h2 id="cta-title" className="display mt-2 text-[clamp(2.75rem,8vw,6rem)]">
                Make the plan. Then go.
              </h2>
              <p className="mt-4 max-w-lg text-lg leading-relaxed">
                The next long weekend is closer than your group thinks. Send one link tonight.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row lg:flex-col">
              <Link href="/demo" className="btn btn-lg bg-ink text-paper hover:opacity-90">
                Try the demo
                <Icon name="arrow-right" className="h-4 w-4" />
              </Link>
              <Link href="/login" className="btn btn-lg border-ink bg-transparent text-on-brand hover:bg-brand-deep">
                Start a trip
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
