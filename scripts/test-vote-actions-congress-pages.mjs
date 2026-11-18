#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vote-actions-congress-pages.mjs — Congress-by-Congress discovery + bill pages
// ─────────────────────────────────────────────────────────────────────────────
// Bundles netlify/lib/vote-actions-core.ts and runs it against fixture feeds for
// the 119th, 118th and 117th Congresses with an in-memory repo, raw store and page
// store. Then bundles the /b/ edge (share-preview.ts) with share-target.ts's page
// reader pointed at that page store, and renders a generated page through the
// real bill.html template. Pins:
//   1. unprocessed roll calls in the sitting Congress are found (the whole
//      Congress, every run), their bills tagged, votes stored, and a page record
//      written for each bill, in db/bill-docs.json's shape, at /b/<c>/<number>
//   2. the run stays on the sitting Congress while it has work; once it has none
//      it moves to the prior Congress, marks that one complete when done, and
//      never queries a complete Congress again
//   3. bills already complete (data + current page) — and bills the build-time
//      snapshot pages — are skipped: no refetch, no page rewrite
//   4. retry / logging: a failed page build is retried then given up on; the
//      existing RETRY LATER / PARKED / RATE LIMITED behaviour is unchanged
//   5. the page renders through the existing template with its issue blocks
//   6. no scoring or other public route is touched
//
//   node scripts/test-vote-actions-congress-pages.mjs   (no database, no network)

import { readFileSync, mkdtempSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as esbuild from "esbuild";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`   ── ${t}`);

const dir = mkdtempSync(join(tmpdir(), "va-cp-test-"));
const build = async (entry, out) => {
  await esbuild.build({ entryPoints: [entry], bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "silent" });
  return import(pathToFileURL(out).href);
};
const C = await build(join(ROOT, "netlify/lib/vote-actions-core.ts"), join(dir, "core.mjs"));
const P = await build(join(ROOT, "netlify/lib/vote-actions-pages.ts"), join(dir, "pages.mjs"));

// ── fixtures ─────────────────────────────────────────────────────────────────
const NOW = new Date("2026-11-15T12:00:00Z");
const API = "https://api.congress.gov/v3";
const J = (b) => ({ ok: true, status: 200, headers: { get: () => "application/json" }, json: async () => b, text: async () => JSON.stringify(b) });
const T = (b) => ({ ok: true, status: 200, headers: { get: () => "text/xml" }, json: async () => JSON.parse(b), text: async () => b });
const S = (status) => ({ ok: false, status, headers: { get: () => null }, json: async () => ({}), text: async () => "" });
const EMPTY_MENU = "<vote_summary><votes></votes></vote_summary>";

