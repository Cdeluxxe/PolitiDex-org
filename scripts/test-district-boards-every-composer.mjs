#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for EVERY UTAH BOARD TAKES A VOICE
// ─────────────────────────────────────────────────────────────────────────────
// The five Layton-cluster boards (SD-3, HD-16, SD-7, HD-15, UT-2) had parent
// category headers in the issue colours, a pinned strip, a composer and a poll.
// This pass brings SD-6, every generated board and the three statewide boards
// up to them. What must hold:
//
//   1. A GENERATED BOARD (HD-29) AND A STATEWIDE BOARD (ut-gov) paint parent
//      headers with their palette colour class, the pinned strip when rows
//      exist (and none when they do not), and their documents carry the
//      composer and poll hosts for their own seat, locked.
//   2. AN UNVERIFIED POST OR VOTE on any newly opened board is 403 and writes
//      nothing — signed out, no row, a location_match row, or a vendor row for
//      another seat.
//   3. A DIDIT DECISION opens the seats its session bound — its own seat and the
//      state's three statewide seats — and no other.
//   4. THE FIVE ORIGINAL BOARDS are byte-identical to the last commit, apart
//      from the served cap sentence (scripts/test-board-cap-line.mjs).
//   5. BOARD_ROUTES length is unchanged and there is no /district/* splat; the
//      generator is up to date; every board seat has a dd_districts row.
//   6. No equity, stock or share language on any board.
//
//   node scripts/test-district-boards-every-composer.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { HAND_SEATS, planBoards } from "./gen-district-boards.mjs";
// The board count is the generator's plan: the six hand rows plus every
// generated Utah and federal board.
const PLAN_BOARDS = planBoards().boards;
const BOARD_TOTAL = HAND_SEATS.length + PLAN_BOARDS.length;
const FEDERAL_TOTAL = PLAN_BOARDS.filter((b) => b.federal).length;
import { COMPOSER_SEATS, LOCKED_LINE, handle as handleVoice, seatHash } from "../netlify/lib/district-board-voice-core.mjs";
import { handle as handlePoll } from "../netlify/lib/district-board-poll-core.mjs";
import { handleStart, handleWebhook, sign, canonicalJson } from "../netlify/lib/residency-vendor-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
function report() {
  if (failures.length) {
    console.log(`\n   ${passed} passed, ${failures.length} failed\n`);
    for (const f of failures) console.log(`   ✗ ${f}`);
    process.exit(1);
  }
  console.log(`\n   ✓ every board takes a voice: all ${passed} assertions passed`);
}

