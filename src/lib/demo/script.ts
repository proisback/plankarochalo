/**
 * The demo trip and the five simulated friends who plan it with the visitor.
 *
 * The friends are scripted, not random: three have already answered when the
 * visitor arrives, one answers while the visitor is choosing dates (so the
 * calendar visibly updates live), and one always answers last, right after the
 * visitor does. That keeps the trip waiting on the visitor and nobody else,
 * which is the feeling the product is built around.
 */
import type { Member, Trip, DestinationOption } from "@/lib/types";
import { addDays, eachDay, parseDay, todayKey, type DayKey } from "@/lib/dates";
import type { DemoStore } from "./backend";

export const DEMO_TRIP_ID = "demo-trip";
export const DEMO_SLUG = "new-year-trip-k7x2";
export const VISITOR_USER_ID = "demo-user-visitor";
export const ORGANIZER_USER_ID = "demo-user-riya";

export interface DemoEvent {
  id: number;
  who: string;
  text: string;
}

type Friend = "riya" | "karthik" | "meher" | "zoya" | "dev";

const FRIENDS: Record<Friend, { name: string; userId: string }> = {
  riya: { name: "Riya", userId: ORGANIZER_USER_ID },
  karthik: { name: "Karthik", userId: "demo-user-karthik" },
  meher: { name: "Meher", userId: "demo-user-meher" },
  zoya: { name: "Zoya", userId: "demo-user-zoya" },
  dev: { name: "Dev", userId: "demo-user-dev" },
};

/** First Friday on or after the given day. */
function nextFriday(from: DayKey): DayKey {
  let day = from;
  for (let i = 0; i < 7; i++) {
    if (parseDay(day).getDay() === 5) return day;
    day = addDays(day, 1);
  }
  return day;
}

function span(start: DayKey, from: number, to: number): DayKey[] {
  return eachDay(addDays(start, from), addDays(start, to));
}

function availability(days: DayKey[]) {
  const sorted = [...days].sort();
  return {
    availability_start: sorted[0],
    availability_end: sorted[sorted.length - 1],
    constraint_note: JSON.stringify(sorted),
    status: "responded" as const,
  };
}

/** Each friend's free days, relative to the target Friday. */
function friendDays(fri: DayKey): Record<Friend, DayKey[]> {
  return {
    riya: [...span(fri, -1, 3), ...span(fri, 7, 9)],
    karthik: [...span(fri, 0, 2), ...span(fri, 7, 9)],
    meher: span(fri, 0, 3),
    zoya: [...span(fri, 0, 2), ...span(fri, 8, 9)],
    dev: span(fri, -1, 2),
  };
}

/** [min, max]: the most each friend is comfortable spending per person. */
const BUDGETS: Record<Friend, [number, number]> = {
  riya: [0, 20000],
  karthik: [0, 15000],
  meher: [0, 40000],
  zoya: [0, 20000],
  dev: [0, 15000],
};

