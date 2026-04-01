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
    try {
      await onLock();
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  }

  return (
    <>
      {/* trigger button */}
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full bg-[#E86A33] text-white rounded-xl px-4 py-3.5 text-sm font-bold font-[family-name:var(--font-outfit)] hover:bg-[#E86A33]/90 transition-colors shadow-sm"
      >
        {label}
      </button>

      {/* full-screen modal overlay */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="max-w-sm w-full mx-4 bg-white rounded-2xl p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* title */}
            <h3 className="text-[16px] font-bold text-text leading-snug">
              Are you sure?
            </h3>

            {/* description */}
            <p className="text-[13px] text-text-secondary mt-2 leading-relaxed">
              {confirmMessage}
            </p>

            {/* actions */}
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 bg-[#E86A33] text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-[#E86A33]/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Locking..." : "Lock it"}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-gray-100 text-text-secondary rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Wait, not yet
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
