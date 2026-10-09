#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-rider-audit-onaxis.mjs — wave 2 of the rider audit files the named
// on-axis pairs the first pass listed, as secondary rows, and nothing else
// ─────────────────────────────────────────────────────────────────────────────
// THE PASS. The first rider audit (db/vr-rider-audit.json, migration
// 20261111000000) filed only off-axis rows and listed 30 more pairs whose own
// text names the leaf but which sit inside the act's dominant category. Wave 2
// files them as secondary rows (db/vr-rider-audit-onaxis.json, migration
// 20261112000000), declining only passing mentions and bare labels.
//
// What this file pins:
//   1. Migration ↔ ledger. Every INSERT is a `filed` ledger row, field for field;
//      no UPDATE, no DELETE, no is_primary true, no new vocabulary, no measures.
//   2. One of the 30. Every filed or declined pair is one of the first pass's
//      notFiled pairs, and every one of the 30 is accounted for exactly once.
//   3. The phrase. Each row's phrase is in the act's own stored text, that text
//      still carries the first pass's phrase (so it is the text the audit read),
//      and the archive's own record of the act carries the phrase too.
//   4. The key. Already in db/issue-keys.json and already used by a mapping.
//   5. The weight. The lowest weight the act's secondary rows use, or 40.
//   6. The axis report. dominantBefore / dominantAfter / dominantMoved are what
//      measureAxis() computes, so the summary's "moved" list cannot drift.
//   7. Wave 1 stands. Its six rows are still its six rows, and wave 2 writes none
//      of them; the four declined H.R. 9770 rows are inserted nowhere.
//   8. The teeth. A declined row, a new key, a primary, a pair outside the 30, a
//      phrase not in the text, and a wrong weight each fail the validator.
//
//   node scripts/test-vr-rider-audit-onaxis.mjs
//
// Reads the migration directory and db/. No database, no network.

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => { if (!cond) { console.error(`\n  ✗ rider audit wave 2 is STALE: ${msg}\n`); process.exit(2); } };

const MIG_DIR = "netlify/database/migrations";
const MIG1 = "20261111000000_vr_rider_audit_offaxis_rows.sql";
const MIG2 = "20261112000000_vr_rider_audit_onaxis_rows.sql";
const NO_SECONDARY_WEIGHT = 40;

const W1 = J("db/vr-rider-audit.json");
const W2 = J("db/vr-rider-audit-onaxis.json");
const ALLOW = new Set(J("db/issue-keys.json").keys);
const CATEGORY_OF = J("db/issue-core-categories.json").categoryOf;
const SQL1 = R(join(MIG_DIR, MIG1));
const SQL2 = R(join(MIG_DIR, MIG2));

// netlify/lib/vr-axis.ts measureAxis(), the same count.
const categoryOf = (k) => CATEGORY_OF[k] ?? `issue:${k}`;
function winners(issueKeys) {
  const keys = [...new Set(issueKeys.filter(Boolean))];
  const count = new Map();
  for (const k of keys) count.set(categoryOf(k), (count.get(categoryOf(k)) ?? 0) + 1);
  let top = 0;
  for (const n of count.values()) if (n > top) top = n;
  return [...count.keys()].filter((c) => top > 0 && count.get(c) === top).sort();
}
must(/export function measureAxis/.test(R("netlify/lib/vr-axis.ts")),
  "netlify/lib/vr-axis.ts no longer exports measureAxis — re-port the count");

// ── the migrations, parsed — federal and Utah addressing ─────────────────────
function parseInserts(sql) {
  const rows = [];
  const BLOCK = /SELECT id INTO m_id FROM vr_measures\s+WHERE measure_type = '([^']+)' AND chamber = '([^']+)' AND congress (?:= (\d+)|IS NULL) AND number = '((?:[^']|'')+)'(?:\s+AND external_ids->>'utahSession' = '([^']+)')?[\s\S]*?INSERT INTO vr_measure_issues\s*\(measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url\)\s*VALUES\s*\(m_id, '([^']+)', (\d+), (true|false), '([^']+)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)'\);/g;
  let m;
  while ((m = BLOCK.exec(sql))) {
    rows.push({
      measureType: m[1], chamber: m[2], congress: m[3] ? Number(m[3]) : null,
      number: m[4].replace(/''/g, "'"), utahSession: m[5] || null,
      issueKey: m[6], weight: Number(m[7]), isPrimary: m[8] === "true", supportMeaning: m[9],
      rationale: m[10].replace(/''/g, "'"), sourceUrl: m[11].replace(/''/g, "'"),
    });
  }
  return rows;
}
const INS1 = parseInserts(SQL1);
const INS2 = parseInserts(SQL2);
must(INS2.length > 0, "no mapping INSERT parsed out of the wave 2 migration");

