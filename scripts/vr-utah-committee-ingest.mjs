#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// UTAH COMMITTEE VOTES — discover, read, refuse, draft
// ─────────────────────────────────────────────────────────────────────────────
// Waves 1 and 2 put Utah FLOOR votes in the formal lane. A floor vote is not the
// only recorded position a Utah legislator takes: a standing committee records who
// moved a bill out and who voted against doing so, and for many members — senators
// especially, because a Senate standing committee is five or six people — the
// committee record is where their position on a bill actually is.
//
// This tool is the committee sibling of scripts/vr-utah-ingest.mjs. It shares that
// file's fetch discipline (curl with a browser UA; a WAF reject page is a hard error,
// never an empty result) and its identity discipline (a printed name is resolved
// against a HUMAN-REVIEWED map or it is not resolved at all).
//
// ── WHERE THE MINUTES ARE ───────────────────────────────────────────────────
//   committees in a year   /ajax/ajaxLoadCommittees.jsp?yr=YYYY
//                            → 82 committees for 2025; standing committees are the
//                              ids beginning HST (House) and SST (Senate)
//   meetings of one        /committee/getMeetingInfo.jsp?com=<COM>&yr=YYYY
//                            → each meeting's mtgid. The `minutes` field is EMPTY
//                              in this list view; it is only populated per meeting.
//   one meeting            /committee/getMeetingInfo.jsp?mtgid=<ID>
//                            → `minutes` is the published PDF's path, e.g.
//                              /interim/2025/pdf/00001956.pdf
//   the minutes, machine   /MtgMinutes/PublicMinutes
//                            ?requestType=getMeetingInfo&meetingID=<ID>
//   the minutes, published https://le.utah.gov/interim/<YYYY>/pdf/<N>.pdf
//
// ── THE PDF AND THE JSON, AND WHY BOTH ──────────────────────────────────────
// The brief for this wave named the PDF as the only published source, and that was
// true of the source a reader is given: the PDF is what the legislature publishes as
// the minutes, and it is what a citation must point at. It is not the only MACHINE
// source. The same minutes are served as structured JSON, and that feed carries what
// the PDF only lays out visually: for each motion, `motionData.yesVotes`,
// `noVotes` and `absVotes` as explicit name lists.
//
// Re-deriving those lists from the PDF would mean reconstructing a four-column name
// table from glyph positions and deciding, from x-coordinates, which column a name
// sat under. That is a guess about layout standing in for a fact the publisher
// already states. So:
//
//   • the JSON feed is the EXTRACTION source — who voted, and which way;
//   • the PDF is the CITATION and the CROSS-CHECK. Every act this tool admits has to
//     be confirmable in the published PDF: the committee, the date, the motion
//     sentence and the vote tally, all four, read out of the PDF's own text by
//     scripts/vr-pdf-text.mjs. An act whose PDF cannot be read, or whose PDF does
//     not confirm it, is REFUSED and reported — never quietly kept on the JSON's
//     word alone.
//
// That is stricter than either source alone, and it is the reason the counts this
// tool prints have three columns rather than two.
//
// ── WHAT IS ADMITTED ────────────────────────────────────────────────────────
// A minutes row becomes a committee act only if all of this holds:
//
//   1. The minutes are APPROVED. A "Draft" or "Summary" minute is not yet the
//      committee's record of itself.
//   2. The row is a motion with a recorded roll — at least one yea or nay NAME. A
//      voice vote records no positions, and an attendance list is not a vote.
//   3. The motion is "moved to pass <BILL> out favorably [as amended]" — the act of
//      reporting a bill out. Motions to amend, to replace with a substitute, to hold,
//      to place on a calendar, to approve minutes and to adjourn are procedural: they
//      are not positions on the instrument, and vr_positions has no field in which an
//      inverted direction could be stored honestly, so they are refused rather than
//      guessed at.
//   4. The bill named IN THE MOTION matches the agenda item the motion sits under.
//      If the two disagree, or the motion names no bill, the row is refused: bill
//      identity that cannot be tied to the minutes row is not identity.
//   5. The bill is ALREADY a measure in the formal lane for that session, with issue
//      mappings already reviewed. Committee votes reuse the parent bill's existing
//      keys. This tool invents no keys, adds no measures, and writes no mapping.
//   6. Every voting name resolves through db/vr-utah-committee-map.json, which is a
//      human-accepted file. An unresolved name is counted as unmapped; a name whose
//      identity is contested is counted as REFUSED. The two are never added together.
//   7. `absVotes` is not a position. An absence is an absence.
//
// ── ONE ACT PER PERSON PER INSTRUMENT ───────────────────────────────────────
// A bill is reported out of a House committee and then a Senate committee, and a
// committee sometimes votes a bill out twice (a substitute, then the substitute as
// amended). vr_positions is keyed (measure, politician, action_type), so a person
// holds exactly one committee act per bill: the EARLIEST admitted one, which is the
// vote that actually reported the bill. Later reprints are counted as reprints.
//
// ── AND IT DOES NOT OUTWEIGH A FLOOR VOTE ───────────────────────────────────
// stance-helpers already handles the collision: a floor vote on a measure supersedes
// every non-floor act on it, so a member who voted in committee AND on the floor has
// one act's worth of direction, not two. This tool reports how many of its acts are
// superseded that way, because that number is the honest measure of what the wave
// adds. Committee acts also carry no roll number — vr_positions has no such column —
// so the floor roll_number space cannot collide with anything here.
//
// USAGE
//   --survey  [--session 2025GS]   fetch committee/meeting/minutes/PDF (network)
//   --collect [--session 2025GS]   read the cache; draft the printed-name map
//   --seed    [--session 2025GS]   write db/vr-utah-committee-seed[-S].json
//   --bucket  [--session 2025GS]   list the off-lane contested bills (curator worklist)
//   --sql     [--session 2025GS]   write the migration into --out
//   --json                         machine-readable report on stdout
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { pdfToLines } from "./vr-pdf-text.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const P = (...a) => path.join(ROOT, ...a);

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const CACHE = val("--cache", "/tmp/vr-utah-committee-cache");
const OUTDIR = val("--out", "/tmp/vr-utah-drafts");
const SESSION = val("--session", "2025GS");
const AS_JSON = has("--json");

// Same naming rule as the floor ingest: the first session shipped without a suffix,
// so it keeps its name and every later session carries one.
const LEGACY_SESSION = "2025GS";
const sessionFile = (base, session) =>
  P("db", session === LEGACY_SESSION ? `${base}.json` : `${base}-${session}.json`);
const floorMapFile = (s) => sessionFile("vr-utah-member-map", s);
const floorSeedFile = (s) => sessionFile("vr-utah-vote-seed", s);
const comMapFile = (s) => sessionFile("vr-utah-committee-map", s);
const comSeedFile = (s) => sessionFile("vr-utah-committee-seed", s);
const comMapDraft = (s) => path.join(CACHE, `vr-utah-committee-map.${s}.draft.json`);

