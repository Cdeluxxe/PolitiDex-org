#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-contested-boards-voice.mjs — the contested boards of the thirteen
// density states take a voice, behind the gate every voiced board uses
// ─────────────────────────────────────────────────────────────────────────────
// The contested State House, State Assembly and State Senate boards of
// Pennsylvania, Georgia, North Carolina, Michigan, Ohio, Wisconsin, Florida,
// Arizona, New York, Texas, Illinois, Minnesota and Colorado were read-only.
// They are now on the composer's three lists, so a comment and a poll vote go
// through the SAME handlers the five Layton-cluster boards use. This suite
// drives those real handlers (district-board-voice-core, district-board-poll-
// core, residency-vendor-core) over an in-memory fake, and asserts what was
// written.
//
// WHAT THIS SUITE PROVES:
//   1. ONE BOARD FROM EACH OF THE THIRTEEN STATES loads the composer and the
//      poll: its document carries both hosts and both modules, both modules'
//      seat lists name it, its BOARDS row is composer: true, the server's gate
//      names it, its general room has a holder, and dd_districts has its row.
//      Exactly the contested seats of those states are voiced; Nevada's
//      contested boards and every uncontested seat are not.
//   2. AN UNVERIFIED POST OR VOTE on every one of those seats — signed out,
//      anonymous, no row, a location_match row, a pending row, a member with
//      no row — is 403 and writes nothing.
//   3. THE DAILY CAP: a verified non-member gets one comment and one vote a
//      Mountain-time day, refused with the line that names the cap; a member
//      has no daily cap.
//   4. A RESIDENCY FLAG FOR ONE SEAT does not open a neighbouring seat — the
//      other chamber over the same address, the next district, or a seat in
//      another state — and one check binds only its own state's seats.
//   5. THE COUNTS ENDPOINT answers these seats and still returns aggregates.
//   6. NO EQUITY LANGUAGE, no pay button, the membership block and checkout
//      on /me only.
//   7. THE FIVE LAYTON BOARDS and every non-contested board are unchanged; no
//      new board, no /district/* splat; the worker moved; the one migration
//      is rows only.
//
//   node scripts/test-contested-boards-voice.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { HEAD } from "./state-leg-harness.mjs";
import { planBoards, STATE_LEG_BOARD_SEATS, STATE_LEG_VOICED_STATES } from "./gen-district-boards.mjs";
import { COMPOSER_SEATS, LOCKED_LINE, handle as voiceHandle, seatHash } from "../netlify/lib/district-board-voice-core.mjs";
import { handle as pollHandle } from "../netlify/lib/district-board-poll-core.mjs";
import { CAP_COPY, DAILY_COMMENTS, DAILY_VOTES, accountHash } from "../netlify/lib/membership-core.mjs";
import { coveredSeats, parseVendorData } from "../netlify/lib/residency-vendor-core.mjs";
import { SEAT_HOLDERS } from "../netlify/lib/seat-holders.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ contested boards voice: STALE HARNESS — ${m}`); process.exit(2); } };

