#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National (federal) deep dive: COMMITTEE CHAIRS & CABINET
// (July 2026) — top-down wave picking up after Batch 7.
// ---------------------------------------------------------------------------
// Batch 7 built the President/VP and the four congressional leaders, and flagged
// "Speaker Mike Johnson, and other high-profile members (committee chairs,
// prominent backbenchers)" for a later wave. This is that wave. It CREATES the
// gavel-holders and Cabinet officials who drive the very issues our recent
// Issue Spotlights cover (Israel aid, border, tariffs, government spending,
// energy, AI), each mapped to the same ISSUE_MAP issueKeys those spotlights and
// the Stance Library already use, so a new card lights up "How Politicians Stand,"
// Connected Evidence, and Alignment with no extra wiring:
//
//   • JIM RISCH (risch) — Chair, Senate Foreign Relations (R-ID): Israel aid &
//     the alliance, conditions on Ukraine aid, China/Taiwan, Idaho nuclear energy.
//   • MIKE CRAPO (crapo) — Chair, Senate Finance (R-ID): the H.R.1 tax title,
//     reasserting Congress's trade/tariff authority, deficits, drug-pricing rules.
//   • TOM COTTON (cotton) — Chair, Senate Intelligence (R-AR): defense/Israel hawk,
//     China chip controls, border security, targeted (not sweeping) AI rules.
//   • SUSAN COLLINS (collins) — Chair, Senate Appropriations (R-ME): regular-order
//     appropriations and resistance to some rescissions, Israel/Ukraine aid, and a
//     record of voting to codify Roe.
//   • JAMES COMER (comer) — Chair, House Oversight (R-KY): DOGE-era spending and
//     waste oversight, federal-workforce and transparency fights.
//   • ROBERT F. KENNEDY JR. (kennedy_rfk) — HHS Secretary: "Make America Healthy
//     Again," chronic disease and food additives, drug prices, and a contested
//     record on vaccines/medical freedom.
//   • DAVE McCORMICK (mccormick) — U.S. Senator (R-PA): tariffs/China, Pennsylvania
//     natural gas, and the data-center/AI energy build-out he has championed.
//   • AMY KLOBUCHAR (klobuchar) — U.S. Senator (D-MN): tech antitrust and AI
//     guardrails, Medicare drug-price negotiation, farm-state agriculture.
//   • ELISSA SLOTKIN (slotkin) — U.S. Senator (D-MI): a national-security Democrat
//     on border enforcement, Israel's security with conditions, and auto-industry
//     trade.
//
// It also ENRICHES three thin leadership records built in Batch 7 so they resolve
// on the recent spotlights: THUNE (spending, Israel), JEFFRIES (border, Israel),
// SCHUMER (Israel, spending).
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md):
//   • Every card is written about the INDIVIDUAL's own act, vote, or words — never
//     "his party" or "party-line." Vote tallies are plain facts.
//   • Positions are the well-documented public record; quotation marks are used
//     only for phrases genuinely on the record, otherwise positions are
//     paraphrased neutrally. Contested effects are attributed, not asserted.
//   • Sources are official member/committee pages, congress.gov, and reputable
//     outlets — stable, verifiable links.
//
// CLIENT-side and idempotent. On --apply it:
//   1. appends new stance arrays → politician-stances.js (window.ISSUE_STANCE_DATA)
//   2. appends enrichment cards into existing arrays (thune/jeffries/schumer)
//   3. adds CMP_DATA roster rows → index.html (so each is a browsable profile)
// Then regenerate the shipped chunks:  node scripts/split-stances.mjs
//
//   node scripts/deep-dive-national-chairs-cabinet-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-chairs-cabinet-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STANCES = path.join(ROOT, 'politician-stances.js');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');

