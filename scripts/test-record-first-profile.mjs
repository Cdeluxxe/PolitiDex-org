#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-record-first-profile.mjs — the formal record is the default lens
// ─────────────────────────────────────────────────────────────────────────────
// Before this pass a profile was said-gated. Every issue row waited on a stated
// position: with one, the row got a Direction Match percentage and a verdict;
// without one, it got "Not tested yet" and a grey chip — on a member whose
// Official Record held eighteen roll calls on that exact issue. The record was
// computed, filed, and then not spoken. A reader concluded there was nothing
// there, because that is what the page said.
//
// The pass inverts the hierarchy. What the record did is now stated FIRST, in a
// fixed five-word vocabulary tied to the direction of the acts themselves, and
// the said-versus-did score is a strong secondary read that appears when there
// is a stated half to compare against. This harness holds that inversion to five
// promises:
//
//   1. A FIXED, PUBLISHED VOCABULARY — Supports · Mostly supports · Mixed ·
//      Mostly opposes · Opposes, plus two honest non-characterising states. No
//      free-typed grades, no sixth word, and a documented merge from the engine's
//      own tier buckets rather than a second opinion about them.
//   2. THE ROW LEADS WITH IT — an unscored row that holds formal acts prints the
//      record read above the demoted Direction Match line, with its counts and a
//      door into that issue's Official Record. It never reads "nothing on file".
//   3. THE STRIP SELECTS, AND FAILS CLOSED — up to two most one-sided and two
//      most conflicted issues, by pinned rules, over a set big enough for "most"
//      to mean something. A thin profile gets no strip at all rather than filler.
//   4. THE SAID TRACK STILL SHIPS — where a stance exists, the stance chip, the
//      percentage, the verdict word and the compare block are all still on the
//      row, and the record lead stands down rather than talking over the score.
//   5. NOTHING MOVED THAT SCORES — the whole pass is neutered in a control boot
//      and the Direction Match snapshot over the entire roster is compared byte
//      for byte against the live one.
//
//   node scripts/test-record-first-profile.mjs
//
// No database, no network, no DOM beyond gen-hero-showcase.mjs's shared stub.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

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
  "coverage.js",
  "profile-spine.js",
  "profiles-full.js",
];
const RAW = FILES.map((f) => [f, R(f)]);

// THE CONTROL BOOT (promise 5). The same shipped modules with every entry point
// this pass ADDED disabled at the source: the vocabulary resolver returns null,
// and the record lead and the standout strip throw the moment anything calls
// them. A scoring path that touched any of them would take the exception or read
// the null and the snapshot would move. `hits` is a stale-harness guard: if a
// function is renamed, the control silently stops neutering it and the byte
// comparison below would pass for the wrong reason.
let hits = 0;
function neuter(f, src) {
  const cut = (sig) => {
    if (!src.includes(sig)) return;
    hits++;
    src = src.replace(sig, sig + " throw new Error('neutered');");
  };
  if (f === "stance-helpers.js") {
    const a = "function _recordSays(tierKey, dirWord) {";
    if (src.includes(a)) { hits++; src = src.replace(a, a + " return null;"); }
  }
  if (f === "consistency.js") {
    cut("function _stLeadSlot(r, res) {");
    cut("function _stLeadHtml(r, res, slot) {");
    cut("function _soPick(pid) {");
    cut("function recordStandout(pid) {");
    cut("function recordStandoutHtml(pid) {");
  }
  return src;
}
const NEUTERED = FILES.map((f) => [f, neuter(f, R(f))]);

function bootFrom(pairs) {
  const win = makeSandbox();
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const [f, s] of pairs) vm.runInContext(s, sandbox, { filename: f });
  win.PROFILES = win.CMP_DATA;
  return win;
}
const boot = () => bootFrom(RAW);

