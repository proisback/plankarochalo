"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CreateTripForm } from "./create-trip-form";
import { ThemeToggle } from "@/app/theme-toggle";
import type { Trip } from "@/lib/types";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  dates_open: { label: "Active", color: "bg-status-confirmed/10 text-status-confirmed" },
  destination_open: { label: "Active", color: "bg-status-confirmed/10 text-status-confirmed" },
  commitment: { label: "Active", color: "bg-status-waiting/10 text-status-waiting" },
  ready: { label: "Completed", color: "bg-status-responded/10 text-status-responded" },
};

const STAGE_LABELS: Record<string, string> = {
  dates_open: "Picking dates",
  destination_open: "Voting on destination",
  commitment: "Confirming attendance",
  ready: "Trip confirmed",
};

export function MyTripsClient({ userId }: { userId: string }) {
  const supabase = createClient();
  const [trips, setTrips] = useState<(Trip & { member_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  async function loadTrips() {
    const { data } = await supabase
      .from("trips")
      .select("*, members(count)")
      .eq("organizer_id", userId)
      .order("created_at", { ascending: false });

    if (data) {
      setTrips(
        data.map((t) => ({
          ...t,
          member_count: (t.members as unknown as { count: number }[])?.[0]?.count ?? 0,
        }))
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    loadTrips();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="min-h-screen p-6 bg-hero">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl font-bold text-text">My Trips</h1>
            <p className="text-text-secondary text-sm mt-0.5">
              {trips.length > 0 ? `${trips.length} ${trips.length === 1 ? "trip" : "trips"}` : "Your trip dashboard"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {!showCreate && (
              <button
                onClick={() => setShowCreate(true)}
                className="bg-primary text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-sm hover:bg-primary-hover active:scale-[0.98] transition-all flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New trip
              </button>
            )}
          </div>
        </div>

        {/* Create form (collapsible) */}
        {showCreate && (
          <div className="mb-6 animate-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-bold text-text">Create a Trip</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Cancel
              </button>
            </div>
            <div className="bg-surface rounded-2xl p-5 shadow-md border border-border-light">
              <CreateTripForm onCreated={loadTrips} />
            </div>
          </div>
        )}

        {/* Trip list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : trips.length === 0 && !showCreate ? (
          <div className="bg-surface border border-border-light rounded-2xl p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <p className="text-text font-semibold">No trips yet</p>
            <p className="text-text-tertiary text-sm mt-1">Create your first trip and share the link with your group.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 bg-primary text-white rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm hover:bg-primary-hover active:scale-[0.98] transition-all"
            >
              Create your first trip
            </button>
          </div>
        ) : (
          <div className="space-y-3 stagger">
            {trips.map((trip) => {
              const status = STATUS_MAP[trip.status] ?? { label: "Active", color: "bg-subtle text-text-secondary" };
              const stage = STAGE_LABELS[trip.status] ?? trip.status;

              return (
                <a
                  key={trip.id}
                  href={`/trip/${trip.slug}`}
                  className="block bg-surface border border-border-light rounded-2xl p-4 shadow-xs card-hover hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-heading font-bold text-text text-sm">{trip.name}</h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-tertiary">
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                      {trip.trip_days} days
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                      </svg>
                      {trip.member_count} {trip.member_count === 1 ? "member" : "members"}
                    </span>
                    <span className="text-text-tertiary">{stage}</span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
