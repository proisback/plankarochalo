/**
 * Generate a URL-friendly slug from a trip name.
 * Appends a short random suffix to avoid collisions.
 * Example: "Goa Beach Trip" → "goa-beach-trip-a3x9"
 */
export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 40);

  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}
