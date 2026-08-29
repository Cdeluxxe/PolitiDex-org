#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-dossier-primary-lede.mjs — the dossier lede may not contradict the tree
// ─────────────────────────────────────────────────────────────────────────────
// A profile printed two answers to one question. On the stance tree, Curtis and
// Lee read "Thin supports" / "Thin opposes" on Housing Affordability over one
// vote on one measure, H.R. 6644 — the measure federal wave F4 promoted to
// PRIMARY on that issue. Two clicks away, the same issue's dossier opened its
// Official Record with "Not about this issue", and told the reader the votes on
// file "touched this issue as part of a larger measure rather than being about
// it". Both sentences were rendered from the same engine, over the same member,
// on the same issue, from the same index.
//
// The emitter was _fpiUnreadWhy's `incidental` branch, reached from
// _dosFormalRead. Two things let it fire under a leaf that carried a side:
//
//   1. THE DOSSIER ASKED A NARROWER QUESTION THAN THE TREE. _dosFormalRead took
//      the formal-pattern index's two steps — _stPatternTier, then the thin door
//      _stThinDirRead — and the tree's Record slot takes one: _recordDisplayTier,
//      directly. The thin door deliberately refuses a ledger that ran both ways
//      and refuses any tier but `thin`, because it feeds an index and a score. So
//      a row the tree had already labelled arrived at the dossier as unread, and
//      the dossier printed a refusal. The fix is a THIRD answer, not a wider
//      door: a row both steps decline is offered the read the tree already
//      published (_dosPublishedRead), and only a row with nothing published
//      anywhere reaches the refusals.
//   2. "NOT ABOUT THIS ISSUE" WAS ASKED OF THE JUDGED SUBSET. `idx.primary`
//      counts primary-mapped acts that were admitted, judged and not superseded.
//      A curated mapping is none of those things — it is a decision we published
//      about a bill. Where the mapping on the named measure is primary for this
//      issue, the sentence is false whatever the judged subset came to, so the
//      wall is now asked of the mapping on file (_primaryOnFile) and the ladder
//      continues to the next true reason.
//
// WHAT MUST STILL BE TRUE, and is what this file holds:
//
//   1. Curtis housing reads thin supports, names H.R. 6644, and never says the
//      record is not about the issue. Lee housing reads thin opposes, same bill,
//      same silence.
//   2. NO ROW ANYWHERE contradicts: not one dossier prints a refusal, or a
//      different tier, where the tree published a characterisation.
//   3. THE SENTENCE SURVIVES WHERE IT IS TRUE. A genuinely incidental row still
//      gets it, and a package-only row still gets the menu phrasing — both in
//      numbers, over the whole corpus, each one verified as having no primary
//      mapping on file and no published tier.
//   4. THE MULTI-ISSUE DISCLOSURE IS UNTOUCHED. H.R. 6644 also carries
//      housing_build; "1 of 1 from multi-issue bills" is not incidental, and the
//      cousin key is still named.
//   5. NOTHING ENTERED THE INDEX OR THE SCORE. Every row the dossier reads by
//      deferral is still refused by the formal-pattern index, and no row's
//      Direction Match result moves because a dossier was rendered.
//
//   node scripts/test-dossier-primary-lede.mjs
//
// Real shipped modules in a node:vm sandbox, and the live record corpus seeded
// the way a completed /api/voting-record fetch leaves it.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "profile-spine.js", "profiles-full.js",
];

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const no = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" is still printed`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => { if (!cond) { console.error(`\n  ✗ ${msg}\n`); process.exit(1); } };

const win = makeSandbox();
const ctx = vm.createContext(win);
win.PROFILES = win.CMP_DATA;
for (const f of FILES) vm.runInContext(readFileSync(join(ROOT, f), "utf8"), ctx, { filename: f });
win.PROFILES = win.CMP_DATA;
const CS = win.PDXConsistency;
must(CS && typeof CS.dossierRead === "function", "PDXConsistency.dossierRead unavailable");

// ── the corpus, and the mapping fact the wall is asked about ─────────────────
// `primaryOnFile` is built here from the SEEDS, independently of the accessor
// under test, so a wall that reads the wrong field cannot agree with itself.
const { byMember } = buildCorpus(ROOT);
const primaryOnFile = new Set();
for (const [pid, recs] of byMember) {
  try { win.PDXVotingRecord.noteMember(pid, recs); } catch (e) { continue; }
  for (const it of recs) {
    for (const m of (it.issues || [])) if (m && m.isPrimary) primaryOnFile.add(`${pid}|${m.issueKey}`);
  }
}
must(byMember.size > 100, `too few members in the corpus to sweep (${byMember.size})`);
console.log(`      ${byMember.size} members seeded from the shipped record corpus`);

