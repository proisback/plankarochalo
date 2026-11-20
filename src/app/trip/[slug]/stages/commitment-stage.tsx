"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Member, Trip } from "@/lib/types";
import { advanceTrip } from "@/lib/advance";
import { formatRange, formatWeekday } from "@/lib/dates";
import { friendlyError } from "@/lib/errors";
import { firstName, formatBudgetRange, formatRupeesShort, parseDestination, people, plural } from "@/lib/format";
import { findBudgetOverlap } from "@/lib/overlap";
import { Icon, Spinner } from "@/components/icons";
import { Sheet } from "@/components/sheet";
import { StageStatus } from "../stage-status";
import { LockButton } from "./lock-button";
import { MemberList } from "./member-list";

const HOLD_MS = 2000;
/** The top of the budget slider. A ceiling this high means "no limit". */
const NO_LIMIT = 200_000;

/**
 * My answer takes focus when it replaces the control I used. It is a status,
 * not a control, so it gets no focus ring. (The global focus rule is
 * unlayered, which is why a utility class cannot switch it off.)
 */
const NO_OUTLINE = { outline: "none" } as const;

type Answer = "confirmed_in" | "confirmed_out";
type HoldPhase = "idle" | "holding" | "short";

/**
 * Screen readers activate a control by synthesising a tap. It arrives as a
 * press with no contact area (iOS VoiceOver) or as a pressure-less 1x1 "mouse"
 * press (Android TalkBack) and is over at once, so it could never finish a
 * two-second hold. Those presses commit on the click that follows instead.
 */
function isVirtualPress(e: PointerEvent): boolean {
  if (/Android/i.test(navigator.userAgent)) {
    return e.pointerType === "mouse" && e.width === 1 && e.height === 1 && e.pressure === 0;
  }
  return e.width === 0 && e.height === 0;
}

/* ── Hold to say "I'm in" ──────────────────────────────────────── */

/**
 * The one deliberate gesture in the product. Press and hold for two seconds
 * and a green fill sweeps across; let go early and nothing happens.
 *
 * Works with a finger, a mouse, a held Space or Enter key, and with assistive
 * tech, which activates the button without a pointer and commits directly.
 * The fill is driven by one animation frame loop writing a transform straight
 * to the element, so holding causes no React renders.
 */
function HoldButton({
  busy,
  onConfirm,
  onAnnounce,
}: {
  busy: boolean;
  onConfirm: () => void;
  onAnnounce: (message: string) => void;
}) {
  const fillRef = useRef<HTMLSpanElement>(null);
  const frame = useRef<number | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const virtualPress = useRef(false);
  const [phase, setPhase] = useState<HoldPhase>("idle");

  // Latest callbacks and flags, read from inside the frame loop.
  const live = useRef({ busy, onConfirm, onAnnounce });
  live.current = { busy, onConfirm, onAnnounce };

  const setFill = useCallback((amount: number, eased = false) => {
    const el = fillRef.current;
    if (!el) return;
    el.style.transition = eased ? "transform 180ms ease-out" : "none";
    el.style.transform = `scaleX(${amount})`;
  }, []);

  const start = useCallback(() => {
    if (live.current.busy || frame.current !== null) return;
    if (hintTimer.current) clearTimeout(hintTimer.current);
    const startedAt = performance.now();
    setPhase("holding");
    live.current.onAnnounce("Keep holding");

    const tick = () => {
      const progress = Math.min(Math.max((performance.now() - startedAt) / HOLD_MS, 0), 1);
      setFill(progress);
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
        return;
      }
      frame.current = null;
      setPhase("idle");
      live.current.onConfirm();
    };
    frame.current = requestAnimationFrame(tick);
  }, [setFill]);

  const cancel = useCallback(() => {
    if (frame.current === null) return;
    cancelAnimationFrame(frame.current);
    frame.current = null;
    setFill(0, true);
    setPhase("short");
    live.current.onAnnounce("Hold a little longer");
    hintTimer.current = setTimeout(() => setPhase("idle"), 1800);
  }, [setFill]);

  // A failed save hands the button back empty.
  useEffect(() => {
    if (!busy && frame.current === null) setFill(0, true);
  }, [busy, setFill]);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      if (hintTimer.current) clearTimeout(hintTimer.current);
    },
    [],
  );

  const isHoldKey = (key: string) => key === " " || key === "Enter";

  const title = busy
    ? "Saving"
    : phase === "holding"
      ? "Keep holding"
      : phase === "short"
        ? "Hold a little longer"
        : "Hold to say I'm in";
  const caption = busy ? "One moment" : phase === "holding" ? "Let go to cancel" : "Press and hold for 2 seconds";

  return (
    <button
      type="button"
      aria-label="I'm in. Press and hold for two seconds, or activate to confirm."
      aria-busy={busy}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        virtualPress.current = isVirtualPress(e.nativeEvent);
        if (!virtualPress.current) start();
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onBlur={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (!isHoldKey(e.key)) return;
        e.preventDefault();
        if (!e.repeat) start();
      }}
      onKeyUp={(e) => {
        if (!isHoldKey(e.key)) return;
        e.preventDefault();
        cancel();
      }}
      onClick={(e) => {
        // A click with no pointer behind it: a screen reader, switch or voice
        // control. Holding is not available to them, so one activation commits.
        const virtual = e.detail === 0 || virtualPress.current;
        virtualPress.current = false;
        if (!virtual || busy || frame.current !== null) return;
        setFill(1, true);
        onConfirm();
      }}
      className="relative flex min-h-[72px] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl bg-primary px-4 py-3 text-center text-on-primary"
      style={{ touchAction: "none", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
    >
      <span
        ref={fillRef}
        aria-hidden="true"
        className="absolute inset-0 origin-left bg-accent"
        style={{ transform: "scaleX(0)" }}
      />
      <span className="relative flex items-center gap-2 font-heading text-[1.375rem] font-bold leading-tight">
        {busy && <Spinner className="h-5 w-5" />}
        {title}
      </span>
      <span className="relative mt-1 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.09em] opacity-75">
        {caption}
      </span>
    </button>
  );
}

