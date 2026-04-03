"use client";

import { useState, useEffect, useMemo } from "react";
import type { Trip, Member, TripStatus } from "@/lib/types";

const STAGE_NAMES: Record<TripStatus, string> = {
  dates_open: "picking dates",
  destination_open: "voting on destination",
  commitment: "confirming attendance",
  ready: "confirmed",
};

const STAGE_ANNOUNCEMENTS: Record<TripStatus, string> = {
  dates_open: "Dates are open — pick your available days!",
  destination_open: "Dates are locked! Vote on where to go.",
  commitment: "Destination picked! Confirm you're in.",
  ready: "Trip is confirmed! 🎉",
};

function getStorageKey(tripId: string) {
  return `pkc_last_visit_${tripId}`;
}

function getLastVisit(tripId: string): { timestamp: string; stage: string; memberCount: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getStorageKey(tripId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveVisit(tripId: string, stage: string, memberCount: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    getStorageKey(tripId),
    JSON.stringify({ timestamp: new Date().toISOString(), stage, memberCount })
  );
}

export function SinceYouLeft({
  trip,
  members,
  currentMember,
}: {
  trip: Trip;
  members: Member[];
  currentMember: Member;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [lastVisit, setLastVisit] = useState<{ timestamp: string; stage: string; memberCount: number } | null>(null);
  const [isReturn, setIsReturn] = useState(false);

  useEffect(() => {
    const saved = getLastVisit(trip.id);
    if (saved) {
      setLastVisit(saved);
      setIsReturn(true);
    }
    // Save current visit (will be the "last visit" next time)
    saveVisit(trip.id, trip.status, members.length);
  }, [trip.id, trip.status, members.length]);

  const updates = useMemo(() => {
    if (!lastVisit || !isReturn) return [];

    const items: { icon: string; text: string; type: "stage" | "members" | "info" }[] = [];

    // Stage changed since last visit
    if (lastVisit.stage !== trip.status) {
      items.push({
        icon: "🎯",
        text: STAGE_ANNOUNCEMENTS[trip.status],
        type: "stage",
      });
    }

    // New members joined since last visit
    const newMembers = members.filter(
      (m) => m.id !== currentMember.id && m.created_at > lastVisit.timestamp
    );
    if (newMembers.length > 0) {
      const names = newMembers.map((m) => m.name).join(", ");
      items.push({
        icon: "👋",
        text: `${newMembers.length === 1 ? `${names} joined` : `${newMembers.length} new members: ${names}`}`,
        type: "members",
      });
    }

    // Member count changed but no new members detected (edge case)
    if (newMembers.length === 0 && members.length > lastVisit.memberCount) {
      const diff = members.length - lastVisit.memberCount;
      items.push({
        icon: "👥",
        text: `${diff} new ${diff === 1 ? "person" : "people"} joined the trip`,
        type: "members",
      });
    }

    // Pending count for current stage
    const responded = members.filter((m) => {
      if (trip.status === "dates_open") return !!m.availability_start;
      if (trip.status === "destination_open") return !!m.destination_vote;
      if (trip.status === "commitment") return m.status === "confirmed_in" || m.status === "confirmed_out";
      return true;
    });
    const pending = members.length - responded.length;
    if (pending > 0 && items.length > 0) {
      items.push({
        icon: "⏳",
        text: `${responded.length} of ${members.length} have responded — ${pending} still pending`,
        type: "info",
      });
    }

    return items;
  }, [lastVisit, isReturn, trip, members, currentMember.id]);

  // Don't show if no updates or dismissed or first visit
  if (!isReturn || updates.length === 0 || dismissed) return null;

  return (
    <div className="bg-pop-light border border-pop/15 rounded-2xl p-4 shadow-xs animate-in">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-pop uppercase tracking-wider flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Since you were here
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-text-tertiary hover:bg-pop/10 hover:text-text transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        {updates.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-2.5 animate-in"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <span className="text-base shrink-0">{item.icon}</span>
            <p className={[
              "text-sm leading-snug",
              item.type === "stage" ? "font-semibold text-text" : "text-text-secondary",
            ].join(" ")}>
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
