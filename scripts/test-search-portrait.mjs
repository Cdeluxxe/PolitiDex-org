#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-search-portrait.mjs — the search row paints the roster field's face
// ─────────────────────────────────────────────────────────────────────────────
// Karianne Lisonbee (lisonbee_h14) painted a portrait in the homepage search
// dropdown and 🏛 on /p/lisonbee_h14 and /district/ut-hd-14. The search row
// (all-seeing-eye.js photoFor) asked _getPhotoUrl, whose alias hop reached the
// `photo` on the LIVE Firestore document politicians/klisonbee; pdxPortrait,
// which the file and the board read, does not hop. The first portrait sweep
// built its world from bundled tables and never opened that store.
// `sweep-roster-portraits.mjs --live` copied those URLs onto the roster field,
// and the search row now reads pdxPortrait for every roster pid.
//
// WHAT THIS SUITE PROVES:
//   1. lisonbee_h14 paints one face on the file, the board and the search row,
//      with the live store as it stands (her face on politicians/klisonbee).
//   2. A pid with no portrait in either store paints the mark on all three.
//   3. The live sweep's disagreement case: both URLs listed, field not
//      overwritten — on a fixture and in the report on disk (teuscher_h44).
//   4. A mutation that leaves search on its old reader (_getPhotoUrl) fails.
//   5. index.html loads the reader before the search, and the shell moved.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { resolverSource, planLive, liveReportText, withLiveReport, REPORT, LIVE_OPEN } from "./sweep-roster-portraits.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const no = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
function report() {
  if (failures.length) {
    console.log(`\n   ${passed} passed, ${failures.length} failed\n`);
    for (const f of failures) console.log(`   ✗ ${f}`);
    process.exit(1);
  }
  console.log(`\n   ✓ search portrait: all ${passed} assertions passed`);
}
const must = (c, m) => { if (!c) { failures.push(`FIXTURE: ${m}`); report(); } else passed++; };

const LISONK = "https://le.utah.gov/images/legislator/LISONK.jpg";
// The live store as read on 2026-10-04: her face is on the alias document, and
// no document is keyed lisonbee_h14.
const LIVE = () => ({ klisonbee: { name: "Karianne Lisonbee", photo: LISONK } });

function lift(src, name) {
  const i = src.indexOf(`function ${name}(`);
  if (i < 0) return "";
  let d = 0, j = src.indexOf("{", i);
  for (; j < src.length; j++) {
    if (src[j] === "{") d++;
    else if (src[j] === "}") { d--; if (!d) break; }
  }
  return src.slice(i, j + 1);
}
function aliasSource() {
  const sh = R("stance-helpers.js");
  const a = sh.indexOf("var STANCE_ALIASES = {");
  const tail = "window.PDX_PID_ALIASES = PDX_PID_ALIASES;";
  return sh.slice(a, sh.indexOf(tail, a) + tail.length);
}
const deepCopy = (o) => JSON.parse(JSON.stringify(o));
// The bundled roster row, as cmp-data.js ships it.
function rosterRow(pid) {
  const w = { console }; w.window = w;
  vm.runInContext(R("cmp-data.js"), vm.createContext(w), { filename: "cmp-data.js" });
  return w.CMP_DATA[pid];
}
// Hold a roster row's bundled photo out, to stand the world before the sweep.
function unswept(ctx, pid) { vm.runInContext(`delete CMP_DATA[${JSON.stringify(pid)}].photo;`, ctx); }

// ── THE THREE SURFACES, each from its own source ────────────────────────────
// The person file's letterhead: person.html boots the roster and the reader,
// no _getPhotoUrl; the `_hp` expression is lifted out of profiles-full.js.
const HP = (/var _hp = ([^;]+);/.exec(R("profiles-full.js")) || [])[1];
must(HP, "profiles-full.js no longer computes the letterhead photo as `var _hp = …;`");
function fileFace(pid, { profiles = LIVE(), before = false } = {}) {
  const w = makeSandbox();
  w.PROFILES = deepCopy(profiles);
  const ctx = vm.createContext(w);
  vm.runInContext(R("cmp-data.js"), ctx, { filename: "cmp-data.js" });
  vm.runInContext(R("roster-portrait.js"), ctx, { filename: "roster-portrait.js" });
  if (before) unswept(ctx, pid);
  w.__id = pid; w.__p = Object.assign({}, w.CMP_DATA[pid], w.PROFILES[pid] || {});
  const url = String(vm.runInContext(`(function (id, p) { return ${HP}; })(window.__id, window.__p)`, ctx) || "");
  return url || "mark:" + w.pdxPortraitMark(pid);
}
// The district board's band 1.
function boardFace(alias, pid, { profiles = LIVE(), before = false } = {}) {
  const w = makeSandbox();
  w.__PDX_DISTRICT_BOARD_SEAT = alias;
  w.PROFILES = deepCopy(profiles);
  const ctx = vm.createContext(w);
  for (const f of ["cmp-data.js", "roster-portrait.js", "issue-map.js"]) vm.runInContext(R(f), ctx, { filename: f });
  if (before) unswept(ctx, pid);
  vm.runInContext(R("district-board.js"), ctx, { filename: "district-board.js" });
  const html = w.PDXDistrictBoard.seatHtml();
  const m = /<img class="pdxdb-seat-photo" src="([^"]*)"/.exec(html);
  return m ? m[1].replace(/&amp;/g, "&") : "mark:" + w.pdxPortraitMark(pid);
}
// The homepage search row: index.html's tables (roster, reader, map, alias
// tables, _getPhotoUrl) and all-seeing-eye.js's own photoFor + polItem thumb.
const EYE = R("all-seeing-eye.js");
const PHOTO_FOR = lift(EYE, "photoFor");
must(PHOTO_FOR, "all-seeing-eye.js no longer declares photoFor()");
const OLD_PHOTO_FOR = "function photoFor(id) {\n" +
  "      try { if (typeof window._getPhotoUrl === 'function') return window._getPhotoUrl(id) || ''; } catch (e) {}\n" +
  "      return '';\n    }";
