"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export function ReturnPrompt({ onDismiss }: { onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const touchStartY = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Animate in after a brief delay
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => dismiss(), 8000);
    return () => clearTimeout(timer);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(), 300);
  }, [onDismiss]);

  // Swipe down to dismiss
  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (deltaY > 50) dismiss(); // swiped down > 50px
  }

  async function handleBookmark() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          url: window.location.href,
        });
      } catch {
        // User cancelled share — that's fine
      }
    } else {
      // Fallback: copy link
      await navigator.clipboard.writeText(window.location.href);
    }
    dismiss();
  }

  if (!visible && !exiting) return null;

  return (
    <div
      className={[
        "fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4 pb-5 transition-all duration-300",
        visible && !exiting
          ? "translate-y-0 opacity-100"
          : "translate-y-full opacity-0",
      ].join(" ")}
    >
      <div
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="w-full max-w-sm bg-surface border border-border-light rounded-2xl shadow-xl p-4 space-y-3"
      >
        {/* Swipe indicator */}
        <div className="flex justify-center">
          <div className="w-8 h-1 rounded-full bg-border" />
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold text-text">
            You&apos;re done! 🎉
          </p>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">
            We&apos;ll update this page as others vote. Bookmark this link — it&apos;s your trip HQ 📌
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleBookmark}
            className="flex-1 bg-primary text-white rounded-xl px-4 py-2.5 text-xs font-bold shadow-sm hover:bg-primary-hover active:scale-[0.97] transition-all flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            Save / Share link
          </button>
          <button
            onClick={dismiss}
            className="px-3 py-2.5 rounded-xl text-xs font-medium text-text-tertiary hover:bg-subtle active:scale-[0.97] transition-all"
          >
            Got it
          </button>
        </div>

        {/* Auto-dismiss progress bar */}
        <div className="h-0.5 bg-subtle-hover rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/30 rounded-full"
            style={{
              animation: "shrink-bar 8s linear forwards",
            }}
          />
        </div>
      </div>
    </div>
  );
}
