#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Ballot seat pack coverage (internal, read-only)
// ---------------------------------------------------------------------------
// The product rule this measures:
//
//     Voting pattern vs the user's issues is the DEFAULT rank when formal
//     evidence exists. Stance prose is not required to rank.
//
// So the only question that matters for a seat is: if a voter sets a handful of
// issues and opens this race, how many of the people on the sheet come back with
// a real record-match number, and how many are honestly banded as "no formal
// record on your issues yet"?
//
// This answers it end to end rather than by proxy. It builds each candidate's
// record items straight out of the database in the exact shape
// /api/voting-record/member/:id emits, feeds them to the SHIPPED client stack
// through PDXVotingRecord.noteMember(), and then reads the SHIPPED
// _calcAlignmentScore(pid, {mode:'record'}). Nothing here re-implements the
// ruler; if the pattern engine changes its mind, this report changes with it.
//
//   node scripts/seat-pack-coverage.mjs                 # print
//   node scripts/seat-pack-coverage.mjs --json          # machine-readable
//   node scripts/seat-pack-coverage.mjs --seed          # overlay db/vr-issue-seed.json
//
// --seed exists because migrations here are applied by the platform at deploy,
// not by this box (NETLIFY_DB_URL is a read-only role). A curated mapping change
// lands in db/vr-issue-seed.json and in a migration together, so overlaying the
// shipped seed onto the live rows — the same (congress, chamber, canonical
// number) match and the same fields applyCuratedIssueSeed() upserts — shows what
// the next deploy will read. Without it, an "after" number would be a guess.
//
// Read-only: plain SELECTs, no writes, no storage. Requires NETLIFY_DB_URL.
// ---------------------------------------------------------------------------
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import pg from 'pg';
import { makeSandbox } from './gen-hero-showcase.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = (f) => readFileSync(join(ROOT, f), 'utf8');
const JSON_OUT = process.argv.includes('--json');
const SEED_OVERLAY = process.argv.includes('--seed');

// Mirror of canonicalMeasureNumber() in netlify/lib/vr-normalize.ts, narrowed to
// the prefixes the curated seed actually uses. Kept literal rather than imported
// because that module is TypeScript and this harness runs under bare node.
const NUM_PREFIX = {
  hr: 'H.R.', hres: 'H.Res.', hjres: 'H.J.Res.', hconres: 'H.Con.Res.',
  s: 'S.', sres: 'S.Res.', sjres: 'S.J.Res.', sconres: 'S.Con.Res.'
};
function canonNumber(input) {
  if (input == null) return null;
  const m = String(input).toLowerCase().replace(/[.\s]/g, '').match(/^([a-z]+)(\d+)$/);
  if (!m || !NUM_PREFIX[m[1]]) return String(input).trim() || null;
  return NUM_PREFIX[m[1]] + ' ' + m[2];
}

// ── The fixture voter ────────────────────────────────────────────────────────
// Provo, Utah County, UT-03 — the same fixture the seat-spine and race-sheet
// suites use, so a number here and a number there describe one voter.
export const FIXTURE_LOCATION = { state: 'Utah', city: 'Provo', county: 'Utah County', district: '3' };

// FIVE ISSUES, TWO STARRED. Chosen to span five different core national issues
// rather than five keys inside one, because a voter who sets five keys from the
// same bundle is a narrower test than the product's own default. Nothing about
// the ruler changes with the choice — only how much of it is exercised.
export const FIXTURE_ISSUES = [
  { key: 'cost_living',     priority: 'high'   },  // Economy & cost of living
  { key: 'border_security', priority: 'high'   },  // Immigration & border
  { key: 'healthcare',      priority: 'medium' },  // Healthcare cost & access
  { key: 'climate_action',  priority: 'medium' },  // Climate & energy
  { key: 'strong_defense',  priority: 'medium' }   // Foreign policy & security
];

const FILES = [
  'cmp-data.js', 'politician-stances-core.js', 'politician-stances-ext.js',
  'state-senate-stances.js', 'stance-helpers.js', 'alignment-tool.js',
  'acct-spotlight-data.js', 'say-vs-do.js', 'exec-action-data.js', 'exec-record.js',
  'exec-record-ui.js', 'consistency.js', 'voting-record.js', 'word-action.js',
  'profile-spine.js', 'issue-colors.js', 'my-stances.js', 'voter-hub-location.js',
  'compare-hub.js', 'ballot-breakdown.js', 'who-represents-me.js', 'race-sheet.js'
];

