#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vote-actions-publish.mjs — the automatic publish gate
// ─────────────────────────────────────────────────────────────────────────────
// Raw vote records (pdx_vote_actions) reach public pages only on bills that pass
// every rule in netlify/lib/vote-actions-publish.ts, computed on read. Pins:
//   1. each rule, alone, holds a bill back; all rules passing publishes it
//   2. changing an input (a tag, a mapped member, a stored payload) flips the
//      status on the next read — no stored flag, no manual step
//   3. end to end over a real vote-actions run: failing bills never leave the
//      public read; passing ones do, with public fields only
//   4. the public endpoint is gated, cached briefly and leaks no raw key / id
//   5. the public drawer shows the note for a publishable bill (procedural
//      labelled) and stays byte-identical for a held one; the curator sees why
//   6. the curator status page reports the gate (publishable share, per-rule fails)
//
//   node scripts/test-vote-actions-publish.mjs   (no database, no network)

import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import * as esbuild from "esbuild";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else if (failures.length < 60) failures.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const dir = mkdtempSync(join(tmpdir(), "va-pub-"));
const build = async (entry, name, plugins = []) => {
  const out = join(dir, `${name}.mjs`);
  await esbuild.build({ entryPoints: [join(ROOT, entry)], bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "silent", plugins });
  return import(pathToFileURL(out).href);
};
const P = await build("netlify/lib/vote-actions-publish.ts", "pub");
const C = await build("netlify/lib/vote-actions-core.ts", "core");
const Q = await build("netlify/lib/vote-actions-quality.ts", "q");

// ── 1 · each rule ────────────────────────────────────────────────────────────
const good = { billKey: "us-119-hr-5000", measureType: "bill", tagCount: 2, rows: 430, unmappedRows: 0, unknownKindRows: 0, missingRawRows: 0, proceduralRows: 0, rolls: 2 };
eq(P.evaluateBill(good.billKey, good), { billKey: "us-119-hr-5000", publishable: true, failed: [] }, "every rule holds → publishable");
eq(P.evaluateBill("us-119-hr-1", null), { billKey: "us-119-hr-1", publishable: false, failed: ["bill_record"] }, "no bill row → held (bill_record)");
for (const [rule, patch] of [
  ["not_nomination", { measureType: "nomination" }],
  ["has_topic_tag", { tagCount: 0 }],
  ["has_votes", { rows: 0 }],
  ["members_mapped", { unmappedRows: 1 }],
  ["vote_kind_known", { unknownKindRows: 3 }],
  ["raw_payload_stored", { missingRawRows: 1 }],
]) eq(P.evaluateBill(good.billKey, { ...good, ...patch }), { billKey: good.billKey, publishable: false, failed: [rule] }, `${rule} failing alone holds the bill back`);
eq(P.evaluateBill(good.billKey, { ...good, tagCount: 0, unmappedRows: 2 }).failed, ["has_topic_tag", "members_mapped"], "several failures are all named");
ok(P.evaluateBill(good.billKey, { ...good, proceduralRows: 430 }).publishable, "procedural votes are publishable");
for (const t of ["bill", "resolution", "amendment"]) ok(P.evaluateBill("k", { ...good, measureType: t }).publishable, `${t}s are publishable`);

// ── 2 · flips on the next read ───────────────────────────────────────────────
const s = { ...good, tagCount: 0, unmappedRows: 1, missingRawRows: 1 };
ok(!P.evaluateBill(s.billKey, s).publishable, "start held");
s.tagCount = 1; ok(!P.evaluateBill(s.billKey, s).publishable, "one tag added, still held by the others");
s.unmappedRows = 0; ok(!P.evaluateBill(s.billKey, s).publishable, "member mapped, still held by the payload");
s.missingRawRows = 0; ok(P.evaluateBill(s.billKey, s).publishable, "payload stored → publishes with no manual step");
s.unmappedRows = 4; ok(!P.evaluateBill(s.billKey, s).publishable, "a new unmapped member un-publishes it again");

