"use client";

import { useId, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DestinationOption, Member, Trip, TripStatus } from "@/lib/types";
import { hasAnswered, stageProgress, findOrganiser } from "@/lib/types";
import { advanceTrip } from "@/lib/advance";
import { eachDay, memberDays } from "@/lib/dates";
import { friendlyError, UserFacingError } from "@/lib/errors";
import { destinationIcon, firstName, plural } from "@/lib/format";
import { findBestOverlap } from "@/lib/overlap";
import { Icon, Spinner } from "@/components/icons";
import { Sheet } from "@/components/sheet";
import Calendar from "./calendar";

type Dialog = { kind: "add" } | { kind: "answer"; id: string } | { kind: "takeover"; id: string } | null;

const cleanName = (value: string) => value.trim().replace(/\s+/g, " ");

/** A note a person typed, as opposed to the JSON day list kept in the same column. */
function plainNote(m: Member): string | null {
  const note = m.constraint_note?.trim();
  if (!note) return null;
  try {
    const parsed: unknown = JSON.parse(note);
    return parsed !== null && typeof parsed === "object" ? null : note;
  } catch {
    return note;
  }
}

function statusChip(m: Member, stage: TripStatus): { tone: string; label: string } {
  if (stage === "commitment" || stage === "ready") {
    if (m.status === "confirmed_in") return { tone: "chip-go", label: "In" };
    if (m.status === "confirmed_out") return { tone: "chip-out", label: "Out" };
    return { tone: "chip-wait", label: "Waiting" };
  }
  if (!hasAnswered(m, stage)) return { tone: "chip-wait", label: "Waiting" };
  return { tone: "chip-done", label: stage === "dates_open" ? "Dates in" : "Voted" };
}

function avatarTone(m: Member, stage: TripStatus): string {
  if (stage === "commitment" || stage === "ready") {
    if (m.status === "confirmed_in") return "avatar-in";
    if (m.status === "confirmed_out") return "avatar-out";
  }
  return m.is_organizer ? "avatar-lead" : "";
}

/* ── Organiser: add someone who won't use the link ─────────────── */

