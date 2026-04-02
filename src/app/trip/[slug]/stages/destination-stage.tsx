"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Trip, Member, DestinationOption } from "@/lib/types";
import { MemberList, WaitingBanner } from "./member-list";
import { LockButton } from "./lock-button";
import { DeadlineBanner } from "./deadline-banner";

export function DestinationStage({
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
  const [options, setOptions] = useState<DestinationOption[]>([]);
  const [newName, setNewName] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newEmoji, setNewEmoji] = useState("📍");
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState("");

  const loadOptions = useCallback(async () => {
    const { data } = await supabase
      .from("destination_options")
      .select("*")
      .eq("trip_id", trip.id)
      .order("vote_count", { ascending: false });
    if (data) setOptions(data);
  }, [supabase, trip.id]);

  useEffect(() => {
    loadOptions();

    const channel = supabase
      .channel(`destinations-${trip.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "destination_options", filter: `trip_id=eq.${trip.id}` },
        () => loadOptions()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, trip.id, loadOptions]);

  // Tie / winner detection
  const { totalVotes, topVotes, tiedOptions, hasWinner, hasTie, leader } = useMemo(() => {
    const total = options.reduce((s, o) => s + o.vote_count, 0);
    const top = options.length > 0 ? options[0].vote_count : 0;
    const tied = options.filter((o) => o.vote_count === top && top > 0);
    return {
      totalVotes: total,
      topVotes: top,
      tiedOptions: tied,
      hasWinner: tied.length === 1 && top > 0,
      hasTie: tied.length > 1,
      leader: tied.length === 1 && top > 0 ? options[0] : null,
    };
  }, [options]);

  // Who voted for each option (for avatars)
  function votersForOption(optionId: string): Member[] {
    return members.filter((m) => m.destination_vote === optionId);
  }

  async function handleAddOption(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError("");

    const { error: insertError } = await supabase.from("destination_options").insert({
      trip_id: trip.id,
      name: newName.trim(),
      note: newNote.trim() || null,
      emoji: newEmoji || "📍",
      added_by: currentMember.id,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setNewName("");
      setNewNote("");
      setNewEmoji("📍");
      setShowAdd(false);
    }
    setAdding(false);
  }

  async function handleVote(optionId: string) {
    setVoting(true);
    setError("");
    const newVote = currentMember.destination_vote === optionId ? null : optionId;

    const { error: voteError } = await supabase
      .from("members")
      .update({ destination_vote: newVote })
      .eq("id", currentMember.id);

    if (voteError) setError(voteError.message);
    setVoting(false);
  }

  // Organizer votes on behalf of a proxy member
  async function handleProxyVote(memberId: string, optionId: string) {
    setError("");
    const { error: voteError } = await supabase
      .from("members")
      .update({ destination_vote: optionId })
      .eq("id", memberId);

    if (voteError) setError(voteError.message);
    await onMembersUpdated?.();
  }

  async function handleLockOption(option: DestinationOption) {
    await supabase
      .from("trips")
      .update({
        status: "commitment",
        locked_destination: `${option.emoji} ${option.name}`,
      })
      .eq("id", trip.id);
  }

  const EMOJI_OPTIONS = ["📍", "🏖️", "🏔️", "🌿", "🏕️", "🌊", "🏯", "🌴", "🎡", "✈️"];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-lg font-semibold">
          {currentMember.name}, where to?
        </h2>
        <p className="text-text-secondary text-sm">
          Pick your top spot. Add a new one if it's missing. One vote each.
        </p>
      </div>

      <DeadlineBanner trip={trip} isOrganizer={isOrganizer} />

      {/* Destination options */}
      <div className="space-y-2">
        {options.map((opt) => {
          const isVoted = currentMember.destination_vote === opt.id;
          const voters = votersForOption(opt.id);
          const isLeading = hasWinner && leader?.id === opt.id;
          const isTied = hasTie && opt.vote_count === topVotes;

          return (
            <button
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              disabled={voting}
              className={`w-full text-left rounded-xl p-4 border transition-colors relative ${
                isVoted
                  ? "bg-primary-light border-primary/30"
                  : "bg-surface border-gray-100 hover:border-gray-200"
              }`}
            >
              {/* LEADING / TIED badge */}
              {isLeading && (
                <span className="absolute -top-2 right-3 bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  LEADING
                </span>
              )}
              {isTied && (
                <span className="absolute -top-2 right-3 bg-status-waiting text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  TIED
                </span>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{opt.emoji}</span>
                  <div>
                    <p className="text-sm font-medium">{opt.name}</p>
                    {opt.note && (
                      <p className="text-xs text-text-secondary">{opt.note}</p>
                    )}
                    {/* Voter names */}
                    {voters.length > 0 && (
                      <p className="text-[10px] text-text-secondary mt-0.5">
                        {voters.map((v) => v.name).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-semibold ${isVoted ? "text-primary" : "text-text"}`}>
                    {opt.vote_count}
                  </p>
                  <p className="text-[10px] text-text-secondary">
                    {opt.vote_count === 1 ? "vote" : "votes"}
                  </p>
                </div>
              </div>
            </button>
          );
        })}

        {options.length === 0 && (
          <div className="bg-surface border border-gray-100 rounded-xl p-6 text-center">
            <p className="text-text-secondary text-sm">No destinations yet. Add one!</p>
          </div>
        )}
      </div>

      {/* Add destination */}
      {!showAdd ? (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full border border-dashed border-gray-300 rounded-xl px-4 py-3 text-sm text-text-secondary hover:border-primary hover:text-primary transition-colors"
        >
          + Add a destination
        </button>
      ) : (
        <form
          onSubmit={handleAddOption}
          className="bg-surface border border-gray-100 rounded-xl p-4 space-y-3"
        >
          <input
            type="text"
            placeholder="Destination name (e.g. Coorg)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            autoFocus
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <input
            type="text"
            placeholder="Note (e.g. Coffee plantations, 5hr drive)"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <div>
            <p className="text-xs text-text-secondary mb-1.5">Pick an emoji</p>
            <div className="flex gap-1.5 flex-wrap">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setNewEmoji(e)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center ${
                    newEmoji === e
                      ? "bg-primary-light border border-primary/30"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              className="flex-1 bg-primary text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {adding ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-status-out text-sm">{error}</p>}

      <WaitingBanner members={members} tripStatus={trip.status} />
      <MemberList
        members={members}
        isOrganizer={isOrganizer}
        onMembersUpdated={onMembersUpdated}
        tripStatus={trip.status}
        destinationOptions={options}
        onProxyVote={isOrganizer ? handleProxyVote : undefined}
      />

      {/* Lock section — honest about ties */}
      {isOrganizer && options.length > 0 && totalVotes > 0 && (
        <>
          {hasWinner && leader && (
            <LockButton
              label={`Lock destination: ${leader.emoji} ${leader.name}`}
              confirmMessage={`Lock destination to ${leader.emoji} ${leader.name} (${leader.vote_count} votes)? This will open the commitment stage.`}
              onLock={() => handleLockOption(leader)}
            />
          )}
          {hasTie && (
            <div className="bg-status-waiting-bg border border-status-waiting/20 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-status-waiting">
                It&apos;s a tie! Pick the winner:
              </p>
              <div className="space-y-2">
                {tiedOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleLockOption(opt)}
                    className="w-full flex items-center gap-3 bg-surface border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium hover:border-primary transition-colors text-left"
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <span className="flex-1">{opt.name}</span>
                    <span className="text-text-secondary text-xs">{opt.vote_count} votes</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
