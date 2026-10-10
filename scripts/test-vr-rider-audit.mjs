#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-rider-audit.mjs — the rider audit files only what an act's own text
// names, only off-axis, and never more than 25
// ─────────────────────────────────────────────────────────────────────────────
// THE PASS. Primary used to be a gate, so a bill about one topic could touch a
// second and never be filed there. The rider audit walked member-voted measures
// that already hold a mapping, read each one's OWN stored title, short title and
// summary, and recorded every leaf that text names and the measure holds no row
// on. db/vr-rider-audit.json is the ledger; the migration
// 20261111000000_vr_rider_audit_offaxis_rows.sql files the rows.
//
// What this file pins:
//   1. Migration ↔ ledger. Every INSERT in the migration is a `filed` ledger row,
//      field for field, and the migration writes nothing else to the mapping
//      table — no UPDATE, no DELETE, no is_primary true.
//   2. The phrase. Each filed row's justifying phrase is in that measure's own
//      stored text, and that text is the archive's own (db/vr-measure-identity.json
//      or an applied migration carries the phrase), not a copy made for this pass.
//   3. The key. Every filed key is already in the shipped allow-list
//      (db/issue-keys.json) and already used by an applied mapping migration.
//   4. The axis. Each filed row is off-axis before and after every row on its act
//      lands, and every existing primary row keeps its on-axis standing.
//   5. The weight. No filed row outweighs the act's existing secondary rows.
//   6. The cap. At most 25 filed, ranked by members reached; the rest are held,
//      and a held candidate is listed and never inserted. A declined candidate
//      (named, but refused for a stated reason) is likewise listed, not filed.
//   7. The teeth. A row with no phrase, a new key, a flipped primary, a 26th
//      row and a held row slipped into the inserts each fail the validator.
//
//   node scripts/test-vr-rider-audit.mjs
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
const must = (cond, msg) => { if (!cond) { console.error(`\n  ✗ rider audit is STALE: ${msg}\n`); process.exit(2); } };

const MIG_DIR = "netlify/database/migrations";
const MIG = "20261111000000_vr_rider_audit_offaxis_rows.sql";
const CAP = 25;

const LEDGER = J("db/vr-rider-audit.json");
const ALLOW = new Set(J("db/issue-keys.json").keys);
const CATEGORY_OF = J("db/issue-core-categories.json").categoryOf;
const SQL = R(join(MIG_DIR, MIG));

// netlify/lib/vr-axis.ts measureAxis(), the same count: the category holding the
// most of a measure's leaf keys wins, a tie has every tied category on-axis.
const categoryOf = (k) => CATEGORY_OF[k] ?? `issue:${k}`;
function measureAxis(issueKeys) {
  const keys = [...new Set(issueKeys.filter(Boolean))];
  const count = new Map();
  for (const k of keys) count.set(categoryOf(k), (count.get(categoryOf(k)) ?? 0) + 1);
  let top = 0;
  for (const n of count.values()) if (n > top) top = n;
  const winners = [...count.keys()].filter((c) => top > 0 && count.get(c) === top).sort();
  const win = new Set(winners);
  return { winners, onAxisKeys: keys.filter((k) => win.has(categoryOf(k))) };
}
must(/export function measureAxis/.test(R("netlify/lib/vr-axis.ts")),
  "netlify/lib/vr-axis.ts no longer exports measureAxis — re-port the count");

// ── the migration, parsed ────────────────────────────────────────────────────
function parseInserts(sql) {
  const rows = [];
  const BLOCK = /SELECT id INTO m_id FROM vr_measures\s+WHERE measure_type = '([^']+)' AND chamber = '([^']+)' AND congress = (\d+) AND number = '((?:[^']|'')+)'[\s\S]*?INSERT INTO vr_measure_issues\s*\(measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url\)\s*VALUES\s*\(m_id, '([^']+)', (\d+), (true|false), '([^']+)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)'\);/g;
  let m;
  while ((m = BLOCK.exec(sql))) {
    rows.push({
      measureType: m[1], chamber: m[2], congress: Number(m[3]), number: m[4].replace(/''/g, "'"),
      issueKey: m[5], weight: Number(m[6]), isPrimary: m[7] === "true", supportMeaning: m[8],
      rationale: m[9].replace(/''/g, "'"), sourceUrl: m[10].replace(/''/g, "'"),
    });
  }
  return rows;
}
const INSERTS = parseInserts(SQL);
const RAW_INSERTS = (SQL.match(/INSERT\s+INTO\s+vr_measure_issues/gi) || []).length;
must(INSERTS.length > 0, "no mapping INSERT parsed out of the migration");

