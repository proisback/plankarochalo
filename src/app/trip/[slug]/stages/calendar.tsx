"use client";

import { useState, useMemo } from "react";

interface CalendarProps {
  selectedDates: Set<string>;
  onToggleDate: (date: string) => void;
  onRangeSelect: (start: string, end: string) => void;
  dateMap: Map<string, string[]>;
  windowStart?: string;
  windowEnd?: string;
  overlapStart?: string;
  overlapEnd?: string;
}

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isPast(dateKey: string, todayKey: string): boolean {
  return dateKey < todayKey;
}

function isOutsideWindow(dateKey: string, windowStart?: string, windowEnd?: string): boolean {
  if (!windowStart && !windowEnd) return false;
  if (windowStart && dateKey < windowStart) return true;
  if (windowEnd && dateKey > windowEnd) return true;
  return false;
}

function isInRange(dateKey: string, start: string | null, end: string | null): boolean {
  if (!start || !end) return false;
  const a = start < end ? start : end;
  const b = start < end ? end : start;
  return dateKey >= a && dateKey <= b;
}

export default function Calendar({
  selectedDates,
  onToggleDate,
  onRangeSelect,
  dateMap,
  windowStart,
  windowEnd,
  overlapStart,
  overlapEnd,
}: CalendarProps) {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(
    () => toDateKey(today.getFullYear(), today.getMonth(), today.getDate()),
    [today]
  );

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [rangeMode, setRangeMode] = useState(false);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const monthLabel = useMemo(() => {
    const d = new Date(viewYear, viewMonth, 1);
    return d.toLocaleString("default", { month: "long", year: "numeric" });
  }, [viewYear, viewMonth]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewYear, viewMonth]);

  function prevMonth() {
    setViewMonth((m) => {
      if (m === 0) { setViewYear((y) => y - 1); return 11; }
      return m - 1;
    });
  }

  function nextMonth() {
    setViewMonth((m) => {
      if (m === 11) { setViewYear((y) => y + 1); return 0; }
      return m + 1;
    });
  }

  function handleDayClick(day: number) {
    const dateKey = toDateKey(viewYear, viewMonth, day);
    if (isPast(dateKey, todayKey)) return;
    if (isOutsideWindow(dateKey, windowStart, windowEnd)) return;

    if (rangeMode) {
      if (!rangeStart) {
        // First tap in range mode — set start
        setRangeStart(dateKey);
      } else {
        // Second tap — complete range
        const start = rangeStart < dateKey ? rangeStart : dateKey;
        const end = rangeStart < dateKey ? dateKey : rangeStart;
        onRangeSelect(start, end);
        setRangeStart(null);
        setRangeMode(false);
      }
    } else {
      // Single tap mode — toggle
      onToggleDate(dateKey);
    }
  }

  function toggleRangeMode() {
    if (rangeMode) {
      // Turning off — cancel any pending range
      setRangeMode(false);
      setRangeStart(null);
    } else {
      setRangeMode(true);
      setRangeStart(null);
    }
  }

  function getCellClasses(day: number): string {
    const dateKey = toDateKey(viewYear, viewMonth, day);
    const isWeekend = new Date(viewYear, viewMonth, day).getDay() % 6 === 0;
    const past = isPast(dateKey, todayKey);
    const outside = isOutsideWindow(dateKey, windowStart, windowEnd);
    const isToday = dateKey === todayKey;
    const isSelected = selectedDates.has(dateKey);
    const isRangeAnchor = dateKey === rangeStart;
    const isInOverlap = overlapStart && overlapEnd && dateKey >= overlapStart && dateKey <= overlapEnd;

    const base = "w-full aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-100";

    if (past || outside) {
      return `${base} text-text-tertiary/30 cursor-default`;
    }

    // Range start anchor
    if (isRangeAnchor) {
      return `${base} bg-primary text-white font-bold ring-2 ring-primary/30 cursor-pointer`;
    }

    // Already selected + in best overlap window — gold border highlights the match
    if (isSelected && isInOverlap) {
      return `${base} bg-accent text-white font-bold cursor-pointer hover:bg-accent-hover border-2 border-pop shadow-sm`;
    }

    // Already selected (not in overlap)
    if (isSelected) {
      return `${base} bg-accent text-white font-bold cursor-pointer hover:bg-accent-hover`;
    }

    // In best overlap window but not selected by this user
    if (isInOverlap) {
      return `${base} bg-pop/30 text-[#8B6914] font-bold cursor-pointer hover:bg-pop/40 border-2 border-pop/50`;
    }

    // Heatmap (others' selections)
    const others = dateMap.get(dateKey) ?? [];
    const count = others.length;

    let heatmap: string;
    if (count >= 4) {
      heatmap = "bg-heat-high text-heat-high-text";
    } else if (count >= 2) {
      heatmap = "bg-heat-medium text-heat-medium-text";
    } else if (count === 1) {
      heatmap = "bg-heat-low text-heat-low-text";
    } else {
      heatmap = isWeekend ? "bg-subtle text-muted-medium" : "text-muted-dark";
    }

    const todayStyle = isToday ? "ring-2 ring-primary/20 text-primary font-bold" : "";
    const rangeCursor = rangeMode ? "cursor-pointer ring-1 ring-primary/10" : "";

    return `${base} ${heatmap} ${todayStyle} ${rangeCursor} cursor-pointer hover:ring-2 hover:ring-accent/30`;
  }

  return (
    <div className="rounded-2xl border border-border-light bg-surface p-4 shadow-sm">
      {/* Month nav */}
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={prevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-subtle-hover active:scale-90 transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h3 className="font-heading text-sm font-bold text-text">{monthLabel}</h3>
        <button type="button" onClick={nextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-subtle-hover active:scale-90 transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Mode toggle + hint */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {rangeMode
            ? rangeStart
              ? "Now tap the end date"
              : "Tap the start date"
            : "Tap dates to mark as available"}
        </p>
        <button
          type="button"
          onClick={toggleRangeMode}
          className={[
            "text-xs font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-1",
            rangeMode
              ? "bg-primary text-white shadow-sm"
              : "bg-subtle text-text-secondary hover:bg-subtle-hover",
          ].join(" ")}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          Range
        </button>
      </div>

      {/* Range mode indicator */}
      {rangeMode && rangeStart && (
        <div className="mb-2 bg-primary-light border border-primary/10 rounded-lg px-3 py-2 flex items-center justify-between">
          <p className="text-xs text-primary font-medium">
            From {new Date(rangeStart + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })} → tap end date
          </p>
          <button type="button" onClick={() => setRangeStart(null)}
            className="text-[10px] text-primary/60 hover:text-primary font-medium">
            Cancel
          </button>
        </div>
      )}

      {/* Day headers */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} className="flex h-7 items-center justify-center text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, i) =>
          day === null ? (
            <div key={`e-${i}`} className="aspect-square" />
          ) : (
            <button
              key={day}
              type="button"
              onClick={() => handleDayClick(day)}
              disabled={isPast(toDateKey(viewYear, viewMonth, day), todayKey) || isOutsideWindow(toDateKey(viewYear, viewMonth, day), windowStart, windowEnd)}
              className={getCellClasses(day)}
            >
              {day}
            </button>
          )
        )}
      </div>

      {/* Footer */}
      <div className="mt-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-accent font-semibold">
            {selectedDates.size} {selectedDates.size === 1 ? "date" : "dates"} selected
          </p>
          {selectedDates.size > 0 && !confirmClear && (
            <button type="button" onClick={() => setConfirmClear(true)}
              className="text-xs text-text-tertiary hover:text-status-out font-medium transition-colors">
              Clear all
            </button>
          )}
        </div>
        {confirmClear && (
          <div className="mt-2 bg-status-out-bg/50 border border-status-out/10 rounded-lg px-3 py-2 flex items-center justify-between">
            <p className="text-xs text-status-out font-medium">Clear all {selectedDates.size} dates?</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => {
                for (const d of selectedDates) onToggleDate(d);
                setConfirmClear(false);
              }} className="text-xs font-semibold text-status-out hover:text-status-out/80 transition-colors">
                Yes, clear
              </button>
              <button type="button" onClick={() => setConfirmClear(false)}
                className="text-xs font-medium text-text-tertiary hover:text-text-secondary transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-text-tertiary font-medium flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded bg-accent" />
          You
        </span>
        {overlapStart && overlapEnd && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded bg-pop/40" />
            Best match
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded bg-heat-low" />
          1 other
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded bg-heat-medium" />
          2-3
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded bg-heat-high" />
          4+
        </span>
      </div>
    </div>
  );
}
