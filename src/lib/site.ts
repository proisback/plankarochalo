/**
 * Single source for everything that names the product or its author.
 * Change a link here and it changes on every page.
 */
export const site = {
  name: "Plan Karo Chalo",
  /** Devanagari wordmark line shown on the station board. */
  nameDeva: "प्लान करो चलो",
  description:
    "One link in the group chat. Everyone taps the dates they are free, votes on a place, and commits. No app and no sign-up for your friends.",
  /** Canonical origin. Set NEXT_PUBLIC_SITE_URL on Vercel if the domain changes. */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://plankarochalo.vercel.app").replace(/\/$/, ""),
  repo: "https://github.com/proisback/plankarochalo",
  /**
   * Show "Source on GitHub" on the public pages. Off until the research files
   * in the repository no longer name participants: the pages quote that
   * research as anonymised, and the repository is one click away.
   */
  linkRepo: false as boolean,
  author: {
    name: "Prateek",
    /** Optional. Leave empty to hide the link. */
    url: "",
  },
} as const;