const lists = {
  119: { houseRollCallVotes: [
    { rollCallNumber: 11, sessionNumber: 2, startDate: "2026-11-10T14:00:00-05:00", legislationType: "HR", legislationNumber: "1" },
    { rollCallNumber: 10, sessionNumber: 2, startDate: "2026-11-09T14:00:00-05:00", legislationType: "HR", legislationNumber: "7000" },
  ], pagination: { count: 2 } },
  118: { houseRollCallVotes: [
    { rollCallNumber: 50, sessionNumber: 2, startDate: "2024-06-05T14:00:00-04:00", legislationType: "HR", legislationNumber: "8000" },
  ], pagination: { count: 1 } },
};
const houseMembers = (q) => ({ houseRollCallVoteMemberVotes: { voteQuestion: q, results: [
  { bioguideID: "A000055", firstName: "Robert", lastName: "Aderholt", voteCast: "Yea", voteParty: "R", voteState: "AL" },
  { bioguideID: "A000148", firstName: "Jake", lastName: "Auchincloss", voteCast: "Nay", voteParty: "D", voteState: "MA" },
] } });
const senateMenu118 = `<vote_summary><votes><vote><vote_number>00005</vote_number><vote_date>12-Mar</vote_date></vote></votes></vote_summary>`;
const senateVote118 = `<roll_call_vote><congress>118</congress><session>2</session><vote_number>5</vote_number>
  <vote_date>March 12, 2024, 05:30 PM</vote_date><vote_question_text>On Passage of the Bill S. 100</vote_question_text>
  <vote_result>Bill Passed</vote_result><document><document_type>S.</document_type><document_number>100</document_number><document_title>A bill to fund Border Patrol agents and border wall construction.</document_title></document>
  <amendment><amendment_number></amendment_number></amendment>
  <members><member><last_name>Senator</last_name><first_name>Ann</first_name><party>R</party><state>XX</state><vote_cast>Yea</vote_cast><lis_member_id>S999</lis_member_id></member></members>
</roll_call_vote>`;
const bills = {
  "119/hr/7000": { title: "Secure the Southern Border Act", originChamber: "House", introducedDate: "2026-02-02",
    sponsors: [{ bioguideId: "A000055" }, { bioguideId: "Z000001" }], cosponsors: { count: 4 }, policyArea: { name: "Immigration" } },
  "119/hr/1": { title: "One Big Beautiful Bill Act", originChamber: "House", introducedDate: "2025-05-20", sponsors: [] },
  "118/hr/8000": { title: "Border Wall Funding Act", originChamber: "House", introducedDate: "2024-04-01", sponsors: [{ bioguideId: "A000148" }] },
  "118/s/100": { title: "Border Patrol Agent Act", originChamber: "Senate", introducedDate: "2024-01-10", sponsors: [] },
};
const lc = (code, text, date) => ({ actionCode: code, text, actionDate: date, sourceSystem: { code: 9, name: "Library of Congress" } });
const actions = {
  "119/hr/7000": [lc("8000", "Passed/agreed to in House: On passage Passed by recorded vote: 220 - 210 (Roll no. 10).", "2026-11-09"), lc("1000", "Introduced in House", "2026-02-02")],
  "118/hr/8000": [lc("8000", "Passed/agreed to in House: On passage Passed by the Yeas and Nays: 230 - 200 (Roll no. 50).", "2024-06-05"), lc("1000", "Introduced in House", "2024-04-01")],
  "118/s/100": [lc("17000", "Passed Senate without amendment by Yea-Nay Vote. 60 - 40. Record Vote Number: 5.", "2024-03-12"), lc("10000", "Introduced in Senate", "2024-01-10")],
};
const subjects = { legislativeSubjects: [{ name: "Border security and unlawful immigration" }], policyArea: { name: "Immigration" } };
const summaries = { summaries: [{ text: "<p>Funds border wall construction and hires Border Patrol agents.</p>", updateDate: "2026-03-01" }] };

const calls = [];
let failActions = false;
const fakeFetch = async (url) => {
  const u = String(url);
  calls.push(u);
  let m;
  if ((m = u.match(/\/house-vote\/(\d+)\?/))) return lists[m[1]] ? J(lists[m[1]]) : S(404);
  if ((m = u.match(/\/house-vote\/(\d+)\/(\d+)\/(\d+)\/members/))) return J(houseMembers("On Passage"));
  if ((m = u.match(/\/bill\/(\d+)\/(\w+)\/(\d+)\/actions/))) {
    if (failActions) return S(503);
    const a = actions[`${m[1]}/${m[2]}/${m[3]}`]; return a ? J({ actions: a }) : S(404);
  }
  if (u.match(/\/bill\/\d+\/\w+\/\d+\/subjects/)) return J({ subjects });
  if (u.match(/\/bill\/\d+\/\w+\/\d+\/summaries/)) return J(summaries);
  if ((m = u.match(/\/bill\/(\d+)\/(\w+)\/(\d+)\?/))) { const b = bills[`${m[1]}/${m[2]}/${m[3]}`]; return b ? J({ bill: b }) : S(404); }
  if (u.includes("vote_menu_118_2.xml")) return T(senateMenu118);
  if (u.includes("vote_118_2_00005.xml")) return T(senateVote118);
  if (u.includes("vote_menu_")) return T(EMPTY_MENU);
  if (u.includes("legislators-current.json")) return J([{ id: { lis: "S999", bioguide: "A000055" } }]);
  return S(404);
};

