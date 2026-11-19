"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { Icon, Spinner } from "@/components/icons";
import { friendlyError } from "@/lib/errors";

/**
 * The organiser's lock control. Every lock goes through the same confirm sheet,
 * which says exactly what is being locked and who has not answered yet.
 *
 * `onLock` must throw (or reject) if the write fails. The sheet then stays open
 * and shows the error instead of closing as if it had worked.
 */
export function LockButton({
  label,
  title = "Lock this in?",
  confirmMessage,
  details,
  confirmLabel = "Lock it",
  onLock,
  variant = "primary",
  className = "",
}: {
  /** Text on the trigger button. */
  label: string;
  /** Heading of the confirm sheet. */
  title?: string;
  /** One or two sentences: what locking does. */
  confirmMessage: string;
  /** Extra facts shown as a list, for example "Not answered: Dev". */
  details?: string[];
  confirmLabel?: string;
  onLock: () => Promise<void>;
  variant?: "primary" | "outline";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setLoading(true);
    setError("");
    try {
      await onLock();
      setOpen(false);
    } catch (e) {
      setError(friendlyError(e, "Couldn't lock. Check your connection and try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className={`btn btn-block ${variant === "primary" ? "btn-primary btn-lg" : "btn-outline"} ${className}`}
      >
        <Icon name="lock" className="h-4 w-4 shrink-0" />
        <span className="min-w-0 truncate">{label}</span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={title} description={confirmMessage} dismissible={!loading}>
        {details && details.length > 0 && (
          <ul className="mb-4 space-y-1.5 border-l-2 border-border pl-3 text-sm text-text-secondary">
            {details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}
        {error && (
          <p role="alert" className="notice notice-stop mb-4">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setOpen(false)} disabled={loading} className="btn btn-outline">
            Not yet
          </button>
          <button type="button" onClick={handleConfirm} disabled={loading} className="btn btn-primary" data-autofocus>
            {loading ? (
              <>
                <Spinner /> Locking
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </Sheet>
    </>
  );
}
