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
//      key, presence-only (no scores / threshold / cap), text signals only,
//      nominations stay untagged
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
ok(multi.detail.every((d) => d.signals.length && !("weight" in d) && !("rank" in d)), "every tag carries its signals, no weight or rank");
ok(multi.detail.every((d) => (d.impactTier === "high" || d.impactTier === "low") && typeof d.confidence === "number" && Array.isArray(d.tierReasons)), "every tag carries an impact tier");
eq([...multi.highTags, ...multi.lowTags].sort(), multi.tags, "high + low tiers together are the full tag list");
eq(multi.tags, multi.detail.map((d) => d.key), "every matched key is a tag (no threshold)");
eq(multi.tags, [...multi.tags].sort(), "tags are unranked (alphabetical)");
ok(!("MAX_TAGS" in C) && !("TAG_FLOOR" in C) && !("SIGNAL" in C), "no cap or cutoff threshold exported");
// A single weak signal is enough: one subject term, no title/summary match.
const one = C.tagMeasure({ measureType: "bill", title: "To amend title 5", subjects: ["Veterans' education, employment, rehabilitation"] });
ok(one.tags.includes("veterans"), `one subject term alone tags a key (got ${one.tags.join(",")})`);
// A large multi-topic package carries every key its text matches — any number.
const big = C.tagMeasure({
  measureType: "bill",
  title: "Consolidated Appropriations Act",
  summary: "Funds the military and national defense, veterans health care, border security and the border wall, affordable housing and rent assistance, highways, bridges and public transit, farmers and rural communities, clean energy and climate resilience, public schools and teachers, Social Security and Medicare administration, and law enforcement grants for police.",
  subjects: ["Veterans' medical care", "Border security and unlawful immigration", "Housing finance and home ownership", "Agricultural practices and innovations", "Elementary and secondary education", "Law enforcement officers"],
});
ok(big.tags.length > 6, `a large bill carries more than six tags (got ${big.tags.length}: ${big.tags.join(",")})`);
eq(big.tags, big.detail.map((d) => d.key), "large bill: every matched key stored");
ok(big.multiTopic, "large bill flagged multi-topic");
ok(big.tags.every((t) => reg.has(t)), "large bill: every tag is a register key");
eq(big.lowTags, [], "large appropriations bill: every tag is high tier");
ok(big.highTags.length > 6, `large bill: more than six high-tier tags (got ${big.highTags.length})`);
ok(big.detail.every((d) => d.tierReasons.includes("major-bill:appropriations")), "appropriations recognised as a major bill");

section("impact tiers");
// A post-office rename whose only match is the address's "Main Street".
const po = C.tagMeasure({ measureType: "bill", title: "To designate the facility of the United States Postal Service located at 1 Main Street in Springfield, Ohio, as the \"Jane Doe Post Office\"." });
ok(po.tags.length >= 1, `rename bill still stores its incidental tag (got ${po.tags.join(",")})`);
eq([po.highTags, po.lowTags], [[], po.tags], "rename bill: incidental match is low tier");
eq(po.billImpact.minorBill, "facility_rename", "rename bill detected");
// Same incidental keyword, no rename shape: low on confidence alone.
const inc = C.tagMeasure({ measureType: "bill", title: "To amend the Main Street Parity Act regarding filing deadlines" });
ok(inc.tags.length && inc.detail.every((d) => d.confidence < C.HIGH_TIER_MIN_CONFIDENCE && d.impactTier === "low"), `single incidental keyword is low tier (${JSON.stringify(inc.detail.map((d) => [d.key, d.confidence]))})`);
// A private relief bill is low even with a subject term.
const priv = C.tagMeasure({ measureType: "bill", title: "For the relief of John Doe", subjects: ["Immigration status and procedures"] });
ok(priv.tags.length === 0 || priv.lowTags.length === priv.tags.length, "private bill: every tag low tier");
// One subject term alone no longer promotes a key; two subject terms do.
const buried = C.tagMeasure({ measureType: "bill", title: "To amend title 38", subjects: ["Veterans' medical care"] });
ok(buried.tags.includes("veterans") && buried.lowTags.includes("veterans"), `a single subject-term match is kept, low tier (${JSON.stringify(buried.detail)})`);
const buried2 = C.tagMeasure({ measureType: "bill", title: "To amend title 38", subjects: ["Veterans' medical care", "Veterans' education, employment, rehabilitation"] });
ok(buried2.highTags.includes("veterans") && buried2.detail.find((d) => d.key === "veterans").tierReasons.includes("subject-terms"), "two subject terms naming the key make it high tier");
const oversight = C.tagMeasure({ measureType: "bill", title: "To amend title 5", subjects: ["Congressional oversight"] });
ok(!oversight.highTags.includes("congress_oversight"), "a CRS 'Congressional oversight' subject alone does not put the key in the top tier");

