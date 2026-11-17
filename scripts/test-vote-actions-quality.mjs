#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vote-actions-quality.mjs — data-quality rates on the vote pipeline
// ─────────────────────────────────────────────────────────────────────────────
// Pins the metric math (known counts → expected rates), the ledger grouping
// (parked / retry by reason), the per-run rates in the summary line, and that
// GET /api/admin/vote-actions still returns every previous field (same values)
// plus `quality` and `unmappedMembers` — and stays admin-only.
//
//   node scripts/test-vote-actions-quality.mjs   (no database, no network)

import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as esbuild from "esbuild";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const dir = mkdtempSync(join(tmpdir(), "va-quality-"));
const build = async (entry, name, plugins = []) => {
  const out = join(dir, `${name}.mjs`);
  await esbuild.build({ entryPoints: [join(ROOT, entry)], bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "silent", plugins });
  return import(pathToFileURL(out).href);
};
const Q = await build("netlify/lib/vote-actions-quality.ts", "q");
const C = await build("netlify/lib/vote-actions-core.ts", "core");

// ── rate ─────────────────────────────────────────────────────────────────────
eq(Q.rate(3, 400), { n: 3, of: 400, pct: 0.8, text: "3 / 400 (0.8%)" }, "3 of 400 → 0.8%");
eq(Q.rate(1, 3).pct, 33.3, "1 of 3 → 33.3% (one decimal)");
eq(Q.rate(2, 3).pct, 66.7, "2 of 3 → 66.7%");
eq(Q.rate(0, 0), { n: 0, of: 0, pct: null, text: "0 / 0 (n/a)" }, "empty denominator → n/a, never NaN");
eq(Q.rate(5, 5).text, "5 / 5 (100.0%)", "all → 100.0%");
eq(Q.rate(undefined, null).pct, null, "missing counts → n/a");
eq(Q.rate(-2, 10).n, 0, "negative clamps to 0");

// ── table rates (known counts) ───────────────────────────────────────────────
const bills = { bills: 50, tagged: 38, multi_topic: 4, awaiting_summary: 9, taggable: 44, taggable_untagged: 6, summarisable: 30, summary_gave_up: 2 };
const votes = {
  votes: 1000, on_roster: 900,
  bioguide_rows: 800, bioguide_unmapped: 60,   // House + nothing else
  lis_rows: 200, lis_unmapped: 40, lis_unresolved: 10,
  procedural: 300, substantive: 600, procedural_unknown: 100,
};
const t = Q.tableQuality(bills, votes);
eq(t.votesNoPolitician.text, "100 / 1000 (10.0%)", "rows with no politician = votes − on_roster");
eq(t.votesNoPoliticianBioguide.text, "60 / 800 (7.5%)", "bioguide rows with no politician");
eq(t.votesNoPoliticianLis.text, "40 / 200 (20.0%)", "LIS rows with no politician");
eq(t.lisIdsUnresolved.text, "10 / 200 (5.0%)", "LIS ids that never resolved to bioguide");
eq(t.billsNoTags.text, "12 / 50 (24.0%)", "bills with no tags = bills − tagged");
eq(t.taggableBillsNoTags.text, "6 / 44 (13.6%)", "non-nomination bills with no tags");
eq(t.proceduralVotes.text, "300 / 900 (33.3%)", "procedural share of rows with a known kind");
eq(t.unknownKindVotes.text, "100 / 1000 (10.0%)", "unclassified kind share of all rows");
eq(t.awaitingSummary.text, "9 / 30 (30.0%)", "late-summary backlog of bills + resolutions");
eq(t.summaryGaveUp.text, "2 / 30 (6.7%)", "summaries given up on");
const empty = Q.tableQuality({}, {});
ok(Object.values(empty).every((r) => r.pct === null && r.n === 0), "empty tables → every rate n/a");

