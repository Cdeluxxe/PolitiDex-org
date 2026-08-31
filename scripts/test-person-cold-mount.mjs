#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-person-cold-mount.mjs — the person file is not gated on the cloud
// ─────────────────────────────────────────────────────────────────────────────
// THE REPORT. After the skeleton pass, a cold /p/lee showed the six crawl rows
// immediately and then sat about 39 SECONDS on "Loading the latest roster…"
// before the letterhead — photo, tenure, formal brief, money chip — appeared.
// The homepage was already painted by then. Nothing was missing from the record.
//
// THE CAUSE, one line of openModal: the first thing it did for an id whose FULL
// Firestore document had not arrived was open the loading shell and await
// _pdxEnsureFullProfile(id). That is a Firestore document read, behind anonymous
// sign-in, behind the lightweight roster index — three cloud round trips for a
// letterhead whose fields are not in the cloud at all:
//
//   name, office, state, district, party, icon   cmp-data.js — a BUNDLED script,
//                                                in memory before person-file.js
//                                                has executed
//   photo                                        _getPhotoUrl: PROFILES →
//                                                CMP_DATA → BROWSE_PHOTOS
//   formal brief                                 word-action.js, off the member
//                                                vote payload the head block
//                                                already has in flight
//
// So the file now MOUNTS from what is on hand and the Firestore document merges
// in behind the paint. What this file holds:
//
//   1. A COLD ARRIVAL THE APP CAN ALREADY RESOLVE MOUNTS WITHOUT THE CLOUD. With
//      _pdxEnsureFullProfile hanging (the 30s mock), the real shipped gate falls
//      THROUGH to the renderer instead of returning on a shell — for lee, khanna,
//      chew_h68 and the /p/mike_lee alias.
//   2. THE MERGE DOES NOT BLANK THE FILE. When the hanging promise finally
//      resolves, a richer photo/bio arrives and the letterhead repaints once;
//      Firestore wins where it carries a value; a document that has LOST a name
//      or an office cannot erase the one the reader is looking at; and a resolve
//      with nothing new costs no repaint at all.
//   3. AN ID WITH NOTHING LOCAL STILL WAITS. No seed means the shell and the
//      Firestore wait, unchanged — person-file.js is still the thing that refuses
//      to call such an id unknown before the roster settles (that gate is held in
//      test-person-file-perf.mjs §12 and test-person-cold-open.mjs §1).
//   4. IN-APP OPENS ARE UNTOUCHED. A card tap, or a hop while a file is already
//      on screen, is not an arrival and does not take the local-first path.
//   5. "NAME ON FILE" MEANS THE LETTERHEAD. The skeleton takes its own mark; only
//      the mount takes file-named, and the merge takes its own mark after it.
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

// ── The two shipped slices this file RUNS ────────────────────────────────────
// Not reimplementations. The cold-open helper and the gate inside openModal are
// cut out of profiles-full.js as source text and executed, so a rewrite that
// quietly puts the Firestore wait back in front of the paint fails here.
const COLD_SRC = (PROF.match(/  window\._pdxColdOpen = \{[\s\S]*?\n  \};\n/) || [])[0];
must(COLD_SRC, "profiles-full.js no longer defines window._pdxColdOpen");

const GATE_SRC = (PROF.match(
  /    if \(id && window\._pdxFullIds && typeof window\._pdxEnsureFullProfile === 'function' && !window\._pdxFullIds\.has\(id\)\) \{[\s\S]*?\n    \}\n/
) || [])[0];
must(GATE_SRC, "openModal's full-document gate is gone or reformatted past recognition");
must(GATE_SRC.includes("_cold.merge(id, openModal)"), "the isolated slice is not the cold-open gate");

// ── The sandbox ──────────────────────────────────────────────────────────────
// Only what the two slices touch. `openModal` is a spy standing in for the 3000
// lines of renderer below the gate: the question this file asks is whether the
// gate REACHES it, and with what record.
const ROSTER = {
  lee: { name: "Mike Lee", office: "U.S. Senator", state: "Utah", party: "R", icon: "🏛", termStart: "2011-01" },
  khanna: { name: "Ro Khanna", office: "U.S. Representative", state: "California", party: "D", icon: "🏛" },
  chew_h68: { name: "Scott Chew", office: "State Representative", state: "Utah", party: "R", icon: "🏛" },
};
const ALIASES = { scott_chew: "chew_h68", mike_lee: "lee" };

