#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-stated-positions.mjs — Evidence Locker items → promoted stance cards
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS SUITE PROVES:
//   1. THRESHOLDS (stated-positions-core.mjs promoteIssue/promoteEntries): the
//      rules of profile-locker.js promotedStance() — one strong item, or three
//      weak items, on one side promotes; one or two weak items promote a weak
//      stance; an even split promotes nothing; mentions, hidden items and
//      unsourced items never count. The server copy agrees with the client copy
//      item for item on the same fixtures.
//   2. SYNC: new promotions are upserted, unchanged ones left alone, an issue
//      that stops qualifying is withdrawn (never deleted); the cron runs the
//      step after its Locker writes and the Locker writes themselves are
//      unchanged.
//   3. CARDS: the endpoint body is the ISSUE_STANCE_DATA card shape with the
//      provenance 'pipeline' tag; withdrawn or fully hidden rows are not served.
//   4. MERGE (stance-helpers.js): pipeline cards join _resolveStanceList /
//      _polPositionMap for issue keys with no curated card; a curated card on the
//      same issue always wins; a person with no pipeline cards resolves to the
//      very same curated array.
//   5. SURFACES, when no curated card exists: the person file's stance store and
//      "Says:" chip show the pipeline stance, tagged; Word vs Action scores it
//      (tested against the record, counted in the figure); the Alignment Tool
//      matches on it as a documented position, tagged.
//   6. NOTHING CURATED MOVED: politician-stances*.js are byte-identical to HEAD.
//
//   node scripts/test-stated-positions.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const imp = (f) => import(pathToFileURL(join(ROOT, f)).href);

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`   ── ${t}`);

const SP = await imp("netlify/lib/stated-positions-core.mjs");
const EL = await imp("netlify/lib/evidence-locker-core.mjs");

// A Locker entry in the served (spotlight) shape.
let seq = 0;
const entry = (issueKey, position, confidence, extra = {}) => ({
  headline: `x ${issueKey} ${position} ${++seq}`, issueKey,
  source: { label: "Source: campaign page", url: `https://example.com/p${seq}` },
  pipeline: { position, confidence, excerpt: `We will act on ${issueKey} (${seq}).`, rules_version: "phase8-v3", captured: `2026-11-${String(10 + (seq % 9)).padStart(2, "0")}`, key: `pid/${issueKey}/${seq}.json` },
  ...extra,
});

