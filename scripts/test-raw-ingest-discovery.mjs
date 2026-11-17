#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-raw-ingest-discovery.mjs — step 5 of the raw-ingest URL resolver:
// sources DISCOVERED by the offline job (scripts/discover-raw-ingest-sources-2026-11.mjs,
// rules in netlify/lib/raw-ingest-discovery.mjs, results committed to
// db/raw-ingest-discovered-2026-11.json).
//
//   · A page-less politician with a clean own site or YouTube channel receives
//     it and is planned; every attached URL carries its source type and the
//     reasons it was accepted.
//   · Shared platforms, multi-candidate pieces, news outlets, ambiguous names
//     and weak matches stay without a page.
//   · Every previously resolved row (steps 1–4) and every other row is unchanged.
//   · Discovery does not run in the live cron pull: nothing the cron imports
//     searches, discovers or reads the job.
//   · Scoring and Evidence Locker code do not reference the new step.
//
//   node scripts/test-raw-ingest-discovery.mjs
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const coreUrl = pathToFileURL(path.join(root, "netlify/lib/raw-ingest-core.mjs")).href;
const R = await import("../netlify/lib/raw-ingest-resolve.mjs");
const D = await import("../netlify/lib/raw-ingest-discovery.mjs");
process.env.PDX_RAW_INGEST_NO_DISCOVERED = "1";
const before = await import(`${coreUrl}?without-discovered`);
delete process.env.PDX_RAW_INGEST_NO_DISCOVERED;
const core = await import(coreUrl);
const DOC = JSON.parse(fs.readFileSync(path.join(root, "db/raw-ingest-discovered-2026-11.json"), "utf8"));

