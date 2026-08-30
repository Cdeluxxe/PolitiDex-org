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
//   node scripts/vr-check-citations.mjs --rehearse netlify/database/migrations/X.sql
//                                                  # read the ledger as it will be
//                                                  # after X deploys (never writes)
//
// A citation PASSES only when all of these hold:
//   • the request returns 200 and is not redirected to the Senate's
//     roll-call-vote-not-available page;
//   • the page names the roll call we cited ("Roll Call 310" / "Vote Number: 372")
//     — a wrong roll number usually still returns a 200 page, so status alone
//     proves nothing;
//   • the chamber's own record of that vote does not name a DIFFERENT measure
//     than the one we attribute the vote to.
//
// That last rule is the reason this script exists in its current form. The ledger
// used to file Senate roll 119/1/7 under H.R. 29; the Senate's record of that vote
// says S. 5. Both are real bills, both are called the Laken Riley Act, and only one
// of them was voted on that day — so every card built on that roll call printed a
// true vote under a false bill, and the derived VERIFY link led to a page that
// contradicted the card. A measure conflict is therefore a HARD FAILURE, in both
// chambers, for every roll call: not a warning, not an `unconfirmed`, but a
// citation guard 14 refuses to publish.
//
// Corroboration comes from the structured record, not from the human page:
//   • House — https://clerk.house.gov/evs/<year>/roll<NNN>.xml, field <legis-num>
//   • Senate — the citation URL with .htm swapped for .xml, field <document_name>,
//     falling back to <amendment_to_document_number> on an amendment vote, where
//     the Senate omits <document_name> and names the bill being amended instead.
// Both are stable, documented contracts. The Clerk's *human* page is a JS app whose
// payload is not, which is why an earlier revision of this script could only mark
// House measures `unconfirmed` and would have let the Laken Riley sibling through
// on the House side. The human page is still fetched, because it is the address the
// card actually prints and it still has to resolve; the XML is what it is checked
// against. A record we cannot read leaves the measure `unconfirmed` — an absent
// record is not a contradiction, and inventing a failure from silence would refuse
// good cards — but the run reports the unconfirmed count so a coverage collapse
// cannot pass for a clean sweep.
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

// --rehearse <file.sql> (repeatable) — read the ledger as it WILL be once those
// migrations deploy, instead of as it is now. The migrations are applied to CLONES
// of the vr_* tables inside a transaction that is always rolled back, so this stays
// read-only and works with the read-only role. Use it to answer "does this
// migration actually fix the rows it claims to?" before shipping it, rather than
// finding out on the next sweep.
//
// A rehearsal describes a database that does not exist yet, so it may never
// overwrite the committed snapshot: --write is refused below when --rehearse is on.
const REHEARSE = process.argv.reduce((out, a, i) => {
  if (a === '--rehearse' && process.argv[i + 1]) out.push(path.resolve(process.argv[i + 1]));
  else if (a.startsWith('--rehearse=')) out.push(path.resolve(a.slice('--rehearse='.length)));
  return out;
}, []);
const VR_TABLES = ['vr_measures', 'vr_rollcalls', 'vr_measure_issues', 'vr_measure_actions', 'vr_member_votes', 'vr_positions'];

const UA = 'PolitiDex citation check (+https://www.politidex.fyi)';
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
    location: { hash: '', origin: 'https://www.politidex.fyi', pathname: '/' },
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

// Bill-style designations pulled out of a number string, normalised. This is the
// unit of comparison, and it is deliberately narrower than "the whole string":
//
//   "H.R. 29"                     → HR29
//   "Senate Amendments to H.R. 29" → HR29      (a name that asserts a bill)
//   "PN11-7"                      → PN117
//   "H.Amdt. 266"                 → (nothing)  an amendment's own designation is
//                                              not a bill number, and neither the
//                                              Clerk nor the Senate record carries
//                                              it — the Clerk's <amendment-num> is
//                                              a debate sequence, not the H.Amdt.
//   "Patel — FBI"                 → (nothing)  a human label for a nomination
//
// Yielding nothing is the point. Comparing an amendment designation or a nickname
// against the bill the chamber names would manufacture a conflict out of two
// records that agree, so those cases end as `unconfirmed` and publish.
const BILL_TOKEN = /(HJRES|HCONRES|HRES|HR|SJRES|SCONRES|SRES|S|PN)(\d+)/g;
function billTokens(...parts) {
  const out = new Set();
  for (const p of parts) {
    for (const m of normNum(p).matchAll(BILL_TOKEN)) out.add(m[1] + m[2]);
  }
  return out;
}

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

