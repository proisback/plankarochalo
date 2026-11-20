"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Member, Trip } from "@/lib/types";
import { stageInfo, stageProgress } from "@/lib/types";
import { formatRange } from "@/lib/dates";
import { friendlyError } from "@/lib/errors";
import { parseDestination, plural } from "@/lib/format";
import { Icon, Spinner } from "@/components/icons";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/app/theme-toggle";

type Load =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; trips: Trip[]; members: Member[] };

interface Row {
  trip: Trip;
  /** Stage, length, then locked dates and place once they exist. */
  facts: string[];
  /** Where the group stands on the current question. */
  standing: string;
  readyToLock: boolean;
}

function describe(trip: Trip, members: Member[]): Row {
  const stage = stageInfo(trip.status);
  const place = parseDestination(trip.locked_destination).name;
  const facts = [
    stage.doing,
    plural(trip.trip_days, "day"),
    formatRange(trip.locked_dates_start, trip.locked_dates_end),
    place,
  ].filter(Boolean);

  if (trip.status === "ready") {
    const going = members.filter((m) => m.status === "confirmed_in").length;
    const out = members.filter((m) => m.status === "confirmed_out").length;
    return { trip, facts, standing: `${going} in${out > 0 ? `, ${out} out` : ""}`, readyToLock: false };
  }
  if (members.length <= 1) {
    return { trip, facts, standing: "Only you so far. Send the link to the group.", readyToLock: false };
  }
  const progress = stageProgress(trip, members);
  if (progress.allJoinedAnswered) {
    // "Everyone" needs a known group size. Without one, it is only everyone so far.
    const standing =
      trip.expected_size != null && progress.notJoined === 0
        ? `Everyone has ${stage.asked}`
        : `All ${progress.total} who've joined so far have ${stage.asked}`;
    return { trip, facts, standing, readyToLock: true };
  }
  return { trip, facts, standing: `${progress.answered} of ${progress.total} have ${stage.asked}`, readyToLock: false };
}

