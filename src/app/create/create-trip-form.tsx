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
  const [proxyMembers, setProxyMembers] = useState<
    { name: string; start: string; end: string }[]
  >([]);
  const [pName, setPName] = useState("");
  const [pStart, setPStart] = useState("");
  const [pEnd, setPEnd] = useState("");
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

    // Add proxy members with constraints
    if (proxyMembers.length > 0) {
      await supabase.from("members").insert(
        proxyMembers.map((p) => ({
          trip_id: trip.id,
          user_id: null,
          name: p.name,
          is_organizer: false,
          is_proxy: true,
          status: "invited" as const,
          constraint_note: p.start && p.end
            ? `${new Date(p.start).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – ${new Date(p.end).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} unavailable`
            : null,
          constraint_start: p.start || null,
          constraint_end: p.end || null,
        }))
      );
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

      {/* Known Constraints (Proxy Members) */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium">
            Known constraints <span className="text-text-secondary font-normal">(optional)</span>
          </label>
          <p className="text-xs text-text-secondary mt-0.5">
            Add dates that won&apos;t work for members who may not use the tool
            (e.g. parents, busy friends)
          </p>
        </div>

        {/* Added constraints list */}
        {proxyMembers.map((p, i) => (
          <div
            key={i}
            className="flex items-center gap-2 bg-background rounded-lg px-3 py-2"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{p.name}</p>
              {p.start && p.end && (
                <p className="text-xs text-status-waiting">
                  ⚠{" "}
                  {new Date(p.start).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  –{" "}
                  {new Date(p.end).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  unavailable
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                setProxyMembers((prev) => prev.filter((_, j) => j !== i))
              }
              className="text-text-secondary hover:text-text text-sm"
            >
              ✕
            </button>
          </div>
        ))}

        {/* Add constraint form */}
        <div className="bg-surface border border-gray-100 rounded-xl p-4 space-y-2">
          <p className="text-xs font-medium text-text-secondary">
            Add a member&apos;s unavailable dates
          </p>
          <input
            type="text"
            placeholder="Name"
            value={pName}
            onChange={(e) => setPName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-text-secondary mb-0.5">
                Unavailable from
              </label>
              <input
                type="date"
                value={pStart}
                onChange={(e) => setPStart(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-text-secondary mb-0.5">
                Unavailable to
              </label>
              <input
                type="date"
                value={pEnd}
                onChange={(e) => setPEnd(e.target.value)}
                min={pStart}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>
          <button
            type="button"
            disabled={!pName.trim()}
            onClick={() => {
              if (!pName.trim()) return;
              setProxyMembers((prev) => [
                ...prev,
                { name: pName.trim(), start: pStart, end: pEnd },
              ]);
              setPName("");
              setPStart("");
              setPEnd("");
            }}
            className="w-full bg-accent text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-accent/90 transition-colors disabled:bg-gray-200 disabled:text-text-secondary"
          >
            + Add Constraint
          </button>
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
        {loading ? "Creating..." : "Create Trip & Get Link →"}
      </button>
    </form>
  );
}
