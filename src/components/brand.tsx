import { site } from "@/lib/site";

/**
 * The mark: a station name board on its two posts.
 * Fixed brand colours on purpose, so it reads the same in light and dark.
 */
export function Mark({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M9 21v7M23 21v7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="2.25" y="5.25" width="27.5" height="16.5" rx="2.25" fill="#FFC91F" stroke="#16140F" strokeWidth="2.5" />
      <path d="M8 11.25h16M10.5 16h11" stroke="#16140F" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** Mark plus name, for navigation bars. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-text ${className}`}>
      <Mark className="w-7 h-7 shrink-0" />
      <span className="font-heading text-[1.0625rem] font-extrabold uppercase leading-none tracking-wide">
        {site.name}
      </span>
    </span>
  );
}

/**
 * The full station board: Hindi on top, English below, the way every Indian
 * platform sign is lettered. Used once per page at most.
 */
export function StationBoard({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const scale = {
    sm: { pad: "px-4 py-2.5", deva: "text-sm", latin: "text-xl" },
    md: { pad: "px-6 py-4", deva: "text-lg", latin: "text-3xl" },
    lg: { pad: "px-8 py-6", deva: "text-2xl", latin: "text-5xl" },
  }[size];

  return (
    <div className={`board inline-flex flex-col items-center text-center ${scale.pad} ${className}`}>
      <span lang="hi" className={`font-deva font-bold leading-tight ${scale.deva}`}>
        {site.nameDeva}
      </span>
      <span className={`display ${scale.latin}`}>{site.name}</span>
    </div>
  );
}

/**
 * Rough ink edges for the .stamp class. Rendered once in the root layout.
 */
export function InkFilter() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
      <defs>
        <filter id="ink" x="-10%" y="-20%" width="120%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