const CS_SRC = R("consistency.js");
const SH_SRC = R("stance-helpers.js");
const PF_SRC = R("profiles-full.js");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — ${JSON.stringify(needle)} missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — ${JSON.stringify(needle)} present`);
const lacksI = (hay, needle, msg) =>
  ok(String(hay).toLowerCase().indexOf(String(needle).toLowerCase()) < 0,
    `${msg} — ${JSON.stringify(needle)} present`);
const text = (h) => String(h || "")
  .replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/\s+/g, " ").trim();
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, what) => {
  if (cond) return;
  console.error(`\nSTALE HARNESS: ${what}`);
  process.exit(2);
};

must(hits === 6, `the control boot neutered ${hits} of 6 targets — one was renamed`);

const base = boot();
const CS = base.PDXConsistency;
const WA = base.PDXWordAction;
const SP = base.PDXProfileSpine;
must(CS && CS.recordStandout, "consistency.js does not publish recordStandout");
must(typeof base._recordSays === "function", "stance-helpers.js does not publish _recordSays");
const SAYS = base._PDX_RD_SAYS;
must(SAYS && typeof SAYS === "object", "the says vocabulary is not published");

// ── A seeded congressional record. The roll-call lane arrives after first paint
//    and every real member in the bundle is cold in a sandbox, so the depth cases
//    are seeded the same way test-shape-hero.mjs seeds them: real vote shapes
//    through the real PDXVotingRecord door, never by writing into an index.
const KEYS = Object.keys(base.ISSUE_MAP || {}).filter((k) => !/_balance$/.test(k));
const NO_POLE = base._PDX_RD_NO_POLE || {};
const POLED = KEYS.filter((k) => !NO_POLE[k]);
must(POLED.length >= 20, "the roster no longer offers enough polable issue keys to seed with");

const vote = (n, k, pos) => ({
  kind: "vote", rollcallId: 700 + n, measureId: 800 + n, number: "S. " + (100 + n),
  date: "2025-0" + ((n % 9) + 1) + "-11", action: "On Passage", position: pos,
  isProcedural: false, title: "Measure " + n,
  source: { url: "https://www.congress.gov/roll-call-vote/" + (700 + n), label: "Congress.gov" },
  issues: [{ issueKey: k, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
});
// Every third issue votes both ways, so the conflicted bucket is populated by the
// data rather than asserted into existence.
function seed(nIssues, depth) {
  const out = [];
  let n = 0;
  POLED.slice(0, nIssues).forEach((k, i) => {
    for (let j = 0; j < depth; j++) out.push(vote(n++, k, (i % 3 === 0 && j % 2) ? "nay" : "yea"));
  });
  return out;
}
const SUBJECT = "massie";
function warm(nIssues, depth) {
  const w = boot();
  w.PDXVotingRecord.noteMember(SUBJECT, seed(nIssues, depth));
  return w;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · a fixed vocabulary, published, and merged from the engine's own tiers");
// ═════════════════════════════════════════════════════════════════════════════
{
  const WANT = ["supports", "mostly_supports", "mixed", "mostly_opposes", "opposes"];
  for (const k of WANT) {
    ok(SAYS[k] && SAYS[k].key === k, `the vocabulary is missing the "${k}" reading`);
    ok(SAYS[k] && SAYS[k].characterising === true,
      `"${k}" is published as non-characterising — it is one of the five readings that DO characterise`);
  }
  eq(SAYS.supports.label, "Supports", "the strongest supporting reading is not labelled Supports");
  eq(SAYS.mostly_supports.label, "Mostly supports", "the qualified supporting reading is mislabelled");
  eq(SAYS.mixed.label, "Mixed", "the both-ways reading is mislabelled");
  eq(SAYS.mostly_opposes.label, "Mostly opposes", "the qualified opposing reading is mislabelled");
  eq(SAYS.opposes.label, "Opposes", "the strongest opposing reading is mislabelled");

  // The two honest non-readings. They are in the vocabulary rather than outside it
  // because a surface that has to invent its own word for "we cannot say" is a
  // surface that will eventually invent a sixth grade.
  ok(SAYS.early && SAYS.early.characterising === false,
    "the too-early state is missing, or is published as if it characterised the record");
  ok(SAYS.unread && SAYS.unread.characterising === false,
    "the no-pattern state is missing, or is published as if it characterised the record");

  // Exactly seven. A vocabulary that can grow a member without a test failing is
  // not a fixed vocabulary.
  eq(Object.keys(SAYS).length, 7,
    "the published vocabulary is no longer exactly five readings plus two non-readings");

  // THE MERGE, ASSERTED AS A TABLE. Each of the engine's (tier, direction) pairs
  // resolves to exactly one published reading, and the resolver is the only thing
  // that knows the mapping — no surface re-derives it.
  const M = [
    ["strong", "supports", "supports"],
    ["mostly", "supports", "mostly_supports"],
    ["split", "", "mixed"],
    ["mostly", "opposes", "mostly_opposes"],
    ["strong", "opposes", "opposes"],
    ["thin", "supports", "early"],
    ["none", "", "unread"],
  ];
  for (const [tier, dir, want] of M) {
    const got = base._recordSays(tier, dir);
    eq(got && got.key, want, `the tier "${tier}"/"${dir || "—"}" resolves to the wrong reading`);
  }
  // An unknown tier must fall to the honest non-reading, not to a support word.
  eq(base._recordSays("wat", "supports").key, "unread",
    "an unrecognised tier resolves to a characterising word — the fallback must fail closed");

  // The reader-facing frame, and what it is NOT. "The record indicates" is a claim
  // about a ledger. "Their stance is" would be a claim about a person, invented
  // from votes, which is the one thing this layer may never do.
  eq(base._PDX_RD_SAYS_LEAD, "The record indicates", "the record frame was reworded");
  ok(typeof base._PDX_RD_SAYS_ON === "string" && /record/i.test(base._PDX_RD_SAYS_ON),
    "the short record label no longer names the record");

  // The engine's own tiers still publish the merge, so a tier and its reading can
  // never be fetched from two places and disagree.
  const tier = base._recordPatternTier(
    { token: "record_direction", lead: "advances", judged: 9, advances: 9, opposes: 0,
      primary: 4, total: 9, counted: true, characterised: true, clause: "9 advanced it",
      summary: "", suppressed: 0 }, { noun: { one: "vote", many: "votes" } });
  ok(tier && tier.says && tier.says.key === "supports",
    "the pattern tier does not carry its published reading — a surface would have to guess");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the row leads with the record and demotes the score");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = warm(16, 12);
  const html = w.PDXConsistency.stancesSectionHtml(SUBJECT);
  const rows = {};
  for (const chunk of html.split(/<div class="pdxst-row["\s]/).slice(1)) {
    const k = (chunk.match(/data-pdxst-issue="([^"]*)"/) || [])[1];
    if (k) rows[k] = chunk;
  }
  const model = w.PDXConsistency.issueRows(SUBJECT);
  const disp = w.PDXConsistency.recordPattern.display;
  must(typeof disp === "function", "the record display accessor is no longer published");

  let led = 0, scoredRows = 0, onFileUnscored = 0;
  for (const r of model) {
    const chunk = rows[r.key] || "";
    if (!chunk) continue;
    const d = disp(r);
    const hasLead = chunk.includes("pdxst-lead-go");
    if (r.tested) {
      scoredRows++;
      // PROMISE 4, THE NEGATIVE HALF. Where the score ran, the score leads. The
      // record read is already the chip above the row and printing it twice would
      // put two headline words on one row.
      ok(!hasLead, `${r.key}: a scored row grew a record lead above its own percentage`);
      continue;
    }
    if (!d.onRecord || d.state === "pending") {
      ok(!hasLead, `${r.key}: a row with nothing formal on file printed a record lead anyway`);
      continue;
    }
    onFileUnscored++;
    ok(hasLead, `${r.key}: an unscored row with formal acts on file states no record read`);
    if (!hasLead) continue;
    led++;
    has(chunk, "The record indicates", `${r.key}: the lead does not carry the record frame`);
    // The one sentence that must never appear on this layer.
    lacksI(chunk, "their stance is", `${r.key}: the record lead speaks for the person`);
    lacksI(chunk, "they support", `${r.key}: the record lead speaks for the person`);
    // The word is from the vocabulary, never free text.
    const said = (chunk.match(/data-pdxst-says="([^"]*)"/) || [])[1];
    ok(said === "onfile" || !!SAYS[said],
      `${r.key}: the lead published "${said}", which is not in the vocabulary`);
    const word = (chunk.match(/class="pdxst-lead-v"[^>]*>([^<]*)</) || [])[1];
    const legal = Object.keys(SAYS).map((k) => SAYS[k].label);
    ok(legal.includes(word) || /no clear direction yet/i.test(word),
      `${r.key}: the lead printed "${word}", which is not a published label`);
    // The door. A signal a reader cannot check is a claim.
    has(chunk, 'data-pdxst-focus="record"', `${r.key}: the record lead does not open the record`);
    has(chunk, `data-pdxst-pid="${SUBJECT}"`, `${r.key}: the lead's door carries no subject`);
    has(chunk, `data-pdxst-dos="${r.key}"`, `${r.key}: the lead's door carries no issue`);
    // The Direction Match line is still there, and visibly stepped down.
    has(chunk, "pdxst-r-demoted", `${r.key}: the score line was not demoted under the record lead`);
    has(chunk, "Direction match", `${r.key}: demoting the score deleted it instead`);
    // …and the inventory count does not appear twice in two vocabularies.
    lacks(chunk, "pdxst-lead-d", `${r.key}: the lead re-grew its inventory count`);
  }
  must(led >= 6, `only ${led} rows led with the record — the seeded fixture is too thin to test with`);
  must(scoredRows >= 1, "the seeded fixture produced no scored row — promise 4 would go untested");
  eq(led, onFileUnscored,
    "some unscored row with formal acts on file still says nothing about what the record did");

  // THE HEADLINE COMPLAINT, DIRECTLY. On this profile the words "nothing on file"
  // must not be what a reader takes away from an issue that holds twelve votes.
  const t = text(html);
  ok(!/nothing on file yet[^.]*\bMost/i.test(t),
    "the section still leads a formal-record issue with an absence");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the coverage line counts the record, not only the score");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = warm(16, 12);
  const t = text(w.PDXConsistency.stancesSectionHtml(SUBJECT));
  const pc = w.PDXConsistency.profileCounts(SUBJECT);
  // The old line said "N of M tracked positions have a formal or public record
  // behind them" with N = the SCORED count, which on this profile is false about
  // every issue it excluded. Both facts are now stated, and the record's is first.
  has(t, `${pc.onRecord} of ${pc.total} tracked issues have formal acts on file`,
    "the coverage line does not state how much formal record the profile actually holds");
  // The second figure is the one a reader can count off the rows themselves.
  const scoredRows = (w.PDXConsistency.issueRows(SUBJECT) || []).filter((r) => r.tested).length;
  has(t, `${scoredRows} carry a Direction Match score`,
    "the coverage line's score count disagrees with the number of rows printing a percentage");
  ok(pc.onRecord > scoredRows,
    "the fixture has no unscored-but-on-file issues — the case this line exists for is untested");
  has(t, "The rest still show what the record did",
    "the coverage line leaves the unscored issues reading as empty");
  // …and it names BOTH reasons a row can be unscored. Saying only "nothing stated"
  // would be false about the rows that have a stance and a record too thin to
  // divide, which on this fixture are the majority of them.
  has(t, "nothing was stated to test it against",
    "the coverage line does not name the said-side reason a row is unscored");
  has(t, "could not be divided into a score",
    "the coverage line does not name the record-side reason a row is unscored");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the standout strip selects by pinned rules");
