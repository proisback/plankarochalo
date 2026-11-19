import type { Member, Trip, TripStatus } from "@/lib/types";
import { STAGES } from "@/lib/types";
import { formatRange } from "@/lib/dates";
import { parseDestination, plural } from "@/lib/format";
import { Icon } from "@/components/icons";

type StationState = "passed" | "here" | "ahead";

function stationValue(key: TripStatus, trip: Trip, members: Member[]): string | null {
  if (key === "dates_open" && trip.locked_dates_start && trip.locked_dates_end) {
    return formatRange(trip.locked_dates_start, trip.locked_dates_end);
  }
  if (key === "destination_open" && trip.locked_destination) {
    return parseDestination(trip.locked_destination).name;
  }
  if (key === "commitment" && trip.status === "ready") {
    return `${members.filter((m) => m.status === "confirmed_in").length} going`;
  }
  return null;
}

function Dot({ state }: { state: StationState }) {
  if (state === "passed") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-on-primary">
        <Icon name="check" className="h-3 w-3" strokeWidth={3} />
      </span>
    );
  }
  if (state === "here") {
    return (
      <span className="relative flex h-5 w-5 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-brand opacity-60 animate-pulse-soft" aria-hidden="true" />
        <span className="relative h-5 w-5 rounded-full border-2 border-ink bg-brand" />
      </span>
    );
  }
  return <span className="h-5 w-5 rounded-full border-2 border-border bg-background" />;
}

/**
 * The trip as a railway line: four stations, the train is at one of them.
 * Stations already passed show what was decided there, so this doubles as the
 * trip summary. Horizontal on phones, vertical in the desktop side rail.
 */
export function RouteLine({ trip, members }: { trip: Trip; members: Member[] }) {
  const currentIndex = STAGES.findIndex((s) => s.key === trip.status);
  const stations = STAGES.map((s, i) => {
    const done = trip.status === "ready" || i < currentIndex;
    const state: StationState = done ? "passed" : i === currentIndex ? "here" : "ahead";
    return { ...s, state, value: stationValue(s.key, trip, members) };
  });
  const summary = `Step ${Math.min(currentIndex + 1, 4)} of 4: ${STAGES[currentIndex]?.label}. ${plural(
    stations.filter((s) => s.state === "passed").length,
    "stage",
  )} done.`;

  return (
    <nav aria-label="Trip progress">
      <p className="sr-only">{summary}</p>

      {/* Phone: horizontal line */}
      <ol className="grid grid-cols-[1fr_1fr_1fr_auto] lg:hidden" aria-hidden="true">
        {stations.map((s, i) => {
          const last = i === stations.length - 1;
          return (
            <li key={s.key} className={last ? "text-right" : "min-w-0"}>
              <div className="flex items-center">
                <Dot state={s.state} />
                {!last && (
                  <span
                    className={[
                      "mx-1 h-0.5 flex-1",
                      s.state === "passed" ? "bg-primary" : "sleepers",
                    ].join(" ")}
                  />
                )}
              </div>
              <p
                className={[
                  "mt-2 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.08em]",
                  s.state === "ahead" ? "text-text-tertiary" : "text-text",
                ].join(" ")}
              >
                {s.label}
              </p>
              {s.value && (
                <p className="mt-0.5 pr-2 text-[0.8125rem] font-semibold leading-tight text-text-secondary">{s.value}</p>
              )}
            </li>
          );
        })}
      </ol>

      {/* Desktop rail: vertical line */}
      <ol className="hidden lg:block" aria-hidden="true">
        {stations.map((s, i) => {
          const last = i === stations.length - 1;
          return (
            <li key={s.key} className="relative flex gap-3 pb-6 last:pb-0">
              {!last && (
                <span
                  className={[
                    "absolute left-[9px] top-6 bottom-0 w-0.5",
                    s.state === "passed" ? "bg-primary" : "bg-border",
                  ].join(" ")}
                />
              )}
              <Dot state={s.state} />
              <div className="-mt-0.5 min-w-0">
                <p
                  className={[
                    "font-mono text-xs font-semibold uppercase tracking-[0.08em]",
                    s.state === "ahead" ? "text-text-tertiary" : "text-text",
                  ].join(" ")}
                >
                  {s.label}
                </p>
                <p className="mt-0.5 text-sm leading-snug text-text-secondary">
                  {s.value ?? (s.state === "here" ? "Happening now" : s.state === "ahead" ? "Not open yet" : "Done")}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
