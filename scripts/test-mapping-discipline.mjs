#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Mapping discipline — procedural rules stay unmapped, and every curated mapping
// is sourced
// ─────────────────────────────────────────────────────────────────────────────
// THE TWO BUG CLASSES THIS EXISTS TO PREVENT
//
// 1. A "Providing for consideration of…" resolution gets an issue mapping.
//
//    A rule resolution is a floor-procedure vote, whipped on party lines and taken
//    BEFORE anyone has voted on the policy inside the bills it queues. Mapping one
//    reads whip discipline as conviction: every member of the majority collects a
//    "consistent" receipt on whatever issue the underlying bill touches, and every
//    member of the minority collects a contradiction, for a vote that expressed a
//    position on scheduling. db/vr-ingest-runbook.md calls this out as one of the
//    two backwards-verdict traps ("Rules are not policy") and three separate
//    curation passes have declined the same nine rows on it.
//
//    Nothing in the schema or the ingest stops it. `vr_measure_issues` will take a
//    row for any measure_id, and a rule resolution looks exactly like a resolution
//    to every validator we have. The only thing standing between the corpus and a
//    plausible-looking rule mapping is that somebody remembers the rule — which is
//    precisely the kind of guarantee that decays. Hence a test.
//
//    The nine rows are also the single largest block of unmapped measures with
//    votes (540 member-votes), so anyone optimising a coverage number will find
//    them first and they will look like the obvious win. This harness is aimed
//    squarely at that future pass, including when it is one of us.
//
// 2. A curated mapping ships without a rationale or without a primary source.
//
//    A mapping asserts that a member's vote means something about an issue. The
//    rationale is the reasoning and the source URL is the evidence; a mapping with
//    neither is an unfalsifiable claim rendered as a receipt on someone's profile.
//    Both fields are nullable in the schema, so nothing else enforces this.
//
//   node scripts/test-mapping-discipline.mjs
//
// Exit code is non-zero on the first failure so it can gate CI.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIG = join(ROOT, "netlify/database/migrations");

let passed = 0;
const failures = [];
function ok(cond, msg) { if (cond) passed++; else failures.push(msg); }

// ── quote-aware SQL primitives ───────────────────────────────────────────────
// Rationales legitimately contain '--', ';' and ',', so every scan here is
// quote-aware. A naive split silently truncates, and under-reporting in a guard
// like this one is worse than no guard at all.
function stripComments(src) {
  let out = "", i = 0, q = false;
  while (i < src.length) {
    if (q) {
      if (src[i] === "'") { if (src[i + 1] === "'") { out += "''"; i += 2; continue; } q = false; }
      out += src[i++]; continue;
    }
    if (src[i] === "'") { q = true; out += src[i++]; continue; }
    if (src[i] === "-" && src[i + 1] === "-") { while (i < src.length && src[i] !== "\n") i++; continue; }
    out += src[i++];
  }
  return out;
}
function stmtEnd(s, from) {
  let q = false;
  for (let i = from; i < s.length; i++) {
    if (q) { if (s[i] === "'") { if (s[i + 1] === "'") i++; else q = false; } continue; }
    if (s[i] === "'") { q = true; continue; }
    if (s[i] === ";") return i;
  }
  return s.length;
}
function tuplesFrom(txt, start) {
  const tup = [];
  let depth = 0, cur = "", q = false;
  for (let i = start; i < txt.length; i++) {
    const c = txt[i];
    if (q) { cur += c; if (c === "'") { if (txt[i + 1] === "'") cur += txt[++i]; else q = false; } continue; }
    if (c === "'") { q = true; cur += c; continue; }
    if (c === "(") { depth++; if (depth === 1) { cur = ""; continue; } }
    if (c === ")") { depth--; if (depth === 0) { tup.push(cur); continue; } if (depth < 0) break; }
    if (depth >= 1) cur += c;
  }
  return tup.map(splitFields);
}
function splitFields(t) {
  const f = []; let d = 0, s = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { s += c; if (c === "'") { if (t[i + 1] === "'") s += t[++i]; else q = false; } continue; }
    if (c === "'") { q = true; s += c; continue; }
    if (c === "(") d++;
    if (c === ")") d--;
    if (c === "," && d === 0) { f.push(s.trim()); s = ""; continue; }
    s += c;
  }
  f.push(s.trim());
  return f;
}
const unq = (s) => s.slice(1, -1).replace(/''/g, "'");
const isLit = (s) => typeof s === "string" && s[0] === "'";

