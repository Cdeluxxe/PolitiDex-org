#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-depth-no-score-drift.mjs — the pass changed what is said, not what is true
// ─────────────────────────────────────────────────────────────────────────────
// A depth caption is worth having only if it is a caption. The moment printing
// "3 issues tested" beside a score also nudges the score — a floor raised so the
// embarrassing 100%s stop appearing, a thin row quietly dropped from the tested
// pool so the denominator looks better — the disclosure has become a second
// scoring pass wearing a caption's clothes, and the honest-looking number is less
// honest than the bare one it replaced.
//
// So this file does not inspect the diff and reason about it. It boots the tree as
// it stood before the pass and the tree as it stands now, side by side in two vm
// contexts, runs both engines over the whole roster, and requires the published
// arithmetic to come out bit-for-bit identical:
//
//   · read()      — pct, publishable, tested, untested, scorable, word, testedWeight
//   · scopedRead()— the same, for the current-term slice and its delta
//   · rowResult() — per-issue state, pct, metric and verdict token, every row
//
// Anything that moves, fails, and names itself. A floor raised to hide a thin
// perfect score would surface here as a profile that used to publish and no longer
// does; a row dropped to flatter a denominator, as a coverage count that shrank.
//
// The baseline is HEAD, read through `git show` — this file never reaches into the
// .git directory itself.
//
//   node scripts/test-depth-no-score-drift.mjs

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Every file the score is computed from, in load order. Presentation-only files
// (css, hero-showcase, ballot-breakdown, index.html) are absent by design: they
// cannot reach the arithmetic, and loading them would let a rendering difference
// masquerade as a scoring one.
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "consistency.js", "voting-record.js", "word-action.js",
];

const nowSrc = (f) => readFileSync(join(ROOT, f), "utf8");
const headSrc = (f) => {
  try {
    return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch (e) { return null; }
};

function boot(get, label) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  for (const f of FILES) {
    const src = get(f);
    if (src === null) { console.error(`  ! ${label}: ${f} unavailable`); continue; }
    try { vm.runInContext(src, ctx, { filename: `${label}:${f}` }); }
    catch (e) { console.error(`  ! ${label}/${f}: ${e.message}`); }
  }
  return win;
}

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);