section("whole-word keywords and the measure stoplist");
eq(C.tagMeasure({ measureType: "bill", title: "Department of Homeland Security Appropriations Act" }).tags.includes("enviro_balance"), false, "'land' does not fire inside 'Homeland'");
eq(C.tagMeasure({ measureType: "bill", title: "To reorganize the executive branch" }).tags.includes("rural_ag"), false, "'ranch' does not fire inside 'branch'");
eq(C.tagMeasure({ measureType: "bill", title: "To amend the law on arms control and nonproliferation" }).tags.includes("pro_life"), false, "'life' does not fire inside 'nonproliferation'");
eq(C.tagMeasure({ measureType: "bill", title: "A bill relating to State and local government operations" }).tags.includes("repro_balance"), false, "'state' alone does not tag abortion policy");
eq(C.tagMeasure({ measureType: "bill", title: "To prohibit content moderation by a patent office" }).tags.includes("homeless"), false, "'tent' does not fire inside 'content' / 'patent'");
eq(C.tagMeasure({ measureType: "bill", title: "Stablecoin act", summary: "This act establishes a framework, with exceptions, as appropriate." }).tags.filter((k) => k === "repro_balance" || k === "power_of_purse"), [], "generic drafting words do not tag repro_balance / power_of_purse");
ok(C.tagMeasure({ measureType: "bill", title: "Ban late-term abortion act" }).tags.some((k) => k === "pro_life" || k === "repro_balance"), "a real abortion bill is still tagged");

section("amendments inherit the parent bill");
const parentRow = { billKey: "us-119-hr-9", measureType: "bill", title: "Secure the Border Act", shortTitle: null, summary: "This bill funds border wall construction and hires Border Patrol agents.", policyArea: null, officialSubjects: ["Border security and unlawful immigration"], parentBillKey: null };
const bareAmdt = { billKey: "us-119-hamdt-1", measureType: "amendment", title: "To improve the bill.", shortTitle: null, summary: "", policyArea: null, officialSubjects: [], parentBillKey: "us-119-hr-9" };
const inh = C.tagBillRow(bareAmdt, parentRow);
ok(inh.tags.includes("border_security") && inh.detail.every((d) => d.signals.every((x) => x === "parent:us-119-hr-9")), `an amendment with no topic of its own carries its parent's tags (${inh.tags.join(",")})`);
ok(!inh.untagged, "an inheriting amendment is not untagged");
const ownAmdt = { ...bareAmdt, title: "To require photo identification to vote in federal elections." };
const own = C.tagBillRow(ownAmdt, parentRow);
ok(own.tags.length && own.detail.every((d) => !d.signals.some((x) => x.startsWith("parent:"))), `an amendment that names its own topic keeps only its own tags (${own.tags.join(",")})`);
eq(C.tagBillRow({ ...bareAmdt, measureType: "bill" }, parentRow).tags, [], "a non-amendment never inherits");

