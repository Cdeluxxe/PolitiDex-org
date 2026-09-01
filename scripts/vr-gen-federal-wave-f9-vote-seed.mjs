// ════════════════════════════════════════════════════════════════════════════
// Federal wave F9 — vote seed builder
// ════════════════════════════════════════════════════════════════════════════
//
// Reads seven clerk.house.gov roll-call documents — the seven contested House
// amendment rolls F9 admitted out of the 51 F7 left unread — and writes
// db/vr-federal-wave-f9-vote-seed.json.
//
// SIX THINGS THIS FILE IS CAREFUL ABOUT.
//
// 1. ONE CHAMBER, ONE ATTRIBUTION PATH, FAIL-CLOSED. The clerk stamps each
//    legislator with `name-id`, which is a bioguide, so the path is bioguide →
//    db/vr-member-map.json → roster slug and nothing else. A bioguide the map
//    does not carry is SKIPPED and COUNTED in _unresolvedBioguides. There is no
//    surname fallback in this wave because there is no need for one, and a
//    fallback nobody needs is a fallback nobody has tested.
//
// 2. THE TALLY IS THE CHAMBER'S, NEVER THE ATTRIBUTED SUBSET. Totals come from
//    <totals-by-vote>. The roster admits 224 slugs against a chamber of 435, so
//    recomputing a tally from the attributed rows would publish a 221-vote House.
//    F6's recorded bug is the same failure in the other chamber: a display string
//    "51-42" parsed as a number is 5142, which puts the losing side at zero and
//    makes every roll look unanimous.
//
// 3. THE ROLL IS CHECKED AGAINST THE PARENT, AND THE PARENT IS NOT THE MEASURE.
//    On an amendment roll the clerk's <legis-num> is the PARENT bill, so it is
//    compared against r.parent, and the measure this act belongs to is the
//    H.Amdt. — read from the bridge, asserted against <amendment-num>. Getting
//    this backwards is how a wave ends up with seven more copies of the NDAA.
//
// 4. EVERY ROLL DECLARES THE FORM THAT ADMITTED IT, AND OWES A SENTENCE. All
//    seven are 'On Agreeing to the Amendment', which is not a decisive form — it
//    is the narrowly admitted amendment exception, gated on an H.Amdt. number and
//    on a written decisiveWhy per roll. The gate below is the one
//    scripts/test-vr-vote-seed.mjs re-checks; it is copied, not re-derived.
//
// 5. THE POSITION VOCABULARY IS CLOSED. Yea/Aye → yea, Nay/No → nay, Present →
//    present, Not Voting/Absent → not_voting, and anything else is a hard failure,
//    because a position the chamber recorded and this script did not understand is
//    a bug in this script.
//
// 6. OVER-ATTRIBUTION REFUSES THE ROLL. F8's pull rule: if the attributed yea +
//    nay rows exceed the document's own yea + nay totals, something has been
//    double-counted and the roll dies here rather than shipping a tally the
//    chamber never recorded.
//
// Usage: node scripts/vr-gen-federal-wave-f9-vote-seed.mjs
//        F9_XML_DIR overrides the XML cache (default /tmp/f9xml).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = process.env.F9_XML_DIR || "/tmp/f9xml";
const MEMBER_MAP = JSON.parse(readFileSync(join(ROOT, "db", "vr-member-map.json"), "utf8"));
const MAP = MEMBER_MAP.map || {};

// ── The seven admitted rolls ────────────────────────────────────────────────
// congress/session/roll/year and the H.Amdt. number are the identity. Tally,
// timestamp, result and required majority are read out of the document so they
// cannot drift from the source. `section` is the section of the parent's ENGROSSED
// text in which this amendment's operative words were found and read — it is
// recorded here because "which words did you actually read?" is the question the
// text gate exists to answer.
const WHY = (what) =>
  "The amendment's own text is the whole question — " + what + " — and it was disposed of by its own recorded vote, not en bloc. " +
  "The parent bill is a vehicle: its passage roll is a separate act on a separate subject and is not re-read here. " +
  "This is the amendment exception under rule 8/12, admitted on the amendment's own subject.";

