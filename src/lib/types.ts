// Database types matching supabase/schema.sql plus later migrations.

export type TripStatus = "dates_open" | "destination_open" | "commitment" | "ready";

export type MemberStatus = "invited" | "responded" | "confirmed_in" | "confirmed_out" | "no_response";

export interface Trip {
  id: string;
  name: string;
  slug: string;
  organizer_id: string;
  status: TripStatus;
  budget: string | null;
  trip_days: number;
  /** "YYYY-MM-DD" */
  locked_dates_start: string | null;
  locked_dates_end: string | null;
  /** Stored as "<emoji> <name>". Use parseDestination() to read it. */
  locked_destination: string | null;
  date_window_start: string | null;
  date_window_end: string | null;
  voting_deadline: string;
  /**
   * How many people the organiser expects in the group, proxies included.
   * Stages only lock by themselves once this many have joined and every real
   * member has answered. Null (or column absent on an un-migrated database)
   * means the organiser always locks by hand.
   */
  expected_size?: number | null;
  created_at: string;
  updated_at?: string;
}

export interface Member {
  id: string;
  trip_id: string;
  /** Null for proxy members the organiser answers for. */
  user_id: string | null;
  name: string;
  is_organizer: boolean;
  status: MemberStatus;
  availability_start: string | null;
  availability_end: string | null;
  destination_vote: string | null;
  /** JSON list of day keys (current), JSON list of blocked ranges (legacy), or free text. */
  constraint_note: string | null;
  constraint_start: string | null;
  constraint_end: string | null;
  budget_min: number | null;
  budget_max: number | null;
  is_proxy: boolean;
  created_at: string;
  updated_at?: string;
}

export interface DestinationOption {
  id: string;
  trip_id: string;
  name: string;
  note: string | null;
  emoji: string;
  added_by: string;
  vote_count: number;
  created_at: string;
}

/**
 * The four stations, in order. One name each, used everywhere:
 * the route line, My Trips, nudges and the WhatsApp summary.
 * `doing` reads as a trip state ("Picking dates"), `asked` completes
 * "3 of 6 have ..." and `ask` completes "Still to ...".
 */
export const STAGES: { key: TripStatus; label: string; doing: string; asked: string; ask: string }[] = [
  { key: "dates_open", label: "Dates", doing: "Picking dates", asked: "added their dates", ask: "add your dates" },
  { key: "destination_open", label: "Place", doing: "Choosing a place", asked: "voted on a place", ask: "vote on a place" },
  { key: "commitment", label: "Commit", doing: "Committing", asked: "said in or out", ask: "say if you're in" },
  { key: "ready", label: "Go", doing: "Trip confirmed", asked: "answered", ask: "check the plan" },
];

export function stageInfo(status: TripStatus) {
  return STAGES.find((s) => s.key === status) ?? STAGES[0];
}

/**
 * The organiser's member row. Identified by owning the trip, which the
 * database enforces. The is_organizer flag is only a fallback for rows where
 * the owner's user id is not visible.
 */
export function findOrganiser(trip: Pick<Trip, "organizer_id">, members: Member[]): Member | undefined {
  return members.find((m) => !!m.user_id && m.user_id === trip.organizer_id) ?? members.find((m) => m.is_organizer);
}

/** Has this member answered the question the trip is currently asking? */
export function hasAnswered(m: Member, stage: TripStatus): boolean {
  if (stage === "dates_open") return !!m.availability_start;
  if (stage === "destination_open") return !!m.destination_vote;
  if (stage === "commitment") return m.status === "confirmed_in" || m.status === "confirmed_out";
  return true;
}

/**
 * Where the group stands on the current question.
 * Proxies never block "everyone has answered": the organiser answers for them.
 */
export function stageProgress(trip: Pick<Trip, "status" | "expected_size">, members: Member[]) {
  const real = members.filter((m) => !m.is_proxy);
  const answered = members.filter((m) => hasAnswered(m, trip.status));
  const waiting = real.filter((m) => !hasAnswered(m, trip.status));
  const proxiesWaiting = members.filter((m) => m.is_proxy && !hasAnswered(m, trip.status));
  const expected = trip.expected_size ?? null;
  return {
    total: members.length,
    answered: answered.length,
    /** Real members who still owe an answer. */
    waiting,
    /** Proxies the organiser still has to answer for. */
    proxiesWaiting,
    /** Every real member who has joined has answered. */
    allJoinedAnswered: real.length > 0 && waiting.length === 0,
    /** People the organiser expects who have not opened the link yet. */
    notJoined: expected ? Math.max(expected - members.length, 0) : 0,
    /** Safe to lock without asking: the whole expected group is here and done. */
    complete: real.length > 0 && waiting.length === 0 && expected != null && members.length >= expected,
  };
}
