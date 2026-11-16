#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vote-actions.mjs — action layer v1 (bill topic sorter + raw vote records)
// ─────────────────────────────────────────────────────────────────────────────
// Bundles netlify/lib/vote-actions-core.ts with esbuild and EXECUTES it against
// fixture House (Congress.gov) and Senate (LIS XML) feeds and an in-memory repo
// honouring the same contract as vote-actions-db.ts. Pins:
//   1. vote words map to yes / no / present / not_voting, anything else is refused
//   2. procedural vs substantive classification, nominations, amendments
//   3. the tagger: multi-topic bills keep several tags, every tag is a register
//      key, curated mappings win, nominations stay untagged
//   4. a run writes one bill row per measure and one vote row per member, maps
//      roster members, keeps off-roster members with politician_id NULL
//   5. delayed data: empty member lists are retried then parked; mixed
//      vocabularies are parked "unsupported"; a changed vote is a revision
//   6. isolation: nothing public reads the new tables, the job is separate from
//      the stance generator, and the core never touches a database itself
//
//   node scripts/test-vote-actions.mjs        (no database, no network)

import { readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
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

const dir = mkdtempSync(join(tmpdir(), "va-test-"));
const out = join(dir, "core.mjs");
await esbuild.build({
  entryPoints: [join(ROOT, "netlify/lib/vote-actions-core.ts")],
  bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "silent",
});
const C = await import(pathToFileURL(out).href);

// ── 1. vote words ────────────────────────────────────────────────────────────
section("vote words");
eq(["Yea", "Aye", "Nay", "No", "Present", "Not Voting"].map(C.normalizeVoteCast), ["yes", "yes", "no", "no", "present", "not_voting"], "four values");
eq(C.normalizeVoteCast("Guilty"), null, "impeachment vocabulary is refused");
eq(C.normalizeVoteCast("Jeffries"), null, "a Speaker ballot name is refused");

// ── 2. classification ────────────────────────────────────────────────────────
section("vote kinds");
eq(C.classifyVote("On Motion to Recommit"), { voteKind: "motion", isProcedural: true }, "recommit is procedural");
eq(C.classifyVote("On Ordering the Previous Question"), { voteKind: "procedural", isProcedural: true }, "previous question");
eq(C.classifyVote("On the Cloture Motion"), { voteKind: "cloture", isProcedural: true }, "cloture");
eq(C.classifyVote("On Motion to Suspend the Rules and Pass, as Amended"), { voteKind: "passage", isProcedural: false }, "suspension is passage");
eq(C.classifyVote("On the Nomination", "nomination"), { voteKind: "nomination", isProcedural: false }, "nomination");
eq(C.classifyVote(null), { voteKind: "unknown", isProcedural: null }, "no question stays unknown");
eq(C.measureRef(119, "HAMDT", "85", { type: "HR", num: "3838" })?.parentBillKey, "us-119-hr-3838", "amendment keeps its parent");
eq(C.measureRef(119, "PN", "12-3")?.billKey, "us-119-pn-12-3", "nomination part suffix kept");
eq(C.measureRef(119, "HR", "1")?.number, "H.R. 1", "canonical citation");
ok(C.isRuleResolution("hres", "Providing for consideration of the bill (H.R. 2102) to amend title 10"), "rule resolution detected");
ok(!C.isRuleResolution("hr", "Providing for consideration of the bill (H.R. 2102)"), "only H.Res. can be a rule");
eq(C.ruleTarget(119, "Providing for consideration of the bill (H.R. 2102) to amend title 10, and for other purposes"), "us-119-hr-2102", "rule points at the bill it brings up");
eq(C.congressForDate(new Date("2026-11-15T00:00:00Z")), 119, "congress for date");
eq(C.sessionForDate(new Date("2026-11-15T00:00:00Z")), 2, "session for date");
eq(C.parseSenateDate("January 9, 2025, 02:57 PM").toISOString(), "2025-01-09T19:57:00.000Z", "EST date");
eq(C.parseSenateDate("July 1, 2025, 10:00 AM").toISOString(), "2025-07-01T14:00:00.000Z", "EDT date");

// ── 3. tagger ────────────────────────────────────────────────────────────────
section("tagger");
const reg = new Set(JSON.parse(read("db/issue-keys.json")).keys);
const multi = C.tagMeasure({
  measureType: "bill",
  title: "Secure the Border and Lower Prescription Drug Prices Act",
  summary: "This bill funds border wall construction and hires additional Border Patrol agents. It also allows Medicare to negotiate prescription drug prices and caps insulin costs.",
  policyArea: "Immigration",
  subjects: ["Border security and unlawful immigration", "Prescription drugs", "Medicare"],
});
ok(multi.tags.length >= 2, `multi-topic bill keeps several tags (got ${multi.tags.join(",")})`);
ok(multi.tags.includes("border_security"), "border_security tagged");
ok(multi.tags.some((t) => /drug|health/.test(t)), "a health/drug key tagged");
ok(multi.tags.every((t) => reg.has(t)), "every tag is a register key");
ok(multi.detail.every((d) => typeof d.confidence === "number" && d.signals.length), "every candidate carries confidence + signals");
ok(!("MAX_TAGS" in C), "no tag-count cap is exported");
eq(multi.tags, multi.detail.filter((d) => d.confidence >= C.TAG_FLOOR).map((d) => d.key), "every key at or above the floor is a tag");
// A large multi-topic package keeps every key above the floor, more than six.
const bigCurated = ["strong_defense", "veterans", "border_security", "healthcare", "housing", "infrastructure", "rural_ag", "climate_action", "public_schools"];
const big = C.tagMeasure({
  measureType: "bill",
  title: "Consolidated Appropriations Act",
  summary: "Funds defense, veterans health care, border security, housing assistance, highways and transit, agriculture, clean energy, and public schools.",
  policyArea: "Economics and Public Finance",
  curatedKeys: bigCurated,
});
ok(big.tags.length > 6, `a large bill holds more than six tags (got ${big.tags.length})`);
ok(bigCurated.every((k) => big.tags.includes(k)), "every curated key on the large bill is kept");
eq(big.tags, big.detail.filter((d) => d.confidence >= C.TAG_FLOOR).map((d) => d.key), "large bill: tags = every candidate above the floor");
ok(big.multiTopic, "large bill still flagged multi-topic");
ok(big.tags.every((t) => reg.has(t)), "large bill: every tag is a register key");
const nom = C.tagMeasure({ measureType: "nomination", title: "Jane Doe, of Ohio, to be Secretary of Energy" });
eq([nom.tags, nom.untagged], [[], "nomination"], "nominations stay untagged");
const cur = C.tagMeasure({ measureType: "bill", title: "To designate a post office", curatedKeys: ["gov_transparency", "not_a_key"] });
eq(cur.tags, ["gov_transparency"], "curated key wins; unknown key dropped");
const none = C.tagMeasure({ measureType: "bill", title: "To designate the facility of the United States Postal Service at 1 Main Street as the Jane Doe Post Office" });
eq(none.tags, [], "a naming bill gets no tag");
ok(!("direction" in multi) && multi.detail.every((d) => !("supportMeaning" in d)), "no direction is assigned");
ok(C.TAG_KEYS.size === reg.size, "tag allow-list = related-issues map ∩ register");

// ── 4/5. a run ───────────────────────────────────────────────────────────────
section("run");
const NOW = new Date("2026-11-15T12:00:00Z");
const API = "https://api.congress.gov/v3";
const houseList = { houseRollCallVotes: [
  { rollCallNumber: 300, sessionNumber: 2, startDate: "2026-11-12T14:00:00-05:00", legislationType: "HR", legislationNumber: "5000", result: "Passed", url: `${API}/house-vote/119/2/300` },
  { rollCallNumber: 301, sessionNumber: 2, startDate: "2026-11-13T14:00:00-05:00", legislationType: "HR", legislationNumber: "5000", amendmentType: "HAMDT", amendmentNumber: "90", result: "Failed" },
  { rollCallNumber: 302, sessionNumber: 2, startDate: "2026-11-13T15:00:00-05:00", result: "Elected" },
  { rollCallNumber: 303, sessionNumber: 2, startDate: "2026-11-14T10:00:00-05:00", legislationType: "HRES", legislationNumber: "800" },
  { rollCallNumber: 10, sessionNumber: 1, startDate: "2025-02-01T10:00:00-05:00", legislationType: "HR", legislationNumber: "1" },
], pagination: { count: 5 } };
const members = (rows, extra = {}) => ({ houseRollCallVoteMemberVotes: { ...extra, results: rows } });
let roll300 = [
  { bioguideID: "A000055", firstName: "Robert", lastName: "Aderholt", voteCast: "Yea", voteParty: "R", voteState: "AL" },
  { bioguideID: "Z999999", firstName: "Off", lastName: "Roster", voteCast: "Nay", voteParty: "D", voteState: "CA" },
  { bioguideID: "A000148", firstName: "Jake", lastName: "Auchincloss", voteCast: "Not Voting", voteParty: "D", voteState: "MA" },
];
const senateMenu = `<vote_summary><votes>
  <vote><vote_number>00500</vote_number><vote_date>10-Nov</vote_date><issue>PN12-3</issue></vote>
  <vote><vote_number>00499</vote_number><vote_date>01-Jun</vote_date></vote>
</votes></vote_summary>`;
const senateVote = `<roll_call_vote><congress>119</congress><session>2</session><vote_number>500</vote_number>
  <vote_date>November 10, 2026, 05:30 PM</vote_date><vote_question_text>On the Nomination PN12-3</vote_question_text>
  <vote_result>Nomination Confirmed</vote_result><document><document_type>PN</document_type><document_number>12-3</document_number><document_title>Jane Doe, of Ohio, to be Secretary of Energy</document_title></document>
  <amendment><amendment_number></amendment_number></amendment>
  <members><member><last_name>Senator</last_name><first_name>Ann</first_name><party>R</party><state>XX</state><vote_cast>Yea</vote_cast><lis_member_id>S999</lis_member_id></member>
  <member><last_name>Other</last_name><first_name>Bo</first_name><party>D</party><state>YY</state><vote_cast>Nay</vote_cast><lis_member_id>S998</lis_member_id></member></members>
</roll_call_vote>`;
const calls = [];
const fakeFetch = async (url) => {
  calls.push(url);
  const u = String(url);
  const J = (b) => ({ ok: true, status: 200, json: async () => b, text: async () => JSON.stringify(b) });
  const T = (b) => ({ ok: true, status: 200, json: async () => JSON.parse(b), text: async () => b });
  const N = { ok: false, status: 404, json: async () => ({}), text: async () => "" };
  if (u.startsWith(`${API}/house-vote/119?`)) return J(houseList);
  if (u.startsWith(`${API}/house-vote/119/2/300/members`)) return J(members(roll300, { voteQuestion: "On Passage", sourceDataURL: "https://clerk.house.gov/evs/2026/roll300.xml" }));
  if (u.startsWith(`${API}/house-vote/119/2/301/members`)) return J(members([{ bioguideID: "A000055", voteCast: "Nay" }], { voteQuestion: "On Agreeing to the Amendment", amendmentPurpose: "An amendment to prohibit funds for border wall construction" }));
  if (u.startsWith(`${API}/house-vote/119/2/302/members`)) return J(members([{ bioguideID: "A000055", voteCast: "Jeffries" }, { bioguideID: "A000148", voteCast: "Present" }], { voteQuestion: "Election of the Speaker" }));
  if (u.startsWith(`${API}/house-vote/119/2/303/members`)) return J(members([], { voteQuestion: "On Agreeing to the Resolution" }));
  if (u.startsWith(`${API}/bill/119/hr/5000/subjects`)) return J({ subjects: { legislativeSubjects: [{ name: "Border security and unlawful immigration" }], policyArea: { name: "Immigration" } } });
  if (u.startsWith(`${API}/bill/119/hr/5000/summaries`)) return J({ summaries: [] });
  if (u.startsWith(`${API}/bill/119/hr/5000?`)) return J({ bill: { title: "Secure Our Border Act", policyArea: { name: "Immigration" } } });
  if (u.startsWith(`${API}/amendment/119/hamdt/90`)) return J({ amendment: { purpose: "An amendment to prohibit funds for border wall construction." } });
  if (u.includes("vote_menu_119_2.xml")) return T(senateMenu);
  if (u.includes("vote_119_2_00500.xml")) return T(senateVote);
  if (u.includes("legislators-current.json")) return J([{ id: { lis: "S999", bioguide: "A000055" } }]);
  return N;
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
      for (const r of rows) {
        const p = votes.get(vk(r));
        if (!p) inserted++; else if (p.vote !== r.vote) { revised++; r.revisedAt = "now"; }
        votes.set(vk(r), { ...p, ...r });
      }
      return { inserted, revised };
    },
    async retagVotes(k, tags, v) { let n = 0; for (const r of votes.values()) if (r.billKey === k) { r.topicTags = tags; r.taggerVersion = v; n++; } return n; },
    async curatedKeysFor() { return []; },
    async billsNeedingMeta() { return []; },
    async billsWithStaleTags(v) { return [...bills.values()].filter((b) => b.taggerVersion !== v); },
  };
}

