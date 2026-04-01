import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TripDashboard } from "./trip-dashboard";

export default async function TripPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: trip } = await supabase
    .from("trips")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!trip) {
    notFound();
  }

  return <TripDashboard trip={trip} />;
}
