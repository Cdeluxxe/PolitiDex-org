#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// vr-pending-mapping-overlay.mjs — measure a pending mapping migration
// ─────────────────────────────────────────────────────────────────────────────
// The build environment connects to Netlify DB as netlifydb_readonly. A migration
// that edits vr_measure_issues therefore cannot be applied here — the platform
// applies it on deploy — which leaves a gap in the one thing that matters about
// such a migration: what it does to share-card eligibility. "53 pairs are blocked
// by guard 16" is measurable today; "and 31 of them go eligible" is not, because
// the rows the pipeline reads are still the old ones.
//
// This module closes that gap without touching the database and without a second
// copy of the rationales. Preloaded ahead of an audit script:
//
//   node --import ./scripts/vr-pending-mapping-overlay.mjs \
//        scripts/vr-audit-share-eligibility-aug2026.mjs --counts
//
// with VR_PENDING_MIGRATION set to a .sql path, it wraps pg's query() and applies
// that migration's vr_measure_issues UPDATEs and DELETEs to the rows in flight.
// The audit then runs the real shipped pipeline over the post-migration mapping
// set. Nothing is written, and with VR_PENDING_MIGRATION unset the wrapper is
// never installed at all.
//
// The parser is deliberately narrow. It reads exactly the two statement shapes
// this repo uses to address a curated mapping:
//
//   UPDATE vr_measure_issues
//      SET rationale = '…'
//    WHERE issue_key = '…'
//      AND measure_id IN (SELECT id FROM vr_measures WHERE number = '…' AND congress = 119);
//
//   DELETE FROM vr_measure_issues
//    WHERE issue_key = '…'
//      AND measure_id IN (SELECT id FROM vr_measures WHERE number = '…' AND congress IS NULL);
//
// Anything else in the file — comments, other tables, other predicates — is
// ignored, and the count of statements it did understand is printed to stderr so
// a shape it cannot read shows up as a number that is too low rather than as a
// silently under-applied overlay. It is a measurement aid, not a migration
// runner: the platform remains the only thing that applies SQL.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import { createRequire } from 'node:module';

function install(file) {
  const sql = fs.readFileSync(file, 'utf8');
  let { updates, deletes } = parse(sql);
  // VR_PENDING_ONLY="H.R. 22::voting_access,S. 1582::econ_corp_account" narrows the
  // overlay to named statements. Running the audit once per statement is how a
  // "+38 cards" total gets attributed to the rows that actually moved it, rather
  // than divided by hand.
  const only = (process.env.VR_PENDING_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (only.length) {
    const wanted = new Set(only);
    const keep = (t) => wanted.has(`${t.number}::${t.issueKey}`);
    updates = updates.filter(keep);
    deletes = deletes.filter(keep);
  }
  process.stderr.write(
    `[overlay] ${file}: ${updates.length} rationale rewrites, ${deletes.length} mapping deletions\n`
  );

  // measure number → id has to come from the same connection the audit opens, so
  // the number-keyed overlay is resolved to measure ids lazily, the first time a
  // vr_measures row is seen going past. Simpler and more robust than a second
  // connection: every audit in this repo selects the measures it needs.
  const numberToKeys = new Map(); // 'H.R. 4|119' → [{issueKey, rationale|null}]
  for (const u of updates) push(numberToKeys, u, u.rationale);
  for (const d of deletes) push(numberToKeys, d, null);

  const require = createRequire(import.meta.url);
  const pg = require('pg');
  const origQuery = pg.Client.prototype.query;
  let measureIdIndex = null; // measure_id → [{issueKey, rationale|null}]

  pg.Client.prototype.query = function patched(...args) {
    const text = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].text) || '';
    const out = origQuery.apply(this, args);
    if (!/\bFROM\s+vr_measure_issues\b/i.test(text) || !out || typeof out.then !== 'function') return out;
    return out.then(async (res) => {
      if (!res || !Array.isArray(res.rows)) return res;
      if (!measureIdIndex) measureIdIndex = await resolve(this, numberToKeys);
      res.rows = applyOverlay(res.rows, measureIdIndex);
      return res;
    });
  };
}

function push(map, target, rationale) {
  const k = `${target.number}|${target.congress === null ? 'null' : target.congress}`;
  const list = map.get(k) || [];
  list.push({ issueKey: target.issueKey, rationale });
  map.set(k, list);
}

// Both shapes end with the same measure predicate, so one fragment matches both.
const TARGET = String.raw`WHERE\s+issue_key\s*=\s*'([^']*)'\s+AND\s+measure_id\s+IN\s*\(\s*SELECT\s+id\s+FROM\s+vr_measures\s+WHERE\s+number\s*=\s*'((?:[^']|'')*)'\s+AND\s+congress\s+(?:=\s*(\d+)|(IS\s+NULL))\s*\)\s*;`;

function parse(sql) {
  // Strip line comments first: this migration's own header quotes SQL in prose.
  const code = sql.replace(/^\s*--.*$/gm, '');
  const updates = [];
  const deletes = [];
  const upRe = new RegExp(
    String.raw`UPDATE\s+vr_measure_issues\s+SET\s+rationale\s*=\s*'((?:[^']|'')*)'\s+` + TARGET,
    'gi'
  );
  for (let m; (m = upRe.exec(code)); ) {
    updates.push({
      rationale: unquote(m[1]), issueKey: m[2], number: unquote(m[3]),
      congress: m[4] ? Number(m[4]) : null,
    });
  }
  const delRe = new RegExp(String.raw`DELETE\s+FROM\s+vr_measure_issues\s+` + TARGET, 'gi');
  for (let m; (m = delRe.exec(code)); ) {
    deletes.push({ issueKey: m[1], number: unquote(m[2]), congress: m[3] ? Number(m[3]) : null });
  }
  return { updates, deletes };
}

const unquote = (s) => String(s).replace(/''/g, "'");

async function resolve(client, numberToKeys) {
  const index = new Map();
  const rows = (await client.query(
    'SELECT id, number, congress FROM vr_measures'
  )).rows;
  for (const r of rows) {
    const k = `${r.number}|${r.congress === null || r.congress === undefined ? 'null' : r.congress}`;
    const list = numberToKeys.get(k);
    if (list) index.set(r.id, list);
  }
  return index;
}

function applyOverlay(rows, index) {
  const out = [];
  for (const row of rows) {
    const list = index.get(row.measure_id);
    const hit = list && list.find((e) => e.issueKey === row.issue_key);
    if (!hit) { out.push(row); continue; }
    if (hit.rationale === null) continue;            // deleted mapping
    out.push({ ...row, rationale: hit.rationale });  // rewritten rationale
  }
  return out;
}

// Installed last: install() reads TARGET, which is a const in this module's TDZ
// until the whole body has evaluated.
const MIGRATION = process.env.VR_PENDING_MIGRATION;
if (MIGRATION) install(MIGRATION);
