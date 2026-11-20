import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";
import { formatRange } from "@/lib/dates";
import { parseDestination, plural } from "@/lib/format";
import { site } from "@/lib/site";
import { TripDashboard } from "./trip-dashboard";

/**
 * Look a trip up by its slug.
 *
 * Prefers the get_trip_by_slug database function, which works without giving
 * anonymous visitors read access to the whole trips table. Falls back to a
 * direct read until that function has been installed.
 * A missing trip returns null (404). Any other failure throws (error screen),
 * so an outage is never mistaken for a dead link.
 */
const getTrip = cache(async (slug: string): Promise<Trip | null> => {
  const supabase = await createClient();

  const viaFunction = await supabase.rpc("get_trip_by_slug", { p_slug: slug }).maybeSingle();
  if (!viaFunction.error) return (viaFunction.data as Trip | null) ?? null;

  const missing =
    viaFunction.error.code === "PGRST202" ||
    viaFunction.error.code === "42883" ||
    /could not find the function/i.test(viaFunction.error.message);
  if (!missing) throw new Error(viaFunction.error.message);

  const direct = await supabase.from("trips").select("*").eq("slug", slug).maybeSingle();
  if (direct.error) throw new Error(direct.error.message);
  return (direct.data as Trip | null) ?? null;
});

/** What a friend sees in the group chat before they tap: the trip, and the ask. */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  let trip: Trip | null = null;
  try {
    trip = await getTrip(slug);
  } catch {
    // Fall through to the generic preview. The page itself reports the error.
  }
  if (!trip) return { title: "Trip not found", robots: { index: false, follow: false } };

  const range = formatRange(trip.locked_dates_start, trip.locked_dates_end);
  const place = parseDestination(trip.locked_destination).name;
  const days = plural(trip.trip_days, "day");

  const ask: Record<Trip["status"], { title: string; description: string }> = {
    dates_open: {
      title: `${trip.name}: add your dates`,
      description: `A ${days} trip. Tap the days you're free. Takes 30 seconds, no sign-up.`,
    },
    destination_open: {
      title: `${trip.name}: vote on the place`,
      description: `Dates are locked: ${range}. Now vote on where to go. No sign-up.`,
    },
    commitment: {
      title: `${trip.name}: are you in?`,
      description: `${place}, ${range}. Say if you're in. Takes 10 seconds.`,
    },
    ready: {
      title: `${trip.name} is confirmed`,
      description: `${place}, ${range}. See who's going.`,
    },
  };
  const { title, description } = ask[trip.status];

  return {
    title,
    description,
    // Trip pages are private links. Keep them out of search results.
    robots: { index: false, follow: false },
    // Next replaces these objects rather than merging them with the root
    // layout's, so the image and site name have to be repeated here.
    openGraph: { title, description, type: "website", siteName: site.name, locale: "en_IN", images: [site.ogImage] },
    twitter: { card: "summary_large_image", title, description, images: [site.ogImage.url] },
  };
}

export default async function TripPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trip = await getTrip(slug);
  if (!trip) notFound();
  return <TripDashboard trip={trip} />;
}
