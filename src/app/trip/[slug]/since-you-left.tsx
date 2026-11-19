"use client";

import { useEffect, useRef, useState } from "react";
import type { Member, Trip, TripStatus } from "@/lib/types";
import { STAGES } from "@/lib/types";
import { isDemo } from "@/lib/supabase/client";
import { formatRange } from "@/lib/dates";
import { firstName, parseDestination, people, plural } from "@/lib/format";
import { Icon } from "@/components/icons";

interface Visit {
  timestamp: string;
  stage: TripStatus;
  memberCount: number;
  tripDays?: number;
}

interface Line {
  text: string;
  /** The stage change leads; everything else is detail. */
  lead?: boolean;
}

/** Reloading the page a moment later is not "coming back". */
const MIN_AWAY_MS = 2 * 60_000;

const storageKey = (tripId: string) => `pkc_last_visit_${tripId}`;

function readVisit(tripId: string): Visit | null {
  try {
    const raw = localStorage.getItem(storageKey(tripId));
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Visit> | null;
    if (!v || typeof v.timestamp !== "string" || Number.isNaN(Date.parse(v.timestamp))) return null;
    if (!STAGES.some((s) => s.key === v.stage)) return null;
    return {
      timestamp: v.timestamp,
      stage: v.stage as TripStatus,
      memberCount: typeof v.memberCount === "number" ? v.memberCount : 0,
      tripDays: typeof v.tripDays === "number" ? v.tripDays : undefined,
    };
  } catch {
    return null;
  }
}

function saveVisit(trip: Trip, memberCount: number) {
  try {
    const visit: Visit = {
      timestamp: new Date().toISOString(),
      stage: trip.status,
      memberCount,
      tripDays: trip.trip_days,
    };
    localStorage.setItem(storageKey(trip.id), JSON.stringify(visit));
  } catch {
    // Private mode or storage is full. The card simply won't show next time.
  }
}

function listNames(names: string[]): string {
  const shown = names.slice(0, 3);
  const rest = names.length - shown.length;
  if (rest > 0) return `${shown.join(", ")} and ${rest} ${rest === 1 ? "other" : "others"}`;
  if (shown.length <= 1) return shown.join("");
  return `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
}

function whatChanged(prev: Visit, trip: Trip, members: Member[], me: Member): Line[] {
  const lines: Line[] = [];
  const order = STAGES.map((s) => s.key);
  const was = order.indexOf(prev.stage);
  const now = order.indexOf(trip.status);
  const range = formatRange(trip.locked_dates_start, trip.locked_dates_end);
  const place = parseDestination(trip.locked_destination).name;
  const plan = [place, range].filter(Boolean).join(", ");

  if (now > was) {
    if (trip.status === "destination_open") {
      lines.push({ lead: true, text: `Dates are locked${range ? `: ${range}` : ""}. Now voting on the place.` });
    } else if (trip.status === "commitment") {
      const locked = prev.stage === "dates_open" ? "Dates and place are locked" : "The place is locked";
      const what = prev.stage === "dates_open" ? plan : place;
      lines.push({ lead: true, text: `${locked}${what ? `: ${what}` : ""}. Now everyone says if they're in.` });
    } else {
      lines.push({ lead: true, text: `The trip is confirmed${plan ? `: ${plan}` : ""}.` });
    }
  } else if (now < was) {
    if (trip.status === "dates_open") lines.push({ lead: true, text: "Dates were reopened. Check your days." });
    else if (trip.status === "destination_open") lines.push({ lead: true, text: "The vote on the place was reopened." });
    else lines.push({ lead: true, text: "Commitments were reopened. Check if you're still in." });
  }

  const since = Date.parse(prev.timestamp);
  const arrived = members.filter((m) => m.id !== me.id && Date.parse(m.created_at) > since);
  const joined = arrived.filter((m) => !m.is_proxy).map((m) => firstName(m.name));
  const added = arrived.filter((m) => m.is_proxy).map((m) => firstName(m.name));
  if (joined.length > 0) lines.push({ text: `${listNames(joined)} joined.` });
  // The organiser added these people; no need to tell them so.
  if (added.length > 0 && !me.is_organizer) {
    lines.push({ text: `${listNames(added)} ${added.length === 1 ? "was" : "were"} added to the group.` });
  }
  // Clocks disagree sometimes. If the group grew and nobody looks new by time, still say so.
  if (arrived.length === 0 && prev.memberCount > 0 && members.length > prev.memberCount) {
    lines.push({ text: `${people(members.length - prev.memberCount)} joined.` });
  }

  if (prev.tripDays && prev.tripDays !== trip.trip_days) {
    lines.push({
      text: `The trip is now ${plural(trip.trip_days, "day")} (was ${prev.tripDays}).${
        trip.status === "dates_open" ? " Check your dates." : ""
      }`,
    });
  }

  return lines;
}

/**
 * Tells someone coming back what moved while they were away: a stage that
 * locked, people who joined, a trip that changed length.
 *
 * The last visit lives in localStorage. It is read exactly once, after the
 * group has loaded, and only then replaced. (Saving on first render, before
 * anyone had loaded, is what used to tell every first-time visitor that five
 * new people had joined.) What the card says is fixed at that moment: things
 * that happen while you are looking are not "since you were here".
 */
export function SinceYouLeft({ trip, members, currentMember }: { trip: Trip; members: Member[]; currentMember: Member }) {
  const [lines, setLines] = useState<Line[]>([]);
  const started = useRef(false);
  const latest = useRef({ trip, count: members.length });
  latest.current = { trip, count: members.length };
  const loaded = members.length > 0;

  useEffect(() => {
    // The demo trip is rebuilt on every load, so there is no "last time".
    if (!loaded || started.current || isDemo()) return;
    started.current = true;
    const prev = readVisit(trip.id);
    if (prev && Date.now() - Date.parse(prev.timestamp) > MIN_AWAY_MS) {
      setLines(whatChanged(prev, trip, members, currentMember));
    }
    saveVisit(trip, members.length);
  }, [loaded, trip, members, currentMember]);

  // Leaving is the moment that counts as "when you were last here".
  useEffect(() => {
    if (isDemo()) return;
    const save = () => {
      if (started.current && latest.current.count > 0) saveVisit(latest.current.trip, latest.current.count);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") save();
    };
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", onVisibility);
      save();
    };
  }, []);

  if (lines.length === 0) return null;

  return (
    <section className="notice notice-info animate-in" aria-label="Since you were here">
      <div className="min-w-0 flex-1">
        <p className="label-mono text-status-responded">Since you were here</p>
        <ul className="mt-1.5 space-y-1">
          {lines.map((line) => (
            <li key={line.text} className={line.lead ? "font-semibold" : undefined}>
              {line.text}
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={() => setLines([])}
        className="icon-btn -my-2 -mr-2.5 shrink-0"
        aria-label="Dismiss"
      >
        <Icon name="x" className="h-4 w-4" />
      </button>
    </section>
  );
}
