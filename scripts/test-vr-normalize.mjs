#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Unit tests for the Voting Record ingest — pure logic + seed integrity.
// ─────────────────────────────────────────────────────────────────────────────
// No database and no network: it transpiles the dependency-free helper module
// (netlify/lib/vr-normalize.ts) with esbuild, then exercises the normalizer, the
// measure-number canonicalizer, chamber derivation, party-crossover flags, and the
// keyword suggester. It also validates the committed member map and issue seed
// against the shipped issue-key allow-list.
//
//   node scripts/test-vr-normalize.mjs
//
// Exit code is non-zero on the first failure so it can gate CI.

import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── Transpile the pure module (TS → ESM) so we can import it directly ─────────
const outDir = mkdtempSync(join(tmpdir(), "vr-test-"));
const outFile = join(outDir, "vr-normalize.mjs");
execFileSync(
  join(ROOT, "node_modules/.bin/esbuild"),
  [
    join(ROOT, "netlify/lib/vr-normalize.ts"),
    "--bundle", "--platform=node", "--format=esm",
    `--outfile=${outFile}`,
  ],
  { stdio: ["ignore", "ignore", "inherit"] }
);
const N = await import(outFile);

// ── Tiny assert harness ───────────────────────────────────────────────────────
let passed = 0;
const failures = [];
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; } else { failures.push(`${msg}\n    expected ${e}\n    got      ${a}`); }
}
function ok(cond, msg) { if (cond) passed++; else failures.push(msg); }

// ── canonicalMeasureNumber ─────────────────────────────────────────────────────
const cmn = N.canonicalMeasureNumber;
eq(cmn("HR 1"), "H.R. 1", "canon: 'HR 1' → 'H.R. 1'");
eq(cmn("H.R.1"), "H.R. 1", "canon: 'H.R.1' → 'H.R. 1'");
eq(cmn("hr1"), "H.R. 1", "canon: 'hr1' → 'H.R. 1'");
eq(cmn("H.R. 1"), "H.R. 1", "canon: already-canonical stays");
eq(cmn("S 5"), "S. 5", "canon: senate bill");
eq(cmn("hjres25"), "H.J.Res. 25", "canon: house joint resolution");
eq(cmn("sconres8"), "S.Con.Res. 8", "canon: senate concurrent resolution");
eq(cmn("samdt123"), "S.Amdt. 123", "canon: senate amendment");
eq(cmn(null), null, "canon: null → null");
eq(cmn("Senate Amendments to H.R. 29"), "Senate Amendments to H.R. 29", "canon: non-matching passes through");

// ── originatingChamber ──────────────────────────────────────────────────────────
eq(N.originatingChamber("HR", "senate"), "house", "chamber: HR → house even when voted in senate");
eq(N.originatingChamber("S", "house"), "senate", "chamber: S → senate");
eq(N.originatingChamber("", "house"), "house", "chamber: unknown → fallback");

// ── normalizeCongressVote: HR 1 voted in the Senate resolves to the house measure ─
const rawSenateHr1 = {
  chamber: "Senate", congress: 119, sessionNumber: 1, rollCallNumber: 100,
  startDate: "2025-07-01T00:00:00Z", url: "https://www.senate.gov/vote/100",
  voteQuestion: "On Passage", result: "Passed",
  legislation: { type: "HR", number: "1", title: "One Big Beautiful Bill Act", url: "https://congress.gov/hr1" },
  members: [
    { bioguideId: "X000001", party: "R", votePosition: "Yea" },
    { bioguideId: "X000002", party: "R", votePosition: "Nay" },
    { bioguideId: "X000003", party: "D", votePosition: "Nay" },
  ],
};
const nv = N.normalizeCongressVote(rawSenateHr1);
ok(nv !== null, "normalize: returns a vote");
eq(nv.measure.number, "H.R. 1", "normalize: number canonicalized to 'H.R. 1'");
eq(nv.measure.chamber, "house", "normalize: measure chamber is originating (house), not the voting chamber");
eq(nv.chamber, "senate", "normalize: roll-call chamber is the voting chamber (senate)");
eq(nv.memberVotes.length, 3, "normalize: keeps all positioned members");
eq(nv.memberVotes[0].position, "yea", "normalize: 'Yea' → 'yea'");

