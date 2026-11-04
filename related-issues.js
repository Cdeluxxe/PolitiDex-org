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
         "record runs with" / "record runs against". Votes on file with no
         one-way read (split, thin, poleless) read as the tally the issue's own
         drawer prints, in its words ("1 for · 1 against"), from the drawer
         ledger (PDXConsistency.drawerTally); a subject key whose drawer prints
         no for/against line gives its act count ("3 formal acts"). No votes
         on file reads "no record".
           Cut Income & Business Taxes: supports · record runs with
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
     no related lines is left out.

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

   · IT READS, IT DOES NOT WRITE. Nothing here touches Direction Match, scores,
     effect lines, the vote table, or any other section. Labels come from the
     issue register (window.ISSUE_MAP), emoji stripped.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXRelatedIssues) return;

  // Issue key → related issue keys. Order here is print order.
  var MAP = {
    lands_preserve: ['lands_keep_public', 'energy_production', 'gov_regulation', 'lands_local', 'lands_balance', 'lands_energy', 'property_rights', 'permitting_reform', 'water', 'water_storage', 'datacenter_water', 'disaster_resilience', 'climate_action'],
    lands_keep_public: ['lands_preserve', 'energy_production', 'gov_regulation', 'lands_local', 'lands_balance', 'lands_energy', 'property_rights', 'permitting_reform', 'water', 'water_storage', 'datacenter_water', 'housing_build'],
    lands_local: ['lands_preserve', 'lands_keep_public', 'lands_balance', 'lands_energy', 'property_rights', 'disaster_resilience', 'climate_action', 'states_federal_power', 'state_standing', 'guard_authority', 'housing_build'],
    lands_balance: ['lands_preserve', 'lands_keep_public', 'lands_local', 'lands_energy', 'property_rights', 'disaster_resilience', 'climate_action'],
    lands_energy: ['lands_preserve', 'lands_keep_public', 'lands_local', 'lands_balance', 'property_rights', 'energy_production', 'permitting_reform', 'gov_regulation', 'enviro_energy', 'climate_action', 'enviro_balance', 'datacenter_power'],
    property_rights: ['lands_preserve', 'lands_keep_public', 'lands_local', 'lands_balance', 'lands_energy'],
    energy_production: ['lands_preserve', 'lands_keep_public', 'lands_energy', 'permitting_reform', 'gov_regulation', 'enviro_energy', 'climate_action', 'enviro_balance', 'datacenter_power', 'cost_living', 'econ_growth'],
    permitting_reform: ['lands_preserve', 'lands_keep_public', 'lands_energy', 'energy_production', 'gov_regulation', 'enviro_energy', 'climate_action', 'enviro_balance', 'datacenter_power', 'econ_growth', 'infrastructure', 'broadband', 'transit', 'water_storage', 'housing_build'],
    gov_regulation: ['lands_preserve', 'lands_keep_public', 'lands_energy', 'energy_production', 'permitting_reform', 'climate_action', 'enviro_balance', 'econ_growth', 'econ_smallbiz', 'econ_balance', 'econ_workers', 'econ_corp_account', 'lower_taxes', 'civil_service_control', 'gov_waste', 'housing_build'],
    water: ['water_storage', 'datacenter_water', 'lands_preserve', 'lands_keep_public', 'datacenter_growth', 'datacenter_power', 'tech_innovation', 'rural_ag', 'health_rural', 'broadband'],
    water_storage: ['water', 'datacenter_water', 'lands_preserve', 'lands_keep_public', 'rural_ag', 'health_rural', 'broadband', 'infrastructure', 'transit', 'permitting_reform'],
    datacenter_water: ['water', 'water_storage', 'lands_preserve', 'lands_keep_public', 'datacenter_growth', 'datacenter_power', 'tech_innovation'],
    disaster_resilience: ['lands_preserve', 'lands_balance', 'lands_local', 'climate_action'],
    climate_action: ['disaster_resilience', 'lands_preserve', 'lands_balance', 'lands_local', 'energy_production', 'enviro_energy', 'lands_energy', 'enviro_balance', 'datacenter_power', 'permitting_reform', 'gov_regulation', 'econ_growth', 'cost_living'],
    enviro_energy: ['energy_production', 'climate_action', 'lands_energy', 'enviro_balance', 'datacenter_power', 'permitting_reform', 'cost_living'],
    enviro_balance: ['energy_production', 'enviro_energy', 'climate_action', 'lands_energy', 'datacenter_power', 'permitting_reform', 'gov_regulation', 'econ_growth'],
    datacenter_power: ['energy_production', 'enviro_energy', 'climate_action', 'lands_energy', 'enviro_balance', 'permitting_reform', 'datacenter_growth', 'datacenter_water', 'tech_innovation', 'water', 'cost_living'],
    econ_growth: ['climate_action', 'enviro_balance', 'gov_regulation', 'permitting_reform', 'econ_smallbiz', 'econ_balance', 'econ_workers', 'econ_corp_account', 'lower_taxes', 'energy_production'],
    datacenter_growth: ['datacenter_water', 'datacenter_power', 'tech_innovation', 'water', 'tech_balance', 'privacy_rights', 'crypto_cbdc'],
    tech_innovation: ['datacenter_growth', 'datacenter_water', 'datacenter_power', 'water', 'free_speech', 'privacy_rights', 'tech_balance', 'crypto_cbdc'],
    lower_taxes: ['tax_middle_class', 'prop_tax', 'property_tax', 'national_debt', 'gov_balance', 'gov_services', 'econ_growth', 'econ_smallbiz', 'econ_balance', 'econ_workers', 'econ_corp_account', 'gov_regulation'],
    tax_middle_class: ['lower_taxes', 'prop_tax', 'property_tax', 'national_debt', 'gov_balance', 'gov_services', 'child_care', 'paid_leave', 'family_support', 'cost_living', 'tariffs_prices', 'healthcare_costs', 'housing'],
    prop_tax: ['lower_taxes', 'tax_middle_class', 'property_tax', 'national_debt', 'gov_balance', 'gov_services', 'dev_district_finance', 'gov_transparency', 'housing_build', 'housing', 'housing_support', 'housing_first_time', 'homeless', 'cost_living'],
    property_tax: ['lower_taxes', 'tax_middle_class', 'prop_tax', 'national_debt', 'gov_balance', 'gov_services', 'dev_district_finance', 'gov_transparency', 'housing_build', 'housing', 'housing_support', 'housing_first_time', 'homeless', 'cost_living'],
    national_debt: ['lower_taxes', 'tax_middle_class', 'prop_tax', 'property_tax', 'gov_balance', 'gov_services', 'cut_spending', 'gov_waste', 'audit_spending', 'power_of_purse', 'social_security', 'healthcare', 'strong_defense', 'sound_money', 'crypto_cbdc'],
    gov_balance: ['lower_taxes', 'tax_middle_class', 'prop_tax', 'property_tax', 'national_debt', 'gov_services', 'cut_spending', 'gov_waste', 'audit_spending', 'power_of_purse', 'social_security', 'healthcare'],
    gov_services: ['lower_taxes', 'tax_middle_class', 'prop_tax', 'property_tax', 'national_debt', 'gov_balance', 'cut_spending', 'gov_waste', 'audit_spending', 'power_of_purse'],
    cut_spending: ['gov_waste', 'gov_balance', 'national_debt', 'audit_spending', 'gov_services', 'power_of_purse', 'social_security', 'healthcare', 'strong_defense', 'gov_transparency', 'border_security'],
    gov_waste: ['cut_spending', 'gov_balance', 'national_debt', 'audit_spending', 'gov_services', 'power_of_purse', 'gov_transparency', 'civil_service_control', 'gov_regulation'],
    audit_spending: ['cut_spending', 'gov_waste', 'gov_balance', 'national_debt', 'gov_services', 'power_of_purse', 'sound_money', 'crypto_cbdc', 'gov_transparency'],
    power_of_purse: ['cut_spending', 'gov_waste', 'gov_balance', 'national_debt', 'audit_spending', 'gov_services', 'checks_balances', 'war_powers', 'judicial_check', 'congress_oversight', 'tariffs_authority', 'civil_service_control', 'scotus_reform'],
    social_security: ['healthcare', 'national_debt', 'cut_spending', 'gov_balance'],
    healthcare: ['social_security', 'national_debt', 'cut_spending', 'gov_balance', 'healthcare_market', 'healthcare_costs', 'health_balance', 'health_drug_prices', 'health_rural', 'medical_freedom', 'health_mental', 'homeless', 'veterans'],
    strong_defense: ['cut_spending', 'national_debt', 'foreign_balance', 'restraint', 'america_first', 'america_first_fp', 'veterans', 'israel_support', 'iran_policy', 'ukraine_policy', 'yemen_policy', 'venezuela_policy', 'war_powers'],
    sound_money: ['audit_spending', 'crypto_cbdc', 'national_debt'],
    crypto_cbdc: ['sound_money', 'audit_spending', 'national_debt', 'tech_innovation', 'tech_balance', 'privacy_rights', 'datacenter_growth'],
    border_security: ['deportations', 'immig_fentanyl', 'immig_balance', 'immig_legal', 'immigration_reform', 'cut_spending'],
    deportations: ['border_security', 'immig_fentanyl', 'immig_balance', 'immig_legal', 'immigration_reform'],
    immig_fentanyl: ['border_security', 'deportations', 'immig_balance', 'immig_legal', 'immigration_reform', 'back_police', 'tough_on_crime', 'justice_balance', 'justice_reform', 'cannabis_reform'],
    immig_balance: ['border_security', 'deportations', 'immig_fentanyl', 'immig_legal', 'immigration_reform'],
    immig_legal: ['border_security', 'deportations', 'immig_fentanyl', 'immig_balance', 'immigration_reform', 'econ_workers', 'rural_ag'],
    immigration_reform: ['border_security', 'deportations', 'immig_fentanyl', 'immig_balance', 'immig_legal', 'rural_ag', 'econ_workers'],
    gun_rights: ['gun_balance', 'gun_safety'],
    gun_balance: ['gun_rights', 'gun_safety'],
    gun_safety: ['gun_rights', 'gun_balance'],
    school_choice: ['public_schools', 'edu_parental', 'edu_balance'],
    public_schools: ['school_choice', 'edu_parental', 'edu_balance', 'edu_college_cost'],
    edu_parental: ['school_choice', 'public_schools', 'edu_balance'],
    edu_balance: ['school_choice', 'public_schools', 'edu_parental', 'edu_college_cost'],
    edu_college_cost: ['public_schools', 'edu_balance'],
    child_care: ['paid_leave', 'family_support', 'cost_living', 'tax_middle_class'],
    paid_leave: ['child_care', 'family_support', 'cost_living', 'tax_middle_class'],
    family_support: ['child_care', 'paid_leave', 'cost_living', 'tax_middle_class'],
    cost_living: ['child_care', 'paid_leave', 'family_support', 'tax_middle_class', 'tariffs_china', 'tariffs_growth', 'tariffs_prices', 'tariffs_authority', 'econ_trade', 'rural_ag', 'housing', 'housing_build', 'housing_support', 'housing_first_time', 'homeless', 'property_tax', 'prop_tax', 'healthcare_costs', 'energy_production', 'enviro_energy', 'datacenter_power', 'climate_action'],
    healthcare_market: ['healthcare', 'healthcare_costs', 'health_balance', 'health_drug_prices', 'health_rural', 'medical_freedom'],
    healthcare_costs: ['healthcare', 'healthcare_market', 'health_balance', 'health_drug_prices', 'health_rural', 'medical_freedom', 'cost_living', 'tariffs_prices', 'housing', 'tax_middle_class'],
    health_balance: ['healthcare', 'healthcare_market', 'healthcare_costs', 'health_drug_prices', 'health_rural', 'medical_freedom'],
    health_drug_prices: ['healthcare', 'healthcare_market', 'healthcare_costs', 'health_balance', 'health_rural', 'medical_freedom'],
    health_rural: ['healthcare', 'healthcare_market', 'healthcare_costs', 'health_balance', 'health_drug_prices', 'medical_freedom', 'rural_ag', 'broadband', 'water', 'water_storage'],
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
    econ_workers: ['econ_growth', 'econ_smallbiz', 'econ_balance', 'econ_corp_account', 'gov_regulation', 'lower_taxes', 'immig_legal', 'immigration_reform'],
    econ_corp_account: ['econ_growth', 'econ_smallbiz', 'econ_balance', 'econ_workers', 'gov_regulation', 'lower_taxes'],
    dev_district_finance: ['prop_tax', 'property_tax', 'gov_transparency', 'housing_build'],
    gov_transparency: ['dev_district_finance', 'prop_tax', 'property_tax', 'housing_build', 'term_limits', 'campaign_finance', 'stock_trading_ban', 'reform_balance', 'congress_oversight', 'audit_spending', 'gov_waste', 'cut_spending'],
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
    privacy_rights: ['free_speech', 'tech_innovation', 'tech_balance', 'crypto_cbdc', 'datacenter_growth'],
    tech_balance: ['free_speech', 'privacy_rights', 'tech_innovation', 'crypto_cbdc', 'datacenter_growth'],
    foreign_balance: ['strong_defense', 'restraint', 'america_first', 'america_first_fp', 'veterans'],
    restraint: ['strong_defense', 'foreign_balance', 'america_first', 'america_first_fp', 'veterans', 'israel_support', 'iran_policy', 'ukraine_policy', 'yemen_policy', 'venezuela_policy', 'war_powers'],
    america_first: ['strong_defense', 'foreign_balance', 'restraint', 'america_first_fp', 'veterans'],
    america_first_fp: ['strong_defense', 'foreign_balance', 'restraint', 'america_first', 'veterans', 'israel_support', 'iran_policy', 'ukraine_policy', 'yemen_policy', 'venezuela_policy', 'war_powers'],
    israel_support: ['iran_policy', 'ukraine_policy', 'yemen_policy', 'venezuela_policy', 'restraint', 'strong_defense', 'america_first_fp', 'war_powers'],
    iran_policy: ['israel_support', 'ukraine_policy', 'yemen_policy', 'venezuela_policy', 'restraint', 'strong_defense', 'america_first_fp', 'war_powers'],
    ukraine_policy: ['israel_support', 'iran_policy', 'yemen_policy', 'venezuela_policy', 'restraint', 'strong_defense', 'america_first_fp', 'war_powers'],
    yemen_policy: ['israel_support', 'iran_policy', 'ukraine_policy', 'venezuela_policy', 'restraint', 'strong_defense', 'america_first_fp', 'war_powers'],
    venezuela_policy: ['israel_support', 'iran_policy', 'ukraine_policy', 'yemen_policy', 'restraint', 'strong_defense', 'america_first_fp', 'war_powers'],
    war_powers: ['israel_support', 'iran_policy', 'ukraine_policy', 'yemen_policy', 'venezuela_policy', 'restraint', 'strong_defense', 'america_first_fp', 'checks_balances', 'judicial_check', 'power_of_purse', 'congress_oversight', 'tariffs_authority', 'civil_service_control', 'scotus_reform', 'guard_authority'],
    election_security: ['election_integrity', 'voter_id', 'democracy_balance', 'voting_access'],
    election_integrity: ['election_security', 'voter_id', 'democracy_balance', 'voting_access'],
    voter_id: ['election_security', 'election_integrity', 'democracy_balance', 'voting_access'],
    democracy_balance: ['election_security', 'election_integrity', 'voter_id', 'voting_access'],
    voting_access: ['election_security', 'election_integrity', 'voter_id', 'democracy_balance'],
    term_limits: ['gov_transparency', 'campaign_finance', 'stock_trading_ban', 'reform_balance', 'congress_oversight'],
    campaign_finance: ['term_limits', 'gov_transparency', 'stock_trading_ban', 'reform_balance', 'congress_oversight'],
    stock_trading_ban: ['term_limits', 'gov_transparency', 'campaign_finance', 'reform_balance', 'congress_oversight'],
    reform_balance: ['term_limits', 'gov_transparency', 'campaign_finance', 'stock_trading_ban', 'congress_oversight'],
    congress_oversight: ['term_limits', 'gov_transparency', 'campaign_finance', 'stock_trading_ban', 'reform_balance', 'checks_balances', 'war_powers', 'judicial_check', 'power_of_purse', 'tariffs_authority', 'civil_service_control', 'scotus_reform'],
    checks_balances: ['war_powers', 'judicial_check', 'power_of_purse', 'congress_oversight', 'tariffs_authority', 'civil_service_control', 'scotus_reform', 'guard_authority'],
    judicial_check: ['checks_balances', 'war_powers', 'power_of_purse', 'congress_oversight', 'tariffs_authority', 'civil_service_control', 'scotus_reform'],
    civil_service_control: ['checks_balances', 'war_powers', 'judicial_check', 'power_of_purse', 'congress_oversight', 'tariffs_authority', 'scotus_reform', 'gov_waste', 'gov_regulation'],
    scotus_reform: ['checks_balances', 'war_powers', 'judicial_check', 'power_of_purse', 'congress_oversight', 'tariffs_authority', 'civil_service_control'],
    states_federal_power: ['state_standing', 'guard_authority', 'lands_local'],
    state_standing: ['states_federal_power', 'guard_authority', 'lands_local'],
    guard_authority: ['states_federal_power', 'state_standing', 'lands_local', 'war_powers', 'checks_balances']
  };

  var WORD = { support: 'supports', oppose: 'opposes' };
  var REC_WORD = { 'with': 'record runs with', against: 'record runs against' };
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
    if (!d && !r && !v) return null;
    var bare = !d && !r;
    // Votes with no one-way read: the drawer's tally; if the ledger is not
    // loaded, the index's own count of the same votes, in the same words.
    var tally = (!r && v) ? (tallyText(pid, key) || indexTally(idx)) : '';
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
  // one related issue with one, in map order.
  function groupsFor(pid, p) {
    var pm = positionMap(pid, p);
    var out = [];
    Object.keys(MAP).forEach(function (k) {
      var anchor = itemOf(pid, pm, k);
      if (!anchor) return;
      var items = itemsFor(pid, p, k, pm);
      if (items.length) out.push({ issue: anchor, related: items });
    });
    return out;
  }

  // The two parts of one issue's line, stated first.
  function statedPart(it) { return it.dir ? it.word : NO_STATED; }
  function recordPart(it) { return it.rec ? it.recWord : (it.tally || NO_RECORD); }
  // The printed line for one issue:
  // "Label: supports · record runs with", "Label: no stated position · 1 for · 1 against".
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
  function linesHtml(pid, it, openKey, cls, tag) {
    var dirCls = it.dir ? 's-' + it.dir : 's-none';
    var recKind = it.rec ? it.rec : (it.tally ? 'tally' : 'none');
    var recHtml = it.rec
      ? '<span class="pdxri-rec r-' + it.rec + '">' + it.recWord + '</span>'
      : (it.tally ? '<span class="pdxri-tally">' + esc(it.tally) + '</span>'
        : '<span class="pdxri-rec r-none">' + NO_RECORD + '</span>');
    return '<' + tag + ' class="' + cls + '" data-pdxri-key="' + esc(it.key) + '" data-pdxri-line="both"' +
      ' data-pdxri-dir="' + (it.dir || 'none') + '" data-pdxri-rec="' + recKind + '">' +
      nameHtml(pid, it, openKey) + ' <span class="pdxri-dir ' + dirCls + '">' + statedPart(it) + '</span>' +
      '<span class="pdxri-sep"> · </span>' + recHtml + '</' + tag + '>';
  }

  // The person-file section, or '' when no issue has a related line.
  function sectionHtml(pid, p) {
    var groups = groupsFor(pid, p);
    if (!groups.length) return '';
    return '<div id="pdxsec-related-issues" class="modal-section pdxri" data-pid="' + esc(pid) + '">' +
      '<div class="modal-section-title">Related issues</div>' +
      '<ul class="pdxri-groups">' + groups.map(function (g) {
        return '<li class="pdxri-group" data-pdxri-issue="' + esc(g.issue.key) + '">' +
          linesHtml(pid, g.issue, null, 'pdxri-anchor', 'div') +
          '<ul class="pdxri-list">' + g.related.map(function (it) { return linesHtml(pid, it, null, 'pdxri-item', 'li'); }).join('') + '</ul>' +
        '</li>';
      }).join('') + '</ul>' +
    '</div>';
  }

  // The drawer block, or '' when no related issue has a stated or record line.
  function drawerHtml(pid, p, key) {
    if (!key) return '';
    var items = itemsFor(pid, p, key);
    if (!items.length) return '';
    return '<div class="pdxri pdxri-drawer" data-pdxri-drawer="' + esc(key) + '" data-pid="' + esc(pid) + '">' +
      '<div class="pdxri-h">Related issues</div>' +
      '<ul class="pdxri-list">' + items.map(function (it) { return linesHtml(pid, it, key, 'pdxri-item', 'li'); }).join('') + '</ul>' +
    '</div>';
  }

  // ── WHERE THIS CONFLICTS ──────────────────────────────────────────────────
  var CONFLICT_HD = 'Where this conflicts';
  var NO_CONFLICT = 'No conflicts with your stances on these issues.';
  var YOU_WORD = { support: 'support', oppose: 'oppose' };
  var THEY_STATED = { support: 'they support', oppose: 'they oppose' };
  var THEY_RECORD = { 'with': 'their record runs with it', against: 'their record runs against it' };

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
      ? '<ul class="pdxri-cf-list">' + list.map(function (c) {
          return '<li class="pdxri-cf-item" data-pdxri-cf="' + esc(c.bKey) + '">' + c.sides.reduce(function (h, s, i) {
            return h + (i ? ' ' : '') + '<span class="pdxri-cf-side" data-pdxri-cf-how="' + s.how + '">' + (i ? 'On ' : 'on ') +
              esc(s.label) + ' <span class="pdxri-cf-they">' + esc(s.they) + '</span>; ' +
              '<span class="pdxri-cf-you">you ' + YOU_WORD[s.you] + '</span>.</span>';
          }, '<span class="pdxri-cf-pair">' + esc(c.a) + ' and ' + esc(c.b) + ':</span> ') + '</li>';
        }).join('') + '</ul>'
      : '<p class="pdxri-cf-none">' + esc(NO_CONFLICT) + '</p>';
    return '<div class="pdxri-conflicts" data-pdxri-conflicts="' + esc(key) + '" data-pid="' + esc(pid) + '">' +
      '<div class="pdxri-cf-h">' + esc(CONFLICT_HD) + '</div>' + body + '</div>';
  }

  window.PDXRelatedIssues = {
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
    hasVotes: function (pid, key) { return hasVotes(recordRead(pid, key)); },
    sectionHtml: sectionHtml,
    drawerHtml: drawerHtml
  };
})();