// ── 3 · end to end over a real vote-actions run ──────────────────────────────
const NOW = new Date("2026-11-15T12:00:00Z");
const API = "https://api.congress.gov/v3";
const J = (b) => ({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(b)), text: async () => JSON.stringify(b), headers: { get: () => "application/json" } });
const list = { houseRollCallVotes: [
  { rollCallNumber: 300, sessionNumber: 2, startDate: "2026-11-12T14:00:00-05:00", legislationType: "HR", legislationNumber: "5000" },
  { rollCallNumber: 301, sessionNumber: 2, startDate: "2026-11-12T15:00:00-05:00", legislationType: "HR", legislationNumber: "5000" },
  { rollCallNumber: 302, sessionNumber: 2, startDate: "2026-11-13T14:00:00-05:00", legislationType: "HR", legislationNumber: "6100" },
  { rollCallNumber: 303, sessionNumber: 2, startDate: "2026-11-13T15:00:00-05:00", legislationType: "HRES", legislationNumber: "800" },
], pagination: { count: 4 } };
const mv = (q, rows) => ({ houseRollCallVoteMemberVotes: { voteQuestion: q, results: rows } });
const A = { bioguideID: "A000055", voteCast: "Yea" }, B = { bioguideID: "B000001", voteCast: "Nay" }, X = { bioguideID: "X000009", voteCast: "Nay" };
const bodies = {
  300: mv("On Passage", [A, B]),
  301: mv("On Motion to Recommit", [A, B]),                // procedural, same bill
  302: mv("On Passage", [A, B, X]),                         // X is off-roster
  303: mv("On Agreeing to the Resolution", [A, B]),         // H.Res. 800: no text → untagged
};
const fx = async (url) => {
  const u = String(url);
  if (u.startsWith(`${API}/house-vote/119?`)) return J(list);
  const m = u.match(/house-vote\/119\/2\/(\d+)\/members/);
  if (m && bodies[m[1]]) return J(bodies[m[1]]);
  if (u.startsWith(`${API}/bill/119/hr/5000?`)) return J({ bill: { title: "Secure Our Border Act to strengthen border security and immigration enforcement" } });
  if (u.startsWith(`${API}/bill/119/hr/6100?`)) return J({ bill: { title: "Medicaid coverage expansion and health insurance premiums act" } });
  return { ok: false, status: 404, json: async () => ({}), text: async () => "", headers: { get: () => null } };
};
function memStore() { const m = new Map(); return { m, async setJSON(k, v) { m.set(k, JSON.parse(JSON.stringify(v))); }, async get(k) { return m.has(k) ? JSON.parse(JSON.stringify(m.get(k))) : null; }, async list({ prefix }) { return { blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; } }; }
function memRepo() {
  const bills = new Map(), votes = new Map();
  const vk = (r) => [r.chamber, r.congress, r.session, r.rollNumber, r.memberIdScheme, r.memberId].join("|");
  return {
    bills, votes,
    async getBill(k) { return bills.get(k) || null; },
    async upsertBill(b) { bills.set(b.billKey, { ...b }); },
    // Same COALESCE as vote-actions-db.ts: a re-read never erases a mapping or a raw_ref.
    async upsertVotes(rows) { for (const r of rows) { const p = votes.get(vk(r)); votes.set(vk(r), { ...p, ...r, politicianId: r.politicianId ?? p?.politicianId ?? null, rawRef: r.rawRef ?? p?.rawRef ?? null }); } return { inserted: rows.length, revised: 0 }; },
    async retagVotes() { return 0; }, async billsNeedingMeta() { return []; }, async billsWithStaleTags() { return []; },
    async unmappedBioguides() { return [...new Set([...votes.values()].filter((r) => r.politicianId == null && r.bioguideId).map((r) => r.bioguideId))]; },
    async mapMembers(pairs) { let n = 0; for (const [b, pid] of pairs) for (const r of votes.values()) if (r.bioguideId === b && r.politicianId == null) { r.politicianId = pid; n++; } return n; },
  };
}
// The same aggregation as billPublishStats' SQL, over the in-memory tables.
const statsFrom = (repo) => async (keys) => keys.filter((k) => repo.bills.has(k)).map((k) => {
  const b = repo.bills.get(k), v = [...repo.votes.values()].filter((r) => r.billKey === k);
  return {
    billKey: k, measureType: b.measureType, tagCount: b.topicTags.length, rows: v.length,
    unmappedRows: v.filter((r) => r.politicianId == null).length,
    unknownKindRows: v.filter((r) => r.voteKind === "unknown" || r.isProcedural == null).length,
    missingRawRows: v.filter((r) => r.rawRef == null).length,
    proceduralRows: v.filter((r) => r.isProcedural === true).length,
    rolls: new Set(v.map((r) => r.rollNumber)).size,
  };
});
const rowsFrom = (repo) => async (pid) => [...repo.votes.values()].filter((r) => r.politicianId === pid).sort((a, b) => a.voteDate.localeCompare(b.voteDate) || a.rollNumber - b.rollNumber);
const repo = memRepo(), store = memStore();
const roster = { A000055: "robert_aderholt", B000001: "pat_member" };
const run1 = await C.runVoteActions({ fetch: fx, repo, memberMap: roster, apiKey: "k", now: () => NOW, log: () => {}, chambers: ["house"], rawStore: store });
const deps = { rowsForPolitician: rowsFrom(repo), statsForBills: statsFrom(repo) };
ok(repo.bills.get("us-119-hr-5000").topicTags.length > 0 && repo.bills.get("us-119-hr-6100").topicTags.length > 0, "fixture: H.R. 5000 and H.R. 6100 are tagged");
eq(repo.bills.get("us-119-hres-800").topicTags, [], "fixture: H.Res. 800 is untagged");
let pub = await P.publishedForPolitician("robert_aderholt", deps);
eq(Object.keys(pub.billKeys), ["us-119-hr-5000"], "only the bill passing every rule is public (6100 has an unmapped member, H.Res. 800 no tag)");
eq(pub.billKeys["us-119-hr-5000"].map((r) => [r.roll, r.voteRaw, r.procedural]), [[300, "Yea", false], [301, "Yea", true]], "both rolls on the passing bill, procedural one labelled");
const keysOf = (o) => [...new Set(Object.values(o.billKeys).flat().flatMap((r) => Object.keys(r)))].sort();
eq(keysOf(pub), ["chamber", "congress", "date", "procedural", "question", "roll", "session", "sourceLabel", "sourceUrl", "vote", "voteKind", "voteRaw"], "public rows carry public fields only (no raw key, no member id)");
eq(pub.rulesVersion, P.PUBLISH_RULES_VERSION, "response names the rules version");
// Flip 1: the off-roster member is added to the roster. The next scheduled run
// keeps its ledger (every roll call is done, nothing is refetched); its roster
// catch-up fills the member's rows, and H.R. 6100 publishes on the next read.
let refetched = 0;
const fxCount = async (u) => { if (/\/members/.test(String(u))) refetched++; return fx(u); };
const run2 = await C.runVoteActions({ fetch: fxCount, repo, state: run1.state, memberMap: { ...roster, X000009: "new_member" }, apiKey: "k", now: () => NOW, log: () => {}, chambers: ["house"], rawStore: store });
eq([refetched, run2.report.processed], [0, 0], "the roster update refetches no roll call");
eq(run2.report.membersRemapped, 1, "roster catch-up fills the newly mapped member's row");
ok(C.summaryLine(run2.report).includes("remapped 1"), "summary line reports the catch-up");
pub = await P.publishedForPolitician("robert_aderholt", deps);
eq(Object.keys(pub.billKeys).sort(), ["us-119-hr-5000", "us-119-hr-6100"], "mapping the member publishes H.R. 6100 on the next read");
const run3 = await C.runVoteActions({ fetch: fx, repo, state: run2.state, memberMap: { ...roster, X000009: "new_member" }, apiKey: "k", now: () => NOW, log: () => {}, chambers: ["house"], rawStore: store });
eq(run3.report.membersRemapped, 0, "catch-up is idempotent: nothing left to fill");
const mapped = [...repo.votes.values()].find((r) => r.bioguideId === "B000001");
const unmapRun = await C.runVoteActions({ fetch: fx, repo, state: run3.state, memberMap: { A000055: "robert_aderholt" }, apiKey: "k", now: () => NOW, log: () => {}, chambers: ["house"] });
eq([unmapRun.report.membersRemapped, mapped.politicianId], [0, "pat_member"], "catch-up never clears or rewrites an existing mapping");
// Flip 2: a tag arrives on H.Res. 800 (e.g. a late summary re-tags it).
repo.bills.get("us-119-hres-800").topicTags = ["gov_regulation"];
pub = await P.publishedForPolitician("robert_aderholt", deps);
ok("us-119-hres-800" in pub.billKeys, "adding a tag publishes H.Res. 800 on the next read");
// Flip 3: a row without its stored payload holds the bill back again.
const r300 = [...repo.votes.values()].find((r) => r.rollNumber === 300 && r.memberId === "B000001");
const savedRef = r300.rawRef; r300.rawRef = null;
pub = await P.publishedForPolitician("robert_aderholt", deps);
ok(!("us-119-hr-5000" in pub.billKeys), "one row losing its payload reference holds the whole bill back");
r300.rawRef = savedRef;
// Another person's unmapped row on a shared bill holds it back for everyone.
pub = await P.publishedForPolitician("pat_member", deps);
ok("us-119-hr-5000" in pub.billKeys, "same gate for every politician on the bill");
// A run without a raw store: rows carry no payload reference → nothing public.
const bare = memRepo();
await C.runVoteActions({ fetch: fx, repo: bare, memberMap: { ...roster, X000009: "new_member" }, apiKey: "k", now: () => NOW, log: () => {}, chambers: ["house"] });
eq((await P.publishedForPolitician("robert_aderholt", { rowsForPolitician: rowsFrom(bare), statsForBills: statsFrom(bare) })).bills, 0, "no stored payload → nothing public");
// Curator view: every row, raw keys, and the reason a bill is held.
const cur = await P.curatorLinksForPolitician("robert_aderholt", { rowsForPolitician: rowsFrom(bare), statsForBills: statsFrom(bare) });
ok(cur.bills > 0 && Object.values(cur.publish).every((p) => !p.publishable && p.failed.includes("raw_payload_stored")), "curator sees every bill and why it is held");

// ── 4 · the public endpoint ──────────────────────────────────────────────────
const stub = {
  name: "stub",
  setup(b) {
    b.onResolve({ filter: /vote-actions-db\.js$/ }, () => ({ path: "db", namespace: "stub" }));
    b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ loader: "js", contents: "export const publishDeps = { rowsForPolitician: (p) => globalThis.__deps.rowsForPolitician(p), statsForBills: (k) => globalThis.__deps.statsForBills(k) };" }));
  },
};
globalThis.__deps = deps;
const EP = await build("netlify/functions/vote-actions-published.mts", "ep", [stub]);
const res = await EP.default(new Request("https://x/api/vote-actions/published?pid=robert_aderholt"));
const body = await res.json();
eq(res.status, 200, "public endpoint 200 with no sign-in");
eq(res.headers.get("cache-control"), "public, max-age=300", "cached briefly");
eq(Object.keys(body.billKeys).sort(), Object.keys((await P.publishedForPolitician("robert_aderholt", deps)).billKeys).sort(), "endpoint = the gate's output");
ok(!/rawRef|raw-ingest|memberId|bioguide|"house\/119/.test(JSON.stringify(body)), "no raw key or member id in the public response");
eq((await EP.default(new Request("https://x/api/vote-actions/published?pid=%3Cscript%3E"))).status, 400, "malformed pid → 400");
eq([EP.config.path, JSON.stringify(EP.config.method)], ["/api/vote-actions/published", '["GET"]'], "GET-only public path");
globalThis.__deps = { rowsForPolitician: async () => { throw new Error("db down"); }, statsForBills: async () => [] };
const down = await EP.default(new Request("https://x/api/vote-actions/published?pid=robert_aderholt"));
ok(down.status === 500 && !/db down/.test(await down.text()), "a failing read returns 500 without leaking detail");

// ── 5 · the public drawer ────────────────────────────────────────────────────
const FILES = ["cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js", "stance-helpers.js",
  "alignment-tool.js", "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js", "exec-record-ui.js",
  "consistency.js", "voting-record.js", "word-action.js", "profile-spine.js", "profiles-full.js"];
const corpus = buildCorpus(ROOT);
function boot() {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) vm.runInContext(R(f), ctx, { filename: f });
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) { try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member */ } }
  return win;
}
const win = boot();
const CS = win.PDXConsistency;
let dw = null;
for (const pid of Object.keys(win.CMP_DATA)) {
  let keys = []; try { keys = (CS.issueRows(pid) || []).map((r) => r.key); } catch { continue; }
  for (const key of keys) {
    let t = null; try { t = CS.dossierTally(pid, key); } catch { continue; }
    const p = t && t.rows && t.rows.find((x) => !x.d.execAct && CS.voteActionBillKey(x.d));
    if (p) { dw = { pid, key, bk: CS.voteActionBillKey(p.d) }; break; }
  }
  if (dw) break;
}
ok(!!dw, "a drawer with a curated federal measure found");
const baseline = CS.gapViewHtml(dw.pid, dw.key);
// The drawer person's raw rows on the drawer's own bill, through the REAL gate.
const [, c, code, num] = /^us-(\d+)-([a-z]+)-(.+)$/.exec(dw.bk);
const drawerRow = { billKey: dw.bk, chamber: "house", congress: Number(c), session: 1, rollNumber: 77, voteDate: "2025-03-04T00:00:00.000Z", vote: "yes", voteRaw: "Yea", voteKind: "rule", isProcedural: true, question: "On Ordering the Previous Question", sourceUrl: "https://clerk.house.gov/evs/2025/roll077.xml", sourceLabel: "Clerk", rawRef: "house/119/1/roll-00077/x.json" };
const drawerStats = { billKey: dw.bk, measureType: "bill", tagCount: 1, rows: 431, unmappedRows: 0, unknownKindRows: 0, missingRawRows: 0, proceduralRows: 431, rolls: 1 };
async function publicDrawer(stats, user = null) {
  const w = boot();
  const d = { rowsForPolitician: async () => [drawerRow], statsForBills: async () => [stats] };
  const seen = [];
  w.fetch = async (u) => {
    seen.push(String(u));
    const data = String(u).startsWith("/api/vote-actions/published") ? await P.publishedForPolitician(dw.pid, d) : await P.curatorLinksForPolitician(dw.pid, d);
    return { ok: true, json: async () => JSON.parse(JSON.stringify(data)) };
  };
  w.PDXAuth = { state: user ? "in" : "out", user };
  let repainted = 0;
  await w.PDXConsistency.loadVoteActionLinks(dw.pid, () => { repainted++; });
  await new Promise((r) => setTimeout(r, 20));
  return { seen, repainted, html: w.PDXConsistency.gapViewHtml(dw.pid, dw.key) };
}
const passing = await publicDrawer(drawerStats);
const note = (/<tr class="pdxlg-xlr"[\s\S]*?<\/tr>/.exec(passing.html) || [""])[0];
ok(/Also in the raw vote feed: House roll 77, 2025-03-04 — Yea \(procedural\) · <a href="https:\/\/clerk\.house\.gov\/evs\/2025\/roll077\.xml"[^>]*>official record<\/a>/.test(note), `publishable bill → public note, procedural labelled (${note.slice(0, 200)})`);
ok(!/Curator|raw <code>|house\/119\/1/.test(note), "public note carries no curator text or raw key");
eq(passing.html.replace(/<tr class="pdxlg-xlr"[\s\S]*?<\/tr>/g, ""), baseline, "with the note removed the drawer is byte-identical");
for (const [rule, patch] of [["has_topic_tag", { tagCount: 0 }], ["members_mapped", { unmappedRows: 2 }], ["vote_kind_known", { unknownKindRows: 1 }], ["raw_payload_stored", { missingRawRows: 1 }], ["not_nomination", { measureType: "nomination" }]]) {
  const held = await publicDrawer({ ...drawerStats, ...patch });
  eq(held.html, baseline, `held by ${rule} → public drawer byte-identical`);
}
const noStats = await publicDrawer({ ...drawerStats, billKey: "us-0-other-1" });
eq(noStats.html, baseline, "no bill record → public drawer byte-identical");
const curatorView = await publicDrawer({ ...drawerStats, tagCount: 0 }, { email: "cdeluxxe@gmail.com", isAnonymous: false, getIdToken: async () => "t" });
ok(/Curator · also in the raw vote feed \(<code>[^<]+<\/code> · not public: no topic tag\)/.test(curatorView.html) && /raw <code>house\/119\/1\/roll-00077\/x\.json<\/code>/.test(curatorView.html), "curator sees the held bill, why it is held, and the raw key");
const curatorPub = await publicDrawer(drawerStats, { email: "cdeluxxe@gmail.com", isAnonymous: false, getIdToken: async () => "t" });
ok(/ · public\): /.test(curatorPub.html), "curator sees a passing bill marked public");

