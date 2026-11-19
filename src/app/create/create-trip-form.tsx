"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateSlug } from "@/lib/slug";
import type { Trip } from "@/lib/types";
import { diffDays, formatRange, parseDay, toDayKey, todayKey, type DayKey } from "@/lib/dates";
import { friendlyError } from "@/lib/errors";
import { plural } from "@/lib/format";
import { Icon, Spinner } from "@/components/icons";
import { ThemeToggle } from "@/app/theme-toggle";
import { DatePickerInput } from "@/app/date-picker-input";

/* ── Choices ───────────────────────────────────────────────────── */

const NAME_EXAMPLES = [
  "Goa birthday trip",
  "Manali in the snow",
  "Pondicherry long weekend",
  "Coorg coffee trail",
  "Rajasthan road trip",
  "Kerala backwaters",
  "Ladakh, finally",
];

const NAME_MIN = 2;
const NAME_MAX = 60;
const DAYS = { min: 1, max: 14, start: 3 };
const PEOPLE = { min: 2, max: 30, start: 6 };

type When = "anytime" | "this_month" | "next_month" | "range";
const WHEN_OPTIONS: { value: When; label: string }[] = [
  { value: "anytime", label: "Anytime" },
  { value: "this_month", label: "This month" },
  { value: "next_month", label: "Next month" },
  { value: "range", label: "Pick a range" },
];

const REPLY_OPTIONS = [
  { value: "none", label: "No deadline" },
  { value: "24h", label: "24 hours" },
  { value: "48h", label: "48 hours" },
  { value: "72h", label: "72 hours" },
];

const tidy = (value: string) => value.trim().replace(/\s+/g, " ");

/** Today to the end of this month, or the whole of next month. */
function monthWindow(today: DayKey, next: boolean): { start: DayKey; end: DayKey } {
  const d = parseDay(today);
  const offset = next ? 1 : 0;
  return {
    start: next ? toDayKey(new Date(d.getFullYear(), d.getMonth() + 1, 1, 12)) : today,
    end: toDayKey(new Date(d.getFullYear(), d.getMonth() + offset + 1, 0, 12)),
  };
}

function windowProblem(start: DayKey, end: DayKey, tripDays: number, today: DayKey, when: When): string {
  if (end < start) return "The latest date can't be before the earliest.";
  if (end < today) return "That window has already passed. Pick dates from today onward.";
  const length = diffDays(start, end) + 1;
  if (length < tripDays) {
    const need = `A ${tripDays}-day trip needs a window of at least ${plural(tripDays, "day")}.`;
    return when === "this_month" ? `${need} Only ${plural(length, "day")} left this month.` : need;
  }
  return "";
}

/* ── Small controls ────────────────────────────────────────────── */

/** Minus, a number you can also type, plus. */
function Stepper({
  id,
  labelId,
  hintId,
  value,
  min,
  max,
  unit,
  units,
  onChange,
}: {
  id: string;
  labelId: string;
  hintId?: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  units: string;
  onChange: (value: number) => void;
}) {
  // What is in the box while someone is typing. Null means "show the value".
  const [draft, setDraft] = useState<string | null>(null);
  const set = (n: number) => onChange(Math.min(max, Math.max(min, n)));

  function commit() {
    if (draft === null) return;
    const typed = parseInt(draft, 10);
    if (!Number.isNaN(typed)) set(typed);
    setDraft(null);
  }

  function step(by: number) {
    setDraft(null);
    set(value + by);
  }

  const edge = "flex h-11 w-11 items-center justify-center text-text transition-colors hover:bg-subtle disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="flex items-center gap-3">
      <div className="inline-flex overflow-hidden rounded-xl border border-border bg-surface">
        <button type="button" onClick={() => step(-1)} disabled={value <= min} aria-label={`Fewer ${units}`} className={edge}>
          <Icon name="minus" className="h-4 w-4" />
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          role="spinbutton"
          aria-labelledby={labelId}
          aria-describedby={hintId}
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuetext={`${value} ${value === 1 ? unit : units}`}
          value={draft ?? String(value)}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 2))}
          onFocus={(e) => e.target.select()}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              step(e.key === "ArrowUp" ? 1 : -1);
            } else if (e.key === "Enter") {
              // Take the typed number. Do not send the whole form.
              e.preventDefault();
              commit();
            }
          }}
          // Ring drawn inside the box so the rounded group does not clip it.
          // Important, because the global focus rule is unlayered.
          className="w-14 border-x border-border bg-transparent text-center font-mono text-lg font-semibold text-text -outline-offset-2!"
        />
        <button type="button" onClick={() => step(1)} disabled={value >= max} aria-label={`More ${units}`} className={edge}>
          <Icon name="plus" className="h-4 w-4" />
        </button>
      </div>
      <span className="text-[0.9375rem] text-text-secondary" aria-hidden="true">
        {value === 1 ? unit : units}
      </span>
    </div>
  );
}

