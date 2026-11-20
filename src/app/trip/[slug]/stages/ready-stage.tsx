"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Member, Trip } from "@/lib/types";
import { addDays, diffDays, formatDayLong, formatRange, formatWeekday, todayKey } from "@/lib/dates";
import { budgetAnswers, findBudgetOverlap } from "@/lib/overlap";
import { friendlyError } from "@/lib/errors";
import { copyText, firstName, formatBudgetRange, formatRupeesShort, parseDestination, plural } from "@/lib/format";
import { Icon, Spinner, WhatsAppIcon } from "@/components/icons";
import { TripTicket, type TicketPassenger } from "@/components/trip-ticket";

const NO_LIMIT = 200_000;

/** Small deterministic generator so confetti is identical on every render. */
function seeded(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const CONFETTI_COLOURS = [
  "var(--color-brand)",
  "var(--color-accent)",
  "var(--color-text)",
  "var(--color-status-responded)",
];

function Confetti() {
  const pieces = useMemo(() => {
    const rand = seeded(20261120);
    return Array.from({ length: 28 }, (_, i) => ({
      left: 6 + rand() * 88,
      delay: rand() * 0.7,
      rotate: rand() * 360,
      colour: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
    }));
  }, []);
  return (
    <div className="confetti-container" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{ left: `${p.left}%`, background: p.colour, animationDelay: `${p.delay}s`, rotate: `${p.rotate}deg` }}
        />
      ))}
    </div>
  );
}

function icsEscape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");
}

