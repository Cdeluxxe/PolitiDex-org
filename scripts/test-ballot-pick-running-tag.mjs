#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-ballot-pick-running-tag.mjs — every candidate row on the desk says Running
// ─────────────────────────────────────────────────────────────────────────────
// The ballot desk's pick list tagged a row "Running" only from the cross-office
// candidacy flag. Field rows carry no status of their own, so a plain candidate
// — one the roster just above the list calls a candidate — showed no tag at all
// beside a sitting member's "Holds this seat".
//
// What it pins, on the real roster, resolver, field and desk:
//
//   1. A candidate in the pick list shows "Running".
//   2. A sitting member still shows "Holds this seat", and only that.
//   3. A row that is neither gets no tag.
//   4. Every row agrees with the race roster above it: "incumbent" there is
//      "Holds this seat" here, "candidate" there is "Running" here, and a row
//      the roster does not list is untagged.
//   5. The race roster itself is byte-identical to HEAD's.
//   6. Cross-office candidacies (Paxton, Donalds) say "Running" in the race
//      they are entering.
//   7. Who appears in the pick list is unchanged from HEAD.
//
//   node scripts/test-ballot-pick-running-tag.mjs

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); return !!cond; };
const eq = (a, b, msg) => ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);

const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
  "stance-helpers.js", "alignment-tool.js", "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js", "profile-spine.js",
  "issue-colors.js", "my-stances.js", "roster-keys.js", "seat-field.js", "person-link.js", "voter-hub-location.js",
  "compare-hub.js", "ballot-breakdown.js", "who-represents-me.js", "race-sheet.js", "ballot-workspace.js",
];
const PAGE = FILES.map((f) => [f, R(f)]);

