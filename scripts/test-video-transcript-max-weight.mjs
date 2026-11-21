#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-video-transcript-max-weight.mjs — R16: the politician's own words on
// video are the strongest evidence of what they said.
//
//   · A Massie video transcript with a clear "I support / I oppose" statement
//     logs confidence 1.0 (WEIGHTS.videoTranscriptConfidence, the maximum).
//   · The same words on a campaign page, a press release or a Congressional
//     Record floor speech keep their current weight (no video boost).
//   · Contested, implication-only and title-only video reads are not boosted.
//   · The Talarico ground-truth match is unchanged.
//   · No Locker or stance-store write is added: the video run writes the same
//     items it wrote before; no new store / database imports.
//   · No migration and no service-worker change.
//
//   node scripts/test-video-transcript-max-weight.mjs
// ═══════════════════════════════════════════════════════════════════════════
import path from "node:path";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const S = await import("../netlify/lib/stance-score-core.mjs");
const vt = await import("../netlify/lib/video-transcripts.mjs");
const worker = await import(pathToFileURL(path.join(root, "netlify/functions/video-transcribe.mts")).href);
const gt = JSON.parse(readFileSync(path.join(root, "db/stance-ground-truth-talarico-cost-of-living.json"), "utf8"));

let passed = 0, failures = 0;
async function t(name, f) {
  try { await f(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failures++; console.log(`  ✗ ${name}\n     ${e?.stack?.split("\n").slice(0, 3).join("\n     ") || e}`); }
}
const quiet = async (f) => {
  const orig = console.log; const lines = [];
  console.log = (...a) => lines.push(a.join(" "));
  try { return { value: await f(), lines }; } finally { console.log = orig; }
};
function memStore() {
  const data = new Map(); let n = 0; const etags = new Map(); const writes = [];
  return {
    data, writes,
    async get(k) { return data.has(k) ? JSON.parse(JSON.stringify(data.get(k))) : null; },
    async getWithMetadata(k) { return data.has(k) ? { data: JSON.parse(JSON.stringify(data.get(k))), etag: etags.get(k) } : null; },
    async setJSON(k, v, o = {}) {
      if (o.onlyIfNew && data.has(k)) return { modified: false };
      if (o.onlyIfMatch && etags.get(k) !== o.onlyIfMatch) return { modified: false };
      writes.push(k); data.set(k, JSON.parse(JSON.stringify(v))); etags.set(k, `e${++n}`); return { modified: true };
    },
    async delete(k) { data.delete(k); etags.delete(k); },
    async list({ prefix = "" } = {}) { return { blobs: [...data.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
  };
}

const VID = "MassieVid01";
const SRC = {
  politician_id: "massie", topic: "healthcare_costs", source_type: "official YouTube video (own channel) — video post",
  source_class: "youtube_video", source_id: "fresh-vs-test000001", url: `https://www.youtube.com/watch?v=${VID}`,
};
const own = (...texts) => ({ status: "ok", segments: texts.map((text, i) => ({ t: 10 + i * 12, text, own: true })) });
const videoRec = (doc, src = SRC, title = "") => vt.buildVideoRecord({ src, videoId: VID, title, doc, fetchedAt: "2026-11-21T00:00:00.000Z" });
/** The same words as a plain (non-video) page of another source type. */
const asPage = (rec, source_type, url) => {
  const { type, segments, video_id, link, transcript, ...rest } = rec;
  return { ...rest, source_type, url, final_url: url, content_type: "text/html; charset=UTF-8" };
};

const SUPPORT = "I support lowering prescription drug costs for every family.";
const OPPOSE = "I oppose sending more money to endless wars and I oppose a bigger defense budget.";

console.log("R16 — own words on video read at the maximum confidence:");

await t("the maximum is 1.0 and sits above the cap every other source keeps", () => {
  assert.equal(S.WEIGHTS.videoTranscriptConfidence, 1.0);
  assert.equal(S.WEIGHTS.maxConfidence, 0.95, "the general cap is unchanged");
});

await t("a Massie video transcript with a clear “I support …” statement scores 1.0", () => {
  const rec = videoRec(own("Thanks for tuning in.", SUPPORT));
  assert.equal(S.isVideoTranscript(rec), true);
  const c = S.scoreRawRecord(rec);
  assert.equal(c.position, "support");
  assert.equal(c.confidence, 1);
  assert.match(c.confidence_reason, /own words on video read at the maximum confidence \(R16\)/);
});

await t("a Massie video transcript with a clear “I oppose …” statement scores 1.0 (cross-topic too)", () => {
  const rec = videoRec(own(OPPOSE), { ...SRC, topic: "cost_living" });
  const c = S.scoreRawRecord(rec, "strong_defense");
  assert.equal(c.position, "oppose");
  assert.equal(c.confidence, 1);
});

await t("the video run logs confidence 1 for the Massie candidate", async () => {
  const ts = memStore(); const logs = [];
  await vt.enqueueTranscript(ts, SRC, { videoId: VID, title: "Massie on drug prices", name: "Thomas Massie" });
  const gen = async () => ({ segments: [{ start: 0, text: "Welcome back.", speaker_is_politician: false }, { start: 30, text: SUPPORT, speaker_is_politician: true }] });
  await quiet(() => worker.transcribeRun({ store: ts, rawStore: memStore(), lockerStore: memStore(), generate: gen, log: (l) => logs.push(l), wake: async () => {} }));
  const line = logs.find((l) => l.startsWith("stance-score: candidate ") && l.includes('"politician_id":"massie"'));
  assert.ok(line, "candidate logged");
  const c = JSON.parse(line.slice("stance-score: candidate ".length));
  assert.equal(c.topic, "healthcare_costs"); assert.equal(c.position, "support"); assert.equal(c.confidence, 1);
  assert.ok(logs.some((l) => /massie\|healthcare_costs\|fresh-vs-test000001 → CLEAR POSITION \(support, 1\)/.test(l)));
});

await t("the same statement on a campaign page, a press release or a floor speech gets no video boost", () => {
  const rec = videoRec(own(SUPPORT));
  const video = S.scoreRawRecord(rec);
  const kinds = [
    ["campaign issue page", "https://massieforcongress.com/issues/health"],
    ["official press release", "https://massie.house.gov/news/documentsingle.aspx?DocumentID=1"],
    ["official floor speech (Congressional Record)", "https://www.govinfo.gov/content/pkg/CREC-2026-11-20/html/CREC-2026-11-20-pt1-PgH100-1.htm"],
  ];
  for (const [type, url] of kinds) {
    const page = asPage(rec, type, url);
    assert.equal(S.isVideoTranscript(page), false, type);
    const c = S.scoreRawRecord(page);
    assert.equal(c.position, "support", type);
    assert.ok(c.confidence < video.confidence && c.confidence <= S.WEIGHTS.maxConfidence, `${type}: ${c.confidence}`);
    assert.doesNotMatch(c.confidence_reason, /R16/, type);
  }
  // The campaign page reads exactly as before: R8 stated-position floor.
  assert.equal(S.scoreRawRecord(asPage(rec, "campaign issue page", kinds[0][1])).confidence, S.WEIGHTS.statedPositionConfidence);
});

await t("a video with only its description (no transcript) is not boosted", () => {
  const rec = { ...asPage(videoRec(own(SUPPORT)), "official YouTube video (own channel) — video post", `https://www.youtube.com/watch?v=${VID}`), type: "video" };
  assert.equal(S.isVideoTranscript(rec), false);
  assert.ok(S.scoreRawRecord(rec).confidence <= S.WEIGHTS.maxConfidence);
});

await t("a contested video read (both sides, no reversal) is not boosted", () => {
  const c = S.scoreRawRecord(videoRec(own("I oppose a bigger defense budget.", OPPOSE, "I support a stronger military and a bigger defense budget."), { ...SRC, topic: "strong_defense" }));
  assert.equal(c.position, "oppose");
  assert.equal(c.confidence, 0.6, "R5 outlier penalty, as on any other source");
  assert.doesNotMatch(c.confidence_reason, /R16/);
});

await t("implication-only, mention-only and title-only video reads are not boosted", () => {
  const mention = S.scoreRawRecord(videoRec(own("Health insurance premiums came up at the town hall.")));
  assert.doesNotMatch(mention.confidence_reason, /R16/);
  assert.ok(mention.confidence < 1);
  // A stance verb only in the title (R14) is not speech.
  const titled = S.scoreRawRecord(videoRec(own("Health insurance premiums came up at the town hall."), SRC, "Massie supports lowering prescription drug costs"));
  assert.doesNotMatch(titled.confidence_reason, /R16/);
  assert.ok(titled.confidence <= S.WEIGHTS.maxConfidence);
});

await t("the Talarico ground-truth match is unchanged (support, 0.85, Δ 0)", () => {
  const src = readFileSync(path.join(root, "scripts/test-stance-score.mjs"), "utf8");
  const page = src.match(/const PAGE = `([\s\S]*?)`;/)[1];
  const raw = { url: "https://jamestalarico.com/issue/taxes-cost-of-living/", final_url: "https://jamestalarico.com/issue/taxes-cost-of-living/",
    fetched_at: "2026-11-07T08:00:00.000Z", source_type: "campaign issue page", politician_id: "james_talarico", topic: "cost_living",
    http_status: 200, content_type: "text/html; charset=UTF-8", body_chars: page.length, body: page };
  const { candidate, comparison } = S.scoreAgainstGroundTruth(raw, gt, { log: () => {} });
  assert.equal(candidate.position, gt.position);
  assert.equal(comparison.positionMatch, true);
  assert.equal(candidate.confidence, 0.85);
  assert.equal(comparison.delta, 0);
  assert.doesNotMatch(candidate.confidence_reason, /R16/);
});

await t("no Locker or stance-store write is added: the video run writes the same items, now carrying 1.0", async () => {
  const rec = videoRec(own(SUPPORT));
  const ls = memStore();
  const r = await vt.scoreIntoLocker(Object.freeze({ ...rec, key: "k" }), { lockerStore: ls, log: () => {} });
  assert.equal(r.writes.length, 1, "one item, as before the boost (a clear 0.8 read was already strong)");
  assert.equal(ls.writes.length, 1);
  const item = ls.data.get(r.writes[0].key);
  assert.equal(item.strength, "strong"); assert.equal(item.confidence, 1);
  // The same words on a campaign page write the same number of items.
  const ps = memStore();
  const p = await vt.scoreIntoLocker(asPage(rec, "campaign issue page", "https://massieforcongress.com/issues/health"), { lockerStore: ps, log: () => {} });
  assert.equal(p.writes.length, r.writes.length);
  // The scorer and the video path reach no store or database of their own.
  for (const f of ["netlify/lib/stance-score-core.mjs", "netlify/lib/video-transcripts.mjs"]) {
    const imports = [...readFileSync(path.join(root, f), "utf8").matchAll(/^import .* from "([^"]+)"/gm)].map((m) => m[1]);
    for (const i of imports) assert.doesNotMatch(i, /stated-positions|db\/|drizzle|@netlify\/blobs/, `${f} imports ${i}`);
  }
});

await t("no migration and no service-worker change", () => {
  let changed = "";
  try { changed = execFileSync("git", ["status", "--porcelain", "--", "netlify/database/migrations", "db/migrations", "migrations", "sw.js", "public/sw.js"], { cwd: root, encoding: "utf8" }); }
  catch { return; } // not a git checkout: nothing to compare
  assert.equal(changed.trim(), "", changed);
});

console.log(`\n${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
