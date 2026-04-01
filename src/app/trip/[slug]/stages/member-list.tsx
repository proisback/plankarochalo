"use client";

import { useState } from "react";
import type { Member, MemberStatus } from "@/lib/types";

const STATUS_CONFIG: Record<MemberStatus, { label: string; bg: string; text: string }> = {
  invited: { label: "Invited", bg: "bg-status-waiting-bg", text: "text-status-waiting" },
  responded: { label: "Responded", bg: "bg-status-responded-bg", text: "text-status-responded" },
  confirmed_in: { label: "I'm in", bg: "bg-status-confirmed-bg", text: "text-status-confirmed" },
  confirmed_out: { label: "Out", bg: "bg-status-out-bg", text: "text-status-out" },
  no_response: { label: "No response", bg: "bg-status-waiting-bg", text: "text-status-waiting" },
};

export function MemberList({ members }: { members: Member[] }) {
  const [expanded, setExpanded] = useState(false);
  const responded = members.filter((m) => m.status !== "invited" && m.status !== "no_response");

  return (
    <div className="bg-surface border border-gray-100 rounded-xl">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm"
      >
        <span className="font-medium">
          {members.length} member{members.length !== 1 ? "s" : ""}
          <span className="text-text-secondary font-normal">
            {" "}&middot; {responded.length} responded
          </span>
        </span>
        <span className="text-text-secondary text-xs">{expanded ? "Hide" : "Show"}</span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-2 space-y-2">
          {members.map((m) => {
            const config = STATUS_CONFIG[m.status];
            return (
              <div key={m.id} className="flex items-center justify-between py-1">
                <span className="text-sm">
                  {m.name}
                  {m.is_organizer && (
                    <span className="text-xs text-text-secondary ml-1">(organizer)</span>
                  )}
                  {m.is_proxy && (
                    <span className="text-xs text-text-secondary ml-1">(added by organizer)</span>
                  )}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}>
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

export function WaitingBanner({ members }: { members: Member[] }) {
  const waiting = members.filter(
    (m) => m.status === "invited" || m.status === "no_response"
  );
  if (waiting.length === 0) return null;

  return (
    <div className="bg-status-waiting-bg border border-status-waiting/20 rounded-xl px-4 py-3">
      <p className="text-status-waiting text-sm">
        Waiting on {waiting.length} {waiting.length === 1 ? "person" : "people"}:{" "}
        {waiting.map((m) => m.name).join(", ")}
      </p>
    </div>
  );
}