function TripList({ rows }: { rows: Row[] }) {
  return (
    <ul className="panel divide-y divide-border overflow-hidden">
      {rows.map(({ trip, facts, standing, readyToLock }) => (
        <li key={trip.id}>
          <Link
            href={`/trip/${trip.slug}`}
            // The global focus ring sits outside the element, where this panel
            // would clip it. Important, because that rule is unlayered.
            className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-subtle focus-visible:-outline-offset-2!"
          >
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-xl font-bold leading-tight text-text [overflow-wrap:anywhere]">
                {trip.name}
              </h2>
              <p className="mt-1 font-mono text-xs leading-relaxed text-text-secondary">
                {facts.map((fact, i) => (
                  // A fact never breaks inside, and keeps its separator, so a
                  // wrapped line never starts with a dot. The space that may
                  // break sits outside the nowrap span.
                  <Fragment key={`${i}-${fact}`}>
                    <span className="whitespace-nowrap">
                      {fact}
                      {i < facts.length - 1 ? " ·" : ""}
                    </span>{" "}
                  </Fragment>
                ))}
              </p>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-secondary">
                {readyToLock && <span className="chip chip-wait">Ready to lock</span>}
                <span>{standing}</span>
              </p>
            </div>
            <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-text-tertiary" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * The organiser's home: every trip they started, most urgent first.
 * Trips they only joined are not here; those live at the shared link.
 */
export function MyTripsClient({ userId, signedInAs = "" }: { userId: string; signedInAs?: string }) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const latest = useRef(0);

  /** `quiet` refreshes what is on screen without a skeleton, and never replaces it with an error. */
  const fetchTrips = useCallback(
    async (quiet = false) => {
      const request = ++latest.current;
      if (!quiet) setLoad({ state: "loading" });
      try {
        const supabase = createClient();
        const { data: tripRows, error: tripsError } = await supabase
          .from("trips")
          .select("*")
          .eq("organizer_id", userId)
          .order("created_at", { ascending: false });
        if (tripsError) throw tripsError;
        const trips = (tripRows ?? []) as Trip[];

        let members: Member[] = [];
        if (trips.length > 0) {
          const { data: memberRows, error: membersError } = await supabase
            .from("members")
            .select("*")
            .in(
              "trip_id",
              trips.map((t) => t.id),
            );
          if (membersError) throw membersError;
          members = (memberRows ?? []) as Member[];
        }
        if (request === latest.current) setLoad({ state: "ready", trips, members });
      } catch (e) {
        if (request === latest.current && !quiet) {
          setLoad({
            state: "error",
            message: friendlyError(e, "We couldn't load your trips. Check your connection and try again."),
          });
        }
      }
    },
    [userId],
  );

  useEffect(() => {
    fetchTrips();
    // Coming back from the trip page or from WhatsApp: the counts have moved.
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchTrips(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      latest.current += 1;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchTrips]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError("");
    try {
      // This device only. The default would end the organiser's sessions everywhere.
      const { error } = await createClient().auth.signOut({ scope: "local" });
      if (error) throw error;
      // A full load, so nothing of this account stays in memory on a shared phone.
      window.location.assign("/");
    } catch (e) {
      setSignOutError(friendlyError(e, "We couldn't sign you out. Check your connection and try again."));
      setSigningOut(false);
    }
  }

  const rows =
    load.state === "ready"
      ? load.trips.map((trip) =>
          describe(
            trip,
            load.members.filter((m) => m.trip_id === trip.id),
          ),
        )
      : [];
  // Sorting is stable, so each group keeps the newest-first order of the query.
  const active = rows.filter((r) => r.trip.status !== "ready").sort((a, b) => Number(b.readyToLock) - Number(a.readyToLock));
  const confirmed = rows.filter((r) => r.trip.status === "ready");
  const empty = load.state === "ready" && rows.length === 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-2 px-4 py-2 lg:px-8">
        <Link href="/" aria-label="Plan Karo Chalo home">
          <Wordmark />
        </Link>
        <div className="flex items-center">
          <ThemeToggle />
          <button type="button" onClick={signOut} disabled={signingOut} className="btn btn-quiet btn-sm -mr-2">
            {signingOut ? <Spinner /> : <Icon name="logout" className="h-4 w-4" />}
            Sign out
          </button>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-6">
        {signOutError && (
          <p role="alert" className="notice notice-stop mb-5">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-status-out" />
            <span>{signOutError}</span>
          </p>
        )}

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            {signedInAs && (
              <p className={`label-mono truncate ${signedInAs.includes("@") ? "normal-case" : ""}`}>{signedInAs}</p>
            )}
            <h1 className="mt-1.5 font-heading text-[2.25rem] font-extrabold leading-[1.02] text-text">My trips</h1>
          </div>
          {load.state !== "loading" && !empty && (
            <Link href="/create/new" className="btn btn-primary shrink-0">
              <Icon name="plus" className="h-4 w-4" />
              Start a trip
            </Link>
          )}
        </div>

        <div className="mt-6">
          {load.state === "loading" && (
            <div className="panel divide-y divide-border" aria-busy="true" aria-label="Loading your trips">
              {[0, 1, 2].map((i) => (
                <div key={i} className="px-4 py-4">
                  <div className="skeleton h-5 w-2/5" />
                  <div className="skeleton mt-2.5 h-3 w-3/5" />
                  <div className="skeleton mt-2.5 h-3 w-1/3" />
                </div>
              ))}
            </div>
          )}

          {load.state === "error" && (
            <div role="alert" className="notice notice-stop">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-status-out" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Your trips didn&apos;t load.</p>
                <p className="mt-0.5 text-text-secondary">{load.message}</p>
                <button type="button" onClick={() => fetchTrips()} className="btn btn-outline btn-sm mt-3">
                  <Icon name="refresh" className="h-4 w-4" />
                  Try again
                </button>
              </div>
            </div>
          )}

          {empty && (
            <div className="animate-in border-t border-border-strong pt-6">
              <p className="label-mono">No trips yet</p>
              <h2 className="mt-2 max-w-md font-heading text-[1.75rem] font-extrabold leading-[1.05] text-text">
                Get the next one out of the group chat.
              </h2>
              <p className="mt-2 max-w-md text-[0.9375rem] text-text-secondary">
                Name the trip and share one link. Everyone taps the days they&apos;re free, and nobody else has to sign
                up.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                <Link href="/create/new" className="btn btn-primary btn-lg">
                  Start a trip
                  <Icon name="arrow-right" className="h-4 w-4" />
                </Link>
                <Link href="/demo" className="link inline-flex min-h-11 items-center text-sm">
                  See how it works first
                </Link>
              </div>
            </div>
          )}

          {load.state === "ready" && !empty && (
            <div className="space-y-6">
              {active.length > 0 && <TripList rows={active} />}
              {confirmed.length > 0 && (
                <section aria-label="Confirmed trips">
                  <p className="rule label-mono mb-3">Confirmed</p>
                  <TripList rows={confirmed} />
                </section>
              )}
            </div>
          )}
        </div>

        {load.state === "ready" && (
          <p className="mt-10 text-[0.8125rem] text-text-tertiary">
            Trips you joined as a friend live at the link you were sent.
          </p>
        )}
      </main>
    </div>
  );
}
