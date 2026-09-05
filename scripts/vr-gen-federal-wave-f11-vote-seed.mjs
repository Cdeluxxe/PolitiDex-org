// ---------------------------------------------------------------------------
// Federal wave F11 — vote seed generator
// ---------------------------------------------------------------------------
// One roll, one instrument. Reads the Clerk's own EVS XML for House roll 154 of
// the 119th's 2nd session and writes db/vr-federal-wave-f11-vote-seed.json.
//
// The tally authority is the document's own <totals-by-vote> block, never the
// attributed subset and never a display string — F6 shipped the bug where "51-42"
// parsed as 5142 and every roll came back unanimous, and F9's census had to be
// rebuilt around it. The attribution path is fail-closed and has exactly one hop:
// the clerk's name-id (bioguide) -> db/vr-member-map.json -> roster slug. A member
// who does not resolve is SKIPPED and counted, never guessed at by name.
//
// Present and Not Voting are carried through as positions in their own right and
// are never folded into a side. That is the whole of the "Present/NV is a no-side,
// never a direction" rule at the ingest boundary: the seed records what the clerk
// recorded, and the read layer is what declines to treat it as a direction.
//
// Usage: node scripts/vr-gen-federal-wave-f11-vote-seed.mjs
// ---------------------------------------------------------------------------
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const XML = process.env.F11_ROLL_XML || "/tmp/roll154.xml";

const map = JSON.parse(readFileSync(join(ROOT, "db/vr-member-map.json"), "utf8")).map;
const xml = readFileSync(XML, "utf8");

const one = (tag, src) => {
  const m = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(src);
  return m ? m[1].trim() : null;
};
const meta = one("vote-metadata", xml);

// ── the clerk's own tally, read out of the totals block ─────────────────────
const totalsBlock = one("totals-by-vote", meta);
const tally = (t) => Number(one(t, totalsBlock));
const totals = { yea: tally("yea-total"), nay: tally("nay-total"),
  present: tally("present-total"), notVoting: tally("not-voting-total") };

// ── per-party totals ────────────────────────────────────────────────────────
// The clerk's <totals-by-party> block names parties in full ("Republican"), while
// each <legislator> carries a letter ("R"). Keyed by the letter here, to match the
// shape every earlier wave's seed uses, and CROSS-CHECKED against the clerk's own
// block below: if the two ever disagree the seed refuses rather than picking one.
const PARTY_LETTER = { Republican: "R", Democratic: "D", Independent: "I" };
const clerkParty = {};
for (const m of xml.matchAll(/<totals-by-party>([\s\S]*?)<\/totals-by-party>/g)) {
  const p = one("party", m[1]);
  if (!p || !PARTY_LETTER[p]) continue;
  clerkParty[PARTY_LETTER[p]] = { yea: Number(one("yea-total", m[1])), nay: Number(one("nay-total", m[1])),
    present: Number(one("present-total", m[1])), notVoting: Number(one("not-voting-total", m[1])) };
}

// ── the recorded votes ───────────────────────────────────────────────────────
const POS = { Yea: "yea", Aye: "yea", Nay: "nay", No: "nay", Present: "present", "Not Voting": "not_voting" };
const recorded = [...xml.matchAll(/<recorded-vote>([\s\S]*?)<\/recorded-vote>/g)].map((m) => {
  const leg = /<legislator([^>]*)>/.exec(m[1])[1];
  const attr = (n) => (new RegExp(`${n}="([^"]*)"`).exec(leg) || [, null])[1];
  return { bioguide: attr("name-id"), name: attr("unaccented-name"), party: attr("party"),
    state: attr("state"), raw: one("vote", m[1]) };
});

