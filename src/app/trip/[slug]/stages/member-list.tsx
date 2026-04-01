"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Member, MemberStatus, TripStatus } from "@/lib/types";

/* -- status badge config -- */
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

type BadgeConfig = { icon: string; label: string; bg: string; text: string };

function getBadge(m: Member, tripStatus?: TripStatus): BadgeConfig {
  // Commitment / ready stages — use status directly
  if (m.status === "confirmed_in" || m.status === "confirmed_out") {
    return STATUS_CONFIG[m.status];
  }

  // Destination stage — badge based on vote, not dates status
  if (tripStatus === "destination_open") {
    if (m.destination_vote) {
      return { icon: "✓", label: "Voted", bg: "bg-teal-100", text: "text-teal-700" };
    }
    return { icon: "⏳", label: "Waiting", bg: "bg-amber-100", text: "text-amber-700" };
  }

  // Commitment stage — waiting unless committed
  if (tripStatus === "commitment") {
    return { icon: "⏳", label: "Waiting", bg: "bg-amber-100", text: "text-amber-700" };
  }

  // Dates stage + default — use member status
  return STATUS_CONFIG[m.status];
}

/* -- helpers -- */
function formatDateRange(
  start: string | null,
  end: string | null
): string | null {
  if (!start || !end) return null;
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

function initials(name: string): string {
  return name.charAt(0).toUpperCase();
}

/* -- EditProxyForm -- */
function EditProxyForm({
  member,
  onSave,
  onCancel,
}: {
  member: Member;
  onSave: () => void;
  onCancel: () => void;
}) {
  const supabase = createClient();
  const [name, setName] = useState(member.name);
  const [constraintStart, setConstraintStart] = useState(
    member.constraint_start || ""
  );
  const [constraintEnd, setConstraintEnd] = useState(
    member.constraint_end || ""
  );
  const [availStart, setAvailStart] = useState(
    member.availability_start || ""
  );
  const [availEnd, setAvailEnd] = useState(member.availability_end || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");

    const updates: Record<string, unknown> = {
      name: name.trim(),
      constraint_start: constraintStart || null,
      constraint_end: constraintEnd || null,
      constraint_note:
        constraintStart && constraintEnd
          ? `${new Date(constraintStart).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – ${new Date(constraintEnd).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} unavailable`
          : null,
    };

    if (availStart && availEnd) {
      updates.availability_start = availStart;
      updates.availability_end = availEnd;
      updates.status = "responded";
    }

    const { error: saveError } = await supabase
      .from("members")
      .update(updates)
      .eq("id", member.id);

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    onSave();
  }

  const inputClass =
    "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";

  return (
    <div className="border-t border-gray-100 px-4 py-3 space-y-3">
      {/* Name */}
      <div>
        <label className="block text-[11px] font-medium text-text-secondary mb-1">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          className={inputClass}
        />
      </div>

      {/* Constraint dates */}
      <div>
        <label className="block text-[11px] font-medium text-text-secondary mb-1">
          Unavailable dates
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={constraintStart}
            onChange={(e) => setConstraintStart(e.target.value)}
            className={inputClass}
          />
          <input
            type="date"
            value={constraintEnd}
            onChange={(e) => setConstraintEnd(e.target.value)}
            min={constraintStart}
            className={inputClass}
          />
        </div>
      </div>

      {/* Availability dates */}
      <div className="bg-accent/5 rounded-lg p-2.5">
        <label className="block text-[11px] font-medium text-accent mb-1">
          Available dates (submit on their behalf)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={availStart}
            onChange={(e) => setAvailStart(e.target.value)}
            className={inputClass}
          />
          <input
            type="date"
            value={availEnd}
            onChange={(e) => setAvailEnd(e.target.value)}
            min={availStart}
            className={inputClass}
          />
        </div>
      </div>

      {error && <p className="text-red-600 text-xs">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex-1 bg-primary text-white rounded-lg px-3 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-gray-100 text-text-secondary rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* -- MemberList -- */
export function MemberList({
  members,
  isOrganizer,
  onMembersUpdated,
  tripStatus,
  destinationOptions,
  onProxyVote,
}: {
  members: Member[];
  isOrganizer?: boolean;
  onMembersUpdated?: () => Promise<void>;
  tripStatus?: TripStatus;
  destinationOptions?: { id: string; name: string; emoji: string }[];
  onProxyVote?: (memberId: string, optionId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [votingForMemberId, setVotingForMemberId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const responded = members.filter(
    (m) => m.status !== "invited" && m.status !== "no_response"
  );
  const waiting = members.length - responded.length;

  function handleEditSaved() {
    setEditingId(null);
    onMembersUpdated?.();
  }

  return (
    <div className="bg-surface border border-gray-100 rounded-xl overflow-hidden">
      {/* header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <span className="flex items-center gap-1.5 text-xs">
          <span className="font-semibold tracking-widest uppercase text-text-secondary">
            Group &middot; {members.length}
          </span>
          <span className="text-green-600 font-medium">
            {responded.length} responded
          </span>
          {waiting > 0 && (
            <span className="text-amber-600 font-medium">
              &middot; {waiting} waiting
            </span>
          )}
        </span>
        <span className="text-text-secondary text-sm leading-none">
          {expanded ? "▾" : "▸"}
        </span>
      </button>

      {/* member rows */}
      {expanded &&
        members.map((m) => {
          // Editing mode for this proxy member
          if (editingId === m.id) {
            return (
              <EditProxyForm
                key={m.id}
                member={m}
                onSave={handleEditSaved}
                onCancel={() => setEditingId(null)}
              />
            );
          }

          const config = getBadge(m, tripStatus);

          // Stage-aware subtitle
          let subtitle: string | null = null;
          if (tripStatus === "destination_open" && m.destination_vote && destinationOptions) {
            const voted = destinationOptions.find((o) => o.id === m.destination_vote);
            if (voted) subtitle = `${voted.emoji} ${voted.name}`;
          }
          if (!subtitle) {
            subtitle = formatDateRange(
              m.availability_start ?? m.constraint_start,
              m.availability_end ?? m.constraint_end
            );
          }

          return (
            <div key={m.id} className="border-t border-gray-100">
            <div
              className="flex items-center justify-between px-4 py-1.5"
            >
              {/* left: avatar + info */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                    m.is_organizer
                      ? "bg-primary/15 text-primary"
                      : "bg-accent/15 text-accent"
                  }`}
                >
                  {initials(m.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium leading-tight truncate">
                    {m.name}
                  </p>
                  {m.is_organizer && (
                    <p className="text-[11px] text-primary leading-tight">
                      Organizer
                    </p>
                  )}
                  {m.is_proxy && !m.is_organizer && (
                    <p className="text-[11px] text-text-secondary leading-tight">
                      Added by organizer
                    </p>
                  )}
                  {subtitle && (
                    <p className="text-[11px] text-text-secondary leading-tight">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* right: badge + actions */}
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}
                >
                  <span>{config.icon}</span>
                  {config.label}
                </span>
                {/* Proxy vote button on destination stage */}
                {isOrganizer && m.is_proxy && tripStatus === "destination_open" && onProxyVote && destinationOptions && (
                  <button
                    onClick={() => setVotingForMemberId(votingForMemberId === m.id ? null : m.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-text-secondary hover:bg-gray-100 transition-colors text-xs"
                    aria-label={`Vote for ${m.name}`}
                  >
                    🗳
                  </button>
                )}
                {isOrganizer && m.is_proxy && (
                  <button
                    onClick={() => setEditingId(m.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-text-secondary hover:bg-gray-100 transition-colors text-sm"
                    aria-label={`Edit ${m.name}`}
                  >
                    ✎
                  </button>
                )}
              </div>
            </div>

            {/* Inline vote picker for proxy member */}
            {votingForMemberId === m.id && destinationOptions && onProxyVote && (
              <div className="border-t border-gray-100 px-4 py-2 flex flex-wrap gap-1.5">
                {destinationOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      onProxyVote(m.id, opt.id);
                      setVotingForMemberId(null);
                    }}
                    className="flex items-center gap-1.5 bg-gray-50 hover:bg-primary-light hover:border-primary/30 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                  >
                    <span>{opt.emoji}</span>
                    {opt.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          );
        })}
    </div>
  );
}

/* -- WaitingBanner -- */
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
