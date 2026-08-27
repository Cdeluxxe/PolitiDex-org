#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// vr-utah-ingest — the state-legislature member-vote path, for Utah
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS. netlify/lib/vr-ingest.ts is federal: api.congress.gov for the
// House, senate.gov roll-call XML for the Senate. Neither knows anything about a
// state legislature, so every one of the ~90 Utah state legislators on the roster
// opened their profile to "No formal pattern on file yet" — a sentence about OUR
// coverage that reads as a sentence about THEM. The Utah ballot is the reference
// implementation of the whole product, and the people on it had no record.
//
// Utah publishes everything needed, in public, without a key:
//
//   bill (status + action history)  https://le.utah.gov/data/<SESSION>/<BILL>.json
//   floor roll call, per member     https://le.utah.gov/DynaBill/svotes.jsp
//                                     ?sessionid=<SESSION>&voteid=<ID>&house=<H|S>
//   committee vote, per member      https://le.utah.gov/mtgvotes.jsp?voteid=<ID>
//   current legislator roster       https://le.utah.gov/data/legislators.json
//   citable bill page               https://le.utah.gov/~<YEAR>/bills/static/<BILL>.html
//   every bill that passed a session /asp/passedbills/passedbills.asp?Session=<SESSION>
//
// TWO SESSION SHAPES, ONE DOCTRINE. From 2025GS the bill JSON carries a full
// actionHistoryList: an actionCode, a voteID, a voiceVote flag and the tally, per
// action. Before 2025 it does not — 2024GS and 2023GS publish actionhistory as
// {date, action, location} and nothing else, so there is no vote id in the JSON at
// all and the recorded floor votes are unreachable from it. They are on the STATIC
// BILL PAGE, whose action table has carried a linked tally per recorded vote for
// years: four cells of date, action, location, vote, the fourth linking to the same
// svotes.jsp page the modern JSON points at.
//
// So the archive path reads the page and normalises it into the shape the modern
// JSON already has, and every downstream rule — one final passage per chamber, the
// minority-share bar, the printed-name map — runs unchanged on both. What the page
// does NOT print is the actionCode, which is the field the final-passage rule keys
// on. It is not guessed: ARCHIVE_ACTION_CODES below is the legislature's own
// pairing, harvested from the sessions that publish BOTH fields, and a recorded
// vote whose action text is not in that table is reported as unclassified rather
// than dropped in silence.
//
// WHAT THIS TOOL DECIDES, AND WHAT IT REFUSES TO DECIDE. It decides mechanical
// things: which action history rows are recorded floor votes, which one is FINAL
// passage in each chamber, and how a printed name on a vote page reads. It decides
// none of the following, and cannot:
//
//   · WHICH BILLS. db/vr-utah-bills.json is curator-authored. Nothing is ingested
//     because a keyword fired.
//   · WHICH ISSUE, WHICH DIRECTION, WHICH WEIGHT. Same file, same hand. Every
//     mapping carries a `rationale` and the tool refuses a bill whose mapping has
//     a null direction or weight, exactly like scripts/vr-mapping-draft.mjs.
//   · WHO A NAME IS. A vote page prints "Schultz, M." — never a roster id. The
//     name→pid table is db/vr-utah-member-map.json, and it is HUMAN-ACCEPTED: the
//     tool drafts it into the CACHE directory (never into db/) with its proposals
//     and its residue, and a human reviews every line before it becomes the file
//     the seeder reads. A printed name absent from the promoted map is counted,
//     listed and DROPPED — never handed to whoever holds that seat now. No
//     plausible strangers.
//
// ONE INSTRUMENT → ONE ACT. A Utah bill can produce four recorded floor votes in
// one chamber (2nd reading, 3rd reading, concurrence, and a re-vote after
// amendment). Counting them all would let one bill look like four items of depth.
// So per (bill, chamber) exactly ONE roll call is admitted — the latest recorded
// FINAL-passage vote — and the discarded ones are reported, not silently dropped.
//
// NEAR-UNANIMOUS VOTES ARE NOT INGESTED. Runbook rule (see "Also skip unanimous /
// near-unanimous measures"): a 72-0 floor vote differentiates nobody, so it adds
// attribution without adding signal. `--collect` prints the margin for every
// candidate roll call and marks the ones under the threshold so the curator can
// see what the bill list is asking for; `--seed` refuses to emit them.
//
// STATE VOTES ARE NOT FEDERAL VOTES, AND SAY SO. Rows are written with
// chamber "utah house" / "utah senate" and congress NULL. That is not decoration:
// the client renders the chamber string, so a Utah floor vote can never print as
// "House" next to the glossary's "435 members, each representing one district".
//
// USAGE
//   node scripts/vr-utah-ingest.mjs --survey --session S # network. what a session HAS
//   node scripts/vr-utah-ingest.mjs --collect            # network. caches + drafts the map
//   node scripts/vr-utah-ingest.mjs --seed               # no network. writes the vote seed
//   node scripts/vr-utah-ingest.mjs --sql                # no network. writes the .sql.draft
//   --cache DIR   raw HTML/JSON cache (default /tmp/vr-utah-cache)
//   --session S   only this session (default: every session in the bill list)
//   --out DIR     where --sql writes (default /tmp/vr-utah-drafts)
//   --json        machine-readable report on stdout
//
// It never writes under netlify/database/migrations/. The SQL lands on `.sql.draft`,
// which the platform's migration runner does not read; promoting it is a human act.
//
// WHAT GUARDS THE OUTPUT. db/vr-utah-vote-seed.json is pinned by
// scripts/test-vr-utah-record.mjs — counts, issue keys, one act per instrument, the
// minority-share bar, every pid traceable to the accepted map, and every roll call
// present in the promoted migration. scripts/test-vr-vote-seed.mjs is the FEDERAL
// sweep and routes this file out by shape, but only because a harness names it; add
// another state and add its harness in the same change. The full rationale, the
// endpoints, the WAF and the deliberate deferrals are in db/vr-ingest-runbook.md
// under "§ Utah".
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const P = (...a) => path.join(ROOT, ...a);

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const CACHE = val("--cache", "/tmp/vr-utah-cache");
const OUTDIR = val("--out", "/tmp/vr-utah-drafts");
const ONLY_SESSION = val("--session", "");
const AS_JSON = has("--json");

