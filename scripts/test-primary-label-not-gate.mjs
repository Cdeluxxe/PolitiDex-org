#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-primary-label-not-gate.mjs — PRIMARY is a label, and this is the wall
// ─────────────────────────────────────────────────────────────────────────────
// THE RULE, in the words it was handed down in: a directed mapped act is the
// pattern, and PRIMARY is curation's answer to "was the measure about this
// issue" — not a ticket into the engine. So on a (member, issue) row whose only
// mapped acts arrived as provisions inside larger measures:
//
//     one or two the same way   → Thin supports / Thin opposes
//     both ways                 → Split, with its counts
//     deeper one way            → Mostly / Strongly, on the SAME count floors
//     no for-or-against pole    → still no direction, at any depth
//
// The flag may be printed anywhere and consulted by nothing that decides a
// read. That was already the shipped behaviour when this file was written —
// test-characterise-every-act.mjs asserts it row by row — and this file exists
// for the part that was NOT nailed down:
//
//   1. THE CONSTANT IS NOT THE ONLY WAY BACK IN. characterise-every-act proves
//      the rule by setting _RD_MIN_PRIMARY to 99 and watching nothing move.
//      That catches a gate spelled with the constant. It cannot see a gate
//      spelled `(idx.primary || 0) < 1`, and there is one such line live in
//      consistency.js today (wording a sentence, legitimately). So section 1
//      names EVERY primary reference in the record stack, in sixteen files,
//      with what each one is for. A new one fails this test whatever it is
//      spelled with, and the failure asks the author which it is: a label, or a
//      gate.
//
//   2. A WALL NOBODY HAS PUSHED ON IS A HOPE. Section 4 puts the gate BACK —
//      four times, in the four shapes it historically had, one of them with no
//      constant in it at all — and requires this file to fail on each. A guard
//      that cannot be made to fail is not guarding anything.
//
// WHAT THIS FILE DOES NOT DO. It moves no floor: _RD_MIN_JUDGED,
// _RD_MIN_STRENGTH, _RD_DOMINANCE and the split minimums are read from the
// shipped mirrors and asserted, never redefined. It never asks for a one-rider
// row to be promoted — section 2 checks the opposite, that a row of three or
// fewer uniform acts reads Thin and not "Strongly". And it holds the wall the
// doctrine cares about most: Direction Match is compared across every twin boot
// and must be byte-identical, because the figure may not see this lane at all.
//
//   node scripts/test-primary-label-not-gate.mjs
//
// Real shipped modules in a node:vm sandbox over the offline record corpus,
// plus four sandboxes booted from mutated source.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// The engine files, booted. Same list and same order as characterise-every-act:
// the record stack does not boot in pieces.
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "profile-spine.js", "profiles-full.js",
];
// …and the files section 1 reads as TEXT. Wider than the boot list on purpose:
// the issue desk, the issue file and the bill face all print the flag, none of
// them boots without a DOM, and a gate hidden in one of them would be a second
// answer to the same question on the same profile.
const SCANNED = [
  "stance-helpers.js", "consistency.js", "voting-record.js", "word-action.js",
  "receipt-cards.js", "stance-tree.js", "door1-workspace.js", "issue-file.js",
  "issue-view.js", "bill-detail.js", "exec-record.js", "exec-record-ui.js",
  "alignment-tool.js", "say-vs-do.js", "profiles-full.js", "profile-spine.js",
];
const SRC = new Map(
  [...new Set([...FILES, ...SCANNED])].map((f) => [f, readFileSync(join(ROOT, f), "utf8")])
);

let passed = 0, failed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) { passed++; return; } failed++; if (failures.length < 40) failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) => ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const section = (t) => console.log(`\n   ── ${t}`);
// A probe that finds nothing proves nothing.
const must = (cond, msg) => { if (!cond) { console.error(`\n  ✗ primary-label-not-gate is STALE: ${msg}\n`); process.exit(2); } };

