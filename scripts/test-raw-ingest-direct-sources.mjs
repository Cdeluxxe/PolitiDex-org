#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-raw-ingest-direct-sources.mjs — step 4 of the raw-ingest URL resolver:
// the politician's own sites and directly tied sources
// (netlify/lib/raw-ingest-resolve.mjs recognizeDirect / resolveDirect, inputs
// in db/raw-ingest-direct-cited-2026-11.json).
//
//   · A page-less politician with a cited campaign site, caucus page, YouTube
//     video or interview receives that URL and is planned.
//   · Ambiguous names, shared domains, wrong offices, multi-person pieces and
//     non-matching pages stay without a page.
//   · Every previously resolved row (Congress.gov, legislature directories,
//     already-cited official pages) and every other roster row is unchanged.
//   · Scoring and Evidence Locker code do not reference the new step.
//
//   node scripts/test-raw-ingest-direct-sources.mjs
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const coreUrl = pathToFileURL(path.join(root, "netlify/lib/raw-ingest-core.mjs")).href;
const R = await import("../netlify/lib/raw-ingest-resolve.mjs");
// Baseline: the same roster build without step 4 (a separate module instance).
process.env.PDX_RAW_INGEST_NO_DIRECT_SOURCES = "1";
const before = await import(`${coreUrl}?without-direct-sources`);
delete process.env.PDX_RAW_INGEST_NO_DIRECT_SOURCES;
const core = await import(coreUrl);
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
const DIRECT = read("db/raw-ingest-direct-cited-2026-11.json");

