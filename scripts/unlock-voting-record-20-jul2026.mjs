#!/usr/bin/env node
/**
 * Unlock the Voting Record for the 20 roster-less vr-member-map members — Jul 2026
 * ─────────────────────────────────────────────────────────────────────────────
 * db/vr-member-map.json maps 63 bioguide ids to profile slugs; the voting-record
 * ingest keys everything it writes on those slugs. 43 of them have a cmp-data.js
 * roster record. The other 20 do not — and openModal() dead-ends on a missing
 * record (index.html: `if (!p) { _pdxShowModalError(id); return; }`), so the
 * profile never renders, `window._renderVotingRecord(id, p)` at index.html:26153
 * never runs, and the whole downstream chain stays dark:
 *
 *   · 🗳️ Voting Record section          (voting-record.js _renderVotingRecord)
 *   · the "Votes · N Records" nav pill  (injectNavPill)
 *   · per-issue consistency dots        (_pdxHydrateVoteDots → _pdxRecordIssueSummary,
 *                                        which reads CMP_DATA[pid] for the stance side)
 *   · Stance Library "View votes"       (__pdxVotingInitialIssue entry point)
 *   · comparison-board [data-vrdot]     (same hydrate path)
 *   · the Alignment Tool vote adapter   (_alignmentVotesAdapter)
 *
 * All 20 are content-bearing already: 6–14 curated stance cards each, and 16 of
 * them are named by 34 nested spotlight cards. Nothing is missing but identity.
 *
 * This pass adds 20 minimal roster records and nothing else. No stances, no
 * evidence, no scores, no narrative. Per the standing rule the canonical key is
 * the id the voting-record map already uses, which means there is nothing to
 * alias: PDXProfilePid() finds ROSTER[slug] on the first hop.
 *
 * FIELD CHOICES, and why each one is forced rather than picked:
 *
 *   name      Common-usage form, not the formal one from vr-member-map's
 *             `members` annotation. Harness section 6 compares surnames as
 *             `split(/\s+/).pop().replace(/[.,]/g,"")`, so "Robert P. Bresnahan,
 *             Jr." yields "jr" and would fail against its own spotlight card's
 *             "Rob Bresnahan". Every name here is byte-equal to the card that
 *             names it, where a card exists.
 *
 *   office    Exactly "U.S. Representative" — the string 48 existing House
 *             records use. chamberIn() reads it as `house`, which is what the
 *             34 spotlight labels ("U.S. Representative · Mississippi",
 *             "House Natural Resources Chair · Arkansas") assert.
 *
 *   state     "<Full State> · <ST>-NN", after `bmoore`'s "Utah · UT-1". The FULL
 *             state name is load-bearing, not decoration: harness statesIn()
 *             matches against a table of full names only, so a bare "MS-02"
 *             makes the state check silently match nothing and skip — the record
 *             would look green while asserting nothing. No federal record in
 *             cmp-data.js uses the separate `district` field (all 86 that do are
 *             state legislators), so the district rides here.
 *
 *   party     Single letter, as everywhere else. 19 R, 1 D (Thompson), 1 D (Davis).
 *
 *   score     null — no promise ledger has been built for any of them. kept /
 *             broken / pending stay 0, matching all 191 other score:null records.
 *
 *   issues    Derived, not authored: each person's OWN curated stance-card topic
 *             strings, verbatim, dropping any topic that appears on more than 20
 *             stance blocks corpus-wide (the shared national template — "Abortion",
 *             "Election Integrity", "Education & Parental Rights" …), first five
 *             in original order. Every string already ships in the repo; this pass
 *             writes no new prose. An empty array would have been safe (all
 *             consumers guard with `d.issues || []` / `!d.issues.length`) but would
 *             have been the first of 756 records without one.
 *
 * Public record, confirmed per member below. All 20 are sitting U.S. House
 * members of the 119th Congress; none is a former member, none is a Senator.
 *
 * Idempotent, dry-run by default. `--apply` to write.
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const APPLY = process.argv.includes('--apply');

// ── The 20, with the public-record confirmation for each ─────────────────────
// `note` is identity provenance for the tracker and for whoever reads this next.
// It is NOT written into the data file as narrative — only as the terse comment
// line above each record, which is how every prior minimal record was landed.
const MEMBERS = [
  { id: 'bennie_thompson', name: 'Bennie Thompson', st: 'Mississippi', cd: 'MS-02', party: 'D', termStart: '1993-04',
    note: 'Sitting MS-02, in the House since Apr 13 1993; dean of the Mississippi delegation.' },
  { id: 'bruce_westerman', name: 'Bruce Westerman', st: 'Arkansas', cd: 'AR-04', party: 'R', termStart: '2015-01',
    note: 'Sitting AR-04 since Jan 2015; chairs House Natural Resources, which is the office string his one spotlight card uses.' },
  { id: 'don_davis', name: 'Don Davis', st: 'North Carolina', cd: 'NC-01', party: 'D', termStart: '2023-01',
    note: 'Sitting NC-01 since Jan 3 2023; on the Nov 3 2026 ballot. NC redrew its map in the 2025–26 mid-decade cycle; NC-01 is the seat he holds now.' },
  { id: 'frank_lucas', name: 'Frank Lucas', st: 'Oklahoma', cd: 'OK-03', party: 'R', termStart: '1994-05',
    note: 'Sitting OK-03 since a May 1994 special election; dean of the Oklahoma delegation.' },
  { id: 'josh_brecheen', name: 'Josh Brecheen', st: 'Oklahoma', cd: 'OK-02', party: 'R', termStart: '2023-01',
    note: 'Sitting OK-02 since Jan 2023, succeeding Markwayne Mullin. No spotlight card names him.' },
  { id: 'julie_fedorchak', name: 'Julie Fedorchak', st: 'North Dakota', cd: 'ND-AL', party: 'R', termStart: '2025-01',
    note: 'Sitting ND at-large, sworn in Jan 6 2025. Most card-covered of the 20 (9 nested spotlight cards).' },
  { id: 'mariannette_miller_meeks', name: 'Mariannette Miller-Meeks', st: 'Iowa', cd: 'IA-01', party: 'R', termStart: '2021-01',
    note: 'Sitting IA-01 since Jan 2021 (first won by six votes after a recount).' },
  { id: 'michael_guest', name: 'Michael Guest', st: 'Mississippi', cd: 'MS-03', party: 'R', termStart: '2019-01',
    note: 'Sitting MS-03 since Jan 3 2019; House Ethics chair.' },
  { id: 'mike_collins', name: 'Mike Collins', st: 'Georgia', cd: 'GA-10', party: 'R', termStart: '2023-01',
    note: 'Sitting GA-10 since Jan 3 2023. He won the 2026 Georgia GOP Senate runoff and is vacating the House seat at the end of this term, but he has NOT resigned — still the sitting member, so no "Former" and no termEnd.' },
  { id: 'mike_ezell', name: 'Mike Ezell', st: 'Mississippi', cd: 'MS-04', party: 'R', termStart: '2023-01',
    note: 'Sitting MS-04 since Jan 3 2023; former Jackson County sheriff.' },
  { id: 'mike_flood', name: 'Mike Flood', st: 'Nebraska', cd: 'NE-01', party: 'R', termStart: '2022-06',
    note: 'Sitting NE-01 since a Jun 28 2022 special election, succeeding Jeff Fortenberry.' },
  { id: 'mike_simpson', name: 'Mike Simpson', st: 'Idaho', cd: 'ID-02', party: 'R', termStart: '1999-01',
    note: 'Sitting ID-02 since Jan 1999; won the May 19 2026 primary with 63.3%.' },
  { id: 'rick_crawford', name: 'Rick Crawford', st: 'Arkansas', cd: 'AR-01', party: 'R', termStart: '2011-01',
    note: 'Sitting AR-01 since Jan 2011; chairs House Intelligence. vr-member-map records him formally as Eric A. "Rick" Crawford; the card and common usage are "Rick Crawford".' },
  { id: 'rob_bresnahan', name: 'Rob Bresnahan', st: 'Pennsylvania', cd: 'PA-08', party: 'R', termStart: '2025-01',
    note: 'Sitting PA-08, sworn in Jan 6 2025. Formally Robert P. Bresnahan, Jr. — the formal form would break the harness surname check, see header.' },
  { id: 'ryan_mackenzie', name: 'Ryan Mackenzie', st: 'Pennsylvania', cd: 'PA-07', party: 'R', termStart: '2025-01',
    note: 'Sitting PA-07, sworn in Jan 6 2025. No spotlight card names him.' },
  { id: 'scott_perry', name: 'Scott Perry', st: 'Pennsylvania', cd: 'PA-10', party: 'R', termStart: '2013-01',
    note: 'Sitting PA-10 since Jan 2013; won the May 19 2026 primary. No spotlight card names him.' },
  { id: 'stephanie_bice', name: 'Stephanie Bice', st: 'Oklahoma', cd: 'OK-05', party: 'R', termStart: '2021-01',
    note: 'Sitting OK-05 since Jan 2021. vr-member-map records her formally as Stephanie I. Bice.' },
  { id: 'steve_womack', name: 'Steve Womack', st: 'Arkansas', cd: 'AR-03', party: 'R', termStart: '2011-01',
    note: 'Sitting AR-03 since Jan 2011. No spotlight card names him.' },
  { id: 'trent_kelly', name: 'Trent Kelly', st: 'Mississippi', cd: 'MS-01', party: 'R', termStart: '2015-06',
    note: 'Sitting MS-01 since a Jun 2 2015 special election.' },
  { id: 'troy_downing', name: 'Troy Downing', st: 'Montana', cd: 'MT-02', party: 'R', termStart: '2025-01',
    note: 'Sitting MT-02, sworn in Jan 6 2025, succeeding Matt Rosendale.' },
];

// ── Load the live stance table the PAGE loads, to derive `issues` ────────────
// Same derivation the harness uses: shard list read from index.html's own script
// tags, so a future split or rename cannot leave this pass reading a stale table.
function loadStances() {
  const ctx = { console };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  ctx.navigator = { userAgent: 'node' };
  ctx.location = { href: '', search: '', hash: '' };
  const sandbox = vm.createContext(ctx);
  const indexSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const re = /<script[^>]*\bsrc="([^"]*stances[^"]*\.js)"/g;
  const files = [];
  let m;
  while ((m = re.exec(indexSrc))) {
    const f = m[1].replace(/^\//, '');   // srcs are root-absolute in the document
    if (f === 'my-stances.js' || files.includes(f)) continue;
    if (!fs.existsSync(path.join(ROOT, f))) continue;   // not shipped
    files.push(f);
  }
  if (!files.length) throw new Error('no stance shards found in index.html script tags');
  for (const f of files) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
  }
  return { stances: ctx.ISSUE_STANCE_DATA || {}, shards: files.length };
}

// ── Load the roster as the page sees it ──────────────────────────────────────
function loadRoster(src) {
  const ctx = { console };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  vm.runInContext(src, vm.createContext(ctx), { filename: 'cmp-data.js' });
  return ctx.CMP_DATA || {};
}

const { stances: STANCES, shards } = loadStances();

// Corpus topic frequency: how many stance blocks carry each topic string.
const topicFreq = Object.create(null);
for (const k of Object.keys(STANCES)) {
  const seen = new Set((STANCES[k] || []).map((c) => c && c.topic).filter(Boolean));
  for (const t of seen) topicFreq[t] = (topicFreq[t] || 0) + 1;
}
const BOILERPLATE_AT = 20;   // a topic on >20 blocks is the shared national template
const ISSUE_CAP = 5;

function issuesFor(id) {
  const own = [...new Set((STANCES[id] || []).map((c) => c && c.topic).filter(Boolean))];
  return own.filter((t) => topicFreq[t] <= BOILERPLATE_AT).slice(0, ISSUE_CAP);
}

// ── Spotlight cards that name these ids, for the surname/state cross-check ───
function loadCards() {
  const ctx = { console };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'spotlights-data.js'), 'utf8'),
    vm.createContext(ctx), { filename: 'spotlights-data.js' });
  const root = ctx.SPOTLIGHTS || ctx.SPOTLIGHT_DATA;
  const out = [];
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (typeof n.id === 'string' && (typeof n.topic === 'string' || typeof n.posText === 'string')) {
      out.push({ id: n.id, name: n.name || '', office: n.office || '' });
    }
    for (const v of Object.values(n)) walk(v);
  })(root);
  return out;
}

const surname = (n) => (n || '').trim().split(/\s+/).pop().replace(/[.,]/g, '').toLowerCase();

// ── Build the insertion ──────────────────────────────────────────────────────
const rel = 'cmp-data.js';
const abs = path.join(ROOT, rel);
let src = fs.readFileSync(abs, 'utf8');
const before = loadRoster(src);

const q = (s) => JSON.stringify(s);
function recordText(m) {
  const issues = issuesFor(m.id);
  return ` // ${m.note}\n` +
    ` ${q(m.id)}: {\n` +
    `  "name": ${q(m.name)}, "office": "U.S. Representative",\n` +
    `  "state": ${q(m.st + ' · ' + m.cd)},\n` +
    `  "party": ${q(m.party)}, "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",\n` +
    `  "termStart": ${q(m.termStart)},\n` +
    `  "issues": [${issues.map(q).join(', ')}]\n` +
    ` }`;
}

const missing = MEMBERS.filter((m) => !(m.id in before));
const already = missing.length === 0;

if (!already) {
  const TAIL = '\n});\n';
  const tails = src.split(TAIL).length - 1;
  if (tails !== 1 || !src.endsWith(TAIL)) {
    throw new Error(`cmp-data.js tail anchor matched ${tails}× / endsWith=${src.endsWith(TAIL)} (need exactly 1, at EOF)`);
  }
  const banner =
    '// ── Voting Record unlock (July 2026) ──────────────────────────────────────\n' +
    '// The 20 db/vr-member-map.json slugs that had ingested roll-call data but no\n' +
    '// roster record, so openModal() dead-ended and the 🗳️ Voting Record section,\n' +
    '// the Votes nav pill, the per-issue consistency dots, the Stance Library\n' +
    '// "View votes" jump and the comparison-board indicators could never render.\n' +
    '// Identity wiring only: score is null because no promise ledger exists for any\n' +
    '// of them, and every `issues` string is lifted verbatim from that person\'s own\n' +
    '// existing stance cards. All 20 are sitting U.S. House members of the 119th\n' +
    '// Congress; see scripts/unlock-voting-record-20-jul2026.mjs for the per-member\n' +
    '// public-record confirmation and for why the full state name in `state` is\n' +
    '// load-bearing rather than cosmetic.\n';
  const block = ',\n' + banner + missing.map(recordText).join(',\n') + TAIL;
  src = src.slice(0, src.length - TAIL.length) + block;
}

// ── Post-conditions, proved before anything is written ───────────────────────
const problems = [];
let after = before;
try {
  after = loadRoster(src);
} catch (e) {
  problems.push('modified cmp-data.js does not evaluate: ' + e.message);
}

if (!problems.length) {
  // 1. Every member landed, exactly once, under the vr-member-map slug.
  for (const m of MEMBERS) {
    const r = after[m.id];
    if (!r) { problems.push(`${m.id}: no roster record after the pass`); continue; }
    if (r.name !== m.name) problems.push(`${m.id}: name is ${q(r.name)}, expected ${q(m.name)}`);
    if (r.office !== 'U.S. Representative') problems.push(`${m.id}: office is ${q(r.office)}`);
    if (r.state !== `${m.st} · ${m.cd}`) problems.push(`${m.id}: state is ${q(r.state)}`);
    if (!r.state.includes(m.st)) problems.push(`${m.id}: state lacks the full state name — harness statesIn() would skip it`);
    if (r.party !== m.party) problems.push(`${m.id}: party is ${q(r.party)}`);
    if (r.score !== null) problems.push(`${m.id}: score is not null`);
    if (r.kept !== 0 || r.broken !== 0 || r.pending !== 0) problems.push(`${m.id}: promise counters are not zero`);
    if (!Array.isArray(r.issues) || !r.issues.length) problems.push(`${m.id}: issues[] is empty`);
    // No authored prose: every issues string must already exist as one of this
    // person's own stance-card topics.
    const own = new Set((STANCES[m.id] || []).map((c) => c && c.topic));
    for (const it of r.issues || []) {
      if (!own.has(it)) problems.push(`${m.id}: issues entry ${q(it)} is not one of their own stance topics`);
    }
    // Every one of them must actually have voting-record content to unlock.
    if (!(STANCES[m.id] || []).length) problems.push(`${m.id}: no stance cards — is this the right slug?`);
    const dupes = Object.keys(after).filter((k) => k !== m.id && after[k] && after[k].name === m.name);
    if (dupes.length) problems.push(`${m.id}: parallel identity — ${dupes.join(', ')} already carries this name`);
  }

  // 2. Nothing existing was touched.
  for (const k of Object.keys(before)) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) problems.push(`existing record mutated: ${k}`);
  }
  const grew = Object.keys(after).length - Object.keys(before).length;
  if (grew !== missing.length) problems.push(`roster grew by ${grew}, expected ${missing.length}`);

  // 3. The point of the pass: every vr-member-map slug now reaches a record.
  const mm = JSON.parse(fs.readFileSync(path.join(ROOT, 'db/vr-member-map.json'), 'utf8'));
  const slugs = Object.values(mm.map || {});
  const stillDark = slugs.filter((s) => !(s in after));
  if (stillDark.length) problems.push(`vr-member-map slugs still without a roster record: ${stillDark.join(', ')}`);

  // 4. Harness section 6 (label vs roster) newly applies to these ids. Prove the
  //    surname and state agree with every spotlight card that names them, here,
  //    rather than finding out from a red CI run.
  const STATES_RE = new RegExp('\\b(' + MEMBERS.map((m) => m.st).join('|') + ')\\b');
  for (const c of loadCards()) {
    const m = MEMBERS.find((x) => x.id === c.id);
    if (!m) continue;
    if (c.name && surname(c.name) !== surname(m.name)) {
      problems.push(`card names ${q(c.id)} ${q(c.name)}, this pass writes ${q(m.name)} — surname mismatch`);
    }
    const found = (c.office || '').match(STATES_RE);
    if (found && found[1] !== m.st) {
      problems.push(`card places ${q(c.id)} in ${found[1]}, this pass writes ${m.st}`);
    }
    if (/\bSenator\b|\bSenate\b/.test(c.office || '') && !/\bHouse\b|\bRepresentative\b/.test(c.office || '')) {
      problems.push(`card calls ${q(c.id)} senate, this pass writes U.S. Representative`);
    }
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} — unlock-voting-record-20-jul2026`);
console.log(`  stance table read from ${shards} shard(s) the page loads`);
if (already) {
  console.log('  · all 20 roster records already present (already applied)');
} else {
  console.log(`  ✎ appending ${missing.length} minimal U.S. Representative record(s) to ${rel}`);
  for (const m of missing) {
    const iss = issuesFor(m.id);
    console.log(`      ${m.id.padEnd(26)} ${m.party}  ${(m.st + ' · ' + m.cd).padEnd(26)} ` +
      `${String((STANCES[m.id] || []).length).padStart(2)} cards  issues[${iss.length}]`);
  }
}
console.log(`  roster: ${Object.keys(before).length} → ${Object.keys(after).length} record(s)`);

if (problems.length) {
  console.error('\n✗ post-conditions failed — nothing written:');
  for (const p of problems) console.error('  ✗ ' + p);
  process.exit(1);
}
console.log('✓ post-conditions pass');
if (APPLY && !already) { fs.writeFileSync(abs, src); console.log('✓ written'); }
else if (APPLY) console.log('(nothing to write)');
else console.log('(dry run — pass --apply to write)');