const SRC = {
  committees: (yr) => `https://le.utah.gov/ajax/ajaxLoadCommittees.jsp?yr=${yr}`,
  meetings: (com, yr) => `https://le.utah.gov/committee/getMeetingInfo.jsp?com=${com}&yr=${yr}`,
  meeting: (id) => `https://le.utah.gov/committee/getMeetingInfo.jsp?mtgid=${id}`,
  minutes: (id) => `https://le.utah.gov/MtgMinutes/PublicMinutes?requestType=getMeetingInfo&meetingID=${id}`,
  pdf: (rel) => `https://le.utah.gov${rel}`,
};

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
function curl(url, binary) {
  return execFileSync("curl", ["-sS", "--max-time", "60", "-A", UA,
    "-H", "Accept: */*", "-H", "Accept-Language: en-US,en;q=0.9", url],
    { encoding: binary ? "buffer" : "utf8", maxBuffer: 64 * 1024 * 1024 });
}
function cached(rel, url, binary) {
  const f = path.join(CACHE, rel);
  if (fs.existsSync(f) && fs.statSync(f).size > 0) {
    return binary ? fs.readFileSync(f) : fs.readFileSync(f, "utf8");
  }
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const body = curl(url, binary);
  const head = (binary ? body.slice(0, 400).toString("latin1") : body.slice(0, 400));
  if (/Request Rejected|The requested URL was rejected/i.test(head)) {
    throw new Error(`source refused the request: ${url}`);
  }
  fs.writeFileSync(f, body);
  return body;
}
const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
// The AJAX endpoints answer with a JSON body preceded by whitespace or a stray
// newline often enough that JSON.parse on the raw text is not reliable.
const looseJson = (txt) => {
  const i = txt.indexOf("{");
  const j = txt.lastIndexOf("}");
  if (i < 0 || j < i) throw new Error("not a JSON object");
  return JSON.parse(txt.slice(i, j + 1));
};

const nospace = (s) => String(s || "").replace(/\s+/g, "");
const squash = (s) => String(s || "").replace(/\s+/g, " ").trim();
// Minutes text carries markup ("S.B. 308 Dual Language Immersion <i>(McCay, D.)</i>").
// The PDF has no tags, so the tags come off before anything is compared against it.
const detag = (s) => squash(String(s || "")
  .replace(/<[^>]*>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&#x27;/g, "'")
  .replace(/&quot;/g, '"'));
const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];

// ── the motion sentence ─────────────────────────────────────────────────────
// "Rep. Auxier moved to pass 2nd Substitute S.B. 137 out favorably as amended."
// Everything about admission that can be read off the sentence is read here, so
// there is one place to look when a refusal has to be explained.
export function readMotion(text) {
  const t = detag(text);
  if (!t) return { admit: false, why: "no_motion_text" };
  if (!/\bmoved to pass\b/i.test(t)) {
    const m = /\bmoved to ([a-z]+)/i.exec(t);
    return { admit: false, why: "not_a_pass_motion", kind: m ? m[1].toLowerCase() : "unknown" };
  }
  if (!/\bout favorabl/i.test(t)) return { admit: false, why: "pass_but_not_out_favorably" };
  const bm = /\b([HS])\.\s?([BJCR]{1,2})\.\s*0*(\d+)/i.exec(t);
  if (!bm) return { admit: false, why: "motion_names_no_bill" };
  const bill = bm[1].toUpperCase() + bm[2].toUpperCase().replace(/\./g, "") +
    String(bm[3]).padStart(4, "0");
  return {
    admit: true, bill, text: t,
    substitute: /\b\d+(?:st|nd|rd|th) Substitute\b/i.test(t),
    asAmended: /\bas amended\b/i.test(t),
  };
}

// ── THE SAME CONTESTEDNESS BAR THE FLOOR VOTES GOT ──────────────────────────
// Waves 1 and 2 admit a Utah floor roll call only when the losing side is at least
// 10% of the members who actually voted, on the ground that a margin that lopsided
// differentiates nobody. That rule was written for the Utah lane, not for one kind of
// vote inside it, and a committee vote is not a reason to relax it: 42 of the 76
// committee actions this session reports out of a bill already in the lane were
// unanimous. Admitting them would add rows that say only "this member was in the
// room and the bill moved".
//
// So the same bar applies here, on the same arithmetic — and what it costs is
// reported rather than hidden, because that number is what a curator would need in
// order to argue the other way: with the bar, 24 bills and 241 rows; without it, 42
// bills and 546. The bar stays.
const MIN_MINORITY_SHARE = 0.1;
export const committeeMarginOK = (yea, nay) =>
  yea + nay > 0 && Math.min(yea, nay) / (yea + nay) >= MIN_MINORITY_SHARE;

// ── the printed name ────────────────────────────────────────────────────────
// Committee minutes print a voting member as prefix + initials + surname
// ("Rep. T. Auxier"); the floor vote pages print surname + initials
// ("Auxier, T."). The transform is mechanical, and where it lands on a key the
// reviewed floor map already holds, the identity is the one a human already
// accepted. Where it does not, this returns the candidates and refuses to choose.
export function splitCommitteePrinted(printed) {
  const m = /^(Rep\.|Sen\.|Pres\.|Speaker)\s+((?:[A-Z]\.\s*)+)?(.+?)\s*$/.exec(squash(printed));
  if (!m) return null;
  return {
    chamber: m[1] === "Sen." || m[1] === "Pres." ? "S" : "H",
    initials: squash(m[2] || "").replace(/\s+/g, ""),
    surname: squash(m[3]),
  };
}
// The full name the SAME meeting prints in its attendance list ("Rep. Cheryl K.
// Acton, Chair") is the cross-check that turns a one-initial vote line into the
// floor map's key without anybody guessing. Three ways of writing one person have
// to be reconciled, and none of them is a reliable source of the others:
//
//   committee vote line   Rep. C. Acton          Rep. R. Walter
//   committee attendance  Rep. Cheryl K. Acton   Rep. R. Neil Walter
//   floor vote page       Acton, C.K.            Walter, N.
//
// Note the second column: the floor page prints Representative Walter by the name
// he goes by, and the committee prints his first initial. Neither is wrong and
// neither can be derived from the other — so the test is agreement against the FULL
// name, in both directions: the vote line's initials and the floor key's initials
// must both be an in-order subsequence of the attendance name's given-name initials.
const ROLE = /,\s*(Chair|Vice Chair|Co-?Chair|Chair Emeritus|President|Speaker)\s*$/i;
const stripName = (s) => squash(String(s || "").replace(ROLE, ""))
  .replace(/^(?:Rep\.|Sen\.|Pres\.|Speaker)\s+/, "");
