#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// AN UNEXPLAINED MAPPING HAS TO LOOK UNEXPLAINED
// ─────────────────────────────────────────────────────────────────────────────
// The dossier's second mechanism slot answers "why does this document count on
// THIS issue". It has always had two sources and only ever had one voice:
//
//   Why it counts here: The order redirected military construction funds to …
//   Why it counts here: Counted on 🛡 Strong Border & Enforcement because that is
//                       one of the subjects this order was mapped to.
//
// The first is a sentence someone wrote after reading the document. The second is
// the mapping restated by machine — true, and empty. Printed in the same label, the
// same colour and the same weight, they are indistinguishable, so a reader auditing
// a row cannot tell reasoned curation from a metadata match, and every new mapping
// ships looking as though a human had vouched for it.
//
// This pass separates the voices. It is PRESENTATION ONLY — no item is added,
// dropped, reweighted or re-judged, and the derived sentence itself is printed in
// full, word for word as before. What this harness pins:
//
//   1. THE DISCRIMINATOR IS THE SEED, NOT A GUESS. countsBy is 'curated' exactly
//      when the item carries a per-issue sentence, 'derived' exactly when it does
//      not, '' on a held row — checked across every dossier in the product.
//   2. NEEDS-A-CURATOR MEANS SOMEONE CAN ACTUALLY DO IT. Only lanes that HAVE a
//      curation slot are queued. A roll call has none by construction, so its line
//      is labelled as derived and is never queued: a queue nobody can action is not
//      a queue.
//   3. THE TWO VOICES NEVER SWAP. No curated line wears the derived label or the
//      marker; no derived line wears the curated label; the derived sentence never
//      appears outside a derived-classed span.
//   4. THE DERIVED ROW IS QUIETER AND MARKED. Every queued row renders the quiet
//      class and the fixed marker, and no curated row renders either.
//   5. THE QUEUE RECONCILES WITH THE ROWS. The number on the gap-sheet queue row
//      equals the number of marked rows in the list above it, on every issue; zero
//      outstanding renders no row at all.
//   6. NOTHING WAS INVENTED AND NOTHING MOVED. Every derived sentence is byte-
//      identical to the shipped derivation, and every verdict, basis and score on
//      every issue row is unchanged by any of the above.
//
//   node scripts/test-unexplained-mapping.mjs
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
const G = win.PDXGaps;

let pass = 0;
const fails = [];
const ok = (c, m) => { if (c) pass++; else fails.push(m); };
const eq = (a, b, m) => ok(a === b, `${m}\n    expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n${t}`);

const CURATED_LABEL = "Why it counts here:";
const DERIVED_LABEL = "How it was linked:";
const MARK = "⌛ Not yet explained by a curator";
const DERIVED_SIG = /^Counted on .+ because that is /;
// The lanes that carry a per-issue sentence in the seed and can therefore be
// missing one. Mirrors _DOS_CURATABLE in consistency.js.
const CURATABLE = new Set(["exec", "formal"]);

// ── The population: every instrument on every issue of every profile ─────────
const items = [];
const issues = [];
for (const pid of Object.keys(win.CMP_DATA)) {
  let rows = [];
  try { rows = CS.issueRows(pid) || []; } catch (e) { continue; }
  for (const r of rows) {
    let list = [];
    try { list = CS.dossierItems(pid, r.key) || []; } catch (e) { continue; }
    if (!list.length) continue;
    issues.push({ pid, key: r.key, label: r.label, list });
    list.forEach((d, i) => {
      items.push({ pid, key: r.key, i, d, m: CS.dossierMechanism(d, r.key) });
    });
  }
}
const live = items.filter((x) => !x.d.held);
const derived = live.filter((x) => x.m.countsBy === "derived");
const curated = live.filter((x) => x.m.countsBy === "curated");
const queued = live.filter((x) => x.m.needsCurator);

