import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateTripForm } from "./create-trip-form";

export default async function CreatePage() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.is_anonymous) {
      redirect("/");
    }
  } catch {
    redirect("/");
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">Create a Trip</h1>
          <p className="text-text-secondary text-sm mt-1">
            Set up the basics, then share the link with your group.
          </p>
        </div>

        <CreateTripForm />
      </div>
    </main>
  );
}
