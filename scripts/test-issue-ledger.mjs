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
//  10. THE VOTE, NOT HOW WE CODED IT. No curator rationale under a row or on
//      the first screen; it lives behind the disclosure, labelled as method.
//  11. NO LOCAL BILL PAGE, A REAL LINK. Without the bill panel a federal measure
//      links out to Congress.gov, marked as leaving; with it, it stays in-site.
//  12. ONE EFFECT LINE PER ROW. What the act did to THIS issue, from the store,
//      one sentence of at most 140 characters, or nothing — never a title, never
//      method, never a sibling issue's line.
//  13. RED TAPE SCANS. Lee's six Cut Federal Red Tape acts each carry their
//      own line — which rule it struck, and that it barred a like one — and
//      H.J.Res. 131's is not its lands line.
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
import { deOrigin } from "./v103-chrome-seams.mjs";
import { measureAddresses } from "./vr-measure-addresses.mjs";

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
// Iran joined the other two country keys when its drawer took the second-term
// instruments; all three are in _RD_NO_POLE and _DOS_LEDGER_NO_SIDE.
const NO_SIDE_KEYS = new Set(["iran_policy", "ukraine_policy", "yemen_policy"]);
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
    // A country subject (Ukraine, Yemen) prints no for/against line at all.
    if (NO_SIDE_KEYS.has(x.key)) ok(!/pdxlg-side|Acts: \d+ for/.test(l), `${where}: a subject drawer prints a for/against line`);
    else has(l, `Acts: ${t.advances} for · ${t.opposes} against`, `${where}: the for/against line does not match the engine`);
    if (t.noSide > 0 && !NO_SIDE_KEYS.has(x.key)) has(l, `· ${t.noSide} took no side`, `${where}: ${t.noSide} act(s) with no side are counted nowhere`);
    // The three buckets have to add up to the act count, or a row is missing.
    eq(t.advances + t.opposes + t.noSide, t.acts, `${where}: the sides do not add up to the acts`);
    // One row per act, not per essay.
    const rows = (table(h).match(/data-pdxlg-row="/g) || []).length;
    eq(rows, t.acts, `${where}: ${rows} table row(s) for ${t.acts} act(s)`);
    // And the count is the formal acts only — roll calls and executive documents
    // (a veto, an order, a proclamation; see test-exec-ledger-doors.mjs). A stated
    // position or a migrated formal account is not a row and must not be in here.
    const items = CS.dossierItems(x.pid, x.key, x.r && x.r.ov) || [];
    const recs = items.filter((d) => d && !d.held && (d.lane === "record" || d.lane === "exec")).length;
    eq(t.acts, recs, `${where}: the tally counts ${t.acts} acts against ${recs} record- and exec-lane items`);
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
  // The number is the same door the rest of the site uses. This harness boots
  // without the bill panel, so the door is the outbound form — Congress.gov's own
  // page for the 119th's H.R. 22 (section 11 pins the in-site form).
  has(tb, 'class="pdxlg-num pdxbill-door pdxbill-ext"', "massie × voter_id: the bill number is not a bill door");
  has(tb, 'href="https://www.congress.gov/bill/119th-congress/house-bill/22"', "massie × voter_id: the door does not reach the bill");
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

  // And one live case where the two acts genuinely went opposite ways. The key is
  // a subject (_RD_NO_POLE), so the eyebrow publishes no side for either of them.
  const pt = CS.dossierTally("chellie_pingree", "guard_authority", CS.issueRow("chellie_pingree", "guard_authority").ov);
  if (pt.acts === 2 && pt.advances > 0 && pt.opposes > 0) {
    const f = CS.dossierFinding(CS.issueRow("chellie_pingree", "guard_authority"), pt);
    eq(f.word, "No side published on this subject", "pingree × guard_authority: a subject key read for a side");
    eq(f.q, "", "pingree × guard_authority: a subject key carries a both-ways qualifier");
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
  // An executive row's cell is the act, not a ballot: Vetoed, Signed or Issued.
  const SIDES = ["Yea", "Nay", "No side", "Did not vote", "Present", "Vetoed", "Signed", "Issued"];
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
  const sansFace = (h) => String(h).replace(/<span class="pdxgap-face(?: pdxgap-face-ph)?"([^>]*) aria-hidden="true">(?:<img [^>]*><\/span>|<\/span>)/g, '<span class="pdxgap-face"$1 aria-hidden="true">FACE</span>');
  const A = boot(HEAD);
  must(A.PDXConsistency && typeof A.PDXConsistency.gapViewHtml === "function", "HEAD's consistency.js did not boot");
  let same = 0;
  const drift = [];
  for (const x of WITHOUT) {
    let before = "";
    try { before = A.PDXConsistency.gapViewHtml(x.pid, x.key) || ""; } catch { continue; }
    // THE FACE IS THE ROSTER FIELD NOW (v294): a drawer that drew the
    // placeholder because this harness has no _getPhotoUrl draws the person's
    // portrait off their roster row instead. That one element is folded to a
    // token on both sides; every other byte of the drawer is still compared.
    if (sansFace(before) === sansFace(drawer(x.pid, x.key))) same++; else drift.push(key(x));
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
    // A key HEAD's vocabulary does not carry (a country leaf added since) has no
    // HEAD read to compare against; its no-pole contract is pinned by its own test.
    if (!(A.ISSUE_MAP || {})[x.key]) continue;
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
    "pdxlg-g", "pdxlg-gh", "pdxlg-t", "pdxlg-d", "pdxlg-num", "pdxlg-k",
    "pdxlg-v", "pdxlg-v-y", "pdxlg-v-n", "pdxlg-v-o", "pdxlg-chips", "pdxlg-chip",
    "pdxlg-chip-p", "pdxlg-meth", "pdxlg-meth-k", "pdxlg-meth-l", "pdxlg-said", "pdxlg-said-k",
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
  // The public hostname is normalised out first. "Must touch nothing else" is about
  // THIS DRAWER'S markup and scoring reaching into a file it has no business in — not
  // about the origin those files print a share link on. Collapsing the site onto one
  // origin rewrote that host in money.html and read here as a drawer edit; every other
  // byte of every lane file is still pinned to HEAD exactly. deOrigin lives in
  // scripts/v103-chrome-seams.mjs, shared with every wave harness asking the same thing.
  for (const f of LANE_FILES) {
    const head = HEAD(f);
    if (head === null) continue;
    // A subject key joining _RD_NO_POLE is a vocabulary change, not a drawer edit:
    // that one table is read out of both sides before stance-helpers.js is compared.
    const np = (t) => f === "stance-helpers.js" ? t.replace(/var _RD_NO_POLE = \{[\s\S]*?\n    \};/, "") : t;
    ok(np(deOrigin(head)) === np(deOrigin(R(f))), `${f} changed — this pass reshapes one drawer and must touch nothing else`);
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


// ═════════════════════════════════════════════════════════════════════════════
section("10 · the vote, not how we coded it — Lee × Protect Public Lands");
// ═════════════════════════════════════════════════════════════════════════════
// The effect lines under a drawer's rows, as plain text, and what is wrong with
// one if anything. Shared by sections 10 and 12 so a mutation in either is caught
// by the same rule.
const effectLines = (h) =>
  [...String(h).matchAll(/<td colspan="5" class="pdxlg-eff" data-pdxlg-eff="1">([\s\S]*?)<\/td>/g)].map((m) => text(m[1]));
const EFFECT_METHOD = /\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary (?:carries|has) no|coded|chip|mapped|filed as|weighted)\b/i;
const effectFault = (e) => {
  if (!e) return "is empty";
  if (e.length > 140) return `runs ${e.length} characters`;
  if (!/[.!?]$/.test(e)) return "is not a finished sentence";
  if (/[.!?]\s+["\u201c(]?[A-Z0-9]/.test(e.replace(/\bU\.S\./g, "US"))) return "is more than one sentence";
  if (EFFECT_METHOD.test(e)) return "carries method vocabulary";
  return "";
};
{
  // The curator's words for how a row was coded. None of them is a fact about
  // the vote, and none may sit on the first screen of a drawer that has one.
  const VOCAB = ["precedent", "mirror", "discriminator", "vocabulary carries no", "primary row"];
  // Everything wrong with a drawer's first screen, as a list, so the same check
  // can be run against a mutated renderer and be seen to fail there.
  const leaks = (h, t) => {
    const out = [];
    const l = lede(h), tb = table(h);
    for (const cls of ["pdxlg-why", "pdxlg-whyr", "pdxlg-why-one"]) {
      if (new RegExp('class="' + cls + '"').test(l)) out.push(`.${cls} is on the first screen`);
    }
    // Every table body row is an act row or that act's effect line. Anything
    // else under a vote is prose.
    const trs = (tb.match(/<tbody>[\s\S]*?<\/tbody>/g) || []).join("").match(/<tr[\s>]/g) || [];
    const acts = (tb.match(/data-pdxlg-row="/g) || []).length;
    const effs = (tb.match(/<tr class="pdxlg-effr" data-pdxlg-effr="/g) || []).length;
    if (trs.length !== acts + effs) out.push(`${trs.length - acts - effs} non-act row(s) in the vote table`);
    // And an effect line is an effect, not method: one sentence, 140 characters
    // at most, none of the coding vocabulary.
    for (const e of effectLines(tb)) {
      const why = effectFault(e);
      if (why) out.push(`effect line ${why}: ${JSON.stringify(e.slice(0, 60))}`);
    }
    // And no curated rationale is in the first screen at all.
    for (const p of (t && t.rows) || []) {
      const d = p.d || {};
      if (!String(d.rationale || "").trim() || !p.why) continue;
      const esc = p.why.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
      if (l.includes(esc) || text(l).includes(p.why)) out.push(`method note for ${d.ident} is on the first screen`);
    }
    return out;
  };

  const r = CS.issueRow("lee", "lands_preserve");
  const t = CS.dossierTally("lee", "lands_preserve", r.ov);
  const h = drawer("lee", "lands_preserve");
  must(h.length > 2000, "lee × lands_preserve rendered nothing");
  const l = text(lede(h)), tb = text(table(h));
  eq(t.bills, 2, "lee × lands_preserve: not 2 measures");
  eq(t.acts, 2, "lee × lands_preserve: not 2 acts");
  eq(`${t.advances} for · ${t.opposes} against`, "0 for · 2 against", "lee × lands_preserve: the sides moved");
  has(l, "On this issue: 2 measures · 2 formal acts", "lee × lands_preserve: the tally line");
  has(l, "Acts: 0 for · 2 against", "lee × lands_preserve: the for/against line");
  has(l, "Too thin to call a pattern", "lee × lands_preserve: no longer read as thin");
  // THE CLERK'S WORD STAYS THE CLERK'S. Yea on a CRA that undoes a withdrawal is
  // against this chip, and the table says Yea — the direction lives in the tally.
  has(tb, "2025-12-04 H.J.Res. 131 Passage Yea", "lee × lands_preserve: the H.J.Res. 131 row");
  has(tb, "2026-04-16 H.J.Res. 140 Passage Yea", "lee × lands_preserve: the H.J.Res. 140 row");
  no(tb, "Nay", "lee × lands_preserve: a Yea was rewritten as Nay");
  eq((table(h).match(/class="pdxlg-v pdxlg-v-y">Yea</g) || []).length, 2, "lee × lands_preserve: not two Yea cells");
  eq((table(h).match(/class="pdxlg-k">Passage</g) || []).length, 2, "lee × lands_preserve: not two Passage kinds");
  for (const n of ["131", "140"]) {
    has(table(h), `href="https://www.congress.gov/bill/119th-congress/house-joint-resolution/${n}"`,
      `lee × lands_preserve: H.J.Res. ${n} no longer links to the bill`);
  }
  // No method vocabulary anywhere in the drawer's first screen.
  for (const v of VOCAB) no(l.toLowerCase(), v, `lee × lands_preserve: method vocabulary on the first screen`);
  eq(leaks(h, t).join(" | "), "", "lee × lands_preserve: method prose under a vote");
  // The notes still exist, behind the disclosure, labelled as method.
  const f = folded(h);
  has(f, 'data-pdxlg-meth="1"', "lee × lands_preserve: the method notes left the disclosure");
  has(text(f), "Method notes · how these rows were coded, not what the vote was", "lee × lands_preserve: the method notes are unlabelled");
  has(text(f), "H.J.Res. 78 precedent", "lee × lands_preserve: the H.J.Res. 131 note was deleted rather than folded");
  // C DID NOT SHIP: there is no sourced non-roll-call event record to hang the
  // withdrawn land-sale rider on, so no event block is drawn anywhere.
  no(h, "Not a roll call", "lee × lands_preserve: an event block appeared with no event record behind it");
  no(h.toLowerCase(), "does not change the 0-for", "lee × lands_preserve: event copy appeared");

  // Every drawer in the archive, same rule.
  let clean = 0;
  for (const x of WITH) {
    const e = leaks(drawer(x.pid, x.key), x.t);
    if (e.length) fails.push(`${key(x)}: ${e[0]}`); else clean++;
  }
  eq(clean, WITH.length, `${WITH.length - clean} drawer(s) print method prose under a vote`);
  console.log(`      ${clean} drawers carry no method prose on their first screen`);

  // THE CHECK HAS TEETH. Put the old rationale row back under each vote and the
  // same check must catch it on the fixture.
  const src = R("consistency.js");
  const seam = "'<td>' + _dosActChips(d, issueKey) + '</td>' +\n          '</tr>';";
  must(src.includes(seam), "the ledger row seam this mutation needs has moved");
  const mutated = src.replace(seam,
    "'<td>' + _dosActChips(d, issueKey) + '</td>' +\n          '</tr>' +" +
    " (p.why ? '<tr class=\"pdxlg-whyr\"><td></td><td colspan=\"4\" class=\"pdxlg-why\">' + esc(p.why) + '</td></tr>' : '');");
  const M = boot((fl) => (fl === "consistency.js" ? mutated : R(fl)));
  const MCS = M.PDXConsistency;
  must(MCS && typeof MCS.gapViewHtml === "function", "the mutated renderer did not boot");
  const mh = MCS.gapViewHtml("lee", "lands_preserve");
  const mt = MCS.dossierTally("lee", "lands_preserve", MCS.issueRow("lee", "lands_preserve").ov);
  ok(leaks(mh, mt).length > 0, "a renderer that prints method text under a row passed the leak check");
  ok(VOCAB.some((v) => text(lede(mh)).toLowerCase().includes(v)), "the mutation did not surface the method vocabulary it should have");
}


// ═════════════════════════════════════════════════════════════════════════════
section("11 · no bill page here, so the measure links to Congress.gov");
// ═════════════════════════════════════════════════════════════════════════════
{
  const anchor = (h, n) => {
    const re = new RegExp('<a class="pdxlg-num[^"]*"[^>]*>' + n.replace(/\./g, "\\.") + '</a>');
    return (re.exec(String(h)) || [""])[0];
  };
  // Lee × Protect Public Lands, on a page without the bill panel: both measures
  // are real outbound links, marked as leaving the site, and neither is the dead
  // "No bill page on file" door.
  const h = drawer("lee", "lands_preserve");
  for (const [n, num] of [["H.J.Res. 131", 131], ["H.J.Res. 140", 140]]) {
    const a = anchor(table(h), n);
    ok(a, `lee × lands_preserve: ${n} is not an anchor`);
    has(a, `href="https://www.congress.gov/bill/119th-congress/house-joint-resolution/${num}"`, `lee: ${n} does not point at Congress.gov`);
    has(a, 'target="_blank"', `lee: ${n} does not open in a new tab`);
    has(a, 'rel="noopener noreferrer"', `lee: ${n} carries no rel`);
    has(a, "leaves PolitiDex", `lee: ${n} does not say it leaves the site`);
    no(a, "data-pdxbill-open", `lee: ${n} is still wired to the missing bill panel`);
  }
  no(h, "No bill page on file", "lee × lands_preserve: the dead door is still printed");
  // Method vocabulary is still off the first screen after the doors changed.
  for (const v of ["precedent", "mirror", "discriminator", "vocabulary carries no", "primary row"]) {
    no(text(lede(h)).toLowerCase(), v, `lee × lands_preserve: method vocabulary "${v}" returned to the first screen`);
  }

  // Every outbound door in the archive is a Congress.gov bill or amendment page
  // for a numeric congress — never a local address and never a state bill.
  let ext = 0;
  const CG = /^https:\/\/www\.congress\.gov\/(bill|amendment)\/\d+(st|nd|rd|th)-congress\/[a-z-]+\/\d+$/;
  for (const x of WITH) {
    for (const m of String(drawer(x.pid, x.key)).matchAll(/<a class="[^"]*pdxbill-ext"[^>]*href="([^"]*)"/g)) {
      ext++;
      ok(CG.test(m[1]), `${key(x)}: an outbound bill door points at ${m[1]}`);
    }
    no(drawer(x.pid, x.key), 'href="/bill/', `${key(x)}: a local /bill/ address was minted`);
  }
  ok(ext > 1000, `only ${ext} outbound bill doors across the archive`);
  console.log(`      ${ext} outbound Congress.gov door(s) · all of them congress.gov/bill|amendment`);

  // The URL builder, pinned on the shapes it must and must not read.
  const U = CS.congressGovUrl;
  must(typeof U === "function", "the Congress.gov address builder is not exported");
  eq(U("H.J.Res. 131", "119"), "https://www.congress.gov/bill/119th-congress/house-joint-resolution/131", "H.J.Res. 131");
  eq(U("S. 5", "118"), "https://www.congress.gov/bill/118th-congress/senate-bill/5", "S. 5");
  eq(U("H.R. 8595", "118"), "https://www.congress.gov/bill/118th-congress/house-bill/8595", "H.R. 8595");
  eq(U("S.J.Res. 11", "101"), "https://www.congress.gov/bill/101st-congress/senate-joint-resolution/11", "101st ordinal");
  eq(U("H.Amdt. 243", "119"), "https://www.congress.gov/amendment/119th-congress/house-amendment/243", "H.Amdt.");
  eq(U("H.B. 257", "2024GS"), "", "a Utah bill got a Congress.gov address");
  eq(U("S.B. 1", "119"), "", "a state-shaped number got a Congress.gov address");
  eq(U("H.R. 1", ""), "", "a measure with no congress got a Congress.gov address");
  eq(U("Recorded vote", "119"), "", "an unnumbered identity got a Congress.gov address");

  // WITH THE PANEL ON THE PAGE the same measure keeps its in-site door: a button
  // onto the bill file, no href, nothing leaving the site.
  const P = boot(R);
  P.PDXBillDetail = { open: () => true };
  const ph = P.PDXConsistency.gapViewHtml("lee", "lands_preserve") || "";
  has(table(ph), 'class="pdxlg-num pdxbill-door" data-pdxbill-open data-pdxbill-num="H.J.Res. 131"',
    "with the panel on the page, H.J.Res. 131 no longer opens the local bill file");
  has(table(ph), 'data-pdxbill-num="H.J.Res. 140"', "with the panel on the page, H.J.Res. 140 no longer opens the local bill file");
  no(table(ph), "congress.gov", "with the panel on the page, a measure left the site anyway");
  no(table(ph), "pdxbill-ext", "with the panel on the page, a door was marked outbound");

  // And no route was added for a bill document that does not exist.
  const TOML = R("netlify.toml");
  ok(!/from\s*=\s*"\/bill/.test(TOML), "netlify.toml gained a /bill/ rewrite");
  eq((TOML.match(/from\s*=\s*"\/b\//g) || []).length, ((HEAD("netlify.toml") || TOML).match(/from\s*=\s*"\/b\//g) || []).length,
    "the /b/ bill rewrites changed");
}

// ═════════════════════════════════════════════════════════════════════════════
section("12 · one effect line per vote row, scoped to this issue");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The curated table the line is read from, lifted out of the shipped source so
  // this file checks the renderer against the store rather than against itself.
  const mechOf = (src) => {
    const a = src.indexOf("var _DOS_MECH = {");
    must(a !== -1, "_DOS_MECH is not in consistency.js in the form this file reads");
    const b = src.indexOf("\n  };", a);
    return vm.runInNewContext("(" + src.slice(a + "var _DOS_MECH = ".length, b + 4) + ")");
  };
  const MECH = mechOf(R("consistency.js"));
  const EFFECT = (() => {
    const src = R("consistency.js"), a = src.indexOf("var _DOS_EFFECT = {");
    must(a !== -1, "_DOS_EFFECT is not in consistency.js in the form this file reads");
    return vm.runInNewContext("(" + src.slice(a + "var _DOS_EFFECT = ".length, src.indexOf("\n  };", a) + 4) + ")");
  })();
  // What the store holds for one (measure, congress, issue), by the rule the
  // drawer states: its short effect line, else a `did` that is already one short
  // sentence, else nothing — and nothing at all where the pair has neither.
  const stored = (mk) => {
    const s = String(EFFECT[mk] || (MECH[mk] && MECH[mk].did) || "").replace(/\s+/g, " ").trim();
    return effectFault(s) ? "" : s;
  };
  // Every (measure, congress, issue) the archive maps, from the seed the corpus
  // joins on, plus every pair with a curated entry (which exists only for a
  // mapped pair). A short line may only be written for one of these.
  const MAPPED = new Set(Object.keys(MECH));
  for (const m of JSON.parse(R("db/vr-issue-seed.json")).measures) {
    for (const i of m.issues || []) MAPPED.add(`${String(m.number).replace(/\s+/g, " ").trim()}|${m.congress}|${i.issueKey}`);
  }
  // And the pairs only the applied migrations map — H.Amdt. 252 × Ukraine reaches
  // a drawer through the live record and not the shipped seed. Read through the
  // same projection of the migrations the bill documents are built from.
  for (const a of measureAddresses(ROOT).published) {
    for (const k of a.issues || []) MAPPED.add(`${a.number}|${a.sitting}|${k}`);
  }
  // The executive rows' own table, keyed by the stored documentId and the issue
  // (see _DOS_EXEC_EFFECT), and the pairs the exec seed maps — a line may only be
  // written for one of those, and only ever prints on its own row.
  const EXEC_EFFECT = (() => {
    const src = R("consistency.js"), a = src.indexOf("var _DOS_EXEC_EFFECT = {");
    must(a !== -1, "_DOS_EXEC_EFFECT is not in consistency.js in the form this file reads");
    return vm.runInNewContext("(" + src.slice(a + "var _DOS_EXEC_EFFECT = ".length, src.indexOf("\n  };", a) + 4) + ")");
  })();
  const EXEC_MAPPED = new Set();
  for (const list of Object.values(JSON.parse(R("db/exec-action-seed.json")).actions || {})) {
    for (const a of list) for (const i of a.issues || []) EXEC_MAPPED.add(`${a.documentId}|${i.issueKey}`);
  }
  for (const [xk, v] of Object.entries(EXEC_EFFECT)) {
    ok(EXEC_MAPPED.has(xk), `${xk}: an exec effect line is stored for a pair the exec seed does not map`);
    eq(effectFault(v), "", `${xk}: the stored exec effect line breaks the rule`);
  }
  const execStored = (xk) => {
    const s = String(EXEC_EFFECT[xk] || "").replace(/\s+/g, " ").trim();
    return effectFault(s) ? "" : s;
  };
  const expected = (p, k) => {
    const it = (p.d && p.d.item) || {};
    if (p.d && p.d.lane === "exec") return execStored(`${String(it.documentId || "").trim()}|${k}`);
    return stored(`${String(it.number || "").trim()}|${it.congress}|${k}`);
  };
  // Every short line is written for a pair that exists, and says what the act did.
  for (const [mk, v] of Object.entries(EFFECT)) {
    ok(MAPPED.has(mk), `${mk}: an effect line is stored for a pair the archive does not map`);
    eq(effectFault(v), "", `${mk}: the stored effect line breaks the rule`);
  }
  const rowsOf = (h) => {
    const out = new Map();
    for (const m of String(h).matchAll(/<tr class="pdxlg-effr" data-pdxlg-effr="(\d+)"><td colspan="5" class="pdxlg-eff" data-pdxlg-eff="1">([\s\S]*?)<\/td><\/tr>/g)) {
      out.set(Number(m[1]), text(m[2]));
    }
    return out;
  };
  // Everything wrong with one drawer's effect lines, as a list.
  const drift = (h, t, k) => {
    const out = [], got = rowsOf(table(h));
    for (const p of (t && t.rows) || []) {
      const want = expected(p, k), have = got.has(p.i) ? got.get(p.i) : "";
      const id = (p.d && p.d.ident) || "row " + p.i;
      if (want !== have) out.push(`${id}: printed ${JSON.stringify(have.slice(0, 50))}, the store holds ${JSON.stringify(want.slice(0, 50))}`);
      // Under its own row, never floating elsewhere in the table.
      if (have && !new RegExp(`data-pdxlg-row="${p.i}"[^]*?</tr><tr class="pdxlg-effr" data-pdxlg-effr="${p.i}"`).test(table(h))) {
        out.push(`${id}: the effect line is not directly under its row`);
      }
      const title = String((p.d && p.d.title) || "").trim();
      if (have && title && (have === title || have === title + ".")) out.push(`${id}: the bill title was printed as an effect`);
    }
    if (got.size > ((t && t.rows) || []).length) out.push(`${got.size} effect lines for ${t.rows.length} rows`);
    return out;
  };

  // LEE × PROTECT PUBLIC LANDS. Two rows, both Yea, both against the issue,
  // both with a line a hunter can read, both still leaving for Congress.gov.
  const r = CS.issueRow("lee", "lands_preserve");
  const t = CS.dossierTally("lee", "lands_preserve", r.ov);
  const h = drawer("lee", "lands_preserve");
  eq(`${t.acts} acts · ${t.advances} for · ${t.opposes} against`, "2 acts · 0 for · 2 against", "lee × lands_preserve: the tally moved");
  eq((table(h).match(/class="pdxlg-v pdxlg-v-y">Yea</g) || []).length, 2, "lee × lands_preserve: not two Yea cells");
  const lines = rowsOf(table(h));
  eq(lines.size, 2, "lee × lands_preserve: not one effect line per row");
  for (const p of t.rows) ok((lines.get(p.i) || "").length > 0, `lee × lands_preserve: ${p.d.ident} has no effect line`);
  const byId = Object.fromEntries(t.rows.map((p) => [p.d.ident, lines.get(p.i) || ""]));
  eq(byId["H.J.Res. 131"], "Removed the conservation withdrawal from roughly 1.2 million acres inside the Arctic National Wildlife Refuge.",
    "lee × lands_preserve: the H.J.Res. 131 effect line");
  eq(byId["H.J.Res. 140"], "Struck the order closing about 225,504 acres of Minnesota national forest above the Boundary Waters to mineral and geothermal leasing.",
    "lee × lands_preserve: the H.J.Res. 140 effect line");
  eq(drift(h, t, "lands_preserve").join(" | "), "", "lee × lands_preserve: effect lines disagree with the store");
  // The row still reads date · measure · kind · vote, and the line is below it.
  has(text(table(h)), "2025-12-04 H.J.Res. 131 Passage Yea", "lee × lands_preserve: the H.J.Res. 131 row");
  has(text(table(h)), "2026-04-16 H.J.Res. 140 Passage Yea", "lee × lands_preserve: the H.J.Res. 140 row");
  for (const n of ["131", "140"]) {
    has(table(h), `href="https://www.congress.gov/bill/119th-congress/house-joint-resolution/${n}"`, `lee: H.J.Res. ${n} stopped leaving for Congress.gov`);
  }
  const VOCAB = ["precedent", "mirror", "discriminator", "vocabulary carries no", "primary row"];
  for (const v of VOCAB) no(text(lede(h)).toLowerCase(), v, `lee × lands_preserve: method vocabulary "${v}" on the first screen`);
  // The effect is the act's, not ours.
  for (const e of lines.values()) {
    ok(!/\b(?:we|PolitiDex|this chip|coded|counts? against)\b/i.test(e), `lee × lands_preserve: the effect line is about the archive, not the act — ${e}`);
  }

  // EVERY DRAWER: the printed line is exactly what the store holds for that
  // measure on THAT issue, or nothing. A row with no stored line gets no extra
  // row at all, and no title stands in for one.
  let withLine = 0, without = 0;
  const lineKeys = new Map();
  for (const x of WITH) {
    const hx = drawer(x.pid, x.key), e = drift(hx, x.t, x.key);
    if (e.length) fails.push(`${key(x)}: ${e[0]}`);
    const got = rowsOf(table(hx));
    withLine += got.size; without += x.t.rows.length - got.size;
    for (const v of got.values()) {
      if (!lineKeys.has(v)) lineKeys.set(v, new Set());
      lineKeys.get(v).add(x.key);
    }
  }
  ok(withLine > 0 && without > 0, `the sweep saw ${withLine} row(s) with a line and ${without} without — both kinds must exist`);
  console.log(`      ${withLine} vote row(s) carry an effect line · ${without} carry none and print no extra row`);
  // The same sentence on two issues only where the store wrote it for both.
  for (const [v, ks] of lineKeys) {
    for (const k of ks) {
      ok([...MAPPED].some((mk) => mk.endsWith("|" + k) && stored(mk) === v) ||
        Object.keys(EXEC_EFFECT).some((xk) => xk.endsWith("|" + k) && execStored(xk) === v),
        `the effect line ${JSON.stringify(v.slice(0, 50))} is printed on ${k}, where nothing stores it`);
    }
  }
  // 131's lands line never reaches its red-tape or energy rows.
  eq([...(lineKeys.get(byId["H.J.Res. 131"]) || [])].join(","), "lands_preserve", "H.J.Res. 131's lands line appeared on another issue");
  const lg = CS.dossierTally("lee", "gov_regulation", CS.issueRow("lee", "gov_regulation").ov);
  if (lg && lg.rows.some((p) => p.d.ident === "H.J.Res. 131")) {
    no(drawer("lee", "gov_regulation"), "conservation withdrawal", "lee × gov_regulation: the lands line was reused on Cut Red Tape");
  }

  // THE CHECKS HAVE TEETH. Three renderers that each break one rule.
  const src = R("consistency.js");
  const seam = "var eff = d.effLine || '';";
  must(src.includes(seam), "the effect-line seam these mutations need has moved");
  const run = (mut, ks = ["lands_preserve"]) => {
    const M = boot((fl) => (fl === "consistency.js" ? src.replace(seam, mut) : R(fl)));
    const MCS = M.PDXConsistency;
    must(MCS && typeof MCS.gapViewHtml === "function", "a mutated renderer did not boot");
    const at = (k) => ({ mh: MCS.gapViewHtml("lee", k) || "", mt: MCS.dossierTally("lee", k, MCS.issueRow("lee", k).ov) });
    const out = at(ks[0]);
    out.more = ks.slice(1).map(at);
    return out;
  };
  // (a) method text back under the row.
  {
    const { mh, mt } = run("var eff = p.why;");
    ok(drift(mh, mt, "lands_preserve").length > 0, "a renderer printing method text under the row passed the store check");
    ok(effectLines(table(mh)).some((e) => effectFault(e)), "a renderer printing method text under the row passed the effect rule");
    ok(VOCAB.some((v) => text(lede(mh)).toLowerCase().includes(v)), "the method mutation did not surface method vocabulary");
  }
  // (b) the bill title as a fallback.
  {
    const r2 = CS.issueRows("lee").map((y) => y.key).find((k) => {
      const tt = CS.dossierTally("lee", k, CS.issueRow("lee", k).ov);
      return tt && tt.rows.some((p) => !expected(p, k) && String(p.d.title || "").trim());
    });
    must(r2, "lee has no row without a stored line to test the title fallback on");
    const { mh, mt, more } = run("var eff = d.effLine || d.title;", ["lands_preserve", r2]);
    ok(drift(more[0].mh, more[0].mt, r2).length > 0, `a renderer dumping the bill title under a row on lee × ${r2} passed the store check`);
    eq(drift(mh, mt, "lands_preserve").join(" | "), "", "the title mutation touched rows that do have a stored line");
  }
  // (c) a sibling issue's line borrowed onto this one.
  {
    const { mh, mt } = run("var eff = _dosEffectLine(_dosMechFor(d.item, 'lands_energy'));");
    ok(drift(mh, mt, "lands_preserve").length > 0, "a renderer borrowing another issue's line passed the store check");
  }

  // BYTE-SAME AS HEAD, EXCEPT THE NEW LINE. Take the effect rows out of every
  // drawer and what is left — tally, same-measure line, bills-vs-acts noun,
  // for/against, the rows themselves, the fold — is HEAD's drawer exactly. Only
  // meaningful while HEAD predates this pass; after it lands, section 7 and 8
  // keep pinning the scored surface.
  const HSRC = HEAD("consistency.js");
  if (HSRC && !HSRC.includes("pdxlg-effr")) {
    const A = boot(HEAD);
    const strip = (x) => String(x).replace(/<tr class="pdxlg-effr" data-pdxlg-effr="\d+"><td colspan="5" class="pdxlg-eff" data-pdxlg-eff="1">[\s\S]*?<\/td><\/tr>/g, "");
    const moved = [];
    let same = 0;
    for (const x of WITH) {
      let before = "";
      try { before = A.PDXConsistency.gapViewHtml(x.pid, x.key) || ""; } catch { continue; }
      if (before === strip(drawer(x.pid, x.key))) same++; else moved.push(key(x));
    }
    eq(moved.slice(0, 6).join(" | "), "", `${moved.length} drawer(s) changed beyond the effect line`);
    console.log(`      ${same} drawer(s) are byte-identical to HEAD once the effect lines are taken out`);
  } else {
    console.log("      HEAD already carries the effect line; byte comparison left to sections 7 and 8");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("13 · Cut Federal Red Tape scans — Lee, six acts, six lines");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The offline corpus is a projection and is short three of Lee's red-tape
  // ballots that the live tables hold: the two California waiver resolutions
  // (attached by migration 20260725040000, whose cells never went into a seed)
  // and the stabilizing-brace resolution in the 118th Senate (its red-tape
  // mapping arrived by migration 20260917000000). They are restated here in the
  // API's own item shape, from those migrations, so this drawer is the one a
  // browser opens — and nothing else in this file sees them.
  const SEED = new Map(JSON.parse(R("db/vr-issue-seed.json")).measures.map((m) => [`${m.number}|${m.congress}`, m]));
  const issuesOf = (n, c, extra = []) => [...((SEED.get(`${n}|${c}`) || {}).issues || []), ...extra].map((i) => ({
    issueKey: i.issueKey, weight: i.weight == null ? 100 : i.weight, isPrimary: !!i.isPrimary,
    supportMeaning: i.supportMeaning, rationale: i.rationale || null,
  }));
  const vote = (number, congress, session, roll, date, result, title, issues) => ({
    kind: "vote", measureId: `${number}|${congress}`, measureType: "resolution", number, title,
    chamber: "senate", status: "", date, action: `On the Joint Resolution ${number}`, actionType: "passage",
    position: "yea", result, isParty: "with_party", supports: null, isProcedural: false, advanceInverted: false,
    isAmendment: false, parentMeasureId: null, rollcallId: roll, congress, session, rollNumber: roll, issues,
    source: { url: `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${String(roll).padStart(5, "0")}.htm`, label: "U.S. Senate" },
  });
  const LIVE = [
    vote("H.J.Res. 44", 118, 1, 171, "2023-06-22T16:00:00.000Z", "failed",
      "Providing for congressional disapproval under chapter 8 of title 5, United States Code, of the rule submitted by the Bureau of Alcohol, Tobacco, Firearms, and Explosives relating to “Factoring Criteria for Firearms with Attached ‘Stabilizing Braces’”.",
      issuesOf("H.J.Res. 44", 118, [{ issueKey: "gov_regulation", weight: 60, isPrimary: false, supportMeaning: "yea_supports" }])),
    vote("H.J.Res. 88", 119, 1, 277, "2025-05-22T14:30:00.000Z", "passed",
      "Providing for congressional disapproval of the Environmental Protection Agency waiver for the California Advanced Clean Cars II regulations",
      issuesOf("H.J.Res. 88", 119)),
    vote("H.J.Res. 89", 119, 1, 281, "2025-05-22T18:09:00.000Z", "passed",
      "Providing for congressional disapproval of the Environmental Protection Agency waiver for the California Advanced Clean Trucks regulations",
      issuesOf("H.J.Res. 89", 119)),
  ];
  const leeRecs = corpus.byMember.get("lee") || [];
  must(leeRecs.length > 0, "lee has no record in the corpus");
  for (const x of LIVE) must(!leeRecs.some((y) => y.number === x.number && y.congress === x.congress && y.chamber === "senate"),
    `${x.number}: the corpus now carries Lee's Senate ballot — drop the fixture`);
  const bootLive = (get) => {
    const W = boot(get);
    W.PDXVotingRecord.noteMember("lee", leeRecs.concat(LIVE));
    return W.PDXConsistency;
  };
  const L = bootLive(R);
  const K = "gov_regulation";
  const t = L.dossierTally("lee", K, L.issueRow("lee", K).ov);
  const h = L.gapViewHtml("lee", K) || "";
  must(h.length > 2000, "lee × gov_regulation rendered nothing");
  eq(`${t.acts} acts · ${t.advances} for · ${t.opposes} against`, "6 acts · 6 for · 0 against", "lee × gov_regulation: the tally");

  const rowsOf = (x) => new Map([...String(x).matchAll(/<tr class="pdxlg-effr" data-pdxlg-effr="(\d+)"><td colspan="5" class="pdxlg-eff" data-pdxlg-eff="1">([\s\S]*?)<\/td><\/tr>/g)].map((m) => [Number(m[1]), text(m[2])]));
  const lines = rowsOf(table(h));
  const byId = Object.fromEntries(t.rows.map((p) => [p.d.ident, lines.get(p.i) || ""]));
  eq(Object.keys(byId).sort().join(", "), "H.J.Res. 131, H.J.Res. 25, H.J.Res. 44, H.J.Res. 88, H.J.Res. 89, S.J.Res. 18", "lee × gov_regulation: the six measures");
  eq(lines.size, 6, "lee × gov_regulation: not one effect line per act");
  for (const [id, e] of Object.entries(byId)) {
    ok(e.length > 0, `lee × gov_regulation: ${id} has no effect line`);
    eq(effectFault(e), "", `lee × gov_regulation: ${id}'s line breaks the rule`);
    // What it did to the rule, not a title and not a clip.
    ok(/\b(?:rule|waiver|decision)\b/.test(e) && /\bbarred\b/.test(e), `lee × gov_regulation: ${id}'s line does not say which rule it struck — ${e}`);
    ok(!/…|\.\.\./.test(e), `lee × gov_regulation: ${id}'s line is clipped`);
    const title = String((t.rows.find((p) => p.d.ident === id) || { d: {} }).d.title || "");
    ok(e !== title && e !== title + ".", `lee × gov_regulation: ${id}'s title was printed as its effect`);
    ok(!/\b(?:we|PolitiDex|this chip|coded|counts? (?:for|against)|advancing)\b/i.test(e), `lee × gov_regulation: ${id}'s line is about the archive — ${e}`);
  }
  // 131's red-tape line is its own, not the ANWR acreage line from the lands row.
  const LANDS131 = "Removed the conservation withdrawal from roughly 1.2 million acres inside the Arctic National Wildlife Refuge.";
  ok(byId["H.J.Res. 131"] && byId["H.J.Res. 131"] !== LANDS131, "lee × gov_regulation: H.J.Res. 131 printed the lands line");
  no(h, "conservation withdrawal", "lee × gov_regulation: the lands sentence reached Cut Red Tape");
  // A failed measure is not described as having struck anything.
  ok(/^Would have\b/.test(byId["H.J.Res. 44"]), "lee × gov_regulation: H.J.Res. 44 failed and its line reads as if it struck the rule");

  // The first screen is a scan: the row, the chips, the line — no method.
  const l = lede(h);
  for (const v of ["precedent", "mirror", "discriminator", "vocabulary carries no", "primary row", "Why it counts", "What it did", "Which way it cut", "Direction Match"]) {
    no(text(l), v, `lee × gov_regulation: "${v}" on the first screen`);
  }
  for (const cls of ["pdxlg-why", "pdxlg-whyr", "pdxlg-why-one"]) no(l, `class="${cls}"`, `lee × gov_regulation: .${cls} on the first screen`);
  const tb = table(h);
  const trs = ((tb.match(/<tbody>[\s\S]*?<\/tbody>/g) || []).join("").match(/<tr[\s>]/g) || []).length;
  eq(trs, 12, "lee × gov_regulation: the vote table is not six act rows and six effect rows");
  // The long form is still behind the fold.
  has(folded(h), "pdxgap-how", "lee × gov_regulation: the scoring fold is gone");

  // THE MUTATIONS STILL BITE on this drawer. A title in place of a missing line
  // and a sibling issue's line borrowed onto this one both show.
  const src = R("consistency.js"), seam = "var eff = d.effLine || '';";
  const mut = (m) => {
    const M = bootLive((fl) => (fl === "consistency.js" ? src.replace(seam, m) : R(fl)));
    return rowsOf(table(M.gapViewHtml("lee", K) || ""));
  };
  {
    // Every row here now has a line, so the title fallback is caught by printing
    // a title where the line would be.
    const got = mut("var eff = d.title || d.effLine;");
    ok([...got.values()].some((e, i) => e !== [...lines.values()][i]), "lee × gov_regulation: a title-first renderer printed the same lines");
  }
  {
    const got = mut("var eff = _dosEffectLine(d.item, 'lands_preserve', _dosMechFor(d.item, 'lands_preserve'));");
    ok([...got.values()].includes(LANDS131), "lee × gov_regulation: the borrow mutation did not surface the lands line");
    ok([...got.values()].length < 6, "lee × gov_regulation: a lands-scoped renderer still printed six red-tape lines");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("14 · the harvest — every stored did, read against the effect rule");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The pass that asked "which stored `did` sentences can stand under a row"
  // walked every (measure, congress, issue) pair in _DOS_MECH and found nothing
  // to promote: every `did` that is one sentence of at most 140 characters is
  // already printed by the short-did fallback, and every other one is two
  // sentences or too long, which this archive does not clip or rewrite. So the
  // effect table stays at its eight hand-written lines, and this section pins
  // both halves of that finding so a later pass cannot quietly copy a `did` into
  // the table, clip one, or drop one the fallback should print. The one family
  // that did grow it since is the Congressional Review Act batch below: short
  // lines in a fixed shape for disapprovals whose own `did` is too long or absent.
  const lift = (name) => {
    const src = R("consistency.js"), a = src.indexOf(`var ${name} = {`);
    must(a !== -1, `${name} is not in consistency.js in the form this file reads`);
    return vm.runInNewContext("(" + src.slice(a + `var ${name} = `.length, src.indexOf("\n  };", a) + 4) + ")");
  };
  const MECH = lift("_DOS_MECH"), EFFECT = lift("_DOS_EFFECT");
  const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
  // The request's rule, which is the renderer's rule plus the coding words it
  // names that the renderer's list does not, and a subject check: the act does
  // the verb, never the archive.
  const harvestFault = (s) => {
    const f = effectFault(s);
    if (f) return f;
    if (/…|\.\.\./.test(s)) return "is a clip";
    if (/\b(?:isPrimary|on-axis)\b/i.test(s)) return "carries method vocabulary";
    if (/\b(?:PolitiDex|we|our|this chip|this issue)\b/i.test(s)) return "is about the archive, not the act";
    return "";
  };

  // THE EIGHT SHIPPED LINES, byte for byte.
  const SHIPPED = {
    "H.J.Res. 131|119|lands_preserve": "Removed the conservation withdrawal from roughly 1.2 million acres inside the Arctic National Wildlife Refuge.",
    "H.J.Res. 140|119|lands_preserve": "Struck the order closing about 225,504 acres of Minnesota national forest above the Boundary Waters to mineral and geothermal leasing.",
    "H.J.Res. 44|118|gov_regulation": "Would have nullified the ATF rule on pistols fitted with stabilizing braces and barred its reissue; it failed in the Senate 49-50.",
    "H.J.Res. 25|119|gov_regulation": "Nullified the IRS rule making decentralized-finance software report users’ crypto trades as a broker, and barred a similar rule.",
    "H.J.Res. 88|119|gov_regulation": "Struck the EPA waiver letting California enforce Advanced Clean Cars II, and barred a substantially similar waiver.",
    "H.J.Res. 89|119|gov_regulation": "Struck the EPA waiver letting California enforce its own heavy-duty truck emission rules, and barred a substantially similar waiver.",
    "S.J.Res. 18|119|gov_regulation": "Nullified the CFPB’s December 2024 overdraft rule for the largest banks and barred a substantially similar rule.",
    "H.J.Res. 131|119|gov_regulation": "Voided the BLM’s 2024 Arctic refuge leasing decision under the Congressional Review Act and barred a substantially similar one.",
  };
  for (const [k, v] of Object.entries(SHIPPED)) eq(EFFECT[k], v, `${k}: the shipped effect line changed`);

  // THE CRA BATCH. Every line past the eight is a Congressional Review Act
  // disapproval on another issue it is mapped to, in one of two fixed shapes, with
  // the rule named from a field the archive already stores for THAT pair — its own
  // `did`, or with none the measure's stored title — and an outcome the archive
  // settles. A line whose rule cannot be traced to its pair's own field, or whose
  // measure the archive does not show as enacted or failed, is refused.
  const STRUCK = /^Struck the .+ and barred a substantially similar rule\.$/;
  const FAILED = /^Would have struck the [^;]+; it failed (?:the House|the Senate) \d+-\d+\.$/;
  const TITLE = {
    "H.J.Res. 88|119": R("netlify/database/migrations/20260725040000_vr_seed_waiver_cra_rollcalls.sql").match(/'H\.J\.Res\. 88', '([^']+)'/)[1],
    "H.J.Res. 89|119": R("netlify/database/migrations/20260725040000_vr_seed_waiver_cra_rollcalls.sql").match(/'H\.J\.Res\. 89', '([^']+)'/)[1],
  };
  // Outcome as filed: status 'enacted' (or its public law) on the struck ones, the
  // 49-50 Senate defeat written into migration 20260917000000 for the failed one.
  const OUTCOME = {
    "H.J.Res. 131|119": "enacted", "H.J.Res. 140|119": "enacted", "H.J.Res. 88|119": "enacted",
    "H.J.Res. 89|119": "enacted", "H.J.Res. 25|119": "enacted", "S.J.Res. 18|119": "enacted",
    "H.J.Res. 44|118": "failed the Senate 49-50",
  };
  // The words in each line that name the rule, and where the archive stores them.
  const RULE = {
    "H.J.Res. 131|119|energy_production": ["Record of Decision", "did"],
    "H.J.Res. 131|119|lands_energy": ["1.2 million", "did"],
    "H.J.Res. 140|119|lands_energy": ["mineral and geothermal leasing", "did"],
    "H.J.Res. 88|119|energy_production": ["Advanced Clean Cars II", "title"],
    "H.J.Res. 88|119|climate_action": ["Advanced Clean Cars II", "title"],
    "H.J.Res. 89|119|energy_production": ["Advanced Clean Trucks", "title"],
    "H.J.Res. 89|119|climate_action": ["Advanced Clean Trucks", "title"],
    "H.J.Res. 44|118|gun_rights": ["short-barrelled rifles", "did"],
    "H.J.Res. 44|118|gun_safety": ["National Firearms Act", "did"],
    "H.J.Res. 25|119|tech_innovation": ["front ends", "did"],
    "S.J.Res. 18|119|econ_corp_account": ["very large financial institutions", "did"],
  };
  const craFault = (k, v, rule = RULE) => {
    const f = harvestFault(v);
    if (f) return f;
    const m = k.split("|").slice(0, 2).join("|"), r = rule[k];
    if (!r) return "names no rule the archive stores for this pair";
    const src = r[1] === "did" ? norm(MECH[k] && MECH[k].did) : norm(TITLE[m]);
    if (!src || !src.includes(r[0]) || !v.includes(r[0])) return `the rule name "${r[0]}" is not in this pair's stored ${r[1]}`;
    if (!OUTCOME[m]) return "the archive does not settle whether it became law";
    if (OUTCOME[m] === "enacted" ? !STRUCK.test(v) : !(FAILED.test(v) && v.endsWith(`it ${OUTCOME[m]}.`))) return "is not the fixed CRA shape for its outcome";
    return "";
  };
  // THE IRAN BATCH (September 2026). Not CRA disapprovals: war-powers resolutions
  // whose own subject is Iran, one line each on the measure × iran_policy pair.
  // Each must pass the same harvest rules, name Iran, and end on the tally the
  // archive's own vote seed holds for that roll, in the shape its outcome allows.
  const IRAN = Object.keys(EFFECT).filter((k) => /\|iran_policy$/.test(k));
  const TALLY = (() => {
    const t = {};
    const seed = JSON.parse(R("db/vr-issue-seed.json"));
    for (const m of seed.measures) {
      const x = /· (\d+)-(\d+) ·/.exec(m._comment || "");
      if (x) t[`${m.number}|${m.congress}`] = [+x[1], +x[2]];
    }
    for (const v of JSON.parse(R("db/vr-senate-lis-backfill-seed.json")).votes || []) {
      if (v.measure !== "S.J.Res. 59" || v.congress !== 119) continue;
      const P = Object.values(v.partyTotals || {});
      t["S.J.Res. 59|119"] = [P.reduce((n, p) => n + p.yea, 0), P.reduce((n, p) => n + p.nay, 0)];
    }
    for (const v of JSON.parse(R("db/vr-house-seed-119-s2.json")).votes || []) {
      if (v.measure && v.measure.number === "H.Con.Res. 89") t["H.Con.Res. 89|119"] = [v.totals.yea, v.totals.nay];
    }
    return t;
  })();
  const iranFault = (k, v) => {
    const f = harvestFault(v);
    if (f) return f;
    if (!/\bIran\b/.test(v)) return "does not name Iran, the subject it is filed under";
    const tl = TALLY[k.split("|").slice(0, 2).join("|")];
    if (!tl) return "the archive holds no tally for this roll";
    const [y, n] = tl;
    const shape = y < n ? new RegExp(`^Would have ordered .+; the Senate refused to discharge it ${y}-${n}\\.$`)
      : k.startsWith("H.") ? new RegExp(`; the House agreed to it ${y}-${n}\\.$`)
      : new RegExp(`; the Senate voted ${y}-${n} to discharge it\\.$`);
    return shape.test(v) ? "" : `does not end on the archive's tally ${y}-${n} in the shape its outcome allows`;
  };
  for (const k of IRAN) eq(iranFault(k, EFFECT[k]), "", `${k}: the Iran effect line`);
  ok(iranFault("S.J.Res. 104|119|iran_policy", EFFECT["S.J.Res. 104|119|iran_policy"].replace("47-53", "53-47")) !== "",
    "an Iran line with the tally flipped passed the Iran check");
  ok(iranFault("S.J.Res. 104|119|iran_policy", "Would have ordered U.S. forces home; the Senate refused to discharge it 47-53.") !== "",
    "an Iran line that never names Iran passed the Iran check");
  // THE UKRAINE BATCH. The Ukraine supplemental and the package that carried it,
  // one line each on the measure × ukraine_policy pair: same harvest rules, the
  // line names Ukraine, and it ends on the tally the archive's own vote seed holds.
  const UKRAINE = Object.keys(EFFECT).filter((k) => /\|ukraine_policy$/.test(k));
  const UK_TALLY = (() => {
    const t = {};
    for (const v of JSON.parse(R("db/vr-phase-a-vote-seed.json")).votes || []) {
      const num = v.measure && v.measure.number;
      if (v.congress === 118 && (num === "H.R. 8035" || num === "H.R. 815") && v.totals) {
        t[`${num}|118`] = [v.chamber, v.totals.yea, v.totals.nay];
      }
    }
    // H.Amdt. 252, the failed House amendment barring the funds: roll 119/2/264.
    for (const v of JSON.parse(R("db/vr-house-seed-119-s2.json")).votes || []) {
      if (v.measure && v.measure.number === "H.Amdt. 252" && v.rollNumber === 264 && v.totals) {
        t["H.Amdt. 252|119"] = [v.chamber || v.measure.chamber, v.totals.yea, v.totals.nay, v.result];
      }
    }
    return t;
  })();
  const ukraineFault = (k, v) => {
    const f = harvestFault(v);
    if (f) return f;
    if (!/\bUkraine\b/.test(v)) return "does not name Ukraine, the subject it is filed under";
    const tl = UK_TALLY[k.split("|").slice(0, 2).join("|")];
    if (!tl) return "the archive holds no tally for this roll";
    const [ch, y, n, res] = tl;
    const tail = res === "failed" ? `; the House rejected it ${y}-${n}.`
      : ch === "house" ? `; the House passed it ${y}-${n}.` : `; the Senate concurred ${y}-${n}.`;
    if (res === "failed" && !/^Proposed\b/.test(v)) return "a failed amendment is written as though it took effect";
    return v.endsWith(tail) ? "" : `does not end on the archive's tally ${y}-${n}`;
  };
  must(UKRAINE.length > 0, "no Ukraine effect line is stored");
  for (const k of UKRAINE) eq(ukraineFault(k, EFFECT[k]), "", `${k}: the Ukraine effect line`);
  ok(ukraineFault("H.R. 8035|118|ukraine_policy", EFFECT["H.R. 8035|118|ukraine_policy"].replace("311-112", "112-311")) !== "",
    "a Ukraine line with the tally flipped passed the Ukraine check");
  ok(ukraineFault("H.Amdt. 252|119|ukraine_policy", "Prohibited funds for Ukraine Security Assistance; the House rejected it 76-350.") !== "",
    "a failed Ukraine amendment written as though it took effect passed the Ukraine check");
  ok(ukraineFault("H.R. 8035|118|ukraine_policy", "Appropriated supplemental security aid abroad; the House passed it 311-112.") !== "",
    "a Ukraine line that never names Ukraine passed the Ukraine check");
  ok(!Object.keys(EFFECT).some((k) => /\|yemen_policy$/.test(k)), "no roll-call Yemen line: the only Yemen act is a veto");
  // THE WAR POWERS BATCH (v311). Member-voted acts on Congress and War Powers, one
  // line each on the measure × war_powers pair, written from that pair's own `did`:
  // same harvest rules, the line says it is about authorization, and it ends on the
  // tally the issue seed records for that roll, in the shape its outcome allows —
  // a discharge refused ("Would have used …"), a discharge carried, or a House
  // amendment agreed to.
  const WAR = Object.keys(EFFECT).filter((k) => /\|war_powers$/.test(k));
  const warFault = (k, v) => {
    const f = harvestFault(v);
    if (f) return f;
    if (!/War Powers|authoriz/.test(v)) return "does not say it is about authorization, the subject it is filed under";
    const tl = TALLY[k.split("|").slice(0, 2).join("|")];
    if (!tl) return "the archive holds no tally for this roll";
    const [y, n] = tl;
    const shape = k.startsWith("H.") ? new RegExp(`; the House agreed to it ${y}-${n}\\.$`)
      : y < n ? new RegExp(`^Would have used .+; the Senate refused to discharge it ${y}-${n}\\.$`)
      : new RegExp(`^Would use .+; the Senate voted ${y}-${n} to discharge it\\.$`);
    return shape.test(v) ? "" : `does not end on the archive's tally ${y}-${n} in the shape its outcome allows`;
  };
  must(WAR.length > 0, "no War Powers effect line is stored");
  for (const k of WAR) eq(warFault(k, EFFECT[k]), "", `${k}: the War Powers effect line`);
  ok(warFault("S.J.Res. 104|119|war_powers", EFFECT["S.J.Res. 104|119|war_powers"].replace("47-53", "53-47")) !== "",
    "a War Powers line with the tally flipped passed the War Powers check");
  ok(warFault("S.J.Res. 98|119|war_powers", "Would have used it to end U.S. hostilities in Venezuela; the Senate refused to discharge it 52-47.") !== "",
    "a War Powers line written as refused over a discharge that carried passed the War Powers check");
  ok(!("S.J.Res. 59|119|war_powers" in EFFECT), "S.J.Res. 59 stores no `did` on War Powers, so it has no line to write from");
  const BATCH = Object.keys(EFFECT).filter((k) => !(k in SHIPPED) && !IRAN.includes(k) && !UKRAINE.includes(k) && !WAR.includes(k));
  ok(BATCH.length > 0 && BATCH.length <= 30, `${BATCH.length} new effect line(s) — the CRA batch is capped at 30`);
  eq(Object.keys(EFFECT).length, 8 + BATCH.length + IRAN.length + UKRAINE.length + WAR.length, "the effect table lost a shipped line");
  for (const k of BATCH) eq(craFault(k, EFFECT[k]), "", `${k}: the CRA effect line`);
  // Same resolution, different issue: the line is that pair's own, never a
  // sibling's, except where neither pair has a `did` and the title is the only source.
  for (const k of BATCH) {
    const m = k.split("|").slice(0, 2).join("|");
    for (const j of Object.keys(EFFECT)) {
      if (j === k || !j.startsWith(m + "|") || EFFECT[j] !== EFFECT[k]) continue;
      ok(RULE[k] && RULE[k][1] === "title" && RULE[j] && RULE[j][1] === "title", `${k}: copies ${j}'s line`);
    }
  }
  // Never in the table: a CRA whose outcome is unsettled, one that is not a rule
  // at all (arms-sale disapprovals), and a line that names no stored rule.
  for (const k of ["S.J.Res. 7|119|broadband", "H.J.Res. 78|119|gov_regulation", "H.J.Res. 78|119|lands_preserve",
    "S.J.Res. 111|118|israel_support", "S.J.Res. 33|119|israel_support", "H.R. 3684|117|water"]) {
    ok(!(k in EFFECT), `${k}: in the effect table without a settled, stored rule effect`);
  }
  ok(craFault("H.J.Res. 78|119|gov_regulation", "Struck the agency rule and barred a substantially similar rule.") !== "",
    "a CRA line naming no stored rule passed the CRA check");
  ok(craFault("H.J.Res. 44|118|gun_rights", "Struck the ATF rule reclassifying braced pistols as short-barrelled rifles and barred a substantially similar rule.") !== "",
    "a failed CRA written as if it struck the rule passed the CRA check");
  ok(craFault("H.J.Res. 131|119|energy_production", SHIPPED["H.J.Res. 131|119|lands_preserve"]) !== "",
    "the lands ANWR line borrowed onto the energy row passed the CRA check");
  ok(craFault("H.J.Res. 25|119|tech_innovation", EFFECT["H.J.Res. 25|119|tech_innovation"], { ...RULE, "H.J.Res. 25|119|tech_innovation": ["overdraft", "did"] }) !== "",
    "a rule name absent from the pair's own did passed the CRA check");
  console.log(`      ${BATCH.length} CRA effect line(s) past the eight shipped · each traced to its pair's own did or title`);

  // THE WALK. Every stored `did`, sorted into the ones the rule admits and the
  // ones it does not, and why.
  const pairs = Object.entries(MECH).filter(([, v]) => norm(v && v.did));
  const admit = new Map(), refuse = new Map();
  for (const [k, v] of pairs) {
    const f = harvestFault(norm(v.did));
    if (f) refuse.set(k, f); else admit.set(k, norm(v.did));
  }
  ok(pairs.length > 200, `only ${pairs.length} stored did(s) — the walk did not find the store`);
  // Nothing to promote: an admitted `did` already prints through the fallback,
  // so a copy in the effect table would be a second home for one sentence.
  const promoted = Object.keys(EFFECT).filter((k) => !(k in SHIPPED));
  for (const k of Object.keys(EFFECT)) {
    ok(!admit.has(k), `${k}: the effect table carries a line the short-did fallback already prints`);
    ok(!MECH[k] || norm(EFFECT[k]) !== norm(MECH[k].did), `${k}: the effect table copies the stored did`);
  }
  console.log(`      ${pairs.length} stored measure×issue did(s) · ${admit.size} already one short sentence and printed by the fallback · ` +
    `${refuse.size} refused · ${promoted.length} promoted`);

  // THE FALLBACK PRINTS EXACTLY THE ADMITTED ONES. Wherever an admitted pair is
  // a row, its `did` is the line under it; wherever a refused pair is a row and
  // the table has no line for it, the row has no extra paragraph at all.
  let seenAdmit = 0, seenRefuse = 0, lit = new Set();
  const extraRows = [];
  for (const x of WITH) {
    const h = drawer(x.pid, x.key), tb = table(h);
    const lines = new Map([...tb.matchAll(/<tr class="pdxlg-effr" data-pdxlg-effr="(\d+)"><td colspan="5" class="pdxlg-eff" data-pdxlg-eff="1">([\s\S]*?)<\/td><\/tr>/g)].map((m) => [Number(m[1]), text(m[2])]));
    if (lines.size) lit.add(key(x));
    for (const p of x.t.rows) {
      const it = (p.d && p.d.item) || {};
      const mk = `${String(it.number || "").trim()}|${it.congress}|${x.key}`;
      const have = lines.get(p.i) || "";
      if (have) eq(harvestFault(have), "", `${key(x)} ${p.d.ident}: a printed line breaks the harvest rule`);
      if (have && have === norm(p.d.title)) fails.push(`${key(x)} ${p.d.ident}: the bill title is its effect line`);
      if (EFFECT[mk]) continue;
      if (admit.has(mk)) { seenAdmit++; eq(have, admit.get(mk), `${key(x)} ${p.d.ident}: an admitted did is not the line under its row`); }
      else if (refuse.has(mk)) {
        seenRefuse++;
        if (have) fails.push(`${key(x)} ${p.d.ident}: a refused did (${refuse.get(mk)}) printed an effect line`);
        if (new RegExp(`data-pdxlg-effr="${p.i}"`).test(tb)) extraRows.push(key(x));
      }
    }
  }
  eq(extraRows.length, 0, "a row with no qualifying did grew an extra paragraph");
  ok(seenAdmit > 0 && seenRefuse > 0, `the sweep saw ${seenAdmit} admitted and ${seenRefuse} refused row(s) — both kinds must exist`);
  console.log(`      ${lit.size} drawer(s) print at least one effect line`);

  // LEE × WATER stays mute. The infrastructure act's water `did` runs past 140
  // characters, so the row under it prints nothing — and nothing was written to
  // make it speak.
  const W = "H.R. 3684|117|water";
  must(MECH[W], `${W} is no longer stored — this check needs a new mute pair`);
  ok(refuse.has(W), `${W}: the stored did now passes the rule — re-read the smoke`);
  ok(!(W in EFFECT), `${W}: a water line was written into the effect table`);
  const lw = WITH.find((x) => x.pid === "lee" && x.key === "water");
  if (lw) {
    const tb = table(drawer("lee", "water"));
    for (const p of lw.t.rows) {
      const it = (p.d && p.d.item) || {};
      if (`${String(it.number || "").trim()}|${it.congress}|water` === W) {
        no(tb, `data-pdxlg-effr="${p.i}"`, "lee × water: the infrastructure act grew an effect line");
      }
    }
  }
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
