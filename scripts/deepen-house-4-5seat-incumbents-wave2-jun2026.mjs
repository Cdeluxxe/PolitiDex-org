#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — federal House incumbent DEEPENING pass, WAVE 2 (June 2026)
//
// Follows scripts/deepen-house-4-5seat-incumbents-jun2026.mjs, which gave the
// sixteen sitting U.S. House incumbents from the 4-/5-seat bottom-up waves a
// first layer of 2–3 Connected-Evidence items each. This second wave thickens
// that layer with ADDITIONAL, separately-sourced legislative evidence so the
// new "By Politician" view in the Evidence Locker shows a meaningful record for
// each member — recorded floor votes, enacted/passed bills, and committee and
// leadership roles that the first wave did not already carry.
//
// Members deepened (same roster as wave 1):
//   • Iowa/Nevada  — Zach Nunn (IA-03), Dina Titus (NV-01), Susie Lee (NV-03),
//     Steven Horsford (NV-04).
//   • Arkansas/Mississippi — Rick Crawford (AR-01), French Hill (AR-02),
//     Steve Womack (AR-03), Bruce Westerman (AR-04), Trent Kelly (MS-01),
//     Bennie Thompson (MS-02), Michael Guest (MS-03), Mike Ezell (MS-04).
//   • Oklahoma — Josh Brecheen (OK-02), Frank Lucas (OK-03), Tom Cole (OK-04),
//     Stephanie Bice (OK-05).
//
// WHAT THIS WAVE ADDS — every item independently verified mid-2026 (119th Cong.):
//   • The SAVE Act (Safeguarding American Voter Eligibility Act, H.R. 22) passed
//     the House 220–208 on April 10, 2025 (Roll Call 102). Each of the twelve
//     Republican incumbents here voted YES; that recorded vote is added as
//     Connected Evidence and as an "Election Integrity" stance card. The three
//     Nevada Democrats and Bennie Thompson are NOT credited with this vote.
//   • French Hill — the GENIUS Act setting federal rules for dollar-backed
//     stablecoins was signed into law (House passed it 308–122, July 17, 2025);
//     Hill also authored the CLARITY Act (H.R. 3633), which passed the House
//     294–134 in July 2025. His digital-assets promise moves pending → KEPT.
//   • Bennie Thompson — principal author of the Implementing Recommendations of
//     the 9/11 Commission Act of 2007 (Pub. L. 110-53), an enacted-law anchor.
//   • Steven Horsford — Ways and Means seat + former Congressional Black Caucus
//     chair. Tom Cole — prior House Rules chairmanship + Native American Caucus
//     co-chair. Frank Lucas — prior House Science Committee chairmanship + 2014
//     Farm Bill authorship. Mike Ezell — Coast Guard & Maritime subcommittee
//     gavel. Dina Titus — T&I Economic Development/Public Buildings ranking
//     member. Susie Lee — Appropriations seat. Plus committee/role evidence for
//     Nunn, Crawford, Womack, Westerman, Kelly, Guest, Brecheen, Bice.
//
// SOURCING CORRECTIONS honored in this wave (research turned these up):
//   • Bice is NOT the first Republican woman in Congress from Oklahoma (Mary
//     Fallin preceded her); the credited "first" is GOP freshman class president
//     (117th) and first Iranian-American in Congress.
//   • Westerman's Save Our Sequoias Act did NOT pass the House in the 118th, so
//     it is not used. His Fix Our Forests Act (wave 1) stands.
//   • Ezell's 119th-Congress committees are Transportation & Infrastructure and
//     Natural Resources (Homeland Security was his 118th assignment).
//
// Promise verdicts: 'kept' ONLY for a bill signed into law or a recorded vote
// that completes a stated pledge. The SAVE Act only passed the House, so it is
// carried as documented evidence, NOT as a 'kept' promise. CONTENT_STYLE.md:
// every line describes what THIS person did; tallies are stated as plain facts.
//
//   node scripts/deepen-house-4-5seat-incumbents-wave2-jun2026.mjs              # dry run + issueKey validation
//   node scripts/deepen-house-4-5seat-incumbents-wave2-jun2026.mjs --write-html # idempotently splice the new
//                                                                               #   ACCT_SPOTLIGHT items + ISSUE_STANCE_DATA
//                                                                               #   cards into index.html
//   node scripts/deepen-house-4-5seat-incumbents-wave2-jun2026.mjs --apply      # PATCH Firestore (fetch-merge spotlight,
//                                                                               #   promise/accountability upgrades)
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY      = process.argv.includes('--apply');
const WRITE_HTML = process.argv.includes('--write-html');
const STAMP = '2026-06-25T00:00:00.000Z';
const HTML = 'index.html';

