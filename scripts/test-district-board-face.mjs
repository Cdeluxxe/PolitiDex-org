#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-district-board-face.mjs — band 1 paints the roster field's portrait
// ─────────────────────────────────────────────────────────────────────────────
// A district board's seat band names the sitting member, prints the roster's
// office string and links /p/<pid>. Its face is the person's ONE portrait: the
// roster field `photo`, read through window.pdxPortrait (roster-portrait.js),
// which the person file and the homepage record card read too. Every board
// paints through the one band renderer (district-board.js's seatHtml()).
//
// WHAT THIS SUITE PROVES:
//   1. district-board.js holds no photo table, no resolver and no address; it
//      asks window.pdxPortrait and nothing else.
//   2. UT-2 paints the portrait the homepage card already had for Maloy, which
//      is now her roster field, and still links /p/maloy.
//   3. A pid with no portrait anywhere paints the roster row's mark (🏛).
//   4. HD-29 and ut-gov paint through the same renderer, same markup shape.
//   5. EVERY board's face is its pid's roster field, and a mutation that points
//      the image at a URL the roster field does not hold fails that check.
//   6. Without roster-portrait.js a board paints the mark, never a guess.
//   7. A seat with no member on file has no face and no empty frame.
//   8. The name never waits: it is in the same markup, the img is sized.
//   9. Every board document loads roster-portrait.js before the module, and
//      no photo table.
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
// The homepage card's portrait for Maloy before the sweep moved it onto her
// roster row (browse-photos.js `maloy`). Written down so "the portrait the card
// already had" is a fixed string, not whatever the tree says today.
const MALOY_CARD = "https://bioguide.congress.gov/bioguide/photo/M/M001228.jpg";

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the board reads the roster field and holds nothing of its own");
// ═════════════════════════════════════════════════════════════════════════════
no(MOD, "BROWSE_PHOTOS", "district-board.js does not read the curated map");
no(MOD, "function _getPhotoUrl", "district-board.js carries no resolver of its own");
no(MOD, "_photoUnder", "…not even a copy of one");
has(MOD, "fn(window.pdxPortrait) ? window.pdxPortrait(pid) : ''", "band 1 asks window.pdxPortrait");
ok(!/https?:\/\/[^'"\s]*\.(?:jpe?g|png|webp)/i.test(MOD), "district-board.js holds no image address");

// ═════════════════════════════════════════════════════════════════════════════
// The board, booted the way its document boots it.
// ═════════════════════════════════════════════════════════════════════════════
function boot(alias, { join = false, mod = MOD, reader = true, profiles = null } = {}) {
  const win = makeSandbox();
  win.__PDX_DISTRICT_BOARD_SEAT = alias;
  if (profiles) win.PROFILES = profiles;
  const ctx = vm.createContext(win);
  const files = ["cmp-data.js"];
  if (reader) files.push("roster-portrait.js");
  files.push("issue-map.js");
  if (join) files.push("voter-hub-location.js");
  for (const f of files) vm.runInContext(R(f), ctx, { filename: f });
  must(typeof win._getPhotoUrl !== "function", `${alias}: a board carries no _getPhotoUrl`);
  vm.runInContext(mod, ctx, { filename: "district-board.js" });
  const M = win.PDXDistrictBoard;
  must(M && typeof M.seatHtml === "function", `${alias}: the module did not publish seatHtml`);
  const field = (pid) => {
    const live = win.PROFILES && win.PROFILES[pid] && String(win.PROFILES[pid].photo || "").trim();
    return live || String((win.CMP_DATA[pid] && win.CMP_DATA[pid].photo) || "").trim();
  };
  return { win, M, html: M.seatHtml(), field };
}
const srcOf = (html) => {
  const m = /<img class="pdxdb-seat-photo" src="([^"]*)"/.exec(html);
  return m ? m[1].replace(/&amp;/g, "&") : "";
};
const countOf = (html, s) => String(html).split(s).length - 1;