export function seedDemo(store: DemoStore, today: DayKey = todayKey()) {
  const fri = nextFriday(addDays(today, 16));
  const days = friendDays(fri);
  const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

  const trip: Trip = {
    id: DEMO_TRIP_ID,
    name: "New Year trip, for real this time",
    slug: DEMO_SLUG,
    organizer_id: ORGANIZER_USER_ID,
    status: "dates_open",
    budget: null,
    trip_days: 3,
    locked_dates_start: null,
    locked_dates_end: null,
    locked_destination: null,
    date_window_start: addDays(fri, -4),
    date_window_end: addDays(fri, 12),
    voting_deadline: "none",
    expected_size: 6,
    created_at: minutesAgo(42),
    updated_at: minutesAgo(42),
  };

  const member = (key: Friend, minutes: number, answered: boolean, organizer = false): Member => ({
    id: `demo-member-${key}`,
    trip_id: DEMO_TRIP_ID,
    user_id: FRIENDS[key].userId,
    name: FRIENDS[key].name,
    is_organizer: organizer,
    status: "invited",
    availability_start: null,
    availability_end: null,
    destination_vote: null,
    constraint_note: null,
    constraint_start: null,
    constraint_end: null,
    budget_min: answered ? BUDGETS[key][0] : null,
    budget_max: answered ? BUDGETS[key][1] : null,
    is_proxy: false,
    created_at: minutesAgo(minutes),
    updated_at: minutesAgo(minutes),
    ...(answered ? availability(days[key]) : {}),
  });

  const option = (id: string, name: string, emoji: string, note: string, by: Friend, n: number): DestinationOption => ({
    id,
    trip_id: DEMO_TRIP_ID,
    name,
    emoji,
    note,
    added_by: `demo-member-${by}`,
    vote_count: 0,
    created_at: minutesAgo(40 - n),
  });

  store.userId = VISITOR_USER_ID;
  store.tables = {
    trips: [trip],
    members: [
      member("riya", 42, true, true),
      member("karthik", 38, true),
      member("meher", 31, true),
      member("zoya", 12, false),
      member("dev", 9, false),
    ],
    destination_options: [
      option("demo-opt-goa", "Goa", "🏖️", "Beach shacks, scooters, 1 hr flight", "riya", 0),
      option("demo-opt-gokarna", "Gokarna", "🌊", "Quieter beaches, overnight train", "karthik", 1),
      option("demo-opt-pondy", "Pondicherry", "🎡", "French quarter, cafes, cycling", "meher", 2),
      option("demo-opt-udaipur", "Udaipur", "🏯", "Lakes, forts, rooftop dinners", "riya", 3),
    ],
  };
}

/**
 * Jump the seeded trip straight to a later stage, with the visitor already a
 * member. `settled` also plays the friends' moves for that stage, leaving only
 * the visitor and Dev (who always follows the visitor) still to answer.
 */
export function fastForward(
  store: DemoStore,
  stage: Trip["status"],
  opts: { visitorName?: string; settled?: boolean } = {},
) {
  const trip = store.tables.trips[0];
  const fri = addDays(trip.date_window_start ?? todayKey(), 4);
  const days = friendDays(fri);
  const now = new Date().toISOString();
  const friends = Object.keys(FRIENDS) as Friend[];
  const byKey = (key: Friend) => store.tables.members.find((m) => m.id === `demo-member-${key}`)!;

  const visitor: Member = {
    id: "demo-member-visitor",
    trip_id: DEMO_TRIP_ID,
    user_id: VISITOR_USER_ID,
    name: opts.visitorName ?? "You",
    is_organizer: false,
    status: "invited",
    availability_start: null,
    availability_end: null,
    destination_vote: null,
    constraint_note: null,
    constraint_start: null,
    constraint_end: null,
    budget_min: null,
    budget_max: null,
    is_proxy: false,
    created_at: now,
    updated_at: now,
  };
  store.tables.members.push(visitor);

  const order: Trip["status"][] = ["dates_open", "destination_open", "commitment", "ready"];
  const reached = (s: Trip["status"]) => order.indexOf(stage) >= order.indexOf(s);
  const vote = (m: Member, optionId: string) => {
    m.destination_vote = optionId;
    const opt = store.tables.destination_options.find((o) => o.id === optionId);
    if (opt) opt.vote_count += 1;
  };

  if (stage === "dates_open" && opts.settled) {
    Object.assign(byKey("zoya"), availability(days.zoya), { budget_min: BUDGETS.zoya[0], budget_max: BUDGETS.zoya[1] });
  }

  if (reached("destination_open")) {
    for (const key of friends) {
      Object.assign(byKey(key), availability(days[key]), { budget_min: BUDGETS[key][0], budget_max: BUDGETS[key][1] });
    }
    Object.assign(visitor, availability(span(fri, 0, 3)), { budget_min: 0, budget_max: 20000 });
    trip.status = "destination_open";
    trip.locked_dates_start = fri;
    trip.locked_dates_end = addDays(fri, 2);
  }

  if (stage === "destination_open" && opts.settled) {
    vote(byKey("riya"), "demo-opt-goa");
    vote(byKey("meher"), "demo-opt-goa");
    vote(byKey("karthik"), "demo-opt-gokarna");
    vote(byKey("zoya"), "demo-opt-gokarna");
  }

  if (reached("commitment")) {
    vote(byKey("riya"), "demo-opt-goa");
    vote(byKey("meher"), "demo-opt-goa");
    vote(byKey("dev"), "demo-opt-goa");
    vote(visitor, "demo-opt-goa");
    vote(byKey("karthik"), "demo-opt-gokarna");
    vote(byKey("zoya"), "demo-opt-gokarna");
    trip.status = "commitment";
    trip.locked_destination = "🏖️ Goa";
  }

  if (stage === "commitment" && opts.settled) {
    for (const key of ["riya", "meher", "karthik", "zoya"] as Friend[]) byKey(key).status = "confirmed_in";
  }

  if (reached("ready")) {
    for (const key of ["riya", "meher", "karthik", "zoya"] as Friend[]) byKey(key).status = "confirmed_in";
    byKey("dev").status = "confirmed_out";
    visitor.status = "confirmed_in";
    trip.status = "ready";
  }
}

