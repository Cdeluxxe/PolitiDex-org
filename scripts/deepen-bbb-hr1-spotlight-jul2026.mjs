#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — deepen the One Big Beautiful Bill Act (H.R. 1) Spotlight with the
// SUBSTANCE of the law (July 2026): what it actually does, in plain text.
// ---------------------------------------------------------------------------
// The existing guide covers the POLITICS well (who signed, who broke the tie,
// who voted how, say-vs-do). It was missing the parts people ask about most:
//   • which tax breaks are PERMANENT vs. TEMPORARY (and who each helps most);
//   • that "no tax on tips / overtime" are capped deductions expiring after 2028
//     — payroll taxes still apply — not permanent, blanket exemptions;
//   • the deficit reality (~$3.4T; ~$4.1T with interest) vs. the stated goal;
//   • the CBO distributional finding (bottom loses, middle/top gain).
//
// This adds the substance sections the Spotlight renderer already supports but
// this guide never populated: factBox, whatChanged, caseFor/caseAgainst, notDo,
// dataContext, whatToWatch, sources, relatedIssues. Every figure is sourced
// (CBO, JCT, IRS, Bipartisan Policy Center, Tax Foundation, Brookings, CBPP).
//
// CLIENT-side and idempotent.
//   node scripts/deepen-bbb-hr1-spotlight-jul2026.mjs            # dry run
//   node scripts/deepen-bbb-hr1-spotlight-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const SLUG = 'one-big-beautiful-bill-hr1';

