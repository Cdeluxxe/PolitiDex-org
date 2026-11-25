#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-issue-proposals.mjs — automatic bill→issue mapping proposals + review
// ─────────────────────────────────────────────────────────────────────────────
// Pins the proposal lane added in netlify/lib/vr-issue-proposals.ts:
//   1. a new measure with no mapping receives a low-weight "auto — review" proposal
//   2. an existing curated (or reviewed / rejected) mapping is never overwritten
//   3. the review endpoint updates weight + supportMeaning and marks the row reviewed
//   4. unauthenticated calls to the review endpoint are rejected
//   5. member packs refresh after a proposal or a review
//   6. unknown issue keys are rejected by the db/issue-keys.json guard
//   7. proposals never reach a public read (pack builder, live read, digest)
//
// HOW REAL THIS IS. vr-issue-proposals.ts is bundled with esbuild and EXECUTED
// against an in-memory repository that honours the same contract as the drizzle
// repo (ON CONFLICT DO NOTHING insert, status-guarded update). The HTTP handler in
// netlify/functions/vr-ingest.mts is bundled and executed too, with its two library
// imports swapped for that in-memory lane. The drizzle repo is executed with the
// pack writer stubbed, so "refreshPacks re-reads the version then calls
// writeMemberPack" is observed, not assumed. Read-path exclusion is checked against
// the shipping source text.
//
//   node scripts/test-vr-issue-proposals.mjs
//
// Needs no database and no network.

import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
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

const TMP = mkdtempSync(join(tmpdir(), "vr-proposals-test-"));
let bundleN = 0;
async function load(entry, plugins = []) {
  const out = join(TMP, `b${bundleN++}.mjs`);
  await esbuild.build({
    entryPoints: [join(ROOT, entry)], bundle: true, format: "esm", platform: "node",
    outfile: out, logLevel: "silent", plugins,
  });
  return import(pathToFileURL(out).href);
}
// Swap an import specifier (by its trailing path) for in-line module source.
const stub = (map) => ({
  name: "stub",
  setup(b) {
    b.onResolve({ filter: /.*/ }, (args) => {
      for (const [suffix, contents] of Object.entries(map)) {
        if (args.path.endsWith(suffix)) return { path: suffix, namespace: "stub", pluginData: contents };
      }
      return null;
    });
    b.onLoad({ filter: /.*/, namespace: "stub" }, (args) => ({
      contents: args.pluginData, loader: "ts", resolveDir: join(ROOT, "netlify/lib"),
    }));
  },
});

const P = await load("netlify/lib/vr-issue-proposals.ts");
const ISSUE_KEYS = new Set(JSON.parse(read("db/issue-keys.json")).keys);