function sandbox(opts) {
  const o = opts || {};
  const calls = { render: [], shell: [], marks: [] };
  const body = { id: "modal-body", scrollTop: o.scrollTop || 0 };
  const doc = {
    getElementById(id) { return id === "modal-body" ? body : { id, style: {}, innerHTML: "" }; },
    querySelector() { return null; },
  };
  // The cloud, as slow as the report says it was — and under this file's control.
  const firestore = { settle: null, calls: [] };
  const win = {
    document: doc,
    PROFILES: JSON.parse(JSON.stringify(o.live || {})),
    CMP_DATA: JSON.parse(JSON.stringify(o.bundled === undefined ? ROSTER : o.bundled)),
    _pdxFullIds: new Set(o.full || []),
    _pdxCurrentProfileId: o.openNow || null,
    _pdxEnsureFullProfile(id) {
      firestore.calls.push(id);
      return new Promise((res) => { firestore.settle = res; });
    },
    _pdxOpenFullModalShell(id) { calls.shell.push(id); },
    PDXPerf: { marks: {}, mark(n) { if (this.marks[n] === undefined) { this.marks[n] = calls.marks.length + 1; calls.marks.push(n); } } },
    PDXPerson: {
      fromPath() { return o.path === undefined ? "lee" : o.path; },
      resolve(raw) {
        if (!raw) return "";
        const a = ALIASES[raw] || raw;
        return (win.PROFILES[a] || win.CMP_DATA[a]) ? a : "";
      },
      resolveArrival(raw) { return win.PDXPerson.resolve(raw) || (o.stamp || ""); },
    },
    console,
    Promise, Object, Array, String, JSON,
  };
  win.window = win; win.globalThis = win;

  const ctx = vm.createContext(win);
  // The helper, then the gate wrapped as a callable. `PROFILES` / `CMP_DATA` /
  // `openModal` are the bare identifiers the gate uses inside openModal, so they
  // are bound as parameters here exactly as the closure binds them there.
  new vm.Script(`(function(){${COLD_SRC}})();`, { filename: "profiles-full.js#_pdxColdOpen" }).runInContext(ctx);
  const gate = vm.runInContext(
    `(function (id, PROFILES, CMP_DATA, openModal) {\n${GATE_SRC}\n  return 'mounted';\n})`,
    ctx,
    { filename: "profiles-full.js#openModal-gate" }
  );

  return {
    win, calls, firestore, body,
    // What openModal does: run the gate, and either mount (fall through) or bail.
    open(id) {
      const outcome = gate(id, win.PROFILES, win.CMP_DATA, (again) => {
        // The renderer, as far as this gate can see it: it records the record it
        // was handed and stamps the mount the way profiles-full.js does.
        calls.render.push({ id: again, name: win.PROFILES[again] && win.PROFILES[again].name,
                            office: win.PROFILES[again] && win.PROFILES[again].office,
                            photo: win.PROFILES[again] && win.PROFILES[again].photo,
                            bio: win.PROFILES[again] && win.PROFILES[again].bio });
        win._pdxCurrentProfileId = again;
        win.PDXPerf.mark("file-named");
        return true;
      });
      if (outcome === "mounted") {
        calls.render.push({ id, name: win.PROFILES[id] && win.PROFILES[id].name,
                            office: win.PROFILES[id] && win.PROFILES[id].office,
                            photo: win.PROFILES[id] && win.PROFILES[id].photo,
                            bio: win.PROFILES[id] && win.PROFILES[id].bio });
        win._pdxCurrentProfileId = id;
        win.PDXPerf.mark("file-named");
      }
      return outcome;
    },
    // The cloud finally answers. `doc` is the Firestore document; null means the
    // id has none. Merged the way firebase-boot.js merges it, which is the
    // behaviour section 2 pins against the real source.
    async settle(id, docFields) {
      must(this.firestore.settle, `nothing ever asked Firestore for ${id}`);
      if (docFields) {
        const merged = Object.assign({}, win.PROFILES[id] || {}, docFields);
        delete merged.__lite;
        win.PROFILES[id] = merged;
      }
      win._pdxFullIds.add(id);
      const s = this.firestore.settle;
      this.firestore.settle = null;
      s(win.PROFILES[id] || null);
      await new Promise((r) => setImmediate(r));
      await new Promise((r) => setImmediate(r));
    },
  };
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · a cold arrival mounts the full file with the cloud still hanging");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The reported case: CMP_DATA has lee, Firestore/roster is hanging. The gate
  // must reach the renderer, with lee's own identity fields on the record it
  // hands over — not open a shell and return.
  const s = sandbox({ path: "lee" });
  eq(s.open("lee"), "mounted", "/p/lee falls through to the renderer, it does not return on a shell");
  eq(s.calls.shell, [], "…and no loading shell is opened at all");
  eq(s.calls.render.length, 1, "the file is rendered exactly once on arrival");
  eq(s.calls.render[0].name, "Mike Lee", "the letterhead is handed the name from the bundled roster");
  eq(s.calls.render[0].office, "U.S. Senator", "…and the office");
  eq(s.firestore.calls, ["lee"], "the Firestore document is asked for, behind the paint");
  ok(s.firestore.settle !== null, "and it is STILL IN FLIGHT while the file is on screen");
  has(s.calls.marks.join(","), "file-named", "the mount takes the name-on-file mark");
  eq(s.win._pdxFullIds.has("lee"), false, "the file mounted without the full document ever arriving");

  // The three other addresses the smoke test walks, plus the alias form. Each
  // must mount the person the address names, under the roster's own id.
  for (const [path, want, name] of [
    ["khanna", "khanna", "Ro Khanna"],
    ["chew_h68", "chew_h68", "Scott Chew"],
    ["mike_lee", "lee", "Mike Lee"],
    ["scott_chew", "chew_h68", "Scott Chew"],
  ]) {
    const a = sandbox({ path });
    eq(a.open(want), "mounted", `/p/${path} mounts ${want} without waiting on Firestore`);
    eq(a.calls.render[0] && a.calls.render[0].name, name, `/p/${path} mounts the right person`);
    eq(a.calls.shell, [], `/p/${path} opens no shell`);
  }

  // The edge's own stamp is a resolve source too: an address the client's tables
  // cannot resolve but the edge already named still mounts from local.
  const st = sandbox({ path: "j_lee_typo", stamp: "lee" });
  eq(st.open("lee"), "mounted", "an address only the edge stamp resolves still mounts from local");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the merge lands behind the paint and cannot blank the file");
// ═════════════════════════════════════════════════════════════════════════════
{
  // (a) Something new arrives: one repaint, richer fields, name intact.
  const a = sandbox({ path: "lee" });
  a.open("lee");
  eq(a.calls.render.length, 1, "one paint before the cloud answers");
  await a.settle("lee", { photo: "https://cdn/lee.jpg", bio: "Senator since 2011.", name: "Mike Lee" });
  eq(a.calls.render.length, 2, "the arriving document repaints the file exactly once");
  eq(a.calls.render[1].photo, "https://cdn/lee.jpg", "the richer photo merges in");
  eq(a.calls.render[1].bio, "Senator since 2011.", "…and the bio, which the bundled roster does not carry");
  eq(a.calls.render[1].name, "Mike Lee", "the name survives the merge");
  has(a.calls.marks.join(","), "roster-merged", "the merge takes its own mark");
  ok(a.calls.marks.indexOf("file-named") < a.calls.marks.indexOf("roster-merged"),
    "name on file lands BEFORE the roster merge, not because of it");

  // (b) Firestore wins where it carries a value. An office corrected in the
  // cloud is the cloud's to correct.
  const b = sandbox({ path: "lee" });
  b.open("lee");
  eq(b.calls.render[0].office, "U.S. Senator", "the first paint is the bundled office");
  await b.settle("lee", { office: "U.S. Senator (retired)", name: "Michael S. Lee" });
  eq(b.calls.render[1].office, "U.S. Senator (retired)", "Firestore wins on office at merge time");
  eq(b.calls.render[1].name, "Michael S. Lee", "…and on name");

  // (c) THE BLANK. A document that has lost its identity fields may not erase the
  // letterhead the reader is looking at.
  const c = sandbox({ path: "lee" });
  c.open("lee");
  await c.settle("lee", { name: "", office: null, bio: "still here" });
  eq(c.win.PROFILES.lee.name, "Mike Lee", "an empty name in the document does not blank the file");
  eq(c.win.PROFILES.lee.office, "U.S. Senator", "…nor an absent office");
  eq(c.calls.render.length, 2, "the rest of the document still merges");
  eq(c.calls.render[1].bio, "still here", "…including the field it did carry");

  // (d) Nothing new: no repaint. This branch resolves in a microtask on any page
  // with no Firebase, and a free full re-render of a file the reader is reading
  // is not free.
  const d = sandbox({ path: "lee" });
  d.open("lee");
  await d.settle("lee", null);
  eq(d.calls.render.length, 1, "a document that added nothing costs no repaint");
  hasnt(d.calls.marks.join(","), "roster-merged", "…and takes no merge mark");

  // (e) The reader closed the file, or opened someone else, while the document
  // was in flight. The merge must not repaint over what is on screen now.
  const e = sandbox({ path: "lee" });
  e.open("lee");
  e.win._pdxCurrentProfileId = "khanna";
  await e.settle("lee", { bio: "arrived too late" });
  eq(e.calls.render.length, 1, "a merge for a file that is no longer open repaints nothing");

  // (f) The reader scrolled into the file while the document was in flight. The
  // repaint keeps their place — openModal itself ends by scrolling to the top.
  const f = sandbox({ path: "lee", scrollTop: 0 });
  f.open("lee");
  f.body.scrollTop = 1840;
  await f.settle("lee", { bio: "merged" });
  eq(f.calls.render.length, 2, "the merge repainted");
  eq(f.body.scrollTop, 1840, "…and the reader is left where they were, not back at the photo");

  // (g) One Firestore read per pid, however many times openModal is re-entered
  // before it lands.
  const g = sandbox({ path: "lee" });
  g.open("lee");
  g.win._pdxCurrentProfileId = null;
  g.open("lee");
  g.win._pdxCurrentProfileId = null;
  g.open("lee");
  eq(g.firestore.calls, ["lee"], "three opens before the document lands ask the cloud once");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · an id with nothing local still waits, and in-app opens are untouched");
// ═════════════════════════════════════════════════════════════════════════════
{
  // No seed anywhere: the shell and the wait, exactly as before. person-file.js
  // is what decides when such an id may be called unknown, and it still waits on
  // the roster flag to do it (test-person-file-perf.mjs §12).
  const a = sandbox({ path: "ghost", bundled: {} });
  eq(a.open("ghost"), undefined, "an id with no local record returns on the shell");
  eq(a.calls.shell, ["ghost"], "…having opened it");
  eq(a.calls.render, [], "and nothing is rendered until the document lands");
  await a.settle("ghost", { name: "Late Arrival", office: "Mayor" });
  eq(a.calls.render.length, 1, "the document landing is what mounts that file");
  eq(a.calls.render[0].name, "Late Arrival", "…with the name it brought");

  // A record with no name is not a letterhead.
  const b = sandbox({ path: "nameless", bundled: { nameless: { office: "Mayor", state: "Utah" } } });
  eq(b.open("nameless"), undefined, "a nameless local record does not mount an empty h1");
  eq(b.calls.shell, ["nameless"], "it takes the shell instead");

  // Not an arrival: no /p/ address in the bar. A card tap on the homepage keeps
  // the path it has always had.
  const c = sandbox({ path: "" });
  eq(c.open("lee"), undefined, "an open with no /p/ address in the bar is not an arrival");
  eq(c.calls.shell, ["lee"], "…so it opens the shell, as it always did");

  // Not an arrival: a file is already on screen. A hop from one person to another
  // is under a reader's finger, and paint-then-repaint there buys nothing.
  const d = sandbox({ path: "lee", openNow: "khanna" });
  eq(d.open("lee"), undefined, "a hop while another file is open is not an arrival");
  eq(d.calls.shell, ["lee"], "…so it opens the shell");

  // The address names somebody else. /p/khanna must not be allowed to mount lee
  // from local just because lee is the id being opened.
  const e = sandbox({ path: "khanna" });
  eq(e.open("lee"), undefined, "an arrival for khanna does not take lee down the local-first path");

  // Already full: the gate is not entered at all, so nothing here can touch a
  // warm in-app open.
  const f = sandbox({ path: "lee", full: ["lee"] });
  eq(f.open("lee"), "mounted", "an id whose document is already in hand renders straight through");
  eq(f.firestore.calls, [], "…and asks the cloud for nothing");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the wiring, at the source");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The gate must not await anything before falling through. A `return` on the
  // local-first branch is the whole defect coming back.
  const local = GATE_SRC.slice(GATE_SRC.indexOf("if (_seed && _seed.name) {"), GATE_SRC.indexOf("} else {"));
  hasnt(local, "return", "the local-first branch falls through to the renderer, it never returns");
  hasnt(local, "await", "…and awaits nothing");
  has(local, "_cold.merge(id, openModal)", "the Firestore read is started behind the paint");
  has(GATE_SRC, "window._pdxOpenFullModalShell(id)", "the shell survives for the id that has nothing local");

  // Firestore wins on merge because firebase-boot merges in that order. Asserted
  // against the real source, since this file's own settle() mirrors it.
  has(BOOT, "var merged = Object.assign({}, PROFILES[id] || {}, full);",
    "firebase-boot merges the arriving document OVER the local record");
  has(BOOT, "delete merged.__lite;", "…and the merged record is no longer a lite stub");

  // The letterhead's identity and its two chips are built from the record and
  // from mounts, never from a Firestore read of their own — which is what makes
  // the local-first paint a whole letterhead rather than a partial one.
  const hero = PROF.slice(PROF.indexOf("<!-- Hero header"), PROF.indexOf("<!-- The primary read, mounted inside the letterhead."));
  must(hero.length > 500, "the hero letterhead block is gone or moved");
  has(hero, "window._getPhotoUrl(id)", "the photo comes from the local-first photo resolver");
  has(hero, "${p.name}", "the h1 is the record's name");
  has(hero, "${p.office || 'Public Official'}", "the eyebrow is the record's office");
  has(hero, "window._pdxTenurePill(p)", "the tenure pill is computed from the record");
  has(hero, "PDXWordAction.compactBadgeMount(id, p)", "Word vs Action is a mount, so it can arrive late");
  has(hero, "PDXFinanceLane.letterheadChipMount(id)", "the money chip is a mount, so it can arrive late");
  hasnt(hero, "_pdxEnsureFullProfile", "nothing in the letterhead reaches for the Firestore document");

  // The seed is both rosters, and it cannot be blanked by an empty live field.
  const seed = (COLD_SRC.match(/seed: function \(id\)[\s\S]*?\n    \},/) || [])[0];
  must(seed, "_pdxColdOpen.seed is gone");
  has(seed, "window.PROFILES", "the seed reads the live roster");
  has(seed, "CMP_DATA", "…and the bundled one");
  has(seed, "if (v === undefined || v === null || v === '') continue;",
    "an empty live field never overwrites a bundled one");

  // An arrival is person-file's question, answered with person-file's tables.
  const arr = (COLD_SRC.match(/isArrival: function \(id\)[\s\S]*?\n    \},/) || [])[0];
  must(arr, "_pdxColdOpen.isArrival is gone");
  has(arr, "P.fromPath()", "the address is read through person-file");
  has(arr, "P.resolveArrival(raw)", "…and resolved through the arrival resolver (alias tables + edge stamp)");
  has(arr, "if (window._pdxCurrentProfileId) return false;", "an open file means this is a hop, not an arrival");
  has(PF, "resolveArrival: resolveArrival", "person-file still exports the arrival resolver");

  // The mark contract. Only the mount may claim name-on-file.
  eq((PROF.match(/mark\('file-named'\)/g) || []).length, 0,
    "profiles-full.js takes no file-named mark of its own — person-file's mounted() owns it");
  has(PF, "perf('file-named')", "person-file's mounted() takes it");
  has(PROF, "window.PDXPerson.mounted(id)", "…and profiles-full calls it at the mount");
  has(PROF, "mark('skeleton-named')", "the skeleton takes its own, distinct mark");
  has(PROF, "mark('roster-merged')", "the merge takes its own, distinct mark");
  ["skeleton-named", "file-named", "roster-merged"].forEach((n) =>
    has(PERFJS, `['${n}',`, `pdx-perf.js documents the '${n}' stage`));
  const cold = (PERFJS.match(/var COLD = \[[\s\S]*?\n  \];/) || [])[0];
  must(cold, "pdx-perf.js's COLD table is gone");
  has(cold, "['name on file',  ['file-named']]",
    "the cold line's name-on-file is the mounted letterhead and nothing shorter");
  // The mark names the line actually reads, with the prose stripped: a comment
  // that mentions a mark must not be able to satisfy — or fail — this check.
  const coldMarks = cold.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  hasnt(coldMarks, "'skeleton-named'", "the skeleton cannot stand in for name on file");
  hasnt(coldMarks, "'roster-merged'", "…and neither can the roster merge, which is behind the paint");
  hasnt(coldMarks, "'person-open'", "…and neither can the shell having opened");
}

// ══════════════════════════════════════════════════════════════════════════════
// The pledge lane, during the window the cold mount opens.
//
// The seed is a CMP_DATA record: summary kept/broken/pending counts, no
// promises[]. So between the paint and the merge the profile renders the
// counts-only shape of the pledge block — and it has to, because at that instant
// the ledger really is not inspectable and the Promise Tracker really has
// nothing to show. What this section pins is that the copy for that state is the
// true one ("not itemized yet"), that no rate is published in either state so
// nothing gets retracted when the merge lands, and that the guard stays
// synchronous rather than growing a loading branch that consults the merge.
// ══════════════════════════════════════════════════════════════════════════════
section("5 · the pledge lane says what it holds, in both halves of the window");
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
  has(IDX, "window._pdxColdOpen in profiles-full.js",
    "…and points at the mount that opens the window");

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
console.log(`✓ person cold mount: /p/<pid> paints the real person file off local data, and the cloud merges in behind it — ${passed} assertions passed\n`);
