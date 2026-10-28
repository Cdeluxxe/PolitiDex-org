#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-four-state-deepen.mjs — Maine, Colorado, Minnesota and Nevada, boarded
// whole
// ─────────────────────────────────────────────────────────────────────────────
// cmp-data.js carries a roster row for every sitting legislator in the four
// states (db/roster-state-legislators-me-co-mn-nv-2026-oct.json is the record:
// new shells, rows that already named the seat, leaders that gained their
// district, and four members who were on file only as a 2026 candidacy for
// another office), and scripts/gen-district-boards.mjs opens a board for every
// State House, State Assembly and State Senate seat there, a read-only governor
// board for each state, and ME-1, ME-2, CO-1, CO-2, CO-4, MN-2, MN-5 and MN-6
// once those members' rows name their district.
//
// WHAT THIS SUITE PROVES:
//   1. EACH OF THE FOUR has a governor board — the Utah contract (a document,
//      three rewrites, a row in BOARDS, BOARD_ROUTES and BOARD_SEATS) with no
//      composer.
//   2. EVERY LEGISLATIVE SEAT in the four has a board naming its sitting member;
//      no seat is skipped (no chamber has a vacancy on file); a new board is
//      read-only, and a contested Colorado or Minnesota board keeps its voice.
//   3. THE U.S. HOUSE GAPS CLOSE: ME-1 and ME-2 open now that Pingree's and
//      Golden's rows name their district, and so do CO-1, CO-2, CO-4, MN-2, MN-5
//      and MN-6; each row moved by its district alone.
//   4. SEAT KEYS: Minnesota's lettered House (1A … 67B, keys 1 … 134) and
//      Nevada's Assembly resolve to the right boards, with no new key shape.
//   5. NO COMPOSER, NO POLL, NO EQUITY OR MONEY COPY on any new board, and no
//      migration.
//   6. NEIGHBOURING STATES ARE BYTE-IDENTICAL: every other state's documents,
//      allow-list rows and roster rows, and their resolver walks.
//   7. THE GENERATOR'S --check reports no drift; the worker moved to v489.
//
//   node scripts/test-four-state-deepen.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { R, AT, boot, levelOf, band } from "./state-leg-harness.mjs";
import { planBoards, STATE_LEG_BOARD_STATES, GOVERNOR_STATES, STATE_LEG_SEAT_COUNTS, STATE_LEG_BOARD_SEATS, FEDERAL_READ_ONLY_SEATS } from "./gen-district-boards.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ four-state deepen: STALE HARNESS — ${m}`); process.exit(2); } };

// The commit this pass was built on: what it added is measured against it, so
// the check stays exact after the pass lands.
const PRE_FOUR = "76a69b7";
const BASE = AT(PRE_FOUR);
must(BASE("cmp-data.js"), "no git baseline at " + PRE_FOUR);

const FOUR = [["me", "Maine"], ["co", "Colorado"], ["mn", "Minnesota"], ["nv", "Nevada"]];
const CODES = new Set(FOUR.map(([c]) => c));
const NAMES = new Set(FOUR.map(([, n]) => n));
const inFour = (seat) => CODES.has(String(seat).slice(0, 2)) && String(seat)[2] === "-";
const REC = JSON.parse(R("db/roster-state-legislators-me-co-mn-nv-2026-oct.json"));
const { boards: PLAN, skipped: SKIPPED } = planBoards();
const BY = new Map(PLAN.map((b) => [b.seat, b]));
const load = (src) => { const w = {}; w.window = w; vm.runInContext(src, vm.createContext(w)); return w; };
const W1 = load(R("cmp-data.js")), W0 = load(BASE("cmp-data.js"));
const RO = W1.CMP_DATA, RO0 = W0.CMP_DATA;
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund|\bstock\b|\bmembership\b|\bdonat/i;

