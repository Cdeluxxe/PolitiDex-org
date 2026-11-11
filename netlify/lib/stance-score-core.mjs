// ─────────────────────────────────────────────────────────────────────────────
// stance-score-core.mjs — Phase 4: first scoring rules against the ground truth
// ─────────────────────────────────────────────────────────────────────────────
// Reads ONE raw ingest record (as written by raw-ingest-core.mjs) and the
// ground-truth record, produces a CANDIDATE stance (position + confidence +
// source list) with explicit, inspectable rules, and logs whether it agrees
// with the ground truth. It writes nothing: not to the raw store, not to the
// ground-truth file, not to any stance surface. No contradiction flags.
//
// RULES (version RULES_VERSION):
//   R1  Campaign page language that states a clear position → MEDIUM weight.
//   R2  A direct quote from a speech or press release that states a clear
//       position → HIGH weight.
//   R3  A mention of the topic with no clear position → recorded, ZERO weight.
//   R4  Three or more consistent clear statements raise confidence.
//   R5  A single outlier (a clear statement on the other side) does not flip
//       the position — it only lowers confidence — unless it carries explicit
//       reversal language, in which case the reversal sets the position.
//   R6  Hard implication (phase7): when the page's own politician is the actor
//       and a sentence is not an explicit statement, directional language still
//       counts as a MEDIUM-weight signal (support or oppose) when it either
//         (a) names a problem and a remedy — "cap credit card rates",
//             "make insulin affordable", "freeze rent hikes"; or
//         (b) highlights an outcome the speaker wants changed — "rent is too
//             high", "families can't afford groceries" — and the source does so
//             REPEATEDLY (at least WEIGHTS.outcomeRepeatMin such sentences). A
//             single outcome line, or a rhetorical question, stays a mention.
//       Implications count toward R4 corroboration alongside explicit
//       statements and toward R5 outliers; they never carry reversal power.
//       Explicit statements keep their tier weight (HIGH in speeches/remarks).
//   R7  Nearby implication: a pure mention that names a problem ("families are
//       struggling with grocery bills") followed within the next
//       WEIGHTS.pairWindow sentences by a direction or remedy from the same
//       speaker ("So we will fight to change that.") is scored as ONE
//       medium-weight implication (support: the speaker wants the problem
//       fixed). The direction sentence is folded into the pair, never counted
//       twice. Only when that sentence is not already directional on the topic
//       (then it counts on its own, as before), is not a question, is not
//       negated and is not attributed to someone else. An isolated mention
//       stays zero weight (R3).
//   R8  Stated position from a primary source (phase8): a verifiable
//       first-party source — a campaign or official page (or a .gov/.mil
//       link), a press release, statement, speech or remarks — is normal
//       evidence of what the candidate SAID. When at least one EXPLICIT clear
//       statement by the page's own politician sets the position, nothing on
//       the page runs the other way and there is no reversal, confidence is
//       floored at WEIGHTS.statedPositionConfidence (the Locker's strong bar),
//       so one specific on-topic campaign claim reads as a normal stated
//       position instead of a weak signal. No external verification is needed
//       for this STATED layer. It is never a formal record: the candidate is
//       marked stated_position (layer "stated"), and nothing here makes a
//       claim count as a vote, bill or completed action — that still needs an
//       independent match to an official record. Implication-only reads (R6,
//       R7) and pure mentions (R3) are unchanged.
//   R9  One claim, one issue (phase8): when a page's cross-topic candidate rests
//       only on sentences another kept candidate from the same page already
//       carries, it restates the same claim under another issue key and is
//       dropped (scoreAllTopics). The page's own topic is always kept; among
//       other topics the one resting on more explicit statements wins.
//

// Calibration: the ground truth (0.85) rests on first-party campaign pages
// with several explicit commitments, so a medium-tier base of 0.70 plus the
// R4 corroboration bonus of 0.15 reproduces it. These numbers live in WEIGHTS
// so a later tweak is one edit, and the comparison log prints the exact delta.

import { buildTopicRules, ISSUE_TOPIC_VOCAB, ISSUE_TOPIC_LABELS } from "./stance-topic-vocab.mjs";

export const RULES_VERSION = "phase8-v1";
// Vocabulary version for the issue keys scored from stance-topic-vocab.mjs
// (every register key except the two hand-calibrated core topics).
export const VOCAB_VERSION = "issue-vocab-v1";

export const WEIGHTS = {
  high: 1.0,              // R2
  medium: 0.5,            // R1
  zero: 0,                // R3
  implication: 0.5,       // R6: medium-weight directional signal
  outcomeRepeatMin: 2,    // R6(b): outcome highlights count only when repeated
  pairWindow: 2,          // R7: a direction this many sentences after a problem mention
  baseConfidence: { high: 0.8, medium: 0.7, implication: 0.7 },
  corroborationMin: 3,    // R4: this many consistent clear statements…
  corroborationBonus: 0.15, // …add this much
  outlierPenalty: 0.1,    // R5: per opposite-side clear statement
  maxConfidence: 0.95,
  mentionOnlyConfidence: 0.3, // "no clear position" when only mentions exist
  statedPositionConfidence: 0.8, // R8: floor for an explicit claim on a primary source
};

export const CONFIDENCE_TOLERANCE = 0.1;

