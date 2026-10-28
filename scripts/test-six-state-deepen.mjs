#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-six-state-deepen.mjs — Nebraska, South Dakota, Idaho, Montana, Alaska and
// Rhode Island, boarded whole
// ─────────────────────────────────────────────────────────────────────────────
// cmp-data.js carries a roster shell for every sitting legislator in the six
// states (db/roster-state-legislators-ne-sd-id-mt-ak-ri-2026-oct.json is the
// record), and scripts/gen-district-boards.mjs opens a READ-ONLY board for every
// State House and State Senate seat the roster names there, a read-only governor
// board for each state, and NE-2 once Don Bacon's row names his district.
//
// WHAT THIS SUITE PROVES:
//   1. EACH OF THE SIX has a governor board — the Utah contract (a document, three
//      rewrites, a row in BOARDS, BOARD_ROUTES and BOARD_SEATS) with no composer.
//   2. EVERY LEGISLATIVE SEAT THE ROSTER NAMES in the six has a board on that
//      contract; every board names the shell for its seat; a seat nobody holds
//      (Rhode Island House 31) is skipped and logged. No state is half done.
//   3. NE-2 opens, now that Bacon's row names district 2.
//   4. SEAT KEYS: Alaska's Senate letters A–T, Idaho's House Positions A and B,
//      South Dakota's split seats (26A, 26B, 28A, 28B) and its at-large pairs
//      (Seat A / Seat B, PolitiDex's numbering) resolve to the right boards.
//   5. NO COMPOSER, NO POLL, NO EQUITY OR MONEY COPY on any new board, and no
//      migration.
//   6. NEIGHBOURING STATES ARE BYTE-IDENTICAL: every other state's documents,
//      allow-list rows and roster rows, and their resolver walks.
//   7. THE GENERATOR'S --check reports no drift; the worker moved to v488.
//
//   node scripts/test-six-state-deepen.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { R, AT, boot, levelOf, band } from "./state-leg-harness.mjs";
import { planBoards, STATE_LEG_BOARD_STATES, GOVERNOR_STATES, ASSIGNED_POSITION_STATES, STATE_LEG_SEAT_COUNTS } from "./gen-district-boards.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ six-state deepen: STALE HARNESS — ${m}`); process.exit(2); } };

// The commit this pass was built on: what it added is measured against it, so
// the check stays exact after the pass lands.
const PRE_SIX = "ea8ae37";
const BASE = AT(PRE_SIX);
must(BASE("cmp-data.js"), "no git baseline at " + PRE_SIX);

const SIX = [["ne", "Nebraska"], ["sd", "South Dakota"], ["id", "Idaho"], ["mt", "Montana"], ["ak", "Alaska"], ["ri", "Rhode Island"]];
const CODES = new Set(SIX.map(([c]) => c));
const inSix = (seat) => CODES.has(String(seat).slice(0, 2)) && String(seat)[2] === "-";
const REC = JSON.parse(R("db/roster-state-legislators-ne-sd-id-mt-ak-ri-2026-oct.json"));
const { boards: PLAN, skipped: SKIPPED } = planBoards();
const BY = new Map(PLAN.map((b) => [b.seat, b]));
const RO = (() => { const w = {}; w.window = w; vm.runInContext(R("cmp-data.js"), vm.createContext(w)); return w.CMP_DATA; })();
const RO0 = (() => { const w = {}; w.window = w; vm.runInContext(BASE("cmp-data.js"), vm.createContext(w)); return w.CMP_DATA; })();
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund|\bstock\b|\bmembership\b|\bdonat/i;