const sitting = (r) => (r.congress != null ? String(r.congress) : r.utahSession);
const pairKey = (r) => `${r.number}|${sitting(r)}|${r.wouldJoin ?? r.issueKey}`;
const actKey = (r) => `${r.number}|${sitting(r)}`;

// ── the archive's own record of an act ───────────────────────────────────────
const IDENTITY = J("db/vr-measure-identity.json").measures;
const OTHER_MIGRATIONS = readdirSync(join(ROOT, MIG_DIR))
  .filter((f) => f.endsWith(".sql") && f !== MIG1 && f !== MIG2)
  .map((f) => R(join(MIG_DIR, f)).replace(/''/g, "'"));
const archiveCarries = (number, congress, phrase) => {
  const id = congress != null && IDENTITY.find((m) => m.number === number && m.congress === congress);
  if (id && [id.title, id.shortTitle, id.summary].filter(Boolean).join(" ").indexOf(phrase) >= 0) return true;
  return OTHER_MIGRATIONS.some((src) => src.indexOf(number) >= 0 && src.indexOf(phrase) >= 0);
};
const ownText = (ledger, r) => {
  const m = ledger.measures[actKey(r)];
  return m ? [m.title, m.shortTitle, m.summary].filter(Boolean).join(" ") : "";
};
const USED_KEYS = new Set();
for (const src of OTHER_MIGRATIONS) {
  for (const m of src.matchAll(/vr_measure_issues[\s\S]{0,400}?\(\s*(?:m_id|[a-z_]+|\d+)\s*,\s*'([a-z0-9_]+)'/g)) USED_KEYS.add(m[1]);
  for (const m of src.matchAll(/issue_key\s*=\s*'([a-z0-9_]+)'/g)) USED_KEYS.add(m[1]);
}
must(USED_KEYS.size > 50, `only ${USED_KEYS.size} mapped keys harvested — the harvest has gone blind`);

// The 30, as the first pass recorded them.
const THE_30 = new Map(W1.notFiled.map((n) => [pairKey(n), n]));
const W1_DECLINED = new Set(W1.declined.map(pairKey));
const W1_FILED = new Set(W1.filed.map(pairKey));

// ── the validator ────────────────────────────────────────────────────────────
function validate(ledger, inserts) {
  const errs = [];
  const filedBy = new Map(ledger.filed.map((f) => [pairKey(f), f]));
  if (inserts.length !== ledger.filed.length) errs.push(`migration inserts ${inserts.length} rows, ledger files ${ledger.filed.length}`);
  for (const d of ledger.declined)
    if (inserts.some((r) => pairKey(r) === pairKey(d))) errs.push(`declined ${pairKey(d)} is inserted`);
  const addedBy = new Map();
  for (const r of inserts) {
    const k = pairKey(r);
    if (W1_DECLINED.has(k)) errs.push(`declined H.R. 9770-class row ${k} is inserted`);
    if (W1_FILED.has(k)) errs.push(`${k} is a wave-1 row and is written again`);
    if (!THE_30.has(k)) errs.push(`${k} is not one of the 30 named on-axis pairs`);
    const f = filedBy.get(k);
    if (!f) { errs.push(`insert ${k} is not a filed ledger row`); continue; }
    const m = ledger.measures[actKey(r)];
    if (!m) { errs.push(`${k}: no stored text for the act in the ledger`); continue; }
    if (r.isPrimary) errs.push(`${k} is written is_primary = true`);
    const text = ownText(ledger, r);
    if (!f.phrase || text.indexOf(f.phrase) < 0) errs.push(`${k}: phrase "${f.phrase}" is not in the act's own text`);
    else if (!archiveCarries(r.number, r.congress, f.phrase)) errs.push(`${k}: phrase "${f.phrase}" is not in the archive's record of the act`);
    const audit = THE_30.get(k);
    if (audit && text.indexOf(audit.phrase) < 0) errs.push(`${k}: the stored text is not the text the first pass read`);
    if (r.rationale.indexOf(f.phrase) < 0) errs.push(`${k}: rationale does not quote its phrase`);
    if (!ALLOW.has(r.issueKey)) errs.push(`${k}: ${r.issueKey} is a new issue key (not in db/issue-keys.json)`);
    else if (!USED_KEYS.has(r.issueKey)) errs.push(`${k}: ${r.issueKey} holds no mapping anywhere in the archive`);
    if (m.rows.some((x) => x.issueKey === r.issueKey)) errs.push(`${k}: the act already holds this key`);
    if (!m.rows.some((x) => x.isPrimary && x.issueKey === f.sitsOn)) errs.push(`${k}: ${f.sitsOn} is not the act's existing primary`);
    const sec = m.rows.filter((x) => !x.isPrimary).map((x) => x.weight);
    const want = sec.length ? Math.min(...sec) : NO_SECONDARY_WEIGHT;
    if (r.weight !== want) errs.push(`${k}: weight ${r.weight}, the rule gives ${want}`);
    if (f.weight !== r.weight || f.supportMeaning !== r.supportMeaning || f.measureType !== r.measureType || f.chamber !== r.chamber)
      errs.push(`${k}: migration and ledger disagree on weight, polarity or identity`);
    if (!/^https:\/\/\S+$/.test(r.sourceUrl)) errs.push(`${k}: no https source`);
    addedBy.set(actKey(r), [...(addedBy.get(actKey(r)) || []), r.issueKey]);
  }
  for (const f of ledger.filed) {
    const m = ledger.measures[actKey(f)];
    if (!m) continue;
    const before = winners(m.rows.map((x) => x.issueKey));
    const after = winners([...m.rows.map((x) => x.issueKey), ...(addedBy.get(actKey(f)) || [])]);
    if (f.dominantBefore.join(",") !== before.join(",") || f.dominantAfter.join(",") !== after.join(",") ||
        f.dominantMoved !== (before.join(",") !== after.join(",")))
      errs.push(`${pairKey(f)}: the dominant-category report does not match measureAxis (${before} → ${after})`);
  }
  return errs;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the migration writes exactly the ledger's filed rows, and nothing else");
eq((SQL2.match(/INSERT\s+INTO\s+vr_measure_issues/gi) || []).length, INS2.length, "every INSERT parses into a full row");
ok(!/\bUPDATE\s+vr_measure_issues\b/i.test(SQL2), "no existing mapping row is updated — no primary flag moves");
ok(!/\bDELETE\s+FROM\s+vr_measure_issues\b/i.test(SQL2), "no mapping row is deleted");
ok(!/is_primary\s*=\s*true|,\s*true\s*,\s*'yea_/i.test(SQL2), "no row is written is_primary = true");
ok(!/\bdd_issue_keys\b/.test(SQL2), "no issue key is added to the vocabulary table");
ok(!/\bINSERT\s+INTO\s+vr_(measures|rollcalls|member_votes|positions)\b/i.test(SQL2), "no measure, roll call, vote or position is written");
ok(/^-- pack-generation: (derived|purge) — /m.test(SQL2), "the migration declares its pack-generation step");

section("2 · the 30, each accounted for once");
eq(THE_30.size, 30, "the first pass listed 30 named on-axis pairs");
const seen = [...W2.filed, ...W2.declined].map(pairKey);
eq(new Set(seen).size, seen.length, "no pair is both filed and declined, or listed twice");
eq([...THE_30.keys()].filter((k) => !seen.includes(k)).join(", "), "", "every one of the 30 is filed or declined");
eq(seen.filter((k) => !THE_30.has(k)).join(", "), "", "nothing outside the 30 is filed or declined");
eq(W2.scan.filed, W2.filed.length, "the scan count matches the filed list");
eq(W2.scan.declined, W2.declined.length, "the scan count matches the declined list");
eq(W2.scan.dominantMoved, W2.filed.filter((f) => f.dominantMoved).length, "the moved count matches the rows");
for (const d of W2.declined) {
  ok(/^(passing mention|bare label): /.test(d.reason), `declined ${pairKey(d)} is declined as a passing mention or bare label`);
  ok(ownText(W2, d).indexOf(d.phrase) >= 0, `declined ${pairKey(d)} reports its phrase from the act's own text`);
}
for (const f of W2.filed) {
  ok(f.isPrimary === false, `${pairKey(f)} is filed as a secondary row`);
  if (f.phraseChanged) ok(f.phrase !== f.auditPhrase && ownText(W2, f).indexOf(f.auditPhrase) >= 0,
    `${pairKey(f)} records both the first pass's phrase and the one that replaced it`);
}

section("3–6 · phrase, key, weight and axis report hold on the shipped pass");
eq(validate(W2, INS2).join(" | "), "", "the shipped wave 2 passes every rule");

section("7 · wave 1 stands, and the H.R. 9770 declines stay declined");
eq(INS1.length, 6, "the wave 1 migration still inserts its six rows");
eq(INS1.map((r) => pairKey(r)).sort().join(","), W1.filed.map(pairKey).sort().join(","), "…and they are still the six wave 1 filed");
for (const r of INS2) ok(!W1_FILED.has(pairKey(r)), `${pairKey(r)} is not a wave 1 row written again`);
for (const k of W1_DECLINED) {
  ok(![...INS1, ...INS2].some((r) => pairKey(r) === k), `declined ${k} is inserted by neither wave`);
  ok(!OTHER_MIGRATIONS.some((s) => {
    const [n, , key] = k.split("|");
    return new RegExp(`number = '${n.replace(/\./g, "\\.")}'[\\s\\S]{0,600}?INSERT INTO vr_measure_issues[\\s\\S]{0,200}?'${key}'`).test(s);
  }), `declined ${k} is inserted by no other migration`);
}

section("8 · the teeth");
const clone = (x) => JSON.parse(JSON.stringify(x));
const bites = (errs, re, msg) => ok(errs.some((e) => re.test(e)), `${msg} — validator said: ${errs.join(" | ") || "nothing"}`);
{
  const rows = clone(INS2);
  const d = W1.declined[0];
  rows.push({ ...rows[0], number: d.number, congress: d.congress, utahSession: null, issueKey: d.wouldJoin });
  bites(validate(W2, rows), /declined H\.R\. 9770-class row/, "an inserted H.R. 9770 declined row fails");
}
{
  const rows = clone(INS2);
  const d = W2.declined[0];
  rows.push({ ...rows[0], number: d.number, congress: d.congress, utahSession: d.utahSession, issueKey: d.wouldJoin });
  bites(validate(W2, rows), /^declined .* is inserted/, "an inserted wave 2 declined row fails");
}
{
  const L = clone(W2), rows = clone(INS2);
  L.filed[0].wouldJoin = rows[0].issueKey = "rider_invented_key";
  bites(validate(L, rows), /new issue key/, "a new issue key fails");
}
{
  const rows = clone(INS2);
  rows[0].isPrimary = true;
  bites(validate(W2, rows), /is_primary = true/, "a row written as primary fails");
  ok(/\bUPDATE\s+vr_measure_issues\b/i.test(SQL2 + "\nUPDATE vr_measure_issues SET is_primary = false;"),
    "an UPDATE flipping a primary would be seen by the section 1 scan");
}
{
  const L = clone(W2), rows = clone(INS2);
  const i = rows.findIndex((r) => r.number === "H.R. 1319");
  must(i >= 0, "H.R. 1319 is no longer filed — re-aim the outside-the-30 tooth");
  const f = L.filed.find((x) => pairKey(x) === pairKey(rows[i]));
  f.wouldJoin = rows[i].issueKey = "child_care"; // already on the act, and not one of the 30
  bites(validate(L, rows), /not one of the 30/, "a pair outside the 30 fails");
}
{
  const L = clone(W2);
  L.filed[0].phrase = "expands rural broadband to every county";
  bites(validate(L, INS2), /is not in the act's own text/, "a phrase not in the act's own text fails");
}
{
  const L = clone(W2), rows = clone(INS2);
  rows[0].weight = L.filed[0].weight = rows[0].weight + 5;
  bites(validate(L, rows), /the rule gives/, "a weight off the rule fails");
}
{
  const L = clone(W2);
  const f = L.filed.find((x) => x.dominantMoved);
  must(f, "no row moves a dominant category — re-aim the axis-report tooth");
  f.dominantMoved = false;
  bites(validate(L, INS2), /dominant-category report/, "an axis report that hides a move fails");
}

console.log(`\n   ${W2.filed.length} filed · ${W2.declined.length} declined · ${W2.scan.dominantMoved} moved a dominant category`);
if (failures.length) {
  console.error(`\n  ✗ rider audit wave 2: ${failures.length} failed, ${passed} passed\n`);
  for (const f of failures) console.error("    · " + f);
  process.exit(1);
}
console.log(`\n  ✓ rider audit wave 2: ${passed} passed\n`);
