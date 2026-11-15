#!/usr/bin/env node
// test-raw-ingest-hosts.mjs — fetch-failure classes, per-cycle host skipping,
// probe-first pulls, bounded Locker reads and frontier consumption (spare run
// slots + skip reasons) for the raw-ingest cron.
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const H = await imp("netlify/lib/raw-ingest-hosts.mjs");
const F = await imp("netlify/lib/raw-ingest-fresh.mjs");
const L = await imp("netlify/lib/locker-read.mjs");
const SP = await imp("netlify/lib/stated-positions-core.mjs");

let failures = 0, passed = 0;
const t = async (name, body) => {
  try { await body(); passed++; console.log("  ✓", name); }
  catch (e) { failures++; console.error("  ✗", name, "\n    ", e.message); }
};
const undiciErr = (code, message) => { const e = new TypeError("fetch failed"); e.cause = Object.assign(new Error(message), { code }); return e; };

await t("fetch failures are classified from the undici cause", () => {
  assert.equal(H.classifyFetchError(undiciErr("ENOTFOUND", "getaddrinfo ENOTFOUND x.gov")).cls, "dns");
  assert.equal(H.classifyFetchError(undiciErr("ECONNRESET", "read ECONNRESET")).cls, "reset");
  assert.equal(H.classifyFetchError(undiciErr("UND_ERR_CONNECT_TIMEOUT", "Connect Timeout Error")).cls, "timeout");
  assert.equal(H.classifyFetchError(undiciErr("EMFILE", "too many open files")).cls, "local_fd");
  assert.equal(H.classifyFetchError(undiciErr("CERT_HAS_EXPIRED", "certificate has expired")).cls, "tls");
  assert.equal(H.classifyFetchError(Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" })).cls, "timeout");
  assert.equal(H.classifyFetchError(new Error("HTTP 403")).cls, "http_403");
  assert.equal(H.classifyFetchError(new Error("HTTP 429")).cls, "http_429");
  assert.equal(H.classifyFetchError(new Error("HTTP 503")).cls, "http_5xx");
  assert.equal(H.classifyFetchError(new Error("HTTP 404")).cls, "http_404");
  assert.match(H.describeFetchError(undiciErr("ENOTFOUND", "getaddrinfo ENOTFOUND x.gov")).error, /^fetch failed \(dns: ENOTFOUND: getaddrinfo/);
});

await t("a host failing at host level is skipped for the rest of the cycle; 404s and outages never count", () => {
  const h = H.normaliseHostHealth(null, 7);
  H.recordHostResults(h, [{ ok: false, url: "https://a.gov/x", error_class: "http_403", error: "HTTP 403" }, { ok: false, url: "https://b.gov/x", error_class: "http_404", error: "HTTP 404" }, { ok: true, url: "https://c.gov/" }]);
  const r = H.recordHostResults(h, [{ ok: false, url: "https://a.gov/y", error_class: "reset", error: "fetch failed" }, { ok: true, url: "https://c.gov/" }]);
  assert.deepEqual([...H.skippedHosts(h).keys()], ["a.gov"]);
  assert.deepEqual(r.newlySkipped, ["a.gov"]);
  const kept = H.filterSkippedHosts([{ url: "https://www.a.gov/p" }, { url: "https://b.gov/p" }], H.skippedHosts(h));
  assert.equal(kept.kept.length, 1); assert.equal(kept.dropped.length, 1);
  // A new cycle starts clean.
  assert.equal(H.skippedHosts(H.normaliseHostHealth({ cycle: 7, hosts: h.hosts }, 8)).size, 0);
  // Every fetch failing at network level across hosts = run-side outage: no host penalised.
  const h2 = H.normaliseHostHealth(null, 1);
  const out = H.recordHostResults(h2, ["a", "b", "c", "d"].flatMap((x) => [1, 2].map((i) => ({ ok: false, url: `https://${x}.gov/${i}`, error_class: "dns", error: "fetch failed" }))));
  assert.equal(out.outage, true);
  assert.equal(H.skippedHosts(h2).size, 0);
});

await t("probe-first: a dead host costs one fetch, healthy hosts pull everything", async () => {
  const calls = [];
  const pull = async (s) => { calls.push(s.url); return s.url.includes("dead") ? { ok: false, url: s.url, error_class: "timeout", error: "x" } : { ok: true, url: s.url }; };
  const srcs = [1, 2, 3].map((i) => ({ url: `https://dead.gov/${i}` })).concat([1, 2].map((i) => ({ url: `https://ok.gov/${i}` })));
  const res = await H.pullProbeFirst(srcs, pull, { log: () => {} });
  assert.equal(calls.filter((u) => u.includes("dead")).length, 1);
  assert.equal(res.filter((r) => r.host_skipped).length, 2);
  assert.equal(res.filter((r) => r.ok).length, 2);
  assert.deepEqual(res.map((r) => r.url), srcs.map((s) => s.url));
});

await t("Locker reads are bounded and keep order", async () => {
  let inflight = 0, peak = 0;
  const store = { async get(k) { inflight++; peak = Math.max(peak, inflight); await new Promise((r) => setTimeout(r, 2)); inflight--; return { k }; } };
  const keys = Array.from({ length: 500 }, (_, i) => `p/${i}`);
  const docs = await L.readLockerDocs(store, keys);
  assert.ok(peak <= L.LOCKER_READ_CONCURRENCY, `peak ${peak}`);
  assert.deepEqual(docs.map((d) => d.doc.k), keys);
});

const cand = (pid, i, host = `${pid}.gov`) => ({ politician_id: pid, topic: "cost_living", source_type: "official press release", source_class: "fresh_press_release", source_id: `fresh-${pid}${i}`, url: `https://${host}/news/a-b-c-${i}`, found_from: `https://${host}/news`, rank: 5 - i });

await t("frontier: free run slots take other politicians' pages; every skip has a reason", () => {
  const state = { frontier: { planned: [cand("planned", 1)], other: [cand("other", 1), cand("other", 2), cand("other", 3)], down: [cand("down", 1, "dead.gov")] }, seen: {} };
  state.seen[F.normUrl(cand("planned", 1).url)] = "x";
  const lines = [];
  const base = [{ politician_id: "planned", topic: "cost_living", url: "https://planned.gov/", source_type: "official homepage", source_id: "known-homepage" }];
  const r = F.addFreshSources(base, state, { politicians: ["planned"], max: 36, perPolitician: 6, skipHosts: new Set(["dead.gov"]), spare: 12, log: (l) => lines.push(l) });
  assert.equal(r.added.length, 2);
  assert.ok(r.added.every((a) => a.politician_id === "other" && a.spare_slot));
  assert.equal(r.reasons["already fetched (seen ledger)"], 1);
  assert.equal(r.reasons["host failing this cycle (skipped)"], 1);
  assert.ok(lines.some((l) => /^discovery: frontier — 1 planned politician\(s\), 1 with frontier pages .* considered \d+ candidate\(s\): 2 added \(0 for planned politicians, 2 in spare run slots\)/.test(l)), lines.join("\n"));
  assert.ok(lines.some((l) => /^discovery: frontier SKIP down https:\/\/dead\.gov\/.* — host failing this cycle/.test(l)));
});

await t("frontier: the run cap is never exceeded by spare-slot pages", () => {
  const state = { frontier: { other: [cand("other", 1), cand("other", 2)] }, seen: {} };
  const base = Array.from({ length: 36 }, (_, i) => ({ politician_id: `p${i}`, topic: "cost_living", url: `https://p${i}.gov/`, source_type: "official homepage" }));
  const r = F.addFreshSources(base, state, { politicians: [], max: 36, perPolitician: 6, spare: 12, log: () => {} });
  assert.equal(r.sources.length, 36);
  assert.equal(r.added.length, 0);
});

await t("failing fresh pages leave the frontier (page-level at once, host-level after retries)", () => {
  const state = { frontier: { a: [cand("a", 1), cand("a", 2)] }, seen: {} };
  const res = [{ ok: false, url: cand("a", 1).url, error_class: "http_404" }, { ok: false, url: cand("a", 2).url, error_class: "timeout" }];
  F.noteFreshFailures(state, res, { hostLevel: H.HOST_LEVEL });
  assert.equal(state.frontier.a.length, 1);
  F.noteFreshFailures(state, [res[1]], { hostLevel: H.HOST_LEVEL });
  assert.equal(state.frontier.a, undefined);
  // An outage retires nothing.
  const s2 = { frontier: { a: [cand("a", 1)] }, seen: {} };
  F.noteFreshFailures(s2, [res[0]], { outage: true, hostLevel: H.HOST_LEVEL });
  assert.equal(s2.frontier.a.length, 1);
});

await t("a stated-positions database error names its cause, not just the SQL", () => {
  const e = new Error('Failed query: select "id", "politician_id" from "pdx_stated_positions" where "pdx_stated_positions"."politician_id" = $1\nparams: x');
  e.cause = undiciErr("ENOTFOUND", "getaddrinfo ENOTFOUND db.example");
  assert.equal(SP.describeDbError(e), "query on pdx_stated_positions failed — cause: fetch failed ← ENOTFOUND getaddrinfo ENOTFOUND db.example");
});

console.log(failures ? `✗ raw-ingest hosts: ${passed} passed, ${failures} failed` : `✓ raw-ingest hosts: ${passed} passed`);
process.exit(failures ? 1 : 0);
