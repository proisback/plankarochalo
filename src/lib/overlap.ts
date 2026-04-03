import type { Member } from "./types";

interface OverlapWindow {
  start: Date;
  end: Date;
  minCount: number;
  totalCount: number;
  memberNames: string[];
}

/**
 * Find the best N-day window where the most members overlap.
 *
 * Algorithm (from memory.md):
 * 1. Build date→count map from all members' availability ranges
 * 2. Filter to dates where count >= 2
 * 3. Find consecutive runs of overlapping dates
 * 4. Slide a window of `tripDays` length, score by min overlap across window
 * 5. Return best window (or longest available if no window fits)
 */
export function findBestOverlap(
  members: Member[],
  tripDays: number
): { best: OverlapWindow | null; dateMap: Map<string, string[]> } {
  // Build date→member name map
  const dateMap = new Map<string, string[]>();

  for (const m of members) {
    if (!m.availability_start || !m.availability_end) continue;

    const start = new Date(m.availability_start);
    const end = new Date(m.availability_end);

    // Build constraint range to exclude
    const constraintStart = m.constraint_start ? new Date(m.constraint_start) : null;
    const constraintEnd = m.constraint_end ? new Date(m.constraint_end) : null;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      // Skip dates within the member's unavailable constraint window
      if (constraintStart && constraintEnd && d >= constraintStart && d <= constraintEnd) {
        continue;
      }

      const key = d.toISOString().split("T")[0];
      const existing = dateMap.get(key) || [];
      existing.push(m.name);
      dateMap.set(key, existing);
    }
  }

  // Get sorted dates where at least 2 members overlap
  const overlapDates = Array.from(dateMap.entries())
    .filter(([, names]) => names.length >= 2)
    .sort(([a], [b]) => a.localeCompare(b));

  if (overlapDates.length === 0) return { best: null, dateMap };

  // Find consecutive runs
  const runs: { dates: [string, string[]][] }[] = [];
  let currentRun: [string, string[]][] = [overlapDates[0]];

  for (let i = 1; i < overlapDates.length; i++) {
    const prevDate = new Date(overlapDates[i - 1][0]);
    const currDate = new Date(overlapDates[i][0]);
    const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      currentRun.push(overlapDates[i]);
    } else {
      runs.push({ dates: currentRun });
      currentRun = [overlapDates[i]];
    }
  }
  runs.push({ dates: currentRun });

  // Slide window of tripDays across each run
  let bestWindow: OverlapWindow | null = null;

  for (const run of runs) {
    if (run.dates.length < tripDays) continue;

    for (let i = 0; i <= run.dates.length - tripDays; i++) {
      const windowDates = run.dates.slice(i, i + tripDays);
      const counts = windowDates.map(([, names]) => names.length);
      const minCount = Math.min(...counts);
      const totalCount = counts.reduce((a, b) => a + b, 0);

      // All members who are available for ALL days in this window
      const memberSets = windowDates.map(([, names]) => new Set(names));
      const allDayMembers = Array.from(memberSets[0]).filter((name) =>
        memberSets.every((s) => s.has(name))
      );

      if (
        !bestWindow ||
        minCount > bestWindow.minCount ||
        (minCount === bestWindow.minCount && totalCount > bestWindow.totalCount)
      ) {
        bestWindow = {
          start: new Date(windowDates[0][0]),
          end: new Date(windowDates[windowDates.length - 1][0]),
          minCount,
          totalCount,
          memberNames: allDayMembers,
        };
      }
    }
  }

  // Fallback: if no window fits, return the longest run
  if (!bestWindow && runs.length > 0) {
    const longestRun = runs.reduce((a, b) =>
      a.dates.length > b.dates.length ? a : b
    );
    const windowDates = longestRun.dates;
    const memberSets = windowDates.map(([, names]) => new Set(names));
    const allDayMembers = Array.from(memberSets[0]).filter((name) =>
      memberSets.every((s) => s.has(name))
    );

    bestWindow = {
      start: new Date(windowDates[0][0]),
      end: new Date(windowDates[windowDates.length - 1][0]),
      minCount: Math.min(...windowDates.map(([, n]) => n.length)),
      totalCount: windowDates.reduce((sum, [, n]) => sum + n.length, 0),
      memberNames: allDayMembers,
    };
  }

  return { best: bestWindow, dateMap };
}

/**
 * Find the budget overlap ("sweet spot") across all members who submitted a range.
 * Returns the intersection of all ranges, or null if < 2 submissions or no overlap.
 */
export function findBudgetOverlap(
  members: Member[]
): { min: number; max: number; count: number } | null {
  const withBudget = members.filter(
    (m) => m.budget_min != null && m.budget_max != null
  );
  if (withBudget.length < 2) return null;

  const overlapMin = Math.max(...withBudget.map((m) => m.budget_min!));
  const overlapMax = Math.min(...withBudget.map((m) => m.budget_max!));

  if (overlapMin > overlapMax) return null;
  return { min: overlapMin, max: overlapMax, count: withBudget.length };
}
