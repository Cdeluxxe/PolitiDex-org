// ═══════════════════════════════════════════════════════════════════════════
// bill-key-patterns.mjs — per-key bill mapping patterns (twenty-five keys)
//
// Links a bill found by bill-finder-core.mjs to an issue key when the text
// says the bill is about that key's subject. Mapped so far:
//   israel_offensive_arms  (v1)
//   ukraine_aid            (v2 — "Further U.S. Aid to Ukraine")
//   iran_hostilities       (v4 — "Congress Must Authorize Hostilities with Iran")
//   tariffs_china          (v5 — "Tariffs on China & Unfair Trade", register key)
//   border_security        (v5 — "Strong Border & Enforcement", register key)
//   energy_production      (v6 — "Expand Domestic Energy Production", register key)
//   school_choice          (v6 — "School Choice & Education Freedom", register key)
//   healthcare             (v6 — "Expand Healthcare Access", register key)
//   cut_spending           (v6 — "Cut Federal Spending & Reduce Debt", register key)
//   climate_action         (v7 — "Climate Action & Clean Energy", register key)
//   gun_safety             (v7 — "Stronger Gun Safety Laws", register key)
//   pro_choice             (v7 — "Protect Reproductive Rights", register key)
//   voting_access          (v7 — "Expand Voting Access", register key)
//   housing                (v7 — "Housing Affordability", register key)
//   econ_trade             (v7 — "Protect American Jobs", register key: trade
//                           deals and trade rules other than China tariffs)
//   econ_workers           (v7 — "Raise Wages & Protect Workers", register key)
//   justice_reform         (v7 — "Criminal Justice Reform", register key)
//   social_security        (v8 — "Protect Social Security & Medicare", register key)
//   veterans               (v8 — "Take Care of Veterans", register key)
//   rural_ag               (v8 — "Farmers & Rural Communities", register key)
//   privacy_rights         (v8 — "Privacy & Big-Tech Accountability", register key)
//   health_drug_prices     (v8 — "Lower Prescription Drug Prices", register key)
//   back_police            (v8 — "Back Law Enforcement", register key)
//   edu_college_cost       (v8 — "Lower College & Trade Costs", register key)
//   lands_preserve         (v8 — "Protect Public Lands", register key)
// The v8 keys read exactly like the v7 keys and yield the same two ways, to
// every key before them (the first nine, the eight v7 keys and earlier v8 keys).
// The v7 keys read exactly like the v6 keys (full-document idea, one bill per
// sentence, lead-ins and statutes cited in passing left out) and yield twice:
//   · a sentence an earlier word key claims (its subject and measure words both
//     read) is not evidence for a v7 key, and
//   · a bill one of the first nine keys (or an earlier v7 key) maps stays with
//     that key: a v7 key does not also map it, unless the site's bill catalog
//     files the bill under the v7 key too (the Inflation Reduction Act is filed
//     under climate_action as well as healthcare).
// One change to a first-nine key: healthcare cedes a sentence that names
// abortion or reproductive care to pro_choice (it read the Women's Health
// Protection Act as a coverage bill). No first-nine mapping on the ground
// truth or the routine sweep moves.
// Every other key is left for later passes using the same shape:
//   subject     the subject the key is about (Israel / Ukraine)
//   instrument  what the bill does to it (an arms sale or transfer / aid,
//               funding or a supplemental)
//   facet       optional: what narrows a parent key to this child (OFFENSIVE
//               weapons for israel_offensive_arms; none for ukraine_aid)
//   excludes    optional: a facet that belongs to a sibling key and, alone,
//               means "not this key" (missile defence → israel_defensive_systems)
//   about       how the key's subject reads in an unmapped reason
//   facetMiss   the reason given when subject + instrument read but no facet
// Evidence (v3) is read from the mention's IDEA (bill-finder-core.mjs: the
// whole speech / release / bill when it is one continuous thought, cut at clear
// subject changes and distinct new measures) — but only the idea sentences on
// THIS key's subject (the stance scorer's subject spans), minus sentences a
// sibling facet claims (a defensive-systems passage never feeds
// israel_offensive_arms). So two provisions in one bill or speech map on their
// own. A catalog bill's official title is read as before.
//
// Confidence (simple, three levels):
//   high    bill number + subject words (subject AND instrument) in the text
//   medium  bill number with the subject only in the bill's official title, or
//           a short title with the subject words in the text
//   low     a descriptive phrase ("these resolutions", "the resolution to
//           disapprove the arms sale"), or a short title whose subject is only
//           in the official title
// The facet must be present in the text OR the official title for any map.
//
// Read-only and offline: nothing here changes a scoring rule, an issue key, a
// ground-truth label or the site.
// ═══════════════════════════════════════════════════════════════════════════
import { DIRECTIONAL_ISSUE_KEYS } from "./stance-topic-vocab.mjs";
import { subjectOf, facetExcludes } from "./stance-score-core.mjs";

export const PATTERNS_VERSION = "bill-key-patterns-v8";
export const CONFIDENCE_SCORE = { high: 0.9, medium: 0.6, low: 0.35 };

// What healthcare cedes (see its pattern).
const CEDE_ALWAYS = /\b(?:abortions?|reproductive|roe v\.? wade|born[- ]alive)\b/i;
const CEDE_UNLESS_COVERAGE = /\b(?:veterans?|PACT Act|prescription drugs?|drug prices|insulin|negotiat\w+ (?:the )?(?:lower )?(?:drug )?prices)\b/i;
const COVERAGE_WORDS = /\b(?:coverage|insurance|insured|uninsured|premiums?|affordable care act|ACA|obamacare|medicaid|CHIP|enroll\w*)\b/i;
// A v7 key yields, sentence by sentence, to every earlier word key, in this order.
const V6_YIELDS = ["tariffs_china", "border_security", "energy_production", "school_choice", "healthcare", "cut_spending"];
/** The first nine keys: a bill one of them maps stays with it (see yieldsBill). */
export const FIRST_NINE_KEYS = ["israel_offensive_arms", "ukraine_aid", "iran_hostilities", "tariffs_china", "border_security", "energy_production", "school_choice", "healthcare", "cut_spending"];

