#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-raw-ingest-resolve.mjs — active official-URL resolution for the
// raw-ingest rotation (netlify/lib/raw-ingest-resolve.mjs).
//
//   · A tier-3 federal legislator with no pages receives a Congress.gov member
//     URL on a clean name + state + chamber match, and is then planned.
//   · A politician with a clean official URL from another trusted source (a
//     page already cited for them that is clearly their own) receives it and
//     is planned.
//   · A politician with no clean match stays without a page (and unplanned).
//   · Tier-1 / tier-2 rows, and every row that already had pages, are
//     unchanged.
//   · Scoring and Evidence Locker code do not depend on the resolver; caps and
//     thresholds are unchanged.
//
//   node scripts/test-raw-ingest-resolve.mjs
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const corePath = path.join(root, "netlify/lib/raw-ingest-core.mjs");
const R = await import("../netlify/lib/raw-ingest-resolve.mjs");
const core = await import(pathToFileURL(corePath).href);
process.env.PDX_RAW_INGEST_NO_RESOLVE = "1";
const base = await import(pathToFileURL(corePath).href + "?no-resolve");
delete process.env.PDX_RAW_INGEST_NO_RESOLVE;
const { RETIRED_SOURCES } = await import("../netlify/lib/raw-ingest-retired.mjs");
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
const SHARE = read("db/share-index.json");
const MEMBERS = read("db/vr-member-map.json").members;
const CITED = read("db/raw-ingest-official-cited-2026-11.json");

