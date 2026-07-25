#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Issue-key integrity — no row may reference an issue key the client can't render
// ─────────────────────────────────────────────────────────────────────────────
// THE BUG CLASS THIS EXISTS TO PREVENT
//
// `issue_key` is a free-text column (db/schema.ts:705, :870). Nothing in Postgres
// constrains it to the ISSUE_MAP vocabulary, and the read path deliberately drops
// what it doesn't recognise rather than erroring:
//
//     if (!assertIssueKey(r.issueKey)) continue; // voting-record.mts:244
//
// So a typo'd or stale key does not crash, does not warn, and does not show up in
// any count — the mapping simply never reaches the client. It has happened twice:
//
//   1. `crypto` (S. 1582, w90) and `defense` (Hegseth confirmation, w100 PRIMARY)
//      were written by the wave-4 / wave-5 seeds instead of `crypto_cbdc` and
//      `strong_defense`. The Hegseth row was the measure's ONLY remaining issue
//      mapping, so that 51-50 confirmation attached to no issue at all and its
//      Distributional Impact rows routed nowhere (getIssueImpacts matches on
//      `primaryByMeasure.get(measureId) === issueKey`).
//   2. `crypto_cbdc` existed in ISSUE_MAP but was missing from db/issue-keys.json
//      because gen-issue-keys.mjs had not been re-run, so `?issue=crypto_cbdc`
//      400'd while the quiz still offered the option.
//
// Those are the two halves of one class: **the SQL, the generated allow-list, and
// ISSUE_MAP can drift apart silently.** This harness fails loudly on all three.
//
// WHY CHECKING THE MIGRATIONS IS SUFFICIENT
// Migrations are the only unguarded writer. The runtime ingest already validates
// before insert (`if (!ISSUE_KEYS.has(iss.issueKey))` — vr-ingest.ts:458), and the
// API validates on every read and query param. Hand-written SQL is the one path
// with no gate, so a static sweep over netlify/database/migrations is a superset of
// what could be in the live table.
//
//   node scripts/test-issue-key-integrity.mjs
//
// Exit code is non-zero on the first failure so it can gate CI.

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIG = join(ROOT, "netlify/database/migrations");
const KEYED_TABLES = ["vr_measure_issues", "vr_measure_provisions"];

let passed = 0;
const failures = [];
function ok(cond, msg) { if (cond) passed++; else failures.push(msg); }

// ── SQL text handling ────────────────────────────────────────────────────────
// Quote-aware throughout: rationales legitimately contain '--', ';' and ',', so a
// naive strip or split silently truncates and under-reports. Under-reporting is the
// one failure mode this harness must never have.
function stripComments(src) {
  let out = "", i = 0, inStr = false;
  while (i < src.length) {
    if (inStr) {
      if (src[i] === "'") { if (src[i + 1] === "'") { out += "''"; i += 2; continue; } inStr = false; }
      out += src[i++]; continue;
    }
    if (src[i] === "'") { inStr = true; out += src[i++]; continue; }
    if (src[i] === "-" && src[i + 1] === "-") { while (i < src.length && src[i] !== "\n") i++; continue; }
    out += src[i++];
  }
  return out;
}
function stmtEnd(src, from) {
  let inStr = false;
  for (let i = from; i < src.length; i++) {
    if (inStr) { if (src[i] === "'") { if (src[i + 1] === "'") i++; else inStr = false; } continue; }
    if (src[i] === "'") { inStr = true; continue; }
    if (src[i] === ";") return i;
  }
  return src.length;
}
// Split a `(VALUES (…),(…))` body into tuples, then each tuple into fields.
// `start` must land INSIDE the outer paren or the whole list parses as one tuple.
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
const isLiteral = (s) => typeof s === "string" && s[0] === "'";
const unq = (s) => s.slice(1, -1).replace(/''/g, "'");
// vr_measure_provisions.issue_key is nullable on purpose — the H.R. 1 SNAP provision
// deliberately carries no key. An explicit NULL is "no key", not an unreadable shape.
const isNoKey = (s) => /^(NULL|DEFAULT)$/i.test(String(s).trim());

