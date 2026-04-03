"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Trip, Member } from "@/lib/types";
import { JoinPrompt } from "./join-prompt";
import { ShareLink } from "./share-link";
import { ProgressBar } from "./progress-bar";
import { DatesStage } from "./stages/dates-stage";
import { DestinationStage } from "./stages/destination-stage";
import { CommitmentStage } from "./stages/commitment-stage";
import { ReadyStage } from "./stages/ready-stage";
import { ThemeToggle } from "@/app/theme-toggle";


export function TripDashboard({ trip: initialTrip }: { trip: Trip }) {
  const supabase = createClient();
  const [trip, setTrip] = useState(initialTrip);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [needsJoin, setNeedsJoin] = useState(false);
  const [loading, setLoading] = useState(true);

  const isOrganizer = currentMember?.is_organizer ?? false;

  const loadMembers = useCallback(async () => {
    const { data } = await supabase
      .from("members")
      .select("*")
      .eq("trip_id", trip.id)
      .order("created_at", { ascending: true });
    if (data) {
      setMembers(data);
      if (userId) {
        const updated = data.find((m) => m.user_id === userId);
        if (updated) setCurrentMember(updated);
      }
    }
  }, [supabase, trip.id, userId]);

  // Auth + initial data load
  useEffect(() => {
    async function init() {
      let { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        const { data, error: anonError } = await supabase.auth.signInAnonymously();
        if (anonError) {
          console.error("Anonymous sign-in failed:", anonError.message);
          setLoading(false);
          return;
        }
        user = data.user;
      }

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("No session after sign-in");
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: existingMember, error: memberError } = await supabase
        .from("members")
        .select("*")
        .eq("trip_id", trip.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingMember) {
        setCurrentMember(existingMember);
        await loadMembers();
      } else if (!memberError) {
        setNeedsJoin(true);
      } else {
        setNeedsJoin(true);
      }

      setLoading(false);
    }

    init();
  }, [supabase, trip.id, loadMembers]);

  // Realtime subscriptions
  useEffect(() => {
    if (!currentMember) return;

    const tripChannel = supabase
      .channel(`trip-${trip.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trips", filter: `id=eq.${trip.id}` },
        (payload) => setTrip(payload.new as Trip)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "members", filter: `trip_id=eq.${trip.id}` },
        () => loadMembers()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "destination_options", filter: `trip_id=eq.${trip.id}` },
        () => {}
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tripChannel);
    };
  }, [supabase, trip.id, currentMember, loadMembers]);

  function handleJoined(member: Member) {
    setCurrentMember(member);
    setNeedsJoin(false);
    loadMembers();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 animate-pulse-soft">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-text-tertiary text-sm">Loading trip...</p>
        </div>
      </main>
    );
  }

  if (needsJoin) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-hero relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[300px] h-[300px] rounded-full bg-primary/[0.04] blur-[60px] pointer-events-none" />

        <div className="w-full max-w-sm stagger relative z-10">
          <div className="text-center mb-6">
            <p className="text-text-secondary text-sm mb-2">You&apos;ve been invited to plan</p>
            <h1 className="font-heading text-2xl font-bold text-text">{trip.name}</h1>
            <div className="flex items-center justify-center gap-2 mt-2 text-xs text-text-tertiary">
              <span className="inline-flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                {trip.trip_days} days
              </span>
              <span className="text-border">&middot;</span>
              <span>{members.length > 0 ? `${members.length} joined` : "Be the first!"}</span>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-surface border border-border-light rounded-2xl p-4 mb-6 shadow-xs">
            <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-3">How it works</p>
            <div className="space-y-3">
              {[
                { emoji: "👋", title: "Join the trip", desc: "Add your name — takes 10 seconds" },
                { emoji: "📅", title: "Pick your dates & budget", desc: "Mark when you're free + set your budget range" },
                { emoji: "📍", title: "Vote on destination", desc: "Choose where to go — everyone gets a vote" },
                { emoji: "✅", title: "Trip confirmed", desc: "Dates locked, destination picked, you're all set" },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-lg shrink-0 mt-0.5">{step.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-text">{step.title}</p>
                    <p className="text-xs text-text-tertiary">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface rounded-2xl p-5 shadow-md border border-border-light">
            <JoinPrompt tripId={trip.id} trip={trip} onJoined={handleJoined} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-20">
      <div className="max-w-lg mx-auto px-4 pt-5 pb-6">
        {/* Nav */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => window.history.back()}
            className="text-xs text-text-secondary border border-border rounded-lg px-3 py-1.5 hover:bg-subtle active:scale-95 transition-all flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back
          </button>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isOrganizer && (
              <a
                href="/create"
                className="text-xs text-text-secondary border border-border rounded-lg px-3 py-1.5 hover:bg-subtle active:scale-95 transition-all flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New trip
              </a>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="font-heading text-xl font-bold text-text">{trip.name}</h1>
          </div>
          <span className="text-xs bg-primary-light text-primary px-2.5 py-1 rounded-full font-semibold">
            {trip.trip_days} days
          </span>
        </div>

        {/* Content with consistent spacing */}
        <div className="space-y-4 stagger">
        <ProgressBar currentStage={trip.status} />
        {trip.status !== "ready" && <ShareLink slug={trip.slug} />}

        {/* Locked decisions banners */}
        {trip.locked_dates_start && trip.locked_dates_end && (
          <div className="bg-status-confirmed-bg/60 border border-status-confirmed/10 rounded-xl px-4 py-3 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-status-confirmed/10 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-status-confirmed" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <p className="text-status-confirmed text-sm font-medium">
              Dates: {new Date(trip.locked_dates_start).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} — {new Date(trip.locked_dates_end).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
            </p>
          </div>
        )}
        {trip.locked_destination && (
          <div className="bg-status-confirmed-bg/60 border border-status-confirmed/10 rounded-xl px-4 py-3 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-status-confirmed/10 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-status-confirmed" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </div>
            <p className="text-status-confirmed text-sm font-medium">
              {trip.locked_destination}
            </p>
          </div>
        )}

        {/* Stage-specific content */}
        {trip.status === "dates_open" && (
          <DatesStage
            trip={trip}
            members={members}
            currentMember={currentMember!}
            isOrganizer={isOrganizer}
            onMembersUpdated={loadMembers}
          />
        )}
        {trip.status === "destination_open" && (
          <DestinationStage
            trip={trip}
            members={members}
            currentMember={currentMember!}
            isOrganizer={isOrganizer}
            onMembersUpdated={loadMembers}
          />
        )}
        {trip.status === "commitment" && (
          <CommitmentStage
            trip={trip}
            members={members}
            currentMember={currentMember!}
            isOrganizer={isOrganizer}
            onMembersUpdated={loadMembers}
          />
        )}
        {trip.status === "ready" && (
          <ReadyStage trip={trip} members={members} currentMember={currentMember!} />
        )}
        </div>
      </div>
    </main>
  );
}
