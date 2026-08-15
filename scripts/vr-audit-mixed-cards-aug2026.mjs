#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// vr-audit-mixed-cards-aug2026.mjs — what the MIXED share card reaches
// ─────────────────────────────────────────────────────────────────────────────
// The share pipeline could emit a card for `consistent` and for `contradicts`.
// It could not emit one for `mixed`, because guard 9 (verdict stability) holds a
// card to the member's own net verdict on the issue and there was no mixed card
// shape for it to be held to — so every candidate on a split row was refused with
// "net record verdict on this issue is 'mixed'".
//
// This script measures the pool and the outcome against the LIVE data, running
// the shipped pipeline rather than approximating it — same loader and same
// record assembly as vr-audit-share-eligibility-aug2026.mjs:
//
//   POOL   every (member, issue) row whose net verdict is `mixed`, and how many
//          of them have a citable formal item on BOTH sides. Computed from the
//          guards themselves, so it reports the same number before and after the
//          mixed card exists.
//   BUILT  what the pipeline actually emits now, by verdict, and what survives
//          the public share gate. Run this on both sides of a change and the
//          consistent / contradicts columns are the regression check.
//
//   node scripts/vr-audit-mixed-cards-aug2026.mjs
//   node scripts/vr-audit-mixed-cards-aug2026.mjs --json
//   node scripts/vr-audit-mixed-cards-aug2026.mjs --show 20   # worked examples
//
// Read-only against the database and the repo. Requires NETLIFY_DB_URL.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import vm from 'node:vm';
import pg from 'pg';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const JSON_OUT = process.argv.includes('--json');
const SHOW = (() => {
  const i = process.argv.indexOf('--show');
  return i === -1 ? 0 : (parseInt(process.argv[i + 1], 10) || 10);
})();

// ── The app, loaded the way the page loads it ────────────────────────────────
export function loadApp() {
  const noopEl = () => ({
    style: {}, textContent: '', hidden: false, className: '', innerHTML: '', value: '',
    dataset: {}, children: [], firstChild: null, parentNode: null,
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute() {}, getAttribute: () => null, removeAttribute() {},
    appendChild() {}, removeChild() {}, insertBefore() {},
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {},
    focus() {}, blur() {}, click() {}, scrollIntoView() {},
    closest: () => null, insertAdjacentHTML() {}, remove() {},
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }),
  });
  const ctx = {
    console: { log() {}, warn() {}, error() {}, info() {}, debug() {} },
    document: {
      readyState: 'complete',
      head: noopEl(), body: noopEl(), documentElement: noopEl(),
      createElement: noopEl, createDocumentFragment: noopEl,
      getElementById: () => null, getElementsByTagName: () => [],
      querySelector: () => null, querySelectorAll: () => [],
      addEventListener() {}, removeEventListener() {},
      cookie: '',
    },
    location: { hash: '', search: '', href: 'https://politidex.fyi/', origin: 'https://politidex.fyi', pathname: '/' },
    navigator: { userAgent: 'node', onLine: true, language: 'en-US' },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {}, clear() {} },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {}, clear() {} },
    setTimeout: () => 0, clearTimeout: () => {},
    setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
    requestIdleCallback: () => 0,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    fetch: () => Promise.reject(new Error('offline audit: fetch is disabled')),
    CustomEvent: class { constructor(t, o) { this.type = t; Object.assign(this, o || {}); } },
    Event: class { constructor(t) { this.type = t; } },
    JSON, Math, Date, Promise, encodeURIComponent, decodeURIComponent,
    parseInt, parseFloat, isNaN, isFinite, String, Number, Boolean, Array, Object,
    RegExp, Error, Map, Set, WeakMap, WeakSet, Intl, URL, URLSearchParams,
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; ctx.top = ctx;
  ctx.addEventListener = () => {};
  ctx.removeEventListener = () => {};
  ctx.dispatchEvent = () => true;
  vm.createContext(ctx);

  const files = [
    'cmp-data.js', 'profiles-full.js',
    'politician-stances-core.js', 'politician-stances-ext.js', 'state-senate-stances.js',
  ];
  for (let i = 2; i <= 16; i++) files.push(`state-senate-stances-w${i}.js`);
  files.push('stance-helpers.js', 'alignment-tool.js', 'issue-colors.js',
             'voting-record.js', 'say-vs-do.js', 'receipt-cards.js');

  const loaded = [], failed = [];
  for (const f of files) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) { failed.push(`${f} (missing)`); continue; }
    try { vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f }); loaded.push(f); }
    catch (e) { failed.push(`${f}: ${e.message}`); }
  }
  return { ctx, loaded, failed };
}

