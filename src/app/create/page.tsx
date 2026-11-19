import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MyTripsClient } from "./my-trips-client";

export const metadata: Metadata = { title: "My trips" };

export default async function CreatePage() {
  // redirect() works by throwing, so the user is read inside the try and the
  // redirect happens outside it.
  let organiser: { id: string; label: string } | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && !user.is_anonymous) {
      const meta = user.user_metadata ?? {};
      organiser = { id: user.id, label: String(meta.full_name || meta.name || user.email || "") };
    }
  } catch {
    // Supabase unreachable or not configured. Treated as signed out.
  }
  if (!organiser) redirect("/login?next=/create");

  return <MyTripsClient userId={organiser.id} signedInAs={organiser.label} />;
}
