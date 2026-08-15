#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// WHEN THE TWO RECORDS DISAGREE, THE ROW SAYS WHY
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex keeps two records apart on purpose. The formal record — laws signed,
// orders issued, votes cast — decides an issue and feeds the profile's Direction
// Match. The public record — statements, interviews, reported controversies — is
// a separate test of the same stance and is never inside that number.
//
// That wall is correct, and both lanes are now printed on every stance row and
// rendered side by side in the issue dossier. Which means a reader can see them
// disagree, and had nothing telling them what that means. The readings they reach
// unaided are all wrong: that the site is contradicting itself, that one lane is
// correcting the other, or that a split is by itself proof of a lie.
//
// So a short fixed explainer now prints at the point of confusion. This harness
// holds it to the six things that make it trustworthy rather than decorative:
//
//   1. IT IS RARE AND IT IS SHAPED. The detector fires only on rows where the two
//      lanes genuinely read differently, never on a row still loading its record,
//      never on a row with no stated position, and never where the lanes agree.
//   2. THE COPY IS FIXED PER SHAPE. Every row landing in a shape gets that shape's
//      words verbatim — no per-row phrasing, so the same situation cannot be
//      explained two ways on two profiles.
//   3. EVERY VARIANT TEACHES ALL FOUR THINGS. What a binding instrument can show
//      that a statement cannot; what a public item catches that an instrument
//      misses; that neither lane corrects the other; and that only the formal lane
//      feeds Direction Match.
//   4. IT NEVER GRADES. No percentage, no verdict word, no second score — the band
//      explains a boundary, it does not re-decide the row.
//   5. IT APPEARS WHERE THE CONFUSION IS. Full band in the dossier, directly below
//      the two lane panels and above the full enumeration; compact line on the
//      stance row, directly below the public tally, opening the same band.
//   6. THE SCORE PATH IS UNTOUCHED. Every row's verdict, basis and score are
//      re-read after the explainer has been built and must be what they were.
//
//   node scripts/test-lane-disagreement.mjs
//
// Runs the shipped renderer over the shipped data in one node:vm sandbox. Member
// roll-call rows are an API in a live browser and cold here, so they resolve to
// `pending` and the detector is required to stay silent on them — which is itself
// one of the assertions below.

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
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n${t}`);

const text = (html) =>
  String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

// ── The population ───────────────────────────────────────────────────────────
const SHAPES = [
  "formal_against_public_backs",
  "formal_backs_public_against",
  "mixed_vs_onesided",
  "formal_against_public_quiet",
  "public_only",
  "flags_only",
];
const hits = [];
const rows = [];
for (const pid of Object.keys(win.CMP_DATA)) {
  let rr = [];
  try { rr = CS.issueRows(pid) || []; } catch (e) { continue; }
  for (const r of rr) {
    rows.push({ pid, r });
    const g = CS.laneDisagreement(r);
    if (g) hits.push({ pid, key: r.key, label: r.label, r, g });
  }
}
console.log(`${rows.length} issue rows · ${hits.length} carry a lane-disagreement explainer`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the detector fires on a shape, and only on a shape");
// ═════════════════════════════════════════════════════════════════════════════
ok(hits.length > 0, "no row in the shipped data reaches the explainer at all");
// It has to stay rare or it stops being read. A ceiling rather than an exact
// number, so curation adding public receipts does not break the build.
ok(hits.length < rows.length * 0.1,
  `the explainer fires on ${hits.length} of ${rows.length} rows — too common to read as an exception`);

for (const h of hits) {
  const where = `${h.pid}/${h.key}`;
  ok(SHAPES.indexOf(h.g.shape) !== -1, `${where}: unknown shape ${h.g.shape}`);
  const v = h.r.verdict || {};
  const p = h.r.public || {};
  // NEVER ON A WARMING OR UNSTATED ROW.
  ok(v.token !== "pending", `${where}: explainer drawn on a row still loading its record`);
  ok(v.token !== "no_stance", `${where}: explainer drawn on a row with no stated position`);
  ok(!(h.r.ov && h.r.ov.token === "pending"), `${where}: explainer drawn over a pending action lane`);

  const backs = p.supporting || 0, agn = p.contradicting || 0, flags = p.flags || 0;
  const dir = backs + agn;
  const formal = (v.basis === "action" &&
    (v.token === "consistent" || v.token === "contradicts" || v.token === "mixed")) ? v.token : "none";

  // AND THE SHAPE MATCHES THE FACTS THE ROW MODEL CARRIES. Each of these is the
  // situation the shape's copy describes; a shape whose row does not hold it is a
  // sentence telling the reader something untrue about their own screen.
  switch (h.g.shape) {
    case "public_only":
      ok(formal === "none" && dir > 0, `${where}: public_only on formal=${formal} dir=${dir}`);
      break;
    case "flags_only":
      ok(formal !== "none" && dir === 0 && flags > 0, `${where}: flags_only on dir=${dir} flags=${flags}`);
      break;
    case "formal_against_public_backs":
      ok(formal === "contradicts" && backs > 0 && agn === 0, `${where}: bad formal_against_public_backs`);
      break;
    case "formal_against_public_quiet":
      ok(formal === "contradicts" && (p.count || 0) === 0, `${where}: bad formal_against_public_quiet`);
      break;
    case "formal_backs_public_against":
      ok(formal === "consistent" && agn > 0, `${where}: bad formal_backs_public_against`);
      break;
    case "mixed_vs_onesided":
      ok(formal === "mixed" && dir > 0 && (backs === 0 || agn === 0), `${where}: bad mixed_vs_onesided`);
      break;
  }
}

// AND SILENCE WHERE THE LANES AGREE. The commonest agreement — a formal reading
// with a public record pointing the same way — must draw nothing, or the band
// becomes a decoration on every row and stops meaning anything.
let agreeChecked = 0;
for (const { pid, r } of rows) {
  const v = r.verdict || {}, p = r.public || {};
  const backs = p.supporting || 0, agn = p.contradicting || 0;
  if (v.basis !== "action") continue;
  const agrees =
    (v.token === "consistent" && backs > 0 && agn === 0) ||
    (v.token === "contradicts" && agn > 0 && backs === 0) ||
    (v.token === "mixed" && backs > 0 && agn > 0);
  if (!agrees) continue;
  agreeChecked++;
  ok(!CS.laneDisagreement(r), `${pid}/${r.key}: explainer drawn on a row where both lanes agree`);
}
ok(agreeChecked > 0, "no both-lanes-agree row was available to check the detector's silence against");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the copy is fixed per shape, never per row");
// ═════════════════════════════════════════════════════════════════════════════
const SH = CS.laneShapes();
ok(Object.keys(SH).length === SHAPES.length,
  `the copy matrix carries ${Object.keys(SH).length} variants, expected ${SHAPES.length}`);
for (const s of SHAPES) ok(!!SH[s], `the copy matrix is missing the ${s} variant`);

for (const s of Object.keys(SH)) {
  const c = SH[s];
  for (const [k, val] of [["head", c.head], ["lead", c.lead], ["chip", c.chip]]) {
    ok(typeof val === "string" && val.trim().length > 0, `${s}.${k} is empty`);
    ok(val === val.trim(), `${s}.${k} carries stray whitespace`);
  }
  // SHORT. A wall of text at the point of confusion is a wall, not an explanation.
  ok(c.lead.length <= 300, `${s}.lead is ${c.lead.length} chars — over the 300 the band is sized for`);
  ok(c.chip.length <= 40, `${s}.chip is ${c.chip.length} chars — too long for a stance row`);
  ok(/[.!?]$/.test(c.lead), `${s}.lead does not end in a full stop`);
  // NO GRADE. The band explains a boundary; a number or a verdict word inside it
  // would read as a third reading of the row.
  ok(!/\d\s*%/.test(c.lead + c.head + c.chip), `${s}: the copy carries a percentage`);
}
// Two rows landing in the same shape must read identically.
const byShape = {};
for (const h of hits) (byShape[h.g.shape] = byShape[h.g.shape] || []).push(h);
for (const s of Object.keys(byShape)) {
  const group = byShape[s];
  for (const h of group) {
    ok(h.g.head === SH[s].head && h.g.lead === SH[s].lead && h.g.chip === SH[s].chip,
      `${h.pid}/${h.key}: ${s} rendered copy that is not the shape's fixed copy`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · every variant teaches all four things");
