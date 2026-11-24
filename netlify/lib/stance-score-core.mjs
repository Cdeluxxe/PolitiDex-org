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
//   R13 Cross-topic anchor (scoreAllTopics): a page filed under one topic only
//       yields a candidate on ANOTHER topic when the read rests on at least one
//       explicit (clear) statement by the page's own politician, on the
//       candidate's side, whose full sentence names the other topic directly
//       or sits in a subject span on it (crossTopicAnchored). A key whose
//       vocabulary bundles a neighbouring issue is anchored only by its own
//       name (CROSS_TOPIC_ANCHORS): social_security needs "Social Security",
//       not "Medicare" — Medicare on a health or economy page is health care —
//       and "Social Security numbers" is not the program.
//       Implication-only cross-topic reads are dropped. The page's own topic
//       and directional parent/child keys (linkedKeys) read exactly as before.
//   R14 Title and lead stance signals: when nothing else on the page reads a
//       side, a stance verb in the title or the first two sentences (votes
//       for / against, calls to block, demands no, block / stop / end /
//       prevent the, will not agree, must not fund, introduces / cosponsors a
//       bill) by the page's own politician, with the page's topic (or a named
//       bill) in the lead, is one explicit statement for the side the verb
//       gives. Own topic and linked directional keys only; never changes a page
//       that already reads support, oppose or mixed. See leadStance.
//   R15 Implied stance from aligned mentions (phase8-v4): when nothing else on
//       the page reads a side (no explicit statement, no implication, no
//       reversal, no R14 lead signal) and at least WEIGHTS.impliedMentionsMin
//       (3) of the page's own zero-weight topic mentions lean the SAME way, with
//       no mention leaning the other way or carrying both directions, the page
//       reads that side as an IMPLIED stance at WEIGHTS.impliedMentionConfidence
//       (0.5). A mention leans (mentionLean) when, in the page's own voice (not
//       attributed to an opponent or third party, not a quote by someone
//       else, not a question, not negated), it carries the topic's own
//       directional vocabulary without passing the explicit gates — the
//       vocabulary outside the subject context check, or in the passive ("Social
//       Security must be protected") — or frames the problem the topic's
//       outcome rule gives a side to (support: the speaker wants it fixed). The
//       mentions keep zero weight; 1–2 aligned mentions produce no position.
//       Implied reads are never an R8 stated position and never a cross-topic
//       candidate (R13 still needs an explicit anchor).
//   R16 Own words on video: a transcript of the politician's own YouTube video
//       (the video transcriber's record — type "video", a youtube-transcript
//       body made of the politician's spoken segments only) that takes a clear
//       side in their own explicit words, with nothing on the other side (or an
//       explicit reversal), reads at WEIGHTS.videoTranscriptConfidence (1.0),
//       the scorer's maximum. A title cue (R14) is not speech and does not
//       qualify; implication-only and implied reads do not move. Every other
//       source keeps its weight and the WEIGHTS.maxConfidence cap, including
//       campaign pages, press releases and Congressional Record floor speeches.
//   Splitter: an initialism ("U.S.", "U.N.", "A.I.") or a short abbreviation
//       ("Jan.", "vs.", "e.g.") does not end a sentence (mergeAbbreviations);
//       nor does the "v." of a case name ("Roe v. Wade", phase9-v1).
//   R17 Framing (phase9-v1) — what a match MEANS, read from the words around it
//       (see FRAMING below classify's helpers):
//         (a) attribution: only the politician's own voice scores. Reporting and
//             decision verbs name an actor ("Donald Trump claimed …", "the Court
//             overturned …"); a pronoun after a named person refers to that
//             person; "your policy / decision" is the addressee; "the policy
//             that bans …", "states that banned …", "policy banning …" are the
//             thing acting; possessive "our / my" is never an actor; on a news
//             article reposted on the politician's site, text outside quotation
//             marks is the reporter's paraphrase. All of these stay zero weight.
//         (b) polarity: a negated verb ("would not cut") is a mention; a
//             counter-frame ("opposing efforts to cut Social Security", "rescind
//             the policy that bans abortion", "blocking attempts to limit
//             access") FLIPS the side — opposing a cut is support for the
//             program; a reported figure ("$23B cut from …") is a mention.
//         (c) addressing: on a page longer than CROSS_TOPIC_SHORT_PAGE
//             sentences, a cross-topic candidate needs at least
//             CROSS_TOPIC_MIN_SENTENCES sentences naming the topic or as many
//             own directional statements on it (crossTopicAddressed), on top of
//             R13's explicit anchor. One passing line is not a finding.
//   R18 Reading (phase9-v2) — who said a sentence and what it actually commits
//       to, checked before any read can promote (see READING below):
//         (a) polarity: a cut / attack / privatization named as a NOUN ("the
//             Administration’s continual cuts to Social Security") is a
//             description, not a call to cut. A counter verb anywhere earlier in
//             the clause ("We write to denounce … cuts to Social Security",
//             "sounding the alarm about … the practice of using taxpayer dollars
//             to fund abortions") turns it into the politician defending the
//             program; a verb of support right before it ("I support cuts to …")
//             keeps it; anything else is a mention. "never stop fighting to
//             protect" is not a negation. A verb whose object only sits after
//             "about / regarding / over / following" ("delivered remarks …
//             about … abortion", "Fights over climate policy"), after a modal
//             that starts a new predicate ("banning the pipeline would increase
//             emissions"), after "rather than / like" ("keeping Americans safe …
//             rather than murder us like ICE"), "stop X from <verb>ing", a noun
//             use ("the use of federal funds for … military force") and an
//             object inside a bill's name are not the politician acting on it.
//         (b) headlines: a Title Case or ALL CAPS line, or a gerund-led line with
//             no sentence end ("Supporting Idaho Agriculture", "Maintaining
//             Peace through Strength"), is not a clear statement unless it is the
//             page's own main headline (title / h1). A headline that does read a
//             side is marked `headline` and shown as a headline, not "They said".
//         (c) other voices: a sentence inside someone else's quote is that
//             person's (zero weight, not only "not R8"); on a joint or committee
//             release whose dateline / headline names other members and not the
//             page's politician ("WASHINGTON – U.S. Senator Jeanne Shaheen …"),
//             the page voice, first person and he / she are theirs — only a
//             sentence that names the page's politician, or their own quote,
//             counts for them.
//         (d) long lists: a line from a list of LIST_MIN_ITEMS or more items (a
//             bulleted list of bills or achievements, a dated timeline) sets a
//             side only when the page's main claim (title / h1 / first sentence)
//             is about the topic, or LIST_AGREE_MIN items of the same list agree.
//         (e) third parties: an outside group's "What They Are Saying" section,
//             "according to …", "the Obama Administration determined …", and a
//             paraphrase of what the politician told an outlet ("Cassidy spoke to
//             the Washington Examiner on …") are not the politician's own words.
//       R14 lead cues read the purpose of a bill with the topic's own vocabulary
//       ("a bill to ban artificial superintelligence" is not support for light
//       AI rules; "a bill to end taxpayer-funded abortion" is pro-life support),
//       and a named-bill cue needs the page to address the topic at all.
//   R19 Polarity (phase9-v3) on deportations, birthright_citizenship, pro_life /
//       pro_choice and gun_safety / gun_rights — see POLARITY FRAMES in
//       stance-topic-vocab.mjs. A topic's polarity frame states the side from
//       what the verb is aimed at ("condemn the mass deportation agenda" is
//       oppose; "defeat the attempt to dismantle birthright citizenship" and
//       "voted to pass the Born-Alive Act" on pro_life are support; "requiring
//       gun owners to store firearms" is gun safety) and is never flipped by a
//       counter-frame. A topic veto keeps criticism of a policy, someone
//       else's view and neutral event descriptions (a shooter, a purchase) at
//       zero weight on the side they would wrongly read. "mass deportation" is
//       the policy's name, not a support signal; lower-case "ice" is not the
//       agency. Own-voice, quote, negation and question checks are unchanged.
//       Splitter: a middle initial in a name ("Mark R. Warner", "Mazie K.
//       Hirono") is not a sentence end.
//

// Calibration: the ground truth (0.85) rests on first-party campaign pages
// with several explicit commitments, so a medium-tier base of 0.70 plus the
// R4 corroboration bonus of 0.15 reproduces it. These numbers live in WEIGHTS
// so a later tweak is one edit, and the comparison log prints the exact delta.

import { buildTopicRules, buildDirectionalTopicRules, ISSUE_TOPIC_VOCAB, ISSUE_TOPIC_LABELS, DIRECTIONAL_TOPIC_VOCAB, DIRECTIONAL_ISSUE_KEYS } from "./stance-topic-vocab.mjs";
import { PERSON_SURNAMES, PLACE_SURNAMES, PLACE_SURNAME_FULL_NAMES } from "./stance-person-names.mjs";
// Roster names and host kinds (R18c). page-ownership imports this module too;
// both only call each other inside functions, so the cycle is safe.
import { pageOwnership, nameTokens } from "./page-ownership.mjs";

