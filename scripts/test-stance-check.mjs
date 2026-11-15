#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-stance-check.mjs — the read-only opposing-evidence check
// ─────────────────────────────────────────────────────────────────────────────
// After a run writes Evidence Locker items, a politician + issue pair that got a
// new strong item is compared against the curated stance on file. When its
// strong, not-hidden items run predominantly the other way the run logs
//   stance-check: OPPOSING — pid, issue, curated: support, evidence: oppose (N strong items)
// and closes with "raw-ingest: opposing evidence — N cases".
//
// WHAT THIS SUITE PROVES:
//   1. The rules: strong + not hidden only; weak, mention and mixed reads are
//      ignored; a mixed or self-contradicting curated side is not checked; an
//      even split is not a case; both directions are caught.
//   2. A real cron run with strong items against a curated stance logs the
//      OPPOSING line and the run count; an agreeing curated stance logs none.
//   3. Read-only: the Locker (pre-existing and new items), the curated cards and
//      the stated-positions rows are byte-identical with and without the check,
//      and the report has no new field.
//   4. The committed curated cards load from the stance data files.
//
//   node scripts/test-stance-check.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const imp = (f) => import(pathToFileURL(join(ROOT, f)).href);
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`   ── ${t}`);

const SC = await imp("netlify/lib/stance-check.mjs");
const EL = await imp("netlify/lib/evidence-locker-core.mjs");
const fn = await imp("netlify/functions/raw-ingest-cron.mts");
const core = await imp("netlify/lib/raw-ingest-core.mjs");

let seq = 0;
const entry = (issueKey, position, confidence, extra = {}) => ({
  issueKey, source: { label: "Source", url: `https://example.com/p${++seq}` },
  pipeline: { position, confidence, excerpt: `On ${issueKey} (${seq}).`, key: `pid/${issueKey}/${seq}.json` }, ...extra,
});

section("1 · the rules");
{
  const card = (issueKey, issueStance) => ({ issueKey, issueStance, pos: issueStance });
  eq(SC.curatedSideOf([card("housing", "support")], "housing"), "support", "a clear curated card gives its side");
  eq(SC.curatedSideOf([{ issueKey: "housing", pos: "oppose" }], "housing"), "oppose", "…falling back to pos");
  eq(SC.curatedSideOf([card("housing", "mixed")], "housing"), null, "a mixed curated card is no side");
  eq(SC.curatedSideOf([card("housing", "support"), card("housing", "oppose")], "housing"), null, "curated cards that disagree are no side");
  eq(SC.curatedSideOf([card("guns", "oppose")], "housing"), null, "no card on the key is no side");

  const T = (es) => SC.strongTally(es, "housing");
  eq(T([entry("housing", "oppose", 0.9), entry("housing", "oppose", null)]), { support: 0, oppose: 2 }, "strong items count (no confidence = strong)");
  eq(T([entry("housing", "oppose", 0.6), entry("housing", "oppose", 0.2)]), { support: 0, oppose: 0 }, "weak items and mentions never count");
  eq(T([entry("housing", "mixed", 0.95)]), { support: 0, oppose: 0 }, "a mixed read never counts");
  eq(T([entry("housing", "no_clear_position", 0.95)]), { support: 0, oppose: 0 }, "a no-clear-position read never counts");
  eq(T([entry("housing", "oppose", 0.9, { review: { status: "hidden" } })]), { support: 0, oppose: 0 }, "a hidden item never counts");
  eq(T([entry("guns", "oppose", 0.9)]), { support: 0, oppose: 0 }, "another issue's items never count");

  eq(SC.opposingCase("support", { support: 0, oppose: 2 }), { curated: "support", evidence: "oppose", n: 2 }, "curated support, strong oppose → a case");
  eq(SC.opposingCase("oppose", { support: 3, oppose: 1 }), { curated: "oppose", evidence: "support", n: 3 }, "curated oppose, strong support → a case (the reverse)");
  eq(SC.opposingCase("support", { support: 2, oppose: 2 }), null, "an even split is not a case");
  eq(SC.opposingCase("support", { support: 2, oppose: 1 }), null, "evidence mostly agreeing is not a case");
  eq(SC.opposingCase("support", { support: 0, oppose: 0 }), null, "no strong evidence is not a case");
  eq(SC.opposingLine({ politician_id: "pa", issue: "housing", curated: "support", evidence: "oppose", n: 2 }),
    "stance-check: OPPOSING — pa, housing, curated: support, evidence: oppose (2 strong items)", "the OPPOSING line");
  eq(SC.opposingSummaryLine(3), "raw-ingest: opposing evidence — 3 cases", "the run count line");
}

