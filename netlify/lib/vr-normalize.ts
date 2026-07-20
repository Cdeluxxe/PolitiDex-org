// ─────────────────────────────────────────────────────────────────────────────
// Voting Record — pure normalization & classification helpers · Phase 7
// ─────────────────────────────────────────────────────────────────────────────
// The dependency-free core of the ingest: it maps a raw Congress.gov vote object
// into the canonical RawVote shape, canonicalizes measure numbers, derives the
// originating chamber, computes party-crossover flags, and runs the conservative
// keyword issue-suggester. It imports NO database or Blobs client, so it is safe to
// unit-test in isolation (see scripts/test-vr-normalize.mjs). netlify/lib/vr-ingest.ts
// re-exports the public members so existing importers are unaffected.

import issueKeyData from "../../db/issue-keys.json" with { type: "json" };

export const ISSUE_KEYS = new Set<string>((issueKeyData as { keys: string[] }).keys);
export const ISSUE_KEYWORDS = (issueKeyData as { keywords?: Record<string, string[]> }).keywords || {};

// ── Types ────────────────────────────────────────────────────────────────────
export type RawMemberVote = {
  bioguideId?: string;
  name?: string;
  state?: string;
  party?: string; // 'R' | 'D' | 'I' | …
  position: string; // yea | nay | present | not_voting (already normalized)
};

export type RawVote = {
  chamber: string; // house | senate
  congress: number;
  session: number;
  rollNumber: number;
  voteDate: string; // ISO
  question: string | null;
  actionType: string; // passage | amendment | cloture | motion | …
  result: string | null;
  requiredMajority?: string;
  totals?: Record<string, number>;
  sourceUrl: string; // roll-call source (required — skipped if missing)
  sourceLabel?: string;
  measure: {
    measureType: string; // bill | resolution | amendment | nomination
    number: string | null;
    title: string;
    congress: number;
    chamber: string;
    sourceUrl: string; // measure source (Congress.gov) — required
    sourceLabel?: string;
    externalIds?: Record<string, string>;
  };
  memberVotes: RawMemberVote[];
};

// Map one Congress.gov vote object into a RawVote. Defensive: returns null when
// the shape is unrecognisable or a required source is missing (verifiability).
export function normalizeCongressVote(v: any): RawVote | null {
  if (!v || typeof v !== "object") return null;
  const chamber = String(v.chamber || v.chamberCode || "").toLowerCase();
  if (chamber !== "house" && chamber !== "senate") return null;
  const rollNumber = Number(v.rollCallNumber ?? v.rollNumber ?? v.number);
  const congress = Number(v.congress);
  const session = Number(v.sessionNumber ?? v.session ?? 1);
  if (!Number.isFinite(rollNumber) || !Number.isFinite(congress)) return null;
  const voteDate = v.startDate || v.date || v.updateDate;
  if (!voteDate) return null;
  const sourceUrl = v.url || v.sourceUrl;
  if (!sourceUrl) return null;

  const rawMembers: any[] = v.members || v.votePositions || v.positions || [];
  const memberVotes: RawMemberVote[] = rawMembers.map((m: any) => ({
    bioguideId: m.bioguideId || m.bioguideID || m.memberId,
    name: m.name || m.fullName,
    state: m.state,
    party: m.party || m.partyCode,
    position: normalizePosition(m.votePosition || m.position || m.vote),
  })).filter((m) => !!m.position);

  const mm = v.legislation || v.bill || v.measure || {};
  const measureType = String(mm.type || v.legislationType || "bill").toLowerCase();
  const rawNumber = mm.number != null ? `${mm.type || ""}${mm.number}` : (v.legislationNumber || null);
  return {
    chamber,
    congress,
    session,
    rollNumber,
    voteDate: new Date(voteDate).toISOString(),
    question: v.voteQuestion || v.question || null,
    actionType: mapActionType(v.voteType || v.question || ""),
    result: v.result || v.voteResult || null,
    requiredMajority: v.requiredMajority || "simple",
    totals: normalizeTotals(v.voteTotals || v.totals),
    sourceUrl,
    sourceLabel: chamber === "house" ? "U.S. House Clerk" : "U.S. Senate",
    measure: {
      measureType: ["bill", "resolution", "amendment", "nomination"].includes(measureType) ? measureType : "bill",
      number: canonicalMeasureNumber(rawNumber),
      title: mm.title || v.legislationTitle || v.voteQuestion || `Roll call ${rollNumber}`,
      congress,
      // Originating chamber (from the bill-type prefix), NOT the voting chamber, so a
      // bill voted in both chambers resolves to ONE measure row. H.R.* → house, S.* →
      // senate; falls back to the voting chamber when the prefix is unknown.
      chamber: originatingChamber(mm.type, chamber),
      sourceUrl: mm.url || `https://www.congress.gov/roll-call-vote/${congress}/${chamber}/${rollNumber}`,
      sourceLabel: "Congress.gov",
      externalIds: mm.congressGovId ? { congressGovId: String(mm.congressGovId) } : {},
    },
    memberVotes,
  };
}

