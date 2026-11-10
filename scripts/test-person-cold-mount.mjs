#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-person-cold-mount.mjs — the person file paints once, as the right person
// ─────────────────────────────────────────────────────────────────────────────
// HISTORY. A cold /p/<pid> used to mount the file early off a seed (the bundled
// roster row merged with the lightweight stub) and repaint it when the full
// Firestore document landed, with a skeleton of the arrival header and a
// "Loading the latest roster…" line in the shell before that. Since the person
// split the document read is fast, and that provisional paint had become the
// visible defect: a stale or placeholder photo and a half-built header, then the
// correct file swapping in.
//
// So the early paint is gone. What this file holds, by RUNNING the shipped gate
// out of openModal:
//
//   1. A COLD OPEN WAITS, ON A SPINNER, AND PAINTS ONCE. Nothing is rendered
//      while the document is in flight; when it lands the file renders exactly
//      once, with the document's own photo — never a provisional one first.
//   2. NO DEAD END AND NO LOOP. An id with no document still opens off the
//      bundled roster; a failed read (the id never enters _pdxFullIds) renders
//      once off what is on hand instead of re-opening the shell forever.
//   3. THE WIRING. No cold-mount helper, no skeleton in the shell, no stage
//      names only the early paint used, and no roster-loading pill over the
//      person document.
//
//   node scripts/test-person-cold-mount.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) =>
  ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const hasnt = (h, n, m) => ok(!String(h).includes(n), `${m} — still contains ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ person cold mount: STALE HARNESS — ${m}`); process.exit(2); };

const PROF = R("profiles-full.js");
const PF = R("person-file.js");
const BOOT = R("firebase-boot.js");
const PERFJS = R("pdx-perf.js");

const GATE_SRC = (PROF.match(
  /    if \(id && _pdxShellSettled\[id\]\) \{[\s\S]*?\n    \}\n/
) || [])[0];
must(GATE_SRC, "openModal's full-document gate is gone or reformatted past recognition");
must(GATE_SRC.includes("window._pdxEnsureFullProfile(id).then("), "the isolated slice is not the full-document gate");

const ROSTER = {
  lee: { name: "Mike Lee", office: "U.S. Senator", state: "Utah", photo: "bundled-lee.jpg" },
  bmoore: { name: "Blake Moore", office: "U.S. Representative", state: "Utah", photo: "bundled-moore.jpg" },
};

