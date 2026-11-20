"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";

/**
 * Modal surface: a bottom sheet on phones, a centred dialog from `sm` up.
 * Handles everything a dialog owes the user: focus moves in and is trapped,
 * Escape and a backdrop tap close it, the page behind does not scroll, and
 * focus returns to whatever opened it.
 *
 * Rendered into <body>. An ancestor with a transform (any element that has
 * played an entrance animation) becomes the containing block for
 * position:fixed, which would pin the sheet to that element instead of the
 * screen.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Set false while a request is in flight so the sheet cannot be closed mid-save. */
  dismissible?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const dismissibleRef = useRef(dismissible);
  dismissibleRef.current = dismissible;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !mounted) return;
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    // Prefer an element that asks for focus, otherwise the panel itself.
    (panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel)?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && dismissibleRef.current) {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      // The focused control was removed or disabled and focus fell to <body>.
      if (!panel?.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [open, mounted]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 animate-fade"
      style={{ background: "color-mix(in srgb, var(--color-ink) 55%, transparent)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && dismissible) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className="relative w-full max-h-[88dvh] overflow-y-auto bg-surface border-t border-border-strong rounded-t-3xl px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl outline-none animate-sheet sm:max-w-md sm:rounded-3xl sm:border sm:pt-5 sm:animate-scale"
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-border sm:hidden" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="font-heading text-xl font-bold leading-tight text-text">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-sm leading-snug text-text-secondary">
                {description}
              </p>
            )}
          </div>
          {dismissible && (
            <button type="button" onClick={onClose} className="icon-btn -mr-2 -mt-1 shrink-0" aria-label="Close">
              <Icon name="x" className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
