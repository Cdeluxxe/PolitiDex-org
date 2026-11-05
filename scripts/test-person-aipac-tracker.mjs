#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-person-aipac-tracker.mjs — the AIPAC Tracker line on every person profile
// ─────────────────────────────────────────────────────────────────────────────
//   1. The person file mounts it, guarded, under the letterhead chip row: after
//      the party pill, outside the chip row, so no existing chip moves.
//   2. Every roster profile renders it: a text-only "AIPAC Tracker" link to
//      trackaipac.com and exactly one of the three status lines.
//   3. A known case of each type, read from the shipped table: accepted with an
//      amount, has not accepted, and no data (with a tracker page and without),
//      with the right link for each.
//   4. The amount is printed as the tracker's, formatted with separators.
//   5. Attribution only: no partnership wording, no logo or glyph, and the
//      accessible name says the information is AIPAC Tracker's.
//   6. The shipped table is well formed, and the shell moved a version.
//
//   node scripts/test-person-aipac-tracker.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const SRC = R("pdx-aipac.js");
const PFF = R("profiles-full.js");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const unesc = (s) => String(s).replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const visible = (h) => unesc(String(h).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
const aria = (h) => unesc((/aria-label="([^"]*)"/.exec(String(h)) || [])[1] || "");
const href = (h) => unesc((/href="([^"]*)"/.exec(String(h)) || [])[1] || "");
const line = (h) => unesc(((/<span class="pdx-atk-line">([^<]*)<\/span>/.exec(String(h)) || [])[1]) || "");
const state = (h) => (/data-pdx-atk-state="([a-z]+)"/.exec(String(h)) || [])[1];

function boot(extra = {}) {
  const win = { setTimeout: () => 0, addEventListener: () => {}, ...extra };
  win.window = win;
  vm.runInNewContext(SRC, win, { filename: "pdx-aipac.js" });
  return win;
}
const roster = (() => {
  const w = {}; w.window = w;
  vm.runInNewContext(R("cmp-data.js"), w, { filename: "cmp-data.js" });
  return Object.keys(w.CMP_DATA || {});
})();

const W = boot();
const A = W.PDXAipac;
const T = A.TRACKER;
const LINES = [/^Accepted \$\d{1,3}(,\d{3})* \(AIPAC Tracker\)$/, /^Has not accepted funds \(AIPAC Tracker\)$/, /^No data on AIPAC Tracker$/];
const dollars = (n) => "$" + n.toLocaleString("en-US");

section("1 · mounted on the person file, under the chip row");
{
  const MT = "PDXAipac.trackerHtml(id)";
  const at = PFF.indexOf(MT);
  ok(at > 0, "profiles-full.js does not mount the AIPAC Tracker line");
  ok(/\(window\.PDXAipac && typeof window\.PDXAipac\.trackerHtml === 'function'\) \? window\.PDXAipac\.trackerHtml\(id\) : ''/.test(PFF),
    "the AIPAC Tracker mount is not guarded");
  const party = PFF.indexOf('<span class="profile-party">');
  const chip = PFF.indexOf("PDXAipac.chipMount(id)");
  ok(chip > 0 && party > chip && at > party, "the AIPAC Tracker line is not after the AIPAC chip and the party pill");
  const meta = PFF.lastIndexOf('<div class="profile-meta">', at);
  const between = PFF.slice(party, at).replace(/<!--[\s\S]*?-->/g, "");
  ok(meta > 0 && /<\/div>/.test(between), "the AIPAC Tracker line sits inside the chip row instead of under it");
  ok(PFF.indexOf('<div class="profile-hero-score">', at) > at, "the AIPAC Tracker line is not in the identity block");
  eq(PFF.split(MT).length - 1, 1, "the AIPAC Tracker line is mounted once");
}

section("2 · every roster profile shows the chip and one status line");
{
  ok(roster.length > 1000, `the roster did not load (${roster.length})`);
  let bad = 0;
  const seen = new Set();
  for (const pid of [...roster, "nobody_at_all", "", null]) {
    const h = A.trackerHtml(pid);
    const good = /<a class="pdx-atk-chip" href="https:\/\/www\.trackaipac\.com\/tracker[^"]*"/.test(h) &&
      /target="_blank" rel="noopener noreferrer"/.test(h) &&
      />AIPAC Tracker<\/a>/.test(h) &&
      LINES.some((re) => re.test(line(h)));
    if (!good && bad++ < 5) failures.push(`${pid}: no AIPAC Tracker chip with a status line: ${h}`);
    seen.add(state(h));
  }
  ok(bad === 0, `${bad} profiles render no AIPAC Tracker chip`);
  ok(seen.has("accepted") && seen.has("none") && seen.has("nodata"), `not every state appears on the roster: ${[...seen]}`);
}

