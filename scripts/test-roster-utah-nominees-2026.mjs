#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-roster-utah-nominees-2026.mjs — the Utah major-party nominees the roster
// did not hold, each with a person file and none of them seated
// ─────────────────────────────────────────────────────────────────────────────
// cmp-data.js's "Utah major-party nominees not yet on the roster" block adds
// one identity row per Republican or Democratic "Election Candidate" on the
// Utah Lt. Governor's 2026 candidate filings
// (https://vote.utah.gov/2026-candidate-filings/, read 10/21/2026) for a U.S.
// House, State Senate or State House seat, where the roster held nobody by that
// name. FILING below is that list, as filed.
//
// WHAT THIS SUITE PROVES:
//   1. Every filer has exactly one row: their name, the office and district
//      they are running for, their party as filed, `candidate: true`.
//   2. Every new person file opens and prints that office and district, and
//      calls them a candidate — never the member, the incumbent or the holder.
//   3. No sitting member's row moved: with the declared block carved out, the
//      roster is byte-identical to HEAD, the set of sitting members is the
//      same, and the roster grew by exactly the new candidates.
//   4. No duplicate pid: every key appears once in the source, none is an
//      alias key, and the seven filing-spelling bridges reach the incumbent's
//      own record rather than a second one.
//   5. No candidate is seated: no seat lookup, board or /voice card names one
//      as the sitting member, and the board plan is unchanged.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { carveDeclaredAdmissions, DECLARED_ADMISSIONS } from "./v103-chrome-seams.mjs";
import { planBoards } from "./gen-district-boards.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const HEAD = (f) => {
  try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
};

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${String(n).slice(0, 80)}" missing`);
const no = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${String(n).slice(0, 80)}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
function report() {
  if (failures.length) {
    console.log(`\n   ${passed} passed, ${failures.length} failed\n`);
    for (const f of failures.slice(0, 60)) console.log(`   ✗ ${f}`);
    process.exit(1);
  }
  console.log(`\n   ✓ Utah nominees 2026: all ${passed} assertions passed`);
}
const must = (c, m) => { if (!c) { failures.push(`FIXTURE: ${m}`); report(); } else passed++; };