function sandbox(opts) {
  const o = opts || {};
  const calls = { render: [], shell: [] };
  const firestore = { settle: null, calls: [] };
  const win = {
    PROFILES: JSON.parse(JSON.stringify(o.live || {})),
    CMP_DATA: JSON.parse(JSON.stringify(o.bundled === undefined ? ROSTER : o.bundled)),
    _pdxFullIds: new Set(o.full || []),
    _pdxEnsureFullProfile(id) {
      firestore.calls.push(id);
      return new Promise((res) => { firestore.settle = res; });
    },
    _pdxOpenFullModalShell(id) { calls.shell.push(id); },
    console, Promise, Object, Array, String, JSON,
  };
  win.window = win;
  const ctx = vm.createContext(win);
  const gate = vm.runInContext(
    `(function (id, PROFILES, CMP_DATA, openModal, _pdxShellSettled) {\n${GATE_SRC}\n  return 'mounted';\n})`,
    ctx, { filename: "profiles-full.js#openModal-gate" }
  );
  const settled = {};
  const self = {
    win, calls, firestore,
    open(id) {
      const outcome = gate(id, win.PROFILES, win.CMP_DATA, (again) => self.open(again), settled);
      if (outcome === "mounted") {
        const p = win.PROFILES[id] || {};
        calls.render.push({ id, name: p.name, photo: p.photo, bio: p.bio });
      }
      return outcome;
    },
    // The read finishes. `docFields` null = no document; `failed` = the read
    // threw (firebase-boot then leaves the id out of _pdxFullIds).
    async settle(id, docFields, failed) {
      must(firestore.settle, `nothing ever asked Firestore for ${id}`);
      if (docFields) win.PROFILES[id] = Object.assign({}, win.PROFILES[id] || {}, docFields);
      if (!failed) win._pdxFullIds.add(id);
      const s = firestore.settle; firestore.settle = null;
      s(win.PROFILES[id] || null);
      await new Promise((r) => setImmediate(r));
      await new Promise((r) => setImmediate(r));
    },
  };
  return self;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · a cold open waits on a spinner and paints once");
// ═════════════════════════════════════════════════════════════════════════════
for (const id of ["bmoore", "lee"]) {
  // PROFILES holds the lightweight stub (name, no photo) when the open starts.
  const s = sandbox({ live: { [id]: { name: ROSTER[id].name, __lite: true } } });
  eq(s.open(id), undefined, `${id}: the open returns on the shell while the document is in flight`);
  eq(s.calls.shell, [id], `${id}: …having opened the shell`);
  eq(s.calls.render, [], `${id}: nothing of the file is painted before the data is in`);
  await s.settle(id, { photo: `firestore-${id}.jpg`, bio: "bio" });
  eq(s.calls.render.length, 1, `${id}: the file paints exactly once`);
  eq(s.calls.render[0].photo, `firestore-${id}.jpg`, `${id}: …with the document's photo, never a provisional one first`);
  eq(s.calls.render[0].name, ROSTER[id].name, `${id}: …and the right person`);
  eq(s.calls.shell.length, 1, `${id}: the shell is opened once`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · no dead end, and no loop");
// ═════════════════════════════════════════════════════════════════════════════
{
  const a = sandbox();
  a.open("bmoore");
  await a.settle("bmoore", null);
  eq(a.calls.render.length, 1, "an id with no document opens off the bundled roster");
  eq(a.calls.render[0].name, "Blake Moore", "…as the right person");

  const b = sandbox();
  b.open("lee");
  await b.settle("lee", null, true);
  eq(b.firestore.calls, ["lee"], "a failed read is not retried in a loop");
  eq(b.calls.shell, ["lee"], "…the shell is not reopened");
  eq(b.calls.render.length, 1, "…and the file renders once off what is on hand");

  const c = sandbox({ full: ["lee"], live: { lee: ROSTER.lee } });
  eq(c.open("lee"), "mounted", "an id whose document is in hand renders straight through");
  eq(c.calls.shell, [], "…with no shell");
  eq(c.firestore.calls, [], "…and no read");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the wiring, at the source");
// ═════════════════════════════════════════════════════════════════════════════
{
  hasnt(PROF, "window._pdxColdOpen", "the cold-mount seed path is gone from profiles-full.js");
  hasnt(GATE_SRC, "seed(", "the gate mounts nothing from a seed");
  const shell = (PROF.match(/window\._pdxOpenFullModalShell = function \(id\) \{[\s\S]*?\n  \};/) || [])[0];
  must(shell, "profiles-full.js's _pdxOpenFullModalShell is gone");
  hasnt(shell, "arrivalSkeleton", "the shell paints no skeleton");
  hasnt(shell, "Loading the latest roster", "…and states no roster wait");
  has(shell, "pdx-roster-spin", "…it is a spinner");
  hasnt(PF, "function arrivalSkeleton(", "person-file.js builds no skeleton");
  for (const n of ["skeleton-named", "roster-merged"]) {
    hasnt(PROF, `mark('${n}')`, `profiles-full.js no longer marks '${n}'`);
    hasnt(PERFJS, `['${n}',`, `pdx-perf.js no longer documents '${n}'`);
  }
  eq((PROF.match(/mark\('file-named'\)/g) || []).length, 0,
    "profiles-full.js takes no file-named mark of its own — person-file's mounted() owns it");
  has(PF, "perf('file-named')", "person-file's mounted() takes it");
  has(BOOT, "if (st === 'loading' && window.__PDX_PERSON_DOC === true) {",
    "firebase-boot shows no roster-loading pill on the person document");
  has(BOOT, "'<span>⚠️ Couldn’t load the roster.</span>'", "…while the error pill is kept");
}

// ══════════════════════════════════════════════════════════════════════════════
// The pledge lane guard: a counts-only record says "not itemized yet", and a
// record with promises[] opens the ledger. Kept from the earlier version of this
// file because the guard is still synchronous and still has two shapes to read.
// ══════════════════════════════════════════════════════════════════════════════
section("4 · the pledge lane says what it holds, before and after the ledger");
{
  const IDX = R("index.html");
  const ITEM_SRC = (IDX.match(/  window\._pdxHasItemizedPledges = function\(p\) \{[\s\S]*?\n  \};\n/) || [])[0];
  must(ITEM_SRC, "_pdxHasItemizedPledges is gone from index.html");

  const box = { window: {} };
  box.window.window = box.window;
  vm.createContext(box);
  vm.runInContext(`var window = this.window;\n${ITEM_SRC}`, box, { filename: "index.html#pledges" });
  const itemized = box.window._pdxHasItemizedPledges;
  must(typeof itemized === "function", "the extracted pledge guard did not define a function");

  // The seed shape, exactly as cmp-data.js carries it.
  ok(itemized({ name: "Mike Lee", kept: 12, broken: 4, pending: 3 }) === false,
    "a CMP_DATA seed's summary counts are not an itemized ledger");
  ok(itemized({ name: "Mike Lee", kept: 12, broken: 4, pending: 3, promises: [] }) === false,
    "…nor is an empty promises[]");
  // …and the merged Firestore document, which is where the ledger comes from.
  ok(itemized({ name: "Mike Lee", kept: 12, broken: 4, promises: [{ verdict: "kept" }] }) === true,
    "the merged document's promises[] is, so the repaint opens the ledger");
  ok(itemized(null) === false, "…and no record at all is not");

  // Synchronous, and staying that way: a guard that waited on the merge would put
  // a spinner where a true sentence already is.
  hasnt(ITEM_SRC, "_pdxFullIds", "the guard does not consult the roster's full-record set");
  hasnt(ITEM_SRC, "then(", "…and does not wait on a promise");
  hasnt(ITEM_SRC, "await", "…nor on an await");
  has(IDX, "do NOT make it consult _pdxFullIds",
    "index.html records why the guard stays synchronous through the cold-mount window");

  // The copy for each half. Both are count sentences; neither is a rate, so the
  // merge adds a ledger rather than correcting a published number.
  const FT = (PROF.match(/window\._renderFollowThrough = function[\s\S]*?\n  \};\n/) || [])[0];
  must(FT, "_renderFollowThrough is gone");
  has(FT, "not itemized yet",
    "the counts-only half says the pledges are not itemized YET — the merge makes that good");
  has(FT, "No follow-through percentage is published for this lane, on any profile.",
    "…and no rate is published in either half, so nothing is retracted on merge");
  has(FT, "if (m.resolved === 0 && m.pending === 0) return '';",
    "a seed with no counts renders no pledge block at all — the block appears on merge, never retracts");
  has(FT, "var interactive = m.itemized;",
    "the counts are plain text until there is a ledger below to filter to");
}

console.log("");
if (failures.length) {
  console.error(`✗ person cold mount: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ person cold mount: /p/<pid> waits for the right person and paints once — ${passed} assertions passed\n`);
