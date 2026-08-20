#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — consolidated appropriations vote seed
//   H.R. 7148 (P.L. 119-75, Consolidated Appropriations Act, 2026)
// ---------------------------------------------------------------------------
// Builds db/vr-consolidated-approps-vote-seed.json from the House Clerk's own roll-call
// XML at clerk.house.gov/evs/<year>/roll<NNN>.xml. Nothing here is typed in from a news
// account or a secondary tracker, and a selection that fails verification against the
// Clerk's <legis-num> and <vote-question> is DROPPED with a note rather than corrected
// by hand.
//
// WHY THIS MEASURE, AND WHY IT WAS NOT HERE ALREADY
//
// db/vr-ingest-runbook.md's follow-up list has carried H.R. 7148 at #1 since the fiscal
// pass: "the strongest remaining candidate and the one deliberately deferred here: real,
// decisive, heavily attributable, and a genuine multi-axis omnibus that needs a
// division-by-division read before any key is coded, exactly as rule 10 requires." The
// same measure sits in declinedRollCalls in db/vr-fiscal-enforcement-vote-seed.json, and
// that decline record states its own lift condition. The read has now been done against
// the enrolled text (govinfo PLAW-119publ75), so the condition is met and the measure is
// ingested here.
//
// The decline record's other premise does not survive contact with the Clerk. It says the
// act "separates far fewer members than its size suggests." Roll 53 is 217-214 with the
// parties inverted from roll 45 — R 196-21, D 21-193 — which is one of the most
// separating rolls of the session, not one of the least. That correction is recorded in
// the runbook rather than left to be rediscovered.
//
// ONE ROLL, NOT TWO — RUNBOOK RULE 8
//
// The House voted H.R. 7148 twice:
//
//   roll 119/2/45  22-Jan-2026, "On Passage", 341-88 (R 192-24, D 149-64)
//   roll 119/2/53   3-Feb-2026, "On Motion to Concur in the Senate Amendments",
//                   217-214 (R 196-21, D 21-193)
//
// Rule 8 admits one decisive roll per chamber per measure. Roll 53 is the one this seed
// carries, and the reason is textual rather than chronological: roll 53 voted the ENROLLED
// text, which is the text whose divisions were read for the mappings. Roll 45 cannot have
// voted that text — Division H of the enrolled act moves the P.L. 119-37 continuing
// resolution date to February 13, 2026 and ratifies obligations incurred during a lapse
// that began on or about January 31, 2026, nine days AFTER roll 45 was taken. Mapping
// roll 45 to divisions it never contained would attribute the enrolled bill's axes to a
// vote on a different bill. Roll 45 is recorded in declinedRollCalls with that reason.
//
// Attribution is fail-closed and identical to the other House builders: the Clerk's XML
// carries a bioguide in @name-id so a member resolves directly through
// db/vr-member-map.json, an unmapped member is counted in rosterSkipped and never
// guessed, isParty is computed over the full chamber before roster filtering, and
// `totals` is always the full chamber tally.
//
// Read-only apart from the seed file it writes. No database.
// ---------------------------------------------------------------------------
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const memberMap = JSON.parse(readFileSync(resolve(REPO, "db/vr-member-map.json"), "utf8"));
const MAP = memberMap.map || {};

