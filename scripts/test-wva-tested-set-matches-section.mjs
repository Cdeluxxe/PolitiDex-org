#!/usr/bin/env node
/**
 * test-wva-tested-set-matches-section.mjs — one tested set for the chip, the
 * percentage and the ⚖️ section's buckets
 * ─────────────────────────────────────────────────────────────────────────────
 * THE DEFECT. /p/trump's letterhead chip read "74% · 48 of 53 tested" while the
 * ⚖️ Word vs Action section below it read "across 39 issues", with buckets that
 * added to 39. The chip's figure was taken over read()'s STATEMENT ledger —
 * several statements per issue, pledge-ledger kept/broken resolutions included —
 * and the section's over the ISSUE rows. Two denominators for one read.
 *
 * THE RULE THIS FILE HOLDS. A tested issue is an issue with a stated position and
 * a formal-record Direction Match verdict (Contradicted / Mixed / Backed up). On
 * every person:
 *
 *   1. the chip's "X of Y tested" X is the section's "across N tested issues" N,
 *      and the letterhead tally's N too;
 *   2. the three result buckets add up to N;
 *   3. the tested issue keys read() scores are exactly the keys in those buckets,
 *      one entry per issue, each carrying that row's own verdict token;
 *   4. the percentage is the evidence-weighted mean over exactly those entries;
 *   5. Y counts the stated issues and never undercuts X.
 *
 *   node scripts/test-wva-tested-set-matches-section.mjs
 *
 * Real shipped modules in a node:vm sandbox, the real roster and the offline
 * record corpus.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`\n✗ wva tested set matches section: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};

const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "profile-spine.js",
];
const corpus = buildCorpus(ROOT);
must(corpus && corpus.byMember && corpus.byMember.size > 300, "the record corpus did not load");

function boot(warm) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) vm.runInContext(R(f), ctx, { filename: f });
  win.PROFILES = win.CMP_DATA;
  if (warm) {
    for (const [pid, recs] of corpus.byMember) {
      try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
    }
  }
  return win;
}

const RESULT = ["contradicts", "mixed", "consistent"];
const bucketN = (html, tok) => {
  const m = new RegExp('data-pdxwa-seg="' + tok + '"[\\s\\S]*?<span class="pdxwa-tally-n">(\\d+)</span>').exec(html);
  return m ? +m[1] : null;
};
const acrossN = (html) => {
  const m = /[Aa]cross (\d+) tested issues?/.exec(String(html));
  return m ? +m[1] : null;
};
const chipX = (chip) => {
  const m = /<span class="pdxwa-cbadge-den">(\d+) of (\d+) tested<\/span>/.exec(chip);
  return m ? { x: +m[1], y: +m[2] } : null;
};
const chipPct = (chip) => {
  const m = /<span class="pdxwa-cbadge-pct"[^>]*>(\d+)%<\/span>/.exec(chip);
  return m ? +m[1] : null;
};

function check(w, pid, out) {
  const WA = w.PDXWordAction;
  const p = w.CMP_DATA[pid];
  const fig = WA.figure(pid, p);
  const r = fig.read;
  if (!r) return false;
  const head = WA.headerTallyHtml(pid) || "";
  let sec = "";
  try { sec = WA.sectionHtml(pid, p) || ""; } catch { sec = ""; }
  const chip = WA.compactBadgeHtml(pid, p) || "";

  // The read's tested set, by issue.
  const keys = r.tested.map((it) => it.issueKey);
  const uniq = new Set(keys);
  if (uniq.size !== keys.length) out.push(`${pid}: an issue is tested twice (${keys.join(",")})`);
  if (r.tested.some((it) => it.test.basis === "pledge-ledger")) {
    out.push(`${pid}: a tested entry rests on the pledge ledger alone, not a formal-record verdict`);
  }

  // The buckets — the section's own index.
  const b = WA.outcomeBuckets ? WA.outcomeBuckets(pid) : null;
  const bucketKeys = new Set();
  if (b) RESULT.forEach((t) => (b.buckets[t] || []).forEach((row) => bucketKeys.add(row.key)));
  const sameSet = bucketKeys.size === uniq.size && [...uniq].every((k) => bucketKeys.has(k));
  if (b && !sameSet) {
    out.push(`${pid}: read() tests {${[...uniq].sort()}} but the result buckets hold {${[...bucketKeys].sort()}}`);
  }
  // Each tested entry carries its row's verdict, untouched.
  if (b) {
    const tokOf = {};
    RESULT.forEach((t) => (b.buckets[t] || []).forEach((row) => { tokOf[row.key] = t; }));
    r.tested.forEach((it) => {
      if (tokOf[it.issueKey] && tokOf[it.issueKey] !== it.test.token) {
        out.push(`${pid}/${it.issueKey}: read says ${it.test.token}, the bucket says ${tokOf[it.issueKey]}`);
      }
    });
  }
  eq(r.coverage.tested, uniq.size, `${pid}: coverage.tested is not the number of tested issues`);
  ok(r.coverage.scorable >= r.coverage.tested, `${pid}: Y (${r.coverage.scorable}) undercuts X (${r.coverage.tested})`);

  // The percentage, recomputed over exactly those entries.
  if (r.pct !== null) {
    let s = 0, n = 0;
    r.tested.forEach((it) => { const wgt = it.weight * (it.test.evidence || 1); s += it.test.score * wgt; n += wgt; });
    eq(r.pct, Math.round(s / n), `${pid}: the percentage is not the weighted mean over the tested issues`);
  }

  // The rendered surfaces.
  if (head) {
    const n = acrossN(head);
    eq(n, r.coverage.tested, `${pid}: the letterhead tally's "across N tested issues" is not the read's tested count`);
    const sum = RESULT.reduce((a, t) => a + (bucketN(head, t) || 0), 0);
    eq(sum, n, `${pid}: the letterhead's three result buckets do not add up to its N`);
  }
  if (/class="pdxwa-tally"/.test(sec)) {
    const n = acrossN(sec);
    eq(n, r.coverage.tested, `${pid}: the section's "across N tested issues" is not the read's tested count`);
    const tally = sec.slice(sec.indexOf('class="pdxwa-tally"'));
    const sum = RESULT.reduce((a, t) => a + (bucketN(tally, t) || 0), 0);
    eq(sum, n, `${pid}: the section's three result buckets do not add up to its N`);
  }
  const cx = chipX(chip);
  if (cx) {
    eq(cx.x, r.coverage.tested, `${pid}: the chip's X is not the tested-issue count`);
    eq(cx.y, r.coverage.scorable, `${pid}: the chip's Y is not the stated-issue count`);
    if (head) eq(cx.x, acrossN(head), `${pid}: the chip's "X of Y tested" X is not the tally's N`);
    eq(chipPct(chip), r.pct, `${pid}: the chip's percentage is not the read's`);
    return true;
  }
  return false;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · /p/trump — the reported page");
// ═════════════════════════════════════════════════════════════════════════════
const warm = boot(true);
must(warm.PDXWordAction && typeof warm.PDXWordAction.figure === "function", "PDXWordAction.figure is gone");
must(typeof warm.PDXWordAction.outcomeBuckets === "function", "PDXWordAction.outcomeBuckets is not published");
must(warm.CMP_DATA.trump, "trump is no longer on the roster");
{
  const out = [];
  const chipped = check(warm, "trump", out);
  ok(chipped, "trump: the chip did not publish, so the reported pair cannot be compared");
  out.forEach((m) => failures.push(m));
  const fig = warm.PDXWordAction.figure("trump", warm.CMP_DATA.trump);
  const n = acrossN(warm.PDXWordAction.headerTallyHtml("trump"));
  console.log(`      trump: chip ${fig.pct}% · ${fig.fraction}  ≡  tally across ${n} tested issues`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · every person page, warm and cold");
// ═════════════════════════════════════════════════════════════════════════════
for (const [label, w] of [["warm", warm], ["cold", boot(false)]]) {
  const out = [];
  let chips = 0;
  for (const pid of Object.keys(w.CMP_DATA)) {
    try { if (check(w, pid, out)) chips++; } catch (e) { out.push(`${pid}: threw ${e && e.message}`); }
  }
  ok(chips > (label === "warm" ? 100 : 0), `${label}: only ${chips} chips published — the sweep proves nothing`);
  eq(out.slice(0, 6).join(" | "), "", `${label}: ${out.length} mismatch(es) between the tested set and the section`);
  console.log(`      ${label}: ${chips} published chips, every one matched to its section's tested set`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · no verdict rule moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The bucket a row lands in is its own verdict token (or the coverage piles).
  const WA = warm.PDXWordAction;
  let rows = 0;
  for (const pid of ["trump", "lee", "scalise", "aoc"]) {
    const b = WA.outcomeBuckets(pid);
    if (!b) continue;
    RESULT.forEach((t) => (b.buckets[t] || []).forEach((row) => {
      rows++;
      eq(row.verdict.token, t, `${pid}/${row.key}: filed under ${t} but its verdict is ${row.verdict.token}`);
    }));
  }
  ok(rows > 20, `only ${rows} result rows swept`);
}

if (failures.length) {
  console.error(`\n✗ wva tested set matches section: ${failures.length} failure(s), ${passed} passed\n`);
  failures.slice(0, 40).forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`\n✓ wva tested set matches section: all ${passed} assertions passed — chip X, tally N and the three result buckets are one set`);
