#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for THE VERIFIED LINE ON EVERY VOICED BOARD
// ─────────────────────────────────────────────────────────────────────────────
// Every board with a sitting member in the voiced set (the generated Utah
// boards, the statewide boards and the original five) carries a composer and a
// poll. The gate is the server's and is unchanged: signed in AND a
// vendor-verified residency row for THAT exact seat. A reader who passes it
// sees the box and the poll enabled plus ONE line:
//
//     “You’re verified for this seat. You can post and vote here.”
//
// Everyone else sees the existing locked line. What must hold:
//
//   1. A VENDOR ROW FOR ANY ONE SEAT opens the composer and the poll on THAT
//      seat's board, and on no other board.
//   2. A ROW FOR A DIFFERENT SEAT leaves the board locked (both endpoints).
//   3. THE CLIENT prints the verified line only when the server says canPost,
//      enables the form, and prints the locked line otherwise.
//   4. GENERATED AND STATEWIDE BOARDS carry the composer and poll hosts.
//   5. THE COUNTS ENDPOINT still returns only aggregates.
//   6. No new route, no /district/* splat, no equity language.
//
//   node scripts/test-board-verified-line.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { COMPOSER_SEATS, LOCKED_LINE, handle as handleVoice, seatHash } from "../netlify/lib/district-board-voice-core.mjs";
import { handle as handlePoll } from "../netlify/lib/district-board-poll-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const flush = async (n = 12) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };

const VERIFIED = "You’re verified for this seat. You can post and vote here.";
const COMPOSER = R("district-composer.js");
const FIVE = ["ut-sd-3", "ut-hd-16", "ut-sd-7", "ut-hd-15", "ut-cd-2"];
// The Utah voiced set: every composer seat whose alias is a Utah board.
const UT = Object.entries(COMPOSER_SEATS).filter(([, a]) => a.startsWith("ut-")).map(([k, a]) => ({ k, a }));
ok(UT.length >= 80, `the Utah voiced set is swept (${UT.length})`);
for (const a of [...FIVE, "ut-hd-29", "ut-sd-6", "ut-gov", "ut-us-senate-lee", "ut-us-senate-curtis"]) {
  ok(UT.some((s) => s.a === a), `${a} is in the voiced set`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("1–2 · a vendor row opens its own seat's board, and only that one");
// ═════════════════════════════════════════════════════════════════════════════
const UID = "uid-alice";
function deps(rows) {
  const s = { posts: [], votes: [] };
  s.d = {
    async verifyUser(req) {
      const h = req.headers.get("authorization") || "";
      return h.startsWith("Bearer ") ? { uid: h.slice(7), isAnonymous: false } : null;
    },
    async findResidency(k, h) { return rows.find((r) => r.seatKey === k && r.authorHash === h) || null; },
    async issueExists(k) { return k === "housing"; },
    async listPosts() { return []; },
    async listGeneral() { return []; },
    async findMembership() { return { status: "active", currentPeriodEnd: null }; },
    async insertPost(v) { s.posts.push(v); return { id: s.posts.length, issueKey: v.issueKey, body: v.body, createdAt: "2026-11-03T00:00:00Z" }; },
    async countVotes() { return []; },
    async myVotes() { return []; },
    async upsertVote(v) { s.votes.push(v); return true; },
  };
  return s;
}
const post = (path, body, token) => new Request(`https://politidex.fyi${path}`, {
  method: "POST",
  headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) },
  body: JSON.stringify(body),
});
const get = (path, seat, token) => new Request(`https://politidex.fyi${path}?seat=${encodeURIComponent(seat)}`, {
  headers: token ? { authorization: "Bearer " + token } : {},
});
const vendorRow = (k) => ({ seatKey: k, authorHash: seatHash(UID, k), status: "verified", method: "vendor" });

