// Database types matching supabase/schema.sql

export type TripStatus =
  | "dates_open"
  | "destination_open"
  | "commitment"
  | "ready";

export type MemberStatus =
  | "invited"
  | "responded"
  | "confirmed_in"
  | "confirmed_out"
  | "no_response";

export interface Trip {
  id: string;
  name: string;
  slug: string;
  organizer_id: string;
  status: TripStatus;
  budget: string | null;
  trip_days: number;
  locked_dates_start: string | null;
  locked_dates_end: string | null;
  locked_destination: string | null;
  voting_deadline: string;
  created_at: string;
}

export interface Member {
  id: string;
  trip_id: string;
  user_id: string | null;
  name: string;
  is_organizer: boolean;
  status: MemberStatus;
  availability_start: string | null;
  availability_end: string | null;
  destination_vote: string | null;
  constraint_note: string | null;
  constraint_start: string | null;
  constraint_end: string | null;
  budget_min: number | null;
  budget_max: number | null;
  is_proxy: boolean;
  created_at: string;
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
