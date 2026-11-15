#!/usr/bin/env node
// test-raw-ingest-fresh.mjs — the fresh evidence pass of the raw-ingest cron
// (netlify/lib/raw-ingest-fresh.mjs + the cron's `fresh` dependency):
//   · a run against a politician with thin coverage on a topic lands a new
//     Locker item AND a stated-position change;
//   · discovery adds ≥ 1 new URL when the fixture has unfetched candidate pages;
//   · an existing strong item is left unchanged by an identical or weaker read;
//   · curated rows (and rows resting on reviewed evidence) are never written;
//   · topic targeting, expanded source types, caps, shared hosts and the
//     unknown-key guard.
import { pathToFileURL, fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const fn = await imp("netlify/functions/raw-ingest-cron.mts");
const F = await imp("netlify/lib/raw-ingest-fresh.mjs");
const core = await imp("netlify/lib/raw-ingest-core.mjs");
const SP = await imp("netlify/lib/stated-positions-core.mjs");
const { hasRulesFor, SCORED_TOPICS } = await imp("netlify/lib/stance-score-core.mjs");

let failures = 0, passed = 0;
const t = async (name, body) => {
  try { await body(); passed++; console.log("  ✓", name); }
  catch (e) { failures++; console.error("  ✗", name, "\n    ", e.message); }
};
const quiet = async (f) => {
  const orig = console.log; const lines = [];
  console.log = (...a) => lines.push(a.join(" "));
  try { return { value: await f(), lines }; } finally { console.log = orig; }
};
const mem = () => {
  const data = new Map();
  return {
    data,
    async list({ prefix = "" } = {}) { return { blobs: [...data.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
    async get(k) { return data.has(k) ? JSON.parse(JSON.stringify(data.get(k))) : null; },
    async setJSON(k, v, opts = {}) {
      if (opts.onlyIfNew && data.has(k)) return { modified: false };
      data.set(k, JSON.parse(JSON.stringify(v))); return { modified: true };
    },
  };
};
const pages = (map) => async (url) => {
  const body = map[url];
  return {
    ok: body != null, status: body != null ? 200 : 404, url,
    headers: new Map([["content-type", "text/html; charset=UTF-8"]]),
    text: async () => body ?? "",
  };
};
const fakeDb = (rows = []) => {
  const calls = { upsert: [], withdraw: [] };
  return {
    calls, rows,
    async rowsFor(pid) { return rows.filter((r) => r.politicianId === pid).map((r) => ({ ...r })); },
    async upsert(pid, rec) { calls.upsert.push({ pid, ...rec }); },
    async withdraw(pid, keys) { calls.withdraw.push({ pid, keys }); },
  };
};
const NOW = () => new Date("2026-11-15T12:00:00.000Z");

// ── Fixture: Chip Roy, healthcare thin (1 weak), cost_living filled ──
const HOME = "https://roy.house.gov";
const NEWSROOM = "https://roy.house.gov/media/press-releases";
const PR = "https://roy.house.gov/media/press-releases/roy-introduces-bill-to-lower-prescription-drug-costs";
const PR2 = "https://roy.house.gov/media/press-releases/roy-statement-on-insurance-premium-relief-act";
const CEREMONY = "https://roy.house.gov/media/press-releases/roy-congratulates-local-high-school-champions";
const NEWSROOM_HTML = `<html><head><title>Press Releases | Congressman Chip Roy</title></head><body><h1>Press Releases</h1>
<ul>
<li><a href="/media/press-releases/roy-introduces-bill-to-lower-prescription-drug-costs">Roy Introduces Bill to Lower Prescription Drug Costs</a></li>
<li><a href="${PR2}">Roy Statement on Insurance Premium Relief Act</a></li>
<li><a href="/media/press-releases/roy-congratulates-local-high-school-champions">Roy Congratulates Local High School Champions</a></li>
<li><a href="/contact">Contact</a></li><li><a href="/media/press-releases?page=2">Next page</a></li>
<li><a href="https://twitter.com/chiproytx">Twitter</a></li><li><a href="/media/press-releases/roy.pdf">PDF</a></li>
</ul><p>Read the latest news from the office of Congressman Chip Roy, representing the people of the district.</p>
<p>This page lists press releases, statements and other announcements from the office in date order.</p></body></html>`;
const PR_HTML = `<html><head><title>Roy Introduces Bill to Lower Prescription Drug Costs | Congressman Chip Roy</title></head><body>
<h1>Roy Introduces Bill to Lower Prescription Drug Costs</h1>
<p>I will fight to lower prescription drug costs and cap insulin co-pays for every family.</p>
<p>We will reduce insurance premiums for Texas families.</p>
<p>Our bill brings down out-of-pocket costs for patients.</p></body></html>`;
const HOME_HTML = `<html><head><title>Congressman Chip Roy</title></head><body><h1>Welcome</h1><p>Serving the district with integrity every day.</p><p>Find services, news and more from the office here at home.</p></body></html>`;
const ROSTER = [{
  politician_id: "chip_roy", tier: 1, has_board: true, has_stances: true,
  sources: [{ politician_id: "chip_roy", topic: "cost_living", source_id: "known-homepage", source_type: "official homepage", url: HOME }],
  official: { politician_id: "chip_roy", topic: "cost_living", source_type: "official House newsroom", official_kind: "congress", source_id: "official-newsroom", url: NEWSROOM },
}];
const THIN = { "chip_roy|healthcare_costs": { strong: 0, weak: 1 } };
const runFixture = (over = {}) => quiet(async () => {
  const res = await fn.run({
    fetch: pages({ [HOME]: HOME_HTML, [NEWSROOM]: NEWSROOM_HTML, [PR]: PR_HTML, [PR2]: PR_HTML, ...(over.pages || {}) }),
    store: mem(), now: NOW, log: over.log ?? (() => {}),
    rotate: { roster: ROSTER, state: {}, counts: over.counts ?? THIN },
    lockerStore: over.lockerStore ?? mem(),
    rotationStore: over.rotationStore ?? mem(),
    fresh: over.fresh ?? true,
    ...(over.statedDb ? { statedDb: over.statedDb } : {}),
  });
  return res.json();
});

await t("discovery adds ≥ 1 new URL when the fixture has unfetched candidate pages", async () => {
  const logs = [];
  const { value: r } = await runFixture({ log: (l) => logs.push(l) });
  assert.ok(r.discovered.length >= 1, `discovered ${r.discovered.length}`);
  const urls = r.discovered.map((d) => d.url);
  assert.ok(urls.includes(PR), "the press release linked from the newsroom is pulled this run");
  assert.ok(!urls.includes(CEREMONY), "a ceremonial item is not chased while better pages wait");
  assert.ok(!urls.some((u) => /contact|page=|twitter|\.pdf/.test(u)), "navigation, pagination, off-host and assets are never candidates");
  assert.ok(logs.some((l) => /^discovery: NEW chip_roy\|healthcare_costs .*fresh/.test(l)), "a NEW line names the fresh page");
  assert.ok(logs.some((l) => /^discovery: [1-9]\d* new URL\(s\) this run in total/.test(l)), "the run total is not 0");
  assert.ok(r.included.sources.length <= core.MAX_SOURCES_PER_POLITICIAN, "the per-politician cap holds");
});

await t("thin coverage: the run lands a new Locker item and a stated-position change", async () => {
  const lockerStore = mem(); const db = fakeDb(); const logs = [];
  const { value: r } = await runFixture({ lockerStore, statedDb: db, log: (l) => logs.push(l) });
  const hc = r.locker_writes.filter((w) => w.politician_id === "chip_roy" && w.topic === "healthcare_costs" && w.strength === "strong");
  assert.ok(hc.length >= 1, `new strong healthcare item(s): ${JSON.stringify(r.locker_writes)}`);
  assert.ok(r.stated_positions.moved.length >= 1, "at least one politician with a stated-position change");
  assert.ok(db.calls.upsert.some((u) => u.pid === "chip_roy" && u.issueKey === "healthcare_costs" && u.stance === "support"), "healthcare_costs promoted");
  assert.deepEqual(r.stated_positions.priority, ["chip_roy"], "the thin-topic write is recomputed first");
  assert.ok(logs.some((l) => l.startsWith("stated-positions: new evidence on thin topic(s) — ") && l.includes("chip_roy|healthcare_costs (strong")));
  assert.equal(r.discovered.find((d) => d.url === PR).topic, "healthcare_costs", "the fresh page is filed under the topic its link signals, not the cost_living default");
});

await t("fresh state persists: fetched pages are seen and not re-offered; the frontier keeps the rest", async () => {
  const rotationStore = mem();
  await runFixture({ rotationStore, fresh: { per: 1 } });
  const seen = rotationStore.data.get(F.SEEN_KEY), frontier = rotationStore.data.get(F.FRONTIER_KEY);
  // per: 1 → the statement (ranked first) is pulled, the press release waits.
  assert.ok(seen.urls[F.normUrl(PR2)], "the pulled statement is in the seen ledger");
  assert.ok(!seen.urls[F.normUrl(PR)], "the waiting page has not been fetched");
  assert.ok((frontier.items.chip_roy || []).some((x) => x.url === PR), "the second candidate waits in the frontier");
  const { value: r2 } = await runFixture({ rotationStore, fresh: { per: 1 } });
  const urls = r2.discovered.map((d) => d.url);
  assert.ok(urls.includes(PR) && !urls.includes(PR2), "run 2 pulls the waiting page, not the one already read");
});

await t("an existing strong item is left unchanged by an identical or a weaker read", async () => {
  const lockerStore = mem();
  await runFixture({ lockerStore });
  const before = JSON.stringify([...lockerStore.data.entries()]);
  const strongKey = [...lockerStore.data.keys()].find((k) => lockerStore.data.get(k).strength === "strong");
  assert.ok(strongKey, "fixture wrote a strong item");
  // Fresh state reset so the same page is pulled again — identical read.
  const logs = [];
  const { value: r } = await runFixture({ lockerStore, log: (l) => logs.push(l) });
  assert.equal(JSON.stringify([...lockerStore.data.entries()]), before, "identical read: Locker byte-for-byte unchanged");
  assert.equal(r.locker_writes.length, 0);
  assert.ok(logs.some((l) => l.startsWith("evidence-locker: EXISTS chip_roy|healthcare_costs") && /strong item left unchanged/.test(l)));
  // Weaker read of the same page.
  const WEAK = PR_HTML.replace(/<p>[\s\S]*<\/body>/, "<p>Make insulin affordable again for every family.</p></body>");
  await runFixture({ lockerStore, pages: { [PR]: WEAK } });
  assert.deepEqual(lockerStore.data.get(strongKey), JSON.parse(before).find(([k]) => k === strongKey)[1], "weaker read: strong item unchanged");
});

await t("curated rows are never written; rows resting on reviewed evidence are held", async () => {
  const curated = { politicianId: "chip_roy", issueKey: "healthcare_costs", stance: "oppose", status: "active", provenance: "curated", text: "curated words", sourceUrl: "https://example.gov/c", evidence: [] };
  const other = { politicianId: "chip_roy", issueKey: "border_security", stance: "support", status: "active", provenance: "curated", text: "x", sourceUrl: "https://example.gov/b", evidence: [] };
  const db = fakeDb([curated, other]);
  const { value: r } = await runFixture({ statedDb: db });
  assert.ok(r.locker_writes.length >= 1, "the run still wrote Locker evidence");
  assert.equal(db.calls.upsert.filter((u) => u.issueKey === "healthcare_costs").length, 0, "no upsert over the curated row");
  assert.equal(db.calls.withdraw.length, 0, "a curated row is never withdrawn");
  assert.equal(db.rows[0].text, "curated words");
  // planSync directly: reviewed evidence holds an active pipeline row.
  const row = { issueKey: "taxes", stance: "support", status: "active", provenance: "pipeline", evidence: ["k1"] };
  const p = SP.planSync({ taxes: { stance: "oppose", strength: "strong", evidence: ["k2"] } }, [row], { reviewedKeys: new Set(["k1"]) });
  assert.deepEqual([p.upserts.length, p.withdraw.length, p.held[0]?.reason], [0, 0, "rests on reviewed evidence"]);
  const w = SP.planSync({}, [row], { reviewedKeys: new Set(["k1"]) });
  assert.equal(w.withdraw.length, 0, "…and is never withdrawn");
  // The production adapter guards the upsert/withdraw by provenance too.
  const src = readFileSync(path.join(root, "netlify/lib/stated-positions-core.mjs"), "utf8");
  assert.match(src, /setWhere: eq\(table\.provenance, PROVENANCE\)/);
});

await t("topic targeting: a default-topic page moves to the topic it signals; cited pages and weak signals stay", () => {
  const rec = { politician_id: "chip_roy", topic: "cost_living", source_id: "known-homepage", source_type: "official homepage", url: HOME, body: PR_HTML };
  const tg = F.targetTopic(rec, { counts: {} });
  assert.equal(tg.topic, "healthcare_costs"); assert.ok(tg.moved);
  const cited = F.targetTopic({ ...rec, source_id: undefined, source_type: "official House issue page" }, { counts: {} });
  assert.equal(cited.moved, false, "a page cited for a topic keeps it");
  const bare = F.targetTopic({ ...rec, body: HOME_HTML }, { counts: {} });
  assert.equal(bare.topic, "cost_living", "no clear signal → filed topic kept");
  // Thin coverage breaks a tie between two signalled topics.
  const hits = { healthcare_costs: 4, education: 4 };
  assert.ok(F.coverageBonus({ "x|healthcare_costs": { strong: 1 } }, "x", "healthcare_costs") < F.coverageBonus({}, "x", "education"));
  assert.ok(hits);
});

await t("unknown keys are refused: targeting and the frontier only carry scored issue keys", () => {
  for (const b of [PR_HTML, NEWSROOM_HTML, HOME_HTML]) {
    const tg = F.targetTopic({ politician_id: "p", topic: "cost_living", source_id: "fresh-x", source_type: "official press release", url: PR, body: b });
    assert.ok(hasRulesFor(tg.topic), tg.topic);
  }
  const st = F.normaliseFreshState({ items: { p: [{ politician_id: "p", url: "https://a.gov/x", topic: "made_up_key" }, { politician_id: "p", url: "https://a.gov/y", topic: "healthcare_costs" }] } }, null);
  assert.deepEqual(st.frontier.p.map((x) => x.topic), ["healthcare_costs"]);
  const found = F.harvestLinks({ politician_id: "chip_roy", topic: "cost_living", url: NEWSROOM, source_type: "official House newsroom" }, NEWSROOM_HTML);
  assert.ok(found.length >= 2 && found.every((x) => SCORED_TOPICS.includes(x.topic)));
});

await t("expanded source types: press releases, statements and issue / priority pages are classified", () => {
  assert.equal(F.classifyLink(PR, "", { official: true }).source_type, "official press release");
  assert.equal(F.classifyLink("https://x.gov/news/documentsingle.aspx?DocumentID=1234", "", { official: true }).kind, "fresh_press_release");
  assert.equal(F.classifyLink("https://jane.com/statement-on-the-border-bill", "", {}).source_type, "campaign statement");
  assert.equal(F.classifyLink("https://jane.com/issues/health-care", "", {}).source_type, "campaign issue page");
  assert.equal(F.classifyLink("https://jane.com/priorities/affordable-housing", "", {}).source_type, "campaign priority page");
  for (const u of ["https://jane.com/issues", "https://jane.com/donate", "https://jane.com/news/tag/health-care-reform", "https://jane.com/", "https://x.gov/media/press-releases?page=3", "https://x.gov/media/press-releases/a.pdf"]) {
    assert.equal(F.classifyLink(u, "", {}), null, u);
  }
  // A statement outranks a ceremonial item; the latter is dropped.
  const found = F.harvestLinks({ politician_id: "chip_roy", topic: "cost_living", url: NEWSROOM, source_type: "official House newsroom" }, NEWSROOM_HTML);
  assert.equal(found[0].url, PR2, "statement first");
  assert.ok(!found.some((x) => x.url === CEREMONY));
});

await t("shared hosts and member-list pages are never harvested", () => {
  const shared = F.sharedHosts(core.ROSTER);
  assert.ok(shared.has("whitehouse.gov"), "whitehouse.gov is shared by two roster politicians");
  assert.equal(F.isHarvestable({ politician_id: "vance", url: "https://www.whitehouse.gov", source_type: "official homepage" }, shared), false);
  assert.equal(F.isHarvestable({ politician_id: "x", url: "https://house.texas.gov/members/50", source_type: "official state legislature member page", official_kind: "state_legislature" }, shared), false);
  assert.equal(F.isHarvestable({ politician_id: "chip_roy", url: NEWSROOM, source_type: "official House newsroom" }, shared), true);
});

await t("caps unchanged: a fresh page takes a free slot or displaces an already-read page, never more", () => {
  const per = 3;
  const srcs = [
    { politician_id: "p", topic: "cost_living", source_id: "official-newsroom", source_type: "official House newsroom", official_kind: "congress", url: "https://p.gov/news" },
    { politician_id: "p", topic: "healthcare_costs", source_type: "official House issue page", url: "https://p.gov/issues/health" },
    { politician_id: "p", topic: "taxes", source_type: "official House issue page", url: "https://p.gov/issues/taxes" },
  ];
  const state = { seen: { [F.normUrl("https://p.gov/issues/taxes")]: "2026-11-14" }, frontier: { p: [
    { politician_id: "p", topic: "healthcare_costs", source_type: "official press release", source_id: "fresh-1", url: "https://p.gov/news/p-introduces-health-bill-today", rank: 5 },
    { politician_id: "p", topic: "healthcare_costs", source_type: "official press release", source_id: "fresh-2", url: "https://p.gov/news/p-votes-against-premium-hikes", rank: 4 },
  ] } };
  const r = F.addFreshSources(srcs, state, { politicians: ["p"], max: 36, perPolitician: per, log: () => {} });
  assert.equal(r.sources.length, per, "per-politician cap holds");
  assert.equal(r.added.length, 1, "one fresh page in, for the one already-read page out");
  assert.equal(r.displaced[0].url, "https://p.gov/issues/taxes");
  assert.ok(r.sources.some((s) => s.official_kind), "the newsroom (harvest source) is never displaced");
  const capped = F.addFreshSources(srcs, state, { politicians: ["p"], max: 3, perPolitician: 6, log: () => {} });
  assert.equal(capped.sources.length, 3, "run cap holds");
});

await t("cross-topic scoring stays on; without `fresh` the run behaves as before", async () => {
  const src = (await imp("netlify/lib/stance-score-core.mjs"));
  assert.equal(typeof src.scoreAllTopics, "function");
  const fsrc = readFileSync(path.join(root, "netlify/functions/raw-ingest-cron.mts"), "utf8");
  assert.match(fsrc, /logCandidateStances\(rec, \{ log \}\)/, "every page still goes through the multi-topic scorer");
  assert.match(fsrc, /fresh: true,/, "the scheduled entry point turns the fresh pass on");
  const { value: r } = await runFixture({ fresh: false });
  assert.equal(r.fresh, undefined);
  assert.ok(!r.discovered.some((d) => d.url === PR), "no fresh pages without the pass");
});

console.log(`\n${failures ? "✗" : "✓"} raw-ingest fresh evidence: ${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