// ── Sources (verified July 2026) ─────────────────────────────────────────────
const S = {
  risch_sfrc:  { label: 'Senate Foreign Relations Committee', url: 'https://www.foreign.senate.gov/' },
  risch_site:  { label: 'risch.senate.gov', url: 'https://www.risch.senate.gov/public/index.cfm/pressreleases' },
  crs_israel:  { label: 'CRS — U.S. Foreign Aid to Israel (RL33222)', url: 'https://crsreports.congress.gov/product/pdf/RL/RL33222' },
  crapo_fin:   { label: 'Senate Finance Committee', url: 'https://www.finance.senate.gov/' },
  crapo_site:  { label: 'crapo.senate.gov', url: 'https://www.crapo.senate.gov/media/newsreleases' },
  hr1_congress:{ label: 'Congress.gov — H.R.1 (119th Congress)', url: 'https://www.congress.gov/bill/119th-congress/house-bill/1' },
  cotton_intel:{ label: 'Senate Select Committee on Intelligence', url: 'https://www.intelligence.senate.gov/' },
  cotton_site: { label: 'cotton.senate.gov', url: 'https://www.cotton.senate.gov/news/press-releases' },
  collins_appr:{ label: 'Senate Appropriations Committee', url: 'https://www.appropriations.senate.gov/' },
  collins_site:{ label: 'collins.senate.gov', url: 'https://www.collins.senate.gov/newsroom/press-releases' },
  comer_ovs:   { label: 'House Oversight Committee', url: 'https://oversight.house.gov/' },
  comer_site:  { label: 'comer.house.gov', url: 'https://comer.house.gov/' },
  hhs:         { label: 'U.S. Dept. of Health & Human Services', url: 'https://www.hhs.gov/about/leadership/robert-f-kennedy-jr.html' },
  maha:        { label: 'HHS — Make America Healthy Again', url: 'https://www.hhs.gov/' },
  mccormick_site:{ label: 'mccormick.senate.gov', url: 'https://www.mccormick.senate.gov/' },
  klobuchar_site:{ label: 'klobuchar.senate.gov', url: 'https://www.klobuchar.senate.gov/public/index.cfm/news-releases' },
  klobuchar_jud: { label: 'Senate Judiciary Committee', url: 'https://www.judiciary.senate.gov/' },
  slotkin_site:{ label: 'slotkin.senate.gov', url: 'https://www.slotkin.senate.gov/' },
  cbo:         { label: 'Congressional Budget Office', url: 'https://www.cbo.gov/' },
};