// ── The measure, and the roll it contributes ────────────────────────────────
const SELECTIONS = [
  {
    measureType: "bill",
    congress: 119,
    chamber: "house",
    number: "H.R. 7148",
    create: {
      // Runbook rule 6: identity from the title as enacted, not the vehicle it rode in on.
      title: "Consolidated Appropriations Act, 2026",
      shortTitle: "Consolidated Appropriations Act, 2026",
      summary:
        "Full-year consolidated appropriations for fiscal year 2026, enacted February 3, 2026 as "
        + "P.L. 119-75. Official title: 'Making further consolidated appropriations for the fiscal "
        + "year ending September 30, 2026, and for other purposes.' Eleven divisions and no "
        + "Division C: A Department of Defense (Titles I-VIII); B Labor, Health and Human Services, "
        + "and Education (I-V); D Transportation, Housing and Urban Development (I-IV); E Financial "
        + "Services and General Government (I-VIII, including Title VIII District of Columbia); F "
        + "National Security, Department of State, and Related Programs (I-VII); G Other Matters (a "
        + "single section barring payments to UNRWA); H Further Continuing Appropriations Act, 2026 "
        + "(moving the P.L. 119-37 date to February 13, 2026 and covering the lapse that began on or "
        + "about January 31, 2026); I Authorizing Extenders (Secs. 5001-5021); J Health Care "
        + "Extenders (Secs. 6001-6703 across seven titles). Section 3 makes 'this Act' "
        + "division-scoped, so each division's general provisions bind only that division. Summary "
        + "written from the enrolled text at govinfo, not from a secondary description.",
      introducedAt: "2026-01-15",
      status: "enacted",
      sourceUrl: "https://www.govinfo.gov/content/pkg/PLAW-119publ75/html/PLAW-119publ75.htm",
      sourceLabel: "govinfo (enrolled text, P.L. 119-75)",
      externalIds: { publicLaw: "119-75", govinfo: "PLAW-119publ75" },
      textUrl: "https://www.govinfo.gov/content/pkg/PLAW-119publ75/html/PLAW-119publ75.htm",
    },
    rolls: [{ chamber: "house", session: 2, roll: 53, actionType: "concurrence" }],
  },
];

// ── Rolls considered and declined ───────────────────────────────────────────
const DECLINED = [
  {
    number: "H.R. 7148",
    chamber: "house",
    congress: 119,
    session: 2,
    roll: 45,
    totals: "341-88",
    why:
      "On Passage, 22-Jan-2026, 341-88-0-2 (R 192-24-0-2, D 149-64). Runbook rule 8 admits one "
      + "decisive roll per chamber per measure, and the tie-breaker here is textual, not "
      + "chronological. Roll 53 voted the enrolled text — the text whose divisions were read to "
      + "produce every mapping in this pass. Roll 45 cannot have voted that text: Division H of the "
      + "enrolled act moves the P.L. 119-37 continuing resolution date to February 13, 2026 and "
      + "ratifies pay and obligations incurred during a lapse that began on or about January 31, "
      + "2026 — nine days after this roll was taken. Admitting it would attribute the enrolled "
      + "bill's six axes to members voting on a materially different bill, and would score the same "
      + "108 rostered members twice on all six.",
  },
  {
    number: "H.R. 8595",
    chamber: "house",
    congress: 119,
    session: 2,
    roll: 246,
    totals: "209-216",
    why:
      "On Motion to Recommit, failed. Procedural, and yeaBlocksMeasure() in netlify/lib/vr-pack.ts "
      + "treats the bare recommit form as blocking, so admitting it would score the same members "
      + "twice with the direction inverted. H.R. 8595's own passage roll 119/2/247 is already live "
      + "from 20260724140000_seed_house_119_s2_voting_record.sql; this pass adds two mappings to "
      + "that measure and no rolls.",
  },
];

