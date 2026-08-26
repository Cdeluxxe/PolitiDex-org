#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-mapping-draft.mjs — the curator bench proposes; it never decides
// ─────────────────────────────────────────────────────────────────────────────
// scripts/vr-mapping-draft.mjs exists to make a mapping pass faster, and the one
// way a tool like that goes wrong is by getting helpful: filling in a direction
// "for now", defaulting a weight, writing its output somewhere a build step would
// pick it up. Any of those turns a curator's judgement into a machine's guess with
// a human's name on it, and support_meaning is the field where that guess becomes a
// backwards verdict against a real person.
//
// So the bench is allowed to do exactly two things — propose candidates from the
// shipped keyword vocabulary, and print the runbook's checks as questions. This
// suite is the wall around that:
//
//   1. NOTHING IS DECIDED. Every emitted candidate carries decision UNDECIDED,
//      supportMeaning null, weight null, isPrimary null and rationale null, and
//      every check's answer is null. No code path in the file assigns a direction.
//   2. THE DRAFT SAYS IT IS A DRAFT. _status, _requiresHumanConfirmation and a
//      notice that names what a human still has to do.
//   3. THE SKELETON CANNOT BE APPLIED. Every SQL line is commented out, the file
//      extension is not .sql, the INSERT writes explicit NULLs into three NOT NULL
//      columns, and it refuses to create a measure it cannot find.
//   4. IT REFUSES TO WRITE WHERE OUTPUT BECOMES INPUT. Not into
//      netlify/database/migrations/, not into db/, not via a `..` walk into either.
//   5. THE CHECKS ARE THE RUNBOOK'S, IN ITS WORDS. Rule 22's backwards read is
//      required on every candidate, and the rules it cites exist in the runbook.
//   6. ONE FAMILY, THE REST REFUSED WITH A REASON. bill is implemented; amendment
//      and resolution are refused citing the rule that blocks them.
//   7. THE VOCABULARY IS THE SHIPPED ONE. Candidates are always real ISSUE_MAP
//      keys — the bench cannot invent a key, which is the failure the runbook
//      calls "stretching a bill onto an issue the vocabulary can't express".
//
//   node scripts/test-vr-mapping-draft.mjs

import { readFileSync, existsSync, rmSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);

const TOOL = "scripts/vr-mapping-draft.mjs";
ok(existsSync(join(ROOT, TOOL)), `${TOOL} exists`);
const SRC = R(TOOL);

const M = await import("./vr-mapping-draft.mjs");
const KEYS = JSON.parse(R("db/issue-keys.json"));
const SEED = JSON.parse(R("db/vr-issue-seed.json"));
const RUNBOOK = R("db/vr-ingest-runbook.md");

// The measure the rest of this suite drafts against. A real title, no corpus entry,
// so the proposal path runs on evidence rather than on an existing mapping.
const TITLE =
  "Fix Our Forests Act to expedite forest management and wildfire mitigation on federal lands";