const repo = memRepo();
const memberMap = { A000055: "robert_aderholt", A000148: "jake_auchincloss" };
const lines = [];
let { report, state } = await C.runVoteActions({ fetch: fakeFetch, repo, memberMap, apiKey: "k", now: () => NOW, log: (l) => lines.push(l), maxRolls: 20 });
eq(report.candidates, { house: 4, senate: 1 }, "window keeps recent roll calls only (2025 roll + June senate vote out)");
eq([report.done, report.unsupported, report.incomplete], [3, 1, 1], "3 done, Speaker vote unsupported, empty roll retried");
eq(repo.bills.size, 3, "one bill row per measure (bill, amendment, nomination)");
const hr = repo.bills.get("us-119-hr-5000");
ok(hr && hr.topicTags.includes("border_security"), "H.R. 5000 tagged border_security");
eq(hr?.metaSource, "congress_gov", "bill text from Congress.gov");
eq(hr?.hasSummary, false, "no CRS summary yet → refetch later");
const am = repo.bills.get("us-119-hamdt-90");
eq(am?.parentBillKey, "us-119-hr-5000", "amendment parent stored");
ok(am && am.title.includes("prohibit funds"), "amendment tagged from its own purpose");
eq(repo.bills.get("us-119-pn-12-3")?.topicTags, [], "nomination untagged");
const v = [...repo.votes.values()];
eq(v.length, 3 + 1 + 2, "one vote row per member per roll call");
const ader = v.find((r) => r.rollNumber === 300 && r.memberId === "A000055");
eq([ader?.politicianId, ader?.vote, ader?.voteRaw, ader?.voteKind, ader?.isProcedural, ader?.sourceUrl], ["robert_aderholt", "yes", "Yea", "passage", false, "https://clerk.house.gov/evs/2026/roll300.xml"], "House record fields");
ok(ader?.topicTags.includes("border_security") && ader?.voteDate.startsWith("2026-11-12"), "record carries tags + date");
const off = v.find((r) => r.memberId === "Z999999");
eq([off?.politicianId, off?.bioguideId, off?.vote], [null, "Z999999", "no"], "off-roster member kept with no politician");
eq(v.find((r) => r.memberId === "A000148" && r.rollNumber === 300)?.vote, "not_voting", "not voting recorded");
const sen = v.find((r) => r.chamber === "senate" && r.memberId === "S999");
eq([sen?.memberIdScheme, sen?.bioguideId, sen?.politicianId, sen?.voteKind], ["lis", "A000055", "robert_aderholt", "nomination"], "Senate LIS → bioguide → roster");
eq(v.find((r) => r.memberId === "S998")?.politicianId, null, "unresolved LIS id is never guessed");
ok(sen?.sourceUrl.endsWith("vote_119_2_00500.htm"), "Senate source is the LIS page");
ok(!v.some((r) => r.rollNumber === 302), "no rows from the Speaker election");
ok(lines.some((l) => l.includes("UNSUPPORTED house|119|2|302")), "unsupported logged");
ok(!v.some((r) => "score" in r || "contradiction" in r || "supportMeaning" in r), "no score / contradiction / direction in records");

