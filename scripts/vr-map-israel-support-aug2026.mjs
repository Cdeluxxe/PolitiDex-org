#!/usr/bin/env node
// ---------------------------------------------------------------------------
// vr-map-israel-support-aug2026.mjs — curated israel_support mappings
// ---------------------------------------------------------------------------
// Adds the Support for Israel vertical's measure→issue rows to db/vr-issue-seed.json.
// Sixteen measures, one per roll call in db/vr-israel-vote-seed.json.
//
//   node scripts/vr-map-israel-support-aug2026.mjs [--write]
//
// DIRECTION IS FIXED BY THE CHIP, NOT BY THE VOTE'S OUTCOME
// -------------------------------------------------------
// The israel_support chip reads "Keep backing Israel with U.S. security aid, weapons and
// sanctions on its adversaries", so every row below is coded against that sentence:
// `yea_supports` where a yea continues or increases U.S. backing, `yea_opposes` where a
// yea cuts, blocks or conditions it. Nine of the sixteen are `yea_opposes` — the arms-sale
// disapproval resolutions and the Massie defund amendment — which is why the vertical can
// separate members at all. A key whose every mapping ran one way would rank nobody.
//
// SLICING: H.R. 8034, NOT H.R. 815
// -------------------------------
// The 2024 national-security supplemental became law as P.L. 118-50 with five divisions:
// Israel, Ukraine, the Indo-Pacific, TikTok divest-or-ban, and fentanyl sanctions. H.R.
// 815 is already mapped to foreign_balance, america_first_fp, restraint, tech_balance and
// immig_fentanyl, and it stays there — it is NOT given an israel_support row, because a
// member's vote on that package cannot be read as a verdict on Israel when four unrelated
// policies rode with it. The House voted the divisions separately on 2024-04-20, and
// H.R. 8034 is the Israel division standing alone: 366-58 on Israel's missile defence and
// nothing else. That is the row that carries the issue. It mirrors how H.R. 8035 already
// carries the Ukraine substance for the same package.
//
// ONE SECONDARY KEY, AND WHY ONLY ONE
// ----------------------------------
// H.R. 6126 also gets cut_spending, because its entire $14.3 billion was offset by
// rescinding IRS enforcement money appropriated by the Inflation Reduction Act — that
// offset, not the Israel aid, is what drew 196 nays from members who had voted for Israel
// aid before and would again. Recording only the Israel reading of that roll would put
// words in their mouths. There is no IRS-specific or tax-enforcement key among the 109,
// so cut_spending is the closest honest fit; it is weighted 60 and not primary, because
// the rescission is the bill's offset rather than its purpose.
//
// Nothing else gets a second key. H.R. 8369 compels delivery of withheld articles and so
// touches executive discretion over arms transfers, but checks_balances exists for
// separation-of-powers questions between the branches generally, and a member voting to
// force out bombs the administration paused is voting about Israel, not about Article II.
// Mapping it there would move percentages on an issue the vote was not about — the exact
// failure the israel_support key was created to stop. Leaving these measures single-key
// means the coverage report's Gap 1b will list them as thin; that is a property of a
// metric that counts keys rather than primacy, and the honest answer is to report it, not
// to pad the mapping.
//
// H.Amdt. 235 is already live with america_first_fp (primary) and cut_spending. Only the
// new israel_support row is added, non-primary, so no curated row is rewritten; is_primary
// is display metadata for the bill-detail page and has no effect on scoring, so the
// display primary staying on america_first_fp is a cosmetic leftover, queued in the
// runbook rather than fixed by editing a live row in an additive pass.
//
// H.R. 4665 is created by the migration as H.Amdt. 478's parent vehicle and gets no
// mapping at all: it is a full State-Foreign Operations appropriations bill whose Israel
// content is one line item among hundreds, and no roll call on it is ingested here.
// ---------------------------------------------------------------------------
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const SEED = path.join(ROOT, "db/vr-issue-seed.json");
const WRITE = process.argv.includes("--write");
const KEY = "israel_support";