// ── New figures ──────────────────────────────────────────────────────────────
// roster: fields for the CMP_DATA line. cards: ISSUE_STANCE_DATA entries.
const NEW = {
  risch: {
    roster: { name: 'Jim Risch', office: 'Senate Foreign Relations Committee Chair', state: 'Idaho', party: 'R', score: 60, icon: '🌐', issues: ['Foreign Policy', 'Israel & Allies', 'China & Taiwan', 'Energy'] },
    label: 'Jim Risch — 🌐 Senate Foreign Relations Chair (R-ID)',
    cards: [
      { topic: 'Israel & U.S. Aid', icon: '🇮🇱', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'As Foreign Relations chair, Risch is a leading defender of the U.S.-Israel security partnership and its foreign military financing, framing a strong Israel as central to deterring Iran and stabilizing the region.',
        evidence: 'Chairs the Senate committee with jurisdiction over foreign aid and arms sales; has repeatedly backed the 2016 MOU framework and post-Oct. 7 assistance.', source: S.risch_sfrc },
      { topic: 'Conditions on Ukraine Aid', icon: '🇺🇦', pos: 'mixed', issueKey: 'foreign_balance', issueStance: 'mixed',
        text: 'Supports helping Ukraine resist Russia but has pressed for clear strategy, allied burden-sharing, and oversight of the dollars — favoring aid tied to accountability over open-ended commitments.', source: S.risch_site },
      { topic: 'China & Taiwan', icon: '🐉', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'Treats the Chinese Communist Party as the top long-term threat, backing arms sales to Taiwan, export controls on advanced technology, and a stronger Indo-Pacific deterrent posture.', source: S.risch_site },
      { topic: 'Domestic Energy & Nuclear', icon: '⚛️', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'A consistent advocate for expanded domestic energy production, Risch champions Idaho National Laboratory and advanced-nuclear development as pillars of energy security and the grid.', source: S.risch_site },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Backs stricter border enforcement, more detention and removal capacity, and tighter asylum standards, tying border control to national security.', source: S.risch_site },
    ],
  },
  crapo: {
    roster: { name: 'Mike Crapo', office: 'Senate Finance Committee Chair', state: 'Idaho', party: 'R', score: 60, icon: '💵', issues: ['Taxes', 'Trade & Tariffs', 'National Debt', 'Drug Prices'] },
    label: 'Mike Crapo — 💵 Senate Finance Chair (R-ID)',
    cards: [
      { topic: 'Extending the 2017 Tax Cuts', icon: '🧾', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'As Finance chair, Crapo wrote the Senate tax title of the One Big Beautiful Bill Act (H.R.1, 2025), making the 2017 individual rates permanent and adding expensing and other business breaks he argues spur growth.',
        evidence: 'Chairs the committee with jurisdiction over taxes; led the Senate tax portion of H.R.1.', source: S.hr1_congress },
      { topic: 'Congressional Trade Authority', icon: '⚖️', pos: 'mixed', issueKey: 'tariffs_authority', issueStance: 'mixed',
        text: 'Supports using tariffs as leverage against unfair trade but, as the Senate\'s lead on trade, has emphasized reopening market-opening trade agreements and Congress\'s constitutional role in setting tariff policy rather than relying solely on emergency executive power.', source: S.crapo_fin },
      { topic: 'Deficits & Spending', icon: '📉', pos: 'mixed', issueKey: 'national_debt', issueStance: 'mixed',
        text: 'A self-described fiscal conservative who backs tax relief while calling the roughly $37 trillion national debt unsustainable; critics and the CBO note the 2025 tax law is projected to widen deficits, a tension in his record.', source: S.cbo },
      { topic: 'Prescription Drug Prices', icon: '💊', pos: 'mixed', issueKey: 'health_drug_prices', issueStance: 'mixed',
        text: 'Through Finance\'s Medicare jurisdiction, has pushed pharmacy-benefit-manager transparency and market-based drug-pricing changes while opposing the government price-setting model, arguing it could chill innovation.', source: S.crapo_fin },
      { topic: 'Trade & Agriculture', icon: '🌾', pos: 'mixed', issueKey: 'econ_trade', issueStance: 'mixed',
        text: 'From a farm-and-export state, presses to open foreign markets for Idaho agriculture and manufacturing and warns about the cost of retaliation to producers even while supporting tougher trade enforcement.', source: S.crapo_site },
    ],
  },
  cotton: {
    roster: { name: 'Tom Cotton', office: 'Senate Intelligence Committee Chair', state: 'Arkansas', party: 'R', score: 58, icon: '🛡', issues: ['National Security', 'China', 'Israel & Defense', 'Border Security'] },
    label: 'Tom Cotton — 🛡 Senate Intelligence Chair (R-AR)',
    cards: [
      { topic: 'Israel & Defense', icon: '🇮🇱', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'An Army combat veteran and one of the Senate\'s most vocal defense hawks, Cotton backs robust military aid to Israel and higher defense spending, framing both as deterrence against Iran and China.',
        evidence: 'Serves on Armed Services and chairs the Intelligence Committee.', source: S.cotton_site },
      { topic: 'China & Technology', icon: '🐉', pos: 'support', issueKey: 'tariffs_china', issueStance: 'support',
        text: 'A leading China hawk, Cotton backs tariffs and tight export controls on advanced semiconductors and AI hardware to slow Beijing\'s military-tech gains, and has pushed to restrict Chinese-owned apps.', source: S.cotton_intel },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Longtime advocate of stricter enforcement, more detention capacity, and lower legal-immigration levels tied to a merit system; supported the 2025 enforcement build-out.', source: S.cotton_site },
      { topic: 'Targeted AI & Tech Rules', icon: '🤖', pos: 'mixed', issueKey: 'tech_balance', issueStance: 'mixed',
        text: 'Frames AI mainly through national security — favoring hard limits on adversary access to chips and models while cautioning against broad domestic mandates he says could slow U.S. innovation against China.', source: S.cotton_intel },
      { topic: 'Government Spending', icon: '🧾', pos: 'mixed', issueKey: 'national_debt', issueStance: 'mixed',
        text: 'Backs spending restraint on domestic programs and supported the 2025 rescissions push, while defending higher defense budgets as a priority he would protect from cuts.', source: S.cotton_site },
    ],
  },
  collins: {
    roster: { name: 'Susan Collins', office: 'Senate Appropriations Committee Chair', state: 'Maine', party: 'R', score: 62, icon: '🏛', issues: ['Appropriations', 'Foreign Aid', 'Reproductive Rights', 'Bipartisanship'] },
    label: 'Susan Collins — 🏛 Senate Appropriations Chair (R-ME)',
    cards: [
      { topic: 'Appropriations & Spending', icon: '🧾', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'As Appropriations chair, Collins champions passing full-year spending bills through regular order and has publicly resisted parts of the administration\'s rescissions and across-the-board cuts, warning they cede Congress\'s power of the purse.',
        evidence: 'Chairs the Senate committee that writes the 12 annual appropriations bills.', source: S.collins_appr },
      { topic: 'Israel & Ukraine Aid', icon: '🌐', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'Voted for the 2024 national-security supplemental funding Israel, Ukraine, and the Indo-Pacific, and generally supports sustained aid to U.S. allies as a national-security investment.', source: S.collins_site },
      { topic: 'Reproductive Rights', icon: '⚕️', pos: 'support', issueKey: 'repro_balance', issueStance: 'support',
        text: 'One of the few Republicans to vote for legislation codifying Roe-style abortion protections; describes herself as supporting legal abortion with some limits, a break from most of her conference.', source: S.collins_site },
      { topic: 'Prescription Drug Costs', icon: '💊', pos: 'support', issueKey: 'health_drug_prices', issueStance: 'support',
        text: 'Has co-sponsored bipartisan bills to curb insulin costs and rein in pharmacy-benefit managers, framing drug affordability as a priority for older and rural constituents.', source: S.collins_site },
      { topic: 'Bipartisan Dealmaking', icon: '🤝', pos: 'mixed', issueKey: 'gov_transparency', issueStance: 'mixed',
        text: 'A frequent swing vote who brokers cross-party deals on spending and nominations; supporters call it independence, critics call it unpredictability — either way her vote is often decisive.', source: S.collins_site },
    ],
  },
  comer: {
    roster: { name: 'James Comer', office: 'House Oversight Committee Chair', state: 'Kentucky', party: 'R', score: 57, icon: '🔍', issues: ['Government Waste', 'Oversight', 'Federal Workforce', 'Accountability'] },
    label: 'James Comer — 🔍 House Oversight Chair (R-KY)',
    cards: [
      { topic: 'Cutting Waste (DOGE Oversight)', icon: '🧹', pos: 'support', issueKey: 'gov_waste', issueStance: 'support',
        text: 'As Oversight chair, Comer made rooting out improper payments and duplicative programs a centerpiece, partnering with the Department of Government Efficiency effort to target what he calls wasteful federal spending.',
        evidence: 'Chairs the House committee with government-wide investigative jurisdiction.', source: S.comer_ovs },
      { topic: 'Government Spending & Debt', icon: '📉', pos: 'support', issueKey: 'cut_spending', issueStance: 'support',
        text: 'Backs deep discretionary cuts and rescissions to shrink the deficit, arguing agencies expanded beyond their mandates and that spending discipline must precede new programs.', source: S.comer_site },
      { topic: 'Federal Workforce & Return-to-Office', icon: '🏢', pos: 'support', issueKey: 'gov_regulation', issueStance: 'support',
        text: 'Pushed to shrink the federal workforce, end remote-work telework policies, and relocate agencies, framing it as accountability and cost savings; critics warn about service disruptions.', source: S.comer_site },
      { topic: 'Transparency & Accountability', icon: '📂', pos: 'mixed', issueKey: 'gov_transparency', issueStance: 'mixed',
        text: 'Has run high-profile investigations and subpoena fights across administrations; supporters credit aggressive oversight, critics accuse him of selective scrutiny — a contested but central part of his record.', source: S.comer_ovs },
    ],
  },
  kennedy_rfk: {
    roster: { name: 'Robert F. Kennedy Jr.', office: 'U.S. Secretary of Health & Human Services', state: 'California', party: 'R', score: 54, icon: '⚕️', issues: ['Chronic Disease', 'Food & Nutrition', 'Drug Prices', 'Vaccine Policy'] },
    label: 'Robert F. Kennedy Jr. — ⚕️ HHS Secretary',
    cards: [
      { topic: 'Chronic Disease & Food', icon: '🥗', pos: 'support', issueKey: 'healthcare_costs', issueStance: 'support',
        text: 'Built HHS around a "Make America Healthy Again" agenda targeting chronic disease, ultra-processed foods, and additives — pressing food makers to drop certain synthetic dyes and reorienting nutrition guidance.',
        evidence: 'Confirmed HHS Secretary in February 2025; launched the MAHA initiative.', source: S.maha },
      { topic: 'Prescription Drug Prices', icon: '💊', pos: 'support', issueKey: 'health_drug_prices', issueStance: 'support',
        text: 'Has criticized high U.S. drug prices and pharmaceutical marketing, backing transparency and price efforts, while feuding publicly with parts of the industry.', source: S.hhs },
      { topic: 'Vaccine Policy', icon: '💉', pos: 'oppose', issueKey: 'medical_freedom', issueStance: 'oppose',
        text: 'A longtime critic of vaccine safety review who has reshaped federal vaccine advisory panels and emphasized "informed consent" — a record public-health groups warn undermines established vaccine science, and that he frames as restoring trust.', source: S.hhs },
      { topic: 'Food-Industry Regulation', icon: '🏭', pos: 'mixed', issueKey: 'health_balance', issueStance: 'mixed',
        text: 'Wants tighter scrutiny of food chemicals and pesticides and more say for consumers, blending deregulatory rhetoric with new restrictions on additives — a mix that crosses traditional lines.', source: S.maha },
    ],
  },
  mccormick: {
    roster: { name: 'Dave McCormick', office: 'U.S. Senator', state: 'Pennsylvania', party: 'R', score: 57, icon: '⚡', issues: ['Energy', 'China & Trade', 'AI & Data Centers', 'Manufacturing'] },
    label: 'Dave McCormick — ⚡ U.S. Senator (R-PA)',
    cards: [
      { topic: 'Pennsylvania Energy Production', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Champions expanded natural-gas and nuclear production in Pennsylvania as jobs and energy security, opposing drilling and pipeline limits he says raise costs and cede ground to rivals.',
        evidence: 'Convened a July 2025 Pennsylvania Energy & Innovation Summit at Carnegie Mellon pairing energy build-out with AI investment.', source: S.mccormick_site },
      { topic: 'AI & Data-Center Power', icon: '🤖', pos: 'support', issueKey: 'datacenter_power', issueStance: 'support',
        text: 'Frames the AI race as an energy race, promoting Pennsylvania as a hub where gas and nuclear power the data centers that train advanced AI, and backing lighter-touch federal rules to keep the U.S. ahead of China.', source: S.mccormick_site },
      { topic: 'China & Trade', icon: '🐉', pos: 'support', issueKey: 'tariffs_china', issueStance: 'support',
        text: 'A former Treasury official and business executive, McCormick backs tariffs and investment restrictions to counter China and rebuild U.S. supply chains in chips, minerals, and manufacturing.', source: S.mccormick_site },
      { topic: 'Tariffs & Manufacturing', icon: '🏭', pos: 'mixed', issueKey: 'econ_trade', issueStance: 'mixed',
        text: 'Supports using tariffs to protect and reshore industry, while acknowledging the need to limit the hit to Pennsylvania consumers and manufacturers who rely on imported inputs.', source: S.mccormick_site },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'Ran on tougher border enforcement and more resources for the Border Patrol, tying border control to fentanyl interdiction and public safety.', source: S.mccormick_site },
    ],
  },
  klobuchar: {
    roster: { name: 'Amy Klobuchar', office: 'U.S. Senator', state: 'Minnesota', party: 'D', score: 60, icon: '⚖️', issues: ['Tech & Antitrust', 'AI Guardrails', 'Drug Prices', 'Agriculture'] },
    label: 'Amy Klobuchar — ⚖️ U.S. Senator (D-MN)',
    cards: [
      { topic: 'Big Tech & Antitrust', icon: '🏛', pos: 'support', issueKey: 'gov_regulation', issueStance: 'support',
        text: 'A leading antitrust voice, Klobuchar has authored bills to curb dominant tech platforms\' self-preferencing and to update competition law, arguing a few firms wield outsized market power.',
        evidence: 'Lead sponsor of the American Innovation and Choice Online Act; serves on Senate Judiciary.', source: S.klobuchar_jud },
      { topic: 'AI Guardrails', icon: '🤖', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: 'Backs federal rules for AI focused on transparency, deepfakes and election integrity, and consumer protection, while resisting a blanket ban on state AI laws she says protect the public.', source: S.klobuchar_site },
      { topic: 'Prescription Drug Prices', icon: '💊', pos: 'support', issueKey: 'health_drug_prices', issueStance: 'support',
        text: 'A longtime advocate for letting Medicare negotiate drug prices and for allowing safe drug importation, framing affordability as a core cost-of-living issue.', source: S.klobuchar_site },
      { topic: 'Agriculture & Rural Economy', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'From a farm state, works on the Farm Bill, biofuels, and rural broadband, and warns that trade retaliation from tariffs hits Minnesota farmers\' export markets.', source: S.klobuchar_site },
    ],
  },
  slotkin: {
    roster: { name: 'Elissa Slotkin', office: 'U.S. Senator', state: 'Michigan', party: 'D', score: 59, icon: '🛡', issues: ['National Security', 'Border', 'Manufacturing & Trade', 'Israel'] },
    label: 'Elissa Slotkin — 🛡 U.S. Senator (D-MI)',
    cards: [
      { topic: 'Border Enforcement', icon: '🛂', pos: 'mixed', issueKey: 'border_security', issueStance: 'mixed',
        text: 'A former CIA analyst who backs stronger border enforcement and more agents and technology, while supporting a legal pathway and criticizing family separation — positioning herself between the two poles of the debate.',
        evidence: 'Delivered the Democratic response to President Trump\'s March 2025 joint address to Congress.', source: S.slotkin_site },
      { topic: 'Israel\'s Security, With Conditions', icon: '🇮🇱', pos: 'mixed', issueKey: 'foreign_balance', issueStance: 'mixed',
        text: 'Supports Israel\'s right to defend itself and its missile-defense funding while calling for humanitarian access and adherence to U.S. law on civilian harm — backing the alliance but not unconditional aid.', source: S.slotkin_site },
      { topic: 'Manufacturing & Auto Trade', icon: '🏭', pos: 'mixed', issueKey: 'econ_trade', issueStance: 'mixed',
        text: 'From an auto state, supports targeted trade tools to protect U.S. manufacturing and counter China, while warning that broad tariffs raise costs for automakers and consumers.', source: S.slotkin_site },
      { topic: 'National Security', icon: '🌐', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'Brings a Pentagon and intelligence background to defense and Ukraine debates, generally backing aid to allies paired with oversight and a clear strategy.', source: S.slotkin_site },
      { topic: 'Prescription Drug Costs', icon: '💊', pos: 'support', issueKey: 'health_drug_prices', issueStance: 'support',
        text: 'Campaigned on capping insulin and out-of-pocket drug costs and defending Medicare\'s new negotiation power as a cost-of-living priority for Michigan seniors.', source: S.slotkin_site },
    ],
  },
};