const HIGH_TYPES = /\b(speech|press release|statement|remarks|interview|transcript)\b/i;
const MEDIUM_TYPES = /\b(campaign|issue page|platform|toolkit)\b/i;
// R8: a verifiable first-party source of what the candidate said.
const PRIMARY_TYPES = /\b(campaign|official|issues? page|platform|press release|statement|speech|remarks|transcript)\b/i;

/** Is this a primary source of the candidate's own words (R8)? */
export function isPrimarySource(sourceType, link) {
  if (PRIMARY_TYPES.test(String(sourceType || ""))) return true;
  try { return /\.(gov|mil)$/i.test(new URL(link).hostname); } catch { return false; }
}

// Topic vocabulary. R1–R5 and WEIGHTS are shared by every topic; a topic only
// supplies what counts as a mention and what counts as a clear statement.
//   cost_living       — Phase 4, calibrated against the Talarico ground truth.
//   healthcare_costs  — Phase 5, the second topic. Same shape; a clear statement
//                       must also be ABOUT health care (`context`), so "lower
//                       grocery costs" on a mixed page never counts here.
export const TOPIC_RULES = {
  cost_living: {
    mention: /\b(cost[- ]of[- ]living|expensive|afford\w*|prices?|rent|groceries|grocery|utilit(y|ies)|gas|diesel|childcare|insulin|housing|tax(es)?|tax cut|interest rates?|wages?|pay)\b/i,
    // A commitment to bring costs/taxes down for people. Counted only when the page's own politician is the actor (see actorFor).
    support: /\b(lower(ing)?|cut(ting)?|bring(ing)? down|cap(ped|ping|s)?|reduc(e|es|ed|ing)|suspend(ing)?)\b[^.!?]{0,80}?\b(costs?|prices?|tax(es)?|rent|groceries|interest rates?|bills?)\b|\bcost[- ]of[- ]living tax cut\b/i,
    // Explicitly against measures that lower costs.
    oppose: /\b(I|we)\s+(?:now\s+|still\s+|strongly\s+)?(oppose|reject|will vote against|won'?t support)\b[^.!?]{0,80}\b(tax cuts?|caps?|relief|lower(ing)? (costs|prices)|minimum wage)\b|\b(raise|raising|increase|increasing) (taxes|prices|rent) on (working|middle)/i,
    // R6(a) problem + remedy: a remedy aimed at a named cost problem.
    implySupport: /\b(?:lower(?:ing)?|cut(?:ting)?|bring(?:ing)? down|cap(?:ped|ping|s)?|reduc(?:e|es|ed|ing)|suspend(?:ing)?|freez(?:e|es|ing)|slash(?:es|ing)?|drive down|roll(?:ing)? back|rein(?:ing)? in|crack(?:ing)? down on|stop(?:ping)?|end(?:ing)?|ban(?:ning)?|limit(?:ing)?|fix(?:ing)?|tackl(?:e|es|ing))\b[^.!?]{0,80}?\b(?:rates?|fees?|junk fees|price gouging|gouging|rent hikes?|price hikes?|inflation|gas tax|diesel tax|insulin|childcare|housing|utilit(?:y|ies)|electricity|energy)\b|\bmake\b[^.!?]{0,60}?\baffordable\b|\b(?:tax )?(?:relief|rebates?) for (?:working|middle|families|seniors)/i,
    implyOppose: /\b(?:repeal(?:ing)?|scrap(?:ping)?|kill(?:ing)?|block(?:ing)?|eliminat(?:e|es|ing))\b[^.!?]{0,60}?\b(?:price caps?|rate caps?|rent control|gas tax (?:holiday|suspension)|minimum wage (?:increase|hike)|child tax credit|earned income tax credit|tax rebates?)\b/i,
    // R6(b) outcome the speaker wants changed (support = bring costs down).
    outcome: /\b(?:too (?:high|expensive|much)|so expensive|sky-?high|skyrocket\w*|soar(?:ing|ed)|through the roof|out of reach|unaffordable|can(?:no|'|’)?t afford|cannot afford|struggl\w* to (?:pay|afford)|priced out|price gouging|crushing|rip-?off)\b/i,
  },
  healthcare_costs: {
    mention: /\b(health ?care|health insurance|insurance premiums?|premiums?|prescriptions?|drugs?|insulin|medicaid|medicare|co-?pays?|deductibles?|hospitals?|pharma\w*|medical (debt|bills?|costs?))\b/i,
    context: /\b(health|medical|medicaid|medicare|insurance|premiums?|prescriptions?|drugs?|insulin|co-?pays?|deductibles?|hospitals?|pharma\w*|patients?)\b/i,
    support: /\b(lower(ing)?|cut(ting)?|bring(ing)? down|cap(ped|ping|s)?|reduc(e|es|ed|ing)|drive down)\b[^.!?]{0,80}?\b(costs?|prices?|premiums?|co-?pays?|deductibles?|insulin|out-of-pocket|bills?|debt)\b/i,
    oppose: /\b(I|we)\s+(?:now\s+|still\s+|strongly\s+)?(oppose|reject|will vote against|won'?t support)\b[^.!?]{0,80}\b(price caps?|caps?|drug price negotiation|lower(ing)? (costs|prices|premiums))\b/i,
    implySupport: /\b(?:lower(?:ing)?|cut(?:ting)?|bring(?:ing)? down|cap(?:ped|ping|s)?|reduc(?:e|es|ed|ing)|freez(?:e|es|ing)|slash(?:es|ing)?|drive down|rein(?:ing)? in|crack(?:ing)? down on|stop(?:ping)?|end(?:ing)?|ban(?:ning)?|limit(?:ing)?|fix(?:ing)?|tackl(?:e|es|ing)|negotiat(?:e|es|ing))\b[^.!?]{0,80}?\b(?:drug prices?|prescription prices?|price gouging|gouging|surprise (?:billing|bills?)|medical debt|insulin|premium hikes?|rates?|fees?)\b|\bmake\b[^.!?]{0,60}?\baffordable\b/i,
    implyOppose: /\b(?:repeal(?:ing)?|scrap(?:ping)?|kill(?:ing)?|block(?:ing)?|eliminat(?:e|es|ing))\b[^.!?]{0,60}?\b(?:price caps?|insulin caps?|drug price negotiation|premium tax credits?|out-of-pocket caps?)\b/i,
    outcome: /\b(?:too (?:high|expensive|much)|so expensive|sky-?high|skyrocket\w*|soar(?:ing|ed)|through the roof|out of reach|unaffordable|can(?:no|'|’)?t afford|cannot afford|struggl\w* to (?:pay|afford)|priced out|price gouging|crushing|rip-?off|ration(?:ing)? (?:insulin|medication|their medicine))\b/i,
  },
  // Every other issue key in the register (education, immigration, debt,
  // housing, energy, …): same rule engine, vocabulary from stance-topic-vocab.mjs.
  // The two core topics above are never replaced by a vocabulary entry.
  ...Object.fromEntries(Object.entries(buildTopicRules()).filter(([k]) => k !== "cost_living" && k !== "healthcare_costs")),
};

/** The hand-calibrated topics (Phase 4/5); every other key reads the vocabulary. */
export const CORE_TOPICS = ["cost_living", "healthcare_costs"];

/** Every topic the scorer has rules for, core topics first. */
export const SCORED_TOPICS = [...CORE_TOPICS, ...Object.keys(TOPIC_RULES).filter((k) => !CORE_TOPICS.includes(k))];

/** Topics that are scored for mentions only (no pole: a subject, not a position). */
export const NO_POLE_TOPICS = new Set(Object.entries(ISSUE_TOPIC_VOCAB).filter(([, v]) => v.noPole).map(([k]) => k));

export const topicLabel = (topic) => ISSUE_TOPIC_LABELS[topic] || String(topic || "").replace(/_/g, " ");

// ── WHO IS ACTING (rules version phase6-v2) ─────────────────────────────────
// A clear statement only counts as the page's own politician's position when
// the politician (or the page's own voice) is the one acting. There is NO list
// of opponent names. For the text before the cost verb, the scorer finds the
// NEAREST actor and classifies it as one of:
//   self      — first person (I / we / my / our), the page's own politician by
//               full name, surname or first name (from politician_id), or he / she (which
//               on a politician's own page refers to that politician).
//   opponent  — explicit framing on the page itself: "my opponent", "politicians
//               like X", "X promised to…", or ANY other named person or group
//               followed by an action verb ("Senator X voted to…", "Republicans
//               refuse…", "Texas has lowered…") that is not the page's politician.
//   third     — a clearly attributed third party acting: they / they're, or a
//               group that is the subject of a verb — corporations, companies,
//               retailers, billionaires, lobbyists, insurers, landlords,
//               "Big Pharma"-style groups, Wall Street, and so on.
// No actor at all (an imperative such as "Lower housing costs:" or "Pass a
// cost-of-living tax cut") is the page's own voice → self. Opponent and third
// party sentences are recorded as mentions at zero weight (R3) unless they
// carry explicit reversal language (R5).
const FIRST_PERSON = /\b(I|I'm|I’m|I've|I’ve|I'll|I’ll|I'd|I’d|me|my|we|we're|we’re|we've|we’ve|we'll|we’ll|us|our)\b/g;
const SELF_PRONOUN = /\b(he|she|he's|he’s|she's|she’s|he'll|he’ll|she'll|she’ll|his|her)\b/gi;
const OPPONENT_FRAMING = /\b(?:my|our|his|her|their)\s+(?:\w+\s+)?opponents?\b|\b(?:politicians?|people|folks) like\b|\bpromised to\b/gi;
// Third-party PRONOUNS are always the actor of their clause. Third-party GROUPS
// only count when they are the subject — followed by a verb — so "Big retailers
// are tracking…" is attributed to retailers, while "We must end these corporate
// subsidies and use the savings to cut property taxes" stays the speaker's own.
const THIRD_PARTY_PRONOUN = /\b(they|they're|they’re|they've|they’ve|they'll|they’ll)\b/gi;
const THIRD_PARTY_GROUP = /\b(corporations?|corporate (?:landlords|interests|executives|giants|America)|companies|retailers?|billionaires?|millionaires?|the (?:wealthy|rich)|lobbyists?|special interests|donors?|insurers?|insurance companies|landlords?|banks?|Wall Street|big (?:pharma|food|oil|tech|retailers?|banks?|insurance)|(?:drug|oil|tech|credit card) (?:companies|makers|giants)|monopolies|middlemen|PBMs?)(?=\s+(?:\w+ly\s+)?(?:are|is|was|were|have|has|had|will|would|can|could|keep|keeps|kept|use|uses|used|lobby|lobbies|lobbied|charge|charges|raise|raises|raised|jack|jacks|hike|hikes|hiked|set|sets|want|wants|get|gets|pay|pays|paid|make|makes|made|buy|buys|bought|refuse|refuses|try|tries|tried|continue|continues|rip|rips|profit|profits|gouge|gouges|squeeze|squeezes)\b)/gi;
const ACTION_VERB = "(?:has|have|had|is|are|was|were|will|would|wants?|voted|votes|promised|promises|refused|refuses|refuse|tried|tries|blocked|blocks|keeps?|kept|used|uses|took|takes|plans?|planned|pushed|pushes|passed|signed|lowered|cut|raised|raises|raise)";
const NAMED_ACTOR = new RegExp(`\\b((?:[A-Z][\\w'’.-]+)(?:\\s+(?:[A-Z][\\w'’.-]+|of|the|for))*?)\\s+${ACTION_VERB}\\b`, "g");
// Capitalised words that start a sentence or clause without naming anyone.
const NOT_A_NAME = new Set(["I", "We", "The", "This", "That", "These", "Those", "Now", "If", "In", "As", "And", "But", "So", "It", "He", "She", "They", "Our", "My", "His", "Her", "Their", "Who", "What", "When", "Why", "How", "Today", "Tonight", "Here", "There", "Everyone", "Nobody", "Americans", "Texans", "Families", "Workers"]);

const escapeRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function selfNamePattern(politicianId) {
  const parts = String(politicianId || "").split("_").filter((p) => p.length > 1);
  if (!parts.length) return null;
  // Full name, surname, or first name — campaign pages often say "Gina plans…".
  const names = [parts.join(" "), parts[parts.length - 1], parts[0]].map(escapeRe);
  return new RegExp(`\\b(?:${names.join("|")})(?:['’]s)?\\b`, "gi");
}

function lastMatch(re, text) {
  let m, last = null; re.lastIndex = 0;
  while ((m = re.exec(text))) { last = m; if (m[0] === "") re.lastIndex++; }
  return last;
}

/** Who is acting in `prefix` (the sentence text before the cost verb)? */
export function actorFor(prefix, politicianId) {
  const selfName = selfNamePattern(politicianId);
  const hits = [];
  const push = (kind, m, end = m.index + m[0].length) => m && hits.push({ kind, end, text: m[0] });
  let m;
  FIRST_PERSON.lastIndex = 0;
  while ((m = FIRST_PERSON.exec(prefix))) push("self", m);
  SELF_PRONOUN.lastIndex = 0;
  while ((m = SELF_PRONOUN.exec(prefix))) push("self", m);
  if (selfName) { selfName.lastIndex = 0; while ((m = selfName.exec(prefix))) push("self", m); }
  OPPONENT_FRAMING.lastIndex = 0;
  while ((m = OPPONENT_FRAMING.exec(prefix))) push("opponent", m);
  THIRD_PARTY_PRONOUN.lastIndex = 0;
  while ((m = THIRD_PARTY_PRONOUN.exec(prefix))) push("third", m);
  THIRD_PARTY_GROUP.lastIndex = 0;
  while ((m = THIRD_PARTY_GROUP.exec(prefix))) push("third", m);
  NAMED_ACTOR.lastIndex = 0;
  while ((m = NAMED_ACTOR.exec(prefix))) {
    const name = m[1];
    const words = name.split(/\s+/);
    if (words.length === 1 && NOT_A_NAME.has(name)) continue;
    if (NOT_A_NAME.has(words[0]) && words.length === 1) continue;
    if (selfName && (selfName.lastIndex = 0, selfName.test(name))) continue; // own politician acting → already a self hit
    push("opponent", m, m.index + name.length);
  }
  if (!hits.length) return { kind: "self", via: "page voice" };
  // Nearest actor to the verb wins. On a tie (a capitalised group such as
  // "Corporations are…" is both a named actor and a third-party group), the
  // more specific third-party label wins. Both are zero weight either way.
  const rank = { self: 0, opponent: 1, third: 2 };
  hits.sort((x, y) => x.end - y.end || rank[x.kind] - rank[y.kind]);
  const h = hits[hits.length - 1];
  return { kind: h.kind, via: h.text };
}

const REVERSAL = /\b(I('ve| have) changed my (mind|position)|I no longer (support|oppose)|I was wrong (about|to)|I now (support|oppose)|reversing my position)\b/i;

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", hellip: "…", mdash: "—", ndash: "–" };
function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

/** HTML → list of de-duplicated sentences. Text bodies pass through unchanged. */
export function extractSentences(body) {
  const text = decode(
    String(body || "")
      .replace(/<(script|style|noscript|svg|head)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
      // Source-code line breaks inside a paragraph are not sentence breaks.
      .replace(/\s+/g, " ")
      .replace(/<\/?(p|div|li|ul|ol|h[1-6]|br|blockquote|section|article|tr|td|header|footer|nav)\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  );
  const seen = new Set();
  const out = [];
  for (const block of text.split(/\n+/)) {
    for (const raw of block.split(/(?<=[.!?…])\s+/)) {
      const s = raw.replace(/\s+/g, " ").trim();
      if (s.length < 12 || seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

export function tierFor(sourceType) {
  if (HIGH_TYPES.test(sourceType || "")) return "high";
  if (MEDIUM_TYPES.test(sourceType || "")) return "medium";
  return "medium";
}

// R6 actor check. A topic noun that happens to be capitalised at the start of a
// sentence ("Rent is too high") is the subject, not a named opponent.
function implicationActor(prefix, r, politicianId) {
  const a = actorFor(prefix, politicianId);
  if (a.kind === "opponent" && r.mention.test(a.via) && !OPPONENT_FRAMING_TEST.test(a.via)) return { kind: "self", via: "page voice" };
  return a;
}
const OPPONENT_FRAMING_TEST = new RegExp(OPPONENT_FRAMING.source, "i");

/**
 * R6: a non-explicit sentence with directional implication → kind 'implication'
 * (via 'remedy' or 'outcome'), a mention attributed to someone else, or null.
 * Outcome implications are provisional: scoreRawRecord keeps them only when the
 * source repeats them (WEIGHTS.outcomeRepeatMin).
 */
function classifyImplication(sentence, r, politicianId) {
  if (!r.implySupport) return null;
  const ps = r.implySupport.exec(sentence);
  const po = r.implyOppose ? r.implyOppose.exec(sentence) : null;
  if ((ps || po) && !(ps && po)) {
    const m = ps || po;
    const actor = implicationActor(sentence.slice(0, m.index), r, politicianId);
    if (actor.kind === "self") return { kind: "implication", via: "remedy", side: ps ? "support" : "oppose", reversal: false, actor };
    return { kind: "mention", side: null, reversal: false, actor };
  }
  if (ps && po) return null;
  const om = r.outcome ? r.outcome.exec(sentence) : null;
  // A rhetorical question names a problem without saying what should change.
  if (om && !/\?\s*$/.test(sentence) && r.mention.test(sentence)) {
    const actor = implicationActor(sentence.slice(0, om.index), r, politicianId);
    if (actor.kind === "self") return { kind: "implication", via: "outcome", side: "support", reversal: false, actor };
    return { kind: "mention", side: null, reversal: false, actor };
  }
  return null;
}

/**
 * Classify one sentence → { kind: 'clear'|'implication'|'mention'|null, side, reversal, actor, via? }.
 * `politicianId` is the page's own politician (raw.politician_id).
 */
export function classify(sentence, topic, politicianId = null) {
  const r = TOPIC_RULES[topic];
  if (!r) throw new Error(`no scoring rules for topic ${topic}`);
  const reversal = REVERSAL.test(sentence);
  const inContext = !r.context || r.context.test(sentence);
  const sm = inContext ? r.support.exec(sentence) : null;
  const om = inContext ? r.oppose.exec(sentence) : null;
  if ((sm || om) && !(sm && om)) {
    const m = sm || om;
    const actor = actorFor(sentence.slice(0, m.index), politicianId);
    if (actor.kind === "self" || reversal) {
      return { kind: "clear", side: sm ? "support" : "oppose", reversal, actor };
    }
    return { kind: "mention", side: null, reversal: false, actor };
  }
  const imp = !(sm || om) && inContext ? classifyImplication(sentence, r, politicianId) : null;
  if (imp) return imp;
  if (sm || om || r.mention.test(sentence)) return { kind: "mention", side: null, reversal: false, actor: null };
  return { kind: null, side: null, reversal: false, actor: null };
}

// ── R7: a problem mention + a nearby direction from the same speaker ────────
// Problem framing on the mention sentence: the topic's own outcome rule, or
// common hardship language. Only topics with an outcome rule pair (that rule is
// what fixes the side: support = the speaker wants the problem changed).
const PROBLEM_CUE = /\b(?:struggl\w*|hurting|falling behind|can(?:no|'|’)?t keep up|stretched (?:thin|to the limit)|squeez\w*|burden\w*|crisis|paying more|feel(?:ing)? the pinch|getting harder|harder (?:and harder )?to|making ends meet|paycheck to paycheck|too many (?:families|people|Texans|Americans|workers|seniors))\b/i;
// A direction from the speaker: a first-person commitment, "that's why I/we",
// "let's …" or "it's time to …". Negated commitments do not count.
const DIRECTION_CUE = /\b(?:(?:I|we)\s+(?:will|must|should|need to|have to|am going to|are going to|plan to|intend to|promise to|pledge to|am committed to|are committed to|am fighting|are fighting|fight|can)|(?:I|we)['’](?:ll|m going to|re going to|m fighting|re fighting))\b(?!\s+(?:not|never)\b)|\b(?:that['’]s why|this is why|which is why)\s+(?:I|we)\b|\blet['’]s\s+(?!not\b)\w+|\bit['’]s time (?:to|for)\b/i;

/** Is `sentence` a direction/remedy from the page's own speaker? (R7) */
export function nearbyDirection(sentence, politicianId = null) {
  if (/\?\s*$/.test(sentence)) return false;
  const m = DIRECTION_CUE.exec(sentence);
  if (!m) return false;
  return actorFor(sentence.slice(0, m.index), politicianId).kind === "self";
}

/** Does this mention sentence frame a problem the topic's outcome rule gives a side to? (R7) */
export function namesProblem(sentence, topic) {
  const r = TOPIC_RULES[topic];
  if (!r?.outcome || /\?\s*$/.test(sentence)) return false;
  return r.outcome.test(sentence) || PROBLEM_CUE.test(sentence);
}

const trunc = (t) => (t.length > 300 ? t.slice(0, 297) + "…" : t);

const round2 = (n) => Math.round(n * 100) / 100;
const clamp = (n) => Math.max(0, Math.min(WEIGHTS.maxConfidence, n));

/**
 * Score one raw ingest record → candidate stance. Pure: never mutates `raw`.
 * `topic` defaults to the record's own topic; the cron also scores the same
 * page against every other topic (see scoreAllTopics).
 */
export function scoreRawRecord(raw, topic = raw?.topic, sentences = null) {
  for (const k of ["url", "fetched_at", "source_type", "politician_id", "topic", "body"]) {
    if (!(k in (raw || {}))) throw new Error(`raw record missing ${k}`);
  }
  const tier = tierFor(raw.source_type);
  let statements = [];
  // `sentences` lets scoreAllTopics parse the page once for every topic.
  const list = sentences || extractSentences(raw.body);
  const at = new Map(); // sentence index → its statement (R7 pairing)
  for (let i = 0; i < list.length; i++) {
    const text = list[i];
    const c = classify(text, topic, raw.politician_id);
    if (!c.kind) continue;
    at.set(i, statements.length);
    statements.push({
      _i: i,
      text: trunc(text),
      kind: c.kind,
      side: c.side,
      reversal: c.reversal,
      ...(c.kind === "implication" ? { implication: c.via } : {}),
      ...(c.actor && c.actor.kind !== "self" ? { attributed_to: c.actor.kind, attributed_via: c.actor.via } : {}),
      weight: c.kind === "clear" ? WEIGHTS[tier] : c.kind === "implication" ? WEIGHTS.implication : WEIGHTS.zero,
    });
  }
  // R6(b): a lone outcome highlight is not repeated → back to a zero-weight mention.
  const outcomes = statements.filter((s) => s.kind === "implication" && s.implication === "outcome");
  if (outcomes.length < WEIGHTS.outcomeRepeatMin) {
    for (const s of outcomes) { s.kind = "mention"; s.side = null; s.weight = WEIGHTS.zero; delete s.implication; }
  }
  // R7: a problem mention + a direction within the next pairWindow sentences
  // from the same speaker → one medium-weight implication.
  const folded = new Set();
  for (const s of statements) {
    if (s.kind !== "mention" || s.attributed_to || folded.has(s._i) || !namesProblem(list[s._i], topic)) continue;
    for (let j = s._i + 1; j <= s._i + WEIGHTS.pairWindow && j < list.length; j++) {
      const other = at.has(j) ? statements[at.get(j)] : null;
      if (other && (other.kind === "clear" || other.kind === "implication")) break; // already counts on its own
      if (folded.has(j) || other?.attributed_to) continue;
      if (!nearbyDirection(list[j], raw.politician_id)) continue;
      s.kind = "implication"; s.implication = "nearby"; s.side = "support"; s.weight = WEIGHTS.implication;
      s.text = trunc(`${list[s._i]} ${list[j]}`);
      s.paired_with = trunc(list[j]);
      folded.add(s._i); folded.add(j);
      break;
    }
  }
  statements = statements.filter((s) => !(s.kind === "mention" && folded.has(s._i)));
  for (const s of statements) delete s._i;
  const clear = statements.filter((s) => s.kind === "clear");
  const implied = statements.filter((s) => s.kind === "implication");
  const mentions = statements.length - clear.length - implied.length;
  const w = { support: 0, oppose: 0 };
  const n = { support: 0, oppose: 0 };     // explicit statements per side
  const ni = { support: 0, oppose: 0 };    // implications per side
  for (const s of clear) { w[s.side] += s.weight; n[s.side] += 1; }
  for (const s of implied) { w[s.side] += s.weight; ni[s.side] += 1; }
  const signals = clear.length + implied.length;

  let position, confidence, reason;
  const reversal = clear.filter((s) => s.reversal).at(-1);
  if (reversal) {
    position = reversal.side;
    confidence = WEIGHTS.baseConfidence[tier];
    reason = `explicit reversal language sets the position to ${position} (R5); earlier statements not counted as corroboration`;
  } else if (!signals) {
    position = "no clear position";
    confidence = mentions ? WEIGHTS.mentionOnlyConfidence : 0;
    reason = mentions ? `${mentions} topic mention(s), none states a clear position (R3)` : "topic not found in source";
  } else if (w.support === w.oppose) {
    position = "mixed";
    confidence = 0.5;
    reason = `equal weight of directional signals on both sides (${n.support + ni.support} vs ${n.oppose + ni.oppose}; ${implied.length} implication(s))`;
  } else {
    position = w.support > w.oppose ? "support" : "oppose";
    const other = position === "support" ? "oppose" : "support";
    const consistent = n[position] + ni[position];
    const outliers = n[other] + ni[other];
    // Base rests on the strongest kind of signal for the winning side.
    confidence = n[position] ? WEIGHTS.baseConfidence[tier] : WEIGHTS.baseConfidence.implication;
    const parts = [];
    if (n[position]) parts.push(`${n[position]} clear ${tier}-weight statement(s) for ${position}`);
    parts.push(`${ni[position]} implication(s) for ${position} at medium weight (R6)`);
    if (consistent >= WEIGHTS.corroborationMin) {
      confidence += WEIGHTS.corroborationBonus;
      parts.push(`≥${WEIGHTS.corroborationMin} consistent raise confidence (R4)`);
    }
    if (outliers) {
      if (outliers >= consistent) { position = "mixed"; confidence = 0.5; }
      else confidence -= WEIGHTS.outlierPenalty * outliers;
      parts.push(`${outliers} outlier(s) without reversal language lower confidence, do not flip (R5)`);
    }
    // R8: an explicit, uncontested claim on a primary source is a normal
    // stated position. Only the stated layer moves; formal record is untouched.
    if (position !== "mixed" && n[position] && !outliers && isPrimarySource(raw.source_type, raw.final_url || raw.url)
        && confidence < WEIGHTS.statedPositionConfidence) {
      confidence = WEIGHTS.statedPositionConfidence;
      parts.push(`explicit claim on a primary source reads as a stated position (R8)`);
    }
    if (mentions) parts.push(`${mentions} mention(s) recorded at zero weight (R3)`);
    reason = parts.join("; ");
  }
  const stated = (position === "support" || position === "oppose") && n[position] > 0 &&
    isPrimarySource(raw.source_type, raw.final_url || raw.url);

  const firstClear = clear.find((s) => s.side === position) || clear[0]
    || implied.find((s) => s.side === position) || implied[0];
  return {
    politician_id: raw.politician_id,
    topic,
    position,
    confidence: round2(clamp(confidence)),
    confidence_reason: reason,
    sources: [{
      type: raw.source_type,
      date: String(raw.fetched_at).slice(0, 10),
      link: raw.url,
      excerpt: firstClear ? firstClear.text : (statements[0]?.text ?? null),
      note: `${clear.length} clear statement(s) (${n.support} support, ${n.oppose} oppose), ${implied.length} implication(s) (${ni.support} support, ${ni.oppose} oppose), ${mentions} mention(s) at zero weight`,
      weight_tier: tier,
      takes_clear_position: clear.length > 0,
      implication_count: implied.length,
      statements,
    }],
    // R8: the stated layer only. A stated position is what the candidate said
    // on a primary source; it is never a formal record or completed action.
    ...(stated ? { stated_position: true } : {}),
    layer: "stated",
    formal_record: false,
    rules_version: RULES_VERSION,
    ...(CORE_TOPICS.includes(topic) ? {} : { vocab_version: VOCAB_VERSION }),
    ...(topic !== raw.topic ? { page_topic: raw.topic } : {}),
    raw_fetched_at: raw.fetched_at,
  };
}

/** Did the scorer find any directional signal (explicit or implied) for this candidate? */
export const directionalSignals = (c) => {
  const st = c?.sources?.[0]?.statements || [];
  return st.filter((s) => s.kind === "clear" || s.kind === "implication").length;
};

/** Cross-topic scoring reads at most this many sentences per page (a campaign page has far fewer). */
export const CROSS_TOPIC_MAX_SENTENCES = 1200;

/**
 * Score one page against EVERY topic. Returns candidates in SCORED_TOPICS order
 * with the page's own topic first:
 *   · the page's own topic always (exactly as before — strong, weak or mention);
 *   · any other topic only when the page carries at least one directional
 *     signal on it (explicit or implied). A bare passing mention of another
 *     issue is not a finding about that issue, so it produces no candidate.
 *   · a no-pole topic never yields a cross-topic candidate (it has no direction).
 */
export function scoreAllTopics(raw, { topics = SCORED_TOPICS, maxCrossSentences = CROSS_TOPIC_MAX_SENTENCES } = {}) {
  const out = [];
  const sentences = extractSentences(raw?.body);
  if (hasRulesFor(raw?.topic)) out.push(scoreRawRecord(raw, raw.topic, sentences));
  // The page's own topic reads every sentence, as before; the other topics read
  // the first CROSS_TOPIC_MAX_SENTENCES so a runaway page cannot stretch a run.
  const cross = sentences.length > maxCrossSentences ? sentences.slice(0, maxCrossSentences) : sentences;
  const extra = [];
  for (const t of topics) {
    if (t === raw?.topic || !hasRulesFor(t) || NO_POLE_TOPICS.has(t)) continue;
    const c = scoreRawRecord(raw, t, cross);
    if (directionalSignals(c) > 0) extra.push(c);
  }
  return [...out, ...collapseRestatements(out, extra)];
}

/** The directional sentences a candidate rests on (R9). */
const claimSet = (c) => new Set((c?.sources?.[0]?.statements || [])
  .filter((s) => s.kind === "clear" || s.kind === "implication").map((s) => s.text));
const explicitCount = (c) => (c?.sources?.[0]?.statements || []).filter((s) => s.kind === "clear").length;

/**
 * R9: drop cross-topic candidates that only restate claims a kept candidate
 * from the same page already carries. `kept` (the page's own topic) always
 * stays; the rest are considered most-explicit first, then by confidence, then
 * in SCORED_TOPICS order. Returns the survivors in their original order.
 */
export function collapseRestatements(kept, extra) {
  const held = kept.map(claimSet);
  const order = extra.map((c, i) => ({ c, i }))
    .sort((a, b) => explicitCount(b.c) - explicitCount(a.c) || b.c.confidence - a.c.confidence || a.i - b.i);
  const keep = new Set();
  for (const { c, i } of order) {
    const mine = claimSet(c);
    const dup = mine.size > 0 && held.some((h) => [...mine].every((x) => h.has(x)));
    if (dup) continue;
    held.push(mine);
    keep.add(i);
  }
  return extra.filter((_, i) => keep.has(i));
}

/** Compare a candidate to the ground truth. */
export function compareToGroundTruth(candidate, gt) {
  if (candidate.politician_id !== gt.politician_id || candidate.topic !== gt.topic) {
    throw new Error(`ground truth is for ${gt.politician_id}|${gt.topic}, candidate is ${candidate.politician_id}|${candidate.topic}`);
  }
  const delta = round2(candidate.confidence - gt.confidence);
  const positionMatch = candidate.position === gt.position;
  const confidenceWithin = Math.abs(candidate.confidence - gt.confidence) <= CONFIDENCE_TOLERANCE + 1e-9;
  const sign = delta >= 0 ? "+" : "";
  const note =
    `stance-score: ${candidate.politician_id}|${candidate.topic} ` +
    `position ${positionMatch ? "MATCH" : "MISMATCH"} (candidate ${candidate.position}, ground truth ${gt.position}); ` +
    `confidence ${candidate.confidence} vs ${gt.confidence}, Δ=${sign}${delta.toFixed(2)} ` +
    `${confidenceWithin ? "within" : "OUTSIDE"} ${CONFIDENCE_TOLERANCE}`;
  return { positionMatch, confidenceWithin, delta, note };
}

/** Score + compare + log. `log` defaults to console.log. Returns both. */
export function scoreAgainstGroundTruth(raw, gt, { log = console.log } = {}) {
  const candidate = scoreRawRecord(raw);
  const comparison = compareToGroundTruth(candidate, gt);
  const { sources, ...head } = candidate;
  log(`stance-score: candidate ${JSON.stringify({ ...head, sources: sources.map(({ statements, ...s }) => s) })}`);
  log(comparison.note);
  return { candidate, comparison };
}

/** Node convenience: read the ground-truth file (read-only) and score. */
export async function scoreWithGroundTruthFile(raw, groundTruthPath, opts) {
  const { readFile } = await import("node:fs/promises");
  const gt = JSON.parse(await readFile(groundTruthPath, "utf8"));
  return scoreAgainstGroundTruth(raw, gt, opts);
}

/** Whether the scorer has rules for a topic. */
export const hasRulesFor = (topic) => Object.prototype.hasOwnProperty.call(TOPIC_RULES, topic);

/**
 * Phase 5 log-only hook for the ingest cron: score one freshly stored raw
 * record and LOG the candidate. Never writes anything, never throws.
 * Logs two lines: the candidate (position + confidence + reason), and a
 * one-line note on whether the rules produced a clear position.
 */
export function logCandidateStance(raw, { log = console.log } = {}) {
  const id = `${raw?.politician_id}|${raw?.topic}${raw?.source_id ? "|" + raw.source_id : ""}`;
  try {
    if (!hasRulesFor(raw?.topic)) {
      log(`stance-score: SKIP ${id} — no scoring rules for topic ${raw?.topic}`);
      return null;
    }
    const c = scoreRawRecord(raw);
    const src = c.sources[0];
    log(`stance-score: candidate ${JSON.stringify({ politician_id: c.politician_id, topic: c.topic, ...(raw.source_id ? { source_id: raw.source_id } : {}), url: src.link, position: c.position, confidence: c.confidence, confidence_reason: c.confidence_reason, rules_version: c.rules_version })}`);
    const clear = c.position !== "no clear position";
    log(`stance-score: ${id} → ${clear ? `CLEAR POSITION (${c.position}, ${c.confidence})` : "NO CLEAR POSITION"} — ${src.note}`);
    return c;
  } catch (e) {
    log(`stance-score: ERROR ${id} — ${e?.message || e}`);
    return null;
  }
}

/**
 * Multi-topic hook for the ingest cron. Logs the page's own topic exactly as
 * logCandidateStance does, then one pair of "stance-score: cross-topic …" lines
 * per other topic the page produced a directional candidate on. Never writes,
 * never throws. Returns every candidate (own topic first).
 */
export function logCandidateStances(raw, { log = console.log, topics } = {}) {
  const own = logCandidateStance(raw, { log });
  const id = `${raw?.politician_id}${raw?.source_id ? "|" + raw.source_id : ""}`;
  let extra = [];
  try {
    extra = scoreAllTopics(raw, topics ? { topics } : {}).filter((c) => c.topic !== raw?.topic);
  } catch (e) {
    log(`stance-score: ERROR ${id} cross-topic — ${e?.message || e}`);
    extra = [];
  }
  for (const c of extra) {
    const src = c.sources[0];
    log(`stance-score: cross-topic candidate ${JSON.stringify({ politician_id: c.politician_id, topic: c.topic, page_topic: raw.topic, ...(raw.source_id ? { source_id: raw.source_id } : {}), url: src.link, position: c.position, confidence: c.confidence, confidence_reason: c.confidence_reason, rules_version: c.rules_version, vocab_version: c.vocab_version })}`);
    log(`stance-score: cross-topic ${raw.politician_id}|${c.topic}${raw.source_id ? "|" + raw.source_id : ""} (from ${raw.topic} page) — ${c.position === "no clear position" ? "NO CLEAR POSITION" : `${c.position.toUpperCase()} ${c.confidence}`} — ${src.note}`);
  }
  const topicsHit = [...new Set(extra.map((c) => c.topic))];
  if (own || extra.length) log(`stance-score: ${id} scored against ${SCORED_TOPICS.length} topics — page topic ${raw?.topic}${topicsHit.length ? `; also ${topicsHit.join(", ")}` : "; no other topic"}`);
  return [...(own ? [own] : []), ...extra];
}