// ── Divisions read and declined, with the bucket ────────────────────────────
// Kept in the seed rather than only in the migration prose so the reasoning travels with
// the data. Buckets: no_provision · rule_3 · two_flank · duplicate · routine_ops ·
// below_floor.
const DECLINED_DIVISIONS = [
  {
    where: "Divisions A, B, D, E, F — routine agency operating accounts",
    bucket: "routine_ops",
    why:
      "The great majority of every division is salaries, expenses and program accounts for agencies "
      + "that carry on regardless of who wins the vote. Funding the Federal Aviation Administration, "
      + "the Bureau of Prisons or the Employment and Training Administration at roughly last year's "
      + "level is not a position on transportation, crime or labour policy — it is the appropriation "
      + "existing. Mapping account titles to chips would put an infrastructure, a public_schools and "
      + "a housing receipt on all 108 attributed members for provisions none of them argued about.",
  },
  {
    where: "Whole act — gov_services, national_debt, cut_spending, gov_balance, audit_spending",
    bucket: "two_flank",
    why:
      "Runbook rule 5. Roll 53's 214 nays are 193 Democrats and 21 Republicans, and the two blocs "
      + "wanted opposite things: the Democratic nays objected to the levels and riders as too "
      + "austere and too restrictive, the Republican nays to the topline as too high. On the "
      + "spending axis support_meaning has no honest value — gov_services carries lean 'D' and a "
      + "yea_supports row would hand it to the 196 Republican yeas and take it from the 193 "
      + "Democratic nays, inverting the very bloc the chip describes. The keys the two flanks "
      + "disagree about are the ones rule 5 disqualifies; it does not disqualify the Israel, "
      + "abortion, defence or health axes, where the nay blocs are not opposed to each other.",
  },
  {
    where: "Whole act — america_first_fp",
    bucket: "duplicate",
    why:
      "The Division G UNRWA bar and the Division F UN Human Rights Council conditions would each "
      + "support it, but the same conviction is already carried the other way on this measure by "
      + "foreign_balance, which is mapped from the Division F Titles I, IV and V accounts those "
      + "riders condition. Two chips on one set of provisions, pointing in opposite directions, is "
      + "a manufactured contradiction for every attributed member.",
  },
  {
    where: "Division E Sec. 747 — Executive Schedule, Vice-Presidential and noncareer-SES pay freeze",
    bucket: "no_provision",
    why:
      "Reads as a civil-service provision and is not one. civil_service_control's scope comment in "
      + "alignment-tool.js is Schedule F reclassification and at-will conversion of the career "
      + "service — the question of who can be removed. A pay freeze for political appointees "
      + "touches none of it.",
  },
  {
    where: "Division E Secs. 748-749 — Impoundment Control Act and apportionment reporting",
    bucket: "below_floor",
    why:
      "Genuine power_of_purse provisions, whose keyword list in alignment-tool.js names "
      + "'impoundment' and 'apportionment' outright: Sec. 748 requires an Impoundment Control Act "
      + "violation to be reported immediately to Congress, the Appropriations Committees and the "
      + "Comptroller General, and Sec. 749 requires notice when an apportionment is late or "
      + "conditioned. But they are two reporting requirements inside an eleven-division act, and the "
      + "record's practical weight floor is 25. A row below that is noise on 108 ledgers; the honest "
      + "place for this axis is a measure where the purse question is the operative purpose, which "
      + "is what 20260823000000_vr_fiscal_enforcement_rollcalls.sql already covers.",
  },
  {
    where: "Division E Sec. 809 — District of Columbia schedule I and THC-derivative bar",
    bucket: "below_floor",
    why:
      "A single D.C.-scoped rider. There is no cannabis mapping anywhere in the record to be "
      + "consistent with, and a rider confined to one city's local law does not carry a national "
      + "drug-policy conviction at or above weight 25.",
  },
  {
    where: "Division H — Further Continuing Appropriations Act, 2026",
    bucket: "two_flank",
    why:
      "Secs. 101-104 move the continuing resolution date to February 13, 2026 and ratify pay and "
      + "obligations incurred during the lapse that began on or about January 31, 2026. This is the "
      + "shutdown-ending division, and it is exactly the material rule 5 disqualifies: the two nay "
      + "blocs wanted the shutdown resolved on opposite terms. Sec. 105 repeals section 213 of title "
      + "II of division C of P.L. 119-37 (2 U.S.C. 6628); the repealed section is a legislative-branch "
      + "administrative provision and is not mapped.",
  },
  {
    where: "Division I Secs. 5013, 5014, 5015, 5016 — Conrad 30, E-Verify, non-minister religious workers, H-2B",
    bucket: "below_floor",
    why:
      "Four one-line date extensions of existing immigration authorities. immig_legal was drafted "
      + "and set aside: each is a continuation of current law rather than a change to it, together "
      + "they are a fraction of one division of eleven, and they run against the grain of both nay "
      + "flanks rather than separating them. Below the record's practical weight floor of 25.",
  },
  {
    where: "Division I Secs. 5004, 5008, 5019, 5020 — NFIP, Cybersecurity Information Sharing Act, AGOA, Haiti HELP",
    bucket: "below_floor",
    why:
      "Same class. Sec. 5008's extension of the Cybersecurity Information Sharing Act of 2015 to "
      + "September 30, 2026 is the one with a live key behind it (privacy_rights, on the "
      + "information-sharing liability shield), but a bare date extension of an expiring authority "
      + "inside a one-line extenders division does not carry a privacy conviction at weight 25.",
  },
  {
    where: "Division J Titles I-VII — gov_regulation on the PBM provisions",
    bucket: "rule_3",
    why:
      "Runbook rule 3: gov_regulation is applied only where the regulatory question is the primary "
      + "operative purpose of the measure. Secs. 6701-6703 and 6223-6224 do regulate pharmacy "
      + "benefit managers, and they are mapped — as health_drug_prices, which is what they are "
      + "about. The regulatory form is the mechanism, not the subject.",
  },
  {
    where: "H.R. 8595 — america_first_fp",
    bucket: "two_flank",
    why:
      "Settled from the two primary texts rather than from the bill's reputation, by comparing the "
      + "FY2027 account levels against P.L. 119-75 Division F. The bill genuinely winds down "
      + "multilateral commitments — International Organizations and Programs eliminated (FY26 "
      + "$339,000,000), the Inter-American Foundation and the U.S. African Development Foundation "
      + "eliminated, the International Development Association cut from $1,066,184,000 to "
      + "$503,973,000, global health from $3,531,975,000 to $3,350,000,000. It also does the "
      + "opposite: diplomatic programs rise from $9,358,236,000 to $9,761,523,000, Foreign Military "
      + "Financing from $6,158,397,000 to $6,752,500,000, and it RESTORES two accounts FY2026 "
      + "carried no heading for at all — Contributions to International Organizations at $310,200,000 "
      + "and Contributions for International Peacekeeping Activities at $489,519,000, which are UN "
      + "assessed dues and assessed peacekeeping. An instrument that both defunds the UN Human "
      + "Rights Council and restores $799,719,000 of UN assessments has no honest support_meaning on "
      + "this axis. Documented, not forced.",
  },
  {
    where: "H.R. 8595 — foreign_balance",
    bucket: "duplicate",
    why:
      "The allied-military-cooperation material in this bill is Title IV — Foreign Military "
      + "Financing, International Military Education and Training, Security Sector Programs — and "
      + "the conviction it carries is already live on this measure as strong_defense 60 from "
      + "20260725000000_vr_multi_issue_mappings_wave2.sql. Unlike H.R. 7148, which has a whole "
      + "Department of Defense division for strong_defense to describe, H.R. 8595 has no defence "
      + "division: the two keys would be reading the same accounts twice.",
  },
  {
    where: "H.R. 9770 — Continuing Appropriations Act, 2027",
    bucket: "no_provision",
    why:
      "Read in full from the engrossed text (BILLS-119hr9770eh, 357 lines) as the brief's sibling "
      + "rule requires. Sec. 101 sets rates for operations by reference to twelve FY2026 acts and "
      + "Secs. 102-128 are standard CR provisos. Nothing in it implicates a live key above the floor "
      + "that its existing gov_services 100 primary and national_debt 35 yea_opposes pair does not "
      + "already carry honestly. Sec. 127's payments to the widow of Rep. David A. Scott and the "
      + "heirs of Sen. Lindsey O. Graham, and Sec. 128's Member COLA freeze, are not issue axes.",
  },
];

