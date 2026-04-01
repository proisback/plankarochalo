"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Trip, Member } from "@/lib/types";
import { findBestOverlap } from "@/lib/overlap";
import { MemberList, WaitingBanner } from "./member-list";
import { LockButton } from "./lock-button";
import Calendar from "./calendar";

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

  function handleCalendarSelect(dateKey: string) {
    if (!startDate || (startDate && endDate)) {
      // First click or reset: set start
      setStartDate(dateKey);
      setEndDate("");
    } else {
      // Second click: set end (swap if needed)
      if (dateKey < startDate) {
        setEndDate(startDate);
        setStartDate(dateKey);
      } else {
        setEndDate(dateKey);
      }
    }
  }

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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-lg font-semibold">When are you free?</h2>
        <p className="text-text-secondary text-sm">
          {!startDate
            ? `Tap your start date — looking for a ${trip.trip_days}-day window`
            : !endDate
              ? "Now tap your end date"
              : "Your dates are set — waiting for others"}
        </p>
      </div>

      {/* Selected range display */}
      {startDate && (
        <div className="flex items-center gap-2 bg-primary-light rounded-xl px-3 py-2">
          <span className="text-base">📅</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-text">
              {endDate
                ? `${new Date(startDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – ${new Date(endDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`
                : `${new Date(startDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} → pick end date`}
            </p>
          </div>
          <button
            onClick={() => { setStartDate(""); setEndDate(""); }}
            className="text-text-secondary hover:text-text text-base"
          >
            ✕
          </button>
        </div>
      )}

      {/* Calendar */}
      <Calendar
        startDate={startDate}
        endDate={endDate}
        onSelect={handleCalendarSelect}
        dateMap={dateMap}
      />

      {/* From / To inputs + submit */}
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
          className="w-full bg-primary text-white rounded-xl px-4 py-3 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : hasSubmitted ? "Update dates" : "Submit dates"}
        </button>
      </div>

      {/* Best overlap result */}
      {best && (
        <div className="bg-emerald-50 border border-accent/20 rounded-xl p-4">
          <p className="text-[11px] font-bold text-accent uppercase tracking-wide mb-1">
            Best {trip.trip_days}-day window found
          </p>
          <p className="font-heading text-lg font-bold text-text">
            {best.start.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} –{" "}
            {best.end.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
          </p>
          <p className="text-text-secondary text-sm mt-1">
            {best.minCount} of {members.filter(m => m.availability_start).length} people available all days: {best.memberNames.join(", ")}
          </p>
        </div>
      )}

      <WaitingBanner members={members} />
      <MemberList members={members} />

      {isOrganizer && best && (
        <LockButton
          label={`Lock Dates → ${best.start.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – ${best.end.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`}
          confirmMessage={`Lock dates to ${best.start.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – ${best.end.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}? This will notify the group and open destination voting.`}
          onLock={handleLockDates}
        />
      )}
    </div>
  );
}