// ═════════════════════════════════════════════════════════════════════════════
{
  const SO = base.PDXConsistency.recordStandout;
  eq(SO.CAP, 2, "the strip no longer caps each side at two");
  ok(Number.isInteger(SO.MIN_ISSUES) && SO.MIN_ISSUES >= 3,
    "the strip's set floor is missing or below three — 'most' over two issues is not a selection");

  const w = warm(16, 12);
  const p = w.PDXConsistency.recordStandout.pick(SUBJECT);
  ok(p.any, "the seeded fixture produced no standouts at all");
  ok(p.consistent.length > 0 && p.mixed.length > 0,
    "one of the two buckets came back empty — half the strip would go untested");
  ok(p.consistent.length <= SO.CAP && p.mixed.length <= SO.CAP,
    "the strip returned more chips than its own cap");
  ok(p.consistentN > p.consistent.length,
    "the fixture has nothing left over — the 'more in the full list' path is untested");

  // Depth floor: no chip may be built from fewer judged acts than the engine's own
  // characterisation floor. The strip borrows that number rather than inventing a
  // second one, so a chip can never be more confident than the tier behind it.
  const floor = w._PDX_RD_MIN_JUDGED;
  eq(p.floor, floor, "the strip invented its own depth floor instead of the engine's");
  for (const x of p.consistent.concat(p.mixed))
    ok(x.judged >= floor, `${x.key}: a chip was built from ${x.judged} judged acts, under the floor`);

  // ONE-SIDED: only characterising, directional tiers, strongest first, then depth.
  for (const x of p.consistent) {
    ok(x.says === "supports" || x.says === "mostly_supports" ||
       x.says === "opposes" || x.says === "mostly_opposes",
      `${x.key}: a one-sided chip published "${x.says}", which is not a one-sided reading`);
    ok(x.minority === 0 || x.minority * 4 <= x.judged,
      `${x.key}: a chip called one-sided has ${x.minority} acts on the other side of ${x.judged}`);
  }
  const rank = (x) => (x.tier === "strong" ? 0 : 1);
  for (let i = 1; i < p.consistent.length; i++) {
    const a = p.consistent[i - 1], b = p.consistent[i];
    ok(rank(a) < rank(b) || (rank(a) === rank(b) && a.judged >= b.judged),
      "the one-sided chips are not ordered strongest-then-deepest");
  }

  // CONFLICTED: ranked by the SMALLER side, so a ten-to-one record can never lead
  // the conflicted bucket just because it is deep.
  for (const x of p.mixed) {
    eq(x.says, "mixed", `${x.key}: a conflicted chip published "${x.says}"`);
    ok(x.minority >= 2, `${x.key}: a conflicted chip has only ${x.minority} acts on its smaller side`);
  }
  for (let i = 1; i < p.mixed.length; i++)
    ok(p.mixed[i - 1].minority >= p.mixed[i].minority,
      "the conflicted chips are not ordered by how much of the record ran the other way");

  // The rendered strip: the chips are doors, and the head does not grade anybody.
  const html = w.PDXConsistency.recordStandout.html(SUBJECT);
  has(html, 'id="pdxsec-standout"', "the strip mounts no anchor for the jump rail");
  const chips = html.match(/class="pdxso-chip[ "]/g) || [];
  eq(chips.length, p.consistent.length + p.mixed.length,
    "the rendered chip count does not match the selection");
  eq((html.match(/data-pdxst-focus="record"/g) || []).length, chips.length,
    "not every chip opens that issue's Official Record");
  const st = text(html);
  has(st, "What the record points to", "the strip lost its heading");
  lacksI(st, "%", "the strip printed a percentage — it is not a second score");
  lacksI(st, "accountability", "the strip reintroduced an accountability composite");
  for (const banned of ["Republican", "Democrat", "party line", "party loyalty", "with their party"])
    lacksI(st, banned, `the strip reintroduced party chrome ("${banned}")`);
  lacksI(st, "their stance", "the strip speaks for the person instead of the record");
  has(st, "not a stated position", "the strip does not disclose that it reads no stated position");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · and fails closed rather than filling the block");
