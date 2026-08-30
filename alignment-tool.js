/**
 * PolitiDex Alignment Tool
 * Extracted from index.html for maintainability.
 *
 * This is the Personalized Alignment Score Engine plus its supporting
 * subsystems (issue map, core national issues, evidence/category helpers,
 * account-match adjustment, and team-alignment rendering). It was already an
 * IIFE in the monolith, so it is moved here verbatim and loaded as a classic
 * (non-deferred) external script at the same document position — preserving the
 * exact global scope and execution order it had inline.
 *
 * Public API is exposed on `window.*` (e.g. window.ISSUE_MAP,
 * window._calcAlignmentScore, window.alignSetIntensity, window.alignSearch …).
 * External inputs read at runtime: CMP_DATA, PROFILES, ISSUE_STANCE_DATA,
 * getProfile, window._issueVerdict, window._polPositionMap.
 *
 * 5-point stance system (strongly_support / support / neutral / oppose /
 * strongly_oppose). Legacy 3-state values (strong / moderate / opposed) are
 * migrated on load, so previously-saved Alignment Signatures keep working.
 */
  // ════════════════════════════════════════════════════════════
  // PERSONALIZED ALIGNMENT SCORE ENGINE
  // ════════════════════════════════════════════════════════════
  (function() {
    var ALIGN_KEY = 'politidex_align_issues';
    var ALIGN_INT_KEY = 'politidex_align_intensity';
    var _alignIssues = new Set();
    // Optional per-issue stance overlay: { issueKey: <5-point level> }. The five
    // levels are strongly_support / support / neutral / oppose / strongly_oppose.
    // 'support' is the implicit default and is never stored, so an issue with no
    // entry here scores EXACTLY as a plain "I hold this position" pick did before —
    // that keeps every previously-saved Alignment Signature (a plain array of keys)
    // producing identical politician match %s. Stronger levels weight the issue more
    // heavily; oppose/strongly_oppose invert the match (a candidate who holds that
    // position scores low); neutral counts lightly and pulls toward the midpoint.
    var _alignIntensity = {};

    // ── 5-point stance system ──────────────────────────────────────────────
    // The exact level vocabulary, the implicit default, and the legacy migration
    // that keeps 3-state signatures (strong / moderate / opposed) valid.
    var ALIGN_LEVELS = ['strongly_support', 'support', 'neutral', 'oppose', 'strongly_oppose'];
    var ALIGN_DEFAULT_LEVEL = 'support';   // implied by a bare selection; never stored
    function _alignMigrateLevel(lvl) {
      if (lvl === 'strong')   return 'strongly_support';
      if (lvl === 'moderate') return 'support';
      if (lvl === 'opposed')  return 'oppose';
      return lvl;
    }
    // Scoring model for a stance level:
    //   agree  — true = holds the position, false = rejects it, null = neutral
    //   weight — multiplier on the issue's computed weight (stronger = heavier)
    function _alignLevelModel(level) {
      switch (_alignMigrateLevel(level)) {
        case 'strongly_support': return { agree: true,  weight: 1.7 };
        case 'neutral':          return { agree: null,  weight: 0.4 };
        case 'oppose':           return { agree: false, weight: 1.25 };
        case 'strongly_oppose':  return { agree: false, weight: 1.9 };
        case 'support':
        default:                 return { agree: true,  weight: 1.0 };
      }
    }
    // Short label + icon for the per-issue stance badge and any compact readouts.
    function _alignLevelMeta(level) {
      switch (_alignMigrateLevel(level)) {
        case 'strongly_support': return { icon: '💪', label: 'Strongly Support' };
        case 'neutral':          return { icon: '😐', label: 'Neutral' };
        case 'oppose':           return { icon: '👎', label: 'Oppose' };
        case 'strongly_oppose':  return { icon: '✋', label: 'Strongly Oppose' };
        case 'support':
        default:                 return { icon: '👍', label: 'Support' };
      }
    }
    // Expose the live overlay + helpers so surfaces in other <script> blocks
    // (the "How You Compare" comparison, Key Races breakdowns) read the SAME
    // stance vocabulary and current picks. Re-pointed whenever _alignIntensity
    // is reassigned (see _alignExposeIntensity below).
    function _alignExposeIntensity() { try { window._alignIntensity = _alignIntensity; } catch (e) {} }
    _alignExposeIntensity();
    try {
      window.ALIGN_LEVELS = ALIGN_LEVELS;
      window._alignMigrateLevel = _alignMigrateLevel;
      window._alignLevelModel = _alignLevelModel;
      window._alignLevelMeta = _alignLevelMeta;
    } catch (e) {}

    // Each topic now offers SEVERAL selectable positions (checkbox style) instead
    // of a forced "this side vs that side" pair — a visitor can agree with more
    // than one perspective on the same topic, and most topics include a balanced /
    // middle-ground option for people who don't fall neatly on one end.
    //
    // Each option carries the keywords/stanceKeys the engine already understands.
    // An optional `lean: 'R' | 'D'` survives on some options as DATA ONLY. No
    // match-scoring path reads it — the party nudge it used to feed is retired
    // (see the RETIRED _alignApplyLean note below), and an issue the candidate has
    // no documented position on is now dropped from the match rather than filled
    // in from their party. The field is kept because word-action.js reads it when
    // disambiguating which issue a bill's branding points at, which is what stops
    // opposed facets like gun_rights / gun_safety collapsing into one key. Do not
    // wire it back into a score.
    //
    // `cat` assigns each option to one of the ALIGN_CATEGORIES below, which groups
    // the positions into the collapsible topic sections of the picker. `label` is
    // the full name (emoji + words) used in status lines, the Key Races breakdown
    // and the quick-adjust chips; `chip` is the position statement shown inside the
    // topic's option list. Both picker surfaces — the main "Personalized Alignment
    // Tool" and the "My Key Alignments" panel — are rendered from this single map,
    // so they can never drift out of sync, and the scoring engine treats every
    // selected position as its own weighted issue, so selecting several positions
    // in one topic simply blends their matches together.
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
    var CORE_NATIONAL_ISSUES = [
      { key: 'economy_cost_of_living', label: '💵 Economy, Inflation & Cost of Living',
        blurb: 'Jobs, wages, inflation, taxes on households, and the price of everyday life.',
        keys: ['cost_living','tax_middle_class','prop_tax','econ_growth','econ_smallbiz','econ_trade','econ_balance','econ_workers','econ_corp_account','rural_ag','housing','housing_build','housing_support','housing_first_time','homeless','property_tax','tariffs_china','tariffs_growth','tariffs_prices','tariffs_authority','crypto_cbdc'] },
      { key: 'immigration_border', label: '🛡 Immigration & Border Security',
        blurb: 'Border enforcement, legal immigration, asylum, and fentanyl trafficking.',
        keys: ['border_security','immig_legal','immig_balance','immigration_reform','immig_fentanyl','deportations'] },
      { key: 'healthcare', label: '🏥 Healthcare Costs & Access',
        blurb: 'Coverage, premiums, drug prices, rural care, mental health, and senior benefits.',
        keys: ['healthcare_market','health_drug_prices','health_balance','healthcare','health_mental','health_rural','medical_freedom','social_security','healthcare_costs'] },
      { key: 'spending_debt_waste', label: '🧾 Government Spending, Debt & Waste',
        blurb: 'Federal spending, the national debt, balanced budgets, and rooting out waste.',
        keys: ['lower_taxes','gov_waste','gov_balance','national_debt','audit_spending','gov_regulation','cut_spending'] },
      { key: 'abortion_repro', label: '🕊 Abortion / Reproductive Rights',
        blurb: 'Abortion access, limits and exceptions, and reproductive freedom.',
        keys: ['pro_life','repro_balance','pro_choice'] },
      { key: 'guns', label: '🔫 Gun Rights & Gun Control',
        blurb: 'Second Amendment rights, background checks, red-flag laws, and gun-safety measures.',
        keys: ['gun_rights','gun_balance','gun_safety'] },
      { key: 'climate_energy', label: '🌱 Climate Change & Energy Policy',
        blurb: 'Climate action, clean and domestic energy, water, and disaster resilience.',
        keys: ['climate_action','enviro_energy','enviro_balance','lands_energy','datacenter_growth','datacenter_water','datacenter_power','disaster_resilience','water','water_storage','energy_production','permitting_reform'] },
      { key: 'crime_safety', label: '👮 Crime & Public Safety',
        blurb: 'Policing, violent crime, sentencing and justice reform, and public safety.',
        keys: ['back_police','justice_balance','justice_reform','cannabis_reform','tough_on_crime'] },
      { key: 'election_integrity', label: '🗳 Election Integrity',
        blurb: 'Election security, voter ID, ballot access, and the integrity of the vote.',
        keys: ['election_integrity','election_security','democracy_balance','voting_access','voter_id'] },
      { key: 'checks_and_balances', label: '⚖️ Checks, Balances & Who Decides',
        blurb: 'War powers, the power of the purse, congressional oversight, court orders, the line between federal and state authority, and control of the career civil service.',
        keys: ['checks_balances','war_powers','judicial_check','power_of_purse','congress_oversight','states_federal_power','state_standing','guard_authority','civil_service_control'] },
      { key: 'education_parental', label: '🎓 Education & Parental Rights',
        blurb: 'Public schools, school choice, college and trade costs, and parents’ role in schools.',
        keys: ['school_choice','edu_balance','public_schools','edu_college_cost','edu_parental'] },
      { key: 'civil_rights_culture', label: '⚖️ Civil Rights, Culture & DEI',
        blurb: 'Equal treatment and civil rights, religious liberty, free speech, and the debate over DEI.',
        keys: ['religious_liberty','rights_balance','lgbtq_rights','free_speech','end_dei'] },
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

    // ── Data-driven picker rendering ───────────────────────────
    // Both the main "Personalized Alignment Tool" and the "My Key Alignments"
    // panel mount the SAME accordion, built here from ISSUE_MAP + ALIGN_CATEGORIES.
    // One source of truth = the two surfaces (and the Key Races chips) can't drift.
    function _alignCatIssues(catKey) {
      return Object.keys(ISSUE_MAP).filter(function(k) { return ISSUE_MAP[k].cat === catKey; });
    }

    // ── Documented-coverage engine ─────────────────────────────
    // How many politicians actually have a curated, sourced position on each
    // issue — drawn straight from ISSUE_STANCE_DATA (the very records that power
    // every politician's documented stances). This lets the picker show, BEFORE
    // a visitor commits to an issue, which specific issues have real data to
    // match on and how rich each one is, so they aren't choosing blind. Counts
    // are factual (one per documented record that carries that issueKey — at most
    // once per politician), so nothing here is fabricated. Memoized because the
    // underlying data is static for the session.
    var _alignCovCache = null;
    function _alignCoverage() {
      if (_alignCovCache) return _alignCovCache;
      var byIssue = {}, byCat = {};
      try {
        if (typeof ISSUE_STANCE_DATA !== 'undefined' && ISSUE_STANCE_DATA) {
          Object.keys(ISSUE_STANCE_DATA).forEach(function(pid) {
            var list = ISSUE_STANCE_DATA[pid];
            if (!Array.isArray(list)) return;
            var seen = {}; // an issue counts at most once per politician record
            list.forEach(function(s) {
              var k = s && s.issueKey;
              if (!k || !ISSUE_MAP[k] || seen[k]) return;
              seen[k] = 1;
              byIssue[k] = (byIssue[k] || 0) + 1;
            });
          });
        }
      } catch (e) {}
      // Roll the per-issue counts up to their parent topic (category).
      Object.keys(byIssue).forEach(function(k) {
        var cat = ISSUE_MAP[k] && ISSUE_MAP[k].cat;
        if (!cat) return;
        if (!byCat[cat]) byCat[cat] = { issues: 0, positions: 0 };
        byCat[cat].issues++;
        byCat[cat].positions += byIssue[k];
      });
      _alignCovCache = { byIssue: byIssue, byCat: byCat };
      return _alignCovCache;
    }
    window._alignCoverage = _alignCoverage;

    function _alignChipHtml(key) {
      var d = ISSUE_MAP[key];
      if (!d) return '';
      // A small teal 📍 coverage badge tells the visitor, at a glance, how many
      // politicians have a documented, sourced position on THIS exact issue — so
      // they can see which issues actually have data to match on before picking.
      // "—" marks issues with no documented position tagged yet (they still score
      // from each candidate's broader record); the colour change keeps it honest.
      var cov = _alignCoverage().byIssue[key] || 0;
      var covHtml = cov > 0
        ? '<span class="align-opt-cov" title="' + cov + ' politician' + (cov === 1 ? '' : 's') + ' on PolitiDex ' + (cov === 1 ? 'has a' : 'have a') + ' documented, sourced position on this exact issue — pick it to see who lines up with you">📍 ' + cov + '</span>'
        : '<span class="align-opt-cov is-none" title="No documented positions are tagged to this exact issue yet — picking it still matches candidates from their broader record, and it sharpens as positions are added">📍 —</span>';
      // No party (R/D) badge — the option reads as a policy position, and the
      // checkbox box on the left makes the multi-select nature obvious. Once an
      // option is checked, a 5-point stance row (Strongly Support → Strongly
      // Oppose) reveals itself, plus a live badge showing the chosen stance.
      return '<div class="align-opt-row" data-opt-row="' + key + '">' +
        '<button type="button" class="align-chip align-opt" data-align-issue="' + key + '"' +
          ' aria-pressed="false" onclick="alignToggle(this)">' +
          '<span class="align-opt-box" aria-hidden="true"></span>' +
          '<span class="align-opt-text">' + d.chip + '</span>' +
          '<span class="align-stance-badge" data-stance-badge="' + key + '" aria-hidden="true"></span>' +
          covHtml +
        '</button>' +
        '<div class="align-intensity" role="group" aria-label="What is your stance on this position?">' +
          '<span class="align-int-caption" aria-hidden="true">Your stance</span>' +
          '<button type="button" class="align-int-btn" data-int="strongly_support" title="I strongly support this — a top-priority position for me" onclick="alignSetIntensity(\'' + key + '\',\'strongly_support\')">💪 Strongly Support</button>' +
          '<button type="button" class="align-int-btn" data-int="support" title="I support this position" onclick="alignSetIntensity(\'' + key + '\',\'support\')">👍 Support</button>' +
          '<button type="button" class="align-int-btn" data-int="neutral" title="I feel neutral / mixed on this — it counts lightly" onclick="alignSetIntensity(\'' + key + '\',\'neutral\')">😐 Neutral</button>' +
          '<button type="button" class="align-int-btn" data-int="oppose" title="I oppose this position" onclick="alignSetIntensity(\'' + key + '\',\'oppose\')">👎 Oppose</button>' +
          '<button type="button" class="align-int-btn" data-int="strongly_oppose" title="I strongly oppose this position" onclick="alignSetIntensity(\'' + key + '\',\'strongly_oppose\')">✋ Strongly Oppose</button>' +
        '</div>' +
      '</div>';
    }

    function _alignCatBodyHtml(catKey) {
      // Every position in the topic is an independent checkbox — visitors can pick
      // as many as they agree with (including a balanced middle option), instead of
      // being forced into a single "this vs that" choice.
      var keys = _alignCatIssues(catKey);
      return '<div class="align-opt-list">' + keys.map(_alignChipHtml).join('') + '</div>';
    }

    function _alignBuildPicker() {
      var lastGroup = null;
      var cov = _alignCoverage();
      return ALIGN_CATEGORIES.map(function(c) {
        var groupHtml = '';
        if (c.group && c.group !== lastGroup) {
          lastGroup = c.group;
          groupHtml = '<div class="align-group-divider">' + c.group + '</div>';
        }
        // Static topic-level coverage: how many documented positions across the
        // field this topic offers to match on. Surfaces the richest topics at a
        // glance so a visitor knows where the data is deepest.
        var cc = cov.byCat[c.key];
        var covCatHtml = (cc && cc.positions > 0)
          ? '<span class="align-cat-cov" title="' + cc.positions + ' documented position' + (cc.positions === 1 ? '' : 's') + ' from politicians across this topic, covering ' + cc.issues + ' issue' + (cc.issues === 1 ? '' : 's') + ' — these are ready to match on">📍 ' + cc.positions + '</span>'
          : '';
        return groupHtml +
          '<div class="align-cat" data-cat="' + c.key + '">' +
          '<button type="button" class="align-cat-head" onclick="alignToggleCat(this)" aria-expanded="false">' +
            '<span class="align-cat-title"><span class="align-cat-ico">' + c.icon + '</span>' + c.label + '</span>' +
            '<span class="align-cat-meta">' +
              covCatHtml +
              '<span class="align-cat-badge" data-cat-badge="' + c.key + '" style="display:none;">0</span>' +
              '<span class="align-cat-chev">▾</span>' +
            '</span>' +
          '</button>' +
          '<div class="align-cat-body"><div class="align-cat-body-inner">' + _alignCatBodyHtml(c.key) + '</div></div>' +
        '</div>';
      }).join('');
    }

    // Reflect the live selection onto every chip + per-category count badge across
    // BOTH panels at once, so a change made on one surface shows on the other.
    function _alignSyncAllChips() {
      document.querySelectorAll('.align-chip[data-align-issue]').forEach(function(chip) {
        var k = chip.getAttribute('data-align-issue');
        var on = _alignIssues.has(k);
        chip.classList.toggle('active', on);
        chip.setAttribute('aria-pressed', on ? 'true' : 'false');
        // Reflect the per-issue stance onto the row: highlight the chosen level,
        // flag oppose/strongly_oppose (which re-skins the checkbox to a red ✕), and
        // fill the live stance badge. A bare selection implies the default 'support'.
        var row = chip.closest('.align-opt-row');
        if (row) {
          var lvl = on ? _alignMigrateLevel(_alignIntensity[k] || ALIGN_DEFAULT_LEVEL) : null;
          ALIGN_LEVELS.forEach(function(L) { row.classList.remove('lvl-' + L); });
          row.classList.remove('opposed');
          if (lvl) {
            row.classList.add('lvl-' + lvl);
            if (lvl === 'oppose' || lvl === 'strongly_oppose') row.classList.add('opposed');
          }
          row.querySelectorAll('.align-int-btn').forEach(function(b) {
            b.classList.toggle('sel', !!lvl && b.getAttribute('data-int') === lvl);
          });
          var badge = row.querySelector('[data-stance-badge]');
          if (badge) {
            if (lvl) {
              var meta = _alignLevelMeta(lvl);
              badge.textContent = meta.icon + ' ' + meta.label;
              badge.style.display = 'inline-flex';
            } else {
              badge.textContent = '';
              badge.style.display = 'none';
            }
          }
        }
      });
      var counts = {};
      _alignIssues.forEach(function(k) {
        var d = ISSUE_MAP[k];
        if (d && d.cat) counts[d.cat] = (counts[d.cat] || 0) + 1;
      });
      document.querySelectorAll('.align-cat-badge[data-cat-badge]').forEach(function(b) {
        var c = b.getAttribute('data-cat-badge');
        var n = counts[c] || 0;
        var prev = b.textContent;
        b.textContent = n;
        b.style.display = n > 0 ? 'inline-flex' : 'none';
        // Little pop whenever a category's count actually changes — satisfying, cheap.
        if (n > 0 && String(n) !== prev) {
          b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
        }
      });
      _alignUpdateToolbar();
    }

    // Live "N positions selected" count shown in each picker's control bar. Pops
    // briefly whenever the total actually changes so the toolbar feels responsive.
    function _alignUpdateToolbar() {
      var n = _alignIssues.size;
      document.querySelectorAll('.align-sel-count').forEach(function(el) {
        var prev = el.getAttribute('data-n');
        el.innerHTML = (n === 0)
          ? 'No stances set yet'
          : '<b>' + n + '</b> stance' + (n > 1 ? 's' : '') + ' set';
        if (String(n) !== prev) {
          el.setAttribute('data-n', String(n));
          if (n > 0) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
        }
      });
      // Keep the compact (collapsed) card's status line and CTA in sync with picks.
      var cs = document.getElementById('align-compact-status');
      if (cs) {
        cs.innerHTML = (n === 0)
          ? 'No stances set yet'
          : "You've set <b>" + n + "</b> stance" + (n > 1 ? 's' : '');
      }
      var cbl = document.getElementById('align-compact-btn-label');
      if (cbl) cbl.textContent = (n === 0) ? 'Set your stances' : 'Adjust my stances';
      // Once the visitor has picks, reframe the tagline around acting on the results
      // and reveal the forward actions that jump to their best-match candidates.
      var ct = document.getElementById('align-compact-tagline');
      if (ct) ct.textContent = (n === 0)
        ? 'Set your stances — what you stand for — then this shows who matches, plus whether their record backs it up. Add your best matches to your team.'
        : '🎯 Your Match and 🏛️ Official Record now show on every candidate — see who fits, then tap “Add to my team” or “See the receipts” right on each card.';
      var cm = document.getElementById('align-compact-matches');
      if (cm) cm.style.display = (n === 0) ? 'none' : 'inline-flex';
      _alignRenderModeRow();
      var dn = document.getElementById('align-done-btn');
      if (dn) dn.style.display = (n === 0) ? 'none' : 'inline-flex';
    }

    // Personalized Alignment Tool: a compact-by-default feature card that expands
    // to the full picker on demand. Pass true/false to force a state, or call with
    // no argument to flip it. Toggling only swaps CSS classes — every picker, the
    // search, and the match maths keep working untouched in the DOM.
    window.alignTogglePanel = function(forceState) {
      var panel = document.getElementById('alignment-panel');
      if (!panel) return;
      var willOpen = (forceState === true) ? true
                   : (forceState === false) ? false
                   : panel.classList.contains('align-collapsed');
      panel.classList.toggle('align-collapsed', !willOpen);
      panel.classList.toggle('align-expanded', willOpen);
      var head = panel.querySelector('.align-head-main');
      if (head) head.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    };

    // Closes the loop from "I picked my issues" to "show me who to add." Collapses
    // the tool, re-asserts the alignment-aware "Best Match for You" browse sort, and
    // scrolls the visitor straight to the candidate list so their alignment turns
    // directly into team-building decisions. Used by both the compact card's
    // "See My Best Matches" button and the open tool's "Done" action.
    window.alignSeeMatches = function() {
      var hasPicks = (typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size > 0);
      if (window.alignTogglePanel) window.alignTogglePanel(false);
      if (hasPicks) {
        // Let the auto-default kick back in so the strongest matches lead the list.
        window._myteamBrowseSortAuto = true;
        if (typeof myteamBrowseFilter === 'function') myteamBrowseFilter();
      }
      var target = document.getElementById('browse-toolbar') || document.getElementById('myteam-browse-grid');
      if (target) {
        setTimeout(function() {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          target.classList.add('align-flash');
          setTimeout(function() { target.classList.remove('align-flash'); }, 1200);
        }, 140);
      }
    };

    function _alignRenderPickers() {
      var html = _alignBuildPicker();
      ['align-cats-main', 'align-cats-rel'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.innerHTML = html;
      });
      _alignSyncAllChips();
      // Auto-expand any category that already has a selected issue so returning
      // visitors immediately see what's driving their score; the rest stay tidy.
      document.querySelectorAll('.align-cat').forEach(function(cat) {
        if (cat.querySelector('.align-chip.active')) {
          cat.classList.add('open');
          var head = cat.querySelector('.align-cat-head');
          if (head) head.setAttribute('aria-expanded', 'true');
        }
      });
    }

    window.alignToggleCat = function(btn) {
      var cat = btn.closest('.align-cat');
      if (!cat) return;
      var open = cat.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    // Open or close every topic in a given picker at once. Scoped by the cats
    // container id so the main tool and the "My Key Alignments" panel act
    // independently; hidden (search-filtered) categories are left untouched.
    window.alignExpandAll = function(catsId) {
      var cats = document.getElementById(catsId || 'align-cats-main');
      if (!cats) return;
      cats.querySelectorAll('.align-cat').forEach(function(cat) {
        if (cat.classList.contains('align-hide')) return;
        cat.classList.add('open');
        var h = cat.querySelector('.align-cat-head');
        if (h) h.setAttribute('aria-expanded', 'true');
      });
    };

    window.alignCollapseAll = function(catsId) {
      var cats = document.getElementById(catsId || 'align-cats-main');
      if (!cats) return;
      cats.querySelectorAll('.align-cat').forEach(function(cat) {
        cat.classList.remove('open');
        var h = cat.querySelector('.align-cat-head');
        if (h) h.setAttribute('aria-expanded', 'false');
      });
    };

    // Keep only stance entries that point at a currently-selected, known issue and
    // carry a real non-default level, so the overlay can never go stale. Legacy
    // 3-state values are migrated in place; 'support' (the default) is dropped.
    function _alignCleanIntensity() {
      Object.keys(_alignIntensity).forEach(function(k) {
        var lvl = _alignMigrateLevel(_alignIntensity[k]);
        if (!ISSUE_MAP[k] || !_alignIssues.has(k) || ALIGN_LEVELS.indexOf(lvl) === -1 || lvl === ALIGN_DEFAULT_LEVEL) {
          delete _alignIntensity[k];
        } else {
          _alignIntensity[k] = lvl;
        }
      });
    }

    function _alignSanitizeIntensity(obj) {
      var clean = {};
      if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach(function(k) {
          var lvl = _alignMigrateLevel(obj[k]);
          if (ISSUE_MAP[k] && _alignIssues.has(k) && ALIGN_LEVELS.indexOf(lvl) !== -1 && lvl !== ALIGN_DEFAULT_LEVEL) clean[k] = lvl;
        });
      }
      return clean;
    }

    function _alignLoad() {
      try {
        var saved = localStorage.getItem(ALIGN_KEY);
        if (saved) {
          var arr = JSON.parse(saved);
          // Keep only issues that still exist in ISSUE_MAP so a stale key from a
          // previous issue set can't leave the UI in a "scored but empty" state.
          var keep = (Array.isArray(arr) ? arr : []).filter(function(k) { return !!ISSUE_MAP[k]; });
          _alignIssues = new Set(keep);
        }
      } catch(e) {}
      // Intensity loads after the selection so it can be intersected with it.
      try {
        var si = localStorage.getItem(ALIGN_INT_KEY);
        if (si) { _alignIntensity = _alignSanitizeIntensity(JSON.parse(si)); _alignExposeIntensity(); }
      } catch(e) {}
      // Which side of the politician the match reads. Anything but the exact
      // string 'record' lands on stated, so a corrupt value fails to the default
      // rather than to the newer, sparser lane.
      try {
        var sm = localStorage.getItem(ALIGN_MODE_KEY);
        if (sm) _alignMode = _alignModeOf(sm);
      } catch(e) {}
    }

    function _alignSave() {
      _alignCleanIntensity();
      try { localStorage.setItem(ALIGN_KEY, JSON.stringify([..._alignIssues])); } catch(e) {}
      try { localStorage.setItem(ALIGN_INT_KEY, JSON.stringify(_alignIntensity)); } catch(e) {}
      // Mirror the selection to the signed-in member's profile so their Alignment
      // Signature persists across sessions and devices (no-op when logged out).
      _alignSaveToFirestore();
    }

    // ── Alignment Signature: per-user Firestore persistence ────────────
    // Logged-in members get their issue/POV picks saved to their user document
    // (users/{uid}.alignmentPreferences) so the tool — and every politician
    // card's match % — reloads exactly as they left it on any device. Logged-out
    // (or anonymous) visitors keep using localStorage only; nothing is written.
    var ALIGN_FS_FIELD = 'alignmentPreferences';
    var ALIGN_FS_INT_FIELD = 'alignmentIntensity';
    var _alignFsSaveTimer = null;

    function _alignCurrentUser() {
      try {
        if (typeof auth === 'undefined' || !auth) return null;
        var u = auth.currentUser;
        return (u && !u.isAnonymous) ? u : null;
      } catch(e) { return null; }
    }

    // Debounced background write — coalesces rapid chip toggles into one network
    // round-trip and never blocks the UI.
    function _alignSaveToFirestore() {
      var user = _alignCurrentUser();
      if (!user) return;
      if (_alignFsSaveTimer) clearTimeout(_alignFsSaveTimer);
      _alignFsSaveTimer = setTimeout(function() {
        _alignFsSaveTimer = null;
        var current = _alignCurrentUser();
        if (!current) return;
        try {
          _alignCleanIntensity();
          var payload = {};
          payload[ALIGN_FS_FIELD] = [..._alignIssues];
          payload[ALIGN_FS_INT_FIELD] = _alignIntensity;
          payload[ALIGN_FS_FIELD + '_updated'] = firebase.firestore.FieldValue.serverTimestamp();
          db.collection('users').doc(current.uid).set(payload, { merge: true })
            .catch(function(e) { console.warn('Alignment save to Firestore failed:', e); });
        } catch(e) { console.warn('Alignment save to Firestore failed:', e); }
      }, 600);
    }

    // Active real-time subscription to the signed-in member's user document.
    var _alignFsUnsub = null;   // onSnapshot unsubscribe handle (null when none)
    var _alignFsUid = null;     // uid currently being streamed
    var _alignSeededUid = null; // uid whose empty signature we've already seeded

    // Make a saved-preferences array the authoritative selection. Returns true
    // only when it actually changes the current picks, so callers repaint cards
    // just once and our own Firestore write echoing back through the listener is
    // a no-op (no repaint loop). Mutates _alignIssues in place so
    // window._alignIssues (shared with the Key Races quick-adjust) keeps pointing
    // at the same live Set.
    function _alignApplySaved(saved) {
      if (!Array.isArray(saved)) return false;
      var keep = saved.filter(function(k) { return !!ISSUE_MAP[k]; });
      var same = (keep.length === _alignIssues.size) && keep.every(function(k) { return _alignIssues.has(k); });
      if (same) return false;
      _alignIssues.clear();
      keep.forEach(function(k) { _alignIssues.add(k); });
      window._alignIssues = _alignIssues;
      try { localStorage.setItem(ALIGN_KEY, JSON.stringify([..._alignIssues])); } catch(e) {}
      return true;
    }

    // Mirror of _alignApplySaved for the intensity overlay. Sanitizes against the
    // current selection (so a level can't apply to an unselected issue) and only
    // reports a change when it actually differs, keeping the Firestore echo a no-op.
    function _alignApplyIntensity(saved) {
      var clean = _alignSanitizeIntensity(saved);
      var aK = Object.keys(clean).sort();
      var bK = Object.keys(_alignIntensity).sort();
      var same = aK.length === bK.length && aK.every(function(k, i) { return k === bK[i] && clean[k] === _alignIntensity[bK[i]]; });
      if (same) return false;
      _alignIntensity = clean;
      _alignExposeIntensity();
      try { localStorage.setItem(ALIGN_INT_KEY, JSON.stringify(_alignIntensity)); } catch(e) {}
      return true;
    }

    function _alignStopFirestoreListener() {
      if (_alignFsUnsub) { try { _alignFsUnsub(); } catch(e) {} }
      _alignFsUnsub = null;
      _alignFsUid = null;
    }

    // Stream the signed-in member's saved Alignment Signature and make it the live
    // source of truth for every politician card's match %. Using a real-time
    // onSnapshot listener (one lightweight per-user document, not polling) means
    // the saved choices stay authoritative: change them on another device or tab
    // and the cards here refresh automatically. If the member has no signature
    // yet, seed it once from whatever they picked locally before signing in so
    // pre-login selections are not lost. An empty saved array is respected as an
    // intentional "cleared" state rather than re-seeded.
    function _alignLoadFromFirestore(uid) {
      if (!uid) return;
      if (_alignFsUid === uid && _alignFsUnsub) return; // already streaming this user
      _alignStopFirestoreListener();
      _alignFsUid = uid;
      _alignFsUnsub = db.collection('users').doc(uid).onSnapshot(function(doc) {
        var data = (doc.exists && doc.data()) ? doc.data() : null;
        var saved = data ? data[ALIGN_FS_FIELD] : null;
        var savedInt = data ? data[ALIGN_FS_INT_FIELD] : null;
        if (Array.isArray(saved)) {
          _alignSeededUid = uid;
          // Apply the selection first, then the intensity overlay (which is
          // intersected against that selection). Repaint once if either changed.
          var c1 = _alignApplySaved(saved);
          var c2 = _alignApplyIntensity(savedInt);
          if (c1 || c2) _alignRefreshAll();
        } else if (_alignSeededUid !== uid && _alignIssues.size > 0) {
          // Brand-new signature → persist the visitor's current local picks (and
          // their intensity overlay) once, rather than wiping them.
          _alignSeededUid = uid;
          _alignSaveToFirestore();
        }
        _alignUpdateSigninPrompt();
      }, function(e) {
        console.warn('Alignment load from Firestore failed:', e);
        _alignUpdateSigninPrompt();
      });
    }
    window._alignLoadFromFirestore = _alignLoadFromFirestore;

    // Swap the save-status note between "sign in to save" and "saved to account".
    function _alignUpdateSigninPrompt() {
      var el = document.getElementById('align-signature-status');
      if (!el) return;
      if (_alignCurrentUser()) {
        el.className = 'align-future-note align-sig-saved';
        el.innerHTML = '<span class="align-future-ico">✅</span>' +
          '<span>Your <strong>Alignment Signature</strong> is saved to your account — your picks follow you across devices and load automatically every time you sign in.</span>';
      } else {
        el.className = 'align-future-note align-sig-signin';
        el.innerHTML = '<span class="align-future-ico">💾</span>' +
          '<span><strong>Sign in to save your Alignment Signature.</strong> Your selected positions will follow you across devices and reload automatically next time.' +
          '<button type="button" class="align-sig-btn" onclick="(window.openAuthModal||function(){})()">Sign in</button></span>';
      }
      // Keep the team-builder alignment prompt's save-state note (saved vs sign-in)
      // in step with auth, since this runs on every sign-in / sign-out.
      if (typeof window._myteamRenderAlignPrompt === 'function') window._myteamRenderAlignPrompt();
    }
    window._alignUpdateSigninPrompt = _alignUpdateSigninPrompt;

    // React to auth changes. Firebase supports multiple listeners, so adding our
    // own leaves the existing login/sync flow untouched. The listener also fires
    // immediately with the current state on registration, covering the case where
    // auth resolved before this tool initialized.
    function _alignBindAuth() {
      try {
        if (typeof auth === 'undefined' || !auth || !auth.onAuthStateChanged) return;
        auth.onAuthStateChanged(function(user) {
          if (user && !user.isAnonymous) {
            _alignLoadFromFirestore(user.uid);
          } else {
            // Signed out → stop streaming the previous member's signature and fall
            // back to localStorage-only behaviour.
            _alignStopFirestoreListener();
            _alignSeededUid = null;
            _alignUpdateSigninPrompt();
          }
        });
      } catch(e) {}
    }

    // RETIRED — _alignApplyLean. Do not reintroduce this, or anything shaped like it.
    //
    // It used to fill the gap when a candidate had neither a documented position nor
    // a formal-record pattern on one of the visitor's issues, by pulling the cell
    // toward a party target (aligned 80 / opposed 38, blended at 0.22). It read as a
    // light touch. Measured against the shipped roster it was not: only 6.2% of
    // (candidate × leaning-issue) cells carried a documented position, so 82.6% of
    // them were being answered by the letter next to the person's name. Independents
    // were exempt, which made the shape of the guess plain.
    //
    // The fix is not a better prior. There is no prior — ideology, caucus, state
    // lean, chamber, incumbency, or anything else — that belongs here. An issue the
    // candidate has not spoken to and the record has not answered is now DROPPED
    // from the match and reported in the coverage line, exactly as record mode has
    // always handled an issue its lane cannot answer. A smaller honest match beats
    // a complete guessed one.
    //
    // ISSUE_MAP still carries `lean` on some options. Nothing in the match score
    // reads it; word-action.js's branding disambiguator does (it is what keeps
    // gun_rights and gun_safety from collapsing into one key), so the field stays
    // as data. See scripts/test-match-no-party.mjs, which fails if any match-scoring
    // path starts reading it again.

    // ── Accountability as a matching signal — RETIRED ─────────────────────────
    // This block folded the Accountability of Truth composite into "Best Match
    // for You" as a bounded nudge (ACCT_MATCH_WEIGHT 0.2 around a neutral 50, so
    // at most a ±10-point swing). The nudge was switched off in an earlier pass —
    // see _acctMatchInfo below, which has been a pass-through ever since — but the
    // machinery survived it: _acctMatchScore(pid) still resolved the profile, ran
    // the honesty gate, called window._acctEnsureScore to compute and persist a
    // composite on demand, and memoized the 0-100 result. Nothing in the match
    // read it any more; what read it was the browse/compare comparator, which
    // sorted the entire roster by that number. With that comparator gone, this is
    // the accessor the composite would need to rank people again, so it is deleted
    // rather than left dormant:
    //
    //     ACCT_MATCH_WEIGHT / ACCT_MATCH_NEUTRAL   (dead constants)
    //     _acctMatchCache / window._acctMatchCacheBust
    //     _acctMatchScore / window._acctMatchScore
    //
    // The composite data on the profile object is untouched. There is simply no
    // longer a function that turns it into a rankable number. Callers of the
    // cache-buster (accountability-score.js, firebase-boot.js) dropped their calls
    // in the same pass. See scripts/test-acct-not-ranked.mjs.

    // Round a raw issue-alignment value and report it in the shape the breakdown
    // modal expects. The name is historical: this used to fold the Accountability
    // composite into the match and hand back the nudge so callers could explain it.
    //
    // ── SCORING CLEANUP (simplified system) ─────────────────────────────────────
    // Your Match is now PURELY issue-fit: the Accountability composite no longer
    // nudges it. This is a deliberate pass-through — it keeps the return shape
    // (base/acct/delta/adjusted) so every caller and the breakdown modal keep
    // working unchanged, but `acct` is always null and `delta` always zero. With
    // _acctMatchScore deleted above, there is no longer any code path that could
    // put a number back in them.
    function _acctMatchInfo(pid, base) {
      if (base === null || base === undefined) return { base: base, acct: null, delta: 0, adjusted: base };
      var rounded = Math.round(base);
      return { base: rounded, acct: null, delta: 0, adjusted: rounded };
    }
    window._acctMatchInfo = _acctMatchInfo;

    // Convenience: just the match % (see the pass-through note above).
    function _applyAcctToMatch(pid, base) { return _acctMatchInfo(pid, base).adjusted; }
    window._applyAcctToMatch = _applyAcctToMatch;

    // Optional bridge to My Stances: the voter's per-issue importance weighting.
    // Returns a positive multiplier (default 1.0 when My Stances isn't present or
    // the voter set no priority for this issue), so the scorer stays fully
    // functional on its own — this only ever scales weight, never direction.
    function _msPriorityMul(issueKey) {
      try {
        if (typeof window._msPriorityWeight === 'function') {
          var w = window._msPriorityWeight(issueKey);
          if (typeof w === 'number' && isFinite(w) && w > 0) return w;
        }
      } catch (e) {}
      return 1;
    }

    /* ═══════════════════════════════════════════════════════════════════════
       MATCH INPUT MODE — stated positions vs formal-record patterns
       -----------------------------------------------------------------------
       The tool has always asked one question: "how do this politician's
       positions fit my values?" — and answered it from what they SAID. That is
       the honest answer for a candidate whose whole record is a platform, and
       the wrong one for a twenty-year incumbent whose votes are the record.
       So the question splits in two, and the voter picks which one they are
       asking:

         stated  — their documented, sourced positions   (the shipped behaviour)
         record  — what their votes and formal actions DID on each issue

       SAME ISSUE LIST, SAME USER VALUES. Only the politician-side input moves.
       The verdict function (_issueVerdict), the weights, the intensity model,
       the My-Stances priority multiplier and the accountability nudge are the
       ones already shipped, unchanged in both modes.

       THE WALLS, and why each one is here:
         • A pattern is not a stated position. Record-mode rows never set
           `direct`, never carry `stance`/`text`, and never render the 📍 Stated
           badge or a stance pill — the surfaces that quote a politician read
           those fields, so keeping them null is what stops a derived pattern
           from being served as a quote.
         • Nothing is written back. This reads formalPatternIndex (itself a pure
           derivation of the vote pack) and writes to no map. _polPositionMap is
           never touched, so Direction Match — which reads it — cannot move.
         • No side is invented. An issue with no readable pattern is EXCLUDED
           from the record-mode score and reported as uncovered. This wall now
           runs both ways: the stated lane's keyword/party fill-in has been
           retired, so an issue with no documented position is excluded and
           reported too. Neither mode borrows the other's answer, and neither
           substitutes a guess for a silence.
         • Thin counts less. The pattern engine already ranks its own
           confidence; record mode multiplies the issue weight by that rank, so
           a one-vote lean moves the match about half as far as a uniform run.
       ═══════════════════════════════════════════════════════════════════════ */
    var ALIGN_MODE_KEY = 'politidex_align_matchmode';
    // DEFAULT: stated. The stated lane is the only one that covers the whole
    // field — a first-time candidate has positions and no roll calls at all —
    // so it stays the default and the record lane is the deliberate choice.
    var _alignMode = 'stated';
    var ALIGN_MODE_META = {
      stated: {
        key: 'stated', ico: '💬', label: 'Stated positions', short: 'Stated positions',
        verb: 'says', sub: 'What they have claimed — their documented, sourced positions on each issue.'
      },
      record: {
        key: 'record', ico: '🏛', label: 'Formal-record patterns', short: 'Record patterns',
        verb: 'did', sub: 'What their votes and formal actions did on each issue. A pattern is what the record did — not a stated position, and never part of Direction Match.'
      }
    };
    function _alignModeOf(v) { return (v === 'record') ? 'record' : 'stated'; }
    function _alignModeIsRecord(opts) {
      var m = (opts && opts.mode) ? _alignModeOf(opts.mode) : _alignMode;
      return m === 'record';
    }
    function _alignModeMeta(m) { return ALIGN_MODE_META[_alignModeOf(m || _alignMode)]; }

    // ── ONE NAME FOR THE VOTER-ALIGNMENT READ ────────────────────────────────
    // "Your Match" and "Direction Match" were two different measurements with
    // one word in common, printed side by side on the same cards, and a reader
    // had no way to tell from the labels alone that one compares a politician to
    // THEM and the other compares a politician to THEMSELVES. The fix is to name
    // the lane in the label: the formal-record lane is "Your Record Match".
    //
    // It is a function, not a constant, because this read has two lanes and only
    // one of them is a record match. In stated mode the number is built from
    // documented positions, not from votes — calling that "Your Record Match"
    // would trade one ambiguity for a plain falsehood. So the record lane gets
    // the locked name and the stated lane keeps the generic one, which is what
    // the mode toggle beside it already says out loud.
    //
    // Exposed on window because four other files print this label (compare-hub,
    // compare-table, profiles-full, and race-sheet's record lane) and a copy of
    // the string in each of them is how a name drifts. Every caller guards with
    // typeof and falls back to 'Your Match', which is the correct answer when
    // this module has not loaded: no mode has been resolved yet.
    function _pdxMatchLabel(opts) {
      return _alignModeIsRecord(opts) ? 'Your Record Match' : 'Your Match';
    }
    window.pdxMatchLabel = _pdxMatchLabel;
    window.alignMatchMode = function () { return _alignMode; };
    window.alignMatchModeMeta = function (m) { return _alignModeMeta(m || _alignMode); };

    // TIER → SIDE. The pattern engine's own tone is the direction: it is the
    // single place that decides whether a run of votes advanced or opposed an
    // issue, and re-deriving that here would be a second opinion about the same
    // votes. 'muted' (no clear pattern yet, no readable pole, an unread lane) has
    // no side, so it maps to nothing and the issue drops out.
    var _ALIGN_TONE_SIDE = { support: 'support', oppose: 'oppose', mixed: 'mixed' };
    // TIER → CONFIDENCE. A weight multiplier, never a direction and never a
    // score: thin still counts, and counts about half.
    //
    // CLARITY BEFORE DEPTH — THE ONE ORDERING THIS TABLE MUST KEEP:
    //
    //     conf(split) ≤ conf(thin) ≤ conf(mostly) ≤ conf(strong)
    //
    // The multiplier decides how much of the weighted average an issue occupies,
    // and it is the only place in the record lane where HOW READABLE a record is
    // gets priced. Split used to sit at 0.6, above thin's 0.5, on the reasoning
    // that a deep split is a real finding while one vote is barely anything. Both
    // halves of that are true and the conclusion was still wrong, because the
    // finding a split reports is "we cannot say which way this went" — and paying
    // MORE for it than for a record that went one way plainly means the least
    // readable rows carry the most of the number. Measured on a two-issue basket
    // (a clear 1–0 and a 3–3 coin flip) the coin flip took 54.5% of the weighted
    // average against the clear vote's 45.5%: a record with no direction
    // outweighing a record with one, purely through this table.
    //   0.45 is the smallest value that restores the ordering. Nothing else moves:
    // the 90/55/12 ladder is untouched, split still resolves through tone `mixed`
    // to a `partial` verdict and can never reach a full match or mismatch, and a
    // deep split still counts — it just no longer counts for more than clarity.
    var _ALIGN_PAT_CONF = { strong: 1, mostly: 0.85, split: 0.45, thin: 0.5 };
    window._PDX_ALIGN_PAT_CONF = _ALIGN_PAT_CONF;

    // ── AND THE GUARD, BECAUSE A TABLE OF FOUR NUMBERS IS EASY TO EDIT ────────
    // The literal above is correct today. It was ALSO correct the day it was
    // written the first time, and it drifted anyway — split crept to 0.6 in an
    // unrelated pass and nothing on the running site noticed, because a weight
    // multiplier has no smell: every row still rendered, every percentage still
    // resolved, and the only symptom was that the least readable issues quietly
    // held the most of the number. A test caught it months later.
    //
    // So the ordering is enforced at RUNTIME rather than only asserted in the
    // harness, and it is enforced on the READ (below) rather than once at load —
    // a table repaired at load can be re-inverted at any point afterwards by
    // anything holding the published reference. Four comparisons per issue row is
    // not a cost worth optimising away.
    //
    // IT CLAMPS DOWNWARD, NEVER UPWARD. An out-of-order value is pulled down to
    // its neighbour's ceiling: an inverted split becomes exactly thin, never more.
    // Repairing upward would let a typo in a low slot RAISE the confidence of the
    // tier above it, which is the same class of silent drift with the sign
    // flipped. Down is the fail-closed direction — the worst a repair can do is
    // price two adjacent tiers the same.
    //
    // NOTE WHAT IT DOES NOT DO. It sets no direction, reads no record, and knows
    // nothing about any member. It is arithmetic about four constants.
    function _alignPatConfLock(t) {
      if (!t || typeof t !== 'object') return t;
      if (typeof t.strong !== 'number' || !isFinite(t.strong)) t.strong = 1;
      if (typeof t.mostly !== 'number' || !isFinite(t.mostly) || t.mostly > t.strong) t.mostly = t.strong;
      if (typeof t.thin !== 'number' || !isFinite(t.thin) || t.thin > t.mostly) t.thin = t.mostly;
      // CLARITY BEFORE DEPTH, IN ONE LINE: a record we could not read a direction
      // from may never be priced above one we could.
      if (typeof t.split !== 'number' || !isFinite(t.split) || t.split > t.thin) t.split = t.thin;
      return t;
    }
    _alignPatConfLock(_ALIGN_PAT_CONF);
    window._pdxAlignPatConfLock = _alignPatConfLock;

    function _alignRecordWarm(pid) {
      try {
        return !!(window.PDXVotingRecord && typeof window.PDXVotingRecord.memberRecords === 'function'
                  && window.PDXVotingRecord.memberRecords(pid));
      } catch (e) { return false; }
    }

    // ── WARM THE PACK THE BASELINE IS READ OFF ──────────────────────────────
    // The stated lane's fallback is a reading of the formal record, so it cannot
    // appear until that record is in cache — and for most of this file's history
    // nothing in the stated lane ever asked for one. The collapsed card learned to
    // (see _alignCardBar); the team surfaces did not, which is exactly where the
    // gap was widest: a saved team is six people rendered once, off screen from any
    // card bar, and every hole in it stayed a hole. This is the one line that makes
    // the fallback actually reachable from those surfaces, on the same debounced
    // batch-of-24 warmer record mode uses. A pack that never lands costs nothing:
    // the baseline simply does not appear and the lane behaves as it did before.
    function _alignWarmBaseline(pid) {
      try { if (pid && !_alignRecordWarm(pid)) _alignQueueConsistWarm(pid); } catch (e) {}
    }
    window._alignWarmBaseline = _alignWarmBaseline;

    // The politician-side input for record mode: { issueKey → signal }, built
    // once per politician per derivation epoch (PDXDataEpoch bumps the moment a
    // vote pack lands, so this can never serve a stale read of a warm record).
    var _armCache = {}, _armEpoch = -1;
    function _alignRecordSideMap(pid) {
      var ep = 0;
      try { ep = (typeof window.PDXDataEpoch === 'function') ? window.PDXDataEpoch() : 0; } catch (e) { ep = 0; }
      if (ep !== _armEpoch) { _armCache = {}; _armEpoch = ep; }
      var k = String(pid == null ? '' : pid);
      if (Object.prototype.hasOwnProperty.call(_armCache, k)) return _armCache[k];
      var out = { sides: {}, rows: 0, read: 0, warm: _alignRecordWarm(pid) };
      try {
        var FPI = window.PDXConsistency && window.PDXConsistency.formalPatternIndex;
        if (FPI && typeof FPI.rows === 'function') {
          (FPI.rows(pid) || []).forEach(function (x) {
            if (!x || !x.key) return;
            out.rows++;
            var side = _ALIGN_TONE_SIDE[x.tone];
            var conf = _alignPatConfLock(_ALIGN_PAT_CONF)[x.tier];
            // FAIL CLOSED: unread lane, no readable pole, or a tier this does
            // not know is not a side. It is an issue we say nothing about.
            //   `deferred` IS THE FOURTH WALL, and it is the same wall as the other
            // three. The index now prints a characterisation on every row holding
            // judged acts — including the shallow splits and the package-borne rows
            // it used to refuse outright — because a refusal over three dated,
            // sourced votes is a worse answer than "Split · 2 advanced · 1 against".
            // None of that is a side, and the match takes sides. A row flagged
            // `deferred` was read by quoting the browse lane, which characterises
            // nothing and scores nothing; the two doors into this map are still the
            // characterisation engine and the uniform thin door, on unchanged
            // floors. See the wall over `deferred` in consistency.js _fpiRows.
            if (!x.read || x.deferred || !side || !conf) return;
            out.read++;
            out.sides[x.key] = {
              side: side, tier: x.tier, tone: x.tone, conf: conf,
              label: x.patLabel, counts: x.counts,
              judged: (x.pat && x.pat.judged) || 0,
              advances: (x.pat && x.pat.advances) || 0,
              opposes: (x.pat && x.pat.opposes) || 0,
              rank: x.weight
            };
          });
        }
      } catch (e) {}
      _armCache[k] = out;
      return out;
    }
    window._alignRecordSideMap = _alignRecordSideMap;

    // Coverage of the visitor's OWN selected issues by the formal record — the
    // number the honesty note is built from. `pending` distinguishes "we have not
    // read their votes yet" from "their votes say nothing here", which are the
    // two states a sparse mode must never blur together.
    function _alignRecordCoverage(pid) {
      var m = _alignRecordSideMap(pid);
      var total = (typeof _alignIssues !== 'undefined' && _alignIssues) ? _alignIssues.size : 0;
      var covered = 0, thin = 0, split = 0, deep = 0, missing = [];
      if (total) {
        _alignIssues.forEach(function (key) {
          var s = m.sides[key];
          if (!s) {
            missing.push({ key: key, label: (ISSUE_MAP[key] && ISSUE_MAP[key].label) || key });
            return;
          }
          covered++;
          if (s.tier === 'thin') thin++;
          else if (s.tier === 'split') split++;
          else deep++;
        });
      }
      var warm = m.warm;
      var pending = !warm && !_consistTried[pid] && covered === 0 && total > 0;
      return {
        covered: covered, total: total, missing: missing,
        thin: thin, split: split, deep: deep,
        indexRows: m.rows, warm: warm, pending: pending,
        // SPARSE is a claim about the match, not about the person: fewer than
        // half the voter's issues carry a pattern, so the number they are
        // reading rests on a minority of what they asked about.
        sparse: covered > 0 && covered * 2 < total,
        thinLed: covered > 0 && thin > deep + split
      };
    }
    window._alignRecordCoverage = _alignRecordCoverage;

    // The same question asked of the stated lane: how many of the visitor's issues
    // does this candidate actually have a documented position on? Since the party
    // fill-in was retired, an issue with no position is dropped from the match
    // rather than guessed, so this is the number the coverage line has to say out
    // loud — otherwise a match built on 2 of 9 issues reads exactly like one built
    // on 9 of 9.
    // `said` is what they are on record as SAYING; `baseline` is what the formal
    // record itself did on an issue they have never been quoted on. The two are
    // counted apart and reported apart, because a visitor told "5 of your 6 issues
    // are covered" is owed the split between the five that are quotes and the ones
    // that are a reading of the votes.
    function _alignStatedCoverage(pid) {
      var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
      var polMap = (d && typeof window._polPositionMap === 'function')
        ? (window._polPositionMap(pid, d) || {}) : {};
      var rec = _alignRecordSideMap(pid);
      var total = (typeof _alignIssues !== 'undefined' && _alignIssues) ? _alignIssues.size : 0;
      var covered = 0, said = 0, baseline = 0, missing = [];
      // The baseline's OWN readability, counted apart from the quotes it stands in
      // for. A visitor told "3 of them came from the formal record" is owed the
      // next fact too: whether those three are deep runs or single acts. Without
      // it a thin baseline reads exactly like a twelve-vote one.
      var baseThin = 0, baseSplit = 0, baseDeep = 0;
      if (total) {
        _alignIssues.forEach(function (key) {
          if (polMap[key]) { covered++; said++; return; }
          var s = rec ? rec.sides[key] : null;
          if (s) {
            covered++; baseline++;
            if (s.tier === 'thin') baseThin++;
            else if (s.tier === 'split') baseSplit++;
            else baseDeep++;
            return;
          }
          missing.push({ key: key, label: (ISSUE_MAP[key] && ISSUE_MAP[key].label) || key });
        });
      }
      var warm = !!(rec && rec.warm);
      // PENDING vs EMPTY, IN THE STATED LANE TOO. The baseline is read off the same
      // vote pack record mode needs, so an unread pack is not "no record here" — it
      // is "not read yet". Those are the two states a fallback must never blur, and
      // until this existed the stated lane had only one of them: every hole read as
      // a permanent silence for as long as the pack took to land. Only claimable
      // while some picked issue actually has a hole for a baseline to fill.
      var pending = !warm && !_consistTried[pid] && missing.length > 0;
      return {
        covered: covered, total: total, missing: missing,
        said: said, baseline: baseline,
        baselineThin: baseThin, baselineSplit: baseSplit, baselineDeep: baseDeep,
        warm: warm, pending: pending,
        // Same claim as record mode's: about the match, never about the person.
        sparse: covered > 0 && covered * 2 < total,
        // More of this match stood in from the record than was quoted. A statement
        // about which lane the number came from, never a grade on the member.
        baselineLed: baseline > 0 && baseline > said
      };
    }
    window._alignStatedCoverage = _alignStatedCoverage;

    // Coverage for whichever lane is live, so a caller that does not care which
    // mode it is in can still tell the visitor what the number rests on.
    function _alignMatchCoverage(pid) {
      return _alignModeIsRecord() ? _alignRecordCoverage(pid) : _alignStatedCoverage(pid);
    }
    window._alignMatchCoverage = _alignMatchCoverage;

    // Switch modes. Repaints every alignment surface through the same refresh
    // path a chip toggle uses, so the whole page answers the new question at
    // once rather than half-answering the old one.
    window.alignSetMatchMode = function (mode, opts) {
      var next = _alignModeOf(mode);
      if (next === _alignMode) { _alignRenderModeRow(); return next; }
      _alignMode = next;
      try { localStorage.setItem(ALIGN_MODE_KEY, next); } catch (e) {}
      _alignRenderModeRow();
      // Record mode needs the vote packs the stated lane never asked for. Warm
      // the people already on screen so the mode fills in instead of reading as
      // "no pattern" everywhere for its first second.
      if (next === 'record') { try { _alignWarmVisibleForRecord(); } catch (e) {} }
      try { _alignRefreshAll(); } catch (e) {}
      if (!(opts && opts.quiet)) {
        try {
          var ov = document.getElementById('kr-align-overlay');
          if (ov && ov.style.display && ov.style.display !== 'none' && window._kraqRecordPid
              && typeof window.keyRacesAlignQuickView === 'function') {
            window.keyRacesAlignQuickView(window._kraqRecordPid);
          }
        } catch (e) {}
      }
      return next;
    };
    window.alignToggleMatchMode = function () {
      return window.alignSetMatchMode(_alignMode === 'record' ? 'stated' : 'record');
    };

    // Kick the batched record warmer for the politicians whose match is on
    // screen right now. Reuses the Say-vs-Do warmer (one /compare per batch of
    // 24, already debounced) — no new request path, no per-card fetch.
    function _alignWarmVisibleForRecord() {
      var seen = {}, n = 0;
      document.querySelectorAll('[data-align-pid]').forEach(function (el) {
        var pid = el.getAttribute('data-align-pid');
        if (!pid || seen[pid] || n >= 24) return;
        seen[pid] = 1; n++;
        _alignQueueConsistWarm(pid);
      });
    }

    /* ── Mode UI: the toggle, the mode tag, the per-row signal, the honesty note ──
       All four live here so every surface that shows a match reads the mode from
       one place and words it one way. */

    // The segmented control. `id` scopes it (the tool renders one, a breakdown
    // renders another) so two on screen at once stay in step through the same
    // state rather than each holding their own.
    function _alignModeToggleHtml(opts) {
      opts = opts || {};
      var cur = _alignMode;
      var segs = ['stated', 'record'].map(function (k) {
        var meta = ALIGN_MODE_META[k];
        var on = (k === cur);
        return '<button type="button" class="align-mode-seg' + (on ? ' is-on' : '') + '"' +
            ' data-align-mode="' + k + '" aria-pressed="' + (on ? 'true' : 'false') +
            '" onclick="event.stopPropagation();window.alignSetMatchMode(\'' + k + '\');"' +
            ' title="' + meta.sub.replace(/"/g, '&quot;') + '">' +
            '<span class="align-mode-ico" aria-hidden="true">' + meta.ico + '</span>' +
            (opts.compact ? meta.short : meta.label) +
          '</button>';
      }).join('');
      return '<div class="align-mode-row' + (opts.compact ? ' is-compact' : '') + '"' +
          ' data-align-mode-row="' + _alignModeOf(cur) + '" role="group" aria-label="Match politicians on stated positions or on their formal record">' +
          '<span class="align-mode-lead">Match on</span>' +
          '<span class="align-mode-segs">' + segs + '</span>' +
          (opts.compact ? '' : '<span class="align-mode-sub">' + ALIGN_MODE_META[cur].sub + '</span>') +
        '</div>';
    }
    window._alignModeToggleHtml = _alignModeToggleHtml;

    // The state, at a glance, on a surface that is showing a match. Rendered in
    // both modes: a number whose input is unnamed is the thing this pass exists
    // to end.
    function _alignModeTagHtml(opts) {
      opts = opts || {};
      var meta = ALIGN_MODE_META[_alignMode];
      return '<span class="align-mode-tag is-' + meta.key + '" data-align-mode-tag="' + meta.key + '"' +
          ' title="This match was produced from ' + meta.label.toLowerCase() + '. ' + meta.sub.replace(/"/g, '&quot;') + '">' +
          '<span aria-hidden="true">' + meta.ico + '</span>' +
          (opts.compact ? meta.short : 'Matched on ' + meta.label.toLowerCase()) +
        '</span>';
    }
    window._alignModeTagHtml = _alignModeTagHtml;

    // THE PER-ISSUE SOURCE LINE. Every compared issue names where the
    // politician's side came from, in the vocabulary of its own lane:
    //   Says: Supports                     — a documented position, quoted lane
    //   Record pattern: Mostly opposes ·
    //     8 advanced · 2 against           — what the votes did, counted lane
    // The record chip carries the pattern engine's own label and its own counts
    // (which are withheld when the index withholds them), never a stance verb
    // borrowed from the stated lane.
    var _ALIGN_SIDE_WORD = { support: 'Supports', oppose: 'Opposes', mixed: 'Mixed' };
    // The baseline tag, worded so the shortest possible read of the chip still
    // lands the two things a reader must not get wrong: it came from the record,
    // and it is not part of the integrity percentage.
    var _ALIGN_BASE_TAG = 'From the record';
    var _ALIGN_BASE_NOTE = 'No stated position on file for this issue, so the direction of the ' +
      'formal record stands in. A reading of the votes, not a quoted stance, and never counted ' +
      'in Direction Match.';
    function _alignSignalChipHtml(it) {
      if (!it) return '';
      if (it.source === 'record' && it.pattern) {
        var p = it.pattern;
        var counts = p.counts ? '<span class="align-sig-n"> · ' + p.counts + '</span>' : '';
        var baseTag = it.baseline
          ? '<span class="align-sig-base">' + _ALIGN_BASE_TAG + '</span>' : '';
        return '<span class="align-sig align-sig-rec is-' + p.tone + ' w-' + (p.rank || 'flat') +
            (it.baseline ? ' is-baseline' : '') + '"' +
            ' title="' + (it.baseline ? _ALIGN_BASE_NOTE
                          : (window._PDX_RD_TIER_NOTE || 'What the formal record did.')) + '">' +
            '<span aria-hidden="true">🏛</span><span class="align-sig-k">Record pattern:</span> ' +
            '<b>' + p.label + '</b>' + counts + baseTag +
          '</span>';
      }
      if (it.source === 'stated' && it.stance) {
        var word = _ALIGN_SIDE_WORD[it.stance] || 'Mixed';
        return '<span class="align-sig align-sig-said is-' + it.stance + '"' +
            ' title="A documented, sourced position on this exact issue — their own words.">' +
            '<span aria-hidden="true">💬</span><span class="align-sig-k">Says:</span> <b>' + word + '</b>' +
          '</span>';
      }
      return '';
    }
    window._alignSignalChipHtml = _alignSignalChipHtml;
    window._PDX_ALIGN_BASE_TAG = _ALIGN_BASE_TAG;
    window._PDX_ALIGN_BASE_NOTE = _ALIGN_BASE_NOTE;

    // ── WHERE ONE ROW'S SIDE CAME FROM, IN ONE GLYPH AND ONE WORD ────────────
    // THREE states, and the reason it is three rather than two is the whole of
    // this pass. `said` is a quote. `record` is the record answering the question
    // the visitor actually asked. `baseline` is the record standing in for a quote
    // that does not exist — the same bytes as `record`, a completely different
    // claim, and the one a reader is most likely to mistake for a promise. Every
    // "why this match" surface reads this table instead of composing its own
    // wording, so the three cannot drift apart across the card, the modal and the
    // team overview.
    var _ALIGN_SRC_META = {
      said:     { ico: '💬', short: 'Stated', word: 'a documented position',
                  cls: 'said',
                  note: 'A documented, sourced position on this exact issue — their own words.' },
      baseline: { ico: '🏛', short: _ALIGN_BASE_TAG, word: 'the formal record, standing in',
                  cls: 'baseline', note: _ALIGN_BASE_NOTE },
      record:   { ico: '🏛', short: 'Record', word: 'the formal record',
                  cls: 'record',
                  note: 'What their votes and formal actions did on this issue. A pattern is what the record did — not a stated position.' }
    };
    function _alignRowSource(it) {
      if (!it) return 'said';
      if (it.source === 'record') return it.baseline ? 'baseline' : 'record';
      return 'said';
    }
    window._alignRowSource = _alignRowSource;
    window._PDX_ALIGN_SRC_META = _ALIGN_SRC_META;

    // The source marker that rides on a compact chip — one glyph plus, for the
    // fallback only, the words that keep it from reading as a promise. A record
    // row in RECORD mode gets no extra tag: the visitor asked the record question,
    // so the record answering it is not a stand-in for anything.
    function _alignSrcMarkHtml(it) {
      var k = _alignRowSource(it);
      var m = _ALIGN_SRC_META[k];
      var thin = it && it.thin;
      return '<span class="align-src-mark is-' + m.cls + (thin ? ' is-thin' : '') + '"' +
          ' title="' + m.note.replace(/"/g, '&quot;') + (thin ? ' Thin or split on this issue, so it counts less.' : '') + '">' +
          '<span aria-hidden="true">' + m.ico + '</span>' +
          (k === 'baseline' ? '<span class="align-src-mark-lb">' + _ALIGN_BASE_TAG + '</span>' : '') +
          (thin ? '<span class="align-src-mark-thin">thin</span>' : '') +
        '</span>';
    }
    window._alignSrcMarkHtml = _alignSrcMarkHtml;

    // ── THE SOURCE MIX, IN ONE SENTENCE ──────────────────────────────────────
    // Built from the breakdown's own published tally, so the sentence and the
    // number can never disagree. Says what is in the match, what stood in, how
    // much of what stood in is thin, and what fell out entirely — in that order,
    // because that is the order a reader's trust drops.
    function _alignSourceMixText(bd, cov) {
      if (!bd || !bd.sources) return '';
      var s = bd.sources;
      var bits = [];
      if (s.said) bits.push(s.said + (s.said === 1 ? ' from a documented position' : ' from documented positions'));
      if (s.record) bits.push(s.record + ' from the formal record');
      if (s.baseline) bits.push(s.baseline + ' stood in from the formal record');
      if (!bits.length) return '';
      var txt = s.scored + ' of your ' + s.picked + ' issue' + (s.picked === 1 ? '' : 's') +
        ' are in this number — ' + bits.join(', ') + '.';
      if (s.thin) {
        txt += ' ' + (s.thin === 1 ? 'One of those rests on a thin or split record, so it counts less.'
                                   : s.thin + ' of those rest on thin or split records, so they count less.');
      }
      if (s.uncovered) {
        txt += ' ' + s.uncovered + ' ' + (s.uncovered === 1 ? 'is' : 'are') +
          ' not counted — nothing on file either way, and we will not estimate one.';
      }
      if (cov && cov.pending) txt += ' Their formal record is still being read, so this may fill in.';
      return txt;
    }
    window._alignSourceMixText = _alignSourceMixText;

    // ── "WHY THIS MATCH" ─────────────────────────────────────────────────────
    // The block that answers the question a percentage cannot: WHICH of the
    // visitor's issues moved this number, which way, and — the part that was
    // missing — whether each one came from something the candidate said or from a
    // reading of what their record did. Ranked by the weight the engine actually
    // gave the row, not by score, so the issues that moved the number most are the
    // issues named. Returns '' when there is no grounded breakdown; it never
    // invents a reason for a number it cannot explain.
    function _alignWhyMatchHtml(pid, opts) {
      opts = opts || {};
      if (typeof _alignIssues === 'undefined' || !_alignIssues || !_alignIssues.size) return '';
      var bd = (typeof _calcAlignmentBreakdown === 'function')
        ? _calcAlignmentBreakdown(pid, opts.mode ? { mode: opts.mode } : null) : null;
      if (!bd || !bd.issues || !bd.issues.length) return '';
      var maxUp = opts.maxUp || 3, maxDown = opts.maxDown || 2;
      var byWeight = function (a, b) { return (b.weight || 0) - (a.weight || 0); };
      var up = bd.issues.filter(function (i) { return i.score >= 55; }).sort(byWeight).slice(0, maxUp);
      var down = bd.issues.filter(function (i) { return i.score < 50; }).sort(byWeight).slice(0, maxDown);
      if (!up.length && !down.length) return '';
      var row = function (i, kind) {
        var c = _alignScoreColor(i.score);
        var lvl = _alignMigrateLevel(i.intensity);
        var star = (lvl === 'strongly_support' || lvl === 'strongly_oppose')
          ? '<span class="align-why-star" title="You weighted this strongly — it carries extra weight">★</span>' : '';
        return '<li class="align-why-row is-' + kind + (i.thin ? ' is-thin' : '') + '">' +
            '<span class="align-why-lab">' + star + i.label + '</span>' +
            _alignSrcMarkHtml(i) +
            '<span class="align-why-pct" style="color:' + c + ';">' + i.score + '%</span>' +
          '</li>';
      };
      var html = '<div class="align-why" data-align-mode="' + (bd.mode || 'stated') + '">' +
        '<div class="align-why-head">🎯 <b>Why this match</b><span class="align-why-sub">' +
          (bd.mode === 'record'
            ? 'the issues their record moved most'
            : 'the issues that moved this number most') + '</span></div>';
      if (up.length) {
        html += '<div class="align-why-grp"><span class="align-why-grp-lab is-up">▲ Pulling it up</span>' +
          '<ul class="align-why-list">' + up.map(function (i) { return row(i, 'up'); }).join('') + '</ul></div>';
      }
      if (down.length) {
        html += '<div class="align-why-grp"><span class="align-why-grp-lab is-down">▼ Pulling it down</span>' +
          '<ul class="align-why-list">' + down.map(function (i) { return row(i, 'down'); }).join('') + '</ul></div>';
      }
      var mix = _alignSourceMixText(bd, bd.coverage);
      if (mix) html += '<p class="align-why-mix">' + mix + '</p>';
      // THE WALL, WHEREVER A BASELINE APPEARS. Printed only when one actually did,
      // so it stays a disclosure rather than boilerplate.
      if (bd.sources && bd.sources.baseline) {
        html += '<p class="align-why-wall">🏛 <b>' + _ALIGN_BASE_TAG + '</b> means no stated position ' +
          'was on file, so the direction of the formal record stands in. That is a reading of the ' +
          'votes, not a quoted promise — and it is <b>not</b> counted in Direction Match.</p>';
      }
      return html + '</div>';
    }
    window._alignWhyMatchHtml = _alignWhyMatchHtml;

    // The stated lane's own coverage line. Before the party fill-in was retired
    // this did not need to exist: every issue got a number whether or not the
    // candidate had ever spoken to it, so there was nothing to disclose and
    // nothing honest to say. Now an unanswered issue is genuinely absent from the
    // match, which is only better than guessing if the visitor is told.
    function _alignStatedCoverageNoteHtml(pid, bd) {
      var c = _alignStatedCoverage(pid);
      if (!c.total) return '';
      var miss = c.missing.map(function (m) { return m.label; });
      var missLine = miss.length
        ? '<span class="align-cov-miss"><b>Not counted</b> (no documented position and no readable record): ' +
            miss.slice(0, 6).join(' · ') + (miss.length > 6 ? ' · +' + (miss.length - 6) + ' more' : '') +
          '</span>'
        : '';
      // The baseline, disclosed in the same breath as the number it moved. Worded
      // as what the RECORD did, never as what they said, and it names the wall.
      // …and how readable that stand-in is, because "3 came from the record" and
      // "3 came from the record, 2 of them off a single act" are different claims
      // and only one of them was being made.
      var _blThin = (c.baselineThin || 0) + (c.baselineSplit || 0);
      var _blThinTx = _blThin
        ? ' ' + (_blThin === 1 ? 'One of those readings is <b>thin or split</b>, so it counts less.'
                               : _blThin + ' of those readings are <b>thin or split</b>, so they count less.')
        : '';
      var blLine = c.baseline
        ? '<span class="align-cov-base">🏛 <b>' + c.baseline + ' of them</b> ' +
            (c.baseline === 1 ? 'has no stated position' : 'have no stated position') +
            ' on file, so the direction of their <b>formal record</b> stands in. That is a ' +
            'reading of the votes, not a quote — and it is <b>not</b> counted in Direction Match.' +
            _blThinTx + '</span>'
        : '';
      // STILL READING ≠ NOTHING THERE. Appended rather than substituted, so a
      // visitor reading a partial number is told it may still fill in without the
      // fraction in front of them being taken away and replaced by a spinner.
      var pendLine = c.pending && c.missing.length
        ? '<span class="align-cov-pend">⏳ Still reading their <b>formal record</b> — issues with no stated ' +
            'position may fill in from it once it lands.</span>'
        : '';
      // The wall, stated plainly: we would rather show a thinner match than fill
      // the hole with their party, their caucus, or a keyword guess.
      var wall = '<span class="align-cov-wall">These are left out of the match — they are <b>not</b> ' +
        'estimated from their party or their broader record. Nothing here is inferred.</span>';
      if (!c.covered && c.pending) {
        _alignQueueConsistWarm(pid);
        return '<div class="align-cov-note is-pending" data-align-cov="pending">' +
            '<span class="align-cov-ico" aria-hidden="true">⏳</span>' +
            '<span class="align-cov-txt"><b>Reading their formal record…</b> ' +
              'No documented position yet on the ' + c.total + ' issue' + (c.total === 1 ? '' : 's') +
              ' you picked. Where they have never been quoted, the direction of their formal record ' +
              'can stand in — so this may fill in once the record lands.</span>' +
          '</div>';
      }
      if (!c.covered) {
        return '<div class="align-cov-note is-none" data-align-cov="none">' +
            '<span class="align-cov-ico" aria-hidden="true">💬</span>' +
            '<span class="align-cov-txt"><b>No documented position on your issues.</b> ' +
              'We have no sourced position from them on any of the ' + c.total + ' issue' +
              (c.total === 1 ? '' : 's') + ' you picked, so there is nothing to match in this mode. ' + wall +
            '</span>' +
          '</div>';
      }
      var cls = c.sparse ? 'is-sparse' : 'is-ok';
      var lead = (c.sparse ? '<b>Sparse coverage</b> · ' : '') +
        '<b>' + c.covered + ' of your ' + c.total + ' issue' + (c.total === 1 ? '' : 's') + '</b>';
      var tail = c.baseline
        ? ' have a position to match against — ' + c.said + ' documented, ' + c.baseline + ' from the formal record.'
        : ' have a documented position to match against.';
      return '<div class="align-cov-note ' + cls + '" data-align-cov="' + (c.sparse ? 'sparse' : 'ok') + '">' +
          '<span class="align-cov-ico" aria-hidden="true">' + (c.sparse ? '⚠️' : '💬') + '</span>' +
          '<span class="align-cov-txt">' + lead + tail +
            ' ' + (miss.length ? wall : '') +
            blLine +
            pendLine +
            missLine +
          '</span>' +
        '</div>';
    }
    window._alignStatedCoverageNoteHtml = _alignStatedCoverageNoteHtml;

    // COVERAGE HONESTY. Both lanes. Says how much of what the voter asked the
    // active lane actually answers, names the issues it does not, and says in as
    // many words that those are not quietly scored from somewhere else instead.
    function _alignCoverageNoteHtml(pid, bd) {
      if (!_alignModeIsRecord()) return _alignStatedCoverageNoteHtml(pid, bd);
      var c = _alignRecordCoverage(pid);
      if (!c.total) return '';
      var miss = c.missing.map(function (m) { return m.label; });
      var missLine = miss.length
        ? '<span class="align-cov-miss"><b>Not counted</b> (no formal pattern on file): ' +
            miss.slice(0, 6).join(' · ') + (miss.length > 6 ? ' · +' + (miss.length - 6) + ' more' : '') +
          '</span>'
        : '';
      var wall = '<span class="align-cov-wall">These are left out of the match — they are <b>not</b> scored from ' +
        'stated positions instead. Switch to <b>Stated positions</b> to match on those.</span>';
      if (c.pending) {
        return '<div class="align-cov-note is-pending" data-align-cov="pending">' +
            '<span class="align-cov-ico" aria-hidden="true">⏳</span>' +
            '<span class="align-cov-txt"><b>Reading their formal record…</b> ' +
              'Matching on votes and formal actions across your ' + c.total + ' issue' + (c.total === 1 ? '' : 's') + '.</span>' +
          '</div>';
      }
      if (!c.covered) {
        return '<div class="align-cov-note is-none" data-align-cov="none">' +
            '<span class="align-cov-ico" aria-hidden="true">🏛</span>' +
            '<span class="align-cov-txt"><b>No formal-record pattern on your issues.</b> ' +
              'Their record on file does not read a direction on any of the ' + c.total + ' issue' +
              (c.total === 1 ? '' : 's') + ' you picked, so there is nothing to match in this mode. ' + wall +
            '</span>' +
          '</div>';
      }
      var cls = c.sparse ? 'is-sparse' : 'is-ok';
      var lead = (c.sparse ? '<b>Sparse coverage</b> · ' : '') +
        '<b>' + c.covered + ' of your ' + c.total + ' issue' + (c.total === 1 ? '' : 's') + '</b>';
      var thinNote = c.thin
        ? (c.thin === 1 ? ' One of them rests on a <b>thin</b> pattern, which counts less.'
                        : ' ' + c.thin + ' of them rest on <b>thin</b> patterns, which count less.')
        : '';
      return '<div class="align-cov-note ' + cls + '" data-align-cov="' + (c.sparse ? 'sparse' : 'ok') + '">' +
          '<span class="align-cov-ico" aria-hidden="true">' + (c.sparse ? '⚠️' : '🏛') + '</span>' +
          '<span class="align-cov-txt">' + lead + ' have a formal-record pattern to match against.' +
            thinNote + ' ' + (miss.length ? wall : '') +
            missLine +
          '</span>' +
        '</div>';
    }
    window._alignCoverageNoteHtml = _alignCoverageNoteHtml;

    // What a card says when the active lane says nothing on the voter's issues.
    // The alternative was returning '' — a blank space where a match used to be,
    // which reads as "we have no opinion" when the truth is "this lane has no
    // input here". Never a number, never a fallback. Since the party fill-in was
    // retired the stated lane can run dry too, so it gets the same treatment
    // rather than a silently missing card.
    function _alignModeGapBarHtml(pid) {
      if (!_alignModeIsRecord()) {
        var sc = _alignStatedCoverage(pid);
        if (!sc.total || sc.covered > 0) return '';
        // The stated lane gets record mode's pending state too, for the same
        // reason record mode has one: its fallback is read off the same pack, so
        // "nothing to match" printed over an unfetched record is a claim we have
        // not earned yet.
        if (sc.pending) {
          _alignQueueConsistWarm(pid);
          return '<div class="align-mode-gap is-pending" data-align-mode-gap="pending">' +
              '<span aria-hidden="true">⏳</span><span>💬 No stated position yet — reading their formal record…</span>' +
            '</div>';
        }
        return '<div class="align-mode-gap" data-align-mode-gap="none">' +
            '<span aria-hidden="true">💬</span>' +
            '<span>No documented position on your issues, and no formal record that reads a ' +
              'direction on them either — nothing to match, and we will not ' +
              'guess one from their party. ' + _alignModeSwapHtml('record') +
            '</span>' +
          '</div>';
      }
      var c = _alignRecordCoverage(pid);
      if (!c.total || c.covered > 0) return '';
      if (c.pending) {
        _alignQueueConsistWarm(pid);
        return '<div class="align-mode-gap is-pending" data-align-mode-gap="pending">' +
            '<span aria-hidden="true">⏳</span><span>🏛 Reading their formal record…</span>' +
          '</div>';
      }
      return '<div class="align-mode-gap" data-align-mode-gap="none">' +
          '<span aria-hidden="true">🏛</span>' +
          '<span>No formal-record pattern on your issues — nothing to match in this mode. ' +
            _alignModeSwapHtml() +
          '</span>' +
        '</div>';
    }
    window._alignModeGapBarHtml = _alignModeGapBarHtml;

    // The way back out of a dry lane. Shared so every "nothing to match here"
    // surface offers the same escape with the same words — switching modes is
    // the visitor's call, which is precisely why the code never makes it for them.
    function _alignModeSwapHtml(mode) {
      var to = (mode === 'record') ? 'record' : 'stated';
      return '<button type="button" class="align-mode-swap" data-align-mode-swap="' + to + '"' +
          ' onclick="event.stopPropagation();window.alignSetMatchMode(\'' + to + '\');">' +
          'Match on ' + ALIGN_MODE_META[to].label.toLowerCase() + '</button>';
    }
    window._alignModeSwapHtml = _alignModeSwapHtml;

    // The mode row inside the tool, plus the compact echo on the collapsed card.
    function _alignRenderModeRow() {
      var meta = ALIGN_MODE_META[_alignMode];
      ['align-mode-main', 'align-mode-rel'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.innerHTML = _alignModeToggleHtml({ compact: (id === 'align-mode-rel') });
      });
      var cm = document.getElementById('align-compact-mode');
      if (cm) {
        cm.innerHTML = meta.ico + ' Matching on <b>' + meta.label.toLowerCase() + '</b>';
        cm.setAttribute('data-align-mode', meta.key);
      }
    }
    window._alignRenderModeRow = _alignRenderModeRow;

    function _calcAlignmentScore(pid, opts) {
      if (_alignIssues.size === 0) return null;
      var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
      if (!d) return null;
      // MATCH INPUT MODE. `opts.mode` pins the lane for a caller that needs a
      // specific one (the Say-vs-Do score always asks the stated question);
      // otherwise the visitor's own choice decides.
      var _recMode = _alignModeIsRecord(opts);
      // THE SIDE MAP IS READ IN BOTH LANES NOW. In record mode it IS the lane. In
      // stated mode it is the BASELINE — the record-derived fallback that fills an
      // issue the candidate has never been quoted on, and only such an issue (see
      // the baseline resolution below the intensity model). It is memoized per
      // politician per epoch, so asking for it in the stated lane costs one lookup.
      var _recMap = _alignRecordSideMap(pid);

      var profile = (typeof PROFILES !== 'undefined') ? PROFILES[pid] : null;

      // The candidate's curated, sourced issue positions, keyed one-to-one to the
      // same ISSUE_MAP keys the picker uses. These are the most authoritative signal
      // we have — an explicit, documented "supports / opposes / mixed" on the exact
      // issue — so when a selected issue matches one, it drives the score directly
      // instead of being inferred from keyword overlap. This is what makes a thin
      // candidate (stated positions only, no voting record) genuinely scorable.
      var polMap = (typeof window._polPositionMap === 'function') ? (window._polPositionMap(pid, d) || {}) : {};

      var totalWeight = 0;
      var totalScore = 0;

      _alignIssues.forEach(function(issueKey) {
        var issueDef = ISSUE_MAP[issueKey];
        if (!issueDef) return;

        var relevance = 0;
        var polIssuesLower = (d.issues || []).map(function(i) { return i.toLowerCase(); });

        if (profile && profile.keyIssues) {
          profile.keyIssues.forEach(function(ki) {
            var kiLow = ki.toLowerCase();
            issueDef.keywords.forEach(function(kw) {
              if (kiLow.indexOf(kw.toLowerCase()) !== -1) relevance += 3;
            });
          });
        }

        issueDef.keywords.forEach(function(kw) {
          polIssuesLower.forEach(function(pi) {
            if (pi.indexOf(kw.toLowerCase()) !== -1) relevance += 2;
          });
        });

        var stanceScore = 0;
        var stanceCount = 0;
        if (d.stances) {
          issueDef.stanceKeys.forEach(function(sk) {
            var stance = d.stances[sk];
            if (!stance || stance === 'N/A' || stance === '—' || /^N\/A/i.test(stance)) return;
            stanceCount++;
            if (stance.indexOf('❌') !== -1) stanceScore += 0.2;
            else if (stance.indexOf('🔥') !== -1) stanceScore += 0.4;
            else if (/support|pledged|co-sponsor|100%|authored|champion|passed|expand/i.test(stance)) stanceScore += 1.0;
            else if (/oppose|voted no|against|skeptic/i.test(stance)) stanceScore += 0.7;
            else stanceScore += 0.5;
          });
        }

        var votingBonus = 0;
        var votingCount = 0;
        // Voting source now flows through the adapter: the full /api/voting-record
        // data when it's warm in cache, else the legacy PROFILES sections verbatim.
        var _votes = (typeof window._alignmentVotesAdapter === 'function') ? (window._alignmentVotesAdapter(pid) || []) : [];
        _votes.forEach(function(v) {
          var billLow = (v.bill || '').toLowerCase();
          var matterLow = (v.matter || '').toLowerCase();
          var text = billLow + ' ' + matterLow;
          var matches = issueDef.keywords.some(function(kw) { return text.indexOf(kw.toLowerCase()) !== -1; });
          if (matches) {
            votingCount++;
            if (v.alignment === 'kept') votingBonus += 1.0;
            else if (v.alignment === 'partial') votingBonus += 0.6;
            else if (v.alignment === 'broken') votingBonus += 0.15;
            else votingBonus += 0.5;
          }
        });

        var promiseBonus = 0;
        var promiseCount = 0;
        if (profile && profile.promises) {
          profile.promises.forEach(function(pr) {
            var prText = ((pr.title || '') + ' ' + (pr.detail || '')).toLowerCase();
            var matches = issueDef.keywords.some(function(kw) { return prText.indexOf(kw.toLowerCase()) !== -1; });
            if (matches) {
              promiseCount++;
              if (pr.verdict === 'kept') promiseBonus += 1.0;
              else if (pr.verdict === 'partial') promiseBonus += 0.5;
              else if (pr.verdict === 'pending') promiseBonus += 0.4;
              else if (pr.verdict === 'broken') promiseBonus += 0.1;
            }
          });
        }

        var issueWeight = 1;
        if (relevance > 0) issueWeight += Math.min(relevance, 8) * 0.4;
        if (stanceCount > 0) issueWeight += 1;
        if (votingCount > 0) issueWeight += 0.8;
        if (promiseCount > 0) issueWeight += 0.6;

        var baseScore = d.score;
        if (baseScore === null || baseScore === undefined) baseScore = 50;

        var issueScore = baseScore;
        if (stanceCount > 0) {
          var avgStance = stanceScore / stanceCount;
          issueScore = baseScore * 0.45 + avgStance * 50 * 0.55;
        }
        if (votingCount > 0) {
          var avgVoting = votingBonus / votingCount;
          issueScore = issueScore * 0.7 + avgVoting * 100 * 0.3;
        }
        if (promiseCount > 0) {
          var avgPromise = promiseBonus / promiseCount;
          issueScore = issueScore * 0.8 + avgPromise * 100 * 0.2;
        }
        if (relevance > 0) {
          issueScore = issueScore * (1 + Math.min(relevance, 10) * 0.025);
        }

        var _userIntensity = _alignMigrateLevel(_alignIntensity[issueKey] || ALIGN_DEFAULT_LEVEL);
        var _model = _alignLevelModel(_userIntensity);
        // In record mode the stated map is not consulted at all — not as a
        // fallback, not as a tie-breaker. The record answers or the issue is
        // dropped (see THE WALLS above).
        var recSig = _recMap ? (_recMap.sides[issueKey] || null) : null;
        if (_recMode && !recSig) return;
        var directPos = _recMode ? null : (polMap[issueKey] || null);
        // ── THE BASELINE, AND THE ORDER THAT MAKES IT SAFE ──────────────────
        // A DOCUMENTED POSITION ALWAYS WINS. In the stated lane the record side is
        // consulted only where the candidate has no documented position on this
        // exact issue: it fills a hole, it never overrides a quote, and the moment
        // a stance is curated for that issue the baseline stops being consulted
        // for it — no precedence table, no migration, one line.
        //   It is scored through the SAME ladder and the SAME confidence tier
        // record mode uses, so a baseline can never weigh more than the record
        // mode reading of the identical pattern. And it is marked, all the way
        // down: `baseline: true`, `source: 'record'`, `direct: false`, and no
        // stance / topic / prose — the fields every quoting renderer reads stay
        // null, exactly as they do on a record-mode row.
        var _baseline = false;
        if (!_recMode) {
          if (directPos) recSig = null;
          else if (recSig) _baseline = true;
        }

        if (recSig) {
          // The formal record's own direction on this issue, read through the
          // SAME verdict function and the SAME 90/55/12 ladder a documented
          // position uses — then scaled by the pattern's confidence tier, so a
          // one-vote lean cannot weigh like a twelve-vote run.
          var _rVerdict = (typeof window._issueVerdict === 'function') ? window._issueVerdict(_userIntensity, recSig.side) : 'partial';
          issueScore = _rVerdict === 'match' ? 90 : _rVerdict === 'partial' ? 55 : 12;
          issueWeight = Math.max(issueWeight, 2.6) * _model.weight * recSig.conf;
        } else if (directPos) {
          // The candidate has a documented position on this exact issue — the most
          // authoritative signal there is. Score it straight from that stance vs. the
          // visitor's own view (_issueVerdict already folds oppose/neutral picks into
          // the verdict), and give documented positions strong weight so they lead the
          // match. The stance level then scales the weight (stronger = heavier); we do
          // NOT additionally invert here because the verdict already accounts for it.
          var _verdict = (typeof window._issueVerdict === 'function') ? window._issueVerdict(_userIntensity, directPos.stance) : 'partial';
          issueScore = _verdict === 'match' ? 90 : _verdict === 'partial' ? 55 : 12;
          issueWeight = Math.max(issueWeight, 2.6) * _model.weight;
        } else {
          // NO POSITION, NO PATTERN → NO SCORE. Neither lane can answer this issue
          // for this candidate, so it leaves the weighted average untouched and is
          // reported instead (see _alignStatedCoverage / the coverage note). This is
          // the same fail-closed rule record mode has always applied to an issue its
          // own lane cannot answer; it now applies to both lanes. Nothing is
          // inferred here — not from party, not from keyword overlap, not from the
          // candidate's overall score.
          return;
        }

        // My Stances priority multiplier: the voter's own importance weighting on
        // this issue (High counts more, Low less; 1.0 when they set no priority or
        // only used the Alignment Tool). Applied uniformly to both branches so a
        // documented-position match and an inferred one weight priority the same.
        issueWeight *= _msPriorityMul(issueKey);

        totalWeight += issueWeight;
        totalScore += issueScore * issueWeight;
      });

      if (totalWeight === 0) return null;
      // Fold in the Accountability Score as a small, bounded nudge (neutral when
      // the record is too thin to score) so strong/weak integrity patterns move the
      // match without overriding the issue-by-issue fit.
      return _applyAcctToMatch(pid, totalScore / totalWeight);
    }

    // Per-issue version of the alignment score — same math, but it records each
    // selected issue's contribution so the Align quick-view can show a breakdown.
    function _calcAlignmentBreakdown(pid, opts) {
      if (_alignIssues.size === 0) return null;
      var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
      if (!d) return null;
      var profile = (typeof PROFILES !== 'undefined') ? PROFILES[pid] : null;
      // Kept in lock-step with _calcAlignmentScore: same mode resolution, same
      // record-side map, same early-out for an issue the record cannot answer.
      var _recMode = _alignModeIsRecord(opts);
      // Both lanes, for the reason given in _calcAlignmentScore: record mode reads
      // this AS the lane, stated mode reads it as the baseline behind the quotes.
      var _recMap = _alignRecordSideMap(pid);
      var _uncovered = [];

      // Same authoritative curated positions used by _calcAlignmentScore (kept in
      // lock-step), so the breakdown's per-issue scores and the headline % agree.
      var polMap = (typeof window._polPositionMap === 'function') ? (window._polPositionMap(pid, d) || {}) : {};

      var totalWeight = 0, totalScore = 0;
      var perIssue = [];

      _alignIssues.forEach(function(issueKey) {
        var issueDef = ISSUE_MAP[issueKey];
        if (!issueDef) return;

        var relevance = 0;
        var polIssuesLower = (d.issues || []).map(function(i) { return i.toLowerCase(); });

        if (profile && profile.keyIssues) {
          profile.keyIssues.forEach(function(ki) {
            var kiLow = ki.toLowerCase();
            issueDef.keywords.forEach(function(kw) {
              if (kiLow.indexOf(kw.toLowerCase()) !== -1) relevance += 3;
            });
          });
        }
        issueDef.keywords.forEach(function(kw) {
          polIssuesLower.forEach(function(pi) {
            if (pi.indexOf(kw.toLowerCase()) !== -1) relevance += 2;
          });
        });

        var stanceScore = 0, stanceCount = 0;
        if (d.stances) {
          issueDef.stanceKeys.forEach(function(sk) {
            var stance = d.stances[sk];
            if (!stance || stance === 'N/A' || stance === '—' || /^N\/A/i.test(stance)) return;
            stanceCount++;
            if (stance.indexOf('❌') !== -1) stanceScore += 0.2;
            else if (stance.indexOf('🔥') !== -1) stanceScore += 0.4;
            else if (/support|pledged|co-sponsor|100%|authored|champion|passed|expand/i.test(stance)) stanceScore += 1.0;
            else if (/oppose|voted no|against|skeptic/i.test(stance)) stanceScore += 0.7;
            else stanceScore += 0.5;
          });
        }

        var votingBonus = 0, votingCount = 0;
        var _bdVotes = (typeof window._alignmentVotesAdapter === 'function') ? (window._alignmentVotesAdapter(pid) || []) : [];
        _bdVotes.forEach(function(v) {
          var text = (v.bill || '').toLowerCase() + ' ' + (v.matter || '').toLowerCase();
          var matches = issueDef.keywords.some(function(kw) { return text.indexOf(kw.toLowerCase()) !== -1; });
          if (matches) {
            votingCount++;
            if (v.alignment === 'kept') votingBonus += 1.0;
            else if (v.alignment === 'partial') votingBonus += 0.6;
            else if (v.alignment === 'broken') votingBonus += 0.15;
            else votingBonus += 0.5;
          }
        });

        var promiseBonus = 0, promiseCount = 0;
        if (profile && profile.promises) {
          profile.promises.forEach(function(pr) {
            var prText = ((pr.title || '') + ' ' + (pr.detail || '')).toLowerCase();
            var matches = issueDef.keywords.some(function(kw) { return prText.indexOf(kw.toLowerCase()) !== -1; });
            if (matches) {
              promiseCount++;
              if (pr.verdict === 'kept') promiseBonus += 1.0;
              else if (pr.verdict === 'partial') promiseBonus += 0.5;
              else if (pr.verdict === 'pending') promiseBonus += 0.4;
              else if (pr.verdict === 'broken') promiseBonus += 0.1;
            }
          });
        }

        var issueWeight = 1;
        if (relevance > 0) issueWeight += Math.min(relevance, 8) * 0.4;
        if (stanceCount > 0) issueWeight += 1;
        if (votingCount > 0) issueWeight += 0.8;
        if (promiseCount > 0) issueWeight += 0.6;

        var baseScore = d.score;
        if (baseScore === null || baseScore === undefined) baseScore = 50;

        var issueScore = baseScore;
        if (stanceCount > 0) {
          var avgStance = stanceScore / stanceCount;
          issueScore = baseScore * 0.45 + avgStance * 50 * 0.55;
        }
        if (votingCount > 0) {
          var avgVoting = votingBonus / votingCount;
          issueScore = issueScore * 0.7 + avgVoting * 100 * 0.3;
        }
        if (promiseCount > 0) {
          var avgPromise = promiseBonus / promiseCount;
          issueScore = issueScore * 0.8 + avgPromise * 100 * 0.2;
        }
        if (relevance > 0) {
          issueScore = issueScore * (1 + Math.min(relevance, 10) * 0.025);
        }

        var _userIntensity = _alignMigrateLevel(_alignIntensity[issueKey] || ALIGN_DEFAULT_LEVEL);
        var _model = _alignLevelModel(_userIntensity);
        var recSig = _recMap ? (_recMap.sides[issueKey] || null) : null;
        // An issue the active lane says nothing about is REPORTED, not scored: it
        // leaves the weighted average untouched and lands in bd.uncovered, which
        // is what the coverage note is built from. True of both lanes — a record
        // with no pattern, and a candidate with no documented position, are the
        // same kind of silence and get the same treatment.
        if (_recMode && !recSig) {
          _uncovered.push({ key: issueKey, label: issueDef.label, intensity: _userIntensity });
          return;
        }
        var directPos = _recMode ? null : (polMap[issueKey] || null);
        // The baseline, in lock-step with _calcAlignmentScore: a documented
        // position wins outright, and the record side only ever fills a hole.
        var _baseline = false;
        if (!_recMode) {
          if (directPos) recSig = null;
          else if (recSig) _baseline = true;
        }
        var _verdict = null;

        if (recSig) {
          _verdict = (typeof window._issueVerdict === 'function') ? window._issueVerdict(_userIntensity, recSig.side) : 'partial';
          issueScore = _verdict === 'match' ? 90 : _verdict === 'partial' ? 55 : 12;
          issueWeight = Math.max(issueWeight, 2.6) * _model.weight * recSig.conf;
        } else if (directPos) {
          // Authoritative documented position — score straight from the stance vs.
          // the visitor's view (see _calcAlignmentScore for the rationale).
          _verdict = (typeof window._issueVerdict === 'function') ? window._issueVerdict(_userIntensity, directPos.stance) : 'partial';
          issueScore = _verdict === 'match' ? 90 : _verdict === 'partial' ? 55 : 12;
          issueWeight = Math.max(issueWeight, 2.6) * _model.weight;
        } else {
          // Neither lane can answer — reported, never guessed (kept in lock-step
          // with _calcAlignmentScore, which drops the same issue from the same
          // weighted average).
          _uncovered.push({ key: issueKey, label: issueDef.label, intensity: _userIntensity });
          return;
        }

        // My Stances priority multiplier (kept in lock-step with _calcAlignmentScore).
        var _prioMul = _msPriorityMul(issueKey);
        issueWeight *= _prioMul;

        totalWeight += issueWeight;
        totalScore += issueScore * issueWeight;

        // `direct` flags a curated, documented position on this exact issue (the
        // strongest evidence); the UI uses it to label the row honestly and to lead
        // with documented matches. `hasEvidence` stays true for those too.
        var hasEvidence = (!!directPos || relevance > 0 || stanceCount > 0 || votingCount > 0 || promiseCount > 0);
        // Stance-vs-record summary for this issue (voted vs. said), when the member's
        // votes are warm in cache — powers the consistency line in the breakdown UI.
        var _record = (typeof window._pdxRecordIssueSummary === 'function') ? window._pdxRecordIssueSummary(pid, issueKey) : null;
        // `source` names the lane this row's side came from, and the quoted
        // fields (stance / topic / text / direct) stay null on a record row —
        // those are the fields every "here is what they said" surface reads, so
        // a pattern cannot be rendered as a claim even by a caller that has not
        // heard of modes.
        perIssue.push({ key: issueKey, label: issueDef.label, score: Math.round(issueScore), weight: issueWeight, hasEvidence: hasEvidence, direct: !!directPos, verdict: _verdict, stance: directPos ? directPos.stance : null, topic: directPos ? directPos.topic : null, text: directPos ? directPos.text : null, intensity: _userIntensity, record: _record,
          source: recSig ? 'record' : 'stated',
          // `baseline` is the one field that separates "the visitor asked the
          // record question" from "the visitor asked the stated question and this
          // issue had no answer in that lane". Both are record-sourced rows and
          // both render through the record chip; only the second is a fallback,
          // and only the second carries the extra disclosure.
          baseline: _baseline,
          basis: recSig ? 'record' : 'stated',
          // HOW READABLE THIS ROW'S SIGNAL IS, hoisted out of `pattern` so a
          // renderer can mark a thin row without learning the tier table. `thin`
          // is true for a one-act lean AND for a deep split, because both are
          // "we cannot say much here" and both must look different from a run
          // that went one way. A documented position is never thin: a quote is a
          // quote at any depth.
          thin: !!(recSig && (recSig.tier === 'thin' || recSig.tier === 'split')),
          conf: recSig ? recSig.conf : 1,
          pattern: recSig ? { side: recSig.side, tier: recSig.tier, tone: recSig.tone, label: recSig.label, counts: recSig.counts, judged: recSig.judged, advances: recSig.advances, opposes: recSig.opposes, conf: recSig.conf, rank: recSig.rank } : null });
      });

      if (totalWeight === 0) return null;
      // Strongest-evidence issues first so the most meaningful matches lead.
      perIssue.sort(function(a, b) { return b.weight - a.weight; });
      // `issueOverall` is the pure issue-alignment fit; `overall` additionally folds
      // in the Accountability Score (kept in lock-step with _calcAlignmentScore) so
      // the headline % the UI shows matches the sort order. `acct`/`acctDelta` let
      // the quick-view explain how the integrity read moved the number.
      var _info = _acctMatchInfo(pid, totalScore / totalWeight);
      // WHERE THE NUMBER CAME FROM, COUNTED ONCE AND PUBLISHED. Every surface that
      // shows this match was recomputing some slice of it — "how many documented",
      // "how many stood in from the record", "how many are thin" — and each one
      // that got it slightly wrong got it wrong on its own. One tally, read by all
      // of them, and it distinguishes the three states that must never merge:
      // quoted, stood in from the record, and not on file at all.
      var _src = { said: 0, baseline: 0, record: 0, thin: 0, scored: perIssue.length,
                   uncovered: _uncovered.length, picked: perIssue.length + _uncovered.length };
      perIssue.forEach(function (it) {
        if (it.thin) _src.thin++;
        if (it.source === 'record') { if (it.baseline) _src.baseline++; else _src.record++; }
        else _src.said++;
      });
      return { overall: _info.adjusted, issueOverall: _info.base, acct: _info.acct, acctDelta: _info.delta, issues: perIssue,
        mode: _recMode ? 'record' : 'stated',
        uncovered: _uncovered,
        sources: _src,
        // BOTH LANES NOW. This was record-mode-only, which meant the lane that
        // actually has a fallback to disclose was the lane with no coverage object
        // to disclose it from, and every stated-lane caller had to go back to
        // _alignStatedCoverage by hand. Computed for the lane this breakdown
        // actually ran in, not for whichever one the visitor last clicked.
        coverage: _recMode ? _alignRecordCoverage(pid) : _alignStatedCoverage(pid) };
    }

    // Aggregate the whole 6-person team into a single alignment picture:
    //   • overall  — the team's average Your Match %
    //   • members  — each filled slot's name + match, sorted strongest first
    //   • issues   — every selected issue with the team's average score on it,
    //                sorted high→low, so we can surface what's driving the match
    //                and where the team falls short of the visitor's values.
    //
    // WHAT THIS USED TO HIDE. The average was taken only over the members who had
    // the issue covered, so an issue one candidate had a position on scored exactly
    // like an issue all six had positions on. A single 82% on Housing rendered as
    // "▲ Driving your match — Housing 82%" for a team of six, five of whom have
    // nothing on file. That is not a wrong average; it is an average of one, printed
    // without its denominator. We do NOT change the arithmetic — inventing a
    // neutral 50 for absent members would be exactly the artificial strength on thin
    // data we refuse elsewhere. We publish the denominator instead, plus where the
    // covered members actually SPLIT, and let the renderer say so out loud.
    function _calcTeamAlignment(pids) {
      if (typeof _calcAlignmentBreakdown !== 'function') return null;
      if (typeof _alignIssues === 'undefined' || !_alignIssues || _alignIssues.size === 0) return null;
      var members = [];
      var issueAgg = {};
      var _labels = {};
      var _src = { said: 0, baseline: 0, record: 0, thin: 0, scored: 0, picked: 0 };
      var _seed = function (key, label) {
        if (!issueAgg[key]) {
          issueAgg[key] = { key: key, label: label || _labels[key] || key, total: 0, count: 0,
                            said: 0, baseline: 0, record: 0, thin: 0,
                            high: null, low: null, scores: [], absent: [] };
        }
        if (label) issueAgg[key].label = label;
        return issueAgg[key];
      };
      (pids || []).forEach(function(pid) {
        // Same reason the slot band warms: a team overview can paint from a cold
        // cache, and a cold cache means every record-derived baseline silently
        // missing from the aggregate.
        _alignWarmBaseline(pid);
        var bd = _calcAlignmentBreakdown(pid);
        var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
        if (!bd || !d) return;
        var ms = (bd.sources || {});
        members.push({ pid: pid, name: d.name, score: bd.overall,
                       covered: (bd.issues || []).length,
                       picked: ms.picked || ((bd.issues || []).length + (bd.uncovered || []).length),
                       said: ms.said || 0, baseline: ms.baseline || 0, record: ms.record || 0,
                       thin: ms.thin || 0 });
        _src.said += ms.said || 0; _src.baseline += ms.baseline || 0;
        _src.record += ms.record || 0; _src.thin += ms.thin || 0;
        _src.scored += (bd.issues || []).length;
        _src.picked += ms.picked || ((bd.issues || []).length + (bd.uncovered || []).length);
        bd.issues.forEach(function(it) {
          var a = _seed(it.key, it.label);
          a.total += it.score; a.count++;
          a.scores.push(it.score);
          if (a.high === null || it.score > a.high) a.high = it.score;
          if (a.low === null || it.score < a.low) a.low = it.score;
          var sk = _alignRowSource(it);
          a[sk]++;
          if (it.thin) a.thin++;
        });
        // Seed the rows nobody covered too, so an issue the visitor picked and the
        // whole team is silent on still gets a row — as a hole, not as an omission.
        (bd.uncovered || []).forEach(function(u) {
          _labels[u.key] = u.label;
          _seed(u.key, u.label).absent.push(d.name);
        });
      });
      if (!members.length) return null;
      var overall = Math.round(members.reduce(function(s, m) { return s + m.score; }, 0) / members.length);
      var nMembers = members.length;
      var issues = [], uncovered = [];
      Object.keys(issueAgg).forEach(function(k) {
        var a = issueAgg[k];
        var row = {
          key: k, label: a.label,
          score: a.count ? Math.round(a.total / a.count) : null,
          covered: a.count, members: nMembers,
          said: a.said, baseline: a.baseline, record: a.record, thin: a.thin,
          high: a.high, low: a.low,
          spread: (a.count > 1 && a.high !== null) ? (a.high - a.low) : 0,
          agree: a.scores.filter(function (v) { return v >= 55; }).length,
          differ: a.scores.filter(function (v) { return v < 50; }).length,
          absent: a.absent,
          // "Readable formal signal" = at least two members scored AND none of the
          // scores leaned on a thin/split record. This is the gate for the split and
          // overlap rows: we only claim the team divides on an issue when there is
          // enough on file for the division to be real.
          readable: a.count >= 2 && a.thin === 0,
          partial: a.count > 0 && a.count < nMembers
        };
        if (!a.count) uncovered.push(row); else issues.push(row);
      });
      issues.sort(function(a, b) { return b.score - a.score; });
      uncovered.sort(function(a, b) { return (a.label > b.label) ? 1 : -1; });
      members.sort(function(a, b) { return b.score - a.score; });
      // Where the team genuinely divides: widest readable spread first.
      var splits = issues.filter(function (i) { return i.readable && i.spread >= 35; })
                         .slice().sort(function (a, b) { return b.spread - a.spread; });
      // …and where it genuinely agrees: everyone scored, everyone scored well.
      var overlaps = issues.filter(function (i) {
        return i.readable && i.covered === nMembers && i.spread <= 20 && i.score >= 55;
      });
      return { overall: overall, members: members, issues: issues,
               uncovered: uncovered, splits: splits, overlaps: overlaps,
               sources: _src, mode: _alignModeIsRecord() ? 'record' : 'stated' };
    }
    window._calcTeamAlignment = _calcTeamAlignment;

    /* ─────────────────────────────────────────────────────────────────────
       CONSISTENCY (Say-vs-Do) SCORE — the second, additive score.
       ---------------------------------------------------------------------
       Stance Match (_calcAlignmentScore) asks "do their STATED positions line
       up with my values?". This asks the complementary question: "for the
       issues where they've stated a position, does their RECORD actually back
       it up?" — pure integrity, independent of whether the visitor agrees.

       It reuses _calcAlignmentBreakdown, which already attaches a per-issue
       `record` summary (window._pdxRecordIssueSummary → _issueRecordSummary)
       AND a per-issue `weight` (the same intensity × My-Stances-priority weight
       the match uses). Deriving from that keeps the two scores in perfect
       lock-step and adds no parallel scoring math.

       Per stated issue with a voting record, the record's own weighted verdict
       gives a 0..1 value:  consistentScore / (consistentScore + contradictScore).
       Records that are purely mixed/no-position count as 0.5 (genuinely split),
       never as a fake win. The score is the weight-averaged value × 100.

       Honesty rules (no invented numbers):
         • A stated position with NO votes on record → counted as "limited",
           excluded from the score (never scored as 0 or 50).
         • Records not yet warm in the sync cache → `pending:true`; the caller
           kicks a batched fetch (fetchCompare) and re-renders when it lands.
         • Nothing stated on the visitor's issues → score null (nothing to check).
       Returns null only when there are no selected issues / no record at all. */
    function _consistFromRecord(rec) {
      if (!rec || !rec.total) return null;                 // no votes on this issue
      var pos = rec.consistentScore || 0, neg = rec.contradictScore || 0;
      if (pos + neg <= 0) return 0.5;                      // only mixed / no-position votes
      return pos / (pos + neg);
    }

    function _calcConsistencyScore(pid) {
      if (typeof _alignIssues === 'undefined' || !_alignIssues || _alignIssues.size === 0) return null;
      // ALWAYS the stated lane: this score exists to check a record against a
      // stated position, so it reads the stated breakdown whatever the visitor
      // has the match set to. Say-vs-Do is byte-identical in both modes.
      var bd = (typeof _calcAlignmentBreakdown === 'function') ? _calcAlignmentBreakdown(pid, { mode: 'stated' }) : null;
      if (!bd || !bd.issues) return null;

      var warm = !!(window.PDXVotingRecord && typeof window.PDXVotingRecord.memberRecords === 'function'
                    && window.PDXVotingRecord.memberRecords(pid));
      var totalW = 0, totalV = 0;
      var rated = 0, limited = 0, stated = 0, contra = 0, consist = 0;
      var issues = [];
      var anyPending = false;
      var PC = window.PDXConsistency;

      bd.issues.forEach(function (it) {
        if (!it.direct) return;            // Official Record needs a stated position (the "say")
        stated++;
        // Source each issue's verdict from the SAME officialRecord() feed every other
        // Official Record surface uses (vr_* roll-call record authoritative, with the
        // migrated curated formal actions filling issues that have no roll call yet).
        // Fall back to the vr_*-only record when the shared engine isn't loaded. This
        // is still formal-action only — no curated public-record (Say-vs-Do) content.
        var nv, val, tot;
        if (PC && typeof PC.officialRecord === 'function') {
          var ov = PC.officialRecord(pid, it.key);
          if (ov && ov.token === 'pending') { anyPending = true; return; }   // still loading — not rated yet
          nv = ov ? ov.token : null;
          val = (ov && typeof ov.score === 'number') ? ov.score / 100 : null;
          tot = ov ? (ov.record ? ov.record.total : (ov.officialActions ? ov.officialActions.total : 0)) : 0;
        } else {
          val = _consistFromRecord(it.record);
          nv = it.record ? it.record.netVerdict : null;
          tot = it.record ? it.record.total : 0;
        }
        if (val === null) { limited++; return; }   // stated but nothing to score → honest "limited"
        rated++;
        if (nv === 'contradicts') contra++;
        else if (nv === 'consistent') consist++;
        var w = it.weight || 1;
        totalW += w; totalV += val * w;
        issues.push({ key: it.key, label: it.label, netVerdict: nv, total: tot, val: val });
      });

      // Pending when a stated position could be checked but nothing is scored yet and
      // votes are still loading. Curated formal actions resolve synchronously, so a
      // member with only curated coverage is rated immediately (no false pending).
      var pending = anyPending || (stated > 0 && rated === 0 && !warm && !_consistTried[pid]);
      var score = totalW > 0 ? Math.round(100 * totalV / totalW) : null;
      issues.sort(function (a, b) { return b.total - a.total; });
      return {
        score: score, rated: rated, limited: limited, stated: stated,
        contradictions: contra, consistentIssues: consist,
        pending: pending, warm: warm, issues: issues
      };
    }
    window._calcConsistencyScore = _calcConsistencyScore;

    // ── Batched, debounced voting-record warmer for the Consistency score ───────
    // The card bars render synchronously for a whole field of politicians, so we
    // never fetch per card. When a bar finds itself `pending`, it registers the
    // pid here; a short debounce coalesces the field into ONE /compare request
    // (which seeds PDXVotingRecord's sync cache for every member), then refreshes
    // the alignment surfaces so the real Consistency scores fill in. _consistTried
    // marks settled pids so a member with genuinely no record shows an honest
    // "limited record" state instead of re-fetching forever.
    var _consistTried = {};   // pid → true once a warm attempt has settled
    var _consistReq = {};     // pid → true while queued / in flight
    var _consistQueue = [];
    var _consistTimer = null;

    function _alignFlushConsistWarm() {
      _consistTimer = null;
      if (!(window.PDXVotingRecord && typeof window.PDXVotingRecord.fetchCompare === 'function')) { _consistQueue = []; return; }
      var batch = _consistQueue.splice(0, 24);   // bound the request size
      if (!batch.length) return;
      var settle = function () {
        batch.forEach(function (p) { _consistTried[p] = true; delete _consistReq[p]; });
      };
      window.PDXVotingRecord.fetchCompare(batch).then(function () {
        settle();
        if (typeof _alignRefreshAll === 'function') { try { _alignRefreshAll(); } catch (e) {} }
        if (_consistQueue.length && !_consistTimer) _consistTimer = setTimeout(_alignFlushConsistWarm, 140);
      }, function () { settle(); });
    }
    function _alignQueueConsistWarm(pid) {
      if (!pid || _consistTried[pid] || _consistReq[pid]) return;
      if (!(window.PDXVotingRecord && typeof window.PDXVotingRecord.fetchCompare === 'function')) return;
      _consistReq[pid] = true; _consistQueue.push(pid);
      if (!_consistTimer) _consistTimer = setTimeout(_alignFlushConsistWarm, 140);
    }
    // Exposed for surfaces that live in another file and open onto record mode
    // cold — the race sheet defaults to the formal lane, so the field it is about
    // to rank needs the vote packs the stated lane never fetched. Handing them to
    // THIS queue rather than fetching per surface is the point: one debounced
    // /compare per batch of 24, the settled-pid map shared, and _alignRefreshAll
    // repainting every listener at once when it lands. A caller that reaches for
    // its own fetch would re-request records this queue already has.
    window._alignQueueConsistWarm = _alignQueueConsistWarm;

    // Rich "Team Alignment Overview" rendered into #myteam-alignment-bar. Gives the
    // visitor a plain-language read on how aligned their current team is, a per-member
    // breakdown, and — crucially — which of their selected issues are driving the
    // match up or dragging it down. Everything is tappable into the per-candidate
    // breakdown so the overview is a launch pad, not a dead end.
    function _renderTeamAlignOverview(ta) {
      if (!ta) return '';
      var col = _alignScoreColor(ta.overall);
      var word = ta.overall >= 70 ? 'strongly aligned' : ta.overall >= 50 ? 'partly aligned' : 'weakly aligned';
      // The visitor's pick count, not the covered count. The old number quietly
      // shrank to whatever the team could answer, so a team with holes reported a
      // smaller question rather than an incomplete answer to the real one.
      var nIssues = ta.issues.length + ((ta.uncovered || []).length);

      var memberChips = ta.members.map(function(m) {
        var mc = _alignScoreColor(m.score);
        return '<button type="button" onclick="if(window.keyRacesAlignQuickView)window.keyRacesAlignQuickView(\'' + m.pid + '\');" class="myteam-ao-chip" title="See ' + m.name + '’s issue-by-issue breakdown" style="border-color:' + mc + '55;">' +
            '<span class="myteam-ao-chip-name">' + m.name + '</span>' +
            '<span class="myteam-ao-chip-pct" style="color:' + mc + ';">' + m.score + '%</span>' +
          '</button>';
      }).join('');

      // Carry the saved team (ids + names) so each per-issue "See everyone's
      // evidence" jump can hand the Locker its highlight context — the My Team
      // counterpart to Compare's lineup carry. Read live by _myteamOpenIssueEvidence
      // on click, so it always reflects the team this overview was painted for.
      window._pdxTeamEvidenceCtx = {
        pols: ta.members.map(function(m) { return m.pid; }),
        names: ta.members.map(function(m) { return m.name; })
      };

      // Drivers: the issues the team scores best on (top, score ≥ 55) and the soft
      // spots where it lags (bottom, score < 50). Caps keep it scannable.
      var drivers = ta.issues.filter(function(i) { return i.score >= 55; }).slice(0, 3);
      var weak = ta.issues.filter(function(i) { return i.score < 50; }).slice(-2).reverse();
      // The denominator, on the chip itself. "4/6" next to a percentage is the
      // difference between "your team is 82% aligned on Housing" and "the four of
      // your six picks with anything on file average 82% on Housing" — and it costs
      // four characters. Thin rows get the dashed treatment so a number resting on a
      // split record never looks as solid as one resting on six clean ones.
      var covMark = function (i) {
        if (!i.covered || i.covered >= i.members) return '';
        return '<span class="myteam-ao-issue-cov" title="' + i.covered + ' of your ' + i.members +
          ' pick' + (i.members === 1 ? '' : 's') + ' have anything on file here — the rest are not counted, not counted as neutral">' +
          i.covered + '/' + i.members + '</span>';
      };
      var srcMark = function (i) {
        if (ta.mode === 'record' || !i.baseline) return '';
        return '<span class="myteam-ao-issue-src" aria-hidden="true" title="' +
          i.baseline + ' of these ' + (i.baseline === 1 ? 'is' : 'are') + ' ' + _ALIGN_BASE_TAG.toLowerCase() +
          ', not a stated position">🏛</span>';
      };
      var issueChip = function(i, kind) {
        var ic = _alignScoreColor(i.score);
        if (i.thin) kind += ' is-thin';
        if (i.partial) kind += ' is-partial';
        var inner = '<span class="myteam-ao-issue-lab">' + i.label + '</span>' +
            srcMark(i) + covMark(i) +
            '<span class="myteam-ao-issue-pct" style="color:' + ic + ';">' + i.score + '%</span>';
        // Evidence jump — only when the issue has a tracked key AND there's evidence
        // on record for it (or the Locker library hasn't loaded yet, so we can't rule
        // it out). Opens the Evidence Locker filtered to this issue with the saved
        // team layered on as a highlight banner — reusing Compare's exact pattern
        // rather than forcing a multi-select politician filter. Gated so a tap never
        // lands on an empty file.
        var lockable = !!(i.key && typeof window._pdxOpenEvidenceLocker === 'function');
        if (lockable && typeof window._pdxEvidenceOnRecord === 'function') {
          var onRec = window._pdxEvidenceOnRecord([i.key]);   // null = library still loading
          if (onRec !== null && onRec.length === 0) lockable = false;
        }
        if (lockable) {
          var jk = String(i.key).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          return '<button type="button" class="myteam-ao-issue myteam-ao-issue-ev ' + kind + '" ' +
              'style="border-color:' + ic + '4d;" ' +
              'onclick="window._myteamOpenIssueEvidence&&window._myteamOpenIssueEvidence(\'' + jk + '\');" ' +
              'title="See everyone’s evidence on ' + i.label + ' in the Evidence Locker — your saved team is highlighted" ' +
              'aria-label="See everyone’s evidence on ' + i.label + ' in the Evidence Locker — your saved team members are highlighted">' +
              inner + '<span class="myteam-ao-issue-ev-cue" aria-hidden="true">📂 ↗</span>' +
            '</button>';
        }
        return '<span class="myteam-ao-issue ' + kind + '" style="border-color:' + ic + '4d;">' + inner + '</span>';
      };
      var driversHtml = '';
      if (drivers.length) {
        driversHtml += '<div class="myteam-ao-drow"><span class="myteam-ao-drow-lab" style="color:#86efac;">▲ Driving your match</span>' +
          drivers.map(function(i) { return issueChip(i, 'good'); }).join('') + '</div>';
      }
      if (weak.length) {
        driversHtml += '<div class="myteam-ao-drow"><span class="myteam-ao-drow-lab" style="color:#fca5a5;">▼ Where your team falls short</span>' +
          weak.map(function(i) { return issueChip(i, 'bad'); }).join('') + '</div>';
      }
      if (!driversHtml) {
        driversHtml = '<div class="myteam-ao-drow"><span class="myteam-ao-drow-lab" style="color:#9fb4d4;">Across your ' + nIssues + ' selected issue' + (nIssues === 1 ? '' : 's') + '</span>' +
          ta.issues.slice(0, 3).map(function(i) { return issueChip(i, 'good'); }).join('') + '</div>';
      }

      // WHERE YOUR TEAM SPLITS. The single most useful thing a team overview can
      // tell someone assembling a slate, and the one thing an average structurally
      // destroys: two picks at 90% and two at 20% average to the same 55% as four
      // picks at 55%. Only shown for issues with readable signal on at least two
      // members, so a split is never manufactured out of one thin record.
      var splitHtml = '';
      var _splits = (ta.splits || []).slice(0, 2);
      if (_splits.length) {
        splitHtml = '<div class="myteam-ao-drow is-split"><span class="myteam-ao-drow-lab" style="color:#fcd34d;">⚖ Where your team splits</span>' +
          _splits.map(function (i) {
            return '<span class="myteam-ao-issue split" title="Your picks range from ' + i.low + '% to ' + i.high +
                '% here — the ' + i.score + '% average hides that" style="border-color:#fcd34d4d;">' +
                '<span class="myteam-ao-issue-lab">' + i.label + '</span>' + srcMark(i) +
                '<span class="myteam-ao-issue-range">' + i.low + '–' + i.high + '%</span>' +
              '</span>';
          }).join('') + '</div>';
      } else {
        var _ovl = (ta.overlaps || []).slice(0, 2);
        if (_ovl.length) {
          splitHtml = '<div class="myteam-ao-drow is-overlap"><span class="myteam-ao-drow-lab" style="color:#7dd3fc;">⇊ Your whole team lines up</span>' +
            _ovl.map(function (i) {
              return '<span class="myteam-ao-issue overlap" title="All ' + i.members +
                  ' picks have something on file here and none of them are far apart" style="border-color:#7dd3fc4d;">' +
                  '<span class="myteam-ao-issue-lab">' + i.label + '</span>' + srcMark(i) +
                  '<span class="myteam-ao-issue-pct" style="color:#7dd3fc;">' + i.score + '%</span>' +
                '</span>';
            }).join('') + '</div>';
        }
      }
      driversHtml += splitHtml;

      // NOT ENOUGH ON FILE — deliberately styled as an absence, not a low score.
      // These issues have no percentage anywhere in the row, because the failure
      // mode we are fixing is a hole reading as a mild yes.
      var _unc = ta.uncovered || [];
      if (_unc.length) {
        driversHtml += '<div class="myteam-ao-drow is-empty"><span class="myteam-ao-drow-lab" style="color:#8fa3bf;">○ Not enough on file</span>' +
          _unc.slice(0, 4).map(function (i) {
            return '<span class="myteam-ao-issue empty" title="None of your ' + i.members +
                ' picks has a documented position or a readable formal record here. Not counted — not counted as neutral.">' +
                '<span class="myteam-ao-issue-lab">' + i.label + '</span>' +
                '<span class="myteam-ao-issue-none">no read</span>' +
              '</span>';
          }).join('') +
          (_unc.length > 4 ? '<span class="myteam-ao-issue-more">+' + (_unc.length - 4) + ' more</span>' : '') +
          '</div>';
      }

      // One sentence naming what the number is made of. Counts, never percentages —
      // a percentage of a percentage is exactly the kind of derived confidence this
      // tool refuses to manufacture.
      var _s = ta.sources || {};
      var mixBits = [];
      if (_s.said) mixBits.push('<b>' + _s.said + '</b> from ' + (_s.said === 1 ? 'a documented position' : 'documented positions'));
      if (_s.baseline) mixBits.push('<b>' + _s.baseline + '</b> stood in from the formal record');
      if (_s.record) mixBits.push('<b>' + _s.record + '</b> from the formal record');
      var mixHtml = '';
      if (mixBits.length) {
        mixHtml = '<div class="myteam-ao-mix"><b>' + _s.scored + '</b> issue–candidate read' +
          (_s.scored === 1 ? '' : 's') + ' are in this number — ' +
          (mixBits.length === 1 ? mixBits[0] : mixBits.slice(0, -1).join(', ') + ' and ' + mixBits[mixBits.length - 1]) + '.' +
          (_s.thin ? ' <span class="myteam-ao-mix-thin">' + _s.thin + ' rest' + (_s.thin === 1 ? 's' : '') +
            ' on a thin or split record and count' + (_s.thin === 1 ? 's' : '') + ' for less.</span>' : '') +
          (_s.picked > _s.scored ? ' <span class="myteam-ao-mix-gap">Another <b>' + (_s.picked - _s.scored) +
            '</b> were left out for want of anything on file — not scored as neutral.</span>' : '') +
          (_s.baseline ? '<span class="myteam-ao-mix-wall">🏛 <b>' + _ALIGN_BASE_TAG + '</b> means no stated ' +
            'position was on file, so the direction of that pick\'s formal record stood in — a reading of ' +
            'the votes, not a quoted stance, and never counted in Direction Match.</span>' : '') +
          '</div>';
      }

      return '<div class="myteam-ao-top">' +
          '<div class="myteam-ao-score" style="color:' + col + ';text-shadow:0 0 22px ' + col + '55;">' + ta.overall + '<span>%</span></div>' +
          '<div class="myteam-ao-head">' +
            '<div class="myteam-ao-title">🎯 Team Alignment Overview</div>' +
            '<div class="myteam-ao-sentence">Your team is <b style="color:' + col + ';">' + ta.overall + '% ' + word + '</b> with your values' +
              '<span class="myteam-ao-sub"> · averaged across ' + ta.members.length + ' pick' + (ta.members.length === 1 ? '' : 's') + ' &amp; your ' + nIssues + ' issue' + (nIssues === 1 ? '' : 's') + '</span></div>' +
            '<div class="myteam-ao-track"><span style="width:' + ta.overall + '%;background:linear-gradient(90deg,' + col + '88,' + col + ');"></span></div>' +
          '</div>' +
        '</div>' +
        '<div class="myteam-ao-members">' + memberChips + '</div>' +
        '<div class="myteam-ao-issues">' + driversHtml + '</div>' + mixHtml +
        '<div class="myteam-ao-foot">Tap a name for their issue-by-issue breakdown · ' +
          '<button type="button" onclick="if(window._krAlignGuideToPicker)window._krAlignGuideToPicker();">⚙ Adjust your issues</button></div>';
    }
    window._renderTeamAlignOverview = _renderTeamAlignOverview;

    // Jump from a Team Alignment issue chip into the Evidence Locker, filtered to
    // that issue with the saved team carried along as highlight context — the My
    // Team counterpart to Compare's _cmpOpenIssueEvidence. Reuses the same
    // comparePols / compareNames channel (the Locker single-selects politicians), so
    // the whole field still shows and the team rides along as a presentational banner
    // + card highlights rather than a forced multi-select filter. Reads the team
    // context the overview last painted, so it always matches what's on screen.
    window._myteamOpenIssueEvidence = function (issueKey) {
      if (!issueKey || typeof window._pdxOpenEvidenceLocker !== 'function') return;
      var ctx = window._pdxTeamEvidenceCtx || { pols: [], names: [] };
      window._pdxOpenEvidenceLocker({
        issue: issueKey,
        comparePols: (ctx.pols || []).slice(),
        compareNames: (ctx.names || []).slice(),
        compareLabel: 'your saved team members'
      });
    };

    // "My Team's Evidence" — the dashboard-level evidence launch pad rendered into
    // #myteam-evidence-bar, just below the Team Alignment Overview. Turns the saved
    // team into two first-class jumps into the Evidence Locker, both reusing the
    // patterns established in the My Team / Compare Phase 2 work:
    //   • a team-wide summary (total on-record items + a gold "Browse team
    //     evidence ↗" button) that opens the By-Politician lens pre-selected to
    //     every saved pick — via the new `pols` deep-link on _pdxOpenEvidenceLocker.
    //   • per-issue chips for the team's highest-signal issues, each firing the
    //     same _myteamOpenIssueEvidence jump the alignment chips use (issue-filtered
    //     Locker with the saved team carried along as highlight context).
    // Honesty-gated throughout: an entry point only appears when there is real
    // evidence behind it. While the Locker library is still loading the counts read
    // null, so we paint optimistically and the pdx-evidence-ready repaint trims any
    // entry point that turns out empty. `pids` is the full saved roster; `ta` is the
    // team-alignment aggregate (may be null when the visitor hasn't picked issues —
    // the Browse summary still renders, the issue chips simply don't).
    function _renderTeamEvidenceSection(pids, ta) {
      if (!pids || !pids.length) return '';
      if (typeof window._pdxOpenEvidenceLocker !== 'function') return '';

      // Team-wide evidence count (null = library still loading → show optimistically).
      var total = (typeof window._pdxEvidenceCountForPeople === 'function')
        ? window._pdxEvidenceCountForPeople(pids) : null;
      var showBrowse = (total === null) || (total > 0);

      // High-signal issue chips: the team's selected issues (strongest match first)
      // that actually have evidence on record, capped so the row stays scannable.
      var issueChips = [];
      if (ta && ta.issues && ta.issues.length) {
        issueChips = ta.issues.filter(function (i) {
          if (!i.key) return false;
          if (typeof window._pdxEvidenceOnRecord !== 'function') return true; // can't rule out
          var onRec = window._pdxEvidenceOnRecord([i.key]);   // null = still loading
          return onRec === null || onRec.length > 0;
        }).slice(0, 5);
      }

      if (!showBrowse && !issueChips.length) return '';   // nothing real to link to

      // Carry the full saved team so each per-issue jump highlights the right
      // lineup — same channel _myteamOpenIssueEvidence reads. Built from the saved
      // roster (with live names) so it's complete even if alignment scoring covered
      // only a subset.
      window._pdxTeamEvidenceCtx = {
        pols: pids.slice(),
        names: pids.map(function (p) {
          var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[p] : null;
          return d ? d.name : '';
        })
      };

      var html = '<div class="myteam-ev-head">' +
          '<span class="myteam-ev-ico" aria-hidden="true">📂</span>' +
          '<div class="myteam-ev-head-tx">' +
            '<div class="myteam-ev-title">My Team’s Evidence</div>' +
            '<div class="myteam-ev-sub">Go straight from your team to what the record actually shows — every link opens the receipts in the Evidence Locker.</div>' +
          '</div>' +
        '</div>';

      if (showBrowse) {
        var jsIds = pids.map(function (p) {
          return "'" + String(p).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
        }).join(',');
        var lab = (total === null)
          ? 'On-record evidence across your saved team'
          : '<b>' + total + '</b> evidence item' + (total === 1 ? '' : 's') + ' on record across your saved team';
        html += '<div class="myteam-ev-summary">' +
            '<div class="myteam-ev-summary-tx">' +
              '<div class="myteam-ev-summary-n">' + (total === null ? '📂' : total) + '</div>' +
              '<div class="myteam-ev-summary-lab">' + lab + '</div>' +
            '</div>' +
            '<button type="button" class="myteam-ev-browse" ' +
              'onclick="window._pdxOpenEvidenceLocker&&window._pdxOpenEvidenceLocker({pols:[' + jsIds + ']});" ' +
              'title="Open the Evidence Locker focused on your saved team" ' +
              'aria-label="Browse the Evidence Locker focused on your saved team">' +
              'Browse team evidence <span aria-hidden="true">↗</span>' +
            '</button>' +
          '</div>';
      }

      if (issueChips.length) {
        var chips = issueChips.map(function (i) {
          var jk = String(i.key).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          return '<button type="button" class="myteam-ev-chip" ' +
              'onclick="window._myteamOpenIssueEvidence&&window._myteamOpenIssueEvidence(\'' + jk + '\');" ' +
              'title="See everyone’s evidence on ' + i.label + ' — your saved team is highlighted" ' +
              'aria-label="See everyone’s evidence on ' + i.label + ' in the Evidence Locker — your saved team is highlighted">' +
              '<span class="myteam-ev-chip-lab">' + i.label + '</span>' +
              '<span class="myteam-ev-chip-cue" aria-hidden="true">📂 ↗</span>' +
            '</button>';
        }).join('');
        html += '<div class="myteam-ev-issues">' +
            '<span class="myteam-ev-issues-lab">Jump into a top issue</span>' +
            chips +
          '</div>';
      }

      return html;
    }
    window._renderTeamEvidenceSection = _renderTeamEvidenceSection;

    function _alignScoreColor(s) {
      if (s === null || s === undefined) return '#a78bfa';
      return s >= 70 ? '#4ade80' : s >= 50 ? '#f5c842' : '#f87171';
    }

    // The visitor's own selected issues that this candidate scores highest on — the
    // concrete reasons behind their Your Match %. Surfaced inline (right under the
    // match bar / band) so the number explains itself at a glance, no modal needed.
    // Only issues with real evidence and a genuinely matching score are shown, ranked
    // best-first and capped, so it stays clean across a dense list. A ★ marks an issue
    // the visitor weighted "strong". Returns '' when alignment isn't set up or there's
    // no grounded breakdown to draw from.
    function _alignDriverChips(pid, max) {
      if (typeof _alignIssues === 'undefined' || !_alignIssues || _alignIssues.size === 0) return '';
      if (typeof _calcAlignmentBreakdown !== 'function') return '';
      var bd = _calcAlignmentBreakdown(pid);
      if (!bd || !bd.issues || !bd.issues.length) return '';
      max = max || 2;
      var ranked = bd.issues.filter(function(i) { return i.hasEvidence && i.score >= 50; })
                            .sort(function(a, b) { return b.score - a.score; });
      if (!ranked.length) return '';
      var chips = ranked.slice(0, max).map(function(i) {
        var c = _alignScoreColor(i.score);
        var _lvl = _alignMigrateLevel(i.intensity);
        var strong = (_lvl === 'strongly_support' || _lvl === 'strongly_oppose') ? '★ ' : '';
        // THE DRIVER NOW NAMES ITS OWN LANE. These chips are the most-read
        // explanation of a match on the whole site — they sit directly under the
        // percentage on every card — and until now they said WHICH issue drove it
        // without saying what the claim rested on. A record-derived stand-in read
        // exactly like a quoted promise. The mark is small; the distinction is not.
        var _sk = _alignRowSource(i);
        var _sm = _ALIGN_SRC_META[_sk];
        var _thin = i.thin ? ' is-thin' : '';
        return '<span class="align-driver-chip is-' + _sm.cls + _thin + '" title="' +
            (strong ? 'You weighted this strongly · ' : '') + 'Your match on ' + i.label + ' · ' +
            _sm.note.replace(/"/g, '&quot;') + (i.thin ? ' Thin or split, so it counts less.' : '') +
            '" style="border-color:' + c + '40;background:' + c + '12;">' +
            '<span class="align-driver-src" aria-hidden="true">' + _sm.ico + '</span>' +
            '<span style="color:#cdd9ec;">' + strong + i.label + '</span><b style="color:' + c + ';">' + i.score + '%</b>' +
            (_sk === 'baseline' ? '<span class="align-driver-base">' + _ALIGN_BASE_TAG + '</span>' : '') +
          '</span>';
      }).join('');
      var _dLead = _alignModeIsRecord() ? '▲ Record pattern agrees on' : '▲ Driven by';
      // …and the row says the mix once, so a reader who does not hover a chip still
      // learns that some of these are readings rather than quotes.
      var _nBase = ranked.slice(0, max).filter(function (i) { return _alignRowSource(i) === 'baseline'; }).length;
      var _dNote = (!_alignModeIsRecord() && _nBase)
        ? '<span class="align-drivers-note" title="' + _ALIGN_BASE_NOTE.replace(/"/g, '&quot;') + '">🏛 ' +
            _nBase + ' from the record, not a stated position</span>'
        : '';
      return '<div class="align-drivers" data-align-mode="' + _alignMode + '"><span class="align-drivers-lead">' + _dLead + '</span>' + chips + _dNote + '</div>';
    }
    window._alignDriverChips = _alignDriverChips;

    // ── Match → team / receipts hand-off ────────────────────────────────────────
    // Closes the "this person matches me → do something about it" loop right on the
    // result card. Two one-tap primary actions, mobile-first, additive: they sit
    // beneath the Your Match bar and reuse the app's existing team-toggle, Say-vs-Do
    // and Issue Comparison primitives — no new data, no new navigation surface.

    // The visitor's own selected issue this candidate scores highest on — the same
    // ranking the driver chips use, so "See the receipts" opens the issue the voter
    // literally sees driving the match. '' when there's no grounded issue to lead with.
    function _alignTopDriverKey(pid) {
      try {
        if (typeof _calcAlignmentBreakdown !== 'function') return '';
        var bd = _calcAlignmentBreakdown(pid);
        if (!bd || !bd.issues || !bd.issues.length) return '';
        var ranked = bd.issues.filter(function (i) { return i.hasEvidence && i.score >= 50; })
                              .sort(function (a, b) { return b.score - a.score; });
        return (ranked[0] && ranked[0].key) || '';
      } catch (e) { return ''; }
    }
    window._alignTopDriverKey = _alignTopDriverKey;

    function _alignIsOnTeam(pid) {
      try { return typeof window._pdxIsOnTeam === 'function' ? !!window._pdxIsOnTeam(pid) : false; }
      catch (e) { return false; }
    }

    // Repaint one team-toggle button to reflect current membership (used after a
    // toggle so the label/aria/state flip without a full card re-render).
    function _alignPaintTeamBtn(btn, on) {
      if (!btn) return;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.setAttribute('aria-label', on ? 'On your team — tap to remove' : 'Add to your team');
      btn.innerHTML = '<span aria-hidden="true">' + (on ? '✓' : '＋') + '</span>' +
        '<span class="align-ma-lb">' + (on ? 'On my team' : 'Add to my team') + '</span>';
      if (on) { btn.classList.remove('just-added'); void btn.offsetWidth; btn.classList.add('just-added'); setTimeout(function () { try { btn.classList.remove('just-added'); } catch (e) {} }, 520); }
    }

    // Add/remove this candidate from the voting team. Routes through the SAME team
    // primitive every other surface uses (so a pick here shows up on Your Ballot / My
    // Team and syncs across devices), then repaints just this button. We pass a null
    // btn to the shared toggle so it doesn't overwrite our compound button's markup
    // (it flashes "✓ Added!" into whatever btn it's given); we own the visual flip here.
    window.alignTeamToggle = function (btn, pid) {
      if (!pid) return;
      if (typeof window.mypolToggleAnimated === 'function') window.mypolToggleAnimated(null, pid);
      else if (typeof window.mypolToggle === 'function') window.mypolToggle(pid);
      else return;
      var now = _alignIsOnTeam(pid);
      _alignPaintTeamBtn(btn, now);
    };

    // Jump from a match straight to the receipts for that candidate. Prefers the
    // person's Say-vs-Do receipt (seeded on the issue that drove the match); falls
    // back to Issue Comparison on that issue when they have no curated receipt yet,
    // then to the issue-by-issue breakdown, then the full profile — so the button is
    // never a dead end regardless of how much record a candidate has.
    window.alignSeeReceipts = function (pid, issueKey) {
      if (!pid) return;
      issueKey = issueKey || '';
      // If invoked from inside the issue-by-issue breakdown overlay, close it first so
      // the receipt / comparison view opens cleanly instead of stacking (no-op when the
      // overlay isn't open — e.g. when called from a browse card).
      try {
        var _krOv = document.getElementById('kr-align-overlay');
        if (_krOv && _krOv.style.display !== 'none' && typeof window.keyRacesCloseAlign === 'function') {
          window.keyRacesCloseAlign();
        }
      } catch (e) {}
      var R = window.PDXReceipts;
      try {
        if (R && typeof R.forPolitician === 'function' && R.forPolitician(pid) && typeof R.open === 'function') {
          R.open(pid, issueKey); return;
        }
      } catch (e) {}
      try {
        if (issueKey && window.PDXIssueCompare && typeof window.PDXIssueCompare.open === 'function') {
          window.PDXIssueCompare.open(issueKey, 'all'); return;
        }
      } catch (e) {}
      try { if (typeof window.keyRacesAlignQuickView === 'function') { window.keyRacesAlignQuickView(pid); return; } } catch (e) {}
      try { if (typeof window.showProfile === 'function') { window.showProfile(pid); } } catch (e) {}
    };

    // The two-button action rail rendered under a Your Match bar. Only appears when
    // alignment is set up AND the candidate is scorable (mirrors the bars, so it never
    // shows on a recordless card that has no match). opts.receiptsOnly drops the team
    // button on surfaces where the person is already on the team (team slot cards).
    function _alignMatchActions(pid, opts) {
      opts = opts || {};
      if (typeof _alignIssues === 'undefined' || !_alignIssues || _alignIssues.size === 0) return '';
      var score = (typeof _calcAlignmentScore === 'function') ? _calcAlignmentScore(pid) : null;
      if (score === null || score === undefined) return '';
      var pidA = String(pid).replace(/'/g, "\\'");
      var keyA = String(_alignTopDriverKey(pid) || '').replace(/'/g, "\\'");
      var onTeam = _alignIsOnTeam(pid);

      var teamBtn = opts.receiptsOnly ? '' :
        '<button type="button" class="align-ma-btn align-ma-team' + (onTeam ? ' is-on' : '') + '" ' +
          'aria-pressed="' + (onTeam ? 'true' : 'false') + '" ' +
          'aria-label="' + (onTeam ? 'On your team — tap to remove' : 'Add to your team') + '" ' +
          'onclick="event.stopPropagation();if(window.alignTeamToggle)window.alignTeamToggle(this,\'' + pidA + '\')">' +
          '<span aria-hidden="true">' + (onTeam ? '✓' : '＋') + '</span>' +
          '<span class="align-ma-lb">' + (onTeam ? 'On my team' : 'Add to my team') + '</span></button>';

      var recBtn =
        '<button type="button" class="align-ma-btn align-ma-receipts" ' +
          'aria-label="See the receipts — their record on the issues behind this match" ' +
          'onclick="event.stopPropagation();if(window.alignSeeReceipts)window.alignSeeReceipts(\'' + pidA + '\',\'' + keyA + '\')">' +
          '<span aria-hidden="true">🧾</span><span class="align-ma-lb">See the receipts</span></button>';

      return '<div class="align-match-actions' + (opts.receiptsOnly ? ' is-solo' : '') + '" role="group" aria-label="Next steps for this match">' +
          teamBtn + recBtn + '</div>';
    }
    window._alignMatchActions = _alignMatchActions;

    function _alignScoreClass(s) {
      if (s === null || s === undefined) return '';
      return s >= 70 ? 'high' : s >= 50 ? 'mid' : 'low';
    }

    // ── Consistency (Say-vs-Do) readout — the SECOND score, rendered as a compact
    // sibling directly beneath the "Your Match" bar so the two read together at a
    // glance. Match = do their stated positions fit my values; Consistency = does
    // their record back up what they say. Honest states (never a fake number):
    //   • pending  → "checking voting record…" while a batched fetch warms
    //   • limited  → "Limited record" when they state positions but have few/no votes
    //   • omitted  → nothing to check (no stated positions on the visitor's issues)
    // Neutral by design: it measures integrity, not agreement, and is colour-coded
    // on the same green/amber/red scale as everything else in the tool.
    // Plain-language label for the 0–100 consistency score. Neutral wording that
    // describes the RECORD-vs-WORDS relationship, never a political judgment.
    function _consistLabel(s) {
      return s >= 80 ? 'Backs it up' : s >= 60 ? 'Mostly consistent' : s >= 40 ? 'Mixed record' : 'Often contradicts';
    }
    // A short verb phrase used in aria/tooltips so the number reads as a sentence.
    function _consistPhrase(s) {
      return s >= 80 ? 'their record backs up what they say'
           : s >= 60 ? 'their record mostly backs up what they say'
           : s >= 40 ? 'their record is a mixed match for what they say'
           : 'their record often runs against what they say';
    }
    // Neutral, visible contradiction flag — shown only when contradictions exist.
    // It states a fact (record ran against the stated position), not a verdict.
    function _consistFlag(c, compact) {
      if (!c || !c.contradictions) return '';
      var n = c.contradictions;
      return '<span class="align-consist-flag" title="On '
        + n + ' of their stated positions, the voting record runs the other way">⚑ ' + n
        + (compact ? '' : ' contradiction' + (n === 1 ? '' : 's')) + '</span>';
    }
    function _consistShellHtml(pid, kind, c) {
      var open = 'event.stopPropagation();if(window.keyRacesAlignQuickView)window.keyRacesAlignQuickView(\'' + pid + '\');';
      if (kind === 'checking') {
        return '<div class="align-consist-bar is-checking" aria-label="Official Record: checking the voting record" role="status">' +
            '<span class="align-consist-ico"><span class="align-consist-spin"></span></span>' +
            '<span class="align-consist-main"><span class="align-consist-title">🏛️ Official Record</span>' +
            '<span class="align-consist-sub">Checking their voting record…</span></span>' +
          '</div>';
      }
      // limited — states positions, but little/no voting record to verify them yet
      var det = (c && c.limited)
        ? c.limited + ' stated ' + (c.limited === 1 ? 'position has' : 'positions have') + ' no votes on record yet'
        : 'No qualifying votes on record yet to check against their stated positions';
      return '<button type="button" onclick="' + open + '" class="align-consist-bar is-limited" title="They\'ve stated positions, but there\'s little or no voting record to verify them against yet" aria-label="Official Record: limited voting record — nothing to score yet. Tap for details.">' +
          '<span class="align-consist-ico">🏛️</span>' +
          '<span class="align-consist-main"><span class="align-consist-titlerow"><span class="align-consist-title">🏛️ Official Record</span>' +
          '<span class="align-consist-badge is-limited">Limited record</span></span>' +
          '<span class="align-consist-sub">' + det + '</span></span>' +
        '</button>';
    }
    function _alignConsistencyBar(pid) {
      if (typeof _alignIssues === 'undefined' || !_alignIssues || _alignIssues.size === 0) return '';
      var c = (typeof _calcConsistencyScore === 'function') ? _calcConsistencyScore(pid) : null;
      if (!c) return '';
      if (c.pending) { _alignQueueConsistWarm(pid); return _consistShellHtml(pid, 'checking'); }
      if (c.score === null) {
        // Stated positions but no record to check → honest "limited". Nothing
        // stated at all → omit (the Match bar already stands on its own).
        return c.stated > 0 ? _consistShellHtml(pid, 'limited', c) : '';
      }
      var col = _alignScoreColor(c.score);
      var label = _consistLabel(c.score);
      var hasContra = c.contradictions > 0;
      var flag = _consistFlag(c);
      var limNote = c.limited > 0 ? ' · ' + c.limited + ' with no record yet' : '';
      var open = 'event.stopPropagation();if(window.keyRacesAlignQuickView)window.keyRacesAlignQuickView(\'' + pid + '\');';
      return '<button type="button" onclick="' + open + '" class="align-consist-bar' + (hasContra ? ' is-contra' : '') + '" aria-label="Official Record: ' + c.score + ' percent — ' + label + '; ' + _consistPhrase(c.score) + ', across ' + c.rated + ' of ' + c.stated + ' stated positions with a voting record' + (hasContra ? ', including ' + c.contradictions + ' contradiction' + (c.contradictions === 1 ? '' : 's') : '') + '. Tap for the issue-by-issue breakdown." style="border-color:' + col + '55;box-shadow:inset 0 0 0 1px ' + col + '1c;">' +
          '<span class="align-consist-num" style="color:' + col + ';text-shadow:0 0 10px ' + col + '55;">' + c.score + '<span style="font-size:0.8rem;">%</span></span>' +
          '<span class="align-consist-main">' +
            '<span class="align-consist-titlerow">' +
              '<span class="align-consist-title" style="color:' + col + ';">🏛️ Official Record</span>' +
              '<span class="align-consist-badge" style="color:' + col + ';background:' + col + '22;border:1px solid ' + col + '66;">' + label + '</span>' +
              flag +
            '</span>' +
            '<span class="align-consist-track"><div style="width:' + c.score + '%;background:linear-gradient(90deg,' + col + '88,' + col + ');"></div></span>' +
            '<span class="align-consist-sub">Record backs <b style="color:' + col + ';">' + c.rated + ' of ' + c.stated + '</b> stated position' + (c.stated === 1 ? '' : 's') + limNote + ' · tap for detail</span>' +
          '</span>' +
        '</button>';
    }
    window._alignConsistencyBar = _alignConsistencyBar;

    // Compact inline consistency chip, the sibling of the small "Your Match" badge
    // (used in dense contexts like the compare table). Same honest states, one line.
    function _alignConsistencyBadge(pid) {
      if (typeof _alignIssues === 'undefined' || !_alignIssues || _alignIssues.size === 0) return '';
      var c = (typeof _calcConsistencyScore === 'function') ? _calcConsistencyScore(pid) : null;
      if (!c) return '';
      var open = 'event.stopPropagation();if(window.keyRacesAlignQuickView)window.keyRacesAlignQuickView(\'' + pid + '\');';
      if (c.pending) { _alignQueueConsistWarm(pid); return '<span class="align-consist-chip is-muted" title="Checking their voting record…">🏛️ Official Record <span class="align-consist-spin"></span></span>'; }
      if (c.score === null) {
        return c.stated > 0 ? '<span class="align-consist-chip is-muted" title="States positions, but little or no voting record to verify them against yet">🏛️ Limited record</span>' : '';
      }
      var col = _alignScoreColor(c.score);
      var flag = c.contradictions > 0 ? '<span class="align-consist-flag compact" title="' + c.contradictions + ' stated position' + (c.contradictions === 1 ? '' : 's') + ' the record runs against">⚑' + c.contradictions + '</span>' : '';
      return '<button type="button" onclick="' + open + '" class="align-consist-chip" title="Official Record: ' + c.score + '% — record backs ' + c.rated + ' of ' + c.stated + ' stated positions. Tap for breakdown." style="cursor:pointer;font:inherit;border-color:' + col + '40;color:' + col + ';background:' + col + '18;">🏛️ ' + c.score + '%' + flag + '</button>';
    }
    window._alignConsistencyBadge = _alignConsistencyBadge;

    // ── Compact DUAL readout — both scores in one tight, tappable unit ──────────
    // For surfaces where politicians appear but no full match bar fits (Your Ballot
    // cards, My Profile team cards, other dense lists). Renders the Match % and the
    // Say-vs-Do % side by side with the SAME icons/labels/colours as the full bars,
    // so the two numbers read identically everywhere. Returns '' when the visitor
    // hasn't set up alignment or the person can't be scored — never a fake number.
    function _alignDualMini(pid) {
      if (typeof _alignIssues === 'undefined' || !_alignIssues || _alignIssues.size === 0) return '';
      var m = (typeof _calcAlignmentScore === 'function') ? _calcAlignmentScore(pid) : null;
      if (m === null || m === undefined) return '';
      var mCol = _alignScoreColor(m);
      var c = (typeof _calcConsistencyScore === 'function') ? _calcConsistencyScore(pid) : null;
      var open = 'event.stopPropagation();if(window.keyRacesAlignQuickView)window.keyRacesAlignQuickView(\'' + pid + '\');';

      var consCell;
      if (c && c.pending) { _alignQueueConsistWarm(pid); consCell = '<span class="align-dm-v is-muted">🏛️ <span class="align-consist-spin"></span></span>'; }
      else if (!c || c.score === null) { consCell = c && c.stated > 0 ? '<span class="align-dm-v is-muted" title="States positions; no voting record to verify yet">🏛️ Ltd</span>' : '<span class="align-dm-v is-muted" title="No stated positions on your issues to check">🏛️ —</span>'; }
      else {
        var cCol = _alignScoreColor(c.score);
        var flag = c.contradictions > 0 ? '<span class="align-consist-flag compact" title="' + c.contradictions + ' contradiction' + (c.contradictions === 1 ? '' : 's') + '">⚑' + c.contradictions + '</span>' : '';
        consCell = '<span class="align-dm-v" style="color:' + cCol + ';">🏛️ ' + c.score + '%' + flag + '</span>';
      }
      return '<button type="button" onclick="' + open + '" class="align-dual-mini" title="🎯 Your Match — how well their stated positions fit the issues you care about. 🏛️ Official Record — when they had to vote, did they stand by what they said. Tap for the issue-by-issue breakdown." aria-label="Your match ' + m + ' percent — how well their stated positions fit your issues' + (c && typeof c.score === 'number' ? '; Official Record ' + c.score + ' percent — whether their votes backed up what they said' : '') + '. Tap for details.">' +
          '<span class="align-dm-v" style="color:' + mCol + ';">🎯 ' + m + '%</span>' +
          '<span class="align-dm-sep">·</span>' +
          consCell +
        '</button>';
    }
    window._alignDualMini = _alignDualMini;

    // ── Canonical descriptions for the three scores ─────────────────────────────
    // ONE source of truth so every surface (cards, compare, ballot, profile, the
    // Alignment Tool and Issue Comparison) labels and explains the trio identically
    // — the numbers always read like the same system. `short` is the plain "what it
    // means"; `calc` is the honest "how it's figured" a voter needs to trust it.
    // `pairFrame` is the shared heading for the two follow-through scores.
    var PDX_SCORE_INFO = {
      match:   { icon: '🎯', label: 'Your Match',
                 short: 'How well their stated positions fit the issues you care about.',
                 calc:  'Built from your saved stances vs. their documented positions — personal to you, not a party label.' },
      saydo:   { icon: '🏛️', label: 'Official Record',
                 short: 'When they had to vote, did they stand by what they said?',
                 calc:  'Their votes and formal legislative actions checked against their own stated positions, issue by issue. Agreement-neutral; shows “No qualifying votes on record yet” when there isn\'t enough record to judge — never a false 0%.' },
      promise: { icon: '🤝', label: 'Promise Follow-Through',
                 short: 'Of the promises they made, how many they\'ve kept.',
                 calc:  'Kept ÷ (kept + broken) of tracked promises. Pending promises don\'t count until they resolve.' },
      pairFrame: 'Do they keep their word?'
    };
    window.PDXScoreInfo = PDX_SCORE_INFO;

    // Reusable, mobile-first legend that explains the three scores in one place.
    // Pass { only: ['saydo','promise'] } to show a subset, or { pair: true } to add
    // the "Do they keep their word?" heading above the two follow-through scores.
    function _pdxScoreLegendHtml(opts) {
      opts = opts || {};
      var keys = opts.only || ['match', 'saydo', 'promise'];
      var head = opts.pair ? '<div class="pdx-scoreleg-head">' + PDX_SCORE_INFO.pairFrame + '</div>' : '';
      var items = keys.map(function (k) {
        var s = PDX_SCORE_INFO[k];
        if (!s) return '';
        return '<div class="pdx-scoreleg-item"><span class="pdx-scoreleg-ico" aria-hidden="true">' + s.icon + '</span>'
          + '<span class="pdx-scoreleg-txt"><b>' + s.label + '</b> — ' + s.short
          + '<span class="pdx-scoreleg-calc">' + s.calc + '</span></span></div>';
      }).join('');
      return '<div class="pdx-scoreleg">' + head + items + '</div>';
    }
    window._pdxScoreLegendHtml = _pdxScoreLegendHtml;

    // Prominent, tappable "Your Match" bar used on the browse / database / candidate
    // card lists. Unlike the small corner ring, this reads as a core feature: a big
    // teal score, a plain-language "Your Match: NN%" label, a colour-coded
    // Strong / Partial / Weak badge, a mini progress bar, and a clear note that the
    // number is built from the visitor's own selected issues. Tapping opens the full
    // issue-by-issue breakdown modal (shared with Your Key Races) for any politician.
    // Returns:
    //   • a "See Your Personal Match" prompt (→ issue picker) when no issues chosen,
    //   • '' when issues are chosen but this person has no record to ground a score
    //     (keeps recordless candidate cards clean),
    //   • the full match bar otherwise.
    function _alignCardBar(pid) {
      var n = (typeof window._alignIssueCount === 'function') ? window._alignIssueCount()
            : ((typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size) || 0);
      if (!n) {
        return '<button type="button" onclick="event.stopPropagation();if(window.keyRacesAlignQuickView){window.keyRacesAlignQuickView(\'' + pid + '\');}else if(window._krAlignGuideToPicker){window._krAlignGuideToPicker();}" class="align-card-bar setup" aria-label="See the issues this politician has positions on and build your personalized match — judge them by your values, not their party">' +
            '<span class="align-card-num" style="color:#5eead4;font-size:1.15rem;">🎯</span>' +
            '<span class="align-card-main" style="gap:0.1rem;">' +
              '<span class="align-card-title">Set your stances to see your match</span>' +
              '<span class="align-card-sub">What you stand for → who matches you</span>' +
            '</span>' +
            '<span class="align-card-chev">›</span>' +
          '</button>';
      }
      // Record mode reads a vote pack the stated lane never needed — and the stated
      // lane now needs it too, because its BASELINE is read off the same pack. Same
      // warmer, same batch of 24, same debounce; this is a render path, so the warm
      // stays bounded by what is actually on screen. A pack that never lands costs
      // nothing: the baseline simply does not appear and the stated lane behaves
      // exactly as it did before it existed.
      if (!_alignRecordWarm(pid)) _alignQueueConsistWarm(pid);
      var score = (typeof _calcAlignmentScore === 'function') ? _calcAlignmentScore(pid) : null;
      // No score in record mode means the record answered none of the visitor's
      // issues — said out loud, with the way back, never as a blank.
      if (score === null || score === undefined) return _alignModeGapBarHtml(pid);
      var col = _alignScoreColor(score);
      var label = score >= 85 ? '⭐ Best Match for You' : score >= 70 ? 'Strong match' : score >= 50 ? 'Partial match' : 'Weak match';
      var drivers = (typeof _alignDriverChips === 'function') ? _alignDriverChips(pid, 2) : '';
      var modeTag = _alignModeTagHtml({ compact: true });
      // Both lanes now name what the number actually rests on. "Based on your 9
      // selected issues" was true when every issue got a number one way or
      // another; with the party fill-in gone it would overstate a match built on
      // two documented positions and seven silences.
      var _cov = _alignMatchCoverage(pid);
      // …and, in the stated lane, HOW MUCH OF IT IS QUOTED. The fraction alone said
      // how much of what the visitor asked is in the number; it did not say that
      // part of it stood in from the record. On a member with dense formal coverage
      // and few quotes that is most of the number, and it was going unsaid on the
      // single most-seen alignment surface on the site.
      var _covSplit = '';
      if (!_alignModeIsRecord() && _cov.baseline) {
        _covSplit = ' <span class="align-card-src" title="' + _ALIGN_BASE_NOTE.replace(/"/g, '&quot;') + '">· ' +
          _cov.said + ' stated 🏛 ' + _cov.baseline + ' from the record</span>';
      }
      var subLine = _alignModeIsRecord()
        ? 'From their <b>formal record</b> on <b>' + _cov.covered + ' of your ' + _cov.total + ' issue' + (_cov.total > 1 ? 's' : '') + '</b> · tap for breakdown'
        : 'From their <b>stated positions</b> on <b>' + _cov.covered + ' of your ' + _cov.total + ' issue' + (_cov.total > 1 ? 's' : '') + '</b>' + _covSplit + ' · tap for breakdown';
      return '<button type="button" onclick="event.stopPropagation();if(window.keyRacesAlignQuickView)window.keyRacesAlignQuickView(\'' + pid + '\');" class="align-card-bar" aria-label="Your match: ' + score + ' percent — ' + label + ' on your selected issues, matched on ' + _alignModeMeta().label.toLowerCase() + '. Tap for the issue-by-issue breakdown." style="border-color:' + col + '66;box-shadow:inset 0 0 0 1px ' + col + '22;">' +
          '<span class="align-card-num" style="color:' + col + ';text-shadow:0 0 12px ' + col + '55;">' + score + '<span style="font-size:0.95rem;">%</span></span>' +
          '<span class="align-card-main">' +
            '<span class="align-card-titlerow">' +
              '<span class="align-card-title" style="color:' + col + ';">🎯 ' + _pdxMatchLabel() + '</span>' +
              '<span class="align-card-badge" style="color:' + col + ';background:' + col + '22;border:1px solid ' + col + '66;">' + label + '</span>' +
              modeTag +
            '</span>' +
            '<span class="align-card-mini"><div style="width:' + score + '%;background:linear-gradient(90deg,' + col + '88,' + col + ');"></div></span>' +
            '<span class="align-card-sub">' + subLine + '</span>' +
          '</span>' +
          '<span class="align-card-chev">▾</span>' +
        '</button>' + _alignConsistencyBar(pid) + drivers + _alignMatchActions(pid);
    }
    window._alignCardBar = _alignCardBar;

    // Prominent, glanceable "Your Match" band for the My Voting Team slot cards.
    // Replaces the old tiny corner pill: a big colour-coded %, a plain-language
    // Strong / Partial / Weak word and a mini progress bar, so the personalized
    // fit reads at a glance on every team slot. Tapping opens the same
    // issue-by-issue breakdown modal used everywhere else. Returns '' when the
    // visitor hasn't set up alignment (the section-level prompt handles that) or
    // when there's no record to ground a score (keeps the slot clean).
    function _slotMatchBand(pid) {
      if (typeof _alignIssues === 'undefined' || !_alignIssues || _alignIssues.size === 0) return '';
      // A TEAM SLOT IS THE ONE PLACE A CARD BAR NEVER RENDERS. It has its own band,
      // so it never inherited the card bar's warm — which meant the baseline
      // fallback, the whole point of which is to fill the holes on members with
      // thin stated coverage, was structurally unreachable from the surface where
      // the visitor has committed to six specific people. Same debounced batch.
      _alignWarmBaseline(pid);
      var score = (typeof _calcAlignmentScore === 'function') ? _calcAlignmentScore(pid) : null;
      if (score === null || score === undefined) return '';
      var col = _alignScoreColor(score);
      var label = score >= 85 ? '⭐ Best Match for You' : score >= 70 ? 'Strong match' : score >= 50 ? 'Partial match' : 'Weak match';
      var drivers = (typeof _alignDriverChips === 'function') ? _alignDriverChips(pid, 3) : '';
      return '<button type="button" onclick="event.stopPropagation();if(window.keyRacesAlignQuickView)window.keyRacesAlignQuickView(\'' + pid + '\');" class="myteam-slot-match" title="Your match on your selected issues — tap for the issue-by-issue breakdown" style="border-color:' + col + '55;box-shadow:inset 0 0 0 1px ' + col + '1f;">' +
          '<span class="myteam-slot-match-num" style="color:' + col + ';text-shadow:0 0 12px ' + col + '55;">' + score + '<span style="font-size:0.85rem;">%</span></span>' +
          '<span class="myteam-slot-match-mid">' +
            '<span class="myteam-slot-match-label">🎯 ' + _pdxMatchLabel() + ' · <b style="color:' + col + ';">' + label + '</b></span>' +
            '<span class="myteam-slot-match-bar"><span style="width:' + score + '%;background:linear-gradient(90deg,' + col + '99,' + col + ');"></span></span>' +
          '</span>' +
        '</button>' + _alignConsistencyBar(pid) + drivers + _alignMatchActions(pid, { receiptsOnly: true });
    }
    window._slotMatchBand = _slotMatchBand;

    // "Top Match" ribbon for browse cards — clearly flags the strongest alignment
    // matches at a glance while picking a candidate for a slot. Only appears once
    // the visitor has an Alignment Signature and the match is genuinely high.
    function _alignTopMatchBadge(pid) {
      if (typeof _alignIssues === 'undefined' || !_alignIssues || _alignIssues.size === 0) return '';
      var s = (typeof _calcAlignmentScore === 'function') ? _calcAlignmentScore(pid) : null;
      if (s === null || s === undefined || s < 75) return '';
      return '<span class="align-topmatch-badge">🎯 Top Match · ' + s + '%</span>';
    }
    window._alignTopMatchBadge = _alignTopMatchBadge;

    function _alignScoreHtml(pid, size, usePurpleTheme) {
      if (_alignIssues.size === 0) {
        if (size === 'ring') {
          if (usePurpleTheme) {
            return '<button onclick="event.stopPropagation();var p=document.getElementById(\'relevant-alignments-panel\')||document.getElementById(\'alignment-panel\');if(p){p.scrollIntoView({behavior:\'smooth\',block:\'center\'});var body=document.getElementById(\'relevant-alignments-body\');if(body&&body.style.display===\'none\'){toggleRelevantAlignments();}}" class="font-condensed text-[10px] font-bold text-purple-300 hover:text-purple-200 hover:bg-purple-900/20 border border-purple-500/30 rounded-lg px-3 py-1.5 transition-all flex items-center gap-1 uppercase tracking-wider" style="background:rgba(139,92,246,0.1);min-height:38px;box-shadow:0 0 10px rgba(139,92,246,0.15);">' +
              '<span>🎯</span> Set Align' +
              '</button>';
          }
          return '<button onclick="event.stopPropagation();if(window.alignTogglePanel)window.alignTogglePanel(true);var p=document.getElementById(\'alignment-panel\');if(p)p.scrollIntoView({behavior:\'smooth\',block:\'center\'});" class="font-condensed text-[10px] font-bold text-purple-400 hover:text-purple-300 hover:bg-purple-900/10 border border-purple-500/20 rounded-lg px-2.5 py-1.5 transition-all flex items-center gap-1 uppercase tracking-wider" style="background:rgba(139,92,246,0.05);min-height:30px;">' +
            '<span>🎯</span> Align' +
            '</button>';
        }
        return '';
      }
      var score = _calcAlignmentScore(pid);
      if (score === null) return '';
      var col = usePurpleTheme ? '#c084fc' : _alignScoreColor(score);
      var cls = _alignScoreClass(score);
      // Every scored output is now tappable and opens the shared issue-by-issue
      // breakdown modal, so personalized alignment is an explorable feature on every
      // card list — not just a static number.
      var _openBd = 'event.stopPropagation();if(window.keyRacesAlignQuickView)window.keyRacesAlignQuickView(\'' + pid + '\');';
      if (size === 'small') {
        var _mm = _alignModeMeta();
        return '<button type="button" onclick="' + _openBd + '" class="align-score-badge" title="Your match on your selected issues, matched on ' + _mm.label.toLowerCase() + ' — tap for the breakdown" style="cursor:pointer;font:inherit;border-color:' + col + '40;color:' + col + ';background:' + col + '18;">🎯 ' + _pdxMatchLabel() + ' ' + score + '%' + (_alignModeIsRecord() ? ' <span class="align-score-mode" aria-hidden="true">' + _mm.ico + '</span>' : '') + '</button>' + _alignConsistencyBadge(pid);
      }

      if (usePurpleTheme) {
        return '<span class="align-ring-wrap">' +
          '<button type="button" onclick="' + _openBd + '" title="Your match: ' + score + '% — tap for the issue-by-issue breakdown" style="display:inline-flex;flex-direction:column;align-items:center;gap:0.1rem;flex-shrink:0;background:none;border:none;padding:0;cursor:pointer;">' +
          '<div style="text-align:center;background:rgba(10,15,30,0.65);border:1px solid rgba(139,92,246,0.45);border-radius:0.75rem;padding:0.45rem 0.8rem;box-shadow:0 4px 16px rgba(139,92,246,0.22), inset 0 1px 0 rgba(255,255,255,0.02);display:inline-block;min-width:78px;">' +
            '<div style="color:#c084fc;font-size:2.2rem;text-shadow:0 0 12px rgba(139,92,246,0.4);font-family:\'Bebas Neue\',sans-serif;line-height:1;font-weight:900;">' + score + '%</div>' +
            '<div class="font-condensed text-xs text-purple-300 tracking-wider uppercase text-center font-bold" style="font-size:0.55rem;margin-top:0.15rem;letter-spacing:0.05em;">🎯 ' + _pdxMatchLabel() + '</div>' +
          '</div>' +
        '</button>' + (typeof _alignConsistencyBadge === 'function' ? _alignConsistencyBadge(pid) : '') + '</span>';
      }

      return '<span class="align-ring-wrap">' +
        '<button type="button" onclick="' + _openBd + '" title="Your match: ' + score + '% — tap for the issue-by-issue breakdown" style="display:inline-flex;flex-direction:column;align-items:center;gap:0.15rem;flex-shrink:0;background:none;border:none;padding:0;cursor:pointer;">' +
        '<div class="align-score-ring ' + cls + '" style="border-color:' + col + '99;color:' + col + ';background:' + col + '14;box-shadow:0 0 14px ' + col + '22;">' + score + '%</div>' +
        '<div class="align-pct-label" style="color:' + col + '99;">🎯 ' + _pdxMatchLabel() + '</div>' +
      '</button>' + (typeof _alignConsistencyBadge === 'function' ? _alignConsistencyBadge(pid) : '') + '</span>';
    }

    // Brief pulse on every chip that represents an issue, wherever it's mounted.
    function _alignPulse(issue) {
      document.querySelectorAll('.align-chip[data-align-issue="' + issue + '"]').forEach(function(c) {
        c.classList.remove('just-toggled'); void c.offsetWidth; c.classList.add('just-toggled');
        setTimeout(function() { c.classList.remove('just-toggled'); }, 360);
      });
    }

    window.alignToggle = function(btn) {
      var issue = btn.getAttribute('data-align-issue');
      if (!issue) return;
      if (_alignIssues.has(issue)) {
        _alignIssues.delete(issue);
        delete _alignIntensity[issue]; // dropping the issue drops its intensity too
      } else {
        _alignIssues.add(issue);
      }
      _alignSave();
      // _alignRefreshAll re-syncs every chip across both panels, so the chip the
      // visitor clicked and its twin on the other surface stay in lockstep.
      _alignRefreshAll();
      _alignPulse(issue);
    };

    // Quick 5-point stance preset for a single position. Choosing any preset implies
    // the position is selected, so a visitor can go from nothing to a weighted
    // "Strongly Oppose" in one tap. 'support' is the default and clears the overlay;
    // the other four levels are stored. Legacy values are migrated before storing.
    window.alignSetIntensity = function(issue, level) {
      if (!ISSUE_MAP[issue]) return;
      if (!_alignIssues.has(issue)) _alignIssues.add(issue);
      var lvl = _alignMigrateLevel(level);
      if (lvl === ALIGN_DEFAULT_LEVEL) delete _alignIntensity[issue];
      else if (ALIGN_LEVELS.indexOf(lvl) !== -1) _alignIntensity[issue] = lvl;
      _alignSave();
      _alignRefreshAll();
      _alignPulse(issue);
    };

    window.alignClearAll = function() {
      _alignIssues.clear();
      _alignIntensity = {};
      _alignExposeIntensity();
      _alignSave();
      _alignRefreshAll();
    };

    function _alignRefreshAll() {
      _alignSyncAllChips();
      _alignUpdateStatus();
      _alignRenderProfile();
      _alignUpdateFab();
      _alignSyncBrowseChips();

      if (typeof syncRelevantAlignmentUI === 'function') {
        syncRelevantAlignmentUI();
      }

      if (typeof window.renderRelevantToMe === 'function') {
        window.renderRelevantToMe();
      }

      if (typeof _mypolBuildGrid === 'function') _mypolBuildGrid();

      if (typeof chubFilter === 'function') chubFilter();

      if (typeof _potentialBuildGrid === 'function') _potentialBuildGrid();

      if (typeof filterDirectory === 'function') filterDirectory();

      // The All Politicians browse tree carries the same district-level "Your Match
      // in this race" panels, so re-render it too when it's actually on screen (its
      // accordion open-state is preserved), so a quick-pick made there re-ranks the
      // race immediately. Skipped when the panel is hidden to avoid needless work.
      if (typeof window.myteamBrowseFilter === 'function') {
        var _apg = document.getElementById('myteam-browse-grid');
        if (_apg && _apg.offsetParent !== null) window.myteamBrowseFilter();
      }

      var cmpOverlay = document.getElementById('compare-overlay');
      if (cmpOverlay && cmpOverlay.style && cmpOverlay.style.display !== 'none') {
        if (typeof _buildCmpTable === 'function') _buildCmpTable();
      }
      // Keep the floating Compare button's "🎯 by match" hint in step with the
      // visitor's current issue selection.
      if (typeof _updateCmpFloat === 'function') _updateCmpFloat();

      // Keep the inline alignment % on the Your Key Races candidate cards in sync
      // with the issues the visitor just changed.
      if (typeof window.renderKeyRaces === 'function') window.renderKeyRaces();

      // The race sheet ranks a field by these same two numbers, so a stance
      // change — or a vote pack landing from the warmer above — has to re-order
      // it. No-op until race-sheet.js has loaded AND a sheet is actually open.
      if (typeof window._pdxRaceSheetRefresh === 'function') window._pdxRaceSheetRefresh();
    }

    // Exposed for the one class of change that happens OUTSIDE this file and still
    // moves every match number: a My Stances priority edit. Direction changes
    // already arrive here through alignSetIntensity, but a star is pure weight —
    // positionToLevel deliberately ignores priority — so nothing in the projection
    // path fires, and without this the race sheet would keep the order it had
    // before the visitor said which issue matters most. See _msPriorityWeight.
    window._alignRefreshAll = _alignRefreshAll;

    function syncRelevantAlignmentUI() {
      // Chip active-state is handled centrally by _alignSyncAllChips; here we only
      // keep the "My Key Alignments" status line in step with the selection.
      var statusEl = document.getElementById('relevant-align-status');
      if (statusEl) {
        var n = _alignIssues.size;
        if (n === 0) {
          statusEl.textContent = 'No issues selected. All representative cards show default view.';
          statusEl.style.color = '';
        } else {
          var labels = [];
          _alignIssues.forEach(function(k) {
            if (ISSUE_MAP[k]) labels.push(ISSUE_MAP[k].label);
          });
          statusEl.innerHTML = '<span style="color:#c084fc;font-weight:700;">' + n + ' active issue' + (n > 1 ? 's' : '') + '</span> — <span class="text-steel-400">' + labels.join(' · ') + '</span>';
        }
      }
    }

    window.syncRelevantAlignmentUI = syncRelevantAlignmentUI;

    window.toggleRelevantCheckbox = function(checkbox) {
      // Legacy entry point (the panel now uses chips). Kept so any cached markup
      // still toggles correctly; routes through the same unified path.
      var issue = checkbox.getAttribute('data-relevant-issue');
      if (!issue) return;
      if (checkbox.checked) _alignIssues.add(issue);
      else _alignIssues.delete(issue);
      _alignSave();
      _alignRefreshAll();
    };

    window.relevantAlignClearAll = function() {
      _alignIssues.clear();
      _alignIntensity = {};
      _alignExposeIntensity();
      _alignSave();
      _alignRefreshAll();
    };

    window.toggleRelevantAlignments = function(openState) {
      var body = document.getElementById('relevant-alignments-body');
      var chevron = document.getElementById('relevant-alignments-chevron');
      if (!body) return;
      
      var isCollapsed = body.style.display === 'none';
      var shouldOpen = (openState !== undefined) ? openState : isCollapsed;
      
      if (shouldOpen) {
        body.style.display = 'block';
        if (chevron) {
          chevron.style.transform = 'rotate(180deg)';
        }
      } else {
        body.style.display = 'none';
        if (chevron) {
          chevron.style.transform = '';
        }
      }
    };

    function _alignInjectIntoCard(card, pid) {
      var existing = card.querySelector('.align-inject');
      if (existing) existing.remove();
      if (_alignIssues.size === 0) return;
      var html = _alignScoreHtml(pid, 'small');
      if (!html) return;
      var nameRow = card.querySelector('.flex.items-center.gap-2.flex-wrap');
      if (nameRow) {
        var span = document.createElement('span');
        span.className = 'align-inject';
        span.innerHTML = html;
        nameRow.appendChild(span);
      }
    }

    function _alignUpdateStatus() {
      var el = document.getElementById('align-status');
      if (!el) return;
      var n = _alignIssues.size;
      if (n === 0) {
        el.textContent = 'Select issues above to see personalized alignment scores on every politician card.';
        el.style.color = '';
      } else {
        var labels = [];
        _alignIssues.forEach(function(k) { if (ISSUE_MAP[k]) labels.push(ISSUE_MAP[k].label); });
        el.innerHTML = '<span style="color:#a78bfa;font-weight:700;">' + n + ' issue' + (n > 1 ? 's' : '') + ' selected</span> — alignment scores now visible on all politician cards. <span style="color:#7c3aed;">' + labels.join(' · ') + '</span>';
      }
    }

    function _alignSyncBrowseChips() {
      var wrap = document.getElementById('chub-align-chips');
      var status = document.getElementById('chub-align-status');
      if (!wrap) return;
      var n = _alignIssues.size;
      if (n === 0) {
        wrap.innerHTML = '<span class="font-condensed text-xs text-steel-500">Set your issues in the Alignment Score panel above to filter by alignment</span>';
        if (status) status.textContent = '';
      } else {
        var html = '';
        Object.keys(ISSUE_MAP).forEach(function(key) {
          if (_alignIssues.has(key)) {
            html += '<span class="inline-flex items-center gap-1 bg-purple-900/30 border border-purple-500/30 rounded-full px-2.5 py-1 font-condensed text-xs text-purple-300 tracking-wider">' + ISSUE_MAP[key].label + '</span>';
          }
        });
        wrap.innerHTML = html;
        if (status) status.textContent = n + ' issue' + (n > 1 ? 's' : '') + ' active — cards show alignment %';
      }
    }

    window._calcAlignmentScore = _calcAlignmentScore;
    window._calcAlignmentBreakdown = _calcAlignmentBreakdown;
    window._alignIssueCount = function() { return _alignIssues.size; };
    window._alignScoreHtml = _alignScoreHtml;
    window._alignScoreColor = _alignScoreColor;
    window._alignScoreClass = _alignScoreClass;
    window._alignIssues = _alignIssues;
    // Exposed so the Key Races inline alignment breakdown can offer quick
    // add/remove issue chips. ISSUE_MAP gives the available issues + labels;
    // alignToggleIssue flips one and re-syncs every alignment-aware surface
    // (including the main picker chips and the Key Races cards) in one call.
    window._alignIssueMap = ISSUE_MAP;
    window.alignToggleIssue = function(issueKey) {
      if (!ISSUE_MAP[issueKey]) return;
      if (_alignIssues.has(issueKey)) {
        _alignIssues.delete(issueKey);
        delete _alignIntensity[issueKey];
      } else {
        _alignIssues.add(issueKey);
      }
      _alignSave();
      // _alignRefreshAll re-syncs both picker panels' chips, so a change made from
      // the Key Races quick-adjust mirrors onto the pickers and vice-versa.
      _alignRefreshAll();
      _alignPulse(issueKey);
    };

    // ── My Alignment Profile summary ───────────────────────────
    // A live, scannable overview of the visitor's current picks: how many positions,
    // the Strong / Moderate / Opposed mix (with a proportional strength meter), the
    // topics they've defined most, and the topics they haven't weighed in on yet.
    // Every area chip jumps straight back into the picker for that topic.
    // ── Quick Picks — popular specific issues for a fast start ─────────
    // A curated, ideologically-balanced shortlist of the most-asked-about granular
    // issues. The chips carry the same data-align-issue contract as the full picker,
    // so _alignSyncAllChips toggles their active state and alignToggle handles taps —
    // no separate state to keep in sync.
    var ALIGN_QUICK_PICKS = [
      'datacenter_water', 'term_limits', 'border_security', 'deportations', 'healthcare', 'gun_rights',
      'school_choice', 'climate_action', 'energy_production', 'cost_living', 'housing', 'homeless',
      'social_security', 'national_debt', 'cut_spending', 'property_tax', 'child_care',
      'immigration_reform', 'water', 'health_mental', 'gun_safety',
      'voter_id', 'tough_on_crime', 'end_dei', 'tariffs_china', 'america_first_fp', 'datacenter_growth',
      'tariffs_growth', 'tariffs_prices',
      // The two-axis elections vertical. Both are offered because they are scored
      // independently and read in opposite directions — 🔐 "support" is
      // pro-safeguard, 📩 "support" is pro-access — so a visitor who wants
      // stricter verification AND easier registration can say exactly that
      // instead of being forced onto one combined election axis. Quick Picks only
      // offers chips; nothing here changes how any score is computed.
      'election_security', 'voting_access'
    ];
    // Exposed so the per-politician alignment discovery modal (in the Key Races
    // script) can offer the same curated "popular issues" as tap-to-add chips when
    // a visitor opens a candidate's match before picking any issues of their own.
    window._alignQuickPicks = ALIGN_QUICK_PICKS;

    // The newer, high-engagement issues added in the 2026 refresh. Flagged with a
    // small 🔥 in Quick Picks so they're easy to spot as fresh, hot-topic picks.
    var ALIGN_HOT_ISSUES = {
      end_dei: 1, america_first_fp: 1, tariffs_china: 1, voter_id: 1,
      tough_on_crime: 1, deportations: 1, tariffs_growth: 1, tariffs_prices: 1,
      election_security: 1, voting_access: 1
    };

    function _alignRenderQuickPicks() {
      var el = document.getElementById('align-quickpicks');
      if (!el) return;
      var chips = ALIGN_QUICK_PICKS.filter(function(k) { return !!ISSUE_MAP[k]; }).map(function(k) {
        var d = ISSUE_MAP[k];
        var cov = _alignCoverage().byIssue[k] || 0;
        var covHtml = cov > 0 ? '<span class="align-quick-cov" title="' + cov + ' politician' + (cov === 1 ? '' : 's') + ' with a documented position on this issue">📍' + cov + '</span>' : '';
        var hot = ALIGN_HOT_ISSUES[k] ? ' align-quick-hot' : '';
        var hotHtml = ALIGN_HOT_ISSUES[k] ? '<span class="align-quick-flame" title="High-engagement issue added in the 2026 refresh" aria-hidden="true">🔥</span>' : '';
        return '<button type="button" class="align-chip align-quick-chip' + hot + '" data-align-issue="' + k + '"' +
          ' aria-pressed="false" title="' + d.chip + '" onclick="alignToggle(this)">' + hotHtml + d.label + covHtml + '</button>';
      }).join('');
      el.innerHTML =
        '<div class="align-quick-label">⚡ Quick picks ' +
          '<span class="align-quick-hint">popular specific issues — tap to add · 🔥 = high engagement</span></div>' +
        '<div class="align-quick-row">' + chips + '</div>';
    }

    function _alignRenderProfile() {
      var el = document.getElementById('align-profile-summary');
      if (!el) return;
      var n = _alignIssues.size;
      if (n === 0) {
        el.innerHTML =
          '<div class="align-profile-head"><div class="align-profile-title">🧭 My Alignment Profile</div>' +
          '<button type="button" class="align-mystances-link" onclick="if(window.PDXStances&&PDXStances.open)PDXStances.open();else location.hash=\'#my-stances\';" title="Build saved stances with priorities, private notes and an optional public showcase">🎯 My Stances</button></div>' +
          '<div class="align-profile-empty">You haven\'t set any stances yet. Check the issues you agree with below — pick as many as you like and tap <b>Strongly Support</b> through <b>Strongly Oppose</b> to set your stance on each. These are your stances (also saved in <b>My Stances</b>), and every politician then gets a <b>🎯 Your Match</b>. Where their formal record is deep enough to test, a <b>🏛️ Official Record</b> read sits beside it.</div>';
        return;
      }

      // Roll the five stance levels into three readable buckets for the summary:
      // support (support + strongly_support), neutral, and opposed (oppose +
      // strongly_oppose). A bare selection counts as the default 'support'.
      var support = 0, opposed = 0, neutral = 0, strong = 0;
      var catCounts = {};
      _alignIssues.forEach(function(k) {
        var lvl = _alignMigrateLevel(_alignIntensity[k] || ALIGN_DEFAULT_LEVEL);
        if (lvl === 'strongly_support' || lvl === 'strongly_oppose') strong++;
        if (lvl === 'oppose' || lvl === 'strongly_oppose') opposed++;
        else if (lvl === 'neutral') neutral++;
        else support++;
        var d = ISSUE_MAP[k];
        if (d && d.cat) catCounts[d.cat] = (catCounts[d.cat] || 0) + 1;
      });

      // Plain-language strength sentence. The count of strongly-held positions is
      // pulled out into its own conviction callout below the meter (clearer than a
      // parenthetical), so the sentence itself stays about the support/oppose mix.
      var parts = [];
      if (support > 0) parts.push('<b class="s-strong">support</b> on <b>' + support + '</b>');
      if (neutral > 0) parts.push('<b class="s-mod">neutral</b> on <b>' + neutral + '</b>');
      if (opposed > 0) parts.push('<b class="s-opp">opposed</b> on <b>' + opposed + '</b>');
      var sentence = parts.length
        ? 'You ' + (parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0]) + ' of your <b>' + n + '</b> position' + (n > 1 ? 's' : '') + '.'
        : 'You have selected <b>' + n + '</b> position' + (n > 1 ? 's' : '') + '.';

      // Proportional three-segment strength meter (support / neutral / opposed).
      var sw = Math.round(support / n * 100);
      var mw = Math.round(neutral / n * 100);
      var ow = Math.max(0, 100 - sw - mw);
      var meter = '<div class="align-strength-meter" aria-hidden="true">' +
        (sw > 0 ? '<div class="align-strength-seg strong" style="width:' + sw + '%;"></div>' : '') +
        (mw > 0 ? '<div class="align-strength-seg moderate" style="width:' + mw + '%;"></div>' : '') +
        (ow > 0 ? '<div class="align-strength-seg opposed" style="width:' + ow + '%;"></div>' : '') +
      '</div>';

      // Strongest areas = the categories with the most chosen positions. Areas to
      // explore = categories still untouched (the visitor's weakest coverage).
      var withCounts = ALIGN_CATEGORIES.map(function(c) { return { c: c, n: catCounts[c.key] || 0 }; });
      var covered = withCounts.filter(function(x) { return x.n > 0; }).sort(function(a, b) { return b.n - a.n; });
      var todo = withCounts.filter(function(x) { return x.n === 0; });

      function areaChip(x, isTodo) {
        return '<button type="button" class="align-area-chip' + (isTodo ? ' todo' : '') + '" onclick="alignJumpToCategory(\'' + x.c.key + '\')" title="Jump to ' + x.c.label + ' in the picker">' +
          '<span>' + x.c.icon + '</span><span>' + x.c.label + '</span>' +
          (isTodo ? '' : '<span class="n">' + x.n + '</span>') +
        '</button>';
      }

      var strongestHtml = covered.slice(0, 4).map(function(x) { return areaChip(x, false); }).join('');
      var todoHtml = todo.length
        ? todo.slice(0, 4).map(function(x) { return areaChip(x, true); }).join('')
        : '<span class="align-profile-empty" style="font-size:0.78rem;">Every topic covered — nice work. 🎉</span>';

      // Conviction callout: how many positions are held strongly (they carry the
      // heaviest weight in match scoring). A friendly nudge when none are yet.
      var convHtml = strong > 0
        ? '<div class="align-conviction"><span class="align-conviction-pill">💪 ' + strong + ' strong conviction' + (strong > 1 ? 's' : '') + '</span>' +
            '<span class="align-conviction-note">' + strong + ' of your ' + n + ' position' + (n > 1 ? 's' : '') + ' ' + (strong > 1 ? 'are' : 'is') + ' held strongly — these weigh most in your matches.</span></div>'
        : '<div class="align-conviction"><span class="align-conviction-note align-conviction-none">Tip: use <b>Strongly Support</b> or <b>Strongly Oppose</b> on the issues you care most about — they count extra toward your matches.</span></div>';

      var _msSaved = 0;
      try { if (window.PDXStances && typeof window.PDXStances.count === 'function') _msSaved = window.PDXStances.count() || 0; } catch (e) {}
      el.innerHTML =
        '<div class="align-profile-head">' +
          '<div class="align-profile-title">🧭 My Alignment Profile</div>' +
          '<span class="align-count-pill">' + n + ' position' + (n > 1 ? 's' : '') + '</span>' +
          '<button type="button" class="align-mystances-link" onclick="if(window.PDXStances&&PDXStances.open)PDXStances.open();else location.hash=\'#my-stances\';" title="Manage these as saved stances — add priorities, private notes, and a public showcase">🎯 My Stances' + (_msSaved ? '<span class="align-ms-n">' + _msSaved + '</span>' : '') + '</button>' +
        '</div>' +
        '<div class="align-profile-strength">' + sentence + '</div>' +
        meter +
        convHtml +
        '<div class="align-profile-cols">' +
          '<div><div class="align-profile-col-label">💪 Strongest areas</div><div class="align-area-chips">' + strongestHtml + '</div></div>' +
          '<div><div class="align-profile-col-label">🧩 Areas to explore</div><div class="align-area-chips">' + todoHtml + '</div></div>' +
        '</div>';
    }

    // Jump back into the main picker, open the requested topic and scroll to it —
    // the "make it easy to edit" affordance for the profile summary.
    window.alignJumpToCategory = function(catKey) {
      var panel = document.getElementById('alignment-panel');
      var cats = document.getElementById('align-cats-main');
      // Make sure the tool is open before we try to scroll a category into view.
      if (window.alignTogglePanel) window.alignTogglePanel(true);
      // Clear any active search so the target category is guaranteed visible.
      var search = document.getElementById('align-search-main');
      if (search && search.value) { search.value = ''; alignSearch(search, 'align-cats-main'); }
      var cat = cats ? cats.querySelector('.align-cat[data-cat="' + catKey + '"]') : null;
      if (cat) {
        cat.classList.add('open');
        var head = cat.querySelector('.align-cat-head');
        if (head) head.setAttribute('aria-expanded', 'true');
        // Let the expand animation settle so the scroll lands on the right spot.
        setTimeout(function() {
          cat.scrollIntoView({ behavior: 'smooth', block: 'center' });
          cat.style.transition = 'box-shadow 0.4s';
          cat.style.boxShadow = '0 0 0 2px rgba(168,85,247,0.5)';
          setTimeout(function() { cat.style.boxShadow = ''; }, 900);
        }, 460);
      } else if (panel) {
        setTimeout(function() { panel.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 460);
      }
    };

    // ── Issue search ───────────────────────────────────────────
    // Filters the accordion in one panel (scoped by catsId) against a query, hiding
    // non-matching options and the categories that end up empty, and auto-expanding
    // the categories that do match so results are visible without extra taps.
    window.alignSearch = function(input, catsId) {
      var q = (input.value || '').trim().toLowerCase();
      var wrap = input.closest('.align-search-wrap');
      if (wrap) wrap.classList.toggle('has-text', !!q);
      var cats = document.getElementById(catsId);
      if (!cats) return;
      var anyVisible = false;
      cats.querySelectorAll('.align-cat').forEach(function(cat) {
        var head = cat.querySelector('.align-cat-title');
        var headText = head ? head.textContent.toLowerCase() : '';
        var headMatch = !!q && headText.indexOf(q) !== -1;
        var catHasMatch = false;
        cat.querySelectorAll('.align-opt-row').forEach(function(row) {
          var txt = row.textContent.toLowerCase();
          // Also match against the issue's hidden keyword aliases (e.g. typing
          // "data center", "ai data", "homeless" or "property tax" surfaces the
          // right position even when those words aren't in the visible chip text).
          var kwHit = false;
          if (q) {
            var rk = row.getAttribute('data-opt-row');
            var def = rk && ISSUE_MAP[rk];
            if (def && def.keywords) {
              kwHit = def.keywords.some(function(kw) { return kw.indexOf(q) !== -1 || q.indexOf(kw) !== -1; });
            }
          }
          var match = !q || headMatch || txt.indexOf(q) !== -1 || kwHit;
          row.classList.toggle('align-hide', !match);
          if (match) catHasMatch = true;
        });
        var show = !q || catHasMatch;
        cat.classList.toggle('align-hide', !show);
        if (show) anyVisible = true;
        if (q && show) {
          cat.classList.add('open');
          var h = cat.querySelector('.align-cat-head');
          if (h) h.setAttribute('aria-expanded', 'true');
        }
      });
      // Group dividers only add noise while searching across topics — hide them.
      cats.querySelectorAll('.align-group-divider').forEach(function(d) { d.classList.toggle('align-hide', !!q); });
      var empty = document.getElementById(catsId + '-empty');
      if (empty) empty.style.display = (q && !anyVisible) ? 'flex' : 'none';
    };

    // ── Persistent floating launcher ───────────────────────────
    // Keeps the Alignment Tool reachable and top-of-mind from every section.
    // Reflects live state: a purple "set me up" before any picks, a teal
    // "see your matches" with a count once issues are chosen. Empty-state taps
    // open the picker; active taps jump the visitor to their best matches.
    function _alignUpdateFab() {
      var fab = document.getElementById('align-fab');
      if (!fab) return;
      var n = (_alignIssues && _alignIssues.size) || 0;
      var l1 = document.getElementById('align-fab-line1');
      var l2 = document.getElementById('align-fab-line2');
      var cnt = document.getElementById('align-fab-count');
      fab.style.display = 'inline-flex';
      if (n === 0) {
        fab.classList.add('is-empty');
        fab.classList.remove('is-active');
        if (l1) l1.textContent = 'Match your values';
        if (l2) l2.textContent = 'See past party — find your fit';
        if (cnt) cnt.style.display = 'none';
        fab.setAttribute('aria-label', 'Set up the Personalized Alignment Tool — match politicians to your values');
      } else {
        fab.classList.remove('is-empty');
        fab.classList.add('is-active');
        if (l1) l1.textContent = 'See your best matches';
        if (l2) l2.textContent = n + ' issue' + (n > 1 ? 's' : '') + ' active · tap to compare';
        if (cnt) { cnt.style.display = 'inline-flex'; cnt.textContent = n; }
        fab.setAttribute('aria-label', 'See your best-matched politicians — ' + n + ' issue' + (n > 1 ? 's' : '') + ' selected');
      }
    }
    window._alignUpdateFab = _alignUpdateFab;

    window._alignFabAction = function() {
      // One tap from any browsing section opens the ranked Best-Matches board —
      // pick issues right there (empty state) or jump straight to the live ranking.
      if (typeof window.openAlignBoard === 'function') { window.openAlignBoard(); return; }
      // Fallback to the legacy picker/sort flow if the board hasn't loaded.
      var n = (typeof _alignIssues !== 'undefined' && _alignIssues) ? _alignIssues.size : 0;
      if (n === 0) {
        if (window._krAlignGuideToPicker) window._krAlignGuideToPicker();
      } else if (window.alignSeeMatches) {
        window.alignSeeMatches();
      }
    };

    function _alignInit() {
      _alignLoad();
      // _alignLoad may replace the _alignIssues Set, so re-export the live
      // reference (the Key Races quick-adjust reads window._alignIssues directly).
      window._alignIssues = _alignIssues;
      _alignRenderQuickPicks();
      _alignRenderPickers();
      _alignRenderModeRow();
      _alignUpdateStatus();
      _alignRenderProfile();
      _alignSyncBrowseChips();
      syncRelevantAlignmentUI();
      _alignUpdateSigninPrompt();
      _alignUpdateFab();
      _alignBindAuth();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _alignInit);
    else _alignInit();
  })();
