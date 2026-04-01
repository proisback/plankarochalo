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

  async function handleLock() {
    await supabase
      .from("trips")
      .update({ status: "ready" })
      .eq("id", trip.id);
  }

  return (
    <div className="space-y-4">
      {/* Locked decisions */}
      <div className="bg-status-confirmed-bg rounded-xl px-4 py-2.5 flex items-center gap-2">
        <span className="text-base">✓</span>
        <span className="text-sm font-semibold text-status-confirmed">
          Dates: {trip.locked_dates_start && trip.locked_dates_end
            ? `${new Date(trip.locked_dates_start).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – ${new Date(trip.locked_dates_end).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`
            : ""}
        </span>
      </div>
      <div className="bg-status-confirmed-bg rounded-xl px-4 py-2.5 flex items-center gap-2">
        <span className="text-base">✓</span>
        <span className="text-sm font-semibold text-status-confirmed">
          Destination: {trip.locked_destination}
        </span>
      </div>

      <div>
        <h2 className="font-heading text-lg font-semibold">Are you in?</h2>
        <p className="text-text-secondary text-sm">
          {confirmedIn.length} of {members.length} confirmed
        </p>
      </div>

      {error && <p className="text-status-out text-sm">{error}</p>}

      {/* Commitment buttons — asymmetric: I'm In (2/3) + I'm Out (1/3) */}
      {!userIn && !userOut ? (
        <div className="flex gap-3">
          <button
            onClick={() => handleCommit("confirmed_in")}
            disabled={saving}
            className="flex-[2] bg-accent text-white rounded-xl py-3.5 text-base font-bold font-heading hover:bg-accent/90 transition-colors disabled:opacity-50 shadow-sm"
          >
            I&apos;m In ✓
          </button>
          <button
            onClick={() => handleCommit("confirmed_out")}
            disabled={saving}
            className="flex-1 bg-surface text-status-out border-2 border-status-out rounded-xl py-3.5 text-sm font-semibold font-heading hover:bg-status-out-bg transition-colors disabled:opacity-50"
          >
            I&apos;m Out
          </button>
        </div>
      ) : userIn ? (
        <div className="text-center py-3.5 bg-status-confirmed-bg rounded-xl">
          <p className="text-sm font-semibold text-status-confirmed">✓ You&apos;re confirmed!</p>
        </div>
      ) : (
        <div className="text-center py-3.5 bg-status-out-bg rounded-xl">
          <p className="text-sm font-semibold text-status-out">You&apos;re sitting this one out</p>
          <button
            onClick={() => handleCommit("confirmed_in")}
            disabled={saving}
            className="text-xs text-primary underline mt-1"
          >
            Changed your mind?
          </button>
        </div>
      )}

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
      <MemberList members={members} isOrganizer={isOrganizer} onMembersUpdated={onMembersUpdated} tripStatus={trip.status} />

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