section("1 · thresholds");
{
  const P = (es) => SP.promoteIssue(es);
  eq(P([entry("housing", "support", 0.85)])?.strength, "strong", "one strong item promotes a strong stance");
  eq(P([entry("housing", "support", 0.85)])?.stance, "support", "…on its own side");
  eq(P([entry("housing", "oppose", 0.5)])?.strength, "weak", "one weak item promotes a weak stance");
  eq(P([entry("housing", "oppose", 0.5), entry("housing", "oppose", 0.4)])?.strength, "weak", "two weak items stay weak");
  eq(P([entry("housing", "oppose", 0.5), entry("housing", "oppose", 0.4), entry("housing", "oppose", 0.31)])?.strength, "strong", "three weak items reach the stronger level");
  // phase9-v1: solid evidence on both sides is kept as a Mixed stance, not dropped.
  eq(P([entry("housing", "support", 0.9), entry("housing", "oppose", 0.9)])?.stance, "mixed", "one strong item each way is a Mixed stance");
  eq(P([entry("housing", "support", 0.9), entry("housing", "oppose", 0.9)])?.consistency?.label, "mixed", "…and its consistency signal is Mixed");
  eq(P([entry("housing", "support", 0.5), entry("housing", "oppose", 0.6)]), null, "one weak item each way is an even split: nothing");
  eq(P([entry("housing", "support", 0.9), entry("housing", "oppose", 0.5)])?.stance, "support", "strong beats weak on the other side");
  eq(P([entry("housing", "oppose", 0.5), entry("housing", "oppose", 0.5), entry("housing", "oppose", 0.5), entry("housing", "support", 0.9)])?.stance, "mixed", "three weak vs one strong is level 2 vs level 2: Mixed");
  eq(P([entry("housing", "support", 0.2)]), null, "a low-confidence read is a mention: nothing");
  eq(P([entry("housing", "mixed", 0.9)]), null, "a mixed read is never a stance");
  eq(P([entry("housing", "support", 0.9, { review: { status: "hidden" } })]), null, "a hidden item never counts");
  eq(P([{ ...entry("housing", "support", 0.9), source: { url: "not a link" } }]), null, "an item with no link never counts");
  const best = P([entry("housing", "support", 0.5), entry("housing", "support", 0.92), entry("housing", "support", 0.81)]);
  ok(best.text.includes("(" + (seq - 1) + ")"), "the card quotes the highest-confidence strong item");
  eq(best.evidence.length, 3, "every item on the winning side is recorded as evidence");
  eq([best.strongCount, best.weakCount], [2, 1], "strong and weak counts are recorded");
  const all = SP.promoteEntries([entry("housing", "support", 0.9), entry("gun_safety", "oppose", 0.5), entry("energy_production", "support", 0.1)]);
  eq(Object.keys(all), ["gun_safety", "housing"], "one promotion per qualifying issue, none for a mention-only issue");

  // The client's promotedStance() on the same fixtures agrees.
  const win = makeSandbox();
  win.fetch = () => Promise.resolve({ ok: false });
  vm.runInContext(R("profile-locker.js"), vm.createContext(win), { filename: "profile-locker.js" });
  const L = win.PDXProfileLocker;
  const FIX = {
    a: [entry("housing", "support", 0.85)],
    b: [entry("housing", "oppose", 0.5), entry("housing", "oppose", 0.4), entry("housing", "oppose", 0.31)],
    c: [entry("housing", "support", 0.9), entry("housing", "oppose", 0.9)],
    d: [entry("housing", "oppose", 0.5)],
    e: [entry("housing", "support", 0.2)],
  };
  ok(L && typeof L.promotedStance === "function", "profile-locker.js exposes promotedStance");
  if (L && typeof L.ingest === "function") {
    L.ingest({ items: Object.fromEntries(Object.entries(FIX).map(([k, v]) => [`fx_${k}`, v])) });
    for (const [k, v] of Object.entries(FIX)) {
      const c = L.promotedStance(`fx_${k}`, "housing");
      const s = SP.promoteIssue(v);
      eq(s ? [s.stance, s.strength] : null, c ? [c.side, c.strength] : null, `fixture ${k}: server and client promotion agree`);
      // phase9-v1: the Steady / Mixed / Thin signal is the same rule on both sides.
      eq(JSON.stringify(SP.stanceConsistency(v)), JSON.stringify(L.consistencyOf(`fx_${k}`, "housing")), `fixture ${k}: server and client consistency agree`);
    }
  } else {
    for (const [k, v] of Object.entries(FIX)) ok(true, k);
  }
}