const MEASURE = {
  number: "H.R. 9311", family: "bill", congress: 119, chamber: "house",
  title: TITLE, sourceUrl: null, margin: "279-141", existing: [],
};
const CANDS = M.candidates(TITLE, "", 12);
for (const c of CANDS) c.checks = M.checksFor(MEASURE, c);
MEASURE.checks = M.measureChecks(MEASURE);
const DRAFT = M.draftFor(MEASURE, CANDS);
ok(CANDS.length >= 2, `the bench proposes more than one candidate (${CANDS.length}) — a single-hit ` +
  `classifier is what suggestIssue() already does, and it is why a curator still reads the whole vocabulary`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · nothing is decided");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const c of DRAFT.candidates) {
    eq(c.decision, "UNDECIDED", `${c.issueKey}: decision is not UNDECIDED`);
    eq(c.supportMeaning, null, `${c.issueKey}: a direction was supplied by the tool`);
    eq(c.weight, null, `${c.issueKey}: a weight was supplied by the tool`);
    eq(c.isPrimary, null, `${c.issueKey}: isPrimary was supplied by the tool`);
    eq(c.rationale, null, `${c.issueKey}: a rationale was written by the tool`);
    ok(c.checks.length >= 5, `${c.issueKey}: fewer than five checks`);
    ok(c.checks.every((k) => k.answer === null),
      `${c.issueKey}: a check arrived pre-answered — the answers are the curator's work`);
  }
  ok(DRAFT.measureChecks.every((k) => k.answer === null),
    "a measure-level check arrived pre-answered");

  // The source itself must never hand back a direction. netlify/lib/vr-ingest.ts's
  // optional title classifier writes "yea_supports" as a placeholder; the bench is
  // the replacement for that habit, so the string may only appear as prose telling a
  // human to choose, never as an assigned value.
  const assigns = SRC.match(/supportMeaning\s*:\s*["'`]yea_(supports|opposes)["'`]/g) || [];
  eq(assigns.length, 0,
    "the tool assigns a support_meaning somewhere — a placeholder direction is the one field a hurried curator leaves standing");
  ok(!/\bweight\s*:\s*\d+/.test(SRC.replace(/weight:\s*w\b/g, "")),
    "the tool assigns a numeric weight somewhere — weight is a judgement about how much of a bill a provision is");
  has(SRC, "supportMeaning: null", "the draft's direction field is not explicitly null in the source");

  // A rejection is a curator action too: the tool offers no accept/apply verb.
  ok(!/\bfunction\s+(accept|apply|commit|write(Seed|Mapping))/.test(SRC),
    "the tool exposes an accept/apply verb — accepting a mapping is not something this file may do");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the draft says it is a draft");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(DRAFT._status, "draft", "the artifact does not declare itself a draft");
  eq(DRAFT._requiresHumanConfirmation, true, "the artifact does not require human confirmation");
  eq(DRAFT._generatedBy, TOOL, "the artifact does not name the tool that wrote it");
  has(DRAFT._notice, "NOT APPLIABLE", "the notice does not say the draft cannot be applied");
  has(DRAFT._notice, "UNDECIDED", "the notice does not say every issue is undecided");
  has(DRAFT._notice, "curator", "the notice does not name the human who finishes the work");
  has(DRAFT._notice, "Nothing in this file is a mapping",
    "the notice does not say plainly that nothing in it is a mapping");
  // The report a curator actually reads has to say it on screen, not only in JSON.
  has(SRC, "NOTHING BELOW IS A MAPPING", "the on-screen report does not say nothing in it is a mapping");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the skeleton cannot be applied");
// ═════════════════════════════════════════════════════════════════════════════
{
  const sql = M.skeletonSql(MEASURE, CANDS, "20260910000000");
  const live = sql.split("\n").filter((l) => l.trim() && !l.trim().startsWith("--"));
  eq(live.length, 0,
    `the skeleton contains ${live.length} uncommented SQL line(s) — every statement must be commented out`);
  has(sql, "THIS FILE IS NOT A MIGRATION", "the skeleton does not disclaim being a migration");
  has(sql, "NULL /* TODO */", "the skeleton does not leave the judgement columns as explicit TODO nulls");
  has(sql, "refusing to invent it",
    "the skeleton does not refuse a missing measure — a mapping migration must never create the measure it maps");
  has(sql, "REVIEW", "the skeleton carries no REVIEW markers");
  has(sql, "Candidates accepted by a human: 0", "the skeleton does not state that nothing has been accepted");
  has(sql, "Refused this pass", "the skeleton has no refusal list — runbook rule 22 wants the refusals written down");

  // The three columns it NULLs are NOT NULL in the schema, and that is the point:
  // an unedited skeleton someone renamed anyway throws instead of inserting the
  // schema default direction.
  const schema = R("db/schema.ts");
  for (const col of ["weight", "is_primary", "support_meaning"]) {
    has(sql, col, `the skeleton does not name ${col}`);
  }
  ok(/supportMeaning: text\("support_meaning"\)\.notNull\(\)/.test(schema),
    "support_meaning is no longer NOT NULL in db/schema.ts — the skeleton's explicit-NULL safety net depends on it");
  ok(/weight: integer\(\)\.notNull\(\)/.test(schema),
    "weight is no longer NOT NULL in db/schema.ts — the skeleton's explicit-NULL safety net depends on it");
  has(sql, "raises a not-null violation", "the skeleton does not explain why the explicit NULLs are the safety");

  // The extension is not one the platform's migration runner reads.
  has(SRC, ".sql.draft", "the skeleton is not written with a non-migration extension");
  ok(!/\.sql`\s*\)/.test(SRC.split("skeletonSql")[0] || ""),
    "a bare .sql filename is composed before the skeleton generator");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · it refuses to write where output becomes input");
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(M.FORBIDDEN.includes("netlify/database/migrations"),
    "the migrations directory is not on the forbidden-output list");
  ok(M.FORBIDDEN.includes("db"), "db/ is not on the forbidden-output list");

  // Driven through the CLI, because the refusal has to happen before any write and
  // has to exit non-zero — a warning on stdout would not stop a script.
  for (const bad of [
    "netlify/database/migrations",
    "db",
    "scripts/../db/seeds",
    "netlify/database/migrations/../migrations",
  ]) {
    let code = 0, out = "";
    try {
      out = execFileSync(process.execPath,
        [TOOL, "--measure", "H.R. 1", "--congress", "119", "--title", "x", "--out", bad],
        { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      code = e.status; out = String(e.stdout || "") + String(e.stderr || "");
    }
    eq(code, 1, `--out ${bad} did not exit 1`);
    has(out, "refusing to write", `--out ${bad} did not refuse`);
    has(out, "one rename away", `--out ${bad} did not say why the directory is forbidden`);
  }

  // And nothing was left behind by those attempts. The migrations directory holds
  // both plain .sql files and Netlify-format `<stamp>_name/` directories, and the
  // real mapping migrations already use the `<stamp>_vr_map_<slug>.sql` name the
  // skeleton mirrors deliberately — so the check is for the draft SUFFIX, which is
  // the one thing no shipped migration carries.
  const stray = readdirSync(join(ROOT, "netlify/database/migrations"))
    .filter((f) => f.endsWith(".draft") || f.includes("mapping-draft"));
  eq(stray.length, 0, `draft residue in the migrations directory: ${stray.join(", ")}`);
  ok(!readdirSync(join(ROOT, "db")).some((f) => f.includes("mapping-draft")),
    "a draft artifact was written into db/");

  // A writable target is accepted, and what lands there is the two draft artifacts.
  const tmp = join(ROOT, ".netlify", "pdx-draft-test");
  rmSync(tmp, { recursive: true, force: true });
  execFileSync(process.execPath,
    [TOOL, "--number", "H.R. 9311", "--congress", "119", "--chamber", "house",
     "--title", TITLE, "--out", tmp, "--stamp", "20260910000000"],
    { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const wrote = readdirSync(tmp).sort();
  eq(wrote.length, 2, `expected two artifacts, got ${wrote.join(", ")}`);
  ok(wrote.some((f) => f.endsWith(".sql.draft")), "no .sql.draft skeleton was written");
  ok(!wrote.some((f) => f.endsWith(".sql")), "a bare .sql file was written — that is a migration filename");
  const jsonFile = wrote.find((f) => f.endsWith(".json"));
  const onDisk = JSON.parse(readFileSync(join(tmp, jsonFile), "utf8"));
  eq(onDisk._status, "draft", "the artifact on disk does not declare itself a draft");
  ok(onDisk.candidates.every((c) => c.supportMeaning === null && c.weight === null),
    "the artifact on disk carries a decided direction or weight");
  rmSync(tmp, { recursive: true, force: true });
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the checks are the runbook's, in its words");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const c of DRAFT.candidates) {
    const back = c.checks.find((k) => k.id === "backwards_read");
    ok(!!back, `${c.issueKey}: no backwards read — rule 22 is required on every candidate`);
    ok(back && back.required, `${c.issueKey}: the backwards read is optional`);
    has(back.rule, "rule 22", `${c.issueKey}: the backwards read does not cite rule 22`);
    has(back.question, "NAY", `${c.issueKey}: the backwards read does not ask about the nay bloc`);
    has(back.question, c.label, `${c.issueKey}: the backwards read does not name the issue in reader words`);
    has(back.question, "not a statement about the yea bloc",
      `${c.issueKey}: the backwards read drops the runbook's own explanation of support_meaning`);
    ok(c.checks.some((k) => k.id === "two_flank_nay"),
      `${c.issueKey}: no two-flank-nay check`);
    ok(c.checks.some((k) => k.id === "vehicle_share"),
      `${c.issueKey}: no vehicle-share check — a section inside a vehicle is still the section you voted for`);
    ok(c.checks.some((k) => k.id === "vocabulary_fit"),
      `${c.issueKey}: no vocabulary-fit check`);
    ok(c.checks.every((k) => typeof k.rule === "string" && k.rule),
      `${c.issueKey}: a check cites no rule`);
  }
  // The runbook actually contains what the bench cites. A hint that quotes a rule the
  // runbook no longer has is worse than no hint.
  // Collapsed, because the runbook is prose wrapped at ~90 columns and rule 22's
  // sentence straddles a line break.
  const RB = RUNBOOK.replace(/\s+/g, " ");
  has(RB, "`support_meaning` is not a statement about the yea bloc",
    "the runbook no longer contains rule 22's account of support_meaning — the bench quotes it");
  has(RB, "Read every candidate mapping backwards before you write it",
    "the runbook no longer opens rule 22 with the backwards read the bench prints");
  for (const phrase of ["yeaBlocksMeasure", "applyCuratedIssueSeed", "_voteEffectiveSupport"]) {
    has(RB, phrase, `the runbook no longer mentions ${phrase} — the bench points curators at it`);
  }
  const ids = MEASURE.checks.map((k) => k.id);
  for (const id of ["decisive_question", "procedural_inversion", "not_a_removal", "first_rationale_stands"]) {
    ok(ids.includes(id), `the measure-level checklist is missing ${id}`);
  }
  // The unanimity check only exists when a margin was supplied, and it asks rather
  // than concludes — rule 11's whole point is that near-unanimity is relative to the
  // question being scored.
  ok(ids.includes("unanimity"), "a supplied margin did not produce the unanimity check");
  const uni = MEASURE.checks.find((k) => k.id === "unanimity");
  has(uni.question, "RELATIVE TO THE KEY", "the unanimity check concludes instead of asking");
  eq(uni.answer, null, "the unanimity check answered itself from arithmetic");
  ok(!M.measureChecks({ ...MEASURE, margin: null }).some((k) => k.id === "unanimity"),
    "the unanimity check appears with no margin to check");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · one family, the rest refused with a reason");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(M.FAMILIES.bill.implemented, true, "the bill family is not implemented");
  for (const fam of ["amendment", "resolution"]) {
    eq(M.FAMILIES[fam].implemented, false, `the ${fam} family claims to be implemented`);
    ok(/runbook rule \d+/.test(M.FAMILIES[fam].blockedBy),
      `the ${fam} family is unimplemented without citing the rule that blocks it`);
  }
  eq(M.familyOf("H.R. 1").key, "bill", "H.R. 1 is not read as a bill");
  eq(M.familyOf("S. 1234").key, "bill", "S. 1234 is not read as a bill");
  eq(M.familyOf("H.Amdt. 12").key, "amendment", "H.Amdt. 12 is not read as an amendment");
  eq(M.familyOf("H.Res. 12").key, "resolution", "H.Res. 12 is not read as a resolution");
  eq(M.familyOf("H.J.Res. 12").key, "resolution", "H.J.Res. 12 is not read as a resolution");
  eq(M.familyOf("nonsense"), null, "an unrecognised measure number matched a family");

  // The refusals are refusals: non-zero exit, no draft.
  for (const [num, cite] of [["H.Amdt. 12", "rule 4"], ["H.Res. 1234", "rule 2"]]) {
    let code = 0, out = "";
    try {
      execFileSync(process.execPath, [TOOL, "--measure", num, "--congress", "119", "--chamber", "house"],
        { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) { code = e.status; out = String(e.stdout || "") + String(e.stderr || ""); }
    eq(code, 1, `${num} did not exit 1`);
    has(out, "deliberately not drafted", `${num} was not refused`);
    has(out, cite, `${num}'s refusal does not cite ${cite}`);
    ok(!out.includes("DRAFT MAPPING BENCH"), `${num} printed a draft anyway`);
  }
  // The extension point is documented as one, so the next family is an entry and not
  // a rewrite.
  has(SRC, "THE EXTENSION POINT", "FAMILIES is not marked as the extension point");
  ok(SEED.measures.some((m) => m.measureType === "bill"),
    "the implemented family is not one already in the corpus");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the vocabulary is the shipped one");
// ═════════════════════════════════════════════════════════════════════════════
{
  const allowed = new Set(KEYS.keys);
  for (const c of DRAFT.candidates) {
    ok(allowed.has(c.issueKey), `${c.issueKey} is not a shipped ISSUE_MAP key`);
    ok(c.evidence.matchedInTitle.length + c.evidence.matchedInText.length > 0,
      `${c.issueKey} was proposed with no keyword evidence at all`);
    ok(["title", "text"].includes(c.evidence.from),
      `${c.issueKey} does not say where its evidence came from`);
  }
  // A bare number is not evidence. The corpus stores no titles, so this refusal is
  // the difference between a proposal and a guess.
  let code = 0, out = "";
  try {
    execFileSync(process.execPath, [TOOL, "--measure", "H.R. 1", "--congress", "119"],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) { code = e.status; out = String(e.stdout || "") + String(e.stderr || ""); }
  eq(code, 1, "a measure with no title and no text still produced a draft");
  has(out, "would be a guess", "the no-evidence refusal does not say why");

  // Nothing found is a real answer, not an empty result to be filled in.
  eq(M.candidates("An Act to designate a federal building", "", 12).length, 0,
    "a title with no vocabulary hit produced candidates anyway");
  has(SRC, "stays unmapped rather than", "the tool does not say that an unmappable measure stays unmapped");

  // Weight guidance is read off the corpus and printed as a band — the rows stay null.
  const bands = M.weightBands();
  ok(bands.length > 1, "no weight bands were read from the corpus");
  ok(bands.every((b) => typeof b.weight === "number" && b.n > 0), "a weight band has no rows behind it");
  has(SRC, "the emitted rows carry weight:null", "the weight bands are not labelled as guidance only");

  // Audit mode runs the same checklist over work already shipped, and still decides
  // nothing: the stored row is shown as stored, not as accepted.
  const hr1 = M.fromCorpus("H.R. 1", 119)[0];
  ok(!!hr1 && (hr1.issues || []).length >= 3, "H.R. 1 is no longer in the corpus with its mappings");
  const auditCands = hr1.issues.map((i) => ({
    issueKey: i.issueKey, label: M.labelOf(i.issueKey), matchedInTitle: [], matchedInText: [],
    evidence: "existing", stored: { supportMeaning: i.supportMeaning, weight: i.weight, isPrimary: !!i.isPrimary },
  }));
  const audit = M.draftFor({ ...MEASURE, number: "H.R. 1", existing: hr1.issues }, auditCands);
  ok(audit.candidates.every((c) => c.decision === "LIVE_UNREVIEWED"),
    "an audited live mapping is not marked LIVE_UNREVIEWED");
  ok(audit.candidates.every((c) => c.supportMeaning === null && c.weight === null),
    "audit mode copied the stored judgement into the draft's own fields — the draft would look accepted");
  ok(audit.candidates.every((c) => c.stored && c.stored.supportMeaning),
    "audit mode does not show the curator what is currently stored");
}

console.log("");
if (failures.length) {
  console.error(`✗ vr mapping draft: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ vr mapping draft: the bench proposes and checks, a human decides — ${passed} assertions passed\n`);
