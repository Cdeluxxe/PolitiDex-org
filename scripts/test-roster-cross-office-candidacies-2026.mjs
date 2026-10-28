#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-roster-cross-office-candidacies-2026.mjs — a sitting officeholder who is
// the nominee for a different office is in that race, as a candidate
// ─────────────────────────────────────────────────────────────────────────────
// Ken Paxton is Texas's Attorney General and its Republican nominee for U.S.
// Senate; Byron Donalds is a U.S. Representative and Florida's Republican
// nominee for Governor. Each row on the roster says the office they hold, so
// neither appeared in the race they are running in. cmp-data.js's
// window.CMP_CANDIDACIES now holds that office for every such person the
// official 2026 state lists name (db/roster-cross-office-candidacies-2026-oct.json
// is the record), keyed by the person's own roster id.
//
// WHAT THIS SUITE PROVES:
//   1. The table is the record: every candidacy the record names, and no other,
//      with the office, district and party as filed.
//   2. No new person: each key is an existing roster row, none is a candidate
//      row, the roster has the same ids, and every row is byte-identical to HEAD.
//   3. Paxton is in the Texas U.S. Senate field and Donalds in the Florida
//      Governor field, as candidates, and neither is the seat's holder.
//   4. Every other candidacy lands in its race the same way: in the field, a
//      candidate, never a holder, never "incumbent" on the ballot desk.
//   5. The seats' holders are unchanged, and no candidacy reaches a race in
//      another state or another district.
//   6. No equity language; the shell moved one version.
//
//   node scripts/test-roster-cross-office-candidacies-2026.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { carveDeclaredAdmissions } from "./v103-chrome-seams.mjs";

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
const section = (t) => console.log(`\n   ── ${t}`);

const REC = JSON.parse(R("db/roster-cross-office-candidacies-2026-oct.json"));
const BATCH = JSON.parse(R("db/roster-candidates-2026-oct.json"));
const SRC = R("cmp-data.js");
const evalRoster = (src) => { const w = makeSandbox(); vm.runInContext(src, vm.createContext(w), { filename: "cmp-data.js" }); return w; };
const W0 = evalRoster(SRC);
// The six-state pass (Nebraska, South Dakota, Idaho, Montana, Alaska, Rhode
// Island) added the sitting legislators running for a DIFFERENT legislative
// seat to the same table, from its own record; test-six-state-deepen.mjs holds
// those. This suite holds everything else in the table to this record.
// The four-state pass (Maine, Colorado, Minnesota, Nevada) did the same from its
// record, and moved four candidacies here whose holders it seated;
// test-four-state-deepen.mjs holds those.
const LEG_CROSS = new Set(JSON.parse(R("db/roster-candidates-legislative-ne-sd-id-mt-ak-ri-2026-oct.json")).crossSeat.map((r) => r.pid)
  .concat(JSON.parse(R("db/roster-candidates-legislative-me-co-mn-nv-2026-oct.json")).crossSeat.map((r) => r.pid))
  .concat(JSON.parse(R("db/roster-state-legislators-me-co-mn-nv-2026-oct.json")).seatedFromCandidacy.map((r) => r.pid))
  // …and the Mississippi, Vermont, Michigan and Tennessee pass's (test-ms-vt-mi-tn-deepen.mjs).
  .concat(JSON.parse(R("db/roster-candidates-legislative-mi-tn-vt-2026-oct.json")).crossSeat.map((r) => r.pid))
  .concat(JSON.parse(R("db/roster-state-legislators-ms-vt-mi-tn-2026-oct.json")).seatedFromCandidacy.map((r) => r.pid)));
