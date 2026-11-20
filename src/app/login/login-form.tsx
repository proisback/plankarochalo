"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { GoogleIcon, Icon, Spinner } from "@/components/icons";
import { loginPath, rememberNext, safeNext } from "./safe-next";

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkEmail(value: string): string {
  if (!value) return "Enter your email address.";
  if (!EMAIL_SHAPE.test(value)) return "That doesn't look like an email address. Check it for typos.";
  return "";
}

/**
 * Organiser sign-in: Google, or a one-time link by email. There is no
 * password. `next` rides along through the provider and back to
 * /auth/callback so the organiser lands where they were going.
 */
export function LoginForm({ signedInAs = null }: { signedInAs?: string | null }) {
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const linkFailed = searchParams.get("error") === "auth_failed";

  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [busy, setBusy] = useState<"email" | "google" | "signout" | null>(null);
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState("");
  const emailId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const sentRef = useRef<HTMLHeadingElement>(null);
  const refocus = useRef(false);

  // Screen readers hear the confirmation; coming back puts the cursor in the field.
  useEffect(() => {
    if (sentTo) sentRef.current?.focus();
    else if (refocus.current) inputRef.current?.focus();
  }, [sentTo]);

  // Coming back from Google with the Back button can restore this page from
  // the browser's cache with the buttons still disabled.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setBusy(null);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  function callbackUrl() {
    // Where to go after sign-in travels in a short-lived cookie, not in this
    // URL. Supabase only redirects to URLs on the project's allow-list, and an
    // added query string can stop an exact-match entry from matching, which
    // would break sign-in. The callback route reads the cookie and clears it.
    rememberNext(next);
    return `${window.location.origin}/auth/callback`;
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const address = email.trim();
    const problem = checkEmail(address);
    setFieldError(problem);
    if (problem) {
      inputRef.current?.focus();
      return;
    }

    setBusy("email");
    setError("");
    try {
      const { error: otpError } = await createClient().auth.signInWithOtp({
        email: address,
        options: { emailRedirectTo: callbackUrl() },
      });
      if (otpError) throw otpError;
      setSentTo(address);
    } catch (err) {
      setError(friendlyError(err, "We couldn't send the link. Check your connection and try again."));
    } finally {
      setBusy(null);
    }
  }

  async function handleGoogle() {
    if (busy) return;
    setBusy("google");
    setError("");
    try {
      const { error: oauthError } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl() },
      });
      if (oauthError) throw oauthError;
      // The browser is on its way to Google. Leave the button busy.
    } catch (err) {
      setError(friendlyError(err, "We couldn't reach Google. Check your connection and try again."));
      setBusy(null);
    }
  }

  async function handleSignOut() {
    if (busy) return;
    setBusy("signout");
    setError("");
    try {
      // This device only, as on My trips.
      const { error: signOutError } = await createClient().auth.signOut({ scope: "local" });
      if (signOutError) throw signOutError;
      window.location.assign(loginPath(next));
    } catch (err) {
      setError(friendlyError(err, "We couldn't sign you out. Check your connection and try again."));
      setBusy(null);
    }
  }

  if (sentTo) {
    return (
      <div className="animate-in">
        <p className="label-mono">Link sent</p>
        <h1
          ref={sentRef}
          tabIndex={-1}
          className="mt-2 font-heading text-[1.75rem] font-extrabold leading-[1.1] text-text outline-none [overflow-wrap:anywhere]"
        >
          Check {sentTo}.
        </h1>
        <p className="mt-3 text-[0.9375rem] text-text-secondary">
          The link opens in this browser and expires in an hour.
        </p>
        <button
          type="button"
          onClick={() => {
            refocus.current = true;
            setEmail("");
            setFieldError("");
            setSentTo("");
          }}
          className="btn btn-outline mt-6"
        >
          <Icon name="arrow-left" className="h-4 w-4" />
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="stagger">
      <p className="label-mono">For organisers</p>
      <h1 className="mt-2 font-heading text-[2.25rem] font-extrabold leading-[1.02] text-text">
        Start a trip. Share one link.
      </h1>
      <p className="mt-3 text-[0.9375rem] text-text-secondary">
        You sign in so the trip stays yours. Your friends never have to.
      </p>

      <div className="mt-7">
        {linkFailed && !error && signedInAs && (
          <div role="alert" className="notice notice-stop mb-4">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-status-out" />
            <div className="min-w-0 flex-1">
              <p>
                That sign-in link didn&apos;t work, so this browser is still signed in as{" "}
                <span className="font-semibold [overflow-wrap:anywhere]">{signedInAs}</span>.
              </p>
              <p className="mt-0.5 text-text-secondary">
                Links expire, and they only open in the browser you requested them from.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={next} className="btn btn-outline btn-sm">
                  Continue with this account
                </Link>
                <button type="button" onClick={handleSignOut} disabled={busy !== null} className="btn btn-quiet btn-sm">
                  {busy === "signout" ? <Spinner /> : <Icon name="logout" className="h-4 w-4" />}
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
        {linkFailed && !error && !signedInAs && (
          <p role="alert" className="notice notice-stop mb-4">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-status-out" />
            <span>
              That sign-in link didn&apos;t work. Links expire, and they only open in the browser you requested them
              from. Send a new one.
            </span>
          </p>
        )}
        {error && (
          <p role="alert" className="notice notice-stop mb-4">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-status-out" />
            <span>{error}</span>
          </p>
        )}

        <button type="button" onClick={handleGoogle} disabled={busy !== null} className="btn btn-outline btn-lg btn-block">
          {busy === "google" ? <Spinner className="h-5 w-5" /> : <GoogleIcon />}
          Continue with Google
        </button>

        <p className="rule label-mono my-5">or</p>

        <form onSubmit={handleEmail} noValidate>
          <label htmlFor={emailId} className="field-label">
            Email
          </label>
          <input
            ref={inputRef}
            id={emailId}
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldError) setFieldError(checkEmail(e.target.value.trim()));
            }}
            // An empty field is only a problem once they ask for a link:
            // someone heading for the Google button has not made a mistake.
            onBlur={() => setFieldError(email.trim() ? checkEmail(email.trim()) : "")}
            placeholder="you@example.com"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="send"
            required
            aria-invalid={!!fieldError}
            aria-describedby={fieldError ? errorId : undefined}
            className="field"
          />
          {fieldError && (
            <p id={errorId} className="field-error">
              {fieldError}
            </p>
          )}

          <button type="submit" disabled={busy !== null} className="btn btn-primary btn-lg btn-block mt-4">
            {busy === "email" ? (
              <>
                <Spinner /> Sending
              </>
            ) : (
              <>
                <Icon name="mail" className="h-4 w-4" />
                Email me a sign-in link
              </>
            )}
          </button>
        </form>
      </div>

      <p className="mt-8 border-t border-border pt-5 text-[0.8125rem] text-text-tertiary">
        Just here to look?{" "}
        <Link href="/demo" className="link inline-flex min-h-11 items-center">
          Try the live demo
        </Link>
      </p>
    </div>
  );
}
