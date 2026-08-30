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
// The emitter was _fpiUnreadWhy's `incidental` branch, reached from _dosFormalRead.
// The branch has since been removed outright — see item 3 below — but it was
// removed in two steps, and the first one is still the load-bearing part of this
// file, because it is about the SHAPE of the two lanes and not about the flag.
// Two things let the refusal fire under a leaf that carried a side:
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
//   3. THE SENTENCE IS RETIRED, BECAUSE IT WAS NEVER TRUE. "Not about this issue"
//      was printed over judged, one-sided, recorded votes on the grounds that no
//      mapping on them was PRIMARY — a fact about the vehicles, published as a
//      finding about the member. One instrument carries one official Yea or Nay
//      and every issue mapped to it gets that vote at full strength, so the rung
//      is gone from _fpiUnreadWhy and its cousin from _stRecordWhy. This file
//      holds it gone: nowhere on the ladder, and its words nowhere on any refusal.
//      What remains is the disclosure — the 🚂 line and the arrival sentence — and
//      section 3 follows the whole stowaway population to prove it travels BESIDE
//      each finding rather than instead of it.
//   4. THE MULTI-ISSUE DISCLOSURE IS UNTOUCHED. H.R. 6644 also carries
//      housing_build; "1 of 1 from multi-issue bills" is not incidental, and the
//      cousin key is still named.
//   5. THE COPY WIDENED; NOTHING ENTERED THE SCORE. The formal-pattern index takes
//      the same third answer now (_fpiPublishedRead), so it no longer refuses a row
//      the dossier reads — the deferral population is empty by construction, which
//      is the point rather than a stale probe. What is still walled is the SCORE:
//      those rows carry `deferred: true`, and neither the alignment match's side
//      map nor the record baseline will take one. No row's Direction Match result
//      moves because a dossier was rendered, or because this pass shipped.
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
// The arrival clause the engine's own package sentence is built around, matched
// rather than the whole sentence because three surfaces word the rest three ways.
const PACKAGE = "mainly about something else";

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
const clash = [], wrongPrimary = [], notAbout = [], mute = [];
const stowRead = [], stowRefused = [];
const stowWall = Object.create(null);
// The refusals that would be about the vehicles rather than about the ledger.
const PKG_REFUSAL = new Set(["vehicle_only", "incidental"]);
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
    // THE STOWAWAY POPULATION, gathered here so section 3 can ask what became of
    // it. `stowaway && only` is _recordVehicleStats' exact claim: every mapped
    // instrument on this issue arrived as a provision inside something larger.
    let veh = null;
    try { veh = win._pdxRecordVehicleStats(pid, r.key) || null; } catch (e) { veh = null; }
    let vidx = null; try { vidx = win._pdxRecordDirection(pid, r.key) || null; } catch (e) { vidx = null; }
    const stow = !!(veh && veh.stowaway && veh.only && vidx && (vidx.judged || 0) >= 1);
    if (d.state === "reads") {
      reads++;
      if (pub && d.tier !== pub) clash.push(`${pid}/${r.key}: dossier ${d.tier} vs tree ${pub}`);
      if (!fpi[r.key] || !fpi[r.key].read) deferred++;
      if (stow) {
        stowRead.push({ pid, key: r.key, tier: d.tier });
        // BESIDE THE FINDING, on one of the two surfaces that can carry it: the
        // index row's own `vehicle` object (which is what the 🚂 line renders
        // from) or, on a row the index still refuses and the dossier reads by
        // deferral, the tree note's arrival sentence.
        const x = fpi[r.key];
        const said = String((tree && tree.note) || "") + " " + String((tree && tree.packageNote) || "");
        if (!(x && x.vehicle) && said.indexOf(PACKAGE) < 0) {
          mute.push(`${pid}/${r.key} (${d.tier})`);
        }
      }
    } else {
      // A stowaway ledger may still be walled — by no pole on the issue, or by
      // nothing on it having taken a side. Those are facts about the LEDGER. What
      // is collected here is only a refusal that is about the VEHICLES, which is
      // the shape that would be standing where a finding belongs.
      if (stow) {
        const rid = (d.why && d.why.id) || "?";
        stowWall[rid] = (stowWall[rid] || 0) + 1;
        if (PKG_REFUSAL.has(rid)) stowRefused.push(`${pid}/${r.key} (${rid})`);
      }
      refusals++;
      const id = (d.why && d.why.id) || "?";
      byId[id] = (byId[id] || 0) + 1;
      if (pub) clash.push(`${pid}/${r.key}: tree published ${pub}, dossier refused "${(d.why && d.why.lb) || d.state}"`);
      if (id === "incidental") {
        incidentals.push({ pid, key: r.key, d });
        if (primaryOnFile.has(`${pid}|${r.key}`)) wrongPrimary.push(`${pid}/${r.key}`);
      }
      if (id === "vehicle_only") vehicleOnly.push({ pid, key: r.key, d });
      // …and the words themselves, asked of every refusal on the ladder rather
      // than of the one rung that used to carry them. A rung reinstated under a
      // new id would be caught here even if `incidental` never came back.
      const said = String((d.why && d.why.lb) || "") + " " + String((d.why && d.why.note) || "");
      if (said.indexOf(NOT_ABOUT) >= 0 || said.indexOf(BRUSHED) >= 0) {
        notAbout.push(`${pid}/${r.key} (${id})`);
      }
    }
  }
}
must(rows > 5000, `too few rows swept (${rows})`);
eq(clash.length, 0, `no dossier contradicts the tree — ${clash.slice(0, 3).join(" | ")}`);
eq(wrongPrimary.length, 0,
  `"${NOT_ABOUT}" never appears where our mapping calls the measure primary — ${wrongPrimary.slice(0, 3).join(", ")}`);
