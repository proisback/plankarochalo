"use client";

import { useState, useMemo, useCallback } from "react";
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [updatingDays, setUpdatingDays] = useState(false);

  // Selected dates — initialize from existing data
  const [selectedDates, setSelectedDates] = useState<Set<string>>(() => {
    // Try new per-day format from constraint_note
    if (currentMember.constraint_note) {
      try {
        const parsed = JSON.parse(currentMember.constraint_note);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string" && parsed[0].match(/^\d{4}-\d{2}-\d{2}$/)) {
          return new Set(parsed);
        }
      } catch { /* not JSON */ }
    }
    // Fall back to range
    if (currentMember.availability_start && currentMember.availability_end) {
      const dates = new Set<string>();
      const start = new Date(currentMember.availability_start);
      const end = new Date(currentMember.availability_end);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.add(d.toISOString().split("T")[0]);
      }
      return dates;
    }
    return new Set();
  });

  const hasSubmitted = !!currentMember.availability_start;

  // Budget state
  const [budgetMin, setBudgetMin] = useState(currentMember.budget_min ?? 5000);
  const [budgetMax, setBudgetMax] = useState(currentMember.budget_max ?? 30000);
  const BUDGET_FLOOR = 2000;
  const BUDGET_CEIL = 200000;
  const BUDGET_STEP = 1000;

  const { best, fallback, dateMap } = useMemo(
    () => findBestOverlap(members, trip.trip_days),
    [members, trip.trip_days]
  );

  const budgetOverlap = useMemo(
    () => findBudgetOverlap(members),
    [members]
  );

  const toggleDate = useCallback((date: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }, []);

  const selectRange = useCallback((start: string, end: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      const s = new Date(start);
      const e = new Date(end);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        next.add(d.toISOString().split("T")[0]);
      }
      return next;
    });
  }, []);

  async function handleUpdateTripDays(newDays: number) {
    setUpdatingDays(true);
    await supabase.from("trips").update({ trip_days: newDays }).eq("id", trip.id);
    setUpdatingDays(false);
  }

  async function handleSave() {
    if (selectedDates.size === 0) return;
    setSaving(true);
    setError("");

    const sorted = Array.from(selectedDates).sort();
    const earliest = sorted[0];
    const latest = sorted[sorted.length - 1];

    const { error: saveError } = await supabase
      .from("members")
      .update({
        availability_start: earliest,
        availability_end: latest,
        constraint_note: JSON.stringify(sorted),
        constraint_start: null,
        constraint_end: null,
        budget_min: budgetMin,
        budget_max: budgetMax,
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

  // Dynamic subtitle
  const responded = members.filter(m => m.availability_start).length;
  const waiting = members.length - responded;

  const selectStyle = { backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2378716C' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", backgroundSize: "14px", paddingRight: "28px" };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-heading text-lg font-bold text-text">
          Tap the dates that work for you
        </h2>
        <p className="text-text-secondary text-sm mt-0.5">
          {selectedDates.size === 0
            ? `Select your available dates — we need a ${trip.trip_days}-day window.`
            : hasSubmitted && waiting > 0
              ? `${selectedDates.size} dates selected. Waiting for ${waiting} more ${waiting === 1 ? "person" : "people"}.`
              : hasSubmitted && waiting === 0
                ? `${selectedDates.size} dates selected. Everyone's in!`
                : `${selectedDates.size} dates selected.`}
        </p>
        <p className="text-xs text-accent font-medium mt-1">
          {responded} of {members.length} {responded === 1 ? "person has" : "people have"} marked dates
        </p>
      </div>

      <DeadlineBanner trip={trip} isOrganizer={isOrganizer} />

      {/* Date window banner */}
      {trip.date_window_start && trip.date_window_end && (
        <div className="bg-status-pending-bg/50 border border-status-pending/10 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-status-pending shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <p className="text-status-pending text-xs font-medium">
            Pick between {new Date(trip.date_window_start).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – {new Date(trip.date_window_end).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
          </p>
        </div>
      )}

      {/* Calendar — the main interaction */}
      <Calendar
        selectedDates={selectedDates}
        onToggleDate={toggleDate}
        onRangeSelect={selectRange}
        dateMap={dateMap}
        windowStart={trip.date_window_start ?? undefined}
        windowEnd={trip.date_window_end ?? undefined}
      />

      {/* Budget + Submit */}
      <div className="bg-surface border border-border-light rounded-2xl shadow-xs overflow-hidden">
        {/* Budget */}
        <details className="group">
          <summary className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-subtle/50 transition-colors">
            <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              💰 Budget per person
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold text-primary">
              {budgetMin >= 100000 ? `₹${(budgetMin / 100000).toFixed(1)}L` : `₹${(budgetMin / 1000).toFixed(0)}K`} – {budgetMax >= 100000 ? `₹${(budgetMax / 100000).toFixed(1)}L` : `₹${(budgetMax / 1000).toFixed(0)}K`}
              <svg className="w-3.5 h-3.5 text-text-tertiary transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </span>
          </summary>
          <div className="px-4 pb-4 pt-1">
            <p className="text-[11px] text-text-tertiary mb-1 text-center">
              Helps find the group&apos;s sweet spot for stays & activities
            </p>
            <p className="text-xs text-primary font-bold mb-3 text-center">
              ~₹{new Intl.NumberFormat("en-IN").format(Math.round((budgetMin + budgetMax) / 2))} per person
            </p>
            <div className="relative h-10 mb-1 mx-2">
              {/* Track */}
              <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[6px] rounded-full bg-subtle-hover" />
              {/* Filled range */}
              <div className="absolute top-1/2 -translate-y-1/2 h-[6px] rounded-full bg-primary/25"
                style={{ left: `${((budgetMin - BUDGET_FLOOR) / (BUDGET_CEIL - BUDGET_FLOOR)) * 100}%`, width: `${((budgetMax - budgetMin) / (BUDGET_CEIL - BUDGET_FLOOR)) * 100}%` }} />
              {/* Sliders */}
              <input type="range" min={BUDGET_FLOOR} max={BUDGET_CEIL} step={BUDGET_STEP} value={budgetMin}
                onChange={(e) => { const v = Number(e.target.value); if (v < budgetMax) setBudgetMin(v); }} className="range-slider" />
              <input type="range" min={BUDGET_FLOOR} max={BUDGET_CEIL} step={BUDGET_STEP} value={budgetMax}
                onChange={(e) => { const v = Number(e.target.value); if (v > budgetMin) setBudgetMax(v); }} className="range-slider" />
            </div>
            <div className="flex justify-between text-[10px] text-text-tertiary mx-2">
              <span>₹2K</span><span>₹2L</span>
            </div>
          </div>
        </details>

        {/* Submit */}
        <div className="p-4 pt-0">
          {error && (
            <div className="bg-status-out-bg border border-status-out/15 rounded-lg px-3 py-2 mb-3">
              <p className="text-status-out text-xs">{error}</p>
            </div>
          )}
          <button onClick={handleSave} disabled={saving || selectedDates.size === 0}
            className="w-full bg-primary text-white rounded-xl px-4 py-3 text-sm font-semibold shadow-sm hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50">
            {saving ? "Saving..." : hasSubmitted ? "Update my dates" : "Done"}
          </button>
        </div>
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
            {best.start.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – {best.end.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
          </p>
          <p className="text-text-secondary text-sm mt-1">
            {best.minCount} of {members.filter(m => m.availability_start).length} people available: {best.memberNames.join(", ")}
          </p>
          {isOrganizer && (
            <div className="mt-3 pt-2 border-t border-accent/10 flex items-center gap-2">
              <span className="text-[11px] text-text-tertiary">Trip length:</span>
              <select defaultValue={trip.trip_days} onChange={(e) => handleUpdateTripDays(Number(e.target.value))} disabled={updatingDays}
                className="rounded-lg border border-accent/20 bg-surface px-2 py-1 text-xs font-medium text-text focus:outline-none focus:ring-1 focus:ring-accent/20 transition-all appearance-none"
                style={selectStyle}>
                {Array.from({ length: 14 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d} {d === 1 ? "day" : "days"}</option>
                ))}
              </select>
              {updatingDays && <div className="w-3 h-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />}
            </div>
          )}
        </div>
      )}

      {/* No overlap */}
      {!best && members.filter(m => m.availability_start).length >= 2 && (
        <div className="bg-status-out-bg/40 border border-status-out/10 rounded-2xl p-5 text-center shadow-xs">
          <span className="text-3xl block mb-2">😔</span>
          <p className="font-heading text-base font-bold text-text">No {trip.trip_days}-day overlap found</p>
          <p className="text-text-secondary text-sm mt-1.5">
            Schedules don&apos;t line up for {trip.trip_days} days. Ask the group to add more dates.
          </p>
          {fallback && (
            <div className="mt-3 bg-status-waiting-bg/50 border border-status-waiting/10 rounded-xl p-3 text-left">
              <p className="text-xs font-semibold text-status-waiting mb-1">Longest overlap: {fallback.days} {fallback.days === 1 ? "day" : "days"}</p>
              <p className="text-sm font-bold text-text">
                {fallback.start.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – {fallback.end.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
              </p>
              {isOrganizer && (
                <button onClick={() => handleUpdateTripDays(fallback.days)} disabled={updatingDays}
                  className="mt-2 w-full bg-status-waiting/10 text-status-waiting rounded-lg py-1.5 text-xs font-semibold hover:bg-status-waiting/15 active:scale-[0.98] transition-all disabled:opacity-50">
                  {updatingDays ? "Updating..." : `Switch to ${fallback.days}-day trip`}
                </button>
              )}
            </div>
          )}
          {isOrganizer && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="text-xs text-text-tertiary">Trip length:</span>
              <select defaultValue={trip.trip_days} onChange={(e) => handleUpdateTripDays(Number(e.target.value))} disabled={updatingDays}
                className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                style={selectStyle}>
                {Array.from({ length: 14 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d} {d === 1 ? "day" : "days"}</option>
                ))}
              </select>
            </div>
          )}
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
            <p className="text-[11px] font-bold text-primary uppercase tracking-wider">Group budget sweet spot</p>
          </div>
          <div className="relative h-3 rounded-full bg-subtle-hover mb-2">
            <div className="absolute inset-y-0 rounded-full bg-primary/40"
              style={{ left: `${((budgetOverlap.min - BUDGET_FLOOR) / (BUDGET_CEIL - BUDGET_FLOOR)) * 100}%`, width: `${((budgetOverlap.max - budgetOverlap.min) / (BUDGET_CEIL - BUDGET_FLOOR)) * 100}%` }} />
          </div>
          <div className="flex items-center justify-between">
            <p className="font-heading text-base font-bold text-text">
              ₹{budgetOverlap.min >= 100000 ? `${(budgetOverlap.min / 100000).toFixed(1)}L` : `${(budgetOverlap.min / 1000).toFixed(0)}K`} – ₹{budgetOverlap.max >= 100000 ? `${(budgetOverlap.max / 100000).toFixed(1)}L` : `${(budgetOverlap.max / 1000).toFixed(0)}K`}
            </p>
            <p className="text-text-tertiary text-xs">{budgetOverlap.count} members</p>
          </div>
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