const FILES = {
  boards: R("district-board.js"), routes: R("district-voice.js"), seats: R("netlify/functions/district-board.mts"),
  core: R("netlify/lib/district-board-voice-core.mjs"), composer: R("district-composer.js"), poll: R("district-poll.js"),
  toml: R("netlify.toml"),
};
const onContract = (b, m, voiced = false) => {
  ok(existsSync(join(ROOT, b.doc)), `${m}: no document ${b.doc}`);
  has(FILES.boards, `    '${b.seat}': { seat: '${b.seat}', composer: ${voiced ? "true" : "false"}, alias: '${b.alias}', route: '/district/${b.alias}'`, `${m}: BOARDS row`);
  has(FILES.routes, `    '${b.seat}': '/district/${b.alias}',`, `${m}: no BOARD_ROUTES row`);
  has(FILES.seats, `  "${b.seat}": 1,`, `${m}: no BOARD_SEATS row`);
  for (const sfx of ["", "/", ".html"]) has(FILES.toml, `  from = "/district/${b.alias}${sfx}"\n  to = "/${b.doc}"\n  status = 200`, `${m}: no rewrite for ${sfx || "bare"}`);
  if (voiced) return;
  ok(FILES.core.indexOf(`"${b.seat}":`) < 0, `${m}: on the server composer gate`);
  ok(FILES.composer.indexOf(`'${b.alias}': 1`) < 0, `${m}: on the composer's list`);
  ok(FILES.poll.indexOf(`'${b.alias}': 1`) < 0, `${m}: on the poll's list`);
};

