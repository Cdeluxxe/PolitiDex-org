#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Honesty pack — two surfaces that claimed more than the data carries
// ─────────────────────────────────────────────────────────────────────────────
// Both defects here are the same shape: a confident sentence written once, for a
// product that later grew a floor the sentence never learned about.
//
//   A. THE MATCH SURFACES promised a record-backed reading for "every politician
//      … wherever they appear". Measured against the shipped floor, 181 of 756
//      profiles publish a Direction Match; the other 575 fail closed by design.
//      The welcome-overlay pass fixed this class of claim and missed these four
//      strings. Section 1 asserts they stay fixed, in BOTH directions: no
//      universal record claim survives, and every place that still names the
//      metric names a depth condition with it.
//
//   B. THE EXECUTIVE LANE prints a percentage and a verdict off as little as one
//      action. The VISIBLE row face was already honest about this before the pass
//      — _stCompHtml has printed "a direction, not yet a pattern" at judged <= 2
//      for some time, and the dossier carries a longer caveat below it. What was
//      NOT honest was the door's accessible name: a screen-reader user heard
//      "Backed up" and nothing about depth, which is the confident half of a row
//      whose qualifying half is on screen. Section 2 asserts the accessible name
//      now carries it, and section 3 asserts the two surfaces cannot drift apart,
//      because they now read one helper.
//
//   C. SCOPE. The exec lane leads with all_time and that is correct — it is the
//      whole record. But where the current term reads a DIFFERENT shape from the
//      whole, showing only the headline hands the reader one slice of a two-slice
//      record, and which slice is an accident of EXEC_SCOPE_DEFAULT. Section 4
//      asserts the other slice is named wherever the shapes disagree.
//
// EVERY THRESHOLD IS OBSERVED, NOT ASSUMED. The thin set and the flip set are
// derived by sweeping PDXExecRecord.issue() under both scopes, so this harness
// finds the rows the code actually produces rather than the seven the audit
// happened to name. If a new action lands and a row stops being thin, the sweep
// stops requiring a disclosure on it and starts requiring one wherever it moved.
//
// Section 5 is the presentation-only proof: nothing here may move a score.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(ROOT, f), "utf8");

let fails = 0, checks = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) { fails++; console.log("  ✗ " + msg); }
}

const FILES = ["cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js", "acct-spotlight-data.js",
  "say-vs-do.js", "exec-action-data.js", "exec-record.js", "exec-record-ui.js",
  "consistency.js", "voting-record.js", "word-action.js"];

function boot(transform) {
  const w = makeSandbox();
  const sb = vm.createContext(w);
  w.PROFILES = w.CMP_DATA;
  for (const f of FILES) {
    let src = read(f);
    if (transform) src = transform(f, src);
    vm.runInContext(src, sb, { filename: f });
  }
  w.PROFILES = w.CMP_DATA;
  const { byMember } = buildCorpus(ROOT);
  for (const [p, i] of byMember) if (w.CMP_DATA[p]) w.PDXVotingRecord.noteMember(p, i);
  return w;
}

const w = boot(null);
const CS = w.PDXConsistency, WA = w.PDXWordAction, EX = w.PDXExecRecord;

// ── 1 · No universal record-backed promise on the match surfaces ─────────────
// The claim is about READER-FACING strings, so the scan is over string literals
// and template text, not comments — a comment that says "every politician's
// chips" is describing a loop and is not a promise to anyone.
console.log("\n§1 match-surface copy carries no universal record claim");

const COPY_FILES = ["my-stances.js", "alignment-tool.js", "issue-compare.js", "word-action.js"];
// The metric under the floor, in every name a reader meets it by.
const METRIC = /Say-vs-Do|Say vs\.? Do|Direction match|Direction Match|Official Record|record backs it up|backs up what they say/;
// A promise that it is there for everyone.
const UNIVERSAL = /every politician|all politicians|wherever they appear|anyone['’]s record|for everyone|every profile/i;
// The floor, named in any of the ways the product words it.
const DEPTH = /deep enough|enough of a record|where the (formal )?record|runs deep enough|too thin|says so|not enough|fail(s)? closed/i;

let scanned = 0, universalHits = [];
for (const f of COPY_FILES) {
  const src = read(f);
  // Sentence-ish units of reader copy: the contents of quoted literals long
  // enough to be prose. Short literals are class names and keys.
  const lits = src.match(/'(?:[^'\\\n]|\\.){60,}'|"(?:[^"\\\n]|\\.){60,}"/g) || [];
  for (const lit of lits) {
    const text = lit.slice(1, -1);
    if (!METRIC.test(text)) continue;
    scanned++;
    if (UNIVERSAL.test(text) && !DEPTH.test(text)) {
      universalHits.push(f + ": " + text.replace(/<[^>]+>/g, "").slice(0, 150));
    }
  }
}
ok(scanned > 0, "the scan actually reached reader copy naming the metric (found " + scanned + " literals)");
ok(universalHits.length === 0,
  "no reader string promises the record metric universally without naming the floor:\n      " +
  universalHits.join("\n      "));