// ── Enrichment cards appended to EXISTING arrays ─────────────────────────────
const ENRICH = {
  thune: {
    comment: '    // ── National priority-issue deepening · chairs/cabinet wave (July 2026) ──────',
    cards: [
      { topic: 'Government Spending & Debt', icon: '📉', pos: 'mixed', issueKey: 'national_debt', issueStance: 'mixed',
        text: 'As Majority Leader, Thune pairs support for the 2025 tax law with calls to curb spending and pass the first rescissions package in about 30 years, while the CBO projects the combined agenda widens near-term deficits.', source: S.cbo },
      { topic: 'Israel & Foreign Aid', icon: '🇮🇱', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'A steady supporter of military aid to Israel and the alliance, Thune has moved security-assistance measures through the Senate and frames the partnership as deterrence against Iran.', source: S.crs_israel },
    ],
  },
  jeffries: {
    comment: '    // ── National priority-issue deepening · chairs/cabinet wave (July 2026) ──────',
    cards: [
      { topic: 'Border & Immigration', icon: '🛂', pos: 'mixed', issueKey: 'immigration_reform', issueStance: 'mixed',
        text: 'As Minority Leader, Jeffries backs comprehensive reform pairing border resources with a pathway to citizenship, and has opposed mass-deportation funding while supporting bipartisan border-security deals.', source: { label: 'dpcc.house.gov / Jeffries floor remarks', url: 'https://www.congress.gov/member/hakeem-jeffries/J000294' } },
      { topic: 'Israel & Foreign Aid', icon: '🇮🇱', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: 'Supports U.S. military aid to Israel and its security while backing humanitarian assistance to Gaza, a mainstream position he has defended amid divisions in his caucus.', source: { label: 'Congress.gov — Rep. Hakeem Jeffries', url: 'https://www.congress.gov/member/hakeem-jeffries/J000294' } },
    ],
  },
  schumer: {
    comment: '    // ── National priority-issue deepening · chairs/cabinet wave (July 2026) ──────',
    cards: [
      { topic: 'Israel & U.S. Aid', icon: '🇮🇱', pos: 'mixed', issueKey: 'strong_defense', issueStance: 'mixed',
        text: 'A longtime supporter of U.S. military aid to Israel, Schumer nonetheless delivered a March 2024 floor speech criticizing the Netanyahu government and calling for new Israeli elections — backing the alliance while publicly pressing its leadership.', source: { label: 'Congress.gov — Sen. Charles Schumer', url: 'https://www.congress.gov/member/charles-schumer/S000148' } },
      { topic: 'Government Spending', icon: '🧾', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'As Minority Leader, Schumer has fought the administration\'s rescissions and deep discretionary cuts, favoring bipartisan full-year appropriations, and drew intraparty criticism in 2025 over how he handled a government-funding standoff.', source: { label: 'Congress.gov — Sen. Charles Schumer', url: 'https://www.congress.gov/member/charles-schumer/S000148' } },
    ],
  },
};

