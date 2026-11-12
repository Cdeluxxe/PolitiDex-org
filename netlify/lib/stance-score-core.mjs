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
//       phase8-v2 extends R8 to further first-party sources: floor speeches
//       (a "floor speech"/"Congressional Record" label or a Congressional
//       Record link), co-sponsor statements, and press/news/media releases —
//       a release not labelled official and not on a .gov/.mil host must name
//       a specific bill or a concrete outcome. The statement that sets the
//       position must be the candidate's own: a quote attributed to someone
//       else ("…,” said Rep. Jane Doe) never lifts the read (quoteSpeakers).
//       The candidate carries primary_kind. News articles, third-party
//       summaries, implication-only reads and pure mentions do not move.
//   R9  One claim, one issue (phase8): when a page's cross-topic candidate rests
//       only on sentences another kept candidate from the same page already
//       carries, it restates the same claim under another issue key and is
//       dropped (scoreAllTopics). The page's own topic is always kept; among
//       other topics the one resting on more explicit statements wins.
//       (phase8-v3) A candidate resting on an R10 campaign-claim statement is
//       specific to its key and is never dropped as a restatement.
//   R10 Campaign-claim patterns (phase8-v3): on campaign pages, official issue
//       pages and the candidate's own speeches/remarks (claimPageKind), a small
//       set of explicit-claim forms the general rules missed also count as
//       clear statements — other verb forms ("lowers premiums", "will lower"),
//       the passive ("so that costs are lowered"), "works to expand access,
//       lower cost", "is a proponent of … housing", "leading the effort to
//       provide … $10 per day childcare", "rein in … excessive government
//       spending … inflation" across a long clause, "ensure … can afford their
//       prescription drugs", and "the … vouchers scam" (CLAIM_RULES). The same
//       own-words checks apply: the actor must be the page's politician, and a
//       quote from someone else never sets an R8 stated position. Newsrooms,
//       releases and secondary sources do not read these patterns.
//   R11 Who is acting, two corrections (phase8-v3):
//         (a) he / she / his / her after another person's possessive or after
//             opponent framing in the same sentence refers to that person —
//             "Trump’s declaration that he … his promise to bring down prices"
//             is Trump and "my opponent claims his plan …" is the opponent,
//             not the page's politician. Only a PERSON possessive counts — a
//             person name from the site's people index, a title + name, or a
//             person role ("the President’s"); places, organisations and
//             generic nouns ("Hollywood’s", "the state’s") do not;
//         (b) on the oppose side, a non-speaker subject directly before an -ing
//             verb is the actor — "the Supreme Court Ruling Gutting the Voting
//             Rights Act" is the ruling, not the candidate.
//   R12 Subject spans (directional keys only): a sentence that continues a
//       subject without naming it again (paragraph-aware carry, the sentence
//       just before the subject is named when it is the same claim, and
//       follow-ups after a sentence naming two subjects) is read as about that
//       subject, until a clear subject change. Inside the Israel subject each
//       split key reads only its own facet (offensive / defensive). Spans need not be contiguous: every span on a subject,
//       anywhere on the page, feeds the one candidate for each key on that
//       subject, weighed with the usual support / oppose / mixed logic. The
//       candidate records how many spans were joined (`subject`). Register
//       topics (SCORED_TOPICS) have no subject and read exactly as before.
//       R9 linked keys: a directional key and its parent (iran_hostilities /
//       war_powers) are never restatements of each other — the line counts on
//       both.
//   Splitter: an initialism ("U.S.", "U.N.", "A.I.") or a short abbreviation
//       ("Jan.", "vs.", "e.g.") does not end a sentence (mergeAbbreviations).
//

// Calibration: the ground truth (0.85) rests on first-party campaign pages
// with several explicit commitments, so a medium-tier base of 0.70 plus the
// R4 corroboration bonus of 0.15 reproduces it. These numbers live in WEIGHTS
// so a later tweak is one edit, and the comparison log prints the exact delta.

import { buildTopicRules, buildDirectionalTopicRules, ISSUE_TOPIC_VOCAB, ISSUE_TOPIC_LABELS, DIRECTIONAL_TOPIC_VOCAB, DIRECTIONAL_ISSUE_KEYS } from "./stance-topic-vocab.mjs";
import { PERSON_SURNAMES, PLACE_SURNAMES, PLACE_SURNAME_FULL_NAMES } from "./stance-person-names.mjs";

export const RULES_VERSION = "phase8-v3";
// Vocabulary version for the issue keys scored from stance-topic-vocab.mjs
// (every register key except the two hand-calibrated core topics).
export const VOCAB_VERSION = "issue-vocab-v1";
// Vocabulary version for the directional keys (DIRECTIONAL_TOPICS); the 125
// register keys keep VOCAB_VERSION.
export const DIRECTIONAL_VOCAB_VERSION = "issue-vocab-v2-directional";

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

// R8 (phase8-v2): further first-party sources of the candidate's own words.
const FLOOR_TYPES = /\b(?:floor (?:speech|remarks|statement|debate)|congressional record)\b/i;
const COSPONSOR_TYPES = /\bco-?sponsor(?:s|ed|ing|ship)?\b/i;
const RELEASE_TYPES = /\b(?:press|news|media) (?:release|statement)s?\b|\bnewsroom\b/i;

const linkParts = (link) => {
  try { const u = new URL(link); return { host: u.hostname.toLowerCase(), path: u.pathname.toLowerCase() }; }
  catch { return { host: "", path: "" }; }
};

/**
 * What kind of first-party source is this (R8)? → "floor_speech" |
 * "cosponsor_statement" | "press_release" | "speech" | "statement" |
 * "official_page" | "campaign_page" | null (secondary: news articles,
 * third-party summaries, anything unlabelled off a .gov/.mil host).
 */
export function primarySourceKind(sourceType, link) {
  const t = String(sourceType || "");
  const { host, path } = linkParts(link);
  if (FLOOR_TYPES.test(t) || (/(^|\.)congress\.gov$/.test(host) && /congressional-record/.test(path))
      || (/(^|\.)govinfo\.gov$/.test(host) && /\bcrec\b|crec-/.test(path))) return "floor_speech";
  if (COSPONSOR_TYPES.test(t)) return "cosponsor_statement";
  if (RELEASE_TYPES.test(t) || /\bpress release\b/i.test(t)) return "press_release";
  if (/\b(?:speech|remarks|transcript)\b/i.test(t)) return "speech";
  if (/\bstatement\b/i.test(t)) return "statement";
  if (PRIMARY_TYPES.test(t)) return /\bofficial\b/i.test(t) ? "official_page" : "campaign_page";
  if (/\.(gov|mil)$/.test(host)) return "official_page";
  return null;
}