// ── The checker ──────────────────────────────────────────────────────────────
// Returns { refs, unresolved, retirements }.
//
// Three write shapes are recognised, because the repo uses all three:
//   (a) literal in the issue_key column of an INSERT … VALUES ('border_security', …)
//   (b) a PL/pgSQL record field in that column (`r.k`), resolved back through the
//       `SELECT * FROM (VALUES …) AS t(num, cg, k, …)` table that feeds the loop
//   (c) UPDATE … SET issue_key = 'x'  /  SET issue_key = r.new_key
//
// A WHERE clause may name any key, including a broken or retired one — that is what
// a repair migration is FOR (`WHERE issue_key = 'crypto'`), so WHERE is not checked.
// Destinations are checked; sources are not.
//
// RETIREMENT is why this harness can be honest about history. An applied migration
// is never edited, so the bad literals stay in the seed files forever; flagging them
// forever would make the guard noise that gets ignored. A key is retired when a
// later migration removes every row that could hold it, table-scoped:
//
//     DELETE FROM vr_measure_issues WHERE issue_key = 'crypto';
//     UPDATE vr_measure_issues SET issue_key = 'x' WHERE issue_key = 'crypto';
//
// The predicate must be that equality ALONE. Anything narrower (`AND measure_id = …`,
// a NOT EXISTS guard) leaves rows behind, so it is deliberately not a retirement and
// the key stays flagged — which is the correct reading of a partial repair.
export function scanSql(src, label = "<sql>") {
  const s = stripComments(src);
  const lineAt = (pos) => s.slice(0, pos).split("\n").length;
  const refs = [];
  const unresolved = [];
  const retirements = [];

  // Every `AS t(a, b, c)` alias list in the file, with the tuples that feed it, so a
  // record field can be resolved to the literal column behind it.
  const valueTables = [];
  for (const m of s.matchAll(/\bAS\s+\w+\s*\(([^)]*)\)/g)) {
    const cols = m[1].split(",").map((x) => x.trim());
    const open = s.lastIndexOf("(VALUES", m.index);
    if (open < 0) continue;
    valueTables.push({ cols, rows: tuplesFrom(s, open + "(VALUES".length), pos: m.index });
  }
  // Resolve `r.k` → the literals in column `k` of the nearest preceding VALUES table.
  const resolveField = (expr, pos) => {
    const field = (expr.match(/^\w+\.(\w+)$/) || [])[1];
    if (!field) return null;
    const t = valueTables.filter((v) => v.cols.includes(field) && v.pos > pos).shift()
      || valueTables.filter((v) => v.cols.includes(field)).pop();
    if (!t) return null;
    const idx = t.cols.indexOf(field);
    const out = [];
    for (const row of t.rows) {
      const cell = row[idx];
      if (cell === undefined) return null;      // arity mismatch — refuse to guess
      if (!isLiteral(cell)) return null;
      out.push(unq(cell));
    }
    return out.length ? out : null;
  };

  // (a) + (b) — INSERT INTO <keyed table> (cols) VALUES …
  for (const table of KEYED_TABLES) {
    const re = new RegExp("INSERT INTO " + table + "\\s*\\(([^)]*)\\)\\s*VALUES", "g");
    for (const m of s.matchAll(re)) {
      const cols = m[1].split(",").map((x) => x.trim());
      const ki = cols.indexOf("issue_key");
      if (ki < 0) continue;
      let body = s.slice(m.index + m[0].length, stmtEnd(s, m.index));
      // A trailing `ON CONFLICT (measure_id, issue_key) DO NOTHING` would otherwise
      // parse as a value tuple and yield a phantom row keyed 'issue_key'.
      const oc = body.search(/\bON\s+CONFLICT\b/i);
      if (oc >= 0) body = body.slice(0, oc);
      for (const row of tuplesFrom("(" + body.replace(/^\s*\(?/, ""), 0)) {
        const cell = row[ki];
        if (cell === undefined || isNoKey(cell)) continue;
        if (isLiteral(cell)) { refs.push({ key: unq(cell), table, how: "insert", line: lineAt(m.index) }); continue; }
        const resolved = resolveField(cell, m.index);
        if (resolved) {
          for (const k of resolved) refs.push({ key: k, table, how: "insert via " + cell, line: lineAt(m.index) });
        } else {
          // Never pass silently on a shape we cannot read — that is exactly how the
          // orphans survived four audits.
          unresolved.push({ expr: cell, table, line: lineAt(m.index), label });
        }
      }
    }
  }

  // (c) — UPDATE <keyed table> … SET issue_key = <dest> [WHERE …]
  // Walked statement-by-statement rather than by a global /SET issue_key/ sweep, so
  // the destination is attributed to the right table and the WHERE clause is in hand.
  for (const m of s.matchAll(/\bUPDATE\s+(vr_measure_issues|vr_measure_provisions)\b/g)) {
    const table = m[1];
    const stmt = s.slice(m.index, stmtEnd(s, m.index));
    const set = stmt.match(/\bSET\s+issue_key\s*=\s*([^\s,;]+)/);
    const where = soleIssueKeyPredicate(stmt);
    if (set) {
      const dest = set[1].trim();
      if (isNoKey(dest)) {
        // nothing to check
      } else if (isLiteral(dest)) {
        refs.push({ key: unq(dest), table, how: "update set", line: lineAt(m.index) });
      } else {
        const resolved = resolveField(dest, m.index);
        if (resolved) for (const k of resolved) refs.push({ key: k, table, how: "update set via " + dest, line: lineAt(m.index) });
        else unresolved.push({ expr: dest, table, line: lineAt(m.index), label });
      }
      // Re-pointing every row that holds the old key retires it from this table.
      if (where) retirements.push({ table, key: where, how: "update", line: lineAt(m.index) });
    }
  }

  // Retirement by deletion.
  for (const m of s.matchAll(/\bDELETE\s+FROM\s+(vr_measure_issues|vr_measure_provisions)\b/g)) {
    const stmt = s.slice(m.index, stmtEnd(s, m.index));
    const where = soleIssueKeyPredicate(stmt);
    if (where) retirements.push({ table: m[1], key: where, how: "delete", line: lineAt(m.index) });
  }

  return { refs, unresolved, retirements };
}