// ── validate issueKeys against ISSUE_MAP ─────────────────────────────────────
const alignJs = fs.readFileSync(path.join(ROOT, 'alignment-tool.js'), 'utf8');
const mapSlice = alignJs.slice(alignJs.indexOf('var ISSUE_MAP = {'), alignJs.indexOf('try { window.ISSUE_MAP'));
const valid = new Set([...mapSlice.matchAll(/^\s+([a-z_0-9]+):\s*\{\s*label:/gm)].map((m) => m[1]));
let bad = 0;
const allCards = [...Object.values(NEW).flatMap((p) => p.cards), ...Object.values(ENRICH).flatMap((e) => e.cards)];
for (const c of allCards) if (!valid.has(c.issueKey)) { console.log(`  ⚠ invalid issueKey '${c.issueKey}' (topic: ${c.topic})`); bad++; }
console.log(bad ? `  ✗ ${bad} invalid issueKey(s) — fix before applying.\n` : `  ✓ all ${allCards.length} issueKeys valid against ISSUE_MAP (${valid.size} keys)\n`);
if (bad) process.exit(1);

// ── emit helpers ─────────────────────────────────────────────────────────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function cardStr(c) {
  const parts = [`topic:'${esc(c.topic)}'`, `icon:'${c.icon}'`, `pos:'${c.pos}'`, `issueKey:'${c.issueKey}'`, `issueStance:'${c.issueStance}'`, `text:'${esc(c.text)}'`];
  if (c.evidence) parts.push(`evidence:'${esc(c.evidence)}'`);
  parts.push(`source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'}`);
  return `      { ${parts.join(', ')} },`;
}

