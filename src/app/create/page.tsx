import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MyTripsClient } from "./my-trips-client";

export default async function CreatePage() {
  let userId: string;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.is_anonymous) {
      redirect("/");
    }
    userId = user.id;
  } catch {
    redirect("/");
  }

  return <MyTripsClient userId={userId} />;
}
