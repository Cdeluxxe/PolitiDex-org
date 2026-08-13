#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-stance-clarity.mjs — Stances & Connections: a result, and a way onward
// ─────────────────────────────────────────────────────────────────────────────
// The section used to read as a labelled list: an issue name, a soft chip ("◑ Mixed
// record"), a receipt count, and three links to the tops of three other sections.
// A reader could not tell what "mixed" meant, how much was behind it, or where to
// go to check — and on a member the chip said "Loading the record…" forever, because
// nothing repainted the rows when the votes arrived.
//
// This harness gates the four promises the rewrite makes, on real shipped data:
//
//   1. A RESULT ON EVERY TESTED ROW — an issue-level percentage that is the row
//      model's own number, a verdict beside it, and the depth of the record under
//      it, in the office's own nouns. Untested and too-thin rows fail closed and
//      say why: no row is ever given an answer the engine did not reach.
//   2. COMPOSITION UNDER TENSION — a mixed row, a row with counter-evidence the
//      verdict set aside, and a row whose action is contested all print the split
//      instead of leaving "mixed" to be guessed at.
//   3. CONNECTIONS THAT LAND ON THE ISSUE — every jump carries the (pid, issue)
//      pair, and the two per-issue anchors it aims at are actually emitted by the
//      sections that own them, built from the same string on both ends.
//   4. HIERARCHY AND REACH — the issue-level number is scoped as one issue and
//      points at the one profile score; executive-only vocabulary never reaches a
//      member; the rows are repainted when the vote record warms; and the result
//      is legible on a phone without opening anything.
//
// Subjects: `trump` (executive lane, dense record) and `mike_johnson` / `massie`
// (congressional lane, pre-warm — which is exactly the fail-closed case).
//
//   node scripts/test-stance-clarity.mjs
//
// No database, no network, no DOM beyond gen-hero-showcase.mjs's shared stub.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const FILES = [
  "cmp-data.js",
  "politician-stances-core.js",
  "politician-stances-ext.js",
  "state-senate-stances.js",
  "stance-helpers.js",
  "alignment-tool.js",
  "acct-spotlight-data.js",
  "say-vs-do.js",
  "exec-action-data.js",
  "exec-record.js",
  "exec-record-ui.js",
  "consistency.js",
  "voting-record.js",
  "word-action.js",
  "profile-spine.js",
];

const win = makeSandbox();
const sandbox = vm.createContext(win);
win.PROFILES = win.CMP_DATA;
for (const f of FILES) vm.runInContext(R(f), sandbox, { filename: f });
win.PROFILES = win.CMP_DATA;

const CS = win.PDXConsistency;
const WA = win.PDXWordAction;
const CS_SRC = R("consistency.js");
const WA_SRC = R("word-action.js");

const PRES = "trump";
const REP = "mike_johnson";
const REP2 = "massie";

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const has = (hay, needle, msg) =>
  ok(String(hay).includes(needle), `${msg} — ${JSON.stringify(needle)} missing`);
const lacks = (hay, needle, msg) =>
  ok(!String(hay).includes(needle), `${msg} — ${JSON.stringify(needle)} present`);
const text = (h) => String(h || "")
  .replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/\s+/g, " ").trim();
const section = (t) => console.log(`  · ${t}`);