export const RULES_VERSION = "phase9-v3";
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
  videoTranscriptConfidence: 1.0, // R16: a clear stance in the politician's own video transcript
  mentionOnlyConfidence: 0.3, // "no clear position" when only mentions exist
  statedPositionConfidence: 0.8, // R8: floor for an explicit claim on a primary source
  impliedMentionsMin: 3,  // R15: this many aligned mentions (and no contradiction)…
  impliedMentionConfidence: 0.5, // …read as an implied stance at this confidence
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
// Who ACTS is a subject. A possessive or object pronoun ("our schools", "for
// us", "my opponent") is never the actor of a verb that follows it, so actorFor
// reads first person from subject forms only (phase9-v1): in "they are closing
// our schools … and cutting taxes for the rich" the actor is "they".
const FIRST_PERSON_SUBJECT = /\b(I|I'm|I’m|I've|I’ve|I'll|I’ll|I'd|I’d|we|we're|we’re|we've|we’ve|we'll|we’ll|let['’]s)\b/g;
// A letter to an official: "your policy", "your August 2025 decision to …",
// "your administration's rule" — the addressee acts, not the signer.
const SECOND_PERSON_ACTOR = /\byour\s+(?:[\w'’$,.-]+\s+){0,3}?(?:polic(?:y|ies)|decisions?|rules?|administration|plans?|orders?|proposals?|agency|department|actions?|bans?|guidance|memo(?:randum)?|directives?)\b/gi;
// A thing someone else made does the acting in a relative or participle clause:
// "the VA's new policy that bans …", "the Administration's 2025 policy banning …",
// "states that banned …", "the ruling, which eliminated …". The candidate's own
// instruments (bill / act / legislation / resolution / amendment) are not in
// the list, and "my / our <noun>" stays the candidate's own.
const OTHER_INSTRUMENT = /\b(?:(my|our)\s+(?:[\w'’-]+\s+){0,2})?(polic(?:y|ies)|rules?|regulations?|orders?|bans?|rulings?|decisions?|opinions?|courts?|justices|majority|administration|states|proposals?|schemes?|mission|agenda|memo(?:randum)?|directives?|guidance|practices?)(?:\s*,)?\s+(?:of\s+\w+ing|that|which|to|would|will|banning|ending|cutting|eliminating|gutting|slashing|restricting|limiting|stripping|blocking|denying|repealing|dismantling|privatizing|prohibiting|reinstating|rolling)\b/gi;
const OPPONENT_FRAMING = /\b(?:my|our|his|her|their)\s+(?:\w+\s+)?opponents?\b|\b(?:politicians?|people|folks) like\b|\bpromised to\b/gi;
// Third-party PRONOUNS are always the actor of their clause. Third-party GROUPS
// only count when they are the subject — followed by a verb — so "Big retailers
// are tracking…" is attributed to retailers, while "We must end these corporate
// subsidies and use the savings to cut property taxes" stays the speaker's own.
const THIRD_PARTY_PRONOUN = /\b(they|they're|they’re|they've|they’ve|they'll|they’ll)\b/gi;
const THIRD_PARTY_GROUP = /\b(corporations?|corporate (?:landlords|interests|executives|giants|America)|companies|retailers?|billionaires?|millionaires?|the (?:wealthy|rich)|lobbyists?|special interests|donors?|insurers?|insurance companies|landlords?|banks?|Wall Street|big (?:pharma|food|oil|tech|retailers?|banks?|insurance)|(?:drug|oil|tech|credit card) (?:companies|makers|giants)|monopolies|middlemen|PBMs?)(?=\s+(?:\w+ly\s+)?(?:are|is|was|were|have|has|had|will|would|can|could|keep|keeps|kept|use|uses|used|lobby|lobbies|lobbied|charge|charges|raise|raises|raised|jack|jacks|hike|hikes|hiked|set|sets|want|wants|get|gets|pay|pays|paid|make|makes|made|buy|buys|bought|refuse|refuses|try|tries|tried|continue|continues|rip|rips|profit|profits|gouge|gouges|squeeze|squeezes)\b)/gi;
const ACCORDING_TO = /\baccording to\b(?!\s+(?:me|my|our|us)\b)/gi;
// phase9-v1: reporting and decision verbs ("Donald Trump claimed …", "the
// Supreme Court overturned …", "Elon Musk dismantles …") name an actor too.
const ACTION_VERB = "(?:has|have|had|is|are|was|were|will|would|wants?|voted|votes|promised|promises|refused|refuses|refuse|tried|tries|blocked|blocks|keeps?|kept|used|uses|took|takes|plans?|planned|pushed|pushes|passed|signed|lowered|cut|raised|raises|raise|claim(?:s|ed)?|said|says|insist(?:s|ed)?|argu(?:es|ed)|announc(?:es|ed)|overturn(?:s|ed)|ruled|rules|eliminat(?:es|ed)|bann?(?:s|ed)|dismantl(?:es|ed)|slash(?:es|ed)|gutt?(?:s|ed)|threaten(?:s|ed)|propos(?:es|ed)|reinstat(?:es|ed)|order(?:s|ed)|decid(?:es|ed)|issu(?:es|ed)|moved?|moves|end(?:s|ed)|determin(?:es|ed)|found|finds|conclud(?:es|ed)|estimat(?:es|ed)|warn(?:s|ed)|report(?:s|ed)|releas(?:es|ed)|expand(?:s|ed)|finaliz(?:es|ed)|mandat(?:es|ed))";
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
  // "Donald Trump claimed he would not cut …" — a named person acting earlier in
  // the sentence (not the page's politician) is who the pronoun refers to
  // (phase9-v1). Only a multi-word name or a title + name counts.
  NAMED_ACTOR.lastIndex = 0;
  while ((m = NAMED_ACTOR.exec(before))) {
    const name = m[1];
    const words = name.split(/\s+/).filter((w) => /^[A-Z]/.test(w));
    if (words.length < 2 || NOT_A_NAME.has(words[0]) && words.length < 3) continue;
    if (selfName && (selfName.lastIndex = 0, selfName.test(name))) continue;
    const end = m.index + name.length;
    if (!other || end > other.end) other = { text: name, end };
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
  FIRST_PERSON_SUBJECT.lastIndex = 0;
  while ((m = FIRST_PERSON_SUBJECT.exec(prefix))) push("self", m);
  SECOND_PERSON_ACTOR.lastIndex = 0;
  while ((m = SECOND_PERSON_ACTOR.exec(prefix))) push("opponent", m);
  OTHER_INSTRUMENT.lastIndex = 0;
  while ((m = OTHER_INSTRUMENT.exec(prefix))) if (!m[1]) push("third", m, m.index + m[0].length);
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
  // R18(e): "According to a third-party study, …" — the source speaks, not the page.
  ACCORDING_TO.lastIndex = 0;
  while ((m = ACCORDING_TO.exec(prefix))) push("third", m);
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

/**
 * Does `text` name the politician of `politicianId` (phase9-v2)? Full name,
 * surname or first name (selfNamePattern), or a capitalised word of 4+ letters
 * the id ends with — ids such as "bmoore" or "aoc_ny" carry no separate surname.
 */
export function namesSelf(text, politicianId) {
  const t = String(text || "");
  const self = selfNamePattern(politicianId);
  if (self && (self.lastIndex = 0, self.test(t))) return true;
  const id = String(politicianId || "").toLowerCase().replace(/[^a-z_]/g, "");
  const tails = id.split("_").filter((x) => x.length >= 4);
  let roster = null;
  try { roster = nameTokens(politicianId); } catch { roster = null; }
  const surnames = new Set((roster?.known ? roster.surnames : []).filter((x) => x.length >= 3));
  for (const w of t.match(/\b[A-Z][\p{L}'’-]{2,}\b/gu) || []) {
    const lw = w.toLowerCase().replace(/[^a-z]/g, "");
    if (lw.length >= 4 && tails.some((x) => x.endsWith(lw) && x.length - lw.length <= 2)) return true;
    // The roster name: "Ocasio-Cortez" for "aoc", "Moore" for "bmoore".
    if (surnames.has(lw) || w.split(/[-’']/).some((p) => surnames.has(p.toLowerCase()) && p.length >= 4)) return true;
  }
  return false;
}

/** "self" | "other" | null for a speaker phrase ("Rep. Jane Doe", "she", "Crockett"). */
function speakerKind(phrase, politicianId) {
  const p = String(phrase || "").trim();
  if (!p) return null;
  if (/^(?:I|we|he|she)$/i.test(p)) return "self";
  if (namesSelf(p, politicianId)) return "self";
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
// A case name ("Roe v. Wade", "Dobbs v. Jackson Women's Health Organization",
// "Loper Bright v. Raimondo") is one name: a capitalised word, then "v.", then a
// capitalised word. Never a sentence end (phase9-v1).
const CASE_V_END = /(?:^|\s)[A-Z][\p{L}'’.-]*\s+v\.$/u;
// A middle initial in a name ("Mark R. Warner", "Mazie K. Hirono", "Edward J.
// Markey") is not a sentence end either: a capitalised name, one capital letter
// and a period, followed by a capitalised word that does not open a sentence
// (polarity-v1).
const MIDDLE_INITIAL_END = /(?:^|[\s(“"])[A-Z][\p{Ll}'’-]+\s+[A-Z]\.$/u;
const joinsAbbreviation = (prev, next) =>
  (MIDDLE_INITIAL_END.test(prev) && /^[A-Z][\p{L}'’-]+(?:[\s,(]|$)/u.test(next) && !SENTENCE_START.test(next)) ||
  (INITIALISM_END.test(prev) && (/^[a-z\d]/.test(next) || !SENTENCE_START.test(next))) ||
  (SHORT_ABBR_END.test(prev) && /^[a-z\d]/.test(next)) ||
  (CASE_V_END.test(prev) && /^[A-Z]/.test(next));
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
  const ps = guardedMatch(r.implySupport, sentence).m;
  const po = r.implyOppose ? guardedMatch(r.implyOppose, sentence).m : null;
  if ((ps || po) && !(ps && po)) {
    const m = ps || po;
    const prefix = sentence.slice(0, m.index);
    if (negatedMatch(prefix) || statisticMatch(prefix, m[0])) return { kind: "mention", side: null, reversal: false, actor: null };
    const cf = counterFrame(prefix, m[0]);
    let side = cf ? (ps ? "oppose" : "support") : (ps ? "support" : "oppose");
    if (po && !ps && burdenObject(m[0])) side = side === "support" ? "oppose" : "support";
    const actor = (!cf && participleSubject(prefix, m[0], politicianId)) || implicationActor(cf ? prefix.slice(0, cf.opStart) : prefix, r, politicianId);
    if (actor.kind === "self") return { kind: "implication", via: "remedy", side, reversal: false, actor, ...(cf ? { framing: "counter", counter_via: cf.via } : {}) };
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
const PARTICIPLE_SUBJECT = /(?:\b(ruling|decision|opinion|order|court|justices|majority|polic(?:y|ies)|rules?|regulations?|bans?|administration|directives?|memo(?:randum)?|guidance|proposals?|schemes?|mission)|\b([A-Z][\w'’-]+))\s+$/i;
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


// ── FRAMING (phase9-v1) ─────────────────────────────────────────────────────
// What a directional match MEANS depends on the words around it. Four checks run
// on the text before the match (the "prefix") and on the match itself:
//   · NEGATION — "Donald Trump claimed he would not cut Social Security", "doesn't
//     believe cuts to Medicare are on the table": a negated verb is not a call to
//     do it. The sentence stays a zero-weight mention (never flipped: "will not
//     cut" is a promise, but too easy to misread to score).
//   · COUNTER-FRAME — the politician acts AGAINST someone else's action:
//     "opposing efforts to cut Social Security", "rescind the VA's policy that
//     bans abortion counseling", "blocking attempts to limit access to abortion",
//     "reverse the Administration's cuts to Medicare", "slams Trump & Musk
//     mission to dismantle Social Security". The side flips: opposing a cut to a
//     program is SUPPORT for the program. Who acts is then read before the
//     counter verb.
//   · STATISTIC — "$23B Annually Cut from Social Security" reports a figure; a
//     verb followed by "from", or preceded by an amount, is not a call to act.
//   · REPORTED VOICE — on a news article reposted on the politician's site ("in
//     the news" pages), a sentence outside quotation marks is the reporter's
//     paraphrase, not the politician's own words: zero weight.
const NEG_STRIP = /(?:\b(?:not|never|no longer|cannot|nor)\b|\b\w+n['’]t\b)/gi;
const NEG_TAIL = /(?:\b(?:not|never|no longer|cannot|nor|refus(?:e|es|ed|ing) to|declin(?:e|es|ed|ing) to)\b|n['’]t\b)(?:\s+[\w'’-]+){0,3}\s*$/i;
const COUNTER_OP = String.raw`(?:oppos(?:e|es|ed|ing)|block(?:s|ed|ing)?|stop(?:s|ped|ping)?|fight(?:s|ing)? (?:back )?against|fought (?:back )?against|reject(?:s|ed|ing)?|rescind(?:s|ed|ing)?|overturn(?:s|ed|ing)?|revers(?:e|es|ed|ing)|undo(?:es|ing)?|undid|prevent(?:s|ed|ing)?|condemn(?:s|ed|ing)?|slam(?:s|med|ming)?|blast(?:s|ed|ing)?|denounc(?:e|es|ed|ing)|challeng(?:e|es|ed|ing)|resist(?:s|ed|ing)?|push(?:es|ed|ing)? back (?:on|against)|stand(?:s|ing)? against|stood against|vot(?:e|es|ed|ing) against|disturbed by|alarmed by|outraged by|withdraw(?:s|n|ing)?|repeal(?:s|ed|ing)?|end(?:s|ed|ing)?|protect\w{0,3} [\w'’ -]{1,40}? (?:from|against)|sound(?:s|ed|ing)? the alarm (?:on|about|over)|rais(?:e|es|ed|ing) (?:serious |grave )?(?:concerns?|alarm) (?:about|over|with)|warn(?:s|ed|ing)? against|speak(?:s|ing)? out against|spoke out against|criticiz(?:e|es|ed|ing)|decr(?:y|ies|ied|ying))`;
const BRIDGE = String.raw`(?:efforts?|attempts?|practices?|plans?|push(?:es)?|bids?|schemes?|mission|moves?|decisions?|proposals?|polic(?:y|ies)|rules?|regulations?|orders?|bans?|agenda|threats?|actions?|directives?|memo(?:randum)?|guidance|rulings?|legislation|bills?|measures?)`;
// Between the counter verb and the bridge noun: no clause break and no verb of
// support ("oppose X and support efforts to protect …" is not a counter-frame).
const FRAME_WORD = String.raw`(?!(?:and|but|or|while|so|then|instead|yet|because|support\w*|back\w*|protect\w*|defend\w*|champion\w*|expand\w*|welcom\w*|applaud\w*|prais\w*|endors\w*)\b)[\w'’$.,()&-]+`;
// After the bridge: at most three words, none ending a clause (no comma), so
// "stop efforts to privatize it, cut wait times" does not flip "cut wait times".
const TAIL_WORD = String.raw`(?!(?:and|but|or|while|so|then|instead|yet|because)\b)[\w'’$.()&-]+`;
const COUNTER_BRIDGE = new RegExp(String.raw`\b(${COUNTER_OP})\s+(?:${FRAME_WORD}\s+){0,9}?${BRIDGE}\b,?(?:\s+(?:that|which|to|would|will|could|of))*(?:\s+${TAIL_WORD}){0,3}?\s*$`, "i");
const COUNTER_DIRECT = new RegExp(String.raw`\b(${COUNTER_OP})\s+(?:${TAIL_WORD}\s+){0,4}?$`, "i");
// A match that opens on a noun or gerund ("cuts to …", "cutting …", "the ban on …")
// can be the direct object of a counter verb ("stop cuts to Medicare").
const NOMINAL_MATCH = /^(?:\w+ing|cuts?|bans?|restrictions?|limits?|repeal|elimination|privatization|attacks?|threats?)\b/i;
const STAT_TAIL = /(?:\$\s?\d[\d.,]*\s?(?:[KMBT]|thousand|million|billion|trillion)?|\b\d[\d.,]*\s?(?:%|percent|million|billion|trillion))\s+(?:(?:annually|yearly|a year|each year|per year|every year)\s+)?$/i;
const STAT_MATCH = /^[\w'’-]+\s+from\b/i;
// BURDEN: a cut / repeal verb whose own object is a burden ON the program —
// "eliminated the five-month waiting period for Social Security disability
// benefits", "repeal the Windfall Elimination Provision" — removes the burden:
// the side flips (support for the program).
const BURDEN = /\b(?:waiting periods?|backlogs?|delays?|penalt(?:y|ies)|barriers?|red tape|fees?|tax(?:es)? on|offsets?|earnings tests?|windfall elimination provision|government pension offset|caps? on|loopholes?|paperwork|bureaucra\w+)\b/i;
export const burdenObject = (match) => { const words = String(match).split(/\s+/); return words.length > 1 && BURDEN.test(words.slice(1).join(" ")); };

/** Counter-frame on `prefix` before a match → { opStart } or null (phase9-v1). */
// A counter verb inside a bill's name ("the Prevent Government Shutdowns Act")
// is a title, not an action.
const IN_TITLE = /\b[A-Z][\w'’-]*(?:\s+[A-Z][\w'’-]*)*\s+Act\b/;
// "prevent terrorism BY requiring …": a means clause, not the countered action.
const MEANS_BEFORE = /\b(?:by|through|while|with|via)\s*$/i;
// "never stop fighting to …" (phase9-v2): a negated stop is a promise, not a counter.
const NEGATED_OP = /(?:\b(?:not|never|no longer)\b|n['’]t\b)\s+(?:ever\s+)?$/i;
export function counterFrame(prefix, match) {
  const b = COUNTER_BRIDGE.exec(prefix);
  if (b && !IN_TITLE.test(prefix.slice(b.index)) && !NEGATED_OP.test(prefix.slice(0, b.index))) return { opStart: b.index, via: b[1] };
  if (NOMINAL_MATCH.test(match) && !MEANS_BEFORE.test(prefix)) {
    const d = COUNTER_DIRECT.exec(prefix);
    if (d && !IN_TITLE.test(prefix.slice(d.index)) && !NEGATED_OP.test(prefix.slice(0, d.index))) return { opStart: d.index, via: d[1] };
  }
  return null;
}
// R18(a): "will never stop fighting to protect …", "won't back down from defending …"
// is a promise to keep doing it, not a negation.
const NEVER_STOP = /(?:\b(?:not|never|no longer)\b|n['’]t\b)\s+(?:ever\s+)?(?:stop(?:ped)?|quit|cease|give up|back down|let up|relent|rest|waver)\b(?:\s+[\w'’-]+){0,3}\s*$/i;
/** Is the match a negated verb (NEG_TAIL) or a reported figure (STAT)? */
export const negatedMatch = (prefix) => NEG_TAIL.test(prefix) && !NEVER_STOP.test(prefix);
export const statisticMatch = (prefix, match) => STAT_TAIL.test(prefix) || STAT_MATCH.test(match);

// ── READING (phase9-v2, R18) ────────────────────────────────────────────────
// Per-match guards: the verb of a directional match must really act on the
// object it matched. Each returns a reason string, or null when the match stands.
// Topic of talk: the object only follows "about / regarding / over …".
const TALK_GAP = /\b(?:about|regarding|concerning|over|amid|in response to|in light of|in the wake of)\b|\b(?:remarks|hearings?|statements?|letters?|speech(?:es)?|reports?|briefings?|testimony|op-?eds?|roundtables?|discussions?|questions?|concerns?|interviews?)\s+(?:on|about|regarding|over|at)\b/i;
// A modal opens a new predicate: "banning the pipeline WOULD increase emissions".
const MODAL_GAP = /\b(?:would|will|could|might|may)\b/i;
// "keeping Americans safe … rather than murder us like ICE did".
const CONTRAST_GAP = /\b(?:rather than|instead of|unlike)\b/i;
// "the use of federal funds for … military force": a noun, not a verb.
// "Bethany supports full and equal funding for …": the noun is what they support.
const SUPPORT_NOUN = /\b(?:support\w*|back\w*|champion\w*|fight\w* for|fought for|call\w* for|push\w* for|secur\w+|deliver\w*|increas\w+|protect\w*|restor\w+|guarantee\w*|ensur\w+|provid\w+|expand\w*|boost\w*|pass\w*|propos\w+|want\w*|need\w*)\s+(?:[\w'’$-]+\s+){0,4}$/i;
const NOUN_USE_HEAD = /^(?:fund(?:s|ing)?|help|hold|boost|increase|keep|pass|build|delivery|investments?|protections?)$/i;
const NOUN_USE_BEFORE = /(?:\b(?:the|a|an|of|any|federal|state|these|those|such|its|their|his|her|our|my|your|new|more|less|additional|continued|bipartisan|increased|annual|emergency)\s+|['’]s\s+(?:[\w-]+\s+){0,2}|\w-)$/i;
// "stop the Bureau of …, Firearms … FROM arbitrarily blocking imports": the object
// is who is stopped; the act is the gerund after "from".
const STOP_HEAD = /^(?:stop(?:s|ped|ping)?|block\w{0,3}|prevent\w{0,3}|prohibit\w{0,3}|bar(?:s|red|ring)?|ban(?:s|ned|ning)?)$/i;
const FROM_GERUND = /^[^.;!?]{0,60}?\bfrom\s+(?:\w+ly\s+)?\w+ing\b/i;
const DOWN_HEAD = /^(?:stop\w*|block\w*|prevent\w*|prohibit\w*|bar|bars|barred|ban\w*|end|ends|ended|ending|cut\w*|repeal\w*|oppos\w+|reject\w*|eliminat\w+|restrict\w*|limit\w*|halt\w*|defund\w*)$/i;
// A bill's name: a capitalised run ending in "Act".
const ACT_TITLE_G = /\b(?:[A-Z][\w'’-]*,?\s+(?:(?:of|for|and|the|to|in|on|from|&|a|an)\s+)*){1,12}Act\b/g;
// polarity-v1: "ice" in lower case is frozen water ("ice jams", "trucking in ice"),
// not the agency. The rules are case-insensitive, so the agency is checked here.
const LOWER_ICE = /\bice\b/i;
export function matchGuard(sentence, m) {
  const text = m[0];
  if (LOWER_ICE.test(text) && !/\bICE\b/.test(text)) return "not_the_agency";
  const head = (/^\S+/.exec(text) || [""])[0];
  const gap = text.slice(head.length);
  if (TALK_GAP.test(gap)) return "topic_of_talk";
  // …unless the modal sits in a relative clause describing the object ("a bill that will advance …").
  if (MODAL_GAP.test(gap) && !/\b(?:that|which|who)\s+(?:\w+\s+)?(?:would|will|could|might|may)\b/i.test(gap)) return "new_predicate";
  if (CONTRAST_GAP.test(gap)) return "contrast";
  if (NOUN_USE_HEAD.test(head) && (NOUN_USE_BEFORE.test(sentence.slice(0, m.index)) || /^\s+(?:of|for)\b/i.test(gap))
      && !SUPPORT_NOUN.test(sentence.slice(0, m.index))) return "noun_use";
  if (STOP_HEAD.test(head) && FROM_GERUND.test(sentence.slice(m.index + text.length))) return "stop_from";
  ACT_TITLE_G.lastIndex = 0;
  let t;
  const end = m.index + text.length;
  while ((t = ACT_TITLE_G.exec(sentence))) {
    // The verb outside a bill's name, the object inside it.
    // (A match that ends on "Act" has the bill itself as its object, and stands.)
    if (DOWN_HEAD.test(head) && m.index < t.index && end > t.index && end < t.index + t[0].length - 3) return "inside_bill_name";
  }
  return null;
}
const GLOBAL_RES = new WeakMap();
const asGlobal = (re) => { let g = GLOBAL_RES.get(re); if (!g) GLOBAL_RES.set(re, g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g")); return g; };
/** First match of `re` in `sentence` that passes matchGuard → { m, guard } (m null when every match was guarded). */
export function guardedMatch(re, sentence) {
  if (!re) return { m: null, guard: null };
  const g = asGlobal(re);
  g.lastIndex = 0;
  let m, guard = null;
  while ((m = g.exec(sentence))) {
    if (m[0] === "") { g.lastIndex++; continue; }
    const why = matchGuard(sentence, m);
    if (!why) return { m, guard: null };
    guard ||= why;
    g.lastIndex = m.index + 1;
  }
  return { m: null, guard };
}

// Nominal harm (R18a): the match OPENS on a noun naming someone's action against
// a program or right ("cuts to Social Security", "the Administration’s continual
// cuts …", "attacks on Medicare", "privatization of …").
const HARM_NOUN = /^(?:cuts|cutbacks?|attacks?|assaults?|privatization|elimination|threats?|raids?)\b/i;
const HARM_CUT = /^(?:cut|repeal|gutting|slashing)\b/i;
const HARM_DETERMINER = /(?:\b(?:the|any|a|these|those|his|her|their|its|proposed|planned|deep|devastating|continual|continued|massive|harmful|drastic|cruel|reckless|dangerous|draconian|sweeping|recent|latest|new|further|more|such|partisan|administration|federal)|['’]s)\s+(?:[\w-]+\s+){0,2}$/i;
const COUNTER_ANY = new RegExp(String.raw`\b(${COUNTER_OP})\b`, "gi");
const SUPPORT_GOVERNS = /\b(?:support\w*|back(?:s|ed|ing)?|propos\w+|call(?:s|ed|ing)? for|push(?:es|ed|ing)? for|favor\w*|want\w*|need\w*|mak(?:e|es|ing)|made|enact\w*|pass(?:es|ed|ing)?|vot(?:e|es|ed|ing) for|endors\w+|implement\w*|deliver\w*)\s+(?:[\w'’$-]+\s+){0,3}$/i;
/** Is the match a nominal harm ("cuts to …")? */
export function nominalHarm(prefix, match) {
  if (HARM_NOUN.test(match)) return true;
  return HARM_CUT.test(match) && HARM_DETERMINER.test(prefix);
}
/**
 * What a nominal harm means (R18a) → { flip: true, opStart, via } (the speaker
 * counters it: defends the program), { keep: true } (the speaker calls for it),
 * or null (a description of someone else's action: a mention).
 */
export function nominalReading(prefix) {
  const clause = prefix.slice(Math.max(prefix.lastIndexOf(";"), prefix.lastIndexOf(" but ")) + 1);
  const off = prefix.length - clause.length;
  let m, last = null;
  COUNTER_ANY.lastIndex = 0;
  while ((m = COUNTER_ANY.exec(clause))) last = m;
  if (last && !IN_TITLE.test(clause.slice(last.index))) return { flip: true, opStart: off + last.index, via: last[1] };
  if (SUPPORT_GOVERNS.test(clause)) return { keep: true };
  return null;
}

const NEWS_REPOST_URL = /\/(?:in-the-news|news-coverage|in-the-media|press-coverage|media-coverage|news-clips|clips|coverage)(?:\/|$)/i;
const NEWS_REPOST_TYPE = /\b(?:in the news|news coverage|media coverage|press clips?)\b/i;
/** A news article reposted on the politician's own site (REPORTED VOICE). */
export function isNewsRepost(raw) {
  return NEWS_REPOST_TYPE.test(String(raw?.source_type || "")) || NEWS_REPOST_URL.test(String(raw?.final_url || raw?.url || ""));
}
const HAS_QUOTE = /[“”"]/;
// First person on the politician's own site is their own voice (an op-ed in the
// news section), never a reporter's paraphrase.
const FIRST_PERSON_VOICE = /\b(?:I|I['’](?:m|ve|ll|d)|we|we['’](?:re|ve|ll)|my|our)\b/;

/** R10: the first campaign-claim pattern for `topic` that matches → { m, side } or null. */
function claimMatch(sentence, topic) {
  for (const c of CLAIM_RULES[topic] || []) {
    if (c.context && !c.context.test(sentence)) continue;
    const m = c.re.exec(sentence);
    if (m) return { m, side: c.side };
  }
  return null;
}

const FRAME_SUBJECT = /(?:^|[.;:,—–"“]\s*)(?:The|An?)\s+((?:[A-Z][\w'’&-]*\s+){1,4})$/;
/** polarity-v1: does the topic's veto for `side` (vetoSupport / vetoOppose) cover this sentence? */
const polarityVeto = (r, side, sentence) => !!(side === "support" ? r.vetoSupport : side === "oppose" ? r.vetoOppose : null)?.test(sentence);

/**
 * Classify one sentence → { kind: 'clear'|'implication'|'mention'|null, side, reversal, actor, via? }.
 * `politicianId` is the page's own politician (raw.politician_id). `claims`
 * (phase8-v3, R10) turns on the campaign-claim patterns — set for campaign
 * pages, official issue pages and the candidate's own speeches.
 */
export function classify(sentence, topic, politicianId = null, { claims = false, inSpan = false, reportedVoice = false } = {}) {
  const r = TOPIC_RULES[topic];
  if (!r) throw new Error(`no scoring rules for topic ${topic}`);
  const reversal = REVERSAL.test(sentence);
  // Subject spans: a sentence inside a span on this topic's subject is ABOUT
  // the subject even when it does not name it again (see subjectSpans).
  const inContext = !r.context || inSpan || r.context.test(sentence);
  // R18(a): the first match whose verb really acts on its object (matchGuard).
  const gs = inContext ? guardedMatch(r.support, sentence) : { m: null, guard: null };
  const go = inContext ? guardedMatch(r.oppose, sentence) : { m: null, guard: null };
  let sm = gs.m, om = go.m;
  const guard = gs.guard || go.guard;
  let via;
  // polarity-v1: a topic's polarity frame states the side outright ("condemn the
  // mass deportation agenda", "voted to pass the Born-Alive Act"). One side only:
  // it replaces the generic reads and is never flipped by a counter-frame.
  let framed = false;
  if (inContext && (r.frameSupport || r.frameOppose)) {
    let fsm = guardedMatch(r.frameSupport, sentence).m, fom = guardedMatch(r.frameOppose, sentence).m;
    // Both sides: the frame that starts first holds the governing verb ("opposing
    // a lawsuit seeking to ban access to mifepristone" is against the ban).
    if (fsm && fom && fsm.index !== fom.index) { if (fsm.index < fom.index) fom = null; else fsm = null; }
    if ((fsm || fom) && !(fsm && fom)) { sm = fsm; om = fom; framed = true; }
  }
  if (!sm && !om && claims) {
    const cm = claimMatch(sentence, topic);
    if (cm) { if (cm.side === "support") sm = cm.m; else om = cm.m; via = "claim"; }
  }
  // phase9-v1: both sides match, but a counter-frame turns one of them around
  // ("keep opposing efforts to cut Social Security": keep → support, opposing
  // efforts to cut → support) — when both now say the same side, it is one read.
  if (sm && om && !reversal && !framed) {
    const cfo = counterFrame(sentence.slice(0, om.index), om[0]);
    const cfs = counterFrame(sentence.slice(0, sm.index), sm[0]);
    if ((cfo ? "support" : "oppose") === (cfs ? "oppose" : "support")) { if (cfo) sm = null; else om = null; }
  }
  if ((sm || om) && !(sm && om)) {
    const m = sm || om;
    const prefix = sentence.slice(0, m.index);
    let side = sm ? "support" : "oppose";
    // phase9-v1 framing: a reporter's paraphrase is not the politician's voice.
    if (reportedVoice && !reversal) return { kind: "mention", side: null, reversal: false, actor: { kind: "third", via: "reporter (news article)" }, framing: "reported" };
    // Counter-frame: acting against someone else's action flips the side, and the
    // actor is whoever does the countering.
    // A question ("What more will it take for the VA to stop …?") states no side.
    if (!reversal && /\?\s*["”’]?\s*$/.test(sentence)) return { kind: "mention", side: null, reversal: false, actor: null, framing: "question" };
    let cf = reversal || framed ? null : counterFrame(prefix, m[0]);
    // "voted against every bill that does NOT uphold …" — a double negative: the
    // counter verb and the negation cancel out, the side stands as written.
    if (cf && negatedMatch(prefix)) cf = null;
    // R18(a): "cuts to Social Security" named as a noun — whose action is it?
    // Only on the oppose side: that is the read that turns a defender into an opponent.
    if (!cf && !reversal && !framed && om && !sm && nominalHarm(prefix, m[0])) {
      const nr = nominalReading(prefix);
      if (nr?.flip && !negatedMatch(sentence.slice(0, nr.opStart))) cf = { opStart: nr.opStart, via: nr.via };
      else if (!nr?.keep) return { kind: "mention", side: null, reversal: false, actor: null, framing: "nominal" };
    }
    if (cf) side = side === "support" ? "oppose" : "support";
    if (!framed && om && !sm && burdenObject(m[0])) side = side === "support" ? "oppose" : "support";
    const actorPrefix = cf ? prefix.slice(0, cf.opStart) : prefix;
    // phase9-v1: "<subject> banning / cutting …" names who acts on either side.
    // On the support side only a decision noun ("policy banning …") names the
    // actor; a capitalised word before a gerund is usually a Title Case heading.
    const ps = !cf ? participleSubject(prefix, m[0], politicianId) : null;
    let actor = (ps && (om || ps.kind === "third") ? ps : null) || actorFor(actorPrefix, politicianId);
    // polarity-v1: a frame opens on its verb, so a named body right before it is
    // the subject ("The Association opposes any law that …").
    if (framed && actor.kind === "self") {
      const subj = FRAME_SUBJECT.exec(prefix);
      if (subj && !namesSelf(subj[1], politicianId)) actor = { kind: "third", via: subj[1].trim() };
    }
    // R18(a): the politician countering someone else's action — "sounding the
    // alarm about the Pentagon’s practice of using taxpayer dollars to fund
    // abortions", "we oppose Trump’s plan, which would cut …": the other party
    // acts, the politician is against it, so the side turns around.
    if (actor.kind !== "self" && !cf && !reversal && !framed) {
      const clause = prefix.slice(Math.max(prefix.lastIndexOf(";"), prefix.lastIndexOf(" but ")) + 1);
      const off = prefix.length - clause.length;
      const at = actor.via ? prefix.lastIndexOf(actor.via) : -1;
      let k, op = null;
      COUNTER_ANY.lastIndex = 0;
      while ((k = COUNTER_ANY.exec(clause))) if (off + k.index < at) op = k;
      if (op && !IN_TITLE.test(clause.slice(op.index)) && !NEGATED_OP.test(clause.slice(0, op.index))) {
        const by = actorFor(prefix.slice(0, off + op.index), politicianId);
        if (by.kind === "self") { cf = { opStart: off + op.index, via: op[1] }; side = side === "support" ? "oppose" : "support"; actor = by; }
      }
    }
    // Someone else acting stays someone else's (zero weight), negated or not.
    if (actor.kind !== "self" && !reversal) return { kind: "mention", side: null, reversal: false, actor };
    // The politician's own negated verb or a reported figure is not a call to act.
    if (!reversal && !cf && negatedMatch(prefix) && !counterFrame(prefix.replace(NEG_STRIP, " "), m[0])) return { kind: "mention", side: null, reversal: false, actor: null, framing: "negated" };
    if (!reversal && statisticMatch(prefix, m[0])) return { kind: "mention", side: null, reversal: false, actor: null, framing: "statistic" };
    // polarity-v1: criticism of the policy or a description of an event never reads this side.
    if (!reversal && polarityVeto(r, side, sentence)) return { kind: "mention", side: null, reversal: false, actor: null, framing: "polarity_veto" };
    if (actor.kind === "self" || reversal) {
      return { kind: "clear", side, reversal, actor, ...(via ? { via } : {}), ...(cf ? { framing: "counter", counter_via: cf.via } : {}), ...(framed ? { polarity: "frame" } : {}) };
    }
    return { kind: "mention", side: null, reversal: false, actor };
  }
  const imp = !(sm || om) && inContext && !reportedVoice ? classifyImplication(sentence, r, politicianId) : null;
  if (imp && imp.kind === "implication" && polarityVeto(r, imp.side, sentence)) return { kind: "mention", side: null, reversal: false, actor: null, framing: "polarity_veto" };
  if (imp) return imp;
  if (!(sm || om) && guard) return { kind: "mention", side: null, reversal: false, actor: null, framing: guard };
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

// ── R15: implied stance from aligned mentions ──────────────────────────────
// Negation anywhere before a directional cue makes the lean unreadable (it may
// flip the side), so a negated mention never leans.
const LEAN_NEGATION = /\b(?:not|never|no|nor|n['’]t|cannot|won['’]t|refuse[sd]? to|against)\b/i;
const PASSIVE_AUX = String.raw`(?:is|are|was|were|be|been|being|get|gets|got|remains?)`;
const PASSIVE_ADV = String.raw`(?:(?:fully|further|finally|completely|permanently|now|always|properly|significantly|dramatically)\s+)?`;

/**
 * R15: rewrite each "<subject phrase naming the topic> (is|are|must be …)
 * <verb>ed" into "<verb>ed <subject phrase>" so the topic's own (active-voice)
 * vocabulary can read the direction ("Ukraine funding must be halted" →
 * "halted Ukraine funding"). The subject phrase runs from the start of its
 * clause. Returns [{ text, at, span }] (at = where the topic term starts; the
 * actor is read on the sentence before it).
 */
const PASSIVE_MODAL = String.raw`(?:(?:must|should|will|would|can|could|shall|has to|have to|needs? to|ought to|deserves? to)\s+)?`;
const PASSIVE_TAIL = String.raw`\s+${PASSIVE_MODAL}${PASSIVE_AUX}\s+${PASSIVE_ADV}`;
const PASSIVE_RES = new Map();
function passiveVariants(sentence, r) {
  let re = PASSIVE_RES.get(r);
  if (!re) PASSIVE_RES.set(r, re = new RegExp(String.raw`(?:${r.mention.source})(?:(?!\b(?:and|but|while|or|so|because|yet)\b)[^.!?;:,]){0,40}?${PASSIVE_TAIL}(\w+(?:ed|en)|cut|kept|built|met|paid|won)\b`, "gi"));
  re.lastIndex = 0;
  const out = [];
  let m;
  while ((m = re.exec(sentence))) {
    const verb = m[m.length - 1];
    const clause = Math.max(sentence.lastIndexOf(",", m.index), sentence.lastIndexOf(";", m.index), sentence.lastIndexOf(":", m.index),
      ...[" and ", " but ", " while "].map((w) => { const i = sentence.lastIndexOf(w, m.index); return i < 0 ? -1 : i + w.length - 1; })) + 1;
    const subject = sentence.slice(clause, m.index + m[0].length - verb.length).replace(new RegExp(`${PASSIVE_TAIL}$`, "i"), "").trim();
    out.push({ text: `${verb} ${subject}`, at: m.index, span: sentence.slice(clause, m.index + m[0].length) });
  }
  return out;
}

/**
 * R15: which way does one zero-weight mention lean? → "support" | "oppose" |
 * "both" | null. Uses only the topic's own vocabulary (so polarity follows the
 * key), read in the page's own voice. Questions and negated mentions never lean.
 */
export function mentionLean(sentence, topic, politicianId = null) {
  const r = TOPIC_RULES[topic];
  if (!r || /\?\s*$/.test(sentence)) return null;
  let sup = false, opp = false;
  // Own voice and not negated, read on the text before the cue.
  const own = (prefix) => !LEAN_NEGATION.test(prefix) && implicationActor(prefix, r, politicianId).kind === "self";
  // `base` = the sentence before the cue's text; a rewritten passive starts
  // with its verb, so only `base` is read for the actor there.
  const read = (text, base, rewritten = false) => {
    for (const [re, side] of [[r.support, "s"], [r.implySupport, "s"], [r.oppose, "o"], [r.implyOppose, "o"]]) {
      const m = re ? re.exec(text) : null;
      if (!m || !own(rewritten ? base : base + text.slice(0, m.index))) continue;
      if (side === "s") sup = true; else opp = true;
    }
  };
  // The topic's own directional vocabulary on the sentence as written (it
  // passed none of the explicit gates — e.g. the subject context check).
  read(sentence, "");
  // The passive form: "Social Security must be protected".
  for (const pv of passiveVariants(sentence, r)) {
    if (!LEAN_NEGATION.test(pv.span)) read(pv.text, sentence.slice(0, pv.at), true);
  }
  // Problem framing the topic's outcome rule gives a side to (R6(b) / R7):
  // support = the speaker wants the problem fixed.
  if (r.outcome) {
    const om = r.outcome.exec(sentence);
    const pm = om ? null : (namesProblem(sentence, topic) ? PROBLEM_CUE.exec(sentence) : null);
    const at = om ? om.index : pm ? pm.index : -1;
    if (at >= 0 && own(sentence.slice(0, at))) sup = true;
  }
  if (sup && opp) return "both";
  return sup ? "support" : opp ? "oppose" : null;
}

// ── R14: title and lead-sentence stance signals ─────────────────────────────
// A press release or statement often puts the whole position in its headline
// or opening line — "Duckworth Votes Against Final NDAA", "Cortez Masto
// Introduces Bill to Block Yucca Mountain" — in words the topic vocabulary
// does not read. R14 reads ONLY the page's title (<title>, og:title, the first
// <h1>, raw.title) and the first two sentences after it, and ONLY when the
// rest of the rules found no directional signal at all (the page would read
// "no clear position"). It never changes a page that already reads support,
// oppose or mixed, and never adds a cross-topic candidate.
//
// Cues, direction from the verb:
//   vote       votes / voted / voting for → support; … against → oppose
//   purpose    calls to block, demand(s) no / zero, block / stop / end /
//              prevent the, will not agree, cannot continue, must not fund /
//              allow → oppose ("introduces bill to block" is a purpose too)
//   vehicle    introduces / introduced a bill or legislation, cosponsors /
//              cosponsored → support, unless the lead also states a purpose
//              (then the purpose sets the side: "a bill to block …")
// The verb must be the page's own politician's (actorFor: self), not
// negated, not in a question, not inside someone else's quote. The lead must
// be about the page's topic (its vocabulary, or a linked directional key's,
// anywhere in the title or the two sentences — the topic may sit in one line
// and the verb in the next), or the verb must act on a named bill (H.R. 4410,
// "the … Act", NDAA), which on a page filed under the topic is a stance on it.
// Two firm cues that disagree (a vote for and a vote against) pick no side.
// The read is one explicit statement at the source's tier weight; every other
// rule (R4, R5, R8 …) applies to it unchanged.
export const LEAD_SENTENCES = 2;
const LEAD_VOTE_FOR = /\b(?:vote[sd]?|voting|cast (?:a|his|her|my|their) vote)\s+(?:yes\s+|aye\s+)?(?:in favor of|for)\b/i;
const LEAD_VOTE_AGAINST = /\b(?:vote[sd]?|voting|cast (?:a|his|her|my|their) vote)\s+(?:no\s+|nay\s+)?against\b/i;
const LEAD_PURPOSE = /\bcall(?:s|ed|ing)?\s+(?:on\s+\w+(?:\s+\w+)?\s+)?(?:for\s+\w+\s+)?to\s+block\b|\bdemand(?:s|ed|ing)?\s+(?:for\s+)?(?:no|zero)\b|\b(?:block(?:s|ed|ing)?|stop(?:s|ped|ping)?|end(?:s|ed|ing)?|prevent(?:s|ed|ing)?)\s+the\b|\b(?:will not|won['’]t)\s+agree\b|\b(?:cannot|can['’]t|can not)\s+continue\b|\bmust\s+not\s+(?:fund|allow)\b/i;
// The purpose of the politician's own bill or vote: "a bill to block Yucca Mountain".
const LEAD_BILL_PURPOSE = /\b(?:bill|legislation|resolution|act|amendment|measure)s?\s+(?:that would\s+|to\s+)(?:block|stop|end|prevent|halt|bar|prohibit|overturn|repeal|rescind|nullify|reverse|disapprove)\b|\bresolutions?\s+of\s+disapproval\b/i;
// A purpose verb counts only as the clause's own verb ("Ocasio-Cortez Calls to
// Block …", "Congress must not fund …") or right after the politician's own
// vote or bill ("a bill to block …") — not deep inside a bill's description
// ("… to enact new protections, including stopping the government from …").
const LEAD_PURPOSE_NEAR = 30;
const LEAD_CLAUSE_WORDS = 6;
// Mixed feelings in the lead: the read is not clear.
const LEAD_RESERVATION = /\b(?:deeply flawed|flawed provisions?|serious (?:concerns|reservations)|reservations about|despite (?:my|our) concerns|stands no chance)\b/i;
// The lead says the bill harms the issue ("harmful cuts to Medicaid", "take
// health care away", "strips protections"): then a vote against the bill is
// a vote FOR the issue, and a vote for it is against.
const LEAD_HARM = /\b(?:(?:harmful |deep |devastating |massive )?cuts? to|cut(?:s|ting)?|gut(?:s|ted|ting)?|slash(?:es|ed|ing)?|strip(?:s|ped|ping)?|eliminat(?:e|es|ed|ing)|undermin(?:e|es|ed|ing)|attack(?:s|ing)? on|tak(?:e|es|ing) (?:\w+ ){0,3}away)\b[^.!?]{0,40}?\b(?:medicaid|medicare|social security|benefits|coverage|health ?care|nutrition|programs?|protections?|rights|access|funding|services)\b/i;
// Issues whose own position is a reduction (cut taxes, cut spending, ban …):
// "cuts" there is the issue's goal, not a harm, so the flip never applies.
const REDUCTION_POLE = /^(?:Cut|Lower|Reduce|Slash|Ban|End|Bring down|Cap|Shield|Tighten|Crack|Limit|Stop|Audit|Balance|Require adults)/;
const reductionPole = (topic) => CORE_TOPICS.includes(topic) || REDUCTION_POLE.test(ISSUE_TOPIC_VOCAB[topic]?.pos || "");
const RESTRICTIVE_ANY = /\b(?:ban|pause|halt|restrict|prohibit|regulate|limit|block|stop|end|prevent|bar|curb|freeze|suspend|outlaw|criminalize|cap|rein in|check|constrain|overturn|repeal|rescind|nullify|reverse|disapprove)\b/i;
const LEAD_VEHICLE = /\bintroduc(?:e|es|ed|ing)\b[^.!?]{0,80}?\b(?:bill|legislation|resolution|act|amendment|measure)s?\b|\bco-?sponsor(?:s|ed|ing)?\b/i;
// Words that turn a vote / vehicle cue around ("did not vote for", "never cosponsored").
const LEAD_NEGATED = /\b(?:not|never|no|n['’]t|refus(?:e|es|ed|ing) to|declin(?:e|es|ed|ing) to)\s+(?:\w+\s+){0,2}$/i;
const LEAD_BILL = new RegExp(`${NAMED_BILL.source}|\\bNDAA\\b`);

const stripTags = (s) => decode(String(s || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/** The page's title lines: raw.title, <title>, og:title, first <h1> (deduped, in that order). */
export function leadTitles(raw) {
  const body = String(raw?.body || "");
  const out = [];
  const add = (x) => { const s = stripTags(x); if (s.length >= 8 && !out.includes(s)) out.push(s); };
  if (typeof raw?.title === "string") add(raw.title);
  add((/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(body) || [])[1]);
  add((/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i.exec(body) || /<meta\b[^>]*content=["']([^"']*)["'][^>]*property=["']og:title["']/i.exec(body) || [])[1]);
  add((/<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(body) || [])[1]);
  return out;
}

/**
 * The lead units R14 reads: the title lines, then the first LEAD_SENTENCES
 * sentences after the title (the first <h1> when the page has one, else the
 * top of the page). → [{ text, i }] where `i` is the sentence index in `list`
 * (null for a title line that is not a body sentence).
 */
export function leadUnits(raw, list) {
  const titles = leadTitles(raw);
  const units = [];
  let start = 0;
  // The h1 (or a title line) is usually also the first heading sentence of the body.
  const at = list.findIndex((s, k) => k < 40 && titles.some((t) => s === t || t.startsWith(s) || s.startsWith(t)));
  if (at !== -1) start = at + 1;
  for (const t of titles) {
    const k = list.indexOf(t);
    units.push({ text: t, i: k !== -1 && k < start ? k : null, title: true });
  }
  for (let k = start; k < list.length && k < start + LEAD_SENTENCES; k++) units.push({ text: list[k], i: k, title: false });
  return units;
}

// A headline's subject: the capitalised run right before the verb ("Republicans
// Voted Against …", "Cortez Masto, Rosen Introduce …"). Title case hides the
// verb from NAMED_ACTOR, so R14 reads the subject itself.
const HEADLINE_SUBJECT = /((?:[A-Z][\p{L}\d'’.-]*,?\s+(?:(?:and|&)\s+)?)+)$/u;
const SUBJECT_FILLER = /^(?:Rep|Reps|Sen|Sens|Senators?|Representatives?|Congress(?:wo)?man|Congressmember|U\.S\.|Gov|Governor|Today|Tonight|Yesterday|This|Week|WASHINGTON|D\.C\.)$/;
const lettersOnly = (x) => String(x || "").toLowerCase().replace(/[^a-z]/g, "");
/** A name alias from the member's own site host ("ocasio-cortez.house.gov" → "ocasiocortez"). */
function hostAlias(link) {
  const { host } = linkParts(link);
  const label = host.replace(/^www\./, "").split(".")[0] || "";
  const a = lettersOnly(label);
  return a.length >= 4 && /\.(gov|com|org|us)$/.test(host) ? a : null;
}
// "Congress must not fund …" is the speaker prescribing, not Congress acting.
const PRESCRIBED_SUBJECT = /^(?:Congress|America|Washington|(?:The )?(?:United States|U\.S\.|Senate|House|Administration|Pentagon))\s*,?\s*$/;
function headlineSubjectIsOther(prefix, politicianId, alias, prescriptive = false) {
  const m = HEADLINE_SUBJECT.exec(prefix);
  if (!m) return false;
  // The run is the subject only when it opens its clause ("for House NDAA" is an object).
  if (!/(?:^|[—–:;"“(]|,)\s*$/.test(prefix.slice(0, m.index))) return false;
  if (prescriptive && PRESCRIBED_SUBJECT.test(m[1])) return false;
  const words = m[1].split(/[\s,&]+/).filter((w) => w && w !== "and").map((w) => w.replace(/[’']s$/, ""));
  const named = words.filter((w) => !NOT_A_NAME.has(w) && !SUBJECT_FILLER.test(w.replace(/\.$/, "")) && !SUBJECT_FILLER.test(w));
  if (!named.length) return false;
  const self = selfNamePattern(politicianId);
  if (self && (self.lastIndex = 0, self.test(m[1]))) return false;
  if (alias && lettersOnly(m[1]).includes(alias)) return false;
  return true;
}

/** One lead unit's cue → { side, firm, m } or null (no cue / ambiguous / not the politician's own). */
function leadCue(text, politicianId, alias = null) {
  if (/\?\s*["”’]?\s*$/.test(text)) return null;
  const own = (m, negatable) => {
    if (!m) return false;
    const prefix = text.slice(0, m.index);
    if (negatable && LEAD_NEGATED.test(prefix)) return false;
    const prescriptive = /^(?:must|cannot|can['’]t|can not|will not|won['’]t)\b/i.test(m[0]);
    if (headlineSubjectIsOther(prefix, politicianId, alias, prescriptive)) return false;
    if (prescriptive && PRESCRIBED_SUBJECT.test((HEADLINE_SUBJECT.exec(prefix) || [])[1] || "")) return true;
    return actorFor(prefix, politicianId).kind === "self";
  };
  const va = LEAD_VOTE_AGAINST.exec(text), vf = LEAD_VOTE_FOR.exec(text);
  const v = LEAD_VEHICLE.exec(text);
  const p = LEAD_PURPOSE.exec(text) || ((vf || v) ? LEAD_BILL_PURPOSE.exec(text) : null);
  const okVa = own(va, true), okVf = own(vf, true), okV = own(v, true);
  // A purpose is the politician's own when it is the clause's own verb with the
  // politician as actor, or the purpose right after the politician's vote / bill.
  const clauseStart = (i) => { const pre = text.slice(0, i); const k = Math.max(...[/[—–:;]/g].map((re) => { let m, last = -1; while ((m = re.exec(pre))) last = m.index + m[0].length; return last; })); return k < 0 ? 0 : k; };
  const shortClause = (m) => text.slice(clauseStart(m.index), m.index).trim().split(/\s+/).filter(Boolean).length <= LEAD_CLAUSE_WORDS;
  const near = (a) => !!a && a.index < p.index && p.index - (a.index + a[0].length) <= LEAD_PURPOSE_NEAR;
  const okP = !!p && ((shortClause(p) && own(p, false)) || (okVf && near(vf)) || (okV && near(v)));
  if (okVa && okP) return null;            // "voted against the bill to end …" — a double negative
  if (okVa && okVf) return null;           // both ways in one line
  if (okVa) return { side: "oppose", firm: true, kind: "vote", m: va, bill: LEAD_BILL.test(text.slice(va.index)) };
  if (okP) return { side: "oppose", firm: true, kind: "purpose", m: p, bill: LEAD_BILL.test(text) };
  if (okVf) return { side: "support", firm: true, kind: "vote", m: vf, bill: LEAD_BILL.test(text.slice(vf.index)) };
  if (okV) return { side: "support", firm: false, kind: "vehicle", m: v, bill: LEAD_BILL.test(text.slice(v.index)) };
  return null;
}

/**
 * R14: the clear position the title and lead sentences state on `topic`, or
 * null. → { side, units: [{ text, i, title }], via } when the cues agree and
 * the lead is about the topic (or the verb acts on a named bill).
 */
export function leadStance(raw, list, topic, speakers = [], ctx = null) {
  const r = TOPIC_RULES[topic];
  if (!r || NO_POLE_TOPICS.has(topic)) return null;
  const units = leadUnits(raw, list);
  const alias = hostAlias(raw.final_url || raw.url);
  const cues = [];
  for (const u of units) {
    if (u.i != null && speakers[u.i] === "other") continue; // someone else's quote
    // R18(c): on another member's release, a lead line counts only when it names the page's politician.
    if (ctx?.otherVoice && !namesSelf(u.text, raw.politician_id)) continue;
    const c = leadCue(u.text, raw.politician_id, alias);
    if (c) cues.push({ ...c, u });
  }
  // R18 (phase9-v2): a bill's purpose is read with the topic's own vocabulary —
  // "a bill to ban artificial superintelligence" is not support for light AI
  // rules, "a bill to end taxpayer-funded abortion" is support on pro_life. A
  // restrictive purpose the vocabulary cannot read gives no side.
  for (let k = cues.length - 1; k >= 0; k--) {
    const c = cues[k];
    if (c.kind !== "vehicle" && c.kind !== "purpose") continue;
    const after = c.u.text.slice(c.kind === "vehicle" ? c.m.index + c.m[0].length : c.m.index);
    const pm = c.kind === "vehicle" ? /^[^.!?]*?\b(?:to|that would|which would)\s+([^.!?|»]{3,160})/i.exec(after) : /\b((?:block|stop|end|prevent|halt|bar|prohibit|overturn|repeal|rescind|nullify|reverse|disapprove|ban|pause)\b[^.!?|»]{3,160})/i.exec(after);
    if (!pm) continue;
    let purpose = pm[1];
    // "a bill to stop X from garnishing Social Security checks": the act being
    // stopped is the gerund after "from" — stopping it is the side opposite to it.
    const sf = /^(?:stop|block|prevent|prohibit|bar|ban)\w*\b[^.!?;]{0,80}?\bfrom\s+((?:\w+ly\s+)?\w+ing\b[^.!?|»]{0,140})/i.exec(purpose);
    if (sf) {
      const g = classify(sf[1], topic, raw.politician_id);
      if (g.kind === "clear" && !g.framing) { c.side = g.side === "support" ? "oppose" : "support"; c.firm = true; c.purposeRead = true; }
      else cues.splice(k, 1);
      continue;
    }
    // A restrictive verb anywhere in the purpose ("to create a new agency to BAN
    // artificial superintelligence", "effort to REIN IN … military force") is the
    // purpose: read from that verb on, and give no side when the vocabulary
    // cannot read it.
    const rv = RESTRICTIVE_ANY.exec(purpose);
    if (rv) {
      const sub = classify(purpose.slice(rv.index), topic, raw.politician_id);
      if (sub.kind === "clear" && !sub.framing) { c.side = sub.side; c.firm = true; c.purposeRead = true; }
      else if (c.kind === "vehicle" || reductionPole(topic) || rv.index > 0) cues.splice(k, 1);
      continue;
    }
    const read = classify(purpose, topic, raw.politician_id);
    if (read.kind === "clear" && !read.framing) { c.side = read.side; c.firm = true; c.purposeRead = true; continue; }
  }
  if (!cues.length) return null;
  const readable = units.filter((u) => !(u.i != null && speakers[u.i] === "other"));
  // A reservation in the lead or the sentence right after it qualifies the read.
  const lastLead = Math.max(-1, ...units.filter((u) => u.i != null).map((u) => u.i));
  const nextLine = lastLead >= 0 && lastLead + 1 < list.length ? list[lastLead + 1] : "";
  if (readable.some((u) => LEAD_RESERVATION.test(u.text)) || LEAD_RESERVATION.test(nextLine)) return null;
  // The bill harms the issue → a vote / bill cue's side turns around (never a purpose cue).
  if (!reductionPole(topic) && readable.some((u) => LEAD_HARM.test(u.text))) {
    for (const c of cues) if (c.kind !== "purpose") { c.side = c.side === "support" ? "oppose" : "support"; c.harm = true; }
  }
  const firm = new Set(cues.filter((c) => c.firm).map((c) => c.side));
  const soft = new Set(cues.map((c) => c.side));
  if (firm.size > 1 || (!firm.size && soft.size > 1)) return null;
  const side = [...(firm.size ? firm : soft)][0];
  const linked = Object.keys(TOPIC_RULES).filter((k) => linkedKeys(topic, k)).map((k) => TOPIC_RULES[k]);
  const about = (s) => [r, ...linked].some((x) => x.mention?.test(s) || x.context?.test(s));
  const topicUnits = units.filter((u) => !(u.i != null && speakers[u.i] === "other") && about(u.text));
  const onSide = cues.filter((c) => c.side === side);
  const billCue = onSide.find((c) => c.bill);
  // A named bill on a page filed under the topic counts only when the page
  // addresses the topic at all (a street-design bill filed under deportations does not).
  const addressed = list.some((x) => r.mention.test(x) || r.context?.test(x));
  if (!topicUnits.length && !(billCue && addressed)) return null;
  const cue = onSide.find((c) => about(c.u.text)) || billCue || onSide[0];
  const extra = about(cue.u.text) ? null : topicUnits.find((u) => u !== cue.u) || null;
  return { side, cue: cue.u, topicUnit: extra, via: cue.u.title ? "title" : "lead", bill: !!cue.bill, ...(cue.harm ? { harm: true } : {}) };
}

const trunc = (t) => (t.length > 300 ? t.slice(0, 297) + "…" : t);

const round2 = (n) => Math.round(n * 100) / 100;
const clamp = (n, max = WEIGHTS.maxConfidence) => Math.max(0, Math.min(max, n));

/**
 * R16: is this raw record a transcript of the politician's own video (the
 * video transcriber's page-shaped record — its body is only their spoken words)?
 */
export function isVideoTranscript(raw) {
  return raw?.type === "video" && /\byoutube-transcript\b/.test(String(raw?.content_type || ""))
    && Array.isArray(raw?.segments) && raw.segments.length > 0;
}

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
// DOCUMENT SCOPE (speech, interview, press release, statement, op-ed, bill or
// resolution text): the whole document is the unit of scope, not the
// paragraph. A subject stays open until a clear subject change — another
// country, an explicit transition, a heading, a clearly different issue, or a
// DISTINCT NEW MEASURE (a bill number not yet named in the span, once the span
// has named one). The no-debate-words limit stays only as a safety valve: a
// span closes after this many whole paragraphs with no subject, claim word or
// bill number. Campaign issue / policy pages (many issues on one page), roll
// calls and anything else keep the paragraph scope above, unchanged.
export const SPAN_DOCUMENT_GAP_PARAGRAPHS = 3;
const DOCUMENT_SOURCE = /\b(?:speech|remarks|transcript|interview|q&a|press release|news release|release|statement|op-?ed|letter|newsletter|post|blog|bill text|resolution text|floor|testimony|address|podcast|town hall)\b/i;
const NOT_DOCUMENT_SOURCE = /\b(?:issues?|policy|priorit\w+|platform|index|toolkit|roll-call|vote|journal|newsroom)\b/i;
/** Span scope for a source type: "document" (one speech / release / bill) or "paragraph". */
export const spanScopeFor = (sourceType) => (DOCUMENT_SOURCE.test(sourceType || "") && !NOT_DOCUMENT_SOURCE.test(sourceType || "") ? "document" : "paragraph");
// Federal bill numbers, for the distinct-measure break ("S.J.Res. 33" → "S.J.Res.33").
const BILL_NUMBER_G = /\b(?:H\.\s?R|H\.\s?(?:J\.\s?|Con\.\s?)?Res|S\.\s?(?:J\.\s?|Con\.\s?)?Res)\.\s?\d+\b|(?<![\w.])S\.\s?\d+\b/g;
const billNumbersIn = (s) => [...String(s).matchAll(BILL_NUMBER_G)].map((m) => m[0].replace(/\s+/g, ""));
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
export const TRANSITION = /\b(?:(?:let me|let['’]s|I(?:['’]d| would| want to)?) (?:now )?(?:turn|move|pivot|switch|shift) (?:now )?to|turning (?:now )?to|moving on|on (?:a|another) (?:different |separate )?(?:subject|topic|note|issue)|switching gears|changing (?:the )?subject|another (?:issue|subject|topic) (?:I|we)|next,? I want to talk about)\b/i;
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
 * { subject, span, scope, named, backward?, subjects?, facet?, change? } — `subject`
 * is the subject id or null, `span` a span number (1, 2, … in page order; null
 * outside any span), `named` whether the sentence names the subject itself
 * (false = carried), `backward` when it joined the span from just before the
 * opening sentence, `subjects` when it names two or more, `facet` (Israel
 * only) and `change` when the sentence is a clear subject change. `scope` is
 * the idea the sentence belongs to (1, 2, … in page order): a new scope starts
 * at every clear subject change, heading, transition, distinct new measure or
 * safety-valve gap. Moving between two keyed subjects (Ukraine → Israel inside
 * one aid package) opens a new span but stays in the same scope.
 *   opts.scope  "paragraph" (default — the original carry rule) or "document"
 *               (see SPAN_DOCUMENT_GAP_PARAGRAPHS; spanScopeFor picks it).
 */
export function subjectSpans(sentences, body = "", { scope: mode = "paragraph" } = {}) {
  const doc = mode === "document";
  const gapLimit = doc ? SPAN_DOCUMENT_GAP_PARAGRAPHS : SPAN_GAP_PARAGRAPHS;
  const heads = headingSentences(body);
  const blockOf = new Map();
  for (const x of extractSentenceBlocks(body)) if (!blockOf.has(x.text)) blockOf.set(x.text, x.block);
  const out = [];
  const blocks = [];
  let cur = null, span = 0, lastBlock = -Infinity, prevBlock = 0;
  let scopeN = 1, scopeUsed = false, lastDebate = -Infinity, spanBills = new Set();
  const newScope = () => { if (scopeUsed) { scopeN++; scopeUsed = false; } };
  const put = (e) => { scopeUsed = true; out.push({ ...e, scope: scopeN }); };
  const open = (id, i) => {
    const opened = id !== cur;
    if (opened) { cur = id; span++; spanBills = new Set(); }
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
    const bills = billNumbersIn(s);
    // Scope bookkeeping (both modes): a gap past the valve, a heading, a
    // transition or a clear change starts a new idea.
    if (b - lastDebate > gapLimit + 1) newScope();
    if (named.length || bills.length || CLAIM_WORD.test(s)) lastDebate = b;
    if (heads.has(s) || transition || (otherNamed && !named.length) || (!named.length && isIssueChange(s))) newScope();
    if (doc) {
      // DISTINCT NEW MEASURE: a bill number the open span has not named, once it has named one.
      if (cur && bills.length && spanBills.size && !bills.some((x) => spanBills.has(x))) {
        cur = null; newScope();
        if (!named.length) { spanBills = new Set(bills); put({ subject: null, span: null, named: false, change: true, measure: true }); continue; }
      }
      // An explicit transition re-opens even the same subject as a new span.
      if (transition) cur = null;
    }
    let opened = false;
    if (heads.has(s)) {
      // A heading always ends the open span; one naming a single subject opens a new one.
      cur = null;
      if (named.length === 1 && !otherNamed) { opened = open(named[0], i); lastBlock = b; put({ subject: cur, span, named: true }); }
      else { put({ subject: null, span: null, named: false, change: true }); continue; }
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
      if (cur && named.includes(cur) && (!to || to === cur)) { lastBlock = b; put({ subject: cur, span, named: true, subjects }); continue; }
      if (to && to !== "other") { opened = open(to, i); lastBlock = b; put({ subject: cur, span, named: true, subjects }); }
      else { cur = null; put({ subject: null, span: null, named: false, subjects, change: true }); continue; }
    } else if (named.length === 1) {
      opened = open(named[0], i);
      lastBlock = b;
      put({ subject: cur, span, named: true });
      if (doc) for (const x of bills) spanBills.add(x);
    } else if (otherNamed || transition || isIssueChange(s)) {
      cur = null;
      put({ subject: null, span: null, named: false, change: true });
      continue;
    } else if (cur && b - lastBlock <= gapLimit + 1) {
      // A carried sentence with a claim word (or, in a document, a bill number)
      // shows the debate is still going.
      if (CLAIM_WORD.test(s) || (doc && bills.length)) lastBlock = b;
      if (doc) for (const x of bills) spanBills.add(x);
      put({ subject: cur, span, named: false });
      continue;
    } else {
      cur = null;
      put({ subject: null, span: null, named: false });
      continue;
    }
    // BACKWARD: the sentence just before a span opens joins it when it is clearly part of the same claim.
    if (opened && i > 0) {
      const p = out[i - 1], ps = sentences[i - 1];
      if (p.subject === null && !p.change && !p.subjects && !heads.has(ps) && b - blocks[i - 1] <= 1 && p.scope === scopeN &&
          (isFragment(ps) || (CLAIM_WORD.test(ps) && CLAIM_WORD.test(s)))) {
        out[i - 1] = { subject: cur, span, named: false, backward: true, scope: scopeN };
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

// ── PAGE CONTEXT (phase9-v2, R18 b–e) ──────────────────────────────────────
// Title Case / ALL CAPS: most significant words capitalised.
const SMALL_WORDS = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into", "nor", "of", "on", "or", "over", "per", "the", "to", "up", "via", "with", "vs", "&"]);
/**
 * R18(b): is this line a heading rather than a sentence? Title Case or ALL CAPS
 * (at least 3 significant words, at most one of them in lower case, no sentence
 * end), or a short gerund-led line with no sentence end ("Supporting our
 * veterans"). An imperative platform plank ("Cut Taxes for Families", "INVEST
 * IN CLEAN ENERGY", "5) Fast-Track Permits …") states a commitment in the
 * politician's own voice and is NOT a heading.
 */
export function isHeadlineLike(text) {
  const t = String(text || "").replace(/[“”"‘’'«»]/g, "").replace(/^\s*(?:[•·▪●◦*–—-]|\d{1,2}[.)])\s*/, "").trim();
  if (PLANK.test(t)) return false;
  const words = t.split(/\s+/).filter((w) => /^[\p{L}]/u.test(w));
  const sig = words.filter((w) => !SMALL_WORDS.has(w.toLowerCase()) && w.replace(/[^\p{L}]/gu, "").length >= 3);
  if (sig.length >= 3) {
    // Real Title Case leaves at most one significant word in lower case; a
    // sentence full of proper nouns ("As part of National Police Week,
    // Congressman Mackenzie is co-sponsoring …") does not.
    const lower = sig.filter((w) => !/^\p{Lu}/u.test(w)).length;
    if (lower <= 1 && (sig.length - lower) / sig.length >= 0.8 && !/[.!?]["”’)]?$/.test(t)) return true;
    // ALL CAPS is a heading whatever its punctuation.
    if (sig.every((w) => w === w.toUpperCase()) && sig.some((w) => w.length >= 4)) return true;
  }
  return words.length <= 8 && /^[\p{Lu}][\p{Ll}]+ing\b/u.test(t) && !/[.!?]["”’)]?$/.test(t);
}
// An imperative plank: the line opens on a base-form verb of commitment.
const PLANK = /^(?:Cut|Lower|Reduce|Invest|Defend|Protect|Expand|Secure|End|Stop|Ban|Fund|Fully Fund|Support|Fight|Build|Make|Keep|Restore|Repeal|Increase|Raise|Create|Strengthen|Fix|Bring|Hold|Ensure|Guarantee|Give|Back|Pass|Abolish|Eliminate|Reform|Modernize|Improve|Close|Fast-Track|Unleash|Empower|Champion|Preserve|Save|Codify|Legalize|Require|Deport|Finish|Lock|Crack|Rein|Cap|Freeze|Slash|Balance|Audit|Drain|Stand|Uphold|Honor|Deliver|Grow|Boost|Bring Down|Take|Put|Let|Tackle|Combat|Prevent|Block|Oppose|Reject|Overturn|Rescind|Reverse|Limit|Restrict|Halt|Simplify|Streamline|Unlock|Rebuild|Repair|Revitalize|Prioritize|Enforce|Hire|Train|Pay|Allow|Permit|Treat|Provide)\b(?!\s+(?:of|to|is|are|was|were)\b)/i;
const titleCore = (t) => String(t || "").split(/\s+[|»]\s+|\s+[–—-]\s+(?=[^–—-]*$)/)[0].trim();
/** R18(b): is `text` the page's own main headline (title / og:title / h1)? */
export function isMainHeadline(text, titles) {
  const s = String(text || "").trim();
  if (!s) return false;
  return titles.some((t) => { const c = titleCore(t); return t === s || c === s || (c.length >= 12 && (s.startsWith(c) || c.startsWith(s))); });
}

const OWN_SITE_KINDS = new Set(["member_site", "campaign_site", "office_site", "legislature_member_page", "video"]);
// R18(c): the dateline sentence of a release names who acts.
const DATELINE = /^\s*(?:[A-Z][A-Z.,' ]{1,40}?(?:,\s*[A-Z][A-Za-z.]+\.?)?)\s*(?:\([^)]{0,20}\)\s*)?[–—-]{1,2}\s*/;
const DATELINE_VERB = /\b(?:announced|introduced|reintroduced|sent|issued|released|led|lead|joined|urged|wrote|called|said|unveiled|applauded|welcomed|celebrated|praised|condemned|slammed|pressed|demanded|delivered|voted|secured|hosted|spoke|met|marked|filed|pushed|questioned|blasted|criticized|requested|submitted)\b/i;
const MEMBER_TITLE = /\b(?:Senators?|Sens?\.|Representatives?|Reps?\.|Congress(?:wo)?m[ae]n|Congressmembers?|Ranking Members?|Chairm[ae]n|Chairwom[ae]n|Chairs?|Governors?|Gov\.|Leader|Whip|Speaker|Delegates?|Commissioner)\s+(?:[A-Z]\.\s+)?[A-Z][\p{L}'’-]+/u;
/**
 * R18(c): on a joint or committee release, is the page's voice someone else's?
 * → the other member phrase, or null. Yes when the dateline sentence (or, with
 * no dateline, the headline's subject) names a member and does not name the
 * page's politician (full name, surname, first name or own-site alias).
 */
export function otherPageVoice(raw, list) {
  // The politician's own office or campaign site speaks for them.
  let kind = null;
  try { kind = pageOwnership({ link: raw?.final_url || raw?.url, politicianId: raw?.politician_id, sourceType: raw?.source_type }).kind; } catch { kind = null; }
  if (OWN_SITE_KINDS.has(kind)) return null;
  // The site's own name counts only when it is the politician's (a committee
  // site such as foreign.senate.gov is not anyone's name).
  const idParts = String(raw?.politician_id || "").toLowerCase().split("_").map(lettersOnly).filter((x) => x.length >= 4);
  const hostA = hostAlias(raw?.final_url || raw?.url);
  const alias = hostA && idParts.some((x) => hostA.includes(x) || x.includes(hostA)) ? hostA : null;
  const isSelf = (x) => namesSelf(x, raw?.politician_id) || (alias && lettersOnly(x).includes(alias));
  const titles = leadTitles(raw);
  const head = titleCore(titles[0] || "");
  for (const s of list.slice(0, 6)) {
    const d = DATELINE.exec(s);
    if (!d) continue;
    const rest = s.slice(d[0].length);
    const v = DATELINE_VERB.exec(rest);
    const who = v ? rest.slice(0, v.index) : rest.slice(0, 160);
    if (isSelf(who)) return null;
    const m = MEMBER_TITLE.exec(who);
    // A dateline naming another member as the actor, and a headline that does not name the page's politician.
    if (m && !isSelf(head)) return m[0];
    return null;
  }
  // No dateline: the headline's own subject.
  if (!head || isSelf(head)) return null;
  const v = /\s(?:Introduces?|Reintroduces?|Leads?|Urges?|Press(?:es)?|Welcomes?|Sends?|Announces?|Applauds?|Calls?|Demands?|Slams?|Joins?|Unveils?|Statement|Issues?|Releases?|Questions?|Raises?|Writes?|Says|Votes?)\b/.exec(head);
  const m = MEMBER_TITLE.exec(v ? head.slice(0, v.index) : "");
  return m ? m[0] : null;
}

// R18(d): long lists — a bulleted list of LIST_MIN_ITEMS or more items, or a dated timeline.
export const LIST_MIN_ITEMS = 5;
// A provision or achievement line: opens on a third-person or past-tense verb.
const RECORD_ITEM = /^(?:[•·▪●-]\s*)?(?:(?:Increases|Provides|Requires|Establishes|Expands|Creates|Delivers|Extends|Ensures|Directs|Authorizes|Allows|Prohibits|Protects|Reduces|Eliminates|Invests|Funds|Strengthens|Improves|Supports|Bans|Repeals|Restores|Makes|Gives|Lowers|Cuts|Caps|Blocks|Ends|Prevents|Codifies|Reauthorizes|Modernizes|Streamlines|Includes|Secures|Boosts|Raises|Adds|Sets|Updates|Amends|Permits|Limits|Restricts|Halts|Stops|Removes|Clarifies|Promotes|Encourages|Helps|Expedites|Preserves|Maintains|Enhances|Addresses|Combats|Targets|Builds|Invests|Rescinds|Delays|Exempts|Doubles|Triples|Freezes)|(?!(?:United|Need|Speed|Seed|Feed|Red|Shed|Ted|Fred|Ned|Ed|Bed)\b)[A-Z][a-z]+ed|Passed|Won|Led|Brought|Fought|Built|Cut|Signed|Sponsored)\b/;
export const LIST_AGREE_MIN = 2;
const DATED_ITEM = /^(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})\s*[:–—-]/;
/** Sentence text → list id ("ul3", "dated") for lines of a long list. */
export function longListItems(body, list) {
  const out = new Map();
  const html = String(body || "").replace(/<(script|style|noscript|svg|head)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
  let n = 0, m;
  const LISTS = /<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  while ((m = LISTS.exec(html))) {
    n++;
    const items = m[2].split(/<li\b[^>]*>/i).slice(1).map((x) => extractSentences(`<p>${x}</p>`)).filter((x) => x.length);
    if (items.length < LIST_MIN_ITEMS) continue;
    for (const it of items) for (const t of it) if (!out.has(t)) out.set(t, `list${n}`);
  }
  const dated = list.filter((t) => DATED_ITEM.test(t));
  if (dated.length >= 3) for (const t of dated) out.set(t, "dated");
  return out;
}

// R18(e): an outside voices section ("What They Are Saying") runs to the next heading.
const THIRD_SECTION = /^(?:[^\w]*)(?:what (?:they['’]re|they are|people are|others are|leaders are|stakeholders are|advocates are|experts are|groups are|supporters are|[\w ]{2,40}? (?:are|is)) saying|here['’]s what\b[^.]{0,60}\bsaying|(?:statements?|quotes?|voices) (?:of|in) support|(?:outside |stakeholder |industry )?support for the (?:bill|legislation|act|resolution)\s*:?$|(?:organizations|groups) (?:supporting|endorsing) (?:the|this) (?:bill|legislation)\s*:?$)/i;
/** Indexes of sentences inside an outside-voices section. */
export function thirdPartySection(list, body) {
  const heads = headingSentences(body);
  const out = new Set();
  let on = false;
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    // The section opens on a short heading line ("What They Are Saying:").
    if (THIRD_SECTION.test(s) && s.length < 90) { on = true; continue; }
    if (on && heads.has(s)) on = false;
    if (on) out.add(i);
  }
  return out;
}
// R18(e): the politician's words as an outlet reported them.
const OUTLET_REPORT = /\b(?:told|spoke (?:to|with)|said (?:in an interview with|to|on)|in an interview (?:with|on)|wrote in|appeared on|joined)\s+(?:the\s+)?(?:[A-Z][\w'’&.-]*\s*){1,5}(?:on|about|that|regarding|,|\.|$)/;
export const isOutletParaphrase = (s) => OUTLET_REPORT.test(String(s || "")) && !HAS_QUOTE.test(String(s || ""));

/** Does a headline / lead text name the topic (its anchor, mention or context vocabulary)? */
function namesTopic(text, topic) {
  const r = TOPIC_RULES[topic];
  if (!r) return false;
  return crossTopicAnchorIn(text, topic) || !!r.context?.test(text);
}

/** R18 context for one page, computed once per page (scoreAllTopics shares it). */
export function pageContext(raw, list) {
  // A video transcript (R16) has no headlines, lists or sections, and its
  // pipeline is out of scope: none of the page-structure checks apply to it.
  if (isVideoTranscript(raw)) return { titles: [], mainClaim: [], otherVoice: null, lists: new Map(), thirdParty: new Set(), video: true };
  const titles = leadTitles(raw);
  const units = leadUnits(raw, list);
  const lists = longListItems(raw?.body, list);
  return {
    titles,
    // The page's main claim: its title lines and first body sentence (never a list line).
    mainClaim: [...titles.map(titleCore), ...units.filter((u) => !u.title && !lists.has(u.text)).slice(0, 1).map((u) => u.text)],
    otherVoice: otherPageVoice(raw, list),
    lists,
    thirdParty: thirdPartySection(list, raw?.body),
  };
}

const zeroRead = (c, framing, actor = null) => ({ kind: "mention", side: null, reversal: false, actor: actor || c.actor || null, framing });
/**
 * R18 b, c, e: does a clear / implied read of sentence `i` stand on this page?
 * Returns the read (marked `headline` when it is the page's main headline) or a
 * zero-weight mention with the reason in `framing`.
 */
export function readInContext(c, text, i, speakers, ctx, politicianId) {
  if (c.reversal || ctx.video) return c;
  // (c) someone else's quote is theirs.
  if (speakers[i] === "other") return zeroRead(c, "quoted_other", { kind: "other", via: "quoted speaker" });
  // (e) an outside-voices section, an outlet's report of what they said.
  if (ctx.thirdParty.has(i) && speakers[i] !== "self") return zeroRead(c, "third_party_section", { kind: "third", via: "what they are saying" });
  if (isOutletParaphrase(text)) return zeroRead(c, "reported", { kind: "third", via: "outlet report" });
  // (c) another member's release: only the page's politician by name, or their own quote, counts.
  if (ctx.otherVoice && speakers[i] !== "self" && !namesSelf(c.actor?.via, politicianId) && !namesSelf(text, politicianId)) {
    return zeroRead(c, "other_voice", { kind: "other", via: ctx.otherVoice });
  }
  // (b) a heading line counts only as the page's own main headline.
  if (isHeadlineLike(text)) {
    if (!isMainHeadline(text, ctx.titles)) return zeroRead(c, "headline_like");
    return { ...c, headline: true };
  }
  return c;
}

/**
 * Score one raw ingest record → candidate stance. Pure: never mutates `raw`.
 * `topic` defaults to the record's own topic; the cron also scores the same
 * page against every other topic (see scoreAllTopics).
 */
export function scoreRawRecord(raw, topic = raw?.topic, sentences = null, opts = {}) {
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
  const newsRepost = isNewsRepost(raw); // phase9-v1 REPORTED VOICE
  // Subject spans (directional keys only): every span on the topic's subject,
  // wherever it sits on the page, is read for this one candidate.
  const subject = subjectOf(topic);
  // Scope follows the source type (spanScopeFor); `opts.spanScope` overrides it for diagnostics.
  const spanScope = opts.spanScope || spanScopeFor(raw.source_type);
  const spans = subject ? subjectSpans(list, raw.body, { scope: spanScope }) : null;
  // R18 page context: the main headline, another member's voice, long lists, outside voices.
  const ctx = opts.context || pageContext(raw, list);
  for (let i = 0; i < list.length; i++) {
    const text = list[i];
    const sp = spans && spans[i].subject === subject ? spans[i] : null;
    // Israel split keys: a sentence another facet claims is not read here.
    if (sp && facetExcludes(topic, sp.facet)) continue;
    let c = classify(text, topic, raw.politician_id, { claims, inSpan: !!sp, reportedVoice: newsRepost && !HAS_QUOTE.test(text) && !FIRST_PERSON_VOICE.test(text) });
    if (!c.kind) continue;
    if (c.kind !== "mention") c = readInContext(c, text, i, speakers, ctx, raw.politician_id);
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
      ...(c.headline ? { headline: true } : {}),
      ...(ctx.lists.has(text) ? { list_item: ctx.lists.get(text) } : {}),
      ...(c.framing ? { framing: c.framing } : {}),
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
  // R18(d): long lists. A bill's provisions or a record of achievements
  // ("Increases funding for …", "Lowered …", a dated timeline) sets a side only
  // when the page's main claim is about the topic, or LIST_AGREE_MIN lines of
  // the same list agree. A commitment line of a platform list ("Guarantee access
  // to …", "I'll push to …") is read on its own: it counts only for a topic it
  // names itself.
  const mainAbout = ctx.video || ctx.mainClaim.some((t) => namesTopic(t, topic));
  const campaignPage = primarySourceKind(raw.source_type, raw.final_url || raw.url) === "campaign_page";
  const agree = new Map();
  for (const s of statements) if (s.list_item && (s.kind === "clear" || s.kind === "implication")) agree.set(`${s.list_item}|${s.side}`, (agree.get(`${s.list_item}|${s.side}`) || 0) + 1);
  for (const s of statements) {
    if (!s.list_item || (s.kind !== "clear" && s.kind !== "implication") || s.reversal) continue;
    const full = list[s._i] || s.text;
    // On a campaign page a list line is the candidate's own plank ("Supports rent
    // stabilization …"); elsewhere a third-person or past-tense line is a bill's
    // provision or a record of achievements.
    const record = s.list_item === "dated" || (!campaignPage && RECORD_ITEM.test(full));
    const keep = record ? (mainAbout || (agree.get(`${s.list_item}|${s.side}`) || 0) >= LIST_AGREE_MIN) : namesTopic(full, topic) || TOPIC_RULES[topic].mention.test(full);
    if (keep) continue;
    s.kind = "mention"; s.side = null; s.weight = WEIGHTS.zero; s.framing = "list_item";
    delete s.implication; delete s.claim_pattern;
  }
  // R14: no directional signal anywhere on the page → read the title and the
  // lead sentences for a stance verb. Own topic (and linked directional keys)
  // only; a page that already reads a side or mixed is never touched.
  const leadOk = opts.leadSignals !== false && (topic === raw.topic || (raw.topic && linkedKeys(topic, raw.topic)));
  const lead = leadOk && !statements.some((s) => s.kind === "clear" || s.kind === "implication")
    ? leadStance(raw, list, topic, speakers, ctx) : null;
  if (lead) {
    const text = trunc(lead.topicUnit ? `${lead.cue.text} ${lead.topicUnit.text}` : lead.cue.text);
    const st = { kind: "clear", side: lead.side, reversal: false, lead_signal: lead.via, ...(lead.bill ? { lead_bill: true } : {}), ...(lead.via === "title" || isHeadlineLike(lead.cue.text) ? { headline: true } : {}), weight: WEIGHTS[tier] };
    const existing = lead.cue.i != null ? statements.find((s) => s._i === lead.cue.i) : null;
    // The cue sentence's zero-weight mention becomes the clear statement (never counted twice).
    if (existing) {
      for (const k of ["implication", "attributed_to", "attributed_via", "paired_with"]) delete existing[k];
      Object.assign(existing, st, { text });
    } else statements.unshift({ _i: -1, text, ...st });
  }
  // R15: no directional signal anywhere → do the page's own mentions lean one way?
  const leaning = [];
  let leanConflict = false;
  if (opts.impliedMentions !== false && !NO_POLE_TOPICS.has(topic) && !statements.some((s) => s.kind === "clear" || s.kind === "implication")) {
    for (const s of statements) {
      if (s.kind !== "mention" || s._i < 0 || s.attributed_to || s.quoted_speaker === "other") continue;
      const lean = mentionLean(list[s._i], topic, raw.politician_id);
      if (lean === "both") leanConflict = true;
      else if (lean) leaning.push([s, lean]);
    }
    if (new Set(leaning.map(([, l]) => l)).size > 1) leanConflict = true;
  }
  const impliedSide = !leanConflict && leaning.length >= WEIGHTS.impliedMentionsMin ? leaning[0][1] : null;
  if (impliedSide) for (const [s, l] of leaning) s.lean = l;
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
  } else if (!signals && impliedSide) {
    // R15: aligned mentions, nothing contradicting → an implied stance.
    position = impliedSide;
    confidence = WEIGHTS.impliedMentionConfidence;
    const rest = mentions - leaning.length;
    reason = `implied stance: ${leaning.length} aligned mentions imply ${impliedSide}, none contradicting (R15)${rest ? `; ${rest} other mention(s) recorded at zero weight (R3)` : ""}`;
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
    if (lead) parts.push(`stance verb in the ${lead.via === "title" ? "title" : "opening sentences"}${lead.bill ? " acts on a named bill" : ""}${lead.harm ? " the page says harms the issue" : ""} reads as a clear ${lead.side} (R14)`);
    if (mentions) parts.push(`${mentions} mention(s) recorded at zero weight (R3)`);
    reason = parts.join("; ");
  }
  // R16: a clear side in the politician's own words on their own video is the
  // strongest evidence of what they said — the scorer's maximum confidence.
  let ceiling = WEIGHTS.maxConfidence;
  if ((position === "support" || position === "oppose") && isVideoTranscript(raw)) {
    const other = position === "support" ? "oppose" : "support";
    const spoken = clear.filter((s) => s.side === position && s.quoted_speaker !== "other" && s.lead_signal !== "title");
    const uncontested = (reversal && reversal.side === position) || !(n[other] + ni[other]);
    if (spoken.length && uncontested) {
      confidence = ceiling = WEIGHTS.videoTranscriptConfidence;
      reason += `; ${spoken.length} clear statement(s) in the politician's own words on video read at the maximum confidence (R16)`;
    }
  }
  const stated = statedOk(position);

  const firstClear = clear.find((s) => s.side === position) || clear[0]
    || implied.find((s) => s.side === position) || implied[0]
    || (impliedSide ? leaning[0][0] : null);
  return {
    politician_id: raw.politician_id,
    topic,
    position,
    confidence: round2(clamp(confidence, ceiling)),
    confidence_reason: reason,
    sources: [{
      type: raw.source_type,
      date: String(raw.fetched_at).slice(0, 10),
      link: raw.url,
      excerpt: firstClear ? firstClear.text : (statements[0]?.text ?? null),
      ...(firstClear?.headline ? { excerpt_kind: "headline" } : {}),
      note: `${clear.length} clear statement(s) (${n.support} support, ${n.oppose} oppose), ${implied.length} implication(s) (${ni.support} support, ${ni.oppose} oppose), ${mentions} mention(s) at zero weight`,
      weight_tier: tier,
      takes_clear_position: clear.length > 0,
      implication_count: implied.length,
      ...(impliedSide ? { aligned_mentions: leaning.length } : {}),
      statements,
    }],
    // R8: the stated layer only. A stated position is what the candidate said
    // on a primary source; it is never a formal record or completed action.
    ...(stated ? { stated_position: true, primary_kind: rule.kind } : {}),
    ...(subject ? { subject: subjectSummary(subject, spans, statements) } : {}),
    ...(impliedSide ? { implied_stance: true } : {}),
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
 *   · R13: another topic only when an explicit own statement names it directly
 *     (crossTopicAnchored); implication-only cross-topic reads are dropped.
 */
export function scoreAllTopics(raw, { topics = SCORED_TOPICS, maxCrossSentences = CROSS_TOPIC_MAX_SENTENCES } = {}) {
  const out = [];
  const sentences = extractSentences(raw?.body);
  const context = pageContext(raw, sentences);
  if (hasRulesFor(raw?.topic)) out.push(scoreRawRecord(raw, raw.topic, sentences, { context }));
  // The page's own topic reads every sentence, as before; the other topics read
  // the first CROSS_TOPIC_MAX_SENTENCES so a runaway page cannot stretch a run.
  const cross = sentences.length > maxCrossSentences ? sentences.slice(0, maxCrossSentences) : sentences;
  // Stored statement text is truncated; R13 reads the full sentence behind it.
  const full = new Map(cross.map((s) => [trunc(s), s]));
  const extra = [];
  for (const t of topics) {
    if (t === raw?.topic || !hasRulesFor(t) || NO_POLE_TOPICS.has(t)) continue;
    const c = scoreRawRecord(raw, t, cross, { context });
    if (directionalSignals(c) > 0 && crossTopicAnchored(c, raw?.topic, full) && crossTopicAddressed(c, raw?.topic, full, sentences.length)) extra.push(c);
  }
  return [...out, ...collapseRestatements(out, extra)];
}

// ── R13: cross-topic anchor ─────────────────────────────────────────────────
// Keys whose vocabulary bundles a neighbouring issue: on a page filed under
// another topic, only the key's own name anchors it.
export const CROSS_TOPIC_ANCHORS = {
  social_security: /\bsocial security\b|\bretirement age\b|\bearned (?:retirement )?benefits\b/i,
  // phase9-v2: "secure borders" on an immigration page is border security, not mass deportation.
  deportations: /\bdeport\w*|\bremovals?\b|\billegal aliens\b|\bcriminal aliens\b/i,
};
// Uses of a topic's words that are not about the topic itself.
const CROSS_TOPIC_NOISE = {
  social_security: /\bsocial security (?:numbers?|nos?\.|cards?|#)/gi,
};
const globalRe = (re) => new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");

/**
 * R13: does `sentence` name `topic` directly? A key with a CROSS_TOPIC_ANCHORS
 * entry is named only by that pattern; any other key by its own mention
 * vocabulary. Non-topic uses ("Social Security numbers") are blanked first.
 */
export function crossTopicAnchorIn(sentence, topic) {
  const r = TOPIC_RULES[topic];
  if (!r) return false;
  let s = String(sentence || "");
  if (CROSS_TOPIC_NOISE[topic]) s = s.replace(CROSS_TOPIC_NOISE[topic], " ");
  return (CROSS_TOPIC_ANCHORS[topic] || r.mention).test(s);
}

/**
 * R13: may this cross-topic candidate stand? Yes when its topic is the page's
 * topic or a linked directional key, or when at least one explicit statement by
 * the page's own politician, on the candidate's side, names the topic directly
 * (or sits in a subject span on it).
 * `full` maps stored (truncated) statement text → the full sentence.
 */
export function crossTopicAnchored(c, pageTopic, full = new Map()) {
  if (!c || c.topic === pageTopic || (pageTopic && linkedKeys(c.topic, pageTopic))) return true;
  const sided = c.position === "support" || c.position === "oppose";
  return (c.sources?.[0]?.statements || []).some((s) =>
    s.kind === "clear" && !s.attributed_to && s.quoted_speaker !== "other" &&
    (!sided || s.side === c.position) &&
    // A subject span (directional keys) is a part of the page about the topic.
    (s.subject_span != null || crossTopicAnchorIn(full.get(s.text) ?? s.text, c.topic)));
}

/**
 * R17 (phase9-v1): a page ADDRESSES another topic only when at least
 * CROSS_TOPIC_MIN_SENTENCES of its sentences name that topic directly (by the
 * key's anchor or mention vocabulary). One passing sentence on a page about
 * something else — a child-care tax line on a cost-of-living page read as
 * "medical freedom", "peace in Israel and Palestine" on a foreign-policy page —
 * is not a finding about that topic. The page's own topic and linked directional
 * keys are exempt, as in R13.
 */
export const CROSS_TOPIC_MIN_SENTENCES = 2;
// A short page (a platform card, a one-screen issue page) is all claims: every
// line on it is something the page addresses.
export const CROSS_TOPIC_SHORT_PAGE = 8;
export function crossTopicAddressed(c, pageTopic, full = new Map(), pageSentences = Infinity) {
  if (!c || c.topic === pageTopic || (pageTopic && linkedKeys(c.topic, pageTopic))) return true;
  if (pageSentences <= CROSS_TOPIC_SHORT_PAGE) return true;
  const st = c.sources?.[0]?.statements || [];
  const named = st.filter((s) => s.subject_span != null || crossTopicAnchorIn(full.get(s.text) ?? s.text, c.topic));
  const directional = st.filter((s) => (s.kind === "clear" || s.kind === "implication") && !s.attributed_to);
  return named.length >= CROSS_TOPIC_MIN_SENTENCES || directional.length >= CROSS_TOPIC_MIN_SENTENCES;
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
