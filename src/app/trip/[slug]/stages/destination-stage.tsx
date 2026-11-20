"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { findOrganiser, stageProgress } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import type { DestinationOption, Member, Trip } from "@/lib/types";
import { advanceTrip } from "@/lib/advance";
import { UserFacingError, friendlyError } from "@/lib/errors";
import { DESTINATION_KINDS, destinationIcon, firstName, people, plural } from "@/lib/format";
import { Icon, Spinner, type IconName } from "@/components/icons";
import { Sheet } from "@/components/sheet";
import { StageStatus } from "../stage-status";
import { LockButton } from "./lock-button";
import { MemberList } from "./member-list";

/* ── Constants and small helpers ───────────────────────────────── */

/** Ten places Indian friend groups actually argue about. Type only, no photos. */
const POPULAR: { name: string; tag: string; icon: IconName }[] = [
  { name: "Goa", tag: "Beach", icon: "beach" },
  { name: "Manali", tag: "Mountains", icon: "mountain" },
  { name: "Jaipur", tag: "Heritage", icon: "heritage" },
  { name: "Rishikesh", tag: "River", icon: "water" },
  { name: "Coorg", tag: "Coffee hills", icon: "forest" },
  { name: "Udaipur", tag: "Lakes", icon: "water" },
  { name: "Alleppey", tag: "Backwaters", icon: "water" },
  { name: "Ladakh", tag: "High passes", icon: "mountain" },
  { name: "Ooty", tag: "Hill station", icon: "mountain" },
  { name: "Andaman", tag: "Islands", icon: "island" },
];

const DEFAULT_EMOJI = DESTINATION_KINDS[0].emoji;

/** The emoji the database stores for one of our kind icons. Never rendered. */
const kindEmoji = (icon: IconName) => DESTINATION_KINDS.find((k) => k.icon === icon)?.emoji ?? DEFAULT_EMOJI;

const UNDO_MS = 6000;
const ORDER_HOLD_MS = 1000;
const COIN_TICK_MS = 115;
const COIN_TICKS = 13; // about 1.5 seconds
const MAX_AVATARS = 4;
const UNIQUE_VIOLATION = "23505";

type Row = { opt: DestinationOption; votes: number; voters: Member[] };
type Added = { optionId: string; name: string; previousVote: string | null; voted: boolean };

const tidy = (s: string) => s.trim().replace(/\s+/g, " ");
const sameName = (a: string, b: string) => tidy(a).toLowerCase() === tidy(b).toLowerCase();