section("effect lines");
const effLines = C.effectLinesFor({ measureType: "bill", title: "X", summary: "Secure the Border Act This bill funds border wall construction. It also renames a post office in Ohio and makes many other changes that run on far past the one hundred and forty character limit of a line." }, ["border_security"]);
eq(effLines, { border_security: "This bill funds border wall construction." }, "the summary sentence naming the topic is the line; the act's name prefix is dropped");
eq(C.effectLinesFor({ measureType: "amendment", title: "To require photo identification to vote in federal elections" }, ["voter_id"]).voter_id, "To require photo identification to vote in federal elections.", "an amendment's purpose is its line");
eq(C.effectLinesFor({ measureType: "bill", summary: "This bill does a thing to forests." }, ["border_security"]), {}, "no sentence names the topic: no line");
const scaled = C.tagMeasure({ measureType: "bill", title: "To amend the Internal Revenue Code", summary: "Among other provisions, the bill makes a technical change affecting small business filers in all states." });
const sd = scaled.detail.find((d) => d.key === "econ_smallbiz");
ok(sd && sd.impactTier === "high" && sd.tierReasons.some((r) => r.startsWith("scale-language:")), `buried match + scale language is high tier (${JSON.stringify(sd)})`);
const dollars = C.tagMeasure({ measureType: "bill", title: "To amend the Internal Revenue Code", summary: "Provides $250 million for a small business loan program." });
ok(dollars.detail.find((d) => d.key === "econ_smallbiz")?.tierReasons.some((r) => r.startsWith("dollar-amount:")), "≥ $10 million figure is a scale signal");
eq(C.largestDollarAmount("$5,000,000 and $1.2 billion"), 1.2e9, "dollar parsing");
eq(C.scaleSignal("$9 million"), null, "under $10 million is not scale");
eq(C.scaleSignal("reports every 2 years"), null, "'every' in an interval phrase is not scale");
ok(C.scaleSignal("available nationwide"), "nationwide is scale");
eq(["Department of Defense Appropriations Act, 2027", "National Defense Authorization Act for Fiscal Year 2027", "Providing for reconciliation pursuant to title II", "Coast Guard Authorization Act of 2025", "Major Richard Star Act"].map(C.majorBillKind), ["appropriations", "ndaa", "reconciliation", "major_authorization", null], "major bill kinds");
ok([po, inc, buried, scaled, dollars].every((r) => r.detail.every((d) => d.signals.every((x) => /^(pattern|keyword|vocab|subject):/.test(x)))), "tier cases: every tag still comes from the bill's own text");
// Only the bill's own text: curated keys and policy area are not signals.
const nocur = C.tagMeasure({ measureType: "bill", title: "To designate a post office", curatedKeys: ["gov_transparency"], policyArea: "Immigration" });
eq(nocur.tags, [], "curated keys / policy area do not create tags");
ok(big.detail.every((d) => d.signals.every((s) => /^(pattern|keyword|vocab|subject):/.test(s))), "signals are text-derived only");
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
    async billsNeedingMeta() { return []; },
    async billsWithStaleTags(v) { return [...bills.values()].filter((b) => b.taggerVersion !== v); },
  };
}

const repo = memRepo();
const memberMap = { A000055: "robert_aderholt", A000148: "jake_auchincloss" };
const lines = [];
let { report, state } = await C.runVoteActions({ fetch: fakeFetch, repo, memberMap, apiKey: "k", now: () => NOW, log: (l) => lines.push(l), maxRolls: 20 });
eq(report.candidates, { house: 5, senate: 2 }, "discovery reads the whole sitting Congress (the 2025 roll and the June senate vote are found too)");
eq([report.done, report.unsupported, report.incomplete], [3, 1, 3], "3 done, Speaker vote unsupported, empty roll + two rolls with no detail retried");
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