console.log(`PolitiDex — National chairs & cabinet wave  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);

const stancesRaw = fs.readFileSync(STANCES, 'utf8');
// idempotency
const newToAdd = Object.keys(NEW).filter((id) => !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
const newExists = Object.keys(NEW).filter((id) => !newToAdd.includes(id));
for (const id of Object.keys(NEW)) console.log(`  ${newExists.includes(id) ? '· exists ' : '→ CREATE '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);
for (const id of Object.keys(ENRICH)) {
  const has = new RegExp(`\\n    ${id}: \\[`).test(stancesRaw);
  const already = stancesRaw.includes(ENRICH[id].comment) && new RegExp(`${id}:[\\s\\S]{0,4000}chairs/cabinet wave`).test(stancesRaw);
  console.log(`  ${!has ? '✗ MISSING(!)' : already ? '· enriched' : '→ ENRICH '} ${id} · +${ENRICH[id].cards.length} card(s)`);
}

if (!APPLY) {
  console.log('\n--- new stance block preview (first figure) ---');
  const fid = Object.keys(NEW)[0];
  console.log(`    ${fid}: [ // ${NEW[fid].label}\n${NEW[fid].cards.map(cardStr).join('\n')}\n    ],`);
  console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs');
  process.exit(0);
}

// ── 1) append NEW arrays before the object's closing `\n    };\n\n})();` ───────
let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance-object anchor not found; aborting.'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National chairs & cabinet · top-down federal wave (July 2026) ─────────────\n' +
    newToAdd.map((id) => `    ${id}: [ // ${NEW[id].label}\n${NEW[id].cards.map(cardStr).join('\n')}\n    ],`).join('\n');
  stances = stances.replace(stanceAnchor, block + stanceAnchor);
  console.log(`  ✎ appended ${newToAdd.length} new stance array(s)`);
}

