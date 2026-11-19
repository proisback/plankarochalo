"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";

/**
 * A silent screen recording of the real product, shown in a phone outline.
 * Plays only while it is on screen, never under reduced motion, and always
 * has a visible pause control. Regenerate it with scripts/record-demo.py.
 */
export function WalkthroughVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const userPaused = useRef(false);

  useEffect(() => {
    const video = ref.current;
    if (!video || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !userPaused.current) {
          video.play().catch(() => {
            // Autoplay refused (data saver, low power). The play button still works.
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  function toggle() {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      userPaused.current = false;
      video.play().catch(() => {});
    } else {
      userPaused.current = true;
      video.pause();
    }
  }

  return (
    <figure className="mx-auto w-full max-w-[300px]">
      <div className="relative rounded-[2rem] border-2 border-ink bg-ink p-1.5">
        <video
          ref={ref}
          className="block aspect-[39/76] w-full rounded-[1.5rem] bg-background object-cover"
          muted
          loop
          playsInline
          preload="none"
          poster="/demo-walkthrough.jpg"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          aria-label="Screen recording: a friend joins a trip, taps their dates, votes for Goa, holds to commit and gets the confirmed ticket."
        >
          <source src="/demo-walkthrough.mp4" type="video/mp4" />
        </video>
        <button
          type="button"
          onClick={toggle}
          className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full border border-ink bg-brand text-on-brand"
          aria-label={playing ? "Pause the recording" : "Play the recording"}
        >
          <Icon name={playing ? "pause" : "play"} className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>
      <figcaption className="label-mono mt-3 text-center">The real product, recorded. No sound.</figcaption>
    </figure>
  );
}
