#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// ONE DOCUMENT, EVERY ISSUE IT DECIDED
// ─────────────────────────────────────────────────────────────────────────────
// A reconciliation law like Public Law 119-21 is not one story. It is mapped to
// fourteen issues and read separately on each, and the reading flips: the same text
// that advances one issue cuts against another, and the verdict changes again
// because it is measured against what was said on THAT issue. Until this pass, a
// reader who landed on one issue saw one row plus a caveat — "mapped to 14 issues,
// this row is only its reading on taxes" — and no way to go and look at the other
// thirteen. The data was all on file; the door was missing.
//
// This is that door. It is NAVIGATION AND PRESENTATION ONLY. No mapping is added,
// no direction is changed, no item is added to or removed from any dossier, and no
// score, verdict or basis moves. What this harness pins:
//
//   1. THE DOOR IS EXACTLY WHERE THE CAVEAT IS. Every multi-issue row carries the
//      control, inside the caveat span it belongs to, on a <details> that carries
//      the profile, issue and index its handler needs. No single-issue row does.
//   2. THE TRAIL IS THE WHOLE MAPPING, ONCE. One row per issue the document was
//      mapped to — no more, no fewer, no repeats — with the issue being read
//      marked and never given a door back to itself.
//   3. THE TRAIL BORROWS; IT NEVER INVENTS. Every direction is the one the block
//      it replaces already printed, and every verdict and why-it-counts sentence
//      is byte-identical to what THAT issue's own dossier prints for the same
//      document. Nothing is written for the trail.
//   4. IT WITHHOLDS WHAT THE LOCAL ROW WITHHOLDS. Where an issue's dossier holds a
//      document back, the trail prints no verdict for it either, shows that issue's
//      own hold reason, and dims the mapping direction rather than passing it off
//      as a judgement.
//   5. IT REPLACES THE DISCLOSURE, IT DOES NOT ADD A PANEL. The trail lands inside
//      the multi-issue <details> that was already there, in place of the label
//      chips; the row list above it is unchanged; the gap sheet's own caller still
//      gets the chips.
//   6. NOTHING MOVED. Every issue row, every dossier item and every mechanism
//      sentence in the product is byte-identical before and after every trail on
//      file has been built and rendered.
//
//   node scripts/test-instrument-trail.mjs
//
// Runs the shipped renderer over the shipped data in one node:vm sandbox. No
// database, no network, no DOM beyond gen-hero-showcase.mjs's stub.

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
  "coverage.js",
  "gaps.js",
];

const win = makeSandbox();
const sandbox = vm.createContext(win);
win.PROFILES = win.CMP_DATA;
for (const f of FILES) vm.runInContext(R(f), sandbox, { filename: f });
win.PROFILES = win.CMP_DATA;

const CS = win.PDXConsistency;

let pass = 0;
const fails = [];
const ok = (c, m) => { if (c) pass++; else fails.push(m); };
const eq = (a, b, m) => ok(a === b, `${m}\n    expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n${t}`);

const CURATED_LABEL = "Why it counts here:";
const DERIVED_LABEL = "How it was linked:";
const MARK = "⌛ Not yet explained by a curator";
// The one sentence this view writes for itself. Everything else on it is borrowed.
const FOOT_HEAD = "One document, judged separately on every issue it was mapped to.";

// ── A snapshot of everything the score path says, taken BEFORE any trail is built.
// Section 6 takes the same snapshot afterwards and holds them to each other. The
// trail re-reads a dozen other issues' dossiers to assemble itself; if that reading
// warmed, mutated or reordered anything, this is what catches it.
function snapshot() {
  const out = [];
  for (const pid of Object.keys(win.CMP_DATA)) {
    let rows = [];
    try { rows = CS.issueRows(pid) || []; } catch (e) { continue; }
    for (const r of rows) {
      let list = [];
      try { list = CS.dossierItems(pid, r.key) || []; } catch (e) { list = []; }
      out.push([
        pid, r.key, r.bucket, r.verdict || "", r.basis || "", String(r.score),
        String(r.dirMatch || ""), String(list.length),
        list.map((d) => {
          const m = CS.dossierMechanism(d, r.key);
          return [d.ident, d.lane, d.verdict || "", d.held || "", m.did, m.counts,
                  m.countsBy, m.dir, m.multi].join("");
        }).join(""),
      ].join(""));
    }
  }
  return out;
}
const BEFORE = snapshot();

