import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/app/theme-toggle";
import { LoginForm } from "./login-form";
import { safeNext } from "./safe-next";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to start a trip. Your friends never need an account: they just open the link you share.",
};

function LoginSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading sign-in">
      <div className="skeleton h-3 w-28" />
      <div className="skeleton mt-3 h-10 w-4/5" />
      <div className="skeleton mt-4 h-4 w-full" />
      <div className="skeleton mt-8 h-[52px] w-full" />
      <div className="skeleton mt-10 h-11 w-full" />
      <div className="skeleton mt-4 h-[52px] w-full" />
    </div>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeNext(Array.isArray(params.next) ? params.next[0] : params.next);
  const linkFailed = params.error === "auth_failed";

  // redirect() works by throwing, so it has to stay outside the try.
  let signedInAs: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && !user.is_anonymous) signedInAs = user.email || String(user.user_metadata?.full_name || "another account");
  } catch {
    // Supabase unreachable or not configured. Show the page anyway.
  }
  // A failed link must not slip someone into the account this browser already
  // holds: a link opened in another browser lands here, and forwarding them on
  // would show another account's trips as if the link had worked.
  if (signedInAs && !linkFailed) redirect(next);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-4 py-2 lg:px-8">
        <Link href="/" aria-label="Plan Karo Chalo home">
          <Wordmark />
        </Link>
        <ThemeToggle />
      </header>

      <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-16 pt-6">
        <Suspense fallback={<LoginSkeleton />}>
          <LoginForm signedInAs={signedInAs} />
        </Suspense>
      </main>
    </div>
  );
}