// ── ledger rates ─────────────────────────────────────────────────────────────
const ledger = {
  "house|119|2|1": { status: "done", attempts: 0, date: "2026-11-01T00:00:00Z" },
  "house|119|2|2": { status: "done", attempts: 0, date: "2026-11-02T00:00:00Z" },
  "house|119|2|3": { status: "done", attempts: 0, date: "2026-11-03T00:00:00Z" },
  "house|119|2|4": { status: "done", attempts: 0, date: "2026-11-03T00:00:00Z" },
  "house|119|2|5": { status: "incomplete", attempts: 2, date: "2026-11-10T00:00:00Z", note: "no member positions yet" },
  "house|119|2|6": { status: "incomplete", attempts: 4, date: "2026-11-08T00:00:00Z", note: "processing error: Cannot read properties of undefined (reading 'replace')" },
  "senate|119|2|7": { status: "parked", attempts: 6, date: "2026-10-01T00:00:00Z", note: "no member positions yet" },
  "senate|119|2|8": { status: "parked", attempts: 6, date: "2026-10-02T00:00:00Z", note: "no member positions yet" },
  "house|119|2|9": { status: "parked", attempts: 6, date: "2026-10-03T00:00:00Z", note: "detail unavailable" },
  "house|119|2|10": { status: "unsupported", attempts: 1, date: "2026-01-03T00:00:00Z", note: "Jeffries, Johnson" },
  "house|119|2|11": { status: "no_measure", attempts: 1, date: "2026-01-04T00:00:00Z", note: "On Approving the Journal" },
  "house|119|2|12": { status: "no_measure", attempts: 1, date: "2026-01-05T00:00:00Z", note: "Call of the House" },
};
const l = Q.ledgerQuality(ledger);
eq([l.total, l.done], [12, 4], "ledger totals");
eq(l.byStatus, { done: 4, incomplete: 2, parked: 3, unsupported: 1, no_measure: 2 }, "ledger by status");
eq(l.doneRate.text, "4 / 12 (33.3%)", "done share of tracked roll calls");
eq(l.notDoneByReason, [
  { status: "no_measure", reason: "no measure (e.g. quorum, Journal, Speaker)", rolls: 2 },
  { status: "parked", reason: "no member positions yet", rolls: 2 },
  { status: "incomplete", reason: "no member positions yet", rolls: 1 },
  { status: "incomplete", reason: "processing error", rolls: 1 },
  { status: "parked", reason: "detail unavailable", rolls: 1 },
  { status: "unsupported", reason: "unsupported vote words", rolls: 1 },
], "not-done roll calls grouped by status + reason, largest first; varying notes collapse");
eq(l.retryBacklog, { rolls: 2, maxAttempts: 4, oldestVoteDate: "2026-11-08T00:00:00Z" }, "retry backlog: count, worst attempts, oldest vote");
eq(Q.ledgerQuality(null), { total: 0, done: 0, byStatus: {}, notDoneByReason: [], retryBacklog: { rolls: 0, maxAttempts: 0, oldestVoteDate: null }, doneRate: Q.rate(0, 0) }, "no ledger → zeros, n/a");
eq(Q.reasonOf("parked", ""), "no reason recorded", "blank note named");

// ── per-run rates on a fake run + the summary line ───────────────────────────
const run = {
  congress: 119, candidates: { house: 10, senate: 5 }, processed: 8, done: 6, incomplete: 1, parked: 1, unsupported: 0, noMeasure: 0,
  billsTagged: 3, billsUntagged: 1, votesInserted: 700, votesRevised: 0, membersUnmapped: 70,
  votesWritten: 1400, votesKindKnown: 1000, votesProcedural: 250, metaRefreshed: 0, retagged: 0,
  rateLimited: false, budgetHit: false, errors: [], tagCounts: {}, houseConfigured: true,
};
const rq = Q.runQuality(run);
eq([rq.noPolitician.text, rq.untaggedBills.text, rq.procedural.text, rq.done.text],
  ["70 / 1400 (5.0%)", "1 / 4 (25.0%)", "250 / 1000 (25.0%)", "6 / 8 (75.0%)"], "run rates from the run's own counts");
