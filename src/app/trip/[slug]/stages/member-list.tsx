"use client";

import { useState } from "react";
import type { Member, MemberStatus } from "@/lib/types";

/* ── status badge config ── */
const STATUS_CONFIG: Record<
  MemberStatus,
  { icon: string; label: string; bg: string; text: string }
> = {
  confirmed_in: {
    icon: "✓",
    label: "Confirmed",
    bg: "bg-green-100",
    text: "text-green-700",
  },
  responded: {
    icon: "●",
    label: "Dates set",
    bg: "bg-teal-100",
    text: "text-teal-700",
  },
  invited: {
    icon: "⏳",
    label: "Waiting",
    bg: "bg-amber-100",
    text: "text-amber-700",
  },
  no_response: {
    icon: "⏳",
    label: "Waiting",
    bg: "bg-amber-100",
    text: "text-amber-700",
  },
  confirmed_out: {
    icon: "✕",
    label: "Out",
    bg: "bg-red-100",
    text: "text-red-700",
  },
};

/* ── helpers ── */
function formatDateRange(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function initials(name: string): string {
  return name.charAt(0).toUpperCase();
}

/* ── MemberList ── */
export function MemberList({ members }: { members: Member[] }) {
  const [expanded, setExpanded] = useState(false);

  const responded = members.filter(
    (m) => m.status !== "invited" && m.status !== "no_response"
  );
  const waiting = members.length - responded.length;

  return (
    <div className="bg-surface border border-gray-100 rounded-xl overflow-hidden">
      {/* header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <span className="flex items-center gap-1.5 text-xs">
          <span className="font-semibold tracking-widest uppercase text-text-secondary">
            Group · {members.length}
          </span>
          <span className="text-green-600 font-medium">
            {responded.length} responded
          </span>
          {waiting > 0 && (
            <span className="text-amber-600 font-medium">
              · {waiting} waiting
            </span>
          )}
        </span>
        <span className="text-text-secondary text-sm leading-none">
          {expanded ? "▾" : "▸"}
        </span>
      </button>

      {/* member rows */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-2 space-y-1">
          {members.map((m) => {
            const config = STATUS_CONFIG[m.status];
            const dateRange = formatDateRange(
              m.availability_start ?? m.constraint_start,
              m.availability_end ?? m.constraint_end
            );

            return (
              <div
                key={m.id}
                className="flex items-center justify-between py-1.5"
              >
                {/* left: avatar + info */}
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                      m.is_organizer
                        ? "bg-primary/15 text-primary"
                        : "bg-accent/15 text-accent"
                    }`}
                  >
                    {initials(m.name)}
                  </div>

                  {/* name + meta */}
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium leading-tight truncate">
                      {m.name}
                    </p>
                    {m.is_organizer && (
                      <p className="text-[11px] text-primary leading-tight">
                        Organizer
                      </p>
                    )}
                    {dateRange && (
                      <p className="text-[11px] text-text-secondary leading-tight">
                        {dateRange}
                      </p>
                    )}
                  </div>
                </div>

                {/* right: status badge */}
                <span
                  className={`shrink-0 ml-2 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}
                >
                  <span>{config.icon}</span>
                  {config.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── WaitingBanner ── */
export function WaitingBanner({ members }: { members: Member[] }) {
  const waiting = members.filter(
    (m) => m.status === "invited" || m.status === "no_response"
  );
  if (waiting.length === 0) return null;

  return (
    <div className="bg-status-waiting-bg border border-status-waiting/20 rounded-xl px-4 py-3">
      <p className="text-status-waiting text-sm">
        ⏳ Waiting on {waiting.length}{" "}
        {waiting.length === 1 ? "person" : "people"}:{" "}
        {waiting.map((m) => m.name).join(", ")}
      </p>
    </div>
  );
}
