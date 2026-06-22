#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 Issue-Position backfill & connection pass
//
// A focused pass that strengthens the "Stance at a Glance" section and the
// Connected Evidence view for CURRENT SITTING UTAH STATE LEGISLATORS. It does
// NOT invent stances: every position below is authored from a piece of evidence
// the site already records — a Spotlight item that carries an `issueKey` for
// which the legislator had no matching curated stance yet. In almost every case
// the Spotlight item is a bill the legislator personally chief-sponsored (most
// signed into law), with the official le.utah.gov bill record as the source.
//
// HOW THE SCOPE WAS CHOSEN (see /tmp analysis, reproduced from the live roster):
//   • 91 current sitting Utah legislators were read from the live `politicians`
//     roster and classified the same way the site classifies them.
//   • For each, the curated ISSUE_STANCE_DATA list (resolved through the exact
//     same id → alias → name-slug chain the site uses) was compared against the
//     issueKeys carried by their Spotlight evidence.
//   • A "connection gap" is a Spotlight issueKey with NO curated stance. Those
//     gaps are real dangling evidence dots: the receipt exists but no stance row
//     ties to it, so the issue never appears in Stance at a Glance.
//
// HONESTY FILTERS APPLIED (CONTENT_STYLE.md — individual-focused, no party
// framing; quality over quantity; be transparent with thin records):
//   • Legislators already at 8+ curated positions were left as-is — they are
//     not "thin", and padding rich profiles dilutes rather than helps.
//   • Gaps where the Spotlight's issueKey did NOT actually match the bill's
//     content were dropped rather than forced (e.g. a federalism resolution
//     keyed to "Balance the Budget", a special-license-plate bill keyed to
//     "Invest in Public Services", a teen-driver-permit bill keyed to roads &
//     bridges). Those legislators keep their honest narrower coverage.
//   • Each position's text states only what the bill actually did; enacted vs.
//     introduced-but-not-passed is stated plainly; regulatory measures that
//     constrain rather than expand a policy are marked issueStance:'mixed'.
//
//   node scripts/connect-issue-positions-jun2026.mjs --apply   # patch index.html
//   node scripts/connect-issue-positions-jun2026.mjs           # dry-run report
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const FILE = 'index.html';
const le = n => ({ label: 'le.utah.gov', url: `https://le.utah.gov/~${n}` });

