#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Utah state-legislator CORE-ISSUE pass (June 2026)
//
// PURPOSE
//   Adds individually-sourced Election Integrity positions to two sitting Utah
//   legislators whose current Evidence Locker footprint did not yet touch that
//   Core National Issue, even though each chief-sponsored a signature 2025
//   election-administration bill. Both additions are tied to a specific bill the
//   member personally carried — no shared/batched votes, nothing inferred
//   (CONTENT_STYLE.md, CORE_NATIONAL_ISSUES.md).
//
//   Most thin Utah profiles cannot be widened responsibly in this way: a
//   legislator's individually-attributable record (their own sponsored bills and
//   on-record statements) tends to concentrate in the few areas they already
//   cover, and Utah's shared floor votes may not be batched across members. Where
//   no verifiable individual position exists for an uncovered core, the profile is
//   left as-is rather than padded. See .netlify/results.md for the documented
//   next-pass plan.
//
// VERIFIED ADDITIONS
//   • Stephanie Gricius (HD-50) — chief sponsor of H.B. 69 (2025), "Voter Records
//     Amendments," which makes it a class B misdemeanor for a government officer to
//     access or disclose how or when an individual voter returned a ballot for a
//     personal or political purpose; it passed the Utah House unanimously and took
//     effect May 7, 2025.                                  → Election Integrity
//   • Brady Brammer (SD-21) — chief sponsor of S.B. 1011 (2025 special session),
//     which codifies statistical tests (including the partisan-bias and
//     mean-median tests) for evaluating partisan symmetry in Utah's congressional
//     maps, as invited by the court's redistricting ruling. → Election Integrity
//
//   node scripts/deepen-utah-legislators-core-issues-jun2026.mjs              # dry run + issueKey validation
//   node scripts/deepen-utah-legislators-core-issues-jun2026.mjs --write-html # idempotently splice into index.html
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'fs';

const WRITE_HTML = process.argv.includes('--write-html');
const HTML = 'index.html';

// Each entry targets the member's CURATED stance id and ACCT_SPOTLIGHT pid
// (verified to exist), so the new cards light up Stance-at-a-Glance, Connected
// Evidence, and the "X/10 core issues" footprint.
const ADDS = [
  {
    stanceId: 'stephanie_gricius', acctId: 'gricius_h50',
    stance: { topic:'Election Integrity', icon:'🗳', pos:'support', issueKey:'election_integrity', issueStance:'support',
      text:'Chief-sponsored H.B. 69 (2025), the Voter Records Amendments, which makes it a class B misdemeanor for a government officer to access or disclose how or when an individual voter returned a ballot for a personal or political purpose; it passed the Utah House unanimously and took effect May 7, 2025.',
      evidence:'Sponsored H.B. 69 (2025) in response to a county clerk tracking how specific officials returned their ballots; she described it as adding "a code of conduct for county clerks to follow."',
      source:{ label:'le.utah.gov', url:'https://le.utah.gov/~2025/bills/static/HB0069.html' } },
    spotlight: { impact:'positive', category:'voting', date:'2025', tags:['Notable Actions'], issueKey:'election_integrity',
      headline:'Chief-sponsored a voter-records privacy law',
      facts:'Gricius chief-sponsored H.B. 69 (2025), which makes it a class B misdemeanor for a government officer to access or disclose how or when an individual voter returned a ballot for a personal or political purpose; it passed the Utah House unanimously and took effect May 7, 2025. She introduced it after a county clerk tracked how specific officials returned their ballots.',
      why:'A bill the member personally carried — paired with her own stated rationale — is direct evidence of what she prioritizes on election administration.',
      source:{ label:'le.utah.gov', url:'https://le.utah.gov/~2025/bills/static/HB0069.html' } },
  },
  {
    stanceId: 'brady_brammer', acctId: 'brammer_s21',
    stance: { topic:'Redistricting Standards', icon:'🗳', pos:'support', issueKey:'election_integrity', issueStance:'support',
      text:'Chief-sponsored S.B. 1011 (2025 special session), which codifies statistical tests — including the partisan-bias and mean-median difference tests — for evaluating partisan symmetry in Utah\'s congressional maps, after a court ruling invited such standards.',
      evidence:'Sponsored S.B. 1011 (2025 special session); the bill implements three pass/fail symmetry tests as invited by the court\'s redistricting ruling.',
      source:{ label:'Utah Senate', url:'https://senate.utah.gov/proposed-redistricting-standards-bill-now-include-three-tests/' } },
    spotlight: { impact:'neutral', category:'voting', date:'2025', tags:['Notable Actions'], issueKey:'election_integrity',
      headline:'Chief-sponsored Utah\'s congressional-map symmetry standards',
      facts:'Brammer chief-sponsored S.B. 1011 (2025 special session), which codifies statistical tests — including the partisan-bias and mean-median difference tests — for evaluating partisan symmetry in Utah\'s congressional maps, as invited by the court\'s redistricting ruling.',
      why:'A bill the member personally carried on how the state draws and tests its election maps is direct evidence of his record on election administration.',
      source:{ label:'Utah Senate', url:'https://senate.utah.gov/proposed-redistricting-standards-bill-now-include-three-tests/' } },
  },
];

