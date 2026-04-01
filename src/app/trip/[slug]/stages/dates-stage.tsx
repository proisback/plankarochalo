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
  onMembersUpdated,
}: {
  trip: Trip;
  members: Member[];
  currentMember: Member;
  isOrganizer: boolean;
  onMembersUpdated?: () => Promise<void>;
}) {
  const supabase = createClient();
  const [startDate, setStartDate] = useState(currentMember.availability_start || "");
  const [endDate, setEndDate] = useState(currentMember.availability_end || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const hasSubmitted = !!currentMember.availability_start;

  // Mark-available state
  const [markChecked, setMarkChecked] = useState<Record<string, boolean>>({});
  const [markingAvailable, setMarkingAvailable] = useState(false);

  const { best, dateMap } = useMemo(
    () => findBestOverlap(members, trip.trip_days),
    [members, trip.trip_days]
  );

  // Waiting members eligible for mark-available (no constraint conflict with best window)
  const waitingMembers = useMemo(() => {
    if (!best) return [];
    const windowStart = best.start.toISOString().split("T")[0];
    const windowEnd = best.end.toISOString().split("T")[0];

    return members
      .filter((m) => m.status === "invited" || m.status === "no_response")
      .map((m) => {
        let hasConflict = false;
        if (m.constraint_start && m.constraint_end) {
          hasConflict =
            m.constraint_start <= windowEnd && m.constraint_end >= windowStart;
        }
        return { member: m, hasConflict };
      });
  }, [best, members]);

  // Initialize checkbox state for eligible members (auto-check non-conflicting)
  useMemo(() => {
    const initial: Record<string, boolean> = {};
    for (const { member, hasConflict } of waitingMembers) {
      // Only set defaults for members not already in the checked state
      if (markChecked[member.id] === undefined) {
        initial[member.id] = !hasConflict;
      }
    }
    if (Object.keys(initial).length > 0) {
      setMarkChecked((prev) => ({ ...prev, ...initial }));
    }
  }, [waitingMembers]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkedCount = waitingMembers.filter(
    ({ member }) => markChecked[member.id]
  ).length;

  function handleCalendarSelect(dateKey: string) {
    if (!startDate || (startDate && endDate)) {
      setStartDate(dateKey);
      setEndDate("");
    } else {
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

  async function handleMarkAvailable() {
    if (!best || checkedCount === 0) return;
    setMarkingAvailable(true);
    setError("");

    const windowStart = best.start.toISOString().split("T")[0];
    const windowEnd = best.end.toISOString().split("T")[0];
    const memberIds = waitingMembers
      .filter(({ member }) => markChecked[member.id])
      .map(({ member }) => member.id);

    const { error: updateError } = await supabase
      .from("members")
      .update({
        availability_start: windowStart,
        availability_end: windowEnd,
        status: "responded",
      })
      .in("id", memberIds);

    if (updateError) setError(updateError.message);
    await onMembersUpdated?.();
    setMarkingAvailable(false);
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
        <h2 className="font-heading text-lg font-semibold">
          {currentMember.name}, when works for you?
        </h2>
        <p className="text-text-secondary text-sm">
          {!startDate
            ? `Drop your available dates — we're hunting for a ${trip.trip_days}-day window.`
            : !endDate
              ? "Now tap your end date."
              : "Locked in. Now we wait for the crew."}
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

      {/* Mark waiting members as available (organizer only) */}
      {isOrganizer && best && waitingMembers.length > 0 && (
        <div className="bg-surface border border-gray-100 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium">Mark waiting members as available</p>
          <div className="space-y-2">
            {waitingMembers.map(({ member, hasConflict }) => (
              <label
                key={member.id}
                className="flex items-center gap-3 py-1 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={markChecked[member.id] ?? !hasConflict}
                  onChange={(e) =>
                    setMarkChecked((prev) => ({
                      ...prev,
                      [member.id]: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent/30"
                />
                <span className="text-sm flex-1">{member.name}</span>
                {hasConflict && (
                  <span className="text-xs text-status-waiting">
                    ⚠ conflict{" "}
                    {member.constraint_start &&
                      new Date(member.constraint_start).toLocaleDateString(
                        "en-IN",
                        { day: "numeric", month: "short" }
                      )}
                    {"–"}
                    {member.constraint_end &&
                      new Date(member.constraint_end).toLocaleDateString(
                        "en-IN",
                        { day: "numeric", month: "short" }
                      )}
                  </span>
                )}
              </label>
            ))}
          </div>
          <button
            onClick={handleMarkAvailable}
            disabled={markingAvailable || checkedCount === 0}
            className="w-full bg-accent text-white rounded-xl px-4 py-3 text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {markingAvailable
              ? "Marking..."
              : `Mark ${checkedCount} ${checkedCount === 1 ? "member" : "members"} as available`}
          </button>
        </div>
      )}

      <WaitingBanner members={members} />
      <MemberList members={members} isOrganizer={isOrganizer} onMembersUpdated={onMembersUpdated} tripStatus={trip.status} />

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