const line = C.summaryLine(run);
ok(line.includes("rates no-politician 5.0% untagged-bills 25.0% procedural 25.0% done 75.0%"), `summary line carries the rates (${line})`);
ok(line.includes("processed 8 (done 6, retry 1, parked 1") && line.includes("off-roster members 70"), "summary line keeps its previous counts");
ok(C.summaryLine({ ...run, processed: 0, done: 0, votesWritten: 0, votesKindKnown: 0, billsTagged: 0, billsUntagged: 0, membersUnmapped: 0 }).includes("rates no-politician n/a untagged-bills n/a procedural n/a done n/a"), "idle run → n/a, never NaN");

// A real run on fixtures counts what it wrote (2 House rolls: 3 + 2 rows; Senate 2 rows).
const NOW = new Date("2026-11-15T12:00:00Z");
const API = "https://api.congress.gov/v3";
const J = (b) => ({ ok: true, status: 200, json: async () => b, text: async () => JSON.stringify(b), headers: { get: () => null } });
const fx = async (url) => {
  const u = String(url);
  if (u.startsWith(`${API}/house-vote/119?`)) return J({ houseRollCallVotes: [
    { rollCallNumber: 300, sessionNumber: 2, startDate: "2026-11-12T14:00:00-05:00", legislationType: "HR", legislationNumber: "5000" },
    { rollCallNumber: 301, sessionNumber: 2, startDate: "2026-11-13T14:00:00-05:00", legislationType: "HRES", legislationNumber: "900" },
  ], pagination: { count: 2 } });
  if (u.includes("/2/300/members")) return J({ houseRollCallVoteMemberVotes: { voteQuestion: "On Passage", results: [
    { bioguideID: "A000055", voteCast: "Yea" }, { bioguideID: "Z1", voteCast: "Nay" }, { bioguideID: "Z2", voteCast: "Nay" }] } });
  if (u.includes("/2/301/members")) return J({ houseRollCallVoteMemberVotes: { voteQuestion: "On Ordering the Previous Question", results: [
    { bioguideID: "A000055", voteCast: "Yea" }, { bioguideID: "Z1", voteCast: "Nay" }] } });
  return { ok: false, status: 404, json: async () => ({}), text: async () => "", headers: { get: () => null } };
};
const repo = { async getBill() { return null; }, async upsertBill() {}, async upsertVotes(r) { return { inserted: r.length, revised: 0 }; }, async retagVotes() { return 0; }, async billsNeedingMeta() { return []; }, async billsWithStaleTags() { return []; } };
const { report } = await C.runVoteActions({ fetch: fx, repo, memberMap: { A000055: "robert_aderholt" }, apiKey: "k", now: () => NOW, log: () => {}, chambers: ["house"] });
eq([report.votesWritten, report.membersUnmapped, report.votesKindKnown, report.votesProcedural], [5, 3, 5, 2], "run counts rows written, unmapped, kind-known and procedural");
eq(Q.runQuality(report).noPolitician.text, "3 / 5 (60.0%)", "fixture run: 3 of 5 rows have no politician");
eq(Q.runQuality(report).procedural.text, "2 / 5 (40.0%)", "fixture run: the previous-question roll is procedural");