const CG = (c, kind, n) => `https://www.congress.gov/bill/${c}th-congress/${kind}/${n}`;
const BS = (c, t, n) => `https://www.govinfo.gov/bulkdata/BILLSTATUS/${c}/${t}/BILLSTATUS-${c}${t}${n}.xml`;

// A yea on an arms-sale disapproval resolution blocks the transfer, so all nine are
// yea_opposes. Each rationale names the articles the resolution would have stopped,
// because that is the operative provision — the resolving clause disapproves one
// specific certified sale, not a policy in general.
const ARMS = [
  { n: 111, c: 118, what: "tank rounds and 120mm mortar cartridges", date: "2024-11-20", tally: "18-79" },
  { n: 113, c: 118, what: "JDAM guidance kits and small-diameter bombs", date: "2024-11-20", tally: "19-78" },
  { n: 115, c: 118, what: "defense articles, services and technical data under an export license amendment", date: "2024-11-20", tally: "17-80" },
  { n: 33, c: 119, what: "bomb bodies and guidance kits", date: "2025-04-03", tally: "15-82" },
  { n: 26, c: 119, what: "bulldozers and related equipment", date: "2025-04-03", tally: "15-83" },
  { n: 41, c: 119, what: "assault rifles", date: "2025-07-30", tally: "27-70" },
  { n: 34, c: 119, what: "defense articles and services", date: "2025-07-30", tally: "24-73" },
  { n: 32, c: 119, what: "defense articles and services", date: "2026-04-15", tally: "40-59" },
  { n: 138, c: 119, what: "defense articles and services", date: "2026-04-15", tally: "36-63" },
];

