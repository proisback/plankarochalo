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

    // Create member record
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

    // If past dates stage, update member with date response
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
  if (step === "name") {
    return (
      <form onSubmit={handleNameSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-sm font-medium">
            What&apos;s your name?
          </label>
          <input
            id="name"
            type="text"
            placeholder="e.g. Priya"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={50}
            autoFocus
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>

        {error && <p className="text-status-out text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full bg-primary text-white rounded-xl px-4 py-3.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Joining..." : isPastDates ? "Next" : "Join this trip"}
        </button>
      </form>
    );
  }

  // Step 2: Date check (only when trip is past dates_open)
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-text-secondary mb-1">Hey {name},</p>
        <h3 className="font-heading text-lg font-bold">
          The group locked in dates
        </h3>
      </div>

      <div className="bg-status-confirmed-bg border border-status-confirmed/20 rounded-xl px-5 py-4 text-center">
        <p className="font-heading text-xl font-bold text-text">
          {lockedDatesLabel}
        </p>
        <p className="text-sm text-status-confirmed mt-1">
          {trip.trip_days} days
        </p>
      </div>

      <p className="text-sm text-text-secondary text-center">
        Do these dates work for you?
      </p>

      {error && <p className="text-status-out text-sm text-center">{error}</p>}

      <div className="space-y-2">
        <button
          onClick={() => joinAndFinish(true)}
          disabled={loading}
          className="w-full bg-accent text-white rounded-xl px-4 py-3.5 text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Joining..." : "These work! Count me in"}
        </button>
        <button
          onClick={() => joinAndFinish(false)}
          disabled={loading}
          className="w-full bg-surface text-text-secondary border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          I can&apos;t make these dates
        </button>
      </div>

      <button
        onClick={() => setStep("name")}
        className="w-full text-xs text-text-secondary hover:text-text transition-colors"
      >
        ← Back
      </button>
    </div>
  );
}
