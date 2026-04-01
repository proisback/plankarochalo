"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateSlug } from "@/lib/slug";

const DURATION_OPTIONS = [2, 3, 4, 5, 7];
const DEADLINE_OPTIONS = [
  { value: "none", label: "No deadline" },
  { value: "24h", label: "24 hours" },
  { value: "48h", label: "48 hours" },
  { value: "72h", label: "72 hours" },
];

export function CreateTripForm() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [tripDays, setTripDays] = useState(3);
  const [budget, setBudget] = useState("");
  const [votingDeadline, setVotingDeadline] = useState("none");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Not signed in");
      setLoading(false);
      return;
    }

    const slug = generateSlug(name);

    // Create the trip
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .insert({
        name: name.trim(),
        slug,
        organizer_id: user.id,
        trip_days: tripDays,
        budget: budget.trim() || null,
        voting_deadline: votingDeadline,
      })
      .select()
      .single();

    if (tripError) {
      setError(tripError.message);
      setLoading(false);
      return;
    }

    // Add organizer as a member
    const { error: memberError } = await supabase.from("members").insert({
      trip_id: trip.id,
      user_id: user.id,
      name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Organizer",
      is_organizer: true,
      status: "responded",
    });

    if (memberError) {
      setError(memberError.message);
      setLoading(false);
      return;
    }

    router.push(`/trip/${slug}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Trip Name */}
      <div className="space-y-1.5">
        <label htmlFor="name" className="block text-sm font-medium">
          Trip name
        </label>
        <input
          id="name"
          type="text"
          placeholder="e.g. Goa Beach Trip"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {/* Trip Duration */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium">
          How many days?
        </label>
        <div className="flex gap-2">
          {DURATION_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setTripDays(d)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                tripDays === d
                  ? "bg-primary text-white"
                  : "bg-surface border border-gray-200 text-text hover:bg-gray-50"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div className="space-y-1.5">
        <label htmlFor="budget" className="block text-sm font-medium">
          Budget range <span className="text-text-secondary font-normal">(optional)</span>
        </label>
        <input
          id="budget"
          type="text"
          placeholder="e.g. ₹5,000-10,000 per person"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          maxLength={100}
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {/* Voting Deadline */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium">
          Voting deadline
        </label>
        <div className="grid grid-cols-2 gap-2">
          {DEADLINE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setVotingDeadline(opt.value)}
              className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                votingDeadline === opt.value
                  ? "bg-primary text-white"
                  : "bg-surface border border-gray-200 text-text hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-status-out text-sm">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="w-full bg-primary text-white rounded-xl px-4 py-3.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create trip & get link"}
      </button>
    </form>
  );
}
