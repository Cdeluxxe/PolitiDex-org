#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-roster-utah-minor-party-2026.mjs — every Utah third-party, unaffiliated
// and independent 2026 nominee is already on the roster, so this pass added none
// ─────────────────────────────────────────────────────────────────────────────
// FILING is every filer the Utah Lt. Governor's 2026 candidate filings
// (https://vote.utah.gov/2026-candidate-filings/, last updated 10/05/2026, read
// 10/21/2026) list as "Election Candidate" for a U.S. House, State Senate or
// State House seat under a party other than Republican or Democratic: 37
// filers. Every one already has a roster row, under the slug of their own name,
// on the seat they filed for and with the party the form lists — the Davis,
// statewide and wave-3 batches, and Emily Buss, who is SD-11's sitting senator
// and so is that seat's incumbent rather than a second person on it. So the
// eligible remainder is ZERO and the roster did not grow.
//
// WHAT THIS SUITE PROVES:
//   1. Each filer maps to exactly one existing row, on their own seat, with the
//      party as filed; every candidate row is labelled a candidate.
//   2. No second row exists for any of them under another spelling.
//   3. Each candidate's person file opens on the office and district they are
//      running for, labelled "2026 Candidate" and "Active Candidate — on the
//      2026 ballot", and never as the seat's holder.
//   4. No candidate is seated on any lookup, board or /voice card.
//   5. Nothing grew: no Utah row followed the Republican and Democratic batch,
//      without later batches the roster is 1,332 rows, and that batch is intact.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { DECLARED_ADMISSIONS } from "./v103-chrome-seams.mjs";
import { planBoards, FEDERAL_READ_ONLY_SEATS } from "./gen-district-boards.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${String(n).slice(0, 80)}" missing`);
const section = (t) => console.log(`\n   ── ${t}`);
function report() {
  if (failures.length) {
    console.log(`\n   ${passed} passed, ${failures.length} failed\n`);
    for (const f of failures.slice(0, 60)) console.log(`   ✗ ${f}`);
    process.exit(1);
  }
  console.log(`\n   ✓ Utah minor-party nominees 2026: all ${passed} assertions passed — zero left to add`);
}
const must = (c, m) => { if (!c) { failures.push(`FIXTURE: ${m}`); report(); } else passed++; };

// [existing pid, name as filed, office as filed, party as filed]
const FILING = [
  ["jesse_west", "JESSE WEST", "U.S. House District 1", "Libertarian"],
  ["elias_montgomery", "ELIAS HENRY MONTGOMERY", "U.S. House District 1", "Unaffiliated"],
  ["carlton_bowen", "CARLTON E. BOWEN", "U.S. House District 2", "Independent American"],
  ["daniel_cottam", "DANIEL COTTAM", "U.S. House District 2", "Libertarian"],
  ["robert_moesinger", "ROBERT M. MOESINGER", "U.S. House District 2", "Unaffiliated"],
  ["cassie_easley", "CASSIE EASLEY", "U.S. House District 3", "Constitution"],
  ["adonis_hooslyn", "ADONIS HOOSLYN", "U.S. House District 3", "Unaffiliated"],
  ["michael_stoddard", "MICHAEL R. STODDARD", "U.S. House District 3", "Libertarian"],
  ["ayden_scott", "AYDEN SCOTT", "U.S. House District 3", "Unaffiliated"],
  ["taylor_wright", "TAYLOR WRIGHT", "U.S. House District 4", "Libertarian"],
  ["steven_burt", "STEVEN BURT", "U.S. House District 4", "Unaffiliated"],
  ["julie_quinlan", "JULIE QUINLAN", "State Senate District 1 (Multi-County)", "Forward"],
  ["emily_buss", "EMILY BUSS", "State Senate District 11 (Multi-County)", "Forward"],
  ["colin_smith", "COLIN SMITH", "State Senate District 13", "Forward"],
  ["annette_mcrae", "ANNETTE MCRAE", "State Senate District 20 (Multi-County)", "Forward"],
  ["wayne_woodfield", "WAYNE WOODFIELD", "State Senate District 21", "Forward"],
  ["josh_smith", "JOSH SMITH", "State Senate District 6", "Forward"],
  ["jeffrey_ostler", "JEFFREY OSTLER", "State Senate District 7 (Multi-County)", "Constitution"],
  ["j_lowry_snow", "J. LOWRY SNOW", "State Senate District 9", "Forward"],
  ["jason_odell", "JASON O’DELL", "State House District 1 (Multi-County)", "Constitution"],
  ["tony_de_mille", "TONY DE MILLE", "State House District 13", "Forward"],
  ["cabot_nelson", "CABOT W NELSON", "State House District 23 (Multi-County)", "Forward"],
  ["wales_nematollahi", "WALES NEMATOLLAHI", "State House District 28", "Forward"],
  ["tynley_bean", "TYNLEY BEAN", "State House District 29 (Multi-County)", "Forward"],
  ["jonathan_garrard", "JONATHAN GARRARD", "State House District 29 (Multi-County)", "Constitution"],
  ["patrick_belmont", "PATRICK BELMONT", "State House District 3", "Unaffiliated"],
  ["sergio_sotelo", "SERGIO SOTELO", "State House District 38", "Unaffiliated"],
  ["john_boyd", "JOHN BOYD", "State House District 53", "Forward"],
  ["james_rich", "JAMES RICH", "State House District 6 (Multi-County)", "Forward"],
  ["jennifer_doud", "JENNIFER K DOUD", "State House District 61", "Constitution"],
  ["julie_smith", "JULIE SMITH", "State House District 63", "Forward"],
  ["alan_wessman", "ALAN WESSMAN", "State House District 64", "Unaffiliated"],
  ["russ_hatch", "RUSS HATCH", "State House District 66 (Multi-County)", "Constitution"],
  ["sonya_ray", "SONYA RAY", "State House District 68 (Multi-County)", "Constitution"],
  ["zeno_parry", "ZENO B. PARRY", "State House District 70 (Multi-County)", "Forward"],
  ["april_pinkston", "APRIL A PINKSTON", "State House District 72", "Constitution"],
  ["libby_shelton", "LIBBY SHELTON", "State House District 8 (Multi-County)", "Forward"],];
// The sitting member among them: an incumbent, not a candidate row.
const SITTING = new Set(["emily_buss"]);

const roster = (src) => { const w = makeSandbox(); vm.runInContext(src, vm.createContext(w), { filename: "cmp-data.js" }); return w.CMP_DATA; };
let _join = null;
function JOIN() {
  if (_join) return _join;
  const w = makeSandbox();
  const ctx = vm.createContext(w);
  for (const f of ["cmp-data.js", "voter-hub-location.js", "seated-member.js"]) vm.runInContext(R(f), ctx, { filename: f });
  return (_join = w);
}
const SRC = R("cmp-data.js");
const RO = roster(SRC);
const words = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[’'`.]/g, "")
  .replace(/[^a-z ]/g, " ").split(/\s+/).filter((t) => t.length > 1);