// ═════════════════════════════════════════════════════════════════════════════
section("1 · each of the four has a governor board, with no composer");
// ═════════════════════════════════════════════════════════════════════════════
for (const [c] of FOUR) ok(GOVERNOR_STATES.has(c), `GOVERNOR_STATES lacks ${c}`);
const GOV_PID = { me: "janet_mills", co: "jared_polis", mn: "tim_walz", nv: "joe_lombardo" };
for (const [code, name] of FOUR) {
  const b = BY.get(`${code}-gov`);
  if (!ok(b, `${name}: no governor board`)) continue;
  eq(b.pid, GOV_PID[code], `${name}: governor board names the wrong pid`);
  eq(RO[b.pid].office, "Governor", `${name}: governor's roster office`);
  eq(b.readOnly, true, `${name}: governor board takes a voice`);
  eq(b.where, `Statewide · the whole State of ${name}`, `${name}: governor board's place line`);
  onContract(b, `${name} governor`);
  const doc = R(b.doc);
  has(doc, `<link rel="canonical" href="https://politidex.fyi/district/${code}-gov" />`, `${name}: governor document's canonical`);
  has(doc, `governor (statewide) → ${b.pid}`, `${name}: governor document's roster note`);
  eq(BASE(b.doc), null, `${name}: baseline already had a governor board`);
}
eq(PLAN.filter((b) => /-gov$/.test(b.seat)).length, 11, "governor boards: Utah, the six, the four");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · every legislative seat in the four has a board");
// ═════════════════════════════════════════════════════════════════════════════
for (const [c] of FOUR) ok(STATE_LEG_BOARD_STATES.has(c), `STATE_LEG_BOARD_STATES lacks ${c}`);
must(REC.rows.length > 400, "the record lists no shells");
const holders = [...REC.rows, ...REC.alreadyHeld, ...REC.districtSet, ...REC.seatedFromCandidacy];
const boardOfPid = new Map(PLAN.filter((b) => b.stateLeg && inFour(b.seat)).map((b) => [b.pid, b]));
for (const r of REC.rows) {
  const row = RO[r.pid];
  if (!ok(row, `${r.pid}: listed in the record but not in cmp-data.js`)) continue;
  eq(row.name, r.name, `${r.pid}: name`);
  eq(row.district, r.district, `${r.pid}: district`);
  eq(row.candidate, false, `${r.pid}: not marked in office`);
  eq(RO0[r.pid], undefined, `${r.pid}: the pid already existed before this pass`);
}
for (const r of [...REC.districtSet, ...REC.seatedFromCandidacy]) {
  ok(RO0[r.pid], `${r.pid}: not an existing row`);
  eq(RO[r.pid] && RO[r.pid].district, r.district, `${r.pid}: district not set`);
}
for (const r of REC.seatedFromCandidacy) {
  eq(RO[r.pid].office, r.office, `${r.pid}: does not name the seat held`);
  eq(RO[r.pid].candidate, false, `${r.pid}: still a candidate row`);
  eq(JSON.stringify(W1.CMP_CANDIDACIES[r.pid]), JSON.stringify(r.candidacy), `${r.pid}: candidacy not carried in CMP_CANDIDACIES`);
  eq(RO0[r.pid].office, r.candidacy.office, `${r.pid}: the carried candidacy is not the one the row held`);
}
for (const r of holders) ok(boardOfPid.has(r.pid), `${r.pid} (${r.state} ${r.chamber} ${r.district}): no board`);
eq(boardOfPid.size, holders.length, "a four-state board names a pid the record does not list");
for (const [code, name] of FOUR) {
  const legB = PLAN.filter((b) => b.stateLeg && b.seat.startsWith(code + "-"));
  const counts = STATE_LEG_SEAT_COUNTS[code];
  must(counts, `${name}: no seat count`);
  eq(JSON.stringify(counts), JSON.stringify(REC.seats[name]), `${name}: generator and record disagree on chamber sizes`);
  eq(legB.length, counts.statesenate + counts.statehouse, `${name}: not every seat has a board`);
  for (const b of legB) {
    const voiced = STATE_LEG_BOARD_SEATS.has(b.seat) && (code === "co" || code === "mn");
    eq(b.readOnly, !voiced, `${name}: ${b.seat} voice`);
    onContract(b, `${name} ${b.seat}`, voiced);
    // A board that already existed is byte-for-byte what it was.
    if (BASE(b.doc) !== null) eq(R(b.doc), BASE(b.doc), `${b.seat}: an existing board moved`);
  }
  console.log(`      ${name}: ${legB.length} legislative boards, 0 skipped`);
}
eq(SKIPPED.filter((s) => inFour(s.seat)).map((s) => s.seat).join(","), "", "the four states' skip list");
for (const [name, ch] of Object.entries(REC.vacant)) for (const v of Object.values(ch)) eq(v.length, 0, `${name}: the record names a vacancy`);
// The two seats Open States had not caught up with are named from the chamber's own list.
eq(BY.get("co-statehouse-32").member, "Maria Gonzalez", "Colorado House 32: the appointee is not seated");
eq(BY.get("mn-statehouse-41").member, "Joe Schomacker", "Minnesota House 21A: not seated");
// The tribal representatives hold no district and have no row.
eq(REC.notAdded.length, 2, "Maine's two tribal representatives are not recorded as left out");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the U.S. House gaps close once each row names its district");
// ═════════════════════════════════════════════════════════════════════════════
const HOUSE = { "me-house-1": "chellie_pingree", "me-house-2": "jared_golden", "co-house-1": "diana_degette", "co-house-2": "neguse",
  "co-house-4": "boebert", "mn-house-2": "angie_craig", "mn-house-5": "omar", "mn-house-6": "emmer" };
