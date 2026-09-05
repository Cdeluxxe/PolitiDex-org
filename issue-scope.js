/* ════════════════════════════════════════════════════════════════════════════
   PolitiDex — THE ISSUE KEY, EXPLAINED  ·  window.PDXIssueScope
   ════════════════════════════════════════════════════════════════════════════

   WHAT THIS IS. A reader on a profile is shown "🦺 Stronger Gun Safety Laws —
   Mostly advances · 7 advanced · 0 against" and has no way to find out what that
   title covers. Does it include suppressor deregulation? Does a vote on
   trafficking enforcement land here or under gun rights? What did "advanced"
   mean on this particular issue? Every one of those answers has been written
   down for years — in the source comments over ISSUE_MAP, where the scope of each
   key was argued out and then locked — and none of it was ever on a page. This
   module is that prose, transcribed, and one small control that opens it.

   WHAT IT IS NOT, AND THIS IS THE WHOLE DESIGN CONSTRAINT.

   1. IT IS NOT GENERATED COPY. Every sentence below is transcribed from the
      shipped comment block over the key it describes in alignment-tool.js, or is
      the key's own ISSUE_MAP `label` / `chip`. Nothing here was written to fill a
      slot. A key whose scope was never argued out in a comment has NO entry, and
      the reader is told exactly that — "No definition on file yet" — because a
      plausible-sounding scope note invented for a key the ingest classifier does
      not actually follow is worse than a blank: it is a rule the product does not
      obey, printed as though it did.

      THE SECOND PLACE A SCOPE IS ARGUED, ADDED SEPTEMBER 2026. Some keys were
      never given a comment over ISSUE_MAP and had their boundary argued out
      instead in the per-mapping rationales in consistency.js — the `did` / `why`
      / `more` lines a reader already opens on the measure row. That is the same
      authority by wall item 2's own words ("the argument still lives at the
      mapping site, and where the two could disagree the mapping wins"), so an
      entry may be transcribed from it, under one extra condition: the rationales
      have to argue a BOUNDARY and not just a filing. A single measure's `why`
      says why THAT act landed on the key; it does not say where the key ends, and
      printing it as though it did would be wall item 1's failure in a new place.
      An entry sourced this way names its rows in a comment above it, so the next
      editor can check the copy against the argument without hunting for it.

   2. IT IS NOT A SECOND DEFINITION. The prose is a copy of the argument, but the
      argument still lives at the mapping site, and where the two could disagree
      the mapping wins. That is why the entries are excerpts of scope and polarity
      only — what is IN, what is OUT and which way "advanced" points — and never
      restate a floor, a tier, a threshold or a count. If a scope narrows in
      alignment-tool.js, this file is wrong until it is edited, and the test suite
      pins the keys it covers so that edit cannot be silently skipped.

   3. IT MAKES NO CLAIM ABOUT A PERSON. Nothing in here reads a pid, a record, a
      vote or a stance. It answers "what does this issue key mean", which is the
      same answer for every politician on the site, and it is mounted next to the
      record rather than inside it for exactly that reason. No score, no
      percentage, no party frame, no lean — `lean` is in ISSUE_MAP and is
      deliberately not read here; it is branding-disambiguation data for
      word-action.js and printing it would turn a scope note into a party label.

   THE POLARITY LINE, AND WHY IT IS ONE SENTENCE RATHER THAN A TABLE. stance-helpers.js
   already settled this and its wall over _RD_NO_POLE states the rule: the ISSUE_MAP
   label is itself a curated directional proposition ("✂️ Cut Federal Red Tape",
   "🛢 Expand Domestic Energy Production"), so "5 advanced it" resolves against the
   heading the reader just read, and a second gloss table would be a second place
   for the polarity of an issue to be stated — and therefore a place for it to
   disagree. So the poled keys get the rule, once, pointing at the title above it;
   only the keys whose shipped comment spells out its own polarity carry that
   sentence too, in the comment's own words.

   AND THE KEYS WITH NO POLE AT ALL. The `*_balance` family and the thirteen
   subject keys in _RD_NO_POLE name a subject or a contested authority rather than
   a proposition, and the pattern engine is required to refuse them. Those keys say
   so here instead of borrowing a direction word — the same refusal, in the reader's
   words rather than the engine's.
   ════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXIssueScope) return; // idempotent

  // ── THE LOCKED TABLE ────────────────────────────────────────────────────────
  // One entry per key whose scope was argued out and locked in a comment over
  // ISSUE_MAP. Fields, all optional and all excerpts:
  //   inn   what the key covers
  //   out   what it deliberately does not, and which cousin key holds it instead
  //   pole  what a vote counted as "advanced" did, where the comment states it
  //   note  the one thing about the key a reader would otherwise get wrong
  // A key absent from this table is not an error and must not be filled in from
  // the label. See wall item 1.
  var SCOPE = {
    gov_regulation: {
      inn: 'How many federal rules there are, what they cost to comply with, and the process by which they are written and repealed: Congressional Review Act disapprovals, REINS-style congressional approval of major rules, regulatory budgets, caps and sunset clauses, cost-benefit and paperwork requirements, and how much deference agencies get in writing rules at all.',
      out: 'What a particular rule should SAY. A claim that one sector needs tighter or looser rules belongs to that sector’s key — antitrust and consumer finance, data and platform duties, digital assets. Also out: federal environmental review of projects (Faster Permits & Reviews), personnel classification, headcount and telework, and preemption fights over whether a STATE may set its own rule where a federal one exists — that is a question about who decides, not about how heavy the rulebook is.',
      pole: 'Advanced = fewer and cheaper federal rules, and more procedural hurdles before new ones take effect. Against = defends federal rulemaking capacity and the existing stock of rules.',
      note: 'Narrowed in August 2026. It used to absorb anything with the word “regulation” in it, and both of its directions meant two opposite things at once.'
    },
    sound_money: {
      inn: 'What the treasury may HOLD and what the state will ACCEPT as payment — precious-metals reserves, remitting tax in gold, legal-tender and money-management statutes.',
      out: 'Digital assets and a central bank digital currency (Cryptocurrency Rules & Digital Dollar) — filing a gold-remittance statute there would move a member’s Bitcoin percentage on a vote about bullion. Also out: auditing the Fed, income and severance tax rates, and the national debt.',
      pole: 'Every instrument on file widens the role of specie; none narrows it. Advanced = the vote widened it.'
    },
    tobacco_nicotine: {
      inn: 'The rules on selling tobacco and nicotine products — what may be sold (flavour bans, nicotine caps, market-authorization requirements), who may sell it (permits, permit fees, a product registry), and what happens when they sell it anyway (retailer and criminal penalties).',
      out: 'Government mandates on a person’s own medical care (Medical Freedom) — a flavour ban is a product-market rule, not a mandate on a patient. Also out: mental health and the opioid crisis, coverage and price, and cannabis.',
      pole: 'Every instrument on file tightens; none loosens. Advanced = the vote tightened the rules.'
    },
    dev_district_finance: {
      inn: 'The special-purpose district and its money: draw a boundary, seat a board, and let it capture sales-tax and property-tax increment — or levy its own, or issue bonds — to pay for a stadium, a convention centre, a resort zone or a project area.',
      out: 'Federal business deregulation, which is the opposite posture — a tax-increment district is a targeted public subsidy, not a rollback. Also out: what a household pays in property tax (a district levy is a new taxing body, and filing it there would read as “voted for property tax relief”), housing supply, and the built infrastructure itself rather than the district that finances it.',
      pole: 'Every instrument on file creates or widens the mechanism; none contracts it. Advanced = the vote created or widened a capture district.'
    },
    permitting_reform: {
      inn: 'How long a federal review of a PROJECT takes and who may challenge it: the scope of environmental review, statutory page and deadline limits on it, lead-agency and one-federal-decision consolidation, and the window in which a completed permit may be sued over.',
      out: 'Whether the project itself is a good idea (energy production, climate action, infrastructure); local zoning and housing approvals; occupational licensing and small-business paperwork; and the size of the federal rulebook generally (Cut Federal Red Tape).',
      pole: 'Advanced = narrower review and firm deadlines. Against = keeps the current scope of review and the ability to challenge a permit.',
      note: 'Split out of Cut Federal Red Tape in August 2026, and it has a genuine cross-party stance coalition — the tell that it is a real axis and not a synonym.'
    },
    america_first_fp: {
      inn: 'What the United States funds and commits to abroad: foreign aid levels and conditions, funding for a specific partner or conflict, assessed contributions to multilateral bodies, and the wind-down of an open-ended commitment.',
      out: 'Whether CONGRESS must authorise the use of force — that is a claim about who decides, and it is held by members on both sides of the aid question. Also out: whether to intervene at all (Diplomacy & Restraint), countering China and military posture toward adversaries, and aid to Israel specifically, which has carried its own key since July 2026.',
      pole: 'Advanced = cut, condition or wind down U.S. funding and commitments abroad. Against = keeps or increases them.',
      note: 'Narrowed in August 2026. The old chip bundled three unrelated claims, so two members who hold their positions fully each read as half-contradicting them.'
    },
    israel_support: {
      inn: 'U.S. support for Israel itself — security assistance, weapons transfers and co-development, sanctions on its adversaries, and floor attempts to cut, block or condition that support.',
      out: 'Domestic antisemitism measures: those are civil-rights and campus-speech questions and belong to the rights and free-speech keys.',
      pole: 'Advanced = the vote favoured continued U.S. backing for Israel. A share under this key means “this share of their judged votes favoured that backing” — not “this share agreed with a process”.',
      note: 'Carries no party lean on purpose: both the pro-Israel coalition and its critics are cross-party, so coding it D or R would be false signal.'
    },
    election_security: {
      inn: 'Safeguards on who votes and how ballots are handled: eligibility verification (documentary proof of citizenship, ID), voter-roll maintenance, ballot chain-of-custody and handling rules, post-election audits and audit conditions on election funding, and enforcement against fraud or non-citizen voting.',
      out: 'Campaign finance, redistricting, certification of results and Electoral Count Act questions — those are not administration of the ballot.',
      pole: 'The title states the pro-safeguard direction, so advanced = the vote favoured tighter verification and ballot-handling safeguards.',
      note: 'One of two independent facets. A record can be pro-safeguard and pro-access at once, oppose both, or split them — nothing in the scoring couples this key to Expand Voting Access.'
    },
    voting_access: {
      inn: 'How easy it is to register and to cast a ballot — registration ease, early voting, mail ballots and drop boxes.',
      pole: 'The title states the pro-access direction, so advanced = the vote backed easier registration and more ways to cast a ballot; against = backed narrowing them.',
      note: 'The other half of the election-administration pair, scored independently of Election Security & Ballot Safeguards.'
    },
    gun_rights: {
      inn: 'The scope of the individual right to acquire, keep and carry: concealed and constitutional carry, interstate reciprocity, carry on federal land, protections against registry, purchase-tracking and licensing burdens, and category bans on commonly-owned firearms or magazines.',
      out: 'Screening, removal and storage rules aimed at misuse, which are the other facet (Stronger Gun Safety Laws). Suppressor deregulation and ATF-rule repeal touch this key alone.',
      pole: 'The title states the pro-rights direction, so a share here means “this share of their judged votes widened, or refused to narrow, the right”.',
      note: 'Firearms policy is two facets, not one axis, and they are scored independently — a record can advance both, oppose both, or one of each. A percentage under one says nothing about the other.'
    },
    gun_safety: {
      inn: 'Screening, removal and storage rules aimed at misuse: background-check expansion, red-flag and extreme-risk orders, assault-style and high-capacity-magazine restrictions, safe-storage requirements, and trafficking and straw-purchase enforcement.',
      out: 'The scope of the right to acquire, keep and carry, which is the other facet (Protect Gun Rights). Trafficking-enforcement funding and safe-storage grants touch this key alone.',
      pole: 'The title states the pro-regulation direction, so a share here means “this share of their judged votes tightened rules aimed at misuse”.',
      note: 'The two gun facets are not mirror images. Where a package genuinely does both in opposite directions — the 2022 Bipartisan Safer Communities Act, which expanded background checks while writing a no-registry guarantee into law — it is mapped to both facets rather than forced into one verdict.'
    },
    gun_balance: {
      inn: 'A composite position: keep legal gun ownership but require universal background checks and red-flag laws.',
      note: 'Not a facet, and deliberately not scored as one. It asserts a position on both gun axes at once, which is the thing the two-facet split exists to avoid, so it is a legacy middle key for the members whose stated position really is that blend. Its cards count toward neither facet’s coverage.'
    },
    states_federal_power: {
      inn: 'The preemption question only: when federal and state authority reach the same subject, whose rule governs. State AI and privacy laws, the California vehicle waiver, a state bank charter, state insurance and hemp rules, western water, who runs the schools.',
      out: 'Whether a state may sue or enforce against the federal government (States Suing Washington) and who commands the Guard or may direct state officers (Who Commands the National Guard). Both were filed here and both are separate questions — a member can want the state’s rule to govern and still oppose giving state attorneys general a new cause of action. Also out: transferring federal LAND decisions to states and counties, which has its own key.',
      note: 'Narrowed in August 2026 to the preemption question alone — it previously answered three different questions at once. The title is worded directionally on purpose: an even-handed “draw a clear line” wording would read as agreement with a process that both preemption hawks and federalism absolutists endorse.'
    },
    civil_service_control: {
      inn: 'One mechanism: the legal classification of executive-branch employees — which positions sit in the competitive service, which are excepted from it, and what removal and adverse-action protections attach to them. An instrument that creates, restores, expands or restricts an at-will, excepted or policy-influencing personnel CATEGORY, or changes the civil-service protections attached to one.',
      out: 'Agency reorganisations with no classification core; headcount cuts and reductions in force, which are about how many people work there rather than what protections the ones who remain hold; hiring-process reform, including probationary periods; federal-sector collective bargaining and union time, which are labour relations under a different chapter; and “drain the swamp” rhetoric with no formal mechanism behind it.',
      note: 'The title is worded as the direction that expands presidential control — reclassifying career policy jobs out of the competitive service and its removal procedures — because the alternative wording would read as agreement with a process both sides of the question endorse.'
    },
    checks_balances: {
      inn: 'The general posture only — that Congress and the courts remain a real check on executive power, whoever is president.',
      out: 'Anything with a named mechanism, which belongs to one of the five mechanism keys: war powers, court orders on the executive, the power of the purse, congressional oversight, and states suing Washington.',
      note: 'It has no roll-call mappings and is expected to keep none: a general-posture claim cannot be settled by any single vote.'
    },
    war_powers: {
      inn: 'Whether a vote of Congress is required before U.S. forces are committed to hostilities — war-powers resolutions, force authorisations, and the privileged resolutions that force the question.',
      out: 'Whether to intervene at all (Diplomacy & Restraint). Members hold the two independently: several who want the U.S. out of a conflict on the merits also vote against the war-powers resolution, and several institutionalists want the vote taken and would then vote yes.'
    },
    judicial_check: {
      inn: 'The reach of a court’s order against the executive branch — nationwide and universal injunctions, contempt, equitable relief, judge-shopping rules.',
      out: 'The ethics and tenure of justices (Supreme Court Reform).'
    },
    power_of_purse: {
      inn: 'Whether the executive must spend what Congress appropriated — impoundment, pocket rescissions, apportionment, funding freezes, reprogramming and transfer authority.'
    },
    congress_oversight: {
      inn: 'Compelling answers FROM the executive branch — subpoenas, document requests, testimony, executive privilege, contempt, inspectors general and notification requirements.',
      out: 'Disclosure BY members — financial disclosure, stock trading and ethics rules — which is Transparency & Anti-Corruption.'
    },
    state_standing: {
      inn: 'Whether states may take the federal government to court over federal enforcement choices that hit them — standing, causes of action, injunctive relief, mandamus.',
      out: 'Whose rule governs where federal and state law meet (Whose Rule Governs) and who commands the Guard.'
    },
    guard_authority: {
      inn: 'Who commands the National Guard — title 32 and title 10 status, federalisation, governor consent, the Insurrection Act, and directing state officers.',
      out: 'Whose rule governs where federal and state law meet, and whether a state may sue the federal government.'
    },
    prop_tax: {
      inn: 'Property taxes as a tax-policy question — relief and caps.',
      note: 'Property taxes are intentionally keyed in two places. This one frames them as tax policy; Lower Property Taxes (Housing) frames the same taxes as a housing-affordability question. Both feed the same cost-of-living bundle, and the two are not accidental duplicates.'
    },
    property_tax: {
      inn: 'Property taxes as a housing-affordability question — caps that let families and seniors afford to stay in their homes.',
      note: 'The housing-side half of a deliberate pair; Property Tax Relief frames the same taxes as tax policy.'
    },
    property_rights: {
      inn: 'What a government may do to a parcel its owner holds — take it, or forbid a use of it: eminent domain and condemnation, regulatory takings, the owner’s right to exclude, and local land use regulation aimed at what an owner may do with their own dwelling.',
      out: 'Whether enough housing gets built (Build More Housing) and whether it is affordable (Housing Affordability, Affordable Housing & Renters) — those keys read the same zoning bills for supply and price, not for the owner. Also out: who owns the federal estate, water rights as a farm and ranch interest, and property tax.',
      pole: 'Advanced = the vote strengthened an owner’s hand against the government. Against = it strengthened the government’s.',
      note: 'A vote can be filed against this key rather than left out: short-term-rental licensing and delisting rules are restrictions on what an owner may do with their own dwelling, and a reader who cares about property rights is entitled to see that vote read the other way.'
    },
    national_debt: {
      inn: 'The fiscal total — the deficit and the debt taken as a whole: budget resolutions, debt-limit measures, rescissions, and the net fiscal direction of a package.',
      out: 'Which line to cut (Cut Federal Spending & Reduce Debt is the programme-cut chip, Audit Spending & the Fed the waste-and-audit one), which tax to change, the balanced-budget framing, and what the money buys.',
      pole: 'Advanced = the vote reduced the deficit. Against = it increased it. Neither direction says anything about whether the underlying programme was worth having; that argument belongs to the programme’s own key.',
      note: 'Read off the enacted or reported text and nothing else. Where a bill summary lists programmes without a topline figure, no slice is filed at all rather than asserting one.'
    },
    border_security: {
      inn: 'Enforcement capacity at and behind the line — agents and support personnel, port-of-entry inspection equipment, surveillance technology, biometric entry and exit, detention, and the state and local cooperation that feeds the federal system.',
      out: 'Mandatory removal itself, which is its own chip (Mass Deportations & Border Security). A bill that does both carries a slice on each with different weights, so neither chip reads as the whole bill. Also out: drug and cartel interdiction, visas and work-based admission, earned status for the long-settled, and criminal sentencing generally.',
      pole: 'Advanced = the vote added enforcement capacity or tightened it.',
      note: 'Enforcement severity without capacity — raising the penalty for illegal entry and reentry — is recorded as a secondary and weighted below the funding bills on purpose: it adds no barrier, no agent, no detention bed and no removal authority.'
    },
    immig_fentanyl: {
      inn: 'The drug itself and the organisations that move it: sanctions and anti-money-laundering measures against opioid traffickers, scheduling of fentanyl-related substances, and the narcotics-interdiction share of a border appropriation.',
      out: 'General border staffing and barriers (Strong Border & Enforcement) — an interdiction line inside a border bill is filed here as a secondary slice while the capacity line is filed there, so neither reads as the whole bill. Also out: treatment and the overdose crisis as a health question, drug sentencing in the criminal code, and cannabis.',
      pole: 'Advanced = the vote added sanctions, scheduling or interdiction against fentanyl trafficking. Every instrument on file runs that way; none loosens.'
    },
    deportations: {
      inn: 'Mandatory custody and removal — who the executive must detain and place in removal proceedings, and the money that carries removal out.',
      out: 'Capacity at the line itself: agents, barriers, inspection equipment (Strong Border & Enforcement). The two chips overlap by design on a bill that does both, and a slice is filed on each rather than picking one. Also out: fentanyl and cartel measures, legal admission, and earned status.',
      pole: 'Advanced = the vote widened mandatory detention or removal, or funded it. Every instrument on file runs that way.'
    },
    school_choice: {
      inn: 'Public money spent on schooling outside the district system, and the regulatory room a non-district provider gets: scholarship and voucher accounts spendable at a private school or provider, charter and microschool authorisation, and course-level choice funded outside the district formula.',
      out: 'What the district system is paid (Invest in Public Schools) — the two are scored independently and a record may advance both. Also out: the blended position, who decides what a child is taught (Parental Rights in Schools), and college and trade cost.',
      pole: 'Advanced = the vote created, widened or entrenched a publicly funded option outside the district system, or reduced the regulation of one.',
      note: 'A bill that funds nothing and creates no alternative — one that only removes paperwork — is filed as a secondary to say exactly that.'
    },
    public_schools: {
      inn: 'The money and staffing of the district system — funding formulas, teacher compensation and supplements, levy protection, and duties the state imposes on and resources through local education agencies.',
      out: 'Money that follows a student out of the district (School Choice & Education Freedom), the blended position, curriculum and parental consent, college cost, and school safety as a firearms question.',
      pole: 'Advanced = the vote funded, staffed or protected the district system. Against = it withdrew a funding protection.',
      note: 'A cut is not dressed as a reform: phasing out hold harmless on voted and board levies is filed against this key, because hold harmless is what protects a district’s levy revenue when enrolment or valuation falls. Scrutiny of a programme is not coded as a cut — a review bill that reduces no funding line is filed as secondary support.'
    },
    edu_parental: {
      inn: 'The parent’s decision rights over their own child’s schooling: consent and notice requirements, the right to inspect or object to instructional material, opt-out rights, and moving the decision to homeschool closer to the parent and further from state review.',
      out: 'How the district system is funded (Invest in Public Schools) and money that follows a student out of it (School Choice & Education Freedom) — a microschool facility bill is filed here only as a secondary slice, because its text is about occupancy codes rather than parental authority. Also out: what the curriculum should say as a rights or speech question.',
      pole: 'Advanced = the vote enlarged what a parent may see, consent to or refuse.',
      note: 'A bill that only amends a curriculum list, granting no parental right and changing no consent requirement, is filed as secondary and low-weight to say exactly that.'
    },
    healthcare: {
      inn: 'Whether covered care actually reaches the patient — who is eligible, what is covered, and the plan procedures between the two: eligibility and benefit expansions, telehealth payment parity, preauthorization deadlines and disclosure, and continuity protections on an established prescription.',
      out: 'Price and household cost, the market-competition posture, the blended position, mental health and addiction, rural facilities, mandates on a person’s own care, and the safety net read as a spending question.',
      pole: 'Advanced = the vote widened eligibility or coverage, or removed a procedural barrier to covered care. Against = it contracted them.',
      note: 'A statutory enrolment freeze and payment-rate suspension triggered by a defined Medicaid shortfall is filed against this key, because a mandatory freeze is a coverage contraction written into statute ahead of time.'
    },
    econ_smallbiz: {
      inn: 'The fixed cost of being small — the licence, the permit, the paperwork and the credit line: small-business regulatory budgets, channels for reporting burdensome rules, access to capital, and cheaper routes into a licensed trade.',
      out: 'The size of the federal rulebook generally (Cut Federal Red Tape) and project-level environmental review (Faster Permits & Reviews) — both name occupational licensing and small-business paperwork as out of their own scope, and this is the key they name. Also out: business tax rates and the growth posture, worker-side rules, and large-firm accountability.',
      pole: 'Advanced = the vote lowered the licensing, permitting, paperwork or capital cost a small business carries.'
    },
    transit: {
      inn: 'Moving people without a car, and the money that pays for it: revenue opened to transit capital and service grants, ridership and expenditure accountability, station-area and connectivity planning, transit passes, and protection for a bicycle lane.',
      out: 'Roads, bridges, water systems and the grid; housing supply and the affordability terms inside a housing and transit reinvestment zone — a transit-zone bill whose amendments are about housing terms is filed here only as a secondary slice; the district that captures the tax increment; and vehicle emission rules.',
      pole: 'Advanced = the vote funded, protected or expanded non-car mobility.',
      note: 'A bill that funds nothing and builds nothing sits at the narrow-link floor rather than reading as a service expansion.'
    },
    water: {
      inn: 'The demand side of the water problem — how much is used, by whom, and at what price: landscaping and turf rules on public property, irrigation restrictions, water-efficient landscaping incentives and grants, conservation-based and tiered retail rates, agency water-use reporting and smart controllers, conservation outreach, and a consumption fee that funds water infrastructure.',
      out: 'The supply side — reservoirs, pipelines, recycling and new storage capacity (Water Storage & Infrastructure); drinking-water and wastewater systems as public works (Rebuild Roads & Bridges); a data centre’s cooling water and agricultural water purchases, which have their own guardrail key; and farm and ranch water rights. A vote to build water supply is not a vote to use less of it, and filing one here would print it as a conservation record.',
      pole: 'Advanced = the vote reduced, priced or measured water use. Against = it removed a conservation requirement or its funding.',
      note: 'Every instrument on file is a conservation measure and none runs the other way, so the direction is never the question — the size of the measure is. A conservation outreach or messaging bill sits at the narrow-link floor.'
    },
    climate_action: {
      inn: 'Programmes, subsidies and rules that cut emissions, and their repeal: clean-energy credits, electrification rebates, zero-emission sales mandates and the waivers behind them, international climate finance, state renewable credits and assessments, and emission-reducing equipment credits and procurement.',
      out: 'How much conventional supply there is (Expand Domestic Energy Production) and the all-of-the-above framing. Also out: water conservation, public lands, and how long a project review takes.',
      pole: 'Advanced = the vote created or funded an emissions-reducing programme. Against = it repealed, defunded or taxed one.',
      note: 'A vehicle zero-emission waiver resolution is filed on this key and on Expand Domestic Energy Production in opposite directions on purpose: a yea removed a limit on conventional vehicle sales and rolled back a state climate rule, and both are true of the same vote.'
    },
    energy_production: {
      inn: 'How much conventional supply and firm generating capacity exists, and how hard it is to retire: leasing and reopened acreage, pipeline authorisation, emergency authorities to expedite production, dispatchable-resource state policy, cost recovery for in-state generation, and the determinations required before an existing plant may close.',
      out: 'Emissions programmes and clean-energy subsidies (Climate Action & Clean Energy), the all-of-the-above framing, who owns the land it happens on, how long the federal review takes (Faster Permits & Reviews), and a data centre’s own power and ratepayer guardrails.',
      pole: 'Advanced = the vote expanded conventional supply or kept generation online. Against = it withdrew an authority or an asset from production.',
      note: 'The mirror is enforced: terminating an energy emergency is filed against this key for exactly the authorities the declaration itself is filed as advancing.'
    },
    // ── lands_energy ───────────────────────────────────────────────────────
    // TRANSCRIBED FROM THE MAPPING SITE, same admission as lands_preserve above
    // and the other half of the same mirror. This key has no comment over
    // ISSUE_MAP either; the boundary is argued in consistency.js, in the
    // rationales for 'H.R. 1|119|lands_energy', 'H.J.Res. 131|119|lands_energy',
    // 'H.J.Res. 140|119|lands_energy', 'H.R. 1366|119|lands_energy' and
    // 'H.R. 4090|119|lands_energy', which state the subject in the same words
    // five times ("developing resources on federal land", "mining on the federal
    // estate is the whole of what this chip covers"), state the support direction
    // outright, and name the cousin key that reads the same acreage decision from
    // the other side. No weight, no acreage and no roll count is carried across.
    lands_energy: {
      inn: 'Developing resources on the federal estate: leasing availability on federal acreage, acreage reopened to oil and gas leasing and exploration, royalty rates on it, hardrock mining and the ground a claimant may occupy to work a claim, and a duty on the department holding a mining permit to act on it.',
      out: 'The same acreage decision read for the protection it removes, which is the conservation key — one act, two rows, running opposite ways on purpose. Also out: nullifying an agency rule as a mechanism, which is the red-tape key’s subject wherever striking the rule is the controlling act; how much conventional supply and firm generating capacity exists, which is Expand Domestic Energy Production and takes no view on who owns the ground; and who owns and may transfer the federal estate.',
      pole: 'Advanced = a yea that opened federal acreage to extraction or widened what may be worked on it. Against = a yea that closed or withheld it.',
      note: 'A leasing-availability decision is this key’s question in its most direct form; where the instrument acts on a protection order instead, the development gain is a consequence of striking it rather than the act itself, and the mappings say so in writing.'
    },
    // ── lands_preserve ─────────────────────────────────────────────────────
    // TRANSCRIBED FROM THE MAPPING SITE, NOT FROM A COMMENT OVER ISSUE_MAP: this
    // key has none. The argument is in consistency.js, in the rationales for
    // 'H.J.Res. 78|119|lands_preserve', 'H.J.Res. 131|119|lands_preserve' and
    // 'H.J.Res. 140|119|lands_preserve', which between them state the support
    // direction in as many words, name the cousin key that reads the same acres
    // from the other side, and give the reason a whole category of measure is
    // filed here. Every clause below is a quotation or a close paraphrase of one
    // of those three rows. No weight, no acreage figure and no roll count is
    // carried across — see wall item 2.
    lands_preserve: {
      inn: 'Federal protection kept in place over wild country, and the instruments that remove one: a conservation withdrawal holding acreage back from leasing and exploration, a public land order withdrawing forest land from mineral and geothermal leasing to protect a watershed, an Endangered Species Act listing rule.',
      out: 'The same acres read for what they are opened TO — acreage returned to mineral, geothermal or oil and gas leasing is read on the resource-development key, where the same yea runs the other way, and a reader who thinks one of the two rows must be wrong is reading a mirror pair working as intended. Also out: nullifying an agency rule as a mechanism, which is the red-tape key’s own subject wherever striking the rule is the instrument’s controlling act; emissions programmes and clean-energy subsidies, which name public lands as out of their own scope and point here; and who OWNS and may transfer or manage the federal estate — Keep Public Lands Public, the balance key and local control are three further questions about the public estate, and each keeps its own key, its own chip and its own census.',
      pole: 'Advanced = a federal land or conservation protection kept in place. Against = a yea that strips one — a withdrawal nullified, a listing rule struck.',
      note: 'Wildlife, endangered-species, wilderness and watershed measures are all filed here, and the mappings say why in writing: the issue vocabulary carries no dedicated key for any of them.'
    },
    housing: {
      inn: 'Affordability as the whole subject — the cost of building and the cost of buying taken together, which is where a bill lands when its own general provisions name housing affordability generally as the subject: density traded for requirements, moderate income housing plans and reporting, parking-requirement limits, ownership-promotion zones, and state housing finance instruments.',
      out: 'Supply mechanics alone (Build More Housing) and subsidy and renter protection alone (Affordable Housing & Renters) — a bill that does two of the three carries a slice on each with different weights rather than one slice here. Also out: the household price basket, property tax, first purchase specifically, homelessness, the owner’s hand against government, and the district that finances a project.',
      pole: 'Advanced = the vote lowered the cost to build or to buy.',
      note: 'A maintenance bill that keeps an existing instrument workable is weighted deliberately low, to say that keeping a zone workable is a smaller thing than creating it.'
    },
    housing_build: {
      inn: 'Supply mechanics — the regulatory and approval barriers between a parcel and a finished unit: accessory dwelling unit rules and limits on local authority to restrict them, subdivision review and approval, parking-requirement caps, and reporting penalties on a local government that stalls.',
      out: 'Subsidy, tax credits and renter protection (Affordable Housing & Renters), and affordability as a whole (Housing Affordability). Also out: federal environmental review of projects (Faster Permits & Reviews), which names local zoning and housing approvals as out of its own scope and points here; and the owner’s side of the same zoning bill (Private Property Rights).',
      pole: 'Advanced = the vote reduced what a project must satisfy before it may be built, or paid for units to be built.',
      note: 'A bill reaching one requirement and nothing else — parking, and nothing else — is filed as a secondary to say so.'
    },
    housing_support: {
      inn: 'Public money for below-market housing, and the renter’s position in the landlord-tenant code: low-income housing tax credits, housing loan and preservation funds, agency authority to fund income-targeted housing, and notice, termination and increase-freeze duties owed to a tenant.',
      out: 'Making it cheaper or easier to build (Build More Housing) and affordability as a whole (Housing Affordability) — a bill carrying both a subsidy provision and a construction provision is filed on each with different weights. Also out: shelter and services, first purchase, and property tax.',
      pole: 'Advanced = the vote funded below-market housing or added a renter protection.',
      note: 'A housing clause attached as a condition on a transportation tax is a secondary, because the condition is not the programme.'
    },
    tough_on_crime: {
      inn: 'Criminal exposure and time served — what is an offence, at what level, and how long a person or a case stays in the system: offence elements, offence levels, mandatory minimums, sentencing enhancements, and juvenile adjustment and expungement eligibility.',
      out: 'Funding and backing law enforcement itself (Back Law Enforcement), the accountability pairing, sentencing reform in the other direction (Criminal Justice Reform), cannabis, immigration detention and removal, and fentanyl trafficking sanctions.',
      pole: 'Advanced = the vote increased exposure to punishment or time in custody. Every instrument on file runs that way.',
      note: 'A single enhancement for one class of victim sits at the narrow-link floor: the link is real, the measure is narrow.'
    },
    religious_liberty: {
      inn: 'Room for religious exercise and conscience inside a public institution: employment conscience protections and accommodation, recognition for belief-based student organisations that require adherence to their own standards, chaplains, religiously grounded non-participation, prayer and devotional provisions, and observance in public employment.',
      out: 'Equal-treatment law and the balance position, and recognition and anti-discrimination protection (Protect LGBTQ+ Rights) — the two are scored independently and a bill touching both carries a slice on each. Also out: speech and platform censorship, diversity mandates, abortion, and parental consent as a schooling right.',
      pole: 'Advanced = the vote widened protection for religious exercise or conscience. Every instrument on file runs that way.',
      note: 'A single clause sitting beside provisions on another subject is filed as a secondary rather than as the bill’s meaning.'
    },
    lgbtq_rights: {
      inn: 'Legal recognition and protection on the basis of sexual orientation and gender identity: transition-related care and coverage, custody and housing assignment, pronoun and affirmation duties, participation rules, service eligibility, and statutes that stop assuming an opposite-sex marriage.',
      out: 'Religious exercise and conscience (Religious Liberty Focus), the equal-treatment pairing, diversity mandates, and speech. Also out: parental decision rights over schooling — a parental-affirmation shield is filed here because the protected conduct is defined by refusing a transgender person’s transition, not by parental authority generally.',
      pole: 'Advanced = the vote added or preserved recognition or protection. Against = it subtracted one.',
      note: 'The direction is read off the operative provision, whatever the bill’s stated purpose in enacting it. Most instruments on file run against this key’s direction, and the mapping records that rather than omitting them.'
    },
    strong_defense: {
      inn: 'What the armed forces are authorised, funded and equipped to do: annual defence authorisations and their end strengths, procurement, military construction and national-security programmes; defence appropriations titles; supply-chain and industrial-base measures; servicemember pay and quality of life; and foreign intelligence collection authority sustained as a counterintelligence tool.',
      out: 'Whether Congress must authorise the use of force, which is a who-decides claim held on both sides of the funding question (Congress and War Powers). Also out: foreign aid and commitments abroad, support for Israel, the restraint and alliance postures, and surveillance seen from the other side (Privacy & Big-Tech Accountability), which carries the mirrored slice.',
      pole: 'Advanced = the vote authorised, funded or equipped the armed forces.',
      note: 'An authorisation carrying unrelated social-policy riders is weighted below a clean one, because passage is then not a pure posture signal; an appropriations vehicle is weighted below an authorisation because it sets amounts for programmes authorised elsewhere and takes no position on force structure or posture.'
    },
    // ── restraint ──────────────────────────────────────────────────────────
    // TRANSCRIBED FROM THE MAPPING SITE. No comment over ISSUE_MAP, and the
    // boundary is argued twice over: in the twelve `restraint` rationales in
    // consistency.js — 'H.Con.Res. 89|119|restraint', 'H.Con.Res. 108|119|restraint',
    // the six Senate withdrawal resolutions of the 119th ('S.J.Res. 83', 90, 98,
    // 104, 163, 184 and 185 on this key), 'H.Amdt. 99|119|restraint', and the
    // appropriations rows 'H.R. 8035|118|restraint' and 'H.R. 815|118|restraint',
    // which state the subject in the same words each time and code both
    // directions of it —
    // and in three entries already in this table, whose `out` lines name this key
    // as the one that holds whether to intervene at all (war_powers,
    // america_first_fp, strong_defense). Clauses below are quotations or close
    // paraphrases of those rows. No weight and no roll count is carried across.
    restraint: {
      inn: 'Whether the United States steps back from military engagement: an order removing U.S. forces from hostilities Congress has not authorised, whether it names a theatre or reaches any of them, and the repeal of a standing authorisation for the use of military force. Read from the other direction, an appropriation that sustains a military engagement already under way.',
      out: 'Whether a vote of CONGRESS is required before forces are committed, which is a claim about who decides and is held by members on both sides of this one (Congress and War Powers) — every withdrawal resolution on file carries a row on each. Also out: what the armed forces are authorised, funded and equipped to do; foreign aid levels and commitments abroad; and support for a specific partner or conflict, which have their own keys.',
      pole: 'Advanced = a yea that ordered forces out of an unauthorised engagement, or narrowed what may be done without asking Congress again. Against = a yea that sustained or deepened one.',
      note: 'A withdrawal order and a repealed authorisation are not the same act on this key: a repeal orders no withdrawal and reaches no engagement already under way, so it is read as one fewer basis for a future deployment rather than as a step back from one under way. A funding vote that arms an ally without committing U.S. forces to combat is read here just as narrowly, and the mapping says so on its face.'
    },
    privacy_rights: {
      inn: 'Who may collect, hold, move or act on data about a person: police use of genetic and third-party genomic data, government scoring of individuals, employer collection and device mandates, minors’ default settings and age verification, foreign-adversary limits on sequencing data, camera and tracking systems, and foreign intelligence collection authority.',
      out: 'What a rule should say about a sector as a rulebook question — Cut Federal Red Tape names this key as the holder of data and platform duties. Also out: speech and censorship, digital assets, platform competition and consumer finance, and defence authorisation as a posture question (Peace Through Strength), which carries the mirrored slice on the same collection authority.',
      pole: 'Advanced = the vote constrained collection or use. Against = it extended or mandated it.',
      note: 'Direction is read off the operative provision: converting a discretionary student directory disclosure into a mandatory one is filed against this key whatever the purpose in sharing. A reauthorisation that also adds query approvals and audits is held below the top weight because the direction is a net extension rather than a clean one.'
    },
    gov_transparency: {
      inn: 'What the public is entitled to be told about officeholders, and about the basis on which a decision was made: release of settlement and ethics records, conflict-of-interest and divestment rules, candidate and earmark disclosure, publication of the factual material relied on in rulemaking, and performance reporting by providers paid with public money.',
      out: 'Campaign and outside money, the member stock trading ban as its own chip, auditing agencies and the Federal Reserve, term limits, the practical-reform blend, and administration of the ballot.',
      pole: 'Advanced = the vote required more disclosure. Against = it required less.',
      note: 'A disclosure duty covering one programme’s provider reports sits at the narrow-link floor rather than reading as a transparency record.'
    },
    // Argued out in alignment-tool.js in September 2026 and transcribed here in the
    // same pass. It is the ordinary source — the comment block over the key — and it
    // was written because the key had none: two federal waves declined to map a
    // measure onto rural_ag in writing, each saying the boundary was not on file.
    rural_ag: {
      inn: 'The operating economics of farming and ranching as a business: commodity programmes, crop insurance and reference prices, the cost and legality of running a herd or repairing the equipment, working-farm and working-animal land kept in production, and farm and ranch water rights, which the private-property and water-conservation comments both send here by name.',
      out: 'Rural broadband and rural infrastructure as public works \u2014 the keyword list carries the phrase, and a keyword match is not a mapping. Also out: an emissions rule that happens to name farm equipment (Climate Action, whose written boundary is emissions, and whose own refusal says the commodity the equipment is used on is not the subject); reducing or pricing water demand (Water Conservation) and building water supply (Water Storage & Infrastructure); a data centre\u2019s agricultural water purchases (Data Centers & Water); what a government may take from a parcel (Private Property Rights); and rural health facilities.',
      pole: 'Advanced = the vote favoured the working farm or ranch \u2014 funded it, cut a cost it carries, or removed a restriction on it. Against = it ran the other way.',
      note: 'The boundary was written down in September 2026, after two federal waves refused to use the key because it had none. Every instrument mapped to it so far runs the same way; nothing here promises the next one will.'
    },
    cut_spending: {
      inn: 'Taking money back or holding it down, line by line: rescissions of unobligated balances, instructions to find net spending reductions, account-level reduction amendments, eligibility and work-requirement tightening recorded as the reductions they are, and offsets that cancel an existing appropriation.',
      out: 'The fiscal total and whether the deficit moved (Tackle the National Debt), auditing and waste as a process question, the balanced-budget framing, tax rates, and what the money buys — a Medicaid title is filed here for the reduction and on the programme’s own key for the contraction, and the reader is shown both.',
      pole: 'Advanced = the vote cancelled, reduced or held down federal spending.',
      note: 'Where the same act’s tax title runs the other way on the fiscal total, that is read on its own chip rather than netted out here. A reporting requirement is filed as a secondary and low-weight because it is not a cut.'
    }
  };

  // The three data-center keys and the three tariff keys were argued out as
  // FAMILIES, in one comment each, and the point of both comments is the same: three
  // flat keys let a record be pro-growth yet cost-skeptical at once, because the
  // tension is the data and not an editorial caveat. So the family note is stored
  // once and stamped onto its members rather than retyped three times.
  var FAMILIES = [
    { keys: ['datacenter_growth', 'datacenter_water', 'datacenter_power'],
      note: 'One of three separate data-center keys. Three flat keys let a record be pro-growth yet water- or power-skeptical at the same time — the tension is the data, not an editorial caveat.' },
    { keys: ['tariffs_growth', 'tariffs_prices', 'tariffs_authority'],
      note: 'One of three separate tariff keys, so a record can be pro-tariff yet cost- or authority-skeptical at once — the tension is the data, not an editorial caveat.' }
  ];
  FAMILIES.forEach(function (f) {
    f.keys.forEach(function (k) {
      var e = SCOPE[k] || (SCOPE[k] = {});
      if (!e.note) e.note = f.note;
    });
  });
  // No polarity sentence is stamped onto the data-center or tariff keys, and that
  // is not an omission. Four of the six are in the record engine's no-pole table —
  // their titles state a guardrail position, which is a subject rather than a
  // proposition the engine will take a side on — so read() prints the refusal for
  // them, and a "pro-safeguard means advanced" line here would promise a direction
  // the record is required never to publish.
  // The five mechanism keys under Congress-as-a-check state their polarity once,
  // together, in the shipped comment: every one of them is a WHO-DECIDES claim, so a
  // member may hold one way on one and the other way on another without any
  // inconsistency — which is exactly the distinction the retired umbrella key could
  // not draw.
  var MECH_POLE = 'A who-decides claim: advanced = the position in the title, against = the executive’s side of the same question. A record may go one way here and the other way on a neighbouring mechanism without inconsistency.';
  // …and only onto the three of the six the engine will read a side on. The list is
  // written out rather than filtered through noPole() at load time on purpose: this
  // file may be parsed before stance-helpers.js publishes its table, and a
  // load-order-dependent stamp is a bug that only shows up in one script order.
  // war_powers, state_standing and guard_authority sit in that table and get the
  // refusal instead — read() enforces that precedence whatever is stamped here.
  ['judicial_check', 'power_of_purse', 'congress_oversight']
    .forEach(function (k) { if (SCOPE[k] && !SCOPE[k].pole) SCOPE[k].pole = MECH_POLE; });

  // ── THE THREE SENTENCES THAT ARE DOCTRINE, NOT PER-KEY COPY ────────────────
  // These are the rules stated over _RD_NO_POLE in stance-helpers.js, in the
  // reader's words. They are printed for whole CLASSES of key, so they are stated
  // once here — a per-key copy would be a second place for the same rule to live.
  var POLE_DEFAULT = 'The title above is the direction. A vote counted as “advanced” moved toward it; “against” moved away from it.';
  var POLE_BALANCE = 'This key has no for-or-against. It states a blend of two positions, so the record engine will not read a side on it and no pattern is published here — only the inventory of what is on file.';
  var POLE_NONE = 'This key names a subject or a contested authority rather than a proposition, so the record engine will not read a side on it. An arithmetic direction exists in the mappings, but printing it would assert a pole nobody curated.';
  var NO_DEF = 'No definition on file yet.';

  // The keys the pattern engine refuses a direction on, read from the engine itself
  // rather than copied. A list typed here would go stale the first time the engine's
  // list changed, and the failure mode is the worst one available: a scope note
  // promising a direction the record will never print.
  function noPole(key) {
    try {
      if (/_balance$/.test(String(key || ''))) return 'balance';
      var T = window._PDX_RD_NO_POLE;
      if (T && T[key]) return 'nopole';
    } catch (e) {}
    return '';
  }

  function esc(s) {
    if (typeof window._slEsc === 'function') return window._slEsc(String(s == null ? '' : s));
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function imap() { try { return window.ISSUE_MAP || null; } catch (e) { return null; } }

  // ── ONE KEY, READ ──────────────────────────────────────────────────────────
  // Returns null only when the key is not in the issue vocabulary at all, which is
  // a bug in the caller rather than a state to render. A key that IS in the
  // vocabulary always reads: label and chip are shipped curated copy, and `defined`
  // says whether the scope argument was ever written down.
  function read(key) {
    var k = String(key || '');
    if (!k) return null;
    var M = imap();
    var e = (M && M[k]) ? M[k] : null;
    if (!e) return null;
    var s = SCOPE[k] || null;
    var np = noPole(k);
    return {
      key: k,
      label: e.label || k,
      chip: e.chip || '',
      cat: e.cat || '',
      defined: !!s,
      inn: s && s.inn ? s.inn : '',
      out: s && s.out ? s.out : '',
      note: s && s.note ? s.note : '',
      pole: np === 'balance' ? POLE_BALANCE
        : np === 'nopole' ? POLE_NONE
        : (s && s.pole) ? s.pole : POLE_DEFAULT,
      poled: !np
    };
  }

  // ── THE CONTROL ────────────────────────────────────────────────────────────
  // A trailing ⓘ, and it is a SIBLING of whatever door the row carries rather than
  // a child of it. That is deliberate and it is the reason there is no
  // stopPropagation anywhere in this file: consistency.js's dossier gateway finds
  // its target with closest('[data-pdxst-dos]'), and from a control mounted outside
  // that element there is no such ancestor to find. Two destinations, two controls,
  // no interception.
  function controlHtml(key) {
    var r = read(key);
    if (!r) return '';
    ensureStyles();
    bind();
    return '<button type="button" class="pdxis-key" data-pdxis-key="' + esc(r.key) + '"' +
      ' aria-haspopup="dialog" aria-expanded="false"' +
      ' aria-label="' + esc('What “' + r.label + '” covers') + '"' +
      ' title="' + esc('What “' + r.label + '” covers') + '">' +
      '<span aria-hidden="true">ⓘ</span></button>';
  }

  function sectHtml(lb, body) {
    if (!body) return '';
    return '<div class="pdxis-sect"><div class="pdxis-sect-h">' + esc(lb) + '</div>' +
      '<p class="pdxis-sect-b">' + esc(body) + '</p></div>';
  }
  function cardHtml(r) {
    // ORDER IS THE ARGUMENT. The label and its position statement first, because
    // that is what the reader tapped and it is the only part that is guaranteed to
    // exist. Then what "advanced" means, because the row they came from printed a
    // count of exactly that. Then the boundary — in, then out — because "what this
    // is not" is only readable after "what this is".
    return '<div class="pdxis-hd">' +
        '<span class="pdxis-hd-lb">' + esc(r.label) + '</span>' +
        '<span class="pdxis-hd-tag">Issue key</span>' +
        '<button type="button" class="pdxis-x" data-pdxis-close="1" aria-label="Close">' +
          '<span aria-hidden="true">×</span></button>' +
      '</div>' +
      (r.chip ? '<p class="pdxis-chip">' + esc(r.chip) + '</p>' : '') +
      sectHtml('What a count here means', r.pole) +
      (r.defined
        ? sectHtml('What it covers', r.inn) + sectHtml('What it does not', r.out) + sectHtml('Worth knowing', r.note)
        // THE HONEST BLANK. See wall item 1: a key whose scope was never argued out
        // gets told on, not filled in.
        : '<div class="pdxis-sect"><div class="pdxis-sect-h">What it covers</div>' +
            '<p class="pdxis-sect-b pdxis-off">' + esc(NO_DEF) + '</p></div>') +
      billsDoorHtml(r.key) +
      '<p class="pdxis-wall">This is what the issue key means, and it is the same for ' +
        'every politician on the site — it says nothing about this one’s record.</p>';
  }

  // ── THE ONE DOOR THIS CARD CARRIES ─────────────────────────────────────────
  // The ⓘ is mounted beside EVERY issue row on the site, and it is the one control
  // that is already about the KEY rather than about the person whose row it sits
  // in. That makes it the right place — and, on a stance-tree leaf whose own door
  // must keep opening that member's dossier, the only place — for the jump to the
  // key's own page: every measure formally mapped to it.
  //   OFFERED ONLY WHEN IT EXISTS. issue-page.js is a guest here exactly like this
  // module is a guest on the surfaces that mount it: no page module on the page, or
  // a key it will not take, and the card renders as it always did rather than
  // promising a destination that is not there.
  var BILLS_DOOR = 'See all bills on this issue';
  function billsDoorHtml(key) {
    try {
      var IP = window.PDXIssuePage;
      if (!key || !IP || typeof IP.has !== 'function' || !IP.has(key)) return '';
    } catch (e) { return ''; }
    return '<button type="button" class="pdxis-bills" data-pdxis-bills="' + esc(key) + '">' +
      '<span class="pdxis-bills-t">' + esc(BILLS_DOOR) + '</span>' +
      '<span class="pdxis-bills-go" aria-hidden="true">→</span>' +
    '</button>';
  }

  var _card = null, _scrim = null, _trigger = null, _openKey = '';

  function ensureCard() {
    if (_card) return _card;
    _scrim = document.createElement('div');
    _scrim.className = 'pdxis-scrim';
    _scrim.hidden = true;
    _scrim.setAttribute('data-pdxis-close', '1');
    _card = document.createElement('div');
    _card.className = 'pdxis-card';
    _card.id = 'pdxis-card';
    _card.setAttribute('role', 'dialog');
    _card.setAttribute('aria-modal', 'true');
    _card.setAttribute('aria-label', 'What this issue key covers');
    _card.setAttribute('tabindex', '-1');
    _card.hidden = true;
    document.body.appendChild(_scrim);
    document.body.appendChild(_card);
    return _card;
  }

  function open(key, trigger) {
    var r = read(key);
    if (!r || !document.body) return false;
    ensureStyles();
    var c = ensureCard();
    if (_trigger && _trigger !== trigger) _trigger.setAttribute('aria-expanded', 'false');
    c.innerHTML = cardHtml(r);
    _scrim.hidden = false;
    c.hidden = false;
    _openKey = r.key;
    _trigger = trigger || null;
    if (_trigger) {
      _trigger.setAttribute('aria-expanded', 'true');
      _trigger.setAttribute('aria-controls', 'pdxis-card');
    }
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(function () { if (_card) _card.classList.add('is-open'); });
    } else { c.classList.add('is-open'); }
    try { c.focus({ preventScroll: true }); } catch (e) {}
    return true;
  }

  function close(restoreFocus) {
    if (!_card || _card.hidden) return;
    _card.classList.remove('is-open');
    _card.hidden = true;
    if (_scrim) _scrim.hidden = true;
    var t = _trigger;
    _trigger = null; _openKey = '';
    if (t) {
      t.setAttribute('aria-expanded', 'false');
      t.removeAttribute('aria-controls');
      if (restoreFocus !== false) { try { t.focus({ preventScroll: true }); } catch (e) {} }
    }
  }

  var _bound = false;
  function bind() {
    if (_bound || !document.addEventListener) return;
    _bound = true;
    document.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;
      // Checked before the close control, because the door is INSIDE the card and
      // a reader who taps it means the page, not the dismissal.
      var bd = e.target.closest('[data-pdxis-bills]');
      if (bd) {
        e.preventDefault();
        var bk = bd.getAttribute('data-pdxis-bills') || '';
        var IP = window.PDXIssuePage;
        // Focus follows the reader onto the page, so it is not restored to the ⓘ.
        if (IP && typeof IP.open === 'function' && IP.open(bk)) close(false);
        return;
      }
      var x = e.target.closest('[data-pdxis-close]');
      if (x) { e.preventDefault(); close(true); return; }
      var b = e.target.closest('[data-pdxis-key]');
      if (!b) {
        // A tap anywhere outside an open card closes it, and does NOT swallow the
        // tap — the reader who reaches past this card for the row behind it meant
        // to reach it.
        if (_card && !_card.hidden && !e.target.closest('.pdxis-card')) close(false);
        return;
      }
      var k = b.getAttribute('data-pdxis-key') || '';
      e.preventDefault();
      if (_openKey === k && _card && !_card.hidden) { close(true); return; }
      open(k, b);
    }, false);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && _card && !_card.hidden) { close(true); }
    }, false);
  }

  // ── STYLES, INJECTED ───────────────────────────────────────────────────────
  // Same pattern as consistency.js's ensureStyles(): the module carries its own
  // skin so a surface can mount the control without a stylesheet edit, and a page
  // that never renders one pays nothing.
  var _styled = false;
  function ensureStyles() {
    if (_styled) return;
    if (!document.head || !document.createElement) return;
    if (document.getElementById('pdx-issue-scope-css')) { _styled = true; return; }
    var st = document.createElement('style');
    st.id = 'pdx-issue-scope-css';
    st.textContent = [
      /* The control. 2.75rem of thumb, 1rem of ink — the target is padding, so it
         never grows the row it sits in. */
      '.pdxis-key{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;',
        'min-width:2.75rem;min-height:2.75rem;margin:-0.5rem -0.35rem -0.5rem 0;padding:0;',
        'background:none;border:0;border-radius:999px;color:#7596c0;font-size:0.95rem;line-height:1;cursor:pointer;}',
      '.pdxis-key:hover,.pdxis-key:focus-visible{color:#9fdbff;background:rgba(127,180,255,0.12);}',
      '.pdxis-key[aria-expanded="true"]{color:#9fdbff;background:rgba(127,180,255,0.16);}',
      '.pdxis-scrim{position:fixed;inset:0;z-index:9998;background:rgba(4,8,18,0.66);}',
      '.pdxis-card{position:fixed;z-index:9999;left:50%;transform:translate(-50%,8px);',
        'bottom:max(1rem,env(safe-area-inset-bottom));width:min(30rem,calc(100vw - 1.5rem));',
        'max-height:min(78vh,34rem);overflow:auto;-webkit-overflow-scrolling:touch;',
        'background:linear-gradient(180deg,#101a2e,#0b1220);border:1px solid rgba(159,180,212,0.22);',
        'border-radius:14px;box-shadow:0 18px 48px rgba(0,0,0,0.5);padding:0.9rem 1rem 1rem;',
        'opacity:0;transition:opacity 0.16s ease,transform 0.16s ease;}',
      '.pdxis-card.is-open{opacity:1;transform:translate(-50%,0);}',
      '@media (min-width:40rem){.pdxis-card{bottom:auto;top:50%;transform:translate(-50%,calc(-50% + 8px));}',
        '.pdxis-card.is-open{transform:translate(-50%,-50%);}}',
      '.pdxis-hd{display:flex;align-items:flex-start;gap:0.5rem;}',
      '.pdxis-hd-lb{flex:1 1 auto;min-width:0;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;',
        'font-size:1.05rem;line-height:1.2;color:#eef4ff;overflow-wrap:break-word;}',
      '.pdxis-hd-tag{flex:0 0 auto;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.56rem;',
        'letter-spacing:0.12em;text-transform:uppercase;color:#7596c0;border:1px solid rgba(159,180,212,0.28);',
        'border-radius:999px;padding:0.15rem 0.4rem;margin-top:0.15rem;}',
      '.pdxis-x{flex:0 0 auto;min-width:2.25rem;min-height:2.25rem;margin:-0.4rem -0.5rem 0 0;padding:0;',
        'background:none;border:0;color:#9fb4d4;font-size:1.25rem;line-height:1;cursor:pointer;}',
      '.pdxis-x:hover,.pdxis-x:focus-visible{color:#eef4ff;}',
      '.pdxis-chip{margin:0.4rem 0 0.2rem;font-size:0.84rem;line-height:1.5;color:#c9d8ee;}',
      '.pdxis-sect{margin-top:0.7rem;}',
      '.pdxis-sect-h{font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.58rem;',
        'letter-spacing:0.11em;text-transform:uppercase;color:#7596c0;margin-bottom:0.2rem;}',
      '.pdxis-sect-b{margin:0;font-size:0.78rem;line-height:1.55;color:#b9cae3;overflow-wrap:break-word;}',
      '.pdxis-off{color:#7596c0;font-style:italic;}',
      '.pdxis-bills{display:flex;align-items:center;gap:0.4rem;width:100%;margin:0.85rem 0 0;',
        'padding:0.55rem 0.65rem;background:rgba(127,180,255,0.08);border:1px solid rgba(159,180,212,0.22);',
        'border-radius:10px;color:#eef4ff;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;',
        'font-size:0.86rem;letter-spacing:0.02em;cursor:pointer;text-align:left;}',
      '.pdxis-bills:hover,.pdxis-bills:focus-visible{background:rgba(127,180,255,0.16);border-color:rgba(159,180,212,0.4);}',
      '.pdxis-bills-t{flex:1 1 auto;min-width:0;}',
      '.pdxis-bills-go{flex:0 0 auto;color:#9fdbff;}',
      '.pdxis-wall{margin:0.85rem 0 0;padding-top:0.55rem;border-top:1px solid rgba(159,180,212,0.14);',
        'font-size:0.7rem;line-height:1.5;color:#7596c0;}'
    ].join('');
    document.head.appendChild(st);
    _styled = true;
  }

  // ── SELF TEST ──────────────────────────────────────────────────────────────
  // Cheap enough to run in a headless sandbox: every key in the locked table is a
  // real key in the issue vocabulary, and no entry promises a direction on a key
  // the record engine is required to refuse one on.
  function selfTest() {
    var bad = [];
    var M = imap();
    Object.keys(SCOPE).forEach(function (k) {
      if (!M || !M[k]) bad.push('not in ISSUE_MAP: ' + k);
      if (SCOPE[k].pole && noPole(k)) bad.push('pole stated on a no-pole key: ' + k);
      var r = read(k);
      if (r && noPole(k) && r.pole !== POLE_BALANCE && r.pole !== POLE_NONE) {
        bad.push('no-pole key published a direction: ' + k);
      }
    });
    return { ok: !bad.length, problems: bad, keys: Object.keys(SCOPE).length };
  }

  window.PDXIssueScope = {
    // `cardHtml` is published for the same reason pdx-learn.js publishes its markup
    // primitives: the copy in it is the deliverable, and a test that can only reach
    // it through a real popover is a test that does not check the copy.
    read: read, controlHtml: controlHtml, cardHtml: function (key) {
      var r = read(key);
      return r ? cardHtml(r) : '';
    }, open: open, close: close,
    SCOPE: SCOPE, NO_DEF: NO_DEF, BILLS_DOOR: BILLS_DOOR,
    POLE_DEFAULT: POLE_DEFAULT, POLE_BALANCE: POLE_BALANCE, POLE_NONE: POLE_NONE,
    selfTest: selfTest
  };

  try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
    else bind();
  } catch (e) {}
})();