// Second run: nothing final is refetched; the empty roll is retried; a corrected vote is a revision.
roll300 = roll300.map((m) => (m.bioguideID === "A000148" ? { ...m, voteCast: "Yea" } : m));
state.ledger["house|119|2|300"].status = "incomplete"; // force a re-read of 300
calls.length = 0;
({ report, state } = await C.runVoteActions({ fetch: fakeFetch, repo, memberMap, apiKey: "k", state, now: () => NOW, log: () => {}, maxRolls: 20 }));
ok(!calls.some((u) => u.includes("/2/301/members") || u.includes("/2/302/members")), "final roll calls are not refetched");
ok(calls.some((u) => u.includes("/2/303/members")), "empty roll call retried");
eq(report.votesRevised, 1, "changed vote counted as a revision");
eq(v.length, repo.votes.size, "re-read adds no duplicate rows");
for (let i = 0; i < C.MAX_ATTEMPTS; i++) ({ state } = await C.runVoteActions({ fetch: fakeFetch, repo, memberMap, apiKey: "k", state, now: () => NOW, log: () => {} }));
eq(state.ledger["house|119|2|303"].status, "parked", "an always-empty roll is parked after MAX_ATTEMPTS");

// No key: House skipped, Senate still runs.
calls.length = 0;
const r2 = await C.runVoteActions({ fetch: fakeFetch, repo: memRepo(), memberMap, apiKey: null, now: () => NOW, log: () => {} });
ok(!calls.some((u) => u.includes("api.congress.gov")), "no Congress.gov call without a key");
eq([r2.report.houseConfigured, r2.report.done], [false, 1], "Senate still ingested without a key");
// Rate limit stops the run cleanly.
const r3 = await C.runVoteActions({ fetch: async () => ({ ok: false, status: 429, json: async () => ({}), text: async () => "" }), repo: memRepo(), memberMap, apiKey: "k", now: () => NOW, log: () => {} });
eq(r3.report.rateLimited, true, "429 stops the run");
// Tagger version bump re-tags locally and follows onto votes.
const rb = memRepo(); rb.bills.set("x", { ...hr, billKey: "x", taggerVersion: "old", topicTags: [] });
rb.votes.set("a", { billKey: "x", topicTags: [], taggerVersion: "old" });
const r4 = await C.runVoteActions({ fetch: async () => ({ ok: false, status: 404 }), repo: rb, memberMap, apiKey: null, now: () => NOW, log: () => {}, chambers: [] });
eq([r4.report.retagged, rb.votes.get("a").taggerVersion], [1, C.TAGGER_VERSION], "re-tag follows onto vote rows");