for (const [seat, pid] of Object.entries(HOUSE)) {
  const b = BY.get(seat);
  if (!ok(b, `${seat}: no board`)) continue;
  eq(b.joinPid, pid, `${seat}: held by someone else`);
  eq(b.readOnly, true, `${seat}: takes a voice`);
  ok(FEDERAL_READ_ONLY_SEATS.has(seat), `${seat}: not on FEDERAL_READ_ONLY_SEATS`);
  onContract(b, seat);
  eq(BASE(b.doc), null, `${seat}: baseline already had a document`);
  eq(RO0[pid].district, undefined, `${pid}: baseline already named a district`);
  eq(RO[pid].district, `${seat.slice(0, 2).toUpperCase()}-${seat.split("-")[2]}`, `${pid}: row does not name its district`);
  const { district, ...rest } = RO[pid];
  eq(JSON.stringify(rest), JSON.stringify(RO0[pid]), `${pid}: row changed beyond its district`);
}
has(R("district-me-cd-1.html"), "_pdxUsHouseSeat('Maine', 1)", "ME-1's document does not ask the U.S. House join");
has(R("district-me-cd-2.html"), "_pdxUsHouseSeat('Maine', 2)", "ME-2's document does not ask the U.S. House join");
for (const [code] of FOUR) {
  const fed = PLAN.filter((b) => b.federal && b.chamber === "house" && b.seat.startsWith(code + "-"));
  eq(SKIPPED.filter((s) => s.seat.startsWith(code + "-house-")).length, 0, `${code}: a U.S. House seat is still skipped`);
  for (const b of fed) if (!HOUSE[b.seat]) eq(R(b.doc), BASE(b.doc), `${b.seat}: federal document moved`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · Minnesota's lettered House and Nevada's Assembly resolve to the right boards");
// ═════════════════════════════════════════════════════════════════════════════
const at = (state, sd, hd) => ({ state, city: "", county: "", district: "1", stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });
{
  const W = boot(at("Minnesota", "13", "25"));
  eq(W.pdxLegDistrictKey("Minnesota", "statehouse", "01A"), 1, "Minnesota: 1A is not key 1");
  eq(W.pdxLegDistrictKey("Minnesota", "statehouse", "67B"), 134, "Minnesota: 67B is not key 134");
  eq(W.pdxLegDistrictKey("Minnesota", "statehouse", "13A"), 25, "Minnesota: 13A is not key 25");
  eq(levelOf(W, "statehouse").pid, "lisa_demuth", "Minnesota: a reader in 13A is not seated with the Speaker");
  const b = BY.get("mn-statehouse-25");
  eq(b && b.pid, "lisa_demuth", "Minnesota: mn-statehouse-25 is not 13A's board");
  eq(b && b.h1, "Minnesota House District 13A", "Minnesota: 13A heading");
  eq(PLAN.filter((x) => /^mn-statehouse-\d+-p\d+$/.test(x.seat)).length, 0, "Minnesota: a position key was invented");
}
{
  const W = boot(at("Nevada", "6", "1"));
  eq(levelOf(W, "statesenate").pid, "nicole_cannizzaro", "Nevada: a reader in Senate 6 is not seated with the Majority Leader");
  eq(BY.get("nv-statehouse-1").h1, "Nevada Assembly District 1", "Nevada: Assembly heading");
}
{
  const W = boot(at("Maine", "18", "132"));
  eq(levelOf(W, "statesenate").pid, "rick_bennett", "Maine: Senate 18 is not Rick Bennett's");
  eq(levelOf(W, "statehouse").pid, "ryan_fecteau", "Maine: House 132 is not the Speaker's");
}
ok(PLAN.filter((b) => inFour(b.seat)).every((b) => /^[a-z]{2}-(?:gov|house-\d+|us-senate-[a-z0-9_]+|state(?:house|senate)-\d+)$/.test(b.seat)), "a four-state board has a new key shape");

// ═════════════════════════════════════════════════════════════════════════════
section("5 · no composer, no poll, no equity or money copy, no migration");
// ═════════════════════════════════════════════════════════════════════════════
const NEW = PLAN.filter((b) => BASE(b.doc) === null);
eq(NEW.length, NEW.filter((b) => inFour(b.seat)).length, "a new board opened outside the four states");
for (const b of NEW) {
  eq(b.readOnly, true, `${b.seat}: a new board takes a voice`);
  ok(!EQUITY.test(R(b.doc).replace(/<script[\s\S]*?<\/script>/g, "")), `${b.seat}: equity or money copy`);
}
for (const f of ["netlify/lib/district-board-voice-core.mjs", "district-composer.js", "district-poll.js"]) eq(R(f), BASE(f), `${f}: the composer's list moved`);
const MIG = "netlify/database/migrations";
const LAST_MIG = "20261202000000_dd_districts_washington_contested_board_seats.sql";
ok(BASE(`${MIG}/${LAST_MIG}`) !== null, "baseline: the last migration is not " + LAST_MIG);
eq(readdirSync(join(ROOT, MIG)).filter((f) => f > LAST_MIG).join(","), "", "a migration was added");

// ═════════════════════════════════════════════════════════════════════════════
section("6 · neighbouring states are byte-identical");
// ═════════════════════════════════════════════════════════════════════════════
const docs = readdirSync(ROOT).filter((f) => /^district-[a-z]{2}-.*\.html$/.test(f));
let same = 0;
for (const f of docs) {
  if (CODES.has(f.slice(9, 11))) continue;
  if (ok(R(f) === BASE(f), `${f}: another state's board moved`)) same++;
}
ok(same > 1200, `only ${same} other-state documents compared`);
const keyOf = (line) => (/^\s*['"]([a-z]{2})-/.exec(line) || [])[1];
for (const f of ["district-board.js", "district-voice.js", "netlify/functions/district-board.mts"]) {
  const now = R(f).split("\n").filter((l) => !CODES.has(keyOf(l)));
  const was = BASE(f).split("\n").filter((l) => !CODES.has(keyOf(l)));
  eq(now.join("\n"), was.join("\n"), `${f}: a line outside the four states moved`);
}
{
  const strip = (src) => src.split(/\n(?=# )/).filter((blk) => !/from = "\/district\/(?:me|co|mn|nv)-/.test(blk)).join("\n");
  eq(strip(R("netlify.toml")), strip(BASE("netlify.toml")), "netlify.toml: a rewrite outside the four states moved");
}
let rows = 0;
for (const pid of Object.keys(RO0)) {
  if (NAMES.has(String(RO0[pid].state || "").split(" ·")[0])) continue;
  if (ok(JSON.stringify(RO[pid]) === JSON.stringify(RO0[pid]), `${pid}: an existing roster row outside the four moved`)) rows++;
}
ok(rows > 5000, `only ${rows} roster rows compared`);
for (const pid of Object.keys(RO)) if (!(pid in RO0)) ok(NAMES.has(RO[pid].state), `${pid}: a new roster row outside the four states`);
for (const pid of Object.keys(W0.CMP_CANDIDACIES)) eq(JSON.stringify(W1.CMP_CANDIDACIES[pid]), JSON.stringify(W0.CMP_CANDIDACIES[pid]), `${pid}: an existing candidacy moved`);
for (const pid of Object.keys(W1.CMP_CANDIDACIES)) if (!(pid in W0.CMP_CANDIDACIES)) ok(NAMES.has(W1.CMP_CANDIDACIES[pid].state), `${pid}: a new candidacy outside the four`);
// The resolver, walked at the base's sources and at this pass's, for a reader
// in each neighbouring state and in states that hold leadership-titled rows.
const baseFiles = {};
for (const f of ["cmp-data.js", "voter-hub-location.js", "who-represents-me.js"]) baseFiles[f] = BASE(f);
const NEIGH = [
  at("New Hampshire", "1", "1"), at("Vermont", "1", "1"), at("Massachusetts", "25", "130"), at("Wyoming", "5", "10"),
  at("Utah", "7", "16"), at("Idaho", "10", "10"), at("North Dakota", "4", "47"), at("Iowa", "1", "1"),
  at("Wisconsin", "1", "1"), at("South Dakota", "26", "34"), at("Arizona", "1", "1"), at("California", "1", "1"),
  at("Louisiana", "1", "1"), at("New York", "1", "1"), at("Kansas", "1", "1"), at("Nebraska", "14", "14"),
];
for (const loc of NEIGH) {
  const A = boot(Object.assign({}, loc)), B = boot(Object.assign({}, loc), baseFiles);
  const pick = (w) => JSON.stringify((w.pdxRepsForMe().levels || []).map((l) => [l.key, l.pid, l.district, l.distLabel, (l.positions || []).map((p) => p.pid)]));
  eq(pick(A), pick(B), `${loc.state}: the resolver walk moved`);
  eq(band(A), band(B), `${loc.state}: the card moved`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("6b · every 2026 legislative candidate on file is on the roster, and none is seated");
// ═════════════════════════════════════════════════════════════════════════════
{
  const CR = JSON.parse(R("db/roster-candidates-legislative-me-co-mn-nv-2026-oct.json"));
  const CY = W1.CMP_CANDIDACIES;
  for (const [code, name] of FOUR) {
    const st = CR.states[code];
    eq(st && st.outcome, "checked", `${name}: candidate list not read`);
    const n = CR.rows.filter((r) => r.state === name).length + CR.alreadyHeld.filter((r) => r.state === code).length + CR.crossSeat.filter((r) => r.state === code).length;
    eq(n, st.officialCandidates, `${name}: not every official candidate is accounted for`);
  }
  for (const r of CR.rows) {
    const row = RO[r.pid];
    if (!ok(row, `${r.pid}: candidate row missing`)) continue;
    eq(RO0[r.pid], undefined, `${r.pid}: the pid already existed before this pass`);
    eq(row.candidate, true, `${r.pid}: not a candidate row`);
    eq(row.office, r.office, `${r.pid}: office`);
    ok(/ State (?:Senate|House|Assembly) Candidate \(District /.test(row.office), `${r.pid}: office is not a legislative candidacy`);
    ok(!PLAN.some((b) => b.pid === r.pid), `${r.pid}: a candidate opened a board`);
  }
  for (const h of CR.alreadyHeld) eq(RO[h.pid] && RO[h.pid].candidate === true, false, `${h.pid}: an incumbent's row is a candidate row`);
  for (const h of CR.crossSeat) {
    ok(CY[h.pid] && CY[h.pid].office === h.office, `${h.pid}: cross-seat candidacy not in CMP_CANDIDACIES`);
    ok(RO[h.pid] && RO[h.pid].candidate !== true, `${h.pid}: a cross-seat candidate lost the seat they hold`);
  }
  // A candidate is never seated: Ben Bakeberg runs for Senate 54 from House 54B,
  // and a reader there is seated with Eric Pratt, who holds it.
  const W = boot(at("Minnesota", "54", String(boot(at("Minnesota", "1", "1")).pdxLegDistrictKey("Minnesota", "statehouse", "54B"))));
  eq(levelOf(W, "statehouse").pid, "bakeberg_mn", "Minnesota: Ben Bakeberg no longer holds House 54B");
  eq(levelOf(W, "statesenate").pid, "eric_pratt", "Minnesota: Senate 54 is not Eric Pratt's");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the generator is current and the worker moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  let code = 0;
  try { execFileSync("node", ["scripts/gen-district-boards.mjs", "--check"], { cwd: ROOT, stdio: "ignore" }); } catch (e) { code = e.status; }
  eq(code, 0, "gen-district-boards --check reports drift");
  const v = (src) => parseInt((/const CACHE_VERSION = 'v(\d+)'/.exec(src) || [])[1], 10);
  ok(v(R("sw.js")) >= 489, "sw.js did not move to v489");
  const pre = (src) => src.slice(src.indexOf("@generated district-boards begin precache"), src.indexOf("@generated district-boards end precache"));
  eq(pre(R("sw.js")), pre(BASE("sw.js")), "the precache block moved");
  has(R("sw.js"), "// v489 - FOUR MORE STATES BOARDED WHOLE: MAINE, COLORADO, MINNESOTA AND NEVADA.", "sw.js does not log the pass");
  has(R("sw.js"), "no dd_districts row is needed and no migration was written.\n//     MIGRATION COST: none.\nconst CACHE_VERSION = 'v489';", "sw.js does not log the migration cost");
}

console.log(`\n${failures.length ? "✗" : "✓"} four-state deepen: ${passed} passed, ${failures.length} failed`);
if (failures.length) { for (const f of failures.slice(0, 40)) console.log("   ✗ " + f); process.exit(1); }