function miniDom(win) {
  const byId = {};
  const el = (id) => {
    const n = {
      id: id || '', className: '', innerHTML: '', textContent: '', style: {}, dataset: {},
      children: [], classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
      addEventListener() {}, removeEventListener() {},
      appendChild(c) { this.children.push(c); if (c && c.id) byId[c.id] = c; return c; },
      removeChild() {}, insertAdjacentHTML() {}, remove() {}, focus() {}, click() {},
      scrollIntoView() {}, querySelector() { return null; }, querySelectorAll() { return []; }
    };
    if (id) byId[id] = n;
    return n;
  };
  win.document.createElement = () => el('');
  win.document.getElementById = (i) => byId[i] || null;
  win.document.body = el('body');
  win.document.body.appendChild = function (c) { if (c && c.id) byId[c.id] = c; return c; };
  ['who-represents-me', 'wrm-reps', 'vh-district-strip'].forEach(el);
  return byId;
}

export function bootApp(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const store = {};
  win.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; }
  };
  win.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  win.auth = { currentUser: null };
  win._cmpSelected = [];
  miniDom(win);
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  win.__loadErrors = [];
  for (const f of FILES) {
    try { vm.runInContext(R(f), ctx, { filename: f }); }
    catch (e) { win.__loadErrors.push(`${f}: ${e.message}`); }
  }
  win.PROFILES = win.CMP_DATA;

  // compare-table.js owns window._pdxPersonById — a three-line accessor over
  // CMP_DATA that _pdxVoterBallot()'s _real() filter uses to drop pids the
  // roster does not actually carry. That file's boot IIFE binds real DOM and
  // throws in the sandbox before the assignment lands, so the roster filter
  // would reject EVERY pid and every district field would read as empty for
  // harness reasons rather than product reasons. Shimmed verbatim from
  // compare-table.js so the measurement describes the product, not the sandbox.
  if (typeof win._pdxPersonById !== 'function') {
    win._pdxPersonById = function (pid) {
      try { return (win.CMP_DATA && pid && win.CMP_DATA[pid]) ? win.CMP_DATA[pid] : null; }
      catch (e) { return null; }
    };
  }

  win._hasUserLocation = true;
  win._currentVoterLocation = opts.location || FIXTURE_LOCATION;
  return win;
}

// ── The record items, straight from the database ─────────────────────────────
// The exact shape assembleRecordItems() emits in netlify/functions/voting-record.mts,
// including the two derivations the client depends on and cannot recompute:
// isProcedural (from actionType) and advanceInverted (from the question text).
const PROCEDURAL_TYPES = ['procedural', 'motion'];
const yeaBlocks = (q) => {
  const s = String(q || '').toLowerCase();
  return s.indexOf('recommit') !== -1 || s.indexOf('to commit') !== -1 || s.indexOf('to table') !== -1;
};

// Apply db/vr-issue-seed.json on top of the live rows, exactly the way
// applyCuratedIssueSeed() does at ingest: match on (congress, chamber, canonical
// number), then set weight / isPrimary / supportMeaning per issue key. Rows the
// seed does not mention are left alone; seed entries whose measure is not in the
// database are skipped, same as ingest. Returns nothing — it mutates byMeasure.
async function applySeedOverlay(client, byMeasure) {
  const seed = JSON.parse(R('db/vr-issue-seed.json')).measures || [];
  const measures = (await client.query(
    'select id, congress, chamber, number from vr_measures')).rows;
  const byKey = new Map();
  for (const m of measures) {
    const k = m.congress + '|' + m.chamber + '|' + m.number;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(m.id);
  }
  let matched = 0, changed = 0;
  for (const e of seed) {
    const ids = byKey.get(e.congress + '|' + e.chamber + '|' + canonNumber(e.number));
    if (!ids) continue;
    matched++;
    for (const id of ids) {
      const list = byMeasure.get(id) || [];
      for (const si of (e.issues || [])) {
        const row = list.filter((x) => x.issueKey === si.issueKey)[0];
        const want = {
          weight: typeof si.weight === 'number' ? si.weight : 100,
          isPrimary: !!si.isPrimary,
          supportMeaning: si.supportMeaning === 'yea_opposes' ? 'yea_opposes' : 'yea_supports'
        };
        if (!row) { list.push(Object.assign({ issueKey: si.issueKey }, want)); changed++; continue; }
        if (row.weight !== want.weight || row.isPrimary !== want.isPrimary ||
            row.supportMeaning !== want.supportMeaning) changed++;
        Object.assign(row, want);
      }
      byMeasure.set(id, list);
    }
  }
  if (!JSON_OUT) console.log('[--seed] seed measures matched: ' + matched + ' · issue rows the seed moves: ' + changed);
}