// ── raw payloads (Blobs "raw-ingest-votes") ─────────────────────────────────
section("raw payloads");
function memStore({ failWrites = false } = {}) {
  const m = new Map();
  return {
    m, writes: 0,
    async setJSON(k, v) { this.writes++; if (failWrites) throw new Error("blobs unavailable"); m.set(k, JSON.parse(JSON.stringify(v))); },
    async get(k) { return m.has(k) ? JSON.parse(JSON.stringify(m.get(k))) : null; },
    async list({ prefix }) { return { blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
  };
}
eq(C.RAW_VOTES_STORE_NAME, "raw-ingest-votes", "sibling store, not a prefix in the stance raw store");
const rs = memStore(), rr = memRepo();
const rawLines = [];
const rRun = await C.runVoteActions({ fetch: fakeFetch, repo: rr, memberMap, apiKey: "secret-key", now: () => NOW, log: (l) => rawLines.push(l), maxRolls: 20, rawStore: rs });
eq([rRun.report.done, rRun.report.unsupported, rRun.report.incomplete], [3, 1, 3], "same outcome with a raw store attached");
const rawKeys = [...rs.m.keys()].sort();
const tsPart = NOW.toISOString().replace(/[:.]/g, "-");
ok(rawKeys.includes(`house/119/2/roll-00300/${tsPart}.json`), "House roll payload stored under house/<c>/<s>/roll-<n>/<ts>.json");
ok(rawKeys.includes(`senate/119/2/roll-00500/${tsPart}.json`), "Senate roll payload stored");
ok(rawKeys.includes(`bills/us-119-hr-5000/${tsPart}.json`) && rawKeys.includes(`bills/us-119-hamdt-90/${tsPart}.json`), "bill metadata payloads stored");
ok(rawKeys.includes(`house/119/2/roll-00302/${tsPart}.json`) && rawKeys.includes(`house/119/2/roll-00303/${tsPart}.json`), "unsupported / empty roll payloads are kept too (stored before parsing)");
const h300 = rs.m.get(`house/119/2/roll-00300/${tsPart}.json`);
eq(h300.body, JSON.stringify(members(roll300, { voteQuestion: "On Passage", sourceDataURL: "https://clerk.house.gov/evs/2026/roll300.xml" })), "House body stored exactly as served");
eq([h300.kind, h300.http_status, h300.roll, h300.fetched_at], ["house_vote", 200, 300, NOW.toISOString()], "envelope: kind, status, roll, fetch time");
ok(h300.list_row && Number(h300.list_row.rollCallNumber) === 300, "House envelope keeps its vote-list row");
eq(rs.m.get(`senate/119/2/roll-00500/${tsPart}.json`).body, senateVote, "Senate XML stored exactly as served");
const b5000 = rs.m.get(`bills/us-119-hr-5000/${tsPart}.json`);
eq(b5000.responses.map((r) => r.part), ["bill", "subjects", "summaries"], "bill envelope keeps every response in order");
ok(!JSON.stringify([...rs.m.values()]).includes("secret-key"), "no API key in any stored payload or URL");
const rv = [...rr.votes.values()];
ok(rv.length > 0 && rv.every((r) => r.rawRef && rs.m.has(r.rawRef)), "every vote row records the payload key it came from");
eq(rr.bills.get("us-119-hr-5000")?.rawRef, `bills/us-119-hr-5000/${tsPart}.json`, "bill row records its metadata payload key");
ok(rr.bills.get("us-119-pn-12-3")?.rawRef, "nomination bill row records its payload key");

// Re-parse: identical rows, no network.
const pick = (rows) => JSON.stringify([...rows].map(({ revisedAt, ...r }) => r).sort((a, b) => `${a.rollNumber}|${a.memberId}`.localeCompare(`${b.rollNumber}|${b.memberId}`)));
const doneRefs = [...new Set(rv.map((r) => r.rawRef))];
let fetchDuringReplay = 0;
const realFetch = globalThis.fetch; globalThis.fetch = async () => { fetchDuringReplay++; throw new Error("network used in replay"); };
let identical = true, billsIdentical = true;
for (const ref of doneRefs) {
  const r = await C.replayRoll(rs, ref, { memberMap, lis: rRun.state.lis?.map || {} });
  if (!r.ok) { identical = false; continue; }
  if (pick(r.rows) !== pick(rv.filter((x) => x.rawRef === ref))) identical = false;
  if (JSON.stringify(r.bill) !== JSON.stringify(rr.bills.get(r.bill.billKey))) billsIdentical = false;
}
ok(doneRefs.length === 3 && identical, "re-parsing each stored roll payload rebuilds identical vote rows");
ok(billsIdentical, "re-parsing rebuilds identical bill rows");
const rep1 = await C.replayRawRolls({ store: rs, repo: rr, memberMap, lis: rRun.state.lis?.map || {}, write: true, log: () => {} });
const rep2 = await C.replayRawRolls({ store: rs, repo: rr, memberMap, lis: rRun.state.lis?.map || {}, write: true, log: () => {} });
globalThis.fetch = realFetch;
eq(fetchDuringReplay, 0, "replay never touches the network");
eq([rep1.rolls, rep1.rebuilt, rep1.skipped.length, rep1.inserted, rep1.revised, rep1.errors.length], [5, 3, 2, 0, 0, 0], "write replay over stored payloads: 3 rebuilt, unsupported + empty skipped, nothing new or revised");
eq([rep2.inserted, rep2.revised], [0, 0], "repeat replay is a no-op");
eq(pick([...rr.votes.values()]), pick(rv), "vote table unchanged after replay");
ok(rep1.skipped.some((s) => s.reason === "unsupported vote words") && rep1.skipped.some((s) => s.reason === "no member positions"), "skips name their reason");
const dry = await C.replayRawRolls({ store: rs, repo: null, memberMap, lis: {}, log: () => {} });
eq([dry.rebuilt, dry.inserted], [3, 0], "dry run rebuilds but writes nothing");
const gone = await C.replayRoll(rs, "house/119/2/roll-09999/x.json", { memberMap, lis: {} });
eq([gone.ok, gone.reason], [false, "payload not found"], "missing payload is a clear skip");
// A bill row whose payload was never stored is used as-is, not overwritten with a fallback title.
const keep = await C.replayRoll(rs, doneRefs.find((r) => r.includes("roll-00300")), { memberMap, lis: {} }, { storedBill: { ...rr.bills.get("us-119-hr-5000"), rawRef: null, title: "Curated title" } });
eq([keep.ok && keep.billRebuilt, keep.ok && keep.bill.title], [false, "Curated title"], "stored bill without a payload is kept as-is");

// Store write failure: logged, run completes, rows written with raw_ref NULL.
const fs = memStore({ failWrites: true }), fr = memRepo(), failLines = [];
const fRun = await C.runVoteActions({ fetch: fakeFetch, repo: fr, memberMap, apiKey: "k", now: () => NOW, log: (l) => failLines.push(l), maxRolls: 20, rawStore: fs });
eq([fRun.report.done, fRun.report.unsupported, fRun.report.incomplete, fRun.report.errors.length], [3, 1, 3, 0], "run completes unchanged when every store write fails");
ok(fs.writes > 0 && fs.m.size === 0, "writes were attempted and failed");
ok(failLines.some((l) => l.includes("RAW STORE WRITE FAILED")), "store failure is logged");
eq(pick([...fr.votes.values()].map((r) => ({ ...r, rawRef: "x" }))), pick(rv.map((r) => ({ ...r, rawRef: "x" }))), "same vote rows as with a working store");
ok([...fr.votes.values()].every((r) => r.rawRef === null) && [...fr.bills.values()].every((b) => b.rawRef === null), "raw_ref is NULL when nothing was stored");
// No store at all (e.g. getStore unavailable) behaves like before.
const nr = memRepo();
const nRun = await C.runVoteActions({ fetch: fakeFetch, repo: nr, memberMap, apiKey: "k", now: () => NOW, log: () => {}, maxRolls: 20 });
eq(nRun.report.done, 3, "no raw store → rows still written");

// Regression: healthcare's `cedes` is a { test } predicate, not a RegExp. The
// tagger used to read `.flags.replace` on it and throw "Cannot read properties
// of undefined (reading 'replace')" on the first healthcare bill, ending the run.
let hcHits = null, hcErr = null;
try { hcHits = C.patternHits("A bill to expand Medicaid coverage and lower premiums under the Affordable Care Act"); } catch (e) { hcErr = e; }
ok(!hcErr, `healthcare bill text does not throw (${hcErr?.message})`);
ok(hcHits?.includes("healthcare"), "healthcare bill is tagged healthcare");
ok(!C.patternHits("Expand Medicaid coverage to pay for abortion services").includes("healthcare"), "healthcare cede predicate still applies");
let tmErr = null;
try { C.tagMeasure({ measureType: "bill", title: "Medicaid coverage act", summary: "Expands health insurance coverage under the ACA.", subjects: [] }); } catch (e) { tmErr = e; }
ok(!tmErr, "tagMeasure on a healthcare bill does not throw");
ok((() => { try { C.patternHits(""); C.patternHits(undefined); return true; } catch { return false; } })(), "empty / missing bill text does not throw");

// One roll call failing while being processed is retried then parked — the run
// finishes the other roll calls instead of stopping at the first error.
const rf = memRepo();
const realUpsert = rf.upsertBill;
rf.upsertBill = async (b) => { if (b.billKey === "us-119-hr-5000") throw new TypeError("Cannot read properties of undefined (reading 'replace')"); return realUpsert(b); };
let rfState = null, rfReport = null;
({ report: rfReport, state: rfState } = await C.runVoteActions({ fetch: fakeFetch, repo: rf, memberMap, apiKey: "k", now: () => NOW, log: () => {}, maxRolls: 20 }));
eq(rfState.ledger["house|119|2|300"]?.status, "incomplete", "failing roll call is left for retry, not done");
ok(/processing error: .*replace/.test(rfState.ledger["house|119|2|300"]?.note || ""), "ledger note names the processing error");
ok(rfReport.errors.some((e) => e.startsWith("house|119|2|300: ")), "error is reported against its roll call");
ok(rfState.ledger["house|119|2|301"]?.status === "done" && rfState.ledger["senate|119|2|500"]?.status === "done", "later roll calls in the same run still complete");
ok(![...rf.votes.values()].some((r) => r.rollNumber === 300), "no partial vote rows for the failing roll call");
for (let i = 0; i < C.MAX_ATTEMPTS; i++) ({ state: rfState } = await C.runVoteActions({ fetch: fakeFetch, repo: rf, memberMap, apiKey: "k", state: rfState, now: () => NOW, log: () => {} }));
eq(rfState.ledger["house|119|2|300"]?.status, "parked", "an always-failing roll call is parked after MAX_ATTEMPTS");

// ── 6. isolation ─────────────────────────────────────────────────────────────
section("isolation");
const core = read("netlify/lib/vote-actions-core.ts");
ok(!/from ["'][^"']*db\/(index|schema)/.test(core) && !/@netlify\/blobs/.test(core), "core touches no database or Blobs itself");
const dbRepo = read("netlify/lib/vote-actions-db.ts");
ok(!/\bvr[A-Z]\w*|vr_/.test(dbRepo.replace(/^\/\/.*$/gm, "")), "repo neither reads nor writes a vr_* table");
const cron = read("netlify/functions/vote-actions-cron.mts");
const importsOf = (src) => [...src.matchAll(/^import[^;]*from\s+["']([^"']+)["']/gm)].map((m) => m[1]);
ok(!importsOf(cron).some((p) => /raw-ingest|stance-score|evidence-locker|stated-positions/.test(p)), "cron imports nothing from the stance generator");
ok(!importsOf(core).some((p) => /raw-ingest|stance-score|evidence-locker|stated-positions-core/.test(p)), "core imports nothing from the stance pipeline (vocab + keys only)");
ok(!/vote-actions/.test(read("netlify/functions/raw-ingest-cron.mts")), "stance generator does not call the action layer");
const readers = readdirSync(join(ROOT, "netlify/functions")).filter((f) => !f.startsWith("vote-actions"))
  .filter((f) => /pdx_vote_actions|pdx_action_bills|pdxVoteActions|pdxActionBills|vote-actions/.test(read(`netlify/functions/${f}`)));
// Phase 4 joined the two roll-call paths: pdx_vote_actions is the source of truth
// for member positions and the vr ingest READS it (overlay + reconcile), through
// netlify/lib/vr-vote-source-db.ts only. Those two functions are the only other
// readers, and nothing outside vote-actions writes the action tables.
// Phase 5 added three PUBLIC readers, each only through the publish gate
// (vote-actions-publish.ts with the read-only publishDeps): the roll-call page,
// the person-file coverage read (attendance) and the "what changed" feed.
// The provisions generator (bill-provisions.mts) reads bill TEXT only — the
// title / CRS summary of bills that already have a public generated page —
// through the bridge (loadActionBillTexts), never a vote row, and writes only
// its own Blobs store.
eq(readers, ["bill-provisions.mts", "changes-feed.mts", "person-coverage.mts", "vote-page.mts", "vr-ingest-cron.mts", "vr-ingest.mts"], "only the vr ingest, the provisions generator's bill-text read and the Phase 5 publish-gated reads read the action tables");
for (const f of ["changes-feed.mts", "person-coverage.mts", "vote-page.mts"]) {
  const src = read(`netlify/functions/${f}`);
  ok(/vote-actions-publish/.test(src) && !/pdxVoteActions|pdxActionBills|pdx_vote_actions/.test(src), `${f} reads the action tables only through the publish gate`);
}
for (const f of readers) ok(!/pdxVoteActions|pdxActionBills/.test(read(`netlify/functions/${f}`)), `${f} reaches the action tables only through vr-vote-source-db`);
const bridge = read("netlify/lib/vr-vote-source-db.ts").replace(/^\/\/.*$/gm, "");
ok(!/\.(insert|update|delete)\(\s*pdx(VoteActions|ActionBills)/.test(bridge) && !/(INSERT INTO|UPDATE|DELETE FROM)\s+pdx_/i.test(bridge), "the bridge never writes the action tables");
const edge = readdirSync(join(ROOT, "netlify/edge-functions")).filter((f) => /vote-actions|pdx_vote_actions/.test(read(`netlify/edge-functions/${f}`)));
eq(edge, [], "no edge function reads the action tables");
ok(/path: "\/api\/admin\/vote-actions"/.test(read("netlify/functions/vote-actions-status.mts")) && /requireAdmin/.test(read("netlify/functions/vote-actions-status.mts")), "status endpoint is curator-only");
// THE PUBLISH GATE IS THE ONLY PUBLIC DOOR. Every vote-actions function is the
// cron, a curator endpoint, or one of the two public reads — the person read and
// the bill read — and each reaches the tables only through the gate
// (vote-actions-publish.ts: publishedForPolitician / publishedForBill), which
// drops every row on a roll call that fails a rule (behaviour:
// test-vote-actions-publish.mjs and test-vote-actions-recorded-votes.mjs).
const vaFns = readdirSync(join(ROOT, "netlify/functions")).filter((f) => f.startsWith("vote-actions"));
const publicFns = vaFns.filter((f) => { const s = read(`netlify/functions/${f}`); return !/schedule:\s*"/.test(s) && !/requireAdmin\(req\)/.test(s); });
eq(publicFns.sort(), ["vote-actions-bill.mts", "vote-actions-published.mts"], "the only public vote-actions functions are the two publish-gated reads");
const pubFn = read("netlify/functions/vote-actions-published.mts");
eq(importsOf(pubFn).sort(), ["../lib/vote-actions-db.js", "../lib/vote-actions-publish.js", "@netlify/functions"].sort(), "public read imports only the gate and its data deps");
ok(/publishedForPolitician\(pid, publishDeps\)/.test(pubFn) && !/voteActionsForPolitician|curatorLinksForPolitician|billPublishStats|rawRef|db\.select|sql`/.test(pubFn), "public read goes through publishedForPolitician only");
const billFn = read("netlify/functions/vote-actions-bill.mts");
eq(importsOf(billFn).sort(), ["../lib/vote-actions-db.js", "../lib/vote-actions-publish.js", "@netlify/functions"].sort(), "public bill read imports only the gate and its data deps");
ok(/publishedForBill\(key, publishDeps\)/.test(billFn) && !/voteActionsForBill|curatorLinksForPolitician|billPublishStats|rawRef|db\.select|sql`/.test(billFn), "public bill read goes through publishedForBill only");
const gate = read("netlify/lib/vote-actions-publish.ts");
const pubBody = gate.slice(gate.indexOf("export async function publishedForPolitician"), gate.indexOf("export async function publishedForBill"));
ok(/if \(!g \|\| !g\.rollPublic\(r\)\) continue;/.test(pubBody) && !/rawRef|memberId|politicianId/.test(pubBody), "public rows are gated per roll call and carry no raw key or member id");
const billBody = gate.slice(gate.indexOf("export async function publishedForBill"), gate.indexOf("export async function curatorLinksForPolitician"));
ok(/if \(!g\.rollPublic\(r\)\) continue;/.test(billBody) && !/rawRef|memberId|bioguide/i.test(billBody), "public bill rows are gated per roll call and carry no raw key or member id");

rmSync(dir, { recursive: true, force: true });
if (failures.length) {
  console.log(`\n✗ ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.log("  ✗ " + f);
  process.exit(1);
}
console.log(`\n✓ vote-actions: ${passed} checks passed`);
