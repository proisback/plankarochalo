"use client";

import { useState, useMemo } from "react";
import type { Trip, Member } from "@/lib/types";
import { findBudgetOverlap } from "@/lib/overlap";

export function ReadyStage({
  trip,
  members,
  currentMember,
}: {
  trip: Trip;
  members: Member[];
  currentMember?: Member;
}) {
  const [copied, setCopied] = useState(false);
  const confirmedIn = members.filter((m) => m.status === "confirmed_in");
  const budgetOverlap = useMemo(() => findBudgetOverlap(members), [members]);

  const budgetLabel = budgetOverlap
    ? `₹${(budgetOverlap.min / 1000).toFixed(0)}K–₹${(budgetOverlap.max / 1000).toFixed(0)}K per person`
    : null;

  const dateRange =
    trip.locked_dates_start && trip.locked_dates_end
      ? `${new Date(trip.locked_dates_start).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} — ${new Date(trip.locked_dates_end).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`
      : "";

  const whatsappMessage = [
    `✅ *${trip.name}* is locked in!`,
    "",
    `📍 *Destination:* ${trip.locked_destination}`,
    `📅 *Dates:* ${dateRange} (${trip.trip_days} days)`,
    budgetLabel ? `💰 *Budget:* ${budgetLabel}` : null,
    "",
    `👥 *Who's going (${confirmedIn.length}):*`,
    ...confirmedIn.map((m) => `  • ${m.name}`),
    "",
    `🔗 Trip details: ${typeof window !== "undefined" ? window.location.href : ""}`,
    "",
    `— Planned with Plan Karo Chalo`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  async function handleCopy() {
    await navigator.clipboard.writeText(whatsappMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Color palette for avatars
  const avatarColors = [
    "bg-primary/15 text-primary",
    "bg-accent/15 text-accent",
    "bg-status-pending/15 text-status-pending",
    "bg-status-responded/15 text-status-responded",
    "bg-status-waiting/15 text-status-waiting",
  ];

  return (
    <div className="space-y-5">
      {/* Celebration header */}
      <div className="text-center py-6 relative">
        {/* Decorative dots */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[
            "top-2 left-[15%] w-2 h-2 bg-primary/20",
            "top-6 right-[20%] w-1.5 h-1.5 bg-accent/25",
            "top-0 right-[35%] w-1 h-1 bg-status-pending/30",
            "bottom-4 left-[25%] w-1.5 h-1.5 bg-status-waiting/25",
            "bottom-2 right-[15%] w-2 h-2 bg-primary/15",
            "top-10 left-[40%] w-1 h-1 bg-accent/20",
          ].map((classes, i) => (
            <div key={i} className={`absolute rounded-full ${classes}`} />
          ))}
        </div>

        <div className="text-5xl mb-4 animate-in">🎉</div>
        <h2 className="font-heading text-2xl font-extrabold text-text animate-in" style={{ animationDelay: "80ms" }}>
          {currentMember?.name ? `${currentMember.name}, it's happening!` : "Trip is a go!"}
        </h2>
        <p className="text-text-secondary text-sm mt-1.5 animate-in" style={{ animationDelay: "160ms" }}>
          No more &quot;let&apos;s plan later.&quot; This one&apos;s real.
        </p>
      </div>

      {/* Trip summary card */}
      <div className="bg-surface rounded-2xl p-5 shadow-md border border-border-light animate-in" style={{ animationDelay: "240ms" }}>
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center text-2xl shrink-0">
            {trip.locked_destination?.split(" ")[0]}
          </div>
          <div>
            <p className="font-heading font-bold text-text">{trip.locked_destination?.split(" ").slice(1).join(" ")}</p>
            <p className="text-sm text-text-secondary">{dateRange} &middot; {trip.trip_days} days</p>
          </div>
        </div>

        {budgetLabel && (
          <div className="flex items-center gap-2 text-sm text-text-secondary mb-4 pb-4 border-b border-border-light">
            <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
            Budget: {budgetLabel}
          </div>
        )}

        <div>
          <p className="text-xs text-text-tertiary font-semibold uppercase tracking-wider mb-2.5">
            {confirmedIn.length} people going
          </p>
          <div className="flex flex-wrap gap-2">
            {confirmedIn.map((m, i) => (
              <div
                key={m.id}
                className="flex items-center gap-1.5 bg-subtle rounded-full pl-1 pr-2.5 py-1"
              >
                <div className={[
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                  avatarColors[i % avatarColors.length],
                ].join(" ")}>
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-medium text-text">{m.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WhatsApp share button */}
      <button
        onClick={handleCopy}
        className="w-full bg-whatsapp text-white rounded-2xl px-5 py-4 text-sm font-bold shadow-sm hover:bg-whatsapp-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 animate-in"
        style={{ animationDelay: "320ms" }}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        {copied ? "Copied to clipboard!" : "Copy summary for WhatsApp"}
      </button>
    </div>
  );
}