const RO = W0.CMP_DATA;
const CY = Object.fromEntries(Object.entries(W0.CMP_CANDIDACIES || {}).filter(([k]) => !LEG_CROSS.has(k)));
const NAME = Object.fromEntries(Object.entries(BATCH.states).map(([k, s]) => [k, s.state]));

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the table is the record");
// ═════════════════════════════════════════════════════════════════════════════
eq(Object.keys(CY).sort().join(","), REC.rows.map((r) => r.pid).sort().join(","), "CMP_CANDIDACIES holds exactly the record's candidacies");
eq(Object.keys(REC.states).sort().join(","), Object.keys(BATCH.states).sort().join(","), "the record has an outcome for every state the October batch did");
for (const [code, s] of Object.entries(REC.states)) {
  eq(s.candidacies, REC.rows.filter((r) => r.state === code).length, `${code}: the recorded count is the rows`);
  eq(s.checked, !!BATCH.states[code].checked, `${code}: checked exactly where the October batch read an official list`);
  if (s.checked) eq(JSON.stringify(s.sources), JSON.stringify(BATCH.states[code].sources), `${code}: the same official sources as the October batch`);
}
for (const r of REC.rows) {
  const c = CY[r.pid];
  if (!ok(!!c, `${r.pid}: has a candidacy`)) continue;
  eq(c.office, r.office, `${r.pid}: the office sought`);
  ok(/ Candidate(?: \([A-Z]{2}-(?:AL|\d+)\))?$/.test(c.office), `${r.pid}: the office string says candidate`);
  eq(c.state, NAME[r.state], `${r.pid}: ${NAME[r.state]}`);
  eq(c.district == null ? null : String(c.district), r.district, `${r.pid}: the district`);
  eq(c.partyFiled, r.partyAsFiled, `${r.pid}: the party exactly as filed`);
  eq(c.candidacyStatus, "active", `${r.pid}: actively running`);
  eq(c.nextElection, "2026-11-03", `${r.pid}: on the November 3, 2026 ballot`);
  ok(BATCH.states[r.state].sources.indexOf(r.source) !== -1, `${r.pid}: the source is one the October batch read`);
}
for (const x of REC.excluded) ok(!CY[x.pid] && typeof x.why === "string" && x.why.length > 10, `${x.pid}: excluded, with a reason`);
ok(!!CY.ken_paxton && CY.ken_paxton.office === "U.S. Senate Candidate", "Ken Paxton: U.S. Senate candidate");
ok(!!CY.donalds && CY.donalds.office === "Governor Candidate", "Byron Donalds: Governor candidate");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · no new person, and every sitting record is unchanged");
// ═════════════════════════════════════════════════════════════════════════════
for (const pid of Object.keys(CY)) {
  ok(!!RO[pid], `${pid}: an existing roster row`);
  ok(RO[pid] && !RO[pid].candidate, `${pid}: a sitting record, not a candidate row`);
  eq(RO[pid] && RO[pid].name, (REC.rows.find((r) => r.pid === pid) || {}).name, `${pid}: the record's own name`);
  ok(RO[pid] && RO[pid].office !== CY[pid].office, `${pid}: the row still says the office held (${RO[pid] && RO[pid].office})`);
}
const keyLines = [...SRC.matchAll(/^\s*"([a-z0-9_]+)":\s*\{$/gm)].map((m) => m[1]);
eq(keyLines.length, new Set(keyLines).size, "no duplicate pid in cmp-data.js");
const headSrc = HEAD("cmp-data.js");
if (headSrc && headSrc.indexOf("window.CMP_CANDIDACIES") < 0) {
  const RH = evalRoster(headSrc).CMP_DATA;
  eq(Object.keys(RO).sort().join(","), Object.keys(RH).sort().join(","), "the roster holds exactly HEAD's ids");
  ok(Object.keys(RH).every((k) => JSON.stringify(RH[k]) === JSON.stringify(RO[k])), "every roster row is the same record as HEAD");
  eq(SRC.slice(0, SRC.lastIndexOf("\n});")), headSrc.slice(0, headSrc.lastIndexOf("\n});")), "the roster object is byte-identical to HEAD");
  eq(carveDeclaredAdmissions(SRC), carveDeclaredAdmissions(headSrc), "with the declared table set aside, cmp-data.js is HEAD");
} else {
  // Once this change is HEAD there is nothing to diff against; the carve still has to work.
  ok(carveDeclaredAdmissions(SRC).indexOf("CMP_CANDIDACIES") < 0, "the declared table carves out of cmp-data.js");
}
eq(SRC.lastIndexOf("\n});") < SRC.indexOf("window.CMP_CANDIDACIES"), true, "the table sits after the roster's close");

// ═════════════════════════════════════════════════════════════════════════════
// The page the race list is read on: the real resolver, the real field, the
// real desk, at a location in the race's state (and district).
// ═════════════════════════════════════════════════════════════════════════════
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
  "stance-helpers.js", "alignment-tool.js", "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js", "profile-spine.js",
  "issue-colors.js", "my-stances.js", "roster-keys.js", "seat-field.js", "person-link.js", "voter-hub-location.js",
  "compare-hub.js", "ballot-breakdown.js", "who-represents-me.js", "race-sheet.js", "ballot-workspace.js",
];
const PAGE = FILES.map((f) => [f, R(f)]);
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
      id: id || "", innerHTML: "", textContent: "", style: {}, dataset: {}, children: [], attrs: {},
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; }, addEventListener() {}, removeEventListener() {},
      appendChild(c) { if (c && c.id) byId[c.id] = c; return c; }, removeChild() {}, insertAdjacentHTML() {},
      remove() {}, focus() {}, click() {}, scrollIntoView() {}, querySelector() { return null; }, querySelectorAll() { return []; },
    };
    if (id) byId[id] = n;
    return n;
  };
  win.document.createElement = () => el("");
  win.document.getElementById = (id) => byId[id] || null;
  win.document.body = el("body");
  ["who-represents-me", "wrm-reps", "vh-district-strip", "voter-hub", "ballot-workspace", "bw-body", "modal-overlay", "comment-overlay"].forEach(el);
  const ctx = vm.createContext(win);
  for (const [f, src] of PAGE) {
    // `without` boots the page as HEAD had it: the roster with no table.
    const s = (without && f === "cmp-data.js") ? src.slice(0, src.indexOf("/* Sitting officeholders who are 2026 nominees")) : src;
    try { vm.runInContext(s, ctx, { filename: f }); } catch (e) { /* page chrome the harness does not carry */ }
  }
  win.PROFILES = win.CMP_DATA;
  win._hasUserLocation = true;
  win._currentVoterLocation = Object.assign({ mapSelected: true, src: "set" }, loc);
  return win;
}
const SEAT = { "U.S. Senate Candidate": "senate", "Governor Candidate": "governor", "Lieutenant Governor Candidate": "ltgovernor",
  "Attorney General Candidate": "attorneygeneral", "Secretary of State Candidate": "secretaryofstate" };