// The literal in `WHERE issue_key = '<lit>'` when that equality is the ENTIRE
// predicate. Returns null for anything narrower — an extra AND/OR, a subquery, or a
// non-literal — because a partial repair leaves rows behind and must not read as a
// clean retirement.
function soleIssueKeyPredicate(stmt) {
  const w = stmt.search(/\bWHERE\b/i);
  if (w < 0) return null;
  const clause = stmt.slice(w + 5).trim().replace(/;?\s*$/, "");
  const m = clause.match(/^issue_key\s*=\s*('(?:[^']|'')*')$/i);
  return m ? unq(m[1]) : null;
}

// ── 1. db/issue-keys.json is in sync with ISSUE_MAP ──────────────────────────
// Half the bug class is drift between the two. Re-derive from source and compare,
// using the same extractor gen-issue-keys.mjs uses.
function extractIssueMap(src) {
  const marker = /var\s+ISSUE_MAP\s*=\s*/.exec(src);
  if (!marker) throw new Error("could not find `var ISSUE_MAP =` in alignment-tool.js");
  let i = marker.index + marker[0].length;
  const start = i;
  let depth = 0, quote = null;
  for (; i < src.length; i++) {
    const ch = src[i], next = src[i + 1];
    if (quote) { if (ch === "\\") i++; else if (ch === quote) quote = null; continue; }
    if (ch === "/" && next === "/") { i = src.indexOf("\n", i); if (i === -1) break; continue; }
    if (ch === "/" && next === "*") { const e = src.indexOf("*/", i + 2); if (e === -1) break; i = e + 1; continue; }
    if (ch === "'" || ch === '"' || ch === "`") quote = ch;
    else if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) return new Function(`return (${src.slice(start, i + 1)});`)(); }
  }
  throw new Error("unbalanced braces while reading the ISSUE_MAP literal");
}

const ISSUE_MAP = extractIssueMap(readFileSync(join(ROOT, "alignment-tool.js"), "utf8"));
const shipped = JSON.parse(readFileSync(join(ROOT, "db/issue-keys.json"), "utf8"));
const ALLOWED = new Set(shipped.keys);
const mapKeys = Object.keys(ISSUE_MAP).sort();

ok(ALLOWED.size > 100, `allow-list loaded (${ALLOWED.size} keys)`);
ok(shipped.count === shipped.keys.length, "issue-keys.json: `count` matches the key array length");

const missingFromJson = mapKeys.filter((k) => !ALLOWED.has(k));
const extraInJson = shipped.keys.filter((k) => !ISSUE_MAP[k]);
ok(missingFromJson.length === 0,
  `db/issue-keys.json is missing ${missingFromJson.length} ISSUE_MAP key(s): ${missingFromJson.join(", ")}\n` +
  `    → run: node scripts/gen-issue-keys.mjs`);
ok(extraInJson.length === 0,
  `db/issue-keys.json has ${extraInJson.length} key(s) no longer in ISSUE_MAP: ${extraInJson.join(", ")}\n` +
  `    → run: node scripts/gen-issue-keys.mjs`);

