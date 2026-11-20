"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Member, Trip, TripStatus } from "@/lib/types";
import { findOrganiser } from "@/lib/types";
import { formatRange } from "@/lib/dates";
import { UserFacingError, friendlyError } from "@/lib/errors";
import { firstName, parseDestination, people, plural } from "@/lib/format";
import { Icon, Spinner, WhatsAppIcon } from "@/components/icons";
import { Wordmark } from "@/components/brand";
import { Sheet } from "@/components/sheet";
import { ThemeToggle } from "@/app/theme-toggle";
import { JoinScreen } from "./join-prompt";
import { RouteLine } from "./route-line";
import { ShareButton, ShareLink } from "./share-link";
import { SinceYouLeft } from "./since-you-left";
import { DatesStage } from "./stages/dates-stage";
import { DestinationStage } from "./stages/destination-stage";
import { CommitmentStage } from "./stages/commitment-stage";
import { ReadyStage } from "./stages/ready-stage";

type Phase = "loading" | "error" | "join" | "trip";

const LATE_NOTE = "Can't make locked dates";

/* ── Loading skeleton: same shape as the page it becomes ───────── */

function TripSkeleton() {
  return (
    <div className="min-h-dvh" aria-busy="true" aria-label="Loading trip">
      <div className="flex items-center justify-between px-4 py-2 lg:px-8">
        <div className="skeleton h-7 w-40" />
        <div className="skeleton h-9 w-9" />
      </div>
      <div className="mx-auto w-full max-w-[1040px] px-4 pt-5 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-12 lg:px-8 lg:pt-10">
        <div>
          <div className="skeleton h-3 w-32" />
          <div className="skeleton mt-3 h-9 w-4/5" />
          <div className="skeleton mt-6 h-12 w-full" />
        </div>
        <div className="mt-8 max-w-[560px] space-y-4 lg:mt-0">
          <div className="skeleton h-6 w-3/5" />
          <div className="skeleton h-72 w-full" />
          <div className="skeleton h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

/* ── Organiser: tell the group what just got locked ────────────── */

function LockAnnouncement({ trip, url, demo }: { trip: Trip; url: string; demo?: boolean }) {
  const key = `pkc_told_${trip.id}_${trip.status}_${trip.locked_dates_start ?? ""}_${trip.locked_destination ?? ""}`;
  const [show, setShow] = useState(false);

  useEffect(() => {
    // The demo trip is rebuilt on every visit, so nothing about it is remembered.
    if (demo) {
      setShow(true);
      return;
    }
    try {
      setShow(localStorage.getItem(key) !== "1");
    } catch {
      setShow(true);
    }
  }, [key, demo]);

  if (!show || !url || trip.status === "dates_open" || trip.status === "ready") return null;

  const range = formatRange(trip.locked_dates_start, trip.locked_dates_end);
  const place = parseDestination(trip.locked_destination).name;
  const copy =
    trip.status === "destination_open"
      ? { title: `Dates locked: ${range}.`, text: `${trip.name}: dates are locked, ${range}. Next: vote on where we go.` }
      : { title: `It's ${place}, ${range}.`, text: `${trip.name}: it's ${place}, ${range}. Last step: say if you're in.` };

  function dismiss() {
    setShow(false);
    if (demo) return;
    try {
      localStorage.setItem(key, "1");
    } catch {
      // Not remembered across visits. Fine.
    }
  }

  return (
    <div className="notice notice-go animate-in">
      <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0 text-status-confirmed" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{copy.title}</p>
        <p className="mt-0.5 text-text-secondary">
          Nobody gets a notification. Tell the group so they come back for the next step.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${copy.text}\n${url}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            className="btn btn-whatsapp btn-sm"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Tell the group
          </a>
          <button type="button" onClick={dismiss} className="btn btn-quiet btn-sm">
            Already did
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Organiser: undo a lock ────────────────────────────────────── */

const REOPEN: Partial<Record<TripStatus, { label: string; title: string; body: string }>> = {
  destination_open: {
    label: "Reopen dates",
    title: "Reopen dates?",
    body: "The locked dates are cleared and everyone can change their days again. Votes on the place are kept. After a reopen, stages no longer lock by themselves: you lock when you are ready.",
  },
  commitment: {
    label: "Reopen the vote",
    title: "Reopen the vote on the place?",
    body: "The locked place is cleared and voting opens again. Anyone who already said in or out will be asked again. After a reopen, stages no longer lock by themselves: you lock when you are ready.",
  },
  ready: {
    label: "Reopen commitments",
    title: "Reopen commitments?",
    body: "The trip goes back one step so people can change whether they are in. Dates and place stay locked.",
  },
};

function OrganiserTools({ trip, onDone }: { trip: Trip; onDone: () => Promise<void> }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const config = REOPEN[trip.status];
  if (!config) return null;

  async function reopen() {
    setBusy(true);
    setError("");
    try {
      const back: Record<string, unknown> =
        trip.status === "destination_open"
          ? { status: "dates_open", locked_dates_start: null, locked_dates_end: null }
          : trip.status === "commitment"
            ? { status: "destination_open", locked_destination: null }
            : { status: "commitment" };
      // A reopened trip is locked by hand. With the group size still set, the
      // first person to save would lock the stage again straight away.
      if (trip.expected_size != null) back.expected_size = null;

      // Move the trip first, guarded on the stage this screen is showing. If
      // that fails, or the trip has already moved, nothing else is touched.
      const { data, error: e } = await supabase
        .from("trips")
        .update(back)
        .eq("id", trip.id)
        .eq("status", trip.status)
        .select("id");
      if (e) throw e;
      if (!data || data.length === 0) {
        await onDone();
        throw new UserFacingError("This trip has already moved on. The page has been refreshed.");
      }

      if (trip.status === "commitment") {
        for (const status of ["confirmed_in", "confirmed_out"]) {
          const { error: memberError } = await supabase
            .from("members")
            .update({ status: "responded" })
            .eq("trip_id", trip.id)
            .eq("status", status);
          if (memberError) throw memberError;
        }
      }
      await onDone();
      setOpen(false);
    } catch (e) {
      setError(friendlyError(e, "Couldn't reopen. Check your connection and try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-border pt-4">
      <p className="label-mono">Organiser tools</p>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-quiet btn-sm -ml-3 mt-1">
        <Icon name="refresh" className="h-4 w-4" />
        {config.label}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={config.title} description={config.body} dismissible={!busy}>
        {error && (
          <p role="alert" className="notice notice-stop mb-4">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setOpen(false)} disabled={busy} className="btn btn-outline">
            Keep it locked
          </button>
          <button type="button" onClick={reopen} disabled={busy} className="btn btn-primary" data-autofocus>
            {busy ? <Spinner /> : null}
            {config.label}
          </button>
        </div>
      </Sheet>
    </div>
  );
}

/* ── The trip page ─────────────────────────────────────────────── */

export function TripDashboard({ trip: initialTrip, demo = false }: { trip: Trip; demo?: boolean }) {
  const supabase = createClient();
  const [trip, setTrip] = useState(initialTrip);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [connectError, setConnectError] = useState("");
  const [url, setUrl] = useState("");
  const userIdRef = useRef<string | null>(null);

  // Organiser rights come from owning the trip row, which the database enforces,
  // not from a flag on the member row.
  const isOrganizer = !!currentMember && !!currentMember.user_id && currentMember.user_id === trip.organizer_id;

  useEffect(() => {
    setUrl(`${window.location.origin}${demo ? "/demo" : `/trip/${trip.slug}`}`);
  }, [demo, trip.slug]);

  const loadMembers = useCallback(async () => {
    const { data } = await supabase
      .from("members")
      .select("*")
      .eq("trip_id", trip.id)
      .order("created_at", { ascending: true });
    if (!data) return;
    const rows = data as Member[];
    setMembers(rows);
    const me = rows.find((m) => m.user_id && m.user_id === userIdRef.current);
    if (me) {
      setCurrentMember(me);
    } else if (userIdRef.current) {
      // The organiser removed this person or took over their entry. Their old
      // row is gone, so saves would silently do nothing. Back to the join screen.
      setCurrentMember(null);
      setPhase((p) => (p === "trip" ? "join" : p));
    }
  }, [supabase, trip.id]);

  const loadTrip = useCallback(async () => {
    const { data } = await supabase.from("trips").select("*").eq("id", trip.id).maybeSingle();
    if (data) setTrip(data as Trip);
  }, [supabase, trip.id]);

  const refresh = useCallback(async () => {
    await Promise.all([loadTrip(), loadMembers()]);
  }, [loadTrip, loadMembers]);

  const connect = useCallback(async () => {
    setPhase("loading");
    setConnectError("");
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      // "No session" is normal on a first visit. Anything else (offline, a
      // timeout) must not be mistaken for it, or a returning member would be
      // shown the join screen.
      if (authError && authError.name !== "AuthSessionMissingError") throw authError;

      // A first-time visitor has no session yet. They get one when they submit
      // their name, not for merely opening the link.
      if (!user) {
        setPhase("join");
        return;
      }
      userIdRef.current = user.id;

      const { data: existing, error } = await supabase
        .from("members")
        .select("*")
        .eq("trip_id", trip.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;

      if (existing) {
        setCurrentMember(existing as Member);
        await loadMembers();
        setPhase("trip");
      } else {
        setPhase("join");
      }
    } catch (e) {
      setConnectError(friendlyError(e, "We couldn't open this trip. Check your connection and try again."));
      setPhase("error");
    }
  }, [supabase, trip.id, loadMembers]);

  useEffect(() => {
    connect();
  }, [connect]);

  // Live updates once you are a member. Refetching on focus covers a phone
  // that slept and missed events.
  useEffect(() => {
    if (phase !== "trip") return;
    const channel = supabase
      .channel(`trip-${trip.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "trips", filter: `id=eq.${trip.id}` }, (payload) =>
        setTrip((prev) => ({ ...prev, ...(payload.new as Trip) })),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "members", filter: `trip_id=eq.${trip.id}` }, () =>
        loadMembers(),
      )
      // Supabase cannot filter delete events by column, so listen for all of them.
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "members" }, () => loadMembers())
      // Anything that changed between the first fetch and the socket opening.
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refresh();
      });

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [supabase, trip.id, phase, loadMembers, refresh]);

  async function handleJoined(member: Member) {
    userIdRef.current = member.user_id;
    setCurrentMember(member);
    await refresh();
    setPhase("trip");
  }

  if (phase === "loading") return <TripSkeleton />;

  if (phase === "error") {
    return (
      <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
        <p className="label-mono">Signal failure</p>
        <h1 className="mt-2 font-heading text-3xl font-extrabold text-text">This trip didn&apos;t load.</h1>
        <p className="mt-2 text-text-secondary">{connectError}</p>
        <button type="button" onClick={connect} className="btn btn-primary btn-lg mt-6 self-start">
          <Icon name="refresh" className="h-4 w-4" />
          Try again
        </button>
      </main>
    );
  }

  if (phase === "join" || !currentMember) {
    return <JoinScreen trip={trip} onJoined={handleJoined} demo={demo} />;
  }

  const organiser = findOrganiser(trip, members);
  const confirmed = trip.status === "ready";
  const cannotMakeDates =
    trip.status !== "dates_open" ? members.filter((m) => m.constraint_note?.startsWith(LATE_NOTE)) : [];
  const stageProps = { trip, members, currentMember, isOrganizer, onMembersUpdated: refresh, demo };

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1040px] items-center justify-between gap-2 px-4 py-1.5 lg:px-8">
          {demo ? (
            <Link href="/" className="btn btn-quiet btn-sm -ml-3">
              <Icon name="arrow-left" className="h-4 w-4" />
              Exit demo
            </Link>
          ) : isOrganizer ? (
            <Link href="/create" className="btn btn-quiet btn-sm -ml-3">
              <Icon name="arrow-left" className="h-4 w-4" />
              My trips
            </Link>
          ) : (
            <Link href="/" aria-label="Plan Karo Chalo home">
              <Wordmark />
            </Link>
          )}
          <div className="flex items-center gap-1">
            {trip.status !== "ready" && <ShareButton slug={trip.slug} demo={demo} />}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main
        id="main"
        className="mx-auto w-full max-w-[1040px] px-4 pb-16 pt-5 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-12 lg:px-8 lg:pt-10"
      >
        {/* Once the trip is confirmed the ticket carries the name, the dates and the
            place. On a phone, repeating them here pushed the ticket off the first screen. */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <p className={`label-mono ${confirmed ? "hidden lg:block" : ""}`}>
            {plural(trip.trip_days, "day")} · {people(members.length)}
            {organiser && !isOrganizer ? ` · by ${firstName(organiser.name)}` : ""}
          </p>
          <h1
            className={`mt-1.5 font-heading text-[1.75rem] font-extrabold leading-[1.05] text-text lg:text-[2.25rem] ${
              confirmed ? "sr-only lg:not-sr-only" : ""
            }`}
          >
            {trip.name}
          </h1>
          <div className={`mt-5 ${confirmed ? "hidden lg:block" : ""}`}>
            <RouteLine trip={trip} members={members} />
          </div>
          {isOrganizer && (
            <div className="mt-8 hidden space-y-6 lg:block">
              {trip.status !== "ready" && <ShareLink slug={trip.slug} tripName={trip.name} demo={demo} />}
              <OrganiserTools trip={trip} onDone={refresh} />
            </div>
          )}
        </aside>

        <div className={`max-w-[560px] space-y-5 lg:mt-0 ${confirmed ? "" : "mt-7"}`}>
          {isOrganizer && <LockAnnouncement trip={trip} url={url} demo={demo} />}

          {isOrganizer && cannotMakeDates.length > 0 && (
            <div className="notice notice-wait">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-status-waiting" />
              <p>
                <span className="font-semibold">
                  {cannotMakeDates.map((m) => firstName(m.name)).join(", ")} can&apos;t make{" "}
                  {formatRange(trip.locked_dates_start, trip.locked_dates_end)}.
                </span>{" "}
                They joined after the dates were locked. Keep going, or reopen dates from Organiser tools.
              </p>
            </div>
          )}

          <SinceYouLeft trip={trip} members={members} currentMember={currentMember} />

          {/* A new trip's first job is getting people in. */}
          {isOrganizer && trip.status !== "ready" && members.length <= 1 && (
            <div className="lg:hidden">
              <ShareLink slug={trip.slug} tripName={trip.name} demo={demo} />
            </div>
          )}

          {trip.status === "dates_open" && <DatesStage {...stageProps} />}
          {trip.status === "destination_open" && <DestinationStage {...stageProps} />}
          {trip.status === "commitment" && <CommitmentStage {...stageProps} />}
          {trip.status === "ready" && <ReadyStage {...stageProps} />}

          {isOrganizer && (
            <div className="space-y-6 pt-4 lg:hidden">
              {trip.status !== "ready" && members.length > 1 && (
                <ShareLink slug={trip.slug} tripName={trip.name} demo={demo} />
              )}
              <OrganiserTools trip={trip} onDone={refresh} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