// Split the rendered section into one chunk per row, keyed by issue. The trailing
// character class keeps `pdxst-row-top` from opening a chunk of its own.
function rowsOf(pid) {
  const html = CS.stancesSectionHtml(pid);
  const out = {};
  for (const chunk of html.split(/<div class="pdxst-row["\s]/).slice(1)) {
    const k = (chunk.match(/data-pdxst-issue="([^"]*)"/) || [])[1];
    if (k) out[k] = chunk;
  }
  return { html, rows: out };
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · every tested row states a result; every untested row says it is untested");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const [who, pid] of [["president", PRES], ["member", REP], ["member2", REP2]]) {
    const { rows } = rowsOf(pid);
    const model = CS.issueRows(pid);
    let tested = 0, untested = 0;
    for (const r of model) {
      const chunk = rows[r.key] || "";
      ok(!!chunk, `${who}/${r.key}: the row model has an issue the section does not render`);
      if (!chunk) continue;
      if (r.tested) {
        tested++;
        // The number, and only the row model's number. A surface that recomputes is
        // a surface that can disagree with the score.
        has(chunk, `>${r.verdict.score}%</span>`,
          `${who}/${r.key}: the tested row does not print its issue-level result`);
        // ONE RESULT VOCABULARY ACROSS THE PROFILE. The word on this row is the word
        // the ⚖️ Word vs Action issue index filed it under — Backed up, Mixed,
        // Contradicted — read from the module that publishes those four rather than
        // restated here. It used to be the engine's long label ("Backs it up"), which
        // meant one finding wore two names depending on which surface you met it on.
        const bucket = WA.outcomeFor(r.verdict.token);
        ok(!!bucket, `${who}/${r.key}: a tested row's verdict has no published bucket`);
        has(chunk, bucket.short, `${who}/${r.key}: the tested row prints no verdict`);
        // …and the metric is NAMED. A bare percentage on a row is a number without
        // a question attached to it.
        ok(/class="pdxst-metric">(Direction match|Public-record match)</.test(chunk),
          `${who}/${r.key}: the row's percentage is unlabelled`);
        // The name follows the lane that produced it: "Direction match" is the
        // formal-record metric and may not be borrowed by a public-record read.
        const metric = (chunk.match(/class="pdxst-metric">([^<]*)</) || [])[1];
        eq(metric, r.verdict.basis === "public_record" ? "Public-record match" : "Direction match",
          `${who}/${r.key}: the metric name does not match the record that produced it`);
      } else {
        untested++;
        ok(!/class="pdxst-pct"[^>]*>\d+%/.test(chunk),
          `${who}/${r.key}: an untested row prints a percentage`);
        const state = (chunk.match(/data-pdxst-state="(\w+)"/) || [])[1];
        ok(state === "thin" || state === "untested",
          `${who}/${r.key}: a row with no result is marked "${state}"`);
        // A too-thin row keeps its verdict word (the engine did reach "Limited") but
        // prints an explicit blank where the number would be. A row with nothing to
        // test carries no verdict styling at all.
        if (state === "thin") {
          has(chunk, "pdxst-pct-na", `${who}/${r.key}: a thin row leaves the result slot empty rather than blank`);
          // The reason is specific to WHY it is thin: a record that takes no side is
          // a different situation from a record that is barely there, and a row that
          // says "not enough record" over four actions contradicts its own next line.
          ok(/(takes a clear side on this claim|takes a side on this one|is not enough to judge this one yet|Not enough record to judge this one yet)/.test(chunk),
            `${who}/${r.key}: a thin row does not say why it has no result`);
        } else {
          has(chunk, "pdxst-vd-none", `${who}/${r.key}: an untested row borrows a verdict's styling`);
          has(chunk, "Not tested yet", `${who}/${r.key}: an untested row does not say it is untested`);
        }
      }
      // Depth is stated wherever there is any, in the row's own words.
      if (r.evidence.total > 0) {
        has(chunk, "pdxst-ev", `${who}/${r.key}: a row with receipts states no evidence line`);
        has(chunk, `${r.evidence.strength} evidence`,
          `${who}/${r.key}: the row does not state how strong its evidence is`);
      }
    }
    ok(tested + untested === model.length, `${who}: rows went missing between model and render`);
    console.log(`    ${who}: ${tested} tested · ${untested} untested of ${model.length}`);
  }
  // A `limited` row is the case the old chip flattened: judged, but too thin to
  // divide. It must print no percentage and must say so in words.
  const thin = CS.issueRows(PRES).filter((r) => r.verdict.token === "limited");
  const { rows: pRows, html: pHtml } = rowsOf(PRES);
  for (const r of thin) {
    ok(/class="pdxst-why">[^<]+</.test(pRows[r.key] || ""),
      `president/${r.key}: a thin row does not explain why it has no result`);
  }
  if (thin.length) {
    has(pHtml, "Too thin to judge yet",
      "a thin row still sits silently under 'the record backs it up' — the divider is missing");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a mixed row shows what mixed meant");
// ═════════════════════════════════════════════════════════════════════════════
{
  const { rows } = rowsOf(PRES);
  const mixed = CS.issueRows(PRES).filter((r) => r.verdict.token === "mixed");
  ok(mixed.length > 0, "fixture: the president has no mixed row to check the breakdown on");
  for (const r of mixed) {
    const chunk = rows[r.key] || "";
    has(chunk, "pdxst-comp", `president/${r.key}: a mixed row prints no composition`);
    // The two halves the percentage is a ratio of, printed rather than divided.
    const aligned = Number((chunk.match(/pdxst-comp-for"><b>(\d+)<\/b>/) || [])[1]);
    const against = Number((chunk.match(/pdxst-comp-against"><b>(\d+)<\/b>/) || [])[1]);
    ok(aligned + against > 0, `president/${r.key}: the breakdown counts nothing`);
    eq(Math.round((100 * aligned) / (aligned + against)), r.verdict.score,
      `president/${r.key}: the printed split does not reconstruct the row's own percentage`);
  }
  // Counter-evidence the verdict set aside is disclosed, not dropped — the row model
  // already carries it, and this is the surface that has to say it out loud.
  const aside = CS.issueRows(PRES).filter((r) => r.setAside && r.setAside.count);
  ok(aside.length > 0, "fixture: no set-aside row on the president to check disclosure on");
  for (const r of aside) {
    has(rows[r.key] || "", "set aside",
      `president/${r.key}: counter-evidence the verdict set aside is not disclosed on the row`);
  }
  // A clean, uncontested row is left alone: a breakdown under "9 of 9 aligned" is
  // furniture, and this section's whole problem was furniture.
  const clean = CS.issueRows(PRES).filter(
    (r) => r.verdict.token === "consistent" && !r.setAside && r.verdict.score === 100);
  let bare = 0;
  for (const r of clean) if (!/pdxst-comp/.test(rows[r.key] || "")) bare++;
  ok(bare > 0, "every clean row carries a breakdown — composition is for rows that need it");
  // Contested standing is an executive-only idea and is read from the Executive
  // Enactment Record's own vocabulary, never restated here.
  has(CS_SRC, "window.PDXExecRecord", "the standing read stopped going through PDXExecRecord");
  ok(/_stStanding[\s\S]{0,400}lane !== 'exec'/.test(CS_SRC),
    "the contested-standing line is not gated to the executive lane");
  for (const pid of [REP, REP2]) {
    const t = text(CS.stancesSectionHtml(pid));
    for (const w of ["struck down", "in force", "rescinded", "blocked by a court"]) {
      lacks(t.toLowerCase(), w, `${pid}: executive standing vocabulary reached a member's stance rows`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the connections land on the issue, not on the top of a section");
// ═════════════════════════════════════════════════════════════════════════════
{
  const { html, rows } = rowsOf(PRES);
  // Every jump carries the pair that identifies the destination row. Without both,
  // the button can only aim at a section heading — which is the behaviour this pass
  // exists to replace.
  const gos = [...html.matchAll(/<button[^>]*data-pdxst-go="([^"]*)"[^>]*>/g)].map((m) => m[0]);
  ok(gos.length > 0, "the stance rows offer no jumps at all");
  for (const g of gos) {
    ok(/data-pdxst-pid="/.test(g) && /data-pdxst-key="/.test(g),
      `a stance jump does not carry its (pid, issue) pair: ${g.slice(0, 120)}`);
  }
  // …and the anchors they aim at exist, built from the same string on both ends.
  const or = CS.officialRecordSectionHtml(PRES, win.CMP_DATA[PRES]);
  const wa = WA.sectionHtml(PRES, win.CMP_DATA[PRES]);
  const scored = CS.issueRows(PRES).filter((r) => r.scored);
  ok(scored.length > 0, "fixture: the president has no scored row to anchor");
  let orHits = 0, waHits = 0;
  for (const r of scored) {
    if (or.includes(`id="pdxor-row-${PRES}-${r.key}"`)) orHits++;
    if (wa.includes(`id="pdxwa-oc-${PRES}-${r.key}"`)) waHits++;
  }
  ok(orHits > 0, "the Official Record emits no per-issue row anchor — every 🏛️ jump would\n" +
    "    fall back to the top of the section");
  ok(waHits > 0, "Word vs Action emits no per-issue outcome anchor — every ⚖️ jump would\n" +
    "    fall back to the top of the score");
  console.log(`    per-issue anchors: ${orHits} official-record · ${waHits} word-vs-action of ${scored.length} scored`);
  // Both ends sanitise identically, or the id built by one never matches the other.
  ok(/replace\(\/\[\^A-Za-z0-9_-\]\/g, ''\)/.test(CS_SRC) &&
     /replace\(\/\[\^A-Za-z0-9_-\]\/g, ''\)/.test(WA_SRC),
    "the two ends of a per-issue jump no longer sanitise ids the same way");
  // A destination inside an unopened fold has to be MOUNTED before it is looked for,
  // or the exact-row link quietly degrades to the section link on every first read.
  ok(/_stNav[\s\S]{0,900}_pdxRevealTarget[\s\S]{0,200}getElementById/.test(CS_SRC),
    "the stance jump looks for its target before mounting the fold it lives in");
  // And it falls back rather than dead-ending.
  ok(/var target = landed \|\| section;/.test(CS_SRC),
    "the stance jump has no fallback when the exact row is not on the page");
  // The way back. One-way navigation is scrolling by another name.
  has(CS_SRC, "data-pdxst-back", "no return path from a jumped-to section back to the stance row");
  ok(/function _stBack/.test(CS_SRC) && /_stHideBack/.test(CS_SRC),
    "the return pill never takes itself down");
  // Rows are addressable, which is what makes the return trip possible at all.
  for (const r of CS.issueRows(PRES)) {
    has(rows[r.key] || "", `id="pdxst-row-${PRES}-${r.key}"`,
      `president/${r.key}: the stance row has no stable id to come back to`);
  }
  // The jumps are delegated, not inline handlers: the rows are rebuilt on warm, and
  // an inline onclick would be re-parsed on every repaint.
  ok(!/pdxst-go" onclick=/.test(CS_SRC), "the stance jumps went back to inline onclick handlers");
  has(CS_SRC, "closest('[data-pdxst-go]')", "nothing listens for a stance jump");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · hierarchy, lane vocabulary, reach and the phone");
// ═════════════════════════════════════════════════════════════════════════════
{
  // ONE profile score. The issue-level number is scoped, on the row, every time.
  for (const pid of [PRES, REP]) {
    const { html } = rowsOf(pid);
    const pcts = (html.match(/class="pdxst-pct"[^>]*>\d+%/g) || []).length;
    const scopes = (html.match(/class="pdxst-scope"/g) || []).length;
    ok(scopes >= pcts, `${pid}: a percentage is printed without the "this issue" scope tag`);
    has(text(html), "the profile's single score is the pooled one in ⚖️ Word vs Action",
      `${pid}: the section does not say where the one profile score lives`);
  }
  // The president's own pooled score must not be restated here under another name.
  const pooled = WA.compute ? WA.compute(PRES, win.CMP_DATA[PRES]) : null;
  if (pooled && typeof pooled.score === "number") {
    const stTxt = text(CS.stancesSectionHtml(PRES));
    const shown = (stTxt.match(/\d+%/g) || []);
    const rowScores = new Set(CS.issueRows(PRES).filter((r) => r.tested).map((r) => `${r.verdict.score}%`));
    for (const s of shown) {
      ok(rowScores.has(s),
        `the stance layer prints ${s}, which is not any row's own issue result — the only\n` +
        "    number here may be one issue's own");
    }
  }
  // Lane vocabulary. A president signs actions; a member casts votes. Neither
  // borrows the other's noun, on the result line or on the jump label.
  const pTxt = text(CS.stancesSectionHtml(PRES));
  ok(/\d+ actions? on record/.test(pTxt), "the president's rows do not count his record in actions");
  ok(!/\d+ votes? on record/.test(pTxt), "the president's rows offer to show him votes");
  for (const pid of [REP, REP2]) {
    const t = text(CS.stancesSectionHtml(pid));
    ok(!/\d+ actions? on record/.test(t), `${pid}: a member's rows count executive actions`);
  }
  // REACH. A member's rows are built before the votes arrive, so without a repaint
  // "Loading the record…" is not a transient state — it is the permanent answer to
  // "what did the record conclude?".
  ok(/\[data-pdxc-stances-pid\]/.test(CS_SRC),
    "the warm repaint still skips the stance rows — a member's rows would never resolve");
  ok(/data-pdxc-stances-pid[\s\S]{0,400}_lidify\(_stInner\(pid\)\)/.test(CS_SRC),
    "the stance repaint does not rebuild through the spine, so its folds would vanish");
  ok(/data-pdxc-stances-pid[\s\S]{0,500}_lidsReopen\(stOpen\)/.test(CS_SRC),
    "the stance repaint closes folds the reader had already opened");
  // The section arms the one delegated listener its own buttons depend on.
  ok(/function stancesSectionHtml[\s\S]{0,300}bindGateway\(\)/.test(CS_SRC),
    "the stance section renders jump buttons without arming the listener behind them");
  // THE PHONE. The result is visible with nothing opened, the jumps are tappable,
  // and the methodology stays in a tooltip rather than on the row.
  const css = CS_SRC.slice(CS_SRC.indexOf("function ensureStyles"));
  // The phone rules for this section live in the LAST 480px block — the earlier one
  // belongs to the issue-colour skin. Anchored on a selector this pass introduced so
  // it cannot drift onto the wrong block.
  const mobAt = css.lastIndexOf("@media (max-width:480px)");
  const mob = css.slice(mobAt, mobAt + 1400);
  for (const sel of [".pdxst-pct", ".pdxst-vd", ".pdxst-go", ".pdxst-links"]) {
    has(mob, sel, `mobile: ${sel} has no phone-sized rule — the new row shape is desktop-only`);
  }
  const tap = Number((mob.match(/\.pdxst-go\{min-height:([\d.]+)rem/) || [])[1]);
  ok(tap >= 2.2, `mobile: the jump buttons are below a comfortable tap target (${tap}rem)`);
  // The result line is markup the reader sees, not a disclosure they have to open.
  for (const pid of [PRES, REP]) {
    const html = CS.stancesSectionHtml(pid);
    const lidAt = html.indexOf("PDXSP:lid");
    const open = lidAt === -1 ? html : html.slice(0, lidAt);
    ok(/class="pdxst-result/.test(open),
      `${pid}: no result line is visible above the fold — the reader has to open something\n` +
      "    to find out what the record concluded");
  }
  // …and the long explanation stays in the tooltip, off the row.
  ok(/title="/.test(CS.stancesSectionHtml(PRES)),
    "the result line carries no explanation for a reader who wants one");
  const rowText = text(rowsOf(PRES).rows[CS.issueRows(PRES)[0].key]);
  ok(rowText.length < 700, `a single stance row paints ${rowText.length} characters of visible text —\n` +
    "    the brief was clarity, not density");
}

// ── Report ────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ stance clarity: ${failures.length} failure(s) (${passed} passed)\n`);
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(`✓ stance clarity: all ${passed} assertions passed — a result on every tested row, and a way onward`);
