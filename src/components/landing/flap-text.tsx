"use client";

import { useEffect, useState } from "react";

/**
 * Departure-board text that flips through a list of values.
 * Shows the first value on the server and under reduced motion.
 */
export function FlapText({
  values,
  interval = 3200,
  offset = 0,
  className = "",
}: {
  values: string[];
  interval?: number;
  /** Delay before the first flip, so rows on one board do not flip together. */
  offset?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (values.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      setIndex((i) => (i + 1) % values.length);
      timer = setInterval(() => setIndex((i) => (i + 1) % values.length), interval);
    }, interval + offset);
    return () => {
      clearTimeout(start);
      if (timer) clearInterval(timer);
    };
  }, [values.length, interval, offset]);

  return (
    <span className={`inline-block [perspective:300px] ${className}`}>
      {/* Screen readers get the first value only, not a stream of changes. */}
      <span className="sr-only">{values[0]}</span>
      <span key={index} aria-hidden="true" className="flap-in inline-block origin-top">
        {values[index]}
      </span>
    </span>
  );
}
