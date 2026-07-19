/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — Federal Spending Tracker  ·  window.PDXContracts
   ────────────────────────────────────────────────────────────────────────────
   A neutral, sourced transparency layer over major U.S. federal contracting.
   PolitiDex already tracks what politicians SAY (stances) and DO (voting record);
   this surface tracks where a large share of the money GOES — the companies that
   win federal contracts, the agencies that award them, and the states where the
   work lands. It is the data companion to the "Government Contracting, Influence
   & Waste" Issue Spotlight.

   POSTURE — factual, neutral, transparency-first:
     • Every entry is a matter of public record and carries a source link.
     • Figures are ROUNDED, approximate, and drawn from public data (USAspending.gov,
       GAO, and agency releases). They are order-of-magnitude context, not the
       authoritative number — the source link always points at the system of record.
     • Geographic linkage (a contract → a state → the officials who represent it)
       is exactly that: geographic. It NEVER implies an official steered, caused,
       or benefited from an award. It answers "what major federal money flows
       through this place?", which is a transparency question, not an accusation.
       This mirrors CONTENT_STYLE.md: state facts, not insinuation.

   This is CURATED EDITORIAL CONTENT shipped in the client bundle — the same class
   as Issue Spotlights, stances and Say-vs-Do receipts, and small enough to live
   client-side (unlike the roll-call voting record, which is DB-backed because its
   volume is far too large to bundle). If the dataset ever outgrows the bundle it
   can move behind a read-only /api/contracts Function following the vr_* pattern
   with no change to the surfaces below.

   Exposes:
     window.PDXContracts.list()                    all contract records
     window.PDXContracts.get(id)                   one record
     window.PDXContracts.facets()                  {agencies,recipients,states,categories,issues}
     window.PDXContracts.byState(stateNameOrAbbr)  records tied to a state
     window.PDXContracts.open(filters)             open the filterable tracker overlay
     window._renderMajorContracts(id, p)           profile "Major Contracts in Their
                                                    State/District" section (or '')
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXContracts) return; // idempotent

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function issueLabel(k) {
    try { if (typeof window._issueLabel === 'function') { var l = window._issueLabel(k); if (l) return l; } } catch (e) {}
    return String(k || '').replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  // ── U.S. state name ⇄ postal-abbreviation ladder ────────────────────────────
  // Politician records store `state` inconsistently ("Utah" or "UT"); contracts
  // store the postal abbr. This lets either side match the other.
  var STATE_NAME = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
    CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
    FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
    IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
    ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
    MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
    NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
    NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
    PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
    TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
    WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming'
  };
  var NAME_TO_ABBR = (function () {
    var m = {};
    Object.keys(STATE_NAME).forEach(function (a) { m[STATE_NAME[a].toLowerCase()] = a; });
    return m;
  })();
  function toAbbr(s) {
    if (!s) return '';
    var v = String(s).trim();
    if (v.length === 2 && STATE_NAME[v.toUpperCase()]) return v.toUpperCase();
    return NAME_TO_ABBR[v.toLowerCase()] || '';
  }
  function stateLabel(abbr) { return STATE_NAME[abbr] || abbr || ''; }

  // ── Category metadata (icon + label + accent) ───────────────────────────────
  var CATS = {
    defense:  { icon: '🛡️', label: 'Defense & Weapons', accent: '#f6a56b' },
    it:       { icon: '💻', label: 'IT & Consulting', accent: '#7fb4ff' },
    health:   { icon: '🩺', label: 'Health & Medical', accent: '#7ee0c0' },
    energy:   { icon: '⚡', label: 'Energy & Nuclear', accent: '#f5d873' },
    space:    { icon: '🚀', label: 'Space & Launch', accent: '#c4b5fd' },
    other:    { icon: '📦', label: 'Other', accent: '#9fb4d4' }
  };
  function catMeta(k) { return CATS[k] || CATS.other; }

  // Money formatter — compact, honest ("~$65B").
  function money(n) {
    if (!n || n <= 0) return '—';
    if (n >= 1e12) return '~$' + (n / 1e12).toFixed(n >= 1e13 ? 0 : 1).replace(/\.0$/, '') + 'T';
    if (n >= 1e9) return '~$' + Math.round(n / 1e9) + 'B';
    if (n >= 1e6) return '~$' + Math.round(n / 1e6) + 'M';
    return '$' + n.toLocaleString();
  }

  var SP_SPOTLIGHT = 'government-contracting-influence-waste'; // the companion Spotlight

  // ── The curated record ──────────────────────────────────────────────────────
  // Each entry is a well-documented federal contracting relationship. `amount` is a
  // ROUNDED, approximate figure (recent-year obligations unless the `basis` says
  // otherwise) — see the module header. `state` is the primary place of performance
  // / principal facility, used only for geographic context. `issueKeys` use the
  // shipped ISSUE_MAP vocabulary so entries line up with stances and spotlights.
  var CONTRACTS = [
    { id: 'lockheed-f35', recipient: 'Lockheed Martin', agency: 'Department of Defense', agencyShort: 'DoD',
      category: 'defense', state: 'TX', amount: 65e9, basis: 'Approx. recent-year federal obligations',
      description: 'The largest federal contractor. Prime on the F-35 Lightning II fighter, whose full lifecycle cost the GAO has estimated at over $2 trillion — the most expensive weapons program in U.S. history. Also builds missiles, satellites and helicopters.',
      issueKeys: ['strong_defense', 'gov_waste', 'national_debt'],
      source: { label: 'GAO — F-35 sustainment cost report', url: 'https://www.gao.gov/products/gao-23-106217' } },

    { id: 'rtx-missiles', recipient: 'RTX (Raytheon)', agency: 'Department of Defense', agencyShort: 'DoD',
      category: 'defense', state: 'AZ', amount: 30e9, basis: 'Approx. recent-year federal obligations',
      description: 'Major missile and air-defense contractor — Patriot, Stinger, Tomahawk and related systems. A large share of orders has surged with allied resupply since 2022.',
      issueKeys: ['strong_defense', 'foreign_balance'],
      source: { label: 'USAspending.gov — federal award data', url: 'https://www.usaspending.gov/' } },

    { id: 'boeing-defense', recipient: 'Boeing', agency: 'Department of Defense', agencyShort: 'DoD',
      category: 'defense', state: 'WA', amount: 30e9, basis: 'Approx. recent-year federal obligations',
      description: 'Builds the KC-46 tanker, F-15EX and F/A-18, plus space and NASA work. Several fixed-price programs (KC-46, Air Force One) have run billions over budget, with the company absorbing charges.',
      issueKeys: ['strong_defense', 'gov_waste'],
      source: { label: 'USAspending.gov — federal award data', url: 'https://www.usaspending.gov/' } },

    { id: 'gd-submarines', recipient: 'General Dynamics', agency: 'Department of the Navy', agencyShort: 'Navy',
      category: 'defense', state: 'CT', amount: 30e9, basis: 'Approx. recent-year federal obligations',
      description: 'Through Electric Boat, the prime builder of the Navy’s Virginia- and Columbia-class submarines; also armored vehicles and, via GDIT, large IT services contracts.',
      issueKeys: ['strong_defense'],
      source: { label: 'USAspending.gov — federal award data', url: 'https://www.usaspending.gov/' } },

    { id: 'northrop-sentinel', recipient: 'Northrop Grumman', agency: 'Department of Defense', agencyShort: 'DoD',
      category: 'defense', state: 'UT', amount: 25e9, basis: 'Approx. recent-year federal obligations',
      description: 'Prime on the B-21 Raider bomber and the Sentinel intercontinental ballistic missile — the latter with major work in Utah. The Sentinel program breached a cost-overrun threshold in 2024, triggering a mandatory review.',
      issueKeys: ['strong_defense', 'gov_waste', 'national_debt'],
      source: { label: 'GAO — Sentinel ICBM program', url: 'https://www.gao.gov/products/gao-24-107310' } },

    { id: 'hii-carriers', recipient: 'Huntington Ingalls Industries', agency: 'Department of the Navy', agencyShort: 'Navy',
      category: 'defense', state: 'VA', amount: 10e9, basis: 'Approx. recent-year federal obligations',
      description: 'The nation’s largest military shipbuilder; sole builder of aircraft carriers (Newport News) and a major builder of amphibious and surface ships.',
      issueKeys: ['strong_defense'],
      source: { label: 'USAspending.gov — federal award data', url: 'https://www.usaspending.gov/' } },

    { id: 'spacex-launch', recipient: 'SpaceX', agency: 'NASA / U.S. Space Force', agencyShort: 'NASA/USSF',
      category: 'space', state: 'CA', amount: 3e9, basis: 'Approx. recent-year federal obligations',
      description: 'Provides launch services and, via Crew Dragon, astronaut transport to the ISS under NASA’s Commercial Crew program. National-security launch awards have grown its federal footprint.',
      issueKeys: ['strong_defense', 'econ_growth'],
      source: { label: 'USAspending.gov — federal award data', url: 'https://www.usaspending.gov/' } },

    { id: 'leidos-services', recipient: 'Leidos', agency: 'Multiple (DoD, VA, DHS)', agencyShort: 'Multi',
      category: 'it', state: 'VA', amount: 15e9, basis: 'Approx. recent-year federal obligations',
      description: 'One of the largest IT and technical-services contractors, spanning defense systems, veterans’ health record support and airport security screening technology.',
      issueKeys: ['gov_services', 'veterans'],
      source: { label: 'USAspending.gov — federal award data', url: 'https://www.usaspending.gov/' } },

    { id: 'booz-allen', recipient: 'Booz Allen Hamilton', agency: 'Multiple (defense & intelligence)', agencyShort: 'Multi',
      category: 'it', state: 'VA', amount: 7e9, basis: 'Approx. recent-year federal obligations',
      description: 'A management- and technology-consulting firm that earns nearly all of its revenue from the federal government — a frequently cited example in the debate over reliance on outside consultants.',
      issueKeys: ['gov_waste', 'gov_transparency'],
      source: { label: 'USAspending.gov — federal award data', url: 'https://www.usaspending.gov/' } },

    { id: 'caci-intel', recipient: 'CACI International', agency: 'Multiple (DoD & intelligence)', agencyShort: 'Multi',
      category: 'it', state: 'VA', amount: 6e9, basis: 'Approx. recent-year federal obligations',
      description: 'Provides IT, intelligence and engineering services across defense and national-security agencies.',
      issueKeys: ['strong_defense', 'gov_services'],
      source: { label: 'USAspending.gov — federal award data', url: 'https://www.usaspending.gov/' } },

    { id: 'accenture-fed', recipient: 'Accenture Federal Services', agency: 'Multiple (HHS, Treasury/IRS)', agencyShort: 'Multi',
      category: 'it', state: 'DC', amount: 5e9, basis: 'Approx. recent-year federal obligations',
      description: 'A large civilian-agency IT contractor; has held major modernization work including support for federal health and tax systems.',
      issueKeys: ['gov_services'],
      source: { label: 'USAspending.gov — federal award data', url: 'https://www.usaspending.gov/' } },

    { id: 'maximus-cms', recipient: 'Maximus', agency: 'Health & Human Services (CMS)', agencyShort: 'HHS',
      category: 'health', state: 'VA', amount: 4e9, basis: 'Approx. recent-year federal obligations',
      description: 'Runs federal contact centers and eligibility-and-enrollment operations for Medicare, the ACA marketplace and other benefit programs.',
      issueKeys: ['healthcare', 'gov_services'],
      source: { label: 'USAspending.gov — federal award data', url: 'https://www.usaspending.gov/' } },

    { id: 'deloitte-consult', recipient: 'Deloitte', agency: 'Multiple (civilian & defense)', agencyShort: 'Multi',
      category: 'it', state: 'DC', amount: 5e9, basis: 'Approx. recent-year federal obligations',
      description: 'One of the largest federal consulting vendors, with system-modernization and advisory contracts across many agencies — central to the recurring debate over consultant spending.',
      issueKeys: ['gov_waste', 'gov_transparency'],
      source: { label: 'USAspending.gov — federal award data', url: 'https://www.usaspending.gov/' } },

    { id: 'palantir-data', recipient: 'Palantir Technologies', agency: 'U.S. Army / DHS', agencyShort: 'Army/DHS',
      category: 'it', state: 'CO', amount: 1e9, basis: 'Approx. recent-year federal obligations',
      description: 'Data-integration and analytics platforms for the Army and immigration agencies. Won an early contract after successfully protesting an Army procurement in court — a noted case in competition debates.',
      issueKeys: ['strong_defense', 'border_security', 'gov_transparency'],
      source: { label: 'USAspending.gov — federal award data', url: 'https://www.usaspending.gov/' } },

    { id: 'pfizer-vaccine', recipient: 'Pfizer', agency: 'Health & Human Services (BARDA)', agencyShort: 'HHS',
      category: 'health', state: 'NY', amount: 5e9, basis: 'COVID-19 vaccine purchase agreements',
      description: 'Supplied COVID-19 vaccines under multibillion-dollar federal purchase agreements during the pandemic response — a large, fast, emergency-authority contracting effort.',
      issueKeys: ['healthcare', 'gov_waste'],
      source: { label: 'USAspending.gov — federal award data', url: 'https://www.usaspending.gov/' } },

    { id: 'moderna-vaccine', recipient: 'Moderna', agency: 'Health & Human Services (BARDA)', agencyShort: 'HHS',
      category: 'health', state: 'MA', amount: 5e9, basis: 'COVID-19 vaccine development & purchase',
      description: 'Developed and supplied a COVID-19 vaccine with substantial federal development funding and advance-purchase commitments through Operation Warp Speed.',
      issueKeys: ['healthcare', 'gov_waste'],
      source: { label: 'USAspending.gov — federal award data', url: 'https://www.usaspending.gov/' } },

    { id: 'bechtel-hanford', recipient: 'Bechtel', agency: 'Department of Energy', agencyShort: 'DOE',
      category: 'energy', state: 'WA', amount: 3e9, basis: 'Approx. recent-year federal obligations',
      description: 'Lead contractor on the Hanford Waste Treatment Plant, a decades-long nuclear-cleanup megaproject that the GAO has repeatedly flagged for schedule slips and cost growth.',
      issueKeys: ['gov_waste', 'enviro_balance'],
      source: { label: 'GAO — Hanford cleanup (High-Risk area)', url: 'https://www.gao.gov/highrisk/doe-environmental-liability' } },

    { id: 'honeywell-fmt', recipient: 'Honeywell (FM&T)', agency: 'Energy / NNSA', agencyShort: 'DOE/NNSA',
      category: 'energy', state: 'MO', amount: 5e9, basis: 'Approx. recent-year federal obligations',
      description: 'Operates the Kansas City National Security Campus, producing most non-nuclear components for the nation’s nuclear-weapons stockpile.',
      issueKeys: ['strong_defense'],
      source: { label: 'USAspending.gov — federal award data', url: 'https://www.usaspending.gov/' } },

    { id: 'fluor-savannah', recipient: 'Fluor', agency: 'Department of Energy', agencyShort: 'DOE',
      category: 'energy', state: 'SC', amount: 3e9, basis: 'Approx. recent-year federal obligations',
      description: 'Engineering, cleanup and logistics contractor; part of management teams at Energy Department nuclear sites such as Savannah River.',
      issueKeys: ['gov_services', 'enviro_balance'],
      source: { label: 'USAspending.gov — federal award data', url: 'https://www.usaspending.gov/' } },

    { id: 'kbr-logistics', recipient: 'KBR', agency: 'Department of Defense', agencyShort: 'DoD',
      category: 'defense', state: 'TX', amount: 4e9, basis: 'Approx. recent-year federal obligations',
      description: 'Military logistics and engineering services. Successor to work under the Army’s LOGCAP battlefield-support contracts, a long-running subject of oversight and audit.',
      issueKeys: ['strong_defense', 'gov_waste'],
      source: { label: 'USAspending.gov — federal award data', url: 'https://www.usaspending.gov/' } },

    { id: 'oshkosh-jltv', recipient: 'Oshkosh Defense', agency: 'U.S. Army', agencyShort: 'Army',
      category: 'defense', state: 'WI', amount: 2e9, basis: 'Approx. recent-year federal obligations',
      description: 'Built the Joint Light Tactical Vehicle (JLTV) that replaced the Humvee; the follow-on production award later moved to a competitor after a re-compete.',
      issueKeys: ['strong_defense'],
      source: { label: 'USAspending.gov — federal award data', url: 'https://www.usaspending.gov/' } },

    { id: 'bae-combat', recipient: 'BAE Systems', agency: 'Department of Defense', agencyShort: 'DoD',
      category: 'defense', state: 'VA', amount: 6e9, basis: 'Approx. recent-year federal obligations',
      description: 'Combat vehicles, munitions and electronics for U.S. forces (the U.S. arm of a UK-based defense firm).',
      issueKeys: ['strong_defense'],
      source: { label: 'USAspending.gov — federal award data', url: 'https://www.usaspending.gov/' } },

    { id: 'l3harris-comms', recipient: 'L3Harris Technologies', agency: 'Department of Defense', agencyShort: 'DoD',
      category: 'defense', state: 'FL', amount: 5e9, basis: 'Approx. recent-year federal obligations',
      description: 'Tactical communications, electronic warfare and space sensors for the military and intelligence community.',
      issueKeys: ['strong_defense'],
      source: { label: 'USAspending.gov — federal award data', url: 'https://www.usaspending.gov/' } },

    { id: 'aws-cloud', recipient: 'Amazon Web Services', agency: 'DoD / Intelligence (JWCC)', agencyShort: 'DoD/IC',
      category: 'it', state: 'WA', amount: 3e9, basis: 'Approx. recent-year federal obligations',
      description: 'A cloud provider on the Pentagon’s multi-vendor JWCC contract and a longstanding intelligence-community cloud vendor.',
      issueKeys: ['strong_defense', 'gov_services'],
      source: { label: 'USAspending.gov — federal award data', url: 'https://www.usaspending.gov/' } },

    { id: 'microsoft-cloud', recipient: 'Microsoft', agency: 'DoD / civilian agencies', agencyShort: 'Multi',
      category: 'it', state: 'WA', amount: 2e9, basis: 'Approx. recent-year federal obligations',
      description: 'Cloud, productivity and security software across the government, including a share of the Pentagon’s JWCC cloud contract.',
      issueKeys: ['gov_services', 'strong_defense'],
      source: { label: 'USAspending.gov — federal award data', url: 'https://www.usaspending.gov/' } },

    { id: 'mckesson-rx', recipient: 'McKesson', agency: 'VA / HHS', agencyShort: 'VA/HHS',
      category: 'health', state: 'TX', amount: 8e9, basis: 'Approx. recent-year federal obligations',
      description: 'A pharmaceutical distributor supplying drugs and medical products to the Department of Veterans Affairs and federal health programs.',
      issueKeys: ['healthcare', 'veterans'],
      source: { label: 'USAspending.gov — federal award data', url: 'https://www.usaspending.gov/' } }
  ];

  // Attach the companion Spotlight to every record (kept out of the data above to
  // avoid repetition). Records may add their own extra spotlight slugs later.
  CONTRACTS.forEach(function (c) {
    c.spotlights = [SP_SPOTLIGHT].concat(c.spotlights || []);
    c.stateLabel = stateLabel(c.state);
  });

  var _byId = {};
  CONTRACTS.forEach(function (c) { _byId[c.id] = c; });

  // ── Public data helpers ─────────────────────────────────────────────────────
  function list() { return CONTRACTS.slice(); }
  function get(id) { return _byId[id] || null; }

  function facets() {
    var agencies = {}, recipients = {}, states = {}, categories = {}, issues = {};
    CONTRACTS.forEach(function (c) {
      agencies[c.agency] = (agencies[c.agency] || 0) + 1;
      recipients[c.recipient] = (recipients[c.recipient] || 0) + 1;
      if (c.state) states[c.state] = (states[c.state] || 0) + 1;
      categories[c.category] = (categories[c.category] || 0) + 1;
      (c.issueKeys || []).forEach(function (k) { issues[k] = (issues[k] || 0) + 1; });
    });
    return { agencies: agencies, recipients: recipients, states: states, categories: categories, issues: issues };
  }

  // Records tied to a state, by postal abbr or full name. Total federal dollars
  // (the sortable amount) descending, so the biggest awards surface first.
  function byState(stateNameOrAbbr) {
    var abbr = toAbbr(stateNameOrAbbr);
    if (!abbr) return [];
    return CONTRACTS.filter(function (c) { return c.state === abbr; })
      .sort(function (a, b) { return (b.amount || 0) - (a.amount || 0); });
  }

  // Top contractors by combined dollar volume. Aggregates every tracked award to
  // its recipient (so a company with multiple rows is summed once), then returns
  // the biggest `n` with a representative category (their largest single award's
  // category) for accent color. Powers the Spotlight's "Top Contractors" visual.
  function topRecipients(n) {
    var byRec = {};
    CONTRACTS.forEach(function (c) {
      var r = byRec[c.recipient] || (byRec[c.recipient] = { recipient: c.recipient, amount: 0, count: 0, category: c.category, _top: 0 });
      r.amount += (c.amount || 0);
      r.count += 1;
      if ((c.amount || 0) >= r._top) { r._top = c.amount || 0; r.category = c.category; }
    });
    return Object.keys(byRec).map(function (k) { return byRec[k]; })
      .sort(function (a, b) { return b.amount - a.amount; })
      .slice(0, n || 5);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // The filterable tracker overlay
  // ─────────────────────────────────────────────────────────────────────────────
  var _state = { q: '', agency: '', recipient: '', stateAbbr: '', category: '', issue: '', sort: 'amount' };
  var _wrap = null;

  function injectCss() {
    if (document.getElementById('gcx-css')) return;
    var css =
      '.gcx-overlay{position:fixed;inset:0;z-index:9600;display:flex;flex-direction:column;background:rgba(6,10,20,.94);' +
        'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}' +
      '.gcx-overlay[hidden]{display:none;}' +
      '.gcx-shell{max-width:70rem;width:100%;margin:0 auto;display:flex;flex-direction:column;height:100%;padding:0 1rem;}' +
      '.gcx-top{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;padding:1.1rem 0 .5rem;}' +
      '.gcx-eyebrow{font:700 .68rem/1 "Barlow Condensed",sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#7fb4ff;}' +
      '.gcx-title{font:800 clamp(1.5rem,4vw,2.3rem)/1 "Bebas Neue","Barlow Condensed",sans-serif;letter-spacing:.03em;color:#fff;margin:.25rem 0 .2rem;}' +
      '.gcx-sub{font:500 .85rem/1.5 "Barlow",sans-serif;color:#9fb4d4;max-width:46rem;}' +
      '.gcx-close{flex-shrink:0;background:rgba(159,180,212,.1);border:1px solid rgba(159,180,212,.28);color:#dbe6f7;' +
        'border-radius:.6rem;cursor:pointer;font-size:1.2rem;line-height:1;padding:.5rem .7rem;}' +
      '.gcx-close:hover{background:rgba(159,180,212,.2);color:#fff;}' +
      '.gcx-note{font:500 .72rem/1.5 "Barlow",sans-serif;color:#8aa0c4;background:rgba(96,165,250,.06);' +
        'border:1px solid rgba(96,165,250,.18);border-radius:.6rem;padding:.55rem .75rem;margin:.2rem 0 .7rem;}' +
      '.gcx-controls{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;padding-bottom:.6rem;}' +
      '.gcx-search{flex:1;min-width:12rem;display:flex;align-items:center;gap:.5rem;background:rgba(10,15,30,.7);' +
        'border:1px solid rgba(159,180,212,.28);border-radius:.7rem;padding:.55rem .8rem;}' +
      '.gcx-search:focus-within{border-color:rgba(96,165,250,.55);}' +
      '.gcx-search input{flex:1;background:transparent;border:0;outline:0;color:#e6eefc;font:500 .92rem/1.2 "Barlow",sans-serif;min-width:0;}' +
      '.gcx-search input::placeholder{color:#6d84a8;}' +
      '.gcx-sel{background:rgba(10,15,30,.7);color:#e6eefc;border:1px solid rgba(159,180,212,.24);border-radius:.55rem;' +
        'padding:.5rem .55rem;font:500 .8rem/1 "Barlow",sans-serif;max-width:100%;}' +
      '.gcx-reset{cursor:pointer;font:700 .7rem/1 "Barlow Condensed",sans-serif;letter-spacing:.05em;text-transform:uppercase;' +
        'color:#9ec8ff;background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.32);border-radius:999px;padding:.5rem .8rem;}' +
      '.gcx-reset:hover{background:rgba(96,165,250,.2);}' +
      '.gcx-count{font:700 .68rem/1 "Barlow Condensed",sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#7d97bd;padding:.1rem 0 .6rem;}' +
      '.gcx-list{flex:1;overflow-y:auto;display:grid;gap:.7rem;grid-template-columns:repeat(auto-fill,minmax(19rem,1fr));' +
        'align-content:start;padding-bottom:1.4rem;}' +
      '.gcx-card{display:flex;flex-direction:column;gap:.4rem;background:linear-gradient(160deg,rgba(18,28,48,.9),rgba(11,18,33,.94));' +
        'border:1px solid rgba(159,180,212,.14);border-left:3px solid var(--gcx-accent,#7fb4ff);border-radius:.8rem;padding:.85rem .9rem;}' +
      '.gcx-card-top{display:flex;align-items:baseline;justify-content:space-between;gap:.5rem;}' +
      '.gcx-recipient{font:700 1rem/1.2 "Barlow Condensed",sans-serif;color:#fff;}' +
      '.gcx-amount{font:800 1.05rem/1 "Bebas Neue","Barlow Condensed",sans-serif;letter-spacing:.02em;color:#9ff0bd;white-space:nowrap;}' +
      '.gcx-meta{display:flex;flex-wrap:wrap;gap:.3rem;}' +
      '.gcx-pill{font:700 .58rem/1 "Barlow Condensed",sans-serif;letter-spacing:.04em;text-transform:uppercase;' +
        'border-radius:999px;padding:.22rem .5rem;color:#bcd0f0;background:rgba(96,165,250,.12);border:1px solid rgba(96,165,250,.28);}' +
      '.gcx-pill.cat{color:#0a0f1e;}' +
      '.gcx-desc{font:500 .8rem/1.45 "Barlow",sans-serif;color:#a9bdd9;}' +
      '.gcx-basis{font:500 .64rem/1.3 "Barlow Condensed",sans-serif;letter-spacing:.03em;text-transform:uppercase;color:#6d84a8;}' +
      '.gcx-links{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.15rem;padding-top:.35rem;border-top:1px solid rgba(159,180,212,.1);}' +
      '.gcx-link{cursor:pointer;font:700 .64rem/1 "Barlow Condensed",sans-serif;letter-spacing:.04em;text-transform:uppercase;' +
        'color:#9ec8ff;background:none;border:1px solid rgba(96,165,250,.3);border-radius:999px;padding:.28rem .55rem;text-decoration:none;display:inline-block;}' +
      '.gcx-link:hover{background:rgba(96,165,250,.16);}' +
      '.gcx-empty{grid-column:1/-1;text-align:center;color:#8aa0c4;font:500 .9rem/1.5 "Barlow",sans-serif;padding:2rem 1rem;}' +
      '@media (max-width:640px){.gcx-list{grid-template-columns:1fr;}.gcx-search{min-width:100%;}}';
    var st = document.createElement('style');
    st.id = 'gcx-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function passes(c) {
    if (_state.agency && c.agency !== _state.agency) return false;
    if (_state.recipient && c.recipient !== _state.recipient) return false;
    if (_state.stateAbbr && c.state !== _state.stateAbbr) return false;
    if (_state.category && c.category !== _state.category) return false;
    if (_state.issue && (c.issueKeys || []).indexOf(_state.issue) < 0) return false;
    if (_state.q) {
      var hay = (c.recipient + ' ' + c.agency + ' ' + c.stateLabel + ' ' + c.description + ' ' +
        (c.issueKeys || []).map(issueLabel).join(' ')).toLowerCase();
      var terms = _state.q.toLowerCase().split(/\s+/).filter(Boolean);
      for (var i = 0; i < terms.length; i++) if (hay.indexOf(terms[i]) < 0) return false;
    }
    return true;
  }

  function sorted(rows) {
    var r = rows.slice();
    if (_state.sort === 'amount_asc') r.sort(function (a, b) { return (a.amount || 0) - (b.amount || 0); });
    else if (_state.sort === 'recipient') r.sort(function (a, b) { return a.recipient.localeCompare(b.recipient); });
    else r.sort(function (a, b) { return (b.amount || 0) - (a.amount || 0); });
    return r;
  }

  function optionList(map, labelFn) {
    return Object.keys(map).sort(function (a, b) {
      return (labelFn ? labelFn(a) : a).localeCompare(labelFn ? labelFn(b) : b);
    }).map(function (k) {
      return { value: k, label: (labelFn ? labelFn(k) : k) + ' (' + map[k] + ')' };
    });
  }

  function selHtml(id, label, opts, current) {
    var o = '<option value="">' + esc(label) + '</option>' + opts.map(function (op) {
      return '<option value="' + esc(op.value) + '"' + (op.value === current ? ' selected' : '') + '>' + esc(op.label) + '</option>';
    }).join('');
    return '<select class="gcx-sel" data-gcx="' + id + '">' + o + '</select>';
  }

  function cardHtml(c) {
    var cm = catMeta(c.category);
    var issueTags = (c.issueKeys || []).slice(0, 3).map(function (k) {
      return '<span class="gcx-pill" data-gcx-issue="' + esc(k) + '" style="cursor:pointer;">' + esc(issueLabel(k)) + '</span>';
    }).join('');
    var links = [];
    // Connect the dots → the companion Spotlight.
    (c.spotlights || []).forEach(function (slug) {
      links.push('<button type="button" class="gcx-link" data-gcx-spotlight="' + esc(slug) + '">📌 Related Spotlight</button>');
    });
    // Connect the dots → officials who represent this state.
    if (c.state) {
      links.push('<button type="button" class="gcx-link" data-gcx-state="' + esc(c.state) + '">🏛 ' + esc(c.stateLabel) + ' officials</button>');
    }
    // The system of record.
    if (c.source && c.source.url) {
      links.push('<a class="gcx-link" href="' + esc(c.source.url) + '" target="_blank" rel="noopener noreferrer">🔗 ' + esc(c.source.label || 'Source') + '</a>');
    }
    return '<div class="gcx-card" style="--gcx-accent:' + cm.accent + ';">' +
      '<div class="gcx-card-top"><span class="gcx-recipient">' + esc(c.recipient) + '</span>' +
        '<span class="gcx-amount">' + money(c.amount) + '</span></div>' +
      '<div class="gcx-meta">' +
        '<span class="gcx-pill cat" style="background:' + cm.accent + ';border-color:' + cm.accent + ';">' + cm.icon + ' ' + esc(cm.label) + '</span>' +
        '<span class="gcx-pill">' + esc(c.agencyShort || c.agency) + '</span>' +
        (c.state ? '<span class="gcx-pill" data-gcx-state="' + esc(c.state) + '" style="cursor:pointer;">📍 ' + esc(c.stateLabel) + '</span>' : '') +
      '</div>' +
      '<div class="gcx-desc">' + esc(c.description) + '</div>' +
      (c.basis ? '<div class="gcx-basis">' + esc(c.basis) + '</div>' : '') +
      (issueTags ? '<div class="gcx-meta">' + issueTags + '</div>' : '') +
      '<div class="gcx-links">' + links.join('') + '</div>' +
    '</div>';
  }

  function apply() {
    if (!_wrap) return;
    var rows = sorted(CONTRACTS.filter(passes));
    var list = _wrap.querySelector('#gcx-list');
    var count = _wrap.querySelector('#gcx-count');
    list.innerHTML = rows.length
      ? rows.map(cardHtml).join('')
      : '<div class="gcx-empty">No contracts match these filters. Try clearing them.</div>';
    if (count) {
      var total = rows.reduce(function (s, c) { return s + (c.amount || 0); }, 0);
      count.textContent = 'Showing ' + rows.length + ' of ' + CONTRACTS.length + ' tracked contracts · ' + money(total) + ' combined (approx.)';
    }
    wireCards();
  }

  function wireCards() {
    if (!_wrap) return;
    _wrap.querySelectorAll('[data-gcx-spotlight]').forEach(function (b) {
      b.addEventListener('click', function () {
        var slug = b.getAttribute('data-gcx-spotlight');
        try { if (window.PDXSpotlight && window.PDXSpotlight.open) { close(); window.PDXSpotlight.open(slug); return; } } catch (e) {}
        location.href = '/issue/' + slug;
      });
    });
    _wrap.querySelectorAll('[data-gcx-state]').forEach(function (b) {
      b.addEventListener('click', function () {
        _state.stateAbbr = b.getAttribute('data-gcx-state') || '';
        syncControls(); apply();
      });
    });
    _wrap.querySelectorAll('[data-gcx-issue]').forEach(function (b) {
      b.addEventListener('click', function () {
        _state.issue = b.getAttribute('data-gcx-issue') || '';
        syncControls(); apply();
      });
    });
  }

  function syncControls() {
    if (!_wrap) return;
    var map = { agency: 'agency', recipient: 'recipient', category: 'category', issue: 'issue', state: 'stateAbbr', sort: 'sort' };
    Object.keys(map).forEach(function (id) {
      var sel = _wrap.querySelector('[data-gcx="' + id + '"]');
      if (sel) sel.value = _state[map[id]] || '';
    });
    var input = _wrap.querySelector('#gcx-q');
    if (input) input.value = _state.q || '';
  }

  function build() {
    injectCss();
    var f = facets();
    _wrap = document.createElement('div');
    _wrap.className = 'gcx-overlay';
    _wrap.setAttribute('role', 'dialog');
    _wrap.setAttribute('aria-label', 'Federal Spending Tracker');
    _wrap.innerHTML =
      '<div class="gcx-shell">' +
        '<div class="gcx-top"><div>' +
          '<div class="gcx-eyebrow">💰 Federal Spending Tracker</div>' +
          '<div class="gcx-title">Government Contracts</div>' +
          '<div class="gcx-sub">Where a large share of federal money goes — searchable and filterable by agency, company, state and issue. Every entry links to its public source.</div>' +
        '</div><button type="button" class="gcx-close" aria-label="Close">✕</button></div>' +
        '<div class="gcx-note">Figures are rounded and approximate, drawn from public records (USAspending.gov, GAO, agency releases) — follow each source link for the authoritative, current amount. A contract’s state shows where the work or company is based; it is geographic context only and does not imply that any official steered or benefited from the award.</div>' +
        '<div class="gcx-controls">' +
          '<label class="gcx-search"><span aria-hidden="true">🔍</span><input id="gcx-q" type="search" placeholder="Search company, agency, state, keyword…" autocomplete="off"></label>' +
          selHtml('category', 'All categories', optionList(f.categories, function (k) { return catMeta(k).label; }), _state.category) +
          selHtml('agency', 'All agencies', optionList(f.agencies), _state.agency) +
          selHtml('recipient', 'All companies', optionList(f.recipients), _state.recipient) +
          selHtml('state', 'All states', optionList(f.states, stateLabel), _state.stateAbbr) +
          selHtml('issue', 'All issues', optionList(f.issues, issueLabel), _state.issue) +
          selHtml('sort', 'Sort', [
            { value: 'amount', label: 'Largest first' },
            { value: 'amount_asc', label: 'Smallest first' },
            { value: 'recipient', label: 'Company A–Z' }
          ].map(function (o) { return o; }), _state.sort) +
          '<button type="button" class="gcx-reset" id="gcx-reset">Reset</button>' +
        '</div>' +
        '<div class="gcx-count" id="gcx-count"></div>' +
        '<div class="gcx-list" id="gcx-list"></div>' +
      '</div>';
    document.body.appendChild(_wrap);

    _wrap.querySelector('.gcx-close').addEventListener('click', close);
    _wrap.addEventListener('click', function (e) { if (e.target === _wrap) close(); });
    _wrap.querySelector('#gcx-q').addEventListener('input', function (e) { _state.q = e.target.value; apply(); });
    _wrap.querySelector('#gcx-reset').addEventListener('click', function () {
      _state = { q: '', agency: '', recipient: '', stateAbbr: '', category: '', issue: '', sort: 'amount' };
      syncControls(); apply();
    });
    // The sort <select> has no counts, so give it stable labels (fix the option text).
    var sortSel = _wrap.querySelector('[data-gcx="sort"]');
    if (sortSel) sortSel.options[0].textContent = 'Sort: Largest first';
    _wrap.querySelectorAll('[data-gcx]').forEach(function (sel) {
      var id = sel.getAttribute('data-gcx');
      sel.addEventListener('change', function () {
        var key = id === 'state' ? 'stateAbbr' : id;
        _state[key] = sel.value || '';
        apply();
      });
    });
    document.addEventListener('keydown', onKey);
  }

  function onKey(e) { if (e.key === 'Escape' && _wrap && !_wrap.hidden) close(); }

  function open(filters) {
    filters = filters || {};
    if (!_wrap) build();
    // Accept a state as name or abbr, plus any other direct facet presets.
    if (filters.state) _state.stateAbbr = toAbbr(filters.state) || '';
    if (filters.agency) _state.agency = filters.agency;
    if (filters.recipient) _state.recipient = filters.recipient;
    if (filters.category) _state.category = filters.category;
    if (filters.issue) _state.issue = filters.issue;
    if (typeof filters.q === 'string') _state.q = filters.q;
    _wrap.hidden = false;
    document.body.style.overflow = 'hidden';
    syncControls();
    apply();
    var input = _wrap.querySelector('#gcx-q');
    if (input && !filters.state) input.focus();
  }

  function close() {
    if (_wrap) _wrap.hidden = true;
    document.body.style.overflow = '';
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Profile section — "Major Contracts in Their State/District"
  // Self-gating: returns '' when the roster state has no tracked contracts, so it
  // adds zero noise to profiles it can't enrich. Renders synchronously (data is
  // client-side) into the same .modal-section shell the rest of the profile uses.
  // The panel is COLLAPSIBLE (native <details>) so, like the Evidence Locker, a
  // reader can fold it away — it stays open by default so the context is visible.
  // ─────────────────────────────────────────────────────────────────────────────
  // One-time styles for the collapsible profile panel. Idempotent and injected on
  // first render, so the panel is styled even if the tracker overlay never opened.
  function injectProfileCss() {
    if (document.getElementById('gcx-prof-css')) return;
    var css =
      'details.gcx-prof{margin:0;}' +
      '.gcx-prof-sum{list-style:none;cursor:pointer;display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;' +
        'padding:.15rem 0 .1rem;border-radius:.5rem;}' +
      '.gcx-prof-sum::-webkit-details-marker{display:none;}' +
      '.gcx-prof-sum:focus-visible{outline:2px solid rgba(96,165,250,.55);outline-offset:3px;}' +
      '.gcx-prof-h{font-family:\'Bebas Neue\',sans-serif;font-size:1rem;letter-spacing:.08em;color:#9fb4d4;}' +
      '.gcx-prof-badge{font-family:\'Barlow Condensed\',sans-serif;font-size:.6rem;font-weight:700;letter-spacing:.1em;' +
        'text-transform:uppercase;background:rgba(96,165,250,.12);border:1px solid rgba(96,165,250,.28);color:#9ec8ff;' +
        'padding:.1rem .45rem;border-radius:999px;white-space:nowrap;}' +
      '.gcx-prof-chev{margin-left:auto;flex-shrink:0;color:#7596c0;font-size:.7rem;transition:transform .3s cubic-bezier(.4,0,.2,1);}' +
      'details.gcx-prof[open] .gcx-prof-chev{transform:rotate(180deg);}' +
      '.gcx-prof-hint{font-family:\'Barlow Condensed\',sans-serif;font-size:.58rem;font-weight:700;letter-spacing:.1em;' +
        'text-transform:uppercase;color:#6d84a8;}' +
      'details.gcx-prof[open] .gcx-prof-hint{display:none;}' +
      '.gcx-prof-body{margin-top:.6rem;}';
    var st = document.createElement('style');
    st.id = 'gcx-prof-css';
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }

  function renderProfileSection(id, p) {
    try {
      if (!p) return '';
      injectProfileCss();
      var abbr = toAbbr(p.state);
      if (!abbr) return '';
      var rows = byState(abbr);
      if (!rows.length) return '';
      var label = stateLabel(abbr);
      var top = rows.slice(0, 4);
      var total = rows.reduce(function (s, c) { return s + (c.amount || 0); }, 0);
      // A compact category read of the state's tracked awards, for a premium
      // at-a-glance summary line (e.g. "🛡️ Defense · 💻 IT"). Order by dollars.
      var catTotals = {};
      rows.forEach(function (c) { catTotals[c.category] = (catTotals[c.category] || 0) + (c.amount || 0); });
      var catSummary = Object.keys(catTotals)
        .sort(function (a, b) { return catTotals[b] - catTotals[a]; })
        .slice(0, 3)
        .map(function (k) { return catMeta(k).icon + ' ' + catMeta(k).label; })
        .join('  ·  ');

      var cards = top.map(function (c) {
        var cm = catMeta(c.category);
        return '<div style="background:rgba(11,18,33,.6);border:1px solid rgba(159,180,212,.14);border-left:3px solid ' + cm.accent + ';border-radius:.6rem;padding:.6rem .7rem;">' +
          '<div style="display:flex;justify-content:space-between;gap:.5rem;align-items:baseline;">' +
            '<span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:.95rem;color:#fff;">' + esc(c.recipient) + '</span>' +
            '<span style="font-family:\'Bebas Neue\',sans-serif;font-size:1rem;color:#9ff0bd;white-space:nowrap;">' + money(c.amount) + '</span>' +
          '</div>' +
          '<div style="font-family:\'Barlow\',sans-serif;font-size:.72rem;color:#8aa0c4;margin-top:.15rem;">' + cm.icon + ' ' + esc(cm.label) + ' · ' + esc(c.agencyShort || c.agency) + '</div>' +
          '<div style="font-family:\'Barlow\',sans-serif;font-size:.76rem;line-height:1.4;color:#a9bdd9;margin-top:.3rem;">' + esc(c.description) + '</div>' +
        '</div>';
      }).join('');

      var moreN = rows.length - top.length;
      var moreLine = moreN > 0
        ? '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:.66rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#7596c0;margin-top:.5rem;">+ ' + moreN + ' more ' + esc(label) + ' contract' + (moreN === 1 ? '' : 's') + ' in the tracker</div>'
        : '';

      return '' +
      '<span id="pdxsec-contracts" class="pdx-nav-anchor" aria-hidden="true"></span>' +
      '<div class="modal-section" style="margin-top:1rem;">' +
        '<details class="gcx-prof" open>' +
          '<summary class="gcx-prof-sum">' +
            '<span class="gcx-prof-h">💰 Major Federal Contracts in ' + esc(label) + '</span>' +
            '<span class="gcx-prof-badge">' + rows.length + ' tracked · ' + money(total) + '</span>' +
            (catSummary ? '<span class="gcx-prof-hint">' + catSummary + '</span>' : '') +
            '<span class="gcx-prof-chev" aria-hidden="true">▼</span>' +
          '</summary>' +
          '<div class="gcx-prof-body">' +
            '<div style="font-family:\'Barlow\',sans-serif;font-size:.74rem;line-height:1.5;color:#8aa0c4;margin-bottom:.6rem;">Major federal contracts where the work or company is based in ' + esc(label) + '. This is geographic context — it shows the federal money flowing through this official’s state, <b style="color:#a9bdd9;">not</b> a claim that they steered, caused, or personally profited from any award. Figures are approximate; sources are linked in the tracker.</div>' +
            '<div style="display:grid;gap:.5rem;">' + cards + '</div>' +
            moreLine +
            '<div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.7rem;">' +
              '<button type="button" onclick="window.PDXContracts&&window.PDXContracts.open({state:\'' + esc(abbr) + '\'})" style="cursor:pointer;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:.74rem;letter-spacing:.05em;text-transform:uppercase;color:#0a0f1e;background:#7fb4ff;border:0;border-radius:999px;padding:.55rem 1rem;box-shadow:0 2px 10px rgba(127,180,255,.25);">🔍 View All ' + esc(label) + ' Contracts →</button>' +
              '<button type="button" onclick="window.PDXSpotlight&&window.PDXSpotlight.open?window.PDXSpotlight.open(\'' + SP_SPOTLIGHT + '\'):(location.href=\'/issue/' + SP_SPOTLIGHT + '\')" style="cursor:pointer;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:.72rem;letter-spacing:.05em;text-transform:uppercase;color:#9ec8ff;background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.32);border-radius:999px;padding:.5rem .9rem;">📌 Contracting &amp; Waste Spotlight</button>' +
            '</div>' +
          '</div>' +
        '</details>' +
      '</div>';
    } catch (e) { return ''; }
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  window.PDXContracts = {
    list: list,
    get: get,
    facets: facets,
    byState: byState,
    topRecipients: topRecipients,
    money: money,
    catMeta: catMeta,
    toAbbr: toAbbr,
    stateLabel: stateLabel,
    open: open,
    close: close,
    renderProfileSection: renderProfileSection,
    SPOTLIGHT_SLUG: SP_SPOTLIGHT
  };

  // Convenience global used directly by the profile template string in index.html.
  window._renderMajorContracts = renderProfileSection;

  // If the Digital Library already mounted before this module loaded, nudge it to
  // rebuild so the new "Federal Spending Tracker" collection + contract cards appear.
  try {
    if (window.PDXDigitalLibrary && typeof window.PDXDigitalLibrary.render === 'function') {
      window.PDXDigitalLibrary.render();
    }
  } catch (e) {}
})();
