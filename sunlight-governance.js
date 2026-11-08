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
// panel's Sunlight Governance thread lists. Phase 1 ships NO live entries: the
// registry starts empty and the thread then offers the landing page alone.
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

  // Words a reader types when the subject is a regulated utility. A query that
  // contains any of these (as a whole word or phrase) opens the Sunlight
  // Governance thread in search. Lowercase; matched on word boundaries.
  var SEARCH_TERMS = Object.freeze([
    'utility', 'utilities', 'rocky mountain power', 'rate case', 'rate cases',
    'psc', 'public service commission', 'puc', 'public utilities commission',
    'public utility commission', 'sunlight governance', 'sunlight',
    'regulated monopoly', 'regulated monopolies', 'bayanihan'
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
  function untag(item) {
    if (item && Array.isArray(item.tags)) {
      item.tags = item.tags.filter(function (t) { return t !== TAG.key; });
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
  function search(q) {
    if (!matchesQuery(q)) return null;
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
})(typeof window !== 'undefined' ? window : globalThis);
