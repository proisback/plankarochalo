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
    bg: "bg-status-confirmed-bg",
    text: "text-status-confirmed",
  },
  responded: {
    icon: "●",
    label: "Dates set",
    bg: "bg-status-responded-bg",
    text: "text-status-responded",
  },
  invited: {
    icon: "⏳",
    label: "Waiting",
    bg: "bg-status-waiting-bg",
    text: "text-status-waiting",
  },
  no_response: {
    icon: "⏳",
    label: "Waiting",
    bg: "bg-status-waiting-bg",
    text: "text-status-waiting",
  },
  confirmed_out: {
    icon: "✕",
    label: "Out",
    bg: "bg-status-out-bg",
    text: "text-status-out",
  },
};

type BadgeConfig = { icon: string; label: string; bg: string; text: string };

function hasResponded(m: Member, tripStatus?: TripStatus): boolean {
  if (m.status === "confirmed_in" || m.status === "confirmed_out") return true;
  if (tripStatus === "destination_open") return !!m.destination_vote;
  if (tripStatus === "commitment") return false;
  return m.status !== "invited" && m.status !== "no_response";
}

function getBadge(m: Member, tripStatus?: TripStatus): BadgeConfig {
  if (m.status === "confirmed_in" || m.status === "confirmed_out") {
    return STATUS_CONFIG[m.status];
  }

  if (tripStatus === "destination_open") {
    if (m.destination_vote) {
      return { icon: "✓", label: "Voted", bg: "bg-status-responded-bg", text: "text-status-responded" };
    }
    return { icon: "⏳", label: "Waiting", bg: "bg-status-waiting-bg", text: "text-status-waiting" };
  }

  if (tripStatus === "commitment") {
    return { icon: "⏳", label: "Waiting", bg: "bg-status-waiting-bg", text: "text-status-waiting" };
  }

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

// Avatar color rotation
const AVATAR_COLORS = [
  "bg-primary/12 text-primary",
  "bg-accent/12 text-accent",
  "bg-status-pending/12 text-status-pending",
  "bg-status-responded/12 text-status-responded",
  "bg-status-waiting/12 text-status-waiting",
];

function getAvatarColor(index: number, isOrganizer: boolean): string {
  if (isOrganizer) return "bg-primary/15 text-primary";
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

/* -- EditProxyForm -- */
function EditProxyForm({
  member,
  onSave,
  onCancel,
  tripStatus,
  destinationOptions,
  onProxyVote,
  onProxyCommit,
}: {
  member: Member;
  onSave: () => void;
  onCancel: () => void;
  tripStatus?: TripStatus;
  destinationOptions?: { id: string; name: string; emoji: string }[];
  onProxyVote?: (memberId: string, optionId: string) => void;
  onProxyCommit?: (memberId: string, status: "confirmed_in" | "confirmed_out") => void;
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

    const updates: Record<string, unknown> = { name: name.trim() };

    if (tripStatus === "dates_open") {
      updates.constraint_start = constraintStart || null;
      updates.constraint_end = constraintEnd || null;
      updates.constraint_note =
        constraintStart && constraintEnd
          ? `${new Date(constraintStart).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – ${new Date(constraintEnd).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} unavailable`
          : null;

      if (availStart && availEnd) {
        updates.availability_start = availStart;
        updates.availability_end = availEnd;
        updates.status = "responded";
      }
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
    "w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

  return (
    <div className="border-t border-border-light px-4 py-3 space-y-3 bg-subtle/50 animate-in">
      {/* Name */}
      <div>
        <label className="block text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">
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

      {/* Dates stage: constraint + availability dates */}
      {tripStatus === "dates_open" && (
        <>
          <div>
            <label className="block text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">
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

          <div className="bg-accent/5 rounded-xl p-3">
            <label className="block text-[11px] font-semibold text-accent uppercase tracking-wider mb-1.5">
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
        </>
      )}

      {/* Destination stage: vote picker */}
      {tripStatus === "destination_open" && destinationOptions && onProxyVote && (
        <div>
          <label className="block text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">
            Vote for destination
          </label>
          <div className="flex flex-wrap gap-1.5">
            {destinationOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onProxyVote(member.id, opt.id);
                  onSave();
                }}
                className={[
                  "flex items-center gap-1.5 border-2 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all active:scale-95",
                  member.destination_vote === opt.id
                    ? "bg-primary-light border-primary/25 text-primary"
                    : "bg-surface border-border hover:bg-primary-light hover:border-primary/20",
                ].join(" ")}
              >
                <span>{opt.emoji}</span>
                {opt.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Commitment stage: in/out picker */}
      {tripStatus === "commitment" && onProxyCommit && (
        <div>
          <label className="block text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">
            Confirm attendance
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onProxyCommit(member.id, "confirmed_in");
                onSave();
              }}
              className={[
                "flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all active:scale-95",
                member.status === "confirmed_in"
                  ? "bg-accent text-white shadow-sm"
                  : "bg-accent/8 text-accent border-2 border-accent/20 hover:bg-accent hover:text-white",
              ].join(" ")}
            >
              In ✓
            </button>
            <button
              type="button"
              onClick={() => {
                onProxyCommit(member.id, "confirmed_out");
                onSave();
              }}
              className={[
                "flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all active:scale-95",
                member.status === "confirmed_out"
                  ? "bg-status-out text-white shadow-sm"
                  : "bg-status-out-bg text-status-out border-2 border-status-out/15 hover:bg-status-out hover:text-white",
              ].join(" ")}
            >
              Out ✕
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-status-out-bg border border-status-out/15 rounded-lg px-3 py-1.5">
          <p className="text-status-out text-xs">{error}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex-1 bg-primary text-white rounded-xl px-3 py-2 text-sm font-semibold shadow-sm hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-subtle-hover text-text-secondary rounded-xl px-3 py-2 text-sm font-medium hover:bg-subtle-active active:scale-[0.98] transition-all"
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
  onProxyCommit,
}: {
  members: Member[];
  isOrganizer?: boolean;
  onMembersUpdated?: () => Promise<void>;
  tripStatus?: TripStatus;
  destinationOptions?: { id: string; name: string; emoji: string }[];
  onProxyVote?: (memberId: string, optionId: string) => void;
  onProxyCommit?: (memberId: string, status: "confirmed_in" | "confirmed_out") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [votingForMemberId, setVotingForMemberId] = useState<string | null>(null);
  const [committingMemberId, setCommittingMemberId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const responded = members.filter((m) => hasResponded(m, tripStatus));
  const waiting = members.length - responded.length;

  function handleEditSaved() {
    setEditingId(null);
    onMembersUpdated?.();
  }

  return (
    <div className="bg-surface border border-border-light rounded-2xl overflow-hidden shadow-xs">
      {/* header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-subtle/50 transition-colors"
      >
        <span className="flex items-center gap-2 text-xs">
          <span className="font-bold text-text-secondary uppercase tracking-wider">
            Group &middot; {members.length}
          </span>
          <span className="text-status-confirmed font-semibold">
            {responded.length} responded
          </span>
          {waiting > 0 && (
            <span className="text-status-waiting font-semibold">
              &middot; {waiting} waiting
            </span>
          )}
        </span>
        <svg
          className={[
            "w-4 h-4 text-text-tertiary transition-transform duration-200",
            expanded ? "rotate-180" : "",
          ].join(" ")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* member rows */}
      {expanded &&
        members.map((m, memberIndex) => {
          if (editingId === m.id) {
            return (
              <EditProxyForm
                key={m.id}
                member={m}
                onSave={handleEditSaved}
                onCancel={() => setEditingId(null)}
                tripStatus={tripStatus}
                destinationOptions={destinationOptions}
                onProxyVote={onProxyVote}
                onProxyCommit={onProxyCommit}
              />
            );
          }

          const config = getBadge(m, tripStatus);

          let subtitle: string | null = null;
          if (tripStatus === "dates_open") {
            subtitle = formatDateRange(m.availability_start, m.availability_end);
          } else if (tripStatus === "destination_open") {
            if (m.destination_vote && destinationOptions) {
              const voted = destinationOptions.find((o) => o.id === m.destination_vote);
              if (voted) subtitle = `${voted.emoji} ${voted.name}`;
            }
          } else if (tripStatus === "commitment") {
            if (m.status === "confirmed_in") subtitle = "Going!";
            else if (m.status === "confirmed_out") subtitle = "Not going";
          }

          return (
            <div key={m.id} className="border-t border-border-light">
            <div
              className="flex items-center justify-between px-4 py-2 hover:bg-subtle/30 transition-colors"
            >
              {/* left: avatar + info */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={[
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ring-2 ring-surface",
                    getAvatarColor(memberIndex, m.is_organizer),
                  ].join(" ")}
                >
                  {initials(m.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-tight truncate text-text">
                    {m.name}
                  </p>
                  {m.is_organizer && (
                    <p className="text-[11px] text-primary font-medium leading-tight">
                      Organizer
                    </p>
                  )}
                  {m.is_proxy && !m.is_organizer && (
                    <p className="text-[11px] text-text-tertiary leading-tight">
                      Added by organizer
                    </p>
                  )}
                  {subtitle && (
                    <p className="text-[11px] text-text-secondary leading-tight">
                      {subtitle}
                    </p>
                  )}
                  {m.constraint_note && (
                    <p className="text-[11px] text-status-waiting leading-tight flex items-center gap-0.5">
                      <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      {m.constraint_note}
                    </p>
                  )}
                </div>
              </div>

              {/* right: badge + actions */}
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <span
                  className={[
                    "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                    config.bg,
                    config.text,
                  ].join(" ")}
                >
                  <span>{config.icon}</span>
                  {config.label}
                </span>
                {/* Proxy vote button */}
                {isOrganizer && m.is_proxy && tripStatus === "destination_open" && onProxyVote && destinationOptions && (
                  <button
                    onClick={() => { setVotingForMemberId(votingForMemberId === m.id ? null : m.id); setCommittingMemberId(null); }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-text-tertiary hover:bg-subtle-hover hover:text-text-secondary transition-all text-xs"
                    aria-label={`Vote for ${m.name}`}
                  >
                    🗳
                  </button>
                )}
                {/* Proxy commit button */}
                {isOrganizer && m.is_proxy && tripStatus === "commitment" && onProxyCommit && m.status !== "confirmed_in" && m.status !== "confirmed_out" && (
                  <button
                    onClick={() => { setCommittingMemberId(committingMemberId === m.id ? null : m.id); setVotingForMemberId(null); }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-text-tertiary hover:bg-subtle-hover hover:text-text-secondary transition-all text-xs"
                    aria-label={`Confirm ${m.name}`}
                  >
                    ✋
                  </button>
                )}
                {isOrganizer && m.is_proxy && (
                  <button
                    onClick={() => setEditingId(m.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-text-tertiary hover:bg-subtle-hover hover:text-text-secondary transition-all"
                    aria-label={`Edit ${m.name}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Inline vote picker */}
            {votingForMemberId === m.id && destinationOptions && onProxyVote && (
              <div className="px-4 py-2 flex flex-wrap gap-1.5 bg-subtle/50 animate-in">
                {destinationOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      onProxyVote(m.id, opt.id);
                      setVotingForMemberId(null);
                    }}
                    className="flex items-center gap-1.5 bg-surface hover:bg-primary-light border-2 border-border hover:border-primary/20 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all active:scale-95"
                  >
                    <span>{opt.emoji}</span>
                    {opt.name}
                  </button>
                ))}
              </div>
            )}

            {/* Inline commitment picker */}
            {committingMemberId === m.id && onProxyCommit && (
              <div className="px-4 py-2 flex gap-2 bg-subtle/50 animate-in">
                <button
                  onClick={() => { onProxyCommit(m.id, "confirmed_in"); setCommittingMemberId(null); }}
                  className="flex-1 bg-accent text-white rounded-xl py-2 text-xs font-semibold shadow-sm hover:bg-accent-hover active:scale-95 transition-all"
                >
                  In ✓
                </button>
                <button
                  onClick={() => { onProxyCommit(m.id, "confirmed_out"); setCommittingMemberId(null); }}
                  className="flex-1 bg-surface text-status-out border-2 border-status-out/15 rounded-xl py-2 text-xs font-semibold hover:bg-status-out-bg active:scale-95 transition-all"
                >
                  Out ✕
                </button>
              </div>
            )}
          </div>
          );
        })}
    </div>
  );
}

/* -- WaitingBanner -- */
export function WaitingBanner({ members, tripStatus }: { members: Member[]; tripStatus?: TripStatus }) {
  const waiting = members.filter((m) => !hasResponded(m, tripStatus));
  if (waiting.length === 0) return null;

  return (
    <div className="bg-status-waiting-bg/60 border border-status-waiting/10 rounded-xl px-4 py-3 flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-status-waiting/10 flex items-center justify-center shrink-0">
        <svg className="w-3.5 h-3.5 text-status-waiting" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="text-status-waiting text-sm font-medium">
        Waiting on {waiting.length}{" "}
        {waiting.length === 1 ? "person" : "people"}:{" "}
        <span className="font-normal">{waiting.map((m) => m.name).join(", ")}</span>
      </p>
    </div>
  );
}
