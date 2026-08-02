#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Official Record citation link check (internal, network)
// ---------------------------------------------------------------------------
// A share card is the only PolitiDex surface that travels without its context.
// The one thing on it that lets a stranger check the claim is the VERIFY line —
// the public roll-call page. receipt-cards.js DERIVES that address from
// (chamber, congress, session, roll number) rather than printing whatever URL
// the ingest happened to store, because the stored URL is very often an
// api.congress.gov endpoint, a bill page, or a press release.
//
// Deriving is not the same as checking. A derived address is a construction:
// correct if the roll number is right and the chamber's URL scheme is what we
// think it is, and a dead link — or worse, a link to somebody else's vote — if
// either assumption slips. This script closes that gap by actually fetching
// every derivable citation and reading the page.
//
//   node scripts/vr-check-citations.mjs            # check, print the table
//   node scripts/vr-check-citations.mjs --write    # also write the snapshot
//   node scripts/vr-check-citations.mjs --verify   # exit non-zero on drift
//
// A citation PASSES only when all of these hold:
//   • the request returns 200 and is not redirected to the Senate's
//     roll-call-vote-not-available page;
//   • the page names the roll call we cited ("Roll Call 310" / "Vote Number: 372")
//     — a wrong roll number usually still returns a 200 page, so status alone
//     proves nothing;
//   • the page does not name a DIFFERENT measure than the one we attribute the
//     vote to. Senate pages carry an explicit `Measure Number:` field, so a
//     mismatch there is a hard failure — it means our roll→measure link is wrong.
//     The Clerk's page is a JS app whose payload is not a stable contract, so a
//     measure it does not mention is recorded as `unconfirmed`, never as a pass
//     dressed up as a match.
//
// The snapshot it writes (db/vr-citation-check.json) is what receipt-cards.js
// guard 14 reads: any citation recorded as NOT ok is refused on the card, so a
// link this script could not verify cannot be published. --verify re-checks that
// the list baked into receipt-cards.js still matches the snapshot, which is what
// scripts/test-receipt-cards.mjs asserts offline.
//
// READ-ONLY against the database. Requires NETLIFY_DB_URL. It talks to
// clerk.house.gov and senate.gov, one request at a time, so it is deliberately
// NOT part of `npm test`.
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import vm from 'node:vm';
import pg from 'pg';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const OUT_PATH = path.join(ROOT, 'db', 'vr-citation-check.json');
const WRITE = process.argv.includes('--write');
const VERIFY = process.argv.includes('--verify');

const UA = 'PolitiDex citation check (+https://politidex.fyi)';
const TIMEOUT_MS = 30000;
const ATTEMPTS = 3;
const PAUSE_MS = 400; // one request at a time, politely spaced

// ── The production deriver ──────────────────────────────────────────────────
// canonicalCitation is loaded out of receipt-cards.js itself rather than
// reimplemented here. If the two ever disagreed, this script would be checking
// addresses the cards never print — which is the one failure mode a link check
// must not have.
function loadDeriver() {
  const noopEl = () => ({
    style: {}, textContent: '', hidden: false, className: '', innerHTML: '',
    classList: { add() {}, remove() {}, contains: () => false },
    setAttribute() {}, getAttribute: () => null, appendChild() {}, removeChild() {},
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {}, focus() {}, scrollIntoView() {},
    closest: () => null, insertAdjacentHTML() {}, remove() {},
  });
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    document: {
      readyState: 'complete', head: noopEl(), body: noopEl(), documentElement: noopEl(),
      createElement: noopEl, getElementById: () => null,
      querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
    },
    location: { hash: '', origin: 'https://politidex.fyi', pathname: '/' },
    navigator: {},
    setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => 0,
    JSON, Math, Date, Promise, encodeURIComponent, decodeURIComponent,
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; ctx.addEventListener = () => {};
  const sandbox = vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'receipt-cards.js'), 'utf8'), sandbox,
    { filename: 'receipt-cards.js' });
  const RC = ctx.window.PDXReceiptCards;
  if (!RC || typeof RC.canonicalCitation !== 'function') {
    throw new Error('receipt-cards.js did not expose canonicalCitation');
  }
  return RC.canonicalCitation;
}

// ── Page readers ────────────────────────────────────────────────────────────
const stripTags = (html) => String(html).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
// "H.R. 1", "H. R. 1", "HR1" all collapse to the same token, so a match is about
// the measure and not about how a chamber happens to punctuate it.
const normNum = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

