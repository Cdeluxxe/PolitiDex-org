#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-dossier-read.mjs — the dossier's plain-language read, and the seven
// things it is not allowed to become
// ─────────────────────────────────────────────────────────────────────────────
// The 🏛️ column of an issue dossier used to open on a chip, a count strip and a
// list of cards: everything a reader needed to work out what the formal record
// showed, and nothing that actually said it. This phase adds two blocks above the
// evidence — "What the record shows" (the read: direction, depth, and the
// qualifiers that matter) and "Which measures this came from" (the roll-up of
// named instruments the signal was built out of).
//
// Both are RE-PRINTS. Every word and every number in them already existed
// somewhere on the page or in an engine the page calls; nothing here reads the
// record a second time. That is the whole fence, and it is what this file holds:
//
//   1. IT IS A RE-PRINT, NOT A SECOND READING. Tier, label, counts, side word and
//      refusal reason are the formal-pattern index's own, compared row by row on
//      live members.
//   2. IT FAILS CLOSED. No member, no issue, no votes yet, unknown key → nothing
//      rendered at all, which is what the column did before this existed.
//   3. NO SCORE REACHES IT. No percentage, no pill, no Direction Match figure, no
//      ranking. A second number beside the first is a second score.
//   4. EVERY CAVEAT HAS A DETECTOR BEHIND IT. Package, single-instrument,
//      procedural, thin, not-one-sided, partial — each fires only where the
//      shipped function that owns that fact fired, and never on its own reading.
//   5. THE LANES STAY SEPARATE AND IN ORDER. Lane label, read, drivers,
//      institutional context, evidence, share — once each, in that order.
//   6. EVERY DRIVER FIGURE IS A COUNT OF ROWS ALREADY LISTED BELOW IT, package
//      marks come from the vehicle list, and a clipped list says what it clipped.
//   7. NOTHING MOVED. Every tier, count, label and Direction Match figure is
//      identical on a boot that renders the new blocks and one that never does.
//
//   node scripts/test-dossier-read.mjs
//
// Real shipped modules in a node:vm sandbox, real profile data, and the live
// record corpus seeded the way a completed /api/voting-record fetch leaves it.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "profile-spine.js", "profiles-full.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
function boot() {
  const win = makeSandbox();
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const [f, src] of SRC) vm.runInContext(src, sandbox, { filename: f });
  win.PROFILES = win.CMP_DATA;
  return win;
}

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const section = (t) => console.log(`\n   ── ${t}`);
const visible = (h) => String(h).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
// The word-wall polices PROSE THIS LAYER COMPOSED. A measure's own short title is
// quoted data — "Bipartisan Safer Communities Act" is what Congress called it, and
// a test that reads the substring "partisan" out of a statute's name and calls it
// party framing would force the roll-up to paraphrase bill titles, which is the
// one thing it must never do. The two spans that carry quoted names come out
// before the scan; everything this layer wrote stays in.
const prose = (h) => visible(String(h)
  .replace(/<span class="pdxgap-drv-id">[\s\S]*?<\/span>/g, " ")
  .replace(/<span class="pdxgap-drv-t">[\s\S]*?<\/span>/g, " "));
