"use client";

import { useState } from "react";

export function LockButton({
  label,
  confirmMessage,
  onLock,
}: {
  label: string;
  confirmMessage: string;
  onLock: () => Promise<void>;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await onLock();
    setLoading(false);
    setShowConfirm(false);
  }

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full bg-accent text-white rounded-xl px-4 py-3.5 text-sm font-semibold hover:bg-accent/90 transition-colors"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="bg-surface border border-gray-200 rounded-xl p-4 space-y-3">
      <p className="text-sm text-text">{confirmMessage}</p>
      <div className="flex gap-2">
        <button
          onClick={() => setShowConfirm(false)}
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Wait, not yet
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1 bg-accent text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Locking..." : "Lock it"}
        </button>
      </div>
    </div>
  );
}