// THE DEFERRAL POPULATION IS EMPTY, AND THAT IS THE FIX. This counted rows the
// dossier read while the formal-pattern index still refused — the two-surfaces,
// two-answers state this file was written about. The index now takes the same third
// rung the dossier does (_fpiPublishedRead), so the population is empty by
// construction rather than by luck, and the assertion is inverted to say so.
eq(deferred, 0,
  `no row is read by the dossier while the index still refuses it (${deferred})`);
console.log(`      ${rows} rows · ${reads} read (0 by deferral — the index reads them too) · ${refusals} refused`);
console.log(`      refusals by reason — ${Object.keys(byId).sort().map((k) => `${k}:${byId[k]}`).join(" · ")}`);

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the sentence survives where it is true");
// ═════════════════════════════════════════════════════════════════════════════
// A wall that silences a true sentence is the same defect facing the other way,
// so the two refusals this file was written about are checked in opposite
// directions now — because only one of them was ever a true sentence.
//
//   `incidental` IS RETIRED, AND THIS IS WHERE THAT IS HELD. It said "Not about
//     this issue" over a ledger of judged, one-sided acts on the grounds that no
//     mapping on them was PRIMARY. That is a fact about the vehicles and it was
//     being printed as a finding about the record: a member who voted for the
//     package voted for what was in it, and one instrument's Yea counts the same
//     on the issue that travelled as on the issue on the cover. The rung is gone
//     from _fpiUnreadWhy, its cousin is gone from _stRecordWhy, and both lanes
//     now read those rows at whatever tier their own depth floors reach. So the
//     assertion is inverted: not "still firing in numbers" but "firing nowhere",
//     and the sentence is chased by its words across the whole ladder below so a
//     rung reinstated under some other id cannot slip past a name check.
//   `vehicle_only` IS RETIRED TOO, and later than its cousin. It was the 🚂
//     stowaway refusal, it rested on different evidence (_recordVehicleStats found
//     provisions; it consulted no mapping flag), and its sentence was the locked
//     menu phrasing rather than a claim about the member — which is why it outlived
//     `incidental` by a pass. What finally took it out is that it had no population
//     left that deserved it: a stowaway-only ledger with judged acts on it now
//     reads, so the only rows reaching the rung were rows with a finding one
//     surface over. The menu sentence itself is not gone — _menuContext returns
//     `provision_only` for exactly these rows, and the dossier mounts it beside the
//     finding, which is where a statement about the menu belongs.
eq(incidentals.length, 0,
  `the retired incidental refusal fires nowhere — ${incidentals.slice(0, 3).map((x) => `${x.pid}/${x.key}`).join(", ")}`);
eq(notAbout.length, 0,
  `no refusal on the ladder says the record is not about the issue — ${notAbout.slice(0, 3).join(", ")}`);
