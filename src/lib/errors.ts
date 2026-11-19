/**
 * An error whose message is already written for the person using the app.
 * Throw this when you know exactly what went wrong ("That place is no longer
 * on the list."). friendlyError() shows its message as it is.
 */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

/**
 * Turn a Supabase or network error into a sentence a person can act on.
 * Raw database messages ("new row violates row-level security policy...")
 * never reach the screen.
 */
export function friendlyError(error: unknown, fallback = "That didn't save. Check your connection and try again."): string {
  if (error instanceof UserFacingError) return error.message;
  const message =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "";
  const code = error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : "";
  const text = message.toLowerCase();

  if (!message) return fallback;
  if (text.includes("failed to fetch") || text.includes("networkerror") || text.includes("load failed")) {
    return "You seem to be offline. Check your connection and try again.";
  }
  if (text.includes("rate limit") || code === "over_request_rate_limit" || text.includes("too many")) {
    return "Too many attempts from this network. Wait a minute and try again.";
  }
  if (text.includes("row-level security") || code === "42501") {
    return "You don't have permission to do that on this trip.";
  }
  if (text.includes("jwt") || text.includes("session") || text.includes("not authenticated")) {
    return "Your session expired. Reload the page and try again.";
  }
  if (code === "23505" || text.includes("duplicate key")) {
    return "That already exists. Reload to see the latest.";
  }
  if (text.includes("email") && (text.includes("invalid") || text.includes("valid"))) {
    return "That email address doesn't look right.";
  }
  return fallback;
}
