// Database tests for supabase/2026-11-20-hardening-and-advance.sql. Run with: npm run test:db
//
// Everything runs in memory on PGlite (Postgres compiled to WebAssembly). Nothing here connects to Supabase.
// The script builds the parts of Supabase the SQL expects (auth.uid(), the anon and authenticated roles, the
// default grants), applies schema.sql and the three fix files, then the migration, and plays out scenarios as
// different users through row level security. It also runs the real findBestOverlap() from src/lib against
// advance_trip() to show they pick the same dates. Exit code 1 if any check fails.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join as joinPath } from "node:path";
import { fileURLToPath } from "node:url";

const root = joinPath(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (file) => readFileSync(joinPath(root, file), "utf8").replace(/\r\n/g, "\n");
const migration = read("supabase/2026-11-20-hardening-and-advance.sql");

/** A switched-off block of the migration: the SQL between its markers, without the comment wrapper. */
function block(name) {
  const found = migration.match(new RegExp(`-- >>> BEGIN ${name}\\n/\\*\\n([\\s\\S]*?)\\n\\*/\\n-- <<< END ${name}`));
  if (!found) throw new Error(`Block "${name}" not found in the migration`);
  return found[1];
}

/* ── Bookkeeping ───────────────────────────────────────────────── */
let passed = 0;
let failed = 0;
function check(name, ok, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `  -> ${detail}`}`);
}
/** One numbered group of checks. A crash inside it is a failure, not the end of the run. */
const group = (name, fn) => fn().catch((e) => check(`${name}: crashed`, false, `${e.code ?? ""} ${e.message}`));

/* ── Database and "act as" helpers ─────────────────────────────── */
const db = new PGlite();

/** Superuser, like the Supabase SQL Editor: no row security, auth.uid() is null. */
const su = (sql, params) => db.query(sql, params).then((r) => r.rows);

/** Run a whole script. Returns the notices it raised. */
async function run(sql) {
  const notices = [];
  await db.exec(sql, { onNotice: (n) => notices.push(n.message) }).catch(async (e) => {
    await db.exec("rollback");
    throw e;
  });
  return notices;
}

/** Act as a signed-in user ({ id, anonymous }) or, with null, as the anon role. One transaction per call. */
async function as(user, fn) {
  const claims = user ? { sub: user.id, role: "authenticated", is_anonymous: user.anonymous } : { role: "anon" };
  await db.exec(
    `begin; set local role ${user ? "authenticated" : "anon"}; set local request.jwt.claim.sub = '${user?.id ?? ""}';` +
      ` set local request.jwt.claims = '${JSON.stringify(claims)}';`,
  );
  try {
    const out = await fn((sql, params) => db.query(sql, params).then((r) => r.rows));
    await db.exec("commit");
    return out;
  } catch (e) {
    await db.exec("rollback");
    throw e;
  }
}
const all = (user, sql, params) => as(user, (q) => q(sql, params));
const one = (user, sql, params) => all(user, sql, params).then((rows) => rows[0]);
/** The SQLSTATE a call fails with, or "no error". */
const err = (promise) => promise.then(() => "no error", (e) => e.code ?? String(e));

async function newUser(anonymous = true) {
  const id = randomUUID();
  await su("insert into auth.users (id) values ($1)", [id]);
  return { id, anonymous };
}
const slug = () => `trip-${randomUUID().slice(0, 8)}`;

/* ── Supabase scaffolding + the database as it is today ────────── */
async function bootstrap() {
  await run(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as
      $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    grant usage on schema auth, public to anon, authenticated, service_role;
    -- Supabase's defaults: every new table and function in public is open to these roles and row security
    -- does the restricting. This is why "revoke ... from public" alone is not enough on Supabase.
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
    create publication supabase_realtime;
  `);
  for (const file of ["schema.sql", "fix-rls-recursion.sql", "fix-anon-trip-read.sql", "fix-join-trip-function.sql"]) {
    await run(read(`supabase/${file}`));
  }
  // Columns and triggers that exist on the live database but in no SQL file.
  await run(`
    alter table trips add column date_window_start date, add column date_window_end date, add column updated_at timestamptz default now();
    alter table members add column budget_min integer, add column budget_max integer, add column updated_at timestamptz default now();
    create function live_touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
    create trigger live_trips_updated_at before update on trips for each row execute function live_touch_updated_at();
    create trigger live_members_updated_at before update on members for each row execute function live_touch_updated_at();
  `);
}

/* ── Fixtures ──────────────────────────────────────────────────── */
const PIN = String.fromCodePoint(0x1f4cd); // the round pushpin the SQL uses as the default
const BEACH = String.fromCodePoint(0x1f3d6, 0xfe0f);
/** What the join screen writes for a late joiner who cannot make the locked dates (the dash is an en dash). */
const LATE_NOTE = `Can't make locked dates 11 ${String.fromCodePoint(0x2013)} 13 Dec`;
const D = (n) => `2026-12-${String(n).padStart(2, "0")}`;
/** A member who picked days one by one (current format: a JSON list in constraint_note). */
const L = (name, ...ns) => ({
  name, availability_start: D(Math.min(...ns)), availability_end: D(Math.max(...ns)), constraint_note: JSON.stringify(ns.map(D)),
});
/** A member with a start..end range (older format). */
const R = (name, from, to, extra = {}) => ({ name, availability_start: D(from), availability_end: D(to), ...extra });

