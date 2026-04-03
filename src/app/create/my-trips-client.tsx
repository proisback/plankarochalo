"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/app/theme-toggle";
import type { Trip } from "@/lib/types";

const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
  dates_open: { label: "Picking dates", color: "bg-status-confirmed/10 text-status-confirmed", dot: "bg-status-confirmed" },
  destination_open: { label: "Choosing place", color: "bg-status-pending/10 text-status-pending", dot: "bg-status-pending" },
  commitment: { label: "Confirming", color: "bg-status-waiting/10 text-status-waiting", dot: "bg-status-waiting" },
  ready: { label: "Confirmed", color: "bg-status-responded/10 text-status-responded", dot: "bg-status-responded" },
};

export function MyTripsClient({ userId }: { userId: string }) {
  const supabase = createClient();
  const [trips, setTrips] = useState<(Trip & { member_count: number; latest_member_name: string | null; latest_member_time: string | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  async function loadTrips() {
    const { data } = await supabase
      .from("trips")
      .select("*, members(count), latest_member:members(name, created_at, status, availability_start, destination_vote)")
      .eq("organizer_id", userId)
      .order("created_at", { ascending: false });

    if (data) {
      setTrips(
        data.map((t) => {
          const memberRows = t.latest_member as unknown as { name: string; created_at: string; status: string; availability_start: string | null; destination_vote: string | null }[] | null;
          // Find most recently active member (newest created_at)
          const sorted = (memberRows ?? []).sort((a, b) => b.created_at.localeCompare(a.created_at));
          const latest = sorted[0] ?? null;

          return {
            ...t,
            member_count: (t.members as unknown as { count: number }[])?.[0]?.count ?? 0,
            latest_member_name: latest?.name ?? null,
            latest_member_time: latest?.created_at ?? null,
          };
        })
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    loadTrips();
    // Get user name for greeting
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "");
      }
    }
    loadUser();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeTrips = trips.filter((t) => t.status !== "ready");
  const completedTrips = trips.filter((t) => t.status === "ready");

  return (
    <main className="min-h-screen pb-10 bg-hero">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <a href="/" className="font-heading text-lg font-bold text-gradient">
            Plan Karo Chalo
          </a>
          <ThemeToggle />
        </div>

        {/* Greeting + CTA */}
        <div className="mb-8 stagger">
          <p className="text-text-tertiary text-sm">
            {new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening"}{userName ? `, ${userName.split(" ")[0]}` : ""}
          </p>
          <h1 className="font-heading text-2xl font-extrabold text-text mt-0.5">
            My Trips
          </h1>

          {/* Stats row */}
          {trips.length > 0 && (
            <div className="flex gap-3 mt-4">
              <div className="flex-1 bg-surface border border-border-light rounded-xl px-3 py-2.5 shadow-xs">
                <p className="text-xl font-bold text-text tabular-nums">{trips.length}</p>
                <p className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">Total</p>
              </div>
              <div className="flex-1 bg-surface border border-border-light rounded-xl px-3 py-2.5 shadow-xs">
                <p className="text-xl font-bold text-status-confirmed tabular-nums">{activeTrips.length}</p>
                <p className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">Active</p>
              </div>
              <div className="flex-1 bg-surface border border-border-light rounded-xl px-3 py-2.5 shadow-xs">
                <p className="text-xl font-bold text-status-responded tabular-nums">{completedTrips.length}</p>
                <p className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">Done</p>
              </div>
            </div>
          )}

          {/* Create button */}
          <a
            href="/create/new"
            className="mt-4 w-full bg-gradient-to-r from-primary to-[#F4845F] text-white rounded-2xl px-5 py-3.5 text-sm font-bold font-heading shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create new trip
          </a>
        </div>

        {/* Trip list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : trips.length === 0 ? (
          <div className="bg-surface border border-border-light rounded-2xl p-8 text-center shadow-xs animate-in">
            <div className="w-14 h-14 rounded-2xl bg-primary-light flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <p className="font-heading font-bold text-text text-base">No trips yet</p>
            <p className="text-text-tertiary text-sm mt-1 max-w-[240px] mx-auto">
              Create your first trip and share the link with your group to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active trips */}
            {activeTrips.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-3">
                  Active ({activeTrips.length})
                </p>
                <div className="space-y-2.5">
                  {activeTrips.map((trip) => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </div>
              </div>
            )}

            {/* Completed trips */}
            {completedTrips.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-3">
                  Completed ({completedTrips.length})
                </p>
                <div className="space-y-2.5">
                  {completedTrips.map((trip) => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function TripCard({ trip }: { trip: Trip & { member_count: number; latest_member_name: string | null; latest_member_time: string | null } }) {
  const status = STATUS_MAP[trip.status] ?? { label: trip.status, color: "bg-subtle text-text-secondary", dot: "bg-text-tertiary" };
  const isCompleted = trip.status === "ready";

  const dateLabel = trip.locked_dates_start && trip.locked_dates_end
    ? `${new Date(trip.locked_dates_start).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – ${new Date(trip.locked_dates_end).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`
    : null;

  // Build last activity text
  let activityText: string;
  if (trip.latest_member_name && trip.latest_member_time && trip.latest_member_time !== trip.created_at) {
    const ago = timeAgo(trip.latest_member_time);
    activityText = `${ago} — ${trip.latest_member_name} joined`;
  } else {
    activityText = `Created ${new Date(trip.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`;
  }

  return (
    <a
      href={`/trip/${trip.slug}`}
      className={[
        "block bg-surface border rounded-2xl p-4 transition-all card-hover",
        isCompleted
          ? "border-border-light shadow-xs opacity-80 hover:opacity-100"
          : "border-border-light shadow-sm hover:shadow-md",
      ].join(" ")}
    >
      <div className="flex items-start justify-between mb-2.5">
        <div className="min-w-0 flex-1">
          <h3 className="font-heading font-bold text-text truncate">{trip.name}</h3>
          {trip.locked_destination && (
            <p className="text-xs text-text-secondary mt-0.5">{trip.locked_destination}</p>
          )}
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2 flex items-center gap-1 ${status.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot} ${!isCompleted ? "animate-pulse-soft" : ""}`} />
          {status.label}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-text-tertiary">
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          {dateLabel ?? `${trip.trip_days} days`}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          {trip.member_count} {trip.member_count === 1 ? "member" : "members"}
        </span>
      </div>

      {/* Last activity */}
      <p className="mt-2 text-[11px] text-text-tertiary flex items-center gap-1">
        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {activityText}
      </p>
    </a>
  );
}
