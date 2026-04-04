"use client";

import { useState, useRef, useEffect, useMemo } from "react";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function formatDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function DatePickerInput({
  value,
  onChange,
  min,
  placeholder = "Pick a date",
  className = "",
}: {
  value: string;
  onChange: (date: string) => void;
  min?: string;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const today = useMemo(() => new Date(), []);
  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());

  const initial = value ? new Date(value + "T00:00:00") : today;
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString("default", { month: "short", year: "numeric" });

  const cells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [viewYear, viewMonth]);

  function prev() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function next() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function handlePick(day: number) {
    const key = toKey(viewYear, viewMonth, day);
    if (key < todayKey) return;
    if (min && key < min) return;
    onChange(key);
    setOpen(false);
  }

  function isDisabled(day: number): boolean {
    const key = toKey(viewYear, viewMonth, day);
    if (key < todayKey) return true;
    if (min && key < min) return true;
    return false;
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-left hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
      >
        <span className={value ? "text-text" : "text-text-tertiary"}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <svg className="w-4 h-4 text-text-tertiary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      </button>

      {/* Dropdown calendar */}
      {open && (
        <div className="absolute z-40 top-full mt-1 left-0 right-0 bg-surface border border-border-light rounded-2xl shadow-lg p-3 animate-scale max-h-[60vh] overflow-y-auto">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={prev} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:bg-subtle-hover active:scale-90 transition-all">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <span className="text-xs font-bold text-text">{monthLabel}</span>
            <button type="button" onClick={next} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:bg-subtle-hover active:scale-90 transition-all">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-0.5">
            {DAYS.map(d => (
              <div key={d} className="h-7 flex items-center justify-center text-[10px] font-semibold text-text-tertiary uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} className="h-8" />;
              const key = toKey(viewYear, viewMonth, day);
              const selected = key === value;
              const disabled = isDisabled(day);
              const isToday = key === todayKey;

              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  onClick={() => handlePick(day)}
                  className={[
                    "h-10 w-full rounded-lg text-xs font-medium transition-all",
                    disabled
                      ? "text-text-tertiary/40 cursor-default"
                      : selected
                        ? "bg-primary text-white font-bold"
                        : isToday
                          ? "text-primary font-bold ring-1 ring-primary/20 hover:bg-primary-light"
                          : "text-text hover:bg-subtle-hover",
                  ].join(" ")}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick actions */}
          {value && (
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="mt-2 w-full text-[10px] text-text-tertiary hover:text-status-out transition-colors text-center py-1"
            >
              Clear date
            </button>
          )}
        </div>
      )}
    </div>
  );
}
