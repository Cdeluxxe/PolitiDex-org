// ═══════════════════════════════════════════════════════════════════════════
// bill-key-patterns.mjs — per-key bill mapping patterns (v1: ONE key)
//
// Links a bill found by bill-finder-core.mjs to an issue key when the text
// says the bill is about that key's subject. Only `israel_offensive_arms` is
// mapped in v1; every other key is left for later passes using the same shape:
//   subject     the subject the key is about (here: Israel)
//   instrument  what the bill does to it (here: a sale / transfer / export of arms)
//   facet       what narrows a parent key to this child (here: OFFENSIVE weapons)
//   excludes    a facet that belongs to a sibling key and, alone, means "not this
//               key" (here: missile defence → israel_defensive_systems)
// Evidence is read from the text around the mention (the sentence and its
// neighbours in the same paragraph) and, for a catalog bill, its official title.
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

export const PATTERNS_VERSION = "bill-key-patterns-v1";
export const CONFIDENCE_SCORE = { high: 0.9, medium: 0.6, low: 0.35 };

export const BILL_KEY_PATTERNS = {
  israel_offensive_arms: {
    label: DIRECTIONAL_ISSUE_KEYS.israel_offensive_arms.label,
    subject: /\b(?:israel\w*|IDF|gaza|netanyahu)\b/i,
    instrument: /\b(?:arms|weapons?|weaponry|munitions|bombs?|(?:foreign )?military sales?|sales?|transfers?|exports?|defense articles|license amendment)\b/i,
    facet: /\b(?:offensive|bombs?|bomb bodies|JDAMs?|guidance kits|small[- ]diameter bombs?|precision[- ]guided|tank (?:rounds|shells|cartridges)|mortar(?: cartridges| rounds)?|artillery|shells|munitions|assault rifles|carbine rifles?)\b/i,
    excludes: { key: "israel_defensive_systems", re: /\b(?:iron dome|david['’]?s sling|arrow (?:\d )?(?:missile|system)|missile defen[cs]e|air defen[cs]e|interceptors?|defend itself)\b/i },
  },
};

/** Keys with a mapping pattern. */
export const MAPPED_KEYS = Object.keys(BILL_KEY_PATTERNS);

const firstMatch = (re, texts) => texts.find((t) => re.test(t)) || null;
const uniq = (a) => [...new Set(a.filter(Boolean))];

/**
 * Map one found candidate onto one key. → { mapped: true, ... } | { mapped: false, reason }
 */
export function mapCandidate(cand, key) {
  const P = BILL_KEY_PATTERNS[key];
  if (!P) return { mapped: false, reason: `no mapping pattern for ${key}` };
  const best = cand.mentions.find((m) => m.kind === "number") || cand.mentions.find((m) => m.kind === "short_title") || cand.mentions[0];
  const texts = uniq(cand.mentions.flatMap((m) => m.window));
  const joined = texts.join(" ");
  const title = cand.catalog?.title || "";
  const resolvedTitles = (cand.resolves_to || []).map((r) => r.title);

  const textSubject = P.subject.test(joined) && P.instrument.test(joined);
  const titleSubject = !!title && P.subject.test(title) && P.instrument.test(title);
  const textFacet = P.facet.test(joined);
  const titleFacet = !!title && P.facet.test(title);
  const kind = cand.mentions.some((m) => m.kind === "number") ? "number" : cand.mentions.some((m) => m.kind === "short_title") ? "short_title" : "phrase";

  if (!textSubject && !titleSubject) {
    return { mapped: false, reason: subjectMiss(cand, joined) };
  }
  if (!textFacet && !titleFacet) {
    const defensive = P.excludes.re.test(joined) || P.excludes.re.test(title);
    return { mapped: false, reason: defensive
      ? `about Israel arms, but only defensive systems are named (→ ${P.excludes.key}, not mapped in v1)`
      : "about arms for Israel, but neither the text nor the official title says the weapons are offensive (→ parent key israel_military_aid, not mapped in v1)" };
  }

  let confidence, basis;
  if (kind === "number") [confidence, basis] = textSubject ? ["high", "bill number + subject words in the text"] : ["medium", "bill number in the text; subject from the bill's official title"];
  else if (kind === "short_title") [confidence, basis] = textSubject ? ["medium", "short title + subject words in the text"] : ["low", "short title; subject from the bill's official title"];
  else [confidence, basis] = ["low", "descriptive phrase + subject words in the text"];
  if (!textFacet) basis += "; 'offensive' from the official title";

  const justify = textSubject
    ? texts.filter((t) => P.subject.test(t) || P.instrument.test(t) || P.facet.test(t))
    : [`[official title] ${title}`];
  return {
    mapped: true, key, confidence, confidence_score: CONFIDENCE_SCORE[confidence], basis,
    bill: cand.bill, id: cand.id, matched: best.match,
    span: justify.join(" … "),
    ...(cand.resolves_to ? { resolves_to: cand.resolves_to.map((r) => ({ ...r, title_fits_key: P.subject.test(r.title) && P.facet.test(r.title) })) } : {}),
    ...(resolvedTitles.length > 1 ? { best_fit: bestFit(cand.resolves_to, P) } : {}),
  };
}

// Among several resolved bills, the one whose official title alone fits the key.
function bestFit(rows, P) {
  const fit = rows.filter((r) => P.subject.test(r.title) && P.facet.test(r.title));
  return fit.length === 1 ? fit[0].id : null;
}

const OTHER_SUBJECTS = [
  [/\bukrain\w*|kyiv|zelensky/i, "Ukraine (→ ukraine_aid)"],
  [/\biran\w*|islamic republic|tehran/i, "Iran (→ iran_hostilities)"],
  [/\bmedicare|health ?care|health insurance|medicaid/i, "health care"],
  [/\bvouchers?|school choice|public schools?|education/i, "education"],
];
function subjectMiss(cand, text) {
  const pool = `${text} ${cand.catalog?.title || ""}`;
  const other = OTHER_SUBJECTS.find(([re]) => re.test(pool));
  const keys = cand.catalog?.issue_keys?.length ? `; catalog files it under ${cand.catalog.issue_keys.join(", ")}` : "";
  if (other) return `about ${other[1]}, not Israel offensive arms${keys}`;
  return `no Israel arms-transfer words in the text around the mention${cand.catalog ? " or the official title" : " (and the bill is not in the catalog)"}${keys}`;
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
