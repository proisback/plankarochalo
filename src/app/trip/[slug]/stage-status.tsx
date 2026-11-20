"use client";

import { useEffect, useState } from "react";
import type { Member, Trip } from "@/lib/types";
import { findOrganiser, hasAnswered, stageInfo, stageProgress } from "@/lib/types";
import { copyText, firstName } from "@/lib/format";
import { Sheet } from "@/components/sheet";
import { Icon, WhatsAppIcon } from "@/components/icons";

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function useTripUrl(slug: string, demo?: boolean) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl(`${window.location.origin}${demo ? "/demo" : `/trip/${slug}`}`);
  }, [slug, demo]);
  return url;
}

const wa = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

/* ── Nudge sheet ───────────────────────────────────────────────── */

function NudgeSheet({
  open,
  onClose,
  trip,
  members,
  url,
}: {
  open: boolean;
  onClose: () => void;
  trip: Trip;
  members: Member[];
  url: string;
}) {
  const [copied, setCopied] = useState<number | null>(null);
  const progress = stageProgress(trip, members);
  const stage = stageInfo(trip.status);
  const names = listNames(progress.waiting.map((m) => firstName(m.name)));
  const organiserRow = findOrganiser(trip, members);
  const organiser = organiserRow ? firstName(organiserRow.name) : "The organiser";
  const count = `${progress.answered} of ${progress.total}`;

  // These are messages for a WhatsApp group, so they are written the way people
  // text there. Whole sentences, never an English verb wedged into a template.
  const tones: { label: string; text: string }[] = [
    { label: "Friendly", text: `${names}, we're waiting on you for ${trip.name}. ${count} have ${stage.asked}. It takes 30 seconds.` },
    { label: "Cheeky", text: `${count} have ${stage.asked} for ${trip.name}. Still missing: ${names}. We see you 👀` },
    { label: "Quick", text: `${names}, 2 minute ka kaam hai. ${trip.name} ke liye bas aap reh gaye ho.` },
    { label: "Guilt trip", text: `${names}: the rest of us have ${stage.asked}. ${trip.name} is stuck until you do.` },
    { label: "Filmy", text: `${names}, jaldi karo yaar. Warna yeh plan bhi group chat mein hi reh jaayega.` },
    { label: "Last call", text: `Last call for ${trip.name}. ${organiser} can lock without you, so ${stage.ask} now if you want a say.` },
  ];

  async function handleCopy(i: number, text: string) {
    if (await copyText(`${text}\n${url}`)) {
      setCopied(i);
      setTimeout(() => setCopied(null), 1800);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Nudge ${names}`}
      description="Pick a tone. The trip link is added for you."
    >
      <ul className="space-y-2.5">
        {tones.map((t, i) => (
          <li key={t.label} className="panel p-3">
            <p className="label-mono">{t.label}</p>
            <p className="mt-1 text-[0.9375rem] leading-snug text-text">{t.text}</p>
            <div className="mt-2.5 flex gap-2">
              <a href={wa(`${t.text}\n${url}`)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-sm flex-1">
                <WhatsAppIcon className="h-4 w-4" />
                Send
              </a>
              <button type="button" onClick={() => handleCopy(i, t.text)} className="btn btn-outline btn-sm flex-1" aria-live="polite">
                <Icon name={copied === i ? "check" : "copy"} className="h-4 w-4" />
                {copied === i ? "Copied" : "Copy"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

/* ── Stage status ──────────────────────────────────────────────── */

/**
 * The line at the top of every stage that answers the three questions people
 * actually come back with: am I done, who are we waiting on, what happens next.
 *
 * It is also where the organiser locks. The lock control sits here, at the top,
 * not under the member list.
 */
export function StageStatus({
  trip,
  members,
  currentMember,
  isOrganizer,
  done,
  next,
  lock,
  demo,
}: {
  trip: Trip;
  members: Member[];
  currentMember: Member;
  isOrganizer: boolean;
  /** What I have done on this stage, once I have. "Your 6 dates are in." */
  done: string;
  /** What happens after this stage. "Once everyone answers, the dates lock and you vote on a place." */
  next: string;
  /**
   * The organiser's lock control, or null when there is nothing to lock yet.
   * Called with "primary" once everyone has answered and "outline" before that.
   */
  lock?: ((emphasis: "primary" | "outline") => React.ReactNode) | null;
  demo?: boolean;
}) {
  const [nudging, setNudging] = useState(false);
  const url = useTripUrl(trip.slug, demo);
  const progress = stageProgress(trip, members);
  const stage = stageInfo(trip.status);
  const mine = hasAnswered(currentMember, trip.status);
  const organiser = findOrganiser(trip, members);
  const organiserName = organiser ? firstName(organiser.name) : "the organiser";
  const others = progress.waiting.filter((m) => m.id !== currentMember.id);
  const otherNames = listNames(others.map((m) => firstName(m.name)));
  const iAmLast = !mine && others.length === 0 && members.length > 1;
  const solo = members.length <= 1;
  const tally = `${progress.answered} of ${progress.total} have ${stage.asked}`;

  const proxyLine =
    isOrganizer && progress.proxiesWaiting.length > 0 ? (
      <p className="mt-1.5 text-text-secondary">
        You still need to answer for {listNames(progress.proxiesWaiting.map((m) => firstName(m.name)))}. Open the group
        list below.
      </p>
    ) : null;

  const notJoinedLine =
    progress.notJoined > 0 ? (
      <p className="mt-1.5 text-text-secondary">
        You expected {trip.expected_size}. {progress.notJoined} {progress.notJoined === 1 ? "person hasn't" : "people haven't"}{" "}
        opened the link yet.
      </p>
    ) : null;

  let body: React.ReactNode;

  if (solo) {
    body = (
      <div className="notice notice-info">
        <Icon name="users" className="mt-0.5 h-4 w-4 shrink-0 text-status-responded" />
        <div>
          <p className="font-semibold">Only you so far.</p>
          <p className="mt-0.5 text-text-secondary">
            Send the link to the group. The best dates show up here as soon as two people have answered.
          </p>
        </div>
      </div>
    );
  } else if (progress.allJoinedAnswered) {
    body = (
      <div className="notice notice-go">
        <Icon name="check-circle" className="mt-0.5 h-4 w-4 shrink-0 text-status-confirmed" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {trip.expected_size != null && progress.notJoined === 0
              ? `Everyone has ${stage.asked}.`
              : `All ${progress.total} who've joined so far have ${stage.asked}.`}
          </p>
          {isOrganizer ? (
            <>
              {notJoinedLine}
              {proxyLine}
              {lock ? <div className="mt-3">{lock("primary")}</div> : <p className="mt-0.5 text-text-secondary">{next}</p>}
            </>
          ) : (
            <>
              <p className="mt-0.5 text-text-secondary">Waiting for {organiserName} to lock it. {next}</p>
              {url && (
                <a
                  href={wa(`${organiserName}, everyone here has ${stage.asked} for ${trip.name}. Lock it so we can move on.\n${url}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm mt-3"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  Ping {organiserName}
                </a>
              )}
            </>
          )}
        </div>
      </div>
    );
  } else if (mine) {
    body = (
      <div className="notice notice-wait">
        <Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0 text-status-waiting" />
        <div className="min-w-0 flex-1">
          <p>
            <span className="font-semibold">You&apos;re done.</span> {done}
          </p>
          <p className="mt-0.5 text-text-secondary">
            {others.length > 0 ? `Waiting on ${otherNames}. ` : ""}
            {next}
          </p>
          {proxyLine}
          <div className="mt-3 flex flex-wrap gap-2">
            {others.length > 0 && (
              <button type="button" onClick={() => setNudging(true)} className="btn btn-outline btn-sm">
                <Icon name="bell" className="h-4 w-4" />
                Nudge {others.length === 1 ? firstName(others[0].name) : "them"}
              </button>
            )}
          </div>
          {isOrganizer && lock && <div className="mt-2">{lock("outline")}</div>}
        </div>
      </div>
    );
  } else if (iAmLast) {
    body = (
      <div className="notice notice-wait">
        <Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0 text-status-waiting" />
        <p>
          <span className="font-semibold">Everyone else has {stage.asked}.</span> The trip is waiting on you.
        </p>
      </div>
    );
  } else {
    body = (
      <div>
        <p className="label-mono">{tally}</p>
        {isOrganizer && lock && <div className="mt-3">{lock("outline")}</div>}
      </div>
    );
  }

  return (
    <div aria-live="polite">
      {body}
      {url && <NudgeSheet open={nudging && others.length > 0} onClose={() => setNudging(false)} trip={trip} members={members} url={url} />}
    </div>
  );
}