/** A trip made the way the app makes it: the organiser inserts the trip, then their own member row. */
async function makeTrip(days = 3) {
  const org = await newUser(false);
  const trip = await one(org, "insert into trips (name, slug, organizer_id, trip_days) values ('Goa trip', $1, $2, $3) returning id, slug", [slug(), org.id, days]);
  const me = await one(org, "insert into members (trip_id, user_id, name, is_organizer, status) values ($1, $2, 'Asha Rao', true, 'responded') returning *", [trip.id, org.id]);
  return { org, trip, me };
}
const join = (user, trip, name) => one(user, "select public.join_trip($1, $2) as m", [trip.id, name]).then((r) => r.m);
const advance = (user, tripId) =>
  one(user, "select status, locked_dates_start::text as s, locked_dates_end::text as e, locked_destination as dest from public.advance_trip($1)", [tripId]);
const saveDays = (user, memberId, ...ns) =>
  one(user, "update members set availability_start = $2, availability_end = $3, constraint_note = $4, status = 'responded' where id = $1 returning id",
    [memberId, D(Math.min(...ns)), D(Math.max(...ns)), JSON.stringify(ns.map(D))]);

/** A whole trip written straight into the tables, for cases about the data rather than about who may write it.
 *  The first member is the organiser. Once the migration has added the column, expected_size is the head count. */
let migrated = false;
async function seedTrip(days, specs, status = "dates_open") {
  const org = await newUser(false);
  const users = specs.map((s, i) => (s.is_proxy ? null : i === 0 ? org : { id: randomUUID(), anonymous: true }));
  const others = users.slice(1).filter(Boolean).map((u) => u.id);
  await su("insert into auth.users (id) select value::uuid from jsonb_array_elements_text($1::jsonb)", [JSON.stringify(others)]);
  const [{ id }] = await su("insert into trips (name, slug, organizer_id, trip_days, status) values ('Seeded trip', $1, $2, $3, $4) returning id", [slug(), org.id, days, status]);
  if (migrated) await su("update trips set expected_size = $2 where id = $1", [id, specs.length]);
  const rows = specs.map((s, i) => ({ status: "responded", ...s, trip_id: id, user_id: users[i]?.id ?? null, is_organizer: i === 0, is_proxy: !!s.is_proxy }));
  const members = await su(
    `insert into members (trip_id, user_id, name, is_organizer, is_proxy, status, availability_start, availability_end,
                          constraint_note, constraint_start, constraint_end, created_at)
     select r.trip_id, r.user_id, r.name, r.is_organizer, r.is_proxy, r.status, r.availability_start, r.availability_end,
            r.constraint_note, r.constraint_start, r.constraint_end, now() + x.ord * interval '1 second'
     from jsonb_array_elements($1::jsonb) with ordinality as x(j, ord), jsonb_populate_record(null::members, x.j) as r
     order by x.ord returning id, name`,
    [JSON.stringify(rows)],
  );
  return { id, org, users, members, rows };
}

/* ── The real TypeScript, to compare the SQL against ───────────── */
/** Loads src/lib/dates.ts and overlap.ts by stripping the types (needs Node 22.13 or newer). Null if it cannot. */
async function loadTypeScript() {
  const warn = process.emitWarning;
  process.emitWarning = () => {}; // Node's "stripTypeScriptTypes is experimental" notice
  try {
    const { stripTypeScriptTypes } = await import("node:module");
    const source = (file) => read(`src/lib/${file}`).replace(/^import .*$/gm, "");
    const js = stripTypeScriptTypes(`${source("dates.ts")}\n${source("overlap.ts")}`);
    return await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
  } catch (e) {
    console.log(`SKIP  comparing against src/lib/overlap.ts (could not load it: ${e.message})`);
    return null;
  } finally {
    process.emitWarning = warn;
  }
}
const tsWindow = (ts, rows, days) => {
  const best = ts.findBestOverlap(rows.map((r, i) => ({ id: String(i), ...r })), days).best;
  return best ? `${best.start}..${best.end}` : "none";
};
const sqlWindow = (r) => (r.status === "destination_open" ? `${r.s}..${r.e}` : r.status === "dates_open" && !r.s ? "none" : "?");