section("2 · a cron run against a curated stance");
const src = core.SOURCES[0];
const PID = src.politician_id;
const HTML = "<html><body><h1>Taxes &amp; Cost of Living</h1><p>I will cut taxes for working families across Texas.</p>"
  + "<p>We will lower the cost of rent, groceries, utilities, and gas.</p><p>Cap credit card interest rates so families can keep more of their pay.</p></body></html>";
const mkFetch = () => async (url) => ({ ok: true, status: 200, url, headers: new Map([["content-type", "text/html"]]), text: async () => HTML });
const rawStore = () => { const d = new Map(); return { d, async setJSON(k, v) { d.set(k, v); } }; };
const locker = () => { const d = new Map(); return { d, writes: 0,
  async list(o = {}) { return { blobs: [...d.keys()].filter((k) => !o.prefix || k.startsWith(o.prefix)).map((key) => ({ key })) }; },
  async get(k) { return d.has(k) ? JSON.parse(JSON.stringify(d.get(k))) : null; },
  async setJSON(k, v, o = {}) { this.writes++; if (o.onlyIfNew && d.has(k)) return { modified: false }; d.set(k, JSON.parse(JSON.stringify(v))); return { modified: true }; } }; };
// A pre-existing strong Locker item on the same issue, so the check reads more than this run's write.
const seed = (lk) => {
  const it = { politician_id: PID, topic: "cost_living", position: "support", confidence: 0.92, source_type: "campaign issues page",
    link: "https://seed.example/old", excerpt: "I will lower costs for families.", date: "2026-10-01", attribution: "Source: campaign page",
    strength: "strong", rules_version: "phase8-v3", layer: "stated", formal_record: false };
  lk.d.set(EL.lockerKey(it), it);
};
const rows = () => {
  const m = new Map();
  return { m,
    async rowsFor(pid) { return [...m.values()].filter((r) => r.politicianId === pid); },
    async upsert(pid, rec, at) { m.set(`${pid}|${rec.issueKey}`, { ...rec, politicianId: pid, status: "active", provenance: "pipeline", updatedAt: at.toISOString() }); },
    async withdraw(pid, keys, at) { for (const k of keys) { const r = m.get(`${pid}|${k}`); if (r) m.set(`${pid}|${k}`, { ...r, status: "withdrawn" }); } } };
};
const deepFreeze = (o) => { if (o && typeof o === "object") { Object.values(o).forEach(deepFreeze); Object.freeze(o); } return o; };
const NOW = () => new Date("2026-11-15T03:00:00Z");
async function runWith(curatedStances) {
  const lk = locker(); seed(lk);
  const db = rows();
  const log = [];
  const orig = console.log; console.log = () => {};
  let res;
  try {
    res = await (await fn.run({ fetch: mkFetch(), store: rawStore(), lockerStore: lk, sources: [src], now: NOW, log: (l) => log.push(l), statedDb: db,
      ...(curatedStances ? { curatedStances } : {}) })).json();
  } finally { console.log = orig; }
  return { lk, db, log, res };
}

