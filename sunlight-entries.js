// ─────────────────────────────────────────────────────────────────────────────
// sunlight-entries.js — Sunlight Governance live entries (Phases 2 and 4)
// ─────────────────────────────────────────────────────────────────────────────
// The category tag and its registry live in sunlight-governance.js
// (window.PDXSunlight). This file holds the ENTRIES: sourced public records
// filed under the tag. It publishes window.PDXSunlightEntries and registers
// each entry with PDXSunlight when that module is present; if this file loads
// first, sunlight-governance.js registers them itself when it boots. Load
// order does not matter.
//
// PHASE 2 SHIPS ONE ENTRY: Rocky Mountain Power's general rate case before
// the Public Service Commission of Utah, Docket No. 24-035-04, decided by the
// PSC's order of April 25, 2025. Every figure, quotation and page reference
// below is taken from that public order (printed page numbers), unless the
// field names another public source.
//
// FRAMING. Neutral and factual. The entry reports what the public record says
// and what it withholds. It does not argue for or against any party, rate
// outcome or official. Where something is confidential, the burden of showing
// why stays with the utility that designated it. The ask is one narrow,
// voluntary step about one existing contract. It is not a call for legislation.
//
// PHASE 4 adds the evidence layer: a "Filed vs. Ordered" pair (the utility's
// application and the PSC's order, each by title, date and public link) and a
// manual "Public filings since the order" list, FILINGS_SINCE_ORDER below.
//
// sunlight-rocky-mountain-power.html prints the same entry as static markup, and
// scripts/test-sunlight-rate-case.mjs pins the two copies to each other.
// ─────────────────────────────────────────────────────────────────────────────
(function (root) {
  'use strict';
  if (root.PDXSunlightEntries && root.PDXSunlightEntries.__v) return;

  var ORDER_URL = 'https://pscdocs.utah.gov/electric/24docs/2403504/3395032403504,2303540,and2303544o4-25-2025.pdf';
  var APPLICATION_URL = 'https://pscdocs.utah.gov/electric/24docs/2403504/334469RMPGRCAplctn6-28-2024.pdf';

  // ── PUBLIC FILINGS SINCE THE ORDER (THE MANUAL CONFIG LIST) ───────────────
  // When a new public filing appears in Docket No. 24-035-04, add one row:
  //   { date: 'YYYY-MM-DD', title: 'Document title as posted', url: 'https://pscdocs.utah.gov/…' }
  // Only rows dated after the April 25, 2025 order and linked to a public
  // https document count. One such row turns the note on /sunlight/rocky-mountain-power and on
  // every Utah District Voice board into an "Update" with a link. This list
  // is the only one to edit: the District Voice API core imports this file.
  var FILINGS_SINCE_ORDER = [];

  var NO_FILINGS = 'No new public PSC filings flagged since the April 25, 2025 order.';

  // The note both surfaces print. Pure: the same list gives the same note.
  function filingsNote(list) {
    var src = Array.isArray(list) ? list : FILINGS_SINCE_ORDER;
    var fresh = src.filter(function (u) {
      return u && /^\d{4}-\d{2}-\d{2}$/.test(String(u.date)) && String(u.date) > '2025-04-25' &&
        u.title && /^https:\/\//.test(String(u.url || ''));
    }).map(function (u) {
      return { date: String(u.date), title: String(u.title), url: String(u.url) };
    }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    return {
      docket: '24-035-04',
      orderUrl: ORDER_URL,
      hasUpdates: fresh.length > 0,
      note: fresh.length
        ? (fresh.length === 1 ? 'A new public filing' : fresh.length + ' new public filings') +
          ' in Docket No. 24-035-04 since the April 25, 2025 order.'
        : NO_FILINGS,
      updates: fresh
    };
  }

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function longDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    return m ? MONTHS[Number(m[2]) - 1] + ' ' + Number(m[3]) + ', ' + m[1] : '';
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  // Inner markup of the /sunlight/rocky-mountain-power filings block for a note.
  function filingsHtml(n) {
    var items = n.updates.map(function (u) {
      return '<li><a href="' + esc(u.url) + '" rel="noopener">' + esc(u.title) + '</a> <time datetime="' + esc(u.date) + '">' + esc(longDate(u.date)) + '</time></li>';
    }).join('');
    return '<p>' + (n.hasUpdates ? '<b>Update:</b> ' : '') + esc(n.note) + '</p>' + (items ? '<ul>' + items + '</ul>' : '');
  }

  var RMP_RATE_CASE = {
    kind: 'rate_case',
    id: 'UT-PSC-24-035-04',
    anchor: 'rmp-24-035-04',
    href: '/sunlight/rocky-mountain-power#rmp-24-035-04',
    tags: ['sunlight_governance'],
    tagSource: 'manual',
    title: 'Rocky Mountain Power general rate case, Utah PSC Docket No. 24-035-04',
    desc: 'Utah PSC order, April 25, 2025: $87.2 million approved of $330.2 million requested. ' +
      'Parts of the record are confidential.',
    keywords: [
      '24-035-04', 'docket 24-035-04', 'office of consumer services', 'ocs',
      'pacificorp', 'cedar springs', 'general rate case', 'utah psc'
    ],
    utility: 'Rocky Mountain Power (PacifiCorp)',
    regulator: 'Public Service Commission of Utah',
    docket: '24-035-04',
    consolidatedWith: ['23-035-40', '23-035-44'],
    orderDate: '2025-04-25',
    source: { label: 'PSC Order, Docket Nos. 24-035-04, 23-035-40 and 23-035-44 (Apr. 25, 2025)', url: ORDER_URL },

    // What the order decided, in its own figures (Synopsis, pp. ii and v).
    figures: [
      { label: 'Original request', value: '$667.3 million' },
      { label: 'Amended application', value: '$393.7 million' },
      { label: 'Final revised request', value: '$330.2 million' },
      { label: 'Approved increase', value: '$87.2 million (26.4% of the final revised request)' },
      { label: 'Deferred to a future Energy Balancing Account filing', value: 'up to $240.1 million' },
      { label: 'Return on equity', value: '9.65% requested; 9.375% approved' },
      { label: 'Average single-family residential bill (700 kWh)', value: '+$4.31 a month (4.7%) in 2025' }
    ],

    // ── Filed vs. Ordered ─────────────────────────────────────────────────────
    // The utility's main public request and the PSC's order, each as the
    // public document's own title and date. No figures, no reading of either.
    filedVsOrdered: [
      { step: 'filed', label: 'Filed by Rocky Mountain Power', date: '2024-06-28',
        title: 'Rocky Mountain Power’s Application for General Rate Increase', url: APPLICATION_URL },
      { step: 'ordered', label: 'Ordered by the PSC', date: '2025-04-25',
        title: 'Order, Docket Nos. 24-035-04, 23-035-40 and 23-035-44', url: ORDER_URL }
    ],

    // ── Public filings since the order (see FILINGS_SINCE_ORDER above) ────────
    filingsSinceOrder: FILINGS_SINCE_ORDER,

    // ── Confidential or redacted portions ─────────────────────────────────────
    redaction: {
      note: 'The public order does not state what share of the filing is confidential. ' +
        'It does name specific parts of the record that are designated confidential or redacted, listed below. ' +
        'Testimony in the docket is posted in redacted public versions.',
      statedShare: null,
      items: [
        { what: 'Wind contract pricing', page: 103,
          quote: 'Because the pricing of the PPAs and the costs associated with the other Wind Projects are designated confidential, the PSC discusses these issues in general terms.' },
        { what: 'Generation overhaul adjustments', page: 89,
          quote: 'They argue that RMP should remove the converted units from its four-year calculation, each recommending a confidential adjustment to correct the issue.' },
        { what: 'Injuries and damages claims data', page: 88,
          quote: 'DPU acknowledges RMP provided data on the origin of claims but notes the information is heavily redacted, precluding reasonable evaluation.' },
        { what: 'Load forecast model variables', page: 59,
          quote: 'much information is designated confidential in GRCs and RMP may avail itself of existing processes to protect any confidential information.' },
        { what: 'Insurer underwriting exhibit', page: 147,
          quote: 'RMP also provided a confidential exhibit it requested one of its insurers to prepare, which discusses the insurer’s underwriting process' }
      ]
    },

    // ── What the Office of Consumer Services argued ───────────────────────────
    // The OCS is the Utah state office that represents residential and small
    // commercial customers before the PSC.
    ocs: {
      name: 'Office of Consumer Services',
      summary: 'The Office of Consumer Services (OCS), which represents residential and small business customers before the PSC, was a party to the case.',
      positions: [
        { text: 'Recommended a 9.375% return on equity, below the 9.65% Rocky Mountain Power requested. The PSC adopted 9.375%, finding the OCS recommendation reasonable under the principle of gradualism.', page: 21 },
        { text: 'Asked the PSC to disallow at least $15,289,781 of claimed wildfire-related deferred costs: $5,681,724 in labor costs OCS argued were already recovered through base rates, and $9,608,057 spent under a 2023 wildfire plan the PSC had not approved.', page: 131 },
        { text: 'Joined other parties in opposing full recovery of projected excess liability insurance premiums, arguing the utility had not provided substantial evidence that the full amount was prudent.', page: 148 },
        { text: 'Argued the allocation factor used to spread those insurance premiums across states “does not assign the costs to the jurisdictions in proportion to the amount each jurisdiction contributes to the increase,” violating cost-causation principles.', page: 158 },
        { text: 'Recommended removing two Jim Bridger units converted to natural gas, and Craig Unit 2, from the generation overhaul expense average; the amount of its adjustment is confidential.', page: 89 }
      ]
    },

    // ── Before and after: the public version vs. full visibility ──────────────
    // Factual only: the left column is what a member of the public can read in
    // the posted order; the right column names what the confidential version
    // contains, as the order itself describes it. No value is guessed.
    comparison: [
      { item: 'Cedar Springs IV wind power purchase agreement (350.4 MW)',
        publicVersion: 'Pricing designated confidential. The order says DPU noted a “significant increase in price” from the 2020 bid, but discusses it only “in general terms.”',
        fullVisibility: 'The contract price and how much it rose from the 2020 All-Source RFP bid.' },
      { item: 'Generation overhaul expense adjustment',
        publicVersion: 'OCS, UAE and DPU each proposed a correction; the amounts are confidential.',
        fullVisibility: 'Each party’s proposed dollar adjustment.' },
      { item: 'Injuries and damages claims data',
        publicVersion: 'DPU describes the claims-origin data it received as “heavily redacted.”',
        fullVisibility: 'Where the claims behind the test-year expense came from.' },
      { item: 'Insurer underwriting exhibit',
        publicVersion: 'A confidential exhibit. The order says its threshold for a significant verdict is “a small fraction” of the utility’s liability in the James wildfire case.',
        fullVisibility: 'The insurer’s stated threshold and underwriting factors.' }
    ],

    // ── The ask ───────────────────────────────────────────────────────────────
    ask: {
      label: 'Publish one confidential contract',
      text: 'Ask Rocky Mountain Power to file a public version of one confidential contract in this docket: the pricing terms of the Cedar Springs IV wind power purchase agreement. ' +
        'The utility holds the contract, so the burden of showing why any term must stay confidential rests with the utility. ' +
        'This is a request about one existing document. It does not ask for any new law.'
    },

    // ── Related legislator votes already on PolitiDex ─────────────────────────
    // Utah bills on PSC oversight with recorded floor votes in the PolitiDex
    // record. No Utah bill on PSC confidentiality itself is on PolitiDex yet.
    relatedVotes: {
      note: 'These Utah bills changed how the PSC evaluates utility resource decisions. PolitiDex does not yet have a Utah bill on PSC confidentiality or disclosure.',
      bills: [
        { number: 'S.B. 224', session: '2024GS', title: 'Energy Independence Amendments', status: 'enacted',
          href: '/b/2024GS/S.B.%20224',
          summary: 'Changes the factors the PSC weighs in evaluating energy resource decisions and sets terms for cost recovery.',
          votes: [
            { chamber: 'Utah House', tally: '54-19-2', url: 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=1434&house=H' },
            { chamber: 'Utah Senate', tally: '21-6-2', url: 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2024GS&voteid=2154&house=S' }
          ] },
        { number: 'H.B. 201', session: '2025GS', title: 'Energy Resource Amendments', status: 'enacted',
          href: '/b/2025GS/H.B.%20201',
          summary: 'Changes how the PSC evaluates integrated resource plans.',
          votes: [
            { chamber: 'Utah House', tally: '57-10-8', url: 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=587&house=H' },
            { chamber: 'Utah Senate', tally: '21-6-2', url: 'https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2025GS&voteid=812&house=S' }
          ] }
      ]
    }
  };

  var list = [RMP_RATE_CASE];
  root.PDXSunlightEntries = {
    __v: 1, list: list, byId: { 'UT-PSC-24-035-04': RMP_RATE_CASE },
    filingsNote: filingsNote, filingsHtml: filingsHtml, longDate: longDate, paint: paint
  };

  // On /sunlight/rocky-mountain-power the filings block ships as static markup (the no-script
  // reading). When the list above has a dated, sourced filing, repaint it.
  function paint(doc) {
    try {
      var el = doc && doc.querySelector && doc.querySelector('[data-sg-filings]');
      if (!el) return false;
      var n = filingsNote();
      el.innerHTML = filingsHtml(n);
      el.setAttribute('data-sg-filings', n.hasUpdates ? 'new' : 'none');
      return true;
    } catch (e) { return false; }
  }
  var doc = root.document;
  if (doc && doc.querySelector) {
    if (doc.readyState === 'loading' && doc.addEventListener) doc.addEventListener('DOMContentLoaded', function () { paint(doc); });
    else paint(doc);
  }

  var S = root.PDXSunlight;
  if (S && typeof S.register === 'function') {
    list.forEach(function (it) { try { S.register(it); } catch (e) {} });
  }
})(typeof window !== 'undefined' ? window : globalThis);