const NOT_ABOUT = "Not about this issue";
const BRUSHED = "brushed the subject";

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the two rows in the report");
// ═════════════════════════════════════════════════════════════════════════════
// The acceptance case, stated as the reader meets it: the tree's label, the
// dossier's label, and the rendered sheet. F4 promoted `housing` on H.R. 6644 to
// primary at weight 80 with yea_supports unchanged, so a yea reads as support and
// a nay as opposition — which is why these two members read opposite ways off one
// vote on one bill.
for (const [pid, want] of [["curtis", "Thin supports"], ["lee", "Thin opposes"]]) {
  const key = "housing";
  const row = (CS.issueRows(pid) || []).find((r) => r && r.key === key);
  ok(!!row, `${pid}: no ${key} row on the profile at all`);
  if (!row) continue;
  const tree = CS.recordPattern.display(row) || null;
  const d = CS.dossierRead(pid, key);
  const html = CS.gapViewHtml(pid, key) || "";

  eq(tree && tree.label, want, `${pid}: the tree's Record slot`);
  eq(d.state, "reads", `${pid}: the dossier reads the record`);
  eq(d.tier, "thin", `${pid}: the dossier's tier`);
  eq(d.label, want, `${pid}: the dossier's label is the tree's label`);
  has(html, "H.R. 6644", `${pid}: the sheet names the measure`);
  no(html, NOT_ABOUT, `${pid}: the sheet does not refuse the row`);
  no(html, BRUSHED, `${pid}: the sheet does not call the measure a brush`);
  ok(!d.why, `${pid}: a row that reads carries no refusal reason`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · no row anywhere says both things");
// ═════════════════════════════════════════════════════════════════════════════
// The whole corpus, every issue on every seeded member. Three ways to contradict:
// refuse what the tree labelled, label it differently, or print "not about this
// issue" over a mapping we ourselves called primary.
const clash = [], wrongPrimary = [];
let rows = 0, reads = 0, refusals = 0, deferred = 0;
const byId = Object.create(null);
const incidentals = [], vehicleOnly = [];
for (const pid of byMember.keys()) {
  const fpi = Object.create(null);
  (CS.formalPatternIndex.rows(pid) || []).forEach((r) => { if (r && r.key) fpi[r.key] = r; });
  for (const r of (CS.issueRows(pid) || [])) {
    if (!r || !r.key) continue;
    let d; try { d = CS.dossierRead(pid, r.key); } catch (e) { continue; }
    if (!d || d.state === "cold" || d.state === "pending") continue;
    rows++;
    let tree = null; try { tree = CS.recordPattern.display(r) || null; } catch (e) { tree = null; }
    const pub = (tree && tree.tier && tree.tier !== "none") ? tree.tier : null;
    if (d.state === "reads") {
      reads++;
      if (pub && d.tier !== pub) clash.push(`${pid}/${r.key}: dossier ${d.tier} vs tree ${pub}`);
      if (!fpi[r.key] || !fpi[r.key].read) deferred++;
    } else {
      refusals++;
      const id = (d.why && d.why.id) || "?";
      byId[id] = (byId[id] || 0) + 1;
      if (pub) clash.push(`${pid}/${r.key}: tree published ${pub}, dossier refused "${(d.why && d.why.lb) || d.state}"`);
      if (id === "incidental") {
        incidentals.push({ pid, key: r.key, d });
        if (primaryOnFile.has(`${pid}|${r.key}`)) wrongPrimary.push(`${pid}/${r.key}`);
      }
      if (id === "vehicle_only") vehicleOnly.push({ pid, key: r.key, d });
    }
  }
}
must(rows > 5000, `too few rows swept (${rows})`);
eq(clash.length, 0, `no dossier contradicts the tree — ${clash.slice(0, 3).join(" | ")}`);
eq(wrongPrimary.length, 0,
  `"${NOT_ABOUT}" never appears where our mapping calls the measure primary — ${wrongPrimary.slice(0, 3).join(", ")}`);
must(deferred > 0, "no row exercised the deferral to the tree's published read");
console.log(`      ${rows} rows · ${reads} read (${deferred} by deferral) · ${refusals} refused`);
console.log(`      refusals by reason — ${Object.keys(byId).sort().map((k) => `${k}:${byId[k]}`).join(" · ")}`);

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the sentence survives where it is true");
// ═════════════════════════════════════════════════════════════════════════════
// A wall that silences a true sentence is the same defect facing the other way.
// Both refusals about package-borne records must still be reachable in numbers,
// and every surviving incidental row must be one: no primary mapping on file, and
// nothing published for it anywhere.
must(incidentals.length > 100, `the incidental refusal has stopped firing (${incidentals.length} rows)`);
must(vehicleOnly.length > 10, `the package-only refusal has stopped firing (${vehicleOnly.length} rows)`);
for (const x of incidentals.slice(0, 400)) {
  has(x.d.why.note, BRUSHED, `${x.pid}/${x.key}: the incidental sentence is intact`);
  eq(x.d.why.lb, NOT_ABOUT, `${x.pid}/${x.key}: the incidental label is intact`);
}
for (const x of vehicleOnly.slice(0, 100)) {
  ok(x.d.why.menu === "provision_only", `${x.pid}/${x.key}: the package-only refusal keeps the menu phrasing`);
  no(x.d.why.lb, NOT_ABOUT, `${x.pid}/${x.key}: a package-only row is not called incidental`);
}
console.log(`      ${incidentals.length} incidental · ${vehicleOnly.length} package-only, all still worded`);

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the multi-issue disclosure is untouched");
// ═════════════════════════════════════════════════════════════════════════════
// H.R. 6644 carries `housing_build` as well, and "1 of 1 from multi-issue bills"
// is a fact about the measure, not a mark against the record. It stays, and so
// does the cousin key — a row that reads is not a row with nothing to disclose.
{
  const st = win._pdxRecordOmnibusStats ? win._pdxRecordOmnibusStats("curtis", "housing") : null;
  ok(!!st, "the omnibus stats still answer for curtis/housing");
  const note = win._pdxOmnibusProvenanceNote ? win._pdxOmnibusProvenanceNote(st) : "";
  ok(!!note, "the multi-issue provenance note still has words in it");
  has(note, "multi-issue bills", "the note still says where the record came from");
  const html = CS.gapViewHtml("curtis", "housing") || "";
  has(html, "multi-issue bills", "the sheet still carries the disclosure");
  // The cousin is named, and it reads on its own chip rather than being folded in.
  const cousin = CS.dossierRead("curtis", "housing_build");
  eq(cousin.state, "reads", "housing_build still reads on its own");
  const vs = CS.vehicle && CS.vehicle.stats ? CS.vehicle.stats("curtis", "housing") : null;
  ok(vs === null || typeof vs === "object", "the vehicle read still answers for the row");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · nothing entered the index or the score");
// ═════════════════════════════════════════════════════════════════════════════
// The third answer is the dossier's alone. If it had widened the thin door, rows
// would have entered the formal-pattern index and Direction Match through it —
// which is a scoring change wearing a copy fix. Two checks: every deferred row is
// still REFUSED by the index, and a row's result is identical whether or not its
// dossier was rendered first.
{
  let checkedDeferred = 0;
  for (const pid of [...byMember.keys()].slice(0, 60)) {
    const fpi = Object.create(null);
    (CS.formalPatternIndex.rows(pid) || []).forEach((r) => { if (r && r.key) fpi[r.key] = r; });
    for (const r of (CS.issueRows(pid) || [])) {
      if (!r || !r.key) continue;
      let d; try { d = CS.dossierRead(pid, r.key); } catch (e) { continue; }
      if (!d || d.state !== "reads") continue;
      const x = fpi[r.key];
      if (!x || x.read) continue;
      checkedDeferred++;
      eq(x.tier, "unread", `${pid}/${r.key}: the index still refuses a row the dossier deferred`);
      eq(x.directional, false, `${pid}/${r.key}: a deferred row carries no side in the index`);
    }
  }
  must(checkedDeferred > 0, "no deferred row reached the index check");
  console.log(`      ${checkedDeferred} deferred rows still refused by the formal-pattern index`);

  // Order independence. A fresh boot, results read BEFORE any dossier is built,
  // against the same results read after — same numbers or the read moved a score.
  const fresh = makeSandbox();
  const fctx = vm.createContext(fresh);
  fresh.PROFILES = fresh.CMP_DATA;
  for (const f of FILES) vm.runInContext(readFileSync(join(ROOT, f), "utf8"), fctx, { filename: f });
  fresh.PROFILES = fresh.CMP_DATA;
  const PIDS = [...byMember.keys()].slice(0, 40);
  for (const pid of PIDS) fresh.PDXVotingRecord.noteMember(pid, byMember.get(pid));
  const F = fresh.PDXConsistency;
  const shot = (cs) => {
    const out = [];
    for (const pid of PIDS) {
      for (const r of (cs.issueRows(pid) || [])) {
        if (!r || !r.key) continue;
        let res = null; try { res = cs.rowResult(r); } catch (e) { res = null; }
        out.push([pid, r.key, res && res.state, res && res.metric, res && res.pct,
          (r.verdict && r.verdict.token) || ""].join("|"));
      }
    }
    return out.join("\n");
  };
  const before = shot(F);
  for (const pid of PIDS) for (const r of (F.issueRows(pid) || [])) {
    if (r && r.key) { try { F.gapViewHtml(pid, r.key); } catch (e) {} }
  }
  const after = shot(F);
  eq(after, before, "no row's result moves because its dossier was rendered");
  console.log(`      ${before.split("\n").length} results identical before and after every dossier was built`);
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n  test-dossier-primary-lede — ${passed} passed, ${failures.length} failed\n`);
  for (const f of failures.slice(0, 20)) console.error(`   ✗ ${f}`);
  if (failures.length > 20) console.error(`   … and ${failures.length - 20} more`);
  process.exit(1);
}
console.log(`\n   ${passed} checks passed`);
console.log("✓ dossier-primary-lede: the lede says what the tree says, and the refusals keep their own ground");
