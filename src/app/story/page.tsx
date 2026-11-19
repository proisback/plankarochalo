import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { SiteFooter, SiteNav } from "@/components/landing/site-chrome";
import { site } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Case study: what 132 people told us about group trips",
  description:
    "The research, the wrong first assumption, the decisions and the results behind Plan Karo Chalo, a group trip coordinator for Indian friend groups.",
};

/* Everything on this page is taken from the project's own documents:
   PlanKaroChalo_Discovery_Document.md, PlanKaroChalo_Research_Appendix.md and
   PlanKaroChalo_PRD_v2.html. The two measured results (91.7%, 85.2%) are the
   author's measurement from the first test groups and are not recorded in a
   file in this repository. Research participants are never named. Survey
   percentages are shares of respondents. Change a number only with its source. */

const JOURNEY: { name: string; note: string; kill?: boolean }[] = [
  { name: "Spark", note: "“Let's go somewhere!” Twelve ideas across three conversations." },
  { name: "Dates", note: "Manual availability checks. Weeks of back-and-forth. Most trips stall here.", kill: true },
  { name: "Place", note: "Debates, expired polls, decision paralysis.", kill: true },
  { name: "Budget", note: "Rarely said out loud. Surfaces later as dropouts.", kill: true },
  { name: "Stay", note: "One person researches across several booking sites." },
  { name: "Itinerary", note: "Days of calls and blog research. General AI tools already do this." },
  { name: "On trip", note: "The organiser becomes GPS, concierge and accountant." },
  { name: "After", note: "Expense settlement drags on." },
];

const SCOPE: { pain: string; call: string; tone: "in" | "later" | "out"; why: string }[] = [
  { pain: "Aligning dates", call: "Built", tone: "in", why: "The most common failure point, and no tool solves it for informal groups." },
  { pain: "Seeing where the trip stands", call: "Built", tone: "in", why: "No shared view means no visible progress, and momentum dies." },
  { pain: "Agreeing on a place", call: "Built", tone: "in", why: "Chat polls have no context, no structure and no way to lock." },
  { pain: "One person doing everything", call: "Built in", tone: "in", why: "Two thirds of respondents said one or two people do the planning. Every screen has to take work off them." },
  { pain: "Budget mismatch", call: "Built, lightly", tone: "later", why: "Real, but people were lukewarm about sharing ranges. Kept optional and anonymous." },
  { pain: "Building the itinerary", call: "Not now", tone: "later", why: "General AI tools already do this well. It is not where groups fail." },
  { pain: "Splitting expenses", call: "Never", tone: "out", why: "A mature category with good tools. Interviewees rejected it outright." },
  { pain: "Booking travel and stays", call: "Never", tone: "out", why: "A different business. This is the step before booking." },
  { pain: "Chat", call: "Never", tone: "out", why: "The group already has a chat. A second one would be an abandoned one." },
];

const DECISIONS: { chose: string; rejected: string; why: string }[] = [
  {
    chose: "Tap individual days on a calendar.",
    rejected: "From and To date pickers with exceptions.",
    why: "The first build asked people to think in ranges and then subtract the days they could not do. Tapping the days you are free, like filling in a heat map, needed no explanation.",
  },
  {
    chose: "Show who has not answered, by name.",
    rejected: "Only a count, such as 4 of 7.",
    why: "An organiser put it plainly: show me who I am waiting on, so I know who to ping. The wording stays neutral. It says who is waiting, never who is to blame.",
  },
  {
    chose: "Budget asked after dates, and optional.",
    rejected: "Budget as a required step before dates could be saved.",
    why: "Budget is sensitive. When it blocked the date step, testers hesitated. Asked afterwards, with a way to skip, the main answer is always saved first.",
  },
];

const SECOND_PASS: { title: string; body: string }[] = [
  {
    title: "“Everyone has answered” needed a number.",
    body: "Stages advanced when everyone who had joined so far had answered. An organiser and the first friend to open the link could lock dates for a group of eight. The organiser now says how many people to expect, and a stage only locks by itself when that many have joined and answered. Otherwise the organiser locks it, with a confirmation that names who has not answered.",
  },
  {
    title: "The best dates were the busiest days, not the best trip.",
    body: "Windows were ranked by how many people were free on each day. Three people each free on two different days of a three-day window scored well, though nobody could do the whole trip. Windows are now ranked by how many people can do every day, and the screen says so: 4 of 6 can do all 3 days.",
  },
  {
    title: "The main button was below the fold, then disappeared.",
    body: "On a phone, Save sat under the calendar and three other blocks. After the first save it was replaced by a permanent confirmation, so later changes were silently dropped. Save is now a bar fixed to the bottom of the screen that appears whenever there is something unsaved.",
  },
  {
    title: "The lock screen promised a notification that did not exist.",
    body: "Nothing in the product sends a message. After a lock, the organiser now gets the news pre-written with one button to send it to the group, and the trip link previews in the chat with the trip's name and what it needs from you.",
  },
  {
    title: "The payoff was a receipt.",
    body: "The final screen was a card with an emoji and a copy button. It is now a ticket built to be screenshotted, with the place, the dates, every passenger marked confirmed or out, a calendar file and a one-tap send to the group.",
  },
  {
    title: "The look said nothing about who it was for.",
    body: "Orange gradients, rounded cards and emoji could have been any app. The redesign takes one idea every Indian traveller already knows, the railway reservation, and uses it throughout: the station board, the route line, the ticket, and the moment a name turns CNF.",
  },
];