const STATES = ["pa", "ga", "nc", "mi", "oh", "wi", "fl", "az", "ny", "tx", "il", "mn", "co"];
const PLAN = planBoards().boards;
const LEG = PLAN.filter((b) => b.stateLeg);
// California's density pass (scripts/test-ca-contested-boards-voice.mjs) voices
// its own contested boards later; this suite holds the thirteen states' pass,
// so California's seats, rows and seed are set aside here, and only there.
// Washington's density pass (scripts/test-wa-contested-boards-voice.mjs) is set
// aside the same way, its House positions included.
const IS_CA = (k) => /^ca-(?:statehouse|statesenate|hd|sd)-\d+$/.test(k) || /^wa-(?:statehouse|statesenate|hd|sd)-\d+(?:-p\d)?$/.test(k);
const WA_MIG = "20261202000000_dd_districts_washington_contested_board_seats.sql";
const CA_MIG = "20261201000000_dd_districts_california_contested_board_seats.sql";
const VOICED = LEG.filter((b) => !b.readOnly && !IS_CA(b.seat));
must(VOICED.length > 100, "the plan voices no contested boards");
// One board per state: the first contested seat the plan lists for it.
const SAMPLE = STATES.map((c) => VOICED.find((b) => b.seat.startsWith(c + "-")));
must(SAMPLE.every(Boolean), "a density state has no voiced board");

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
section("1 · one contested board from each of the thirteen states loads the composer and the poll");
// ═════════════════════════════════════════════════════════════════════════════
const client = (f, g) => { const w = makeSandbox(); vm.runInContext(R(f), vm.createContext(w), { filename: f }); return w[g]; };
const DC = client("district-composer.js", "PDXDistrictComposer");
const DP = client("district-poll.js", "PDXDistrictPoll");
const DB = client("district-board.js", "PDXDistrictBoard");
must(DC && DC.COMPOSER_SEATS && DP && DP.POLL_SEATS && DB, "the composer, the poll or the board module did not load");
const MIG = "netlify/database/migrations/20261130000000_dd_districts_contested_legislative_board_seats.sql";
const SQL = existsSync(join(ROOT, MIG)) ? R(MIG) : "";
for (const b of SAMPLE) {
  const doc = R(`district-${b.alias}.html`);
  has(doc, '<script defer src="/district-composer.js"></script>', `${b.alias}: the document loads the composer`);
  has(doc, '<script defer src="/district-poll.js"></script>', `${b.alias}: …and the poll`);
  has(doc, `<div id="pdx-district-composer" data-pdxdc-seat="${b.alias}"`, `${b.alias}: the composer host names this seat`);
  has(doc, `<div id="pdx-district-poll" data-pdxdp-seat="${b.alias}"`, `${b.alias}: the poll host names this seat`);
  ok(Object.prototype.hasOwnProperty.call(DC.COMPOSER_SEATS, b.alias), `${b.alias}: district-composer.js mounts here`);
  ok(Object.prototype.hasOwnProperty.call(DP.POLL_SEATS, b.alias), `${b.alias}: district-poll.js mounts here`);
  eq((DB.board(b.alias) || {}).composer, true, `${b.alias}: its BOARDS row takes a voice`);
  eq(COMPOSER_SEATS[b.seat], b.alias, `${b.alias}: the server's gate names it`);
  eq((SEAT_HOLDERS[b.seat] || {}).pid, b.pid, `${b.alias}: its general room's holder is the sitting member`);
  has(SQL, `('${b.seat}', '${b.seat.slice(0, 2).toUpperCase()}', '${b.chamber}', ${b.district}, `, `${b.alias}: dd_districts gets its row`);
}
{
  // Exactly the contested seats of the thirteen states take a voice.
  const want = LEG.filter((b) => STATE_LEG_VOICED_STATES.has(b.seat.slice(0, 2)) && STATE_LEG_BOARD_SEATS.has(b.seat) && !IS_CA(b.seat)).map((b) => b.seat).sort();
  eq(JSON.stringify(VOICED.map((b) => b.seat).sort()), JSON.stringify(want), "the voiced boards are exactly the contested seats of the thirteen states");
  eq(JSON.stringify([...STATE_LEG_VOICED_STATES].sort()), JSON.stringify([...STATES, "ca", "wa"].sort()), "the voiced states are the thirteen density states, and California's and Washington's");
  const legKeys = Object.keys(COMPOSER_SEATS).filter((k) => /^[a-z]{2}-(?:statehouse|statesenate)-\d+$/.test(k) && !k.startsWith("ut-") && !IS_CA(k)).sort();
  eq(JSON.stringify(legKeys), JSON.stringify(want), "the server's gate holds no other legislative seat outside Utah");
  for (const b of LEG.filter((x) => x.readOnly)) {
    ok(!COMPOSER_SEATS[b.seat] && !DC.COMPOSER_SEATS[b.alias] && !DP.POLL_SEATS[b.alias], `${b.alias}: a read-only board stays off every list`);
    eq((DB.board(b.alias) || {}).composer, false, `${b.alias}: …and its row is composer: false`);
  }
  ok(LEG.filter((x) => x.readOnly).every((b) => b.seat.startsWith("nv-")), "the only contested boards left read-only are Nevada's");
  // The seed migration: exactly the voiced seats, rows only.
  const seeded = [...SQL.matchAll(/^\t\('([a-z]{2}-(?:statehouse|statesenate)-\d+)', /gm)].map((m) => m[1]).sort();
  eq(JSON.stringify(seeded), JSON.stringify(want), "the dd_districts seed is exactly the voiced seats");
  ok(/^INSERT INTO "dd_districts"/m.test(SQL) && /ON CONFLICT \("district_id"\) DO NOTHING;\s*$/.test(SQL), "…inserted, ON CONFLICT DO NOTHING");
  ok(!/\b(?:ALTER|CREATE|DROP|DELETE|UPDATE|TRUNCATE)\b/.test(SQL.replace(/^--.*$/gm, "")), "…and nothing but rows");
  ok(/'mn-statehouse-6', 'MN', 'statehouse', 6, 'Minnesota State House District 3B'/.test(SQL), "a lettered Minnesota seat keeps the resolver's key and prints its letter");
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
      eq(r1.status, 403, `${b.alias} · ${why}: comment is 403`);
      eq(r2.status, 403, `${b.alias} · ${why}: vote is 403`);
      eq(s.takes.length + s.votes.length, 0, `${b.alias} · ${why}: nothing written`);
      if (why === "no residency row") eq((await r1.json()).error, LOCKED_LINE, `${b.alias}: the refusal is the locked line`);
    }
  }
  // A typed zip, a saved location or a claimed residency in the body is not read.
  const s = fakeStore([]);
  const b = SAMPLE[0];
  const forged = postTo("https://politidex.fyi/api/district-board-voice",
    { seat: b.alias, issueKey: "housing", body: "x", zip: "19107", state: "PA", district: String(b.district), verified: true, residency: "verified" }, UID);
  eq((await voiceHandle(forged, s.deps)).status, 403, "a body that claims residency is still 403");
  eq(s.takes.length, 0, "…and writes nothing");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the daily cap: one comment and one vote a Mountain day for a non-member; none for a member");
