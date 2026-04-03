"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Trip, Member } from "@/lib/types";
import { findBestOverlap, findBudgetOverlap } from "@/lib/overlap";
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

  // Unavailable dates (constraint)
  const [unavailStart, setUnavailStart] = useState(currentMember.constraint_start || "");
  const [unavailEnd, setUnavailEnd] = useState(currentMember.constraint_end || "");

  // Budget state
  const [budgetMin, setBudgetMin] = useState(currentMember.budget_min ?? 5000);
  const [budgetMax, setBudgetMax] = useState(currentMember.budget_max ?? 30000);
  const BUDGET_FLOOR = 2000;
  const BUDGET_CEIL = 200000;
  const BUDGET_STEP = 1000;

  // Mark-available state
  const [markChecked, setMarkChecked] = useState<Record<string, boolean>>({});
  const [markingAvailable, setMarkingAvailable] = useState(false);

  const { best, dateMap } = useMemo(
    () => findBestOverlap(members, trip.trip_days),
    [members, trip.trip_days]
  );

  const budgetOverlap = useMemo(
    () => findBudgetOverlap(members),
    [members]
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

    const updates: Record<string, unknown> = {
      availability_start: startDate,
      availability_end: endDate,
      budget_min: budgetMin,
      budget_max: budgetMax,
      status: "responded",
    };

    if (unavailStart && unavailEnd) {
      updates.constraint_start = unavailStart;
      updates.constraint_end = unavailEnd;
      updates.constraint_note = `${new Date(unavailStart).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – ${new Date(unavailEnd).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} unavailable`;
    } else {
      updates.constraint_start = null;
      updates.constraint_end = null;
      updates.constraint_note = null;
    }

    const { error: saveError } = await supabase
      .from("members")
      .update(updates)
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
          {(() => {
            if (!startDate) return `Drop your available dates — we're hunting for a ${trip.trip_days}-day window.`;
            if (!endDate) return "Now tap your end date.";
            const responded = members.filter(m => m.availability_start).length;
            const waiting = members.length - responded;
            if (waiting > 0) return `You're in! Waiting for ${waiting} more ${waiting === 1 ? "person" : "people"} to submit dates.`;
            return "Everyone's in! The organizer can now lock dates.";
          })()}
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

      {/* Date window banner */}
      {trip.date_window_start && trip.date_window_end && (
        <div className="bg-status-pending-bg/50 border border-status-pending/10 rounded-xl px-4 py-3 flex items-center gap-2.5">
          <svg className="w-4 h-4 text-status-pending shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <p className="text-status-pending text-sm font-medium">
            Pick dates between{" "}
            {new Date(trip.date_window_start).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} –{" "}
            {new Date(trip.date_window_end).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
          </p>
        </div>
      )}

      {/* Calendar */}
      <Calendar
        startDate={startDate}
        endDate={endDate}
        onSelect={handleCalendarSelect}
        dateMap={dateMap}
        windowStart={trip.date_window_start ?? undefined}
        windowEnd={trip.date_window_end ?? undefined}
      />

      {/* From / To inputs + submit */}
      <div className="bg-surface border border-border-light rounded-2xl p-4 space-y-3 shadow-xs overflow-hidden">
        <div className="space-y-2">
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
        {/* Unavailable dates */}
        <div className="pt-1">
          <label className="block text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">
            Dates you&apos;re NOT available <span className="normal-case font-normal">(optional)</span>
          </label>
          <p className="text-[11px] text-text-tertiary mb-2">
            Have a gap in your availability? Mark when you can&apos;t go.
          </p>
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">
                Unavailable from
              </label>
              <input
                type="date"
                value={unavailStart}
                onChange={(e) => setUnavailStart(e.target.value)}
                className="w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-status-out/20 focus:border-status-out transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">
                Unavailable to
              </label>
              <input
                type="date"
                value={unavailEnd}
                onChange={(e) => setUnavailEnd(e.target.value)}
                min={unavailStart}
                className="w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-status-out/20 focus:border-status-out transition-all"
              />
            </div>
          </div>
          {unavailStart && unavailEnd && (
            <div className="mt-2 flex items-center gap-2 bg-status-out-bg/50 rounded-lg px-3 py-2">
              <svg className="w-3.5 h-3.5 text-status-out shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <p className="text-xs text-status-out font-medium">
                {new Date(unavailStart).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – {new Date(unavailEnd).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} blocked
              </p>
              <button
                type="button"
                onClick={() => { setUnavailStart(""); setUnavailEnd(""); }}
                className="ml-auto text-status-out/60 hover:text-status-out text-xs"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Budget range slider */}
        <div className="pt-1">
          <label className="block text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">
            Budget per person
          </label>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-primary">
              {budgetMin >= 100000 ? `₹${(budgetMin / 100000).toFixed(1)}L` : budgetMin >= 1000 ? `₹${(budgetMin / 1000).toFixed(0)}K` : `₹${budgetMin}`}
            </span>
            <span className="text-[10px] text-text-tertiary">to</span>
            <span className="text-sm font-bold text-primary">
              {budgetMax >= 100000 ? `₹${(budgetMax / 100000).toFixed(1)}L` : budgetMax >= 1000 ? `₹${(budgetMax / 1000).toFixed(0)}K` : `₹${budgetMax}`}
            </span>
          </div>
          <p className="text-[11px] text-text-tertiary mb-2 text-center">
            Estimated ₹{new Intl.NumberFormat("en-IN").format(Math.round((budgetMin + budgetMax) / 2))} per person
          </p>
          <div className="relative h-8 mb-1">
            {/* Track */}
            <div className="absolute top-1/2 -translate-y-1/2 h-2 w-full rounded-full bg-subtle-hover" />
            {/* Filled range */}
            <div
              className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-primary/30"
              style={{
                left: `${((budgetMin - BUDGET_FLOOR) / (BUDGET_CEIL - BUDGET_FLOOR)) * 100}%`,
                width: `${((budgetMax - budgetMin) / (BUDGET_CEIL - BUDGET_FLOOR)) * 100}%`,
              }}
            />
            {/* Min thumb */}
            <input
              type="range"
              min={BUDGET_FLOOR}
              max={BUDGET_CEIL}
              step={BUDGET_STEP}
              value={budgetMin}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v < budgetMax) setBudgetMin(v);
              }}
              className="range-slider"
            />
            {/* Max thumb */}
            <input
              type="range"
              min={BUDGET_FLOOR}
              max={BUDGET_CEIL}
              step={BUDGET_STEP}
              value={budgetMax}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > budgetMin) setBudgetMax(v);
              }}
              className="range-slider"
            />
          </div>
          <div className="flex justify-between text-[10px] text-text-tertiary">
            <span>₹2K</span>
            <span>₹2L</span>
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
          {saving ? "Saving..." : hasSubmitted ? "Update dates & budget" : "Submit dates & budget"}
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

      {/* Budget sweet spot */}
      {budgetOverlap && (
        <div className="bg-primary-light/50 border border-primary/10 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
            </div>
            <p className="text-[11px] font-bold text-primary uppercase tracking-wider">
              Group budget sweet spot
            </p>
          </div>
          {/* Visual bar */}
          <div className="relative h-3 rounded-full bg-subtle-hover mb-2">
            <div
              className="absolute inset-y-0 rounded-full bg-primary/40"
              style={{
                left: `${((budgetOverlap.min - BUDGET_FLOOR) / (BUDGET_CEIL - BUDGET_FLOOR)) * 100}%`,
                width: `${((budgetOverlap.max - budgetOverlap.min) / (BUDGET_CEIL - BUDGET_FLOOR)) * 100}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="font-heading text-base font-bold text-text">
              ₹{budgetOverlap.min >= 100000 ? `${(budgetOverlap.min / 100000).toFixed(1)}L` : `${(budgetOverlap.min / 1000).toFixed(0)}K`} – ₹{budgetOverlap.max >= 100000 ? `${(budgetOverlap.max / 100000).toFixed(1)}L` : `${(budgetOverlap.max / 1000).toFixed(0)}K`}
            </p>
            <p className="text-text-tertiary text-xs">
              {budgetOverlap.count} members
            </p>
          </div>
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

      <WaitingBanner members={members} tripStatus={trip.status} isOrganizer={isOrganizer} tripName={trip.name} slug={trip.slug} />
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
