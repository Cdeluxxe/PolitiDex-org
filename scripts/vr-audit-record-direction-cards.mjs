#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// vr-audit-record-direction-cards.mjs — what the record-direction card unlocks
// ─────────────────────────────────────────────────────────────────────────────
// Slice 3 adds ONE new share-card shape: the formal record's own direction on a
// (member, issue) row where nothing was ever said. This script measures it
// against the live database, and it measures the thing that actually matters —
// not "how many cards could we make" but:
//
//   1. how many rows become shareable that were not shareable before, and
//      whether every one of them is a row the profile itself already
//      characterises (the card may not be more confident than the row);
//   2. whether the say-vs-do card population moved by so much as one card, one
//      tier or one reason;
//   3. whether ⚖️ Direction Match moved anywhere.
//
// (2) and (3) are answered by running the SAME database through TWO sandboxes of
// the SAME shipped files — one as shipped, one with _recordDirectionIndex removed
// so the record-direction feed cannot produce anything — and comparing. Nothing
// is re-derived here: every number comes out of PDXReceiptCards and
// PDXConsistency, so an audit that agreed with a rule this script invented is
// not possible.
//
//   node scripts/vr-audit-record-direction-cards.mjs
//   node scripts/vr-audit-record-direction-cards.mjs --json
//   node scripts/vr-audit-record-direction-cards.mjs --examples   # worked cards
//   node scripts/vr-audit-record-direction-cards.mjs --member <slug>
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
const EXAMPLES = process.argv.includes('--examples');
const ONE = (() => {
  const i = process.argv.indexOf('--member');
  return i === -1 ? '' : (process.argv[i + 1] || '');
})();

// ── The app, loaded the way the page loads it ────────────────────────────────
function loadApp(withRecordDirection) {
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
    location: { hash: '', search: '', href: 'https://www.politidex.fyi/', origin: 'https://www.politidex.fyi', pathname: '/' },
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
    'cmp-data.js',
    'profiles-full.js',
    'politician-stances-core.js',
    'politician-stances-ext.js',
    'state-senate-stances.js',
  ];
  for (let i = 2; i <= 16; i++) files.push(`state-senate-stances-w${i}.js`);
  files.push('stance-helpers.js', 'alignment-tool.js', 'issue-colors.js',
             'voting-record.js', 'say-vs-do.js', 'consistency.js', 'receipt-cards.js');

  const loaded = [], failed = [];
  for (const f of files) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) { failed.push(`${f} (missing)`); continue; }
    try { vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f }); loaded.push(f); }
    catch (e) { failed.push(`${f}: ${e.message}`); }
  }
  // The control sandbox. Removing the index the whole feed hangs off is the
  // closest available "this slice was never shipped" state that still runs the
  // identical bytes everywhere else.
  if (!withRecordDirection) ctx.window._recordDirectionIndex = undefined;
  return { ctx, loaded, failed };
}

// ── The record, assembled exactly as the live API assembles it ───────────────
const PROCEDURAL_TYPES = ['procedural', 'motion'];
function yeaBlocksMeasure(question) {
  const q = String(question || '').toLowerCase();
  return q.indexOf('recommit') !== -1 || q.indexOf('to commit') !== -1 || q.indexOf('to table') !== -1;
}