// Shared, verified anchors.
const SAVE = 'https://clerk.house.gov/Votes/2025102'; // SAVE Act, H.R. 22 — 220–208, Roll Call 102, Apr 10 2025
const clerkSave = { label: 'House Clerk', url: SAVE };

// A reusable SAVE-Act Connected-Evidence item for the Republican incumbents.
function saveSpotlight(name) {
  return {
    impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'election_integrity',
    headline: 'Voted for the SAVE Act',
    facts: `${name} voted yes on the SAVE Act (H.R. 22), which would require documentary proof of citizenship to register to vote in federal elections; it passed the House 220–208 on April 10, 2025 (Roll Call 102).`,
    why: 'A recorded vote on a high-profile elections bill is part of the member’s own record.',
    source: clerkSave,
  };
}
// A reusable SAVE-Act stance card (Stance at a Glance).
function saveStance(name) {
  return {
    topic: 'Election Integrity', icon: '🗳', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
    text: `Voted for the SAVE Act (H.R. 22), which would require documentary proof of citizenship to register to vote; it passed the House 220–208 on April 10, 2025.`,
    evidence: `Recorded a yes vote on H.R. 22, Roll Call 102, April 10, 2025.`,
    source: { label: 'House Clerk', url: SAVE },
  };
}

// ── The wave-2 roster ────────────────────────────────────────────────────────
// Each entry carries the NEW material only (appended to / merged with wave 1):
//   spotlight[] : new Connected-Evidence items (also spliced into index.html)
//   stances[]   : new Stance-at-a-Glance cards (also spliced into index.html)
//   promoteKept : promise titles to flip pending → kept in Firestore (documented)
//   accountabilitySummary : optional refreshed neutral summary (Firestore)
const WAVE2 = [
  // ══════════════════ IOWA / NEVADA ══════════════════
  {
    id: 'zach_nunn', party: 'R',
    spotlight: [
      saveSpotlight('Nunn'),
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Leadership Style', 'Consistency'], issueKey: 'strong_defense',
        headline: 'Vice chair of a Financial Services national-security panel',
        facts: 'Nunn serves as vice chair of the Financial Services Subcommittee on National Security, Illicit Finance, and International Financial Institutions in the 119th Congress, a perch that tracks his Air Force intelligence background.',
        why: 'A subcommittee role grounded in his prior service is a words-match-record signal.',
        source: { label: 'House.gov', url: 'https://nunn.house.gov/2025/01/15/nunn-named-vice-chair-of-national-security-subcommittee/' } },
    ],
    stances: [ saveStance('Nunn') ],
  },
  {
    id: 'dina_titus', party: 'D',
    spotlight: [
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Leadership Style', 'Notable Actions'], issueKey: 'infrastructure',
        headline: 'Ranking member of a Transportation & Infrastructure subcommittee',
        facts: 'Titus is the ranking member of the Transportation and Infrastructure Subcommittee on Economic Development, Public Buildings, and Emergency Management in the 119th Congress, the panel overseeing federal buildings, economic-development programs, and FEMA.',
        why: 'A standing leadership post on a committee of jurisdiction is a marker of her record and seniority.',
        source: { label: 'T&I Democrats', url: 'https://democrats-transportation.house.gov/news/press-releases/ranking-member-larsen-announces-tandi-subcommittee-ranking-members' } },
    ],
    stances: [
      { topic: 'Public Buildings & Disaster Response', icon: '🏛', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: 'Ranking member of the Transportation and Infrastructure Subcommittee on Economic Development, Public Buildings, and Emergency Management, overseeing federal buildings and FEMA programs.',
        source: { label: 'T&I Democrats', url: 'https://democrats-transportation.house.gov/news/press-releases/ranking-member-larsen-announces-tandi-subcommittee-ranking-members' } },
    ],
  },
  {
    id: 'susie_lee', party: 'D',
    spotlight: [
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Leadership Style', 'Notable Actions'], issueKey: 'national_debt',
        headline: 'Sits on the House Appropriations Committee',
        facts: 'Lee serves on the House Appropriations Committee in the 119th Congress, including its Defense and Energy and Water Development subcommittees, panels that write a large share of annual federal spending.',
        why: 'A seat on the panel that controls discretionary spending is a measurable marker of her standing.',
        source: { label: 'House.gov', url: 'https://susielee.house.gov/media/press-releases/congresswoman-lee-appointed-powerful-house-appropriations-committee' } },
    ],
    stances: [],
  },
  {
    id: 'steven_horsford', party: 'D',
    spotlight: [
      { impact: 'positive', category: 'rhetoric', date: '2023–2025', tags: ['Leadership Style', 'Notable Actions'], issueKey: 'gov_services',
        headline: 'Ways and Means seat and former Congressional Black Caucus chair',
        facts: 'Horsford sits on the tax-writing House Ways and Means Committee in the 119th Congress and chaired the Congressional Black Caucus in the 118th Congress, one of its most prominent leadership roles.',
        why: 'A seat on the chamber’s tax panel paired with a caucus chairmanship marks his standing in his own record.',
        source: { label: 'House.gov', url: 'https://horsford.house.gov/about/committees-and-caucuses' } },
    ],
    stances: [],
  },

  // ══════════════════ ARKANSAS ══════════════════
  {
    id: 'rick_crawford', party: 'R',
    spotlight: [ saveSpotlight('Crawford') ],
    stances: [ saveStance('Crawford') ],
  },
  {
    id: 'french_hill', party: 'R',
    accountabilitySummary:
      'A long-serving congressman and former banker who chairs the House Financial Services Committee. He steered the ' +
      'GENIUS Act regulating dollar-backed stablecoins into law and authored the CLARITY Act on digital-asset market ' +
      'structure, both passed by the House in July 2025; the score reflects that record and leadership.',
    promoteKept: ['Build a clear framework for digital assets'],
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions', 'Consistency'], issueKey: 'tech_innovation',
        headline: 'Steered the stablecoin law and a crypto market-structure bill through the House',
        facts: 'As Financial Services chairman, Hill helped move the GENIUS Act setting federal rules for dollar-backed stablecoins to enactment — the House passed it 308–122 on July 17, 2025, and it was signed into law — and he authored the CLARITY Act (H.R. 3633) on digital-asset market structure, which passed the House 294–134 in July 2025.',
        why: 'Turning his stated digital-assets priority into a signed law and a House-passed bill is direct follow-through on his own words.',
        source: { label: 'Financial Services Committee', url: 'https://financialservices.house.gov/news/documentsingle.aspx?DocumentID=410825' } },
      saveSpotlight('Hill'),
    ],
    stances: [
      { topic: 'Digital Assets', icon: '🪙', pos: 'support', issueKey: 'tech_innovation', issueStance: 'support',
        text: 'Steered the GENIUS Act regulating stablecoins into law and authored the CLARITY Act on crypto market structure; both passed the House in July 2025.',
        evidence: 'House passed the GENIUS Act 308–122 (July 17, 2025); it was signed into law. The CLARITY Act (H.R. 3633) passed the House 294–134.',
        source: { label: 'Financial Services Committee', url: 'https://financialservices.house.gov/news/documentsingle.aspx?DocumentID=410825' } },
      saveStance('Hill'),
    ],
  },
  {
    id: 'steve_womack', party: 'R',
    spotlight: [ saveSpotlight('Womack') ],
    stances: [ saveStance('Womack') ],
  },
  {
    id: 'bruce_westerman', party: 'R',
    spotlight: [ saveSpotlight('Westerman') ],
    stances: [ saveStance('Westerman') ],
  },

  // ══════════════════ MISSISSIPPI ══════════════════
  {
    id: 'trent_kelly', party: 'R',
    spotlight: [ saveSpotlight('Kelly') ],
    stances: [ saveStance('Kelly') ],
  },
  {
    id: 'bennie_thompson', party: 'D',
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2007', tags: ['Notable Actions', 'Leadership Style'], issueKey: 'gov_services',
        headline: 'Principal author of the 2007 post-9/11 homeland-security law',
        facts: 'As chairman of the House Homeland Security Committee, Thompson was the principal author of the Implementing Recommendations of the 9/11 Commission Act of 2007 (Pub. L. 110-53), signed into law August 3, 2007 — the post-9/11 homeland-security overhaul that remains a defining achievement of his tenure.',
        why: 'A signed law he authored is the most concrete kind of legislative output in his record.',
        source: { label: 'Congress.gov', url: 'https://www.congress.gov/bill/110th-congress/house-bill/1' } },
    ],
    stances: [],
  },
  {
    id: 'michael_guest', party: 'R',
    spotlight: [ saveSpotlight('Guest') ],
    stances: [ saveStance('Guest') ],
  },
  {
    id: 'mike_ezell', party: 'R',
    spotlight: [
      saveSpotlight('Ezell'),
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Leadership Style', 'Consistency'], issueKey: 'infrastructure',
        headline: 'Chairs the Coast Guard and Maritime Transportation Subcommittee',
        facts: 'Ezell chairs the Transportation and Infrastructure Subcommittee on Coast Guard and Maritime Transportation in the 119th Congress and serves as a vice chair of the full committee — assignments tied to his Gulf Coast district and its ports and shipbuilding.',
        why: 'A subcommittee gavel matched to his coastal district is a words-match-record signal.',
        source: { label: 'House Clerk', url: 'https://clerk.house.gov/members/E000235' } },
    ],
    stances: [ saveStance('Ezell') ],
  },

  // ══════════════════ OKLAHOMA ══════════════════
  {
    id: 'josh_brecheen', party: 'R',
    spotlight: [
      saveSpotlight('Brecheen'),
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Leadership Style', 'Consistency'], issueKey: 'gov_waste',
        headline: 'Budget and Homeland Security seats as a Freedom Caucus member',
        facts: 'Brecheen sits on the House Budget and Homeland Security committees as a member of the House Freedom Caucus in the 119th Congress — the perch from which he presses for federal spending cuts.',
        why: 'A committee lineup that tracks his fiscal-hawk message is a consistency signal.',
        source: { label: 'House Clerk', url: 'https://clerk.house.gov/members/B001317' } },
    ],
    stances: [ saveStance('Brecheen') ],
  },
  {
    id: 'frank_lucas', party: 'R',
    spotlight: [
      saveSpotlight('Lucas'),
      { impact: 'positive', category: 'rhetoric', date: '2014–2024', tags: ['Leadership Style', 'Notable Actions'], issueKey: 'tech_innovation',
        headline: 'Former Science Committee chairman who authored the 2014 Farm Bill',
        facts: 'Beyond his farm-policy seniority, Lucas chaired the House Science, Space, and Technology Committee in the 118th Congress (2023–2024) and authored the 2014 Farm Bill as Agriculture Committee chairman.',
        why: 'Two full-committee leadership roles across farm and science policy mark the depth of his record.',
        source: { label: 'Science Committee', url: 'https://science.house.gov/2023/1/frank-lucas-chosen-to-chair-house-science-space-and-technology-committee' } },
    ],
    stances: [ saveStance('Lucas') ],
  },
  {
    id: 'tom_cole', party: 'R',
    spotlight: [
      saveSpotlight('Cole'),
      { impact: 'positive', category: 'rhetoric', date: '2023–2025', tags: ['Leadership Style', 'Notable Actions'], issueKey: 'gov_services',
        headline: 'Chaired the Rules Committee before Appropriations; dean of Native American members',
        facts: 'Before taking the Appropriations gavel, Cole chaired the House Rules Committee in the 118th Congress (2023–2024), the panel that sets the terms of floor debate; he is the longest-serving Native American in U.S. House history and Republican co-chair of the Congressional Native American Caucus.',
        why: 'Successive committee gavels and a sustained tribal-advocacy role mark the reach of his record.',
        source: { label: 'House.gov', url: 'https://cole.house.gov/news-stories/native-news-online-tom-cole-1st-native-american-chair-house-rules-committee' } },
    ],
    stances: [ saveStance('Cole') ],
  },
  {
    id: 'stephanie_bice', party: 'R',
    spotlight: [
      saveSpotlight('Bice'),
      { impact: 'positive', category: 'rhetoric', date: '2021–2025', tags: ['Leadership Style'], issueKey: 'gov_services',
        headline: 'First woman elected GOP freshman class president; first Iranian-American in Congress',
        facts: 'Bice was elected president of her Republican freshman class in the 117th Congress — the first woman to hold that post — and is the first Iranian-American to serve in Congress.',
        why: 'An early peer-elected leadership role is a documented marker of standing in her own record.',
        source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Stephanie_Bice' } },
    ],
    stances: [ saveStance('Bice') ],
  },
];