const ROLLS = [
  { ch: "house", congress: 119, session: 1, year: 2025, roll: 246, number: "H.Amdt. 86", parent: "H.R. 3838",
    section: "SEC. 713 of BILLS-119hr3838eh",
    why: WHY("it bars coverage of gender-related medical treatment under TRICARE by inserting a new section 1076g of title 10") },
  { ch: "house", congress: 119, session: 1, year: 2025, roll: 248, number: "H.Amdt. 88", parent: "H.R. 3838",
    section: "SEC. 599A of BILLS-119hr3838eh",
    why: WHY("it bars Defense Department forms and surveys from asking about gender identity or offering any sex or gender option other than male or female") },
  { ch: "house", congress: 119, session: 1, year: 2025, roll: 249, number: "H.Amdt. 89", parent: "H.R. 3838",
    section: "SEC. 2839 of BILLS-119hr3838eh",
    why: WHY("it bars any person from using a single-sex facility on a military installation that does not correspond to their sex") },
  { ch: "house", congress: 119, session: 1, year: 2025, roll: 251, number: "H.Amdt. 79", parent: "H.R. 3838",
    section: "SEC. 324 of BILLS-119hr3838eh",
    why: WHY("it repeals the Department of Defense's preference for electric and hybrid vehicles, striking 10 U.S.C. 2911(e)(4) and (10) and repealing section 2922g outright") },
  { ch: "house", congress: 119, session: 1, year: 2025, roll: 252, number: "H.Amdt. 81", parent: "H.R. 3838",
    section: "SEC. 1733G of BILLS-119hr3838eh",
    why: WHY("it raises the maximum penalty for unlawful entry on a military installation under 18 U.S.C. 1382 from six months to two years, declares it a general intent crime, and creates a new two-year offense for violating a national defense area security regulation") },
  { ch: "house", congress: 119, session: 2, year: 2026, roll: 148, number: "H.Amdt. 196", parent: "H.R. 7567",
    section: "SEC. 10205, SEC. 10206 and SEC. 10207 struck from BILLS-119hr7567rh, absent from BILLS-119hr7567eh",
    why: WHY("it strikes the bill's three pesticide preemption sections, so state and local authority over pesticide labelling and use is left where it stood instead of being displaced by the federal label") },
  { ch: "house", congress: 119, session: 2, year: 2026, roll: 152, number: "H.Amdt. 207", parent: "H.R. 7567",
    section: "SEC. 12422 of BILLS-119hr7567eh",
    why: WHY("it exempts agricultural tractors and self-propelled agricultural equipment from the Clean Air Act section 213 emission standards") },
];

const POS = { Yea: "yea", Aye: "yea", Nay: "nay", No: "nay", Present: "present", "Not Voting": "not_voting", Absent: "not_voting" };

