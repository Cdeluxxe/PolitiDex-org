#!/usr/bin/env node
// ---------------------------------------------------------------------------
// vr-build-israel-vote-seed.mjs — roll calls for the Support for Israel vertical
// ---------------------------------------------------------------------------
// `israel_support` was added to ISSUE_MAP so that U.S. support for Israel could be
// scored on its own record instead of being smeared across four general-posture chips
// (see the key's comment in alignment-tool.js, and
// scripts/vr-refile-israel-stances-aug2026.mjs for the stance side). A chip with no
// votes behind it ranks nobody, so this script fetches the floor record.
//
//   node scripts/vr-build-israel-vote-seed.mjs      # writes db/vr-israel-vote-seed.json
//
// WHAT IS IN SCOPE
// ---------------
// U.S. support for Israel itself: security assistance and missile-defence money,
// weapons transfers and export licences, and floor attempts to cut, block or condition
// that support. Sixteen roll calls from the 117th through the 119th Congress, chosen in
// the mission's priority order — enacted/funding first, then arms and security
// cooperation, then contested passage, then directional amendments.
//
// Deliberately NOT in scope, and not in this seed:
//   · Iran war-powers resolutions (S.J.Res. 59, H.Con.Res. 89). These direct the
//     President to remove U.S. FORCES from hostilities. They are votes about American
//     war powers; a member can vote to restrain U.S. strikes and still fund Iron Dome.
//     Both already carry restraint / america_first_fp mappings and keep them.
//   · Domestic antisemitism measures (H.R. 6090 and the H.Res. condemnation series).
//     Those are campus-speech and civil-rights questions and belong to rights_balance /
//     free_speech / religious_liberty. Pulling them in here would be the same force-fit
//     in the opposite direction.
//   · Member-discipline votes (the Tlaib censure resolutions) and rule / previous-
//     question votes (H.Res. 838, 980, 1160). Discipline is not policy and rules are
//     not policy.
//   · Near-unanimous deficit-neutral reserve-fund amendments (S.Amdt. 786, 97-3;
//     S.Amdt. 3383, 99-0). No operative effect and no discriminating signal.
// The full ledger with tallies is in DECLINED below.
//
// TWO NON-PASSAGE QUESTION FORMS ARE ADMITTED HERE, NARROWLY
// ---------------------------------------------------------
// The repo's standing rule is that only decisive questions are ingested — passage,
// motions to concur, conference reports. Two forms outside that list are the ONLY floor
// record that exists for the substance they decide, so each is admitted for one measure
// shape and each carries its own written justification (`decisiveWhy`), which
// scripts/test-vr-vote-seed.mjs requires:
//
//   · "On Agreeing to the Amendment", for an H.Amdt./S.Amdt. measure. An amendment has
//     no passage vote; agreeing to it IS its disposition. The repo already holds 28
//     amendment roll calls on exactly this footing.
//   · "On the Motion to Discharge", for a joint resolution. Under the Arms Export
//     Control Act's expedited procedure a disapproval resolution that the Foreign
//     Relations Committee does not report can only reach the floor by discharge, and
//     the Senate has never let one past that step. The discharge vote is therefore the
//     whole substantive record of the arms-sale fight, not a step on the way to one —
//     senators debate the sale itself and vote it up or down under that caption. The
//     repo already holds S.J.Res. 59's discharge roll (senate 119/1 roll 328) live.
//
// Motions to recommit, motions to table, cloture and previous-question votes remain
// excluded. H.R. 8369's roll 216 (motion to recommit) is declined for that reason even
// though its roll 217 is ingested.
//
// EVERY ROLL RE-VERIFIED AGAINST THE CHAMBER'S OWN RECORD
// ------------------------------------------------------
// Roll numbers were read out of each measure's govinfo BILLSTATUS record — for the nine
// arms-sale resolutions the bill's own latestAction names the record vote number — and
// then re-fetched from clerk.house.gov/evs (House) or senate.gov roll_call_votes
// (Senate). A roll is DROPPED, loudly, unless the fetched document's own citation
// matches the measure the selection claims and its question is one of the admitted
// forms. For amendments the citation check is two-part, because the Clerk's XML cites
// the underlying BILL in <legis-num> and identifies the amendment only by author string
// in <amendment-author>: both must match. That check is what pinned H.Amdt. 235 to roll
// 243 rather than its neighbour 244 (the Massie Jordan amendment, 6-422).
//
// ATTRIBUTION IS FAIL-CLOSED
// -------------------------
// House XML carries a bioguide id per legislator, so the House side is a direct
// db/vr-member-map.json lookup. Senate XML carries none, so senators are resolved by
// (last name, state) against the roster and accepted only on a UNIQUE hit; anything
// ambiguous or unrecognised is skipped and counted, never guessed. is_party is computed
// from the FULL chamber list before the roster filter, so a 63-member subset can never
// invent a party crossover. `totals` is always the full chamber tally.
// ---------------------------------------------------------------------------
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const memberMap = JSON.parse(readFileSync(resolve(REPO, "db/vr-member-map.json"), "utf8"));
const MAP = memberMap.map || {};
const ROSTER = memberMap.members || [];