// ── which measure numbers does a file MAP? ───────────────────────────────────
// Block-level attribution is not good enough here: the big seed migrations create
// rule resolutions and map unrelated bills inside the same DO block, so "this block
// mentions H.Res. 1438" says nothing about what got mapped. Resolution is therefore
// by measure_id expression, back through whichever binding produced it.
//
// Four binding shapes exist in the corpus, and all four are handled:
//   (a) FOR m IN SELECT id FROM vr_measures WHERE number = 'X' … LOOP   → m.id
//   (b) SELECT id INTO m_x FROM vr_measures WHERE … number = 'X'        → m_x
//   (c) INSERT INTO vr_measures (…, number, …) VALUES (…,'X',…) RETURNING id INTO v
//   (d) a VALUES-driven loop: SELECT id INTO mid … WHERE number = r.num, where
//       `num` is a column of an `AS t(num, …)` table — resolved to its literals
//   plus an inline (SELECT id FROM vr_measures WHERE number = 'X') in the tuple.
//
// Bindings are positional (nearest preceding), because `m` and `mid` are reused
// many times per file.
export function scanMappedMeasures(src, label = "<sql>") {
  const s = stripComments(src);
  const lineAt = (pos) => s.slice(0, pos).split("\n").length;
  const mapped = [];
  const unresolved = [];
  const binds = [];

  // Every `AS t(a, b, c)` alias list, so `r.num` can be resolved to its literals.
  const valueTables = [];
  for (const m of s.matchAll(/\bAS\s+\w+\s*\(([^)]*)\)/g)) {
    const cols = m[1].split(",").map((x) => x.trim());
    const open = s.lastIndexOf("(VALUES", m.index);
    if (open < 0) continue;
    valueTables.push({ cols, rows: tuplesFrom(s, open + "(VALUES".length), pos: m.index });
  }
  const resolveField = (field, pos) => {
    const t = valueTables.filter((v) => v.cols.includes(field) && v.pos > pos).shift()
      || valueTables.filter((v) => v.cols.includes(field)).pop();
    if (!t) return null;
    const idx = t.cols.indexOf(field);
    const out = [];
    for (const row of t.rows) {
      const cell = row[idx];
      if (cell === undefined || !isLit(cell)) return null;  // refuse to guess
      out.push(unq(cell));
    }
    return out.length ? out : null;
  };

  // (a) FOR <var> IN SELECT … FROM vr_measures … LOOP
  for (const m of s.matchAll(/\bFOR\s+(\w+)\s+IN\s+SELECT\b[\s\S]{0,400}?\bFROM\s+vr_measures\b([\s\S]{0,400}?)\bLOOP\b/g)) {
    for (const n of numbersIn(m[2], m.index, resolveField)) binds.push({ v: m[1], pos: m.index, num: n });
  }
  // (b) + (d) SELECT id INTO <var> FROM vr_measures …
  for (const m of s.matchAll(/\bINTO\s+(\w+)\s*\bFROM\s+vr_measures\b([^;]{0,600})/g)) {
    for (const n of numbersIn(m[2], m.index, resolveField)) binds.push({ v: m[1], pos: m.index, num: n });
  }
  // (c) INSERT INTO vr_measures (…) VALUES (…) RETURNING id INTO <var>
  for (const m of s.matchAll(/INSERT INTO vr_measures\s*\(([^)]*)\)\s*VALUES/g)) {
    const cols = m[1].split(",").map((x) => x.trim());
    const ni = cols.indexOf("number");
    const stmt = s.slice(m.index + m[0].length, stmtEnd(s, m.index));
    const ret = stmt.match(/RETURNING\s+id\s+INTO\s+(\w+)/i);
    if (ni < 0 || !ret) continue;
    for (const row of tuplesFrom("(" + stmt.slice(0, ret.index).replace(/^\s*\(?/, ""), 0)) {
      const cell = row[ni];
      if (isLit(cell)) binds.push({ v: ret[1], pos: m.index, num: unq(cell) });
    }
  }
  const bindFor = (v, pos) => {
    let best = null;
    for (const b of binds) if (b.v === v && b.pos < pos && (!best || b.pos > best.pos)) best = b;
    return best;
  };

  for (const m of s.matchAll(/INSERT INTO vr_measure_issues\s*\(([^)]*)\)\s*VALUES/g)) {
    const cols = m[1].split(",").map((x) => x.trim());
    const mi = cols.indexOf("measure_id");
    if (mi < 0) continue;
    let body = s.slice(m.index + m[0].length, stmtEnd(s, m.index));
    // A trailing ON CONFLICT (…) would otherwise parse as a value tuple.
    const oc = body.search(/\bON\s+CONFLICT\b/i);
    if (oc >= 0) body = body.slice(0, oc);
    for (const row of tuplesFrom("(" + body.replace(/^\s*\(?/, ""), 0)) {
      const cell = (row[mi] || "").trim();
      if (!cell) continue;
      const inline = cell.match(/SELECT\s+id\s+FROM\s+vr_measures[\s\S]*?number\s*=\s*'((?:[^']|'')*)'/i);
      if (inline) { mapped.push({ number: inline[1].replace(/''/g, "'"), line: lineAt(m.index) }); continue; }
      const v = cell.replace(/\.id$/, "").trim();
      const b = /^\w+$/.test(v) ? bindFor(v, m.index) : null;
      if (b) {
        // A positional binding resolves to whichever numbers that binding carried.
        for (const bb of binds.filter((x) => x.v === b.v && x.pos === b.pos)) {
          mapped.push({ number: bb.num, line: lineAt(m.index) });
        }
      } else {
        // A shape we cannot read is a hole in the guard, not a pass.
        unresolved.push({ expr: cell, line: lineAt(m.index), label });
      }
    }
  }
  return { mapped, unresolved };
}