// ── The form gate, copied from scripts/test-vr-vote-seed.mjs ────────────────
const DECISIVE = /^(on passage|on the motion \(motion to concur|on motion to concur|on concurring|on the conference report|on motion to suspend the rules and (pass|agree|concur))/i;
const PASSAGE_FORMS = [{ name: "joint resolution", question: /^on the joint resolution\b/i, number: /^(h|s)\.j\.\s*res\./i }];
const EXCEPTIONS = [
  { name: "amendment", question: /^on (agreeing to )?the amendment\b/i, number: /^(h|s)\.\s*amdt\./i },
  { name: "discharge", question: /^on the motion to discharge/i, number: /^(h|s)\.j\.\s*res\./i },
];
function admits(question, r) {
  const q = String(question || "");
  if (DECISIVE.test(q)) return "decisive";
  for (const f of PASSAGE_FORMS) if (f.question.test(q) && f.number.test(r.number)) return `passage form: ${f.name}`;
  for (const e of EXCEPTIONS) if (e.question.test(q) && e.number.test(r.number) && r.why) return `exception: ${e.name}`;
  return null;
}
// An H.Amdt. is never discharged. Naming the form here rather than leaving it
// implicit is what stops a later edit from reaching for the discharge exception on
// a House amendment, which the brief forbids in as many words.
const FORBIDDEN_FORM = "exception: discharge";

mkdirSync(CACHE, { recursive: true });
async function cached(file, url) {
  const p = join(CACHE, file);
  if (existsSync(p)) return readFileSync(p, "utf8");
  const r = await fetch(url, { headers: { "user-agent": "politidex-vr-ingest/1.0" } });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  const b = await r.text();
  writeFileSync(p, b);
  return b;
}
const tag = (xml, t) => {
  const m = String(xml).match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`));
  return m ? m[1] : "";
};
const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();

// ── Eastern offset, to the minute, on the document's own stamp (rule 37) ────
function etOffset(y, mo, d) {
  const nth = (n, dow, m) => { const f = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); return 1 + ((dow - f + 7) % 7) + 7 * (n - 1); };
  const start = new Date(Date.UTC(y, 2, nth(2, 0, 3)));   // second Sunday in March
  const end = new Date(Date.UTC(y, 10, nth(1, 0, 11)));   // first Sunday in November
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t >= start && t < end ? "-04:00" : "-05:00";
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

// ── The bridge, re-asserted per roll ────────────────────────────────────────
// The census bridged these rolls already. This script does not take that on
// trust: it re-reads the parent's BILLSTATUS, de-duplicates 'Roll no. NNN' inside
// each <amendment> block (F7's recorded collision), and dies unless exactly one
// block cites this roll AND its number is the H.Amdt. named above.
const bsFile = (parent) => {
  const m = parent.match(/^H\.R\.\s*(\d+)$/);
  if (!m) throw new Error(`no BILLSTATUS path for parent "${parent}"`);
  return [`bs_hr${m[1]}.xml`, `https://www.govinfo.gov/bulkdata/BILLSTATUS/119/hr/BILLSTATUS-119hr${m[1]}.xml`];
};
const BRIDGE_CACHE = new Map();
async function bridgeOf(r) {
  const [file, url] = bsFile(r.parent);
  if (!BRIDGE_CACHE.has(file)) {
    const x = await cached(file, url);
    const list = [];
    for (const m of x.matchAll(/<amendment>([\s\S]*?)<\/amendment>/g)) {
      const b = m[1];
      const rolls = [...new Set([...b.matchAll(/Roll\s+no\.\s+(\d+)/gi)].map((n) => Number(n[1])))];
      list.push({
        number: clean(tag(b, "number")), type: clean(tag(b, "type")),
        description: clean(tag(b, "description")), purpose: clean(tag(b, "purpose")),
        sponsor: clean(tag(b, "fullName")), bioguide: clean(tag(b, "bioguideId")),
        actionDate: clean(tag(b, "actionDate")), actionText: clean(tag(b, "text")), rolls,
      });
    }
    BRIDGE_CACHE.set(file, list);
  }
  const hits = BRIDGE_CACHE.get(file).filter((a) => a.rolls.includes(r.roll));
  if (hits.length !== 1) throw new Error(`${r.number}: ${hits.length} <amendment> blocks cite house ${r.year}/${r.roll} in ${file}`);
  if (`H.Amdt. ${hits[0].number}` !== r.number) throw new Error(`${r.number}: house ${r.year}/${r.roll} bridges to H.Amdt. ${hits[0].number}`);
  return hits[0];
}

async function houseRoll(r) {
  const p3 = String(r.roll).padStart(3, "0");
  const url = `https://clerk.house.gov/evs/${r.year}/roll${p3}.xml`;
  const xml = await cached(`roll_${r.year}_${r.roll}.xml`, url);
  const at = `house ${r.congress}/${r.session}/${r.roll}`;

  const question = clean(tag(xml, "vote-question"));
  const admittedAs = admits(question, r);
  if (!admittedAs) throw new Error(`${at}: question "${question}" is not an admitted form`);
  if (admittedAs === FORBIDDEN_FORM) throw new Error(`${at}: a House amendment cannot be admitted as a discharge`);

  // Note 3: <legis-num> is the PARENT on an amendment roll.
  const legisNum = clean(tag(xml, "legis-num"));
  const flat = (s) => String(s).replace(/[^a-z0-9]/gi, "").toUpperCase();
  if (flat(legisNum) !== flat(r.parent)) throw new Error(`${at}: legis-num "${legisNum}" is not the expected parent ${r.parent}`);

  const amendment = await bridgeOf(r);
  const clerkAmdNum = clean(tag(xml, "amendment-num"));

  const tb = tag(xml, "totals-by-vote");
  const totals = {
    yea: +clean(tag(tb, "yea-total")), nay: +clean(tag(tb, "nay-total")),
    present: +clean(tag(tb, "present-total")), notVoting: +clean(tag(tb, "not-voting-total")),
  };
  for (const [k, v] of Object.entries(totals)) if (!Number.isFinite(v)) throw new Error(`${at}: <totals-by-vote> has no readable ${k}`);

  const legs = [...xml.matchAll(/<recorded-vote>\s*<legislator ([^>]*)>[\s\S]*?<vote>([^<]*)<\/vote>/g)].map((m) => {
    const a = {}; for (const p of m[1].matchAll(/([\w-]+)="([^"]*)"/g)) a[p[1]] = p[2];
    return { bioguideId: a["name-id"], state: a.state, party: a.party, vote: clean(m[2]) };
  });
  if (!legs.length) throw new Error(`${at}: no <recorded-vote> rows parsed`);
  const all = legs.map((l) => {
    const position = POS[l.vote];
    if (!position) throw new Error(`${at}: unrecognised position "${l.vote}" for ${l.bioguideId}`);
    return { bioguideId: l.bioguideId, party: l.party, state: l.state, position };
  });

  const flag = crossoverFlagger(all);
  const memberVotes = [];
  const unresolvedBioguides = [];
  for (const m of all) {
    const pid = MAP[m.bioguideId];
    if (!pid) { unresolvedBioguides.push(m.bioguideId); continue; }
    memberVotes.push({ politicianId: pid, bioguideId: m.bioguideId, position: m.position, isParty: flag(m) });
  }
  const dupes = memberVotes.map((m) => m.politicianId).filter((p, i, a) => a.indexOf(p) !== i);
  if (dupes.length) throw new Error(`${at}: the same slug appears twice — ${[...new Set(dupes)].join(", ")}`);

  // Note 6, F8's pull rule.
  const attributedPool = memberVotes.filter((m) => m.position === "yea" || m.position === "nay").length;
  if (attributedPool > totals.yea + totals.nay)
    throw new Error(`${at}: over-attribution — ${attributedPool} attributed yea/nay rows against a document pool of ${totals.yea + totals.nay}`);

  const dm = clean(tag(xml, "action-date")).match(/^(\d{1,2})-(\w{3})-(\d{4})$/);
  if (!dm) throw new Error(`${at}: unparsed action-date "${clean(tag(xml, "action-date"))}"`);
  const mo = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 }[dm[2].toUpperCase()];
  const tm = /<action-time[^>]*\btime-etz="(\d{1,2}):(\d{2})"/.exec(xml);
  if (!tm) throw new Error(`${at}: no readable time-etz on <action-time>`);
  const voteDate = `${dm[3]}-${String(mo).padStart(2, "0")}-${dm[1].padStart(2, "0")}`
    + `T${tm[1].padStart(2, "0")}:${tm[2]}:00${etOffset(+dm[3], mo, +dm[1])}`;

  const raw = clean(tag(xml, "vote-result"));
  return {
    chamber: "house", congress: r.congress, session: r.session, rollNumber: r.roll, clerkYear: r.year, voteDate,
    question, voteDesc: clean(tag(xml, "vote-desc")),
    // 'amendment', which is in vr_rollcalls.action_type's closed vocabulary and is
    // what netlify/lib/vr-pack.ts reads as substantive. Not 'discharge', which the
    // pack has never heard of, and not 'passage', which would claim this roll
    // disposed of the parent.
    actionType: "amendment",
    result: /^agreed/i.test(raw) ? "agreed" : /^failed/i.test(raw) ? "failed" : raw.toLowerCase(),
    requiredMajority: clean(tag(xml, "vote-type")).toLowerCase().includes("2/3") ? "two_thirds" : "simple",
    admittedAs, decisiveWhy: r.why,
    totals, partyTotals: partyTotals(all),
    sourceUrl: `https://clerk.house.gov/Votes/${r.year}${p3}`,
    xmlUrl: url, sourceLabel: "Office of the Clerk, U.S. House of Representatives",
    measure: {
      measureType: "amendment", congress: r.congress, chamber: "house", number: r.number,
      // The parent is recorded, not re-read. Its passage roll is not this act.
      parentNumber: r.parent, clerkLegisNum: legisNum, clerkAmendmentNum: clerkAmdNum,
      sponsor: amendment.sponsor, sponsorBioguide: amendment.bioguide,
      description: amendment.description, purpose: amendment.purpose,
      congressGovUrl: `https://www.congress.gov/amendment/119th-congress/house-amendment/${amendment.number}`,
    },
    textVerification: {
      method: "the parent's engrossed text (BILLS-119hr{n}eh) diffed against its as-reported text (BILLS-119hr{n}rh)",
      readAt: r.section,
      note: "The clerk's <vote-desc> is empty on this roll and api.congress.gov returns textVersions: [] for House amendments of the 119th, so the engrossed bill is the only source that carries the words. Nothing here is inferred from the amendment's title or the clerk's amendment-author line.",
    },
    _resolvedBy: "the clerk's own name-id (bioguide) → db/vr-member-map.json",
    memberVotes: memberVotes.sort((a, b) => a.politicianId.localeCompare(b.politicianId)),
    _chamberRecorded: all.length, _attributed: memberVotes.length,
    _unresolvedRecorded: unresolvedBioguides.length, _unresolvedBioguides: unresolvedBioguides,
  };
}

