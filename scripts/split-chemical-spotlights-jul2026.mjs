#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — split the combined chemical-safety Spotlight into two dedicated,
// more-detailed guides (July 2026):
//   • pesticides-liability-regulation-2026 — pesticide liability shields, the
//     glyphosate fight, FIFRA/EPA, specific chemicals, farmworker health.
//   • pfas-forever-chemicals-2026 — PFAS in drinking water, health, the 2024
//     limits and 2025 rollback, Superfund, TSCA new approvals, AFFF, state bans.
// Retires the combined 'pesticides-pfas-chemical-safety-2026' card and repoints
// the three related-issue links that pointed to it. Idempotent.
//   node scripts/split-chemical-spotlights-jul2026.mjs            # dry run
//   node scripts/split-chemical-spotlights-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');

const BLOCK = `      // ── Policy-explainer Spotlight (national · pesticides & liability) ──
      'pesticides-liability-regulation-2026': {
        slug: 'pesticides-liability-regulation-2026',
        eyebrow: 'Issue Spotlight',
        title: 'Pesticides: Liability Shields, Glyphosate & Chemical Regulation',
        place: 'National · Agriculture, environmental health, and the courts',
        updated: 'Updated July 18, 2026',
        primaryIssueKey: 'enviro_balance',
        communityIssueKeys: ['enviro_balance', 'econ_corp_account', 'gov_regulation', 'rural_ag', 'health_balance'],
        searchKeywords: 'pesticides herbicides insecticides glyphosate roundup bayer monsanto liability shield failure to warn fifra epa label preemption bates v dow right to sue iarc probably carcinogenic ninth circuit atrazine endocrine chlorpyrifos organophosphate children paraquat parkinsons dicamba drift neonicotinoids bees pollinators farmworkers worker protection standard food quality protection act crop tools farm bill preemption rider',
        metaDescription: 'A neutral, sourced guide to U.S. pesticide policy in 2026 — the liability-shield laws that treat an EPA label as a defense, the glyphosate cancer fight, specific chemicals like atrazine, chlorpyrifos, paraquat and dicamba, farmworker exposure, and the debate over regulation and the right to sue.',
        blurb: 'When a weedkiller is approved by the EPA but later linked to harm, who is liable — and how tightly should Washington regulate the chemicals farmers rely on? Here is the record on liability shields, the glyphosate fight, the specific pesticides in dispute, and the honest case on each side.',
        summary: 'Pesticides sit at the intersection of the food supply, human health, and the courts. The EPA registers pesticides under the federal law known as FIFRA, setting label directions and residue tolerances, and re-reviews them over time. The flashpoint is what an EPA approval means when new harm claims emerge later. Glyphosate — the active ingredient in Roundup, now owned by Bayer — is the central case: the World Health Organization’s cancer agency (IARC) classified it "probably carcinogenic to humans" in 2015, while the EPA has maintained it is "not likely" to cause cancer at label-rate exposures (a finding a federal appeals court told the agency to reconsider in 2022). Tens of thousands of lawsuits followed, with billions in settlements and several large jury verdicts. In response, the manufacturer and farm groups backed "pesticide-liability shield" laws in several states in 2025 that treat an EPA-approved label as satisfying the legal duty to warn — which would block "failure-to-warn" claims — and pushed for equivalent federal preemption, including through Farm Bill and appropriations language. Supporters argue a single federal, science-based standard protects the food supply and ends an unworkable patchwork of state suits; opponents argue EPA approval reflects only the evidence available at the time, that harms often surface later, and that stripping the right to sue hands manufacturers an immunity no other industry enjoys so cleanly. Beyond glyphosate, the debate spans specific chemicals — atrazine (a widely used herbicide and water contaminant linked to endocrine effects, restricted in the EU), chlorpyrifos (an insecticide tied to neurodevelopmental harm in children, whose food uses were revoked, then partly reinstated after a court ruling), paraquat (a highly toxic herbicide associated in studies with Parkinson’s disease and banned in many countries), dicamba (which drifts and damages neighboring crops, prompting repeated court fights over its registration), and neonicotinoids (linked to pollinator decline) — plus farmworker exposure and the Worker Protection Standard. The through-line: how much evidence should it take to restrict a chemical already in use, and who is accountable when an approved product is later linked to harm.',
        controversyLabel: 'Why it’s contested:',
        controversy: 'Supporters of liability-shield and federal-preemption laws argue the EPA’s scientific review is the authoritative national standard, that a fifty-state patchwork of lawsuits and warning requirements is unworkable for a national food supply, and that endless litigation threatens the availability and affordability of the crop chemicals farmers depend on — with the manufacturer warning it might stop selling glyphosate in the U.S. altogether. Opponents counter that EPA registration reflects the data and methods available at approval, that new evidence routinely emerges afterward, and that "failure-to-warn" suits are the main accountability tool for people who say a product harmed them — so shielding manufacturers is, in effect, granting immunity. The scientific disputes are real and specific: IARC and the EPA reached different conclusions on glyphosate using different questions and methods; the health signals for chlorpyrifos and paraquat are stronger in some studies than others; and "restricted abroad" reflects different regulatory philosophies, not a settled verdict. Nearly everyone agrees pesticides need oversight; the fight is over how strong the evidence must be to restrict one, and who should bear the risk and the liability.',
        status: { text: 'Pesticide-liability shield laws enacted in several states (2025) with a federal preemption push · glyphosate litigation and settlements ongoing after a 2022 court order to re-review EPA’s safety finding · chlorpyrifos partly reinstated after a 2023 ruling · paraquat and dicamba fights continue', tag: 'developing' },
        factBox: {
          note: 'Figures from the EPA, the WHO/IARC, CRS, and public reporting on litigation and state laws. Registrations, court rulings, and settlements are moving quickly; treat specifics as dated.',
          cols: ['Measure', 'Figure', 'Detail', 'Note'],
          rows: [
            { label: 'Glyphosate cancer view', before: 'IARC: "probable"', after: 'EPA: "not likely"', share: 'Hazard vs. risk-at-exposure' },
            { label: 'Liability shields', before: 'Several states', after: 'EPA label = duty to warn', share: 'Would block failure-to-warn suits' },
            { label: 'Roundup litigation', before: 'Tens of thousands', after: 'Of claims; billions paid', share: 'Plus a federal preemption push' },
            { label: 'Chemicals in dispute', before: 'Multiple', after: 'Atrazine, chlorpyrifos…', share: 'Paraquat, dicamba, neonics', total: true }
          ],
          foot: 'EPA approval reflects the evidence at approval time and can be revisited. The core question: when new harm claims emerge, should an EPA label be a shield from lawsuits — and how strong must the evidence be to restrict a pesticide already in use?'
        },
        notDo: {
          intro: 'Common misreadings, corrected — in both directions:',
          items: [
            '<b>EPA approval is not a permanent clean bill of health.</b> Registrations reflect the data and methods at the time and are re-reviewed as evidence accumulates; approval and proven safety are not the same thing.',
            '<b>IARC and the EPA are answering different questions.</b> IARC’s "probably carcinogenic" is a hazard classification (could it cause cancer under some conditions); the EPA weighs risk at real-world exposures — so the findings are not a simple contradiction.',
            '<b>A liability shield is not a blanket ban on lawsuits.</b> The state laws mainly target "failure-to-warn" claims by treating the EPA label as sufficient; other claims may survive — but critics note failure-to-warn is the primary avenue victims use.',
            '<b>"Banned abroad" is a flag, not a verdict.</b> Other countries weigh precaution differently; a pesticide restricted in the EU may still be judged acceptable at U.S. exposures, and the reverse can be true too.',
            '<b>The chemicals differ.</b> Glyphosate, atrazine, chlorpyrifos, paraquat, dicamba, and neonicotinoids have different uses, exposures, and evidence — lumping them into one verdict oversimplifies.',
            '<b>Farmers are stakeholders on both sides.</b> Many depend on these products; some also fear drift, water contamination, or health effects — so "farmers vs. environmentalists" is too neat.'
          ],
          outro: 'What is genuinely at issue is how much evidence justifies restricting a pesticide already in use, and who is accountable — the manufacturer, the user, or no one — when an approved product is later linked to harm.'
        },
        timeline: [
          { date: '1996', text: 'The Food Quality Protection Act tightens pesticide-residue standards, adding an explicit margin of safety for children.', src: { label: 'EPA — FQPA & pesticide tolerances', url: 'https://www.epa.gov/pesticide-tolerances' } },
          { date: '2005', text: 'The Supreme Court (Bates v. Dow) holds that FIFRA does not automatically preempt all state failure-to-warn claims — the legal foundation for today’s suits and the preemption push against them.', src: { label: 'CRS — FIFRA & preemption', url: 'https://crsreports.congress.gov/' } },
          { date: '2015', text: 'The WHO’s IARC classifies glyphosate as "probably carcinogenic to humans," conflicting with the EPA’s assessment and triggering mass litigation; Bayer later acquires Monsanto (2018).', src: { label: 'IARC — glyphosate monograph', url: 'https://www.iarc.who.int/' } },
          { date: '2021–2023', text: 'The EPA moves to revoke chlorpyrifos food tolerances (2021); a federal court vacates the EPA’s glyphosate safety finding and orders re-review (2022); another court sends the chlorpyrifos revocation back, partly reinstating uses (2023).', src: { label: 'EPA — chlorpyrifos', url: 'https://www.epa.gov/ingredients-used-pesticide-products/chlorpyrifos' } },
          { date: '2025–2026', text: 'Several states enact pesticide-liability shield laws treating an EPA label as satisfying the duty to warn, amid a federal preemption push; paraquat and dicamba litigation and registration fights continue.', src: { label: 'EPA — pesticides & FIFRA', url: 'https://www.epa.gov/pesticides' } }
        ],
        whatChanged: [
          { title: 'Liability moved to the statehouse', tag: 'developing', text: 'Rather than fight each suit, manufacturers backed state laws that treat the EPA label as satisfying the duty to warn — a structural change to who can sue.' },
          { title: 'A court reopened the glyphosate science', tag: 'verified', text: 'A federal appeals court vacated the EPA’s "not likely carcinogenic" finding and ordered a fresh review, keeping the science formally unsettled.' },
          { title: 'Chlorpyrifos whipsawed', tag: 'verified', text: 'Food uses were revoked, then partly reinstated after a court ruling — a case study in shifting pesticide decisions.' },
          { title: 'Settlements reshaped the landscape', tag: 'verified', text: 'Billions in Roundup settlements and verdicts changed the calculus even as the core cancer question stayed contested.' },
          { title: 'The preemption fight went federal', tag: 'developing', text: 'Backers sought to lock in an EPA-label defense nationwide through Farm Bill and appropriations language.' }
        ],
        caseFor: {
          sub: 'The case for strong regulation and preserving the right to sue. Vote or discuss each below.',
          points: [
            { id: 'right-to-sue', text: '<b>Keep the right to sue:</b> supporters argue people harmed by a product must be able to bring failure-to-warn claims, since approval reflects only the evidence known at the time.' },
            { id: 'later-evidence', text: '<b>Evidence emerges later:</b> because harms can surface after approval, supporters want continued re-review and accountability, not a permanent shield.' },
            { id: 'protect-workers', text: '<b>Protect farmworkers and neighbors:</b> stronger exposure limits, buffer zones, and enforcement are framed as protecting the people closest to the chemicals.' },
            { id: 'rereview-old', text: '<b>Re-review older chemicals:</b> revisiting atrazine, paraquat, and others as science evolves is argued to be overdue.' },
            { id: 'transparency', text: '<b>Transparency:</b> disclosing studies, inert ingredients, and residue data is framed as letting the public and courts judge the evidence.' }
          ]
        },
        caseAgainst: {
          sub: 'The case for a single federal standard and protecting the crop toolbox. Vote or discuss each below.',
          points: [
            { id: 'one-standard', text: '<b>One national standard:</b> supporters of preemption argue the EPA’s science-based label should govern, not a patchwork of state suits and warnings a national food supply can’t follow.' },
            { id: 'protect-tools', text: '<b>Protect the crop toolbox:</b> farm groups argue litigation threatens the availability and cost of the chemicals farmers rely on — and could push makers to exit the market.' },
            { id: 'science-authority', text: '<b>Defer to the EPA’s review:</b> critics argue juries and state labels should not override the agency’s expert risk assessment at label exposures.' },
            { id: 'litigation-costs', text: '<b>Litigation is a tax on food:</b> the cost of mass tort suits, critics argue, ultimately falls on farmers and consumers.' },
            { id: 'evidence-threshold', text: '<b>Restrict on solid evidence:</b> critics prefer restrictions tied to demonstrated risk at real exposures rather than hazard labels or precaution alone.' }
          ]
        },
        dataContext: [
          { label: 'The glyphosate split', text: 'IARC calls glyphosate "probably carcinogenic" (a hazard classification); the EPA says "not likely" at label exposures (a risk assessment) — a finding a court ordered re-examined. Both can be stated accurately.' },
          { label: 'How liability shields work', text: 'The state laws deem an EPA-approved label sufficient to satisfy the duty to warn, blocking failure-to-warn suits. Supporters call it regulatory certainty; critics call it manufacturer immunity.' },
          { label: 'The specific chemicals', text: 'Atrazine (endocrine/water concerns), chlorpyrifos (child neurodevelopment), paraquat (Parkinson’s association, acute toxicity), dicamba (drift damage), and neonicotinoids (pollinators) each carry distinct evidence and rules.' },
          { label: 'Farmworkers', text: 'Agricultural workers face the highest direct exposure; the Worker Protection Standard governs training, buffer zones, and protective equipment, and is itself contested.' },
          { label: 'Where decisions run', text: 'Registration, tolerances, and re-review run through the EPA under FIFRA; liability runs through state courts and now state shield laws and any federal preemption Congress enacts.' },
          { label: 'The food and water overlap', text: 'Pesticide residues and runoff connect this debate to the food-additive fight and to drinking-water contamination — see the companion MAHA and PFAS Spotlights.' }
        ],
        whatToWatch: [
          'Whether Congress enacts federal pesticide-preemption language (via the Farm Bill or appropriations) and how courts treat the new state shield laws.',
          'The EPA’s court-ordered re-review of glyphosate and any change to its cancer finding.',
          'Registration fights over dicamba and paraquat, and the paraquat personal-injury litigation.',
          'Re-reviews of atrazine, chlorpyrifos, and neonicotinoids as evidence evolves.',
          'Whether the manufacturer follows through on threats to change or drop glyphosate products in the U.S.'
        ],
        sources: [
          { label: 'EPA — pesticides & FIFRA', url: 'https://www.epa.gov/pesticides', lean: 'neutral' },
          { label: 'WHO / IARC — glyphosate classification', url: 'https://www.iarc.who.int/', lean: 'neutral' },
          { label: 'Congressional Research Service — FIFRA & preemption', url: 'https://crsreports.congress.gov/', lean: 'neutral' },
          { label: 'Environmental Working Group — pesticides', url: 'https://www.ewg.org/', lean: 'support' },
          { label: 'Earthjustice — right to sue & pesticide regulation', url: 'https://earthjustice.org/', lean: 'support' },
          { label: 'Farmworker Justice — worker exposure', url: 'https://www.farmworkerjustice.org/', lean: 'support' },
          { label: 'American Farm Bureau Federation — pesticide access & preemption', url: 'https://www.fb.org/', lean: 'opposition' },
          { label: 'CropLife America — crop-protection industry', url: 'https://www.croplifeamerica.org/', lean: 'opposition' }
        ],
        relatedIssues: [
          { label: 'PFAS “Forever Chemicals”', slug: 'pfas-forever-chemicals-2026' },
          { label: 'MAHA & the Food System', slug: 'maha-food-system-additives-2026' },
          { label: 'Food Security & the Future of Farming', slug: 'food-security-farming-future-2026' },
          { label: 'The Administrative State & Regulatory Power', slug: 'administrative-state-regulatory-power-2026' },
          { label: 'Obesity, Chronic Disease & Healthcare Costs', slug: 'obesity-chronic-disease-healthcare-costs-2026' },
          { label: 'Corporate Accountability', issueKey: 'econ_corp_account', rec: true },
          { label: 'Agriculture & Rural Policy', issueKey: 'rural_ag' }
        ],
        standsOnIssue: {
          libraryKey: 'enviro_balance',
          matchIssueKeys: ['enviro_balance', 'econ_corp_account', 'gov_regulation', 'health_balance'],
          note: 'Stance chips read on pesticide regulation and liability: “Supports” = backs strong regulation, re-review, and preserving the right to sue over harms; “Opposes” = emphasizes a single federal EPA standard, preemption/liability shields, and protecting farmers’ access to crop chemicals; “Mixed” = targeted regulation balancing health and the farm economy. Positions come from each official’s record; the Stance Library has the full spread.',
          people: [
            { id: 'booker', name: 'Cory Booker', office: 'U.S. Senator · New Jersey', icon: '🥦', stance: 'supported', posText: 'A lead sponsor of legislation to ban or restrict pesticides linked to health harms and to protect the right to sue, Booker argues EPA approval should not shield manufacturers from accountability.', source: { label: 'booker.senate.gov', url: 'https://www.booker.senate.gov/' }, verdict: { cls: 'consistent', label: 'On record' } },
            { id: 'blumenthal', name: 'Richard Blumenthal', office: 'U.S. Senator · Connecticut', icon: '⚖️', topic: 'Consumer Safety & Right to Sue', stance: 'supported' },
            { id: 'whitehouse', name: 'Sheldon Whitehouse', office: 'Senate EPW Ranking Member · Rhode Island', icon: '🌊', topic: 'Polluter Accountability', stance: 'supported' },
            { id: 'grassley', name: 'Chuck Grassley', office: 'U.S. Senator · Iowa', icon: '🌽', topic: 'Farmers & Family Farms', stance: 'mixed' },
            { id: 'roger_marshall', name: 'Roger Marshall', office: 'U.S. Senator · Kansas · Physician', icon: '🩺', topic: 'Farmers & Pesticide Access', stance: 'mixed' },
            { id: 'boozman', name: 'John Boozman', office: 'Senate Agriculture Chair · Arkansas', icon: '🌾', topic: 'Preemption & Crop Tools', stance: 'opposed' },
            { id: 'rollins', name: 'Brooke Rollins', office: 'U.S. Secretary of Agriculture', icon: '🌾', topic: 'Crop Protection & the Food Supply', stance: 'opposed' }
          ]
        }
      },
      // ── Policy-explainer Spotlight (national · PFAS "forever chemicals") ──
      'pfas-forever-chemicals-2026': {
        slug: 'pfas-forever-chemicals-2026',
        eyebrow: 'Issue Spotlight',
        title: 'PFAS “Forever Chemicals”: Drinking Water, Health & Cleanup',
        place: 'National · Drinking water, environmental health, and cleanup',
        updated: 'Updated July 18, 2026',
        primaryIssueKey: 'enviro_balance',
        communityIssueKeys: ['enviro_balance', 'water', 'gov_regulation', 'econ_corp_account', 'health_balance'],
        searchKeywords: 'pfas per polyfluoroalkyl forever chemicals pfoa pfos genx hfpo-da pfhxs pfna pfbs drinking water mcl 4 ppt maximum contaminant level epa 2024 rule 2025 rollback rescind hazard index superfund cercla hazardous substance passive receiver tsca new chemicals approval regrettable substitution afff firefighting foam military base contamination 3m dupont chemours corteva settlement water utilities maine minnesota amaras law product ban biosolids sludge farmland pfas in blood',
        metaDescription: 'A neutral, sourced guide to PFAS "forever chemicals" in 2026 — what they are, the health concerns, the first federal drinking-water limits and the 2025 rollback, Superfund liability, new-chemical approvals, firefighting-foam contamination, state product bans, and the cost-and-liability debate.',
        blurb: 'PFAS "forever chemicals" are in most Americans’ blood and in drinking water nationwide. Here is what they are, what the health science does and doesn’t show, the fight over federal limits and who pays to clean them up, and the honest case on each side.',
        summary: 'PFAS — per- and polyfluoroalkyl substances — are a class of thousands of synthetic chemicals prized since the mid-20th century for resisting heat, water, and grease. They are in nonstick cookware, stain- and water-resistant fabrics, food packaging, cosmetics, semiconductors, and firefighting foam. Their strength is also the problem: the carbon-fluorine bond barely breaks down, so PFAS persist in the environment and accumulate in the body — earning the name "forever chemicals" — and are now detectable in the blood of nearly all Americans and in drinking water across the country. Health research has linked certain PFAS, in studies, to kidney and testicular cancer, thyroid disease, liver and cholesterol effects, weakened immune and vaccine response, and pregnancy complications such as high blood pressure and low birth weight; federal science bodies treat several of these associations seriously while noting that dose-response certainty varies by compound. Policy moved fast and then partly reversed. In 2024 the EPA set the first enforceable national drinking-water limits for several PFAS — including roughly 4 parts per trillion for PFOA and PFOS — and designated PFOA and PFOS as hazardous substances under the Superfund cleanup law. In 2025 the agency moved to keep the PFOA/PFOS limits (while extending utilities’ compliance deadline) but to rescind or delay the limits for several other PFAS, citing cost and feasibility — a decision utilities welcomed and health advocates criticized. Meanwhile the EPA has continued to approve new PFAS through its new-chemicals program, drawing criticism that replacements like GenX became problems of their own (a "regrettable substitution"). Firefighting foam (AFFF) contaminated many military bases and airports, prompting a massive cleanup bill and litigation in which 3M agreed to pay water utilities up to about $10.3 billion and DuPont-linked companies about $1.2 billion, with personal-injury cases continuing. States moved further and faster: Maine and Minnesota (through "Amara’s Law") enacted broad bans on PFAS in consumer products, and PFAS-laden sewage sludge spread on farmland became its own contamination story. The central questions: how strong the evidence must be to restrict a given PFAS, how to weigh very large cleanup and treatment costs against health protection, and who should be liable — the manufacturers who made them, or the "passive receivers" like water utilities, airports, and farmers who merely used approved products.',
        controversyLabel: 'Why it’s contested:',
        controversy: 'Supporters of strict PFAS limits argue that persistence plus real health associations make the precautionary case overwhelming — that chemicals which never break down and build up in people should be tightly limited and aggressively cleaned up, with manufacturers footing the bill. Critics do not defend PFAS so much as dispute the rules: they argue the strictest drinking-water limits impose enormous costs on water utilities and ratepayers for very small additional reductions in exposure, that some limits ran ahead of settled dose-response science, and that liability should fall on the companies that made and profited from PFAS rather than on "passive receivers" — utilities, airports, fire departments, and farmers — who merely used or received approved products. There is also a scientific nuance both sides sometimes flatten: PFAS is not one chemical but thousands, ranging widely in use, toxicity, and how much is known, so blanket claims — that all PFAS are equally dangerous, or that concern is overblown — both distort the picture. The disagreement mirrors the broader chemical-safety debate: how precautionary to be, how much evidence justifies restriction, and who pays.',
        status: { text: 'EPA keeps PFOA/PFOS drinking-water limits (≈4 ppt) but moves to rescind/delay limits for several other PFAS (2025); compliance deadline extended · PFOA/PFOS listed as Superfund hazardous substances · 3M (~$10.3B) and DuPont-linked (~$1.2B) water-utility settlements · Maine & Minnesota product bans phasing in', tag: 'developing' },
        factBox: {
          note: 'Figures from the EPA, ATSDR/CDC, and public reporting on litigation and state laws. Limits, deadlines, and legal outcomes are moving quickly; treat specifics as dated.',
          cols: ['Measure', 'Figure', 'Detail', 'Note'],
          rows: [
            { label: 'PFAS in people', before: 'Nearly all', after: 'Americans', share: 'Detectable in blood (CDC)' },
            { label: 'Drinking-water limit', before: '≈4 ppt', after: 'PFOA & PFOS', share: 'First-ever enforceable federal limits' },
            { label: '2025 change', before: 'Kept 2', after: 'Rescinded/delayed others', share: 'Cited cost and feasibility' },
            { label: 'Settlements', before: '~$10.3B + ~$1.2B', after: 'Water-utility deals', share: 'Plus ongoing injury suits', total: true }
          ],
          foot: '"Forever chemicals" barely break down and build up in the body. The fights are over how strong the evidence must be to restrict a given PFAS, how much cleanup and treatment should cost, and who is liable.'
        },
        notDo: {
          intro: 'Common misreadings, corrected — in both directions:',
          items: [
            '<b>"Detectable" is not "harmful at that level."</b> PFAS are found in most people’s blood, but detection alone does not establish harm at a given dose — even as persistence and health associations drive precaution.',
            '<b>Not all PFAS are the same.</b> The term covers thousands of compounds with very different uses and toxicity; blanket claims — dangerous or harmless — about "PFAS" gloss over big differences.',
            '<b>Rescinding some limits is not removing all of them.</b> The 2025 EPA action kept the PFOA/PFOS limits while rolling back others; "gutting all PFAS rules" and "nothing changed" both distort it.',
            '<b>Health associations are not always proven causation.</b> Several PFAS are linked to serious effects in studies; the strength of evidence and the dose at which risk rises vary by compound and are still being pinned down.',
            '<b>"Passive receivers" is a real legal category, not a talking point.</b> Water utilities and airports that used or received approved products argue they should not bear cleanup liability meant for manufacturers — a genuine fairness question.',
            '<b>Bottled water and filters are partial fixes.</b> Certain filters (reverse osmosis, some activated carbon) reduce PFAS, but "just drink bottled water" ignores cost, other exposure routes, and firefighting-foam and food-packaging sources.'
          ],
          outro: 'What is genuinely at issue is how much evidence justifies restricting a given PFAS, how to weigh very large cleanup and treatment costs against health protection, and who should be liable.'
        },
        timeline: [
          { date: '1940s–2000s', text: 'PFAS come into wide industrial and consumer use; internal industry studies later show the makers knew of health and persistence concerns years before the public.', src: { label: 'ATSDR — PFAS overview', url: 'https://www.atsdr.cdc.gov/pfas/' } },
          { date: '2016–2021', text: 'The EPA issues a health advisory for PFOA/PFOS and later a PFAS "roadmap"; Maine passes the first broad state PFAS product-ban law (2021).', src: { label: 'EPA — PFAS strategic roadmap', url: 'https://www.epa.gov/pfas' } },
          { date: '2023–2024', text: '3M agrees to pay water utilities up to ~$10.3B and DuPont-linked firms ~$1.2B; the EPA sets the first enforceable drinking-water limits for several PFAS and designates PFOA/PFOS as Superfund hazardous substances; Minnesota enacts "Amara’s Law."', src: { label: 'EPA — PFAS drinking water', url: 'https://www.epa.gov/sdwa/and-polyfluoroalkyl-substances-pfas' } },
          { date: '2025', text: 'The EPA keeps the PFOA/PFOS limits (extending the compliance deadline) but moves to rescind or delay limits for several other PFAS, citing cost and feasibility — praised by utilities, criticized by health advocates.', src: { label: 'EPA — PFAS drinking water rule', url: 'https://www.epa.gov/pfas' } },
          { date: '2025–2026', text: 'State PFAS product bans phase in; scrutiny grows over new PFAS approved through the EPA’s new-chemicals program and over PFAS-laden sewage sludge spread on farmland.', src: { label: 'EPA — TSCA new chemicals', url: 'https://www.epa.gov/reviewing-new-chemicals-under-toxic-substances-control-act-tsca' } }
        ],
        whatChanged: [
          { title: 'PFAS got first federal water limits', tag: 'verified', text: 'The EPA set enforceable drinking-water limits for several PFAS and listed PFOA/PFOS as Superfund hazardous substances — a major regulatory first.' },
          { title: 'Then the rules were partly rolled back', tag: 'developing', text: 'In 2025 the EPA kept the PFOA/PFOS limits but moved to rescind or delay limits for other PFAS, reopening the cost-versus-protection fight.' },
          { title: 'Record settlements landed', tag: 'verified', text: 'Multibillion-dollar settlements with water utilities reshaped the litigation landscape, with personal-injury cases still pending.' },
          { title: 'The "passive receiver" fight sharpened', tag: 'developing', text: 'Utilities, airports, and farmers pressed for liability protections so cleanup costs fall on manufacturers, not users.' },
          { title: 'New PFAS kept getting approved', tag: 'developing', text: 'The EPA’s new-chemicals program continued clearing new PFAS, drawing "regrettable substitution" criticism.' }
        ],
        caseFor: {
          sub: 'The case for strict limits, cleanup, and manufacturer liability. Vote or discuss each below.',
          points: [
            { id: 'precaution', text: '<b>Precaution on persistence:</b> because PFAS never break down and build up in the body, supporters argue for strict limits and aggressive cleanup even amid uncertainty.' },
            { id: 'polluter-pays', text: '<b>Polluter pays:</b> the manufacturers who made and profited from PFAS — not ratepayers and communities — should bear the cost of contamination and cleanup.' },
            { id: 'safe-water', text: '<b>Safe drinking water:</b> enforceable limits are framed as a basic public-health guarantee, especially for the hardest-hit communities.' },
            { id: 'close-tsca', text: '<b>Stop "regrettable substitutions":</b> supporters want tougher pre-approval testing so new PFAS don’t repeat old harms.' },
            { id: 'ban-nonessential', text: '<b>Phase out nonessential uses:</b> banning PFAS where safer alternatives exist (many consumer products) is framed as low-cost prevention.' }
          ]
        },
        caseAgainst: {
          sub: 'The case for cost realism and targeted liability. Vote or discuss each below.',
          points: [
            { id: 'utility-cost', text: '<b>Cost realism:</b> critics argue the strictest limits impose enormous treatment costs on water utilities and ratepayers for very small additional exposure reductions.' },
            { id: 'passive-receivers', text: '<b>Liability on makers, not users:</b> utilities, airports, and farmers who used approved products argue they should not be liable as "passive receivers."' },
            { id: 'dose-science', text: '<b>Tie limits to dose-response science:</b> critics argue some limits ran ahead of settled evidence and prefer standards based on demonstrated risk.' },
            { id: 'prioritize', text: '<b>Prioritize the worst actors:</b> given thousands of compounds, critics favor focusing on the few best-studied, highest-risk PFAS rather than the whole class at once.' },
            { id: 'feasibility', text: '<b>Feasibility and timelines:</b> critics argue compliance deadlines must match the availability of treatment technology and funding.' }
          ]
        },
        dataContext: [
          { label: 'What PFAS are', text: 'A class of thousands of synthetic compounds built on a very stable carbon-fluorine bond, used for non-stick, water- and grease-resistance, and in firefighting foam — hence "forever chemicals."' },
          { label: 'The health picture', text: 'Studies link certain PFAS to kidney and testicular cancer, thyroid and liver effects, immune and vaccine response, cholesterol, and pregnancy complications; federal bodies treat several associations seriously while noting dose-response varies by compound.' },
          { label: 'The 2024 limits and 2025 reversal', text: 'The EPA set first-ever enforceable limits for several PFAS in 2024, then in 2025 kept PFOA/PFOS (with a longer compliance window) but moved to rescind or delay the others.' },
          { label: 'Who pays', text: 'Superfund designation and settlements aim liability at manufacturers, but "passive receivers" (utilities, airports, fire departments, farmers) fear being stuck with cleanup costs — a central fairness fight.' },
          { label: 'New approvals', text: 'Under the Toxic Substances Control Act the EPA reviews new chemicals, including new PFAS; critics argue some were cleared with limited long-term data, repeating past mistakes.' },
          { label: 'Beyond the tap', text: 'Firefighting foam at bases and airports, food packaging, consumer products, and PFAS-laden sewage sludge spread on farmland all spread exposure beyond drinking water.' }
        ],
        whatToWatch: [
          'Whether the EPA finalizes the rollback of certain PFAS limits or it is challenged in court, and how the PFOA/PFOS limits are implemented.',
          'Superfund (CERCLA) cleanup and any "passive receiver" liability exemptions Congress or the EPA grant.',
          'New state PFAS product bans (Maine, Minnesota and beyond) and whether they spread.',
          'Scrutiny of new PFAS approvals under TSCA and any tightening of pre-approval testing.',
          'PFAS in sewage sludge/biosolids on farmland and the effect on the food supply.'
        ],
        sources: [
          { label: 'EPA — PFAS (drinking water, Superfund, TSCA)', url: 'https://www.epa.gov/pfas', lean: 'neutral' },
          { label: 'ATSDR / CDC — PFAS and health', url: 'https://www.atsdr.cdc.gov/pfas/', lean: 'neutral' },
          { label: 'Congressional Research Service — PFAS policy', url: 'https://crsreports.congress.gov/', lean: 'neutral' },
          { label: 'Environmental Working Group — PFAS', url: 'https://www.ewg.org/', lean: 'support' },
          { label: 'Earthjustice — PFAS regulation & accountability', url: 'https://earthjustice.org/', lean: 'support' },
          { label: 'American Water Works Association — utility cost & feasibility', url: 'https://www.awwa.org/', lean: 'opposition' },
          { label: 'American Chemistry Council — chemical regulation & cost', url: 'https://www.americanchemistry.com/', lean: 'opposition' }
        ],
        relatedIssues: [
          { label: 'Pesticides: Liability & Regulation', slug: 'pesticides-liability-regulation-2026' },
          { label: 'Water Security & Western Scarcity', slug: 'water-security-western-scarcity-2026' },
          { label: 'MAHA & the Food System', slug: 'maha-food-system-additives-2026' },
          { label: 'The Administrative State & Regulatory Power', slug: 'administrative-state-regulatory-power-2026' },
          { label: 'Food Security & the Future of Farming', slug: 'food-security-farming-future-2026' },
          { label: 'Water & Drinking-Water Safety', issueKey: 'water', rec: true },
          { label: 'Corporate Accountability', issueKey: 'econ_corp_account' }
        ],
        standsOnIssue: {
          libraryKey: 'enviro_balance',
          matchIssueKeys: ['enviro_balance', 'water', 'gov_regulation', 'econ_corp_account'],
          note: 'Stance chips read on how tightly to regulate PFAS and who should pay: “Supports” = backs strict limits, aggressive cleanup, and manufacturer liability; “Opposes” = emphasizes cost realism, dose-response science, and shifting liability off "passive receivers" like utilities; “Mixed” = targeted limits balancing health, cost, and feasibility. Positions come from each official’s record; the Stance Library has the full spread.',
          people: [
            { id: 'shaheen', name: 'Jeanne Shaheen', office: 'U.S. Senator · New Hampshire', icon: '💧', stance: 'supported', posText: 'A leading Senate voice on PFAS, Shaheen has pushed drinking-water limits, cleanup at contaminated military sites, and testing and treatment funding for affected communities.', source: { label: 'shaheen.senate.gov', url: 'https://www.shaheen.senate.gov/' }, verdict: { cls: 'consistent', label: 'On record' } },
            { id: 'blumenthal', name: 'Richard Blumenthal', office: 'U.S. Senator · Connecticut', icon: '⚖️', topic: 'PFAS & Consumer Safety', stance: 'supported' },
            { id: 'markey', name: 'Ed Markey', office: 'U.S. Senator · Massachusetts', icon: '🌎', topic: 'PFAS & Chemical Regulation', stance: 'supported' },
            { id: 'whitehouse', name: 'Sheldon Whitehouse', office: 'Senate EPW Ranking Member · Rhode Island', icon: '🌊', topic: 'Polluter Accountability', stance: 'supported' },
            { id: 'booker', name: 'Cory Booker', office: 'U.S. Senator · New Jersey', icon: '🥦', topic: 'Cleanup & Environmental Justice', stance: 'supported' },
            { id: 'capito', name: 'Shelley Moore Capito', office: 'Senate EPW Chair · West Virginia', icon: '🏔', topic: 'Cleanup Funding vs. Liability', stance: 'mixed' },
            { id: 'roger_marshall', name: 'Roger Marshall', office: 'U.S. Senator · Kansas · Physician', icon: '🩺', topic: 'Rural Water & Cost', stance: 'mixed' },
            { id: 'zeldin', name: 'Lee Zeldin', office: 'EPA Administrator', icon: '🌫', topic: 'Cost & Feasibility', stance: 'opposed' }
          ]
        }
      }`;

