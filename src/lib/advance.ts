import type { SupabaseClient } from "@supabase/supabase-js";
import type { DestinationOption, Member, Trip } from "./types";
import { findBestOverlap } from "./overlap";

/**
 * Move the trip to its next stage if the whole group has answered the current
 * one. Call this after any member saves dates, votes, or commits.
 *
 * "The whole group" needs a number: the organiser's expected group size. A
 * stage locks by itself only when that many people have joined and every real
 * member has answered. Without a size, "everyone who has opened the link so
 * far" could be two people out of eight, so nothing locks without the organiser.
 *
 * The decision is made by the `advance_trip` database function, which runs
 * with the rights to update the trip no matter who answered last. Only the
 * organiser may update a trip row directly, so without that function the stage
 * would only advance when the organiser happened to be the last to answer.
 *
 * If the function has not been installed yet (see
 * supabase/2026-11-20-server-side-advance.sql) this falls back to the direct
 * update, which keeps today's behaviour: it works when the caller is the
 * organiser and is a harmless no-op for everyone else.
 */
export async function advanceTrip(supabase: SupabaseClient, tripId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc("advance_trip", { p_trip_id: tripId });
    if (!error) return;
    const missing = error.code === "PGRST202" || error.code === "42883" || /could not find the function/i.test(error.message);
    if (!missing) return;
    await directAdvance(supabase, tripId);
  } catch {
    // Advancing is best-effort. The organiser can always lock the stage by hand.
  }
}

async function directAdvance(supabase: SupabaseClient, tripId: string): Promise<void> {
  const [{ data: trip }, { data: members }] = await Promise.all([
    supabase.from("trips").select("*").eq("id", tripId).single(),
    supabase.from("members").select("*").eq("trip_id", tripId),
  ]);
  if (!trip || !members) return;
  const t = trip as Trip;
  const all = members as Member[];
  const real = all.filter((m) => !m.is_proxy);
  if (real.length === 0) return;
  // No group size on the trip means the organiser locks every stage by hand.
  if (!t.expected_size || all.length < t.expected_size) return;

  if (t.status === "dates_open") {
    if (!real.every((m) => m.availability_start)) return;
    const { best } = findBestOverlap(all, t.trip_days);
    if (!best) return;
    await supabase
      .from("trips")
      .update({ status: "destination_open", locked_dates_start: best.start, locked_dates_end: best.end })
      .eq("id", tripId)
      .eq("status", "dates_open");
    return;
  }

  if (t.status === "destination_open") {
    if (!real.every((m) => m.destination_vote)) return;
    const { data: options } = await supabase
      .from("destination_options")
      .select("*")
      .eq("trip_id", tripId)
      .order("vote_count", { ascending: false });
    const opts = (options ?? []) as DestinationOption[];
    const top = opts[0]?.vote_count ?? 0;
    const leaders = opts.filter((o) => o.vote_count === top && top > 0);
    if (leaders.length !== 1) return;
    await supabase
      .from("trips")
      .update({ status: "commitment", locked_destination: `${leaders[0].emoji} ${leaders[0].name}` })
      .eq("id", tripId)
      .eq("status", "destination_open");
    return;
  }

  if (t.status === "commitment") {
    const decided = (m: Member) => m.status === "confirmed_in" || m.status === "confirmed_out";
    if (!real.every(decided)) return;
    if (!all.some((m) => m.status === "confirmed_in")) return;
    await supabase.from("trips").update({ status: "ready" }).eq("id", tripId).eq("status", "commitment");
  }
}