function memRepo() {
  const bills = new Map(), votes = new Map();
  const vk = (r) => [r.jurisdiction, r.chamber, r.congress, r.session, r.rollNumber, r.memberIdScheme, r.memberId].join("|");
  return {
    bills, votes,
    async getBill(k) { return bills.get(k) || null; },
    async upsertBill(b) { bills.set(b.billKey, { ...b }); },
    async upsertVotes(rows) {
      let inserted = 0, revised = 0;
      for (const r of rows) { const p = votes.get(vk(r)); if (!p) inserted++; else if (p.vote !== r.vote) revised++; votes.set(vk(r), { ...p, ...r }); }
      return { inserted, revised };
    },
    async retagVotes() { return 0; },
    async billsNeedingMeta() { return []; },
    async billsWithStaleTags(v) { return [...bills.values()].filter((b) => b.taggerVersion !== v); },
    async billsForPages(c) { return [...bills.values()].filter((b) => b.congress === c).sort((a, b) => a.billKey.localeCompare(b.billKey)); },
  };
}
function memStore({ failWrites = false } = {}) {
  const m = new Map();
  return {
    m, writes: 0, failWrites,
    async setJSON(k, v) { this.writes++; if (this.failWrites) throw new Error("blobs unavailable"); m.set(k, JSON.parse(JSON.stringify(v))); },
    async get(k) { return m.has(k) ? JSON.parse(JSON.stringify(m.get(k))) : null; },
    async list({ prefix }) { return { blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
  };
}
const memberMap = { A000055: "robert_aderholt", A000148: "jake_auchincloss" };
// The snapshot already pages 119 H.R. 1 (as db/bill-docs.json does).
const existingPages = new Set(["119|H.R. 1"]);
const snapshotHasHr1 = !!JSON.parse(read("db/bill-docs.json")).docs["119|H.R. 1"];
ok(snapshotHasHr1, "fixture premise: the real snapshot pages 119 H.R. 1");
const base = (o = {}) => ({ fetch: fakeFetch, memberMap, apiKey: "secret-key", now: () => NOW, existingPages, floorCongress: 117, ...o });

// ── 1. the sitting Congress: found, tagged, stored, paged ───────────────────
section("1 · sitting Congress: discover → tag → votes → page");
const repo = memRepo(), raw = memStore(), pages = memStore();
let lines = [];
// maxRolls 1: work remains in the 119th, so the run must not move on.
let { report, state } = await C.runVoteActions(base({ repo, rawStore: raw, pageStore: pages, log: (l) => lines.push(l), maxRolls: 1 }));
eq(report.congresses.map((c) => c.congress), [119], "a sitting Congress with work left keeps the run there");
eq(state.congresses["119"].status, "active", "119th recorded as active");
eq(state.congresses["119"].rollsPending, 1, "one roll call still pending in the 119th");
ok(!calls.some((u) => /house-vote\/118\?/.test(u)), "the 118th is not queried while the 119th has work");
calls.length = 0;
({ report, state } = await C.runVoteActions(base({ repo, rawStore: raw, pageStore: pages, state, log: (l) => lines.push(l), maxRolls: 20 })));
ok(calls.some((u) => /house-vote\/119\?/.test(u)) && calls.some((u) => u.includes("vote_menu_119_1.xml")) && calls.some((u) => u.includes("vote_menu_119_2.xml")),
  "discovery re-queries the whole 119th (House list + both Senate sessions) on the next run");
const hr7000 = repo.bills.get("us-119-hr-7000");
ok(hr7000 && hr7000.topicTags.includes("border_security"), "the new bill is tagged with the issues it touches");
eq([...repo.votes.values()].filter((v) => v.billKey === "us-119-hr-7000").map((v) => [v.politicianId, v.vote]).sort(),
  [["jake_auchincloss", "no"], ["robert_aderholt", "yes"]], "its vote records are stored");
const rec = pages.m.get("us/119/H.R.%207000");
ok(rec, "a page record is written for the bill under us/<congress>/<number>");
eq(rec?.url, "/b/119/H.R.%207000", "the page lives at the existing /b/<congress>/<number> address");
eq([rec?.doc.s, rec?.doc.n, rec?.doc.c, rec?.doc.t], ["119", "H.R. 7000", "house", "Secure the Southern Border Act"], "dossier identity: sitting, number, chamber, title");
ok((rec?.doc.m || []).some((x) => x.k === "border_security") && rec.doc.m.every((x) => Object.keys(x).join() === "k"), "related issues are the bill's high-tier tags, keys only");
eq([rec?.doc.st, rec?.doc.sl], ["passed_house", "Passed the House — not law"], "status derived from the official actions, same rules as the snapshot");
eq(rec?.doc.o, { c: "house", d: "2026-02-02" }, "origin from the record");
eq([rec?.doc.sp, rec?.doc.su], [{ s: ["robert_aderholt"] }, { s: 1, c: 4 }], "roster-linked sponsor named; the rest counted, never named");
eq(rec?.doc.h.map((h) => h.a), ["Introduced in the House", "Passed the House"], "history: the key actions, oldest first");
eq(rec?.doc.rs, "https://www.congress.gov/bill/119th-congress/house-bill/7000", "record link is the Congress.gov page");
ok([...raw.m.keys()].some((k) => k.startsWith("bill-record/us-119-hr-7000/")), "the action list is stored unmodified (own prefix, not bills/)");
ok(!JSON.stringify([...raw.m.values(), ...pages.m.values()]).includes("secret-key"), "no API key in any stored payload or page");
ok(!pages.m.has("us/119/H.R.%201"), "a bill the snapshot already pages gets no second page");
ok(repo.bills.has("us-119-hr-1") && [...repo.votes.values()].some((v) => v.billKey === "us-119-hr-1"), "…but its data is still tagged and stored");
ok(lines.some((l) => l.startsWith("vote-actions: PAGE /b/119/H.R.%207000")), "page generation is logged");

// ── 2. moving to the prior Congress ──────────────────────────────────────────
section("2 · the 119th caught up → the 118th, then the 117th");
eq(state.congresses["119"].status, "caught_up", "sitting Congress with nothing left is caught up (not complete — it keeps sitting)");
eq(report.congresses.map((c) => c.congress), [119, 118, 117], "the same run moves on to the prior Congresses");
ok(repo.bills.has("us-118-hr-8000") && repo.bills.has("us-118-s-100"), "118th bills (House list + Senate menu) discovered and tagged");
ok([...repo.votes.values()].some((v) => v.congress === 118 && v.chamber === "senate" && v.politicianId === "robert_aderholt"), "118th Senate votes stored");
const r118 = pages.m.get("us/118/H.R.%208000");
eq([r118?.url, r118?.doc.st, r118?.doc.sl], ["/b/118/H.R.%208000", "failed", "Failed — passed the House, never passed the Senate"], "an ended Congress's page reads the sitting as over");
ok(r118?.doc.h.some((h) => h.a === "Died when the sitting ended" && h.d === "2025-01-03"), "…with the dated row the snapshot writes for an ended sitting");
eq(pages.m.get("us/118/S.%20100")?.doc.st, "failed", "118th Senate bill paged too (passed one chamber of an ended Congress)");
eq(state.congresses["118"].status, "complete", "118th complete: listed, every roll final, every page current");
ok(state.congresses["118"].completedAt === NOW.toISOString() && state.congresses["118"].rollsFinal === 2, "completion time and final roll count recorded");
ok(!Object.keys(state.ledger).some((k) => k.split("|")[1] === "118"), "a complete Congress's ledger rows are folded away");
eq(state.congresses["117"].status, "complete", "117th (no House list, empty Senate menus) completes at once");
ok(lines.some((l) => l.includes("CONGRESS 118 COMPLETE")), "moving on is logged");
ok(/congress 119 → target 117 \[119:caught_up 118:complete 117:complete\]/.test(C.summaryLine(report)), `summary names each Congress (${C.summaryLine(report).slice(0, 120)})`);

// ── 3. complete bills are skipped ────────────────────────────────────────────
section("3 · already-complete bills (data + page) are skipped");
calls.length = 0;
const writesBefore = pages.writes;
({ report, state } = await C.runVoteActions(base({ repo, rawStore: raw, pageStore: pages, state, log: () => {}, maxRolls: 20 })));
ok(calls.some((u) => /house-vote\/119\?/.test(u)), "discovery still re-queries the sitting Congress");
ok(!calls.some((u) => /\/members/.test(u) || /vote_119_/.test(u)), "no final roll call is refetched");
ok(!calls.some((u) => /\/actions/.test(u)), "no current page is rebuilt");
eq(pages.writes, writesBefore, "no page record is rewritten");
ok(!calls.some((u) => /house-vote\/11[78]\?/.test(u) || /vote_menu_11[78]_/.test(u)), "a complete Congress is never queried again");
eq([report.processed, report.pagesGenerated], [0, 0], "nothing processed or generated");
// A changed bill row (late summary re-tag) is no longer complete: its page is rebuilt.
repo.bills.set("us-119-hr-7000", { ...repo.bills.get("us-119-hr-7000"), title: "Secure the Southern Border Act of 2026" });
({ report, state } = await C.runVoteActions(base({ repo, rawStore: raw, pageStore: pages, state, log: () => {} })));
eq([report.pagesGenerated, pages.m.get("us/119/H.R.%207000").doc.t], [1, "Secure the Southern Border Act of 2026"], "a bill whose data changed gets its page rebuilt");
// The sitting Congress's pages are refreshed weekly, from leftover budget only.
const later = new Date(NOW.getTime() + 8 * 86_400_000);
({ report, state } = await C.runVoteActions(base({ repo, rawStore: raw, pageStore: pages, state, now: () => later, log: () => {} })));
eq([report.pagesGenerated, report.pagesRefreshed], [0, 1], "a week-old sitting-Congress page is refreshed (status moves); ended Congresses are not");

// ── 4. retry + logging ───────────────────────────────────────────────────────
section("4 · retry and logging");
{
  const r = memRepo(), pg = memStore(), lg = [];
  failActions = true;
  let st = null;
  ({ report, state: st } = await C.runVoteActions(base({ repo: r, pageStore: pg, log: (l) => lg.push(l), floorCongress: 119 })));
  eq([report.done, report.pagesFailed, pg.m.size], [2, 1, 0], "votes stored; a page whose action list is unavailable is not written");
  ok(lg.some((l) => /PAGE RETRY LATER us-119-hr-7000 — action list unavailable \(HTTP 503\) \(attempt 1\)/.test(l)), "page failure logged RETRY LATER");
  eq(st.congresses["119"].status, "active", "a Congress with a page left is not caught up");
  for (let i = 1; i < P.PAGE_MAX_ATTEMPTS; i++) ({ state: st } = await C.runVoteActions(base({ repo: r, pageStore: pg, state: st, log: (l) => lg.push(l), floorCongress: 119 })));
  ok(lg.some((l) => l.includes("PAGE GAVE UP us-119-hr-7000")), "an always-failing page is given up on after PAGE_MAX_ATTEMPTS");
  eq(st.congresses["119"].status, "caught_up", "…and stops holding the Congress open");
  failActions = false;
  // Page store unavailable: votes still stored, nothing marked complete.
  const r2 = memRepo(), lg2 = [];
  const out = await C.runVoteActions(base({ repo: r2, pageStore: memStore({ failWrites: true }), log: (l) => lg2.push(l), floorCongress: 118 }));
  eq([out.report.done, out.report.pagesGenerated, out.state.congresses["119"].status], [2, 0, "active"], "page store failing: rows written, Congress stays active");
  // Existing retry behaviour for roll calls is unchanged.
  const r3 = memRepo(), lg3 = [];
  const flaky = async (u) => (/\/members/.test(String(u)) ? S(503) : fakeFetch(u));
  let s3 = null;
  for (let i = 0; i < C.MAX_ATTEMPTS; i++) ({ state: s3 } = await C.runVoteActions(base({ fetch: flaky, repo: r3, pageStore: memStore(), state: s3, log: (l) => lg3.push(l), floorCongress: 119 })));
  ok(lg3.some((l) => /RETRY LATER house\|119\|2\|10 — detail unavailable \(attempt 1\)/.test(l)), "roll-call RETRY LATER logging unchanged");
  eq(s3.ledger["house|119|2|10"].status, "parked", "a roll call that never returns members is parked after MAX_ATTEMPTS");
  const rl = await C.runVoteActions(base({ fetch: async () => S(429), repo: memRepo(), pageStore: memStore(), log: () => {} }));
  eq(rl.report.rateLimited, true, "429 still stops the run");
  // No key: Senate still runs, nothing is marked complete (Congress.gov is the record of what exists).
  const nk = await C.runVoteActions(base({ apiKey: null, repo: memRepo(), pageStore: memStore(), log: () => {} }));
  eq([nk.report.congresses.length, nk.state.congresses["119"].status], [1, "active"], "without a key the run stays on the sitting Congress");
  // Budget: the run stops cleanly when out of time.
  let t = 0;
  const bt = await C.runVoteActions(base({ repo: memRepo(), pageStore: memStore(), log: () => {}, clock: () => (t += 10_000), budgetMs: 15_000 }));
  eq(bt.report.budgetHit, true, "time budget respected");
}

// ── 5. the page renders through the existing /b/ template ───────────────────
section("5 · rendered by the existing bill template");
{
  const entry = join(dir, "edge-entry.ts");
  writeFileSync(entry, `export { default as edge } from ${JSON.stringify(join(ROOT, "netlify/edge-functions/share-preview.ts"))};
export { setGeneratedBillPageReader, resetLiveBillIssues } from ${JSON.stringify(join(ROOT, "netlify/lib/share-target.ts"))};`);
  const E = await build(entry, join(dir, "edge.mjs"));
  E.setGeneratedBillPageReader(async (k) => pages.get(k));
  const realFetch = globalThis.fetch;
  const apiCalls = [];
  globalThis.fetch = async (u) => { apiCalls.push(String(u)); return new Response("{}", { status: 404 }); };
  const html = read("bill.html");
  const ctx = { next: async () => new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }) };
  const res = await E.edge(new Request("https://politidex.fyi/b/119/H.R.%207000"), ctx);
  const body = await res.text();
  eq(res.status, 200, "generated page answers 200");
  ok(body.includes('<h1 class="pdx-bill-num">H.R. 7000</h1>') && body.includes("Secure the Southern Border Act of 2026"), "number and title in the document body");
  ok(/<a class="pdx-bill-tag" href="\/i\/border_security" data-pdx-bill-tag="border_security">/.test(body), "related-issue chip links to /i/<key>");
  ok(/data-pdx-bill-issues/.test(body), "the issues block is printed");
  ok(body.includes("Passed the House — not law") && /data-pdx-bill-sponsor="robert_aderholt"/.test(body), "status and roster-linked sponsor printed");
  ok(/<link\s+rel="canonical"\s+href="https:\/\/politidex\.fyi\/b\/119\/H\.R\.%207000"/.test(body), "canonical is the bill's /b/ address");
  ok(!apiCalls.some((u) => u.includes("/measure-ref/")), "a generated page is used before the database identity lookup");
  // A snapshot bill still comes from the snapshot, not from a generated record.
  E.setGeneratedBillPageReader(async () => { throw new Error("must not be asked"); });
  const snap = await (await E.edge(new Request("https://politidex.fyi/b/119/H.R.%201"), ctx)).text();
  ok(snap.includes('<h1 class="pdx-bill-num">H.R. 1</h1>'), "snapshot bills render as before");
  // A record whose identity does not match the address is ignored → honest empty.
  E.setGeneratedBillPageReader(async () => ({ doc: { s: "119", n: "H.R. 9", t: "wrong" } }));
  const miss = await E.edge(new Request("https://politidex.fyi/b/119/H.R.%207001"), ctx);
  eq(miss.status, 404, "a mismatched record is never printed under another address");
  E.setGeneratedBillPageReader(null);
  globalThis.fetch = realFetch;
}