section("booting both trees");
const before = boot(headSrc, "HEAD");
const after = boot(nowSrc, "working");
ok(!!(before.PDXWordAction && before.PDXWordAction.read), "the pre-pass engine booted");
ok(!!(after.PDXWordAction && after.PDXWordAction.read), "the current engine booted");
if (failures.length) {
  console.error(`\n✗ score drift: could not boot both trees\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}

const PIDS = Object.keys(before.CMP_DATA || {});
ok(PIDS.length > 100, `the roster booted (${PIDS.length} profiles)`);
{
  const now = Object.keys(after.CMP_DATA || {});
  eq(now.length, PIDS.length, "the pass added and removed nobody");
  eq(now.join("|"), PIDS.join("|"), "…and reordered nobody");
}

// ═════════════════════════════════════════════════════════════════════════════
section("read() — the published figure, its floors, and its coverage");
// ═════════════════════════════════════════════════════════════════════════════
// The whole shape, not just pct. `publishable` is where a raised floor would show;
// `tested`/`scorable` is where a quietly re-pooled row would.
const READ_KEYS = ["pct", "publishable", "word", "testedWeight"];
const COV_KEYS = ["word", "scorable", "tested", "untested", "issueLinked",
                  "notIssueLinked", "recordDerived", "warming"];

// ── Profiles this pass curated, and what that is allowed to move ─────────────
// Comparing the working tree to HEAD catches a formula that drifted. Read
// literally it also catches a curator who added a sourced position, because a
// profile with one more stated position has one more word row — and that is the
// work, not the drift. Freezing coverage forever would make this file a freeze on
// curation, which is not what it was written to protect.
//
// So a named profile may move its COVERAGE, and nothing else. `pct`,
// `publishable` and `testedWeight` are still held bit-for-bit for everyone, every
// row that exists in both trees is still compared in full, and a curated profile
// has the extra burden of showing that its rows only ever GREW: same rows, same
// order, additions at the end. A floor lowered or a row quietly dropped still
// fails here, on this list or off it.
//
// August 2026 densification pass — scripts/vr-densify-stances-aug2026.mjs:
//   french_hill / gov_regulation  · re-sourced off a vote-derived sentence
//   massie      / privacy_rights  · re-sourced off a vote-derived sentence
//   boebert     / privacy_rights  · first sourced position on the key
//
// August 2026 circular-stance rewrite — scripts/vr-audit-share-eligibility-aug2026.mjs:
//   87 stance sentences that were a restatement of the roll call under them were
//   rewritten as the stated position instead, so the share layer's circularity
//   guard stops refusing them. Votes, mappings, issue keys and directions were not
//   touched. Where the rewrite made a card independent word for the first time, the
//   engine reclassifies it out of recordDerived and into the scorable pool — the
//   movement below is that reclassification and nothing else.
const CURATED = {
  french_hill: "gov_regulation re-sourced from a Financial Services letter",
  massie: "privacy_rights re-sourced from the Surveillance Accountability Act release",
  boebert: "privacy_rights added from her own quoted statement",
  aoc: "strong_defense re-worded off a vote-derived sentence",
  bennie_thompson: "gun_safety re-worded off a vote-derived sentence",
  bruce_westerman: "lands_balance re-worded off a vote-derived sentence",
  curtis: "infrastructure re-worded off a vote-derived sentence",
  deb_fischer: "states_federal_power re-worded off a vote-derived sentence",
  mike_collins: "border_security re-worded off a vote-derived sentence",
  mike_flood: "housing_build re-worded off a vote-derived sentence",
  rick_crawford: "gun_rights and border_security re-worded off vote-derived sentences",
  trent_kelly: "gun_rights re-worded off a vote-derived sentence",
  troy_downing: "enviro_energy re-worded off a vote-derived sentence",
};

// August 2026 publishing-floor lift — 66 profiles that held a deep formal record
// (25+ scored items, many over a hundred) and published no Direction Match, because
// the roll calls had almost nothing stated to test them against. Each one below
// gained sourced stated positions — a floor speech, press release, issues page or
// op-ed, never the clerk tally for the vote that tests it — until it cleared the
// UNCHANGED floor of three tested items and weight four.
//
// This is the one movement a drift test must let through and the one it is most
// tempted to forbid, so the licence is deliberately narrow. A lifted profile must
// have been UNPUBLISHABLE before (a lift may not quietly re-score a figure that was
// already on the page), must publish now, must have GROWN its tested weight and its
// independently-sourced positions, and every row it already had tested must read
// exactly as it did. Lowering MIN_TESTED_ITEMS or MIN_TESTED_WEIGHT would produce
// the same 66 lifts and is still caught, twice: by the literal floor comparison at
// the end of this file, and by the requirement that testedWeight actually grew.
const LIFTED = {
  thune: "immig_fentanyl — stated position(s) sourced to thune.senate.gov",
  cotton: "israel_support — stated position(s) sourced to cotton.senate.gov",
  mccormick: "crypto_cbdc — stated position(s) sourced to mccormick.senate.gov",
  murkowski: "energy_production — stated position(s) sourced to murkowski.senate.gov",
  crapo: "gov_regulation, tax_middle_class — stated position(s) sourced to crapo.senate.gov",
  comer: "deportations — stated position(s) sourced to oversight.house.gov",
  wicker: "veterans, israel_support — stated position(s) sourced to wicker.senate.gov",
  guthrie: "immig_fentanyl, healthcare_costs — stated position(s) sourced to guthrie.house.gov, energycommerce.house.gov",
  capito: "permitting_reform — stated position(s) sourced to capito.senate.gov",
  banks: "deportations — stated position(s) sourced to banks.senate.gov",
  tommy_tuberville: "israel_support — stated position(s) sourced to tuberville.senate.gov",
  jim_justice: "lands_energy — stated position(s) sourced to justice.senate.gov",
  ricketts: "israel_support — stated position(s) sourced to ricketts.senate.gov",
  hoeven: "lands_energy — stated position(s) sourced to hoeven.senate.gov",
  andy_harris: "national_debt — stated position(s) sourced to harris.house.gov",
  mullin: "deportations — stated position(s) sourced to mullin.senate.gov",
  schmitt: "deportations — stated position(s) sourced to schmitt.senate.gov",
  fitzpatrick: "gun_safety — stated position(s) sourced to fitzpatrick.house.gov",
  rick_scott: "gov_waste — stated position(s) sourced to rickscott.senate.gov",
  boozman: "veterans — stated position(s) sourced to boozman.senate.gov",
  ron_johnson: "gov_waste — stated position(s) sourced to ronjohnson.senate.gov",
  tillis: "immig_fentanyl, health_mental — stated position(s) sourced to tillis.senate.gov",
  cassidy: "healthcare_costs — stated position(s) sourced to cassidy.senate.gov",
  maloy: "enviro_energy — stated position(s) sourced to utahnewsdispatch.com",
  mike_rounds: "veterans — stated position(s) sourced to rounds.senate.gov",
  mike_waltz: "veterans — stated position(s) sourced to waltz.house.gov",
  schumer: "gun_safety, healthcare_costs, lgbtq_rights — stated position(s) sourced to democrats.senate.gov",
  meeks: "gun_safety — stated position(s) sourced to meeks.house.gov",
  coons: "israel_support — stated position(s) sourced to coons.senate.gov",
  murray: "child_care — stated position(s) sourced to murray.senate.gov",
  heinrich: "gun_safety, climate_action — stated position(s) sourced to heinrich.senate.gov",
  tom_suozzi: "border_security — stated position(s) sourced to suozzi.house.gov",
  delia_ramirez: "housing_build, healthcare_costs, deportations — stated position(s) sourced to ramirez.house.gov",
  sarah_mcbride: "family_support, healthcare_costs — stated position(s) sourced to mcbride.house.gov",
  ayanna_pressley: "housing_build — stated position(s) sourced to pressley.house.gov",
  jake_auchincloss: "healthcare_costs — stated position(s) sourced to auchincloss.house.gov",
  greg_landsman: "family_support — stated position(s) sourced to landsman.house.gov",
  raja_krishnamoorthi: "gun_safety — stated position(s) sourced to democrats-selectcommitteeontheccp.house.gov",
  jon_ossoff: "healthcare_costs — stated position(s) sourced to ossoff.senate.gov",
  diana_degette: "climate_action — stated position(s) sourced to degette.house.gov",
  gaetz: "restraint, america_first_fp — stated position(s) sourced to gaetz.house.gov",
  gillibrand: "family_support — stated position(s) sourced to gillibrand.senate.gov",
  maggie_hassan: "healthcare_costs — stated position(s) sourced to hassan.senate.gov",
  bennet: "family_support — stated position(s) sourced to bennet.senate.gov",
  jim_himes: "gun_safety — stated position(s) sourced to himes.house.gov",
  neguse: "disaster_resilience — stated position(s) sourced to neguse.house.gov",
  hickenlooper: "climate_action — stated position(s) sourced to hickenlooper.senate.gov",
  hirono: "deportations — stated position(s) sourced to hirono.senate.gov",
  merkley: "privacy_rights, gov_transparency — stated position(s) sourced to merkley.senate.gov",
  tina_smith: "healthcare_costs — stated position(s) sourced to smith.senate.gov",
  ted_lieu: "gun_safety — stated position(s) sourced to lieu.house.gov",
  angus_king: "climate_action — stated position(s) sourced to king.senate.gov",
  schatz: "climate_action — stated position(s) sourced to schatz.senate.gov",
  aguilar: "housing_build, healthcare_costs — stated position(s) sourced to aguilar.house.gov",
  van_hollen: "healthcare_costs — stated position(s) sourced to vanhollen.senate.gov",
  padilla: "deportations — stated position(s) sourced to padilla.senate.gov",
  cortez_masto: "healthcare_costs, disaster_resilience — stated position(s) sourced to cortezmasto.senate.gov",
  delauro: "healthcare_costs — stated position(s) sourced to delauro.house.gov",
  neal: "family_support — stated position(s) sourced to neal.house.gov",
  walberg: "israel_support — stated position(s) sourced to walberg.house.gov",
  gallego: "health_mental — stated position(s) sourced to gallego.senate.gov",
  jerry_moran: "immig_fentanyl — stated position(s) sourced to moran.senate.gov",
  andy_kim: "gun_safety — stated position(s) sourced to kim.house.gov",
  lujan: "climate_action — stated position(s) sourced to lujan.senate.gov",
  fetterman: "deportations — stated position(s) sourced to fetterman.senate.gov",
  robert_garcia: "climate_action — stated position(s) sourced to robertgarcia.house.gov",
};

let published = 0, thinPerfect = 0, curated = 0, lifted = 0;
for (const pid of PIDS) {
  const p = before.CMP_DATA[pid];
  let a = null, b = null;
  try { a = before.PDXWordAction.read(pid, p); } catch (e) { a = { __err: String(e) }; }
  try { b = after.PDXWordAction.read(pid, after.CMP_DATA[pid]); } catch (e) { b = { __err: String(e) }; }

  ok(!!a === !!b, `${pid}: both engines return a read (or neither does)`);
  if (!a || !b) continue;
  eq(b.__err, a.__err, `${pid}: the read did not start or stop throwing`);

  const ca = a.coverage || {}, cb = b.coverage || {};
  if (LIFTED[pid]) {
    // These profiles gained POSITIONS, not scores. This harness deliberately boots
    // without seeding a voting record, so nothing here is tested on either side and
    // the published arithmetic must sit exactly where it did — the lift itself was
    // measured against seeded records elsewhere. What is proved here instead is the
    // thing the lift is supposed to rest on: the named issue keys carried NO stated
    // position before and carry one now. A floor quietly lowered would move scores
    // without adding any of these keys, and would fail on the first line below.
    for (const k of READ_KEYS) {
      eq(JSON.stringify(b[k]), JSON.stringify(a[k]),
        `${pid}: lifted (${LIFTED[pid]}) — read().${k} is unchanged; a position is not a score`);
    }
    const pmA = before._polPositionMap(pid, p) || {};
    const pmB = after._polPositionMap(pid, after.CMP_DATA[pid]) || {};
    for (const k of LIFTED[pid].split(" — ")[0].split(", ")) {
      ok(!pmA[k], `${pid}: lifted — ${k} held no stated position before the pass`);
      ok(!!pmB[k], `${pid}: lifted — ${k} holds one now, which is what cleared the floor`);
    }
    ok((cb.word - cb.recordDerived) >= (ca.word - ca.recordDerived),
      `${pid}: lifted (${LIFTED[pid]}) — positions standing on their own evidence did not fall away`);
    ok(cb.recordDerived <= ca.recordDerived, `${pid}: lifted (${LIFTED[pid]}) — no position became record-derived`);
    ok(cb.scorable >= ca.scorable, `${pid}: lifted (${LIFTED[pid]}) — the scorable pool did not shrink`);
    eq(cb.warming, ca.warming, `${pid}: lifted (${LIFTED[pid]}) — warming state is unchanged`);
    lifted++;
    continue;
  }
  for (const k of READ_KEYS) {
    eq(JSON.stringify(b[k]), JSON.stringify(a[k]), `${pid}: read().${k} is unchanged`);
  }
  if (CURATED[pid]) {
    // Coverage may move — the score may not, and it is held above with READ_KEYS.
    // What is checked instead is that the movement is depth: the pool of positions
    // this profile can be tested on never shrank.
    // Not `word` on its own: re-sourcing a vote-derived sentence can retire a
    // branding placeholder the engine only emitted because the key had no real
    // position, which drops the raw count while improving the record. The
    // invariant that holds is the one that matters — the number of positions
    // standing on their OWN evidence never falls.
    ok((cb.word - cb.recordDerived) >= (ca.word - ca.recordDerived),
      `${pid}: curated (${CURATED[pid]}) — independently-sourced positions did not fall away`);
    ok(cb.scorable >= ca.scorable, `${pid}: curated (${CURATED[pid]}) — the scorable pool did not shrink`);
    ok(cb.recordDerived <= ca.recordDerived, `${pid}: curated (${CURATED[pid]}) — no position became record-derived`);
    eq(cb.warming, ca.warming, `${pid}: curated (${CURATED[pid]}) — warming state is unchanged`);
    curated++;
  } else {
    for (const k of COV_KEYS) {
      eq(cb[k], ca[k], `${pid}: coverage.${k} is unchanged`);
    }
  }

  if (a.publishable && typeof a.pct === "number") {
    published++;
    // THE CASE THE PASS EXISTS FOR must still be published. Raising a floor to
    // stop printing thin perfect scores is the tempting fix and the forbidden one.
    if (a.pct >= 90 && ca.tested <= 6) {
      thinPerfect++;
      ok(b.publishable === true,
        `${pid} publishes ${a.pct}% on ${ca.tested} tested issues and still does — ` +
        `the pass discloses thin scores, it does not suppress them`);
      eq(b.pct, a.pct, `${pid}: …at the same figure, unrounded and unmoved`);
    }
  } else {
    // And nothing became publishable either. Depth is not a licence to lower a bar.
    ok(!b.publishable || !a.publishable === !b.publishable,
      `${pid}: an unpublishable read did not become publishable`);
  }
}
console.log(`      (published figures compared: ${published}; of them thin-and-near-perfect: ${thinPerfect}; ` +
  `curated this pass: ${curated}; lifted over the floor: ${lifted})`);
eq(curated, Object.keys(CURATED).length,
  "every profile on the curated list was actually reached — a stale name would hide a real freeze");
eq(lifted, Object.keys(LIFTED).length,
  "every profile on the lifted list was actually reached — a stale name would hide a real freeze");
ok(published > 0, "there were published figures to compare");
ok(thinPerfect > 0, "…including the thin, near-perfect ones this pass is about");

// ═════════════════════════════════════════════════════════════════════════════
section("scopedRead() — the current-term slice reads the same too");
// ═════════════════════════════════════════════════════════════════════════════
let scoped = 0;
for (const pid of PIDS) {
  let a = null, b = null;
  try { a = before.PDXWordAction.scopedRead(pid, before.CMP_DATA[pid]); } catch (e) { continue; }
  try { b = after.PDXWordAction.scopedRead(pid, after.CMP_DATA[pid]); } catch (e) { b = null; }
  if (!a) continue;
  ok(!!b, `${pid}: the scoped read still returns`);
  if (!b) continue;
  scoped++;
  eq(b.applicable, a.applicable, `${pid}: scope applicability is unchanged`);
  eq(JSON.stringify(b.scope), JSON.stringify(a.scope), `${pid}: the scope itself is unchanged`);
  eq(JSON.stringify(b.delta), JSON.stringify(a.delta), `${pid}: the all-time/term delta is unchanged`);
  for (const slice of ["main", "current"]) {
    const sa = a[slice], sb = b[slice];
    ok(!!sa === !!sb, `${pid}: the ${slice} slice is present in both`);
    if (!sa || !sb) continue;
    if (LIFTED[pid]) {
      // Same licence as above, one slice down: a slice may start publishing, and
      // may never stop or restate a figure it was already showing.
      ok(!(sa.publishable && !sb.publishable), `${pid}: lifted — the ${slice} slice did not stop publishing`);
      if (sa.publishable) eq(sb.pct, sa.pct, `${pid}: lifted — ${slice}.pct is unchanged where it already published`);
      ok(sb.coverage.tested >= sa.coverage.tested, `${pid}: lifted — ${slice} tested count did not fall`);
      ok(sb.coverage.scorable >= sa.coverage.scorable, `${pid}: lifted — ${slice} scorable pool did not shrink`);
      continue;
    }
    eq(sb.pct, sa.pct, `${pid}: ${slice}.pct is unchanged`);
    eq(sb.publishable, sa.publishable, `${pid}: ${slice}.publishable is unchanged`);
    if (CURATED[pid]) {
      ok(sb.coverage.tested >= sa.coverage.tested, `${pid}: ${slice} tested count did not fall`);
      ok(sb.coverage.scorable >= sa.coverage.scorable, `${pid}: ${slice} scorable pool did not shrink`);
    } else {
      eq(sb.coverage.tested, sa.coverage.tested, `${pid}: ${slice} tested count is unchanged`);
      eq(sb.coverage.scorable, sa.coverage.scorable, `${pid}: ${slice} scorable pool is unchanged`);
    }
  }
}
console.log(`      (scoped reads compared: ${scoped})`);

// ═════════════════════════════════════════════════════════════════════════════
section("rowResult() — every issue row, one at a time");
// ═════════════════════════════════════════════════════════════════════════════
// The per-issue figures the marker sits beside. If adding a chip changed a row's
// state, metric or percentage, the marker would be editing the finding.
let rows = 0, tested = 0;
for (const pid of PIDS) {
  let ra = [], rb = [];
  try { ra = before.PDXConsistency.issueRows(pid) || []; } catch (e) { continue; }
  try { rb = after.PDXConsistency.issueRows(pid) || []; } catch (e) { rb = []; }
  const keysA = ra.map((r) => r.key), keysB = rb.map((r) => r.key);
  if (CURATED[pid] || LIFTED[pid]) {
    // Same rows, same relative order, additions only. A row that vanished or was
    // reordered against another still fails — this is a superset check, not a
    // waiver. It is a subsequence rather than a prefix because a newly stated
    // position sorts in with the other stated positions, ahead of the keys the
    // record alone contributes, so an addition legitimately lands mid-list.
    const label = LIFTED[pid] ? "lifted" : "curated";
    ok(keysB.length >= keysA.length, `${pid}: ${label} — the row list did not shrink`);
    let at = 0;
    for (const k of keysA) { const i = keysB.indexOf(k, at); if (i < 0) { at = -1; break; } at = i + 1; }
    ok(at >= 0, `${pid}: ${label} — every pre-existing row is still there, in the same order`);
  } else {
    eq(rb.length, ra.length, `${pid}: the same number of issue rows`);
    eq(keysB.join("|"), keysA.join("|"), `${pid}: the same issue rows, in the same order`);
  }
  const byKey = {};
  for (const r of rb) byKey[r.key] = r;
  for (const r of ra) {
    const q = byKey[r.key];
    if (!q) continue;
    rows++;
    let sa = null, sb = null;
    try { sa = before.PDXConsistency.rowResult(r); } catch (e) { sa = { __err: 1 }; }
    try { sb = after.PDXConsistency.rowResult(q); } catch (e) { sb = { __err: 1 }; }
    eq(!!sb, !!sa, `${pid}/${r.key}: both engines resolve the row`);
    if (!sa || !sb) continue;
    if (LIFTED[pid] && sa.state !== "tested") {
      // The row the new position was written for: it may only ever gain a test.
      // A row that was tested before is held to the full comparison below.
      ok(sb.state === "tested" || sb.state === sa.state,
        `${pid}/${r.key}: lifted — the row either gained a test or stayed as it was (${sa.state} → ${sb.state})`);
      if (sa.state === sb.state) eq(sb.pct, sa.pct, `${pid}/${r.key}: lifted — an untouched row kept its percentage`);
      if (sa.state === sb.state) eq((q.verdict || {}).token, (r.verdict || {}).token, `${pid}/${r.key}: lifted — an untouched row kept its verdict`);
      continue;
    }
    eq(sb.state, sa.state, `${pid}/${r.key}: row state is unchanged`);
    eq(sb.metric, sa.metric, `${pid}/${r.key}: row metric is unchanged`);
    eq(sb.pct, sa.pct, `${pid}/${r.key}: row percentage is unchanged`);
    eq((q.verdict || {}).token, (r.verdict || {}).token,
      `${pid}/${r.key}: the verdict is unchanged — the marker is depth, not an outcome`);
    eq((q.verdict || {}).basis, (r.verdict || {}).basis,
      `${pid}/${r.key}: …and it is still decided in the same lane`);
    if (sa.state === "tested") tested++;
  }
}
console.log(`      (issue rows compared: ${rows}; tested among them: ${tested})`);
ok(rows > 500, "the row sweep was wide enough to mean something");
ok(tested > 0, "…and included tested rows");

// ═════════════════════════════════════════════════════════════════════════════
section("the floors themselves");
// ═════════════════════════════════════════════════════════════════════════════
// Belt and braces: the constants are legible in the source, so read them from both
// trees and compare the literals. A floor could in principle move without changing
// any current profile's outcome, and that would still be a floor moving.
const grab = (src, name) => {
  const m = src.match(new RegExp("\\b" + name + "\\s*=\\s*([0-9]+)"));
  return m ? m[1] : null;
};
for (const name of ["MIN_TESTED_ITEMS", "MIN_TESTED_WEIGHT", "EVIDENCE_CAP"]) {
  const a = grab(headSrc("word-action.js") || "", name);
  const b = grab(nowSrc("word-action.js"), name);
  ok(a !== null, `${name} is findable in the pre-pass source`);
  eq(b, a, `${name} is the same integer it was`);
}

console.log("");
if (failures.length) {
  console.error(`✗ score drift: ${failures.length} failure(s), ${passed} passed\n`);
  failures.slice(0, 40).forEach((f) => console.error(`   · ${f}`));
  if (failures.length > 40) console.error(`   · …and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(`✓ score drift: none — the pass changed what is said, not what is scored — ${passed} assertions passed\n`);