// [pid, name as filed, office, district, party as filed]
const FILING = [
  ["ben_mcadams", "BEN MCADAMS", "U.S. House Candidate (UT-1)", "1", "Democratic"],
  ["riley_owen", "RILEY OWEN", "U.S. House Candidate (UT-1)", "1", "Republican"],
  ["peter_crosby", "PETER CROSBY", "U.S. House Candidate (UT-2)", "2", "Democratic"],
  ["kent_udell", "KENT S. UDELL", "U.S. House Candidate (UT-3)", "3", "Democratic"],
  ["jonny_larsen", "JONNY LARSEN", "U.S. House Candidate (UT-4)", "4", "Democratic"],
  ["claudia_bigler", "CLAUDIA BIGLER", "Utah State Senate Candidate (District 1)", "1", "Democratic"],
  ["christina_cj_hernandez", "“CJ” CHRISTINA HERNANDEZ", "Utah State Senate Candidate (District 5)", "5", "Democratic"],
  ["jared_neal", "JARED NEAL", "Utah State Senate Candidate (District 6)", "6", "Democratic"],
  ["garret_rushforth", "GARRET RUSHFORTH", "Utah State Senate Candidate (District 7)", "7", "Democratic"],
  ["stephanie_hollist", "STEPHANIE HOLLIST", "Utah State Senate Candidate (District 7)", "7", "Republican"],
  ["thaddeus_a_evans", "THADDEUS A EVANS", "Utah State Senate Candidate (District 9)", "9", "Republican"],
  ["brooks_benson", "BROOKS BENSON", "Utah State Senate Candidate (District 11)", "11", "Republican"],
  ["deidre_tyler", "DEIDRE TYLER", "Utah State Senate Candidate (District 12)", "12", "Republican"],
  ["ryan_l_mahoney", "RYAN L. MAHONEY", "Utah State Senate Candidate (District 13)", "13", "Republican"],
  ["silvia_catten", "SILVIA CATTEN", "Utah State Senate Candidate (District 13)", "13", "Democratic"],
  ["a_dane_anderson", "A DANE ANDERSON", "Utah State Senate Candidate (District 18)", "18", "Democratic"],
  ["shana_anderson", "SHANA ANDERSON", "Utah State Senate Candidate (District 19)", "19", "Democratic"],
  ["kandee_myers", "KANDEE MYERS", "Utah State Senate Candidate (District 21)", "21", "Democratic"],
  ["tucker_smith", "TUCKER SMITH", "Utah State Senate Candidate (District 23)", "23", "Democratic"],
  ["richard_robillard", "RICHARD S ROBILLARD", "Utah State Senate Candidate (District 28)", "28", "Democratic"],
  ["chris_reid", "CHRIS REID", "Utah State House Candidate (District 1)", "1", "Democratic"],
  ["barbara_haggerty", "BARBARA J. HAGGERTY", "Utah State House Candidate (District 2)", "2", "Democratic"],
  ["zane_woolstenhulme", "ZANE WOOLSTENHULME", "Utah State House Candidate (District 4)", "4", "Democratic"],
  ["kendra_penry", "KENDRA PENRY", "Utah State House Candidate (District 5)", "5", "Democratic"],
  ["bianca_mittendorf", "BIANCA MITTENDORF", "Utah State House Candidate (District 7)", "7", "Democratic"],
  ["kim_james", "KIM JAMES", "Utah State House Candidate (District 8)", "8", "Democratic"],
  ["angela_choberka", "ANGELA CHOBERKA", "Utah State House Candidate (District 9)", "9", "Democratic"],
  ["jim_alvey", "JIM ALVEY", "Utah State House Candidate (District 10)", "10", "Republican"],
  ["dave_calder", "DAVE CALDER", "Utah State House Candidate (District 11)", "11", "Democratic"],
  ["anna_graff", "ANNA GRAFF", "Utah State House Candidate (District 12)", "12", "Democratic"],
  ["erik_r_craythorne", "ERIK R. CRAYTHORNE", "Utah State House Candidate (District 13)", "13", "Republican"],
  ["jeffrey_anderson", "JEFFREY ANDERSON", "Utah State House Candidate (District 13)", "13", "Democratic"],
  ["brandon_young", "BRANDON YOUNG", "Utah State House Candidate (District 14)", "14", "Democratic"],
  ["john_taylor", "JOHN TAYLOR", "Utah State House Candidate (District 14)", "14", "Republican"],
  ["anne_berbert", "ANNE BERBERT", "Utah State House Candidate (District 15)", "15", "Democratic"],
  ["abigail_treasure", "ABIGAIL TREASURE", "Utah State House Candidate (District 16)", "16", "Democratic"],
  ["eric_last", "ERIC LAST", "Utah State House Candidate (District 17)", "17", "Democratic"],
  ["lili_bitner", "LILI BITNER", "Utah State House Candidate (District 17)", "17", "Republican"],
  ["scott_troxel", "SCOTT TROXEL", "Utah State House Candidate (District 18)", "18", "Democratic"],
  ["phil_graves", "PHIL GRAVES", "Utah State House Candidate (District 20)", "20", "Democratic"],
  ["stephen_otterstrom", "STEPHEN OTTERSTROM", "Utah State House Candidate (District 21)", "21", "Democratic"],
  ["char_varga", "CHAR VARGA", "Utah State House Candidate (District 22)", "22", "Republican"],
  ["franklin_robinson", "FRANKLIN D. ROBINSON", "Utah State House Candidate (District 23)", "23", "Republican"],
  ["braeden_oswald", "BRAEDEN J. OSWALD", "Utah State House Candidate (District 24)", "24", "Republican"],
  ["richard_nowak", "RICHARD T NOWAK", "Utah State House Candidate (District 25)", "25", "Republican"],
  ["michael_finch", "MICHAEL E FINCH", "Utah State House Candidate (District 26)", "26", "Democratic"],
  ["liz_oates", "LIZ OATES", "Utah State House Candidate (District 27)", "27", "Democratic"],
  ["anita_dalrymple", "ANITA DALRYMPLE", "Utah State House Candidate (District 28)", "28", "Democratic"],
  ["sara_snow", "SARA SNOW", "Utah State House Candidate (District 29)", "29", "Democratic"],
  ["sheldon_birch", "SHELDON BIRCH", "Utah State House Candidate (District 29)", "29", "Republican"],
  ["dave_parke", "DAVE PARKE", "Utah State House Candidate (District 30)", "30", "Republican"],
  ["melody_jones", "MELODY JONES", "Utah State House Candidate (District 31)", "31", "Republican"],
  ["aileen_hampton", "AILEEN HAMPTON", "Utah State House Candidate (District 32)", "32", "Republican"],
  ["anna_reeves", "ANNA REEVES", "Utah State House Candidate (District 33)", "33", "Republican"],
  ["julie_jackson", "JULIE JACKSON", "Utah State House Candidate (District 34)", "34", "Democratic"],
  ["monique_ketcham", "MONIQUE I. KETCHAM", "Utah State House Candidate (District 35)", "35", "Republican"],
  ["blake_townsend", "BLAKE TOWNSEND", "Utah State House Candidate (District 36)", "36", "Democratic"],
  ["casey_saxton", "CASEY SAXTON", "Utah State House Candidate (District 37)", "37", "Republican"],
  ["chris_mcconnehey", "CHRIS MCCONNEHEY", "Utah State House Candidate (District 38)", "38", "Republican"],
  ["drew_howells", "DREW HOWELLS", "Utah State House Candidate (District 39)", "39", "Democratic"],
  ["darren_croft", "DARREN CROFT", "Utah State House Candidate (District 41)", "41", "Republican"],
  ["iva_williams", "IVA WILLIAMS", "Utah State House Candidate (District 42)", "42", "Democratic"],
  ["ofa_matagi", "OFA MATAGI", "Utah State House Candidate (District 43)", "43", "Democratic"],
  ["jess_birtcher", "JESS BIRTCHER", "Utah State House Candidate (District 44)", "44", "Democratic"],
  ["rod_moser", "ROD MOSER", "Utah State House Candidate (District 45)", "45", "Democratic"],
  ["braxten_rutherford", "BRAXTEN RUTHERFORD", "Utah State House Candidate (District 46)", "46", "Democratic"],
  ["benyde_walker", "BENYDE WALKER", "Utah State House Candidate (District 48)", "48", "Democratic"],
  ["jake_hunsaker", "JAKE HUNSAKER", "Utah State House Candidate (District 48)", "48", "Republican"],
  ["lillian_bowles", "LILLIAN BOWLES", "Utah State House Candidate (District 49)", "49", "Democratic"],
  ["kristin_meyer", "KRISTIN MEYER", "Utah State House Candidate (District 50)", "50", "Democratic"],
  ["brett_nielsen", "BRETT NIELSEN", "Utah State House Candidate (District 51)", "51", "Democratic"],
  ["nicole_melling", "NICOLE MELLING", "Utah State House Candidate (District 52)", "52", "Democratic"],
  ["kevin_slater", "KEVIN R SLATER", "Utah State House Candidate (District 53)", "53", "Democratic"],
  ["kristina_robinson", "KRISTINA ROBINSON", "Utah State House Candidate (District 54)", "54", "Democratic"],
  ["travis_hysell", "TRAVIS HYSELL", "Utah State House Candidate (District 55)", "55", "Democratic"],
  ["natassja_grossman", "NATASSJA GROSSMAN", "Utah State House Candidate (District 56)", "56", "Democratic"],
  ["karli_black", "KARLI BLACK", "Utah State House Candidate (District 58)", "58", "Democratic"],
  ["celeste_johnson", "CELESTE T. JOHNSON", "Utah State House Candidate (District 59)", "59", "Democratic"],
  ["alan_jimenez", "ALAN JIMENEZ", "Utah State House Candidate (District 61)", "61", "Democratic"],
  ["david_chappell", "DAVID CHAPPELL", "Utah State House Candidate (District 62)", "62", "Democratic"],
  ["mark_youngquist", "MARK YOUNGQUIST", "Utah State House Candidate (District 63)", "63", "Democratic"],
  ["breanne_mashek", "BREANNE MASHEK", "Utah State House Candidate (District 66)", "66", "Democratic"],
  ["carl_ingwell", "CARL INGWELL", "Utah State House Candidate (District 67)", "67", "Democratic"],
  ["jr_bird", "JR BIRD", "Utah State House Candidate (District 67)", "67", "Republican"],
  ["tracie_yellowman_tso", "TRACIE YELLOWMAN TSO", "Utah State House Candidate (District 69)", "69", "Democratic"],
  ["stacey_pendergraft", "STACEY D. PENDERGRAFT", "Utah State House Candidate (District 70)", "70", "Democratic"],
  ["thomas_loveheart", "THOMAS LOVEHEART", "Utah State House Candidate (District 71)", "71", "Democratic"],
  ["eva_weldon", "EVA M WELDON", "Utah State House Candidate (District 72)", "72", "Democratic"],
  ["glenn_webb", "GLENN D WEBB", "Utah State House Candidate (District 73)", "73", "Democratic"],
  ["jeffrey_lipe", "JEFFREY N LIPE", "Utah State House Candidate (District 74)", "74", "Democratic"],
  ["rebecca_winsor", "REBECCA WINSOR", "Utah State House Candidate (District 75)", "75", "Democratic"],];
