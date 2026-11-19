#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-evidence-locker-citations.mjs — scored stance candidates → Evidence
// Locker items with citations.
//
//   · A clear-position (support / oppose) page scored by the real scorer and
//     passed through the real Locker writer (maybeWriteLockerItem) produces one
//     item carrying: politician ID, issue key, stated position, scorer
//     confidence, source type / date / direct URL, one or more verbatim
//     excerpts the scorer used, and own-page attribution.
//   · A "no clear position" read produces no clear-position item: no citation,
//     no stated position. (Topic mentions keep their separate, citation-free
//     "mention" tier, unchanged.) A page with no topic signal writes nothing.
//   · A clear read from a page that is not the politician's own is not written.
//   · Isolation: the ground-truth file is byte-for-byte unchanged and the raw
//     record handed to the writer is not mutated.
// ═══════════════════════════════════════════════════════════════════════════
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import * as S from "../netlify/lib/stance-score-core.mjs";
import * as L from "../netlify/lib/evidence-locker-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GT_PATH = join(ROOT, "db/stance-ground-truth-talarico-cost-of-living.json");
const gtBytes = readFileSync(GT_PATH);
const gtHash = createHash("sha256").update(gtBytes).digest("hex");
const gt = JSON.parse(gtBytes.toString("utf8"));

let failures = 0;
const t = async (name, fn) => {
  try { await fn(); console.log("  ✓", name); }
  catch (e) { failures++; console.error("  ✗", name, "\n    ", e.message); }
};

