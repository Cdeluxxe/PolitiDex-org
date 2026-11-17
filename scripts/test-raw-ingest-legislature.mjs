#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-raw-ingest-legislature.mjs — step 3 of the raw-ingest URL resolver:
// official state legislature member pages from the legislature's own member
// directory (netlify/lib/raw-ingest-resolve.mjs resolveLegislature,
// db/raw-ingest-legislature-directory-2026-11.json).
//
//   · A page-less state legislator receives an official legislature URL on a
//     clean match (state + chamber + surname + compatible first name, one
//     member) and is then planned.
//   · Ambiguous, wrong-chamber, non-matching, contested, portrait-conflict,
//     retired and already-attached cases stay without a page.
//   · Federal Congress.gov resolutions and every previously resolved row are
//     unchanged; rows that had pages are untouched.
//   · Scoring and Evidence Locker code do not reference the new resolver.
//
//   node scripts/test-raw-ingest-legislature.mjs
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const corePath = path.join(root, "netlify/lib/raw-ingest-core.mjs");
const R = await import("../netlify/lib/raw-ingest-resolve.mjs");
// Steps 1–3 only: step 4 (own sites / direct sources) has its own suite,
// test-raw-ingest-direct-sources.mjs, which checks steps 1–3 are unchanged by it.
process.env.PDX_RAW_INGEST_NO_DIRECT_SOURCES = "1";
const core = await import(pathToFileURL(corePath).href);
process.env.PDX_RAW_INGEST_NO_LEGISLATURE_DIRECTORY = "1";
const before = await import(pathToFileURL(corePath).href + "?no-legislature-directory");
delete process.env.PDX_RAW_INGEST_NO_LEGISLATURE_DIRECTORY;
const { SEAT_HOLDERS } = await import("../netlify/lib/seat-holders.mjs");
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
const DIR = read("db/raw-ingest-legislature-directory-2026-11.json");

