"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Member } from "@/lib/types";

export function JoinPrompt({
  tripId,
  userId,
  onJoined,
}: {
  tripId: string;
  userId: string;
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

    const { data, error: insertError } = await supabase
      .from("members")
      .insert({
        trip_id: tripId,
        user_id: userId,
        name: name.trim(),
        is_organizer: false,
        status: "invited",
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
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
