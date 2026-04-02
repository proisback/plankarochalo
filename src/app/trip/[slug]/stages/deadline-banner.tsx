"use client";

import { useState, useEffect } from "react";
import type { Trip } from "@/lib/types";

/**
 * Calculates deadline time from trip creation + voting_deadline offset.
 * Returns null if no deadline set.
 */
function getDeadlineTime(trip: Trip): Date | null {
  if (!trip.voting_deadline || trip.voting_deadline === "none") return null;

  const hours: Record<string, number> = {
    "24h": 24,
    "48h": 48,
    "72h": 72,
  };

  const h = hours[trip.voting_deadline];
  if (!h) return null;

  const created = new Date(trip.created_at);
  return new Date(created.getTime() + h * 60 * 60 * 1000);
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return "0m";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function DeadlineBanner({
  trip,
  isOrganizer,
}: {
  trip: Trip;
  isOrganizer: boolean;
}) {
  const [now, setNow] = useState(() => new Date());
  const deadline = getDeadlineTime(trip);

  // Tick every minute
  useEffect(() => {
    if (!deadline) return;
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!deadline) return null;

  const msLeft = deadline.getTime() - now.getTime();
  const expired = msLeft <= 0;

  if (expired) {
    return (
      <div className="bg-status-pending-bg border border-status-pending/20 rounded-xl px-4 py-3">
        <p className="text-status-pending text-sm font-medium">
          ⏰ Voting deadline has passed
        </p>
        {isOrganizer && (
          <p className="text-status-pending/70 text-xs mt-0.5">
            Lock the current stage to move forward.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-status-pending-bg border border-status-pending/20 rounded-xl px-4 py-3">
      <p className="text-status-pending text-sm font-medium">
        ⏰ Voting closes in {formatTimeLeft(msLeft)}
      </p>
    </div>
  );
}