const ADDITIONS = [
  {
    measureType: "bill", congress: 117, chamber: "house", number: "H.R. 5323",
    sourceUrl: CG(117, "house-bill", 5323),
    _note:
      "The only 117th-Congress roll call in this vertical, and its discriminating power is weak: "
      + "420-9 under suspension. It is mapped because the mission's priority order puts enacted and "
      + "funding measures first and this is the only record the 117th offers on the issue, not because "
      + "nine nays separate a chamber. Read the 117th column of any israel_support score as thin.",
    issues: [{
      issueKey: KEY, weight: 100, isPrimary: true, supportMeaning: "yea_supports",
      sourceUrl: BS(117, "hr", 5323),
      rationale:
        "Appropriates $1,000,000,000 to Procurement, Defense-Wide to replace Iron Dome interceptors "
        + "and components Israel expended in the May 2021 conflict, and for Israeli cooperative "
        + "missile-defense procurement, designated as an emergency requirement. Introduced as a "
        + "standalone bill after the same money was stripped from the continuing resolution, so the "
        + "vote is on Israeli missile defense and nothing else. A yea funds it.",
    }],
  },
  {
    measureType: "amendment", congress: 118, chamber: "house", number: "H.Amdt. 478",
    sourceUrl: "https://www.congress.gov/amendment/118th-congress/house-amendment/478",
    issues: [{
      issueKey: KEY, weight: 100, isPrimary: true, supportMeaning: "yea_supports",
      sourceUrl: BS(118, "hr", 4665),
      rationale:
        "Amendment numbered 69 printed in Part D of House Report 118-216 to the FY2024 State and "
        + "Foreign Operations appropriations bill, prohibiting the use of funds to relocate the United "
        + "States Embassy in Israel out of Jerusalem — an operative funding limitation locking in "
        + "recognition of Jerusalem as the capital. Agreed to 360-67; every nay was a Democrat. A yea "
        + "entrenches the recognition.",
    }],
  },
  {
    measureType: "bill", congress: 118, chamber: "house", number: "H.R. 6126",
    sourceUrl: CG(118, "house-bill", 6126),
    issues: [
      {
        issueKey: KEY, weight: 100, isPrimary: true, supportMeaning: "yea_supports",
        sourceUrl: BS(118, "hr", 6126),
        rationale:
          "FY2024 emergency supplemental of roughly $14.3 billion for Israel: Israeli cooperative "
          + "missile-defense programs, Foreign Military Financing, and replacement of U.S. defense "
          + "articles transferred to Israel after October 7. A yea appropriates the aid.",
      },
      {
        issueKey: "cut_spending", weight: 60, isPrimary: false, supportMeaning: "yea_supports",
        sourceUrl: BS(118, "hr", 6126),
        rationale:
          "The bill offsets every dollar by rescinding an equal amount of Internal Revenue Service "
          + "enforcement funding appropriated by the Inflation Reduction Act, so a yea also cancels "
          + "that appropriation. This offset, not the Israel aid, is what drew the 196 nays, and the "
          + "mapping records it so the Israel reading is not the only meaning attached to the roll.",
      },
    ],
  },
  {
    measureType: "bill", congress: 118, chamber: "house", number: "H.R. 7217",
    sourceUrl: CG(118, "house-bill", 7217),
    issues: [{
      issueKey: KEY, weight: 100, isPrimary: true, supportMeaning: "yea_supports",
      sourceUrl: BS(118, "hr", 7217),
      rationale:
        "FY2024 emergency supplemental of roughly $17.6 billion for Israel and for U.S. Central "
        + "Command operations in the region, with no offset, brought up under suspension as a "
        + "standalone alternative to the combined Ukraine/Israel/Indo-Pacific package. Failed 250-180 "
        + "against the two-thirds a suspension requires. A yea appropriates the aid.",
    }],
  },
  {
    measureType: "bill", congress: 118, chamber: "house", number: "H.R. 8034",
    sourceUrl: CG(118, "house-bill", 8034),
    _note:
      "The Israel division of the 2024 national-security supplemental, voted on its own. H.R. 815 "
      + "keeps its five existing keys and is deliberately NOT given an israel_support row: it carried "
      + "Ukraine, the Indo-Pacific, TikTok divest-or-ban and fentanyl sanctions alongside Israel, and "
      + "no single verdict on Israel can be read out of a vote on all five. This bill is that verdict "
      + "— 366-58 on Israel alone — and it became Division A of P.L. 118-50. Same construction as "
      + "H.R. 8035, which carries the package's Ukraine substance.",
    issues: [{
      issueKey: KEY, weight: 100, isPrimary: true, supportMeaning: "yea_supports",
      sourceUrl: BS(118, "hr", 8034),
      rationale:
        "FY2024 emergency supplemental of roughly $26.4 billion for the situation in Israel: Israeli "
        + "cooperative missile-defense programs including Iron Dome and David's Sling, Iron Beam "
        + "procurement, Foreign Military Financing for Israel, replacement of U.S. defense articles "
        + "and services provided to Israel, U.S. Central Command operations, and humanitarian "
        + "assistance for Gaza. Enacted as Division A of P.L. 118-50. The 58 nays are members who "
        + "declined to fund Israel's defense on a bill that asked nothing else of them, which makes "
        + "this the most direct enacted test of the issue in the window. A yea funds it.",
    }],
  },
  {
    measureType: "bill", congress: 118, chamber: "house", number: "H.R. 8369",
    sourceUrl: CG(118, "house-bill", 8369),
    _note:
      "Not mapped to checks_balances, though it does constrain executive discretion. That key is for "
      + "separation-of-powers questions between the branches as such; a member voting to force out "
      + "bombs the administration had paused is voting about Israel. Filing it under checks_balances "
      + "would move percentages on an issue the vote was not about.",
    issues: [{
      issueKey: KEY, weight: 100, isPrimary: true, supportMeaning: "yea_supports",
      sourceUrl: BS(118, "hr", 8369),
      rationale:
        "Requires the President to deliver to Israel the defense articles and services Congress has "
        + "already authorized and appropriated, and withholds salaries-and-expenses funding from the "
        + "Office of the Secretary of Defense, the Office of the Secretary of State and the National "
        + "Security Council until the withheld shipments go out. Introduced after the administration "
        + "paused a shipment of 2,000-pound and 500-pound bombs. A yea forces the transfer.",
    }],
  },
  ...ARMS.map((a) => ({
    measureType: "resolution", congress: a.c, chamber: "senate", number: `S.J.Res. ${a.n}`,
    sourceUrl: CG(a.c, "senate-joint-resolution", a.n),
    issues: [{
      issueKey: KEY, weight: 100, isPrimary: true, supportMeaning: "yea_opposes",
      sourceUrl: BS(a.c, "sjres", a.n),
      rationale:
        `Joint resolution of disapproval under section 36 of the Arms Export Control Act whose `
        + `resolving clause would have blocked the certified transfer to Israel of ${a.what}. The `
        + `motion to discharge it from the Committee on Foreign Relations was rejected ${a.tally} on `
        + `${a.date}, and the sale proceeded. A yea blocks the weapons; a nay lets them go.`,
    }],
  })),
];