// ── Serialization (match index.html formatting exactly) ──────────────────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function fmtStance(c) {
  const ev = c.evidence ? ` evidence:'${esc(c.evidence)}',` : '';
  return `      { topic:'${esc(c.topic)}', icon:'${c.icon}', pos:'${c.pos}', issueKey:'${c.issueKey}', issueStance:'${c.issueStance}', text:'${esc(c.text)}',${ev} source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'} },\n`;
}
function fmtSpotlight(s) {
  const tags = (s.tags || []).map(t => `'${esc(t)}'`).join(',');
  return [
    `        { impact:'${s.impact}', category:'${s.category}', date:'${esc(s.date)}', tags:[${tags}], issueKey:'${s.issueKey}',`,
    `          headline:'${esc(s.headline)}',`,
    `          facts:'${esc(s.facts)}',`,
    `          why:'${esc(s.why)}',`,
    `          source:{ label:'${esc(s.source.label)}', url:'${esc(s.source.url)}' } },`,
  ].join('\n') + '\n';
}

function loadIssueMapKeys(html) {
  const mapSlice = html.slice(html.indexOf('var ISSUE_MAP = {'), html.indexOf('try { window.ISSUE_MAP'));
  return new Set([...mapSlice.matchAll(/^\s{6}([a-z_]+):\s*\{\s*label:/gm)].map(m => m[1]));
}

function spliceHtml(html) {
  let out = html;
  let added = { stance: 0, spotlight: 0 };
  const stanceStart = out.indexOf('var ISSUE_STANCE_DATA = {');
  const acctStart = out.indexOf('window.ACCT_SPOTLIGHT = window.ACCT_SPOTLIGHT');
  for (const d of ADDS) {
    // stance
    const sAnchor = `\n    ${d.stanceId}: [`;
    const sAt = out.indexOf(sAnchor, stanceStart);
    if (sAt === -1) { console.log(`  ⚠ ${d.stanceId}: stance anchor not found`); }
    else {
      const blockEnd = out.indexOf('\n    ],', sAt);
      if (!(blockEnd > -1 && out.slice(sAt, blockEnd).includes(`text:'${esc(d.stance.text)}'`))) {
        const lineStart = out.indexOf('\n', sAt + sAnchor.length) + 1;
        out = out.slice(0, lineStart) + fmtStance(d.stance) + out.slice(lineStart);
        added.stance++;
      }
    }
    // spotlight
    const aAnchor = `\n      ${d.acctId}: [\n`;
    const aAt = out.indexOf(aAnchor, acctStart);
    if (aAt === -1) { console.log(`  ⚠ ${d.acctId}: spotlight anchor not found`); }
    else {
      const blockEnd = out.indexOf('\n      ],', aAt);
      if (!(blockEnd > -1 && out.slice(aAt, blockEnd).includes(`facts:'${esc(d.spotlight.facts)}'`))) {
        const insertPos = aAt + aAnchor.length;
        out = out.slice(0, insertPos) + fmtSpotlight(d.spotlight) + out.slice(insertPos);
        added.spotlight++;
      }
    }
  }
  return { out, added };
}

(async () => {
  console.log(`PolitiDex — Utah legislator core-issue pass  [${WRITE_HTML ? 'WRITE-HTML' : 'DRY RUN'}]\n`);
  const html = readFileSync(HTML, 'utf8');
  const valid = loadIssueMapKeys(html);
  let bad = 0;
  for (const d of ADDS) {
    if (!valid.has(d.stance.issueKey)) { console.log(`  ⚠ ${d.stanceId}: stance issueKey '${d.stance.issueKey}'`); bad++; }
    if (!valid.has(d.spotlight.issueKey)) { console.log(`  ⚠ ${d.acctId}: spotlight issueKey '${d.spotlight.issueKey}'`); bad++; }
  }
  console.log(bad ? `  ✗ ${bad} invalid issueKey(s)\n` : `  ✓ all issueKeys valid against ISSUE_MAP (${valid.size} keys)\n`);
  if (bad && WRITE_HTML) process.exit(1);
  console.log(`Roster: ${ADDS.length} legislators · each +Election Integrity (1 stance + 1 evidence)\n`);
  if (WRITE_HTML) {
    const { out, added } = spliceHtml(html);
    writeFileSync(HTML, out);
    console.log(`✎ index.html: +${added.stance} stance cards, +${added.spotlight} evidence items (idempotent).`);
  } else {
    console.log('Re-run with --write-html to splice index.html.');
  }
})();
