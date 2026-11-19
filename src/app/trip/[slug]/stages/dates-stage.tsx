"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Member, Trip } from "@/lib/types";
import { stageProgress } from "@/lib/types";
import { advanceTrip } from "@/lib/advance";
import { eachDay, formatDayLong, formatRange, memberDays } from "@/lib/dates";
import { UserFacingError, friendlyError } from "@/lib/errors";
import { firstName, formatBudgetRange, formatRupeesShort, plural } from "@/lib/format";
import { budgetAnswers, findBestOverlap, findBudgetOverlap } from "@/lib/overlap";
import { Icon, Spinner } from "@/components/icons";
import { Sheet } from "@/components/sheet";
import { StageStatus } from "../stage-status";
import Calendar from "./calendar";
import { DeadlineBanner } from "./deadline-banner";
import { LockButton } from "./lock-button";
import { MemberList } from "./member-list";

const NO_LIMIT = 200_000;
const BUDGETS: { value: number; label: string }[] = [
  ...[5_000, 10_000, 20_000, 40_000].map((value) => ({ value, label: formatRupeesShort(value) })),
  { value: NO_LIMIT, label: "No limit" },
];
const TRIP_LENGTHS = Array.from({ length: 14 }, (_, i) => i + 1);

/* ── Save bar ──────────────────────────────────────────────────── */

/**
 * The bar pinned to the bottom of the screen while there is something to save.
 * Full width on a phone; from `sm` up it lines up with the content column,
 * which is measured because a fixed element cannot inherit its parent's width.
 * While it is up, the page gets the same amount of extra room at the end so
 * the bar never sits on top of the last thing in it.
 *
 * Rendered in place, not in a portal, so it comes right after the calendar in
 * tab order. That only works while no ancestor is transformed or animated: a
 * transformed ancestor would become what "fixed" is measured from.
 */
function SaveBar({
  column,
  children,
}: {
  column: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const col = column.current;
    const bar = barRef.current;
    if (!col || !bar) return;
    const roomBefore = document.body.style.paddingBottom;
    const measure = () => {
      const box = col.getBoundingClientRect();
      setRect((prev) =>
        prev && prev.left === box.left && prev.width === box.width ? prev : { left: box.left, width: box.width },
      );
      document.body.style.paddingBottom = `${bar.offsetHeight}px`;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(col);
    observer.observe(bar);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      document.body.style.paddingBottom = roomBefore;
    };
  }, [column]);

  return (
    <div
      ref={barRef}
      role="region"
      aria-label="Save your dates"
      style={rect ? ({ "--col-left": `${rect.left}px`, "--col-width": `${rect.width}px` } as React.CSSProperties) : undefined}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:left-[var(--col-left)] sm:right-auto sm:w-[var(--col-width)] sm:px-0"
    >
      {children}
    </div>
  );
}

/* ── Budget ────────────────────────────────────────────────────── */

/**
 * Optional, and only after dates are in. One tap sets the most this person
 * would spend; tapping it again takes the answer back. Nobody else ever sees
 * an individual answer, only what works for everyone who shared one.
 */