async function loadRecords() {
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

function seed(ctx, records) {
  for (const [pid, items] of records) ctx.window.PDXVotingRecord.noteMember(pid, items);
}

const pct = (n, d) => (d ? ((n / d) * 100).toFixed(1) : '0.0');

// Which FIELD of a finished card carried the text a tripwire objected to. The
// distinction that matters is composed vs quoted: `headline`, `didLine` and the
// rest are sentences this app writes, and a tripwire firing on one of them is a
// bug in the copy. `facts` is a rendering of the measure's own title and the
// curator's own rationale, and a tripwire firing there is a quoted word, not a
// claim the card is making.
const RD_FIELDS = (card) => {
  const out = [['headline', card.headline],
              ['verdict.label', card.verdict && card.verdict.label],
              ['stampKicker', card.stampKicker],
              ['recordLabel', card.recordLabel],
              ['didLine', card.didLine],
              ['countsNote', card.countsNote],
              ['facts', card.facts],
              ['effectLabel', card.effectLabel],
              ['instrument.note', card.instrument && card.instrument.note],
              ['source.label', card.source && card.source.label]];
  for (const side of ['with', 'against']) {
    const f = card.sides && card.sides[side];
    if (f) out.push([`sides.${side}.head`, f.head], [`sides.${side}.lead`, f.lead],
                    [`sides.${side}.tail`, f.tail]);
  }
  return out.filter(([, v]) => v);
};

async function main() {
  if (!process.env.NETLIFY_DB_URL) {
    console.error('NETLIFY_DB_URL is not set — cannot read the voting record.');
    process.exit(1);
  }
  const records = await loadRecords();

  const live = loadApp(true);
  const ctrl = loadApp(false);
  for (const s of [live, ctrl]) {
    if (!s.ctx.window.PDXReceiptCards) {
      throw new Error('receipt-cards.js did not expose PDXReceiptCards' +
        (s.failed.length ? ` — load failures: ${s.failed.join('; ')}` : ''));
    }
  }
  if (live.failed.length) console.error(`  ! module load warnings: ${live.failed.join('; ')}`);

  seed(live.ctx, records);
  seed(ctrl.ctx, records);

  const RC = live.ctx.window.PDXReceiptCards;
  const RCB = ctrl.ctx.window.PDXReceiptCards;
  const pids = [...records.keys()].filter((p) => !ONE || p === ONE).sort();

  // ── 1 · the new feed ───────────────────────────────────────────────────────
  const rows = [];
  for (const pid of pids) {
    let audit;
    try { audit = RC.recordDirectionAudit(pid) || []; } catch (e) { continue; }
    for (const r of audit) rows.push(r);
  }
  const tokenTally = new Map();
  const reasonTally = new Map();
  const tierTally = new Map();
  const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);

  let built = 0, publicCards = 0, uniform = 0, twoSided = 0, bothCited = 0;
  let splitPublic = 0, splitBothCited = 0, splitJudged = 0;
  const members = new Set(), issues = new Set();
  for (const r of rows) {
    bump(tokenTally, r.token);
    if (!r.eligible) { bump(reasonTally, r.reason); continue; }
    if (r.built) built++;
    if (r.publicEligible) {
      publicCards++;
      bump(tierTally, r.tier || '(none)');
      members.add(r.pid); issues.add(r.issueKey);
      if (r.uniform) uniform++; else { twoSided++; if (r.bothSidesCited) bothCited++; }
      // The split population, tracked on its own line: these are the rows that
      // could not leave the app at all before this move.
      if (r.split) {
        splitPublic++; splitJudged += (r.judged || 0);
        if (r.bothSidesCited) splitBothCited++;
      }
    } else {
      bump(reasonTally, r.publicReason);
    }
  }

  // Every public record-direction card must sit on a row the PROFILE itself
  // already lets speak — the card may never be more confident than the row.
  // The bar is `counted`: a deep split's card states two numbers the row also
  // states, and claims no direction, so it is not more confident than a row
  // that characterises nothing. A card that claimed a direction on a split row
  // would be, which is what the `split`/`characterised` check below catches.
  let overconfident = 0;
  for (const r of rows) {
    if (!r.publicEligible) continue;
    const i = live.ctx.window._pdxRecordDirection(r.pid, r.issueKey);
    if (!i || !i.counted || i.token !== r.token ||
        !!i.characterised === !!r.split ||
        i.judged !== r.judged || i.advances !== r.advances || i.opposes !== r.opposes) {
      overconfident++;
    }
  }

  // ── 2 · the say-vs-do population, both sandboxes ───────────────────────────
  let sayBefore = 0, sayAfter = 0, sayDrift = 0;
  const auditDrift = [];
  for (const pid of pids) {
    let a = [], b = [], aa = [], bb = [];
    try { a = RC.publicCardsFor(pid) || []; } catch (e) {}
    try { b = RCB.publicCardsFor(pid) || []; } catch (e) {}
    try { aa = RC.audit(pid) || []; } catch (e) {}
    try { bb = RCB.audit(pid) || []; } catch (e) {}
    sayAfter += a.length;
    sayBefore += b.length;
    if (a.length !== b.length) sayDrift++;
    if (JSON.stringify(aa) !== JSON.stringify(bb)) auditDrift.push(pid);
    for (const c of a) {
      if (c.origin === RC.RECORD_DIRECTION_ORIGIN) auditDrift.push(pid + ' (rd card in say-vs-do feed)');
    }
  }

  // ── 3 · Direction Match, both sandboxes ────────────────────────────────────
  const CA = live.ctx.window.PDXConsistency, CB = ctrl.ctx.window.PDXConsistency;
  const scoreDrift = [];
  let scored = 0;
  if (CA && CB) {
    for (const pid of pids) {
      let a, b;
      try { a = JSON.stringify([CA.officialRecord(pid), CA.sayVsDo(pid), CA.overallVerdict(pid)]); }
      catch (e) { a = 'ERR:' + e.message; }
      try { b = JSON.stringify([CB.officialRecord(pid), CB.sayVsDo(pid), CB.overallVerdict(pid)]); }
      catch (e) { b = 'ERR:' + e.message; }
      scored++;
      if (a !== b) scoreDrift.push(pid);
    }
  }

  // ── 4 · worked examples ────────────────────────────────────────────────────
  const pick = (want) => {
    const hit = rows.filter((r) => r.publicEligible && (
      want === 'uniform' ? r.uniform
        : want === 'bothways' ? r.split
        : (!r.uniform && !r.split && r.bothSidesCited)))
      .sort((x, y) => y.judged - x.judged)[0];
    return hit ? RC.recordDirection(hit.pid, hit.issueKey) : null;
  };
  const exUniform = pick('uniform');
  const exSplit = pick('split');
  const exBothWays = pick('bothways');

  // ── 5 · where the tripwires actually fire ──────────────────────────────────
  // A tripwire firing on a sentence the app WROTE is a copy bug worth fixing. A
  // tripwire firing on a quoted measure title is the guard doing its job on
  // material this card only carries. They are counted separately because the two
  // call for opposite responses.
  const G = RC.guards;
  const TRIPS = [['proportion', G.rdProportionRe], ['stance word', G.rdStanceWordRe],
                 ['say-vs-do token', G.rdSaydoTokenRe]];
  const tripTally = new Map();
  const tripSamples = new Map();
  for (const r of rows) {
    if (!r.eligible || r.publicEligible) continue;
    let card = null;
    try { card = RC.recordDirectionCardsFor(r.pid, { issueKey: r.issueKey })[0] || null; } catch (e) {}
    if (!card) continue;
    for (const [name, re] of TRIPS) {
      for (const [field, value] of RD_FIELDS(card)) {
        const m = String(value).match(re);
        if (!m) continue;
        const key = `${name} · ${field}`;
        bump(tripTally, key);
        if (!tripSamples.has(key)) tripSamples.set(key, `${r.pid}/${r.issueKey}: …${m[0]}… in ${JSON.stringify(String(value).slice(0, 120))}`);
      }
    }
  }

  const out = {
    newlyEligible: { built, publicCards, members: members.size, issues: issues.size,
                     uniform, twoSided, bothSidesCited: bothCited, overconfident,
                     split: splitPublic, splitBothSidesCited: splitBothCited,
                     splitMeanJudged: splitPublic ? +(splitJudged / splitPublic).toFixed(1) : 0 },
    tiers: Object.fromEntries([...tierTally].sort((a, b) => b[1] - a[1])),
    tokens: Object.fromEntries([...tokenTally].sort((a, b) => b[1] - a[1])),
    shareEligibility: { sayVsDoBefore: sayBefore, sayVsDoAfter: sayAfter,
                        sayVsDoDriftMembers: sayDrift,
                        recordDirection: publicCards,
                        totalBefore: sayBefore, totalAfter: sayAfter + publicCards },
    unchanged: { auditDriftMembers: auditDrift.length, sample: auditDrift.slice(0, 5) },
    directionMatch: { membersCompared: scored, moved: scoreDrift.length, sample: scoreDrift.slice(0, 5) },
    topBlockReasons: [...reasonTally].sort((a, b) => b[1] - a[1]).slice(0, 14)
      .map(([reason, n]) => ({ n, reason })),
    tripwires: [...tripTally].sort((a, b) => b[1] - a[1])
      .map(([where, n]) => ({ n, where, sample: tripSamples.get(where) })),
  };

  if (JSON_OUT) {
    console.log(JSON.stringify({ ...out,
      examples: { uniform: exUniform, split: exSplit, bothWays: exBothWays } }, null, 2));
    return;
  }

  const L = (s) => console.log(s);
  L('');
  L('  RECORD-DIRECTION SHARE CARDS · live database');
  L('  ' + '─'.repeat(72));
  L(`  candidates examined            ${rows.length}`);
  L(`  cards built                    ${built}`);
  L(`  cards that clear the public gate  ${publicCards}   (${members.size} members · ${issues.size} issues)`);
  L(`     uniform records             ${uniform}`);
  L(`     two-sided records           ${twoSided}   (${bothCited} cite an example on BOTH sides)`);
  L(`     records that ran both ways  ${splitPublic}   (${splitBothCited} cite an example on BOTH sides · mean ${splitPublic ? (splitJudged / splitPublic).toFixed(1) : '0'} judged)`);
  L(`  cards more confident than the row they sit on   ${overconfident}   ← must be 0`);
  L('');
  L('  by public tier');
  for (const [k, v] of Object.entries(out.tiers)) L(`    ${String(k).padEnd(10)} ${v}`);
  L('');
  L('  row token behind every candidate');
  for (const [k, v] of Object.entries(out.tokens)) {
    L(`    ${String(k).padEnd(22)} ${String(v).padStart(6)}  ${pct(v, rows.length)}%`);
  }
  L('');
  L('  SHARE ELIGIBILITY · before → after');
  L('  ' + '─'.repeat(72));
  L(`  say-vs-do public cards, feed dark   ${sayBefore}`);
  L(`  say-vs-do public cards, feed live   ${sayAfter}   ← must equal the line above`);
  L(`  record-direction public cards       ${publicCards}`);
  L(`  total shareable                     ${sayBefore} → ${sayAfter + publicCards}`);
  L(`  members whose say-vs-do audit changed  ${auditDrift.length}   ← must be 0`);
  L('');
  L('  DIRECTION MATCH');
  L('  ' + '─'.repeat(72));
  L(`  members compared                    ${scored}`);
  L(`  members whose score moved           ${scoreDrift.length}   ← must be 0`);
  if (scoreDrift.length) L(`    e.g. ${scoreDrift.slice(0, 5).join(', ')}`);
  L('');
  L('  WHY THE REST ARE NOT CARDS (top reasons)');
  L('  ' + '─'.repeat(72));
  for (const { n, reason } of out.topBlockReasons) {
    L(`    ${String(n).padStart(6)}  ${String(reason).slice(0, 110)}`);
  }
  L('');
  L('  WHERE THE COPY TRIPWIRES FIRE  (composed field = copy bug · facts = quoted material)');
  L('  ' + '─'.repeat(72));
  for (const { n, where, sample } of out.tripwires) {
    L(`    ${String(n).padStart(6)}  ${where}`);
    L(`            ${String(sample).slice(0, 130)}`);
  }

  if (EXAMPLES) {
    const show = (title, c) => {
      L('');
      L('  ' + title);
      L('  ' + '─'.repeat(72));
      if (!c) { L('    (none found)'); return; }
      L(`    ${c.name} · ${c.office || ''}`);
      L(`    stamp      ${c.stampKicker} — ${c.verdict.label}`);
      L(`    headline   ${c.headline}`);
      L(`    label      ${c.recordLabel}`);
      L(`    note       ${c.recordNote}`);
      L(`    counts     judged ${c.recordDirection.judged} · advanced ${c.recordDirection.advances} · cut against ${c.recordDirection.opposes}`);
      L(`    did line   ${c.didLine}`);
      L(`    counts note ${c.countsNote}`);
      if (c.sides) {
        L(`    advanced it  ${c.sides.with.number} · ${c.sides.with.proof}`);
        L(`                 ${c.sides.with.url}`);
        L(`    cut against  ${c.sides.against.number} · ${c.sides.against.proof}`);
        L(`                 ${c.sides.against.url}`);
      } else {
        L(`    example    ${c.measureNumber} · ${c.factParts ? c.factParts.join(' · ') : c.facts}`);
        L(`               ${c.verifyUrl}`);
      }
      L(`    said       ${JSON.stringify(c.said)}   ← must be null`);
      L(`    source     ${c.source.label} — ${c.source.url}`);
      L(`    opens      ${c.hash}`);
    };
    show('WORKED EXAMPLE · uniform record', exUniform);
    show('WORKED EXAMPLE · split record', exSplit);
    show('WORKED EXAMPLE · record that ran both ways', exBothWays);
  }
  L('');
}

main().catch((e) => { console.error(e); process.exit(1); });
