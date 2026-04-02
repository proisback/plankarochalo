"use client";

import { useState, useEffect } from "react";
import type { Trip } from "@/lib/types";

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

  useEffect(() => {
    if (!deadline) return;
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!deadline) return null;

  const msLeft = deadline.getTime() - now.getTime();
  const expired = msLeft <= 0;
  const urgent = msLeft > 0 && msLeft < 2 * 60 * 60 * 1000; // < 2 hours

  if (expired) {
    return (
      <div className="bg-status-out-bg/60 border border-status-out/10 rounded-xl px-4 py-3 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-status-out/10 flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-status-out" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-status-out text-sm font-semibold">Voting deadline passed</p>
          {isOrganizer && (
            <p className="text-status-out/60 text-xs mt-0.5">
              Lock the current stage to move forward.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={[
      "border rounded-xl px-4 py-3 flex items-center gap-2.5",
      urgent
        ? "bg-status-waiting-bg/60 border-status-waiting/10"
        : "bg-status-pending-bg/60 border-status-pending/10",
    ].join(" ")}>
      <div className={[
        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
        urgent ? "bg-status-waiting/10" : "bg-status-pending/10",
      ].join(" ")}>
        <svg className={[
          "w-3.5 h-3.5",
          urgent ? "text-status-waiting animate-pulse-soft" : "text-status-pending",
        ].join(" ")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className={[
        "text-sm font-medium",
        urgent ? "text-status-waiting" : "text-status-pending",
      ].join(" ")}>
        Voting closes in <span className="font-bold">{formatTimeLeft(msLeft)}</span>
      </p>
    </div>
  );
}