const letters = (s) => squash(s).split(" ").filter(Boolean).map((t) => t[0].toUpperCase());
// given-name initials from a full display name ("Cheryl K. Acton" → C,K)
export function givenLetters(fullName) {
  const parts = stripName(fullName).split(" ");
  return parts.length < 2 ? [] : letters(parts.slice(0, -1).join(" "));
}
export function surnameOf(fullName) {
  const parts = stripName(fullName).split(" ");
  return parts[parts.length - 1] || "";
}
// the initials side of a floor map key ("Acton, C.K." → C,K; "Adams, J. Stuart" → J,S)
export function floorKeyLetters(key) {
  const after = String(key).split(",").slice(1).join(",");
  return letters(after.replace(/\./g, ". ").trim());
}
export const isSubsequence = (needle, hay) => {
  let i = 0;
  for (const h of hay) if (i < needle.length && needle[i] === h) i++;
  return i === needle.length;
};

// ── what the cache holds ────────────────────────────────────────────────────
function cachedMeetings(session) {
  const dir = path.join(CACHE, session);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /^minutes-\d+\.json$/.test(f))
    .map((f) => f.slice("minutes-".length, -".json".length))
    .sort((a, b) => Number(a) - Number(b));
}

function loadMeeting(session, id) {
  const dir = path.join(CACHE, session);
  const min = looseJson(fs.readFileSync(path.join(dir, `minutes-${id}.json`), "utf8"));
  let detail = null;
  const df = path.join(dir, `meeting-${id}.json`);
  if (fs.existsSync(df)) { try { detail = looseJson(fs.readFileSync(df, "utf8")); } catch { /* left null */ } }
  const pdfPath = detail && detail.minutes ? String(detail.minutes) : null;
  const pf = pdfPath ? path.join(dir, "pdf", `${id}.pdf`) : null;
  return { id, min, detail, pdfPath, pdfFile: pf && fs.existsSync(pf) ? pf : null };
}

// PDF text, once per meeting, cached on disk so --collect / --seed / --sql agree and
// so a re-run does not re-inflate 261 documents.
function pdfHaystack(session, m) {
  if (!m.pdfFile) return { readable: false, why: "no_pdf_published", lines: 0, hay: "" };
  const txtF = path.join(CACHE, session, "pdftext", `${m.id}.txt`);
  let txt;
  if (fs.existsSync(txtF)) txt = fs.readFileSync(txtF, "utf8");
  else {
    let lines = [];
    try { lines = pdfToLines(fs.readFileSync(m.pdfFile)); }
    catch (e) { return { readable: false, why: `pdf_unreadable: ${e.message}`, lines: 0, hay: "" }; }
    txt = lines.join("\n");
    fs.mkdirSync(path.dirname(txtF), { recursive: true });
    fs.writeFileSync(txtF, txt);
  }
  const lines = txt ? txt.split("\n") : [];
  if (!lines.length) return { readable: false, why: "pdf_has_no_extractable_text", lines: 0, hay: "" };
  return { readable: true, why: null, lines: lines.length, hay: nospace(txt), plain: squash(txt) };
}

// A COMMITTEE THAT WAS RENAMED IS STILL THE SAME COMMITTEE. The meeting record's
// `description` is the committee's name in the metadata, and the PDF prints the
// name on its own letterhead — and the two drift. The 2024 session has three
// meetings of "House Public Utilities and Energy Standing Committee" whose minutes
// are headed "HOUSE PUBLIC UTILITIES, ENERGY, AND TECHNOLOGY STANDING COMMITTEE":
// the committee was renamed and the metadata kept the old name. Refusing those is
// not caution, it is a wrong answer — the document is plainly the right one, and
// its date, its motion sentence and its tally all confirm.
//   So the committee check has a second door: the chamber word plus the first two
// significant words of the name. That is enough to identify a committee (no two
// Utah standing committees share a chamber and their first two significant words),
// and it cannot admit a wrong document on its own, because the date, the motion
// sentence and the printed tally still all have to match the same PDF.
const COM_STOP = new Set(["and", "the", "of", "on", "standing", "committee",
  "subcommittee", "appropriations", "interim"]);
export function committeePrefixKey(committee) {
  const words = String(committee || "").replace(/[^A-Za-z\s]/g, " ").split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "";
  const chamber = /^(house|senate)$/i.test(words[0]) ? words[0] : "";
  if (!chamber) return "";
  const sig = words.slice(1).filter((w) => !COM_STOP.has(w.toLowerCase())).slice(0, 2);
  if (sig.length < 2) return "";
  return nospace(`${chamber}${sig.join("")}`).toUpperCase();
}

// ── the four things the published PDF has to confirm ─────────────────────────
export function confirmAgainstPdf(hay, { committee, dateWords, motionText, yea, nay, abs }) {
  const missing = [];
  const HAY = hay.toUpperCase();
  const full = nospace(committee).toUpperCase();
  const pref = committeePrefixKey(committee);
  const byFull = full && HAY.includes(full);
  const byPrefix = !byFull && pref && HAY.includes(pref);
  if (!byFull && !byPrefix) missing.push("committee");
  if (!hay.includes(nospace(dateWords))) missing.push("date");
  if (!hay.includes(nospace(motionText).replace(/\.$/, ""))) missing.push("motion");
  const tally = [
    `Yeas-${yea}Nays-${nay}Absent-${abs}`,
    `Yeas-${yea}Nays-${nay}AbsentorNotVoting-${abs}`,
    `voteof${yea}-${nay}-${abs}`,
  ].map(nospace);
  if (!tally.some((t) => hay.includes(t))) missing.push("tally");
  // `renamed` is a disclosure, not a pass/fail: it says the act was confirmed on
  // the committee's short name because the letterhead and the metadata disagree.
  return { ok: missing.length === 0, missing, renamed: !!byPrefix };
}