// ── 6 · curator status reports the gate ──────────────────────────────────────
const allStats = await statsFrom(repo)([...repo.bills.keys()]);
const summary = P.publishSummary(allStats);
eq(summary.publishableBills.text, `${allStats.filter((x) => P.evaluateBill(x.billKey, x).publishable).length} / ${allStats.length} (${(Math.round((allStats.filter((x) => P.evaluateBill(x.billKey, x).publishable).length / allStats.length) * 1000) / 10).toFixed(1)}%)`, "publishable share as n / of (pct)");
eq(Object.keys(summary.failingByRule), P.PUBLISH_RULES.map((r) => r.id), "one fail count per rule");
eq(P.publishSummary([good, { ...good, billKey: "b", tagCount: 0 }, { ...good, billKey: "c", tagCount: 0, unmappedRows: 1 }, { ...good, billKey: "d", measureType: "nomination", tagCount: 0 }]).failingByRule,
  { not_nomination: 1, has_topic_tag: 3, has_votes: 0, members_mapped: 1, vote_kind_known: 0, raw_payload_stored: 0 }, "fail counts per rule");
eq(P.publishSummary([]).publishableBills.text, "0 / 0 (n/a)", "no bills → n/a");
const sb = Q.buildStatusBody({ lastRun: null, ledger: {}, status: { bills: {}, votes: {}, tags: [], unmappedMembers: [], publishStats: allStats }, publish: P.publishSummary });
eq(sb.quality.publish, summary, "status page carries the gate summary under quality.publish");
eq(Object.keys(sb).sort(), ["bills", "lastRun", "ledger", "notDone", "quality", "tags", "unmappedMembers", "votes"], "status body keeps its previous top-level fields");
const st = R("netlify/functions/vote-actions-status.mts");
ok(/publish: publishSummary/.test(st), "status endpoint wires the gate summary");
const dbSrc = R("netlify/lib/vote-actions-db.ts");
const statsSql = dbSrc.slice(dbSrc.indexOf("export async function billPublishStats"));
for (const k of ["tag_count", "rows", "unmapped_rows", "unknown_kind_rows", "missing_raw_rows", "procedural_rows", "rolls"]) ok(new RegExp(`AS ${k}\\b`).test(statsSql), `gate SQL provides ${k}`);
ok(!/\b(INSERT|UPDATE|DELETE|ALTER|CREATE)\b/.test(statsSql.replace(/^\s*\/\/.*$/gm, "")), "gate SQL is read-only");
ok(!/^import /m.test(R("netlify/lib/vote-actions-publish.ts")), "gate module is pure");

rmSync(dir, { recursive: true, force: true });
if (failures.length) {
  console.log(`\n✗ vote-actions publish gate: ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.log(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`✓ vote-actions publish gate: ${passed} checks passed`);