// H.Amdt. 235 is already in the seed and already live. One row is appended to it; the
// existing america_first_fp and cut_spending rows are left byte-for-byte alone.
const AMEND_EXISTING = {
  number: "H.Amdt. 235", congress: 119, chamber: "house",
  issue: {
    issueKey: KEY, weight: 95, isPrimary: false, supportMeaning: "yea_opposes",
    sourceUrl: BS(119, "hr", 8595),
    rationale:
      "Prohibits funds appropriated by the FY2026 National Security and State Department "
      + "appropriations Act from being used for Israel and reduces the Foreign Military Financing "
      + "Program account by $3.3 billion accordingly — a direct floor attempt to zero out U.S. "
      + "security assistance to Israel. Failed 104-314 with 10 members voting present. A yea ends the "
      + "assistance.",
  },
};

const seed = JSON.parse(fs.readFileSync(SEED, "utf8"));
const measures = seed.measures;
const mkey = (m) => `${m.congress}|${m.chamber}|${String(m.number).toLowerCase().replace(/[.\s]/g, "")}`;
const index = new Map(measures.map((m) => [mkey(m), m]));

const added = [];
const skipped = [];

for (const a of ADDITIONS) {
  const existing = index.get(mkey(a));
  if (existing) {
    // Not expected for these fifteen; if a later pass maps one of them first, merge row
    // by row rather than clobbering somebody else's curation.
    for (const iss of a.issues) {
      if (existing.issues.some((x) => x.issueKey === iss.issueKey)) { skipped.push(`${a.number}/${iss.issueKey}`); continue; }
      existing.issues.push(iss);
      added.push(`${a.number}/${iss.issueKey} (merged into existing entry)`);
    }
    continue;
  }
  measures.push(a);
  index.set(mkey(a), a);
  for (const iss of a.issues) added.push(`${a.number}/${iss.issueKey}`);
}

const target = index.get(mkey(AMEND_EXISTING));
if (!target) {
  console.error(`! ${AMEND_EXISTING.number} is not in db/vr-issue-seed.json — refusing to write`);
  process.exit(1);
}
if (target.issues.some((x) => x.issueKey === KEY)) skipped.push(`${AMEND_EXISTING.number}/${KEY}`);
else { target.issues.push(AMEND_EXISTING.issue); added.push(`${AMEND_EXISTING.number}/${KEY} (added to live entry)`); }

// Every key written has to exist in the generated allow-list, or the mapping scores
// against a chip the UI cannot render.
const allow = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, "db/issue-keys.json"), "utf8")).keys);
const bad = [...new Set([...ADDITIONS.flatMap((a) => a.issues.map((i) => i.issueKey)), KEY])].filter((k) => !allow.has(k));
if (bad.length) {
  console.error(`! issue key(s) not in db/issue-keys.json: ${bad.join(", ")} — refusing to write`);
  process.exit(1);
}

console.log(`Israel support mappings — ${added.length} row(s) to add, ${skipped.length} already present`);
for (const a of added) console.log(`  + ${a}`);
for (const s of skipped) console.log(`  = ${s} (no-op)`);
console.log(`\nseed: ${measures.length} measures, ${measures.reduce((n, m) => n + m.issues.length, 0)} rows`);

if (!WRITE) { console.log("\nDry run. Re-run with --write to apply."); process.exit(0); }
fs.writeFileSync(SEED, JSON.stringify(seed, null, 1) + "\n", "utf8");
console.log("\nWrote db/vr-issue-seed.json");