// ── status endpoint: previous fields + quality, admin-only ───────────────────
let admin = { ok: true };
const fixtureStatus = {
  bills, votes: { ...votes, politicians: 120, roll_calls: 14, revised: 3, newest_vote: "2026-11-14T15:00:00Z" },
  tags: [{ issue_key: "healthcare", bills: 4 }],
  unmappedMembers: [{ scheme: "lis", member_id: "S999", bioguide_id: null, name: "Ann Senator", reason: "lis id not resolved", rows: 12 }],
};
const stateDoc = { ledger, lis: null, lastRun: { at: "2026-11-15T11:23:00Z", done: 4 } };
const stub = {
  name: "stub",
  setup(b) {
    b.onResolve({ filter: /admin-auth\.mjs$/ }, () => ({ path: "admin", namespace: "stub" }));
    b.onResolve({ filter: /vote-actions-db\.js$/ }, () => ({ path: "db", namespace: "stub" }));
    b.onResolve({ filter: /^@netlify\/blobs$/ }, () => ({ path: "blobs", namespace: "stub" }));
    b.onLoad({ filter: /.*/, namespace: "stub" }, (a) => ({
      loader: "js",
      contents: a.path === "admin" ? "export const requireAdmin = async () => globalThis.__admin;"
        : a.path === "db" ? "export const voteActionsStatus = async () => JSON.parse(JSON.stringify(globalThis.__status));"
        : "export const getStore = () => ({ get: async () => JSON.parse(JSON.stringify(globalThis.__state)) });",
    }));
  },
};
globalThis.__status = fixtureStatus; globalThis.__state = stateDoc;
const EP = await build("netlify/functions/vote-actions-status.mts", "status", [stub]);
globalThis.__admin = admin;
const res = await EP.default(new Request("https://x/api/admin/vote-actions"));
const body = await res.json();
eq(res.status, 200, "status endpoint 200 for the curator");
// The previous body, computed exactly as the endpoint did before this change.
const oldLedger = {}; for (const v of Object.values(ledger)) oldLedger[v.status] = (oldLedger[v.status] || 0) + 1;
const oldNotDone = Object.entries(ledger).filter(([, v]) => v.status !== "done").slice(0, 50).map(([k, v]) => ({ roll: k, ...v }));
const { unmappedMembers: _u, ...oldStatus } = fixtureStatus;
const previous = { lastRun: stateDoc.lastRun, ledger: oldLedger, notDone: oldNotDone, ...oldStatus };
for (const k of Object.keys(previous)) eq(body[k], previous[k], `previous field "${k}" unchanged`);
eq(Object.keys(body).sort(), [...Object.keys(previous), "quality", "unmappedMembers", "congresses"].sort(), "body = previous fields + quality + unmappedMembers + per-Congress progress");
eq(body.quality.tables.votesNoPolitician.text, "100 / 1000 (10.0%)", "endpoint rates computed from the table counts");
eq(body.quality.ledger.retryBacklog.rolls, 2, "endpoint ledger backlog");
eq(body.unmappedMembers[0].member_id, "S999", "unmapped-member to-do list returned");
globalThis.__admin = { ok: false, status: 401 };
const denied = await EP.default(new Request("https://x/api/admin/vote-actions"));
const deniedBody = await denied.json();
ok(denied.status === 401 && !("quality" in deniedBody) && !("unmappedMembers" in deniedBody), "non-curator gets 401 and no data");
eq(EP.config.path, "/api/admin/vote-actions", "same admin path");
ok(JSON.stringify(EP.config.method) === JSON.stringify(["GET"]), "still GET only");

// ── the SQL provides every count the rates read; nothing is written ─────────
const dbSrc = readFileSync(join(ROOT, "netlify/lib/vote-actions-db.ts"), "utf8");
const statusSrc = dbSrc.slice(dbSrc.indexOf("export async function voteActionsStatus"));
for (const k of ["taggable", "taggable_untagged", "summarisable", "summary_gave_up", "bioguide_rows", "bioguide_unmapped", "lis_rows", "lis_unmapped", "lis_unresolved", "procedural", "substantive", "procedural_unknown", "awaiting_summary", "tagged", "on_roster"])
  ok(new RegExp(`AS ${k}\\b`).test(statusSrc), `status SQL provides ${k}`);
ok(!/\b(INSERT|UPDATE|DELETE|ALTER|CREATE)\b/i.test(statusSrc.replace(/^\s*\/\/.*$/gm, "")), "status SQL is read-only");
const qSrc = readFileSync(join(ROOT, "netlify/lib/vote-actions-quality.ts"), "utf8");
ok(!/^import /m.test(qSrc), "quality module is pure (no imports: no db, Blobs or network)");

rmSync(dir, { recursive: true, force: true });
if (failures.length) {
  console.log(`\n✗ vote-actions quality: ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.log(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`✓ vote-actions quality: ${passed} checks passed`);