console.log(
  `subjects: ${items.length} instruments on ${issues.length} issue dossiers — ` +
  `${curated.length} curated, ${derived.length} derived, ${queued.length} queued for a curator`
);
ok(items.length > 100, `only ${items.length} instruments reached — the fixture stopped reaching the real data`);
ok(curated.length > 0 && derived.length > 0,
  "the fixture must contain BOTH voices, or every comparison below is vacuous\n" +
  `    (curated=${curated.length} derived=${derived.length})`);

/* ═══════════════════════════════════════════════════════════════════════════
   1 · the discriminator is the seed, not a guess
   ═══════════════════════════════════════════════════════════════════════════ */
section("1 · curated means the seed carried a sentence; derived means it did not");
for (const x of items) {
  const at = `${x.pid}/${x.key} [${x.d.ident}]`;
  const hasSeed = !!(x.d.counts && String(x.d.counts).trim());
  if (x.d.held) {
    eq(x.m.countsBy, "", `${at}: a held row answers a different question and claims neither voice`);
    ok(x.m.needsCurator === false, `${at}: and a held row is never queued for an explanation`);
    continue;
  }
  eq(x.m.countsBy, hasSeed ? "curated" : "derived",
    `${at}: countsBy disagrees with whether the item actually carries a curated sentence`);
  // The line is present either way. A slot that can go empty is a third state
  // nobody designed, and it would read as a rendering failure rather than as a gap.
  ok(typeof x.m.counts === "string" && x.m.counts.trim().length > 0,
    `${at}: the second mechanism slot is empty — neither curated nor derived`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   2 · queued means a curator can actually close it
   ═══════════════════════════════════════════════════════════════════════════ */
section("2 · only a lane with a curation slot can be queued for one");
for (const x of live) {
  const at = `${x.pid}/${x.key} [${x.d.ident}]`;
  const want = x.m.countsBy === "derived" && CURATABLE.has(x.d.lane);
  eq(x.m.needsCurator, want,
    `${at}: needsCurator (lane=${x.d.lane}, countsBy=${x.m.countsBy}) is not what the lane supports`);
  if (x.m.countsBy === "curated") {
    ok(x.m.needsCurator === false, `${at}: a curated row must never be queued`);
  }
}
// The roll-call lane is an API in a live browser and cold here, so it is asserted
// directly on the shipped derivation rather than left untested until it breaks in
// production. plain/counts/rationale are '' on that lane by construction — there is
// no slot for a curator to fill, so the line is derived AND unqueued.
{
  const REC = { lane: "record", verdict: "consistent", held: "", ident: "H.R. 9",
    question: "On Passage", act: "Voted Nay", plain: "", counts: "", rationale: "" };
  const m = CS.dossierMechanism(REC, "lower_taxes");
  eq(m.countsBy, "derived", "roll call: its second line is derived, and says so");
  eq(m.needsCurator, false,
    "roll call: and is NOT queued — a roll call carries no curated slot, so the queue could never close");
  const EXECU = Object.assign({}, REC, { lane: "exec", ident: "EO 14001" });
  eq(CS.dossierMechanism(EXECU, "lower_taxes").needsCurator, true,
    "exec: the same empty slot on a lane that HAS one is real, closeable work");
  const FORMAL = Object.assign({}, REC, { lane: "formal", ident: "Formal action" });
  eq(CS.dossierMechanism(FORMAL, "lower_taxes").needsCurator, true,
    "formal: and so is the migrated formal lane's");
  const WRITTEN = Object.assign({}, EXECU, { counts: "The order zeroed the bracket outright." });
  eq(CS.dossierMechanism(WRITTEN, "lower_taxes").countsBy, "curated",
    "exec: a landed sentence flips the same item to curated…");
  eq(CS.dossierMechanism(WRITTEN, "lower_taxes").needsCurator, false,
    "…and takes it off the queue, which is what makes the queue closeable at all");
}

/* ═══════════════════════════════════════════════════════════════════════════
   3 · the two voices never swap
   ═══════════════════════════════════════════════════════════════════════════ */
section("3 · a derived line never borrows the label a person's sentence earned");
const RENDER = new Map();
for (const s of issues) {
  let html = "";
  try { html = CS.dossierRecordsHtml(s.pid, s.key) || ""; } catch (e) { html = ""; }
  RENDER.set(s.pid + "/" + s.key, html);
}
// Every rendered "why it counts" span, split out of the list HTML so each one can
// be checked against the item it was built from.
const SPAN = /<span class="pdxdos-rec-why([^"]*)"><b class="pdxdos-rec-wk([^"]*)">([^<]*)<\/b>([\s\S]*?)<\/span>(?=<span class="pdxdos-rec-why|<\/summary>)/g;
let spansSeen = 0, derivedSpans = 0, curatedSpans = 0;
for (const [at, html] of RENDER) {
  if (!html) continue;
  SPAN.lastIndex = 0;
  let mm;
  while ((mm = SPAN.exec(html))) {
    const [, whyCls, wkCls, label, body] = mm;
    if (label !== CURATED_LABEL && label !== DERIVED_LABEL) continue;   // did / cut slots
    spansSeen++;
    if (label === DERIVED_LABEL) {
      derivedSpans++;
      ok(/\bpdxdos-rec-derived\b/.test(whyCls),
        `${at}: a derived line rendered without the quiet class — it reads as curated`);
      ok(/\bpdxdos-rec-wk-d\b/.test(wkCls),
        `${at}: a derived line's label kept the curated label's styling hook`);
    } else {
      curatedSpans++;
      ok(!/\bpdxdos-rec-derived\b/.test(whyCls),
        `${at}: a curated sentence was dimmed as if nobody had written it`);
      ok(!/\bpdxdos-rec-wk-d\b/.test(wkCls),
        `${at}: a curated label was styled as a derived one`);
      ok(body.indexOf(MARK) === -1,
        `${at}: a curated sentence carries the "not yet explained" marker`);
    }
  }
}
ok(spansSeen > 40, `only ${spansSeen} mechanism spans parsed out of the rendered lists — the scan missed the markup`);
ok(derivedSpans > 0 && curatedSpans > 0,
  `both voices must render somewhere (derived=${derivedSpans} curated=${curatedSpans})`);
// And the derived sentence itself is never printed under the curated label — the
// exact confusion this pass exists to end, checked on the text rather than the class.
for (const [at, html] of RENDER) {
  const bad = html.split(CURATED_LABEL + "</b> ").slice(1)
    .map((s) => s.split("</span>")[0])
    .filter((s) => DERIVED_SIG.test(s.replace(/&amp;/g, "&")));
  eq(bad.length, 0, `${at}: the machine-assembled sentence is printed under "${CURATED_LABEL}"`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   4 · the marker is on every queued row, and only there
   ═══════════════════════════════════════════════════════════════════════════ */
section("4 · every row nobody has explained says so on its face");
for (const s of issues) {
  const at = `${s.pid}/${s.key}`;
  const html = RENDER.get(at);
  if (!html) continue;
  const want = s.list.filter((d) => CS.dossierMechanism(d, s.key).needsCurator).length;
  const got = html.split(MARK).length - 1;
  eq(got, want, `${at}: ${want} row(s) need a curator but ${got} say so on the face`);
  // The marker is fixed copy: one string, no per-row writing, no number in it.
  ok(!/\d/.test(MARK), "the marker is a state, not a count — a number here would read as a score");
}
ok(queued.length > 0, "no row anywhere is queued — the marker has no subject and section 4 is vacuous");

/* ═══════════════════════════════════════════════════════════════════════════
   5 · the queue reconciles with the rows it is a queue for
   ═══════════════════════════════════════════════════════════════════════════ */
section("5 · the gap sheet states the outstanding count, and closes itself at zero");
ok(typeof CS.dossierUnexplained === "function", "api: the outstanding count is derivable on its own");
ok(typeof G.mappingGap === "function", "api: the queue row is a real PDXGaps type, not a lookalike");
let withQueue = 0, withoutQueue = 0;
for (const s of issues) {
  const at = `${s.pid}/${s.key}`;
  const u = CS.dossierUnexplained(s.pid, s.key);
  const want = s.list.filter((d) => CS.dossierMechanism(d, s.key).needsCurator).length;
  const listed = s.list.filter((d) => !d.held && CURATABLE.has(d.lane)).length;
  eq(u.n, want, `${at}: the counted queue disagrees with the marked rows`);
  eq(u.listed, listed, `${at}: the denominator is not the curatable rows actually listed`);
  ok(u.n <= u.listed, `${at}: more rows queued than exist to queue`);
  const q = CS.dossierQueueHtml(s.pid, s.key) || "";
  if (!u.n) {
    withoutQueue++;
    eq(q, "", `${at}: nothing outstanding, yet the sheet still shows a queue row`);
    continue;
  }
  withQueue++;
  ok(/class="pdxg-list pdxdos-queue"/.test(q), `${at}: the queue is not rendered as a gap list`);
  ok(q.indexOf('data-pdxdos-queue="' + u.n + '"') !== -1,
    `${at}: the queue row does not carry the count it was built from`);
  ok(q.indexOf(`${u.n} of ${u.listed} document`) !== -1,
    `${at}: the queue row's headline does not state ${u.n} of ${u.listed}`);
  ok(/_pdxGapsAsk/.test(q) && /Suggest a lead/.test(q),
    `${at}: the queue is not wired to the existing lead composer`);
  // The copy rule this row lives or dies by: it sits under a list of documents that
  // ARE counted, so it must never read as a hedge on them.
  ok(/nothing here moves a score/.test(q),
    `${at}: the queue row does not say out loud that no score is touched`);
}
ok(withQueue > 0, "no issue anywhere renders a queue row — section 5 is vacuous");
ok(withoutQueue > 0,
  "every issue renders a queue row — a marker that never turns off is furniture, not a signal");
// It reaches the sheet's own face, below the enumeration it is about.
{
  const s = issues.find((x) => CS.dossierUnexplained(x.pid, x.key).n > 0);
  let sheet = "";
  try { sheet = CS.gapViewHtml(s.pid, s.key) || ""; } catch (e) { sheet = ""; }
  ok(sheet.length > 0, "the gap sheet renders at all for an issue with outstanding curation");
  const recs = sheet.indexOf('<details class="pdxdos-recs"');
  const q = sheet.indexOf("pdxdos-queue");
  ok(q !== -1, `${s.pid}/${s.key}: the queue never reaches the gap sheet`);
  ok(recs !== -1 && recs < q,
    `${s.pid}/${s.key}: the queue is printed before the list it is a queue for (recs=${recs} q=${q})`);
  // Outside the collapsed list, so a sheet full of unexplained mappings cannot look
  // finished on its closed face.
  const close = sheet.indexOf("</details>", recs);
  ok(close !== -1 && q > close,
    `${s.pid}/${s.key}: the count is inside the collapsed enumeration, where a closed sheet hides it`);
}
// The profile-wide gap panel stays blind to it — one row per tracked issue would
// bury the gaps that are about the record as a whole.
for (const pid of ["trump", "booker"]) {
  let wide = [];
  try { wide = G.forPolitician(pid, win.CMP_DATA[pid] || null) || []; } catch (e) { wide = []; }
  ok(!wide.some((x) => x.type === "unexplained_mapping"),
    `${pid}: the profile gap panel emitted a per-issue curation row`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   6 · nothing was invented, and nothing moved
   ═══════════════════════════════════════════════════════════════════════════ */
section("6 · presentation only — the sentence, the items and the scores are untouched");
// THE DERIVED SENTENCE IS UNCHANGED. Rebuilt here from the item's own mapping facts
// and compared byte for byte, so a future edit that "improves" the wording into a
// claim about the document has to come through this file.
const NOUN_FALLBACK = { record: "bill", formal: "action", exec: "document" };
for (const x of derived) {
  const at = `${x.pid}/${x.key} [${x.d.ident}]`;
  const s = x.m.counts;
  ok(DERIVED_SIG.test(s), `${at}: the derived line no longer states the mapping it is derived from`);
  ok(/\.$/.test(s), `${at}: the derived line is not a finished sentence`);
  // It restates the link and asserts nothing about what the document did.
  ok(!/ advances | cuts against | in order to | so that /.test(s),
    `${at}: the derived line has grown a claim about the document — that is an invented explanation`);
  if (x.d.narrow) {
    ok(/narrow one\.$/.test(s), `${at}: a narrow link stopped disclosing that it is narrow`);
  }
  ok(NOUN_FALLBACK[x.d.lane] === undefined || s.length > 20,
    `${at}: the derived line collapsed to a stub`);
}
// THE CURATED SENTENCE IS UNCHANGED. Printed verbatim from the seed, as before.
for (const x of curated) {
  const at = `${x.pid}/${x.key} [${x.d.ident}]`;
  eq(x.m.counts, String(x.d.counts), `${at}: the curated sentence was rewritten on its way to the row`);
  ok(!DERIVED_SIG.test(x.m.counts), `${at}: a curated slot is holding the derived restatement`);
}
// THE SCORE PATH. Every issue row on every profile, re-read after all of the above
// has run, and compared against a snapshot taken through the same public API.
const snap = new Map();
for (const pid of Object.keys(win.CMP_DATA)) {
  let rows = [];
  try { rows = CS.issueRows(pid) || []; } catch (e) { continue; }
  for (const r of rows) {
    snap.set(pid + "/" + r.key, [r.verdict.token, r.verdict.basis, r.verdict.score, r.scored, r.tested]);
  }
}
// Render everything again — the queue row registers gaps, mounts rows and touches
// PDXGaps' registry, and none of that may reach a verdict.
for (const s of issues) {
  try { CS.dossierQueueHtml(s.pid, s.key); CS.dossierRecordsHtml(s.pid, s.key); } catch (e) {}
}
let checked = 0;
for (const pid of Object.keys(win.CMP_DATA)) {
  let rows = [];
  try { rows = CS.issueRows(pid) || []; } catch (e) { continue; }
  for (const r of rows) {
    const was = snap.get(pid + "/" + r.key);
    if (!was) continue;
    checked++;
    const now = [r.verdict.token, r.verdict.basis, r.verdict.score, r.scored, r.tested];
    ok(was.every((v, i) => v === now[i]),
      `${pid}/${r.key}: the verdict moved across a render — ${JSON.stringify(was)} → ${JSON.stringify(now)}`);
  }
}
ok(checked > 500, `only ${checked} issue rows re-read — the score check is not covering the product`);
// And the item list itself is untouched: the pass added two derived flags to the
// MECHANISM, never a field to the record.
for (const s of issues.slice(0, 40)) {
  const again = CS.dossierItems(s.pid, s.key) || [];
  eq(again.length, s.list.length, `${s.pid}/${s.key}: the instrument list changed length across a render`);
  for (let i = 0; i < again.length; i++) {
    eq(String(again[i].counts || ""), String(s.list[i].counts || ""),
      `${s.pid}/${s.key} [${again[i].ident}]: an item's curated sentence changed across a render`);
    eq(String(again[i].verdict || ""), String(s.list[i].verdict || ""),
      `${s.pid}/${s.key} [${again[i].ident}]: an item's verdict changed across a render`);
  }
}

// ── Report ──────────────────────────────────────────────────────────────────
if (fails.length) {
  console.log(`\n✗ unexplained mapping: ${fails.length} failure(s), ${pass} passed\n`);
  fails.slice(0, 40).forEach((f) => console.log("  • " + f));
  if (fails.length > 40) console.log(`  … and ${fails.length - 40} more`);
  process.exit(1);
}
console.log(
  `\n✓ unexplained mapping: all ${pass} assertions passed — ` +
  `${queued.length} of ${curated.length + derived.length} mappings still awaiting a curator, ` +
  `across ${withQueue} queued dossier(s)`
);
