"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Trip, Member } from "@/lib/types";
import { MemberList, WaitingBanner } from "./member-list";
import { LockButton } from "./lock-button";

export function CommitmentStage({
  trip,
  members,
  currentMember,
  isOrganizer,
  onMembersUpdated,
}: {
  trip: Trip;
  members: Member[];
  currentMember: Member;
  isOrganizer: boolean;
  onMembersUpdated?: () => Promise<void>;
}) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const confirmedIn = members.filter((m) => m.status === "confirmed_in");
  const confirmedOut = members.filter((m) => m.status === "confirmed_out");
  const myStatus = currentMember.status;
  const userIn = myStatus === "confirmed_in";
  const userOut = myStatus === "confirmed_out";

  async function handleCommit(status: "confirmed_in" | "confirmed_out") {
    setSaving(true);
    setError("");
    const { error: commitError } = await supabase
      .from("members")
      .update({ status })
      .eq("id", currentMember.id);
    if (commitError) setError(commitError.message);
    setSaving(false);
  }

  async function handleProxyCommit(memberId: string, status: "confirmed_in" | "confirmed_out") {
    setError("");
    const { error: commitError } = await supabase
      .from("members")
      .update({ status })
      .eq("id", memberId);
    if (commitError) setError(commitError.message);
    await onMembersUpdated?.();
  }

  async function handleLock() {
    await supabase
      .from("trips")
      .update({ status: "ready" })
      .eq("id", trip.id);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-lg font-semibold">Are you in?</h2>
        <p className="text-text-secondary text-sm">
          {confirmedIn.length} of {members.length} confirmed
        </p>
      </div>

      {error && <p className="text-status-out text-sm">{error}</p>}

      {/* Commitment buttons — always visible, selected one highlighted */}
      <div className="flex gap-3">
        <button
          onClick={() => handleCommit("confirmed_in")}
          disabled={saving}
          className={`flex-[2] rounded-xl py-3.5 text-base font-bold font-heading transition-colors disabled:opacity-50 ${
            userIn
              ? "bg-accent text-white shadow-sm"
              : "bg-accent/10 text-accent border-2 border-accent/30 hover:bg-accent hover:text-white"
          }`}
        >
          I&apos;m In ✓
        </button>
        <button
          onClick={() => handleCommit("confirmed_out")}
          disabled={saving}
          className={`flex-1 rounded-xl py-3.5 text-sm font-semibold font-heading transition-colors disabled:opacity-50 ${
            userOut
              ? "bg-status-out text-white"
              : "bg-surface text-status-out border-2 border-status-out/30 hover:bg-status-out hover:text-white"
          }`}
        >
          I&apos;m Out
        </button>
      </div>

      {/* Summary */}
      {(confirmedIn.length > 0 || confirmedOut.length > 0) && (
        <div className="bg-surface border border-gray-100 rounded-xl p-4 space-y-2">
          {confirmedIn.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-status-confirmed text-sm">✅</span>
              <p className="text-sm">
                <span className="font-medium">{confirmedIn.length} in:</span>{" "}
                {confirmedIn.map((m) => m.name).join(", ")}
              </p>
            </div>
          )}
          {confirmedOut.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-status-out text-sm">✕</span>
              <p className="text-sm">
                <span className="font-medium">{confirmedOut.length} out:</span>{" "}
                {confirmedOut.map((m) => m.name).join(", ")}
              </p>
            </div>
          )}
        </div>
      )}

      <WaitingBanner members={members} />
      <MemberList members={members} isOrganizer={isOrganizer} onMembersUpdated={onMembersUpdated} tripStatus={trip.status} onProxyCommit={isOrganizer ? handleProxyCommit : undefined} />

      {isOrganizer && confirmedIn.length > 0 && (
        <LockButton
          label={`Lock Trip — ${confirmedIn.length} going! 🎉`}
          confirmMessage={`Finalize with ${confirmedIn.length} people going? This will mark the trip as ready.`}
          onLock={handleLock}
        />
      )}
    </div>
  );
}
