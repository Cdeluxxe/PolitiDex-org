#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-stated-positions-backfill.mjs — the one-time Locker → stance-store pass
// ─────────────────────────────────────────────────────────────────────────────
// Proves: the pass reads exactly what the promotion step reads and promotes
// with the same thresholds; it upserts with provenance 'pipeline', withdraws
// (never deletes) a promotion that no longer qualifies — including for a person
// with no Locker items left; every scanned item lands under exactly one outcome;
// a pass cut short by its budget resumes without double counting; a second pass
// changes nothing; the function is one-time (marker) and touches neither the
// Locker writer, the promotion step nor the curated cards.
//
//   node scripts/test-stated-positions-backfill.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const imp = (f) => import(pathToFileURL(join(ROOT, f)).href);
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const BF = await imp("netlify/lib/stated-positions-backfill.mjs");
const SP = await imp("netlify/lib/stated-positions-core.mjs");

let n = 0;
const item = (pid, topic, position, confidence, extra = {}) => ({
  politician_id: pid, topic, position, confidence, link: `https://ex.example/${pid}/${++n}`,
  excerpt: `I will act on ${topic} now (${n}).`, attribution: "Source: campaign page", source_type: "campaign",
  rules_version: "phase8-v3", date: "2026-11-01", ...extra,
});
const lockerOf = (items) => {
  const d = new Map(items.map((it, i) => [`${it.politician_id}/${it.topic}/${String(i).padStart(4, "0")}.json`, it]));
  d.set("broken/x/1.json", null);
  return { d,
    async list(o = {}) { return { blobs: [...d.keys()].filter((k) => !o.prefix || k.startsWith(o.prefix)).map((key) => ({ key })) }; },
    async get(k) { return d.has(k) ? JSON.parse(JSON.stringify(d.get(k))) : null; } };
};
const dbOf = (seed = []) => {
  const rows = new Map(seed.map((r) => [`${r.politicianId}|${r.issueKey}`, { ...r }]));
  return { rows, deleted: 0,
    async rowsFor(pid) { return [...rows.values()].filter((r) => r.politicianId === pid).map((r) => ({ ...r })); },
    async upsert(pid, rec) { rows.set(`${pid}|${rec.issueKey}`, { ...rec, politicianId: pid, status: "active", provenance: SP.PROVENANCE }); },
    async withdraw(pid, ks) { for (const k of ks) rows.get(`${pid}|${k}`).status = "withdrawn"; },
    async activePoliticianIds() { return [...new Set([...rows.values()].filter((r) => r.status === "active").map((r) => r.politicianId))]; } };
};
const quiet = { log: () => {} };

const items = [
  item("pa", "housing", "support", 0.9),                                   // strong → promoted
  item("pa", "gun_safety", "oppose", 0.5), item("pa", "gun_safety", "oppose", 0.5), item("pa", "gun_safety", "oppose", 0.5), // 3 weak → promoted
  // A WEAK even split promotes nothing (a strong split is a Mixed stance since
  // phase9-v1 — covered in test-stated-positions.mjs).
  item("pa", "energy_production", "support", 0.5), item("pa", "energy_production", "oppose", 0.5), // even split
  item("pa", "cost_living", "support", 0.1),                               // mention
  item("pb", "housing", "support", 0.9), item("pb", "housing", "oppose", 0.5), // strong beats weak: 1 promoted, 1 outweighed
];
const store = lockerOf(items);
const db = dbOf([
  { politicianId: "pa", issueKey: "energy_production", stance: "support", status: "active" }, // no longer qualifies
  { politicianId: "gone", issueKey: "housing", stance: "oppose", status: "active" },          // no Locker items left
]);
const lines = [];
const r = await BF.runBackfill({ store, db, log: (l) => lines.push(l) });
const T = r.state.tallies;
ok(r.complete, "the pass completes");
eq(T.items_scanned, store.d.size, "every Locker key is scanned");
eq(T.items_promoted + Object.values(T.items_skipped).reduce((a, b) => a + b, 0), T.items_scanned, "every item has exactly one outcome");
eq([T.items_promoted, T.items_skipped.even_split, T.items_skipped.mention, T.items_skipped.outweighed, T.items_skipped.unreadable], [5, 2, 1, 1, 1], "item outcomes");
eq([...db.rows.values()].map((r) => `${r.politicianId}|${r.issueKey}=${r.status}:${r.stance}`).sort(),
  ["gone|housing=withdrawn:oppose", "pa|energy_production=withdrawn:support", "pa|gun_safety=active:oppose", "pa|housing=active:support", "pb|housing=active:support"],
  "qualifying pairs active, non-qualifying ones withdrawn and kept");