// A probe that finds nothing must fail loudly. A renamed symbol otherwise turns
// this whole file into a very fast, very green no-op.
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ dossier-read: STALE PROBE — ${msg}`);
  process.exit(2);
};

const W = boot();
const CS = W.PDXConsistency;
must(CS, "PDXConsistency is not exposed");
for (const fn of ["dossierRead", "dossierReadHtml", "dossierDrivers", "dossierDriversHtml",
                  "dossierItems", "dossierCoverage", "gapViewHtml"]) {
  must(typeof CS[fn] === "function", `PDXConsistency.${fn} is not exposed`);
}
must(CS.formalPatternIndex && typeof CS.formalPatternIndex.rows === "function",
  "the formal-pattern index no longer publishes rows()");
must(CS.vehicle && typeof CS.vehicle.stats === "function",
  "the vehicle layer no longer publishes stats()");
must(CS.menu && typeof CS.menu.scan === "function", "the menu word-wall is not exposed");

const SAYS = W._PDX_RD_SAYS || {};
must(Object.keys(SAYS).length > 4, "the locked reader vocabulary _PDX_RD_SAYS is missing");
const SAY_LABELS = new Set(Object.keys(SAYS).map((k) => SAYS[k] && SAYS[k].label).filter(Boolean));
const KEYS = Object.keys(W.ISSUE_MAP);
must(KEYS.length > 20, "the issue map came back too small to sweep");

const corpus = buildCorpus(ROOT);
must(corpus && corpus.byMember && corpus.byMember.size > 50,
  "the record corpus did not load enough members to sweep");
// One boot, seeded member by member, exactly as the menu-context sweep does it.
const seedAll = (win, limit) => {
  const done = [];
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch (e) { continue; }
    done.push(pid);
    if (done.length >= limit) break;
  }
  return done;
};
const PIDS = seedAll(W, 40);
must(PIDS.length >= 30, "too few members seeded to sweep");

// One pass over the live corpus, kept for every section below so the sweep is
// paid for once.
const READS = [];   // { pid, key, d, html, drv, drvHtml, fpi, tree }
for (const pid of PIDS) {
  const fpi = Object.create(null);
  (CS.formalPatternIndex.rows(pid) || []).forEach((r) => { if (r && r.key) fpi[r.key] = r; });
  // The stance tree's Record slot for the same row, which is the OTHER surface a
  // reader sees this characterisation on. It is carried through the sweep because
  // "the two may not disagree" is a claim about a pair, and the pair has to be
  // held to be checked — see the third leg of section 1.
  const tree = Object.create(null);
  (CS.issueRows(pid) || []).forEach((r) => {
    if (!r || !r.key) return;
    try { tree[r.key] = CS.recordPattern.display(r) || null; } catch (e) { tree[r.key] = null; }
  });
  for (const key of KEYS) {
    let d;
    try { d = CS.dossierRead(pid, key); } catch (e) { d = null; }
    if (!d || d.state === "cold") continue;
    READS.push({
      pid, key, d,
      html: CS.dossierReadHtml(pid, key),
      drv: CS.dossierDrivers(pid, key),
      drvHtml: CS.dossierDriversHtml(pid, key),
      fpi: fpi[key] || null,
      tree: tree[key] || null,
    });
  }
}
must(READS.length > 200, `the sweep produced too few reads to test (${READS.length})`);
const REEDS = READS.filter((x) => x.d.state === "reads");
must(REEDS.length > 100, `the sweep produced too few directional reads (${REEDS.length})`);
console.log(`      swept ${PIDS.length} members · ${READS.length} reads · ${REEDS.length} directional`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · a re-print, not a second reading");
// ═════════════════════════════════════════════════════════════════════════════
// Every characterisation word in the block belongs to an engine that already
// published it. If this block and the formal-pattern index can disagree about a
// member's tier, one of them is inventing.
const drift = [];
let mirrored = 0, refusals = 0;
for (const x of REEDS) {
  if (!x.fpi || !x.fpi.read) continue;
  mirrored++;
  if (x.d.tier !== x.fpi.tier) drift.push(`${x.pid}/${x.key}: tier ${x.d.tier} vs ${x.fpi.tier}`);
  if (x.d.label !== x.fpi.patLabel) drift.push(`${x.pid}/${x.key}: label drift`);
  if (x.d.counts !== x.fpi.counts) drift.push(`${x.pid}/${x.key}: counts drift`);
  if (x.d.judged !== x.fpi.judged) drift.push(`${x.pid}/${x.key}: judged drift`);
}
must(mirrored > 100, `too few rows carried a formal-pattern row to mirror (${mirrored})`);
eq(drift.length, 0, `tier, label, counts and judged are the index's own — ${drift.slice(0, 3).join(" | ")}`);
console.log(`      ${mirrored} reads mirrored against the formal-pattern index`);

// The refusal path says why in the index's words too, not in words of its own.
for (const x of READS) {
  if (x.d.state !== "unread" && x.d.state !== "exec") continue;
  refusals++;
  ok(!!(x.d.why && x.d.why.lb), `${x.pid}/${x.key}: a refusal with no reason`);
  if (x.fpi && !x.fpi.read && x.d.why && x.fpi.why) {
    eq(x.d.why.lb, x.fpi.why.lb, `${x.pid}/${x.key}: refusal reason is the index's own`);
  }
}
must(refusals > 5, `too few refusals swept to check the unread path (${refusals})`);