/* ── The plan in one glance ────────────────────────────────────── */

function PlanSummary({ trip, members }: { trip: Trip; members: Member[] }) {
  const destination = parseDestination(trip.locked_destination);
  const range = formatRange(trip.locked_dates_start, trip.locked_dates_end);
  const weekdays =
    trip.locked_dates_start && trip.locked_dates_end && trip.locked_dates_start !== trip.locked_dates_end
      ? `${formatWeekday(trip.locked_dates_start)} to ${formatWeekday(trip.locked_dates_end)}`
      : formatWeekday(trip.locked_dates_start);

  const budget = findBudgetOverlap(members);
  const budgetLine = !budget
    ? null
    : budget.max >= NO_LIMIT
      ? "no budget limit so far"
      : budget.min > 0
        ? `${formatBudgetRange(budget.min, budget.max)} per person`
        : `up to ${formatRupeesShort(budget.max)} per person`;

  // Display size eases down on very narrow phones, and long place names take
  // the smaller size outright, so a word is not broken in the middle.
  const fluid = "text-[length:clamp(1.375rem,7.5vw,1.75rem)]";
  const placeSize = destination.name.length > 11 ? "text-[1.375rem]" : fluid;

  return (
    <div className="border-t-2 border-border-strong border-b border-b-border pb-3 pt-3">
      <dl className="grid grid-cols-2 gap-x-4">
        <div className="min-w-0">
          <dt className="ticket-key">Destination</dt>
          <dd className="mt-1 flex items-center gap-1.5">
            <Icon name={destination.icon} className="h-5 w-5 shrink-0 text-text-secondary" />
            <span className={`display min-w-0 break-words text-text ${placeSize}`}>{destination.name || "Not set"}</span>
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="ticket-key">Dates</dt>
          <dd className="mt-1">
            <span className={`display block text-text ${fluid}`}>{range || "Not set"}</span>
            {weekdays && <span className="mt-1 block font-mono text-[0.6875rem] text-text-tertiary">{weekdays}</span>}
          </dd>
        </div>
      </dl>
      <p className="mt-3 border-t border-dashed border-border pt-2.5 font-mono text-xs text-text-secondary">
        {plural(trip.trip_days, "day")}
        {budgetLine ? ` · ${budgetLine}` : ""}
      </p>
    </div>
  );
}

/* ── Who's in ──────────────────────────────────────────────────── */

