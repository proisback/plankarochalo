"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Trip, Member } from "@/lib/types";
import { MemberList, WaitingBanner } from "./member-list";
import { LockButton } from "./lock-button";
import { findBudgetOverlap } from "@/lib/overlap";

const AVATAR_COLORS = [
  "bg-primary/15 text-primary",
  "bg-accent/15 text-accent",
  "bg-status-pending/15 text-status-pending",
  "bg-status-responded/15 text-status-responded",
  "bg-status-waiting/15 text-status-waiting",
];

export function CommitmentStage({
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
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStarted = useRef(false);

  const confirmedIn = members.filter((m) => m.status === "confirmed_in");
  const confirmedOut = members.filter((m) => m.status === "confirmed_out");
  const myStatus = currentMember.status;
  const userIn = myStatus === "confirmed_in";
  const userOut = myStatus === "confirmed_out";
  const hasCommitted = userIn || userOut;

  const budgetOverlap = useMemo(() => findBudgetOverlap(members), [members]);

  const dateRange =
    trip.locked_dates_start && trip.locked_dates_end
      ? `${new Date(trip.locked_dates_start).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – ${new Date(trip.locked_dates_end).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`
      : "";

  async function handleCommit(status: "confirmed_in" | "confirmed_out") {
    setSaving(true);
    setError("");
    const { error: commitError } = await supabase
      .from("members")
      .update({ status })
      .eq("id", currentMember.id);
    if (commitError) setError(commitError.message);
    setSaving(false);
  }

  async function handleProxyCommit(memberId: string, status: "confirmed_in" | "confirmed_out") {
    setError("");
    const { error: commitError } = await supabase
      .from("members")
      .update({ status })
      .eq("id", memberId);
    if (commitError) setError(commitError.message);
    await onMembersUpdated?.();
  }

  async function handleLock() {
    await supabase
      .from("trips")
      .update({ status: "ready" })
      .eq("id", trip.id);
  }

  // Hold-to-confirm handlers
  const startHold = useCallback(() => {
    if (hasCommitted || saving) return;
    holdStarted.current = true;
    setHoldProgress(0);
    let progress = 0;
    holdTimer.current = setInterval(() => {
      progress += 5; // 5% per 100ms = 2 seconds total
      setHoldProgress(Math.min(progress, 100));
      if (progress >= 100) {
        if (holdTimer.current) clearInterval(holdTimer.current);
        holdTimer.current = null;
        holdStarted.current = false;
        handleCommit("confirmed_in");
      }
    }, 100);
  }, [hasCommitted, saving]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancelHold = useCallback(() => {
    if (holdTimer.current) {
      clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
    holdStarted.current = false;
    setHoldProgress(0);
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center">
        <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Confirm your commitment</p>
      </div>

      {/* Trip summary card */}
      <div className="bg-surface border border-border-light rounded-2xl p-5 text-center shadow-xs">
        <p className="font-heading text-lg font-bold text-text">
          {trip.locked_destination}
        </p>
        <p className="text-sm text-text-secondary mt-0.5">
          {dateRange}{trip.trip_days ? ` · ${trip.trip_days} days` : ""}
        </p>
        {budgetOverlap && (
          <p className="text-xs text-text-tertiary mt-1">
            Budget: ₹{budgetOverlap.min >= 100000 ? `${(budgetOverlap.min / 100000).toFixed(1)}L` : `${(budgetOverlap.min / 1000).toFixed(0)}K`}–₹{budgetOverlap.max >= 100000 ? `${(budgetOverlap.max / 100000).toFixed(1)}L` : `${(budgetOverlap.max / 1000).toFixed(0)}K`} per person
          </p>
        )}

        {/* Member avatars */}
        <div className="flex items-center justify-center gap-1 mt-4">
          {members.map((m, i) => {
            const isIn = m.status === "confirmed_in";
            const isOut = m.status === "confirmed_out";
            return (
              <div
                key={m.id}
                className={[
                  "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ring-surface transition-all",
                  isIn
                    ? "bg-accent text-white"
                    : isOut
                      ? "bg-status-out/20 text-status-out/60 line-through"
                      : AVATAR_COLORS[i % AVATAR_COLORS.length],
                ].join(" ")}
                title={`${m.name}${isIn ? " (going)" : isOut ? " (out)" : ""}`}
              >
                {m.name.charAt(0).toUpperCase()}
              </div>
            );
          })}
          <span className="text-xs text-text-tertiary ml-1.5 font-medium">
            {confirmedIn.length}/{members.length}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-status-out-bg border border-status-out/15 rounded-lg px-3 py-2">
          <p className="text-status-out text-xs text-center">{error}</p>
        </div>
      )}

      {/* Hold to confirm / Already confirmed */}
      {userIn ? (
        <div className="text-center animate-in">
          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="font-heading text-base font-bold text-accent">You&apos;re going!</p>
          <p className="text-xs text-text-tertiary mt-1">
            {confirmedIn.length} of {members.length} confirmed
          </p>
          <button
            onClick={() => handleCommit("confirmed_out")}
            disabled={saving}
            className="mt-3 text-xs text-text-tertiary hover:text-status-out transition-colors"
          >
            Changed your mind? Tap to opt out
          </button>
        </div>
      ) : userOut ? (
        <div className="text-center animate-in">
          <p className="text-text-secondary text-sm">You&apos;re sitting this one out.</p>
          <button
            onClick={() => handleCommit("confirmed_in")}
            disabled={saving}
            className="mt-2 text-sm text-accent font-semibold hover:text-accent-hover transition-colors"
          >
            Changed your mind? Tap to join
          </button>
        </div>
      ) : (
        <div className="text-center space-y-3">
          {/* Hold button */}
          <button
            onMouseDown={startHold}
            onMouseUp={cancelHold}
            onMouseLeave={cancelHold}
            onTouchStart={startHold}
            onTouchEnd={cancelHold}
            onTouchCancel={cancelHold}
            disabled={saving}
            className="relative w-full rounded-2xl py-4 font-heading text-base font-bold overflow-hidden transition-all active:scale-[0.98] disabled:opacity-50 bg-text text-surface"
          >
            {/* Fill progress */}
            <div
              className="absolute inset-0 bg-accent transition-all duration-100 ease-linear"
              style={{ width: `${holdProgress}%` }}
            />
            <span className="relative z-10 flex items-center justify-center gap-2">
              {holdProgress > 0 && holdProgress < 100 ? (
                <>
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Keep holding...
                </>
              ) : (
                "Hold to confirm"
              )}
            </span>
          </button>
          <p className="text-[10px] text-text-tertiary">
            Press and hold for 2 seconds
          </p>

          {/* I'm out — subtle link */}
          <button
            onClick={() => handleCommit("confirmed_out")}
            disabled={saving}
            className="text-xs text-text-tertiary hover:text-status-out transition-colors"
          >
            I can&apos;t make it
          </button>
        </div>
      )}

      <WaitingBanner members={members} tripStatus={trip.status} isOrganizer={isOrganizer} tripName={trip.name} slug={trip.slug} />
      <MemberList members={members} isOrganizer={isOrganizer} onMembersUpdated={onMembersUpdated} tripStatus={trip.status} onProxyCommit={isOrganizer ? handleProxyCommit : undefined} />

      {isOrganizer && confirmedIn.length > 0 && (
        <LockButton
          label={`Lock Trip — ${confirmedIn.length} going!`}
          confirmMessage={`Finalize with ${confirmedIn.length} people going? This will mark the trip as ready.`}
          onLock={handleLock}
        />
      )}
    </div>
  );
}
