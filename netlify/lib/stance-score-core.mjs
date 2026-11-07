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
//
// Calibration: the ground truth (0.85) rests on first-party campaign pages
// with several explicit commitments, so a medium-tier base of 0.70 plus the
// R4 corroboration bonus of 0.15 reproduces it. These numbers live in WEIGHTS
// so a later tweak is one edit, and the comparison log prints the exact delta.

export const RULES_VERSION = "phase4-v1";

export const WEIGHTS = {
  high: 1.0,              // R2
  medium: 0.5,            // R1
  zero: 0,                // R3
  baseConfidence: { high: 0.8, medium: 0.7 },
  corroborationMin: 3,    // R4: this many consistent clear statements…
  corroborationBonus: 0.15, // …add this much
  outlierPenalty: 0.1,    // R5: per opposite-side clear statement
  maxConfidence: 0.95,
  mentionOnlyConfidence: 0.3, // "no clear position" when only mentions exist
};

export const CONFIDENCE_TOLERANCE = 0.1;

const HIGH_TYPES = /\b(speech|press release|statement|remarks|interview|transcript)\b/i;
const MEDIUM_TYPES = /\b(campaign|issue page|platform|toolkit)\b/i;

// Topic vocabulary. R1–R5 and WEIGHTS are shared by every topic; a topic only
// supplies what counts as a mention and what counts as a clear statement.
//   cost_living       — Phase 4, calibrated against the Talarico ground truth.
//   healthcare_costs  — Phase 5, the second topic. Same shape; a clear statement
//                       must also be ABOUT health care (`context`), so "lower
//                       grocery costs" on a mixed page never counts here.
export const TOPIC_RULES = {
  cost_living: {
    mention: /\b(cost[- ]of[- ]living|expensive|afford\w*|prices?|rent|groceries|grocery|utilit(y|ies)|gas|diesel|childcare|insulin|housing|tax(es)?|tax cut|interest rates?|wages?|pay)\b/i,
    // A commitment to bring costs/taxes down for people. Candidate-voiced only (see THIRD_PARTY).
    support: /\b(lower(ing)?|cut(ting)?|bring(ing)? down|cap(ped|ping|s)?|reduc(e|es|ed|ing)|suspend(ing)?)\b[^.!?]{0,80}?\b(costs?|prices?|tax(es)?|rent|groceries|interest rates?|bills?)\b|\bcost[- ]of[- ]living tax cut\b/i,
    // Explicitly against measures that lower costs.
    oppose: /\b(I|we)\s+(?:now\s+|still\s+|strongly\s+)?(oppose|reject|will vote against|won'?t support)\b[^.!?]{0,80}\b(tax cuts?|caps?|relief|lower(ing)? (costs|prices)|minimum wage)\b|\b(raise|raising|increase|increasing) (taxes|prices|rent) on (working|middle)/i,
  },
  healthcare_costs: {
    mention: /\b(health ?care|health insurance|insurance premiums?|premiums?|prescriptions?|drugs?|insulin|medicaid|medicare|co-?pays?|deductibles?|hospitals?|pharma\w*|medical (debt|bills?|costs?))\b/i,
    context: /\b(health|medical|medicaid|medicare|insurance|premiums?|prescriptions?|drugs?|insulin|co-?pays?|deductibles?|hospitals?|pharma\w*|patients?)\b/i,
    support: /\b(lower(ing)?|cut(ting)?|bring(ing)? down|cap(ped|ping|s)?|reduc(e|es|ed|ing)|drive down)\b[^.!?]{0,80}?\b(costs?|prices?|premiums?|co-?pays?|deductibles?|insulin|out-of-pocket|bills?|debt)\b/i,
    oppose: /\b(I|we)\s+(?:now\s+|still\s+|strongly\s+)?(oppose|reject|will vote against|won'?t support)\b[^.!?]{0,80}\b(price caps?|caps?|drug price negotiation|lower(ing)? (costs|prices|premiums))\b/i,
  },
};

// Sentences where the actor is an opponent/third party describe THEIR record,
// not the candidate's position → treated as mentions (R3), never as clear statements.
const THIRD_PARTY = /\b(they|they're|DC politicians|politicians like|Republicans|Paxton|Cornyn|Trump)\b|\bpromised to\b/i;
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

/** Classify one sentence → { kind: 'clear'|'mention'|null, side, reversal }. */
export function classify(sentence, topic) {
  const r = TOPIC_RULES[topic];
  if (!r) throw new Error(`no scoring rules for topic ${topic}`);
  const reversal = REVERSAL.test(sentence);
  const inContext = !r.context || r.context.test(sentence);
  const sup = inContext && r.support.test(sentence);
  const opp = inContext && r.oppose.test(sentence);
  if ((sup || opp) && !(sup && opp) && (!THIRD_PARTY.test(sentence) || reversal)) {
    return { kind: "clear", side: sup ? "support" : "oppose", reversal };
  }
  if (sup || opp || r.mention.test(sentence)) return { kind: "mention", side: null, reversal: false };
  return { kind: null, side: null, reversal: false };
}

const round2 = (n) => Math.round(n * 100) / 100;
const clamp = (n) => Math.max(0, Math.min(WEIGHTS.maxConfidence, n));

/** Score one raw ingest record → candidate stance. Pure: never mutates `raw`. */
export function scoreRawRecord(raw) {
  for (const k of ["url", "fetched_at", "source_type", "politician_id", "topic", "body"]) {
    if (!(k in (raw || {}))) throw new Error(`raw record missing ${k}`);
  }
  const tier = tierFor(raw.source_type);
  const statements = [];
  for (const text of extractSentences(raw.body)) {
    const c = classify(text, raw.topic);
    if (!c.kind) continue;
    statements.push({
      text: text.length > 300 ? text.slice(0, 297) + "…" : text,
      kind: c.kind,
      side: c.side,
      reversal: c.reversal,
      weight: c.kind === "clear" ? WEIGHTS[tier] : WEIGHTS.zero,
    });
  }
  const clear = statements.filter((s) => s.kind === "clear");
  const mentions = statements.length - clear.length;
  const w = { support: 0, oppose: 0 };
  const n = { support: 0, oppose: 0 };
  for (const s of clear) { w[s.side] += s.weight; n[s.side] += 1; }

  let position, confidence, reason;
  const reversal = clear.filter((s) => s.reversal).at(-1);
  if (reversal) {
    position = reversal.side;
    confidence = WEIGHTS.baseConfidence[tier];
    reason = `explicit reversal language sets the position to ${position} (R5); earlier statements not counted as corroboration`;
  } else if (!clear.length) {
    position = "no clear position";
    confidence = mentions ? WEIGHTS.mentionOnlyConfidence : 0;
    reason = mentions ? `${mentions} topic mention(s), none states a clear position (R3)` : "topic not found in source";
  } else if (w.support === w.oppose) {
    position = "mixed";
    confidence = 0.5;
    reason = `equal weight of clear statements on both sides (${n.support} vs ${n.oppose})`;
  } else {
    position = w.support > w.oppose ? "support" : "oppose";
    const other = position === "support" ? "oppose" : "support";
    const consistent = n[position];
    confidence = WEIGHTS.baseConfidence[tier];
    const parts = [`${consistent} clear ${tier}-weight statement(s) for ${position}`];
    if (consistent >= WEIGHTS.corroborationMin) {
      confidence += WEIGHTS.corroborationBonus;
      parts.push(`≥${WEIGHTS.corroborationMin} consistent raise confidence (R4)`);
    }
    if (n[other]) {
      if (n[other] >= consistent) { position = "mixed"; confidence = 0.5; }
      else confidence -= WEIGHTS.outlierPenalty * n[other];
      parts.push(`${n[other]} outlier(s) without reversal language lower confidence, do not flip (R5)`);
    }
    if (mentions) parts.push(`${mentions} mention(s) recorded at zero weight (R3)`);
    reason = parts.join("; ");
  }

  const firstClear = clear.find((s) => s.side === position) || clear[0];
  return {
    politician_id: raw.politician_id,
    topic: raw.topic,
    position,
    confidence: round2(clamp(confidence)),
    confidence_reason: reason,
    sources: [{
      type: raw.source_type,
      date: String(raw.fetched_at).slice(0, 10),
      link: raw.url,
      excerpt: firstClear ? firstClear.text : (statements[0]?.text ?? null),
      note: `${clear.length} clear statement(s) (${n.support} support, ${n.oppose} oppose), ${mentions} mention(s) at zero weight`,
      weight_tier: tier,
      takes_clear_position: clear.length > 0,
      statements,
    }],
    rules_version: RULES_VERSION,
    raw_fetched_at: raw.fetched_at,
  };
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