// HEAD's desk, for the "unchanged" assertions. Absent outside a git checkout, or
// once this change is HEAD — then those assertions compare the file to itself.
let HEAD_WORK = null;
try {
  HEAD_WORK = execFileSync("git", ["show", "HEAD:ballot-workspace.js"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
} catch (e) { HEAD_WORK = null; }

function boot(loc, workSrc) {
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
    const s = (workSrc && f === "ballot-workspace.js") ? workSrc : src;
    try { vm.runInContext(s, ctx, { filename: f }); } catch (e) { /* page chrome the harness does not carry */ }
  }
  win.PROFILES = win.CMP_DATA;
  win._hasUserLocation = true;
  win._currentVoterLocation = Object.assign({ mapSelected: true, src: "set" }, loc);
  return win;
}

const deskOf = (w, rk) => { w.pdxBallotWorkspaceOpen(rk); return String(w.document.getElementById("bw-body").innerHTML); };
// pid → [tag words] for every row in the pick list.
const pickRows = (html) => {
  const out = {};
  for (const m of html.matchAll(/<li class="bw-cand[^"]*">([\s\S]*?)<\/li>/g)) {
    const p = /pdxBallotWorkspacePick\('[^']*','([^']*)'\)/.exec(m[1]);
    if (!p) continue;
    out[p[1]] = [...m[1].matchAll(/<span class="bw-tag[^"]*">([^<]*)<\/span>/g)].map((x) => x[1]).filter((t) => t.indexOf("Your pick") < 0);
  }
  return out;
};
// pid → roster role ("incumbent" | "candidate") from the race roster above the list.
const rosterRoles = (html) => {
  const out = {};
  const box = /<div class="bw-roster" [\s\S]*?<\/ul>/.exec(html);
  if (!box) return out;
  for (const m of box[0].matchAll(/data-bw-roster="([^"]*)"[\s\S]*?data-bw-role="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
};
const rosterBox = (html) => { const m = /<div class="bw-roster" [\s\S]*?<\/div>/.exec(html); return m ? m[0] : ""; };

// Locations and seats with a mix of holders, candidates and reference rows.
const PLACES = [
  { loc: { state: "Utah", city: "Provo", county: "Utah County", district: "3" }, seats: ["senate", "house", "governor", "statesenate", "statehouse"] },
  { loc: { state: "Texas", city: "Fort Worth", county: "Tarrant County", district: "12" }, seats: ["senate", "house", "governor", "attorneygeneral"] },
  { loc: { state: "Florida", city: "Naples", county: "Collier County", district: "19" }, seats: ["senate", "house", "governor"] },
  { loc: { state: "Georgia", city: "", county: "", district: "1" }, seats: ["senate", "governor"] },
  { loc: { state: "Michigan", city: "", county: "", district: "1" }, seats: ["senate", "governor", "secretaryofstate"] },
];

// ═════════════════════════════════════════════════════════════════════════════
section("1–4 · every pick-list row agrees with the roster above it");
// ═════════════════════════════════════════════════════════════════════════════
let nRunning = 0, nHolds = 0, nNone = 0, nDesks = 0;
for (const { loc, seats } of PLACES) {
  const w = boot(loc), w0 = HEAD_WORK ? boot(loc, HEAD_WORK) : null;
  for (const rk of seats) {
    const html = deskOf(w, rk);
    const rows = pickRows(html);
    const pids = Object.keys(rows);
    if (!pids.length) continue;
    nDesks++;
    const roles = rosterRoles(html);
    const where = `${loc.state} ${rk}`;
    for (const pid of pids) {
      const t = rows[pid];
      const want = roles[pid] === "incumbent" ? ["Holds this seat"] : roles[pid] === "candidate" ? ["Running"] : [];
      // A holder the resolver names is "incumbent" on both; the roster's fallback
      // can name an officeholder the resolver did not, and that row stays as HEAD had it.
      if (roles[pid] === "incumbent" && t.length === 0) continue;
      eq(JSON.stringify(t), JSON.stringify(want), `${where}: ${pid} tags match the roster role "${roles[pid] || "none"}"`);
      if (t[0] === "Running") nRunning++; else if (t[0] === "Holds this seat") nHolds++; else nNone++;
      ok(t.indexOf("In office") < 0 && t.join("").indexOf("Former") < 0, `${where}: ${pid} carries no invented status tag`);
    }
    if (w0) {
      const html0 = deskOf(w0, rk);
      eq(JSON.stringify(Object.keys(pickRows(html0)).sort()), JSON.stringify(pids.slice().sort()), `${where}: the pick list lists the same people as HEAD`);
      eq(rosterBox(html), rosterBox(html0), `${where}: the race roster is byte-identical to HEAD`);
      const h0 = pickRows(html0);
      pids.forEach((p) => { if (h0[p] && h0[p][0] === "Holds this seat") eq(rows[p][0], "Holds this seat", `${where}: ${p} still holds this seat`); });
    }
  }
}
console.log(`   desks ${nDesks} · running ${nRunning} · holds ${nHolds} · none ${nNone}`);
ok(nDesks >= 5, `enough desks were painted to mean something (${nDesks})`);
ok(nRunning >= 1, `at least one pick-list row says Running (${nRunning})`);
ok(nHolds >= 1, `at least one pick-list row says Holds this seat (${nHolds})`);
ok(nNone >= 1, `at least one pick-list row is neither and untagged (${nNone})`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · a plain candidate (no cross-office candidacy) says Running");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = boot({ state: "Texas", city: "Fort Worth", county: "Tarrant County", district: "12" });
  const html = deskOf(w, "senate");
  const rows = pickRows(html), roles = rosterRoles(html);
  const running = (w.pdxSeatField("senate").candidacies || []);
  const plain = Object.keys(rows).filter((p) => roles[p] === "candidate" && running.indexOf(p) === -1);
  ok(plain.length >= 1, `Texas Senate has a candidate on file by record status alone (${plain.join(", ")})`);
  plain.forEach((p) => eq(rows[p][0], "Running", `Texas Senate: ${p} says Running`));
  // Only meaningful while the change is uncommitted: once it is HEAD, there is
  // no "before" to compare against.
  if (HEAD_WORK && HEAD_WORK !== R("ballot-workspace.js")) {
    const h0 = pickRows(deskOf(boot({ state: "Texas", city: "Fort Worth", county: "Tarrant County", district: "12" }, HEAD_WORK), "senate"));
    ok(plain.some((p) => (h0[p] || []).length === 0), "at least one of them had no tag before this change");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a sitting member still says Holds this seat");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = boot({ state: "Texas", city: "Fort Worth", county: "Tarrant County", district: "12" });
  const rows = pickRows(deskOf(w, "senate"));
  const holders = w.pdxSeatHolders("senate").pids || [];
  ok(holders.length >= 1, `Texas Senate names a sitting member (${holders.join(", ")})`);
  holders.forEach((p) => { if (rows[p]) eq(JSON.stringify(rows[p]), JSON.stringify(["Holds this seat"]), `Texas Senate: ${p} says Holds this seat and nothing else`); });
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · Paxton and Donalds say Running in the race they are entering");
// ═════════════════════════════════════════════════════════════════════════════
{
  const tx = boot({ state: "Texas", city: "Fort Worth", county: "Tarrant County", district: "12" });
  const txRows = pickRows(deskOf(tx, "senate"));
  eq(JSON.stringify(txRows.ken_paxton), JSON.stringify(["Running"]), "Paxton: Texas U.S. Senate pick row says Running");
  const fl = boot({ state: "Florida", city: "Naples", county: "Collier County", district: "19" });
  const flRows = pickRows(deskOf(fl, "governor"));
  eq(JSON.stringify(flRows.donalds), JSON.stringify(["Running"]), "Donalds: Florida Governor pick row says Running");
}

console.log("");
if (failures.length) {
  failures.forEach((f) => console.error(`  ✗ ${f}`));
  console.error(`\n✗ ballot pick Running tag: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ ballot pick Running tag: ${passed} passed`);
