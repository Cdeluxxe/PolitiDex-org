/**
 * PolitiDex Issue Vocabulary — ISSUE_MAP, CORE_NATIONAL_ISSUES, categories.
 *
 * WHAT THIS IS AND WHY IT EXISTS SEPARATELY FROM alignment-tool.js
 * ────────────────────────────────────────────────────────────────────────────
 * This file is a VERBATIM copy of the vocabulary region at the top of
 * alignment-tool.js — lines 110 through 1413 of that file, byte for byte, with
 * nothing added inside and nothing taken out. It is the issue register plus the
 * core-issue parent table plus the three category tables, and it publishes
 * exactly the same globals that region publishes there:
 *
 *   window.ISSUE_MAP, window.CORE_NATIONAL_ISSUES, window.coreIssueForKey,
 *   window._pdxIssueCatOf, window._pdxIssueCategor{y,ies},
 *   window._pdxCategoryOf, window._pdxCategoryFromCat,
 *   window._pdxCategoryLabelOf, window._pdxEvidenceCategor{y,ies}
 *
 * It exists because of the document split. person.html (the /p/<pid> shell) is
 * NOT allowed to ship alignment-tool.js: that file is 351 KB of scoring engine,
 * picker accordion and team-alignment rendering, and every one of those surfaces
 * is a homepage/Door surface that a person file never mounts. But the person
 * file DOES need the vocabulary — the profile brief, the topic branches, the
 * issue scope control and the record card all read a bare `ISSUE_MAP` or ask
 * `coreIssueForKey`, and they read it UNGUARDED. Dropping the engine without
 * keeping the register is what turns a person file into a page with no issue
 * labels on it.
 *
 * THE COPY IS DELIBERATE AND alignment-tool.js IS NOT CHANGED. The obvious move
 * was to delete the region from alignment-tool.js and have index.html load this
 * file instead. It was rejected: 109 test files in scripts/ read ISSUE_MAP out of
 * alignment-tool.js's own text, and index.html's script order is pinned by
 * several more. A refactor of the monolith is not what the first split is for.
 * So the region has exactly two homes, and scripts/test-person-shell.mjs pins
 * them byte-identical — if the register is edited in alignment-tool.js and not
 * mirrored here, that test fails and names the drift.
 *
 * The region was already inside an IIFE in alignment-tool.js and its internals
 * (`var ISSUE_MAP`, `var ALIGN_CATEGORIES`, `var EVIDENCE_CATEGORIES`, …) are
 * scope-local there. The wrapper below reproduces that scope exactly, so the
 * only things this file adds to the page are the window.* assignments the region
 * itself makes.
 */
