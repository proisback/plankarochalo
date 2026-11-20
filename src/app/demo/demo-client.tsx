"use client";

import { useEffect, useState } from "react";
import { TripDashboard } from "@/app/trip/[slug]/trip-dashboard";
import { getDemoStore, resetDemoStore } from "@/lib/demo/backend";
import {
  DemoDirector,
  ORGANIZER_USER_ID,
  VISITOR_USER_ID,
  fastForward,
  seedDemo,
  type DemoEvent,
} from "@/lib/demo/script";
import type { Trip } from "@/lib/types";
import { hasAnswered } from "@/lib/types";
import { Icon } from "@/components/icons";

type Role = "friend" | "organiser";
const STAGES: Trip["status"][] = ["dates_open", "destination_open", "commitment", "ready"];

interface Snapshot {
  status: Trip["status"];
  joined: boolean;
  answered: boolean;
}

/** One line telling a first-time visitor what is going on and what to do. */
function guideText(role: Role, snap: Snapshot | null): string {
  if (!snap) return "Loading the trip.";
  if (role === "organiser") {
    if (snap.status === "ready") return "You are Riya, the organiser. The trip is confirmed.";
    return "You are Riya, the organiser. You can nudge people, answer for someone, and lock a stage without waiting.";
  }
  if (!snap.joined) return "Riya just dropped this link in the group chat. Type any name to join.";
  switch (snap.status) {
    case "dates_open":
      return snap.answered
        ? "Saved. Dev always answers last. When he does, the dates lock by themselves."
        : "Tap a few days and save. Watch the calendar: Zoya is about to answer too.";
    case "destination_open":
      return snap.answered
        ? "Voted. Dev is last again, and his vote settles it."
        : "Your friends are voting live, and it is heading for a 2-2 tie. Cast yours.";
    case "commitment":
      return snap.answered ? "Done. One friend is about to drop out, as one always does." : "Hold the button for two seconds.";
    default:
      return "That is the whole product: one ticket, sent back to the group.";
  }
}

/**
 * The live demo: the real trip screens, an in-memory trip, and five scripted
 * friends. Query parameters exist so any state can be opened directly:
 *   ?stage=destination_open  jump ahead, already joined
 *   ?joined=1                stay on Dates, already joined
 *   ?settled=1               friends have already answered that stage
 *   ?as=organiser            see the organiser's controls
 *   ?still=1                 freeze the friends (for screenshots)
 */
export function DemoClient() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [role, setRole] = useState<Role>("friend");
  const [run, setRun] = useState(0);
  const [toast, setToast] = useState<DemoEvent | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const store = resetDemoStore();
    seedDemo(store);

    const stage = q.get("stage") as Trip["status"] | null;
    if (run === 0 && stage && STAGES.includes(stage)) {
      fastForward(store, stage, { visitorName: q.get("name") ?? "Aanya", settled: q.get("settled") === "1" });
    } else if (run === 0 && q.get("joined") === "1") {
      fastForward(store, "dates_open", { visitorName: q.get("name") ?? "Aanya", settled: q.get("settled") === "1" });
    }
    const startAs: Role = run === 0 && q.get("as") === "organiser" ? "organiser" : "friend";
    store.userId = startAs === "organiser" ? ORGANIZER_USER_ID : VISITOR_USER_ID;
    setRole(startAs);

    const read = () => {
      const current = store.tables.trips[0];
      const visitor = store.tables.members.find((m) => m.user_id === VISITOR_USER_ID);
      setSnap({
        status: current.status,
        joined: !!visitor,
        answered: !!visitor && hasAnswered(visitor, current.status),
      });
    };
    read();
    const unsubscribe = store.subscribe(read);

    const director = new DemoDirector(store, (event) => setToast(event));
    if (q.get("still") !== "1") director.start();
    setTrip({ ...store.tables.trips[0] });
    return () => {
      director.stop();
      unsubscribe();
    };
  }, [run]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(t);
  }, [toast]);

  function switchRole(next: Role) {
    if (next === role || !trip) return;
    // Same trip, different pair of eyes. The dashboard is keyed on the role,
    // so it remounts and re-reads who it is signed in as.
    const store = getDemoStore();
    store.userId = next === "organiser" ? ORGANIZER_USER_ID : VISITOR_USER_ID;
    setTrip({ ...store.tables.trips[0] });
    setRole(next);
  }

  if (!trip) return <div className="min-h-dvh" aria-busy="true" />;

  const step = snap ? Math.min(STAGES.indexOf(snap.status) + 1, 4) : 1;

  return (
    <>
      <div data-demo-bar className="border-b border-ink bg-ink text-paper">
        <div className="mx-auto max-w-[1040px] px-4 py-2 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <span className="chip chip-brand shrink-0">Demo {step}/4</span>
            <p className="hidden min-w-0 flex-1 text-[0.875rem] leading-snug text-paper/85 md:block">
              {guideText(role, snap)}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <div className="flex rounded-xl border border-paper/25 p-0.5" role="group" aria-label="View the trip as">
                {(["friend", "organiser"] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => switchRole(r)}
                    aria-pressed={role === r}
                    className={[
                      "min-h-8 rounded-lg px-2.5 font-mono text-[0.6875rem] font-semibold uppercase tracking-wider transition-colors",
                      role === r ? "bg-brand text-on-brand" : "text-paper/75 hover:text-paper",
                    ].join(" ")}
                  >
                    {r === "friend" ? "Friend" : "Organiser"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  window.history.replaceState(null, "", "/demo");
                  // Take the dashboard down first. Otherwise the new one mounts
                  // against the old trip before the effect has re-seeded.
                  setTrip(null);
                  setSnap(null);
                  setToast(null);
                  setRun((n) => n + 1);
                }}
                aria-label="Restart the demo"
                title="Restart the demo"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-paper/75 hover:text-paper"
              >
                <Icon name="refresh" className="h-4 w-4" />
              </button>
            </div>
          </div>
          {/* On phones the guide gets its own line under the controls. */}
          <p className="mt-1.5 text-[0.8125rem] leading-snug text-paper/85 md:hidden" aria-live="polite">
            {guideText(role, snap)}
          </p>
        </div>
      </div>

      <TripDashboard key={`${run}-${role}`} trip={trip} demo />

      {/* What the simulated friends just did. Below the sticky header, clear of the save bar. */}
      <div className="pointer-events-none fixed inset-x-0 top-[4.25rem] z-40 flex justify-center px-4" aria-live="polite">
        {toast && (
          <p
            key={toast.id}
            className="animate-in flex items-center gap-2 rounded-xl border border-paper/20 bg-ink px-3 py-2 text-sm text-paper shadow-lg"
          >
            <span className="avatar avatar-sm bg-brand text-on-brand">{toast.who.charAt(0)}</span>
            <span>
              <span className="font-semibold">{toast.who}</span> {toast.text}
            </span>
          </p>
        )}
      </div>
    </>
  );
}
