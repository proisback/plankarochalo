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
    <div className="bg-status-pending-bg border border-status-pending/20 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs text-status-pending font-medium mb-0.5">Share this link</p>
        <p className="text-xs text-text-secondary truncate">{url}</p>
      </div>
      <button
        onClick={handleCopy}
        className="shrink-0 text-xs font-medium text-status-pending hover:text-status-pending/80 transition-colors"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