const seatOf = (office) => {
  const m = /^(U\.S\. House|State Senate|State House) District (\d+)/.exec(office);
  return m ? { chamber: m[1], n: m[2] } : null;
};
const wantOffice = (s) => s.chamber === "U.S. House" ? `U.S. House Candidate (UT-${s.n})` : `Utah ${s.chamber} Candidate (District ${s.n})`;

// ═════════════════════════════════════════════════════════════════════════════
section("1 · every remaining filer already has one row, on their seat, with their party");
// ═════════════════════════════════════════════════════════════════════════════
eq(FILING.length, 37, "the filings list 37 non-major-party Election Candidates for these seats");
eq(new Set(FILING.map((f) => f[0])).size, FILING.length, "each filer maps to a distinct row");
for (const [pid, filed, office, party] of FILING) {
  const r = RO[pid];
  if (!ok(!!r, `${filed}: has a roster row (${pid})`)) continue;
  const fw = words(filed), rw = words(r.name);
  ok(fw[0] === rw[0] && fw[fw.length - 1] === rw[rw.length - 1], `${pid}: the row is ${filed} (got ${r.name})`);
  const s = seatOf(office);
  must(!!s, `${filed}: the filed office is a tracked seat`);
  ok(/^(?:Utah|UT\b)/.test(String(r.state || "")), `${pid}: a Utah record`);
  if (SITTING.has(pid)) {
    ok(!r.candidate && /State Senator/.test(r.office), `${pid}: held as the seat's sitting member`);
    eq(String(JOIN().pdxSeatedMemberFor(`ut-statesenate-${s.n}`, s.n)), pid, `${pid}: the seat table seats her on SD-${s.n}`);
    continue;
  }
  eq(r.office, wantOffice(s), `${pid}: the office and district they are running for`);
  eq(r.district, s.n, `${pid}: the district`);
  eq(r.party, party, `${pid}: the party exactly as filed`);
  eq(r.candidate, true, `${pid}: a candidate`);
  eq(r.candidacyStatus, "active", `${pid}: actively running`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · no second row under another spelling");
// ═════════════════════════════════════════════════════════════════════════════
{
  const keys = [...SRC.matchAll(/^\s*"([a-z0-9_]+)":\s*\{$/gm)].map((m) => m[1]);
  ok(keys.length === new Set(keys).size, "no pid is written twice in cmp-data.js");
  const ut = Object.keys(RO).filter((k) => /utah|^ut\b/i.test(String(RO[k].state || "")));
  for (const [pid, filed] of FILING) {
    const fw = words(filed);
    const twins = ut.filter((k) => k !== pid).filter((k) => {
      const u = words(RO[k].name);
      return u[0] === fw[0] && u[u.length - 1] === fw[fw.length - 1];
    });
    eq(twins.join(","), "", `${filed}: one row only`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · each candidate's person file opens on the seat they are running for");
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
// Investment language about the site itself. Not "stock": a candidate's card on the
// congressional stock-trading ban is a policy position, not an offer of shares.
const EQUITY = /\bequity\b|earn (?:a|your) share|\bshareholders?\b|\bdividends?\b|\bcrowdfund|\bform c\b/i;
for (const [pid] of FILING) {
  if (SITTING.has(pid)) continue;
  if (W.__byId["modal-content"]) W.__byId["modal-content"].innerHTML = "";
  try { W.openModal(pid); } catch (e) { /* homepage chrome the harness does not carry */ }
  const text = visible((W.__byId["modal-content"] || {}).innerHTML || "");
  ok(text.length > 1500, `${pid}: the person file painted`);
  has(text, W.CMP_DATA[pid].office, `${pid}: the file prints the office and district they are running for`);
  has(text, "2026 Candidate", `${pid}: labelled "2026 Candidate"`);
  has(text, "Active Candidate — on the 2026 ballot", `${pid}: labelled "Active Candidate — on the 2026 ballot"`);
  ok(!SEATED_WORDS.test(text), `${pid}: never described as holding the seat (${(text.match(SEATED_WORDS) || [""])[0]})`);
  ok(!EQUITY.test(text), `${pid}: no equity language`);
  eq(W.PDXProfilePid(pid), pid, `/p/${pid} opens ${pid}'s own file`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · no candidate is seated on any lookup, board or /voice card");
// ═════════════════════════════════════════════════════════════════════════════
const CANDS = new Set(FILING.map((f) => f[0]).filter((p) => !SITTING.has(p)));
for (let n = 1; n <= 4; n++) ok(!CANDS.has(JOIN()._pdxUsHouseSeat("Utah", n) || ""), `UT-${n}: the U.S. House join names no candidate`);
for (const [chamber, count] of [["statehouse", 75], ["statesenate", 29]]) {
  for (let n = 1; n <= count; n++) ok(!CANDS.has(JOIN().pdxSeatedMemberFor(`ut-${chamber}-${n}`, n) || ""), `ut-${chamber}-${n}: no candidate seated`);
}
{
  const { boards } = planBoards();
  // The contested Pennsylvania legislative boards (v469) are races, not candidates.
  // The whole-state passes' governor boards and read-only U.S. House boards
  // (sitting members; test-six-state-deepen.mjs, test-four-state-deepen.mjs) are
  // not candidate boards.
  eq(boards.filter((b) => !b.stateLeg && !b.outsideUtah && !FEDERAL_READ_ONLY_SEATS.has(b.seat)).length, 518, "the board plan is unchanged");
  ok(!boards.some((b) => CANDS.has(b.pid) || CANDS.has(b.joinPid)), "no board names a candidate as its member");
}
{
  const LOC = R("voter-hub-location.js");
  const swFrom = LOC.indexOf("var _pdxStatewideCache = {};");
  const resTo = LOC.indexOf("window._vhSyncDistrictStrip = function()", swFrom);
  must(swFrom !== -1 && resTo > swFrom, "voter-hub-location.js: the resolver slice is gone");
  const at = LOC.indexOf("window.PDXReturn = (function () {");
  const RET = LOC.slice(at, LOC.indexOf("\n  })();", at) + "\n  })();".length);
  const voice = (loc) => {
    const win = makeSandbox();
    let now = 1000000;
    win.Date = { now: () => now };
    const mk = (id) => ({ id, innerHTML: "", _a: {}, setAttribute(k, v) { this._a[k] = String(v); }, getAttribute(k) { return k in this._a ? this._a[k] : null; } });
    const els = { "pdx-voice-standing": mk("pdx-voice-standing"), "pdx-voice-seats": mk("pdx-voice-seats") };
    win.document.getElementById = (id) => els[id] || null;
    win.__PDX_VOICE_DOC = true;
    win.location = { href: "https://politidex.fyi/voice", pathname: "/voice", search: "", hash: "", origin: "https://politidex.fyi", assign() {}, replace() {} };
    win._hasUserLocation = true;
    win._currentVoterLocation = loc;
    win.PROFILES = JSON.parse(JSON.stringify(RO));
    const ctx = vm.createContext(win);
    for (const [src, f] of [[R("profile-alias.js"), "profile-alias.js"], [R("seated-member.js"), "seated-member.js"],
      [LOC.slice(swFrom, resTo), "resolver"], [RET, "PDXReturn"], [R("district-voice.js"), "district-voice.js"], [R("voice-room.js"), "voice-room.js"]]) {
      vm.runInContext(src, ctx, { filename: f });
    }
    now += 20000;
    win.PDXVoiceRoom.paint();
    return { html: els["pdx-voice-seats"].innerHTML, seats: win.PDXVoice.seatsForMe() };
  };
  // One reader per seat a minor-party nominee is running for.
  const seen = new Set();
  for (const [pid, , office] of FILING) {
    if (SITTING.has(pid)) continue;
    const s = seatOf(office);
    const loc = { state: "Utah", city: "", county: "", district: "", stateSenateDistrict: "", stateHouseDistrict: "" };
    if (s.chamber === "U.S. House") loc.district = s.n;
    else if (s.chamber === "State Senate") loc.stateSenateDistrict = s.n;
    else loc.stateHouseDistrict = s.n;
    const key = JSON.stringify(loc);
    if (seen.has(key)) continue;
    seen.add(key);
    const { html, seats } = voice(loc);
    for (const c of seats) ok(!CANDS.has(c.pid), `${office}: the ${c.key} card seats no candidate (${c.pid})`);
    for (const p of CANDS) ok(html.indexOf(`/p/${p}"`) < 0, `${office}: /voice links ${p} as no seat's member`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · nothing grew, and the Republican and Democratic batch is intact");
// ═════════════════════════════════════════════════════════════════════════════
{
  // No Utah row was added after the Republican and Democratic batch. A later
  // batch outside Utah is allowed; with every later block carved out, the roster
  // is the 1,332 rows this pass found.
  const i = DECLARED_ADMISSIONS.findIndex((d) => d.wave === "utah_major_party_nominees_oct2026");
  must(i >= 0, "the Republican and Democratic batch is no longer declared");
  const rd = DECLARED_ADMISSIONS[i];
  eq(rd.pids.length, 91, "…which still declares its 91 pids");
  const later = DECLARED_ADMISSIONS.slice(i + 1);
  const laterPids = new Set(later.flatMap((d) => d.pids));
  for (const p of laterPids) ok(!/^(?:Utah|UT\b)/.test(String((RO[p] || {}).state || "")), `${p}: a later batch added no Utah row`);
  eq(Object.keys(RO).filter((p) => !laterPids.has(p)).length, 1332, "without later batches the roster is 1,332 rows — this pass added none");
  for (const p of rd.pids) {
    const r = RO[p];
    ok(!!r && r.candidate === true && /^[RD]$/.test(r.party) && /^(Republican|Democratic)$/.test(r.partyFiled), `${p}: still a Republican or Democratic candidate row`);
  }
  const at = SRC.indexOf(rd.banner);
  const next = SRC.indexOf("\n// ── ", at + rd.banner.length);
  ok(at > 0 && (next < 0 || later.some((d) => SRC.indexOf(d.banner) === next + 1)), "only later declared batches follow the Republican and Democratic block");
}

report();