// ── In-memory repo with the drizzle repo's contract ──────────────────────────
function memRepo({ measures = [], mappings = [], votes = {} } = {}) {
  const state = { measures, mappings: mappings.map((m) => ({ ...m })), packs: [], nextId: 1000 };
  const repo = {
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
  return repo;
}
const curatedRow = (id, measureId, issueKey, extra = {}) => ({
  id, measureId, issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_opposes",
  rationale: "curated: hand-written migration", sourceUrl: "https://www.congress.gov/x",
  reviewStatus: "curated", reviewedAt: null, reviewedBy: null, ...extra,
});

// Low confidence on purpose (subject + instrument read only once the summary is
// added → 45 < the auto-approve cutoff), so this fixture exercises the MANUAL
// review lane. The auto-approve lane has its own suite: test-vr-issue-confidence.mjs.
const BORDER = { id: 1, measureType: "bill", title: "To amend the Immigration and Nationality Act", summary: "Strengthens border security enforcement and detention.", sourceUrl: "https://www.congress.gov/bill/119/hr/2" };
const ISRAEL_ARMS = { id: 2, measureType: "bill", title: "Providing for congressional disapproval of the proposed foreign military sale to Israel of bombs and guidance kits", sourceUrl: "https://www.congress.gov/bill/118/hr/8035" };
const CURATED = { id: 3, measureType: "bill", title: "Secure Border Enforcement Act", sourceUrl: "https://www.congress.gov/bill/119/hr/3" };
const BLANK = { id: 4, measureType: "bill", title: "To designate the facility of the United States Postal Service", sourceUrl: "https://www.congress.gov/bill/119/hr/4" };

// ═════════════════════════════════════════════════════════════════════════════
section("1. a new measure with no mapping gets a low-weight 'auto — review' proposal");
{
  const repo = memRepo({ measures: [BORDER, BLANK], votes: { 1: ["alice", "bob"] } });
  const rep = await P.proposeForMeasures(repo, [1, 4]);
  const rows = repo.state.mappings.filter((r) => r.measureId === 1);
  ok(rows.length >= 1, "the border bill received at least one proposal");
  const r = rows.find((x) => x.issueKey === "border_security");
  ok(!!r, `border_security proposed (got ${rows.map((x) => x.issueKey)})`);
  if (r) {
    ok(r.weight <= 40, `proposal weight is low (${r.weight})`);
    eq(r.rationale, "auto — review", "rationale is exactly 'auto — review'");
    eq(r.reviewStatus, "proposed", "row is flagged as a proposal");
    eq(r.isPrimary, false, "a proposal is never primary");
    eq(P.isVerdictBearingStatus(r.reviewStatus), false, "a proposal is not verdict-bearing");
  }
  eq(repo.state.mappings.filter((x) => x.measureId === 4).length, 0, "a measure nothing reads as on-issue gets no proposal");
  eq(rep.measuresProposed.join(","), "1", "report names the measure that was proposed");
  ok(rows.every((x) => ISSUE_KEYS.has(x.issueKey)), "every proposal key is in db/issue-keys.json");

  // idempotent: a second run proposes nothing new (the measure now has rows)
  const before = repo.state.mappings.length;
  const again = await P.proposeForMeasures(repo, [1]);
  eq(repo.state.mappings.length, before, "a re-run does not duplicate proposals");
  eq(again.skippedMapped, 1, "a re-run skips the already-proposed measure");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2. curated, reviewed and rejected mappings are never overwritten");
{
  const cur = curatedRow(10, 3, "housing");
  const reviewed = curatedRow(11, 1, "border_security", { reviewStatus: "reviewed", weight: 70 });
  const repo = memRepo({ measures: [CURATED, BORDER], mappings: [cur, reviewed] });
  const snap = JSON.stringify(repo.state.mappings);
  const rep = await P.proposeForMeasures(repo, [3, 1]);
  eq(JSON.stringify(repo.state.mappings), snap, "no row is added or changed on a measure that already has a mapping");
  eq(rep.skippedMapped, 2, "both mapped measures are skipped");
  eq(rep.proposalsWritten, 0, "nothing proposed");

  // even if asked directly, the insert path never clobbers (ON CONFLICT DO NOTHING)
  const wrote = await repo.insertProposal({ measureId: 3, issueKey: "housing", weight: 40, isPrimary: false,
    supportMeaning: "yea_supports", rationale: "auto — review", sourceUrl: null, reviewStatus: "proposed" });
  eq(wrote, null, "a conflicting proposal insert is a no-op");
  eq(repo.state.mappings.find((r) => r.id === 10).weight, 100, "curated weight unchanged");
  eq(repo.state.mappings.find((r) => r.id === 10).supportMeaning, "yea_opposes", "curated supportMeaning unchanged");

  // the review endpoint refuses to touch a curated or reviewed row
  const r1 = await P.reviewProposal(repo, 10, { weight: 5, supportMeaning: "yea_supports" });
  eq(r1.status, 409, "reviewing a curated row is refused");
  const r2 = await P.reviewProposal(repo, 11, { weight: 5, supportMeaning: "yea_supports" });
  eq(r2.status, 409, "re-reviewing a reviewed row is refused");
  eq(JSON.stringify(repo.state.mappings), snap, "curated/reviewed rows unchanged after refused reviews");

  // a reviewer re-keying a proposal onto a key the measure already has curated is refused
  const repo2 = memRepo({ measures: [BORDER], mappings: [curatedRow(20, 1, "housing"),
    { ...curatedRow(21, 1, "border_security"), reviewStatus: "proposed", weight: 40, rationale: "auto — review", isPrimary: false }] });
  const r3 = await P.reviewProposal(repo2, 21, { issueKey: "housing", weight: 50, supportMeaning: "yea_supports" });
  eq(r3.status, 409, "re-keying onto an existing curated (measure, key) is refused");
  eq(repo2.state.mappings.find((r) => r.id === 20).weight, 100, "the curated row it would have collided with is unchanged");

  // a rejected proposal blocks re-proposal
  const repo3 = memRepo({ measures: [BORDER], mappings: [{ ...curatedRow(30, 1, "border_security"), reviewStatus: "rejected" }] });
  const rep3 = await P.proposeForMeasures(repo3, [1]);
  eq(rep3.proposalsWritten, 0, "a measure whose proposal was rejected is not re-proposed");

  // the seed upsert promotes a same-key proposal back to curated (source check)
  const ING = read("netlify/lib/vr-ingest.ts");
  const seedFn = ING.slice(ING.indexOf("export async function applyCuratedIssueSeed"), ING.indexOf("export async function ingestVotes"));
  ok(/onConflictDoUpdate[\s\S]*reviewStatus: "curated"/.test(seedFn), "the curated seed upsert stamps review_status curated");
  ok(!/reviewStatus/.test(read("db/vr-issue-seed.json")), "the curated seed file is untouched");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3. review updates weight + supportMeaning and marks the row reviewed");
{
  const repo = memRepo({ measures: [BORDER], votes: { 1: ["alice", "bob"] } });
  await P.proposeForMeasures(repo, [1], { refreshPacks: false });
  const prop = repo.state.mappings.find((r) => r.issueKey === "border_security");
  repo.state.packs.length = 0;

  const bad1 = await P.reviewProposal(repo, prop.id, { supportMeaning: "yea_supports" });
  eq(bad1.status, 400, "weight is required");
  const bad2 = await P.reviewProposal(repo, prop.id, { weight: 80 });
  eq(bad2.status, 400, "supportMeaning is required");
  const bad3 = await P.reviewProposal(repo, prop.id, { weight: 101, supportMeaning: "yea_supports" });
  eq(bad3.status, 400, "weight is capped at 100");
  const bad4 = await P.reviewProposal(repo, prop.id, { weight: 80, supportMeaning: "maybe" });
  eq(bad4.status, 400, "supportMeaning outside the vocabulary is refused");
  eq(prop.reviewStatus, "proposed", "invalid reviews leave the row a proposal");

  const res = await P.reviewProposal(repo, prop.id, { weight: 80, supportMeaning: "yea_opposes", isPrimary: true, reviewer: "tester" });
  eq(res.status, 200, "valid review succeeds");
  eq(prop.weight, 80, "weight updated");
  eq(prop.supportMeaning, "yea_opposes", "supportMeaning updated");
  eq(prop.reviewStatus, "reviewed", "row marked reviewed");
  eq(prop.isPrimary, true, "row marked primary");
  eq(prop.reviewedBy, "tester", "reviewer recorded");
  ok(prop.reviewedAt instanceof Date, "review time recorded");
  ok(prop.rationale !== "auto — review", "the 'auto — review' rationale is replaced on review");
  eq(P.isVerdictBearingStatus(prop.reviewStatus), true, "a reviewed row is a normal (verdict-bearing) mapping");

  // edit the key on review
  const repo2 = memRepo({ measures: [BORDER] });
  await P.proposeForMeasures(repo2, [1], { refreshPacks: false });
  const p2 = repo2.state.mappings[0];
  const r2 = await P.reviewProposal(repo2, p2.id, { issueKey: "housing", weight: 60, supportMeaning: "yea_supports" });
  eq(r2.status, 200, "a reviewer can change the issue key");
  eq(p2.issueKey, "housing", "issue key edited");

  // reject
  const repo3 = memRepo({ measures: [BORDER] });
  await P.proposeForMeasures(repo3, [1], { refreshPacks: false });
  const p3 = repo3.state.mappings[0];
  const r3 = await P.rejectProposal(repo3, p3.id, { note: "procedural" });
  eq(r3.status, 200, "a proposal can be rejected");
  eq(p3.reviewStatus, "rejected", "row marked rejected");
  eq(P.isVerdictBearingStatus(p3.reviewStatus), false, "a rejected row is not verdict-bearing");
  eq((await P.reviewProposal(repo3, 99999, { weight: 1, supportMeaning: "yea_supports" })).status, 404, "unknown id → 404");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4. the review endpoint rejects unauthenticated calls");
{
  const laneStub = `
    import * as P from ${JSON.stringify(join(ROOT, "netlify/lib/vr-issue-proposals.ts"))};
    const repo = () => globalThis.__VR_TEST_REPO__;
    export const listProposalQueue = async (status, limit) => repo().listMappings({ status, limit });
    export const proposeIssuesForMeasures = (ids, o) => P.proposeForMeasures(repo(), ids, o);
    export const reviewIssueProposal = (id, b) => P.reviewProposal(repo(), id, b);
    export const rejectIssueProposal = (id, b) => P.rejectProposal(repo(), id, b);
  `;
  const ingestStub = `export const applyCuratedIssueSeed = async () => ({}); export const runIngest = async () => ({}); export const verify = async () => ({ ok: true });`;
  const H = await load("netlify/functions/vr-ingest.mts", [stub({ "lib/vr-issue-proposals-db.js": laneStub, "lib/vr-ingest.js": ingestStub })]);
  const handler = H.default;
  const repo = memRepo({ measures: [BORDER], votes: { 1: ["carol"] } });
  globalThis.__VR_TEST_REPO__ = repo;
  await P.proposeForMeasures(repo, [1], { refreshPacks: false });
  const prop = repo.state.mappings[0];
  const url = `https://x.test/api/vr-ingest/proposals/${prop.id}/review`;
  const body = JSON.stringify({ weight: 75, supportMeaning: "yea_supports" });
  const call = (headers = {}) => handler(new Request(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body }));

  const prevToken = process.env.VR_INGEST_TOKEN;
  delete process.env.VR_INGEST_TOKEN;
  eq((await call({ authorization: "Bearer anything" })).status, 503, "with no token configured the endpoint is disabled, not open");
  process.env.VR_INGEST_TOKEN = "test-token-123";
  eq((await call()).status, 401, "no Authorization header → 401");
  eq((await call({ authorization: "Bearer wrong" })).status, 401, "wrong bearer token → 401");
  eq((await handler(new Request("https://x.test/api/vr-ingest/proposals"))).status, 401, "the queue listing is gated too");
  eq(prop.reviewStatus, "proposed", "rejected calls changed nothing");
  const okRes = await call({ authorization: "Bearer test-token-123" });
  eq(okRes.status, 200, "authenticated review succeeds");
  eq(prop.reviewStatus, "reviewed", "authenticated review marked the row reviewed");
  eq(prop.weight, 75, "authenticated review set the weight");
  const list = await handler(new Request("https://x.test/api/vr-ingest/proposals?status=reviewed", { headers: { authorization: "Bearer test-token-123" } }));
  eq((await list.json()).count, 1, "the queue lists by status");
  if (prevToken === undefined) delete process.env.VR_INGEST_TOKEN; else process.env.VR_INGEST_TOKEN = prevToken;
}

// ═════════════════════════════════════════════════════════════════════════════
section("5. member packs refresh after a proposal or a review");
{
  const repo = memRepo({ measures: [BORDER], votes: { 1: ["alice", "bob"] } });
  const rep = await P.proposeForMeasures(repo, [1]);
  eq(repo.state.packs.sort().join(","), "alice,bob", "proposal re-packs the measure's voters");
  eq(rep.packsWritten, 2, "report counts the packs written");
  repo.state.packs.length = 0;
  const prop = repo.state.mappings[0];
  const res = await P.reviewProposal(repo, prop.id, { weight: 90, supportMeaning: "yea_supports" });
  eq(repo.state.packs.sort().join(","), "alice,bob", "review re-packs the measure's voters");
  eq(res.packsWritten, 2, "review reports packs written");

  // ingest mode: proposals defer packing to the ingest's own loop, but report voters
  const repo2 = memRepo({ measures: [BORDER], votes: { 1: ["dan"] } });
  const rep2 = await P.proposeForMeasures(repo2, [1], { refreshPacks: false });
  eq(repo2.state.packs.length, 0, "refreshPacks:false defers packing");
  eq(rep2.affectedMembers.join(","), "dan", "…and hands the voters back for the ingest's pack loop");

  // the drizzle repo's refreshPacks re-reads the mapping version, then writeMemberPack
  const calls = [];
  globalThis.__VR_PACK_CALLS__ = calls;
  const D = await load("netlify/lib/vr-issue-proposals-db.ts", [stub({
    "db/index.js": "export const db = {};",
    "lib/vr-pack.js": "export const resetMappingVersionMemo = () => globalThis.__VR_PACK_CALLS__.push('reset'); export const writeMemberPack = async (p) => { globalThis.__VR_PACK_CALLS__.push('write:' + p); };",
    "./vr-pack.js": "export const resetMappingVersionMemo = () => globalThis.__VR_PACK_CALLS__.push('reset'); export const writeMemberPack = async (p) => { globalThis.__VR_PACK_CALLS__.push('write:' + p); };",
  })]);
  const r = await D.dbProposalRepo.refreshPacks(["alice", "bob"]);
  eq(calls.join(","), "reset,write:alice,write:bob", "db repo drops the version memo, then writeMemberPack per member");
  eq(r.written, 2, "db repo reports packs written");

  // the ingest feeds proposal voters into its single pack loop, after the seed
  const ING = read("netlify/lib/vr-ingest.ts");
  const fn = ING.slice(ING.indexOf("export async function ingestVotes"), ING.indexOf("export async function runIngest"));
  const iSeed = fn.indexOf("await applyCuratedIssueSeed()");
  const iProp = fn.indexOf("await proposeIssuesForMeasures(");
  const iPack = fn.indexOf("await writeMemberPack(pid)");
  ok(iSeed > 0 && iProp > iSeed && iPack > iProp, "ingest order: curated seed → proposals → pack refresh");
  ok(/for \(const pid of prop\.affectedMembers\) affectedMembers\.add\(pid\)/.test(fn), "proposal voters join the ingest's pack refresh");
  ok(fn.indexOf("suggestIssue(") < 0, "the old inline verdict-bearing suggester write is gone");

  // the fingerprint includes review_status, so a review always moves the pack key
  const PACK = read("netlify/lib/vr-pack.ts");
  const mv = PACK.slice(PACK.indexOf("export async function mappingVersion"), PACK.indexOf("export function resetMappingVersionMemo"));
  ok(/string_agg\([\s\S]*review_status[\s\S]*order by id/.test(mv), "mappingVersion() fingerprints review_status");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6. unknown issue keys are rejected");
{
  ok(!ISSUE_KEYS.has("israel_offensive_arms"), "precondition: israel_offensive_arms is a pattern key but not a shipped issue key");
  const { accepted, rejected } = P.proposeIssueKeys(ISRAEL_ARMS);
  ok(rejected.some((r) => r.issueKey === "israel_offensive_arms"), `israel_offensive_arms is rejected by the guard (rejected: ${rejected.map((r) => r.issueKey)})`);
  ok(accepted.every((a) => ISSUE_KEYS.has(a.issueKey)), "nothing unknown is accepted");
  const repo = memRepo({ measures: [ISRAEL_ARMS] });
  const rep = await P.proposeForMeasures(repo, [2]);
  ok(repo.state.mappings.every((r) => ISSUE_KEYS.has(r.issueKey)), "no unknown key is ever written");
  ok(rep.rejectedKeys.includes("israel_offensive_arms"), "the report lists the rejected key");
  ok(P.validateProposalRow({ issueKey: "not_a_real_key", weight: 10 }), "validateProposalRow refuses an unknown key");
  ok(P.validateProposalRow({ issueKey: "housing", weight: 41 }), "validateProposalRow refuses a weight above 40");
  eq(P.validateProposalRow({ issueKey: "housing", weight: 40 }), null, "validateProposalRow accepts a known key at 40");

  const repo2 = memRepo({ measures: [BORDER] });
  await P.proposeForMeasures(repo2, [1], { refreshPacks: false });
  const r = await P.reviewProposal(repo2, repo2.state.mappings[0].id, { issueKey: "not_a_real_key", weight: 50, supportMeaning: "yea_supports" });
  eq(r.status, 400, "a review onto an unknown key is refused");
  eq(repo2.state.mappings[0].reviewStatus, "proposed", "…and leaves the proposal as it was");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7. proposals never reach a public read");
{
  const VR = read("netlify/functions/voting-record.mts");
  const froms = VR.split(/\.from\(vrMeasureIssues\)|\.innerJoin\(vrMeasureIssues,/).slice(1);
  ok(froms.length >= 10, `found ${froms.length} vr_measure_issues reads in voting-record.mts`);
  froms.forEach((chunk, i) => {
    const stmt = chunk.slice(0, chunk.search(/;\s*\n/));
    ok(stmt.includes("verdictBearingMapping()"), `voting-record.mts read #${i + 1} filters out proposals`);
  });
  ok(/notInArray\(vrMeasureIssues\.reviewStatus, NON_VERDICT_STATUSES\)/.test(VR), "the filter is a NOT IN over the shared non-verdict statuses");

  const PACK = read("netlify/lib/vr-pack.ts");
  const lim = PACK.slice(PACK.indexOf("async function loadIssuesByMeasure"), PACK.indexOf("// ── MEASURE IDENTITY"));
  ok(/isVerdictBearingStatus\(/.test(lim), "the pack builder skips non-verdict-bearing rows");

  const DG = read("netlify/lib/digest.ts");
  const dj = DG.split(".innerJoin(vrMeasureIssues,").slice(1);
  ok(dj.length >= 2 && dj.every((c) => c.slice(0, 400).includes("NON_VERDICT_STATUSES")), "digest issue joins skip proposals");

  eq(P.isVerdictBearingStatus("curated"), true, "curated is verdict-bearing");
  eq(P.isVerdictBearingStatus(undefined), true, "a row with no status (pre-column) is curated");
  eq(P.isVerdictBearingStatus("proposed"), false, "proposed is not");

  const mig = read("netlify/database/migrations/20261207000000_vr_measure_issue_proposals/migration.sql");
  ok(/ADD COLUMN "review_status" text DEFAULT 'curated' NOT NULL/.test(mig), "migration defaults every existing row to curated");
  ok(!/UPDATE|DELETE/i.test(mig.replace(/^--.*$/gm, "")), "migration rewrites no existing row");
}

rmSync(TMP, { recursive: true, force: true });
console.log(`\n  ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
