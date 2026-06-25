#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — REMOVE the SAVE Act (H.R. 22) as a batch / common evidence anchor
// (June 2026)
//
// The wave-2 federal-House deepening pass
// (scripts/deepen-house-4-5seat-incumbents-wave2-jun2026.mjs) used two reusable
// factories — saveSpotlight() and saveStance() — to splice the SAME SAVE-Act
// vote into TWELVE Republican incumbents at once, as both a Connected-Evidence
// item and an "Election Integrity" stance card. That turned a single party-line
// floor vote (H.R. 22 passed 220–208 on near-party lines) into a shared anchor
// repeated across one party's members, which is exactly the grouping effect the
// Evidence Locker's "By Politician" view should avoid: every vote should read as
// an individual action belonging to that specific person.
//
// None of the twelve sponsored H.R. 22 (its sponsor was Rep. Chip Roy) or made
// election integrity a signature issue, so under the "keep only if genuinely
// individual" rule NONE qualifies for a single attributed keep — the SAVE-Act
// vote is removed from all twelve, both the spotlight item and the stance card.
//
// Every affected member still carries 5–7 individualized stance cards and 2–5
// individualized spotlight items after removal, so evidence quality stays high.
// Five members (Crawford, Womack, Westerman, Kelly, Guest) would otherwise drop
// to just two spotlight items, so this pass also splices ONE individualized
// replacement spotlight item for each — every one grounded in a fact already
// verified inside that member's own profile (their existing stance cards), so no
// new factual claim is introduced and the existing source is reused.
//
//   node scripts/cleanup-save-act-batch-anchor-jun2026.mjs              # dry run (report only)
//   node scripts/cleanup-save-act-batch-anchor-jun2026.mjs --write-html # idempotently rewrite index.html
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'fs';

const WRITE_HTML = process.argv.includes('--write-html');
const HTML = 'index.html';

// The twelve Republican incumbents the wave-2 pass batched the SAVE Act onto.
const SAVE_MEMBERS = [
  'zach_nunn', 'rick_crawford', 'french_hill', 'steve_womack', 'bruce_westerman',
  'trent_kelly', 'michael_guest', 'mike_ezell', 'josh_brecheen', 'frank_lucas',
  'tom_cole', 'stephanie_bice',
];

