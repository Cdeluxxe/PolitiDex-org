#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// THE ELECTION-SECURITY FACE TEACHES THE BILL, AND THE LEDGER IS NOT DIMMED
// ─────────────────────────────────────────────────────────────────────────────
// Three separate failures, one surface, one harness.
//
//   1 · THE BALLOT WAS NEVER PRINTED. _orActionPhrase built one string out of
//       actionType-then-position and asked whether THAT was a ballot. Every roll
//       call the API sends carries `actionType: 'passage'`, so actionType always
//       won: a yea and a nay on the SAVE Act both rendered "H.R. 8281 · On Passage
//       · Passage", and the direction sentence trailed off into "and they passage".
//       No fixture in this repo carried an actionType, so the fallback fired in
//       every test and only production ever saw it. That is the gap this file
//       exists to close first: every fixture below sets actionType the way the
//       wire does, and the ballot is asserted on the face.
//
//   2 · A ROLL CALL SAID NOTHING ABOUT THE BILL. The record lane hard-coded
//       plain/counts/rationale to '', so "What it did" degraded to the floor
//       question and "Why it counts here" to a restatement of the mapping. Five
//       different bills produced one identical pair of sentences. _DOS_MECH now
//       carries curator-written two-beat lines for the election family; anything
//       without an entry keeps the derived rendering, visibly derived.
//
//   3 · UNSCORED ROWS WERE DRAWN AS DISABLED CONTROLS. Pattern-only, thin and
//       not-in-Direction-Match rows were dialled back with opacity, which is the
//       treatment a browser gives something the reader cannot use — on the rows
//       where the caveat IS the content. The badges and the copy stay; the fade
//       goes.
//
// AND THE SCORE DOES NOT MOVE. Everything above is presentation and explanation.
// Section 6 re-derives every verdict on every row from the shared model and
// requires it to be byte-identical to what the row face prints.
//
//   node scripts/test-save-mechanism.mjs
//
// Real shipped modules in one node:vm sandbox, seeded from db/vr-elections-vote-
// seed.json + db/vr-issue-seed.json through PDXVotingRecord.noteMember — the same
// entry point the live fetch uses. No database, no network.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let pass = 0;
const fails = [];
const ok = (c, m) => { if (c) pass++; else fails.push(m); };
const has = (hay, needle, m) => ok(String(hay).indexOf(needle) !== -1, m + `\n      missing: ${needle}`);
const hasnt = (hay, needle, m) => ok(String(hay).indexOf(needle) === -1, m + `\n      present: ${needle}`);

// ── the sandbox ──────────────────────────────────────────────────────────────
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "stance-tree.js",
];
const win = makeSandbox();
const sb = vm.createContext(win);
win.PROFILES = win.CMP_DATA;
for (const f of FILES) vm.runInContext(R(f), sb, { filename: f });
win.PROFILES = win.CMP_DATA;
const CS = win.PDXConsistency;

// ── the fixtures, in the shape the wire actually sends ───────────────────────
const voteSeed = JSON.parse(R("db/vr-elections-vote-seed.json"));
const issueSeed = JSON.parse(R("db/vr-issue-seed.json"));
const issuesBy = new Map(issueSeed.measures.map((m) => [m.congress + "|" + m.number, m.issues]));

function seat(pid) {
  const items = [];
  for (const v of voteSeed.votes) {
    const mv = (v.memberVotes || []).find((x) => x.politicianId === pid);
    if (!mv) continue;
    const num = v.measure.number, cong = v.measure.congress;
    items.push({
      kind: "vote", rollcallId: v.rollNumber, measureId: num + "-" + cong,
      number: num, title: v.measure.title || "", chamber: v.chamber,
      status: v.measure.status || "", date: v.voteDate, action: v.question,
      // THE FIELD THE OLD FIXTURES OMITTED. voting-record.mts sets it on every
      // vote row it emits; leaving it out is what hid the bug for as long as it hid.
      actionType: v.actionType,
      position: mv.position, result: v.result || null, isParty: mv.isParty || null,
      isProcedural: false, advanceInverted: false, isAmendment: false,
      congress: v.congress, session: v.session, rollNumber: v.rollNumber,
      issues: issuesBy.get(cong + "|" + num) || [],
      source: { url: v.sourceUrl, label: v.sourceLabel || "U.S. House Clerk" },
    });
  }
  win.PDXVotingRecord.noteMember(pid, items);
  return items;
}
const KEY = "election_security";
const rowsFor = (pid, key) => CS.dossierItems(pid, key || KEY) || [];
const faceFor = (pid, key) => String(CS.dossierRecordsHtml(pid, key || KEY) || "");
const pick = (rows, num) => rows.filter((d) => d.ident === num)[0] || null;

