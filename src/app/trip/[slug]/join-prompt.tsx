"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Member, Trip } from "@/lib/types";
import { formatRange } from "@/lib/dates";
import { friendlyError } from "@/lib/errors";
import { firstName, parseDestination, plural } from "@/lib/format";
import { Icon, Spinner } from "@/components/icons";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/app/theme-toggle";

interface Preview {
  organizer_name: string | null;
  member_count: number;
  names: string[];
}

const STEPS = ["Tap the days you're free", "Vote on a place", "Hold to commit", "Get the ticket"];

/**
 * What a friend sees when they tap the link in the group chat.
 * One field, one button. Who is asking and what for comes first, the
 * explanation of the product comes after the action.
 */
export function JoinScreen({
  trip,
  onJoined,
  demo,
}: {
  trip: Trip;
  onJoined: (member: Member) => void;
  demo?: boolean;
}) {
  const supabase = createClient();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [name, setName] = useState("");
  const [step, setStep] = useState<"name" | "date_check">("name");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const nameId = useId();
  const errorId = useId();

  const pastDates = trip.status !== "dates_open";
  const lockedDates = formatRange(trip.locked_dates_start, trip.locked_dates_end);
  const destination = parseDestination(trip.locked_destination).name;
  const trimmed = name.trim().replace(/\s+/g, " ");
  const nameError = touched && !trimmed ? "Type a name so the group knows it's you." : "";
  const sameName =
    trimmed && preview?.names.some((n) => n.toLowerCase() === firstName(trimmed).toLowerCase())
      ? `There's already a ${firstName(trimmed)} on this trip. If that's not you, add a surname or initial.`
      : "";

  // Who is asking and who is already in. Needs the trip_preview database
  // function; without it the screen simply shows less.
  useEffect(() => {
    let cancelled = false;
    supabase.rpc("trip_preview", { p_slug: trip.slug }).then(({ data, error: rpcError }) => {
      if (!cancelled && !rpcError && data) setPreview(data as Preview);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, trip.slug]);

  async function join(datesWork: boolean | null) {
    setLoading(true);
    setError("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        const { error: anonError } = await supabase.auth.signInAnonymously();
        if (anonError) throw anonError;
      }

      const { data, error: rpcError } = await supabase.rpc("join_trip", { p_trip_id: trip.id, p_name: trimmed });
      if (rpcError) throw rpcError;
      const member = data as Member;

      // join_trip returns the existing row for someone who had already joined.
      // Only a brand-new row gets the late-joiner answer written, or it would
      // overwrite the dates and the in/out a returning member already gave.
      const fresh = member.status === "invited" && !member.availability_start && !member.constraint_note;
      if (fresh && pastDates && datesWork !== null && trip.locked_dates_start && trip.locked_dates_end) {
        const patch = datesWork
          ? { availability_start: trip.locked_dates_start, availability_end: trip.locked_dates_end, status: "responded" }
          : { constraint_note: `Can't make locked dates ${lockedDates}`, status: "responded" };
        const { error: patchError } = await supabase.from("members").update(patch).eq("id", member.id);
        if (patchError) throw patchError;
        Object.assign(member, patch);
      }
      onJoined(member);
    } catch (e) {
      setError(friendlyError(e, "Couldn't add you to the trip. Check your connection and try again."));
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!trimmed) return;
    if (pastDates && trip.locked_dates_start) setStep("date_check");
    else join(null);
  }

  const organiser = preview?.organizer_name ? firstName(preview.organizer_name) : null;
  const ask = !pastDates
    ? "needs the days you're free"
    : trip.status === "destination_open"
      ? "needs your vote on where to go"
      : trip.status === "commitment"
        ? "needs to know if you're in"
        : "has a confirmed plan";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-4 py-2 lg:px-8">
        <Link href="/" aria-label="Plan Karo Chalo home">
          <Wordmark />
        </Link>
        <ThemeToggle />
      </header>

      <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-16 pt-8 sm:justify-center sm:pt-6">
        {step === "name" ? (
          <div className="stagger">
            <p className="label-mono">
              {organiser ? `${organiser} ${ask}` : "You're invited"} · {plural(trip.trip_days, "day")}
            </p>
            <h1 className="mt-2 font-heading text-[2.25rem] font-extrabold leading-[1.02] text-text">{trip.name}</h1>

            {pastDates && lockedDates && (
              <p className="mt-3 text-[0.9375rem] text-text-secondary">
                Dates are locked: <span className="font-semibold text-text">{lockedDates}</span>
                {destination ? (
                  <>
                    {" "}
                    in <span className="font-semibold text-text">{destination}</span>
                  </>
                ) : null}
                .
              </p>
            )}

            {preview && preview.names.length > 0 && (
              <div className="mt-5 flex items-center gap-3">
                <div className="flex -space-x-1.5">
                  {preview.names.slice(0, 5).map((n, i) => (
                    <span key={`${n}-${i}`} className="avatar ring-2 ring-background">
                      {n.charAt(0)}
                    </span>
                  ))}
                  <span
                    className="avatar ring-2 ring-background border border-dashed border-border-strong bg-background text-text-tertiary"
                    aria-hidden="true"
                  >
                    ?
                  </span>
                </div>
                <p className="text-sm text-text-secondary">
                  {preview.names.slice(0, 3).join(", ")}
                  {preview.member_count > 3 ? ` and ${preview.member_count - 3} more` : ""}{" "}
                  {preview.member_count === 1 ? "is" : "are"} in. You&apos;re next.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="mt-7">
              <label htmlFor={nameId} className="field-label">
                Your name
              </label>
              <input
                id={nameId}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="What the group calls you"
                maxLength={40}
                autoComplete="given-name"
                autoCapitalize="words"
                enterKeyHint="go"
                aria-invalid={!!nameError}
                aria-describedby={nameError || sameName ? errorId : undefined}
                className="field"
              />
              {nameError ? (
                <p id={errorId} className="field-error">
                  {nameError}
                </p>
              ) : sameName ? (
                <p id={errorId} className="field-hint">
                  {sameName}
                </p>
              ) : null}

              {error && (
                <p role="alert" className="notice notice-stop mt-3">
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-block mt-4">
                {loading ? (
                  <>
                    <Spinner /> Adding you
                  </>
                ) : (
                  <>
                    {pastDates ? "Join the trip" : "Add my dates"}
                    <Icon name="arrow-right" className="h-4 w-4" />
                  </>
                )}
              </button>
              <p className="mt-3 text-center text-[0.8125rem] text-text-tertiary">
                No account, no app, no password.
                {!pastDates && " Saying when you're free doesn't commit you."}
              </p>
            </form>

            <ol className="mt-10 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-5">
              {STEPS.map((s, i) => (
                <li key={s} className="flex items-baseline gap-2 text-sm text-text-secondary">
                  <span className="font-mono text-[0.6875rem] font-semibold text-text-tertiary">0{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>

            {!demo && (
              <p className="mt-8 text-center text-[0.8125rem] text-text-tertiary">
                Organising this trip?{" "}
                <Link href={`/login?next=${encodeURIComponent(`/trip/${trip.slug}`)}`} className="link">
                  Sign in
                </Link>
              </p>
            )}
          </div>
        ) : (
          <div className="animate-in">
            <p className="label-mono">Hi {firstName(trimmed)}. One question first.</p>
            <h1 className="mt-2 font-heading text-[2rem] font-extrabold leading-[1.05] text-text">
              The group already locked the dates.
            </h1>

            <div className="panel mt-5 p-4">
              <p className="ticket-key">Dates</p>
              <p className="display mt-1 text-4xl text-text">{lockedDates}</p>
              <p className="mt-1 font-mono text-xs text-text-tertiary">
                {plural(trip.trip_days, "day")}
                {destination ? ` · ${destination}` : ""}
              </p>
            </div>

            {error && (
              <p role="alert" className="notice notice-stop mt-4">
                {error}
              </p>
            )}

            <div className="mt-5 space-y-2">
              <button type="button" onClick={() => join(true)} disabled={loading} className="btn btn-primary btn-lg btn-block">
                {loading ? <Spinner /> : <Icon name="check" className="h-4 w-4" />}
                These dates work
              </button>
              <button type="button" onClick={() => join(false)} disabled={loading} className="btn btn-outline btn-block">
                I can&apos;t make these dates
              </button>
            </div>
            <p className="mt-3 text-center text-[0.8125rem] text-text-tertiary">
              Either way you join the trip. If the dates don&apos;t work, {organiser ?? "the organiser"} is told.
            </p>

            <button
              type="button"
              onClick={() => {
                setStep("name");
                setError("");
              }}
              disabled={loading}
              className="btn btn-quiet btn-sm mx-auto mt-6 flex"
            >
              <Icon name="arrow-left" className="h-4 w-4" />
              Change name
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
