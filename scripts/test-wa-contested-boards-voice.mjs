#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-wa-contested-boards-voice.mjs — Washington's contested boards take a
// voice, behind the gate every voiced board uses
// ─────────────────────────────────────────────────────────────────────────────
// Washington's contested State Senate boards and State House POSITION boards
// (one per race in wa-ballot-2026.js; a House district elects two members, so
// each position is its own seat, wa-statehouse-<n>-p<k>) are on the composer's
// three lists, so a comment and a
// poll vote go through the SAME handlers every other voiced board uses. This
// suite drives those real handlers (district-board-voice-core, district-board-
// poll-core, residency-vendor-core) over an in-memory fake, and asserts what
// was written.
//
// WHAT THIS SUITE PROVES:
//   1. A WASHINGTON BOARD loads the composer and the poll: its document carries
//      both hosts and both modules, both modules' seat lists name it, its
//      BOARDS row is composer: true, the server's gate names it, its general
//      room names the one sitting member of that seat or position, and
//      dd_districts has its row. Exactly the contested Washington seats and
//      positions are voiced; no whole House district, no other Washington
//      legislative seat and no statewide room is.
//   2. AN UNVERIFIED POST OR VOTE on every one of those seats — signed out,
//      anonymous, no row, a location_match row, a pending row, a member with
//      no row, a body that claims a zip or residency — is 403 and writes
//      nothing.
//   3. THE DAILY CAP: a verified non-member gets one comment and one vote a
//      Mountain-time day, refused with the line that names the cap; a member
//      has no daily cap.
//   4. A RESIDENCY FLAG FOR ONE SEAT does not open a neighbouring seat — the
//      other position of the same district, the other chamber, another
//      contested seat, a federal seat in the state or a board in another state.
//   5. THE COUNTS ENDPOINT answers these seats and returns only aggregates.
//   6. NO EQUITY LANGUAGE and no pay button on any board.
//   7. EXISTING VOICED BOARDS are unchanged: every one of them is still on all
//      three lists with HEAD's row, and only Washington's rows were added.
//
//   node scripts/test-wa-contested-boards-voice.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { HEAD, AT, PRE_CA_WA, PASS_WORKER, DECLARED_MIGRATIONS } from "./state-leg-harness.mjs";
// What THIS pass added is measured against the commit it was built on, so the
// check stays exact after the pass lands; "nothing else moved" stays on HEAD.
const BASE = AT(PRE_CA_WA);
import { planBoards, STATE_LEG_BOARD_SEATS, STATE_LEG_VOICED_STATES } from "./gen-district-boards.mjs";
import { COMPOSER_SEATS, LOCKED_LINE, composerSeat as composerSeatOf, handle as voiceHandle, seatHash } from "../netlify/lib/district-board-voice-core.mjs";
import { handle as pollHandle } from "../netlify/lib/district-board-poll-core.mjs";
import { CAP_COPY, DAILY_COMMENTS, DAILY_VOTES, accountHash } from "../netlify/lib/membership-core.mjs";
import { coveredSeats } from "../netlify/lib/residency-vendor-core.mjs";
import { SEAT_HOLDERS } from "../netlify/lib/seat-holders.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ wa contested boards voice: STALE HARNESS — ${m}`); process.exit(2); } };

const CA = (() => { const w = {}; w.window = w; vm.runInContext(R("wa-ballot-2026.js"), vm.createContext(w)); return w.PDXWaBallot; })();
const RO = (() => { const w = {}; w.window = w; vm.runInContext(R("cmp-data.js"), vm.createContext(w)); return w.CMP_DATA; })();
const PLAN = planBoards().boards;
const LEG = PLAN.filter((b) => b.stateLeg);
const VOICED = LEG.filter((b) => b.seat.startsWith("wa-") && !b.readOnly);
const RACE_SEATS = CA.RACES.map((r) => r.seat).sort();
must(VOICED.length === RACE_SEATS.length && VOICED.length > 0, "the plan voices no Washington contested boards");
// The one board the suite walks in full: House 18, Position 2.
const SAMPLE = VOICED.find((b) => b.seat === "wa-statehouse-18-p2");
must(SAMPLE, "House 18 Position 2 has no voiced board");
const MIG = "netlify/database/migrations/20261202000000_dd_districts_washington_contested_board_seats.sql";
const SQL = existsSync(join(ROOT, MIG)) ? R(MIG) : "";

