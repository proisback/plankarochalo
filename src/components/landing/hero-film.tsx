"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";

/**
 * The 23-second launch film (brag-output/brag.mp4, re-encoded to 720p as
 * public/film.mp4). It starts muted while on screen, never under reduced
 * motion, and has visible play and sound controls. Turning sound on starts it
 * from the top so the music lines up with the cuts.
 */
export function HeroFilm() {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
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
      { threshold: 0.4 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  function togglePlay() {
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

  function toggleSound() {
    const video = ref.current;
    if (!video) return;
    if (video.muted) {
      video.muted = false;
      video.currentTime = 0;
      userPaused.current = false;
      video.play().catch(() => {});
    } else {
      video.muted = true;
    }
    setMuted(video.muted);
  }

  return (
    <figure className="w-full">
      <div className="overflow-hidden rounded-lg border-2 border-ink bg-ink">
        <video
          ref={ref}
          className="block aspect-video w-full bg-ink object-cover"
          muted
          loop
          playsInline
          preload="none"
          poster="/film.jpg"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          aria-label="Launch film, 23 seconds: a departure board of group trips that never left, then one trip moves through dates, place and commit, and its ticket turns confirmed."
        >
          <source src="/film.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="label-mono">The 23-second version, made from the product&apos;s own screens.</p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={toggleSound}
            className="btn btn-outline btn-sm"
            aria-pressed={!muted}
          >
            <Icon name={muted ? "sound-off" : "sound-on"} className="h-4 w-4" strokeWidth={2} />
            {muted ? "Sound on" : "Mute"}
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="btn btn-brand btn-sm w-11 px-0"
            aria-label={playing ? "Pause the film" : "Play the film"}
          >
            <Icon name={playing ? "pause" : "play"} className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>
      </div>
      <noscript>
        <a href="/film.mp4" className="link mt-2 block">
          Open the film
        </a>
      </noscript>
    </figure>
  );
}
