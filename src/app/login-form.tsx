"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  }

  if (sent) {
    return (
      <div className="bg-status-confirmed-bg border border-status-confirmed/20 rounded-xl p-6 text-center">
        <p className="text-status-confirmed font-medium">Check your email</p>
        <p className="text-text-secondary text-sm mt-1">
          We sent a login link to {email}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-text-secondary">
        Sign in to create and manage your trips
      </p>

      {/* Google OAuth — uncomment when enabled in Supabase
      <button
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-3 bg-surface border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        Continue with Google
      </button>
      */}

      {/* Divider — uncomment when Google OAuth is enabled
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-text-secondary">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
      */}

      <form onSubmit={handleEmailLogin} className="space-y-3">
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Sending link..." : "Send magic link"}
        </button>
      </form>

      {error && (
        <p className="text-status-out text-sm text-center">{error}</p>
      )}
    </div>
  );
}
