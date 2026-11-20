"use client";

import { useMemo, useState } from "react";
import {
  type DayKey,
  addDays,
  diffDays,
  formatDay,
  formatDayLong,
  formatRange,
  parseDay,
  toDayKey,
  todayKey,
} from "@/lib/dates";
import { inWindow } from "@/lib/overlap";
import { plural } from "@/lib/format";
import { Icon } from "@/components/icons";

export interface CalendarProps {
  /** The days being picked, as "YYYY-MM-DD" keys. */
  selectedDates: Set<string>;
  onToggleDate: (day: string) => void;
  /** Add every day from start to end, inclusive. */
  onRangeSelect: (start: string, end: string) => void;
  onClear: () => void;
  /**
   * Day -> names of everyone free that day (from findBestOverlap). Drives the
   * heat and the small count in each cell. For exact counts, leave out the
   * person whose days are being picked: theirs come from `selectedDates`.
   */
  dateMap: Map<string, string[]>;
  /** Allowed range, if the organiser set one. */
  windowStart?: string;
  windowEnd?: string;
  /** The current best window, outlined in the grid. */
  best?: { start: string; end: string } | null;
  /** People in the group, for "3 of 6 free" labels and the heat scale. */
  groupSize?: number;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HEAT = {
  low: "bg-heat-low text-heat-low-text",
  medium: "bg-heat-medium text-heat-medium-text",
  high: "bg-heat-high text-heat-high-text",
} as const;
const ARROWS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

/* Months are counted from year 0, so they compare and step as plain numbers. */
function monthOf(day: DayKey): number {
  const d = parseDay(day);
  return d.getFullYear() * 12 + d.getMonth();
}
function monthDate(month: number, day = 1): Date {
  return new Date(Math.floor(month / 12), month % 12, day, 12);
}
function monthName(month: number): string {
  return monthDate(month).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

/**
 * Month grid for picking the days someone is free.
 *
 * Reads three things at once without relying on colour alone: the days being
 * picked (filled, with a tick), how many other people are free each day (a
 * yellow tint that deepens with the share of the group, plus the count in the
 * corner), and the group's best window so far (an outlined run tagged "Best").
 *
 * Has no frame of its own, so it sits equally well in a panel or a sheet.
 */
export default function Calendar({
  selectedDates,
  onToggleDate,
  onRangeSelect,
  onClear,
  dateMap,
  windowStart,
  windowEnd,
  best,
  groupSize,
}: CalendarProps) {
  const today = useMemo(() => todayKey(), []);

  // The first and last day that can be picked at all.
  const lower = windowStart && windowStart > today ? windowStart : today;
  const anySelectable = !windowEnd || windowEnd >= lower;
  const minMonth = monthOf(lower);
  const maxMonth = windowEnd ? monthOf(windowEnd) : monthOf(today) + 24;

  // Open where the trip is, not on a month of dead cells: the organiser's
  // window if it lies ahead, else the first day anyone has marked, else today.
  const [month, setMonth] = useState(() => {
    if (windowStart && windowStart > today) return monthOf(windowStart);
    const marked = [...dateMap.keys(), ...selectedDates]
      .filter((day) => day >= lower && (!windowEnd || day <= windowEnd))
      .sort();
    return marked.length > 0 ? monthOf(marked[0]) : monthOf(today);
  });
  const [rangeMode, setRangeMode] = useState(false);
  const [rangeStart, setRangeStart] = useState<DayKey | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const days = useMemo(() => {
    const count = monthDate(month + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => toDayKey(monthDate(month, i + 1)));
  }, [month]);
  const lead = (monthDate(month).getDay() + 6) % 7; // Monday first
  const lastDay = days[days.length - 1];

  const isOff = (day: DayKey) =>
    day < today || (!!windowStart && day < windowStart) || (!!windowEnd && day > windowEnd);
  const monthHasDays = days.some((day) => !isOff(day));

  // Heat is the share of everyone else who is free, so it means the same thing
  // in a group of 3 and a group of 10.
  const mostOthers = useMemo(() => {
    if (groupSize && groupSize > 1) return groupSize - 1;
    return Math.max(1, ...Array.from(dateMap.values(), (names) => names.length));
  }, [groupSize, dateMap]);

  function heatOf(others: number): keyof typeof HEAT | null {
    if (others <= 0) return null;
    const share = others / mostOthers;
    return share >= 0.66 ? "high" : share >= 0.33 ? "medium" : "low";
  }

  function handleDay(day: DayKey) {
    setConfirmClear(false);
    if (!rangeMode) {
      onToggleDate(day);
      return;
    }
    if (!rangeStart) {
      setRangeStart(day);
      return;
    }
    onRangeSelect(rangeStart < day ? rangeStart : day, rangeStart < day ? day : rangeStart);
    setRangeStart(null);
    setRangeMode(false);
  }

  // Arrow keys walk the grid. Every day is still a normal tab stop.
  function handleKeys(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = ARROWS[e.key];
    const from = (e.target as HTMLElement).dataset.day;
    if (!step || !from) return;
    const next = e.currentTarget.querySelector<HTMLButtonElement>(
      `button[data-day="${addDays(from, step)}"]:not(:disabled)`,
    );
    if (next) {
      e.preventDefault();
      next.focus();
    }
  }

  const windowLine =
    windowStart && windowEnd
      ? `Pick from ${formatRange(windowStart, windowEnd)}`
      : windowStart
        ? `Pick from ${formatDay(windowStart)} on`
        : windowEnd
          ? `Pick up to ${formatDay(windowEnd)}`
          : null;

  const bestLength = best ? diffDays(best.start, best.end) + 1 : 0;
  const picked = selectedDates.size;

  return (
    <div>
      {/* Month and navigation */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 pl-1 pt-1.5">
          <h3 className="font-heading text-[1.375rem] font-bold leading-none text-text" aria-live="polite">
            {monthName(month)}
          </h3>
          {windowLine && <p className="label-mono mt-1.5">{windowLine}</p>}
        </div>
        <div className="flex shrink-0">
          <button
            type="button"
            onClick={() => setMonth((m) => m - 1)}
            disabled={!anySelectable || month <= minMonth}
            className="icon-btn disabled:pointer-events-none disabled:opacity-30"
            aria-label={`Previous month, ${monthName(month - 1)}`}
          >
            <Icon name="chevron-left" className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setMonth((m) => m + 1)}
            disabled={!anySelectable || month >= maxMonth}
            className="icon-btn disabled:pointer-events-none disabled:opacity-30"
            aria-label={`Next month, ${monthName(month + 1)}`}
          >
            <Icon name="chevron-right" className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Weekdays */}
      <div className="mt-2 grid grid-cols-7" aria-hidden="true">
        {WEEKDAYS.map((name, i) => (
          <span key={name} className={`label-mono py-1.5 text-center ${i >= 5 ? "text-text-secondary" : ""}`}>
            {name}
          </span>
        ))}
      </div>

      {/* Days */}
      <div
        role="group"
        aria-label={monthName(month)}
        onKeyDown={handleKeys}
        className="grid grid-cols-7 gap-y-1.5 pt-1"
      >
        {days.map((day, i) => {
          const column = (lead + i) % 7;
          const off = isOff(day);
          const mine = selectedDates.has(day);
          const isToday = day === today;
          const anchor = day === rangeStart;
          const others = dateMap.get(day)?.length ?? 0;
          const heat = heatOf(others);
          const free = others + (mine ? 1 : 0);

          const inBest = inWindow(day, best);
          const segmentStart = inBest && (day === best!.start || column === 0 || i === 0);
          const segmentEnd = inBest && (day === best!.end || column === 6 || day === lastDay);
          const tagged = inBest && (day === best!.start || (i === 0 && best!.start < day));

          const label = [
            formatDayLong(day).replace(",", ""),
            isToday ? "today" : "",
            groupSize ? `${Math.min(free, groupSize)} of ${groupSize} free` : `${free} free`,
            mine ? "selected" : "",
            inBest ? "in the best window" : "",
            anchor ? "start of the range" : "",
            off ? "not available" : "",
          ]
            .filter(Boolean)
            .join(", ");

          const tile = off
            ? mine
              ? "bg-text text-background opacity-40"
              : "text-text-tertiary opacity-45"
            : anchor
              ? "bg-primary-light text-text ring-2 ring-inset ring-primary"
              : mine
                ? "bg-text text-background"
                : heat
                  ? HEAT[heat]
                  : "text-text group-hover:bg-subtle";

          return (
            <button
              key={day}
              type="button"
              data-day={day}
              disabled={off}
              aria-pressed={mine}
              aria-label={label}
              onClick={() => handleDay(day)}
              style={i === 0 ? { gridColumnStart: lead + 1 } : undefined}
              className="group relative h-[52px] focus-visible:z-20 disabled:cursor-default sm:h-14"
            >
              <span
                aria-hidden="true"
                className={`absolute inset-x-[3px] inset-y-[2px] flex items-center justify-center rounded-lg transition-colors ${tile}`}
              >
                <span className={`font-mono text-[0.9375rem] leading-none ${mine ? "font-semibold" : "font-medium"}`}>
                  {i + 1}
                </span>
                {mine && !anchor && <Icon name="check" className="absolute left-1 top-1 h-2.5 w-2.5" strokeWidth={3} />}
                {isToday && (
                  <span className="absolute bottom-[7px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-current" />
                )}
                {others > 0 && (
                  <span className="absolute bottom-[3px] right-[5px] font-mono text-[0.6875rem] font-semibold leading-none">
                    {others}
                  </span>
                )}
              </span>

              {inBest && (
                <span
                  aria-hidden="true"
                  className={[
                    "pointer-events-none absolute -inset-y-[2px] border-y-2 border-border-strong",
                    segmentStart ? "-left-px rounded-l-xl border-l-2" : "left-0",
                    segmentEnd ? "-right-px rounded-r-xl border-r-2" : "right-0",
                  ].join(" ")}
                />
              )}
              {tagged && (
                <span
                  aria-hidden="true"
                  className="label-mono pointer-events-none absolute -top-[9px] left-1.5 z-10 bg-surface px-1 text-text"
                >
                  Best
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!monthHasDays && (
        <div className="notice mt-3 items-center" role="status">
          <p className="min-w-0 flex-1">
            {anySelectable ? "No days to pick this month." : "There are no days left to pick for this trip."}
          </p>
          {anySelectable && (
            <button type="button" onClick={() => setMonth(monthOf(lower))} className="btn btn-outline btn-sm shrink-0">
              Go to {monthName(monthOf(lower))}
            </button>
          )}
        </div>
      )}

      {/* What is picked, the range helper, and clear. Under the grid, so the
          days never move when this line changes. */}
      <div className="mt-3 flex min-h-11 items-center justify-between gap-3 border-t border-border py-2 pl-1">
        {confirmClear ? (
          <>
            <p className="text-sm font-medium text-text">Clear all {plural(picked, "day")}?</p>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={() => setConfirmClear(false)} className="btn btn-outline btn-sm">
                Keep
              </button>
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setConfirmClear(false);
                }}
                className="btn btn-danger btn-sm"
              >
                Clear
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="min-w-0 text-[0.8125rem] leading-snug text-text-secondary" aria-live="polite">
              {rangeMode ? (
                <span className="font-medium text-text">
                  {rangeStart
                    ? `From ${formatDay(rangeStart)}. Now tap the last day.`
                    : "Tap the first day, then the last. Every day between is added."}
                </span>
              ) : picked > 0 ? (
                <span className="font-mono text-xs">{plural(picked, "day")} picked</span>
              ) : (
                "Tap a day to add it. Tap again to remove it."
              )}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setRangeMode((on) => !on);
                  setRangeStart(null);
                }}
                aria-pressed={rangeMode}
                title="Add every day between two days"
                className={`btn btn-sm ${rangeMode ? "btn-primary" : "btn-outline"}`}
              >
                <Icon name="range" className="h-4 w-4" />
                Range
              </button>
              {picked > 0 && !rangeMode && (
                <button type="button" onClick={() => setConfirmClear(true)} className="btn btn-quiet btn-sm">
                  Clear
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Key. Screen readers get the same facts from each day's label. */}
      <ul
        aria-hidden="true"
        className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 pl-1 font-mono text-[0.6875rem] leading-none text-text-secondary"
      >
        <li className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-sm bg-text" />
          Picked
        </li>
        <li className="flex items-center gap-1.5">
          <span className="flex gap-px">
            <span className="h-3.5 w-3.5 rounded-sm bg-heat-low" />
            <span className="h-3.5 w-3.5 rounded-sm bg-heat-medium" />
            <span className="h-3.5 w-3.5 rounded-sm bg-heat-high" />
          </span>
          More people free
        </li>
        <li className="flex items-center gap-1.5">
          <span className="font-semibold text-text">3</span>
          Others free that day
        </li>
        {best && (
          <li className="flex items-center gap-1.5">
            <span className="h-3.5 w-5 rounded-sm border-2 border-border-strong" />
            Best {plural(bestLength, "day")}
          </li>
        )}
      </ul>
    </div>
  );
}
