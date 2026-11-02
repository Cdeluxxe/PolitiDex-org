#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-ballot-pick-running-tag.mjs — the desk tells the holder from the running
// ─────────────────────────────────────────────────────────────────────────────
// The desk's Research step lists the sitting member and the candidates for an
// open seat. It used to do that with a badge on every pick-list row ("Holds
// this seat", "Running"); it now does it with two groups — "Holds this seat
// now" (or "On file as holding this seat") and "Running" — and no badges.
//
// What it pins, on the real roster, resolver, field and desk:
//
//   1. A candidate (including a plain one, with no cross-office candidacy) sits
//      in the Running group.
//   2. A sitting member the resolver names sits in the holder group, and only
//      there.
//   3. Every Research row's role agrees with the group it is in.
//   4. No row on the desk carries a status badge.
//   5. Cross-office candidacies (Paxton, Donalds) are Running in the race they
//      are entering.
//   6. Who appears in the pick list is unchanged from HEAD.
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
// pids in the pick list (the fold under step 3).
const pickRows = (html) => {
  const out = {};
  for (const m of html.matchAll(/<li class="bw-cand[^"]*">([\s\S]*?)<\/li>/g)) {
    const p = /pdxBallotWorkspacePick\('[^']*','([^']*)'\)/.exec(m[1]);
    if (p) out[p[1]] = 1;
  }
  return out;
};
// pid → { group, role } for every Research row. group is "holder" | "running".
const research = (html) => {
  const out = {};
  for (const g of html.matchAll(/<p class="bw-grp" data-bw-grp="([a-z]+)">[^<]*<\/p>\s*<ul class="bw-people"[^>]*>([\s\S]*?)<\/ul>/g)) {
    for (const m of g[2].matchAll(/data-bw-roster="([^"]*)" data-bw-role="([^"]*)"/g)) out[m[1]] = { group: g[1], role: m[2] };
  }
  return out;
};

// Locations and seats with a mix of holders, candidates and reference rows.
const PLACES = [
  { loc: { state: "Utah", city: "Provo", county: "Utah County", district: "3" }, seats: ["senate", "house", "governor", "statesenate", "statehouse"] },
  { loc: { state: "Texas", city: "Fort Worth", county: "Tarrant County", district: "12" }, seats: ["senate", "house", "governor", "attorneygeneral"] },
  { loc: { state: "Florida", city: "Naples", county: "Collier County", district: "19" }, seats: ["senate", "house", "governor"] },
  { loc: { state: "Georgia", city: "", county: "", district: "1" }, seats: ["senate", "governor"] },
  { loc: { state: "Michigan", city: "", county: "", district: "1" }, seats: ["senate", "governor", "secretaryofstate"] },
];

// ═════════════════════════════════════════════════════════════════════════════
section("1–4 · every Research row sits in the group its role names");
// ═════════════════════════════════════════════════════════════════════════════
let nRunning = 0, nHolds = 0, nDesks = 0;
for (const { loc, seats } of PLACES) {
  const w = boot(loc), w0 = HEAD_WORK ? boot(loc, HEAD_WORK) : null;
  for (const rk of seats) {
    const html = deskOf(w, rk);
    const rows = research(html);
    const pids = Object.keys(rows);
    if (!pids.length) continue;
    nDesks++;
    const where = `${loc.state} ${rk}`;
    ok(html.indexOf('class="bw-tag') < 0, `${where}: a desk row carries a status badge`);
    for (const pid of pids) {
      const r = rows[pid];
      eq(r.group, r.role === "incumbent" ? "holder" : "running", `${where}: ${pid} (${r.role}) sits in the wrong group`);
      if (r.group === "running") nRunning++; else nHolds++;
    }
    (w.pdxSeatHolders(rk).pids || []).forEach((p) => {
      if (rows[p]) eq(rows[p].group, "holder", `${where}: the resolver's holder ${p} is not in the holder group`);
    });
    if (w0) {
      const html0 = deskOf(w0, rk);
      eq(JSON.stringify(Object.keys(pickRows(html0)).sort()), JSON.stringify(Object.keys(pickRows(html)).sort()), `${where}: the pick list lists the same people as HEAD`);
    }
  }
}
console.log(`   desks ${nDesks} · running ${nRunning} · holds ${nHolds}`);
ok(nDesks >= 5, `enough desks were painted to mean something (${nDesks})`);
ok(nRunning >= 1, `at least one Research row is Running (${nRunning})`);
ok(nHolds >= 1, `at least one Research row holds the seat (${nHolds})`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · a plain candidate (no cross-office candidacy) is Running");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = boot({ state: "Texas", city: "Fort Worth", county: "Tarrant County", district: "12" });
  const rows = research(deskOf(w, "senate"));
  const running = (w.pdxSeatField("senate").candidacies || []);
  const plain = Object.keys(rows).filter((p) => rows[p].role === "candidate" && running.indexOf(p) === -1);
  ok(plain.length >= 1, `Texas Senate has a candidate on file by record status alone (${plain.join(", ")})`);
  plain.forEach((p) => eq(rows[p].group, "running", `Texas Senate: ${p} is Running`));
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a sitting member holds this seat");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = boot({ state: "Texas", city: "Fort Worth", county: "Tarrant County", district: "12" });
  const html = deskOf(w, "senate");
  const rows = research(html);
  const holders = w.pdxSeatHolders("senate").pids || [];
  ok(holders.length >= 1, `Texas Senate names a sitting member (${holders.join(", ")})`);
  ok(html.indexOf('data-bw-grp="holder">Holds this seat now<') >= 0, "Texas Senate: the holder group is not labelled Holds this seat now");
  holders.forEach((p) => eq(rows[p] && rows[p].group, "holder", `Texas Senate: ${p} holds this seat`));
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · Paxton and Donalds are Running in the race they are entering");
// ═════════════════════════════════════════════════════════════════════════════
{
  const tx = boot({ state: "Texas", city: "Fort Worth", county: "Tarrant County", district: "12" });
  const txRows = research(deskOf(tx, "senate"));
  eq(txRows.ken_paxton && txRows.ken_paxton.group, "running", "Paxton: Texas U.S. Senate is listed as Running");
  const fl = boot({ state: "Florida", city: "Naples", county: "Collier County", district: "19" });
  const flRows = research(deskOf(fl, "governor"));
  eq(flRows.donalds && flRows.donalds.group, "running", "Donalds: Florida Governor is listed as Running");
}

console.log("");
if (failures.length) {
  failures.forEach((f) => console.error(`  ✗ ${f}`));
  console.error(`\n✗ ballot pick Running tag: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ ballot pick Running tag: ${passed} passed`);