const seatOf = (office) => /^U\.S\. House Candidate/.test(office) ? "house" : SEAT[office];
const KEYED = { senate: 1, house: 1, governor: 1 };
const role = (html, pid) => { const m = new RegExp('data-bw-roster="' + pid + '"[\\s\\S]*?data-bw-role="([^"]*)"').exec(html); return m ? m[1] : null; };
const tags = (html, pid) => {
  for (const m of html.matchAll(/<li class="bw-cand[^"]*">([\s\S]*?)<\/li>/g)) {
    if (m[1].indexOf(`pdxBallotWorkspacePick('`) >= 0 && new RegExp(`,'${pid}'\\)`).test(m[1])) return [...m[1].matchAll(/<span class="bw-tag[^"]*">([^<]*)<\/span>/g)].map((x) => x[1]);
  }
  return null;
};
const locFor = (c) => ({ state: c.state, city: "", county: "", district: c.district || "1" });

function checkRace(pid, label) {
  const c = CY[pid], rk = seatOf(c.office);
  const w = boot(locFor(c)), w0 = boot(locFor(c), true);
  const field = w._ballotCandidates(rk) || [];
  const row = field.find((x) => x.pid === pid);
  if (!ok(!!row, `${label}: in the ${c.state} ${c.office.replace(/ Candidate.*$/, "")} race list`)) return;
  eq(row.status, "candidate", `${label}: listed as a candidate`);
  eq(row.office, c.office, `${label}: the row names the office sought`);
  ok(!row.incumbent, `${label}: not the holder of the seat`);
  if (!KEYED[rk]) return;
  const sf = w.pdxSeatField(rk), sf0 = w0.pdxSeatField(rk);
  ok(sf.answerable, `${label}: the seat is answerable at a ${c.state} location`);
  ok(sf.holders.indexOf(pid) === -1, `${label}: never in the seat's holders`);
  ok(sf.candidacies.indexOf(pid) !== -1, `${label}: on the field by candidacy`);
  eq(JSON.stringify(sf.holders), JSON.stringify(sf0.holders), `${label}: the seat's holders are what they were`);
  ok(sf0.pids.every((p) => sf.pids.indexOf(p) !== -1), `${label}: nobody already on the field left it`);
  eq(JSON.stringify(w.pdxSeatHolders(rk).pids), JSON.stringify(w0.pdxSeatHolders(rk).pids), `${label}: pdxSeatHolders is unchanged`);
  w.pdxBallotWorkspaceOpen(rk);
  const desk = String(w.document.getElementById("bw-body").innerHTML);
  eq(role(desk, pid), "candidate", `${label}: the desk lists them as a candidate`);
  const t = tags(desk, pid) || [];
  ok(t.indexOf("Holds this seat") < 0 && t.indexOf("In office") < 0, `${label}: the desk row never says they hold the seat (${t.join(", ")})`);
  ok(t.indexOf("Running") >= 0, `${label}: the desk row says Running`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · Paxton in the Texas U.S. Senate race, Donalds in the Florida Governor race");
// ═════════════════════════════════════════════════════════════════════════════
checkRace("ken_paxton", "Paxton (TX U.S. Senate)");
checkRace("donalds", "Donalds (FL Governor)");
{
  const tx = boot({ state: "Texas", city: "Fort Worth", county: "Tarrant County", district: "12" });
  const f = tx._ballotCandidates("senate").map((x) => x.pid);
  ok(["cruz", "john_cornyn", "james_talarico", "ted_brown", "ken_paxton"].every((p) => f.indexOf(p) !== -1), `Fort Worth's Senate field: Cruz, Cornyn, Talarico, Brown and Paxton (${f.join(", ")})`);
  eq(JSON.stringify(tx.pdxSeatField("senate").holders.slice().sort()), JSON.stringify(["cruz", "john_cornyn"]), "Fort Worth's Senate holders are still Cruz and Cornyn");
  const fl = boot({ state: "Florida", city: "Naples", county: "Collier County", district: "19" });
  eq(JSON.stringify(fl.pdxSeatField("governor").holders), JSON.stringify(["ron_desantis"]), "Naples' Governor holder is still DeSantis");
  eq(fl.pdxSeatField("house").pids.indexOf("donalds"), -1, "Donalds is not placed in a U.S. House field by his candidacy");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · every other candidacy lands in its race the same way");
// ═════════════════════════════════════════════════════════════════════════════
for (const r of REC.rows) if (r.pid !== "ken_paxton" && r.pid !== "donalds") checkRace(r.pid, `${r.pid} (${r.state.toUpperCase()} ${r.office})`);

// ═════════════════════════════════════════════════════════════════════════════
section("5 · no candidacy reaches another state's race or another district");
// ═════════════════════════════════════════════════════════════════════════════
{
  const ut = boot({ state: "Utah", city: "Layton", county: "Davis County", district: "2", stateSenateDistrict: "7", stateHouseDistrict: "17" });
  for (const rk of ["senate", "governor", "house", "attorneygeneral", "secretaryofstate", "ltgovernor"]) {
    const f = ut._ballotCandidates(rk).map((x) => x.pid);
    ok(Object.keys(CY).every((p) => f.indexOf(p) === -1), `Utah ${rk}: no other state's candidacy`);
  }
  const ca2 = boot({ state: "California", city: "", county: "", district: "2" });
  ok(ca2.pdxSeatField("house").pids.indexOf("mike_mcguire") === -1, "CA-2: McGuire's CA-1 candidacy does not reach it");
  ok(ca2.pdxSeatField("house").pids.indexOf("wiener_ca") === -1, "CA-2: Wiener's CA-11 candidacy does not reach it");
  const tx = boot({ state: "Texas", city: "", county: "", district: "12" });
  ok(tx._ballotCandidates("attorneygeneral").some((x) => x.pid === "ken_paxton" && x.status !== "candidate"), "Texas Attorney General: Paxton is still listed for the office he holds, as its officeholder");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · no equity language; the shell moved");
// ═════════════════════════════════════════════════════════════════════════════
const EQUITY = /\bequity\b|earn (?:a|your) share|\bshareholders?\b|\bdividends?\b|\bcrowdfund|\bform c\b/i;
ok(!EQUITY.test(SRC.slice(SRC.indexOf("/* Sitting officeholders who are 2026 nominees"))), "the table carries no equity language");
ok(!EQUITY.test(JSON.stringify(REC)), "the record carries no equity language");
const v = (s) => +((String(s).match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1] || 0);
const headSw = HEAD("sw.js");
if (headSw && headSrc && headSrc.indexOf("window.CMP_CANDIDACIES") < 0) eq(v(R("sw.js")), v(headSw) + 1, "cmp-data.js is precached and changed, so the shell moved one version");
ok(/cmp-data\.js/.test(R("sw.js")), "cmp-data.js is on the precache");

if (failures.length) {
  console.log(`\n   ${passed} passed, ${failures.length} failed\n`);
  for (const f of failures.slice(0, 60)) console.log(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`\n   ✓ cross-office candidacies 2026: all ${passed} assertions passed`);