const opened = [], leaked = [], lockedWrong = [];
let sampleOpen = null, sampleLocked = null;
for (const own of UT) {
  const rows = [vendorRow(own.k)];
  for (const b of UT) {
    const s = deps(rows);
    const gv = await (await handleVoice(get("/api/district-board-voice", b.a, UID), s.d)).json();
    const gp = await (await handlePoll(get("/api/district-board-poll", b.a, UID), s.d)).json();
    const mine = b.k === own.k;
    const canPost = !!(gv.voice && gv.voice.canPost === true);
    const canVote = !!(gp.voice && gp.voice.canVote === true);
    if (mine) {
      if (!canPost || !canVote) opened.push(`${b.a}: own row did not open (${canPost}/${canVote})`);
      if (!sampleOpen) sampleOpen = gv;
    } else {
      if (canPost || canVote) leaked.push(`${own.a} row opened ${b.a}`);
      if (gv.voice.line !== LOCKED_LINE || gp.voice.line !== LOCKED_LINE) lockedWrong.push(`${own.a} → ${b.a}`);
      if (!sampleLocked) sampleLocked = gv;
    }
  }
}
eq(opened.length, 0, `every seat's own vendor row opens its composer and poll — ${JSON.stringify(opened.slice(0, 5))}`);
eq(leaked.length, 0, `no row opens another seat's board — ${JSON.stringify(leaked.slice(0, 5))}`);
eq(lockedWrong.length, 0, `another seat's board answers the locked line — ${JSON.stringify(lockedWrong.slice(0, 5))}`);

// And the writes: a row for one seat is 403 on a different seat, 201/200 on its own.
for (const [own, other] of [["ut-statehouse-29", "ut-statehouse-16"], ["ut-gov", "ut-statesenate-3"], ["ut-statesenate-3", "ut-gov"]]) {
  const alias = COMPOSER_SEATS[other], ownAlias = COMPOSER_SEATS[own];
  if (!ok(alias && ownAlias, `${own} and ${other} are composer seats`)) continue;
  const s = deps([vendorRow(own)]);
  const c = await handleVoice(post("/api/district-board-voice", { seat: alias, issueKey: "housing", body: "Hi" }, UID), s.d);
  const v = await handlePoll(post("/api/district-board-poll", { seat: alias, issueKey: "housing", choice: "support" }, UID), s.d);
  eq(c.status, 403, `${ownAlias} row posting on ${alias}: refused`);
  eq(v.status, 403, `${ownAlias} row voting on ${alias}: refused`);
  eq(s.posts.length + s.votes.length, 0, `${ownAlias} row on ${alias}: nothing written`);
  const c2 = await handleVoice(post("/api/district-board-voice", { seat: ownAlias, issueKey: "housing", body: "Hi" }, UID), s.d);
  const v2 = await handlePoll(post("/api/district-board-poll", { seat: ownAlias, issueKey: "housing", choice: "support" }, UID), s.d);
  eq(c2.status, 201, `${ownAlias} row posting on ${ownAlias}: taken`);
  eq(v2.status, 200, `${ownAlias} row voting on ${ownAlias}: taken`);
}
// A location_match row (not vendor) and a signed-out reader stay locked.
{
  const k = "ut-statehouse-29", a = COMPOSER_SEATS[k];
  const s = deps([{ ...vendorRow(k), method: "location_match" }]);
  const gv = await (await handleVoice(get("/api/district-board-voice", a, UID), s.d)).json();
  eq(gv.voice.canPost, false, "a location_match row does not open the box");
  const out = await (await handleVoice(get("/api/district-board-voice", a, null), deps([]).d)).json();
  eq(out.voice.canPost, false, "a signed-out reader does not open the box");
}