// verifiability gate: a vote with no source URL is dropped
ok(N.normalizeCongressVote({ chamber: "house", congress: 119, rollCallNumber: 1, startDate: "2025-01-01" }) === null,
   "normalize: missing source URL → null");

// ── crossoverFlags: majority-of-party position defines with/against ──────────────
const flags = N.crossoverFlags(nv.memberVotes);
// R caucus is 1 yea / 1 nay → the tie resolves to "yea" as the majority position.
eq(flags.get(nv.memberVotes[0]), "with_party", "crossover: R-yea matches R-majority (tie→yea) → with_party");
eq(flags.get(nv.memberVotes[1]), "against_party", "crossover: R-nay against R-majority (tie→yea) → against_party");
eq(flags.get(nv.memberVotes[2]), "with_party", "crossover: sole D-nay → with own party");

// ── suggestIssue: single-keyword-hit only ────────────────────────────────────────
ok(N.ISSUE_KEYS.has("border_security"), "issue-keys: allow-list loaded");
ok(N.suggestIssue("A bill with no recognizable policy words xyzzy") === null, "suggest: no hit → null");

// ── splitMeasureNumber: bill types split, nomination labels reject ────────────
eq(N.splitMeasureNumber("H.R. 25"), { billType: "hr", num: "25" }, "split: H.R. 25 → hr/25");
eq(N.splitMeasureNumber("S. 1582"), { billType: "s", num: "1582" }, "split: S. 1582 → s/1582");
eq(N.splitMeasureNumber("H.J.Res. 25"), { billType: "hjres", num: "25" }, "split: H.J.Res. 25 → hjres/25");
ok(N.splitMeasureNumber("Patel — FBI") === null, "split: nomination label → null");
ok(N.splitMeasureNumber(null) === null, "split: null → null");

// ── mapCongressActionToStage + normalizeCongressActions: milestone-only, ordered ─
eq(N.mapCongressActionToStage({ text: "Introduced in House", type: "IntroReferral" }), "introduced", "stage: introduced");
eq(N.mapCongressActionToStage({ text: "Passed/agreed to in House: On passage Passed by recorded vote." }), "passed_house", "stage: passed_house");
eq(N.mapCongressActionToStage({ text: "Became Public Law No: 119-1." }), "enacted", "stage: enacted");
ok(N.mapCongressActionToStage({ text: "Motion to reconsider laid on the table Agreed to without objection." }) === null, "stage: procedural noise → null");
const acts = N.normalizeCongressActions(
  [
    { text: "Became Public Law No: 119-1.", actionDate: "2025-01-29", sourceSystem: { code: 9 } },
    { text: "Introduced in House", type: "IntroReferral", actionDate: "2025-01-03", sourceSystem: { code: 2 } },
    { text: "Passed/agreed to in Senate", actionDate: "2025-01-20", sourceSystem: { code: 3 } },
    { text: "Motion to reconsider laid on the table.", actionDate: "2025-01-29" },
    { text: "Passed/agreed to in House: On passage Passed.", actionDate: "2025-01-07", sourceSystem: { code: 2 } },
  ],
  { fallbackSourceUrl: "https://www.congress.gov/bill/119th-congress/house-bill/29/all-actions" }
);
eq(acts.map((a) => a.stage), ["introduced", "passed_house", "passed_senate", "enacted"], "actions: milestones only, in travel order");
ok(acts.every((a) => a.sourceUrl.includes("all-actions")), "actions: every row carries the citable source");
ok(acts[0].chamber === "house" && acts[2].chamber === "senate", "actions: chamber resolved from source system");

