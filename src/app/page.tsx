import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If organizer is already logged in, go straight to create
  if (user && !user.is_anonymous) {
    redirect("/create");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="font-heading text-4xl font-bold text-primary mb-2">
            Plan Karo Chalo
          </h1>
          <p className="text-text-secondary">
            Align dates, pick a destination, lock in your group trip — all from
            one link.
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