// ── AND THE THIRD LEG: THE ROWS THE INDEX REFUSED AND THE TREE DID NOT ───────
// The formal-pattern index and the stance tree do not ask the same question. The
// index goes through the thin door (_stThinDirRead), which refuses a ledger that
// ran both ways and refuses any tier but `thin`; the tree's Record slot reads the
// display tier directly, so it labels those rows. A dossier that mirrors only the
// index therefore printed a refusal under a leaf whose own chip carried a side —
// "Not about this issue" beneath "Thin supports", or "ran both ways, too few to
// weigh" beneath "Split". Whichever the reader saw last won.
//   So the mirror has two sources in a fixed order: the index where the index
// read, the tree where it did not. What is forbidden is the third state — a
// characterisation on one surface and a refusal, or a different tier, on the
// other.
const split = [];
let deferred = 0;
for (const x of READS) {
  const pub = x.tree && x.tree.tier && x.tree.tier !== "none" ? x.tree.tier : null;
  if (!pub) continue;
  if (x.d.state !== "reads") {
    split.push(`${x.pid}/${x.key}: tree published ${pub}, dossier refused with "${(x.d.why && x.d.why.lb) || x.d.state}"`);
    continue;
  }
  if (x.d.tier !== pub) split.push(`${x.pid}/${x.key}: dossier ${x.d.tier} vs tree ${pub}`);
  if (!x.fpi || !x.fpi.read) deferred++;
}
eq(split.length, 0, `the dossier never contradicts the tree's published read — ` +
  split.slice(0, 3).join(" | "));
must(deferred > 0, "no row in the sweep exercised the deferral to the tree's read");
console.log(`      ${deferred} reads deferred to the tree where the index refused`);

// And the side word is drawn from the locked vocabulary, never composed here.
const strays = REEDS.filter((x) => x.d.says && !SAY_LABELS.has(x.d.says));
eq(strays.length, 0, `every side word comes from the locked reader vocabulary — ` +
  strays.slice(0, 3).map((x) => `${x.pid}/${x.key}: "${x.d.says}"`).join(" | "));

// ═════════════════════════════════════════════════════════════════════════════
section("2 · it fails closed");
// ═════════════════════════════════════════════════════════════════════════════
eq(CS.dossierReadHtml("", ""), "", "no member and no issue renders nothing");
// An unrecognised key is not a special case anywhere else in the module — the
// whole dossier renders for one — so the wall here is the one that matters: it
// can never produce a direction. It reaches the same refusal every unreadable
// lane reaches.
eq(CS.dossierRead(PIDS[0], "not_a_real_issue_key").state !== "reads", true,
  "an unknown issue never produces a directional read");
eq(CS.dossierRead(PIDS[0], "not_a_real_issue_key").says, "",
  "an unknown issue carries no side word");
eq(CS.dossierReadHtml("not_a_real_member", KEYS[0]), "", "an unknown member renders nothing");
eq(CS.dossierDriversHtml(PIDS[0], "not_a_real_issue_key"), "", "drivers are silent on an unknown issue");
// A boot whose votes have never landed is the state the column shipped in.
const COLD = boot();
must(COLD.PDXConsistency, "the cold boot did not stand up");
let coldHtml = 0;
for (const key of KEYS.slice(0, 12)) {
  if (COLD.PDXConsistency.dossierReadHtml(PIDS[0], key)) coldHtml++;
}
eq(coldHtml, 0, "a member whose record has not arrived renders no read at all");
// …and a single-item lane gets no roll-up, because the card below it already
// names the measure.
const solos = READS.filter((x) => x.drv && x.drv.items < 2);
must(solos.length > 0, "no single-item lanes swept to check the drivers gate");
eq(solos.filter((x) => x.drvHtml !== "").length, 0,
  "a one-item lane renders no measures roll-up");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · no score, no share, no ranking");
