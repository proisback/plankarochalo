/**
 * In-memory stand-in for the Supabase client, used only on /demo.
 *
 * The demo runs the real trip screens. Those screens talk to Supabase through
 * a small set of calls (select/insert/update with eq/order, two RPCs, auth and
 * realtime channels). This file implements exactly that surface over plain
 * arrays, so the demo never reads from or writes to the production database.
 *
 * Nothing here is persisted. Reloading the page resets the trip.
 */
import type { Trip, Member, DestinationOption } from "@/lib/types";
import { findBestOverlap } from "@/lib/overlap";

type Row = Record<string, unknown>;
type TableName = "trips" | "members" | "destination_options";
type Result<T> = { data: T; error: null } | { data: null; error: { message: string; code?: string } };

interface Tables {
  trips: Trip[];
  members: Member[];
  destination_options: DestinationOption[];
}

type ChangeEvent = "INSERT" | "UPDATE" | "DELETE";
type Listener = (table: TableName, event: ChangeEvent, row: Row) => void;

const LATENCY_MS = 140;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

let seq = 0;
export function demoId(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export class DemoStore {
  tables: Tables = { trips: [], members: [], destination_options: [] };
  /** The auth user the page is currently "signed in" as. */
  userId = "demo-user-visitor";
  private listeners = new Set<Listener>();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(table: TableName, event: ChangeEvent, row: Row) {
    // Realtime arrives after the write resolves, never inside it.
    setTimeout(() => {
      for (const fn of Array.from(this.listeners)) fn(table, event, row);
    }, 30);
  }

  rows(table: TableName): Row[] {
    return this.tables[table] as unknown as Row[];
  }

  insert(table: TableName, input: Row): Row {
    const now = new Date().toISOString();
    let row: Row;
    if (table === "members") {
      row = {
        id: demoId("m"),
        user_id: null,
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
        ...input,
      };
    } else if (table === "destination_options") {
      row = { id: demoId("d"), note: null, emoji: "📍", vote_count: 0, created_at: now, ...input };
    } else {
      row = {
        id: demoId("t"),
        status: "dates_open",
        budget: null,
        trip_days: 3,
        locked_dates_start: null,
        locked_dates_end: null,
        locked_destination: null,
        date_window_start: null,
        date_window_end: null,
        voting_deadline: "none",
        expected_size: null,
        created_at: now,
        updated_at: now,
        ...input,
      };
    }
    this.rows(table).push(row);
    this.emit(table, "INSERT", row);
    return row;
  }

  update(table: TableName, match: (r: Row) => boolean, patch: Row): Row[] {
    const changed: Row[] = [];
    for (const row of this.rows(table)) {
      if (!match(row)) continue;
      const before = { ...row };
      Object.assign(row, patch, { updated_at: new Date().toISOString() });
      changed.push(row);

      // Mirrors the on_vote_change trigger: keep vote_count in step with votes.
      if (table === "members" && "destination_vote" in patch && before.destination_vote !== row.destination_vote) {
        for (const opt of this.tables.destination_options) {
          if (opt.id === before.destination_vote) opt.vote_count = Math.max(opt.vote_count - 1, 0);
          if (opt.id === row.destination_vote) opt.vote_count += 1;
        }
        const touched = this.tables.destination_options.filter(
          (o) => o.id === before.destination_vote || o.id === row.destination_vote,
        );
        for (const opt of touched) this.emit("destination_options", "UPDATE", opt as unknown as Row);
      }
      this.emit(table, "UPDATE", row);
    }
    return changed;
  }

  /** Delete rows, with the same side effects the database has. */
  remove(table: TableName, match: (r: Row) => boolean): Row[] {
    const all = this.rows(table);
    const gone = all.filter(match);
    for (const row of gone) {
      all.splice(all.indexOf(row), 1);
      // Mirrors "on delete set null" on members.destination_vote.
      if (table === "destination_options") {
        for (const m of this.tables.members) {
          if (m.destination_vote === row.id) {
            m.destination_vote = null;
            this.emit("members", "UPDATE", m as unknown as Row);
          }
        }
      }
      // Mirrors the vote-count trigger when a member who had voted is removed.
      if (table === "members" && row.destination_vote) {
        const opt = this.tables.destination_options.find((o) => o.id === row.destination_vote);
        if (opt) {
          opt.vote_count = Math.max(opt.vote_count - 1, 0);
          this.emit("destination_options", "UPDATE", opt as unknown as Row);
        }
      }
      this.emit(table, "DELETE", row);
    }
    return gone;
  }

  /**
   * Mirrors the advance_trip() database function: move the trip to its next
   * stage once every real (non-proxy) member has answered the current one.
   */
  advance(tripId: string): Trip | null {
    const trip = this.tables.trips.find((t) => t.id === tripId);
    if (!trip) return null;
    const members = this.tables.members.filter((m) => m.trip_id === tripId);
    const real = members.filter((m) => !m.is_proxy);
    if (real.length === 0) return trip;
    if (!trip.expected_size || members.length < trip.expected_size) return trip;

    if (trip.status === "dates_open") {
      if (!real.every((m) => m.availability_start)) return trip;
      const { best } = findBestOverlap(members, trip.trip_days);
      if (!best) return trip;
      this.update("trips", (r) => r.id === tripId, {
        status: "destination_open",
        locked_dates_start: best.start,
        locked_dates_end: best.end,
      });
    } else if (trip.status === "destination_open") {
      if (!real.every((m) => m.destination_vote)) return trip;
      const options = this.tables.destination_options
        .filter((o) => o.trip_id === tripId)
        .sort((a, b) => b.vote_count - a.vote_count);
      const top = options[0]?.vote_count ?? 0;
      const leaders = options.filter((o) => o.vote_count === top && top > 0);
      if (leaders.length !== 1) return trip;
      this.update("trips", (r) => r.id === tripId, {
        status: "commitment",
        locked_destination: `${leaders[0].emoji} ${leaders[0].name}`,
      });
    } else if (trip.status === "commitment") {
      const decided = (m: Member) => m.status === "confirmed_in" || m.status === "confirmed_out";
      if (!real.every(decided)) return trip;
      if (!members.some((m) => m.status === "confirmed_in")) return trip;
      this.update("trips", (r) => r.id === tripId, { status: "ready" });
    }
    return this.tables.trips.find((t) => t.id === tripId) ?? null;
  }
}

/* ── Query builder ─────────────────────────────────────────────── */

class Query implements PromiseLike<Result<unknown>> {
  private op: "select" | "insert" | "update" | "delete" = "select";
  private filters: ((row: Row) => boolean)[] = [];
  private sort: { column: string; ascending: boolean } | null = null;
  private payload: Row | Row[] | null = null;
  private one: "single" | "maybe" | null = null;
  private max: number | null = null;

  constructor(
    private store: DemoStore,
    private table: TableName,
  ) {}

  /** Columns are ignored: rows are always returned whole. */
  select(columns?: string) {
    void columns;
    return this;
  }
  insert(rows: Row | Row[]) {
    this.op = "insert";
    this.payload = rows;
    return this;
  }
  update(patch: Row) {
    this.op = "update";
    this.payload = patch;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }
  neq(column: string, value: unknown) {
    this.filters.push((row) => row[column] !== value);
    return this;
  }
  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }
  order(column: string, opts?: { ascending?: boolean }) {
    this.sort = { column, ascending: opts?.ascending ?? true };
    return this;
  }
  limit(n: number) {
    this.max = n;
    return this;
  }
  single() {
    this.one = "single";
    return this;
  }
  maybeSingle() {
    this.one = "maybe";
    return this;
  }

  private matches = (row: Row) => this.filters.every((test) => test(row));

  private run(): Result<unknown> {
    let rows: Row[];
    if (this.op === "insert") {
      const input = Array.isArray(this.payload) ? this.payload : [this.payload as Row];
      rows = input.map((r) => this.store.insert(this.table, r));
    } else if (this.op === "update") {
      rows = this.store.update(this.table, this.matches, this.payload as Row);
    } else if (this.op === "delete") {
      rows = this.store.remove(this.table, this.matches);
    } else {
      rows = this.store.rows(this.table).filter(this.matches);
    }

    rows = rows.map((r) => ({ ...r }));
    if (this.sort) {
      const { column, ascending } = this.sort;
      rows.sort((a, b) => {
        const x = a[column] as string | number;
        const y = b[column] as string | number;
        return (x < y ? -1 : x > y ? 1 : 0) * (ascending ? 1 : -1);
      });
    }
    if (this.max != null) rows = rows.slice(0, this.max);

    if (this.one === "single") {
      return rows.length === 1
        ? { data: rows[0], error: null }
        : { data: null, error: { message: "Row not found", code: "PGRST116" } };
    }
    if (this.one === "maybe") return { data: rows[0] ?? null, error: null };
    return { data: rows, error: null };
  }

  then<A = Result<unknown>, B = never>(
    onFulfilled?: ((value: Result<unknown>) => A | PromiseLike<A>) | null,
    onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return wait(LATENCY_MS)
      .then(() => this.run())
      .then(onFulfilled, onRejected);
  }
}