// EVERY EXISTING BOARD, not only Utah's: its own vendor row opens it, and a
// row for the next seat in the list (and for a Utah seat) leaves it locked.
{
  const ALL = Object.entries(COMPOSER_SEATS).map(([k, a]) => ({ k, a }));
  ok(ALL.length >= 2500, `every existing board is a composer seat (${ALL.length})`);
  const bad = [];
  for (let i = 0; i < ALL.length; i++) {
    const b = ALL[i], next = ALL[(i + 1) % ALL.length];
    for (const [rows, want, why] of [[[vendorRow(b.k)], true, "own"], [[vendorRow(next.k)], false, "next"], [[vendorRow("ut-statehouse-16")], b.k === "ut-statehouse-16", "utah"]]) {
      const s = deps(rows);
      const gv = await (await handleVoice(get("/api/district-board-voice", b.a, UID), s.d)).json();
      const gp = await (await handlePoll(get("/api/district-board-poll", b.a, UID), s.d)).json();
      if ((gv.voice.canPost === true) !== want || (gp.voice.canVote === true) !== want) bad.push(`${b.a} (${why})`);
    }
  }
  eq(bad.length, 0, `every board opens for its own row only — ${JSON.stringify(bad.slice(0, 6))}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the client prints the verified line only when the server opens the box");
// ═════════════════════════════════════════════════════════════════════════════
ok(COMPOSER.includes("var VERIFIED_LINE = 'You\\u2019re verified for this seat. You can post and vote here.';"),
  "district-composer.js declares the verified line verbatim");
async function paint(alias, voiceRead) {
  const nodes = {};
  const win = {
    console, JSON, String, Number, Boolean, Array, Object, RegExp, Error, Math, Date, Promise, URL,
    encodeURIComponent, decodeURIComponent, parseInt, isNaN,
    setTimeout() { return 0; }, clearTimeout() {},
    location: { pathname: `/district/${alias}`, search: "", hash: "", origin: "https://politidex.fyi", assign() {} },
    document: { readyState: "complete", addEventListener() {}, getElementById(id) { return nodes[id] || null; } },
    auth: { currentUser: { isAnonymous: false, getIdToken: () => Promise.resolve("tok") }, onAuthStateChanged() {} },
    async fetch(url) {
      const u = String(url);
      if (u.startsWith("/api/membership")) return { ok: true, status: 200, json: async () => ({ signedIn: true, member: true }) };
      if (u.startsWith("/api/district-board-voice")) return { ok: true, status: 200, json: async () => voiceRead };
      return { ok: false, status: 404, json: async () => ({}) };
    },
  };
  win.window = win;
  const host = {
    innerHTML: "", attrs: { "data-pdxdc-seat": alias },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
    querySelector() { return null; }, querySelectorAll() { return []; },
  };
  nodes["pdx-district-composer"] = host;
  vm.runInContext(COMPOSER, vm.createContext(win), { filename: "district-composer.js" });
  await flush();
  return { html: host.innerHTML, state: host.attrs["data-pdxdc-state"] };
}
const formOf = (h) => (/<form[\s\S]*?<\/form>/.exec(h) || [""])[0];
{
  const open = await paint("ut-hd-29", sampleOpen);
  eq(open.state, "open", "verified: the host reads open");
  eq(open.html.split(VERIFIED).length - 1, 1, "verified: the verified line prints once");
  ok(!open.html.includes(LOCKED_LINE), "verified: the locked line is gone");
  ok(!/data-pdxdc-locked/.test(open.html), "verified: no locked marker");
  ok(!/You are a verified resident of this seat/.test(open.html), "verified: no second sentence saying the same thing");
  ok(!/\bdisabled\b/.test(formOf(open.html)), "verified: the form is enabled");

  const shut = await paint("ut-hd-16", sampleLocked);
  eq(shut.state, "locked", "another seat's row: the host reads locked");
  ok(shut.html.includes(`<p class="pdxdc-locked" data-pdxdc-locked="1">${LOCKED_LINE}</p>`), "another seat's row: the locked line");
  ok(!shut.html.includes(VERIFIED), "another seat's row: no verified line");
  ok(/<textarea[^>]*\bdisabled\b/.test(formOf(shut.html)), "another seat's row: the box is disabled");

  const fail = await paint("ut-hd-29", { posts: [], voice: { canPost: false, reason: "signed_out", line: LOCKED_LINE } });
  ok(!fail.html.includes(VERIFIED), "signed out: no verified line");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · generated and statewide boards carry the composer and poll hosts");
// ═════════════════════════════════════════════════════════════════════════════
{
  const missing = [];
  for (const { a } of UT) {
    let doc = "";
    try { doc = R(`district-${a}.html`); } catch { missing.push(`${a}: no document`); continue; }
    if (!doc.includes(`<div id="pdx-district-composer" data-pdxdc-seat="${a}" data-pdxdc-state="locked">`)) missing.push(`${a}: composer host`);
    if (!doc.includes(`<div id="pdx-district-poll" data-pdxdp-seat="${a}" hidden></div>`)) missing.push(`${a}: poll host`);
    if (!doc.includes(`data-pdxdc-locked="1">${LOCKED_LINE}</p>`)) missing.push(`${a}: served locked line`);
    if (doc.includes(VERIFIED)) missing.push(`${a}: verified line served statically`);
  }
  eq(missing.length, 0, `every Utah voiced board carries both hosts, served locked — ${JSON.stringify(missing.slice(0, 5))}`);
  for (const a of ["ut-gov", "ut-us-senate-lee", "ut-us-senate-curtis", "ut-hd-29", "ut-sd-6"]) {
    ok(R(`district-${a}.html`).includes('id="pdx-district-composer"'), `${a}: composer host`);
  }
}

// The boards that were read-only before this pass now carry the composer.
{
  const { FEDERAL_READ_ONLY_SEATS, GOVERNOR_STATES } = await import("./gen-district-boards.mjs");
  const was = [...FEDERAL_READ_ONLY_SEATS, ...[...GOVERNOR_STATES].map((c) => `${c}-gov`),
    "mn-statesenate-5", "me-statehouse-151", "vt-statehouse-1-p2", "ak-statesenate-1"];
  const DB = R("district-board.js"), DP = R("district-poll.js");
  ok(!/composer: false/.test(DB), "no board row is composer: false");
  const MIG = R("netlify/database/migrations/20261203000000_dd_districts_every_existing_board_seat.sql");
  const gaps = [];
  for (const k of was) {
    const a = COMPOSER_SEATS[k];
    if (!a) { gaps.push(`${k}: not a composer seat`); continue; }
    if (!COMPOSER.includes(`'${a}': 1,`) || !DP.includes(`'${a}': 1,`)) gaps.push(`${a}: client lists`);
    if (!R(`district-${a}.html`).includes(`<div id="pdx-district-composer" data-pdxdc-seat="${a}" data-pdxdc-state="locked">`)) gaps.push(`${a}: host`);
    if (!MIG.includes(`('${k}', '`)) gaps.push(`${k}: no dd_districts row`);
  }
  eq(gaps.length, 0, `previously read-only boards now take a voice — ${JSON.stringify(gaps.slice(0, 6))}`);
  ok(!/\b(?:voice_residency|voice_takes|voice_poll_votes|voice_take_likes)\b[^\n]*\bINSERT\b|INSERT INTO "voice_/.test(MIG), "the migration seeds no residency, take, like or vote");
  eq((MIG.match(/^\t\('/gm) || []).length, new Set([...MIG.matchAll(/^\t\('([^']+)'/gm)].map((m) => m[1])).size, "one row per seat");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the counts endpoint still returns only aggregates");
// ═════════════════════════════════════════════════════════════════════════════
{
  const FN = R("netlify/functions/district-board.mts");
  const VOICE_UNION = (FN.match(/const voicePeople = db[\s\S]*?\.as\("voice_people"\);/) || [""])[0];
  const selects = [...FN.replace(VOICE_UNION, "").matchAll(/\.select\(\{([\s\S]*?)\}\)/g)].map((m) => m[1]);
  ok(selects.length >= 8, `district-board.mts selects found (${selects.length})`);
  ok(selects.every((s) => s.includes("countDistinct(")), "every select is a COUNT DISTINCT");
  for (const spelling of [".limit(", "selectDistinct", "select()", ".findFirst", ".findMany"]) {
    ok(!FN.includes(spelling), `district-board.mts: no row read (${spelling})`);
  }
  ok(!FN.includes("VERIFIED_LINE") && !/residency.*canPost/.test(FN), "the counts endpoint answers no personal standing");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · no new route, no splat, no equity language");
// ═════════════════════════════════════════════════════════════════════════════
{
  const toml = R("netlify.toml");
  ok(!/from\s*=\s*"\/district\/\*"/.test(toml), "netlify.toml has no /district/* splat");
  const EQUITY = /\bequity\b|\bstocks?\b|\bshares?\b|\bshareholders?\b|\binvest/i;
  ok(!EQUITY.test(VERIFIED), "the verified line carries no equity language");
  const docs = readdirSync(ROOT).filter((f) => /^district-ut-.*\.html$/.test(f));
  ok(docs.length >= UT.length, `Utah board documents present (${docs.length})`);
}

if (failures.length) {
  console.log(`\n   ${passed} passed, ${failures.length} failed\n`);
  for (const f of failures) console.log(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`\n   ✓ the verified line: all ${passed} assertions passed`);
