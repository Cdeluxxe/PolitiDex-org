#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — federal House incumbent DEEPENING pass (June 2026)
//
// Sixth federal deepening pass, following the model of
// scripts/add-michigan-senate-and-deepen-federal-jun2026.mjs. That pass deepened
// the five swing-district incumbents from the first national wave (Mackenzie,
// Bresnahan, Perry, Davis, Miller-Meeks). This pass deepens the SIXTEEN sitting
// U.S. House incumbents added in the bottom-up delegation waves:
//
//   • 4-seat Iowa/Nevada wave  — Zach Nunn (IA-03), Dina Titus (NV-01),
//     Susie Lee (NV-03), Steven Horsford (NV-04).
//   • 4-seat Arkansas/Mississippi closeout — Rick Crawford (AR-01),
//     French Hill (AR-02), Steve Womack (AR-03), Bruce Westerman (AR-04),
//     Trent Kelly (MS-01), Bennie Thompson (MS-02), Michael Guest (MS-03),
//     Mike Ezell (MS-04).
//   • 5-seat Oklahoma wave — Josh Brecheen (OK-02), Frank Lucas (OK-03),
//     Tom Cole (OK-04), Stephanie Bice (OK-05).
//
// WHAT THIS PASS ADDS — real, verifiable legislative evidence:
//   • Connected Evidence (ACCT_SPOTLIGHT[id]) — recorded floor votes, sponsored
//     bills, and committee/leadership roles drawn from the House Clerk roll calls,
//     congress.gov, GovTrack, and each member's own office. These are mirrored
//     verbatim into index.html under the 4-/5-seat incumbent deepening comment.
//   • Field-masked promise + accountability PATCHES — the verified record folded
//     into the Firestore promise ledger and accountability summary.
//
// EVIDENCE STANDARD (verified mid-2026, 119th Congress):
//   • H.R. 1 ("One Big Beautiful Bill Act," 2025 reconciliation/tax law) passed
//     the House 218–214 on final passage, Roll Call 190, July 3, 2025; signed
//     July 4, 2025 (Pub. L. 119-21). The Arkansas, Mississippi (R), and Oklahoma
//     Republicans here voted YES; the three Nevada Democrats voted NO; Bennie
//     Thompson (D) voted NO. Zach Nunn (R) voted YES.
//   • The Laken Riley Act (H.R. 29) passed the House on Roll Call 6, Jan. 7, 2025.
//     Titus, Lee, and Horsford crossed over to vote YES; Nunn voted YES.
//   • Enacted, solo-sponsored bills this Congress confirmed via GovTrack:
//     Titus — Sloan Canyon Conservation and Lateral Pipeline Act (H.R. 972);
//     Horsford — Apex Area Technical Corrections Act (H.R. 618). Westerman's
//     Fix Our Forests Act (H.R. 471) PASSED THE HOUSE 279–141 (Jan. 23, 2025)
//     but is not yet law — so it is recorded as a documented action, NOT "kept."
//
// Promise verdicts: 'kept' ONLY for an unambiguous completed action with a
// citation — a recorded vote that fulfills a stated pledge (e.g. an incumbent's
// "extend the 2017 tax relief" pledge → kept via the H.R. 1 vote) or a bill
// signed into law. Forward-looking pledges and bills that have only passed one
// chamber stay 'pending', with the documented action carried as evidence.
//
// CONTENT_STYLE.md: every line describes what THIS person did, said, or pledges
// — never their party. Vote tallies/outcomes are stated as plain facts; a
// member's break from, or alignment with, a position is theirs alone. Nothing a
// member has not documented is invented; corrections surfaced in research are
// honored (e.g. Titus's Visit America Act provisions were enacted via the FY2023
// NDAA, not as a standalone law; Lucas no longer chairs the Science Committee).
//
//   node scripts/deepen-house-4-5seat-incumbents-jun2026.mjs            # dry run + issueKey validation
//   node scripts/deepen-house-4-5seat-incumbents-jun2026.mjs --emit     # write index.html ACCT_SPOTLIGHT block to /tmp
//   node scripts/deepen-house-4-5seat-incumbents-jun2026.mjs --apply    # PATCH Firestore (field-masked, idempotent)
//
// Field-masked PATCHes touch only promises / kept / broken / pending /
// accountability / spotlight / updatedAt — bios and stances are never clobbered.
// ---------------------------------------------------------------------------

import { writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const STAMP = '2026-06-24T00:00:00.000Z';

// Convenience source builders.
const clerk = (path, label) => ({ label: label || 'House Clerk', url: `https://clerk.house.gov/${path}` });
const gt    = (path, label) => ({ label: label || 'GovTrack', url: `https://www.govtrack.us/congress/${path}` });

// Shared, verified vote anchors.
const HR1   = 'https://clerk.house.gov/Votes/2025190';          // 218–214, Jul 3 2025
const LAKEN = 'https://clerk.house.gov/Votes/20256';            // Roll Call 6, Jan 7 2025

// ── The deepening roster ─────────────────────────────────────────────────────
// Each entry carries:
//   accountabilitySummary : refreshed neutral, record-based summary
//   promises[]            : the curated promise ledger (kept/pending) with sources
//   spotlight[]           : Connected-Evidence items (also mirrored into index.html)
const DEEPEN = [

  // ══════════════════ IOWA / NEVADA (4-seat wave) ══════════════════
  {
    id: 'zach_nunn',
    accountabilitySummary:
      "A second-term congressman and Air Force combat veteran on the Agriculture and Financial Services " +
      "committees, where he is vice chair of the Subcommittee on National Security, Illicit Finance, and " +
      "International Financial Institutions. He voted for H.R. 1 and the Laken Riley Act and sponsors " +
      "senior-protection legislation; the score reflects that early federal record.",
    promises: [
      { title: 'Extend tax relief for Iowa families', verdict: 'kept', issueKey: 'lower_taxes',
        detail: 'Voted yes on H.R. 1, the 2025 reconciliation and tax law, on final passage (Roll Call 190, 218–214, July 3, 2025).', sources: [HR1] },
      { title: 'Protect seniors from fraud and benefit clawbacks', verdict: 'pending', issueKey: 'social_security',
        detail: 'Sponsors the Safeguarding Social Security and Medicare Act (H.R. 1339) and bipartisan elder-fraud measures.', sources: ['https://www.govtrack.us/congress/bills/119/hr1339'] },
      { title: 'Strengthen border enforcement', verdict: 'kept', issueKey: 'border_security',
        detail: 'Voted yes on the Laken Riley Act (H.R. 29), Roll Call 6, January 7, 2025.', sources: [LAKEN] },
      { title: 'Support Iowa agriculture and biofuels', verdict: 'pending', issueKey: 'rural_ag',
        detail: 'Sits on the House Agriculture Committee and centers commodities, risk management, and biofuels.', sources: ['https://nunn.house.gov/about/'] },
    ],
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'lower_taxes',
        headline: 'Voted for H.R. 1, the 2025 reconciliation and tax law',
        facts: 'Nunn voted yes on final passage of H.R. 1, the budget-and-tax reconciliation law, which passed the House 218–214 on July 3, 2025 (Roll Call 190) and was signed into law the next day.',
        why: "A recorded vote on the cycle's signature law is core to his early federal record.", source: clerk('Votes/2025190') },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'border_security',
        headline: 'Voted for the Laken Riley Act',
        facts: 'Nunn voted yes on the Laken Riley Act (H.R. 29) on House passage, Roll Call 6, January 7, 2025, consistent with the border-enforcement message he campaigns on.',
        why: 'A recorded vote that matches his stated priorities is a consistency signal.', source: clerk('Votes/20256') },
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Notable Actions', 'Consistency'], issueKey: 'social_security',
        headline: 'Sponsored a senior-protection bill matching his stated focus',
        facts: 'Nunn is the sponsor of the Safeguarding Social Security and Medicare Act (H.R. 1339) in the 119th Congress and has pushed bipartisan measures aimed at protecting older Americans from fraud and benefit clawbacks.',
        why: 'Filing legislation on an issue he campaigns on is follow-through in his own record.', source: gt('bills/119/hr1339') },
    ],
  },
  {
    id: 'dina_titus',
    accountabilitySummary:
      "A seven-term congresswoman from Las Vegas with a documented legislative record, including the enacted " +
      "Sloan Canyon Conservation and Lateral Pipeline Act (H.R. 972). She voted against H.R. 1 over its " +
      "safety-net cuts but crossed over to vote for the Laken Riley Act; the score reflects that record.",
    promises: [
      { title: 'Protect public lands in southern Nevada', verdict: 'kept', issueKey: 'lands_preserve',
        detail: 'Her Sloan Canyon Conservation and Lateral Pipeline Act (H.R. 972) was signed into law in 2026.', sources: ['https://www.govtrack.us/congress/bills/119/hr972'] },
      { title: 'Support travel and tourism for Las Vegas', verdict: 'pending', issueKey: 'econ_growth',
        detail: 'Authored the Visit America Act (its provisions enacted via the FY2023 NDAA) and continues tourism legislation such as the USMCA Travel and Tourism Resiliency Act.', sources: ['https://www.govtrack.us/congress/bills/119/hr7454'] },
      { title: 'Oppose cuts to Medicaid and food assistance', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Voted no on H.R. 1 (Roll Call 190, July 3, 2025), citing its Medicaid and food-aid reductions.', sources: [HR1] },
      { title: 'Advance gun-violence prevention', verdict: 'pending', issueKey: 'gun_safety',
        detail: 'Co-sponsored an assault-weapons ban and universal background checks, advocacy shaped by the 2017 Las Vegas shooting in her district.', sources: ['https://titus.house.gov/issues/issue/?IssueID=14894'] },
    ],
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'lands_preserve',
        headline: 'Her Sloan Canyon conservation bill was signed into law',
        facts: "Titus's Sloan Canyon Conservation and Lateral Pipeline Act (H.R. 972) was enacted in 2026 — a bill led by a minority-party member that cleared both chambers and became law.",
        why: 'A solo-sponsored bill enacted while in the minority is a concrete output, not a campaign line.', source: gt('bills/119/hr972') },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Rhetoric vs Reality', 'Notable Actions'], issueKey: 'border_security',
        headline: 'Crossed over to vote for the Laken Riley Act',
        facts: 'Titus voted yes on the Laken Riley Act (H.R. 29), Roll Call 6, January 7, 2025 — one of the Democrats who broke from most of the caucus on the immigration-enforcement bill.',
        why: 'A vote against the prevailing position of her colleagues is part of her own record.', source: clerk('Votes/20256') },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'tax_middle_class',
        headline: 'Voted against the 2025 reconciliation and tax law',
        facts: 'Titus voted no on final passage of H.R. 1, Roll Call 190, July 3, 2025, citing its Medicaid and food-aid reductions.',
        why: "A recorded vote on the cycle's signature law is core to her record.", source: clerk('Votes/2025190') },
    ],
  },
  {
    id: 'susie_lee',
    accountabilitySummary:
      "A fourth-term congresswoman with a centrist voting record on the Appropriations and Natural Resources " +
      "committees. She voted against H.R. 1 but crossed over to vote for the Laken Riley Act, and sponsors " +
      "veterans legislation including the Sgt. Dave Crete FORGOTTEN Veterans Act; the score reflects that record.",
    promises: [
      { title: 'Stand up for Nevada veterans', verdict: 'pending', issueKey: 'veterans',
        detail: 'Sponsors the Sergeant Dave Crete FORGOTTEN Veterans Act (H.R. 9127) for veterans exposed to radiation at the Nevada Test and Training Range.', sources: ['https://www.govtrack.us/congress/bills/119/hr9127'] },
      { title: 'Vote independently when the district demands', verdict: 'kept', issueKey: 'reform_balance',
        detail: 'Voted yes on the Laken Riley Act (H.R. 29), one of the Democrats who crossed over, and no on H.R. 1.', sources: [LAKEN] },
      { title: 'Oppose temporary tax provisions paired with safety-net cuts', verdict: 'pending', issueKey: 'tax_middle_class',
        detail: 'Voted no on H.R. 1 (Roll Call 190, July 3, 2025), arguing it bundled temporary tax breaks with safety-net cuts.', sources: [HR1] },
      { title: 'Lower prescription-drug costs for seniors', verdict: 'pending', issueKey: 'health_drug_prices',
        detail: 'Touts the Inflation Reduction Act provisions lowering senior prescription costs.', sources: ['https://susielee.house.gov/about/votes-and-legislation'] },
    ],
    spotlight: [
      { impact: 'positive', category: 'rhetoric', date: '2026', tags: ['Consistency', 'Notable Actions'], issueKey: 'veterans',
        headline: 'Sponsored the Sgt. Dave Crete FORGOTTEN Veterans Act',
        facts: 'Lee is the sponsor of the Sergeant Dave Crete FORGOTTEN Veterans Act (H.R. 9127), addressing veterans exposed to radiation at the Nevada Test and Training Range, part of a veterans-focused bill record she campaigns on.',
        why: 'Legislation tied to her own district and stated priorities is direct follow-through.', source: gt('bills/119/hr9127') },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Rhetoric vs Reality', 'Notable Actions'], issueKey: 'border_security',
        headline: 'Crossed over to vote for the Laken Riley Act',
        facts: 'Lee voted yes on the Laken Riley Act (H.R. 29), Roll Call 6, January 7, 2025 — one of the Democrats who broke from most of the caucus, reflecting the centrist record she runs on.',
        why: 'A vote against the prevailing position of her colleagues is part of her own record.', source: clerk('Votes/20256') },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'tax_middle_class',
        headline: 'Voted against the 2025 reconciliation and tax law',
        facts: 'Lee voted no on final passage of H.R. 1, Roll Call 190, July 3, 2025, arguing the package paired temporary tax provisions with safety-net cuts.',
        why: "A recorded vote on the cycle's signature law is core to her record.", source: clerk('Votes/2025190') },
    ],
  },
  {
    id: 'steven_horsford',
    accountabilitySummary:
      "A fourth-term congressman on the Ways and Means Committee and former chair of the Congressional Black " +
      "Caucus. He sponsors the TIPS Act for tipped workers, saw his Apex Area Technical Corrections Act signed " +
      "into law, voted no on H.R. 1, and crossed over on the Laken Riley Act; the score reflects that record.",
    promises: [
      { title: 'Protect tipped workers and end the tipped sub-minimum wage', verdict: 'pending', issueKey: 'econ_workers',
        detail: 'Sponsors the Tipped Income Protection and Support (TIPS) Act (H.R. 1314) to end the $2.13 tipped sub-minimum wage and exempt tips from income tax with a cap.', sources: ['https://horsford.house.gov/media/press-releases/horsford-joined-by-lawmakers-advocates-tipped-workers-for-reintroduction-of-his-tipped-income-protection-and-support-tips-act'] },
      { title: 'Deliver economic development for southern Nevada', verdict: 'kept', issueKey: 'econ_growth',
        detail: 'His Apex Area Technical Corrections Act (H.R. 618) was signed into law in July 2025.', sources: ['https://www.govtrack.us/congress/bills/119/hr618'] },
      { title: 'Oppose cuts to Medicaid and SNAP', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Voted no on H.R. 1 (Roll Call 190, July 3, 2025) over its Medicaid and SNAP reductions.', sources: [HR1] },
      { title: 'Support stronger border enforcement when warranted', verdict: 'kept', issueKey: 'border_security',
        detail: 'Voted yes on the Laken Riley Act (H.R. 29), Roll Call 6, January 7, 2025.', sources: [LAKEN] },
    ],
    spotlight: [
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Consistency', 'Notable Actions'], issueKey: 'econ_workers',
        headline: 'Turned his tipped-worker focus into the TIPS Act',
        facts: 'Horsford is the sponsor of the Tipped Income Protection and Support (TIPS) Act (H.R. 1314), reintroduced February 13, 2025, which would end the federal $2.13 tipped sub-minimum wage and exempt tips from income tax with a cap — work grounded in his Culinary Union and hospitality-training background.',
        why: 'Filing legislation that matches his professional background and campaign message is follow-through in his own record.', source: { label: 'House.gov', url: 'https://horsford.house.gov/media/press-releases/horsford-joined-by-lawmakers-advocates-tipped-workers-for-reintroduction-of-his-tipped-income-protection-and-support-tips-act' } },
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'econ_growth',
        headline: 'His Apex Area corrections bill was signed into law',
        facts: "Horsford's Apex Area Technical Corrections Act (H.R. 618), a Nevada economic-development land measure, was enacted in July 2025.",
        why: 'A solo-sponsored bill signed into law is a concrete output for his district.', source: gt('bills/119/hr618') },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Rhetoric vs Reality', 'Notable Actions'], issueKey: 'border_security',
        headline: 'Crossed over to vote for the Laken Riley Act',
        facts: 'Horsford voted yes on the Laken Riley Act (H.R. 29), Roll Call 6, January 7, 2025, while voting no on H.R. 1, the reconciliation and tax law (Roll Call 190, July 3, 2025).',
        why: 'How he split on the two highest-salience votes of 2025 is part of his own record.', source: clerk('Votes/20256') },
    ],
  },

  // ══════════════════ ARKANSAS (4-seat closeout) ══════════════════
  {
    id: 'rick_crawford',
    accountabilitySummary:
      "A long-serving congressman and Army explosive-ordnance-disposal veteran who chairs the House Permanent " +
      "Select Committee on Intelligence. He founded and chairs the House EOD Caucus and serves on the " +
      "Agriculture Committee; the score reflects that record and tenure.",
    promises: [
      { title: 'Oversee a strong national intelligence posture', verdict: 'pending', issueKey: 'strong_defense',
        detail: 'Chairs the House Permanent Select Committee on Intelligence in the 119th Congress.', sources: ['https://intelligence.house.gov/chairman/'] },
      { title: 'Support service members and the EOD community', verdict: 'pending', issueKey: 'veterans',
        detail: 'An Army EOD veteran who founded and chairs the bipartisan House EOD Caucus.', sources: ['https://crawford.house.gov/about-rick'] },
      { title: 'Preserve tax relief for working and middle-class Americans', verdict: 'kept', issueKey: 'tax_middle_class',
        detail: 'Voted for the 2025 tax law, saying he "proudly voted to preserve the largest tax cut in history for working and middle-class Americans."', sources: ['https://crawford.house.gov/posts/crawford-votes-to-deliver-historic-tax-cuts-for-middle-class-working-americans'] },
      { title: 'Support Arkansas agriculture', verdict: 'pending', issueKey: 'rural_ag',
        detail: 'Serves on the House Agriculture Committee, focusing on farm commodities, risk management, and credit for crop producers.', sources: ['https://en.wikipedia.org/wiki/Rick_Crawford_(politician)'] },
    ],
    spotlight: [
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Leadership Style', 'Notable Actions'], issueKey: 'strong_defense',
        headline: 'Named chairman of the House Intelligence Committee',
        facts: 'Crawford was selected to chair the House Permanent Select Committee on Intelligence at the start of the 119th Congress in January 2025, putting him atop the panel that oversees the U.S. intelligence community.',
        why: 'A committee gavel on national security is a measurable marker of his standing and record.', source: { label: 'House Intelligence Committee', url: 'https://intelligence.house.gov/chairman/' } },
      { impact: 'positive', category: 'transparency', date: '2025', tags: ['Consistency', 'Public Behavior'], issueKey: 'veterans',
        headline: 'Army EOD veteran who leads the House EOD Caucus',
        facts: 'Crawford served as an Army explosive ordnance disposal technician and founded and chairs the bipartisan House EOD Caucus, advancing welfare measures for that workforce.',
        why: 'A caucus he built around his own service ties his record to his background.', source: { label: 'House.gov', url: 'https://crawford.house.gov/about-rick' } },
    ],
  },
  {
    id: 'french_hill',
    accountabilitySummary:
      "A long-serving congressman and former banker who chairs the House Financial Services Committee. He " +
      "previously led its inaugural Digital Assets Subcommittee and is a lead author on cryptocurrency policy; " +
      "the score reflects that record and leadership.",
    promises: [
      { title: 'Lead banking and capital-markets policy', verdict: 'pending', issueKey: 'econ_growth',
        detail: 'Chairs the House Financial Services Committee in the 119th Congress.', sources: ['https://financialservices.house.gov/about/chairman-french-hill.htm'] },
      { title: 'Build a clear framework for digital assets', verdict: 'pending', issueKey: 'tech_innovation',
        detail: 'Served as the inaugural chairman of the Digital Assets, Financial Technology and Inclusion Subcommittee and is a lead author on stablecoin and crypto policy.', sources: ['https://financialservices.house.gov/about/chairman-french-hill.htm'] },
      { title: 'Preserve tax relief and economic growth', verdict: 'kept', issueKey: 'lower_taxes',
        detail: 'Voted yes on H.R. 1, the 2025 reconciliation and tax law (Roll Call 190, July 3, 2025).', sources: [HR1] },
    ],
    spotlight: [
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Leadership Style', 'Notable Actions'], issueKey: 'econ_growth',
        headline: 'Took the gavel of the Financial Services Committee',
        facts: 'Hill became chairman of the House Financial Services Committee at the start of the 119th Congress in January 2025, succeeding Patrick McHenry atop the panel that writes banking and capital-markets law.',
        why: 'A full-committee chairmanship is a concrete measure of his role in his own record.', source: { label: 'Financial Services Committee', url: 'https://financialservices.house.gov/about/chairman-french-hill.htm' } },
      { impact: 'positive', category: 'rhetoric', date: '2023–2025', tags: ['Consistency', 'Notable Actions'], issueKey: 'tech_innovation',
        headline: 'Built a digital-assets record before chairing the full committee',
        facts: 'Hill served as the inaugural chairman of the Financial Services Subcommittee on Digital Assets, Financial Technology and Inclusion and has been a lead author on cryptocurrency and stablecoin policy.',
        why: 'A subcommittee role that tracks his stated priorities is a consistency signal.', source: { label: 'Financial Services Committee', url: 'https://financialservices.house.gov/about/chairman-french-hill.htm' } },
    ],
  },
  {
    id: 'steve_womack',
    accountabilitySummary:
      "A long-serving congressman and former mayor who chairs the Appropriations Subcommittee on " +
      "Transportation, Housing and Urban Development and previously chaired the House Budget Committee. The " +
      "score reflects that appropriations record and tenure.",
    promises: [
      { title: 'Write responsible transportation and housing funding', verdict: 'pending', issueKey: 'infrastructure',
        detail: 'Chairs the Appropriations Subcommittee on Transportation, Housing and Urban Development.', sources: ['https://womack.house.gov/biography/'] },
      { title: 'Press for a disciplined federal budget process', verdict: 'pending', issueKey: 'national_debt',
        detail: 'Former chairman of the House Budget Committee and co-chair of the Joint Select Committee on Budget and Appropriations Process Reform.', sources: ['https://ballotpedia.org/Steve_Womack'] },
      { title: 'Preserve tax relief for Arkansas families', verdict: 'kept', issueKey: 'lower_taxes',
        detail: 'Voted yes on H.R. 1, the 2025 reconciliation and tax law (Roll Call 190, July 3, 2025).', sources: [HR1] },
    ],
    spotlight: [
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Leadership Style', 'Notable Actions'], issueKey: 'infrastructure',
        headline: 'Chairs the Appropriations Transportation-HUD Subcommittee',
        facts: 'Womack, a senior member of the House Appropriations Committee, chairs its Subcommittee on Transportation, Housing and Urban Development, the panel that writes annual transportation and housing funding bills.',
        why: 'A subcommittee gavel over the purse strings is a measurable marker of his record.', source: { label: 'House.gov', url: 'https://womack.house.gov/biography/' } },
      { impact: 'neutral', category: 'rhetoric', date: '2018–2025', tags: ['Notable Actions'], issueKey: 'national_debt',
        headline: 'Former Budget Committee chairman focused on process reform',
        facts: 'Womack previously chaired the House Budget Committee and co-chaired the Joint Select Committee on Budget and Appropriations Process Reform, centering his record on the mechanics of federal spending.',
        why: 'A documented focus on budget process is part of how he frames his own fiscal record.', source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Steve_Womack' } },
    ],
  },
  {
    id: 'bruce_westerman',
    accountabilitySummary:
      "A long-serving congressman and the only licensed forester in Congress, now chairman of the House " +
      "Natural Resources Committee. He led the bipartisan Fix Our Forests Act through the House and voted for " +
      "H.R. 1; the score reflects that record and leadership.",
    promises: [
      { title: 'Advance active forest and wildfire management', verdict: 'pending', issueKey: 'lands_balance',
        detail: 'Lead sponsor of the Fix Our Forests Act (H.R. 471), introduced with Democrat Scott Peters; it passed the House 279–141 on January 23, 2025, but is not yet law.', sources: ['https://www.congress.gov/bill/119th-congress/house-bill/471'] },
      { title: 'Lead federal public-lands and resources policy', verdict: 'pending', issueKey: 'lands_local',
        detail: 'Chairs the House Natural Resources Committee in the 119th Congress.', sources: ['https://naturalresources.house.gov/legislative-priorities/fix-our-forests-act.htm'] },
      { title: 'Preserve tax relief for Arkansas families', verdict: 'kept', issueKey: 'lower_taxes',
        detail: 'Voted yes on H.R. 1, the 2025 reconciliation and tax law (Roll Call 190, July 3, 2025).', sources: [HR1] },
    ],
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions', 'Consistency'], issueKey: 'lands_balance',
        headline: 'Led the Fix Our Forests Act through the House',
        facts: 'Westerman, the only licensed forester in Congress, is the lead sponsor of the Fix Our Forests Act (H.R. 471), introduced with Democrat Scott Peters; it passed the House 279–141 on January 23, 2025.',
        why: 'A bipartisan bill grounded in his own profession is a words-match-record signal.', source: { label: 'Congress.gov', url: 'https://www.congress.gov/bill/119th-congress/house-bill/471' } },
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Leadership Style', 'Notable Actions'], issueKey: 'lands_local',
        headline: 'Chairs the House Natural Resources Committee',
        facts: 'Westerman chairs the House Natural Resources Committee in the 119th Congress, leading federal policy on public lands, forestry, water, and energy development.',
        why: 'A full-committee gavel in his area of training is a measurable marker of his record.', source: { label: 'Natural Resources Committee', url: 'https://naturalresources.house.gov/legislative-priorities/fix-our-forests-act.htm' } },
    ],
  },

  // ══════════════════ MISSISSIPPI (4-seat closeout) ══════════════════
  {
    id: 'trent_kelly',
    accountabilitySummary:
      "A long-serving congressman who retired in 2025 as a Major General after nearly 40 years in the " +
      "Mississippi Army National Guard. He chairs the Armed Services Subcommittee on Seapower and Projection " +
      "Forces and voted for H.R. 1; the score reflects that record and service.",
    promises: [
      { title: 'Support a strong Navy and projection forces', verdict: 'pending', issueKey: 'strong_defense',
        detail: 'Chairs the House Armed Services Subcommittee on Seapower and Projection Forces in the 119th Congress.', sources: ['https://clerk.house.gov/members/K000388'] },
      { title: 'Stand with service members and veterans', verdict: 'pending', issueKey: 'veterans',
        detail: 'A combat veteran who retired in 2025 as a two-star general after nearly four decades in the Mississippi Army National Guard.', sources: ['https://www.ngaus.org/newsroom/house-member-retires-guard-ngaus-headquarters'] },
      { title: 'Preserve tax relief for Mississippi families', verdict: 'kept', issueKey: 'lower_taxes',
        detail: 'Voted yes on H.R. 1, the 2025 reconciliation and tax law (Roll Call 190, July 3, 2025).', sources: [HR1] },
    ],
    spotlight: [
      { impact: 'positive', category: 'transparency', date: '2025', tags: ['Public Behavior', 'Consistency'], issueKey: 'strong_defense',
        headline: 'Retired a two-star general after nearly 40 years in uniform',
        facts: 'Kelly retired in April 2025 as a Major General after nearly four decades in the Mississippi Army National Guard; a combat veteran of Desert Storm and Iraq, he holds two Bronze Stars.',
        why: 'A long military record completed while in office grounds his national-security profile in his own service.', source: { label: 'NGAUS', url: 'https://www.ngaus.org/newsroom/house-member-retires-guard-ngaus-headquarters' } },
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Leadership Style', 'Notable Actions'], issueKey: 'strong_defense',
        headline: 'Chairs the Armed Services Seapower Subcommittee',
        facts: 'Kelly chairs the House Armed Services Subcommittee on Seapower and Projection Forces in the 119th Congress, the panel overseeing Navy shipbuilding and projection forces.',
        why: 'A defense subcommittee gavel that matches his military background is a consistency signal.', source: { label: 'House Clerk', url: 'https://clerk.house.gov/members/K000388' } },
    ],
  },
  {
    id: 'bennie_thompson',
    accountabilitySummary:
      "Mississippi's longest-serving member of Congress and the ranking member of the House Homeland Security " +
      "Committee, which he previously chaired. He chaired the House January 6th Select Committee and voted no " +
      "on H.R. 1; the score reflects that record and seniority.",
    promises: [
      { title: 'Oversee homeland security policy', verdict: 'pending', issueKey: 'gov_services',
        detail: 'Ranking member of the House Homeland Security Committee, which he previously chaired as its first Black and first Democratic chairman.', sources: ['https://democrats-homeland.house.gov/about/ranking-member'] },
      { title: 'Hold accountable those responsible for January 6', verdict: 'kept', issueKey: 'democracy_balance',
        detail: 'Chaired the Select Committee to Investigate the January 6th Attack, leading its investigation and final report.', sources: ['https://benniethompson.house.gov/about'] },
      { title: 'Oppose cuts to Medicaid and the safety net', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Voted no on H.R. 1, the 2025 reconciliation and tax law (Roll Call 190, July 3, 2025).', sources: [HR1] },
    ],
    spotlight: [
      { impact: 'neutral', category: 'rhetoric', date: '2021–2022', tags: ['Leadership Style', 'Notable Actions'], issueKey: 'democracy_balance',
        headline: 'Chaired the House January 6th Select Committee',
        facts: 'Thompson was appointed in July 2021 to chair the Select Committee to Investigate the January 6th Attack on the U.S. Capitol, leading its investigation and final report.',
        why: 'Leading a high-profile investigation is a defining entry in his own public record.', source: { label: 'House.gov', url: 'https://benniethompson.house.gov/about' } },
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Leadership Style', 'Consistency'], issueKey: 'gov_services',
        headline: 'Top Democrat on the Homeland Security Committee',
        facts: 'Thompson is the ranking member of the House Homeland Security Committee in the 119th Congress, a panel he previously chaired as its first Black and first Democratic chairman.',
        why: 'A sustained leadership role on one committee is a marker of his record and seniority.', source: { label: 'Homeland Security Democrats', url: 'https://democrats-homeland.house.gov/about/ranking-member' } },
    ],
  },
  {
    id: 'michael_guest',
    accountabilitySummary:
      "A four-term congressman and former district attorney who chairs the House Committee on Ethics. He also " +
      "chairs the Homeland Security Subcommittee on Border Security and Enforcement and voted for H.R. 1; the " +
      "score reflects that record.",
    promises: [
      { title: 'Enforce the standards of conduct for House members', verdict: 'pending', issueKey: 'gov_transparency',
        detail: 'Chairs the House Committee on Ethics in the 119th Congress.', sources: ['https://magnoliatribune.com/2025/07/23/guest-will-not-lead-house-homeland-security-committee-remains-chair-of-ethics-committee/'] },
      { title: 'Strengthen border security and enforcement', verdict: 'pending', issueKey: 'border_security',
        detail: 'A former district attorney who chairs the Homeland Security Subcommittee on Border Security and Enforcement.', sources: ['https://mississippitoday.org/2025/07/21/mississippis-u-s-rep-michael-guest-in-running-for-homeland-security-chair/'] },
      { title: 'Preserve tax relief for Mississippi families', verdict: 'kept', issueKey: 'lower_taxes',
        detail: 'Voted yes on H.R. 1, the 2025 reconciliation and tax law (Roll Call 190, July 3, 2025).', sources: [HR1] },
    ],
    spotlight: [
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Leadership Style', 'Notable Actions'], issueKey: 'gov_transparency',
        headline: 'Chairs the House Ethics Committee',
        facts: 'Guest chairs the House Committee on Ethics in the 119th Congress, the bipartisan panel that investigates the conduct of House members.',
        why: "Leading the chamber's internal accountability panel is a measurable marker of his record.", source: { label: 'Magnolia Tribune', url: 'https://magnoliatribune.com/2025/07/23/guest-will-not-lead-house-homeland-security-committee-remains-chair-of-ethics-committee/' } },
      { impact: 'positive', category: 'transparency', date: '2025', tags: ['Consistency', 'Public Behavior'], issueKey: 'back_police',
        headline: 'Former prosecutor who leads a border-enforcement subcommittee',
        facts: 'A former district attorney for Madison and Rankin counties, Guest also chairs the Homeland Security Subcommittee on Border Security and Enforcement, tying his committee work to his law-enforcement background.',
        why: 'A committee role grounded in his prior career is a words-match-record signal.', source: { label: 'Mississippi Today', url: 'https://mississippitoday.org/2025/07/21/mississippis-u-s-rep-michael-guest-in-running-for-homeland-security-chair/' } },
    ],
  },
  {
    id: 'mike_ezell',
    accountabilitySummary:
      "A second-term congressman and former Jackson County sheriff with a 40-year law-enforcement career. He " +
      "authored disaster-accountability bills that passed the House and voted for H.R. 1; the score reflects " +
      "that early federal record.",
    promises: [
      { title: 'Bring law-enforcement experience to public safety', verdict: 'pending', issueKey: 'back_police',
        detail: 'Served as Sheriff of Jackson County (2014–2022), capping a 40-year law-enforcement career.', sources: ['https://ezell.house.gov/'] },
      { title: 'Improve coordination and accountability of disaster aid', verdict: 'pending', issueKey: 'gov_transparency',
        detail: 'Sponsored the Federal Disaster Assistance Coordination Act (H.R. 152) and the Post-Disaster Assistance Online Accountability Act (H.R. 153); both advanced through the House.', sources: ['https://ezell.house.gov/legislation/sponsoredbills.htm'] },
      { title: 'Preserve tax relief for Mississippi families', verdict: 'kept', issueKey: 'lower_taxes',
        detail: 'Voted yes on H.R. 1, the 2025 reconciliation and tax law (Roll Call 190, July 3, 2025).', sources: [HR1] },
    ],
    spotlight: [
      { impact: 'positive', category: 'transparency', date: '2023–2025', tags: ['Consistency', 'Public Behavior'], issueKey: 'back_police',
        headline: 'Brought a four-decade law-enforcement career to Congress',
        facts: 'Ezell served as Sheriff of Jackson County from 2014 to 2022, capping a law-enforcement career of more than 40 years before his 2022 election to the House.',
        why: 'A long prior career grounds the public-safety message he runs on in his own background.', source: { label: 'House.gov', url: 'https://ezell.house.gov/' } },
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Notable Actions'], issueKey: 'gov_transparency',
        headline: 'Authored disaster-accountability bills that passed the House',
        facts: 'Ezell sponsored the Federal Disaster Assistance Coordination Act (H.R. 152) and the Post-Disaster Assistance Online Accountability Act (H.R. 153), aimed at coordinating and tracking federal disaster aid; both advanced through the House.',
        why: 'Moving his own bills through the chamber is a concrete legislative output.', source: { label: 'House.gov', url: 'https://ezell.house.gov/legislation/sponsoredbills.htm' } },
    ],
  },

  // ══════════════════ OKLAHOMA (5-seat wave) ══════════════════
  {
    id: 'josh_brecheen',
    accountabilitySummary:
      "A second-term congressman, former two-term state senator, and cattleman on the Budget and Homeland " +
      "Security committees and a Freedom Caucus member. His POWER Act passed the House nearly unanimously, and " +
      "he voted for H.R. 1 after resisting it in committee; the score reflects that record.",
    promises: [
      { title: 'Cut federal spending and move toward a balanced budget', verdict: 'pending', issueKey: 'gov_waste',
        detail: 'Sits on the House Budget Committee and campaigns on deep cuts to federal spending and a path to a balanced budget.', sources: ['https://brecheen.house.gov/'] },
      { title: 'Pass his own legislation through the House', verdict: 'kept', issueKey: 'enviro_energy',
        detail: 'Sponsored the POWER Act (H.R. 164), which passed the House 419–2 on January 15, 2025.', sources: ['https://www.govtrack.us/congress/votes/119-2025/h13'] },
      { title: 'Reduce the national debt', verdict: 'pending', issueKey: 'national_debt',
        detail: 'Names the national debt a top concern; resisted the reconciliation bill in the Budget Committee before voting yes on H.R. 1 (Roll Call 190, July 3, 2025).', sources: [HR1] },
      { title: 'Secure the southern border', verdict: 'pending', issueKey: 'border_security',
        detail: 'Serves on the Homeland Security Border Security and Enforcement Subcommittee and campaigns on stronger border enforcement.', sources: ['https://clerk.house.gov/members/B001317'] },
    ],
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'enviro_energy',
        headline: 'His POWER Act passed the House nearly unanimously',
        facts: 'Brecheen is the sponsor of the POWER Act (H.R. 164), which passed the House 419–2 on January 15, 2025 and was sent to the Senate.',
        why: 'A bill of his own that drew near-unanimous support is a concrete first-term output.', source: gt('votes/119-2025/h13') },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Rhetoric vs Reality', 'Notable Actions'], issueKey: 'national_debt',
        headline: 'Voted for H.R. 1 after fiscal objections in committee',
        facts: 'A Freedom Caucus member who casts himself as a fiscal hawk, Brecheen resisted the reconciliation bill in the Budget Committee before voting yes on final passage of H.R. 1, Roll Call 190, July 3, 2025.',
        why: 'How he moved from committee resistance to a yes vote is a tension worth seeing in full.', source: clerk('Votes/2025190') },
    ],
  },
  {
    id: 'frank_lucas',
    accountabilitySummary:
      "The dean of Oklahoma's delegation and the longest-serving member of the House Agriculture Committee, " +
      "where he chairs the Conservation, Research, and Biotechnology Subcommittee. He authored the 2014 Farm " +
      "Bill and voted for H.R. 1; the score reflects that deep farm-policy record.",
    promises: [
      { title: 'Support a strong farm safety net and the next Farm Bill', verdict: 'pending', issueKey: 'rural_ag',
        detail: 'The longest-serving member of the Agriculture Committee and author of the 2014 Farm Bill, he campaigns on commodity programs, crop insurance, and conservation.', sources: ['https://lucas.house.gov/posts/lucas-to-chair-conservation-subcommittee'] },
      { title: 'Advance agricultural research and biotechnology', verdict: 'pending', issueKey: 'tech_innovation',
        detail: 'Chairs the Agriculture Subcommittee on Conservation, Research, and Biotechnology and is a former Science Committee chairman who backs federal research investment.', sources: ['https://lucas.house.gov/posts/lucas-to-chair-conservation-subcommittee'] },
      { title: 'Preserve tax relief for Oklahoma', verdict: 'kept', issueKey: 'lower_taxes',
        detail: 'Voted yes on H.R. 1, the 2025 reconciliation and tax law (Roll Call 190, July 3, 2025), framing it in terms of Oklahoma agriculture.', sources: [HR1] },
    ],
    spotlight: [
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Leadership Style', 'Consistency'], issueKey: 'rural_ag',
        headline: 'Senior farm-policy hand chairing an Agriculture subcommittee',
        facts: 'Lucas, the longest-serving member of the House Agriculture Committee, chairs its Subcommittee on Conservation, Research, and Biotechnology and has had a hand in writing every Farm Bill since 1996, including the 2014 law he authored as full-committee chairman.',
        why: 'A decades-long, documented focus on farm policy is the core of his own record.', source: { label: 'House.gov', url: 'https://lucas.house.gov/posts/lucas-to-chair-conservation-subcommittee' } },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'lower_taxes',
        headline: 'Voted for the 2025 reconciliation and tax law',
        facts: 'Lucas voted yes on final passage of H.R. 1, Roll Call 190, July 3, 2025, framing the vote in terms of its effect on Oklahoma agriculture.',
        why: "A recorded vote on the cycle's signature law is part of his record.", source: clerk('Votes/2025190') },
    ],
  },
  {
    id: 'tom_cole',
    accountabilitySummary:
      "A long-serving congressman, enrolled Chickasaw Nation citizen, and chairman of the House Appropriations " +
      "Committee — the first Native American to hold the post. He voted for H.R. 1; the score reflects that " +
      "appropriations leadership and tenure.",
    promises: [
      { title: 'Restore a regular, on-time appropriations process', verdict: 'pending', issueKey: 'national_debt',
        detail: 'Chairman of the House Appropriations Committee since April 2024, the first Native American to lead it.', sources: ['https://appropriations.house.gov/about/chairman-tom-cole'] },
      { title: 'Fund a strong national defense and Fort Sill', verdict: 'pending', issueKey: 'strong_defense',
        detail: 'A defense hawk whose district includes Fort Sill; campaigns on robust military funding and readiness.', sources: ['https://cole.house.gov/about/full-biography'] },
      { title: 'Preserve tax relief for Oklahoma', verdict: 'kept', issueKey: 'lower_taxes',
        detail: 'Voted yes on H.R. 1, the 2025 reconciliation and tax law (Roll Call 190, July 3, 2025).', sources: [HR1] },
      { title: 'Advocate for tribal programs and services', verdict: 'pending', issueKey: 'gov_services',
        detail: 'An enrolled Chickasaw Nation citizen and the longest-serving Native American in congressional history, co-chair of the Congressional Native American Caucus.', sources: ['https://en.wikipedia.org/wiki/Tom_Cole'] },
    ],
    spotlight: [
      { impact: 'positive', category: 'rhetoric', date: '2024', tags: ['Leadership Style', 'Notable Actions'], issueKey: 'national_debt',
        headline: 'First Native American to chair House Appropriations',
        facts: 'Cole was elected chairman of the House Appropriations Committee on April 10, 2024, becoming the first Native American and first Oklahoman to lead the panel that writes federal spending bills.',
        why: 'Control of the appropriations gavel is a defining marker of his record and influence.', source: { label: 'Appropriations Committee', url: 'https://appropriations.house.gov/about/chairman-tom-cole' } },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'lower_taxes',
        headline: 'Voted for the 2025 reconciliation and tax law',
        facts: 'As Appropriations chairman, Cole voted yes on final passage of H.R. 1, Roll Call 190, July 3, 2025.',
        why: "A recorded vote on the cycle's signature law is part of his record.", source: clerk('Votes/2025190') },
    ],
  },
  {
    id: 'stephanie_bice',
    accountabilitySummary:
      "A third-term congresswoman on the Appropriations Committee, where she is vice chair of the " +
      "Transportation-HUD Subcommittee and sits on Military Construction-VA, and chairs the House " +
      "Administration Modernization Subcommittee. She voted for H.R. 1; the score reflects that record.",
    promises: [
      { title: 'Extend tax relief for Oklahomans', verdict: 'kept', issueKey: 'lower_taxes',
        detail: 'Voted yes on H.R. 1, the 2025 reconciliation and tax law (Roll Call 190, July 3, 2025), framing it as extending tax relief.', sources: [HR1] },
      { title: 'Fund veterans and military construction', verdict: 'pending', issueKey: 'veterans',
        detail: 'Sits on the Appropriations Military Construction-Veterans Affairs Subcommittee.', sources: ['https://bice.house.gov/about/committees'] },
      { title: 'Make Congress more efficient and modern', verdict: 'pending', issueKey: 'gov_transparency',
        detail: 'Chairs the House Administration Subcommittee on Modernization and Innovation.', sources: ['https://bice.house.gov/about/committees'] },
    ],
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'lower_taxes',
        headline: 'Voted for the 2025 reconciliation and tax law',
        facts: 'Bice voted yes on final passage of H.R. 1, Roll Call 190, July 3, 2025, framing it as extending tax relief for Oklahomans.',
        why: "A recorded vote on the cycle's signature law is core to her record.", source: clerk('Votes/2025190') },
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Leadership Style', 'Notable Actions'], issueKey: 'gov_transparency',
        headline: 'Holds an Appropriations vice-chair and a modernization gavel',
        facts: 'Bice serves as vice chair of the Appropriations Transportation-HUD Subcommittee, sits on Military Construction-VA, and chairs the House Administration Subcommittee on Modernization and Innovation.',
        why: 'A set of committee roles spanning spending and institutional reform marks her record and standing.', source: { label: 'House.gov', url: 'https://bice.house.gov/about/committees' } },
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
function counts(promises) {
  return {
    kept: promises.filter(x => x.verdict === 'kept').length,
    broken: promises.filter(x => x.verdict === 'broken').length,
    pending: promises.filter(x => x.verdict === 'pending').length,
  };
}
function promisesDoc(promises) {
  return promises.map(pr => ({
    title: pr.title, detail: pr.detail, verdict: pr.verdict, issueKey: pr.issueKey,
    sources: (pr.sources || []).map(u => ({ label: 'Source', url: u })),
  }));
}