/** Seeded random integers below n (a plain linear congruential generator), so a failing case can be reproduced. */
const random = (seed) => (n) => Math.floor(((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296) * n);
/** A member in one of the shapes the app has ever written, plus notes that are odd on purpose. */
function randomMember(pick, i) {
  const from = 2 + pick(8);
  const base = { name: `M${i}`, is_proxy: i > 0 && pick(5) === 0, availability_start: D(from), availability_end: D(from + pick(7) - 1) };
  const [a, span] = [1 + pick(12), pick(4)];
  const odd = ["Can't make it", "12", "[]", "null", `["${D(a)}", 7]`, `{"start":"${D(a)}"}`, `["${D(a)}","2026-02-31"]`];
  switch (pick(8)) {
    case 0: case 1: case 2: return { ...base, ...L(base.name, ...Array.from({ length: 1 + pick(7) }, () => 1 + pick(12))) }; // unsorted, may repeat
    case 3: return base;
    case 4: return { ...base, constraint_start: D(a), constraint_end: D(a + span), constraint_note: "Dec 3 - Dec 5 unavailable" };
    case 5: return { ...base, constraint_note: JSON.stringify([{ start: D(a), end: D(a + span) }, "junk", { start: 5 }]), constraint_start: D(1), constraint_end: D(2) };
    case 6: return { ...base, constraint_note: odd[pick(odd.length)], constraint_start: pick(2) ? D(a) : null, constraint_end: D(a + span) };
    default: return { ...base, availability_end: null }; // has a start, so "answered", but no usable days
  }
}

/* ── Scenarios ─────────────────────────────────────────────────── */
async function scenarios(phase, ts, seed) {
  const T = (name, ok, detail) => check(`[${phase}] ${name}`, ok, detail);
  const [A, B] = [await makeTrip(), await makeTrip()];
  const [riya, dev, sam, eve] = [await newUser(), await newUser(), await newUser(), await newUser()];
  const mRiya = await join(riya, A.trip, "  Riya Shah \n");
  const memberCount = (trip) => su("select count(*)::int as n from members where trip_id = $1", [trip.id]).then((r) => r[0].n);

  await group("1 join_trip", async () => {
    T("1a anon cannot call join_trip", (await err(join(null, A.trip, "Ghost"))) === "42501");
    T("1b a signed-in anonymous visitor can join, with the name trimmed",
      mRiya.name === "Riya Shah" && mRiya.user_id === riya.id && mRiya.trip_id === A.trip.id && !mRiya.is_organizer && !mRiya.is_proxy);
    const again = await join(riya, A.trip, "Someone Else");
    T("1c calling it twice returns the same row", again.id === mRiya.id && again.name === "Riya Shah" && (await memberCount(A.trip)) === 2);
    const codes = [];
    for (const bad of ["", "  \t\n ", null]) codes.push(await err(join(dev, A.trip, bad)));
    T("1d an empty or whitespace name is rejected", codes.every((c) => c === "22023") && (await memberCount(A.trip)) === 2, codes.join());
    T("1e a 200-character name is cut to 50", (await join(dev, A.trip, "x".repeat(200))).name === "x".repeat(50));
    T("1f the authenticated role without a user id is rejected", (await err(join({ id: "", anonymous: true }, A.trip, "Nobody"))) === "28000");
    const solo = await newUser(false);
    const soloTrip = await one(solo, "insert into trips (name, slug, organizer_id) values ('Solo', $1, $2) returning id", [slug(), solo.id]);
    T("1g join_trip sets is_organizer only for the trip's organiser", (await join(solo, soloTrip, "Org")).is_organizer === true);
  });

  await group("2 direct inserts into members", async () => {
    const insert = (user, cols, vals, params) => err(one(user, `insert into members (${cols}) values (${vals})`, params));
    T("2a a visitor cannot insert a member row directly", (await insert(eve, "trip_id, user_id, name", "$1, $2, 'Eve'", [A.trip.id, eve.id])) === "42501");
    T("2b a member cannot insert a proxy row", (await insert(riya, "trip_id, name, is_proxy", "$1, 'Fake', true", [A.trip.id])) === "42501");
    T("2c another trip's organiser cannot insert themselves", (await insert(B.org, "trip_id, user_id, name", "$1, $2, 'Other'", [A.trip.id, B.org.id])) === "42501");
    const nani = await one(A.org, "insert into members (trip_id, name, is_proxy) values ($1, 'Nani', true) returning *", [A.trip.id]);
    T("2d the organiser can insert their own organiser row and a proxy row", A.me.is_organizer && A.me.user_id === A.org.id && nani.is_proxy && nani.user_id === null);
  });

  await group("3 protected member columns", async () => {
    // Each refusal below is one only the new guard makes: the older rules let these particular writes through.
    const update = (user, set, params) => err(one(user, `update members set ${set} where id = $1`, params));
    const mDev = await join(dev, A.trip, "Dev");
    const second = await one(A.org, "insert into trips (name, slug, organizer_id) values ('Second trip', $1, $2) returning id", [slug(), A.org.id]);
    T("3a a member cannot make themselves organiser", (await update(riya, "is_organizer = true", [mRiya.id])) === "42501");
    T("3b a member row cannot be moved to another trip, not even by an organiser who runs both trips",
      (await update(riya, "trip_id = $2", [mRiya.id, B.trip.id])) === "42501" && (await update(A.org, "trip_id = $2", [mRiya.id, second.id])) === "42501");
    T("3c a member row cannot be handed to another user, by the member or by the organiser",
      (await update(riya, "user_id = $2", [mRiya.id, eve.id])) === "42501" && (await update(A.org, "user_id = $2", [mRiya.id, eve.id])) === "42501");
    T("3d a member cannot flag their own row as a proxy", (await update(riya, "is_proxy = true", [mRiya.id])) === "42501");
    T("3e the organiser cannot take over their own row", (await update(A.org, "is_proxy = true, user_id = null", [A.me.id])) === "42501");
    const taken = await one(A.org, "update members set is_proxy = true, user_id = null where id = $1 returning *", [mDev.id]);
    const [ghost] = await su("insert into members (trip_id, name) values ($1, 'Ghost') returning id", [A.trip.id]);
    T("3f the organiser can take over a member (is_proxy true, user_id null), and a ghost row left by the old join function",
      taken.is_proxy === true && taken.user_id === null && (await update(A.org, "is_proxy = true", [ghost.id])) === "no error");
    T("3g the organiser cannot reverse a takeover", (await update(A.org, "is_proxy = false, user_id = $2", [mDev.id, dev.id])) === "42501");
    T("3h ordinary edits to your own row still work", (await update(riya, "name = 'Riya S', status = 'responded', budget_max = 9000", [mRiya.id])) === "no error");
    T("3i the SQL Editor (no signed-in user) is not held to these rules",
      (await err(su("update members set trip_id = $2, is_organizer = true where id = $1", [ghost.id, second.id]))) === "no error");
  });

  await group("4 destination options", async () => {
    const add = (user, trip, memberId, name, note = null, emoji = null, votes = 0) =>
      one(user, "insert into destination_options (trip_id, added_by, name, note, emoji, vote_count) values ($1, $2, $3, $4, $5, $6) returning *",
        [trip.id, memberId, name, note, emoji, votes]);
    // No "returning" on the refusals: RETURNING also applies the read rules, which would hide a hole in the insert rule.
    const refused = (trip, memberId, name) => err(one(riya, "insert into destination_options (trip_id, added_by, name) values ($1, $2, $3)", [trip.id, memberId, name]));
    T("4a a member of trip A cannot add a place to trip B", (await refused(B.trip, mRiya.id, "Hack")) === "42501");
    T("4b a member cannot add a place in someone else's name", (await refused(A.trip, A.me.id, "Not mine")) === "42501");
    const goa = await add(riya, A.trip, mRiya.id, "  Goa \n", "   ", "", 99);
    T("4c vote_count is forced to 0, the name is trimmed, an empty note is null, an empty emoji is the pin",
      goa.vote_count === 0 && goa.name === "Goa" && goa.note === null && goa.emoji === PIN, JSON.stringify(goa));
    T("4d a duplicate name differing only in case and spaces is rejected with 23505", (await err(add(riya, A.trip, mRiya.id, " GOA  "))) === "23505");
    T("4e a blank name is rejected", (await err(add(riya, A.trip, mRiya.id, " \t "))) === "22023");
    const big = await add(riya, A.trip, mRiya.id, "n".repeat(100), "t".repeat(300), BEACH);
    T("4f long names and notes are cut to 60 and 140, a chosen emoji is kept", big.name.length === 60 && big.note.length === 140 && big.emoji === BEACH);
  });

  await group("5 vote counts", async () => {
    const option = (t, name) =>
      one(t.org, "insert into destination_options (trip_id, added_by, name) values ($1, $2, $3) returning id", [t.trip.id, t.me.id, name]).then((r) => r.id);
    const [coorg, hampiB] = [await option(A, "Coorg"), await option(B, "Hampi")];
    const goa = (await su("select id from destination_options where trip_id = $1 and name = 'Goa'", [A.trip.id]))[0].id;
    const vote = (user, memberId, optionId) => one(user, "update members set destination_vote = $2 where id = $1 returning id", [memberId, optionId]);
    /** "Goa stored/real, Coorg stored/real": what vote_count says against the votes that actually exist. */
    const expectTally = async (name, expected) => {
      const rows = await su(
        `select o.name, o.vote_count, (select count(*)::int from members m where m.destination_vote = o.id) as real
         from destination_options o where o.id in ($1, $2) order by o.name desc`, [goa, coorg]);
      const got = rows.map((r) => `${r.name} ${r.vote_count}/${r.real}`).join(", ");
      T(name, got === expected, `expected ${expected}, got ${got}`);
    };
    T("5a voting for another trip's place is rejected", (await err(vote(riya, mRiya.id, hampiB))) === "23514");
    const mSam = await join(sam, A.trip, "Sam");
    await vote(riya, mRiya.id, goa);
    await vote(sam, mSam.id, goa);
    await expectTally("5b two votes are counted", "Goa 2/2, Coorg 0/0");
    await vote(riya, mRiya.id, coorg);
    await expectTally("5c changing a vote moves the count", "Goa 1/1, Coorg 1/1");
    await vote(riya, mRiya.id, null);
    await expectTally("5d taking a vote back lowers the count", "Goa 1/1, Coorg 0/0");
    const remove = (user, memberId) => all(user, "delete from members where id = $1 returning id", [memberId]).then((rows) => rows.length);
    T("5e a member cannot remove another member, and the organiser cannot remove themselves", (await remove(riya, mSam.id)) === 0 && (await remove(A.org, A.me.id)) === 0);
    T("5f the organiser can remove a member", (await remove(A.org, mSam.id)) === 1);
    await expectTally("5g removing a member who had voted lowers the count", "Goa 0/0, Coorg 0/0");
    const proxy = (optionId) => one(A.org, "insert into members (trip_id, name, is_proxy, destination_vote) values ($1, 'Dadi', true, $2) returning id", [A.trip.id, optionId]);
    await proxy(coorg);
    await expectTally("5h a proxy inserted with a preset vote is counted", "Goa 0/0, Coorg 1/1");
    T("5i a proxy cannot be inserted with a vote for another trip's place", (await err(proxy(hampiB))) === "23514");
    await one(A.org, "delete from destination_options where id = $1 returning id", [coorg]);
    T("5j the organiser can still delete a place that has votes, which clears those votes",
      (await su("select count(*)::int as n from members where trip_id = $1 and destination_vote is not null", [A.trip.id]))[0].n === 0);
  });

  await group("6 stage changes", async () => {
    const move = (user, to) => all(user, "update trips set status = $2 where id = $1 returning status", [B.trip.id, to]);
    const status = () => su("select status from trips where id = $1", [B.trip.id]).then((r) => r[0].status);
    await join(riya, B.trip, "Riya");
    T("6a a trip cannot jump two stages", (await err(move(B.org, "commitment"))) === "23514" && (await status()) === "dates_open");
    T("6b a non-organiser cannot change the stage", (await move(riya, "destination_open")).length === 0 && (await status()) === "dates_open");
    const [forward, back] = [await move(B.org, "destination_open"), await move(B.org, "dates_open")];
    T("6c the organiser can move one step forward and one step back", forward[0]?.status === "destination_open" && back[0]?.status === "dates_open");
    for (const to of ["destination_open", "commitment", "ready"]) await move(B.org, to);
    T("6d a trip cannot jump back two stages either, except from the SQL Editor",
      (await err(move(B.org, "destination_open"))) === "23514" && (await status()) === "ready" &&
      (await err(su("update trips set status = 'dates_open' where id = $1", [B.trip.id]))) === "no error");
  });

  await group("7 advance_trip: when it may act", async () => {
    const C = await makeTrip(2);
    const resize = (n) => err(one(C.org, "update trips set expected_size = $2 where id = $1 returning id", [C.trip.id, n]));
    const cRiya = await join(riya, C.trip, "Riya");
    await saveDays(C.org, C.me.id, 11, 12);
    await saveDays(riya, cRiya.id, 11, 12);
    T("7a does nothing while expected_size is null", (await advance(riya, C.trip.id)).status === "dates_open");
    T("7b expected_size must be between 2 and 50", (await resize(1)) === "23514" && (await resize(51)) === "23514" && (await resize(4)) === "no error");
    T("7c does nothing while fewer members have joined than expected_size", (await advance(riya, C.trip.id)).status === "dates_open");
    await one(C.org, "insert into members (trip_id, name, is_proxy) values ($1, 'Nani', true) returning id", [C.trip.id]);
    const cDev = await join(dev, C.trip, "Dev");
    T("7d does nothing while a real member has not answered", (await advance(dev, C.trip.id)).status === "dates_open");
    T("7e a non-member caller is rejected, and so is anon",
      (await err(advance(eve, C.trip.id))) === "42501" && (await err(advance(null, C.trip.id))) === "42501" && (await err(advance(eve, randomUUID()))) === "42501");
    await saveDays(dev, cDev.id, 12, 13);
    const moved = await advance(dev, C.trip.id); // called by the last member to answer, not by the organiser
    T("7f an unanswered proxy does not block and counts toward expected_size; any member's call moves the trip",
      moved.status === "destination_open" && moved.s === D(11) && moved.e === D(12), JSON.stringify(moved));
    const proxies = await seedTrip(3, [L("Asha", 11, 12, 13), { ...L("Nani", 11, 12, 13), is_proxy: true }, { ...L("Dadi", 11, 12, 13), is_proxy: true }]);
    await su("delete from members where id = $1", [proxies.members[0].id]);
    await su("update trips set expected_size = 2 where id = $1", [proxies.id]);
    T("7g a trip whose only members are proxies does not move by itself", (await advance(proxies.org, proxies.id)).status === "dates_open");
  });

  await group("8 advance_trip: dates", async () => {
    // Expected windows are worked out by hand from the ranking rule: most people free on every day of the
    // window (two at least), then most person-days inside it, then the earliest start. Days are in Dec 2026.
    const cases = [
      ["8a two people for the whole window beat a busier window only one can do in full", 3,
        [L("A", 11, 12, 13, 18, 19, 20), L("B", 11, 12, 18, 19, 20), L("C", 12, 13)], `${D(18)}..${D(20)}`],
      ["8b relay (A Fri+Sat, B Sat+Sun, C Fri+Sun, 3 days): no window, the trip stays on dates", 3,
        [L("A", 11, 12), L("B", 12, 13), L("C", 11, 13)], "none"],
      ["8c a tie on people is broken by person-days", 3,
        [L("A", 4, 5, 6, 11, 12, 13), L("B", 4, 5, 6, 11, 12, 13), L("C", 12, 13)], `${D(11)}..${D(13)}`],
      ["8d a tie on both is broken by the earliest start", 3,
        [L("A", 11, 12, 13, 4, 5, 6), L("B", 13, 12, 11, 6, 5, 4)], `${D(4)}..${D(6)}`],
      ["8e legacy range minus a blocked range held in the constraint columns", 3,
        [R("A", 10, 20, { constraint_start: D(12), constraint_end: D(14), constraint_note: "Dec 12 - Dec 14 unavailable" }), L("B", 10, 11, 12, 13, 14, 15, 16, 17)],
        `${D(15)}..${D(17)}`],
      ["8e2 legacy range minus blocked ranges held as JSON in the note, which win over the columns", 3,
        [R("A", 10, 20, { constraint_note: JSON.stringify([{ start: D(12), end: D(14) }]), constraint_start: D(15), constraint_end: D(16) }), R("B", 10, 20)],
        `${D(15)}..${D(17)}`],
      ["8f a free-text note next to an availability range changes nothing", 3,
        [R("A", 11, 13, { constraint_note: LATE_NOTE }), L("B", 11, 12, 13, 18, 19, 20), L("C", 18, 19, 20)], `${D(11)}..${D(13)}`],
      ["8g a proxy's days count in the overlap", 3,
        [L("A", 11, 12, 13), L("B", 20, 21, 22), R("Nani", 11, 13, { is_proxy: true })], `${D(11)}..${D(13)}`],
      ["8h three people for the whole window beat two people plus more person-days, even when later", 3,
        [L("A", 11, 12, 13, 18, 19, 20), L("B", 11, 12, 13, 18, 19, 20), L("C", 18, 19, 20), L("D", 11, 12), L("E", 12, 13)], `${D(18)}..${D(20)}`],
      ["8i one person who can do every day is not enough, however many join for part of it", 3,
        [L("A", 11, 12, 13), L("B", 11, 12), L("C", 12, 13)], "none"],
    ];
    for (const [name, days, members, expected] of cases) {
      const t = await seedTrip(days, members);
      const got = sqlWindow(await advance(t.users[1], t.id));
      const tsGot = ts ? tsWindow(ts, t.rows, days) : expected;
      T(`${name}${ts ? " (SQL and TypeScript)" : ""}`, got === expected && tsGot === expected, `expected ${expected}, SQL ${got}, TypeScript ${tsGot}`);
    }
    if (!ts) return;

    // Random groups: the SQL and the TypeScript must agree on every member's days and on the window.
    // The one intended difference: SQL drops impossible dates such as 2026-02-31 instead of failing.
    const long = { name: "Long", availability_start: "2026-01-01", availability_end: "2046-01-01" };
    const [{ n }] = await su("select count(*)::int as n from public.pkc_member_days(jsonb_populate_record(null::members, $1::jsonb))", [JSON.stringify(long)]);
    T("8j a 20-year range is cut off after 3660 days, as in the app", n === 3660 && ts.memberDays(long).length === 3660, String(n));
    const pick = random(seed);
    const realDay = (key) => ts.toDayKey(ts.parseDay(key)) === key;
    const [dayDiffs, windowDiffs] = [[], []];
    let windows = 0;
    for (let i = 0; i < 120; i++) {
      const days = 1 + pick(4);
      const members = Array.from({ length: 2 + pick(5) }, (_, k) => randomMember(pick, k));
      const t = await seedTrip(days, members);
      const sqlDays = await su(
        `select m.name, array(select d::text from public.pkc_member_days(m) d order by d) as days from members m where m.trip_id = $1`, [t.id]);
      for (const row of sqlDays) {
        const want = ts.memberDays(members.find((m) => m.name === row.name)).filter(realDay).join();
        if (row.days.join() !== want) dayDiffs.push(`#${i} ${row.name}: SQL ${row.days.join()} TypeScript ${want}`);
      }
      const [got, want] = [sqlWindow(await advance(t.org, t.id)), tsWindow(ts, t.rows, days)];
      if (got !== "none") windows += 1;
      if (got !== want) windowDiffs.push(`#${i} ${days} days: SQL ${got} TypeScript ${want} ${JSON.stringify(members)}`);
    }
    T(`8k 120 random groups (seed ${seed}): pkc_member_days returns the days memberDays() returns`, dayDiffs.length === 0, dayDiffs.slice(0, 3).join(" | "));
    T(`8l the same groups (${windows} with a window): advance_trip locks the window findBestOverlap() picks`, windowDiffs.length === 0, windowDiffs.slice(0, 2).join(" | "));
  });

  await group("9 advance_trip: destination and commitment", async () => {
    const t = await seedTrip(3, [{ name: "Asha" }, { name: "Riya" }, { name: "Dev" }], "destination_open");
    await su("insert into destination_options (trip_id, added_by, name, emoji) values ($1, $2, 'Goa', ''), ($1, $2, 'Coorg', $3), ($1, $2, 'Hampi', '')", [t.id, t.members[0].id, BEACH]);
    const vote = (i, place, trip = t) =>
      su("update members set destination_vote = (select id from destination_options where trip_id = $1 and name = $3) where id = $2", [trip.id, trip.members[i].id, place]);
    const say = (i, status) => su("update members set status = $2 where id = $1", [t.members[i].id, status]);
    const state = () => advance(t.users[2], t.id); // always called by an ordinary member
    await vote(0, "Goa");
    await vote(1, "Coorg");
    T("9a does nothing while a real member has not voted", (await state()).status === "destination_open");
    await vote(2, "Hampi");
    T("9b a tie does nothing", (await state()).status === "destination_open");
    await su("update destination_options set vote_count = 99 where trip_id = $1 and name = 'Hampi'", [t.id]); // a wrong stored count must not matter
    await vote(2, "Coorg");
    const locked = await state();
    T("9c a clear winner locks \"<emoji> <name>\", counted from the votes and not from vote_count", locked.status === "commitment" && locked.dest === `${BEACH} Coorg`, JSON.stringify(locked));
    await say(0, "confirmed_out");
    await say(1, "confirmed_out");
    T("9d does nothing while a real member has not said in or out", (await state()).status === "commitment");
    await say(2, "confirmed_out");
    T("9e everyone out: the trip stays on commitment", (await state()).status === "commitment");
    await say(1, "confirmed_in");
    T("9f everyone answered and one person is in: ready, and a ready trip is then returned unchanged", (await state()).status === "ready" && (await state()).status === "ready");
    T("9g the owner can still delete a whole trip from the dashboard", (await err(su("delete from trips where id = $1", [t.id]))) === "no error");
    const duo = await seedTrip(3, [{ name: "Asha" }, { name: "Nani", is_proxy: true }], "destination_open");
    await su("insert into destination_options (trip_id, added_by, name, emoji) values ($1, $2, 'Goa', ''), ($1, $2, 'Coorg', '')", [duo.id, duo.members[0].id]);
    await vote(0, "Goa", duo);
    await vote(1, "Coorg", duo);
    T("9h a vote the organiser casts for a proxy counts like anyone's: one each is a tie", (await advance(duo.org, duo.id)).status === "destination_open");
    await vote(1, "no such place", duo); // takes the proxy's vote back
    const single = await advance(duo.org, duo.id);
    T("9i one vote wins when no other place has any, and a place saved without an emoji locks with the pin", single.status === "commitment" && single.dest === `${PIN} Goa`, JSON.stringify(single));
  });

  await group("10 reading trips", async () => {
    const names = ["Asha Rao", "Riya Shah", "  Dev  Kumar", "Sam", "   ", "Omar", "Zoya", "Ira", "Kabir", "Meera", "Tara"];
    const t = await seedTrip(3, names.map((name) => ({ name })));
    const link = (await su("select slug from trips where id = $1", [t.id]))[0].slug;
    const previewFor = (user) => one(user, "select public.trip_preview($1) as p", [link]).then((r) => JSON.stringify(r.p));
    const preview = await previewFor(null);
    T("10a trip_preview works for anon and for a signed-in visitor: organiser, head count, first names (8 at most, in joining order)",
      preview === '{"organizer_name":"Asha Rao","member_count":11,"names":["Asha","Riya","Dev","Sam","Omar","Zoya","Ira","Kabir"]}' && (await previewFor(eve)) === preview, preview);
    T("10b trip_preview is null for an unknown link", (await one(null, "select public.trip_preview('no-such-trip') as p")).p === null);
    const open = (user, tripSlug) => all(user, "select id from public.get_trip_by_slug($1)", [tripSlug]);
    const opened = await open(null, link);
    T("10c get_trip_by_slug works for anon and for a signed-in visitor, and returns nothing for an unknown link",
      opened.length === 1 && opened[0].id === t.id && (await open(eve, link))[0]?.id === t.id && (await open(null, "no-such-trip")).length === 0);
    const seenBy = (user) => all(user, "select id from trips").then((rows) => rows.map((r) => r.id));
    const [anonSees, strangerSees] = [await seenBy(null), await seenBy(eve)];
    if (phase !== "after Part B") {
      T("10d before Part B anyone can still list every trip (the hole Part B closes)", anonSees.length > 5 && strangerSees.length > 5);
      return;
    }
    T("10d after Part B anon and non-members get zero rows from trips", anonSees.length === 0 && strangerSees.length === 0, `${anonSees.length}, ${strangerSees.length}`);
    T("10e after Part B a member and the organiser still see their trip, and only theirs", (await seenBy(t.users[1])).join() === t.id && (await seenBy(t.org)).join() === t.id);
    const kim = await newUser();
    const joined = await join(kim, opened[0], "Kim");
    const visible = await all(kim, "select m.id from trips t join members m on m.trip_id = t.id where t.id = $1", [t.id]);
    T("10f after Part B a new friend can open the link, join, then read the trip and its members", joined.name === "Kim" && visible.length === 12 && (await seenBy(kim)).join() === t.id);
  });
}

/* ── Checks on the file itself and on what it installed ────────── */
async function staticChecks() {
  check("the migration file is plain ASCII (no emoji characters, no em-dashes)", !/[^\x00-\x7F]/.test(migration));
  const lines = migration.split("\n");
  const bare = lines.flatMap((line, i) => {
    const fn = line.match(/^create or replace function public\.(\w+)\(/)?.[1];
    return fn && !lines[i - 1].startsWith(`-- ${fn}: `) ? [fn] : [];
  });
  check("every function in the file has a one-line comment saying what it is for", bare.length === 0, bare.join());
  const [g] = await su(`
    select (select string_agg(p.proname, ', ') from pg_proc p where p.pronamespace = 'public'::regnamespace
              and (p.proname like 'pkc\\_%' or p.proname = 'update_vote_counts')
              and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as callable_internals,
           (select string_agg(p.proname, ', ') from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef
              and not coalesce(p.proconfig @> array['search_path=public'], false)) as unpinned`);
  check("the trigger and helper functions cannot be called through the API by anon or signed-in users", g.callable_internals === null, String(g.callable_internals));
  check("every security definer function in public has a pinned search_path", g.unpinned === null, String(g.unpinned));
}

/* ── The run ───────────────────────────────────────────────────── */
async function main() {
  await bootstrap();
  const ts = await loadTypeScript();
  const applyPartA = () => run(migration).finally(() => (migrated = true));
  const ghosts = () => su(block("CHECK GHOST MEMBERS"));
  const wrongCounts = () => su(block("CHECK VOTE COUNTS"));
  const hasIndex = () => su("select to_regclass('public.destination_options_trip_name_key') is not null as yes").then((r) => r[0].yes);

  // Before the migration: show the holes are real in this copy too, and leave damage behind for the repair.
  const [old1, old2] = [await seedTrip(3, [{ name: "Asha" }, { name: "Riya" }, { name: "Dev" }]), await seedTrip(3, [{ name: "Omar" }, { name: "Zoya" }])];
  const [riya, riyaRow, devRow] = [old1.users[1], old1.members[1].id, old1.members[2].id];
  await one(null, "select join_trip($1, 'Ghost')", [old1.id]);
  check("[before] anon can add a member with no user through the old join_trip (item 1)", (await ghosts()).length === 1);
  check("[before] a member can make themselves organiser (item 3)", (await err(one(riya, "update members set is_organizer = true where id = $1", [riyaRow]))) === "no error");
  await su("update members set is_organizer = false where id = $1", [riyaRow]);
  await one(riya, "insert into destination_options (trip_id, added_by, name, vote_count) values ($1, $2, 'Planted', 99)", [old2.id, riyaRow]);
  const [planted] = await su("select id, vote_count from destination_options where name = 'Planted'");
  check("[before] a member of one trip can add a place with 99 votes to another trip (item 4)", planted?.vote_count === 99);
  await one(riya, "update members set destination_vote = $2 where id = $1", [riyaRow, planted.id]); // a vote across trips
  await su("insert into destination_options (trip_id, added_by, name) values ($1, $2, 'Goa'), ($1, $2, ' goa ')", [old1.id, old1.members[0].id]);
  await su("update members set destination_vote = (select id from destination_options where name = 'Goa') where id = $1", [devRow]);
  await su("delete from members where id = $1", [devRow]); // the old trigger ignores deletes, so Goa keeps a vote nobody holds
  const before = (await wrongCounts()).map((r) => `${r.place} ${r.stored_count}/${r.real_count}`).join();
  const copies = () => su(block("CHECK DUPLICATE PLACES")).then((rows) => rows.map((r) => `${r.place} x${r.copies}`).join());
  check("[before] the look-first queries find both wrong vote counts (item 5) and the duplicate place", before === "Goa 1/0,Planted 100/0" && (await copies()) === "goa x2", before);

  // First run, on a database with existing rows and damage.
  const notices = await applyPartA();
  const [{ vote }] = await su("select destination_vote as vote from members where id = $1", [riyaRow]);
  check("[repair] the vote across trips is cleared and every vote count matches the real votes", vote === null && (await wrongCounts()).length === 0);
  check("[repair] nothing is deleted: the ghost member is left for the owner to review", (await ghosts()).length === 1);
  check("[repair] with a duplicate place present, the no-duplicates rule is skipped with a notice instead of failing",
    notices.some((n) => n.startsWith("Skipped the no-duplicate-places rule")) && !(await hasIndex()), notices.join(" | "));
  await su("delete from destination_options where name = ' goa '");
  await applyPartA();
  check("[repair] once the duplicate is gone, running the file again switches the rule on", (await copies()) === "" && (await hasIndex()));

  await staticChecks();
  await scenarios("after Part A", ts, 20261120);

  await applyPartA();
  check("11 the whole migration ran again on top of the test data without error (its third run)", true);
  await scenarios("Part A run again", ts, 4);

  await run(block("PART B"));
  await run(block("PART B"));
  check("11 Part B ran twice without error", true);
  await scenarios("after Part B", ts, 11);

  // The rollbacks do what the header says, and the migration can be applied again afterwards.
  await run(block("ROLLBACK B"));
  check("[rollback B] trips are readable the old way again", (await all(null, "select id from trips")).length > 5);
  await run(block("ROLLBACK A"));
  const [r] = await su(`
    select (select count(*)::int from pg_proc where pronamespace = 'public'::regnamespace
              and (proname like 'pkc\\_%' or proname in ('advance_trip', 'trip_preview', 'get_trip_by_slug'))) as new_functions,
           (select count(*)::int from pg_trigger where tgname like 'pkc\\_%') as new_triggers,
           (select count(*)::int from pg_proc where pronamespace = 'public'::regnamespace and proconfig is not null) as pinned,
           (select count(*)::int from pg_policies where policyname = 'members_delete_organizer') as delete_rules,
           (select count(*)::int from pg_trigger where tgname = 'on_vote_change' and tgtype = 17) as old_vote_trigger -- 17: per row, after update only`);
  check("[rollback A] the new functions, triggers and delete rule are gone, the old vote trigger is back and the old join_trip answers anon again",
    r.new_functions + r.new_triggers + r.pinned + r.delete_rules === 0 && r.old_vote_trigger === 1 &&
      (await err(one(null, "select join_trip($1, 'Ghost again')", [old1.id]))) === "no error", JSON.stringify(r));
  await applyPartA();
  check("[rollback A] the migration applies cleanly again afterwards", (await err(one(null, "select join_trip($1, 'Ghost 3')", [old1.id]))) === "42501");
}

await main().catch((e) => check("the test run crashed", false, `${e.code ?? ""} ${e.stack ?? e}`));
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