// ═════════════════════════════════════════════════════════════════════════════
// The dossier already carries one number with a methodology behind it. A second
// figure in the block above it reads as a second verdict no matter how it is
// worded, so the block carries counts and only counts.
const scored = [];
for (const x of READS) {
  const txt = visible(x.html) + " " + visible(x.drvHtml);
  if (/\d\s?%/.test(txt)) scored.push(`${x.pid}/${x.key}: a percentage`);
  // The phrase itself is allowed, and only in the shipped lane sentence that
  // exists to say this record is NOT counted there. A number beside it is not.
  if (/Direction Match[^.]*\d/.test(txt)) scored.push(`${x.pid}/${x.key}: a Direction Match figure`);
  if (/Direction Match/.test(txt) && !/never counted in Direction Match/.test(txt)) {
    scored.push(`${x.pid}/${x.key}: Direction Match named outside the lane sentence`);
  }
  if (/\b\d+(\.\d+)?\s*(out of|\/)\s*\d+\b/.test(txt)) scored.push(`${x.pid}/${x.key}: a ratio`);
  if (/\branked?\b|\bscore[sd]?\b|\brating\b|\bgrade\b/i.test(txt)) scored.push(`${x.pid}/${x.key}: ranking language`);
  if (String(x.html).indexOf("pdxgap-pill") >= 0) scored.push(`${x.pid}/${x.key}: a score pill`);
}
eq(scored.length, 0, `no score reaches the read or the roll-up — ${scored.slice(0, 4).join(" | ")}`);
// The same word-wall the institutional note is held to: no party framing, no
// intent language, no evasion verbs.
const walled = [];
for (const x of READS) {
  const hits = CS.menu.scan(prose(x.html) + " " + prose(x.drvHtml));
  if (hits.length) walled.push(`${x.pid}/${x.key}: ${hits.join(", ")}`);
}
eq(walled.length, 0, `no read or roll-up uses walled language — ${walled.slice(0, 4).join(" | ")}`);

// ═════════════════════════════════════════════════════════════════════════════
section("4 · every caveat has a shipped detector behind it");
// ═════════════════════════════════════════════════════════════════════════════
const cavOf = (x) => new Set((x.d.caveats || []).map((c) => c.id));
const fired = {};
for (const x of READS) {
  const c = cavOf(x), d = x.d;
  Object.keys({ package: 1, single: 1, procedural: 1, thin: 1, notuniform: 1, mix: 1, partial: 1 })
    .forEach((id) => { if (c.has(id)) fired[id] = (fired[id] || 0) + 1; });

  // ① package ⇔ the stowaway detector on the vehicle stats, nothing else.
  let v = null;
  try { v = CS.vehicle.stats(x.pid, x.key); } catch (e) { v = null; }
  eq(c.has("package"), !!(v && v.stowaway), `${x.pid}/${x.key}: package caveat tracks the stowaway detector`);

  // ② single ⇔ exactly one named instrument under the whole lane.
  if (c.has("single")) ok(x.drv && x.drv.docs === 1,
    `${x.pid}/${x.key}: single-instrument caveat over ${x.drv && x.drv.docs} measures`);

  // ③ procedural ⇔ every judged act on the row was floor machinery.
  eq(c.has("procedural"), !!(d.judged > 0 && d.procedural >= d.judged),
    `${x.pid}/${x.key}: procedural caveat tracks the judged-vs-procedural count`);

  // ④ thin ⇔ the thin tier, and never twice over one judged act.
  if (c.has("thin")) {
    eq(d.tier, "thin", `${x.pid}/${x.key}: thin caveat only on the thin tier`);
    ok(!(c.has("single") && d.judged <= 1),
      `${x.pid}/${x.key}: one judged act is warned about once, not twice`);
  }

  // ⑤ not-one-sided ⇔ items really did fall both ways.
  if (c.has("notuniform")) ok(d.advances > 0 && d.opposes > 0,
    `${x.pid}/${x.key}: not-one-sided caveat over a uniform ledger`);
  if (d.state === "reads" && d.tier && d.advances > 0 && d.opposes > 0 && d.tier !== "none") {
    ok(c.has("notuniform") || d.tier === "split",
      `${x.pid}/${x.key}: a two-sided ledger says so, in the caveat or in the tier`);
  }

  // ⑥ partial ⇔ the coverage gap L2 already discloses.
  let cov = null;
  try { cov = CS.dossierCoverage(x.pid, x.key); } catch (e) { cov = null; }
  eq(c.has("partial"), !!(cov && cov.missing),
    `${x.pid}/${x.key}: partial caveat tracks the listing coverage`);

  // No caveat is ever an empty bullet.
  (d.caveats || []).forEach((cv) => {
    ok(!!(cv && cv.id && cv.text && String(cv.text).trim().length > 12),
      `${x.pid}/${x.key}: caveat "${cv && cv.id}" is empty`);
  });
}
// The six the shipped corpus can reach. `partial` is the seventh: it fires only
// while a member's roll-call record is still arriving, which a fully-seeded
// corpus never is — so it is held to the same equivalence above (it must be
// absent exactly where the coverage gap is absent) rather than to a live count.
// `mix` is the record-composition note, which the shipped floor-vote corpus does
// not produce on this population either.
for (const id of ["package", "single", "procedural", "thin", "notuniform"]) {
  must((fired[id] || 0) > 0, `the sweep never exercised the "${id}" caveat`);
}
console.log(`      caveats exercised — ` +
  Object.keys(fired).sort().map((k) => `${k}:${fired[k]}`).join(" · "));