/**
 * Plays the simulated friends. Watches the store and schedules each friend's
 * next move for the stage the trip is in.
 */
export class DemoDirector {
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private done = new Set<string>();
  private unsubscribe: (() => void) | null = null;
  private tick: ReturnType<typeof setInterval> | null = null;
  private eventSeq = 0;
  private lastStatus: Trip["status"] | null = null;
  private fri: DayKey;

  constructor(
    private store: DemoStore,
    private onEvent: (e: DemoEvent) => void,
  ) {
    const window = store.tables.trips[0]?.date_window_start ?? todayKey();
    this.fri = addDays(window, 4);
  }

  start() {
    this.unsubscribe = this.store.subscribe(() => this.plan());
    this.tick = setInterval(() => this.plan(), 700);
    this.plan();
  }

  stop() {
    this.unsubscribe?.();
    if (this.tick) clearInterval(this.tick);
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
  }

  private get trip() {
    return this.store.tables.trips.find((t) => t.id === DEMO_TRIP_ID)!;
  }
  private member(key: Friend) {
    return this.store.tables.members.find((m) => m.id === `demo-member-${key}`)!;
  }
  private get visitor() {
    return this.store.tables.members.find((m) => m.user_id === VISITOR_USER_ID) ?? null;
  }

  private say(who: string, text: string) {
    this.eventSeq += 1;
    this.onEvent({ id: this.eventSeq, who, text });
  }

  /** Run `act` once, `delay` ms from now, identified by `key`. */
  private once(key: string, delay: number, act: () => void) {
    if (this.done.has(key)) return;
    this.done.add(key);
    const t = setTimeout(() => {
      this.timers.delete(t);
      act();
      this.store.advance(DEMO_TRIP_ID);
    }, delay);
    this.timers.add(t);
  }

  private patch(key: Friend, patch: Partial<Member>) {
    this.store.update("members", (r) => r.id === `demo-member-${key}`, patch as Record<string, unknown>);
  }

  /** True while the person at the keyboard is playing Riya. Her moves are then theirs to make. */
  private get playingOrganiser() {
    return this.store.userId === ORGANIZER_USER_ID;
  }