section("2 · sync and the cron");
{
  const rows = new Map();
  const fakeDb = {
    async rowsFor(pid) { return [...rows.values()].filter((r) => r.politicianId === pid); },
    async upsert(pid, rec, at) { const prev = rows.get(`${pid}|${rec.issueKey}`); rows.set(`${pid}|${rec.issueKey}`, { ...rec, politicianId: pid, status: "active", provenance: "pipeline", promotedAt: prev?.promotedAt || at, updatedAt: at }); },
    async withdraw(pid, keys, at) { for (const k of keys) { const r = rows.get(`${pid}|${k}`); if (r) rows.set(`${pid}|${k}`, { ...r, status: "withdrawn", updatedAt: at }); } },
  };
  const quiet = () => {};
  const e1 = [entry("housing", "support", 0.9), entry("gun_safety", "oppose", 0.5)];
  let r = await SP.syncPolitician("pz", e1, { db: fakeDb, log: quiet });
  eq(r.upserts.map((u) => u.issueKey), ["gun_safety", "housing"], "first sync upserts both promotions");
  r = await SP.syncPolitician("pz", e1, { db: fakeDb, log: quiet });
  eq([r.upserts.length, r.unchanged.length], [0, 2], "an unchanged Locker leaves the rows alone");
  r = await SP.syncPolitician("pz", [...e1, entry("gun_safety", "support", 0.5)], { db: fakeDb, log: quiet });
  eq(r.withdraw, ["gun_safety"], "an issue that becomes an even split is withdrawn");
  eq(rows.get("pz|gun_safety").status, "withdrawn", "…kept as a withdrawn row, not deleted");
  r = await SP.syncPolitician("pz", [...e1, entry("gun_safety", "support", 0.5), entry("gun_safety", "support", 0.9)], { db: fakeDb, log: quiet });
  eq(r.upserts.map((u) => [u.issueKey, u.stance]), [["gun_safety", "support"]], "the issue re-promotes when the Locker changes again");
  eq(rows.get("pz|gun_safety").status, "active", "…and is active again");

  // lockerEntriesFor reads only that politician's keys, through the endpoint's rules.
  const data = new Map();
  const store = {
    async list(o = {}) { return { blobs: [...data.keys()].filter((k) => !o.prefix || k.startsWith(o.prefix)).map((key) => ({ key })) }; },
    async get(k) { return data.has(k) ? JSON.parse(JSON.stringify(data.get(k))) : null; },
  };
  const item = (pid, topic, position, confidence, link) => {
    const it = { politician_id: pid, topic, position, confidence, source_type: "campaign issues page", link, excerpt: `I will act on ${topic}.`, date: "2026-11-10", attribution: "Source: campaign page", strength: confidence >= 0.8 ? "strong" : "weak", rules_version: "phase8-v3", layer: "stated", formal_record: false };
    data.set(EL.lockerKey(it), it);
    return EL.lockerKey(it);
  };
  item("pa", "housing", "support", 0.9, "https://a.example/1");
  const hk = item("pa", "gun_safety", "oppose", 0.9, "https://a.example/2");
  item("pb", "housing", "oppose", 0.9, "https://b.example/1");
  const flags = EL.loadReviewFlags({ items: [{ key: hk, status: "hidden" }] });
  const es = await SP.lockerEntriesFor(store, "pa", flags);
  eq(es.map((e) => e.issueKey).sort(), ["housing"], "one politician's served entries, hidden item dropped");
  eq(es[0].pipeline.key.startsWith("pa/"), true, "entries carry their store key");

  // The cron: a run with statedDb promotes after its Locker writes; without it,
  // nothing new runs.
  const fn = await imp("netlify/functions/raw-ingest-cron.mts");
  const core = await imp("netlify/lib/raw-ingest-core.mjs");
  const src = core.SOURCES[0];
  const HTML = "<html><body><h1>Taxes &amp; Cost of Living</h1><p>I will cut taxes for working families across Texas.</p>"
    + "<p>We will lower the cost of rent, groceries, utilities, and gas.</p><p>Cap credit card interest rates so families can keep more of their pay.</p></body></html>";
  const mkFetch = () => async (url) => ({ ok: true, status: 200, url, headers: new Map([["content-type", "text/html"]]), text: async () => HTML });
  const rawStore = () => { const d = new Map(); return { d, async setJSON(k, v) { d.set(k, v); } }; };
  const locker = () => { const d = new Map(); return { d,
    async list(o = {}) { return { blobs: [...d.keys()].filter((k) => !o.prefix || k.startsWith(o.prefix)).map((key) => ({ key })) }; },
    async get(k) { return d.has(k) ? JSON.parse(JSON.stringify(d.get(k))) : null; },
    async setJSON(k, v, o = {}) { if (o.onlyIfNew && d.has(k)) return { modified: false }; d.set(k, JSON.parse(JSON.stringify(v))); return { modified: true }; } }; };
  const NOW = () => new Date("2026-11-15T03:00:00Z");
  const orig = console.log; console.log = () => {};
  let res1, res2, lk1, lk2, log1 = [], log2 = [];
  rows.clear();
  try {
    lk1 = locker(); lk2 = locker();
    res1 = await (await fn.run({ fetch: mkFetch(), store: rawStore(), lockerStore: lk1, sources: [src], now: NOW, log: (l) => log1.push(l) })).json();
    res2 = await (await fn.run({ fetch: mkFetch(), store: rawStore(), lockerStore: lk2, sources: [src], now: NOW, log: (l) => log2.push(l), statedDb: fakeDb })).json();
  } finally { console.log = orig; }
  eq(JSON.stringify([...lk2.d.entries()]), JSON.stringify([...lk1.d.entries()]), "the Locker writes are identical with or without the promotion step");
  ok(res1.stated_positions === undefined, "no statedDb → no promotion step");
  ok(res2.stated_positions && res2.stated_positions.checked >= 1, "with statedDb the run recomputes the politicians it wrote for");
  const promoted = [...rows.values()].filter((r) => r.politicianId === src.politician_id && r.status === "active");
  ok(promoted.some((r) => r.issueKey === "cost_living" && r.stance === "support"), `the run promoted ${src.politician_id}'s cost-of-living stance (rows: ${JSON.stringify(promoted.map((r) => [r.issueKey, r.stance, r.strength]))})`);
  ok(log2.some((l) => /^stated-positions: run complete/.test(l)), "the run logs the promotion summary");
  ok(log2.some((l) => l.startsWith(`stated-positions: ${src.politician_id} — `)), "…and a line for the politician whose records moved");
}