// A qualifier that arrives after the impression is not a qualifier: the caveats
// sit above the evidence, inside the block that made the claim.
const withCav = READS.filter((x) => (x.d.caveats || []).length);
must(withCav.length > 20, "too few caveated reads to check placement");
for (const x of withCav.slice(0, 40)) {
  const h = String(x.html);
  ok(h.indexOf('data-pdxgap-cav=') > 0, `${x.pid}/${x.key}: caveats reach the markup`);
  ok(h.indexOf('data-pdxgap-cav=') > h.indexOf('pdxgap-read-says'),
    `${x.pid}/${x.key}: caveats sit under the claim they qualify`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the lanes stay separate, and in order");
// ═════════════════════════════════════════════════════════════════════════════
const LANES = (CS.menu.LANES || {});
must(LANES.record && LANES.menu, "the lane labels are no longer published");
let sheets = 0, ctxSheets = 0;
const misplaced = [];
for (const x of REEDS) {
  const html = String(CS.gapViewHtml(x.pid, x.key) || "");
  if (html.indexOf('data-pdxgap-read="reads"') < 0) continue;
  sheets++;
  const iLane = html.indexOf("pdxgap-lane-lb");
  const iRead = html.indexOf('data-pdxgap-read=');
  const iShare = html.indexOf("pdxgap-share");
  const iDrv = html.indexOf('data-pdxgap-drv=');
  const iCtx = html.indexOf("pdxgap-ctx-h");
  const iMenu = html.indexOf("data-pdxgap-menu");
  if (!(iLane > 0 && iLane < iRead)) misplaced.push(`${x.pid}/${x.key}: lane label not above the read`);
  if (!(iRead < iShare)) misplaced.push(`${x.pid}/${x.key}: read below the share row`);
  if (iDrv > 0 && !(iRead < iDrv)) misplaced.push(`${x.pid}/${x.key}: roll-up above the read`);
  if (iCtx > 0) {
    ctxSheets++;
    if (!(iRead < iCtx)) misplaced.push(`${x.pid}/${x.key}: institutional context above the personal read`);
    if (iDrv > 0 && !(iDrv < iCtx)) misplaced.push(`${x.pid}/${x.key}: context above the roll-up`);
    if (iMenu > 0 && !(iCtx < iMenu)) misplaced.push(`${x.pid}/${x.key}: the menu note escaped its frame`);
  }
  if ((html.match(/data-pdxgap-read=/g) || []).length !== 1) misplaced.push(`${x.pid}/${x.key}: read mounted twice`);
  if ((html.match(/data-pdxgap-drv=/g) || []).length > 1) misplaced.push(`${x.pid}/${x.key}: roll-up mounted twice`);
  if (sheets >= 25) break;
}
must(sheets >= 15, `too few assembled dossiers carried the read (${sheets})`);
must(ctxSheets >= 1, "no assembled dossier carried the institutional context to place");
eq(misplaced.length, 0, `every dossier keeps the lanes ordered — ${misplaced.slice(0, 3).join(" | ")}`);
console.log(`      ${sheets} assembled dossiers checked · ${ctxSheets} with institutional context`);
// The frame says whose lane each half is, in the shipped words.
const framed = String(CS.gapViewHtml(REEDS[0].pid, REEDS[0].key) || "");
has(framed, LANES.record, "the personal lane is labelled in the shipped words");

// ═════════════════════════════════════════════════════════════════════════════
section("6 · every driver figure counts rows that are listed below it");
// ═════════════════════════════════════════════════════════════════════════════
const bad = [];
let rolled = 0, capped = 0, pkgRows = 0;
for (const x of READS) {
  const d = x.drv;
  if (!d || !d.rows.length) continue;
  let items = [];
  try { items = CS.dossierItems(x.pid, x.key) || []; } catch (e) { items = []; }
  if (d.items !== items.length) bad.push(`${x.pid}/${x.key}: ${d.items} items vs ${items.length} listed`);
  rolled++;
  const idents = new Set(items.map((it) => String((it && it.ident) || "").trim().toLowerCase() || "unnamed action"));
  if (d.docs !== idents.size) bad.push(`${x.pid}/${x.key}: ${d.docs} measures vs ${idents.size} distinct idents`);
  let sum = 0;
  d.rows.forEach((g) => {
    sum += g.n;
    if (g.adv + g.opp + g.held > g.n) bad.push(`${x.pid}/${x.key}/${g.ident}: split exceeds the row count`);
    if (g.pkg) pkgRows++;
  });
  if (sum > d.items) bad.push(`${x.pid}/${x.key}: rolled-up items exceed the lane`);
  if (d.docs > d.rows.length) {
    capped++;
    eq(d.more, d.docs - d.rows.length, `${x.pid}/${x.key}: the clip counts what it clipped`);
    has(x.drvHtml, "more measure", `${x.pid}/${x.key}: a clipped list says so`);
    has(x.drvHtml, "listed in full below", `${x.pid}/${x.key}: a clipped list says where the rest are`);
  }
  // The package mark is the vehicle layer's list, not a guess from the title.
  let v = null;
  try { v = CS.vehicle.stats(x.pid, x.key); } catch (e) { v = null; }
  const veh = new Set(((v && v.vehicles) || []).map((s) => String(s || "").trim().toLowerCase()));
  d.rows.forEach((g) => {
    if (g.pkg && !veh.has(String(g.ident).toLowerCase())) {
      bad.push(`${x.pid}/${x.key}/${g.ident}: marked a package the vehicle layer never named`);
    }
  });
}
must(rolled > 50, `too few roll-ups swept (${rolled})`);
must(pkgRows > 0, "the sweep never exercised a package-marked measure row");
must(capped > 0, "the sweep never exercised the clip");
eq(bad.length, 0, `every roll-up figure is a count of listed rows — ${bad.slice(0, 4).join(" | ")}`);
console.log(`      ${rolled} roll-ups · ${pkgRows} package-borne measures · ${capped} clipped lists`);

// ═════════════════════════════════════════════════════════════════════════════
section("7 · nothing moved");
// ═════════════════════════════════════════════════════════════════════════════
// The read is presentation. If rendering it can change a tier, a count or a
// Direction Match figure, it is not presentation.
const FP_PID = PIDS.find((p) => (CS.formalPatternIndex.rows(p) || []).length > 6) || PIDS[0];
const fingerprint = (win, render) => {
  const cs = win.PDXConsistency;
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch (e) {}
    if (pid === FP_PID) break;
  }
  try { win.PDXVotingRecord.noteMember(FP_PID, corpus.byMember.get(FP_PID)); } catch (e) {}
  if (render) {
    for (const key of KEYS) {
      cs.dossierReadHtml(FP_PID, key);
      cs.dossierDriversHtml(FP_PID, key);
    }
  }
  const rows = (cs.formalPatternIndex.rows(FP_PID) || []).map((r) => [
    r.key, r.tier || "", r.patLabel || "", r.read ? 1 : 0,
    r.total || 0, r.judged || 0, (r.why && r.why.id) || "",
  ].join("|")).sort().join("\n");
  let dm = "";
  try { dm = JSON.stringify(cs.directionMatch ? cs.directionMatch(FP_PID) : null); } catch (e) { dm = "err"; }
  return rows + "\n##\n" + dm;
};
const hot = fingerprint(boot(), true);
const cold = fingerprint(boot(), false);
must(hot.length > 200, "the fingerprint came back empty — the probe has gone stale");
eq(hot, cold, "rendering the read and the roll-up moves no tier, count, label or Direction Match figure");

// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n   ${passed} checks passed`);
if (failures.length) {
  console.error(`\n✗ dossier-read: ${failures.length} failed\n`);
  failures.slice(0, 20).forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log("✓ dossier-read: the dossier says what the record shows, in the record's own numbers\n");