// stanceKey → positions to ADD (keyed to the ISSUE_STANCE_DATA key the site
// already resolves the legislator to). Comments name the source bill.
const DATA = {
  // ── Sen. Wayne Harper (Dist. 16) ─────────────────────────────────────────
  wayne_harper: [
    { topic:'First-Time Homebuyers', icon:'🔑', pos:'support', issueKey:'housing_first_time', issueStance:'support',
      text:'Chief-sponsored the First Home Investment Zone Amendments, clarifying owner-occupancy rules and how homes count toward density in a first-home investment zone to encourage starter-home ownership.',
      evidence:'Sponsored S.B. 23 (2025), signed into law.', source:le('2025/bills/static/SB0023.html') },
    { topic:'Election Law & Ballot Security', icon:'🗳', pos:'support', issueKey:'election_integrity', issueStance:'support',
      text:'Carried a measure adding ballot chain-of-custody and storage rules, an audit of signature comparisons, poll-watcher access to signature verification, and a way for voters to track their ballot.',
      evidence:'Sponsored S.B. 164 (2025), signed into law.', source:le('2025/bills/static/SB0164.html') },
    { topic:'Child Welfare', icon:'🍼', pos:'support', issueKey:'family_support', issueStance:'support',
      text:'Sponsored child-welfare changes covering how a child in state custody can obtain a driver license, the evidence a juvenile court hears at a shelter hearing, and when reunification services are weighed.',
      evidence:'Sponsored S.B. 177 (2025), signed into law.', source:le('2025/bills/static/SB0177.html') },
    { topic:'Property & HOA Rights', icon:'🏡', pos:'support', issueKey:'property_rights', issueStance:'support',
      text:'Sponsored real-estate changes limiting how often an HOA can charge an owner a rental fee, giving owners a way to contest it, and protecting an owner’s right to convert a grass park strip to water-efficient landscaping.',
      evidence:'Sponsored S.B. 201 (2025), signed into law.', source:le('2025/bills/static/SB0201.html') },
    { topic:'Public-Safety Communications', icon:'👮', pos:'support', issueKey:'back_police', issueStance:'support',
      text:'Carried a measure requiring a statewide computer-aided dispatch system by 2029 and revising 911 emergency-service funding and audit rules to strengthen public-safety response.',
      evidence:'Sponsored S.B. 237 (2025), signed into law.', source:le('2025/bills/static/SB0237.html') },
  ],
  // ── Sen. Lincoln Fillmore ────────────────────────────────────────────────
  lincoln_fillmore: [
    { topic:'Property-Tax Recovery', icon:'🏡', pos:'support', issueKey:'property_tax', issueStance:'support',
      text:'Sponsored a property-tax measure letting heavy-equipment rental businesses recover the property taxes they pay through an itemized, non-taxable recovery fee, while barring the fee on government entities.',
      evidence:'Sponsored S.B. 13 (2025), signed into law.', source:le('2025/bills/static/SB0013.html') },
    { topic:'Phone-Free Classrooms', icon:'🍎', pos:'support', issueKey:'public_schools', issueStance:'support',
      text:'Sponsored a measure barring students from using a cellphone, smart watch, or similar device during classroom hours, while letting schools set their own exemptions.',
      evidence:'Sponsored S.B. 178 (2025), signed into law.', source:le('2025/bills/static/SB0178.html') },
    { topic:'Health-Care Platforms', icon:'🏥', pos:'support', issueKey:'healthcare', issueStance:'support',
      text:'Sponsored a measure creating a state registration program for health-care-services platforms, with operating standards and authority for the licensing division to act on violations.',
      evidence:'Sponsored S.B. 228 (2025), signed into law.', source:le('2025/bills/static/SB0228.html') },
    { topic:'Municipal Broadband Rules', icon:'📶', pos:'mixed', issueKey:'broadband', issueStance:'mixed',
      text:'Sponsored municipal-broadband rules setting the bonding, reporting, and public-disclosure requirements a city must meet to offer broadband service.',
      evidence:'Sponsored S.B. 165 (2025), signed into law.', source:le('2025/bills/static/SB0165.html') },
    { topic:'Childhood Independence', icon:'🧒', pos:'support', issueKey:'family_support', issueStance:'support',
      text:'Sponsored a resolution encouraging free play and independent-activity programs in schools to help build student independence.',
      evidence:'Sponsored S.C.R. 2 (2025), adopted and signed.', source:le('2025/bills/static/SCR002.html') },
  ],
  // ── Sen. Calvin Musselman ────────────────────────────────────────────────
  cmusselman: [
    { topic:'Construction & Clean Water', icon:'💧', pos:'support', issueKey:'enviro_balance', issueStance:'support',
      text:'Sponsored standards for how the state regulates and inspects stormwater-runoff controls at construction sites, with penalties for violations.',
      evidence:'Sponsored S.B. 220 (2025), signed into law.', source:le('2025/bills/static/SB0220.html') },
    { topic:'Penalties for Repeat Crime', icon:'👮', pos:'support', issueKey:'back_police', issueStance:'support',
      text:'Sponsored a measure requiring a mandatory jail sentence for certain repeat drug and theft offenses committed under specified conditions.',
      evidence:'Sponsored S.B. 90 (2025), signed into law.', source:le('2025/bills/static/SB0090.html') },
    { topic:'Local Boundaries & Land Use', icon:'🤠', pos:'support', issueKey:'lands_local', issueStance:'support',
      text:'Sponsored a measure modifying the definitions and processes local governments use to adjust municipal and county boundaries and land-use actions.',
      evidence:'Sponsored S.B. 104 (2025), signed into law.', source:le('2025/bills/static/SB0104.html') },
  ],
  // ── Rep. Ariel Defay ─────────────────────────────────────────────────────
  ariel_defay: [
    { topic:'Motorcycle & Road Safety', icon:'🚆', pos:'support', issueKey:'transit', issueStance:'support',
      text:'Sponsored a motorcycle-safety measure raising the fine for riding without an endorsement while requiring courts to waive the increase if the rider gets the endorsement within 30 days.',
      evidence:'Sponsored H.B. 234 (2025), signed into law.', source:le('2025/bills/static/HB0234.html') },
    { topic:'Dental Care Access', icon:'🏥', pos:'support', issueKey:'healthcare', issueStance:'support',
      text:'Sponsored a measure updating dental-practice supervision rules and expanding teledentistry so patients can reach dental care more flexibly.',
      evidence:'Sponsored H.B. 372 (2025), signed into law.', source:le('2025/bills/static/HB0372.html') },
    { topic:'Protecting Minors', icon:'⚖️', pos:'support', issueKey:'justice_balance', issueStance:'support',
      text:'Sponsored a measure amending the crime of enticing a minor and refining the factors a court weighs in sentencing young offenders for registrable offenses.',
      evidence:'Sponsored H.B. 197 (2025), signed into law.', source:le('2025/bills/static/HB0197.html') },
  ],
  // ── Rep. David Shallenberger (Dist. 58) ──────────────────────────────────
  david_shallenberger: [
    { topic:'Recreation & Land Access', icon:'⚖️', pos:'support', issueKey:'lands_balance', issueStance:'support',
      text:'Sponsored a measure adding activities to the "recreational purpose" definition in the landowner-liability statute, expanding access for outdoor recreation on private land.',
      evidence:'Sponsored H.B. 98 (2025), signed into law.', source:le('2025/bills/static/HB0098.html') },
    { topic:'Emergency Communications', icon:'👮', pos:'support', issueKey:'back_police', issueStance:'support',
      text:'Sponsored a measure updating Utah’s emergency-communications governance, including how public-safety answering points qualify for and receive funding.',
      evidence:'Sponsored H.B. 150 (2025), signed into law.', source:le('2025/bills/static/HB0150.html') },
    { topic:'Renters & Deposits', icon:'🏘', pos:'support', issueKey:'housing_support', issueStance:'support',
      text:'Sponsored a landlord-tenant measure letting deposits and itemized-deduction notices be returned electronically and clarifying the renter’s request form and timelines.',
      evidence:'Sponsored H.B. 480 (2025), signed into law.', source:le('2025/bills/static/HB0480.html') },
  ],
  // ── Rep. Jason Thompson (Dist. 3) ────────────────────────────────────────
  jason_thompson: [
    { topic:'Overdose Recognition', icon:'🏥', pos:'support', issueKey:'healthcare', issueStance:'support',
      text:'Sponsored a measure directing the state to create overdose-recognition training and add it to alcohol-education seminars.',
      evidence:'Sponsored H.B. 361 (2025), signed into law.', source:le('2025/bills/static/HB0361.html') },
    { topic:'Employer Child Care', icon:'🧸', pos:'support', issueKey:'family_support', issueStance:'support',
      text:'Backed a tax credit for employer-provided child care to ease costs for working parents.',
      evidence:'Introduced H.B. 389 (2025); did not pass before adjournment.', source:le('2025/bills/static/HB0389.html') },
  ],
  // ── Rep. Lisa Shepherd (Dist. 61) ────────────────────────────────────────
  lisa_shepherd: [
    { topic:'Candidate Disclosure', icon:'🔍', pos:'support', issueKey:'gov_transparency', issueStance:'support',
      text:'Sponsored a measure requiring candidates for county, municipal, and special-district office to file a conflict-of-interest disclosure when they declare candidacy.',
      evidence:'Sponsored H.B. 504 (2025), signed into law.', source:le('2025/bills/static/HB0504.html') },
  ],
  // ── Rep. Rex Shipp ───────────────────────────────────────────────────────
  rshipp: [
    { topic:'Firearm Safety in Schools', icon:'🍎', pos:'support', issueKey:'public_schools', issueStance:'support',
      text:'Sponsored a measure directing schools to offer firearm-safety instruction to students, with instructor guidelines and a family opt-out.',
      evidence:'Sponsored H.B. 104 (2025), signed into law.', source:le('2025/bills/static/HB0104.html') },
    { topic:'Adoption', icon:'🍼', pos:'support', issueKey:'family_support', issueStance:'support',
      text:'Sponsored a measure creating exceptions to the preplacement adoptive-evaluation requirement in certain adoptions.',
      evidence:'Sponsored H.B. 141 (2025), signed into law.', source:le('2025/bills/static/HB0141.html') },
  ],
  // ── Rep. Bridger Bolinder ────────────────────────────────────────────────
  bridger_bolinder: [
    { topic:'Nuclear-Waste Classification', icon:'⚡', pos:'support', issueKey:'enviro_energy', issueStance:'support',
      text:'Sponsored a measure modifying the statutory definitions of high-level nuclear waste and low-level radioactive waste.',
      evidence:'Sponsored H.B. 254 (2025), signed into law.', source:le('2025/bills/static/HB0254.html') },
  ],
  // ── Rep. Jefferson Burton ────────────────────────────────────────────────
  jburton: [
    { topic:'Veterans & Military Families', icon:'🎖', pos:'support', issueKey:'veterans', issueStance:'support',
      text:'A retired National Guard major general who sponsored a measure expanding resident-tuition eligibility for veterans using their benefits and affirming the state’s duty to deliver veterans’ service benefits.',
      evidence:'Sponsored H.B. 122 (2025), signed into law.', source:le('2025/bills/static/HB0122.html') },
    { topic:'Corrections Drug Enforcement', icon:'⚖️', pos:'support', issueKey:'justice_balance', issueStance:'support',
      text:'Sponsored a measure directing the Department of Corrections to stand up a drug-abuse and trafficking unit and coordinate with law enforcement.',
      evidence:'Sponsored H.B. 323 (2025), signed into law.', source:le('2025/bills/static/HB0323.html') },
  ],
  // ── Rep. Jill Koford (Dist. 10) ──────────────────────────────────────────
  jill_koford: [
    { topic:'School Property-Tax Certification', icon:'🏡', pos:'mixed', issueKey:'property_tax', issueStance:'mixed',
      text:'Sponsored a measure requiring the minimum basic school tax rate to be certified by consensus among state fiscal offices and letting a stabilization account cover certain school-funding shortfalls.',
      evidence:'Sponsored H.B. 428 (2025), signed into law.', source:le('2025/bills/static/HB0428.html') },
  ],
  // ── Rep. Joseph Elison (Dist. 72) ────────────────────────────────────────
  joseph_elison: [
    { topic:'Online-Education Accountability', icon:'🍎', pos:'support', issueKey:'public_schools', issueStance:'support',
      text:'Sponsored a measure authorizing audits of online courses, expanding performance reporting for online providers, and requiring a provider report card.',
      evidence:'Sponsored H.B. 246 (2025), signed into law.', source:le('2025/bills/static/HB0246.html') },
  ],
  // ── Rep. Sahara Hayes (Dist. 32) ─────────────────────────────────────────
  sahara_hayes: [
    { topic:'Student Attendance', icon:'🍎', pos:'support', issueKey:'public_schools', issueStance:'support',
      text:'Backed a chronic-absenteeism pilot pairing schools with a savings-plan incentive to improve attendance, with protections for individual student records.',
      evidence:'Introduced H.B. 206 (2025); did not pass before adjournment.', source:le('2025/bills/static/HB0206.html') },
    { topic:'Political-Ad Disclosure', icon:'🗳', pos:'support', issueKey:'election_integrity', issueStance:'support',
      text:'Backed making clear that election advertising rules cover social-media platforms, with fines for certain violations.',
      evidence:'Introduced H.B. 335 (2025); did not pass before adjournment.', source:le('2025/bills/static/HB0335.html') },
  ],
  // ── Rep. Ashlee Matthews ─────────────────────────────────────────────────
  ashlee_matthews: [
    { topic:'Pollinator Habitat', icon:'🐝', pos:'support', issueKey:'enviro_balance', issueStance:'support',
      text:'Sponsored the measure that repealed the sunset on Utah’s pollinator-habitat program and made it permanent.',
      evidence:'Sponsored H.B. 251 (2025), signed into law.', source:le('2025/bills/static/HB0251.html') },
    { topic:'Student Transportation', icon:'🚆', pos:'support', issueKey:'transit', issueStance:'support',
      text:'Sponsored a measure amending student eligibility for state-supported school transportation.',
      evidence:'Sponsored H.B. 161 (2025), signed into law.', source:le('2025/bills/static/HB0161.html') },
  ],
  // ── Sen. Don Ipson ───────────────────────────────────────────────────────
  don_ipson: [
    { topic:'Hunger Relief', icon:'🍼', pos:'support', issueKey:'family_support', issueStance:'support',
      text:'Sponsored a measure creating the Statewide Hunger Relief Fund and letting taxpayers contribute through their income-tax return to support the Utah Food Bank.',
      evidence:'Sponsored S.B. 151 (2025), signed into law.', source:le('2025/bills/static/SB0151.html') },
  ],
  // ── Sen. Dan McCay ───────────────────────────────────────────────────────
  daniel_mccay: [
    { topic:'Campaign-Finance Integrity', icon:'🗳', pos:'support', issueKey:'election_integrity', issueStance:'support',
      text:'Sponsored a measure making it a crime to make a federal campaign contribution intended to influence or reward a state official for an official action.',
      evidence:'Sponsored S.B. 18 (2025), signed into law.', source:le('2025/bills/static/SB0018.html') },
  ],
  // ── Rep. Doug Welton (Dist. 65) ──────────────────────────────────────────
  doug_welton: [
    { topic:'Agriculture Accountability', icon:'🌾', pos:'support', issueKey:'rural_ag', issueStance:'support',
      text:'Sponsored a measure requiring an annual accountant’s review of a Department of Agriculture account holding marketing-order proceeds.',
      evidence:'Sponsored H.B. 346 (2025), signed into law.', source:le('2025/bills/static/HB0346.html') },
    { topic:'Glass Recycling', icon:'⚖️', pos:'support', issueKey:'enviro_balance', issueStance:'support',
      text:'Sponsored a measure directing the state to study how to increase glass recycling and report recommendations to lawmakers.',
      evidence:'Sponsored H.B. 177 (2025), signed into law.', source:le('2025/bills/static/HB0177.html') },
  ],
  // ── Sen. Evan Vickers ────────────────────────────────────────────────────
  evan_vickers: [
    { topic:'Water-Rights Recording', icon:'💧', pos:'support', issueKey:'water', issueStance:'support',
      text:'Sponsored a measure allowing certain water-rights signatures to be made by facsimile or electronic means, modernizing water-rights recording.',
      evidence:'Sponsored S.B. 33 (2025), signed into law.', source:le('2025/bills/static/SB0033.html') },
    { topic:'Medical Cannabis', icon:'🏥', pos:'support', issueKey:'healthcare', issueStance:'support',
      text:'A pharmacist who sponsored a measure updating medical-cannabis surveillance rules and the licensing of medical-cannabis couriers.',
      evidence:'Sponsored S.B. 64 (2025), signed into law.', source:le('2025/bills/static/SB0064.html') },
  ],
  // ── Sen. Jennifer Plumb ──────────────────────────────────────────────────
  jennifer_plumb: [
    { topic:'Public-Safety Animals', icon:'👮', pos:'support', issueKey:'back_police', issueStance:'support',
      text:'A physician who sponsored a measure expanding the criminal protections for police service canines to other animals used by public-safety organizations.',
      evidence:'Sponsored S.B. 77 (2025), signed into law.', source:le('2025/bills/static/SB0077.html') },
    { topic:'DNA Processing', icon:'⚖️', pos:'support', issueKey:'justice_balance', issueStance:'support',
      text:'Sponsored a measure clarifying when a DNA specimen taken at booking may be processed, including 60 days after an arrest warrant issues in certain cases.',
      evidence:'Sponsored S.B. 140 (2025), signed into law.', source:le('2025/bills/static/SB0140.html') },
  ],
  // ── Rep. Kristen Chevrier (Dist. 54) ─────────────────────────────────────
  kristen_chevrier: [
    { topic:'Food Assistance', icon:'🍼', pos:'support', issueKey:'family_support', issueStance:'support',
      text:'Sponsored a measure directing the state to seek a federal waiver on the use of SNAP benefits for certain foods, with a deadline to submit and implement it.',
      evidence:'Sponsored H.B. 403 (2025), signed into law.', source:le('2025/bills/static/HB0403.html') },
    { topic:'License-Plate Reader Privacy', icon:'🔒', pos:'support', issueKey:'privacy_rights', issueStance:'support',
      text:'Backed setting authorized uses, retention limits, and data-security standards for automatic license-plate-reader systems used by government.',
      evidence:'Introduced H.B. 468 (2025); did not pass before adjournment.', source:le('2025/bills/static/HB0468.html') },
  ],
  // ── Rep. Nicholeen Peck (Dist. 28) ───────────────────────────────────────
  nicholeen_p_peck: [
    { topic:'School Curriculum & Abortion Providers', icon:'🕊', pos:'support', issueKey:'pro_life', issueStance:'support',
      text:'Sponsored a measure barring entities that perform elective abortions from providing health-related instruction or materials in public schools.',
      evidence:'Sponsored H.B. 233 (2025), signed into law.', source:le('2025/bills/static/HB0233.html') },
    { topic:'Juvenile Justice', icon:'⚖️', pos:'support', issueKey:'justice_balance', issueStance:'support',
      text:'Backed changes to how school-ground offenses by students are reported and to minors’ eligibility for nonjudicial adjustment and expungement.',
      evidence:'Introduced H.B. 359 (2025); did not pass before adjournment.', source:le('2025/bills/static/HB0359.html') },
  ],
  // ── Rep. Paul Cutler (Dist. 18) ──────────────────────────────────────────
  paul_a_cutler: [
    { topic:'Dangerous-Substance Scheduling', icon:'🧠', pos:'support', issueKey:'health_mental', issueStance:'support',
      text:'Sponsored a measure adding tianeptine and phenibut to the Schedule I controlled-substances list to curb their misuse.',
      evidence:'Sponsored H.B. 173 (2025), signed into law.', source:le('2025/bills/static/HB0173.html') },
    { topic:'Therapy Licensing', icon:'🏥', pos:'support', issueKey:'healthcare', issueStance:'support',
      text:'Sponsored a measure moving dry-needling into licensing and clarifying that physical and occupational therapy include the practice.',
      evidence:'Sponsored H.B. 188 (2025), signed into law.', source:le('2025/bills/static/HB0188.html') },
  ],
  // ── Rep. Scott Chew ──────────────────────────────────────────────────────
  scott_chew: [
    { topic:'Rural Outdoor Recreation', icon:'🤠', pos:'support', issueKey:'lands_local', issueStance:'support',
      text:'Sponsored a measure letting the state award upfront cash grants for off-highway-vehicle and recreation projects in smaller rural counties.',
      evidence:'Sponsored H.B. 439 (2025), signed into law.', source:le('2025/bills/static/HB0439.html') },
    { topic:'Trailer Registration Relief', icon:'💰', pos:'support', issueKey:'lower_taxes', issueStance:'support',
      text:'Sponsored a measure letting owners register certain trailers for the life of the trailer with a one-time fee in lieu of the annual tax.',
      evidence:'Sponsored H.B. 166 (2025), signed into law.', source:le('2025/bills/static/HB0166.html') },
  ],
  // ── Sen. Scott Sandall ───────────────────────────────────────────────────
  scott_sandall: [
    { topic:'Open-Range Ranching', icon:'🌾', pos:'support', issueKey:'rural_ag', issueStance:'support',
      text:'Sponsored a measure creating a rebuttable presumption in a highway collision between a driver and open-range livestock, protecting ranchers in open-range country.',
      evidence:'Sponsored S.B. 113 (2025), signed into law.', source:le('2025/bills/static/SB0113.html') },
    { topic:'Community Libraries', icon:'🏛', pos:'support', issueKey:'gov_services', issueStance:'support',
      text:'Sponsored a measure creating a Community Library Enhancement Fund grant program and a Utah Women’s History Initiative and updating the State Library’s duties.',
      evidence:'Sponsored S.B. 161 (2025), signed into law.', source:le('2025/bills/static/SB0161.html') },
  ],
  // ── Rep. Stephanie Gricius ───────────────────────────────────────────────
  stephanie_gricius: [
    { topic:'Foster Children & Parents', icon:'🍼', pos:'support', issueKey:'family_support', issueStance:'support',
      text:'Sponsored a measure addressing bedroom-sharing rules for foster children and barring child-welfare officials from withholding certain information from a child’s parent or guardian.',
      evidence:'Sponsored H.B. 283 (2025), signed into law.', source:le('2025/bills/static/HB0283.html') },
    { topic:'Sex-Designated Student Housing', icon:'⚖️', pos:'support', issueKey:'rights_balance', issueStance:'support',
      text:'Sponsored a measure directing the Board of Higher Education to provide guidance on sex-designated student housing at degree-granting institutions.',
      evidence:'Sponsored H.B. 269 (2025), signed into law.', source:le('2025/bills/static/HB0269.html') },
  ],
  // ── Rep. Tracy Miller ────────────────────────────────────────────────────
  tracy_miller: [
    { topic:'Teacher Pay & Literacy', icon:'🍎', pos:'support', issueKey:'public_schools', issueStance:'support',
      text:'Sponsored a public-education measure letting schools with carry-forward balances add to teacher salary supplements and adjusting early-literacy and kindergarten-enrollment rules.',
      evidence:'Sponsored H.B. 76 (2025), signed into law.', source:le('2025/bills/static/HB0076.html') },
    { topic:'Online School Enrollment', icon:'🎓', pos:'support', issueKey:'school_choice', issueStance:'support',
      text:'Sponsored a measure modifying the payments school districts make when a student enrolls in online courses across district lines.',
      evidence:'Sponsored H.B. 268 (2025), signed into law.', source:le('2025/bills/static/HB0268.html') },
  ],
  // ── Rep. Troy Shelley ────────────────────────────────────────────────────
  troy_shelley: [
    { topic:'Wildfire Enforcement', icon:'🔥', pos:'support', issueKey:'disaster_resilience', issueStance:'support',
      text:'Sponsored a measure giving the Division of Forestry, Fire, and State Lands enforcement and investigatory powers over wildland fires and heritage trees.',
      evidence:'Sponsored H.B. 496 (2026), signed into law.', source:le('2026/bills/static/HB0496.html') },
    { topic:'State Energy Assets', icon:'⛏', pos:'support', issueKey:'lands_energy', issueStance:'support',
      text:'Sponsored a measure declaring environmental commodities created with state funds to be state property in proportion to the funds contributed and assigning duties for managing them.',
      evidence:'Sponsored H.B. 411 (2025), signed into law.', source:le('2025/bills/static/HB0411.html') },
  ],
  // ── Rep. Andrew Stoddard ─────────────────────────────────────────────────
  andrew_stoddard: [
    { topic:'Air Quality & Emissions', icon:'⚖️', pos:'support', issueKey:'enviro_balance', issueStance:'support',
      text:'Sponsored a measure requiring the state to complete a best-available-control-technology plan for major halogen-emission sources and report annually on those emissions.',
      evidence:'Sponsored H.B. 420 (2025), signed into law.', source:le('2025/bills/static/HB0420.html') },
  ],
  // ── Rep. Candice Pierucci ────────────────────────────────────────────────
  candice_pierucci: [
    { topic:'Foreign-Lobbying Disclosure', icon:'🔍', pos:'support', issueKey:'gov_transparency', issueStance:'support',
      text:'Sponsored a transparency measure requiring people who lobby on behalf of foreign governments to register as lobbyists in Utah.',
      evidence:'Sponsored H.B. 90 (2022), signed into law.', source:le('2022/bills/static/HB0090.html') },
    { topic:'Maternal & Infant Health', icon:'🏥', pos:'support', issueKey:'healthcare', issueStance:'support',
      text:'Sponsored a measure requiring correctional facilities to screen newly admitted women for pregnancy and updating the postnatal and early-childhood advisory board.',
      evidence:'Sponsored H.B. 363 (2025), signed into law.', source:le('2025/bills/static/HB0363.html') },
  ],
  // ── Rep. Carl Albrecht ───────────────────────────────────────────────────
  calbrecht: [
    { topic:'Private-Land Big Game', icon:'⚖️', pos:'support', issueKey:'lands_balance', issueStance:'support',
      text:'Sponsored a measure setting the criteria and procedures for a private-landowner hunting-permit draw and the handling of vouchers.',
      evidence:'Sponsored H.B. 202 (2025), signed into law.', source:le('2025/bills/static/HB0202.html') },
  ],
  // ── Rep. Hoang Nguyen (Dist. 23) ─────────────────────────────────────────
  hoang_nguyen: [
    { topic:'Emergency Medical Services', icon:'🏥', pos:'support', issueKey:'healthcare', issueStance:'support',
      text:'Sponsored a measure giving the state EMS bureau enforcement authority and directing a recommended annual schedule of fines for the emergency-medical system.',
      evidence:'Sponsored H.B. 391 (2025), signed into law.', source:le('2025/bills/static/HB0391.html') },
  ],
  // ── Rep. Karen M. Peterson (Dist. 13) ────────────────────────────────────
  karen_m_peterson: [
    { topic:'Higher-Ed Reinvestment', icon:'🎓', pos:'support', issueKey:'edu_college_cost', issueStance:'support',
      text:'Sponsored a measure requiring reporting and a study of higher-education strategic-reinvestment funds and how they are disbursed and reallocated at degree-granting institutions.',
      evidence:'Sponsored H.B. 265 (2025), signed into law.', source:le('2025/bills/static/HB0265.html') },
  ],
  // ── Rep. Melissa Ballard ─────────────────────────────────────────────────
  mballard: [
    { topic:'Government Efficiency', icon:'🧹', pos:'support', issueKey:'gov_waste', issueStance:'support',
      text:'Sponsored a measure directing the state budget office to identify, reward, and measure cost- and time-saving efficiency improvements by agencies and employees.',
      evidence:'Sponsored H.B. 317 (2025), signed into law.', source:le('2025/bills/static/HB0317.html') },
  ],
  // ── Rep. Norm Thurston ───────────────────────────────────────────────────
  nthurston: [
    { topic:'Health Workforce', icon:'🏥', pos:'support', issueKey:'healthcare', issueStance:'support',
      text:'Sponsored the Utah Health Workforce Act, creating a workforce advisory council to bring interested groups together on health-workforce policy.',
      evidence:'Sponsored H.B. 176 (2022), signed into law.', source:le('2022/bills/static/HB0176.html') },
  ],
  // ── Sen. Ann Millner ─────────────────────────────────────────────────────
  ann_millner: [
    { topic:'Military-Family Licensing', icon:'🛠', pos:'support', issueKey:'econ_workers', issueStance:'support',
      text:'Sponsored a measure granting license reciprocity and in-state tuition to certain Department of Defense civilian employees and their families relocating to Utah.',
      evidence:'Sponsored S.B. 17 (2025), signed into law.', source:le('2025/bills/static/SB0017.html') },
  ],
  // ── Rep. Calvin Roberts ──────────────────────────────────────────────────
  calvin_roberts: [
    { topic:'Transit Procurement', icon:'🚆', pos:'support', issueKey:'transit', issueStance:'support',
      text:'Sponsored a measure letting the transportation department use cooperative purchasing agreements to procure transit vehicles.',
      evidence:'Sponsored H.B. 471 (2025), signed into law.', source:le('2025/bills/static/HB0471.html') },
  ],
  // ── Rep. Jake Sawyer (Dist. 9) ───────────────────────────────────────────
  jake_sawyer: [
    { topic:'State-Park Road Access', icon:'🚧', pos:'support', issueKey:'infrastructure', issueStance:'support',
      text:'Sponsored a measure adding statutory descriptions of the highways serving certain state parks so those access routes are formally recognized.',
      evidence:'Sponsored H.B. 345 (2025), signed into law.', source:le('2025/bills/static/HB0345.html') },
  ],
  // ── Sen. Jerry Stevenson ─────────────────────────────────────────────────
  jerry_stevenson: [
    { topic:'Sporting-Venue Development', icon:'📈', pos:'support', issueKey:'econ_growth', issueStance:'support',
      text:'Sponsored a measure setting how a city or county can create a major sporting-event venue zone that captures local tax increment around a venue.',
      evidence:'Sponsored S.B. 333 (2025), signed into law.', source:le('2025/bills/static/SB0333.html') },
  ],
  // ── Sen. Nate Blouin ─────────────────────────────────────────────────────
  nate_blouin: [
    { topic:'Renewable-Energy Permitting', icon:'⚡', pos:'support', issueKey:'enviro_energy', issueStance:'support',
      text:'Has publicly backed lowering permitting barriers, such as fairer permit fees, to help new renewable-energy projects get built.',
      source:{ label:'X — @NateForUtah', url:'https://x.com/NateForUtah/status/1534562192783159297' } },
  ],
  // ── Rep. Ryan Wilcox (Dist. 7) ───────────────────────────────────────────
  ryan_d_wilcox: [
    { topic:'Repeat-Offense Sentencing', icon:'⚖️', pos:'support', issueKey:'justice_balance', issueStance:'support',
      text:'Sponsored a measure broadening certain theft, retail-theft, and prostitution sentencing enhancements and counting prior out-of-state convictions.',
      evidence:'Sponsored H.B. 38 (2025), signed into law.', source:le('2025/bills/static/HB0038.html') },
  ],
  // ── Rep. Steve Eliason ───────────────────────────────────────────────────
  steve_eliason: [
    { topic:'Impaired-Driving Data', icon:'👮', pos:'support', issueKey:'back_police', issueStance:'support',
      text:'Sponsored a measure requiring detailed DUI crash and arrest data in the state’s annual DUI report to sharpen impaired-driving enforcement.',
      evidence:'Sponsored H.B. 436 (2025), signed into law.', source:le('2025/bills/static/HB0436.html') },
  ],
  // ── Rep. Thomas Peterson ─────────────────────────────────────────────────
  thomas_peterson: [
    { topic:'Building-Inspector Standards', icon:'🏗', pos:'support', issueKey:'housing_build', issueStance:'support',
      text:'Sponsored a measure establishing minimum licensing standards for building inspectors, supporting quality and consistency in new construction.',
      evidence:'Sponsored H.B. 58 (2025), signed into law.', source:le('2025/bills/static/HB0058.html') },
  ],
  // ── Rep. Trevor Lee (Dist. 16) ───────────────────────────────────────────
  trevor_lee: [
    { topic:'Education-Employee Privacy', icon:'🔒', pos:'support', issueKey:'privacy_rights', issueStance:'support',
      text:'Sponsored a measure restricting how schools sell or transfer employees’ contact information without consent and creating an employee complaint process.',
      evidence:'Sponsored H.B. 124 (2025), signed into law.', source:le('2025/bills/static/HB0124.html') },
  ],
  // ── Rep. Casey Snider ────────────────────────────────────────────────────
  casey_snider: [
    { topic:'County-Seat Public Safety', icon:'👮', pos:'support', issueKey:'back_police', issueStance:'support',
      text:'Sponsored a measure requiring the police agency of a first-class county’s seat of government to enter a public-safety interagency agreement with the state.',
      evidence:'Sponsored H.B. 465 (2025), signed into law.', source:le('2025/bills/static/HB0465.html') },
  ],
  // ── Rep. Doug Owens (Dist. 33) ───────────────────────────────────────────
  doug_owens: [
    { topic:'Child Performers', icon:'🍼', pos:'support', issueKey:'family_support', issueStance:'support',
      text:'Sponsored a measure requiring a trust to protect the earnings of a minor in entertainment, including children featured by content creators.',
      evidence:'Sponsored H.B. 322 (2025), signed into law.', source:le('2025/bills/static/HB0322.html') },
  ],
  // ── Rep. Jennifer Dailey-Provost ─────────────────────────────────────────
  jennifer_dailey_provost: [
    { topic:'Local Food Supply', icon:'🌾', pos:'support', issueKey:'rural_ag', issueStance:'support',
      text:'Sponsored a measure defining "local food supply" and directing the state to study barriers to increasing the availability of locally produced food.',
      evidence:'Sponsored H.B. 510 (2025), signed into law.', source:le('2025/bills/static/HB0510.html') },
  ],
  // ── Rep. Katy Hall (Dist. 11) ────────────────────────────────────────────
  katy_hall: [
    { topic:'Public-Education Compliance', icon:'🍎', pos:'support', issueKey:'public_schools', issueStance:'support',
      text:'Sponsored a measure directing the state school board to handle noncompliance and educator-conduct complaints through an existing framework and to publish certain board-meeting information online.',
      evidence:'Sponsored H.B. 497 (2025), signed into law.', source:le('2025/bills/static/HB0497.html') },
  ],
  // ── Sen. Mike McKell ─────────────────────────────────────────────────────
  mike_mckell: [
    { topic:'Family-Law Arbitration', icon:'🍼', pos:'support', issueKey:'family_support', issueStance:'support',
      text:'Sponsored the Uniform Family Law Arbitration Act, setting the scope and requirements for arbitration in family-law disputes.',
      evidence:'Sponsored S.B. 117 (2025), signed into law.', source:le('2025/bills/static/SB0117.html') },
  ],
  // ── Rep. Nelson Abbott (Dist. 57) ────────────────────────────────────────
  nelson_abbott: [
    { topic:'Guardianship Due Process', icon:'⚖️', pos:'support', issueKey:'justice_balance', issueStance:'support',
      text:'Sponsored a measure preserving the right to counsel for an allegedly incapacitated person and updating the rights of individuals under guardianship.',
      evidence:'Sponsored H.B. 334 (2025), signed into law.', source:le('2025/bills/static/HB0334.html') },
  ],
};

