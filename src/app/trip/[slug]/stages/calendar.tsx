"use client";

import { useState, useMemo } from "react";

interface CalendarProps {
  startDate: string;
  endDate: string;
  onSelect: (date: string) => void;
  dateMap: Map<string, string[]>;
}

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isSameDay(a: string, b: string): boolean {
  return a === b;
}

function isInRange(dateKey: string, start: string, end: string): boolean {
  if (!start || !end) return false;
  return dateKey > start && dateKey < end;
}

function isPast(dateKey: string, todayKey: string): boolean {
  return dateKey < todayKey;
}

export default function Calendar({
  startDate,
  endDate,
  onSelect,
  dateMap,
}: CalendarProps) {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(
    () => toDateKey(today.getFullYear(), today.getMonth(), today.getDate()),
    [today]
  );

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

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
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }

  function nextMonth() {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }

  function getCellClasses(day: number): string {
    const dateKey = toDateKey(viewYear, viewMonth, day);
    const isWeekend = new Date(viewYear, viewMonth, day).getDay() % 6 === 0;
    const past = isPast(dateKey, todayKey);
    const isToday = isSameDay(dateKey, todayKey);
    const isStart = isSameDay(dateKey, startDate);
    const isEnd = isSameDay(dateKey, endDate);
    const inRange = isInRange(dateKey, startDate, endDate);

    const base = "w-10 h-10 flex items-center justify-center rounded-xl text-sm transition-all duration-150";

    if (past) {
      return `${base} opacity-30 cursor-default text-muted`;
    }

    // Selected start or end
    if (isStart || isEnd) {
      return `${base} bg-primary text-white font-semibold shadow-sm cursor-pointer`;
    }

    // In selection range
    if (inRange) {
      return `${base} bg-primary-light text-primary font-medium cursor-pointer`;
    }

    // Heatmap coloring based on dateMap
    const members = dateMap.get(dateKey) ?? [];
    const count = members.length;

    let heatmap: string;
    if (count >= 4) {
      heatmap = "bg-heat-high text-heat-high-text font-medium";
    } else if (count >= 2) {
      heatmap = "bg-heat-medium text-heat-medium-text";
    } else if (count === 1) {
      heatmap = "bg-heat-low text-heat-low-text";
    } else {
      heatmap = isWeekend ? "bg-subtle text-muted-medium" : "text-muted-dark";
    }

    const todayStyle = isToday ? "text-primary font-bold ring-2 ring-primary/20" : "";

    return `${base} ${heatmap} ${todayStyle} cursor-pointer hover:ring-2 hover:ring-primary/30`;
  }

  function handleDayClick(day: number) {
    const dateKey = toDateKey(viewYear, viewMonth, day);
    if (isPast(dateKey, todayKey)) return;
    onSelect(dateKey);
  }

  return (
    <div className="rounded-2xl border border-border-light bg-surface p-4 shadow-sm">
      {/* Month/Year header with navigation */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-subtle-hover active:scale-90 transition-all"
          aria-label="Previous month"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h3 className="font-heading text-sm font-bold text-text">
          {monthLabel}
        </h3>
        <button
          type="button"
          onClick={nextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-subtle-hover active:scale-90 transition-all"
          aria-label="Next month"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DAYS_OF_WEEK.map((d) => (
          <div
            key={d}
            className="flex h-8 w-10 items-center justify-center text-[11px] font-semibold text-text-tertiary uppercase tracking-wider"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, i) =>
          day === null ? (
            <div key={`empty-${i}`} className="w-10 h-10" />
          ) : (
            <button
              key={day}
              type="button"
              onClick={() => handleDayClick(day)}
              disabled={isPast(toDateKey(viewYear, viewMonth, day), todayKey)}
              className={getCellClasses(day)}
            >
              {day}
            </button>
          )
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-text-tertiary font-medium">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded bg-subtle-hover" />
          None
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded bg-heat-low" />
          1
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