function RollCall({ members, currentMember }: { members: Member[]; currentMember: Member }) {
  const headingId = useId();
  const rank = (m: Member) => (m.status === "confirmed_in" ? 0 : m.status === "confirmed_out" ? 2 : 1);
  // Array.sort is stable, so people keep their joining order inside each group.
  const sorted = [...members].sort((a, b) => rank(a) - rank(b));
  const inCount = members.filter((m) => rank(m) === 0).length;
  const outCount = members.filter((m) => rank(m) === 2).length;
  const waitingCount = members.length - inCount - outCount;
  const tally = [`${inCount} in`, outCount > 0 ? `${outCount} out` : "", waitingCount > 0 ? `${waitingCount} waiting` : ""]
    .filter(Boolean)
    .join(" · ");

  return (
    <section aria-labelledby={headingId}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 id={headingId} className="label-mono">
          Who&apos;s in
        </h3>
        <p className="font-mono text-xs font-medium text-text">{tally}</p>
      </div>
      <ul className="mt-1.5 grid gap-x-8 sm:grid-cols-2">
        {sorted.map((m) => {
          const r = rank(m);
          return (
            <li key={m.id} className="flex items-center justify-between gap-3 border-b border-dashed border-border py-2">
              <span
                className={[
                  "min-w-0 break-words text-[0.9375rem] font-medium leading-snug",
                  r === 2 ? "text-text-tertiary line-through" : "text-text",
                ].join(" ")}
              >
                {m.name}
                {m.id === currentMember.id && <span className="font-normal text-text-tertiary"> (you)</span>}
              </span>
              <span className={`chip shrink-0 ${r === 0 ? "chip-go" : r === 2 ? "chip-out" : "chip-wait"}`}>
                {r === 0 ? "In" : r === 2 ? "Out" : "Waiting"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ── Commit stage ──────────────────────────────────────────────── */

export function CommitmentStage({
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [outOpen, setOutOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  // What I just answered, shown until the refetched member row catches up.
  const [justAnswered, setJustAnswered] = useState<Answer | null>(null);
  // Only a stamp that lands in front of you is animated, not one from a reload.
  const [stampFresh, setStampFresh] = useState(false);
  const [focusResult, setFocusResult] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => setJustAnswered(null), [currentMember.status]);

  // The control I used is replaced by my answer. Keep keyboard and screen
  // reader focus on what replaced it instead of dropping it to the page.
  useEffect(() => {
    if (focusResult > 0) resultRef.current?.focus();
  }, [focusResult]);

  const first = firstName(currentMember.name);
  const myStatus = justAnswered ?? currentMember.status;
  const iAmIn = myStatus === "confirmed_in";
  const iAmOut = myStatus === "confirmed_out";

  const going = members.filter((m) => m.status === "confirmed_in");
  const out = members.filter((m) => m.status === "confirmed_out");
  const undecided = members.filter((m) => m.status !== "confirmed_in" && m.status !== "confirmed_out");
  const nobodyIn = members.length > 0 && undecided.length === 0 && going.length === 0;

  async function answer(status: Answer): Promise<boolean> {
    if (saving) return false;
    setSaving(true);
    setError("");
    try {
      const { error: writeError } = await supabase.from("members").update({ status }).eq("id", currentMember.id);
      if (writeError) throw writeError;
      await advanceTrip(supabase, trip.id);
      await onMembersUpdated();
      setJustAnswered(status);
      setStampFresh(status === "confirmed_in");
      setAnnouncement(status === "confirmed_in" ? `You're in, ${first}.` : "You're out for this one.");
      setFocusResult((n) => n + 1);
      return true;
    } catch (e) {
      setError(friendlyError(e, "That didn't save. Check your connection and try again."));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function confirmOut() {
    if (await answer("confirmed_out")) setOutOpen(false);
  }

  async function handleLock() {
    const { error: lockError } = await supabase
      .from("trips")
      .update({ status: "ready" })
      .eq("id", trip.id)
      .eq("status", "commitment");
    if (lockError) throw lockError;
    await onMembersUpdated();
  }

  const lockDetails = [
    out.length > 0 ? `Out: ${out.map((m) => m.name).join(", ")}` : "",
    undecided.length > 0 ? `Not answered: ${undecided.map((m) => m.name).join(", ")}` : "",
  ].filter(Boolean);

  const lock =
    isOrganizer && going.length > 0
      ? (emphasis: "primary" | "outline") => (
          <LockButton
            variant={emphasis}
            label={`Lock the trip with ${going.length} in`}
            title="Lock the trip?"
            confirmMessage={`The trip is confirmed with ${people(going.length)} and everyone gets the ticket. Nobody is notified automatically, so tell the group after.`}
            details={lockDetails}
            onLock={handleLock}
          />
        )
      : null;

  const inlineError = error && !outOpen && (
    <p role="alert" className="notice notice-stop">
      {error}
    </p>
  );

  return (
    <div className="space-y-5">
      <h2 className="font-heading text-[1.75rem] font-extrabold leading-[1.05] text-text">{first}, are you in?</h2>

      <PlanSummary trip={trip} members={members} />

      {/* The answer comes first: the hold, or what you said. The group's status follows it. */}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {iAmIn ? (
        <div ref={resultRef} tabIndex={-1} className="space-y-3" style={NO_OUTLINE}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <span
              className={`stamp shrink-0 px-4 py-2 text-[2rem] ${stampFresh ? "animate-stamp" : ""}`}
              aria-hidden="true"
            >
              In
            </span>
            <p className="min-w-0 flex-1 font-heading text-[1.375rem] font-bold leading-tight text-text">
              You&apos;re in, {first}.
            </p>
            <button type="button" onClick={() => setOutOpen(true)} disabled={saving} className="btn btn-quiet btn-sm">
              Change to out
            </button>
          </div>
          {inlineError}
        </div>
      ) : iAmOut ? (
        <div ref={resultRef} tabIndex={-1} className="space-y-3" style={NO_OUTLINE}>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <p className="font-heading text-[1.375rem] font-bold leading-tight text-text">You&apos;re out for this one.</p>
            <button
              type="button"
              onClick={() => answer("confirmed_in")}
              disabled={saving}
              className="btn btn-outline btn-sm"
            >
              {saving && <Spinner />}
              Actually, I&apos;m in
            </button>
          </div>
          {inlineError}
        </div>
      ) : (
        <div className="space-y-2">
          {inlineError}
          <HoldButton busy={saving && !outOpen} onConfirm={() => answer("confirmed_in")} onAnnounce={setAnnouncement} />
          <button type="button" onClick={() => setOutOpen(true)} disabled={saving} className="btn btn-outline btn-block">
            I can&apos;t make it
          </button>
        </div>
      )}

      {nobodyIn ? (
        <div className="notice notice-stop">
          <Icon name="ban" className="mt-0.5 h-4 w-4 shrink-0 text-status-out" />
          <div>
            <p className="font-semibold">Nobody can make these dates.</p>
            <p className="mt-0.5 text-text-secondary">
              {isOrganizer ? (
                <>
                  Use Organiser tools<span className="lg:hidden"> below</span> to reopen the vote, and from there the
                  dates, one step at a time.
                </>
              ) : (
                <>This one isn&apos;t happening on these dates.</>
              )}
            </p>
          </div>
        </div>
      ) : (
        <StageStatus
          trip={trip}
          members={members}
          currentMember={currentMember}
          isOrganizer={isOrganizer}
          // The answer is shown right above, at full size. No need to repeat it here.
          done=""
          next="Once the trip is locked, everyone gets the ticket."
          lock={lock}
          demo={demo}
        />
      )}

      <RollCall members={members} currentMember={currentMember} />

      {/* The roll call above already lists everyone. The full list is the organiser's tool for answering for people. */}
      {isOrganizer && (
        <MemberList
          trip={trip}
          members={members}
          currentMember={currentMember}
          isOrganizer={isOrganizer}
          onMembersUpdated={onMembersUpdated}
        />
      )}

      <Sheet
        open={outOpen}
        onClose={() => setOutOpen(false)}
        title="Mark yourself out?"
        description="You can change your mind until the trip is locked."
        dismissible={!saving}
      >
        {error && (
          <p role="alert" className="notice notice-stop mb-4">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setOutOpen(false)} disabled={saving} className="btn btn-outline">
            Not yet
          </button>
          <button type="button" onClick={confirmOut} disabled={saving} className="btn btn-primary" data-autofocus>
            {saving ? (
              <>
                <Spinner /> Saving
              </>
            ) : (
              "Yes, I'm out"
            )}
          </button>
        </div>
      </Sheet>
    </div>
  );
}
