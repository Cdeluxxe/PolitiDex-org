#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-primary-label-not-gate.mjs — the leaf primary flag is RETIRED, and unread
// ─────────────────────────────────────────────────────────────────────────────
// THE CONTRACT. What a bill is mostly about is not a curated bit on one mapping.
// It is the topic category (CORE_NATIONAL_ISSUES) holding the most of the
// measure's mapped leaf issues — its dominant category. Chips inside it are
// on-axis; chips outside it are off-axis, the rider read. A tie has no winner,
// the copy says the bill is split across the tied categories, and nothing —
// not party, not score, not weight, not "first chip" — breaks it.
//
//   · OFF-AXIS IS A BADGE, NOT A DELETE. Every measure × issue pair still lists on
//     that issue's drawer, in All topics and in also-on.
//   · THE FLAG IS UNREAD. No list builder, drawer, All-topics view, mapper helper
//     or server read continues, skips or omits anything because `isPrimary` is
//     missing or false; new mappings do not write it. Existing bits in the seed
//     stay where they are, and this file proves they decide nothing: a corpus with
//     every bit flipped, and one with every bit deleted, renders byte-identically.
//
// Sections:
//   1. the scan — no runtime line in the record stack, the list builders or the
//      server reads the flag; the allowlist holds one unrelated button-style bit.
//      The server's category table is the client's, regenerated.
//   2. the dominant-category helper, on H.J.Res. 131, H.R. 3684 and synthetic
//      splits; the server twin (netlify/lib/vr-axis.ts) agrees on every seed.
//   3. flag-flip invariance over the corpus, with Direction Match pinned.
//   4. H.J.Res. 131 on Lee — three memberships survive, Red Tape is off-axis and
//      still a row on its own drawer, both effect lines unchanged from HEAD.
//   5. H.R. 3684 — a split bill: no single winner, water stays, the Nay prints.
//   6. the off-axis-only population, audited row by row: still read in full.
//   7. the gate, put back — `if (!isPrimary) continue` in five list builders, plus
//      three axis-shaped tier gates — and each one must fail this file.
//
//   node scripts/test-primary-label-not-gate.mjs

import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";
import { buildTable as buildCategoryTable } from "./gen-issue-core-categories.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const HEAD = (f) => {
  try {
    return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  } catch { return null; }
};

// The engine files, booted. The record stack does not boot in pieces.
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "profile-spine.js", "profiles-full.js",
];
// …and the files section 1 reads as TEXT: the record stack, every list builder
// that prints a chip or a lane (the issue desk, issue file, issue page, bill
// face, district board, library, search), the server reads and the mapper.
const SCANNED = [
  "stance-helpers.js", "consistency.js", "voting-record.js", "word-action.js",
  "receipt-cards.js", "stance-tree.js", "door1-workspace.js", "issue-file.js",
  "issue-view.js", "bill-detail.js", "exec-record.js", "exec-record-ui.js",
  "alignment-tool.js", "say-vs-do.js", "profiles-full.js", "profile-spine.js",
  "issue-page.js", "district-board.js", "digital-library.js", "all-seeing-eye.js",
  "netlify/functions/voting-record.mts", "netlify/lib/vr-pack.ts",
  "netlify/lib/vr-ingest.ts", "netlify/lib/vr-axis.ts", "scripts/vr-mapping-draft.mjs",
];
const SRC = new Map([...new Set([...FILES, ...SCANNED])].map((f) => [f, R(f)]));