// Number literals in a WHERE fragment, resolving `number = r.field` through the
// nearest VALUES table.
function numbersIn(frag, pos, resolveField) {
  const out = [];
  for (const m of frag.matchAll(/\bnumber\s*=\s*'((?:[^']|'')*)'/g)) out.push(m[1].replace(/''/g, "'"));
  for (const m of frag.matchAll(/\bnumber\s*=\s*\w+\.(\w+)/g)) {
    const r = resolveField(m[1], pos);
    if (r) out.push(...r);
  }
  return out;
}

// ── the rule-resolution roster ───────────────────────────────────────────────
// Derived from titles wherever we hold them — the vote seeds, the identity file and
// the migrations that create measures — so a rule ingested next month is covered
// without anyone editing this file. The hard-coded list underneath is the floor:
// the nine rows three curation passes have already declined, kept literal so that
// refactoring a data file cannot quietly shrink the guard to nothing.
const RULE_TITLE = /providing for consideration of/i;
const KNOWN_RULES = [
  "H.Res. 377",    // 2 rows, wave-2 skip ledger
  "H.Res. 682",
  "H.Res. 916",
  "H.Res. 1075",
  "H.Res. 1398",
  "H.Res. 1423",
  "H.Res. 1438",
];

const ruleNumbers = new Set(KNOWN_RULES);
const titled = [];            // {number, title} pairs found anywhere
function harvestJson(node) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { node.forEach(harvestJson); return; }
  const n = node.number || node.measureNumber;
  const t = node.title || node.measureTitle || node.officialTitle || node.correctTitle;
  if (typeof n === "string" && typeof t === "string") titled.push({ number: n, title: t });
  for (const v of Object.values(node)) harvestJson(v);
}
for (const f of ["db/vr-house-seed-119-s2.json", "db/vr-house-seed-119-s2-earlier.json",
                 "db/vr-senate-seed.json", "db/vr-measure-identity.json"]) {
  const p = join(ROOT, f);
  if (existsSync(p)) harvestJson(JSON.parse(readFileSync(p, "utf8")));
}

const files = readdirSync(MIG).filter((f) => f.endsWith(".sql")).sort();
ok(files.length > 0, `found ${files.length} migration files to scan`);

// Titles written by migrations: a (number, title) pair inside one INSERT tuple.
for (const f of files) {
  const s = stripComments(readFileSync(join(MIG, f), "utf8"));
  for (const m of s.matchAll(/INSERT INTO vr_measures\s*\(([^)]*)\)\s*VALUES/g)) {
    const cols = m[1].split(",").map((x) => x.trim());
    const ni = cols.indexOf("number"), ti = cols.indexOf("title");
    if (ni < 0 || ti < 0) continue;
    for (const row of tuplesFrom("(" + s.slice(m.index + m[0].length, stmtEnd(s, m.index)).replace(/^\s*\(?/, ""), 0)) {
      if (isLit(row[ni]) && isLit(row[ti])) titled.push({ number: unq(row[ni]), title: unq(row[ti]) });
    }
  }
}
const harvested = new Set();
for (const { number, title } of titled) if (RULE_TITLE.test(title)) { ruleNumbers.add(number); harvested.add(number); }

