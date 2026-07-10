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
