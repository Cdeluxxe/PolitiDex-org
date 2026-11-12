// ═══════════════════════════════════════════════════════════════════════════
// bill-key-patterns.mjs — per-key bill mapping patterns (five keys)
//
// Links a bill found by bill-finder-core.mjs to an issue key when the text
// says the bill is about that key's subject. Mapped so far:
//   israel_offensive_arms  (v1)
//   ukraine_aid            (v2 — "Further U.S. Aid to Ukraine")
//   iran_hostilities       (v4 — "Congress Must Authorize Hostilities with Iran")
//   tariffs_china          (v5 — "Tariffs on China & Unfair Trade", register key)
//   border_security        (v5 — "Strong Border & Enforcement", register key)
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

export const PATTERNS_VERSION = "bill-key-patterns-v5";
export const CONFIDENCE_SCORE = { high: 0.9, medium: 0.6, low: 0.35 };

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
};

/** Keys with a mapping pattern. */
export const MAPPED_KEYS = Object.keys(BILL_KEY_PATTERNS);

const uniq = (a) => [...new Set(a.filter(Boolean))];

/**
 * Map one found candidate onto one key. → { mapped: true, ... } | { mapped: false, reason }
 */
export function mapCandidate(cand, key) {
  const P = BILL_KEY_PATTERNS[key];
  if (!P) return { mapped: false, reason: `no mapping pattern for ${key}` };
  const best = cand.mentions.find((m) => m.kind === "number") || cand.mentions.find((m) => m.kind === "short_title") || cand.mentions[0];
  const ev = P.words ? wordEvidenceFor(cand, key) : evidenceFor(cand, key);
  const texts = ev.texts;
  const joined = texts.join(" ");
  const ideaText = uniq(cand.mentions.flatMap((m) => m.window)).join(" ");
  const title = cand.catalog?.title || "";
  const resolvedTitles = (cand.resolves_to || []).map((r) => r.title);

  const textSubject = texts.length > 0 && P.subject.test(joined) && P.instrument.test(joined);
  const titleSubject = !ev.keyed && !!title && P.subject.test(title) && P.instrument.test(title);
  const textFacet = !P.facet || P.facet.test(joined);
  const titleFacet = !!title && !!P.facet && P.facet.test(title);
  const kind = cand.mentions.some((m) => m.kind === "number") ? "number" : cand.mentions.some((m) => m.kind === "short_title") ? "short_title" : "phrase";

  if (!textSubject && !titleSubject) {
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
function wordEvidenceFor(cand, key) {
  const P = BILL_KEY_PATTERNS[key];
  const kept = new Map();
  const all = cand.mentions.flatMap((m) => m.doc || []);
  for (const e of all) {
    if (kept.has(e.id) || keyedSubject(e) || CHROME_LINE.test(e.text) || !P.subject.test(e.text)) continue;
    kept.set(e.id, e);
  }
  if (kept.size) for (const e of all) if (e.mention && !keyedSubject(e) && !kept.has(e.id)) kept.set(e.id, e);
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
  [/\bmedicare|health ?care|health insurance|medicaid/i, "health care"],
  [/\bvouchers?|school choice|public schools?|education/i, "education"],
  [/\b(?:china|chinese|beijing|CCP)\b/i, "China (→ tariffs_china)", "tariffs_china"],
  [/\b(?<!cross-)border\b|illegal immigration|asylum/i, "the border (→ border_security)", "border_security"],
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
export function mapFound(found, { keys = MAPPED_KEYS } = {}) {
  const mappings = [];
  const unmapped = [];
  for (const cand of found.candidates) {
    const reasons = [];
    for (const k of keys) {
      const r = mapCandidate(cand, k);
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