function Budget({
  members,
  currentMember,
  onMembersUpdated,
}: {
  members: Member[];
  currentMember: Member;
  onMembersUpdated: () => Promise<void>;
}) {
  const supabase = createClient();
  const headingId = useId();
  // What I just tapped, shown at once while the write is on its way.
  const [pending, setPending] = useState<{ max: number | null } | null>(null);
  const [error, setError] = useState("");
  const queue = useRef<Promise<void>>(Promise.resolve());
  const latest = useRef(0);

  const mine = pending ? pending.max : currentMember.budget_max;
  const mineMin = pending ? 0 : (currentMember.budget_min ?? 0);
  // An answer from before the one-tap choices (a typed range, or the old
  // default). It still counts, so say so and let them replace or remove it.
  const earlier =
    mine != null && !BUDGETS.some((b) => b.value === mine)
      ? mineMin > 0
        ? formatBudgetRange(mineMin, mine)
        : `up to ${formatRupeesShort(mine)}`
      : null;

  const withMine = useMemo(
    () =>
      pending
        ? members.map((m) =>
            m.id === currentMember.id ? { ...m, budget_min: pending.max == null ? null : 0, budget_max: pending.max } : m,
          )
        : members,
    [members, currentMember.id, pending],
  );
  const shared = budgetAnswers(withMine);
  const group = findBudgetOverlap(withMine);

  function setBudget(max: number | null) {
    const turn = ++latest.current;
    setPending({ max });
    setError("");
    // One write at a time, in the order tapped. A tap that was replaced before
    // its turn came is skipped; the last one always goes through.
    queue.current = queue.current.then(async () => {
      if (turn !== latest.current) return;
      try {
        const { error: writeError } = await supabase
          .from("members")
          .update({ budget_min: max == null ? null : 0, budget_max: max })
          .eq("id", currentMember.id);
        if (writeError) throw writeError;
        await onMembersUpdated();
        if (turn === latest.current) setPending(null);
      } catch (e) {
        if (turn !== latest.current) return;
        setPending(null);
        setError(friendlyError(e, "Your budget didn't save. Check your connection and try again."));
      }
    });
  }

  return (
    <section aria-labelledby={headingId} className="border-t border-border pt-4">
      <p className="label-mono">Optional</p>
      <h3 id={headingId} className="mt-1.5 text-[0.9375rem] font-semibold leading-snug text-text">
        What&apos;s the most you&apos;d spend, per person, for the whole trip?
      </h3>

      <div role="group" aria-labelledby={headingId} className="mt-3 flex flex-wrap gap-2">
        {BUDGETS.map((b) => (
          <button
            key={b.value}
            type="button"
            aria-pressed={mine === b.value}
            onClick={() => setBudget(mine === b.value ? null : b.value)}
            className="btn btn-outline btn-sm min-h-11 min-w-14 font-mono aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-on-primary"
          >
            {b.label}
          </button>
        ))}
      </div>

      {earlier && (
        <p className="mt-2.5 text-[0.8125rem] text-text-secondary">
          Saved for you earlier: <span className="font-mono font-medium text-text">{earlier}</span>. Pick one above to
          replace it, or{" "}
          <button type="button" onClick={() => setBudget(null)} className="link">
            remove it
          </button>
          .
        </p>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <p className="mt-2.5 text-[0.8125rem] text-text-tertiary">Only the group&apos;s limit is shown, never yours.</p>

      {shared >= 2 &&
        (group ? (
          <div className="mt-4 border-l-2 border-border-strong pl-3" aria-live="polite">
            <p className="text-[0.9375rem] font-semibold text-text">
              {group.max >= NO_LIMIT
                ? "No limit so far"
                : `Works for everyone: ${
                    group.min > 0 ? formatBudgetRange(group.min, group.max) : `up to ${formatRupeesShort(group.max)}`
                  } per person`}
            </p>
            <p className="mt-1 font-mono text-xs text-text-tertiary">
              {group.count} of {members.length} shared a budget
            </p>
          </div>
        ) : (
          <div className="notice notice-wait mt-4" aria-live="polite">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-status-waiting" />
            <div>
              <p className="font-semibold">Budgets don&apos;t meet yet.</p>
              <p className="mt-0.5 font-mono text-xs text-text-secondary">
                {shared} of {members.length} shared a budget
              </p>
            </div>
          </div>
        ))}
    </section>
  );
}

/* ── Dates stage ───────────────────────────────────────────────── */

export function DatesStage({
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
  /** Refetches trip + members. */
  onMembersUpdated: () => Promise<void>;
  demo?: boolean;
}) {
  const supabase = createClient();
  const columnRef = useRef<HTMLDivElement>(null);
  const lengthId = useId();
  const length = trip.trip_days;
  const allDays = length === 1 ? "that day" : `all ${length} days`;

  /* My days: what is saved, and what is tapped but not saved yet. */
  const savedDays = useMemo(() => memberDays(currentMember), [currentMember]);
  const savedKey = savedDays.join(",");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(savedDays));
  const selectedKey = useMemo(() => Array.from(selected).sort().join(","), [selected]);
  const hasSaved = savedDays.length > 0;
  const dirty = selectedKey !== savedKey;

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [justSaved, setJustSaved] = useState<number | null>(null);

  // If my saved dates change underneath me (another device, or the organiser
  // answering for me) follow them, unless I have edits of my own in progress.
  const followed = useRef(savedKey);
  useEffect(() => {
    if (followed.current === savedKey) return;
    const untouched = selectedKey === followed.current;
    followed.current = savedKey;
    if (untouched) setSelected(new Set(savedDays));
  }, [savedKey, savedDays, selectedKey]);

  useEffect(() => {
    if (justSaved == null) return;
    const timer = setTimeout(() => setJustSaved(null), 2600);
    return () => clearTimeout(timer);
  }, [justSaved]);

  const toggleDay = useCallback((day: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(day)) next.add(day);
      return next;
    });
  }, []);
  const addRange = useCallback((start: string, end: string) => {
    setSelected((prev) => new Set([...prev, ...eachDay(start, end)]));
  }, []);
  const clearDays = useCallback(() => setSelected(new Set()), []);
  const undo = () => {
    setSelected(new Set(savedDays));
    setSaveError("");
  };

  /* The group */
  const { best, fallback, answered } = useMemo(() => findBestOverlap(members, length), [members, length]);
  // Everyone but me. My own days come from the live selection, so the counts
  // in the calendar do not change meaning the moment I save.
  const othersFree = useMemo(
    () => findBestOverlap(members.filter((m) => m.id !== currentMember.id), length).dateMap,
    [members, currentMember.id, length],
  );
  const progress = stageProgress(trip, members);
  const organiser = members.find((m) => m.is_organizer);
  const cannot = best ? best.missingNames.map(firstName).join(", ") : "";
  const notAnswered = progress.waiting.map((m) => firstName(m.name)).join(", ");
  const bestRange = best ? formatRange(best.start, best.end) : "";

  async function saveDates() {
    const days = Array.from(selected).sort();
    if (days.length === 0 || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const { error } = await supabase
        .from("members")
        .update({
          availability_start: days[0],
          availability_end: days[days.length - 1],
          constraint_note: JSON.stringify(days),
          constraint_start: null,
          constraint_end: null,
          status: "responded",
        })
        .eq("id", currentMember.id);
      if (error) throw error;
      setJustSaved(days.length);
      // The database decides whether that was the last answer the trip needed.
      await advanceTrip(supabase, trip.id);
      await onMembersUpdated();
    } catch (e) {
      setSaveError(friendlyError(e, "Your dates didn't save. Check your connection and try again."));
    } finally {
      setSaving(false);
    }
  }

  async function lockDates() {
    const { data, error } = await supabase.from("members").select("*").eq("trip_id", trip.id);
    if (error) throw error;
    const fresh = findBestOverlap((data ?? []) as Member[], length).best;
    if (!fresh) {
      await onMembersUpdated();
      throw new UserFacingError("Someone just changed their dates and no window works for two people any more. Nothing was locked.");
    }
    const { error: lockError } = await supabase
      .from("trips")
      .update({ status: "destination_open", locked_dates_start: fresh.start, locked_dates_end: fresh.end })
      .eq("id", trip.id)
      .eq("status", "dates_open");
    if (lockError) throw lockError;
    await onMembersUpdated();
  }

  /* Trip length. Every change goes through the same confirm sheet. */
  const [newLength, setNewLength] = useState<number | null>(null);
  const [lengthBusy, setLengthBusy] = useState(false);
  const [lengthError, setLengthError] = useState("");

  function askLength(days: number) {
    if (!Number.isInteger(days) || days < 1 || days > 14 || days === length) return;
    setLengthError("");
    setNewLength(days);
  }

  async function changeLength() {
    if (newLength == null) return;
    setLengthBusy(true);
    setLengthError("");
    try {
      const { error } = await supabase.from("trips").update({ trip_days: newLength }).eq("id", trip.id);
      if (error) throw error;
      await onMembersUpdated();
      setNewLength(null);
    } catch (e) {
      setLengthError(friendlyError(e, "The trip length didn't change. Check your connection and try again."));
    } finally {
      setLengthBusy(false);
    }
  }

  const lockDetails = best
    ? [
        `${best.fullCount} of ${answered} can do ${allDays}`,
        ...(cannot ? [`Can't: ${cannot}`] : []),
        ...(notAnswered ? [`Not answered: ${notAnswered}`] : []),
      ]
    : [];

  return (
    <div ref={columnRef} className="flex flex-col gap-5">
      <div>
        <h2 className="font-heading text-2xl font-extrabold leading-tight text-text">
          {firstName(currentMember.name)}, when are you free?
        </h2>
        <p className="mt-1 text-[0.9375rem] leading-snug text-text-secondary">
          Tap every day you could travel. We need {length === 1 ? "1 day" : `${length} days in a row`}.
        </p>
      </div>

      <DeadlineBanner
        trip={trip}
        isOrganizer={isOrganizer}
        organiserName={organiser ? firstName(organiser.name) : undefined}
      />

      <StageStatus
        trip={trip}
        members={members}
        currentMember={currentMember}
        isOrganizer={isOrganizer}
        done={`Your ${plural(savedDays.length, "date")} ${savedDays.length === 1 ? "is" : "are"} in.`}
        next="Once dates are locked, the group votes on a place."
        lock={
          best
            ? (emphasis) => (
                <LockButton
                  variant={emphasis}
                  label={`Lock ${bestRange}`}
                  title="Lock these dates?"
                  confirmMessage={`Dates become ${bestRange} for everyone and voting on the place opens. Nobody is notified automatically, so tell the group after.`}
                  details={lockDetails}
                  onLock={lockDates}
                />
              )
            : null
        }
        demo={demo}
      />

      {/* The chart: the calendar, and what the group's answers add up to. */}
      <section aria-label="Your dates" className="panel">
        <div className="p-2 pb-3 sm:p-4">
          <Calendar
            selectedDates={selected}
            onToggleDate={toggleDay}
            onRangeSelect={addRange}
            onClear={clearDays}
            dateMap={othersFree}
            windowStart={trip.date_window_start ?? undefined}
            windowEnd={trip.date_window_end ?? undefined}
            best={best}
            groupSize={members.length}
          />
        </div>

        <div className="border-t border-border px-3 py-4 sm:px-5">
          {best ? (
            <>
              <p className="label-mono">Best {plural(length, "day")} so far</p>
              <p className="display mt-1.5 text-[2.5rem] text-text">{bestRange}</p>
              <p className="mt-1.5 font-mono text-xs text-text-tertiary">
                {best.start === best.end
                  ? formatDayLong(best.start)
                  : `${formatDayLong(best.start)} to ${formatDayLong(best.end)}`}
              </p>
              <p className="mt-3 text-[0.9375rem] font-semibold text-text">
                {best.fullCount} of {answered} can do {allDays}
              </p>
              {cannot && <p className="mt-0.5 text-sm text-text-secondary">Can&apos;t: {cannot}</p>}
              {isOrganizer && notAnswered && (
                <p className="mt-0.5 text-sm text-text-secondary">Not answered yet: {notAnswered}</p>
              )}
            </>
          ) : answered >= 2 ? (
            <div className="notice notice-wait">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-status-waiting" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  No {length === 1 ? "single day" : `${length}-day stretch`} works for two or more people yet.
                </p>
                {fallback && (
                  <p className="mt-0.5 text-text-secondary">
                    The longest stretch two of you share is {plural(fallback.days, "day")}:{" "}
                    {formatRange(fallback.start, fallback.end)}.
                  </p>
                )}
                {isOrganizer && fallback ? (
                  <button type="button" onClick={() => askLength(fallback.days)} className="btn btn-outline btn-sm mt-3">
                    Make it a {fallback.days}-day trip
                  </button>
                ) : (
                  <p className="mt-0.5 text-text-secondary">Add more days if you can.</p>
                )}
              </div>
            </div>
          ) : (
            <>
              <p className="label-mono">Best {plural(length, "day")}</p>
              <p className="mt-1.5 text-sm text-text-secondary">
                Shows up here once two people have added their dates.
              </p>
            </>
          )}

          {isOrganizer && (
            <details className="group -mb-2 mt-3 border-t border-border-light pt-1">
              <summary className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-text-secondary hover:text-text">
                Change trip length
                <Icon name="chevron-down" className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="max-w-60 pb-3">
                <label htmlFor={lengthId} className="field-label">
                  Trip length
                </label>
                <select
                  id={lengthId}
                  value={newLength ?? length}
                  onChange={(e) => askLength(Number(e.target.value))}
                  className="field"
                >
                  {TRIP_LENGTHS.map((d) => (
                    <option key={d} value={d}>
                      {plural(d, "day")}
                    </option>
                  ))}
                </select>
                <p className="field-hint">You&apos;ll be asked to confirm before it changes.</p>
              </div>
            </details>
          )}
        </div>
      </section>

      {/* Saving is explicit: nothing is stored until this is tapped. */}
      {dirty && selected.size > 0 ? (
        <SaveBar column={columnRef}>
          {saveError && (
            <p role="alert" className="notice notice-stop mb-2.5">
              {saveError}
            </p>
          )}
          <div className="flex gap-2">
            {hasSaved && (
              <button type="button" onClick={undo} disabled={saving} className="btn btn-outline btn-lg">
                Undo
              </button>
            )}
            <button type="button" onClick={saveDates} disabled={saving} className="btn btn-primary btn-lg min-w-0 flex-1">
              {saving ? (
                <>
                  <Spinner /> Saving
                </>
              ) : (
                <>
                  <Icon name="check" className="h-4 w-4" />
                  {hasSaved ? "Update my dates" : `Save ${plural(selected.size, "date")}`}
                </>
              )}
            </button>
          </div>
        </SaveBar>
      ) : justSaved != null && !dirty ? (
        <SaveBar column={columnRef}>
          <p role="status" className="flex min-h-[52px] items-center justify-center gap-2 text-[0.9375rem] font-semibold text-status-confirmed">
            <Icon name="check-circle" className="h-5 w-5" />
            Saved. Your {plural(justSaved, "date")} {justSaved === 1 ? "is" : "are"} in.
          </p>
        </SaveBar>
      ) : null}

      {dirty && selected.size === 0 && hasSaved && (
        <p className="text-sm text-text-secondary">
          Your {plural(savedDays.length, "saved date")} still {savedDays.length === 1 ? "counts" : "count"} until you
          save new ones.{" "}
          <button type="button" onClick={undo} className="link">
            Put them back
          </button>
        </p>
      )}

      {hasSaved && <Budget members={members} currentMember={currentMember} onMembersUpdated={onMembersUpdated} />}

      <MemberList
        trip={trip}
        members={members}
        currentMember={currentMember}
        isOrganizer={isOrganizer}
        onMembersUpdated={onMembersUpdated}
      />

      <Sheet
        open={newLength != null}
        onClose={() => setNewLength(null)}
        title={`Make it a ${newLength ?? length}-day trip?`}
        description={`Everyone who answered for ${plural(length, "day")} will see the trip is now ${plural(newLength ?? length, "day")}.`}
        dismissible={!lengthBusy}
      >
        {lengthError && (
          <p role="alert" className="notice notice-stop mb-4">
            {lengthError}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setNewLength(null)} disabled={lengthBusy} className="btn btn-outline">
            Keep {plural(length, "day")}
          </button>
          <button type="button" onClick={changeLength} disabled={lengthBusy} className="btn btn-primary" data-autofocus>
            {lengthBusy ? (
              <>
                <Spinner /> Changing
              </>
            ) : (
              `Make it ${plural(newLength ?? length, "day")}`
            )}
          </button>
        </div>
      </Sheet>
    </div>
  );
}