section("3 · a known case of each type, from the shipped table");
{
  const pick = (fn) => Object.keys(T).sort().find((p) => roster.includes(p) && fn(T[p]));
  const accepted = pick((r) => r[1] > 0);
  const none = pick((r) => r[1] === 0);
  const noFigure = pick((r) => r[1] === null);
  const noPage = roster.find((p) => !Object.prototype.hasOwnProperty.call(T, p));
  ok(accepted && none && noFigure && noPage, "the table lacks a case of each type");

  // Accepted, with the tracker's own amount, linking to the person's tracker page.
  eq(accepted, "aaron_bean", "first accepted case");
  let h = A.trackerHtml(accepted);
  eq(state(h), "accepted", `${accepted}: state`);
  eq(line(h), `Accepted ${dollars(T[accepted][1])} (AIPAC Tracker)`, `${accepted}: status line`);
  eq(href(h), "https://www.trackaipac.com/tracker/people/" + T[accepted][0], `${accepted}: link`);
  ok(/^member-aaron-bean-fl-04-r$/.test(T[accepted][0]), `${accepted}: tracker slug is ${T[accepted][0]}`);
  ok(aria(h).includes(dollars(T[accepted][1])) && /AIPAC Tracker/.test(aria(h)), `${accepted}: accessible name lacks the amount and the tracker: ${aria(h)}`);

  // Has not accepted: the tracker prints $0.
  h = A.trackerHtml(none);
  eq(state(h), "none", `${none}: state`);
  eq(line(h), "Has not accepted funds (AIPAC Tracker)", `${none}: status line`);
  eq(href(h), "https://www.trackaipac.com/tracker/people/" + T[none][0], `${none}: link`);
  ok(!/\$[1-9]/.test(visible(h)), `${none}: prints an amount`);

  // No data, but the tracker has a page: still links to it.
  h = A.trackerHtml(noFigure);
  eq(state(h), "nodata", `${noFigure}: state`);
  eq(line(h), "No data on AIPAC Tracker", `${noFigure}: status line`);
  eq(href(h), "https://www.trackaipac.com/tracker/people/" + T[noFigure][0], `${noFigure}: link`);
  ok(/data-pdx-atk-page="person"/.test(h), `${noFigure}: not marked as a person page`);

  // No data and no known page: the chip still renders, pointing at the search.
  h = A.trackerHtml(noPage);
  eq(state(h), "nodata", `${noPage}: state`);
  eq(line(h), "No data on AIPAC Tracker", `${noPage}: status line`);
  eq(href(h), "https://www.trackaipac.com/tracker", `${noPage}: link is not the tracker's search`);
  ok(/data-pdx-atk-page="search"/.test(h), `${noPage}: not marked as the search`);
  ok(!/\$/.test(visible(h) + aria(h)), `${noPage}: prints an amount`);
}

section("4 · the amount is formatted, and a retired key reads its canonical row");
{
  const w = boot({ PDX_PROFILE_ALIAS: { old_key: "fx_big" } });
  w.PDXAipac.TRACKER.fx_big = ["member-fx-big-xx-01-d", 1234567];
  w.PDXAipac.TRACKER.fx_small = ["member-fx-small-xx-02-r", 950];
  eq(line(w.PDXAipac.trackerHtml("fx_big")), "Accepted $1,234,567 (AIPAC Tracker)", "seven-figure amount");
  eq(line(w.PDXAipac.trackerHtml("fx_small")), "Accepted $950 (AIPAC Tracker)", "three-figure amount");
  eq(line(w.PDXAipac.trackerHtml("old_key")), "Accepted $1,234,567 (AIPAC Tracker)", "a retired key does not read its canonical row");
  w.PDXAipac.TRACKER.fx_bad = ['bad slug"><script>', 5];
  const h = w.PDXAipac.trackerHtml("fx_bad");
  ok(!/<script>/.test(h) && href(h) === "https://www.trackaipac.com/tracker", "a malformed slug is not linked");
}

section("5 · attribution only — no partnership, no logo");
{
  for (const pid of ["aaron_bean", Object.keys(T).find((p) => T[p][1] === 0), "nobody_at_all"]) {
    const h = A.trackerHtml(pid);
    const text = visible(h) + " " + aria(h);
    ok(!/partner|in partnership|official|endors|powered by|equity|equitable/i.test(text), `${pid}: partnership or equity wording: ${text}`);
    ok(!/<img|<svg|pdx-mchip-ico|[\u{1F300}-\u{1FAFF}]/u.test(h), `${pid}: the chip carries a logo or glyph`);
    ok(/^AIPAC Tracker /.test(visible(h)), `${pid}: the chip is not labelled "AIPAC Tracker": ${visible(h)}`);
    ok(/AIPAC Tracker/.test(line(h)), `${pid}: the status line does not name AIPAC Tracker`);
  }
  const a = aria(A.trackerHtml("aaron_bean"));
  ok(/AIPAC Tracker’s, not PolitiDex’s/.test(a), `the accessible name does not attribute the figure to AIPAC Tracker: ${a}`);
  // The existing AIPAC chip is unchanged: still no figure, in any state.
  const c = A.chipMount("aaron_bean");
  ok(!/\$|\d/.test(visible(c)), "the AIPAC chip now prints a figure");
}

section("6 · the shipped table, and the shell");
{
  const keys = Object.keys(T);
  ok(keys.length > 500, `the table holds only ${keys.length} people`);
  const slugs = new Set();
  for (const p of keys) {
    const [slug, amt] = T[p];
    ok(/^[a-z0-9-]+$/.test(slug), `${p}: bad slug ${slug}`);
    ok(amt === null || (Number.isInteger(amt) && amt >= 0), `${p}: bad amount ${amt}`);
    ok(roster.includes(p), `${p}: not a roster id`);
    ok(!slugs.has(slug), `${slug}: placed on two roster ids`);
    slugs.add(slug);
  }
  ok(/^\d{4}-\d{2}-\d{2}$/.test(A.TRACKER_AS_OF), "the table has no as-of date");
  const sw = R("sw.js");
  ok(/'\/pdx-aipac\.js'/.test(sw) && /'\/profiles-full\.js'/.test(sw), "pdx-aipac.js or profiles-full.js is not precached");
  // The shell moved to v525 with this pass; a later pass may move it further.
  const ver = +((/const CACHE_VERSION = 'v(\d+)'/.exec(sw) || [])[1] || 0);
  ok(/v525 - [\s\S]*?MIGRATION COST: none/.test(sw) && ver >= 525, "the shell did not move to v525 with a no-migration note");
}

console.log(`\n   ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.error(`   ✗ ${f}`);
  process.exit(1);
}