const CG = (c, kind, n) => `https://www.congress.gov/bill/${c}th-congress/${kind}/${n}`;
const CG_AMDT = (c, n) => `https://www.congress.gov/amendment/${c}th-congress/house-amendment/${n}`;
const BS = (c, t, n) => `https://www.govinfo.gov/bulkdata/BILLSTATUS/${c}/${t}/BILLSTATUS-${c}${t}${n}.xml`;

// ── Parent measures ─────────────────────────────────────────────────────────
// A division bill and a floor amendment are only honest with their vehicle attached:
// H.R. 8034 is Division A of H.R. 815, and H.Amdt. 478 is an amendment to H.R. 4665.
// `mustExist` parents are looked up and RAISE if absent — never find-or-created, because
// vr_measures has no unique index on (congress, number) and a bare row would shadow a
// curated one forever.
const PARENTS = [
  {
    id: "p815", number: "H.R. 815", measureType: "bill", congress: 118, chamber: "house",
    mustExist: "created by 20260810000000_vr_phase_a_117_118_landmarks.sql as P.L. 118-50",
  },
  {
    id: "p8595", number: "H.R. 8595", measureType: "bill", congress: 119, chamber: "house",
    mustExist: "already live as the FY2026 National Security, Department of State, and Related Programs appropriations bill",
  },
  {
    // Not in the database, and it carries no roll call and no issue mapping here. It
    // exists purely so H.Amdt. 478 has its vehicle: an amendment row with a null parent
    // reads as a free-floating position on nothing.
    id: "p4665", number: "H.R. 4665", measureType: "bill", congress: 118, chamber: "house",
    create: {
      title: "Department of State, Foreign Operations, and Related Programs Appropriations Act, 2024",
      shortTitle: "Department of State, Foreign Operations, and Related Programs Appropriations Act, 2024",
      summary:
        "FY2024 appropriations for the Department of State, USAID, international organizations and "
        + "foreign assistance accounts including Foreign Military Financing. Identity row only: it is "
        + "created here so the floor amendments voted against it have a vehicle to hang from, and it "
        + "carries no roll call and no issue mapping of its own in this pass.",
      introducedAt: "2023-07-14", status: "passed_house",
      sourceUrl: CG(118, "house-bill", 4665), sourceLabel: "Congress.gov",
      externalIds: { congressGovId: "hr4665-118", billStatus: BS(118, "hr", 4665) },
    },
  },
];