// ── THE FAKE ────────────────────────────────────────────────────────────────
// The real handlers' dependencies, in memory, with the cap counters and a
// clock, so the daily cap is the real code's and not a stand-in.
const NOON = new Date("2026-10-27T18:00:00Z"); // noon MDT
function fakeStore(rows, opts = {}) {
  const s = { residency: rows.slice(), takes: [], votes: [], written: [], clock: NOON };
  const member = opts.member ? { status: "active", currentPeriodEnd: null } : null;
  s.deps = {
    now: () => s.clock,
    async verifyUser(req) {
      const h = req.headers.get("authorization") || "";
      if (!h.startsWith("Bearer ")) return null;
      const t = h.slice(7);
      if (t === "anon") return { uid: "anon-uid", isAnonymous: true };
      return { uid: t, isAnonymous: false };
    },
    async findResidency(seatKey, hash) {
      return s.residency.find((r) => r.seatKey === seatKey && r.authorHash === hash) || null;
    },
    async findVendorVerified(pairs) {
      return s.residency.filter((r) => pairs.some((p) => p.seatKey === r.seatKey && p.authorHash === r.authorHash));
    },
    async issueExists(k) { return k === "housing" || k === "water"; },
    async findMembership(h) { return member && opts.memberHash === h ? member : null; },
    async listPosts() { return s.takes.slice(); },
    async listGeneral() { return []; },
    async countPostsSince(seatKey, hash, since) {
      return s.takes.filter((t) => t.seatKey === seatKey && t.authorHash === hash && t.createdAt >= since).length;
    },
    async insertPost(v) {
      const { capSince, ...row } = v;
      if (capSince && s.takes.filter((t) => t.seatKey === v.seatKey && t.authorHash === v.authorHash && t.createdAt >= capSince).length >= DAILY_COMMENTS) return null;
      s.takes.push({ ...row, createdAt: s.clock });
      return { id: s.takes.length, issueKey: v.issueKey, body: v.body, createdAt: s.clock.toISOString() };
    },
    async countVotes(seatKey) {
      const m = new Map();
      for (const v of s.votes.filter((x) => x.seatKey === seatKey)) {
        const k = `${v.issueKey}|${v.choice}`;
        m.set(k, { issueKey: v.issueKey, choice: v.choice, v: (m.get(k)?.v || 0) + 1 });
      }
      return [...m.values()];
    },
    async myVotes(seatKey, hash) { return s.votes.filter((v) => v.seatKey === seatKey && v.authorHash === hash); },
    async countVotesSince(seatKey, hash, since) {
      return s.votes.filter((v) => v.seatKey === seatKey && v.authorHash === hash && v.updatedAt >= since).length;
    },
    async upsertVote(v) {
      if (v.capSince && s.votes.filter((x) => x.seatKey === v.seatKey && x.authorHash === v.authorHash && x.updatedAt >= v.capSince).length >= (v.capLimit || 1)) return false;
      s.votes = s.votes.filter((x) => !(x.seatKey === v.seatKey && x.authorHash === v.authorHash && x.issueKey === v.issueKey));
      s.votes.push({ seatKey: v.seatKey, issueKey: v.issueKey, authorHash: v.authorHash, choice: v.choice, updatedAt: s.clock });
      return true;
    },
  };
  return s;
}
const hdr = (token) => ({ "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) });
const postTo = (url, body, token) => new Request(url, { method: "POST", headers: hdr(token), body: JSON.stringify(body) });
const comment = (seat, token, body = "A short take on housing.", issueKey = "housing") =>
  postTo("https://politidex.fyi/api/district-board-voice", { seat, issueKey, body }, token);
const vote = (seat, token, choice = "support", issueKey = "housing") =>
  postTo("https://politidex.fyi/api/district-board-poll", { seat, issueKey, choice }, token);
const vendorRow = (uid, seatKey, extra) => ({ seatKey, authorHash: seatHash(uid, seatKey), status: "verified", method: "vendor", ...extra });

// ═════════════════════════════════════════════════════════════════════════════
section("1 · a Washington board loads the composer and the poll");
// ═════════════════════════════════════════════════════════════════════════════
const client = (f, g) => { const w = makeSandbox(); vm.runInContext(R(f), vm.createContext(w), { filename: f }); return w[g]; };
const DC = client("district-composer.js", "PDXDistrictComposer");
const DP = client("district-poll.js", "PDXDistrictPoll");
const DB = client("district-board.js", "PDXDistrictBoard");
must(DC && DC.COMPOSER_SEATS && DP && DP.POLL_SEATS && DB, "the composer, the poll or the board module did not load");
{
  const b = SAMPLE;
  const doc = R(`district-${b.alias}.html`);
  has(doc, '<script defer src="/district-composer.js"></script>', `${b.alias}: the document loads the composer`);
  has(doc, '<script defer src="/district-poll.js"></script>', `${b.alias}: …and the poll`);
  has(doc, `<div id="pdx-district-composer" data-pdxdc-seat="${b.alias}"`, `${b.alias}: the composer host names this seat`);
  has(doc, `<div id="pdx-district-poll" data-pdxdp-seat="${b.alias}"`, `${b.alias}: the poll host names this seat`);
}
for (const b of VOICED) {
  ok(Object.prototype.hasOwnProperty.call(DC.COMPOSER_SEATS, b.alias), `${b.alias}: district-composer.js mounts here`);
  ok(Object.prototype.hasOwnProperty.call(DP.POLL_SEATS, b.alias), `${b.alias}: district-poll.js mounts here`);
  eq((DB.board(b.alias) || {}).composer, true, `${b.alias}: its BOARDS row takes a voice`);
  eq(COMPOSER_SEATS[b.seat], b.alias, `${b.alias}: the server's gate names it`);
  const race = CA.RACES.find((r) => r.seat === b.seat);
  const inc = race && race.field.find((c) => c.incumbent);
  eq((SEAT_HOLDERS[b.seat] || {}).pid, inc && inc.pid, `${b.alias}: its general room's holder is the sitting member`);
  eq((SEAT_HOLDERS[b.seat] || {}).name, inc && RO[inc.pid] && RO[inc.pid].name, `${b.alias}: …named as the roster names them`);
  eq(((SEAT_HOLDERS[b.seat] || {}).previous || []).length, 0, `${b.alias}: one sitting member, no second name`);
  has(SQL, `\t('${b.seat}', 'WA', '${b.chamber}', ${b.district}, 'Washington State ${b.chamber === "statesenate" ? "Senate" : "House"} District ${b.district}${b.position ? `, Position ${b.position}` : ""}')`, `${b.alias}: dd_districts gets its row`);
}
{
  eq(JSON.stringify(VOICED.map((b) => b.seat).sort()), JSON.stringify(RACE_SEATS), "the voiced Washington boards are exactly the seats with a race");
  ok(STATE_LEG_VOICED_STATES.has("wa"), "Washington is a voiced state");
  ok(!Object.keys(COMPOSER_SEATS).some((k) => /^wa-statehouse-\d+$/.test(k)), "no composer seat covers a whole House district");
  eq(composerSeatOf("wa-hd-18-p2"), "wa-statehouse-18-p2", "the position alias is the position's seat");
  eq(composerSeatOf("wa-statehouse-18"), "", "the district without a position is not a seat");
  eq(composerSeatOf("wa-hd-18"), "", "…in either spelling");
  eq(composerSeatOf("wa-hd-18-p3"), "", "a position that does not exist is not a seat");
  eq(composerSeatOf("wa-hd-26-p2"), "", "an open position with no race is not a seat");
  ok(RACE_SEATS.every((s) => STATE_LEG_BOARD_SEATS.has(s)), "every voiced seat is a contested seat");
  const caKeys = Object.keys(COMPOSER_SEATS).filter((k) => /^wa-(?:statehouse|statesenate)-\d+/.test(k)).sort();
  eq(JSON.stringify(caKeys), JSON.stringify(RACE_SEATS), "the server's gate holds no other Washington legislative seat");
  ok(!Object.keys(COMPOSER_SEATS).some((k) => /^wa-gov/.test(k)), "no statewide Washington room was opened");
  const seeded = [...SQL.matchAll(/^\t\('([a-z]{2}-(?:statehouse|statesenate)-\d+(?:-p\d)?)', /gm)].map((m) => m[1]).sort();
  eq(JSON.stringify(seeded), JSON.stringify(RACE_SEATS), "the dd_districts seed is exactly the voiced Washington seats");
  ok(/^INSERT INTO "dd_districts"/m.test(SQL) && /ON CONFLICT \("district_id"\) DO NOTHING;\s*$/.test(SQL), "…inserted, ON CONFLICT DO NOTHING");
  ok(!/\b(?:ALTER|CREATE|DROP|DELETE|UPDATE|TRUNCATE)\b/.test(SQL.replace(/^--.*$/gm, "")), "…and nothing but rows");
  for (const f of ["20261130000000_dd_districts_contested_legislative_board_seats.sql", "20261201000000_dd_districts_california_contested_board_seats.sql"]) {
    ok(!/'wa-state/.test(R(`netlify/database/migrations/${f}`)), `${f} holds no Washington row, so this one adds rather than repeats`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · an unverified post or vote on any of those seats is 403 and writes nothing");
// ═════════════════════════════════════════════════════════════════════════════
{
  const UID = "uid-ref";
  for (const b of VOICED) {
    const cases = [
      ["signed out", [], null, {}],
      ["anonymous", [], "anon", {}],
      ["no residency row", [], UID, {}],
      ["a location_match row", [vendorRow(UID, b.seat, { method: "location_match" })], UID, {}],
      ["a pending vendor row", [vendorRow(UID, b.seat, { status: "pending" })], UID, {}],
      ["a member with no residency row", [], UID, { member: true, memberHash: accountHash(UID) }],
    ];
    for (const [why, rows, token, opts] of cases) {
      const s = fakeStore(rows, opts);
      const r1 = await voiceHandle(comment(b.alias, token), s.deps);
      const r2 = await pollHandle(vote(b.alias, token), s.deps);
      const r3 = await voiceHandle(postTo("https://politidex.fyi/api/district-board-voice", { seat: b.alias, room: "general", body: "General." }, token), s.deps);
      eq(r1.status, 403, `${b.alias} · ${why}: comment is 403`);
      eq(r2.status, 403, `${b.alias} · ${why}: vote is 403`);
      eq(r3.status, 403, `${b.alias} · ${why}: a general-room comment is 403`);
      eq(s.takes.length + s.votes.length, 0, `${b.alias} · ${why}: nothing written`);
      if (why === "no residency row") eq((await r1.json()).error, LOCKED_LINE, `${b.alias}: the refusal is the locked line`);
    }
    // A typed zip, a saved location or a claimed residency in the body is not read.
    const s = fakeStore([]);
    const forged = postTo("https://politidex.fyi/api/district-board-voice",
      { seat: b.alias, issueKey: "housing", body: "x", zip: "98682", state: "WA", district: String(b.district), position: b.position || 1, verified: true, residency: "verified", method: "vendor" }, UID);
    eq((await voiceHandle(forged, s.deps)).status, 403, `${b.alias}: a body that claims residency is still 403`);
    const forgedVote = postTo("https://politidex.fyi/api/district-board-poll",
      { seat: b.alias, issueKey: "housing", choice: "support", zip: "98682", verified: true }, UID);
    eq((await pollHandle(forgedVote, s.deps)).status, 403, `${b.alias}: a vote that claims residency is still 403`);
    eq(s.takes.length + s.votes.length, 0, `${b.alias}: …and writes nothing`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the daily cap: one comment and one vote a Mountain day for a non-member; none for a member");
// ═════════════════════════════════════════════════════════════════════════════
eq(DAILY_COMMENTS, 1, "the cap is one comment a day");
eq(DAILY_VOTES, 1, "…and one poll vote a day");
for (const b of VOICED) {
  const UID = `uid-${b.alias}`;
  const s = fakeStore([vendorRow(UID, b.seat)]);
  eq((await voiceHandle(comment(b.alias, UID), s.deps)).status, 201, `${b.alias}: a verified non-member's first comment lands`);
  const second = await voiceHandle(comment(b.alias, UID, "Another thing."), s.deps);
  eq(second.status, 429, `${b.alias}: …the second the same day is refused`);
  const sj = await second.json();
  eq(sj.code, "daily_cap", `${b.alias}: …coded as the daily cap`);
  eq(sj.error, CAP_COPY.comment, `${b.alias}: …with the line that names the cap`);
  eq((await pollHandle(vote(b.alias, UID), s.deps)).status, 200, `${b.alias}: the day's one vote lands`);
  const v2 = await pollHandle(vote(b.alias, UID, "support", "water"), s.deps);
  eq(v2.status, 429, `${b.alias}: …a second vote the same day is refused`);
  eq((await v2.json()).error, CAP_COPY.vote, `${b.alias}: …with the line that names the cap`);
  eq(s.takes.length + s.votes.length, 2, `${b.alias}: one comment and one vote on file`);
  // 23:59 MDT is still the same Mountain day; 00:01 is the next one.
  s.clock = new Date("2026-10-28T05:59:00Z");
  eq((await voiceHandle(comment(b.alias, UID, "Late."), s.deps)).status, 429, `${b.alias}: 23:59 Mountain is still today`);
  s.clock = new Date("2026-10-28T06:01:00Z");
  eq((await voiceHandle(comment(b.alias, UID, "Next day."), s.deps)).status, 201, `${b.alias}: the next Mountain day opens again`);
  eq((await pollHandle(vote(b.alias, UID, "support", "water"), s.deps)).status, 200, `${b.alias}: …for a vote too`);
  const MID = `member-${b.alias}`;
  const m = fakeStore([vendorRow(MID, b.seat)], { member: true, memberHash: accountHash(MID) });
  for (let i = 0; i < 3; i++) eq((await voiceHandle(comment(b.alias, MID, `Post ${i}.`), m.deps)).status, 201, `${b.alias}: member comment ${i + 1} lands`);
  eq((await pollHandle(vote(b.alias, MID, "support", "housing"), m.deps)).status, 200, `${b.alias}: member vote 1 lands`);
  eq((await pollHandle(vote(b.alias, MID, "oppose", "housing"), m.deps)).status, 200, `${b.alias}: …a changed vote lands`);
  eq((await pollHandle(vote(b.alias, MID, "support", "water"), m.deps)).status, 200, `${b.alias}: …and a vote on a second issue`);
}
for (const line of Object.values(CAP_COPY)) {
  ok(/a day on this seat/.test(line), `the refusal names the daily cap: ${line}`);
  ok(!/\$|member|upgrade|pay|unlock|premium|subscribe|join|price|dollar/i.test(line), `the refusal does not mention money: ${line}`);
}
{
  // Tallies stay public, and reading stays free.
  const b = SAMPLE;
  const UID = "uid-public";
  const s = fakeStore([vendorRow(UID, b.seat)]);
  await voiceHandle(comment(b.alias, UID), s.deps);
  await pollHandle(vote(b.alias, UID), s.deps);
  const pub = await (await pollHandle(new Request(`https://politidex.fyi/api/district-board-poll?seat=${b.alias}`), s.deps)).json();
  eq(pub.polls.find((p) => p.issueKey === "housing")?.support, 1, "a signed-out reader reads the tally");
  const read = await (await voiceHandle(new Request(`https://politidex.fyi/api/district-board-voice?seat=${b.alias}`), s.deps)).json();
  eq(read.posts.length, 1, "…and the comment");
  ok(!/uid-public|authorHash|"member"/.test(JSON.stringify([pub, read])), "neither answer carries the uid, an author hash or a membership flag");
  const gen = await (await voiceHandle(new Request(`https://politidex.fyi/api/district-board-voice?seat=${b.alias}&room=general`), s.deps)).json();
  eq(gen.general && gen.general.holder && gen.general.holder.pid, "ley_wa", "the general room names the position's sitting member");
  eq(gen.general && gen.general.holder && gen.general.holder.name, "John Ley", "…by name");
  // Position 1 of the same district has its own room and its own member.
  const p1 = await (await voiceHandle(new Request(`https://politidex.fyi/api/district-board-voice?seat=wa-hd-18-p1&room=general`), s.deps)).json();
  eq(p1.general && p1.general.holder && p1.general.holder.pid, "mcclintock_wa", "Position 1's general room names its own member");
  eq((p1.posts || []).length, 0, "…and carries none of Position 2's comments");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · a residency flag for one seat does not open a neighbouring seat");
// ═════════════════════════════════════════════════════════════════════════════
for (const b of VOICED) {
  const UID = `uid-nb-${b.alias}`;
  const s = fakeStore([vendorRow(UID, b.seat)]);
  eq((await voiceHandle(comment(b.alias, UID), s.deps)).status, 201, `${b.alias}: its own flag opens it`);
  const near = VOICED.filter((x) => x.seat !== b.seat).map((x) => x.alias);
  const fed = PLAN.filter((x) => x.federal && x.seat.startsWith("wa-")).slice(0, 2).map((x) => x.alias);
  const far = ["ca-hd-74", "az-sd-4", "ut-hd-16"].filter((a) => Object.values(COMPOSER_SEATS).includes(a));
  ok(near.length >= 1 && fed.length >= 1 && far.length >= 2, `${b.alias}: neighbours to test exist`);
  for (const alias of [...near, ...fed, ...far]) {
    const before = s.takes.length + s.votes.length;
    eq((await voiceHandle(comment(alias, UID), s.deps)).status, 403, `${b.alias}'s flag does not open ${alias}'s composer`);
    eq((await pollHandle(vote(alias, UID), s.deps)).status, 403, `${b.alias}'s flag does not open ${alias}'s poll`);
    eq(s.takes.length + s.votes.length, before, `${alias}: nothing written`);
  }
  // A row filed under a neighbour carrying this seat's hash is not that seat's.
  const nb = VOICED.find((x) => x.alias === near[0]);
  const swapped = fakeStore([{ seatKey: nb.seat, authorHash: seatHash(UID, b.seat), status: "verified", method: "vendor" }]);
  eq((await voiceHandle(comment(nb.alias, UID), swapped.deps)).status, 403, `${nb.alias}: a row carrying ${b.alias}'s hash opens nothing`);
  // One check binds only seats in Washington, whatever is sent.
  const got = coveredSeats(b.alias, [b.seat, "az-statesenate-4", "ut-statehouse-16", "ca-statehouse-74", "wa-statehouse-18"]);
  eq(got[0], b.seat, `${b.alias}: the board's own seat is first in the check`);
  ok(got.every((k) => k.startsWith("wa-")), `${b.alias}: no seat outside Washington is bound — ${JSON.stringify(got)}`);
  ok(!got.includes("wa-statehouse-18"), `${b.alias}: a whole House district is never bound`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the counts endpoint answers these seats and returns only aggregates");
// ═════════════════════════════════════════════════════════════════════════════
{
  const FN = R("netlify/functions/district-board.mts");
  for (const b of VOICED) ok(new RegExp(`"${b.seat}": 1,`).test(FN), `${b.seat}: the counts endpoint answers it`);
  const selects = [...FN.matchAll(/\.select\(\{([^}]*)\}\)/g)].map((m) => m[1].trim());
  ok(selects.length >= 8, "the Function's queries could be read");
  for (const sel of selects) {
    for (const f of sel.split(",").map((x) => x.trim()).filter(Boolean)) {
      ok(/^v: count(?:Distinct)?\(/.test(f) || /^issueKey: [a-zA-Z]+\.issueKey$/.test(f) || /^h: [a-zA-Z]+\.authorHash$/.test(f),
        `district-board.mts selects only counts and issue keys — "${f}"`);
    }
  }
  ok(/countDistinct\(voicePeople\.h\)/.test(FN), "the author-hash union is only ever counted");
  const resp = (/return json\(\{\s*seat,([\s\S]*?)\n    \}\);/.exec(FN) || [])[1] || "";
  ok(resp.length > 0 && !/\b(?:uid|userId|authorHash|email|name|address|pid)\b/.test(resp), "the response names no person field");
  // Outside the generated seat table, the Function is HEAD's.
  const strip = (src) => String(src).replace(/(@generated district-boards begin[^\n]*\n)[\s\S]*?(\n[^\n]*@generated district-boards end)/, "$1$2");
  // …apart from the one shape this pass taught its normalizer: a seat elected
  // by position. Lifted back out, the code is HEAD's byte for byte.
  const noPosition = (src) => String(src)
    .replace(/\/\/ A seat elected by position \(Washington's House\)[^\n]*\n\/\/ alias [^\n]*\nconst POSITION_KEY_RE = [^\n]*\n\n/, "")
    .replace(" || POSITION_KEY_RE.test(s)) return s;", ") return s;")
    .replace(/  const pm = \/\^\(\[a-z\]\{2\}\)-hd-[^\n]*\n  if \(pm\) return [^\n]*\n/, "");
  eq(noPosition(strip(FN)), noPosition(strip(HEAD("netlify/functions/district-board.mts"))), "the counts endpoint's code did not move");
  eq(noPosition(strip(FN)), strip(BASE("netlify/functions/district-board.mts")), "…and this pass changed nothing in it beyond the position shape");
  ok(/const POSITION_KEY_RE = \/\^\[a-z\]\{2\}-statehouse-\[1-9\]\[0-9\]\*-p\[1-9\]\$\/;/.test(FN), "the counts endpoint reads the position shape");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · no equity language and no pay button on any board");
// ═════════════════════════════════════════════════════════════════════════════
{
  const BANNED = /\b(?:equity|stocks?|units?|shares?|shareholders?|earn(?:s|ed|ing|ings)?|profits?|dividends?|investors?|invest(?:ing|ment|ments)?|form\s*c|crowdfund\w*)\b/i;
  const live = (s) => s.replace(/<!--[\s\S]*?-->/g, "").replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<(a|span) class="pdxpa-name"[^>]*>[^<]*<\/\1>/g, " ").replace(/<a [^>]*>Open [^<]*’s file ›<\/a>/g, " ")
    .replace(/<[^>]+>/g, " ");
  for (const b of VOICED) {
    const doc = R(`district-${b.alias}.html`);
    const m = BANNED.exec(live(doc));
    ok(!m, `district-${b.alias}.html: no equity language${m ? ` ("${m[0]}")` : ""}`);
  }
  for (const f of readdirSync(ROOT).filter((x) => /^district-.*\.html$/.test(x))) {
    ok(!/\/api\/membership|checkout\.stripe|\$20|become a member/i.test(R(f)), `${f}: no pay button`);
  }
  const copy = [JSON.stringify(CAP_COPY), R("wa-ballot-2026.js"), R(MIG)].join("\n");
  const m = BANNED.exec(copy.replace(/\/\/[^\n]*/g, "").replace(/^--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, ""));
  ok(!m, `the cap, the Washington races and the migration carry no equity language${m ? ` ("${m[0]}")` : ""}`);
  for (const f of ["district-composer.js", "district-poll.js"]) ok(!/checkout\.stripe|\$20/.test(R(f)), `${f}: no checkout or price`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · existing voiced boards are unchanged");
// ═════════════════════════════════════════════════════════════════════════════
{
  const caSeat = (k) => /^wa-(?:statehouse|statesenate)-\d+(?:-p\d)?$/.test(k);
  const caAlias = (a) => /^wa-(?:hd|sd)-\d+(?:-p\d)?$/.test(a);
  // The server's gate: every HEAD row is still there with the same alias, and
  // the Washington rows this pass added (against the commit it was built on)
  // are exactly its contested seats and positions.
  const gateOf = (src) => new Map([...String(src).matchAll(/^  "([a-z0-9_-]+)": "([a-z0-9_-]+)",$/gm)].map((m) => [m[1], m[2]]));
  const gNow = gateOf(R("netlify/lib/district-board-voice-core.mjs")), gWas = gateOf(HEAD("netlify/lib/district-board-voice-core.mjs"));
  ok(gWas.size > 100, "HEAD's server gate could be read");
  for (const [k, a] of gWas) eq(gNow.get(k), a, `${k}: still on the server gate as ${a}`);
  const gBase = gateOf(BASE("netlify/lib/district-board-voice-core.mjs"));
  ok(gBase.size > 100, "the pre-pass server gate could be read");
  eq(JSON.stringify([...gNow.keys()].filter((k) => !gBase.has(k) && /^wa-/.test(k)).sort()), JSON.stringify(RACE_SEATS), "the server gate's only new rows are Washington's");
  ok([...gNow.keys()].every((k) => gWas.has(k)), "the server gate holds no row beyond HEAD's");
  const aliasesIn = (src) => [...String(src).matchAll(/^    '([a-z0-9_-]+)': 1,$/gm)].map((m) => m[1]);
  for (const f of ["district-composer.js", "district-poll.js"]) {
    const now = aliasesIn(R(f)), was = aliasesIn(HEAD(f)), base = aliasesIn(BASE(f));
    ok(was.every((a) => now.includes(a)), `${f}: no row was dropped`);
    ok(now.every((a) => was.includes(a)), `${f}: no row beyond HEAD's`);
    const added = now.filter((a) => !base.includes(a) && /^wa-/.test(a)).sort();
    eq(JSON.stringify(added), JSON.stringify(VOICED.map((b) => b.alias).sort()), `${f}: the only new rows are Washington's`);
    ok(added.every(caAlias), `${f}: …and every one is a Washington legislative board`);
  }
  const rowsOf = (src) => new Map([...String(src).matchAll(/^    '([a-z0-9_-]+)': \{ seat: .*$/gm)].map((m) => [m[1], m[0]]));
  const now = rowsOf(R("district-board.js")), was = rowsOf(HEAD("district-board.js"));
  for (const [k, line] of was) eq(now.get(k), line, `${k}: BOARDS row unchanged`);
  const base = rowsOf(BASE("district-board.js"));
  eq(JSON.stringify([...now.keys()].filter((k) => !base.has(k) && /^wa-/.test(k)).sort()), JSON.stringify(RACE_SEATS), "BOARDS: the only new rows are Washington's");
  for (const [k, line] of now) if (caSeat(k)) ok(/ composer: true, /.test(line), `${k}: its row says it takes a voice`);
  const holdersNow = SEAT_HOLDERS;
  const HH = (() => { const src = HEAD("netlify/lib/seat-holders.mjs"); return new Map([...String(src).matchAll(/^  "([a-z0-9_-]+)": (\{.*\}),$/gm)].map((m) => [m[1], m[2]])); })();
  ok(HH.size > 100, "HEAD's seat-holder table could be read");
  for (const [k, v] of HH) eq(JSON.stringify(holdersNow[k]), JSON.stringify(JSON.parse(v)), `${k}: general-room holder unchanged`);
  // Every existing board document is HEAD's bytes.
  for (const f of readdirSync(ROOT).filter((x) => /^district-.*\.html$/.test(x))) {
    const w = HEAD(f);
    ok(w === null ? /^district-wa-(?:hd|sd)-\d+(?:-p\d)?\.html$/.test(f) : R(f) === w, `${f}: unchanged`);
  }
  const TOML = R("netlify.toml");
  ok(![...TOML.matchAll(/from = "([^"]+)"/g)].some((m) => /^\/district\/.*\*/.test(m[1])), "no /district/* splat");
  // The worker: this pass moved it one version past California's (v484 → v485,
  // with its changelog entry), it is at least that version now and never more
  // than one step past HEAD, and it precaches nothing new.
  const ver = (src) => Number((/const CACHE_VERSION = 'v(\d+)';/.exec(src || "") || [])[1]);
  eq(PASS_WORKER.wa, PASS_WORKER.ca + 1, "sw.js: this pass moved CACHE_VERSION exactly one step past California's");
  has(R("sw.js"), `// v${PASS_WORKER.wa} - WASHINGTON, ONE CONTESTED CYCLE, AND ITS BOARDS TAKE A VOICE.`, "sw.js: …and its changelog entry says why");
  ok(ver(R("sw.js")) >= PASS_WORKER.wa && ver(R("sw.js")) <= ver(HEAD("sw.js")) + 1, "sw.js: CACHE_VERSION is at least that version, and at most one step past HEAD");
  const pre = (src) => (src.match(/^  '\/[^']*',$/gm) || []).sort().join("\n");
  eq(pre(R("sw.js")), pre(HEAD("sw.js")), "sw.js: the precache list is unchanged");
  eq(pre(R("sw.js")), pre(BASE("sw.js")), "sw.js: this pass precached nothing new");
  for (const f of ["/district-composer.js", "/district-poll.js", "/district-board.js"]) has(R("sw.js"), `  '${f}',`, `sw.js precaches ${f}, so the move is owed`);
  const migs = readdirSync(join(ROOT, "netlify/database/migrations"));
  const newSince = (rd) => migs.filter((f) => rd(`netlify/database/migrations/${f}`) === null && rd(`netlify/database/migrations/${f}/migration.sql`) === null);
  eq(JSON.stringify(newSince(BASE).filter((f) => /washington/.test(f))), JSON.stringify([MIG.split("/").pop()]), "the one new migration is the Washington dd_districts seed");
  ok(newSince(HEAD).every((f) => DECLARED_MIGRATIONS.includes(f)), `every migration not yet in HEAD is a declared one — ${newSince(HEAD).join(", ")}`);
}

console.log(`\n${failures.length ? "✗" : "✓"} wa contested boards voice: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 50)) console.log("   ✗ " + f);
process.exit(failures.length ? 1 : 0);
