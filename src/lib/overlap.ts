import type { Member } from "./types";
import { type DayKey, addDays, memberDays } from "./dates";

export interface OverlapWindow {
  /** First day of the window, "YYYY-MM-DD". */
  start: DayKey;
  /** Last day of the window, inclusive. */
  end: DayKey;
  days: number;
  /** People free on every day of the window. This is the score that matters. */
  fullCount: number;
  /** Names of those people. */
  memberNames: string[];
  /** People who gave dates but cannot do the whole window. */
  missingNames: string[];
  /** Person-days covered inside the window. Tie-breaker. */
  totalCount: number;
}

export interface OverlapResult {
  /** Best window of exactly `tripDays` days at least two people can do in full. */
  best: OverlapWindow | null;
  /** Longest shorter window two people share, when no full-length one exists. */
  fallback: OverlapWindow | null;
  /** Day -> names of everyone free that day. Drives the calendar heat. */
  dateMap: Map<DayKey, string[]>;
  /** How many members have given any dates. */
  answered: number;
}

/**
 * Find the best N-day window for the group.
 *
 * A trip only works for the people who can make all of it, so a window is
 * scored by how many members are free on every one of its days. (Counting heads
 * per day is not enough: three people each free on two different days of a
 * three-day window give "2 people" every day and nobody for the whole trip.)
 *
 * Ranking: most people for the whole window, then most person-days covered
 * (so near-misses still count for something), then the earliest start.
 * A window needs at least two people to count.
 *
 * The advance_trip() database function implements the same ranking in SQL.
 * Change one and you must change the other.
 *
 * Works entirely on day keys, so the result is the same in every timezone.
 */
export function findBestOverlap(members: Member[], tripDays: number): OverlapResult {
  const people = members
    .map((m) => ({ id: m.id, name: m.name, days: new Set(memberDays(m)) }))
    .filter((p) => p.days.size > 0);

  const dateMap = new Map<DayKey, string[]>();
  for (const p of people) {
    for (const day of p.days) {
      const list = dateMap.get(day);
      if (list) list.push(p.name);
      else dateMap.set(day, [p.name]);
    }
  }

  const starts = Array.from(dateMap.keys()).sort();

  const bestOfLength = (length: number): OverlapWindow | null => {
    let winner: OverlapWindow | null = null;
    for (const start of starts) {
      const window = Array.from({ length }, (_, i) => addDays(start, i));
      const full: string[] = [];
      const missing: string[] = [];
      let total = 0;
      for (const p of people) {
        const covered = window.reduce((n, day) => n + (p.days.has(day) ? 1 : 0), 0);
        total += covered;
        if (covered === length) full.push(p.name);
        else missing.push(p.name);
      }
      if (full.length < 2) continue;
      if (
        !winner ||
        full.length > winner.fullCount ||
        (full.length === winner.fullCount && total > winner.totalCount)
      ) {
        winner = {
          start,
          end: window[length - 1],
          days: length,
          fullCount: full.length,
          memberNames: full,
          missingNames: missing,
          totalCount: total,
        };
      }
    }
    return winner;
  };

  const result: OverlapResult = { best: null, fallback: null, dateMap, answered: people.length };
  if (tripDays < 1 || people.length < 2) return result;

  result.best = bestOfLength(tripDays);
  if (!result.best) {
    for (let length = tripDays - 1; length >= 1 && !result.fallback; length--) {
      result.fallback = bestOfLength(length);
    }
  }
  return result;
}

/** True if the day falls inside the window. */
export function inWindow(day: DayKey, w: Pick<OverlapWindow, "start" | "end"> | null | undefined): boolean {
  return !!w && day >= w.start && day <= w.end;
}

/**
 * What the group can afford.
 *
 * Each member may share the most they are comfortable spending per person for
 * the whole trip (`budget_max`; older rows also carry a `budget_min`). The trip
 * has to fit the tightest budget, so the group's ceiling is the lowest maximum.
 * Individual answers are never shown, only this aggregate.
 *
 * Returns null until at least two people have answered, or if older ranged
 * answers do not meet (someone's minimum is above someone else's maximum).
 */
export function findBudgetOverlap(members: Member[]): { min: number; max: number; count: number } | null {
  const answered = members.filter((m) => m.budget_max != null);
  if (answered.length < 2) return null;

  const min = Math.max(...answered.map((m) => m.budget_min ?? 0));
  const max = Math.min(...answered.map((m) => m.budget_max!));

  if (min > max) return null;
  return { min, max, count: answered.length };
}

/** How many members have shared a budget at all. */
export function budgetAnswers(members: Member[]): number {
  return members.filter((m) => m.budget_max != null).length;
}