// ── The sixteen roll calls ──────────────────────────────────────────────────
// `citation` is what the Clerk's <legis-num> must read for an amendment (the underlying
// bill); `author` is what its <amendment-author> must read. `decisiveWhy` is required for
// any question outside the standing decisive set.
const SELECTIONS = [
  // ── Priority 1 — enacted / funding ────────────────────────────────────────
  {
    number: "H.R. 5323", measureType: "bill", congress: 117, chamber: "house",
    session: 1, roll: 275, actionType: "passage",
    create: {
      title: "Iron Dome Supplemental Appropriations Act, 2022",
      shortTitle: "Iron Dome Supplemental Appropriations Act, 2022",
      summary:
        "Appropriates $1,000,000,000 to the Department of Defense, Procurement, Defense-Wide, to "
        + "replace Iron Dome defense system interceptors and components expended during the May 2021 "
        + "conflict, and for other Israeli cooperative missile-defense procurement, designated as an "
        + "emergency requirement. Introduced as a standalone bill after Iron Dome replenishment was "
        + "removed from the continuing resolution. Passed the House 420-9 under suspension of the "
        + "rules on 2021-09-23; the Senate never voted it, and the replenishment was later funded in "
        + "the FY2022 consolidated appropriations act.",
      introducedAt: "2021-09-21", status: "passed_house",
      sourceUrl: CG(117, "house-bill", 5323), sourceLabel: "Congress.gov",
      externalIds: { congressGovId: "hr5323-117", billStatus: BS(117, "hr", 5323) },
    },
  },
  {
    number: "H.R. 6126", measureType: "bill", congress: 118, chamber: "house",
    session: 1, roll: 577, actionType: "passage",
    create: {
      title: "Israel Security Supplemental Appropriations Act, 2024",
      shortTitle: "Israel Security Supplemental Appropriations Act, 2024",
      summary:
        "FY2024 emergency supplemental appropriations of approximately $14.3 billion for Israel, "
        + "including Israeli cooperative missile-defense programs, Foreign Military Financing, and "
        + "replacement of U.S. defense articles transferred to Israel, fully offset by rescinding an "
        + "equal amount of Internal Revenue Service enforcement funding appropriated by the Inflation "
        + "Reduction Act. Passed the House 226-196 on 2023-11-02; the Senate did not take it up.",
      introducedAt: "2023-10-30", status: "passed_house",
      sourceUrl: CG(118, "house-bill", 6126), sourceLabel: "Congress.gov",
      externalIds: { congressGovId: "hr6126-118", billStatus: BS(118, "hr", 6126) },
    },
  },
  {
    number: "H.R. 7217", measureType: "bill", congress: 118, chamber: "house",
    session: 2, roll: 38, actionType: "passage",
    create: {
      title: "Israel Security Supplemental Appropriations Act, 2024",
      shortTitle: "Israel Security Supplemental Appropriations Act, 2024",
      summary:
        "FY2024 emergency supplemental appropriations of approximately $17.6 billion for Israel and "
        + "for U.S. Central Command operations in the region, with no offset, brought up under "
        + "suspension of the rules as a standalone alternative to the combined "
        + "Ukraine/Israel/Indo-Pacific supplemental. Failed 250-180 on 2024-02-06, short of the "
        + "two-thirds a suspension requires.",
      introducedAt: "2024-02-05", status: "failed",
      sourceUrl: CG(118, "house-bill", 7217), sourceLabel: "Congress.gov",
      externalIds: { congressGovId: "hr7217-118", billStatus: BS(118, "hr", 7217) },
    },
  },
  {
    // The Goal-6 slice. H.R. 815 mixes Israel aid with Ukraine, the Indo-Pacific, the
    // TikTok divest-or-ban and fentanyl sanctions; this is the Israel division on its
    // own, voted on its own, so the Israel verdict is not set by the other four.
    number: "H.R. 8034", measureType: "bill", congress: 118, chamber: "house",
    session: 2, roll: 152, actionType: "passage", parent: "p815",
    create: {
      title: "Israel Security Supplemental Appropriations Act, 2024",
      shortTitle: "Israel Security Supplemental Appropriations Act, 2024",
      summary:
        "FY2024 emergency supplemental appropriations of approximately $26.4 billion responding to "
        + "the situation in Israel: Israeli cooperative missile-defense programs including Iron Dome "
        + "and David's Sling, procurement of Iron Beam, Foreign Military Financing for Israel, "
        + "replacement of U.S. defense articles and services provided to Israel, U.S. Central Command "
        + "operations, and humanitarian assistance for Gaza and other affected populations. Passed the "
        + "House 366-58 on 2024-04-20 as a standalone division bill; H.Res. 1160 then folded this text "
        + "into H.R. 815, which was enacted as Division A of P.L. 118-50, and H.R. 8034 itself was laid "
        + "on the table. This is the only floor vote that recorded a position on the Israel division "
        + "alone.",
      introducedAt: "2024-04-17", status: "passed_house",
      sourceUrl: CG(118, "house-bill", 8034), sourceLabel: "Congress.gov",
      externalIds: {
        congressGovId: "hr8034-118", parentBill: "hr815-118",
        enactedAs: "P.L. 118-50 division A", billStatus: BS(118, "hr", 8034),
      },
    },
  },
  // ── Priority 2 — arms transfers and security cooperation ──────────────────
  {
    number: "H.R. 8369", measureType: "bill", congress: 118, chamber: "house",
    session: 2, roll: 217, actionType: "passage",
    create: {
      title: "Israel Security Assistance Support Act",
      shortTitle: "Israel Security Assistance Support Act",
      summary:
        "Requires the President to deliver to Israel the defense articles and defense services that "
        + "Congress has already authorized and appropriated, and withholds salaries and expenses "
        + "funding from the Office of the Secretary of Defense, the Office of the Secretary of State "
        + "and the National Security Council until the withheld shipments are delivered. Introduced "
        + "after the administration paused a shipment of 2,000-pound and 500-pound bombs. Passed the "
        + "House 224-187 on 2024-05-16; the Senate did not take it up.",
      introducedAt: "2024-05-13", status: "passed_house",
      sourceUrl: CG(118, "house-bill", 8369), sourceLabel: "Congress.gov",
      externalIds: { congressGovId: "hr8369-118", billStatus: BS(118, "hr", 8369) },
    },
  },
  ...[
    { n: 111, c: 118, s: 2, roll: 292, sale: "a foreign military sale of certain defense articles and services, including tank rounds and mortar cartridges", date: "2024-11-20" },
    { n: 113, c: 118, s: 2, roll: 293, sale: "a foreign military sale of certain defense articles and services, including JDAM guidance kits and small-diameter bombs", date: "2024-11-20" },
    { n: 115, c: 118, s: 2, roll: 294, sale: "a license amendment for the export of certain defense articles, defense services and technical data", date: "2024-11-20" },
    { n: 33, c: 119, s: 1, roll: 165, sale: "a foreign military sale of certain defense articles and services, including bomb bodies and guidance kits", date: "2025-04-03" },
    { n: 26, c: 119, s: 1, roll: 166, sale: "a foreign military sale of certain defense articles and services, including bulldozers and related equipment", date: "2025-04-03" },
    { n: 41, c: 119, s: 1, roll: 454, sale: "the export of certain defense articles, including assault rifles", date: "2025-07-30" },
    { n: 34, c: 119, s: 1, roll: 455, sale: "a foreign military sale of certain defense articles and services", date: "2025-07-30" },
    { n: 32, c: 119, s: 2, roll: 80, sale: "a foreign military sale of certain defense articles and services", date: "2026-04-15" },
    { n: 138, c: 119, s: 2, roll: 81, sale: "a foreign military sale of certain defense articles and services", date: "2026-04-15" },
  ].map((r) => ({
    number: `S.J.Res. ${r.n}`, measureType: "resolution", congress: r.c, chamber: "senate",
    session: r.s, roll: r.roll, actionType: "motion",
    decisiveWhy:
      "Under the Arms Export Control Act's expedited procedure a disapproval resolution the Foreign "
      + "Relations Committee has not reported reaches the floor only on a motion to discharge, and the "
      + "Senate has never carried one. The discharge vote is the entire substantive record of the "
      + "arms-sale question — senators debate the sale itself and vote it up or down under this "
      + "caption — not a procedural step toward a later vote that never comes.",
    create: {
      title: `A joint resolution providing for congressional disapproval of the proposed ${r.sale.replace(/^a /, "")} to Israel.`,
      shortTitle: null,
      summary:
        `Joint resolution of disapproval under section 36 of the Arms Export Control Act, which would `
        + `have blocked ${r.sale} to Israel. The motion to discharge it from the Committee on Foreign `
        + `Relations was rejected on ${r.date}, so the sale proceeded. A yea would have blocked the `
        + `transfer.`,
      introducedAt: null, status: "failed",
      sourceUrl: CG(r.c, "senate-joint-resolution", r.n), sourceLabel: "Congress.gov",
      externalIds: { congressGovId: `sjres${r.n}-${r.c}`, billStatus: BS(r.c, "sjres", r.n) },
    },
  })),
  // ── Priority 3 — amendments with a clear direction ────────────────────────
  {
    number: "H.Amdt. 478", measureType: "amendment", congress: 118, chamber: "house",
    session: 1, roll: 491, actionType: "amendment", parent: "p4665",
    citation: "H.R. 4665", author: "Tenney of New York Part D Amendment No. 69",
    decisiveWhy:
      "An amendment has no passage vote; agreeing to it is its disposition, and this roll is the only "
      + "floor record of the position. The repo already holds 28 amendment roll calls on this footing.",
    create: {
      title: "H.Amdt. 478 (Tenney) to H.R. 4665 — prohibit funds to move the U.S. Embassy in Israel out of Jerusalem",
      shortTitle: null,
      summary:
        "Amendment numbered 69 printed in Part D of House Report 118-216 to the FY2024 State and "
        + "Foreign Operations appropriations bill, prohibiting the use of funds to relocate the United "
        + "States Embassy in Israel out of Jerusalem. Agreed to 360-67 on 2023-09-28, with all 67 nays "
        + "cast by Democrats.",
      introducedAt: "2023-09-27", status: "passed_house",
      sourceUrl: CG_AMDT(118, 478), sourceLabel: "Congress.gov",
      externalIds: { congressGovId: "hamdt478-118", amendsBill: "hr4665-118", billStatus: BS(118, "hr", 4665) },
    },
  },
  {
    // Measure, roll call and 38 member votes are already live (measure id 104). It is
    // carried here so the seed is the complete record of the vertical; every write is an
    // ON CONFLICT DO NOTHING no-op except the israel_support mapping.
    number: "H.Amdt. 235", measureType: "amendment", congress: 119, chamber: "house",
    session: 2, roll: 243, actionType: "amendment", parent: "p8595",
    citation: "H.R. 8595", author: "Massie of Kentucky Part A Amendment No. 8",
    mustExist: "already live from the 119th-Congress ingest, mapped to america_first_fp and cut_spending",
    decisiveWhy:
      "An amendment has no passage vote; agreeing to it is its disposition. This roll and its 38 "
      + "attributed member votes are already live — it is restated here so the Israel vertical's seed "
      + "is complete, and every write for it is a no-op.",
  },
];