// ── 6. isolation ─────────────────────────────────────────────────────────────
section("isolation");
const core = read("netlify/lib/vote-actions-core.ts");
ok(!/from ["'][^"']*db\/(index|schema)/.test(core) && !/@netlify\/blobs/.test(core), "core touches no database or Blobs itself");
const dbRepo = read("netlify/lib/vote-actions-db.ts");
ok(!/\.insert\(vr|\.update\(vr|\.delete\(vr/.test(dbRepo), "repo never writes a vr_* table");
const cron = read("netlify/functions/vote-actions-cron.mts");
const importsOf = (src) => [...src.matchAll(/^import[^;]*from\s+["']([^"']+)["']/gm)].map((m) => m[1]);
ok(!importsOf(cron).some((p) => /raw-ingest|stance-score|evidence-locker|stated-positions/.test(p)), "cron imports nothing from the stance generator");
ok(!importsOf(core).some((p) => /raw-ingest|stance-score|evidence-locker|stated-positions-core/.test(p)), "core imports nothing from the stance pipeline (vocab + keys only)");
ok(!/vote-actions/.test(read("netlify/functions/raw-ingest-cron.mts")), "stance generator does not call the action layer");
const readers = readdirSync(join(ROOT, "netlify/functions")).filter((f) => !f.startsWith("vote-actions"))
  .filter((f) => /pdx_vote_actions|pdx_action_bills|pdxVoteActions|pdxActionBills|vote-actions/.test(read(`netlify/functions/${f}`)));
eq(readers, [], "no other function reads the action tables");
const edge = readdirSync(join(ROOT, "netlify/edge-functions")).filter((f) => /vote-actions|pdx_vote_actions/.test(read(`netlify/edge-functions/${f}`)));
eq(edge, [], "no edge function reads the action tables");
ok(/path: "\/api\/admin\/vote-actions"/.test(read("netlify/functions/vote-actions-status.mts")) && /requireAdmin/.test(read("netlify/functions/vote-actions-status.mts")), "status endpoint is curator-only");

rmSync(dir, { recursive: true, force: true });
if (failures.length) {
  console.log(`\n✗ ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.log("  ✗ " + f);
  process.exit(1);
}
console.log(`\n✓ vote-actions: ${passed} checks passed`);
