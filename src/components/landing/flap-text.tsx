"use client";

import { useEffect, useState } from "react";

/**
 * Departure-board text that flips through a list of values, twice round, then
 * rests on the first one. Nothing on the page moves for ever without a way to
 * stop it. Shows the first value on the server and under reduced motion.
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
  const [step, setStep] = useState(0);
  const lastStep = values.length * 2;

  useEffect(() => {
    if (values.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      setStep(1);
      timer = setInterval(() => {
        setStep((s) => {
          if (s + 1 >= lastStep && timer) clearInterval(timer);
          return Math.min(s + 1, lastStep);
        });
      }, interval);
    }, interval + offset);
    return () => {
      clearTimeout(start);
      if (timer) clearInterval(timer);
    };
  }, [values.length, interval, offset, lastStep]);

  const index = step % values.length;

  return (
    <span className={`inline-block [perspective:300px] ${className}`}>
      {/* Screen readers get the first value only, not a stream of changes. */}
      <span className="sr-only">{values[0]}</span>
      <span key={step} aria-hidden="true" className="flap-in inline-block origin-top">
        {values[index]}
      </span>
    </span>
  );
}