// ── Serialization helpers (match index.html formatting exactly) ──────────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

// One ACCT_SPOTLIGHT item, 8-space indented, terminated with a comma.
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

// One ISSUE_STANCE_DATA card, 6-space indented, terminated with a comma.
function fmtStance(c) {
  const ev = c.evidence ? ` evidence:'${esc(c.evidence)}',` : '';
  return `      { topic:'${esc(c.topic)}', icon:'${c.icon}', pos:'${c.pos}', issueKey:'${c.issueKey}', issueStance:'${c.issueStance}', text:'${esc(c.text)}',${ev} source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'} },\n`;
}

// ── index.html splicer (idempotent; prepends new items into each member array) ─
// Idempotency is checked WITHIN each member's own array block, so distinct
// members can carry items that share a headline/topic (e.g. the SAVE Act vote).
function spliceHtml(html) {
  let out = html;
  let added = { spotlight: 0, stance: 0 };
  const acctStart = out.indexOf('window.ACCT_SPOTLIGHT = window.ACCT_SPOTLIGHT');
  const stanceStart = out.indexOf('var ISSUE_STANCE_DATA = {');

  for (const d of WAVE2) {
    // --- ACCT_SPOTLIGHT: anchor on 6-space "      id: [", insert before that block's "      ]," ---
    for (const s of (d.spotlight || [])) {
      const anchor = `\n      ${d.id}: [\n`;
      const at = out.indexOf(anchor, acctStart);
      if (at === -1) { console.log(`  ⚠ ${d.id}: ACCT_SPOTLIGHT anchor not found — skipped a spotlight item`); continue; }
      const blockEnd = out.indexOf('\n      ],', at);
      if (blockEnd > -1 && out.slice(at, blockEnd).includes(`headline:'${esc(s.headline)}'`)) continue; // per-member idempotency
      const insertPos = at + anchor.length;
      out = out.slice(0, insertPos) + fmtSpotlight(s) + out.slice(insertPos);
      added.spotlight++;
    }
    // --- ISSUE_STANCE_DATA: anchor on 4-space "    id: [", insert before that block's "    ]," ---
    for (const c of (d.stances || [])) {
      const anchor = `\n    ${d.id}: [`;
      const at = out.indexOf(anchor, stanceStart);
      if (at === -1) { console.log(`  ⚠ ${d.id}: ISSUE_STANCE_DATA anchor not found — skipped a stance card`); continue; }
      const blockEnd = out.indexOf('\n    ],', at);
      if (blockEnd > -1 && out.slice(at, blockEnd).includes(`topic:'${esc(c.topic)}'`)) continue; // per-member idempotency
      const lineStart = out.indexOf('\n', at + anchor.length) + 1; // start of the first existing card line
      out = out.slice(0, lineStart) + fmtStance(c) + out.slice(lineStart);
      added.stance++;
    }
  }
  return { out, added };
}