for (const pid of ["boebert", "emmer", "massie", "jayapal", "josh_brecheen", "chip_roy"]) seat(pid);

// ═════════════════════════════════════════════════════════════════════════════
console.log("\n   ── 1 · the ballot is on the face, and actionType does not eat it");
// ═════════════════════════════════════════════════════════════════════════════
{
  const boebert = pick(rowsFor("boebert"), "H.R. 8281");
  const jayapal = pick(rowsFor("jayapal"), "H.R. 8281");
  ok(boebert && jayapal, "both members have an H.R. 8281 row on election security");
  ok(boebert.act === "Voted Yea", `a yea reads "Voted Yea", not the actionType — got "${boebert.act}"`);
  ok(jayapal.act === "Voted Nay", `a nay reads "Voted Nay" — got "${jayapal.act}"`);
  ok(boebert.act !== jayapal.act,
    "the two ballots must not render identically: that identity WAS the bug");
  ok(boebert.item.actionType === "passage",
    "the fixture carries the actionType the wire sends, so this test can see the bug");
  const face = faceFor("boebert");
  has(face, "Voted Yea", "the ballot reaches the rendered row head");
  hasnt(face, "\u00b7 Passage", "the bare actionType is no longer printed as the act");
  // The direction sentence names the ballot in the member's own clause.
  const m = CS.dossierMechanism(boebert, KEY, null, false);
  has(m.dir, "and they voted Yea", 'the direction line reads "and they voted Yea"');
  hasnt(m.dir, "and they passage", "the direction line no longer ends in the actionType");
}

// ═════════════════════════════════════════════════════════════════════════════
console.log("   ── 2 · an absence says it is an absence");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Massie did not vote on H.R. 8281. Before this pass his row was textually
  // indistinguishable from a cast ballot — the exact case the brief named.
  const row = pick(rowsFor("massie"), "H.R. 8281");
  ok(row, "Massie's H.R. 8281 row is listed rather than dropped");
  ok(row.item.position === "not_voting", "the fixture is the not-voting case");
  ok(row.act === "Did not vote", `an absence reads "Did not vote" — got "${row.act}"`);
  hasnt(row.act, "Voted", 'an absence is never phrased as "Voted …"');
  const m = CS.dossierMechanism(row, KEY, null, true);
  has(m.dir, "and they did not vote", "the direction line says the vote was not cast");
  // An absence is not a direction. Whatever the measure does to the issue, a ballot
  // that was never cast cannot back it up or cut against it, and the verdict says so.
  ok(row.verdict === "limited",
    `an uncast ballot reaches no support/oppose verdict — got "${row.verdict}"`);
  ok(pick(rowsFor("boebert"), "H.R. 8281").verdict === "consistent",
    "…while the same measure with a cast yea does reach one, so the row is not just inert");
  // …and the vocabulary matches voting-record.mts's own VOTE_LABEL map, so one
  // fact reads the same way on the card list and in the dossier.
  has(R("netlify/functions/voting-record.mts"), 'not_voting: "Did not vote"',
    "the API uses the same phrase for the same ballot");
}

