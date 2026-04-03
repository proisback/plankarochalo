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

  // Step 1: Name only — zero friction
  if (step === "name") {
    return (
      <form onSubmit={handleNameSubmit} className="space-y-5 animate-in">
        <div>
          <input
            id="name"
            type="text"
            placeholder="Type your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={50}
            autoFocus
            className="w-full rounded-2xl border-2 border-border bg-background px-5 py-4 text-base font-medium text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all text-center"
          />
        </div>

        {error && (
          <div className="bg-status-out-bg border border-status-out/15 rounded-lg px-3 py-2">
            <p className="text-status-out text-xs text-center">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full bg-gradient-to-r from-primary to-[#F5A623] text-white rounded-2xl px-5 py-4 text-base font-bold font-heading shadow-md hover:shadow-lg active:scale-[0.97] transition-all disabled:opacity-40 disabled:shadow-none"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Joining...
            </span>
          ) : (
            "Join this trip"
          )}
        </button>

        <p className="text-center text-text-tertiary text-[11px]">
          No sign up needed &middot; Takes 30 seconds
        </p>
      </form>
    );
  }

  // Step 2: Date check (only when trip is past dates_open)
  return (
    <div className="space-y-4 animate-in">
      <div className="text-center">
        <p className="text-sm text-text-secondary mb-1">Hey {name} 👋</p>
        <h3 className="font-heading text-lg font-bold text-text">
          The group already picked dates
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
          className="w-full bg-accent text-white rounded-2xl px-4 py-4 text-sm font-bold shadow-sm hover:bg-accent-hover active:scale-[0.97] transition-all disabled:opacity-50"
        >
          {loading ? "Joining..." : "These work! I\u2019m in 🙌"}
        </button>
        <button
          onClick={() => joinAndFinish(false)}
          disabled={loading}
          className="w-full bg-surface text-text-secondary border border-border rounded-2xl px-4 py-3 text-sm font-medium hover:bg-subtle active:scale-[0.97] transition-all disabled:opacity-50"
        >
          Can&apos;t make these dates
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