// ═════════════════════════════════════════════════════════════════════════════
{
  const SO = base.PDXConsistency.recordStandout;
  // Nothing on file at all.
  const cold = boot();
  const c = cold.PDXConsistency.recordStandout.pick(SUBJECT);
  eq(c.any, false, "a profile with an unwarmed record produced standouts anyway");
  eq(cold.PDXConsistency.recordStandout.html(SUBJECT), "",
    "a profile with an unwarmed record still mounted a strip");

  // Wide but shallow: eight issues, three votes each, none deep enough to read.
  const shallow = warm(8, 3);
  const s = shallow.PDXConsistency.recordStandout.pick(SUBJECT);
  eq(s.any, false, "a record too shallow to characterise still produced characterised chips");
  eq(shallow.PDXConsistency.recordStandout.html(SUBJECT), "",
    "a record too shallow to characterise still mounted a strip");

  // Deep but narrow: below the set floor, so "most" would be a superlative over a
  // set of one or two. The acts are still on file and still listed by the atlas —
  // this withholds a claim, it does not hide a receipt.
  const narrow = warm(SO.MIN_ISSUES - 1, 12);
  const n = narrow.PDXConsistency.recordStandout.pick(SUBJECT);
  eq(n.enough, false, "a set under the floor was published as enough to select from");
  eq(n.any, false, "a set under the floor still produced standout chips");
  eq(narrow.PDXConsistency.recordStandout.html(SUBJECT), "",
    "a set under the floor still mounted a strip");
  ok(narrow.PDXConsistency.formalPatternIndex.count(SUBJECT) >= SO.MIN_ISSUES - 1,
    "the withheld strip took the atlas rows down with it — ledger-first means the acts stay listed");

  // Exactly at the floor: the strip appears, and its wall stops claiming there is
  // more below than it showed.
  const atFloor = warm(SO.MIN_ISSUES, 12);
  const a = atFloor.PDXConsistency.recordStandout.pick(SUBJECT);
  eq(a.enough, true, "a set exactly at the floor was refused");
  ok(a.any, "a set exactly at the floor produced no chips");
  const wall = text(atFloor.PDXConsistency.recordStandout.html(SUBJECT));
  const picked = a.consistent.length + a.mixed.length;
  if (picked >= a.consistentN + a.mixedN) {
    has(wall, SO.WALL_WHOLE, "the strip promised standouts beyond the ones it showed");
    lacks(wall, SO.WALL_TAIL, "the strip claims a selection it did not make");
  } else {
    has(wall, SO.WALL_TAIL, "the strip does not say it is showing a selection");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · one standout block per profile, and it mounts ahead of the score");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The shape hero already lists the same rows at caps of four and three for
  // members deep enough to clear its own gate. Two standout blocks on one profile
  // is the same finding twice in two voices, so the strip stands down there.
  const deep = warm(20, 12);
  ok(deep.PDXWordAction.shapeApplies(SUBJECT),
    "the deep fixture no longer clears the shape hero's gate — the overlap case is untested");
  const shallow = warm(8, 12);
  ok(!shallow.PDXWordAction.shapeApplies(SUBJECT),
    "the mid-depth fixture now clears the shape hero's gate — the strip-only case is untested");
  ok(shallow.PDXConsistency.recordStandout.html(SUBJECT).length > 0,
    "the strip does not mount on a profile the shape hero declines");
  // The stand-down is in the mount, not in the module: the strip stays callable so
  // the hero and the strip can never disagree about the selection.
  // Bounded to the stage block itself rather than a character count: the standout
  // stage is a summary now, not an atlas, so its prose grew and its markup shrank,
  // and a fixed window would have measured the comment instead of the mount.
  const soFrom = PF_SRC.indexOf("<!--PDXSP:standout-->");
  const mount = PF_SRC.slice(soFrom, PF_SRC.indexOf("<!--PDXSP:", soFrom + 8));
  has(mount, "shapeApplies",
    "the profile body mounts the strip without asking whether the shape hero already did this");
  has(mount, "recordStandout",
    "the standout stage stopped mounting the standout strip");
  // AND NOTHING ELSE. The stage carries one summary. The 33-row formal atlas used
  // to mount here too, directly under a strip capped at two chips — a flat wall of
  // every issue on the record, printed above the tree that exists to browse it.
  lacks(mount, "formalPatternIndex",
    "the flat formal atlas is mounted in the standout stage again — the summary stage is a summary, and\n" +
    "    an every-issue inventory beside a two-chip strip is the parallel wall this pass removed");
  lacks(mount, "pdxsec-formalatlas",
    "the standout stage carries the formal-atlas anchor again");

  // The spine. The record's own stage sits between the brief and the verdict.
  const keys = SP.STAGE_KEYS;
  ok(keys.indexOf("standout") === keys.indexOf("brief") + 1,
    "the record stage is not the first major surface after the brief");
  ok(keys.indexOf("standout") < keys.indexOf("verdict"),
    "the record stage does not precede the said-versus-did score");
  eq(SP.targetStage("pdxsec-standout"), "standout",
    "the strip's anchor is not routed to its own stage");
  eq(SP.targetStage("pdxsec-formalatlas"), "explore",
    "the formal atlas did not move with the stage it belongs to — it is a way of exploring the record,\n" +
    "    and it now sits collapsed under the topic tree rather than flat above it");
  eq(SP.targetStage("pdxsec-stancetree"), "explore",
    "the topic tree is not routed to the gateway stage it now leads");
  ok(keys.indexOf("explore") === keys.indexOf("standout") + 1 &&
     keys.indexOf("explore") < keys.indexOf("verdict"),
    "the gateway does not follow the summary directly and lead the score — summary, browse, then judgment");
  // Demoted is not deleted.
  ok(keys.indexOf("verdict") >= 0, "the Word vs Action stage was removed rather than demoted");
  const stage = SP.STAGES.find((x) => x.key === "standout");
  ok(stage && /record/i.test(stage.label) && /record/i.test(stage.ask),
    "the record stage's rail label and reader question do not name the record");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the said track still ships wherever there is a said half");
// ═════════════════════════════════════════════════════════════════════════════
{
  // trump: 35 of 37 issues scored, the densest said-plus-record profile shipped.
  const html = CS.stancesSectionHtml("trump");
  const model = CS.issueRows("trump");
  const rows = {};
  for (const chunk of html.split(/<div class="pdxst-row["\s]/).slice(1)) {
    const k = (chunk.match(/data-pdxst-issue="([^"]*)"/) || [])[1];
    if (k) rows[k] = chunk;
  }
  let scored = 0;
  for (const r of model) {
    if (!r.tested) continue;
    const chunk = rows[r.key] || "";
    if (!chunk) continue;
    scored++;
    has(chunk, `>${r.verdict.score}%</span>`, `trump/${r.key}: the score vanished from a scored row`);
    has(chunk, "pdxst-metric", `trump/${r.key}: the scored row no longer names its metric`);
    has(chunk, "pdxor-stance", `trump/${r.key}: the stated position was dropped from a scored row`);
  }
  must(scored >= 20, `only ${scored} trump rows are scored — the said-track case is too thin`);

  // The profile-level Direction Match read is untouched and still published.
  const hero = WA.heroRead("trump", base.CMP_DATA.trump);
  ok(hero && typeof hero.pct === "number",
    "the profile Direction Match percentage stopped publishing");
  // …and the record lead never appears on a row that already has one.
  const leadsOnScored = Object.keys(rows).filter((k) => {
    const r = model.find((x) => x.key === k);
    return r && r.tested && rows[k].includes("pdxst-lead-go");
  });
  eq(leadsOnScored.length, 0,
    `${leadsOnScored.length} scored rows grew a record lead over their own percentage`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · nothing that scores moved — the whole pass, neutered, byte for byte");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The snapshot: for every politician in the bundle, the profile percentage, the
  // hero verdict token, the coverage read, the whole verdict tally, and every
  // issue row's (key, tested, scored, token, score, tier). If any of the new code
  // reached a scoring path, one of ~750 lines moves.
  const snap = (w) => {
    const C = w.PDXConsistency, W = w.PDXWordAction;
    return Object.keys(w.CMP_DATA).sort().map((pid) => {
      let h = null;
      try { h = W.heroRead(pid, w.CMP_DATA[pid]); } catch (e) { h = { err: String(e) }; }
      let rows;
      try {
        rows = (C.issueRows(pid) || []).map((r) => [r.key, r.tested ? 1 : 0, r.scored ? 1 : 0,
          r.verdict && r.verdict.token, r.verdict && r.verdict.score, r.tier].join("~"));
      } catch (e) { rows = [String(e)]; }
      let t;
      try { t = C.verdictTally(pid); } catch (e) { t = { err: String(e) }; }
      let pc = null;
      try { pc = C.profileCounts(pid); } catch (e) { pc = null; }
      return JSON.stringify({ pid, pct: h && h.pct, hv: h && h.verdict && h.verdict.token,
        cov: h && h.coverage, tally: t, rows,
        s: pc && pc.scored, t2: pc && pc.tested, o: pc && pc.onRecord });
    }).join("\n");
  };
  const live = snap(boot());
  const ctl = snap(bootFrom(NEUTERED));
  must(live.split("\n").length > 300, "the snapshot covers implausibly few profiles");
  eq(live.length === ctl.length && live === ctl, true,
    "the Direction Match snapshot moved when the pass was neutered — something new is on a scoring path");
  if (live !== ctl) {
    const a = live.split("\n"), b = ctl.split("\n");
    for (let i = 0; i < a.length && i < 6; i++)
      if (a[i] !== b[i]) failures.push(`    first divergence: ${a[i].slice(0, 160)}`);
  }
  console.log(`     ${live.split("\n").length} profiles snapshotted · identical under the control boot`);

  // The same comparison on a WARM member, where the strip and the lead both fire.
  // The cold snapshot above proves the code is unreachable; this proves it is
  // inert even when every one of its branches has run.
  const warmSnap = (pairs) => {
    const w = bootFrom(pairs);
    w.PDXVotingRecord.noteMember(SUBJECT, seed(16, 12));
    const C = w.PDXConsistency;
    try { C.stancesSectionHtml(SUBJECT); } catch (e) {}
    return JSON.stringify({
      tally: C.verdictTally(SUBJECT),
      pct: (w.PDXWordAction.heroRead(SUBJECT, w.CMP_DATA[SUBJECT]) || {}).pct,
      rows: (C.issueRows(SUBJECT) || []).map((r) =>
        [r.key, r.tested ? 1 : 0, r.verdict && r.verdict.token, r.verdict && r.verdict.score].join("~")),
    });
  };
  eq(warmSnap(RAW), warmSnap(NEUTERED),
    "a warm member's Direction Match read moved when the pass was neutered");
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · ledger-first still holds, and no new number was invented");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = warm(16, 12);
  // Every issue the atlas can read is still listed by the atlas, whatever the
  // strip picked. The strip is a shortcut into the list, never a filter over it.
  const rows = w.PDXConsistency.formalPatternIndex.rows(SUBJECT, { sort: "strength" });
  const p = w.PDXConsistency.recordStandout.pick(SUBJECT);
  const picked = new Set(p.consistent.concat(p.mixed).map((x) => x.key));
  const listed = new Set(rows.map((x) => x.key));
  for (const k of picked) ok(listed.has(k), `${k}: the strip surfaced an issue the atlas does not list`);
  ok(rows.length >= picked.size, "the atlas lists fewer issues than the strip picked from it");

  // No new percentage anywhere in the added code. Grepped at source, because the
  // renderer is where one would appear first.
  const added = CS_SRC.slice(CS_SRC.indexOf("function _soPick"), CS_SRC.indexOf("── THE FILTERS ──"));
  must(added.length > 1000, "the standout block moved — this source slice is stale");
  ok(!/'%'|"%"|\+ '%'|pct/.test(added.replace(/\/\/.*$/gm, "")),
    "the standout block computes or prints a percentage");
  ok(!/loyalty|party/i.test(added.replace(/\/\/.*$/gm, "")),
    "the standout block reintroduced party framing");

  // The lead renderer is render-only: no writes to any position map, no scoring.
  const lead = CS_SRC.slice(CS_SRC.indexOf("function _stLeadSlot"), CS_SRC.indexOf("function _stResultHtml"));
  must(lead.length > 500, "the record lead moved — this source slice is stale");
  ok(!/\.stance\s*=|\.verdict\s*=|\.score\s*=|\.pct\s*=/.test(lead),
    "the record lead writes back into a row's stance, verdict, score or percentage");
  has(SH_SRC, "_recordSays", "the vocabulary resolver is no longer in stance-helpers.js");
}

if (failures.length) {
  console.error(`\n✗ record-first profile — ${failures.length} of ${passed + failures.length} assertions failed:\n`);
  failures.forEach((f) => console.error("  · " + f));
  console.error("");
  process.exit(1);
}
console.log(`\n✓ record-first profile — ${passed} assertions passed\n`);
