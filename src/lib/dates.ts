/**
 * Calendar-day helpers.
 *
 * Trips are planned in calendar days, not instants. A day travels through the
 * app and the database as a "YYYY-MM-DD" key and is only turned into a Date at
 * local noon for formatting. `new Date("2026-12-14")` parses as UTC midnight,
 * which renders as 13 Dec anywhere west of Greenwich, so never do that here.
 */

export type DayKey = string;

const KEY_RE = /^(\d{4})-(\d{2})-(\d{2})/;

export function isDayKey(value: unknown): value is DayKey {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Local noon on the given day. Noon keeps DST shifts from changing the date. */
export function parseDay(key: DayKey): Date {
  const m = KEY_RE.exec(key);
  if (!m) return new Date(NaN);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
}

export function toDayKey(date: Date): DayKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayKey(): DayKey {
  return toDayKey(new Date());
}

export function addDays(key: DayKey, days: number): DayKey {
  const d = parseDay(key);
  d.setDate(d.getDate() + days);
  return toDayKey(d);
}

/** Whole days from a to b. Positive when b is later. */
export function diffDays(a: DayKey, b: DayKey): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86_400_000);
}

/** Every day from start to end, inclusive. Empty if end is before start. */
export function eachDay(start: DayKey, end: DayKey): DayKey[] {
  const out: DayKey[] = [];
  const span = diffDays(start, end);
  for (let i = 0; i <= span && i < 3660; i++) out.push(addDays(start, i));
  return out;
}

/** "14 Dec" */
export function formatDay(key: DayKey | null | undefined): string {
  if (!key) return "";
  const d = parseDay(key);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** "Sat, 14 Dec" */
export function formatDayLong(key: DayKey | null | undefined): string {
  if (!key) return "";
  const d = parseDay(key);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

/** "Sat" */
export function formatWeekday(key: DayKey | null | undefined): string {
  if (!key) return "";
  const d = parseDay(key);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { weekday: "short" });
}

/** "14 – 17 Dec" within a month, "30 Dec – 2 Jan" across months. */
export function formatRange(start: DayKey | null | undefined, end: DayKey | null | undefined): string {
  if (!start || !end) return "";
  if (start === end) return formatDay(start);
  const a = parseDay(start);
  const b = parseDay(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "";
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()} – ${formatDay(end)}`;
  }
  return `${formatDay(start)} – ${formatDay(end)}`;
}

/**
 * A member's available days. New rows store an explicit JSON list of day keys
 * in `constraint_note`; older rows store a start/end range, optionally minus
 * blocked ranges. Returns a sorted, de-duplicated list either way.
 */
export function memberDays(m: {
  availability_start: string | null;
  availability_end: string | null;
  constraint_note: string | null;
  constraint_start: string | null;
  constraint_end: string | null;
}): DayKey[] {
  if (!m.availability_start || !m.availability_end) return [];

  let blocked: { start: DayKey; end: DayKey }[] = [];
  if (m.constraint_note) {
    try {
      const parsed: unknown = JSON.parse(m.constraint_note);
      if (Array.isArray(parsed)) {
        if (parsed.length > 0 && parsed.every(isDayKey)) {
          return Array.from(new Set(parsed as DayKey[])).sort();
        }
        blocked = parsed
          .filter(
            (r): r is { start: string; end: string } =>
              !!r && typeof r === "object" && isDayKey((r as { start?: unknown }).start) && isDayKey((r as { end?: unknown }).end),
          )
          .map((r) => ({ start: r.start, end: r.end }));
      }
    } catch {
      // Plain-text note (for example a late joiner's message). Not a date list.
    }
  }
  if (blocked.length === 0 && m.constraint_start && m.constraint_end) {
    blocked = [{ start: m.constraint_start.slice(0, 10), end: m.constraint_end.slice(0, 10) }];
  }

  return eachDay(m.availability_start.slice(0, 10), m.availability_end.slice(0, 10)).filter(
    (day) => !blocked.some((r) => day >= r.start && day <= r.end),
  );
}