// ── One file per session, and why the 2025 ones have no suffix ───────────────
// Wave 1 shipped a bill list, a member map and a vote seed with no session in their
// names, because there was one session. Wave 2 added two more, and the choice was
// between growing those three files to hold every session or splitting per session.
// Split, for two reasons that are not tidiness: the 2025 seed is already 560 KB and
// a reader diffing one session should not read three, and — the deciding one — the
// 2025 counts are PINNED by scripts/test-vr-utah-record.mjs and referenced by an
// applied migration, so a 2024 bill landing in the same file would have moved
// numbers that describe a database that has already been written.
//
// So the 2025 files keep their exact names. Renaming them would churn an applied
// migration's stated source for no gain, and a suffix on one file does not make the
// other two more honest. Every LATER session is "<base>-<SESSION>.json".
const LEGACY_SESSION = "2025GS";
const sessionFile = (base, session) =>
  P("db", session === LEGACY_SESSION ? `${base}.json` : `${base}-${session}.json`);
const BILLS_FILE = P("db", "vr-utah-bills.json");
const BILLS_GLOB = /^vr-utah-bills-(\d{4}[A-Z0-9]*)\.json$/;
const mapFile = (session) => sessionFile("vr-utah-member-map", session);
const mapDraft = (session) => path.join(CACHE, `vr-utah-member-map.${session}.draft.json`);
const seedFile = (session) => sessionFile("vr-utah-vote-seed", session);

// ── Source URLs. One place, so a citation and a fetch can never disagree. ────
const SRC = {
  billJson: (s, b) => `https://le.utah.gov/data/${s}/${b}.json`,
  billPage: (s, b) => `https://le.utah.gov/~${s.slice(0, 4)}/bills/static/${b}.html`,
  floorVote: (s, id, house) =>
    `https://le.utah.gov/DynaBill/svotes.jsp?sessionid=${s}&voteid=${id}&house=${house}`,
  roster: () => `https://le.utah.gov/data/legislators.json`,
  passedBills: (s) => `https://le.utah.gov/asp/passedbills/passedbills.asp?Session=${s}`,
};
const SOURCE_LABEL = "Utah State Legislature";

// The action codes that are a chamber's decision ON THE BILL. Ordered: a later
// entry supersedes an earlier one as "final" within the same chamber.
const PASSAGE_CODES = {
  H: ["HPASS2", "HPASS3", "HCONCUR"],
  S: ["SPASS2", "SPASS3", "SCONCUR"],
};
// Everything else with a voteID is procedural chamber housekeeping (circling,
// substituting, floor amendments) or a committee vote. Neither is ingested here.
//
// Note what is NOT in that list, because two of the omissions are coverage gaps
// rather than principles. SPASS23SP / HPASS23SP ("passed 2nd & 3rd readings/
// suspension") IS a chamber's final act on a bill, and so is a conference
// committee's HCOMFINALP / SCOMFINALP; HFAIL / SFAIL is a chamber refusing one.
// Wave 1 admitted none of them, so wave 2 admits none of them either — widening the
// rule would change what the 2025 record already says, and that is a separate,
// deliberate change with its own migration. Recorded here so the next pass finds it
// as a decision rather than rediscovering it as a bug.

// The action text the Utah Legislature prints beside each of those codes. Harvested
// from the sessions that publish an actionCode AND a description on the same row
// (2025GS onward), which is what makes it a reading of the source rather than a
// guess about it: the archive path classifies a 2023 row by the exact string the
// legislature itself pairs with that code today. Anything not in this table is
// reported as unclassified — see surveyBill.
const ARCHIVE_ACTION_CODES = {
  "House/ passed 2nd reading": "HPASS2",
  "House/ passed 3rd reading": "HPASS3",
  "House/ concurs with Senate amendment": "HCONCUR",
  "Senate/ passed 2nd reading": "SPASS2",
  "Senate/ passed 3rd reading": "SPASS3",
  "Senate/ concurs with House amendment": "SCONCUR",
};
// The sessions whose JSON carries actionHistoryList. Everything earlier is read
// from the static page. Expressed as a floor year rather than a list so a future
// session does not silently take the archive path.
const MODERN_FROM_YEAR = 2025;
export const isArchiveSession = (session) => parseInt(String(session).slice(0, 4), 10) < MODERN_FROM_YEAR;

// "HB0257" → "H.B. 257", the form 2025GS's own billNumberShort uses. Mechanical.
export function shortNumber(bill) {
  const m = /^([A-Z]+)0*(\d+)$/.exec(String(bill).trim());
  if (!m) return String(bill);
  return m[1].split("").join(".") + ". " + m[2];
}

// ── the static bill page's action table ─────────────────────────────────────
// Four cells: date, action, location, vote. The vote cell is empty, or a committee
// tally with no link, or a recorded floor vote linking to svotes.jsp — and a voice
// vote links there too while printing "Voice vote", which is why the tally string
// and not the presence of a link is what says a vote was recorded.
export function parseBillPageActions(html) {
  const out = [];
  for (const tr of html.match(/<TR[^>]*>[\s\S]*?<\/TR>/gi) || []) {
    const tds = tr.match(/<TD[^>]*>[\s\S]*?<\/TD>/gi) || [];
    if (tds.length !== 4) continue;
    const cell = (i) => de(tds[i].replace(/<[^>]*>/g, " "));
    const dateRaw = cell(0), description = cell(1), location = cell(2), voteText = cell(3);
    if (!/^\d{1,2}\/\d{1,2}\/\d{4}/.test(dateRaw)) continue;
    const link = /svotes\.jsp\?sessionid=([^&"']+)&(?:amp;)?voteid=(\d+)&(?:amp;)?house=([HS])/i.exec(tds[3]);
    const tally = /^(\d+)\s+(\d+)\s+(\d+)$/.exec(voteText);
    out.push({
      actionDate: dateRaw,
      description,
      location,
      actionCode: ARCHIVE_ACTION_CODES[description] || null,
      voteID: link ? link[2] : null,
      voteHouse: link ? link[3] : null,
      voiceVote: /voice vote/i.test(voteText) ? "1" : "0",
      voteStr: tally ? `${tally[1]}-${tally[2]}-${tally[3]}` : null,
    });
  }
  return out;
}

// One bill, in one shape, whichever session it came from. Downstream code reads
// only these fields, so nothing below has to know which decade it is in.
export function normaliseBill(session, billJson, pageHtml) {
  const j = billJson || {};
  if (!isArchiveSession(session)) {
    return {
      archive: false,
      number: j.billNumberShort,
      title: j.shortTitle,
      lastAction: j.lastAction || "",
      primeSponsor: j.primeSponsorName || "",
      floorSponsor: j.floorSponsorName || "",
      generalProvisions: j.generalProvisions || "",
      actions: (j.actionHistoryList || []),
    };
  }
  const page = String(pageHtml || "");
  const sponsorOf = (divId) => {
    const i = page.indexOf(`id="${divId}"`);
    if (i < 0) return "";
    const seg = page.slice(i, i + 900);
    const a = /<a[^>]*>([\s\S]*?)<\/a>/i.exec(seg);
    return a ? de(a[1].replace(/<[^>]*>/g, " ")) : "";
  };
  return {
    archive: true,
    number: shortNumber(j.bill || ""),
    title: de(String(j.shorttitle || "")),
    lastAction: j.lastaction || "",
    // The archive JSON's sponsor field is an internal code ("BIRKEK"), which is not
    // a name and must never be printed as one. The page prints the name.
    primeSponsor: sponsorOf("billsponsordiv"),
    floorSponsor: sponsorOf("floorsponsordiv"),
    generalProvisions: j.generalprovisions || "",
    actions: parseBillPageActions(page),
  };
}

// A margin this lopsided differentiates nobody. Expressed as the losing side's
// share of the members who actually voted.
const MIN_MINORITY_SHARE = 0.1;

// ── tiny helpers ────────────────────────────────────────────────────────────
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
function fetchText(url) {
  // curl, not global fetch: le.utah.gov's WAF rejects undici's default headers.
  return execFileSync("curl", ["-sS", "--max-time", "40", "-A", UA,
    "-H", "Accept: */*", "-H", "Accept-Language: en-US,en;q=0.9", url], {
    encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
  });
}
function cached(rel, url) {
  const f = path.join(CACHE, rel);
  if (fs.existsSync(f) && fs.statSync(f).size > 0) return fs.readFileSync(f, "utf8");
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const body = fetchText(url);
  if (/Request Rejected/i.test(body.slice(0, 400))) {
    throw new Error(`source refused the request: ${url}`);
  }
  fs.writeFileSync(f, body);
  return body;
}
const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const de = (s) => String(s)
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"').replace(/&#x27;/g, "'")
  .replace(/\s+/g, " ").trim();
const norm = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z -]/g, " ").replace(/\s+/g, " ").trim();

