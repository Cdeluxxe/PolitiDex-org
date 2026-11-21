#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-drawer-all-evidence.mjs — every evidence item behind a stance, together
// ─────────────────────────────────────────────────────────────────────────────
// Thomas Massie × Farmers & Rural Communities is a promoted (pipeline) stance
// card whose own source is an official House page. The Evidence Locker also
// holds a strong video item on the same issue — his own words in a YouTube
// video, linked at the moment he says them (&t=938s). The drawer's Evidence
// section must list BOTH: the House page citation, and the video with its
// source label, its link and its timestamp (the "▶ Watch official video ·
// 15:38" form other video receipts use). A vote on the same issue is the formal
// record's and is never listed as evidence.
//
// Also checked: the stance signal no longer reads "Pipeline-sourced stance ·
// Pipeline-sourced"; the ✒️ stated-positions list reads in the topic tree's
// order with the tree's skin; and the Locker endpoint's ?pid= read lists only
// that politician's blobs.
//
//   node scripts/test-drawer-all-evidence.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };

const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "issue-map.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js", "issue-colors.js",
  "related-issues.js", "share-anywhere.js", "profile-locker.js", "stance-tree.js",
];
function boot() {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { win.__err = (win.__err || "") + `${f}: ${e.message}; `; }
  }
  win.PROFILES = win.CMP_DATA;
  return win;
}

const PID = "massie", KEY = "rural_ag";
const HOUSE = "https://massie.house.gov/news/documentsingle.aspx?DocumentID=395858";
const VIDEO = "https://www.youtube.com/watch?v=SouE1EHdh04&t=938s";
const VOTE = "https://clerk.house.gov/Votes/2026123";

const win = boot();
if (win.__err) failures.push(`boot: ${win.__err}`);
const CS = win.PDXConsistency, L = win.PDXProfileLocker, PS = win.PDXPipelineStances;
ok(CS && L && PS, "consistency.js, profile-locker.js or the pipeline stance seam did not load");
ok(win.CMP_DATA && win.CMP_DATA[PID], "fixture: Massie is not in the roster");
ok(!(win.ISSUE_STANCE_DATA[PID] || []).some((c) => c.issueKey === KEY), "fixture: Massie now has a curated rural_ag card; this test needs a pipeline one");

// The promoted stance card, exactly as GET /api/stated-positions serves it.
PS.ingest({ count: 1, cards: { [PID]: [{
  topic: "Farmers & Rural Communities", icon: "", pos: "support", issueKey: KEY, issueStance: "support",
  text: "“It’s up to Congress to change the law and deliver relief to American farmers and ranchers.”",
  source: { label: "Source: official House page", url: HOUSE },
  provenance: "pipeline",
  pipeline: { strength: "strong", confidence: 0.95, strong: 2, weak: 0, items: 2 },
}] } });
// The Locker items on the same politician + issue, as the endpoint serves them.
L.ingest({ items: { [PID]: [
  { headline: "Massie supports farmers (official press release)", issueKey: KEY, date: "Nov 15, 2026",
    source: { label: "Source: official House page", url: HOUSE },
    pipeline: { position: "support", confidence: 0.95, source_type: "official press release",
      excerpt: "It’s up to Congress to change the law and deliver relief to American farmers and ranchers." } },
  { headline: "Massie supports farmers (official YouTube video (own channel) — video post)", issueKey: KEY, date: "Nov 21, 2026",
    source: { label: "Source: official YouTube channel", url: VIDEO },
    pipeline: { position: "support", confidence: 1, source_type: "official YouTube video (own channel) — video post",
      excerpt: "The Senate needs to put the \"Prime Act\" in the Senate farm bill so it matches the House farm bill." } },
] } });
// A vote on the same issue, filed where curated spotlight items live.
(win.SPOTLIGHT_DATA[PID] = win.SPOTLIGHT_DATA[PID] || []).push({
  headline: "Massie voted for the farm bill", issueKey: KEY, category: "voting", impact: "neutral",
  facts: "Roll call vote on the farm bill.", source: { label: "Roll Call 123", url: VOTE },
});

