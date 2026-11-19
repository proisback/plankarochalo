import type { IconName } from "@/components/icons";

/** "₹8K", "₹1.5L". Compact Indian notation for per-person budgets. */
export function formatRupeesShort(amount: number): string {
  // 99,500 rounds to 100K, which is 1L: switch units just below the boundary.
  if (amount >= 99_500) {
    const lakhs = Math.round(amount / 10_000) / 10;
    return `₹${lakhs}L`;
  }
  if (amount < 1000) return `₹${Math.round(amount)}`;
  return `₹${Math.round(amount / 1000)}K`;
}

/** "₹8K – ₹15K" */
export function formatBudgetRange(min: number, max: number): string {
  return `${formatRupeesShort(min)} – ${formatRupeesShort(max)}`;
}

/** "₹12,500" with Indian digit grouping. */
export function formatRupees(amount: number): string {
  return `₹${new Intl.NumberFormat("en-IN").format(amount)}`;
}

/**
 * Destination kinds.
 *
 * The database stores an emoji per destination (`destination_options.emoji`)
 * and the locked destination as "<emoji> <name>". The interface never renders
 * the emoji itself: it maps it to one of our own icons. The emoji stays in the
 * data so older rows and the WhatsApp summary keep working unchanged.
 */
export const DESTINATION_KINDS: { emoji: string; icon: IconName; label: string }[] = [
  { emoji: "📍", icon: "pin", label: "Anywhere" },
  { emoji: "🏖️", icon: "beach", label: "Beach" },
  { emoji: "🏔️", icon: "mountain", label: "Mountains" },
  { emoji: "🌿", icon: "forest", label: "Nature" },
  { emoji: "🏯", icon: "heritage", label: "Heritage" },
  { emoji: "🌊", icon: "water", label: "River or lake" },
  { emoji: "🌴", icon: "island", label: "Island" },
  { emoji: "🏕️", icon: "camp", label: "Camping" },
  { emoji: "🎡", icon: "city", label: "City" },
  { emoji: "✈️", icon: "plane", label: "Far away" },
];

const VARIATION_SELECTOR = /\uFE0F/g;
const strip = (s: string) => s.replace(VARIATION_SELECTOR, "");

export function destinationIcon(emoji: string | null | undefined): IconName {
  if (!emoji) return "pin";
  const target = strip(emoji);
  return DESTINATION_KINDS.find((k) => strip(k.emoji) === target)?.icon ?? "pin";
}

/** Splits a stored "<emoji> <name>" into its icon and plain name. */
export function parseDestination(locked: string | null | undefined): { icon: IconName; name: string; emoji: string } {
  const value = (locked ?? "").trim();
  if (!value) return { icon: "pin", name: "", emoji: "" };
  const space = value.indexOf(" ");
  if (space > 0) {
    const head = value.slice(0, space);
    // A leading token with no letters or digits is the stored emoji.
    if (!/[\p{L}\p{N}]/u.test(head)) {
      return { icon: destinationIcon(head), name: value.slice(space + 1).trim(), emoji: head };
    }
  }
  return { icon: "pin", name: value, emoji: "" };
}

/** First name, for greetings. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

/** "1 person", "3 people" */
export function people(n: number): string {
  return `${n} ${n === 1 ? "person" : "people"}`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Copy text with a fallback for browsers or contexts without the Clipboard API. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}