function Heading({ part, children }: { part: number; children: React.ReactNode }) {
  return (
    <>
      <p className="label-mono">Part {part} of 7</p>
      <h2 className="headline mt-3 text-[clamp(2rem,4.6vw,3.25rem)] text-text">{children}</h2>
    </>
  );
}

const callChip = { in: "chip-go", later: "chip-wait", out: "chip-out" } as const;

export default function Story() {
  return (
    <>
      <SiteNav />
      <main id="main">
        {/* ── Title ── */}
        <header className="mx-auto max-w-[1200px] px-4 pb-12 pt-10 lg:px-8 lg:pb-16 lg:pt-16">
          <p className="label-mono">Case study · Plan Karo Chalo</p>
          <h1 className="display mt-4 max-w-5xl text-balance text-[clamp(2.75rem,7.4vw,5.5rem)] text-text">
            What 132 people told us about group trips, in <span className="marker">four screens</span>.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary">
            I set out to fix itinerary planning. 27 interviews and 105 survey responses said trips die earlier, at the
            dates. So I built the smallest thing that gets a group to commit, in 8 days. In the first test groups,
            91.7% of friends who joined went on to answer.
          </p>
          <dl className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Product, design and build", site.author.name],
              ["Research", "27 interviews and 105 survey responses, gathered with a product cohort"],
              ["First version", "8 days, April 2026"],
              ["First test", "91.7% of friends who joined answered"],
            ].map(([k, v]) => (
              <div key={k} className="bg-background p-4">
                <dt className="label-mono">{k}</dt>
                <dd className="mt-1.5 font-heading text-xl font-bold leading-tight text-text">{v}</dd>
              </div>
            ))}
          </dl>
        </header>

        {/* ── 1. Wrong about the problem ── */}
        <section className="border-t border-border">
          <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:px-8 lg:py-20">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <Heading part={1}>I was wrong about the problem.</Heading>
            </div>
            <div className="space-y-5 text-lg leading-relaxed text-text-secondary">
              <p>
                I started from an assumption: the painful part of a group trip is building the itinerary. I planned to
                make that easier.
              </p>
              <p>
                <span className="font-semibold text-text">It was the wrong problem.</span> Across 27 interviews and 105
                survey responses, covering friend groups, multi-family holidays, women&apos;s treks, couples, a
                motorcycle club and three-generation families, the trip was already dead long before anyone opened a
                map.
              </p>
              <ul className="divide-y divide-border border-y border-border text-text">
                <li className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-4 py-4">
                  <span className="display text-4xl">35%</span>
                  <span>of people surveyed said a trip did not happen because the dates could not be aligned.</span>
                </li>
                <li className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-4 py-4">
                  <span className="display text-4xl">20%</span>
                  <span>said one did not happen because planning became overwhelming and the momentum went.</span>
                </li>
                <li className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-4 py-4">
                  <span className="display text-4xl">67%</span>
                  <span>said one or two people did most or all of the planning.</span>
                </li>
              </ul>
              <p className="font-mono text-[0.6875rem] uppercase leading-relaxed tracking-[0.08em] text-text-tertiary">
                35% and 20%: 14 and 8 of 40 respondents in one survey. 67%: a second survey of 49.
              </p>
              <p>
                Two people from very different groups, one planning with college friends and one coordinating three
                generations of a family, described the same fix without being asked: one link, no download, see the
                status, tap and done. Both rejected expense tracking, in-app chat and anything that looked like a
                platform.
              </p>
            </div>
          </div>
        </section>

        {/* ── 2. The kill zone ── */}
        <section className="border-t border-border bg-ink text-paper dark:border-y">
          <div className="mx-auto max-w-[1200px] px-4 py-14 lg:px-8 lg:py-20">
            <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.09em] text-brand">Part 2 of 7</p>
            <h2 className="headline mt-3 max-w-3xl text-[clamp(2rem,4.6vw,3.25rem)]">
              A trip has eight stops. It dies at stops two to four.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-paper/75">
              In the interviews, trips that got past dates, place and budget mostly went ahead. So the product does
              those three things and deliberately stops.
            </p>

            {/* One bracket over stops 2 to 4 on wide screens. */}
            <div className="mt-12 hidden grid-cols-8 lg:grid" aria-hidden="true">
              <p className="col-span-3 col-start-2 mr-3 border-x-2 border-t-2 border-brand pt-2 text-center font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-brand">
                Trips die here
              </p>
            </div>
            <ol className="mt-10 grid gap-y-8 sm:grid-cols-2 lg:mt-4 lg:grid-cols-8 lg:gap-0">
              {JOURNEY.map((stop, i) => (
                <li key={stop.name} className="relative lg:pr-3">
                  <div className="flex items-center">
                    <span
                      className={[
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 font-mono text-[0.625rem] font-semibold",
                        stop.kill ? "border-brand bg-brand text-on-brand" : "border-paper/40 text-paper/70",
                      ].join(" ")}
                    >
                      {i + 1}
                    </span>
                    {i < JOURNEY.length - 1 && (
                      <span
                        className={`ml-1 hidden h-0.5 flex-1 lg:block ${stop.kill ? "bg-brand" : "bg-paper/20"}`}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <p className={`display mt-3 text-2xl ${stop.kill ? "text-brand" : "text-paper"}`}>{stop.name}</p>
                  {stop.kill && (
                    <p className="mt-1 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-brand lg:sr-only">
                      Trips die here
                    </p>
                  )}
                  <p className="mt-2 text-sm leading-snug text-paper/70">{stop.note}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── 3. What got built and what did not ── */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-[1200px] px-4 py-14 lg:px-8 lg:py-20">
            <Heading part={3}>Twelve complaints. Four became the product.</Heading>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-text-secondary">
              Saying no was most of the work. Here are the nine scope calls that mattered, each with its reason.
            </p>
            <div className="mt-10 border-t border-border-strong">
              {SCOPE.map((row) => (
                <div
                  key={row.pain}
                  className="grid gap-x-6 gap-y-1.5 border-b border-border py-4 md:grid-cols-[minmax(0,1.1fr)_9rem_minmax(0,2fr)] md:items-baseline"
                >
                  <p className="font-heading text-xl font-bold leading-tight text-text">{row.pain}</p>
                  <p>
                    <span className={`chip ${callChip[row.tone]}`}>{row.call}</span>
                  </p>
                  <p className="text-text-secondary">{row.why}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. Decisions ── */}
        <section className="border-t border-border bg-surface">
          <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:px-8 lg:py-20">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <Heading part={4}>Three decisions, and what each one turned down.</Heading>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-text-secondary">
                One belief sits under all of them: the trip should be harder to cancel than to confirm.
              </p>
            </div>
            <ol className="border-t border-border-strong">
              {DECISIONS.map((d, i) => (
                <li key={d.chose} className="border-b border-border py-6">
                  <p className="font-mono text-xs font-semibold text-text-tertiary">0{i + 1}</p>
                  <p className="mt-1 font-heading text-2xl font-bold leading-tight text-text">{d.chose}</p>
                  <p className="mt-1.5 text-text-tertiary line-through decoration-1">{d.rejected}</p>
                  <p className="mt-3 text-lg leading-relaxed text-text-secondary">{d.why}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── 5. Results ── */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-[1200px] px-4 py-14 lg:px-8 lg:py-20">
            <Heading part={5}>What happened when groups used it.</Heading>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-text-secondary">
              I set five targets before launch. Two have been measured so far, from the product&apos;s own data after
              the first test groups had planned on it.
            </p>

            <dl className="mt-10 grid border-y border-border-strong sm:grid-cols-2 sm:divide-x sm:divide-border">
              <div className="flex flex-col border-b border-border py-8 sm:border-b-0 sm:pr-8">
                <dt className="order-2 mt-3 max-w-sm text-lg text-text">
                  of friends who joined a trip went on to answer.
                  <span className="mt-1 block font-mono text-xs uppercase tracking-[0.08em] text-text-tertiary">
                    Target: over 70%
                  </span>
                </dt>
                <dd className="display text-6xl text-text sm:text-7xl">91.7%</dd>
              </div>
              <div className="flex flex-col py-8 sm:pl-8">
                <dt className="order-2 mt-3 max-w-sm text-lg text-text">
                  answered within 48 hours of joining.
                  <span className="mt-1 block font-mono text-xs uppercase tracking-[0.08em] text-text-tertiary">
                    Target: over 70%
                  </span>
                </dt>
                <dd className="display text-6xl text-text sm:text-7xl">85.2%</dd>
              </div>
            </dl>
            <p className="mt-3 font-mono text-[0.6875rem] uppercase leading-relaxed tracking-[0.08em] text-text-tertiary">
              First test groups, April 2026. A small sample, not an independent study. Not yet measured: how many trips
              reach a ticket, how long dates take to lock, how many friends come back.
            </p>

            <ul className="mt-10 grid gap-x-12 gap-y-4 text-lg leading-relaxed text-text-secondary md:grid-cols-3">
              <li className="flex gap-3">
                <Icon name="check" className="mt-2 h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />
                Nobody asked how to pick dates. Tapping days on the calendar needed no instruction.
              </li>
              <li className="flex gap-3">
                <Icon name="check" className="mt-2 h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />
                The two-second hold was the moment people remarked on. They called it serious and real.
              </li>
              <li className="flex gap-3">
                <Icon name="check" className="mt-2 h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />
                Coming back to a short note about what had changed since the last visit was the most praised detail.
              </li>
            </ul>
          </div>
        </section>

        {/* ── 6. The second pass ── */}
        <section className="border-t border-border bg-surface">
          <div className="mx-auto max-w-[1200px] px-4 py-14 lg:px-8 lg:py-20">
            <Heading part={6}>Seven months later: a hard second look.</Heading>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-text-secondary">
              The first version shipped in eight days and it showed. In November 2026 I put the product, the flows and
              the code through a line-by-line review with one instruction: find what a stranger would trip over. These
              are the six findings that mattered most, and what changed.
            </p>

            <div className="mt-10 grid max-w-3xl grid-cols-2 gap-4 sm:gap-8">
              <figure>
                <div className="overflow-hidden rounded-2xl border border-border bg-background">
                  <Image
                    src="/story/before-ticket.png"
                    alt="The old final screen: a rounded card with an emoji, pill-shaped name chips and confetti."
                    width={780}
                    height={1560}
                    className="h-auto w-full"
                    sizes="(min-width: 640px) 360px, 45vw"
                  />
                </div>
                <figcaption className="label-mono mt-2">Before · April 2026</figcaption>
              </figure>
              <figure>
                <div className="overflow-hidden rounded-2xl border border-border-strong bg-background">
                  <Image
                    src="/story/after-ticket.png"
                    alt="The new final screen: a printed-style ticket with the destination, dates and each passenger marked confirmed."
                    width={780}
                    height={1560}
                    className="h-auto w-full"
                    sizes="(min-width: 640px) 360px, 45vw"
                  />
                </div>
                <figcaption className="label-mono mt-2 text-text">After · November 2026</figcaption>
              </figure>
            </div>

            <ol className="mt-12 grid gap-x-12 border-t border-border-strong md:grid-cols-2">
              {SECOND_PASS.map((item, i) => (
                <li key={item.title} className="border-b border-border py-6">
                  <p className="font-mono text-xs font-semibold text-text-tertiary">0{i + 1}</p>
                  <p className="mt-1 font-heading text-2xl font-bold leading-tight text-text">{item.title}</p>
                  <p className="mt-3 leading-relaxed text-text-secondary">{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── 7. Honest limits ── */}
        <section className="border-t border-border">
          <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:px-8 lg:py-20">
            <div>
              <Heading part={7}>What it still gets wrong.</Heading>
            </div>
            <ul className="divide-y divide-border border-y border-border text-lg leading-relaxed text-text-secondary">
              <li className="py-4">
                <span className="font-semibold text-text">It cannot reach anyone.</span> There are no notifications.
                The group chat is the only channel, so the product writes the message and a person still has to send
                it.
              </li>
              <li className="py-4">
                <span className="font-semibold text-text">Identity lives in one browser.</span> A friend who clears
                their data or switches phones comes back as a stranger. The organiser can take over their entry, which
                is a patch, not a fix.
              </li>
              <li className="py-4">
                <span className="font-semibold text-text">The evidence is thin.</span> The numbers above come from a
                handful of test groups. The next honest step is more groups, and counting how many trips actually
                happen.
              </li>
            </ul>
          </div>
        </section>

        {/* ── Close ── */}
        <section className="border-t border-ink bg-brand text-on-brand">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-14 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-20">
            <h2 className="display max-w-2xl text-[clamp(2.25rem,6vw,4.5rem)]">See it work in a minute.</h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/demo" className="btn btn-lg bg-ink text-paper hover:opacity-90">
                Try the demo
                <Icon name="arrow-right" className="h-4 w-4" />
              </Link>
              {site.linkRepo ? (
                <a
                  href={site.repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-lg border-ink bg-transparent text-on-brand hover:bg-brand-deep"
                >
                  Read the code
                  <Icon name="external" className="h-4 w-4" />
                </a>
              ) : (
                <Link href="/" className="btn btn-lg border-ink bg-transparent text-on-brand hover:bg-brand-deep">
                  See the landing page
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