// ── 1 · the drawer lists both, with the video's link and timestamp ─────────
const st = CS.statedStance(PID, KEY);
ok(st && st.side === "support" && st.provenance === "pipeline", "fixture: the promoted card is not the stance on file");
const h = CS.gapViewHtml(PID, KEY) || "";
const ev = (/<section class="pdxgap-ev"[\s\S]*?<\/section>/.exec(h) || [""])[0];
ok(!!ev, "the drawer printed no Evidence section");
const items = ev.split('<li class="pdxgap-ev-item"').slice(1);
ok(items.length >= 2, `the Evidence section lists ${items.length} item(s); the page citation and the video should both be there`);
ok(ev.indexOf(`href="${HOUSE.replace(/&/g, "&amp;")}"`) >= 0 || ev.indexOf(`href="${HOUSE}"`) >= 0, "the House page citation is missing from the Evidence section");
ok((ev.match(/DocumentID=395858/g) || []).length === 1, "the House page citation is listed more than once");
const vid = items.find((x) => /data-pdxgap-ev-video="1"/.test(x)) || "";
ok(!!vid, "the video item is not listed as a video");
ok(/Source: official YouTube channel/.test(vid), "the video item lacks its source label");
ok(/href="https:\/\/www\.youtube\.com\/watch\?v=SouE1EHdh04&amp;t=938s"/.test(vid), "the video link does not open at the moment (t=938s)");
ok(/▶ Watch official video · 15:38 ↗/.test(vid), "the video link does not print its timestamp in the shared “Watch … video · 15:38” form");
ok(/data-pdxgap-ev-ts="15:38"/.test(vid), "the video item does not carry its timestamp");
ok(/Prime Act/.test(vid), "the video item lacks the statement itself");

// ── 2 · no vote in the evidence section ────────────────────────────────────
ok(ev.indexOf("clerk.house.gov") < 0 && !/Roll Call 123|voted for the farm bill/.test(ev), "a vote was listed in the Evidence section");
const qp = (/<section class="pdxgap-qp"[\s\S]*?<!--\/pdxgap-qp-->/.exec(h) || [""])[0];
const qpEv = (/data-pdxgap-qp-g="evidence"[\s\S]*?<\/ul>/.exec(qp) || [""])[0];
ok(qpEv.indexOf("clerk.house.gov") < 0, "a vote was listed among the quick-proof evidence snippets");

// ── 2b · Quick proof: every non-vote item, the video with its link, no vote lines
{
  const qpItems = qpEv.split('<li class="pdxgap-qp-ev"').slice(1);
  ok(qpItems.length === items.length, `Quick proof lists ${qpItems.length} evidence item(s); the Evidence section lists ${items.length}`);
  ok(/href="https:\/\/www\.youtube\.com\/watch\?v=SouE1EHdh04&amp;t=938s"[^>]*>▶ Watch official video · 15:38 ↗/.test(qpEv), "Quick proof lacks the timestamped watch link");
  ok(!/data-pdxgap-qp-vote=|data-pdxgap-qp-g="votes"/.test(qp), "Quick proof still prints vote lines");
  ok(!/Roll Call 123|voted for the farm bill/.test(qp), "a vote reached Quick proof");
}