// ── The population: every instrument on every issue of every profile ─────────
const subjects = [];
for (const pid of Object.keys(win.CMP_DATA)) {
  let rows = [];
  try { rows = CS.issueRows(pid) || []; } catch (e) { continue; }
  for (const r of rows) {
    let list = [];
    try { list = CS.dossierItems(pid, r.key) || []; } catch (e) { continue; }
    list.forEach((d, i) => {
      let issues = [];
      try { issues = (d.item && d.item.issues) || []; } catch (e) { issues = []; }
      subjects.push({ pid, key: r.key, i, d, issues, multi: !!d.multi });
    });
  }
}
const multis = subjects.filter((s) => s.multi && s.issues.length >= 2);
const singles = subjects.filter((s) => s.issues.length === 1);

console.log(
  `subjects: ${subjects.length} instruments across ${new Set(subjects.map((s) => s.pid + "/" + s.key)).size} ` +
  `issue dossiers — ${multis.length} multi-issue, ${singles.length} single-issue`
);
ok(multis.length > 20, `only ${multis.length} multi-issue rows reached — the fixture stopped reaching the real data`);
ok(singles.length > 5, `only ${singles.length} single-issue rows reached — the negative case would be vacuous`);

// The worked example the request names. Everything below runs over the whole
// population, but this one row is checked by name so a regression that silences the
// trail on the biggest document in the file cannot hide behind aggregate counts.
const PL = multis.find((s) => s.d.ident.indexOf("Public Law 119-21") === 0 && s.key === "lower_taxes");
ok(!!PL, "Public Law 119-21 is no longer reachable from the 💰 taxes dossier — the worked example is gone");

/* ═══════════════════════════════════════════════════════════════════════════
   1 · the door is exactly where the caveat is
   ═══════════════════════════════════════════════════════════════════════════ */
section("1 · every multi-issue row offers the way out of its own caveat — and only those");

