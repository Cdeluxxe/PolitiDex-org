/* ═══════════════════════════════════════════════════════════════════════════
   related-issues.js — linked issue pairs on a person file  ·  window.PDXRelatedIssues
   ────────────────────────────────────────────────────────────────────────────
   Some issues are linked: a position on one bears on the other. Water
   Conservation sits next to Data Centers & Water, and Protect Public Lands sits
   next to Energy & Resource Development. A reader looking at one issue drawer at
   a time cannot see whether a politician's two positions run the same way or
   opposite ways.

   This module prints those pairs side by side, and nothing else:

       Water Conservation: supports · Data Centers & Water: opposes
       Protect Public Lands: supports · Energy & Resource Development: supports

   THE RULES IT KEEPS

   · ONLY THE PAIRS BELOW. Batch 1 is Water / Land / Energy; batch 2 is
     Spending / Entitlement (the "Clean Air & Water" side of the red-tape pair
     is the Practical Stewardship key); batch 3 is Foreign Policy (Israel,
     Iran, Ukraine, defense, war powers, restraint); batch 4 is Education /
     Housing; batch 5 is Guns / Crime; batch 6 is the full audit of the issue
     register (thirty-seven more). Fifty-four pairs in all. The list is closed;
     a pair is never derived from keywords, categories or co-occurrence.

   · ONLY A PUBLISHED DIRECTION, ON BOTH SIDES. A direction is the person's
     documented position on the key, read from window._polPositionMap — the one
     stance map every drawer and both scoring lanes already read. Only "support"
     and "oppose" count. A mixed position, a missing card, or a record-only
     reading on either side means that pair is not printed. With no complete
     pair the section is omitted entirely: no heading, no empty state.

   · NO VERDICT. No score, grade, percentage, count or "contradiction" badge.
     Two directions, side by side. Whether they align or conflict is carried as a
     data attribute for styling and tests, and is never printed as a word.

   · IT READS, IT DOES NOT WRITE. Nothing here touches Direction Match, effect
     lines, or any other section.

   · IN THE ISSUE DRAWER, ONLY THIS ISSUE'S PAIRS. drawerHtml(pid, p, key) is
     the same lines, filtered to the complete pairs that include the issue the
     drawer is open on. consistency.js prints it after the finding line and
     before the vote table. No complete pair on that issue: ''.

   · EACH NAME IS A DOOR. On the person file every issue name in a pair opens
     that issue's drawer for the same person; inside a drawer every name but
     the open issue does, replacing the drawer in place. The doors use the
     shared data-pdxc-gap route, with a /p/<pid>?issue=<key> href to fall back
     on. The line text is unchanged.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXRelatedIssues) return;

  // Order here is print order. Batch 1: Water / Land / Energy.
  var PAIRS = [
    { a: { key: 'water',          label: 'Water Conservation' },
      b: { key: 'datacenter_water', label: 'Data Centers & Water' } },
    { a: { key: 'lands_preserve', label: 'Protect Public Lands' },
      b: { key: 'lands_energy',   label: 'Energy & Resource Development' } },
    { a: { key: 'lands_preserve', label: 'Protect Public Lands' },
      b: { key: 'energy_production', label: 'Expand Domestic Energy Production' } },
    { a: { key: 'water',          label: 'Water Conservation' },
      b: { key: 'energy_production', label: 'Expand Domestic Energy Production' } },

    // Batch 2: Spending / Entitlement.
    { a: { key: 'healthcare',      label: 'Expand Healthcare Access' },
      b: { key: 'cut_spending',    label: 'Cut Federal Spending & Reduce Debt' } },
    { a: { key: 'social_security', label: 'Protect Social Security & Medicare' },
      b: { key: 'national_debt',   label: 'Tackle the National Debt' } },
    { a: { key: 'gov_regulation',  label: 'Cut Federal Red Tape' },
      b: { key: 'enviro_balance',  label: 'Practical Stewardship' } },
    { a: { key: 'healthcare',      label: 'Expand Healthcare Access' },
      b: { key: 'national_debt',   label: 'Tackle the National Debt' } },

    // Batch 3: Foreign-policy tensions. The two border / due-process pairs wait
    // for a Due Process & Immigration Courts issue to exist; they are not here.
    { a: { key: 'israel_support',  label: 'Support for Israel' },
      b: { key: 'restraint',       label: 'Diplomacy & Restraint' } },
    { a: { key: 'strong_defense',  label: 'Peace Through Strength' },
      b: { key: 'war_powers',      label: 'Congress and War Powers' } },
    { a: { key: 'iran_policy',     label: 'Iran' },
      b: { key: 'restraint',       label: 'Diplomacy & Restraint' } },
    { a: { key: 'ukraine_policy',  label: 'Ukraine' },
      b: { key: 'strong_defense',  label: 'Peace Through Strength' } },

    // Batch 4: Education / Housing, on the closest existing keys. "School Choice
    // & Parental Rights" is two keys here, so each gets its own pair; there is
    // no zoning key, so Build More Housing (loosen zoning and permitting) stands
    // in. No Public School Funding or Protect Local Zoning pair: those issues do
    // not exist.
    { a: { key: 'school_choice',   label: 'School Choice & Education Freedom' },
      b: { key: 'public_schools',  label: 'Invest in Public Schools' } },
    { a: { key: 'edu_parental',    label: 'Parental Rights in Schools' },
      b: { key: 'public_schools',  label: 'Invest in Public Schools' } },
    { a: { key: 'housing',         label: 'Housing Affordability' },
      b: { key: 'housing_build',   label: 'Build More Housing' } },

    // Batch 5: Guns / Crime, on the closest existing keys. There is no Red Flag
    // Laws or Assault Weapons Ban key, so those two pairs are not here.
    { a: { key: 'gun_rights',      label: 'Protect Gun Rights' },
      b: { key: 'gun_safety',      label: 'Stronger Gun Safety Laws' } },
    { a: { key: 'tough_on_crime',  label: 'Tough on Crime' },
      b: { key: 'justice_reform',  label: 'Criminal Justice Reform' } },

    // Batch 6: the full audit. Every other pair in the issue register where a
    // position on one side clearly cuts against, or clearly supports, a position
    // on the other. Existing keys and labels only. Middle-position keys (the
    // "⚖️" balance keys) are left out on purpose: they already hold both sides,
    // so a direction on them does not line up against either pole. Near-synonym
    // keys (e.g. Housing Affordability / Affordable Housing & Renters) are left
    // out too: pairing an issue with its own restatement shows nothing.

    // 6a. Land / Energy / Environment.
    { a: { key: 'lands_preserve',  label: 'Protect Public Lands' },
      b: { key: 'gov_regulation',  label: 'Cut Federal Red Tape' } },
    { a: { key: 'water',           label: 'Water Conservation' },
      b: { key: 'lands_preserve',  label: 'Protect Public Lands' } },
    { a: { key: 'lands_keep_public', label: 'Keep Public Lands Public' },
      b: { key: 'lands_local',     label: 'Local Land Control' } },
    { a: { key: 'lands_preserve',  label: 'Protect Public Lands' },
      b: { key: 'permitting_reform', label: 'Faster Permits & Reviews' } },
    { a: { key: 'climate_action',  label: 'Climate Action & Clean Energy' },
      b: { key: 'energy_production', label: 'Expand Domestic Energy Production' } },
    { a: { key: 'climate_action',  label: 'Climate Action & Clean Energy' },
      b: { key: 'gov_regulation',  label: 'Cut Federal Red Tape' } },
    { a: { key: 'datacenter_growth', label: 'Data Centers & AI Growth' },
      b: { key: 'datacenter_water', label: 'Data Centers & Water' } },
    { a: { key: 'datacenter_growth', label: 'Data Centers & AI Growth' },
      b: { key: 'datacenter_power', label: 'Data Centers, Power & Ratepayers' } },

    // 6b. Taxes / Spending.
    { a: { key: 'lower_taxes',     label: 'Cut Income & Business Taxes' },
      b: { key: 'national_debt',   label: 'Tackle the National Debt' } },
    { a: { key: 'lower_taxes',     label: 'Cut Income & Business Taxes' },
      b: { key: 'gov_services',    label: 'Invest in Public Services' } },
    { a: { key: 'cut_spending',    label: 'Cut Federal Spending & Reduce Debt' },
      b: { key: 'gov_services',    label: 'Invest in Public Services' } },
    { a: { key: 'social_security', label: 'Protect Social Security & Medicare' },
      b: { key: 'cut_spending',    label: 'Cut Federal Spending & Reduce Debt' } },
    { a: { key: 'strong_defense',  label: 'Peace Through Strength' },
      b: { key: 'cut_spending',    label: 'Cut Federal Spending & Reduce Debt' } },

    // 6c. Trade / Economy.
    { a: { key: 'tariffs_growth',  label: 'Tariffs & American Industry' },
      b: { key: 'tariffs_prices',  label: 'Tariffs & Household Prices' } },
    { a: { key: 'tariffs_china',   label: 'Tariffs on China & Unfair Trade' },
      b: { key: 'tariffs_prices',  label: 'Tariffs & Household Prices' } },
    { a: { key: 'tariffs_authority', label: 'Tariffs & Trade Authority' },
      b: { key: 'checks_balances', label: 'Congress as a Check on the Executive' } },
    { a: { key: 'econ_growth',     label: 'Pro-Growth Deregulation' },
      b: { key: 'econ_corp_account', label: 'Corporate Accountability' } },

    // 6d. Healthcare.
    { a: { key: 'healthcare_market', label: 'Market-Based Healthcare' },
      b: { key: 'healthcare',      label: 'Expand Healthcare Access' } },

    // 6e. Immigration.
    { a: { key: 'deportations',    label: 'Mass Deportations & Border Security' },
      b: { key: 'immigration_reform', label: 'Pathways to Citizenship' } },
    { a: { key: 'border_security', label: 'Strong Border & Enforcement' },
      b: { key: 'immigration_reform', label: 'Pathways to Citizenship' } },

    // 6f. Crime / Policing.
    { a: { key: 'back_police',     label: 'Back Law Enforcement' },
      b: { key: 'justice_reform',  label: 'Criminal Justice Reform' } },
    { a: { key: 'back_police',     label: 'Back Law Enforcement' },
      b: { key: 'tough_on_crime',  label: 'Tough on Crime' } },
    { a: { key: 'cannabis_reform', label: 'Cannabis Reform' },
      b: { key: 'tough_on_crime',  label: 'Tough on Crime' } },

    // 6g. Rights.
    { a: { key: 'pro_life',        label: 'Pro-Life Protections' },
      b: { key: 'pro_choice',      label: 'Protect Reproductive Rights' } },
    { a: { key: 'religious_liberty', label: 'Religious Liberty Focus' },
      b: { key: 'lgbtq_rights',    label: 'Protect LGBTQ+ Rights' } },

    // 6h. Elections.
    { a: { key: 'voter_id',        label: 'Voter ID & Election Integrity' },
      b: { key: 'voting_access',   label: 'Expand Voting Access' } },
    { a: { key: 'election_integrity', label: 'Election Integrity' },
      b: { key: 'voting_access',   label: 'Expand Voting Access' } },
    { a: { key: 'election_security', label: 'Election Security & Ballot Safeguards' },
      b: { key: 'voting_access',   label: 'Expand Voting Access' } },

    // 6i. Foreign policy.
    { a: { key: 'strong_defense',  label: 'Peace Through Strength' },
      b: { key: 'restraint',       label: 'Diplomacy & Restraint' } },
    { a: { key: 'america_first',   label: 'America First' },
      b: { key: 'restraint',       label: 'Diplomacy & Restraint' } },
    { a: { key: 'america_first_fp', label: 'America First Foreign Aid & Commitments' },
      b: { key: 'ukraine_policy',  label: 'Ukraine' } },
    { a: { key: 'america_first_fp', label: 'America First Foreign Aid & Commitments' },
      b: { key: 'israel_support',  label: 'Support for Israel' } },

    // 6j. Checks on the executive.
    { a: { key: 'war_powers',      label: 'Congress and War Powers' },
      b: { key: 'checks_balances', label: 'Congress as a Check on the Executive' } },
    { a: { key: 'power_of_purse',  label: 'Power of the Purse' },
      b: { key: 'checks_balances', label: 'Congress as a Check on the Executive' } },
    { a: { key: 'judicial_check',  label: 'Court Orders on the Executive' },
      b: { key: 'checks_balances', label: 'Congress as a Check on the Executive' } },

    // 6k. Tech / Education.
    { a: { key: 'tech_innovation', label: 'Innovation & Light Rules' },
      b: { key: 'privacy_rights',  label: 'Privacy & Big-Tech Accountability' } },
    { a: { key: 'school_choice',   label: 'School Choice & Education Freedom' },
      b: { key: 'edu_parental',    label: 'Parental Rights in Schools' } }
  ];

  var WORD = { support: 'supports', oppose: 'opposes' };

  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
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

  // Every pair this person has a published direction on, both sides.
  function pairsFor(pid, p) {
    var pm = positionMap(pid, p);
    var out = [];
    PAIRS.forEach(function (pr) {
      var da = directionOf(pm, pr.a.key), db = directionOf(pm, pr.b.key);
      if (!da || !db) return;
      out.push({
        a: { key: pr.a.key, label: pr.a.label, dir: da, word: WORD[da] },
        b: { key: pr.b.key, label: pr.b.label, dir: db, word: WORD[db] },
        relation: da === db ? 'align' : 'conflict'
      });
    });
    return out;
  }

  function lineText(r) {
    return r.a.label + ': ' + r.a.word + ' · ' + r.b.label + ': ' + r.b.word;
  }

  // The address an issue door falls back to without the click route: the same
  // person file, opened on that issue.
  function issueHref(pid, key) {
    try {
      var P = window.PDXPerson;
      if (P && typeof P.cardPath === 'function') { var h = P.cardPath(pid, key); if (h) return h; }
    } catch (e) { /* plain address below */ }
    return '/p/' + encodeURIComponent(pid) + '?issue=' + encodeURIComponent(key);
  }

  // One issue name. A door into that issue's drawer for this person (the shared
  // data-pdxc-gap route consistency.js handles, which swaps an open drawer for
  // the new issue), except the issue already open, which stays plain text.
  function issueHtml(pid, side, openKey) {
    if (!pid || side.key === openKey) {
      return '<span class="pdxri-issue">' + esc(side.label) + ':</span>';
    }
    return '<span class="pdxri-issue"><a class="pdxri-go" href="' + esc(issueHref(pid, side.key)) + '"' +
      ' data-pdxri-go="' + esc(side.key) + '" data-pdxc-gap="' + esc(side.key) + '" data-pdxc-gap-pid="' + esc(pid) + '"' +
      ' aria-label="' + esc('Open ' + side.label + ' for this file') + '">' + esc(side.label) + '</a>:</span>';
  }

  function lineHtml(r, pid, openKey) {
    return '<li class="pdxri-pair" data-pdxri-a="' + esc(r.a.key) + '" data-pdxri-b="' + esc(r.b.key) +
        '" data-pdxri-rel="' + r.relation + '">' +
      '<span class="pdxri-side">' + issueHtml(pid, r.a, openKey) + ' ' +
        '<span class="pdxri-dir s-' + r.a.dir + '">' + r.a.word + '</span></span>' +
      '<span class="pdxri-sep" aria-hidden="true"> · </span>' +
      '<span class="pdxri-side">' + issueHtml(pid, r.b, openKey) + ' ' +
        '<span class="pdxri-dir s-' + r.b.dir + '">' + r.b.word + '</span></span>' +
    '</li>';
  }

  // The whole section, or '' when there is no complete pair.
  function sectionHtml(pid, p) {
    var rows = pairsFor(pid, p);
    if (!rows.length) return '';
    return '<div id="pdxsec-related-issues" class="modal-section pdxri" data-pid="' + esc(pid) + '">' +
      '<div class="modal-section-title">Related issues</div>' +
      '<ul class="pdxri-list">' + rows.map(function (r) { return lineHtml(r, pid, null); }).join('') + '</ul>' +
    '</div>';
  }

  // The complete pairs that include `key`, in list order.
  function pairsForIssue(pid, p, key) {
    if (!key) return [];
    return pairsFor(pid, p).filter(function (r) { return r.a.key === key || r.b.key === key; });
  }

  // The drawer block, or '' when no complete pair includes this issue.
  function drawerHtml(pid, p, key) {
    var rows = pairsForIssue(pid, p, key);
    if (!rows.length) return '';
    return '<div class="pdxri pdxri-drawer" data-pdxri-drawer="' + esc(key) + '" data-pid="' + esc(pid) + '">' +
      '<div class="pdxri-h">Related issues</div>' +
      '<ul class="pdxri-list">' + rows.map(function (r) { return lineHtml(r, pid, key); }).join('') + '</ul>' +
    '</div>';
  }

  window.PDXRelatedIssues = {
    PAIRS: PAIRS,
    pairsFor: pairsFor,
    pairsForIssue: pairsForIssue,
    drawerHtml: drawerHtml,
    lineText: lineText,
    sectionHtml: sectionHtml
  };
})();
