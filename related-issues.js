/* ═══════════════════════════════════════════════════════════════════════════
   related-issues.js — the related-issues map  ·  window.PDXRelatedIssues
   ────────────────────────────────────────────────────────────────────────────
   Some issues share ground: a position on one bears on the other. Protect
   Public Lands sits with Keep Public Lands Public, Expand Domestic Energy
   Production, Cut Federal Red Tape and Local Land Control. A reader looking at
   one issue drawer at a time cannot see the person's position on the others.

   THE RULES IT KEEPS

   · CROSS-TOPIC PAIRS (v523). Fourteen pairs join topics where a stated
     position and a record often part ways, so "Where this conflicts" has
     them to check: public lands and housing supply (Keep Public Lands Public
     and Local Land Control with Build More Housing), housing and red tape
     (permitting, regulation), energy and prices (domestic production,
     energy independence, data-center power and climate action with the cost
     of living; production with economic growth), immigration and work (legal
     immigration and pathways to citizenship with workers and farms), and the
     border and spending (border enforcement with spending cuts). Each is an existing key
     on both sides, listed at the end of both keys' lists.

   · SURVEILLANCE PAIR (Nov 2026). Privacy & Big-Tech Accountability sits with
     Congressional Oversight: a Section 702 reauthorization (H.R. 7888, the
     Reforming Intelligence and Securing America Act) is mapped to both, so a
     FISA vote and a stated position on warrantless surveillance meet in one
     drawer. Existing keys on both sides, last in both lists, like the pairs
     above.

   · CIVIC RULES & SAFETY NET PAIRS (Nov 2026). Five keys joined the
     register with no position seeded yet, each paired both ways with the
     existing keys whose ground it shares: Redistricting & Gerrymandering
     with voting access, secure and accessible voting, Supreme Court reform
     and election integrity; Birthright Citizenship with mass deportations,
     pathways to citizenship, court orders on the executive and the
     border-plus-pathways lane; Medicaid & SNAP Work Requirements with
     healthcare access, rural hospitals, federal spending cuts and help for
     families with kids; Federal Reserve Independence with auditing the Fed,
     the cost of living, Congress as a check on the executive and sound
     money; Senate Filibuster with Congress as a check on the executive, the
     power of the purse, voting access and term limits. Each new key is last
     in the existing keys' lists and has its own list at the end of the map.

   · FAMILY & ECONOMIC FAIRNESS PAIRS (Nov 2026). Two keys joined the
     register with no position seeded yet, each paired both ways with the
     existing keys whose ground it shares: Wealth Inequality & Tax Fairness
     with federal spending and debt, the cost of living and pro-growth
     deregulation; Student Debt & College Access with the cost of living,
     healthcare access, college and trade costs, and wages and workers. Each
     new key is last in the existing keys' lists and has its own list at the
     end of the map.

   · ACCOUNTABILITY PAIRS (Nov 2026). Three keys joined the register with the
     accountability stances pass (db/accountability-stances-2026-11.json), each
     paired both ways with the existing keys whose ground it shares: Public
     Health vs. Chemical Company Liability with the cost of living, federal red
     tape and healthcare access; Epstein Files Transparency with Transparency &
     Anti-Corruption; No New Wars with Diplomacy & Restraint, Congress and War
     Powers and Peace Through Strength. Each new key is last in the existing
     keys' lists and has its own list at the end of the map.

   · TRIBAL CONSULTATION PAIRS (Nov 2026). Tribal Consultation & Rights joined
     the register with no position seeded and no bill mapped, paired both ways
     with the existing keys whose ground it shares: Protect Public Lands, Local
     Land Control, Faster Permits & Reviews and Whose Rule Governs: State or
     Federal. It is last in those keys' lists and has its own list at the end
     of the map.

   · ONE MAP. MAP below is the only place that decides what is related: issue
     key → the keys that share its ground. It is symmetric (if A lists B, B
     lists A) and names only keys in the issue register. Nothing is derived from
     keywords, categories or co-occurrence, and there is no second list.

   · ONE LINE, BOTH PARTS. Each related issue prints one line, always with
     two parts, stated first:
       Stated — the person's published position, from window._polPositionMap
         (the one stance map every drawer and both scoring lanes read). Only
         "support" and "oppose" count; mixed or no card reads
         "no stated position".
       Record — which way their votes run, from window._pdxRecordDirection (the
         shared record-direction index). A characterised one-way read reads
         "voting record runs with" / "voting record runs against". Votes on file with no
         one-way read (split, thin, poleless) read as the tally the issue's own
         drawer prints, in its words ("1 for · 1 against"), from the drawer
         ledger (PDXConsistency.drawerTally); a subject key whose drawer prints
         no for/against line gives its act count ("3 formal acts"). An office
         that casts no roll calls (the executive record) reads its formal acts
         the same way: the drawer's own tally of signed laws and orders on that
         issue ("0 for · 1 against"). No votes or acts on file reads "no record".
           Cut Income & Business Taxes: supports · voting record runs with
           Middle-Class Tax Relief: no stated position · 1 for · 1 against
           Local Land Control: opposes · no record
     An issue with no stated position and no votes is left out.
     Nothing left: no block, no heading, no empty state. The stated word takes
     the green / red position tint; the one-way record word takes the same
     green ("runs with") / red ("runs against"), and its fixed wording keeps
     it a voting-record reading, never a stated position. "no stated
     position", "no record" and the tally stay neutral. Every issue name takes
     its issue's chip colour (PDXIssueColors.styleFor → --pdx-ic-ink) and is
     led by its chip icon, inside the link.

   · NO VERDICT. No score, grade, percentage or "contradiction" badge. The only
     count is the drawer's own for · against tally on a no-direction record.

   · PERSON FILE. sectionHtml(pid, p): for every issue with a stated or record
     line, that issue's lines, then each related issue's lines. An issue with
     no related lines is left out. The list is collapsed so each issue prints
     once: an issue already on the list is not printed again, and the new
     related issues of an issue already printed join its block, right after
     it, instead of opening a repeat block. The drawer block is not collapsed.
     WORDS AND VOTES on a related line: each related line is a pair — the
     issue whose related list brought it in and the line itself — and that
     issue's drawer lists the same pair. When that drawer prints a "Words and
     votes" note for the pair, the line carries the very same note (same
     generator, rules, recency window and words), at most one per line. The
     section asks for the same publishable-vote feed the drawers do and is
     repainted in place only when its notes change. No note: byte-identical.

   · DRAWER. drawerHtml(pid, p, key): the lines of every issue related to
     `key`. The open issue itself is not repeated — the drawer's own header
     already carries it. consistency.js prints the block after the finding line
     and before the vote table.

   · EACH NAME IS A DOOR. Every issue name opens that issue's drawer for the
     same person, through the shared data-pdxc-gap route (an open drawer is
     swapped in place), with a /p/<pid>?issue=<key> href to fall back on. The
     open issue in a drawer is never a link.

   · WHERE THIS CONFLICTS. conflictsHtml(pid, p, key): for a reader with
     saved stances (window.PDXStanceSides, the one published reader of both
     stance stores), one short section after the drawer's related-issues block.
     The pairs are the open issue with each related issue the drawer already
     lists — MAP is read, never extended. A pair is listed when, on either of
     its two issues, the person's stated position or one-way record runs the
     other way from the reader's side. Each line names both issues, then the
     side that runs the other way — the stated word when that is the one, else
     the record — and the reader's own side:
       Protect Public Lands and Keep Public Lands Public: on Keep Public Lands
       Public they oppose; you support.
     A reader with stances and no such pair reads "No conflicts with your
     stances on these issues." A reader with no saved stances, a document
     with no stance reader on it, or an open issue with no listed related
     issue gets no section. It is a list of lines, not a score: no count, no
     percentage, no grade.

   · SHOW N MORE. In a drawer, more than four related-issues lines show the
     first four and a "Show N more" button at the bottom of the block; more
     than three conflicts lines show the first three the same way. The button
     opens the rest and, pressed again ("Show fewer"), closes them. The person
     file's section and the no-conflicts line never collapse.

   · TENSION FIRST, FAMILIES, RECORD ONLY (v590). The section, the drawer
     block and the profile's Key Issue Stances (profiles-full.js, through
     triage()) print their rows in three blocks: first, under "Where the
     record runs against the stated position", the issues whose stated
     position the record contradicts or is mixed on — Word vs Action's own
     Contradicted / Mixed verdict where it has one, else the line's own clash
     (stated support · record runs against, stated oppose · record runs with,
     or a stated position over a for-and-against tally); then the rest under
     topic-family headers (FAMILIES: sets of MAP keys, nothing added to MAP),
     with any key outside MAP under a final "Other"; last, inside a closed
     "Record only" <details>, the issues with formal acts and no stated
     position. The rows are the same rows in the same words; only order,
     grouping and the default collapse move. In the drawer, "Show N more"
     folds family lines past the first four shown; tension lines never fold.
     The heading is a grouping, not a badge: no score or percentage is
     printed.

   · IT READS, IT DOES NOT WRITE. Nothing here touches Direction Match, scores,
     effect lines, the vote table, or any other section. Labels come from the
     issue register (window.ISSUE_MAP), emoji stripped.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXRelatedIssues) return;

  // Issue key → related issue keys. Order here is print order.
  var MAP = {
    lands_preserve: ['lands_keep_public', 'energy_production', 'gov_regulation', 'lands_local', 'lands_balance', 'lands_energy', 'property_rights', 'permitting_reform', 'water', 'water_storage', 'datacenter_water', 'disaster_resilience', 'climate_action', 'tribal_consultation', 'mine_cleanup'],
    lands_keep_public: ['lands_preserve', 'energy_production', 'gov_regulation', 'lands_local', 'lands_balance', 'lands_energy', 'property_rights', 'permitting_reform', 'water', 'water_storage', 'datacenter_water', 'housing_build', 'mine_cleanup'],
    lands_local: ['lands_preserve', 'lands_keep_public', 'lands_balance', 'lands_energy', 'property_rights', 'disaster_resilience', 'climate_action', 'states_federal_power', 'state_standing', 'guard_authority', 'housing_build', 'tribal_consultation'],
    lands_balance: ['lands_preserve', 'lands_keep_public', 'lands_local', 'lands_energy', 'property_rights', 'disaster_resilience', 'climate_action'],
    lands_energy: ['lands_preserve', 'lands_keep_public', 'lands_local', 'lands_balance', 'property_rights', 'energy_production', 'permitting_reform', 'gov_regulation', 'enviro_energy', 'climate_action', 'enviro_balance', 'datacenter_power', 'mine_cleanup'],
    property_rights: ['lands_preserve', 'lands_keep_public', 'lands_local', 'lands_balance', 'lands_energy'],
    energy_production: ['lands_preserve', 'lands_keep_public', 'lands_energy', 'permitting_reform', 'gov_regulation', 'enviro_energy', 'climate_action', 'enviro_balance', 'datacenter_power', 'cost_living', 'econ_growth'],
    permitting_reform: ['lands_preserve', 'lands_keep_public', 'lands_energy', 'energy_production', 'gov_regulation', 'enviro_energy', 'climate_action', 'enviro_balance', 'datacenter_power', 'econ_growth', 'infrastructure', 'broadband', 'transit', 'water_storage', 'housing_build', 'tribal_consultation'],
    gov_regulation: ['lands_preserve', 'lands_keep_public', 'lands_energy', 'energy_production', 'permitting_reform', 'climate_action', 'enviro_balance', 'econ_growth', 'econ_smallbiz', 'econ_balance', 'econ_workers', 'econ_corp_account', 'lower_taxes', 'civil_service_control', 'gov_waste', 'housing_build', 'public_health_vs_chemical_liability'],
    water: ['water_storage', 'datacenter_water', 'lands_preserve', 'lands_keep_public', 'datacenter_growth', 'datacenter_power', 'tech_innovation', 'rural_ag', 'health_rural', 'broadband', 'mine_cleanup'],
    water_storage: ['water', 'datacenter_water', 'lands_preserve', 'lands_keep_public', 'rural_ag', 'health_rural', 'broadband', 'infrastructure', 'transit', 'permitting_reform'],
    datacenter_water: ['water', 'water_storage', 'lands_preserve', 'lands_keep_public', 'datacenter_growth', 'datacenter_power', 'tech_innovation'],
    disaster_resilience: ['lands_preserve', 'lands_balance', 'lands_local', 'climate_action'],
    climate_action: ['disaster_resilience', 'lands_preserve', 'lands_balance', 'lands_local', 'energy_production', 'enviro_energy', 'lands_energy', 'enviro_balance', 'datacenter_power', 'permitting_reform', 'gov_regulation', 'econ_growth', 'cost_living'],
    enviro_energy: ['energy_production', 'climate_action', 'lands_energy', 'enviro_balance', 'datacenter_power', 'permitting_reform', 'cost_living'],
    enviro_balance: ['energy_production', 'enviro_energy', 'climate_action', 'lands_energy', 'datacenter_power', 'permitting_reform', 'gov_regulation', 'econ_growth'],
    datacenter_power: ['energy_production', 'enviro_energy', 'climate_action', 'lands_energy', 'enviro_balance', 'permitting_reform', 'datacenter_growth', 'datacenter_water', 'tech_innovation', 'water', 'cost_living'],
    econ_growth: ['climate_action', 'enviro_balance', 'gov_regulation', 'permitting_reform', 'econ_smallbiz', 'econ_balance', 'econ_workers', 'econ_corp_account', 'lower_taxes', 'energy_production', 'wealth_inequality_tax_fairness'],
    datacenter_growth: ['datacenter_water', 'datacenter_power', 'tech_innovation', 'water', 'tech_balance', 'privacy_rights', 'crypto_cbdc'],
    tech_innovation: ['datacenter_growth', 'datacenter_water', 'datacenter_power', 'water', 'free_speech', 'privacy_rights', 'tech_balance', 'crypto_cbdc'],
    lower_taxes: ['tax_middle_class', 'prop_tax', 'property_tax', 'national_debt', 'gov_balance', 'gov_services', 'econ_growth', 'econ_smallbiz', 'econ_balance', 'econ_workers', 'econ_corp_account', 'gov_regulation'],
    tax_middle_class: ['lower_taxes', 'prop_tax', 'property_tax', 'national_debt', 'gov_balance', 'gov_services', 'child_care', 'paid_leave', 'family_support', 'cost_living', 'tariffs_prices', 'healthcare_costs', 'housing'],
    prop_tax: ['lower_taxes', 'tax_middle_class', 'property_tax', 'national_debt', 'gov_balance', 'gov_services', 'dev_district_finance', 'gov_transparency', 'housing_build', 'housing', 'housing_support', 'housing_first_time', 'homeless', 'cost_living'],
    property_tax: ['lower_taxes', 'tax_middle_class', 'prop_tax', 'national_debt', 'gov_balance', 'gov_services', 'dev_district_finance', 'gov_transparency', 'housing_build', 'housing', 'housing_support', 'housing_first_time', 'homeless', 'cost_living'],
    national_debt: ['lower_taxes', 'tax_middle_class', 'prop_tax', 'property_tax', 'gov_balance', 'gov_services', 'cut_spending', 'gov_waste', 'audit_spending', 'power_of_purse', 'social_security', 'healthcare', 'strong_defense', 'sound_money', 'crypto_cbdc'],
    gov_balance: ['lower_taxes', 'tax_middle_class', 'prop_tax', 'property_tax', 'national_debt', 'gov_services', 'cut_spending', 'gov_waste', 'audit_spending', 'power_of_purse', 'social_security', 'healthcare'],
    gov_services: ['lower_taxes', 'tax_middle_class', 'prop_tax', 'property_tax', 'national_debt', 'gov_balance', 'cut_spending', 'gov_waste', 'audit_spending', 'power_of_purse'],
    cut_spending: ['gov_waste', 'gov_balance', 'national_debt', 'audit_spending', 'gov_services', 'power_of_purse', 'social_security', 'healthcare', 'strong_defense', 'gov_transparency', 'border_security', 'wealth_inequality_tax_fairness', 'safety_net_work_requirements'],
    gov_waste: ['cut_spending', 'gov_balance', 'national_debt', 'audit_spending', 'gov_services', 'power_of_purse', 'gov_transparency', 'civil_service_control', 'gov_regulation'],
    audit_spending: ['cut_spending', 'gov_waste', 'gov_balance', 'national_debt', 'gov_services', 'power_of_purse', 'sound_money', 'crypto_cbdc', 'gov_transparency', 'fed_independence'],
    power_of_purse: ['cut_spending', 'gov_waste', 'gov_balance', 'national_debt', 'audit_spending', 'gov_services', 'checks_balances', 'war_powers', 'judicial_check', 'congress_oversight', 'tariffs_authority', 'civil_service_control', 'scotus_reform', 'senate_filibuster'],
    social_security: ['healthcare', 'national_debt', 'cut_spending', 'gov_balance'],
    healthcare: ['social_security', 'national_debt', 'cut_spending', 'gov_balance', 'healthcare_market', 'healthcare_costs', 'health_balance', 'health_drug_prices', 'health_rural', 'medical_freedom', 'health_mental', 'homeless', 'veterans', 'public_health_vs_chemical_liability', 'student_debt_college_access', 'safety_net_work_requirements'],
    strong_defense: ['cut_spending', 'national_debt', 'foreign_balance', 'restraint', 'america_first', 'america_first_fp', 'veterans', 'israel_support', 'iran_policy', 'ukraine_policy', 'yemen_policy', 'venezuela_policy', 'war_powers', 'no_new_wars'],
    sound_money: ['audit_spending', 'crypto_cbdc', 'national_debt', 'fed_independence'],
    crypto_cbdc: ['sound_money', 'audit_spending', 'national_debt', 'tech_innovation', 'tech_balance', 'privacy_rights', 'datacenter_growth'],
    border_security: ['deportations', 'immig_fentanyl', 'immig_balance', 'immig_legal', 'immigration_reform', 'cut_spending'],
    deportations: ['border_security', 'immig_fentanyl', 'immig_balance', 'immig_legal', 'immigration_reform', 'birthright_citizenship'],
    immig_fentanyl: ['border_security', 'deportations', 'immig_balance', 'immig_legal', 'immigration_reform', 'back_police', 'tough_on_crime', 'justice_balance', 'justice_reform', 'cannabis_reform'],
    immig_balance: ['border_security', 'deportations', 'immig_fentanyl', 'immig_legal', 'immigration_reform', 'birthright_citizenship'],
    immig_legal: ['border_security', 'deportations', 'immig_fentanyl', 'immig_balance', 'immigration_reform', 'econ_workers', 'rural_ag'],
    immigration_reform: ['border_security', 'deportations', 'immig_fentanyl', 'immig_balance', 'immig_legal', 'rural_ag', 'econ_workers', 'birthright_citizenship'],
    gun_rights: ['gun_balance', 'gun_safety'],
    gun_balance: ['gun_rights', 'gun_safety'],
    gun_safety: ['gun_rights', 'gun_balance'],
    school_choice: ['public_schools', 'edu_parental', 'edu_balance'],
    public_schools: ['school_choice', 'edu_parental', 'edu_balance', 'edu_college_cost'],
    edu_parental: ['school_choice', 'public_schools', 'edu_balance'],
    edu_balance: ['school_choice', 'public_schools', 'edu_parental', 'edu_college_cost'],
    edu_college_cost: ['public_schools', 'edu_balance', 'student_debt_college_access'],
    child_care: ['paid_leave', 'family_support', 'cost_living', 'tax_middle_class'],
    paid_leave: ['child_care', 'family_support', 'cost_living', 'tax_middle_class'],
    family_support: ['child_care', 'paid_leave', 'cost_living', 'tax_middle_class', 'safety_net_work_requirements'],
    cost_living: ['child_care', 'paid_leave', 'family_support', 'tax_middle_class', 'tariffs_china', 'tariffs_growth', 'tariffs_prices', 'tariffs_authority', 'econ_trade', 'rural_ag', 'housing', 'housing_build', 'housing_support', 'housing_first_time', 'homeless', 'property_tax', 'prop_tax', 'healthcare_costs', 'energy_production', 'enviro_energy', 'datacenter_power', 'climate_action', 'public_health_vs_chemical_liability', 'wealth_inequality_tax_fairness', 'student_debt_college_access', 'fed_independence'],
    healthcare_market: ['healthcare', 'healthcare_costs', 'health_balance', 'health_drug_prices', 'health_rural', 'medical_freedom'],
    healthcare_costs: ['healthcare', 'healthcare_market', 'health_balance', 'health_drug_prices', 'health_rural', 'medical_freedom', 'cost_living', 'tariffs_prices', 'housing', 'tax_middle_class'],
    health_balance: ['healthcare', 'healthcare_market', 'healthcare_costs', 'health_drug_prices', 'health_rural', 'medical_freedom'],
    health_drug_prices: ['healthcare', 'healthcare_market', 'healthcare_costs', 'health_balance', 'health_rural', 'medical_freedom'],
    health_rural: ['healthcare', 'healthcare_market', 'healthcare_costs', 'health_balance', 'health_drug_prices', 'medical_freedom', 'rural_ag', 'broadband', 'water', 'water_storage', 'safety_net_work_requirements'],
    medical_freedom: ['healthcare', 'healthcare_market', 'healthcare_costs', 'health_balance', 'health_drug_prices', 'health_rural', 'tobacco_nicotine', 'cannabis_reform'],
    health_mental: ['healthcare', 'homeless', 'veterans'],
    homeless: ['health_mental', 'healthcare', 'veterans', 'housing', 'housing_build', 'housing_support', 'housing_first_time', 'cost_living', 'property_tax', 'prop_tax'],
    veterans: ['health_mental', 'healthcare', 'homeless', 'strong_defense', 'foreign_balance', 'restraint', 'america_first', 'america_first_fp'],
    tobacco_nicotine: ['medical_freedom', 'cannabis_reform'],
    cannabis_reform: ['tobacco_nicotine', 'medical_freedom', 'back_police', 'tough_on_crime', 'justice_balance', 'justice_reform', 'immig_fentanyl'],
    rural_ag: ['health_rural', 'broadband', 'water', 'water_storage', 'tariffs_china', 'tariffs_growth', 'tariffs_prices', 'tariffs_authority', 'econ_trade', 'cost_living', 'immig_legal', 'immigration_reform'],
    broadband: ['rural_ag', 'health_rural', 'water', 'water_storage', 'infrastructure', 'transit', 'permitting_reform'],
    tariffs_china: ['tariffs_growth', 'tariffs_prices', 'tariffs_authority', 'econ_trade', 'cost_living', 'rural_ag'],
    tariffs_growth: ['tariffs_china', 'tariffs_prices', 'tariffs_authority', 'econ_trade', 'cost_living', 'rural_ag'],
    tariffs_prices: ['tariffs_china', 'tariffs_growth', 'tariffs_authority', 'econ_trade', 'cost_living', 'rural_ag', 'healthcare_costs', 'housing', 'tax_middle_class'],
    tariffs_authority: ['tariffs_china', 'tariffs_growth', 'tariffs_prices', 'econ_trade', 'cost_living', 'rural_ag', 'checks_balances', 'war_powers', 'judicial_check', 'power_of_purse', 'congress_oversight', 'civil_service_control', 'scotus_reform'],
    econ_trade: ['tariffs_china', 'tariffs_growth', 'tariffs_prices', 'tariffs_authority', 'cost_living', 'rural_ag'],
    econ_smallbiz: ['econ_growth', 'econ_balance', 'econ_workers', 'econ_corp_account', 'gov_regulation', 'lower_taxes'],
    econ_balance: ['econ_growth', 'econ_smallbiz', 'econ_workers', 'econ_corp_account', 'gov_regulation', 'lower_taxes'],
    econ_workers: ['econ_growth', 'econ_smallbiz', 'econ_balance', 'econ_corp_account', 'gov_regulation', 'lower_taxes', 'immig_legal', 'immigration_reform', 'student_debt_college_access'],
    econ_corp_account: ['econ_growth', 'econ_smallbiz', 'econ_balance', 'econ_workers', 'gov_regulation', 'lower_taxes'],
    dev_district_finance: ['prop_tax', 'property_tax', 'gov_transparency', 'housing_build'],
    gov_transparency: ['dev_district_finance', 'prop_tax', 'property_tax', 'housing_build', 'term_limits', 'campaign_finance', 'stock_trading_ban', 'reform_balance', 'congress_oversight', 'audit_spending', 'gov_waste', 'cut_spending', 'epstein_files_transparency'],
    housing_build: ['dev_district_finance', 'prop_tax', 'property_tax', 'gov_transparency', 'housing', 'housing_support', 'housing_first_time', 'homeless', 'cost_living', 'lands_keep_public', 'lands_local', 'permitting_reform', 'gov_regulation'],
    infrastructure: ['broadband', 'transit', 'permitting_reform', 'water_storage'],
    transit: ['infrastructure', 'broadband', 'permitting_reform', 'water_storage'],
    housing: ['housing_build', 'housing_support', 'housing_first_time', 'homeless', 'cost_living', 'property_tax', 'prop_tax', 'tariffs_prices', 'healthcare_costs', 'tax_middle_class'],
    housing_support: ['housing', 'housing_build', 'housing_first_time', 'homeless', 'cost_living', 'property_tax', 'prop_tax'],
    housing_first_time: ['housing', 'housing_build', 'housing_support', 'homeless', 'cost_living', 'property_tax', 'prop_tax'],
    back_police: ['tough_on_crime', 'justice_balance', 'justice_reform', 'cannabis_reform', 'immig_fentanyl'],
    tough_on_crime: ['back_police', 'justice_balance', 'justice_reform', 'cannabis_reform', 'immig_fentanyl'],
    justice_balance: ['back_police', 'tough_on_crime', 'justice_reform', 'cannabis_reform', 'immig_fentanyl'],
    justice_reform: ['back_police', 'tough_on_crime', 'justice_balance', 'cannabis_reform', 'immig_fentanyl'],
    pro_life: ['repro_balance', 'pro_choice'],
    repro_balance: ['pro_life', 'pro_choice'],
    pro_choice: ['pro_life', 'repro_balance'],
    religious_liberty: ['rights_balance', 'lgbtq_rights', 'free_speech', 'end_dei'],
    rights_balance: ['religious_liberty', 'lgbtq_rights', 'free_speech', 'end_dei'],
    lgbtq_rights: ['religious_liberty', 'rights_balance', 'free_speech', 'end_dei'],
    free_speech: ['religious_liberty', 'rights_balance', 'lgbtq_rights', 'end_dei', 'privacy_rights', 'tech_innovation', 'tech_balance'],
    end_dei: ['religious_liberty', 'rights_balance', 'lgbtq_rights', 'free_speech'],
    privacy_rights: ['free_speech', 'tech_innovation', 'tech_balance', 'crypto_cbdc', 'datacenter_growth', 'congress_oversight'],
    tech_balance: ['free_speech', 'privacy_rights', 'tech_innovation', 'crypto_cbdc', 'datacenter_growth'],
    foreign_balance: ['strong_defense', 'restraint', 'america_first', 'america_first_fp', 'veterans'],
    restraint: ['strong_defense', 'foreign_balance', 'america_first', 'america_first_fp', 'veterans', 'israel_support', 'iran_policy', 'ukraine_policy', 'yemen_policy', 'venezuela_policy', 'war_powers', 'no_new_wars'],
    america_first: ['strong_defense', 'foreign_balance', 'restraint', 'america_first_fp', 'veterans'],
    america_first_fp: ['strong_defense', 'foreign_balance', 'restraint', 'america_first', 'veterans', 'israel_support', 'iran_policy', 'ukraine_policy', 'yemen_policy', 'venezuela_policy', 'war_powers'],
    israel_support: ['iran_policy', 'ukraine_policy', 'yemen_policy', 'venezuela_policy', 'restraint', 'strong_defense', 'america_first_fp', 'war_powers'],
    iran_policy: ['israel_support', 'ukraine_policy', 'yemen_policy', 'venezuela_policy', 'restraint', 'strong_defense', 'america_first_fp', 'war_powers'],
    ukraine_policy: ['israel_support', 'iran_policy', 'yemen_policy', 'venezuela_policy', 'restraint', 'strong_defense', 'america_first_fp', 'war_powers'],
    yemen_policy: ['israel_support', 'iran_policy', 'ukraine_policy', 'venezuela_policy', 'restraint', 'strong_defense', 'america_first_fp', 'war_powers'],
    venezuela_policy: ['israel_support', 'iran_policy', 'ukraine_policy', 'yemen_policy', 'restraint', 'strong_defense', 'america_first_fp', 'war_powers'],
    war_powers: ['israel_support', 'iran_policy', 'ukraine_policy', 'yemen_policy', 'venezuela_policy', 'restraint', 'strong_defense', 'america_first_fp', 'checks_balances', 'judicial_check', 'power_of_purse', 'congress_oversight', 'tariffs_authority', 'civil_service_control', 'scotus_reform', 'guard_authority', 'no_new_wars'],
    election_security: ['election_integrity', 'voter_id', 'democracy_balance', 'voting_access'],
    election_integrity: ['election_security', 'voter_id', 'democracy_balance', 'voting_access', 'redistricting_gerrymandering'],
    voter_id: ['election_security', 'election_integrity', 'democracy_balance', 'voting_access'],
    democracy_balance: ['election_security', 'election_integrity', 'voter_id', 'voting_access', 'redistricting_gerrymandering'],
    voting_access: ['election_security', 'election_integrity', 'voter_id', 'democracy_balance', 'redistricting_gerrymandering', 'senate_filibuster'],
    term_limits: ['gov_transparency', 'campaign_finance', 'stock_trading_ban', 'reform_balance', 'congress_oversight', 'senate_filibuster'],
    campaign_finance: ['term_limits', 'gov_transparency', 'stock_trading_ban', 'reform_balance', 'congress_oversight'],
    stock_trading_ban: ['term_limits', 'gov_transparency', 'campaign_finance', 'reform_balance', 'congress_oversight'],
    reform_balance: ['term_limits', 'gov_transparency', 'campaign_finance', 'stock_trading_ban', 'congress_oversight'],
    congress_oversight: ['term_limits', 'gov_transparency', 'campaign_finance', 'stock_trading_ban', 'reform_balance', 'checks_balances', 'war_powers', 'judicial_check', 'power_of_purse', 'tariffs_authority', 'civil_service_control', 'scotus_reform', 'privacy_rights'],
    checks_balances: ['war_powers', 'judicial_check', 'power_of_purse', 'congress_oversight', 'tariffs_authority', 'civil_service_control', 'scotus_reform', 'guard_authority', 'fed_independence', 'senate_filibuster'],
    judicial_check: ['checks_balances', 'war_powers', 'power_of_purse', 'congress_oversight', 'tariffs_authority', 'civil_service_control', 'scotus_reform', 'birthright_citizenship'],
    civil_service_control: ['checks_balances', 'war_powers', 'judicial_check', 'power_of_purse', 'congress_oversight', 'tariffs_authority', 'scotus_reform', 'gov_waste', 'gov_regulation'],
    scotus_reform: ['checks_balances', 'war_powers', 'judicial_check', 'power_of_purse', 'congress_oversight', 'tariffs_authority', 'civil_service_control', 'redistricting_gerrymandering'],
    states_federal_power: ['state_standing', 'guard_authority', 'lands_local', 'tribal_consultation'],
    state_standing: ['states_federal_power', 'guard_authority', 'lands_local'],
    guard_authority: ['states_federal_power', 'state_standing', 'lands_local', 'war_powers', 'checks_balances'],
    public_health_vs_chemical_liability: ['cost_living', 'gov_regulation', 'healthcare'],
    epstein_files_transparency: ['gov_transparency'],
    no_new_wars: ['restraint', 'war_powers', 'strong_defense'],
    wealth_inequality_tax_fairness: ['cut_spending', 'cost_living', 'econ_growth'],
    student_debt_college_access: ['cost_living', 'healthcare', 'edu_college_cost', 'econ_workers'],
    redistricting_gerrymandering: ['voting_access', 'democracy_balance', 'scotus_reform', 'election_integrity'],
    birthright_citizenship: ['deportations', 'immigration_reform', 'judicial_check', 'immig_balance'],
    safety_net_work_requirements: ['healthcare', 'health_rural', 'cut_spending', 'family_support'],
    fed_independence: ['audit_spending', 'cost_living', 'checks_balances', 'sound_money'],
    senate_filibuster: ['checks_balances', 'power_of_purse', 'voting_access', 'term_limits'],
    tribal_consultation: ['lands_preserve', 'lands_local', 'permitting_reform', 'states_federal_power'],
    mine_cleanup: ['lands_energy', 'lands_preserve', 'lands_keep_public', 'water']
  };

  var WORD = { support: 'supports', oppose: 'opposes' };
  var REC_WORD = { 'with': 'voting record runs with', against: 'voting record runs against' };
  var NO_STATED = 'no stated position';
  var NO_RECORD = 'no record';

  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }

  function labelOf(key) {
    try {
      var e = window.ISSUE_MAP && window.ISSUE_MAP[key];
      var l = e && e.label ? String(e.label).replace(/^[^A-Za-z0-9]+/, '').trim() : '';
      if (l) return l;
    } catch (e2) { /* fall through */ }
    return String(key);
  }

  // The issue's own icon — the emoji the register label leads with, the same
  // one its chips print. '' when the label carries none.
  function iconOf(key) {
    try {
      var e = window.ISSUE_MAP && window.ISSUE_MAP[key];
      var m = e && e.label ? /^([^A-Za-z0-9]+)/.exec(String(e.label)) : null;
      return m ? m[1].trim() : '';
    } catch (e2) { return ''; }
  }

  function related(key) {
    return Object.prototype.hasOwnProperty.call(MAP, key) ? MAP[key].slice() : [];
  }

  function positionMap(pid, p) {
    try {
      if (typeof window._polPositionMap !== 'function') return {};
      return window._polPositionMap(pid, p) || {};
    } catch (e) { return {}; }
  }

  // 'support' | 'oppose' | null. Anything else is not a published direction.
  function directionOf(pm, key) {
    var e = pm && Object.prototype.hasOwnProperty.call(pm, key) ? pm[key] : null;
    var s = e ? String(e.stance || '').toLowerCase().trim() : '';
    return (s === 'support' || s === 'oppose') ? s : null;
  }

  // 'with' | 'against' | null — the way the person's votes on `key` run,
  // read from the shared record-direction index (window._pdxRecordDirection),
  // the same reading the drawer's own record line and the decision surfaces
  // print. Only a characterised one-way read counts: a split, a thin read, a
  // poleless subject or a record that is not loaded yet gives no line.
  function recordRead(pid, key) {
    try {
      if (!pid || typeof window._pdxRecordDirection !== 'function') return null;
      return window._pdxRecordDirection(pid, key, { label: labelOf(key) }) || null;
    } catch (e) { return null; }
  }
  function recordOf(pid, key, idx) {
    idx = idx === undefined ? recordRead(pid, key) : idx;
    if (!idx || !idx.characterised) return null;
    return idx.lead === 'advances' ? 'with' : (idx.lead === 'opposes' ? 'against' : null);
  }
  // Any vote on file for this key, whichever way (or no way) it ran.
  function hasVotes(idx) { return !!(idx && (idx.total || 0) > 0); }

  // An office that casts no roll calls (the executive record, PDXExecRecord):
  // its record is the formal acts the issue's own drawer counts — signed laws,
  // orders, proclamations — read from the same drawer ledger, in the drawer's
  // own words ("0 for · 1 against"). '' for anyone who casts votes, or when the
  // drawer holds nothing for this key, so a legislator's line never changes.
  function execActsTally(pid, key) {
    try {
      var E = window.PDXExecRecord;
      if (!pid || !E || typeof E.eligible !== 'function' || !E.eligible(pid)) return '';
    } catch (e) { return ''; }
    return tallyText(pid, key);
  }

  // The drawer's own tally, worded as the drawer words it: "1 for · 1 against"
  // (plus "· N took no side" when the drawer prints it). A subject key whose
  // drawer has no for/against line gives "N formal acts". '' when the drawer
  // ledger is not loaded or holds nothing for this key.
  function tallyText(pid, key) {
    try {
      var LG = window.PDXConsistency;
      if (!pid || !LG || typeof LG.drawerTally !== 'function') return '';
      var t = LG.drawerTally(pid, key);
      if (!t || !t.acts) return '';
      if (t.noSide) return t.acts + ' formal ' + (t.acts === 1 ? 'act' : 'acts');
      return t.advances + ' for · ' + t.opposes + ' against' +
        (t.tookNoSide ? ' · ' + t.tookNoSide + ' took no side' : '');
    } catch (e) { return ''; }
  }

  function indexTally(idx) {
    if (!idx) return '';
    var a = idx.advances || 0, o = idx.opposes || 0;
    if (a || o) return a + ' for · ' + o + ' against';
    var n = idx.total || 0;
    return n ? n + ' ' + (n === 1 ? 'vote' : 'votes') + ' on file' : '';
  }

  // The issue-chip colour token (issue-colors.js): the chip's inline custom
  // properties plus the token's text ink, set as `color` directly so the name
  // is in its issue colour before (or without) any stylesheet. '' where that
  // module is not loaded.
  function inkOf(key) {
    try {
      var C = window.PDXIssueColors;
      var t = C && typeof C.getIssueColor === 'function' ? C.getIssueColor(key) : null;
      return t && t.ink ? String(t.ink) : '';
    } catch (e) { return ''; }
  }
  function colorStyle(key) {
    try {
      var C = window.PDXIssueColors, ink = inkOf(key);
      if (C && typeof C.styleFor === 'function') return (C.styleFor(key) || '') + (ink ? 'color:' + ink + ';' : '');
    } catch (e) { /* uncoloured */ }
    return '';
  }

  // One issue: its stated direction, its record direction, and whether any
  // vote is on file. A votes-only issue (no stance, no one-way read) still
  // counts; its record part is the drawer tally.
  // null when there is none of the three.
  function itemOf(pid, pm, key) {
    var idx = recordRead(pid, key);
    var d = directionOf(pm, key), r = recordOf(pid, key, idx), v = hasVotes(idx);
    var acts = (!r && !v) ? execActsTally(pid, key) : '';
    if (acts) v = true;
    if (!d && !r && !v) return null;
    var bare = !d && !r;
    // Votes with no one-way read: the drawer's tally; if the ledger is not
    // loaded, the index's own count of the same votes, in the same words.
    var tally = (!r && v) ? (acts || tallyText(pid, key) || indexTally(idx)) : '';
    return { key: key, label: labelOf(key), icon: iconOf(key),
      dir: d, word: d ? WORD[d] : '',
      rec: r, recWord: r ? REC_WORD[r] : '',
      votes: v, bare: bare, tally: tally };
  }

  // The related issues of `key` this person has a stated direction or a
  // record direction on.
  function itemsFor(pid, p, key, pm) {
    pm = pm || positionMap(pid, p);
    // One line per issue: a key is never listed twice, and the open issue is
    // never listed in its own block.
    var out = [], seen = {};
    seen[key] = 1;
    related(key).forEach(function (k) {
      if (seen[k]) return;
      seen[k] = 1;
      var it = itemOf(pid, pm, k); if (it) out.push(it);
    });
    return out;
  }

  // Person file: every issue with a stated or record direction and at least
  // one related issue with one, in map order — collapsed so each issue is
  // printed once. Walking the map in order, an issue's related issues that
  // are already on the list are not printed again. When the issue itself is
  // not on the list yet, it leads a new block; when it is already printed
  // (as a lead or as a related line), its new related issues join that same
  // block, right after it, instead of opening a repeat block under the same
  // name. An issue whose related issues are all printed adds nothing. Because
  // the map is symmetric, every issue with a line and a related line still
  // appears exactly once, and every related line sits in the block of an issue
  // the map relates it to (its lead, or the line it follows).
  function groupsFor(pid, p) { return groupsVia(pid, p).groups; }
  // The same walk, also naming for each related line the issue whose related
  // list brought it in (`via`): the lead of its block, or the printed line it
  // follows. That issue's drawer is the one that lists the pair.
  function groupsVia(pid, p) {
    var pm = positionMap(pid, p);
    var out = [], blockOf = {}, via = {};
    Object.keys(MAP).forEach(function (k) {
      var anchor = itemOf(pid, pm, k);
      if (!anchor) return;
      var items = itemsFor(pid, p, k, pm).filter(function (it) { return !blockOf[it.key]; });
      if (!items.length) return;
      var g = blockOf[k];
      if (!g) {
        g = { issue: anchor, related: [] };
        out.push(g);
        blockOf[k] = g;
        g.related = g.related.concat(items);
      } else {
        // After the printed line of k (the top of the block when k leads it).
        var at = 0;
        for (var i = 0; i < g.related.length; i++) if (g.related[i].key === k) { at = i + 1; break; }
        Array.prototype.splice.apply(g.related, [at, 0].concat(items));
      }
      items.forEach(function (it) { blockOf[it.key] = g; via[it.key] = k; });
    });
    return { groups: out, via: via };
  }

  // The two parts of one issue's line, stated first.
  function statedPart(it) { return it.dir ? it.word : NO_STATED; }
  function recordPart(it) { return it.rec ? it.recWord : (it.tally || NO_RECORD); }
  // The printed line for one issue:
  // "Label: supports · voting record runs with", "Label: no stated position · 1 for · 1 against".
  function lineTexts(it) {
    return [it.label + ': ' + statedPart(it) + ' · ' + recordPart(it)];
  }
  function lineText(it) { return lineTexts(it).join(' / '); }

  function issueHref(pid, key) {
    try {
      var P = window.PDXPerson;
      if (P && typeof P.cardPath === 'function') { var h = P.cardPath(pid, key); if (h) return h; }
    } catch (e) { /* plain address below */ }
    return '/p/' + encodeURIComponent(pid) + '?issue=' + encodeURIComponent(key);
  }

  // One issue name: a door into that issue's drawer for this person, except
  // the issue already open, which stays plain text.
  // The name carries its issue's chip colour.
  function nameHtml(pid, it, openKey, colon) {
    var c = colon === false ? '' : ':';
    var st = colorStyle(it.key);
    var open = '<span class="pdxri-issue" data-pdxri-color="' + esc(it.key) + '"' + (st ? ' style="' + esc(st) + '"' : '') + '>';
    // The icon sits inside the link, so the name stays one tap.
    var ico = it.icon ? '<span class="pdxri-ico" aria-hidden="true">' + esc(it.icon) + '</span> ' : '';
    if (!pid || it.key === openKey) return open + ico + esc(it.label) + c + '</span>';
    var ink = inkOf(it.key);
    return open + '<a class="pdxri-go" href="' + esc(issueHref(pid, it.key)) + '"' +
      (ink ? ' style="' + esc('color:' + ink + ';') + '"' : '') +
      ' data-pdxri-go="' + esc(it.key) + '" data-pdxc-gap="' + esc(it.key) + '" data-pdxc-gap-pid="' + esc(pid) + '"' +
      ' aria-label="' + esc('Open ' + it.label + ' for this file') + '">' + ico + esc(it.label) + '</a>' + c + '</span>';
  }

  // One line for one issue, both parts. The stated part carries the green /
  // red position word or a neutral "no stated position"; the record part the
  // green / red one-way word, the plain tally, or a neutral "no record".
  function linesHtml(pid, it, openKey, cls, tag, more) {
    var dirCls = it.dir ? 's-' + it.dir : 's-none';
    var recKind = it.rec ? it.rec : (it.tally ? 'tally' : 'none');
    var recHtml = it.rec
      ? '<span class="pdxri-rec r-' + it.rec + '">' + it.recWord + '</span>'
      : (it.tally ? '<span class="pdxri-tally">' + esc(it.tally) + '</span>'
        : '<span class="pdxri-rec r-none">' + NO_RECORD + '</span>');
    return '<' + tag + ' class="' + cls + '" data-pdxri-key="' + esc(it.key) + '" data-pdxri-line="both"' +
      ' data-pdxri-dir="' + (it.dir || 'none') + '" data-pdxri-rec="' + recKind + '"' + (more || '') + '>' +
      nameHtml(pid, it, openKey) + ' <span class="pdxri-dir ' + dirCls + '">' + statedPart(it) + '</span>' +
      '<span class="pdxri-sep"> · </span>' + recHtml + '</' + tag + '>';
  }

  // ── TENSION FIRST · TOPIC FAMILIES · RECORD ONLY ──────────────────────────
  // The person-file section, the drawer block and the profile's Key Issue
  // Stances all arrange their rows the same way. Nothing here changes a row:
  // the same lines (and cards) are printed in the same words, only the order,
  // the grouping and what starts collapsed move.
  //
  //   1. TENSION. A row with a stated position whose formal record runs against
  //      it (contradicted) or is mixed leads, under TENSION_HD. The read is Word
  //      vs Action's own verdict for the issue where it has one (its
  //      Contradicted and Mixed buckets, unchanged cutoffs), and otherwise the
  //      line's own two parts: a stated support with a record that runs
  //      against, a stated oppose with a record that runs with, or a stated
  //      position over a tally that went both ways. No rows like that: no
  //      block, no heading.
  //   2. FAMILIES. Every other row with a stated position sits under its topic
  //      family's header, in FAMILIES order. A family is a set of keys of MAP,
  //      read from MAP's own blocks — no key is added to MAP or the register by
  //      it. A row whose key is not in MAP goes to a final "Other".
  //   3. RECORD ONLY. A row with formal acts and no stated position sits behind
  //      a closed disclosure, RECORD_ONLY_HD. Opening it shows the very same
  //      rows. The open state is the browser's own <details>, not stored.
  var TENSION_HD = 'Where the record runs against the stated position';
  var RECORD_ONLY_HD = 'Record only';
  var OTHER_FAMILY = { id: 'other', label: 'Other', icon: '🎯', keys: [] };
  var FAMILIES = [
    { id: 'taxes_gov', label: 'Taxes & Government', icon: '💰', keys: ['lower_taxes', 'tax_middle_class', 'prop_tax', 'property_tax', 'national_debt', 'gov_balance', 'gov_services', 'cut_spending', 'gov_waste', 'audit_spending', 'power_of_purse', 'sound_money', 'crypto_cbdc', 'fed_independence', 'gov_regulation', 'dev_district_finance', 'wealth_inequality_tax_fairness'] },
    { id: 'econ_jobs', label: 'Economy & Jobs', icon: '📈', keys: ['econ_growth', 'econ_smallbiz', 'econ_balance', 'econ_workers', 'econ_corp_account', 'econ_trade', 'tariffs_china', 'tariffs_growth', 'tariffs_prices', 'tariffs_authority', 'rural_ag', 'cost_living'] },
    { id: 'family_work', label: 'Family & Work', icon: '🧸', keys: ['child_care', 'paid_leave', 'family_support', 'safety_net_work_requirements'] },
    { id: 'housing_infra', label: 'Housing & Infrastructure', icon: '🏠', keys: ['housing', 'housing_build', 'housing_support', 'housing_first_time', 'homeless', 'infrastructure', 'transit', 'broadband'] },
    { id: 'energy', label: 'Energy', icon: '⚡', keys: ['energy_production', 'enviro_energy', 'enviro_balance', 'climate_action', 'datacenter_power', 'permitting_reform'] },
    { id: 'lands_water', label: 'Public Lands & Water', icon: '🏔', keys: ['lands_preserve', 'lands_keep_public', 'lands_local', 'lands_balance', 'lands_energy', 'property_rights', 'water', 'water_storage', 'datacenter_water', 'disaster_resilience', 'tribal_consultation', 'mine_cleanup'] },
    { id: 'tech', label: 'Technology & Privacy', icon: '🚀', keys: ['tech_innovation', 'tech_balance', 'datacenter_growth', 'privacy_rights'] },
    { id: 'immigration', label: 'Immigration & Border', icon: '🛡', keys: ['border_security', 'deportations', 'immig_fentanyl', 'immig_balance', 'immig_legal', 'immigration_reform', 'birthright_citizenship'] },
    { id: 'health', label: 'Healthcare', icon: '🏥', keys: ['healthcare', 'healthcare_market', 'healthcare_costs', 'health_balance', 'health_drug_prices', 'health_rural', 'medical_freedom', 'health_mental', 'social_security', 'tobacco_nicotine', 'public_health_vs_chemical_liability'] },
    { id: 'justice', label: 'Crime & Justice', icon: '👮', keys: ['back_police', 'tough_on_crime', 'justice_balance', 'justice_reform', 'cannabis_reform'] },
    { id: 'guns', label: 'Gun Policy', icon: '🔫', keys: ['gun_rights', 'gun_balance', 'gun_safety'] },
    { id: 'education', label: 'Education', icon: '🎓', keys: ['school_choice', 'public_schools', 'edu_parental', 'edu_balance', 'edu_college_cost', 'student_debt_college_access'] },
    { id: 'repro', label: 'Abortion & Reproductive Rights', icon: '🕊', keys: ['pro_life', 'repro_balance', 'pro_choice'] },
    { id: 'rights', label: 'Civil Rights & Speech', icon: '🗽', keys: ['religious_liberty', 'rights_balance', 'lgbtq_rights', 'free_speech', 'end_dei'] },
    { id: 'foreign', label: 'Foreign Policy & Defense', icon: '🦅', keys: ['strong_defense', 'foreign_balance', 'restraint', 'america_first', 'america_first_fp', 'israel_support', 'iran_policy', 'ukraine_policy', 'yemen_policy', 'venezuela_policy', 'war_powers', 'no_new_wars', 'veterans'] },
    { id: 'elections', label: 'Elections & Democracy', icon: '🗳', keys: ['election_security', 'election_integrity', 'voter_id', 'democracy_balance', 'voting_access', 'redistricting_gerrymandering', 'senate_filibuster'] },
    { id: 'reform', label: 'Government Reform & Checks', icon: '⚖️', keys: ['term_limits', 'campaign_finance', 'stock_trading_ban', 'reform_balance', 'congress_oversight', 'gov_transparency', 'epstein_files_transparency', 'checks_balances', 'judicial_check', 'civil_service_control', 'scotus_reform', 'states_federal_power', 'state_standing', 'guard_authority'] }
  ];
  var FAMILY_OF = {};
  FAMILIES.forEach(function (f) { f.keys.forEach(function (k) { if (MAP.hasOwnProperty(k) && !FAMILY_OF[k]) FAMILY_OF[k] = f; }); });
  function familyOf(key) {
    return (key && Object.prototype.hasOwnProperty.call(FAMILY_OF, key)) ? FAMILY_OF[key] : OTHER_FAMILY;
  }

  // Word vs Action's filed verdict per issue for this person — key → token —
  // read from its published buckets, or null when that read is not loaded yet.
  function wvaTokens(pid) {
    try {
      var W = window.PDXWordAction;
      if (!pid || !W || typeof W.outcomeBuckets !== 'function') return null;
      var b = W.outcomeBuckets(pid);
      if (!b || !b.buckets) return null;
      var out = {};
      ['contradicts', 'mixed', 'consistent'].forEach(function (t) {
        (b.buckets[t] || []).forEach(function (r) { if (r && r.key && !out[r.key]) out[r.key] = t; });
      });
      return out;
    } catch (e) { return null; }
  }

  // 'contradicts' | 'mixed' | null for one row. opts: { stated, dir, item,
  // tokens }. A row with no stated position is never a tension row: there is
  // nothing for the record to run against.
  function tensionOf(pid, key, opts) {
    opts = opts || {};
    var dir = opts.dir || null, it = opts.item || null;
    var stated = opts.stated != null ? !!opts.stated : !!dir;
    if (!stated || !key) return null;
    var t = opts.tokens !== undefined ? opts.tokens : wvaTokens(pid);
    var w = t && Object.prototype.hasOwnProperty.call(t, key) ? t[key] : null;
    if (w === 'contradicts' || w === 'mixed') return w;
    if (!dir || !it) return null;
    if (it.rec && ((dir === 'support' && it.rec === 'against') || (dir === 'oppose' && it.rec === 'with'))) return 'contradicts';
    if (!it.rec && it.tally) {
      var m = /^(\d+) for · (\d+) against/.exec(it.tally);
      if (m && +m[1] > 0 && +m[2] > 0) return 'mixed';
    }
    return null;
  }

  // Sort rows into the three blocks. entries: [{ key, stated, tension,
  // recordOnly, value }] in print order; order inside every block is kept.
  // → { tension: [entry], families: [{ family, entries }], recordOnly: [entry] }
  function triage(entries) {
    var out = { tension: [], families: [], recordOnly: [] }, byFam = {};
    (entries || []).forEach(function (e) {
      if (!e) return;
      if (e.tension) { out.tension.push(e); return; }
      if (e.recordOnly) { out.recordOnly.push(e); return; }
      var f = familyOf(e.key);
      (byFam[f.id] = byFam[f.id] || []).push(e);
    });
    FAMILIES.concat([OTHER_FAMILY]).forEach(function (f) {
      if (byFam[f.id]) out.families.push({ family: f, entries: byFam[f.id] });
    });
    return out;
  }
  // One related-issues line as a triage entry.
  function lineEntry(pid, it, tokens) {
    return { key: it.key, stated: !!it.dir, value: it,
      tension: tensionOf(pid, it.key, { dir: it.dir, item: it, tokens: tokens }),
      recordOnly: !it.dir && !!(it.votes || it.rec) };
  }
  function roSummary(n) {
    return '<summary class="pdxri-ro-s">' + RECORD_ONLY_HD + ' <span class="pdxri-ro-n">' + n + '</span></summary>';
  }

  // The person-file section, or '' when no issue has a related line.
  // Blocks (an issue and the related lines it brought in) are printed whole and
  // unchanged; only where a block sits moves. A block with any tension line
  // leads, under TENSION_HD; a block with no stated position on any line sits in
  // the closed Record only disclosure; every other block sits under the family
  // of the issue that leads it.
  function sectionHtml(pid, p) {
    var gv = groupsVia(pid, p), groups = gv.groups;
    if (!groups.length) return '';
    var notes = sectionNotes(pid, p, gv.via);
    armSection(pid, p);
    var tokens = wvaTokens(pid);
    var entries = groups.map(function (g) {
      var all = [g.issue].concat(g.related);
      var tense = null, stated = false;
      all.forEach(function (it) {
        if (it.dir) stated = true;
        if (!tense) tense = tensionOf(pid, it.key, { dir: it.dir, item: it, tokens: tokens });
      });
      return { key: g.issue.key, stated: stated, tension: tense, recordOnly: !stated, value: g };
    });
    var groupHtml = function (g) {
      return '<li class="pdxri-group" data-pdxri-issue="' + esc(g.issue.key) + '">' +
        linesHtml(pid, g.issue, null, 'pdxri-anchor', 'div') +
        '<ul class="pdxri-list">' + g.related.map(function (it) {
          var li = linesHtml(pid, it, null, 'pdxri-item', 'li');
          var n = notes && notes[it.key];
          // The note sits inside the related line, before it closes.
          return n ? li.slice(0, -5) + wvaSectionNoteHtml(pid, n) + '</li>' : li;
        }).join('') + '</ul>' +
      '</li>';
    };
    var list = function (es) { return '<ul class="pdxri-groups">' + es.map(function (e) { return groupHtml(e.value); }).join('') + '</ul>'; };
    var t = triage(entries);
    return '<div id="pdxsec-related-issues" class="modal-section pdxri" data-pid="' + esc(pid) + '">' +
      '<div class="modal-section-title">Related issues</div>' +
      (t.tension.length
        ? '<div class="pdxri-block pdxri-tension" data-pdxri-block="tension">' +
            '<div class="pdxri-sub pdxri-sub-tension">' + TENSION_HD + '</div>' + list(t.tension) + '</div>'
        : '') +
      t.families.map(function (f) {
        return '<div class="pdxri-block" data-pdxri-family="' + esc(f.family.id) + '">' +
          '<div class="pdxri-sub">' + esc(f.family.label) + '</div>' + list(f.entries) + '</div>';
      }).join('') +
      (t.recordOnly.length
        ? '<details class="pdxri-ro" data-pdxri-collapsed="record-only">' + roSummary(t.recordOnly.length) + list(t.recordOnly) + '</details>'
        : '') +
    '</div>';
  }

  // The drawer block, or '' when no related issue has a stated or record line.
  // One list: the tension lines first under TENSION_HD, then each family's
  // lines under its header, then — inside the same list — the closed Record
  // only disclosure holding every line with no stated position. "Show N more"
  // still applies to the family lines past the first four lines shown; tension
  // lines are never folded away.
  function drawerHtml(pid, p, key) {
    if (!key) return '';
    var items = itemsFor(pid, p, key);
    if (!items.length) return '';
    var tokens = wvaTokens(pid);
    var t = triage(items.map(function (it) { return lineEntry(pid, it, tokens); }));
    var line = function (it, extra) { return linesHtml(pid, it, key, 'pdxri-item', 'li', extra ? EXTRA_ATTR : ''); };
    var html = '', shown = t.tension.length, hidden = 0;
    if (t.tension.length) {
      html += '<li class="pdxri-sub pdxri-sub-tension" data-pdxri-block="tension">' + TENSION_HD + '</li>' +
        t.tension.map(function (e) { return line(e.value, false); }).join('');
    }
    t.families.forEach(function (f) {
      var rows = f.entries.map(function (e) {
        var extra = shown >= RELATED_SHOWN;
        if (extra) hidden++; else shown++;
        return line(e.value, extra);
      });
      // A header whose every line is folded away folds with them.
      var allHidden = rows.every(function (r) { return r.indexOf(' data-pdxri-extra="1"') >= 0; });
      html += '<li class="pdxri-sub" data-pdxri-family="' + esc(f.family.id) + '"' + (allHidden ? EXTRA_ATTR : '') + '>' +
        esc(f.family.label) + '</li>' + rows.join('');
    });
    html += hidden ? moreHtml(shown + hidden, shown) : '';
    if (t.recordOnly.length) {
      html += '<li class="pdxri-ro-li"><details class="pdxri-ro" data-pdxri-collapsed="record-only">' + roSummary(t.recordOnly.length) +
        '<ul class="pdxri-ro-list">' + t.recordOnly.map(function (e) { return line(e.value, false); }).join('') + '</ul></details></li>';
    }
    return '<div class="pdxri pdxri-drawer" data-pdxri-drawer="' + esc(key) + '" data-pid="' + esc(pid) + '">' +
      '<div class="pdxri-h">Related issues</div>' +
      '<ul class="pdxri-list">' + html + '</ul>' +
    '</div>';
  }

  // ── SHOW N MORE ───────────────────────────────────────────────────────────
  // A long drawer stays scannable: the related-issues block shows its first
  // four lines, the conflicts section its first three, and the rest wait
  // behind one plain "Show N more" button at the bottom of that block's own
  // list. The lines are all in the markup (hidden, not dropped), in the same
  // order and the same words. Four or fewer (three or fewer) print no button,
  // and the no-conflicts line never collapses.
  var RELATED_SHOWN = 4;
  var CONFLICTS_SHOWN = 3;
  var EXTRA_ATTR = ' data-pdxri-extra="1" hidden';
  function moreWord(n) { return 'Show ' + n + ' more'; }
  var LESS_WORD = 'Show fewer';
  function moreHtml(total, shown) {
    if (total <= shown) return '';
    var n = total - shown;
    return '<li class="pdxri-more-li"><button type="button" class="pdxri-more" data-pdxri-more="' + n + '"' +
      ' aria-expanded="false">' + moreWord(n) + '</button></li>';
  }
  // One press opens the block's hidden lines; the next closes them again.
  function toggleMore(btn) {
    if (!btn || typeof btn.closest !== 'function') return false;
    var list = btn.closest('ul');
    if (!list) return false;
    var open = btn.getAttribute('aria-expanded') !== 'true';
    var rows = list.querySelectorAll('[data-pdxri-extra]');
    for (var i = 0; i < rows.length; i++) {
      if (open) rows[i].removeAttribute('hidden'); else rows[i].setAttribute('hidden', '');
    }
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = open ? LESS_WORD : moreWord(btn.getAttribute('data-pdxri-more'));
    return open;
  }
  // Its look, injected once by this module so the drawer's own sheet in
  // consistency.js is untouched. A hidden line stays hidden even under that
  // sheet's display:block rule for .pdxri-item.
  var MORE_STYLE_ID = 'pdxri-more-style';
  var MORE_CSS =
    '.pdxri-drawer [hidden],.pdxri-conflicts [hidden]{display:none !important;}' +
    '.pdxri-more-li{list-style:none;margin:0.2rem 0 0;}' +
    '.pdxri-more{background:none;border:0;padding:0.15rem 0;font:inherit;font-size:0.76rem;font-weight:600;' +
      'color:#8fb4e8;text-decoration:underline;text-underline-offset:2px;cursor:pointer;min-height:28px;}' +
    '.pdxri-more:hover,.pdxri-more:focus-visible{color:#c9d6ea;}' +
    // Tension block, family headers and the Record only disclosure.
    '.pdxri .pdxri-sub{list-style:none;display:block;margin:0.55rem 0 0.1rem;font-size:0.62rem;font-weight:700;' +
      'letter-spacing:0.08em;text-transform:uppercase;color:#7f95b8;}' +
    '.pdxri .pdxri-sub-tension{color:#f8a5a5;}' +
    '.pdxri-block.pdxri-tension,.pdxri-drawer .pdxri-sub-tension{border-left:2px solid rgba(248,113,113,0.55);padding-left:0.5rem;}' +
    '.pdxri .pdxri-ro{margin:0.55rem 0 0;}' +
    '.pdxri .pdxri-ro-li{list-style:none;}' +
    '.pdxri .pdxri-ro-s{cursor:pointer;font-size:0.72rem;font-weight:600;color:#8fb4e8;min-height:28px;}' +
    '.pdxri .pdxri-ro-n{font-weight:400;color:#7f95b8;}' +
    '.pdxri .pdxri-ro-list{list-style:none;margin:0.2rem 0 0;padding:0;}';
  try {
    if (document && typeof document.createElement === 'function' && !(document.getElementById && document.getElementById(MORE_STYLE_ID))) {
      var st = document.createElement('style');
      st.id = MORE_STYLE_ID;
      st.textContent = MORE_CSS;
      (document.head || document.documentElement).appendChild(st);
    }
  } catch (e) { /* no document: markup only */ }

  // Drawers are painted as markup, so the button is heard once, on the page.
  // Capture phase, so a drawer's own click routing cannot swallow it.
  try {
    if (document && typeof document.addEventListener === 'function') {
      document.addEventListener('click', function (e) {
        var t = e && e.target;
        var btn = t && typeof t.closest === 'function' ? t.closest('[data-pdxri-more]') : null;
        if (!btn) return;
        e.preventDefault();
        toggleMore(btn);
      }, true);
    }
  } catch (e) { /* no document: nothing to hear */ }

  // ── WHERE THIS CONFLICTS ──────────────────────────────────────────────────
  var CONFLICT_HD = 'Where this conflicts';
  var NO_CONFLICT = 'No conflicts with your stances on these issues.';
  var YOU_WORD = { support: 'support', oppose: 'oppose' };
  var THEY_STATED = { support: 'they support', oppose: 'they oppose' };
  var THEY_RECORD = { 'with': 'their voting record runs with it', against: 'their voting record runs against it' };

  // The reader's own sides, support / oppose only ('mixed' takes no side),
  // keyed by issue. null when no stance reader is on this document or the
  // reader holds no side, so the caller prints nothing.
  function readerSides() {
    try {
      var S = window.PDXStanceSides;
      if (!S || typeof S.list !== 'function') return null;
      var rows = S.list() || [], out = {}, n = 0;
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (!r || !r.key || out[r.key]) continue;
        if (r.position !== 'support' && r.position !== 'oppose') continue;
        out[r.key] = r.position; n++;
      }
      return n ? out : null;
    } catch (e) { return null; }
  }

  // The person's side on one issue against the reader's: the stated word
  // when it runs the other way, else the one-way record when that does.
  // null when neither does (or the reader holds no side here).
  function clashOf(it, mine) {
    var you = it && mine[it.key];
    if (!you) return null;
    var other = you === 'support' ? 'oppose' : 'support';
    if (it.dir === other) return { key: it.key, label: it.label, they: THEY_STATED[it.dir], how: 'stated', you: you };
    var recOther = you === 'support' ? 'against' : 'with';
    if (it.rec === recOther) return { key: it.key, label: it.label, they: THEY_RECORD[it.rec], how: 'record', you: you };
    return null;
  }

  function conflictsFor(pid, p, key, mine) {
    mine = mine || readerSides();
    if (!key || !mine) return null;
    var pm = positionMap(pid, p);
    var items = itemsFor(pid, p, key, pm);
    if (!items.length) return null;
    var open = itemOf(pid, pm, key) || { key: key, label: labelOf(key) };
    var openClash = clashOf(open, mine);
    var out = [];
    items.forEach(function (it) {
      var sides = [];
      if (openClash) sides.push(openClash);
      var c = clashOf(it, mine); if (c) sides.push(c);
      if (sides.length) out.push({ a: open.label, b: it.label, bKey: it.key, sides: sides });
    });
    return out;
  }

  function conflictText(c) {
    return c.a + ' and ' + c.b + ': ' + c.sides.map(function (s, i) {
      return (i ? 'On ' : 'on ') + s.label + ' ' + s.they + '; you ' + YOU_WORD[s.you];
    }).join('. ') + '.';
  }

  // The drawer section, or '' when the reader has no saved stances.
  function conflictsHtml(pid, p, key) {
    var list = conflictsFor(pid, p, key);
    if (!list) return '';
    var body = list.length
      ? '<ul class="pdxri-cf-list">' + list.map(function (c, n) {
          return '<li class="pdxri-cf-item" data-pdxri-cf="' + esc(c.bKey) + '"' + (n >= CONFLICTS_SHOWN ? EXTRA_ATTR : '') + '>' + c.sides.reduce(function (h, s, i) {
            return h + (i ? ' ' : '') + '<span class="pdxri-cf-side" data-pdxri-cf-how="' + s.how + '">' + (i ? 'On ' : 'on ') +
              esc(s.label) + ' <span class="pdxri-cf-they">' + esc(s.they) + '</span>; ' +
              '<span class="pdxri-cf-you">you ' + YOU_WORD[s.you] + '</span>.</span>';
          }, '<span class="pdxri-cf-pair">' + esc(c.a) + ' and ' + esc(c.b) + ':</span> ') + '</li>';
        }).join('') + moreHtml(list.length, CONFLICTS_SHOWN) + '</ul>'
      : '<p class="pdxri-cf-none">' + esc(NO_CONFLICT) + '</p>';
    return '<div class="pdxri-conflicts" data-pdxri-conflicts="' + esc(key) + '" data-pid="' + esc(pid) + '">' +
      '<div class="pdxri-cf-h">' + esc(CONFLICT_HD) + '</div>' + body + '</div>';
  }

  // ── WORDS VS. ACTIONS ─────────────────────────────────────────────────────
  // Over the SAME pairs "Where this conflicts" walks (the open issue and each
  // related issue itemsFor lists), one short note per pair where, on one issue
  // of the pair, the reader holds a side, the person STATES that same side, and
  // a vote of theirs on that issue cut the other way. The vote comes from
  // PDXConsistency.wordsVsActionsActs: a curated act's side, read through the
  // matching publishable raw roll call when one exists (preferred), else the
  // curated vote. Nothing is scored or ranked: the most recent such vote is
  // named, raw first. The related issue's own side is preferred; a side on the
  // open issue is printed once, on the first pair that has nothing of its own.
  // '' when there is no such vote — the drawer is unchanged.
  var WVA_HD = 'Words and votes';
  // THE RECENCY WINDOW — the one place to change it. Each value is a number of
  // months back from today, 'congress' (since the current Congress convened,
  // Jan 3 of the latest odd year), or null (no limit).
  //   recent  qualifying votes inside it are used first; older ones only when no
  //           recent one conflicts (the note still appears, naming that vote)
  //   cutoff  hard limit: votes older than it are never used (null = none)
  // Within whichever tier is used, the most recent vote is named; a same-day tie
  // goes to the publishable raw roll call. A fallback (older) vote is named
  // with a short cue — "an older vote", or "a vote from an earlier Congress"
  // under 'congress' — and a recent one with none. A vote with no date counts as older,
  // and never passes a hard cutoff. `now` is the clock (a test seam).
  var WVA_WINDOW = { recent: 24, cutoff: null, now: function () { return Date.now(); } };
  function wvaSince(v, now) {
    if (v == null || v === '') return null;
    var d = new Date(now);
    if (v === 'congress') {
      // A Congress convenes Jan 3 of an odd year and sits two years.
      var y = d.getUTCFullYear(), odd = y % 2 === 1 ? y : y - 1;
      var start = Date.UTC(odd, 0, 3);
      return start > now ? Date.UTC(odd - 2, 0, 3) : start;
    }
    var m = Number(v);
    if (!(m > 0)) return null;
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - m, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes());
  }
  // The vote a note names, from the acts that cut against the stated side:
  // { act, older }. `older` is true when the named vote is the fallback — the
  // window has a `recent` limit and no conflicting vote fell inside it.
  function wvaPick(acts) {
    var now = Number((WVA_WINDOW.now || Date.now)());
    var recent = wvaSince(WVA_WINDOW.recent, now), cutoff = wvaSince(WVA_WINDOW.cutoff, now);
    var dated = acts.map(function (a) { var t = Date.parse(a.date || ''); return { a: a, t: isNaN(t) ? null : t }; })
      .filter(function (x) { return cutoff == null || (x.t != null && x.t >= cutoff); });
    if (!dated.length) return null;
    var inside = recent == null ? dated : dated.filter(function (x) { return x.t != null && x.t >= recent; });
    var older = recent != null && !inside.length;
    var pool = older ? dated : inside;
    var day = function (x) { return x.t == null ? '' : new Date(x.t).toISOString().slice(0, 10); };
    pool.sort(function (x, y) {
      return day(y).localeCompare(day(x)) ||
        ((x.a.from === 'raw' ? 0 : 1) - (y.a.from === 'raw' ? 0 : 1)) ||
        ((y.t == null ? -Infinity : y.t) - (x.t == null ? -Infinity : x.t)) || 0;
    });
    return { act: pool[0].a, older: older };
  }
  var WVA_SAID = { support: 'they state they support it', oppose: 'they state they oppose it' };
  function wvaSide(pid, pm, key, label, mine) {
    var you = mine[key];
    var said = directionOf(pm, key);
    if (!you || !said || said !== you) return null;
    var CS = window.PDXConsistency;
    if (!CS || typeof CS.wordsVsActionsActs !== 'function') return null;
    var against = said === 'support' ? 'opposes' : 'advances';
    var acts = (CS.wordsVsActionsActs(pid, key) || []).filter(function (a) { return a && a.dir === against; });
    if (!acts.length) return null;
    var pick = wvaPick(acts);
    if (!pick) return null;
    var side = { key: key, label: label, you: you, said: said, act: pick.act };
    if (pick.older) side.older = true;
    return side;
  }
  function wordsVsActionsFor(pid, p, key, mine) {
    mine = mine || readerSides();
    if (!key || !mine) return null;
    var pm = positionMap(pid, p);
    var items = itemsFor(pid, p, key, pm);
    if (!items.length) return null;
    var open = itemOf(pid, pm, key) || { key: key, label: labelOf(key) };
    var openSide = wvaSide(pid, pm, key, open.label, mine), openUsed = false;
    var out = [];
    items.forEach(function (it) {
      var side = wvaSide(pid, pm, it.key, it.label, mine);
      if (!side && openSide && !openUsed) { side = openSide; openUsed = true; }
      if (side) out.push({ a: open.label, b: it.label, bKey: it.key, side: side });
    });
    // The reader's device preference: hide notes naming an older (fallback)
    // vote. Dropped AFTER the pairs are laid out, so every recent note keeps
    // the exact place and words it has with the preference off.
    if (wvaHideOlder()) out = out.filter(function (n) { return !n.side.older; });
    return out;
  }
  // THE OLDER-VOTE CUE. A note naming the fallback vote (nothing inside the
  // window conflicts) says so, in a few plain words, right after the date. A
  // vote inside the window carries no cue, so its note is unchanged.
  // THE HIDE-OLDER PREFERENCE. Device-only (localStorage, no account), off by
  // default: with it on, notes that name an older fallback vote are omitted;
  // notes naming a vote inside the window are unchanged. Read here, in the one
  // note function every drawer and the person-file section call.
  var WVA_HIDE_OLDER_KEY = 'pdx_wva_hide_older_v1';
  function wvaHideOlder() {
    try { return !!(window.localStorage && window.localStorage.getItem(WVA_HIDE_OLDER_KEY) === '1'); } catch (e) { return false; }
  }
  function setWvaHideOlder(on) {
    try {
      if (!window.localStorage) return false;
      if (on) window.localStorage.setItem(WVA_HIDE_OLDER_KEY, '1'); else window.localStorage.removeItem(WVA_HIDE_OLDER_KEY);
      return true;
    } catch (e) { return false; }
  }
  // The preferred window in words, for the control that sets the preference.
  function wvaRecentWords() {
    var r = WVA_WINDOW.recent;
    if (r === 'congress') return 'the current Congress';
    var m = Number(r);
    return m > 0 ? 'the last ' + m + ' months' : '';
  }
  function wvaOlderCue() {
    return WVA_WINDOW.recent === 'congress' ? 'a vote from an earlier Congress' : 'an older vote';
  }
  function wvaText(n) {
    var s = n.side, a = s.act;
    return n.a + ' and ' + n.b + ': on ' + s.label + ' ' + WVA_SAID[s.said] + ', but voted ' + a.word +
      (a.ident ? ' on ' + a.ident : '') + (a.date ? ' (' + String(a.date).slice(0, 10) + ')' : '') +
      (s.older ? ', ' + wvaOlderCue() : '') +
      (a.procedural ? ', a procedural vote' : '') + ', which ran against it; you ' + YOU_WORD[s.you] + '.';
  }
  // One note's line — the drawer's and the person-file section's, the same markup.
  function wvaItemHtml(n) {
    var a = n.side.act;
    return '<li class="pdxri-wva-item" data-pdxri-wva-pair="' + esc(n.bKey) + '" data-pdxri-wva-key="' + esc(n.side.key) +
      '" data-pdxri-wva-from="' + esc(a.from) + '"' + (n.side.older ? ' data-pdxri-wva-older="1"' : '') + '>' + esc(wvaText(n)) +
      (a.url ? ' <a href="' + esc(a.url) + '" target="_blank" rel="noopener">official record</a>' : '') + '</li>';
  }
  function wordsVsActionsHtml(pid, p, key) {
    var list = wordsVsActionsFor(pid, p, key);
    if (!list || !list.length) return '';
    return '<div class="pdxri-wva" data-pdxri-wva="' + esc(key) + '" data-pid="' + esc(pid) + '" style="margin:8px 0;font-size:0.85rem;">' +
      '<div class="pdxri-wva-h" style="font-weight:700;">' + esc(WVA_HD) + '</div>' +
      '<ul class="pdxri-wva-list" style="margin:4px 0 0;padding-left:18px;">' + list.map(wvaItemHtml).join('') + '</ul></div>';
  }

  // ── WORDS AND VOTES IN THE PERSON-FILE SECTION ────────────────────────────
  // Each related line of the person-file section is one pair: the issue whose
  // related list brought it in (`via`) and the line itself. That issue's drawer
  // lists the same pair, so the line takes the very note that drawer prints for
  // it — wordsVsActionsFor over `via`, the note whose pair is this line — and
  // nothing else: one note per related line at most, same rules, same window,
  // same words. No such note: the line, and the section, are unchanged.
  function sectionNotes(pid, p, via) {
    var mine = readerSides();
    if (!mine) return null;
    var out = {}, byVia = {}, n = 0;
    Object.keys(via).forEach(function (k) {
      var v = via[k];
      if (!(v in byVia)) { try { byVia[v] = wordsVsActionsFor(pid, p, v, mine) || []; } catch (e) { byVia[v] = []; } }
      for (var i = 0; i < byVia[v].length; i++) {
        if (byVia[v][i].bKey === k) { var w = byVia[v][i]; out[k] = { a: w.a, b: w.b, bKey: w.bKey, side: w.side, via: v }; n++; break; }
      }
    });
    return n ? out : null;
  }
  function wvaSectionNoteHtml(pid, n) {
    return '<div class="pdxri-wva pdxri-wva-line" data-pdxri-wva="' + esc(n.via || '') + '" data-pid="' + esc(pid) + '" style="margin:4px 0 6px;font-size:0.85rem;">' +
      '<div class="pdxri-wva-h" style="font-weight:700;">' + esc(WVA_HD) + '</div>' +
      '<ul class="pdxri-wva-list" style="margin:4px 0 0;padding-left:18px;">' + wvaItemHtml(n) + '</ul></div>';
  }
  // The section is painted once, as markup. The drawers' notes read the
  // member's votes and the publishable raw roll calls, both of which arrive
  // after first paint; the section asks for the same publishable-vote feed the
  // drawers ask for (PDXConsistency.loadVoteActionLinks, once per person) and
  // hears the same votes-arrived event, and is repainted in place ONLY when its
  // notes changed. A section with no note stays exactly as painted.
  var _armed = {};
  function noteSig(h) { return (String(h || '').match(/<div class="pdxri-wva[\s\S]*?<\/ul><\/div>/g) || []).join('\n'); }
  function repaintSection(pid, p) {
    try {
      var el = document.getElementById('pdxsec-related-issues');
      if (!el || el.getAttribute('data-pid') !== String(pid)) return;
      var now = sectionHtml(pid, p);
      if (!now || noteSig(now) === noteSig(el.outerHTML)) return;
      el.outerHTML = now;
    } catch (e) { /* the painted section stays */ }
  }
  function armSection(pid, p) {
    try {
      if (_armed[pid] || typeof document === 'undefined' || !document || typeof document.getElementById !== 'function') return;
      if (!readerSides()) return;
      _armed[pid] = 1;
      var again = function () { repaintSection(pid, p); };
      setTimeout(function () {
        var CS = window.PDXConsistency;
        if (CS && typeof CS.loadVoteActionLinks === 'function') { try { CS.loadVoteActionLinks(pid, again); } catch (e) { /* no feed */ } }
      }, 0);
      if (typeof window.addEventListener === 'function') {
        window.addEventListener('pdx-consistency-warm', function (ev) {
          if (ev && ev.detail && ev.detail.pid && String(ev.detail.pid) !== String(pid)) return;
          again();
        });
      }
    } catch (e) { /* markup only */ }
  }

  window.PDXRelatedIssues = {
    wordsVsActionsFor: wordsVsActionsFor,
    wordsVsActionsHtml: wordsVsActionsHtml,
    wordsVsActionsText: wvaText,
    WVA_HD: WVA_HD,
    WVA_WINDOW: WVA_WINDOW,
    WVA_HIDE_OLDER_KEY: WVA_HIDE_OLDER_KEY,
    wvaHideOlder: wvaHideOlder,
    setWvaHideOlder: setWvaHideOlder,
    wvaRecentWords: wvaRecentWords,
    RELATED_SHOWN: RELATED_SHOWN,
    MORE_CSS: MORE_CSS,
    CONFLICTS_SHOWN: CONFLICTS_SHOWN,
    toggleMore: toggleMore,
    conflictsFor: conflictsFor,
    conflictText: conflictText,
    conflictsHtml: conflictsHtml,
    CONFLICT_HD: CONFLICT_HD,
    NO_CONFLICT: NO_CONFLICT,
    MAP: MAP,
    related: related,
    itemsFor: itemsFor,
    groupsFor: groupsFor,
    lineText: lineText,
    lineTexts: lineTexts,
    recordOf: recordOf,
    iconOf: iconOf,
    colorStyle: colorStyle,
    hasVotes: function (pid, key) { return hasVotes(recordRead(pid, key)) || !!execActsTally(pid, key); },
    sectionHtml: sectionHtml,
    drawerHtml: drawerHtml,
    TENSION_HD: TENSION_HD,
    RECORD_ONLY_HD: RECORD_ONLY_HD,
    FAMILIES: FAMILIES,
    OTHER_FAMILY: OTHER_FAMILY,
    familyOf: familyOf,
    tensionOf: tensionOf,
    wvaTokens: wvaTokens,
    triage: triage,
    itemFor: function (pid, p, key) { return itemOf(pid, positionMap(pid, p), key); }
  };
})();