export async function loadRecords(client, pids, { seedOverlay = false } = {}) {
  if (!pids.length) return {};
  const iss = (await client.query(
    `select measure_id, issue_key, weight, is_primary, support_meaning
       from vr_measure_issues`)).rows;
  const byMeasure = new Map();
  for (const r of iss) {
    if (!byMeasure.has(r.measure_id)) byMeasure.set(r.measure_id, []);
    byMeasure.get(r.measure_id).push({
      issueKey: r.issue_key, weight: r.weight, isPrimary: r.is_primary,
      supportMeaning: r.support_meaning
    });
  }

  if (seedOverlay) await applySeedOverlay(client, byMeasure);
  for (const list of byMeasure.values()) {
    list.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || b.weight - a.weight);
  }

  const votes = (await client.query(
    `select mv.politician_id, mv.position, mv.is_party,
            rc.id rollcall_id, rc.measure_id, rc.chamber, rc.vote_date, rc.question,
            rc.action_type, rc.result, rc.congress, rc.session, rc.roll_number,
            rc.source_url rc_source_url, rc.source_label rc_source_label,
            m.measure_type, m.number, m.title, m.status, m.parent_id
       from vr_member_votes mv
       join vr_rollcalls rc on rc.id = mv.rollcall_id
       join vr_measures m on m.id = rc.measure_id
      where mv.politician_id = any($1)`, [pids])).rows;

  const positions = (await client.query(
    `select p.politician_id, p.measure_id, p.action_type, p.supports, p.acted_at,
            p.source_url pos_source_url,
            m.measure_type, m.number, m.title, m.chamber, m.status, m.parent_id
       from vr_positions p
       join vr_measures m on m.id = p.measure_id
      where p.politician_id = any($1)`, [pids])).rows;

  const out = {};
  const push = (pid, item) => { (out[pid] = out[pid] || []).push(item); };
  for (const v of votes) {
    if (!v.rc_source_url) continue;
    push(v.politician_id, {
      kind: 'vote', measureId: v.measure_id, measureType: v.measure_type, number: v.number,
      title: v.title, chamber: v.chamber, status: v.status,
      date: v.vote_date ? new Date(v.vote_date).toISOString() : null,
      action: v.question, actionType: v.action_type, position: v.position, result: v.result,
      isParty: v.is_party, supports: null,
      isProcedural: PROCEDURAL_TYPES.indexOf(v.action_type) !== -1,
      advanceInverted: yeaBlocks(v.question),
      isAmendment: v.measure_type === 'amendment', parentMeasureId: v.parent_id ?? null,
      rollcallId: v.rollcall_id, congress: v.congress ?? null, session: v.session ?? null,
      rollNumber: v.roll_number ?? null, issues: byMeasure.get(v.measure_id) || [],
      source: { url: v.rc_source_url, label: v.rc_source_label }
    });
  }
  for (const p of positions) {
    if (!p.pos_source_url) continue;
    push(p.politician_id, {
      kind: 'position', measureId: p.measure_id, measureType: p.measure_type, number: p.number,
      title: p.title, chamber: p.chamber, status: p.status,
      date: p.acted_at ? new Date(p.acted_at).toISOString() : null,
      action: p.action_type, actionType: p.action_type, position: p.action_type, result: null,
      isParty: null, supports: p.supports, isProcedural: false, advanceInverted: false,
      isAmendment: p.measure_type === 'amendment', parentMeasureId: p.parent_id ?? null,
      rollcallId: null, congress: null, session: null, rollNumber: null,
      issues: byMeasure.get(p.measure_id) || [],
      source: { url: p.pos_source_url, label: null }
    });
  }
  return out;
}