// ═════════════════════════════════════════════════════════════════════════════
section("2 · UT-2 paints the portrait the card already had, and links /p/maloy");
// ═════════════════════════════════════════════════════════════════════════════
{
  const { M, html, win, field } = boot("ut-cd-2", { join: true });
  eq(M.PID, "maloy", "ut-cd-2: the join names Maloy");
  eq(win.CMP_DATA.maloy.photo, MALOY_CARD, "Maloy's roster field holds the card's portrait");
  eq(field("maloy"), MALOY_CARD, "…and it is her one portrait");
  eq(srcOf(html), MALOY_CARD, "ut-cd-2: band 1's <img> is that portrait");
  has(html, 'data-pdxdb-face="photo"', "ut-cd-2: the face slot says it holds a photo");
  has(html, '<a class="pdxdb-seat-link" href="/p/maloy"', "ut-cd-2: the name still links /p/maloy");
  has(html, '<a class="pdxdb-seat-face" href="/p/maloy"', "ut-cd-2: the face links the same record");
  has(html, ">Celeste Maloy</a>", "ut-cd-2: the name is printed");
  has(html, '<p class="pdxdb-seat-office">U.S. Representative</p>', "ut-cd-2: the roster's office string");
  eq(countOf(html, "<img"), 1, "ut-cd-2: one image in band 1");
  no(html, "data-party", "ut-cd-2: no party");
  ok(!/\b(score|kept|broken|pending|bio)\b/i.test(html), "ut-cd-2: no record figures, no bio");
  ok(html.length < 1200, `ut-cd-2: band 1 is a seat, not a dossier (${html.length} chars)`);
}
{
  // THE LIVE RECORD OUTRANKS THE BUNDLED ROW, as it does on the person file.
  const live = "https://bioguide.congress.gov/bioguide/photo/M/M001228-live.jpg";
  const { html } = boot("ut-cd-2", { join: true, profiles: { maloy: { name: "Celeste Maloy", photo: live } } });
  eq(srcOf(html), live, "ut-cd-2: a live roster photo is the field band 1 paints");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · a pid with no portrait anywhere paints the building mark");
// ═════════════════════════════════════════════════════════════════════════════
{
  const { M, html, win, field } = boot("ut-sd-3");
  eq(M.PID, "john_johnson", "ut-sd-3: the holder");
  eq(field("john_johnson"), "", "john_johnson has no roster portrait (fixture)");
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
    const want = b.field(pid);
    eq(srcOf(b.html), want, `${alias}: the face is ${pid}'s roster field`);
    has(b.html, '<div class="pdxdb-seat-id"><a class="pdxdb-seat-face" href="/p/' + pid + '"',
      `${alias}: the same face-then-name shape`);
    has(b.html, '<a class="pdxdb-seat-link" href="/p/' + pid + '"', `${alias}: the name links the record`);
    has(b.html, '<p class="pdxdb-seat-office">' + b.win.CMP_DATA[pid].office + "</p>", `${alias}: the roster's office`);
    has(b.html, 'data-pdxdb-face="' + (want ? "photo" : "mark") + '"', `${alias}: the face slot's state`);
    no(b.html, "data-party", `${alias}: no party`);
  }
  ok(!!gov.field("cox"), "ut-gov: the governor's roster row carries a portrait (fixture)");
  const skel = (h) => h.replace(/<img[^>]*>|<span class="pdxdb-seat-mark">[^<]*<\/span>/g, "FACE")
    .replace(/href="[^"]*"|data-pdxdb-face="\w+"|>[^<]+</g, "");
  eq(skel(hd.html), skel(gov.html), "ut-hd-29 and ut-gov are one band's markup");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · every board's face is the roster field, and a wrong one is caught");
// ═════════════════════════════════════════════════════════════════════════════
function checkAll(mod) {
  const bad = [];
  const BOARDS = boot("ut-sd-3", { mod }).M.BOARDS;
  let photos = 0, marks = 0;
  for (const k of Object.keys(BOARDS)) {
    const b = BOARDS[k];
    const r = boot(b.alias, { join: !!b.usHouse, mod });
    const pid = r.M.PID;
    if (!pid) { bad.push(`${b.alias}: no holder`); continue; }
    const want = r.field(pid);
    const got = srcOf(r.html);
    if (got !== want) bad.push(`${b.alias} (${pid}): band 1 paints ${JSON.stringify(got)}, the roster field holds ${JSON.stringify(want)}`);
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
  // The two seats whose face used to be filed under another key now hold it on
  // their own row, so the board needs no alias hop to find it.
  for (const [alias, pid] of [["ut-hd-44", "teuscher_h44"], ["ut-sd-18", "mccay_s11"]]) {
    const r = boot(alias);
    eq(r.M.PID, pid, `${alias}: the holder`);
    ok(!!r.win.CMP_DATA[pid].photo && srcOf(r.html) === r.win.CMP_DATA[pid].photo, `${alias}: the face is on ${pid}'s own row`);
  }
}
{
  // MUTATIONS. Each points band 1's image at a URL the roster field does not
  // hold; the check above must fail on every one.
  const MUTANTS = [
    ["a composed address", (s) => s.replace("var face = faceUrl(pid);",
      "var face = 'https://bioguide.congress.gov/bioguide/photo/X/' + pid + '.jpg';")],
    ["the curated map instead of the field", (s) => s.replace(
      "try { u = fn(window.pdxPortrait) ? window.pdxPortrait(pid) : ''; } catch (e) { u = ''; }",
      "try { u = (window.BROWSE_PHOTOS || {})[pid] || 'https://upload.wikimedia.org/x/' + pid + '.jpg'; } catch (e) { u = ''; }")],
    ["the field's URL with a cache-buster appended", (s) => s.replace(
      "try { u = fn(window.pdxPortrait) ? window.pdxPortrait(pid) : ''; } catch (e) { u = ''; }",
      "try { u = (window.CMP_DATA[pid] || {}).photo || ''; if (u) u = u + '?v=2'; } catch (e) { u = ''; }")],
    ["another person's face", (s) => s.replace("var face = faceUrl(pid);", "var face = faceUrl('lee');")],
  ];
  for (const [label, mut] of MUTANTS) {
    const m = mut(MOD);
    must(m !== MOD, `mutation "${label}" did not apply — the source moved`);
    ok(checkAll(m).bad.length > 0, `mutation "${label}" survived the face check`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · without the reader, a board paints the mark, never a guess");
// ═════════════════════════════════════════════════════════════════════════════
{
  const r = boot("ut-cd-2", { join: true, reader: false });
  eq(r.M.PID, "maloy", "ut-cd-2: the holder still resolves");
  no(r.html, "<img", "no roster-portrait.js: no image");
  has(r.html, '<span class="pdxdb-seat-mark">🏛</span>', "no roster-portrait.js: the mark");
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
  has(MOD, "el.addEventListener('error', function (ev) {", "a failed portrait is swapped for the mark");
  has(MOD, "_deadFaces[String(t.getAttribute('src') || '')] = 1;", "…and is not asked again on repaint");
  has(R("district-board.css"), ".pdxdb-seat-face {", "district-board.css styles the face");
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · every board document loads the reader, and no photo table");
// ═════════════════════════════════════════════════════════════════════════════
{
  const docs = readdirSync(ROOT).filter((f) => /^district-ut-.*\.html$/.test(f));
  ok(docs.length >= 88, `board documents found (${docs.length})`);
  for (const f of docs.concat(["scripts/district-board.template.html"])) {
    const s = R(f);
    const at = (src) => s.indexOf(`<script defer src="${src}"></script>`);
    const db = at("/district-board.js");
    ok(db > 0, `${f}: loads district-board.js`);
    ok(at("/roster-portrait.js") > 0 && at("/roster-portrait.js") < db, `${f}: roster-portrait.js before the module`);
    ok(at("/cmp-data.js") > 0 && at("/cmp-data.js") < at("/roster-portrait.js"), `${f}: the roster first`);
    no(s, 'src="/browse-photos.js"', `${f}: no photo table`);
    no(s, 'src="/ballot-breakdown.js"', `${f}: does not load the ballot desk for a face`);
  }
}

report();