const SCAN_COVERAGE =
  "The enrolled text of P.L. 119-75 was read at govinfo (PLAW-119publ75, 34,584 lines) division by "
  + "division: Division A general provisions and the Israel and Taiwan sections; Division B structure "
  + "and Secs. 506-507; Division D structure; Division E Titles VI, VII and VIII in full section "
  + "index with Secs. 613, 747, 748, 749, 809 and 810 read in full; Division F title structure, every "
  + "account heading with its level, the Title VII section index, and Secs. 7018, 7041(c), 7047, 7048 "
  + "and the UNHRC conditions read in full; Divisions G and H in full; Division I Secs. 5001-5021; "
  + "Division J's full section index with Secs. 6105 and 6702 read in full. Keyword sweeps over the "
  + "whole act returned abortion 38, Israel 49, Taiwan 23, Palestin 36, Ukraine 10, vaccine 10, gender "
  + "5, E-Verify 1, sanctuary 1, and zero for climate, greenhouse, transgender, marijuana, Planned "
  + "Parenthood, net neutrality, border wall, Second Amendment, 'diversity, equity' and 'critical "
  + "race'. The Ukraine hits are the standing Crimea non-recognition rider only: the act carries no "
  + "Ukraine Security Assistance Initiative money, so no Ukraine axis is mapped. H.R. 8595 was read "
  + "from BILLS-119hr8595eh (6,360 lines) and H.R. 9770 from BILLS-119hr9770eh (357 lines).";

