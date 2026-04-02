import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateTripForm } from "./create-trip-form";
import { ThemeToggle } from "@/app/theme-toggle";

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
    <main className="min-h-screen p-6 bg-hero relative">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <div className="max-w-lg mx-auto stagger">
        <div className="mb-6">
          <a
            href="/"
            className="inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors mb-4"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back
          </a>
          <h1 className="font-heading text-2xl font-bold text-text">Create a Trip</h1>
          <p className="text-text-secondary text-sm mt-1">
            Set up the basics, then share the link with your group.
          </p>
        </div>

        <div className="bg-surface rounded-2xl p-5 shadow-md border border-border-light">
          <CreateTripForm />
        </div>
      </div>
    </main>
  );
}