ok([...db.rows.values()].filter((r) => r.status === "active").every((r) => r.provenance === "pipeline"), "rows carry provenance pipeline");
eq([T.pairs_new, T.pairs_withdrawn, T.pairs_promoted], [3, 2, 3], "pair tallies");
eq(T.new_pairs.sort(), ["pa|gun_safety:oppose/strong", "pa|housing:support/strong", "pb|housing:support/strong"], "new pairs listed");
ok(/^stated-positions-backfill: complete — \d+ Locker item\(s\) scanned · 5 promoted .* 5 skipped \(.*even split.*\) .* 3 pair\(s\) received a new pipeline stance/.test(lines.at(-1)), `summary line: ${lines.at(-1)}`);

// The pass and the step agree, issue for issue.
for (const pid of ["pa", "pb"]) {
  eq(Object.keys(SP.promoteEntries((await BF.readLocker(store)).byPid[pid].entries)), Object.keys(SP.promoteEntries(await SP.lockerEntriesFor(store, pid))), `${pid}: same promotions as the step`);
}

// Rerun: nothing moves.
const again = await BF.runBackfill({ store, db, ...quiet });
eq([again.state.tallies.pairs_new, again.state.tallies.pairs_updated, again.state.tallies.pairs_withdrawn, again.state.tallies.pairs_unchanged], [0, 0, 0, 3], "a second pass changes nothing");

// Budget: cut short, then resumed, totals equal a single pass.
let t = 0;
const db2 = dbOf();
const p1 = await BF.runBackfill({ store, db: db2, budgetMs: 1, clock: () => (t += 1), ...quiet });
ok(!p1.complete && p1.state.done.length >= 1, "a pass over its budget stops partway");
const p2 = await BF.runBackfill({ store, db: db2, state: JSON.parse(JSON.stringify(p1.state)), ...quiet });
ok(p2.complete, "…and resumes to completion");
eq([p2.state.tallies.items_scanned, p2.state.tallies.items_promoted, p2.state.tallies.pairs_new], [T.items_scanned, T.items_promoted, 1 + 2], "…without double counting");

// A database failure leaves that politician for the next run.
const db3 = dbOf(); const up = db3.upsert; let fail = true;
db3.upsert = async (...a) => { if (fail && a[0] === "pb") throw new Error("boom"); return up.apply(db3, a); };
const f1 = await BF.runBackfill({ store, db: db3, ...quiet });
ok(!f1.complete && !f1.state.done.includes("pb"), "a failed politician is not marked done");
fail = false;
ok((await BF.runBackfill({ store, db: db3, state: f1.state, ...quiet })).complete, "…and is retried next run");

// The function is one-time and narrow.
const fn = R("netlify/functions/stated-positions-backfill.mts");
ok(/saved\?\.complete/.test(fn) && /already complete/.test(fn), "the function stops once the marker says complete");
ok(/schedule:/.test(fn), "the function is scheduled (runs on its own in production)");
ok(!/maybeWriteLockerItem|setJSON\(\s*key|lockerStore\.set/.test(fn + R("netlify/lib/stated-positions-backfill.mjs")), "the pass never writes the Locker");
const git = (f) => { try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); } catch { return null; } };
// (The cron and stated-positions-core.mjs were changed on purpose by the fresh
// evidence pass — scripts/test-raw-ingest-fresh.mjs covers them.)
// evidence-locker-core.mjs: its whole-Locker read now goes through the bounded
// reader (netlify/lib/locker-read.mjs — the unbounded Promise.all exhausted the
// function's sockets); undoing exactly that edit must give back the committed
// file, so no scoring, grading or promotion rule can have moved with it.
const LOCKER_READ_UNDO = [
  ['import { readLockerDocs } from "./locker-read.mjs";\n', ""],
  ["    const docs = await readLockerDocs(store, keys);", '    const docs = await Promise.all(keys.map(async (key) => ({ key, doc: await store.get(key, { type: "json" }).catch(() => null) })));'],
];
const undoLockerRead = (f, src) => f === "netlify/lib/evidence-locker-core.mjs" ? LOCKER_READ_UNDO.reduce((s, [a, b]) => s.split(a).join(b), src) : src;
// The citation pass changed evidence-locker-core.mjs on purpose (clear-position
// items now carry a citation record and must come from the politician's own
// page) — scripts/test-evidence-locker-citations.mjs covers it, so it is only
// held to HEAD here when it matches HEAD or the bounded-reader undo.
const CITATION_PASS = (f, src) => f === "netlify/lib/evidence-locker-core.mjs" && /export function citationExcerpts\(/.test(src);
for (const f of ["netlify/lib/evidence-locker-core.mjs", "politician-stances.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js"]) {
  const base = git(f);
  ok(base == null || base === R(f) || base === undoLockerRead(f, R(f)) || CITATION_PASS(f, R(f)), `${f} is unchanged`);
}

console.log(`\n${failures.length ? "✗" : "✓"} stated-positions backfill: ${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log("   ✗ " + f);
process.exit(failures.length ? 1 : 0);
