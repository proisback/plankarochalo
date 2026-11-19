import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewTripScreen } from "../create-trip-form";

export const metadata: Metadata = { title: "New trip" };

export default async function NewTripPage() {
  // redirect() works by throwing, so the user is read inside the try and the
  // redirect happens outside it.
  let organiser: { name: string } | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && !user.is_anonymous) {
      const meta = user.user_metadata ?? {};
      organiser = { name: String(meta.full_name || meta.name || user.email?.split("@")[0] || "") };
    }
  } catch {
    // Supabase unreachable or not configured. Treated as signed out.
  }
  if (!organiser) redirect("/login?next=/create/new");

  return <NewTripScreen defaultName={organiser.name} />;
}