// ── canonicalCongressGovUrl: the vote API's bare-number congress segment ───────
// The list endpoint hands back "/bill/119/house-bill/8800"; congress.gov's own
// canonical page is "/bill/119th-congress/house-bill/8800", which is what every
// stored row and curated seed uses.
eq(
  N.canonicalCongressGovUrl("https://www.congress.gov/bill/119/house-bill/8800"),
  "https://www.congress.gov/bill/119th-congress/house-bill/8800",
  "canonUrl: 119 → 119th-congress"
);
eq(
  N.canonicalCongressGovUrl("https://www.congress.gov/amendment/119/house-amendment/85"),
  "https://www.congress.gov/amendment/119th-congress/house-amendment/85",
  "canonUrl: amendment paths too"
);
eq(
  N.canonicalCongressGovUrl("https://www.congress.gov/bill/119th-congress/house-bill/8800"),
  "https://www.congress.gov/bill/119th-congress/house-bill/8800",
  "canonUrl: already-ordinal URL is untouched (idempotent)"
);
eq(N.canonicalCongressGovUrl("https://www.congress.gov/bill/1/house-bill/1"),
  "https://www.congress.gov/bill/1st-congress/house-bill/1", "canonUrl: 1 → 1st");
eq(N.canonicalCongressGovUrl("https://www.congress.gov/bill/2/house-bill/1"),
  "https://www.congress.gov/bill/2nd-congress/house-bill/1", "canonUrl: 2 → 2nd");
eq(N.canonicalCongressGovUrl("https://www.congress.gov/bill/3/house-bill/1"),
  "https://www.congress.gov/bill/3rd-congress/house-bill/1", "canonUrl: 3 → 3rd");
eq(N.canonicalCongressGovUrl("https://www.congress.gov/bill/11/house-bill/1"),
  "https://www.congress.gov/bill/11th-congress/house-bill/1", "canonUrl: 11 → 11th (not 11st)");
eq(N.canonicalCongressGovUrl("https://www.congress.gov/bill/113/house-bill/1"),
  "https://www.congress.gov/bill/113th-congress/house-bill/1", "canonUrl: 113 → 113th (not 113rd)");
eq(N.canonicalCongressGovUrl("https://www.congress.gov/bill/121/house-bill/1"),
  "https://www.congress.gov/bill/121st-congress/house-bill/1", "canonUrl: 121 → 121st");
eq(
  N.canonicalCongressGovUrl("https://www.congress.gov/roll-call-vote/119/house/78"),
  "https://www.congress.gov/roll-call-vote/119/house/78",
  "canonUrl: non-bill congress.gov paths are left alone"
);
ok(N.canonicalCongressGovUrl(null) === null, "canonUrl: null → null");
ok(N.canonicalCongressGovUrl("") === null, "canonUrl: empty → null");