export function normalizePosition(p: any): string {
  const s = String(p || "").toLowerCase().trim();
  if (s === "yea" || s === "yes" || s === "aye") return "yea";
  if (s === "nay" || s === "no") return "nay";
  if (s === "present") return "present";
  if (s.indexOf("not") !== -1 || s === "") return "not_voting";
  return "";
}

export function mapActionType(q: string): string {
  const s = String(q || "").toLowerCase();
  if (s.indexOf("amendment") !== -1) return "amendment";
  if (s.indexOf("cloture") !== -1) return "cloture";
  if (s.indexOf("passage") !== -1 || s.indexOf("concur") !== -1) return "passage";
  if (s.indexOf("nomination") !== -1) return "nomination";
  if (s.indexOf("veto") !== -1) return "veto_override";
  if (s.indexOf("motion") !== -1 || s.indexOf("recommit") !== -1 || s.indexOf("quorum") !== -1) return "motion";
  return "passage";
}

export function normalizeTotals(t: any): Record<string, number> {
  if (!t || typeof t !== "object") return {};
  return {
    yea: Number(t.yea ?? t.yeas ?? t.yes ?? 0) || 0,
    nay: Number(t.nay ?? t.nays ?? t.no ?? 0) || 0,
    present: Number(t.present ?? 0) || 0,
    notVoting: Number(t.notVoting ?? t.not_voting ?? t.notvoting ?? 0) || 0,
  };
}

// ── Measure-number canonicalization ──────────────────────────────────────────
// Congress.gov emits a bill type code ("HR") + number ("1"); the human/legal
// citation — and the form the curated seed migration stores — is "H.R. 1". Both
// resolve here so ingest matches the seed instead of creating a duplicate measure.
// Accepts "HR 1", "H.R.1", "hr1", "H.R. 1" or a code+number concatenation.
const NUMBER_PREFIX: Record<string, string> = {
  hr: "H.R.", s: "S.",
  hres: "H.Res.", sres: "S.Res.",
  hjres: "H.J.Res.", sjres: "S.J.Res.",
  hconres: "H.Con.Res.", sconres: "S.Con.Res.",
  hamdt: "H.Amdt.", samdt: "S.Amdt.", suamdt: "S.Amdt.",
};

export function canonicalMeasureNumber(input: string | null | undefined): string | null {
  if (input == null) return null;
  const compact = String(input).toLowerCase().replace(/[.\s]/g, ""); // "h.r. 1" → "hr1"
  const m = compact.match(/^([a-z]+)(\d+)$/);
  if (!m) {
    const trimmed = String(input).trim();
    return trimmed || null;
  }
  const prefix = NUMBER_PREFIX[m[1]];
  if (!prefix) {
    const trimmed = String(input).trim();
    return trimmed || null;
  }
  return `${prefix} ${m[2]}`;
}

// House-originated types (H.*) → "house"; Senate-originated (S.*) → "senate".
export function originatingChamber(typeCode: any, fallback: string): string {
  const c = String(typeCode || "").toLowerCase();
  if (c.startsWith("h")) return "house";
  if (c.startsWith("s")) return "senate";
  return fallback;
}

