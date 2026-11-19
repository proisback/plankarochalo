"use client";

import { Suspense, useEffect, useState } from "react";
import { MyTripsClient } from "@/app/create/my-trips-client";
import { NewTripScreen } from "@/app/create/create-trip-form";
import { LoginForm } from "@/app/login/login-form";
import { getDemoClient, getDemoStore, resetDemoStore, type DemoStore } from "@/lib/demo/backend";
import { ORGANIZER_USER_ID, seedDemo } from "@/lib/demo/script";
import { addDays, todayKey } from "@/lib/dates";
import type { Member, Trip } from "@/lib/types";

export type PreviewScreen = "my-trips" | "my-trips-empty" | "my-trips-error" | "new-trip" | "login";

const ORGANISER_NAME = "Riya Kapoor";

/* ── Seed: one trip in every state the list has to show ────────── */

function addTrips(store: DemoStore) {
  const today = todayKey();
  const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

  const trip = (id: string, name: string, hours: number, patch: Partial<Trip>): Trip => ({
    id,
    name,
    slug: `${id}-preview`,
    organizer_id: ORGANIZER_USER_ID,
    status: "dates_open",
    budget: null,
    trip_days: 3,
    locked_dates_start: null,
    locked_dates_end: null,
    locked_destination: null,
    date_window_start: null,
    date_window_end: null,
    voting_deadline: "none",
    expected_size: null,
    created_at: ago(hours),
    updated_at: ago(hours),
    ...patch,
  });

  const person = (tripId: string, name: string, patch: Partial<Member> = {}): Member => ({
    id: `${tripId}-${name.toLowerCase()}`,
    trip_id: tripId,
    user_id: `preview-user-${name.toLowerCase()}`,
    name,
    is_organizer: false,
    status: "responded",
    availability_start: null,
    availability_end: null,
    destination_vote: null,
    constraint_note: null,
    constraint_start: null,
    constraint_end: null,
    budget_min: null,
    budget_max: null,
    is_proxy: false,
    created_at: ago(1),
    updated_at: ago(1),
    ...patch,
  });
  const riya = (tripId: string, patch: Partial<Member> = {}) =>
    person(tripId, "Riya", { user_id: ORGANIZER_USER_ID, is_organizer: true, ...patch });

  const coorgStart = addDays(today, 23);
  const jaipurStart = addDays(today, 40);
  const pondyStart = addDays(today, 9);
  const voted = { destination_vote: "preview-option" };

  store.tables.trips.push(
    // Everyone who joined has voted: ready to lock. Older than the next two on purpose.
    trip("coorg", "Coorg coffee weekend", 30, {
      status: "destination_open",
      trip_days: 2,
      locked_dates_start: coorgStart,
      locked_dates_end: addDays(coorgStart, 1),
      expected_size: 5,
    }),
    // Brand new: nobody else has opened the link.
    trip("offsite", "Team offsite recce", 2, { trip_days: 1 }),
    // Mid-commitment, with a grandparent the organiser answers for.
    trip("jaipur", "Diwali at Dadi's, Jaipur", 20, {
      status: "commitment",
      trip_days: 5,
      locked_dates_start: jaipurStart,
      locked_dates_end: addDays(jaipurStart, 4),
      locked_destination: "🏯 Jaipur",
      expected_size: 4,
    }),
    trip("pondy", "Pondicherry long weekend", 300, {
      status: "ready",
      locked_dates_start: pondyStart,
      locked_dates_end: addDays(pondyStart, 2),
      locked_destination: "🎡 Pondicherry",
      expected_size: 6,
    }),
  );

  store.tables.members.push(
    riya("coorg", voted),
    person("coorg", "Karthik", voted),
    person("coorg", "Meher", voted),
    person("coorg", "Zoya", voted),
    riya("offsite", { status: "invited" }),
    riya("jaipur", { status: "confirmed_in" }),
    person("jaipur", "Aditi", { status: "confirmed_in" }),
    person("jaipur", "Kabir"),
    person("jaipur", "Dadi", { user_id: null, is_proxy: true, status: "invited" }),
    riya("pondy", { status: "confirmed_in" }),
    person("pondy", "Karthik", { status: "confirmed_in" }),
    person("pondy", "Meher", { status: "confirmed_in" }),
    person("pondy", "Zoya", { status: "confirmed_in" }),
    person("pondy", "Aanya", { status: "confirmed_in" }),
    person("pondy", "Dev", { status: "confirmed_out" }),
  );
}

/* ── Failure injection (new-trip?fail=...) ─────────────────────── */

type Fault = { message: string; code?: string };
const OFFLINE: Fault = { message: "TypeError: Failed to fetch" };

