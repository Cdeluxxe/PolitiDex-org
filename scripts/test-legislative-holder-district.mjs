#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-legislative-holder-district.mjs — a county's race never names the holder
// of another district
// ─────────────────────────────────────────────────────────────────────────────
// The Key Races row for a curated Utah area is one race per COUNTY: Weber's
// State House race is HD-9 (Jake Sawyer), Davis's is HD-15 (Ariel Defay). A
// North Ogden reader whose address is in HD-7 was told "Holds this seat now:
// Jake Sawyer" under "Utah · District 7", and the HD-7 member and Republican
// nominee, Ryan D. Wilcox, was dropped from the race list. A Layton reader in
// HD-17 was told Ariel Defay holds it.
//
// WHAT THIS SUITE PROVES:
//   1. The district the row prints and the holder it names agree: HD-7 does not
//      name Sawyer, HD-17 does not name Defay.
//   2. The desk then names the member the field holds for that district, and
//      the candidates stay candidates.
//   3. A reader whose district IS the county race's district still gets that
//      race's incumbent (HD-9 → Sawyer, HD-15 → Defay).
//
//   node scripts/test-legislative-holder-district.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
  "stance-helpers.js", "alignment-tool.js", "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js", "profile-spine.js",
  "issue-colors.js", "my-stances.js", "roster-keys.js", "seat-field.js", "person-link.js", "voter-hub-location.js",
  "compare-hub.js", "ballot-breakdown.js", "who-represents-me.js", "race-sheet.js", "ballot-workspace.js",
];
const SRC = FILES.map((f) => [f, R(f)]);

function boot(loc) {
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
  win.PROFILES = win.CMP_DATA;
  for (const [f, src] of SRC) { try { vm.runInContext(src, ctx, { filename: f }); } catch (e) { /* page chrome the harness does not carry */ } }
  win.PROFILES = win.CMP_DATA;
  win._hasUserLocation = true;
  win._currentVoterLocation = Object.assign({ mapSelected: true, src: "set" }, loc);
  return win;
}

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const holder = (w) => { const lv = (w.pdxSeatHolders("statehouse").levels || [])[0] || {}; return { district: lv.district, pid: lv.pid || null }; };
const desk = (w) => { w.pdxBallotWorkspaceOpen("statehouse"); return String(w.document.getElementById("bw-body").innerHTML); };
const role = (html, pid) => { const m = new RegExp('data-bw-roster="' + pid + '"[\\s\\S]*?data-bw-role="([^"]*)"').exec(html); return m ? m[1] : null; };

console.log("\n   ── 1 · the row's district and its holder agree");
const NO = boot({ state: "Utah", city: "North Ogden", county: "Weber County", district: "2", stateSenateDistrict: "3", stateHouseDistrict: "7" });
const LA = boot({ state: "Utah", city: "Layton", county: "Davis County", district: "2", stateSenateDistrict: "7", stateHouseDistrict: "17" });
eq(holder(NO).district, "7", "North Ogden: the row is HD-7");
ok(holder(NO).pid !== "jake_sawyer", "North Ogden HD-7: Jake Sawyer (HD-9) is not named as its holder");
eq(holder(LA).district, "17", "Layton: the row is HD-17");
ok(holder(LA).pid !== "defay_h15", "Layton HD-17: Ariel Defay (HD-15) is not named as its holder");

console.log("   ── 2 · the desk names the district's own member, candidates stay candidates");
const noDesk = desk(NO), laDesk = desk(LA);
eq(role(noDesk, "ryan_d_wilcox"), "incumbent", "HD-7: Ryan D. Wilcox is on the race as its member");
eq(role(noDesk, "bianca_mittendorf"), "candidate", "HD-7: Bianca Mittendorf is a candidate");
eq(role(noDesk, "jake_sawyer"), null, "HD-7: Jake Sawyer is not on the race");
eq(role(laDesk, "stewart_e_barlow"), "incumbent", "HD-17: Stewart E. Barlow is on the race as its member");
eq(role(laDesk, "lili_bitner"), "candidate", "HD-17: Lili Bitner is a candidate");
eq(role(laDesk, "eric_last"), "candidate", "HD-17: Eric Last is a candidate");
eq(role(laDesk, "defay_h15"), null, "HD-17: Ariel Defay is not on the race");

console.log("   ── 3 · the county race still answers for its own district");
eq(holder(boot({ state: "Utah", city: "Ogden", county: "Weber County", district: "1", stateSenateDistrict: "5", stateHouseDistrict: "9" })).pid, "jake_sawyer", "Weber HD-9: Jake Sawyer");
eq(holder(boot({ state: "Utah", city: "Kaysville", county: "Davis County", district: "2", stateSenateDistrict: "6", stateHouseDistrict: "15" })).pid, "defay_h15", "Davis HD-15: Ariel Defay");

if (failures.length) {
  console.log(`\n   ${passed} passed, ${failures.length} failed\n`);
  for (const f of failures) console.log(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`\n   ✓ legislative holder district: all ${passed} assertions passed`);