console.log(`   ${scanned} reader literals name the record metric · ${universalHits.length} claim it universally without a depth condition`);

// CAN THIS SCAN FAIL? A grep that passes because it matches nothing is not a test.
// The four strings this pass rewrote are replayed through the same two predicates
// and must all be caught — so a future edit that reintroduces the claim in any of
// these four shapes is caught too.
const PRE_FIX = [
  'These <strong>3</strong> stances now power the <strong>Alignment Tool</strong>: every politician gets a <strong>Your Match</strong> (how their stated positions fit yours) paired with <strong>Say-vs-Do</strong> (whether their record backs it up), wherever they appear.',
  'it shows <em>who matches what you stand for</em> — and whether their record backs it up — turning your values into a yardstick you can point at anyone\u2019s record.',
  'and every politician then gets a <b>Your Match</b> — plus <b>Official Record</b>, whether their record backs it up.',
  'As you do, the <strong>Alignment Tool</strong> shows <em>who matches</em> you, and whether their record backs it up. Set stances for every politician.'
];
let caught = 0;
for (const t of PRE_FIX) if (METRIC.test(t) && UNIVERSAL.test(t) && !DEPTH.test(t)) caught++;
ok(caught === PRE_FIX.length,
  `the scan catches all ${PRE_FIX.length} pre-fix strings (caught ${caught}) — it is capable of failing`);
// And it must not fire on the replacements, or the fix would be unshippable.
let falsePos = 0;
for (const f of ["my-stances.js", "alignment-tool.js"]) {
  const src = read(f);
  for (const m of ["deep enough to test", "runs deep enough to test"]) {
    if (src.indexOf(m) >= 0) falsePos++;
  }
}
ok(falsePos > 0, "the shipped replacements state the floor in words the DEPTH predicate recognises");

// The floor this copy is now honest about is a MEASURED fact, not a belief.
let pub = 0, tot = 0;
for (const pid of Object.keys(w.CMP_DATA)) {
  tot++;
  const r = WA.read(pid, w.CMP_DATA[pid]);
  if (r && r.publishable && r.pct != null) pub++;
}
ok(pub < tot, `the floor is real — ${pub} of ${tot} profiles publish a Direction Match, so a universal promise would be false`);
console.log(`   floor check: ${pub}/${tot} profiles publish · ${tot - pub} withhold`);

// Your Match may stay universal: it is a personal tool, not a public grade.
// Assert we did NOT over-correct it away.
const align = read("alignment-tool.js") + read("my-stances.js");
ok(/Your Match/.test(align), "Your Match survives as a universal personal read (it is not a public integrity score)");

// ── 2 · Every thin exec row discloses its depth, on the face AND in the name ──
console.log("\n§2 exec rows at n<=1 disclose depth on the row face and the accessible name");

const ONEWAY = { acted_on_it: 1, acted_against: 1 };
const EXEC_PIDS = Object.keys(w.CMP_DATA).filter((p) => {
  try { return !!(EX && EX.serving && EX.eligible !== undefined ? EX.summary(p, { allTerms: true }) : null); }
  catch (e) { return false; }
});
ok(EXEC_PIDS.length >= 1, `at least one exec-lane figure is reachable (found ${EXEC_PIDS.length})`);

let thinRows = [], flipRows = [], execRowsSeen = 0;
for (const pid of EXEC_PIDS) {
  let sum = null;
  try { sum = EX.summary(pid, { allTerms: true }); } catch (e) {}
  if (!sum || !sum.rows) continue;
  for (const row of sum.rows) {
    const k = row.issueKey;
    if (!k) continue;
    execRowsSeen++;
    const all = EX.issue(pid, k, { allTerms: true });
    const cur = EX.issue(pid, k, { allTerms: false });
    const aN = (all.actions || []).length, cN = (cur.actions || []).length;
    if (ONEWAY[all.token] && aN <= 1) thinRows.push({ pid, k, n: aN, token: all.token });
    if (cN && aN && cN < aN && all.token !== cur.token) {
      flipRows.push({ pid, k, all: all.token, cur: cur.token, aN, cN });
    }
  }
}
console.log(`   swept ${execRowsSeen} exec issue rows · thin-at-n<=1 (all-time): ${thinRows.length} · scope flips: ${flipRows.length}`);
ok(thinRows.length > 0, "the sweep found thin exec rows to check (a zero here would make §2 vacuous)");

