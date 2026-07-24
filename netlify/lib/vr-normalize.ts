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
export function normalizeCongressVote(v: any, chamberHint?: string): RawVote | null {
  if (!v || typeof v !== "object") return null;
  // The live Congress.gov {chamber}-vote list items carry NO chamber field (it is
  // implied by the endpoint), so accept an explicit hint from the fetcher. A chamber
  // present on the object still wins; the hint is the fallback.
  const chamber = String(v.chamber || v.chamberCode || chamberHint || "").toLowerCase();
  if (chamber !== "house" && chamber !== "senate") return null;
  const rollNumber = Number(v.rollCallNumber ?? v.rollNumber ?? v.number);
  const congress = Number(v.congress);
  const session = Number(v.sessionNumber ?? v.session ?? 1);
  if (!Number.isFinite(rollNumber) || !Number.isFinite(congress)) return null;
  const voteDate = v.startDate || v.date || v.updateDate;
  if (!voteDate) return null;
  const sourceUrl = v.url || v.sourceUrl;
  if (!sourceUrl) return null;

  // Member positions: the live sub-resource uses bioguideID / voteCast / voteParty /
  // voteState with a split first/last name; older/shaped feeds use members[].position.
  const rawMembers: any[] = v.members || v.votePositions || v.positions || [];
  const memberVotes: RawMemberVote[] = rawMembers.map((m: any) => ({
    bioguideId: m.bioguideId || m.bioguideID || m.memberId,
    name: m.name || m.fullName || [m.firstName, m.lastName].filter(Boolean).join(" ") || undefined,
    state: m.state || m.voteState,
    party: m.party || m.partyCode || m.voteParty,
    position: normalizePosition(m.votePosition || m.position || m.vote || m.voteCast),
  })).filter((m) => !!m.position);

  const mm = v.legislation || v.bill || v.measure || {};
  const legisType = mm.type || v.legislationType || "";
  // An AMENDMENT vote's subject is the amendment, not its parent bill. The live feed
  // reports both (legislationType/Number = "HR"/"3838", amendmentType/Number =
  // "HAMDT"/"85"), so when an amendment number is present it wins: the amendment gets
  // its own measure row and can carry its own issue mapping, instead of inheriting the
  // parent bill's. Without this every NDAA amendment collapses onto the NDAA itself.
  const amdtNumber = v.amendmentNumber ?? mm.amendmentNumber ?? null;
  const amdtType = v.amendmentType || mm.amendmentType || "";
  const isAmendment = amdtNumber != null && String(amdtNumber) !== "";
  // The live list item splits the citation into legislationType ("HR") + legislation
  // Number ("3424"); combine them so canonicalMeasureNumber yields "H.R. 3424" and the
  // measure matches the curated seed instead of creating a bare-number duplicate.
  const rawNumber = isAmendment
    ? `${amdtType}${amdtNumber}`
    : (mm.number != null
      ? `${mm.type || ""}${mm.number}`
      : (v.legislationNumber != null ? `${v.legislationType || ""}${v.legislationNumber}` : null));
  const measureType = isAmendment ? "amendment" : measureTypeFor(legisType);
  return {
    chamber,
    congress,
    session,
    rollNumber,
    voteDate: new Date(voteDate).toISOString(),
    question: v.voteQuestion || v.question || null,
    // Classify from the QUESTION ("On Motion to Recommit"), not voteType — voteType is
    // the ballot mechanism ("Yea-and-Nay" / "Recorded Vote") and matches no keyword, so
    // reading it made EVERY House roll call fall through to "passage".
    actionType: mapActionType(v.voteQuestion || v.question || v.voteType || ""),
    result: v.result || v.voteResult || null,
    requiredMajority: v.requiredMajority || "simple",
    totals: normalizeTotals(v.voteTotals || v.totals),
    sourceUrl,
    sourceLabel: chamber === "house" ? "U.S. House Clerk" : "U.S. Senate",
    measure: {
      measureType,
      number: canonicalMeasureNumber(rawNumber),
      // The vote endpoints carry NO measure title. Fall back to the legal citation
      // ("H.R. 4758") rather than the vote question ("On Passage") or a bare "Roll call
      // 78" — the citation is a true, stable label for the measure, while the other two
      // describe the roll call and read as nonsense in a measure list. upsertMeasure
      // treats these fallbacks as provisional and lets a real title replace them.
      title: mm.title || v.legislationTitle || canonicalMeasureNumber(rawNumber) ||
        v.voteQuestion || `Roll call ${rollNumber}`,
      congress,
      // Originating chamber (from the bill-type prefix), NOT the voting chamber, so a
      // bill voted in both chambers resolves to ONE measure row. H.R.* → house, S.* →
      // senate; falls back to the voting chamber when the prefix is unknown.
      chamber: originatingChamber(isAmendment ? amdtType || legisType : legisType, chamber),
      sourceUrl: canonicalCongressGovUrl(mm.url || v.legislationUrl) ||
        `https://www.congress.gov/roll-call-vote/${congress}/${chamber}/${rollNumber}`,
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

// Congress.gov reports a bill-type CODE ("HR", "HRES", "HJRES", "HCONRES"), which is a
// number prefix, not a measure type. Lower-casing it produced "hconres", which is not
// in the allowed set, so every resolution silently fell back to "bill" — creating a
// second, bill-typed row for a measure the curated seed had already stored as a
// "resolution". Map the code to the real type instead.
export function measureTypeFor(legisType: string): string {
  const s = String(legisType || "").toLowerCase().replace(/[^a-z]/g, "");
  if (!s) return "bill";
  if (s.endsWith("amdt") || s === "hamdt" || s === "samdt") return "amendment";
  // HRES / SRES (simple), HJRES / SJRES (joint), HCONRES / SCONRES (concurrent).
  if (s.endsWith("res")) return "resolution";
  if (s === "hr" || s === "s") return "bill";
  if (s === "pn" || s === "nomination") return "nomination";
  return ["bill", "resolution", "amendment", "nomination"].includes(s) ? s : "bill";
}

// Classify a roll call from its QUESTION text. Order matters, because House vote
// questions stack keywords: "On Motion to Concur in the Senate Amendment" is a
// concurrence (passage) vote, not an amendment vote, and "On Motion to Suspend the
// Rules and Pass" is a passage vote, not a procedural motion. The most specific
// phrasings therefore have to be tested first.
//
// This drives `isProcedural` downstream, which discounts a record's weight in the
// stance-vs-record verdict — so mislabeling a motion to recommit as "passage" reads a
// yea-to-kill-the-bill as a yea-for-the-bill at FULL weight, inverting the signal.
export function mapActionType(q: string): string {
  const s = String(q || "").toLowerCase();
  if (s.indexOf("veto") !== -1) return "veto_override";
  if (s.indexOf("cloture") !== -1) return "cloture";
  if (s.indexOf("nomination") !== -1 || s.indexOf("confirmation") !== -1) return "nomination";
  // Concurrence and suspension-calendar votes ARE passage votes.
  if (s.indexOf("concur") !== -1) return "passage";
  if (s.indexOf("suspend the rules") !== -1) return "passage";
  if (s.indexOf("passage") !== -1 || s.indexOf("on passing") !== -1) return "passage";
  // Procedural: a yea here is about floor process, not the policy.
  if (s.indexOf("recommit") !== -1) return "motion";
  if (s.indexOf("previous question") !== -1) return "procedural";
  if (s.indexOf("speaker") !== -1) return "procedural";
  if (s.indexOf("journal") !== -1 || s.indexOf("quorum") !== -1 || s.indexOf("adjourn") !== -1) return "procedural";
  if (s.indexOf("amendment") !== -1) return "amendment";
  if (s.indexOf("motion") !== -1) return "motion";
  // "On Agreeing to the Resolution" — adopting a resolution is its passage vote.
  if (s.indexOf("agreeing to the resolution") !== -1) return "passage";
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

// Congress.gov publishes bill/amendment pages under the ORDINAL congress segment
// ("/bill/119th-congress/house-bill/8800"), but the vote API's own `legislationUrl`
// field hands back the bare-number form ("/bill/119/house-bill/8800"). Consuming that
// verbatim produced non-canonical source_url values that don't match the curated seeds
// or any already-stored row, so canonicalize on the way in. Anything that isn't a
// congress.gov bill/amendment path is returned untouched.
const congressOrdinal = (n: number): string => {
  const r100 = n % 100, r10 = n % 10;
  const suffix = r100 >= 11 && r100 <= 13 ? "th"
    : r10 === 1 ? "st" : r10 === 2 ? "nd" : r10 === 3 ? "rd" : "th";
  return `${n}${suffix}-congress`;
};

export function canonicalCongressGovUrl(input: string | null | undefined): string | null {
  if (input == null) return null;
  const s = String(input);
  if (!s) return null;
  // Only rewrite the bare-number congress segment; an already-ordinal URL has a
  // non-digit suffix and fails the \d+ match, so this is idempotent.
  return s.replace(
    /(\/(?:bill|amendment)\/)(\d+)(\/)/,
    (_m, before, num, after) => `${before}${congressOrdinal(Number(num))}${after}`
  );
}

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
