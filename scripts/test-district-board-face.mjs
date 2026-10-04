#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-district-board-face.mjs — band 1 paints the person file's face
// ─────────────────────────────────────────────────────────────────────────────
// A district board's seat band names the sitting member and links /p/<pid>. It
// now paints the portrait the person file paints for that same pid, through the
// one band renderer every board uses (district-board.js's seatHtml()).
//
// WHAT THIS SUITE PROVES:
//   1. The resolver band 1 reads on a board is ballot-breakdown.js's
//      _getPhotoUrl, copied verbatim — one changed byte in either copy fails.
//   2. UT-2 paints Maloy's existing portrait and still links /p/maloy.
//   3. A pid with no portrait paints the roster row's mark (🏛), no <img>.
//   4. HD-29 and ut-gov paint through the same renderer, same markup shape.
//   5. EVERY board's face is the person file's answer for its pid, and a
//      mutation that points the image elsewhere is caught by that check.
//   6. Where the document carries window._getPhotoUrl, band 1 asks it.
//   7. A seat with no member on file has no face and no empty frame.
//   8. The name never waits: it is in the same markup, the img is sized.
//   9. Every board document loads the two data files before the module.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

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
  console.log(`\n   ✓ district board face: all ${passed} assertions passed`);
}
const must = (c, m) => { if (!c) { failures.push(`FIXTURE: ${m}`); report(); } else passed++; };

const MOD = R("district-board.js");
const BB = R("ballot-breakdown.js");
const NAMES = ["_photoUnder", "_photoSlug", "_photoKeys", "_getPhotoUrl"];

// Lift one function declaration by brace-matching from its `function name(`.
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
const norm = (s) => s.split("\n").map((l) => l.replace(/^\s+/, "")).join("\n");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the board's resolver is the person file's, byte for byte");
// ═════════════════════════════════════════════════════════════════════════════
for (const n of NAMES) {
  const a = lift(BB, n), b = lift(MOD, n);
  must(a, `ballot-breakdown.js no longer declares ${n}()`);
  must(b, `district-board.js no longer carries its copy of ${n}()`);
  eq(norm(b), norm(a), `${n}(): district-board.js's copy differs from ballot-breakdown.js's`);
}
// In a closure, so the lifted declarations do not land on the sandbox's global
// as window._getPhotoUrl — band 1 must be seen answering through its own copy.
const OWNER = "(function () {\n" + NAMES.map((n) => lift(BB, n)).join("\n") +
  "\nwindow.__ownerPhotoUrl = _getPhotoUrl;\n})();";
no(MOD, "BROWSE_PHOTOS = {", "district-board.js declares no photo table of its own");
ok(!/https?:\/\/[^'"\s]*\.(?:jpe?g|png|webp)/i.test(MOD), "district-board.js holds no image address");

// ═════════════════════════════════════════════════════════════════════════════
// The board, booted the way its document boots it.
// ═════════════════════════════════════════════════════════════════════════════
function boot(alias, { join = false, mod = MOD, owner = false, data = true } = {}) {
  const win = makeSandbox();
  win.__PDX_DISTRICT_BOARD_SEAT = alias;
  const ctx = vm.createContext(win);
  const files = ["cmp-data.js"];
  if (data) files.push("browse-photos.js", "profile-alias.js");
  files.push("issue-map.js");
  if (join) files.push("voter-hub-location.js");
  for (const f of files) vm.runInContext(R(f), ctx, { filename: f });
  // The person file's resolver, run in the same sandbox over the same tables,
  // published under a name band 1 never reads unless `owner` hands it over.
  vm.runInContext(OWNER, ctx, { filename: "ballot-breakdown.js[_getPhotoUrl]" });
  if (owner) win._getPhotoUrl = win.__ownerPhotoUrl;
  else must(typeof win._getPhotoUrl !== "function", `${alias}: the fixture leaked a _getPhotoUrl onto the board`);
  vm.runInContext(mod, ctx, { filename: "district-board.js" });
  const M = win.PDXDistrictBoard;
  must(M && typeof M.seatHtml === "function", `${alias}: the module did not publish seatHtml`);
  return { win, M, html: M.seatHtml(), person: (pid) => String(win.__ownerPhotoUrl(pid) || "") };
}
const srcOf = (html) => {
  const m = /<img class="pdxdb-seat-photo" src="([^"]*)"/.exec(html);
  return m ? m[1].replace(/&amp;/g, "&") : "";
};
const countOf = (html, s) => String(html).split(s).length - 1;