let html = fs.readFileSync(INDEX, 'utf8');
const anchor = '\n    };\n    window.PDX_ISSUE_SPOTLIGHTS = SPOTLIGHTS;';
const comboKey = "'pesticides-pfas-chemical-safety-2026': {";
const alreadyDone = html.includes("'pfas-forever-chemicals-2026': {");
const comboLink = "          { label: 'Pesticides, PFAS & Chemical Safety', slug: 'pesticides-pfas-chemical-safety-2026' },";

console.log('  combined card present:', html.includes(comboKey));
console.log('  new cards already present:', alreadyDone);
console.log('  combo related-issue links found:', (html.split(comboLink).length - 1));

if (!APPLY) { console.log('\nDry run. Re-run with --apply.'); process.exit(0); }
if (alreadyDone) { console.log('  · already split — no change'); process.exit(0); }

// 1) Repoint the three related-issue links (scoped by container spotlight).
function repoint(containerSlug, replacement) {
  const ci = html.indexOf(`'${containerSlug}': {`);
  if (ci < 0) { console.log('  ✗ container not found:', containerSlug); return; }
  const li = html.indexOf(comboLink, ci);
  if (li < 0) { console.log('  ✗ combo link not found in', containerSlug); return; }
  html = html.slice(0, li) + replacement + html.slice(li + comboLink.length);
  console.log('  ✎ repointed link in', containerSlug);
}
repoint('food-security-farming-future-2026', "          { label: 'Pesticides: Liability & Regulation', slug: 'pesticides-liability-regulation-2026' },");
repoint('water-security-western-scarcity-2026', "          { label: 'PFAS “Forever Chemicals”', slug: 'pfas-forever-chemicals-2026' },");
repoint('maha-food-system-additives-2026', "          { label: 'Pesticides: Liability & Regulation', slug: 'pesticides-liability-regulation-2026' },\n          { label: 'PFAS “Forever Chemicals”', slug: 'pfas-forever-chemicals-2026' },");

// 2) Remove the combined card and insert the two new cards in its place.
const combMarker = ',\n      // ── Policy-explainer Spotlight (national · environmental health + chemicals) ──';
const rmStart = html.indexOf(combMarker);
const rmEnd = html.indexOf(anchor);
if (rmStart < 0 || rmEnd < 0 || rmStart > rmEnd) { console.error('✗ removal boundaries not found'); process.exit(1); }
html = html.slice(0, rmStart) + ',\n' + BLOCK + html.slice(rmEnd);
fs.writeFileSync(INDEX, html);
console.log('  ✎ retired combined card; inserted 2 detailed cards (pesticides, pfas)');