// ── the archive's own text for a measure ─────────────────────────────────────
// The ledger snapshots each act's stored title, short title and summary. The
// snapshot is only admissible if the archive already carries the same words:
// the identity file, or an applied migration that wrote the measure.
const IDENTITY = J("db/vr-measure-identity.json").measures;
const OTHER_MIGRATIONS = readdirSync(join(ROOT, MIG_DIR))
  .filter((f) => f.endsWith(".sql") && f !== MIG)
  .map((f) => R(join(MIG_DIR, f)).replace(/''/g, "'"));
const archiveCarries = (number, congress, phrase) => {
  const id = IDENTITY.find((m) => m.number === number && m.congress === congress);
  if (id && [id.title, id.shortTitle, id.summary].filter(Boolean).join(" ").indexOf(phrase) >= 0) return true;
  return OTHER_MIGRATIONS.some((src) => src.indexOf(number) >= 0 && src.indexOf(phrase) >= 0);
};
const ownText = (ledger, number, congress) => {
  const m = ledger.measures[`${number}|${congress}`];
  return m ? [m.title, m.shortTitle, m.summary].filter(Boolean).join(" ") : "";
};

// Keys an applied mapping migration has already written — "a key the archive has".
const USED_KEYS = new Set();
for (const src of OTHER_MIGRATIONS) {
  for (const m of src.matchAll(/vr_measure_issues[\s\S]{0,400}?\(\s*(?:m_id|[a-z_]+|\d+)\s*,\s*'([a-z0-9_]+)'/g)) USED_KEYS.add(m[1]);
  for (const m of src.matchAll(/issue_key\s*=\s*'([a-z0-9_]+)'/g)) USED_KEYS.add(m[1]);
}
must(USED_KEYS.size > 50, `only ${USED_KEYS.size} mapped keys harvested from applied migrations — the harvest has gone blind`);

// ── the cap: rank by members reached, file the first 25, hold the rest ───────
function selectForFiling(qualifying, cap = CAP) {
  const ranked = [...qualifying].sort((a, b) =>
    b.members - a.members || a.number.localeCompare(b.number) || a.wouldJoin.localeCompare(b.wouldJoin));
  return { filed: ranked.slice(0, cap), held: ranked.slice(cap) };
}

// ── the validator — every rule in one place, so the teeth can bite it ────────
function validate(ledger, inserts) {
  const errs = [];
  const key = (r) => `${r.number}|${r.congress}|${r.wouldJoin ?? r.issueKey}`;
  const filedBy = new Map(ledger.filed.map((f) => [key(f), f]));

  if (ledger.filed.length > CAP) errs.push(`cap: ${ledger.filed.length} filed, more than ${CAP}`);
  if (inserts.length > CAP) errs.push(`cap: ${inserts.length} rows inserted, more than ${CAP}`);
  if (inserts.length !== ledger.filed.length) errs.push(`migration inserts ${inserts.length} rows, ledger files ${ledger.filed.length}`);

  for (const [kind, list] of [["held", ledger.held], ["declined", ledger.declined || []]]) {
    for (const h of list) {
      if (inserts.some((r) => key(r) === key(h))) errs.push(`${kind} ${key(h)} is inserted`);
      if (filedBy.has(key(h))) errs.push(`${kind} ${key(h)} is also listed as filed`);
    }
  }

  const byAct = new Map();
  for (const r of inserts) {
    const f = filedBy.get(key(r));
    if (!f) { errs.push(`insert ${key(r)} is not a filed ledger row`); continue; }
    const text = ownText(ledger, r.number, r.congress);
    const m = ledger.measures[`${r.number}|${r.congress}`];
    if (!m) { errs.push(`${key(r)}: no stored text for the measure in the ledger`); continue; }
    if (r.isPrimary) errs.push(`${key(r)} is written is_primary = true`);
    if (!f.phrase || text.indexOf(f.phrase) < 0) errs.push(`${key(r)}: phrase "${f.phrase}" is not in the measure's own text`);
    else if (!archiveCarries(r.number, r.congress, f.phrase)) errs.push(`${key(r)}: phrase "${f.phrase}" is not in the archive's record of the measure`);
    if (r.rationale.indexOf(f.phrase) < 0) errs.push(`${key(r)}: rationale does not quote its phrase`);
    if (!ALLOW.has(r.issueKey)) errs.push(`${key(r)}: ${r.issueKey} is a new issue key (not in db/issue-keys.json)`);
    else if (!USED_KEYS.has(r.issueKey)) errs.push(`${key(r)}: ${r.issueKey} holds no mapping anywhere in the archive`);
    if (m.rows.some((x) => x.issueKey === r.issueKey)) errs.push(`${key(r)}: the measure already holds this key`);
    const secondary = m.rows.filter((x) => !x.isPrimary).map((x) => x.weight);
    if (!secondary.length) errs.push(`${key(r)}: the act has no secondary row to bound the weight`);
    else if (r.weight > Math.max(...secondary)) errs.push(`${key(r)}: weight ${r.weight} is above every secondary row (${Math.max(...secondary)})`);
    if (f.weight !== r.weight || f.supportMeaning !== r.supportMeaning || f.measureType !== r.measureType || f.chamber !== r.chamber)
      errs.push(`${key(r)}: migration and ledger disagree on weight, polarity or identity`);
    if (!/^https:\/\/\S+$/.test(r.sourceUrl)) errs.push(`${key(r)}: no https source`);
    const k = `${r.number}|${r.congress}`;
    byAct.set(k, [...(byAct.get(k) || []), r.issueKey]);
  }

  for (const [k, added] of byAct) {
    const m = ledger.measures[k];
    if (!m) continue;
    const before = m.rows.map((x) => x.issueKey);
    const axBefore = measureAxis(before);
    const axAfter = measureAxis([...before, ...added]);
    if (axBefore.winners.join(",") !== axAfter.winners.join(","))
      errs.push(`${k}: the dominant category moved (${axBefore.winners} → ${axAfter.winners})`);
    for (const a of added) {
      if (axBefore.winners.includes(categoryOf(a)) || axAfter.onAxisKeys.includes(a))
        errs.push(`${k}: ${a} would be on-axis, not off-axis`);
    }
    for (const p of m.rows.filter((x) => x.isPrimary)) {
      if (axBefore.onAxisKeys.includes(p.issueKey) && !axAfter.onAxisKeys.includes(p.issueKey))
        errs.push(`${k}: existing primary ${p.issueKey} flipped to off-axis`);
    }
  }
  return errs;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the migration writes exactly the ledger's filed rows, and nothing else");
eq(RAW_INSERTS, INSERTS.length, "every INSERT INTO vr_measure_issues parses into a full row");
ok(!/\bUPDATE\s+vr_measure_issues\b/i.test(SQL), "no existing mapping row is updated");
ok(!/\bDELETE\s+FROM\s+vr_measure_issues\b/i.test(SQL), "no mapping row is deleted");
ok(!/is_primary\s*=\s*true|,\s*true\s*,\s*'yea_/i.test(SQL), "no row is written is_primary = true");
ok(!/\bdd_issue_keys\b/.test(SQL), "no issue key is added to the vocabulary table");
ok(!/\bINSERT\s+INTO\s+vr_(measures|rollcalls|member_votes)\b/i.test(SQL), "no measure, roll call or member vote is written");
ok(/^-- pack-generation: (derived|purge) — /m.test(SQL), "the migration declares its pack-generation step");
eq(LEDGER.cap, CAP, "the ledger records the cap");
eq(LEDGER.scan.filed, LEDGER.filed.length, "the scan count matches the filed list");
eq(LEDGER.scan.held, LEDGER.held.length, "the scan count matches the held list");
eq(LEDGER.scan.declined, LEDGER.declined.length, "the scan count matches the declined list");
eq(LEDGER.scan.notFiledOnAxis, LEDGER.notFiled.length, "the scan count matches the not-filed list");
eq(LEDGER.scan.namedCandidates, LEDGER.filed.length + LEDGER.held.length + LEDGER.declined.length + LEDGER.notFiled.length,
  "every named candidate is reported, filed or not");

section("2–6 · phrase, key, axis, weight and cap hold on the shipped pass");
const real = validate(LEDGER, INSERTS);
eq(real.join(" | "), "", "the shipped rider audit passes every rule");
for (const f of LEDGER.filed) {
  ok(f.isPrimary === false, `${f.number} → ${f.wouldJoin} is filed is_primary false`);
  ok(f.sitsOn && f.existingKeys.includes(f.sitsOn), `${f.number} → ${f.wouldJoin} names the leaf it already sits on`);
  ok(!f.existingKeys.includes(f.wouldJoin), `${f.number} → ${f.wouldJoin} was not already on that leaf`);
}
// Every candidate, filed or not, names its act, its current leaf, the leaf it
// would join and the phrase — and that phrase is in the act's own text.
for (const c of [...LEDGER.filed, ...LEDGER.held, ...LEDGER.declined, ...LEDGER.notFiled]) {
  ok(c.number && c.sitsOn && c.wouldJoin && c.phrase, `${c.number} → ${c.wouldJoin} is reported in full`);
  ok(ALLOW.has(c.wouldJoin), `${c.number} → ${c.wouldJoin} names a key the archive already has`);
  ok(archiveCarries(c.number, c.congress, c.phrase) || (c.utahSession && OTHER_MIGRATIONS.some((s) => s.indexOf(c.phrase) >= 0)),
    `${c.number} → ${c.wouldJoin}: "${c.phrase}" is in the archive's own record of the act`);
}
for (const h of [...LEDGER.held, ...LEDGER.declined])
  ok(typeof h.reason === "string" && h.reason.length > 20, `${h.decision} ${h.number} → ${h.wouldJoin} says why`);
for (const h of LEDGER.held) ok(/\bcap\b/.test(h.reason), `held ${h.number} → ${h.wouldJoin} is held for the cap`);
for (const n of LEDGER.notFiled) ok(/^on-axis: /.test(n.reason), `not-filed ${n.number} → ${n.wouldJoin} is refused for being on-axis`);
// The ranking: what is filed is what the selector would file from what qualified.
const capHeld = LEDGER.held.filter((h) => /\bcap\b/.test(h.reason));
const sel = selectForFiling([...LEDGER.filed, ...capHeld]);
eq(sel.filed.map((f) => `${f.number}|${f.wouldJoin}`).sort().join(","),
  LEDGER.filed.map((f) => `${f.number}|${f.wouldJoin}`).sort().join(","),
  "the filed rows are the top 25 by members reached");

section("7 · the teeth");
const clone = (x) => JSON.parse(JSON.stringify(x));
const bites = (errs, re, msg) => ok(errs.some((e) => re.test(e)), `${msg} — validator said: ${errs.join(" | ") || "nothing"}`);
{
  // A row whose phrase is not in the act's own text.
  const L = clone(LEDGER);
  L.filed[0].phrase = "expands rural broadband to every county";
  bites(validate(L, INSERTS), /is not in the measure's own text/, "a row with no justifying phrase fails");
}
{
  // A row on an issue key the archive does not have.
  const L = clone(LEDGER), rows = clone(INSERTS);
  L.filed[0].wouldJoin = rows[0].issueKey = "rider_invented_key";
  bites(validate(L, rows), /new issue key/, "a new issue key fails");
}
{
  // Enough rows in one new category to outvote the act's own: S.Amdt. 1354's
  // gun_rights primary sits in guns (2 keys); three climate_energy rows take
  // the axis and push the primary off it.
  const L = clone(LEDGER), rows = clone(INSERTS);
  const base = L.filed.find((f) => f.number === "S.Amdt. 1354");
  must(base, "S.Amdt. 1354 is no longer a filed act — re-aim the flip tooth");
  for (const k of ["climate_action", "energy_production", "water"]) {
    L.filed.push({ ...base, wouldJoin: k, phrase: base.phrase });
    rows.push({ ...rows.find((r) => r.number === "S.Amdt. 1354"), issueKey: k });
  }
  bites(validate(L, rows), /existing primary gun_rights flipped to off-axis/, "an existing primary flipped to off-axis fails");
}
{
  // A row that would sit in the act's own dominant category is on-axis.
  const L = clone(LEDGER), rows = clone(INSERTS);
  const i = rows.findIndex((r) => r.number === "H.R. 1968");
  must(i >= 0, "H.R. 1968 is no longer a filed act — re-aim the on-axis tooth");
  const f = L.filed.find((x) => x.number === "H.R. 1968");
  f.wouldJoin = rows[i].issueKey = "gov_waste";
  bites(validate(L, rows), /would be on-axis/, "an on-axis row fails");
}
{
  // A weight above every secondary row on the act.
  const L = clone(LEDGER), rows = clone(INSERTS);
  rows[0].weight = L.filed[0].weight = 100;
  bites(validate(L, rows), /above every secondary row/, "a row outweighing the act's secondaries fails");
}
{
  // A 26th row.
  const L = clone(LEDGER), rows = clone(INSERTS);
  while (rows.length <= CAP) { rows.push(clone(rows[0])); L.filed.push(clone(L.filed[0])); }
  bites(validate(L, rows), /^cap: /, "a 26th filed row fails the cap");
}
{
  // The selector files 25 and holds the rest, by members reached.
  const pool = Array.from({ length: 31 }, (_, i) => ({ number: `H.R. ${9000 + i}`, wouldJoin: "veterans", members: 100 + i }));
  const s = selectForFiling(pool);
  eq(s.filed.length, CAP, "thirty-one qualifying candidates file exactly 25");
  eq(s.held.length, 6, "…and hold the other six");
  ok(Math.min(...s.filed.map((x) => x.members)) > Math.max(...s.held.map((x) => x.members)),
    "…and the 25 filed reach more members than any held one");
}
{
  // A held candidate slipped into the inserts: move a filed row to held (as the
  // cap would) and leave its INSERT in place.
  const L = clone(LEDGER), rows = clone(INSERTS);
  const h = L.filed.pop();
  L.held.push({ ...h, decision: "held", reason: "held for the cap: ranked below the 25 filed" });
  bites(validate(L, rows), /^held .* is inserted/, "a held candidate that is inserted fails");
}
{
  // A declined candidate slipped into the inserts.
  const L = clone(LEDGER), rows = clone(INSERTS);
  const d = L.declined[0];
  must(d, "no declined candidate left to test");
  rows.push({ ...rows[0], number: d.number, congress: d.congress, issueKey: d.wouldJoin });
  bites(validate(L, rows), /^declined .* is inserted/, "a declined candidate that is inserted fails");
}
{
  // A primary written into the migration.
  const rows = clone(INSERTS);
  rows[0].isPrimary = true;
  bites(validate(LEDGER, rows), /is_primary = true/, "a row written as primary fails");
}

console.log(`\n   ${LEDGER.filed.length} filed · ${LEDGER.held.length} held · ${LEDGER.declined.length} declined · ${LEDGER.notFiled.length} named but on-axis`);
if (failures.length) {
  console.error(`\n  ✗ rider audit: ${failures.length} failed, ${passed} passed\n`);
  for (const f of failures) console.error("    · " + f);
  process.exit(1);
}
console.log(`\n  ✓ rider audit: ${passed} passed\n`);