// keywords are consumed by the ingest's keyword classifier, so they drift too
for (const k of mapKeys) {
  const want = Array.isArray(ISSUE_MAP[k].keywords) ? ISSUE_MAP[k].keywords : [];
  if (!want.length) continue;
  const got = shipped.keywords[k] || [];
  ok(JSON.stringify(got) === JSON.stringify(want),
    `issue-keys.json keywords for '${k}' match ISSUE_MAP → run: node scripts/gen-issue-keys.mjs`);
}

// ── 2. every issue_key written by every migration is allow-listed ────────────
// Migrations are replayed in filename order (timestamps sort lexically, which is the
// order drizzle applies them). For each table+key, the last event wins: a key still
// live at the end of the replay must be allow-listed. A key introduced by an applied
// seed and later retired by a repair is NOT flagged — the seed file is history and
// cannot be edited, so the guard has to judge the resulting table, not the text.
const files = readdirSync(MIG).filter((f) => f.endsWith(".sql")).sort();
ok(files.length > 0, `found ${files.length} migration files to scan`);

const introduced = new Map(); // "table\0key" -> { idx, file, line, how }
const retired = new Map();    // "table\0key" -> { idx, file, line, how }
const allUnresolved = [];
let refCount = 0;
files.forEach((f, idx) => {
  const { refs, unresolved, retirements } = scanSql(readFileSync(join(MIG, f), "utf8"), f);
  refCount += refs.length;
  allUnresolved.push(...unresolved);
  for (const r of refs) introduced.set(r.table + "\0" + r.key, { idx, file: f, ...r });
  for (const r of retirements) retired.set(r.table + "\0" + r.key, { idx, file: f, ...r });
});

const orphans = [];
const repaired = [];
for (const [kk, intro] of introduced) {
  if (ALLOWED.has(intro.key)) continue;
  const gone = retired.get(kk);
  if (gone && gone.idx > intro.idx) { repaired.push({ intro, gone }); continue; }
  orphans.push(intro);
}

ok(refCount > 200, `scanned ${refCount} issue_key references across ${files.length} migrations`);
ok(orphans.length === 0,
  `${orphans.length} migration row(s) reference an issue key that is NOT in db/issue-keys.json\n` +
  `    and is never retired by a later migration.\n` +
  `    The read path DROPS these silently (voting-record.mts:244), so the mapping never\n` +
  `    reaches the client and no count reveals it. Fix by re-pointing to a real key in a\n` +
  `    NEW migration (never edit an applied one), or by adding the key to ISSUE_MAP:\n` +
  orphans.map((o) => `      ${o.key.padEnd(22)} ${o.table.padEnd(22)} ${o.file}:~${o.line} (${o.how})`).join("\n"));

// A shape the scanner cannot read is a hole in the guard, not a pass.
ok(allUnresolved.length === 0,
  `${allUnresolved.length} issue_key expression(s) could not be resolved to a literal, so they\n` +
  `    are NOT covered by this check. Teach scanSql() the new shape rather than ignoring it:\n` +
  allUnresolved.map((u) => `      ${u.expr}  ${u.label}:~${u.line}`).join("\n"));

// ── 3. the committed JSON seed ───────────────────────────────────────────────
const seed = JSON.parse(readFileSync(join(ROOT, "db/vr-issue-seed.json"), "utf8"));
const seedEntries = Array.isArray(seed) ? seed : seed.measures || [];
let seedKeys = 0;
for (const m of seedEntries) {
  for (const iss of m.issues || []) {
    seedKeys++;
    ok(ALLOWED.has(iss.issueKey),
      `vr-issue-seed.json: ${m.number}/${iss.issueKey} is not an allow-listed key`);
  }
}
ok(seedKeys > 0, `checked ${seedKeys} issue keys in db/vr-issue-seed.json`);

