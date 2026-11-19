/**
 * Where to send someone after sign-in.
 *
 * `next` arrives in a URL, so it is attacker-controlled. Only a path on this
 * site survives: it must start with a single "/", and it must still resolve to
 * our own origin once the URL parser has had its say (which is what catches
 * "/\evil.com", "/%09/evil.com" and friends). Anything else becomes /create.
 */
export const DEFAULT_NEXT = "/create";

// Any origin works for the check: a safe path resolves back onto it.
const PLACEHOLDER_ORIGIN = "http://pkc.invalid";

export function safeNext(raw: string | null | undefined, origin: string = PLACEHOLDER_ORIGIN): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return DEFAULT_NEXT;
  try {
    const url = new URL(raw, origin);
    if (url.origin !== origin) return DEFAULT_NEXT;
    // Sending a signed-in person back to sign-in would loop.
    if (url.pathname === "/login" || url.pathname.startsWith("/auth/")) return DEFAULT_NEXT;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_NEXT;
  }
}

/** Cookie that carries `next` across the trip to Google or the inbox and back. */
export const NEXT_COOKIE = "pkc_next";

/** Browser only. Remember where to go after sign-in for the next 15 minutes. */
export function rememberNext(next: string): void {
  const value = next === DEFAULT_NEXT ? "" : encodeURIComponent(next);
  const maxAge = value ? 900 : 0;
  document.cookie = `${NEXT_COOKIE}=${value}; path=/; max-age=${maxAge}; samesite=lax`;
}

/** "/login", carrying `next` only when it is not the default. */
export function loginPath(next: string, error?: string): string {
  const params = new URLSearchParams();
  if (error) params.set("error", error);
  if (next !== DEFAULT_NEXT) params.set("next", next);
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}
