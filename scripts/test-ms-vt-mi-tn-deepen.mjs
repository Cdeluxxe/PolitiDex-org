#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-ms-vt-mi-tn-deepen.mjs — Mississippi, Vermont, Michigan and Tennessee,
// boarded whole
// ─────────────────────────────────────────────────────────────────────────────
// cmp-data.js carries a roster row for every sitting legislator in the four
// states (db/roster-state-legislators-ms-vt-mi-tn-2026-oct.json is the record:
// new Mississippi and Vermont shells, the Michigan and Tennessee rows that
// already named their seat, and seven members who were on file only as a 2026
// candidacy for another office), and scripts/gen-district-boards.mjs opens a
// board for every State House and State Senate seat there, a read-only
// governor board for each state, and MI-5, MI-6, MI-9 and MI-12 once those
// members' rows name their district.
//
// WHAT THIS SUITE PROVES:
//   1. EACH OF THE FOUR has a governor board — the Utah contract (a document,
//      three rewrites, a row in BOARDS, BOARD_ROUTES and BOARD_SEATS) with no
//      composer — and Michigan's opens on Gretchen Whitmer's row, with both
//      major-party nominees on file as candidacies.
//   2. EVERY LEGISLATIVE SEAT the roster names has a board naming its sitting
//      member; the five vacancies on file are skipped and logged; a new board is
//      read-only, and a contested Michigan board keeps its voice.
//   3. THE U.S. HOUSE GAPS CLOSE: MI-5, MI-6, MI-9 and MI-12 open now that
//      Walberg's, Dingell's, McClain's and Tlaib's rows name their district;
//      each row moved by its district alone.
//   4. SEAT KEYS: Vermont's named, multi-member districts are one board per
//      member on the existing position shape (-p1 … -p3), only where the
//      district elects that many; a one-member district is a plain key.
//   5. NO COMPOSER, NO POLL, NO EQUITY OR MONEY COPY on any new board, and no
//      migration.
//   6. NEIGHBOURING STATES ARE BYTE-IDENTICAL: every other state's documents,
//      allow-list rows and roster rows, and their resolver walks — the position
//      states (Washington, Idaho, South Dakota) and the named ones
//      (Massachusetts, New Hampshire) among them.
//   7. THE GENERATOR'S --check reports no drift; the worker moved to v490.
//
//   node scripts/test-ms-vt-mi-tn-deepen.mjs
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
const must = (c, m) => { if (!c) { console.error(`✗ ms/vt/mi/tn deepen: STALE HARNESS — ${m}`); process.exit(2); } };

// The commit this pass was built on: what it added is measured against it, so
// the check stays exact after the pass lands.
const PRE = "69376e9";
const BASE = AT(PRE);
must(BASE("cmp-data.js"), "no git baseline at " + PRE);

const FOUR = [["ms", "Mississippi"], ["vt", "Vermont"], ["mi", "Michigan"], ["tn", "Tennessee"]];
const CODES = new Set(FOUR.map(([c]) => c));
const NAMES = new Set(FOUR.map(([, n]) => n));
const inFour = (seat) => CODES.has(String(seat).slice(0, 2)) && String(seat)[2] === "-";
const REC = JSON.parse(R("db/roster-state-legislators-ms-vt-mi-tn-2026-oct.json"));
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
// The district-board, district-voice and district-board.mts runtimes in a sandbox:
// a position key on either chamber must resolve to its own board.
const runtime = (f) => { const w = { document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} }, addEventListener() {}, location: { pathname: "/" } }; w.window = w; try { vm.runInContext(R(f), vm.createContext(w)); } catch (e) { /* a DOM-bound tail is not under test */ } return w; };

