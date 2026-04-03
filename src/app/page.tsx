import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";
import { ThemeToggle } from "./theme-toggle";

export default async function Home() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user && !user.is_anonymous) {
      redirect("/create");
    }
  } catch {
    // Supabase not configured yet — render landing page anyway
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-hero relative overflow-hidden">
      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Decorative gradient blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-primary/[0.04] blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[300px] h-[300px] rounded-full bg-accent/[0.03] blur-[60px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 stagger">
        {/* Badge */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />
            Stop the WhatsApp chaos
          </span>

          <h1 className="font-heading text-[2.5rem] leading-[1.1] font-extrabold tracking-tight text-text">
            Plan Karo{" "}
            <span className="text-gradient">Chalo.</span>
          </h1>

          <p className="text-text-secondary text-[15px] leading-relaxed mt-3 max-w-[300px] mx-auto">
            Turn WhatsApp chaos into a confirmed trip. Vote on dates, destinations & budget together.
          </p>
        </div>

        {/* Login card */}
        <div className="bg-surface rounded-2xl p-6 shadow-md border border-border-light">
          <LoginForm />
        </div>

        {/* Footer hint */}
        <p className="text-center text-text-tertiary text-xs mt-6">
          No account needed for trip members
        </p>
      </div>
    </main>
  );
}