// ── The measurement ──────────────────────────────────────────────────────────
export function measure(win, seats, records, issues) {
  issues = issues || FIXTURE_ISSUES;
  // Set the fixture's issues through the shipped controls — the priority store
  // included, because the record ruler multiplies issue weight by it.
  const ms = {};
  issues.forEach((i) => {
    win.alignToggleIssue(i.key);
    ms[i.key] = { priority: i.priority };
  });
  try { win.localStorage.setItem('pdx_my_stances_v1', JSON.stringify(ms)); } catch (e) {}

  Object.keys(records).forEach((pid) => {
    win.PDXVotingRecord.noteMember(pid, records[pid]);
  });

  const RS = win.PDXRaceSheet;
  const out = [];
  seats.forEach((seatKey) => {
    const sm = RS._seat(seatKey);
    if (!sm) { out.push({ seatKey, error: 'no seat meta' }); return; }
    const field = RS._field(sm.key);
    const rows = field.map((c) => {
      let score = null, cov = null;
      try { score = win._calcAlignmentScore(c.pid, { mode: 'record' }); } catch (e) {}
      try {
        const m = win._alignRecordSideMap(c.pid);
        cov = issues.filter((i) => m.sides[i.key]).map((i) => i.key);
      } catch (e) {}
      return {
        pid: c.pid, name: c.name, incumbent: !!c.incumbent,
        votes: (records[c.pid] || []).length,
        pct: (typeof score === 'number' && isFinite(score)) ? Math.round(score) : null,
        onIssues: cov || []
      };
    });
    out.push({
      seatKey, rk: sm.key, label: sm.label,
      fieldSize: rows.length,
      ranked: rows.filter((r) => r.pct !== null).length,
      banded: rows.filter((r) => r.pct === null).length,
      rows
    });
  });
  return out;
}

// ── CLI ──────────────────────────────────────────────────────────────────────
async function main() {
  const win = bootApp();
  const reps = win.pdxRepsForMe();
  if (!reps || !reps.located) throw new Error('the Utah fixture no longer resolves as located');
  const seats = reps.levels.map((l) => l.key);

  // Every pid the sheet could show for any spine seat, plus every officeholder
  // the resolver named — the second set is the point of the pack, since a seat
  // whose field is empty is exactly the gap being measured.
  const RS = win.PDXRaceSheet;
  const pidSet = new Set();
  seats.forEach((k) => {
    const sm = RS._seat(k);
    if (sm) RS._field(sm.key).forEach((c) => pidSet.add(c.pid));
  });
  reps.levels.forEach((l) => { if (l.pid) pidSet.add(l.pid); });

  const client = new pg.Client({
    connectionString: process.env.NETLIFY_DB_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  const records = await loadRecords(client, [...pidSet], { seedOverlay: SEED_OVERLAY });
  await client.end();

  const packs = measure(win, seats, records, FIXTURE_ISSUES);

  if (JSON_OUT) {
    console.log(JSON.stringify({
      location: FIXTURE_LOCATION, issues: FIXTURE_ISSUES,
      levels: reps.levels.map((l) => ({ key: l.key, label: l.label, pid: l.pid })),
      packs
    }, null, 1));
    return;
  }

  console.log('\nBallot seat pack coverage' + (SEED_OVERLAY ? ' [seed overlay: next deploy]' : '') + ' — ' + FIXTURE_LOCATION.city + ', ' +
              FIXTURE_LOCATION.state + ' (UT-' + FIXTURE_LOCATION.district + ')');
  console.log('Issues set: ' + FIXTURE_ISSUES.map((i) => i.key + (i.priority === 'high' ? '★' : '')).join(', '));
  console.log('');
  packs.forEach((p) => {
    const lvl = reps.levels.filter((l) => l.key === p.seatKey)[0] || {};
    console.log(`── ${p.seatKey} (${p.label})  field ${p.fieldSize} · record-match ${p.ranked} · banded ${p.banded}`);
    if (!p.fieldSize) {
      console.log(`     EMPTY FIELD. Resolver officeholder: ${lvl.pid || '(none)'}`);
    }
    p.rows.forEach((r) => {
      console.log(`     ${r.pct === null ? '  —' : String(r.pct).padStart(3)}  ${r.name} (${r.pid})` +
        `  votes:${r.votes}  on:[${r.onIssues.join(',')}]`);
    });
  });
  console.log('');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
