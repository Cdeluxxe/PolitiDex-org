#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-ballot-measure-scan.mjs — the Utah amendment pages read at a glance
// ─────────────────────────────────────────────────────────────────────────────
// /ballot/ut-amendment-a and /ballot/ut-amendment-b, polished for scanning:
//
//   1. THE RECORD IS NEVER A TAP AWAY. The official question, the Yes and No
//      lines, the sponsors and the vote tallies sit outside every disclosure.
//   2. "WHAT EACH SIDE SAYS" SCANS. Two sides, labelled For and Against; every
//      block of argument names its source; every argument line shown by default
//      is 140 characters or fewer; anything longer is inside a CLOSED "More"
//      (the native disclosure, with a 44px summary). No wall of text is open on
//      arrival.
//   3. A CHIP WEARS ITS ISSUE'S COLOUR. Any topic chip on either page carries the
//      person-file drawer's treatment for its key: the `pdxc-ic` class and
//      PDXIssueColors.styleFor(key). (Neither page prints a topic chip today;
//      the check runs over whatever is there, and a mutation below proves it
//      bites.)
//   4. THE VOICE CARD. The hallway line is the homepage's District Voice card —
//      .pdxhv-card, .pdxhv-kick, .pdxhv-door — and ballot-measure.css carries
//      index.html's pdx:home-voice-gate rules byte for byte.
//   5. NO EQUITY, STOCK, MEMBERSHIP OR SHARE LANGUAGE.
//   6. MUTATIONS ARE CAUGHT. A long argument left open, a long argument printed
//      inline, an uncoloured chip, and a hallway without the card all fail.
//
//   node scripts/test-ballot-measure-scan.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ ballot measure scan: STALE HARNESS — ${m}`); process.exit(2); };

const PAGES = ["ballot-ut-amendment-a.html", "ballot-ut-amendment-b.html"];
const SHORT = 140;
const text = (h) => String(h)
  .replace(/<[^>]+>/g, " ")
  .replace(/&ldquo;|&rdquo;/g, '"').replace(/&rsquo;/g, "'").replace(/&ndash;/g, "–").replace(/&mdash;/g, "—")
  .replace(/&middot;/g, "·").replace(/&hellip;/g, "…").replace(/&amp;/g, "&").replace(/&[a-z]+;/g, " ")
  .replace(/\s+/g, " ").trim();
// One marked element's inner HTML, by its data-pdxbm value, depth-aware.
function block(html, key) {
  const open = new RegExp(`<(\\w+)[^>]*data-pdxbm="${key}"[^>]*>`).exec(html);
  if (!open) return "";
  const tag = open[1], re = new RegExp(`<(/?)${tag}\\b[^>]*>`, "g");
  let depth = 1; re.lastIndex = open.index + open[0].length;
  for (let m; (m = re.exec(html));) { depth += m[1] ? -1 : 1; if (depth === 0) return html.slice(open.index + open[0].length, m.index); }
  return "";
}
// What a reader sees before tapping anything: every CLOSED disclosure's body
// removed (its summary stays). An open one stays whole.
const closedAway = (h) => h.replace(/<details\b(?![^>]*\bopen\b)[^>]*>\s*(<summary\b[^>]*>[\s\S]*?<\/summary>)[\s\S]*?<\/details>/g, "$1");

// ── the colour module, as the rest of the site boots it ─────────────────────
const IC = (() => {
  const w = makeSandbox();
  const ctx = vm.createContext(w);
  for (const f of ["issue-map.js", "issue-colors.js"]) vm.runInContext(R(f), ctx, { filename: f });
  must(w.PDXIssueColors && typeof w.PDXIssueColors.styleFor === "function", "issue-colors.js boots");
  return w.PDXIssueColors;
})();
const CONS = R("consistency.js");
must(/return \{ style: IC\.styleFor\(key\), cls: on \? ' pdxc-ic' : '', on: on \};/.test(CONS),
  "consistency.js's _icSkin still gives a drawer chip ' pdxc-ic' and IC.styleFor(key)");
