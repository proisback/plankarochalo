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
}: {
  trip: Trip;
  members: Member[];
  currentMember: Member;
  isOrganizer: boolean;
}) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);

  const confirmedIn = members.filter((m) => m.status === "confirmed_in");
  const confirmedOut = members.filter((m) => m.status === "confirmed_out");
  const myStatus = currentMember.status;

  async function handleCommit(status: "confirmed_in" | "confirmed_out") {
    setSaving(true);
    await supabase
      .from("members")
      .update({ status })
      .eq("id", currentMember.id);
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
      <div>
        <h2 className="font-heading text-lg font-semibold">Are you in?</h2>
        <p className="text-text-secondary text-sm">
          {trip.locked_destination} &middot;{" "}
          {trip.locked_dates_start && trip.locked_dates_end
            ? `${new Date(trip.locked_dates_start).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} — ${new Date(trip.locked_dates_end).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`
            : ""}{" "}
          &middot; {trip.trip_days} days
        </p>
      </div>

      {/* Commitment buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleCommit("confirmed_in")}
          disabled={saving}
          className={`rounded-xl p-4 text-center border-2 transition-colors ${
            myStatus === "confirmed_in"
              ? "bg-status-confirmed-bg border-status-confirmed text-status-confirmed"
              : "bg-surface border-gray-200 hover:border-status-confirmed/50"
          }`}
        >
          <span className="text-2xl block mb-1">
            {myStatus === "confirmed_in" ? "✅" : "👍"}
          </span>
          <span className="text-sm font-medium">I&apos;m in!</span>
        </button>
        <button
          onClick={() => handleCommit("confirmed_out")}
          disabled={saving}
          className={`rounded-xl p-4 text-center border-2 transition-colors ${
            myStatus === "confirmed_out"
              ? "bg-status-out-bg border-status-out text-status-out"
              : "bg-surface border-gray-200 hover:border-status-out/50"
          }`}
        >
          <span className="text-2xl block mb-1">
            {myStatus === "confirmed_out" ? "❌" : "👎"}
          </span>
          <span className="text-sm font-medium">I&apos;m out</span>
        </button>
      </div>

      {/* Summary */}
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
            <span className="text-status-out text-sm">❌</span>
            <p className="text-sm">
              <span className="font-medium">{confirmedOut.length} out:</span>{" "}
              {confirmedOut.map((m) => m.name).join(", ")}
            </p>
          </div>
        )}
      </div>

      <WaitingBanner members={members} />
      <MemberList members={members} />

      {isOrganizer && confirmedIn.length > 0 && (
        <LockButton
          label="Finalize trip"
          confirmMessage={`Finalize with ${confirmedIn.length} people going? This will mark the trip as ready.`}
          onLock={handleLock}
        />
      )}
    </div>
  );
}
