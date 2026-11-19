import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session on every request.
 *
 * Server Components cannot write cookies, so an expired access token can only
 * be renewed here. `getUser()` is what triggers the refresh; the cookie
 * handlers below copy the new tokens onto both the request (for the page that
 * is about to render) and the response (for the browser).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run anything between creating the client and this call, and always
  // return supabaseResponse as it is: both are how the refreshed cookies reach
  // the browser. Dropping either signs people out at random.
  await supabase.auth.getUser();

  return supabaseResponse;
}