/* ── Realtime channel ──────────────────────────────────────────── */

type PgFilter = { event: string; schema?: string; table: TableName; filter?: string };
type PgCallback = (payload: { eventType: ChangeEvent; new: Row; old: Row }) => void;

class Channel {
  private handlers: { filter: PgFilter; cb: PgCallback }[] = [];
  unsubscribe: (() => void) | null = null;

  constructor(private store: DemoStore) {}

  on(_type: string, filter: PgFilter, cb: PgCallback) {
    this.handlers.push({ filter, cb });
    return this;
  }

  subscribe(onStatus?: (status: "SUBSCRIBED") => void) {
    setTimeout(() => onStatus?.("SUBSCRIBED"), 0);
    this.unsubscribe = this.store.subscribe((table, event, row) => {
      for (const { filter, cb } of this.handlers) {
        if (filter.table !== table) continue;
        if (filter.event !== "*" && filter.event !== event) continue;
        if (filter.filter) {
          const [column, rest] = filter.filter.split("=eq.");
          if (String(row[column]) !== rest) continue;
        }
        cb({ eventType: event, new: { ...row }, old: {} });
      }
    });
    return this;
  }
}

/* ── Client ────────────────────────────────────────────────────── */

export function createDemoClient(store: DemoStore) {
  const user = () => ({
    id: store.userId,
    is_anonymous: true,
    email: null,
    user_metadata: {},
  });

  return {
    from(table: TableName) {
      return new Query(store, table);
    },

    async rpc(fn: string, args: Record<string, unknown>): Promise<Result<unknown>> {
      await wait(LATENCY_MS);
      if (fn === "join_trip") {
        const tripId = args.p_trip_id as string;
        const name = String(args.p_name ?? "").trim();
        if (!name) return { data: null, error: { message: "Name is required" } };
        const existing = store.tables.members.find((m) => m.trip_id === tripId && m.user_id === store.userId);
        if (existing) return { data: { ...existing }, error: null };
        const row = store.insert("members", { trip_id: tripId, user_id: store.userId, name });
        return { data: { ...row }, error: null };
      }
      if (fn === "trip_preview") {
        const trip = store.tables.trips.find((t) => t.slug === args.p_slug);
        if (!trip) return { data: null, error: null };
        const members = store.tables.members.filter((m) => m.trip_id === trip.id);
        return {
          data: {
            organizer_name: members.find((m) => m.is_organizer)?.name ?? null,
            member_count: members.length,
            names: members.slice(0, 8).map((m) => m.name.split(" ")[0]),
          },
          error: null,
        };
      }
      if (fn === "advance_trip") {
        const trip = store.advance(args.p_trip_id as string);
        return { data: trip ? { ...trip } : null, error: null };
      }
      return { data: null, error: { message: `Unknown function ${fn}`, code: "PGRST202" } };
    },

    channel(name: string) {
      void name;
      return new Channel(store);
    },

    removeChannel(channel: Channel) {
      channel.unsubscribe?.();
      return Promise.resolve("ok" as const);
    },

    auth: {
      async getUser() {
        return { data: { user: user() }, error: null };
      },
      async getSession() {
        return { data: { session: { user: user() } }, error: null };
      },
      async signInAnonymously() {
        return { data: { user: user(), session: { user: user() } }, error: null };
      },
      async signOut() {
        return { error: null };
      },
    },
  };
}

/* ── Singleton, so every component on /demo shares one trip ────── */

let store: DemoStore | null = null;
let client: ReturnType<typeof createDemoClient> | null = null;

export function getDemoStore(): DemoStore {
  if (!store) store = new DemoStore();
  return store;
}

export function getDemoClient() {
  if (!client) client = createDemoClient(getDemoStore());
  return client;
}

/** Throw the trip away and start again. */
export function resetDemoStore(): DemoStore {
  store = new DemoStore();
  client = createDemoClient(store);
  return store;
}

export function isDemoPath(pathname: string): boolean {
  return pathname === "/demo" || pathname.startsWith("/demo/");
}