/**
 * R8 eligibility of a source: { kind, needsSpecific } or null. Sources the
 * phase8-v1 rule already read as primary (campaign/official pages, .gov/.mil
 * links, press releases, statements, speeches) keep reading that way with no
 * extra condition. Of the sources added in phase8-v2, floor speeches and
 * co-sponsor statements qualify as they are; a release that is neither
 * labelled official nor on a .gov/.mil host (a "news release", a "newsroom"
 * post) qualifies only when it names a specific bill or a concrete outcome.
 */
export function statedSourceRule(sourceType, link) {
  const kind = primarySourceKind(sourceType, link);
  if (!kind) return null;
  const legacy = PRIMARY_TYPES.test(String(sourceType || "")) || /\.(gov|mil)$/.test(linkParts(link).host);
  return { kind, needsSpecific: kind === "press_release" && !legacy };
}

/** Is this a primary source of the candidate's own words (R8)? */
export function isPrimarySource(sourceType, link) {
  return primarySourceKind(sourceType, link) !== null;
}

/** Reader-facing labels for the R8 reason line (page kinds keep the old wording). */
export const KIND_LABELS = { floor_speech: "floor speech", cosponsor_statement: "co-sponsor statement", press_release: "press release" };

// A specific bill (H.R. 1234, S. 56, H.Res. 7, "the Affordable Insulin Now Act")
// or a concrete outcome ($35 a month, 10 percent, 2 million families).
const NAMED_BILL = /\b(?:H\.\s?R|H\.\s?(?:J\.\s?|Con\.\s?)?Res|S\.\s?(?:J\.\s?|Con\.\s?)?Res)\.\s?\d+\b|(?<![\w.])S\.\s?\d+\b|\b(?:[A-Z][\w'’-]*,?\s+(?:(?:of|for|and|the|to|in|on|&)\s+)*){1,10}Act\b(?:\s+of\s+\d{4})?/;
const NAMED_OUTCOME = /\$\s?\d[\d,.]*|\b\d[\d,.]*\s?(?:%|percent)\b|\b\d[\d,.]*\s+(?:thousand|million|billion|trillion|families|people|seniors|veterans|students|workers|jobs|homes|patients)\b/i;
/** Does this text name a specific bill or a concrete outcome (R8, releases)? */
export const namesBillOrOutcome = (text) => NAMED_BILL.test(String(text || "")) || NAMED_OUTCOME.test(String(text || ""));

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
  // Directional keys (vocab v2): ukraine_aid, iran_hostilities and the three
  // Israel keys. Scored by name (scoreRawRecord(raw, key)) or by passing them
  // to scoreAllTopics({ topics }); they are NOT in the default register sweep.
  ...buildDirectionalTopicRules(),
};

/** Directional keys with rules (vocab v2). Opt-in: not part of SCORED_TOPICS. */
export const DIRECTIONAL_TOPICS = Object.keys(DIRECTIONAL_TOPIC_VOCAB);

// R10 (phase8-v3): explicit-claim forms the general rules miss, read only on
// campaign pages, official issue pages and the candidate's own speeches. Each
// rule is { side, re, context? }: `context`, when set, must also match the
// sentence (it replaces the topic's general context check). Deliberately
// narrow: no generic "fight for", no "money in your pocket", no bare problem
// statements — every form names the remedy or the thing supported.
const HEALTH_CONTEXT = /\b(?:health\w*|medical|medicaid|medicare|insurance|premiums?|prescriptions?|drugs?|insulin|co-?pays?|deductibles?|hospitals?|patients?|Affordable Care Act|ACA|Obamacare)\b/i;
const HEALTH_COST_OBJECT = String.raw`(?:premiums?|co-?pays?|deductibles?|out-of-pocket (?:costs?|spending)|(?:health ?care|medical|drug|prescription(?: drug)?|insurance) (?:costs?|prices?|bills?))`;
export const CLAIM_RULES = {
  healthcare_costs: [
    // Verb forms: "a solution which lowers premiums", "lowered co-pays", "will lower premiums".
    { side: "support", context: HEALTH_CONTEXT, re: new RegExp(String.raw`\b(?:lowers|lowered|will lower)\b[^.!?]{0,40}?\b${HEALTH_COST_OBJECT}\b`, "i") },
    // Passive: "so that costs are lowered", "premiums will be reduced".
    { side: "support", context: HEALTH_CONTEXT, re: /\b(?:costs?|prices?|premiums?|co-?pays?|deductibles?|out-of-pocket costs?)\s+(?:are|is|will be|would be|can be|get|gets)\s+(?:lowered|reduced|cut|capped|brought down)\b/i },
    // "works to expand access, lower cost, and keep Texans healthy".
    { side: "support", context: HEALTH_CONTEXT, re: /\bwork(?:s|ed|ing)? to expand access\b,?\s+(?:and\s+)?lower(?:s|ing)? (?:the )?costs?\b/i },
    // "ensure that families … can afford their prescription drugs".
    { side: "support", re: /\bensur(?:e|es|ed|ing)\b[^.!?]{0,60}?\bcan afford\b[^.!?]{0,20}?\b(?:(?:their|the|its|our|your) )?(?:prescription drugs?|prescriptions|medications?|medicines?|insulin|health ?care(?: costs)?|health insurance|medical (?:care|bills|costs))\b/i },
  ],
  housing: [
    // "Congresswoman Crockett is a proponent of an array of housing options".
    { side: "support", re: /\b(?:is|am|are|been|be)\s+an?\s+(?:\w+\s+)?proponent of\b[^.!?]{0,40}?\b(?:affordable )?housing\b/i },
  ],
  child_care: [
    // "I am leading the effort to provide families with $10 per day childcare".
    { side: "support", re: /\blead(?:s|ing)? the effort to provide\b[^.!?]{0,40}?(?:\$\s?\d+(?:\.\d{2})?\s?(?:per|a|\/)\s?day|affordable|universal)\s+child ?care\b/i },
  ],
  cut_spending: [
    // "rein in … excessive government spending …, which instigated our present inflation crisis" — however long the clause.
    { side: "support", re: /\brein(?:s|ing)? in\b[^.!?]{0,60}?\b(?:excessive|wasteful|reckless|runaway|out-of-control) (?:government |federal )?spending\b[^.!?]{0,200}?\binflation\b/i },
  ],
  school_choice: [
    // "repair the damage of the Texas vouchers scam" (against vouchers).
    { side: "oppose", re: /(?:\brepair(?:s|ing)? the damage (?:of|from|done by)\b[^.!?]{0,40}?)?\bvouchers? scams?\b/i },
  ],
};

/** Source kinds that read the R10 campaign-claim patterns. */
const CLAIM_PAGE_KINDS = new Set(["campaign_page", "official_page", "speech"]);
/** Does this source read the R10 campaign-claim patterns? (campaign / official issue pages, own speeches) */
export const isClaimPage = (sourceType, link) => CLAIM_PAGE_KINDS.has(primarySourceKind(sourceType, link));

/** The hand-calibrated topics (Phase 4/5); every other key reads the vocabulary. */
export const CORE_TOPICS = ["cost_living", "healthcare_costs"];

/** Every topic the scorer has rules for, core topics first. */
export const SCORED_TOPICS = [...CORE_TOPICS, ...Object.keys(TOPIC_RULES).filter((k) => !CORE_TOPICS.includes(k) && !DIRECTIONAL_TOPICS.includes(k))];

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

// R11(a): a named person a he / she / his / her refers back to — a capitalised
// possessive ("Trump’s declaration that he …") or opponent framing ("my
// opponent claims his plan …"). A name that is only an object
// ("Alongside President Trump, he will …") does not take the pronoun.
// Only a PERSON possessive takes the pronoun (phase8-v3, R11a person names):
//   · a person name — a surname of someone in the site's people index
//     (stance-person-names.mjs: "Trump’s", "Abbott’s"); surnames that are also
//     places or everyday words (Austin, Hill, King …) only as a full name;
//   · a title + name — "President Trump’s", "Speaker Johnson’s", "Dr. King’s";
//   · a person role — "the President’s", "my opponent’s", "the governor’s".
// Places, organisations and generic nouns ("Hollywood’s", "Ohio’s", "the
// state’s", "the city’s", "the Association’s") never do.
const POSSESSIVE = /\b([A-Z][\p{L}'’-]*?)['’]s(?=\s|$)/gu;
const PERSON_TITLE = /(?:\b(?:President|Vice President|Speaker|Leader|Senator|Sen|Rep|Representative|Congressman|Congresswoman|Governor|Gov|Lt|Lieutenant Governor|Attorney General|General|Mayor|Judge|Justice|Secretary|Commissioner|Sheriff|Chairman|Chairwoman|Mr|Mrs|Ms|Dr)\.?\s+(?:[A-Z][\p{L}.'’-]*\s+){0,2})$/u;
const PERSON_ROLE = /(?:\b(?:the|my|our|your|his|her|their|this|that)\s+(?:\w+\s+)?|\b)(?:opponents?|president|vice president|governor|lieutenant governor|senator|congressman|congresswoman|congressmember|representative|speaker|mayor|attorney general|secretary|commissioner|candidate|incumbent|challenger|chairman|chairwoman|sheriff|judge)['’]s(?=\s|$)/giu;
const ROLE_NEEDS_DETERMINER = /^(?:the|my|our|your|his|her|their|this|that)\s/i;

/** Every person possessive in `text` → [{ text, end }]. */
function personPossessives(text) {
  const out = [];
  let m;
  POSSESSIVE.lastIndex = 0;
  while ((m = POSSESSIVE.exec(text))) {
    const head = m[1];
    const pre = text.slice(0, m.index);
    const full = (/([A-Z][\p{L}'’-]*)\s+$/u.exec(pre) || [])[1];
    const titled = PERSON_TITLE.test(pre);
    const isPerson = titled
      || PERSON_SURNAMES.has(head)
      || (PLACE_SURNAMES.has(head) && !!full && PLACE_SURNAME_FULL_NAMES.has(`${full} ${head}`));
    if (isPerson) out.push({ text: m[0], end: m.index + m[0].length });
  }
  PERSON_ROLE.lastIndex = 0;
  while ((m = PERSON_ROLE.exec(text))) {
    // A lower-case role needs a determiner ("the governor’s"); a capitalised one does not ("President’s").
    if (!ROLE_NEEDS_DETERMINER.test(m[0]) && !/^[A-Z]/.test(m[0])) continue;
    out.push({ text: m[0], end: m.index + m[0].length });
  }
  return out.sort((a, b) => a.end - b.end);
}

/** The other named person `before` ends with (no self name after it), or null. */
function pronounAntecedent(before, selfName) {
  let m, other = null;
  for (const p of personPossessives(before)) {
    if (selfName && (selfName.lastIndex = 0, selfName.test(p.text))) continue;
    other = p;
  }
  // "My opponent claims his plan …" — the pronoun is the opponent's.
  OPPONENT_FRAMING.lastIndex = 0;
  while ((m = OPPONENT_FRAMING.exec(before))) {
    const end = m.index + m[0].length;
    if (!other || end > other.end) other = { text: m[0], end };
  }
  if (!other) return null;
  const tail = before.slice(other.end);
  FIRST_PERSON.lastIndex = 0;
  if (FIRST_PERSON.test(tail)) return null;
  if (selfName && (selfName.lastIndex = 0, selfName.test(tail))) return null;
  return other.text;
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
  while ((m = SELF_PRONOUN.exec(prefix))) {
    // R11(a): a third-person pronoun refers to the nearest named person before it.
    const other = pronounAntecedent(prefix.slice(0, m.index), selfName);
    if (other) hits.push({ kind: "opponent", end: m.index + m[0].length, text: other });
    else push("self", m);
  }
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

// ── WHO IS QUOTED (phase8-v2) ───────────────────────────────────────────────
// Press releases and co-sponsor statements quote other members, co-leads and
// outside groups. A sentence inside quotation marks attributed to someone
// other than the page's own politician ("…,” said Rep. Jane Doe.) is not a
// statement BY the candidate, so it never sets an R8 stated position. The
// speaker is read from a trailing ("…,” said X / “…,” X said) or leading
// (X said, “…) attribution; a quote that runs over several sentences takes the
// speaker named where it closes (or opens). Unknown speaker → no change.
const SAY_VERB = "(?:said|says|added|adds|stated|states|noted|notes|explained|continued|remarked|declared|urged|wrote)";
const HONORIFIC = "(?:(?:Rep|Reps|Sen|Sens|Gov|Lt|Dr|Mr|Mrs|Ms|Rev|Hon|Del|Amb|Sec|Gen)\\.\\s+)";
const TRAIL_SAY_X = new RegExp(`[”"]\\s*,?\\s*${SAY_VERB}\\s+(${HONORIFIC}?[^,.;:”"]{1,80}?)\\s*(?:[,.;:]|$)`);
const TRAIL_X_SAY = new RegExp(`[”"]\\s*,?\\s*(${HONORIFIC}?[A-Za-z][^,.;:”"]{0,60}?)\\s+${SAY_VERB}\\b`);
const LEAD_X_SAY = new RegExp(`^\\s*(${HONORIFIC}?[A-Za-z][^,.;:”"]{0,60}?)\\s+${SAY_VERB}\\s*[,:]?\\s*[“"]`);

/** "self" | "other" | null for a speaker phrase ("Rep. Jane Doe", "she", "Crockett"). */
function speakerKind(phrase, politicianId) {
  const p = String(phrase || "").trim();
  if (!p) return null;
  if (/^(?:I|we|he|she)$/i.test(p)) return "self";
  const self = selfNamePattern(politicianId);
  if (self && (self.lastIndex = 0, self.test(p))) return "self";
  // A named person or group (a capitalised word, after any honorific).
  if (/[A-Z]/.test(p.replace(new RegExp(`^${HONORIFIC}`), ""))) return "other";
  return null;
}

/** The speaker one sentence names for its own quote → "self" | "other" | null. */
export function quotedSpeakerOf(sentence, politicianId = null) {
  const s = String(sentence || "");
  const m = TRAIL_SAY_X.exec(s) || TRAIL_X_SAY.exec(s) || LEAD_X_SAY.exec(s);
  return m ? speakerKind(m[1], politicianId) : null;
}

const QUOTE_SPAN_MAX = 6;
/**
 * Per sentence of `list`: "self" | "other" | null — who is quoted in it. A
 * sentence that opens a quote without closing it starts a span; the span takes
 * the speaker named where it opens or closes. Spans longer than
 * QUOTE_SPAN_MAX sentences, or never closed, are left unattributed.
 */
export function quoteSpeakers(list, politicianId = null) {
  const out = new Array(list.length).fill(null);
  let start = -1, spanKind = null;
  const marks = (s) => ({ o: (s.match(/“/g) || []).length, c: (s.match(/”/g) || []).length, st: (s.match(/"/g) || []).length });
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    const { o, c, st } = marks(s);
    const own = (o || c || st) ? quotedSpeakerOf(s, politicianId) : null;
    if (start !== -1) {
      const closes = c > o || st % 2 === 1;
      if (closes) {
        const k = own || spanKind;
        for (let j = start; j <= i; j++) out[j] = k;
        start = -1; spanKind = null;
      } else if (i - start + 1 >= QUOTE_SPAN_MAX) {
        start = -1; spanKind = null;
      }
      continue;
    }
    if (o > c || (st % 2 === 1 && !c)) { start = i; spanKind = own; continue; }
    out[i] = own;
  }
  return out;
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
  return extractSentenceBlocks(body).map((x) => x.text);
}

/**
 * HTML → de-duplicated sentences with the paragraph (block) each sits in:
 * [{ text, block }]. `block` counts non-empty blocks (p, li, h1–h6, div …) in
 * page order; extractSentences is this list's text.
 */
export function extractSentenceBlocks(body) {
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
  let b = -1;
  for (const block of text.split(/\n+/)) {
    if (!block.trim()) continue;
    b++;
    for (const raw of mergeAbbreviations(block.split(/(?<=[.!?…])\s+/))) {
      const s = raw.replace(/\s+/g, " ").trim();
      if (s.length < 12 || seen.has(s)) continue;
      seen.add(s);
      out.push({ text: s, block: b });
    }
  }
  return out;
}

// A title ("Rep.", "Sen.") or a bill number ("H.R. 1234", "S. 56") is not a
// sentence end: the fragment is joined back to the text that follows (phase8-v2).
const TITLE_END = /(?:^|[^\w.])(?:Rep|Reps|Sen|Sens|Gov|Lt|Dr|Mr|Mrs|Ms|Rev|Hon|Del|Amb|Sec|Gen)\.$/;
const BILL_END = /(?:^|[^\w.])(?:H\.\s?R|H\.\s?(?:J\.\s?|Con\.\s?)?Res|S\.\s?(?:J\.\s?|Con\.\s?)?Res|S|No)\.$/;
// Abbreviations are not sentence ends either:
//   · an initialism ("U.S.", "U.K.", "U.N.", "D.C.") is joined to what follows
//     unless the next fragment opens like a new sentence ("…made in the U.S. We
//     need…"): "U.S. weaponry", "U.S. Armed Forces", "U.S. 1st Fleet" join;
//   · a short abbreviation ("vs.", "e.g.", "i.e.", "etc.", "approx.", "Jan.")
//     is joined only when the next fragment starts in lower case or a digit.
const INITIALISM_END = /(?:^|[^\w.])(?:[A-Z]\.){2,}["”’)]?$/;
const SHORT_ABBR_END = /(?:^|[^\w.])(?:vs|etc|e\.g|i\.e|approx|incl|est|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.$/i;
const SENTENCE_START = /^["“'‘(]?(?:The|A|An|We|I|It|It['’]s|This|That|These|Those|He|She|They|Our|My|But|And|So|In|On|At|If|When|While|Now|Today|There|Here|As|For|Yet|Still|Then|Its|Their|His|Her|You|Your|What|Why|How|Who|Every|No|Not|One|After|Before|Since|With|Without|Under|Last|Let|Let['’]s|That['’]s|Thank|Instead|Meanwhile|However|Also|Is|Are|Was|Were|Do|Does|Did|Can|Will|Should|Would|Could)\b/;
const joinsAbbreviation = (prev, next) =>
  (INITIALISM_END.test(prev) && (/^[a-z\d]/.test(next) || !SENTENCE_START.test(next))) ||
  (SHORT_ABBR_END.test(prev) && /^[a-z\d]/.test(next));
function mergeAbbreviations(parts) {
  const out = [];
  for (const p of parts) {
    const prev = out[out.length - 1];
    if (prev !== undefined && (TITLE_END.test(prev) || (BILL_END.test(prev) && /^\d/.test(p)) || joinsAbbreviation(prev, p))) out[out.length - 1] = `${prev} ${p}`;
    else out.push(p);
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
    const prefix = sentence.slice(0, m.index);
    const actor = (po && participleSubject(prefix, m[0], politicianId)) || implicationActor(prefix, r, politicianId);
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

// R11(b): on the oppose side, "<subject> gutting / repealing …" names who acts.
// A decision noun or a capitalised non-speaker word directly before an -ing
// verb is the actor ("the Supreme Court Ruling Gutting the Voting Rights Act",
// "Callais gutting Section 2"). The candidate's own instruments (Act, Bill …)
// are not someone else acting.
const PARTICIPLE_SUBJECT = /(?:\b(ruling|decision|opinion|order|court|justices|majority)|\b([A-Z][\w'’-]+))\s+$/i;
const OWN_INSTRUMENT = /^(?:Act|Bill|Law|Legislation|Resolution|Amendment|Plan|Program|Agenda|Initiative|Policy|Proposal|Package)$/;
function participleSubject(prefix, match, politicianId) {
  if (!/^\w+ing\b/i.test(match)) return null;
  const m = PARTICIPLE_SUBJECT.exec(prefix);
  if (!m) return null;
  if (m[1]) return { kind: "third", via: m[1] };
  const word = m[2];
  if (!/^[A-Z]/.test(word) || NOT_A_NAME.has(word) || OWN_INSTRUMENT.test(word)) return null;
  const self = selfNamePattern(politicianId);
  if (self && (self.lastIndex = 0, self.test(word))) return null;
  return { kind: "opponent", via: word };
}

/** R10: the first campaign-claim pattern for `topic` that matches → { m, side } or null. */
function claimMatch(sentence, topic) {
  for (const c of CLAIM_RULES[topic] || []) {
    if (c.context && !c.context.test(sentence)) continue;
    const m = c.re.exec(sentence);
    if (m) return { m, side: c.side };
  }
  return null;
}

/**
 * Classify one sentence → { kind: 'clear'|'implication'|'mention'|null, side, reversal, actor, via? }.
 * `politicianId` is the page's own politician (raw.politician_id). `claims`
 * (phase8-v3, R10) turns on the campaign-claim patterns — set for campaign
 * pages, official issue pages and the candidate's own speeches.
 */
export function classify(sentence, topic, politicianId = null, { claims = false, inSpan = false } = {}) {
  const r = TOPIC_RULES[topic];
  if (!r) throw new Error(`no scoring rules for topic ${topic}`);
  const reversal = REVERSAL.test(sentence);
  // Subject spans: a sentence inside a span on this topic's subject is ABOUT
  // the subject even when it does not name it again (see subjectSpans).
  const inContext = !r.context || inSpan || r.context.test(sentence);
  let sm = inContext ? r.support.exec(sentence) : null;
  let om = inContext ? r.oppose.exec(sentence) : null;
  let via;
  if (!sm && !om && claims) {
    const cm = claimMatch(sentence, topic);
    if (cm) { if (cm.side === "support") sm = cm.m; else om = cm.m; via = "claim"; }
  }
  if ((sm || om) && !(sm && om)) {
    const m = sm || om;
    const prefix = sentence.slice(0, m.index);
    const actor = (om && participleSubject(prefix, m[0], politicianId)) || actorFor(prefix, politicianId);
    if (actor.kind === "self" || reversal) {
      return { kind: "clear", side: sm ? "support" : "oppose", reversal, actor, ...(via ? { via } : {}) };
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

// ── SUBJECT SPANS ───────────────────────────────────────────────────────────
// A subject span is a stretch of a page about one subject (Ukraine, Iran,
// Israel). Each directional key reads one subject: its `context` check. Keys
// that share a context (the three Israel keys) share a subject.
//
//   · A sentence that NAMES exactly one subject starts or continues a span on it.
//   · CARRY (paragraph-aware): a sentence that names no subject carries the
//     open subject across sentences and paragraphs — however many sentences a
//     paragraph holds — until a clear subject change, or until more than
//     SPAN_GAP_PARAGRAPHS whole paragraph(s) pass with no sentence that names
//     the subject or carries a claim word of the debate (CLAIM_WORD).
//   · BACKWARD: when a span opens, the sentence just before it joins the span
//     if it is clearly part of the same claim — it sits in the same or the
//     previous paragraph, is not itself a subject change, and either shares a
//     claim word with the opening sentence (war, force, troops, aid, arms …)
//     or is an unfinished fragment (ends in a comma, colon or dash).
//   · TWO SUBJECTS in one sentence: the sentence counts for each subject it
//     names, and the open subject stays open for the follow-up sentences —
//     unless the sentence itself switches (an explicit transition naming the
//     other subject). With no open subject, nothing carries.
//   · A clear subject change ends the span: a sentence naming only a subject
//     without a key (Yemen, Venezuela, China …), an explicit transition, a page
//     heading, or a sentence about a clearly different register issue
//     (ISSUE_BREAK_RES — narrow terms only, and never a sentence that still
//     carries a claim word of the debate).
//   · Spans are NOT required to be contiguous: when the page comes back to a
//     subject later, the new span continues the same subject. A key reads every
//     sentence of every span on its subject, and weighs them as one position
//     with the usual support / oppose / mixed logic (one candidate per key).
//   · FACETS (Israel): inside the shared Israel subject each sentence is tagged
//     offensive, defensive, both or none (own cue, else the facet carried in the
//     span). israel_offensive_arms skips defensive-only sentences and
//     israel_defensive_systems skips offensive-only ones; israel_military_aid
//     reads them all.
//
// The directional key rules are unchanged, and the register sweep
// (SCORED_TOPICS, which has no directional keys) does not read spans.
export const SPAN_GAP_PARAGRAPHS = 1;
const SUBJECT_OF = {}; // topic → subject id
const SUBJECT_RES = {}; // subject id → RegExp (what names the subject)
for (const k of DIRECTIONAL_TOPICS) {
  const ctx = DIRECTIONAL_TOPIC_VOCAB[k].context;
  if (!ctx) continue;
  const id = Object.keys(SUBJECT_RES).find((sid) => DIRECTIONAL_TOPIC_VOCAB[sid].context === ctx) || k;
  SUBJECT_OF[k] = id;
  SUBJECT_RES[id] ||= TOPIC_RULES[k].context;
}
// Subjects with no directional key: naming only one of them is a clear subject change.
const OTHER_SUBJECT_RES = {
  ...Object.fromEntries(["yemen_policy", "venezuela_policy"].map((k) => [k, new RegExp(String.raw`\b(?:${ISSUE_TOPIC_VOCAB[k].terms})\b`, "i")])),
  other_country: /\b(?:china|chinese|beijing|taiwan\w*|north korea\w*|pyongyang|syria\w*|cuba\w*|mexic\w*)\b/i,
};
// Claim words of the aid / war / arms debate. A sentence carrying one is still
// part of the debate: it never breaks a span on issue terms, and it lets the
// sentence before a span's opening join the span (BACKWARD).
const CLAIM_WORD = /\b(?:wars?|warfare|hostilities|force|forces|troops|military|strikes?|attack\w*|invasion|invad\w+|aid|assistance|arms|weapons?|weaponry|munitions|bombs?|sales?|defen[cs]e\w*|defend\w*|constitution\w*|congress\w*|authoriz\w+|declare|commander[- ]in[- ]chief|sovereign\w*|ceasefire|missiles?)\b/i;
// A sentence about a different register issue is a clear subject change too —
// except the issues an aid / war / arms debate naturally runs through, which a
// span carries across: foreign policy, defense, veterans, war powers and
// Congress's checks, spending and debt, and the border. The two core topics'
// mention lists are too broad ("pay", "tax") to mark a change and are left out.
const SPAN_FAMILY = new Set(["strong_defense", "foreign_balance", "restraint", "america_first", "america_first_fp", "israel_support",
  "iran_policy", "ukraine_policy", "yemen_policy", "venezuela_policy", "veterans", "checks_balances", "war_powers", "power_of_purse",
  "congress_oversight", "judicial_check", "guard_authority", "states_federal_power", "cut_spending", "national_debt", "gov_waste",
  "audit_spending", "gov_balance", "border_security", "immig_fentanyl", "deportations"]);
// Mention terms too broad to mark a subject change on their own: they turn up
// in foreign-policy speech ("nuclear", "oil", "officers", "corruption",
// "shelters", "infrastructure", "critical minerals", "fair share", "coverage").
// Dropped from the break list term by term; the issue's narrow terms stay.
export const BROAD_BREAK_TERMS = new Set([
  "conservation", "stewardship", "local control", "state control", "mining", "drilling", "resource development", "critical minerals",
  "energy development", "takings", "condemnation", "public services", "fair share", "safety net", "regulations?", "regulatory",
  "bureaucra\\w+", "gold", "silver", "border security", "legal status", "every school", "all students", "college", "parents",
  "competition", "investment", "hiring", "deregulation", "job creators", "main street", "american (?:jobs|manufacturing|workers)",
  "china", "chinese", "CCP", "tariffs?", "unfair trade", "reshor\\w+", "onshor\\w+", "manufacturing", "reciprocal", "trade war",
  "trade authority", "worker protections", "overtime", "business growth", "good-paying jobs", "wages?", "workers", "unions?", "labor",
  "coverage", "mandates?", "suicide", "addiction", "farm(?:ers|s|ing)?", "ranch(?:ers|es)?", "rural", "agricultur\\w+", "producers",
  "public financing", "infrastructure", "roads", "bridges", "power grid", "water systems", "transit", "rail", "buses",
  "commut\\w+", "rivers?", "drought", "droughts?", "floods?", "flooding", "hurricanes?", "disaster(?: relief| recovery)?",
  "clean air", "clean water", "responsible development", "all-of-the-above", "climate(?: change| crisis)?", "emissions", "carbon",
  "energy independen\\w+", "reliable (?:power|energy|grid)", "nuclear", "oil", "natural gas", 
  "pipelines?", "LNG", "energy production", "fossil fuels?", "permitting", "permits?", "housing", "rent", "shelters?", "density",
  "apartments", "homestead", "police", "law enforcement", "officers", "defund", "crime", "criminals", 
  "sentences?", "prosecut\\w+", "exceptions", "conscience", "faith", "churches", "people of faith", "equal treatment",
  "nondiscrimination", "fairness for all", "gay", "merit", "woke", "innovation", "artificial intelligence", "\\bAI\\b",
  "social media", "privacy", "surveillance", "audits", "accessible", "transparency", "corruption", "ethics", "disclosure",
  "accountability in government", "big money", "justices", "efficiency", "career politicians", "deep state",
]);
// Split a terms source on its top-level "|" (alternations inside groups stay whole).
const topAlternatives = (src) => {
  const out = []; let depth = 0, cur = "";
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === "\\") { cur += ch + (src[++i] ?? ""); continue; }
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "|" && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
};
const ISSUE_BREAK_RES = Object.entries(ISSUE_TOPIC_VOCAB).filter(([k]) => !SPAN_FAMILY.has(k)).map(([, v]) => {
  const keep = topAlternatives(v.terms).filter((t) => !BROAD_BREAK_TERMS.has(t));
  return keep.length ? new RegExp(String.raw`\b(?:${keep.join("|")})\b`, "i") : null;
}).filter(Boolean);
/** Break-list terms by issue (for review): the narrow terms that end a span. */
export const issueBreakTerms = () => Object.fromEntries(Object.entries(ISSUE_TOPIC_VOCAB).filter(([k]) => !SPAN_FAMILY.has(k))
  .map(([k, v]) => [k, topAlternatives(v.terms).filter((t) => !BROAD_BREAK_TERMS.has(t))]));
// Explicit transition: the speaker announces a new subject.
const TRANSITION = /\b(?:(?:let me|let['’]s|I(?:['’]d| would| want to)?) (?:now )?(?:turn|move|pivot|switch|shift) (?:now )?to|turning (?:now )?to|moving on|on (?:a|another) (?:different |separate )?(?:subject|topic|note|issue)|switching gears|changing (?:the )?subject|another (?:issue|subject|topic) (?:I|we)|next,? I want to talk about)\b/i;
const isIssueChange = (s) => !CLAIM_WORD.test(s) && ISSUE_BREAK_RES.some((re) => re.test(s));
const isFragment = (s) => /[,:;—–-]["”’]?$/.test(s);

/** The subject a topic reads (directional keys only), or null. */
export const subjectOf = (topic) => SUBJECT_OF[topic] || null;

// Israel facets: which part of military support a sentence is about.
const OFFENSIVE_CUE = /\b(?:offensive|bombs?|munitions|JDAMs?|tank (?:rounds|shells)|precision-guided|2,000-pound|500-pound|artillery|F-?(?:15|16|35)s?)\b/i;
const DEFENSIVE_CUE = /\b(?:iron dome|david['’]?s sling|arrow (?:\d )?(?:missile|system|defen\w+)|missile defen[cs]e|air defen[cs]e|rocket defen[cs]e|defensive|interceptors?|defend (?:itself|themselves|against)|incoming (?:attacks?|missiles?|rockets?))\b/i;
const FACET_OF = { israel_offensive_arms: "offensive", israel_defensive_systems: "defensive" };
const FACET_SUBJECTS = new Set(Object.keys(FACET_OF).map((k) => SUBJECT_OF[k]));
const ownFacet = (s) => {
  const o = OFFENSIVE_CUE.test(s), d = DEFENSIVE_CUE.test(s);
  return o && d ? "both" : o ? "offensive" : d ? "defensive" : null;
};
/** Does a sentence's facet keep it off this topic? (Israel split keys only.) */
export const facetExcludes = (topic, facet) => !!FACET_OF[topic] && !!facet && facet !== "both" && facet !== FACET_OF[topic];

/** Sentences that are page headings (a heading always ends a span). */
function headingSentences(body) {
  const out = new Set();
  for (const m of String(body || "").matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)) {
    for (const h of extractSentences(`<p>${m[1]}</p>`)) out.add(h);
  }
  return out;
}

/**
 * Subject spans over a page's sentences → one entry per sentence:
 * { subject, span, named, backward?, subjects?, facet?, change? } — `subject`
 * is the subject id or null, `span` a span number (1, 2, … in page order; null
 * outside any span), `named` whether the sentence names the subject itself
 * (false = carried), `backward` when it joined the span from just before the
 * opening sentence, `subjects` when it names two or more, `facet` (Israel
 * only) and `change` when the sentence is a clear subject change.
 */
export function subjectSpans(sentences, body = "") {
  const heads = headingSentences(body);
  const blockOf = new Map();
  for (const x of extractSentenceBlocks(body)) if (!blockOf.has(x.text)) blockOf.set(x.text, x.block);
  const out = [];
  const blocks = [];
  let cur = null, span = 0, lastBlock = -Infinity, prevBlock = 0;
  const open = (id, i) => {
    const opened = id !== cur;
    if (opened) { cur = id; span++; }
    return opened;
  };
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    const b = blockOf.has(s) ? blockOf.get(s) : prevBlock;
    prevBlock = b;
    blocks.push(b);
    const named = Object.keys(SUBJECT_RES).filter((id) => SUBJECT_RES[id].test(s));
    const otherNamed = Object.values(OTHER_SUBJECT_RES).some((re) => re.test(s));
    const transition = TRANSITION.test(s);
    let opened = false;
    if (heads.has(s)) {
      // A heading always ends the open span; one naming a single subject opens a new one.
      cur = null;
      if (named.length === 1 && !otherNamed) { opened = open(named[0], i); lastBlock = b; out.push({ subject: cur, span, named: true }); }
      else { out.push({ subject: null, span: null, named: false, change: true }); continue; }
    } else if (named.length + (otherNamed ? 1 : 0) > 1) {
      // Two subjects in one sentence. The open subject stays open unless the
      // sentence itself switches (a transition naming another subject).
      const subjects = otherNamed ? [...named, "other"] : named;
      let to = null;
      if (transition) {
        const at = TRANSITION.exec(s).index;
        to = named.map((id) => [id, s.slice(at).search(SUBJECT_RES[id])]).filter(([, j]) => j >= 0).sort((x, y) => x[1] - y[1])[0]?.[0]
          || (otherNamed ? "other" : null);
      }
      if (cur && named.includes(cur) && (!to || to === cur)) { lastBlock = b; out.push({ subject: cur, span, named: true, subjects }); continue; }
      if (to && to !== "other") { opened = open(to, i); lastBlock = b; out.push({ subject: cur, span, named: true, subjects }); }
      else { cur = null; out.push({ subject: null, span: null, named: false, subjects, change: true }); continue; }
    } else if (named.length === 1) {
      opened = open(named[0], i);
      lastBlock = b;
      out.push({ subject: cur, span, named: true });
    } else if (otherNamed || transition || isIssueChange(s)) {
      cur = null;
      out.push({ subject: null, span: null, named: false, change: true });
      continue;
    } else if (cur && b - lastBlock <= SPAN_GAP_PARAGRAPHS + 1) {
      // A carried sentence with a claim word shows the debate is still going.
      if (CLAIM_WORD.test(s)) lastBlock = b;
      out.push({ subject: cur, span, named: false });
      continue;
    } else {
      cur = null;
      out.push({ subject: null, span: null, named: false });
      continue;
    }
    // BACKWARD: the sentence just before a span opens joins it when it is clearly part of the same claim.
    if (opened && i > 0) {
      const p = out[i - 1], ps = sentences[i - 1];
      if (p.subject === null && !p.change && !p.subjects && !heads.has(ps) && b - blocks[i - 1] <= 1 &&
          (isFragment(ps) || (CLAIM_WORD.test(ps) && CLAIM_WORD.test(s)))) {
        out[i - 1] = { subject: cur, span, named: false, backward: true };
      }
    }
  }
  // Facets for subjects with split keys: own cue, else the facet carried in the span.
  let facet = null, lastSpan = null;
  for (let i = 0; i < out.length; i++) {
    const e = out[i];
    if (!e.subject || !FACET_SUBJECTS.has(e.subject)) { if (!e.subject) { facet = null; lastSpan = null; } continue; }
    if (e.span !== lastSpan) { facet = null; lastSpan = e.span; }
    const own = ownFacet(sentences[i]);
    if (own) facet = own === "both" ? null : own;
    const f = own || facet;
    if (f) e.facet = f;
  }
  return out;
}

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
  const speakers = quoteSpeakers(list, raw.politician_id); // who is quoted (R8)
  const claims = isClaimPage(raw.source_type, raw.final_url || raw.url); // R10
  // Subject spans (directional keys only): every span on the topic's subject,
  // wherever it sits on the page, is read for this one candidate.
  const subject = subjectOf(topic);
  const spans = subject ? subjectSpans(list, raw.body) : null;
  for (let i = 0; i < list.length; i++) {
    const text = list[i];
    const sp = spans && spans[i].subject === subject ? spans[i] : null;
    // Israel split keys: a sentence another facet claims is not read here.
    if (sp && facetExcludes(topic, sp.facet)) continue;
    const c = classify(text, topic, raw.politician_id, { claims, inSpan: !!sp });
    if (!c.kind) continue;
    at.set(i, statements.length);
    statements.push({
      _i: i,
      text: trunc(text),
      kind: c.kind,
      side: c.side,
      reversal: c.reversal,
      ...(speakers[i] === "other" ? { quoted_speaker: "other" } : {}),
      ...(c.kind === "implication" ? { implication: c.via } : {}),
      ...(c.kind === "clear" && c.via === "claim" ? { claim_pattern: true } : {}),
      ...(c.actor && c.actor.kind !== "self" ? { attributed_to: c.actor.kind, attributed_via: c.actor.via } : {}),
      ...(sp ? { subject_span: sp.span, ...(sp.named ? {} : { span_carried: true }), ...(sp.backward ? { span_backward: true } : {}), ...(sp.facet ? { facet: sp.facet } : {}) } : {}),
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

  // R8 eligibility: a first-party source, at least one explicit statement for
  // the side made by the candidate (not a quote from someone else), and — for
  // a release that is not labelled official — a named bill or concrete outcome.
  const rule = statedSourceRule(raw.source_type, raw.final_url || raw.url);
  const statedOk = (side) => {
    if (!rule || (side !== "support" && side !== "oppose")) return false;
    const own = clear.filter((s) => s.side === side && s.quoted_speaker !== "other");
    if (!own.length) return false;
    return !rule.needsSpecific || statements.some((s) => s.quoted_speaker !== "other" && namesBillOrOutcome(s.text));
  };

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
    // R8: an explicit, uncontested claim by the candidate on a primary source
    // is a normal stated position. Only the stated layer moves; formal record
    // is untouched.
    if (position !== "mixed" && !outliers && statedOk(position) && confidence < WEIGHTS.statedPositionConfidence) {
      confidence = WEIGHTS.statedPositionConfidence;
      const label = KIND_LABELS[rule.kind];
      parts.push(`explicit claim on a primary source${label ? ` (${label})` : ""} reads as a stated position (R8)`);
    }
    if (mentions) parts.push(`${mentions} mention(s) recorded at zero weight (R3)`);
    reason = parts.join("; ");
  }
  const stated = statedOk(position);

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
    ...(stated ? { stated_position: true, primary_kind: rule.kind } : {}),
    ...(subject ? { subject: subjectSummary(subject, spans, statements) } : {}),
    layer: "stated",
    formal_record: false,
    rules_version: RULES_VERSION,
    ...(CORE_TOPICS.includes(topic) ? {} : { vocab_version: DIRECTIONAL_TOPICS.includes(topic) ? DIRECTIONAL_VOCAB_VERSION : VOCAB_VERSION }),
    ...(topic !== raw.topic ? { page_topic: raw.topic } : {}),
    raw_fetched_at: raw.fetched_at,
  };
}

/** Candidate-level subject note: how many spans the subject has, and which carried a signal. */
function subjectSummary(subject, spans, statements) {
  const all = [...new Set(spans.filter((x) => x.subject === subject).map((x) => x.span))];
  const signal = [...new Set(statements.filter((x) => x.subject_span && (x.kind === "clear" || x.kind === "implication")).map((x) => x.subject_span))];
  return { id: subject, spans: all.length, spans_with_signal: signal.length, joined: all.length > 1 };
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
const hasClaimPattern = (c) => (c?.sources?.[0]?.statements || []).some((s) => s.claim_pattern);
const explicitCount = (c) => (c?.sources?.[0]?.statements || []).filter((s) => s.kind === "clear").length;

/** Every key above a directional key (its parents and `also` keys, recursively). */
function ancestors(k, seen = new Set()) {
  const d = DIRECTIONAL_ISSUE_KEYS[k];
  for (const up of d ? [d.parent, ...(d.also || [])].filter(Boolean) : []) if (!seen.has(up)) { seen.add(up); ancestors(up, seen); }
  return seen;
}
/** Is one key a directional child of the other? (R9 linked keys.) Register-only pairs are never linked. */
export const linkedKeys = (a, b) => a !== b && (ancestors(a).has(b) || ancestors(b).has(a));

/**
 * R9: drop cross-topic candidates that only restate claims a kept candidate
 * from the same page already carries. `kept` (the page's own topic) always
 * stays; the rest are considered most-explicit first, then by confidence, then
 * in SCORED_TOPICS order. Returns the survivors in their original order.
 */
export function collapseRestatements(kept, extra) {
  const held = kept.map((c) => ({ topic: c.topic, set: claimSet(c) }));
  const order = extra.map((c, i) => ({ c, i }))
    .sort((a, b) => explicitCount(b.c) - explicitCount(a.c) || b.c.confidence - a.c.confidence || a.i - b.i);
  const keep = new Set();
  for (const { c, i } of order) {
    const mine = claimSet(c);
    // An R10 campaign-claim statement is specific to its key, so a candidate
    // carrying one is never a restatement of another key's read.
    // A directional key and its parent (iran_hostilities and war_powers, an
    // Israel key and israel_support) read the same line at two levels, so
    // neither is a restatement of the other: the line counts on both.
    const dup = mine.size > 0 && !hasClaimPattern(c) && held.some((h) => !linkedKeys(c.topic, h.topic) && [...mine].every((x) => h.set.has(x)));
    if (dup) continue;
    held.push({ topic: c.topic, set: mine });
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
