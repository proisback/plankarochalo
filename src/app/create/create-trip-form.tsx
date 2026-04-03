"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateSlug } from "@/lib/slug";

const DURATION_OPTIONS = Array.from({ length: 14 }, (_, i) => i + 1);

const DEADLINE_OPTIONS = [
  { value: "none", label: "No deadline" },
  { value: "24h", label: "24 hours" },
  { value: "48h", label: "48 hours" },
  { value: "72h", label: "72 hours" },
];

export function CreateTripForm() {
  const router = useRouter();
  const supabase = createClient();

  const [organizerName, setOrganizerName] = useState("");
  const [name, setName] = useState("");
  const [tripDays, setTripDays] = useState(3);
  const [dateWindowStart, setDateWindowStart] = useState("");
  const [dateWindowEnd, setDateWindowEnd] = useState("");
  const [votingDeadline, setVotingDeadline] = useState("none");
  const [proxyMembers, setProxyMembers] = useState<
    { name: string; start: string; end: string }[]
  >([]);
  const [pName, setPName] = useState("");
  const [pStart, setPStart] = useState("");
  const [pEnd, setPEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadName() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const defaultName = user.user_metadata?.full_name || user.email?.split("@")[0] || "";
        setOrganizerName(defaultName);
      }
    }
    loadName();
  }, [supabase]);

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
        budget: null,
        date_window_start: dateWindowStart || null,
        date_window_end: dateWindowEnd || null,
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
      name: organizerName.trim(),
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

  const selectStyle = { backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2378716C' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", backgroundSize: "16px" };

  const inputClass = "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";
  const dateInputClass = "w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* === ESSENTIALS (always visible) === */}

      {/* Your name — pre-filled, just verify */}
      <div className="space-y-1.5">
        <label htmlFor="organizerName" className="block text-sm font-semibold text-text">
          Your name
        </label>
        <input
          id="organizerName"
          type="text"
          placeholder="e.g. Rahul"
          value={organizerName}
          onChange={(e) => setOrganizerName(e.target.value)}
          required
          maxLength={50}
          className={inputClass}
        />
      </div>

      {/* Trip name — the ONE required input */}
      <div className="space-y-1.5">
        <label htmlFor="name" className="block text-sm font-semibold text-text">
          Trip name
        </label>
        <input
          id="name"
          type="text"
          placeholder="e.g. Goa June 2026"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
          autoFocus
          className={inputClass}
        />
      </div>

      {/* Duration — inline, not a separate section */}
      <div className="space-y-1.5">
        <label htmlFor="tripDays" className="block text-sm font-semibold text-text">
          Trip duration
        </label>
        <select
          id="tripDays"
          value={tripDays}
          onChange={(e) => setTripDays(Number(e.target.value))}
          className={`${inputClass} appearance-none font-medium`}
          style={selectStyle}
        >
          {DURATION_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d} {d === 1 ? "day" : "days"}
            </option>
          ))}
        </select>
      </div>

      {/* === SUBMIT === */}
      {error && (
        <div className="bg-status-out-bg border border-status-out/15 rounded-lg px-3 py-2">
          <p className="text-status-out text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !name.trim() || !organizerName.trim()}
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

      {/* === MORE OPTIONS (collapsible) === */}
      <details className="group">
        <summary className="flex items-center justify-center gap-1.5 text-xs font-semibold text-text-tertiary cursor-pointer hover:text-text-secondary transition-colors py-1">
          <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
          More options
        </summary>

        <div className="mt-4 space-y-5 animate-in">
          {/* Date Window */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-text">
              Date window <span className="text-text-tertiary font-normal">(optional)</span>
            </label>
            <p className="text-xs text-text-tertiary">
              Restrict when members can pick dates
            </p>
            <div className="space-y-2">
              <div>
                <label className="block text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">Earliest</label>
                <input type="date" value={dateWindowStart} onChange={(e) => setDateWindowStart(e.target.value)} className={dateInputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">Latest</label>
                <input type="date" value={dateWindowEnd} onChange={(e) => setDateWindowEnd(e.target.value)} min={dateWindowStart} className={dateInputClass} />
              </div>
            </div>
          </div>

          {/* Voting Deadline */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-text">
              Voting deadline
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {DEADLINE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVotingDeadline(opt.value)}
                  className={[
                    "py-2 rounded-xl text-xs font-semibold transition-all active:scale-95",
                    votingDeadline === opt.value
                      ? "bg-primary text-white shadow-sm"
                      : "bg-subtle border border-border text-text-secondary hover:bg-subtle-hover",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Known Constraints */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-text">
                Known constraints <span className="text-text-tertiary font-normal">(optional)</span>
              </label>
              <p className="text-xs text-text-tertiary mt-0.5">
                Pre-add members who won&apos;t use the tool
              </p>
            </div>

            {proxyMembers.map((p, i) => (
              <div key={i} className="flex items-center gap-2 bg-subtle rounded-xl px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-text">{p.name}</p>
                  {p.start && p.end && (
                    <p className="text-[11px] text-status-waiting font-medium">
                      {new Date(p.start).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – {new Date(p.end).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} unavailable
                    </p>
                  )}
                </div>
                <button type="button" onClick={() => setProxyMembers((prev) => prev.filter((_, j) => j !== i))}
                  className="w-6 h-6 rounded-lg hover:bg-subtle-active flex items-center justify-center text-text-tertiary hover:text-text transition-all">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            <div className="bg-subtle/50 border border-border-light rounded-xl p-3 space-y-2">
              <input type="text" placeholder="Member name" value={pName} onChange={(e) => setPName(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all" />
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-[9px] text-text-tertiary uppercase tracking-wider mb-0.5">From</label>
                  <input type="date" value={pStart} onChange={(e) => setPStart(e.target.value)}
                    className="w-full min-w-0 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all" />
                </div>
                <div className="flex-1">
                  <label className="block text-[9px] text-text-tertiary uppercase tracking-wider mb-0.5">To</label>
                  <input type="date" value={pEnd} onChange={(e) => setPEnd(e.target.value)} min={pStart}
                    className="w-full min-w-0 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all" />
                </div>
                <button type="button" disabled={!pName.trim()}
                  onClick={() => {
                    if (!pName.trim()) return;
                    setProxyMembers((prev) => [...prev, { name: pName.trim(), start: pStart, end: pEnd }]);
                    setPName(""); setPStart(""); setPEnd("");
                  }}
                  className="shrink-0 w-8 h-8 rounded-lg bg-accent text-white hover:bg-accent-hover active:scale-90 transition-all disabled:bg-subtle-active disabled:text-text-tertiary flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </details>
    </form>
  );
}
