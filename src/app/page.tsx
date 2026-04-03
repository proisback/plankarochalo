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

      {/* Decorative gradient blobs — layered for depth */}
      <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/[0.06] blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full bg-accent/[0.04] blur-[80px] pointer-events-none" />
      <div className="absolute top-[40%] left-[-20%] w-[300px] h-[300px] rounded-full bg-pop/[0.03] blur-[70px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 stagger">
        {/* Badge */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 bg-primary/8 text-primary rounded-full px-4 py-2 text-xs font-bold tracking-wide mb-6 shadow-xs">
            <span className="text-sm">🔥</span>
            No more &quot;bhai dates batao&quot;
          </span>

          <h1 className="font-heading text-[2.75rem] leading-[1.05] font-extrabold tracking-tight text-text">
            Plan Karo{" "}
            <span className="text-gradient">Chalo.</span>
          </h1>

          <p className="text-text-secondary text-[15px] leading-relaxed mt-4 max-w-[300px] mx-auto">
            One link. Everyone votes on dates, destination & budget. Trip confirmed. That simple.
          </p>
        </div>

        {/* Login card */}
        <div className="bg-surface rounded-2xl p-6 shadow-lg border border-border-light/80">
          <LoginForm />
        </div>

        {/* Social proof */}
        <p className="text-center text-text-tertiary text-xs mt-6">
          No app download needed &middot; Works on WhatsApp
        </p>
      </div>
    </main>
  );
}