// ── 2) enrich existing arrays: insert cards before that id's closing `\n    ],`
for (const [id, e] of Object.entries(ENRICH)) {
  const startRe = new RegExp(`\\n    ${id}: \\[`);
  const m = startRe.exec(stances);
  if (!m) { console.log(`  ✗ enrich ${id}: array not found — skipped`); continue; }
  const from = m.index + m[0].length;
  const endRel = stances.slice(from).indexOf('\n    ],');
  if (endRel === -1) { console.log(`  ✗ enrich ${id}: terminator not found — skipped`); continue; }
  const insertAt = from + endRel;
  const chunk = stances.slice(from, insertAt);
  if (chunk.includes('chairs/cabinet wave')) { console.log(`  · enrich ${id}: already present — skipped`); continue; }
  const ins = '\n' + e.comment + '\n' + e.cards.map(cardStr).join('\n');
  stances = stances.slice(0, insertAt) + ins + stances.slice(insertAt);
  console.log(`  ✎ enriched ${id} with ${e.cards.length} card(s)`);
}
fs.writeFileSync(STANCES, stances);

// ── 3) CMP_DATA roster rows → index.html (after the khanna row anchor) ────────
let html = fs.readFileSync(INDEX, 'utf8');
const rosterAnchor = "    khanna:                   { name:'Ro Khanna',        office:'U.S. Representative',          state:'California',   party:'D', score:60, kept:0, broken:0, pending:0, icon:'🏭', issues:['Manufacturing','Healthcare','Foreign Policy','Money in Politics'] },";
const needRoster = newToAdd.filter((id) => !new RegExp(`\\n\\s+${id}:\\s*\\{ name:`).test(html));
if (needRoster.length && html.includes(rosterAnchor)) {
  const rows = '\n    // National 11 — committee chairs & Cabinet, top-down federal wave (July 2026).\n' +
    '    // Keys match ISSUE_STANCE_DATA ids so curated cards light up in search, compare,\n' +
    '    // profile, Stance Library, and "How Politicians Stand".\n' +
    needRoster.map((id) => {
      const r = NEW[id].roster;
      return `    ${id.padEnd(24)}: { name:'${esc(r.name)}', office:'${esc(r.office)}', state:'${r.state}', party:'${r.party}', score:${r.score}, kept:0, broken:0, pending:0, icon:'${r.icon}', issues:[${r.issues.map((i) => `'${esc(i)}'`).join(',')}] },`;
    }).join('\n');
  html = html.replace(rosterAnchor, rosterAnchor + rows);
  fs.writeFileSync(INDEX, html);
  console.log(`  ✎ added CMP_DATA roster rows: ${needRoster.join(', ')}`);
} else console.log('  · CMP_DATA roster rows already present (or anchor missing) — skipped');

console.log(`\nApplied. NEXT: wire standsOnIssue (manual edits), then: node scripts/split-stances.mjs`);
