"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Trip, Member } from "@/lib/types";
import { findBestOverlap } from "@/lib/overlap";
import { MemberList, WaitingBanner } from "./member-list";
import { LockButton } from "./lock-button";
import Calendar from "./calendar";
import { DeadlineBanner } from "./deadline-banner";

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

  // Waiting members eligible for mark-available
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

  // Initialize checkbox state for eligible members
  useMemo(() => {
    const initial: Record<string, boolean> = {};
    for (const { member, hasConflict } of waitingMembers) {
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
        <h2 className="font-heading text-lg font-bold text-text">
          {currentMember.name}, when works for you?
        </h2>
        <p className="text-text-secondary text-sm mt-0.5">
          {!startDate
            ? `Drop your available dates — we're hunting for a ${trip.trip_days}-day window.`
            : !endDate
              ? "Now tap your end date."
              : "Locked in. Now we wait for the crew."}
        </p>
      </div>

      <DeadlineBanner trip={trip} isOrganizer={isOrganizer} />

      {/* Selected range display */}
      {startDate && (
        <div className="flex items-center gap-2.5 bg-primary-light/70 border border-primary/10 rounded-xl px-3.5 py-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-text">
              {endDate
                ? `${new Date(startDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – ${new Date(endDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`
                : `${new Date(startDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} → pick end date`}
            </p>
          </div>
          <button
            onClick={() => { setStartDate(""); setEndDate(""); }}
            className="w-7 h-7 rounded-lg hover:bg-primary/10 flex items-center justify-center text-text-secondary hover:text-text transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
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
      <div className="bg-surface border border-border-light rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>
        {error && (
          <div className="bg-status-out-bg border border-status-out/15 rounded-lg px-3 py-2">
            <p className="text-status-out text-xs">{error}</p>
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !startDate || !endDate}
          className="w-full bg-primary text-white rounded-xl px-4 py-3 text-sm font-semibold shadow-sm hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {saving ? "Saving..." : hasSubmitted ? "Update dates" : "Submit dates"}
        </button>
      </div>

      {/* Best overlap result */}
      {best && (
        <div className="bg-accent-light border border-accent/10 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-[11px] font-bold text-accent uppercase tracking-wider">
              Best {trip.trip_days}-day window
            </p>
          </div>
          <p className="font-heading text-lg font-bold text-text">
            {best.start.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} –{" "}
            {best.end.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
          </p>
          <p className="text-text-secondary text-sm mt-1">
            {best.minCount} of {members.filter(m => m.availability_start).length} people available: {best.memberNames.join(", ")}
          </p>
        </div>
      )}

      {/* Mark waiting members as available (organizer only) */}
      {isOrganizer && best && waitingMembers.length > 0 && (
        <div className="bg-surface border border-border-light rounded-2xl p-4 space-y-3 shadow-xs">
          <p className="text-sm font-semibold text-text">Mark waiting members as available</p>
          <div className="space-y-2">
            {waitingMembers.map(({ member, hasConflict }) => (
              <label
                key={member.id}
                className="flex items-center gap-3 py-1.5 cursor-pointer group"
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
                  className="w-4 h-4 rounded border-subtle-active text-accent focus:ring-accent/30"
                />
                <span className="text-sm flex-1 group-hover:text-text transition-colors">{member.name}</span>
                {hasConflict && (
                  <span className="text-xs text-status-waiting font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    conflict{" "}
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
            className="w-full bg-accent text-white rounded-xl px-4 py-3 text-sm font-semibold shadow-sm hover:bg-accent-hover active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {markingAvailable
              ? "Marking..."
              : `Mark ${checkedCount} ${checkedCount === 1 ? "member" : "members"} as available`}
          </button>
        </div>
      )}

      <WaitingBanner members={members} tripStatus={trip.status} />
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