let passed = 0, failures = 0;
async function t(name, f) {
  try { await f(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failures++; console.log(`  ✗ ${name}\n     ${e?.message || e}`); }
}
const pagesOf = (r) => [...(r.sources || []), ...(r.official ? [r.official] : [])];
const rowOf = (ros, pid) => ros.find((r) => r.politician_id === pid);
const plain = (x) => JSON.parse(JSON.stringify(x));
const added = core.RESOLUTION.resolved.filter((x) => x.via === "direct_source");
const SITE = ["politician-stances.js", "politician-stances-core.js", "politician-stances-ext.js", "spotlight-cards-data.js", "acct-spotlight-data.js",
  ...fs.readdirSync(root).filter((f) => /^state-senate-stances(?:-w\d+)?\.js$/.test(f))].map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("\n");

await t("the inputs are current and every page is already cited on the site", () => {
  execFileSync(process.execPath, [path.join(root, "scripts/build-raw-ingest-direct-cited-2026-11.mjs"), "--check"], { stdio: "pipe" });
  assert.ok(DIRECT.summary.pages > 0);
  for (const [pid, list] of Object.entries(DIRECT.politicians)) for (const e of list) assert.ok(SITE.includes(e.url), `${pid}: ${e.url} is cited verbatim on the site`);
  // Every attached page is one of those cited pages (a YouTube watch address is
  // the cited video's own ID), for that politician.
  for (const x of added) for (const u of x.urls) {
    const cited = (DIRECT.politicians[x.politician_id] || []).map((e) => e.url);
    const vid = /[?&]v=([A-Za-z0-9_-]{11})/.exec(u)?.[1];
    assert.ok(cited.includes(u) || (vid && cited.some((c) => c.includes(vid))), `${x.politician_id}: ${u} is cited for them`);
  }
});

await t("a politician with a cited campaign site, caucus page, YouTube video or interview receives it and is planned", () => {
  assert.ok(added.length >= 10, `${added.length} rows resolved by step 4`);
  for (const [pid, url, cls] of [
    ["gary_dye", "https://garydye2020.wordpress.com/2020/10/07/us-senate-statements/", "own_site"],
    // The roster prints her nickname in quotes ("Barcy"), which the host carries.
    ["catherine_whitson", "https://senatorbarcy.org/about", "own_site"],
    ["jamie_pedersen", "https://senatedemocrats.wa.gov/pedersen/", "caucus_member"],
    ["kyle_austin", "https://www.mtpr.org/montana-news/2026-05-06/q-a-kyle-austin-libertarian-u-s-senate-candidate", "direct_statement"],
  ]) {
    assert.equal(pagesOf(rowOf(before.ROSTER, pid)).length, 0, `${pid} had no page`);
    const r = rowOf(core.ROSTER, pid);
    assert.deepEqual(r.sources.map((s) => s.url), [url], pid);
    assert.equal(r.sources[0].resolved_by, "direct_source");
    assert.equal(r.sources[0].source_class, cls);
    assert.ok([1, 2].includes(r.sources[0].source_tier));
    const plan = core.planRun({}, { roster: [r], counts: {} });
    assert.ok(plan.politicians.includes(pid) && plan.sources.some((s) => s.url === url), `${pid} is planned`);
  }
  // YouTube: a video from their own channel, and their own /channel/UC… page,
  // are attached and planned. (No page-less row in the live roster has one
  // cited, so a fixture stands in.)
  const people = { yt: { n: "Nova Tuber", o: "U.S. Senate Candidate", s: "Utah" }, ch: { n: "Cy Caster", o: "U.S. House Candidate (UT-1)", s: "Utah" } };
  const roster = [{ politician_id: "yt", tier: 3, sources: [] }, { politician_id: "ch", tier: 3, sources: [] }];
  R.resolveRoster(roster, { people, members: [], cited: {}, retired: [], direct: { politicians: {
    yt: [{ url: "https://youtu.be/AbCdEfGhIjK", label: "YouTube — \"Why I'm running,\" Tuber's official campaign channel (2026)", keys: [] }],
    ch: [{ url: "https://www.youtube.com/channel/UC0123456789abcdefghijkl", label: "Cy Caster's official YouTube channel", keys: [] }] } } });
  assert.deepEqual(roster[0].sources.map((x) => [x.url, x.source_class, x.source_tier]), [["https://www.youtube.com/watch?v=AbCdEfGhIjK", "youtube_video", 2]]);
  assert.deepEqual(roster[1].sources.map((x) => [x.url, x.source_class, x.channel_id]), [["https://www.youtube.com/feeds/videos.xml?channel_id=UC0123456789abcdefghijkl", "youtube", "UC0123456789abcdefghijkl"]]);
  const vplan = core.planRun({}, { roster: [roster[0]], counts: {} });
  assert.ok(vplan.politicians.includes("yt") && vplan.sources.some((x) => x.source_class === "youtube_video"), "own-channel video planned");

  // Every step-4 page is planned for its row.
  for (const x of added) {
    const r = rowOf(core.ROSTER, x.politician_id);
    assert.ok(r.sources.length >= 1 && r.sources.length <= R.MAX_RESOLVED_PAGES);
    assert.ok(r.sources.every((s) => s.resolved_by === "direct_source" && Object.keys(R.DIRECT_CLASSES).includes(s.source_class)));
    assert.ok(core.planRun({}, { roster: [r], counts: {} }).politicians.includes(x.politician_id), `${x.politician_id} planned`);
  }
});

await t("ambiguous names, shared domains, wrong offices, multi-person and non-matching pages stay without a page", () => {
  const P = (n, o, s = "Ohio") => ({ n, o, s });
  const people = {
    clean: P("Dana Quill", "U.S. House Candidate (OH-3)"),
    twin_a: P("Pat Twin", "U.S. Senate Candidate"), twin_b: P("Patrick Twin", "Ohio State Senator"),
    shared_a: P("Robin Shared", "U.S. Senate Candidate"), shared_b: P("Lee Other", "U.S. Senate Candidate"),
    platform: P("Casey Platform", "U.S. Senate Candidate"),
    nomatch: P("Ron Nomatch", "U.S. Senate Candidate"),
    office: P("Sam Office", "Ohio State Senator"),
    race: P("Jo Racer", "U.S. House Candidate (OH-4)"), rival: P("Al Rivalson", "U.S. House Candidate (OH-4)"),
    caucus: P("Kim Caucus", "U.S. House Candidate (OH-5)"),
    handle: P("Vic Handle", "U.S. Senate Candidate"),
    channel: P("Una Channel", "U.S. Senate Candidate"),
    taken: P("Tess Taken", "U.S. Senate Candidate"), holder: P("Hal Holder", "U.S. Senate Candidate"),
    old: P("Ola Retired", "U.S. Senate Candidate"),
  };
  const ent = (url, label = "") => ({ url, label, keys: [] });
  const direct = {
    shared_hosts: ["sharedforsenate.com"], shared_urls: [],
    politicians: {
      clean: [ent("https://quillforcongress.com/issues", "Quill for Congress (campaign site)")],
      twin_a: [ent("https://twinforsenate.com/", "Twin for Senate")],
      shared_a: [ent("https://sharedforsenate.com/", "campaign site")],
      platform: [ent("https://candidates.goodparty.org/platform4senate", "Platform for Senate (campaign page)")],
      nomatch: [ent("https://running4ok.com/", "Running 4 OK (campaign site)")],
      office: [ent("https://officeforcongress.com/", "Office for Congress")],
      race: [ent("https://www.example-news.com/2026/al-rivalson-faces-jo-racer/", "candidate questionnaire"),
        ent("https://www.example-news.com/2026/racer-rivalson-guide/", "candidate questionnaire")],
      caucus: [ent("https://ohsenategop.com/senators/caucus/", "Ohio Senate Republicans")],
      handle: [ent("https://www.youtube.com/@vichandle", "Handle's official channel")],
      channel: [ent("https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv", "Una Channel's official campaign channel")],
      taken: [ent("https://takenforsenate.com/", "Taken for Senate")],
      old: [ent("https://retiredforsenate.com/", "Retired for Senate")],
    },
  };
  const roster = Object.keys(people).filter((p) => !["twin_b", "rival", "shared_b"].includes(p)).map((pid) => ({ politician_id: pid, tier: 3, sources: [] }));
  // Another row already carries Taken's host.
  roster.push({ politician_id: "holder", tier: 1, sources: [{ url: "https://takenforsenate.com/about" }] });
  const rep = R.resolveRoster(roster, { people, members: [], cited: {}, retired: ["https://retiredforsenate.com/"], direct });
  const got = (pid) => rowOf(roster, pid).sources.map((s) => s.url);
  const why = new Map(rep.unresolved.map((u) => [u.politician_id, u.why]));
  assert.deepEqual(got("clean"), ["https://quillforcongress.com/issues"]);
  assert.equal(rowOf(roster, "clean").sources[0].direct_kind, "campaign_site");
  // A /channel/UC… address cited as their own channel → its feed, channel ID from the cited URL.
  assert.deepEqual(got("channel"), ["https://www.youtube.com/feeds/videos.xml?channel_id=UCabcdefghijklmnopqrstuv"]);
  assert.equal(rowOf(roster, "channel").sources[0].channel_id, "UCabcdefghijklmnopqrstuv");
  for (const pid of ["twin_a", "shared_a", "platform", "nomatch", "office", "race", "caucus", "handle", "taken", "old"]) assert.deepEqual(got(pid), [], `${pid} stays page-less`);
  assert.match(why.get("twin_a"), /twin_b shares the name Pat Twin/);
  assert.match(why.get("shared_a"), /sharedforsenate\.com is shared with another politician/);
  assert.match(why.get("taken"), /takenforsenate\.com is shared with another politician/);
  assert.match(why.get("old"), /retired/);
  assert.match(why.get("race"), /rivalson", another politician's surname/);
  // Recognizer-level refusals carry no attachment at all.
  const id = (pid) => R.identityOf(pid, people[pid]);
  assert.equal(R.recognizeDirect(direct.politicians.platform[0], id("platform")), null, "a host serving many candidates is never an own site");
  assert.equal(R.recognizeDirect(direct.politicians.nomatch[0], id("nomatch")), null, "a host without their name");
  assert.equal(R.recognizeDirect(direct.politicians.office[0], id("office")), null, "a congress site for a state senator");
  assert.equal(R.recognizeDirect(direct.politicians.caucus[0], id("caucus")), null, "a caucus page for someone who is not a state legislator");
  assert.equal(R.recognizeDirect(direct.politicians.handle[0], id("handle")), null, "an @handle would need a lookup");
  // An address that names another politician on the site is refused by the clean-match check.
  const raceRes = R.resolveDirect(id("race"), direct.politicians.race, { surnames: new Set(["rivalson", "racer"]) });
  assert.deepEqual(raceRes.pages, []);
  assert.equal(R.recognizeDirect(direct.politicians.race[0], id("race")), null, "a \"faces\" race piece is refused outright");
  assert.equal(raceRes.why.length, 1);
  assert.match(raceRes.why[0], /rivalson/);
  assert.equal(R.recognizeDirect(ent("https://www.youtube.com/watch?v=abcdefghijk", "Town Hall with Jo Racer (interview)"), id("race")), null, "a town hall is not an interview with them alone");
  assert.equal(R.recognizeDirect(ent("https://en.wikipedia.org/wiki/Dana_Quill", "interview"), id("clean")), null, "reference hosts never");

  // An interview on someone else's YouTube channel is not their channel.
  assert.equal(R.recognizeDirect({ url: "https://www.youtube.com/watch?v=6d3eBgKaOUs", label: "YouTube — \"Full interview: Christina Bohannan makes her case for Iowa's 1st District,\" WQAD News 8 (2022)" },
    R.identityOf("christina_bohannan", { n: "Christina Bohannan", o: "U.S. House Candidate (IA-1)", s: "Iowa" })), null);

  // Real roster: cited pages that are not clean matches stay without a page.
  for (const [pid, re] of [
    ["christopher_campbell", null], // candidates.goodparty.org — a platform host
    ["christina_bohannan", null], // a news channel's interview
    ["ron_meinhardt", null], ["ramon_mora", null], ["andrew_gerena", null], ["whitfield_harrington", null], ["brandon_daugherty", null], // host lacks their name
    ["chris_backemeyer", null], // the host is not theirs; only the path names them
    ["jeffrey_ostler", /hollist/], ["marisa_simonetti", /flanagan/], // multi-candidate voter-guide pieces
  ]) {
    const r = rowOf(core.ROSTER, pid);
    if (!r) continue;
    assert.ok(!r.sources.some((s) => s.resolved_by === "direct_source"), `${pid} not resolved by step 4`);
    if (re) assert.match(core.RESOLUTION.unresolved.find((u) => u.politician_id === pid).why, re);
  }
});

await t("every previously resolved row is unchanged", () => {
  const key = (x) => `${x.politician_id} ${x.via} ${x.url}`;
  assert.deepEqual(core.RESOLUTION.resolved.filter((x) => x.via !== "direct_source").map(key), before.RESOLUTION.resolved.map(key),
    "Congress.gov, cited official and legislature-directory resolutions identical");
  for (const v of ["congress_gov", "legislature_directory"]) assert.ok(before.RESOLUTION.resolved.some((x) => x.via === v), `${v} present`);
  const ids = new Set(added.map((x) => x.politician_id));
  assert.equal(core.ROSTER.length, before.ROSTER.length);
  for (const [i, b] of before.ROSTER.entries()) {
    const r = core.ROSTER[i];
    assert.equal(r.politician_id, b.politician_id);
    if (!ids.has(b.politician_id)) { assert.deepEqual(plain(r), plain(b), `${b.politician_id} unchanged`); continue; }
    assert.equal(pagesOf(b).length, 0, `${b.politician_id} had no pages`);
    assert.equal(r.tier, b.tier);
  }
  for (const k of ["MAX_SOURCES_PER_RUN", "MAX_POLITICIANS_PER_RUN", "MAX_SOURCES_PER_POLITICIAN", "BASELINE_STRONG", "BASELINE_WEAK", "POOL_VERSION"]) assert.equal(core[k], before[k]);
  assert.ok(core.planRun({}, { counts: {} }).politicians.every((p) => rowOf(core.ROSTER, p).tier === 1), "tier order unchanged");
  assert.match(R.resolutionLine(core.RESOLUTION), / \d+ own-site \/ direct source\(s\)\)/);
});

await t("scoring and Evidence Locker code do not reference the new step", () => {
  for (const f of ["netlify/lib/stance-score-core.mjs", "netlify/lib/evidence-locker-core.mjs", "netlify/lib/stated-positions-core.mjs", "netlify/lib/locker-read.mjs", "netlify/lib/stance-check.mjs"]) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, f), "utf8"), /direct-cited|direct_source|resolveDirect|recognizeDirect|DIRECT_CLASSES|raw-ingest-resolve|direct_kind/, f);
  }
  // Nothing at runtime fetches or builds a URL for this step: the core reads a committed file.
  assert.doesNotMatch(fs.readFileSync(path.join(root, "netlify/lib/raw-ingest-resolve.mjs"), "utf8"), /\bfetch\(/);
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log(`✓ raw-ingest own sites and direct sources: ${passed} passed, 0 failed`);