// ── 6. scope ─────────────────────────────────────────────────────────────────
section("6 · scope");
const importsOf = (src) => [...src.matchAll(/^import[^;]*from\s+["']([^"']+)["']/gm)].map((m) => m[1]);
for (const f of ["netlify/lib/vote-actions-core.ts", "netlify/lib/vote-actions-pages.ts"]) {
  ok(!importsOf(read(f)).some((p) => /stance-score|vr-axis|vr-pack|raw-ingest-core|evidence-locker/.test(p)), `${f} imports nothing that scores`);
  ok(!/from ["'][^"']*(@netlify\/blobs|db\/(index|schema))/.test(read(f)), `${f} touches no Blobs or database itself`);
}
const vaFns = readdirSync(join(ROOT, "netlify/functions")).filter((f) => f.startsWith("vote-actions"));
eq(vaFns.sort(), ["vote-actions-bill.mts", "vote-actions-cron.mts", "vote-actions-cross-links.mts", "vote-actions-published.mts", "vote-actions-reparse.mts", "vote-actions-status.mts"], "no vote-actions route beyond the public bill read");
ok(!/bill-pages|generatedBillDoc/.test(read("netlify/functions/voting-record.mts")), "the voting-record API is untouched");
eq(P.pageStoreKey(119, "H.R. 7000"), "us/119/H.R.%207000", "page key spelling");
eq(P.congressEndedOn(119, NOW), null, "the 119th has not ended");
eq(P.congressEndedOn(116, NOW), "2021-01-03", "an older Congress's end date");

rmSync(dir, { recursive: true, force: true });
if (failures.length) {
  console.log(`\n✗ ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.log("  ✗ " + f);
  process.exit(1);
}
console.log(`\n✓ vote-actions congress pages: ${passed} checks passed`);