const OPPOSED = { [PID]: [{ topic: "Cost of Living", issueKey: "cost_living", issueStance: "oppose", pos: "oppose", text: "curated" }] };
const curatedBefore = JSON.stringify(OPPOSED);
deepFreeze(OPPOSED);
const withCheck = await runWith(OPPOSED);
const strongWrites = withCheck.res.locker_writes.filter((w) => w.topic === "cost_living" && w.strength === "strong");
ok(strongWrites.length >= 1, `the run wrote a strong cost_living item (writes: ${JSON.stringify(withCheck.res.locker_writes.map((w) => [w.topic, w.strength]))})`);
for (const l of withCheck.log.filter((x) => /^stance-check:|opposing evidence/.test(x))) console.log("      " + l);
const line = withCheck.log.find((l) => l.startsWith("stance-check: OPPOSING"));
const n = 1 + strongWrites.length;
eq(line, `stance-check: OPPOSING — ${PID}, cost_living, curated: oppose, evidence: support (${n} strong items)`, "the OPPOSING line is logged");
ok(withCheck.log.includes("raw-ingest: opposing evidence — 1 case"), "the run logs the count of opposing cases");
const at = (re) => withCheck.log.findIndex((l) => re.test(l));
ok(at(/^raw-ingest: opposing evidence/) > at(/^evidence-locker: run complete/) && at(/^raw-ingest: opposing evidence/) < at(/^raw-ingest: run duration|^raw-ingest: SLOW RUN/),
  "the count is logged at the end of the run, after the Locker writes and before the duration line");

{
  const agree = await runWith({ [PID]: [{ issueKey: "cost_living", issueStance: "support" }] });
  ok(!agree.log.some((l) => l.startsWith("stance-check: OPPOSING")), "a curated stance the evidence agrees with logs no OPPOSING line");
  ok(agree.log.includes("raw-ingest: opposing evidence — 0 cases"), "…and the run count is 0");
  const mixed = await runWith({ [PID]: [{ issueKey: "cost_living", issueStance: "mixed" }] });
  ok(!mixed.log.some((l) => l.startsWith("stance-check: OPPOSING")), "a mixed curated stance is not checked");
  const none = await runWith({ someone_else: [{ issueKey: "cost_living", issueStance: "oppose" }] });
  ok(none.log.includes("raw-ingest: opposing evidence — 0 cases"), "no curated stance for the politician: 0 cases");
}

section("3 · read-only");
{
  const without = await runWith(null);
  ok(!without.log.some((l) => /^stance-check:|opposing evidence/.test(l)), "a run with no curated data and no rotation runs no check");
  const dump = (lk) => JSON.stringify([...lk.d.entries()].sort(([a], [b]) => a.localeCompare(b)));
  eq(dump(withCheck.lk), dump(without.lk), "the Locker is byte-identical with and without the check (seeded item untouched)");
  eq(withCheck.lk.writes, without.lk.writes, "the check makes no Locker write calls");
  const seeded = [...withCheck.lk.d.values()].find((v) => v.link === "https://seed.example/old");
  eq([seeded.position, seeded.strength, seeded.confidence], ["support", "strong", 0.92], "the pre-existing Locker item is unchanged");
  eq(JSON.stringify(OPPOSED), curatedBefore, "the curated stance is unchanged (frozen, and still the same)");
  const dumpRows = (db) => JSON.stringify([...db.m.entries()].sort(([a], [b]) => a.localeCompare(b)));
  eq(dumpRows(withCheck.db), dumpRows(without.db), "the stated-positions rows are identical with and without the check");
  eq(Object.keys(withCheck.res).sort(), Object.keys(without.res).sort(), "the run report has no new field");
}

section("4 · the committed curated cards");
{
  const C = SC.loadCuratedStances();
  ok(Object.keys(C).length > 1000, `the stance data files load (${Object.keys(C).length} politicians)`);
  ok(Object.values(C).some((cards) => cards.some((c) => c.issueKey && /^(support|oppose)$/.test(c.issueStance || c.pos))), "…with clear curated sides on issue keys");
}

console.log("");
if (failures.length) {
  console.log(`✗ stance check: ${failures.length} failure(s), ${passed} passed`);
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
console.log(`✓ stance check: all ${passed} assertions passed`);