const FIVE = ["ut-sd-3", "ut-hd-16", "ut-sd-7", "ut-hd-15", "ut-cd-2"];
const seatOf = (f) => (/data-pdxdb-seat="([^"]+)"/.exec(R(f)) || [, ""])[1];
// A READ-ONLY board (composer: false in district-board.js BOARDS — the
// contested Pennsylvania legislative seats) takes no voice by design, so the
// boards this suite sweeps are the voiced ones.
const READ_ONLY = new Set([...R("district-board.js").matchAll(/composer: false, alias: '([^']+)'/g)].map((m) => m[1]));
const DOCS = readdirSync(ROOT).filter((f) => /^district-[a-z]{2}-(?:(?:hd|sd|cd)-\d+|hd-\d+-p\d+|gov|us-senate-[a-z][a-z0-9_]*)\.html$/.test(f))
  .filter((f) => !READ_ONLY.has(seatOf(f))).sort();
const NEW = DOCS.map(seatOf).filter((a) => !FIVE.includes(a));
ok(NEW.length >= 80, `the newly opened boards are swept (${NEW.length})`);
for (const a of ["ut-hd-29", "ut-sd-6", "ut-gov", "ut-us-senate-lee", "ut-us-senate-curtis"]) {
  ok(NEW.includes(a), `${a} is among the newly opened boards`);
}
const canon = Object.fromEntries(Object.entries(COMPOSER_SEATS).map(([k, a]) => [a, k]));

// ═════════════════════════════════════════════════════════════════════════════
section("1 · HD-29 and ut-gov: parent colours, the pinned strip, the composer host");
// ═════════════════════════════════════════════════════════════════════════════
const MOD = R("district-board.js");
function boot(seat) {
  const win = makeSandbox();
  win.__PDX_DISTRICT_BOARD_SEAT = seat;
  const ctx = vm.createContext(win);
  win.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ counts: {}, rooms: [], proposals: [] }) });
  for (const f of ["cmp-data.js", "issue-map.js", "issue-colors.js", "stance-sides.js"]) vm.runInContext(R(f), ctx, { filename: f });
  win.PDXStances = { all: () => [], count: () => 0 };
  win.PDXYourFile = { answered: () => [], position: () => null };
  win.PDXVotingRecord = { fetchMember: () => Promise.resolve({ items: [], summary: {} }) };
  vm.runInContext(MOD, ctx, { filename: "district-board.js" });
  return { B: win.PDXDistrictBoard, win };
}
const m = (id, number, title, key) => ({
  kind: "vote", measureId: id, number, title,
  measureIdent: { session: "2025GS", billUrl: null, officialTitle: null, readFrom: null, readFromUrl: null },
  issues: key ? [{ issueKey: key, weight: 1, isPrimary: false, supportMeaning: "", rationale: null }] : [],
});
const ITEMS = [
  m(1, "H.B. 101", "Starter Home Amendments", "housing"),
  m(2, "S.B. 57", "Public Education Funding", "public_schools"),
  m(3, "H.B. 208", "Great Salt Lake Watershed", "water"),
  m(4, "H.C.R. 3", "Resolution Supporting Israel", "israel_support"),
];
const ROOMS = [
  { issueKey: "housing", polls: 5, comments: 2 },
  { issueKey: "water", polls: 3, comments: 0 },
  { issueKey: "israel_support", polls: 0, comments: 4 },
  { issueKey: "public_schools", polls: 1, comments: 1 },
];
const MANDATES = [
  { id: 7, title: "Publish every committee vote within 24 hours", supportCount: 3 },
  { id: 8, title: "Open the redistricting map files", supportCount: 1 },
  { id: 9, title: "Post every bill draft a week before its hearing", supportCount: 0 },
];
for (const seat of ["ut-hd-29", "ut-gov"]) {
  const { B, win } = boot(seat);
  const palette = (win.PDXIssueColors && win.PDXIssueColors.CORE_ISSUE_COLORS) || {};
  ok(Object.keys(palette).length > 0, `${seat}: the palette loaded`);
  ok(B.composerBoard() === true, `${seat}: a composer board from its declared seat`);
  const h = B.tableHtml("ok", ITEMS, ROOMS, MANDATES);
  const heads = [...h.matchAll(/<details class="pdxdb-parent" data-pdxdb-parent="([^"]*)"[^>]*>\s*<summary class="([^"]*)"/g)];
  ok(heads.length >= 3, `${seat}: parent headers paint (${heads.length})`);
  for (const [, key, cls] of heads) {
    ok(cls.split(/\s+/).includes(`pdxdb-ic-${key}`) && key in palette, `${seat}: parent ${key} wears its palette class`);
    ok(cls.split(/\s+/).includes("pdxdb-parent-h--collapsed"), `${seat}: parent ${key} is collapsed by default`);
  }
  ok(/data-pdxdb-layout="parents"/.test(h), `${seat}: the issue groups nest inside the parents`);
  const pin = /<section class="pdxdb-pinned" data-pdxdb-pinned=""[^>]*>([\s\S]*?)<\/section>/.exec(h);
  ok(!!pin, `${seat}: the pinned strip paints when rows exist`);
  const body = pin ? pin[1] : "";
  eq([...body.matchAll(/data-pdxdb-pin-mandate="(\d+)"/g)].map((x) => x[1]).join(","), "7,8", `${seat}: at most two mandates pinned`);
  eq([...body.matchAll(/data-pdxdb-pin-issue="([^"]+)"/g)].map((x) => x[1]).join(","), "housing,israel_support,water",
    `${seat}: the three issues with the most people who answered or commented`);
  ok(pin && h.indexOf(pin[0]) < h.indexOf('<details class="pdxdb-parent"'), `${seat}: the strip sits above the parents`);
  ok(!/data-pdxdb-pinned/.test(B.tableHtml("ok", ITEMS, [], [])), `${seat}: no strip when nothing is live`);

  const doc = R(`district-${seat}.html`);
  ok(doc.includes(`<div id="pdx-district-composer" data-pdxdc-seat="${seat}" data-pdxdc-state="locked">`), `${seat}: the composer host, locked, for its own seat`);
  ok(doc.includes(`data-pdxdc-locked="1">${LOCKED_LINE}</p>`), `${seat}: …with the locked line`);
  ok(doc.includes(`<div id="pdx-district-poll" data-pdxdp-seat="${seat}" hidden></div>`), `${seat}: the poll host for its own seat`);
  for (const s of ["/district-board.js", "/district-voice.js", "/district-composer.js", "/district-poll.js", "/voter-hub-location.js"]) {
    eq(doc.split(`<script defer src="${s}"></script>`).length - 1, 1, `${seat}: loads ${s} once`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · an unverified POST or vote on any newly opened board is 403 and writes nothing");
// ═════════════════════════════════════════════════════════════════════════════
const UID = "uid-alice";
function store(rows) {
  const s = { posts: [], votes: [] };
  s.deps = {
    async verifyUser(req) {
      const h = req.headers.get("authorization") || "";
      return h.startsWith("Bearer ") ? { uid: h.slice(7), isAnonymous: false } : null;
    },
    async findResidency(k, h) { return rows.find((r) => r.seatKey === k && r.authorHash === h) || null; },
    async issueExists(k) { return k === "housing"; },
    async listPosts() { return []; },
    async findMembership() { return { status: "active", currentPeriodEnd: null }; },
    async insertPost(v) { s.posts.push(v); return { id: s.posts.length, issueKey: v.issueKey, body: v.body, createdAt: "2026-10-11T00:00:00Z" }; },
    async countVotes() { return []; },
    async myVotes() { return []; },
    async upsertVote(v) { s.votes.push(v); return true; },
  };
  return s;
}
const req = (path, body, token) => new Request(`https://politidex.fyi${path}`, {
  method: "POST",
  headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) },
  body: JSON.stringify(body),
});
let leaks = [];
for (const alias of NEW) {
  const k = canon[alias];
  if (!k) { leaks.push(`${alias}: no composer row`); continue; }
  const other = k === "ut-statesenate-3" ? "ut-statehouse-16" : "ut-statesenate-3";
  for (const [why, rows, token] of [
    ["signed out", [], null],
    ["no residency row", [], UID],
    ["location_match", [{ seatKey: k, authorHash: seatHash(UID, k), status: "verified", method: "location_match" }], UID],
    ["vendor row for another seat", [{ seatKey: other, authorHash: seatHash(UID, other), status: "verified", method: "vendor" }], UID],
  ]) {
    const s = store(rows);
    const c = await handleVoice(req("/api/district-board-voice", { seat: alias, issueKey: "housing", body: "Hi" }, token), s.deps);
    const v = await handlePoll(req("/api/district-board-poll", { seat: alias, issueKey: "housing", choice: "support" }, token), s.deps);
    if (c.status !== 403 || v.status !== 403 || s.posts.length || s.votes.length) leaks.push(`${alias} (${why}): ${c.status}/${v.status}`);
  }
  // And its own vendor row opens both.
  const s = store([{ seatKey: k, authorHash: seatHash(UID, k), status: "verified", method: "vendor" }]);
  const c = await handleVoice(req("/api/district-board-voice", { seat: alias, issueKey: "housing", body: "Hi" }, UID), s.deps);
  const v = await handlePoll(req("/api/district-board-poll", { seat: alias, issueKey: "housing", choice: "support" }, UID), s.deps);
  if (c.status !== 201 || v.status !== 200) leaks.push(`${alias} (own vendor row): ${c.status}/${v.status}`);
}
eq(leaks.length, 0, `every newly opened board refuses the unverified and opens for its own Didit row — ${JSON.stringify(leaks.slice(0, 6))}`);

// ═════════════════════════════════════════════════════════════════════════════
section("2b · the hallway resolver names the three statewide seats for a Utah reader");
// ═════════════════════════════════════════════════════════════════════════════
{
  const dv = makeSandbox();
  // TEST LOCATION: a Utah reader in House District 29. Not a real address.
  dv.pdxRepsForMe = () => ({
    located: true, state: "Utah", county: "Tooele",
    levels: [
      { key: "statehouse", seat: "statehouse", label: "Utah House", district: 29, pid: "" },
      { key: "governor", seat: "governor", label: "Governor", statewide: true, pid: "cox" },
      { key: "senate", seat: "senate", label: "U.S. Senate", statewide: true, pid: "lee" },
      { key: "senate", seat: "senate", label: "U.S. Senate", statewide: true, pid: "curtis" },
    ],
  });
  vm.runInContext(R("district-voice.js"), vm.createContext(dv), { filename: "district-voice.js" });
  const rows = dv.PDXVoice.seatsForMe();
  const keys = rows.map((r) => r.seatKey || r.boardKey).filter(Boolean);
  for (const k of ["ut-statehouse-29", "ut-gov", "ut-us-senate-lee", "ut-us-senate-curtis"]) {
    ok(keys.includes(k), `seatsForMe() names ${k} for the proof button (${JSON.stringify(keys)})`);
  }
  ok(rows.filter((r) => r.statewide).every((r) => r.seatKey === ""), "statewide rows still carry no district seat key");
  const DC = R("district-composer.js");
  ok(/seats\[i\]\.seatKey \|\| seats\[i\]\.boardKey/.test(DC), "district-composer.js sends the statewide board keys with the start");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · a Didit decision opens the seats its session bound: its own and the statewide ones");
// ═════════════════════════════════════════════════════════════════════════════
const SECRET = "test-webhook-secret-not-a-secret";
const NOW = new Date("2026-10-11T12:00:00Z");
const NOW_S = Math.floor(NOW.getTime() / 1000);
function decisionWith(vd) {
  const body = {
    webhook_type: "status.updated", session_id: "s", status: "Approved", vendor_data: vd,
    decision: { status: "Approved", vendor_data: vd,
      id_verifications: [{ status: "Approved" }], poa_verifications: [{ status: "Approved" }] },
  };
  return new Request("https://politidex.fyi/api/residency-webhook", {
    method: "POST",
    headers: { "content-type": "application/json", "x-timestamp": String(NOW_S), "x-signature-v2": sign(SECRET, canonicalJson(body)) },
    body: JSON.stringify(body),
  });
}
// Start on the board for real (no saved location sent), then hand the webhook
// the vendor_data the start bound.
async function checkOn(alias) {
  const rows = [];
  const calls = [];
  const res = await handleStart(req("/api/residency-verify", { seat: alias }, UID), {
    verifyUser: async () => ({ uid: UID, isAnonymous: false }),
    config: () => ({ apiKey: "test-key", workflowId: "test-workflow" }),
    async findResidency(s, h) { return rows.find((r) => r.seatKey === s && r.authorHash === h) || null; },
    callbackUrl: (_r, a) => `https://politidex.fyi/district/${a}`,
    async createSession(url, headers, body) { calls.push(body); return { ok: true, data: { url: "https://verify.didit.me/x" } }; },
  });
  eq(res.status, 200, `${alias}: the start is 200`);
  const vd = calls.length ? JSON.parse(calls[0]).vendor_data : "";
  await handleWebhook(decisionWith(vd), {
    config: () => ({ webhookSecret: SECRET }),
    now: () => NOW,
    async findResidency(s, h) { return rows.find((r) => r.seatKey === s && r.authorHash === h) || null; },
    async writeVerified(s, h) { rows.push({ seatKey: s, authorHash: h, status: "verified", method: "vendor" }); },
  });
  const opened = [];
  for (const [seat, a] of Object.entries(COMPOSER_SEATS)) {
    const s = store(rows);
    const c = await handleVoice(req("/api/district-board-voice", { seat: a, issueKey: "housing", body: "Hi" }, UID), s.deps);
    const v = await handlePoll(req("/api/district-board-poll", { seat: a, issueKey: "housing", choice: "support" }, UID), s.deps);
    if (c.status === 201 && v.status === 200) opened.push(a);
    else if (c.status !== 403 || v.status !== 403) opened.push(`${a}?${c.status}/${v.status}`);
  }
  return opened.sort().join(",");
}
eq(await checkOn("ut-hd-29"), "ut-gov,ut-hd-29,ut-us-senate-curtis,ut-us-senate-lee",
   "a Didit decision for HD-29 opens HD-29, ut-gov and both Senate seats, and nothing else");
eq(await checkOn("ut-gov"), "ut-gov,ut-us-senate-curtis,ut-us-senate-lee",
   "a Didit decision for ut-gov opens ut-gov and both Senate seats, and nothing else");
eq(await checkOn("ut-us-senate-lee"), "ut-gov,ut-us-senate-curtis,ut-us-senate-lee",
   "a check started on a statewide board opens that board");
{
  // A hand-built session that binds one seat still writes that seat alone:
  // the webhook writes only what the session names.
  const rows = [];
  await handleWebhook(decisionWith(JSON.stringify({ uid: UID, seat: "ut-statehouse-29", seats: ["ut-statehouse-29"] })), {
    config: () => ({ webhookSecret: SECRET }), now: () => NOW,
    async findResidency(s, h) { return rows.find((r) => r.seatKey === s && r.authorHash === h) || null; },
    async writeVerified(s, h) { rows.push({ seatKey: s, authorHash: h }); },
  });
  eq(rows.map((r) => r.seatKey).join(","), "ut-statehouse-29", "the webhook writes only the seats the session bound");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the five original boards are unchanged apart from the cap sentence");
// ═════════════════════════════════════════════════════════════════════════════
const gitShow = (f) => {
  try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26 }); }
  catch { return null; }
};
for (const a of FIVE) {
  const f = `district-${a}.html`;
  const h = gitShow(f);
  if (h == null) { passed++; continue; }   // no git object to compare against
  // The one change allowed: the served cap sentence came out of the composer host.
  const CAP = '          <p class="pdxdb-foot" data-pdxdc-cap="1">Verified residents get one comment and five poll votes a month on this seat. A $20 yearly membership removes the monthly cap.</p>\n';
  ok(h.replace(CAP, "") === R(f), `${f} is unchanged apart from the cap sentence`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · named rows only, the generator is the source, every seat has a district row");
// ═════════════════════════════════════════════════════════════════════════════
{
  const dv = makeSandbox();
  vm.runInContext(R("district-voice.js"), vm.createContext(dv), { filename: "district-voice.js" });
  eq(Object.keys(dv.PDXVoice.BOARD_ROUTES).length, BOARD_TOTAL, "BOARD_ROUTES length is the generator's plan");
  eq(Object.keys(COMPOSER_SEATS).length, DOCS.length, "one composer seat per board document");
  ok(!/from\s*=\s*"\/district\/\*"/.test(R("netlify.toml")), "no /district/* splat in netlify.toml");
  ok(!/\/district\/\*/.test(R("sw.js").replace(/\/\/[^\n]*/g, "")), "no /district/* splat in sw.js");
  let check = "";
  try { check = execFileSync("node", ["scripts/gen-district-boards.mjs", "--check"], { cwd: ROOT, encoding: "utf8" }); }
  catch (e) { check = String(e.stdout || e.message); }
  ok(/up to date/.test(check), `the generator is up to date — ${check.trim().split("\n").pop()}`);
  const TPL = R("scripts/district-board.template.html");
  ok(TPL.includes('data-pdxdc-seat="{{ALIAS}}"') && TPL.includes('data-pdxdp-seat="{{ALIAS}}"'), "the template carries the composer and poll hosts");
  const migDir = join(ROOT, "netlify/database/migrations");
  const sql = readdirSync(migDir).map((f) => {
    const p = existsSync(join(migDir, f, "migration.sql")) ? join(migDir, f, "migration.sql") : join(migDir, f);
    return /\.sql$/.test(p) ? readFileSync(p, "utf8") : "";
  }).join("\n");
  const missing = Object.keys(COMPOSER_SEATS).filter((k) => sql.indexOf(`('${k}', '${k.slice(0, 2).toUpperCase()}'`) < 0);
  eq(missing.length, 0, `every composer seat has a dd_districts row — ${JSON.stringify(missing)}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · no equity, stock or share language on any board");
// ═════════════════════════════════════════════════════════════════════════════
const BANNED = /\bstocks?\b|\bshares?\b|\bshareholders?\b|\bequity\b|\binvest(?:or|ors|ment|ments|ing)?\b|\bdividends?\b|\bform\s*c\b|\bownership\b/i;
const live = (s) => s.replace(/<!--[\s\S]*?-->/g, "").replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");
// A candidate's NAME, as a contested board's printed race lists it from the
// official ballot (North Carolina Senate 18's Chris Stock), is a name and not
// copy about the board, so the name slots of a race are set aside.
const names = (s) => s.replace(/<(a|span) class="pdxpa-name"[^>]*>[^<]*<\/\1>/g, " ")
  .replace(/<a [^>]*>Open [^<]*’s file ›<\/a>/g, " ");
const bad = DOCS.concat(["scripts/district-board.template.html"]).filter((f) => {
  // An issue LABEL ("Invest in Public Schools") is the vocabulary's own word,
  // not copy about the board, and is never in the served markup.
  return BANNED.test(names(live(R(f))).replace(/<[^>]+>/g, " "));
});
eq(bad.length, 0, `no banned word in any board's served copy — ${JSON.stringify(bad)}`);
{
  const mutated = live(R("district-ut-hd-29.html")).replace("</main>", "<p>Every member holds equity in the district.</p></main>");
  ok(BANNED.test(mutated.replace(/<[^>]+>/g, " ")), "mutation: equity copy on HD-29 is caught");
}

report();