/** Calendar files cap a line at 75 octets; longer ones continue on a line that starts with a space. */
function icsFold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += n;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/** An all-day calendar event for the trip, as an .ics file. */
function buildIcs(trip: Trip, destination: string, going: string[], url: string): string {
  const day = (key: string) => key.replace(/-/g, "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Plan Karo Chalo//Trip//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${trip.id}@plankarochalo`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${day(trip.locked_dates_start!)}`,
    // DTEND is exclusive for all-day events.
    `DTEND;VALUE=DATE:${day(addDays(trip.locked_dates_end!, 1))}`,
    `SUMMARY:${icsEscape(destination ? `${trip.name} (${destination})` : trip.name)}`,
    destination ? `LOCATION:${icsEscape(destination)}` : "",
    `DESCRIPTION:${icsEscape(`Going: ${going.join(", ")}\n${url}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .map(icsFold)
    .join("\r\n");
}

function countdown(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  const today = todayKey();
  const toStart = diffDays(today, start);
  if (toStart > 1) return `${toStart} days to go`;
  if (toStart === 1) return "Tomorrow";
  if (toStart === 0) return "Starts today";
  if (diffDays(today, end) >= 0) return "Happening now";
  return "Trip done";
}

/**
 * The payoff. One ticket that says where, when and who is confirmed, built to
 * be screenshotted and sent straight back to the group chat.
 */
export function ReadyStage({
  trip,
  members,
  currentMember,
  onMembersUpdated,
  demo,
}: {
  trip: Trip;
  members: Member[];
  currentMember: Member;
  isOrganizer: boolean;
  onMembersUpdated: () => Promise<void>;
  demo?: boolean;
}) {
  const supabase = createClient();
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const [celebrate, setCelebrate] = useState(false);
  const [saving, setSaving] = useState<"in" | "out" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setUrl(`${window.location.origin}${demo ? "/demo" : `/trip/${trip.slug}`}`);
  }, [demo, trip.slug]);

  // Confetti and the stamp landing play once per device, not on every visit.
  useEffect(() => {
    const key = `pkc_celebrated_${trip.id}`;
    try {
      if (localStorage.getItem(key) === "1" && !demo) return;
      localStorage.setItem(key, "1");
    } catch {
      // Storage unavailable: celebrate anyway.
    }
    setCelebrate(true);
  }, [trip.id, demo]);

  const going = members.filter((m) => m.status === "confirmed_in");
  const out = members.filter((m) => m.status === "confirmed_out");
  const undecided = members.filter((m) => m.status !== "confirmed_in" && m.status !== "confirmed_out");
  const mine: "in" | "out" | "undecided" =
    currentMember.status === "confirmed_in" ? "in" : currentMember.status === "confirmed_out" ? "out" : "undecided";

  const destination = parseDestination(trip.locked_destination);
  const range = formatRange(trip.locked_dates_start, trip.locked_dates_end);
  const weekdays =
    trip.locked_dates_start && trip.locked_dates_end && trip.locked_dates_start !== trip.locked_dates_end
      ? `${formatWeekday(trip.locked_dates_start)} to ${formatWeekday(trip.locked_dates_end)}`
      : formatWeekday(trip.locked_dates_start);

  // Only quote a budget when at least half the group actually shared one.
  const budget = useMemo(() => {
    const overlap = findBudgetOverlap(members);
    if (!overlap || budgetAnswers(members) * 2 < members.length) return null;
    if (overlap.min > 0) return formatBudgetRange(overlap.min, overlap.max);
    if (overlap.max >= NO_LIMIT) return null;
    return `Up to ${formatRupeesShort(overlap.max)}`;
  }, [members]);

  const passengers: TicketPassenger[] = [
    ...going.map((m) => ({ name: m.name, status: "in" as const })),
    ...undecided.map((m) => ({ name: m.name, status: "waiting" as const })),
    ...out.map((m) => ({ name: m.name, status: "out" as const })),
  ];
  const pnr = (trip.slug.split("-").pop() || trip.id.slice(0, 6)).toUpperCase().slice(0, 8);
  const left = countdown(trip.locked_dates_start, trip.locked_dates_end);

  // This text is pasted into WhatsApp, where emoji are the native punctuation.
  const summary = [
    `*${trip.name}* is confirmed ✅`,
    "",
    destination.name ? `📍 ${destination.name}` : null,
    trip.locked_dates_start && trip.locked_dates_end
      ? `🗓 ${formatDayLong(trip.locked_dates_start)} to ${formatDayLong(trip.locked_dates_end)} (${plural(trip.trip_days, "day")})`
      : null,
    budget ? `💰 ${budget} per person` : null,
    `👥 Going (${going.length}): ${going.map((m) => firstName(m.name)).join(", ")}`,
    "",
    url,
  ]
    .filter((line) => line !== null)
    .join("\n");

  async function handleCopy() {
    const ok = await copyText(summary);
    setCopied(ok ? "copied" : "failed");
    setTimeout(() => setCopied("idle"), 2200);
  }

  function handleCalendar() {
    if (!trip.locked_dates_start || !trip.locked_dates_end) return;
    const ics = buildIcs(
      trip,
      destination.name,
      going.map((m) => firstName(m.name)),
      url,
    );
    const href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = href;
    a.download = `${trip.slug || "trip"}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }

  async function answer(next: "in" | "out") {
    setSaving(next);
    setError("");
    const { error: e } = await supabase
      .from("members")
      .update({ status: next === "in" ? "confirmed_in" : "confirmed_out" })
      .eq("id", currentMember.id);
    if (e) setError(friendlyError(e));
    else await onMembersUpdated();
    setSaving(null);
  }

  const name = firstName(currentMember.name);
  const headline =
    mine === "in"
      ? `It's happening, ${name}.`
      : mine === "out"
        ? "The trip is on. You're sitting this one out."
        : "The trip is confirmed. Are you coming?";

  return (
    <div className="space-y-6">
      <div className="relative">
        {celebrate && mine === "in" && <Confetti />}
        <p className="label-mono">Chart prepared{left ? ` · ${left}` : ""}</p>
        <h2 className="mt-1.5 font-heading text-[2rem] font-extrabold leading-[1.05] text-text">{headline}</h2>
        <p className="mt-2 text-text-secondary">
          Send the ticket to the group so nobody can say they didn&apos;t know.
        </p>
      </div>

      {mine !== "in" && (
        <div className={`notice ${mine === "out" ? "" : "notice-wait"}`}>
          <Icon name={mine === "out" ? "info" : "clock"} className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{mine === "out" ? "Changed your mind?" : "You haven't said if you're in."}</p>
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button type="button" onClick={() => answer("in")} disabled={saving !== null} className="btn btn-go btn-sm">
                {saving === "in" ? <Spinner /> : <Icon name="check" className="h-4 w-4" />}
                {mine === "out" ? "Actually, I'm in" : "I'm in too"}
              </button>
              {mine === "undecided" && (
                <button
                  type="button"
                  onClick={() => answer("out")}
                  disabled={saving !== null}
                  className="btn btn-outline btn-sm"
                >
                  {saving === "out" ? <Spinner /> : null}
                  Can&apos;t make it
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <TripTicket
        tripName={trip.name}
        destination={destination.name || "To be decided"}
        destinationIcon={destination.icon}
        dates={range}
        weekdays={weekdays}
        days={trip.trip_days}
        budget={budget}
        passengers={passengers}
        pnr={pnr}
        stamp="Confirmed"
        animateStamp={celebrate}
        className={celebrate ? "animate-print" : ""}
      />

      {/* On a phone the one action stays on screen while the ticket scrolls under it. */}
      <div className="sticky bottom-0 z-20 -mx-4 border-t border-border bg-background px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:static sm:mx-0 sm:border-t-0 sm:bg-transparent sm:p-0">
        <a
          href={url ? `https://wa.me/?text=${encodeURIComponent(summary)}` : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!url}
          className="btn btn-whatsapp btn-lg btn-block"
        >
          <WhatsAppIcon />
          Send to the group
        </a>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={handleCalendar} className="btn btn-outline">
          <Icon name="calendar" className="h-4 w-4" />
          Add to calendar
        </button>
        <button type="button" onClick={handleCopy} className="btn btn-outline" aria-live="polite">
          <Icon name={copied === "copied" ? "check" : "copy"} className="h-4 w-4" />
          {copied === "copied" ? "Summary copied" : copied === "failed" ? "Copy failed" : "Copy summary"}
        </button>
      </div>

      <p className="text-sm text-text-tertiary">
        This page stays here as the record. Book travel and stays wherever you like: this tool only gets everyone to
        yes.
      </p>

      {demo && (
        <div className="border-t border-border pt-6">
          <p className="label-mono">End of the demo</p>
          <p className="mt-1.5 font-heading text-2xl font-bold leading-tight text-text">
            That took about a minute. In a group chat it takes weeks.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/login" className="btn btn-primary">
              Start a real trip
              <Icon name="arrow-right" className="h-4 w-4" />
            </Link>
            <Link href="/story" className="btn btn-outline">
              How this was built
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