let passed = 0, failures = 0;
async function t(name, f) {
  try { await f(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failures++; console.log(`  ✗ ${name}\n     ${e?.message || e}`); }
}
const pagesOf = (r) => [...(r.sources || []), ...(r.official ? [r.official] : [])];
const rowOf = (ros, pid) => ros.find((r) => r.politician_id === pid);
const planned = (roster, pid) => {
  // Walk one full cycle from a fresh state; true when `pid` is planned.
  let state = {};
  for (let i = 0; i < roster.length + 2; i++) {
    const p = core.planRun(state, { roster, counts: {} });
    if (p.politicians.includes(pid)) return p;
    if (!p.politicians.length) return null;
    state = p.state;
    if (p.cycle > 0) return null;
  }
  return null;
};

// ── Fixture: a small site roster + Congress member roster ──
const people = {
  pat_example: { n: "Pat Example", o: "U.S. Representative", s: "Ohio · OH-09", p: "D" },
  sam_sample: { n: "Samuel Sample", o: "U.S. Senator", s: "Iowa", p: "R" },
  jo_twin: { n: "Joe Twin", o: "U.S. Representative", s: "Texas · TX-02", p: "R" },
  lee_candidate: { n: "Lee Candidate", o: "U.S. House Candidate (OH-3)", s: "Ohio", p: "D" },
  dana_legis: { n: "Dana Legis", o: "Utah State Representative", s: "UT District 9", p: "R" },
  gov_person: { n: "Morgan Steward", o: "Governor", s: "Colorado", p: "D" },
  news_only: { n: "Riley Newsman", o: "Ohio State Senator", s: "Ohio", p: "R" },
  shared_one: { n: "Casey Shared", o: "Governor", s: "Kansas", p: "D" },
  taken_slug: { n: "Taylor Taken", o: "U.S. Representative", s: "Utah · UT-01", p: "R" },
  has_pages: { n: "Hal Pages", o: "U.S. Representative", s: "Ohio · OH-01", p: "R" },
  tier_two: { n: "Terry Two", o: "U.S. Representative", s: "Ohio · OH-02", p: "R" },
};
const members = [
  { bioguide: "E000001", slug: "pat_example", name: "Patricia A. Example", chamber: "house", state: "OH" },
  { bioguide: "S000002", slug: "sam_sample", name: "Sam Sample Jr.", chamber: "senate", state: "IA" },
  { bioguide: "T000003", slug: "jo_twin", name: "Joe Twin", chamber: "house", state: "TX" },
  { bioguide: "T000004", slug: "jo_twin_2", name: "Joseph Twin", chamber: "house", state: "TX" },
  { bioguide: "C000005", slug: "lee_candidate", name: "Lee Candidate", chamber: "house", state: "OH" },
  { bioguide: "T000006", slug: "someone_else", name: "Taylor Taken", chamber: "house", state: "UT" },
  { bioguide: "P000007", slug: "has_pages", name: "Hal Pages", chamber: "house", state: "OH" },
  { bioguide: "T000008", slug: "tier_two", name: "Terry Two", chamber: "house", state: "OH" },
];
const cited = {
  shared_hosts: ["governor.kansas.gov"],
  shared_urls: [],
  congress_member_urls: { S000002: "https://www.congress.gov/member/sam-sample/S000002" },
  politicians: {
    dana_legis: [{ url: "https://house.utleg.gov/rep/LEGISD/", keys: ["public_schools"] }, { url: "https://www.ksl.com/article/1/dana-legis", keys: ["cost_living"] }],
    gov_person: [{ url: "https://governor.colorado.gov/priorities", keys: [] }],
    news_only: [{ url: "https://www.dispatch.com/story/news/politics/riley-newsman", keys: ["cost_living"] }, { url: "https://ballotpedia.org/Riley_Newsman", keys: [] }],
    shared_one: [{ url: "https://governor.kansas.gov/newsroom/", keys: [] }],
  },
};
const page = (pid, url) => ({ politician_id: pid, topic: "cost_living", source_type: "official House issue page", url });
const fixture = () => [
  { politician_id: "tier_two", tier: 2, sources: [] },
  { politician_id: "has_pages", tier: 3, sources: [page("has_pages", "https://pages.house.gov/issues/economy")] },
  { politician_id: "someone_else", tier: 3, sources: [page("someone_else", "https://else.house.gov/issues")] },
  ...["pat_example", "sam_sample", "jo_twin", "lee_candidate", "dana_legis", "gov_person", "news_only", "shared_one", "taken_slug"]
    .map((pid) => ({ politician_id: pid, tier: 3, full_roster: true, sources: [] })),
];
const resolveFixture = () => {
  const roster = fixture();
  const rep = R.resolveRoster(roster, { people, members, cited, retired: [] });
  return { roster, rep };
};

await t("a tier-3 federal legislator with no pages receives a Congress.gov URL on a clean match, and is then planned", () => {
  const { roster, rep } = resolveFixture();
  const pat = rowOf(roster, "pat_example");
  assert.equal(pat.sources.length, 1);
  const s = pat.sources[0];
  assert.equal(s.url, "https://www.congress.gov/member/patricia-example/E000001", "name tokens + bioguide (middle initial dropped)");
  assert.equal(s.source_class, "congress_gov");
  assert.equal(s.source_tier, 2);
  assert.equal(s.resolved_by, "congress_gov");
  assert.equal(s.politician_id, "pat_example");
  // A cited Congress.gov URL for the bioguide is used verbatim; a suffix and a nickname still match cleanly.
  assert.equal(rowOf(roster, "sam_sample").sources[0].url, "https://www.congress.gov/member/sam-sample/S000002");
  assert.ok(rep.resolved.some((x) => x.politician_id === "pat_example" && x.via === "congress_gov"));
  const p = core.planRun({}, { roster, counts: {}, max: 36 });
  assert.ok(p.politicians.includes("pat_example"), "planned once it has a page");
  assert.ok(p.sources.some((x) => x.url === s.url), "its Congress.gov page is on the pull list");
  // Real roster: sitting U.S. Representative Aaron Bean (full-roster, tier 3) is resolved from the Congress member roster.
  const bean = rowOf(core.ROSTER, "aaron_bean");
  assert.equal(bean.tier, 3);
  const m = MEMBERS.find((x) => x.slug === "aaron_bean");
  assert.deepEqual(bean.sources.map((x) => x.url), [`https://www.congress.gov/member/aaron-bean/${m.bioguide}`]);
  assert.equal(rowOf(base.ROSTER, "aaron_bean").sources.length, 0, "no page without the resolver");
  const real = planned(core.ROSTER, "aaron_bean");
  assert.ok(real, "aaron_bean is reached by the real rotation within one cycle");
  assert.ok(real.sources.some((x) => x.politician_id === "aaron_bean" && x.source_class === "congress_gov"));
  assert.ok(core.RESOLUTION.resolved.filter((x) => x.via === "congress_gov").length > 200, `most sitting federal tier-3 rows resolve (${core.RESOLUTION.resolved.length})`);
});

await t("a politician with a clean official URL from another trusted source receives it, and is planned", () => {
  const { roster } = resolveFixture();
  const dana = rowOf(roster, "dana_legis");
  assert.deepEqual(dana.sources.map((s) => s.url), ["https://house.utleg.gov/rep/LEGISD/"], "the legislature page is kept, the news story is not");
  assert.equal(dana.sources[0].source_class, "state_legislature");
  assert.equal(dana.sources[0].topic, "public_schools", "files under the issue key the site cites it for");
  assert.equal(dana.sources[0].resolved_by, "cited_official");
  const gov = rowOf(roster, "gov_person");
  assert.deepEqual(gov.sources.map((s) => s.url), ["https://governor.colorado.gov/priorities"]);
  assert.equal(gov.sources[0].source_class, "statewide_official");
  assert.equal(gov.sources[0].topic, "cost_living");
  assert.match(gov.sources[0].source_id, /^official-/, "an uncited-topic page is retargeted like other official pages");
  const p = core.planRun({}, { roster, counts: {}, max: 36 });
  for (const pid of ["dana_legis", "gov_person"]) assert.ok(p.politicians.includes(pid), `${pid} is planned`);
  // Recognition rules on their own.
  const id = (pid) => R.identityOf(pid, people[pid]);
  assert.ok(R.recognizeOfficial("https://example.house.gov/issues", id("pat_example")), "own House office host");
  assert.equal(R.recognizeOfficial("https://clerk.house.gov/Votes/2026224", id("pat_example")), null, "clerk host is not theirs");
  assert.equal(R.recognizeOfficial("https://other.house.gov/issues", id("pat_example")), null, "a colleague's host is not theirs");
  assert.ok(R.recognizeOfficial("https://www.morganstewardforcolorado.com/issues", id("gov_person")), "campaign host carrying the surname");
  assert.equal(R.recognizeOfficial("https://www.votecolorado.com/issues", id("gov_person")), null, "a campaign word alone is not enough");
  assert.equal(R.recognizeOfficial("https://ltgov.colorado.gov/news", id("gov_person")), null, "another statewide office's host is not theirs");
  assert.equal(R.recognizeOfficial("https://house.utleg.gov/", id("dana_legis")), null, "a legislature home page names nobody");
});

await t("a politician with no clean match stays without a page", () => {
  const { roster, rep } = resolveFixture();
  const why = new Map(rep.unresolved.map((u) => [u.politician_id, u.why]));
  for (const pid of ["jo_twin", "lee_candidate", "news_only", "shared_one", "taken_slug"]) {
    assert.deepEqual(rowOf(roster, pid).sources, [], `${pid} keeps no pages`);
    assert.ok(why.has(pid), `${pid} is reported unresolved`);
  }
  assert.match(why.get("jo_twin"), /2 house members/, "two members match the name: ambiguous");
  assert.match(why.get("lee_candidate"), /no sitting federal office/, "a candidate is not matched to a member page");
  assert.match(why.get("taken_slug"), /belongs to roster row someone_else/, "a bioguide held by another roster row");
  assert.match(why.get("shared_one"), /shared/, "a host cited for more than one politician");
  const p = core.planRun({}, { roster, counts: {}, max: 36 });
  for (const pid of ["jo_twin", "lee_candidate", "news_only", "shared_one", "taken_slug"]) assert.ok(!p.politicians.includes(pid), `${pid} is still skipped`);
  // A retired Congress.gov page never comes back, under any name slug.
  const roster2 = fixture();
  R.resolveRoster(roster2, { people, members, cited, retired: ["https://www.congress.gov/member/pat-example/E000001"] });
  assert.deepEqual(rowOf(roster2, "pat_example").sources, []);
  // Two page-less rows matching one bioguide (whose roster slug is neither): neither resolves.
  const quinn = { n: "Quinn Pair", o: "U.S. Representative", s: "Ohio · OH-04", p: "D" };
  const roster3 = [{ politician_id: "quinn_a", tier: 3, sources: [] }, { politician_id: "quinn_b", tier: 3, sources: [] }];
  const rep3 = R.resolveRoster(roster3, { people: { quinn_a: quinn, quinn_b: quinn }, members: [{ bioguide: "Q000009", slug: "quinn_pair", name: "Quinn Pair", chamber: "house", state: "OH" }], cited: {}, retired: [] });
  assert.deepEqual(roster3.map((r) => r.sources.length), [0, 0]);
  assert.ok(rep3.unresolved.every((u) => /more than one roster row/.test(u.why)));
  // When the member roster names one of them, only that one resolves.
  const roster4 = fixture();
  R.resolveRoster(roster4, { people: { ...people, pat_example_dup: people.pat_example }, members, cited, retired: [] });
  assert.equal(rowOf(roster4, "pat_example").sources.length, 1);
  // Real roster: no retired URL is (re)attached, and a page-less tier-3 candidate stays page-less.
  const retired = new Set(RETIRED_SOURCES.map((s) => R.normUrl(s.url)));
  for (const r of core.ROSTER) for (const s of pagesOf(r)) assert.ok(!retired.has(R.normUrl(s.url)), `${s.url} is retired`);
  const cand = core.ROSTER.find((r) => r.full_roster && /Candidate/.test(SHARE.people[r.politician_id]?.o || "") && !CITED.politicians[r.politician_id]);
  assert.ok(cand && pagesOf(cand).length === 0, `${cand?.politician_id} (a candidate) has no page`);
});

await t("existing tier-1 and tier-2 rows and their pages are unchanged; rows that had pages are untouched", () => {
  const { roster } = resolveFixture();
  assert.deepEqual(rowOf(roster, "tier_two").sources, [], "a page-less tier-2 row is not resolved");
  assert.deepEqual(rowOf(roster, "has_pages").sources.map((s) => s.url), ["https://pages.house.gov/issues/economy"], "a tier-3 row with pages is untouched");
  assert.equal(base.URL_RESOLUTION_APPLIED, false);
  assert.equal(core.URL_RESOLUTION_APPLIED, true);
  assert.equal(core.ROSTER.length, base.ROSTER.length, "no row added or removed");
  const byId = new Map(core.ROSTER.map((r) => [r.politician_id, r]));
  let changed = 0;
  for (const [i, b] of base.ROSTER.entries()) {
    const r = byId.get(b.politician_id);
    assert.equal(core.ROSTER[i].politician_id, b.politician_id, "roster order unchanged");
    assert.equal(r.tier, b.tier, `${b.politician_id}: tier unchanged`);
    if (b.tier !== 3 || pagesOf(b).length) {
      assert.deepEqual(JSON.parse(JSON.stringify(r)), JSON.parse(JSON.stringify(b)), `${b.politician_id}: row unchanged`);
      continue;
    }
    // A page-less tier-3 row gains only resolved pages.
    if (r.sources.length) changed++;
    assert.ok(r.sources.every((s) => s.resolved_by), `${b.politician_id}: only resolved pages added`);
    assert.equal(r.official, b.official);
  }
  assert.equal(changed, core.RESOLUTION.resolved.length);
  // The planner's order for rows that had pages before is unchanged.
  const had = new Set(base.ROSTER.filter((r) => pagesOf(r).length).map((r) => r.politician_id));
  const order = (c) => c.priorityOrder(c.ROSTER, {}).filter((x) => x.open.length || x.filled.length).map((x) => x.r.politician_id);
  assert.deepEqual(order(core).filter((p) => had.has(p)), order(base), "planned order for configured rows unchanged");
  // Tier 1, then tier 2, then tier 3; the first run of a cycle is still tier 1.
  const first = core.planRun({}, { counts: {} });
  assert.ok(first.politicians.every((p) => byId.get(p).tier === 1));
});

await t("scoring and Evidence Locker code do not depend on the new resolver; caps and thresholds unchanged", () => {
  for (const f of ["netlify/lib/stance-score-core.mjs", "netlify/lib/evidence-locker-core.mjs", "netlify/lib/stated-positions-core.mjs", "netlify/lib/locker-read.mjs", "netlify/lib/stance-check.mjs"]) {
    const src = fs.readFileSync(path.join(root, f), "utf8");
    assert.doesNotMatch(src, /raw-ingest-resolve|resolved_by|RESOLUTION|resolveRoster/, `${f} does not read the resolver`);
  }
  for (const k of ["MAX_SOURCES_PER_RUN", "MAX_POLITICIANS_PER_RUN", "MAX_SOURCES_PER_POLITICIAN", "BASELINE_STRONG", "BASELINE_WEAK", "SEVERAL_STANCES", "DEPRIORITISED_EVERY_CYCLES", "POOL_VERSION"]) {
    assert.equal(core[k], base[k], `${k} unchanged`);
  }
  // The resolver fetches nothing.
  const src = fs.readFileSync(path.join(root, "netlify/lib/raw-ingest-resolve.mjs"), "utf8");
  assert.doesNotMatch(src.replace(/\/\/.*$/gm, ""), /\bfetch\s*\(/, "no network call in the resolver");
  assert.match(R.resolutionLine(core.RESOLUTION), /^raw-ingest: url resolution — \d+ tier-3 row\(s\) without pages checked · \d+ resolved/);
});

await t("the committed cited-pages index is current", async () => {
  const { execFileSync } = await import("node:child_process");
  execFileSync(process.execPath, [path.join(root, "scripts/build-raw-ingest-official-cited-2026-11.mjs"), "--check"], { stdio: "pipe" });
  for (const [pid, list] of Object.entries(CITED.politicians)) {
    const id = R.identityOf(pid, SHARE.people[pid]);
    for (const e of list) assert.ok(R.recognizeOfficial(e.url, id), `${pid}: ${e.url} is recognised as their own`);
  }
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log(`✓ raw-ingest url resolution: ${passed} passed, 0 failed`);
