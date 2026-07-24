// ─────────────────────────────────────────────────────────────────────────────
// vr-build-senate-seed.mjs — provenance builder for the curated Senate seed
// ─────────────────────────────────────────────────────────────────────────────
// The Senate side of the voting record cannot come from the Congress.gov API
// (it has no `senate-vote` resource — see db/vr-ingest-runbook.md). This script
// pulls the OFFICIAL senate.gov roll-call XML for a small, hand-picked set of
// high-salience 119th-Congress votes, resolves each voting senator against the
// committed member map, and writes db/vr-senate-seed.json — the curated seed the
// Senate source layer (netlify/lib/vr-senate-source.ts) serves into the ingest.
//
// It exists so the seed is AUDITABLE and REPRODUCIBLE: every position in the seed
// traces to a live senate.gov XML document, so no vote is ever invented. Re-run it
// to refresh or extend the set (edit ROLLCALLS below); it only WRITES the JSON —
// it never touches the database.
//
//   node scripts/vr-build-senate-seed.mjs
//
// Member resolution: the senate.gov XML identifies members by name/state/party and
// carries NO bioguide id, so we match on (last name, state) against the `members`
// review array in db/vr-member-map.json (which has bioguide + name + state). Only
// matched senators get a bioguide; the rest are still recorded (with party, for an
// accurate party-crossover tally) but are skipped at ingest time, never guessed —
// exactly the same posture as the House pull.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36";

