#!/usr/bin/env node
// test-raw-ingest-priority-newsrooms.mjs — own-site newsroom indexes
// (OWN_SITE_NEWSROOMS) join the roster, the planner's priority lane rotates
// through zero-evidence members first, spare frontier slots prefer them, the
// harvester reads their release-link shapes, and the cron runs every 5 minutes.
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import assert from "node:assert/strict";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const log = console.log; console.log = () => {};
const core = await imp("netlify/lib/raw-ingest-core.mjs");
const F = await imp("netlify/lib/raw-ingest-fresh.mjs");
console.log = log;

let failures = 0, passed = 0;
const t = async (name, body) => {
  try { await body(); passed++; console.log("  ✓", name); }
  catch (e) { failures++; console.error("  ✗", name, "\n    ", e.message); }
};

const NR = core.OWN_SITE_NEWSROOMS;
const PIDS = NR.map((s) => s.politician_id);

await t("16 own-site newsrooms, each on the member's own senate.gov / house.gov host, all merged into the roster", () => {
  assert.equal(NR.length, 16);
  assert.deepEqual(core.OWN_SITE_NEWSROOMS_MISSING, []);
  for (const s of NR) {
    assert.match(new URL(s.url).hostname, /\.(senate|house)\.gov$/, s.url);
    assert.doesNotMatch(s.url, /democrats\.senate|republican|democraticleader|speaker\.gov/i, `${s.url} is not a shared site`);
    const row = core.ROSTER.find((r) => r.politician_id === s.politician_id);
    const pages = row.sources.filter(core.isPriorityNewsroom);
    assert.equal(pages.length, 1, `${s.politician_id} has exactly one priority newsroom`);
  }
  assert.equal(new Set(PIDS).size, 16, "one per member");
});

await t("a priority newsroom is never filled by the baseline", () => {
  const s = NR[0];
  const counts = { [`${s.politician_id}|cost_living`]: { strong: 5 } };
  assert.equal(core.pageFilled(counts, s.politician_id, s), false);
});

await t("the priority lane plans up to 2 zero-evidence members per run and laps all 16 in 8 runs", () => {
  let st = { cycle: 0, done: [] };
  const seen = [];
  for (let i = 0; i < 8; i++) {
    const p = core.planRun(st, {});
    assert.equal(p.priority.planned.length, 2, `run ${i}`);
    assert.deepEqual(p.politicians.slice(0, 2), p.priority.planned, "priority members go first");
    for (const pid of p.priority.planned) {
      const row = core.ROSTER.find((r) => r.politician_id === pid);
      const nr = row.sources.find(core.isPriorityNewsroom);
      assert.ok(p.sources.some((s) => s.url === nr.url), `${pid}'s newsroom is in the pull list`);
    }
    assert.ok(p.politicians.length > 2, "the normal rotation keeps the other slots");
    seen.push(...p.priority.planned);
    st = p.state;
  }
  assert.deepEqual([...seen].sort(), [...PIDS].sort());
  const next = core.planRun(st, {});
  assert.equal(next.priority.remaining_in_lap.length, 14, "a new lap starts");
});

await t("a member with any Locker evidence leaves the priority lane", () => {
  const counts = Object.fromEntries(PIDS.filter((p) => p !== "graham").map((p) => [`${p}|healthcare`, { weak: 1 }]));
  const p = core.planRun({ cycle: 0, done: [] }, { counts });
  assert.deepEqual(p.priority.pids, ["graham"]);
  assert.equal(p.politicians[0], "graham");
});

await t("a roster with no priority newsrooms keeps the old state shape", () => {
  const roster = [{ politician_id: "x", tier: 1, sources: [{ politician_id: "x", topic: "cost_living", url: "https://x.gov/a" }] }];
  assert.deepEqual(core.planRun({ cycle: 0, done: [] }, { roster }).state, { cycle: 0, done: ["x"] });
});

await t("spare frontier slots go to priority members first", () => {
  const fr = (pid, rank) => [{ politician_id: pid, topic: "cost_living", source_type: "official press release", source_id: `fresh-${pid}`, url: `https://${pid}.gov/press-releases/a-b-c`, rank }];
  const state = { frontier: { high: fr("high", 9), andy_kim: fr("andy_kim", 1) }, seen: {} };
  const f = F.addFreshSources([], state, { politicians: [], max: 36, perPolitician: 6, spare: 1, log: () => {}, priority: ["andy_kim"] });
  assert.deepEqual(f.added.map((x) => x.politician_id), ["andy_kim"]);
});

await t("release links in dated, press_release and (on a newsroom index) top-level slug paths are harvested", () => {
  assert.equal(F.classifyLink("https://www.tillis.senate.gov/2026/10/tillis-colleagues-urge-president-trump", "", { official: true })?.kind, "fresh_press_release");
  assert.equal(F.classifyLink("https://www.kim.senate.gov/press_release/senator-kim-draws-roadmap/", "", { official: true })?.kind, "fresh_press_release");
  const slug = "https://www.murray.senate.gov/senator-murray-presses-for-lower-drug-costs/";
  assert.equal(F.classifyLink(slug, "", { official: true }), null, "not on an ordinary page");
  assert.equal(F.classifyLink(slug, "", { official: true, pressIndex: true })?.kind, "fresh_press_release");
  assert.equal(F.classifyLink("https://www.murray.senate.gov/committee-assignments/", "", { official: true, pressIndex: true }), null, "short slugs stay out");
});

await t("raw-ingest-cron runs every 5 minutes", () => {
  const src = fs.readFileSync(path.join(root, "netlify/functions/raw-ingest-cron.mts"), "utf8");
  assert.match(src, /schedule:\s*"\*\/5 \* \* \* \*"/);
});

console.log(`\n${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
