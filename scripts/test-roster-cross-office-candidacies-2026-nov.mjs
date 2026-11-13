#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-roster-cross-office-candidacies-2026-nov.mjs — the election-day wave's
// sitting members who are running for a DIFFERENT office are in that race
// ─────────────────────────────────────────────────────────────────────────────
// The election-day wave (db/roster-candidates-2026-nov.json) read the official
// Alabama, Arizona, Kansas, New Hampshire, Ohio and Pennsylvania candidate
// lists and recorded every candidate the roster already had a row for under
// `held`. For the sitting members on those lists for a different office than
// the one they hold — Barry Moore and Chris Pappas for U.S. Senate, Tommy
// Tuberville, Andy Biggs and Ty Masterson for Governor, and others — the
// office they are seeking never reached window.CMP_CANDIDACIES, so their file
// and the race list said nothing about it. This pass adds each one, keyed by
// the existing roster id (db/roster-cross-office-candidacies-2026-nov.json is
// the record).
//
// WHAT THIS SUITE PROVES:
//   1. The table is the record, and the record is exactly the `held` entries
//      for a different office: office, district and party as on the ballot.
//   2. One person, one row, one /p/ address: no roster row added, no second
//      row for the same person, and the id is its own canonical address.
//   3. The person file shows both the office held and the office sought.
//   4. Each candidacy lands in its race as a candidate, never as the holder.
//   5. The previous wave's third-party candidates are unchanged.
//   6. The Utah, governor, read-only and composer boards are byte-identical to
//      the last commit; no migration; the shell moved one version.
//
//   node scripts/test-roster-cross-office-candidacies-2026-nov.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { DECLARED_CANDIDACIES, withoutWave5RosterRows } from "./v103-chrome-seams.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] });
const HEAD = (f) => { try { return git(["show", `HEAD:${f}`]); } catch { return null; } };

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);

const REC = JSON.parse(R("db/roster-cross-office-candidacies-2026-nov.json"));
const NOV = JSON.parse(R("db/roster-candidates-2026-nov.json"));
const SIX = ["al", "az", "ks", "nh", "oh", "pa"];
const NAME = { al: "Alabama", az: "Arizona", ks: "Kansas", nh: "New Hampshire", oh: "Ohio", pa: "Pennsylvania" };
// The fifth newly elected wave's declared roster block is pinned by its own
// suite (test-newly-elected-state-legislative-stated-2026-wave5.mjs).
const SRC = withoutWave5RosterRows(R("cmp-data.js"));
const BANNER = " // ── Election-day wave follow-up (November 3, 2026)";
const evalRoster = (src) => { const w = makeSandbox(); vm.runInContext(src, vm.createContext(w), { filename: "cmp-data.js" }); return w; };
const W = evalRoster(SRC);
const RO = W.CMP_DATA, CY = W.CMP_CANDIDACIES || {};
// The declared newly elected blocks are set aside on HEAD's side too, once a
// wave has landed there.
const headSrc = withoutWave5RosterRows(HEAD("cmp-data.js"));
const BEFORE = headSrc && headSrc.indexOf(BANNER) < 0;   // HEAD is the tree this change starts from
const W0 = headSrc ? evalRoster(headSrc) : null;

// The kind of office a roster row holds, and the kind a ballot line seeks.
const heldKind = (o) => /^U\.S\. Senator$/.test(o) ? "senate"
  : /^U\.S\. Representative$|^House .*Chair$|^Speaker of the House$|^House (?:Majority|Minority) (?:Leader|Whip)$/.test(o) ? "house"
  : /^Governor$/.test(o) ? "governor" : /^Lieutenant Governor$/.test(o) ? "ltgovernor"
  : /^(?:State )?Attorney General$/.test(o) ? "attorneygeneral" : /^Secretary of State$/.test(o) ? "secretaryofstate"
  : "other:" + o;