// A party's own majority side on this roll, so `isParty` is derived from the
// document rather than asserted. Computed over yea/nay only: a Present or a Not
// Voting has no side, so it can be neither with nor against one, and it is filed
// as null rather than as agreement with whatever the caucus did.
const partyTotals = {};
for (const r of recorded) {
  const t = (partyTotals[r.party] = partyTotals[r.party] || { yea: 0, nay: 0, present: 0, notVoting: 0 });
  const k = POS[r.raw];
  if (k === "yea") t.yea++; else if (k === "nay") t.nay++;
  else if (k === "present") t.present++; else t.notVoting++;
}
for (const [p, t] of Object.entries(clerkParty)) {
  const mine = partyTotals[p];
  if (!mine || mine.yea !== t.yea || mine.nay !== t.nay || mine.present !== t.present || mine.notVoting !== t.notVoting) {
    throw new Error(`party tally disagreement for ${p}: clerk ${JSON.stringify(t)} vs recorded ${JSON.stringify(mine)}`);
  }
}
const partySide = {};
for (const [p, t] of Object.entries(partyTotals)) {
  partySide[p] = t.yea === t.nay ? null : (t.yea > t.nay ? "yea" : "nay");
}

const memberVotes = [];
const unresolved = [];
for (const r of recorded) {
  const slug = map[r.bioguide];
  if (!slug) { unresolved.push(r.bioguide); continue; }
  const position = POS[r.raw];
  if (!position) throw new Error(`unrecognised clerk position '${r.raw}' for ${r.bioguide} — refusing to guess`);
  const side = position === "yea" || position === "nay" ? position : null;
  memberVotes.push({ politicianId: slug, bioguideId: r.bioguide, position,
    isParty: side == null || partySide[r.party] == null ? null
      : (side === partySide[r.party] ? "with_party" : "against_party") });
}

const attributedSides = memberVotes.filter((v) => v.position === "yea" || v.position === "nay").length;
const pool = totals.yea + totals.nay;
// F8's pull rule, restated as a hard refusal: attributed sides may never exceed the
// document's own yea+nay pool. Over-attribution is not a rounding difference, it is
// a bad join, and a bad join must stop the seed rather than ship a chamber that
// voted more times than it has members.
if (attributedSides > pool) throw new Error(`over-attribution: ${attributedSides} attributed sides against a pool of ${pool}`);
if (recorded.length > 435) throw new Error(`recorded ${recorded.length} exceeds the House headcount`);