// ── 2c · the drawer's own per-politician read (pages without the full feed) ──
{
  const w2 = boot();
  const body = { count: 3, items: { [PID]: [
    { headline: "Massie supports “Farmers & Rural Communities” (official press release)", issueKey: KEY, date: "Nov 15, 2026",
      category: "statement", source: { label: "Source: official House page", url: HOUSE },
      pipeline: { position: "support", confidence: 0.95, strength: "strong", source_type: "official press release", excerpt: "Relief to farmers." } },
    { headline: "Massie supports “Farmers & Rural Communities” (official press release)", issueKey: KEY, date: "Nov 15, 2026",
      category: "statement", source: { label: "Source: official House page", url: "https://massie.house.gov/news/documentsingle.aspx?DocumentID=395740" },
      pipeline: { position: "support", confidence: 0.95, strength: "strong", source_type: "official press release", excerpt: "Same headline, other page." } },
    { headline: "Massie supports “Farmers & Rural Communities” (official YouTube video (own channel) — video post)", issueKey: KEY, date: "Nov 21, 2026",
      category: "statement", source: { label: "Source: official YouTube channel", url: VIDEO },
      pipeline: { position: "support", confidence: 1, strength: "strong", source_type: "official YouTube video (own channel) — video post",
        excerpt: "The Senate needs to put the \"Prime Act\" in the Senate farm bill." } },
  ] } };
  const asked = [];
  w2.fetch = async (u) => { asked.push(String(u)); return { ok: true, json: async () => body }; };
  w2.PDXPipelineStances.ingest({ count: 1, cards: { [PID]: [{
    topic: "Farmers & Rural Communities", icon: "", pos: "support", issueKey: KEY, issueStance: "support",
    text: "Relief to farmers.", source: { label: "Source: official House page", url: HOUSE }, provenance: "pipeline",
    pipeline: { strength: "strong", confidence: 0.95, strong: 3, weak: 0, items: 3 } }] } });
  const C2 = w2.PDXConsistency;
  ok(typeof C2.gapLockerFor === "function", "consistency.js publishes no per-politician Locker read for the drawer");
  const before = (/<section class="pdxgap-ev"[\s\S]*?<\/section>/.exec(C2.gapViewHtml(PID, KEY) || "") || [""])[0];
  ok(!/youtube\.com/.test(before), "fixture: the video was on the page before the drawer's read");
  if (typeof C2.gapLockerFor === "function") await C2.gapLockerFor(PID);
  ok(asked.some((u) => /\/api\/evidence-locker\/items\?pid=massie\b/.test(u)), `the drawer did not ask for its politician's items (${asked.join(", ")})`);
  const h2 = C2.gapViewHtml(PID, KEY) || "";
  const ev2 = (/<section class="pdxgap-ev"[\s\S]*?<\/section>/.exec(h2) || [""])[0];
  ok(/▶ Watch official video · 15:38 ↗/.test(ev2), "after the drawer's read the video is not in the Evidence section");
  ok(/DocumentID=395740/.test(ev2), "an item sharing another item's headline was dropped from the Evidence section");
  ok((ev2.match(/DocumentID=395858/g) || []).length === 1, "the card's citation is listed twice after the drawer's read");
  const qp2 = (/<section class="pdxgap-qp"[\s\S]*?<!--\/pdxgap-qp-->/.exec(h2) || [""])[0];
  ok(/▶ Watch official video · 15:38 ↗/.test(qp2), "after the drawer's read the video is not in Quick proof");
}

