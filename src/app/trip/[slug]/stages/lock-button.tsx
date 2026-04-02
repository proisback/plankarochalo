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
        className="w-full bg-gradient-to-r from-primary to-[#F4845F] text-white rounded-2xl px-5 py-4 text-sm font-bold font-heading shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
      >
        {label}
      </button>

      {/* full-screen modal overlay */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="max-w-sm w-full mx-4 mb-4 sm:mb-0 bg-surface rounded-2xl p-6 shadow-xl animate-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* icon */}
            <div className="w-11 h-11 rounded-xl bg-primary-light flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>

            {/* title */}
            <h3 className="font-heading text-base font-bold text-text">
              Lock this in?
            </h3>

            {/* description */}
            <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">
              {confirmMessage}
            </p>

            {/* actions */}
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 bg-primary text-white rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Locking...
                  </span>
                ) : "Lock it"}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-stone-100 text-text-secondary rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-stone-200 active:scale-[0.98] transition-all"
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