// ── EVERY PRIMARY REFERENCE IN THE RECORD STACK, AND WHAT IT IS FOR ──────────
// One entry per live line. `code` is the trimmed line with its trailing comment
// stripped; `why` is what it does. Duplicates are meaningful — the two `pkgOnly`
// lines are one per tier lane — so the check compares multisets, not sets.
//   HOW TO USE THIS WHEN IT FAILS. The failure prints a file and a line. Read
// it. If the line PRINTS the flag, counts it, orders by it or words a sentence
// with it, add it here with a reason and the wall is intact. If the line decides
// whether a row may be read, characterised, tiered, banded or scored, it is the
// gate this whole file exists to keep out, and the answer is to delete it.
const ALLOW = {
  "stance-helpers.js": [
    ["var _RD_MIN_PRIMARY = 1;",
     "the declaration, read on two lines below to word one sentence"],  // stance-helpers.js:790
    ["if (mapping.isPrimary) out.primary++;",
     "the counter: how many of this row's mapped acts carried the flag"],  // stance-helpers.js:1064
    ["var pkgOnly = (idx.primary || 0) < _RD_MIN_PRIMARY;",
     "the pattern lane's package sentence, computed after the tier is decided"],  // stance-helpers.js:1598
    ["var pkgOnly = (idx.primary || 0) < _RD_MIN_PRIMARY;",
     "the display lane's package sentence, computed after the tier is decided"],  // stance-helpers.js:1776
    ["isPrimary: !!m.isPrimary,",
     "the omnibus breakdown carries the label through to the caller"],  // stance-helpers.js:1907
    ["if (b.isPrimary !== a.isPrimary) return a.isPrimary ? -1 : 1;",
     "primary-first ORDER inside the breakdown list; decides no read"],  // stance-helpers.js:1918
    ["if (mapping.isPrimary) return false;",
     "the stowaway detector: a flagged mapping is not a stowaway"],  // stance-helpers.js:2128
    ["{ issueKey: 'lower_taxes', weight: 100, isPrimary: true,  supportMeaning: 'yea_supports' },",
     "module self-test fixture"],  // stance-helpers.js:2544
    ["{ issueKey: 'healthcare',  weight: 60,  isPrimary: false, supportMeaning: 'yea_opposes'  }",
     "module self-test fixture"],  // stance-helpers.js:2545
  ],
  "consistency.js": [
    ["isPrimary: !!m2.isPrimary,",
     "the row payload carries the label through"],  // consistency.js:863
    ["if (a.isPrimary) idx.primary++;",
     "the executive index's counter, the twin of stance-helpers' own"],  // consistency.js:6408
    ["if (!m.isPrimary) continue;",
     "_primaryOnFile: collects the measures our mapping calls primary so one sentence can name them"],  // consistency.js:10823
    ["if ((idx.primary || 0) < 1) {",
     "words the primary_unjudged sentence; reached only on a row nothing reads"],  // consistency.js:10989
    ["base.primary = m ? !!m.isPrimary : null;",
     "the dossier item's label field"],  // consistency.js:13604
    ["var link = (d.primary === true) ? 'the primary subject of this ' + noun",
     "the dossier's 'how this act reached the issue' sentence"],  // consistency.js:13953
    [": (d.primary === false) ? 'one of the subjects this ' + noun + ' was mapped to'",
     "the dossier's 'how this act reached the issue' sentence"],  // consistency.js:13954
    ["var how = it.isPrimary ? 'the primary link'",
     "the dossier record row's link word"],  // consistency.js:14842
    ["if (d.primary === true) tags.push('<span class=\"pdxdos-tag pdxdos-tag-p\">primary link</span>');",
     "the dossier tag markup"],  // consistency.js:14997
    ["else if (d.primary === false) tags.push('<span class=\"pdxdos-tag\">supporting link</span>');",
     "the dossier tag markup"],  // consistency.js:14998
  ],
  "receipt-cards.js": [
    ["if (!!ma.isPrimary !== !!mb.isPrimary) return ma.isPrimary ? -1 : 1;",
     "example selection: the last tiebreak between two equally good citations"],  // receipt-cards.js:2124
    ["primary: idx.primary, total: idx.total, uniform: uniform,",
     "provenance printed on the receipt card"],  // receipt-cards.js:2341
  ],
  "door1-workspace.js": [
    ["if (primary) s.primary = true;",
     "the desk's measure card label"],  // door1-workspace.js:1022
    ["var s = slot(measureKey(it), it.number || '', it.title || '', !!(m && m.isPrimary));",
     "the desk reads the flag off the act to label the card"],  // door1-workspace.js:1048
    ["return m.primary ? 'primary' : 'provision';",
     "the desk's measure band id"],  // door1-workspace.js:1110
    ["if (m.primary) t.mLabPrimary++; else t.mLabProvision++;",
     "the desk's measure census tally"],  // door1-workspace.js:1229
    ["people: { primary: veh.primary, 'package': veh['package'], mixed: veh.mixed },",
     "the desk's vehicle census"],  // door1-workspace.js:1265
    ["'<span class=\"d1-led-btag' + (m.primary ? ' is-primary' : '') + '\">' +",
     "the desk's PRIMARY/provision tag markup"],  // door1-workspace.js:1920
    ["(m.primary ? 'PRIMARY' : 'provision') + '</span>' +",
     "the desk's PRIMARY/provision tag text"],  // door1-workspace.js:1921
  ],
  "issue-file.js": [
    ["if (o.primary) parts.push(o.primary + ' primary-only');",
     "the issue file's people census"],  // issue-file.js:402
  ],
  "bill-detail.js": [
    ["function laneLabel(isPrimary) { return isPrimary ? 'This bill’s subject' : 'Rode inside this bill'; }",
     "the bill face's lane label"],  // bill-detail.js:390
    ["' data-bd-lane=\"' + (it.isPrimary ? 'main' : 'other') + '\">' +",
     "the bill face's lane attribute"],  // bill-detail.js:457
    ["'<span class=\"bd-omni-lane-l\">' + esc(laneLabel(it.isPrimary)) + '</span>' +",
     "the bill face's lane label"],  // bill-detail.js:460
    ["ordered.forEach(function (it) { if (it.isPrimary) main++; else other++; });",
     "the bill face's lane tally"],  // bill-detail.js:487
    ["ordered.forEach(function (it) { if (it.isPrimary) subj++; });",
     "the bill face's subject tally"],  // bill-detail.js:1248
    ["var lane = it.isPrimary ? 'this bill’s subject' : 'rode inside';",
     "the bill face's lane word"],  // bill-detail.js:1254
  ],
  "exec-record.js": [
    ["inverted: eff !== m.direction, isPrimary: !!m.isPrimary,",
     "the executive record carries the label through"],  // exec-record.js:579
  ],
};

