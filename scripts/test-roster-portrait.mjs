#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-roster-portrait.mjs — one portrait per person, and every surface reads it
// ─────────────────────────────────────────────────────────────────────────────
// The homepage record card painted Ro Khanna's face from BROWSE_PHOTOS; his
// person file read the roster field `photo`, which was empty, and painted 🏭.
// scripts/sweep-roster-portraits.mjs moved every card portrait a roster row
// could hold onto that row, and roster-portrait.js (window.pdxPortrait) is the
// one reader the person file, district-board band 1 and the card ask.
//
// WHAT THIS SUITE PROVES:
//   1. The owner: pdxPortrait reads PROFILES[pid].photo, then CMP_DATA[pid].photo,
//      and nothing else — the same two tiers _getPhotoUrl opens with.
//   2. The card stops carrying its own: no BROWSE_PHOTOS key is reachable from a
//      roster row, and the sweep would move nothing more.
//   3. Khanna's file and the UT-2 board paint the portrait the card already had;
//      the card paints it too, now from the roster field.
//   4. A pid with no portrait anywhere still paints its mark on the file and the
//      board, and the card paints no face.
//   5. The sweep's four cases, on a fixture: a pid whose two portraits differ is
//      in the report with both URLs and its roster field is NOT overwritten.
//   6. The report on disk names the disagreements (none in the bundled roster)
//      and every map key kept.
//   7. person.html and index.html load the reader.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import {
  classify, writeRosterPhotos, reportText, resolverSource, parseBrowse, REPORT,
} from "./sweep-roster-portraits.mjs";

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
  console.log(`\n   ✓ roster portrait: all ${passed} assertions passed`);
}
const must = (c, m) => { if (!c) { failures.push(`FIXTURE: ${m}`); report(); } else passed++; };

