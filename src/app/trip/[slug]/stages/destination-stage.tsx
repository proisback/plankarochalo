"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Trip, Member, DestinationOption } from "@/lib/types";
import { MemberList, WaitingBanner } from "./member-list";
import { LockButton } from "./lock-button";
import { DeadlineBanner } from "./deadline-banner";
import Image from "next/image";

const POPULAR_DESTINATIONS = [
  { name: "Goa", tag: "Beach", emoji: "🏖️", image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=300&h=200&fit=crop&q=60" },
  { name: "Manali", tag: "Mountains", emoji: "🏔️", image: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=300&h=200&fit=crop&q=60" },
  { name: "Jaipur", tag: "Heritage", emoji: "🏯", image: "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=300&h=200&fit=crop&q=60" },
  { name: "Rishikesh", tag: "Adventure", emoji: "🌊", image: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=300&h=200&fit=crop&q=60" },
  { name: "Coorg", tag: "Nature", emoji: "🌿", image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=300&h=200&fit=crop&q=60" },
  { name: "Udaipur", tag: "Lakes", emoji: "🏯", image: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=300&h=200&fit=crop&q=60" },
  { name: "Kerala", tag: "Backwaters", emoji: "🌴", image: "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?w=300&h=200&fit=crop&q=60" },
  { name: "Ladakh", tag: "Adventure", emoji: "🏔️", image: "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=300&h=200&fit=crop&q=60" },
  { name: "Ooty", tag: "Hill Station", emoji: "🌿", image: "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?w=300&h=200&fit=crop&q=60" },
  { name: "Andaman", tag: "Islands", emoji: "🏖️", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&h=200&fit=crop&q=60" },
];

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

  // Shake-to-decide state
  const [shaking, setShaking] = useState(false);
  const [shakeWinner, setShakeWinner] = useState<DestinationOption | null>(null);
  const [shakeHighlight, setShakeHighlight] = useState<number>(-1);
  const shakeRef = useRef(false);

  // Shake detection via DeviceMotion
  useEffect(() => {
    let lastShake = 0;
    function handleMotion(e: DeviceMotionEvent) {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      const force = Math.sqrt((acc.x ?? 0) ** 2 + (acc.y ?? 0) ** 2 + (acc.z ?? 0) ** 2);
      if (force > 25 && Date.now() - lastShake > 2000 && !shakeRef.current) {
        lastShake = Date.now();
        triggerShake();
      }
    }
    window.addEventListener("devicemotion", handleMotion);
    return () => window.removeEventListener("devicemotion", handleMotion);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function triggerShake() {
    if (shakeRef.current || !hasTie || tiedOptions.length < 2) return;
    shakeRef.current = true;
    setShaking(true);
    setShakeWinner(null);

    // Animate cycling through options
    let count = 0;
    const total = 12 + Math.floor(Math.random() * 6); // 12-18 cycles
    const interval = setInterval(() => {
      setShakeHighlight(count % tiedOptions.length);
      count++;
      if (count >= total) {
        clearInterval(interval);
        const winner = tiedOptions[Math.floor(Math.random() * tiedOptions.length)];
        setShakeHighlight(tiedOptions.indexOf(winner));
        setShakeWinner(winner);
        setShaking(false);
        shakeRef.current = false;
      }
    }, 120);
  }

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
        <h2 className="font-heading text-lg font-bold text-text">
          {currentMember.name}, where to?
        </h2>
        <p className="text-text-secondary text-sm mt-0.5">
          {currentMember.destination_vote
            ? `You voted! ${totalVotes} ${totalVotes === 1 ? "vote" : "votes"} so far from ${members.filter(m => m.destination_vote).length} ${members.filter(m => m.destination_vote).length === 1 ? "member" : "members"}.`
            : "Pick your top spot. Add a new one if it\u2019s missing. One vote each."}
        </p>
      </div>

      <DeadlineBanner trip={trip} isOrganizer={isOrganizer} />

      {/* Destination option cards */}
      <div className="space-y-2.5">
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
              className={[
                "w-full text-left rounded-2xl p-4 border-2 transition-all duration-200 relative card-hover",
                isVoted
                  ? "bg-primary-light/60 border-primary/25 shadow-sm"
                  : "bg-surface border-transparent shadow-xs hover:shadow-sm hover:border-border",
              ].join(" ")}
            >
              {/* Badge */}
              {isLeading && (
                <span className="absolute -top-2.5 right-3 bg-gradient-to-r from-accent to-[#3D8B6A] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                  LEADING
                </span>
              )}
              {isTied && (
                <span className="absolute -top-2.5 right-3 bg-gradient-to-r from-status-waiting to-[#E8A830] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                  TIED
                </span>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={[
                    "w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0",
                    isVoted ? "bg-primary/10" : "bg-subtle",
                  ].join(" ")}>
                    {opt.emoji}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text">{opt.name}</p>
                    {opt.note && (
                      <p className="text-xs text-text-secondary mt-0.5">{opt.note}</p>
                    )}
                    {voters.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {voters.slice(0, 3).map((v) => (
                          <span
                            key={v.id}
                            className="w-5 h-5 rounded-full bg-accent/10 text-accent text-[9px] font-bold flex items-center justify-center ring-1 ring-surface"
                          >
                            {v.name.charAt(0).toUpperCase()}
                          </span>
                        ))}
                        {voters.length > 3 && (
                          <span className="text-[10px] text-text-tertiary ml-0.5">
                            +{voters.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right pl-3">
                  <p className={[
                    "text-xl font-bold tabular-nums",
                    isVoted ? "text-primary" : "text-text",
                  ].join(" ")}>
                    {opt.vote_count}
                  </p>
                  <p className="text-[10px] text-text-tertiary font-medium">
                    {opt.vote_count === 1 ? "vote" : "votes"}
                  </p>
                </div>
              </div>
            </button>
          );
        })}

        {options.length === 0 && (
          <div className="bg-surface border border-border-light rounded-2xl p-8 text-center shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-subtle flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </div>
            <p className="text-text-secondary text-sm font-medium">No destinations yet</p>
            <p className="text-text-tertiary text-xs mt-0.5">Be the first to suggest a spot!</p>
          </div>
        )}
      </div>

      {/* Add destination */}
      {!showAdd ? (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full border-2 border-dashed border-subtle-hover rounded-2xl px-4 py-3.5 text-sm text-text-secondary font-medium hover:border-primary hover:text-primary hover:bg-primary-light/30 transition-all flex items-center justify-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add a destination
        </button>
      ) : (
        <form
          onSubmit={handleAddOption}
          className="bg-surface border border-border-light rounded-2xl p-4 space-y-3 shadow-sm animate-in"
        >
          <input
            type="text"
            placeholder="Destination name (e.g. Coorg)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            autoFocus
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <input
            type="text"
            placeholder="Note (e.g. Coffee plantations, 5hr drive)"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <div>
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Pick an emoji</p>
            <div className="flex gap-1.5 flex-wrap">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setNewEmoji(e)}
                  className={[
                    "w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all",
                    newEmoji === e
                      ? "bg-primary-light border-2 border-primary/25 scale-110"
                      : "bg-subtle hover:bg-subtle-hover border-2 border-transparent",
                  ].join(" ")}
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
              className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-subtle active:scale-[0.98] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              className="flex-1 bg-primary text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {adding ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      )}

      {/* Popular picks */}
      <div>
        <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
          Popular picks <span className="font-normal normal-case">— tap to add</span>
        </p>
        <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 scroll-smooth scroll-thin" style={{ WebkitOverflowScrolling: "touch" }}>
          {POPULAR_DESTINATIONS.map((dest) => {
            const alreadyAdded = options.some(
              (o) => o.name.toLowerCase() === dest.name.toLowerCase()
            );
            return (
              <button
                key={dest.name}
                type="button"
                disabled={alreadyAdded || adding}
                onClick={async () => {
                  setAdding(true);
                  setError("");
                  const { error: insertError } = await supabase.from("destination_options").insert({
                    trip_id: trip.id,
                    name: dest.name,
                    note: dest.tag,
                    emoji: dest.emoji,
                    added_by: currentMember.id,
                  });
                  if (insertError) setError(insertError.message);
                  setAdding(false);
                }}
                className={[
                  "w-36 shrink-0 rounded-xl overflow-hidden transition-all",
                  alreadyAdded
                    ? "opacity-50"
                    : "active:scale-95 hover:shadow-sm",
                ].join(" ")}
              >
                <div className="relative w-36 h-[80px]">
                  <Image
                    src={dest.image}
                    alt={dest.name}
                    fill
                    className="object-cover"
                    sizes="144px"
                  />
                  {alreadyAdded && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">Added</span>
                    </div>
                  )}
                </div>
                <div className="bg-surface border border-border-light border-t-0 rounded-b-xl px-2 py-1.5">
                  <p className="text-xs font-semibold text-text truncate">{dest.emoji} {dest.name}</p>
                  <p className="text-[10px] text-text-tertiary">{dest.tag}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="bg-status-out-bg border border-status-out/15 rounded-lg px-3 py-2">
          <p className="text-status-out text-xs">{error}</p>
        </div>
      )}

      <WaitingBanner members={members} tripStatus={trip.status} isOrganizer={isOrganizer} tripName={trip.name} slug={trip.slug} />
      <MemberList
        members={members}
        isOrganizer={isOrganizer}
        onMembersUpdated={onMembersUpdated}
        tripStatus={trip.status}
        destinationOptions={options}
        onProxyVote={isOrganizer ? handleProxyVote : undefined}
      />

      {/* Lock section */}
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
            <div className="bg-status-waiting-bg/60 border border-status-waiting/10 rounded-2xl p-5 space-y-4">
              <div className="text-center">
                <p className="text-xs font-bold text-status-waiting uppercase tracking-wider">It&apos;s a tie!</p>
                {!shakeWinner && (
                  <p className="text-text-secondary text-sm mt-1">Shake your phone or tap below to break it</p>
                )}
              </div>

              {/* Tied options */}
              <div className="flex justify-center gap-3">
                {tiedOptions.map((opt, i) => (
                  <div
                    key={opt.id}
                    className={[
                      "flex-1 max-w-[140px] rounded-xl border-2 p-3 text-center transition-all duration-150",
                      shakeWinner?.id === opt.id
                        ? "border-accent bg-accent-light scale-105 shadow-md"
                        : shaking && shakeHighlight === i
                          ? "border-primary bg-primary-light scale-105"
                          : "border-border-light bg-surface",
                    ].join(" ")}
                  >
                    <span className="text-2xl block">{opt.emoji}</span>
                    <p className="text-sm font-bold text-text mt-1">{opt.name}</p>
                    <p className="text-[10px] text-text-tertiary">{opt.vote_count} votes</p>
                  </div>
                ))}
              </div>

              {/* Winner announcement */}
              {shakeWinner && (
                <div className="text-center animate-in">
                  <p className="text-lg font-bold text-accent">
                    {shakeWinner.emoji} {shakeWinner.name} wins!
                  </p>
                  <p className="text-xs text-text-tertiary mt-0.5">The universe has spoken. No backsies.</p>
                  {isOrganizer && (
                    <button
                      onClick={() => handleLockOption(shakeWinner)}
                      className="mt-3 bg-accent text-white rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm hover:bg-accent-hover active:scale-[0.98] transition-all"
                    >
                      Lock {shakeWinner.name} as destination
                    </button>
                  )}
                </div>
              )}

              {/* Shake / random button */}
              {!shakeWinner && (
                <div className="text-center">
                  <button
                    onClick={triggerShake}
                    disabled={shaking}
                    className={[
                      "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all active:scale-95",
                      shaking
                        ? "bg-subtle text-text-tertiary"
                        : "bg-surface border border-border text-text hover:bg-subtle shadow-xs",
                    ].join(" ")}
                  >
                    <span className="text-base">{shaking ? "🎲" : "🎲"}</span>
                    {shaking ? "Deciding..." : "Shake to decide"}
                  </button>
                  <p className="text-[10px] text-text-tertiary mt-2">
                    Anyone can shake. First shake decides.
                  </p>
                </div>
              )}

              {/* Manual pick fallback (organizer) */}
              {isOrganizer && !shakeWinner && !shaking && (
                <div className="border-t border-status-waiting/10 pt-3">
                  <p className="text-[10px] text-text-tertiary text-center mb-2">Or pick manually:</p>
                  <div className="space-y-1.5">
                    {tiedOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleLockOption(opt)}
                        className="w-full flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2 text-xs font-medium hover:border-primary active:scale-[0.98] transition-all text-left"
                      >
                        <span>{opt.emoji}</span>
                        <span className="flex-1">{opt.name}</span>
                        <span className="text-text-tertiary">{opt.vote_count} votes</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