const NEW = FILING.map((f) => f[0]);
// Running incumbents who filed under another spelling of their own name: a
// bridge to their existing record, never a row.
const FILING_SPELLINGS = {
  cal_roberts: "calvin_roberts", clint_okerlund: "clinton_okerlund", jen_dailey_provost: "jennifer_dailey_provost",
  jen_plumb: "jennifer_plumb", jim_dunnigan: "james_dunnigan", norm_thurston: "nthurston", raymond_ward: "rward",
};
const BANNER = "// ── Utah major-party nominees not yet on the roster, 2026 general election (Oct 2026)";
const CODE = { Republican: "R", Democratic: "D" };
const EQUITY = /\bequity\b|\bstocks?\b|earn (?:a|your) share|\bshareholders?\b|\bdividends?\b/i;

const roster = (src) => {
  const w = makeSandbox();
  vm.runInContext(src, vm.createContext(w), { filename: "cmp-data.js" });
  return w.CMP_DATA;
};
const SRC = R("cmp-data.js");
const RO = roster(SRC);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · every filer has one row: name, office, district, party as filed");
// ═════════════════════════════════════════════════════════════════════════════
eq(new Set(NEW).size, NEW.length, "the filing list names each pid once");
{
  const decl = DECLARED_ADMISSIONS.filter((d) => d.banner === BANNER)[0];
  must(!!decl, "v103-chrome-seams.mjs: the batch is not a declared admission");
  eq(decl.pids.slice().sort().join(","), NEW.slice().sort().join(","), "the declared admission is exactly this batch");
}
const ORD = { "U.S. House": "house", "State Senate": "statesenate", "State House": "statehouse" };
for (const [pid, filed, office, district, party] of FILING) {
  const r = RO[pid];
  if (!ok(!!r, `${pid}: has a roster row`)) continue;
  const last = filed.replace(/[“”"][^“”"]*[“”"]/g, "").trim().split(/\s+/).pop().toLowerCase();
  ok(r.name.toLowerCase().replace(/-/g, " ").indexOf(last) >= 0, `${pid}: the row names ${filed} (got ${r.name})`);
  eq(r.office, office, `${pid}: the office they are running for`);
  eq(r.district, district, `${pid}: the district they are running for`);
  ok(/Candidate/.test(r.office) && new RegExp(`(?:District ${district}|UT-${district})\\)$`).test(r.office), `${pid}: the office string names the district`);
  eq(r.state, "Utah", `${pid}: Utah`);
  eq(r.partyFiled, party, `${pid}: the party as filed`);
  eq(r.party, CODE[party] || party, `${pid}: the roster's code for that party`);
  eq(r.candidate, true, `${pid}: a candidate`);
  eq(r.candidacyStatus, "active", `${pid}: actively running`);
  eq(r.nextElection, "2026-11-03", `${pid}: on the November 3, 2026 ballot`);
  eq(r.score, null, `${pid}: no score`);
  ok(r.kept === 0 && r.broken === 0 && r.pending === 0, `${pid}: an empty ledger`);
  eq(JSON.stringify(r.issues), "[]", `${pid}: no issues guessed`);
  ok(!EQUITY.test(JSON.stringify(r)), `${pid}: no equity language`);
}
ok(!EQUITY.test(SRC.slice(SRC.indexOf(BANNER))), "the block's comments carry no equity language");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · every new person file opens on the office and district they are running for");
// ═════════════════════════════════════════════════════════════════════════════
const FILES = [
  "cmp-data.js", "cmp-data-detail.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
  "stance-helpers.js", "alignment-tool.js", "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js", "profile-spine.js", "issue-colors.js",
  "my-stances.js", "voter-hub-location.js", "roster-keys.js", "seat-field.js", "person-link.js", "profile-evidence.js", "profiles-full.js",
];
const PH = R("person.html");
const PDX_AT = PH.indexOf("// ── PDXStance — shared canonical stance language");
const PDX_BLOCK = PDX_AT < 0 ? "" : PH.slice(PH.lastIndexOf("<script>", PDX_AT) + 8, PH.indexOf("</script>", PDX_AT));
function boot() {
  const w = makeSandbox();
  const by = {};
  const el = (id) => {
    const n = {
      id, innerHTML: "", textContent: "", style: { setProperty() {}, removeProperty() {} }, dataset: {}, children: [],
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute() {}, getAttribute() { return null; }, removeAttribute() {}, addEventListener() {}, removeEventListener() {},
      appendChild(c) { return c; }, querySelector() { return null; }, querySelectorAll() { return []; },
      insertAdjacentHTML() {}, remove() {}, focus() {}, scrollTo() {}, scrollIntoView() {},
    };
    if (id) by[id] = n;
    return n;
  };
  w.document.getElementById = (id) => by[id] || el(id);
  w.document.createElement = () => el("");
  w.__byId = by;
  w._pdxDisplayScore = () => "";
  w._likeCounts = {};
  if (typeof w.URLSearchParams !== "function") w.URLSearchParams = URLSearchParams;
  w.console = Object.assign({}, console, { log() {}, info() {}, warn() {} });
  const ctx = vm.createContext(w);
  w.__err = [];
  for (const f of FILES) { try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { w.__err.push(`${f}: ${e.message}`); } }
  try { vm.runInContext(PDX_BLOCK, ctx, { filename: "person.html#PDXStance" }); } catch (e) { w.__err.push(`PDXStance: ${e.message}`); }
  w.PROFILES = w.CMP_DATA;
  return w;
}
const visible = (h) => String(h).replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&rsquo;|&#39;/g, "’").replace(/&ldquo;|&rdquo;|&quot;/g, "\"").replace(/\s+/g, " ");
const W = boot();
must(typeof W.openModal === "function", `the person file did not boot — ${W.__err.join(" | ")}`);
const SEATED_WORDS = /\b(?:incumbent|sitting member|holds this seat|holds the seat|currently serves|current member)\b/i;
for (const [pid, , office] of FILING) {
  if (W.__byId["modal-content"]) W.__byId["modal-content"].innerHTML = "";
  try { W.openModal(pid); } catch (e) { /* homepage chrome this harness does not carry; the painted content is the claim */ }
  const text = visible((W.__byId["modal-content"] || {}).innerHTML || "");
  ok(text.length > 1500, `${pid}: the person file painted`);
  has(text, office, `${pid}: the file prints the office and district they are running for`);
  has(text, W.CMP_DATA[pid].name, `${pid}: the file names them`);
  has(text, "2026 Candidate", `${pid}: the file calls them a candidate`);
  ok(!SEATED_WORDS.test(text), `${pid}: the file never says they hold the seat (${(text.match(SEATED_WORDS) || [""])[0]})`);
}
// The address resolves to the row itself: no bridge sends a new pid anywhere else.
for (const pid of NEW) eq(W.PDXProfilePid(pid), pid, `/p/${pid} opens ${pid}'s own file`);

// ═════════════════════════════════════════════════════════════════════════════
section("3 · no sitting member's row moved, and the roster grew by exactly the new candidates");
// ═════════════════════════════════════════════════════════════════════════════
{
  // THIS batch carved out, and only this one: from its banner (and the comma
  // that joined it to the row before) to the next declared banner, or to the
  // close when it is the last block. A later batch after it changes nothing here.
  const at = SRC.indexOf(BANNER);
  must(at > 0 && SRC.lastIndexOf(",\n", at) === at - 2, "the batch's block could not be located in cmp-data.js");
  const nextBanner = SRC.indexOf("\n// ── ", at + BANNER.length);
  const carved = nextBanner > at
    ? SRC.slice(0, at - 2) + "," + SRC.slice(nextBanner)
    : SRC.slice(0, at - 2) + SRC.slice(SRC.lastIndexOf("\n});"));
  const base = roster(carved);
  const baseKeys = Object.keys(base);
  eq(Object.keys(RO).length, baseKeys.length + NEW.length, "roster length = the roster without this batch + the new candidates");
  ok(baseKeys.every((k) => JSON.stringify(base[k]) === JSON.stringify(RO[k])), "every other row is the same record");
  eq(Object.keys(RO).filter((k) => !base[k]).sort().join(","), NEW.slice().sort().join(","), "the only new keys are the new candidates");
  const sitting = (o) => Object.keys(o).filter((k) => !o[k].candidate && !/\bcandidate\b|\bnominee\b|\bformer\b/i.test(String(o[k].office || ""))).sort().join(",");
  eq(sitting(RO), sitting(base), "the set of sitting members is unchanged");
  const h = HEAD("cmp-data.js");
  if (h != null) eq(carveDeclaredAdmissions(h), carveDeclaredAdmissions(SRC), "with the declared batches carved out, cmp-data.js is byte-identical to HEAD");
  else passed++;
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · no duplicate pid, and filing spellings bridge to the existing record");
// ═════════════════════════════════════════════════════════════════════════════
{
  const keys = [...SRC.matchAll(/^\s*"([a-z0-9_]+)":\s*\{$/gm)].map((m) => m[1]);
  const seen = new Map();
  for (const k of keys) seen.set(k, (seen.get(k) || 0) + 1);
  const dup = [...seen].filter(([, n]) => n > 1).map(([k]) => k);
  eq(dup.join(","), "", "no pid is written twice in cmp-data.js");
  for (const pid of NEW) eq(seen.get(pid), 1, `${pid}: one row`);
  const AL = W.PDX_PROFILE_ALIAS || {};
  for (const pid of NEW) ok(!Object.prototype.hasOwnProperty.call(AL, pid), `${pid}: not an alias key for somebody else`);
  // No new row is somebody the roster already held: no Utah record outside the
  // batch carries the same first and last name.
  const nm = (s) => String(s).toLowerCase().replace(/[“”"][^“”"]*[“”"]/g, " ").replace(/[^a-z ]/g, " ").split(/\s+/).filter((t) => t.length > 1);
  const held = Object.keys(RO).filter((k) => NEW.indexOf(k) < 0 && /utah|^ut\b/i.test(String(RO[k].state || "")));
  for (const pid of NEW) {
    const t = nm(RO[pid].name);
    const twin = held.filter((k) => { const u = nm(RO[k].name); return u[0] === t[0] && u[u.length - 1] === t[t.length - 1]; });
    eq(twin.join(","), "", `${pid}: not a second row for a person the roster already holds`);
  }
  for (const [k, v] of Object.entries(FILING_SPELLINGS)) {
    eq(AL[k], v, `${k}: bridged to ${v}`);
    ok(!RO[k], `${k}: no row of its own`);
    ok(!!RO[v] && !RO[v].candidate, `${v}: the bridge lands on the sitting member's own record`);
    eq(W.PDXProfilePid(k), v, `/p/${k} opens ${v}'s file`);
  }
  // The three copies of the alias table carry the same bridges.
  const PA = R("profile-alias.js"), IDX = R("index.html");
  for (const [k, v] of Object.entries(FILING_SPELLINGS)) {
    ok(new RegExp(`\\b${k}:\\s*'${v}'`).test(PA), `profile-alias.js: ${k} → ${v}`);
    ok(new RegExp(`\\b${k}: '${v}'`).test(IDX), `index.html PROFILE_ALIASES: ${k} → ${v}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · no candidate is seated on any lookup, board or /voice card");
// ═════════════════════════════════════════════════════════════════════════════
const NEWSET = new Set(NEW);
const JOIN = (() => {
  const w = makeSandbox();
  const ctx = vm.createContext(w);
  for (const f of ["cmp-data.js", "voter-hub-location.js", "seated-member.js"]) vm.runInContext(R(f), ctx, { filename: f });
  return w;
})();
for (let n = 1; n <= 4; n++) {
  const p = JOIN._pdxUsHouseSeat("Utah", n) || "";
  ok(!NEWSET.has(p), `UT-${n}: the U.S. House join names no candidate (${p})`);
  ok(!!p && !RO[p].candidate, `UT-${n}: the U.S. House join still names its sitting member`);
}
for (const [chamber, count] of [["statehouse", 75], ["statesenate", 29]]) {
  for (let n = 1; n <= count; n++) ok(!NEWSET.has(JOIN.pdxSeatedMemberFor(`ut-${chamber}-${n}`, n) || ""), `ut-${chamber}-${n}: no candidate seated`);
}
{
  const sw = JOIN._pdxStatewideSeats("Utah");
  ok(!sw.ambiguous && !(sw.senators || []).some((p) => NEWSET.has(p)) && !NEWSET.has(sw.governor), "Utah's statewide seats name no candidate");
}
{
  const { boards } = planBoards();
  eq(boards.length, 518, "the board plan is unchanged: no board opened for a candidate");
  ok(!boards.some((b) => NEWSET.has(b.pid) || NEWSET.has(b.joinPid)), "no board names a candidate as its member");
  ok(!boards.some((b) => NEW.some((p) => b.seat.indexOf(p) >= 0)), "no board key is a candidate's");
  const FN = R("netlify/functions/district-board.mts") + R("netlify/lib/district-board-voice-core.mjs") + R("district-composer.js") +
    R("district-poll.js") + R("district-board.js") + R("district-voice.js") + R("netlify.toml");
  for (const pid of NEW) no(FN, `'${pid}'`, `${pid}: on no board, composer, poll or residency list`);
}
// /voice, driven, for readers in the seats these nominees are running for.
const LOC = R("voter-hub-location.js");
const swFrom = LOC.indexOf("var _pdxStatewideCache = {};");
const resTo = LOC.indexOf("window._vhSyncDistrictStrip = function()", swFrom);
must(swFrom !== -1 && resTo > swFrom, "voter-hub-location.js: the resolver slice is gone");
const RESOLVER = LOC.slice(swFrom, resTo);
const RET_SRC = (() => {
  const at = LOC.indexOf("window.PDXReturn = (function () {");
  const end = LOC.indexOf("\n  })();", at);
  return LOC.slice(at, end + "\n  })();".length);
})();
function voice(loc) {
  const win = makeSandbox();
  let now = 1000000;
  win.Date = { now: () => now };
  const mk = (id) => ({
    id, innerHTML: "", _attrs: {},
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null; },
  });
  const els = { "pdx-voice-standing": mk("pdx-voice-standing"), "pdx-voice-seats": mk("pdx-voice-seats") };
  win.document.getElementById = (id) => els[id] || null;
  win.__PDX_VOICE_DOC = true;
  win.location = { href: "https://politidex.fyi/voice", pathname: "/voice", search: "", hash: "", origin: "https://politidex.fyi", assign() {}, replace() {} };
  win._hasUserLocation = true;
  win._currentVoterLocation = JSON.parse(JSON.stringify(loc));
  win.PROFILES = JSON.parse(JSON.stringify(RO));
  const ctx = vm.createContext(win);
  vm.runInContext(R("profile-alias.js"), ctx, { filename: "profile-alias.js" });
  vm.runInContext(R("seated-member.js"), ctx, { filename: "seated-member.js" });
  vm.runInContext(RESOLVER, ctx, { filename: "voter-hub-location.js[pdxRepsForMe]" });
  vm.runInContext(RET_SRC, ctx, { filename: "voter-hub-location.js#PDXReturn" });
  vm.runInContext(R("district-voice.js"), ctx, { filename: "district-voice.js" });
  vm.runInContext(R("voice-room.js"), ctx, { filename: "voice-room.js" });
  now += 20000;
  win.PDXVoiceRoom.paint();
  return { html: els["pdx-voice-seats"].innerHTML, seats: win.PDXVoice.seatsForMe() };
}
for (const [who, loc] of [
  ["UT-1 / SD-7 / HD-13", { state: "Utah", city: "", county: "", district: "1", stateSenateDistrict: "7", stateHouseDistrict: "13" }],
  ["UT-2 / SD-6 / HD-16", { state: "Utah", city: "", county: "", district: "2", stateSenateDistrict: "6", stateHouseDistrict: "16" }],
  ["UT-3 / SD-13 / HD-59", { state: "Utah", city: "", county: "", district: "3", stateSenateDistrict: "13", stateHouseDistrict: "59" }],
  ["UT-4 / SD-28 / HD-75", { state: "Utah", city: "", county: "", district: "4", stateSenateDistrict: "28", stateHouseDistrict: "75" }],
]) {
  const { html, seats } = voice(loc);
  must(seats.length >= 4, `${who}: the hallway resolved no seats`);
  for (const s of seats) ok(!NEWSET.has(s.pid), `${who}: the ${s.key} card does not seat a candidate (${s.pid})`);
  for (const pid of NEW) no(html, `/p/${pid}"`, `${who}: /voice links no candidate as a seat's member`);
}

report();