function readHousePage(body, roll) {
  const text = stripTags(body);
  const namesRoll = new RegExp('Roll\\s*Call\\s*' + roll + '\\b').test(text);
  return { namesRoll, text: normNum(text) };
}
function readSenatePage(body, roll) {
  const text = stripTags(body);
  const namesRoll = /Roll ?call ?Vote/i.test(text) &&
    new RegExp('Vote (?:Number|Summary)\\D{0,20}0*' + roll + '\\b').test(text);
  const m = text.match(/Measure Number:\s*([A-Za-z.\s]*\d+)/);
  return { namesRoll, measure: m ? m[1].trim() : '', text: normNum(text) };
}

async function fetchOnce(u) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(u, { redirect: 'follow', signal: ctl.signal, headers: { 'user-agent': UA } });
    return { status: res.status, finalUrl: res.url, body: await res.text() };
  } finally { clearTimeout(timer); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One citation → a verdict. Transient network trouble is retried; a citation we
// still cannot read after ATTEMPTS is NOT ok, because an unread link is an
// unverified link and the guard's job is to fail closed.
async function check(entry) {
  let res = null, netErr = '';
  for (let a = 0; a < ATTEMPTS && !res; a++) {
    try { res = await fetchOnce(entry.url); }
    catch (e) { netErr = e.message; await sleep(1200 * (a + 1)); }
  }
  if (!res) return { ...entry, ok: false, status: 0, measureMatch: 'unchecked', reason: `unreachable after ${ATTEMPTS} attempts (${netErr})` };
  const base = { ...entry, status: res.status, finalUrl: res.finalUrl };
  if (res.status !== 200) return { ...base, ok: false, measureMatch: 'unchecked', reason: `HTTP ${res.status}` };
  if (/roll-call-vote-not-available/i.test(res.finalUrl)) {
    return { ...base, ok: false, measureMatch: 'unchecked', reason: 'redirected to the Senate\'s "roll call vote not available" page' };
  }

  if (entry.chamber === 'house') {
    const p = readHousePage(res.body, entry.roll);
    if (!p.namesRoll) return { ...base, ok: false, measureMatch: 'unchecked', reason: `page does not name Roll Call ${entry.roll}` };
    // The Clerk page for an amendment vote names the underlying bill, so the
    // parent number counts as corroboration too.
    const wanted = [entry.number, entry.parentNumber].filter(Boolean).map(normNum);
    const named = wanted.some((n) => n && p.text.includes(n));
    return { ...base, ok: true, measureMatch: named ? 'confirmed' : 'unconfirmed', reason: '' };
  }

  const p = readSenatePage(res.body, entry.roll);
  if (!p.namesRoll) return { ...base, ok: false, measureMatch: 'unchecked', reason: `page does not name Senate vote ${entry.roll}` };
  if (!p.measure) return { ...base, ok: true, measureMatch: 'unconfirmed', reason: '' };
  const wanted = [entry.number, entry.parentNumber].filter(Boolean).map(normNum);
  if (wanted.some((n) => n && normNum(p.measure) === n)) return { ...base, ok: true, measureMatch: 'confirmed', reason: '' };
  // The page states a measure and it is not ours: the roll→measure link is wrong,
  // and a card built on it would attribute a real vote to the wrong bill.
  return { ...base, ok: false, measureMatch: 'conflict', pageMeasure: p.measure, reason: `page is for ${p.measure}, not ${entry.number}` };
}

async function main() {
  if (!process.env.NETLIFY_DB_URL) {
    console.error('NETLIFY_DB_URL is not set — cannot read the voting record.');
    process.exit(1);
  }
  const canonicalCitation = loadDeriver();

  const client = new pg.Client({ connectionString: process.env.NETLIFY_DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  // Every roll call a member vote hangs off — a superset of what is card-eligible
  // today, so a card that becomes eligible after a mapping or stance pass is
  // already checked rather than newly unverified.
  const rows = (await client.query(`
    SELECT r.id, r.chamber, r.congress, r.session, r.roll_number, r.vote_date, r.source_url,
           m.number, m.measure_type, pm.number AS parent_number,
           (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id = r.id)::int AS member_votes
      FROM vr_rollcalls r
      JOIN vr_measures m ON m.id = r.measure_id
      LEFT JOIN vr_measures pm ON pm.id = m.parent_id
     WHERE r.source_url IS NOT NULL
       AND EXISTS (SELECT 1 FROM vr_member_votes v WHERE v.rollcall_id = r.id)
     ORDER BY r.vote_date DESC NULLS LAST, r.id`)).rows;
  await client.end();

  // Derive with the production function, then collapse to distinct addresses —
  // one page is one check no matter how many members voted on it.
  const byUrl = new Map();
  let underivable = 0;
  for (const r of rows) {
    const cit = canonicalCitation({
      kind: 'vote', chamber: r.chamber, congress: r.congress, session: r.session,
      rollNumber: r.roll_number, date: r.vote_date ? new Date(r.vote_date).toISOString() : null,
      source: { url: r.source_url },
    });
    if (!cit) { underivable++; continue; }
    const roll = cit.url.includes('clerk.house.gov')
      ? String(parseInt(cit.url.split('/Votes/')[1].slice(4), 10))
      : String(parseInt(cit.url.match(/_(\d{5})\.htm$/)[1], 10));
    const prev = byUrl.get(cit.url);
    if (prev) { prev.memberVotes += r.member_votes; continue; }
    byUrl.set(cit.url, {
      url: cit.url, chamber: String(r.chamber || '').toLowerCase(), roll,
      number: r.number || '', parentNumber: r.parent_number || '', memberVotes: r.member_votes,
    });
  }

  const entries = [...byUrl.values()];
  console.log(`${rows.length} sourced roll call(s) with member votes → ${entries.length} distinct citation(s); ${underivable} underivable (already refused by guard 12)\n`);

  const results = [];
  for (const e of entries) {
    const r = await check(e);
    results.push(r);
    const flag = r.ok ? (r.measureMatch === 'confirmed' ? 'ok  ' : 'ok? ') : 'BAD ';
    console.log(`${flag} ${String(r.status).padStart(3)}  ${r.url}${r.reason ? '   <- ' + r.reason : ''}`);
    await sleep(PAUSE_MS);
  }

  const bad = results.filter((r) => !r.ok);
  const unconfirmed = results.filter((r) => r.ok && r.measureMatch !== 'confirmed');
  console.log(`\n${results.length - bad.length} resolved / ${bad.length} failed` +
    `  ·  measure confirmed on ${results.length - bad.length - unconfirmed.length}, unconfirmed on ${unconfirmed.length}`);
  if (bad.length) {
    console.log('\nRefuse these on cards (guard 14):');
    for (const b of bad) console.log(`  ${b.url}\n      ${b.reason}  (${b.memberVotes} member vote(s))`);
  }

  const snapshot = {
    checkedAt: new Date().toISOString(),
    note: 'Generated by scripts/vr-check-citations.mjs. `unresolved` is what receipt-cards.js guard 14 refuses.',
    summary: {
      rollcallsChecked: rows.length,
      distinctCitations: results.length,
      underivable,
      resolved: results.length - bad.length,
      failed: bad.length,
      measureConfirmed: results.length - bad.length - unconfirmed.length,
      measureUnconfirmed: unconfirmed.length,
    },
    unresolved: bad.map((b) => ({ url: b.url, reason: b.reason, memberVotes: b.memberVotes })),
    results: results.map((r) => ({
      url: r.url, chamber: r.chamber, roll: r.roll, number: r.number,
      memberVotes: r.memberVotes, status: r.status, ok: r.ok,
      measureMatch: r.measureMatch, reason: r.reason || undefined,
    })),
  };

  if (WRITE) {
    fs.writeFileSync(OUT_PATH, JSON.stringify(snapshot, null, 2) + '\n');
    console.log(`\nwrote ${path.relative(ROOT, OUT_PATH)}`);
  }

  // Drift check: what guard 14 refuses must be exactly what this run could not
  // verify. Anything else means the card set and the evidence have separated.
  if (VERIFY) {
    const src = fs.readFileSync(path.join(ROOT, 'receipt-cards.js'), 'utf8');
    const missing = bad.filter((b) => !src.includes(b.url));
    if (missing.length) {
      console.error('\n✗ guard 14 does not refuse:');
      for (const m of missing) console.error('   ' + m.url);
      process.exit(1);
    }
    console.log('\n✓ guard 14 refuses every citation this run could not verify');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
