#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-issue-confidence.mjs — confidence scores + auto-approval of proposals
// ─────────────────────────────────────────────────────────────────────────────
// Pins the confidence lane in netlify/lib/vr-issue-proposals.ts:
//   1. every proposal carries a 0..100 confidence, scored by the documented rules
//   2. high / medium (≥ 60) proposals are auto-reviewed with a supportMeaning,
//      reviewer "auto", and are NOT in the proposed queue
//   3. low (< 60) proposals stay proposed ("auto — review") and ARE in the queue
//   4. auto-approved rows refresh packs and reach public reads exactly as a
//      manually reviewed row does
//   5. unknown issue keys are refused, however confident the pattern
//   6. curated and already-reviewed rows are untouched
//   7. the direction rule: a reversal/restriction cue picks yea_opposes and never
//      lowers confidence — strong match + cue is auto-approved as yea_opposes,
//      weak match + cue stays proposed
//
// vr-issue-proposals.ts and the /api/vr-ingest handler are bundled with esbuild
// and executed against an in-memory repository with the drizzle repo's contract.
//
//   node scripts/test-vr-issue-confidence.mjs
//
// Needs no database and no network.

import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as esbuild from "esbuild";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);

const TMP = mkdtempSync(join(tmpdir(), "vr-confidence-test-"));
let n = 0;
async function load(entry, plugins = []) {
  const out = join(TMP, `b${n++}.mjs`);
  await esbuild.build({ entryPoints: [join(ROOT, entry)], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent", plugins });
  return import(pathToFileURL(out).href);
}
const stub = (map) => ({
  name: "stub",
  setup(b) {
    b.onResolve({ filter: /.*/ }, (args) => {
      for (const [suffix, contents] of Object.entries(map)) if (args.path.endsWith(suffix)) return { path: suffix, namespace: "stub", pluginData: contents };
      return null;
    });
    b.onLoad({ filter: /.*/, namespace: "stub" }, (args) => ({ contents: args.pluginData, loader: "ts", resolveDir: join(ROOT, "netlify/lib") }));
  },
});

const P = await load("netlify/lib/vr-issue-proposals.ts");
const L = await load("netlify/lib/bill-live-issues.ts");
const ISSUE_KEYS = new Set(JSON.parse(read("db/issue-keys.json")).keys);

function memRepo({ measures = [], mappings = [], votes = {} } = {}) {
  const state = { measures, mappings: mappings.map((m) => ({ ...m })), packs: [], nextId: 1000 };
  return {
    state,
    async loadMeasures(ids) { return state.measures.filter((m) => ids.includes(m.id)); },
    async mappedMeasureIds(ids) { return new Set(state.mappings.filter((r) => ids.includes(r.measureId)).map((r) => r.measureId)); },
    async insertProposal(row) {
      if (state.mappings.some((r) => r.measureId === row.measureId && r.issueKey === row.issueKey)) return null;
      const id = state.nextId++;
      state.mappings.push({ id, reviewedAt: null, reviewedBy: null, ...row });
      return id;
    },
    async getMapping(id) { return state.mappings.find((r) => r.id === id) ?? null; },
    async findMapping(mid, k) { return state.mappings.find((r) => r.measureId === mid && r.issueKey === k) ?? null; },
    async updateMapping(id, expect, set) {
      const r = state.mappings.find((x) => x.id === id && x.reviewStatus === expect);
      if (!r) return null;
      Object.assign(r, set);
      return r;
    },
    async listMappings({ status, limit }) { return state.mappings.filter((r) => !status || r.reviewStatus === status).slice(0, limit); },
    async votersForMeasures(ids) { return [...new Set(ids.flatMap((id) => votes[id] || []))]; },
    async refreshPacks(pids) { state.packs.push(...pids); return { written: pids.length, errors: [] }; },
  };
}
const src = (n) => `https://www.congress.gov/bill/119/hr/${n}`;
// HIGH: title match + title/summary agree (70 + 10 = 80).
const HIGH = { id: 1, measureType: "bill", title: "Bipartisan Background Checks Act of 2025", summary: "To require a background check for every firearm sale.", sourceUrl: src(8) };
// MEDIUM: title match only (70).
const MED = { id: 2, measureType: "bill", title: "Secure the Border Act of 2025", summary: "", sourceUrl: src(2) };
// LOW: subject + instrument only once the summary is added (45).
const LOW = { id: 3, measureType: "bill", title: "To amend the Immigration and Nationality Act", summary: "Strengthens border security enforcement and detention.", sourceUrl: src(3) };
// STRONG + CUE: title match + agreement (80) with a restriction cue → auto yea_opposes.
const SAVE = { id: 4, measureType: "bill", title: "Safeguard American Voter Eligibility Act", summary: "Requires proof of citizenship to register to vote.", sourceUrl: src(22) };
// WEAK + CUE: summary-only match (45) with a restriction cue → stays proposed.
const WEAKCUE = { id: 7, measureType: "bill", title: "To amend the Immigration and Nationality Act", summary: "Strengthens border security enforcement and detention; restricts parole.", sourceUrl: src(7) };
// Unknown key: israel_offensive_arms is a pattern key but not a shipped issue key
// (ukraine_aid was, until the ground-truth stated positions pass registered it).
const ISR_ARMS = { id: 5, measureType: "bill", title: "Providing for congressional disapproval of the proposed foreign military sale to Israel of bombs and guidance kits", summary: "", sourceUrl: src(8035) };
const ALL = [HIGH, MED, LOW, SAVE, ISR_ARMS, WEAKCUE];
const VOTES = { 1: ["alice"], 2: ["bob"], 3: ["carol"], 4: ["dan"], 7: ["erin"] };

// ═════════════════════════════════════════════════════════════════════════════
section("1. confidence is scored by the documented rules");
{
  const sc = (m) => P.proposeIssueKeys(m).accepted;
  const h = sc(HIGH)[0], m = sc(MED)[0], l = sc(LOW)[0], s = sc(SAVE)[0];
  eq(h && h.issueKey, "gun_safety", "high fixture proposes gun_safety");
  eq(h && h.confidence, P.CONF.titleMatch + P.CONF.titleAndSummary, "title match + title/summary agreement = 80");
  eq(P.confidenceBand(h.confidence), "high", "…which is high");
  eq(m && m.confidence, P.CONF.titleMatch, "title match alone = 70");
  eq(P.confidenceBand(m.confidence), "medium", "…which is medium");
  eq(l && l.confidence, P.CONF.summaryMatch, "summary-only match = 45");
  eq(P.confidenceBand(l.confidence), "low", "…which is low");
  eq(s && s.confidence, P.CONF.titleMatch + P.CONF.titleAndSummary, "a reversal/restriction cue does not lower the issue-match score");
  ok(s && s.signals.includes("reversal-cue") && s.supportMeaning === "yea_opposes", "…it only sets the direction: yea_opposes");
  eq(h.supportMeaning, "yea_supports", "no cue → yea_supports");
  eq(P.DIRECTION_UNCLEAR_CAP, undefined, "the old direction cap is gone");
  eq(P.AUTO_APPROVE_CUTOFF, 60, "the cutoff is 60");
  ok(sc(HIGH).concat(sc(MED), sc(LOW), sc(SAVE)).every((c) => Number.isInteger(c.confidence) && c.confidence >= 0 && c.confidence <= 100), "every score is an integer 0..100");

  // keyword-only fallback is always low
  const kwKey = Object.keys(JSON.parse(read("db/issue-keys.json")).keywords).find((k) => (JSON.parse(read("db/issue-keys.json")).keywords[k] || []).length);
  const kwOnly = P.proposeIssueKeys({ id: 9, measureType: "bill", title: "Zzz" }).accepted;
  ok(kwOnly.length === 0 || kwOnly[0].confidence < P.AUTO_APPROVE_CUTOFF, "no-signal measure proposes nothing confident");
  eq(P.CONF.keywordOnly < P.AUTO_APPROVE_CUTOFF, true, `keyword-only (${P.CONF.keywordOnly}) is below the cutoff`);
  ok(!!kwKey, "precondition: keyword vocabulary present");

  // competing keys lose confidence
  const multi = P.proposeIssueKeys({ id: 10, measureType: "bill", title: "Border Security and Affordable Housing Construction Act", summary: "" }).accepted;
  if (multi.length > 1) {
    ok(multi.every((c) => c.signals.includes("competing-keys")), "several fitting keys each lose confidence");
    ok(multi[1].signals.includes("secondary-key") && multi[1].confidence < multi[0].confidence, "the secondary key scores below the first");
  } else ok(true, "competing fixture produced one key");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2–3. high/medium auto-reviewed and out of the queue; low stays queued");
{
  const repo = memRepo({ measures: ALL, votes: VOTES });
  const rep = await P.proposeForMeasures(repo, ALL.map((m) => m.id));
  const row = (mid) => repo.state.mappings.find((r) => r.measureId === mid);
  for (const [mid, name, dir] of [[1, "high", "yea_supports"], [2, "medium", "yea_supports"], [4, "strong + reversal cue", "yea_opposes"]]) {
    const r = row(mid);
    eq(r && r.reviewStatus, "reviewed", `${name} proposal is auto-reviewed`);
    eq(r && r.reviewedBy, "auto", `${name}: reviewer recorded as "auto"`);
    eq(r && r.supportMeaning, dir, `${name}: supportMeaning ${dir}`);
    ok(r && r.reviewedAt instanceof Date, `${name}: review time recorded`);
    ok(r && typeof r.confidence === "number" && r.confidence >= 60, `${name}: confidence stored on the row (${r && r.confidence})`);
    ok(r && new RegExp(`^auto-approved ${dir} — confidence \\d+`).test(r.rationale), `${name}: rationale names the direction and confidence`);
    ok(r && r.weight <= 40, `${name}: proposal weight kept low`);
  }
  for (const [mid, name] of [[3, "low"], [7, "weak + reversal cue"]]) {
    const r = row(mid);
    eq(r && r.reviewStatus, "proposed", `${name} proposal stays proposed`);
    eq(r && r.rationale, "auto — review", `${name}: rationale is "auto — review"`);
    eq(r && r.reviewedBy, null, `${name}: no reviewer`);
    ok(r && r.confidence < 60, `${name}: confidence stored and below the cutoff (${r && r.confidence})`);
  }
  eq(rep.autoApproved, 3, "report: three auto-approved");
  eq(rep.queuedForReview, 2, "report: two queued");

  // The queue over HTTP — the shipped handler, its library swapped for this repo.
  const laneStub = `
    import * as P from ${JSON.stringify(join(ROOT, "netlify/lib/vr-issue-proposals.ts"))};
    const repo = () => globalThis.__VR_TEST_REPO__;
    export const listProposalQueue = async (status, limit) => repo().listMappings({ status, limit });
    export const proposeIssuesForMeasures = (ids, o) => P.proposeForMeasures(repo(), ids, o);
    export const reviewIssueProposal = (id, b) => P.reviewProposal(repo(), id, b);
    export const rejectIssueProposal = (id, b) => P.rejectProposal(repo(), id, b);
  `;
  const H = await load("netlify/functions/vr-ingest.mts", [stub({
    "lib/vr-issue-proposals-db.js": laneStub,
    "lib/vr-ingest.js": "export const applyCuratedIssueSeed = async () => ({}); export const runIngest = async () => ({}); export const verify = async () => ({ ok: true });",
  })]);
  globalThis.__VR_TEST_REPO__ = repo;
  const prev = process.env.VR_INGEST_TOKEN;
  process.env.VR_INGEST_TOKEN = "tok";
  const q = await (await H.default(new Request("https://x.test/api/vr-ingest/proposals?status=proposed", { headers: { authorization: "Bearer tok" } }))).json();
  const qm = q.items.map((r) => r.measureId).sort();
  eq(qm.join(","), "3,7", "GET /proposals?status=proposed lists only the low-confidence proposals (the strong oppose row is not queued)");
  const rv = await (await H.default(new Request("https://x.test/api/vr-ingest/proposals?status=reviewed", { headers: { authorization: "Bearer tok" } }))).json();
  eq(rv.items.map((r) => r.measureId).sort().join(","), "1,2,4", "auto-approved rows (supports and opposes) are listed as reviewed");
  eq((await H.default(new Request("https://x.test/api/vr-ingest/proposals?status=proposed"))).status, 401, "the queue is still gated");

  // The low one can still be reviewed manually through the existing route.
  const low = row(3);
  const res = await H.default(new Request(`https://x.test/api/vr-ingest/proposals/${low.id}/review`, {
    method: "POST", headers: { authorization: "Bearer tok", "content-type": "application/json" },
    body: JSON.stringify({ weight: 70, supportMeaning: "yea_supports", reviewer: "auto" }),
  }));
  eq(res.status, 200, "a low-confidence proposal is reviewed through the existing route");
  eq(low.reviewedBy, "operator", "a manual reviewer cannot record themselves as \"auto\"");
  // An auto-approved row cannot be re-reviewed (it is already a normal mapping).
  eq((await P.reviewProposal(repo, row(1).id, { weight: 5, supportMeaning: "yea_opposes" })).status, 409, "an auto-approved row is not in the review lane");
  if (prev === undefined) delete process.env.VR_INGEST_TOKEN; else process.env.VR_INGEST_TOKEN = prev;
}

// ═════════════════════════════════════════════════════════════════════════════
section("4. auto-approved rows refresh packs and reach public reads like manual ones");
{
  // Packs: the same refresh path a manual review triggers.
  const repo = memRepo({ measures: [HIGH, MED, LOW], votes: VOTES });
  const rep = await P.proposeForMeasures(repo, [1, 2, 3]);
  eq(repo.state.packs.sort().join(","), "alice,bob,carol", "every proposed measure's voters are re-packed, auto-approved included");
  const r2 = memRepo({ measures: [HIGH], votes: VOTES });
  const ing = await P.proposeForMeasures(r2, [1], { refreshPacks: false });
  eq(ing.affectedMembers.join(","), "alice", "in ingest mode an auto-approved measure's voters join the ingest pack loop");

  const manualRepo = memRepo({ measures: [LOW], votes: VOTES });
  await P.proposeForMeasures(manualRepo, [3], { refreshPacks: false });
  manualRepo.state.packs.length = 0;
  await P.reviewProposal(manualRepo, manualRepo.state.mappings[0].id, { weight: 40, supportMeaning: "yea_supports" });
  eq(manualRepo.state.packs.join(","), "carol", "a manual review re-packs the same way");

  // Public reads gate on review_status alone, never on who reviewed.
  const auto = repo.state.mappings.find((r) => r.measureId === 1);
  const manual = manualRepo.state.mappings[0];
  const proposedRow = repo.state.mappings.find((r) => r.measureId === 3);
  eq(P.isVerdictBearingStatus(auto.reviewStatus), true, "an auto-approved row is verdict-bearing (pack + live reads)");
  eq(P.isVerdictBearingStatus(manual.reviewStatus), P.isVerdictBearingStatus(auto.reviewStatus), "…exactly like a manually reviewed one");
  eq(P.isVerdictBearingStatus(proposedRow.reviewStatus), false, "a low-confidence proposal is not");
  const table = L.liveBillTable([
    { sitting: "119", number: "H.R. 8", sourceUrl: HIGH.sourceUrl, issueKey: auto.issueKey, reviewStatus: auto.reviewStatus },
    { sitting: "119", number: "H.R. 3", sourceUrl: LOW.sourceUrl, issueKey: manual.issueKey, reviewStatus: manual.reviewStatus },
    { sitting: "119", number: "H.R. 9", sourceUrl: LOW.sourceUrl, issueKey: proposedRow.issueKey, reviewStatus: "proposed" },
  ], (k) => ISSUE_KEYS.has(k));
  ok(table["119|H.R. 8"] && table["119|H.R. 3"], "bill pages / person lists carry auto-approved and manually reviewed keys alike");
  eq(table["119|H.R. 9"], undefined, "…and never a proposal");
  const readers = ["netlify/functions/voting-record.mts", "netlify/lib/vr-pack.ts", "netlify/lib/digest.ts", "netlify/lib/bill-live-issues.ts"];
  ok(readers.every((f) => !/reviewedBy|reviewed_by/.test(read(f))), "no public reader consults who reviewed a row");
  const PACK = read("netlify/lib/vr-pack.ts");
  ok(/review_status/.test(PACK.slice(PACK.indexOf("export async function mappingVersion"))), "the promotion moves the pack key (review_status is fingerprinted)");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5. unknown issue keys are still refused");
{
  const { accepted, rejected } = P.proposeIssueKeys(ISR_ARMS);
  ok(rejected.some((r) => r.issueKey === "israel_offensive_arms"), "israel_offensive_arms (pattern key, not an issue key) is refused");
  ok(accepted.every((a) => ISSUE_KEYS.has(a.issueKey)), "nothing unknown is accepted");
  const repo = memRepo({ measures: [ISR_ARMS] });
  await P.proposeForMeasures(repo, [5]);
  ok(repo.state.mappings.every((r) => ISSUE_KEYS.has(r.issueKey)), "no unknown key is written, proposed or reviewed");
  eq(P.shouldAutoApprove({ issueKey: "not_a_real_key", confidence: 99, directionClear: true }), false, "a confident unknown key is never auto-approved");
  eq(P.shouldAutoApprove({ issueKey: "housing", confidence: 99, directionClear: false }), true, "a reversal cue no longer blocks a strong match");
  eq(P.shouldAutoApprove({ issueKey: "not_a_real_key", confidence: 99, directionClear: false }), false, "…but an unknown key with a cue is still refused");
  const unk = memRepo({ measures: [{ ...ISR_ARMS, id: 15, title: "Repeal the Ukraine Security Supplemental Appropriations Act — aid to Ukraine" }] });
  await P.proposeForMeasures(unk, [15]);
  ok(unk.state.mappings.every((r) => ISSUE_KEYS.has(r.issueKey) && !(r.reviewedBy === "auto" && !ISSUE_KEYS.has(r.issueKey))), "an unknown key + reversal cue is neither written nor auto-approved");
  eq(P.shouldAutoApprove({ issueKey: "housing", confidence: 59, directionClear: true }), false, "59 is below the cutoff");
  eq(P.shouldAutoApprove({ issueKey: "housing", confidence: 60, directionClear: true }), true, "60 meets it");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6. curated and already-reviewed rows are untouched");
{
  const curated = { id: 10, measureId: 1, issueKey: "gun_safety", weight: 100, isPrimary: true, supportMeaning: "yea_opposes", rationale: "curated", sourceUrl: HIGH.sourceUrl, reviewStatus: "curated", reviewedAt: null, reviewedBy: null };
  const reviewed = { id: 11, measureId: 2, issueKey: "border_security", weight: 70, isPrimary: false, supportMeaning: "yea_opposes", rationale: "human", sourceUrl: MED.sourceUrl, reviewStatus: "reviewed", reviewedAt: new Date(0), reviewedBy: "editor" };
  const repo = memRepo({ measures: [HIGH, MED], mappings: [curated, reviewed], votes: VOTES });
  const snap = JSON.stringify(repo.state.mappings);
  const rep = await P.proposeForMeasures(repo, [1, 2]);
  eq(JSON.stringify(repo.state.mappings), snap, "high-confidence measures that are already mapped are not touched");
  eq(rep.autoApproved + rep.proposalsWritten, 0, "nothing proposed or approved over them");
  eq(repo.state.packs.length, 0, "and no pack refresh is triggered");

  const ING = read("netlify/lib/vr-ingest.ts");
  const fn = ING.slice(ING.indexOf("export async function ingestVotes"), ING.indexOf("export async function runIngest"));
  ok(fn.indexOf("await applyCuratedIssueSeed()") < fn.indexOf("await proposeIssuesForMeasures("), "the curated seed still lands before proposals");
  const mig = read("netlify/database/migrations/20261208000000_vr_measure_issue_confidence/migration.sql");
  ok(/ADD COLUMN "confidence" integer;/.test(mig), "migration adds a nullable confidence column");
  ok(!/UPDATE|DELETE/i.test(mig.replace(/^--.*$/gm, "")), "migration rewrites no existing row");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7. auto-approved oppose rows read exactly like manual oppose rows");
{
  // Auto lane: strong + cue.
  const autoRepo = memRepo({ measures: [SAVE], votes: VOTES });
  await P.proposeForMeasures(autoRepo, [4]);
  const auto = autoRepo.state.mappings[0];
  eq(auto.supportMeaning, "yea_opposes", "auto row is yea_opposes");
  eq(autoRepo.state.packs.join(","), "dan", "auto oppose row re-packs its voters");
  // Manual lane: weak + cue, reviewed by a human as yea_opposes.
  const manRepo = memRepo({ measures: [WEAKCUE], votes: VOTES });
  await P.proposeForMeasures(manRepo, [7]);
  eq(manRepo.state.packs.join(","), "erin", "the weak proposal re-packs on write (fingerprint moves)");
  manRepo.state.packs.length = 0;
  const manRes = await P.reviewProposal(manRepo, manRepo.state.mappings[0].id, { weight: 40, supportMeaning: "yea_opposes" });
  eq(manRes.status, 200, "the weak + cue proposal is reviewed manually");
  const manual = manRepo.state.mappings[0];
  eq(manRepo.state.packs.join(","), "erin", "a manual oppose review re-packs the same way");
  eq(manual.supportMeaning, auto.supportMeaning, "same supportMeaning");
  eq(manual.reviewStatus, auto.reviewStatus, "same review_status");
  eq(P.isVerdictBearingStatus(auto.reviewStatus), true, "the auto oppose row is verdict-bearing");
  const table = L.liveBillTable([
    { sitting: "119", number: "H.R. 22", sourceUrl: SAVE.sourceUrl, issueKey: auto.issueKey, reviewStatus: auto.reviewStatus },
    { sitting: "119", number: "H.R. 7", sourceUrl: WEAKCUE.sourceUrl, issueKey: manual.issueKey, reviewStatus: manual.reviewStatus },
  ], (k) => ISSUE_KEYS.has(k));
  ok(table["119|H.R. 22"] && table["119|H.R. 7"], "live bill table carries the auto and manual oppose rows alike");
  // A weak + cue row that nobody reviewed stays out of every public read.
  const still = memRepo({ measures: [WEAKCUE] });
  await P.proposeForMeasures(still, [7]);
  eq(still.state.mappings[0].reviewStatus, "proposed", "unreviewed weak + cue row stays proposed");
  eq(P.isVerdictBearingStatus(still.state.mappings[0].reviewStatus), false, "…and is never public");
}

rmSync(TMP, { recursive: true, force: true });
console.log(`\n  ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