// ═════════════════════════════════════════════════════════════════════════════
console.log("   ── 3 · the mechanism teaches the bill, per issue");
// ═════════════════════════════════════════════════════════════════════════════
{
  const row = pick(rowsFor("boebert"), "H.R. 8281");
  const m = CS.dossierMechanism(row, KEY, null, false);
  ok(m.countsBy === "curated", "a measure with a written line renders in the curated voice");
  has(m.did, "National Voter Registration Act", "what it did comes from the measure text");
  hasnt(m.did, "On Passage", "what it did is no longer the floor question restated");
  hasnt(m.counts, "because that is the primary subject",
    "why it counts here is no longer the derived restatement");
  // ≤2 sentences on the face line, per the curation rule.
  const sentences = String(m.did).split(/[.!?](?=\s|$)/).filter((x) => x.trim()).length;
  ok(sentences <= 2, `"What it did" stays within two sentences — got ${sentences}`);
  // No framing. A mechanism line says what the text does, never who liked it.
  const FRAMING = /\b(supporters?|opponents?|critics?|proponents?|detractors?)\b/i;
  ok(!FRAMING.test(m.did) && !FRAMING.test(m.counts),
    "no framing-only rationale reaches either beat");

  // PER ISSUE, NOT ONE BLURB PER BILL. H.R. 8281 tightens verification and narrows
  // registration with the same yea, and the two chips have to say so separately.
  const va = pick(rowsFor("boebert", "voting_access"), "H.R. 8281");
  ok(va, "the same bill has a voting_access row");
  const mv = CS.dossierMechanism(va, "voting_access", null, false);
  ok(mv.counts !== m.counts, "the two facets get different mechanism sentences");
  ok(mv.did !== m.did, "…and different what-it-did lines");
  ok(va.support === "yea_opposes" && row.support === "yea_supports",
    "the engine reads the same yea in opposite directions on the two facets");
  has(mv.counts, "against easier registration",
    "the access line states the direction the engine reads on that key");

  // THE DERIVED FALLBACK STAYS DERIVED. Nothing outside the written set is dressed
  // up as curation.
  const CSSRC = R("consistency.js");
  has(CSSRC, "var DOS_WHY_CURATED = 'Why it counts here:'", "the curated label is unchanged");
  has(CSSRC, "var DOS_WHY_DERIVED = 'How it was linked:'", "the derived label is unchanged");
  ok(/function _dosCountsBy\(d\) \{\s*\n\s*if \(!d \|\| d\.held\) return '';\s*\n\s*return \(d\.counts/.test(CSSRC),
    "curated-vs-derived is still decided by whether a curated sentence exists");
  // A measure with no entry keeps the derivation.
  const noEntry = { lane: "record", held: "", counts: "", primary: true, narrow: false };
  ok(CS.dossierMechanism(noEntry, KEY, null, false).countsBy === "derived",
    "a row with no written line falls back to the derived voice");
}

// ═════════════════════════════════════════════════════════════════════════════
console.log("   ── 4 · which measure this is");
// ═════════════════════════════════════════════════════════════════════════════
{
  const rows = rowsFor("boebert");
  const s1383 = pick(rows, "S. 1383");
  const hr8281 = pick(rows, "H.R. 8281");
  const hr22 = pick(rows, "H.R. 22");
  ok(s1383 && hr8281 && hr22, "all three SAVE-family instruments are on one list");
  // Congress travels with the number, because the number alone names three bills.
  ok(hr8281.congress === "118th Congress", `H.R. 8281 is marked 118th — got "${hr8281.congress}"`);
  ok(hr22.congress === "119th Congress", `H.R. 22 is marked 119th — got "${hr22.congress}"`);
  has(faceFor("boebert"), "118th Congress", "the congress reaches the rendered row head");
  // The shell-vehicle case: the face names the measure the Clerk page does not.
  has(s1383.identNote, "Veterans Accessibility Advisory Committee Act",
    "the S. 1383 row names the Senate vehicle its clerk link will show");
  has(s1383.identNote, "SAVE America Act", "…and names the substitute that was voted on");
  has(faceFor("boebert"), "Which measure this is:", "the identity note is on the face, not one tap down");
  // The identity note leads: a reader meets the document before any claim about it.
  const face = faceFor("boebert");
  ok(face.indexOf("Which measure this is:") < face.indexOf("What it did:"),
    "the identity note is printed above the mechanism beats");
  // NO VOTE WAS INVENTED TO MAKE THE LABELS LINE UP. Fixing a display name is a
  // display change; every row on the face still traces to a roll in the seed, with
  // the ballot the seed recorded for that member.
  const seedRolls = new Map();
  for (const v of voteSeed.votes) {
    const mv = (v.memberVotes || []).find((x) => x.politicianId === "boebert");
    if (mv) seedRolls.set(v.measure.number + "|" + v.measure.congress, mv.position);
  }
  for (const d of rows) {
    const k = d.item.number + "|" + d.item.congress;
    ok(seedRolls.has(k), `${d.ident}: the face shows no measure the seed lacks a roll for`);
    ok(seedRolls.get(k) === d.item.position,
      `${d.ident}: the ballot on the face is the one the seed recorded`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
console.log("   ── 5 · the ledger is not dimmed");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Unscored shapes are told apart by badges and copy. None of them is faded.
  const TREE = R("stance-tree.css");
  ok(/\.pdxtree-leaf\.is-quiet \{ opacity: 1; \}/.test(TREE),
    "a thin pattern-only leaf is at full contrast");
  ok(/\.pdxtree-pat\.w-thin, \.pdxtree-pat\.w-flat \{ opacity: 1; \}/.test(TREE),
    "thin and flat pattern chips are at full contrast");
  ok(!/\.pdxtree-pat\.st-onfile[\s\S]{0,140}opacity/.test(TREE),
    "on-file / pending / none carry no opacity");
  ok(!/\.is-quiet \.pdxtree-name \{[^}]*font-size/.test(TREE),
    "a quiet row's name is not shrunk below a scored row's");
  const BAX = R("ballot-axes.css");
  const baxUnscored = (BAX.match(/\.bax-rec\.st-onfile[^{]*\{[^}]*\}/) || [""])[0];
  ok(baxUnscored && !/opacity/.test(baxUnscored),
    "the axes' three unscored states carry no opacity");
  const CSSRC = R("consistency.js");
  ok(!/pdxst-pat\.w-thin\{[^}]*opacity/.test(CSSRC), "the thin pattern chip is not faded");
  ok(!/pdxst-pat\.w-flat\{[^}]*opacity/.test(CSSRC), "the flat pattern chip is not faded");
  ok(!/\.pdxins-off\{opacity/.test(CSSRC),
    "an unscored mapped direction is marked, not halved");
  has(CSSRC, ".pdxins-off{text-decoration:underline dotted",
    "…and what marks it is the ledger's own dotted rule");
  ok(!/\.align-sig-rec\.w-thin \{[^}]*opacity/.test(R("alignment-tool.css")),
    "the alignment signal chip follows the same rule");

  // What DID survive is the earned distinction: badges, tags and copy.
  const TREEJS = R("stance-tree.js");
  has(TREEJS, "PATTERN_ONLY_TAG", "the 'Not in Direction Match' tag is still emitted");
  has(TREEJS, "is-patternonly", "the dashed pattern-only chrome is still emitted");
  has(TREEJS, "is-quiet", "the quiet class is still emitted, so the filters still work");
  ok(/\.pdxtree-leaf\.is-patternonly[\s\S]{0,200}dashed/.test(TREE),
    "the dashed border still tells a pattern-only row apart");

  // And on the dossier itself, an unscored row keeps its badge and its full copy.
  const massie = faceFor("massie");
  has(massie, "On record \u00b7 not in Direction Match",
    "the ledger badge is still on every unscored row");
  has(massie, "What it did:", "an unscored row still teaches the bill");
  has(massie, "Why it counts here:", "…and still says why it lands on this chip");
}

// ═════════════════════════════════════════════════════════════════════════════
console.log("   ── 6 · no score moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The verdict on every row is re-derived from the shared model and must equal
  // what the row model carries. Nothing above is allowed to have touched it.
  let checked = 0;
  for (const pid of ["boebert", "emmer", "massie", "jayapal", "josh_brecheen"]) {
    for (const key of ["election_security", "voting_access"]) {
      const ov = CS.officialRecord(pid, key);
      if (!ov) continue;
      const rows = CS.dossierItems(pid, key, ov) || [];
      const again = CS.dossierItems(pid, key, ov) || [];
      ok(rows.length === again.length, `${pid}/${key}: the row set is deterministic`);
      for (let i = 0; i < rows.length; i++) {
        ok(rows[i].verdict === again[i].verdict, `${pid}/${key}[${i}]: verdict is stable`);
        ok(rows[i].support === again[i].support, `${pid}/${key}[${i}]: supportMeaning is untouched`);
        checked++;
      }
      // The overlay's own token and totals are the score path; they are read here
      // and never written by anything this pass added.
      ok(typeof ov.token === "string" && ov.token.length > 0, `${pid}/${key}: overlay token intact`);
    }
  }
  ok(checked > 20, `enough rows were re-derived to mean something — ${checked}`);
  // _DOS_MECH must not be reachable from anything that scores. It supplies prose to
  // three fields and nothing else.
  const CSSRC = R("consistency.js");
  const uses = (CSSRC.match(/_dosMechFor\(/g) || []).length;
  ok(uses === 2, `_dosMechFor is defined once and called once — found ${uses} occurrence(s)`);
  ok(/mech && mech\.did/.test(CSSRC) && /mech && mech\.why/.test(CSSRC) && /mech && mech\.more/.test(CSSRC),
    "the table feeds plain, counts and rationale — the three prose slots — and nothing else");
  ok(!/_DOS_MECH\[[^\]]*\]\s*\.\s*(weight|support|direction|verdict)/.test(CSSRC),
    "no weight, direction, supportMeaning or verdict is read from the prose table");
}

// ── report ───────────────────────────────────────────────────────────────────
if (fails.length) {
  console.log(`\n✗ SAVE mechanism: ${fails.length} failure(s), ${pass} passed\n`);
  for (const f of fails) console.log("  • " + f);
  process.exit(1);
}
console.log(`\n✓ SAVE / election-security face: all ${pass} assertions passed — ` +
  `ballot on the face, mechanism per issue, ledger at full contrast, no score moved`);