// ── Firestore encode / patch helpers (parity with wave 1) ────────────────────
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (typeof v === 'object') { const f = {}; for (const [k, val] of Object.entries(v)) f[k] = enc(val); return { mapValue: { fields: f } }; }
  throw new Error('cannot encode value: ' + String(v));
}
function dec(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
  if ('mapValue' in v) { const o = {}; for (const [k, val] of Object.entries(v.mapValue.fields || {})) o[k] = dec(val); return o; }
  return null;
}
async function getDoc(id) { const r = await fetch(`${BASE}/${id}`); if (!r.ok) return null; return r.json(); }
async function patchDoc(id, fields) {
  const mask = Object.keys(fields).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}?${mask}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

// ── Validation ───────────────────────────────────────────────────────────────
function validateIssueKeys(html) {
  const mapSlice = html.slice(html.indexOf('var ISSUE_MAP = {'), html.indexOf('try { window.ISSUE_MAP'));
  const valid = new Set([...mapSlice.matchAll(/^\s{6}([a-z_]+):\s+\{ label:/gm)].map(m => m[1]));
  let bad = 0;
  for (const d of WAVE2) {
    for (const s of (d.spotlight || [])) if (!valid.has(s.issueKey)) { console.log(`  ⚠ ${d.id}: spotlight issueKey '${s.issueKey}'`); bad++; }
    for (const c of (d.stances || [])) if (!valid.has(c.issueKey)) { console.log(`  ⚠ ${d.id}: stance issueKey '${c.issueKey}'`); bad++; }
  }
  console.log(bad ? `  ✗ ${bad} invalid issueKey(s)\n` : `  ✓ all wave-2 issueKeys valid against ISSUE_MAP (${valid.size} keys)`);
  return bad === 0;
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  const mode = APPLY ? 'APPLY (Firestore)' : WRITE_HTML ? 'WRITE-HTML' : 'DRY RUN';
  console.log(`PolitiDex — federal House incumbent deepening · WAVE 2  [${mode}]\n`);

  const html = readFileSync(HTML, 'utf8');
  const ok = validateIssueKeys(html);
  if (!ok && (APPLY || WRITE_HTML)) process.exit(1);

  const totalSpot = WAVE2.reduce((n, d) => n + (d.spotlight || []).length, 0);
  const totalStance = WAVE2.reduce((n, d) => n + (d.stances || []).length, 0);
  console.log(`\nRoster: ${WAVE2.length} incumbents · ${totalSpot} new evidence items · ${totalStance} new stance cards\n`);
  for (const d of WAVE2) {
    const ups = (d.promoteKept || []).length ? ` · ${(d.promoteKept).length} promise→kept` : '';
    console.log(`  ${d.id} (${d.party}) · +${(d.spotlight || []).length} evidence · +${(d.stances || []).length} stance${ups}`);
  }

  if (WRITE_HTML) {
    const { out, added } = spliceHtml(html);
    writeFileSync(HTML, out);
    console.log(`\n✎ index.html: +${added.spotlight} ACCT_SPOTLIGHT items, +${added.stance} ISSUE_STANCE_DATA cards (idempotent).`);
  }

  if (APPLY) {
    console.log('\nPATCHing Firestore (fetch-merge spotlight; promise/accountability upgrades):');
    for (const d of WAVE2) {
      const doc = await getDoc(d.id);
      if (!doc) { console.log(`  · ${d.id}: target missing — skipped`); continue; }
      const cur = doc.fields ? Object.fromEntries(Object.entries(doc.fields).map(([k, v]) => [k, dec(v)])) : {};
      const fields = { updatedAt: STAMP };

      // Merge new spotlight items onto existing (de-dupe by headline).
      const curSpot = Array.isArray(cur.spotlight) ? cur.spotlight : [];
      const have = new Set(curSpot.map(s => s && s.headline));
      const merged = curSpot.concat((d.spotlight || []).filter(s => !have.has(s.headline)));
      fields.spotlight = merged;

      // Promise verdict upgrades (pending → kept) where documented.
      if (Array.isArray(cur.promises) && (d.promoteKept || []).length) {
        const set = new Set(d.promoteKept);
        const promises = cur.promises.map(p => (p && set.has(p.title) && p.verdict !== 'kept') ? { ...p, verdict: 'kept' } : p);
        const kept = promises.filter(p => p && p.verdict === 'kept').length;
        const broken = promises.filter(p => p && p.verdict === 'broken').length;
        const pending = promises.filter(p => p && p.verdict === 'pending').length;
        fields.promises = promises; fields.kept = kept; fields.broken = broken; fields.pending = pending;
        fields.accountability = { summary: d.accountabilitySummary || (cur.accountability && cur.accountability.summary) || '', kept, broken, pending };
      } else if (d.accountabilitySummary) {
        const a = cur.accountability || {};
        fields.accountability = { summary: d.accountabilitySummary, kept: a.kept || cur.kept || 0, broken: a.broken || cur.broken || 0, pending: a.pending || cur.pending || 0 };
      }

      await patchDoc(d.id, fields);
      console.log(`  ✎ ${d.id}: spotlight ${curSpot.length}→${merged.length}${(d.promoteKept || []).length ? `, promoted ${d.promoteKept.join('; ')}` : ''}`);
    }
  }

  if (!APPLY && !WRITE_HTML) console.log('\nRe-run with --write-html to splice index.html, --apply to PATCH Firestore.');
})();