const ROLL_FINDING =
  "Both House rolls were verified live against clerk.house.gov/evs/2026 before anything was written. "
  + "Roll 45: legis-num 'H R 7148', 'On Passage', Passed, 22-Jan-2026 4:58 PM, 341-88-0-2, 431 "
  + "recorded. Roll 53: legis-num 'H R 7148', 'On Motion to Concur in the Senate Amendments', Passed, "
  + "3-Feb-2026 2:09 PM, 217-214-0-1 (R 196-21-0-1, D 21-193), 432 recorded. 108 of the 213 members in "
  + "db/vr-member-map.json are recorded on each. Before this pass H.R. 7148 had no vr_measures row, no "
  + "roll calls and no member votes anywhere in the repository, and does not appear in "
  + "db/vr-coverage-report.md — mapping it without ingesting it would have been inert.";

// ── XML helpers ─────────────────────────────────────────────────────────────
const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : null;
};
const attr = (frag, name) => {
  const m = frag.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : null;
};
const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
const POS = { Yea: "yea", Aye: "yea", Nay: "nay", No: "nay", Present: "present", "Not Voting": "not_voting" };
const MON_SHORT = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

// Eastern offset without a timezone database: DST runs from the second Sunday in March
// to the first Sunday in November.
function etOffset(y, mo, d) {
  const nth = (month, dow, n) => {
    let count = 0;
    for (let day = 1; day <= 31; day++) {
      const dt = new Date(Date.UTC(y, month - 1, day));
      if (dt.getUTCMonth() !== month - 1) break;
      if (dt.getUTCDay() === dow && ++count === n) return day;
    }
    return null;
  };
  const dstStart = { mo: 3, d: nth(3, 0, 2) };
  const dstEnd = { mo: 11, d: nth(11, 0, 1) };
  const onOrAfter = (a, b) => a.mo > b.mo || (a.mo === b.mo && a.d >= b.d);
  const before = (a, b) => a.mo < b.mo || (a.mo === b.mo && a.d < b.d);
  return onOrAfter({ mo, d }, dstStart) && before({ mo, d }, dstEnd) ? "-04:00" : "-05:00";
}