export const BILL_KEY_PATTERNS = {
  israel_offensive_arms: {
    label: DIRECTIONAL_ISSUE_KEYS.israel_offensive_arms.label,
    subject: /\b(?:israel\w*|IDF|gaza|netanyahu)\b/i,
    instrument: /\b(?:arms|weapons?|weaponry|munitions|bombs?|(?:foreign )?military sales?|sales?|transfers?|exports?|defense articles|license amendment)\b/i,
    facet: /\b(?:offensive|bombs?|bomb bodies|JDAMs?|guidance kits|small[- ]diameter bombs?|precision[- ]guided|tank (?:rounds|shells|cartridges)|mortar(?: cartridges| rounds)?|artillery|shells|munitions|assault rifles|carbine rifles?)\b/i,
    excludes: { key: "israel_defensive_systems", re: /\b(?:iron dome|david['’]?s sling|arrow (?:\d )?(?:missile|system)|missile defen[cs]e|air defen[cs]e|interceptors?|defend itself)\b/i },
    about: "Israel offensive arms",
    subjectWords: "Israel arms-transfer",
    facetMiss: "about arms for Israel, but neither the text nor the official title says the weapons are offensive (→ parent key israel_military_aid, not mapped)",
  },
  // Further U.S. aid to Ukraine: a supplemental, an appropriation, security or
  // economic assistance, weapons, or lend-lease for Ukraine. No facet: any U.S.
  // aid measure for Ukraine is on the key. A bill that only names Ukraine
  // (sanctions on Russia, a resolution of support) has no instrument word and
  // does not map. Russia / Putin alone is not the subject.
  ukraine_aid: {
    label: DIRECTIONAL_ISSUE_KEYS.ukraine_aid.label,
    subject: /\b(?:ukrain\w*|kyiv|zelensky\w*)\b/i,
    instrument: /\b(?:aid|assistance|funding|funds?|appropriations?|supplementals?|packages?|weapons|arms|money|dollars|blank checks?|lend-lease)\b/i,
    facet: null,
    about: "further U.S. aid to Ukraine",
    subjectWords: "Ukraine aid",
  },
  // U.S. hostilities with Iran: a war powers resolution aimed at Iran, a measure
  // to remove U.S. forces from hostilities with Iran, or one to authorize or
  // end such hostilities (an AUMF). No facet: either direction is on the key.
  // Naming Iran without a hostilities word (sanctions, the nuclear deal,
  // terrorism designations) does not map.
  iran_hostilities: {
    label: DIRECTIONAL_ISSUE_KEYS.iran_hostilities.label,
    subject: /\b(?:iran\w*|islamic republic|tehran|IRGC)\b/i,
    instrument: /\b(?:hostilities|war powers|armed forces|(?:use of )?(?:military )?force|military action|strikes?|war|troops|AUMF|authorization for (?:the )?use of military force)\b/i,
    facet: null,
    about: "U.S. hostilities with Iran",
    subjectWords: "Iran hostilities",
  },
  // Tariffs on China: a bill (or provision) that puts tariffs or duties on
  // Chinese goods, ends China's trade preferences, or sets trade remedies
  // against it. Naming China without a trade-remedy word (export controls,
  // espionage, Taiwan, the CCP in general) does not map.
  tariffs_china: {
    label: "Tariffs on China & Unfair Trade",
    words: true,
    subject: /\b(?:china|chinese|PRC|people['’]s republic of china|beijing|CCP|chinese communist party)\b/i,
    instrument: /\b(?:tariffs?|duties|duty|import tax\w*|section 301|trade remed\w+|unfair trade|countervailing|anti-?dumping|dumping|(?:permanent )?normal trade relations|most[- ]favored[- ]nation|de minimis|trade (?:war|deficit|enforcement|cheating|practices))\b/i,
    facet: null,
    about: "tariffs on China",
    subjectWords: "China tariff",
  },
  // Strong border and enforcement: a bill that builds barriers, funds or adds
  // border agents, tightens asylum and parole at the border, or steps up
  // enforcement against illegal crossings and entry. "Cross-border" (energy,
  // trade) is not the subject; naming the border without an enforcement word
  // does not map.
  border_security: {
    label: "Strong Border & Enforcement",
    words: true,
    subject: /\b(?:(?<!cross-)borders?(?![- ](?:towns|communities|energy|projects|adjustment|tax))|illegal (?:immigration|immigrants|aliens|crossings|entry)|asylum|migrants?|immigration)\b/i,
    instrument: /\b(?:secur\w*|enforce\w*|wall|barriers?|patrol|agents|officers|detention|detain\w*|deport\w*|removals?|Title 42|catch[- ]and[- ]release|remain in mexico|parole|E-?Verify|ICE|CBP|crisis|smuggling|fentanyl)\b/i,
    facet: null,
    about: "border enforcement",
    subjectWords: "border enforcement",
  },
  // Domestic energy production: oil, gas, coal, nuclear and pipelines —
  // leasing, permits, drilling, exports, or bans and restrictions on them.
  // "Energy" alone (bills, prices, solar credits) is not the subject.
  energy_production: {
    label: "Expand Domestic Energy Production",
    words: true, yields: ["tariffs_china", "border_security"],
    subject: /\b(?:oil|natural gas|LNG|crude|coal|pipelines?|fossil fuels?|petroleum|offshore drilling|fracking|hydraulic fracturing|(?:domestic|american) energy|energy (?:production|independence|dominance|development|resources)|nuclear (?:power|energy|plants?|reactors?))\b/i,
    instrument: /\b(?:produc\w+|leas\w+|permit\w*|drill\w*|exports?|expand\w*|unleash\w*|ban\w*|moratori\w+|frack\w*|approv\w+|restrict\w*|develop\w*|open\w*|lock(?:ed|ing)? up|shut(?:ting)? down|subsid\w+|independence|dominance|extract\w*)\b/i,
    facet: null,
    about: "domestic energy production",
    subjectWords: "energy production",
  },
  // School choice: vouchers, education savings accounts, charter schools,
  // tax-credit scholarships and 529 K–12 use. "Public schools" or "education"
  // alone is not the subject.
  school_choice: {
    label: "School Choice & Education Freedom",
    words: true, yields: ["tariffs_china", "border_security"],
    subject: /\b(?:school[- ]choice|vouchers?|education savings accounts?|charter schools?|private schools?|scholarship[- ]granting|scholarship (?:accounts?|programs?|organizations?)|tax[- ]credit scholarships?|educational choice|education freedom|(?:section )?529 (?:plans?|accounts?|college[- ]savings(?: plans?)?))\b/i,
    instrument: /\b(?:fund\w*|expand\w*|creat\w+|establish\w*|programs?|accounts?|(?:tax )?credits?|scholarships?|choice|parents|families|students|tuition|K[–-]12|dollars|money|ban\w*|oppos\w*|vouchers?|provisions?)\b/i,
    facet: null,
    about: "school choice",
    subjectWords: "school choice",
  },
  // Health care access: coverage through Medicaid, Medicare, the ACA and its
  // tax credits — expanding, extending, protecting or cutting it.
  healthcare: {
    label: "Expand Healthcare Access",
    words: true, yields: ["tariffs_china", "border_security"],
    // v7: a sentence that names abortion or reproductive care is pro_choice's
    // ("the Women’s Health Protection Act … reproductive health care").
    // v8: so is a sentence on veterans' care (→ veterans) or on drug prices
    // (→ health_drug_prices) that names no coverage word: "health care and
    // disability benefits to toxic-exposed veterans", "rely on Medicare … afford
    // essential prescription drugs". A sentence that also names insurance,
    // premiums, the ACA or Medicaid stays healthcare's.
    cedes: { test: (t) => CEDE_ALWAYS.test(t) || (CEDE_UNLESS_COVERAGE.test(t) && !COVERAGE_WORDS.test(t)) },
    subject: /\b(?:health (?:care|insurance|coverage)|healthcare|medicaid|medicare|affordable care act|ACA|obamacare|CHIP|uninsured)\b/i,
    instrument: /\b(?:coverage|cover\w*|access|expan\w+|extend\w*|extension|subsid\w+|tax credits?|cuts?|cutting|slash\w*|enroll\w*|eligib\w+|insur\w+|lose|losing|protect\w*|repeal\w*|premiums?|take \w+ away)\b/i,
    facet: null,
    about: "health care access",
    subjectWords: "health coverage",
  },
  // Cutting federal spending and the debt: budget resolutions, spending caps,
  // rescissions, debt-limit deals tied to cuts, a balanced budget amendment.
  // A bill that only spends money (an aid supplemental) is not the subject,
  // nor is the Congressional Budget Office.
  cut_spending: {
    label: "Cut Federal Spending & Reduce Debt",
    words: true, yields: ["tariffs_china", "border_security"],
    subject: /\b(?:federal spending|government spending|wasteful spending|reckless spending|discretionary spending|mandatory spending|deficit spending|future spending|deficits?|national debt|debt (?:ceiling|limit)|balanced (?:federal )?budget|balance (?:the|its|our) budget|spending (?:cuts?|caps?|levels?)|rescissions?|(?:house |senate |concurrent )?budget resolution|fiscal (?:responsibility|discipline)|overspending)\b/i,
    instrument: /\b(?:cut\w*|reduc\w+|slash\w*|balanc\w+|rescind\w*|rescission\w*|caps?|capp\w+|freez\w+|trim\w*|sav(?:e|es|ed|ing|ings)|waste\w*|lower\w*|rein\w*|limit\w*|restrain\w*|reckless|discipline|responsib\w+|explod\w+|rais\w+|lift\w*|suspend\w*|align\w*)\b/i,
    facet: null,
    about: "cutting federal spending",
    subjectWords: "spending-cut",
  },

  // ── v7 keys ────────────────────────────────────────────────────────────────
  // Climate and clean energy: emissions and carbon limits, clean-energy and
  // renewable deployment, credits and standards, electrification, the Paris
  // agreement and the Green New Deal — passing, funding or repealing them.
  // Oil, gas, coal and nuclear production stay with energy_production.
  climate_action: {
    label: "Climate Action & Clean Energy", pass: 7,
    words: true, yields: V6_YIELDS, yieldsBill: true,
    subject: /\b(?:climate (?:change|crisis|emergency|actions?|goals|pollution|investments?|impacts|policy|bill|plan|future)|carbon(?: dioxide| emissions| pollution| capture)?|greenhouse gas(?:es)?|(?:zero[- ])?emissions|clean[- ]energy|clean (?:electricity|power|vehicles?)|renewable (?:energy|power|electricity)|renewables|solar(?: energy| power| panels| projects)?|wind (?:energy|power|turbines)|offshore wind|electrif\w+|decarboni\w+|electric vehicles?|green new deal|paris (?:climate )?(?:agreement|accord)|net[- ]zero)\b/i,
    instrument: /\b(?:reduc\w+|cut\w*|lower\w*|eliminat\w+|invest\w*|fund\w*|tax credits?|credits?|incentiv\w+|standards?|requir\w+|mandat\w+|expand\w*|access|deploy\w*|support\w*|accelerat\w+|transition\w*|combat\w*|tackl\w+|address\w*|fight\w*|repeal\w*|roll(?:ing)? back|slash\w*|gut\w*|ban\w*|limits?|goals?|grants?|loans?|programs?)\b/i,
    facet: null,
    about: "climate and clean energy",
    subjectWords: "climate or clean-energy",
  },
  // Gun safety: background checks, assault-weapon and bump-stock bans, red-flag
  // and extreme-risk orders, age limits, safe storage, ghost guns, gun-violence
  // research and prevention — and their repeal. Either direction is on the key.
  gun_safety: {
    label: "Stronger Gun Safety Laws", pass: 7,
    words: true, yields: V6_YIELDS, yieldsBill: true,
    subject: /\b(?:guns?|firearms?|handguns?|semiautomatic(?: rifles| weapons)?|assault weapons?|bump stocks?|ghost guns?|gun violence|gun owners|background checks?|red[- ]flag|extreme risk protection|second amendment|2nd amendment|concealed carry|straw purchas\w+|ATF)\b/i,
    instrument: /\b(?:background checks?|ban\w*|prohibit\w*|restrict\w*|regulat\w+|control|safety|violence|prevent\w*|red[- ]flag|orders?|purchas\w+|sales?|sell\w*|transfers?|possess\w*|storage|research|repeal\w*|seiz\w+|confiscat\w+|registr\w+|rights?|infring\w+|grab|age|licens\w+|permits?|carry|protect\w*|defend\w*)\b/i,
    facet: null,
    about: "gun safety laws",
    subjectWords: "gun",
  },
  // Abortion and reproductive rights: a federal right to abortion, codifying
  // Roe, bans and limits, born-alive and funding (Hyde) measures, contraception
  // and IVF. Either direction is on the key.
  pro_choice: {
    label: "Protect Reproductive Rights", pass: 7,
    words: true, yields: V6_YIELDS, yieldsBill: true,
    subject: /\b(?:abortions?|reproductive (?:rights|freedom|health(?: care)?|care)|roe(?: v\.? wade)?|dobbs|contraception|birth control|IVF|in vitro fertilization|mifepristone|unborn|pro-life|pro-choice|born[- ]alive|right to life|hyde amendment)\b/i,
    instrument: /\b(?:access|rights?|protect\w*|guarantee\w*|codif\w+|restor\w+|ban\w*|restrict\w*|limit\w*|prohibit\w*|care|services|fund\w*|taxpayer|survivors?|attacks?|defend\w*|secur\w+|enshrin\w+|overturn\w*|life|lives|freedom)\b/i,
    facet: null,
    about: "abortion and reproductive rights",
    subjectWords: "abortion or reproductive-rights",
  },
  // Voting access and election rules: voter registration, early, absentee and
  // mail voting, voter ID and proof of citizenship, voting-rights enforcement
  // and redistricting — expanding or tightening them. "Election" alone (an
  // election result, a campaign) is not the subject.
  voting_access: {
    label: "Expand Voting Access", pass: 7,
    words: true, yields: V6_YIELDS, yieldsBill: true,
    subject: /\b(?:voting rights|right to vote|freedom to vote|voter (?:registration|rolls|ID|identification|suppression|fraud|eligibility|access)|(?:automatic|same-day) (?:voter )?registration|vot(?:e|ing)[- ]by[- ]mail|mail[- ]in (?:voting|ballots)|absentee (?:voting|ballots)|early voting|ballot (?:access|drop boxes|harvesting)|drop boxes|polling (?:places|locations)|(?:federal|state|our|their|free and fair) elections|elections? (?:laws?|system|process|administration|integrity|security|officials)|election day|gerrymander\w*|redistricting|proof of citizenship|noncitizens? voting)\b/i,
    instrument: /\b(?:access|expan\w+|protect\w*|restor\w+|modern\w+|register\w*|registration|requir\w+|proof|citizens?(?:hip)?|ID|identification|suppress\w*|restrict\w*|purg\w+|federaliz\w+|takeover|secur\w+|integrity|fraud|cheat|safeguard\w*|ban\w*|prohibit\w*|end\w*|undermin\w+|overrid\w+|strip\w*|eros?\w*|harvest\w*|early|mail|absentee|ballots?|vot(?:e|es|ers?|ing))\b/i,
    facet: null,
    about: "voting access and election rules",
    subjectWords: "voting-rules",
  },
  // Housing affordability: building and financing homes, zoning and land use,
  // rent and homeownership costs, housing assistance and supportive services.
  // "Homes" in another sense (heating homes, home health) is not the subject.
  housing: {
    label: "Housing Affordability", pass: 7,
    words: true, yields: V6_YIELDS, yieldsBill: true,
    subject: /\b(?:housing|affordable homes?|homeownership|homebuyers?|home prices|starter homes|rents?|renters|tenants|landlords?|evictions?|mortgages?|zoning|land[- ]use|apartments|rental (?:housing|units|assistance)|low[- ]income housing tax credit|LIHTC|HUD)\b/i,
    instrument: /\b(?:afford\w+|build\w*|built|construct\w*|supply|units|develop\w*|cost\w*|prices?|lower\w*|reduc\w+|increas\w+|fund\w*|financ\w+|tax credits?|assistance|vouchers?|services|incentiv\w+|reward\w*|reform\w*|exclusionary|restrictions?|stab\w+|evict\w*|protect\w*|cuts?|human right|crisis|shortage)\b/i,
    facet: null,
    about: "housing affordability",
    subjectWords: "housing",
  },
  // Trade deals and trade rules other than China tariffs: trade agreements
  // (USMCA, NAFTA), tariffs and duties on other countries, trade enforcement,
  // Buy American and outsourcing. China tariffs stay with tariffs_china.
  econ_trade: {
    label: "Protect American Jobs", pass: 7,
    words: true, yields: V6_YIELDS, yieldsBill: true,
    subject: /\b(?:trade (?:deals?|agreements?|polic(?:y|ies)|enforcement|laws?|rules|remed\w+|adjustment|deficits?)|tariffs?|duties|USMCA|NAFTA|North American Free Trade|United States[- ]Mexico[- ]Canada|World Trade Organization|WTO|free trade|fair trade|reciprocal trade|buy american|made in america|outsourc\w+|offshor\w+|section 232|imports?|exports?)\b/i,
    instrument: /\b(?:implement\w*|workers?|jobs?|manufactur\w+|farmers|ranchers|industr\w+|enforce\w*|enforceable|protections?|standards?|level(?:ing)? the playing field|replac\w+|modern\w+|renegotiat\w+|impos\w+|rais\w+|cut\w*|lower\w*|terminat\w+|end\w*|compet\w+|economy|economic|exports?|imports?|outsourc\w+|wages?)\b/i,
    facet: null,
    about: "trade deals and trade rules",
    subjectWords: "trade",
  },
  // Wages and workers' rights: the minimum wage, the right to organize and
  // bargain collectively, union elections, overtime and labor-law penalties.
  // "Workers" alone (health care workers, federal workers) is not the subject.
  econ_workers: {
    label: "Raise Wages & Protect Workers", pass: 7,
    words: true, yields: V6_YIELDS, yieldsBill: true,
    subject: /\b(?:minimum wage|living wage|subminimum wage|tipped (?:workers|wage)|overtime (?:pay|rules|protections)|unions?|labor (?:unions|law|laws|rights|standards)|organized labor|union members(?:hip)?|collective(?:ly)? bargain\w*|right to organize|right[- ]to[- ]work|union[- ]busting|NLRB|national labor relations|workers['’]? rights|worker protections|wage theft)\b/i,
    instrument: /\b(?:rais\w+|rais(?:e|ing) the wage|increas\w+|protect\w*|organiz\w+|bargain\w*|join\w*|strengthen\w*|restor\w+|empower\w*|penalt\w+|repeal\w*|gut\w*|ban\w*|overturn\w*|wages?|pay|benefits|rights?|fair\w*|\$\d+|hour|elections?|retaliat\w+)\b/i,
    facet: null,
    about: "wages and workers' rights",
    subjectWords: "wage or labor-law",
  },
  // Criminal justice reform: sentencing and mandatory minimums, incarceration,
  // prisons and reentry, bail, clemency and record relief, police reform.
  justice_reform: {
    label: "Criminal Justice Reform", pass: 7,
    words: true, yields: V6_YIELDS, yieldsBill: true,
    subject: /\b(?:criminal justice(?: system| reform)?|justice (?:system|reform)|sentencing(?: reform| laws?| disparit\w+)?|sentences?|mandatory minimums?|(?:mass )?incarceration|incarcerated|prisons?|prisoners|recidivism|reentry|re-entry|second chances?|good time credits|compassionate release|clemency|expunge\w*|record sealing|cash bail|bail reform|police reform|policing|qualified immunity|crack(?:[- ]powder)? cocaine)\b/i,
    instrument: /\b(?:reform\w*|reduc\w+|retroactive\w*|fair\w*|unjust\w*|disparit\w+|relief|redemption|rehabilitat\w+|end\w*|eliminat\w+|overdue|expand\w*|second chances?|credits?|release|reauthoriz\w+|abolish\w*|accountab\w+|tough on crime|mandatory|lengthen\w*|increas\w+|harsh\w*|compassionate)\b/i,
    facet: null,
    about: "criminal justice reform",
    subjectWords: "criminal-justice",
  },

  // ── v8 keys ────────────────────────────────────────────────────────────────
  // Social Security: benefits, the WEP / GPO offsets, the retirement age, the
  // trust fund and the agency's offices and staff — protecting, expanding or
  // cutting them. Medicare coverage stays with healthcare.
  social_security: {
    label: "Protect Social Security & Medicare", pass: 8,
    words: true, yields: [], yieldsBill: true,
    subject: /\b(?:social security(?: administration)?|SSA|windfall elimination provision|government pension offset|WEP|GPO|supplemental security income|SSI|SSDI|social security disability)\b/i,
    instrument: /\b(?:benefits?|repeal\w*|protect\w*|strengthen\w*|expand\w*|cut\w*|slash\w*|privatiz\w+|retire\w*|seniors|solvency|trust funds?|retirement age|fairness|unfair\w*|penaliz\w+|reduc\w+|increas\w+|cost-of-living|COLA|payments?|earned|offices?|workforce|staff\w*|fir(?:e|ed|ing))\b/i,
    facet: null,
    about: "Social Security",
    subjectWords: "Social Security",
  },
  // Veterans: VA health care and benefits, toxic-exposure presumptions, the GI
  // Bill, veteran suicide and homelessness. "VA" is read in capitals only and
  // never as a district ("VA-03").
  veterans: {
    label: "Take Care of Veterans", pass: 8,
    words: true, yields: [], yieldsBill: true,
    subject: /\b(?:[Vv]eterans?(?!['’]? (?:[Tt]reatment )?[Cc]ourts)|VA(?![-‐–]\d)|Department of Veterans Affairs|[Ss]ervice ?members?|[Mm]ilitary families|[Bb]urn pits?|Agent Orange|PACT Act|GI Bill|[Tt]hose who served)\b/,
    instrument: /\b(?:care|health ?care|benefits?|disabilit\w+|claims?|compensation|presumptions?|expand\w*|access|fund\w*|cover\w*|eligib\w+|services|suicide|homeless\w*|support\w*|protect\w*|honor\w*|promise|treatment|backlogs?|staffing|earned)\b/i,
    facet: null,
    about: "veterans' care and benefits",
    subjectWords: "veterans",
  },
  // Farmers and rural communities: the farm bill, crop insurance, commodity and
  // disaster programs, farm credit and markets. A wind, solar or server "farm"
  // is not the subject.
  rural_ag: {
    label: "Farmers & Rural Communities", pass: 8,
    words: true, yields: [], yieldsBill: true,
    subject: /\b(?:farm bill|(?<!(?:wind|solar|server|data|troll) )farm(?:ers?|s|ing|land)?|ranch(?:ers?|es|ing)|agricultur\w+|(?:farm|ag|agricultural|livestock|dairy|crop) producers|crop insurance|livestock|dairy|specialty crops?|family farms?|USDA|rural (?:communities|america|economies|economy|broadband|development))\b/i,
    instrument: /\b(?:support\w*|fund\w*|safety net|reference prices|insurance|credit|loans?|markets?|prices?|certainty|risk|disaster\w*|assistance|programs?|invest\w*|protect\w*|strengthen\w*|expand\w*|cut\w*|pass\w*|reauthoriz\w+|extensions?|tools|access|grow\w*|deliver\w*|wins?)\b/i,
    facet: null,
    about: "farmers and rural communities",
    subjectWords: "farm",
  },
  // Privacy: personal data, data brokers, government surveillance and warrant
  // requirements (FISA Section 702), online tracking and Big Tech data use.
  privacy_rights: {
    label: "Privacy & Big-Tech Accountability", pass: 8,
    words: true, yields: [], yieldsBill: true,
    subject: /\b(?:privacy|personal (?:data|information)|data brokers?|surveillance|warrantless|FISA|section 702|fourth amendment|location data|biometric\w*|online tracking|big tech)\b/i,
    instrument: /\b(?:protect\w*|warrants?|ban\w*|prohibit\w*|limit\w*|stop\w*|end\w*|restrict\w*|reform\w*|safeguards?|abus\w+|collect\w*|sell\w*|sale|purchas\w+|buy\w*|shar\w+|target\w*|consent|rights|civil liberties|unconstitutional|search\w*|spy\w*|exploit\w*|hoard\w*|reauthoriz\w+)\b/i,
    facet: null,
    about: "privacy and personal data",
    subjectWords: "privacy",
  },
  // Prescription drug prices: Medicare negotiation, insulin and out-of-pocket
  // caps, inflation rebates, PBMs and generics. Coverage stays with healthcare.
  health_drug_prices: {
    label: "Lower Prescription Drug Prices", pass: 8,
    words: true, yields: [], yieldsBill: true,
    subject: /\b(?:prescription drugs?|drug (?:prices|costs|pricing|price negotiation)|insulin|pharma\w*|PBMs?|pharmacy benefit managers?|medications?|price negotiations?|part D|generic drugs?|biosimilars?)\b/i,
    instrument: /\b(?:lower\w*|reduc\w+|caps?|capp\w+|negotiat\w+|afford\w*|costs?|prices?|out-of-pocket|savings?|sav(?:e|es|ed|ing)|rebates?|penalt\w+|gouging|transparen\w+|excesses|\$\d[\d,.]*)\b/i,
    facet: null,
    about: "prescription drug prices",
    subjectWords: "drug-price",
  },
  // Backing law enforcement: funding, hiring, training and equipping police and
  // sheriffs, and penalties for attacks on officers. Police reform stays with
  // justice_reform.
  back_police: {
    label: "Back Law Enforcement", pass: 8,
    words: true, yields: [], yieldsBill: true,
    subject: /\b(?:police(?: officers| departments?| week)?|law enforcement(?: officers| agencies)?|sheriffs?|deputies|cops|(?:men and women|those) in blue|back the blue)\b/i,
    instrument: /\b(?:fund\w*|defund\w*|support\w*|invest\w*|recruit\w*|retention|retain\w*|training|hir(?:e|es|ed|ing)|grants?|equipment|gear|protect\w*|honor\w*|resources|tools|staffing|penalt\w+|assault\w*|safety|bonuses|back)\b/i,
    facet: null,
    about: "backing law enforcement",
    subjectWords: "law-enforcement",
  },
  // College and trade-school costs: student loans and debt relief, repayment
  // plans, Pell Grants, tuition and free community college.
  edu_college_cost: {
    label: "Lower College & Trade Costs", pass: 8,
    words: true, yields: [], yieldsBill: true,
    subject: /\b(?:college|universit(?:y|ies)|higher education|tuition|student (?:loans?|debt|borrowers|loan debt|loan borrowers|aid)|pell(?: grants?)?|trade schools?|community college|FAFSA|income-driven repayment|SAVE (?:plan|scheme)|public service loan forgiveness|PSLF)\b/,
    instrument: /\b(?:cancel\w*|forgiv\w+|relief|debts?|afford\w*|costs?|tuition|repay\w*|loans?|free|cut\w*|lower\w*|expand\w*|bailouts?|taxpayers|burden|interest|discharg\w+|block\w*|overturn\w*)\b/i,
    facet: null,
    about: "college costs and student debt",
    subjectWords: "college-cost",
  },
  // Public lands: national parks, monuments, forests and wilderness; selling,
  // transferring or protecting federal land; park and outdoor-access funding.
  lands_preserve: {
    label: "Protect Public Lands", pass: 8,
    words: true, yields: [], yieldsBill: true,
    subject: /\b(?:public lands?|federal lands?|national (?:parks?|monuments?|forests?|wildlife refuges?)|wilderness(?: areas?| study areas?)?|wild places|open spaces?|bureau of land management|BLM|forest service|antiquities act|land and water conservation fund|LWCF)\b/i,
    instrument: /\b(?:protect\w*|preserv\w+|conserv\w+|sell\w*|sale|sell-?offs?|transfer\w*|dispos\w+|auction\w*|designat\w+|access|invest\w*|fund\w*|keep|public hands|drill\w*|mining|withdraw\w*|oppos\w+|codif\w+|safeguard\w*|modern\w+)\b/i,
    facet: null,
    about: "public lands",
    subjectWords: "public-lands",
  },
};

/** Keys with a mapping pattern. */
export const MAPPED_KEYS = Object.keys(BILL_KEY_PATTERNS);
/** The keys added after the first nine (v7, v8): each yields a bill to every key before it. */
export const LATER_KEYS = MAPPED_KEYS.filter((k) => BILL_KEY_PATTERNS[k].yieldsBill);
/** The v7 keys. */
export const V7_KEYS = LATER_KEYS.filter((k) => BILL_KEY_PATTERNS[k].pass === 7);
/** The v8 keys. */
export const V8_KEYS = LATER_KEYS.filter((k) => BILL_KEY_PATTERNS[k].pass === 8);
/** The first seventeen keys (the first nine and the v7 keys). */
export const FIRST_SEVENTEEN_KEYS = [...FIRST_NINE_KEYS, ...V7_KEYS];
// Each later key also yields, sentence by sentence, to the later keys before it.
for (const [i, k] of LATER_KEYS.entries()) BILL_KEY_PATTERNS[k].yields = [...new Set([...V6_YIELDS, ...LATER_KEYS.slice(0, i), ...BILL_KEY_PATTERNS[k].yields])];

const uniq = (a) => [...new Set(a.filter(Boolean))];

/**
 * Map one found candidate onto one key. → { mapped: true, ... } | { mapped: false, reason }
 */
export function mapCandidate(cand, key, opts = {}) {
  const P = BILL_KEY_PATTERNS[key];
  if (!P) return { mapped: false, reason: `no mapping pattern for ${key}` };
  const r = mapOwn(cand, key);
  // v7: on a state legislator's page a federal-style number the catalog does not
  // hold is most likely a state bill (Vermont writes "S.100"), so it is not mapped.
  if (r.mapped && P.yieldsBill && opts.level === "state" && cand.kind === "number" && !cand.catalog)
    return { mapped: false, reason: `a bill number on a state legislator's page that the federal catalog does not hold (most likely a state bill)` };
  // v7/v8: a bill any key before this one maps stays with that key, unless the
  // catalog files it under this key too.
  if (r.mapped && P.yieldsBill && !cand.catalog?.issue_keys?.includes(key)) {
    const earlier = MAPPED_KEYS.slice(0, MAPPED_KEYS.indexOf(key)).find((k) => mapOwn(cand, k).mapped);
    if (earlier) return { mapped: false, reason: `the bill maps to ${earlier}, an earlier key, and the catalog does not file it under ${key}` };
  }
  return r;
}

function mapOwn(cand, key) {
  const P = BILL_KEY_PATTERNS[key];
  const best = cand.mentions.find((m) => m.kind === "number") || cand.mentions.find((m) => m.kind === "short_title") || cand.mentions[0];
  const ev = P.words ? wordEvidenceFor(cand, key) : evidenceFor(cand, key);
  const texts = ev.texts;
  const joined = texts.join(" ");
  const ideaText = uniq(cand.mentions.flatMap((m) => m.window)).join(" ");
  const title = cand.catalog?.title || "";
  const resolvedTitles = (cand.resolves_to || []).map((r) => r.title);

  const textSubject = texts.length > 0 && P.subject.test(joined) && P.instrument.test(joined);
  const titleSubject = !ev.keyed && !ev.historic && !!title && P.subject.test(title) && P.instrument.test(title);
  const textFacet = !P.facet || P.facet.test(joined);
  const titleFacet = !!title && !!P.facet && P.facet.test(title);
  const kind = cand.mentions.some((m) => m.kind === "number") ? "number" : cand.mentions.some((m) => m.kind === "short_title") ? "short_title" : "phrase";

  if (!textSubject && !titleSubject) {
    if (ev.far) return { mapped: false, reason: `the measure is named away from the passage on ${P.about} (no ${P.subjectWords} words in or just after a sentence that names it)` };
    if (ev.procedure) return { mapped: false, reason: `the Congressional Review Act named as the procedure, not the measure the page is about` };
    if (ev.historic) return { mapped: false, reason: `a statute named next to a 19xx year, cited in passing (not a measure the page is about)` };
    if (ev.keyed) return { mapped: false, reason: `the mention sits in a passage about ${KEYED_SUBJECT_NAME[ev.keyed] || ev.keyed}, not ${P.about}` };
    if (ev.excluded && P.excludes) return { mapped: false, reason: `about Israel arms, but only defensive systems are named (→ ${P.excludes.key}, not mapped)` };
    return { mapped: false, reason: subjectMiss(cand, ideaText, key) };
  }
  if (!textFacet && !titleFacet) {
    const excluded = P.excludes && (ev.excluded || P.excludes.re.test(joined) || P.excludes.re.test(title));
    return { mapped: false, reason: excluded
      ? `about Israel arms, but only defensive systems are named (→ ${P.excludes.key}, not mapped)`
      : P.facetMiss };
  }

  let confidence, basis;
  if (kind === "number") [confidence, basis] = textSubject ? ["high", "bill number + subject words in the text"] : ["medium", "bill number in the text; subject from the bill's official title"];
  else if (kind === "short_title") [confidence, basis] = textSubject ? ["medium", "short title + subject words in the text"] : ["low", "short title; subject from the bill's official title"];
  else [confidence, basis] = ["low", "descriptive phrase + subject words in the text"];
  if (P.facet && !textFacet) basis += "; 'offensive' from the official title";

  const justify = textSubject
    ? texts.filter((t) => P.subject.test(t) || P.instrument.test(t) || (P.facet && P.facet.test(t)))
    : [`[official title] ${title}`];
  return {
    mapped: true, key, confidence, confidence_score: CONFIDENCE_SCORE[confidence], basis,
    bill: cand.bill, id: cand.id, matched: best.match,
    span: justify.join(" … "),
    ...(cand.resolves_to ? { resolves_to: cand.resolves_to.map((r) => ({ ...r, title_fits_key: titleFits(r.title, P) })) } : {}),
    ...(resolvedTitles.length > 1 ? { best_fit: bestFit(cand.resolves_to, P) } : {}),
  };
}

// The idea sentences on a key's subject (named, carried, or one of two subjects
// a sentence names), without those a sibling facet claims; the mention sentence
// itself joins when the idea is on the key. URL-slug headlines count when they
// name the subject.
function evidenceFor(cand, key) {
  const P = BILL_KEY_PATTERNS[key];
  const subj = subjectOf(key);
  const kept = new Map();
  let excluded = false;
  const all = cand.mentions.flatMap((m) => m.idea || []);
  for (const e of all) {
    if (kept.has(e.id)) continue;
    const onKey = e.slug ? P.subject.test(e.text) : e.subject === subj || (e.subjects || []).includes(subj);
    if (!onKey) continue;
    if (facetExcludes(key, e.facet)) { excluded = true; continue; }
    kept.set(e.id, e);
  }
  if (kept.size) for (const e of all) if (e.mention && !e.subject && !e.subjects && !kept.has(e.id)) kept.set(e.id, e);
  const order = (e) => (e.slug ? Infinity : e.sentence);
  return { texts: [...kept.values()].sort((a, b) => order(a) - order(b)).map((e) => e.text), excluded };
}

// Word-subject keys: the document-idea sentences that name the key's subject
// and sit on no Israel / Ukraine / Iran subject; the mention sentence joins
// when the idea is on the key and it sits on no such subject either. `keyed`
// names the subject the mention itself sits on, when it does.
const KEYED_SUBJECT_NAME = { [subjectOf("israel_offensive_arms")]: "Israel (→ israel_* keys)", [subjectOf("ukraine_aid")]: "Ukraine (→ ukraine_aid)", [subjectOf("iran_hostilities")]: "Iran (→ iran_hostilities)" };
const keyedSubject = (e) => (e.subject || (e.subjects || []).some((x) => x !== "other") ? (e.subject || e.subjects.find((x) => x !== "other")) : null);
// Page chrome — a site's issue tag or category line ("Issues : Border Security")
// — names a subject but says nothing about the bill, so it is never evidence.
const CHROME_LINE = /^\s*(?:issues?|tags?|categor(?:y|ies)|topics?|filed under|related (?:issues|topics)|press release)\s*:/i;
// A sentence another word key claims (its subject and measure words both read).
// A sentence the other key cedes (healthcare cedes abortion sentences) is not its claim.
const yieldsTo = (P, text) => (P.yields || []).some((k) => BILL_KEY_PATTERNS[k].subject.test(text) && BILL_KEY_PATTERNS[k].instrument.test(text) && !BILL_KEY_PATTERNS[k].cedes?.test(text));
// v6 keys, two more rules for "different ideas apart":
//   · ONE BILL PER SENTENCE. Inside the document idea each sentence belongs to
//     one measure: a sentence that names measures belongs to the one it names
//     first ("The Limit, Save, Grow Act would … repeal … the Inflation
//     Reduction Act's credits" is Limit, Save, Grow evidence, not IRA
//     evidence); a sentence that names none belongs to the measure named last
//     before it; lead-in sentences before the page first names a measure
//     belong to it only when the whole page names a single measure (a one-bill
//     release), so an opening statement's preface never feeds the first of
//     several bills;
//   · an uncatalogued "… Act" named next to a 19xx year is a statute cited in
//     passing ("in 1935, the Social Security Act has provided …"), not a
//     measure the page is about.
const candMeasure = (cand) => cand.id || `title|${String(cand.name || "").toLowerCase()}`;
const HISTORIC_YEAR = /\b19\d\d\b/;
const CARRIES_MEASURE = /^\W*(?:It|This (?:bill|legislation|law|act|measure|resolution|package)|The (?:bill|legislation|law|act|measure|resolution|package|[A-Z][A-Za-z]*\d+[A-Za-z]*\b))/;
const PROCEDURE_STATUTE = /^(?:the )?Congressional Review Act$/i;
function wordEvidenceFor(cand, key) {
  const P = BILL_KEY_PATTERNS[key];
  const kept = new Map();
  const all = cand.mentions.flatMap((m) => m.doc || []);
  const v6 = !!P.yields;
  if (v6 && cand.kind === "short_title" && !cand.in_catalog && !cand.id && cand.mentions.every((m) => HISTORIC_YEAR.test(m.span.text))) return { texts: [], excluded: false, keyed: null, historic: true };
  // v8: the Congressional Review Act named as the procedure ("a Congressional
  // Review Act (CRA) resolution") is not the measure the page is about.
  if (P.pass === 8 && cand.kind === "short_title" && !cand.id && PROCEDURE_STATUTE.test(String(cand.name || cand.mentions[0]?.match || ""))) return { texts: [], excluded: false, keyed: null, historic: true, procedure: true };
  const mine = candMeasure(cand);
  const owned = new Set();
  if (v6) for (const m of cand.mentions) {
    const doc = m.doc || [];
    const distinct = new Set(doc.flatMap((e) => e.measures || []));
    let owner = distinct.size === 1 ? [...distinct][0] : null;
    for (const e of doc) {
      if (e.measures) owner = e.measures[0];
      if ((owner === mine && !e.lead) || e.slug) owned.add(e.id);
    }
  }
  for (const e of all) {
    if (v6 && !owned.has(e.id)) continue;
    if (kept.has(e.id) || keyedSubject(e) || CHROME_LINE.test(e.text) || !P.subject.test(e.text) || yieldsTo(P, e.text) || P.cedes?.test(e.text)) continue;
    kept.set(e.id, e);
  }
  if (kept.size) for (const e of all) if (e.mention && !keyedSubject(e) && !kept.has(e.id) && (!v6 || owned.has(e.id)) && !P.cedes?.test(e.text)) kept.set(e.id, e);
  // v8: a measure with no catalog row maps only when the key's subject reads in
  // a sentence that names it, or in the sentence just after one that carries
  // the measure on ("It …", "The bill …", "The GAOA250 …").
  if (P.pass === 8 && !cand.id && kept.size) {
    const at = new Set(cand.mentions.map((m) => m.span.sentence).filter((x) => x != null));
    const near = (e) => at.has(e.sentence) || (at.has(e.sentence - 1) && CARRIES_MEASURE.test(e.text));
    if (![...kept.values()].some((e) => e.slug || (near(e) && P.subject.test(e.text)))) return { texts: [], excluded: false, keyed: null, far: true };
  }
  const own = all.filter((e) => e.mention);
  const keyed = own.length && own.every((e) => keyedSubject(e)) ? keyedSubject(own[0]) : null;
  const order = (e) => (e.slug ? Infinity : e.sentence);
  return { texts: [...kept.values()].sort((a, b) => order(a) - order(b)).map((e) => e.text), excluded: false, keyed };
}

// Among several resolved bills, the one whose official title alone fits the key.
const titleFits = (t, P) => P.subject.test(t) && P.instrument.test(t) && (!P.facet || P.facet.test(t));
function bestFit(rows, P) {
  const fit = rows.filter((r) => titleFits(r.title, P));
  return fit.length === 1 ? fit[0].id : null;
}

const OTHER_SUBJECTS = [
  [/\bisrael\w*|gaza|iron dome/i, "Israel (→ israel_* keys)", "israel_offensive_arms"],
  [/\bukrain\w*|kyiv|zelensky/i, "Ukraine (→ ukraine_aid)", "ukraine_aid"],
  [/\biran\w*|islamic republic|tehran/i, "Iran (→ iran_hostilities)", "iran_hostilities"],
  [/\bmedicare|health ?care|health insurance|medicaid/i, "health care", "healthcare"],
  [/\bvouchers?|school choice|public schools?|education/i, "education", "school_choice"],
  [/\b(?:china|chinese|beijing|CCP)\b/i, "China (→ tariffs_china)", "tariffs_china"],
  [/\b(?<!cross-)border\b|illegal immigration|asylum/i, "the border (→ border_security)", "border_security"],
  [/\b(?:oil|natural gas|coal|pipelines?|fossil fuels?|petroleum)\b/i, "energy production (→ energy_production)", "energy_production"],
  [/\b(?:national debt|deficits?|debt (?:ceiling|limit)|balanced budget|spending cuts?)\b/i, "federal spending (→ cut_spending)", "cut_spending"],
  [/\b(?:climate|carbon|emissions|clean energy|renewables?|solar)\b/i, "climate and clean energy (→ climate_action)", "climate_action"],
  [/\b(?:guns?|firearms?|background checks?|second amendment)\b/i, "guns (→ gun_safety)", "gun_safety"],
  [/\b(?:abortions?|reproductive|roe v\.? wade)\b/i, "abortion (→ pro_choice)", "pro_choice"],
  [/\b(?:voting rights|right to vote|voter (?:registration|ID)|ballots?)\b/i, "voting rules (→ voting_access)", "voting_access"],
  [/\b(?:housing|rents?|zoning|homeownership)\b/i, "housing (→ housing)", "housing"],
  [/\b(?:minimum wage|unions?|collective bargaining|right to organize)\b/i, "wages and unions (→ econ_workers)", "econ_workers"],
  [/\b(?:sentencing|incarceration|prisons?|criminal justice)\b/i, "criminal justice (→ justice_reform)", "justice_reform"],
  [/\b(?:trade (?:deals?|agreements?)|USMCA|NAFTA|tariffs?)\b/i, "trade (→ econ_trade)", "econ_trade"],
  [/\bsocial security\b/i, "Social Security (→ social_security)", "social_security"],
  [/\b(?:veterans?|PACT Act)\b/, "veterans (→ veterans)", "veterans"],
  [/\b(?:farm bill|farmers|ranchers|agricultur\w+)\b/i, "farming (→ rural_ag)", "rural_ag"],
  [/\b(?:privacy|surveillance|data brokers?|FISA)\b/i, "privacy (→ privacy_rights)", "privacy_rights"],
  [/\b(?:prescription drugs?|drug prices|insulin|pharma\w*)\b/i, "drug prices (→ health_drug_prices)", "health_drug_prices"],
  [/\b(?:police|law enforcement|sheriffs?)\b/i, "law enforcement (→ back_police)", "back_police"],
  [/\b(?:student (?:loans?|debt)|tuition|pell grants?)\b/i, "college costs (→ edu_college_cost)", "edu_college_cost"],
  [/\b(?:public lands?|national parks?|wilderness|national monuments?)\b/i, "public lands (→ lands_preserve)", "lands_preserve"],
];
function subjectMiss(cand, text, key) {
  const P = BILL_KEY_PATTERNS[key];
  const pool = `${text} ${cand.catalog?.title || ""}`;
  // The key's own subject named without an instrument word ("Ukraine" with no aid word).
  const other = OTHER_SUBJECTS.find(([re, , own]) => own !== key && re.test(pool));
  const keys = cand.catalog?.issue_keys?.length ? `; catalog files it under ${cand.catalog.issue_keys.join(", ")}` : "";
  if (other) return `about ${other[1]}, not ${P.about}${keys}`;
  if (P.subject.test(pool)) return `names the subject but no ${P.subjectWords} words (aid, funding, a sale …) around the mention or in the title${keys}`;
  return `no ${P.subjectWords} words in the text around the mention${cand.catalog ? " or the official title" : " (and the bill is not in the catalog)"}${keys}`;
}

/**
 * Run every mapped key (default: all with a pattern) over a findBills() result.
 * → { mappings: [...], unmapped: [{ bill, id, kind, reason, matched, span }] }
 */
export function mapFound(found, { keys = MAPPED_KEYS, level = null } = {}) {
  const mappings = [];
  const unmapped = [];
  for (const cand of found.candidates) {
    const reasons = [];
    for (const k of keys) {
      const r = mapCandidate(cand, k, { level });
      if (r.mapped) mappings.push(r); else reasons.push(keys.length > 1 ? `${k}: ${r.reason}` : r.reason);
    }
    if (reasons.length === keys.length) {
      const m = cand.mentions[0];
      unmapped.push({ bill: cand.bill || cand.name || null, id: cand.id, kind: cand.kind, ...(cand.family ? { family: cand.family } : {}),
        matched: m.match, ...(m.congress_from ? { congress_from: m.congress_from } : {}), span: m.span.text, reason: reasons.join(" | "),
        ...(cand.resolves_to?.length ? { resolves_to: cand.resolves_to.map((r) => r.id) } : {}), ...(cand.unresolved ? { unresolved: cand.unresolved } : {}) });
    }
  }
  return { mappings, unmapped };
}
