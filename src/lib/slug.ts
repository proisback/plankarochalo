/**
 * Trip slugs: "<readable base>-<random suffix>", e.g. "goa-beach-trip-k7x2m9qd".
 *
 * The slug is the only thing guarding a trip (anyone with the link can join),
 * so the suffix comes from the crypto RNG and is long enough not to be guessed.
 */

/** Lowercase letters and digits, minus the look-alikes (0/o, 1/l/i). */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const SUFFIX_LENGTH = 8;
const BASE_MAX = 32;

function randomSuffix(length = SUFFIX_LENGTH): string {
  // Rejection sampling: bytes past the last full multiple of the alphabet
  // would make the early characters slightly more likely.
  const limit = 256 - (256 % ALPHABET.length);
  let out = "";
  while (out.length < length) {
    const bytes = new Uint8Array(length * 2);
    globalThis.crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte < limit && out.length < length) out += ALPHABET[byte % ALPHABET.length];
    }
  }
  return out;
}

/**
 * ASCII letters and digits joined by single hyphens, at most 32 characters.
 * A name with no ASCII letters or digits (for example one written in
 * Devanagari) falls back to "trip" instead of an empty base.
 */
export function slugBase(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // "Café" -> "Cafe"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, BASE_MAX)
    .replace(/-+$/, "");
  return base || "trip";
}

export function generateSlug(name: string): string {
  return `${slugBase(name)}-${randomSuffix()}`;
}