/** One choice out of a few. Real radio buttons, drawn as a segmented control. */
function Segmented<T extends string>({
  name,
  options,
  value,
  onChange,
  describedBy,
}: {
  name: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  describedBy?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      {options.map((opt) => (
        <label key={opt.value} className="relative cursor-pointer">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            aria-describedby={describedBy}
            className="peer sr-only"
          />
          <span className="flex min-h-[44px] items-center justify-center rounded-xl border border-border bg-surface px-2 text-center text-sm font-semibold text-text transition-colors hover:border-border-strong peer-checked:border-primary peer-checked:bg-primary peer-checked:text-on-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
            {opt.label}
          </span>
        </label>
      ))}
    </div>
  );
}

/* ── The form ──────────────────────────────────────────────────── */

type Step = "trip" | "member" | "proxies";

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function CreateTripForm({
  defaultName = "",
  onCreated,
}: {
  /** The signed-in organiser's name, to prefill "Your name". */
  defaultName?: string;
  /** Called with the new slug. Defaults to opening the trip page. */
  onCreated?: (slug: string) => void;
}) {
  const router = useRouter();

  const [tripName, setTripName] = useState("");
  const [organiser, setOrganiser] = useState(defaultName);
  const [tripDays, setTripDays] = useState(DAYS.start);
  const [people, setPeople] = useState(PEOPLE.start);
  const [when, setWhen] = useState<When>("anytime");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [replyBy, setReplyBy] = useState("none");
  const [proxies, setProxies] = useState<string[]>([]);
  const [proxyDraft, setProxyDraft] = useState("");
  const [proxyError, setProxyError] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);

  const [touched, setTouched] = useState({ tripName: false, organiser: false });
  const [submitted, setSubmitted] = useState(false);
  /** They tried to create the trip with a half-picked range. Cleared when the choice changes. */
  const [rangeAsked, setRangeAsked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  /** Set once the trip row exists, so a retry never creates a second trip. */
  const [created, setCreated] = useState<Trip | null>(null);
  const [failedAt, setFailedAt] = useState<Exclude<Step, "trip"> | null>(null);

  // Known only in the browser. Empty during server rendering, when no date is shown.
  const [today, setToday] = useState<DayKey>("");
  const [example, setExample] = useState(0);

  const ids = {
    tripName: useId(),
    tripNameError: useId(),
    organiser: useId(),
    organiserHelp: useId(),
    days: useId(),
    daysLabel: useId(),
    people: useId(),
    peopleLabel: useId(),
    peopleHint: useId(),
    whenHelp: useId(),
    earliest: useId(),
    earliestLabel: useId(),
    latest: useId(),
    latestLabel: useId(),
    replyHint: useId(),
    proxy: useId(),
    proxyHint: useId(),
    proxyError: useId(),
  };
  const tripNameRef = useRef<HTMLInputElement>(null);
  const organiserRef = useRef<HTMLInputElement>(null);
  const whenRef = useRef<HTMLFieldSetElement>(null);
  const proxyRef = useRef<HTMLInputElement>(null);

  useEffect(() => setToday(todayKey()), []);

  // Example names rotate in the placeholder until the organiser starts typing.
  useEffect(() => {
    if (tripName) return;
    const timer = setInterval(() => setExample((i) => (i + 1) % NAME_EXAMPLES.length), 3000);
    return () => clearInterval(timer);
  }, [tripName]);

  /* Validation. Derived on every render, shown once a field has been left or the form sent. */

  const name = tidy(tripName);
  const me = tidy(organiser);
  const tripNameProblem = !name
    ? "Give the trip a name."
    : name.length < NAME_MIN
      ? `Use at least ${NAME_MIN} characters.`
      : "";
  const organiserProblem = me ? "" : "Type your name so the group knows who is asking.";

  function windowFor(day: DayKey): { start: DayKey; end: DayKey } | null {
    if (when === "anytime" || !day) return null;
    if (when === "range") return rangeStart && rangeEnd ? { start: rangeStart, end: rangeEnd } : null;
    return monthWindow(day, when === "next_month");
  }
  function whenProblemFor(day: DayKey): string {
    if (when === "range" && (!rangeStart || !rangeEnd)) return "Pick both dates, or choose Anytime.";
    const span = windowFor(day);
    return span ? windowProblem(span.start, span.end, tripDays, day, when) : "";
  }
  const tripWindow = windowFor(today);
  const rangeUnfinished = when === "range" && (!rangeStart || !rangeEnd);
  // A half-picked range is not a mistake until they try to create the trip.
  const whenProblem = rangeUnfinished && !rangeAsked ? "" : whenProblemFor(today);
  // A missing date marks only the empty picker; a bad pair marks both.
  const earliestInvalid = !!whenProblem && (!rangeUnfinished || !rangeStart);
  const latestInvalid = !!whenProblem && (!rangeUnfinished || !rangeEnd);

  const showTripNameError = (touched.tripName || submitted) && !!tripNameProblem;
  const showOrganiserError = (touched.organiser || submitted) && !!organiserProblem;

  /* People who will not use the link */

  function addProxy() {
    const person = tidy(proxyDraft);
    if (!person) {
      setProxyError("Type their name first.");
    } else if (proxies.some((p) => p.toLowerCase() === person.toLowerCase())) {
      setProxyError(`${person} is already on the list.`);
    } else if (proxies.length + 2 > PEOPLE.max) {
      setProxyError(`A trip holds ${PEOPLE.max} people at most.`);
    } else {
      setProxies([...proxies, person]);
      // They are part of the group, so the headcount cannot be smaller than them plus you.
      setPeople((n) => Math.max(n, proxies.length + 2));
      setProxyDraft("");
      setProxyError("");
    }
    proxyRef.current?.focus();
  }

  /* Creating */

  async function insertTrip(userId: string, span: { start: DayKey; end: DayKey } | null): Promise<Trip> {
    const supabase = createClient();
    const row = {
      name,
      organizer_id: userId,
      trip_days: tripDays,
      budget: null,
      date_window_start: span?.start ?? null,
      date_window_end: span?.end ?? null,
      voting_deadline: replyBy,
    };
    let slug = generateSlug(name);
    let withSize = true;
    let slugRetried = false;

    for (;;) {
      const { data, error: insertError } = await supabase
        .from("trips")
        .insert(withSize ? { ...row, slug, expected_size: people } : { ...row, slug })
        .select()
        .single();
      if (!insertError) return data as Trip;

      // The expected_size column arrives with a migration that may not have
      // run yet. Without it the trip still works: the organiser locks by hand.
      if (withSize && (insertError.code === "PGRST204" || insertError.code === "42703")) {
        withSize = false;
        continue;
      }
      // Someone already has this slug. A fresh suffix settles it.
      if (!slugRetried && insertError.code === "23505") {
        slugRetried = true;
        slug = generateSlug(name);
        continue;
      }
      throw insertError.code === "23505" ? new Error("Could not find a free link for this trip") : insertError;
    }
  }

  /** Runs the steps in order, starting where the last attempt stopped. */
  async function run(from: Step, existing: Trip | null, span: { start: DayKey; end: DayKey } | null) {
    setBusy(true);
    setError("");
    let step = from;
    let trip = existing;
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (step === "trip") {
        trip = await insertTrip(user.id, span);
        setCreated(trip);
        step = "member";
      }
      if (!trip) throw new Error("No trip to finish");

      if (step === "member") {
        // "invited", not "responded": the organiser has not given dates yet.
        const { error: memberError } = await supabase.from("members").insert({
          trip_id: trip.id,
          user_id: user.id,
          name: me,
          is_organizer: true,
          status: "invited",
        });
        // 23505 here means an earlier attempt did go through.
        if (memberError && memberError.code !== "23505") throw memberError;
        step = "proxies";
      }

      if (proxies.length > 0) {
        const tripId = trip.id;
        const { error: proxyInsertError } = await supabase.from("members").insert(
          proxies.map((person) => ({
            trip_id: tripId,
            user_id: null,
            name: person,
            is_organizer: false,
            is_proxy: true,
            status: "invited",
          })),
        );
        if (proxyInsertError) throw proxyInsertError;
      }

      openTrip(trip.slug);
    } catch (e) {
      const fallback =
        step === "trip"
          ? "We couldn't create the trip. Check your connection and try again."
          : step === "member"
            ? "We couldn't add you to the trip. Check your connection and try again."
            : "We couldn't add them. Check your connection and try again.";
      setError(friendlyError(e, fallback));
      if (step !== "trip") setFailedAt(step);
      setBusy(false);
    }
  }

  // Stays busy on purpose: the page is about to change.
  function openTrip(slug: string) {
    if (onCreated) onCreated(slug);
    else router.push(`/trip/${slug}`);
  }

  function focusField(el: HTMLElement | null | undefined) {
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "center" });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setSubmitted(true);
    setTouched({ tripName: true, organiser: true });
    setRangeAsked(when === "range");
    const now = todayKey();
    setToday(now);

    if (tripNameProblem) return focusField(tripNameRef.current);
    if (organiserProblem) return focusField(organiserRef.current);
    if (whenProblemFor(now)) {
      const target =
        when === "range"
          ? document.getElementById(rangeStart ? ids.latest : ids.earliest)
          : whenRef.current?.querySelector<HTMLElement>("input:checked");
      return focusField(target ?? whenRef.current);
    }
    const leftover = tidy(proxyDraft);
    if (leftover) {
      setProxyError(`Tap Add to include ${leftover}, or clear the box.`);
      setMoreOpen(true);
      // The field is inside a closed <details> until the next paint.
      setTimeout(() => focusField(proxyRef.current), 0);
      return;
    }

    run("trip", null, windowFor(now));
  }

  /* ── Recovery: the trip exists, a later step did not finish ──── */

  if (created && failedAt) {
    const retry = () => run(failedAt, created, null);
    return (
      <div className="pb-16" aria-live="polite">
        <p className="label-mono">{failedAt === "member" ? "One step left" : "Trip created"}</p>
        <h1 className="mt-2 font-heading text-[2rem] font-extrabold leading-[1.05] text-text [overflow-wrap:anywhere]">
          {failedAt === "member"
            ? `${created.name} is created, but you're not on it yet.`
            : `${listNames(proxies)} ${proxies.length === 1 ? "isn't" : "aren't"} on ${created.name} yet.`}
        </h1>
        <p className="mt-3 text-[0.9375rem] text-text-secondary">
          {failedAt === "member"
            ? "Nothing is lost. Trying again only adds you as the organiser."
            : "The trip is ready and you are on it. Only the people you answer for are missing."}
        </p>

        {error && !busy && (
          <p role="alert" className="notice notice-stop mt-5">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-status-out" />
            <span>{error}</span>
          </p>
        )}

        <div className="mt-6 space-y-2">
          <button type="button" onClick={retry} disabled={busy} className="btn btn-primary btn-lg btn-block">
            {busy ? (
              <>
                <Spinner /> {failedAt === "member" ? "Adding you" : "Adding them"}
              </>
            ) : (
              <>
                <Icon name="refresh" className="h-4 w-4" />
                Try again
              </>
            )}
          </button>
          {failedAt === "proxies" && (
            <button type="button" onClick={() => openTrip(created.slug)} disabled={busy} className="btn btn-outline btn-block">
              Open the trip without them
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ── The form ────────────────────────────────────────────────── */

  return (
    <>
      <p className="label-mono">New trip</p>
      <h1 className="mt-2 font-heading text-[2.25rem] font-extrabold leading-[1.02] text-text">Set up the trip.</h1>
      <p className="mt-3 text-[0.9375rem] text-text-secondary">
        Five quick answers. Then you get one link to share with the group.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-7">
        <div className="space-y-6">
          {/* 1. Trip name */}
          <div>
            <label htmlFor={ids.tripName} className="field-label">
              Trip name
            </label>
            <input
              ref={tripNameRef}
              id={ids.tripName}
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, tripName: true }))}
              placeholder={NAME_EXAMPLES[example]}
              maxLength={NAME_MAX}
              autoComplete="off"
              autoCapitalize="sentences"
              enterKeyHint="next"
              required
              aria-invalid={showTripNameError}
              aria-describedby={showTripNameError ? ids.tripNameError : undefined}
              className="field"
            />
            {showTripNameError && (
              <p id={ids.tripNameError} className="field-error">
                {tripNameProblem}
              </p>
            )}
          </div>

          {/* 2. Your name */}
          <div>
            <label htmlFor={ids.organiser} className="field-label">
              Your name
            </label>
            <input
              ref={organiserRef}
              id={ids.organiser}
              type="text"
              value={organiser}
              onChange={(e) => setOrganiser(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, organiser: true }))}
              placeholder="What the group calls you"
              maxLength={40}
              autoComplete="name"
              autoCapitalize="words"
              enterKeyHint="next"
              required
              aria-invalid={showOrganiserError}
              aria-describedby={ids.organiserHelp}
              className="field"
            />
            <p id={ids.organiserHelp} className={showOrganiserError ? "field-error" : "field-hint"}>
              {showOrganiserError ? organiserProblem : "Your friends see this on the invite."}
            </p>
          </div>

          {/* 3. Days */}
          <div>
            <label id={ids.daysLabel} htmlFor={ids.days} className="field-label">
              How many days?
            </label>
            <Stepper
              id={ids.days}
              labelId={ids.daysLabel}
              value={tripDays}
              min={DAYS.min}
              max={DAYS.max}
              unit="day"
              units="days"
              onChange={setTripDays}
            />
          </div>

          {/* 4. People */}
          <div>
            <label id={ids.peopleLabel} htmlFor={ids.people} className="field-label">
              How many people, including you?
            </label>
            <Stepper
              id={ids.people}
              labelId={ids.peopleLabel}
              hintId={ids.peopleHint}
              value={people}
              min={Math.max(PEOPLE.min, proxies.length + 1)}
              max={PEOPLE.max}
              unit="person"
              units="people"
              onChange={setPeople}
            />
            <p id={ids.peopleHint} className="field-hint">
              Stages lock by themselves once this many have joined and answered. Not sure? Guess high. You can always
              lock by hand.
            </p>
          </div>

          {/* 5. Window */}
          <fieldset ref={whenRef} tabIndex={-1} className="min-w-0 outline-none">
            <legend className="field-label">Roughly when?</legend>
            <Segmented
              name="when"
              options={WHEN_OPTIONS}
              value={when}
              onChange={(choice) => {
                setWhen(choice);
                setRangeAsked(false);
              }}
              describedBy={ids.whenHelp}
            />

            {when === "range" && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label id={ids.earliestLabel} htmlFor={ids.earliest} className="field-label">
                    Earliest
                  </label>
                  <DatePickerInput
                    id={ids.earliest}
                    labelledBy={ids.earliestLabel}
                    describedBy={ids.whenHelp}
                    value={rangeStart}
                    onChange={setRangeStart}
                    invalid={earliestInvalid}
                    placeholder="First possible day"
                  />
                </div>
                <div>
                  <label id={ids.latestLabel} htmlFor={ids.latest} className="field-label">
                    Latest
                  </label>
                  <DatePickerInput
                    id={ids.latest}
                    labelledBy={ids.latestLabel}
                    describedBy={ids.whenHelp}
                    value={rangeEnd}
                    onChange={setRangeEnd}
                    min={rangeStart || undefined}
                    invalid={latestInvalid}
                    placeholder="Last possible day"
                  />
                </div>
              </div>
            )}

            <p id={ids.whenHelp} className={whenProblem ? "field-error" : "field-hint"} aria-live="polite">
              {whenProblem ? (
                whenProblem
              ) : when === "anytime" ? (
                "No window. The group can pick any days."
              ) : tripWindow ? (
                <>
                  The group picks days between{" "}
                  <span className="whitespace-nowrap font-semibold text-text-secondary">
                    {formatRange(tripWindow.start, tripWindow.end)}
                  </span>
                  .
                </>
              ) : when === "range" ? (
                "The group can only pick days inside this window."
              ) : (
                " "
              )}
            </p>
          </fieldset>

          {/* More options */}
          <details
            open={moreOpen}
            onToggle={(e) => setMoreOpen(e.currentTarget.open)}
            className="group border-t border-border"
          >
            <summary className="flex min-h-[52px] items-center justify-between gap-3 py-3">
              <span>
                <span className="block text-[0.9375rem] font-semibold text-text">More options</span>
                <span className="block text-[0.8125rem] text-text-tertiary">
                  A reply-by time, and people who won&apos;t use the link
                </span>
              </span>
              <Icon
                name="chevron-down"
                className="h-4 w-4 shrink-0 text-text-secondary transition-transform group-open:rotate-180"
              />
            </summary>

            <div className="space-y-6 pb-2 pt-2">
              <fieldset className="min-w-0">
                <legend className="field-label">Reply by</legend>
                <Segmented
                  name="reply-by"
                  options={REPLY_OPTIONS}
                  value={replyBy}
                  onChange={setReplyBy}
                  describedBy={ids.replyHint}
                />
                <p id={ids.replyHint} className="field-hint">
                  Shown to the group on the dates step. Nothing closes automatically.
                </p>
              </fieldset>

              <div>
                <label htmlFor={ids.proxy} className="field-label">
                  Add someone who won&apos;t use the link
                </label>
                <p id={ids.proxyHint} className="-mt-0.5 mb-2 text-[0.8125rem] text-text-tertiary">
                  For a grandparent or anyone who won&apos;t tap a link. You answer for them.
                </p>

                {proxies.length > 0 && (
                  <ul className="mb-2 divide-y divide-border rounded-xl border border-border bg-surface">
                    {proxies.map((person) => (
                      <li key={person} className="flex items-center justify-between gap-2 pl-3">
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span className="avatar avatar-sm" aria-hidden="true">
                            {person.charAt(0)}
                          </span>
                          <span className="truncate text-[0.9375rem] text-text">{person}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setProxies(proxies.filter((p) => p !== person));
                            setProxyError("");
                            proxyRef.current?.focus();
                          }}
                          className="icon-btn shrink-0"
                          aria-label={`Remove ${person}`}
                        >
                          <Icon name="x" className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex gap-2">
                  <input
                    ref={proxyRef}
                    id={ids.proxy}
                    type="text"
                    value={proxyDraft}
                    onChange={(e) => {
                      setProxyDraft(e.target.value);
                      if (proxyError) setProxyError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        // Add the person. Do not send the whole form.
                        e.preventDefault();
                        addProxy();
                      }
                    }}
                    placeholder="Their name"
                    maxLength={40}
                    autoComplete="off"
                    autoCapitalize="words"
                    enterKeyHint="done"
                    aria-invalid={!!proxyError}
                    aria-describedby={proxyError ? ids.proxyError : ids.proxyHint}
                    className="field"
                  />
                  <button type="button" onClick={addProxy} className="btn btn-outline shrink-0">
                    <Icon name="plus" className="h-4 w-4" />
                    Add
                  </button>
                </div>
                {proxyError ? (
                  <p id={ids.proxyError} role="alert" className="field-error">
                    {proxyError}
                  </p>
                ) : proxies.length > 0 ? (
                  <p className="field-hint">
                    {proxies.length === 1 ? "They are" : `These ${proxies.length} are`} counted in your {people} people.
                  </p>
                ) : null}
              </div>
            </div>
          </details>
        </div>

        {/* Always on screen: the one action this page exists for. */}
        <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-border bg-background px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          {error && (
            <p role="alert" className="notice notice-stop mb-3">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-status-out" />
              <span>{error}</span>
            </p>
          )}
          <button type="submit" disabled={busy} className="btn btn-primary btn-lg btn-block">
            {busy ? (
              <>
                <Spinner /> Creating
              </>
            ) : (
              <>
                Create trip and get the link
                <Icon name="arrow-right" className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );
}

/** The whole /create/new screen: bar, heading, form. */
export function NewTripScreen({
  defaultName,
  onCreated,
}: {
  defaultName?: string;
  onCreated?: (slug: string) => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-4 py-2 lg:px-8">
        <Link href="/create" className="btn btn-quiet btn-sm -ml-3">
          <Icon name="arrow-left" className="h-4 w-4" />
          My trips
        </Link>
        <ThemeToggle />
      </header>

      <main id="main" className="mx-auto w-full max-w-md flex-1 px-4 pt-6">
        <CreateTripForm defaultName={defaultName} onCreated={onCreated} />
      </main>
    </div>
  );
}
