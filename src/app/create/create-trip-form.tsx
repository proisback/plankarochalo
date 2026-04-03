"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateSlug } from "@/lib/slug";

const DURATION_OPTIONS = Array.from({ length: 14 }, (_, i) => i + 1);

function formatINR(value: string): string {
  const num = value.replace(/[^0-9]/g, "");
  if (!num) return "";
  return new Intl.NumberFormat("en-IN").format(Number(num));
}

function rawNumber(value: string): string {
  return value.replace(/[^0-9]/g, "");
}
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

    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .insert({
        name: name.trim(),
        slug,
        organizer_id: user.id,
        trip_days: tripDays,
        budget: rawNumber(budget) ? `₹${formatINR(budget)} per person` : null,
        voting_deadline: votingDeadline,
      })
      .select()
      .single();

    if (tripError) {
      setError(tripError.message);
      setLoading(false);
      return;
    }

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
        <label htmlFor="name" className="block text-sm font-semibold text-text">
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
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      {/* Trip Duration */}
      <div className="space-y-1.5">
        <label htmlFor="tripDays" className="block text-sm font-semibold text-text">
          Trip duration
        </label>
        <select
          id="tripDays"
          value={tripDays}
          onChange={(e) => setTripDays(Number(e.target.value))}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2378716C' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", backgroundSize: "16px" }}
        >
          {DURATION_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d} {d === 1 ? "day" : "days"}
            </option>
          ))}
        </select>
      </div>

      {/* Budget */}
      <div className="space-y-1.5">
        <label htmlFor="budget" className="block text-sm font-semibold text-text">
          Budget per person <span className="text-text-tertiary font-normal">(optional)</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <span className="text-text-tertiary text-sm font-medium">INR</span>
          </div>
          <input
            id="budget"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 10,000"
            value={budget ? formatINR(budget) : ""}
            onChange={(e) => setBudget(rawNumber(e.target.value))}
            maxLength={20}
            className="w-full rounded-xl border border-border bg-background pl-12 pr-4 py-3 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Voting Deadline */}
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-text">
          Voting deadline
        </label>
        <div className="grid grid-cols-2 gap-2">
          {DEADLINE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setVotingDeadline(opt.value)}
              className={[
                "py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95",
                votingDeadline === opt.value
                  ? "bg-primary text-white shadow-sm"
                  : "bg-subtle border border-border text-text hover:bg-subtle-hover",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Known Constraints (Proxy Members) */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-semibold text-text">
            Known constraints <span className="text-text-tertiary font-normal">(optional)</span>
          </label>
          <p className="text-xs text-text-tertiary mt-0.5">
            Add dates that won&apos;t work for members who may not use the tool
          </p>
        </div>

        {/* Added constraints list */}
        {proxyMembers.map((p, i) => (
          <div
            key={i}
            className="flex items-center gap-2 bg-subtle rounded-xl px-3.5 py-2.5"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-text">{p.name}</p>
              {p.start && p.end && (
                <p className="text-xs text-status-waiting font-medium flex items-center gap-1">
                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
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
              className="w-7 h-7 rounded-lg hover:bg-subtle-active flex items-center justify-center text-text-tertiary hover:text-text transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {/* Add constraint form */}
        <div className="bg-subtle/70 border border-border-light rounded-2xl p-4 space-y-2.5">
          <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
            Add a member&apos;s unavailable dates
          </p>
          <input
            type="text"
            placeholder="Name"
            value={pName}
            onChange={(e) => setPName(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">
                Unavailable from
              </label>
              <input
                type="date"
                value={pStart}
                onChange={(e) => setPStart(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">
                Unavailable to
              </label>
              <input
                type="date"
                value={pEnd}
                onChange={(e) => setPEnd(e.target.value)}
                min={pStart}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
            className="w-full bg-accent text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-accent-hover active:scale-[0.98] transition-all disabled:bg-subtle-active disabled:text-text-tertiary disabled:shadow-none flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Constraint
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-status-out-bg border border-status-out/15 rounded-lg px-3 py-2">
          <p className="text-status-out text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="w-full bg-gradient-to-r from-primary to-[#F4845F] text-white rounded-2xl px-5 py-4 text-sm font-bold font-heading shadow-md hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-sm flex items-center justify-center gap-2"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Creating...
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            Create Trip & Get Link
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </span>
        )}
      </button>
    </form>
  );
}