// ── AND THE STOWAWAY POPULATION ITSELF, WHICH IS WHERE THE 🚂 LINE WENT ──────
// `vehicle_only` fires on no row anywhere now, and that is the point rather than a
// regression. It was reachable only while a stowaway-only ledger could arrive
// unread — which, below the ceiling, it always did. With the ceiling gone every one
// of these rows has a finding, so the disclosure has nowhere to stand except beside
// it, which is where the doctrine wants it. The assertion cannot be a corpus count
// any more, so it is the two things that must hold instead:
//
//   NOT ONE STOWAWAY-ONLY ROW IS REFUSED FOR BEING ONE. A row here may still be
//     walled — by no pole on the issue, or by nothing on it having taken a side —
//     and both of those walls are about the ledger, not the vehicles. What may not
//     happen is a package-shaped refusal standing where a finding belongs.
//   EVERY ONE THAT READS STILL SAYS HOW ITS ACTS ARRIVED, on the index row's own
//     `vehicle` object where the index reads it, and in the tree note's arrival
//     sentence on the rows the dossier reads by deferral. Disclosure beside the
//     finding, never instead of it, and never as a multiplier on it.
eq(vehicleOnly.length, 0,
  `no stowaway ledger is refused now that every one of them has a finding — ${vehicleOnly.slice(0, 3).map((x) => `${x.pid}/${x.key}`).join(", ")}`);
must(stowRead.length > 100,
  `too few stowaway-only rows read to be worth sweeping (${stowRead.length})`);
eq(stowRefused.length, 0,
  `no stowaway-only ledger is refused for being one — ${stowRefused.slice(0, 3).join(", ")}`);
eq(mute.length, 0,
  `every stowaway-only read discloses how its acts arrived — ${mute.slice(0, 3).join(", ")}`);
const stowTier = Object.create(null);
for (const x of stowRead) stowTier[x.tier] = (stowTier[x.tier] || 0) + 1;
console.log(`      0 incidental (retired) · 0 package-only refusals, because ${stowRead.length} stowaway ledgers now read`);
console.log(`      those reads by tier — ${Object.keys(stowTier).sort().map((k) => `${k}:${stowTier[k]}`).join(" · ")}, every one disclosing its vehicles`);
console.log(`      the stowaway rows still walled, and by what — ${Object.keys(stowWall).sort().map((k) => `${k}:${stowWall[k]}`).join(" · ") || "none"}`);

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
section("5 · the copy widened; nothing entered the score");
// ═════════════════════════════════════════════════════════════════════════════
// THE LINE MOVED, AND IT MOVED IN ONE DIRECTION ONLY. This section used to assert
// that the third answer was the dossier's alone and that the formal-pattern index
// still refused every row the dossier read by deferral. The index takes that answer
// now — a row holding judged acts always characterises itself, whatever the primary
// flag on its bills says — so the invariant this file is really defending is the
// other one, and it is unchanged: widening what the reader is TOLD is not widening
// what is SCORED.
//   Those rows carry `deferred: true`, and that flag is a wall in two places — the
// alignment match's side map and the record baseline. So: every deferred row is
// absent from both, and a row's result is identical whether or not its dossier was
// rendered first.
{
  let checkedDeferred = 0;
  for (const pid of [...byMember.keys()].slice(0, 60)) {
    let sides = {};
    try { sides = (win._alignRecordSideMap(pid) || {}).sides || {}; } catch (e) { sides = {}; }
    const base = Object.create(null);
    try { (CS.baseline.rows(pid) || []).forEach((b) => { if (b && b.key) base[b.key] = b; }); } catch (e) {}
    for (const x of (CS.formalPatternIndex.rows(pid) || [])) {
      if (!x || !x.key || !x.deferred) continue;
      checkedDeferred++;
      eq(x.read, true, `${pid}/${x.key}: a deferred row still reads, which is the whole point`);
      eq(!!sides[x.key], false, `${pid}/${x.key}: a deferred row is not a side the match may consult`);
      eq(!!base[x.key], false, `${pid}/${x.key}: …nor a record baseline standing in for a stance`);
    }
  }
  must(checkedDeferred > 0, "no deferred row reached the score check");
  console.log(`      ${checkedDeferred} rows read by deferral, every one out of the match and the baseline`);

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
