#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vote-ledger.mjs — every recorded vote visible by issue, with its direction
// ─────────────────────────────────────────────────────────────────────────────
// Direction Match scores a stated position against a formal act. Where nothing was
// stated it correctly refuses to score — and until this pass that refusal ate the
// record along with the score. A row holding six roll calls and no stated position
// printed "Record: Limited · 6 votes", a said-vs-did verdict about a comparison
// nobody had run, over six proof lines wearing six identical "…" shrugs. The votes
// were all there. Nothing on any surface let a reader see that five of them went one
// way and one went the other.
//
// This pass makes that record readable without making it scorable. The fence is the
// whole design, and it is what this file holds:
//
//   1. THE PREDICATE FAILS CLOSED. A row is called "not in Direction Match" only
//      when it is genuinely outside it AND the reason is the missing stated
//      position. No tested row anywhere in the roster is ever labelled unscored.
//   2. COUNT = LIST. A row that says six votes opens onto six votes, each with its
//      identity, its date, its ballot and its direction on this issue.
//   3. THE LABEL IS HONEST. "Limited record" is a finding about a record that WAS
//      tested; an untested one gets its own words and never borrows those.
//   4. DIRECTION IS RECORD-RELATIVE. "Mapped as advancing X" — what the measure
//      does to the issue. Never "they support X", never inferred from a party.
//   5. IT IS NOT A SECOND SCORE. Counts of mapped directions, said to be counts,
//      with no percentage, rate, rank or party-unity framing anywhere near them.
//   6. HELD ITEMS STAY VISIBLE. An instrument we cannot judge is still listed, with
//      the reason, and is counted as held rather than quietly dropped.
//   7. THE TRAIL CONTINUES. The dossier can now reach the full voting record
//      filtered to this issue — the same door the profile row already offered.
//   8. THE SCORE DOES NOT MOVE. Every read() and every rowResult() in the roster is
//      byte-identical before and after the whole ledger is rendered.
//
//   node scripts/test-vote-ledger.mjs
//
// Real shipped modules in a node:vm sandbox, real profile data, votes seeded the
// way a completed /api/voting-record fetch leaves the cache.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
// Source assertions look at CODE, not at the comments explaining the code — a
// forbidden phrase quoted in a comment that exists to forbid it is not a bug.
const CODE = (f) => R(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "consistency.js", "voting-record.js", "word-action.js", "stance-tree.js",
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
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
// A fixture that no longer offers a case is a silent pass, so the probes that
// establish one are fatal rather than counted.
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ vote ledger: ${msg}`);
  process.exit(1);
};
const txt = (h) => String(h)
  .replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/&middot;/g, "·").replace(/\s+/g, " ").trim();

// ── The fixture ──────────────────────────────────────────────────────────────
// One senator, two issues, and the difference between them is the whole pass:
//   DARK   — six roll calls, five one way and one the other, NO stated position.
//   SPOKEN — seven roll calls, a stated position on file, scored today and after.
const PID = "schumer";
const probe = boot();
must(probe.PDXConsistency && probe.PDXConsistency.ledger,
  "PDXConsistency.ledger is not exposed — the lane is unprobeable");
const stanceKeys = new Set(
  (probe._resolveStanceList(PID, probe.CMP_DATA[PID]) || [])
    .map((s) => s && s.issueKey).filter(Boolean));
const ISSUE_KEYS = Object.keys(probe.ISSUE_MAP || {});
const usable = (k) => !/_balance$/.test(k) && !(probe._PDX_RD_NO_POLE || {})[k];
const SILENT = ISSUE_KEYS.filter((k) => !stanceKeys.has(k) && usable(k));
const SPOKEN = ISSUE_KEYS.filter((k) => stanceKeys.has(k) && usable(k))[0];
const DARK = SILENT[0], SIDE = SILENT[1];
must(DARK && SIDE && SPOKEN, "the fixture profile no longer offers a dark issue and a spoken one");

const vote = (n, issueKey, position, opts) => {
  opts = opts || {};
  return {
    kind: "vote", rollcallId: 700 + n, measureId: 800 + n, number: "S. " + (100 + n),
    date: "2025-0" + ((n % 9) + 1) + "-11", action: "On Passage", position: position,
    isProcedural: !!opts.proc, title: "Measure " + n,
    source: { url: "https://www.congress.gov/roll-call-vote/" + (700 + n), label: "Congress.gov" },
    issues: [{
      issueKey: issueKey, weight: 100,
      isPrimary: opts.primary !== false, supportMeaning: "yea_supports",
    }].concat(opts.also
      ? [{ issueKey: opts.also, weight: 60, isPrimary: false, supportMeaning: "yea_supports" }]
      : []),
  };
};
const SEED = [];
// Five Yea and one Nay, so a split exists to be counted and a uniform run does not
// stand in for one. The first also carries a second issue: a multi-issue measure has
// to keep opening its instrument trail on a row that is not scored.
for (let i = 0; i < 6; i++) SEED.push(vote(i, DARK, i < 5 ? "yea" : "nay", { also: i === 0 ? SIDE : null }));
for (let i = 0; i < 7; i++) SEED.push(vote(40 + i, SPOKEN, "yea"));

const A = boot();
A.PDXVotingRecord.noteMember(PID, SEED.map((v) => JSON.parse(JSON.stringify(v))));
const CS = A.PDXConsistency, LED = CS.ledger, WA = A.PDXWordAction;

const ovDark = CS.officialRecord(PID, DARK);
const ovSpoken = CS.officialRecord(PID, SPOKEN);
must(ovDark && (ovDark.record || {}).total === 6, "the dark issue no longer carries six mapped votes");
must(ovSpoken && (ovSpoken.record || {}).total === 7, "the spoken issue no longer carries seven mapped votes");

// ── 1 · the predicate fails closed ───────────────────────────────────────────
section("1 · the predicate: never called unscored while it is scored");

ok(LED.unscored(ovDark) === true, "the dark issue is on record and outside Direction Match");
ok(LED.unscored(ovSpoken) === false, "the spoken issue is scored and is NOT in the ledger lane");
ok(LED.onRecord(ovDark) === true, "the dark issue has something on record to be outside the score with");

// Nothing on file at all is not a ledger row: there is no record to surface, and
// saying "on record" about an empty issue would be the same false claim in reverse.
{
  const emptyKey = SILENT.filter((k) => k !== DARK && k !== SIDE)[0];
  const ovEmpty = CS.officialRecord(PID, emptyKey);
  eq((ovEmpty.record || {}).total || 0, 0, "fixture: the control issue really has nothing mapped");
  ok(LED.unscored(ovEmpty) === false, "an issue with nothing on file is not called 'on record'");
}
ok(LED.unscored(null) === false, "a missing read is not a ledger row");
ok(LED.unscored({}) === false, "an empty read is not a ledger row");
// A row still loading its votes is not a finding about the record either way.
ok(LED.unscored({ token: "pending", record: { total: 3, hasStance: false } }) === false,
  "a pending row is never labelled 'not in Direction Match' — the record has not arrived");
for (const tok of ["consistent", "contradicts", "mixed"]) {
  ok(LED.unscored({ token: tok, record: { total: 4, hasStance: false } }) === false,
    `a ${tok} row is scored and can never be labelled unscored, whatever its stance flags say`);
}
// The two independent stance flags each veto on their own, so a disagreement
// between them can only ever resolve toward "this is scored".
ok(LED.unscored({ token: "limited", hasStance: true, record: { total: 4, hasStance: false } }) === false,
  "the read's own hasStance vetoes the ledger label");
ok(LED.unscored({ token: "limited", hasStance: false, record: { total: 4, hasStance: true } }) === false,
  "the record summary's hasStance vetoes the ledger label");

// THE SWEEP. Across the whole roster and every issue: a row the ledger calls
// unscored must not be a tested row in Word vs Action, and must have no stated
// position. One counterexample anywhere is the bug this predicate exists to prevent.
{
  const pids = Object.keys(A.CMP_DATA || {});
  let ledRows = 0, testedRows = 0, swept = 0;
  for (const pid of pids) {
    let rows = [];
    try { rows = CS.issueRows(pid) || []; } catch (e) { rows = []; }
    for (const row of rows) {
      const key = row && row.key;
      if (!key) continue;
      swept++;
      let ov = null, res = null;
      try { ov = CS.officialRecord(pid, key); } catch (e) { continue; }
      try { res = CS.rowResult(row); } catch (e) { res = null; }
      const led = LED.unscored(ov);
      if (res && res.state === "tested") {
        testedRows++;
        ok(led === false,
          `${pid}/${key}: a TESTED row is labelled 'not in Direction Match' — the score and the ledger disagree`);
      }
      if (led) {
        ledRows++;
        ok(!res || res.state !== "tested", `${pid}/${key}: ledger row is also a tested row`);
        ok(!A._polPositionMap || !((A._polPositionMap(pid, A.CMP_DATA[pid]) || {})[key] || {}).stance,
          `${pid}/${key}: called unscored for lack of a stated position, but a stated position is on file`);
      }
    }
  }
  must(swept > 0, "the roster sweep reached no rows at all");
  must(testedRows > 0, "the roster sweep found no tested rows — the negative case would be vacuous");
  console.log(`  ${swept} issue rows swept · ${testedRows} tested · ${ledRows} on record and outside the score`);
}

// ── 2 · the copy, exactly ────────────────────────────────────────────────────
section("2 · the copy: one wording, said the same way everywhere");

eq(LED.LED.status, "On record · not in Direction Match", "the row standing is worded exactly this way");
eq(LED.LED.full, "On record · not in Direction Match (no stated position to test)",
  "the full standing names the reason in the reader's own terms");
eq(LED.LED.notScore, "Counts of mapped directions, not a score.",
  "every count of directions carries this disclaimer verbatim");
eq(LED.dirPhrase("advances", DARK), "mapped as advancing " + A.ISSUE_MAP[DARK].label,
  "direction is stated about the mapping, in the requirement's own words");
eq(LED.dirPhrase("opposes", DARK), "mapped as opposing " + A.ISSUE_MAP[DARK].label,
  "…and the same on the other side");
eq(LED.dirPhrase("", DARK), "", "no direction on file produces no sentence at all");
eq(LED.dirLong("advances", DARK), "Mapped as advancing " + A.ISSUE_MAP[DARK].label + ".",
  "the standalone sentence is the clause, capitalised and closed");
eq(LED.dirShort("advances"), "▲ Advances", "the short form is the issue's direction, not a grade");
eq(LED.dirShort("opposes"), "▼ Cuts against", "…and the same on the other side");
eq(LED.dirShort(""), "", "an unreadable instrument gets no pill");

// The ledger's own vocabulary must never make a claim about the person. These are
// the sentences that would turn a vote map into a personal creed.
{
  const strings = [LED.LED.status, LED.LED.full, LED.LED.notScore,
    LED.dirPhrase("advances", DARK), LED.dirPhrase("opposes", DARK),
    LED.splitLine(LED.split(PID, DARK, ovDark), DARK),
    LED.rowVerdict(ovDark).why].join(" ").toLowerCase();
  for (const bad of ["they support", "they oppose", "they believe", "their position",
    "broke with", "kept their promise", "promised", "democrat", "republican", "party",
    "caucus", "loyalty", "unity"]) {
    lacks(strings, bad, `ledger copy never says "${bad}"`);
  }
  has(strings, "mapped as advancing", "…and it does say what it is: a mapping, not a belief");
}

// ── 3 · count = list, on a row with nothing stated ───────────────────────────
section("3 · six votes claimed, six votes listed");

const dossier = String(CS.dossierRecordsHtml(PID, DARK));
const dossierTxt = txt(dossier);
const items = CS.dossierItems(PID, DARK);
eq(items.length, 6, "the dossier normalises all six instruments on the dark issue");
for (const d of items) {
  has(dossier, d.ident, `the enumeration names ${d.ident}`);
  has(dossierTxt, d.date, `${d.ident} carries its date on the row face`);
  has(dossierTxt, d.act, `${d.ident} carries what they did on the row face`);
}
eq((dossier.match(/class="pdxdos-rec"/g) || []).length, 6,
  "six rows are rendered — the drawer cannot open onto fewer than it advertised");
has(dossierTxt, "6 votes listed here", "the closed face states the depth before anything is opened");

const orSec = String(CS.officialRecordSectionHtml(PID, A.CMP_DATA[PID]));
const orRow = orSec.split(/(?=<details class="pdxor-issue pdxor-row")/)
  .filter((p) => (p.match(/data-pdxc-row="([^"]+)"/) || [])[1] === DARK)[0];
must(orRow, "the dark issue no longer renders a row in the Official Record section");
const orTxt = txt(orRow);
for (const d of items) has(orTxt, d.ident, `the profile row lists ${d.ident} too`);
eq((orRow.match(/class="pdxor-act"/g) || []).length, 6,
  "the profile row's open evidence list holds all six, not a top pick");

// ── 4 · direction on every row ───────────────────────────────────────────────
section("4 · which way each one cut, on the face");

const split = LED.split(PID, DARK, ovDark);
eq(split.listed, 6, "the split counted every listed instrument");
eq(split.advances, 5, "five of them advance the issue");
eq(split.opposes, 1, "one cuts against it");
eq(split.unclear, 0, "none of them is unreadable in this fixture");
eq(split.held, 0, "none of them is held in this fixture");
eq(split.directional, 6, "the directional denominator is what it counted, not what was claimed");
eq(LED.splitSay(split), "5 advancing · 1 opposing", "the chip-length split says both sides");
eq(LED.splitLine(split, DARK),
  "Mapped directions on " + A.ISSUE_MAP[DARK].label +
  ": 5 advance it, 1 cuts against it. Counts of mapped directions, not a score.",
  "the sentence names the issue, both sides, and what it is not");

// Every instrument's direction agrees with the one primitive, item by item — so a
// pill on a row face can never disagree with the count in the summary.
{
  let adv = 0, opp = 0;
  for (const d of items) {
    const dir = LED.itemDir(d.item, d.lane, DARK);
    ok(dir === "advances" || dir === "opposes",
      `${d.ident}: the mapping establishes a direction on this issue`);
    const expect = (String((d.item || {}).position || "").toLowerCase() === "yea") ? "advances" : "opposes";
    eq(dir, expect, `${d.ident}: a Yea on a yea_supports mapping advances the issue`);
    if (dir === "advances") adv++; else opp++;
  }
  eq(adv, split.advances, "the per-item directions add up to the split's advancing count");
  eq(opp, split.opposes, "…and to its opposing count");
}
eq((dossier.match(/class="pdxdos-rec-dir"/g) || []).length, 6,
  "every dossier row face carries its own direction");
eq((dossier.match(/▲ Advances/g) || []).length, 5, "five advancing pills on the dossier faces");
eq((dossier.match(/▼ Cuts against/g) || []).length, 1, "one cutting-against pill");
ok((orRow.match(/▲ Advances/g) || []).length + (orRow.match(/▼ Cuts against/g) || []).length >= 6,
  "the profile row prints a direction for every instrument it lists");
has(dossierTxt, "5 advancing · 1 opposing",
  "the closed face shows the shape of the record without opening anything");

// ── 5 · the label is honest ──────────────────────────────────────────────────
section("5 · an untested record does not wear a said-vs-did verdict");

const LIMITED = A.PDXConsistency.VERDICTS.limited.label;
eq(LIMITED, "Limited record", "fixture: the borrowed word is still the one under test");
lacks(dossierTxt, LIMITED,
  "no row on an unscored issue reads 'Limited record' — nothing was tested to be found limited");
has(dossierTxt, LED.LED.status, "each row says what is actually true of it instead");
eq((dossier.match(/class="pdxdos-rec-vd pdxdos-rec-led"/g) || []).length, 6,
  "all six rows carry the ledger standing in the verdict slot");
has(dossierTxt, LED.LED.full, "and the drawer states the reason once, in full, above the rows");
// The direction line stops teaching a said-vs-did lesson where nothing was said.
lacks(dossierTxt, "which is why this row reads",
  "an unscored row never explains a verdict it does not have");
has(dossierTxt, "mapped as advancing " + A.ISSUE_MAP[DARK].label,
  "it ends record-relative instead");

// The profile row's chip and reason line.
has(orTxt, LED.LED.status, "the profile row's record chip states the ledger standing");
lacks(orTxt, "Record: " + LIMITED, "…and no longer calls the record limited");
has(orTxt, "That is our coverage, not a verdict.",
  "the reason line names the absence as coverage rather than a finding");
has(orTxt, "on record and listed in full below", "…and points at the record it is not hiding");
// The reason line still names the missing side in the words the Official Record's
// own contract pins (scripts/test-or-proof.mjs). Repeated here so a rewrite of this
// sentence fails in the file that owns it as well as in the one that guards it.
has(LED.rowVerdict(ovDark).why, "not stated a position",
  "the reason names the absent stated position, not a defect in the record");
has(orTxt, "no position on record", "the says-chip states the missing side plainly");

// ── 6 · the scored issue is untouched ────────────────────────────────────────
section("6 · a scored issue still teaches said-vs-did");

const spokenDos = txt(CS.dossierRecordsHtml(PID, SPOKEN));
const spokenRow = orSec.split(/(?=<details class="pdxor-issue pdxor-row")/)
  .filter((p) => (p.match(/data-pdxc-row="([^"]+)"/) || [])[1] === SPOKEN)[0];
must(spokenRow, "the spoken issue no longer renders a row");
const spokenTxt = txt(spokenRow);
has(spokenTxt, "Record: Backed it up", "the scored row keeps its said-vs-did verdict");
has(spokenTxt, "100%", "…and its percentage");
lacks(spokenTxt, LED.LED.status, "the ledger standing never appears on a scored row");
lacks(spokenDos, LED.LED.status, "…nor in its dossier");
has(spokenDos, "which is why this row reads", "the said-vs-did lesson is intact where a position was stated");
has(spokenDos, "Backs it up", "…naming the verdict it produced");
// The ledger's own additions — direction pills and the direction count — are facts
// about the mapping and are welcome on a scored row. What must not follow them is a
// second verdict.
has(spokenDos, "7 advancing", "a scored row may still show the shape of its record");
lacks(spokenDos, "not in Direction Match", "…but never claims to be outside the score");

// ── 7 · it is not a second score ─────────────────────────────────────────────
section("7 · counts, never a rate");

// Nothing the ledger renders prints a percentage. The scored row's own 100% is
// checked above and lives on a different surface; this is about the ledger chrome.
for (const [name, html] of [["the dossier drawer", dossier], ["the profile row", orRow]]) {
  const ledChrome = String(html)
    .split(/(?=<div class="pdxdos-led"|<div class="pdxor-why)/)
    .filter((p) => /^<div class="(pdxdos-led|pdxor-why)/.test(p))
    .map((p) => p.slice(0, p.indexOf("</div>") + 6)).join(" ");
  must(ledChrome.length > 200, `${name}: the ledger chrome could not be isolated — the check would be vacuous`);
  ok(!/\d+(\.\d+)?\s*%/.test(txt(ledChrome)), `${name}: no percentage anywhere in the ledger chrome`);
}
has(dossierTxt, LED.LED.notScore, "the drawer says in as many words that the split is not a score");
has(orTxt, LED.LED.notScore, "…and so does the profile row");
// The forbidden framings, over everything the ledger rendered.
for (const bad of ["party unity", "with their caucus", "voted with", "loyalty", "integrity score",
  "voting score", "accountability score", "% of votes", "record score"]) {
  lacks(dossierTxt.toLowerCase(), bad, `the dossier never says "${bad}"`);
  lacks(orTxt.toLowerCase(), bad, `the profile row never says "${bad}"`);
}
// …and over the source, so a later edit cannot add one quietly.
{
  const src = CODE("consistency.js");
  const block = src.slice(src.indexOf("var _LED = {"), src.indexOf("function _ledSplitLine") + 900);
  must(block.length > 500, "the ledger source block could not be located");
  ok(!/%/.test(block), "the ledger lane's own source contains no percent sign at all");
  for (const bad of ["party", "caucus", "loyalty"]) {
    lacks(block.toLowerCase(), bad, `the ledger lane never reaches for "${bad}"`);
  }
}

// ── 8 · held instruments stay visible ────────────────────────────────────────
section("8 · what cannot be judged is still listed");

// The executive lane is where holds actually occur — an order under an injunction,
// a circular pairing, an unmapped direction. Discovered rather than hard-coded, so
// the case survives a data change.
{
  let found = null;
  for (const pid of Object.keys(A.CMP_DATA || {})) {
    for (const key of ISSUE_KEYS) {
      let ov = null;
      try { ov = CS.officialRecord(pid, key); } catch (e) { continue; }
      if (!ov || ov.lane !== "exec") continue;
      const its = CS.dossierItems(pid, key) || [];
      if (its.filter((d) => d.held).length) { found = { pid, key, its, ov }; break; }
    }
    if (found) break;
  }
  must(found, "no held executive instrument exists anywhere — section 8's premise is untested");
  const { pid, key, its, ov } = found;
  const held = its.filter((d) => d.held);
  const dHtml = String(CS.dossierRecordsHtml(pid, key));
  const dTxt = txt(dHtml);
  for (const h of held) {
    has(dHtml, h.ident, `${pid}/${key}: the held instrument ${h.ident} is still listed`);
    has(dTxt, h.heldWhy, `${pid}/${key}: …with the reason it could not be judged`);
  }
  has(dTxt, "Not scored", "a held row says so in its own slot rather than borrowing a verdict");
  eq(LED.split(pid, key, ov).held, held.length,
    "the split counts held instruments as held — never silently dropped, never given a side");
  // A held item can never be handed a direction: an instrument we could not judge,
  // shown with an arrow saying which way it cut, is exactly the invented claim the
  // whole lane exists to keep out. Checked at the render, where it would appear.
  const heldRows = dHtml.split(/(?=<details class="pdxdos-rec")/)
    .filter((p) => p.indexOf("pdxdos-rec-hold") > -1);
  must(heldRows.length === held.length,
    `expected ${held.length} held row(s) in the render, found ${heldRows.length}`);
  for (const hr of heldRows) {
    lacks(hr, "pdxdos-rec-dir", "a held row carries no direction pill");
    lacks(hr, "▲ Advances", "…and no advancing claim");
    lacks(hr, "▼ Cuts against", "…and no opposing one");
    has(hr, "Not scored", "…only the hold, said plainly");
  }
  console.log(`  ${pid}/${key}: ${held.length} held instrument(s), all listed with a reason`);
}

// ── 9 · the trail continues out of the sheet ─────────────────────────────────
section("9 · the full history is reachable from the dossier");

has(dossier, 'class="pdxdos-vrlink"', "the dossier offers a door into the full voting record");
has(dossier, 'data-pdxc-vrissue="' + DARK + '"',
  "…filtered to this issue, on the same delegated hook the profile row uses");
has(dossierTxt, "See all 6 mapped votes on " + A.ISSUE_MAP[DARK].label,
  "…worded the same way, so the two doors read as one door");
has(orRow, 'class="pdxor-vrlink"', "the profile row's own door is unchanged");
// The multi-issue measure still opens its cross-issue trail from an unscored row.
has(dossierTxt, "See all 2 readings",
  "a multi-issue measure still opens the instrument trail on a row that is not scored");
// The exec lane has no roll-call list to offer and must not pretend otherwise.
has(String(CS.dossierRecordsHtml(PID, SPOKEN)), 'class="pdxdos-vrlink"',
  "a scored congressional issue gets the door too — the ledger did not take it away");

// ── 10 · the score does not move ─────────────────────────────────────────────
section("10 · every published figure is byte-identical across the whole render");

{
  const pids = Object.keys(A.CMP_DATA || {});
  const snap = (pid) => {
    const r = WA.read(pid, A.CMP_DATA[pid]) || {};
    let rows = [];
    try { rows = CS.issueRows(pid) || []; } catch (e) { rows = []; }
    return JSON.stringify({
      pct: r.pct, publishable: r.publishable, word: r.word, testedWeight: r.testedWeight,
      coverage: r.coverage,
      rows: rows.map((x) => {
        let res = null;
        try { res = CS.rowResult(x); } catch (e) { res = null; }
        return [x.key, (res || {}).state, (res || {}).pct, (res || {}).metric,
          (x.verdict || {}).token || "", (x.verdict || {}).basis || ""];
      }),
    });
  };
  const beforeSnap = {};
  for (const pid of pids) beforeSnap[pid] = snap(pid);
  // Now render every ledger surface there is, for every profile.
  let rendered = 0;
  for (const pid of pids) {
    try { CS.officialRecordSectionHtml(pid, A.CMP_DATA[pid]); rendered++; } catch (e) {}
    for (const key of ISSUE_KEYS) {
      try { CS.dossierRecordsHtml(pid, key); } catch (e) {}
      try { CS.ledger.split(pid, key, CS.officialRecord(pid, key)); } catch (e) {}
    }
  }
  must(rendered > 0, "no Official Record section rendered — the drift check would be vacuous");
  let checked = 0;
  for (const pid of pids) {
    eq(snap(pid), beforeSnap[pid], `${pid}: the published arithmetic is unchanged by rendering the ledger`);
    checked++;
  }
  console.log(`  ${rendered} sections + ${ISSUE_KEYS.length * pids.length} dossiers rendered · ${checked} profiles re-read, none moved`);
}

// The engine files the ledger touches must not have grown a floor, a threshold or a
// weight in the process. The lane is display: it reads the mapping and it counts.
{
  const src = CODE("consistency.js");
  const block = src.slice(src.indexOf("var _LED = {"), src.indexOf("function _ledSplitLine") + 900);
  for (const bad of ["MIN_", "_FLOOR", "weight *", "Math.round", "publishable"]) {
    lacks(block, bad, `the ledger lane does not reach for "${bad}" — it is display, not arithmetic`);
  }
}

// ── 11 · formal lane only ────────────────────────────────────────────────────
section("11 · the ledger is the formal record and nothing else");

{
  // Everything the split counts comes from _dosItems, which is formal by
  // construction — exec documents, roll calls and migrated formal actions. If a
  // public-lane item ever reached it, the lane wall would be gone.
  for (const d of items) {
    ok(d.lane === "record" || d.lane === "exec" || d.lane === "formal",
      `${d.ident} is a formal instrument (lane "${d.lane}")`);
  }
  const src = CODE("consistency.js");
  const block = src.slice(src.indexOf("var _LED = {"), src.indexOf("function _ledSplitLine") + 900);
  for (const bad of ["saydo", "curated", "PDXReceipts", "publicRecord"]) {
    lacks(block, bad, `the ledger lane never reads the public lane ("${bad}")`);
  }
}

// ── done ─────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ vote ledger: ${failures.length} failure(s) of ${passed + failures.length}\n`);
  for (const f of failures.slice(0, 40)) console.error("  · " + f);
  if (failures.length > 40) console.error(`  · …and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(`\n✓ vote ledger: all ${passed} assertions passed — ` +
  `${items.length} instruments on one unscored issue, every one listed with its direction, ` +
  `no score moved`);
