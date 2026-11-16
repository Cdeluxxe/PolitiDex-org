#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-ingest-raw-store.mjs — one Congress.gov fetcher instead of two
// ─────────────────────────────────────────────────────────────────────────────
// Runs the REAL vote-actions run and the REAL curated House fetcher
// (fetchRollcallsFromCongress in netlify/lib/vr-ingest.ts, bundled with the
// database module stubbed) against one fixture Congress.gov feed. Pins:
//   1. a roll call the vote-actions cron stored is read from "raw-ingest-votes":
//      the curated ingest makes NO /members call for it
//   2. the curated output (RawVote[]) is identical to the old fetch-only path
//   3. both paths record the same member votes and the same canonical bill key
//   4. a missing / empty / unreadable payload falls back to Congress.gov, and a
//      failing store never crashes the ingest
//
//   node scripts/test-vr-ingest-raw-store.mjs   (no database, no network)

import { mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as esbuild from "esbuild";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

// Stub the database client and Blobs so vr-ingest.ts bundles and loads offline.
const stubs = {
  name: "stubs",
  setup(b) {
    b.onResolve({ filter: /db\/index\.js$/ }, () => ({ path: "db", namespace: "stub" }));
    b.onResolve({ filter: /^@netlify\/blobs$/ }, () => ({ path: "blobs", namespace: "stub" }));
    b.onLoad({ filter: /.*/, namespace: "stub" }, (a) => ({
      contents: a.path === "db" ? "export const db = new Proxy({}, { get() { throw new Error('db used in test'); } });"
        : "export const getStore = () => { throw new Error('blobs used in test'); };",
      loader: "js",
    }));
  },
};
const dir = mkdtempSync(join(tmpdir(), "vr-raw-test-"));
const build = async (entry, name) => {
  const out = join(dir, `${name}.mjs`);
  await esbuild.build({ entryPoints: [join(ROOT, entry)], bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "silent", plugins: [stubs], packages: undefined });
  return import(pathToFileURL(out).href);
};
const VA = await build("netlify/lib/vote-actions-core.ts", "va");
const VR = await build("netlify/lib/vr-ingest.ts", "vr");
const MS = await build("netlify/lib/vr-house-members-source.ts", "ms");

// ── fixture feed ─────────────────────────────────────────────────────────────
const NOW = new Date("2026-11-15T12:00:00Z");
const API = "https://api.congress.gov/v3";
const houseList = { houseRollCallVotes: [
  { congress: 119, rollCallNumber: 300, sessionNumber: 2, startDate: "2026-11-12T14:00:00-05:00", legislationType: "HR", legislationNumber: "5000", result: "Passed", url: `${API}/house-vote/119/2/300` },
  { congress: 119, rollCallNumber: 301, sessionNumber: 2, startDate: "2026-11-13T14:00:00-05:00", legislationType: "HR", legislationNumber: "5000", amendmentType: "HAMDT", amendmentNumber: "90", result: "Failed", url: `${API}/house-vote/119/2/301` },
  { congress: 119, rollCallNumber: 303, sessionNumber: 2, startDate: "2026-11-14T10:00:00-05:00", legislationType: "HRES", legislationNumber: "800", result: "Agreed to", url: `${API}/house-vote/119/2/303` },
  { congress: 119, rollCallNumber: 304, sessionNumber: 2, startDate: "2026-11-14T11:00:00-05:00", legislationType: "HR", legislationNumber: "6100", result: "Passed", url: `${API}/house-vote/119/2/304` },
], pagination: { count: 4 } };
const members = (rows, extra = {}) => ({ houseRollCallVoteMemberVotes: { ...extra, results: rows } });
const memberBodies = {
  300: members([
    { bioguideID: "A000055", firstName: "Robert", lastName: "Aderholt", voteCast: "Yea", voteParty: "R", voteState: "AL" },
    { bioguideID: "Z999999", firstName: "Off", lastName: "Roster", voteCast: "Nay", voteParty: "D", voteState: "CA" },
    { bioguideID: "A000148", firstName: "Jake", lastName: "Auchincloss", voteCast: "Not Voting", voteParty: "D", voteState: "MA" },
    { bioguideID: "B000001", firstName: "Pat", lastName: "Present", voteCast: "Present", voteParty: "R", voteState: "TX" },
  ], { voteQuestion: "On Passage", sourceDataURL: "https://clerk.house.gov/evs/2026/roll300.xml" }),
  301: members([{ bioguideID: "A000055", voteCast: "Nay", voteParty: "R", voteState: "AL" }, { bioguideID: "A000148", voteCast: "Aye", voteParty: "D", voteState: "MA" }],
    { voteQuestion: "On Agreeing to the Amendment", amendmentType: "HAMDT", amendmentNumber: "90", amendmentPurpose: "An amendment to prohibit funds for border wall construction" }),
  303: members([], { voteQuestion: "On Agreeing to the Resolution" }), // posted late: empty now
  304: members([{ bioguideID: "A000055", voteCast: "Yea", voteParty: "R", voteState: "AL" }], { voteQuestion: "On Passage" }),
};
let calls = [];
const fakeFetch = async (url) => {
  const u = String(url);
  calls.push(u);
  const J = (b) => ({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(b)), text: async () => JSON.stringify(b), headers: { get: () => "application/json" } });
  if (u.startsWith(`${API}/house-vote/119?`)) return J(houseList);
  const m = u.match(/house-vote\/119\/2\/(\d+)\/members/);
  if (m && memberBodies[m[1]]) return J(memberBodies[m[1]]);
  if (u.startsWith(`${API}/bill/119/hr/5000?`)) return J({ bill: { title: "Secure Our Border Act" } });
  if (u.startsWith(`${API}/amendment/119/hamdt/90`)) return J({ amendment: { purpose: "An amendment to prohibit funds for border wall construction." } });
  return { ok: false, status: 404, json: async () => ({}), text: async () => "", headers: { get: () => null } };
};
const memberCalls = (roll) => calls.filter((u) => u.includes(`/house-vote/119/2/${roll}/members`)).length;
function memStore() {
  const m = new Map();
  return {
    m,
    async setJSON(k, v) { m.set(k, JSON.parse(JSON.stringify(v))); },
    async get(k) { return m.has(k) ? JSON.parse(JSON.stringify(m.get(k))) : null; },
    async list({ prefix }) { return { blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
  };
}
function memRepo() {
  const bills = new Map(), votes = new Map();
  const vk = (r) => [r.chamber, r.congress, r.session, r.rollNumber, r.memberIdScheme, r.memberId].join("|");
  return {
    bills, votes,
    async getBill(k) { return bills.get(k) || null; },
    async upsertBill(b) { bills.set(b.billKey, { ...b }); },
    async upsertVotes(rows) { for (const r of rows) votes.set(vk(r), { ...r }); return { inserted: rows.length, revised: 0 }; },
    async retagVotes() { return 0; }, async billsNeedingMeta() { return []; }, async billsWithStaleTags() { return []; },
  };
}
const quiet = { log: console.log, warn: console.warn };
const silence = () => { console.log = () => {}; console.warn = () => {}; };
const restore = () => { console.log = quiet.log; console.warn = quiet.warn; };

// ── 1. vote-actions fetches and stores (rolls 300, 301, 303; 304 not yet) ────
const store = memStore(), repo = memRepo();
globalThis.fetch = fakeFetch;
await VA.runVoteActions({ fetch: fakeFetch, repo, memberMap: {}, apiKey: "k", now: () => NOW, log: () => {}, chambers: ["house"], maxRolls: 20, rawStore: store });
ok([...store.m.keys()].some((k) => k.startsWith("house/119/2/roll-00300/")), "vote-actions stored roll 300");
// Drop roll 304 from the store: it stands for a roll call vote-actions has not reached yet.
for (const k of [...store.m.keys()]) if (k.startsWith("house/119/2/roll-00304/")) store.m.delete(k);

// ── 2. curated ingest reads stored rolls, fetches only the rest ──────────────
process.env.CONGRESS_GOV_API_KEY = "k";
calls = [];
silence();
const fromStore = await VR.fetchRollcallsFromCongress({ congress: 119, chamber: "house", limit: 20, rawStore: store });
restore();
eq([memberCalls(300), memberCalls(301)], [0, 0], "no Congress.gov /members call for a roll call whose payload is stored");
eq(memberCalls(303), 1, "stored payload with no member positions (posted late) → fetched from Congress.gov");
eq(memberCalls(304), 1, "roll call not in the store → fetched from Congress.gov");
const callsWithStore = calls.length;

calls = [];
silence();
const oldPath = await VR.fetchRollcallsFromCongress({ congress: 119, chamber: "house", limit: 20 });
restore();
eq([memberCalls(300), memberCalls(301), memberCalls(303), memberCalls(304)], [1, 1, 1, 1], "without a store every roll call is fetched (old path)");
ok(callsWithStore === calls.length - 2, "the store saves exactly the two stored rolls' fetches");
eq(fromStore, oldPath, "curated RawVote output is identical to the old fetch-only path");
eq(fromStore.map((v) => v.rollNumber).sort(), [300, 301, 303, 304], "every roll call still produced");

// ── 3. same member votes, same bill key across both paths ────────────────────
const vrToVa = { yea: "yes", nay: "no", present: "present", not_voting: "not_voting" };
const pdx = [...repo.votes.values()];
for (const roll of [300, 301]) {
  const vr = fromStore.find((v) => v.rollNumber === roll);
  const a = vr.memberVotes.map((m) => [m.bioguideId, vrToVa[m.position]]).sort();
  const b = pdx.filter((r) => r.rollNumber === roll).map((r) => [r.memberId, r.vote]).sort();
  eq(a, b, `roll ${roll}: curated and vote-actions record the same member votes`);
  const bill = repo.bills.get(pdx.find((r) => r.rollNumber === roll).billKey);
  eq(vr.measure.number, bill.number, `roll ${roll}: same canonical citation (${bill.number})`);
  eq(VA.vrMeasureBillKey(vr.measure), bill.billKey, `roll ${roll}: vr_measures (congress, number) → pdx bill_key ${bill.billKey}`);
}
eq(VA.vrMeasureBillKey({ congress: 119, number: "H.R. 5000" }), "us-119-hr-5000", "H.R. → hr");
eq(VA.vrMeasureBillKey({ congress: 119, number: "S.J.Res. 12" }), "us-119-sjres-12", "S.J.Res. → sjres");
eq(VA.vrMeasureBillKey({ congress: 119, number: "H.Amdt. 90" }), "us-119-hamdt-90", "H.Amdt. → hamdt");
eq(VA.vrMeasureBillKey({ congress: 119, number: "H.Con.Res. 4" }), "us-119-hconres-4", "H.Con.Res. → hconres");
eq([VA.vrMeasureBillKey({ congress: 119, number: null }), VA.vrMeasureBillKey({ congress: null, number: "H.R. 1" })], [null, null], "numberless / congress-less measure → no key");
for (const [code, num] of [["hr", "1"], ["s", "5"], ["hres", "800"], ["sres", "9"], ["hjres", "3"], ["sjres", "12"], ["hconres", "4"], ["sconres", "2"], ["hamdt", "90"], ["samdt", "2104"]]) {
  const m = VA.measureRef(119, code, num);
  eq(VA.vrMeasureBillKey({ congress: 119, number: m.number }), m.billKey, `round trip ${code} ${num}`);
}

// ── 4. fallbacks never crash ─────────────────────────────────────────────────
const broken = { async list() { throw new Error("blobs down"); }, async get() { throw new Error("blobs down"); }, async setJSON() {} };
calls = [];
silence();
const fromBroken = await VR.fetchRollcallsFromCongress({ congress: 119, chamber: "house", limit: 20, rawStore: broken });
restore();
eq(fromBroken, oldPath, "unreadable store → old fetch path, same output");
const notes = [];
const r = await MS.readHouseMembers({ store: broken, fetch: fakeFetch, apiKey: "k", chamber: "house", congress: 119, session: 2, roll: 300, log: (l) => notes.push(l) });
eq(r.source, "congress_gov", "store error falls back to Congress.gov");
ok(notes.some((l) => l.includes("raw store unreadable")), "fallback logs its reason");
// Wrong-roll / failed-status payloads are never used.
const odd = memStore();
await odd.setJSON("house/119/2/roll-00300/a.json", { kind: "house_vote", congress: 119, session: 2, roll: 301, http_status: 200, body: JSON.stringify(memberBodies[301]) });
await odd.setJSON("house/119/2/roll-00300/b.json", { kind: "house_vote", congress: 119, session: 2, roll: 300, http_status: 500, body: JSON.stringify(memberBodies[300]) });
await odd.setJSON("house/119/2/roll-00300/c.json", { kind: "house_vote", congress: 119, session: 2, roll: 300, http_status: 200, body: "{not json" });
const s1 = await MS.readStoredMembers(odd, "house", 119, 2, 300);
eq([s1.container, s1.note], [null, "stored payload has no member positions"], "mismatched / non-2xx / unparseable payloads are skipped");
const s2 = await MS.readStoredMembers(null, "house", 119, 2, 300);
eq(s2.note, "no raw store", "no store → clear note");
const s3 = await MS.readStoredMembers(store, "senate", 119, 2, 300);
eq(s3.container, null, "Senate is untouched (curated seed source)");
// Newest usable payload wins.
const multi = memStore();
await multi.setJSON("house/119/2/roll-00300/2026-11-01.json", { kind: "house_vote", congress: 119, session: 2, roll: 300, http_status: 200, body: JSON.stringify(members([{ bioguideID: "A000055", voteCast: "Nay" }])) });
await multi.setJSON("house/119/2/roll-00300/2026-11-02.json", { kind: "house_vote", congress: 119, session: 2, roll: 300, http_status: 200, body: JSON.stringify(memberBodies[300]) });
eq((await MS.readStoredMembers(multi, "house", 119, 2, 300)).rawRef, "house/119/2/roll-00300/2026-11-02.json", "newest stored payload is used");

// ── isolation ────────────────────────────────────────────────────────────────
const { readFileSync } = await import("node:fs");
const src = readFileSync(join(ROOT, "netlify/lib/vr-house-members-source.ts"), "utf8");
ok(!/setJSON\(/.test(src.replace(/^\/\/.*$/gm, "")), "curated ingest never writes the raw store (vote-actions is the only writer)");

rmSync(dir, { recursive: true, force: true });
if (failures.length) {
  console.log(`\n✗ vr-ingest raw store: ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.log(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`✓ vr-ingest raw store: ${passed} checks passed`);
