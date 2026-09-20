#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// THE ISSUE LEDGER: HOW MANY BILLS, HOW MANY ACTS, AND WHICH WAY ON EACH
// ─────────────────────────────────────────────────────────────────────────────
// The issue drawer used to open on three verdicts at once — a percent hero, a
// bucket line and a stance chip — and then a wall of method: how Direction Match
// weights the issue, the depth caveat, the wall between the public and formal
// records, suggest-a-lead. Everything on that screen was a READING. Nothing on
// it was the INVENTORY, so a reader could not answer the first question anyone
// actually has: how many bills is this, and how many times did they vote?
//
// That question has a sharp answer and the old shape hid it. H.R. 8595 is ONE
// statute that a member votes on TWICE — once on a motion to recommit, which is
// an attempt to change it, and once on passage, which is the result. Two rows,
// one bill number, and the repetition is the lesson.
//
// So the drawer now leads with the ledger, and this harness holds it to the nine
// things that make it a table of facts rather than a second opinion:
//
//   1. THE TALLY IS ALWAYS THE SAME SHAPE. N bills, M formal acts, X for, Y
//      against — on every issue with a roll call, in the same words, with the
//      grammar agreeing with the count.
//   2. ONE ROW PER ACT, NOT PER ESSAY. As many table rows as the tally claims
//      acts, each with a date, a bill number that opens the bill file, the kind
//      of act and Yea or Nay spelled out.
//   3. ONE STATUTE CAN CARRY TWO ACTS, AND SAYS SO. Same number twice, and a
//      line naming the measure when every act on the issue belongs to it.
//   4. TRIED TO CHANGE IT, THEN VOTED ON THE RESULT. Amendments above passage
//      and recommit, chronological inside each group.
//   5. NO KIND IS GUESSED. An unrecognised act prints the clerk's own words.
//   6. ONE FINDING, NOT THREE VERDICTS. One line at the top; every percentage
//      and every sentence of method behind one disclosure.
//   7. A DRAWER WITH NO ROLL CALL IS UNCHANGED. Byte-identical to HEAD.
//   8. NOTHING SCORED MOVED. Tiers, Direction Match, the dossier read and every
//      percentage in the drawer are what HEAD says they are.
//   9. THE PASS STAYED IN ITS LANE. No equity copy, and the homepage gate,
//      /voice, the SD-3 board, the money pills and the FD tables are untouched.
//
//   node scripts/test-issue-ledger.mjs
//
// Runs the shipped renderer over the shipped archive in one node:vm sandbox,
// seeded from the same roll-call corpus the record pages are built from.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const HEAD = (f) => {
  try {
    return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch { return null; }
};

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
  "profile-spine.js",
  "profiles-full.js",
];

const corpus = buildCorpus(ROOT);

function boot(get) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    const src = get(f);
    if (src === null) continue;
    try { vm.runInContext(src, ctx, { filename: f }); } catch (e) { win.__err = `${f}: ${e.message}`; }
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
  }
  return win;
}

const win = boot(R);
const CS = win.PDXConsistency;

let pass = 0;
const fails = [];
const ok = (c, m) => { if (c) pass++; else fails.push(m); };
const must = (c, m) => { if (!c) { console.error("  ✗ " + m); process.exit(1); } pass++; };
const eq = (a, b, m) => ok(a === b, `${m} — got ${JSON.stringify(a)}, wanted ${JSON.stringify(b)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const no = (h, n, m) => ok(!String(h).includes(n), `${m} — found ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);

const text = (html) =>
  String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

must(CS && typeof CS.gapViewHtml === "function", "PDXConsistency.gapViewHtml did not boot");
must(typeof CS.dossierTally === "function", "the ledger tally is not exported");
must(typeof CS.dossierLedgerHtml === "function", "the ledger renderer is not exported");
must(!win.__err, `an engine file failed to boot: ${win.__err}`);

// ── The population: every issue drawer in the archive, sorted by lane ────────
const ALL = [];
for (const pid of Object.keys(win.CMP_DATA)) {
  let rows = [];
  try { rows = CS.issueRows(pid) || []; } catch { continue; }
  for (const r of rows) {
    let t = null;
    try { t = CS.dossierTally(pid, r.key, r.ov); } catch (e) { fails.push(`${pid}/${r.key}: tally threw ${e.message}`); continue; }
    ALL.push({ pid, key: r.key, r, t });
  }
}
const WITH = ALL.filter((x) => x.t.acts > 0);
const WITHOUT = ALL.filter((x) => x.t.acts === 0);
must(WITH.length > 100, `only ${WITH.length} issue drawers in the archive carry a formal act`);
console.log(`${ALL.length} issue drawers · ${WITH.length} carry at least one formal act · ${WITHOUT.length} carry none`);

