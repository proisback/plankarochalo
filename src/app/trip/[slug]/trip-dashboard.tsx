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
      // Keep currentMember in sync so stages see fresh data
      if (userId) {
        const updated = data.find((m) => m.user_id === userId);
        if (updated) setCurrentMember(updated);
      }
    }
  }, [supabase, trip.id, userId]);

  // Auth + initial data load
  useEffect(() => {
    async function init() {
      // Ensure user has a session (anonymous if needed)
      let { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        const { data } = await supabase.auth.signInAnonymously();
        user = data.user;
      }

      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      // Check if user is already a member of this trip
      const { data: existingMember } = await supabase
        .from("members")
        .select("*")
        .eq("trip_id", trip.id)
        .eq("user_id", user.id)
        .single();

      if (existingMember) {
        setCurrentMember(existingMember);
        await loadMembers();
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
        () => {} // Destination stage handles its own refresh
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
        <div className="text-text-secondary text-sm">Loading trip...</div>
      </main>
    );
  }

  if (needsJoin) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="font-heading text-2xl font-bold">{trip.name}</h1>
            {trip.budget && (
              <p className="text-text-secondary text-sm mt-1">{trip.budget}</p>
            )}
          </div>
          <JoinPrompt tripId={trip.id} userId={userId!} onJoined={handleJoined} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-20">
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-heading text-xl font-bold">{trip.name}</h1>
            {trip.budget && (
              <p className="text-text-secondary text-xs mt-0.5">{trip.budget}</p>
            )}
          </div>
          <span className="text-xs bg-primary-light text-primary px-2.5 py-1 rounded-full font-medium">
            {trip.trip_days} days
          </span>
        </div>

        <ProgressBar currentStage={trip.status} />
        {trip.status !== "ready" && <ShareLink slug={trip.slug} />}

        {/* Locked decisions banner */}
        {trip.locked_dates_start && trip.locked_dates_end && (
          <div className="bg-status-confirmed-bg border border-status-confirmed/20 rounded-xl px-4 py-3">
            <p className="text-status-confirmed text-sm font-medium">
              Dates locked: {new Date(trip.locked_dates_start).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} — {new Date(trip.locked_dates_end).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
            </p>
          </div>
        )}
        {trip.locked_destination && (
          <div className="bg-status-confirmed-bg border border-status-confirmed/20 rounded-xl px-4 py-3">
            <p className="text-status-confirmed text-sm font-medium">
              Destination locked: {trip.locked_destination}
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
          />
        )}
        {trip.status === "destination_open" && (
          <DestinationStage
            trip={trip}
            members={members}
            currentMember={currentMember!}
            isOrganizer={isOrganizer}
          />
        )}
        {trip.status === "commitment" && (
          <CommitmentStage
            trip={trip}
            members={members}
            currentMember={currentMember!}
            isOrganizer={isOrganizer}
          />
        )}
        {trip.status === "ready" && (
          <ReadyStage trip={trip} members={members} />
        )}
      </div>
    </main>
  );
}