// ── the vote page ───────────────────────────────────────────────────────────
// Structure (stable since at least 2015): a header line with the bill, the result
// and the "yea - nay - notvoting, date" tally; then one <font size="5"> heading
// per group ("Yeas - 70", "Nays - 0", "Absent or not voting - 5") followed by a
// table of one member per <td>. A member still serving carries a leglookup link
// with their district; one who has since left the legislature does not — which is
// exactly why district can never be the only key (see resolveMember).
export function parseVotePage(html) {
  const body = html.slice(Math.max(0, html.indexOf("<body")));
  const hdr = de(body.slice(0, body.indexOf("<hr")).replace(/<[^>]*>/g, " "));
  const tally = /(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*,\s*([0-9/]+\s+[0-9:]+\s*[AP]M)/.exec(hdr);
  const result = /-\s*(Passed|Failed)\b/i.exec(hdr);
  const centers = [...body.matchAll(/<center>([\s\S]*?)<\/center>/gi)]
    .map((m) => de(m[1].replace(/<[^>]*>/g, " ")));

  const heads = [];
  const hre = /<font[^>]*size="5"[^>]*>([^<]*)<\/font>/gi;
  let h;
  while ((h = hre.exec(body))) heads.push({ label: de(h[1]), at: h.index + h[0].length });

  const groups = heads.map((head, i) => {
    const seg = body.slice(head.at, i + 1 < heads.length ? heads[i + 1].at : body.length);
    const names = [];
    const cre = /<td>[\s\S]*?<font[^>]*>([\s\S]*?)<\/font>[\s\S]*?<\/td>/gi;
    let c;
    while ((c = cre.exec(seg))) {
      const cell = c[1];
      const dm = /dist=(\d+)/.exec(cell);
      const nm = de(cell.replace(/<[^>]*>/g, ""));
      if (nm) names.push({ name: nm, district: dm ? parseInt(dm[1], 10) : null });
    }
    return { label: head.label, names };
  });

  const g = (re) => (groups.find((x) => re.test(x.label)) || { names: [] }).names;
  return {
    header: hdr,
    question: centers.slice(4, 6).filter((s) => s && !/^Yeas\b/.test(s)),
    result: result ? result[1] : null,
    totals: tally
      ? { yea: +tally[1], nay: +tally[2], notVoting: +tally[3], date: tally[4] }
      : null,
    yeas: g(/^Yeas\b/i),
    nays: g(/^Nays\b/i),
    absent: g(/absent|not voting/i),
    groups: groups.map((x) => ({ label: x.label, n: x.names.length })),
  };
}

// ── name → roster id ────────────────────────────────────────────────────────
// A printed cell is "Surname, Initials" ("Schultz, M.", "Maloy, A. Cory",
// "Shipp, R.P."). Resolution is by NAME against a per-chamber candidate pool, with
// the district used only to CONFIRM. Never the reverse: a district's occupant
// changes between sessions, so keying on it would attribute the 2025 votes of a
// member who has since left to whoever holds the seat now.
const NICK = [
  ["ray", "raymond"], ["jen", "jennifer"], ["mike", "michael"], ["steve", "stephen"],
  ["steve", "steven"], ["jim", "james"], ["dan", "daniel"], ["dave", "david"],
  ["chris", "christopher"], ["tom", "thomas"], ["rob", "robert"], ["jerry", "gerald"],
  ["ron", "ronald"], ["don", "donald"], ["walt", "walter"], ["cal", "calvin"],
  ["nate", "nathan"], ["katy", "katherine"], ["jill", "jillian"], ["joe", "joseph"],
  ["matt", "matthew"], ["doug", "douglas"], ["kathy", "kathleen"], ["stu", "stuart"],
];
export function firstNameCompatible(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length <= 2 && b.startsWith(a[0])) return true;   // printed initial
  if (b.length <= 2 && a.startsWith(b[0])) return true;
  return NICK.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}
export function splitPrinted(printed) {
  const i = printed.indexOf(",");
  const surname = norm(i > 0 ? printed.slice(0, i) : printed);
  const rest = norm(i > 0 ? printed.slice(i + 1) : "").split(" ").filter(Boolean);
  return { surname, rest };
}
// pool: [{pid, name, district}] for ONE chamber.
export function proposeMember(printed, district, pool) {
  const { surname, rest } = splitPrinted(printed);
  const bySur = pool.filter((o) => {
    const n = norm(o.name);
    return n === surname || n.endsWith(" " + surname);
  });
  const hit = bySur.filter((o) => {
    const first = norm(o.name).split(" ")[0];
    return rest.some((r) => firstNameCompatible(r, first)) ||
           rest.some((r) => norm(o.name).split(" ").includes(r));
  });
  if (hit.length !== 1) {
    return { pid: null, why: hit.length ? "ambiguous" : (bySur.length ? "surname only" : "no candidate"),
             candidates: (hit.length ? hit : bySur).map((o) => o.pid) };
  }
  const one = hit[0];
  return {
    pid: one.pid, why: null,
    confirmedByDistrict: district != null && String(one.district || "") === String(district),
  };
}