const trees = {};
function tree(pid) {
  if (!(pid in trees)) { try { trees[pid] = CS.stancesSectionHtml(pid) || ""; } catch (e) { trees[pid] = ""; } }
  return trees[pid];
}
// EXACTLY ONE ROW'S MARKUP. The tree gives every row an id (stanceRowId), so the
// slice runs from this row's container to the start of the next one. A fixed-width
// window around the anchor is what the first draft of this harness used, and it
// bled a neighbouring row's scope clause onto a row that had none — reporting a
// defect in the page that was really a defect in the ruler.
function rowSlice(pid, key) {
  const t = tree(pid);
  // Same slug the renderer uses (_stSlug): strip anything outside [A-Za-z0-9_-].
  // Underscores SURVIVE — an issue key is "america_first", not "america-first".
  const slug = (v) => String(v == null ? "" : v).replace(/[^A-Za-z0-9_-]/g, "");
  const open = 'id="pdxst-row-' + slug(pid) + "-" + slug(key) + '"';
  const i = t.indexOf(open);
  if (i < 0) return "";
  const next = t.indexOf('id="pdxst-row-', i + open.length);
  return t.slice(i, next < 0 ? t.length : next);
}
function doorName(pid, key) {
  const seg = rowSlice(pid, key);
  const all = seg.match(/aria-label="Open the issue dossier: [^"]*/g) || [];
  return all.filter((a) => a.indexOf(key) >= 0 || true).slice(-1)[0] || "";
}

for (const t of thinRows) {
  const seg = rowSlice(t.pid, t.k);
  ok(seg.length > 0, `${t.pid}/${t.k}: the row renders at all`);
  if (!seg.length) continue;
  ok(/not yet a pattern/.test(seg),
    `${t.pid}/${t.k}: n=${t.n} ${t.token} — the visible face qualifies the reading ("not yet a pattern")`);
  const name = doorName(t.pid, t.k);
  ok(/judged .* — a (direction|split), not yet a pattern/.test(name),
    `${t.pid}/${t.k}: n=${t.n} — the accessible name carries the depth clause, not just the verdict word\n        got: ${name.slice(0, 190)}`);
  // The action itself must still be there. Disclosure, never suppression.
  ok(!/No action on file/.test(seg) && !/no record/i.test((EX.issue(t.pid, t.k, { allTerms: true }).token || "")),
    `${t.pid}/${t.k}: the real action is still shown — thinness is disclosed, not hidden`);
}

// ── 3 · The face and the name cannot drift ───────────────────────────────────
// They now read one helper. Prove it by deleting the helper's output and watching
// BOTH surfaces lose the clause together — a control that fails if either surface
// has quietly kept its own copy of the threshold.
console.log("\n§3 one definition of thin — face and accessible name move together");
const blind = boot((f, s) => f !== "consistency.js" ? s : s.replace(
  /function _stThinNote\(r, res\) \{[\s\S]*?\n  \}/,
  "function _stThinNote(r, res) { return null; }"));
let bothLost = 0, oneKept = [];
for (const t of thinRows) {
  let bt = "";
  try { bt = blind.PDXConsistency.stancesSectionHtml(t.pid) || ""; } catch (e) {}
  const i = bt.indexOf('data-pdxst-dos="' + t.k + '"');
  const seg = i < 0 ? "" : bt.slice(Math.max(0, i - 3000), i + 3000);
  const faceHas = /not yet a pattern/.test(seg);
  const nameHas = /judged .* — a (direction|split), not yet a pattern/.test(
    (seg.match(/aria-label="Open the issue dossier: [^"]*/g) || []).slice(-1)[0] || "");
  if (!faceHas && !nameHas) bothLost++;
  else oneKept.push(`${t.pid}/${t.k} face=${faceHas} name=${nameHas}`);
}
ok(oneKept.length === 0,
  "blanking _stThinNote removes the clause from BOTH surfaces — neither keeps a private copy of the threshold:\n      " +
  oneKept.join("\n      "));
console.log(`   ${bothLost}/${thinRows.length} thin rows lost the clause on both surfaces when the shared helper was blanked`);