// ── The chamber's structured record of the vote ─────────────────────────────
// Deliberately a plain tag scrape rather than an XML parse: both feeds are flat,
// single-namespace documents, and the fields read here are the ones their DTDs
// have carried unchanged for twenty years. Anything unrecognised comes back empty,
// which reads downstream as "not corroborated" rather than as a conflict.
const tag = (xml, name) => {
  const m = String(xml).match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name + '>'));
  return m ? m[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
};

// clerk.house.gov/Votes/2025023 → clerk.house.gov/evs/2025/roll023.xml
function houseRecordUrl(citationUrl, roll) {
  const tail = citationUrl.split('/Votes/')[1];
  if (!tail || tail.length < 5) return '';
  return `https://clerk.house.gov/evs/${tail.slice(0, 4)}/roll${String(roll).padStart(3, '0')}.xml`;
}
const senateRecordUrl = (citationUrl) => citationUrl.replace(/\.htm$/, '.xml');

function readRecord(chamber, xml) {
  if (chamber === 'house') {
    // <legis-num> is the underlying measure even on an amendment vote, so an
    // amendment row corroborates through its parent. Procedural votes with no
    // measure (adjourn, quorum) leave it empty or set it to a marker word.
    const legis = tag(xml, 'legis-num');
    return {
      measure: /^\s*(QUORUM|JOURNAL|MOTION)/i.test(legis) ? '' : legis,
      question: tag(xml, 'vote-question'),
      amendment: tag(xml, 'amendment-num'),
      result: tag(xml, 'vote-result'),
      rollNumber: tag(xml, 'rollcall-num'),
    };
  }
  // On a Senate AMENDMENT vote there is no <document_name> at all: the Senate
  // records the bill under amendment in <amendment_to_document_number>. That is the
  // same relationship <legis-num> carries on the House side — the parent bill an
  // amendment row corroborates through — so it is read as the measure when, and
  // only when, <document_name> is absent. A bill vote is unaffected.
  const doc = tag(xml, 'document_name');
  return {
    measure: doc || tag(xml, 'amendment_to_document_number'),
    question: tag(xml, 'question'),
    amendment: tag(xml, 'amendment_number'),
    result: tag(xml, 'vote_result'),
    rollNumber: tag(xml, 'vote_number'),
  };
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

// The structured record is corroboration, not the citation itself, so it gets
// fewer attempts and its failure is never the reason a citation fails: an
// unreachable record leaves the measure unconfirmed, which publishes.
async function fetchRecord(u) {
  if (!u) return null;
  for (let a = 0; a < 2; a++) {
    try {
      const res = await fetchOnce(u);
      if (res.status === 200 && /^\s*<\?xml/.test(res.body)) return res.body;
      return null;
    } catch { await sleep(900); }
  }
  return null;
}

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

  // 1. The address the card prints has to resolve to the roll call we cited.
  const isHouse = entry.chamber === 'house';
  const page = isHouse ? readHousePage(res.body, entry.roll) : readSenatePage(res.body, entry.roll);
  if (!page.namesRoll) {
    const what = isHouse ? `Roll Call ${entry.roll}` : `Senate vote ${entry.roll}`;
    return { ...base, ok: false, measureMatch: 'unchecked', reason: `page does not name ${what}` };
  }

  // 2. The chamber's structured record has to agree about WHICH MEASURE was voted
  //    on. Same rule and same consequence in both chambers.
  await sleep(PAUSE_MS);
  const recUrl = isHouse ? houseRecordUrl(entry.url, entry.roll) : senateRecordUrl(entry.url);
  const xml = await fetchRecord(recUrl);
  const rec = xml ? readRecord(entry.chamber, xml) : null;
  const found = { ...base, recordUrl: recUrl, recordQuestion: rec?.question || '' };

  // An amendment row corroborates through its parent bill, which is what both
  // feeds name on an amendment vote.
  const pageMeasure = rec?.measure || (isHouse ? '' : page.measure);
  const ours = billTokens(entry.number, entry.parentNumber);
  const theirs = billTokens(pageMeasure);

  if (!theirs.size) {
    // The record names no bill — a procedural vote, or a feed we could not read.
    // Fall back to the weaker signal the human page offers: the House page
    // mentioning our number somewhere is worth recording, but it is corroboration,
    // never a conflict.
    const named = isHouse && ours.size && [...ours].some((n) => page.text.includes(n));
    return { ...found, ok: true, measureMatch: named ? 'confirmed' : 'unconfirmed', pageMeasure: pageMeasure || undefined, reason: '' };
  }
  if (!ours.size) {
    // The record names a bill and the ledger names no comparable one — an
    // amendment row with no parent link, or a nomination filed under a nickname.
    // Nothing is contradicted, but nothing is corroborated either.
    return {
      ...found, ok: true, measureMatch: 'unconfirmed', pageMeasure,
      reason: '', note: `ledger number ${JSON.stringify(entry.number)} carries no bill designation to compare against ${pageMeasure}`,
    };
  }
  if ([...ours].some((n) => theirs.has(n))) {
    return { ...found, ok: true, measureMatch: 'confirmed', pageMeasure, reason: '' };
  }
  // The record states a measure and it is not ours: the roll→measure link is wrong,
  // and a card built on it would attribute a real vote to the wrong bill.
  return {
    ...found, ok: false, measureMatch: 'conflict', pageMeasure,
    reason: `the ${isHouse ? 'Clerk' : 'Senate'} record for this roll call is for ${pageMeasure}, `
      + `but the ledger files it under ${entry.number || '(no number)'}`,
  };
}