const unattr = (s) => String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

// ── the checks, as lists of problems so a mutation can be shown to fail them ──
function recordProblems(html) {
  const out = [];
  const body = html.slice(html.indexOf("<body"));
  for (const k of ["question", "yes", "no", "sponsors", "house-vote", "senate-vote"]) {
    const b = block(body, k);
    if (!text(b)) { out.push(`${k}: missing`); continue; }
    if (!closedAway(body).includes(b)) out.push(`${k}: sits inside a closed disclosure`);
  }
  if (!/^\s*<p class="pdxbm-kick">/.test(body.slice(body.indexOf("<main")).replace(/^<main[^>]*>/, ""))) out.push("the page no longer opens on its kicker and title");
  const order = ["question", "yes-no", "text", "sponsors", "sides"].map((id) => body.indexOf(`id="${id}"`));
  if (order.some((i) => i < 0) || order.some((v, i) => i && v < order[i - 1])) out.push("the official question is not first, ahead of the Yes/No lines, sponsors and sides");
  return out;
}
function sideProblems(html) {
  const out = [];
  const sec = block(html, "sides") || ((/<section[^>]*id="sides"[^>]*>([\s\S]*?)<\/section>/.exec(html) || [])[1] || "");
  for (const [key, label] of [["for", "For"], ["against", "Against"]]) {
    const side = block(sec, key);
    if (!side) { out.push(`${label}: no side`); continue; }
    if (!new RegExp(`^\\s*<h3 class="pdxbm-h3">${label}</h3>`).test(side)) out.push(`${label}: not labelled "${label}"`);
    const sources = [...side.matchAll(/<p class="pdxbm-from" data-pdxbm="source"><span class="pdxbm-from-k">Source<\/span>([^<]+)<\/p>/g)].map((m) => text(m[1]));
    if (!sources.length || sources.some((s) => s.length < 10)) out.push(`${label}: a block does not name its source`);
    const groups = [...side.matchAll(/<div class="pdxbm-group" data-pdxbm="group">([\s\S]*?)<\/ul>\s*<\/div>/g)].map((m) => m[1]);
    for (const g of groups) if (!/data-pdxbm="source"/.test(g)) out.push(`${label}: an argument block has no source line`);
    if (/<blockquote\b/.test(side)) out.push(`${label}: a quoted paragraph is open on the page`);
    const shown = closedAway(side);
    if (/<details\b[^>]*\bopen\b/.test(side)) out.push(`${label}: a "More" ships open`);
    for (const d of side.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/g)) {
      if (!/^<summary class="pdxbm-more-sum">More<\/summary>/.test(d[1])) out.push(`${label}: a disclosure that is not the closed "More"`);
      if (!text(d[1].replace(/^<summary[\s\S]*?<\/summary>/, ""))) out.push(`${label}: a "More" that opens onto nothing`);
    }
    for (const m of shown.matchAll(/<span class="pdxbm-arg">([\s\S]*?)<\/span>/g)) {
      const t = text(m[1]);
      if (t.length > SHORT) out.push(`${label}: a default argument line is ${t.length} characters — ${JSON.stringify(t.slice(0, 60))}…`);
    }
    // Nothing else visible on a side is a wall either: every default-visible
    // block other than a source line is short.
    for (const m of shown.replace(/<p class="pdxbm-from"[\s\S]*?<\/p>/g, "").matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
      const t = text(m[2]).replace(/^More\s*/, "").replace(/\s*More$/, "");
      if (t.length > SHORT) out.push(`${label}: ${t.length} characters open by default — ${JSON.stringify(t.slice(0, 60))}…`);
    }
  }
  return out;
}
function chipProblems(html) {
  const out = [];
  const body = html.slice(html.indexOf("<body"));
  // A topic chip is anything that names an issue key: data-issue, data-issue-key,
  // or a chip class.
  const chips = [...body.matchAll(/<(\w+)\b([^>]*\b(?:data-issue(?:-key)?="[^"]*"|class="[^"]*\bchip\b[^"]*")[^>]*)>/g)].map((m) => m[2]);
  for (const a of chips) {
    const key = (/data-issue(?:-key)?="([^"]+)"/.exec(a) || [])[1] || "";
    const cls = (/class="([^"]*)"/.exec(a) || [])[1] || "";
    const style = unattr((/style="([^"]*)"/.exec(a) || [])[1] || "");
    if (!key) { out.push(`a chip names no issue key: <${a.trim()}>`); continue; }
    const on = IC.isCore(key);
    if (on && !/\bpdxc-ic\b/.test(cls)) out.push(`${key}: chip lacks the drawer's pdxc-ic class`);
    if (on && style !== IC.styleFor(key)) out.push(`${key}: chip style is not PDXIssueColors.styleFor("${key}")`);
    if (!on && (/\bpdxc-ic\b/.test(cls) || style)) out.push(`${key}: a non-core key wears a colour`);
  }
  return { out, count: chips.length };
}
function hallProblems(html) {
  const out = [];
  const m = /<aside class="([^"]*)" data-pdxbm="hallway">([\s\S]*?)<\/aside>/.exec(html);
  if (!m) return ["no hallway"];
  if (!/\bpdxhv-card\b/.test(m[1])) out.push("the hallway is not the Voice card (.pdxhv-card)");
  if (!/<p class="pdxhv-kick">District Voice<\/p>/.test(m[2])) out.push("the Voice card has no District Voice eyebrow");
  if (!/<a class="pdxhv-door" href="\/voice">Discuss in your district room\.<\/a>/.test(m[2])) out.push("the door is not the gold Voice control to /voice");
  if (!/<link rel="stylesheet" href="\/ballot-measure\.css" \/>/.test(html)) out.push("the page does not load the sheet that carries the card");
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1–5 · both pages");
// ═════════════════════════════════════════════════════════════════════════════
const EQUITY = [/\bequity\b/i, /\bstocks?\b/i, /\bmembership\b/i, /\bmembers? only\b/i, /earn a share/i, /\bshares?\b/i, /\bdividends?\b/i, /\binvest(?:or|ment)s?\b/i];
for (const f of PAGES) {
  const html = R(f);
  eq(recordProblems(html), [], `${f}: the record is visible without expansion`);
  eq(sideProblems(html), [], `${f}: What each side says`);
  const c = chipProblems(html);
  eq(c.out, [], `${f}: topic chips`);
  console.log(`      ${f}: ${c.count} topic chip(s) on the page`);
  eq(hallProblems(html), [], `${f}: the District Voice card`);
  for (const re of EQUITY) ok(!re.test(html), `${f}: no equity/stock/membership language (${re})`);
  ok((html.match(/data-pdxbm-more/g) || []).length >= 1, `${f}: at least one argument carries a closed More`);
}
{
  const CSS = R("ballot-measure.css");
  for (const re of EQUITY) ok(!re.test(CSS), `ballot-measure.css: no equity/stock/membership language (${re})`);
  ok(/\.pdxbm-more-sum\s*\{[^}]*min-height:\s*44px/.test(CSS), "the More summary keeps its 44px target");
  const homeOf = (s) => (/\/\* home:begin \*\/\n([\s\S]*?)\n\/\* home:end \*\//.exec(s) || [])[1];
  const idx = R("index.html");
  const a = idx.indexOf("      .pdxhv-card{"), z = idx.indexOf("\n", idx.indexOf("      @media (prefers-reduced-motion:reduce){.pdxhv-door{transition:none;}}"));
  must(a > 0 && z > a, "index.html still carries the pdx:home-voice-gate rules");
  const home = idx.slice(a, z).split("\n").map((l) => l.trim()).join("\n");
  eq(homeOf(CSS), home, "ballot-measure.css carries index.html's Voice card rules byte for byte");
  ok(/border:1\.5px solid rgba\(245,200,66,0\.55\)/.test(homeOf(CSS) || "") && /rgba\(18,58,42,0\.82\)/.test(homeOf(CSS) || ""),
    "the card is the forest ground with the gold edge");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · mutations are caught");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = R(PAGES[1]);
  const open = B.replace('<details class="pdxbm-more" data-pdxbm-more>', '<details class="pdxbm-more" data-pdxbm-more open>');
  must(open !== B, "the open-More mutation found its target");
  ok(sideProblems(open).length > 0, "a long argument left open by default passes");

  const inline = B.replace(/<span class="pdxbm-arg">([^<]*)<\/span><details class="pdxbm-more" data-pdxbm-more><summary class="pdxbm-more-sum">More<\/summary><p>([^<]*)<\/p><\/details>/,
    (m, a, b) => `<span class="pdxbm-arg">${a} ${b}</span>`);
  must(inline !== B, "the inline-paragraph mutation found its target");
  ok(sideProblems(inline).length > 0, "a long argument printed inline passes");

  const quote = B.replace('<li data-pdxbm="arg">', '<blockquote>A quoted paragraph.</blockquote><li data-pdxbm="arg">');
  ok(sideProblems(quote).length > 0, "an open quoted paragraph passes");

  const noSource = B.replace(/<p class="pdxbm-from" data-pdxbm="source">[\s\S]*?<\/p>/, "");
  ok(sideProblems(noSource).length > 0, "an argument block without its source passes");

  const relabel = B.replace('<h3 class="pdxbm-h3">For</h3>', '<h3 class="pdxbm-h3">Supporters</h3>');
  ok(sideProblems(relabel).length > 0, "a side not labelled For passes");

  const sk = IC.styleFor("lower_taxes");
  must(IC.isCore("lower_taxes") && sk, "lower_taxes resolves to a core issue colour");
  const good = B.replace('<h3 class="pdxbm-h3">For</h3>',
    `<h3 class="pdxbm-h3">For</h3><span class="pdxbm-chip pdxc-ic" data-issue="lower_taxes" style="${sk.replace(/"/g, "&quot;")}">Taxes</span>`);
  eq(chipProblems(good).out, [], "a chip with the drawer's colour passes the chip check");
  const stripped = B.replace('<h3 class="pdxbm-h3">For</h3>', '<h3 class="pdxbm-h3">For</h3><span class="pdxbm-chip" data-issue="lower_taxes">Taxes</span>');
  ok(chipProblems(stripped).out.length > 0, "a chip stripped of its colour passes");

  const plainHall = B.replace(/<aside class="pdxhv-card pdxbm-hall" data-pdxbm="hallway">[\s\S]*?<\/aside>/,
    '<aside class="pdxbm-hall" data-pdxbm="hallway"><p><a href="/voice">Discuss in your district room.</a></p></aside>');
  must(plainHall !== B, "the plain-hallway mutation found its target");
  ok(hallProblems(plainHall).length > 0, "a hallway without the Voice card passes");

  const hidden = B.replace(/(<table class="pdxbm-table" data-pdxbm="sponsors">)/, '<details><summary>Sponsors</summary>$1').replace(/(<\/table>)/, "$1</details>");
  ok(recordProblems(hidden).length > 0, "sponsors and votes folded behind a disclosure passes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the shell moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  const SW = R("sw.js");
  for (const f of ["/ballot-ut-amendment-a.html", "/ballot-ut-amendment-b.html", "/ballot-measure.css"]) ok(SW.includes(`  '${f}',`), `sw: ${f} is precached`);
  const ver = Number((/const CACHE_VERSION = 'v(\d+)';/.exec(SW) || [])[1]);
  ok(ver >= 403, `sw: CACHE_VERSION moved for the changed precached pages (v${ver})`);
}

if (failures.length) {
  console.error(`\n✗ ballot measure scan: ${failures.length} failure(s), ${passed} passed`);
  for (const f of failures) console.error("   · " + f);
  process.exit(1);
}
console.log(`\n✓ ballot measure scan: ${passed} checks passed — record visible, sides labelled and sourced, long text behind More, the Voice card`);
