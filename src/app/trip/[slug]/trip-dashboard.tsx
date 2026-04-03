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
import { ReturnPrompt } from "./return-prompt";
import { SinceYouLeft } from "./since-you-left";


export function TripDashboard({ trip: initialTrip }: { trip: Trip }) {
  const supabase = createClient();
  const [trip, setTrip] = useState(initialTrip);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [needsJoin, setNeedsJoin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showReturnPrompt, setShowReturnPrompt] = useState(false);
  const [prevMemberStatus, setPrevMemberStatus] = useState<string | null>(null);

  const isOrganizer = currentMember?.is_organizer ?? false;

  // Detect when the member completes an action (status changes)
  useEffect(() => {
    if (!currentMember) return;
    const newStatus = currentMember.status;
    if (prevMemberStatus && newStatus !== prevMemberStatus && newStatus !== "invited" && newStatus !== "no_response") {
      // Member just submitted something — show return prompt
      setShowReturnPrompt(true);
    }
    setPrevMemberStatus(newStatus);
  }, [currentMember?.status]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <div className="absolute top-[-15%] right-[-10%] w-[400px] h-[400px] rounded-full bg-primary/[0.06] blur-[90px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-pop/[0.04] blur-[70px] pointer-events-none" />

        <div className="w-full max-w-sm relative z-10 stagger">
          {/* Invitation header — emotional, not informational */}
          <div className="text-center mb-8">
            <span className="text-4xl block mb-3 animate-pop">🎒</span>
            <p className="text-text-secondary text-sm font-medium">You&apos;re invited!</p>
            <h1 className="font-heading text-[1.75rem] leading-tight font-extrabold text-text mt-1">
              {trip.name}
            </h1>
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1 bg-primary-light text-primary text-xs font-bold px-2.5 py-1 rounded-full">
                📅 {trip.trip_days} days
              </span>
              {members.length > 0 && (
                <span className="inline-flex items-center gap-1 bg-accent-light text-accent text-xs font-bold px-2.5 py-1 rounded-full">
                  👥 {members.length} joined
                </span>
              )}
            </div>
          </div>

          {/* Join card — THE action, front and center */}
          <div className="bg-surface rounded-2xl p-6 shadow-lg border border-border-light/60">
            <p className="text-center text-sm font-semibold text-text mb-4">
              Add your name to get started
            </p>
            <JoinPrompt tripId={trip.id} trip={trip} onJoined={handleJoined} />
          </div>

          {/* Compact "what happens next" — BELOW the action, not before */}
          <div className="mt-6 flex items-center justify-center gap-4 text-text-tertiary">
            {[
              { icon: "📅", label: "Pick dates" },
              { icon: "📍", label: "Vote place" },
              { icon: "✅", label: "Confirmed!" },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-base">{s.icon}</span>
                <span className="text-[10px] font-medium">{s.label}</span>
              </div>
            ))}
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
            className="text-xs text-text-secondary border border-border rounded-xl px-3 py-1.5 hover:bg-subtle active:scale-95 transition-all flex items-center gap-1"
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
                href="/create/new"
                className="text-xs text-text-secondary border border-border rounded-xl px-3 py-1.5 hover:bg-subtle active:scale-95 transition-all flex items-center gap-1"
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

        {/* Since you were here — return visit updates */}
        {currentMember && (
          <SinceYouLeft trip={trip} members={members} currentMember={currentMember} />
        )}

        {/* Locked decisions banners — only show on stages that don't display this info themselves */}
        {trip.status === "destination_open" && trip.locked_dates_start && trip.locked_dates_end && (
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

      {/* Return prompt — shows after member completes an action */}
      {showReturnPrompt && (
        <ReturnPrompt onDismiss={() => setShowReturnPrompt(false)} />
      )}
    </main>
  );
}
