#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — mirror EVERY curated ISSUE_STANCE_DATA position into Firestore
//
// The public profile renders issue positions straight from the in-file
// ISSUE_STANCE_DATA table, but the Database Coverage / completeness metrics,
// the profile editor, and the "is this score explainable?" gate all read the
// politician's Firestore `stances` map. Most documented officials had rich,
// sourced positions on the public site yet an EMPTY `stances` map in Firestore,
// so Database Coverage flagged them as having "No positions listed" — a
// misleading 0. This script closes that gap for the whole roster at once by
// parsing ISSUE_STANCE_DATA (and STANCE_ALIASES) out of index.html and mirroring
// each position's `topic → text` into the matching Firestore document.
//
//   node scripts/mirror-curated-stances.mjs            # dry run (default)
//   node scripts/mirror-curated-stances.mjs --apply    # write to Firestore
//
// Honesty / safety rules:
//   • Source of truth is index.html. Nothing here is invented — it mirrors the
//     same sourced positions already shown publicly.
//   • MERGE-ONLY: existing stance keys are never overwritten, so any hand-edited
//     wording in Firestore wins. Only brand-new topics are added.
//   • Only `stances` and `updatedAt` are written (updateMask). Bios, promises,
//     key issues and scores are left untouched. Re-running is idempotent.
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-14T00:00:00.000Z';
const __dir = dirname(fileURLToPath(import.meta.url));
const HTML = join(__dir, '..', 'index.html');

// ── Pull the two data literals out of index.html and evaluate them ──────────
// They are plain object literals (no function calls), so this is safe to eval
// in this trusted build context. We slice from the `var NAME = {` marker to the
// matching top-level `};` (a line that is exactly two-space-indented "};").
function extractObject(src, marker) {
  const start = src.indexOf(marker);
  if (start < 0) throw new Error('marker not found: ' + marker);
  const braceStart = src.indexOf('{', start);
  // The file closes each of these top-level objects with a line that is exactly
  // two-space-indented "};". Nested content is always indented deeper, so this
  // terminator is unambiguous and avoids any string/brace edge cases.
  const closeIdx = src.indexOf('\n  };', braceStart);
  if (closeIdx < 0) throw new Error('terminator not found for ' + marker);
  const literal = src.slice(braceStart, closeIdx + 4); // include the "}"
  // eslint-disable-next-line no-new-func
  return Function('"use strict"; return (' + literal + ');')();
}

const src = readFileSync(HTML, 'utf8');
const ISSUE_STANCE_DATA = extractObject(src, 'var ISSUE_STANCE_DATA = {');
const STANCE_ALIASES = extractObject(src, 'var STANCE_ALIASES = {');

// Reverse the alias map: curated-key → [doc ids that should also receive it].
const reverseAlias = {};
for (const [docId, curatedKey] of Object.entries(STANCE_ALIASES)) {
  (reverseAlias[curatedKey] = reverseAlias[curatedKey] || []).push(docId);
}

// ── Firestore value encoder/decoder ─────────────────────────────────────────
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (typeof v === 'object') {
    const fields = {};
    for (const [k, val] of Object.entries(v)) fields[k] = enc(val);
    return { mapValue: { fields } };
  }
  throw new Error('cannot encode: ' + String(v));
}
function dec(v) {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(dec);
  if (v.mapValue !== undefined) {
    const o = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) o[k] = dec(val);
    return o;
  }
  return null;
}
async function getDoc(id) {
  const r = await fetch(`${BASE}/${id}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`fetch ${id}: HTTP ${r.status}`);
  const j = await r.json();
  const o = {};
  for (const [k, v] of Object.entries(j.fields || {})) o[k] = dec(v);
  return o;
}
async function patch(id, fields) {
  const qs = Object.keys(fields).map((m) => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&');
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}?${qs}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

// Build topic → text from a curated stance list (skip anything without text).
function positionsFor(list) {
  const out = {};
  for (const s of list) {
    if (s && s.topic && typeof s.text === 'string' && s.text.trim()) out[s.topic] = s.text.trim();
  }
  return out;
}

// Mirror of the app's _stanceSlug + _resolveStanceList so every politician whose
// PUBLIC profile shows curated positions also gets them written to Firestore.
function stanceSlug(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
function resolveCurated(id, name) {
  if (id && ISSUE_STANCE_DATA[id]) return ISSUE_STANCE_DATA[id];
  if (id && STANCE_ALIASES[id] && ISSUE_STANCE_DATA[STANCE_ALIASES[id]]) return ISSUE_STANCE_DATA[STANCE_ALIASES[id]];
  const slug = stanceSlug(name);
  if (slug && ISSUE_STANCE_DATA[slug]) return ISSUE_STANCE_DATA[slug];
  if (slug && STANCE_ALIASES[slug] && ISSUE_STANCE_DATA[STANCE_ALIASES[slug]]) return ISSUE_STANCE_DATA[STANCE_ALIASES[slug]];
  return null;
}

async function listAll() {
  const out = [];
  let token = null;
  do {
    const r = await fetch(`${BASE}?pageSize=300${token ? '&pageToken=' + token : ''}`);
    if (!r.ok) throw new Error('list: HTTP ' + r.status);
    const j = await r.json();
    for (const d of (j.documents || [])) {
      const o = { _id: d.name.split('/').pop() };
      for (const [k, v] of Object.entries(d.fields || {})) o[k] = dec(v);
      out.push(o);
    }
    token = j.nextPageToken;
  } while (token);
  return out;
}

(async () => {
  console.log(`PolitiDex — mirror curated positions → Firestore  [${APPLY ? 'APPLY' : 'DRY RUN'}]`);
  console.log(`Curated entries in ISSUE_STANCE_DATA: ${Object.keys(ISSUE_STANCE_DATA).length}`);

  const docs = await listAll();
  console.log(`Firestore politicians: ${docs.length}\n`);

  const matchedKeys = new Set();
  let touched = 0, added = 0, alreadyComplete = 0, noCurated = 0;
  for (const doc of docs) {
    const list = resolveCurated(doc._id, doc.name);
    if (!list) { noCurated++; continue; }
    const positions = positionsFor(list);
    if (!Object.keys(positions).length) { noCurated++; continue; }
    matchedKeys.add(doc._id);
    const existing = (doc.stances && typeof doc.stances === 'object' && !Array.isArray(doc.stances)) ? doc.stances : {};
    const merged = Object.assign({}, existing);
    let fresh = 0;
    for (const [topic, text] of Object.entries(positions)) {
      if (!(topic in merged)) { merged[topic] = text; fresh++; } // merge-only: never overwrite
    }
    if (!fresh) { alreadyComplete++; continue; }
    console.log(`  ${APPLY ? '✎' : '→'} ${doc._id} (${doc.name || ''}): +${fresh} new → stances now ${Object.keys(merged).length}`);
    if (APPLY) await patch(doc._id, { stances: merged, updatedAt: STAMP });
    touched++; added += fresh;
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} new positions to ${touched} document(s) (+${added} positions).`);
  console.log(`${alreadyComplete} already had every curated position; ${docs.length - touched - alreadyComplete} have no curated positions to mirror.`);
  if (!APPLY) console.log('Re-run with --apply to write to Firestore.');
})();
