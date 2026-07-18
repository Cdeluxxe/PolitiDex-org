#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — add two cross-linked Issue Spotlights (July 2026):
//   1) maha-food-system-additives-2026  — MAHA & the food system (additives,
//      dyes, ultra-processed foods, the GRAS loophole, SNAP/school meals).
//   2) pesticides-pfas-chemical-safety-2026 — pesticide liability shields,
//      PFAS "forever chemicals," EPA approvals, and other substances of concern.
// Neutral, sourced, both-sides (CONTENT_STYLE.md). Adds them to the SPOTLIGHTS
// registry object in index.html; the registry auto-derives, so no list edit is
// needed. Idempotent.
//   node scripts/add-maha-chemical-spotlights-jul2026.mjs            # dry run
//   node scripts/add-maha-chemical-spotlights-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');

const BLOCK = `      // ── Policy-explainer Spotlight (national · food safety + the MAHA agenda) ──
      'maha-food-system-additives-2026': {
        slug: 'maha-food-system-additives-2026',
        eyebrow: 'Issue Spotlight',
        title: 'MAHA & the Food System: Additives, Dyes, and What’s in Our Food',
        place: 'National · Food safety and public health',
        updated: 'Updated July 18, 2026',
        primaryIssueKey: 'health_balance',
        communityIssueKeys: ['health_balance', 'healthcare', 'medical_freedom', 'gov_regulation', 'rural_ag'],
        searchKeywords: 'maha make america healthy again rfk robert kennedy jr hhs food dyes red 3 red 40 yellow 5 6 blue 1 petroleum synthetic dyes additives ultra-processed food upf gras generally recognized as safe fda loophole titanium dioxide bha bht potassium bromate brominated vegetable oil bvo seed oils snap soda candy school lunch whole milk food industry regulation childhood chronic disease maha report front-of-package labeling',
        metaDescription: 'A neutral, sourced guide to the MAHA food agenda in 2026 — food dyes and additives, ultra-processed foods, the FDA’s GRAS loophole, SNAP and school-meal rules, and the debate over mandates versus choice in what’s in our food.',
        blurb: 'The "Make America Healthy Again" movement put the food supply itself on the agenda — synthetic dyes, additives, and ultra-processed foods. Here is what is actually in the food, how the FDA reviews it, what is changing, and the honest debate over how far government should go.',
        summary: 'The "Make America Healthy Again" (MAHA) agenda, led by Health Secretary Robert F. Kennedy Jr., shifted federal attention from treating disease to what Americans eat — and specifically to the chemicals and processing in the food supply. Three threads run through it. First, synthetic food dyes: the FDA revoked authorization for Red Dye No. 3 in food in early 2025 (citing a cancer finding in male rats and the Delaney Clause), and the administration pressed the industry to phase out petroleum-based dyes such as Red 40 and Yellow 5 and 6, with several large manufacturers pledging to remove or replace them and states including California and West Virginia passing their own restrictions. Second, additives more broadly: the U.S. lets companies self-designate many ingredients "Generally Recognized as Safe" (GRAS) without pre-market FDA review — a decades-old pathway supporters call efficient and critics call a loophole — and several substances allowed in U.S. food (such as potassium bromate, BHA/BHT, and, until recently, brominated vegetable oil) are restricted or banned in other countries. Third, ultra-processed foods, which make up an estimated 55–60% of U.S. calories and are the subject of a 2025 federal report on childhood chronic disease that also flagged additives, pesticides, and over-medicalization. Around these sit fights over restricting soda and candy in SNAP, school-meal standards, whole milk in schools, front-of-package labeling, and contested claims about seed oils. The central question is how much government should reshape the food supply through mandates and bans, how much to leave to companies and consumer choice, and how confident the science is for each specific rule.',
        controversyLabel: 'Why it’s contested:',
        controversy: 'Supporters of an aggressive food-safety agenda argue that the U.S. lags peer nations in policing additives, that the GRAS pathway lets industry mark its own homework, and that removing dyes, tightening additive review, and cleaning up school meals and SNAP are common-sense protections — especially for children. Skeptics raise two very different objections. Market-and-choice critics argue that broad food mandates are paternalistic, hard to enforce, and often outrun the evidence — that a dye or additive being banned abroad is not proof of harm at real exposures, and that Washington should not dictate diets. A medical-freedom camp welcomes scrutiny of the food industry but distrusts the same agencies to get it right and resists new coercive public-health power. There is also friction within the movement itself over how much to trust established science, how far to go on ingredients like seed oils where the evidence is genuinely mixed, and the fact that the 2025 MAHA report was found to contain citation errors. Almost everyone agrees the food environment matters; the dispute is over which specific rules are justified, how strong the evidence is, and who should decide.',
        status: { text: 'Red Dye No. 3 revoked from food (2025) · petroleum-dye phase-outs pledged by major brands and mandated in some states · GRAS-loophole reform under review at FDA · SNAP soda/candy waivers advancing in several states · ultra-processed foods ≈55–60% of U.S. calories', tag: 'developing' },
        factBox: {
          note: 'Figures from the FDA, USDA, and peer-reviewed nutrition research (e.g., on ultra-processed food intake). Additive and dye actions are recent and continue to change; treat specifics as dated.',
          cols: ['Measure', 'Figure', 'Detail', 'Note'],
          rows: [
            { label: 'Red Dye No. 3', before: 'Revoked', after: 'From food (2025)', share: 'Cited rat-cancer data + Delaney Clause' },
            { label: 'Ultra-processed foods', before: '≈55–60%', after: 'Of U.S. calories', share: 'Higher for children' },
            { label: 'GRAS additives', before: 'Many', after: 'Self-affirmed', share: 'Often without FDA pre-review' },
            { label: 'Main levers', before: 'Mix', after: 'Bans vs. choice', share: 'Dyes, additives, SNAP, school meals', total: true }
          ],
          foot: 'Two systems decide what is in food: the FDA reviews additives and can revoke them, but a long-standing "GRAS" pathway lets companies self-designate many ingredients as safe. How tightly to police both sits at the center of the MAHA food debate.'
        },
        notDo: {
          intro: 'Common misreadings, corrected — in both directions:',
          items: [
            '<b>"Banned in Europe" is a flag, not a verdict.</b> Different systems weigh evidence and precaution differently; a dye or additive restricted abroad may still be judged safe at typical U.S. exposures, and vice versa. It is a reason to look, not proof of harm.',
            '<b>GRAS is not "unregulated."</b> The FDA can and does act on additives, and companies can notify the agency of GRAS determinations — but critics are right that many ingredients enter the food supply without mandatory pre-market FDA review.',
            '<b>Removing a dye is a mandate when government requires it.</b> Voluntary industry pledges are different from state or federal bans; both are happening, and only the latter is regulation.',
            '<b>Ultra-processed is not a precise legal category.</b> It is a useful research concept (the NOVA system), but "processed" spans everything from bagged salad to soda, so blanket claims in either direction oversimplify.',
            '<b>The seed-oil debate is genuinely unsettled.</b> Claims that industrial seed oils are a primary driver of chronic disease are contested and not the mainstream scientific consensus; so are sweeping defenses. Treat strong claims on either side with caution.',
            '<b>Scrutinizing the food industry and trusting health agencies are separable.</b> One can favor tougher additive rules while distrusting regulators, or trust the science while opposing mandates — the positions do not always travel together.'
          ],
          outro: 'What is genuinely at issue is which specific food rules the evidence supports, how much government should reshape the food supply versus leaving it to companies and consumers, and who decides.'
        },
        timeline: [
          { date: '1958', text: 'The Food Additives Amendment and its Delaney Clause bar FDA approval of additives shown to cause cancer in people or animals; the same law creates the "Generally Recognized as Safe" (GRAS) pathway.', src: { label: 'FDA — food additives & GRAS', url: 'https://www.fda.gov/food/food-ingredients-packaging' } },
          { date: '2023–2024', text: 'California bans several additives (including Red Dye No. 3) in food sold in-state, and the FDA revokes authorization for brominated vegetable oil (BVO), signaling renewed additive scrutiny.', src: { label: 'FDA — BVO revocation', url: 'https://www.fda.gov/food' } },
          { date: 'Jan 2025', text: 'The FDA revokes authorization for Red Dye No. 3 in food nationwide, citing a cancer finding in male rats and the Delaney Clause.', src: { label: 'FDA — Red No. 3', url: 'https://www.fda.gov/food/food-additives-petitions/fda-revoke-authorization-use-red-no-3' } },
          { date: '2025', text: 'The "Make America Healthy Again" agenda takes hold under HHS; a federal report on childhood chronic disease flags ultra-processed foods, additives, and pesticides, and the administration presses industry to drop petroleum-based dyes. The report is later found to contain citation errors.', src: { label: 'HHS — MAHA', url: 'https://www.hhs.gov/' } },
          { date: '2025–2026', text: 'Major food brands pledge to remove synthetic dyes; states pass additive and dye restrictions and seek SNAP waivers to bar soda and candy; the FDA weighs tightening the GRAS pathway.', src: { label: 'USDA FNS — SNAP', url: 'https://www.fns.usda.gov/snap' } }
        ],
        whatChanged: [
          { title: 'Food ingredients became a federal priority', tag: 'verified', marker: 'MAHA', text: 'Dyes, additives, and ultra-processed foods moved from a niche concern to a central federal health agenda.' },
          { title: 'Red No. 3 was pulled from food', tag: 'verified', text: 'The FDA revoked authorization for Red Dye No. 3 in food, and pressure mounted on other petroleum-based dyes.' },
          { title: 'Industry began reformulating', tag: 'developing', text: 'Several large manufacturers pledged to remove or replace synthetic dyes, though timelines and substitutes vary.' },
          { title: 'The GRAS loophole is under review', tag: 'developing', text: 'The self-affirmed-safety pathway — long criticized — moved onto the reform agenda at the FDA.' },
          { title: 'The science and the coalition are not settled', tag: 'developing', text: 'Evidence for some targets (like seed oils) is genuinely mixed, and the reform movement disagrees internally over how far to go.' }
        ],
        caseFor: {
          sub: 'The case for tougher food-safety rules and the MAHA food agenda. Vote or discuss each below.',
          points: [
            { id: 'close-gras', text: '<b>Close the GRAS loophole:</b> supporters argue companies should not self-certify ingredients as safe, and that mandatory FDA pre-market review would catch problems earlier.' },
            { id: 'kids-first', text: '<b>Protect children:</b> removing synthetic dyes and cleaning up school meals and SNAP is framed as shielding kids from additives with little nutritional purpose.' },
            { id: 'catch-up', text: '<b>Catch up to peers:</b> supporters note several U.S.-allowed additives are restricted abroad and argue the U.S. should modernize its review.' },
            { id: 'transparency', text: '<b>Transparency and labeling:</b> clear front-of-package labels and ingredient disclosure are framed as empowering informed choice.' },
            { id: 'less-upf', text: '<b>Rein in ultra-processed food:</b> given how much of the diet it makes up, supporters back research, procurement, and nutrition standards that shift toward whole foods.' }
          ]
        },
        caseAgainst: {
          sub: 'The case for choice, markets, and caution on mandates. Vote or discuss each below.',
          points: [
            { id: 'paternalism', text: '<b>Don’t dictate diets:</b> critics argue additive bans and SNAP restrictions are paternalistic, hard to enforce, and an overreach into personal and commercial choice.' },
            { id: 'evidence', text: '<b>Follow the evidence, not the vibe:</b> "banned abroad" is not proof of harm at real exposures, and critics warn against rules that outrun the science.' },
            { id: 'cost-access', text: '<b>Cost and access:</b> reformulation and stricter rules can raise food prices and hit lower-income shoppers hardest, a tradeoff critics say is understated.' },
            { id: 'agency-distrust', text: '<b>Distrust of the regulators:</b> a medical-freedom camp welcomes industry scrutiny but doubts the same agencies will get the new rules right.' },
            { id: 'seed-oil-caution', text: '<b>Beware overreach on contested claims:</b> for targets like seed oils where evidence is mixed, critics urge humility rather than sweeping guidance.' }
          ]
        },
        dataContext: [
          { label: 'How additives get in', text: 'The FDA formally reviews some additives, but the 1958 "GRAS" pathway lets companies self-designate many ingredients as safe, sometimes without notifying the agency — the core of the "loophole" critique.' },
          { label: 'Dyes on the way out', text: 'Red Dye No. 3 was revoked from food in 2025; petroleum-based dyes like Red 40 and Yellow 5/6 face voluntary phase-outs and state bans, though safe-at-exposure debates continue.' },
          { label: 'Ultra-processed share', text: 'Ultra-processed foods make up an estimated 55–60% of U.S. calories and more for children; the category is broad, which complicates blanket rules.' },
          { label: 'Where reforms run', text: 'Additive and dye rules run through the FDA; school meals and SNAP through USDA and the states; labeling through the FDA — so change is spread across several levers, not one.' },
          { label: 'Contested science', text: 'Some MAHA targets (dyes, certain additives) have clearer cases than others (seed oils), and the 2025 MAHA report’s citation errors became part of the debate over rigor.' },
          { label: 'The pesticide overlap', text: 'The food-additive fight connects to a broader chemical-safety debate — pesticide residues and "forever chemicals" in food and water — covered in the companion Spotlight.' }
        ],
        whatToWatch: [
          'Whether the FDA moves to require pre-market review and close or narrow the GRAS self-affirmation pathway.',
          'How far synthetic-dye phase-outs go, and whether substitutes and timelines hold.',
          'Expansion or legal challenge of SNAP soda/candy waivers and new school-meal standards.',
          'New front-of-package labeling rules and additive re-reviews at the FDA.',
          'Whether food-reform rules stay tethered to strong evidence — and whether health outcomes actually improve.'
        ],
        sources: [
          { label: 'FDA — food ingredients, additives & GRAS', url: 'https://www.fda.gov/food/food-ingredients-packaging', lean: 'neutral' },
          { label: 'FDA — revoking Red Dye No. 3 in food', url: 'https://www.fda.gov/food/food-additives-petitions/fda-revoke-authorization-use-red-no-3', lean: 'neutral' },
          { label: 'USDA Food and Nutrition Service — SNAP & school meals', url: 'https://www.fns.usda.gov/snap', lean: 'neutral' },
          { label: 'HHS — Make America Healthy Again', url: 'https://www.hhs.gov/', lean: 'support' },
          { label: 'Center for Science in the Public Interest — additives & dyes', url: 'https://www.cspinet.org/', lean: 'support' },
          { label: 'Environmental Working Group — food chemicals', url: 'https://www.ewg.org/', lean: 'support' },
          { label: 'Cato Institute — against food paternalism', url: 'https://www.cato.org/', lean: 'opposition' },
          { label: 'American Council on Science and Health — chemical-risk context', url: 'https://www.acsh.org/', lean: 'opposition' }
        ],
        relatedIssues: [
          { label: 'Pesticides, PFAS & Chemical Safety', slug: 'pesticides-pfas-chemical-safety-2026' },
          { label: 'Obesity, Chronic Disease & Healthcare Costs', slug: 'obesity-chronic-disease-healthcare-costs-2026' },
          { label: 'Food Security & the Future of Farming', slug: 'food-security-farming-future-2026' },
          { label: 'Prescription Drug Prices & Pharmaceutical Reform', slug: 'prescription-drug-prices-pharmaceutical-reform-2026' },
          { label: 'Pandemic Preparedness & Gain-of-Function Research', slug: 'pandemic-preparedness-gain-of-function-2026' },
          { label: 'Medical Freedom & Informed Consent', issueKey: 'medical_freedom', rec: true },
          { label: 'Healthcare Access & Public Health', issueKey: 'healthcare' }
        ],
        standsOnIssue: {
          libraryKey: 'health_balance',
          matchIssueKeys: ['health_balance', 'healthcare', 'medical_freedom', 'gov_regulation'],
          note: 'Stance chips read on how active a role government should play in policing the food supply: “Supports” = backs stronger federal food-safety rules (tighter additive review, dye phase-outs, SNAP/school-meal standards); “Opposes” = emphasizes choice, markets, and medical freedom and is wary of food mandates; “Mixed” = targeted reform without broad mandates. Positions come from each official’s record; the Stance Library has the full spread.',
          people: [
            { id: 'kennedy_rfk', name: 'Robert F. Kennedy Jr.', office: 'U.S. Secretary of Health & Human Services', icon: '⚕️', stance: 'supported', posText: 'Leads the "Make America Healthy Again" agenda, pressing to phase out synthetic food dyes, tighten additive review, rework SNAP and school meals, and reorient federal policy around the food supply and chronic disease.', source: { label: 'hhs.gov', url: 'https://www.hhs.gov/' }, verdict: { cls: 'consistent', label: 'On record' } },
            { id: 'booker', name: 'Cory Booker', office: 'U.S. Senator · New Jersey', icon: '🥦', topic: 'Food Safety & Additives', stance: 'supported' },
            { id: 'blumenthal', name: 'Richard Blumenthal', office: 'U.S. Senator · Connecticut', icon: '⚖️', topic: 'Food Chemicals & Consumers', stance: 'supported' },
            { id: 'rollins', name: 'Brooke Rollins', office: 'U.S. Secretary of Agriculture', icon: '🌾', topic: 'SNAP & Nutrition Standards', stance: 'mixed' },
            { id: 'andy_harris', name: 'Andy Harris', office: 'House Freedom Caucus Chair · Maryland · Physician', icon: '🩺', topic: 'FDA & Food Policy', stance: 'mixed' },
            { id: 'massie', name: 'Thomas Massie', office: 'U.S. Representative · Kentucky', icon: '🥛', topic: 'Food Freedom', stance: 'opposed' },
            { id: 'rand_paul', name: 'Rand Paul', office: 'U.S. Senator · Kentucky', icon: '🏛', topic: 'Deregulation & Choice', stance: 'opposed' }
          ]
        }
      },
      // ── Policy-explainer Spotlight (national · environmental health + chemicals) ──
      'pesticides-pfas-chemical-safety-2026': {
        slug: 'pesticides-pfas-chemical-safety-2026',
        eyebrow: 'Issue Spotlight',
        title: 'Pesticides, PFAS & Chemical Safety: Liability and “Forever Chemicals”',
        place: 'National · Environmental health and regulation',
        updated: 'Updated July 18, 2026',
        primaryIssueKey: 'enviro_balance',
        communityIssueKeys: ['enviro_balance', 'gov_regulation', 'econ_corp_account', 'health_balance', 'water'],
        searchKeywords: 'pesticides pfas forever chemicals chemical safety glyphosate roundup bayer monsanto liability shield failure to warn preemption fifra epa label immunity right to sue iarc carcinogen atrazine chlorpyrifos paraquat parkinsons dicamba pfoa pfos genx afff firefighting foam drinking water mcl superfund cercla tsca new chemicals 3m dupont chemours maine minnesota product bans microplastics bpa phthalates endocrine disruptors',
        metaDescription: 'A neutral, sourced guide to U.S. chemical safety in 2026 — pesticide-liability shield laws, the glyphosate fight, PFAS "forever chemicals" and EPA drinking-water limits, new-chemical approvals, and the debate over regulation, liability, and who bears the risk.',
        blurb: 'Who is liable when an approved chemical is later linked to harm — and how tightly should the government regulate pesticides and "forever chemicals"? Here is the record on pesticide-liability shields, PFAS in water, EPA’s approval role, and the honest case on each side.',
        summary: 'Two chemical-safety fights converged in 2026. The first is over pesticides and liability. Weedkillers like glyphosate (Roundup) are central: the World Health Organization’s cancer agency (IARC) classified glyphosate as "probably carcinogenic" in 2015, while the EPA has maintained it is "not likely" to cause cancer at label-rate exposures — a genuine scientific disagreement that fueled tens of thousands of lawsuits and billions of dollars in settlements against the manufacturer. In response, the industry backed "pesticide-liability shield" laws in several states in 2025 that treat an EPA-approved label as satisfying the duty to warn — which would block "failure-to-warn" suits — and pushed for similar federal preemption. Supporters (farm groups and manufacturers) argue a single federal EPA standard protects the food supply and ends inconsistent state litigation; opponents (trial lawyers, some farmers, and health advocates) argue it strips injured people of the right to sue and gives companies immunity for harms that emerge after approval. The second fight is over PFAS — per- and polyfluoroalkyl "forever chemicals" used in nonstick coatings, waterproofing, food packaging, and firefighting foam, which persist in the environment and the body and have been associated in studies with certain cancers, thyroid and immune effects, and other harms. In 2024 the EPA set the first enforceable national drinking-water limits for several PFAS and designated two (PFOA and PFOS) as hazardous substances under Superfund; in 2025 the agency moved to keep the PFOA/PFOS limits but rescind or delay limits for several others, drawing both praise and criticism. Around these sit related concerns — new PFAS the EPA has approved through its new-chemicals program, older pesticides like atrazine and paraquat, and food-contact and consumer chemicals such as BPA, phthalates, and microplastics. The through-line: how strong the evidence must be to restrict a chemical, who should be liable when an approved product is later linked to harm, and where to set the balance between protection, cost, and the food and manufacturing economy.',
        controversyLabel: 'Why it’s contested:',
        controversy: 'On pesticides, supporters of liability-shield and federal-preemption laws argue that the EPA’s scientific review is the authoritative standard, that a patchwork of state lawsuits and warning requirements is unworkable for a national food supply, and that endless litigation threatens the availability of crop chemicals farmers rely on. Opponents argue that EPA approval reflects the data available at the time, that new evidence often emerges later, and that shielding manufacturers from "failure-to-warn" suits removes the main accountability tool for people who say they were harmed — an immunity, they argue, no other industry gets so cleanly. On PFAS, supporters of strict limits point to persistence and health associations and argue the precautionary case is overwhelming; critics counter that the strictest drinking-water limits are extraordinarily costly for water utilities and ratepayers, that some limits ran ahead of settled dose-response science, and that liability should fall on manufacturers rather than "passive receivers" like utilities and airports. Underneath both is the same disagreement seen across the MAHA debate: how much evidence justifies restriction, how precautionary to be, and who pays and who is liable.',
        status: { text: 'Pesticide-liability shield laws enacted in several states (2025) with a federal preemption push · glyphosate litigation and settlements ongoing · EPA keeps PFOA/PFOS drinking-water limits but moves to rescind/delay others (2025) · PFOA/PFOS listed as Superfund hazardous substances · state PFAS product bans phasing in', tag: 'developing' },
        factBox: {
          note: 'Figures from the EPA, the WHO/IARC, CRS, and public reporting on litigation and state laws. Regulatory limits and legal outcomes are moving quickly; treat specifics as dated.',
          cols: ['Measure', 'Figure', 'Detail', 'Note'],
          rows: [
            { label: 'Glyphosate cancer view', before: 'IARC: "probable"', after: 'EPA: "not likely"', share: 'A genuine science dispute' },
            { label: 'PFAS drinking-water limits', before: 'First-ever', after: 'PFOA/PFOS ≈4 ppt', share: 'Some other limits rescinded/delayed (2025)' },
            { label: 'Liability shields', before: 'Several states', after: 'EPA label = duty to warn', share: 'Would block failure-to-warn suits' },
            { label: 'PFAS in people', before: 'Widespread', after: 'Detectable in most', share: 'Persist in body & environment', total: true }
          ],
          foot: 'The recurring question: EPA approval reflects the evidence at approval time. When new harm claims emerge later, should companies be liable — and how strong must the evidence be to restrict a chemical already in use?'
        },
        notDo: {
          intro: 'Common misreadings, corrected — in both directions:',
          items: [
            '<b>EPA approval is not a permanent clean bill of health.</b> It reflects the data and methods at the time; agencies re-review chemicals as evidence accumulates, and approval and safety are not identical.',
            '<b>IARC and EPA are answering different questions.</b> IARC’s "probably carcinogenic" is a hazard classification (could it cause cancer under some conditions), while EPA weighs risk at real-world exposures — so the two findings are not a simple contradiction.',
            '<b>A liability shield is not the same as banning lawsuits entirely.</b> Most bills target "failure-to-warn" claims by treating the EPA label as sufficient; other claims may remain — but critics note failure-to-warn is the main avenue victims use.',
            '<b>"Detectable" is not "harmful at that level."</b> PFAS are found in most people’s blood, but detection does not by itself establish harm at a given dose — even as the persistence and associations drive precaution.',
            '<b>Not all PFAS are the same.</b> The term covers thousands of compounds with very different uses and toxicity; blanket claims — good or bad — about "PFAS" gloss over big differences.',
            '<b>Rescinding some PFAS limits is not the same as removing all of them.</b> The 2025 EPA action kept PFOA/PFOS limits while rolling back others; framing it as "gutting all PFAS rules" or "no change" both distort it.'
          ],
          outro: 'What is genuinely at issue is how much evidence justifies restricting a chemical, who is liable when an approved product is later linked to harm, and how to weigh protection against cost and the food and manufacturing economy.'
        },
        timeline: [
          { date: '2005', text: 'The Supreme Court (Bates v. Dow) holds that federal pesticide law (FIFRA) does not automatically preempt all state failure-to-warn claims — setting the stage for later state suits and today’s preemption fight.', src: { label: 'CRS — FIFRA & preemption', url: 'https://crsreports.congress.gov/' } },
          { date: '2015', text: 'The WHO’s IARC classifies glyphosate as "probably carcinogenic to humans," conflicting with the EPA’s assessment and triggering a wave of litigation.', src: { label: 'IARC — glyphosate monograph', url: 'https://www.iarc.who.int/' } },
          { date: '2023–2024', text: 'The EPA sets the first enforceable national drinking-water limits for several PFAS and designates PFOA and PFOS as hazardous substances under Superfund; 3M and others reach multibillion-dollar settlements with water utilities over PFAS.', src: { label: 'EPA — PFAS drinking water', url: 'https://www.epa.gov/pfas' } },
          { date: '2025', text: 'Several states enact pesticide-liability shield laws treating an EPA-approved label as satisfying the duty to warn, amid a federal preemption push; the EPA moves to keep PFOA/PFOS limits but rescind or delay limits for several other PFAS.', src: { label: 'EPA — PFAS drinking water rule', url: 'https://www.epa.gov/pfas' } },
          { date: '2025–2026', text: 'States including Maine and Minnesota phase in bans on PFAS in consumer products; glyphosate litigation and the federal preemption debate continue; scrutiny grows over new PFAS approved through the EPA’s new-chemicals program.', src: { label: 'EPA — TSCA new chemicals', url: 'https://www.epa.gov/reviewing-new-chemicals-under-toxic-substances-control-act-tsca' } }
        ],
        whatChanged: [
          { title: 'Pesticide liability moved to the statehouse', tag: 'developing', text: 'Instead of fighting each suit, manufacturers backed state laws that treat the EPA label as satisfying the duty to warn — a structural change to who can sue.' },
          { title: 'PFAS got first federal drinking-water limits', tag: 'verified', text: 'The EPA set enforceable limits for several PFAS and listed PFOA/PFOS as Superfund hazardous substances — then, in 2025, kept some and rolled back others.' },
          { title: 'Massive settlements landed', tag: 'verified', text: 'Multibillion-dollar PFAS and glyphosate settlements reshaped the litigation landscape even as core science stayed contested.' },
          { title: 'New chemicals drew scrutiny', tag: 'developing', text: 'The EPA’s approval of new PFAS and other substances through its new-chemicals program became a flashpoint over how much data is enough.' },
          { title: 'States moved faster than Washington', tag: 'developing', text: 'On both PFAS product bans and pesticide liability, states — in opposite directions — set much of the pace.' }
        ],
        caseFor: {
          sub: 'The case for strong regulation, PFAS limits, and preserving the right to sue. Vote or discuss each below.',
          points: [
            { id: 'right-to-sue', text: '<b>Keep the right to sue:</b> supporters argue people harmed by a product should be able to bring failure-to-warn claims, since approval reflects only the evidence known at the time.' },
            { id: 'precaution', text: '<b>Precaution on persistence:</b> because PFAS persist in the body and environment and are linked in studies to serious harms, supporters argue for strict limits and cleanup.' },
            { id: 'polluter-pays', text: '<b>Polluter pays:</b> manufacturers, not ratepayers and communities, should bear the cost of contamination and cleanup.' },
            { id: 'close-data-gaps', text: '<b>Require more data up front:</b> supporters want tougher pre-approval testing for new chemicals rather than approving first and studying later.' },
            { id: 'ban-worst', text: '<b>Phase out the worst actors:</b> banning nonessential PFAS uses and re-reviewing older pesticides like paraquat and atrazine is framed as overdue.' }
          ]
        },
        caseAgainst: {
          sub: 'The case for a single federal standard, cost realism, and liability limits. Vote or discuss each below.',
          points: [
            { id: 'one-standard', text: '<b>One national standard:</b> supporters of preemption argue the EPA’s science-based label should govern, not a patchwork of state suits and warnings that a national food supply can’t follow.' },
            { id: 'protect-food', text: '<b>Protect the crop toolbox:</b> farm groups argue endless litigation threatens the availability and cost of crop chemicals they depend on.' },
            { id: 'pfas-cost', text: '<b>Cost realism on PFAS:</b> critics argue the strictest drinking-water limits impose enormous costs on utilities and ratepayers for very small exposure reductions.' },
            { id: 'passive-receivers', text: '<b>Liability on makers, not receivers:</b> water utilities, airports, and farmers who merely used approved products argue they should not be liable as "passive receivers."' },
            { id: 'evidence-threshold', text: '<b>Set limits on solid dose-response science:</b> critics argue some limits ran ahead of settled science and prefer standards tied to demonstrated risk at real exposures.' }
          ]
        },
        dataContext: [
          { label: 'The glyphosate split', text: 'IARC calls glyphosate "probably carcinogenic" (a hazard classification); the EPA says it is "not likely" carcinogenic at label exposures (a risk assessment). Both can be stated accurately, which is why the fight persists.' },
          { label: 'How liability shields work', text: 'The state laws generally deem an EPA-approved label sufficient to satisfy the duty to warn, which blocks "failure-to-warn" suits. Supporters call it regulatory certainty; critics call it manufacturer immunity.' },
          { label: 'PFAS basics', text: '"Forever chemicals" resist breakdown and are detectable in most Americans’ blood. The class spans thousands of compounds with very different uses and toxicity, complicating one-size rules.' },
          { label: 'The 2025 PFAS reversal', text: 'The EPA kept enforceable limits for PFOA and PFOS but moved to rescind or delay limits for several other PFAS, citing cost and feasibility — praised by utilities, criticized by health advocates.' },
          { label: 'New-chemical approvals', text: 'Under the Toxic Substances Control Act, the EPA reviews new chemicals — including new PFAS — and critics argue some were cleared with limited long-term health data.' },
          { label: 'Other substances', text: 'The broader debate includes older pesticides (atrazine, paraquat, dicamba) and food-contact and consumer chemicals such as BPA, phthalates, and microplastics — each with its own evidence and rules.' }
        ],
        whatToWatch: [
          'Whether Congress attaches federal pesticide-preemption language (e.g., via the Farm Bill or appropriations) and how courts treat the new state shield laws.',
          'Whether the EPA’s rollback of certain PFAS drinking-water limits is finalized or challenged, and how the PFOA/PFOS limits are implemented.',
          'Superfund (CERCLA) cleanup and who ultimately pays for PFAS contamination.',
          'New state PFAS product bans (Maine, Minnesota and others) and whether they spread.',
          'Re-reviews of older pesticides and scrutiny of new-chemical approvals under TSCA.'
        ],
        sources: [
          { label: 'EPA — PFAS (drinking water, Superfund, TSCA)', url: 'https://www.epa.gov/pfas', lean: 'neutral' },
          { label: 'EPA — pesticides & FIFRA', url: 'https://www.epa.gov/pesticides', lean: 'neutral' },
          { label: 'WHO / IARC — glyphosate classification', url: 'https://www.iarc.who.int/', lean: 'neutral' },
          { label: 'Congressional Research Service — pesticide preemption & PFAS', url: 'https://crsreports.congress.gov/', lean: 'neutral' },
          { label: 'Environmental Working Group — PFAS & pesticides', url: 'https://www.ewg.org/', lean: 'support' },
          { label: 'Earthjustice — right to sue & chemical regulation', url: 'https://earthjustice.org/', lean: 'support' },
          { label: 'American Farm Bureau Federation — pesticide access & preemption', url: 'https://www.fb.org/', lean: 'opposition' },
          { label: 'American Chemistry Council — chemical regulation & cost', url: 'https://www.americanchemistry.com/', lean: 'opposition' }
        ],
        relatedIssues: [
          { label: 'MAHA & the Food System', slug: 'maha-food-system-additives-2026' },
          { label: 'Water Security & Western Scarcity', slug: 'water-security-western-scarcity-2026' },
          { label: 'Food Security & the Future of Farming', slug: 'food-security-farming-future-2026' },
          { label: 'The Administrative State & Regulatory Power', slug: 'administrative-state-regulatory-power-2026' },
          { label: 'Obesity, Chronic Disease & Healthcare Costs', slug: 'obesity-chronic-disease-healthcare-costs-2026' },
          { label: 'Corporate Accountability', issueKey: 'econ_corp_account', rec: true },
          { label: 'Environment vs. Development', issueKey: 'enviro_balance' }
        ],
        standsOnIssue: {
          libraryKey: 'enviro_balance',
          matchIssueKeys: ['enviro_balance', 'gov_regulation', 'econ_corp_account', 'health_balance'],
          note: 'Stance chips read on how tightly to regulate chemicals and who should be liable: “Supports” = backs strong regulation, PFAS limits, and preserving the right to sue over harms; “Opposes” = emphasizes a single federal standard, cost realism, deregulation, and liability limits for manufacturers and users; “Mixed” = targeted regulation balancing health, cost, and the food/manufacturing economy. Positions come from each official’s record; the Stance Library has the full spread.',
          people: [
            { id: 'shaheen', name: 'Jeanne Shaheen', office: 'U.S. Senator · New Hampshire', icon: '💧', stance: 'supported', posText: 'A leading Senate voice on PFAS, Shaheen has pushed drinking-water limits, cleanup at contaminated military sites, and testing and treatment funding for affected communities.', source: { label: 'shaheen.senate.gov', url: 'https://www.shaheen.senate.gov/' }, verdict: { cls: 'consistent', label: 'On record' } },
            { id: 'booker', name: 'Cory Booker', office: 'U.S. Senator · New Jersey', icon: '🥦', topic: 'Pesticides & Right to Sue', stance: 'supported' },
            { id: 'blumenthal', name: 'Richard Blumenthal', office: 'U.S. Senator · Connecticut', icon: '⚖️', topic: 'PFAS & Consumer Safety', stance: 'supported' },
            { id: 'whitehouse', name: 'Sheldon Whitehouse', office: 'Senate EPW Ranking Member · Rhode Island', icon: '🌊', topic: 'Polluter Accountability', stance: 'supported' },
            { id: 'markey', name: 'Ed Markey', office: 'U.S. Senator · Massachusetts', icon: '🌎', topic: 'PFAS & Chemical Regulation', stance: 'supported' },
            { id: 'capito', name: 'Shelley Moore Capito', office: 'Senate EPW Chair · West Virginia', icon: '🏔', topic: 'PFAS Cleanup vs. Liability', stance: 'mixed' },
            { id: 'roger_marshall', name: 'Roger Marshall', office: 'U.S. Senator · Kansas · Physician', icon: '🩺', topic: 'Farmers & Pesticide Access', stance: 'mixed' },
            { id: 'zeldin', name: 'Lee Zeldin', office: 'EPA Administrator', icon: '🌫', topic: 'Deregulation & Cost', stance: 'opposed' },
            { id: 'boozman', name: 'John Boozman', office: 'Senate Agriculture Chair · Arkansas', icon: '🌾', topic: 'Preemption & Crop Tools', stance: 'opposed' }
          ]
        }
      }`;

let html = fs.readFileSync(INDEX, 'utf8');
const anchor = '\n    };\n    window.PDX_ISSUE_SPOTLIGHTS = SPOTLIGHTS;';
if (!html.includes(anchor)) { console.error('✗ SPOTLIGHTS close anchor not found'); process.exit(1); }
const already = html.includes("'maha-food-system-additives-2026': {");
console.log(`  spotlights already present: ${already}`);
console.log(`  anchor found: true`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply.'); process.exit(0); }
if (already) { console.log('  · already present — no change'); process.exit(0); }

// Insert the two new entries before the object close. Preceding char is the last
// spotlight's closing brace at 6-space indent, so add a comma then the block.
html = html.replace(anchor, ',\n' + BLOCK + anchor);
fs.writeFileSync(INDEX, html);
console.log('  ✎ inserted 2 spotlights into SPOTLIGHTS registry');