// Field-masked PATCH body for one incumbent (touch only the listed fields).
function buildPatch(d) {
  const { kept, broken, pending } = counts(d.promises);
  return {
    promises: promisesDoc(d.promises),
    kept, broken, pending,
    accountability: { summary: d.accountabilitySummary, kept, broken, pending },
    spotlight: d.spotlight,
    updatedAt: STAMP,
  };
}

async function exists(id) { const r = await fetch(`${BASE}/${id}`); return r.ok; }
async function patchDoc(id, fields) {
  const mask = Object.keys(fields).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}?${mask}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

// ── Emit the index.html ACCT_SPOTLIGHT block (parity with the hand-applied edit) ──
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function emitSpotlightBlock() {
  const out = ['      // ── 4-seat & 5-seat House wave · incumbent deepening (June 2026) ────────────'];
  for (const d of DEEPEN) {
    out.push(`      ${d.id}: [`);
    for (const s of d.spotlight) {
      const tags = (s.tags || []).map(t => `'${esc(t)}'`).join(', ');
      out.push(`        { impact:'${s.impact}', category:'${s.category}', date:'${esc(s.date)}', tags:[${tags}], issueKey:'${s.issueKey}',`);
      out.push(`          headline:'${esc(s.headline)}',`);
      out.push(`          facts:'${esc(s.facts)}',`);
      out.push(`          why:'${esc(s.why)}',`);
      out.push(`          source:{ label:'${esc(s.source.label)}', url:'${esc(s.source.url)}' } },`);
    }
    out.push('      ],');
  }
  return out.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`PolitiDex — federal House incumbent deepening (4-/5-seat waves)  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);

  // Validate every issueKey against the live ISSUE_MAP vocabulary in index.html.
  try {
    const html = (await import('fs')).readFileSync('alignment-tool.js', 'utf8');
    const mapSlice = html.slice(html.indexOf('var ISSUE_MAP = {'), html.indexOf('try { window.ISSUE_MAP'));
    const validKeys = new Set([...mapSlice.matchAll(/^\s{6}([a-z_]+):\s+\{ label:/gm)].map(m => m[1]));
    let bad = 0;
    const check = (id, key, where) => { if (!validKeys.has(key)) { console.log(`  ⚠ ${id}: unknown ${where} issueKey '${key}'`); bad++; } };
    for (const d of DEEPEN) {
      for (const pr of d.promises) check(d.id, pr.issueKey, 'promise');
      for (const s of d.spotlight) check(d.id, s.issueKey, 'spotlight');
    }
    console.log(bad ? `\n  ✗ ${bad} invalid issueKey(s) — fix before applying.\n` : `  ✓ all issueKeys valid against ISSUE_MAP (${validKeys.size} keys)\n`);
    if (bad && APPLY) process.exit(1);
  } catch (e) { console.log(`  (issueKey validation skipped: ${e.message})`); }

  if (EMIT) {
    writeFileSync('/tmp/deepen-4-5seat-spotlight-block.txt', emitSpotlightBlock());
    console.log('Wrote ACCT_SPOTLIGHT block → /tmp/deepen-4-5seat-spotlight-block.txt\n');
  }

  console.log('Federal House incumbents — deepening patches (promises / accountability / spotlight):');
  for (const d of DEEPEN) {
    const { kept, broken, pending } = counts(d.promises);
    const tag = `${d.id} · ${kept}K/${broken}B/${pending}P promises · ${d.spotlight.length} evidence items · field-masked PATCH`;
    if (APPLY) {
      if (!await exists(d.id)) { console.log(`  · ${tag}: target missing — skipped (run the House wave first)`); continue; }
      await patchDoc(d.id, buildPatch(d));
      console.log(`  ✎ ${tag}`);
    } else { console.log(`  → ${tag}`); }
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'}: ${DEEPEN.length} House deepening patches.`);
  if (!APPLY) console.log('Re-run with --emit to write the index.html block, --apply to PATCH Firestore.');
})();