// ── The record, assembled exactly as the live API assembles it ───────────────
const PROCEDURAL_TYPES = ['procedural', 'motion'];
function yeaBlocksMeasure(question) {
  const q = String(question || '').toLowerCase();
  return q.indexOf('recommit') !== -1 || q.indexOf('to commit') !== -1 || q.indexOf('to table') !== -1;
}

export async function loadRecords() {
  const client = new pg.Client({
    connectionString: process.env.NETLIFY_DB_URL, ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const issueRows = (await client.query(
    'SELECT measure_id, issue_key, weight, is_primary, support_meaning, rationale FROM vr_measure_issues')).rows;
  const issuesByMeasure = new Map();
  for (const r of issueRows) {
    const list = issuesByMeasure.get(r.measure_id) || [];
    list.push({
      issueKey: r.issue_key, weight: r.weight, isPrimary: r.is_primary,
      supportMeaning: r.support_meaning, rationale: r.rationale,
    });
    issuesByMeasure.set(r.measure_id, list);
  }
  for (const list of issuesByMeasure.values()) {
    list.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || b.weight - a.weight);
  }

  const voteRows = (await client.query(`
    SELECT v.politician_id AS pid, v.position, v.rollcall_id, v.is_party,
           r.question, r.action_type, r.result, r.vote_date, r.congress, r.session,
           r.roll_number, r.source_url AS rc_source_url, r.source_label AS rc_source_label,
           m.id AS measure_id, m.measure_type, m.number, m.title, m.chamber, m.status,
           m.parent_id
      FROM vr_member_votes v
      JOIN vr_rollcalls r ON r.id = v.rollcall_id
      JOIN vr_measures  m ON m.id = r.measure_id`)).rows;

  const posRows = (await client.query(`
    SELECT p.politician_id AS pid, p.action_type, p.supports, p.acted_at,
           p.source_url AS pos_source_url, m.source_label AS pos_source_label,
           m.id AS measure_id, m.measure_type, m.number, m.title, m.chamber, m.status,
           m.parent_id
      FROM vr_positions p
      JOIN vr_measures m ON m.id = p.measure_id`)).rows;

  await client.end();

  const byPid = new Map();
  const push = (pid, item) => {
    if (!byPid.has(pid)) byPid.set(pid, []);
    byPid.get(pid).push(item);
  };

  for (const v of voteRows) {
    if (!v.rc_source_url) continue;
    push(v.pid, {
      kind: 'vote', measureId: v.measure_id, measureType: v.measure_type,
      number: v.number, title: v.title, chamber: v.chamber, status: v.status,
      date: v.vote_date ? new Date(v.vote_date).toISOString() : null,
      action: v.question, actionType: v.action_type, position: v.position,
      result: v.result, isParty: v.is_party, supports: null,
      isProcedural: PROCEDURAL_TYPES.includes(v.action_type),
      advanceInverted: yeaBlocksMeasure(v.question),
      isAmendment: v.measure_type === 'amendment',
      parentMeasureId: v.parent_id ?? null,
      rollcallId: v.rollcall_id,
      congress: v.congress ?? null, session: v.session ?? null,
      rollNumber: v.roll_number ?? null,
      issues: issuesByMeasure.get(v.measure_id) ?? [],
      source: { url: v.rc_source_url, label: v.rc_source_label },
    });
  }
  for (const p of posRows) {
    if (!p.pos_source_url) continue;
    push(p.pid, {
      kind: 'position', measureId: p.measure_id, measureType: p.measure_type,
      number: p.number, title: p.title, chamber: p.chamber, status: p.status,
      date: p.acted_at ? new Date(p.acted_at).toISOString() : null,
      action: p.action_type, actionType: p.action_type, position: p.action_type,
      result: null, isParty: null, supports: p.supports,
      isProcedural: false, advanceInverted: false,
      isAmendment: p.measure_type === 'amendment',
      parentMeasureId: p.parent_id ?? null,
      rollcallId: null, congress: null, session: null, rollNumber: null,
      issues: issuesByMeasure.get(p.measure_id) ?? [],
      source: { url: p.pos_source_url, label: p.pos_source_label ?? null },
    });
  }
  for (const items of byPid.values()) {
    items.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  }
  return byPid;
}

// The reason string guard 9 produces. Matching on it is how a row "refused only
// because the verdict is mixed" is told apart from one refused for a real defect.
const MIXED_REFUSAL = /^net record verdict on this issue is "mixed"/;

async function main() {
  if (!process.env.NETLIFY_DB_URL) {
    console.error('NETLIFY_DB_URL is not set — cannot read the voting record.');
    process.exit(1);
  }
  const { ctx, failed } = loadApp();
  const win = ctx.window;
  const RC = win.PDXReceiptCards;
  if (!RC) throw new Error('receipt-cards.js did not expose PDXReceiptCards' +
    (failed.length ? ` — load failures: ${failed.join('; ')}` : ''));
  if (failed.length) console.error(`  ! module load warnings: ${failed.join('; ')}`);

  const records = await loadRecords();
  for (const [pid, items] of records) win.PDXVotingRecord.noteMember(pid, items);

  const STANCES = win.ISSUE_STANCE_DATA || {};
  const pids = Object.keys(STANCES).filter((p) => records.has(p));

  // ── POOL ────────────────────────────────────────────────────────────────────
  // Rows whose net verdict is mixed, split by whether BOTH one-sided candidates
  // were refused for the mixed verdict alone. That pair is exactly the "citable
  // formal item on each side" test, read off the guards rather than re-derived:
  // the contradicts candidate carries the top item on the against side, the
  // consistent candidate the top item on the with side, and a candidate refused
  // only by guard 9 is one whose item cleared everything else.
  const pool = { rows: 0, bothSides: 0, oneSide: 0, neither: 0 };
  const eligibleRows = [];
  const blockedRows = new Map();   // reason → count

  // ── BUILT ───────────────────────────────────────────────────────────────────
  const built = { contradicts: 0, consistent: 0, mixed: 0, omnibus: 0 };
  const pub = { contradicts: 0, consistent: 0, mixed: 0, omnibus: 0 };
  const pubTier = { core: 0, thin: 0 };
  const gateRefusals = new Map();
  const worked = [];

  for (const pid of pids) {
    let cands = [];
    try { cands = RC.candidates(pid) || []; } catch (e) { continue; }
    if (!cands.length) continue;

    const byRow = new Map();
    for (const c of cands) {
      if (!byRow.has(c.issueKey)) byRow.set(c.issueKey, {});
      byRow.get(c.issueKey)[c.want] = c;
    }

    for (const [issueKey, row] of byRow) {
      const anyC = row.contradicts || row.consistent || row.mixed;
      if (!anyC || !anyC.summary || anyC.summary.netVerdict !== 'mixed') continue;
      pool.rows++;
      const withOk = row.consistent && MIXED_REFUSAL.test(row.consistent.blocked || '');
      const againstOk = row.contradicts && MIXED_REFUSAL.test(row.contradicts.blocked || '');
      if (withOk && againstOk) pool.bothSides++;
      else if (withOk || againstOk) pool.oneSide++;
      else pool.neither++;

      // What the mixed candidate itself says, when the pipeline has one.
      const mc = row.mixed;
      if (mc) {
        if (mc.blocked) {
          const key = mc.blocked.slice(0, 110);
          blockedRows.set(key, (blockedRows.get(key) || 0) + 1);
        } else {
          eligibleRows.push({ pid, issueKey,
            judged: mc.summary.total,
            withN: mc.summary.consistent, againstN: mc.summary.contradicts });
        }
      }
    }

    // Built + public, by verdict — the regression check on the other two shapes.
    let cards = [];
    try { cards = RC.cardsFor(pid) || []; } catch (e) { cards = []; }
    for (const c of cards) {
      const k = c.verdict && c.verdict.key;
      if (built[k] != null) built[k]++;
      const block = RC.publicShareBlock(c) || '';
      if (block) {
        if (k === 'mixed') gateRefusals.set(block.slice(0, 110), (gateRefusals.get(block.slice(0, 110)) || 0) + 1);
        continue;
      }
      if (pub[k] != null) pub[k]++;
      const t = RC.publicTier(c);
      if (pubTier[t] != null) pubTier[t]++;
      if (k === 'mixed' && worked.length < Math.max(SHOW, 40)) {
        worked.push({
          pid, name: c.name, issueKey: c.issueKey, issue: c.issue && c.issue.label,
          judged: (c.recordSummary || {}).total || 0,
          withN: (c.recordSummary || {}).consistent || 0,
          againstN: (c.recordSummary || {}).contradicts || 0,
          tier: RC.publicTier(c),
          headline: c.headline, said: c.said && c.said.text,
          sides: c.sides || null, hash: c.hash, verifyUrl: c.verifyUrl,
        });
      }
    }
  }

  worked.sort((a, b) => b.judged - a.judged);

  if (JSON_OUT) {
    console.log(JSON.stringify({ pool, built, pub, pubTier,
      eligibleRows: eligibleRows.length,
      blocked: [...blockedRows.entries()].sort((a, b) => b[1] - a[1]),
      gateRefusals: [...gateRefusals.entries()].sort((a, b) => b[1] - a[1]),
      worked }, null, 2));
    return;
  }

  console.log('── The mixed pool (guards only — same answer before and after) ───────');
  console.log(`(member, issue) rows whose net verdict is mixed : ${pool.rows}`);
  console.log(`  STRONGEST item already citable on both sides : ${pool.bothSides}`);
  console.log(`  strongest item citable on one side only      : ${pool.oneSide}`);
  console.log(`  strongest item citable on neither side       : ${pool.neither}`);
  console.log('  (these read the two single-sided candidates, which carry each side\'s TOP');
  console.log('   item only. A side whose top item is refused — a nomination proxy, most');
  console.log('   often — can still cite the strongest CITABLE item below it, and that');
  console.log('   step-down is why BUILT below is larger than the both-sides line here.)');
  console.log('');
  console.log('── What the pipeline builds ──────────────────────────────────────────');
  console.log(`built:  contradicts ${built.contradicts} · consistent ${built.consistent} · mixed ${built.mixed}`);
  console.log(`public: contradicts ${pub.contradicts} · consistent ${pub.consistent} · mixed ${pub.mixed}`);
  console.log(`public tiers: core ${pubTier.core} · thin ${pubTier.thin}`);
  console.log('');
  if (blockedRows.size) {
    console.log('── mixed candidates the guards refused ───────────────────────────────');
    [...blockedRows.entries()].sort((a, b) => b[1] - a[1])
      .forEach(([r, n]) => console.log(`${String(n).padStart(5)}  ${r}`));
    console.log('');
  }
  if (gateRefusals.size) {
    console.log('── built mixed cards the public gate refused ─────────────────────────');
    [...gateRefusals.entries()].sort((a, b) => b[1] - a[1])
      .forEach(([r, n]) => console.log(`${String(n).padStart(5)}  ${r}`));
    console.log('');
  }
  if (SHOW && worked.length) {
    console.log(`── ${Math.min(SHOW, worked.length)} worked examples, deepest record first ─────────────────`);
    worked.slice(0, SHOW).forEach((w, i) => {
      console.log(`${String(i + 1).padStart(2)}. ${w.name} (${w.pid}) · ${w.issue} [${w.issueKey}] · ${w.judged} judged · ${w.tier}`);
      console.log(`    said     : ${String(w.said || '').slice(0, 150)}`);
      console.log(`    headline : ${w.headline}`);
      if (w.sides) {
        console.log(`    with     : ${w.sides.with && w.sides.with.proof} (${w.sides.with && w.sides.with.date}) — ${w.sides.with && w.sides.with.verify}`);
        console.log(`    against  : ${w.sides.against && w.sides.against.proof} (${w.sides.against && w.sides.against.date}) — ${w.sides.against && w.sides.against.verify}`);
      }
      console.log(`    link     : ${w.verifyUrl}`);
      console.log('');
    });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === url.fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}