// ═════════════════════════════════════════════════════════════════════════════
section("1 · each of the four has a governor board, with no composer");
// ═════════════════════════════════════════════════════════════════════════════
for (const [c] of FOUR) ok(GOVERNOR_STATES.has(c), `GOVERNOR_STATES lacks ${c}`);
const GOV_PID = { ms: "tate_reeves", vt: "phil_scott", mi: "gretchen_whitmer", tn: "bill_lee" };
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
eq(PLAN.filter((b) => /-gov$/.test(b.seat)).length, 15, "governor boards: Utah, the six, the four, these four");
// MICHIGAN'S GOVERNOR BOARD OPENS on the sitting governor's row, and the 2026
// field on Michigan's official listing is on file: both major-party nominees as
// candidacies on the rows they hold today, and every running mate.
{
  const b = BY.get("mi-gov");
  eq(b && b.member, "Gretchen Whitmer", "Michigan: the governor board does not name the sitting governor");
  const CY = W1.CMP_CANDIDACIES;
  eq(CY.jocelyn_benson && CY.jocelyn_benson.office, "Governor Candidate", "Michigan: Jocelyn Benson's candidacy");
  eq(CY.john_james && CY.john_james.office, "Governor Candidate", "Michigan: John James's candidacy");
  eq(CY.winnie_brinks && CY.winnie_brinks.office, "Lieutenant Governor Candidate", "Michigan: Winnie Brinks's candidacy");
  eq(CY.jay_deboyer && CY.jay_deboyer.office, "Lieutenant Governor Candidate", "Michigan: Jay DeBoyer's candidacy");
  for (const pid of ["anthony_hudson", "donna_brandenburg", "douglas_campbell"]) eq(RO[pid] && RO[pid].office, "Governor Candidate", `Michigan: ${pid}`);
  // Mike Duggan ended his independent campaign on 2026-05-21 and is not on the
  // official listing; no row names him a candidate.
  ok(!Object.values(RO).some((r) => /\bDuggan\b/.test(r.name || "") && /Governor/.test(r.office || "")), "Michigan: a governor-candidate row names Mike Duggan");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · every legislative seat in the four has a board");
// ═════════════════════════════════════════════════════════════════════════════
for (const [c] of FOUR) ok(STATE_LEG_BOARD_STATES.has(c), `STATE_LEG_BOARD_STATES lacks ${c}`);
must(REC.rows.length > 300, "the record lists no shells");
const holders = [...REC.rows, ...REC.alreadyHeld, ...REC.districtSet, ...REC.seatedFromCandidacy];
const boardOfPid = new Map(PLAN.filter((b) => b.stateLeg && inFour(b.seat)).map((b) => [b.pid, b]));
for (const r of REC.rows) {
  const row = RO[r.pid];
  if (!ok(row, `${r.pid}: listed in the record but not in cmp-data.js`)) continue;
  eq(row.name, r.name, `${r.pid}: name`);
  eq(row.district, r.district, `${r.pid}: district`);
  eq(row.position, r.position, `${r.pid}: position`);
  eq(row.candidate, false, `${r.pid}: not marked in office`);
  eq(RO0[r.pid], undefined, `${r.pid}: the pid already existed before this pass`);
}
for (const r of REC.seatedFromCandidacy) {
  ok(RO0[r.pid], `${r.pid}: not an existing row`);
  eq(RO[r.pid].district, r.district, `${r.pid}: district not set`);
  eq(RO[r.pid].office, r.office, `${r.pid}: does not name the seat held`);
  eq(RO[r.pid].candidate, false, `${r.pid}: still a candidate row`);
  eq(JSON.stringify(W1.CMP_CANDIDACIES[r.pid]), JSON.stringify(r.candidacy), `${r.pid}: candidacy not carried in CMP_CANDIDACIES`);
  eq(RO0[r.pid].office, r.candidacy.office, `${r.pid}: the carried candidacy is not the one the row held`);
}
for (const r of holders) ok(boardOfPid.has(r.pid), `${r.pid} (${r.state} ${r.chamber} ${r.district}): no board`);
eq(boardOfPid.size, holders.length, "a board in the four names a pid the record does not list");
const PER = REC.membersPerDistrict.Vermont;
for (const [code, name] of FOUR) {
  const legB = PLAN.filter((b) => b.stateLeg && b.seat.startsWith(code + "-"));
  const counts = STATE_LEG_SEAT_COUNTS[code];
  must(counts, `${name}: no seat count`);
  eq(JSON.stringify(counts), JSON.stringify(REC.seats[name]), `${name}: generator and record disagree on chamber sizes`);
  const members = (ch) => code === "vt" ? Object.values(PER[ch]).reduce((a, b) => a + b, 0) : counts[ch];
  const vacant = REC.vacant[name].statesenate.length + REC.vacant[name].statehouse.length;
  eq(legB.length, members("statesenate") + members("statehouse") - vacant, `${name}: not every filled seat has a board`);
  for (const b of legB) {
    const voiced = STATE_LEG_BOARD_SEATS.has(b.seat) && code === "mi";
    eq(b.readOnly, !voiced, `${name}: ${b.seat} voice`);
    onContract(b, `${name} ${b.seat}`, voiced);
    // A board that already existed is byte-for-byte what it was.
    if (BASE(b.doc) !== null) eq(R(b.doc), BASE(b.doc), `${b.seat}: an existing board moved`);
  }
  const skippedHere = SKIPPED.filter((s) => s.seat.startsWith(code + "-state")).map((s) => s.seat).sort();
  const want = ["statesenate", "statehouse"].flatMap((ch) => REC.vacant[name][ch].map((n) => `${code}-${ch}-${n}`)).sort();
  eq(skippedHere.join(","), want.join(","), `${name}: the skip list is not the vacancies on file`);
  for (const s of SKIPPED.filter((x) => x.seat.startsWith(code + "-state"))) eq(s.reason, "no sitting member on the roster", `${s.seat}: skipped for another reason`);
  console.log(`      ${name}: ${legB.length} legislative boards, ${skippedHere.length} skipped (${skippedHere.join(", ") || "none"})`);
}
eq(PLAN.filter((b) => b.stateLeg && b.seat.startsWith("mi-") && !b.readOnly).length, 10, "Michigan: the ten contested boards are not all voiced");
// Jeffrey Hulum III holds Mississippi House 119 and is the MS-4 nominee: one row, seated.
eq(BY.get("ms-statehouse-119").pid, "jeffrey_hulum", "Mississippi House 119 is not Jeffrey Hulum III's");
eq(Object.keys(RO).filter((k) => /hulum/.test(k)).join(","), "jeffrey_hulum", "Jeffrey Hulum III has a second row");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the U.S. House gaps close once each row names its district");
// ═════════════════════════════════════════════════════════════════════════════
const HOUSE = { "mi-house-5": "walberg", "mi-house-6": "debbie_dingell", "mi-house-9": "mcclain", "mi-house-12": "tlaib" };
for (const [seat, pid] of Object.entries(HOUSE)) {
  const b = BY.get(seat);
  if (!ok(b, `${seat}: no board`)) continue;
  eq(b.joinPid, pid, `${seat}: held by someone else`);
  eq(b.readOnly, true, `${seat}: takes a voice`);
  ok(FEDERAL_READ_ONLY_SEATS.has(seat), `${seat}: not on FEDERAL_READ_ONLY_SEATS`);
  onContract(b, seat);
  eq(BASE(b.doc), null, `${seat}: baseline already had a document`);
  eq(RO0[pid].district, undefined, `${pid}: baseline already named a district`);
  eq(RO[pid].district, `MI-${seat.split("-")[2]}`, `${pid}: row does not name its district`);
  const { district, ...rest } = RO[pid];
  eq(JSON.stringify(rest), JSON.stringify(RO0[pid]), `${pid}: row changed beyond its district`);
}
has(R("district-mi-cd-12.html"), "_pdxUsHouseSeat('Michigan', 12)", "MI-12's document does not ask the U.S. House join");
for (const [code, , n] of [["ms", "", 4], ["vt", "", 1], ["mi", "", 13], ["tn", "", 9]]) {
  eq(SKIPPED.filter((s) => s.seat.startsWith(code + "-house-")).length, 0, `${code}: a U.S. House seat is still skipped`);
  eq(PLAN.filter((b) => b.federal && b.chamber === "house" && b.seat.startsWith(code + "-")).length, n, `${code}: U.S. House boards`);
  for (const b of PLAN.filter((x) => x.federal && x.seat.startsWith(code + "-"))) if (!HOUSE[b.seat]) eq(R(b.doc), BASE(b.doc), `${b.seat}: federal document moved`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · Vermont's named, multi-member districts resolve to the right boards");
// ═════════════════════════════════════════════════════════════════════════════
const at = (state, sd, hd) => ({ state, city: "", county: "", district: "1", stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });
ok(PLAN.filter((b) => inFour(b.seat)).every((b) => /^[a-z]{2}-(?:gov|house-\d+|us-senate-[a-z0-9_]+|state(?:house|senate)-\d+(?:-p[1-3])?)$/.test(b.seat)), "a board in the four has a new key shape");
eq(PLAN.filter((b) => inFour(b.seat) && /-p\d$/.test(b.seat) && !b.seat.startsWith("vt-")).length, 0, "a position key outside Vermont");
{
  const vt = PLAN.filter((b) => b.stateLeg && b.seat.startsWith("vt-"));
  for (const ch of ["statesenate", "statehouse"]) {
    for (const [k, n] of Object.entries(PER[ch])) {
      const keys = vt.filter((b) => b.chamber === ch && b.district === +k).map((b) => b.seat).sort();
      const want = n === 1 ? [`vt-${ch}-${k}`] : Array.from({ length: n }, (_, i) => `vt-${ch}-${k}-p${i + 1}`);
      eq(keys.join(","), want.join(","), `Vermont ${ch} ${k}: seats`);
    }
  }
  const W = boot(at("Vermont", "4", "1"));
  eq(W.pdxLegDistrictName("Vermont", "statesenate", 4), "Chittenden Central District", "Vermont: Senate key 4 is not Chittenden Central");
  eq(W.pdxLegKeyOfDistrictName("Vermont", "statehouse", "Addison-1"), 1, "Vermont: Addison-1 is not key 1");
  eq(W.pdxLegDistrictMembers("Vermont", "statesenate", 4), 3, "Vermont: Chittenden Central does not elect three");
  eq(W.pdxLegDistrictMembers("Washington", "statehouse", 1), 0, "Washington: a per-district count appeared");
  const s = levelOf(W, "statesenate"), h = levelOf(W, "statehouse");
  eq(JSON.stringify((s.positions || []).map((p) => p.pid)), JSON.stringify(["phil_baruth", "gulick_vt", "vyhovsky_vt"]), "Vermont: Chittenden Central's three senators");
  eq(JSON.stringify((h.positions || []).map((p) => p.pid)), JSON.stringify(["scheu_vt", "sheldon_vt"]), "Vermont: Addison-1's two representatives");
  for (const [i, p] of (s.positions || []).entries()) eq(BY.get(`vt-statesenate-4-p${i + 1}`).pid, p.pid, `Vermont: Senate 4 seat ${i + 1} board`);
  const card = band(W);
  has(card, "Chittenden Central District · Seat C", "Vermont: the card does not print Seat C");
  ok(card.indexOf("Addison-1 · Seat C") < 0, "Vermont: a two-member district printed a third seat");
  const b = BY.get("vt-statesenate-4-p3");
  eq(b.h1, "Vermont Senate District Chittenden Central, Seat C", "Vermont: Senate seat heading");
  has(b.where, "one of three members it elects at large; “Seat C” is PolitiDex’s label, not the state’s", "Vermont: the board does not say the seat label is PolitiDex's");
  const W2 = boot(at("Vermont", "7", "2"));
  eq(levelOf(W2, "statesenate").pid, "ingalls_vt", "Vermont: Essex is not Russ Ingalls's");
  eq(levelOf(W2, "statesenate").positions, undefined, "Vermont: a one-member Senate district carries positions");
  eq(BY.get("vt-statehouse-2").h1, "Vermont House District Addison-2", "Vermont: one-member House heading");
  // The board runtimes read the position shape on either chamber.
  const V = runtime("district-voice.js");
  if (V.PDXVoice && typeof V.PDXVoice.boardPath === "function") {
    eq(V.PDXVoice.boardPath("vt-sd-4-p3"), "/district/vt-sd-4-p3", "district-voice.js: a Senate position alias does not route");
    eq(V.PDXVoice.boardPath("vt-statehouse-1-p2"), "/district/vt-hd-1-p2", "district-voice.js: a House position key does not route");
  }
  has(FILES.seats, 'const POSITION_KEY_RE = /^[a-z]{2}-state(?:house|senate)-[1-9][0-9]*-p[1-9]$/;', "district-board.mts: the position shape is House-only");
  has(FILES.boards, "var POSITION_KEY_RE = /^[a-z]{2}-state(?:house|senate)-[1-9][0-9]*-p[1-9]$/;", "district-board.js: the position shape is House-only");
}
{
  const W = boot(at("Mississippi", "34", "119"));
  eq(levelOf(W, "statehouse").pid, "jeffrey_hulum", "Mississippi: House 119");
  eq(levelOf(W, "statesenate").pid, null, "Mississippi: vacant Senate 34 names somebody");
  const T = boot(at("Tennessee", "31", "86"));
  eq(levelOf(T, "statesenate").pid, "brent_taylor", "Tennessee: Senate 31 is not Brent Taylor's");
  eq(levelOf(T, "statehouse").pid, "justin_pearson", "Tennessee: House 86 is not Justin J. Pearson's");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · no composer, no poll, no equity or money copy, no migration");
// ═════════════════════════════════════════════════════════════════════════════
const NEW = PLAN.filter((b) => BASE(b.doc) === null);
eq(NEW.length, NEW.filter((b) => inFour(b.seat)).length, "a new board opened outside the four states");
eq(NEW.length, 627, "new boards: 619 legislative, four governors, four U.S. House");
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
ok(same > 1700, `only ${same} other-state documents compared`);
// The allow-lists: every line outside the four states is the base's, but for
// the position shape, which now reads either chamber. That edit is declared
// here, exactly, and undone before the comparison — nothing else may differ.
const POSITION_EDITS = {
  "district-board.js": [
    ["  // <code>-statehouse-<n>-p<k>, alias <code>-hd-<n>-p<k>. A shape, not a list.\n  // Vermont's Senate elects by position too, on the same shape:\n  // <code>-statesenate-<n>-p<k>, alias <code>-sd-<n>-p<k>.\n  var POSITION_KEY_RE = /^[a-z]{2}-state(?:house|senate)-[1-9][0-9]*-p[1-9]$/;\n  var POSITION_ALIAS_RE = /^([a-z]{2})-(hd|sd)-([1-9][0-9]*)-(p[1-9])$/;",
     "  // <code>-statehouse-<n>-p<k>, alias <code>-hd-<n>-p<k>. A shape, not a list.\n  var POSITION_KEY_RE = /^[a-z]{2}-statehouse-[1-9][0-9]*-p[1-9]$/;\n  var POSITION_ALIAS_RE = /^([a-z]{2})-hd-([1-9][0-9]*)-(p[1-9])$/;"],
    ["    if (pm) return pm[1] + '-' + ALIAS_CHAMBERS[pm[2]] + '-' + pm[3] + '-' + pm[4];", "    if (pm) return pm[1] + '-statehouse-' + pm[2] + '-' + pm[3];"],
  ],
  "district-voice.js": [
    ["  // statewide one, and like it never a /d/ seat key. Vermont's Senate elects by\n  // position too, on the same shape: <code>-statesenate-<n>-p<k>, alias\n  // <code>-sd-<n>-p<k>.\n  var POSITION_KEY_RE = /^[a-z]{2}-state(?:house|senate)-[1-9][0-9]*-p[1-9]$/;",
     "  // statewide one, and like it never a /d/ seat key.\n  var POSITION_KEY_RE = /^[a-z]{2}-statehouse-[1-9][0-9]*-p[1-9]$/;"],
    ["    var m = /^([a-z]{2})-(hd|sd)-([1-9][0-9]*)-(p[1-9])$/.exec(s);\n    return m ? m[1] + '-' + (m[2] === 'sd' ? 'statesenate' : 'statehouse') + '-' + m[3] + '-' + m[4] : '';",
     "    var m = /^([a-z]{2})-hd-([1-9][0-9]*)-(p[1-9])$/.exec(s);\n    return m ? m[1] + '-statehouse-' + m[2] + '-' + m[3] : '';"],
  ],
  "netlify/functions/district-board.mts": [
    ["// alias <code>-hd-<n>-p<k> — the shape district-board-voice-core.mjs accepts.\n// Vermont's Senate elects by position too: <code>-statesenate-<n>-p<k>, alias\n// <code>-sd-<n>-p<k>, the same shape on the other chamber (read-only boards, so\n// the composer's core is not asked about it).\nconst POSITION_KEY_RE = /^[a-z]{2}-state(?:house|senate)-[1-9][0-9]*-p[1-9]$/;",
     "// alias <code>-hd-<n>-p<k> — the shape district-board-voice-core.mjs accepts.\nconst POSITION_KEY_RE = /^[a-z]{2}-statehouse-[1-9][0-9]*-p[1-9]$/;"],
    ["  const pm = /^([a-z]{2})-(hd|sd)-([1-9][0-9]*)-(p[1-9])$/.exec(s);\n  if (pm) return `${pm[1]}-${ALIAS_CHAMBERS[pm[2]]}-${pm[3]}-${pm[4]}`;",
     "  const pm = /^([a-z]{2})-hd-([1-9][0-9]*)-(p[1-9])$/.exec(s);\n  if (pm) return `${pm[1]}-statehouse-${pm[2]}-${pm[3]}`;"],
  ],
};
const keyOf = (line) => (/^\s*['"]([a-z]{2})-/.exec(line) || [])[1];
const outside = (src) => src.split("\n").filter((l) => !CODES.has(keyOf(l))).join("\n");
for (const [f, edits] of Object.entries(POSITION_EDITS)) {
  let now = R(f);
  for (const [to, from] of edits) { ok(now.indexOf(to) >= 0, `${f}: the declared position edit is not in the file`); now = now.split(to).join(from); }
  eq(outside(now), outside(BASE(f)), `${f}: a line outside the four states moved`);
}
{
  const strip = (src) => src.split(/\n(?=# )/).filter((blk) => !/from = "\/district\/(?:ms|vt|mi|tn)-/.test(blk)).join("\n");
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
// in each neighbouring state, in the position states and in the named ones.
const baseFiles = {};
for (const f of ["cmp-data.js", "voter-hub-location.js", "who-represents-me.js"]) baseFiles[f] = BASE(f);
const NEIGH = [
  at("New Hampshire", "1", "1"), at("Massachusetts", "25", "130"), at("New York", "1", "1"), at("Maine", "18", "132"),
  at("Alabama", "1", "1"), at("Arkansas", "1", "1"), at("Louisiana", "1", "1"), at("Kentucky", "1", "1"),
  at("Georgia", "1", "1"), at("North Carolina", "1", "1"), at("Virginia", "1", "1"), at("Missouri", "1", "1"),
  at("Ohio", "1", "1"), at("Indiana", "1", "1"), at("Wisconsin", "1", "1"), at("Illinois", "1", "1"),
  at("Minnesota", "13", "25"), at("Washington", "1", "1"), at("Idaho", "10", "10"), at("South Dakota", "26", "34"),
  at("South Dakota", "1", "1"), at("Utah", "7", "16"), at("Nebraska", "14", "14"),
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
  const CR = JSON.parse(R("db/roster-candidates-legislative-mi-tn-vt-2026-oct.json"));
  const CY = W1.CMP_CANDIDACIES;
  for (const [code, name] of FOUR) {
    const st = CR.states[code];
    eq(st && st.outcome, "checked", `${name}: candidate list not read`);
    const n = CR.rows.filter((r) => r.state === name).length + CR.alreadyHeld.filter((r) => r.state === code).length + CR.crossSeat.filter((r) => r.state === code).length;
    eq(n, st.officialCandidates, `${name}: not every official candidate is accounted for`);
  }
  eq(CR.states.ms.officialCandidates, 0, "Mississippi: a legislative candidate on a 2026 list");
  for (const r of CR.rows) {
    const row = RO[r.pid];
    if (!ok(row, `${r.pid}: candidate row missing`)) continue;
    eq(RO0[r.pid], undefined, `${r.pid}: the pid already existed before this pass`);
    eq(row.candidate, true, `${r.pid}: not a candidate row`);
    eq(row.office, r.office, `${r.pid}: office`);
    ok(/ State (?:Senate|House) Candidate \(District /.test(row.office), `${r.pid}: office is not a legislative candidacy`);
    ok(!PLAN.some((b) => b.pid === r.pid), `${r.pid}: a candidate opened a board`);
  }
  for (const h of CR.alreadyHeld) eq(RO[h.pid] && RO[h.pid].candidate === true, false, `${h.pid}: an incumbent's row is a candidate row`);
  for (const h of CR.crossSeat) {
    ok(CY[h.pid] && CY[h.pid].office === h.office, `${h.pid}: cross-seat candidacy not in CMP_CANDIDACIES`);
    ok(RO[h.pid] && RO[h.pid].candidate !== true, `${h.pid}: a cross-seat candidate lost the seat they hold`);
  }
  // A candidate is never seated: Matt Koleszar runs for Senate 5 from House 22,
  // and a reader there is seated with Dayna Polehanki, who holds it.
  const W = boot(at("Michigan", "5", "22"));
  eq(levelOf(W, "statehouse").pid, "koleszar_mi", "Michigan: Matt Koleszar no longer holds House 22");
  eq(levelOf(W, "statesenate").pid, "polehanki_mi", "Michigan: Senate 5 is not Dayna Polehanki's");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the generator is current and the worker moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  let code = 0;
  try { execFileSync("node", ["scripts/gen-district-boards.mjs", "--check"], { cwd: ROOT, stdio: "ignore" }); } catch (e) { code = e.status; }
  eq(code, 0, "gen-district-boards --check reports drift");
  const v = (src) => parseInt((/const CACHE_VERSION = 'v(\d+)'/.exec(src) || [])[1], 10);
  ok(v(R("sw.js")) >= 490, "sw.js did not move to v490");
  const pre = (src) => src.slice(src.indexOf("@generated district-boards begin precache"), src.indexOf("@generated district-boards end precache"));
  eq(pre(R("sw.js")), pre(BASE("sw.js")), "the precache block moved");
  has(R("sw.js"), "// v490 - FOUR MORE STATES BOARDED WHOLE: MISSISSIPPI, VERMONT, MICHIGAN AND TENNESSEE.", "sw.js does not log the pass");
  has(R("sw.js"), "no dd_districts row is needed and no migration was written.\n//     MIGRATION COST: none.\nconst CACHE_VERSION = 'v490';", "sw.js does not log the migration cost");
}

console.log(`\n${failures.length ? "✗" : "✓"} ms/vt/mi/tn deepen: ${passed} passed, ${failures.length} failed`);
if (failures.length) { for (const f of failures.slice(0, 40)) console.log("   ✗ " + f); process.exit(1); }