// ── 3 · one label, not "Pipeline-sourced stance · Pipeline-sourced" ────────
const plain = (x) => String(x || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
ok(!/Pipeline-sourced stance · Pipeline-sourced/.test(plain(h)), "the drawer still repeats “Pipeline-sourced stance · Pipeline-sourced”");
ok(/Pipeline-sourced stance/.test(plain(h)), "the drawer lost the pipeline stance label");
ok(st && st.note === "Source: official House page", `the store note is “${st && st.note}”, not just its source`);
const WA = win.PDXWordAction;
const list = WA && typeof WA.sectionHtml === "function" ? (WA.sectionHtml(PID, win.CMP_DATA[PID]) || "") : "";
const stated = (/<ul class="pdxwa-stated-list">[\s\S]*?<\/ul>/.exec(list) || [""])[0];
ok(!/Pipeline-sourced stance · Pipeline-sourced/.test(plain(stated)), "the stated-positions list still repeats the pipeline label");
ok(!/Source: Source:/.test(plain(stated)) && !/Source: Source:/.test(plain(h)), "a source label prints “Source:” twice");

// ── 4 · the stated list follows the tree's order and colours ───────────────
const T = win.PDXStanceTree;
ok(T && typeof T.placement === "function", "stance-tree.js exposes no placement");
if (T && stated) {
  const place = T.placement(PID);
  const keys = [...stated.matchAll(/<li class="pdxwa-stated-row" data-pdxwa-stated="([^"]+)"/g)].map((m) => m[1]);
  ok(keys.length > 1, "fixture: Massie's stated list has fewer than two rows");
  const ranks = keys.map((k) => (place[k] ? place[k].at : Infinity));
  ok(ranks.every((r, i) => i === 0 || ranks[i - 1] <= r), `the stated list is not in the tree's order (${keys.join(", ")})`);
  for (const k of keys) {
    const p = place[k];
    if (!p || !p.skin || !p.skin.style) continue;
    const row = (new RegExp(`<li class="pdxwa-stated-row" data-pdxwa-stated="${k}"[^>]*>`).exec(stated) || [""])[0];
    ok(row.indexOf(p.skin.style) >= 0, `${k}: the stated row does not wear its tree leaf's colour`);
    ok(p.skin.on ? /data-ic="on"/.test(row) : !/data-ic="on"/.test(row), `${k}: the stated row's topic treatment differs from its leaf's`);
  }
}

// ── 5 · the Locker endpoint's per-politician read ──────────────────────────
{
  const fn = await import(pathToFileURL(join(ROOT, "netlify/functions/evidence-locker-items.mts")).href);
  const blobs = {
    "massie/rural_ag/a.json": { politician_id: "massie", topic: "rural_ag", position: "support", confidence: 0.95, link: HOUSE, excerpt: "Relief to farmers.", attribution: "Source: official House page", source_type: "official press release", date: "2026-11-15" },
    "massie/rural_ag/b.json": { politician_id: "massie", topic: "rural_ag", position: "support", confidence: 1, link: VIDEO, excerpt: "Put the Prime Act in the Senate farm bill.", attribution: "Source: official YouTube channel", source_type: "official YouTube video (own channel) — video post", date: "2026-11-21" },
    "massie_sd/rural_ag/c.json": { politician_id: "massie_sd", topic: "rural_ag", position: "support", confidence: 0.9, link: "https://example.org/other", excerpt: "Someone else.", attribution: "Source: x", source_type: "campaign page", date: "2026-11-01" },
  };
  const prefixes = [];
  const store = {
    list: async (o = {}) => { prefixes.push(o.prefix ?? null); return { blobs: Object.keys(blobs).filter((k) => !o.prefix || k.startsWith(o.prefix)).map((key) => ({ key })) }; },
    get: async (k) => blobs[k] || null,
  };
  const one = await fn.listLockerEntries(store, { items: [] }, { pids: ["massie"] });
  ok(prefixes[0] === "massie/", "the per-politician read did not list by the politician's prefix");
  ok(Object.keys(one.items).join() === "massie" && one.count === 2, `the per-politician read served ${JSON.stringify(Object.keys(one.items))} / ${one.count}`);
  ok(one.items.massie.some((e) => e.source.url === VIDEO), "the per-politician read dropped the video item");
  const all = await fn.listLockerEntries(store, { items: [] });
  ok(all.count === 3, "the full read changed");
  ok(fn.pidsFromUrl("https://x/api/evidence-locker/items?pid=massie,thomas_massie,../x,massie").join() === "massie,thomas_massie", "the pid parameter is not validated and de-duplicated");
  ok(fn.pidsFromUrl("https://x/api/evidence-locker/items").length === 0, "no pid should mean the full read");
}

if (failures.length) {
  console.error(`✗ drawer evidence: ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.error("  · " + f);
  process.exit(1);
}
console.log(`✓ drawer evidence: every Locker item behind the stance, video with link and timestamp, no votes — ${passed} checks passed`);