const FILES = {
  boards: R("district-board.js"), routes: R("district-voice.js"), seats: R("netlify/functions/district-board.mts"),
  core: R("netlify/lib/district-board-voice-core.mjs"), composer: R("district-composer.js"), poll: R("district-poll.js"),
  toml: R("netlify.toml"),
};
const onContract = (b, m) => {
  ok(existsSync(join(ROOT, b.doc)), `${m}: no document ${b.doc}`);
  has(FILES.boards, `    '${b.seat}': { seat: '${b.seat}', composer: false, alias: '${b.alias}', route: '/district/${b.alias}'`, `${m}: BOARDS row is not read-only`);
  has(FILES.routes, `    '${b.seat}': '/district/${b.alias}',`, `${m}: no BOARD_ROUTES row`);
  has(FILES.seats, `  "${b.seat}": 1,`, `${m}: no BOARD_SEATS row`);
  for (const sfx of ["", "/", ".html"]) has(FILES.toml, `  from = "/district/${b.alias}${sfx}"\n  to = "/${b.doc}"\n  status = 200`, `${m}: no rewrite for ${sfx || "bare"}`);
  ok(FILES.core.indexOf(`"${b.seat}":`) < 0, `${m}: on the server composer gate`);
  ok(FILES.composer.indexOf(`'${b.alias}': 1`) < 0, `${m}: on the composer's list`);
  ok(FILES.poll.indexOf(`'${b.alias}': 1`) < 0, `${m}: on the poll's list`);
};