// ── The curated set (edit here to extend) ────────────────────────────────────
// Each entry: the official roll-call number + how the vote maps to a measure. The
// measure's originating chamber follows the bill-type prefix (H.R.* → house) so a
// bill voted in both chambers resolves to ONE measure row (the House ingest already
// created H.R. 1; this attaches a Senate roll call to it).
const CONGRESS = 119;
const SESSION = 1;
const ROLLCALLS = [
  {
    roll: 372,
    actionType: "passage",
    measure: {
      measureType: "bill", number: "H.R. 1", chamber: "house",
      title: "H.R. 1 — One Big Beautiful Bill Act (reconciliation, title II of H. Con. Res. 14)",
      sourceUrl: "https://www.congress.gov/bill/119th-congress/house-bill/1",
    },
  },
  {
    roll: 570,
    actionType: "passage",
    measure: {
      measureType: "bill", number: "S. 2296", chamber: "senate",
      title: "S. 2296 — National Defense Authorization Act for Fiscal Year 2026",
      sourceUrl: "https://www.congress.gov/bill/119th-congress/senate-bill/2296",
    },
  },
  {
    roll: 478,
    actionType: "amendment",
    measure: {
      measureType: "amendment", number: "S.Amdt. 3428", chamber: "senate",
      title: "S.Amdt. 3428 (Johnson) to H.R. 3944 — to limit disclosures regarding earmarks",
      sourceUrl: "https://www.congress.gov/amendment/119th-congress/senate-amendment/3428",
    },
  },
  // NOTE: the marquee Iran War Powers vote (S.J.Res. 59, roll 328) is deliberately NOT
  // seeded here — it is already in the record (migration 20260721020000_seed_landmark_
  // measures_wave9 seeded the S.J.Res. 59 measure, its issue map, and its 47–53 roll
  // call). Re-seeding it under its precise roll number would duplicate that vote, so the
  // Senate foreign-policy record is left to the existing seed. Add NEW roll calls here.
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const pad5 = (n) => String(n).padStart(5, "0");
const xmlUrl = (roll) =>
  `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${CONGRESS}${SESSION}/vote_${CONGRESS}_${SESSION}_${pad5(roll)}.xml`;
const htmUrl = (roll) =>
  `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${CONGRESS}${SESSION}/vote_${CONGRESS}_${SESSION}_${pad5(roll)}.htm`;

const tag = (xml, name) => {
  const m = xml.match(new RegExp("<" + name + ">([\\s\\S]*?)</" + name + ">"));
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
};

function normPosition(cast) {
  const s = String(cast || "").toLowerCase().trim();
  if (s === "yea" || s === "yes" || s === "aye") return "yea";
  if (s === "nay" || s === "no") return "nay";
  if (s === "present") return "present";
  return "not_voting"; // "Not Voting", blank
}
function normParty(p) {
  const s = String(p || "").toUpperCase();
  if (s.startsWith("R")) return "R";
  if (s.startsWith("D")) return "D";
  return "I";
}
function normResult(r) {
  const s = String(r || "").toLowerCase();
  if (s.includes("passed") || s.includes("agreed")) return s.includes("agreed") ? "agreed_to" : "passed";
  if (s.includes("rejected") || s.includes("failed")) return "rejected";
  return s || null;
}
function normMajority(m) {
  const s = String(m || "").trim();
  if (s === "3/5") return "three_fifths";
  if (s === "2/3") return "two_thirds";
  return "simple";
}
// senate.gov date: "July 1, 2025,  11:56 AM" (Eastern). All curated votes fall in
// EDT (Mar–Nov), so pin the offset to -04:00 for a stable, real ISO timestamp.
function toISO(dateText) {
  const clean = String(dateText || "").replace(/,\s*$/, "").replace(/\s+/g, " ").trim();
  const d = new Date(clean + " GMT-0400");
  if (Number.isNaN(d.getTime())) throw new Error(`Unparseable vote_date: "${dateText}"`);
  return d.toISOString();
}

// Build a (lastName|state) → {bioguide, slug} index from the member map review list.
const memberMap = JSON.parse(readFileSync(resolve(REPO, "db/vr-member-map.json"), "utf8"));
const senators = (memberMap.members || []).filter((m) => m.chamber === "senate");
const lastName = (name) => name.trim().split(/\s+/).pop().toLowerCase();
const byNameState = new Map(senators.map((s) => [`${lastName(s.name)}|${s.state}`, s]));

async function fetchText(url) {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/xml,text/xml,*/*" } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return await res.text();
}

// ── Main ─────────────────────────────────────────────────────────────────────
const out = [];
let matchedTotal = 0;
for (const entry of ROLLCALLS) {
  const xml = await fetchText(xmlUrl(entry.roll));
  const yeas = Number(tag(xml, "yeas")) || 0;
  const nays = Number(tag(xml, "nays")) || 0;
  const present = Number(tag(xml, "present")) || 0;
  const absent = Number(tag(xml, "absent")) || 0;

  const members = [...xml.matchAll(/<member>([\s\S]*?)<\/member>/g)].map((m) => {
    const g = (t) => tag(m[0], t);
    const state = g("state");
    const key = `${g("last_name").toLowerCase()}|${state}`;
    const hit = byNameState.get(key);
    const mv = {
      name: g("member_full") || `${g("first_name")} ${g("last_name")}`.trim(),
      state,
      party: normParty(g("party")),
      position: normPosition(g("vote_cast")),
    };
    if (hit) mv.bioguideId = hit.bioguide; // resolvable → attributed at ingest
    return mv;
  });
  const matched = members.filter((m) => m.bioguideId).length;
  matchedTotal += matched;

  out.push({
    chamber: "senate",
    congress: CONGRESS,
    session: SESSION,
    rollNumber: entry.roll,
    voteDate: toISO(tag(xml, "vote_date")),
    question: tag(xml, "question") || null,
    actionType: entry.actionType,
    result: normResult(tag(xml, "vote_result")),
    requiredMajority: normMajority(tag(xml, "majority_requirement")),
    totals: { yea: yeas, nay: nays, present, notVoting: absent },
    sourceUrl: htmUrl(entry.roll),
    sourceLabel: "U.S. Senate",
    measure: {
      measureType: entry.measure.measureType,
      number: entry.measure.number,
      title: entry.measure.title,
      congress: CONGRESS,
      chamber: entry.measure.chamber,
      sourceUrl: entry.measure.sourceUrl,
      sourceLabel: "Congress.gov",
    },
    memberVotes: members,
  });
  console.log(
    `roll ${entry.roll}: ${members.length} senators, ${matched} mapped/attributed, ` +
    `${yeas}-${nays} → ${entry.measure.number}`
  );
}

const payload = {
  _comment:
    "Curated Senate roll-call seed for the Voting Record. Built from official senate.gov " +
    "roll-call XML by scripts/vr-build-senate-seed.mjs — every position traces to a live " +
    "senate.gov document; no vote is invented. Served by netlify/lib/vr-senate-source.ts.",
  source: "senate.gov roll-call XML (LIS)",
  congress: CONGRESS,
  session: SESSION,
  builtFrom: ROLLCALLS.map((r) => xmlUrl(r.roll)),
  rollCallCount: out.length,
  votes: out,
};
writeFileSync(resolve(REPO, "db/vr-senate-seed.json"), JSON.stringify(payload, null, 2) + "\n");
console.log(`\nWrote db/vr-senate-seed.json — ${out.length} roll calls, ${matchedTotal} attributed member votes.`);
