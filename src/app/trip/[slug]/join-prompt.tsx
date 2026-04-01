"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Member } from "@/lib/types";

export function JoinPrompt({
  tripId,
  onJoined,
}: {
  tripId: string;
  onJoined: (member: Member) => void;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Ensure we have an authenticated session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const { error: anonError } = await supabase.auth.signInAnonymously();
      if (anonError) {
        setError("Could not connect. Please refresh and try again.");
        setLoading(false);
        return;
      }
    }

    // Use security definer function to bypass RLS
    const { data, error: rpcError } = await supabase.rpc("join_trip", {
      p_trip_id: tripId,
      p_name: name.trim(),
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    onJoined(data as Member);
  }

  return (
    <form onSubmit={handleJoin} className="space-y-4">
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
        {loading ? "Joining..." : "Join this trip"}
      </button>
    </form>
  );
}