let passed = 0, failed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) { passed++; return; } failed++; if (failures.length < 40) failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) => ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const no = (hay, needle, msg) => ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present`);
const section = (t) => console.log(`\n   ── ${t}`);
// A probe that finds nothing proves nothing.
const must = (cond, msg) => { if (!cond) { console.error(`\n  ✗ primary-label-not-gate is STALE: ${msg}\n`); process.exit(2); } };

const text = (html) => String(html || "").replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ")
  .replace(/\s+/g, " ").trim();

const TIP_ON = "On-axis — same topic as the bill’s main category";
const TIP_OFF = "Off-axis — different topic than the bill’s main category (rider-shaped)";
const LANDS131 = "Removed the conservation withdrawal from roughly 1.2 million acres inside the Arctic National Wildlife Refuge.";

// ── THE SCAN ─────────────────────────────────────────────────────────────────
// Every live (non-comment) line that names the flag. The allowlist is EMPTY:
// there is no line left anywhere in SCANNED that may read it, print it, count
// it, order by it or write it.
const REF = /isPrimary|is_primary|_RD_MIN_PRIMARY|\.primary\b|primaryIssueKeys/;
// One line is allowed, and it is not the flag: the search palette's action
// buttons have their own `primary` style bit, unrelated to any measure.
const ALLOW = {
  "all-seeing-eye.js": ["var cls = 'pdx-eye-act' + (a.primary ? ' pdx-eye-act--primary' : '') +"],
};
function scanPrimary(srcMap) {
  const found = [];
  for (const f of SCANNED) {
    const src = srcMap.get(f);
    if (src === undefined) continue;
    src.split("\n").forEach((ln, i) => {
      const t = ln.trim();
      if (!t || /^\/\//.test(t) || /^\*/.test(t) || /^\/\*/.test(t)) return; // prose
      const code = t.replace(/\/\/.*$/, "").trim();
      if (!REF.test(code)) return;
      if ((ALLOW[f] || []).includes(code)) return;
      found.push({ file: f, line: i + 1, code });
    });
  }
  return found;
}
// The retired wording, hunted in shippable strings: the flag's old labels, and
// the "primary" synonyms the badge must not grow into.
const BANNED_UI = [
  "primary link", "primary-only", "Primary-only", "'PRIMARY'",
  "This bill’s subject", "this bill’s subject", "main chip", "lead issue", "the primary subject",
];
function bannedUi(srcMap) {
  const out = [];
  for (const f of SCANNED) {
    const src = srcMap.get(f);
    if (src === undefined) continue;
    src.split("\n").forEach((ln, i) => {
      const t = ln.trim();
      if (!t || /^\/\//.test(t) || /^\*/.test(t) || /^\/\*/.test(t)) return;
      const code = t.replace(/\/\/.*$/, "").trim();
      for (const b of BANNED_UI) if (code.indexOf(b) >= 0) { out.push({ file: f, line: i + 1, code, b }); return; }
    });
  }
  return out;
}

// ── THE BOOT ─────────────────────────────────────────────────────────────────
const { byMember } = buildCorpus(ROOT);
must(byMember.size > 100, `too few members in the corpus to sweep (${byMember.size})`);
// The corpus with its leaf flags rewritten: "flip" inverts every bit, "drop"
// deletes the field. The flag is unread iff all three render the same.
const recast = (recs, how) => recs.map((r) => ({
  ...r,
  issues: (r.issues || []).map((i) => {
    const c = { ...i };
    if (how === "flip") c.isPrimary = !i.isPrimary;
    else if (how === "drop") delete c.isPrimary;
    return c;
  }),
}));
const boot = (mutate, how) => {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    let src = SRC.get(f);
    if (mutate && mutate[f]) src = mutate[f](src);
    vm.runInContext(src, ctx, { filename: f });
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of byMember) {
    const r = JSON.parse(JSON.stringify(recs));
    try { win.PDXVotingRecord.noteMember(pid, how ? recast(r, how) : r); } catch (e) { /* skip */ }
  }
  return win;
};
const seed = (win) => win;   // the boot seeds; kept so the audit block reads as it did
const A = boot();
const CS = A.PDXConsistency;
must(CS && typeof CS.issueRows === "function", "PDXConsistency.issueRows unavailable");
must(typeof A._pdxRecordDirection === "function", "_pdxRecordDirection is not published");
must(typeof A._pdxMeasureAxis === "function", "_pdxMeasureAxis is not published");
const ALL_PIDS = [...byMember.keys()];
console.log(`      ${byMember.size} members seeded from the shipped record corpus`);

const MUTED = { no_pole: 1, balance_key: 1 };
const BANNED = [
  "Not about this issue", "not about this issue", "only incidentally",
  "brushed the subject", "rather than being about it", "touch this issue only",
];
const HOT = ["lee", "andy_harris", "aoc", "alsobrooks", "banks", "barrasso", "maloy", "blackburn", "hawley", "adam_smith", "chris_murphy"];
const SUB = [...new Set([...HOT.filter((p) => ALL_PIDS.indexOf(p) >= 0), ...ALL_PIDS.slice(0, 60)])];

// Everything a reader sees for a member, as one comparable snapshot: every row's
// key and tier, every drawer's markup, the formal index and the dossier lede.
function snapshot(win, pids) {
  const C = win.PDXConsistency, out = {};
  for (const pid of pids) {
    const parts = [];
    let rows = [];
    try { rows = C.issueRows(pid) || []; } catch (e) { rows = []; }
    for (const row of rows) {
      if (!row || !row.key) continue;
      let d = null, h = "", dos = "";
      try { d = C.recordPattern.display(row) || null; } catch (e) { d = null; }
      try { h = C.gapViewHtml(pid, row.key) || ""; } catch (e) { h = `err:${e && e.message}`; }
      try { dos = C.dossierReadHtml(pid, row.key) || ""; } catch (e) { dos = ""; }
      parts.push(`${row.key}|${d && d.tier}|${d && d.label}|${h.length}|${h}|${dos}`);
    }
    // The index echoes the raw records, flag and all; the echo is data, not a
    // read, so the field is dropped before comparing.
    try { parts.push(JSON.stringify(C.formalPatternIndex.rows(pid) || [], (k, v) => (k === "isPrimary" ? undefined : v))); } catch (e) { parts.push("fpi:err"); }
    out[pid] = parts.join("\n");
  }
  return out;
}
function diffSnap(a, b) {
  const bad = [];
  for (const pid of Object.keys(a)) if (a[pid] !== b[pid]) bad.push(pid);
  return bad;
}

// The 131 fixture on Lee's drawers, as a list of violations so every mutant is
// read by the same function.
const LEE131 = { lands: "lands_preserve", tape: "gov_regulation" };
const tableOf = (h) => (String(h).match(/<table class="pdxlg-t"[\s\S]*?<\/table>/g) || []).join("\n");
const rowSeg = (h, ident) => {
  const tb = tableOf(h);
  const segs = tb.split(/<tr[\s>]/);
  const i = segs.findIndex((s) => s.indexOf(ident) >= 0 && s.indexOf("pdxlg-effr") < 0);
  return i < 0 ? { row: "", eff: "" } : { row: segs[i], eff: (segs[i + 1] && segs[i + 1].indexOf("pdxlg-eff") >= 0) ? text("<tr " + segs[i + 1]) : "" };
};
function lee131(win) {
  const v = [];
  const C = win.PDXConsistency;
  const ident = "H.J.Res. 131";
  const drawers = {};
  for (const k of ["lands_preserve", "lands_energy", "energy_production", "gov_regulation"]) {
    let h = "";
    try { h = C.gapViewHtml("lee", k) || ""; } catch (e) { h = ""; }
    drawers[k] = h;
  }
  // MEMBERSHIP: every drawer 131 is mapped to that Lee has still lists it.
  const listed = Object.keys(drawers).filter((k) => tableOf(drawers[k]).indexOf(ident) >= 0);
  if (listed.length < 3) v.push(`H.J.Res. 131 lists on ${listed.length} of Lee's drawers (${listed.join(", ")}) — three memberships must survive`);
  if (listed.indexOf("gov_regulation") < 0) v.push("H.J.Res. 131 is gone from Lee's Cut Federal Red Tape drawer — off-axis is a badge, not a delete");
  if (listed.indexOf("lands_preserve") < 0) v.push("H.J.Res. 131 is gone from Lee's Protect Public Lands drawer");
  // THE BADGE: on the lands drawer the Red Tape chip is off-axis; the energy chips are on-axis.
  const lr = rowSeg(drawers.lands_preserve, ident).row;
  const chip = (lbl) => {
    const m = lr.match(new RegExp(`<span class="pdxlg-chip[^"]*"[^>]*>${lbl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    return m ? m[0] : "";
  };
  const lab = (k) => String(((win.ISSUE_MAP || {})[k] || {}).label || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const tapeLbl = lab("gov_regulation"), enLbl = lab("energy_production");
  const tc = tapeLbl && chip(tapeLbl), ec = enLbl && chip(enLbl);
  if (!tc) v.push(`the lands row's also-on no longer carries the ${tapeLbl || "gov_regulation"} chip`);
  else {
    if (tc.indexOf('data-pdx-axis="off"') < 0) v.push("the Red Tape chip on H.J.Res. 131 is not marked off-axis");
    if (tc.indexOf(`title="${TIP_OFF}"`) < 0) v.push("the Red Tape chip's tooltip is not the off-axis sentence");
    if (lr.indexOf(" · off-axis</span>") < 0) v.push("the off-axis word is missing from the Red Tape chip");
  }
  if (!ec) v.push(`the lands row's also-on no longer carries the ${enLbl || "energy_production"} chip`);
  else {
    if (ec.indexOf('data-pdx-axis="on"') < 0) v.push("the energy chip on H.J.Res. 131 is not marked on-axis");
    if (ec.indexOf(`title="${TIP_ON}"`) < 0) v.push("the energy chip's tooltip is not the on-axis sentence");
  }
  // …and on the Red Tape drawer, the lands chips are what the bill is about.
  const tr = rowSeg(drawers.gov_regulation, ident).row;
  if (tr && !/data-pdx-axis="on"/.test(tr)) v.push("the Red Tape row's also-on shows no on-axis chip for the lands topics");
  return { v, drawers };
}

// ── THE AUDIT ────────────────────────────────────────────────────────────────
// One pass over the provision-only population — every (member, issue) row whose
// mapped acts include a judged one and NOT ONE on-axis mapping. Returns the
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
      if ((idx.onAxis || 0) > 0) continue;    // an on-axis mapping is on this row: not this population
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
        if (!MUTED[why]) note(`${key}: ${judged} judged act(s), no on-axis mapping, and no read — refused as "${why}"`);
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
      //     as an on-axis one would be.
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
      if (d.packageOnly !== true) note(`${key}: no on-axis mapping on the row and the package disclosure is off`);
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
section("1 · the flag is unread: no live line anywhere names it");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(JSON.stringify(Object.keys(ALLOW)), '["all-seeing-eye.js"]', "the allowlist holds only the palette's button-style bit");
  eq(ALLOW["all-seeing-eye.js"].length, 1, "…one line of it");
  const found = scanPrimary(SRC);
  for (const hit of found.slice(0, 20)) ok(false, `${hit.file}:${hit.line} reads the retired leaf flag — "${hit.code}"`);
  eq(found.length, 0, `${found.length} live reference(s) to the retired flag across ${SCANNED.length} files`);
  const ui = bannedUi(SRC);
  for (const h of ui.slice(0, 10)) ok(false, `${h.file}:${h.line} ships retired or "primary"-synonym wording "${h.b}" — "${h.code}"`);
  eq(ui.length, 0, `${ui.length} line(s) of retired lane wording in shippable strings`);
  // The scanner still bites: the retired wording is there to find in HEAD's own
  // text, or in a fabricated line when HEAD is unreadable.
  const probe = new Map([["consistency.js", "      if (!m.isPrimary) continue;\n"]]);
  eq(scanPrimary(probe).length, 1, "the scanner catches `if (!m.isPrimary) continue;`");
  // The tooltips, word for word, from the one place they are declared.
  eq((A._PDX_AXIS_TIP || {}).on, TIP_ON, "the on-axis tooltip");
  eq((A._PDX_AXIS_TIP || {}).off, TIP_OFF, "the off-axis tooltip");
  has(SRC.get("issue-page.js"), TIP_ON.replace("’", "’"), "issue-page.js carries the on-axis tooltip");
  has(SRC.get("issue-page.js"), TIP_OFF, "issue-page.js carries the off-axis tooltip");
  for (const f of ["bill-detail.js", "consistency.js", "door1-workspace.js"]) {
    has(SRC.get(f), "_PDX_AXIS_TIP", `${f} reads the shared tooltips rather than writing its own`);
  }
  // The floors this file does not touch.
  eq(A._PDX_RD_MIN_JUDGED, 4, "the depth floor is where it was");
  eq(A._PDX_RD_DOMINANCE, 0.75, "…and the dominance floor");
  eq(A._PDX_RD_SPLIT_MIN_JUDGED, 6, "…and the split depth floor");
  eq(A._PDX_RD_SPLIT_MIN_SIDE, 2, "…and the split side floor");
  eq(A._PDX_RD_MEMBER_FLOOR, 12, "…and the member coverage floor");
  // New mappings do not write the flag.
  const ing = SRC.get("netlify/lib/vr-ingest.ts");
  ok(!/isPrimary\s*:/.test(ing.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n")),
    "vr-ingest.ts still writes isPrimary on a mapping");
  // The server's category table is the client's, regenerated.
  const table = JSON.parse(R("db/issue-core-categories.json"));
  eq(JSON.stringify(table), JSON.stringify(buildCategoryTable()),
    "db/issue-core-categories.json is stale — run node scripts/gen-issue-core-categories.mjs");
  let agree = 0;
  for (const [k, c] of Object.entries(table.categoryOf)) {
    const core = A.coreIssueForKey(k);
    if (core && core.key === c) agree++;
    else ok(false, `${k}: the server table says ${c}, the client says ${core && core.key}`);
  }
  must(agree > 50, `only ${agree} keys in the server category table`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the dominant category — 131, 3684, and a split with no fake winner");
// ═════════════════════════════════════════════════════════════════════════════
const SEEDMAP = new Map(JSON.parse(R("db/vr-issue-seed.json")).measures.map((m) => [`${m.number}|${m.congress}`, m]));
const issuesOf = (n, c) => ((SEEDMAP.get(`${n}|${c}`) || {}).issues || []).map((i) => ({ ...i }));
{
  const AX = A._pdxMeasureAxis, SUM = A._pdxAxisSummary;
  // H.J.Res. 131: Lands + Energy (three keys in Climate, Energy & Land) + Red Tape.
  const j131 = issuesOf("H.J.Res. 131", 119);
  must(j131.length >= 3, "H.J.Res. 131 is no longer in db/vr-issue-seed.json with its mappings");
  const keys131 = j131.map((i) => i.issueKey).sort().join(",");
  eq(keys131, "energy_production,gov_regulation,lands_energy,lands_preserve", "H.J.Res. 131's mappings are unchanged");
  const a = AX(j131);
  eq(a.winner, "climate_energy", "H.J.Res. 131's main category");
  eq(a.split, false, "…and it is not split");
  eq(a.axisOf("gov_regulation"), "off", "Cut Federal Red Tape is off-axis on H.J.Res. 131");
  for (const k of ["lands_preserve", "lands_energy", "energy_production"]) eq(a.axisOf(k), "on", `${k} is on-axis on H.J.Res. 131`);
  has(SUM(a, "bill"), "Main category: Climate, Energy & Land — 3 of 4 mapped topics.", "the 131 summary line");
  // The flag decides nothing: flipped, dropped, reordered, reweighted — same read.
  const variants = [
    j131.map((i) => ({ ...i, isPrimary: !i.isPrimary })),
    j131.map(({ isPrimary, ...r }) => r),
    j131.slice().reverse(),
    j131.map((i, n) => ({ ...i, weight: 10 + n * 30 })),
  ];
  for (const [n, v] of variants.entries()) {
    const b = AX(v);
    eq(JSON.stringify([b.winner, b.split, b.winners, ["gov_regulation", "lands_preserve", "lands_energy", "energy_production"].map(b.axisOf)]),
      JSON.stringify([a.winner, a.split, a.winners, ["gov_regulation", "lands_preserve", "lands_energy", "energy_production"].map(a.axisOf)]),
      `H.J.Res. 131 variant ${n}: the flag, order or weight moved the dominant category`);
  }
  // H.R. 3684: three transport/broadband keys, three water/climate keys, one debt key.
  const h3684 = issuesOf("H.R. 3684", 117);
  must(h3684.some((i) => i.issueKey === "water"), "H.R. 3684 no longer carries water in the seed");
  const s = AX(h3684);
  eq(s.winner, null, "H.R. 3684 has no single winner");
  eq(s.split, true, "…it is split");
  eq(s.winners.join(","), "climate_energy,economy_cost_of_living", "…across the two tied categories, in a meaning-free order");
  eq(s.axisOf("water"), "on", "water is on-axis — one of the tied categories");
  eq(s.axisOf("infrastructure"), "on", "infrastructure is on-axis — the other tied category");
  eq(s.axisOf("national_debt"), "off", "national_debt is off-axis on H.R. 3684");
  const s3684 = SUM(s, "bill");
  has(s3684, "This bill is split across", "the 3684 summary names the split");
  has(s3684, "so it has no single main category", "…and says there is no single main category");
  no(s3684, "Main category:", "…and never names one");
  // Synthetic splits: a tie is never broken by order, weight or the flag.
  const mk = (ks) => ks.map((k, n) => ({ issueKey: k, weight: 100 - n * 20, isPrimary: n === 0, supportMeaning: "yea_supports" }));
  const splits = [
    ["gun_rights", "lower_taxes"],
    ["lower_taxes", "gun_rights"],
    ["gun_rights", "gun_safety", "lower_taxes", "national_debt", "school_choice"],
    ["school_choice", "national_debt", "gun_safety", "lower_taxes", "gun_rights"],
  ];
  const reads = splits.map((ks) => AX(mk(ks)));
  for (const [n, r] of reads.entries()) {
    eq(r.winner, null, `synthetic split ${n}: no fake single winner`);
    eq(r.split, true, `synthetic split ${n}: split`);
    has(SUM(r, "bill"), "split across", `synthetic split ${n}: the copy says split`);
  }
  eq(JSON.stringify(reads[0].winners), JSON.stringify(reads[1].winners), "order does not break a 1–1 tie");
  eq(JSON.stringify(reads[2].winners), JSON.stringify(reads[3].winners), "order does not break a 2–2 tie");
  eq(reads[2].axisOf("school_choice"), "off", "the 2–2–1 split: the single key is off-axis");
  eq(reads[2].axisOf("gun_rights"), "on", "the 2–2–1 split: a tied key is on-axis");
  eq(reads[2].axisOf("lower_taxes"), "on", "…and so is the other tied category's");
  has(SUM(reads[2], "bill"), "2 mapped topics in each", "the split copy says how many in each");
  // A key the measure does not carry has no axis at all.
  eq(a.axisOf("gun_rights"), "", "an unmapped key has no axis");
  // THE SERVER READS THE SAME AXIS. netlify/lib/vr-axis.ts is loaded with Node's
  // own type stripping (no bundler) and asked about every seeded measure; its
  // on-axis set, winner and split must be the client helper's on all of them.
  const measures = [...SEEDMAP.values()].filter((m) => (m.issues || []).length);
  const dir = mkdtempSync(join(tmpdir(), "pdx-axis-"));
  const probe = join(dir, "probe.mjs");
  writeFileSync(probe,
    `import { measureAxis } from ${JSON.stringify(join(ROOT, "netlify/lib/vr-axis.ts"))};\n` +
    `import { readFileSync } from "node:fs";\n` +
    `const ms = JSON.parse(readFileSync(process.argv[2], "utf8"));\n` +
    `process.stdout.write(JSON.stringify(ms.map((ks) => { const a = measureAxis(ks); return [a.winner, a.split, [...a.onAxisKeys].sort()]; })));\n`);
  const keysList = measures.map((m) => m.issues.map((i) => i.issueKey));
  writeFileSync(join(dir, "in.json"), JSON.stringify(keysList));
  let server = null;
  try {
    server = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "--no-warnings", probe, join(dir, "in.json")],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  } catch (e) { server = null; }
  if (server) {
    let agree = 0;
    measures.forEach((m, n) => {
      const c = AX(m.issues);
      const mine = JSON.stringify([c.winner, c.split, keysList[n].filter((k) => c.axisOf(k) === "on").sort()]);
      if (mine === JSON.stringify(server[n])) agree++;
      else ok(false, `${m.number} (${m.congress}): the server reads ${JSON.stringify(server[n])}, the client ${mine}`);
    });
    eq(agree, measures.length, `the server's axis agrees with the client's on every seeded measure`);
    must(measures.length > 100, `only ${measures.length} seeded measures to compare`);
    console.log(`      server and client agree on all ${agree} seeded measures`);
  } else {
    console.log("      this Node cannot strip types — the server twin was not compared");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the flag flipped, and dropped — every drawer byte-identical");
// ═════════════════════════════════════════════════════════════════════════════
const SNAP = snapshot(A, SUB);
const DM_BASE = dmLedger(A);
{
  const F = boot(null, "flip"), D = boot(null, "drop");
  const bf = diffSnap(SNAP, snapshot(F, SUB)), bd = diffSnap(SNAP, snapshot(D, SUB));
  eq(bf.join(","), "", `${bf.length} member(s) render differently with every leaf flag flipped`);
  eq(bd.join(","), "", `${bd.length} member(s) render differently with every leaf flag deleted`);
  const dmF = dmLedger(F);
  const moved = Object.keys(DM_BASE).filter((p) => DM_BASE[p] !== dmF[p]);
  eq(moved.length, 0, `Direction Match moved on ${moved.length} profile(s) with the flags flipped`);
  const bytes = Object.values(SNAP).reduce((n, s) => n + s.length, 0);
  must(bytes > 200000, `the snapshot is too small to prove anything (${bytes} bytes)`);
  console.log(`      ${SUB.length} members · ${bytes} bytes of drawer, dossier and index · identical flipped and dropped`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · H.J.Res. 131 on Lee — three memberships, Red Tape off-axis, two effect lines");
// ═════════════════════════════════════════════════════════════════════════════
{
  const { v, drawers } = lee131(A);
  for (const m of v) ok(false, `lee: ${m}`);
  eq(v.length, 0, "the 131 fixture holds");
  // THE EFFECT LINES, UNCHANGED. Lands prints the ANWR acreage line; Red Tape
  // prints its own; neither borrows the other's. Both are compared to HEAD's
  // render where HEAD is readable.
  const landsEff = rowSeg(drawers.lands_preserve, "H.J.Res. 131").eff;
  const tapeEff = rowSeg(drawers.gov_regulation, "H.J.Res. 131").eff;
  eq(landsEff, LANDS131, "lee × lands_preserve: the H.J.Res. 131 effect line");
  ok(tapeEff.length > 20 && tapeEff !== LANDS131, `lee × gov_regulation: H.J.Res. 131 prints its own red-tape line — got "${tapeEff}"`);
  has(tableOf(drawers.lands_preserve), "2025-12-04", "lee × lands_preserve: the 131 row keeps its date");
  const headSrc = FILES.map((f) => [f, HEAD(f)]);
  if (headSrc.every(([, s]) => s !== null)) {
    const H = makeSandbox();
    const ctx = vm.createContext(H);
    H.PROFILES = H.CMP_DATA;
    let bootErr = "";
    for (const [f, s] of headSrc) { try { vm.runInContext(s, ctx, { filename: f }); } catch (e) { bootErr = `${f}: ${e.message}`; } }
    H.PROFILES = H.CMP_DATA;
    H.PDXVotingRecord.noteMember("lee", JSON.parse(JSON.stringify(byMember.get("lee"))));
    ok(!bootErr, `HEAD did not boot: ${bootErr}`);
    const hl = rowSeg(H.PDXConsistency.gapViewHtml("lee", "lands_preserve") || "", "H.J.Res. 131").eff;
    const ht = rowSeg(H.PDXConsistency.gapViewHtml("lee", "gov_regulation") || "", "H.J.Res. 131").eff;
    eq(landsEff, hl, "the lands effect line is HEAD's, byte for byte");
    eq(tapeEff, ht, "the red-tape effect line is HEAD's, byte for byte");
    console.log("      effect lines compared against HEAD");
  } else {
    console.log("      HEAD unreadable here — effect lines pinned against the shipped sentence only");
  }
  // The dossier row sentence says where the act sits.
  const det = detailOf(A, "lee", "gov_regulation", "H.J.Res. 131");
  ok(det.d && det.d.axis === "off", `lee × gov_regulation: the dossier item for H.J.Res. 131 is off-axis — got ${det.d && det.d.axis}`);
  has(det.html, 'data-pdx-axis="off"', "lee × gov_regulation: the dossier detail carries the off-axis tag");
  has(det.html, TIP_OFF.replace(/’/g, "’"), "…with the off-axis tooltip");
  const detL = detailOf(A, "lee", "lands_preserve", "H.J.Res. 131");
  ok(detL.d && detL.d.axis === "on", `lee × lands_preserve: the dossier item for H.J.Res. 131 is on-axis — got ${detL.d && detL.d.axis}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · H.R. 3684 — split, on Water, and the Nay still prints");
// ═════════════════════════════════════════════════════════════════════════════
{
  const nays = [];
  for (const [pid, recs] of byMember) {
    for (const r of recs) {
      if (r.number === "H.R. 3684" && r.congress === 117 && r.position === "nay" &&
          (r.issues || []).some((i) => i.issueKey === "water")) { nays.push(pid); break; }
    }
  }
  must(nays.length > 5, `only ${nays.length} Nay voters on H.R. 3684 in the corpus`);
  let rows = 0, split = 0, off = 0;
  for (const pid of nays.slice(0, 12)) {
    let h = "";
    try { h = CS.gapViewHtml(pid, "water") || ""; } catch (e) { h = ""; }
    const seg = rowSeg(h, "H.R. 3684").row;
    if (!seg) { ok(false, `${pid} × water: the H.R. 3684 row is gone`); continue; }
    rows++;
    ok(/\bNay\b/.test(text("<tr " + seg)), `${pid} × water: the H.R. 3684 row no longer prints the Nay`);
    if (/data-pdx-axis="off"[^>]*>[^<]*(?:Debt|debt)/.test(seg) || /National Debt[^<]*<span class="pdxlg-ax"> · off-axis/.test(seg)) off++;
    const dw = detailOf(A, pid, "water", "H.R. 3684");
    if (dw.d && dw.d.axis === "on" && dw.d.axisSplit === true && /data-pdx-axis="on"/.test(dw.html)) split++;
    no(seg, "data-pdx-axis=\"on\" title=\"" + TIP_OFF, `${pid}: a tooltip was paired with the wrong badge`);
  }
  eq(rows, Math.min(12, nays.length), "every sampled Nay voter's water drawer lists H.R. 3684");
  eq(off, rows, "on every one, the national-debt chip is badged off-axis");
  eq(split, rows, "and in every dossier, water is on-axis on a split bill — no single winner");
  // No new water effect line.
  const count = (s) => (String(s || "").match(/'H\.R\. 3684\|117\|/g) || []).length;
  const hs = HEAD("consistency.js");
  if (hs !== null) eq(count(SRC.get("consistency.js")), count(hs), "no H.R. 3684 effect line was added or dropped since HEAD");
  const wl = (s) => { const i = String(s || "").indexOf("'H.R. 3684|117|water'"); return i < 0 ? "" : s.slice(i, s.indexOf("}", i)); };
  if (hs !== null) eq(wl(SRC.get("consistency.js")), wl(hs), "the H.R. 3684 water entry is HEAD's, byte for byte");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the off-axis-only population, audited row by row");
// ═════════════════════════════════════════════════════════════════════════════
const BASE = audit(A);
{
  const c = BASE.census;
  must(c.prov > 500, `only ${c.prov} off-axis-only rows with a judged act were swept`);
  must(c.html > 100, `only ${c.html} dossiers were rendered`);
  for (const m of BASE.v.slice(0, 20)) ok(false, m);
  eq(BASE.v.length, 0, `${BASE.v.length} off-axis-only row(s) fight the rule`);
  console.log(`      ${c.rows} rows swept · ${c.prov} off-axis-only with a judged act · ${c.read} read · ${c.quoted} quoted from the browse lane`);
  console.log(`      ${c.one} one-vote leans · ${c.deep} deep and dominant · ${c.html} dossiers rendered`);
  console.log(`      refusals left: ${JSON.stringify(c.refused)}`);
  // The corpus holds no deep, one-sided pile that is off-axis on every act, so
  // one is built: six floor Yeas on bills whose main category is Guns, read on
  // Lower Taxes. Deep and dominant is a direction — the axis is a badge.
  const ix = offAxisPile(A);
  eq(ix.onAxis, 0, "the synthetic pile is off-axis on every act");
  eq(ix.token, "record_direction", "a deep, one-sided, all-off-axis pile still reads as a direction");
  eq(ix.lead, "advances", "…and the direction is the one the votes went");
  for (const why of Object.keys(c.refused)) {
    ok(!!MUTED[why], `an off-axis-only row with judged acts was refused as "${why}" (${c.refused[why]} rows)`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the gate, put back — and every shape of it fails this file");
// ═════════════════════════════════════════════════════════════════════════════
{
  const line = (s, from) => {
    const i = s.indexOf(from);
    must(i >= 0, `mutation anchor is gone from the shipped source: "${from}"`);
    must(s.indexOf(from, i + 1) < 0, `mutation anchor is no longer unique: "${from}"`);
    return i;
  };
  const after = (file, anchor, add) => ({ [file]: (s) => { line(s, anchor); return s.replace(anchor, anchor + add); } });
  const MUTANTS = [
    { id: "C1", what: "the dominant-category count skips unflagged mappings",
      files: after("stance-helpers.js", "if (!k || catOf[k]) continue;", "\n        if (!list[i].isPrimary) continue;") },
    { id: "C2", what: "the also-on chips skip unflagged mappings",
      files: after("consistency.js", "if (!it || !it.issueKey || it.issueKey === issueKey) continue;", "\n      if (!it.isPrimary) continue;") },
    { id: "C3", what: "the drawer's row list skips a measure whose mapping here is unflagged",
      files: after("consistency.js", "_orProofPicks(pid, issueKey, ov).forEach(function (p) {", "\n        if (!(_dosMapping(p.item, issueKey) || {}).isPrimary) return;") },
    // The rung _onAxisOnFile feeds (axis_unjudged) holds no row in the shipped
    // corpus, so nothing on screen can move; the scan is this mutant's detector.
    { id: "C4", what: "the on-file axis census skips unflagged mappings", scanOnly: true,
      files: after("consistency.js", "var it = recs[i], m = _dosMapping(it, issueKey);\n          if (!m) continue;", "\n          if (!m.isPrimary) continue;") },
    { id: "C5", what: "the record index counts the flag instead of the axis",
      files: { "stance-helpers.js": (s) => { const a = "if (_pdxMeasureAxis(item && item.issues).onAxis(mapping.issueKey)) out.onAxis++;"; line(s, a); return s.replace(a, "if (mapping.isPrimary) out.onAxis++;"); } } },
    { id: "T1", what: "the display lane refuses an off-axis-only row outright", audit: /refused as/,
      files: { "stance-helpers.js": (s) => {
        const cut = s.indexOf("function _recordDisplayTier");
        must(cut > 0, "_recordDisplayTier is gone from stance-helpers.js");
        const head = s.slice(0, cut), tail = s.slice(cut);
        const PK = "var pkgOnly = (idx.onAxis || 0) < _RD_MIN_ON_AXIS;";
        must(tail.indexOf(PK) >= 0, "the display lane's pkgOnly line is gone");
        return head + tail.replace(PK, PK + "\n      if (pkgOnly) return null;");
      } } },
    { id: "T2", what: "the index refuses a direction to a deep off-axis pile", pile: true,
      files: { "stance-helpers.js": (s) => {
        const A1 = "out.token = 'record_direction';\n          out.lead = (out.advances >= out.opposes) ? 'advances' : 'opposes';";
        line(s, A1);
        return s.replace(A1, "if ((out.onAxis || 0) < _RD_MIN_ON_AXIS) { out.token = 'record_thin'; out.reason = 'weak_acts'; } else {\n          " + A1 + "\n          }");
      } } },
    { id: "T3", what: "the one-vote lean is gated on the axis again", audit: /one recorded vote/,
      files: { "stance-helpers.js": (s) => {
        const A1 = "idx.judged === 1 && _rdLeanAllowed(idx)) {";
        line(s, A1);
        return s.replace(A1, "idx.judged === 1 && (idx.onAxis || 0) >= 1 && _rdLeanAllowed(idx)) {");
      } } },
  ];
  for (const m of MUTANTS) {
    const t0 = Date.now();
    const mutSrc = new Map(SRC);
    for (const f of Object.keys(m.files)) mutSrc.set(f, m.files[f](SRC.get(f)));
    const scanned = scanPrimary(mutSrc);
    let win = null, flip = null;
    try { win = boot(m.files); } catch (e) { win = null; }
    if (!win) { ok(false, `${m.id} (${m.what}): the mutant would not boot, so it proves nothing`); continue; }
    const why = [];
    if (m.id[0] === "C") {
      // The flag gates: the scan names it, and the render stops being flag-blind
      // or loses a membership.
      if (scanned.length) why.push(`scan:${scanned.length}`);
      const l = lee131(win).v;
      if (l.length) why.push(`131:${l[0]}`);
      try { flip = boot(m.files, "flip"); } catch (e) { flip = null; }
      const pids = ["lee", ...nayPids().slice(0, 3), ...SUB.slice(0, 12)];
      const d = flip ? diffSnap(snapshot(win, pids), snapshot(flip, pids)) : ["(flip boot failed)"];
      if (d.length) why.push(`flip:${d.length}`);
      ok(scanned.length > 0, `${m.id} (${m.what}): the scan did not name the flag`);
      if (!m.scanOnly) ok(l.length > 0 || d.length > 0, `${m.id} (${m.what}): nothing on screen noticed — no 131 violation, flip-invariant on ${pids.length} members`);
    } else {
      let res = { v: [] };
      if (m.pile) {
        const px = offAxisPile(win);
        if (px.token !== "record_direction") res.v.push(`the all-off-axis pile read ${px.token}/${px.reason}`);
      } else {
        try { res = audit(win, { pids: SUB, htmlCap: 0 }); } catch (e) { res = { v: [`audit threw: ${e && e.message}`] }; }
      }
      if (res.v.length) why.push(`${m.pile ? "pile" : "audit"}:${res.v.length}`);
      ok(res.v.length > 0, `${m.id} (${m.what}) went undetected`);
      if (m.audit) ok(res.v.some((s) => m.audit.test(s)), `${m.id}: caught, but not by the invariant it was aimed at — first violation was "${res.v[0] || "(none)"}"`);
      const dm = dmLedger(win);
      const moved = Object.keys(DM_BASE).filter((p) => dm[p] !== DM_BASE[p]);
      eq(moved.length, 0, `${m.id}: Direction Match moved on ${moved.length} profile(s)`);
    }
    console.log(`      ${m.id} ${why.length ? "caught" : "MISSED"} · ${why.join(" · ").slice(0, 110)} · ${Date.now() - t0}ms`);
  }
}
function detailOf(win, pid, key, ident) {
  const C = win.PDXConsistency;
  let items = [];
  try { items = C.dossierItems(pid, key) || []; } catch (e) { items = []; }
  const i = items.findIndex((d) => d && String(d.ident || "").indexOf(ident) === 0);
  if (i < 0) return { d: null, html: "" };
  let html = "";
  try { html = C.dossierDetailHtml(pid, key, i, items) || ""; } catch (e) { html = ""; }
  return { d: items[i], html };
}
function offAxisPile(win) {
  const recs = [];
  for (let n = 0; n < 6; n++) recs.push({
    id: "syn" + n, measureId: "syn" + n, number: "H.R. " + (9000 + n), congress: 119, kind: "floor_vote", type: "bill",
    position: "yea", result: "passed", isProcedural: false, date: "2025-0" + (n + 1) + "-01",
    issues: [
      { issueKey: "lower_taxes", weight: 100, supportMeaning: "yea_supports" },
      { issueKey: "gun_rights", weight: 100, supportMeaning: "yea_supports" },
      { issueKey: "gun_safety", weight: 100, supportMeaning: "yea_opposes" },
    ],
  });
  return win._recordDirectionIndex("lower_taxes", recs, { memberRecordCount: 40 });
}
function nayPids() {
  const out = [];
  for (const [pid, recs] of byMember) {
    if (recs.some((r) => r.number === "H.R. 3684" && r.congress === 117 && r.position === "nay")) out.push(pid);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n   ${failed ? "✗" : "✓"} ${passed} passed, ${failed} failed`);
if (failed) {
  console.log("\n   failures:");
  for (const f of failures) console.log(`     · ${f}`);
  process.exit(1);
}
console.log("   The leaf flag is retired and unread. On-axis and off-axis are badges; every membership still renders.\n");