// Compute each member's party-crossover flag from the majority party position.
export function crossoverFlags(memberVotes: RawMemberVote[]): Map<RawMemberVote, string | null> {
  const flags = new Map<RawMemberVote, string | null>();
  const byParty: Record<string, Record<string, number>> = {};
  memberVotes.forEach((m) => {
    if (!m.party || (m.position !== "yea" && m.position !== "nay")) return;
    (byParty[m.party] = byParty[m.party] || {})[m.position] = ((byParty[m.party] || {})[m.position] || 0) + 1;
  });
  const majority: Record<string, string> = {};
  Object.keys(byParty).forEach((p) => {
    majority[p] = (byParty[p].yea || 0) >= (byParty[p].nay || 0) ? "yea" : "nay";
  });
  memberVotes.forEach((m) => {
    if (!m.party || (m.position !== "yea" && m.position !== "nay") || !majority[m.party]) {
      flags.set(m, null);
    } else {
      flags.set(m, m.position === majority[m.party] ? "with_party" : "against_party");
    }
  });
  return flags;
}

// ── Legislative actions (the "how it moved" timeline) ────────────────────────
// A milestone step on a measure's path, normalized from a Congress.gov bill-actions
// row into the vr_measure_actions shape. Purely factual: date, stage, chamber, a
// plain-language line, and a citable source. Fed by fetchMeasureActions() in
// vr-ingest.ts; this module stays dependency-free so the mapping is unit-testable.
export type RawAction = {
  stage: string;
  chamber: string | null;
  actionDate: string | null; // ISO or null
  text: string;
  sourceUrl: string;
  sourceLabel?: string;
};

// Canonical timeline stages, in the order a bill travels. Used to order and de-dupe.
export const ACTION_STAGE_ORDER: Record<string, number> = {
  introduced: 10,
  referred_committee: 15,
  reported_committee: 20,
  passed_house: 30,
  passed_senate: 40,
  resolving_differences: 50,
  to_president: 60,
  enacted: 70,
  vetoed: 71,
  veto_overridden: 72,
  failed: 80,
  other: 90,
};

// Which chamber does this Congress.gov action belong to? Prefers the explicit
// sourceSystem code (1/2 = House, 3 = Senate) and falls back to the action text.
export function chamberFromCongressAction(action: any): string | null {
  const code = Number(action?.sourceSystem?.code);
  if (code === 1 || code === 2) return "house";
  if (code === 3) return "senate";
  const t = String(action?.text || "").toLowerCase();
  if (t.includes("house")) return "house";
  if (t.includes("senate")) return "senate";
  return null;
}

// Map one Congress.gov action to one of our milestone stages, or null to DROP it
// (we keep only the milestones a timeline should show, never every procedural line).
// Conservative and text-driven so an unexpected shape simply yields no milestone.
export function mapCongressActionToStage(action: any): string | null {
  const t = String(action?.text || "").toLowerCase();
  const type = String(action?.type || "").toLowerCase();
  if (!t) return null;
  if (t.includes("became public law") || t.includes("signed by president")) return "enacted";
  if (t.includes("passed over president") || t.includes("veto overridden")) return "veto_overridden";
  if (t.includes("vetoed by president")) return "vetoed";
  if (t.includes("presented to president")) return "to_president";
  if (t.includes("resolving differences") || (t.includes("agreed to") && t.includes("amendment") && (t.includes("house") || t.includes("senate")) && !t.includes("passed"))) return "resolving_differences";
  if (t.includes("passed/agreed to in house") || t.includes("passed house") || (t.includes("on passage") && t.includes("house") && t.includes("passed"))) return "passed_house";
  if (t.includes("passed/agreed to in senate") || t.includes("passed senate") || (t.includes("on passage") && t.includes("senate") && t.includes("passed"))) return "passed_senate";
  if (t.includes("failed of passage") || t.includes("failed to pass") || t.includes("motion to proceed") && t.includes("rejected")) return "failed";
  if (t.includes("reported by") || t.includes("ordered to be reported") || t.includes("reported (") ) return "reported_committee";
  if (type === "introreferral" || t.startsWith("introduced") || t.includes("introduced in")) return "introduced";
  if (t.includes("referred to") && type === "committee") return "referred_committee";
  return null; // not a milestone — dropped
}