// The title sweep is what keeps this guard current: a rule ingested next month is
// covered without anyone editing KNOWN_RULES. If it ever stops finding anything,
// the roster has silently collapsed to the hard-coded floor and new rules are
// unprotected — so an empty harvest is a failure, not a quiet pass.
ok(harvested.size > 0,
  `the title sweep found 0 "providing for consideration" measures across ${titled.length} titled\n` +
  `    measures, so only the ${KNOWN_RULES.length} hard-coded rules are protected. Check that the vote\n` +
  `    seeds and db/vr-measure-identity.json still carry measure titles in a shape harvestJson() reads.`);
ok(ruleNumbers.size >= KNOWN_RULES.length,
  `rule roster covers the known ledger (${ruleNumbers.size} numbers: ${KNOWN_RULES.length} hard-coded, ` +
  `${harvested.size} harvested from ${titled.length} titled measures)`);

for (const k of KNOWN_RULES) ok(ruleNumbers.has(k), `known rule resolution ${k} is in the roster`);

// ── 1. no rule resolution is mapped, in any migration ────────────────────────
const mappedByNumber = new Map();   // number -> [{file, line}]
const allUnresolved = [];
for (const f of files) {
  const { mapped, unresolved } = scanMappedMeasures(readFileSync(join(MIG, f), "utf8"), f);
  allUnresolved.push(...unresolved);
  for (const r of mapped) {
    if (!mappedByNumber.has(r.number)) mappedByNumber.set(r.number, []);
    mappedByNumber.get(r.number).push({ file: f, line: r.line });
  }
}

const mappedRules = [...mappedByNumber.keys()].filter((n) => ruleNumbers.has(n));
ok(mappedRules.length === 0,
  `${mappedRules.length} procedural rule resolution(s) carry an issue mapping in a migration.\n` +
  `    A "providing for consideration" vote is floor scheduling whipped on party lines — mapping\n` +
  `    one records whip discipline as a policy conviction for every member who voted on it.\n` +
  `    See db/vr-ingest-runbook.md, "Rules are not policy". Leave them unmapped:\n` +
  mappedRules.map((n) => `      ${n.padEnd(16)} ${mappedByNumber.get(n).map((h) => h.file + ":~" + h.line).join(", ")}`).join("\n"));

ok(allUnresolved.length === 0,
  `${allUnresolved.length} measure_id expression(s) could not be resolved to a measure number, so the\n` +
  `    rows they insert are NOT covered by this check. Teach scanMappedMeasures() the new shape:\n` +
  allUnresolved.map((u) => `      ${u.expr}  ${u.label}:~${u.line}`).join("\n"));

ok(mappedByNumber.size > 50,
  `resolved issue mappings for ${mappedByNumber.size} distinct measures across ${files.length} migrations`);

// ── 2. the curated seed: no rules, and every row is reasoned and sourced ─────
const seed = JSON.parse(readFileSync(join(ROOT, "db/vr-issue-seed.json"), "utf8"));
const seedMeasures = Array.isArray(seed) ? seed : seed.measures || [];
let seedRows = 0;
for (const m of seedMeasures) {
  ok(!ruleNumbers.has(m.number),
    `db/vr-issue-seed.json maps ${m.number}, a "providing for consideration" rule resolution — ` +
    `rules are floor procedure, not policy`);
  for (const iss of m.issues || []) {
    seedRows++;
    const where = `${m.number}/${iss.issueKey}`;
    ok(typeof iss.rationale === "string" && iss.rationale.trim().length >= 20,
      `db/vr-issue-seed.json ${where} has no usable rationale — a mapping asserts what a vote means, ` +
      `so the reasoning has to ship with it`);
    const src = iss.sourceUrl || m.sourceUrl;
    ok(typeof src === "string" && /^https:\/\/\S+$/.test(src),
      `db/vr-issue-seed.json ${where} has no https primary source (got: ${src || "none"})`);
  }
}
ok(seedRows > 0, `checked ${seedRows} curated mappings in db/vr-issue-seed.json`);

