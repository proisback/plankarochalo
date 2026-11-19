"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";

const HOLD_MS = 2000;

/**
 * The product's commit gesture, playable on the landing page.
 * Nothing is saved: it exists so a visitor can feel the difference between a
 * two-second hold and a thumbs-up.
 */
export function HoldDemo() {
  const [state, setState] = useState<"idle" | "holding" | "short" | "done">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hint = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (hint.current) clearTimeout(hint.current);
    },
    [],
  );

  function start() {
    if (state === "done" || state === "holding") return;
    if (hint.current) clearTimeout(hint.current);
    setState("holding");
    timer.current = setTimeout(() => {
      timer.current = null;
      setState("done");
    }, HOLD_MS);
  }

  function cancel() {
    if (!timer.current) return;
    clearTimeout(timer.current);
    timer.current = null;
    setState("short");
    hint.current = setTimeout(() => setState("idle"), 1600);
  }

  if (state === "done") {
    return (
      <div className="panel flex flex-col justify-center p-5" aria-live="polite">
        <div className="flex items-center gap-4">
          <span className="stamp animate-stamp text-2xl">In</span>
          <p className="text-[0.9375rem] leading-snug text-text">
            That is what a yes feels like here. A thumbs-up in a chat never cost you two seconds.
          </p>
        </div>
        <button type="button" onClick={() => setState("idle")} className="btn btn-quiet btn-sm -ml-3 mt-3 self-start">
          <Icon name="refresh" className="h-4 w-4" />
          Do it again
        </button>
      </div>
    );
  }

  return (
    <div className="panel p-5">
      <p className="label-mono">Try it. Nothing is saved.</p>
      <button
        type="button"
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
            e.preventDefault();
            start();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") cancel();
        }}
        aria-label="Hold for two seconds to say you're in. Demo only."
        className="relative mt-3 flex min-h-[64px] w-full select-none flex-col items-center justify-center overflow-hidden rounded-xl bg-primary px-4 text-on-primary [-webkit-touch-callout:none] [touch-action:none]"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 origin-left bg-accent"
          style={{
            transform: state === "holding" ? "scaleX(1)" : "scaleX(0)",
            transition: state === "holding" ? `transform ${HOLD_MS}ms linear` : "transform 180ms ease-out",
          }}
        />
        <span className={`relative font-heading text-lg font-bold ${state === "holding" ? "text-on-accent" : ""}`}>
          {state === "holding" ? "Keep holding" : state === "short" ? "A little longer" : "Hold to say I'm in"}
        </span>
        <span className={`relative text-xs ${state === "holding" ? "text-on-accent" : "opacity-70"}`}>
          Press and hold for 2 seconds
        </span>
      </button>
    </div>
  );
}