// ── the pieces of the run ───────────────────────────────────────────────────
function billList() {
  // Every curator file in db/, oldest name first. A bill's own `session` field is
  // what places it, not the filename, so a file that names the wrong session shows
  // up as a cache miss rather than as a vote filed under the wrong year.
  const files = [BILLS_FILE, ...fs.readdirSync(P("db")).filter((f) => BILLS_GLOB.test(f)).sort().map((f) => P("db", f))];
  const out = [];
  const metas = {};
  for (const f of files) {
    const j = readJson(f);
    for (const b of j.bills || []) {
      if (ONLY_SESSION && b.session !== ONLY_SESSION) continue;
      metas[b.session] = j;
      out.push(b);
    }
  }
  return { meta: readJson(BILLS_FILE), metas, bills: out, files };
}

// The bill JSON and, for an archive session, the page its roll calls live on.
function billShape(b, { network }) {
  const get = network
    ? (rel, url) => cached(rel, url)
    : (rel) => {
      const f = path.join(CACHE, rel);
      if (!fs.existsSync(f)) throw new Error(`${rel} is not in ${CACHE} — run --collect`);
      return fs.readFileSync(f, "utf8");
    };
  const j = JSON.parse(get(`${b.session}/${b.bill}.json`, SRC.billJson(b.session, b.bill)));
  const page = isArchiveSession(b.session)
    ? get(`${b.session}/${b.bill}.page.html`, SRC.billPage(b.session, b.bill))
    : null;
  return normaliseBill(b.session, j, page);
}

// Every recorded floor vote on the bill, plus which one is final in each chamber.
export function passageVotes(norm) {
  const rows = (norm.actions || []).filter(
    (a) => a && a.voteID && a.voiceVote !== "1" && a.voteHouse
  );
  const picked = {}, discarded = [];
  for (const house of ["H", "S"]) {
    const codes = PASSAGE_CODES[house];
    const mine = rows.filter((a) => a.voteHouse === house && codes.includes(a.actionCode));
    if (!mine.length) continue;
    // "Final" = the latest of the codes present, and the latest occurrence of it.
    let best = null;
    for (const a of mine) {
      if (!best) { best = a; continue; }
      const ra = codes.indexOf(a.actionCode), rb = codes.indexOf(best.actionCode);
      if (ra > rb || (ra === rb && new Date(a.actionDate) > new Date(best.actionDate))) best = a;
    }
    picked[house] = best;
    for (const a of mine) if (a !== best) discarded.push(a);
  }
  const other = rows.filter(
    (a) => !PASSAGE_CODES[a.voteHouse] || !PASSAGE_CODES[a.voteHouse].includes(a.actionCode)
  );
  return { picked, discarded, procedural: other };
}
export function marginOK(voteStr) {
  const m = /^(\d+)-(\d+)-(\d+)$/.exec(String(voteStr || "").trim());
  if (!m) return { ok: false, why: "unreadable margin" };
  const yea = +m[1], nay = +m[2], cast = yea + nay;
  if (!cast) return { ok: false, why: "no recorded votes" };
  const minority = Math.min(yea, nay) / cast;
  return {
    ok: minority >= MIN_MINORITY_SHARE, share: minority, yea, nay,
    why: minority >= MIN_MINORITY_SHARE ? null
      : `near-unanimous (${yea}-${nay}; losing side ${(minority * 100).toFixed(1)}% of votes cast)`,
  };
}

const CHAMBER = { H: "utah house", S: "utah senate" };
const CHAMBER_LABEL = { H: "Utah House", S: "Utah Senate" };

// The question, from the ACTION CODE and nothing else. It was briefly read off the
// vote page's own centred lines, and those lines carry whatever else the clerk put
// there — one roll call came out as "HPOL Substituted 6-0-4 · Concurrence", which
// is a committee tally glued to a question. The code is unambiguous and the source
// page is one click away for anyone who wants the clerk's own words.
const QUESTION = {
  HPASS2: "On passage, second reading", SPASS2: "On passage, second reading",
  HPASS3: "On passage, third reading",  SPASS3: "On passage, third reading",
  HCONCUR: "On concurrence in amendments", SCONCUR: "On concurrence in amendments",
};