// End-to-end: a raw list row's legislationUrl must reach the measure canonicalized.
{
  const nv = N.normalizeCongressVote(
    {
      congress: 119, sessionNumber: 2, rollCallNumber: 78,
      startDate: "2026-02-25T10:40:00-05:00",
      url: "https://api.congress.gov/v3/house-vote/119/2/78?format=json",
      legislationType: "HR", legislationNumber: "4758",
      legislationUrl: "https://www.congress.gov/bill/119/house-bill/4758",
      voteQuestion: "On Passage", result: "Passed",
    },
    "house"
  );
  eq(
    nv.measure.sourceUrl,
    "https://www.congress.gov/bill/119th-congress/house-bill/4758",
    "normalizeCongressVote: measure.sourceUrl is the canonical ordinal form"
  );
  ok(!/\/bill\/\d+\//.test(nv.measure.sourceUrl), "normalizeCongressVote: no bare-number congress segment survives");
}

// ── mapActionType: a blank question is UNKNOWN, never "passage" ───────────────
// THE BUG CLASS THIS EXISTS TO PREVENT. Every House roll call ingested while the
// classifier read `voteType` ("Yea-and-Nay" — the ballot mechanism, which matches no
// keyword) fell through to "passage". So a motion to recommit, an amendment vote and
// the Election of the Speaker all arrived labelled as passage votes on whatever
// measure they had collapsed onto: full weight, ordinary direction, and a label
// claiming the member voted to pass a bill. Blank in must now mean unknown out.
const mat = N.mapActionType;
eq(mat(""), "unknown", "action: empty question → unknown, not passage");
eq(mat("   "), "unknown", "action: whitespace-only question → unknown");
eq(mat(null), "unknown", "action: null question → unknown");
eq(mat(undefined), "unknown", "action: undefined question → unknown");
// Real question text is classified exactly as before — this guard narrowed nothing else.
eq(mat("On Passage"), "passage", "action: 'On Passage' → passage");
eq(mat("On Motion to Suspend the Rules and Pass"), "passage", "action: suspension → passage");
eq(mat("On Motion to Concur in the Senate Amendment"), "passage", "action: concurrence → passage");
eq(mat("On Agreeing to the Resolution"), "passage", "action: adopting a resolution → passage");
eq(mat("On Agreeing to the Amendment"), "amendment", "action: amendment vote → amendment");
eq(mat("On Motion to Recommit"), "motion", "action: recommit → motion (procedural weight)");
eq(mat("On Ordering the Previous Question"), "procedural", "action: previous question → procedural");
eq(mat("Election of the Speaker"), "procedural", "action: Speaker election → procedural");
eq(mat("On Agreeing to the Conference Report"), "passage",
   "action: present-but-unmatched text still defaults to passage");
// The ballot mechanism is not a question. It still maps to passage if handed in, which
// is exactly why the normalize path below must never hand it in.
eq(mat("Yea-and-Nay"), "passage", "action: voteType text would still fall through — so it is no longer consulted");

// ── normalizeCongressVote: a question-less vote stays unclassified ────────────
{
  const noQuestion = N.normalizeCongressVote({
    chamber: "House", congress: 119, sessionNumber: 1, rollCallNumber: 247,
    startDate: "2025-09-10T20:57:00Z", url: "https://clerk.house.gov/evs/2025/roll247.xml",
    voteType: "Yea-and-Nay", result: "Agreed to",
    legislation: { type: "HR", number: "3838" },
    members: [{ bioguideId: "X000001", party: "R", votePosition: "Yea" }],
  });
  ok(noQuestion !== null, "normalize: a question-less vote is still ingested (identity, not silence)");
  eq(noQuestion.question, null, "normalize: no question text → question stays null");
  eq(noQuestion.actionType, "unknown", "normalize: no question → action_type 'unknown', NOT 'passage'");

  const blankQuestion = N.normalizeCongressVote({
    chamber: "House", congress: 119, sessionNumber: 1, rollCallNumber: 248,
    startDate: "2025-09-10T21:10:00Z", url: "https://clerk.house.gov/evs/2025/roll248.xml",
    voteQuestion: "   ", voteType: "Recorded Vote",
    legislation: { type: "HR", number: "3838" },
    members: [],
  });
  eq(blankQuestion.question, null, "normalize: whitespace-only question → null, not ''");
  eq(blankQuestion.actionType, "unknown", "normalize: whitespace-only question → unknown");

  const recommit = N.normalizeCongressVote({
    chamber: "House", congress: 119, sessionNumber: 1, rollCallNumber: 101,
    startDate: "2025-04-09T00:00:00Z", url: "https://clerk.house.gov/evs/2025/roll101.xml",
    voteQuestion: "  On Motion to Recommit  ", voteType: "Yea-and-Nay",
    legislation: { type: "HR", number: "22" }, members: [],
  });
  eq(recommit.question, "On Motion to Recommit", "normalize: question is trimmed");
  eq(recommit.actionType, "motion", "normalize: recommit classified from the question, not the ballot type");
}
eq(nv.actionType, "passage", "normalize: 'On Passage' still classifies as passage");

// The ballot mechanism must not reach the classifier at all — not even as a last resort.
const NORM_SRC = readFileSync(join(ROOT, "netlify/lib/vr-normalize.ts"), "utf8");
ok(!/mapActionType\([^)]*voteType/.test(NORM_SRC),
   "normalize source: voteType is no longer passed to mapActionType");

// ── Ingest upsert: the conflict branch REPAIRS, non-destructively ─────────────
// The repair runs in Postgres (ON CONFLICT DO UPDATE) and needs a database to
// execute, so this gates the shape of the statement in source: which columns the
// conflict branch may write, and that each write is guarded. Rendered form verified
// against drizzle's own SQL output:
//   "question" = CASE WHEN coalesce(btrim("vr_rollcalls"."question"), '') = ''
//                      AND coalesce(btrim(excluded.question), '') <> ''
//                     THEN excluded.question ELSE "vr_rollcalls"."question" END
const ING_SRC = readFileSync(join(ROOT, "netlify/lib/vr-ingest.ts"), "utf8");
const conflict = ING_SRC.slice(
  ING_SRC.indexOf("onConflictDoUpdate", ING_SRC.indexOf(".insert(vrRollcalls)")),
  ING_SRC.indexOf(".returning({ id: vrRollcalls.id })")
);
ok(conflict.length > 0 && conflict.length < 3000, "ingest source: located the roll-call conflict branch");
ok(/question: sql`CASE/.test(conflict), "ingest source: question is written through a guarded CASE");
ok(/actionType: sql`CASE/.test(conflict), "ingest source: action_type is written through a guarded CASE");
ok(conflict.includes("excluded.question") && conflict.includes("excluded.action_type"),
   "ingest source: the repair reads the incoming record, inventing nothing");
// Never blank a stored question, and never overwrite one: both directions are the
// same guard — fill only when stored is empty AND incoming is not.
const flatConflict = conflict.replace(/\s+/g, " ");
ok(flatConflict.includes(
     "question: sql`CASE WHEN ${storedQ} = '' AND ${incomingQ} <> '' " +
     "THEN excluded.question ELSE ${vrRollcalls.question} END`"),
   "ingest source: question is filled only when stored is blank and incoming is present");
ok(!/question: v\.question/.test(conflict) && !/question: excluded/.test(conflict),
   "ingest source: no unconditional question overwrite in the conflict branch");
// action_type only ever moves off a value that came from no information.
ok(conflict.indexOf("'unknown'") < conflict.indexOf("= 'passage'"),
   "ingest source: the explicit unknown yields before the weak passage default is touched");
ok(/lower\([\s\S]*?\) = lower\(/.test(conflict),
   "ingest source: the passage re-derivation requires identical question text");
ok(!/requiredMajority:|sourceUrl:|voteDate:/.test(conflict),
   "ingest source: the conflict branch stays narrow — no fields beyond the repair set");

// ── Committed seed integrity ──────────────────────────────────────────────────
const memberMap = JSON.parse(readFileSync(join(ROOT, "db/vr-member-map.json"), "utf8"));
const slugs = Object.values(memberMap.map);
const bios = Object.keys(memberMap.map);
ok(bios.length >= 50, `member map: has ${bios.length} entries (≥50)`);
ok(bios.every((b) => /^[A-Z][0-9]{6}$/.test(b)), "member map: every key is a Bioguide ID");
ok(new Set(slugs).size === slugs.length, "member map: no roster slug mapped twice");
for (const seed of ["julie_fedorchak", "troy_downing", "mike_simpson", "mike_flood"]) {
  ok(slugs.includes(seed), `member map: includes curated-seed member ${seed}`);
}

const issueSeed = JSON.parse(readFileSync(join(ROOT, "db/vr-issue-seed.json"), "utf8"));
let issueRows = 0;
for (const m of issueSeed.measures) {
  ok(cmn(m.number) === m.number, `issue seed: ${m.number} is already canonical`);
  for (const iss of m.issues) {
    issueRows++;
    ok(N.ISSUE_KEYS.has(iss.issueKey), `issue seed: ${m.number}/${iss.issueKey} is an allow-listed key`);
    ok(["yea_supports", "yea_opposes"].includes(iss.supportMeaning),
       `issue seed: ${m.number}/${iss.issueKey} has a valid supportMeaning`);
  }
}
const hr1 = issueSeed.measures.find((m) => m.number === "H.R. 1");
ok(hr1 && hr1.issues.some((i) => i.isPrimary), "issue seed: flagship H.R. 1 present with a primary issue");

// ── Report ────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ ${failures.length} failed, ${passed} passed:\n`);
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(`✓ all ${passed} assertions passed (${issueRows} issue-seed rows, ${bios.length} member-map entries)`);