// ═════════════════════════════════════════════════════════════════════════════
// Asserted on the RENDERED band for a real row of each shape, not on the copy
// table — the shared lines are what carry three of the four, and a refactor that
// dropped them would leave the table passing and the reader unserved.
//
// A synthetic row stands in for any shape the shipped data does not currently
// reach, so a variant cannot rot unnoticed while it waits for its first real row.
const SYNTH = {
  formal_against_public_backs: {
    pid: "_synthetic", key: "_synthetic", label: "Synthetic",
    stance: { key: "x", label: "Stated" },
    verdict: { token: "contradicts", basis: "action", label: "Says one thing, does another" },
    public: { count: 2, supporting: 2, contradicting: 0, flags: 0, judged: true },
    ov: { token: "contradicts" },
  },
};
for (const s of SHAPES) {
  const real = (byShape[s] || [])[0];
  const row = real ? real.r : SYNTH[s];
  ok(!!row, `no row — real or synthetic — available to render the ${s} variant`);
  if (!row) continue;
  const g = CS.laneDisagreement(row);
  ok(g && g.shape === s, `${s}: the stand-in row does not resolve to this shape`);
  if (!g || g.shape !== s) continue;
  const t = text(CS.laneBandHtml(row));
  const src = real ? `${real.pid}/${real.key}` : "synthetic row";

  has(t, g.head, `${s} band (${src}): the shape's header`);
  has(t, g.lead, `${s} band (${src}): the shape's lead`);
  // (a) what a binding instrument shows that a statement cannot
  has(t, "Binding and dated", `${s} band (${src}): what the formal lane can show`);
  ok(/It cannot show what they meant/.test(t), `${s} band (${src}): what the formal lane cannot show`);
  // (b) what public items catch that the formal record misses
  ok(/Sourced but not binding/.test(t), `${s} band (${src}): what the public lane is`);
  ok(/never reached a vote/.test(t), `${s} band (${src}): what the public lane catches`);
  // (c) neither lane corrects the other
  ok(/Neither record corrects the other/.test(t), `${s} band (${src}): the no-correction line`);
  ok(/never merged/.test(t), `${s} band (${src}): the no-merge line`);
  // (d) only the formal lane feeds Direction Match
  ok(/Only the formal record feeds/.test(t) && /Direction Match/.test(t),
    `${s} band (${src}): which lane feeds the score`);
  ok(/public record is never counted in it/.test(t),
    `${s} band (${src}): that the public lane is not in the score`);
  // NO GRADE, on the rendered band.
  ok(!/\d\s*%/.test(t), `${s} band (${src}): a percentage reached the explainer`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · it appears where the confusion is");
// ═════════════════════════════════════════════════════════════════════════════
// THE DOSSIER. The band must sit BELOW the two lane panels — a reader meets the
// disagreement and then its explanation, never the other way round — and ABOVE
// the full enumeration of instruments, which is a different question entirely.
let dossierChecked = 0;
for (const s of Object.keys(byShape)) {
  const h = byShape[s][0];
  let view = "";
  try { view = CS.gapViewHtml(h.pid, h.key) || ""; } catch (e) { view = ""; }
  ok(!!view, `${h.pid}/${h.key}: the dossier failed to assemble`);
  if (!view) continue;
  dossierChecked++;
  const iSides = view.indexOf('class="pdxgap-sides');
  const iBand = view.indexOf("data-pdxgap-lanes=");
  const iRecs = view.indexOf('class="pdxdos-recs');
  ok(iSides !== -1, `${h.pid}/${h.key}: the two lane panels are missing`);
  ok(iBand !== -1, `${h.pid}/${h.key} (${s}): the explainer is missing from the dossier`);
  ok(iBand > iSides, `${h.pid}/${h.key} (${s}): the explainer renders above the lanes it explains`);
  if (iRecs !== -1) {
    ok(iBand < iRecs, `${h.pid}/${h.key} (${s}): the explainer renders below the full enumeration`);
  }
  has(view, `data-pdxgap-lanes="${s}"`, `${h.pid}/${h.key}: the band is tagged with its shape`);
}
ok(dossierChecked === Object.keys(byShape).length, "not every populated shape was checked in the dossier");

// THE STANCE ROW. A compact line, under the public tally, that opens the same
// band — and it must be a door, not a second copy of the explanation.
let rowChecked = 0;
for (const s of Object.keys(byShape)) {
  const h = byShape[s][0];
  let html = "";
  try { html = CS.stancesSectionHtml ? CS.stancesSectionHtml(h.pid) : ""; } catch (e) { html = ""; }
  if (!html) continue;
  rowChecked++;
  has(html, `data-pdxst-lanes="${s}"`, `${h.pid} stance list (${s}): the compact line is missing`);
  has(html, 'data-pdxst-focus="lanes"', `${h.pid} stance list: the line does not open the band`);
  has(html, h.g.chip, `${h.pid} stance list (${s}): the shape's chip`);
  // The row carries the lesson and the door; the paragraph stays in the dossier.
  ok(html.indexOf(h.g.lead) === -1,
    `${h.pid} stance list (${s}): the full lead was inlined on the row instead of linked`);
  // AND THE LINE SITS UNDER THE PUBLIC TALLY IT IS ABOUT.
  const iPub = html.indexOf('data-pdxst-pub=');
  const iLane = html.indexOf('data-pdxst-lanes=');
  ok(iPub !== -1 && iLane > iPub,
    `${h.pid} stance list (${s}): the explainer line does not follow the public tally`);
}
ok(rowChecked > 0, "no stance list could be rendered to check the compact line");

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the public lane keeps its own disclosure");
// ═════════════════════════════════════════════════════════════════════════════
// The explainer is an addition, not a replacement. "Not in Direction Match" is the
// standing per-row disclosure and it must still be on every row that had it.
for (const s of Object.keys(byShape)) {
  const h = byShape[s][0];
  let html = "";
  try { html = CS.stancesSectionHtml ? CS.stancesSectionHtml(h.pid) : ""; } catch (e) { html = ""; }
  if (!html) continue;
  has(html, "Not in Direction Match", `${h.pid} stance list (${s}): the standing disclosure was dropped`);
}
// And the dossier's own wall line survives on the two-column form.
for (const s of Object.keys(byShape)) {
  const h = byShape[s][0];
  if ((h.r.public || {}).count === 0) continue;
  let view = "";
  try { view = CS.gapViewHtml(h.pid, h.key) || ""; } catch (e) { view = ""; }
  if (!view) continue;
  has(view, "Kept out of the", `${h.pid}/${h.key} (${s}): the 🧾 column's wall line was dropped`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the score path is untouched");
// ═════════════════════════════════════════════════════════════════════════════
// Captured before, re-read after every band and every stance list above was built.
for (const { pid, r } of rows) {
  const fresh = CS.issueRows(pid).find((x) => x.key === r.key);
  if (!fresh) { ok(false, `${pid}/${r.key}: row vanished from the model`); continue; }
  ok(fresh.verdict.token === r.verdict.token,
    `${pid}/${r.key}: verdict moved (${r.verdict.token} → ${fresh.verdict.token})`);
  ok(fresh.verdict.basis === r.verdict.basis,
    `${pid}/${r.key}: deciding lane moved (${r.verdict.basis} → ${fresh.verdict.basis})`);
  ok(fresh.verdict.score === r.verdict.score,
    `${pid}/${r.key}: score moved (${r.verdict.score} → ${fresh.verdict.score})`);
}
// The explainer is a pure read of the row model: calling it must not mutate one.
for (const h of hits.slice(0, 40)) {
  const before = JSON.stringify({ v: h.r.verdict, p: h.r.public });
  CS.laneDisagreement(h.r);
  CS.laneBandHtml(h.r);
  ok(JSON.stringify({ v: h.r.verdict, p: h.r.public }) === before,
    `${h.pid}/${h.key}: building the explainer mutated the row model`);
}

// ── verdict ──────────────────────────────────────────────────────────────────
console.log("");
if (fails.length) {
  for (const f of fails.slice(0, 40)) console.error("  ✗ " + f);
  if (fails.length > 40) console.error(`  … and ${fails.length - 40} more`);
  console.error(`\n✗ lane disagreement: ${fails.length} failed, ${pass} passed`);
  process.exit(1);
}
const shapesSeen = Object.keys(byShape).length;
console.log(
  `✓ lane disagreement: all ${pass} assertions passed — ` +
  `${hits.length} rows explained across ${shapesSeen} live shape(s) of ${SHAPES.length} defined`
);