// The scanner. Runs over a source MAP rather than the disk, so section 4 can
// point it at mutated source and watch it catch what the mutation added.
const REF = /isPrimary|_RD_MIN_PRIMARY|\.primary\b/;
function scanPrimary(srcMap) {
  const found = [];
  for (const f of SCANNED) {
    const src = srcMap.get(f);
    if (src === undefined) continue;
    src.split("\n").forEach((ln, i) => {
      const t = ln.trim();
      if (!t || /^\/\//.test(t) || /^\*/.test(t) || /^\/\*/.test(t)) return; // prose
      const code = t.replace(/\/\/.*$/, "").trim();                          // trailing note off
      if (!REF.test(code)) return;
      found.push({ file: f, line: i + 1, code });
    });
  }
  return found;
}
// The comparison, as a function so both the shipped source and each mutant get
// exactly the same reading. Returns the lines that are not accounted for.
function unaccounted(found) {
  const pool = new Map();
  for (const f of Object.keys(ALLOW)) {
    const m = new Map();
    for (const [code] of ALLOW[f]) m.set(code, (m.get(code) || 0) + 1);
    pool.set(f, m);
  }
  const out = [];
  for (const hit of found) {
    const m = pool.get(hit.file);
    const n = m ? (m.get(hit.code) || 0) : 0;
    if (n > 0) { m.set(hit.code, n - 1); continue; }
    out.push(hit);
  }
  return out;
}

// The retired sentences, hunted in shippable prose only. Comments are exempt on
// purpose: stance-helpers.js and consistency.js both explain at length what the
// gate said and why it went, and that history is the cheapest defence this
// doctrine has. A string literal is a different matter - a reader can be shown
// one.
function bannedProse(srcMap) {
  const out = [];
  for (const f of SCANNED) {
    const src = srcMap.get(f);
    if (src === undefined) continue;
    src.split("\n").forEach((ln, i) => {
      const t = ln.trim();
      if (!t || /^\/\//.test(t) || /^\*/.test(t) || /^\/\*/.test(t)) return;
      const code = t.replace(/\/\/.*$/, "").trim();
      for (const b of BANNED) {
        if (code.indexOf(b) >= 0) { out.push({ file: f, line: i + 1, code }); return; }
      }
    });
  }
  return out;
}

// ── THE BOOT ─────────────────────────────────────────────────────────────────
const boot = (mutate) => {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    let src = SRC.get(f);
    if (mutate && mutate[f]) src = mutate[f](src);
    vm.runInContext(src, ctx, { filename: f });
  }
  win.PROFILES = win.CMP_DATA;
  return win;
};
const { byMember } = buildCorpus(ROOT);
must(byMember.size > 100, `too few members in the corpus to sweep (${byMember.size})`);
const seed = (win) => {
  for (const [pid, recs] of byMember) {
    try { win.PDXVotingRecord.noteMember(pid, JSON.parse(JSON.stringify(recs))); } catch (e) { /* skip */ }
  }
  return win;
};
const A = seed(boot());
const CS = A.PDXConsistency;
must(CS && typeof CS.issueRows === "function", "PDXConsistency.issueRows unavailable");
must(typeof A._pdxRecordDirection === "function", "_pdxRecordDirection is not published");
const ALL_PIDS = [...byMember.keys()];
console.log(`      ${byMember.size} members seeded from the shipped record corpus`);

// The refusals that are still allowed over judged acts, and the whole list: they
// are about the ISSUE having no for-or-against side, never about the vehicle the
// act arrived on. `no_pole` is the curated poleless key; `balance_key` is the
// *_balance family that deliberately holds no side.
const MUTED = { no_pole: 1, balance_key: 1 };
// The retired refusal, in every wording it ever shipped in.
const BANNED = [
  "Not about this issue", "not about this issue", "only incidentally",
  "brushed the subject", "rather than being about it", "touch this issue only",
];

// ── THE AUDIT ────────────────────────────────────────────────────────────────
// One pass over the provision-only population — every (member, issue) row whose
// mapped acts include a judged one and NOT ONE flagged mapping. Returns the
// doctrine violations and a census. Called once on the shipped boot, where it
// must be empty, and once per mutant, where it must not be.
function audit(win, opts) {
  opts = opts || {};
  const C = win.PDXConsistency;
  const NOUN = { noun: { one: "vote", many: "votes" }, label: "" };
  const MIN_JUDGED = win._PDX_RD_MIN_JUDGED, DOM = win._PDX_RD_DOMINANCE;
  const pids = opts.pids || ALL_PIDS;
  const htmlCap = (opts.htmlCap === undefined) ? 300 : opts.htmlCap;
  const v = [], census = { rows: 0, prov: 0, read: 0, one: 0, deep: 0, quoted: 0, html: 0, refused: {} };
  const note = (m) => { if (v.length < 5000) v.push(m); };
  for (const pid of pids) {
    let rows = [];
    try { rows = C.issueRows(pid) || []; } catch (e) { rows = []; }
    const fpi = {};
    try { (C.formalPatternIndex.rows(pid) || []).forEach((x) => { if (x && x.key) fpi[x.key] = x; }); } catch (e) { /* none */ }
    for (const row of rows) {
      if (!row || !row.key || row.lane === "exec") continue;
      census.rows++;
      let idx = null;
      try { idx = win._pdxRecordDirection(pid, row.key, NOUN); } catch (e) { idx = null; }
      if (!idx || (idx.total || 0) < 1) continue;
      if ((idx.primary || 0) > 0) continue;   // a flagged mapping is on this row: not this file's population
      if ((idx.judged || 0) < 1) continue;    // nothing took a side: the honest refusals keep it
      census.prov++;
      const judged = idx.judged || 0, adv = idx.advances || 0, opp = idx.opposes || 0;
      const tw = adv + opp;
      const uniform = (adv === 0 || opp === 0);
      const dominant = tw > 0 && (adv >= tw * DOM || opp >= tw * DOM);
      const strongEnough = (typeof idx.actStrength !== "number") || idx.actStrength >= 4;
      let d = null;
      try { d = C.recordPattern.display(row) || null; } catch (e) { d = null; }
      const tier = (d && d.tier) || "none";
      const key = `${pid}/${row.key}`;
      if (tier === "none") {
        const why = idx.suppressed || "(none)";
        census.refused[why] = (census.refused[why] || 0) + 1;
        // (A) THE ONLY REFUSAL LEFT IS ABOUT THE ISSUE. A poleless key has
        //     nothing for any record to lean on. Anything else refusing a row
        //     with judged acts on it is the retired gate, whatever it calls
        //     itself.
        if (!MUTED[why]) note(`${key}: ${judged} judged act(s), no flagged mapping, and no read — refused as "${why}"`);
        continue;
      }
      census.read++;
      // (B) ONE READ, ON EVERY SURFACE. The tree, the formal-pattern index and
      //     the dossier lede are three renderings of one finding.
      const x = fpi[row.key];
      let dos = null;
      try { dos = C.dossierRead(pid, row.key) || null; } catch (e) { dos = null; }
      if (!x) note(`${key}: reads "${tier}" on the tree and is not in the formal index at all`);
      else {
        if (x.read !== true) note(`${key}: the formal index refuses a row the tree reads as "${tier}"`);
        if (x.tier !== tier) note(`${key}: index says "${x.tier}", tree says "${tier}"`);
      }
      if (!dos || dos.state !== "reads") note(`${key}: the dossier says "${dos && dos.state}" over a row the tree reads as "${tier}"`);
      else if (dos.tier !== tier) note(`${key}: dossier says "${dos.tier}", tree says "${tier}"`);
      // (C) THE ENGINE READS IT, NOT THE BROWSE LANE STANDING IN FOR IT. A
      //     single recorded floor vote on a provision mapping is a lean the
      //     pattern engine itself takes (see _rdLeanAllowed). If it stops doing
      //     so, the row still prints — quoted from the display lane, carrying
      //     `display: true` and reaching no score — and that silent demotion is
      //     exactly what a restored gate looks like from the outside.
      //     THE ONE EXEMPTION IS THE MEMBER COVERAGE FLOOR. A member with too
      //     little on file is refused by the pattern engine for a reason that is
      //     about the member, not the vehicle, and the browse lane quoting the row
      //     is exactly what that lane is for. `suppressed` names it.
      if (judged === 1 && (idx.floorActs || 0) >= 1 && !idx.suppressed) {
        census.one++;
        let pt = null;
        try { pt = C.recordPattern.tier(row) || null; } catch (e) { pt = null; }
        if (!pt || !pt.tier || pt.tier === "none") note(`${key}: one recorded vote, and the pattern engine will not characterise it`);
        if (d.display === true) note(`${key}: one recorded vote, quoted from the browse lane instead of read`);
      }
      // (D) NO CEILING. Depth, strength and dominance are the whole test. A
      //     package-borne pile that clears them is Mostly or Strongly, exactly
      //     as a flagged one would be.
      if (judged >= MIN_JUDGED && dominant && strongEnough && !d.partial) {
        census.deep++;
        if (tier !== "strong" && tier !== "mostly") {
          note(`${key}: ${judged} judged acts, ${adv}/${opp}, dominant — and it reads "${tier}"`);
        }
        //     AND THE ENGINE IS THE ONE READING IT. A gate on the index leaves the
        //     browse lane still printing "Strongly opposes" while the pattern
        //     engine underneath it has stopped characterising the row — the tree
        //     looks unchanged and every score-facing seam has gone quiet. So the
        //     tier is not enough: the pattern lane must own this reading.
        let dpt = null;
        try { dpt = C.recordPattern.tier(row) || null; } catch (e) { dpt = null; }
        if (!dpt || !dpt.tier || dpt.tier === "none") {
          note(`${key}: ${judged} judged acts, ${adv}/${opp}, dominant — and the pattern engine will not characterise it`);
        }
        if (d.display === true) {
          note(`${key}: ${judged} judged acts, ${adv}/${opp}, dominant — quoted from the browse lane instead of read`);
        }
      }
      // (E) NO PROMOTION EITHER. Three or fewer acts one way is Thin, and one
      //     rider does not become "Strongly" because the gate came off.
      if (judged <= 3 && uniform && tier !== "thin") {
        note(`${key}: ${judged} uniform act(s) reads "${tier}" — a rider was promoted`);
      }
      if (d.display === true) census.quoted++;
      // (F) THE PACKAGE SENTENCE RIDES BESIDE THE FINDING. Never instead of it.
      if (d.packageOnly !== true) note(`${key}: no flagged mapping on the row and the package disclosure is off`);
      const disclosure = String(d.note || "") + " " + String(d.packageNote || "");
      if (disclosure.indexOf("mainly about something else") < 0) {
        note(`${key}: reads "${tier}" and never says how the acts arrived`);
      }
      if (String(d.label || "").indexOf("provision") >= 0) {
        note(`${key}: the package sentence was promoted into the finding — label is "${d.label}"`);
      }
      // (G) AND THE RETIRED WORDING SURVIVES NOWHERE ON A READ ROW — not in the
      //     fields, and not in the dossier's rendered markup either.
      const blob = [d.label, d.counts, d.note, d.packageNote,
                    x && x.patLabel, x && x.counts, x && x.lede,
                    x && x.why && x.why.lb, x && x.why && x.why.note,
                    dos && dos.label, dos && dos.lede,
                    dos && dos.why && dos.why.lb, dos && dos.why && dos.why.note]
        .filter(Boolean).join(" | ");
      let markup = "";
      if (census.html < htmlCap) {
        census.html++;
        try { markup = String(C.dossierReadHtml(pid, row.key) || ""); } catch (e) { markup = ""; }
        try { markup += String(C.recordPattern.html(row) || ""); } catch (e) { /* keep */ }
      }
      for (const b of BANNED) {
        if (blob.indexOf(b) >= 0) note(`${key}: a read row still carries "${b}"`);
        if (markup && markup.indexOf(b) >= 0) note(`${key}: the rendered dossier still carries "${b}"`);
      }
    }
  }
  return { v, census };
}

// The Direction Match ledger, as a comparable snapshot. The figure may not see
// this lane at all, so it is what every twin boot below is measured against.
function dmLedger(win) {
  const WA = win.PDXWordAction;
  must(WA && typeof WA.read === "function", "PDXWordAction.read is unavailable — the twin boot proves nothing");
  const out = {};
  for (const pid of Object.keys(win.CMP_DATA).sort()) {
    try {
      const r = WA.read(pid) || null;
      out[pid] = r ? JSON.stringify([r.pct, r.publishable, r.tested,
                                     r.verdict && r.verdict.label, (r.pairs || []).length]) : "null";
    } catch (e) { out[pid] = `err:${e && e.message}`; }
  }
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · every PRIMARY reference in the record stack is named");
// ═════════════════════════════════════════════════════════════════════════════
{
  const found = scanPrimary(SRC);
  must(found.length > 25, `only ${found.length} primary references found across ${SCANNED.length} files — the scanner has stopped matching`);
  const extra = unaccounted(found);
  for (const hit of extra.slice(0, 20)) {
    ok(false, `${hit.file}:${hit.line} is a PRIMARY reference nobody accounted for — "${hit.code}"`);
  }
  eq(extra.length, 0, `${extra.length} unaccounted PRIMARY reference(s) in the record stack`);
  // …and no entry in ALLOW has gone stale either: an entry that no longer
  // matches a live line is a wall standing where the hole used to be.
  const live = new Set(found.map((h) => `${h.file} ${h.code}`));
  let stale = 0;
  for (const f of Object.keys(ALLOW)) {
    for (const [code, why] of ALLOW[f]) {
      if (live.has(`${f} ${code}`)) continue;
      stale++;
      ok(false, `${f}: the allowlist still accounts for a line that is gone — "${code}" (${why})`);
    }
  }
  // THE COMPARISONS, NAMED ONE BY ONE. Every other reference above prints the
  // flag, counts it, orders by it or copies it from payload to payload. These
  // are the only lines in the record stack that ASK A QUESTION of the primary
  // count, and each one answers it with a sentence rather than a tier.
  const cmp = found.filter((h) => /primary[^)]*\)?\s*(?:<|<=|>=|>)\s*(?:\d|_RD_MIN_PRIMARY)/i.test(h.code));
  for (const c of cmp) console.log(`      compares: ${c.file}:${c.line}  ${c.code}`);
  eq(cmp.length, 3, `${cmp.length} comparison(s) against the primary count`);
  eq(cmp.filter((c) => c.file === "stance-helpers.js").length, 2,
    "two of them are the two tier lanes' package sentences, computed after the tier");
  eq(cmp.filter((c) => c.file === "consistency.js").length, 1,
    "one is the index ladder's primary_unjudged sentence, reached only on a row nothing reads");
  console.log(`      ${found.length} references across ${SCANNED.length} files · ${extra.length} unaccounted · ${stale} stale entries`);
  // The floors this file does not touch, read back off the shipped mirrors.
  // The constant itself is deliberately NOT mirrored onto window beside the
  // floors below: nothing outside stance-helpers.js has any business asking
  // it anything. Its declaration is pinned in source instead.
  has(SRC.get("stance-helpers.js"), "var _RD_MIN_PRIMARY = 1;",
    "the constant still stands at 1 — a wording switch, not a gate");
  ok(SRC.get("stance-helpers.js").indexOf("window._PDX_RD_MIN_PRIMARY") < 0,
    "_RD_MIN_PRIMARY is still unpublished — mirroring it onto window is how a second file starts asking");
  eq(A._PDX_RD_MIN_JUDGED, 4, "the depth floor is where it was");
  eq(A._PDX_RD_DOMINANCE, 0.75, "…and the dominance floor");
  eq(A._PDX_RD_SPLIT_MIN_JUDGED, 6, "…and the split depth floor");
  eq(A._PDX_RD_SPLIT_MIN_SIDE, 2, "…and the split side floor");
  eq(A._PDX_RD_MEMBER_FLOOR, 12, "…and the member coverage floor");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the provision-only population, audited row by row");
// ═════════════════════════════════════════════════════════════════════════════
const BASE = audit(A);
{
  const c = BASE.census;
  must(c.prov > 3000, `only ${c.prov} provision-only rows with a judged act were swept`);
  must(c.one > 1000, `only ${c.one} one-recorded-vote provision-only rows were swept`);
  must(c.deep > 50, `only ${c.deep} deep, dominant provision-only rows were swept`);
  must(c.html > 200, `only ${c.html} dossiers were rendered`);
  for (const m of BASE.v.slice(0, 20)) ok(false, m);
  eq(BASE.v.length, 0, `${BASE.v.length} provision-only row(s) fight the rule`);
  console.log(`      ${c.rows} rows swept · ${c.prov} provision-only with a judged act · ${c.read} read · ${c.quoted} quoted from the browse lane`);
  console.log(`      ${c.one} one-vote leans · ${c.deep} deep and dominant · ${c.html} dossiers rendered`);
  console.log(`      refusals left: ${JSON.stringify(c.refused)}`);
  // And every refusal still standing is about the ISSUE having no side, never
  // about the vehicle the act arrived on.
  for (const why of Object.keys(c.refused)) {
    ok(!!MUTED[why], `a provision-only row with judged acts was refused as "${why}" (${c.refused[why]} rows)`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the named rows — provision-only, and the PRIMARY one beside them");
// ═════════════════════════════════════════════════════════════════════════════
// The smoke, pinned in the shipped words. Three provision-only rows on the three
// families the rule was handed down over, the deep package-borne pile that proves
// there is no ceiling, and Maloy's rural PRIMARY row, which must read exactly as
// it did before any of this.
{
  const NOUN = { noun: { one: "vote", many: "votes" }, label: "" };
  const rowOf = (pid, key) => (CS.issueRows(pid) || []).filter((r) => r && r.key === key)[0] || null;
  const fpiOf = (pid, key) => (CS.formalPatternIndex.rows(pid) || []).filter((x) => x && x.key === key)[0] || null;
  const CASES = [
    ["blackburn", "housing_build", "thin", "Thin supports", "1 vote advanced", 0],
    ["hawley", "lands_preserve", "thin", "Thin opposes", "1 vote against", 0],
    ["adam_smith", "cost_living", "thin", "Thin supports", "1 vote advanced", 0],
    ["maloy", "health_rural", "thin", "Thin supports", "1 vote advanced", 0],
    ["alsobrooks", "tough_on_crime", "strong", "Strongly opposes", "0 advanced · 4 against", 0],
    ["maloy", "housing", "thin", "Thin supports", "1 vote advanced", 1],
  ];
  for (const [pid, key, tier, label, counts, primary] of CASES) {
    const row = rowOf(pid, key);
    must(!!row, `${pid}/${key}: the row is gone from the profile — the pinned case is untestable`);
    const idx = A._pdxRecordDirection(pid, key, NOUN) || {};
    eq(idx.primary || 0, primary, `${pid}/${key}: the flagged-mapping count is what this case is about`);
    const d = CS.recordPattern.display(row) || {};
    eq(d.tier, tier, `${pid}/${key}: the tree's tier`);
    eq(d.label, label, `${pid}/${key}: …in the shipped words`);
    eq(d.counts, counts, `${pid}/${key}: …with the count beside it`);
    eq(d.display, false, `${pid}/${key}: …read by the engine, not quoted from the browse lane`);
    const x = fpiOf(pid, key);
    must(!!x, `${pid}/${key}: the row is gone from the formal index`);
    eq(x.read, true, `${pid}/${key}: the Official Record row reads it`);
    eq(x.tier, tier, `${pid}/${key}: …at the same tier`);
    eq(x.patLabel, label, `${pid}/${key}: …in the same words`);
    eq(x.why, null, `${pid}/${key}: …and carries no refusal under a published side`);
    const dos = CS.dossierRead(pid, key) || {};
    eq(dos.state, "reads", `${pid}/${key}: the dossier lede reads it too`);
    eq(dos.tier, tier, `${pid}/${key}: …at the same tier again`);
    // THE LABEL IS STILL ON THE ROW. A provision-borne row discloses how the
    // acts arrived, beside the finding; a flagged row has nothing to disclose
    // and says nothing.
    eq(d.packageOnly, primary < 1, `${pid}/${key}: the package disclosure is ${primary < 1 ? "on" : "off"}`);
    if (primary < 1) {
      has(String(d.note || "") + String(d.packageNote || ""), "mainly about something else",
        `${pid}/${key}: the arrival sentence rides beside the finding`);
      has(String(d.packageNote || ""), "counted in full",
        `${pid}/${key}: …and says the votes were counted in full`);
    } else {
      eq(String(d.packageNote || ""), "", `${pid}/${key}: a flagged row discloses nothing about packaging`);
    }
  }
  // The vehicle object on a row where EVERY act arrived inside a larger measure:
  // this is what the "rode inside" badge is drawn from.
  const veh = (fpiOf("maloy", "health_rural") || {}).vehicle || null;
  must(!!veh, "maloy/health_rural: the vehicle object is gone — the badge has no source");
  eq(veh.only, true, "maloy/health_rural: the vehicle line says every act arrived that way");
  eq(!!veh.stowaway, true, "maloy/health_rural: …and names the row a stowaway");
  eq(veh.provision, 1, "maloy/health_rural: …over the one provision act on file");
  eq((fpiOf("maloy", "housing") || {}).vehicle.only, false, "maloy/housing: the PRIMARY row is not a stowaway");
  // …and the two faces that print the word itself. Neither boots without a DOM,
  // so the copy is pinned in source: this is the "rode inside / provision"
  // wording the rule asked to leave alone.
  has(SRC.get("bill-detail.js"), "'Rode inside this bill'", "the bill face still labels the provision lane");
  has(SRC.get("bill-detail.js"), "'This bill’s subject'", "…beside the subject lane");
  has(SRC.get("door1-workspace.js"), "(m.primary ? 'PRIMARY' : 'provision')", "the issue desk still tags its measure cards");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the gate, put back four times");
// ═════════════════════════════════════════════════════════════════════════════
// Four mutants, each one a shape the gate historically had. Three of them are
// behavioural and must break the audit; the fourth is a refusal rung that only
// fires on rows nothing reads, so it is behaviourally inert by construction and
// must be caught by section 1's scan instead — which is precisely why section 1
// exists. All four must leave Direction Match untouched, because a change to
// the record lane that moves the figure is a different bug.
const DM_BASE = dmLedger(A);
console.log(`      Direction Match ledger: ${Object.keys(DM_BASE).length} profiles snapshotted from the shipped boot`);
{
  // A subset big enough to hold every population the invariants read, and small
  // enough to run four more times: the pinned deep rows first, then the head of
  // the roll.
  const HOT = ["alsobrooks", "banks", "barrasso", "maloy", "blackburn", "hawley", "adam_smith", "chris_murphy"];
  const SUB = [...new Set([...HOT.filter((p) => ALL_PIDS.indexOf(p) >= 0), ...ALL_PIDS.slice(0, 160)])];
  const line = (s, from) => {
    const i = s.indexOf(from);
    must(i >= 0, `mutation anchor is gone from the shipped source: "${from}"`);
    must(s.indexOf(from, i + 1) < 0, `mutation anchor is no longer unique: "${from}"`);
    return i;
  };
  const MUTANTS = [
    {
      id: "M1",
      what: "the display lane refuses a package-borne row outright",
      expect: "audit",
      match: /refused as/,
      files: {
        "stance-helpers.js": (s) => {
          const cut = s.indexOf("function _recordDisplayTier");
          must(cut > 0, "_recordDisplayTier is gone from stance-helpers.js");
          const head = s.slice(0, cut), tail = s.slice(cut);
          const PK = "var pkgOnly = (idx.primary || 0) < _RD_MIN_PRIMARY;";
          must(tail.indexOf(PK) >= 0, "the display lane's pkgOnly line is gone");
          return head + tail.replace(PK, PK + "\n      if (pkgOnly) return null;");
        },
      },
    },
    {
      id: "M2",
      what: "the index refuses a direction to a deep package-borne pile",
      expect: "audit",
      match: /dominant/,
      files: {
        "stance-helpers.js": (s) => {
          const A1 = "out.token = 'record_direction';\n          out.lead = (out.advances >= out.opposes) ? 'advances' : 'opposes';";
          line(s, A1);
          return s.replace(A1,
            "if ((out.primary || 0) < _RD_MIN_PRIMARY) { out.token = 'record_thin'; out.reason = 'weak_acts'; } else {\n          "
            + A1 + "\n          }");
        },
      },
    },
    {
      id: "M3",
      what: "the one-vote lean is gated again — hardcoded, with no constant in it",
      expect: "audit",
      match: /one recorded vote/,
      files: {
        "stance-helpers.js": (s) => {
          const A1 = "idx.judged === 1 && _rdLeanAllowed(idx)) {";
          line(s, A1);
          return s.replace(A1, "idx.judged === 1 && (idx.primary || 0) >= 1 && _rdLeanAllowed(idx)) {");
        },
      },
    },
    {
      id: "M4",
      what: "a “not about this issue” rung is restored to the index ladder",
      expect: "scan",
      files: {
        "consistency.js": (s) => {
          const A1 = "      if (idx.suppressed === 'coverage_floor') {";
          line(s, A1);
          return s.replace(A1,
            "      if ((idx.primary || 0) < 1) {\n"
            + "        return { rung: 'incidental', lb: 'Not about this issue',\n"
            + "                 note: 'The measures were mainly about something else.' };\n"
            + "      }\n" + A1);
        },
      },
    },
  ];
  for (const m of MUTANTS) {
    const t0 = Date.now();
    let win = null;
    try { win = seed(boot(m.files)); } catch (e) { win = null; }
    if (!win) { ok(false, `${m.id} (${m.what}): the mutant would not boot, so it proves nothing`); continue; }
    // The mutated source, scanned exactly as the shipped source was.
    const mutSrc = new Map(SRC);
    for (const f of Object.keys(m.files)) mutSrc.set(f, m.files[f](SRC.get(f)));
    const scanned = unaccounted(scanPrimary(mutSrc));
    const prose = bannedProse(mutSrc);
    let res = { v: [], census: {} };
    try { res = audit(win, { pids: SUB, htmlCap: 0 }); } catch (e) { res = { v: [`audit threw: ${e && e.message}`], census: {} }; }
    const caught = m.expect === "scan"
      ? (scanned.length > 0 || prose.length > 0)
      : (res.v.length > 0);
    ok(caught, `${m.id} (${m.what}) went undetected — ${res.v.length} audit violation(s), `
      + `${scanned.length} unaccounted reference(s), ${prose.length} banned sentence(s)`);
    if (m.match) {
      const hit = res.v.some((s) => m.match.test(s));
      ok(hit, `${m.id}: caught, but not by the invariant it was aimed at — first violation was "${res.v[0] || "(none)"}"`);
    }
    if (m.expect === "scan") {
      eq(res.v.length, 0, `${m.id}: an inert rung moved a reading — it is not the mutation this file thought it was`);
      must(scanned.length + prose.length > 0, `${m.id} is inert AND invisible to the scan — the mutation is wrong, not the wall`);
    }
    // THE FIGURE MUST NOT HAVE MOVED. Not on the shipped boot, and not on a boot
    // where the record lane is behaving differently on thousands of rows.
    const dm = dmLedger(win);
    let moved = 0, movedFirst = null;
    for (const pid of Object.keys(DM_BASE)) {
      if (dm[pid] === DM_BASE[pid]) continue;
      moved++;
      if (!movedFirst) movedFirst = `${pid}: ${DM_BASE[pid]} → ${dm[pid]}`;
    }
    eq(moved, 0, `${m.id}: Direction Match moved on ${moved} profile(s) — ${movedFirst || ""}`);
    console.log(`      ${m.id} ${caught ? "caught" : "MISSED"} · ${res.v.length} violations · `
      + `${scanned.length} unaccounted · ${prose.length} banned · DM identical on ${Object.keys(DM_BASE).length} profiles · ${Date.now() - t0}ms`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the retired doctrine is not asserted anywhere as current");
// ═════════════════════════════════════════════════════════════════════════════
// The sentences the gate used to print are allowed to survive in COMMENTS —
// several files explain at length what was removed and why, and deleting that
// history is how it comes back. What is not allowed is the sentence in shippable
// prose, or a comment claiming the gate is still live: a stale comment is a
// specification to the next author.
{
  const prose = bannedProse(SRC);
  for (const h of prose.slice(0, 10)) ok(false, `${h.file}:${h.line} ships a retired refusal sentence — "${h.code}"`);
  eq(prose.length, 0, `${prose.length} retired refusal sentence(s) in shippable prose`);
  const bd = SRC.get("bill-detail.js");
  ok(bd.indexOf("not-incidental floor") < 0,
    "bill-detail.js still describes _recordDirectionIndex as having a not-incidental floor — it has not had one since August 2026");
  has(bd, "gates no tier", "bill-detail.js says what isPrimary does now instead");
  // NO FILE IN THE RECORD STACK MAY DESCRIBE THE CONSTANT AS REFUSING ANYTHING.
  // This is the check that matters more than any single comment: the way the gate
  // comes back is a reader finding a note that says it is still there.
  //   A line may name the refusal freely as long as it names it as PAST. Files
  // that explain the removal say so with "used to", "no longer", "is gone",
  // "gates nothing", "rather than" — exec-record-ui.js:341 is the model. A
  // refusal verb next to the constant with no such marker on the line is a claim
  // that the gate is live.
  //   The marker is looked for in the sentence AROUND the line, not on the line
  // itself: stance-helpers.js spends a paragraph on which wall came off which
  // branch, and the tense of that paragraph lives four lines above the mention.
  const PAST = /used to|no longer|is gone|and is gone|was gone|came off|gates nothing|decides nothing|rather than|stopped|retired|never |not have one|has not had/i;
  const claims = [];
  for (const f of SCANNED) {
    const lines = (SRC.get(f) || "").split("\n");
    lines.forEach((ln, i) => {
      const suspect = /_RD_MIN_PRIMARY[^\n]*(refus|blocks|gates|drops)/i.test(ln)
        || /(refus|blocks|gates|drops)[^\n]*_RD_MIN_PRIMARY/i.test(ln)
        || /refuses a direction outright/i.test(ln);
      if (!suspect) return;
      const around = lines.slice(Math.max(0, i - 4), i + 5).join(" ");
      if (!PAST.test(around)) claims.push(`${f}:${i + 1}`);
    });
  }
  eq(claims.join(", "), "", `${claims.length} file(s) in the record stack still describe _RD_MIN_PRIMARY as refusing a read`);
  has(SRC.get("voting-record.js"), "words the package sentence and nothing else",
    "voting-record.js's pack note is the accurate one and still says it");
  // ONE STALE COMMENT IS KNOWINGLY LEFT STANDING: netlify/lib/vr-pack.ts still
  // says "_recordDisplayTier refuses a direction outright below _RD_MIN_PRIMARY",
  // which stopped being true in August 2026. It is not corrected here because
  // three separate guards freeze that file byte for byte — the engine set in
  // test-person-crawl-block.mjs and the declared-file walls in the F8 and F9 wave
  // suites — and prising a build-side comment out of a frozen file means
  // loosening all three. The reader-facing copy of that same explanation, in
  // voting-record.js above, is correct and is pinned by the line before this one;
  // the pack builder itself reads nothing about primary. A pass that declares
  // vr-pack.ts should fix the sentence and delete this note.
  ok(true, "the one knowingly-stale comment is named in this file rather than quietly left");
  // And the retired term is not back in the branch it was removed from.
  has(SRC.get("stance-helpers.js"), "WAS A THIRD TERM HERE AND IS GONE",
    "stance-helpers.js still records which term was removed from the one-vote lean");
}

// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n   ${failed ? "✗" : "✓"} ${passed} passed, ${failed} failed`);
if (failed) {
  console.log("\n   failures:");
  for (const f of failures) console.log(`     · ${f}`);
  process.exit(1);
}
console.log("   PRIMARY prints, counts and orders. It gates nothing, and the four ways back in are walled.\n");