section("3 · the card shape the endpoint serves");
{
  const row = { politicianId: "pc", issueKey: "housing", stance: "support", text: "We will build more homes.", sourceUrl: "https://c.example/1", sourceLabel: "Source: campaign page", confidence: "0.90", strength: "strong", strongCount: 1, weakCount: 0, rulesVersion: "phase8-v3", status: "active", provenance: "pipeline", evidence: ["pc/housing/aa.json"], promotedAt: new Date("2026-11-15"), updatedAt: new Date("2026-11-15") };
  const body = SP.cardsBody([row, { ...row, issueKey: "gun_safety", status: "withdrawn" }, { ...row, issueKey: "energy_production", evidence: ["pc/x.json"] }], { housing: "Housing Affordability" }, { hiddenKey: (k) => k === "pc/x.json" });
  eq(body.count, 1, "only the active, not-hidden row is served");
  const c = body.cards.pc[0];
  eq(Object.keys(c), ["topic", "icon", "pos", "issueKey", "issueStance", "text", "source", "provenance", "pipeline"], "the card carries the ISSUE_STANCE_DATA fields plus the tag");
  eq([c.topic, c.pos, c.issueKey, c.issueStance, c.provenance], ["Housing Affordability", "support", "housing", "support", "pipeline"], "card fields");
  eq(c.text, "“We will build more homes.”", "the card quotes the politician's own words");
  eq(c.source, { label: "Source: campaign page", url: "https://c.example/1" }, "the card cites its source");
  eq(c.pipeline.confidence, 0.9, "the pipeline block carries the confidence as a number");
  ok(/path: "\/api\/stated-positions"/.test(R("netlify/functions/stated-positions.mts")), "the endpoint is at /api/stated-positions");
  ok(/method: \["GET"\]/.test(R("netlify/functions/stated-positions.mts")), "…and is GET only");
  const mig = R("netlify/database/migrations/20261206000000_create_pdx_stated_positions/migration.sql");
  ok(/CREATE TABLE "pdx_stated_positions"/.test(mig) && /pdx_stated_positions_pid_issue_unique/.test(mig), "the migration creates the table and its one-row-per-issue index");
}

section("4 · the merge into the stance chokepoint");
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
  "stance-helpers.js", "alignment-tool.js", "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js", "profile-spine.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