const fakeStore = () => {
  const data = new Map();
  return {
    data,
    async get(k) { return data.has(k) ? JSON.parse(JSON.stringify(data.get(k))) : null; },
    async setJSON(k, v, o = {}) { if (o.onlyIfNew && data.has(k)) return { modified: false }; data.set(k, JSON.parse(JSON.stringify(v))); return { modified: true }; },
    async list({ prefix = "" } = {}) { return { blobs: [...data.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
  };
};

const PID = "james_talarico";
const URL_HC = "https://jamestalarico.com/issue/health-care/";
const CLAIM = "In the Senate, James will cap the price of insulin at $35 a month for every Texan.";
const rawOf = (body, over = {}) => ({
  url: URL_HC, final_url: URL_HC, fetched_at: "2026-11-10T08:00:00.000Z", source_type: "campaign issue page",
  politician_id: PID, topic: "healthcare_costs", http_status: 200, source_id: "talarico-hc", body, ...over,
});
const CLEAR_PAGE = `<html><head><title>Health Care | James Talarico for U.S. Senate</title></head><body>
<h1>Health Care</h1><p>Texas has the highest uninsured rate in the nation.</p><p>${CLAIM}</p></body></html>`;
const MENTION_PAGE = "<html><body><p>America spends more on health care than any nation in the world.</p></body></html>";
const EMPTY_PAGE = "<html><body><p>Join us at the county fair this Saturday.</p></body></html>";

const write = async (raw, store = fakeStore()) => {
  const before = JSON.stringify(raw);
  const candidate = S.scoreRawRecord(raw);
  const r = await L.maybeWriteLockerItem(candidate, raw, { store, gt, log: () => {} });
  assert.equal(JSON.stringify(raw), before, "the raw record is never mutated");
  return { candidate, r, store };
};

await t("clear-position scored page → valid Evidence Locker item with every citation field", async () => {
  const { candidate, r, store } = await write(rawOf(CLEAR_PAGE));
  assert.equal(candidate.position, "support", "scorer reads a clear support");
  assert.equal(r.written, true, r.reason);
  assert.equal(store.data.size, 1, "exactly one item, in the existing evidence-locker store");
  const item = store.data.get(r.key);
  assert.equal(r.key, L.lockerKey(item), "existing key scheme");
  assert.equal(L.LOCKER_STORE_NAME, "evidence-locker");

  // Required fields (top level, existing schema).
  assert.equal(item.politician_id, PID);
  assert.equal(item.topic, "healthcare_costs");
  assert.equal(item.issue_key, "healthcare_costs");
  assert.equal(item.position, "support");
  assert.equal(item.confidence, candidate.confidence, "confidence is the scorer's");
  assert.ok(item.confidence >= L.LOCKER_WEAK_MIN_CONFIDENCE);
  assert.equal(item.source_type, "campaign issue page");
  assert.equal(item.date, "2026-11-10");
  assert.equal(item.link, URL_HC);
  assert.equal(item.own_page, true);
  assert.ok(Array.isArray(item.excerpts) && item.excerpts.length >= 1, "one or more excerpts");
  assert.ok(item.excerpts.includes(CLAIM), "the claim is quoted verbatim");
  const scorerTexts = new Set([candidate.sources[0].excerpt, ...candidate.sources[0].statements.map((s) => s.text)]);
  for (const ex of item.excerpts) assert.ok(scorerTexts.has(ex), `excerpt is one the scorer used: ${ex}`);
  assert.equal(item.layer, "stated");
  assert.equal(item.formal_record, false);

  // The citation record.
  const c = item.citation;
  assert.ok(c, "citation present");
  assert.equal(c.politician_id, PID);
  assert.equal(c.issue_key, "healthcare_costs");
  assert.equal(c.stated_position, "support");
  assert.equal(c.confidence, candidate.confidence);
  assert.equal(c.source_type, "campaign issue page");
  assert.match(c.source_date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(c.url, URL_HC);
  assert.deepEqual(c.excerpts, item.excerpts);
  assert.equal(c.own_page, true);
  assert.match(c.attribution, /^Source: campaign page — the politician's own page$/);

  // Still serves through the existing reader shape.
  const entry = L.toSpotlightEntry(item, { key: r.key });
  assert.equal(entry.issueKey, "healthcare_costs");
  assert.equal(entry.source.url, URL_HC);
});

await t("an oppose read is cited the same way", async () => {
  const st = fakeStore();
  const cand = {
    politician_id: "john_cornyn", topic: "healthcare_costs", position: "oppose", confidence: 0.85,
    confidence_reason: "test", rules_version: "test",
    sources: [{ type: "official Senate issue page", link: "https://www.cornyn.senate.gov/issue/health-care/", excerpt: "I oppose a government takeover of health care.",
      statements: [{ text: "I oppose a government takeover of health care.", kind: "clear", side: "oppose" }, { text: "Someone else said otherwise.", kind: "clear", side: "oppose", quoted_speaker: "other" }] }],
  };
  const raw = { url: "https://www.cornyn.senate.gov/issue/health-care/", fetched_at: "2026-11-09T08:00:00.000Z", source_type: "official Senate issue page", politician_id: "john_cornyn", topic: "healthcare_costs", http_status: 200 };
  const r = await L.maybeWriteLockerItem(cand, raw, { store: st, gt, log: () => {} });
  assert.equal(r.written, true, r.reason);
  const item = st.data.get(r.key);
  assert.equal(item.citation.stated_position, "oppose");
  assert.deepEqual(item.excerpts, ["I oppose a government takeover of health care."], "other speakers' quotes are not cited");
  assert.equal(item.citation.attribution, "Source: official Senate page — the politician's own page");
});

await t('"no clear position" result → no clear-position item (no citation, no stance)', async () => {
  const { candidate, r, store } = await write(rawOf(MENTION_PAGE));
  assert.equal(candidate.position, "no clear position");
  for (const item of store.data.values()) {
    assert.ok(!["support", "oppose"].includes(item.position), "no stance is written");
    assert.equal(item.citation, undefined, "no citation record");
    assert.equal(item.excerpts, undefined);
    assert.equal(item.issue_key, undefined);
    assert.equal(item.strength, "mention", "only the existing mention tier, unchanged");
  }
  if (r.written) assert.equal(r.item.strength, "mention");
});

await t('"no clear position" with no topic signal → nothing at all', async () => {
  const { candidate, r, store } = await write(rawOf(EMPTY_PAGE));
  assert.equal(candidate.position, "no clear position");
  assert.equal(r.written, false);
  assert.equal(store.data.size, 0);
});

await t("a clear read from a page that is not the politician's own is not written", async () => {
  const { r, store } = await write(rawOf(CLEAR_PAGE, { url: "https://example-news.com/talarico", final_url: "https://example-news.com/talarico", source_type: "news article" }));
  assert.equal(r.written, false, "news page skipped");
  assert.equal(store.data.size, 0);
});

await t("a clear read with no verbatim excerpt to cite is not written", async () => {
  const st = fakeStore();
  const cand = { politician_id: "john_cornyn", topic: "healthcare_costs", position: "support", confidence: 0.85, sources: [{ type: "official Senate issue page", excerpt: "", statements: [] }] };
  const raw = { url: "https://www.cornyn.senate.gov/x/", fetched_at: "2026-11-09T08:00:00.000Z", source_type: "official Senate issue page" };
  const r = await L.maybeWriteLockerItem(cand, raw, { store: st, gt, log: () => {} });
  assert.equal(r.written, false);
  assert.equal(st.data.size, 0);
});

await t("ground-truth file is untouched", () => {
  assert.equal(createHash("sha256").update(readFileSync(GT_PATH)).digest("hex"), gtHash);
});

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log("\nall evidence-locker citation checks passed");