const seekKind = (o) => /^U\.S\. House Candidate/.test(o) ? "house" : ({
  "U.S. Senate Candidate": "senate", "Governor Candidate": "governor", "Lieutenant Governor Candidate": "ltgovernor",
  "Attorney General Candidate": "attorneygeneral", "Secretary of State Candidate": "secretaryofstate" })[o];

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the table is the record, and the record is the ballot");
// ═════════════════════════════════════════════════════════════════════════════
const mine = Object.keys(CY).filter((p) => REC.rows.some((r) => r.pid === p));
eq(mine.length, REC.rows.length, "every record row is in CMP_CANDIDACIES");
const block = SRC.slice(SRC.indexOf(BANNER));
ok(SRC.indexOf(BANNER) > SRC.lastIndexOf("\n});"), "the block sits inside the candidacy table, after the roster's close");
eq([...block.matchAll(/^ "([a-z0-9_]+)": \{ "office"/gm)].map((m) => m[1]).join(","), REC.rows.map((r) => r.pid).join(","), "the block holds exactly the record's rows, in order");
ok(REC.rows.every((r) => DECLARED_CANDIDACIES.pids.indexOf(r.pid) >= 0), "every row is on the declared candidacy list");
const expected = NOV.held.filter((h) => SIX.includes(h.state) && RO[h.pid] && !RO[h.pid].candidate && heldKind(RO[h.pid].office) !== seekKind(h.office));
eq(REC.rows.map((r) => r.pid).sort().join(","), expected.map((h) => h.pid).sort().join(","), "the record is every sitting `held` member seeking a different office, and nobody else");
for (const pid of ["barry_moore", "tommy_tuberville", "andy_biggs", "chris_pappas"]) ok(REC.rows.some((r) => r.pid === pid), `${pid}: in the record`);
for (const r of REC.rows) {
  const c = CY[r.pid], h = NOV.held.find((x) => x.pid === r.pid);
  if (!ok(!!c && !!h, `${r.pid}: a candidacy, from a held entry`)) continue;
  eq(c.office, h.office, `${r.pid}: the office sought, as the November record read it`);
  eq(r.office, h.office, `${r.pid}: the record's office`);
  eq(c.state, NAME[r.state], `${r.pid}: ${NAME[r.state]}`);
  eq(r.state, h.state, `${r.pid}: the state`);
  const dm = /\(([A-Z]{2})-(\d+|AL)\)$/.exec(h.office);
  eq(c.district == null ? null : String(c.district), dm ? (dm[2] === "AL" ? "1" : dm[2]) : null, `${r.pid}: the district on the ballot`);
  eq(r.district, dm ? dm[2] : null, `${r.pid}: the record's district`);
  eq(c.partyFiled, h.partyAsFiled, `${r.pid}: the party exactly as on the ballot`);
  eq(r.partyAsFiled, h.partyAsFiled, `${r.pid}: the record's party`);
  eq(r.nameAsFiled, h.nameAsFiled, `${r.pid}: the name as filed`);
  eq(c.candidacyStatus, "active", `${r.pid}: actively running`);
  eq(c.nextElection, "2026-11-03", `${r.pid}: on the November 3, 2026 ballot`);
  ok(NOV.states[r.state].sources.indexOf(r.source) >= 0, `${r.pid}: the source is one the November record read`);
  ok(heldKind(RO[r.pid].office) !== seekKind(c.office), `${r.pid}: a different office from the one held (${RO[r.pid].office})`);
  if (W0 && BEFORE) ok(!(W0.CMP_CANDIDACIES || {})[r.pid], `${r.pid}: had no candidacy before this pass`);
}
if (W0) for (const [pid, c] of Object.entries(W0.CMP_CANDIDACIES || {})) eq(JSON.stringify(CY[pid]), JSON.stringify(c), `${pid}: an existing candidacy is unchanged`);

// ═════════════════════════════════════════════════════════════════════════════
section("2 · one person, one row, one /p/ address");
// ═════════════════════════════════════════════════════════════════════════════
const keyLines = [...SRC.matchAll(/^\s*"([a-z0-9_]+)":\s*\{$/gm)].map((m) => m[1]);
eq(keyLines.length, new Set(keyLines).size, "no duplicate pid in cmp-data.js");
if (W0) {
  eq(Object.keys(RO).sort().join(","), Object.keys(W0.CMP_DATA).sort().join(","), "the roster holds exactly HEAD's ids");
  ok(Object.keys(RO).every((k) => JSON.stringify(RO[k]) === JSON.stringify(W0.CMP_DATA[k])), "every roster row is the same record as HEAD");
  eq(SRC.slice(0, SRC.lastIndexOf("\n});")), headSrc.slice(0, headSrc.lastIndexOf("\n});")), "the roster object is byte-identical to HEAD");
}
const norm = (n) => String(n || "").toLowerCase().replace(/\b[a-z]\.\s*/g, "").replace(/[^a-z ]/g, "").trim().split(/\s+/);
const SITEMAP = R("sitemap.xml");
const PAGE = ["cmp-data.js", "profile-evidence.js", "person-link.js"].map((f) => [f, R(f)]);
const LW = makeSandbox();
{ const ctx = vm.createContext(LW); for (const [f, s] of PAGE) { try { vm.runInContext(s, ctx, { filename: f }); } catch (e) {} } LW.PROFILES = LW.CMP_DATA; }
for (const r of REC.rows) {
  const row = RO[r.pid];
  if (!ok(!!row, `${r.pid}: an existing roster row`)) continue;
  ok(!row.candidate, `${r.pid}: a sitting record, not a candidate row`);
  eq(row.name, r.name, `${r.pid}: the record's own name`);
  eq(row.office, r.holds, `${r.pid}: the row still says the office held`);
  const [first, last] = [norm(row.name)[0], norm(row.name).slice(-1)[0]];
  const twins = Object.keys(RO).filter((p) => p !== r.pid && RO[p].state === row.state && norm(RO[p].name).slice(-1)[0] === last
    && norm(RO[p].name).some((t) => t === first || norm(r.nameAsFiled).includes(t)) && norm(RO[p].name).length > 0
    && (RO[p].office === CY[r.pid].office || RO[p].candidate));
  eq(twins.join(","), "", `${r.pid}: no second roster row for the same person in the race`);
  ok(!NOV.rows.some((x) => x.pid === r.pid || (x.state === r.state && x.office === r.office && norm(x.name).slice(-1)[0] === last)), `${r.pid}: the election-day wave added no row for them`);
  eq(LW.PDXPersonLink.pid(r.pid), r.pid, `${r.pid}: its own canonical id`);
  eq(LW.PDXPersonLink.href(r.pid), `/p/${r.pid}`, `${r.pid}: one address, /p/${r.pid}`);
  ok(Object.entries(LW.PDX_PROFILE_ALIAS || {}).every(([k, v]) => k !== r.pid), `${r.pid}: not a retired alias`);
  ok((SITEMAP.match(new RegExp(`/p/${r.pid}<`, "g")) || []).length <= 1, `${r.pid}: at most one sitemap entry`);
}

// ═════════════════════════════════════════════════════════════════════════════
// The real page: race lists, the seat field, the ballot desk, the person file.
// ═════════════════════════════════════════════════════════════════════════════
const FILES = [
  "cmp-data.js", "cmp-data-detail.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
  "stance-helpers.js", "alignment-tool.js", "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js", "profile-spine.js",
  "issue-colors.js", "my-stances.js", "roster-keys.js", "seat-field.js", "person-link.js", "profile-evidence.js",
  "voter-hub-location.js", "compare-hub.js", "ballot-breakdown.js", "who-represents-me.js", "race-sheet.js",
  "ballot-workspace.js", "profiles-full.js",
].map((f) => [f, R(f)]);
const PH = R("person.html");
const PDX_AT = PH.indexOf("// ── PDXStance — shared canonical stance language");
const PDX_BLOCK = PDX_AT < 0 ? "" : PH.slice(PH.lastIndexOf("<script>", PDX_AT) + 8, PH.indexOf("</script>", PDX_AT));
function boot(loc, without) {
  const win = makeSandbox();
  const store = {};
  win.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  win.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  win.auth = { currentUser: null };
  win._cmpSelected = [];
  const byId = {};
  const el = (id) => {
    const n = {
      id: id || "", innerHTML: "", textContent: "", style: { setProperty() {}, removeProperty() {} }, dataset: {}, children: [], attrs: {},
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; }, addEventListener() {}, removeEventListener() {},
      appendChild(c) { if (c && c.id) byId[c.id] = c; return c; }, removeChild() {}, insertAdjacentHTML() {},
      remove() {}, focus() {}, click() {}, scrollTo() {}, scrollIntoView() {}, querySelector() { return null; }, querySelectorAll() { return []; },
    };
    if (id) byId[id] = n;
    return n;
  };
  win.document.createElement = () => el("");
  win.document.getElementById = (id) => byId[id] || el(id);
  win.document.body = el("body");
  win.__byId = byId;
  win._pdxDisplayScore = () => "";
  win._likeCounts = {};
  if (typeof win.URLSearchParams !== "function") win.URLSearchParams = URLSearchParams;
  win.console = Object.assign({}, console, { log() {}, info() {}, warn() {} });
  ["who-represents-me", "wrm-reps", "vh-district-strip", "voter-hub", "ballot-workspace", "bw-body", "modal-overlay", "modal-content", "comment-overlay"].forEach(el);
  const ctx = vm.createContext(win);
  for (const [f, src] of FILES) {
    const s = (without && f === "cmp-data.js") ? src.slice(0, src.indexOf(BANNER)).replace(/,\s*$/, "\n};") : src;
    try { vm.runInContext(s, ctx, { filename: f }); } catch (e) { /* page chrome the harness does not carry */ }
  }
  try { vm.runInContext(PDX_BLOCK, ctx, { filename: "person.html#PDXStance" }); } catch (e) {}
  win.PROFILES = win.CMP_DATA;
  win._hasUserLocation = true;
  win._currentVoterLocation = Object.assign({ mapSelected: true, src: "set" }, loc);
  return win;
}
const visible = (h) => String(h).replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&middot;|·/g, "·").replace(/\s+/g, " ");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the person file shows the office held and the office sought");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = boot({ state: "Utah", district: "2" });
  ok(typeof w.openModal === "function" && typeof w._pdxCandidacyLine === "function", "the person file booted with the candidacy line");
  for (const r of REC.rows) {
    w.__byId["modal-content"].innerHTML = "";
    try { w.openModal(r.pid); } catch (e) {}
    const html = String(w.__byId["modal-content"].innerHTML || "");
    const race = r.office.replace(/ Candidate(?= \(|$)/, "");
    const m = /<div class="profile-running"[^>]*>([\s\S]*?)<\/div>/.exec(html);
    const line = m ? visible(m[1]).trim() : "";
    ok(line.indexOf(`Running for ${race}`) >= 0, `${r.pid}: the file says "Running for ${race}" (${line})`);
    ok(line.indexOf(NAME[r.state]) >= 0, `${r.pid}: the line names ${NAME[r.state]}`);
    ok(html.indexOf(`<div class="profile-eyebrow">${RO[r.pid].office}</div>`) >= 0, `${r.pid}: the file still opens on the office held (${RO[r.pid].office})`);
    ok(REC.rows.filter((x) => x.pid !== r.pid).every((x) => html.indexOf(`data-pdx-candidacy="${x.pid}"`) < 0), `${r.pid}: no other person's candidacy on the file`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · each candidacy lands in its race as a candidate, never the holder");
// ═════════════════════════════════════════════════════════════════════════════
const KEYED = { senate: 1, house: 1, governor: 1 };
const role = (html, pid) => { const m = new RegExp('data-bw-roster="' + pid + '"[\\s\\S]*?data-bw-role="([^"]*)"').exec(html); return m ? m[1] : null; };
for (const r of REC.rows) {
  const c = CY[r.pid], rk = seekKind(c.office), label = `${r.pid} (${r.state.toUpperCase()} ${c.office})`;
  const loc = { state: c.state, city: "", county: "", district: c.district || "1" };
  const w = boot(loc), w0 = boot(loc, true);
  const field = w._ballotCandidates(rk) || [];
  const row = field.find((x) => x.pid === r.pid);
  if (!ok(!!row, `${label}: in the race list`)) continue;
  eq(row.status, "candidate", `${label}: listed as a candidate`);
  eq(row.office, c.office, `${label}: the row names the office sought`);
  ok(!row.incumbent, `${label}: not the holder of the seat`);
  eq((field.filter((x) => x.pid === r.pid)).length, 1, `${label}: listed once`);
  ok((w0._ballotCandidates(rk) || []).every((x) => field.some((y) => y.pid === x.pid)), `${label}: nobody already in the race left it`);
  if (!KEYED[rk]) continue;
  const sf = w.pdxSeatField(rk), sf0 = w0.pdxSeatField(rk);
  ok(sf.holders.indexOf(r.pid) === -1, `${label}: never in the seat's holders`);
  ok(sf.candidacies.indexOf(r.pid) !== -1, `${label}: on the field by candidacy`);
  eq(JSON.stringify(sf.holders), JSON.stringify(sf0.holders), `${label}: the seat's holders are what they were`);
  w.pdxBallotWorkspaceOpen(rk);
  eq(role(String(w.document.getElementById("bw-body").innerHTML), r.pid), "candidate", `${label}: the desk lists them as a candidate`);
}
{
  const al = boot({ state: "Alabama", city: "", county: "", district: "1" });
  ok(al._ballotCandidates("senate").some((x) => x.pid === "barry_moore" && x.status === "candidate"), "Alabama's Senate field lists Barry Moore as a candidate");
  ok(al.pdxSeatField("senate").holders.indexOf("tommy_tuberville") !== -1, "Tuberville still holds his U.S. Senate seat there");
  ok(al._ballotCandidates("governor").some((x) => x.pid === "tommy_tuberville" && x.status === "candidate"), "Alabama's Governor field lists Tuberville as a candidate");
  const nh = boot({ state: "New Hampshire", city: "", county: "", district: "1" });
  ok(nh.pdxSeatField("house").holders.indexOf("chris_pappas") !== -1, "Pappas still holds NH-1");
  ok(nh._ballotCandidates("senate").some((x) => x.pid === "chris_pappas" && x.status === "candidate"), "New Hampshire's Senate field lists Pappas as a candidate");
  const ut = boot({ state: "Utah", city: "Layton", county: "Davis County", district: "2", stateSenateDistrict: "7", stateHouseDistrict: "17" });
  for (const rk of ["senate", "governor", "house", "attorneygeneral", "secretaryofstate", "ltgovernor"])
    ok(ut._ballotCandidates(rk).every((x) => !REC.rows.some((r) => r.pid === x.pid)), `Utah ${rk}: no candidacy from this pass`);
  const pa = boot({ state: "Pennsylvania", city: "", county: "", district: "4" });
  ok(pa.pdxSeatField("house").pids.indexOf("rabb_pa") === -1, "PA-4: Rabb's PA-3 candidacy does not reach it");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the previous wave's third-party candidates are unchanged");
// ═════════════════════════════════════════════════════════════════════════════
{
  const MAJOR = /^(?:REP|DEM|Republican|Democratic|REPUBLICAN|DEMOCRATIC)$/;
  const third = NOV.rows.concat(NOV.held.filter((h) => RO[h.pid] && RO[h.pid].candidate)).filter((r) => !MAJOR.test(r.partyAsFiled));
  ok(third.length >= 10, `the November record has third-party candidates (${third.length})`);
  for (const t of third) {
    ok(!CY[t.pid], `${t.pid}: no candidacy added`);
    if (W0) eq(JSON.stringify(RO[t.pid]), JSON.stringify(W0.CMP_DATA[t.pid]), `${t.pid}: the row is HEAD's`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · boards byte-identical; no migration; the shell moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  const boards = readdirSync(ROOT).filter((f) => /^district-.*\.html$/.test(f));
  const utah = boards.filter((f) => /^district-ut-/.test(f)), gov = boards.filter((f) => /^district-[a-z]{2}-gov\.html$/.test(f));
  ok(utah.length >= 88 && gov.length >= 24, `the Utah (${utah.length}) and governor (${gov.length}) boards are here`);
  const LAST = (f) => { const h = git(["log", "-1", "--format=%H", "--", f]).trim(); return h ? git(["show", `${h}:${f}`]) : null; };
  const SHARED = ["district-composer.js", "district-poll.js", "district-board.js", "district-voice.js",
    "netlify/lib/district-board-voice-core.mjs", "scripts/district-board.template.html"];
  for (const f of SHARED) eq(R(f), LAST(f), `${f}: byte-identical to its last commit`);
  for (const f of utah.concat(gov)) eq(R(f), LAST(f), `${f}: byte-identical to its last commit`);
  eq(git(["diff", "--name-only", "HEAD", "--", ...boards]).trim(), "", "no board document differs from HEAD");
  // Executive seed wave 14 is the later Trump–Massie pass's, gated by test-exec-seed.mjs.
  eq(git(["status", "--porcelain", "--", "netlify/database/migrations"]).split("\n").filter((l) => l.trim() && l !== "?? netlify/database/migrations/20261205000000_seed_exec_actions_wave14.sql").join("\n"), "", "no migration added or changed");
  const v = (s) => +((String(s).match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1] || 0);
  const headSw = HEAD("sw.js");
  if (headSw && BEFORE) eq(v(R("sw.js")), v(headSw) + 1, "cmp-data.js is precached and changed, so the shell moved one version");
  ok(/^  '\/cmp-data\.js',$/m.test(R("sw.js")), "cmp-data.js is on the precache");
  if (headSw) eq((R("sw.js").match(/^  '\/[^']*',$/gm) || []).sort().join("\n"), (headSw.match(/^  '\/[^']*',$/gm) || []).sort().join("\n"), "the precache list is unchanged");
}

if (failures.length) {
  console.log(`\n   ${passed} passed, ${failures.length} failed\n`);
  for (const f of failures.slice(0, 60)) console.log(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`\n   ✓ cross-office candidacies, election-day wave: all ${passed} assertions passed`);
