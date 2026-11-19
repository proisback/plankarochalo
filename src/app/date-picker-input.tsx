"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { addDays, formatDayLong, isDayKey, parseDay, toDayKey, todayKey, type DayKey } from "@/lib/dates";

const WEEKDAYS = [
  ["Mo", "Monday"],
  ["Tu", "Tuesday"],
  ["We", "Wednesday"],
  ["Th", "Thursday"],
  ["Fr", "Friday"],
  ["Sa", "Saturday"],
  ["Su", "Sunday"],
] as const;

/** Space kept between the popover and the edge of the screen. */
const GUTTER = 8;

/** Monday = 0 ... Sunday = 6. */
function weekdayIndex(day: DayKey): number {
  return (parseDay(day).getDay() + 6) % 7;
}

/** The same date `delta` months away, pulled back when that month is shorter. */
function shiftMonth(day: DayKey, delta: number): DayKey {
  const d = parseDay(day);
  const target = new Date(d.getFullYear(), d.getMonth() + delta, 1, 12);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d.getDate(), last));
  return toDayKey(target);
}

/** Weeks of the month, Monday first, padded with nulls. */
function buildWeeks(year: number, month: number): (DayKey | null)[][] {
  const lead = (new Date(year, month, 1, 12).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const cells: (DayKey | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= count; d++) cells.push(toDayKey(new Date(year, month, d, 12)));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (DayKey | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function spoken(day: DayKey): string {
  return parseDay(day).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/**
 * A single-day picker: a field-styled trigger and a month grid in a popover.
 *
 * Values are day keys ("YYYY-MM-DD"), or "" for nothing picked. Days before
 * today, before `min` or after `max` cannot be picked.
 *
 * Keyboard: Enter or Space on the trigger opens it. In the grid the arrow keys
 * move by day and week, Home and End jump to the ends of the week, Page Up and
 * Page Down change month, Enter picks, Escape closes.
 */
export function DatePickerInput({
  value,
  onChange,
  min,
  max,
  placeholder = "Pick a date",
  className = "",
  id,
  labelledBy,
  describedBy,
  invalid = false,
}: {
  value: string;
  onChange: (date: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  className?: string;
  id?: string;
  /** Id of the visible label. The picked date is read out after it. */
  labelledBy?: string;
  /** Id of the hint or error text. A button cannot carry aria-invalid, so the error is read from here. */
  describedBy?: string;
  /** Draws the trigger in the error colour. */
  invalid?: boolean;
}) {
  const selected = isDayKey(value) ? value : "";
  const [open, setOpen] = useState(false);
  // Set when the popover opens, so nothing date-dependent is server-rendered.
  const [today, setToday] = useState<DayKey>("");
  /** The day that holds keyboard focus. Its month is the month on screen. */
  const [focused, setFocused] = useState<DayKey>("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);
  const valueId = useId();
  const monthId = useId();

  const earliest = min && isDayKey(min) && min > today ? min : today;
  const latest = max && isDayKey(max) ? max : "";
  const allowed = (day: DayKey) => day >= earliest && (!latest || day <= latest);
  const clamp = (day: DayKey) => (day < earliest ? earliest : latest && day > latest ? latest : day);

  const shown = focused ? parseDay(focused) : null;
  const year = shown?.getFullYear() ?? 0;
  const month = shown?.getMonth() ?? 0;
  const weeks = useMemo(() => (open ? buildWeeks(year, month) : []), [open, year, month]);
  const monthLabel = shown
    ? new Date(year, month, 1, 12).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : "";
  const prevDisabled = !shown || toDayKey(new Date(year, month, 0, 12)) < earliest;
  const nextDisabled = !shown || (!!latest && toDayKey(new Date(year, month + 1, 1, 12)) > latest);

  function openPicker() {
    const now = todayKey();
    const floor = min && isDayKey(min) && min > now ? min : now;
    const start = !selected || selected < floor ? floor : latest && selected > latest ? latest : selected;
    setToday(now);
    setFocused(start);
    moveFocus.current = true;
    setOpen(true);
  }

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function pick(day: DayKey) {
    onChange(day);
    close(true);
  }

  function goTo(day: DayKey, withFocus: boolean) {
    const target = clamp(day);
    if (target === focused) return;
    moveFocus.current = withFocus;
    setFocused(target);
  }

  // Keep the popover on screen: slide it left when it would cross the right
  // edge, then bring it into view if it opened below the fold.
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const wrap = wrapRef.current;
      const pop = popRef.current;
      if (!wrap || !pop) return;
      const left = wrap.getBoundingClientRect().left;
      const overflow = left + pop.offsetWidth - (document.documentElement.clientWidth - GUTTER);
      pop.style.left = `${overflow > 0 ? Math.max(-overflow, GUTTER - left) : 0}px`;
    }
    place();
    popRef.current?.scrollIntoView({ block: "nearest" });
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  // Close on a press anywhere outside.
  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Roving focus: on open and on every keyboard move, focus follows the day.
  useEffect(() => {
    if (!open || !moveFocus.current) return;
    moveFocus.current = false;
    const cell = popRef.current?.querySelector<HTMLElement>(`[data-day="${focused}"]:not(:disabled)`);
    (cell ?? popRef.current)?.focus();
  }, [open, focused]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close(true);
      return;
    }
    if (!focused || !(e.target as HTMLElement).closest("[data-day]")) return;
    let target: DayKey;
    switch (e.key) {
      case "ArrowLeft":
        target = addDays(focused, -1);
        break;
      case "ArrowRight":
        target = addDays(focused, 1);
        break;
      case "ArrowUp":
        target = addDays(focused, -7);
        break;
      case "ArrowDown":
        target = addDays(focused, 7);
        break;
      case "Home":
        target = addDays(focused, -weekdayIndex(focused));
        break;
      case "End":
        target = addDays(focused, 6 - weekdayIndex(focused));
        break;
      case "PageUp":
        target = shiftMonth(focused, -1);
        break;
      case "PageDown":
        target = shiftMonth(focused, 1);
        break;
      default:
        return;
    }
    e.preventDefault();
    goTo(target, true);
  }

  return (
    <div
      ref={wrapRef}
      className={`relative ${className}`}
      onBlur={(e) => {
        // Tabbing away closes it. A null target is a press on something that
        // does not take focus (Safari does this for buttons): the pointer
        // handler above deals with those.
        const to = e.relatedTarget as Node | null;
        if (open && to && !wrapRef.current?.contains(to)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={() => (open ? close(false) : openPicker())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            openPicker();
          }
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={labelledBy ? `${labelledBy} ${valueId}` : undefined}
        aria-describedby={describedBy}
        className={`field flex items-center justify-between gap-2 text-left ${invalid ? "border-status-out" : ""}`}
      >
        <span id={valueId} className={selected ? "truncate" : "truncate text-text-tertiary"}>
          {selected ? `${formatDayLong(selected)} ${parseDay(selected).getFullYear()}` : placeholder}
        </span>
        <Icon name="calendar" className="h-4 w-4 shrink-0 text-text-tertiary" />
      </button>

      {open && shown && (
        <div
          ref={popRef}
          role="dialog"
          aria-label="Choose a date"
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className="absolute left-0 top-full z-40 mt-1.5 w-full min-w-[min(334px,calc(100vw-1rem))] max-w-[380px] scroll-mb-4 rounded-2xl border border-border-strong bg-surface p-3 shadow-lg outline-none animate-fade"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => goTo(shiftMonth(focused, -1), false)}
              disabled={prevDisabled}
              className="icon-btn disabled:pointer-events-none disabled:opacity-30"
              aria-label="Previous month"
            >
              <Icon name="chevron-left" className="h-5 w-5" />
            </button>
            <p id={monthId} aria-live="polite" className="font-heading text-lg font-bold text-text">
              {monthLabel}
            </p>
            <button
              type="button"
              onClick={() => goTo(shiftMonth(focused, 1), false)}
              disabled={nextDisabled}
              className="icon-btn disabled:pointer-events-none disabled:opacity-30"
              aria-label="Next month"
            >
              <Icon name="chevron-right" className="h-5 w-5" />
            </button>
          </div>

          <div role="grid" aria-labelledby={monthId} className="mt-1">
            <div role="row" className="grid grid-cols-7">
              {WEEKDAYS.map(([short, long]) => (
                <span
                  key={long}
                  role="columnheader"
                  aria-label={long}
                  className="label-mono flex h-8 items-center justify-center"
                >
                  {short}
                </span>
              ))}
            </div>
            {weeks.map((week, w) => (
              <div key={w} role="row" className="grid grid-cols-7">
                {week.map((day, d) => {
                  if (!day) return <span key={`blank-${d}`} role="gridcell" className="h-11" />;
                  const isSelected = day === selected;
                  const ok = allowed(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      role="gridcell"
                      data-day={day}
                      tabIndex={day === focused ? 0 : -1}
                      disabled={!ok}
                      onClick={() => pick(day)}
                      aria-label={spoken(day)}
                      aria-selected={isSelected}
                      aria-current={day === today ? "date" : undefined}
                      className={[
                        "flex h-11 items-center justify-center rounded-xl font-mono text-sm transition-colors",
                        isSelected
                          ? "bg-primary font-semibold text-on-primary"
                          : !ok
                            ? "cursor-not-allowed text-text-tertiary opacity-40"
                            : day === today
                              ? "border border-border-strong font-semibold text-text hover:bg-subtle"
                              : "text-text hover:bg-subtle",
                      ].join(" ")}
                    >
                      {parseDay(day).getDate()}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {selected && (
            <div className="mt-2 flex justify-end border-t border-border pt-2">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  close(true);
                }}
                className="btn btn-quiet btn-sm"
              >
                Clear date
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
