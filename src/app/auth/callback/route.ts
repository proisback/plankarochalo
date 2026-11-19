import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NEXT_COOKIE, loginPath, safeNext } from "@/app/login/safe-next";

/**
 * Where Google and the emailed sign-in link land. Swaps the one-time code for
 * a session, then sends the organiser on to where they were going.
 *
 * The destination comes from a short-lived cookie set by the sign-in form
 * (or from `?next=`, for links built by hand). Either way it is validated
 * before use: an unchecked value here would be an open redirect.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const cookieStore = await cookies();
  const remembered = cookieStore.get(NEXT_COOKIE)?.value;
  let fromCookie: string | null = null;
  if (remembered) {
    try {
      fromCookie = decodeURIComponent(remembered);
    } catch {
      fromCookie = null;
    }
  }
  const next = safeNext(searchParams.get("next") ?? fromCookie, origin);

  const finish = (path: string) => {
    const response = NextResponse.redirect(new URL(path, origin));
    if (remembered) response.cookies.delete(NEXT_COOKIE);
    return response;
  };

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return finish(next);
    } catch {
      // Supabase unreachable or not configured. Falls through to the error page.
    }
  }

  // No code (expired or already-used link, or the provider said no), or the
  // exchange failed (link opened in a different browser).
  return finish(loginPath(next, "auth_failed"));
}