// The new fields, authored as valid JS (8-space indent to match the guide's
// object). Curly apostrophes match the file's existing style, so no escaping.
const BLOCK = `        factBox: {
          note: 'Not all of the law lasts — and that is the heart of it. The 2017 income-tax rates, whose largest dollar cuts go to higher earners, were made PERMANENT. The populist worker breaks people hear about most (no tax on tips, no tax on overtime, the senior and car-loan deductions) are TEMPORARY and expire after 2028 unless a future Congress renews them.',
          cols: ['Provision', 'Who gains most', 'In effect', 'How long'],
          rows: [
            { label: '2017 income-tax rates kept', before: 'Higher earners (largest $ cut)', after: '2025 →', share: 'Permanent' },
            { label: 'Standard deduction increase', before: 'Most filers', after: '2025 →', share: 'Permanent' },
            { label: 'Child Tax Credit → $2,200', before: 'Families with children', after: '2025 →', share: 'Permanent' },
            { label: 'No tax on tips (≤ $25k deduction)', before: 'Tipped workers under ~$150k', after: '2025–2028', share: 'Temporary' },
            { label: 'No tax on overtime (≤ $12.5k/$25k)', before: 'Hourly overtime workers under ~$150k', after: '2025–2028', share: 'Temporary' },
            { label: 'Senior deduction (+ $6,000)', before: 'Age 65+ under ~$75k', after: '2025–2028', share: 'Temporary' },
            { label: 'Car-loan interest (≤ $10k)', before: 'Buyers of US-assembled new cars', after: '2025–2028', share: 'Temporary' },
            { label: 'SALT cap $10k → $40k', before: 'Higher earners in high-tax states', after: '2025–2029', share: 'Reverts to $10k in 2030' }
          ],
          foot: 'Caps and income phase-outs apply to each item. “No tax” is shorthand for a capped income-tax deduction — Social Security and Medicare payroll taxes are still withheld, and state income tax can still apply. Sources: IRS; Joint Committee on Taxation; Bipartisan Policy Center; Tax Foundation.'
        },
        whatChanged: [
          { title: 'Income-tax rates made permanent', tag: 'Taxes', text: 'The 2017 rates and brackets (top 37%, bottom 10%) were set to expire at the end of 2025. The law makes them permanent, so there is no automatic 2026 rate increase — the benefit rises with income, so the largest dollar cuts go to higher earners.' },
          { title: 'New worker deductions — but only through 2028', tag: 'Temporary', marker: 'Expires 2028', text: 'No tax on tips, no tax on overtime, a $6,000 senior deduction, and a car-loan-interest deduction all take effect for 2025 and expire December 31, 2028 unless renewed.' },
          { title: 'Medicaid & SNAP reductions', tag: 'Safety net', text: 'Adds Medicaid work requirements and more frequent eligibility checks and shifts some SNAP costs to states. The CBO ties the coverage changes to roughly 10–12 million more people uninsured by 2034.' },
          { title: 'Clean-energy credits rolled back', tag: 'Energy', text: 'Phases out or repeals many 2022 Inflation Reduction Act clean-energy and electric-vehicle tax credits.' },
          { title: 'Border & defense funding', tag: 'Security', text: 'Adds major new funding for border and immigration enforcement and for the military.' },
          { title: 'Debt limit raised $5 trillion', tag: 'Debt', text: 'Raises the federal debt ceiling by $5 trillion to accommodate the additional borrowing.' }
        ],
        caseFor: {
          sub: 'How supporters (the White House and Ways & Means Republicans) describe it.',
          points: [
            { text: '<strong>No 2026 tax increase.</strong> Locking in the 2017 rates prevents an automatic tax hike on most households when those rates were due to expire.', note: 'Rates were scheduled to revert at the end of 2025.' },
            { text: '<strong>Relief aimed at workers.</strong> No tax on tips and overtime, a larger senior deduction, and a car-loan-interest deduction put more take-home pay in working paychecks.', note: 'These provisions run 2025–2028.' },
            { text: '<strong>Families and simplicity.</strong> A permanent $2,200 child tax credit and a larger standard deduction.', note: '' },
            { text: '<strong>Program integrity.</strong> Supporters frame the Medicaid and SNAP changes as work requirements and reducing waste, not benefit cuts.', note: '' },
            { text: '<strong>Border and defense.</strong> New funding for immigration enforcement and the military.', note: '' }
          ]
        },
        caseAgainst: {
          sub: 'How critics (the CBO’s findings, Democrats, and deficit hawks) describe it.',
          points: [
            { text: '<strong>Permanent for the top, temporary for workers.</strong> The rate cuts that most help higher earners are permanent; the tips, overtime, senior, and car-loan breaks expire after 2028.', note: 'IRS; Joint Committee on Taxation.' },
            { text: '<strong>It grows the deficit.</strong> The CBO scores the law as adding about $3.4 trillion to deficits through 2034 — roughly $4.1 trillion once interest is counted — despite a stated goal of curbing the debt.', note: 'CBO; Center on Budget and Policy Priorities.' },
            { text: '<strong>Low-income households lose ground.</strong> The CBO’s distributional analysis finds household resources fall for the lowest-income group and rise for the middle and top, largely because of the Medicaid and SNAP cuts.', note: 'CBO, Distributional Effects of H.R. 1.' },
            { text: '<strong>“No tax on tips” is oversold.</strong> It is a capped deduction with income phase-outs, not a full exemption — payroll taxes still apply and it disappears after 2028.', note: 'Bipartisan Policy Center.' },
            { text: '<strong>Coverage losses.</strong> Roughly 10–12 million more people are projected to be uninsured by 2034.', note: 'CBO.' }
          ]
        },
        notDo: {
          intro: 'A few things the law is widely believed to do, but does not:',
          items: [
            'It does NOT make tips and overtime permanently tax-free — both are temporary deductions that expire December 31, 2028 unless Congress renews them.',
            'It does NOT stop payroll taxes on that income — Social Security and Medicare taxes are still withheld from tips and overtime, and state income tax can still apply.',
            'It does NOT fully exempt tips or overtime — each is a capped deduction ($25,000 for tips; $12,500 single / $25,000 joint for overtime) that phases out above ~$150,000 of income.',
            'It does NOT reduce the deficit — the CBO scores it as adding roughly $3.4 trillion (about $4.1 trillion with interest) over ten years.',
            'It does NOT lift every household’s bottom line — the CBO finds the lowest-income households are worse off on net once the Medicaid and SNAP changes are counted.'
          ],
          outro: 'These points come from the CBO, the Joint Committee on Taxation, and the IRS — not from either party’s framing.'
        },
        dataContext: [
          { label: 'Deficit impact', tag: 'CBO', text: '≈ $3.4 trillion added to deficits over 2025–2034; about $4.1 trillion once added interest is included (CBPP).' },
          { label: 'Who gains, who loses', tag: 'CBO', text: 'Household resources fall for the bottom of the income distribution and rise for the middle and top.' },
          { label: 'The mechanism', tag: 'CBO', text: 'Tax cuts and cash transfers add about $3.1 trillion to household resources, while Medicaid and SNAP reductions subtract about $1.0 trillion — concentrated on lower-income families.' },
          { label: 'Coverage', tag: 'CBO', text: 'Roughly 10–12 million more people are projected to be uninsured by 2034.' },
          { label: 'The 2028 cliff', tag: 'Law text', text: 'No tax on tips, no tax on overtime, the senior deduction, and car-loan interest all expire after 2028; the $40,000 SALT cap reverts to $10,000 in 2030.' }
        ],
        whatToWatch: [
          'The 2028 cliff: whether a future Congress extends the tips, overtime, senior, and car-loan deductions — or lets them lapse, which would raise taxes on those same workers.',
          'The SALT cap snapping back from $40,000 to $10,000 in 2030.',
          'How Medicaid work requirements are implemented state by state, and whether coverage losses track the CBO projection.',
          'Whether real deficit and interest costs land near, above, or below the CBO’s roughly $3.4 trillion estimate.'
        ],
        sources: [
          { lean: 'neutral', label: 'CBO — Distributional Effects of H.R. 1', url: 'https://www.cbo.gov/publication/61387' },
          { lean: 'neutral', label: 'IRS — OBBBA deductions for workers and seniors', url: 'https://www.irs.gov/newsroom/one-big-beautiful-bill-act-tax-deductions-for-working-americans-and-seniors' },
          { lean: 'neutral', label: 'Bipartisan Policy Center — How “No Tax on Tips” works', url: 'https://bipartisanpolicy.org/explainer/how-does-no-tax-on-tips-work-in-the-one-big-beautiful-bill/' },
          { lean: 'neutral', label: 'Tax Foundation — OBBBA tax-change FAQ', url: 'https://taxfoundation.org/research/all/federal/one-big-beautiful-bill-act-tax-changes/' },
          { lean: 'neutral', label: 'Brookings — One Big Beautiful Bill? A preliminary assessment', url: 'https://www.brookings.edu/articles/one-big-beautiful-bill-a-preliminary-assessment/' },
          { lean: 'neutral', label: 'Congress.gov — H.R. 1 (119th Congress)', url: 'https://www.congress.gov/bill/119th-congress/house-bill/1' },
          { lean: 'support', label: 'White House — the President’s tax cuts', url: 'https://www.whitehouse.gov/' },
          { lean: 'opposition', label: 'CBPP — the megabill’s distribution', url: 'https://www.cbpp.org/research/federal-tax/republican-megabill-trades-essential-support-to-low-income-people-for-skewed' }
        ],
        relatedIssues: [
          { slug: 'government-spending-debt-entitlement-reform', label: 'Government Spending & Debt', rec: true },
          { slug: 'social-security-medicare-solvency-2026', label: 'Social Security & Medicare' },
          { slug: 'tariffs-cost-of-living-inflation', label: 'Tariffs & Cost of Living' },
          { issueKey: 'lower_taxes', label: 'Taxes' },
          { issueKey: 'national_debt', label: 'National Debt' },
          { issueKey: 'healthcare', label: 'Medicaid & Health' }
        ],
`;