function isoOf(usDate) {
  // "1/28/2025 11:36 AM" → ISO. Utah is UTC-7 (MST) / UTC-6 (MDT); the session
  // runs Jan–Mar, so MST. Recorded to the minute because the source is.
  //   The static page writes the same instant as "1/19/2024 (12:58:57 PM)". A row
  // with no time at all ("1/11/2024") is a filing step, never a roll call, so it
  // returns null rather than a midnight that was never printed.
  const t = String(usDate).trim();
  const p2 = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*\((\d{1,2}):(\d{2}):\d{2}\s*([AP])M\)$/.exec(t);
  const m = p2 || /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*([AP])M$/.exec(t);
  if (!m) return null;
  let hh = +m[4] % 12; if (m[6] === "P") hh += 12;
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${m[3]}-${p(m[1])}-${p(m[2])}T${p(hh)}:${m[5]}:00-07:00`;
}

// ── --collect ───────────────────────────────────────────────────────────────
function collect() {
  const { bills } = billList();
  const roster = JSON.parse(cached("legislators.json", SRC.roster())).legislators || [];
  const pools = { H: [], S: [] };
  for (const L of roster) {
    (pools[L.house] || (pools[L.house] = [])).push({
      legId: L.id, name: L.formatName || L.fullName, printed: L.fullName,
      district: L.district, party: L.party,
    });
  }

  // One residue per session, because a printed name is only unambiguous within the
  // legislature that printed it: "Peterson, V." is one person in 2025 and could be
  // another in 2019, and a single shared map would quietly merge them.
  const seen = {};
  const perSession = (session) => (seen[session] || (seen[session] = { H: new Map(), S: new Map() }));
  const report = [];
  for (const b of bills) {
    const n = billShape(b, { network: true });
    const { picked, discarded, procedural } = passageVotes(n);
    const line = { session: b.session, bill: b.bill, number: n.number, title: n.title, votes: [], discarded: discarded.length,
      unclassified: procedural.filter((a) => a.voteStr && !a.actionCode).map((a) => `${a.description} ${a.voteStr} #${a.voteID}`) };
    for (const house of ["H", "S"]) {
      const a = picked[house];
      if (!a) { line.votes.push({ house, skipped: "no recorded final-passage vote" }); continue; }
      const mg = marginOK(a.voteStr);
      const html = cached(`${b.session}/vote-${house}-${a.voteID}.html`,
        SRC.floorVote(b.session, a.voteID, house));
      const v = parseVotePage(html);
      const bucket = perSession(b.session)[house];
      for (const grp of ["yeas", "nays", "absent"]) {
        for (const who of v[grp]) {
          const cur = bucket.get(who.name) || { name: who.name, districts: new Set(), n: 0 };
          if (who.district != null) cur.districts.add(who.district);
          cur.n++;
          bucket.set(who.name, cur);
        }
      }
      line.votes.push({
        house, code: a.actionCode, voteId: a.voteID, margin: a.voteStr,
        marginOK: mg.ok, marginWhy: mg.why,
        counted: { yea: v.yeas.length, nay: v.nays.length, absent: v.absent.length },
      });
    }
    report.push(line);
  }

  // Draft the map: propose a pid for every distinct printed name, and say why
  // when it cannot. The residue is the point — a reviewer reads it and decides.
  const rosterPids = rosterPidPool();
  const drafts = {};
  for (const session of Object.keys(seen).sort()) {
    const draft = {
      _comment:
        "DRAFT — not read by scripts/vr-utah-ingest.mjs. Review every line, then save as " +
        `db/${path.basename(mapFile(session))}. Keys are the EXACT string le.utah.gov ` +
        "prints on a vote page; values are roster ids. `unmapped` is people who voted in " +
        "these roll calls and are not on the PolitiDex roster — their votes are dropped, " +
        "counted and disclosed, never attributed to whoever holds the seat now.",
      generatedBy: `scripts/vr-utah-ingest.mjs --collect --session ${session}`,
      session,
      chambers: { H: {}, S: {} },
      confirmedByDistrict: { H: {}, S: {} },
      unmapped: { H: [], S: [] },
    };
    for (const house of ["H", "S"]) {
      const pool = rosterPids[house];
      for (const [printed, info] of [...seen[session][house].entries()].sort()) {
        const dist = info.districts.size === 1 ? [...info.districts][0] : null;
        const prop = proposeMember(printed, dist, pool);
        if (prop.pid) {
          draft.chambers[house][printed] = prop.pid;
          draft.confirmedByDistrict[house][printed] = !!prop.confirmedByDistrict;
        } else {
          draft.unmapped[house].push({ printed, district: dist, why: prop.why, candidates: prop.candidates || [] });
        }
      }
    }
    drafts[session] = draft;
    fs.writeFileSync(mapDraft(session), JSON.stringify(draft, null, 2) + "\n");
  }

  if (AS_JSON) { console.log(JSON.stringify({ report, drafts }, null, 2)); return; }
  console.log(`cache: ${CACHE}`);
  for (const r of report) {
    console.log(`\n${r.number}  ${r.title}   [${r.session}/${r.bill}]`);
    for (const v of r.votes) {
      if (v.skipped) { console.log(`   ${v.house}: — ${v.skipped}`); continue; }
      console.log(`   ${v.house}: ${v.code} ${v.margin.padEnd(10)} voteid=${v.voteId}  ` +
        `parsed ${v.counted.yea}/${v.counted.nay}/${v.counted.absent}  ` +
        (v.marginOK ? "margin OK" : `REFUSED: ${v.marginWhy}`));
    }
    if (r.discarded) console.log(`   (${r.discarded} earlier/other recorded floor vote(s) on this bill not admitted — one instrument, one act)`);
    // Named, not dropped in silence: a recorded tally whose action text this tool
    // cannot classify is a hole in coverage and the curator is the one who decides
    // whether it matters.
    r.unclassified.forEach((u) => console.log(`   ? unclassified recorded vote: ${u}`));
  }
  for (const session of Object.keys(drafts).sort()) {
    const draft = drafts[session];
    for (const house of ["H", "S"]) {
      console.log(`\n${session} ${CHAMBER_LABEL[house]}: proposed ${Object.keys(draft.chambers[house]).length}, ` +
        `needs review ${draft.unmapped[house].length}`);
      draft.unmapped[house].forEach((u) =>
        console.log(`   ${u.printed}${u.district ? " #" + u.district : ""} — ${u.why}` +
          (u.candidates.length ? ` (${u.candidates.join(", ")})` : "")));
    }
    console.log(`\ndraft map → ${mapDraft(session)}\nreview it, then: cp ${mapDraft(session)} ${mapFile(session)}`);
  }
}

// The roster side of the proposal: Utah state legislators as PolitiDex knows them.
// cmp-data.js is the roster of record and the office string is what says which
// chamber, so the pool is derived from those two fields and nothing else.
//   FORMER MEMBERS ARE IN THE POOL ON PURPOSE. le.utah.gov's own legislators.json
// lists only who serves NOW, but a 2025 roll call was cast by whoever served then —
// members have since left, and their votes are theirs. Excluding them would either
// lose those votes or, far worse, hand them to whoever holds the seat today. Since
// resolution is by name (never by district alone), a departed member matches only
// their own printed name, and a surname collision between a former and a sitting
// member resolves to neither: ambiguity is refused, not guessed.
function rosterPidPool() {
  const src = fs.readFileSync(P("cmp-data.js"), "utf8");
  const ctx = { window: {} }; ctx.window.window = ctx.window;
  // eslint-disable-next-line no-new-func
  new Function("window", src)(ctx.window);
  const D = ctx.window.CMP_DATA || {};
  const pools = { H: [], S: [] };
  for (const pid of Object.keys(D)) {
    const d = D[pid] || {};
    const o = String(d.office || "");
    const st = String(d.state || "");
    if (!/utah|^UT[ ,]/i.test(st)) continue;
    if (/u\.s\.|congress/i.test(o)) continue;          // federal seats are not this pool
    const senate = /\bstate senat/i.test(o) || /senate president/i.test(o) ||
                   /senate (majority|minority) leader/i.test(o);
    const house = /\bstate represent/i.test(o) || /house speaker/i.test(o) ||
                  /\bstate house\b/i.test(o) ||
                  /house (majority|minority) (leader|whip)/i.test(o);
    if (!senate && !house) continue;
    const dm = /district\s*#?\s*(\d+)/i.exec(st);
    const entry = { pid, name: d.name || "", district: dm ? +dm[1] : null,
                    office: o, former: /\bformer\b/i.test(o) };
    (senate ? pools.S : pools.H).push(entry);
  }
  return pools;
}