// Normalize a Congress.gov `actions` array into an ordered, de-duplicated set of
// milestone RawActions. One row per stage (the earliest dated occurrence wins for a
// stage that repeats, e.g. multiple "referred" lines). Every row carries a source:
// the individual action rarely has its own URL, so `fallbackSourceUrl` (the bill's
// all-actions page) is used, which is always citable.
export function normalizeCongressActions(
  rawActions: any[],
  opts: { fallbackSourceUrl: string; sourceLabel?: string }
): RawAction[] {
  if (!Array.isArray(rawActions) || !opts?.fallbackSourceUrl) return [];
  const byStage = new Map<string, RawAction>();
  for (const a of rawActions) {
    const stage = mapCongressActionToStage(a);
    if (!stage) continue;
    const dateRaw = a?.actionDate || a?.date || null;
    let actionDate: string | null = null;
    if (dateRaw) {
      const d = new Date(dateRaw);
      if (!Number.isNaN(d.getTime())) actionDate = d.toISOString();
    }
    const row: RawAction = {
      stage,
      chamber: chamberFromCongressAction(a),
      actionDate,
      text: String(a?.text || "").slice(0, 500),
      sourceUrl: opts.fallbackSourceUrl,
      sourceLabel: opts.sourceLabel || "Congress.gov",
    };
    const prev = byStage.get(stage);
    // Keep the earliest dated occurrence of a stage (a stage is a first-crossing).
    if (!prev) { byStage.set(stage, row); continue; }
    const pt = prev.actionDate ? new Date(prev.actionDate).getTime() : Infinity;
    const nt = row.actionDate ? new Date(row.actionDate).getTime() : Infinity;
    if (nt < pt) byStage.set(stage, row);
  }
  return [...byStage.values()].sort(
    (x, y) => (ACTION_STAGE_ORDER[x.stage] ?? 99) - (ACTION_STAGE_ORDER[y.stage] ?? 99)
  );
}

// Split a canonical measure number ("H.R. 25", "S. 1582", "H.J.Res. 25") into the
// Congress.gov bill-type slug and numeric part, or null when it isn't a bill/
// resolution/amendment number (e.g. a nomination label like "Patel — FBI").
const NUMBER_TO_SLUG: Record<string, string> = {
  "h.r.": "hr", "s.": "s",
  "h.res.": "hres", "s.res.": "sres",
  "h.j.res.": "hjres", "s.j.res.": "sjres",
  "h.con.res.": "hconres", "s.con.res.": "sconres",
  "h.amdt.": "hamdt", "s.amdt.": "samdt",
};
export function splitMeasureNumber(canonical: string | null | undefined): { billType: string; num: string } | null {
  if (!canonical) return null;
  const m = String(canonical).trim().match(/^([A-Za-z.]+)\s*(\d+)$/);
  if (!m) return null;
  const slug = NUMBER_TO_SLUG[m[1].toLowerCase()];
  if (!slug) return null;
  return { billType: slug, num: m[2] };
}

// Conservative keyword classifier: suggest ONE issue for a measure when exactly one
// issue's keywords clearly match its title. Callers mark the row as auto-suggested
// and never let it overwrite a curated mapping.
export function suggestIssue(title: string): string | null {
  const t = String(title || "").toLowerCase();
  if (!t) return null;
  const hits: string[] = [];
  for (const key of Object.keys(ISSUE_KEYWORDS)) {
    const kws = ISSUE_KEYWORDS[key] || [];
    if (kws.some((kw) => kw && t.indexOf(String(kw).toLowerCase()) !== -1)) hits.push(key);
  }
  return hits.length === 1 && ISSUE_KEYS.has(hits[0]) ? hits[0] : null;
}