const out = {
  _comment: "Generated by scripts/vr-gen-federal-wave-f9-vote-seed.mjs. Do not hand-edit; regenerate.",
  wave: "F9",
  chamber: "house",
  builtBy: "scripts/vr-gen-federal-wave-f9-vote-seed.mjs",
  pulledAt: new Date().toISOString().slice(0, 10),
  source: "clerk.house.gov EVS roll-call XML (7), read live and cached under $F9_XML_DIR; govinfo BILLSTATUS for the roll → H.Amdt. bridge; govinfo BILLS-119hr{n}eh/rh for the operative text",
  scope: "The seven contested House amendment rolls admitted by scripts/vr-federal-wave-f9-census.mjs out of the 51 F7 left unread. The other 44 are refused in writing in db/vr-federal-mapping-seed-f9.json.",
  attribution: {
    house: "fail-closed: the clerk's own name-id (bioguide) → db/vr-member-map.json → roster slug, and no other path",
    tallyAuthority: "House <totals-by-vote>, the full chamber. Never the attributed subset and never a display string.",
    overAttribution: "F8's pull rule: attributed yea+nay rows exceeding the document's yea+nay pool refuses the roll outright rather than shipping it.",
    unresolvedArePart: "Members who do not resolve are skipped and counted per roll in _unresolvedRecorded, so the ceiling is visible rather than implied.",
  },
  parentsAreVehicles: {
    "H.R. 3838": "Streamlining Procurement for Effective Execution and Delivery and National Defense Authorization Act for Fiscal Year 2026. Already on file as measure 48 with its own passage roll (119/1/262). This wave adds no roll and no issue mapping to it.",
    "H.R. 7567": "Farm, Food, and National Security Act of 2026. Already on file as measure 31. This wave adds no roll and no issue mapping to it.",
  },
  votes: [],
};