function listNames(names: string[]): string {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const duplicateError = () => Object.assign(new Error("duplicate key"), { code: UNIQUE_VIOLATION });

function isDuplicate(e: unknown): boolean {
  return !!e && typeof e === "object" && "code" in e && (e as { code: unknown }).code === UNIQUE_VIOLATION;
}

/* ── One row of the results table ──────────────────────────────── */

function OptionRow({
  row,
  share,
  mine,
  leading,
  tied,
  saving,
  roomForRemove,
  onVote,
  onRemove,
}: {
  row: Row;
  /** This place's part of all votes cast, 0 to 1. Null until somebody has voted. */
  share: number | null;
  mine: boolean;
  leading: boolean;
  tied: boolean;
  saving: boolean;
  /** Keep the votes column clear of the organiser's remove button. */
  roomForRemove: boolean;
  onVote: () => void;
  /** Only passed for a place nobody has voted for, and only to the organiser. */
  onRemove?: () => void;
}) {
  const { opt, votes, voters } = row;
  return (
    <li className="relative">
      <button
        type="button"
        aria-pressed={mine}
        aria-busy={saving}
        disabled={saving}
        onClick={onVote}
        className={[
          // The focus ring sits inside the row (the panel clips anything outside it).
          // Important, because the global focus rule is unlayered and would win.
          "relative flex min-h-14 w-full items-start gap-3 py-3.5 pl-3 text-left transition-colors focus-visible:-outline-offset-2! disabled:cursor-wait",
          roomForRemove ? "pr-14" : "pr-3",
          mine ? "bg-primary-light" : "bg-surface hover:bg-background",
        ].join(" ")}
      >
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-text-secondary">
          <Icon name={destinationIcon(opt.emoji)} className="h-5 w-5" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="break-words font-bold leading-snug text-text">{opt.name}</span>
            {mine && <span className="chip chip-ink">Your vote</span>}
            {leading && <span className="chip chip-go">Leading</span>}
            {tied && <span className="chip chip-wait">Tied</span>}
          </span>
          {opt.note && <span className="mt-0.5 block break-words text-sm leading-snug text-text-secondary">{opt.note}</span>}
          {voters.length > 0 && (
            <span className="mt-2 flex items-center gap-1">
              {voters.slice(0, MAX_AVATARS).map((v) => (
                <span key={v.id} className={`avatar avatar-sm ${v.is_organizer ? "avatar-lead" : ""}`} aria-hidden="true">
                  {firstName(v.name).charAt(0)}
                </span>
              ))}
              {voters.length > MAX_AVATARS && (
                <span className="ml-0.5 font-mono text-xs font-semibold text-text-tertiary" aria-hidden="true">
                  +{voters.length - MAX_AVATARS}
                </span>
              )}
              <span className="sr-only">Voted: {listNames(voters.map((v) => firstName(v.name)))}.</span>
            </span>
          )}
        </span>

        <span className="flex shrink-0 items-center gap-2">
          {saving && <Spinner className="h-4 w-4 text-text-secondary" />}
          <span
            className={`min-w-[2ch] text-right font-mono text-2xl font-semibold leading-none ${votes > 0 ? "text-text" : "text-text-tertiary"}`}
            aria-hidden="true"
          >
            {votes}
          </span>
          <span className="sr-only">{plural(votes, "vote")}</span>
        </span>

        {/* Share of all votes. Scaled, not resized, so the change animates without reflow. */}
        <span className={`absolute inset-x-0 bottom-0 h-[3px] ${share === null ? "" : "bg-subtle"}`} aria-hidden="true">
          <span
            className="block h-full origin-left bg-brand transition-transform duration-500 ease-out"
            style={{ transform: `scaleX(${share ?? 0})` }}
          />
        </span>
      </button>

      {onRemove && (
        <button type="button" onClick={onRemove} className="icon-btn absolute right-1 top-1.5" aria-label={`Remove ${opt.name}`}>
          <Icon name="trash" className="h-5 w-5" />
        </button>
      )}
    </li>
  );
}

function ListSkeleton() {
  return (
    <div className="panel overflow-hidden" aria-busy="true" aria-label="Loading places">
      <ul className="divide-y divide-border">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex items-start gap-3 px-3 py-3.5">
            <span className="skeleton h-5 w-5" />
            <span className="flex-1 space-y-2">
              <span className="skeleton block h-4 w-2/5" />
              <span className="skeleton block h-3 w-4/5" />
            </span>
            <span className="skeleton h-6 w-6" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Organiser: break a tie ────────────────────────────────────── */

function TieBreak({
  tied,
  renderLock,
}: {
  tied: Row[];
  renderLock: (row: Row, className: string) => React.ReactNode;
}) {
  const [coin, setCoin] = useState<{ at: string | null; landed: boolean }>({ at: null, landed: false });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const tiedKey = tied
    .map((r) => r.opt.id)
    .sort()
    .join("|");

  // A different set of tied places makes any earlier pick meaningless.
  useEffect(() => {
    setCoin({ at: null, landed: false });
    return () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
  }, [tiedKey]);

  function pickAtRandom() {
    if (timer.current) return;
    const ids = tied.map((r) => r.opt.id);
    const winner = ids[Math.floor(Math.random() * ids.length)];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCoin({ at: winner, landed: true });
      return;
    }
    let tick = 0;
    setCoin({ at: ids[0], landed: false });
    timer.current = setInterval(() => {
      tick += 1;
      if (tick < COIN_TICKS) {
        setCoin({ at: ids[tick % ids.length], landed: false });
        return;
      }
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      setCoin({ at: winner, landed: true });
    }, COIN_TICK_MS);
  }

  const spinning = coin.at !== null && !coin.landed;
  const pick = coin.landed ? tied.find((r) => r.opt.id === coin.at) : undefined;

  return (
    <div className="notice notice-wait">
      <div className="min-w-0 flex-1">
        <p>
          <span className="font-semibold">It&apos;s a tie between {listNames(tied.map((r) => r.opt.name))}.</span> You break
          it.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {tied.map((row) =>
            renderLock(
              row,
              // Side by side when the names are short, stacked and truncated when they are not.
              `w-auto min-w-0 max-w-full flex-auto ${coin.at === row.opt.id ? "border-border-strong bg-brand-soft" : ""}`,
            ),
          )}
        </div>
        <button type="button" onClick={pickAtRandom} disabled={spinning} className="btn btn-outline mt-2">
          <Icon name="shuffle" className="h-4 w-4" />
          Pick one at random
        </button>
        <p className="mt-2 text-[0.8125rem] leading-snug text-text-secondary" aria-live="polite">
          {pick ? (
            <>
              <span className="font-semibold text-text">The coin says {pick.opt.name}.</span> Only you can see this, and
              nothing is locked until you lock it.
            </>
          ) : (
            "The random pick is a suggestion on your screen only. Nothing is locked until you lock it."
          )}
        </p>
      </div>
    </div>
  );
}

/* ── Add a place ───────────────────────────────────────────────── */

function AddPlaceSheet({
  taken,
  onClose,
  onAdd,
}: {
  taken: DestinationOption[];
  onClose: () => void;
  /** Adds the place and casts my vote. Must throw if the place was not added. */
  onAdd: (name: string, note: string | null, emoji: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [kind, setKind] = useState(DEFAULT_EMOJI);
  const [nameError, setNameError] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const nameId = useId();
  const nameErrorId = useId();
  const noteId = useId();
  const noteHintId = useId();

  function reject(message: string) {
    setNameError(message);
    nameRef.current?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const clean = tidy(name);
    if (!clean) return reject("Type the name of the place.");
    const clash = taken.find((o) => sameName(o.name, clean));
    if (clash) return reject(`${clash.name} is already on the list.`);

    setBusy(true);
    setNameError("");
    setFormError("");
    try {
      await onAdd(clean, tidy(note) || null, kind);
    } catch (err) {
      if (isDuplicate(err)) reject(`${clean} is already on the list.`);
      else setFormError(friendlyError(err, `Couldn't add ${clean}. Check your connection and try again.`));
      setBusy(false);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Add a place"
      description="It goes on the list for everyone, and your vote moves to it."
      dismissible={!busy}
    >
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor={nameId} className="field-label">
          Place
        </label>
        <input
          id={nameId}
          ref={nameRef}
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setNameError("");
          }}
          required
          maxLength={40}
          placeholder="Hampi"
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="next"
          aria-invalid={!!nameError}
          aria-describedby={nameError ? nameErrorId : undefined}
          className="field"
          data-autofocus
        />
        {nameError && (
          <p id={nameErrorId} role="alert" className="field-error">
            {nameError}
          </p>
        )}

        <label htmlFor={noteId} className="field-label mt-4">
          Note <span className="font-normal text-text-tertiary">(optional)</span>
        </label>
        <input
          id={noteId}
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={80}
          placeholder="Overnight bus, ruins, about ₹6K each"
          autoComplete="off"
          enterKeyHint="done"
          aria-describedby={noteHintId}
          className="field"
        />
        <p id={noteHintId} className="field-hint">
          One line your friends need: travel time, vibe, cost.
        </p>

        <fieldset className="mt-4">
          <legend className="field-label">Kind of place</legend>
          <div className="flex flex-wrap gap-2">
            {DESTINATION_KINDS.map((k) => {
              const on = kind === k.emoji;
              return (
                <button
                  key={k.icon}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setKind(k.emoji)}
                  className={`btn btn-outline px-3 text-sm ${on ? "border-border-strong bg-primary-light" : ""}`}
                >
                  <Icon name={k.icon} className="h-4 w-4" />
                  {k.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {formError && (
          <p role="alert" className="notice notice-stop mt-4">
            {formError}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="btn btn-outline">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="btn btn-primary">
            {busy ? (
              <>
                <Spinner /> Adding
              </>
            ) : (
              "Add and vote"
            )}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

/* ── Organiser: remove a place nobody voted for ────────────────── */

function RemoveSheet({
  target,
  onClose,
  onRemove,
}: {
  target: DestinationOption | null;
  onClose: () => void;
  /** Must throw if the place is still on the list afterwards. */
  onRemove: (target: DestinationOption) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setError(""), [target]);

  async function handleConfirm() {
    if (!target) return;
    setBusy(true);
    setError("");
    try {
      await onRemove(target);
    } catch (e) {
      setError(friendlyError(e, `Couldn't remove ${target.name}. Check your connection and try again.`));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={!!target}
      onClose={onClose}
      title={`Remove ${target?.name ?? "this place"}?`}
      description="Nobody has voted for it. It comes off the list for everyone."
      dismissible={!busy}
    >
      {error && (
        <p role="alert" className="notice notice-stop mb-4">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onClose} disabled={busy} className="btn btn-outline" data-autofocus>
          Keep it
        </button>
        <button type="button" onClick={handleConfirm} disabled={busy} className="btn btn-danger">
          {busy ? (
            <>
              <Spinner /> Removing
            </>
          ) : (
            "Remove"
          )}
        </button>
      </div>
    </Sheet>
  );
}

/* ── The Place stage ───────────────────────────────────────────── */

export function DestinationStage({
  trip,
  members,
  currentMember,
  isOrganizer,
  onMembersUpdated,
  demo,
}: {
  trip: Trip;
  members: Member[];
  currentMember: Member;
  isOrganizer: boolean;
  onMembersUpdated: () => Promise<void>;
  demo?: boolean;
}) {
  const supabase = createClient();
  const headingId = useId();

  const [options, setOptions] = useState<DestinationOption[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState("");
  /** The vote I just tapped, shown at once while it saves. */
  const [intent, setIntent] = useState<{ vote: string | null } | null>(null);
  const [tapped, setTapped] = useState<string | null>(null);
  const [frozen, setFrozen] = useState<string[] | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [pickBusy, setPickBusy] = useState<string | null>(null);
  const [added, setAdded] = useState<Added | null>(null);
  const [undoBusy, setUndoBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [removing, setRemoving] = useState<DestinationOption | null>(null);

  const alive = useRef(true);
  const loadSeq = useRef(0);
  const intentRef = useRef<{ vote: string | null } | null>(null);
  const savingRef = useRef(false);
  const orderRef = useRef<string[]>([]);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const myVoteRef = useRef(currentMember.destination_vote);
  myVoteRef.current = currentMember.destination_vote;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if (noteTimer.current) clearTimeout(noteTimer.current);
    };
  }, []);

  /* ── Data ── */

  /** Reloads the list of places. Resolves to the fresh list, or null if it did not load. */
  const loadOptions = useCallback(async (): Promise<DestinationOption[] | null> => {
    const seq = ++loadSeq.current;
    let list: DestinationOption[] | null = null;
    try {
      const { data, error: loadError } = await supabase
        .from("destination_options")
        .select("*")
        .eq("trip_id", trip.id)
        .order("vote_count", { ascending: false });
      if (!loadError && data) list = data as DestinationOption[];
    } catch {
      // Reported below as a failed load.
    }
    // Only the newest request may paint, so a slow old reply cannot undo a newer one.
    if (alive.current && seq === loadSeq.current) {
      if (list) setOptions(list);
      setLoadFailed(!list);
    }
    return list;
  }, [supabase, trip.id]);

  // Votes change counts, so every change to the group reloads the places too.
  useEffect(() => {
    loadOptions();
  }, [loadOptions, members]);

  useEffect(() => {
    const channel = supabase
      .channel(`place-stage-${trip.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "destination_options", filter: `trip_id=eq.${trip.id}` },
        () => loadOptions(),
      )
      // Supabase cannot filter delete events by column, so a removed place would
      // never arrive through the line above. Any delete triggers a cheap reload.
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "destination_options" }, () => loadOptions())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, trip.id, loadOptions]);

  /* ── Tally: counts and voters come from the group, so they always agree ── */

  const shownVote = intent ? intent.vote : currentMember.destination_vote;

  const { rows, voted, notVoted } = useMemo(() => {
    const list = options ?? [];
    const known = new Set(list.map((o) => o.id));
    const byOption = new Map<string, Member[]>();
    const waiting: Member[] = [];
    for (const m of members) {
      const vote = m.id === currentMember.id ? shownVote : m.destination_vote;
      if (vote && known.has(vote)) byOption.set(vote, [...(byOption.get(vote) ?? []), m]);
      else waiting.push(m);
    }
    const tallied: Row[] = list
      .map((opt) => {
        const voters = byOption.get(opt.id) ?? [];
        return { opt, voters, votes: members.length > 0 ? voters.length : opt.vote_count };
      })
      .sort(
        (a, b) =>
          b.votes - a.votes || a.opt.created_at.localeCompare(b.opt.created_at) || a.opt.id.localeCompare(b.opt.id),
      );
    return { rows: tallied, voted: members.length - waiting.length, notVoted: waiting };
  }, [options, members, currentMember.id, shownVote]);

  const totalVotes = rows.reduce((sum, r) => sum + r.votes, 0);
  const top = rows[0]?.votes ?? 0;
  const leaders = top > 0 ? rows.filter((r) => r.votes === top) : [];
  const leader = leaders.length === 1 ? leaders[0] : null;
  const tied = leaders.length > 1 ? leaders : [];

  // While frozen, rows keep the position they had. New places join at the end.
  const ordered = useMemo(() => {
    if (!frozen) return rows;
    const place = (r: Row) => {
      const i = frozen.indexOf(r.opt.id);
      return i === -1 ? frozen.length : i;
    };
    return [...rows].sort((a, b) => place(a) - place(b));
  }, [rows, frozen]);
  orderRef.current = ordered.map((r) => r.opt.id);

  /** Hold the row order for a second, so a row never moves out from under a finger. */
  const holdOrder = useCallback(() => {
    setFrozen((f) => f ?? orderRef.current);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    const release = () => {
      if (savingRef.current) {
        holdTimer.current = setTimeout(release, 250);
        return;
      }
      holdTimer.current = null;
      if (alive.current) setFrozen(null);
    };
    holdTimer.current = setTimeout(release, ORDER_HOLD_MS);
  }, []);

  /* ── Voting ── */

  async function handleVote(optionId: string) {
    const current = intentRef.current ? intentRef.current.vote : myVoteRef.current;
    const next = { vote: current === optionId ? null : optionId };
    intentRef.current = next;
    setIntent(next);
    setTapped(optionId);
    setError("");
    holdOrder();
    // A save is already running. It writes this newer choice before it finishes.
    if (savingRef.current) return;

    savingRef.current = true;
    try {
      let written: { vote: string | null } | null = null;
      while (intentRef.current && intentRef.current !== written) {
        const want: { vote: string | null } = intentRef.current;
        const { error: voteError } = await supabase
          .from("members")
          .update({ destination_vote: want.vote })
          .eq("id", currentMember.id);
        if (voteError) throw voteError;
        written = want;
        if (intentRef.current !== written) continue;
        await advanceTrip(supabase, trip.id);
        await onMembersUpdated();
        await loadOptions();
      }
    } catch (e) {
      if (alive.current) setError(friendlyError(e, "Your vote didn't save. Check your connection and try again."));
      // Show what the database actually holds.
      onMembersUpdated().catch(() => {});
    } finally {
      savingRef.current = false;
      intentRef.current = null;
      if (alive.current) {
        setIntent(null);
        setTapped(null);
        holdOrder();
      }
    }
  }

  /* ── Adding ── */

  /** One status line under the Add button: the undo offer, then what the undo did. */
  function showNote(next: { added?: Added; text?: string }) {
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = null;
    if (!alive.current) return;
    setAdded(next.added ?? null);
    setFlash(next.text ?? "");
    noteTimer.current = setTimeout(() => {
      noteTimer.current = null;
      setAdded(null);
      setFlash("");
    }, UNDO_MS);
  }

  /** Puts a place on the list and moves my vote to it. Throws if the place was not added. */
  async function addAndVote(name: string, note: string | null, emoji: string): Promise<Added> {
    const fresh = await loadOptions();
    if (fresh?.some((o) => sameName(o.name, name))) throw duplicateError();

    const previousVote = myVoteRef.current;
    const { data, error: insertError } = await supabase
      .from("destination_options")
      .insert({ trip_id: trip.id, name, note, emoji, added_by: currentMember.id })
      .select()
      .single();
    if (insertError || !data) throw insertError ?? new Error("The place was not returned after adding it.");
    const created = data as DestinationOption;

    const { error: voteError } = await supabase
      .from("members")
      .update({ destination_vote: created.id })
      .eq("id", currentMember.id);
    if (!voteError) await advanceTrip(supabase, trip.id);
    await onMembersUpdated();
    await loadOptions();
    return { optionId: created.id, name: created.name, previousVote, voted: !voteError };
  }

  async function handleAddFromSheet(name: string, note: string | null, emoji: string) {
    setError("");
    const result = await addAndVote(name, note, emoji);
    if (!alive.current) return;
    setAddOpen(false);
    showNote({ added: result });
  }

  async function handlePick(pick: (typeof POPULAR)[number]) {
    if (pickBusy) return;
    setPickBusy(pick.name);
    setError("");
    try {
      const result = await addAndVote(pick.name, pick.tag, kindEmoji(pick.icon));
      showNote({ added: result });
    } catch (e) {
      if (!alive.current) return;
      setError(
        isDuplicate(e)
          ? `${pick.name} is already on the list.`
          : friendlyError(e, `Couldn't add ${pick.name}. Check your connection and try again.`),
      );
    } finally {
      if (alive.current) setPickBusy(null);
    }
  }

  const organiser = findOrganiser(trip, members);
  const organiserName = organiser ? firstName(organiser.name) : null;

  async function handleUndo() {
    const target = added;
    if (!target || undoBusy) return;
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = null;
    setUndoBusy(true);
    setError("");
    try {
      const { data: voterRows, error: votersError } = await supabase
        .from("members")
        .select("*")
        .eq("trip_id", trip.id)
        .eq("destination_vote", target.optionId);
      if (votersError) throw votersError;
      const voters = (voterRows ?? []) as Member[];
      const mine = voters.some((m) => m.id === currentMember.id);
      const others = voters.filter((m) => m.id !== currentMember.id).length;

      // My vote goes back where it was, if that place is still there.
      let backOn = "";
      if (mine) {
        const previous = (options ?? []).find((o) => o.id === target.previousVote && o.id !== target.optionId);
        const { error: voteError } = await supabase
          .from("members")
          .update({ destination_vote: previous?.id ?? null })
          .eq("id", currentMember.id);
        if (voteError) throw voteError;
        if (previous) backOn = ` Your vote is back on ${previous.name}.`;
      }
      const offIt = mine ? `Your vote is off ${target.name}` : `${target.name} is still on the list`;

      let text: string;
      if (others > 0) {
        text = `${offIt}. It stays because ${people(others)} voted for it.${backOn}`;
      } else {
        // Only the organiser may delete a place. For anyone else the database
        // quietly deletes nothing, so check what actually went.
        const { data: gone, error: deleteError } = await supabase
          .from("destination_options")
          .delete()
          .eq("id", target.optionId)
          .select();
        const removed = !deleteError && ((gone as DestinationOption[] | null)?.length ?? 0) > 0;
        if (removed) text = `Removed ${target.name}.${backOn}`;
        else if (isOrganizer) text = `${offIt}, but it couldn't be removed. Try the bin on its row.${backOn}`;
        else text = `${offIt}. It stays on the list: only ${organiserName ?? "the organiser"} can remove a place.${backOn}`;
      }

      if (backOn) await advanceTrip(supabase, trip.id);
      await onMembersUpdated();
      await loadOptions();
      showNote({ text });
    } catch (e) {
      if (alive.current) {
        setAdded(null);
        setError(friendlyError(e, `Couldn't undo ${target.name}. Check your connection and try again.`));
      }
    } finally {
      if (alive.current) setUndoBusy(false);
    }
  }

  /* ── Organiser: remove and lock ── */

  async function removePlace(target: DestinationOption) {
    setError("");
    const { data: voterRows, error: votersError } = await supabase
      .from("members")
      .select("*")
      .eq("trip_id", trip.id)
      .eq("destination_vote", target.id);
    if (votersError) throw votersError;
    if ((voterRows ?? []).length > 0) {
      await onMembersUpdated();
      await loadOptions();
      setRemoving(null);
      setError(`${target.name} just got a vote, so it stays on the list.`);
      return;
    }
    const { error: deleteError } = await supabase.from("destination_options").delete().eq("id", target.id);
    if (deleteError) throw deleteError;
    const fresh = await loadOptions();
    // A policy can refuse a delete without raising an error. Believe the list, not the reply.
    if (fresh?.some((o) => o.id === target.id)) throw new Error("row-level security: delete refused");
    setRemoving(null);
  }

  async function lockPlace(target: DestinationOption) {
    const fresh = await loadOptions();
    await onMembersUpdated();
    if (!fresh) throw new UserFacingError("The list of places could not be checked just now, so nothing was locked. Try again.");
    const current = fresh.find((o) => o.id === target.id);
    if (!current) {
      setError(`${target.name} is no longer on the list, so nothing was locked.`);
      throw new UserFacingError(`${target.name} is no longer on the list, so nothing was locked.`);
    }
    const { error: lockError } = await supabase
      .from("trips")
      .update({ status: "commitment", locked_destination: `${current.emoji || DEFAULT_EMOJI} ${current.name}` })
      .eq("id", trip.id)
      .eq("status", "destination_open");
    if (lockError) throw lockError;
    await onMembersUpdated();
  }

  function lockDetails(row: Row): string[] {
    const total = members.length;
    if (total === 0) return [];
    const lines = [`${row.votes} of ${people(total)} voted for it`];
    if (voted < total) {
      lines.push(`${voted} of ${total} have voted`);
      lines.push(`Not voted: ${notVoted.map((m) => firstName(m.name)).join(", ")}`);
    }
    return lines;
  }

  // Keyed by place: if the leader changes while the confirm sheet is open, the
  // sheet closes instead of quietly becoming a question about another place.
  const lockButton = (row: Row, variant: "primary" | "outline", className = "") => (
    <LockButton
      key={row.opt.id}
      variant={variant}
      className={className}
      label={`Lock ${row.opt.name}`}
      title={`Lock ${row.opt.name}?`}
      confirmMessage={`${row.opt.name} becomes the place and everyone is asked to commit. Nobody is notified automatically, so tell the group after.`}
      details={lockDetails(row)}
      onLock={() => lockPlace(row.opt)}
    />
  );

  /* ── Render ── */

  const myRow = rows.find((r) => r.opt.id === currentMember.destination_vote);
  const canRemove = (r: Row) => isOrganizer && r.votes === 0;
  const roomForRemove = rows.some(canRemove);
  const picks = options ? POPULAR.filter((p) => !options.some((o) => sameName(o.name, p.name))) : [];

  // While people are still voting, the list is the task and the status follows it.
  // Once everyone has voted, the status carries the next action (lock, or ping the organiser), so it leads.
  const statusFirst = stageProgress(trip, members).allJoinedAnswered;
  const status = (
    <StageStatus
      trip={trip}
      members={members}
      currentMember={currentMember}
      isOrganizer={isOrganizer}
      done={myRow ? `Your vote is on ${myRow.opt.name}.` : "Your vote is in."}
      next="Once a place is locked, everyone says if they're in."
      lock={isOrganizer && leader ? (emphasis) => lockButton(leader, emphasis) : null}
      demo={demo}
    />
  );

  return (
    <section aria-labelledby={headingId} className="space-y-4">
      <div>
        <h2 id={headingId} className="font-heading text-2xl font-extrabold leading-tight text-text">
          {firstName(currentMember.name)}, where to?
        </h2>
        <p className="mt-1 text-[0.9375rem] leading-snug text-text-secondary">
          Tap a place to vote. Tap another to change your vote. Add one if yours is missing.
        </p>
      </div>

      {statusFirst && status}

      {tied.length > 0 &&
        (isOrganizer ? (
          <TieBreak tied={tied} renderLock={(row, className) => lockButton(row, "outline", className)} />
        ) : (
          <div className="notice notice-wait">
            <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-status-waiting" />
            <p>
              <span className="font-semibold">It&apos;s a tie between {listNames(tied.map((r) => r.opt.name))}.</span>{" "}
              {organiserName ?? "The organiser"} breaks it{shownVote ? "." : ", unless your vote does first."}
            </p>
          </div>
        ))}

      <div className="space-y-3">
        {options === null ? (
          loadFailed ? (
            <div role="alert" className="notice notice-stop">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">The places didn&apos;t load.</p>
                <button type="button" onClick={() => loadOptions()} className="btn btn-outline btn-sm mt-2">
                  <Icon name="refresh" className="h-4 w-4" />
                  Try again
                </button>
              </div>
            </div>
          ) : (
            <ListSkeleton />
          )
        ) : rows.length === 0 ? (
          <p className="text-text-secondary">No places yet. Add the first one.</p>
        ) : (
          <div className="panel overflow-hidden">
            <div
              className={`flex items-center justify-between border-b border-border py-2 pl-3 ${roomForRemove ? "pr-14" : "pr-3"}`}
              aria-hidden="true"
            >
              <span className="label-mono">Place</span>
              <span className="label-mono">Votes</span>
            </div>
            <ul className="divide-y divide-border" onPointerDown={holdOrder}>
              {ordered.map((row) => (
                <OptionRow
                  key={row.opt.id}
                  row={row}
                  share={totalVotes > 0 ? row.votes / totalVotes : null}
                  mine={shownVote === row.opt.id}
                  leading={leader?.opt.id === row.opt.id}
                  tied={tied.some((t) => t.opt.id === row.opt.id)}
                  saving={tapped === row.opt.id}
                  roomForRemove={roomForRemove}
                  onVote={() => handleVote(row.opt.id)}
                  onRemove={canRemove(row) ? () => setRemoving(row.opt) : undefined}
                />
              ))}
            </ul>
          </div>
        )}

        {error && (
          <p role="alert" className="notice notice-stop">
            {error}
          </p>
        )}

        {options !== null && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className={`btn btn-block ${rows.length === 0 ? "btn-primary btn-lg" : "btn-outline"}`}
          >
            <Icon name="plus" className="h-4 w-4" />
            Add a place
          </button>
        )}

        <div aria-live="polite">
          {added ? (
            <div className="notice notice-go animate-in items-center">
              <p className="min-w-0 flex-1">
                Added <span className="font-semibold">{added.name}</span>
                {added.voted ? " and voted for it." : ", but your vote didn't save. Tap it to vote."}
              </p>
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoBusy}
                className="btn btn-outline btn-sm min-h-11 shrink-0"
              >
                {undoBusy && <Spinner />}
                Undo
              </button>
            </div>
          ) : flash ? (
            <p className="notice animate-in">{flash}</p>
          ) : null}
        </div>
      </div>

      {!statusFirst && status}

      {picks.length > 0 && (
        <div className="pt-1">
          <h3 className="label-mono rule">Popular picks</h3>
          <p className="mt-2 text-[0.8125rem] leading-snug text-text-secondary">
            Tap one to add it for the group and vote for it. You get a few seconds to undo.
          </p>
          {/* Bleeds to the screen edge on phones, so the cut-off tile says "there is more". */}
          <ul className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 py-1 lg:mx-0 lg:px-0">
            {picks.map((p) => (
              <li key={p.name} className="shrink-0">
                <button
                  type="button"
                  onClick={() => handlePick(p)}
                  disabled={!!pickBusy}
                  aria-label={`Add ${p.name} and vote for it`}
                  className="panel flex w-32 flex-col gap-3 p-3 text-left transition-colors hover:border-border-strong disabled:cursor-wait"
                >
                  <span className="flex items-center justify-between text-text-secondary">
                    <Icon name={p.icon} className="h-5 w-5" />
                    {pickBusy === p.name ? <Spinner /> : <Icon name="plus" className="h-4 w-4 text-text-tertiary" />}
                  </span>
                  <span>
                    <span className="block font-heading text-lg font-bold leading-tight text-text">{p.name}</span>
                    <span className="label-mono mt-1 block">{p.tag}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <MemberList
        trip={trip}
        members={members}
        currentMember={currentMember}
        isOrganizer={isOrganizer}
        onMembersUpdated={onMembersUpdated}
        options={options ?? []}
      />

      {addOpen && <AddPlaceSheet taken={options ?? []} onClose={() => setAddOpen(false)} onAdd={handleAddFromSheet} />}
      <RemoveSheet target={removing} onClose={() => setRemoving(null)} onRemove={removePlace} />
    </section>
  );
}