  private plan() {
    const trip = this.trip;
    if (!trip) return;
    const visitor = this.visitor;
    const days = friendDays(this.fri);

    // The organiser reopened a stage: let the friends answer it again.
    const order: Trip["status"][] = ["dates_open", "destination_open", "commitment", "ready"];
    if (this.lastStatus && order.indexOf(trip.status) < order.indexOf(this.lastStatus)) {
      const replay =
        trip.status === "dates_open"
          ? ["dates:", "vote:", "commit:"]
          : trip.status === "destination_open"
            ? ["vote:", "commit:"]
            : ["commit:"];
      for (const key of Array.from(this.done)) {
        if (replay.some((prefix) => key.startsWith(prefix))) this.done.delete(key);
      }
    }
    this.lastStatus = trip.status;

    if (trip.status === "dates_open") {
      // Zoya answers while the visitor is still looking at the calendar.
      if (visitor || this.store.userId === ORGANIZER_USER_ID) {
        this.once("dates:zoya", 6500, () => {
          if (this.member("zoya").availability_start) return;
          this.patch("zoya", { ...availability(days.zoya), budget_min: BUDGETS.zoya[0], budget_max: BUDGETS.zoya[1] });
          this.say("Zoya", "added her dates");
        });
      }
      // Dev is always last: he answers right after the visitor does.
      if (visitor?.availability_start || (!visitor && this.done.has("dates:zoya"))) {
        this.once("dates:dev", visitor ? 4200 : 11000, () => {
          if (this.member("dev").availability_start) return;
          this.patch("dev", { ...availability(days.dev), budget_min: BUDGETS.dev[0], budget_max: BUDGETS.dev[1] });
          this.say("Dev", "added his dates. That was everyone.");
        });
      }
      return;
    }

    if (trip.status === "destination_open") {
      const vote = (key: Friend, optionId: string, label: string, delay: number) =>
        this.once(`vote:${key}`, delay, () => {
          if (key === "riya" && this.playingOrganiser) return;
          if (this.member(key).destination_vote) return;
          this.patch(key, { destination_vote: optionId });
          this.say(FRIENDS[key].name, `voted ${label}`);
        });
      if (!this.playingOrganiser) vote("riya", "demo-opt-goa", "Goa", 2200);
      vote("karthik", "demo-opt-gokarna", "Gokarna", 4400);
      vote("meher", "demo-opt-goa", "Goa", 6400);
      vote("zoya", "demo-opt-gokarna", "Gokarna", 8600);

      // Dev sides with the visitor, so the visitor's vote decides the trip.
      // His choice is read when he votes, not when it was scheduled: the
      // visitor may have changed their mind in between.
      const sideWith = () =>
        this.visitor?.destination_vote === "demo-opt-gokarna" ? "demo-opt-gokarna" : "demo-opt-goa";
      if (visitor?.destination_vote || (!visitor && this.done.has("vote:zoya"))) {
        this.once("vote:dev", visitor ? 3200 : 11000, () => {
          if (this.member("dev").destination_vote) return;
          const pick = sideWith();
          this.patch("dev", { destination_vote: pick });
          this.say("Dev", `voted ${pick === "demo-opt-goa" ? "Goa" : "Gokarna"}.`);
        });
      }

      // If the visitor switches sides after Dev has voted, the count can end
      // level with everyone in. Dev follows them so the demo cannot get stuck.
      if (visitor?.destination_vote && this.member("dev").destination_vote) {
        const members = this.store.tables.members.filter((m) => !m.is_proxy);
        const options = this.store.tables.destination_options;
        const top = Math.max(0, ...options.map((o) => o.vote_count));
        const tied = options.filter((o) => o.vote_count === top && top > 0).length > 1;
        if (tied && members.every((m) => m.destination_vote) && this.member("dev").destination_vote !== sideWith()) {
          this.once(`vote:dev-follows:${visitor.destination_vote}`, 2200, () => {
            const pick = sideWith();
            if (this.member("dev").destination_vote === pick) return;
            this.patch("dev", { destination_vote: pick });
            this.say("Dev", `changed his vote to ${pick === "demo-opt-goa" ? "Goa" : "Gokarna"}.`);
          });
        }
      }
      return;
    }

    if (trip.status === "commitment") {
      const commit = (key: Friend, delay: number) =>
        this.once(`commit:${key}`, delay, () => {
          if (key === "riya" && this.playingOrganiser) return;
          if (this.member(key).status === "confirmed_in") return;
          this.patch(key, { status: "confirmed_in" });
          this.say(FRIENDS[key].name, "is in");
        });
      if (!this.playingOrganiser) commit("riya", 1600);
      commit("meher", 3400);
      commit("karthik", 5200);
      commit("zoya", 7200);

      // One realistic dropout, after the visitor has decided.
      const decided = visitor && (visitor.status === "confirmed_in" || visitor.status === "confirmed_out");
      if (decided || (!visitor && this.done.has("commit:zoya"))) {
        this.once("commit:dev", visitor ? 3000 : 10000, () => {
          this.patch("dev", { status: "confirmed_out" });
          this.say("Dev", "can't make it. The trip goes ahead without him.");
        });
      }
    }
  }
}
