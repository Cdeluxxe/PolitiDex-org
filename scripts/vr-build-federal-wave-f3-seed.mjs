#!/usr/bin/env node
// Federal wave F3 — standalone Senate PRIMARYs for the chamber gap F2 left on the page.
//
// WHAT THIS WAVE IS FOR. F2 admitted three Senate rolls on two keys and cut the
// corpus-wide `vehicle_only` count from 911 to 816. It closed with a written chamber
// gap it could not act on: of the 105 keys the formal index reports on, SEVENTY have
// zero Senate PRIMARY instrument — no measure carrying the key at is_primary on which
// any senator has a recorded roll-call vote. On those keys a senator's row is written
// by the primary wall in stance-helpers.js rather than by their record: `incidental`
// ("Not about this issue") when they have four or more secondary acts and no primary,
// `vehicle_only` when every act arrived inside a package. The full before-table is in
// db/vr-federal-mapping-seed-f3.json under `census`, and it was rebuilt from
// vr_measure_issues x vr_measures with `node scripts/vr-federal-fpi.mjs --set all
// --chambers` BEFORE any candidate was looked at, per the brief's census-first rule.
// F2's candidate list was not reused.
//
// WHAT IT ADMITS. Three roll calls on two measures, both new to the corpus:
//
//   S.J.Res. 7     senate 119/1/238   50-38 Passed    2025-05-08   NEW MEASURE
//   H.J.Res. 140   senate 119/2/84    50-49 Passed    2026-04-16   NEW MEASURE
//   H.J.Res. 140   house  119/2/38   214-208 Passed   2026-01-21   same measure
//
// The two instruments are single-sentence Congressional Review Act joint resolutions,
// each disapproving one named agency rule, and each earns its key on the SUBJECT axis
// rather than on the process axis. The corpus is already consistent about that split
// and it is not a new claim: H.J.Res. 78 files a Fish and Wildlife Service disapproval
// as `lands_preserve` w90 PRIMARY with `gov_regulation` w70 underneath it, and
// H.J.Res. 88 and 89 file the California waiver disapprovals as `climate_action` w100
// PRIMARY with `gov_regulation` w60 underneath. `gov_regulation` takes the primary slot
// only where the rule's own subject is regulatory burden and nothing else (H.J.Res. 25,
// the broker-reporting rule; S.J.Res. 18, overdraft lending).
//
// WHY THE HOUSE ROLL IS HERE IN A SENATE WAVE. H.J.Res. 140 is a HOUSE measure. Filing
// its Senate passage vote and not its House passage vote would manufacture exactly the
// defect F2 named as an ingest gap under runbook rule 30's second corollary — a measure
// whose own chamber does not appear among its roll calls — while curing the mirror of it
// on the Senate side. So both halves of the measure's own record go in together. The
// wave's PURPOSE is still the Senate gap; the House roll is the same act's other half,
// not a second wave smuggled in.
//
// SOURCE DISCIPLINE. The chamber's own document is the vote. senate.gov's LIS roll-call
// XML and the House Clerk's EVS XML are fetched, verified against themselves (each
// document's own totals block must equal the member rows it lists) and against this
// file's claim table (congress, session, roll number, measure number, question, result,
// calendar day). A disagreement on any field drops the roll WHOLE rather than filing it
// with a repaired field, and a dropped roll aborts the build rather than writing a
// partial seed.
//
// ATTRIBUTION IS FAIL-CLOSED, AND ON THE SENATE SIDE IT IS DOUBLE-KEYED. F2 resolved
// senators <lis_member_id> → congress-legislators → bioguide → db/vr-member-map.json.
// This wave keeps that chain and adds the brief's second, independent key: the
// document's own (<last_name>, <state>) must be UNIQUE among the senate roster and must
// resolve to the SAME slug. Surnames come from congress-legislators `name.last` — never
// from splitting a display name, which is how "King-Hinds" and "Kennedy" collide. Where
// the two keys disagree, or where either is ambiguous, the voter is SKIPPED AND COUNTED
// with the reason recorded, never approximated. House voters resolve on the Clerk's own
// `name-id` bioguide attribute, which is the published identifier and needs no name
// matching at all.
//
// Writes db/vr-federal-wave-f3-vote-seed.json. The mapping decisions live in
// db/vr-federal-mapping-seed-f3.json and the insertable rows in db/vr-issue-seed.json;
// scripts/vr-gen-federal-wave-f3-migration.mjs folds all three into the migration.
// Nothing here touches the database.
//
// Usage: node scripts/vr-build-federal-wave-f3-seed.mjs [--pulled-at=YYYY-MM-DD]

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, ".netlify", "lis");
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36";
const PULLED_AT = (process.argv.find((a) => a.startsWith("--pulled-at=")) || "").slice(12) || "2026-08-29";
const pad5 = (n) => String(n).padStart(5, "0");
const pad3 = (n) => String(n).padStart(3, "0");
const tag = (s, n) => { const m = s.match(new RegExp(`<${n}>([\\s\\S]*?)</${n}>`)); return m ? m[1].trim() : ""; };
const nospace = (s) => String(s).replace(/\s+/g, "");
const squash = (s) => String(s).replace(/\s+/g, " ").trim();
// Compare surnames in one normal form. senate.gov's roll-call XML prints "Lujan" and
// congress-legislators publishes "Luján"; those are the same senator's same name written
// two ways, and a byte comparison reads them as two people. Decomposing to NFD and
// dropping the combining marks makes the comparison about the name rather than about
// which dataset typed the accent. This FOLDS, it does not loosen: the uniqueness test
// still runs after folding, so if folding ever made two roster senators collide the
// bucket would hold two slugs and the voter would be skipped and counted — which is the
// right answer, not a bug to work around.
const fold = (s) => String(s).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// The four dispositions each chamber records. Anything else is refused rather than
// folded in — a document that prints a fifth is a document we do not understand.
const SENATE_POSITIONS = { Yea: "yea", Nay: "nay", "Not Voting": "not_voting", Present: "present" };
const HOUSE_POSITIONS = { Yea: "yea", Nay: "nay", Aye: "yea", No: "nay", "Not Voting": "not_voting", Present: "present" };