(function () {
    var ISSUE_MAP = {
      // ── Public Lands & Energy ──
      lands_preserve:     { label: '🏔 Protect Public Lands', chip: 'Protect public lands & wild places for future generations', cat: 'land', lean: 'D', stanceKeys: [], keywords: ['public land','public lands','land protection','land ownership','conservation','wilderness','national park','national monument','climate','air quality','recreation','great salt lake','blm','forest','environment'] },
      lands_balance:      { label: '⚖️ Balanced Land Use', chip: 'Allow grazing, recreation and limited energy on public land while protecting core wild areas', cat: 'land', stanceKeys: ['dataCenters'], keywords: ['public land','conservation','multiple use','responsible development','recreation','stewardship','grazing','forest','water','land management','balance'] },
      lands_local:        { label: '🤠 Local Land Control', chip: 'Transfer more federal land decisions to states and county governments', cat: 'land', stanceKeys: [], keywords: ['state land','land rights','local control','federal land','transfer','county','public land','grazing','states rights'] },
      lands_keep_public:  { label: '🏞 Keep Public Lands Public', chip: 'Keep public lands in public hands — oppose selling or transferring federal land to states or developers', cat: 'land', stanceKeys: [], keywords: ['public land','public lands','keep public lands','land sale','sell public land','land transfer','dispose of land','public access','hunting','fishing','recreation','blm','national forest','federal land'] },
      lands_energy:       { label: '⛏ Energy & Resource Development', chip: 'Expand domestic energy, mining & resource development', cat: 'land', lean: 'R', stanceKeys: ['dataCenters'], keywords: ['energy','oil','gas','drilling','mining','public land','state land','land rights','development','data center','grid','nuclear','fossil','extraction','growth','infrastructure'] },
      // SCOPE (property_rights): what a government may do to a parcel its owner holds —
      // take it, or forbid a use of it. The instruments on file are the remedy side
      // (2026 H.B. 289, attorney fees, a civil penalty and consequential damages when a
      // government ignores a Property Rights Ombudsman decision the owner won) and the
      // taking side (2026 S.B. 61, an infrastructure siting analysis and federal-agency
      // coordination required before a high voltage line may condemn private land).
      //   IN:  eminent domain and condemnation, regulatory takings, the owner's right to
      //        exclude, and local land use regulation aimed at what an owner may do with
      //        their own dwelling.
      //   OUT: whether enough housing gets built (housing_build) and whether it is
      //        affordable (housing, housing_support) — those keys read the same zoning
      //        bills for supply and price, not for the owner. Also OUT: who owns the
      //        federal estate (lands_local, lands_keep_public), water rights as a farm
      //        and ranch interest (rural_ag), and property tax (prop_tax, property_tax).
      // POLARITY: 'support' = the vote strengthened an owner's hand against the
      // government. 'oppose' = it strengthened the government's, and the mapping says so
      // rather than leaving the vote out: 2026 H.B. 256's short-term-rental licensing,
      // evidence and delisting provisions are filed yea_opposes because a reader who
      // cares about property rights would read that vote the other way and is entitled to
      // see it.
      property_rights:    { label: '🏡 Private Property Rights', chip: 'Protect private property rights and limit government eminent-domain seizures', cat: 'land', stanceKeys: [], keywords: ['property rights','private property','eminent domain','land rights','property owner','takings','land use','homeowner','water right','seizure','condemnation','easement'] },

      // ── Taxes & Government ──
      lower_taxes:        { label: '💰 Cut Income & Business Taxes', chip: 'Cut income and business tax rates to shrink the size of government', cat: 'gov', lean: 'R', stanceKeys: ['debt'], keywords: ['tax','tax cut','income tax','corporate tax','fiscal','fiscal conservat','small government','deregulation','appropriation'] },
      tax_middle_class:   { label: '💵 Middle-Class Tax Relief', chip: 'Cut taxes for middle-class households through credits and a bigger standard deduction', cat: 'gov', stanceKeys: [], keywords: ['middle class','working families','tax cut','child tax credit','payroll tax','take-home pay','tax relief','standard deduction','cost of living'] },
      gov_waste:          { label: '🧹 Cut Waste, Not Services', chip: 'Cut duplicate programs and improper payments before raising any taxes', cat: 'gov', stanceKeys: ['debt'], keywords: ['waste','wasteful spending','government efficiency','fraud','accountability','audit','streamline','reform','spending cut','improper payments','duplicate programs'] },
      // SCOPE, narrowed August 2026. This key used to absorb anything with the word
      // "regulation" in it, and both of its directions meant two opposite things at
      // once: 'support' held both "fewer federal rules" (CRA disapprovals, REINS,
      // sunset clauses) and "more federal rules" (antitrust enforcement, consumer
      // protection, cyber-incident reporting), while 'oppose' held both halves in
      // reverse — one member's card was a bill to RESCIND a CFPB overdraft rule filed
      // on the anti-deregulation side, so his own yea on the matching CRA resolution
      // read as contradicting a position he had authored. It is now about ONE thing:
      // how many federal rules there are, what they cost to comply with, and the
      // process by which they are written and repealed.
      //   IN:  Congressional Review Act disapprovals; REINS-style congressional
      //        approval of major rules; regulatory budgets, caps and sunset clauses;
      //        cost-benefit and paperwork requirements; how much deference agencies
      //        get in writing rules at all.
      //   OUT: what a particular rule should SAY. A claim that one sector needs
      //        tighter or looser rules is a claim about that sector, and belongs to
      //        the sector's key — antitrust and consumer finance (econ_corp_account),
      //        data and platform duties (privacy_rights, tech_balance,
      //        tech_innovation), digital assets (crypto_cbdc). Also OUT: federal
      //        environmental review of projects (permitting_reform), personnel
      //        classification (civil_service_control), headcount and telework
      //        (cut_spending), and preemption fights over whether a STATE may set its
      //        own rule where a federal one exists (states_federal_power) — that is a
      //        question about who decides, not about how heavy the rulebook is.
      // POLARITY: 'support' = fewer and cheaper federal rules, and more procedural
      // hurdles before new ones take effect. 'oppose' = defends federal rulemaking
      // capacity and the existing stock of rules. A card that wants a specific rule
      // strengthened is only 'oppose' here when its claim is about rulemaking as
      // such; otherwise it belongs to the sector key.
      gov_regulation:     { label: '✂️ Cut Federal Red Tape', chip: 'Cut the number and cost of federal regulations and require review before new ones take effect', cat: 'gov', lean: 'R', stanceKeys: [], keywords: ['regulation','deregulation','red tape','regulatory reform','rules','compliance','bureaucracy','sunset','cost-benefit','paperwork reduction','overregulation','congressional review act','regulatory budget','administrative state','rulemaking','agency deference'] },
      gov_balance:        { label: '⚖️ Balance the Budget', chip: 'Balance the budget over time using both targeted spending cuts and closing tax loopholes', cat: 'gov', stanceKeys: ['debt'], keywords: ['balanced budget','fiscal responsibility','deficit','debt','spending','accountability','efficiency','waste','reform','budget','bipartisan','tax loophole'] },
      gov_services:       { label: '🏛 Invest in Public Services', chip: 'Protect Social Security, Medicaid and public services — even if it means higher taxes on top earners', cat: 'gov', lean: 'D', stanceKeys: [], keywords: ['social safety','safety net','public service','investment','medicaid','social security','funding','social','community service','services','paid leave','minimum wage','affordable','top earners','wealth tax'] },
      social_security:    { label: '👵 Protect Social Security & Medicare', chip: 'Protect Social Security and Medicare benefits from cuts or privatization', cat: 'gov', stanceKeys: [], keywords: ['social security','medicare','retirement','seniors','senior','entitlement','earned benefits','benefits','pension','fixed income','elderly','retiree'] },
      // SCOPE (national_debt): the fiscal TOTAL — whether a measure adds to the deficit
      // or subtracts from it, read off the enacted or reported text and nothing else. A
      // budget resolution whose published summary states that it provides reconciliation
      // instructions for legislation increasing the deficit is coded yea_opposes;
      // unoffset emergency spending and unoffset appropriations are coded yea_opposes as
      // secondary slices, because the fiscal effect is a consequence of the programme
      // rather than its stated purpose; a subtitle captioned deficit reduction and a
      // rescission of unobligated balances are coded yea_supports. Where a bill summary
      // lists programmes without a topline, NO slice is filed at all rather than
      // asserting one.
      //   IN:  the deficit and the debt as a total — budget resolutions, debt-limit
      //        measures, rescissions, and the net fiscal direction of a package.
      //   OUT: which line to cut (cut_spending is the programme-cut chip and
      //        audit_spending the waste-and-audit one), which tax to change
      //        (lower_taxes, tax_middle_class), the balanced-budget framing
      //        (gov_balance), and what the money buys (gov_services).
      // POLARITY: 'support' = the vote reduced the deficit. 'oppose' = it increased it.
      // Neither direction says anything about whether the underlying programme was worth
      // having; that argument belongs to the programme's own key.
      national_debt:      { label: '📉 Tackle the National Debt', chip: 'Bring down the national debt and stop running huge yearly deficits', cat: 'gov', stanceKeys: ['debt'], keywords: ['national debt','debt','deficit','deficit spending','balanced budget','debt ceiling','fiscal responsibility','interest on the debt','overspending','spending','fiscal'] },
      // NOTE: property taxes are intentionally listed in two places — `prop_tax`
      // here under Taxes & Government frames it as a tax-policy question (relief &
      // caps), while `property_tax` under Housing & Cost of Living (below) frames
      // it as a housing-affordability question. The labels are worded distinctly so
      // the two don't read as accidental duplicates; both feed the same
      // economy_cost_of_living core bundle.
      prop_tax:           { label: '🏦 Property Tax Relief', chip: 'Lower or cap property taxes so rising home values don’t tax families and seniors out of their homes', cat: 'gov', stanceKeys: [], keywords: ['property tax','property taxes','real estate tax','home value','assessment','tax assessment','mill levy','homestead exemption','property tax relief','property tax cap','escrow','homeowner tax','circuit breaker','seniors','fixed income'] },
      // SCOPE (sound_money): what the treasury may HOLD and what the state will ACCEPT
      // as payment. Three real instruments asked for the same thing and were refused for
      // want of a key — 2024 H.B. 348 (exempt part of the budget reserves from the State
      // Money Management Act and let the treasurer buy precious metals), 2025 H.B. 528
      // (let severance and income tax be remitted in gold, at a reduced rate), and 2025
      // H.B. 67 (Precious Metals Investment and Administration). All three widen the role
      // of specie; none of them narrows it. That is the polarity, and the chip states the
      // support direction, so every mapping is coded yea_supports = the vote widened it.
      // OUT of scope, and the reason this is not crypto_cbdc: crypto_cbdc is scoped to
      // digital assets and a central bank digital currency, and all three refusal notes
      // said so in as many words. Filing a gold-remittance statute there would move a
      // member's Bitcoin percentage on a vote about bullion. Also OUT: audit_spending
      // (auditing the Fed, not holding metal), lower_taxes (H.B. 528 does cut the
      // severance rate, but the rate cut is the inducement to remit in gold, not the ask),
      // and national_debt. Deliberately carries NO `lean`: the state-level sound-money
      // coalition and the treasury-practice objection to it both run inside one party
      // here, so coding it R would be false signal.
      // KEYWORDS, and the two that are deliberately absent. This list is read by the
      // optional ingest classifier AND by word-action.js's brandingIssueKey(), which
      // matches a member's campaign issue LABELS against it — so a keyword here is
      // also a claim about a slogan. 'sound money' and 'hard money' are slogans, not
      // bill language: the first matched Rep. Luna's "Spending & Sound Money" branding
      // label and gave a Florida member a scorable issue this key can never test,
      // since there is no federal instrument mapped to it; the second is what campaign
      // finance calls a regulated contribution and would collide with campaign_finance.
      // Utah's own instruments are titled "Precious Metals Amendments" and "Legal
      // Tender Amendments", so dropping both costs the classifier nothing. Do not
      // restore them just because they read like the key's name.
      sound_money:        { label: '🥇 Gold & Sound Money', chip: 'Let the treasury hold reserves in gold and silver, and let people pay the state in it', cat: 'gov', stanceKeys: [], keywords: ['precious metals','gold','silver','bullion','specie','legal tender','gold reserve','state treasurer','money management act','severance tax in gold','inflation hedge'] },

      // ── Immigration ──
      // SCOPE (border_security): enforcement CAPACITY at and behind the line — the
      // people, equipment, barriers and detention the system runs on, and the state and
      // local cooperation that feeds it. The instruments on file are appropriations for
      // Border Patrol agents and support personnel, port-of-entry inspection equipment,
      // Air and Marine platforms, border surveillance technology and the biometric entry
      // and exit system; and state bills conscripting a county sheriff or the Department
      // of Corrections into notifying and coordinating with federal immigration
      // authorities before releasing an inmate.
      //   OUT: mandatory removal itself, which is its own chip (deportations). A bill
      //        that does both carries a slice on each with different weights, so neither
      //        chip reads as the whole bill. Also OUT: drug and cartel interdiction
      //        (immig_fentanyl), visas and work-based admission (immig_legal), earned
      //        status for the long-settled (immigration_reform), the pairing position
      //        (immig_balance), and criminal sentencing generally (tough_on_crime).
      // POLARITY: 'support' = the vote added enforcement capacity or tightened it.
      // Enforcement SEVERITY without capacity — raising the penalty for illegal entry
      // and reentry — is filed as a secondary and weighted below the funding bills on
      // purpose: it adds no barrier, no agent, no detention bed and no removal
      // authority, so it is severity, not capacity.
      border_security:    { label: '🛡 Strong Border & Enforcement', chip: 'Finish border barriers and deport people here illegally', cat: 'immig', lean: 'R', stanceKeys: ['border'], keywords: ['border','border security','immigration enforcement','wall','ice','deportation','illegal immigration','enforcement'] },
      immig_legal:        { label: '📋 Modernize Legal Immigration', chip: 'Expand and speed up merit-based and employment work visas', cat: 'immig', stanceKeys: [], keywords: ['legal immigration','work visa','h-1b','merit','green card','skilled worker','guest worker','visa backlog','employment','agriculture labor'] },
      immig_balance:      { label: '⚖️ Secure Border + Legal Pathways', chip: 'Pair strong border security with earned legal pathways', cat: 'immig', stanceKeys: ['border'], keywords: ['border','immigration','legal immigration','work visa','reform','enforcement','pathway','comprehensive','bipartisan','guest worker'] },
      immigration_reform: { label: '🤝 Pathways to Citizenship', chip: 'Create earned pathways to citizenship for long-settled immigrants', cat: 'immig', lean: 'D', stanceKeys: [], keywords: ['immigration reform','pathway','citizenship','dreamer','daca','asylum','refugee','immigrant','work visa'] },
      // SCOPE (immig_fentanyl): the drug itself and the organisations that move it.
      // Every instrument on file is a sanctions or anti-money-laundering measure against
      // opioid traffickers and the transnational organisations behind them (the BUST
      // FENTANYL Act's expansion of the Fentanyl Sanctions Act, the Blocking Deadly
      // Fentanyl Imports Act's new majors-list category, the FEND Off Fentanyl Act), a
      // scheduling measure (permanent class-wide Schedule I placement of
      // fentanyl-related substances), or the narcotics-interdiction share of a border
      // appropriation.
      //   OUT: general border staffing and barriers (border_security) — an interdiction
      //        line inside a border bill is filed here as a secondary slice while the
      //        capacity line is filed there, so neither reads as the whole bill. Also
      //        OUT: treatment and the overdose crisis as a health question
      //        (health_mental), drug sentencing in the criminal code (tough_on_crime),
      //        and cannabis (cannabis_reform).
      // POLARITY: 'support' = the vote added sanctions, scheduling or interdiction
      // against fentanyl trafficking. Every instrument on file runs that way; none
      // loosens.
      immig_fentanyl:     { label: '🚫 Stop Fentanyl & Cartels', chip: 'Crack down on fentanyl trafficking and the drug cartels behind it', cat: 'immig', lean: 'R', stanceKeys: ['border'], keywords: ['fentanyl','cartel','cartels','drug trafficking','smuggling','border drugs','narcotics','interdiction','transnational','overdose','poison','drug epidemic'] },
      // SCOPE (deportations): mandatory custody and removal — who the executive MUST
      // detain and place in removal proceedings, and the money that carries removal out.
      // The instruments on file are the Laken Riley Act, its two adopted amendments
      // (each widening the list of offences that trigger mandatory detention), the House
      // companion, and the interior-enforcement title appropriating to CBP and to ICE
      // across purposes that name removal operations directly.
      //   OUT: capacity at the line itself — agents, barriers, inspection equipment
      //        (border_security). The two chips overlap by design on a bill that does
      //        both, and the mapping files a slice on each rather than picking one. Also
      //        OUT: fentanyl and cartel measures (immig_fentanyl), legal admission
      //        (immig_legal), earned status (immigration_reform), and the pairing
      //        position (immig_balance).
      // POLARITY: 'support' = the vote widened mandatory detention or removal, or funded
      // it. Every instrument on file runs that way.
      deportations:       { label: '🚨 Mass Deportations & Border Security', chip: 'Carry out large-scale deportations of people here illegally and fully lock down the border', cat: 'immig', lean: 'R', stanceKeys: ['border'], keywords: ['deportation','deportations','mass deportation','mass deportations','border security','illegal immigration','ice','removal','remove','secure the border','interior enforcement'] },

      // ── Gun Policy ──
      // Firearms policy is TWO facets, not one axis, and the two existing keys already
      // ARE those facets — so they are reused rather than replaced. gun_rights and
      // gun_safety are descriptive of what a policy does ("the right to carry", "require
      // background checks"), not movement brands, and every gun card in the library
      // already sits on one of them. Introducing new keys would fragment 110+ cards and
      // three existing vote mappings for no gain.
      //   gun_rights  — the scope of the individual right to acquire, keep and carry.
      //   gun_safety  — screening, removal and storage rules aimed at misuse.
      // The two are scored independently. A record can be 'support' on both (the
      // Bipartisan Safer Communities Act coalition: expanded background checks AND an
      // explicit no-registry guarantee), 'oppose' on both, or one of each. Nothing in
      // the scoring couples them, and a member's percentage under one facet says
      // nothing about the other.
      //
      // WHAT "SUPPORTS" MEANS ON EACH AXIS, INDEPENDENTLY
      // gun_rights — the chip states the PRO-RIGHTS direction. issueStance:'support' =
      //   backs carry and self-defence rights (concealed/constitutional carry,
      //   interstate reciprocity, carry on federal land or installations), backs Second
      //   Amendment protections against registry, purchase-tracking and licensing
      //   burdens, and opposes broad category bans on commonly-owned firearms or
      //   magazines. 'oppose' = holds the right is narrower than that and backs those
      //   restrictions. 'mixed' = backs the right but not a specific instrument (e.g.
      //   pro-carry, pro-suppressor-ban). An Official Record % here means "this share of
      //   their judged votes widened, or refused to narrow, the right".
      // gun_safety — the chip states the PRO-REGULATION direction. issueStance:'support'
      //   = backs background-check expansion, red-flag / extreme-risk orders,
      //   assault-style and high-capacity-magazine restrictions, safe-storage
      //   requirements, and trafficking / straw-purchase enforcement. 'oppose' = holds
      //   those measures ineffective or unconstitutional. 'mixed' = backs some
      //   instruments and not others (e.g. pro-trafficking-enforcement,
      //   anti-red-flag). An Official Record % here means "this share of their judged
      //   votes tightened rules aimed at misuse".
      // These are NOT mirror images. Suppressor deregulation and ATF-rule repeal touch
      // gun_rights alone; trafficking-enforcement funding and safe-storage grants touch
      // gun_safety alone. Where a package genuinely does both in opposite directions —
      // S. 2938 in the 117th, which expanded background checks while writing a
      // no-registry guarantee into law — it is mapped to both facets with opposite
      // supportMeaning rather than forced into one verdict.
      //
      // gun_balance is NOT a facet and stays exactly as it is. Its chip ("Keep legal gun
      // ownership but require universal background checks and red-flag laws") is a
      // composite verdict — it asserts a position on both axes at once, which is the
      // thing the two-facet split exists to avoid. It remains a legacy middle key for
      // the members whose stated position really is that blend; its cards count toward
      // NEITHER facet's coverage, and no card was re-keyed off it.
      // gun_rights carries lean:'R' and gun_safety lean:'D'. This is no longer a
      // scoring asymmetry: nothing in the match reads `lean` since the party nudge was
      // retired. The values stay because word-action.js's branding disambiguator reads
      // them, and it is exactly this pair it needs them for — same category, opposite
      // leans, so a bill whose branding hits both resolves to neither instead of
      // silently picking one.
      gun_rights:         { label: '🔫 Protect Gun Rights', chip: 'Protect Second Amendment and the right to bear arms', cat: 'guns', lean: 'R', stanceKeys: ['gun'], keywords: ['gun rights','second amendment','2a','firearm','constitutional carry','nra','concealed carry','carry','right to carry','reciprocity','concealed carry reciprocity','self-defense','self defense','right to bear arms','magazine ban','gun ban','firearm registry','no registry','suppressor','hearing protection','atf','gun owner','law-abiding'] },
      gun_balance:        { label: '⚖️ Rights + Common-Sense Safety', chip: 'Keep legal gun ownership but require universal background checks and red-flag laws', cat: 'guns', stanceKeys: ['gun'], keywords: ['background check','gun safety','second amendment','firearm','responsible','red flag','mental health','common sense','gun reform'] },
      gun_safety:         { label: '🦺 Stronger Gun Safety Laws', chip: 'Pass stronger gun safety laws to reduce gun violence', cat: 'guns', lean: 'D', stanceKeys: [], keywords: ['gun safety','gun control','background check','universal background check','red flag','extreme risk','assault weapon','assault-style','high-capacity','high capacity magazine','safe storage','secure storage','gun trafficking','straw purchase','ghost gun','untraceable firearm','bump stock','gun violence','gun reform','boyfriend loophole'] },

      // ── Education ──
      // SCOPE (school_choice): public money spent on schooling OUTSIDE the district
      // system, and the regulatory room a non-district provider gets. The instruments on
      // file are the Utah Fits All Scholarship Program and its amendments, the Special
      // Needs Opportunity and Carson Smith scholarships and their merger, an online
      // course choice programme for private school students, micro-education entity
      // facility and occupancy rules, and a military school choice pilot.
      //   IN:  scholarship and voucher accounts spendable at a private school or
      //        provider, charter and microschool authorisation, and course-level choice
      //        funded outside the district formula.
      //   OUT: what the district system is paid (public_schools) — the two are scored
      //        independently and a record may advance both. Also OUT: the blended
      //        position (edu_balance), who decides what a child is taught
      //        (edu_parental), and college and trade cost (edu_college_cost).
      // POLARITY: 'support' = the vote created, widened or entrenched a publicly funded
      // option outside the district system, or reduced the regulation of one. A bill that
      // funds nothing and creates no alternative — one that only removes paperwork — is
      // filed as a secondary to say exactly that.
      school_choice:      { label: '🎓 School Choice & Education Freedom', chip: 'Fund vouchers and charters so families can pick their school', cat: 'edu', lean: 'R', stanceKeys: [], keywords: ['school choice','education choice','education freedom','voucher','vouchers','school vouchers','charter','scholarship','homeschool','parental rights','parental choice'] },
      edu_balance:        { label: '⚖️ Strengthen Every School', chip: 'Fully fund public schools while letting some funding follow students to other options', cat: 'edu', stanceKeys: [], keywords: ['public school','school funding','school choice','teacher','education','charter','accountability','student','classroom','reform'] },
      // SCOPE (public_schools): the money and staffing of the DISTRICT system — funding
      // formulas, teacher compensation, levy protection, and duties the state imposes on
      // and resources through local education agencies. The instruments on file are the
      // full-day kindergarten funding formula, market-informed teacher compensation and
      // the educator supplements, high-need school educator grants, absenteeism duties,
      // and public education reporting and compliance.
      //   OUT: money that follows a student out of the district (school_choice), the
      //        blended position (edu_balance), curriculum and parental consent
      //        (edu_parental), college cost (edu_college_cost), and school safety as a
      //        firearms question (gun_safety).
      // POLARITY: 'support' = the vote funded, staffed or protected the district system.
      // 'oppose' = it withdrew a funding protection, and the mapping says so rather than
      // dressing a cut as a reform: 2026 S.B. 321's graduated phase-out of hold harmless
      // on voted and board levies is filed yea_opposes, because hold harmless is what
      // protects a district's levy revenue when its enrolment or valuation falls.
      // Scrutiny of a programme is NOT coded as a cut — a review bill that reduces no
      // funding line is filed as secondary support.
      public_schools:     { label: '🍎 Invest in Public Schools', chip: 'Raise teacher pay and fund public schools and classrooms', cat: 'edu', lean: 'D', stanceKeys: [], keywords: ['public education','public school','teacher pay','teacher','school funding','education funding','student welfare','classroom'] },
      edu_college_cost:   { label: '🎓 Lower College & Trade Costs', chip: 'Make college and trade school affordable and cut student debt', cat: 'edu', stanceKeys: [], keywords: ['college cost','tuition','student debt','student loan','trade school','apprenticeship','community college','pell grant','higher education','workforce training','affordable'] },
      // SCOPE (edu_parental): the parent's decision rights over their own child's
      // schooling — consent, notice, inspection and opting out. The instruments on file
      // are library-borrowing transparency, annual written consent for student surveys,
      // parent-triggered sensitive material review, a learning-materials inspection
      // pilot, device and database filtering with parent-portal notice, informed
      // parental consent before a health service is delivered inside a school,
      // participation waivers, half-day kindergarten disclosure, and homeschool notice
      // requirements.
      //   IN:  consent and notice requirements, the right to inspect or object to
      //        instructional material, opt-out rights, and moving the decision to
      //        homeschool closer to the parent and further from state review.
      //   OUT: how the district system is funded (public_schools) and money that follows
      //        a student out of it (school_choice) — a microschool facility bill is
      //        filed here only as a secondary slice, because its text is about
      //        occupancy codes rather than parental authority. Also OUT: what the
      //        curriculum should SAY as a rights or speech question (religious_liberty,
      //        free_speech, end_dei, lgbtq_rights).
      // POLARITY: 'support' = the vote enlarged what a parent may see, consent to or
      // refuse. A bill that only amends a curriculum list, granting no parental right
      // and changing no consent requirement, is filed as secondary and low-weight to say
      // exactly that.
      edu_parental:       { label: '👪 Parental Rights in Schools', chip: 'Give parents more say over curriculum, library materials and what their children are taught', cat: 'edu', stanceKeys: [], keywords: ['parental rights','parents bill of rights','curriculum transparency','library books','opt out','parental notification','parental consent','parents','classroom','what kids are taught','education'] },

      // ── Family, Children & Work ──
      child_care:         { label: '🧸 Affordable Child Care', chip: 'Cut child-care costs and expand access to pre-K and early learning', cat: 'family', stanceKeys: [], keywords: ['child care','childcare','daycare','pre-k','prek','preschool','early childhood','early learning','head start','working parents','family'] },
      paid_leave:         { label: '👶 Paid Family & Medical Leave', chip: 'Guarantee paid time off to care for a new baby or a sick loved one', cat: 'family', stanceKeys: [], keywords: ['paid leave','family leave','medical leave','maternity','paternity','fmla','parental leave','caregiver','time off','paid family leave'] },
      family_support:     { label: '🍼 Help Families with Kids', chip: 'Expand the child tax credit and support to help with the cost of raising children', cat: 'family', stanceKeys: [], keywords: ['child tax credit','family tax','dependent','raising children','cost of raising','per-child','family budget','working families','adoption','parents'] },

      // ── Healthcare ──
      healthcare_market:  { label: '💊 Market-Based Healthcare', chip: 'Lower costs through competition and price transparency', cat: 'health', lean: 'R', stanceKeys: ['healthcare'], keywords: ['market-based','market healthcare','aca repeal','obamacare','deregulation','health savings','price transparency','competition','private insurance','medicaid reform','healthcare cost'] },
      health_drug_prices: { label: '💉 Lower Prescription Drug Prices', chip: 'Cap and negotiate prescription drug prices for patients', cat: 'health', stanceKeys: ['healthcare'], keywords: ['prescription','drug price','insulin','medicare negotiation','pharmaceutical','pbm','out-of-pocket','medication cost','price cap','affordable'] },
      health_balance:     { label: '⚖️ Lower Costs, Keep Coverage', chip: 'Lower costs by keeping private insurance while adding a public option to compete', cat: 'health', stanceKeys: ['healthcare'], keywords: ['healthcare','health','cost','prescription','price transparency','coverage','insurance','medical','mental health','reform','affordable','public option'] },
      healthcare_costs:   { label: '💵 Lower Healthcare Costs', chip: 'Bring down the price of healthcare, hospital bills and medical care for families', cat: 'health', stanceKeys: ['healthcare'], keywords: ['healthcare costs','health care costs','medical costs','medical bills','hospital prices','hospital bills','price transparency','out-of-pocket','surprise billing','affordable care','cost of care'] },
      // SCOPE (healthcare): whether covered care actually REACHES the patient — who is
      // eligible, what is covered, and the plan procedures between the two. The
      // instruments on file are Medicaid and state wraparound benefits for people with
      // disabilities, telemedicine payment parity, preauthorization response deadlines
      // and disclosure, formulary-switch and long-term-drug continuity protections, an
      // autism diagnosis definition that decides whether an assessment is covered at
      // all, and VA enrolment and presumptions for toxic-exposed veterans.
      //   OUT: price and household cost (healthcare_costs, health_drug_prices), the
      //        market-competition posture (healthcare_market), the blended position
      //        (health_balance), mental health and addiction (health_mental), rural
      //        facilities (health_rural), mandates on a person's own care
      //        (medical_freedom), and the safety net read as a spending question
      //        (gov_services, cut_spending).
      // POLARITY: 'support' = the vote widened eligibility or coverage, or removed a
      // procedural barrier to covered care. 'oppose' = it contracted them — a statutory
      // enrolment freeze and payment-rate suspension triggered by a defined Medicaid
      // shortfall is filed yea_opposes, because a mandatory freeze is a coverage
      // contraction written into statute ahead of time.
      healthcare:         { label: '🏥 Expand Healthcare Access', chip: 'Expand healthcare access and coverage for everyone', cat: 'health', lean: 'D', stanceKeys: ['healthcare'], keywords: ['healthcare','health','medicaid','medicaid expansion','aca','coverage','uninsured','hospital','medical','mental health','insurance','prescription','public health','overdose'] },
      health_mental:      { label: '🧠 Mental Health & Addiction', chip: 'Expand mental-health care and fight the opioid and fentanyl crisis', cat: 'health', stanceKeys: ['healthcare'], keywords: ['mental health','addiction','opioid','fentanyl','overdose','substance abuse','suicide','behavioral health','recovery','treatment','crisis','drug epidemic','rehabilitation'] },
      health_rural:       { label: '🚑 Protect Rural Hospitals', chip: 'Keep rural hospitals, maternity wards and emergency care open and funded', cat: 'health', stanceKeys: ['healthcare'], keywords: ['rural hospital','rural health','critical access','emergency room','ambulance','maternity care','hospital closure','telehealth','rural healthcare','clinic','underserved','provider shortage'] },
      medical_freedom:    { label: '🩺 Medical Freedom', chip: 'Protect personal choice over vaccines and government medical mandates', cat: 'health', lean: 'R', stanceKeys: [], keywords: ['medical freedom','vaccine mandate','vaccine choice','informed consent','health freedom','no mandates','medical privacy','personal choice','conscience','natural immunity','bodily autonomy'] },

      // SCOPE (tobacco_nicotine): the rules on selling tobacco and nicotine products —
      // what may be sold (flavour bans, nicotine caps, a federal-market-authorization
      // requirement), who may sell it (permits, permit fees, a product registry), and what
      // happens when they sell it anyway (retailer penalties, criminal penalties). Two
      // instruments in two sessions asked for the same thing and were refused for want of
      // a key: 2024 S.B. 61 (flavour ban, nicotine limit, market-authorization bar,
      // registry) and 2025 S.B. 186 (registry and search provisions, flavoured-product
      // penalties, higher permit fees, amended criminal penalties). Both tighten; neither
      // loosens. The chip states the support direction, so every mapping is coded
      // yea_supports = the vote tightened the rules.
      // OUT of scope, and why the nearby health chips do not cover it: medical_freedom is
      // about government mandates on a person's own medical care, and a flavour ban is a
      // product-market rule, not a mandate on a patient — filing it there would score a
      // vaccine-mandate position off a vape statute, in the wrong direction. health_mental
      // is scoped to mental health and the opioid/fentanyl crisis, healthcare and
      // healthcare_costs are about coverage and price, and cannabis_reform is a different
      // substance under a different statute. Deliberately carries NO `lean`: retail-freedom
      // and youth-protection arguments both run inside the majority party here.
      tobacco_nicotine:   { label: '🚭 Tobacco & Vaping Rules', chip: 'Tighten the rules on selling tobacco, vapes and nicotine products', cat: 'health', stanceKeys: [], keywords: ['tobacco','nicotine','vape','vaping','e-cigarette','electronic cigarette','flavored','flavoured','flavor ban','nicotine limit','tobacco permit','tobacco retailer','product registry','smoking','smoke shop','underage sales'] },

      // ── Economy & Jobs ──
      econ_growth:        { label: '📈 Pro-Growth Deregulation', chip: 'Roll back federal business regulations and keep taxes low to spur hiring and investment', cat: 'econ', lean: 'R', stanceKeys: [], keywords: ['economy','economic growth','deregulation','free market','pro-growth','business','investment','industry','jobs','entrepreneur'] },
      // SCOPE (econ_smallbiz): the fixed cost of BEING small — the licence, the permit,
      // the paperwork and the credit line. The instruments on file are a zero net annual
      // regulatory budget at the Small Business Administration, an SBA channel for
      // reporting burdensome federal rules, widened Main Street access to capital,
      // restaurant, venue and disaster-loan relief, and a cosmetology apprenticeship
      // route that lets someone qualify for licensure through supervised work instead of
      // school hours.
      //   OUT: the size of the federal rulebook generally (gov_regulation) and
      //        project-level environmental review (permitting_reform) — both name
      //        occupational licensing and small-business paperwork as OUT of their own
      //        scope, and this is the key they name. Also OUT: business tax rates and
      //        the growth posture (lower_taxes, econ_growth), worker-side rules
      //        (econ_workers), and large-firm accountability (econ_corp_account).
      // POLARITY: 'support' = the vote lowered the licensing, permitting, paperwork or
      // capital cost a small business carries. Where the bill's controlling subject is
      // the regulatory budget rather than small business as such, the weight is held
      // below the primary to say so.
      econ_smallbiz:      { label: '🏪 Help Small Businesses', chip: 'Cut the licensing fees, permits and paperwork that fall hardest on small businesses', cat: 'econ', stanceKeys: [], keywords: ['small business','main street','entrepreneur','startup','licensing','permitting','red tape','paperwork','local business','self-employed','franchise'] },
      econ_trade:         { label: '🏭 Protect American Jobs', chip: 'Use tariffs and trade rules to defend American manufacturing', cat: 'econ', lean: 'R', stanceKeys: [], keywords: ['trade','tariff','manufacturing','factory','american made','buy american','offshoring','supply chain','industry','china','jobs'] },
      tariffs_china:      { label: '🇨🇳 Tariffs on China & Unfair Trade', chip: 'Use tariffs to counter China and unfair trade practices and protect American workers', cat: 'econ', lean: 'R', stanceKeys: [], keywords: ['tariffs','tariff','china tariffs','china trade','china','trade war','unfair trade','trade deficit','offshoring','decoupling','made in america','protect american jobs'] },
      // ── Tariffs & Trade (the 'tariffs' facet family) ──
      // Modeled on the data-center family above: three flat keys let a record be
      // pro-tariff yet cost- or authority-skeptical at once — the tension is the
      // data, not an editorial caveat. POLARITY: on tariffs_prices and
      // tariffs_authority the chip states the PROTECTIVE / guardrail position, so
      // issueStance:'support' = pro-safeguard, 'oppose' = "impose broad tariffs
      // regardless of household cost / by unilateral executive action", and
      // 'mixed' = "backs tariffs WITH conditions". Every card's issueStance is
      // written relative to its own chip. All three sit under 'econ' so they roll
      // into the Taxes & Economy evidence Category and the Economy core issue.
      tariffs_growth:     { label: '🏭 Tariffs & American Industry', chip: 'Use tariffs to reshore manufacturing, protect American jobs and gain leverage over unfair traders', cat: 'econ', lean: 'R', stanceKeys: [], keywords: ['tariff','tariffs','reciprocal tariff','reshoring','reshore','manufacturing','american jobs','factory','trade deficit','leverage','made in america','protect american workers','domestic industry','ieepa','liberation day'] },
      tariffs_prices:     { label: '💵 Tariffs & Household Prices', chip: 'Shield families from tariff-driven price increases — pair any tariffs with exemptions or relief so everyday costs don’t rise', cat: 'econ', stanceKeys: [], keywords: ['tariff','tariffs','prices','price increase','inflation','cost of living','consumer prices','import costs','tax on consumers','household costs','small business costs','exemptions','carve-out','affordability'] },
      tariffs_authority:  { label: '⚖️ Tariffs & Trade Authority', chip: 'Keep Congress’s constitutional role over tariffs rather than open-ended, unilateral executive tariff power', cat: 'econ', stanceKeys: [], keywords: ['tariff','tariffs','trade authority','congressional authority','ieepa','emergency powers','separation of powers','executive power','constitution','article i','delegation','section 122','major questions','rein in tariffs','congressional approval'] },
      econ_balance:       { label: '⚖️ Balanced Prosperity', chip: 'Support business growth but keep worker protections, overtime and benefit rules in place', cat: 'econ', stanceKeys: [], keywords: ['economy','jobs','small business','workers','wage','cost of living','middle class','manufacturing','affordable','growth','opportunity'] },
      econ_workers:       { label: '🛠 Raise Wages & Protect Workers', chip: 'Raise the minimum wage and protect workers from exploitation', cat: 'econ', lean: 'D', stanceKeys: [], keywords: ['worker','workers','wage','minimum wage','union','labor','paid leave','overtime','collective bargaining','cost of living','affordable','middle class','jobs'] },
      econ_corp_account:  { label: '🏦 Corporate Accountability', chip: 'Use antitrust and anti-price-gouging enforcement to check large corporations', cat: 'econ', lean: 'D', stanceKeys: [], keywords: ['corporate accountability','price gouging','monopoly','antitrust','big corporation','wall street','profiteering','consumer protection','fair competition','executive pay'] },
      // SCOPE (rural_ag), argued out September 2026. This key shipped as a one-line
      // entry with no boundary, and two federal waves refused to USE it in writing for
      // exactly that reason: F9 declined H.Amdt. 202 and H.Amdt. 207 on it ("rural_ag
      // has no argued-out scope note either"), and F3 refused it on a keyword collision
      // with the literal string 'rural broadband' in the list below. Those refusals
      // stand. What follows is the boundary they were missing, read off the instruments
      // already mapped here rather than off the label.
      //   THE INSTRUMENTS ON FILE, which are what the boundary is drawn from: the 2026
      //   farm bill (H.R. 7567 — commodity programs, crop insurance and reference prices
      //   for producers), Utah S.B. 269 (access to the data, software and parts needed to
      //   repair agricultural equipment), Utah H.B. 187 (a veterinary-licensure exemption
      //   for bovine pregnancy testing, an operating cost carried by producers), Utah
      //   H.B. 371 (the LeRay McAllister Working Farm and Ranch Fund and county rollback
      //   revenue pointed at keeping working farms in production), Utah S.B. 113 (local
      //   ordinances barred from prohibiting an animal enterprise or a working animal),
      //   and Utah H.B. 114 (livestock theft, filed secondary because the mechanism is
      //   criminal-defence law).
      //   IN:  the operating economics of farming and ranching as a business — commodity
      //        programmes, crop insurance and reference prices, the cost and legality of
      //        running a herd or repairing the equipment, working-farm and working-animal
      //        land kept in production, and farm and ranch water rights, which the
      //        private-property and water-conservation comments in this file both send
      //        here by name.
      //   OUT: rural broadband and rural infrastructure as public works (broadband,
      //        infrastructure). The keyword list below carries the phrase and a keyword
      //        match is not a mapping — that is F3's refusal in one line. Also OUT: an
      //        emissions rule that happens to name farm equipment (climate_action, whose
      //        written boundary is emissions, and whose own refusal says the commodity the
      //        equipment is used on is not the subject); reducing or pricing water DEMAND
      //        (water) and building water SUPPLY (water_storage); a data centre's
      //        agricultural water purchases (datacenter_water); what a government may take
      //        from a parcel (property_rights); rural health facilities (health_rural);
      //        and the all-of-the-above stewardship framing (enviro_balance).
      // POLARITY: 'support' = the vote favoured the working farm or ranch — funded it, cut
      // a cost it carries, or removed a restriction on it. 'oppose' = it ran the other
      // way. Every instrument on file to date is coded yea_supports; nothing here promises
      // the next one will be.
      rural_ag:           { label: '🌾 Farmers & Rural Communities', chip: 'Support family farms, ranchers and rural communities with fair prices and access', cat: 'econ', stanceKeys: [], keywords: ['agriculture','farm','farmer','farming','ranch','rancher','rural','crop','livestock','farm bill','rural broadband','rural community','grazing','drought','water right'] },

      // SCOPE (dev_district_finance): the special-purpose district and its money. A single
      // recurring instrument — draw a boundary, seat a board, and let it capture sales-tax
      // and property-tax increment (or levy its own, or issue bonds) to pay for a stadium,
      // a convention centre, a resort zone or a project area. Five instruments across two
      // sessions asked for it and were refused for want of a key: 2024 H.B. 562 (creates
      // the Fairpark Area Investment and Restoration District, new local taxes, privilege
      // tax on state land, impact-fee prohibitions, authority to help build a stadium),
      // 2025 S.B. 336 (Fairpark modifications, a public infrastructure district empowered
      // to levy property taxes and issue bonds), 2025 S.B. 316 (MIDA and development-zone
      // finance, a construction-materials distribution formula, project-area agreements,
      // PID subsidiaries), 2025 S.B. 26 (a convention-centre reinvestment zone capturing
      // state and local sales tax and property-tax increment) and 2025 S.B. 337 (the
      // Beehive Development Agency). Every one of them creates or widens the mechanism;
      // none of them contracts it. The chip states the support direction, so every mapping
      // is coded yea_supports = the vote created or widened a capture district.
      // OUT of scope, and why the nearby chips do not cover it: econ_growth is federal
      // business deregulation and a tax-increment district is the opposite posture — a
      // targeted public subsidy, not a rollback. prop_tax and property_tax are about what
      // a household pays; a PID levy is a new taxing body, and filing it under either
      // would read as "voted for property tax relief". housing_build and housing_support
      // are refused here on purpose: several of these bills carry housing provisions, but
      // the refusal notes recorded that those provisions are tightened and loosened in the
      // same text and are secondary to a financing tool, so a housing key would be reading
      // the title. infrastructure is the built network itself, not the district that
      // finances it. Deliberately carries NO `lean`: stadium and convention-centre finance
      // splits both parties between the deal's boosters and its fiscal critics.
      dev_district_finance: { label: '🏟 Development Districts & Public Financing', chip: 'Create special districts that capture tax revenue to finance stadiums, convention centers and development zones', cat: 'econ', stanceKeys: [], keywords: ['development district','reinvestment zone','tax increment','property tax differential','public infrastructure district','special district','stadium','convention center','fairpark','mida','military installation development authority','project area','resort community','bonding authority','economic development zone'] },

      // ── Infrastructure & Transportation ──
      infrastructure:     { label: '🚧 Rebuild Roads & Bridges', chip: 'Invest in roads, bridges, water systems and the power grid', cat: 'infra', stanceKeys: [], keywords: ['infrastructure','roads','bridges','highway','public works','transportation','grid','power grid','water systems','airport','rebuild','construction'] },
      broadband:          { label: '📶 Universal Broadband', chip: 'Bring fast, affordable internet to rural and underserved communities', cat: 'infra', stanceKeys: [], keywords: ['broadband','internet access','rural broadband','digital divide','connectivity','fiber','high-speed internet','fcc','underserved'] },
      // SCOPE (transit): moving people without a car, and the money that pays for it.
      // The instruments on file are local option sales and use tax revenue opened to
      // transit capital and to public transit innovation grants, a Transit Access Pass
      // for Students pilot, ridership and expenditure reporting by a large transit
      // district, station-area and connectivity planning, retention of department-owned
      // transit property, bicycle-lane protection, and the federal public transportation
      // and passenger rail reauthorisations.
      //   OUT: roads, bridges, water systems and the grid (infrastructure); housing
      //        supply and the affordability terms inside a housing and transit
      //        reinvestment zone (housing, housing_build, housing_support) — a
      //        transit-zone bill whose amendments are about housing terms is filed here
      //        only as a secondary slice; the district that captures the tax increment
      //        (dev_district_finance); and vehicle emission rules (climate_action,
      //        energy_production).
      // POLARITY: 'support' = the vote funded, protected or expanded non-car mobility. A
      // bill that funds nothing and builds nothing sits at the narrow-link floor rather
      // than reading as a service expansion.
      transit:            { label: '🚆 Public Transit & Transportation', chip: 'Expand reliable public transit and modern transportation options', cat: 'infra', lean: 'D', stanceKeys: [], keywords: ['public transit','transit','bus','rail','light rail','commuter','transportation','infrastructure','mobility','high-speed rail'] },

      // ── Water & Environment ──
      // SCOPE (water): the DEMAND side of the water problem — how much is used, by whom,
      // and at what price. Every instrument on file is a conservation measure: water
      // wise landscaping requirements on state facilities and a nonfunctional-turf
      // limit, restrictions on overhead spray irrigation by governmental entities,
      // water-efficient landscaping incentives and conservancy district grants,
      // conservation-based and tiered secondary retail rates made legally defensible,
      // state agency water-use reporting and smart irrigation controllers, conservation
      // outreach through the schools, school energy and water reduction grants, and a
      // water consumption fee that funds water infrastructure. None of them runs the
      // other way, which is why the chip states the conservation direction and every
      // mapping is coded yea_supports.
      //   IN:  reducing, pricing or measuring water DEMAND, and the landscaping,
      //        procurement, rate and disclosure instruments that do it.
      //   OUT: the SUPPLY side — reservoirs, pipelines, recycling and new storage
      //        capacity (water_storage); drinking-water and wastewater systems as
      //        public works (infrastructure); a data centre's cooling water and
      //        agricultural water purchases, which have their own guardrail key
      //        (datacenter_water); and farm and ranch water rights (rural_ag). A vote to
      //        BUILD water supply is not a vote to use less of it, and filing one here
      //        would print it as a conservation record.
      // POLARITY: 'support' = the vote reduced, priced or measured water use. 'oppose' =
      // it removed a conservation requirement or its funding. A conservation outreach or
      // messaging bill sits at the narrow-link floor; the direction is not in question,
      // the size of the measure is.
      water:              { label: '💧 Water Conservation', chip: 'Conserve water and protect rivers and the Great Salt Lake from drying up', cat: 'enviro', stanceKeys: [], keywords: ['water','water right','water policy','drought','great salt lake','lake powell','bear river','conservation','colorado river'] },
      water_storage:      { label: '🚰 Water Storage & Infrastructure', chip: 'Build reservoirs, pipelines and recycling to secure future water supply', cat: 'enviro', stanceKeys: [], keywords: ['water','water storage','reservoir','dam','pipeline','infrastructure','water supply','recycling','water reuse','aquifer','lake powell pipeline','drought','colorado river'] },
      enviro_balance:     { label: '⚖️ Practical Stewardship', chip: 'Protect clean air and water while keeping responsible jobs in farming and energy', cat: 'enviro', stanceKeys: [], keywords: ['conservation','environment','stewardship','clean air','clean water','recreation','balance','wildlife','land','responsible'] },
      // SCOPE (climate_action): programmes, subsidies and rules that cut emissions —
      // and their repeal. The instruments on file are the clean-energy production and
      // investment credits, a home-electrification rebate programme and the act
      // repealing it, the Clean Air Act waivers behind vehicle and truck zero-emission
      // sales mandates and the resolutions revoking them, an appropriation for
      // international climate finance and the amendment striking it, state residential
      // and commercial solar credits and their repeal, new state assessments on wind and
      // solar generation, and emission-reducing equipment credits and procurement.
      //   IN:  whether an emissions-reducing programme, credit, rule or waiver is
      //        created, funded, repealed or taxed.
      //   OUT: how much conventional supply there is (energy_production) and the
      //        all-of-the-above framing (enviro_energy, enviro_balance). The two vehicle
      //        waiver resolutions are filed on BOTH keys in OPPOSITE directions on
      //        purpose: a yea removed a limit on conventional vehicle sales AND rolled
      //        back a state climate rule, and both are true of the same vote. Also OUT:
      //        water conservation (water), public lands (lands_preserve), and how long a
      //        project review takes (permitting_reform).
      // POLARITY: 'support' = the vote created or funded an emissions-reducing
      // programme. 'oppose' = it repealed, defunded or taxed one. A measure whose
      // receipts are directed to some other public purpose is held below the top weight
      // because it is not purely a penalty.
      climate_action:     { label: '🌱 Climate Action & Clean Energy', chip: 'Act on climate and invest in clean energy', cat: 'enviro', lean: 'D', stanceKeys: [], keywords: ['climate','clean energy','renewable','renewables','emissions','carbon','greenhouse','solar','wind','pollution','environment','air quality','conservation','paris agreement','electric vehicle'] },
      enviro_energy:      { label: '⚡ Energy Independence', chip: 'Use every energy source — gas, nuclear and renewables — to keep power reliable and affordable', cat: 'enviro', lean: 'R', stanceKeys: [], keywords: ['energy','energy independence','nuclear','natural gas','oil','grid','reliable','affordable','all of the above','domestic energy','baseload'] },
      // SCOPE (energy_production): how much conventional supply and firm generating
      // capacity exists, and how hard it is to retire. The instruments on file are
      // federal lease sales and reopened acreage, pipeline authorisations ratified and
      // removed from judicial review, an emergency declaration directing agencies to use
      // emergency authorities to expedite domestic production and the resolutions
      // terminating it, and a coherent block of state bills: dispatchable-resource state
      // energy policy, cost-recovery terms for proven in-state generation,
      // determinations required before a commission may authorize early retirement of a
      // plant, a state authority to buy a facility slated for decommissioning, a bar on
      // disabling an existing coal unit, and full cost attribution for supplemental
      // resources in an integrated resource plan.
      //   IN:  supply and firm capacity — leasing, drilling, pipelines, nuclear, and
      //        keeping existing thermal generation online.
      //   OUT: emissions programmes and clean-energy subsidies (climate_action) — the
      //        same vehicle waiver resolutions are filed on both keys in opposite
      //        directions, because a yea did both things. Also OUT: the
      //        all-of-the-above framing (enviro_energy), who owns the land it happens on
      //        (lands_energy, lands_local), how long the federal review takes
      //        (permitting_reform), and a data centre's own power and ratepayer
      //        guardrails (datacenter_power).
      // POLARITY: 'support' = the vote expanded conventional supply or kept generation
      // online. 'oppose' = it withdrew an authority or an asset from production —
      // terminating the energy emergency is filed yea_opposes for exactly the authorities
      // the declaration itself is filed yea_supports for, and the polarity of the two
      // rows is required to match in that mirrored way.
      energy_production:  { label: '🛢 Expand Domestic Energy Production', chip: 'Unleash American oil, gas and nuclear to lower energy prices and boost independence', cat: 'enviro', lean: 'R', stanceKeys: [], keywords: ['energy production','domestic energy','drill baby drill','drill','oil','gas','oil gas','oil and gas','natural gas','nuclear energy','nuclear','energy independence','fossil fuels','pipeline','lng'] },
      disaster_resilience:{ label: '🔥 Wildfire & Disaster Resilience', chip: 'Prepare for wildfires, floods and droughts and speed up disaster recovery', cat: 'enviro', stanceKeys: [], keywords: ['wildfire','fire','drought','flood','flooding','disaster','fema','emergency','resilience','mitigation','recovery','natural disaster','preparedness'] },
      // SCOPE, deliberately narrow. Split out of gov_regulation (August 2026). The
      // measures under it are a coherent cluster the parent key could not describe:
      // H.R. 3746 (NEPA scope, page and time limits, a lead agency), H.R. 471
      // (expedited review for forest-management projects) and H.R. 1949
      // (consolidates authorisation at FERC) are about how long a federal review of
      // a PROJECT takes and who may challenge it — not about how many rules bind a
      // business. It has a genuine cross-party stance coalition, which is the tell
      // that it is a real axis and not a synonym: Westerman and Graves (R) sit next
      // to Golden (D) and Fedorchak (R) on the same side of it.
      //   IN:  the scope of environmental review; statutory page and deadline limits
      //        on it; lead-agency and one-federal-decision consolidation; the window
      //        in which a completed permit may be sued over.
      //   OUT: whether the project itself is a good idea (energy_production,
      //        climate_action, infrastructure); local zoning and housing approvals
      //        (housing_build); occupational licensing and small-business paperwork
      //        (econ_smallbiz); and the size of the federal rulebook generally
      //        (gov_regulation).
      // POLARITY: 'support' = narrower review and firm deadlines. 'oppose' = keeps
      // the current scope of review and the ability to challenge a permit.
      permitting_reform:  { label: '⏱ Faster Permits & Reviews', chip: 'Speed up federal permits by narrowing environmental review and setting firm deadlines', cat: 'enviro', stanceKeys: [], keywords: ['permitting','permitting reform','permit','nepa','environmental review','environmental impact statement','categorical exclusion','judicial review deadline','lead agency','one federal decision','transmission siting','ferc','project delay','litigation window'] },

      // ── Housing & Cost of Living ──
      // SCOPE (housing): affordability as the whole subject — the cost of building and
      // the cost of buying, taken together, which is where a bill lands when its own
      // general provisions name housing affordability generally as the subject. The
      // instruments on file are additional density authorised in exchange for stated
      // requirements, incentives for owner-occupied affordable housing, moderate income
      // housing plan and reporting duties, a state housing plan, limits on how local
      // land use regulation may treat parking spaces, protection for co-owned homes
      // against land use regulation that singles them out, home ownership promotion and
      // first home investment zones, and the Utah Homes Investment Program and Utah
      // Housing Corporation sunset provisions.
      //   OUT: supply mechanics alone (housing_build) and subsidy and renter protection
      //        alone (housing_support) — a bill that does two of the three carries a
      //        slice on each with different weights rather than one slice here. Also
      //        OUT: the household price basket (cost_living), property tax
      //        (property_tax, prop_tax), first purchase specifically
      //        (housing_first_time), homelessness (homeless), the owner's hand against
      //        government (property_rights), and the district that finances a project
      //        (dev_district_finance).
      // POLARITY: 'support' = the vote lowered the cost to build or to buy. A maintenance
      // bill that keeps an existing instrument workable is weighted deliberately low to
      // say that keeping a zone workable is a smaller thing than creating it.
      housing:            { label: '🏠 Housing Affordability', chip: 'Make housing more affordable by boosting supply and lowering the cost to build and buy', cat: 'housing', stanceKeys: [], keywords: ['housing','housing affordability','affordable housing','home prices','housing cost','cost of housing','housing crisis','housing supply','home ownership','homeownership','rent','mortgage','starter home','zoning','shortage'] },
      // SCOPE (housing_build): SUPPLY mechanics — the regulatory and approval barriers
      // between a parcel and a finished unit. The instruments on file are a widened
      // internal accessory dwelling unit definition with limits on a political
      // subdivision's authority to restrict one, a new subdivision review and approval
      // process, penalties for a subdivision that fails to file its moderate income
      // housing report, caps on parking requirements, a lowered minimum population for
      // incorporating a new town, and the federal Road to Housing Act's Housing Supply
      // Frameworks, Build Now and streamlining titles.
      //   OUT: subsidy, tax credits and renter protection (housing_support), and
      //        affordability as a whole (housing). Also OUT: federal environmental
      //        review of projects (permitting_reform), which names local zoning and
      //        housing approvals as OUT of its own scope and points here; and the
      //        owner's side of the same zoning bill (property_rights).
      // POLARITY: 'support' = the vote reduced what a project must satisfy before it may
      // be built, or paid for units to be built. A bill reaching one requirement and
      // nothing else — parking, and nothing else — is filed as a secondary to say so.
      housing_build:      { label: '🏗 Build More Housing', chip: 'Loosen zoning and permitting so more homes — including apartments — can be built', cat: 'housing', stanceKeys: [], keywords: ['housing','home building','zoning','permitting','supply','construction','development','affordable housing','housing cost','red tape','density'] },
      cost_living:        { label: '🛒 Tackle the Cost of Living', chip: 'Make lowering rent, grocery, gas and utility prices the top economic priority', cat: 'housing', stanceKeys: [], keywords: ['cost of living','inflation','affordable','rent','prices','grocery','gas prices','mortgage','family budget','wage','middle class','utilities'] },
      // SCOPE (housing_support): public money for below-market housing, and the renter's
      // position in the landlord-tenant code. The instruments on file are the aggregate
      // state low-income housing tax credit and its pass-through, an annual transfer of
      // liquor sale revenue into the Olene Walker Housing Loan Fund, redevelopment and
      // community development agency authority to fund income targeted housing,
      // pass-through funding agreements for affordable housing investment, Utah Housing
      // Preservation Fund reporting, advance notice before a rent increase takes effect,
      // and notice, lease-termination and ninety-day increase-freeze duties on the new
      // owner of a multifamily building.
      //   OUT: making it cheaper or easier to BUILD (housing_build) and affordability as
      //        a whole (housing) — a bill carrying both a subsidy provision and a
      //        construction provision is filed on each with different weights. Also
      //        OUT: shelter and services (homeless), first purchase
      //        (housing_first_time), and property tax (property_tax).
      // POLARITY: 'support' = the vote funded below-market housing or added a renter
      // protection. A housing clause attached as a condition on a transportation tax is
      // a secondary, because the condition is not the programme.
      housing_support:    { label: '🏘 Affordable Housing & Renters', chip: 'Fund affordable housing and protect renters with assistance and limits on evictions', cat: 'housing', lean: 'D', stanceKeys: [], keywords: ['affordable housing','renter','rent','tenant','housing assistance','homeless','homelessness','public housing','housing voucher','eviction','low-income'] },
      homeless:           { label: '🏕 Homelessness Policy', chip: 'Tackle homelessness with shelter, mental-health and addiction services, and keeping public spaces clear', cat: 'housing', stanceKeys: [], keywords: ['homeless','homelessness','unhoused','homeless encampment','encampment','homeless shelter','shelter','housing first','panhandling','vagrancy','transient','street homelessness','tent','mental health','addiction','wraparound services'] },
      property_tax:       { label: '🏡 Lower Property Taxes (Housing)', chip: 'Cap property taxes so families and seniors can afford to stay in their homes', cat: 'housing', stanceKeys: [], keywords: ['property tax','property taxes','homeowner','home value','assessment','tax relief','seniors','fixed income','homestead','escrow'] },
      housing_first_time: { label: '🔑 Help First-Time Buyers', chip: 'Help first-time and young buyers afford their first home', cat: 'housing', stanceKeys: [], keywords: ['first-time buyer','first time home','down payment','starter home','young families','homeownership','home buyer','first home','american dream','mortgage rate','closing costs'] },

      // ── Criminal Justice & Public Safety ──
      back_police:        { label: '👮 Back Law Enforcement', chip: 'Fund police and impose tougher penalties for violent crime', cat: 'justice', lean: 'R', stanceKeys: [], keywords: ['police','law enforcement','public safety','crime','tough on crime','fund the police','sheriff','violent crime','fentanyl','cartel','border crime','safety'] },
      // SCOPE (tough_on_crime): criminal exposure and time served — what is an offence,
      // at what level, and how long a person or a case stays in the system. The
      // instruments on file are increased penalties for human trafficking for sexual
      // exploitation, mandatory imprisonment for repeat and habitual sex offenders,
      // widened child sexual abuse material definitions with a lowered mental state and
      // the lesser penalty tier removed, rewritten lewdness elements, mandatory jail for
      // certain drug and theft offences committed with specified prior convictions,
      // restricted juvenile nonjudicial adjustment and expungement, and a sentencing
      // enhancement for assault on a referee.
      //   IN:  offence elements, offence levels, mandatory minimums, sentencing
      //        enhancements, and how long a record or a case stays in the formal system.
      //   OUT: funding and backing law enforcement itself (back_police), the
      //        accountability pairing (justice_balance), sentencing reform in the other
      //        direction (justice_reform), cannabis (cannabis_reform), immigration
      //        detention and removal (deportations, border_security), and fentanyl
      //        trafficking sanctions (immig_fentanyl).
      // POLARITY: 'support' = the vote increased exposure to punishment or time in
      // custody. Every instrument on file runs that way, and the rationales say so in
      // those words. A bill that is a single enhancement for one class of victim sits at
      // the narrow-link floor: the link is real, the measure is narrow.
      tough_on_crime:     { label: '🚔 Tough on Crime', chip: 'Crack down on crime with strong policing and tougher sentences for offenders', cat: 'justice', lean: 'R', stanceKeys: [], keywords: ['tough on crime','law and order','crime','violent crime','policing','police','criminal justice','repeat offenders','sentencing','safe streets','retail theft'] },
      justice_balance:    { label: '⚖️ Safe & Fair Justice', chip: 'Fund police while adding training, body cameras and accountability for misconduct', cat: 'justice', stanceKeys: [], keywords: ['public safety','police','criminal justice','reform','accountability','community policing','safer communities','due process','rehabilitation','fair','balanced'] },
      justice_reform:     { label: '🤝 Criminal Justice Reform', chip: 'Reform sentencing and reduce mass incarceration', cat: 'justice', lean: 'D', stanceKeys: [], keywords: ['criminal justice reform','sentencing','incarceration','prison','first step act','bail reform','mass incarceration','reentry','rehabilitation','second chance','clemency','police reform'] },
      cannabis_reform:    { label: '🌿 Cannabis Reform', chip: 'Legalize or decriminalize cannabis and clear past low-level convictions', cat: 'justice', stanceKeys: [], keywords: ['cannabis','marijuana','legalization','legalize','decriminalize','expunge','expungement','drug policy','hemp','recreational','medical marijuana'] },

      // ── Abortion & Reproductive Rights ──
      pro_life:           { label: '🕊 Pro-Life Protections', chip: 'Protect the unborn and limit abortion', cat: 'repro', lean: 'R', stanceKeys: [], keywords: ['pro-life','pro life','abortion','unborn','life','sanctity of life','heartbeat','dobbs','defund planned parenthood','adoption'] },
      repro_balance:      { label: '⚖️ Limits With Exceptions', chip: 'Allow early-term access with limits and clear exceptions', cat: 'repro', stanceKeys: [], keywords: ['abortion','reproductive','exceptions','rape','incest','life of the mother','viability','state','moderate','common ground','contraception'] },
      pro_choice:         { label: '✊ Protect Reproductive Rights', chip: 'Protect abortion access and reproductive freedom', cat: 'repro', lean: 'D', stanceKeys: [], keywords: ['reproductive rights','abortion rights','pro-choice','pro choice','roe','reproductive freedom','women\'s health','planned parenthood','bodily autonomy','contraception'] },

      // ── Civil Rights & LGBTQ+ ──
      // SCOPE (religious_liberty): room for religious exercise and conscience inside a
      // public institution. The instruments on file are a bar on compelling an employee
      // to communicate or act against a sincerely held religious belief with an
      // accommodation process, a bar on an institution of higher education denying a
      // belief-based student organisation recognition for requiring adherence to its own
      // standards, volunteer chaplains permitted in schools, a school's duties when a
      // student refrains from participating on religious grounds, a broadened prayer and
      // devotional provision, state holy days and a personal preference day to observe
      // one, the Ten Commandments added to a curriculum list, and military chaplain
      // protections enforceable under the Uniform Code of Military Justice.
      //   OUT: equal-treatment law and the balance position (rights_balance),
      //        recognition and anti-discrimination protection (lgbtq_rights) — the two
      //        are scored independently and a bill touching both carries a slice on
      //        each. Also OUT: speech and platform censorship (free_speech), diversity
      //        mandates (end_dei), abortion (pro_life), and parental consent as a
      //        schooling right (edu_parental).
      // POLARITY: 'support' = the vote widened protection for religious exercise or
      // conscience. Every instrument on file runs that way. A single clause sitting
      // beside provisions on another subject is filed as a secondary rather than as the
      // bill's meaning.
      religious_liberty:  { label: '⛪ Religious Liberty Focus', chip: 'Protect religious freedom and conscience rights', cat: 'rights', lean: 'R', stanceKeys: [], keywords: ['religious liberty','religious freedom','faith','conscience','traditional values','first amendment','parental rights','free exercise'] },
      rights_balance:     { label: '⚖️ Equal Treatment for All', chip: 'Protect equal treatment in jobs and housing while protecting religious conscience', cat: 'rights', stanceKeys: [], keywords: ['civil rights','equality','equal treatment','fairness','anti-discrimination','tolerance','respect','liberty','balanced','common ground'] },
      // SCOPE (lgbtq_rights): legal recognition and protection on the basis of sexual
      // orientation and gender identity. Most instruments on file run against the chip's
      // direction, and the mapping reads that off the face of the text rather than off a
      // stated purpose: transition-related hormonal treatment and surgery barred while a
      // person is in state custody, inmate housing assigned by biological sex, a shield
      // for a parent who declines to allow or support a minor's transition, protection
      // for an employee who declines to use a person's stated pronouns, a codified
      // military service ban, TRICARE coverage exclusions, and a sports participation
      // ban at Defense Department schools — against a gestational agreement statute
      // rewritten to stop assuming an opposite-sex marriage, which is a narrow
      // recognition gain.
      //   OUT: religious exercise and conscience (religious_liberty), the
      //        equal-treatment pairing (rights_balance), diversity mandates (end_dei),
      //        and speech (free_speech). Also OUT: parental decision rights over
      //        schooling (edu_parental) — a parental-affirmation shield is filed here
      //        because the protected conduct is defined by refusing a transgender
      //        person's transition, not by parental authority generally.
      // POLARITY: 'support' = the vote added or preserved recognition or protection.
      // 'oppose' = it subtracted one. The direction is read off the operative provision,
      // whatever the bill's stated purpose in enacting it.
      lgbtq_rights:       { label: '🏳️‍🌈 Protect LGBTQ+ Rights', chip: 'Protect LGBTQ+ rights and anti-discrimination laws', cat: 'rights', lean: 'D', stanceKeys: [], keywords: ['lgbtq','lgbt','gay','transgender','marriage equality','respect for marriage','anti-discrimination','equality','civil rights','pride','equal protection'] },
      free_speech:        { label: '🗣 Free Speech Protections', chip: 'Protect free speech and limit government and Big Tech censorship', cat: 'rights', stanceKeys: [], keywords: ['free speech','first amendment','censorship','deplatform','viewpoint','expression','speech','big tech censorship','content moderation','silenced'] },
      end_dei:            { label: '🚫 End DEI Programs', chip: 'End diversity, equity and inclusion mandates in government and schools in favor of merit', cat: 'rights', lean: 'R', stanceKeys: [], keywords: ['dei','dei programs','diversity equity inclusion','diversity','equity','inclusion','end dei','anti-dei','anti dei','merit','merit based','meritocracy','affirmative action','colorblind','woke','wokeness','identity politics','critical race theory','crt'] },

      // ── Foreign Policy & Defense ──
      // SCOPE (strong_defense): what the armed forces are authorised, funded and
      // equipped to do. The instruments on file are the annual National Defense
      // Authorization Acts and their end strengths, procurement, military construction
      // and Department of Energy national security programmes; the Department of Defense
      // appropriations titles; the CHIPS defense fund and secure semiconductor supply
      // chains; Foreign Intelligence Surveillance Act Title VII reauthorisation as a
      // counterterrorism and counterintelligence tool; a servicemember quality-of-life
      // title; and a fuel supply chain amendment.
      //   OUT: whether CONGRESS must authorise the use of force, which is a who-decides
      //        claim held on both sides of the funding question (war_powers) — the Iran
      //        hostilities resolution is filed here as a secondary yea_opposes because
      //        it withdraws forces from an ongoing engagement, and on war_powers for the
      //        authorisation question, and both readings are true of the one vote. Also
      //        OUT: foreign aid and commitments abroad (america_first_fp), support for
      //        Israel (israel_support), the restraint and alliance postures (restraint,
      //        foreign_balance), and surveillance seen from the other side
      //        (privacy_rights), which carries the mirrored slice on section 702.
      // POLARITY: 'support' = the vote authorised, funded or equipped the armed forces.
      // An authorisation carrying unrelated social-policy riders is weighted below a
      // clean one, because passage is then not a pure posture signal; an appropriations
      // vehicle is weighted below an authorisation because it sets amounts for programmes
      // authorised elsewhere and takes no position on force structure, procurement or
      // posture.
      strong_defense:     { label: '🦅 Peace Through Strength', chip: 'Maintain the strongest military and stand firm abroad', cat: 'foreign', lean: 'R', stanceKeys: [], keywords: ['national defense','military','defense spending','ndaa','peace through strength','national security','armed forces','deterrence','china','adversaries','strong military'] },
      foreign_balance:    { label: '⚖️ Strategic Engagement', chip: 'Keep a strong military but lead through NATO and allied diplomacy, not solo action', cat: 'foreign', stanceKeys: [], keywords: ['foreign policy','diplomacy','alliances','nato','national security','strategic','allies','defense','engagement','statecraft','bipartisan'] },
      restraint:          { label: '🕊 Diplomacy & Restraint', chip: 'Prioritize diplomacy and limit foreign military intervention', cat: 'foreign', stanceKeys: [], keywords: ['diplomacy','restraint','end endless wars','foreign aid','intervention','peace','de-escalation','troops home','war powers','negotiation'] },
      america_first:      { label: '🇺🇸 America First', chip: 'Put U.S. interests first and avoid foreign entanglements', cat: 'foreign', lean: 'R', stanceKeys: [], keywords: ['america first','foreign aid','sovereignty','national interest','entanglement','ukraine aid','nation building','trade','tariff','border'] },
      // SCOPE, narrowed August 2026. The old chip bundled three unrelated claims —
      // "put U.S. interests first", "end endless wars" and "rethink foreign aid" —
      // and 'support' therefore meant any one of them. Two members filed 'support'
      // here voted OPPOSITE ways on the same two amendments: on H.Amdt. 235 (bar
      // funds for Israel) one voted yea and the other nay, and on H.Amdt. 252 (bar
      // Ukraine funds) the pattern reversed. Both hold their positions fully, and
      // each read as half-contradicting it. A further seven cards under 'support'
      // were about countering China, which the chip never mentioned. It is now about
      // ONE thing: what the United States funds and commits to abroad.
      //   IN:  foreign aid levels and conditions; funding for a specific partner or
      //        conflict; assessed contributions to multilateral bodies; wind-down of
      //        an open-ended commitment.
      //   OUT: whether CONGRESS must authorise the use of force (war_powers) — that
      //        is a claim about who decides, and it is held by members on both sides
      //        of the aid question; whether to intervene at all (restraint);
      //        countering China and military posture toward adversaries
      //        (strong_defense, tariffs_china); and aid to Israel specifically, which
      //        has carried its own key since July 2026 (israel_support).
      // POLARITY: 'support' = cut, condition or wind down U.S. funding and
      // commitments abroad. 'oppose' = keeps or increases them.
      america_first_fp:   { label: '🌐 America First Foreign Aid & Commitments', chip: 'Cut, condition or wind down U.S. foreign aid and open-ended commitments abroad', cat: 'foreign', lean: 'R', stanceKeys: [], keywords: ['america first','foreign aid','foreign assistance','aid package','supplemental','ukraine aid','nation building','sovereignty','national interest','entanglement','burden sharing','usaid','multilateral contributions','conditions on aid'] },
      // Support for Israel gets its own key because the record already exists and is
      // already being mis-filed. 76 sourced stances in ISSUE_STANCE_DATA mention Israel,
      // and they sit under foreign_balance (43), strong_defense (28), restraint (3) and
      // america_first_fp (2) — four general-posture chips, none of which those statements
      // actually address. A senator who funds Israel's missile defense while pressing for
      // conditions on offensive arms is not thereby endorsing "lead through NATO and
      // allied diplomacy"; a member who votes for the Israel Security Supplemental is not
      // thereby endorsing "maintain the strongest military and stand firm abroad". Filing
      // Israel votes into those buckets moves members' percentages on issues the vote was
      // not about — the identical failure the checks_balances comment below records for
      // democracy_balance and gov_balance. It also collapses a real cross-party split:
      // under foreign_balance, Tlaib and Gottheimer are scored on the same chip that
      // neither of them was talking about.
      // POLARITY: the chip states the SUPPORT direction, so every mapping is coded
      // yea_supports = the vote favoured continued U.S. backing for Israel, and an
      // Official Record % under this key means "this share of their judged votes favoured
      // that backing" — not "this share agreed with a process".
      // Deliberately carries NO `lean`: both the pro-Israel coalition and its critics are
      // cross-party (progressive Democrats and America First Republicans vote together to
      // strike Israel funding), so coding this D or R would be false signal.
      // SCOPE: U.S. support for Israel itself — security assistance, weapons transfers and
      // co-development, sanctions on its adversaries, and floor attempts to cut, block or
      // condition that support. Domestic antisemitism measures are OUT of scope: they are
      // civil-rights and campus-speech questions and belong to rights_balance /
      // free_speech / religious_liberty, and pulling them in here would be the same
      // force-fit in the opposite direction.
      israel_support:     { label: '🇮🇱 Support for Israel', chip: 'Keep backing Israel with U.S. security aid, weapons and sanctions on its adversaries', cat: 'foreign', stanceKeys: [], keywords: ['israel','israeli','pro-israel','u.s.-israel','israel aid','aid to israel','iron dome','david\'s sling','arrow-3','idf','iran','hamas','hezbollah','houthi','gaza','west bank','abraham accords','netanyahu'] },
      veterans:           { label: '🎖 Take Care of Veterans', chip: 'Deliver better healthcare, benefits and support for the men and women who served', cat: 'foreign', stanceKeys: [], keywords: ['veteran','veterans','va','veterans affairs','gi bill','servicemember','service member','military families','va health','troops','wounded warrior','military service'] },

      // ── Technology & Privacy ──
      tech_innovation:    { label: '🚀 Innovation & Light Rules', chip: 'Let American tech and AI innovate with minimal red tape', cat: 'tech', lean: 'R', stanceKeys: [], keywords: ['technology','innovation','ai','artificial intelligence','deregulation','tech leadership','startup','crypto','light touch','competitiveness','semiconductor'] },
      crypto_cbdc:        { label: '🪙 Cryptocurrency Rules & Digital Dollar', chip: 'Create clear rules for digital assets while protecting consumers and financial privacy', cat: 'tech', stanceKeys: [], keywords: ['cryptocurrency','crypto','bitcoin','digital asset','stablecoin','genius act','clarity act','blockchain','central bank digital currency','cbdc','digital dollar','financial privacy'] },
      tech_balance:       { label: '⚖️ Smart Tech Guardrails', chip: 'Let tech innovate but require data-privacy, online-safety and age-verification rules', cat: 'tech', stanceKeys: ['dataCenters'], keywords: ['technology','ai','guardrails','regulation','innovation','safety','age verification','social media','consumer protection','balanced','modernization'] },
      // ── Data Centers & Growth (the 'dc' facet family) ──
      // Three flat issue keys let a record be pro-growth yet water/power-skeptical
      // at once — the tension is the data, not an editorial caveat. POLARITY: on
      // datacenter_water and datacenter_power the chip states the PROTECTIVE /
      // guardrail position, so issueStance:'support' = pro-safeguard, 'oppose' =
      // "let them draw/burn/charge freely", and 'mixed' = "backs the project WITH
      // conditions". Every card's issueStance is written relative to its chip.
      datacenter_growth:  { label: '🖥 Data Centers & AI Growth', chip: 'Welcome data-center and AI investment for the jobs, tax base and competitiveness it brings', cat: 'dc', stanceKeys: ['dataCenters'], keywords: ['data center','data centers','datacenter','datacenters','ai data center','ai data centers','ai data','artificial intelligence','server farm','hyperscale','stratos','economic development','jobs','investment','tax revenue','tax base','competitiveness','national security'] },
      datacenter_water:   { label: '💧 Data Centers & Water', chip: 'Require data centers to prove they won’t drain scarce water or the Great Salt Lake — closed-loop cooling and no ag-to-industrial water grabs', cat: 'dc', stanceKeys: [], keywords: ['data center','data centers','datacenter','water usage','water use','cooling','closed-loop','closed loop','great salt lake','drought','water right','water rights','ag water','agricultural water','aquifer','dust','air quality','conservation','stratos'] },
      datacenter_power:   { label: '⚡ Data Centers, Power & Ratepayers', chip: 'Make data centers bring their own clean power and pay their own way, so they don’t raise family utility bills or worsen air pollution', cat: 'dc', stanceKeys: [], keywords: ['data center','data centers','datacenter','power demand','energy demand','grid','power grid','electricity','natural gas','baseload','nuclear','emissions','air pollution','ratepayers','utility bills','cost shift','off-grid','bring your own power','operation gigawatt','stratos'] },
      // SCOPE (privacy_rights): who may collect, hold, move or act on data about a
      // person. The instruments on file are requirements and remedies before police may
      // use investigative genetic genealogy or a third-party DNA specimen, a bar on a
      // governmental entity using or feeding data into a social credit score, a bar on
      // selling or transferring school employee contact information and on requiring
      // technology on an employee's personal device, age verification and maximum
      // default privacy settings on minors' social media accounts, foreign-adversary
      // restrictions on genetic sequencers and on where sequencing data may be stored, a
      // bar on firearm-specific merchant category codes, a bar on automated speed
      // enforcement camera systems on military installations, and section 702 collection
      // authority.
      //   IN:  collection, retention, transfer, surveillance and use of personal data by
      //        a government, an employer or a platform.
      //   OUT: what a rule should say about a sector as a rulebook question —
      //        gov_regulation names this key as the holder of data and platform duties.
      //        Also OUT: speech and censorship (free_speech), digital assets
      //        (crypto_cbdc), platform competition and consumer finance
      //        (econ_corp_account, tech_balance), and defence authorisation as a posture
      //        question (strong_defense), which carries the mirrored slice on section
      //        702.
      // POLARITY: 'support' = the vote constrained collection or use. 'oppose' = it
      // extended or mandated it — a bill converting a discretionary student directory
      // disclosure into a mandatory one is filed yea_opposes because that is the
      // direction of the operative provision, whatever the purpose in sharing; and a
      // reauthorisation that also repeals abouts collection, adds query approvals and
      // requires audits is held below the top weight because the direction is a NET
      // extension rather than a clean one.
      privacy_rights:     { label: '🔒 Privacy & Big-Tech Accountability', chip: 'Protect personal data and hold Big Tech accountable', cat: 'tech', stanceKeys: [], keywords: ['privacy','data privacy','surveillance','fisa','section 702','big tech','data','section 230','antitrust','consumer protection','encryption','warrant'] },

      // ── Elections & Democracy ──
      // Election administration is TWO facets, not one axis. A record can be
      // pro-safeguard and pro-access at the same time (the Utah vote-by-mail
      // position — 24/7 video-surveilled drop boxes, an envelope-ID requirement AND
      // universal mail ballots — is exactly that), or oppose both, or split them. A
      // single blended chip cannot express any of those without editorializing, and
      // democracy_balance's chip ("Require voter ID but keep early voting and mail
      // ballots widely available") forces one composite verdict on members who never
      // took a composite position. So the two facets are keyed separately:
      //   election_security  — safeguards on who votes and how ballots are handled.
      //   voting_access      — how easy it is to register and to cast a ballot.
      // A member may be 'support' on both, 'oppose' on both, or one of each; nothing
      // in the scoring couples them.
      //
      // election_security is a NEW key rather than a reuse of election_integrity or
      // voter_id, for three reasons.
      //   1. "Election integrity" is a movement brand, not a description of a policy.
      //      Its chip narrows the facet to "voter ID and audits", which leaves
      //      chain-of-custody, ballot-handling safeguards and anti-fraud enforcement
      //      with nowhere to go, and it carries lean:'R' — a partisan prior on a
      //      question that draws support across both parties in principle.
      //   2. voter_id names one instrument (photo ID) and then duplicates
      //      election_integrity's keyword list wholesale; every member carrying a
      //      voter_id card also carries an election_integrity card saying the same
      //      thing. A facet key has to be able to hold a chain-of-custody position
      //      that has nothing to do with ID.
      //   3. Both existing keys are already load-bearing on published pages, so they
      //      are left exactly as they are. This is additive: no card is re-keyed, no
      //      lean is changed, no score moves. The older keys keep their cards; new
      //      sourced work lands on the facet keys.
      // POLARITY: the chip states the PRO-SAFEGUARD direction, so issueStance:'support'
      // = backs tighter verification and ballot-handling safeguards, 'oppose' = holds
      // those safeguards are unnecessary or suppressive, 'mixed' = backs safeguards
      // with reservations about a specific mechanism or a federal mandate. An Official
      // Record % under this key means "this share of their judged votes favoured
      // tighter safeguards".
      // Deliberately carries NO `lean`, following israel_support: the coalitions are
      // not clean party blocs — Republicans from universal-mail-ballot states have
      // voted against federal restrictions on mail voting, and audit and
      // chain-of-custody funding passes with cross-party majorities. Coding this R
      // would import election_integrity's prior, which is the thing being avoided.
      // SCOPE: eligibility verification (documentary proof of citizenship, ID),
      // voter-roll maintenance, ballot chain-of-custody and handling rules,
      // post-election audits and audit conditions on election funding, and
      // enforcement against fraud or non-citizen voting. OUT of scope: campaign
      // finance (campaign_finance), redistricting, certification of results and
      // Electoral Count Act questions (checks_balances) — those are not
      // administration of the ballot.
      election_security:  { label: '🔐 Election Security & Ballot Safeguards', chip: 'Verify eligibility and secure how ballots are handled, tracked and audited', cat: 'democracy', stanceKeys: ['campaign'], keywords: ['election security','ballot security','chain of custody','ballot handling','proof of citizenship','documentary proof of citizenship','citizenship verification','noncitizen voting','non-citizen voting','voter id','voter identification','photo id','voter roll','voter rolls','list maintenance','post-election audit','risk-limiting audit','audit','signature verification','ballot tracking','drop box security','election funding conditions','voter fraud','election crimes'] },
      election_integrity: { label: '🗳 Election Integrity', chip: 'Secure elections with voter ID and audits', cat: 'democracy', lean: 'R', stanceKeys: ['campaign'], keywords: ['election integrity','voter id','election security','audit','clean elections','citizenship verification','ballot security','fraud','voter rolls'] },
      voter_id:           { label: '🪪 Voter ID & Election Integrity', chip: 'Require photo ID to vote and tighten safeguards against voter fraud', cat: 'democracy', lean: 'R', stanceKeys: ['campaign'], keywords: ['voter id','voter identification','photo id','election integrity','voter fraud','ballot security','clean elections','citizenship verification','proof of citizenship'] },
      democracy_balance:  { label: '⚖️ Secure & Accessible Voting', chip: 'Require voter ID but keep early voting and mail ballots widely available', cat: 'democracy', stanceKeys: ['termLimits','campaign'], keywords: ['voting','elections','secure','accessible','bipartisan','term limits','transparency','accountability','reform','campaign finance','redistricting','voter id','mail voting','early voting'] },
      // voting_access IS the ballot_access facet — reused rather than duplicated. Its
      // label is descriptive rather than branded, its scope already covers
      // registration ease, early voting, mail ballots and drop boxes, its keywords
      // already include 'ballot access', and every genuine stated access position in
      // the library already sits here. A second key would fragment that record for no
      // gain.
      // POLARITY: the chip states the PRO-ACCESS direction — issueStance:'support' =
      // backs easier registration and more ways to cast a ballot, 'oppose' = backs
      // narrowing them, 'mixed' = backs access with conditions.
      // This key carries lean:'D' while election_security carries none. No longer a
      // scoring asymmetry — nothing in the match reads `lean` since the party nudge was
      // retired. Left in place as branding-disambiguation data for word-action.js.
      voting_access:      { label: '📩 Expand Voting Access', chip: 'Protect and expand access to the ballot box', cat: 'democracy', lean: 'D', stanceKeys: [], keywords: ['voting rights','voting access','ballot access','mail voting','early voting','automatic registration','john lewis','enfranchise','expand voting','democracy'] },

      // ── Government Reform & Term Limits ──
      term_limits:        { label: '⏳ Term Limits for Congress', chip: 'Set term limits so Congress gets fresh faces instead of career politicians', cat: 'reform', stanceKeys: ['termLimits'], keywords: ['term limit','term limits','career politician','citizen legislator','rotation in office','government reform','accountability','revolving door'] },
      // SCOPE (gov_transparency): what the public is entitled to be told about
      // officeholders, and about the basis on which a decision was made. The instruments
      // on file are preservation and public release of monetary settlement records
      // involving sexual harassment, a bar on Members serving on a for-profit board,
      // conflict-of-interest rules for Members and senior staff, presidential and vice
      // presidential divestment and candidate disclosure, an amendment limiting earmark
      // disclosure, agency publication of the critical factual material relied on in
      // rulemaking and guidance, disclosure of foreign influence in schools as a
      // condition of federal education funding, and posted performance reports for
      // online course providers paid with public money.
      //   OUT: campaign and outside money (campaign_finance), the member stock trading
      //        ban as its own chip (stock_trading_ban), auditing agencies and the
      //        Federal Reserve (audit_spending), term limits (term_limits), the
      //        practical-reform blend (reform_balance), and administration of the ballot
      //        (election_security).
      // POLARITY: 'support' = the vote required more disclosure. 'oppose' = it required
      // less, and the earmark-disclosure limit is filed that way. A disclosure duty
      // covering one programme's provider reports sits at the narrow-link floor rather
      // than reading as a transparency record.
      gov_transparency:   { label: '🔍 Transparency & Anti-Corruption', chip: 'Force more disclosure, ban member stock trading and toughen ethics rules', cat: 'reform', stanceKeys: ['campaign'], keywords: ['transparency','ethics','anti-corruption','disclosure','stock trading','insider trading','accountability','open government','dark money','lobbying','conflict of interest','government reform','swamp'] },
      campaign_finance:   { label: '💸 Get Money Out of Politics', chip: 'Limit big money and super-PAC influence over our elections', cat: 'reform', lean: 'D', stanceKeys: ['campaign'], keywords: ['campaign finance','super pac','dark money','citizens united','money in politics','small donor','public financing','lobbying','special interests','election reform','disclosure'] },
      audit_spending:     { label: '🧾 Audit Spending & the Fed', chip: 'Audit federal agencies and the Federal Reserve and root out wasteful spending', cat: 'reform', lean: 'R', stanceKeys: ['audit','debt'], keywords: ['audit','audit the fed','federal reserve','wasteful spending','spending','government efficiency','accountability','deficit','debt','fraud','government waste','improper payments','duplicate programs'] },
      // SCOPE (cut_spending): taking money back or holding it down, line by line. The
      // instruments on file are a rescission act cancelling unobligated balances already
      // appropriated, budget resolution instructions directing committees to find net
      // spending reductions, account-level reduction amendments, Medicaid and SNAP
      // eligibility and work-requirement tightening recorded as the spending reductions
      // they are, an offset that rescinds enforcement funding to pay for new spending,
      // and a report on a federal payroll reduction as a savings measure.
      //   OUT: the fiscal total and whether the deficit moved (national_debt), auditing
      //        and waste as a process question (audit_spending, gov_waste), the
      //        balanced-budget framing (gov_balance), tax rates (lower_taxes), and what
      //        the money buys (gov_services, public_schools, healthcare) — a Medicaid
      //        title is filed here for the reduction and on the programme's own key for
      //        the contraction, and the reader is shown both.
      // POLARITY: 'support' = the vote cancelled, reduced or held down federal spending.
      // Where the same act's tax title runs the other way on the fiscal total, that is
      // read on its own chip rather than netted out here. A reporting requirement is
      // filed as a secondary and low-weight because it is not a cut.
      cut_spending:       { label: '✂️ Cut Federal Spending & Reduce Debt', chip: 'Slash federal spending and the national debt by cutting waste and shrinking government', cat: 'reform', lean: 'R', stanceKeys: ['debt','audit'], keywords: ['federal spending','cut spending','spending cuts','national debt','government waste','doge','deficit','shrink government','fiscal responsibility','overspending','bloat'] },
      stock_trading_ban:  { label: '🚫 Ban Congressional Stock Trading', chip: 'Ban members of Congress from trading individual stocks while in office', cat: 'reform', stanceKeys: ['campaign'], keywords: ['stock trading','congressional stock','member stock','insider trading','stock act','trading ban','financial conflict','conflict of interest','ban stock','blind trust','self-dealing','transparency'] },
      scotus_reform:      { label: '⚖️ Supreme Court Reform', chip: 'Set an ethics code and term limits for Supreme Court justices', cat: 'reform', stanceKeys: ['termLimits'], keywords: ['supreme court','scotus','judicial','court reform','term limits','justices','ethics code','court ethics','judiciary','high court','recusal'] },
      reform_balance:     { label: '⚖️ Practical Government Reform', chip: 'Make government work better through common-sense efficiency, ethics and accountability', cat: 'reform', stanceKeys: ['termLimits','campaign'], keywords: ['government reform','efficiency','accountability','bipartisan','good governance','modernize','reform','transparency','ethics','term limits','common sense'] },

      // ── Institutional power ──
      // These keys exist because a large block of real votes — cabinet confirmations,
      // war-powers and tariff-authority resolutions, nationwide-injunction bills,
      // National Guard and state-standing fights — are about WHO decides, not about
      // ballot access or the deficit. Those votes used to be filed under
      // democracy_balance ("Secure & Accessible Voting") and gov_balance ("Balance the
      // Budget"), which moved members' percentages on issues the vote was not about.
      // Deliberately carry no `lean`: both parties invoke institutional limits when
      // they are out of power, so coding any of them as D or R would be false signal.
      //
      // SPLIT, August 2026. There were two keys here, and both were over-broad in the
      // same way: their direction was coherent but their SUBJECT was not, so the
      // verdict on a card could not say which question the cited vote had settled.
      // Under checks_balances, three members whose only stated claim was about the
      // power of the purse were being judged entirely by war-powers and injunction
      // roll calls — 100% off-mechanism — and two whose claim was about oversight had
      // no on-mechanism measure at all. Under states_federal_power, "the state's
      // choice stands" was answering three different questions at once: may a state
      // set its own rule where a federal one exists, may a state sue or enforce
      // against the federal government, and who commands the National Guard.
      // The mechanism is now the key. checks_balances keeps only the general posture,
      // which no single roll call can settle, and states_federal_power keeps only the
      // first of its three questions.
      // POLARITY (all six of the new keys, stated once): 'support' = the claim in the
      // chip; 'oppose' = the executive's side of the same question; 'mixed' = backs
      // some of each. Every one of them is a WHO-DECIDES claim, so a member may hold
      // 'support' on one and 'oppose' on another without inconsistency — that is
      // exactly the distinction the umbrella could not draw.
      //
      // Retained deliberately as the GENERAL key: cards that assert executive power
      // should be checked without naming a mechanism (a "Congress is a co-equal
      // branch" statement, an unresolved posture on holding two offices at once).
      // It has no roll-call mappings and is expected to keep none — a general-posture
      // claim cannot be settled by any single vote, which is why it stays on the
      // receipt-card hold list in receipt-cards.js rather than being unblocked here.
      // Anything with a named mechanism belongs to one of the five keys below it.
      checks_balances:      { label: '⚖️ Congress as a Check on the Executive', chip: 'Keep Congress and the courts as a real check on executive power, whoever is president', cat: 'reform', stanceKeys: [], keywords: ['checks and balances','separation of powers','executive overreach','executive power','co-equal branch','unitary executive','institutional power','constitutional limits','rule of law','advice and consent','confirmation'] },
      // The five mechanism keys. Each carries 'separation of powers' in its keywords
      // so stance-library.js's ⚖️ Checks & Balances hot-topic predicate — which
      // matches on that keyword rather than on `cat`, because `cat` is 'reform' for
      // term limits and court ethics too — picks all of them up.
      war_powers:           { label: '⚔️ Congress and War Powers', chip: 'Require a vote of Congress before U.S. forces are committed to hostilities', cat: 'reform', stanceKeys: [], keywords: ['war powers','war powers resolution','congressional authorization','authorization for use of military force','aumf','declaration of war','hostilities','article i','separation of powers','unauthorized war','commander in chief','privileged resolution'] },
      // Distinct from restraint ("Diplomacy & Restraint"), which is about WHETHER to
      // intervene. Members hold these two independently: several who want the U.S. out
      // of a conflict on the merits also vote against the war-powers resolution, and
      // several institutionalists want the vote taken and would then vote yes.
      judicial_check:       { label: '🧑‍⚖️ Court Orders on the Executive', chip: 'Let federal courts halt unlawful executive action, including nationwide', cat: 'reform', stanceKeys: [], keywords: ['nationwide injunction','universal injunction','judicial review','injunction','court order','judicial power','contempt','equitable relief','district court','judge shopping','judicial impeachment','separation of powers','rule of law'] },
      // Distinct from scotus_reform, which is about the ethics and tenure of justices
      // rather than the reach of a court's order against the executive branch.
      power_of_purse:       { label: '🧮 Power of the Purse', chip: 'Require the executive to spend what Congress appropriated instead of withholding or redirecting it', cat: 'reform', stanceKeys: [], keywords: ['power of the purse','impoundment','pocket rescission','rescission','appropriations','apportionment','impoundment control act','withhold funds','funding freeze','reprogramming','transfer authority','antideficiency','separation of powers','gao'] },
      congress_oversight:   { label: '🕵 Congressional Oversight', chip: 'Make the executive branch answer congressional subpoenas, document requests and testimony', cat: 'reform', stanceKeys: [], keywords: ['congressional oversight','oversight','subpoena','document request','testimony','executive privilege','contempt of congress','inspector general','whistleblower','notification requirement','intelligence oversight','gang of eight','separation of powers'] },
      // Distinct from gov_transparency, which is about disclosure BY members —
      // financial disclosure, stock trading, ethics rules — not about compelling
      // answers FROM the executive branch.
      state_standing:       { label: '🗽 States Suing Washington', chip: 'Let states take the federal government to court over federal enforcement choices that hit them', cat: 'reform', stanceKeys: [], keywords: ['state standing','cause of action','sue the federal government','state attorney general','judicial review','injunctive relief','federalism','mandamus','enforcement discretion','private right of action','separation of powers'] },
      guard_authority:      { label: '🪖 Who Commands the National Guard', chip: 'Keep the National Guard under the governor unless the state consents to federal control', cat: 'reform', stanceKeys: [], keywords: ['national guard','title 32','title 10','federalize','governor','commander of the guard','insurrection act','posse comitatus','commandeering','anti-commandeering','printz','state officers','federalism','separation of powers'] },
      // The chip has to be DIRECTIONAL, because the Official Record % under this key
      // is directional: every mapping is coded yea_supports = the vote favoured STATE
      // authority (H.J.Res. 88/89, the California waiver repeal, H.R. 26, H.Amdt. 249/250).
      // An even-handed "draw a clear line between state and federal power" chip reads as
      // agreement with a *process* both preemption hawks and federalism absolutists
      // endorse, so "80%" would look like "80% agreement with drawing a clear line" when
      // the number actually means "80% of their judged votes favoured state authority".
      // SCOPE, narrowed August 2026 to the PREEMPTION question only: when federal and
      // state authority reach the same subject, whose rule governs. State AI and
      // privacy laws, the California vehicle waiver, a state bank charter, state
      // insurance and hemp rules, western water, who runs the schools.
      //   OUT: whether a state may sue or enforce against the federal government
      //        (state_standing) and who commands the Guard or may direct state
      //        officers (guard_authority). Both were filed here and both are separate
      //        questions — a member can want the state's rule to govern and still
      //        oppose giving state attorneys general a new cause of action. Also OUT:
      //        transferring federal LAND decisions to states and counties, which has
      //        its own key (lands_local).
      states_federal_power: { label: '🗺 Whose Rule Governs: State or Federal', chip: 'When federal and state rules cover the same subject, let the state’s choice stand unless there’s a clear national reason to override it', cat: 'reform', stanceKeys: [], keywords: ['federalism','states rights','state authority','tenth amendment','preemption','federal preemption','sovereignty','state sovereignty','unfunded mandate','local control','dual sovereignty','state law','federal mandate','patchwork','waiver','field preemption','savings clause'] },
      // SCOPE, deliberately narrow. This key is about ONE mechanism: the legal
      // classification of executive-branch employees — which positions sit in the
      // competitive service, which are excepted from it, and what removal and
      // adverse-action protections attach to them. Schedule F / Schedule
      // Policy/Career, Schedule G, chapter 75 adverse-action procedures, at-will
      // status.
      //   IN:  an instrument that creates, restores, expands or restricts an
      //        at-will / excepted / policy-influencing personnel CATEGORY, or that
      //        changes the civil-service protections attached to one.
      //   OUT: agency reorganisations with no classification core; headcount cuts
      //        and reductions in force, which are about how many people work there,
      //        not what protections the ones who remain hold; hiring-process reform,
      //        including probationary periods and when an appointment becomes final,
      //        which EO 13839 sec. 2(i) itself calls the last step of hiring;
      //        federal-sector collective bargaining and union time, which are labour
      //        relations under a different chapter of title 5; and "drain the swamp"
      //        rhetoric with no formal mechanism behind it.
      // It exists because those actions had NOWHERE honest to land. cut_spending is
      // a claim about money and a reclassification order contains no spending
      // direction; gov_waste and reform_balance are broad enough to absorb anything
      // and would have made the key a synonym for "government reform". The keyword
      // list below is mechanism-only for the same reason — a key discovered by
      // slogan becomes a key filled by slogan.
      // POLARITY: the chip states the direction that EXPANDS presidential control —
      // issueStance 'support' = backs reclassifying career policy jobs out of the
      // competitive service and its removal procedures, 'oppose' = backs keeping
      // those civil-service protections in place, 'mixed' = backs some of each.
      // Carries no `lean`, on the checks_balances precedent directly above. `lean` is
      // branding-disambiguation data for word-action.js and nothing else; it is not a
      // scoring input and must never become one again.
      civil_service_control: { label: '🗂 Control of the Civil Service', chip: 'Let the President reclassify policy-influencing career jobs so those employees can be hired and removed without the usual civil-service procedures', cat: 'reform', stanceKeys: [], keywords: ['civil service','civil service protections','civil service rules','schedule f','schedule policy/career','schedule g','excepted service','competitive service','merit system principles','career civil service','career employee','policy-influencing','at-will','adverse action','removal procedures','chapter 75','office of personnel management','opm','tenure','federal employee'] }
    };

    // Publish ISSUE_MAP on window so the many helper functions that live in OTHER
    // <script> blocks (Stance at a Glance category coloring, the Spotlight issue-tie
    // chips, the candidate Snapshot, the Evidence Locker's issue labels, and the
    // People's Mandate bridge) can read the SAME issue vocabulary. Those helpers
    // reference a bare `ISSUE_MAP`, which only resolves to this IIFE-scoped variable
    // once it is also a global — without this line they silently fell back to ''
    // (no issue label, no tie chip), so connections that should have been visible
    // were quietly dropped. `_alignIssueMap` remains as the historical alias.
    try { window.ISSUE_MAP = ISSUE_MAP; } catch (e) {}

    // ════════════════════════════════════════════════════════════
    // CORE NATIONAL ISSUES — the priority framework (2026)
    // ════════════════════════════════════════════════════════════
    // PolitiDex narrows its federal coverage toward the highest-salience national
    // issues so the Evidence Locker and politician profiles go DEEP on what voters
    // weigh most, rather than spreading thin across many small topics. Each core
    // issue below is a curated bundle of one or more ISSUE_MAP issueKeys (the
    // same vocabulary every stance, evidence item, and Alignment pick already
    // uses). A politician "covers" a core issue when any of their documented
    // stances or evidence is keyed to one of that issue's `keys`.
    //
    // This is purely additive metadata: it never changes how an individual stance
    // is written or scored. It powers the "core issues covered" readout in the
    // Evidence Locker's By-Politician view and gives future content passes a clear,
    // shared target list. The set is ordered by 2026 salience. Keys are validated
    // against ISSUE_MAP by scripts/define-core-national-issues-jun2026.mjs.
    //
    // ── THIS IS THE ONE PARENT TABLE (September 2026) ────────────────────────
    // A CORE IS A TABLE OF CONTENTS; A CHILD IS THE ISSUE ITSELF. The keys below
    // are not a curation of the interesting part of the register any more — they
    // are the whole of it. EVERY PUBLISHED ISSUE_MAP KEY (one with a label) SITS
    // UNDER EXACTLY ONE CORE. That invariant is a test, not an aspiration:
    // scripts/test-issue-family.mjs fails on an orphan and fails on a key claimed
    // by two cores, so a new key cannot be added to ISSUE_MAP without being given
    // a parent here.
    //
    // WHY IT CHANGED. Three surfaces grouped issues into families and only one of
    // them read this table: the Door 1 issue shelf, the person file's topic tree,
    // and the record ledger. So `lands_preserve` — a shipped key with a label, a
    // chip and 4 mapped measures — had a ledger you could open by name and no chip
    // on any branch, because no core listed it. Twenty-four keys were in that
    // position (the public-lands cluster, the reform cluster, the family, tech and
    // infrastructure clusters, and five singletons). They are filed now, each
    // under the one core that honestly owns it, and window.PDXIssueFamily
    // (pdx-issue-family.js) is the single reader every surface asks.
    //
    // WHAT WAS NOT DONE, DELIBERATELY. No key was merged: `lands_preserve`,
    // `lands_keep_public`, `lands_balance` and `lands_local` are four different
    // questions about the public estate and each keeps its own key, its own chip
    // and its own census. No key was invented, none was renamed, and no
    // fourteenth core was added — every one of the twenty-four had an honest
    // parent among the thirteen. Three LABELS were widened, in copy only, so that
    // a core cannot deny what is filed under it: Climate now says Land (it is the
    // parent of the lands_* cluster and of property_rights), Economy now says
    // Infrastructure (roads, transit, broadband), and Checks & Balances now says
    // Government Reform (term limits, ethics, disclosure, stock trading, money in
    // politics and court structure — all of them rules about who may hold power
    // and on what terms, which is what that core has always been about).
    var CORE_NATIONAL_ISSUES = [
      { key: 'economy_cost_of_living', label: '💵 Economy, Cost of Living & Infrastructure',
        blurb: 'Jobs, wages, inflation, taxes on households, housing, the cost of raising children, money and digital assets, the rules the tech and AI industries build under, and the public works — roads, transit, broadband — the rest of it runs on.',
        keys: ['cost_living','tax_middle_class','prop_tax','econ_growth','econ_smallbiz','econ_trade','econ_balance','econ_workers','econ_corp_account','rural_ag','housing','housing_build','housing_support','housing_first_time','homeless','property_tax','tariffs_china','tariffs_growth','tariffs_prices','tariffs_authority','crypto_cbdc','sound_money','dev_district_finance','child_care','paid_leave','family_support','infrastructure','transit','broadband','tech_innovation','tech_balance'] },
      { key: 'immigration_border', label: '🛡 Immigration & Border Security',
        blurb: 'Border enforcement, legal immigration, asylum, and fentanyl trafficking.',
        keys: ['border_security','immig_legal','immig_balance','immigration_reform','immig_fentanyl','deportations'] },
      { key: 'healthcare', label: '🏥 Healthcare Costs & Access',
        blurb: 'Coverage, premiums, drug prices, rural care, mental health, senior benefits, and the rules on tobacco and nicotine products.',
        keys: ['healthcare_market','health_drug_prices','health_balance','healthcare','health_mental','health_rural','medical_freedom','social_security','healthcare_costs','tobacco_nicotine'] },
      { key: 'spending_debt_waste', label: '🧾 Government Spending, Debt & Waste',
        blurb: 'Federal spending, the national debt, balanced budgets, rooting out waste, and the case for funding public services instead.',
        keys: ['lower_taxes','gov_waste','gov_balance','national_debt','audit_spending','gov_regulation','cut_spending','gov_services'] },
      { key: 'abortion_repro', label: '🕊 Abortion / Reproductive Rights',
        blurb: 'Abortion access, limits and exceptions, and reproductive freedom.',
        keys: ['pro_life','repro_balance','pro_choice'] },
      { key: 'guns', label: '🔫 Gun Rights & Gun Control',
        blurb: 'Second Amendment rights, background checks, red-flag laws, and gun-safety measures.',
        keys: ['gun_rights','gun_balance','gun_safety'] },
      { key: 'climate_energy', label: '🌱 Climate, Energy & Land',
        blurb: 'Climate action, clean and domestic energy, water, disaster resilience, who owns and may use the public estate, and what a government may do to a parcel its owner holds.',
        keys: ['climate_action','enviro_energy','enviro_balance','lands_energy','lands_preserve','lands_keep_public','lands_balance','lands_local','property_rights','datacenter_growth','datacenter_water','datacenter_power','disaster_resilience','water','water_storage','energy_production','permitting_reform'] },
      { key: 'crime_safety', label: '👮 Crime & Public Safety',
        blurb: 'Policing, violent crime, sentencing and justice reform, and public safety.',
        keys: ['back_police','justice_balance','justice_reform','cannabis_reform','tough_on_crime'] },
      { key: 'election_integrity', label: '🗳 Election Integrity',
        blurb: 'Election security, voter ID, ballot access, and the integrity of the vote.',
        keys: ['election_integrity','election_security','democracy_balance','voting_access','voter_id'] },
      { key: 'checks_and_balances', label: '⚖️ Checks, Balances & Government Reform',
        blurb: 'War powers, the power of the purse, congressional oversight, court orders and court structure, the line between federal and state authority, control of the career civil service, and the rules that hold officeholders to account — term limits, ethics, disclosure, stock trading and money in politics.',
        keys: ['checks_balances','war_powers','judicial_check','power_of_purse','congress_oversight','states_federal_power','state_standing','guard_authority','civil_service_control','scotus_reform','term_limits','stock_trading_ban','gov_transparency','campaign_finance','reform_balance'] },
      { key: 'education_parental', label: '🎓 Education & Parental Rights',
        blurb: 'Public schools, school choice, college and trade costs, and parents’ role in schools.',
        keys: ['school_choice','edu_balance','public_schools','edu_college_cost','edu_parental'] },
      { key: 'civil_rights_culture', label: '⚖️ Civil Rights, Culture & DEI',
        blurb: 'Equal treatment and civil rights, religious liberty, free speech, personal privacy and surveillance, and the debate over DEI.',
        keys: ['religious_liberty','rights_balance','lgbtq_rights','free_speech','end_dei','privacy_rights'] },
      { key: 'foreign_policy_defense', label: '🦅 Foreign Policy & National Security',
        blurb: 'National defense, alliances and diplomacy, America First priorities, support for Israel, and support for veterans.',
        keys: ['strong_defense','foreign_balance','restraint','america_first','america_first_fp','israel_support','veterans'] },
    ];
    try { window.CORE_NATIONAL_ISSUES = CORE_NATIONAL_ISSUES; } catch (e) {}

    // Reverse lookup: which core issue (if any) an ISSUE_MAP key belongs to. Built
    // once so surfaces can ask "is this stance a core national issue?" cheaply.
    // Returns the core-issue object, or null for keys outside the priority set.
    var _CORE_BY_KEY = Object.create(null);
    CORE_NATIONAL_ISSUES.forEach(function (ci) { ci.keys.forEach(function (k) { if (!_CORE_BY_KEY[k]) _CORE_BY_KEY[k] = ci; }); });
    try { window.coreIssueForKey = function (k) { return (k && _CORE_BY_KEY[k]) || null; }; } catch (e) {}

    // Ordered category list that drives the collapsible picker sections. Issues are
    // slotted into a category via their `cat` key (above), so adding a new issue is
    // a one-line change here-or-there and both picker surfaces pick it up for free.
    // `group` slots each topic under a labelled section divider in the picker so a
    // long list of topics reads as a few digestible groups instead of one big wall.
    var ALIGN_CATEGORIES = [
      { key: 'gov',        group: 'Economy & Government',          icon: '💰', label: 'Taxes & Government' },
      { key: 'econ',       group: 'Economy & Government',          icon: '📈', label: 'Economy & Jobs' },
      { key: 'housing',    group: 'Economy & Government',          icon: '🏠', label: 'Housing & Cost of Living' },
      { key: 'infra',      group: 'Economy & Government',          icon: '🚧', label: 'Infrastructure & Transportation' },
      { key: 'land',       group: 'Land, Energy & Environment',    icon: '🏔', label: 'Public Lands & Energy' },
      { key: 'enviro',     group: 'Land, Energy & Environment',    icon: '💧', label: 'Water & Environment' },
      { key: 'dc',         group: 'Land, Energy & Environment',    icon: '🖥', label: 'Data Centers & Growth' },
      { key: 'immig',      group: 'Security & Justice',            icon: '🛡', label: 'Immigration' },
      { key: 'guns',       group: 'Security & Justice',            icon: '🔫', label: 'Gun Policy' },
      { key: 'justice',    group: 'Security & Justice',            icon: '👮', label: 'Criminal Justice & Safety' },
      { key: 'foreign',    group: 'Security & Justice',            icon: '🦅', label: 'Foreign Policy & Defense' },
      { key: 'health',     group: 'Health, Education & Society',   icon: '🏥', label: 'Healthcare' },
      { key: 'edu',        group: 'Health, Education & Society',   icon: '🎓', label: 'Education' },
      { key: 'family',     group: 'Health, Education & Society',   icon: '🧸', label: 'Family, Children & Work' },
      { key: 'repro',      group: 'Health, Education & Society',   icon: '🕊', label: 'Abortion & Reproductive Rights' },
      { key: 'rights',     group: 'Health, Education & Society',   icon: '🏳️‍🌈', label: 'Civil Rights & LGBTQ+' },
      { key: 'tech',       group: 'Technology & Democracy',        icon: '🚀', label: 'Technology & Privacy' },
      { key: 'democracy',  group: 'Technology & Democracy',        icon: '🗳', label: 'Elections & Democracy' },
      { key: 'reform',     group: 'Technology & Democracy',        icon: '⏳', label: 'Government Reform & Term Limits' }
    ];

    // ── Issue-vocabulary bridge for the "My Priorities" dashboard ──────────
    // The Home Team priorities view lives in a different scope and needs to
    // read the SAME issue vocabulary the Alignment Tool uses, without copying
    // it. Expose just two read-only lookups so the two can never drift:
    //   • _pdxIssueCatOf(issueKey) → the category key an issue belongs to
    //   • _pdxIssueCategories()    → the ordered, grouped topic list (key / icon
    //     / label / group), which is exactly the unit a voter picks as a
    //     "priority" (e.g. Taxes & Government, Healthcare, Housing).
    window._pdxIssueCatOf = function (issueKey) {
      try { return (ISSUE_MAP[issueKey] || {}).cat || ''; } catch (e) { return ''; }
    };
    window._pdxIssueCategories = function () {
      try {
        return ALIGN_CATEGORIES.map(function (c) {
          return { key: c.key, icon: c.icon, label: c.label, group: c.group };
        });
      } catch (e) { return []; }
    };
    // Resolve a single category descriptor by key (or null).
    window._pdxIssueCategory = function (catKey) {
      try {
        for (var i = 0; i < ALIGN_CATEGORIES.length; i++) {
          if (ALIGN_CATEGORIES[i].key === catKey) {
            var c = ALIGN_CATEGORIES[i];
            return { key: c.key, icon: c.icon, label: c.label, group: c.group };
          }
        }
      } catch (e) {}
      return null;
    };

    // ── Broad evidence Categories ──────────────────────────────────────────
    // A small, high-level layer that sits ABOVE the 18 fine-grained issue
    // topics (the `cat` key on every ISSUE_MAP entry). Each of those 18 topics
    // rolls up into exactly ONE of these ten Categories, so a regular voter
    // can browse the Evidence Locker by a broad subject ("Healthcare")
    // instead of a specific issue key — while the existing Issue filter still
    // offers the precise topic. Immigration is its own top-level Category
    // (not folded into Public Safety): it spans five distinct issue topics —
    // from border enforcement and fentanyl/cartels to legal immigration and
    // pathways to citizenship — so filing it under Public Safety would both
    // editorialize the subject and bury a sizable, cross-spectrum bucket.
    //
    // The lookup chain is issueKey → cat (already on ISSUE_MAP) → category
    // (here). Because it pivots on `cat`, adding a brand-new issue needs no
    // change here as long as its `cat` is one of the keys mapped below — the
    // Category is inherited for free. This is the single source of truth the
    // Evidence Locker reads from, so the two surfaces can never drift.
    var EVIDENCE_CATEGORIES = [
      { key: 'taxes_economy',   icon: '💰', label: 'Taxes & Economy' },
      { key: 'education',       icon: '🎓', label: 'Education' },
      { key: 'health_human',    icon: '🏥', label: 'Healthcare' },
      { key: 'housing',         icon: '🏠', label: 'Housing' },
      { key: 'safety_justice',  icon: '🛡', label: 'Public Safety' },
      { key: 'immigration',     icon: '🛂', label: 'Immigration' },
      { key: 'enviro_land',     icon: '🌿', label: 'Environment & Energy' },
      { key: 'gov_elections',   icon: '🏛', label: 'Government & Elections' },
      { key: 'transport_infra', icon: '🚧', label: 'Transportation & Infrastructure' },
      { key: 'other',           icon: '🎯', label: 'Other / General' }
    ];
    // Roll each of the 18 fine-grained issue topics (`cat`) up to a Category.
    // Every `cat` value used in ISSUE_MAP must appear here; anything missing
    // (or an item with no tracked issue) falls back to 'other'.
    var CAT_TO_CATEGORY = {
      gov: 'taxes_economy', econ: 'taxes_economy',
      edu: 'education',
      health: 'health_human', family: 'health_human',
      housing: 'housing',
      justice: 'safety_justice', guns: 'safety_justice', immig: 'immigration',
      land: 'enviro_land', enviro: 'enviro_land', dc: 'enviro_land',
      democracy: 'gov_elections', reform: 'gov_elections', rights: 'gov_elections', repro: 'gov_elections',
      infra: 'transport_infra',
      foreign: 'other', tech: 'other', other: 'other'
    };
    // issueKey → broad Category key (always returns a valid key, default 'other').
    window._pdxCategoryOf = function (issueKey) {
      try {
        var cat = (ISSUE_MAP[issueKey] || {}).cat || '';
        return CAT_TO_CATEGORY[cat] || 'other';
      } catch (e) { return 'other'; }
    };
    // Fine-grained `cat` key → broad Category key.
    window._pdxCategoryFromCat = function (catKey) {
      return CAT_TO_CATEGORY[catKey] || 'other';
    };
    // issueKey → broad Category label (e.g. 'Public Safety'), used so a power-tie
    // reason on an Alignment row reads with the same wording as the Locker.
    var _CATEGORY_LABEL = {};
    EVIDENCE_CATEGORIES.forEach(function (c) { _CATEGORY_LABEL[c.key] = c.label; });
    window._pdxCategoryLabelOf = function (issueKey) {
      try { return _CATEGORY_LABEL[window._pdxCategoryOf(issueKey)] || 'this area'; }
      catch (e) { return 'this area'; }
    };
    // The ordered list of broad Categories (key / icon / label) for filters.
    window._pdxEvidenceCategories = function () {
      try {
        return EVIDENCE_CATEGORIES.map(function (c) {
          return { key: c.key, icon: c.icon, label: c.label };
        });
      } catch (e) { return []; }
    };
    // Resolve one broad Category descriptor by key (or null).
    window._pdxEvidenceCategory = function (key) {
      for (var i = 0; i < EVIDENCE_CATEGORIES.length; i++) {
        if (EVIDENCE_CATEGORIES[i].key === key) return EVIDENCE_CATEGORIES[i];
      }
      return null;
    };
})();