// Individualized replacement spotlight items for the five members who would
// otherwise be left with only two. Each fact is already verified in that
// member's own Stance-at-a-Glance cards; the source is reused from there.
const REPLACEMENTS = {
  rick_crawford: {
    impact: 'neutral', category: 'voting', date: '2019–2021', tags: ['Notable Actions', 'Consistency'], issueKey: 'gun_rights',
    headline: 'Voted against expanding firearm background checks',
    facts: 'Crawford voted no on the Bipartisan Background Checks Act (H.R. 8) in both 2019 and 2021, opposing expanded background-check requirements for firearm transfers — a recorded position consistent with the gun-rights stance he runs on.',
    why: 'A recorded vote that matches his stated position is part of his own record.',
    source: { label: 'OnTheIssues', url: 'https://www.ontheissues.org/House/Rick_Crawford_Gun_Control.htm' },
  },
  steve_womack: {
    impact: 'neutral', category: 'rhetoric', date: '2018–2025', tags: ['Consistency', 'Notable Actions'], issueKey: 'national_debt',
    headline: 'Pushed a balanced-budget amendment and signed the Taxpayer Protection Pledge',
    facts: 'Womack has proposed a constitutional balanced-budget amendment and signed the Taxpayer Protection Pledge, framing his fiscal record around spending restraint and opposition to debt-limit increases.',
    why: 'A documented, sustained fiscal position is part of how he defines his own record.',
    source: { label: 'OnTheIssues', url: 'https://ontheissues.org/House/Steve_Womack.htm' },
  },
  bruce_westerman: {
    impact: 'neutral', category: 'voting', date: '2021', tags: ['Notable Actions', 'Consistency'], issueKey: 'gun_rights',
    headline: 'Voted against the 2021 Enhanced Background Checks Act',
    facts: 'Westerman voted no on the Enhanced Background Checks Act of 2021 and has drawn consistent "A" ratings from the NRA Political Victory Fund, a recorded position on firearm policy.',
    why: 'A recorded vote on a high-profile firearms bill is part of his own record.',
    source: { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Bruce_Westerman' },
  },
  trent_kelly: {
    impact: 'positive', category: 'rhetoric', date: '2024', tags: ['Notable Actions', 'Consistency'], issueKey: 'rural_ag',
    headline: 'Introduced an emergency farm-aid bill for struggling crop producers',
    facts: 'Kelly introduced the bipartisan Farmer Assistance and Revenue Mitigation Act of 2024 to direct emergency payments to crop producers squeezed by low commodity prices and high input costs in his agriculture-heavy north Mississippi district.',
    why: 'Filing legislation tied to his district economy is follow-through in his own record.',
    source: { label: 'House.gov', url: 'https://trentkelly.house.gov/newsroom/documentsingle.aspx?DocumentID=7467' },
  },
  michael_guest: {
    impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Notable Actions', 'Consistency'], issueKey: 'border_security',
    headline: 'Co-introduced the Comprehensive Southern Border Strategy Act',
    facts: 'Guest co-introduced the Comprehensive Southern Border Strategy Act, which would require the Department of Homeland Security to deliver Congress a written strategy to gain operational control of every mile of the southern border, tracking the border-enforcement work he leads as a Homeland Security subcommittee chairman.',
    why: 'Co-sponsoring legislation that matches his committee role is follow-through in his own record.',
    source: { label: 'House.gov', url: 'https://guest.house.gov/media/press-releases/guest-joins-kim-introduction-comprehensive-southern-border-strategy-act' },
  },
};

function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

// One ACCT_SPOTLIGHT item, 8-space indented, terminated with a comma — matches
// the formatting the wave-2 splicer produced.
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

// Matches the batched SAVE-Act ACCT_SPOTLIGHT object (5 lines, any member name).
const SPOT_SAVE = new RegExp(
  " {8}\\{ impact:'neutral', category:'voting', date:'2025', tags:\\['Notable Actions'\\], issueKey:'election_integrity',\\n" +
  " {10}headline:'Voted for the SAVE Act',\\n" +
  " {10}facts:'[^\\n]*',\\n" +
  " {10}why:'[^\\n]*',\\n" +
  " {10}source:\\{ label:'House Clerk', url:'https://clerk\\.house\\.gov/Votes/2025102' \\} \\},\\n",
  'g',
);

// Matches the batched SAVE-Act ISSUE_STANCE_DATA card (single line, identical
// across members).
const STANCE_SAVE = new RegExp(
  " {6}\\{ topic:'Election Integrity', icon:'🗳', pos:'support', issueKey:'election_integrity', issueStance:'support', " +
  "text:'Voted for the SAVE Act \\(H\\.R\\. 22\\)[^\\n]*url:'https://clerk\\.house\\.gov/Votes/2025102'\\} \\},\\n",
  'g',
);

function run(html) {
  let out = html;

  const spotRemoved = (out.match(SPOT_SAVE) || []).length;
  out = out.replace(SPOT_SAVE, '');

  const stanceRemoved = (out.match(STANCE_SAVE) || []).length;
  out = out.replace(STANCE_SAVE, '');

  // Splice individualized replacements into the spotlight region (idempotent).
  const acctStart = out.indexOf('window.ACCT_SPOTLIGHT = window.ACCT_SPOTLIGHT');
  let added = 0;
  for (const [id, item] of Object.entries(REPLACEMENTS)) {
    const anchor = `\n      ${id}: [\n`;
    const at = out.indexOf(anchor, acctStart);
    if (at === -1) { console.log(`  ⚠ ${id}: ACCT_SPOTLIGHT anchor not found — skipped replacement`); continue; }
    const blockEnd = out.indexOf('\n      ],', at);
    if (blockEnd > -1 && out.slice(at, blockEnd).includes(`headline:'${esc(item.headline)}'`)) continue; // already present
    const insertPos = at + anchor.length;
    out = out.slice(0, insertPos) + fmtSpotlight(item) + out.slice(insertPos);
    added++;
  }

  return { out, spotRemoved, stanceRemoved, added };
}

const html = readFileSync(HTML, 'utf8');
const { out, spotRemoved, stanceRemoved, added } = run(html);

console.log(`PolitiDex — SAVE-Act batch-anchor cleanup  [${WRITE_HTML ? 'WRITE-HTML' : 'DRY RUN'}]\n`);
console.log(`  Members batched with the SAVE Act : ${SAVE_MEMBERS.length}`);
console.log(`  SAVE-Act spotlight items removed  : ${spotRemoved}`);
console.log(`  SAVE-Act stance cards removed     : ${stanceRemoved}`);
console.log(`  Individualized replacements added : ${added}  (${Object.keys(REPLACEMENTS).join(', ')})`);

const remaining = (out.match(/SAVE Act \(H\.R\. 22\)/g) || []).length;
console.log(`  "SAVE Act (H.R. 22)" mentions left : ${remaining}`);

if (WRITE_HTML) {
  writeFileSync(HTML, out);
  console.log('\n✎ index.html rewritten.');
} else {
  console.log('\nRe-run with --write-html to apply.');
}
