// ─────────────────────────────────────────────────────────────────────────────
// sunlight-governance.js — the Sunlight Governance category tag (Phase 1)
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS IS. Sunlight Governance is PolitiDex's transparency-first category:
// the public record of how regulated monopolies (electric, gas and water
// utilities, and the commissions that set their rates) are governed. It is a
// CROSS-CUTTING TAG, not a fourteenth core and not an ISSUE_MAP key. An item
// keeps whatever issue category it already has and may ALSO carry this tag, so
// nothing in the issue register, the core-family table, the stance generator,
// District Voice or any /i/<key> issue page moves because this file exists.
//
// WHAT CAN CARRY IT. Any issue, bill, rate case or lobbying record — the four
// ITEM_KINDS below. An item is tagged either:
//   · MANUALLY  — PDXSunlight.tag(item)   (sets tagSource: 'manual'), or
//   · AUTOMATICALLY — PDXSunlight.autoTag(item), which applies the tag only when
//     the item's own text names a regulated-utility subject (AUTO_TERMS), and
//     records tagSource: 'auto' so a reader can tell the two apart.
// Tagged items registered with PDXSunlight.register(item) are what the search
// panel's Sunlight Governance thread lists. This module ships NO entries of its
// own: the registry starts empty, and the live entries (Phase 2: one Utah PSC
// rate case) arrive from sunlight-entries.js, which registers them on load.
//
// NEUTRAL FRAMING. Every string here describes transparency in regulated
// monopolies. None of it argues for or against any party, rate outcome or
// utility; the tag is a filing label, not a verdict.
//
// Plain script, no dependencies, publishes window.PDXSunlight. Safe to load
// more than once (the second load is a no-op).
// ─────────────────────────────────────────────────────────────────────────────
(function (root) {
  'use strict';
  if (root.PDXSunlight && root.PDXSunlight.__v) return;

  var TAG = Object.freeze({
    key: 'sunlight_governance',
    label: 'Sunlight Governance',
    icon: '☀️',
    href: '/sunlight',
    blurb: 'Transparency in regulated monopolies: utility rate cases, the ' +
      'commissions that decide them, and the lobbying records around them.'
  });

  // The two sentences the landing page prints, kept here so the page, the
  // search thread and the tests read one source.
  var EXPLANATION = [
    'Sunlight Governance tracks how regulated monopolies — such as electric, ' +
      'gas and water utilities — are overseen, by putting rate cases, ' +
      'regulator decisions and related lobbying records into one public, ' +
      'sourced place.',
    'The working proof-of-concept is the Philippines Digital Bayanihan Chain, ' +
      'which shows how public records of this kind can be published openly so ' +
      'anyone can follow them.'
  ];

  var ITEM_KINDS = Object.freeze(['issue', 'bill', 'rate_case', 'lobbying']);

  // ── SUB-TAGS ──────────────────────────────────────────────────────────────
  // Narrower filing labels that sit UNDER Sunlight Governance. Applying a
  // sub-tag always applies the parent tag too, so a sub-tagged item is listed
  // in the same search thread and nothing that reads the parent tag changes.
  // Each sub-tag has a stub page (served by pretty URLs, no rewrite) that
  // states its goal, its minimum viable ledger, the Utah starting moves and its
  // public data sources. Rocky Mountain Power (/sunlight/rocky-mountain-power)
  // stays the live example both stubs point at.
  var SUB_TAGS = Object.freeze([
    Object.freeze({
      key: 'sunlight_banking',
      label: 'Sunlight Banking',
      icon: '🏦',
      parent: 'sunlight_governance',
      href: '/sunlight-banking',
      blurb: 'Banks that hold public money or carry a public guarantee: ' +
        'who holds deposits where, and what the public backing is.'
    }),
    Object.freeze({
      key: 'sunlight_concrete',
      label: 'Sunlight Concrete',
      icon: '🏗️',
      parent: 'sunlight_governance',
      href: '/sunlight-concrete',
      blurb: 'Concrete, cement and aggregate supply for public works: ' +
        'who bids, who wins and who owns the nearby pits and plants.'
    })
  ]);
  function subTagOf(key) {
    for (var i = 0; i < SUB_TAGS.length; i++) if (SUB_TAGS[i].key === key) return SUB_TAGS[i];
    return null;
  }

  // ── THE MARKET-POWER TEST ─────────────────────────────────────────────────
  // A short, reusable three-question block that can be attached to any company
  // or sector page. It asks; it does not score or rank. Pages print it as
  // static markup (data-sunlight-mpt) so it reads with no script, and
  // marketPowerTestHTML() renders the same block for any page that wants it.
  var MARKET_POWER_TEST = Object.freeze({
    title: 'Market-Power Test',
    intro: 'Three questions to ask of any company or sector. Each one is ' +
      'answered from public records, not opinion.',
    questions: Object.freeze([
      Object.freeze({ key: 'choice', label: 'Choice',
        q: 'Can a customer or taxpayer walk away and use a real alternative?' }),
      Object.freeze({ key: 'concentration', label: 'Concentration',
        q: 'Do a few firms hold most of the market in this place?' }),
      Object.freeze({ key: 'public_backing', label: 'Public backing',
        q: 'Does public money, a public charter or a public guarantee stand behind it?' })
    ]),
    note: 'The more of these the record answers “no choice”, “a few firms” ' +
      'or “yes, public backing”, the more a full public ledger helps people ' +
      'see the whole picture.'
  });
  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // subject: optional name printed in the heading ("… for Banking").
  function marketPowerTestHTML(subject) {
    var T = MARKET_POWER_TEST;
    var h = '<section class="sunlight-mpt" data-sunlight-mpt aria-labelledby="sunlight-mpt-h">' +
      '<h2 id="sunlight-mpt-h">' + escHtml(T.title) + (subject ? ': ' + escHtml(subject) : '') + '</h2>' +
      '<p>' + escHtml(T.intro) + '</p><ol>';
    T.questions.forEach(function (x) {
      h += '<li data-mpt-q="' + escHtml(x.key) + '"><b>' + escHtml(x.label) + '.</b> ' + escHtml(x.q) + '</li>';
    });
    return h + '</ol><p>' + escHtml(T.note) + '</p></section>';
  }

  // Words a reader types when the subject is a regulated utility. A query that
  // contains any of these (as a whole word or phrase) opens the Sunlight
  // Governance thread in search. Lowercase; matched on word boundaries.
  var SEARCH_TERMS = Object.freeze([
    'utility', 'utilities', 'rocky mountain power', 'rate case', 'rate cases',
    'psc', 'public service commission', 'puc', 'public utilities commission',
    'public utility commission', 'sunlight governance', 'sunlight',
    'regulated monopoly', 'regulated monopolies', 'bayanihan',
    'sunlight banking', 'sunlight concrete', 'market power', 'market-power test'
  ]);

  // The subset strong enough to auto-tag an item's OWN text. Narrower than the
  // search list on purpose: "sunlight" or a bare "utility" inside a bill title
  // is too loose to file a record under a category on its own.
  var AUTO_TERMS = Object.freeze([
    'rocky mountain power', 'rate case', 'rate cases', 'public service commission',
    'public utilities commission', 'public utility commission', 'psc',
    'utility rate', 'utility rates', 'electric utility', 'gas utility',
    'water utility', 'regulated monopoly', 'regulated monopolies'
  ]);

  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim(); }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function termRe(list) {
    return new RegExp('(?:^|[^a-z0-9])(?:' + list.map(escRe).join('|') + ')(?=$|[^a-z0-9])');
  }
  var SEARCH_RE = termRe(SEARCH_TERMS);
  var AUTO_RE = termRe(AUTO_TERMS);

  function matchesQuery(q) {
    var s = norm(q);
    return !!s && SEARCH_RE.test(s);
  }

  function itemText(item) {
    if (!item || typeof item !== 'object') return '';
    var parts = [item.title, item.name, item.summary, item.desc, item.description, item.number];
    if (Array.isArray(item.keywords)) parts = parts.concat(item.keywords);
    return norm(parts.filter(Boolean).join(' '));
  }

  function tagsOf(item) { return (item && Array.isArray(item.tags)) ? item.tags : []; }
  function isTagged(item) { return tagsOf(item).indexOf(TAG.key) !== -1; }

  // Apply the tag. Returns the same item (mutated), so callers can chain.
  function tag(item, source) {
    if (!item || typeof item !== 'object') throw new TypeError('PDXSunlight.tag: item must be an object');
    if (!Array.isArray(item.tags)) item.tags = [];
    if (item.tags.indexOf(TAG.key) === -1) item.tags.push(TAG.key);
    if (!item.tagSource || source === 'manual') item.tagSource = source === 'auto' ? 'auto' : 'manual';
    return item;
  }
  // Apply a sub-tag (and, with it, the parent tag).
  function subTag(item, key) {
    var st = subTagOf(key);
    if (!st) throw new TypeError('PDXSunlight.subTag: unknown sub-tag ' + key);
    tag(item, 'manual');
    if (item.tags.indexOf(st.key) === -1) item.tags.push(st.key);
    return item;
  }
  function subTagsOf(item) {
    var t = tagsOf(item);
    return SUB_TAGS.filter(function (st) { return t.indexOf(st.key) !== -1; });
  }
  function untag(item) {
    if (item && Array.isArray(item.tags)) {
      // Removing the parent removes its sub-tags with it.
      item.tags = item.tags.filter(function (t) { return t !== TAG.key && !subTagOf(t); });
      if (!isTagged(item)) delete item.tagSource;
    }
    return item;
  }
  function shouldAutoTag(item) { return AUTO_RE.test(itemText(item)); }
  function autoTag(item) {
    if (item && typeof item === 'object' && !isTagged(item) && shouldAutoTag(item)) tag(item, 'auto');
    return item;
  }

  // ── The registry the search thread reads ──────────────────────────────────
  var registry = [];
  function idOf(item) { return String(item.kind || '') + ':' + String(item.id || item.href || item.title || ''); }
  function register(item) {
    if (!item || typeof item !== 'object' || !item.title) return false;
    if (ITEM_KINDS.indexOf(item.kind) === -1) return false;
    if (!isTagged(item)) autoTag(item);
    if (!isTagged(item)) return false;           // untagged items are never listed
    var id = idOf(item);
    for (var i = 0; i < registry.length; i++) {
      if (idOf(registry[i]) === id) { registry[i] = item; return true; }
    }
    registry.push(item);
    return true;
  }
  function items() { return registry.filter(isTagged).slice(); }
  function clear() { registry.length = 0; }

  // What the search panel prints for a query: the landing page first, then any
  // tagged items. Null when the query does not name a Sunlight subject.
  // A query also opens the thread when it names a registered item's own
  // keywords (a docket number, a party), so an entry is findable by the words
  // its record uses as well as by the category's terms.
  function matchesItem(q) {
    var s = norm(q);
    if (!s) return false;
    var list = items();
    for (var i = 0; i < list.length; i++) {
      var kw = Array.isArray(list[i].keywords) ? list[i].keywords : [];
      if (kw.length && termRe(kw.map(norm).filter(Boolean)).test(s)) return true;
    }
    return false;
  }
  function search(q) {
    if (!matchesQuery(q) && !matchesItem(q)) return null;
    return {
      landing: { kind: 'landing', title: TAG.label, href: TAG.href, desc: TAG.blurb },
      items: items()
    };
  }

  root.PDXSunlight = {
    __v: 1,
    TAG: TAG,
    EXPLANATION: EXPLANATION.slice(),
    ITEM_KINDS: ITEM_KINDS,
    SUB_TAGS: SUB_TAGS,
    subTagOf: subTagOf,
    subTag: subTag,
    subTagsOf: subTagsOf,
    MARKET_POWER_TEST: MARKET_POWER_TEST,
    marketPowerTestHTML: marketPowerTestHTML,
    SEARCH_TERMS: SEARCH_TERMS,
    AUTO_TERMS: AUTO_TERMS,
    matchesQuery: matchesQuery,
    isTagged: isTagged,
    tag: function (item) { return tag(item, 'manual'); },
    untag: untag,
    shouldAutoTag: shouldAutoTag,
    autoTag: autoTag,
    register: register,
    items: items,
    clear: clear,
    search: search
  };

  // Phase 2: live entries ship in sunlight-entries.js. If that file loaded
  // before this one, register what it published.
  var E = root.PDXSunlightEntries;
  if (E && Array.isArray(E.list)) E.list.forEach(function (it) { try { register(it); } catch (e) {} });
})(typeof window !== 'undefined' ? window : globalThis);