// ═════════════════════════════════════════════════════════════════════════════
section("1 · each of the six has a governor board, with no composer");
// ═════════════════════════════════════════════════════════════════════════════
eq([...GOVERNOR_STATES].sort().join(","), [...CODES].sort().join(","), "GOVERNOR_STATES is not exactly the six");
const GOV_PID = { ne: "jim_pillen", sd: "larry_rhoden", id: "brad_little", mt: "greg_gianforte", ak: "dunleavy", ri: "dan_mckee" };
for (const [code, name] of SIX) {
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
}
// Utah's own governor board is unchanged and still the only one that takes a voice.
eq(BY.get("ut-gov").readOnly, undefined, "Utah's governor board lost its composer");
eq(PLAN.filter((b) => /-gov$/.test(b.seat)).length, 7, "a governor board opened outside the six and Utah");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · every legislative seat the roster names in the six has a board");
// ═════════════════════════════════════════════════════════════════════════════
eq([...STATE_LEG_BOARD_STATES].sort().join(","), [...CODES].sort().join(","), "STATE_LEG_BOARD_STATES is not exactly the six");
const shells = REC.rows;
must(shells.length > 500, "the record lists no shells");
const boardOfPid = new Map(PLAN.filter((b) => b.stateLeg && inSix(b.seat)).map((b) => [b.pid, b]));
for (const r of shells) {
  const row = RO[r.pid];
  if (!ok(row, `${r.pid}: listed in the record but not in cmp-data.js`)) continue;
  eq(row.name, r.name, `${r.pid}: name`);
  eq(row.district, r.district, `${r.pid}: district`);
  eq(row.candidate, false, `${r.pid}: not marked in office`);
  eq(RO0[r.pid], undefined, `${r.pid}: the pid already existed before this pass`);
  ok(boardOfPid.has(r.pid), `${r.pid} (${r.state} ${r.chamber} ${r.district}${r.position ? " p" + r.position : ""}): no board`);
}
eq(boardOfPid.size, shells.length, "a six-state board names a pid the record does not list");
for (const [code, name] of SIX) {
  const legB = PLAN.filter((b) => b.stateLeg && b.seat.startsWith(code + "-"));
  const legS = SKIPPED.filter((s) => s.stateLeg && s.seat.startsWith(code + "-"));
  const counts = STATE_LEG_SEAT_COUNTS[code];
  must(counts, `${name}: no seat count`);
  // seats = keys, with a position key counting once per position.
  let seats = 0;
  for (const [ch, n] of Object.entries(counts)) {
    for (let k = 1; k <= n; k++) {
      const pairs = PLAN.filter((b) => b.seat.startsWith(`${code}-${ch}-${k}-p`)).length + legS.filter((s) => s.seat.startsWith(`${code}-${ch}-${k}-p`)).length;
      seats += pairs || 1;
    }
  }
  eq(legB.length + legS.length, seats, `${name}: boards + skipped do not account for every seat`);
  for (const s of legS) eq(s.reason, "no sitting member on the roster", `${name}: ${s.seat} skipped for a reason other than a vacancy`);
  for (const b of legB) { eq(b.readOnly, true, `${name}: ${b.seat} takes a voice`); onContract(b, `${name} ${b.seat}`); }
  console.log(`      ${name}: ${legB.length} legislative boards, ${legS.length} skipped`);
}
eq(SKIPPED.filter((s) => inSix(s.seat)).map((s) => s.seat).join(","), "ri-statehouse-31", "the six states' skip list");
eq(REC.vacant["Rhode Island"].statehouse.join(","), "31", "the record does not name Rhode Island House 31 vacant");
eq(PLAN.filter((b) => b.stateLeg && b.chamber === "statehouse" && b.seat.startsWith("ne-")).length, 0, "Nebraska (one chamber) has a House board");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · NE-2 opens once Bacon's row names district 2");
// ═════════════════════════════════════════════════════════════════════════════
eq(RO.don_bacon.district, "2", "Bacon's roster row names no district");
eq(RO0.don_bacon.district, undefined, "baseline: Bacon's row already named a district");
{
  const { district, ...rest } = RO.don_bacon;
  eq(JSON.stringify(rest), JSON.stringify(RO0.don_bacon), "Bacon's row changed beyond its district");
}
const ne2 = BY.get("ne-house-2");
if (ok(ne2, "NE-2 has no board")) {
  eq(ne2.joinPid, "don_bacon", "NE-2's board is held by someone other than Bacon");
  eq(ne2.readOnly, true, "NE-2 takes a voice");
  onContract(ne2, "NE-2");
  has(R("district-ne-cd-2.html"), "_pdxUsHouseSeat('Nebraska', 2)", "NE-2's document does not ask the U.S. House join");
}
ok(!existsSync(join(ROOT, "district-ne-cd-2.html")) === false, "NE-2 has no document");
ok(BASE("district-ne-cd-2.html") === null, "baseline: NE-2 already had a document");
// Every other federal seat of the six was already boarded, and still is, unchanged.
for (const [code] of SIX) {
  for (const b of PLAN.filter((x) => x.federal && x.seat.startsWith(code + "-") && x.seat !== "ne-house-2")) {
    eq(R(b.doc), BASE(b.doc), `${b.seat}: federal document moved`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · lettered, split and position seats resolve to the right boards");
// ═════════════════════════════════════════════════════════════════════════════
const at = (state, sd, hd) => ({ state, city: "", county: "", district: "1", stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });
const shellAt = (state, chamber, district, position) =>
  shells.find((r) => r.state === state && r.chamber === chamber && r.district === district && (position ? r.position === position : r.position == null));
{
  // Alaska's Senate: A … T are keys 1 … 20, from TIGERweb's "00A" … "00T".
  const W = boot(at("Alaska", "20", "40"));
  eq(W.pdxLegDistrictKey("Alaska", "statesenate", "00A"), 1, "Alaska: 00A is not key 1");
  eq(W.pdxLegDistrictKey("Alaska", "statesenate", "00T"), 20, "Alaska: 00T is not key 20");
  "ABCDEFGHIJKLMNOPQRST".split("").forEach((L, i) => {
    const s = shellAt("Alaska", "statesenate", "District " + L);
    const b = BY.get(`ak-statesenate-${i + 1}`);
    if (!ok(s && b, `Alaska Senate ${L}: no shell or no board`)) return;
    eq(b.pid, s.pid, `Alaska Senate ${L}: the board names another member`);
    eq(b.alias, `ak-sd-${i + 1}`, `Alaska Senate ${L}: alias`);
    eq(b.h1, `Alaska Senate District ${L}`, `Alaska Senate ${L}: heading`);
  });
  eq(levelOf(W, "statesenate").pid, shellAt("Alaska", "statesenate", "District T").pid, "Alaska: a reader in Senate T is not seated with T's senator");
  eq(levelOf(W, "statesenate").districtName, "District T", "Alaska: the Senate row is not labelled District T");
}
{
  // Idaho's House: every district elects Position A (1) and Position B (2).
  const W = boot(at("Idaho", "10", "10"));
  const lv = levelOf(W, "statehouse");
  const A = shellAt("Idaho", "statehouse", "LD 10", 1), B = shellAt("Idaho", "statehouse", "LD 10", 2);
  must(A && B, "Idaho LD 10 has no position shells");
  eq(lv.pid, null, "Idaho: the district as a whole names a member");
  eq((lv.positions || []).map((p) => p.pid).join(","), `${A.pid},${B.pid}`, "Idaho LD 10: positions");
  eq(BY.get("id-statehouse-10-p1").pid, A.pid, "Idaho: id-statehouse-10-p1 is not Position A");
  eq(BY.get("id-statehouse-10-p2").pid, B.pid, "Idaho: id-statehouse-10-p2 is not Position B");
  eq(BY.get("id-statehouse-10-p1").h1, "Idaho House District 10, Position A", "Idaho: Position A heading");
  eq(W.pdxLegPositionLabel("Idaho", "statehouse", 2), "Position B", "Idaho: Position B label");
  const out = band(W);
  has(out, "District 10 · Position A", "Idaho: the card does not print Position A");
  has(out, "District 10 · Position B", "Idaho: the card does not print Position B");
  for (let d = 1; d <= 35; d++) for (const p of [1, 2]) ok(BY.get(`id-statehouse-${d}-p${p}`), `Idaho House ${d} Position ${"AB"[p - 1]}: no board`);
  eq(PLAN.filter((b) => /^id-statehouse-\d+$/.test(b.seat)).length, 0, "Idaho: a whole House district has a board");
}
{
  // South Dakota's House: 26A, 26B, 28A, 28B are lettered keys 34–37 with one
  // member each; every other district is an at-large pair at its own key, which
  // runs past the split numbers (District 27 is key 26).
  const W = boot(at("South Dakota", "26", "34"));
  const SPLIT = { "26A": 34, "26B": 35, "28A": 36, "28B": 37 };
  for (const [lab, key] of Object.entries(SPLIT)) {
    eq(W.pdxLegDistrictKey("South Dakota", "statehouse", lab), key, `South Dakota: ${lab} is not key ${key}`);
    const s = shellAt("South Dakota", "statehouse", "District " + lab);
    const b = BY.get(`sd-statehouse-${key}`);
    if (!ok(s && b, `South Dakota ${lab}: no shell or no board`)) continue;
    eq(b.pid, s.pid, `South Dakota ${lab}: the board names another member`);
    eq(b.h1, `South Dakota House District ${lab}`, `South Dakota ${lab}: heading`);
    eq(b.positionAssigned, undefined, `South Dakota ${lab}: a split seat was numbered by PolitiDex`);
  }
  eq(levelOf(W, "statehouse").pid, shellAt("South Dakota", "statehouse", "District 26A").pid, "South Dakota: a reader in 26A is not seated with 26A's member");
  eq(W.pdxLegDistrictKey("South Dakota", "statehouse", "027"), 26, "South Dakota: District 27 is not key 26");
  const W27 = boot(at("South Dakota", "27", "26"));
  const lv = levelOf(W27, "statehouse");
  const A = shellAt("South Dakota", "statehouse", "District 27", 1), B = shellAt("South Dakota", "statehouse", "District 27", 2);
  must(A && B, "South Dakota District 27 has no pair");
  eq((lv.positions || []).map((p) => p.pid).join(","), `${A.pid},${B.pid}`, "South Dakota District 27: positions");
  eq(BY.get("sd-statehouse-26-p1").pid, A.pid, "South Dakota: sd-statehouse-26-p1 is not District 27 Seat A");
  eq(BY.get("sd-statehouse-26-p1").h1, "South Dakota House District 27, Seat A", "South Dakota: District 27 Seat A heading");
  has(BY.get("sd-statehouse-26-p2").where, "PolitiDex’s label, not the state’s", "South Dakota: an at-large seat does not say its label is ours");
  has(band(W27), "District 27 · Seat B", "South Dakota: the card does not print Seat B");
  eq([...ASSIGNED_POSITION_STATES].join(","), "sd", "only South Dakota's positions are PolitiDex-assigned");
  eq(PLAN.filter((b) => b.positionAssigned).length, 66, "South Dakota: not 33 at-large pairs");
  for (const r of shells.filter((x) => x.state === "South Dakota" && x.position)) eq(r.positionAssignedBy, "PolitiDex", `${r.pid}: the record does not say the position is ours`);
  const gen = execFileSync("node", ["scripts/gen-district-boards.mjs", "--check"], { cwd: ROOT, encoding: "utf8" });
  has(gen, "66 South Dakota House boards are at-large positions PolitiDex numbered", "the generator's log does not record the assigned positions");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · no composer, no poll, no equity or money copy, no migration");
// ═════════════════════════════════════════════════════════════════════════════
const NEW = PLAN.filter((b) => BASE(b.doc) === null);
eq(NEW.length, NEW.filter((b) => inSix(b.seat)).length, "a new board opened outside the six states");
for (const b of NEW) {
  eq(b.readOnly, true, `${b.seat}: a new board takes a voice`);
  ok(!EQUITY.test(R(b.doc).replace(/<script[\s\S]*?<\/script>/g, "")), `${b.seat}: equity or money copy`);
}
for (const f of ["core", "composer", "poll"]) {
  const base = BASE(f === "core" ? "netlify/lib/district-board-voice-core.mjs" : f === "composer" ? "district-composer.js" : "district-poll.js");
  eq(FILES[f], base, `${f}: the composer's list moved`);
}
const MIG = "netlify/database/migrations";
// The newest migration at the base commit is still the newest one on disk.
const LAST_MIG = "20261202000000_dd_districts_washington_contested_board_seats.sql";
ok(BASE(`${MIG}/${LAST_MIG}`) !== null, "baseline: the last migration is not " + LAST_MIG);
eq(readdirSync(join(ROOT, MIG)).filter((f) => f > LAST_MIG).join(","), "", "a migration was added");

// ═════════════════════════════════════════════════════════════════════════════
section("6 · neighbouring states are byte-identical");
// ═════════════════════════════════════════════════════════════════════════════
const docs = readdirSync(ROOT).filter((f) => /^district-[a-z]{2}-.*\.html$/.test(f));
let same = 0;
for (const f of docs) {
  const code = f.slice(9, 11);
  if (CODES.has(code)) continue;
  if (ok(R(f) === BASE(f), `${f}: another state's board moved`)) same++;
}
ok(same > 600, `only ${same} other-state documents compared`);
const keyOf = (line) => (/^\s*['"]([a-z]{2})-/.exec(line) || [])[1];
for (const f of ["district-board.js", "district-voice.js", "netlify/functions/district-board.mts"]) {
  const now = R(f).split("\n").filter((l) => !CODES.has(keyOf(l)));
  const was = BASE(f).split("\n").filter((l) => !CODES.has(keyOf(l)));
  eq(now.join("\n"), was.join("\n"), `${f}: a line outside the six states moved`);
}
{
  const strip = (src) => src.split(/\n(?=# )/).filter((blk) => !/from = "\/district\/(?:ne|sd|id|mt|ak|ri)-/.test(blk)).join("\n");
  eq(strip(R("netlify.toml")), strip(BASE("netlify.toml")), "netlify.toml: a rewrite outside the six states moved");
}
let rows = 0;
for (const pid of Object.keys(RO0)) {
  if (pid === "don_bacon") continue;
  if (ok(JSON.stringify(RO[pid]) === JSON.stringify(RO0[pid]), `${pid}: an existing roster row moved`)) rows++;
}
for (const pid of Object.keys(RO)) if (!(pid in RO0)) ok(SIX.some(([, n]) => n === RO[pid].state), `${pid}: a new roster row outside the six states`);
// The resolver, walked at HEAD's sources and at this pass's, for a reader in
// each neighbouring state, and in two position states that were already here.
const baseFiles = {};
for (const f of ["cmp-data.js", "voter-hub-location.js", "who-represents-me.js"]) baseFiles[f] = BASE(f);
const NEIGH = [
  at("Wyoming", "5", "10"), at("North Dakota", "4", "47"), at("Oregon", "3", "5"), at("Washington", "10", "10"),
  at("Utah", "7", "16"), at("Colorado", "15", "19"), at("Minnesota", "3", "6"), at("Iowa", "1", "1"),
  at("Massachusetts", "25", "130"), at("Connecticut", "1", "1"), at("Nevada", "12", "4"), at("Kansas", "1", "1"),
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
  const CR = JSON.parse(R("db/roster-candidates-legislative-ne-sd-id-mt-ak-ri-2026-oct.json"));
  const CY = (() => { const w = {}; w.window = w; vm.runInContext(R("cmp-data.js"), vm.createContext(w)); return w.CMP_CANDIDACIES; })();
  for (const [code, name] of SIX) {
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
    ok(/ State (?:Senate|House) Candidate \(District /.test(row.office), `${r.pid}: office is not a legislative candidacy`);
    ok(!PLAN.some((b) => b.pid === r.pid), `${r.pid}: a candidate opened a board`);
  }
  for (const h of CR.alreadyHeld) eq(RO[h.pid] && RO[h.pid].candidate, false, `${h.pid}: an incumbent's row is not a sitting shell`);
  for (const h of CR.crossSeat) {
    ok(CY[h.pid] && CY[h.pid].office === h.office, `${h.pid}: cross-seat candidacy not in CMP_CANDIDACIES`);
    eq(RO[h.pid].candidate, false, `${h.pid}: a cross-seat candidate lost the seat they hold`);
  }
  // A candidate is never seated: a reader in Montana Senate 4 is seated with its
  // sitting senator, not with Amy Regier, who runs for it from House 6.
  const W = boot(at("Montana", "4", "6"));
  eq(levelOf(W, "statehouse").pid, "regier_mt", "Montana: Amy Regier no longer holds House 6");
  ok(levelOf(W, "statesenate").pid !== "regier_mt", "Montana: Amy Regier is seated in the Senate seat she is running for");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the generator is current and the worker moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  let code = 0;
  try { execFileSync("node", ["scripts/gen-district-boards.mjs", "--check"], { cwd: ROOT, stdio: "ignore" }); } catch (e) { code = e.status; }
  eq(code, 0, "gen-district-boards --check reports drift");
  const v = (src) => parseInt((/const CACHE_VERSION = 'v(\d+)'/.exec(src) || [])[1], 10);
  ok(v(R("sw.js")) >= 488, "sw.js did not move to v488");
  const pre = (src) => src.slice(src.indexOf("@generated district-boards begin precache"), src.indexOf("@generated district-boards end precache"));
  eq(pre(R("sw.js")), pre(BASE("sw.js")), "the precache block moved");
  has(R("sw.js"), "no dd_districts row is needed and no migration was written.\n//     MIGRATION COST: none.\nconst CACHE_VERSION = 'v488';", "sw.js does not log the migration cost");
}

console.log(`\n${failures.length ? "✗" : "✓"} six-state deepen: ${passed} passed, ${failures.length} failed`);
if (failures.length) { for (const f of failures.slice(0, 40)) console.log("   ✗ " + f); process.exit(1); }