// ── --seed ──────────────────────────────────────────────────────────────────
function seed() {
  const { metas, bills } = billList();
  const maps = {};
  const mapOf = (session) => {
    if (maps[session]) return maps[session];
    const f = mapFile(session);
    if (!fs.existsSync(f)) {
      throw new Error(`${f} is missing. Run --collect --session ${session}, review ` +
        `${mapDraft(session)}, then promote it.`);
    }
    return (maps[session] = readJson(f));
  };
  const outs = {};
  const outOf = (session) => outs[session] || (outs[session] = {
    _comment: (metas[session] || {})._comment,
    generatedBy: `scripts/vr-utah-ingest.mjs --seed --session ${session}`,
    session, measures: [],
  });
  const stats = { measures: 0, rollcalls: 0, votes: 0, dropped: {}, refused: [], bySession: {} };
  const tally = (session) => stats.bySession[session] ||
    (stats.bySession[session] = { measures: 0, rollcalls: 0, votes: 0, dropped: 0 });

  for (const b of bills) {
    let j, n;
    try { n = billShape(b, { network: false }); }
    catch { stats.refused.push(`${b.session}/${b.bill}: not in cache (run --collect)`); continue; }
    j = n;
    const map = mapOf(b.session);
    const out = outOf(b.session);
    const st = tally(b.session);
    for (const m of b.issues || []) {
      if (!m.issueKey || !m.supportMeaning || typeof m.weight !== "number" || !m.rationale) {
        throw new Error(`${b.session}/${b.bill}: mapping for "${m.issueKey || "?"}" is not decided ` +
          `(needs issueKey, supportMeaning, weight, rationale)`);
      }
    }
    const originating = b.bill.startsWith("H") ? "utah house" : "utah senate";
    const measure = {
      session: b.session,
      utahBill: b.bill,
      number: j.number,
      title: j.title,
      chamber: originating,
      measureType: /^(HJR|SJR|HCR|SCR)/.test(b.bill) ? "resolution" : "bill",
      status: /Signed/i.test(j.lastAction || "") ? "enacted"
        : /to Governor/i.test(j.lastAction || "") ? "passed_senate" : "failed",
      sourceUrl: SRC.billPage(b.session, b.bill),
      sourceLabel: SOURCE_LABEL,
      primeSponsor: j.primeSponsor || "",
      floorSponsor: j.floorSponsor || "",
      generalProvisions: de(String(j.generalProvisions || "").replace(/<[^>]*>/g, " ")).slice(0, 900),
      issues: b.issues,
      rollcalls: [],
    };

    const { picked } = passageVotes(j);
    for (const house of ["H", "S"]) {
      const a = picked[house];
      if (!a) continue;
      const mg = marginOK(a.voteStr);
      if (!mg.ok) { stats.refused.push(`${j.number} ${CHAMBER_LABEL[house]}: ${mg.why}`); continue; }
      const hf = path.join(CACHE, `${b.session}/vote-${house}-${a.voteID}.html`);
      if (!fs.existsSync(hf)) { stats.refused.push(`${j.number} ${CHAMBER_LABEL[house]}: vote page not in cache`); continue; }
      const v = parseVotePage(fs.readFileSync(hf, "utf8"));
      const votes = [];
      const drop = [];
      const put = (list, position) => {
        for (const n of list) {
          const pid = (map.chambers[house] || {})[n.name];
          if (!pid) { drop.push(n.name); continue; }
          votes.push({ politicianId: pid, position, printedAs: n.name });
        }
      };
      put(v.yeas, "yea"); put(v.nays, "nay"); put(v.absent, "not_voting");
      const key = `${b.session} ${CHAMBER_LABEL[house]}`;
      stats.dropped[key] = (stats.dropped[key] || 0) + drop.length;
      st.dropped += drop.length;
      measure.rollcalls.push({
        chamber: CHAMBER[house],
        session: parseInt(b.session.slice(0, 4), 10),
        rollNumber: parseInt(a.voteID, 10),
        voteDate: isoOf(a.actionDate),
        question: QUESTION[a.actionCode] || "On final passage",
        actionType: "passage",
        result: (v.result || "").toLowerCase() === "passed" ? "passed" : "failed",
        totals: v.totals ? { yea: v.totals.yea, nay: v.totals.nay, notVoting: v.totals.notVoting } : {},
        sourceUrl: SRC.floorVote(b.session, a.voteID, house),
        sourceLabel: `${SOURCE_LABEL} · ${CHAMBER_LABEL[house]} roll call`,
        actionCode: a.actionCode,
        votes,
        droppedNotOnRoster: drop.sort(),
      });
      stats.rollcalls++; stats.votes += votes.length;
      st.rollcalls++; st.votes += votes.length;
    }
    if (!measure.rollcalls.length) { stats.refused.push(`${j.number}: no admissible roll call`); continue; }
    out.measures.push(measure);
    stats.measures++; st.measures++;
  }
  const written = [];
  for (const session of Object.keys(outs).sort()) {
    const f = seedFile(session);
    fs.writeFileSync(f, JSON.stringify(outs[session], null, 2) + "\n");
    written.push(path.relative(ROOT, f));
  }
  if (AS_JSON) { console.log(JSON.stringify({ ...stats, written }, null, 2)); return; }
  written.forEach((f) => console.log(`seed → ${f}`));
  console.log(`measures ${stats.measures}  rollcalls ${stats.rollcalls}  member votes ${stats.votes}`);
  for (const session of Object.keys(stats.bySession).sort()) {
    const t = stats.bySession[session];
    console.log(`   ${session}: measures ${t.measures}  rollcalls ${t.rollcalls}  member votes ${t.votes}  dropped ${t.dropped}`);
  }
  console.log(`dropped (voted, not on the PolitiDex roster): ${JSON.stringify(stats.dropped)}`);
  if (stats.refused.length) { console.log("refused:"); stats.refused.forEach((r) => console.log("   " + r)); }
}

