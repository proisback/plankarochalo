import { Mark } from "./brand";
import { Icon, type IconName } from "./icons";

export interface TicketPassenger {
  name: string;
  status: "in" | "out" | "waiting";
}

const CODE: Record<TicketPassenger["status"], { code: string; chip: string; label: string }> = {
  in: { code: "CNF", chip: "chip-go", label: "confirmed" },
  waiting: { code: "WL", chip: "chip-wait", label: "waiting" },
  out: { code: "OUT", chip: "chip-out", label: "not going" },
};

/**
 * The group reservation ticket. This is what the whole product produces:
 * one piece of paper that says where, when, and who is confirmed.
 * Shown as the hero on the landing page and as the payoff on the Ready stage.
 */
export function TripTicket({
  tripName,
  destination,
  destinationIcon = "pin",
  dates,
  weekdays,
  days,
  budget,
  passengers,
  pnr,
  stamp,
  animateStamp = false,
  className = "",
  cutout,
}: {
  tripName: string;
  destination: string;
  destinationIcon?: IconName;
  /** "11 – 13 Dec" */
  dates: string;
  /** "Fri to Sun" */
  weekdays?: string;
  days: number;
  /** "₹10K – ₹15K" */
  budget?: string | null;
  passengers: TicketPassenger[];
  pnr: string;
  /** Text of the rubber stamp, for example "Confirmed". Omit for no stamp. */
  stamp?: string;
  animateStamp?: boolean;
  className?: string;
  /** Colour behind the ticket, so the tear notches match. Defaults to the page. */
  cutout?: string;
}) {
  const going = passengers.filter((p) => p.status === "in").length;
  let seat = 0;

  return (
    <article
      className={`ticket overflow-hidden text-left ${className}`}
      style={cutout ? ({ "--ticket-cutout": cutout } as React.CSSProperties) : undefined}
      aria-label={`Trip ticket: ${tripName}`}
    >
      {/* Issuer strip */}
      <header className="flex items-center justify-between gap-3 border-b border-border-strong bg-brand px-4 py-2.5 text-on-brand">
        <span className="flex items-center gap-2">
          <Mark className="h-5 w-5 text-on-brand" />
          <span className="font-heading text-sm font-extrabold uppercase tracking-wide">Plan Karo Chalo</span>
        </span>
        <span className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.12em]">Group reservation</span>
      </header>

      <div className="relative px-4 pb-4 pt-3.5">
        {stamp && (
          <span
            className={`stamp absolute right-3 top-3 ${animateStamp ? "animate-stamp" : ""}`}
            style={animateStamp ? { animationDelay: "0.5s" } : undefined}
          >
            {stamp}
          </span>
        )}

        <p className="ticket-key">Trip</p>
        {/* The stamp sits top right. Padding, not a width cap, keeps every line of a long name clear of it. */}
        <p className={`mt-0.5 font-heading text-xl font-bold leading-tight text-text ${stamp ? "pr-[7.75rem]" : ""}`}>
          {tripName}
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5">
          <div>
            <dt className="ticket-key">Destination</dt>
            <dd className="mt-0.5 flex items-center gap-1.5">
              <Icon name={destinationIcon} className="h-[18px] w-[18px] shrink-0 text-text-secondary" />
              <span className="display text-[1.75rem] text-text">{destination}</span>
            </dd>
          </div>
          <div>
            <dt className="ticket-key">Dates</dt>
            <dd className="mt-0.5">
              <span className="display text-[1.75rem] text-text">{dates}</span>
              {weekdays && <span className="mt-0.5 block font-mono text-[0.6875rem] text-text-tertiary">{weekdays}</span>}
            </dd>
          </div>
          <div>
            <dt className="ticket-key">Days</dt>
            <dd className="ticket-val">{days}</dd>
          </div>
          <div>
            <dt className="ticket-key">{budget ? "Budget per head" : "Going"}</dt>
            <dd className="ticket-val">{budget ?? going}</dd>
          </div>
        </dl>
      </div>

      <div className="ticket-tear" aria-hidden="true" />

      <div className="px-4 pb-3 pt-4">
        <div className="flex items-baseline justify-between">
          <p className="ticket-key">Passengers</p>
          <p className="ticket-key">
            {going} of {passengers.length} confirmed
          </p>
        </div>
        <ol className="mt-2">
          {passengers.map((p, i) => {
            const c = CODE[p.status];
            if (p.status !== "out") seat += 1;
            return (
              <li
                key={`${p.name}-${i}`}
                className="flex items-center gap-3 border-b border-dashed border-border py-1.5 last:border-b-0"
              >
                <span className="w-5 font-mono text-[0.6875rem] text-text-tertiary">
                  {p.status === "out" ? "--" : String(seat).padStart(2, "0")}
                </span>
                <span
                  className={[
                    "flex-1 truncate font-mono text-sm font-medium uppercase tracking-wide",
                    p.status === "out" ? "text-text-tertiary line-through" : "text-text",
                  ].join(" ")}
                >
                  {p.name}
                </span>
                <span className={`chip ${c.chip}`}>
                  {c.code}
                  <span className="sr-only">, {c.label}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <footer className="flex items-end justify-between gap-4 border-t border-border px-4 py-3">
        <div className="barcode w-28 shrink-0" aria-hidden="true" />
        <p className="text-right font-mono text-[0.625rem] uppercase leading-relaxed tracking-[0.1em] text-text-tertiary">
          PNR {pnr}
          <br />
          Chart prepared
        </p>
      </footer>
    </article>
  );
}