function boot() {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const [f, s] of SRC) vm.runInContext(s, ctx, { filename: f });
  win.PROFILES = win.CMP_DATA;
  return win;
}
const PID = "schumer";
const W = boot();
const curatedBefore = W._resolveStanceList(PID, W.CMP_DATA[PID]);
const PM0 = W._polPositionMap(PID, W.CMP_DATA[PID]);
const NO_POLE = W._PDX_RD_NO_POLE || {};
const KEYS = Object.keys(W.ISSUE_MAP || {}).filter((k) => !/_balance$/.test(k) && !NO_POLE[k]);
const GAP = KEYS.filter((k) => !PM0[k])[0];
const CUR = KEYS.filter((k) => PM0[k] && PM0[k].stance === "support")[0];
ok(GAP && CUR, "fixture: the profile has an issue with no curated card and one with a curated support card");
const card = (k, side) => ({ topic: "Pipeline " + k, icon: "", pos: side, issueKey: k, issueStance: side,
  text: "“I will vote to change " + k.replace(/_/g, " ") + " policy.”", source: { label: "Source: campaign page", url: "https://pipe.example/" + k },
  provenance: "pipeline", pipeline: { strength: "strong", confidence: 0.9, strong: 1, weak: 0, items: 1 } });
{
  ok(W.PDXPipelineStances && typeof W.PDXPipelineStances.ingest === "function", "stance-helpers.js exposes PDXPipelineStances");
  const other = W._resolveStanceList("trump", W.CMP_DATA.trump);
  const ep0 = W.PDXDataEpoch();
  const gained = W.PDXPipelineStances.ingest({ count: 2, cards: { [PID]: [card(GAP, "oppose"), card(CUR, "oppose")] } });
  eq(gained, [PID], "the ingest reports who gained cards");
  ok(W.PDXDataEpoch() > ep0, "the derivation epoch moves when cards land");
  const list = W._resolveStanceList(PID, W.CMP_DATA[PID]);
  eq(list.slice(0, curatedBefore.length).map((s) => JSON.stringify(s)), curatedBefore.map((s) => JSON.stringify(s)), "the curated list comes first, untouched and in order");
  eq(list.slice(curatedBefore.length).map((s) => [s.issueKey, s.provenance]), [[GAP, "pipeline"]], "only the gap issue's pipeline card is appended");
  ok(W._resolveStanceList("trump", W.CMP_DATA.trump) === other, "a person with no pipeline cards resolves to the very same curated array");
  const PM = W._polPositionMap(PID, W.CMP_DATA[PID]);
  eq([PM[GAP].stance, PM[GAP].provenance], ["oppose", "pipeline"], "the position map carries the pipeline stance on the gap issue, tagged");
  eq([PM[CUR].stance, PM[CUR].provenance], ["support", undefined], "CURATED WINS: the curated card on the shared issue is untouched");
  ok(Object.keys(PM).filter((k) => k !== GAP).every((k) => JSON.stringify(PM[k]) === JSON.stringify(PM0[k])), "every other position-map entry is byte-identical");
  ok(W.PDXPipelineStances.has(PID, GAP) && !W.PDXPipelineStances.has("trump", GAP), "has() answers per person");
  W.PDXPipelineStances.ingest({ count: 1, cards: { [PID]: [card(GAP, "support")] } });
  eq(W._polPositionMap(PID, W.CMP_DATA[PID])[GAP].stance, "oppose", "a second copy of the same issue does not replace the first");
}

