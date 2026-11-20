"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, WhatsAppIcon } from "@/components/icons";
import { copyText, whatsappLink } from "@/lib/format";

function useTripUrl(slug: string, demo?: boolean) {
  // Resolved after mount so server and client render the same markup.
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl(`${window.location.origin}${demo ? "/demo" : `/trip/${slug}`}`);
  }, [slug, demo]);
  return url;
}

function useCopied() {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  async function copy(text: string) {
    const ok = await copyText(text);
    setState(ok ? "copied" : "failed");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2200);
  }
  return { state, copy };
}

export function inviteMessage(tripName: string, url: string) {
  return `${tripName}: tap the days you're free. Takes 30 seconds, no sign-up.\n${url}`;
}

/** Compact copy-link control for the top bar. */
export function ShareButton({ slug, demo }: { slug: string; demo?: boolean }) {
  const url = useTripUrl(slug, demo);
  const { state, copy } = useCopied();
  return (
    <button
      type="button"
      onClick={() => copy(url)}
      disabled={!url}
      className="btn btn-outline btn-sm"
      aria-live="polite"
    >
      <Icon name={state === "copied" ? "check" : "link"} className="h-4 w-4" />
      {state === "copied" ? "Link copied" : state === "failed" ? "Copy failed" : "Copy link"}
    </button>
  );
}

/**
 * The organiser's invite block: one tap to WhatsApp, or copy the link.
 * WhatsApp opens with the message already written.
 */
export function ShareLink({
  slug,
  tripName,
  demo,
}: {
  slug: string;
  tripName: string;
  demo?: boolean;
}) {
  const url = useTripUrl(slug, demo);
  const { state, copy } = useCopied();
  const waHref = url ? whatsappLink(inviteMessage(tripName, url)) : undefined;

  return (
    <section aria-label="Invite the group" className="panel p-4">
      <p className="label-mono">Invite the group</p>
      <p className="mt-1.5 truncate font-mono text-[0.8125rem] text-text-secondary" title={url}>
        {url ? url.replace(/^https?:\/\//, "") : " "}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!waHref}
          className="btn btn-whatsapp"
        >
          <WhatsAppIcon className="h-[18px] w-[18px]" />
          WhatsApp
        </a>
        <button type="button" onClick={() => copy(url)} disabled={!url} className="btn btn-outline" aria-live="polite">
          <Icon name={state === "copied" ? "check" : "copy"} className="h-4 w-4" />
          {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy link"}
        </button>
      </div>
      {state === "failed" && (
        <p className="field-error">Your browser blocked copying. Long-press the link above to copy it.</p>
      )}
    </section>
  );
}