let html = fs.readFileSync(INDEX, 'utf8');

// Locate the guide object and its bounds.
const gStart = html.indexOf(`'${SLUG}': {`);
if (gStart < 0) { console.error('✗ BBB guide not found'); process.exit(1); }
let depth = 0, s = html.indexOf('{', gStart), gEnd = s;
for (let p = s; p < html.length; p++) { const c = html[p]; if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) { gEnd = p; break; } } }
const block = html.slice(gStart, gEnd + 1);

if (/\bfactBox:\s*\{/.test(block)) {
  console.log('· substance sections already present — nothing to do (idempotent).');
  process.exit(0);
}

// Insert the new fields immediately before the guide's `timeline:` field.
const relTimeline = block.indexOf('\n        timeline:');
if (relTimeline < 0) { console.error('✗ timeline anchor not found inside guide'); process.exit(1); }
const insertAt = gStart + relTimeline + 1; // just after the newline
const out = html.slice(0, insertAt) + BLOCK + html.slice(insertAt);

console.log(`One Big Beautiful Bill (H.R. 1) — add substance sections  [${APPLY ? 'APPLY' : 'DRY RUN'}]`);
console.log('  + factBox (permanent vs temporary, who gains)');
console.log('  + whatChanged (6 cards) · caseFor/caseAgainst · notDo (myth-busting)');
console.log('  + dataContext (deficit + distribution) · whatToWatch · sources (8) · relatedIssues (6)');
if (!APPLY) { console.log('\nDry run. Re-run with --apply.'); process.exit(0); }
fs.writeFileSync(INDEX, out);
console.log('\n✎ written to index.html');