// ── --sql ───────────────────────────────────────────────────────────────────
// A DRAFT migration, in the shape db/vr-ingest-runbook.md already documents:
// idempotent DO blocks, per-measure IF NOT EXISTS sentinels, sourceUrl on every
// row. Written to .sql.draft so the platform's runner ignores it until a human
// moves it.
function sqlDraft(session) {
  const s = readJson(seedFile(session));
  const map = fs.existsSync(mapFile(session)) ? readJson(mapFile(session)) : {};
  // The two partial indexes belong to the session that introduced them. A later
  // session's draft restating applied DDL would put a CREATE in a migration that
  // only moves rows, which is the thing scripts/test-vr-corrections.mjs checks for.
  const firstSession = session === LEGACY_SESSION;
  const q = (v) => v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;
  const L = [];
  L.push("-- DRAFT — generated by scripts/vr-utah-ingest.mjs --sql from");
  L.push(`-- db/${path.basename(seedFile(session))}. Review, then promote into`);
  L.push("-- netlify/database/migrations/<timestamp>_<name>.sql with a header that says");
  L.push("-- what it is for. The tool does not write there.");
  L.push("");
  // ── THE TWO INDEXES, AND WHY THEY ARE PARTIAL ─────────────────────────────
  // vr_rollcalls_unique is (chamber, congress, session, roll_number). Congress is
  // NULL on every state row, and Postgres treats NULLs as distinct in a unique
  // index — so that index cannot stop a second ingest from inserting the same
  // Utah roll call twice. The partial index below covers exactly the rows the
  // existing one cannot, and adds no constraint to any federal row.
  //   The measure index is the same argument: vr_measures has no unique index at
  // all, and "H.B. 60" is a number Utah reissues every session. Keying on the
  // session recorded in external_ids is what makes a Utah measure identifiable.
  // The residue, stated once. Every name here cast a recorded vote in this
  // session and is not on the PolitiDex roster, so their votes are absent from
  // this file. Saying so once, by name, is the difference between a coverage gap
  // and a silent one.
  const missed = { "utah house": new Set(), "utah senate": new Set() };
  for (const m of s.measures) for (const rc of m.rollcalls) {
    for (const n of rc.droppedNotOnRoster) (missed[rc.chamber] || new Set()).add(n);
  }
  for (const ch of ["utah house", "utah senate"]) {
    const names = [...missed[ch]].sort();
    if (!names.length) continue;
    L.push(`-- NOT WRITTEN — ${names.length} member(s) of the ${ch} who cast recorded votes in`);
    L.push("-- these roll calls and are not on the PolitiDex roster:");
    let line = "--   ";
    for (const n of names) {
      if (line.length + n.length > 76) { L.push(line.replace(/;\s*$/, ";")); line = "--   "; }
      line += n + "; ";
    }
    if (line.trim() !== "--") L.push(line.replace(/;\s*$/, ""));
    // A REFUSAL IS NOT A GAP, and the file says which is which. A gap is someone
    // the roster has never carried and could not have been resolved to. A refusal is a
    // printed name the roster COULD have absorbed — a shared surname, or a same-name
    // record holding a different office — where resolving it would have rested on a
    // guess about which human it is. Those are declined on purpose, and the map that
    // declined them carries the reason in prose, so the reason is quoted from there
    // rather than restated here in a form that might not fit the session.
    const refusedHere = names.filter((n) => (map._refusedNames || []).includes(n));
    if (refusedHere.length) {
      L.push(`-- ${refusedHere.length} of those (${refusedHere.join("; ")}) are REFUSALS rather than gaps:`);
      L.push("-- resolving them would have rested on a guess about which human the printed");
      L.push(`-- name is. See db/${path.basename(mapFile(session))} for each one.`);
    }
    L.push("");
  }
  if (firstSession) {
    L.push("-- Additive. Neither index constrains any existing federal row: both are");
    L.push("-- partial and both predicates are false for every row already in the table.");
    L.push("CREATE UNIQUE INDEX IF NOT EXISTS vr_rollcalls_state_unique");
    L.push("  ON vr_rollcalls (chamber, session, roll_number) WHERE congress IS NULL;");
    L.push("--> statement-breakpoint");
    L.push("CREATE UNIQUE INDEX IF NOT EXISTS vr_measures_utah_unique");
    L.push("  ON vr_measures (chamber, number, (external_ids->>'utahSession'))");
    L.push("  WHERE external_ids ? 'utahSession';");
    L.push("--> statement-breakpoint");
  } else {
    L.push("-- No DDL. vr_rollcalls_state_unique and vr_measures_utah_unique were created");
    L.push("-- by the 2025 general session's migration and carried into the drizzle chain");
    L.push("-- by its snapshot; this session relies on them and restates neither.");
  }
  L.push("");
  for (const m of s.measures) {
    const tag = `${m.session}/${m.utahBill}`;
    L.push(`-- ── ${m.number} — ${m.title}  (${tag}) ─────────────────────────`);
    L.push("DO $$");
    L.push("DECLARE m_id integer; rc_id integer;");
    L.push("BEGIN");
    L.push("  SELECT id INTO m_id FROM vr_measures");
    L.push(`   WHERE number = ${q(m.number)} AND chamber = ${q(m.chamber)}`);
    L.push(`     AND external_ids->>'utahSession' = ${q(m.session)} LIMIT 1;`);
    L.push("  IF m_id IS NULL THEN");
    L.push("    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,");
    L.push("      short_title, summary, status, source_url, source_label, external_ids)");
    L.push(`    VALUES (${q(m.measureType)}, NULL, ${q(m.chamber)}, ${q(m.number)}, ${q(m.title)},`);
    L.push(`      ${q(m.title)}, ${q(m.generalProvisions)}, ${q(m.status)},`);
    L.push(`      ${q(m.sourceUrl)}, ${q(m.sourceLabel)},`);
    L.push(`      jsonb_build_object('utahSession', ${q(m.session)}, 'utahBill', ${q(m.utahBill)},`);
    L.push(`        'primeSponsor', ${q(m.primeSponsor)}, 'floorSponsor', ${q(m.floorSponsor)}))`);
    L.push("    RETURNING id INTO m_id;");
    L.push("  END IF;");
    for (const i of m.issues) {
      L.push(`  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues`);
      L.push(`                  WHERE measure_id = m_id AND issue_key = ${q(i.issueKey)}) THEN`);
      L.push("    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,");
      L.push("      support_meaning, rationale, source_url)");
      L.push(`    VALUES (m_id, ${q(i.issueKey)}, ${i.weight}, ${i.isPrimary ? "true" : "false"},`);
      L.push(`      ${q(i.supportMeaning)}, ${q(i.rationale)}, ${q(m.sourceUrl)});`);
      L.push("  END IF;");
    }
    for (const rc of m.rollcalls) {
      L.push(`  SELECT id INTO rc_id FROM vr_rollcalls WHERE chamber = ${q(rc.chamber)}`);
      L.push(`     AND congress IS NULL AND session = ${rc.session}`);
      L.push(`     AND roll_number = ${rc.rollNumber} LIMIT 1;`);
      L.push("  IF rc_id IS NULL THEN");
      L.push("    INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number,");
      L.push("      vote_date, question, action_type, result, totals, source_url, source_label)");
      L.push(`    VALUES (m_id, ${q(rc.chamber)}, NULL, ${rc.session}, ${rc.rollNumber},`);
      L.push(`      ${q(rc.voteDate)}::timestamptz, ${q(rc.question)}, 'passage', ${q(rc.result)},`);
      L.push(`      ${q(JSON.stringify(rc.totals))}::jsonb, ${q(rc.sourceUrl)}, ${q(rc.sourceLabel)})`);
      L.push("    RETURNING id INTO rc_id;");
      L.push("  END IF;");
      if (rc.droppedNotOnRoster.length) {
        L.push(`  -- ${rc.droppedNotOnRoster.length} of the ${rc.droppedNotOnRoster.length + rc.votes.length} ` +
          "members recorded on this roll call are not on the PolitiDex roster; their");
        L.push("  -- votes are not written. Names are listed once at the head of this file.");
      }
      L.push("  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES");
      L.push(rc.votes.map((v) => `    (rc_id, ${q(v.politicianId)}, ${q(v.position)})`).join(",\n"));
      L.push("  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;");
    }
    L.push("END $$;");
    L.push("--> statement-breakpoint");
    L.push("");
  }
  fs.mkdirSync(OUTDIR, { recursive: true });
  const f = path.join(OUTDIR, firstSession
    ? "vr-utah-record.sql.draft" : `vr-utah-record-${session}.sql.draft`);
  fs.writeFileSync(f, L.join("\n"));
  console.log(`sql draft → ${f}  (${L.length} lines)`);
}