function searchFace(pid, { profiles = LIVE(), before = false, photoFor = PHOTO_FOR } = {}) {
  const w = makeSandbox();
  w.PROFILES = deepCopy(profiles);
  const ctx = vm.createContext(w);
  vm.runInContext(R("cmp-data.js"), ctx, { filename: "cmp-data.js" });
  vm.runInContext(R("roster-portrait.js"), ctx, { filename: "roster-portrait.js" });
  vm.runInContext(R("browse-photos.js"), ctx, { filename: "browse-photos.js" });
  vm.runInContext(R("profile-alias.js"), ctx, { filename: "profile-alias.js" });
  vm.runInContext(aliasSource(), ctx, { filename: "stance-helpers.js[aliases]" });
  vm.runInContext(resolverSource().replace("window.__photo = _getPhotoUrl;", "window._getPhotoUrl = _getPhotoUrl;"),
    ctx, { filename: "ballot-breakdown.js[_getPhotoUrl]" });
  if (before) unswept(ctx, pid);
  vm.runInContext(photoFor + "\nwindow.__photoFor = photoFor;", ctx, { filename: "all-seeing-eye.js[photoFor]" });
  const url = String(w.__photoFor(pid) || "");
  return url || "mark:" + w.pdxPortraitMark(pid);
}
const three = (pid, alias, opts) => ({
  file: fileFace(pid, opts), board: boardFace(alias, pid, opts), search: searchFace(pid, opts),
});