/** Make one kind of insert fail the way the real database would. */
function injectFault(kind: string) {
  const client = getDemoClient();
  const from = client.from.bind(client);
  let armed = true;

  const failWith = (error: Fault) => {
    const result = { data: null, error };
    const query = {
      select: () => query,
      single: () => query,
      then: (ok: (value: typeof result) => unknown, bad?: (reason: unknown) => unknown) =>
        Promise.resolve(result).then(ok, bad),
    };
    return query as never;
  };

  client.from = ((table) => {
    const query = from(table);
    const insert = query.insert.bind(query);
    query.insert = ((rows) => {
      const first = (Array.isArray(rows) ? rows[0] : rows) ?? {};
      // An un-migrated database rejects the column every time, not once.
      if (kind === "size" && table === "trips" && "expected_size" in first) {
        return failWith({ code: "PGRST204", message: "Could not find the 'expected_size' column of 'trips' in the schema cache" });
      }
      const hit =
        (kind === "trip" && table === "trips") ||
        (kind === "slug" && table === "trips") ||
        (kind === "member" && table === "members" && first.is_organizer === true) ||
        (kind === "proxy" && table === "members" && first.is_proxy === true);
      if (armed && hit) {
        armed = false;
        return failWith(
          kind === "slug"
            ? { code: "23505", message: 'duplicate key value violates unique constraint "trips_slug_key"' }
            : OFFLINE,
        );
      }
      return insert(rows);
    }) as typeof query.insert;
    return query;
  }) as typeof client.from;
}

/** Reads throw for the first moments, as they do with no connection. */
function failReadsBriefly(store: DemoStore) {
  const rows = store.rows.bind(store);
  const until = Date.now() + 2500;
  store.rows = (table) => {
    if (Date.now() < until) throw new Error("TypeError: Failed to fetch");
    return rows(table);
  };
}

/**
 * A stand-in for "email me a link". The sign-in form can then be sent here
 * without a real request and without a real email going anywhere. What it was
 * asked for is kept on window.__pkcOtpCalls.
 */
function stubEmailLink(fail: boolean) {
  const calls: unknown[] = [];
  (window as unknown as { __pkcOtpCalls: unknown[] }).__pkcOtpCalls = calls;
  const auth = getDemoClient().auth as Record<string, unknown>;
  auth.signInWithOtp = async (request: unknown) => {
    calls.push(request);
    await new Promise((resolve) => setTimeout(resolve, 600));
    return fail
      ? { data: null, error: { message: "email rate limit exceeded", code: "over_email_send_rate_limit" } }
      : { data: {}, error: null };
  };
}

/* ── The preview ───────────────────────────────────────────────── */

export function PreviewClient({ screen }: { screen: PreviewScreen }) {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<"screen" | "created" | "list">("screen");
  const [slug, setSlug] = useState("");
  const [run, setRun] = useState(0);

  useEffect(() => {
    const store = resetDemoStore();
    if (screen !== "my-trips-empty") {
      seedDemo(store);
      addTrips(store);
    }
    // seedDemo signs the visitor in as a friend. These screens need the organiser.
    store.userId = ORGANIZER_USER_ID;
    if (screen === "my-trips-error") failReadsBriefly(store);
    const fault = new URLSearchParams(window.location.search).get("fail");
    if (screen === "new-trip" && fault) injectFault(fault);
    if (screen === "login") stubEmailLink(fault === "otp");
    setView("screen");
    setReady(true);
  }, [screen, run]);

  if (!ready) return <div className="min-h-dvh" aria-busy="true" />;

  if (screen === "login") {
    return (
      <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 pb-16 pt-6">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </main>
    );
  }

  if (view === "list" || screen !== "new-trip") {
    return <MyTripsClient key={run} userId={ORGANIZER_USER_ID} signedInAs={ORGANISER_NAME} />;
  }

  if (view === "created") {
    const store = getDemoStore();
    const trip = store.tables.trips.find((t) => t.slug === slug);
    const members = store.tables.members.filter((m) => m.trip_id === trip?.id);
    return (
      <main id="main" className="mx-auto w-full max-w-md px-4 py-10">
        <p className="label-mono">Preview only</p>
        <h1 className="mt-2 font-heading text-[2rem] font-extrabold leading-[1.05] text-text">Trip created.</h1>
        <p className="mt-3 text-[0.9375rem] text-text-secondary">
          The real app opens <span className="font-mono text-text [overflow-wrap:anywhere]">/trip/{slug}</span> now. Here
          nothing was saved: these rows only exist in this tab.
        </p>
        <pre
          data-testid="created-rows"
          className="panel mt-5 max-h-[50dvh] overflow-auto p-3 font-mono text-xs leading-relaxed text-text-secondary"
        >
          {JSON.stringify({ trip, members }, null, 2)}
        </pre>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => setView("list")} className="btn btn-primary">
            See it in My trips
          </button>
          <button type="button" onClick={() => setRun((n) => n + 1)} className="btn btn-outline">
            Start over
          </button>
        </div>
      </main>
    );
  }

  return (
    <NewTripScreen
      key={run}
      defaultName={ORGANISER_NAME}
      onCreated={(created) => {
        setSlug(created);
        setView("created");
      }}
    />
  );
}
