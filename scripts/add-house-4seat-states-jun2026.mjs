#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — U.S. House expansion, bottom-up by delegation size (June 2026)
//
// FOURTH pass of the smallest-delegation strategy. Earlier passes added the
// single-seat states (North Dakota, South Dakota), the two-seat states whose
// primaries had closed (Montana, Idaho, Maine), and the entire three-seat tier
// (Nebraska, New Mexico). This pass moves up one rung to the FOUR-seat states.
//
// Under the 2020 census apportionment there are exactly six four-seat states:
//   Arkansas, Iowa, Kansas, Mississippi, Nevada, Utah.
//
// Per the bottom-up rule we take the four-seat states whose primaries have
// already CONCLUDED in May or June 2026 and where BOTH general-election
// nominees are confirmed in every district:
//   • Iowa    (primary June 2, 2026)  — IA-01, IA-02, IA-03, IA-04
//   • Nevada  (primary June 9, 2026)  — NV-01, NV-02, NV-03, NV-04
//
// Deferred to a later wave (NOT in this pass):
//   • Utah    — already well covered (its 4-seat delegation is the project's anchor roster).
//   • Arkansas / Mississippi — primaries closed in MARCH 2026, eligible but outside the
//     May/June priority window; queued for the next four-seat wave.
//   • Kansas  — primary is Aug 4, 2026; nominees not yet set. Excluded.
//
// IA-01 (Mariannette Miller-Meeks vs Christina Bohannan) is ALSO excluded here:
// that race was already authored in the national competitive-House wave (it carries
// a full stance block AND an Evidence Locker spotlight). Re-adding it would clobber
// richer existing content, so this file covers IA-02/03/04 and all four Nevada seats.
//
// THE SEVEN CONFIRMED MATCHUPS COVERED HERE (14 nominees):
//   IA-02  OPEN (Ashley Hinson → U.S. Senate): Joe Mitchell (R) vs Lindsay James (D)
//   IA-03  Zach Nunn (R, incumbent) vs Sarah Trone Garriott (D)
//   IA-04  OPEN (Randy Feenstra → Governor): Chris McGowan (R) vs Dave Dawson (D)
//   NV-01  Dina Titus (D, incumbent) vs Carrie Buck (R)
//   NV-02  OPEN (Mark Amodei retiring): David Flippo (R) vs Teresa Benitez-Thompson (D)
//   NV-03  Susie Lee (D, incumbent) vs Marty O'Donnell (R)
//   NV-04  Steven Horsford (D, incumbent) vs Cody Whipple (R)
//
// Every district above has a Democrat AND a Republican confirmed for November as of
// June 24, 2026 (no recounts, no district-convention triggers, no open primaries).
// Iowa's 35%-threshold rule sent NO 2026 congressional primary to convention.
//
// Every record is authored to the same bar as the Utah roster and the prior House waves:
//   • a real, sourced biography (no placeholders);
//   • keyIssues + structured issue stances, each keyed to an exact ISSUE_MAP issueKey
//     (validated below against the live 86-key vocabulary in index.html) so the profile
//     lights up Stance at a Glance, the Evidence Locker issue labels, the People's
//     Mandate bridge, and the Alignment Tool;
//   • the candidate-status system: every nominee here advanced to the general, so each
//     carries candidacyStatus 'active'.
//
// CLASSIFICATION (mirrors index.html `_pdxOfficeStatus` / `_pdx2026Candidate`):
//   • A sitting member seeking RE-ELECTION to the same seat is an officeholder
//     (status 'office', green "In Office" badge) and carries nextElection '2026-11-03'.
//       → Nunn (IA-03), Titus (NV-01), Lee (NV-03), Horsford (NV-04)
//   • Anyone running for an office they do NOT currently hold is a 2026 nominee
//     (status 'candidate', rank 'nominee', office text contains "Nominee").
//       → Mitchell, James, McGowan, Dawson, Buck, Flippo, Benitez-Thompson, O'Donnell, Whipple
//
// Promises: forward-looking pledges are 'pending'. A promise is 'kept' ONLY when it maps
// to an unambiguous, documented, completed action with a citation — never a campaign
// aspiration. Following the conservative standard set by the prior House waves, every
// promise here is recorded pending: each names a specific future legislative OUTCOME not
// yet achieved. Scores reflect record DEPTH for the office being sought, not approval.
//
// CONTENT_STYLE.md: every line describes what THIS individual did, said, or pledges —
// never their party. Vote tallies/outcomes are stated as plain facts; a candidate's own
// break from, or alignment with, a position is theirs alone. Where a candidate has
// published no documented stance on an issue, none is invented.
//
//   node scripts/add-house-4seat-states-jun2026.mjs            # dry run + issueKey validation
//   node scripts/add-house-4seat-states-jun2026.mjs --emit     # write index.html ISSUE_STANCE_DATA block to /tmp
//   node scripts/add-house-4seat-states-jun2026.mjs --apply    # create docs in Firestore
//
// Idempotent: a record that already exists is skipped (never clobbered) unless --force.
// ---------------------------------------------------------------------------

import { writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const FORCE = process.argv.includes('--force');
const STAMP = '2026-06-24T00:00:00.000Z';

// Convenience source builders.
const wiki = (slug, label) => ({ label: label || 'Wikipedia', url: `https://en.wikipedia.org/wiki/${slug}` });
const bp   = (slug, label) => ({ label: label || 'Ballotpedia', url: `https://ballotpedia.org/${slug}` });

// ── The roster ──────────────────────────────────────────────────────────────
// status: 'office' (sitting, re-election) | 'candidate' (nominee for a new seat)
// positions[] become both the ISSUE_STANCE_DATA cards AND the Firestore `stances`
// mirror; promises[] drive kept/broken/pending + the Promise Score.
const PEOPLE = [

  // ══════════════════ IOWA — 2nd District (OPEN — Hinson ran for U.S. Senate) ══════════════════

  // ---- Joe Mitchell (R) vs Lindsay James (D) ----
  {
    id: 'joe_mitchell', name: 'Joe Mitchell', party: 'Republican', state: 'Iowa',
    district: 'Iowa — 2nd District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 52,
    office: 'U.S. House — 2026 Republican Nominee (Iowa 2nd District)',
    bio: "Joe Mitchell is the Republican nominee for Iowa's 2nd Congressional District, the northeastern seat " +
      "anchored by Cedar Rapids, Waterloo, and Dubuque, which is open in 2026 after Rep. Ashley Hinson left it to " +
      "run for the U.S. Senate. Elected to the Iowa House at age 21, Mitchell served two terms representing the " +
      "Mount Pleasant area before working as a regional director at the U.S. Department of Housing and Urban " +
      "Development; he is a homebuilder now based in Clear Lake. He won the June 2, 2026 Republican primary with " +
      "about 61% over state Sen. Charlie McClintock and carries endorsements from Donald Trump and Speaker Mike " +
      "Johnson. He faces Democrat Lindsay James in November and runs on term limits, a ban on congressional stock " +
      "trading, and an anti-establishment, worker-focused message.",
    keyIssues: ['Term limits', 'Congressional stock trading', 'Border security', 'Energy', 'Agriculture'],
    accountability: { overallScore: 52, summary:
      "A former two-term state representative and ex-HUD regional director making his first run for federal office. " +
      "He has a state-legislative record but no congressional voting record, so his federal positions are campaign " +
      "pledges and are marked pending; the score reflects that record depth for the office sought." },
    promises: [
      { title: 'Enact congressional term limits', verdict: 'pending', issueKey: 'term_limits',
        detail: 'Centers his campaign on term limits and casts himself as an anti-establishment outsider "willing to call out my own party."', sources: ['https://www.iowapublicradio.org/political-news/2026-05-21/candidates-running-iowa-2nd-congressional-district-primary'] },
      { title: 'Ban members of Congress from trading individual stocks', verdict: 'pending', issueKey: 'stock_trading_ban',
        detail: 'Pledges to ban congressional stock trading and says he refuses corporate PAC money.', sources: ['https://www.iowapublicradio.org/political-news/2026-05-21/candidates-running-iowa-2nd-congressional-district-primary'] },
      { title: 'Secure the southern border', verdict: 'pending', issueKey: 'border_security',
        detail: 'Backs stronger border enforcement as part of the agenda he campaigned on.', sources: ['https://www.thegazette.com/news/elections/trump-speaker-mike-johnson-endorse-joe-mitchell-for-congress-as-iowa-gop-primary-field-narrows/article_fdaadafc-1100-5fe5-ae2c-61f8c91caf38.html'] },
    ],
    positions: [
      { topic: 'Term Limits', icon: '⏳', pos: 'support', issueKey: 'term_limits', issueStance: 'support',
        text: 'Centers his campaign on enacting congressional term limits and casts himself as an outsider "willing to call out my own party."',
        evidence: 'Elected to the Iowa House at 21 and served two terms; runs on draining career incumbency from Washington.', source: { label: 'Iowa Public Radio', url: 'https://www.iowapublicradio.org/political-news/2026-05-21/candidates-running-iowa-2nd-congressional-district-primary' } },
      { topic: 'Congressional Stock Trading', icon: '🚫', pos: 'support', issueKey: 'stock_trading_ban', issueStance: 'support',
        text: 'Pledges to ban members of Congress from trading individual stocks and says he refuses corporate PAC money.', source: { label: 'Iowa Public Radio', url: 'https://www.iowapublicradio.org/political-news/2026-05-21/candidates-running-iowa-2nd-congressional-district-primary' } },
      { topic: 'Border Security', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backs stronger border enforcement as part of the agenda he campaigned on.', source: { label: 'The Gazette', url: 'https://www.thegazette.com/news/elections/trump-speaker-mike-johnson-endorse-joe-mitchell-for-congress-as-iowa-gop-primary-field-narrows/article_fdaadafc-1100-5fe5-ae2c-61f8c91caf38.html' } },
      { topic: 'Energy Production', icon: '⚡', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: 'Supports expanding domestic energy production and energy independence.', source: { label: 'The Gazette', url: 'https://www.thegazette.com/news/elections/trump-speaker-mike-johnson-endorse-joe-mitchell-for-congress-as-iowa-gop-primary-field-narrows/article_fdaadafc-1100-5fe5-ae2c-61f8c91caf38.html' } },
      { topic: 'Agriculture', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'Runs as a pro-farmer candidate emphasizing "Made in the USA" manufacturing and Iowa agriculture.', source: { label: 'NRCC', url: 'https://www.nrcc.org/2026/06/03/nrcc-statement-on-ia-02-primary-election/' } },
    ],
  },

  {
    id: 'lindsay_james', name: 'Lindsay James', party: 'Democratic', state: 'Iowa',
    district: 'Iowa — 2nd District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 54,
    office: 'U.S. House — 2026 Democratic Nominee (Iowa 2nd District)',
    bio: "Lindsay James is the Democratic nominee for Iowa's 2nd Congressional District, the open northeastern seat. " +
      "A state representative from Dubuque since 2019 and the Iowa House Democratic Whip, she is an ordained " +
      "Presbyterian minister who earned a Master of Divinity from Fuller Theological Seminary and co-founded the " +
      "Loras College Peace Institute. She won the June 2, 2026 Democratic primary with a majority of a four-way " +
      "field and faces Republican Joe Mitchell in November, centering health-care access, affordability, and " +
      "support for working families.",
    keyIssues: ['Health care', 'Cost of living', 'Child & family support', 'Housing', 'Prescription costs'],
    accountability: { overallScore: 54, summary:
      "A state representative since 2019 and the Iowa House Democratic Whip with a legislative record on health and " +
      "consumer protection, but no federal voting record. The score reflects that state-level depth for the office " +
      "sought; her congressional pledges are marked pending." },
    promises: [
      { title: 'Protect health-care coverage in the district', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Criticized the 2025 reconciliation law\'s health provisions, arguing they jeopardize coverage for roughly 27,000 people in the district, and pledges to protect access.', sources: ['https://www.iowapublicradio.org/political-news/2026-05-21/candidates-running-iowa-2nd-congressional-district-primary'] },
      { title: 'Expand the child and dependent care tax credit', verdict: 'pending', issueKey: 'family_support',
        detail: 'Campaigns on expanding the child and dependent care tax credit and on affordable childcare and housing.', sources: ['https://www.lindsayforiowa.com/'] },
      { title: 'Lower housing and prescription costs', verdict: 'pending', issueKey: 'cost_living',
        detail: 'Makes lowering health-care and housing costs a central plank, building on her work on insulin access and mobile-home tenant protections.', sources: ['https://ballotpedia.org/Lindsay_James'] },
    ],
    positions: [
      { topic: 'Health Care Access', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Criticized the 2025 reconciliation law\'s health provisions, arguing they jeopardize coverage for roughly 27,000 people in the district, and pledges to protect access.',
        evidence: 'Serves in the Iowa House and has worked on health and consumer-protection measures including insulin access.', source: { label: 'Iowa Public Radio', url: 'https://www.iowapublicradio.org/political-news/2026-05-21/candidates-running-iowa-2nd-congressional-district-primary' } },
      { topic: 'Cost of Living', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'Makes lowering health-care and housing costs a central plank of her campaign.', source: { label: 'Iowa Public Radio', url: 'https://www.iowapublicradio.org/political-news/2026-05-21/candidates-running-iowa-2nd-congressional-district-primary' } },
      { topic: 'Child & Family Support', icon: '👶', pos: 'support', issueKey: 'family_support', issueStance: 'support',
        text: 'Campaigns on expanding the child and dependent care tax credit and on affordable childcare.', source: { label: 'Campaign', url: 'https://www.lindsayforiowa.com/' } },
      { topic: 'Housing', icon: '🏘', pos: 'support', issueKey: 'housing_support', issueStance: 'support',
        text: 'Backs affordable housing and points to her state work on mobile-home tenant protections.', source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Lindsay_James' } },
      { topic: 'Prescription Costs', icon: '💊', pos: 'support', issueKey: 'health_drug_prices', issueStance: 'support',
        text: 'Worked on insulin access in the Iowa House and campaigns on lowering prescription-drug costs.', source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Lindsay_James' } },
    ],
  },

  // ══════════════════ IOWA — 3rd District (incumbent re-election) ══════════════════

  // ---- Zach Nunn (R, incumbent) vs Sarah Trone Garriott (D) ----
  {
    id: 'zach_nunn', name: 'Zach Nunn', party: 'Republican', state: 'Iowa',
    district: 'Iowa — 3rd District', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 60,
    office: '🏛 U.S. Representative — Iowa (3rd District)',
    bio: "Zach Nunn is the U.S. Representative for Iowa's 3rd Congressional District, the Des Moines-area swing seat, " +
      "in office since 2023. An Air Force combat veteran who served in intelligence, he sat in the Iowa House from " +
      "2015 to 2019 and the Iowa Senate from 2019 to 2023 before his election to Congress. He serves on the House " +
      "Financial Services and Agriculture committees and chose to seek re-election rather than run for governor. He " +
      "was unopposed in the June 2, 2026 Republican primary and faces Democratic state Sen. Sarah Trone Garriott " +
      "in November, centering agriculture and biofuels, protecting seniors, and national security.",
    keyIssues: ['Agriculture & biofuels', 'Protecting seniors', 'National security', 'Veterans', 'Taxes'],
    accountability: { overallScore: 60, summary:
      "A second-term congressman, Air Force combat veteran, and former state legislator with a record on the " +
      "Financial Services and Agriculture committees centered on biofuels and consumer protection for seniors. The " +
      "score reflects that record and tenure; his forward-looking 2026 pledges are marked pending until acted on." },
    promises: [
      { title: 'Support biofuels and Iowa agriculture', verdict: 'pending', issueKey: 'rural_ag',
        detail: 'Sits on the House Agriculture Committee and campaigns on commodities, risk management, and biofuels for Iowa farmers.', sources: ['https://nunn.house.gov/about/'] },
      { title: 'Protect seniors from financial fraud', verdict: 'pending', issueKey: 'social_security',
        detail: 'Introduced the bipartisan Guarding Unprotected Aging Retirees from Deception Act and the Social Security Overpayment Relief Act.', sources: ['https://www.govtrack.us/congress/members/zachary_zach_nunn/456898'] },
      { title: 'Strengthen national security', verdict: 'pending', issueKey: 'strong_defense',
        detail: 'An Air Force combat veteran who campaigns on national security drawn from his intelligence service.', sources: ['https://nunn.house.gov/about/'] },
    ],
    positions: [
      { topic: 'Agriculture & Biofuels', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'Sits on the House Agriculture Committee and centers commodities, risk management, and biofuels for Iowa farmers.',
        evidence: 'Serves on the House Agriculture and Financial Services committees.', source: { label: 'House.gov', url: 'https://nunn.house.gov/about/' } },
      { topic: 'Protecting Seniors', icon: '👵', pos: 'support', issueKey: 'social_security', issueStance: 'support',
        text: 'Introduced the bipartisan Guarding Unprotected Aging Retirees from Deception Act and the Social Security Overpayment Relief Act, which limits clawbacks of old overpayments.',
        evidence: 'Both measures appear on his sponsored-legislation record.', source: { label: 'GovTrack', url: 'https://www.govtrack.us/congress/members/zachary_zach_nunn/456898' } },
      { topic: 'National Security', icon: '🪖', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'An Air Force combat veteran who served in intelligence and campaigns on national security.', source: { label: 'House.gov', url: 'https://nunn.house.gov/about/' } },
      { topic: 'Veterans', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: 'A combat veteran who works on issues affecting service members and veterans.', source: { label: 'Congress.gov', url: 'https://www.congress.gov/member/zachary-nunn/N000193' } },
      { topic: 'Taxes', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Voted for the 2025 tax-and-budget reconciliation law, which paired tax cuts with Medicaid changes.', source: { label: 'Roll Call', url: 'https://rollcall.com/?p=789333' } },
    ],
  },

  {
    id: 'sarah_trone_garriott', name: 'Sarah Trone Garriott', party: 'Democratic', state: 'Iowa',
    district: 'Iowa — 3rd District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 54,
    office: 'U.S. House — 2026 Democratic Nominee (Iowa 3rd District)',
    bio: "Sarah Trone Garriott is the Democratic nominee for Iowa's 3rd Congressional District, the Des Moines-area " +
      "swing seat. A state senator from West Des Moines since 2021 and the ranking member of the Iowa Senate Health " +
      "and Human Services Committee, she is an ordained Lutheran minister and former hospital chaplain who built a " +
      "reputation flipping competitive state Senate districts. She was unopposed in the June 2, 2026 Democratic " +
      "primary and faces Rep. Zach Nunn in November, centering reproductive rights, health care, and public " +
      "education.",
    keyIssues: ['Reproductive rights', 'Health care', 'Public education', 'Water quality', 'Mental health'],
    accountability: { overallScore: 54, summary:
      "A state senator since 2021 and ranking member of the Senate Health and Human Services Committee with a record " +
      "on health, education, and reproductive rights, but no federal voting record. The score reflects that " +
      "state-level depth for the office sought; her congressional pledges are marked pending." },
    promises: [
      { title: 'Restore reproductive-rights protections', verdict: 'pending', issueKey: 'pro_choice',
        detail: 'Pledges to fight to restore nationwide abortion protections and safeguard contraception, IVF, and prenatal care.', sources: ['https://reproductivefreedomforall.org/news/reproductive-freedom-for-all-endorses-sarah-trone-garriott-in-ia-03-election-against-representative-zach-nunn/'] },
      { title: 'Protect public schools', verdict: 'pending', issueKey: 'public_schools',
        detail: 'Opposed private-school vouchers and book bans as a state senator and campaigns on protecting public education.', sources: ['https://sarahforiowa.com/about/'] },
      { title: 'Lower health-care costs', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Makes health-care access and lowering the cost of living top stated priorities.', sources: ['https://sarahforiowa.com/about/'] },
    ],
    positions: [
      { topic: 'Reproductive Rights', icon: '✊', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Pledges to fight to restore nationwide abortion protections and to safeguard contraception, IVF, and prenatal care.',
        evidence: 'Endorsed by Reproductive Freedom for All; she entered politics over a state abortion-ban exchange about ectopic pregnancy.', source: { label: 'Reproductive Freedom for All', url: 'https://reproductivefreedomforall.org/news/reproductive-freedom-for-all-endorses-sarah-trone-garriott-in-ia-03-election-against-representative-zach-nunn/' } },
      { topic: 'Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Makes health-care access and lowering the cost of living top stated priorities, drawing on her work as ranking member of the Senate Health and Human Services Committee.', source: { label: 'Campaign', url: 'https://sarahforiowa.com/about/' } },
      { topic: 'Public Education', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'Opposed private-school vouchers and book bans as a state senator and campaigns on protecting public schools.', source: { label: 'Campaign', url: 'https://sarahforiowa.com/about/' } },
      { topic: 'Water Quality', icon: '💧', pos: 'support', issueKey: 'water', issueStance: 'support',
        text: 'Campaigns on water quality and environmental protection.', source: { label: 'Campaign', url: 'https://sarahforiowa.com/about/' } },
      { topic: 'Mental Health', icon: '🧠', pos: 'support', issueKey: 'health_mental', issueStance: 'support',
        text: 'A former hospital chaplain who backs mental-health services, paid family leave, and childcare.', source: { label: 'Iowa Legislature', url: 'https://www.legis.iowa.gov/legislators/legislator?ga=90&personID=30551' } },
    ],
  },

  // ══════════════════ IOWA — 4th District (OPEN — Feenstra ran for Governor) ══════════════════

  // ---- Chris McGowan (R) vs Dave Dawson (D) ----
  {
    id: 'chris_mcgowan', name: 'Chris McGowan', party: 'Republican', state: 'Iowa',
    district: 'Iowa — 4th District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 52,
    office: 'U.S. House — 2026 Republican Nominee (Iowa 4th District)',
    bio: "Chris McGowan is the Republican nominee for Iowa's 4th Congressional District, the heavily Republican " +
      "northwestern seat anchored by Sioux City, Ames, and Council Bluffs, which is open in 2026 after Rep. Randy " +
      "Feenstra left it to run for governor. A Sioux City native, McGowan has led the Siouxland Chamber of Commerce " +
      "and The Siouxland Initiative since 2011, is a lawyer and Iowa Air National Guard veteran, and worked for " +
      "years as a Republican political consultant. He won the Republican nomination as the field cleared and " +
      "carries Donald Trump's endorsement. He faces Democrat Dave Dawson in November and campaigns on an America " +
      "First agenda, agriculture and property rights, and national defense.",
    keyIssues: ['America First', 'Agriculture & property rights', 'National defense', 'Federal spending', 'Small business'],
    accountability: { overallScore: 52, summary:
      "A longtime regional chamber-of-commerce president, lawyer, and Air National Guard veteran making his first " +
      "run for federal office. He has no legislative voting record, so his positions are campaign pledges and are " +
      "marked pending; the score reflects that record depth for the office sought." },
    promises: [
      { title: 'Stand up to China and restore energy independence', verdict: 'pending', issueKey: 'america_first',
        detail: 'Campaigns on an "America First" agenda of standing up to China and restoring domestic energy independence.', sources: ['https://www.iowapublicradio.org/ipr-news/2025-06-25/chris-mcgowan-campaigns-for-iowa-4th-congressional-district'] },
      { title: 'Defend Iowa agriculture and property rights', verdict: 'pending', issueKey: 'rural_ag',
        detail: 'Pledges to protect agricultural markets and defend landowner and property rights.', sources: ['https://www.iowapublicradio.org/ipr-news/2025-06-25/chris-mcgowan-campaigns-for-iowa-4th-congressional-district'] },
      { title: 'Cut wasteful federal spending', verdict: 'pending', issueKey: 'gov_waste',
        detail: 'Calls for eliminating wasteful federal spending alongside a strong national defense and secure borders.', sources: ['https://www.thegazette.com/campaigns-elections/sioux-citys-chris-mcgowan-touts-trump-endorsement-in-4th-congressional-district-race/'] },
    ],
    positions: [
      { topic: 'America First', icon: '🇺🇸', pos: 'support', issueKey: 'america_first', issueStance: 'support',
        text: 'Campaigns on standing up to China and restoring domestic energy independence under an "America First" banner.',
        evidence: 'Has led the Siouxland Chamber of Commerce and The Siouxland Initiative since 2011, framing his run around regional economic competitiveness.', source: { label: 'Iowa Public Radio', url: 'https://www.iowapublicradio.org/ipr-news/2025-06-25/chris-mcgowan-campaigns-for-iowa-4th-congressional-district' } },
      { topic: 'Agriculture & Property Rights', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'Pledges to protect agricultural markets and defend landowner and property rights.', source: { label: 'Iowa Public Radio', url: 'https://www.iowapublicradio.org/ipr-news/2025-06-25/chris-mcgowan-campaigns-for-iowa-4th-congressional-district' } },
      { topic: 'National Defense', icon: '🪖', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'An Air National Guard veteran who backs a strong national defense and secure borders.', source: { label: 'The Gazette', url: 'https://www.thegazette.com/campaigns-elections/sioux-citys-chris-mcgowan-touts-trump-endorsement-in-4th-congressional-district-race/' } },
      { topic: 'Federal Spending', icon: '🧹', pos: 'support', issueKey: 'gov_waste', issueStance: 'support',
        text: 'Calls for eliminating wasteful federal spending.', source: { label: 'The Gazette', url: 'https://www.thegazette.com/campaigns-elections/sioux-citys-chris-mcgowan-touts-trump-endorsement-in-4th-congressional-district-race/' } },
      { topic: 'Small Business', icon: '🏪', pos: 'support', issueKey: 'econ_smallbiz', issueStance: 'support',
        text: 'A self-described fiscal and social conservative who calls small business the backbone of the economy.', source: { label: 'KTIV', url: 'https://www.ktiv.com/2025/07/01/sioux-city-native-chris-mcgowan-makes-candidacy-iowas-4th-congressional-district-official/' } },
    ],
  },

  {
    id: 'dave_dawson', name: 'Dave Dawson', party: 'Democratic', state: 'Iowa',
    district: 'Iowa — 4th District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 53,
    office: 'U.S. House — 2026 Democratic Nominee (Iowa 4th District)',
    bio: "Dave Dawson is the Democratic nominee for Iowa's 4th Congressional District, the open northwestern seat. " +
      "A former Iowa state representative who served from 2013 to 2017, he spent nearly two decades as a Woodbury " +
      "County prosecutor — arguing and winning cases before the Iowa Supreme Court — and is an attorney and AFSCME " +
      "union member. Born in Cherokee and raised in Washta, he lives in Lawton. He won the three-way June 2, 2026 " +
      "Democratic primary and faces Republican Chris McGowan in November, centering rural health care, prescription " +
      "costs, and support for working families and family farms.",
    keyIssues: ['Prescription costs', 'Rural health care', 'Working families', 'Social Security & Medicare', 'Family farms'],
    accountability: { overallScore: 53, summary:
      "A former state representative and longtime county prosecutor with a state-legislative record but no federal " +
      "voting record. The score reflects that record depth for the office sought; his congressional pledges are " +
      "marked pending." },
    promises: [
      { title: 'Lower prescription-drug costs', verdict: 'pending', issueKey: 'health_drug_prices',
        detail: 'Campaigns on lowering prescription-drug costs, expanding rural health care, and investing in medical research.', sources: ['https://iowacapitaldispatch.com/2026/05/28/three-democrats-compete-in-iowa-4th-congressional-district-primary/'] },
      { title: 'Keep rural hospitals open', verdict: 'pending', issueKey: 'health_rural',
        detail: 'Pledges to keep rural hospitals and nursing homes open and to expand local mental-health services.', sources: ['https://iowacapitaldispatch.com/2026/05/28/three-democrats-compete-in-iowa-4th-congressional-district-primary/'] },
      { title: 'Protect Social Security and Medicare', verdict: 'pending', issueKey: 'social_security',
        detail: 'Pledges to protect Social Security and Medicare and to restore health-care subsidies.', sources: ['https://davedawsonforiowa.com/'] },
    ],
    positions: [
      { topic: 'Prescription Costs', icon: '💊', pos: 'support', issueKey: 'health_drug_prices', issueStance: 'support',
        text: 'Campaigns on lowering prescription-drug costs and investing in medical research.',
        evidence: 'A former state representative and longtime Woodbury County prosecutor.', source: { label: 'Iowa Capital Dispatch', url: 'https://iowacapitaldispatch.com/2026/05/28/three-democrats-compete-in-iowa-4th-congressional-district-primary/' } },
      { topic: 'Rural Health Care', icon: '🚑', pos: 'support', issueKey: 'health_rural', issueStance: 'support',
        text: 'Pledges to keep rural hospitals and nursing homes open and to expand local mental-health services.', source: { label: 'Iowa Capital Dispatch', url: 'https://iowacapitaldispatch.com/2026/05/28/three-democrats-compete-in-iowa-4th-congressional-district-primary/' } },
      { topic: 'Working Families', icon: '👷', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Backs raising wages, supporting working families, and cracking down on corporate monopolies he says squeeze farmers.', source: { label: 'Iowa Capital Dispatch', url: 'https://iowacapitaldispatch.com/2026/05/28/three-democrats-compete-in-iowa-4th-congressional-district-primary/' } },
      { topic: 'Social Security & Medicare', icon: '👵', pos: 'support', issueKey: 'social_security', issueStance: 'support',
        text: 'Pledges to protect Social Security and Medicare and to restore health-care subsidies.', source: { label: 'Campaign', url: 'https://davedawsonforiowa.com/' } },
      { topic: 'Family Farms', icon: '🚜', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'Campaigns on strengthening family farms and expanding rural broadband and infrastructure.', source: { label: 'Sioux County Radio', url: 'https://siouxcountyradio.com/local-news/race-to-nw-iowa-representative-dave-dawson/' } },
    ],
  },

  // ══════════════════ NEVADA — 1st District (incumbent re-election) ══════════════════

  // ---- Dina Titus (D, incumbent) vs Carrie Buck (R) ----
  {
    id: 'dina_titus', name: 'Dina Titus', party: 'Democratic', state: 'Nevada',
    district: 'Nevada — 1st District', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 62,
    office: '🏛 U.S. Representative — Nevada (1st District)',
    bio: "Dina Titus is the U.S. Representative for Nevada's 1st Congressional District, the urban Las Vegas seat, " +
      "in office since 2013 and the dean of Nevada's congressional delegation. She taught American and Nevada " +
      "government at UNLV for 34 years and served about two decades in the Nevada Senate before first winning a " +
      "U.S. House seat in 2008. She won the June 9, 2026 Democratic primary with roughly three-quarters of the " +
      "vote and faces Republican state Sen. Carrie Buck in November, centering gun-violence prevention, Nevada's " +
      "travel and tourism economy, and health care.",
    keyIssues: ['Gun-violence prevention', 'Travel & tourism', 'Health care', 'Tax fairness', 'Government accountability'],
    accountability: { overallScore: 62, summary:
      "A multi-term congresswoman, longtime UNLV professor, and former state legislator with a deep record on " +
      "gun-violence prevention and the travel-and-tourism economy that anchors Las Vegas. The score reflects that " +
      "legislative depth; her forward-looking pledges are marked pending until acted on." },
    promises: [
      { title: 'Strengthen gun-violence-prevention laws', verdict: 'pending', issueKey: 'gun_safety',
        detail: 'Co-sponsored an assault-weapons ban and universal background checks and took part in the 2016 House floor sit-in; her advocacy was shaped by the 2017 Las Vegas shooting.', sources: ['https://titus.house.gov/issues/issue/?IssueID=14894'] },
      { title: "Promote Nevada's travel and tourism economy", verdict: 'pending', issueKey: 'econ_growth',
        detail: 'Was the primary sponsor of the enacted Visit America Act promoting U.S. travel and tourism.', sources: ['https://www.govtrack.us/congress/members/dina_titus/412318'] },
      { title: 'Protect health-care and Medicaid funding', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Voted against the 2025 GOP tax package, arguing it bundled a temporary tip provision with Medicaid and food-aid cuts.', sources: ['https://www.cookpolitical.com/analysis/house/nevada-house/2026-nevada-house-analysis-could-no-tax-tips-tip-scales'] },
    ],
    positions: [
      { topic: 'Gun-Violence Prevention', icon: '🛑', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Co-sponsored an assault-weapons ban and universal background checks and took part in the 2016 House floor sit-in.',
        evidence: 'Her gun-violence-prevention advocacy was shaped by the 2017 Las Vegas shooting in her district.', source: { label: 'House.gov', url: 'https://titus.house.gov/issues/issue/?IssueID=14894' } },
      { topic: 'Travel & Tourism', icon: '✈️', pos: 'support', issueKey: 'econ_growth', issueStance: 'support',
        text: 'Was the primary sponsor of the enacted Visit America Act promoting U.S. travel and tourism, a core industry for Las Vegas.',
        evidence: 'The Visit America Act was enacted into law.', source: { label: 'GovTrack', url: 'https://www.govtrack.us/congress/members/dina_titus/412318' } },
      { topic: 'Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Voted against the 2025 GOP tax package over its Medicaid and food-aid cuts.', source: { label: 'Cook Political Report', url: 'https://www.cookpolitical.com/analysis/house/nevada-house/2026-nevada-house-analysis-could-no-tax-tips-tip-scales' } },
      { topic: 'Tax Fairness', icon: '⚖️', pos: 'oppose', issueKey: 'tax_middle_class', issueStance: 'oppose',
        text: 'Opposed the 2025 GOP tax package, arguing its no-tax-on-tips provision sunsets in 2028 and was bundled with cuts to safety-net programs.', source: { label: 'Cook Political Report', url: 'https://www.cookpolitical.com/analysis/house/nevada-house/2026-nevada-house-analysis-could-no-tax-tips-tip-scales' } },
      { topic: 'Government Accountability', icon: '🔎', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Sponsored the No Taxpayer Bailouts for Insurrectionists Act in 2026.', source: { label: 'GovTrack', url: 'https://www.govtrack.us/congress/members/dina_titus/412318' } },
    ],
  },

  {
    id: 'carrie_buck', name: 'Carrie Buck', party: 'Republican', state: 'Nevada',
    district: 'Nevada — 1st District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 54,
    office: 'U.S. House — 2026 Republican Nominee (Nevada 1st District)',
    bio: "Carrie Buck is the Republican nominee for Nevada's 1st Congressional District, the urban Las Vegas seat. " +
      "A Nevada state senator since 2020 — the only candidate to flip a state Senate seat Republican that year and " +
      "re-elected in 2024 — she is a career educator who was an elementary-school principal, a Milken Educator " +
      "Award winner, and principal of a Pinecrest Academy charter school, with a Ph.D. from Nova Southeastern. She " +
      "won the June 9, 2026 Republican primary and faces Rep. Dina Titus in November, centering education and " +
      "school choice, public safety, and health-care access.",
    keyIssues: ['Education & school choice', 'Public safety', 'Teacher support', 'Health care access'],
    accountability: { overallScore: 54, summary:
      "A state senator since 2020 and longtime school principal with a state-legislative record on education and " +
      "public safety, but no federal voting record. The score reflects that state-level depth for the office " +
      "sought; her congressional pledges are marked pending." },
    promises: [
      { title: 'Expand school-choice options', verdict: 'pending', issueKey: 'school_choice',
        detail: 'Supports expanded Opportunity Scholarships and state funding for school-choice options, and sponsored charter-school facility tax-credit legislation.', sources: ['https://ballotpedia.org/Carrie_Buck_(Nevada)'] },
      { title: 'Strengthen penalties for trafficking', verdict: 'pending', issueKey: 'immig_fentanyl',
        detail: 'Sponsored state bills strengthening penalties for human trafficking and fentanyl trafficking.', sources: ['https://en.wikipedia.org/wiki/Carrie_A._Buck'] },
      { title: 'Improve health-care access', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Says Nevada needs greater access to quality health care.', sources: ['https://ballotpedia.org/Carrie_Buck_(Nevada)'] },
    ],
    positions: [
      { topic: 'Education & School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Supports expanded Opportunity Scholarships and state funding for school-choice options and sponsored charter-school facility tax-credit legislation.',
        evidence: 'A career educator and former elementary-school and charter-school principal.', source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Carrie_Buck_(Nevada)' } },
      { topic: 'Public Safety', icon: '👮', pos: 'support', issueKey: 'back_police', issueStance: 'support',
        text: 'Sponsored state bills strengthening penalties for human trafficking and fentanyl trafficking.', source: { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Carrie_A._Buck' } },
      { topic: 'Teacher Support', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'On record backing teacher resources and smaller class sizes.', source: { label: 'The Nevada Independent', url: 'https://thenevadaindependent.com/article/on-the-record-senate-district-5-candidates-carrie-buck-and-jennifer-atlas' } },
      { topic: 'Health Care Access', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Says Nevada needs greater access to quality health care.', source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Carrie_Buck_(Nevada)' } },
    ],
  },

  // ══════════════════ NEVADA — 2nd District (OPEN — Amodei retiring) ══════════════════

  // ---- David Flippo (R) vs Teresa Benitez-Thompson (D) ----
  {
    id: 'david_flippo', name: 'David Flippo', party: 'Republican', state: 'Nevada',
    district: 'Nevada — 2nd District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 50,
    office: 'U.S. House — 2026 Republican Nominee (Nevada 2nd District)',
    bio: "David Flippo is the Republican nominee for Nevada's 2nd Congressional District, the northern Nevada seat " +
      "anchored by Reno, which is open in 2026 after Rep. Mark Amodei announced his retirement. A retired U.S. Air " +
      "Force lieutenant colonel who served 24 years in aircraft maintenance and logistics and earned a Bronze " +
      "Star, he later spent about a decade in the Alaska oil industry and works as a financial advisor. He won the " +
      "June 9, 2026 Republican primary with about 46% after a late endorsement from Donald Trump, and faces " +
      "Democrat Teresa Benitez-Thompson in November, centering border security, an America First economy, and " +
      "energy production.",
    keyIssues: ['Border security', 'America First economy', 'Energy', 'National defense', 'Limited government'],
    accountability: { overallScore: 50, summary:
      "A retired Air Force lieutenant colonel and financial advisor making his first run for federal office. He has " +
      "no legislative voting record, so his positions are campaign pledges and are marked pending; the score " +
      "reflects that thinner record for the office sought." },
    promises: [
      { title: 'Secure the southern border', verdict: 'pending', issueKey: 'border_security',
        detail: 'Campaigns on border security as part of an America First security agenda.', sources: ['https://ballotpedia.org/David_Flippo'] },
      { title: 'Expand domestic energy production', verdict: 'pending', issueKey: 'enviro_energy',
        detail: 'Draws on a decade in the oil industry to back expanded domestic energy production.', sources: ['https://nevadacurrent.com/2026/05/22/flippo-settelmeyer-and-11-more-republicans-seek-open-northern-nevada-u-s-house-seat/'] },
      { title: 'Cut federal spending and regulation', verdict: 'pending', issueKey: 'gov_regulation',
        detail: 'Runs on a limited-government, fiscal-restraint platform.', sources: ['https://www.clubforgrowth.org/candidates/david-flippo/'] },
    ],
    positions: [
      { topic: 'Border Security', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Campaigns on border security as part of an America First security agenda.', source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/David_Flippo' } },
      { topic: 'America First Economy', icon: '🇺🇸', pos: 'support', issueKey: 'america_first', issueStance: 'support',
        text: 'Ran as the Trump-endorsed candidate on an America First economic and security agenda.',
        evidence: 'Won the June 2026 Republican primary after a late endorsement from Donald Trump.', source: { label: 'PBS NewsHour', url: 'https://www.pbs.org/newshour/politics/trump-backed-david-flippo-wins-nevada-republican-primary-for-u-s-house-seat' } },
      { topic: 'Energy Production', icon: '⚡', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: 'Draws on a decade in the oil industry to back expanded domestic energy production.', source: { label: 'Nevada Current', url: 'https://nevadacurrent.com/2026/05/22/flippo-settelmeyer-and-11-more-republicans-seek-open-northern-nevada-u-s-house-seat/' } },
      { topic: 'National Defense', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: 'A retired Air Force lieutenant colonel and Bronze Star recipient who campaigns on national defense.', source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/David_Flippo' } },
      { topic: 'Limited Government', icon: '📉', pos: 'support', issueKey: 'gov_regulation', issueStance: 'support',
        text: 'Runs on a limited-government, fiscal-restraint platform.', source: { label: 'Club for Growth', url: 'https://www.clubforgrowth.org/candidates/david-flippo/' } },
    ],
  },

  {
    id: 'teresa_benitez_thompson', name: 'Teresa Benitez-Thompson', party: 'Democratic', state: 'Nevada',
    district: 'Nevada — 2nd District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 55,
    office: 'U.S. House — 2026 Democratic Nominee (Nevada 2nd District)',
    bio: "Teresa Benitez-Thompson is the Democratic nominee for Nevada's 2nd Congressional District, the open " +
      "northern Nevada seat anchored by Reno. A Reno native and social worker by profession, she served in the " +
      "Nevada Assembly from 2011 to 2022, rising to Majority Leader as the first Latina to hold that post, and " +
      "most recently was chief of staff to Nevada Attorney General Aaron Ford until she left in March 2026 to run. " +
      "She won the June 9, 2026 Democratic primary with about 46% and faces Republican David Flippo in November, " +
      "centering the cost of living and safety net, health care, and clean energy.",
    keyIssues: ['Cost of living', 'Health care', 'Clean energy', 'Constituent services', 'Veterans & safety net'],
    accountability: { overallScore: 55, summary:
      "A former Nevada Assembly Majority Leader and state attorney general's chief of staff with a substantial " +
      "state-government record, but no federal voting record. The score reflects that state-level depth for the " +
      "office sought; her congressional pledges are marked pending." },
    promises: [
      { title: 'Lower the cost of living and protect the safety net', verdict: 'pending', issueKey: 'cost_living',
        detail: 'A self-described budget hawk who prioritizes restored funding for SNAP, Medicaid, tribal communities, and veterans.', sources: ['https://thenevadaindependent.com/article/lawmaker-social-worker-pageant-queen-is-congress-next-for-teresa-benitez-thompson'] },
      { title: 'Restore Medicaid and SNAP funding', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Pledges to restore funding for Medicaid and food assistance.', sources: ['https://thenevadaindependent.com/article/lawmaker-social-worker-pageant-queen-is-congress-next-for-teresa-benitez-thompson'] },
      { title: 'Expand clean energy', verdict: 'pending', issueKey: 'climate_action',
        detail: 'Backs green energy and raises tribal-community concerns tied to energy development.', sources: ['https://thisisreno.com/2026/05/nevada-cd2-democratic-candidates/'] },
    ],
    positions: [
      { topic: 'Cost of Living', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'A self-described budget hawk who prioritizes restored funding for SNAP, Medicaid, tribal communities, and veterans.',
        evidence: 'Served as Nevada Assembly Majority Leader and as chief of staff to the state attorney general.', source: { label: 'The Nevada Independent', url: 'https://thenevadaindependent.com/article/lawmaker-social-worker-pageant-queen-is-congress-next-for-teresa-benitez-thompson' } },
      { topic: 'Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Pledges to restore funding for Medicaid and food assistance.', source: { label: 'The Nevada Independent', url: 'https://thenevadaindependent.com/article/lawmaker-social-worker-pageant-queen-is-congress-next-for-teresa-benitez-thompson' } },
      { topic: 'Clean Energy', icon: '🌱', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: 'Backs green energy while raising tribal-community concerns tied to energy development.', source: { label: 'This Is Reno', url: 'https://thisisreno.com/2026/05/nevada-cd2-democratic-candidates/' } },
      { topic: 'Constituent Services', icon: '🤝', pos: 'support', issueKey: 'gov_services', issueStance: 'support',
        text: 'Pledges to focus on constituent services for the district.', source: { label: 'Nevada Current', url: 'https://nevadacurrent.com/2026/05/22/and-then-there-were-8-democratic-field-narrows-slightly-in-race-for-cd2/' } },
      { topic: 'Veterans & Safety Net', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: 'Names veterans among the groups whose funding she would restore.', source: { label: 'The Nevada Independent', url: 'https://thenevadaindependent.com/article/lawmaker-social-worker-pageant-queen-is-congress-next-for-teresa-benitez-thompson' } },
    ],
  },

  // ══════════════════ NEVADA — 3rd District (incumbent re-election) ══════════════════

  // ---- Susie Lee (D, incumbent) vs Marty O'Donnell (R) ----
  {
    id: 'susie_lee', name: 'Susie Lee', party: 'Democratic', state: 'Nevada',
    district: 'Nevada — 3rd District', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 60,
    office: '🏛 U.S. Representative — Nevada (3rd District)',
    bio: "Susie Lee is the U.S. Representative for Nevada's 3rd Congressional District, the southern Las Vegas " +
      "suburbs battleground seat, in office since 2019. A member of the New Democrat Coalition and the bipartisan " +
      "Problem Solvers Caucus, she positions herself as a centrist legislator and the daughter of a Korean War " +
      "veteran. She won the June 9, 2026 Democratic primary with about three-quarters of the vote and faces " +
      "Republican Marty O'Donnell in November, centering veterans exposed to radiation and toxins, health-care " +
      "affordability, and lowering everyday costs.",
    keyIssues: ['Veterans', 'Health-care affordability', 'Border security', 'Cost of living', 'Gun safety'],
    accountability: { overallScore: 60, summary:
      "A multi-term congresswoman with a centrist, bipartisan record centered on veterans exposed to radiation and " +
      "toxins and on health-care affordability. The score reflects that legislative depth; her forward-looking " +
      "pledges are marked pending until acted on." },
    promises: [
      { title: 'Deliver care for radiation- and toxic-exposed veterans', verdict: 'pending', issueKey: 'veterans',
        detail: 'Sponsored the Sgt. Dave Crete FORGOTTEN Veterans Act and the bipartisan PROTECT Act for veterans exposed at the Nevada Test and Training Range.', sources: ['https://www.congress.gov/member/susie-lee/L000590'] },
      { title: 'Lower prescription-drug costs', verdict: 'pending', issueKey: 'health_drug_prices',
        detail: 'Touts the Inflation Reduction Act provisions lowering senior prescription costs and campaigns on health-care affordability.', sources: ['https://susielee.house.gov/about/votes-and-legislation'] },
      { title: 'Reduce everyday costs for Nevada families', verdict: 'pending', issueKey: 'tax_middle_class',
        detail: 'Voted against the 2025 GOP tax package, arguing it was temporary and bundled with safety-net cuts.', sources: ['https://www.cookpolitical.com/analysis/house/nevada-house/2026-nevada-house-analysis-could-no-tax-tips-tip-scales'] },
    ],
    positions: [
      { topic: 'Veterans', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: 'Sponsored the Sgt. Dave Crete FORGOTTEN Veterans Act and the bipartisan PROTECT Act for veterans exposed to radiation at the Nevada Test and Training Range.',
        evidence: 'The PROTECT Act was introduced with Republican Rep. Mark Amodei.', source: { label: 'Congress.gov', url: 'https://www.congress.gov/member/susie-lee/L000590' } },
      { topic: 'Health-Care Affordability', icon: '🏥', pos: 'support', issueKey: 'health_drug_prices', issueStance: 'support',
        text: 'Touts the Inflation Reduction Act provisions lowering senior prescription costs.', source: { label: 'House.gov', url: 'https://susielee.house.gov/about/votes-and-legislation' } },
      { topic: 'Border Security', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Voted for the Laken Riley Act in 2025, one of the Democrats who crossed over, reflecting a centrist record.', source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Susie_Lee' } },
      { topic: 'Cost of Living', icon: '⚖️', pos: 'oppose', issueKey: 'tax_middle_class', issueStance: 'oppose',
        text: 'Opposed the 2025 GOP tax package, arguing it was temporary and bundled with safety-net cuts.', source: { label: 'Cook Political Report', url: 'https://www.cookpolitical.com/analysis/house/nevada-house/2026-nevada-house-analysis-could-no-tax-tips-tip-scales' } },
      { topic: 'Gun Safety', icon: '🛑', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Backs background checks, an issue sharpened by the 2017 Las Vegas shooting.', source: { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Susie_Lee' } },
    ],
  },

  {
    id: 'marty_odonnell', name: "Marty O'Donnell", party: 'Republican', state: 'Nevada',
    district: 'Nevada — 3rd District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 50,
    office: "U.S. House — 2026 Republican Nominee (Nevada 3rd District)",
    bio: "Marty O'Donnell is the Republican nominee for Nevada's 3rd Congressional District, the southern Las Vegas " +
      "suburbs battleground seat. A composer best known for the music of the Halo video-game series at Bungie, he " +
      "earned degrees from Wheaton College and the University of Southern California and has lived in southern " +
      "Nevada since 2021. He carries Donald Trump's endorsement and was part of the NRCC's candidate program, and " +
      "previously ran for this seat in 2024. He won the June 9, 2026 Republican primary and faces Rep. Susie Lee in " +
      "November, centering working families, a refusal of corporate PAC money, and border security.",
    keyIssues: ['Working families', 'Campaign finance', 'Border security', 'America First'],
    accountability: { overallScore: 50, summary:
      "A composer and first-time officeholder making his second run for this seat. He has no legislative voting " +
      "record, so his positions are campaign pledges and are marked pending; the score reflects that thinner " +
      "record for the office sought." },
    promises: [
      { title: 'Refuse corporate PAC money', verdict: 'pending', issueKey: 'campaign_finance',
        detail: 'Says his campaign is "powered by patriots" and refuses corporate PAC money.', sources: ['https://martyforcongress.vote/'] },
      { title: 'Secure the border and communities', verdict: 'pending', issueKey: 'border_security',
        detail: 'Campaigns on border security and community safety.', sources: ['https://ballotpedia.org/Marty_O%27Donnell_(Nevada)'] },
      { title: 'Make one good job enough to support a family', verdict: 'pending', issueKey: 'econ_workers',
        detail: 'Centers an economic message that "one good job should be enough" for a family.', sources: ['https://martyforcongress.vote/'] },
    ],
    positions: [
      { topic: 'Working Families', icon: '👷', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Centers an economic message that "one good job should be enough" to support a family.', source: { label: 'Campaign', url: 'https://martyforcongress.vote/' } },
      { topic: 'Campaign Finance', icon: '🚫', pos: 'support', issueKey: 'campaign_finance', issueStance: 'support',
        text: 'Says his campaign is "powered by patriots" and refuses corporate PAC money.', source: { label: 'Campaign', url: 'https://martyforcongress.vote/' } },
      { topic: 'Border Security', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Campaigns on border security and community safety.', source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Marty_O%27Donnell_(Nevada)' } },
      { topic: 'America First', icon: '🇺🇸', pos: 'support', issueKey: 'america_first', issueStance: 'support',
        text: 'Ran as a Trump-endorsed candidate aligned with the America First agenda.',
        evidence: 'Carried Donald Trump\'s endorsement and took part in the NRCC candidate program.', source: { label: 'US News', url: 'https://www.usnews.com/news/politics/articles/2026-06-10/trump-backed-republican-marty-odonnell-wins-nevada-primary-for-key-house-seat' } },
    ],
  },

  // ══════════════════ NEVADA — 4th District (incumbent re-election) ══════════════════

  // ---- Steven Horsford (D, incumbent) vs Cody Whipple (R) ----
  {
    id: 'steven_horsford', name: 'Steven Horsford', party: 'Democratic', state: 'Nevada',
    district: 'Nevada — 4th District', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 60,
    office: '🏛 U.S. Representative — Nevada (4th District)',
    bio: "Steven Horsford is the U.S. Representative for Nevada's 4th Congressional District, which stretches from " +
      "North Las Vegas into rural central Nevada, in office since 2019 and previously from 2013 to 2015. The first " +
      "Black member of Congress from Nevada and a former Nevada Senate Majority Leader, he ran the Culinary " +
      "Training Academy of Las Vegas and has chaired the Congressional Black Caucus. He drew no Democratic primary " +
      "challenger and advanced unopposed; he faces Republican rancher Cody Whipple in November, centering tipped " +
      "and hospitality workers, health care, and the cost of living.",
    keyIssues: ['Tipped workers', 'Tax & tips', 'Health care', 'Workers-first economy'],
    accountability: { overallScore: 60, summary:
      "A multi-term congressman, former Nevada Senate Majority Leader, and onetime workforce-training director with " +
      "a record centered on tipped and hospitality workers. The score reflects that legislative depth; his " +
      "forward-looking pledges are marked pending until acted on." },
    promises: [
      { title: 'Make no-tax-on-tips permanent and end the sub-minimum wage', verdict: 'pending', issueKey: 'econ_workers',
        detail: 'Sponsored the TIP Improvement Act to make no-tax-on-tips permanent, eliminate the tipped sub-minimum wage, and add worker guardrails.', sources: ['https://horsford.house.gov/'] },
      { title: 'Protect Medicaid and SNAP', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Voted against the 2025 GOP tax package, arguing its tip provision was temporary and bundled with Medicaid and SNAP cuts.', sources: ['https://www.cookpolitical.com/analysis/house/nevada-house/2026-nevada-house-analysis-could-no-tax-tips-tip-scales'] },
      { title: 'Lower costs for working families', verdict: 'pending', issueKey: 'tax_middle_class',
        detail: 'Runs on a workers-first economic agenda focused on lowering everyday costs.', sources: ['https://dccc.org/steven-horsford-puts-nevadas-workers-first/'] },
    ],
    positions: [
      { topic: 'Tipped Workers', icon: '🍽', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Sponsored the TIP Improvement Act to make no-tax-on-tips permanent, eliminate the tipped sub-minimum wage, and add worker guardrails.',
        evidence: 'Ran the Culinary Training Academy of Las Vegas and works with the Culinary Union on hospitality-worker issues.', source: { label: 'House.gov', url: 'https://horsford.house.gov/' } },
      { topic: 'Tax & Tips', icon: '⚖️', pos: 'oppose', issueKey: 'tax_middle_class', issueStance: 'oppose',
        text: 'Voted against the 2025 GOP tax package, arguing its no-tax-on-tips provision was temporary and bundled with Medicaid and SNAP cuts.', source: { label: 'Cook Political Report', url: 'https://www.cookpolitical.com/analysis/house/nevada-house/2026-nevada-house-analysis-could-no-tax-tips-tip-scales' } },
      { topic: 'Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Opposed the 2025 GOP tax package over its Medicaid and SNAP cuts.', source: { label: 'Cook Political Report', url: 'https://www.cookpolitical.com/analysis/house/nevada-house/2026-nevada-house-analysis-could-no-tax-tips-tip-scales' } },
      { topic: 'Workers-First Economy', icon: '📈', pos: 'support', issueKey: 'econ_growth', issueStance: 'support',
        text: 'Runs on a workers-first economic agenda built on his hospitality-workforce background.', source: { label: 'DCCC', url: 'https://dccc.org/steven-horsford-puts-nevadas-workers-first/' } },
    ],
  },

  {
    id: 'cody_whipple', name: 'Cody Whipple', party: 'Republican', state: 'Nevada',
    district: 'Nevada — 4th District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 50,
    office: 'U.S. House — 2026 Republican Nominee (Nevada 4th District)',
    bio: "Cody Whipple is the Republican nominee for Nevada's 4th Congressional District, which runs from North Las " +
      "Vegas into rural central Nevada. A fourth-generation Nevadan, cattle rancher, and small-business owner from " +
      "Hiko, he owns a wireless-communications network serving first responders across southern Nevada and " +
      "neighboring states and played college football at Virginia Tech. He won the June 9, 2026 Republican primary " +
      "with about 63% and faces Rep. Steven Horsford in November, centering border security and election " +
      "integrity, water policy for the Colorado River basin, and infrastructure.",
    keyIssues: ['Border security', 'Election integrity', 'Water', 'Infrastructure', 'School choice'],
    accountability: { overallScore: 50, summary:
      "A rancher and small-business owner making his first run for federal office. He has no legislative voting " +
      "record, so his positions are campaign pledges and are marked pending; the score reflects that thinner " +
      "record for the office sought." },
    promises: [
      { title: 'Secure the southern border', verdict: 'pending', issueKey: 'border_security',
        detail: 'Names border security as one of his two top priorities.', sources: ['https://www.fox5vegas.com/2026/06/02/got-minute-cody-whipple-focuses-border-security-election-integrity-district-4-race/'] },
      { title: "Build out Nevada's water infrastructure", verdict: 'pending', issueKey: 'water',
        detail: 'Proposes building water networks and moving agriculture toward water-rich inland basins to address Colorado River basin shortfalls.', sources: ['https://nevadacurrent.com/2026/05/19/three-republicans-vie-for-chance-to-beat-horsford-in-cd4/'] },
      { title: 'Strengthen election integrity', verdict: 'pending', issueKey: 'election_integrity',
        detail: 'Names election integrity as one of his two top priorities.', sources: ['https://www.fox5vegas.com/2026/06/02/got-minute-cody-whipple-focuses-border-security-election-integrity-district-4-race/'] },
    ],
    positions: [
      { topic: 'Border Security', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Names border security as one of his two stated top priorities.', source: { label: 'Fox5 Vegas', url: 'https://www.fox5vegas.com/2026/06/02/got-minute-cody-whipple-focuses-border-security-election-integrity-district-4-race/' } },
      { topic: 'Election Integrity', icon: '🗳', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Names election integrity as one of his two stated top priorities.', source: { label: 'Fox5 Vegas', url: 'https://www.fox5vegas.com/2026/06/02/got-minute-cody-whipple-focuses-border-security-election-integrity-district-4-race/' } },
      { topic: 'Water', icon: '💧', pos: 'support', issueKey: 'water', issueStance: 'support',
        text: 'Proposes building water networks and moving agriculture toward water-rich inland basins to address Colorado River basin shortfalls.',
        evidence: 'A fourth-generation Nevada cattle rancher from Hiko.', source: { label: 'Nevada Current', url: 'https://nevadacurrent.com/2026/05/19/three-republicans-vie-for-chance-to-beat-horsford-in-cd4/' } },
      { topic: 'Infrastructure', icon: '🛣', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: 'Backs expanding the I-11 and U.S.-93 highways and rural broadband.', source: { label: 'Nevada Current', url: 'https://nevadacurrent.com/2026/05/19/three-republicans-vie-for-chance-to-beat-horsford-in-cd4/' } },
      { topic: 'School Choice', icon: '🎓', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: 'Supports parental control of education and school choice.', source: { label: 'Campaign', url: 'https://codyk4congress.com/' } },
    ],
  },

];

// ── Firestore value encoder / helpers ────────────────────────────────────────
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (typeof v === 'object') { const f = {}; for (const [k, val] of Object.entries(v)) f[k] = enc(val); return { mapValue: { fields: f } }; }
  throw new Error('cannot encode value: ' + String(v));
}

function tierForScore(s) { return s >= 70 ? 'silver' : 'gray'; }

// Build the full Firestore document body for one person.
function buildDoc(p) {
  const kept = p.promises.filter(x => x.verdict === 'kept').length;
  const broken = p.promises.filter(x => x.verdict === 'broken').length;
  const pending = p.promises.filter(x => x.verdict === 'pending').length;

  // stances map (topic → text) mirrors the ISSUE_STANCE_DATA cards.
  const stances = {};
  for (const c of p.positions) stances[c.topic] = c.text;

  const promises = p.promises.map(pr => ({
    title: pr.title,
    detail: pr.detail,
    verdict: pr.verdict,
    issueKey: pr.issueKey,
    sources: (pr.sources || []).map(u => ({ label: 'Source', url: u })),
  }));

  const fields = {
    name: p.name,
    office: p.office,
    party: p.party,
    state: p.state,
    icon: p.icon,
    bio: p.bio,
    keyIssues: p.keyIssues,
    promises,
    stances,
    accountability: { overallScore: p.accountability.overallScore, summary: p.accountability.summary, kept, broken, pending },
    kept, broken, pending,
    score: p.score,
    tier: tierForScore(p.score),
    profileStatus: 'full',
    candidacyStatus: p.candidacyStatus,
    nextElection: p.nextElection,
    updatedAt: STAMP,
  };
  if (p.district) fields.district = p.district;
  if (p.rank) fields.rank = p.rank;
  if (p.quote) fields.quote = p.quote;
  if (p.candidacyOutcome) fields.candidacyOutcome = p.candidacyOutcome;
  return fields;
}

async function exists(id) {
  const r = await fetch(`${BASE}/${id}`);
  return r.ok;
}
async function createDoc(id, fields) {
  // PATCH with no updateMask creates the document with the provided fields.
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`create ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

// ── Emit the index.html ISSUE_STANCE_DATA block ──────────────────────────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function emitBlock() {
  const out = [];
  out.push('    // ── U.S. House expansion · four-seat states, both nominees set (June 2026) ────');
  out.push('    // Bottom-up by delegation size, pass four: the four-seat states whose primaries');
  out.push('    // CONCLUDED in May/June 2026 — Iowa (IA-02/03/04; IA-01 already authored in the');
  out.push('    // national wave) and Nevada (NV-01/02/03/04). Utah is already covered; Arkansas and');
  out.push('    // Mississippi (March primaries) and Kansas (Aug primary) are queued for a later wave.');
  out.push('    // Each card is keyed to an ISSUE_MAP issue so the profile is comparable in the');
  out.push("    // Alignment Tool and joins Stance at a Glance, the Evidence Locker, and the People's Mandate.");
  for (const p of PEOPLE) {
    out.push(`    ${p.id}: [ // ${p.name} — ${p.office}`);
    for (const c of p.positions) {
      const parts = [`topic:'${esc(c.topic)}'`, `icon:'${c.icon}'`, `pos:'${c.pos}'`, `issueKey:'${c.issueKey}'`, `issueStance:'${c.issueStance}'`, `text:'${esc(c.text)}'`];
      if (c.detail) parts.push(`detail:'${esc(c.detail)}'`);
      if (c.evidence) parts.push(`evidence:'${esc(c.evidence)}'`);
      if (c.source) parts.push(`source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'}`);
      out.push(`      { ${parts.join(', ')} },`);
    }
    out.push('    ],');
  }
  return out.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`PolitiDex — U.S. House four-seat-states expansion  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);
  let totPos = 0, totProm = 0, withEvid = 0;
  for (const p of PEOPLE) { totPos += p.positions.length; totProm += p.promises.length; withEvid += p.positions.filter(c => c.evidence || c.source).length; }
  console.log(`${PEOPLE.length} politicians · ${totPos} issue positions (${withEvid} with evidence/source) · ${totProm} promises\n`);

  // Validate every issueKey against the live ISSUE_MAP vocabulary in index.html.
  try {
    const html = (await import('fs')).readFileSync('index.html', 'utf8');
    const mapSlice = html.slice(html.indexOf('var ISSUE_MAP = {'), html.indexOf('try { window.ISSUE_MAP'));
    const valid = new Set([...mapSlice.matchAll(/^\s{6}([a-z_]+):\s+\{ label:/gm)].map(m => m[1]));
    let bad = 0;
    for (const p of PEOPLE) {
      for (const c of p.positions) if (!valid.has(c.issueKey)) { console.log(`  ⚠ ${p.id}: unknown issueKey '${c.issueKey}'`); bad++; }
      for (const pr of p.promises) if (!valid.has(pr.issueKey)) { console.log(`  ⚠ ${p.id}: unknown promise issueKey '${pr.issueKey}'`); bad++; }
    }
    console.log(bad ? `\n  ✗ ${bad} invalid issueKey(s) — fix before applying.\n` : `  ✓ all issueKeys valid against ISSUE_MAP (${valid.size} keys)\n`);
    if (bad && APPLY) process.exit(1);
  } catch (e) { console.log(`  (issueKey validation skipped: ${e.message})`); }

  if (EMIT) {
    const f = '/tmp/house-4seat-states-stance-block.txt';
    writeFileSync(f, emitBlock());
    console.log(`Wrote ISSUE_STANCE_DATA block → ${f}\n`);
  }

  for (const p of PEOPLE) {
    const fields = buildDoc(p);
    const tag = `${p.id} (${p.name}) · ${p.party} · ${fields.kept}K/${fields.broken}B/${fields.pending}P · status=${p.candidacyStatus}`;
    if (APPLY) {
      if (!FORCE && await exists(p.id)) { console.log(`  · ${tag}: already exists — skipped`); continue; }
      await createDoc(p.id, fields);
      console.log(`  ✎ ${tag}`);
    } else {
      console.log(`  → ${tag}`);
    }
  }
  console.log(`\n${APPLY ? 'Created/updated' : 'Would create'} ${PEOPLE.length} records.`);
  if (!APPLY) console.log('Re-run with --emit to write the index.html block, --apply to write Firestore.');
})();
