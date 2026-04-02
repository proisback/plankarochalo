"use client";

import { useState } from "react";

export function ShareLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/trip/${slug}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-status-pending-bg/50 border border-status-pending/10 rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 animate-in">
      <div className="min-w-0 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-status-pending/10 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-status-pending" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-status-pending font-semibold">Share with your group</p>
          <p className="text-[11px] text-text-tertiary truncate">{url}</p>
        </div>
      </div>
      <button
        onClick={handleCopy}
        className={[
          "shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all active:scale-95",
          copied
            ? "bg-status-confirmed/10 text-status-confirmed"
            : "bg-status-pending/10 text-status-pending hover:bg-status-pending/15",
        ].join(" ")}
      >
        {copied ? (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Copied
          </span>
        ) : "Copy"}
      </button>
    </div>
  );
}
