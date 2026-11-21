// Baseline counts cache for the every-minute raw-ingest run
// (cachedBaselineCounts / bumpBaselineCounts in netlify/lib/evidence-locker-core.mjs).
// The whole-Locker read is done at most once per TTL; other runs read one doc.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  cachedBaselineCounts, bumpBaselineCounts, lockerBaselineCounts, lockerKey,
  BASELINE_CACHE_KEY, BASELINE_CACHE_TTL_MS, BASELINE_REFRESH_CLAIM_MS,
} from "../netlify/lib/evidence-locker-core.mjs";

let passed = 0, failed = 0;
const t = async (name, fn) => { try { await fn(); passed++; console.log(`  ✓ ${name}`); } catch (e) { failed++; console.log(`  ✗ ${name}\n    ${e?.message || e}`); } };

const lockerStore = () => {
  const data = new Map(); let reads = 0;
  return {
    data, get reads() { return reads; },
    async list() { return { blobs: [...data.keys()].map((key) => ({ key })) }; },
    async get(k) { reads++; return data.has(k) ? JSON.parse(JSON.stringify(data.get(k))) : null; },
  };
};
const cacheStore = () => {
  const data = new Map(); const writes = [];
  return {
    data, writes,
    async get(k) { return data.has(k) ? JSON.parse(JSON.stringify(data.get(k))) : null; },
    async setJSON(k, v) { writes.push(k); data.set(k, JSON.parse(JSON.stringify(v))); return { modified: true }; },
  };
};
let n = 0;
const put = (ls, pid, topic, strength) => {
  const it = { politician_id: pid, topic, position: "support", confidence: strength === "strong" ? 0.9 : strength === "weak" ? 0.5 : 0.1, strength, link: `https://example.gov/${pid}/${n++}`, excerpt: "x" };
  ls.data.set(lockerKey(it), it);
};
const at = (iso) => () => new Date(iso);
const quiet = () => {};

await t("first run refreshes from the Locker and saves the doc", async () => {
  const ls = lockerStore(); const cs = cacheStore();
  put(ls, "a", "t1", "strong"); put(ls, "b", "t2", "weak"); put(ls, "b", "t2", "mention");
  const r = await cachedBaselineCounts(ls, cs, { log: quiet, now: at("2026-11-21T10:00:00Z") });
  assert.equal(r.source, "refreshed");
  assert.deepEqual(r.counts, await lockerBaselineCounts(ls, { log: quiet }));
  const doc = cs.data.get(BASELINE_CACHE_KEY);
  assert.equal(doc.computed_at, "2026-11-21T10:00:00.000Z");
  assert.deepEqual(doc.counts["a|t1"], { strong: 1, weak: 0 });
  assert.ok(!doc.refreshing_until, "the claim is cleared once the counts are saved");
});

await t("inside the TTL the doc is read and the Locker is not", async () => {
  const ls = lockerStore(); const cs = cacheStore();
  put(ls, "a", "t1", "strong");
  await cachedBaselineCounts(ls, cs, { log: quiet, now: at("2026-11-21T10:00:00Z") });
  const before = ls.reads;
  put(ls, "a", "t1", "strong");
  const r = await cachedBaselineCounts(ls, cs, { log: quiet, now: at("2026-11-21T10:20:00Z") });
  assert.equal(r.source, "cache");
  assert.equal(ls.reads, before, "no Locker item read");
  assert.deepEqual(r.counts["a|t1"], { strong: 1, weak: 0 }, "cached value, not the new item");
  assert.equal(r.age_ms, 20 * 60_000);
});

await t("after the TTL it refreshes; the newer items are counted", async () => {
  const ls = lockerStore(); const cs = cacheStore();
  put(ls, "a", "t1", "strong");
  await cachedBaselineCounts(ls, cs, { log: quiet, now: at("2026-11-21T10:00:00Z") });
  put(ls, "a", "t1", "strong");
  const later = new Date(Date.parse("2026-11-21T10:00:00Z") + BASELINE_CACHE_TTL_MS + 1000).toISOString();
  const r = await cachedBaselineCounts(ls, cs, { log: quiet, now: at(later) });
  assert.equal(r.source, "refreshed");
  assert.deepEqual(r.counts["a|t1"], { strong: 2, weak: 0 });
});

await t("a stale doc another run is refreshing is used as is", async () => {
  const ls = lockerStore(); const cs = cacheStore();
  const now = Date.parse("2026-11-21T12:00:00Z");
  cs.data.set(BASELINE_CACHE_KEY, { computed_at: "2026-11-21T10:00:00Z", counts: { "a|t1": { strong: 1, weak: 0 } }, refreshing_until: now + BASELINE_REFRESH_CLAIM_MS - 1000 });
  put(ls, "a", "t1", "strong");
  const r = await cachedBaselineCounts(ls, cs, { log: quiet, now: () => new Date(now) });
  assert.equal(r.source, "stale");
  assert.equal(ls.reads, 0);
});

await t("pids narrow the returned counts", async () => {
  const ls = lockerStore(); const cs = cacheStore();
  put(ls, "a", "t1", "strong"); put(ls, "b", "t1", "strong");
  const r = await cachedBaselineCounts(ls, cs, { pids: ["b"], log: quiet, now: at("2026-11-21T10:00:00Z") });
  assert.deepEqual(Object.keys(r.counts), ["b|t1"]);
  assert.deepEqual(Object.keys(cs.data.get(BASELINE_CACHE_KEY).counts).sort(), ["a|t1", "b|t1"], "the doc holds everyone");
});

await t("no usable cache store → the plain Locker read (earlier behaviour)", async () => {
  const ls = lockerStore(); put(ls, "a", "t1", "weak");
  const r = await cachedBaselineCounts(ls, { list() {} }, { log: quiet });
  assert.equal(r.source, "live");
  assert.deepEqual(r.counts, { "a|t1": { strong: 0, weak: 1 } });
});

await t("bumpBaselineCounts adds strong / weak writes only and leaves the input alone", async () => {
  const c = { "a|t1": { strong: 1, weak: 0 } };
  const out = bumpBaselineCounts(c, [
    { politician_id: "a", topic: "t1", strength: "weak" },
    { politician_id: "b", topic: "t2", strength: "strong" },
    { politician_id: "b", topic: "t2", strength: "mention" },
  ]);
  assert.deepEqual(out, { "a|t1": { strong: 1, weak: 1 }, "b|t2": { strong: 1, weak: 0 } });
  assert.deepEqual(c, { "a|t1": { strong: 1, weak: 0 } });
});

await t("the scheduled entry point turns the cache on; direct run() calls do not", async () => {
  const src = readFileSync(new URL("../netlify/functions/raw-ingest-cron.mts", import.meta.url), "utf8");
  const sched = src.slice(src.indexOf("export async function scheduled("));
  assert.match(sched.slice(0, 3000), /baselineCache: true/);
  assert.match(src, /else if \(deps\.baselineCache\) \{\s*\/\/[^\n]*\n[^\n]*\n\s*const b = await cachedBaselineCounts\(deps\.lockerStore, deps\.rotationStore/);
  assert.match(src, /deps\.baselineCache \? bumpBaselineCounts\(counts, lockerWrites\)/, "no second whole-Locker read at the end of a cached run");
});

console.log(failed ? `✗ locker baseline cache: ${failed} failed, ${passed} passed` : `✓ locker baseline cache: ${passed} passed, 0 failed`);
if (failed) process.exit(1);