// One rendered list per issue that has any rows, parsed once.
const lists = new Map();
for (const s of subjects) {
  const k = s.pid + " " + s.key;
  if (!lists.has(k)) lists.set(k, CS.dossierRecordsHtml(s.pid, s.key) || "");
}
// Split the rendered list into its <details> rows so a control can be attributed to
// the row it is actually in, not merely to the page.
function rowsOf(html) {
  const out = [];
  const re = /<details class="pdxdos-rec" data-pdxdos-i="(\d+)"([\s\S]*?)(?=<details class="pdxdos-rec" |$)/g;
  let m;
  while ((m = re.exec(html))) out.push({ i: Number(m[1]), html: m[0] });
  return out;
}
let seenCtl = 0, seenNone = 0;
for (const [k, html] of lists) {
  const [pid, key] = k.split(" ");
  const rs = rowsOf(html);
  const list = CS.dossierItems(pid, key) || [];
  eq(rs.length, list.length, `${pid}/${key}: the rendered list lost or grew a row against dossierItems()`);
  for (const r of rs) {
    const d = list[r.i];
    if (!d) continue;
    const n = (d.item && d.item.issues && d.item.issues.length) || 0;
    const want = !!d.multi && n >= 2;
    const has = r.html.indexOf('data-pdxins-open="1"') !== -1;
    eq(has, want,
      `${pid}/${key} row ${r.i} (${d.ident}): the follow-through control is ` +
      `${has ? "present" : "missing"} but the row is ${want ? "multi-issue" : "not multi-issue"}`);
    if (!want) { seenNone++; continue; }
    seenCtl++;
    // The control belongs to the caveat, not to the row at large: it has to sit
    // inside the multi-issue span, after the sentence that raises the question.
    const cav = r.html.indexOf('class="pdxdos-rec-why pdxdos-rec-multi"');
    const btn = r.html.indexOf('data-pdxins-open="1"');
    ok(cav !== -1, `${pid}/${key} row ${r.i}: the multi-issue caveat span is gone`);
    ok(cav !== -1 && btn > cav,
      `${pid}/${key} row ${r.i}: the control is outside the caveat it is supposed to be the answer to`);
    ok(r.html.indexOf("mapped to " + n + " issues") !== -1,
      `${pid}/${key} row ${r.i}: the caveat no longer states the count the control promises to open`);
    ok(r.html.indexOf("See all " + n + " readings") !== -1,
      `${pid}/${key} row ${r.i}: the control's label disagrees with the caveat's count`);
    // Everything the delegated handler needs to rebuild L3 has to be on the row.
    ok(r.html.indexOf('data-pdxdos-pid="' + pid + '"') !== -1,
      `${pid}/${key} row ${r.i}: the row lost the profile id the handler mounts from`);
    ok(r.html.indexOf('data-pdxdos-key="' + key + '"') !== -1,
      `${pid}/${key} row ${r.i}: the row lost the issue key the handler mounts from`);
    ok(r.html.indexOf('data-pdxdos-body="1"') !== -1,
      `${pid}/${key} row ${r.i}: the row lost the body the trail gets mounted into`);
    // A control the reader cannot name is a control a screen reader cannot offer.
    ok(/aria-label="Follow [^"]*across all \d+ issues it was mapped to/.test(r.html),
      `${pid}/${key} row ${r.i}: the control has no accessible name naming the document and the count`);
  }
}
ok(seenCtl >= multis.length,
  `${seenCtl} rendered controls for ${multis.length} multi-issue rows — some row's door was never drawn`);
ok(seenNone > 0, "no single-issue row was rendered — the negative half of this section proved nothing");

/* ═══════════════════════════════════════════════════════════════════════════
   2 · the trail is the whole mapping, once
   ═══════════════════════════════════════════════════════════════════════════ */
section("2 · one row per issue the document was mapped to — no more, no fewer, no repeats");