let passed = 0, failures = 0;
async function t(name, f) {
  try { await f(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failures++; console.log(`  ✗ ${name}\n     ${e?.message || e}`); }
}
const pagesOf = (r) => [...(r.sources || []), ...(r.official ? [r.official] : [])];
const rowOf = (ros, pid) => ros.find((r) => r.politician_id === pid);
const plain = (x) => JSON.parse(JSON.stringify(x));

// ── Fixture: a small legislature directory + site roster ──
const legislature = {
  states: {
    UT: {
      member_page: { house: "https://house.utleg.gov/rep/{id}/", senate: "https://senate.utah.gov/sen/{id}/" },
      portrait_ids: { pic_conflict: "OTHERID" },
      members: [
        { id: "CLEANAB", name: "Rep. Clean, Alexandra B.", chamber: "house" },
        { id: "SENATSM", name: "Sen. Senator, Sam", chamber: "senate" },
        { id: "TWINJOE", name: "Rep. Twin, Joe", chamber: "house" },
        { id: "TWINJOS", name: "Rep. Twin, Joseph", chamber: "house" },
        { id: "CHAMBWR", name: "Sen. Chamber, Wren", chamber: "senate" },
        { id: "PICTUCO", name: "Rep. Picture, Cole", chamber: "house" },
        { id: "TAKENTA", name: "Rep. Taken, Tara", chamber: "house" },
        { id: "PAIRQU", name: "Rep. Pair, Quinn", chamber: "house" },
        { id: "GONEGG", name: "Rep. Gone, Gail", chamber: "house" },
      ],
    },
  },
};
const P = (n, o, s = "UT District 9") => ({ n, o, s, p: "R" });
const people = {
  clean_rep: P("Alex Clean", "Utah State Representative"),
  clean_sen: P("Sam Senator", "UT State Senator"),
  twin: P("Joe Twin", "Utah State Representative"),
  wrong_chamber: P("Wren Chamber", "Utah State Representative"),
  no_match: P("Nobody Listed", "Utah State Representative"),
  candidate: P("Alex Clean", "Utah State House Candidate (District 9)"),
  pic_conflict: P("Cole Picture", "Utah State Representative"),
  taken: P("Tara Taken", "Utah State Representative"),
  pair_a: P("Quinn Pair", "Utah State Representative"),
  pair_b: P("Quinn Pair", "Utah State Representative"),
  retired_one: P("Gail Gone", "Utah State Representative"),
  other_state: P("Ohio Person", "Ohio State Senator", "Ohio"),
  mayor: P("Alex Clean", "Mayor, Layton"),
  has_pages: P("Hal Pages", "Utah State Representative"),
  tier_two: P("Alex Clean", "Utah State Representative"),
};
const fixture = () => [
  { politician_id: "tier_two", tier: 2, sources: [] },
  { politician_id: "has_pages", tier: 3, sources: [{ politician_id: "has_pages", topic: "cost_living", source_type: "official state legislature member page", url: "https://house.utleg.gov/rep/PAGESHA/" }] },
  { politician_id: "holder", tier: 3, sources: [{ politician_id: "holder", topic: "cost_living", source_type: "official state legislature member page", url: "https://house.utleg.gov/rep/TAKENTA/" }] },
  ...Object.keys(people).filter((p) => !["has_pages", "tier_two"].includes(p)).map((pid) => ({ politician_id: pid, tier: 3, full_roster: true, sources: [] })),
];
const resolveFixture = (extra = {}) => {
  const roster = fixture();
  const rep = R.resolveRoster(roster, { people, members: [], cited: {}, retired: ["https://house.utleg.gov/rep/GONEGG/"], legislature, ...extra });
  return { roster, rep, why: new Map(rep.unresolved.map((u) => [u.politician_id, u.why])) };
};

await t("a page-less state legislator receives an official legislature URL on a clean match and is then planned", () => {
  const { roster, rep } = resolveFixture();
  const rep1 = rowOf(roster, "clean_rep");
  assert.deepEqual(rep1.sources.map((s) => s.url), ["https://house.utleg.gov/rep/CLEANAB/"], "Alex ↔ Alexandra, House pattern");
  const s = rep1.sources[0];
  assert.equal(s.source_class, "state_legislature");
  assert.equal(s.resolved_by, "legislature_directory");
  assert.equal(s.member_id, "CLEANAB");
  assert.match(s.source_id, /^official-/);
  assert.equal(s.politician_id, "clean_rep");
  assert.deepEqual(rowOf(roster, "clean_sen").sources.map((x) => x.url), ["https://senate.utah.gov/sen/SENATSM/"], "Senate pattern for a senator");
  assert.ok(rep.resolved.some((x) => x.politician_id === "clean_rep" && x.via === "legislature_directory" && x.chamber === "house"));
  const plan = core.planRun({}, { roster, counts: {}, max: 36 });
  for (const pid of ["clean_rep", "clean_sen"]) assert.ok(plan.politicians.includes(pid), `${pid} is planned`);
  assert.ok(plan.sources.some((x) => x.url === s.url), "its member page is on the pull list");
  // Real roster: Utah Sen. Chris Wilson (seat ut-statesenate-2) had no pages and now has his Senate member page.
  assert.equal(SEAT_HOLDERS["ut-statesenate-2"]?.pid, "cwilson");
  assert.equal(pagesOf(rowOf(before.ROSTER, "cwilson")).length, 0, "no page before step 3");
  const w = rowOf(core.ROSTER, "cwilson");
  assert.deepEqual(w.sources.map((x) => x.url), ["https://senate.utah.gov/sen/WILSOCH/"]);
  assert.equal(w.tier, 3);
  assert.ok(core.planRun({}, { roster: [w], counts: {} }).sources.some((x) => x.url === w.sources[0].url), "planned like any other page");
  for (const pid of ["dowens_st", "stewart_e_barlow"]) assert.ok(rowOf(core.ROSTER, pid).sources.some((x) => x.resolved_by === "legislature_directory"), `${pid} resolved`);
});

await t("ambiguous, wrong-chamber, non-matching and other unclean cases stay without a page", () => {
  const { roster, why } = resolveFixture();
  const cases = {
    twin: /2 UT house members match/,
    wrong_chamber: /listed in the UT senate, not the house/,
    no_match: /no UT house member named Nobody Listed/,
    // Not sitting legislators: never tried against the directory.
    candidate: /^(?!.*legislature directory).*$/,
    mayor: /^(?!.*legislature directory).*$/,
    pic_conflict: /official portrait .* names member OTHERID/,
    taken: /already on holder's row/,
    pair_a: /matches more than one roster row/,
    pair_b: /matches more than one roster row/,
    retired_one: /was retired/,
    other_state: /no OH legislature directory/,
  };
  for (const [pid, re] of Object.entries(cases)) {
    assert.deepEqual(rowOf(roster, pid).sources, [], `${pid} keeps no pages`);
    assert.match(why.get(pid) || "", re, `${pid}: ${why.get(pid)}`);
  }
  const plan = core.planRun({}, { roster, counts: {}, max: 36 });
  for (const pid of Object.keys(cases)) assert.ok(!plan.politicians.includes(pid), `${pid} is still skipped`);
  // Real roster: James Dunnigan's site portrait names a different legislature ID, so he is not resolved.
  assert.deepEqual(rowOf(core.ROSTER, "james_dunnigan").sources, []);
  assert.match(core.RESOLUTION.unresolved.find((u) => u.politician_id === "james_dunnigan").why, /portrait/);
  // Real roster: a Utah state House candidate stays page-less.
  const cand = core.ROSTER.find((r) => r.full_roster && /^Utah State House Candidate/.test(read("db/share-index.json").people[r.politician_id]?.o || ""));
  assert.ok(cand && !cand.sources.some((s) => s.resolved_by === "legislature_directory"), `${cand?.politician_id} not resolved by the directory`);
  // Unit rules.
  assert.equal(R.legislativeChamber("UT State Senator"), "senate");
  assert.equal(R.legislativeChamber("Utah State Representative"), "house");
  assert.equal(R.legislativeChamber("State Senate Majority Leader"), "senate");
  assert.equal(R.legislativeChamber("Former UT State Representative"), null);
  assert.equal(R.legislativeChamber("U.S. Representative"), null);
  assert.match(R.resolveLegislature(R.identityOf("c", people.candidate), { directory: legislature }).why, /no sitting state legislative office/);
  assert.equal(R.directoryName("Rep. Albrecht, Carl R."), "Carl R. Albrecht");
  assert.equal(R.legislatureMemberUrl({ id: "../x", chamber: "house" }, legislature.states.UT), null, "IDs are plain tokens");
});

await t("federal Congress.gov resolutions and all previously resolved rows are unchanged", () => {
  assert.equal(before.LEGISLATURE_DIRECTORY_APPLIED, false);
  assert.equal(core.ROSTER.length, before.ROSTER.length);
  const prev = before.RESOLUTION, now = core.RESOLUTION;
  const key = (x) => `${x.politician_id} ${x.via} ${x.url}`;
  assert.deepEqual(now.resolved.filter((x) => x.via !== "legislature_directory").map(key), prev.resolved.map(key), "steps 1 and 2 resolve exactly what they did");
  assert.ok(now.resolved.filter((x) => x.via === "congress_gov").length > 200);
  const added = new Set(now.resolved.filter((x) => x.via === "legislature_directory").map((x) => x.politician_id));
  assert.ok(added.size >= 1);
  for (const [i, b] of before.ROSTER.entries()) {
    const r = core.ROSTER[i];
    assert.equal(r.politician_id, b.politician_id, "roster order unchanged");
    if (!added.has(b.politician_id)) { assert.deepEqual(plain(r), plain(b), `${b.politician_id}: row unchanged`); continue; }
    assert.equal(pagesOf(b).length, 0, `${b.politician_id} had no pages`);
    assert.equal(b.tier, 3);
    assert.ok(r.sources.length === 1 && r.sources[0].resolved_by === "legislature_directory");
  }
  // Fixture: a tier-2 row and a row with pages are never touched.
  const { roster } = resolveFixture();
  assert.deepEqual(rowOf(roster, "tier_two").sources, []);
  assert.deepEqual(rowOf(roster, "has_pages").sources.map((s) => s.url), ["https://house.utleg.gov/rep/PAGESHA/"]);
  // Without a directory, step 3 does nothing.
  const bare = fixture();
  R.resolveRoster(bare, { people, members: [], cited: {}, retired: [] });
  assert.ok(bare.every((r) => !r.sources.some((s) => s.resolved_by === "legislature_directory")));
  assert.match(R.resolutionLine(now), /\d+ state legislature member page\(s\)/);
});

await t("scoring and Evidence Locker code do not reference the new resolver; caps unchanged", () => {
  for (const f of ["netlify/lib/stance-score-core.mjs", "netlify/lib/evidence-locker-core.mjs", "netlify/lib/stated-positions-core.mjs", "netlify/lib/locker-read.mjs", "netlify/lib/stance-check.mjs"]) {
    const src = fs.readFileSync(path.join(root, f), "utf8");
    assert.doesNotMatch(src, /raw-ingest-resolve|resolveLegislature|legislature_directory|legislature-directory|LEGISLATURE_DIRECTORY|resolved_by/, `${f} does not reference the resolver`);
  }
  for (const k of ["MAX_SOURCES_PER_RUN", "MAX_POLITICIANS_PER_RUN", "MAX_SOURCES_PER_POLITICIAN", "BASELINE_STRONG", "BASELINE_WEAK", "POOL_VERSION"]) assert.equal(core[k], before[k], `${k} unchanged`);
  const src = fs.readFileSync(path.join(root, "netlify/lib/raw-ingest-resolve.mjs"), "utf8").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(src, /\bfetch\s*\(/, "the resolver fetches nothing");
});

await t("the directory is current, scoped to board states, and its page patterns are confirmed by cited pages", () => {
  execFileSync(process.execPath, [path.join(root, "scripts/build-raw-ingest-legislature-directory-2026-11.mjs"), "--check"], { stdio: "pipe" });
  const boards = new Set(Object.keys(SEAT_HOLDERS).filter((k) => /-state(?:house|senate)-/.test(k)).map((k) => k.split("-")[0].toUpperCase()));
  const site = ["politician-stances.js", "politician-stances-core.js", "politician-stances-ext.js", "spotlight-cards-data.js", "acct-spotlight-data.js", "cmp-data.js", "netlify/lib/raw-ingest-source-types.mjs",
    ...fs.readdirSync(root).filter((f) => /^state-senate-stances(?:-w\d+)?\.js$/.test(f))]
    .map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("\n");
  // A confirmed page names a member of that chamber by ID: as a whole path
  // segment, or as the host label where each member has their own host
  // (California Senate: sd11.senate.ca.gov).
  const segs = (u) => [new URL(u).hostname.split(".")[0], ...new URL(u).pathname.split("/").filter(Boolean)];
  for (const [st, d] of Object.entries(DIR.states)) {
    assert.ok(boards.has(st), `${st} has legislative district boards`);
    for (const [ch, tpl] of Object.entries(d.member_page)) {
      assert.ok(d.confirmed_by[ch]?.length, `${st} ${ch}: pattern confirmed by cited pages`);
      assert.ok(tpl === "{url}" || tpl.includes("{id}"), `${st} ${ch}: an {id} pattern or the listing's own address`);
      for (const u of d.confirmed_by[ch]) {
        assert.ok(site.includes(u), `${u} is cited on the site`);
        assert.ok(d.members.some((m) => m.chamber === ch && segs(u).includes(m.id)), `${u} names a ${ch} member`);
      }
    }
  }
  for (const st of boards) assert.ok(DIR.states[st] || DIR.skipped[st], `${st} is either covered or listed as skipped`);
  // Every page resolved by step 3 is on a confirmed pattern and names a directory member of the right chamber.
  for (const x of core.RESOLUTION.resolved.filter((y) => y.via === "legislature_directory")) {
    const d = DIR.states[x.state];
    const m = d.members.find((y) => y.id === x.member_id && y.chamber === x.chamber);
    assert.ok(m, `${x.politician_id}: ${x.member_id} is a ${x.chamber} member`);
    assert.equal(x.url, R.legislatureMemberUrl(m, d));
  }
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log(`✓ raw-ingest legislature directory: ${passed} passed, 0 failed`);
