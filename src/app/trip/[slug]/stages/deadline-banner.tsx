"use client";

import { useEffect, useState } from "react";
import type { Trip } from "@/lib/types";
import { Icon } from "@/components/icons";

const HOURS: Record<string, number> = { "24h": 24, "48h": 48, "72h": 72 };
const HOUR_MS = 3_600_000;

/** The reply-by instant: when the trip was made plus the organiser's 24, 48 or 72 hours. */
function replyBy(trip: Trip): number | null {
  const hours = HOURS[trip.voting_deadline];
  if (!hours) return null;
  const created = new Date(trip.created_at).getTime();
  return Number.isNaN(created) ? null : created + hours * HOUR_MS;
}

function timeLeft(ms: number): string {
  const minutes = Math.max(Math.ceil(ms / 60_000), 1);
  if (minutes < 60) return `${minutes} min left`;
  const hours = Math.floor(minutes / 60);
  if (hours < 2) return minutes % 60 ? `${hours}h ${minutes % 60}m left` : `${hours}h left`;
  return `${hours}h left`;
}

/**
 * When the organiser asked for answers by. It is a nudge, not a gate: nothing
 * closes when the time passes, so the wording never says "closed".
 * Only meaningful while the trip is still collecting dates.
 */
export function DeadlineBanner({
  trip,
  isOrganizer,
  organiserName,
}: {
  trip: Trip;
  isOrganizer: boolean;
  /** First name of the organiser, for the line members see once the time has passed. */
  organiserName?: string;
}) {
  const deadline = replyBy(trip);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (deadline == null) return;
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [deadline]);

  if (deadline == null || trip.status !== "dates_open") return null;

  const left = deadline - now;

  if (left <= 0) {
    return (
      <div className="notice notice-wait">
        <Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0 text-status-waiting" />
        <p>
          The reply-by time has passed.{" "}
          {isOrganizer ? (
            <>Lock when you&apos;re ready.</>
          ) : (
            <>You can still answer until {organiserName || "the organiser"} locks.</>
          )}
        </p>
      </div>
    );
  }

  const urgent = left < 2 * HOUR_MS;
  const when = new Date(deadline).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" });

  return (
    <div className={`notice ${urgent ? "notice-wait" : "notice-info"}`}>
      <Icon
        name="clock"
        className={`mt-0.5 h-4 w-4 shrink-0 ${urgent ? "text-status-waiting" : "text-status-responded"}`}
      />
      <p>
        <span className="font-semibold">Reply by {when}.</span> {timeLeft(left)}.
      </p>
    </div>
  );
}
