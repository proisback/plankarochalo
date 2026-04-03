"use client";

import { useState, useMemo } from "react";

interface CalendarProps {
  selectedDates: Set<string>;
  onToggleDate: (date: string) => void;
  onRangeSelect: (start: string, end: string) => void;
  dateMap: Map<string, string[]>;
  windowStart?: string;
  windowEnd?: string;
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

export default function Calendar({
  selectedDates,
  onToggleDate,
  onRangeSelect,
  dateMap,
  windowStart,
  windowEnd,
}: CalendarProps) {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(
    () => toDateKey(today.getFullYear(), today.getMonth(), today.getDate()),
    [today]
  );

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [rangeStart, setRangeStart] = useState<string | null>(null);

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

    if (rangeStart) {
      // Complete the range
      const start = rangeStart < dateKey ? rangeStart : dateKey;
      const end = rangeStart < dateKey ? dateKey : rangeStart;
      onRangeSelect(start, end);
      setRangeStart(null);
    } else {
      // Single tap — toggle. But if user wants a range, they can long-press or double-tap.
      // Simple approach: first tap selects/deselects, hold shift (desktop) or we just use single toggle.
      onToggleDate(dateKey);
    }
  }

  function handleDayDoubleClick(day: number) {
    const dateKey = toDateKey(viewYear, viewMonth, day);
    if (isPast(dateKey, todayKey)) return;
    if (isOutsideWindow(dateKey, windowStart, windowEnd)) return;

    // Start range selection mode
    setRangeStart(dateKey);
  }

  function getCellClasses(day: number): string {
    const dateKey = toDateKey(viewYear, viewMonth, day);
    const isWeekend = new Date(viewYear, viewMonth, day).getDay() % 6 === 0;
    const past = isPast(dateKey, todayKey);
    const outside = isOutsideWindow(dateKey, windowStart, windowEnd);
    const isToday = dateKey === todayKey;
    const isSelected = selectedDates.has(dateKey);
    const isRangeAnchor = dateKey === rangeStart;

    const base = "w-full aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-100";

    if (past || outside) {
      return `${base} text-text-tertiary/30 cursor-default`;
    }

    if (isRangeAnchor) {
      return `${base} bg-primary text-white ring-2 ring-primary/30 cursor-pointer`;
    }

    if (isSelected) {
      return `${base} bg-accent text-white font-bold cursor-pointer hover:bg-accent-hover`;
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

    return `${base} ${heatmap} ${todayStyle} cursor-pointer hover:ring-2 hover:ring-accent/30`;
  }

  return (
    <div className="rounded-2xl border border-border-light bg-surface p-4 shadow-sm">
      {/* Month nav */}
      <div className="mb-3 flex items-center justify-between">
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
              onDoubleClick={() => handleDayDoubleClick(day)}
              disabled={isPast(toDateKey(viewYear, viewMonth, day), todayKey) || isOutsideWindow(toDateKey(viewYear, viewMonth, day), windowStart, windowEnd)}
              className={getCellClasses(day)}
            >
              {day}
            </button>
          )
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-accent font-semibold">
          {selectedDates.size} {selectedDates.size === 1 ? "date" : "dates"} selected
        </p>
        {rangeStart ? (
          <button type="button" onClick={() => setRangeStart(null)}
            className="text-[10px] text-status-out hover:text-status-out/80 font-medium transition-colors">
            Cancel range
          </button>
        ) : selectedDates.size > 0 ? (
          <button type="button" onClick={() => { for (const d of selectedDates) onToggleDate(d); }}
            className="text-[10px] text-status-out hover:text-status-out/80 font-medium transition-colors">
            Clear all
          </button>
        ) : null}
      </div>

      {/* Range mode indicator */}
      {rangeStart && (
        <div className="mt-2 bg-primary-light/50 border border-primary/10 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-primary font-medium">
            Tap another date to select the range from {new Date(rangeStart + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-text-tertiary font-medium">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded bg-accent" />
          You
        </span>
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

      {/* Hint */}
      <p className="text-center text-[10px] text-text-tertiary mt-2">
        Tap to select &middot; Double-tap to start a range
      </p>
    </div>
  );
}