// ── index.html literal emitter ───────────────────────────────────────────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function fmt(c) {
  const parts = [
    `topic:'${esc(c.topic)}'`, `icon:'${c.icon}'`, `pos:'${c.pos}'`,
    `issueKey:'${c.issueKey}'`, `issueStance:'${c.issueStance}'`, `text:'${esc(c.text)}'`,
  ];
  if (c.evidence) parts.push(`evidence:'${esc(c.evidence)}'`);
  if (c.source) parts.push(`source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'}`);
  return `      { ${parts.join(', ')} },`;
}

// Find the ISSUE_STANCE_DATA object bounds so key matching stays scoped to it.
function stanceBounds(src) {
  const marker = 'var ISSUE_STANCE_DATA = {';
  const start = src.indexOf(marker);
  if (start < 0) throw new Error('ISSUE_STANCE_DATA not found');
  let i = start + marker.length - 1, depth = 0, inStr = false, q = '', escd = false;
  for (; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (inStr) { if (escd) escd = false; else if (c === '\\') escd = true; else if (c === q) inStr = false; continue; }
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = true; q = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return [start, i]; }
  }
  throw new Error('ISSUE_STANCE_DATA end not found');
}

// Locate `<key>: [` at 4-space indent within ISSUE_STANCE_DATA and return the
// index of its matching closing `]` (string/comment aware).
function arrayClose(src, lo, hi, key) {
  const needle = `\n    ${key}: [`;
  const at = src.indexOf(needle, lo);
  if (at < 0 || at > hi) return -1;
  let i = at + needle.length - 1, depth = 0, inStr = false, q = '', escd = false; // at '['
  for (; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (inStr) { if (escd) escd = false; else if (c === '\\') escd = true; else if (c === q) inStr = false; continue; }
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = true; q = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

// ── Main ─────────────────────────────────────────────────────────────────────
let profiles = 0, positions = 0, bill = 0, src = 0;
for (const cards of Object.values(DATA)) {
  profiles++; positions += cards.length;
  bill += cards.filter(c => c.evidence).length;
  src += cards.filter(c => c.source).length;
}
console.log(`Authored ${positions} positions across ${profiles} legislators (${bill} bill-backed, ${src} with a source link).`);

if (APPLY) {
  let html = readFileSync(FILE, 'utf8');
  const [lo, hi] = stanceBounds(html);
  // Insert from the bottom up so earlier offsets stay valid.
  const targets = Object.entries(DATA)
    .map(([key, cards]) => ({ key, cards, close: arrayClose(html, lo, hi, key) }))
    .sort((a, b) => b.close - a.close);

  let applied = 0, addedPos = 0;
  for (const t of targets) {
    if (t.close < 0) { console.log(`  ✗ ${t.key}: array not found — skipped`); continue; }
    // Find start of the line holding the closing ']' to insert above it.
    let lineStart = t.close;
    while (lineStart > 0 && html[lineStart - 1] !== '\n') lineStart--;
    const block = t.cards.map(fmt).join('\n') + '\n';
    html = html.slice(0, lineStart) + block + html.slice(lineStart);
    applied++; addedPos += t.cards.length;
    console.log(`  ✎ ${t.key}: +${t.cards.length}`);
  }
  writeFileSync(FILE, html);
  console.log(`\nApplied ${addedPos} positions to ${applied}/${profiles} legislators in ${FILE}.`);
} else {
  console.log('Dry run. Re-run with --apply to patch index.html.');
}