// ── Roll calls considered and declined, with the reason ──────────────────────
// A ledger, not a formality: a reader can see what was looked at and rejected, so a
// skip never reads as an oversight.
const DECLINED = [
  { number: "S.J.Res. 59", chamber: "senate", congress: 119, session: 1, roll: 328, totals: "47-53", why: "Iran war powers — directs removal of U.S. forces from hostilities, a question about American war powers rather than support for Israel; keeps its restraint / america_first_fp / strong_defense mappings" },
  { number: "H.Con.Res. 89", chamber: "house", congress: 119, session: 2, roll: 282, totals: "214-208", why: "Iran war powers — same reasoning as S.J.Res. 59; keeps its restraint mapping" },
  { number: "H.R. 8369", chamber: "house", congress: 118, session: 2, roll: 216, totals: "196-215", why: "motion to recommit — a procedural disposition, not a vote on the delivery requirement; roll 217 is the passage vote" },
  { number: "H.R. 6090", chamber: "house", congress: 118, session: 2, roll: 165, totals: "320-91", why: "Antisemitism Awareness Act — campus speech and Title VI enforcement, a civil-rights question that belongs to rights_balance / free_speech, not to U.S. support for Israel" },
  { number: "H.Res. 883", chamber: "house", congress: 118, session: 1, roll: 674, totals: "311-14", why: "resolution condemning antisemitism; out of scope for the same reason as H.R. 6090, and near-unanimous besides" },
  { number: "H.Res. 829", chamber: "house", congress: 118, session: 1, roll: 590, totals: "222-186", why: "censure of a member — discipline, not policy" },
  { number: "H.Res. 845", chamber: "house", congress: 118, session: 1, roll: 620, totals: "234-188", why: "censure of a member — discipline, not policy" },
  { number: "H.Res. 1160", chamber: "house", congress: 118, session: 2, roll: 150, totals: "316-94", why: "rule providing for consideration of the four supplemental divisions — rules are not policy" },
  { number: "H.Amdt. 55", chamber: "house", congress: 119, session: 1, roll: 207, totals: "6-422", why: "strike Israeli Cooperative Programs funding — 6 yeas separates nobody, and it is not the only 119th record of the position (H.Amdt. 235 is)" },
  { number: "S.Amdt. 786", chamber: "senate", congress: 117, session: 1, roll: 314, totals: "97-3", why: "deficit-neutral reserve fund on the Jerusalem embassy — no operative effect and near-unanimous" },
  { number: "S.Amdt. 3383", chamber: "senate", congress: 117, session: 2, roll: 285, totals: "99-0", why: "deficit-neutral reserve fund on Hamas — no operative effect and unanimous" },
  { number: "S.Res. 504", chamber: "senate", congress: 118, session: 2, roll: 8, totals: "72-11", why: "motion to table a motion to discharge — two layers of procedure above the substance" },
  { number: "H.R. 340", chamber: "house", congress: 119, session: 1, roll: 41, totals: "363-46", why: "Hamas financing sanctions — adjacent, and a 363-46 margin carries little discriminating signal; queued rather than mapped" },
  { number: "H.Amdt. 1065", chamber: "house", congress: 118, session: 2, roll: 328, totals: "217-193", why: "Gaza humanitarian pier oversight — a test of the administration's Gaza aid operation, not of U.S. support for Israel" },
  { number: "H.Amdt. 1052", chamber: "house", congress: 118, session: 2, roll: 318, totals: "218-192", why: "sourcing of Gaza Health Ministry casualty statistics — messaging, no operative provision on support for Israel" },
];

