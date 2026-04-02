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
        <h2 className="font-heading text-lg font-bold text-text">
          {currentMember.name}, you in or nah?
        </h2>
        <p className="text-text-secondary text-sm mt-0.5">
          {trip.locked_destination} &middot; {confirmedIn.length} of {members.length} committed. Your move.
        </p>
      </div>

      {error && (
        <div className="bg-status-out-bg border border-status-out/15 rounded-lg px-3 py-2">
          <p className="text-status-out text-xs">{error}</p>
        </div>
      )}

      {/* Commitment buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => handleCommit("confirmed_in")}
          disabled={saving}
          className={[
            "flex-[2] rounded-2xl py-4 text-base font-bold font-heading transition-all disabled:opacity-50 active:scale-[0.97]",
            userIn
              ? "bg-gradient-to-r from-accent to-[#3D8B6A] text-white shadow-md"
              : "bg-accent/8 text-accent border-2 border-accent/20 hover:bg-accent hover:text-white hover:border-accent hover:shadow-md",
          ].join(" ")}
        >
          <span className="flex items-center justify-center gap-2">
            {userIn && (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
            I&apos;m In
          </span>
        </button>
        <button
          onClick={() => handleCommit("confirmed_out")}
          disabled={saving}
          className={[
            "flex-1 rounded-2xl py-4 text-sm font-semibold font-heading transition-all disabled:opacity-50 active:scale-[0.97]",
            userOut
              ? "bg-status-out text-white shadow-sm"
              : "bg-surface text-text-secondary border-2 border-border hover:bg-status-out hover:text-white hover:border-status-out",
          ].join(" ")}
        >
          I&apos;m Out
        </button>
      </div>

      {/* Summary */}
      {(confirmedIn.length > 0 || confirmedOut.length > 0) && (
        <div className="bg-surface border border-border-light rounded-2xl p-4 space-y-3 shadow-xs">
          {confirmedIn.length > 0 && (
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-status-confirmed-bg flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-status-confirmed" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-text">{confirmedIn.length} going</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {confirmedIn.map((m) => (
                    <span key={m.id} className="text-xs bg-status-confirmed-bg text-status-confirmed px-2 py-0.5 rounded-full font-medium">
                      {m.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
          {confirmedOut.length > 0 && (
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-status-out-bg flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-status-out" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-text-secondary">{confirmedOut.length} out</p>
                <p className="text-xs text-text-tertiary mt-0.5">
                  {confirmedOut.map((m) => m.name).join(", ")}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <WaitingBanner members={members} tripStatus={trip.status} />
      <MemberList members={members} isOrganizer={isOrganizer} onMembersUpdated={onMembersUpdated} tripStatus={trip.status} onProxyCommit={isOrganizer ? handleProxyCommit : undefined} />

      {isOrganizer && confirmedIn.length > 0 && (
        <LockButton
          label={`Lock Trip — ${confirmedIn.length} going!`}
          confirmMessage={`Finalize with ${confirmedIn.length} people going? This will mark the trip as ready.`}
          onLock={handleLock}
        />
      )}
    </div>
  );
}