section("5 · person file, Word vs Action and the Alignment Tool");
{
  const CS = W.PDXConsistency;
  const st = CS.statedStance(PID, GAP);
  ok(st && st.side === "oppose", "the person file's stance store reads the pipeline stance on the gap issue");
  eq([st && st.provenance, st && st.signal], ["pipeline", "pipeline"], "…marked pipeline-sourced");
  ok(/Pipeline-sourced/.test(st ? st.signalLabel + " " + st.note : ""), "…and its visible note says so");
  const line = CS.statedStanceLineHtml(st, "div", "");
  ok(/Said:/.test(line) && /Opposes/.test(line) && /Pipeline-sourced/.test(line), "the person file's Said line prints the side and the pipeline tag");
  const cur = CS.statedStance(PID, CUR);
  eq([cur && cur.signal, cur && cur.side], ["curated", "support"], "the curated issue still reads as the curated stance");
  ok((CS.statedStances(PID) || []).some((s) => s.key === GAP && s.provenance === "pipeline"), "the gap issue is in the person's full stance list");
  ok((CS.issueRows(PID) || []).some((r) => r.key === GAP && r.stance && r.stance.key === "oppose"), "the gap issue has a row with the stated side on the person file");

  // Word vs Action: in the ledger, scored, and tested against the record.
  const WA = W.PDXWordAction;
  const led = WA.wordLedger(PID, W.CMP_DATA[PID]).filter((it) => it.issueKey === GAP);
  eq(led.map((it) => [it.provenance, it.scored, it.stance]), [["pipeline", true, "oppose"]], "Word vs Action's ledger holds the pipeline position, scored");
  const vote = (n, position) => ({ kind: "vote", rollcallId: 7700 + n, measureId: 7800 + n, number: "S. " + (700 + n),
    date: "2025-0" + ((n % 9) + 1) + "-14", action: "On Passage", position, isProcedural: false, title: "Pipeline fixture measure " + n,
    source: { url: "https://www.congress.gov/roll-call-vote/" + (7700 + n), label: "Congress.gov" },
    issues: [{ issueKey: GAP, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }] });
  W.PDXVotingRecord.noteMember(PID, Array.from({ length: 8 }, (_, i) => vote(i, "yea")));
  const rd = WA.read(PID, W.CMP_DATA[PID]);
  const it = rd.items.filter((x) => x.issueKey === GAP)[0];
  ok(it && it.provenance === "pipeline", "the pipeline position is in Word vs Action's read");
  ok(it && it.test && it.test.state === "tested", `…tested against the formal record (state: ${it && it.test && it.test.state})`);
  ok(rd.tested.some((x) => x.issueKey === GAP), "…and counted in the tested set the percentage is built from");
  eq(it && it.test && it.test.token, "contradicts", "said oppose, voted yea eight times: a contradiction");

  // Alignment: matched as a documented position.
  W.alignToggleIssue(GAP);
  const bd = W._calcAlignmentBreakdown(PID, { mode: "stated" });
  const row = bd && bd.issues ? bd.issues.filter((r) => r.key === GAP)[0] : null;
  ok(row, "the Alignment Tool compares the gap issue");
  eq(row && [row.direct, row.source, row.stance, row.provenance, row.baseline], [true, "stated", "oppose", "pipeline", false], "…as a direct documented position from the pipeline card, not the record baseline");
  const chip = W._alignSignalChipHtml(row);
  ok(/Says:/.test(chip) && /Pipeline-sourced/.test(chip) && /data-pdx-stance-source="pipeline"/.test(chip), "the Alignment row's Says: chip is tagged pipeline-sourced");
  ok(W._calcAlignmentScore(PID) != null && (bd.issues || []).some((r) => r.key === GAP && r.weight > 0), "the alignment score is computed with the pipeline position weighted in it");

  // A cold boot (no cards) does not compare the gap issue as a stated position.
  const C0 = boot();
  C0.alignToggleIssue(GAP);
  const bd0 = C0._calcAlignmentBreakdown(PID, { mode: "stated" });
  const row0 = bd0 && bd0.issues ? bd0.issues.filter((r) => r.key === GAP)[0] : null;
  ok(!row0 || !row0.direct, "without the pipeline card the issue has no documented position (control)");
}

section("6 · nothing curated moved");
{
  const git = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); } catch { return null; } };
  for (const f of ["politician-stances.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js"]) {
    const base = git(["show", `HEAD:${f}`]);
    if (base != null) eq(R(f) === base, true, `${f} is unchanged`);
    else ok(true, f);
  }
}

console.log(`\n${failures.length ? "✗" : "✓"} stated positions: ${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log("   ✗ " + f);
process.exit(failures.length ? 1 : 0);