for (const r of ROLLS) out.votes.push(await houseRoll(r));

for (const v of out.votes) {
  const pool = v.totals.yea + v.totals.nay;
  const losing = Math.min(v.totals.yea, v.totals.nay);
  v._poolYeaNay = pool;
  v._losingSide = losing;
  v._losingSharePct = +((losing / pool) * 100).toFixed(3);
  v._rule11Cleared = losing >= pool / 10;
  v.marginShare = +(losing / pool).toFixed(5);
  if (!v._rule11Cleared) throw new Error(`${v.measure.number} house ${v.rollNumber}: rule 11 one-tenth bar not cleared (${losing}/${pool})`);
  if (v.admittedAs !== "decisive" && !v.decisiveWhy) throw new Error(`${v.measure.number}: admitted as ${v.admittedAs} with no decisiveWhy`);
  if (!v.textVerification.readAt) throw new Error(`${v.measure.number}: admitted with no operative text read`);
}

const numbers = out.votes.map((v) => v.measure.number);
if (new Set(numbers).size !== numbers.length) throw new Error("the same H.Amdt. appears twice in this seed");
for (const v of out.votes)
  if (numbers.includes(v.measure.parentNumber)) throw new Error(`${v.measure.number}: its parent ${v.measure.parentNumber} is also being written as a measure in this wave`);