async function main() {
  if (!process.env.NETLIFY_DB_URL) {
    console.error('NETLIFY_DB_URL is not set — cannot read the voting record.');
    process.exit(1);
  }
  if (REHEARSE.length && WRITE) {
    console.error('--rehearse describes a database that has not deployed yet; refusing to --write it over the committed snapshot.');
    process.exit(1);
  }
  const canonicalCitation = loadDeriver();

  const client = new pg.Client({ connectionString: process.env.NETLIFY_DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  if (REHEARSE.length) {
    // Clone, migrate, read, roll back. INCLUDING ALL carries the indexes and
    // defaults across; the id default is re-pointed at a temp sequence so INSERTs
    // in a migration behave the way they will in production.
    console.log('REHEARSAL — reading the ledger as it will be after:');
    for (const f of REHEARSE) console.log('  ' + path.relative(ROOT, f));
    await client.query('BEGIN');
    for (const t of VR_TABLES) {
      await client.query(`CREATE TEMP TABLE ${t} (LIKE public.${t} INCLUDING ALL)`);
      await client.query(`CREATE TEMP SEQUENCE ${t}_seq_tmp`);
      await client.query(`ALTER TABLE pg_temp.${t} ALTER COLUMN id SET DEFAULT nextval('${t}_seq_tmp')`);
      await client.query(`INSERT INTO pg_temp.${t} SELECT * FROM public.${t}`);
      await client.query(`SELECT setval('${t}_seq_tmp', coalesce((SELECT max(id) FROM pg_temp.${t}), 1))`);
    }
    await client.query('SET LOCAL search_path = pg_temp, public');
    for (const f of REHEARSE) await client.query(fs.readFileSync(f, 'utf8'));
    console.log('');
  }

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
  if (REHEARSE.length) await client.query('ROLLBACK');
  await client.end();

  // Derive with the production function, then collapse to distinct addresses —
  // one page is one check no matter how many members voted on it.
  const byUrl = new Map();
  let underivable = 0, stateRows = 0;
  for (const r of rows) {
    const cit = canonicalCitation({
      kind: 'vote', chamber: r.chamber, congress: r.congress, session: r.session,
      rollNumber: r.roll_number, date: r.vote_date ? new Date(r.vote_date).toISOString() : null,
      source: { url: r.source_url },
    });
    if (!cit) {
      underivable++;
      // Named rather than folded into the total. This script knows two page
      // shapes, both federal; a state chamber's roll calls are refused by guard
      // 12 for exactly that reason, so "underivable" here is not a data defect
      // to chase but the size of the gap this script has not been taught yet.
      if (!/^(house|senate)$/i.test(String(r.chamber || '').trim())) stateRows++;
      continue;
    }
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
  console.log(`${rows.length} sourced roll call(s) with member votes → ${entries.length} distinct citation(s); ${underivable} underivable (already refused by guard 12)`);
  if (stateRows) {
    console.log(`  · ${stateRows} of those are non-federal chambers this script has no page reader for — ` +
      'their cards are refused, not silently unverified (see STATE CHAMBERS in receipt-cards.js)');
  }
  console.log('');

  const results = [];
  for (const e of entries) {
    const r = await check(e);
    results.push(r);
    const flag = r.ok ? (r.measureMatch === 'confirmed' ? 'ok  ' : 'ok? ') : 'BAD ';
    console.log(`${flag} ${String(r.status).padStart(3)}  ${r.url}${r.reason ? '   <- ' + r.reason : ''}`);
    await sleep(PAUSE_MS);
  }

  const bad = results.filter((r) => !r.ok);
  const conflicts = results.filter((r) => r.measureMatch === 'conflict');
  const unconfirmed = results.filter((r) => r.ok && r.measureMatch !== 'confirmed');
  console.log(`\n${results.length - bad.length} resolved / ${bad.length} failed` +
    `  ·  measure confirmed on ${results.length - bad.length - unconfirmed.length}, unconfirmed on ${unconfirmed.length}`);

  // The sweep result, called out separately from ordinary link rot: these are the
  // roll calls where the ledger and the chamber disagree about which bill was voted
  // on. Each one is a card printing a true vote under a false measure.
  if (conflicts.length) {
    console.log(`\n✗ MEASURE CONFLICTS — ${conflicts.length} roll call(s) the ledger files under the wrong measure:`);
    for (const c of conflicts) {
      console.log(`  ${c.chamber} roll ${c.roll}: ledger says ${c.number || '(no number)'}, ` +
        `chamber record says ${c.pageMeasure}   (${c.memberVotes} member vote(s))`);
      console.log(`      card cites  ${c.url}`);
      console.log(`      record      ${c.recordUrl}`);
    }
  } else {
    console.log('\n✓ no measure conflicts — every roll call the ledger could corroborate is filed under the measure the chamber says was voted on');
  }

  // Not a failure, but not a clean bill of health either: these are roll calls the
  // chamber attributes to a bill while the ledger files them under something with
  // no bill designation in it. Almost all are amendment rows with no parent_id, so
  // the link exists in the chamber's record and not in ours.
  const incomparable = results.filter((r) => r.note);
  if (incomparable.length) {
    console.log(`\n· ${incomparable.length} roll call(s) could not be compared either way:`);
    const byNote = new Map();
    for (const r of incomparable) {
      const k = `${r.chamber} · ${r.number} → ${r.pageMeasure}`;
      byNote.set(k, (byNote.get(k) || 0) + 1);
    }
    for (const [k, n] of byNote) console.log(`    ${k}${n > 1 ? `  ×${n}` : ''}`);
  }

  if (bad.length) {
    console.log('\nRefuse these on cards (guard 14):');
    for (const b of bad) console.log(`  ${b.url}\n      ${b.reason}  (${b.memberVotes} member vote(s))`);
  }

  const snapshot = {
    checkedAt: new Date().toISOString(),
    note: 'Generated by scripts/vr-check-citations.mjs. `unresolved` is what receipt-cards.js guard 14 refuses. '
      + 'An entry with `pageMeasure` is a measure conflict: the link resolves, but the chamber\'s record of that '
      + 'roll call names a different measure than the ledger does, so the card would be true about the vote and '
      + 'false about the bill.',
    summary: {
      rollcallsChecked: rows.length,
      distinctCitations: results.length,
      underivable,
      resolved: results.length - bad.length,
      failed: bad.length,
      measureConflicts: conflicts.length,
      measureConfirmed: results.length - bad.length - unconfirmed.length,
      measureUnconfirmed: unconfirmed.length,
    },
    unresolved: bad.map((b) => ({
      url: b.url, reason: b.reason, memberVotes: b.memberVotes,
      // What the chamber says the page is about. Guard 14 uses this to stay correct
      // under either deploy ordering: a card whose measure matches pageMeasure is
      // already fixed and may publish; anything else is still refused.
      pageMeasure: b.pageMeasure || undefined,
      recordUrl: b.recordUrl || undefined,
    })),
    results: results.map((r) => ({
      url: r.url, chamber: r.chamber, roll: r.roll, number: r.number,
      memberVotes: r.memberVotes, status: r.status, ok: r.ok,
      measureMatch: r.measureMatch, pageMeasure: r.pageMeasure || undefined,
      reason: r.reason || undefined,
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