const trails = [];
for (const s of multis) {
  const t = CS.instrumentTrail(s.pid, s.key, s.i);
  ok(!!t, `${s.pid}/${s.key} row ${s.i} (${s.d.ident}): a multi-issue row produced no trail`);
  if (!t) continue;
  trails.push({ s, t });
  eq(t.rows.length, t.count,
    `${s.d.ident} on ${s.key}: the trail printed a different number of rows than the count it states`);
  eq(t.rows.length, s.issues.length,
    `${s.d.ident} on ${s.key}: the trail's rows disagree with the document's own mapping list`);
  // Same issues, and each exactly once.
  const got = t.rows.map((r) => r.issueKey).sort();
  const want = s.issues.map((m) => m.issueKey).sort();
  eq(got.join(","), want.join(","),
    `${s.d.ident} on ${s.key}: the trail's issue set is not the document's mapping set`);
  eq(new Set(got).size, got.length,
    `${s.d.ident} on ${s.key}: an issue appears twice in the trail`);
  // Exactly one "you are here", and it is the issue we came from, and it is first.
  const here = t.rows.filter((r) => r.here);
  eq(here.length, 1, `${s.d.ident} on ${s.key}: the trail marks ${here.length} rows as the one being read`);
  if (here.length === 1) {
    eq(here[0].issueKey, s.key, `${s.d.ident} on ${s.key}: the trail marked the wrong row as "you are here"`);
    eq(t.rows[0].issueKey, s.key, `${s.d.ident} on ${s.key}: the issue being read is not the first row of its own trail`);
    ok(!here[0].door, `${s.d.ident} on ${s.key}: the local row offers a door back to the issue it is already on`);
  }
  // A door is offered only where one actually opens.
  for (const r of t.rows) {
    if (!r.door) continue;
    ok(!r.here, `${s.d.ident}: a door was drawn on the issue being read`);
    ok(!!CS.issueRows(s.pid).some((x) => x.key === r.issueKey),
      `${s.d.ident} → ${r.issueKey}: a door was drawn to an issue this profile has no row for`);
  }
}
ok(trails.length === multis.length, `${trails.length} trails built for ${multis.length} multi-issue rows`);
// And the negative: a document mapped to one issue has no trail to follow.
for (const s of singles) {
  eq(CS.instrumentTrail(s.pid, s.key, s.i), null,
    `${s.d.ident} on ${s.key}: a single-issue document produced a trail across itself`);
  eq(CS.instrumentTrailHtml(s.pid, s.key, s.i), "",
    `${s.d.ident} on ${s.key}: a single-issue document rendered a trail body`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   3 · the trail borrows; it never invents
   ═══════════════════════════════════════════════════════════════════════════ */
section("3 · every direction, verdict and sentence on the trail is read from the issue that owns it");

// The direction the block this trail replaces would have printed as a chip. Read
// from the same helper the chips came from, so "unchanged" is checked against the
// shipped derivation rather than against a copy of the new one.
function chipDirections(item, issueKey) {
  const ctx = win._measureOmnibusContext(item, issueKey, {}, { labelFn: (k) => k });
  if (!ctx) return null;
  const out = new Map();
  if (ctx.thisIssue) out.set(ctx.thisIssue.issueKey, ctx.thisIssue.effect);
  (ctx.others || []).forEach((c) => out.set(c.issueKey, c.effect));
  return out;
}
let borrowed = 0, heldSeen = 0, unlistedSeen = 0, curatedSeen = 0, derivedSeen = 0;
for (const { s, t } of trails) {
  const dirs = chipDirections(s.d.item, s.key);
  ok(!!dirs, `${s.d.ident} on ${s.key}: the omnibus context that supplies the directions is gone`);
  for (const r of t.rows) {
    // 3a — direction: identical to what the chip list already showed.
    if (dirs) {
      eq(r.effect, dirs.get(r.issueKey),
        `${s.d.ident} → ${r.issueKey}: the trail states a direction the shipped block did not`);
    }
    ok(r.effect === "advances" || r.effect === "opposes" || r.effect === "none",
      `${s.d.ident} → ${r.issueKey}: "${r.effect}" is not a direction this product knows`);
    if (r.here) continue;
    // 3b — verdict, hold and sentence: identical to that issue's own dossier row for
    // the same document, matched by published identifier rather than by object
    // reference (the pools are rebuilt per call, so references do not survive).
    const other = (CS.dossierItems(s.pid, r.issueKey) || []).filter(
      (d) => d.item && s.d.item &&
        (d.item.documentId || d.item.measureNumber || "") ===
        (s.d.item.documentId || s.d.item.measureNumber || "") &&
        (d.item.documentId || d.item.measureNumber || "") !== "");
    if (!other.length) {
      eq(r.listed, false,
        `${s.d.ident} → ${r.issueKey}: the trail claims a row that issue's own dossier does not list`);
      unlistedSeen++;
      continue;
    }
    eq(r.listed, true, `${s.d.ident} → ${r.issueKey}: the trail dropped a row that issue's dossier does list`);
    const d2 = other[0];
    const m2 = CS.dossierMechanism(d2, r.issueKey);
    borrowed++;
    eq(r.held, !!d2.held, `${s.d.ident} → ${r.issueKey}: the trail disagrees with that issue about whether it is held`);
    if (d2.held) {
      heldSeen++;
      eq(r.verdict, "", `${s.d.ident} → ${r.issueKey}: the trail printed a verdict on a document that issue holds back`);
      eq(r.vLabel, "", `${s.d.ident} → ${r.issueKey}: the trail printed a verdict label on a held document`);
      eq(r.heldWhy, d2.heldWhy || "", `${s.d.ident} → ${r.issueKey}: the trail rewrote that issue's hold reason`);
    } else {
      eq(r.verdict, d2.verdict || "", `${s.d.ident} → ${r.issueKey}: the trail's verdict is not that issue's verdict`);
      eq(r.counts, m2.counts, `${s.d.ident} → ${r.issueKey}: the trail's why-it-counts line is not that issue's line`);
      eq(r.countsBy, m2.countsBy, `${s.d.ident} → ${r.issueKey}: the trail re-classified that issue's sentence`);
      eq(r.needsCurator, m2.needsCurator,
        `${s.d.ident} → ${r.issueKey}: the trail disagrees about whether a curator still owes this link a sentence`);
      if (m2.countsBy === "curated") curatedSeen++;
      if (m2.countsBy === "derived") derivedSeen++;
    }
  }
}
ok(borrowed > 100, `only ${borrowed} cross-issue readings were checked against their own dossier`);
ok(curatedSeen > 0 && derivedSeen > 0,
  `the trail population must carry BOTH voices or the comparison is vacuous ` +
  `(curated=${curatedSeen} derived=${derivedSeen})`);
ok(heldSeen > 0, "no held cross-issue reading was reached — section 4's premise is untested");
console.log(`  ${borrowed} cross-issue readings verified against their own dossier ` +
  `(${curatedSeen} curated, ${derivedSeen} derived, ${heldSeen} held, ${unlistedSeen} mapped-but-unlisted)`);

/* ═══════════════════════════════════════════════════════════════════════════
   4 · it withholds what the local row withholds
   ═══════════════════════════════════════════════════════════════════════════ */
section("4 · a held reading stays held on the trail — direction dimmed, verdict absent, reason shown");

const htmls = new Map();
for (const { s } of trails) {
  htmls.set(s.pid + " " + s.key + " " + s.i, CS.instrumentTrailHtml(s.pid, s.key, s.i));
}
function rowSpans(html) {
  const out = [];
  // The lookahead has to distinguish the next ROW (class ends at pdxins-r) from the
  // row's own header (pdxins-rh), or every row is captured one tag deep.
  const re = /<div class="pdxins-r([^"]*)" data-pdxins-k="([^"]+)">([\s\S]*?)(?=<div class="pdxins-r["\s]|<p class="pdxins-foot")/g;
  let m;
  while ((m = re.exec(html))) out.push({ cls: m[1], key: m[2], html: m[3] });
  return out;
}
let dimmed = 0, lit = 0;
for (const { s, t } of trails) {
  const html = htmls.get(s.pid + " " + s.key + " " + s.i) || "";
  ok(!!html, `${s.d.ident} on ${s.key}: a trail with rows rendered nothing`);
  const spans = rowSpans(html);
  eq(spans.length, t.rows.length, `${s.d.ident} on ${s.key}: the rendered trail lost or grew a row`);
  for (let j = 0; j < spans.length; j++) {
    const sp = spans[j], r = t.rows[j];
    if (!r) continue;
    eq(sp.key, r.issueKey, `${s.d.ident} on ${s.key}: rendered row ${j} is not the ${j}th row of the trail`);
    const off = sp.html.indexOf("pdxins-off") !== -1;
    if (r.held || !r.listed) {
      dimmed++;
      ok(off, `${s.d.ident} → ${r.issueKey}: a withheld reading printed its direction at full strength`);
      ok(sp.html.indexOf("Not scored") !== -1 || sp.html.indexOf("No verdict here") !== -1,
        `${s.d.ident} → ${r.issueKey}: a withheld reading printed no notice in the verdict slot`);
      ok(sp.html.indexOf('class="pdxins-v" style=') === -1,
        `${s.d.ident} → ${r.issueKey}: a withheld reading printed a coloured verdict`);
      if (r.held && r.heldWhy) {
        ok(sp.html.indexOf("pdxins-hold") !== -1,
          `${s.d.ident} → ${r.issueKey}: the hold reason is not marked as one`);
      }
    } else {
      lit++;
      ok(!off, `${s.d.ident} → ${r.issueKey}: a scored reading had its direction dimmed`);
      ok(sp.html.indexOf(r.vLabel) !== -1,
        `${s.d.ident} → ${r.issueKey}: the rendered row does not carry the verdict the trail says it has`);
    }
    // 4b — the two voices from the row face are the two voices here. A trail must
    // not quietly promote a machine-derived link by relabelling it.
    if (r.counts && !r.held) {
      const want = r.countsBy === "derived" ? DERIVED_LABEL : CURATED_LABEL;
      const wrong = r.countsBy === "derived" ? CURATED_LABEL : DERIVED_LABEL;
      ok(sp.html.indexOf(want) !== -1, `${s.d.ident} → ${r.issueKey}: the trail row is missing the "${want}" label`);
      ok(sp.html.indexOf(wrong) === -1, `${s.d.ident} → ${r.issueKey}: the trail row wears the label reserved for the other voice`);
      eq(sp.html.indexOf("pdxins-why-d") !== -1, r.countsBy === "derived",
        `${s.d.ident} → ${r.issueKey}: the quiet styling does not match the sentence's provenance`);
      eq(sp.html.indexOf(MARK) !== -1, r.needsCurator,
        `${s.d.ident} → ${r.issueKey}: the awaiting-a-curator marker does not match the row's own state`);
    }
  }
  // 4c — the one sentence this view writes for itself, printed once, at the end.
  eq(html.split(FOOT_HEAD).length - 1, 1,
    `${s.d.ident} on ${s.key}: the trail's own explanatory line is missing or duplicated`);
  ok(html.indexOf("There is no combined score for the document itself.") !== -1,
    `${s.d.ident} on ${s.key}: the trail stopped saying that the document has no aggregate reading`);
  ok(html.indexOf(FOOT_HEAD) > html.lastIndexOf('data-pdxins-k="'),
    `${s.d.ident} on ${s.key}: the explanatory line moved above the evidence it explains`);
}
ok(dimmed > 0 && lit > 0, `both states must occur (dimmed=${dimmed} lit=${lit})`);

/* ═══════════════════════════════════════════════════════════════════════════
   5 · it replaces the disclosure, it does not add a panel
   ═══════════════════════════════════════════════════════════════════════════ */
section("5 · the trail lands inside the fold that was already there, in place of the chips");

for (const { s, t } of trails) {
  const l3 = CS.dossierDetailHtml(s.pid, s.key, s.i) || "";
  ok(l3.indexOf('data-pdxins="1"') !== -1, `${s.d.ident} on ${s.key}: L3 does not contain the trail`);
  // Exactly one multi-issue disclosure, and it is the trail's — not a second one.
  eq(l3.split('class="pdxgap-om-all"').length - 1, 1,
    `${s.d.ident} on ${s.key}: L3 grew a second multi-issue disclosure`);
  eq(l3.indexOf("pdxgap-om-chips") !== -1, false,
    `${s.d.ident} on ${s.key}: the chip list is still rendered alongside the trail it was replaced by`);
  ok(l3.indexOf('data-pdxins-det="1"') !== -1,
    `${s.d.ident} on ${s.key}: the disclosure holding the trail is not marked as holding it`);
  // The block's header and its counted rows are the shipped ones, untouched.
  ok(l3.indexOf("Multi-issue ") !== -1 && l3.indexOf(", " + t.count + " issues") !== -1,
    `${s.d.ident} on ${s.key}: the multi-issue block's header changed`);
  eq(l3.indexOf(t.splits ? "cuts both ways" : " cuts both ways") !== -1, t.splits,
    `${s.d.ident} on ${s.key}: the "cuts both ways" chip no longer matches the measured split`);
  // The trail is inside the collapsed fold, not loose in the panel above it.
  const det = l3.indexOf('class="pdxgap-om-all"');
  ok(det !== -1 && l3.indexOf('data-pdxins="1"') > det,
    `${s.d.ident} on ${s.key}: the trail escaped the disclosure it is supposed to live in`);
  ok(l3.indexOf("Follow this one document across all " + t.count + " issues") !== -1,
    `${s.d.ident} on ${s.key}: the fold's summary no longer says what opening it gives you`);
}
// The other caller of the same block — the gap sheet's evidence column — never asked
// for a trail and must still get exactly what it always got.
let chipCallers = 0;
for (const pid of Object.keys(win.CMP_DATA)) {
  let html = "";
  try { html = CS.gapViewHtml(pid, "lower_taxes") || ""; } catch (e) { continue; }
  if (html.indexOf("pdxgap-om-chips") !== -1) chipCallers++;
  // And the L2 list a reader sees first must not have gained the trail: this pass
  // adds one control to a sentence, not a panel to a list.
  const l2 = CS.dossierRecordsHtml(pid, "lower_taxes") || "";
  eq(l2.indexOf('data-pdxins="1"'), -1,
    `${pid}: the trail is being rendered into the collapsed row list instead of on demand`);
  eq(l2.indexOf(FOOT_HEAD), -1, `${pid}: the trail's explanatory line leaked into the row list`);
}
ok(chipCallers > 0,
  "no caller anywhere still renders the chip list — the trail was made mandatory instead of optional");

/* ═══════════════════════════════════════════════════════════════════════════
   6 · nothing moved
   ═══════════════════════════════════════════════════════════════════════════ */
section("6 · every score, verdict, item and sentence in the product is where it was");

const AFTER = snapshot();
eq(AFTER.length, BEFORE.length,
  `the product gained or lost ${AFTER.length - BEFORE.length} issue dossier(s) while trails were being built`);
let drift = 0;
for (let i = 0; i < Math.min(AFTER.length, BEFORE.length); i++) {
  if (AFTER[i] !== BEFORE[i]) {
    drift++;
    if (drift <= 3) fails.push(`row ${i} changed while trails were being built:\n    ${BEFORE[i]}\n    ${AFTER[i]}`);
  } else pass++;
}
eq(drift, 0, `${drift} issue row(s) drifted — the trail's cross-issue reads are not side-effect free`);

// The trail is a pure function of (profile, issue, index): built twice, byte-identical.
let repeats = 0;
for (const { s } of trails) {
  const a = htmls.get(s.pid + " " + s.key + " " + s.i) || "";
  const b = CS.instrumentTrailHtml(s.pid, s.key, s.i) || "";
  eq(b, a, `${s.d.ident} on ${s.key}: the trail rendered differently the second time it was asked for`);
  repeats++;
}
ok(repeats === trails.length, "not every trail was re-rendered for the idempotence check");

console.log(`  ${BEFORE.length} issue rows re-read after ${trails.length} trails were built and rendered`);

/* ═══════════════════════════════════════════════════════════════════════════ */
if (fails.length) {
  console.error(`\n✗ instrument trail: ${fails.length} failure(s) of ${pass + fails.length}\n`);
  fails.slice(0, 25).forEach((f) => console.error("  · " + f));
  if (fails.length > 25) console.error(`  … and ${fails.length - 25} more`);
  process.exit(1);
}
const followed = trails.reduce((n, t) => n + t.t.rows.length, 0);
console.log(`\n✓ instrument trail: all ${pass} assertions passed — ${trails.length} multi-issue rows ` +
  `now open onto ${followed} per-issue readings of the same documents`);