async function get(url) {
  const r = await fetch(url, { headers: { "user-agent": "politidex-vr-ingest/1.0" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return await r.text();
}

// The standing decisive set from scripts/test-vr-vote-seed.mjs, unmodified. The one form
// this pass needs — "On Motion to Concur in the Senate Amendments" — is already in it, so
// no exception is claimed and no vote carries a decisiveWhy.
const DECISIVE = /^(on passage|on the joint resolution|on the amendment|on the motion \(motion to concur|on motion to concur|on concurring|on the conference report|on motion to suspend the rules and (pass|agree|concur))/i;

function crossoverFlagger(all) {
  const byParty = {};
  for (const m of all) {
    if (!m.party || (m.position !== "yea" && m.position !== "nay")) continue;
    byParty[m.party] = byParty[m.party] || { yea: 0, nay: 0 };
    byParty[m.party][m.position]++;
  }
  const majority = {};
  for (const p of Object.keys(byParty)) majority[p] = byParty[p].yea >= byParty[p].nay ? "yea" : "nay";
  return (m) => {
    if (!m.party || (m.position !== "yea" && m.position !== "nay") || !majority[m.party]) return null;
    return m.position === majority[m.party] ? "with_party" : "against_party";
  };
}
function partyTotals(all) {
  const out = {};
  for (const m of all) {
    if (m.position !== "yea" && m.position !== "nay") continue;
    const p = m.party || "?";
    out[p] = out[p] || { yea: 0, nay: 0 };
    out[p][m.position]++;
  }
  return out;
}

const notes = [];
const votes = [];

const houseYear = (congress, session) => 2 * congress + 1787 + (session - 1);
// "H.R. 7148" → "H R 7148". The Clerk replaces periods with spaces.
const houseCitation = (number) => number.replace(/\./g, " ").replace(/\s+/g, " ").trim().toUpperCase();

async function fetchHouse(sel, measure, session, roll, actionType) {
  const year = houseYear(sel.congress, session);
  const url = `https://clerk.house.gov/evs/${year}/roll${String(roll).padStart(3, "0")}.xml`;
  const xml = await get(url);
  const at = `house ${year}/${roll} (${sel.number})`;

  // Verification keys on legis-num, never on vote-desc.
  const legis = clean(tag(xml, "legis-num"));
  if (legis.toUpperCase() !== houseCitation(sel.number)) {
    notes.push(`DROPPED ${at}: legis-num "${legis}" is not ${sel.number}`);
    return null;
  }
  const question = clean(tag(xml, "vote-question"));
  if (!DECISIVE.test(question)) {
    notes.push(`DROPPED ${at}: question "${question}" is not an admitted decisive form`);
    return null;
  }

  const [dd, mon, yyyy] = clean(tag(xml, "action-date")).split("-");
  const mo = MON_SHORT[mon];
  const hhmm = attr((xml.match(/<action-time[^>]*>/) || [""])[0], "time-etz") || "12:00";
  const voteDate = `${yyyy}-${String(mo).padStart(2, "0")}-${dd.padStart(2, "0")}T${hhmm}:00${etOffset(+yyyy, mo, +dd)}`;

  // <totals-by-vote> sits under vote-metadata/vote-totals, not directly under
  // vote-metadata. tag() is depth-agnostic, so this works either way.
  const tv = tag(xml, "totals-by-vote") || "";
  const totals = {
    yea: +(tag(tv, "yea-total") || tag(tv, "aye-total") || 0),
    nay: +(tag(tv, "nay-total") || tag(tv, "no-total") || 0),
    present: +(tag(tv, "present-total") || 0),
    notVoting: +(tag(tv, "not-voting-total") || 0),
  };

  const all = [];
  for (const m of xml.matchAll(/<recorded-vote>([\s\S]*?)<\/recorded-vote>/g)) {
    const legFrag = (m[1].match(/<legislator[^>]*>/) || [""])[0];
    all.push({
      bioguideId: attr(legFrag, "name-id"),
      party: attr(legFrag, "party"),
      state: attr(legFrag, "state"),
      position: POS[clean(tag(m[1], "vote"))] || null,
    });
  }
  const flag = crossoverFlagger(all);
  const mapped = [];
  let unmapped = 0;
  for (const m of all) {
    const pid = m.bioguideId ? MAP[m.bioguideId] : null;
    if (!pid) { unmapped++; continue; }
    if (!m.position) { notes.push(`SKIPPED ${at} ${m.bioguideId}: unreadable position`); continue; }
    mapped.push({ bioguideId: m.bioguideId, politicianId: pid, party: m.party, position: m.position, isParty: flag(m) });
  }

  const raw = clean(tag(xml, "vote-result"));
  const result = /^passed$/i.test(raw) ? "passed" : /agreed/i.test(raw) ? "agreed_to"
    : /rejected|defeated/i.test(raw) ? "rejected" : "failed";
  return {
    chamber: "house", congress: sel.congress, session, rollNumber: roll, voteDate,
    question, voteDesc: clean(tag(xml, "vote-desc")),
    actionType, result,
    requiredMajority: /suspend the rules/i.test(question) ? "two_thirds" : "simple",
    admittedAs: "decisive", decisiveWhy: null,
    totals, partyTotals: partyTotals(all),
    sourceUrl: url, sourceLabel: "U.S. House Clerk",
    measure, chamberVoting: all.length, rosterSkipped: unmapped, rosterAmbiguous: 0,
    memberVotes: mapped.sort((a, b) => (a.politicianId < b.politicianId ? -1 : 1)),
  };
}

for (const sel of SELECTIONS) {
  const measure = {
    measureType: sel.measureType, congress: sel.congress, chamber: sel.chamber, number: sel.number,
    parent: null,
    ...(sel.create ? { title: sel.create.title, create: sel.create } : {}),
    ...(sel.mustExist ? { mustExist: sel.mustExist } : {}),
  };
  let got = 0;
  for (const r of sel.rolls) {
    const v = await fetchHouse(sel, measure, r.session, r.roll, r.actionType);
    if (v) { votes.push(v); got++; }
  }
  if (got !== sel.rolls.length) {
    notes.push(`!! ${sel.number} contributed ${got} of ${sel.rolls.length} rolls — a selection did not verify`);
  }
}

votes.sort((a, b) => (a.voteDate < b.voteDate ? -1 : a.voteDate > b.voteDate ? 1 : 0));

const seed = {
  _comment:
    "The decisive House roll call on H.R. 7148, the Consolidated Appropriations Act, 2026 (P.L. "
    + "119-75). Built by scripts/vr-build-consolidated-approps-vote-seed.mjs from clerk.house.gov/evs "
    + "XML. The measure was runbook follow-up #1 and sat declined in "
    + "db/vr-fiscal-enforcement-vote-seed.json pending a division-by-division read of the enrolled "
    + "text; that read has now been done against govinfo PLAW-119publ75 and is summarised in "
    + "scanCoverage. ONE roll is carried, not two: runbook rule 8 admits a single decisive roll per "
    + "chamber, and roll 53 is the one that voted the ENROLLED text whose divisions produced the "
    + "mappings — roll 45, taken 22-Jan-2026, cannot have contained Division H, which covers a lapse "
    + "beginning on or about 31-Jan-2026. memberVotes is already filtered to db/vr-member-map.json; "
    + "unmapped members are counted in rosterSkipped and never guessed. isParty is computed from the "
    + "full chamber tally before roster filtering, and totals is the full chamber tally, not the "
    + "roster subset. declinedDivisions records what was read and NOT mapped, with the bucket.",
  builtBy: "scripts/vr-build-consolidated-approps-vote-seed.mjs",
  issueKeys: [
    "strong_defense", "israel_support", "health_rural", "health_drug_prices",
    "foreign_balance", "pro_life",
  ],
  congresses: [119],
  parents: [],
  rollCallCount: votes.length,
  memberVoteCount: votes.reduce((n, v) => n + v.memberVotes.length, 0),
  scanCoverage: SCAN_COVERAGE,
  rollFinding: ROLL_FINDING,
  declinedDivisions: DECLINED_DIVISIONS,
  declinedRollCalls: DECLINED,
  votes,
};
writeFileSync(resolve(REPO, "db/vr-consolidated-approps-vote-seed.json"), JSON.stringify(seed, null, 1) + "\n");

const expected = SELECTIONS.reduce((n, s) => n + s.rolls.length, 0);
for (const n of notes) console.log("NOTE:", n);
console.log(`\n${votes.length} roll calls, ${seed.memberVoteCount} attributed member votes\n`);
console.log("chamber  c/s  roll  measure     margin     req        attributed  skipped  question");
for (const v of votes) {
  console.log(
    `${v.chamber.padEnd(7)} ${v.congress}/${v.session} ${String(v.rollNumber).padStart(4)}  ` +
    `${v.measure.number.padEnd(11)} ${(v.totals.yea + "-" + v.totals.nay).padEnd(10)} ${v.requiredMajority.padEnd(10)} ` +
    `${String(v.memberVotes.length).padStart(10)} ${String(v.rosterSkipped).padStart(8)}  ${v.question.slice(0, 44)}`
  );
}
if (votes.length !== expected) {
  console.error(`\n! ${expected - votes.length} of ${expected} selections failed verification — see the NOTEs above.`);
  process.exit(1);
}