// ── XML helpers ─────────────────────────────────────────────────────────────
// The tag pattern requires the name to be followed by '>' or whitespace, so a lookup for
// <vote_result> cannot be answered by <vote_result_text> — a real hazard in the Senate
// documents, where the _text sibling comes first and carries a different string.
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
const MON_SHORT = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
const MON_LONG = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
};

async function get(url) {
  const r = await fetch(url, { headers: { "user-agent": "politidex-vr-ingest/1.0" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return await r.text();
}

// The standing decisive set, plus the two narrowly-admitted forms. Each exception is
// gated on the measure's shape as well as the caption, and on a written decisiveWhy —
// the same three conditions scripts/test-vr-vote-seed.mjs re-checks.
const DECISIVE = /^(on passage|on the motion \(motion to concur|on motion to concur|on concurring|on the conference report|on motion to suspend the rules and (pass|agree|concur))/i;
const AMENDMENT_VOTE = /^on agreeing to the amendment/i;
const DISCHARGE_VOTE = /^on the motion to discharge/i;
const IS_AMENDMENT = /^(h|s)\.\s*amdt\./i;
const IS_JOINT_RES = /^(h|s)\.j\.\s*res\./i;

function admits(question, sel) {
  const q = String(question || "");
  if (DECISIVE.test(q)) return "decisive";
  if (AMENDMENT_VOTE.test(q) && IS_AMENDMENT.test(sel.number) && sel.decisiveWhy) return "amendment";
  if (DISCHARGE_VOTE.test(q) && IS_JOINT_RES.test(sel.number) && sel.decisiveWhy) return "discharge";
  return null;
}

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

// ── House ───────────────────────────────────────────────────────────────────
const houseYear = (congress, session) => 2 * congress + 1787 + (session - 1);
// "H.R. 1319" → "H R 1319"; the Clerk's <legis-num> spelling replaces periods with
// spaces rather than dropping them.
const houseCitation = (number) => number.replace(/\./g, " ").replace(/\s+/g, " ").trim();

async function fetchHouse(sel, measure) {
  const year = houseYear(sel.congress, sel.session);
  const url = `https://clerk.house.gov/evs/${year}/roll${String(sel.roll).padStart(3, "0")}.xml`;
  const xml = await get(url);
  const at = `house ${year}/${sel.roll} (${sel.number})`;

  // For a bill the Clerk cites the bill; for an amendment it cites the BILL the amendment
  // is offered to, and names the amendment only in <amendment-author>. Both must match, or
  // this is a different vote than the selection claims.
  const wantCitation = sel.citation || sel.number;
  const legis = clean(tag(xml, "legis-num"));
  if (legis !== houseCitation(wantCitation)) {
    notes.push(`DROPPED ${at}: legis-num "${legis}" is not ${wantCitation}`);
    return null;
  }
  if (sel.author) {
    const author = clean(tag(xml, "amendment-author"));
    if (author !== sel.author) {
      notes.push(`DROPPED ${at}: amendment-author "${author}" is not "${sel.author}"`);
      return null;
    }
  }
  const question = clean(tag(xml, "vote-question"));
  const admitted = admits(question, sel);
  if (!admitted) {
    notes.push(`DROPPED ${at}: question "${question}" is not an admitted question form`);
    return null;
  }

  const [dd, mon, yyyy] = clean(tag(xml, "action-date")).split("-");
  const mo = MON_SHORT[mon];
  const hhmm = attr((xml.match(/<action-time[^>]*>/) || [""])[0], "time-etz") || "12:00";
  const voteDate = `${yyyy}-${String(mo).padStart(2, "0")}-${dd.padStart(2, "0")}T${hhmm}:00${etOffset(+yyyy, mo, +dd)}`;

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
  const result = /^passed$/i.test(raw) ? "passed" : /agreed/i.test(raw) ? "agreed_to" : /rejected/i.test(raw) ? "rejected" : "failed";
  return {
    chamber: "house", congress: sel.congress, session: sel.session, rollNumber: sel.roll, voteDate,
    question, voteDesc: clean(tag(xml, "vote-desc")),
    amendmentAuthor: sel.author || null,
    actionType: sel.actionType, result,
    requiredMajority: /suspend the rules/i.test(question) ? "two_thirds" : "simple",
    admittedAs: admitted, decisiveWhy: sel.decisiveWhy || null,
    totals, partyTotals: partyTotals(all),
    sourceUrl: url, sourceLabel: "U.S. House Clerk",
    measure, chamberVoting: all.length, rosterSkipped: unmapped,
    memberVotes: mapped.sort((a, b) => (a.politicianId < b.politicianId ? -1 : 1)),
  };
}

// ── Senate ──────────────────────────────────────────────────────────────────
const senateRoster = ROSTER
  .filter((r) => r.chamber === "senate" && r.name && r.state)
  .map((r) => ({ bioguide: r.bioguide, state: r.state, last: r.name.split(/\s+/).filter((w) => !/^[A-Z]\.$/.test(w)).slice(-1)[0] }));
// Roster rows who sat in the Senate during part of this window but whose entry carries no
// chamber/state because they have since left Congress for the executive branch.
const SENATE_ALUMNI = [{ bioguide: "R000595", state: "FL", last: "Rubio" }];
const senateLookup = [...senateRoster, ...SENATE_ALUMNI];

async function fetchSenate(sel, measure) {
  const base = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${sel.congress}${sel.session}/vote_${sel.congress}_${sel.session}_${String(sel.roll).padStart(5, "0")}`;
  const xml = await get(`${base}.xml`);
  const at = `senate ${sel.congress}/${sel.session}/${sel.roll} (${sel.number})`;

  const doc = tag(xml, "document") || "";
  const dt = clean(tag(doc, "document_type"));
  const dn = clean(tag(doc, "document_number"));
  const cited = clean(`${dt.endsWith(".") ? dt : dt + "."} ${dn}`);
  if (cited !== sel.number) {
    notes.push(`DROPPED ${at}: document "${cited}" is not ${sel.number}`);
    return null;
  }
  const question = clean(tag(xml, "vote_question_text") || tag(xml, "question"));
  const admitted = admits(question, sel);
  if (!admitted) {
    notes.push(`DROPPED ${at}: question "${question}" is not an admitted question form`);
    return null;
  }
  const dm = clean(tag(xml, "vote_date")).match(/^(\w+)\s+(\d+),\s+(\d{4}),\s+(\d+):(\d+)\s*(AM|PM)$/);
  if (!dm) {
    notes.push(`DROPPED ${at}: unparsed vote_date "${tag(xml, "vote_date")}"`);
    return null;
  }
  const mo = MON_LONG[dm[1]];
  const hh = (+dm[4] % 12) + (dm[6] === "PM" ? 12 : 0);
  const voteDate = `${dm[3]}-${String(mo).padStart(2, "0")}-${String(+dm[2]).padStart(2, "0")}T${String(hh).padStart(2, "0")}:${dm[5]}:00${etOffset(+dm[3], mo, +dm[2])}`;

  const all = [];
  let ambiguous = 0;
  for (const m of xml.matchAll(/<member>([\s\S]*?)<\/member>/g)) {
    const f = m[1];
    const last = clean(tag(f, "last_name"));
    const state = clean(tag(f, "state"));
    const hits = senateLookup.filter((r) => r.last === last && r.state === state);
    if (hits.length > 1) {
      ambiguous++;
      notes.push(`AMBIGUOUS ${at}: ${last} (${state}) matches ${hits.length} roster rows — skipped`);
    }
    all.push({
      bioguideId: hits.length === 1 ? hits[0].bioguide : null,
      party: clean(tag(f, "party")), state,
      position: POS[clean(tag(f, "vote_cast"))] || null,
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

  const cnt = tag(xml, "count") || "";
  const raw = clean(tag(xml, "vote_result"));
  const req = clean(tag(xml, "majority_requirement"));
  return {
    chamber: "senate", congress: sel.congress, session: sel.session, rollNumber: sel.roll, voteDate,
    question, voteDesc: clean(tag(xml, "vote_title")),
    actionType: sel.actionType,
    result: /rejected/i.test(raw) ? "rejected" : /passed/i.test(raw) ? "passed" : /agreed/i.test(raw) ? "agreed_to" : "failed",
    requiredMajority: req === "3/5" ? "three_fifths" : req === "2/3" ? "two_thirds" : "simple",
    admittedAs: admitted, decisiveWhy: sel.decisiveWhy || null,
    totals: {
      yea: +(tag(cnt, "yeas") || 0), nay: +(tag(cnt, "nays") || 0),
      present: +(tag(cnt, "present") || 0), notVoting: +(tag(cnt, "absent") || 0),
    },
    partyTotals: partyTotals(all),
    sourceUrl: `${base}.htm`, xmlUrl: `${base}.xml`, sourceLabel: "U.S. Senate",
    measure, chamberVoting: all.length, rosterSkipped: unmapped, rosterAmbiguous: ambiguous,
    memberVotes: mapped.sort((a, b) => (a.politicianId < b.politicianId ? -1 : 1)),
  };
}

// ── Run ─────────────────────────────────────────────────────────────────────
for (const sel of SELECTIONS) {
  const measure = {
    measureType: sel.measureType, congress: sel.congress, chamber: sel.chamber, number: sel.number,
    parent: sel.parent || null,
    ...(sel.create ? { title: sel.create.title, create: sel.create } : {}),
    ...(sel.mustExist ? { mustExist: sel.mustExist } : {}),
  };
  const v = sel.chamber === "senate" ? await fetchSenate(sel, measure) : await fetchHouse(sel, measure);
  if (v) votes.push(v);
  else notes.push(`!! ${sel.number} contributed NO roll call — the selection did not verify`);
}

votes.sort((a, b) => (a.voteDate < b.voteDate ? -1 : a.voteDate > b.voteDate ? 1 : 0));

const seed = {
  _comment:
    "Roll calls for the Support for Israel issue vertical (issue key israel_support), 117th-119th "
    + "Congress. Built by scripts/vr-build-israel-vote-seed.mjs from clerk.house.gov/evs and "
    + "senate.gov roll_call_votes XML; roll numbers were read from each measure's own govinfo "
    + "BILLSTATUS record and re-verified against the chamber's document before inclusion. Scope is "
    + "U.S. support for Israel itself — security assistance, weapons transfers, and floor attempts "
    + "to cut, block or condition that support. Iran war-powers resolutions, domestic antisemitism "
    + "measures, member-discipline votes and rules are out of scope and are listed in "
    + "declinedRollCalls with the reason. Two non-passage question forms are admitted, each for one "
    + "measure shape and each carrying its own decisiveWhy: 'On Agreeing to the Amendment' for "
    + "amendments, and 'On the Motion to Discharge' for joint resolutions, where the discharge vote "
    + "is the only floor record an Arms Export Control Act disapproval resolution ever gets. "
    + "memberVotes is already filtered to db/vr-member-map.json; unmapped members are counted in "
    + "rosterSkipped and never guessed. isParty is computed from the full chamber tally, and totals "
    + "is the full chamber tally, not the roster subset.",
  builtBy: "scripts/vr-build-israel-vote-seed.mjs",
  issueKey: "israel_support",
  congresses: [117, 118, 119],
  parents: PARENTS,
  rollCallCount: votes.length,
  memberVoteCount: votes.reduce((n, v) => n + v.memberVotes.length, 0),
  reversals: [
    {
      roll: "house 118/2 roll 152 (H.R. 8034)",
      declinedBy: "db/vr-phase-a-vote-seed.json",
      declinedWhy: "near-unanimous; no distinguishing signal",
      ingestedWhy:
        "That call was made for Phase A's general foreign-policy keys, where H.R. 8035's 311-112 "
        + "Ukraine split already carried the supplemental's signal and 366-58 added nothing. Under "
        + "israel_support the same 58 nays ARE the signal: they are the members who declined to fund "
        + "Israel's missile defence on a bill that asked nothing else of them, which is precisely the "
        + "distinction this key exists to record. Phase A's ledger entry is left standing as the "
        + "honest record of why that pass passed on it.",
    },
  ],
  declinedRollCalls: DECLINED,
  votes,
};
writeFileSync(resolve(REPO, "db/vr-israel-vote-seed.json"), JSON.stringify(seed, null, 1) + "\n");

for (const n of notes) console.log("NOTE:", n);
console.log(`\n${votes.length} roll calls, ${seed.memberVoteCount} attributed member votes\n`);
console.log("chamber  c/s  roll  measure        margin     req        admitted   attributed  skipped  question");
for (const v of votes) {
  console.log(
    `${v.chamber.padEnd(7)} ${v.congress}/${v.session} ${String(v.rollNumber).padStart(4)}  ` +
    `${v.measure.number.padEnd(14)} ${(v.totals.yea + "-" + v.totals.nay).padEnd(10)} ${v.requiredMajority.padEnd(10)} ` +
    `${v.admittedAs.padEnd(10)} ${String(v.memberVotes.length).padStart(10)} ${String(v.rosterSkipped).padStart(8)}  ${v.question.slice(0, 44)}`
  );
}
if (votes.length !== SELECTIONS.length) {
  console.error(`\n! ${SELECTIONS.length - votes.length} of ${SELECTIONS.length} selections failed verification — see the NOTEs above.`);
  process.exit(1);
}
