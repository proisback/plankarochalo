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
  /** Social preview image, shared by every page that sets its own title. */
  ogImage: { url: "/og.png", width: 1200, height: 630, alt: "Plan Karo Chalo: a group trip ticket marked confirmed" },
  author: {
    name: "Prateek",
    /** Optional. Leave empty to hide the link. */
    url: "https://proisback.github.io/my-portfolio/",
  },
} as const;