// One render per drawer, reused by every section below.
const HTML = new Map();
const key = (x) => `${x.pid}/${x.key}`;
for (const x of ALL) {
  let h = "";
  try { h = CS.gapViewHtml(x.pid, x.key) || ""; } catch (e) { fails.push(`${key(x)}: gapViewHtml threw ${e.message}`); }
  HTML.set(key(x), h);
}
const drawer = (pid, k) => HTML.get(`${pid}/${k}`) || "";
// Everything before the scoring disclosure: what a reader gets without opening
// anything. "First screenful" in this file means exactly this substring.
const lede = (h) => {
  const i = String(h).indexOf('<details class="pdxgap-how"');
  return i === -1 ? String(h) : String(h).slice(0, i);
};
const folded = (h) => {
  const i = String(h).indexOf('<details class="pdxgap-how"');
  return i === -1 ? "" : String(h).slice(i);
};
const table = (h) => {
  const out = [];
  const re = /<table class="pdxlg-t"[\s\S]*?<\/table>/g;
  let m;
  while ((m = re.exec(String(h)))) out.push(m[0]);
  return out.join("\n");
};

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the tally is always the same shape, and the grammar agrees with it");
// ═════════════════════════════════════════════════════════════════════════════
{
  let sampled = 0;
  for (const x of WITH) {
    const h = drawer(x.pid, x.key);
    const t = x.t;
    const l = text(lede(h));
    const where = key(x);
    sampled++;
    // The two fixed lines, in the fixed words.
    const bills = `${t.bills} ${t.bill ? (t.bills === 1 ? "bill" : "bills") : (t.bills === 1 ? "measure" : "measures")}`;
    const acts = `${t.acts} formal ${t.acts === 1 ? "act" : "acts"}`;
    has(l, `On this issue: ${bills} · ${acts}`, `${where}: the tally line is not in the fixed shape`);
    has(l, `Acts: ${t.advances} for · ${t.opposes} against`, `${where}: the for/against line does not match the engine`);
    if (t.noSide > 0) has(l, `· ${t.noSide} took no side`, `${where}: ${t.noSide} act(s) with no side are counted nowhere`);
    // The three buckets have to add up to the act count, or a row is missing.
    eq(t.advances + t.opposes + t.noSide, t.acts, `${where}: the sides do not add up to the acts`);
    // One row per act, not per essay.
    const rows = (table(h).match(/data-pdxlg-row="/g) || []).length;
    eq(rows, t.acts, `${where}: ${rows} table row(s) for ${t.acts} act(s)`);
    // And the count is the record lane only — a stance or an executive action is
    // not a formal act and must not be in here.
    const items = CS.dossierItems(x.pid, x.key, x.r && x.r.ov) || [];
    const recs = items.filter((d) => d && !d.held && d.lane === "record").length;
    eq(t.acts, recs, `${where}: the tally counts ${t.acts} acts against ${recs} record-lane items`);
  }
  console.log(`      ${sampled} drawers hold the fixed tally shape`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · Massie × voter_id — the named fixture, pinned to the archive");
// ═════════════════════════════════════════════════════════════════════════════
{
  const t = CS.dossierTally("massie", "voter_id", CS.issueRow("massie", "voter_id").ov);
  const h = drawer("massie", "voter_id");
  must(h.length > 2000, "massie × voter_id rendered nothing");
  const l = text(lede(h));
  // What the archive says today: one statute, one act on it. If curation adds
  // the recommit vote, this becomes 1 bill · 2 formal acts and the numbers below
  // move together — which is the point of asserting them against the tally too.
  eq(t.bills, 1, "massie × voter_id: the archive no longer holds exactly one bill");
  eq(t.acts, 1, "massie × voter_id: the archive no longer holds exactly one act");
  has(l, "On this issue: 1 bill · 1 formal act", "massie × voter_id: the tally line");
  has(l, "Acts: 1 for · 0 against", "massie × voter_id: the for/against line");
  // The row: date, number, kind, vote — all four, in words.
  const tb = table(h);
  has(tb, "H.R. 22", "massie × voter_id: the row does not name the bill");
  has(text(tb), "2025-04-10 H.R. 22 Passage Yea", "massie × voter_id: the row is not date · number · kind · vote");
  // The number is the same door the rest of the site uses.
  has(tb, 'class="pdxlg-num pdxbill-door"', "massie × voter_id: the bill number is not a bill-file door");
  has(tb, 'data-pdxbill-num="H.R. 22"', "massie × voter_id: the door carries no bill identity");
  has(tb, 'data-pdxbill-sit="119"', "massie × voter_id: the door carries no congress");
  // One finding, and it is not a percentage.
  eq((h.match(/class="pdxlg-find"/g) || []).length, 1, "massie × voter_id: not exactly one finding line");
  has(l, "Backed up", "massie × voter_id: the finding word");
  has(l, "one act on file", "massie × voter_id: the finding qualifier");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · one statute, two acts — amendment and passage, same number twice");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The archive's clearest case: H.R. 8595, a motion to recommit and then
  // passage, on one issue, for one member.
  const t = CS.dossierTally("maloy", "gov_services", CS.issueRow("maloy", "gov_services").ov);
  const h = drawer("maloy", "gov_services");
  const l = text(lede(h));
  const tb = table(h);
  eq(t.bills, 1, "maloy × gov_services: not one bill");
  eq(t.acts, 2, "maloy × gov_services: not two acts");
  eq(t.ident, "H.R. 8595", "maloy × gov_services: the measure moved");
  has(l, "On this issue: 1 bill · 2 formal acts", "maloy × gov_services: the tally line");
  has(l, "All 2 acts are the same measure — H.R. 8595.", "maloy × gov_services: the same-measure line");
  // BOTH rows name the same statute. This is the lesson, not a duplicate bug.
  eq((tb.match(/H\.R\. 8595/g) || []).length >= 2, true, "maloy × gov_services: the number does not appear on both rows");
  eq((tb.match(/data-pdxlg-row="/g) || []).length, 2, "maloy × gov_services: not two rows");
  // Two different kinds, and a side in words on each.
  has(text(tb), "H.R. 8595 Recommit Nay", "maloy × gov_services: the recommit row");
  has(text(tb), "H.R. 8595 Passage Yea", "maloy × gov_services: the passage row");
  // AND THE OTHER STATUTE STAYS OUT OF THE TABLE. H.R. 22 / the SAVE Act is a
  // different instrument; a reader must never be able to read it as a vote on
  // H.R. 8595. It is free to appear in the folded curation note, and does.
  no(tb, "H.R. 22", "maloy × gov_services: H.R. 22 is in the vote table");
  no(tb, "SAVE Act", "maloy × gov_services: the SAVE Act is in the vote table");

  // The same shape on a different statute and a different member, so the rule is
  // the renderer's and not one row's luck.
  const at = CS.dossierTally("aguilar", "voter_id", CS.issueRow("aguilar", "voter_id").ov);
  const ah = drawer("aguilar", "voter_id");
  eq(at.bills, 1, "aguilar × voter_id: not one bill");
  eq(at.acts, 2, "aguilar × voter_id: not two acts");
  has(text(lede(ah)), "On this issue: 1 bill · 2 formal acts", "aguilar × voter_id: the tally line");
  has(text(lede(ah)), "All 2 acts are the same measure — H.R. 22.", "aguilar × voter_id: the same-measure line");
  const atb = text(table(ah));
  has(atb, "H.R. 22 Recommit Yea", "aguilar × voter_id: the recommit row");
  has(atb, "H.R. 22 Passage Nay", "aguilar × voter_id: the passage row");
  // A Yea and a Nay on the same number, both legible on their own row. That pair
  // is the whole reason this pass exists.
  ok(/Yea/.test(atb) && /Nay/.test(atb), "aguilar × voter_id: the two sides are not both visible");

  // THE ROW SIDE IS THE CANONICAL READ, INVERSION AND ALL. A nay on a motion to
  // recommit ADVANCES the measure, which is why maloy's two acts both count as
  // for. The counts have to agree with the sheet's own read of the same votes.
  eq(`${t.advances} for · ${t.opposes} against`, "2 for · 0 against",
    "maloy × gov_services: the recommit nay is not read as advancing the bill");
  eq(`${at.advances} for · ${at.opposes} against`, "0 for · 2 against",
    "aguilar × voter_id: the recommit yea is not read as blocking the bill");

  // And one live case where the two acts genuinely went opposite ways.
  const pt = CS.dossierTally("chellie_pingree", "guard_authority", CS.issueRow("chellie_pingree", "guard_authority").ov);
  if (pt.acts === 2 && pt.advances > 0 && pt.opposes > 0) {
    const f = CS.dossierFinding(CS.issueRow("chellie_pingree", "guard_authority"), pt);
    eq(f.q, "same bill, two ways", "pingree × guard_authority: one bill both ways is not called that");
  }
  // Every one-bill-many-act drawer in the archive carries the same-measure line.
  let same = 0;
  for (const x of WITH) {
    if (!(x.t.bills === 1 && x.t.acts > 1)) continue;
    same++;
    has(text(lede(drawer(x.pid, x.key))), `All ${x.t.acts} acts are the same measure — ${x.t.ident}.`,
      `${key(x)}: ${x.t.acts} acts on one measure and no line saying so`);
  }
  console.log(`      ${same} drawers in the archive are one measure carrying several acts`);
  ok(same > 20, `only ${same} one-measure-many-act drawers found — the fixture class thinned out`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · tried to change it, then voted on the result");
// ═════════════════════════════════════════════════════════════════════════════
{
  const h = drawer("massie", "cut_spending");
  const l = text(h);
  const iChange = h.indexOf("Tried to change it");
  const iResult = h.indexOf("Voted on the result");
  ok(iChange > -1, "massie × cut_spending: no amendment group");
  ok(iResult > -1, "massie × cut_spending: no result group");
  ok(iChange < iResult, "massie × cut_spending: the result group is printed above the attempts to change it");
  // The amendments are in the first group and nowhere else.
  const tables = String(h).match(/<table class="pdxlg-t"[\s\S]*?<\/table>/g) || [];
  ok(tables.length === 2, `massie × cut_spending: ${tables.length} table(s), expected one per group`);
  const amdt = (text(tables[0]).match(/H\.Amdt\./g) || []).length;
  ok(amdt >= 3, `massie × cut_spending: ${amdt} amendment row(s) in the first group, expected 3 or more`);
  no(text(tables[1] || ""), "H.Amdt.", "massie × cut_spending: an amendment landed in the result group");
  has(text(tables[1] || ""), "Passage", "massie × cut_spending: the result group holds no passage vote");

  // Chronological inside every group, on every drawer — the table is a record,
  // so it reads forwards.
  let checked = 0;
  for (const x of WITH) {
    const tb = String(drawer(x.pid, x.key)).match(/<table class="pdxlg-t"[\s\S]*?<\/table>/g) || [];
    for (const one of tb) {
      const dates = (one.match(/class="pdxlg-d">([^<]*)</g) || []).map((s) => s.replace(/.*>/, ""));
      const sorted = dates.slice().sort();
      if (dates.length > 1) { checked++; eq(dates.join("|"), sorted.join("|"), `${key(x)}: a group is not in date order`); }
    }
  }
  console.log(`      ${checked} multi-row group(s) in date order`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · a side in words on every row, and no kind is ever guessed");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Every row prints a side in words. "Did not vote" and "Present" are sides the
  // clerk recorded and are printed as such — what is forbidden is an abbreviation
  // a reader has to decode, and a blank cell where a position was expected.
  const SIDES = ["Yea", "Nay", "No side", "Did not vote", "Present"];
  let rows = 0;
  for (const x of WITH) {
    const cells = String(drawer(x.pid, x.key)).match(/class="pdxlg-v pdxlg-v-[yno]">[^<]*</g) || [];
    eq(cells.length, x.t.acts, `${key(x)}: ${cells.length} side cell(s) for ${x.t.acts} act(s)`);
    for (const c of cells) {
      const word = c.replace(/.*>/, "").replace(/<$/, "").trim();
      rows++;
      ok(SIDES.indexOf(word) !== -1, `${key(x)}: a row's side reads ${JSON.stringify(word)}`);
      ok(word.length > 2, `${key(x)}: a row's side is abbreviated to ${JSON.stringify(word)}`);
    }
  }
  // A row with no side is counted as one: it is in the act total and in neither
  // the for nor the against column, which is what "took no side" says out loud.
  const noneSide = WITH.reduce((n, x) => n + x.t.noSide, 0);
  ok(noneSide > 0, "no act in the archive is recorded without a side — the third column is untested");
  console.log(`      ${rows} act row(s) carry a side in words · ${noneSide} recorded without one`);

  // THE KIND IS THE CLERK'S WORD OR NOTHING. An act this renderer does not
  // recognise prints verbatim and is flagged unknown; it is never labelled a
  // guess, and no amendment text is invented for it.
  const unknown = CS.dossierActKind({ item: { action: "On Agreeing to the Conference Report" } });
  eq(unknown.word, "On Agreeing to the Conference Report", "an unrecognised act did not print the clerk's words");
  eq(unknown.known, false, "an unrecognised act was reported as a known kind");
  eq(CS.dossierActKind({ item: {} }).known, false, "an act with no text was reported as a known kind");
  eq(CS.dossierActKind({ item: {} }).word, "", "an act with no text invented a label");
  // Recommit is read off the clerk's text, because actionType is 'passage' on
  // one member's recommit and 'motion' on another's.
  eq(CS.dossierActKind({ item: { actionType: "passage", action: "On Motion to Recommit with Instructions" } }).word,
    "Recommit", "a motion to recommit filed as a passage vote was labelled passage");
  eq(CS.dossierActKind({ item: { actionType: "amendment" } }).group, "change", "an amendment is not grouped as an attempt to change");
  eq(CS.dossierActKind({ item: { actionType: "passage" } }).group, "result", "passage is not grouped as the result");
  eq(CS.dossierActVote({ item: { position: "yea" } }).word, "Yea", "a yea is not spelled Yea");
  eq(CS.dossierActVote({ item: { position: "nay" } }).word, "Nay", "a nay is not spelled Nay");

  // Every kind printed in the archive is either a recognised label or text the
  // clerk supplied — never an empty cell.
  const kinds = new Set();
  for (const x of WITH) {
    for (const c of String(drawer(x.pid, x.key)).match(/class="pdxlg-k">[^<]*</g) || []) {
      kinds.add(c.replace(/.*>/, "").replace(/<$/, "").trim());
    }
  }
  ok(!kinds.has(""), "an act row printed an empty kind cell");
  console.log(`      kinds in the archive: ${[...kinds].sort().join(", ")}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · one finding, and every percentage behind one disclosure");
// ═════════════════════════════════════════════════════════════════════════════
{
  const METHOD = [
    "How Direction Match weights",
    "pattern is not established",
    "never merged into the formal figure",
    "Where this lands in the score",
  ];
  let seen = 0;
  for (const x of WITH) {
    const h = drawer(x.pid, x.key);
    const where = key(x);
    const l = lede(h), f = folded(h);
    // Exactly one disclosure, and exactly one finding line above it.
    eq((h.match(/class="pdxgap-how"/g) || []).length, 1, `${where}: not exactly one scoring disclosure`);
    eq((h.match(/class="pdxlg-find"/g) || []).length, 1, `${where}: not exactly one finding line`);
    has(l, 'class="pdxlg-find"', `${where}: the finding line is not in the first screenful`);
    has(f, '<summary><span aria-hidden="true">⚖️</span> How this is scored', `${where}: the disclosure has no fixed label`);
    // NOT THREE HEADLINE VERDICTS AT ONCE. No SCORE above the fold: no percent
    // hero, no bucket chip, and no figure in the finding or in either tally line.
    // A percentage inside a measure's own description is a fact about the statute
    // — "a 15% minimum tax on adjusted financial statement income" — and stays.
    no(l, "pdxgap-relpct", `${where}: the percent hero is above the fold`);
    no(l, "pdxdos-bucket", `${where}: a second verdict chip is above the fold`);
    no(l, "pdxgap-rel-hero", `${where}: the score hero is above the fold`);
    for (const cls of ["pdxlg-find", "pdxlg-tally", "pdxlg-side", "pdxlg-same"]) {
      const re = new RegExp('class="' + cls + '[^"]*"[^>]*>([\\s\\S]*?)</div>', "g");
      let mm;
      while ((mm = re.exec(l))) {
        ok(!/\d\s*%/.test(text(mm[1])), `${where}: .${cls} leads with a percentage`);
      }
    }
    // And the method is inside, not merely absent.
    for (const m of METHOD) {
      if (!h.includes(m)) continue;
      seen++;
      no(l, m, `${where}: method copy ${JSON.stringify(m)} is in the first screenful`);
      has(f, m, `${where}: method copy ${JSON.stringify(m)} left the disclosure`);
    }
    // Nothing was deleted to get there: the hero, the bucket line and the depth
    // note are all still rendered, in order, inside the fold.
    if (h.includes("pdxgap-rel-hero")) {
      ok(f.indexOf("pdxdos-bucket") === -1 || f.indexOf("pdxdos-bucket") < f.indexOf("pdxgap-meta"),
        `${where}: the bucket line and the meta strip changed order inside the fold`);
    }
    // The ledger is above the fold, with the table and the identity strip.
    has(l, 'class="pdxlg-tally"', `${where}: the tally is not above the fold`);
    has(l, "pdxgap-id", `${where}: the identity strip left the first screenful`);
    // WHAT THEY SAID IS BESIDE THE ACTS, NEVER INSIDE THEM.
    if (h.includes("pdxlg-said")) {
      ok(h.indexOf("pdxlg-said") > h.indexOf("pdxlg-tally"), `${where}: the said block is above the tally`);
      ok(h.indexOf("pdxlg-said") < h.indexOf('class="pdxgap-how"'), `${where}: the said block was folded away`);
      no(table(h), "pdxlg-said", `${where}: a statement is inside the vote table`);
    }
    // One said block, not two: the summary panel's copy is suppressed when the
    // ledger prints its own.
    eq((h.match(/class="pdxdos-said"/g) || []).length, 0, `${where}: the old said line is printed a second time`);
  }
  console.log(`      ${WITH.length} drawers lead with one finding · ${seen} folded method sentence(s) checked`);

  // A statement-only measure must not look like a vote. Massie's Born-Alive
  // stance (H.R. 21) sits on pro_life beside three roll calls on other statutes.
  const ph = drawer("massie", "pro_life");
  has(text(ph), "Born-Alive", "massie × pro_life: the stance is gone");
  no(table(ph), "H.R. 21", "massie × pro_life: a statement is in the vote table as a vote");
  has(text(folded(ph)) + text(lede(ph)), "They said", "massie × pro_life: the said block has no label");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · a drawer with no roll call renders exactly as it did before");
// ═════════════════════════════════════════════════════════════════════════════
{
  const A = boot(HEAD);
  must(A.PDXConsistency && typeof A.PDXConsistency.gapViewHtml === "function", "HEAD's consistency.js did not boot");
  let same = 0;
  const drift = [];
  for (const x of WITHOUT) {
    let before = "";
    try { before = A.PDXConsistency.gapViewHtml(x.pid, x.key) || ""; } catch { continue; }
    if (before === drawer(x.pid, x.key)) same++; else drift.push(key(x));
  }
  eq(drift.slice(0, 6).join(" | "), "", `${drift.length} roll-call-free drawer(s) changed shape`);
  console.log(`      ${same} drawer(s) with no formal act are byte-identical to HEAD`);
  // And no ledger furniture was drawn over rows that have no side.
  for (const x of WITHOUT) {
    no(drawer(x.pid, x.key), "pdxlg-t", `${key(x)}: a vote table was drawn with no votes to put in it`);
    no(drawer(x.pid, x.key), "pdxgap-how", `${key(x)}: a scoring disclosure appeared on a drawer that was not reshaped`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section("8 · nothing scored moved");
  // ═══════════════════════════════════════════════════════════════════════════
  const B = win;
  const scopes = Object.keys(B.PDXConsistency.SCOPES);
  must(scopes.length > 0, "PDXConsistency.SCOPES is empty");
  const moved = [];
  let swept = 0;
  for (const [pid] of corpus.byMember) {
    swept++;
    for (const sc of scopes) {
      if (JSON.stringify(A.PDXConsistency.scopedOverall(sc, pid)) !==
          JSON.stringify(B.PDXConsistency.scopedOverall(sc, pid))) moved.push(`${pid}/${sc}`);
    }
    if (JSON.stringify(A.PDXWordAction.read(pid)) !== JSON.stringify(B.PDXWordAction.read(pid))) moved.push(`${pid}/ledger`);
  }
  ok(swept > 300, `the twin boot only swept ${swept} files`);
  eq(moved.slice(0, 8).join(" | "), "", `${moved.length} tier / Direction Match read(s) moved — this pass reshapes a drawer and must move none`);

  const rdrift = [];
  for (const x of ALL) {
    if (JSON.stringify(A.PDXConsistency.dossierRead(x.pid, x.key)) !==
        JSON.stringify(B.PDXConsistency.dossierRead(x.pid, x.key))) rdrift.push(key(x));
    if (JSON.stringify(A.PDXConsistency.issueRow(x.pid, x.key).verdict) !==
        JSON.stringify(B.PDXConsistency.issueRow(x.pid, x.key).verdict)) rdrift.push(key(x) + "/verdict");
  }
  eq(rdrift.slice(0, 6).join(" | "), "", `${rdrift.length} dossier read(s) or verdict(s) moved`);

  // THE FIGURE ITSELF. Folded is not changed: the score the drawer prints is the
  // number HEAD printed, to the digit, on every drawer in the archive.
  //
  // Only SCORE percentages are compared. A statute's own percentages move around
  // freely and legitimately — the ledger's why sentence repeats "a 15% minimum
  // tax" that the enumeration below already carried, so a raw count of "%" in the
  // markup rises on 562 drawers without a single score changing.
  const score = (h) => {
    const out = [];
    const re = /class="pdxgap-relpct[^"]*"[^>]*>([\s\S]*?)<\/span>|class="pdxdos-bucket[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
    let m;
    while ((m = re.exec(String(h)))) out.push(text(m[1] || m[2] || ""));
    return out.join(" | ");
  };
  const pdrift = [];
  for (const x of ALL) {
    let before = "";
    try { before = A.PDXConsistency.gapViewHtml(x.pid, x.key) || ""; } catch { continue; }
    const now = drawer(x.pid, x.key);
    if (score(before) !== score(now)) pdrift.push(`${key(x)} ${score(before)} → ${score(now)}`);
    const v = B.PDXConsistency.issueRow(x.pid, x.key).verdict || {};
    if (v.score != null && score(now).indexOf(String(v.score) + "%") === -1 && now.indexOf("pdxgap-relpct") !== -1) {
      pdrift.push(`${key(x)}: the printed figure is not the row's own score (${v.score}%)`);
    }
  }
  eq(pdrift.slice(0, 4).join(" | "), "", `${pdrift.length} drawer(s) print a different score than HEAD`);
  console.log(`      ${ALL.length} drawers print HEAD's score, unchanged and unmoved`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · the pass stayed in its lane");
// ═════════════════════════════════════════════════════════════════════════════
{
  const CSJ = R("consistency.js");
  // Every class the new markup uses has a rule, or the table ships unstyled.
  for (const c of [
    "pdxlg", "pdxlg-find", "pdxlg-find-q", "pdxlg-tally", "pdxlg-side", "pdxlg-same",
    "pdxlg-why-one", "pdxlg-g", "pdxlg-gh", "pdxlg-t", "pdxlg-d", "pdxlg-num", "pdxlg-k",
    "pdxlg-v", "pdxlg-v-y", "pdxlg-v-n", "pdxlg-v-o", "pdxlg-chips", "pdxlg-chip",
    "pdxlg-chip-p", "pdxlg-whyr", "pdxlg-why", "pdxlg-said", "pdxlg-said-k",
    "pdxlg-said-v", "pdxlg-said-src", "pdxgap-how", "pdxgap-how-b",
  ]) {
    ok(new RegExp("'\\." + c.replace(/-/g, "\\-") + "[{ >,:]").test(CSJ) ||
       new RegExp("\\." + c.replace(/-/g, "\\-") + "\\{").test(CSJ),
      `.${c} is used by the ledger and has no CSS rule`);
  }
  // No second product and no new score word: the finding reuses the buckets.
  no(CSJ, "combinedScore", "a combined score appeared in the drawer");
  no(CSJ, "overallConsistency", "an overall-consistency figure appeared in the drawer");

  // NO EQUITY COPY. The drawer is a voting record; none of the ownership
  // vocabulary belongs anywhere near it.
  const EQUITY = /Reg CF|equity stake|share class|membership unit|founder share|cap table/i;
  for (const x of WITH.slice(0, 400)) {
    ok(!EQUITY.test(drawer(x.pid, x.key)), `${key(x)}: equity vocabulary in an issue drawer`);
  }

  // The other lanes are untouched, by the strongest test available: the file is
  // what HEAD says it is.
  //
  // AND IT ASKS THAT OF WHICHEVER FILES HEAD MAKES THE QUESTION MEANINGFUL FOR.
  // "Byte-identical to HEAD" was the right claim on the day this pass was
  // written and it stops being a claim about THIS pass the moment the pass is
  // committed: from then on HEAD carries the drawer, and any later pass editing
  // the shared shell fails a pin that was only ever about the drawer's own diff.
  // A gate that can pass exactly once, in the tree of its author, reports its
  // own obsolescence forever after — indistinguishable from the regression it
  // was meant to catch. So the shell files come off the list once HEAD already
  // carries this pass (detected by its own changelog line, below): the drawer's
  // scoring surface is still pinned by sections 7 and 8, which compare DERIVED
  // figures and stay meaningful for every pass after this one.
  const LANDED = /issue drawer leads with bills\/acts table/i.test(HEAD("sw.js") || "");
  const LANE_FILES = LANDED
    ? ["money.html", "money-room.js", "pdx-finance.js", "finance-lane.js",
       "stance-helpers.js", "voting-record.js", "word-action.js"]
    : ["index.html", "voice.html", "voter-hub-location.js", "money.html", "money-room.js",
       "pdx-finance.js", "finance-lane.js", "stance-helpers.js", "voting-record.js", "word-action.js"];
  for (const f of LANE_FILES) {
    const head = HEAD(f);
    if (head === null) continue;
    ok(head === R(f), `${f} changed — this pass reshapes one drawer and must touch nothing else`);
  }

  // The shell the new markup ships inside is versioned, exactly one step, with a
  // log entry a reader of sw.js can follow.
  const SW = R("sw.js"), SWH = HEAD("sw.js");
  const m = /const CACHE_VERSION = 'v(\d+)';/.exec(SW);
  must(m, "CACHE_VERSION is not in sw.js in the form this file reads");
  if (SWH) {
    const pm = /const CACHE_VERSION = 'v(\d+)';/.exec(SWH);
    // Exactly one bump while this pass is the working tree's own; once it has
    // landed, a later pass owns the newest version and the claim that still has
    // teeth is that the version only ever goes UP and this pass's entry is still
    // in the log where a reader of sw.js can find it.
    if (pm && !LANDED) eq(Number(m[1]), Number(pm[1]) + 1, `CACHE_VERSION moved from v${pm[1]} to v${m[1]} — this pass bumps exactly one version`);
    if (pm && LANDED) ok(Number(m[1]) >= Number(pm[1]), `CACHE_VERSION went backwards, v${pm[1]} to v${m[1]}`);
  }
  has(SW, `// v${m[1]} - `, `sw.js has no prose log entry for v${m[1]}`);
  const entry = SW.slice(SW.indexOf(`// v${m[1]} - `), SW.indexOf("const CACHE_VERSION"));
  // Where to look for this pass's own line: its own entry while the pass is the
  // newest one, anywhere in the log once a later pass has taken that slot. The
  // line must still be THERE either way — an entry deleted from the log is a
  // reader of sw.js who can no longer find out why the drawer has a table.
  const lineIn = LANDED ? SW : entry;
  ok(/issue drawer leads with bills\/acts table; scores unchanged\./i.test(lineIn.replace(/\/\/\s+/g, " ").replace(/\s+/g, " ")),
    LANDED ? "the sw.js log no longer carries this pass's changelog line"
           : "the v" + m[1] + " log entry does not carry this pass's changelog line");
  ok(entry.split("\n").length <= 48, `the v${m[1]} log entry runs ${entry.split("\n").length} lines, over the 48-line budget`);
  has(SW, "'/consistency.js'", "consistency.js is not precached, so the new drawer can arrive against an old shell");
}

// ── verdict ──────────────────────────────────────────────────────────────────
console.log("");
if (fails.length) {
  for (const f of fails.slice(0, 40)) console.error("  ✗ " + f);
  if (fails.length > 40) console.error(`  … and ${fails.length - 40} more`);
  console.error(`\n✗ issue ledger: ${fails.length} failure(s), ${pass} passed`);
  process.exit(1);
}
console.log(
  `✓ issue ledger: all ${pass} assertions passed — ` +
  `${WITH.length} drawers lead with bills and acts, ${WITHOUT.length} unchanged, no score moved`
);