// ═════════════════════════════════════════════════════════════════════════════
eq(DAILY_COMMENTS, 1, "the cap is one comment a day");
eq(DAILY_VOTES, 1, "…and one poll vote a day");
for (const b of SAMPLE) {
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
  s.clock = new Date("2026-10-28T06:01:00Z"); // 00:01 MDT the next day
  eq((await voiceHandle(comment(b.alias, UID, "Next day."), s.deps)).status, 201, `${b.alias}: the next Mountain day opens again`);
  eq((await pollHandle(vote(b.alias, UID, "support", "water"), s.deps)).status, 200, `${b.alias}: …for a vote too`);
  // A member, verified for this seat, has no daily cap.
  const MID = `member-${b.alias}`;
  const m = fakeStore([vendorRow(MID, b.seat)], { member: true, memberHash: accountHash(MID) });
  for (let i = 0; i < 3; i++) eq((await voiceHandle(comment(b.alias, MID, `Post ${i}.`), m.deps)).status, 201, `${b.alias}: member comment ${i + 1} lands`);
  eq((await pollHandle(vote(b.alias, MID, "support", "housing"), m.deps)).status, 200, `${b.alias}: member vote 1 lands`);
  eq((await pollHandle(vote(b.alias, MID, "oppose", "housing"), m.deps)).status, 200, `${b.alias}: …a changed vote lands`);
  eq((await pollHandle(vote(b.alias, MID, "support", "water"), m.deps)).status, 200, `${b.alias}: …and a vote on a second issue`);
}
for (const line of Object.values(CAP_COPY)) {
  ok(/a day on this seat/.test(line), `the refusal names the daily cap: ${line}`);
  ok(!/\$|member|upgrade|pay|unlock|premium|subscribe|join/i.test(line), `the refusal is not a sales pitch: ${line}`);
}
{
  // Tallies stay public, and reading stays free.
  const b = SAMPLE[0];
  const UID = "uid-public";
  const s = fakeStore([vendorRow(UID, b.seat)]);
  await voiceHandle(comment(b.alias, UID), s.deps);
  await pollHandle(vote(b.alias, UID), s.deps);
  const pub = await (await pollHandle(new Request(`https://politidex.fyi/api/district-board-poll?seat=${b.alias}`), s.deps)).json();
  eq(pub.polls.find((p) => p.issueKey === "housing")?.support, 1, "a signed-out reader reads the tally");
  const read = await (await voiceHandle(new Request(`https://politidex.fyi/api/district-board-voice?seat=${b.alias}`), s.deps)).json();
  eq(read.posts.length, 1, "…and the comment");
  ok(!/uid-public|authorHash|"member"/.test(JSON.stringify([pub, read])), "neither answer carries the uid, an author hash or a membership flag");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · a residency flag for one seat does not open a neighbouring seat");
// ═════════════════════════════════════════════════════════════════════════════
for (const b of SAMPLE) {
  const UID = `uid-nb-${b.alias}`;
  const s = fakeStore([vendorRow(UID, b.seat)]);
  eq((await voiceHandle(comment(b.alias, UID), s.deps)).status, 201, `${b.alias}: its own flag opens it`);
  const st = b.seat.slice(0, 2);
  // The other voiced seats in the same state (the other chamber, the next
  // district), a seat in another density state, a federal seat in the same
  // state and a Layton board.
  const near = VOICED.filter((x) => x.seat !== b.seat && x.seat.startsWith(st + "-")).slice(0, 4).map((x) => x.alias);
  const far = [SAMPLE[(SAMPLE.indexOf(b) + 1) % SAMPLE.length].alias, "ut-hd-16"];
  const fed = PLAN.filter((x) => x.federal && x.seat.startsWith(st + "-")).slice(0, 1).map((x) => x.alias);
  ok(near.length >= 1, `${b.alias}: a neighbouring voiced seat exists in its state`);
  for (const alias of [...near, ...far, ...fed]) {
    const before = s.takes.length + s.votes.length;
    eq((await voiceHandle(comment(alias, UID), s.deps)).status, 403, `${b.alias}'s flag does not open ${alias}'s composer`);
    eq((await pollHandle(vote(alias, UID), s.deps)).status, 403, `${b.alias}'s flag does not open ${alias}'s poll`);
    eq(s.takes.length + s.votes.length, before, `${alias}: nothing written`);
  }
  // A row filed under a neighbour with this seat's hash is not this seat's.
  if (near.length) {
    const nb = VOICED.find((x) => x.alias === near[0]);
    const swapped = fakeStore([{ seatKey: nb.seat, authorHash: seatHash(UID, b.seat), status: "verified", method: "vendor" }]);
    eq((await voiceHandle(comment(nb.alias, UID), swapped.deps)).status, 403, `${nb.alias}: a row carrying ${b.alias}'s hash opens nothing`);
  }
  // One check binds only seats in this board's state, whatever is sent.
  const got = coveredSeats(b.alias, [b.seat, SAMPLE[(SAMPLE.indexOf(b) + 1) % SAMPLE.length].seat, "ut-statehouse-16", "nv-statesenate-8"]);
  eq(got[0], b.seat, `${b.alias}: the board's own seat is first in the check`);
  ok(got.every((k) => k.startsWith(st + "-")), `${b.alias}: no seat outside its state is bound — ${JSON.stringify(got)}`);
  ok(!got.includes("nv-statesenate-8"), `${b.alias}: a read-only board is never bound`);
}
{
  const forged = JSON.stringify({ uid: "u1", seat: "pa-statehouse-160", seats: ["pa-statehouse-160", "tx-statehouse-34", "nv-statesenate-8", "nope"] });
  const p = parseVendorData(forged);
  ok(p && p.seats.every((k) => k.startsWith("pa-")), "a forged vendor_data cannot widen a check to another state or a read-only seat");
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
  const noCa = (src) => String(src)
    .replace(/\/\/ A seat elected by position \(Washington's House\)[^\n]*\n\/\/ alias [^\n]*\nconst POSITION_KEY_RE = [^\n]*\n\n/, "")
    .replace(" || POSITION_KEY_RE.test(s)) return s;", ") return s;")
    .replace(/  const pm = \/\^\(\[a-z\]\{2\}\)-hd-[^\n]*\n  if \(pm\) return [^\n]*\n/, "")
    .split("\n").filter((l) => !/^  "(?:ca|wa)-(?:statehouse|statesenate)-\d+(?:-p\d)?": 1,$/.test(l)).join("\n");
  eq(noCa(FN), noCa(HEAD("netlify/functions/district-board.mts")), "the counts endpoint did not move");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · no equity language, no pay button on any board, membership on /me only");
// ═════════════════════════════════════════════════════════════════════════════
{
  const BANNED = /\b(?:equity|stocks?|units?|shares?|shareholders?|earn(?:s|ed|ing|ings)?|profits?|dividends?|investors?|invest(?:ing|ment|ments)?|form\s*c|crowdfund\w*)\b/i;
  const live = (s) => s.replace(/<!--[\s\S]*?-->/g, "").replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "")
    // A candidate's name on the printed race is a name from the ballot.
    .replace(/<(a|span) class="pdxpa-name"[^>]*>[^<]*<\/\1>/g, " ").replace(/<a [^>]*>Open [^<]*’s file ›<\/a>/g, " ")
    .replace(/<[^>]+>/g, " ");
  for (const b of VOICED) {
    const doc = R(`district-${b.alias}.html`);
    const m = BANNED.exec(live(doc));
    ok(!m, `district-${b.alias}.html: no equity language${m ? ` ("${m[0]}")` : ""}`);
    ok(!/\/api\/membership|checkout\.stripe|\$20|become a member/i.test(doc), `district-${b.alias}.html: no pay button`);
  }
  const copy = [JSON.stringify(CAP_COPY), R("netlify/lib/membership-core.mjs"), R(MIG)].join("\n");
  const m = BANNED.exec(copy.replace(/\/\/[^\n]*/g, "").replace(/^--.*$/gm, ""));
  ok(!m, `the cap, its core and the migration carry no equity language${m ? ` ("${m[0]}")` : ""}`);
  has(R("me.html"), 'id="pdx-me-membership"', "the membership block is on /me");
  has(R("me.html"), '<script defer src="/me-membership.js"></script>', "…and the checkout control");
  for (const f of ["district-composer.js", "district-poll.js"]) ok(!/checkout\.stripe|\$20/.test(R(f)), `${f}: no checkout or price`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the Layton boards and every non-contested board are unchanged");
// ═════════════════════════════════════════════════════════════════════════════
{
  const CLUSTER = { "ut-sd-3": "ut-statesenate-3", "ut-hd-16": "ut-statehouse-16", "ut-sd-7": "ut-statesenate-7",
    "ut-hd-15": "ut-statehouse-15", "ut-cd-2": "ut-house-2" };
  const DIGEST = {
    "ut-sd-3": "3dbc896c67a0d23b1b5fc9aba834623982aba9978f72f201c5abbdad45a275a4",
    "ut-hd-16": "718ec1fa246c12577490ad0c69638283e4b6818bae5bb354155b2b1c5c6a7cb8",
    "ut-sd-7": "2b66dd11b3ac00c97a307c4cbc5c63f28b63f1a676b91175230bb22eed6b2788",
    "ut-hd-15": "d0d9eaea4aa011ba8d4dd6484544d0d2ac5066bb82883bd4bf27d8347e5b5c15",
    "ut-cd-2": "7e506b096ad50c72716b8f4efdd630a6d6ce4e49dc67704f37a9d344e7459e15",
  };
  for (const [alias, seat] of Object.entries(CLUSTER)) {
    eq(createHash("sha256").update(R(`district-${alias}.html`)).digest("hex"), DIGEST[alias], `district-${alias}.html is byte-identical`);
    eq(COMPOSER_SEATS[seat], alias, `${alias}: still a composer seat`);
    const UID = `uid-${alias}`;
    const s = fakeStore([vendorRow(UID, seat)]);
    eq((await voiceHandle(comment(alias, UID), s.deps)).status, 201, `${alias}: its verified resident still posts`);
    eq((await pollHandle(vote(alias, UID), s.deps)).status, 200, `${alias}: …and votes`);
  }
  // Every board document but the Minnesota race blocks' one declared retitle
  // is HEAD's bytes, and every BOARDS row but the voiced ones is HEAD's.
  for (const f of readdirSync(ROOT).filter((x) => /^district-.*\.html$/.test(x))) {
    const was = HEAD(f);
    ok(was === null || R(f) === was, `${f}: unchanged`);
  }
  const rowsOf = (src) => new Map([...String(src).matchAll(/^    '([a-z0-9_-]+)': \{ seat: .*$/gm)].map((m) => [m[1], m[0]]));
  const now = rowsOf(R("district-board.js")), was = rowsOf(HEAD("district-board.js"));
  for (const k of [...now.keys()]) if (IS_CA(k) && !was.has(k)) now.delete(k);
  eq(now.size, was.size, "BOARDS has the same number of rows — no new board");
  const voicedSeats = new Set(VOICED.map((b) => b.seat));
  for (const [k, line] of was) {
    if (voicedSeats.has(k)) eq(now.get(k), line.replace("composer: false", "composer: true"), `${k}: only composer moved`);
    else eq(now.get(k), line, `${k}: unchanged`);
  }
  const V = (src) => { const w = {}; w.window = w; vm.runInContext(src, vm.createContext(w)); return w.PDXVoice.BOARD_ROUTES; };
  const routesNoCa = (src) => { const o = V(src); for (const k of Object.keys(o)) if (IS_CA(k)) delete o[k]; return o; };
  eq(JSON.stringify(routesNoCa(R("district-voice.js"))), JSON.stringify(routesNoCa(HEAD("district-voice.js"))), "BOARD_ROUTES did not move");
  const TOML = R("netlify.toml");
  // California's redirects (its ballot view and its seven boards) lifted out,
  // the file is HEAD's.
  const tomlNoCa = (src) => String(src)
    .replace(/# California['’]s contested legislative seats[^\n]*\n(?:\[\[redirects\]\]\n  from = "\/ballot\/ca[^"]*"\n  to = "\/ballot-ca\.html"\n  status = 200\n)+/g, "")
    .replace(/# California (?:Assembly|Senate) District \d+ — [a-z0-9_]+\n(?:\[\[redirects\]\]\n  from = "\/district\/ca-(?:hd|sd)-\d+[^"]*"\n  to = "\/district-ca-(?:hd|sd)-\d+\.html"\n  status = 200\n)+\n/g, "")
    .replace(/# Washington['’]s contested legislative seats[^\n]*\n(?:\[\[redirects\]\]\n  from = "\/ballot\/wa[^"]*"\n  to = "\/ballot-wa\.html"\n  status = 200\n)+/g, "")
    .replace(/# Washington (?:House|Senate) District \d+(?:, Position \d)? — [a-z0-9_]+\n(?:\[\[redirects\]\]\n  from = "\/district\/wa-(?:hd|sd)-\d+(?:-p\d)?[^"]*"\n  to = "\/district-wa-(?:hd|sd)-\d+(?:-p\d)?\.html"\n  status = 200\n)+\n/g, "");
  eq(tomlNoCa(TOML), tomlNoCa(HEAD("netlify.toml")), "netlify.toml did not move");
  ok(![...TOML.matchAll(/from = "([^"]+)"/g)].some((m) => /^\/district\/.*\*/.test(m[1])), "no /district/* splat");
  // Utah's composer and poll rows are HEAD's; the only new rows are the voiced seats.
  const aliasesIn = (src) => [...String(src).matchAll(/^    '([a-z0-9_-]+)': 1,$/gm)].map((m) => m[1]);
  for (const f of ["district-composer.js", "district-poll.js"]) {
    const added = aliasesIn(R(f)).filter((a) => !aliasesIn(HEAD(f)).includes(a) && !IS_CA(a)).sort();
    eq(JSON.stringify(added), JSON.stringify(VOICED.map((b) => b.alias).sort()), `${f}: the only new rows are the voiced seats`);
    ok(aliasesIn(HEAD(f)).every((a) => aliasesIn(R(f)).includes(a)), `${f}: no row was dropped`);
  }
  // The worker moved one version, precaching nothing new; one migration, rows only.
  const ver = (src) => Number((/const CACHE_VERSION = 'v(\d+)';/.exec(src || "") || [])[1]);
  eq(ver(R("sw.js")), ver(HEAD("sw.js")) + 1, "sw.js: CACHE_VERSION moved exactly one step");
  const pre = (src) => (src.match(/^  '\/[^']*',$/gm) || []).sort().join("\n");
  eq(pre(R("sw.js")), pre(HEAD("sw.js")), "sw.js: the precache list is unchanged");
  const added = readdirSync(join(ROOT, "netlify/database/migrations")).filter((f) => HEAD(`netlify/database/migrations/${f}`) === null &&
    HEAD(`netlify/database/migrations/${f}/migration.sql`) === null && f !== CA_MIG && f !== WA_MIG);
  eq(JSON.stringify(added), JSON.stringify(["20261130000000_dd_districts_contested_legislative_board_seats.sql"]), "the one new migration is the dd_districts seed");
}

console.log(`\n${failures.length ? "✗" : "✓"} contested boards voice: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 50)) console.log("   ✗ " + f);
process.exit(failures.length ? 1 : 0);