let passed = 0, failures = 0;
async function t(name, f) {
  try { await f(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failures++; console.log(`  ✗ ${name}\n     ${e?.message || e}`); }
}
const pagesOf = (r) => [...(r.sources || []), ...(r.official ? [r.official] : [])];
const rowOf = (ros, pid) => ros.find((r) => r.politician_id === pid);
const plain = (x) => JSON.parse(JSON.stringify(x));
const added = core.RESOLUTION.resolved.filter((x) => x.via === "discovered");
const FOUND_BY = new Set(["fec", "open_states", "own_site", "search"]);
const P = (n, o, s) => ({ n, o, s });
const html = ({ title = "", h1 = "", body = "", og = "" }) => `<html><head><title>${title}</title>${og ? `<meta property="og:title" content="${og}">` : ""}</head><body><h1>${h1}</h1><p>${body}</p><p>${"Lorem ipsum dolor sit amet. ".repeat(12)}</p></body></html>`;
const ok200 = (url) => ({ url, final_url: url, status: 200, content_type: "text/html; charset=utf-8" });

await t("the committed results are reviewable: each URL has a source type, how it was found and why it was accepted", () => {
  assert.equal(DOC.version, D.DISCOVERY_VERSION);
  assert.ok(Object.keys(DOC.politicians).length > 0, "the job found sources");
  const beforeUnresolved = new Set(before.RESOLUTION.unresolved.map((u) => u.politician_id));
  for (const [pid, rec] of Object.entries(DOC.politicians)) {
    assert.ok(beforeUnresolved.has(pid), `${pid} was page-less after steps 1–4`);
    assert.equal(Number(rowOf(before.ROSTER, pid).tier), 3, `${pid} is tier 3`);
    assert.ok(rec.urls.length >= 1 && rec.urls.length <= D.MAX_DISCOVERED_PER_POLITICIAN, `${pid}: 1–3 URLs`);
    assert.ok(rec.urls.filter((e) => e.source_class === "own_site").length <= 2, `${pid}: at most two own-site pages`);
    assert.ok(new Set(rec.urls.filter((e) => e.source_class === "own_site").map((e) => R.hostOf(e.url))).size <= 1, `${pid}: one own site`);
    const order = rec.urls.map((e) => D.DISCOVERY_ORDER.indexOf(e.source_class));
    assert.deepEqual(order, [...order].sort((a, b) => a - b), `${pid}: own site / channel before interviews`);
    for (const e of rec.urls) {
      assert.ok(R.DISCOVERED_CLASSES.includes(e.source_class), `${e.url}: discovery class`);
      assert.ok(e.source_type && FOUND_BY.has(e.found_by), `${e.url}: source type and how it was found`);
      assert.ok(e.accepted_because.length >= 3, `${e.url}: reasons recorded`);
      assert.equal(e.checked.status, 200, `${e.url}: fetched and checked`);
      if (e.source_class === "youtube") assert.equal(e.url, `https://www.youtube.com/feeds/videos.xml?channel_id=${e.channel_id}`);
      else {
        const id = R.identityOf(pid, core.RESOLVER_PEOPLE[pid]);
        assert.ok(D.classifyCandidate(e.url, id, { listed: ["fec", "open_states"].includes(e.found_by) || e.kind === "issues_page" }).ok, `${e.url} still classifies`);
        assert.ok(e.accepted_because.some((x) => /names .+ in its title|page text names/.test(x)), `${e.url}: names them`);
        assert.ok(e.accepted_because.some((x) => /mentions the office/.test(x)), `${e.url}: matches the office`);
      }
    }
  }
  // URLs are unique across politicians.
  const all = Object.values(DOC.politicians).flatMap((p) => p.urls.map((e) => R.normUrl(e.url)));
  assert.equal(new Set(all).size, all.length, "no URL discovered for two politicians");
});

await t("a page-less politician with a clean own site or YouTube channel receives it and is planned", () => {
  assert.ok(added.length >= 20, `${added.length} rows resolved by step 5`);
  const own = added.find((x) => x.classes.includes("own_site"));
  const yt = added.find((x) => x.classes.includes("youtube"));
  assert.ok(own && yt, "an own site and a channel among the live results");
  for (const x of [own, yt]) {
    const pid = x.politician_id;
    assert.equal(pagesOf(rowOf(before.ROSTER, pid)).length, 0, `${pid} had no page`);
    const r = rowOf(core.ROSTER, pid);
    assert.deepEqual(r.sources.map((s) => s.url), DOC.politicians[pid].urls.map((e) => e.url).slice(0, R.MAX_RESOLVED_PAGES));
    for (const s of r.sources) {
      assert.equal(s.resolved_by, "discovered");
      assert.ok(s.accepted_because.length && s.found_by && s.source_type, "reviewable on the row");
    }
    const plan = core.planRun({}, { roster: [r], counts: {} });
    assert.ok(plan.politicians.includes(pid), `${pid} is planned`);
  }
  // Every step-5 row is planned.
  for (const x of added) assert.ok(core.planRun({}, { roster: [rowOf(core.ROSTER, x.politician_id)], counts: {} }).politicians.includes(x.politician_id), `${x.politician_id} planned`);

  // Deterministic: the engine attaches a clean own site and channel from a discovery record.
  const people = { quill: P("Dana Quill", "U.S. House Candidate (OH-3)", "Ohio") };
  const roster = [{ politician_id: "quill", tier: 3, sources: [] }];
  const e = (url, cls, extra = {}) => ({ url, source_class: cls, source_type: "campaign site (the politician's own)", source_tier: cls === "own_site" ? 1 : 2, kind: "campaign_site", found_by: "fec", accepted_because: ["a", "b", "c"], checked: { status: 200, fetched_on: "2026-11-17" }, ...extra });
  R.resolveRoster(roster, { people, members: [], cited: {}, retired: [], discovered: { run_on: "2026-11-17", politicians: { quill: { urls: [
    e("https://quillforcongress.com/", "own_site"), e("https://www.youtube.com/feeds/videos.xml?channel_id=UC0123456789abcdefghijkl", "youtube", { channel_id: "UC0123456789abcdefghijkl", source_type: "campaign YouTube channel (the politician's own)" })] } } } });
  assert.deepEqual(roster[0].sources.map((s) => [s.url, s.source_class, s.resolved_by]), [["https://quillforcongress.com/", "own_site", "discovered"], ["https://www.youtube.com/feeds/videos.xml?channel_id=UC0123456789abcdefghijkl", "youtube", "discovered"]]);
  assert.ok(core.planRun({}, { roster: [{ ...roster[0], name: "Dana Quill" }], counts: {} }).politicians.includes("quill"));
  // One person's home page and issues page share a host: both attach (uniqueness is by row).
  const r2 = [{ politician_id: "quill", tier: 3, sources: [] }];
  R.resolveRoster(r2, { people, members: [], cited: {}, retired: [], discovered: { politicians: { quill: { urls: [e("https://quillforcongress.com/", "own_site"), e("http://quillforcongress.com/issues", "own_site", { kind: "issues_page" })] } } } });
  assert.deepEqual(r2[0].sources.map((s) => s.url), ["https://quillforcongress.com/", "http://quillforcongress.com/issues"]);
});

await t("shared platforms, news outlets, multi-candidate pieces, ambiguous names and weak matches stay without a page", () => {
  const id = R.identityOf("kyle_x", P("Kyle Austin", "U.S. Senate Candidate", "Montana"));
  const refused = (u, re) => { const c = D.classifyCandidate(u, id); assert.equal(c.ok, false, u); if (re) assert.match(c.why, re, u); };
  refused("https://candidates.goodparty.org/austin4senate", /shared platform/);
  refused("https://lp.org/candidate/kyle-austin-2", /shared platform/);
  refused("https://secure.actblue.com/donate/kyle-austin", /shared platform/);
  refused("https://podcasts.apple.com/us/podcast/kyle-austin-interview/id1", /shared platform/);
  refused("https://www.mtpr.org/montana-news/q-a-kyle-austin", /news outlet/);
  refused("https://www.nytimes.com/2026/kyle-austin-interview", /news outlet/);
  refused("https://projects.montanafreepress.org/election-guide-2026/candidates/kyle-austin", /election guide/);
  refused("https://mtgop.org/candidates/kyle-austin", /party|guide/);
  refused("https://ballotpedia.org/Kyle_Austin", /reference/);
  refused("https://www.facebook.com/kyleaustin", /social/);
  refused("https://leg.mt.gov/legislator/kyle-austin", /government/);
  refused("https://example.org/about", /weak match/); // nothing names them
  refused("https://example.org/people/kyle-austin", /weak match/); // names them, but is not their site or an interview
  refused("https://example.org/podcast/austin-and-smith-debate", /several people|guide/);
  refused("https://shows.acast.com/some-show/episodes/kyle-austin-interview", /shared platform/); // podcast hosts serve many shows
  refused("https://show.transistor.fm/episodes/kyle-austin", /shared platform/);
  refused("https://www.mainelegislature.org/house/MemberProfiles/austin", /government \/ legislature/);
  refused("https://kyleaustinforsenate.com/privacy-policy", /housekeeping/);
  refused("https://kyleaustinforsenate.com/donate", /housekeeping/);
  assert.ok(D.classifyCandidate("https://kyleaustinforsenate.com/", id).ok, "their own campaign host");
  assert.ok(D.classifyCandidate("https://someshow.com/episodes/kyle-austin-interview", id).ok, "an interview on a non-news host");

  // Page checks.
  const own = D.classifyCandidate("https://kyleaustinforsenate.com/", id);
  const v = (h, res = ok200("https://kyleaustinforsenate.com/"), cand = own, ctx = {}) => D.verifyPage(D.pageFacts(h, res.final_url), res, id, cand, ctx);
  assert.ok(v(html({ title: "Kyle Austin for U.S. Senate", body: "Montana deserves better." })).ok, "clean own site");
  assert.match(v(html({ title: "Domain for sale", body: "Montana Senate Kyle Austin" })).why, /parked/);
  assert.match(v(html({ title: "Kyle Austin for Montana", body: "Join us." })).why, /office/);
  assert.match(v(html({ title: "Kyle Austin for U.S. Senate", body: "Join us." })).why, /does not mention Montana/);
  assert.match(v(html({ title: "Welcome", body: "Montana Senate" })).why, /does not name Kyle Austin/);
  assert.match(v(html({ title: "Kyle Austin for Mayor", body: "Montana Senate" })).why, /another office|mayor/i);
  assert.match(v(html({ title: "Kyle Austin" }), { ...ok200("https://kyleaustinforsenate.com/"), status: 404 }).why, /HTTP 404/);
  assert.match(v(html({ title: "Kyle Austin for Senate", body: "Montana" }), { ...ok200("https://kyleaustinforsenate.com/"), final_url: "https://candidates.goodparty.org/x" }).why, /redirects to .*shared platform/);
  const others = [{ pid: "jo_rival", re: D.fullNameRe("Jo Rival") }];
  const iv = D.classifyCandidate("https://someshow.com/episodes/kyle-austin-interview", id);
  assert.match(v(html({ title: "Interview: Kyle Austin and Jo Rival on the Senate race", body: "Montana" }), ok200("https://someshow.com/episodes/kyle-austin-interview"), iv, { others }).why, /another politician \(jo_rival\)/);
  assert.match(v(html({ title: "Montana Senate debate: Kyle Austin interview", body: "Montana" }), ok200("https://someshow.com/episodes/kyle-austin-interview"), iv, { others }).why, /debate|several/);
  // A campaign for another office; a namesake's business; a news article; a publication's piece.
  assert.match(v(html({ title: "Kyle Austin for Attorney General", body: "Montana Senate" })).why, /campaigns for another office/);
  const named = D.classifyCandidate("https://austinrealty.com/", id);
  assert.match(v(html({ title: "Austin Realty — Kyle Austin, broker", body: "Montana homes. Senate Bill 12 changed closing rules." }), ok200("https://austinrealty.com/"), named, { via: "search" }).why, /not about their office or campaign/);
  const pod = D.classifyCandidate("https://someshow.com/episodes/kyle-austin-interview", id);
  const newsHtml = html({ title: "Kyle Austin interview", body: "Montana U.S. Senate" }).replace("</head>", `<script type="application/ld+json">{"@type":"NewsArticle"}</script></head>`);
  assert.match(v(newsHtml, ok200("https://someshow.com/episodes/kyle-austin-interview"), pod).why, /news article/);
  const qa = D.classifyCandidate("https://localpaper.com/2026/q-a-kyle-austin", id);
  assert.match(v(html({ title: "Q&A: Kyle Austin", body: "Montana U.S. Senate" }), ok200("https://localpaper.com/2026/q-a-kyle-austin"), qa).why, /publication's article/);
  assert.ok(v(html({ title: "Podcast episode 12: Kyle Austin interview", body: "Montana U.S. Senate" }), ok200("https://someshow.com/episodes/kyle-austin-interview"), pod).ok, "a podcast episode about them alone");
  // Channels: their own only.
  const ch = (title, desc = "", via = "search") => D.verifyChannel({ ...D.pageFacts(`<title>${title} - YouTube</title><meta property="og:title" content="${title}"><meta property="og:description" content="${desc}"><link rel="canonical" href="https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv">`, "https://www.youtube.com/@x") }, { status: 200 }, id, { via, others });
  assert.ok(ch("Kyle Austin for Senate", "Running for U.S. Senate in Montana").ok);
  assert.match(ch("KTVQ News", "Montana Senate").why, /not named/);
  assert.match(ch("Kyle Austin", "").why, /office or state/, "a search-found channel must show their office or state");
  assert.match(ch("Austin for Montana", "", "search").why, /not named/, "a campaign-name channel needs their own site's link");
  assert.ok(ch("Austin for Montana", "", "own_site").ok);

  // Engine: ambiguous names, URLs claimed twice, hosts on another row, retired.
  const e = (url, cls = "own_site") => ({ url, source_class: cls, source_type: "campaign site (the politician's own)", source_tier: 1, kind: "campaign_site", found_by: "search", accepted_because: ["a", "b", "c"], checked: { status: 200 } });
  const people = {
    twin_a: P("Pat Twin", "U.S. Senate Candidate", "Ohio"), twin_b: P("Patrick Twin", "Ohio State Senator", "Ohio"),
    dup_a: P("Ann Dup", "U.S. Senate Candidate", "Ohio"), dup_b: P("Bea Copy", "U.S. Senate Candidate", "Ohio"),
    taken: P("Tess Taken", "U.S. Senate Candidate", "Ohio"), holder: P("Hal Holder", "U.S. Senate Candidate", "Ohio"),
    old: P("Ola Retired", "U.S. Senate Candidate", "Ohio"), bad: P("Bo Bad", "U.S. Senate Candidate", "Ohio"),
  };
  const roster = ["twin_a", "dup_a", "dup_b", "taken", "old", "bad"].map((pid) => ({ politician_id: pid, tier: 3, sources: [] }));
  roster.push({ politician_id: "holder", tier: 1, sources: [{ url: "https://takenforsenate.com/about" }] });
  const rep = R.resolveRoster(roster, { people, members: [], cited: {}, retired: ["https://retiredforsenate.com/"], discovered: { politicians: {
    twin_a: { urls: [e("https://twinforsenate.com/")] },
    dup_a: { urls: [e("https://sharedcampaign.com/")] }, dup_b: { urls: [e("https://sharedcampaign.com/b")] },
    taken: { urls: [e("https://takenforsenate.com/")] }, old: { urls: [e("https://retiredforsenate.com/")] },
    bad: { urls: [{ ...e("https://badforsenate.com/"), accepted_because: [] }, { ...e("https://badforsenate.com/x"), source_class: "news_article" }] },
  } } });
  const why = new Map(rep.unresolved.map((u) => [u.politician_id, u.why]));
  for (const pid of ["twin_a", "dup_a", "dup_b", "taken", "old", "bad"]) assert.deepEqual(rowOf(roster, pid).sources, [], `${pid} stays page-less`);
  assert.match(why.get("twin_a"), /twin_b shares the name/);
  assert.match(why.get("dup_a"), /discovered for more than one row/);
  assert.match(why.get("taken"), /on another politician's row/);
  assert.match(why.get("old"), /retired/);
  assert.match(why.get("bad"), /not a reviewable discovery entry/);
  // The live job skipped everyone whose name another politician shares.
  assert.ok((DOC.refused["another politician on the site shares this name"] || 0) >= 1);
});

await t("every previously resolved row is unchanged", () => {
  const key = (x) => `${x.politician_id} ${x.via} ${x.url}`;
  assert.deepEqual(core.RESOLUTION.resolved.filter((x) => x.via !== "discovered").map(key), before.RESOLUTION.resolved.map(key),
    "Congress.gov, cited official, legislature directory and step-4 resolutions identical");
  const ids = new Set(added.map((x) => x.politician_id));
  assert.equal(core.ROSTER.length, before.ROSTER.length);
  for (const [i, b] of before.ROSTER.entries()) {
    const r = core.ROSTER[i];
    assert.equal(r.politician_id, b.politician_id);
    if (!ids.has(b.politician_id)) { assert.deepEqual(plain(r), plain(b), `${b.politician_id} unchanged`); continue; }
    assert.equal(pagesOf(b).length, 0, `${b.politician_id} had no pages`);
    assert.equal(r.tier, b.tier);
    assert.ok(r.sources.every((s) => s.resolved_by === "discovered") && r.sources.length <= R.MAX_RESOLVED_PAGES);
  }
  for (const k of ["MAX_SOURCES_PER_RUN", "MAX_POLITICIANS_PER_RUN", "MAX_SOURCES_PER_POLITICIAN", "BASELINE_STRONG", "BASELINE_WEAK", "POOL_VERSION"]) assert.equal(core[k], before[k]);
  assert.ok(core.planRun({}, { counts: {} }).politicians.every((p) => rowOf(core.ROSTER, p).tier === 1), "tier order unchanged");
  assert.match(R.resolutionLine(core.RESOLUTION), / \d+ discovered\) ·/);
});

await t("discovery does not run during the live cron pull", () => {
  // Walk everything the cron function imports.
  const seen = new Set();
  const walk = (file) => {
    if (seen.has(file) || !fs.existsSync(file)) return;
    seen.add(file);
    const src = fs.readFileSync(file, "utf8");
    for (const m of src.matchAll(/(?:^|\n)\s*(?:import|export)\s[^;]*?from\s+["']([^"']+)["']/g)) {
      if (!m[1].startsWith(".")) continue;
      walk(path.resolve(path.dirname(file), m[1]));
    }
  };
  walk(path.join(root, "netlify/functions/raw-ingest-cron.mts"));
  const files = [...seen].map((f) => path.relative(root, f));
  assert.ok(files.includes("netlify/lib/raw-ingest-core.mjs") && files.includes("netlify/lib/raw-ingest-resolve.mjs"), "walked the cron's imports");
  assert.ok(!files.some((f) => /discover-raw-ingest-sources|raw-ingest-discovery\.mjs/.test(f)), `the cron never loads the discovery job or its rules: ${files.filter((f) => /discover/.test(f))}`);
  for (const f of files) {
    const s = fs.readFileSync(path.join(root, f), "utf8");
    assert.doesNotMatch(s, /api\.tavily\.com|TAVILY_API_KEY|api\.open\.fec\.gov|FEC_API_KEY|openstates\/people/, `${f} has no search / discovery source`);
  }
  // The rules module and the resolver step are pure.
  for (const f of ["netlify/lib/raw-ingest-discovery.mjs", "netlify/lib/raw-ingest-resolve.mjs"]) assert.doesNotMatch(fs.readFileSync(path.join(root, f), "utf8"), /\bfetch\(/, `${f} fetches nothing`);
  // The job itself is the only place that searches, and it refuses to run from the cron's modules.
  assert.match(fs.readFileSync(path.join(root, "scripts/discover-raw-ingest-sources-2026-11.mjs"), "utf8"), /api\.tavily\.com/);
});

await t("scoring and Evidence Locker code do not reference the new step", () => {
  for (const f of ["netlify/lib/stance-score-core.mjs", "netlify/lib/evidence-locker-core.mjs", "netlify/lib/stated-positions-core.mjs", "netlify/lib/locker-read.mjs", "netlify/lib/stance-check.mjs"]) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, f), "utf8"), /discovered|raw-ingest-discovery|resolveDiscovered|DISCOVERED_CLASSES|accepted_because|found_by|raw-ingest-resolve/, f);
  }
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log(`✓ raw-ingest discovered sources: ${passed} passed, 0 failed`);
