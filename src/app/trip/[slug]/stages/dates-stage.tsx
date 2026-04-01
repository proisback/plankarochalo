"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Trip, Member } from "@/lib/types";
import { findBestOverlap } from "@/lib/overlap";
import { MemberList, WaitingBanner } from "./member-list";
import { LockButton } from "./lock-button";

export function DatesStage({
  trip,
  members,
  currentMember,
  isOrganizer,
}: {
  trip: Trip;
  members: Member[];
  currentMember: Member;
  isOrganizer: boolean;
}) {
  const supabase = createClient();
  const [startDate, setStartDate] = useState(currentMember.availability_start || "");
  const [endDate, setEndDate] = useState(currentMember.availability_end || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const hasSubmitted = !!currentMember.availability_start;

  const { best, dateMap } = useMemo(
    () => findBestOverlap(members, trip.trip_days),
    [members, trip.trip_days]
  );

  async function handleSave() {
    if (!startDate || !endDate) return;
    setSaving(true);
    setError("");

    const { error: saveError } = await supabase
      .from("members")
      .update({
        availability_start: startDate,
        availability_end: endDate,
        status: "responded",
      })
      .eq("id", currentMember.id);

    if (saveError) setError(saveError.message);
    setSaving(false);
  }

  async function handleLockDates() {
    if (!best) return;

    await supabase
      .from("trips")
      .update({
        status: "destination_open",
        locked_dates_start: best.start.toISOString().split("T")[0],
        locked_dates_end: best.end.toISOString().split("T")[0],
      })
      .eq("id", trip.id);
  }

  // Build a simple heatmap for the next 60 days
  const today = new Date();
  const calendarDays: { date: string; count: number }[] = [];
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split("T")[0];
    calendarDays.push({ date: key, count: (dateMap.get(key) || []).length });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-lg font-semibold">When are you free?</h2>
        <p className="text-text-secondary text-sm">
          Pick the dates you&apos;re available for a {trip.trip_days}-day trip.
        </p>
      </div>

      {/* Availability heatmap */}
      {dateMap.size > 0 && (
        <div className="bg-surface border border-gray-100 rounded-xl p-4">
          <p className="text-xs text-text-secondary mb-2">Group availability</p>
          <div className="flex flex-wrap gap-1">
            {calendarDays.map(({ date, count }) => {
              const d = new Date(date);
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div
                  key={date}
                  title={`${date}: ${count} available`}
                  className={`w-7 h-7 rounded text-[9px] flex items-center justify-center ${
                    count === 0
                      ? isWeekend
                        ? "bg-gray-100 text-text-secondary"
                        : "bg-gray-50 text-text-secondary"
                      : count === 1
                        ? "bg-orange-100 text-orange-700"
                        : count <= 3
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-emerald-200 text-emerald-800 font-medium"
                  }`}
                >
                  {d.getDate()}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 mt-2 text-[9px] text-text-secondary">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-gray-50" /> 0
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-orange-100" /> 1
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-100" /> 2-3
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-200" /> 4+
            </span>
          </div>
        </div>
      )}

      {/* Date inputs */}
      <div className="bg-surface border border-gray-100 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>
        {error && <p className="text-status-out text-sm">{error}</p>}
        <button
          onClick={handleSave}
          disabled={saving || !startDate || !endDate}
          className="w-full bg-primary text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : hasSubmitted ? "Update dates" : "Submit dates"}
        </button>
      </div>

      {/* Best overlap result */}
      {best && (
        <div className="bg-primary-light border border-primary/20 rounded-xl p-4">
          <p className="text-sm font-medium text-primary">
            Best {trip.trip_days}-day window
          </p>
          <p className="text-sm mt-1">
            {best.start.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} —{" "}
            {best.end.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {best.minCount} people can make all days: {best.memberNames.join(", ")}
          </p>
        </div>
      )}

      <WaitingBanner members={members} />
      <MemberList members={members} />

      {isOrganizer && best && (
        <LockButton
          label="Lock these dates"
          confirmMessage={`Lock dates to ${best.start.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} — ${best.end.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}? This will notify the group and open destination voting.`}
          onLock={handleLockDates}
        />
      )}
    </div>
  );
}