// ── The document's clock, not ours ───────────────────────────────────────────
// senate.gov prints "May 8, 2025, 11:18 AM" and the Clerk prints "21-Jan-2026" plus
// "4:45 PM" — both Eastern wall time with no zone on them. The seed stores an
// offset-bearing ISO timestamp so the moment survives the trip into TIMESTAMPTZ: a bare
// '2026-01-21' is read as midnight in whatever zone the server happens to be set to,
// which can print the vote on the wrong day. Same parse and same offset table as the F1
// and F2 builders, so the three waves' rollcalls are comparable rows rather than three
// spellings of a timestamp.
const MON_LONG = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
};
const MON_ABBR = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};
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

if (!existsSync(CACHE)) mkdirSync(CACHE, { recursive: true });
async function cached(name, url) {
  const p = join(CACHE, name);
  if (existsSync(p)) return readFileSync(p, "utf8");
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/xml,text/xml,application/json,*/*" } });
  if (!r.ok) throw new Error(`${name}: ${r.status} ${r.statusText} for ${url}`);
  const t = await r.text();
  writeFileSync(p, t);
  return t;
}

// ── Published identifiers, from the authoritative datasets ───────────────────
// One pass over congress-legislators builds both indexes this wave needs: LIS id →
// bioguide (current wins, so a re-used LIS id resolves to the sitting senator rather
// than to whoever vacated the seat first) and bioguide → canonical surname. The surname
// comes from `name.last` as published. It is never derived by splitting a display name:
// "Kimberlyn King-Hinds" and "Mike Kennedy" already collided once in this repo's seeds
// on exactly that trick, and a hyphenated or multi-word surname breaks it silently.
async function legislatorIndexes() {
  const byLis = new Map();
  const surname = new Map();
  const add = (rows) => {
    for (const p of rows) {
      const bio = p.id && p.id.bioguide;
      if (!bio) continue;
      const lis = p.id && p.id.lis;
      if (lis && !byLis.has(lis)) byLis.set(lis, { bio, name: (p.name && (p.name.official_full || `${p.name.first} ${p.name.last}`)) || bio });
      if (!surname.has(bio) && p.name && p.name.last) surname.set(bio, String(p.name.last));
    }
  };
  add(JSON.parse(await cached("legislators-current.json", "https://unitedstates.github.io/congress-legislators/legislators-current.json")));
  add(JSON.parse(await cached("legislators-historical.json", "https://unitedstates.github.io/congress-legislators/legislators-historical.json")));
  return { byLis, surname };
}

// ── The three rolls, and what we claim about each before we read it ──────────
// Every field here is an assertion the document has to confirm. If it does not, the
// roll is dropped whole rather than filed with a repaired field.
const ROLLS = [
  {
    source: "senate", congress: 119, session: 1, roll: 238, voteDate: "2025-05-08",
    measureNumber: "S.J.Res. 7", question: "On the Joint Resolution",
    resultForm: "Joint Resolution Passed",
    actionType: "passage", result: "passed", requiredMajority: "simple",
    admittedAs: "decisive", decisiveWhy: null,
    create: {
      measureType: "resolution", chamber: "senate", congress: 119,
      title: "A joint resolution providing for congressional disapproval under chapter 8 of title 5, United States Code, of the rule submitted by the Federal Communications Commission relating to \"Addressing the Homework Gap Through the E-Rate Program\"",
      shortTitle: "Disapproving the FCC E-Rate Wi-Fi hotspot rule",
      status: "passed_senate",
      introducedAt: "2025-01-27",
      sourceUrl: "https://www.congress.gov/bill/119th-congress/senate-joint-resolution/7",
      sourceLabel: "Congress.gov",
      externalIds: { billType: "sjres", billNumber: 7, congress: 119, govinfoText: "BILLS-119sjres7es", disapprovedRule: "89 FR 67303" },
    },
  },
  {
    source: "senate", congress: 119, session: 2, roll: 84, voteDate: "2026-04-16",
    measureNumber: "H.J.Res. 140", question: "On the Joint Resolution",
    resultForm: "Joint Resolution Passed",
    actionType: "passage", result: "passed", requiredMajority: "simple",
    admittedAs: "decisive", decisiveWhy: null,
    create: {
      measureType: "resolution", chamber: "house", congress: 119,
      title: "Providing for congressional disapproval under chapter 8 of title 5, United States Code, of the rule submitted by the Bureau of Land Management relating to Public Land Order No. 7917 for Withdrawal of Federal Lands; Cook, Lake, and Saint Louis Counties, MN",
      shortTitle: "Disapproving the BLM Boundary Waters mineral withdrawal",
      status: "enacted",
      introducedAt: "2026-01-12",
      sourceUrl: "https://www.congress.gov/bill/119th-congress/house-joint-resolution/140",
      sourceLabel: "Congress.gov",
      externalIds: { billType: "hjres", billNumber: 140, congress: 119, govinfoText: "BILLS-119hjres140enr", publicLaw: "119-85", approvedAt: "2026-04-27", disapprovedRule: "88 FR 6308" },
    },
  },
  {
    // The House half of the SAME measure. `create: null` because the Senate entry above
    // introduces it; the generator de-duplicates measures by (congress, chamber, number).
    source: "house", congress: 119, session: 2, roll: 38, voteDate: "2026-01-21",
    measureNumber: "H.J.Res. 140", clerkLegisNum: "H J RES 140",
    question: "On Passage", resultForm: "Passed",
    actionType: "passage", result: "passed", requiredMajority: "simple",
    admittedAs: "decisive", decisiveWhy: null,
    create: null,
    sameMeasureAs: "senate 119/2/84",
  },
];

const { byLis: LIS, surname: SURNAME } = await legislatorIndexes();
const memberMapRaw = JSON.parse(readFileSync(join(ROOT, "db", "vr-member-map.json"), "utf8"));
const memberMap = memberMapRaw.map || {};
const rosterMembers = memberMapRaw.members || [];

// ── The second Senate key: unique (surname, state) over the roster ────────────
// Built from the roster, not from the document, so the uniqueness claim is about OUR
// roster and cannot be talked out of by a document that happens to list one Lee. Both
// halves come from published fields: the surname from congress-legislators `name.last`
// keyed by the roster's bioguide, the state from the roster row. A bioguide with no
// published surname is left OUT of the index rather than given a guessed one — its
// senator then fails the second key and is skipped and counted, which is the correct
// fail-closed outcome.
const SENATE_BY_NAME_STATE = new Map();
let rosterSenatorsIndexed = 0;
const rosterSenatorsWithoutSurname = [];
for (const m of rosterMembers) {
  if (String(m.chamber || "").toLowerCase() !== "senate") continue;
  const last = SURNAME.get(m.bioguide);
  if (!last) { rosterSenatorsWithoutSurname.push(`${m.bioguide} (${m.name})`); continue; }
  const k = `${fold(last)}|${String(m.state || "").toUpperCase()}`;
  const bucket = SENATE_BY_NAME_STATE.get(k) || [];
  bucket.push(m.slug);
  SENATE_BY_NAME_STATE.set(k, bucket);
  rosterSenatorsIndexed++;
}
const ambiguousRosterKeys = [...SENATE_BY_NAME_STATE.entries()].filter(([, v]) => v.length > 1);

console.log(`LIS → Bioguide: ${LIS.size} · published surnames: ${SURNAME.size} · member map: ${Object.keys(memberMap).length} slugs`);
console.log(`senate (surname, state) index: ${rosterSenatorsIndexed} of ${rosterMembers.filter((m) => m.chamber === "senate").length} roster senators`
  + `${rosterSenatorsWithoutSurname.length ? ` · no published surname: ${rosterSenatorsWithoutSurname.join(", ")}` : ""}`
  + `${ambiguousRosterKeys.length ? ` · AMBIGUOUS roster keys: ${ambiguousRosterKeys.map(([k, v]) => `${k}→${v.join("/")}`).join(", ")}` : ""}`);

// ── one roll at a time ───────────────────────────────────────────────────────
const votes = [];
const dropped = [];

for (const s of ROLLS) {
  const where = `${s.source} ${s.congress}/${s.session}/${s.roll}`;
  const why = [];
  let url, xml, lines, totals, voteDateIso = null, voteDesc = "", docPartyTotals = null;

  if (s.source === "senate") {
    url = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${s.congress}${s.session}/vote_${s.congress}_${s.session}_${pad5(s.roll)}.xml`;
    xml = await cached(`vote_${s.congress}_${s.session}_${pad5(s.roll)}.xml`, url);

    // Does the document agree it is the document we asked for?
    if (Number(tag(xml, "congress")) !== s.congress) why.push(`document congress ${tag(xml, "congress")} ≠ ${s.congress}`);
    if (Number(tag(xml, "session")) !== s.session) why.push(`document session ${tag(xml, "session")} ≠ ${s.session}`);
    if (Number(tag(xml, "vote_number")) !== s.roll) why.push(`document vote_number ${tag(xml, "vote_number")} ≠ ${s.roll}`);
    const docName = squash(tag(xml, "document_name"));
    if (nospace(docName) !== nospace(s.measureNumber)) why.push(`document says '${docName}', we filed it under '${s.measureNumber}'`);
    const qText = squash(tag(xml, "vote_question_text"));
    if (!qText.startsWith(s.question)) why.push(`question '${qText}' does not open with '${s.question}'`);
    const rText = squash(tag(xml, "vote_result"));
    if (rText !== s.resultForm) why.push(`vote_result '${rText}' ≠ the claimed '${s.resultForm}'`);
    voteDesc = squash(tag(xml, "document_title"));

    const dm = squash(tag(xml, "vote_date")).match(/^(\w+)\s+(\d+),\s*(\d{4}),\s*(\d+):(\d+)\s*(AM|PM)$/);
    if (!dm || !MON_LONG[dm[1]]) {
      why.push(`unparsed vote_date '${squash(tag(xml, "vote_date"))}'`);
    } else {
      const mo = MON_LONG[dm[1]], dd = +dm[2], hh = (+dm[4] % 12) + (dm[6] === "PM" ? 12 : 0);
      const day = `${dm[3]}-${String(mo).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
      if (day !== s.voteDate) why.push(`document is dated ${day}, we filed it under ${s.voteDate}`);
      voteDateIso = `${day}T${String(hh).padStart(2, "0")}:${dm[5]}:00${etOffset(+dm[3], mo, dd)}`;
    }

    const blocks = [...xml.matchAll(/<member>([\s\S]*?)<\/member>/g)].map((m) => m[1]);
    if (!blocks.length) why.push("no member rows");
    lines = [];
    for (const b of blocks) {
      const lis = tag(b, "lis_member_id");
      const pos = SENATE_POSITIONS[tag(b, "vote_cast")];
      if (!lis) { why.push("a member row carries no lis_member_id"); break; }
      if (!pos) { why.push(`vote_cast '${tag(b, "vote_cast")}' is outside the Senate's four dispositions`); break; }
      lines.push({ lis, bio: null, last: tag(b, "last_name"), party: tag(b, "party"), state: tag(b, "state"), position: pos });
    }
    const cnt = (xml.match(/<count>([\s\S]*?)<\/count>/) || [])[1] || "";
    totals = { yea: Number(tag(cnt, "yeas") || 0), nay: Number(tag(cnt, "nays") || 0),
               present: Number(tag(cnt, "present") || 0), notVoting: Number(tag(cnt, "absent") || 0) };
  } else {
    // ── House Clerk EVS ──────────────────────────────────────────────────────
    // Different document, same discipline. The Clerk's own <vote-totals> block must
    // equal the <recorded-vote> rows it lists, both overall and party by party, and the
    // legislation number, question, result and date must be what this file claims.
    url = `https://clerk.house.gov/evs/${s.voteDate.slice(0, 4)}/roll${pad3(s.roll)}.xml`;
    xml = await cached(`house_${s.voteDate.slice(0, 4)}_roll${pad3(s.roll)}.xml`, url);

    if (Number(tag(xml, "congress")) !== s.congress) why.push(`document congress ${tag(xml, "congress")} ≠ ${s.congress}`);
    const sess = squash(tag(xml, "session"));
    if (!new RegExp(`^${s.session}(st|nd|rd|th)?$`).test(sess)) why.push(`document session '${sess}' ≠ ${s.session}`);
    if (Number(tag(xml, "rollcall-num")) !== s.roll) why.push(`document rollcall-num ${tag(xml, "rollcall-num")} ≠ ${s.roll}`);
    const legis = squash(tag(xml, "legis-num"));
    if (nospace(legis) !== nospace(s.clerkLegisNum)) why.push(`document legis-num '${legis}' ≠ the claimed '${s.clerkLegisNum}'`);
    const qText = squash(tag(xml, "vote-question"));
    if (qText !== s.question) why.push(`vote-question '${qText}' ≠ the claimed '${s.question}'`);
    const rText = squash(tag(xml, "vote-result"));
    if (rText !== s.resultForm) why.push(`vote-result '${rText}' ≠ the claimed '${s.resultForm}'`);
    voteDesc = squash(tag(xml, "vote-desc"));

    // The Clerk prints the day as "21-Jan-2026" and the time TWICE: as display text
    // ("4:45 PM") and as a time-etz attribute ("16:45") that is already 24-hour Eastern.
    // The attribute is used, and the display text is required to agree with it — one is
    // machine-readable, the other is what a reader would check it against, and if they
    // disagree we do not know what time the vote was held.
    const dm = squash(tag(xml, "action-date")).match(/^(\d{1,2})-(\w{3})-(\d{4})$/);
    const at = xml.match(/<action-time\b[^>]*\btime-etz="(\d{1,2}):(\d{2})"[^>]*>([\s\S]*?)<\/action-time>/);
    if (!dm || !MON_ABBR[dm[2]] || !at) {
      why.push(`unparsed action-date/time '${squash(tag(xml, "action-date"))}' / '${(xml.match(/<action-time\b[^>]*>([\s\S]*?)<\/action-time>/) || [, ""])[1]}'`);
    } else {
      const mo = MON_ABBR[dm[2]], dd = +dm[1], yy = +dm[3];
      const hh = +at[1], mi = at[2];
      const shown = squash(at[3]).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
      if (!shown) why.push(`unparsed displayed action-time '${squash(at[3])}'`);
      else if (((+shown[1] % 12) + (shown[3] === "PM" ? 12 : 0)) !== hh || shown[2] !== mi) {
        why.push(`document's displayed time '${squash(at[3])}' ≠ its own time-etz ${at[1]}:${mi}`);
      }
      const day = `${yy}-${String(mo).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
      if (day !== s.voteDate) why.push(`document is dated ${day}, we filed it under ${s.voteDate}`);
      voteDateIso = `${day}T${String(hh).padStart(2, "0")}:${mi}:00${etOffset(yy, mo, dd)}`;
    }

    const blocks = [...xml.matchAll(/<recorded-vote>([\s\S]*?)<\/recorded-vote>/g)].map((m) => m[1]);
    if (!blocks.length) why.push("no recorded-vote rows");
    lines = [];
    for (const b of blocks) {
      const leg = b.match(/<legislator\b([^>]*)>/);
      const attr = (n) => { const m = leg && leg[1].match(new RegExp(`${n}="([^"]*)"`)); return m ? m[1] : ""; };
      const bio = attr("name-id");
      const pos = HOUSE_POSITIONS[squash(tag(b, "vote"))];
      if (!/^[A-Z]\d{6}$/.test(bio)) { why.push(`a recorded-vote row carries no bioguide name-id ('${bio}')`); break; }
      if (!pos) { why.push(`vote '${squash(tag(b, "vote"))}' is outside the House's recorded dispositions`); break; }
      lines.push({ lis: null, bio, last: attr("sort-field"), party: attr("party"), state: attr("state"), position: pos });
    }

    // The Clerk prints <totals-by-vote> as yea/nay/present/not-voting and one
    // <totals-by-party> per party. Both are checked: the overall block against the rows,
    // and each party block against the rows of that party. A party tally that disagrees
    // means either the document or our party attribution is wrong, and is_party is
    // computed from that attribution — so it drops the roll.
    const tv = (xml.match(/<totals-by-vote>([\s\S]*?)<\/totals-by-vote>/) || [])[1] || "";
    totals = { yea: Number(tag(tv, "yea-total") || 0), nay: Number(tag(tv, "nay-total") || 0),
               present: Number(tag(tv, "present-total") || 0), notVoting: Number(tag(tv, "not-voting-total") || 0) };
    docPartyTotals = {};
    for (const p of [...xml.matchAll(/<totals-by-party>([\s\S]*?)<\/totals-by-party>/g)].map((m) => m[1])) {
      const party = squash(tag(p, "party"));
      if (!party) continue;
      docPartyTotals[party] = { yea: Number(tag(p, "yea-total") || 0), nay: Number(tag(p, "nay-total") || 0) };
    }
  }

  // ── Does the document agree with itself? ───────────────────────────────────
  const seenByDoc = (lines || []).reduce((a, l) => ((a[l.position] = (a[l.position] || 0) + 1), a), {});
  const claim = { yea: totals.yea, nay: totals.nay, present: totals.present, not_voting: totals.notVoting };
  for (const k of ["yea", "nay", "present", "not_voting"]) {
    if (claim[k] !== (seenByDoc[k] || 0)) why.push(`document's own ${k} count ${claim[k]} ≠ ${seenByDoc[k] || 0} member rows`);
  }

  // ── Does it separate anybody? ─────────────────────────────────────────────
  // Runbook rule 11 / Utah §1121: below one tenth of the yea+nay pool on the losing
  // side, the vote differentiates nobody and is not admitted.
  const pool = totals.yea + totals.nay;
  const losing = Math.min(totals.yea, totals.nay);
  const marginShare = pool ? losing / pool : 0;
  if (marginShare < 0.1) why.push(`losing side is ${(marginShare * 100).toFixed(3)}% of the yea+nay pool — below the one-tenth bar`);

  // Party tally from THIS document, for is_party. It describes where a member stood
  // among their own colleagues on this vote and nothing else.
  const partyTotals = {};
  for (const l of lines || []) {
    if (l.position !== "yea" && l.position !== "nay") continue;
    const p = (partyTotals[l.party] ||= { yea: 0, nay: 0 });
    p[l.position]++;
  }
  // Where the document publishes its own party split (the House does), our count of it
  // must match. Party names are spelled differently by the two chambers, so the check
  // maps the Clerk's words onto the letters its own legislator rows carry.
  if (docPartyTotals) {
    const alias = { Republican: "R", Democratic: "D", Independent: "I" };
    for (const [name, t] of Object.entries(docPartyTotals)) {
      const letter = alias[name];
      if (!letter) { why.push(`document names a party '${name}' this builder has no letter for`); continue; }
      const ours = partyTotals[letter] || { yea: 0, nay: 0 };
      if (ours.yea !== t.yea || ours.nay !== t.nay) {
        why.push(`document's ${name} split ${t.yea}-${t.nay} ≠ our ${letter} rows ${ours.yea}-${ours.nay}`);
      }
    }
  }

  if (why.length) { dropped.push({ where, why }); continue; }

  // ── Attribution ───────────────────────────────────────────────────────────
  const memberVotes = [];
  const unresolvedLis = [];
  const unmappedBioguide = [];
  const ambiguousNameState = [];
  const noRosterNameState = [];
  const keyDisagreement = [];
  const seen = new Set();
  for (const l of lines) {
    let bio = l.bio;
    if (s.source === "senate") {
      const ent = LIS.get(l.lis);
      if (!ent) { unresolvedLis.push(l.lis); continue; }
      bio = ent.bio;
    }
    const slug = memberMap[bio];
    if (!slug) {
      const nm = s.source === "senate" ? (LIS.get(l.lis) || {}).name || bio : `${l.last} (${l.state})`;
      unmappedBioguide.push(`${bio} (${nm})`);
      continue;
    }
    // THE SECOND KEY, senate only. The document's own (last_name, state) has to be
    // unique among the roster's senators AND has to name the same slug the published
    // identifier chain named. Either failure skips the voter and is counted: a
    // (surname, state) that matches two roster senators cannot be assigned to one of
    // them, and a pair that resolves to a DIFFERENT slug than the bioguide means one of
    // the two sources is stale, which is not something to average.
    if (s.source === "senate") {
      const k = `${fold(l.last)}|${String(l.state || "").toUpperCase()}`;
      const bucket = SENATE_BY_NAME_STATE.get(k) || [];
      if (bucket.length === 0) {
        noRosterNameState.push(`${l.last} (${l.state})`);
        continue;
      }
      if (bucket.length > 1) {
        ambiguousNameState.push(`${l.last} (${l.state}) → ${bucket.join(", ")}`);
        continue;
      }
      if (bucket[0] !== slug) {
        keyDisagreement.push(`${l.last} (${l.state}): bioguide ${bio} → '${slug}', (surname, state) → '${bucket[0]}'`);
        continue;
      }
    }
    if (seen.has(slug)) throw new Error(`${where}: ${slug} appears twice — refusing to guess which cell is theirs`);
    seen.add(slug);
    const pt = partyTotals[l.party];
    const isParty = (l.position !== "yea" && l.position !== "nay") || !pt ? null
      : ((pt.yea >= pt.nay ? "yea" : "nay") === l.position ? "with_party" : "against_party");
    memberVotes.push({ lisMemberId: l.lis, bioguideId: bio, politicianId: slug, party: l.party, state: l.state, position: l.position, isParty });
  }
  memberVotes.sort((a, b) => a.politicianId.localeCompare(b.politicianId));

  const skipped = unresolvedLis.length + unmappedBioguide.length + noRosterNameState.length + ambiguousNameState.length + keyDisagreement.length;
  if (lines.length !== memberVotes.length + skipped) {
    throw new Error(`${where}: ${lines.length} listed but ${memberVotes.length} attributed and ${skipped} skipped — the skip ledger does not account for the difference`);
  }

  votes.push({
    chamber: s.source, congress: s.congress, session: s.session, rollNumber: s.roll,
    voteDate: voteDateIso, question: s.question,
    voteDesc,
    actionType: s.actionType, result: s.result, requiredMajority: s.requiredMajority,
    admittedAs: s.admittedAs, decisiveWhy: s.decisiveWhy,
    totals, partyTotals,
    marginShare: Number(marginShare.toFixed(5)),
    sourceUrl: url, sourceLabel: s.source === "senate" ? "U.S. Senate" : "U.S. House Clerk",
    measure: {
      measureType: s.create ? s.create.measureType : "resolution",
      congress: s.congress,
      chamber: s.create ? s.create.chamber : "house",
      number: s.measureNumber, parent: null,
      create: s.create,
      mustExist: s.create ? null
        : `Introduced by this same wave from the ${s.sameMeasureAs} entry — H.J.Res. 140 is one measure with two `
          + "passage votes, and filing only the Senate half would leave a House measure whose own chamber does not "
          + "appear among its roll calls. The generator de-duplicates measures by (congress, chamber, number), so "
          + "this roll attaches to the row that entry creates and adds no second measure and no second mapping.",
    },
    memberVotes,
    resolution: {
      listed: lines.length,
      attributed: memberVotes.length,
      skipped,
      unresolvedLis,
      unmappedBioguide,
      noRosterNameState,
      ambiguousNameState,
      keyDisagreement,
    },
  });
  console.log(`  ${where} ${s.measureNumber} ${totals.yea}-${totals.nay} · verified · attributed ${memberVotes.length}/${lines.length}`
    + (skipped ? ` · skipped ${skipped}` : "")
    + (unmappedBioguide.length ? ` (no slug: ${unmappedBioguide.length})` : "")
    + (noRosterNameState.length ? ` (surname+state not on roster: ${noRosterNameState.length})` : "")
    + (ambiguousNameState.length ? ` (ambiguous surname+state: ${ambiguousNameState.length})` : "")
    + (keyDisagreement.length ? ` (KEY DISAGREEMENT: ${keyDisagreement.join("; ")})` : ""));
}

if (dropped.length) { for (const d of dropped) console.error(`DROPPED ${d.where}: ${d.why.join("; ")}`); }
if (votes.length !== ROLLS.length) throw new Error(`${ROLLS.length - votes.length} roll(s) failed verification — refusing to write a partial seed`);

const memberVoteCount = votes.reduce((a, v) => a + v.memberVotes.length, 0);
writeFileSync(join(ROOT, "db", "vr-federal-wave-f3-vote-seed.json"), JSON.stringify({
  _comment: "Federal wave F3. Three verified roll calls on two Congressional Review Act joint resolutions, both new to the corpus: S.J.Res. 7 gives `broadband` its first PRIMARY instrument in either chamber, and H.J.Res. 140 gives `lands_preserve` its first Senate-reachable one. H.J.Res. 140's House passage vote is admitted alongside its Senate one because it is a House measure and filing only the Senate half would manufacture the chamber gap this wave exists to close. Built by scripts/vr-build-federal-wave-f3-seed.mjs; consumed by scripts/vr-gen-federal-wave-f3-migration.mjs and projected read-only by scripts/vr-federal-fpi.mjs.",
  builtBy: "scripts/vr-build-federal-wave-f3-seed.mjs",
  pulledAt: PULLED_AT,
  source: "senate.gov LIS roll-call XML (https://www.senate.gov/legislative/LIS/roll_call_votes/vote119{1,2}/) and House Clerk EVS XML (https://clerk.house.gov/evs/2026/). Senate voters resolved on TWO independent published keys that must agree: <lis_member_id> → congress-legislators → bioguide → db/vr-member-map.json, and a unique (congress-legislators name.last, state) pair over the senate roster. House voters resolved on the Clerk's own name-id bioguide attribute. The senate.gov vote menus and the Clerk's roll index were used ONLY to find which rolls exist.",
  attribution: {
    senate: "Double-keyed and fail-closed. A senator is attributed only when the bioguide chain and the unique (surname, state) pair name the SAME roster slug. A pair matching no roster senator, a pair matching two, and a pair naming a different slug than the bioguide are three different facts and are counted separately under resolution.noRosterNameState, resolution.ambiguousNameState and resolution.keyDisagreement. None of them is approximated.",
    house: "Clerk bioguide (the name-id attribute on each <legislator> row) → db/vr-member-map.json. No name matching is performed or needed. A bioguide with no roster slug is skipped and counted under resolution.unmappedBioguide.",
    surnameSource: "congress-legislators name.last, keyed by bioguide. Never derived by splitting a display name — that is how a hyphenated or multi-word surname silently collides.",
    rosterSenatorsIndexed,
    rosterSenatorsWithoutSurname,
    ambiguousRosterKeys: ambiguousRosterKeys.map(([k, v]) => `${k} → ${v.join(", ")}`),
  },
  rollCallCount: votes.length,
  memberVoteCount,
  skippedVoteCount: votes.reduce((a, v) => a + v.resolution.skipped, 0),
  newMeasures: votes.filter((v) => v.measure.create).map((v) => v.measure.number),
  votes,
}, null, 1) + "\n");
console.log(`\nwrote db/vr-federal-wave-f3-vote-seed.json — ${votes.length} rolls, ${memberVoteCount} member votes, `
  + `${votes.reduce((a, v) => a + v.resolution.skipped, 0)} skipped and counted`);