// ── 3. negative self-tests ───────────────────────────────────────────────────
// Without these, a refactor that quietly broke the scanner would leave the harness
// reporting all-green forever — which is the exact failure mode it exists to stop.
{
  const plantedLoop = `
    DO $$ DECLARE m record; BEGIN
      FOR m IN SELECT id FROM vr_measures WHERE number = 'H.Res. 1438' AND congress = 119 LOOP
        INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
          (m.id, 'border_security', 90, true, 'yea_supports', 'Rule for a border bill; has a comma, a semicolon; and -- a fake comment')
        ON CONFLICT (measure_id, issue_key) DO NOTHING;
      END LOOP;
    END $$;
  `;
  const a = scanMappedMeasures(plantedLoop, "<planted-loop>");
  ok(a.mapped.some((r) => r.number === "H.Res. 1438"),
    "self-test: a rule mapped through a FOR … LOOP binding is detected");
  ok(a.unresolved.length === 0, "self-test: the loop shape resolves rather than falling through");
  ok(a.mapped.length === 1,
    `self-test: the rationale's comma/semicolon/'--' do not create phantom rows (got ${a.mapped.length})`);

  const plantedVar = `
    DO $$ DECLARE m_rule integer; BEGIN
      SELECT id INTO m_rule FROM vr_measures WHERE congress = 119 AND number = 'H.Res. 916' LIMIT 1;
      INSERT INTO vr_measure_issues (measure_id, issue_key, weight) VALUES (m_rule, 'gov_transparency', 50);
    END $$;
  `;
  ok(scanMappedMeasures(plantedVar, "<planted-var>").mapped.some((r) => r.number === "H.Res. 916"),
    "self-test: a rule mapped through a SELECT … INTO variable is detected");

  const plantedReturning = `
    DO $$ DECLARE v integer; BEGIN
      INSERT INTO vr_measures (congress, chamber, number, title) VALUES
        (119, 'house', 'H.Res. 682', 'Providing for consideration of the bill (H.R. 1)')
      RETURNING id INTO v;
      INSERT INTO vr_measure_issues (measure_id, issue_key, weight) VALUES (v, 'cut_spending', 60);
    END $$;
  `;
  ok(scanMappedMeasures(plantedReturning, "<planted-returning>").mapped.some((r) => r.number === "H.Res. 682"),
    "self-test: a rule mapped through RETURNING id INTO is detected");

  const plantedTable = `
    DO $$ DECLARE r record; mid integer; BEGIN
      FOR r IN SELECT * FROM (VALUES ('H.Res. 1075', 119, 'gov_waste')) AS t(num, cg, k) LOOP
        SELECT id INTO mid FROM vr_measures WHERE number = r.num AND congress = r.cg LIMIT 1;
        INSERT INTO vr_measure_issues (measure_id, issue_key, weight) VALUES (mid, r.k, 40);
      END LOOP;
    END $$;
  `;
  const d = scanMappedMeasures(plantedTable, "<planted-table>");
  ok(d.mapped.some((r) => r.number === "H.Res. 1075"),
    "self-test: a rule mapped through a VALUES-driven loop (r.num) is detected");
  ok(d.unresolved.length === 0, "self-test: the VALUES-table shape resolves rather than falling through");

  const plantedUnreadable = `
    DO $$ BEGIN
      INSERT INTO vr_measure_issues (measure_id, issue_key, weight) VALUES (some_unbound_var, 'cut_spending', 40);
    END $$;
  `;
  ok(scanMappedMeasures(plantedUnreadable, "<planted-unreadable>").unresolved.length === 1,
    "self-test: an unreadable measure_id is reported, not silently passed");

  // Creating a rule resolution as a measure is fine and expected — the seed
  // migrations do it for all nine. Only MAPPING one is the offence.
  const plantedCreateOnly = `
    DO $$ DECLARE v integer; BEGIN
      INSERT INTO vr_measures (congress, chamber, number, title) VALUES
        (119, 'house', 'H.Res. 1423', 'Providing for consideration of the bill (H.R. 8800)')
      RETURNING id INTO v;
      INSERT INTO vr_rollcalls (measure_id, chamber, roll_number) VALUES (v, 'house', 236);
    END $$;
  `;
  ok(scanMappedMeasures(plantedCreateOnly, "<planted-create>").mapped.length === 0,
    "self-test: creating a rule resolution without mapping it is not flagged");
}

// ── report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ mapping discipline: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  ✗ " + f);
  console.error("");
  process.exit(1);
}
console.log(`✓ mapping discipline: all ${passed} assertions passed`);
console.log(`  ${mappedByNumber.size} mapped measures across ${files.length} migrations · ` +
  `${seedRows} curated rows, all reasoned and sourced · ` +
  `${ruleNumbers.size} rule resolutions on the roster, 0 mapped`);