const out = {
  _comment: "Federal wave F11 vote seed. ONE roll: the House's passage of H.R. 7567, the 2026 Farm Bill. Built by scripts/vr-gen-federal-wave-f11-vote-seed.mjs from the Clerk's own EVS XML. The measure already exists in vr_measures (id 31, curated by F9) and already carries rural_ag w100 PRIMARY — this seed adds the ACT that was missing, not the mapping.",
  wave: "f11",
  chamber: "house",
  builtBy: "scripts/vr-gen-federal-wave-f11-vote-seed.mjs",
  pulledAt: new Date().toISOString(),
  source: "https://clerk.house.gov/evs/2026/roll154.xml",
  scope: "One passage-form floor roll on one standalone policy instrument. No amendments, no procedural rolls, no parent vehicles.",
  attribution: {
    house: "fail-closed: the clerk's own name-id (bioguide) -> db/vr-member-map.json -> roster slug, and no other path",
    tallyAuthority: "House <totals-by-vote>, the full chamber. Never the attributed subset and never a display string.",
    overAttribution: "F8's pull rule: attributed yea+nay rows exceeding the document's yea+nay pool refuses the roll outright rather than shipping it.",
    presentAndNotVoting: "Carried as positions in their own right ('present', 'not_voting') and never folded into a side. isParty is null for them, because a member with no side can be neither with nor against their caucus.",
    unresolvedArePart: "Members who do not resolve are skipped and counted, so the ceiling is visible rather than implied.",
  },
  parentsAreVehicles: "Not applicable: this is a bill's own passage roll, not an amendment.",
  votes: [{
    chamber: "house",
    congress: 119,
    session: 2,
    rollNumber: 154,
    clerkYear: 2026,
    voteDate: "2026-04-30T11:14:00-04:00",
    question: one("vote-question", meta),
    voteDesc: one("vote-desc", meta),
    actionType: "passage",
    result: "passed",
    requiredMajority: "simple",
    admittedAs: "passage: the bill's own On Passage roll",
    decisiveWhy: "The question is On Passage of H.R. 7567 itself. Not a special rule, not a motion to recommit, not a suspension, not a discharge-as-if-passage, not a continuing resolution and not a rider on somebody else's vehicle: the House voted on whether this bill becomes the House's text, and 424 members took a side on it.",
    totals,
    partyTotals,
    sourceUrl: "https://clerk.house.gov/Votes/2026154",
    xmlUrl: "https://clerk.house.gov/evs/2026/roll154.xml",
    sourceLabel: "Office of the Clerk, U.S. House of Representatives",
    measure: {
      measureType: "bill",
      congress: 119,
      chamber: "house",
      number: "H.R. 7567",
      clerkLegisNum: one("legis-num", meta),
      alreadyInCorpus: "vr_measures id 31, created by wave F9 with a full mapping set and no roll call. This seed does not create it and does not touch its mapping rows other than the two F11 retracts.",
      congressGovUrl: "https://www.congress.gov/bill/119th-congress/house-bill/7567",
    },
    textVerification: {
      readFrom: "https://www.govinfo.gov/content/pkg/BILLS-119hr7567eh/html/BILLS-119hr7567eh.htm",
      comparedAgainst: "https://www.govinfo.gov/content/pkg/BILLS-119hr7567rh/html/BILLS-119hr7567rh.htm",
      titlesInTheEngrossedPrint: ["I--COMMODITIES", "II--CONSERVATION", "III--TRADE", "IV--NUTRITION", "V--CREDIT", "VI--RURAL DEVELOPMENT", "VII--RESEARCH, EXTENSION, AND RELATED MATTERS", "VIII--FORESTRY", "IX--ENERGY", "X--HORTICULTURE, MARKETING, AND REGULATORY REFORM", "XI--CROP INSURANCE", "XII--MISCELLANEOUS PROVISIONS"],
      longTitle: "To provide for the reform and continuation of agricultural and other programs of the Department of Agriculture through fiscal year 2031, and for other purposes.",
      sectionsInTheReportedPrintAndNotTheEngrossedOne: ["SEC. 10205 UNIFORMITY OF PESTICIDE LABELING REQUIREMENTS", "SEC. 10206 AUTHORITY OF STATES", "SEC. 10207 LAWFUL USE OF AUTHORIZED PESTICIDES"],
      howThatWasEstablished: "The engrossed print's section run in that range is 10201, 10202, 10203, 10204, then 10211. The reported print's is 10201-10207 then 10211. Nothing else in the range differs, so the three named sections are the whole of the difference, and H.Amdt. 196 (roll 119/2/148, 280-142) is the recorded vote that struck them — wave F9 ingested that amendment and recorded the same finding in its own migration header.",
    },
    _chamberRecorded: recorded.length,
    _attributed: memberVotes.length,
    _attributedSides: attributedSides,
    _poolYeaNay: pool,
    _unresolvedRecorded: unresolved.length,
    _unresolvedBioguides: unresolved,
    memberVotes,
  }],
  rollCallCount: 1,
  memberVoteCount: memberVotes.length,
  skippedVoteCount: unresolved.length,
  newMeasures: 0,
  parentsTouched: 0,
  _counts: {
    rolls: 1, houseRolls: 1, senateRolls: 0, session1: 0, session2: 1,
    chamberRecorded: recorded.length,
    attributedMemberVotes: memberVotes.length,
    attributedSides,
    attributionCeilingHouse: memberVotes.length,
    unresolvedRecordedTotal: unresolved.length,
    presentCount: totals.present,
    notVotingCount: totals.notVoting,
    admittedForms: { "passage: the bill's own On Passage roll": 1 },
    newParentMeasures: 0, parentRollsWritten: 0,
  },
};

writeFileSync(join(ROOT, "db/vr-federal-wave-f11-vote-seed.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`recorded=${recorded.length} attributed=${memberVotes.length} sides=${attributedSides} pool=${pool} unresolved=${unresolved.length}`);
console.log(`totals=${JSON.stringify(totals)} partySides=${JSON.stringify(partySide)}`);