out.rollCallCount = out.votes.length;
out.memberVoteCount = out.votes.reduce((a, v) => a + v.memberVotes.length, 0);
out.skippedVoteCount = out.votes.reduce((a, v) => a + v._unresolvedRecorded, 0);
out.newMeasures = numbers;
out.parentsTouched = [...new Set(out.votes.map((v) => v.measure.parentNumber))];
out._counts = {
  rolls: out.votes.length,
  houseRolls: out.votes.length,
  senateRolls: 0,
  session1: out.votes.filter((v) => v.session === 1).length,
  session2: out.votes.filter((v) => v.session === 2).length,
  chamberRecordedRange: [Math.min(...out.votes.map((v) => v._chamberRecorded)), Math.max(...out.votes.map((v) => v._chamberRecorded))],
  attributedMemberVotes: out.memberVoteCount,
  attributionCeilingHouse: Math.max(...out.votes.map((v) => v._attributed)),
  unresolvedRecordedTotal: out.skippedVoteCount,
  distinctSlugsTouched: new Set(out.votes.flatMap((v) => v.memberVotes.map((m) => m.politicianId))).size,
  losingShareRangePct: [Math.min(...out.votes.map((v) => v._losingSharePct)), Math.max(...out.votes.map((v) => v._losingSharePct))],
  admittedForms: out.votes.reduce((a, v) => { a[v.admittedAs] = (a[v.admittedAs] || 0) + 1; return a; }, {}),
  newParentMeasures: 0,
  parentRollsWritten: 0,
};

writeFileSync(join(ROOT, "db", "vr-federal-wave-f9-vote-seed.json"), JSON.stringify(out, null, 1) + "\n");
console.log("wrote db/vr-federal-wave-f9-vote-seed.json");
console.log(JSON.stringify(out._counts, null, 1));
for (const v of out.votes)
  console.log(`  house ${v.congress}/${v.session}/${String(v.rollNumber).padStart(3)} ${v.measure.number.padEnd(12)} on ${String(v.measure.parentNumber).padEnd(10)} ${String(v.totals.yea)}-${v.totals.nay}  ${String(v._losingSharePct).padStart(7)}%  att=${String(v._attributed).padStart(3)} unres=${String(v._unresolvedRecorded).padStart(3)}  ${v.result.padEnd(7)} ${v.textVerification.readAt}`);
