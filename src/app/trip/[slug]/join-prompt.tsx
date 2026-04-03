"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Member, Trip } from "@/lib/types";

export function JoinPrompt({
  tripId,
  trip,
  onJoined,
}: {
  tripId: string;
  trip: Trip;
  onJoined: (member: Member) => void;
}) {
  const [name, setName] = useState("");
  const [step, setStep] = useState<"name" | "date_check">("name");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const isPastDates = trip.status !== "dates_open";
  const lockedDatesLabel =
    trip.locked_dates_start && trip.locked_dates_end
      ? `${new Date(trip.locked_dates_start).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – ${new Date(trip.locked_dates_end).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`
      : "";

  async function ensureSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const { error: anonError } = await supabase.auth.signInAnonymously();
      if (anonError) {
        setError("Could not connect. Please refresh and try again.");
        return false;
      }
    }
    return true;
  }

  async function joinAndFinish(datesWork: boolean | null) {
    setLoading(true);
    setError("");

    if (!(await ensureSession())) {
      setLoading(false);
      return;
    }

    const { data, error: rpcError } = await supabase.rpc("join_trip", {
      p_trip_id: tripId,
      p_name: name.trim(),
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    const member = data as Member;

    if (isPastDates && datesWork !== null) {
      const updates: Record<string, unknown> = {};

      if (datesWork) {
        updates.availability_start = trip.locked_dates_start;
        updates.availability_end = trip.locked_dates_end;
        updates.status = "responded";
      } else {
        updates.constraint_note = `Can't make locked dates ${lockedDatesLabel}`;
        updates.status = "responded";
      }

      await supabase
        .from("members")
        .update(updates)
        .eq("id", member.id);
    }

    onJoined(member);
  }

  function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    if (isPastDates) {
      setStep("date_check");
    } else {
      joinAndFinish(null);
    }
  }

  // Step 1: Name input
  async function handleGoogleJoin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/trip/${trip.slug}`,
      },
    });
    if (error) setError(error.message);
  }

  if (step === "name") {
    return (
      <div className="space-y-4 animate-in">
        {/* Quick join with Google */}
        <button
          onClick={handleGoogleJoin}
          className="w-full flex items-center justify-center gap-3 bg-surface border border-border rounded-xl px-4 py-3 text-sm font-medium hover:bg-subtle transition-all active:scale-[0.98]"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Join with Google
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-text-tertiary">or enter your name</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={handleNameSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-sm font-semibold text-text">
            What&apos;s your name?
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <input
              id="name"
              type="text"
              placeholder="e.g. Priya"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={50}
              autoFocus
              className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-3 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        {error && (
          <div className="bg-status-out-bg border border-status-out/15 rounded-lg px-3 py-2">
            <p className="text-status-out text-xs">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full bg-primary text-white rounded-xl px-4 py-3.5 text-sm font-semibold shadow-sm hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Joining...
            </span>
          ) : isPastDates ? (
            <span className="flex items-center justify-center gap-1.5">
              Next
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </span>
          ) : (
            "Join this trip"
          )}
        </button>
      </form>
      </div>
    );
  }

  // Step 2: Date check (only when trip is past dates_open)
  return (
    <div className="space-y-4 animate-in">
      <div className="text-center">
        <p className="text-sm text-text-secondary mb-1">Hey {name},</p>
        <h3 className="font-heading text-lg font-bold text-text">
          The group locked in dates
        </h3>
      </div>

      <div className="bg-accent-light border border-accent/10 rounded-2xl px-5 py-5 text-center">
        <p className="font-heading text-xl font-bold text-text">
          {lockedDatesLabel}
        </p>
        <p className="text-sm text-accent font-medium mt-1.5">
          {trip.trip_days} days
        </p>
      </div>

      <p className="text-sm text-text-secondary text-center">
        Do these dates work for you?
      </p>

      {error && (
        <div className="bg-status-out-bg border border-status-out/15 rounded-lg px-3 py-2">
          <p className="text-status-out text-xs text-center">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <button
          onClick={() => joinAndFinish(true)}
          disabled={loading}
          className="w-full bg-accent text-white rounded-xl px-4 py-3.5 text-sm font-semibold shadow-sm hover:bg-accent-hover active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loading ? "Joining..." : "These work! Count me in"}
        </button>
        <button
          onClick={() => joinAndFinish(false)}
          disabled={loading}
          className="w-full bg-surface text-text-secondary border border-border rounded-xl px-4 py-3.5 text-sm font-medium hover:bg-subtle active:scale-[0.98] transition-all disabled:opacity-50"
        >
          I can&apos;t make these dates
        </button>
      </div>

      <button
        onClick={() => setStep("name")}
        className="w-full text-xs text-text-tertiary hover:text-text-secondary transition-colors flex items-center justify-center gap-1"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back
      </button>
    </div>
  );
}