// ═════════════════════════════════════════════════════════════════════════════
section("1 · lisonbee_h14 paints one face on the file, the board and the search row");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(rosterRow("lisonbee_h14").photo, LISONK, "her roster field holds the URL the search row reached on politicians/klisonbee");
  const s = three("lisonbee_h14", "ut-hd-14");
  eq(s.file, LISONK, "/p/lisonbee_h14 paints her portrait");
  eq(s.board, LISONK, "/district/ut-hd-14 band 1 paints her portrait");
  eq(s.search, LISONK, "the search row paints her portrait");
  ok(s.file === s.board && s.board === s.search, "…and it is the same face on all three");
  // With no live roster at all (a cold or offline page), still the same face.
  const cold = three("lisonbee_h14", "ut-hd-14", { profiles: {} });
  ok(cold.file === LISONK && cold.board === LISONK && cold.search === LISONK, "the bundled field alone carries it");
  // The reported defect, reproduced on the world before the sweep with the old
  // search reader: search had a face, the file and the board had the mark.
  const was = three("lisonbee_h14", "ut-hd-14", { before: true, photoFor: OLD_PHOTO_FOR });
  eq(was.search, LISONK, "before: the old search row reached klisonbee's face");
  eq(was.file, "mark:🏛", "before: the file painted the building mark");
  eq(was.board, "mark:🏛", "before: the board painted the building mark");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a pid with no portrait in either store keeps the mark on the file and in search");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(rosterRow("john_johnson").photo, undefined, "john_johnson's bundled field is empty");
  const s = { file: fileFace("john_johnson"), search: searchFace("john_johnson") };
  eq(s.file, "mark:🏛", "the file paints his mark");
  eq(s.search, "mark:🏛", "the search row paints his mark — no face invented");
  // Ids with no roster row keep _getPhotoUrl: a candidate the map still holds.
  ok(/^https:\/\//.test(searchFace("jpike", { profiles: {} })), "a map-only candidate (jpike) still paints the map's face");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · two URLs that differ are reported, not picked");
// ═════════════════════════════════════════════════════════════════════════════
{
  // A fixture roster: d_differ's field holds one URL, its alias document another.
  const SRC = [
    "Object.assign((window.CMP_DATA = window.CMP_DATA || {}),", "{",
    ' "a_copy": {', '  "name": "Alpha Copy",', '  "icon": "🏛"', " },",
    ' "d_differ": {', '  "name": "Delta Differ",', '  "photo": "https://roster.test/d.jpg",', '  "icon": "🏛"', " },",
    ' "n_none": {', '  "name": "November None",', '  "icon": "🏛"', " }",
    "});",
  ].join("\n");
  const live = {
    alpha_copy: { name: "Alpha Copy", photo: "https://live.test/a.jpg" },
    delta_differ: { name: "Delta Differ", photo: "https://live.test/d.jpg" },
  };
  const l = planLive(live, SRC, "  (function () {\n    var BROWSE_PHOTOS = {\n    };\n    try { window.BROWSE_PHOTOS = BROWSE_PHOTOS; } catch (e) {}\n  })();\n");
  eq(JSON.stringify(l.verdict.copy), JSON.stringify([{ pid: "a_copy", url: "https://live.test/a.jpg" }]), "empty field, search face → copied");
  eq(l.verdict.differ.length, 1, "one disagreement");
  const d = l.verdict.differ[0] || {};
  eq(d.pid, "d_differ", "…on d_differ");
  eq(d.roster, "https://roster.test/d.jpg", "…with the field's URL");
  eq(d.card, "https://live.test/d.jpg", "…and the search URL");
  eq(JSON.stringify(l.verdict.neither), JSON.stringify(["n_none"]), "neither → nothing");
  const w = { window: {} }; w.window = w;
  vm.runInContext(l.CMP2, vm.createContext(w));
  eq(w.CMP_DATA.d_differ.photo, "https://roster.test/d.jpg", "d_differ's field was NOT overwritten");
  no(l.CMP2, "https://live.test/d.jpg", "the other URL was written nowhere");
  eq(w.CMP_DATA.n_none.photo, undefined, "n_none keeps the mark");
  const text = liveReportText(l, "fixture");
  has(text, "| d_differ | https://roster.test/d.jpg | cmp-data.js | https://live.test/d.jpg |", "the report lists the pid and both URLs");
  has(text, "Both had one and they differ — not picked, field left as it was: 1", "…and counts it");
  ok(withLiveReport(withLiveReport("# r\n", text), text).split(LIVE_OPEN).length === 2, "re-writing the section replaces it, never duplicates it");

  // On disk: the live run's disagreement, and its field left as it was.
  const rep = R(REPORT);
  has(rep, "| teuscher_h44 | https://le.utah.gov/images/legislator/TEUSCHJ.jpg | cmp-data.js | https://le.utah.gov/images/legislator/TEUSCJ.jpg |",
    "PORTRAIT_SWEEP.md lists teuscher_h44 with both URLs");
  eq(rosterRow("teuscher_h44").photo, "https://le.utah.gov/images/legislator/TEUSCHJ.jpg", "teuscher_h44's field was not overwritten");
  no(R("cmp-data.js"), "TEUSCJ.jpg", "the search URL for teuscher_h44 landed nowhere in the roster");
  has(rep, "- `lisonbee_h14` — " + LISONK, "the report names Lisonbee's copy");
  has(rep, "copied onto the field: 22", "the copy count");
  has(rep, "the row's own mark stays: 319", "the no-portrait count");
  has(rep, "`politicians/klisonbee`", "the report names the store");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · a mutation that leaves search on its old reader fails");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The property: for a roster pid, search paints what the file and board
  // paint. Checked on the world where the field is empty and only an alias
  // document has a face — the shape of the reported defect.
  const agrees = (photoFor) => {
    const opts = { before: true, photoFor };
    const f = fileFace("lisonbee_h14", { before: true });
    const b = boardFace("ut-hd-14", "lisonbee_h14", { before: true });
    const s = searchFace("lisonbee_h14", opts);
    return f === b && b === s;
  };
  ok(agrees(PHOTO_FOR), "the shipped search row agrees with the file and the board");
  ok(!agrees(OLD_PHOTO_FOR), "the old search row (_getPhotoUrl only) is caught disagreeing");
  // Every other way of staying on the old map.
  const mutants = [
    PHOTO_FOR.replace("window.pdxPortrait(id) || ''", "window._getPhotoUrl(id) || ''"),
    PHOTO_FOR.replace("typeof window.pdxPortrait === 'function'", "false"),
    PHOTO_FOR.replace(/if \(onRoster[^\n]*\n/, "\n"),
  ];
  mutants.forEach((m, i) => {
    ok(m !== PHOTO_FOR, `mutant ${i + 1} actually changed the source`);
    ok(!agrees(m), `mutant ${i + 1} (search left on _getPhotoUrl) fails`);
  });
  has(PHOTO_FOR, "window.pdxPortrait(id)", "photoFor asks pdxPortrait");
  no(PHOTO_FOR, "BROWSE_PHOTOS", "photoFor reads no map of its own");
  no(PHOTO_FOR, "PROFILES", "…and no live table directly: pdxPortrait owns that read");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the homepage loads the reader, and the shell moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  const s = R("index.html");
  const rp = s.indexOf('<script src="/roster-portrait.js"></script>');
  const eye = s.indexOf('<script src="/all-seeing-eye.js"></script>');
  ok(rp > 0 && rp < eye, "index.html loads roster-portrait.js before all-seeing-eye.js");
  const sw = R("sw.js");
  has(sw, "const CACHE_VERSION = 'v295';", "the service worker moved one version");
  has(sw, "'/roster-portrait.js',", "the reader is precached");
}

report();
