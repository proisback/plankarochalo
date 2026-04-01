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

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
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

    const base = "w-10 h-10 flex items-center justify-center rounded-lg text-sm transition-colors";

    if (past) {
      return `${base} opacity-40 cursor-default bg-gray-50 text-gray-400`;
    }

    // Selected start or end
    if (isStart || isEnd) {
      return `${base} bg-primary text-white font-medium cursor-pointer`;
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
      heatmap = "bg-emerald-200 text-emerald-800 font-medium";
    } else if (count >= 2) {
      heatmap = "bg-emerald-100 text-emerald-700";
    } else if (count === 1) {
      heatmap = "bg-orange-100 text-orange-700";
    } else {
      heatmap = isWeekend ? "bg-gray-100 text-gray-500" : "bg-gray-50 text-gray-600";
    }

    const todayStyle = isToday ? "text-primary font-bold ring-1 ring-primary/30" : "";

    return `${base} ${heatmap} ${todayStyle} cursor-pointer hover:ring-2 hover:ring-primary/40`;
  }

  function handleDayClick(day: number) {
    const dateKey = toDateKey(viewYear, viewMonth, day);
    if (isPast(dateKey, todayKey)) return;
    onSelect(dateKey);
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-surface p-4">
      {/* Month/Year header with navigation */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-gray-100 transition-colors"
          aria-label="Previous month"
        >
          ◂
        </button>
        <h3 className="font-heading text-base font-semibold text-gray-900">
          {monthLabel}
        </h3>
        <button
          type="button"
          onClick={nextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-gray-100 transition-colors"
          aria-label="Next month"
        >
          ▸
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DAYS_OF_WEEK.map((d) => (
          <div
            key={d}
            className="flex h-8 w-10 items-center justify-center text-xs font-medium text-text-secondary"
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
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-gray-100" />
          0
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-orange-100" />
          1
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-emerald-100" />
          2-3
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-emerald-200" />
          4+
        </span>
      </div>
    </div>
  );
}