// ── 4. the guard catches the failure mode (negative self-test) ───────────────
// Without this, a refactor that quietly broke scanSql() would leave the harness
// reporting all-green forever — the same silence the orphans hid behind.
{
  const planted = `
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale)
    VALUES (1, 'not_a_real_key', 90, false, 'yea_supports', 'has a comma, a semicolon; and -- a fake comment');
  `;
  const { refs } = scanSql(planted, "<planted>");
  ok(refs.some((r) => r.key === "not_a_real_key"), "self-test: a literal orphan in an INSERT is detected");
  ok(refs.some((r) => r.key === "not_a_real_key" && !ALLOWED.has(r.key)),
    "self-test: the planted orphan is correctly judged not-allow-listed");
  ok(refs.length === 1, `self-test: the rationale's comma/semicolon/'--' do not create phantom refs (got ${refs.length})`);

  const plantedDynamic = `
    DO $$ BEGIN
      FOR r IN SELECT * FROM (VALUES ('H.R. 1', 119, 'also_not_real', 50)) AS t(num, cg, k, w) LOOP
        INSERT INTO vr_measure_issues (measure_id, issue_key, weight) VALUES (mid, r.k, r.w)
        ON CONFLICT (measure_id, issue_key) DO NOTHING;
      END LOOP;
    END $$;
  `;
  const dyn = scanSql(plantedDynamic, "<planted-dynamic>");
  ok(dyn.refs.some((r) => r.key === "also_not_real"),
    "self-test: an orphan behind a PL/pgSQL record field (r.k) is resolved and detected");
  ok(dyn.unresolved.length === 0, "self-test: the dynamic shape resolves rather than falling through");
  ok(!dyn.refs.some((r) => r.key === "issue_key"),
    "self-test: the ON CONFLICT column list is not mistaken for a value row");

  const plantedRepair = `
    UPDATE vr_measure_issues SET issue_key = 'strong_defense' WHERE issue_key = 'defense';
  `;
  const rep = scanSql(plantedRepair, "<planted-repair>");
  ok(rep.refs.length === 1 && rep.refs[0].key === "strong_defense",
    "self-test: an UPDATE's destination key is checked");
  ok(!rep.refs.some((r) => r.key === "defense"),
    "self-test: an UPDATE's WHERE key is exempt — repairing a broken key must not fail the guard");
  ok(rep.retirements.some((r) => r.key === "defense" && r.table === "vr_measure_issues"),
    "self-test: re-pointing every row holding a key retires it");

  const plantedDelete = `DELETE FROM vr_measure_issues WHERE issue_key = 'defense';`;
  ok(scanSql(plantedDelete).retirements.some((r) => r.key === "defense"),
    "self-test: an unconditional DELETE retires the key");

  // The distinction the whole history model rests on: a partial repair is not a
  // retirement. If this ever passes, an applied-but-unfinished fix would read as done.
  const plantedPartial = `
    DELETE FROM vr_measure_issues WHERE measure_id = mid AND issue_key = 'defense';
    UPDATE vr_measure_issues t SET issue_key = 'strong_defense'
     WHERE t.issue_key = 'defense'
       AND NOT EXISTS (SELECT 1 FROM vr_measure_issues x
                        WHERE x.measure_id = t.measure_id AND x.issue_key = 'strong_defense');
  `;
  const part = scanSql(plantedPartial, "<planted-partial>");
  ok(!part.retirements.some((r) => r.key === "defense"),
    "self-test: a narrowed WHERE (AND measure_id / NOT EXISTS) does NOT count as retirement");

  const plantedNull = `
    INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning) VALUES
      (1, 'Untagged provision', 'No issue key on purpose.', NULL, 'yea_opposes'),
      (1, 'Tagged provision', 'Has one.', 'border_security', 'yea_supports');
  `;
  const nul = scanSql(plantedNull, "<planted-null>");
  ok(nul.unresolved.length === 0, "self-test: an explicit NULL issue_key is 'no key', not an unreadable shape");
  ok(nul.refs.length === 1 && nul.refs[0].key === "border_security",
    "self-test: the sibling row's real key is still collected alongside the NULL");

  // Retirement is table-scoped: clearing a key from one table says nothing about the other.
  const crossTable = scanSql(`DELETE FROM vr_measure_issues WHERE issue_key = 'x';`);
  ok(!crossTable.retirements.some((r) => r.table === "vr_measure_provisions"),
    "self-test: retirement is scoped to the table it was issued against");
}

// ── report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ issue-key integrity: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  ✗ " + f);
  console.error("");
  process.exit(1);
}
console.log(`✓ issue-key integrity: all ${passed} assertions passed`);
console.log(`  ${refCount} issue_key references across ${files.length} migrations · ` +
  `${seedKeys} in vr-issue-seed.json · ${ALLOWED.size} allow-listed keys · 0 live orphans`);
for (const { intro, gone } of repaired)
  console.log(`  retired: '${intro.key}' (${intro.file}:~${intro.line}) → ` +
    `${gone.how} in ${gone.file}:~${gone.line}`);