// ═════════════════════════════════════════════════════════════════════════════
section("2 · UT-2 paints Maloy's existing portrait and links /p/maloy");
// ═════════════════════════════════════════════════════════════════════════════
{
  const { M, html, win, person } = boot("ut-cd-2", { join: true });
  eq(M.PID, "maloy", "ut-cd-2: the join names Maloy");
  const face = win.BROWSE_PHOTOS.maloy;
  must(face, "browse-photos.js has no maloy portrait to paint");
  eq(person("maloy"), face, "the person file's resolver answers the curated portrait for maloy");
  eq(srcOf(html), face, "ut-cd-2: band 1's <img> is Maloy's existing portrait");
  has(html, 'data-pdxdb-face="photo"', "ut-cd-2: the face slot says it holds a photo");
  has(html, '<a class="pdxdb-seat-link" href="/p/maloy"', "ut-cd-2: the name still links /p/maloy");
  has(html, '<a class="pdxdb-seat-face" href="/p/maloy"', "ut-cd-2: the face links the same record");
  has(html, ">Celeste Maloy</a>", "ut-cd-2: the name is printed");
  has(html, '<p class="pdxdb-seat-office">U.S. Representative</p>', "ut-cd-2: the roster's office string");
  eq(countOf(html, "<img"), 1, "ut-cd-2: one image in band 1");
  no(html, "data-party", "ut-cd-2: no party");
  ok(!/\b(score|kept|broken|pending)\b/i.test(html), "ut-cd-2: no record figures");
  ok(html.length < 1200, `ut-cd-2: band 1 is a seat, not a dossier (${html.length} chars)`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · a pid with no portrait paints the building mark");
// ═════════════════════════════════════════════════════════════════════════════
{
  const { M, html, person, win } = boot("ut-sd-3");
  eq(M.PID, "john_johnson", "ut-sd-3: the holder");
  eq(person("john_johnson"), "", "the person file has no portrait for john_johnson (fixture)");
  eq(win.CMP_DATA.john_johnson.icon, "🏛", "the roster row's mark is the building");
  no(html, "<img", "ut-sd-3: no <img> for a pid with no portrait");
  has(html, 'data-pdxdb-face="mark"', "ut-sd-3: the face slot says it holds the mark");
  has(html, '<span class="pdxdb-seat-mark">🏛</span>', "ut-sd-3: the building mark is painted");
  has(html, 'href="/p/john_johnson"', "ut-sd-3: still linked to the record");
  has(html, ">John Johnson</a>", "ut-sd-3: the name is printed");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · HD-29 and ut-gov paint through the same renderer");
// ═════════════════════════════════════════════════════════════════════════════
{
  const hd = boot("ut-hd-29");
  const gov = boot("ut-gov");
  eq(hd.M.PID, "bolinder_h68", "ut-hd-29: the holder");
  eq(gov.M.PID, "cox", "ut-gov: the holder");
  for (const [alias, b] of [["ut-hd-29", hd], ["ut-gov", gov]]) {
    const pid = b.M.PID;
    const want = b.person(pid);
    eq(srcOf(b.html), want, `${alias}: the face is the person file's answer for ${pid}`);
    has(b.html, '<div class="pdxdb-seat-id"><a class="pdxdb-seat-face" href="/p/' + pid + '"',
      `${alias}: the same face-then-name shape`);
    has(b.html, '<a class="pdxdb-seat-link" href="/p/' + pid + '"', `${alias}: the name links the record`);
    has(b.html, '<p class="pdxdb-seat-office">' + b.win.CMP_DATA[pid].office + "</p>", `${alias}: the roster's office`);
    has(b.html, 'data-pdxdb-face="' + (want ? "photo" : "mark") + '"', `${alias}: the face slot's state`);
  }
  ok(!!gov.person("cox"), "ut-gov: the governor has a portrait on file (fixture)");
  eq(srcOf(gov.html), gov.win.BROWSE_PHOTOS.cox, "ut-gov: Cox's existing portrait");
  // ONE RENDERER: both boards are the same module's seatHtml, so stripping the
  // per-seat facts leaves the same skeleton.
  const skel = (h) => h.replace(/<img[^>]*>|<span class="pdxdb-seat-mark">[^<]*<\/span>/g, "FACE")
    .replace(/href="[^"]*"|data-pdxdb-face="\w+"|>[^<]+</g, "");
  eq(skel(hd.html), skel(gov.html), "ut-hd-29 and ut-gov are one band's markup");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · every board's face is the person file's, and a wrong one is caught");
// ═════════════════════════════════════════════════════════════════════════════
function checkAll(mod) {
  const bad = [];
  const probe = boot("ut-sd-3", { mod });
  const BOARDS = probe.M.BOARDS;
  let photos = 0, marks = 0;
  for (const k of Object.keys(BOARDS)) {
    const b = BOARDS[k];
    const r = boot(b.alias, { join: !!b.usHouse, mod });
    const pid = r.M.PID;
    if (!pid) { bad.push(`${b.alias}: no holder`); continue; }
    const want = r.person(pid);
    const got = srcOf(r.html);
    if (got !== want) bad.push(`${b.alias} (${pid}): band 1 paints ${JSON.stringify(got)}, the person file ${JSON.stringify(want)}`);
    if (want) photos++;
    else {
      marks++;
      const mark = String(r.win.CMP_DATA[pid].icon || "🏛");
      if (r.html.indexOf(`<span class="pdxdb-seat-mark">${mark}</span>`) < 0) bad.push(`${b.alias}: no mark ${mark}`);
    }
    if (r.html.indexOf(`<a class="pdxdb-seat-link" href="/p/${pid}"`) < 0) bad.push(`${b.alias}: name not linked /p/${pid}`);
  }
  return { bad, photos, marks, n: Object.keys(BOARDS).length };
}
{
  const { bad, photos, marks, n } = checkAll(MOD);
  for (const m of bad) failures.push(m);
  ok(n >= 88, `all boards walked (${n})`);
  ok(photos > 20 && marks > 20, `both shapes are exercised (${photos} photos, ${marks} marks)`);
  // The alias hop is the part a plain map lookup gets wrong — pin the two seats
  // whose face is filed under another key.
  for (const [alias, pid] of [["ut-hd-44", "teuscher_h44"], ["ut-sd-18", "mccay_s11"]]) {
    const r = boot(alias);
    eq(r.M.PID, pid, `${alias}: the holder`);
    ok(!!srcOf(r.html) && srcOf(r.html) === r.person(pid), `${alias}: the face crosses the alias hop`);
  }
}
{
  // MUTATIONS. Each points band 1's image somewhere the person file does not
  // look; the check above must fail on every one.
  const MUTANTS = [
    ["a composed address", (s) => s.replace("var face = faceUrl(pid);",
      "var face = 'https://bioguide.congress.gov/bioguide/photo/X/' + pid + '.jpg';")],
    ["the copied resolver skips the curated tier", (s) => s.replace(/\n *if \([^\n]*BROWSE_PHOTOS\[key\]\) return [^\n]*BROWSE_PHOTOS\[key\];/g, "")],
    ["the copied resolver drops the alias hop", (s) => s.replace(
      "u = fn(window._getPhotoUrl) ? window._getPhotoUrl(pid) : _getPhotoUrl(pid);",
      "u = (window.BROWSE_PHOTOS || {})[pid] || '';")],
    ["another person's face", (s) => s.replace("var face = faceUrl(pid);", "var face = faceUrl('lee');")],
  ];
  for (const [label, mut] of MUTANTS) {
    const m = mut(MOD);
    must(m !== MOD, `mutation "${label}" did not apply — the source moved`);
    ok(checkAll(m).bad.length > 0, `mutation "${label}" survived the face check`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · where the document carries _getPhotoUrl, band 1 asks it");
// ═════════════════════════════════════════════════════════════════════════════
{
  const r = boot("ut-cd-2", { join: true, owner: true, data: false });
  // No browse-photos.js here: only the owner can answer, and it answers ''
  // without its tables — so band 1 must paint the mark, not invent a face.
  no(r.html, "<img", "owner present, no portrait tables: no image");
  const w = makeSandbox();
  w.__PDX_DISTRICT_BOARD_SEAT = "ut-hd-16";
  const ctx = vm.createContext(w);
  vm.runInContext(R("cmp-data.js"), ctx, { filename: "cmp-data.js" });
  const asked = [];
  w._getPhotoUrl = (pid) => { asked.push(pid); return "https://example.test/owner/" + pid + ".jpg"; };
  vm.runInContext(MOD, ctx, { filename: "district-board.js" });
  const html = w.PDXDistrictBoard.seatHtml();
  ok(asked.indexOf("tlee") >= 0, "ut-hd-16: band 1 asked window._getPhotoUrl for tlee");
  eq(srcOf(html), "https://example.test/owner/tlee.jpg", "ut-hd-16: band 1 paints the owner's answer");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · a seat with no member on file gets no face and no frame");
// ═════════════════════════════════════════════════════════════════════════════
{
  const { M, html } = boot("ut-cd-2", { join: false });
  eq(M.PID, "", "ut-cd-2 without the join: nobody");
  has(html, 'data-pdxdb-seat-state="nobody"', "ut-cd-2 without the join: the nobody sentence");
  no(html, "<img", "nobody: no image");
  no(html, "pdxdb-seat-face", "nobody: no face frame");
  no(html, "pdxdb-seat-mark", "nobody: no mark");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the name never waits on the image");
// ═════════════════════════════════════════════════════════════════════════════
{
  const { html } = boot("ut-cd-2", { join: true });
  const img = (/<img[^>]*>/.exec(html) || [""])[0];
  has(img, 'width="56" height="56"', "the image is sized, so the name never moves");
  has(img, 'decoding="async"', "the image decodes off the paint");
  has(img, 'alt=""', "the face is decorative beside the printed name");
  has(html, 'tabindex="-1" aria-hidden="true"', "the face link is one record, not a second tab stop");
  // The error swap: one capture listener, remembering the dead address.
  has(MOD, "el.addEventListener('error', function (ev) {", "a failed portrait is swapped for the mark");
  has(MOD, "_deadFaces[String(t.getAttribute('src') || '')] = 1;", "…and is not asked again on repaint");
  has(R("district-board.css"), ".pdxdb-seat-face {", "district-board.css styles the face");
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · every board document loads the face's tables before the module");
// ═════════════════════════════════════════════════════════════════════════════
{
  const docs = readdirSync(ROOT).filter((f) => /^district-ut-.*\.html$/.test(f));
  ok(docs.length >= 88, `board documents found (${docs.length})`);
  for (const f of docs) {
    const s = R(f);
    const at = (src) => s.indexOf(`<script defer src="${src}"></script>`);
    const db = at("/district-board.js");
    ok(db > 0, `${f}: loads district-board.js`);
    ok(at("/browse-photos.js") > 0 && at("/browse-photos.js") < db, `${f}: browse-photos.js before the module`);
    ok(at("/profile-alias.js") > 0 && at("/profile-alias.js") < db, `${f}: profile-alias.js before the module`);
    ok(at("/cmp-data.js") > 0 && at("/cmp-data.js") < at("/browse-photos.js"), `${f}: the roster first`);
    no(s, 'src="/ballot-breakdown.js"', `${f}: does not load the ballot desk for a face`);
  }
}

report();