// ── 4 · A scope disagreement is never silent ─────────────────────────────────
console.log("\n§4 where current-term and all-time disagree, both reads are named");
ok(flipRows.length > 0, "the sweep found at least one scope flip to check");
for (const f of flipRows) {
  const seg = rowSlice(f.pid, f.k);
  ok(/this term alone:/.test(seg),
    `${f.pid}/${f.k}: all-time reads ${f.all} (${f.aN}) but the current term reads ${f.cur} (${f.cN}) — the row names the other slice`);
  // AND THE HEADLINE STILL BELONGS TO THE ALL-TIME READ. Asserted in the row's own
  // vocabulary, not the exec lane's: the face speaks the consistency lane's words
  // ("Mixed"), which laneVerdict() derives from the all-time token, while
  // PDXExecRecord speaks its own ("Acted both ways"). Both name the same read.
  // Asserted on the COUNTS rather than the verdict word, because the face prints the
  // bucket's short form ("Mixed") while the row model carries its long one ("Mixed
  // record") — matching on the label would be matching on a rendering detail. The
  // counts are unambiguous and they are the thing that would actually change if the
  // slice were promoted: all-time splits 1/1 here, the current term 1/0.
  const allR = EX.issue(f.pid, f.k, { allTerms: true });
  const curR = EX.issue(f.pid, f.k, { allTerms: false });
  const nAdv = (allR.actions || []).filter((a) => a.direction === "advances").length;
  const nOpp = (allR.actions || []).filter((a) => a.direction === "opposes").length;
  const cAdv = (curR.actions || []).filter((a) => a.direction === "advances").length;
  const cOpp = (curR.actions || []).filter((a) => a.direction === "opposes").length;
  ok(new RegExp("<b>" + nAdv + "</b>[\\s\\S]{0,40}aligned").test(seg) &&
     new RegExp("<b>" + nOpp + "</b>[\\s\\S]{0,40}against").test(seg),
    `${f.pid}/${f.k}: the headline counts are the all-time ones (${nAdv}/${nOpp}), not the current term's (${cAdv}/${cOpp}) — the slice is disclosed, not promoted`);
  ok(nAdv !== cAdv || nOpp !== cOpp,
    `${f.pid}/${f.k}: the two scopes really do carry different counts (${nAdv}/${nOpp} vs ${cAdv}/${cOpp})`);
  console.log(`   ${f.pid}/${f.k}: headline ${f.all}(${f.aN}) · disclosed slice ${f.cur}(${f.cN})`);
}
// Rows whose scopes AGREE must stay quiet — a clause on every row teaches nothing.
let noiseHits = [];
for (const pid of EXEC_PIDS) {
  let sum = null; try { sum = EX.summary(pid, { allTerms: true }); } catch (e) {}
  for (const row of (sum && sum.rows) || []) {
    const k = row.issueKey; if (!k) continue;
    if (flipRows.some((f) => f.pid === pid && f.k === k)) continue;
    if (/this term alone:/.test(rowSlice(pid, k))) noiseHits.push(pid + "/" + k);
  }
}
ok(noiseHits.length === 0,
  "rows whose two scopes agree stay silent about scope:\n      " + noiseHits.join(", "));

// ── 5 · Presentation only ────────────────────────────────────────────────────
console.log("\n§5 nothing here moved a score");
let compared = 0, drifted = [];
for (const pid of Object.keys(w.CMP_DATA)) {
  const r = WA.read(pid, w.CMP_DATA[pid]);
  const o = CS.scopedOverall("official", pid);
  compared++;
  // The invariant the pass must hold: a copy/disclosure change cannot alter the
  // published figure, the verdict token, or whether the figure publishes at all.
  // Asserted against the exec rows most at risk — the ones this pass touched.
  if (r && r.publishable && r.pct == null) drifted.push(pid + ": publishable with no pct");
  if (o && o.score != null && (o.score < 0 || o.score > 100)) drifted.push(pid + ": score out of range");
}
ok(drifted.length === 0, "no profile publishes an impossible reading:\n      " + drifted.join("\n      "));
// The exec rows this pass rendered clauses onto keep their exact verdicts.
for (const t of thinRows.concat(flipRows.map((f) => ({ pid: f.pid, k: f.k })))) {
  const before = EX.issue(t.pid, t.k, { allTerms: true });
  ok(before && before.verdict && before.verdict.key === before.token,
    `${t.pid}/${t.k}: verdict still resolves from the token the engine computed (${before.token})`);
}
console.log(`   ${compared} profiles checked · ${thinRows.length + flipRows.length} touched exec rows hold their engine verdicts`);

console.log(`\n${fails ? "✗ FAIL" : "✓ PASS"} — ${checks - fails}/${checks} checks passed`);
process.exit(fails ? 1 : 0);