// Which sessions a no-network mode should act on: what --session names, or every
// session that has a promoted seed on disk.
function sessionsOnDisk() {
  if (ONLY_SESSION) return [ONLY_SESSION];
  const out = new Set();
  for (const f of fs.readdirSync(P("db"))) {
    if (f === "vr-utah-vote-seed.json") out.add(LEGACY_SESSION);
    const m = /^vr-utah-vote-seed-(\d{4}[A-Z0-9]*)\.json$/.exec(f);
    if (m) out.add(m[1]);
  }
  return [...out].sort();
}

// ── --survey ────────────────────────────────────────────────────────────────
// The candidate list, mechanically. db/vr-utah-bills.json is curator-authored and
// stays that way — but "which of a session's 550 bills even HAD a contested
// recorded final-passage vote" is not a judgement, it is a reading of the source,
// and doing it by hand is how a curator ends up choosing the bills they happened
// to remember. So the tool reads the session's passed-bills index, walks every
// bill's action table, applies the SAME final-passage and minority-share rules the
// seeder applies, and prints what qualifies. The curator then decides which of
// those to admit and which issue each one maps to — which is the part no tool can
// do — and writes the reasons down either way.
//
// It reports only what the session PUBLISHED as passed. A bill that failed on the
// floor never reaches the passed-bills index, and its HFAIL / SFAIL roll call is
// outside the admitted action codes anyway; both are stated in the runbook as
// coverage, not as a rule.
function survey() {
  if (!ONLY_SESSION) throw new Error("--survey needs --session <SESSION>, e.g. --session 2024GS");
  const session = ONLY_SESSION;
  const index = cached(`${session}/passed-bills.html`, SRC.passedBills(session));
  const bills = [];
  for (const tr of index.match(/<TR>[\s\S]*?<\/TR>/gi) || []) {
    const tds = tr.match(/<TD[^>]*>[\s\S]*?<\/TD>/gi) || [];
    if (tds.length < 3) continue;
    const m = /\/~(\d{4})\/bills\/static\/([A-Z]+\d{4})\.html/.exec(tds[0]);
    if (!m) continue;
    bills.push({ bill: m[2], title: de(tds[1].replace(/<[^>]*>/g, " ")), sponsor: de(tds[2].replace(/<[^>]*>/g, " ")) });
  }
  const seenBill = new Set();
  const rows = [];
  const unclassified = [];
  let scanned = 0;
  for (const b of bills) {
    if (seenBill.has(b.bill)) continue;
    seenBill.add(b.bill);
    scanned++;
    const j = JSON.parse(cached(`${session}/${b.bill}.json`, SRC.billJson(session, b.bill)));
    const page = cached(`${session}/${b.bill}.page.html`, SRC.billPage(session, b.bill));
    const n = normaliseBill(session, j, page);
    const { picked, procedural } = passageVotes(n);
    for (const a of procedural) {
      if (a.voteStr && !a.actionCode) unclassified.push(`${b.bill} ${a.description} ${a.voteStr} #${a.voteID}`);
    }
    for (const house of ["H", "S"]) {
      const a = picked[house];
      if (!a) continue;
      const mg = marginOK(a.voteStr);
      if (!mg.ok) continue;
      rows.push({ bill: b.bill, number: n.number, title: n.title, sponsor: b.sponsor,
        house, code: a.actionCode, voteId: a.voteID, margin: a.voteStr,
        share: +(mg.share * 100).toFixed(1), subjects: j.subjects || [] });
    }
  }
  rows.sort((x, y) => x.share - y.share || (x.bill < y.bill ? -1 : 1));
  const f = path.join(CACHE, `survey-${session}.json`);
  fs.writeFileSync(f, JSON.stringify({ session, scanned, contested: rows, unclassified }, null, 2) + "\n");
  if (AS_JSON) { console.log(JSON.stringify({ session, scanned, contested: rows, unclassified }, null, 2)); return; }
  console.log(`${session}: ${scanned} bills in the passed-bills index; ` +
    `${rows.length} admissible contested final-passage roll call(s) across ` +
    `${new Set(rows.map((r) => r.bill)).size} bill(s)`);
  for (const r of rows) {
    console.log(`  ${String(r.share).padStart(5)}%  ${r.house} ${r.code.padEnd(8)} ` +
      `${r.margin.padEnd(10)} ${r.number.padEnd(9)} ${r.title.slice(0, 62)}`);
  }
  if (unclassified.length) {
    console.log(`\n${unclassified.length} recorded vote(s) whose action text is not an admitted ` +
      "final-passage code (conference reports, suspension passage, failed passage):");
    unclassified.slice(0, 25).forEach((u) => console.log("   " + u));
    if (unclassified.length > 25) console.log(`   … and ${unclassified.length - 25} more`);
  }
  console.log(`\nsurvey → ${f}`);
}

// ── main ────────────────────────────────────────────────────────────────────
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    if (has("--collect")) collect();
    else if (has("--survey")) survey();
    else if (has("--seed")) seed();
    else if (has("--sql")) sessionsOnDisk().forEach(sqlDraft);
    else {
      console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8")
        .split("\n").filter((l) => l.startsWith("//")).join("\n"));
    }
  } catch (e) {
    console.error("vr-utah-ingest: " + (e && e.message ? e.message : e));
    process.exit(1);
  }
}