// The homepage card's portraits BEFORE the sweep (browse-photos.js `khanna` and
// `maloy`), written down so "the portrait the card already had" is fixed.
const KHANNA_CARD = "https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000389.jpg";
const MALOY_CARD = "https://bioguide.congress.gov/bioguide/photo/M/M001228.jpg";

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
// A document's world: the roster, the reader, and (for the homepage) the map,
// the alias tables and the card's resolver.
function page({ home = false, reader = true, profiles = null } = {}) {
  const w = makeSandbox();
  if (profiles) w.PROFILES = profiles;
  const ctx = vm.createContext(w);
  vm.runInContext(R("cmp-data.js"), ctx, { filename: "cmp-data.js" });
  if (reader) vm.runInContext(R("roster-portrait.js"), ctx, { filename: "roster-portrait.js" });
  if (home) {
    vm.runInContext(R("browse-photos.js"), ctx, { filename: "browse-photos.js" });
    vm.runInContext(R("profile-alias.js"), ctx, { filename: "profile-alias.js" });
    vm.runInContext(aliasSource(), ctx, { filename: "stance-helpers.js[aliases]" });
    vm.runInContext(resolverSource().replace("window.__photo = _getPhotoUrl;", "window._getPhotoUrl = _getPhotoUrl;"),
      ctx, { filename: "ballot-breakdown.js[_getPhotoUrl]" });
  }
  return { w, ctx };
}
// THE PERSON FILE'S LETTERHEAD, run from its own source: the `_hp` expression
// and the fallback it paints, lifted out of profiles-full.js.
const PF = R("profiles-full.js");
const HP = (/var _hp = ([^;]+);/.exec(PF) || [])[1];
must(HP, "profiles-full.js no longer computes the letterhead photo as `var _hp = …;`");
has(PF, "`<div class=\"ph-fallback\">${p.icon}</div>`", "the letterhead's fallback is still the record's own icon");
function letterhead(env, id, p) {
  env.w.__id = id; env.w.__p = p;
  return String(vm.runInContext(`(function (id, p) { return ${HP}; })(window.__id, window.__p)`, env.ctx) || "");
}
// THE HOMEPAGE RECORD CARD, run from its own source.
const HS = R("hero-showcase.js");
const FACE = lift(HS, "faceHtml");
must(FACE, "hero-showcase.js no longer declares faceHtml()");
function card(env, pid, name) {
  vm.runInContext("function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/\"/g,'&quot;').replace(/</g,'&lt;');}\n" +
    FACE + "\nwindow.__face = faceHtml;", env.ctx);
  const html = env.w.__face({ pid, name });
  const m = /src="\/\.netlify\/images\?url=([^&"]+)/.exec(html);
  return { html, url: m ? decodeURIComponent(m[1]) : "" };
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the owner is the roster field, and pdxPortrait reads only it");
// ═════════════════════════════════════════════════════════════════════════════
{
  const RP = R("roster-portrait.js");
  no(RP, "BROWSE_PHOTOS", "roster-portrait.js reads no curated map");
  ok(!/https?:\/\//.test(RP.replace(/\/\*[\s\S]*?\*\//g, "")), "roster-portrait.js holds no address");
  const env = page({ profiles: { khanna: { name: "Ro Khanna", photo: "https://live.test/k.jpg" }, tlee: { name: "Trevor Lee", photo: "" } } });
  eq(env.w.pdxPortrait("khanna"), "https://live.test/k.jpg", "a live record's photo outranks the bundled row");
  eq(env.w.pdxPortrait("tlee"), env.w.CMP_DATA.tlee.photo, "an empty live photo falls to the bundled row");
  eq(env.w.pdxPortrait("john_johnson"), "", "no portrait on either tier is ''");
  eq(env.w.pdxPortrait(""), "", "no pid is ''");
  eq(env.w.pdxPortraitMark("khanna"), "🏭", "the mark is the row's own icon");
  // _getPhotoUrl opens with the same two tiers, in the same order.
  const under = lift(R("ballot-breakdown.js"), "_photoUnder");
  ok(under.indexOf("window.PROFILES[key]") < under.indexOf("CMP_DATA[key]") &&
     under.indexOf("CMP_DATA[key]") < under.indexOf("BROWSE_PHOTOS[key]"),
     "_getPhotoUrl reads PROFILES, then CMP_DATA, before the map");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the card stops carrying its own");
// ═════════════════════════════════════════════════════════════════════════════
{
  const env = page({ home: true });
  const BP = env.w.BROWSE_PHOTOS;
  const D = env.w.CMP_DATA;
  const keyed = Object.keys(parseBrowse(R("browse-photos.js")));
  eq(keyed.length, Object.keys(BP).length, "the map parses in the shape the audit scripts read");
  ok(keyed.length <= 20, `the map holds only people with no roster row (${keyed.length})`);
  for (const k of keyed) ok(!D[k], `${k}: a roster row exists, so its face belongs on the row, not in the map`);
  // No roster pid reaches a map key through any alias hop.
  const keysOf = vm.runInContext("(function(){" + ["_photoSlug", "_photoKeys"].map((n) => lift(R("ballot-breakdown.js"), n)).join("\n") +
    "\nreturn _photoKeys;})()", env.ctx);
  const reached = [];
  for (const pid of Object.keys(D)) for (const k of keysOf(pid)) if (BP[k]) reached.push(`${pid}→${k}`);
  eq(reached.length, 0, `no roster pid reaches the map (${reached.slice(0, 5).join(", ")})`);
  let rc = 0, out = "";
  try { out = execFileSync(process.execPath, [join(ROOT, "scripts/sweep-roster-portraits.mjs"), "--check"], { cwd: ROOT, encoding: "utf8" }); }
  catch (e) { rc = e.status || 1; out = String(e.stdout || "") + String(e.stderr || ""); }
  eq(rc, 0, `the sweep would move nothing more (${out.trim()})`);
  // Every face the homepage paints for a roster pid is that pid's roster field.
  let diff = 0;
  for (const pid of Object.keys(D)) if (String(env.w._getPhotoUrl(pid) || "") !== String(D[pid].photo || "")) diff++;
  eq(diff, 0, "for every roster pid, _getPhotoUrl answers the roster field");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · Khanna's file and the UT-2 board paint the portrait the card had");
// ═════════════════════════════════════════════════════════════════════════════
{
  // /p/khanna, the way person.html boots: the roster, the reader, no
  // _getPhotoUrl — and the live Firestore document, which carries no photo.
  const env = page({ profiles: { khanna: { name: "Ro Khanna", office: "U.S. Representative", icon: "🏭" } } });
  must(typeof env.w._getPhotoUrl !== "function", "person.html carries no _getPhotoUrl");
  eq(env.w.CMP_DATA.khanna.photo, KHANNA_CARD, "Khanna's roster field holds the card's portrait");
  eq(letterhead(env, "khanna", env.w.PROFILES.khanna), KHANNA_CARD, "/p/khanna paints the card's portrait, not 🏭");
  // …and before this pass it would not have: the old expression read p.photo.
  const OLD = "(typeof window._getPhotoUrl === 'function') ? window._getPhotoUrl(id) : (p.photo || '')";
  env.w.__p = env.w.PROFILES.khanna;
  eq(String(vm.runInContext(`(function (id, p) { return ${OLD}; })('khanna', window.__p)`, env.ctx) || ""), "",
    "the old letterhead read an empty field (the reported defect)");
  // The homepage record card, on index.html's tables.
  const home = page({ home: true });
  const c = card(home, "khanna", "Ro Khanna");
  eq(c.url, KHANNA_CARD, "the homepage card still paints Khanna's portrait");
  eq(home.w.BROWSE_PHOTOS.khanna, undefined, "…from the roster field: the map no longer has him");
  // The UT card: Maloy's board on the roster field (district-board suite pins
  // the whole band; this is the one-portrait check across surfaces).
  const b = makeSandbox();
  b.__PDX_DISTRICT_BOARD_SEAT = "ut-cd-2";
  const bctx = vm.createContext(b);
  for (const f of ["cmp-data.js", "roster-portrait.js", "issue-map.js", "voter-hub-location.js", "district-board.js"])
    vm.runInContext(R(f), bctx, { filename: f });
  has(b.PDXDistrictBoard.seatHtml(), `src="${MALOY_CARD}"`, "UT-2's band 1 paints the portrait the card had for Maloy");
  eq(card(home, "maloy", "Celeste Maloy").url, MALOY_CARD, "…and the card paints the same one");
  eq(letterhead(page(), "maloy", b.CMP_DATA.maloy), MALOY_CARD, "…and so does /p/maloy");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · a pid with no portrait anywhere still paints the mark");
// ═════════════════════════════════════════════════════════════════════════════
{
  const env = page();
  const row = env.w.CMP_DATA.john_johnson;
  eq(row.photo, undefined, "john_johnson has no roster portrait");
  eq(letterhead(env, "john_johnson", row), "", "the letterhead has no photo, so it paints ph-fallback");
  eq(row.icon, "🏛", "…and that fallback is the row's building mark");
  const home = page({ home: true });
  eq(String(home.w._getPhotoUrl("john_johnson") || ""), "", "no face anywhere for john_johnson");
  const c = card(home, "john_johnson", "John Johnson");
  no(c.html, "<img", "the card invents no face");
  // The 417 rows with nothing: no placeholder URL appeared on any of them.
  const rows = Object.values(env.w.CMP_DATA);
  ok(rows.every((r) => r.photo == null || /^https:\/\/[^\s"']+\.(?:jpe?g|png|webp)(?:\?[^\s"']*)?$/i.test(r.photo) || /^https:\/\/[^\s"']+$/.test(r.photo)),
    "every roster photo is a plain https address");
  ok(!rows.some((r) => /placeholder|silhouette|default|avatar/i.test(String(r.photo || ""))), "no placeholder address on any row");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the sweep's four cases, and a disagreement is reported, not picked");
// ═════════════════════════════════════════════════════════════════════════════
{
  const roster = { a_copy: "", b_differ: "https://roster.test/b.jpg", c_roster: "https://roster.test/c.jpg", d_none: "" };
  const cardMap = { a_copy: "https://card.test/a.jpg", b_differ: "https://card.test/b.jpg", c_roster: "", d_none: "" };
  const v = classify(roster, cardMap);
  eq(JSON.stringify(v.copy), JSON.stringify([{ pid: "a_copy", url: "https://card.test/a.jpg" }]), "card only → copied");
  eq(JSON.stringify(v.differ), JSON.stringify([{ pid: "b_differ", roster: "https://roster.test/b.jpg", card: "https://card.test/b.jpg" }]),
    "both, different → listed with both URLs");
  eq(JSON.stringify(v.rosterOnly), JSON.stringify(["c_roster"]), "roster only → nothing to move");
  eq(JSON.stringify(v.neither), JSON.stringify(["d_none"]), "neither → nothing");
  // Write the plan to a fixture roster: the differ row keeps its own photo.
  const SRC = [
    "Object.assign((window.CMP_DATA = window.CMP_DATA || {}),", "{",
    ' "a_copy": {', '  "name": "A",', '  "icon": "🏛"', " },",
    ' "b_differ": {', '  "name": "B",', '  "photo": "https://roster.test/b.jpg",', '  "icon": "🏛"', " }",
    "});",
  ].join("\n");
  const out = writeRosterPhotos(SRC, v.copy);
  const w = { window: {} }; w.window = w;
  vm.runInContext(out, vm.createContext(w));
  eq(w.CMP_DATA.a_copy.photo, "https://card.test/a.jpg", "fixture: the copy landed on a_copy");
  eq(w.CMP_DATA.b_differ.photo, "https://roster.test/b.jpg", "fixture: b_differ's roster field was NOT overwritten");
  no(out, "https://card.test/b.jpg", "fixture: the card's other portrait was written nowhere");
  const text = reportText({ verdict: v, pids: Object.keys(roster), drop: [], kept: [], entries: {} });
  has(text, "| b_differ | https://roster.test/b.jpg | https://card.test/b.jpg |", "the report lists the pid and both URLs");
  has(text, "Both had one and they differ — not picked, field left as it was: 1", "…and counts it");
  let threw = false;
  try { writeRosterPhotos(SRC, [{ pid: "a_copy", url: "javascript:alert(1)" }]); } catch (e) { threw = true; }
  ok(threw, "the sweep refuses anything but a plain https address");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the disagreements are written down");
// ═════════════════════════════════════════════════════════════════════════════
{
  must(existsSync(join(ROOT, REPORT)), `${REPORT} is missing`);
  const rep = R(REPORT);
  has(rep, "## Disagreements", "the report has a disagreements section");
  has(rep, "Both had one and they differ — not picked, field left as it was: 0", "none in the bundled roster");
  has(rep, "Card had a portrait, roster field empty — copied onto the field: 703", "the copy count");
  has(rep, "Neither had one — the row's own mark stays: 417", "the no-portrait count");
  for (const k of Object.keys(parseBrowse(R("browse-photos.js")))) has(rep, "`" + k + "`", `the report names the kept map key ${k}`);
  has(rep, "not swept", "the report says the live layer was not swept");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the documents load the reader");
// ═════════════════════════════════════════════════════════════════════════════
{
  const s = R("person.html");
  const at = s.indexOf('<script defer src="/roster-portrait.js"></script>');
  ok(at > 0 && at > s.indexOf('<script defer src="/cmp-data.js"></script>'), "person.html: roster-portrait.js after the roster");
  ok(at < s.indexOf('<script defer src="/person-file.js"></script>'), "person.html: …and before the file mounts");
  // index.html carries _getPhotoUrl, whose first two tiers ARE the roster field
  // (section 2 pins it answering the field for every roster pid), so the card
  // and the homepage letterhead read the field without a second tag.
  has(R("index.html"), '<script src="/ballot-breakdown.js"></script>', "index.html: the card's resolver is on the page");
}
no(R("person.html"), 'src="/browse-photos.js"', "person.html loads no photo table");
has(R("sw.js"), "'/roster-portrait.js',", "the reader is precached");

report();