function AddPersonSheet({
  trip,
  members,
  onClose,
  onMembersUpdated,
}: {
  trip: Trip;
  members: Member[];
  onClose: () => void;
  onMembersUpdated: () => Promise<void>;
}) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fieldId = useId();
  const hintId = useId();

  const trimmed = cleanName(name);
  const nameError = submitted && !trimmed ? "Type their name so the group knows who it is." : "";
  const duplicate =
    trimmed && members.some((m) => cleanName(m.name).toLowerCase() === trimmed.toLowerCase())
      ? `There's already a ${trimmed} in the group. Add a surname or initial so people can tell them apart.`
      : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!trimmed || busy) return;
    setBusy(true);
    setError("");
    try {
      const { error: insertError } = await supabase.from("members").insert({
        trip_id: trip.id,
        user_id: null,
        name: trimmed,
        is_organizer: false,
        is_proxy: true,
        status: "invited",
      });
      if (insertError) throw insertError;
      await onMembersUpdated();
      onClose();
    } catch (e) {
      setError(friendlyError(e, "Couldn't add them. Check your connection and try again."));
      setBusy(false);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Add someone who won't use the link"
      description="A parent, a kid, a friend who never opens links. They join the group and you answer for them at each step."
      dismissible={!busy}
    >
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor={fieldId} className="field-label">
          Their name
        </label>
        <input
          id={fieldId}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What the group calls them"
          maxLength={40}
          required
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="done"
          aria-invalid={!!nameError}
          aria-describedby={nameError || duplicate ? hintId : undefined}
          className="field"
          data-autofocus
        />
        {nameError ? (
          <p id={hintId} className="field-error">
            {nameError}
          </p>
        ) : duplicate ? (
          <p id={hintId} className="field-hint">
            {duplicate}
          </p>
        ) : null}

        {error && (
          <p role="alert" className="notice notice-stop mt-3">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn btn-primary btn-lg btn-block mt-4">
          {busy ? (
            <>
              <Spinner /> Adding
            </>
          ) : (
            "Save"
          )}
        </button>
      </form>
    </Sheet>
  );
}

/* ── Organiser: take over an entry nobody is answering ─────────── */

const NEEDS_DATABASE_UPDATE = "This needs the latest database update. Ask them to open the link again instead.";

function TakeOverSheet({
  member,
  onClose,
  onTakenOver,
  onMembersUpdated,
}: {
  member: Member;
  onClose: () => void;
  onTakenOver: () => void;
  onMembersUpdated: () => Promise<void>;
}) {
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function takeOver() {
    setBusy(true);
    setError("");
    try {
      const { data, error: updateError } = await supabase
        .from("members")
        .update({ is_proxy: true, user_id: null })
        .eq("id", member.id)
        .select("id");
      if (updateError) {
        // A refusal means the database predates this feature. Anything else
        // (offline, expired session) keeps its own explanation.
        const refused = updateError.code === "42501" || /row-level security/i.test(updateError.message ?? "");
        throw refused ? new UserFacingError(NEEDS_DATABASE_UPDATE) : updateError;
      }
      // An older database can also refuse silently: no error, and no row changed.
      if (!data || data.length === 0) throw new UserFacingError(NEEDS_DATABASE_UPDATE);
      await onMembersUpdated();
      onTakenOver();
    } catch (e) {
      setError(friendlyError(e, NEEDS_DATABASE_UPDATE));
      setBusy(false);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={`Answer for ${firstName(member.name)}?`}
      description={`${member.name} hasn't answered. If they've lost the link or joined twice, you can take over this entry and answer for them. They won't be able to edit it afterwards.`}
      dismissible={!busy}
    >
      {error && (
        <p role="alert" className="notice notice-stop mb-4">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onClose} disabled={busy} className="btn btn-outline">
          Leave it
        </button>
        <button type="button" onClick={takeOver} disabled={busy} className="btn btn-primary" data-autofocus>
          {busy ? (
            <>
              <Spinner /> Taking over
            </>
          ) : (
            "Take over"
          )}
        </button>
      </div>
    </Sheet>
  );
}

/* ── Organiser: answer for someone ─────────────────────────────── */

function AnswerSheet({
  trip,
  member,
  members,
  options,
  onClose,
  onMembersUpdated,
}: {
  trip: Trip;
  member: Member;
  members: Member[];
  options?: DestinationOption[];
  onClose: () => void;
  onMembersUpdated: () => Promise<void>;
}) {
  const supabase = createClient();
  const stage = trip.status;
  const first = firstName(member.name);
  /** Which control is saving, so only that one shows a spinner. */
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState<Set<string>>(() => new Set(memberDays(member)));
  // The best window comes from the whole group. The per-day counts come from
  // everyone else, because the calendar adds this person's picks itself; with
  // their saved days left in, every day they already had would count one too many.
  const best = useMemo(() => findBestOverlap(members, trip.trip_days).best, [members, trip.trip_days]);
  const othersFree = useMemo(
    () => findBestOverlap(members.filter((m) => m.id !== member.id), trip.trip_days).dateMap,
    [members, member.id, trip.trip_days],
  );

  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(member.name);
  const [nameError, setNameError] = useState("");
  const nameId = useId();
  const nameErrorId = useId();

  async function write(key: string, patch: Partial<Member>, opts: { advance: boolean }): Promise<boolean> {
    if (busy) return false;
    setBusy(key);
    setError("");
    try {
      const { error: updateError } = await supabase.from("members").update(patch).eq("id", member.id);
      if (updateError) throw updateError;
      if (opts.advance) await advanceTrip(supabase, trip.id);
      await onMembersUpdated();
      return true;
    } catch (e) {
      setError(friendlyError(e, "That didn't save. Check your connection and try again."));
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function saveAnswer(key: string, patch: Partial<Member>) {
    if (await write(key, patch, { advance: true })) onClose();
  }

  function saveDates() {
    const days = Array.from(selected).sort();
    if (days.length === 0) return;
    saveAnswer("dates", {
      availability_start: days[0],
      availability_end: days[days.length - 1],
      constraint_note: JSON.stringify(days),
      constraint_start: null,
      constraint_end: null,
      status: "responded",
    });
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = cleanName(name);
    if (!trimmed) {
      setNameError("Type a name.");
      return;
    }
    setNameError("");
    if (trimmed === member.name || (await write("name", { name: trimmed }, { advance: false }))) {
      setName(trimmed);
      setRenaming(false);
    }
  }

  const description =
    stage === "dates_open"
      ? `Tap the days ${first} is free. You can change them until the dates are locked.`
      : stage === "destination_open"
        ? `Pick the place ${first} wants. You can change it until the place is locked.`
        : `Say whether ${first} is coming. You can change it until the trip is locked.`;

  const errorNotice = error && (
    <p role="alert" className="notice notice-stop mt-4">
      {error}
    </p>
  );

  const rename = renaming ? (
    <form onSubmit={handleRename} noValidate className="mt-5 border-t border-border pt-4">
      <label htmlFor={nameId} className="field-label">
        Name
      </label>
      <div className="flex gap-2">
        <input
          id={nameId}
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setNameError("");
          }}
          maxLength={40}
          required
          autoFocus
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="done"
          aria-invalid={!!nameError}
          aria-describedby={nameError ? nameErrorId : undefined}
          className="field min-w-0"
        />
        <button type="submit" disabled={busy !== null} className="btn btn-outline shrink-0">
          {busy === "name" ? <Spinner /> : null}
          Save name
        </button>
      </div>
      {nameError && (
        <p id={nameErrorId} className="field-error">
          {nameError}
        </p>
      )}
    </form>
  ) : (
    <button
      type="button"
      onClick={() => setRenaming(true)}
      disabled={busy !== null}
      className="btn btn-quiet btn-sm -ml-3 mt-3 min-h-[44px]"
    >
      <Icon name="pencil" className="h-4 w-4" />
      Rename {first}
    </button>
  );

  return (
    <Sheet open onClose={onClose} title={`Answer for ${first}`} description={description} dismissible={busy === null}>
      {stage === "dates_open" && (
        <>
          <Calendar
            selectedDates={selected}
            onToggleDate={(day) =>
              setSelected((prev) => {
                const next = new Set(prev);
                if (next.has(day)) next.delete(day);
                else next.add(day);
                return next;
              })
            }
            onRangeSelect={(start, end) =>
              setSelected((prev) => {
                const next = new Set(prev);
                const [from, to] = start <= end ? [start, end] : [end, start];
                for (const day of eachDay(from, to)) next.add(day);
                return next;
              })
            }
            onClear={() => setSelected(new Set())}
            dateMap={othersFree}
            windowStart={trip.date_window_start ?? undefined}
            windowEnd={trip.date_window_end ?? undefined}
            best={best}
            groupSize={members.length}
          />
          {rename}
          {/* Stays in reach while the calendar scrolls behind it. Sticky offsets are
              measured inside the sheet's padding, so the bar is pushed back out by
              the same amount to sit flush with the sheet's bottom edge. */}
          <div className="sticky -bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-10 -mx-5 -mb-[max(1.25rem,env(safe-area-inset-bottom))] mt-4 border-t border-border bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
            {error && (
              <p role="alert" className="notice notice-stop mb-3">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={saveDates}
              disabled={busy !== null || selected.size === 0}
              className="btn btn-primary btn-lg btn-block"
            >
              {busy === "dates" ? (
                <>
                  <Spinner /> Saving
                </>
              ) : selected.size === 0 ? (
                "Tap at least one day"
              ) : (
                `Save ${plural(selected.size, "day")} for ${first}`
              )}
            </button>
          </div>
        </>
      )}

      {stage === "destination_open" && (
        <>
          {options && options.length > 0 ? (
            <ul className="space-y-2">
              {options.map((option) => {
                const chosen = member.destination_vote === option.id;
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      aria-pressed={chosen}
                      disabled={busy !== null}
                      onClick={() => (chosen ? onClose() : saveAnswer(option.id, { destination_vote: option.id }))}
                      className={[
                        "flex min-h-[52px] w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-60",
                        chosen
                          ? "border-border-strong bg-primary-light"
                          : "border-border bg-surface hover:border-border-strong",
                      ].join(" ")}
                    >
                      <span
                        aria-hidden="true"
                        className={[
                          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2",
                          chosen ? "border-border-strong" : "border-border",
                        ].join(" ")}
                      >
                        {chosen && <span className="h-2 w-2 rounded-full bg-text" />}
                      </span>
                      <Icon name={destinationIcon(option.emoji)} className="h-5 w-5 shrink-0 text-text-secondary" />
                      <span className="min-w-0 flex-1 break-words text-[0.9375rem] font-semibold text-text">
                        {option.name}
                      </span>
                      {busy === option.id && <Spinner />}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="notice notice-info">There are no places to vote on yet. Add one to the list first.</p>
          )}
          {errorNotice}
          {rename}
        </>
      )}

      {stage === "commitment" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={member.status === "confirmed_in"}
              disabled={busy !== null}
              onClick={() => saveAnswer("in", { status: "confirmed_in" })}
              className="btn btn-go btn-lg"
            >
              {busy === "in" ? <Spinner /> : <Icon name="check" className="h-4 w-4" />}
              In
            </button>
            <button
              type="button"
              aria-pressed={member.status === "confirmed_out"}
              disabled={busy !== null}
              onClick={() => saveAnswer("out", { status: "confirmed_out" })}
              className="btn btn-outline btn-lg"
            >
              {busy === "out" ? <Spinner /> : <Icon name="x" className="h-4 w-4" />}
              Out
            </button>
          </div>
          {(member.status === "confirmed_in" || member.status === "confirmed_out") && (
            <p className="mt-3 font-mono text-xs text-text-tertiary">
              Right now {first} is {member.status === "confirmed_in" ? "in" : "out"}.
            </p>
          )}
          {errorNotice}
          {rename}
        </>
      )}
    </Sheet>
  );
}

/* ── The group ─────────────────────────────────────────────────── */

/**
 * Everyone on the trip and where each of them stands on the current question.
 * Sits at the bottom of the Dates, Place and Commit stages.
 *
 * For the organiser it is also where people who will never open the link are
 * handled: add them, answer for them, or take over an entry that is stuck.
 */
export function MemberList({
  trip,
  members,
  currentMember,
  isOrganizer,
  onMembersUpdated,
  options,
}: {
  trip: Trip;
  members: Member[];
  currentMember: Member;
  isOrganizer: boolean;
  onMembersUpdated: () => Promise<void>;
  /** Destination options on the Place stage, so votes can be shown and entered. */
  options?: DestinationOption[];
}) {
  const stage = trip.status;
  const panelId = useId();
  // A long list starts folded on a phone so it does not bury the stage above it.
  const [open, setOpen] = useState(
    () => !(typeof window !== "undefined" && members.length > 4 && window.matchMedia("(max-width: 639px)").matches),
  );
  const [dialog, setDialog] = useState<Dialog>(null);

  const progress = stageProgress(trip, members);
  const waiting = members.filter((m) => !hasAnswered(m, stage)).length;
  const organiser = findOrganiser(trip, members);
  const answeredBy = isOrganizer ? "you" : organiser ? firstName(organiser.name) : "the organiser";
  const canAct = isOrganizer && stage !== "ready";

  const dialogMember = dialog && dialog.kind !== "add" ? members.find((m) => m.id === dialog.id) : undefined;

  function secondaryLine(m: Member): string {
    const parts: string[] = [];
    if (stage === "dates_open") {
      const days = memberDays(m).length;
      if (days > 0) parts.push(`${plural(days, "day")} marked`);
    } else if (stage === "destination_open" && m.destination_vote) {
      const place = options?.find((o) => o.id === m.destination_vote)?.name;
      if (place) parts.push(place);
    }
    if (m.is_proxy && !m.is_organizer) parts.push(`answered by ${answeredBy}`);
    return parts.join(" · ");
  }

  return (
    <section className="border-t border-border">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-[48px] w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-left"
        >
          <span className="label-mono">The group · {members.length}</span>
          <span className="flex items-center gap-2 font-mono text-xs text-text-secondary">
            {progress.answered} answered
            {waiting > 0 ? ` · ${waiting} waiting` : ""}
            <Icon
              name="chevron-down"
              className={`h-4 w-4 shrink-0 text-text-tertiary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </span>
        </button>
      </h3>

      <div id={panelId} hidden={!open}>
        <ul className="divide-y divide-border border-t border-border">
          {members.map((m) => {
            const chip = statusChip(m, stage);
            const first = firstName(m.name);
            const secondary = secondaryLine(m);
            const note = plainNote(m);
            const canAnswer = canAct && m.is_proxy;
            const canTakeOver = canAct && !m.is_proxy && !m.is_organizer && !hasAnswered(m, stage);

            return (
              <li key={m.id} className="flex items-start gap-3 py-3">
                <span className={`avatar ${avatarTone(m, stage)}`} aria-hidden="true">
                  {m.name.trim().charAt(0)}
                </span>
                {/* min-h-8 centres a lone name on the 32px avatar. */}
                <div className="flex min-h-8 min-w-0 flex-1 flex-col items-start justify-center">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-[0.9375rem] font-semibold leading-snug text-text">
                    <span className="min-w-0 break-words">
                      {m.name}
                      {m.id === currentMember.id && <span className="font-normal text-text-tertiary"> (you)</span>}
                    </span>
                    {m.is_organizer && <span className="label-mono">Organiser</span>}
                  </p>
                  {secondary && <p className="mt-0.5 text-[0.8125rem] leading-snug text-text-secondary">{secondary}</p>}
                  {note && (
                    <p className="mt-1 flex items-start gap-1.5 text-[0.8125rem] leading-snug text-status-waiting">
                      <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="min-w-0 break-words">{note}</span>
                    </p>
                  )}
                  {/* One button per row on purpose: when an entry is taken over, the
                      same element becomes "Answer for ...", so focus has somewhere to return to. */}
                  {(canAnswer || canTakeOver) && (
                    <button
                      type="button"
                      onClick={() => setDialog({ kind: canAnswer ? "answer" : "takeover", id: m.id })}
                      className={
                        canAnswer
                          ? "btn btn-outline btn-sm mt-2 min-h-[44px]"
                          : "btn btn-quiet btn-sm -mb-2 -ml-3 min-h-[44px]"
                      }
                    >
                      {canAnswer ? (
                        `Answer for ${first}`
                      ) : (
                        <>
                          Answer for them<span className="sr-only"> ({m.name})</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <span className={`chip mt-[5px] shrink-0 ${chip.tone}`}>{chip.label}</span>
              </li>
            );
          })}

          {canAct && (
            <li>
              <button
                type="button"
                onClick={() => setDialog({ kind: "add" })}
                className="flex min-h-[56px] w-full items-center gap-3 py-3 text-left text-[0.9375rem] font-semibold text-text hover:text-text-secondary"
              >
                <span
                  className="avatar border border-dashed border-border-strong bg-background text-text-secondary"
                  aria-hidden="true"
                >
                  <Icon name="user-plus" className="h-4 w-4" />
                </span>
                Add someone who won&apos;t use the link
              </button>
            </li>
          )}
        </ul>
      </div>

      {dialog?.kind === "add" && (
        <AddPersonSheet
          trip={trip}
          members={members}
          onClose={() => setDialog(null)}
          onMembersUpdated={onMembersUpdated}
        />
      )}
      {dialog?.kind === "takeover" && dialogMember && (
        <TakeOverSheet
          member={dialogMember}
          onClose={() => setDialog(null)}
          onTakenOver={() => setDialog({ kind: "answer", id: dialogMember.id })}
          onMembersUpdated={onMembersUpdated}
        />
      )}
      {dialog?.kind === "answer" && dialogMember && (
        <AnswerSheet
          key={dialogMember.id}
          trip={trip}
          member={dialogMember}
          members={members}
          options={options}
          onClose={() => setDialog(null)}
          onMembersUpdated={onMembersUpdated}
        />
      )}
    </section>
  );
}