// ─────────────────────────────────────────────────────────────────────────────
// SURVEY — network. What the session has, and everything needed to read it.
// ─────────────────────────────────────────────────────────────────────────────
function survey(session) {
  const yr = session.slice(0, 4);
  const dir = path.join(CACHE, session);
  const comsTxt = cached(`${session}/committees.json`, SRC.committees(yr));
  const coms = looseJson(comsTxt);
  const all = coms.committees || coms.data || [];
  // The committee list names its code `ownerid`; `id` / `comCode` are what other
  // le.utah.gov feeds call the same thing, and are accepted so a shape change on
  // their side does not silently return zero committees. Which is exactly what it
  // did: the 2025 survey ran against a cache a prototype had already filled, so
  // this filter matched nothing and nobody noticed until 2024GS was fetched cold.
  const comCode = (c) => String((c && (c.ownerid || c.id || c.comCode)) || "");
  const standing = all.filter((c) => /^(HST|SST)/.test(comCode(c)));
  const out = { session, committees: all.length, standing: standing.length, meetings: 0, minutes: 0, pdfs: 0, noPdf: 0, perCommittee: {} };
  for (const c of standing) {
    const id = comCode(c);
    const list = looseJson(cached(`${session}/meetings-${id}.json`, SRC.meetings(id, yr)));
    const mtgs = list.meetings || [];
    out.perCommittee[id] = mtgs.length;
    out.meetings += mtgs.length;
    for (const m of mtgs) {
      const mid = String(m.mtgid);
      const detail = looseJson(cached(`${session}/meeting-${mid}.json`, SRC.meeting(mid)));
      cached(`${session}/minutes-${mid}.json`, SRC.minutes(mid));
      out.minutes++;
      if (detail.minutes) {
        cached(`${session}/pdf/${mid}.pdf`, SRC.pdf(String(detail.minutes)), true);
        out.pdfs++;
      } else out.noPdf++;
    }
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "survey.json"), JSON.stringify(out, null, 2));
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// COLLECT — no network. Read the cache, apply the admission rules, and report.
// ─────────────────────────────────────────────────────────────────────────────
// `extraLane` — THE DOOR FOR A CURATOR PASS, AND WHY IT IS A PARAMETER.
// Rule 5 above says a committee act is admitted only for a bill already in the formal
// lane with reviewed issue mappings, and that rule is not being relaxed: a bill still
// cannot reach an act without a reviewed mapping. What `extraLane` changes is WHERE
// the reviewed mapping may come from. Wave 1's floor seed is one reviewed source;
// wave 4's committee-mapping file (db/vr-utah-committee-bills-<S>.json, read and
// decided bill by bill against the enrolled text) is another. Both are human-accepted
// files in this repo, and a bill in neither is refused exactly as before.
//
// Every other fence still applies to an extraLane bill without exception — the
// contested-margin bar, the four-way PDF confirmation, the reviewed printed-name map,
// one act per person per bill. The floor-supersession bookkeeping applies too: an
// extraLane measure carries whatever floor voters its caller states, which for a
// committee-only measure is none, and that is reported rather than assumed away.
export function collect(session, { reviewedMapRequired, extraLane }) {
  const floorMap = readJson(floorMapFile(session));
  const floorSeed = readJson(floorSeedFile(session));
  const lane = new Map();               // BILL -> measure from the floor seed
  const floorVoters = new Map();        // BILL -> Set(pid) already on a floor roll
  for (const m of floorSeed.measures) {
    lane.set(m.utahBill, m);
    const set = new Set();
    for (const rc of m.rollcalls || []) for (const v of rc.votes || []) set.add(v.politicianId);
    floorVoters.set(m.utahBill, set);
  }
  for (const [bill, m] of (extraLane || new Map())) {
    if (lane.has(bill)) continue;       // the floor seed's reviewed mapping wins
    lane.set(bill, m);
    const set = new Set();
    for (const rc of m.rollcalls || []) for (const v of rc.votes || []) set.add(v.politicianId);
    floorVoters.set(bill, set);
  }
  // surname → floor keys, per chamber: the only fallback, and only when unique.
  const bySurname = { H: new Map(), S: new Map() };
  for (const ch of ["H", "S"]) {
    for (const key of Object.keys(floorMap.chambers[ch] || {})) {
      const s = key.split(",")[0].trim();
      if (!bySurname[ch].has(s)) bySurname[ch].set(s, []);
      bySurname[ch].get(s).push(key);
    }
  }
  const reviewed = fs.existsSync(comMapFile(session)) ? readJson(comMapFile(session)) : null;
  if (reviewedMapRequired && !reviewed) {
    throw new Error(`${path.relative(ROOT, comMapFile(session))} does not exist — run --collect, review the draft, commit it`);
  }
  const refusedNames = (reviewed && reviewed._refusedNames) || {};

  const rep = {
    session,
    meetings: { cached: 0, approved: 0, notApproved: 0, byStatus: {} },
    pdfs: { published: 0, fetched: 0, readable: 0, unreadable: 0, unreadableIds: [] },
    motions: { total: 0, withRecordedRoll: 0, nearUnanimous: 0, admitted: 0, refused: {} },
    bills: { inLane: 0, inLaneAnyCommitteeVote: [], offLane: 0, offLaneList: [],
             offLaneContested: 0, offLaneContestedList: [], offLaneDetail: {} },
    names: { resolved: 0, unmapped: 0, refused: 0, unmappedForms: {}, refusedForms: {} },
    acts: { built: 0, reprints: 0, pdfUnconfirmed: 0, pdfUnconfirmedDetail: [],
            pdfConfirmedOnShortName: 0, renamedCommittees: [] },
    rows: { kept: 0, supersededByFloor: 0, freshOfFloor: 0 },
  };
  const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };
  const forms = new Map();              // printed form -> proposal
  const acts = [];

  for (const id of cachedMeetings(session)) {
    rep.meetings.cached++;
    const m = loadMeeting(session, id);
    const d = m.min;
    bump(rep.meetings.byStatus, d.minutesStatus || "(none)");
    if (d.minutesStatus !== "APPROVED") { rep.meetings.notApproved++; continue; }
    rep.meetings.approved++;
    if (m.pdfPath) rep.pdfs.published++;
    if (m.pdfFile) rep.pdfs.fetched++;
    const pdf = pdfHaystack(session, m);
    if (pdf.readable) rep.pdfs.readable++;
    else { rep.pdfs.unreadable++; rep.pdfs.unreadableIds.push(`${id}:${pdf.why}`); }

    // Attendance display names, for the initials cross-check.
    // attendancePresent/Absent are [{displayName}], and the display name carries the
    // committee role: "Rep. Candice B. Pierucci, Chair".
    const attendance = [...(d.attendancePresent || []), ...(d.attendanceAbsent || [])]
      .map((a) => (a && typeof a === "object" ? a.displayName : a))
      .filter(Boolean);
    const attBySurname = new Map();
    for (const a of attendance) {
      const s = surnameOf(a);
      if (!attBySurname.has(s)) attBySurname.set(s, []);
      attBySurname.get(s).push(a);
    }
    const dateWords = `${d.month} ${d.day}, ${d.year}`;
    const iso = `${d.year}-${String(MONTHS.indexOf(d.month) + 1).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;

    let ai = null;
    for (const it of d.minutesItems || []) {
      if (it.type === "AI") { ai = it; continue; }
      if (it.type !== "motion") continue;
      rep.motions.total++;
      const md = it.motionData || {};
      const yes = md.yesVotes || [], no = md.noVotes || [], absent = md.absVotes || [];
      if (yes.length + no.length > 0) rep.motions.withRecordedRoll++;
      const mot = readMotion(it.text || it.description || "");
      if (!mot.admit) { bump(rep.motions.refused, mot.why + (mot.kind ? `:${mot.kind}` : "")); continue; }
      if (yes.length + no.length === 0) { bump(rep.motions.refused, "no_recorded_roll"); continue; }
      const aiBill = ai && ai.billNo ? String(ai.billNo).replace(/S\d\d$/, "") : null;
      if (!aiBill) { bump(rep.motions.refused, "agenda_item_names_no_bill"); continue; }
      if (aiBill !== mot.bill) { bump(rep.motions.refused, "motion_bill_disagrees_with_agenda_item"); continue; }
      const contested = committeeMarginOK(yes.length, no.length);
      if (!lane.has(mot.bill)) {
        bump(rep.motions.refused, "bill_not_in_formal_lane");
        rep.bills.offLane++;
        if (!rep.bills.offLaneList.includes(mot.bill)) rep.bills.offLaneList.push(mot.bill);
        if (contested) {
          rep.bills.offLaneContested++;
          if (!rep.bills.offLaneContestedList.includes(mot.bill)) rep.bills.offLaneContestedList.push(mot.bill);
          // THE BUCKET, WRITTEN DOWN RATHER THAN COUNTED. Wave 3 reported this
          // bucket as a number, and a number cannot be worked. A curator pass needs
          // the row itself — which committee, which day, which motion sentence,
          // which tally — so `--bucket` can hand the pass a worklist instead of a
          // count. Nothing here is admitted: the bill still has no reviewed
          // mapping, and this branch still `continue`s.
          const det = (rep.bills.offLaneDetail[mot.bill] = rep.bills.offLaneDetail[mot.bill] || []);
          det.push({
            meeting: id, committee: d.description || "", date: iso, motion: mot.text,
            yea: yes.length, nay: no.length, absent: absent.length,
            chamber: /^Senate/i.test(d.description || "") ? "utah senate" : "utah house",
            sourceUrl: m.pdfPath ? SRC.pdf(m.pdfPath) : null, minutesUrl: SRC.minutes(id),
          });
        }
        continue;
      }
      // Counted before the contestedness bar, so the header can say what the bar
      // cost this session instead of quoting another session's numbers.
      if (!rep.bills.inLaneAnyCommitteeVote.includes(mot.bill)) rep.bills.inLaneAnyCommitteeVote.push(mot.bill);
      if (!contested) {
        bump(rep.motions.refused, "near_unanimous");
        rep.motions.nearUnanimous++;
        continue;
      }
      // The published PDF has to say the same thing.
      if (!pdf.readable) {
        bump(rep.motions.refused, "pdf_not_readable");
        rep.acts.pdfUnconfirmed++;
        rep.acts.pdfUnconfirmedDetail.push({ meeting: id, bill: mot.bill, missing: ["pdf"] });
        continue;
      }
      const conf = confirmAgainstPdf(pdf.hay, {
        committee: d.description || "", dateWords, motionText: mot.text,
        yea: yes.length, nay: no.length, abs: absent.length,
      });
      if (!conf.ok) {
        bump(rep.motions.refused, "pdf_does_not_confirm");
        rep.acts.pdfUnconfirmed++;
        rep.acts.pdfUnconfirmedDetail.push({ meeting: id, bill: mot.bill, missing: conf.missing });
        continue;
      }
      if (conf.renamed) {
        rep.acts.pdfConfirmedOnShortName++;
        const nm = d.description || "";
        if (!rep.acts.renamedCommittees.includes(nm)) rep.acts.renamedCommittees.push(nm);
      }
      rep.motions.admitted++;

      const voters = [];
      for (const [list, supports] of [[yes, true], [no, false]]) {
        for (const printed of list) {
          const sp = splitCommitteePrinted(printed);
          const chamber = sp ? sp.chamber : null;
          const key = sp && sp.initials ? `${sp.surname}, ${sp.initials}` : sp ? sp.surname : null;
          const refusedHere = chamber && (refusedNames[chamber] || []).includes(printed);
          let proposal = forms.get(printed);
          if (!proposal) {
            proposal = proposeForm(printed, sp, floorMap, bySurname, attBySurname, refusedHere);
            forms.set(printed, proposal);
          }
          if (reviewed && reviewed.printedForms && chamber &&
              reviewed.printedForms[chamber] && reviewed.printedForms[chamber][printed]) {
            const r = reviewed.printedForms[chamber][printed];
            voters.push({ printed, politicianId: r.politicianId, supports, floorKey: r.floorKey || key });
            continue;
          }
          if (reviewedMapRequired || !proposal.politicianId) continue; // counted below
          voters.push({ printed, politicianId: proposal.politicianId, supports, floorKey: proposal.floorKey });
        }
      }
      acts.push({
        meeting: id, bill: mot.bill, committee: d.description || "",
        committeeId: (m.detail && (m.detail.comCode || m.detail.com)) || null,
        chamber: /^Senate/i.test(d.description || "") ? "utah senate" : "utah house",
        date: iso, place: d.place || null, motion: mot.text,
        result: md.status || null, substitute: !!mot.substitute, asAmended: !!mot.asAmended,
        yea: yes.length, nay: no.length, absent: absent.length,
        sourceUrl: m.pdfPath ? SRC.pdf(m.pdfPath) : null,
        minutesUrl: SRC.minutes(id),
        voters,
      });
    }
  }

  // Names: resolved / unmapped / refused, counted apart from each other.
  for (const [printed, p] of forms) {
    const ch = p.chamber || "?";
    if (p.refused) { rep.names.refused++; (rep.names.refusedForms[ch] = rep.names.refusedForms[ch] || []).push(printed); }
    else if (p.politicianId) rep.names.resolved++;
    else { rep.names.unmapped++; (rep.names.unmappedForms[ch] = rep.names.unmappedForms[ch] || []).push(printed); }
  }

  // One act per (bill, pid): earliest date wins; later ones are reprints.
  acts.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : Number(a.meeting) - Number(b.meeting)));
  rep.acts.built = acts.length;
  rep.bills.inLane = new Set(acts.map((a) => a.bill)).size;
  const kept = new Map();
  for (const a of acts) {
    for (const v of a.voters) {
      const k = `${a.bill}|${v.politicianId}`;
      if (kept.has(k)) { rep.acts.reprints++; continue; }
      kept.set(k, { ...v, act: a });
    }
  }
  rep.rows.kept = kept.size;
  for (const [k, v] of kept) {
    const bill = k.split("|")[0];
    if ((floorVoters.get(bill) || new Set()).has(v.politicianId)) rep.rows.supersededByFloor++;
    else rep.rows.freshOfFloor++;
  }
  return { rep, acts, kept, forms, lane, floorVoters, floorMap, reviewed };
}

// One printed form → a proposal a human can accept or reject. Never a guess: the
// only fallback beyond an exact key is a surname that is unique in that chamber AND
// an attendance line from the same meeting whose initials contain the printed one.
function proposeForm(printed, sp, floorMap, bySurname, attBySurname, refusedHere) {
  if (!sp) return { printed, chamber: null, politicianId: null, how: "unparsable_printed_form" };
  const ch = sp.chamber;
  const exactKey = sp.initials ? `${sp.surname}, ${sp.initials}` : sp.surname;
  if (refusedHere) return { printed, chamber: ch, politicianId: null, refused: true, how: "refused_by_reviewer" };
  const table = floorMap.chambers[ch] || {};
  if (table[exactKey]) {
    return { printed, chamber: ch, politicianId: table[exactKey], floorKey: exactKey, how: "exact_floor_key" };
  }
  const cands = bySurname[ch].get(sp.surname) || [];
  if (cands.length !== 1) {
    return {
      printed, chamber: ch, politicianId: null, how: cands.length ? "surname_ambiguous" : "surname_not_on_floor_map",
      candidates: cands,
    };
  }
  const floorKey = cands[0];
  const att = attBySurname.get(sp.surname) || [];
  if (att.length !== 1) {
    return {
      printed, chamber: ch, politicianId: null, candidates: cands, attendance: att,
      how: att.length ? "attendance_names_more_than_one_of_that_surname" : "surname_absent_from_attendance",
    };
  }
  const given = givenLetters(att[0]);
  const printedLetters = letters(sp.initials.replace(/\./g, ". "));
  if (!isSubsequence(printedLetters, given) || !isSubsequence(floorKeyLetters(floorKey), given)) {
    return {
      printed, chamber: ch, politicianId: null, candidates: cands, attendance: att,
      how: "attendance_initials_disagree",
    };
  }
  return {
    printed, chamber: ch, politicianId: floorMap.chambers[ch][floorKey], floorKey,
    how: "unique_surname_confirmed_by_attendance", confirmedBy: att[0],
  };
}

function writeDraftMap(session, forms) {
  const printedForms = { H: {}, S: {} }, unmapped = { H: [], S: [] };
  for (const [printed, p] of [...forms].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (!p.chamber) { continue; }
    if (p.politicianId) {
      printedForms[p.chamber][printed] = {
        politicianId: p.politicianId, floorKey: p.floorKey, how: p.how,
        ...(p.confirmedBy ? { confirmedBy: p.confirmedBy } : {}),
      };
    } else {
      unmapped[p.chamber].push({ printed, how: p.how, candidates: p.candidates || [], attendance: p.attendance || [] });
    }
  }
  const draft = {
    _comment: "DRAFT — proposals only. Review every entry, then commit as db/vr-utah-committee-map*.json.",
    session, generatedFrom: "scripts/vr-utah-committee-ingest.mjs --collect",
    printedForms, unmapped, _refusedNames: { H: [], S: [] },
  };
  fs.mkdirSync(path.dirname(comMapDraft(session)), { recursive: true });
  fs.writeFileSync(comMapDraft(session), JSON.stringify(draft, null, 2) + "\n");
  return comMapDraft(session);
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED — the committed shape the migration is generated from.
// ─────────────────────────────────────────────────────────────────────────────
function buildSeed(session) {
  const { rep, acts, kept, lane, floorVoters } = collect(session, { reviewedMapRequired: true });
  const byBill = new Map();
  for (const [k, v] of kept) {
    const bill = k.split("|")[0];
    if (!byBill.has(bill)) byBill.set(bill, new Map());
    const a = v.act;
    const ak = `${a.meeting}`;
    if (!byBill.get(bill).has(ak)) {
      byBill.get(bill).set(ak, {
        meetingId: a.meeting, committee: a.committee, committeeChamber: a.chamber,
        date: a.date, motion: a.motion, result: a.result,
        printedTotals: { yea: a.yea, nay: a.nay, absent: a.absent },
        sourceUrl: a.sourceUrl, minutesUrl: a.minutesUrl, votes: [],
      });
    }
    byBill.get(bill).get(ak).votes.push({
      politicianId: v.politicianId, supports: v.supports, printedAs: v.printed,
      supersededByFloorVote: (floorVoters.get(bill) || new Set()).has(v.politicianId),
    });
  }
  const measures = [];
  for (const [bill, byMeeting] of [...byBill].sort()) {
    const m = lane.get(bill);
    const committeeActs = [...byMeeting.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
    for (const ca of committeeActs) ca.votes.sort((a, b) => a.politicianId.localeCompare(b.politicianId));
    measures.push({
      session, utahBill: bill, number: m.number, title: m.title, chamber: m.chamber,
      issueKeys: (m.issues || []).map((i) => i.issueKey),
      committeeActs,
    });
  }
  const seed = {
    _comment:
      "Utah committee votes as formal acts (vr_positions, action_type='committee_vote'). " +
      "Extraction source: the legislature's structured minutes feed; every act confirmed " +
      "against the published minutes PDF (committee, date, motion, tally). No issue keys " +
      "are defined here: a committee act inherits the parent bill's reviewed mappings.",
    generatedBy: "scripts/vr-utah-committee-ingest.mjs --seed",
    session,
    counts: {
      measures: measures.length,
      committeeActs: measures.reduce((n, m) => n + m.committeeActs.length, 0),
      positions: rep.rows.kept,
      supersededByFloorVote: rep.rows.supersededByFloor,
      notOnAnyFloorRoll: rep.rows.freshOfFloor,
      reprintsDropped: rep.acts.reprints,
      nearUnanimousRefused: rep.motions.nearUnanimous,
      billsWithAnyCommitteeVote: rep.bills.inLaneAnyCommitteeVote.length,
    },
    measures,
  };
  return { seed, rep };
}

// ─────────────────────────────────────────────────────────────────────────────
// SQL
// ─────────────────────────────────────────────────────────────────────────────
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
export function buildSql(session) {
  const seed = readJson(comSeedFile(session));
  const L = [];
  const yr = session.slice(0, 4);
  // Every number in this header is read off the seed. The one time a figure was
  // typed in by hand it survived a session change and told 2024's readers 2025's
  // truth, so an older seed that predates these two keys is a hard error rather
  // than a header with a hole in it.
  const anyCV = seed.counts.billsWithAnyCommitteeVote;
  if (anyCV == null || seed.counts.nearUnanimousRefused == null) {
    throw new Error(`${comSeedFile(session)} predates counts.billsWithAnyCommitteeVote / counts.nearUnanimousRefused — re-run --seed for ${session}`);
  }
  L.push(`-- ─────────────────────────────────────────────────────────────────────────────`);
  L.push(`-- vr_positions — Utah ${yr} committee votes as formal acts`);
  L.push(`-- ─────────────────────────────────────────────────────────────────────────────`);
  L.push(`-- WHAT THIS ADDS. ${seed.counts.positions} committee votes — ${seed.counts.committeeActs} committee actions on ${seed.counts.measures} bills`);
  L.push(`-- already in the formal lane for ${session} — written as`);
  L.push(`-- vr_positions rows with action_type = 'committee_vote'. That action type already`);
  L.push(`-- exists in stance-helpers' act table at weight 0.60 and prints as "Committee vote";`);
  L.push(`-- nothing about weights, labels or floors is changed by this file.`);
  L.push(`--`);
  L.push(`-- WHY NOT vr_rollcalls. A committee vote is not a floor vote. Stored as a roll call`);
  L.push(`-- it would print "Voted Yea" at floor weight 1.00 and would need a roll number in a`);
  L.push(`-- space the floor already owns. vr_positions has no roll_number column at all, so`);
  L.push(`-- these ${seed.counts.positions} rows cannot collide with any floor roll number, in this session or`);
  L.push(`-- another. The meeting is identified in each row's note and source URL instead.`);
  L.push(`--`);
  L.push(`-- AND IT DOES NOT DOUBLE COUNT. ${seed.counts.supersededByFloorVote} of these rows belong to a member`);
  L.push(`-- who also has an admitted FLOOR vote on the same bill. stance-helpers supersedes every`);
  L.push(`-- non-floor act on an instrument a member floor-voted on, and _pdxRecordMappedCounts`);
  L.push(`-- leaves those rows out of the coverage count for the same reason. They are written`);
  L.push(`-- because they happened, not to add depth: the depth this file adds is the other`);
  L.push(`-- ${seed.counts.notOnAnyFloorRoll} rows, where the committee record is the only record of that member on`);
  L.push(`-- that bill.`);
  L.push(`--`);
  L.push(`-- WHAT IS NOT HERE. No measures and no issue mappings: a committee act reuses the`);
  L.push(`-- parent bill's reviewed keys, and a bill with no reviewed mapping is refused rather`);
  L.push(`-- than mapped on the strength of a committee vote. No sponsorships. No absences —`);
  L.push(`-- an absence is not a recorded position. No procedural motions (amend, replace,`);
  L.push(`-- hold, calendar): vr_positions has no field for an inverted direction, so a motion`);
  L.push(`-- whose yea does not mean "advance this bill" is left out rather than guessed at.`);
  L.push(`-- ${seed.counts.reprintsDropped} later reprints of a committee's own vote on the same bill are dropped, so a`);
  L.push(`-- member holds one committee act per bill. And no near-unanimous committee vote: the`);
  L.push(`-- same 10%-minority bar the floor roll calls were selected under applies here, which`);
  L.push(`-- is why ${seed.counts.measures} bills are represented and not the ${anyCV} that had a committee vote at all.`);
  L.push(`--`);
  L.push(`-- THE TIME OF DAY IS NOT KNOWN. The minutes state the meeting's date; they do not`);
  L.push(`-- timestamp the individual motion. acted_at is therefore that date at midnight`);
  L.push(`-- Mountain Standard Time, which is the session's own clock, rather than a guess at`);
  L.push(`-- the hour taken from the meeting's start time.`);
  L.push(`--`);
  L.push(`-- SOURCES. Every row carries the published minutes PDF it was confirmed against.`);
  L.push(`--   committees        https://le.utah.gov/ajax/ajaxLoadCommittees.jsp?yr=${yr}`);
  L.push(`--   meetings          https://le.utah.gov/committee/getMeetingInfo.jsp?com=<COM>&yr=${yr}`);
  L.push(`--   one meeting       https://le.utah.gov/committee/getMeetingInfo.jsp?mtgid=<ID>`);
  L.push(`--   minutes, machine  https://le.utah.gov/MtgMinutes/PublicMinutes`);
  L.push(`--                       ?requestType=getMeetingInfo&meetingID=<ID>`);
  L.push(`--   minutes, PDF      https://le.utah.gov/interim/${yr}/pdf/<N>.pdf`);
  L.push(`--`);
  L.push(`-- REPRODUCING IT. scripts/vr-utah-committee-ingest.mjs --survey --session ${session}`);
  L.push(`-- (network), then --collect (reads the cache, drafts the printed-name map), then`);
  L.push(`-- --seed and --sql. The seed is committed at db/${path.basename(comSeedFile(session))};`);
  L.push(`-- the reviewed name table at db/${path.basename(comMapFile(session))}.`);
  L.push(`--`);
  L.push(`-- IDEMPOTENT. Every row is ON CONFLICT DO NOTHING against vr_positions_unique`);
  L.push(`-- (measure_id, politician_id, action_type). No DDL.`);
  L.push(`-- ─────────────────────────────────────────────────────────────────────────────`);
  L.push("");
  for (const m of seed.measures) {
    L.push(`-- ── ${m.number} — ${m.title}  (${session}/${m.utahBill}) ${"─".repeat(Math.max(2, 60 - m.title.length))}`);
    L.push(`DO $$`);
    L.push(`DECLARE m_id integer;`);
    L.push(`BEGIN`);
    L.push(`  SELECT id INTO m_id FROM vr_measures`);
    L.push(`   WHERE number = ${q(m.number)} AND chamber = ${q(m.chamber)}`);
    L.push(`     AND external_ids->>'utahSession' = ${q(session)} LIMIT 1;`);
    L.push(`  IF m_id IS NULL THEN`);
    L.push(`    RAISE NOTICE ${q(`${m.utahBill}: measure absent, committee votes skipped`)};`);
    L.push(`  ELSE`);
    for (const ca of m.committeeActs) {
      L.push(`    -- ${ca.date} · ${ca.committee} · ${ca.motion}`);
      L.push(`    --   printed tally ${ca.printedTotals.yea}-${ca.printedTotals.nay}-${ca.printedTotals.absent} (yea-nay-absent); ${ca.votes.length} of the ${ca.printedTotals.yea + ca.printedTotals.nay} named voters are on the PolitiDex roster`);
      const note = `${ca.committee} · meeting ${ca.meetingId} · ${ca.motion}`;
      L.push(`    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES`);
      const rows = ca.votes.map((v) =>
        `      (m_id, ${q(v.politicianId)}, 'committee_vote', ${v.supports}, ${q(ca.date + "T00:00:00-07:00")}::timestamptz, ${q(ca.sourceUrl)}, ${q(note)})`);
      L.push(rows.join(",\n"));
      L.push(`    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;`);
    }
    L.push(`  END IF;`);
    L.push(`END $$;`);
    L.push("");
  }
  // ── verification ──
  L.push(`-- ── VERIFICATION ────────────────────────────────────────────────────────────`);
  L.push(`-- Fails loudly rather than leaving a half-written committee record behind.`);
  L.push(`DO $$`);
  L.push(`DECLARE n_pos integer; n_floorish integer; n_nosrc integer; n_measures integer;`);
  L.push(`BEGIN`);
  L.push(`  SELECT count(*) INTO n_pos FROM vr_positions p`);
  L.push(`    JOIN vr_measures m ON m.id = p.measure_id`);
  L.push(`   WHERE p.action_type = 'committee_vote'`);
  L.push(`     AND m.external_ids->>'utahSession' = ${q(session)};`);
  L.push(`  IF n_pos <> ${seed.counts.positions} THEN`);
  L.push(`    RAISE EXCEPTION 'expected ${seed.counts.positions} Utah ${session} committee_vote positions, found %', n_pos;`);
  L.push(`  END IF;`);
  L.push(`  SELECT count(DISTINCT p.measure_id) INTO n_measures FROM vr_positions p`);
  L.push(`    JOIN vr_measures m ON m.id = p.measure_id`);
  L.push(`   WHERE p.action_type = 'committee_vote'`);
  L.push(`     AND m.external_ids->>'utahSession' = ${q(session)};`);
  L.push(`  IF n_measures <> ${seed.counts.measures} THEN`);
  L.push(`    RAISE EXCEPTION 'expected ${seed.counts.measures} bills with Utah ${session} committee votes, found %', n_measures;`);
  L.push(`  END IF;`);
  L.push(`  -- A committee act must never have been written as a roll call.`);
  L.push(`  SELECT count(*) INTO n_floorish FROM vr_rollcalls r`);
  L.push(`    JOIN vr_measures m ON m.id = r.measure_id`);
  L.push(`   WHERE m.external_ids->>'utahSession' = ${q(session)}`);
  L.push(`     AND r.action_type = 'committee_vote';`);
  L.push(`  IF n_floorish > 0 THEN`);
  L.push(`    RAISE EXCEPTION 'a committee vote reached vr_rollcalls (% rows)', n_floorish;`);
  L.push(`  END IF;`);
  L.push(`  -- Every act carries the published PDF it was confirmed against.`);
  L.push(`  SELECT count(*) INTO n_nosrc FROM vr_positions p`);
  L.push(`    JOIN vr_measures m ON m.id = p.measure_id`);
  L.push(`   WHERE p.action_type = 'committee_vote'`);
  L.push(`     AND m.external_ids->>'utahSession' = ${q(session)}`);
  L.push(`     AND (p.source_url IS NULL OR p.source_url NOT LIKE 'https://le.utah.gov/%.pdf');`);
  L.push(`  IF n_nosrc > 0 THEN`);
  L.push(`    RAISE EXCEPTION '% committee votes without a minutes PDF citation', n_nosrc;`);
  L.push(`  END IF;`);
  L.push(`END $$;`);
  L.push("");
  return L.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
function main() {
  if (has("--survey")) {
    const out = survey(SESSION);
    console.log(AS_JSON ? JSON.stringify(out, null, 2) :
      `${SESSION}: ${out.standing} standing committees of ${out.committees}, ${out.meetings} meetings, ` +
      `${out.minutes} minutes records, ${out.pdfs} PDFs, ${out.noPdf} meetings publishing no PDF`);
    return;
  }
  if (has("--collect")) {
    const { rep, forms } = collect(SESSION, { reviewedMapRequired: false });
    const draft = writeDraftMap(SESSION, forms);
    if (AS_JSON) console.log(JSON.stringify(rep, null, 2));
    else {
      console.log(`${SESSION}  meetings ${rep.meetings.cached} (approved ${rep.meetings.approved}, other ${rep.meetings.notApproved})`);
      console.log(`  PDFs published ${rep.pdfs.published} · fetched ${rep.pdfs.fetched} · readable ${rep.pdfs.readable} · unreadable ${rep.pdfs.unreadable}`);
      console.log(`  motions ${rep.motions.total} · with a recorded roll ${rep.motions.withRecordedRoll} · admitted ${rep.motions.admitted}`);
      console.log(`  refused: ${Object.entries(rep.motions.refused).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ")}`);
      console.log(`  names resolved ${rep.names.resolved} · unmapped ${rep.names.unmapped} · refused ${rep.names.refused}`);
      if (rep.acts.pdfConfirmedOnShortName) {
        console.log(`  ${rep.acts.pdfConfirmedOnShortName} act(s) confirmed on the committee's short name — the metadata name and the letterhead disagree: ${rep.acts.renamedCommittees.join("; ")}`);
      }
      console.log(`  acts ${rep.acts.built} on ${rep.bills.inLane} bills · reprints ${rep.acts.reprints} · rows ${rep.rows.kept} (superseded by a floor vote ${rep.rows.supersededByFloor}, fresh ${rep.rows.freshOfFloor})`);
      console.log(`  off-lane: ${rep.bills.offLane} rows across ${rep.bills.offLaneList.length} bills with no reviewed issue keys — ${rep.bills.offLaneContestedList.length} of those bills had a CONTESTED committee vote (candidates for a curator pass; nothing written)`);
      console.log(`  draft map: ${draft}`);
    }
    return;
  }
  if (has("--bucket")) {
    // The curator worklist for the off-lane bucket: every bill that had a CONTESTED
    // pass-out-favorably vote in a standing committee and is not in the formal lane
    // because nobody has reviewed an issue mapping for it. Read-only, and it writes
    // nothing anywhere — the decision this feeds is a human's.
    const { rep } = collect(SESSION, { reviewedMapRequired: false });
    const bills = rep.bills.offLaneContestedList.slice().sort();
    const out = {
      session: SESSION,
      offLaneBills: rep.bills.offLaneList.length,
      contestedBills: bills.length,
      bills: bills.map((b) => ({ bill: b, acts: rep.bills.offLaneDetail[b] || [] })),
    };
    if (AS_JSON) console.log(JSON.stringify(out, null, 2));
    else {
      console.log(`${SESSION}: ${out.contestedBills} bills with a contested committee vote and no reviewed issue mapping (of ${out.offLaneBills} off-lane bills)`);
      for (const b of out.bills) console.log(`  ${b.bill}  ${b.acts.length} act(s)  ${b.acts.map((a) => `${a.date} ${a.yea}-${a.nay}`).join(" · ")}`);
    }
    return;
  }
  if (has("--seed")) {
    const { seed } = buildSeed(SESSION);
    fs.mkdirSync(OUTDIR, { recursive: true });
    const f = path.join(OUTDIR, path.basename(comSeedFile(SESSION)));
    fs.writeFileSync(f, JSON.stringify(seed, null, 2) + "\n");
    console.log(`${f}  ${seed.counts.measures} bills · ${seed.counts.committeeActs} committee actions · ${seed.counts.positions} positions`);
    return;
  }
  if (has("--sql")) {
    fs.mkdirSync(OUTDIR, { recursive: true });
    const f = path.join(OUTDIR, `vr_utah_${SESSION.toLowerCase()}_committee_votes.sql`);
    fs.writeFileSync(f, buildSql(SESSION));
    console.log(f);
    return;
  }
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8")
    .split("\n").filter((l) => l.startsWith("//")).slice(0, 100).join("\n"));
}
if (import.meta.url === `file://${process.argv[1]}`) main();
