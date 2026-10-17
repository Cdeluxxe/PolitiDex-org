// ─────────────────────────────────────────────────────────────────────────────
// bill-record-core.mjs — status, origin, sponsors and history for one bill, read
// from db/bill-record.json (the official record) and nothing else
// ─────────────────────────────────────────────────────────────────────────────
// gen-bill-docs.mjs calls this to write each bill document's sponsor block and
// short history, and the person-file index (person-bills.json) from the SAME
// sponsor resolution, so the two directions cannot disagree. The tests import
// it too, and re-derive every status from the record rather than trusting the
// generated file.
//
// THE RULES IT KEEPS
//
//   · STATUS IS READ OFF THE ACTIONS. "enacted" needs a law or signature action
//     on the record (or a veto overridden in both chambers). Nothing else is
//     ever labelled enacted, and a failed measure's label carries no word a
//     reader could take for law: see FAILED_WORDS, which a test holds every
//     failed label and every failed person-file row to.
//   · A SITTING THAT HAS ENDED IS OVER. The 117th and 118th Congresses and
//     every Utah general session on file have adjourned, so a measure there
//     that never cleared is failed — and its history says so in one dated row,
//     the date the sitting ended. The 119th is still sitting: a measure in
//     it that has not cleared is pending or passed one chamber, never failed
//     for lack of time.
//   · ONLY PEOPLE ALREADY IN THE ROSTER WITH A RECORDED VOTE. A sponsor is
//     linked only through a roster table the voting record already attributes
//     votes through — db/vr-member-map.json (bioguide → roster id) for Congress,
//     the session's db/vr-utah-member-map*.json (the names le.utah.gov prints in
//     roll-call cells) for Utah, and the person must be in the published roster
//     (db/share-index.json people). Anyone else is counted, never named: the
//     page says how many more the official record lists.
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";

const read = (root, f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));

// The day each sitting on file ended. A Congress ends at noon on January 3 of
// the odd year after it; a Utah general session ends at midnight on its 45th day.
export const SITTING_ENDED = {
  "117": "2023-01-03",
  "118": "2025-01-03",
  "2023GS": "2023-03-03",
  "2024GS": "2024-03-01",
  "2025GS": "2025-03-07",
  "2026GS": "2026-03-06",
};

// Words a failed measure's status may never carry.
export const FAILED_WORDS = /\b(enact\w*|became law|become law|signed|public law|adopted|confirmed|passed both|law)\b/i;

export const GROUPS = {
  enacted: ["enacted"],
  passed: ["passed_both", "passed_house", "passed_senate", "adopted", "confirmed"],
  failed: ["failed", "vetoed"],
  pending: ["pending"],
};
export const groupOf = (st) => Object.keys(GROUPS).find((g) => GROUPS[g].includes(st)) || "pending";

const isUtah = (s) => /GS$/i.test(String(s || ""));
const chamberWord = (c) => (c === "house" ? "House" : c === "senate" ? "Senate" : "");

function kindOf(number) {
  const pre = String(number || "").split(" ")[0];
  if (/Amdt\.$/.test(pre)) return "amendment";
  if (pre === "H.Res." || pre === "S.Res.") return "simple_res";
  if (pre === "H.Con.Res." || pre === "S.Con.Res.") return "concurrent_res";
  if (/^(H\.R\.|S\.|H\.J\.Res\.|S\.J\.Res\.|H\.B\.|S\.B\.)$/.test(pre)) return "bill";
  return "nomination";
}

// ── Status ──────────────────────────────────────────────────────────────────
// Returns { st, why } — st is the status key, why the plain clause after the
// dash in the label ("died in committee"). Both come from the actions alone.
export function deriveStatus(sitting, number, rec) {
  const a = (rec && rec.a) || [];
  const has = (s, c) => a.some((x) => x.s === s && (c == null || x.c === c));
  const ended = !!SITTING_ENDED[sitting];
  const utah = isUtah(sitting);
  const kind = kindOf(number);
  const origin = rec && rec.ch;

  if (kind === "nomination") {
    if (has("confirmed")) return { st: "confirmed", why: "" };
    if (has("rejected")) return { st: "failed", why: "rejected by the Senate" };
    if (has("withdrawn")) return { st: "failed", why: "withdrawn" };
    if (has("returned")) return { st: "failed", why: "returned to the President" };
    return ended ? { st: "failed", why: "not confirmed" } : { st: "pending", why: "" };
  }

  if (kind === "amendment") {
    if (has("adopted")) return { st: "adopted", why: "" };
    if (has("failed_vote")) return { st: "failed", why: "not agreed to" };
    if (has("withdrawn")) return { st: "failed", why: "withdrawn" };
    return ended ? { st: "failed", why: "not agreed to before the Congress ended" } : { st: "pending", why: "" };
  }

  const overridden = has("override_passed", "house") && has("override_passed", "senate");
  if (has("law") || overridden || (kind === "bill" && has("signed") && !has("vetoed"))) return { st: "enacted", why: "" };
  if (has("vetoed")) return { st: "vetoed", why: utah ? "vetoed by the Governor" : "vetoed by the President" };

  const passedH = has("passed", "house");
  const passedS = has("passed", "senate");
  const both = (passedH && passedS) || has("resolved");
  const committeeOut = has("committee_failed");

  if (kind === "simple_res") {
    if (has("passed", origin) || passedH || passedS) return { st: "adopted", why: "" };
    if (has("failed_vote")) return { st: "failed", why: "failed on the floor" };
    if (has("blocked")) return { st: "failed", why: "stopped on the floor" };
    return ended ? { st: "failed", why: "died in committee" } : { st: "pending", why: "" };
  }

  if (both) {
    if (kind === "concurrent_res") return { st: "adopted", why: "" };
    return ended ? { st: "failed", why: "the House and Senate never agreed on one text" } : { st: "passed_both", why: "" };
  }
  if (passedH || passedS) {
    const done = passedH ? "house" : "senate";
    const other = done === "house" ? "senate" : "house";
    if (has("failed_vote", other)) return { st: "failed", why: `passed the ${chamberWord(done)}, failed in the ${chamberWord(other)}` };
    if (ended) return { st: "failed", why: `passed the ${chamberWord(done)}, never passed the ${chamberWord(other)}` };
    return { st: done === "house" ? "passed_house" : "passed_senate", why: "" };
  }
  if (has("failed_vote")) return { st: "failed", why: "failed on the floor" };
  if (has("blocked")) return { st: "failed", why: "stopped on the Senate floor" };
  if (ended) {
    if (committeeOut) return { st: "failed", why: "died in committee" };
    // Utah's own last action for a bill no committee voted down: "filed".
    if (utah && has("filed")) return { st: "failed", why: has("reported") ? "filed without a floor vote" : "filed without passage" };
    if (!has("reported") && !has("discharged")) return { st: "failed", why: "died in committee" };
    return { st: "failed", why: "never came to a final floor vote" };
  }
  return { st: "pending", why: "" };
}

export function statusLabel(st, why, sitting) {
  const utah = isUtah(sitting);
  switch (st) {
    case "enacted": return utah ? "Enacted — signed into law" : "Enacted — became law";
    case "vetoed": return `Failed — ${why || "vetoed"}`;
    case "failed": return `Failed — ${why || "did not pass"}`;
    case "passed_both": return "Passed both chambers — not yet law";
    case "passed_house": return "Passed the House — not law";
    case "passed_senate": return "Passed the Senate — not law";
    case "adopted": return "Adopted";
    case "confirmed": return "Confirmed by the Senate";
    default: return "Pending — no final action yet";
  }
}

// ── History ─────────────────────────────────────────────────────────────────
// One printed label per stage. `x` (the record's own text) sits beside it.
export function stageLabel(s, c, sitting, origin) {
  const utah = isUtah(sitting);
  const ch = chamberWord(c);
  switch (s) {
    case "introduced": return ch ? (origin && c !== origin ? `Received in the ${ch}` : `Introduced in the ${ch}`) : "Introduced";
    case "received": return "Received in the Senate";
    case "offered": return ch ? `Offered on the ${ch} floor` : "Offered";
    case "reported": return utah ? `Recommended by ${ch} committee` : `Reported from ${ch} committee`;
    case "discharged": return `Discharged from ${ch} committee`;
    case "committee_failed": return `Not passed out of ${ch} committee`;
    case "committee_returned": return `Returned by ${ch} committee without a recommendation`;
    case "passed": return `Passed the ${ch}`;
    case "failed_vote": return ch ? `Failed on the ${ch} floor` : "Failed on the floor";
    case "blocked": return `${ch || "Senate"} procedural vote against the measure`;
    case "resolved": return "Both chambers agreed to one text";
    case "presented": return utah ? "Sent to the Governor" : "Presented to the President";
    case "signed": return utah ? "Signed by the Governor" : "Signed by the President";
    case "law": return "Became law";
    case "vetoed": return utah ? "Vetoed by the Governor" : "Vetoed by the President";
    case "override_passed": return `Veto override passed the ${ch}`;
    case "override_failed": return `Veto override failed in the ${ch}`;
    case "enacting_clause_struck": return `Enacting clause struck (${ch})`;
    case "filed": return "Filed without passage";
    case "adopted": return "Amendment agreed to";
    case "confirmed": return "Confirmed";
    case "rejected": return "Rejected";
    case "withdrawn": return "Withdrawn";
    case "returned": return "Returned to the President";
    case "died": return "Died when the sitting ended";
    default: return "";
  }
}

const sittingName = (s) => (/^\d+$/.test(s) ? `${s}th Congress` : `${String(s).slice(0, 4)} General Session`);

export function historyRows(sitting, number, rec, status) {
  const rows = ((rec && rec.a) || []).map((x) => ({ d: x.d, s: x.s, a: stageLabel(x.s, x.c, sitting, rec.ch), x: x.x }))
    .filter((r) => r.a);
  // An ended sitting with no final action on the record: one dated row saying
  // the sitting closed. Utah records already carry their own "filed" action.
  const final = new Set(["law", "signed", "vetoed", "filed", "confirmed", "rejected", "withdrawn", "returned"]);
  const ended = SITTING_ENDED[sitting];
  if (ended && status.st === "failed" && !rows.some((r) => final.has(r.s)) && !(kindOf(number) === "amendment" && rows.some((r) => r.s === "failed_vote"))) {
    if (!(kindOf(number) === "simple_res" && rows.some((r) => r.s === "failed_vote"))) {
      rows.push({ d: ended, s: "died", a: stageLabel("died"), x: `The ${sittingName(sitting)} ended with no further action on this measure.` });
    }
  }
  return rows;
}

// ── Sponsors → roster ids ───────────────────────────────────────────────────
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

export function rosterTables(root) {
  const share = read(root, "db/share-index.json");
  const people = share.people || {};
  const aliases = share.personAliases || {};
  const canon = (pid) => (people[pid] ? pid : aliases[pid] && people[aliases[pid]] ? aliases[pid] : "");
  const federal = read(root, "db/vr-member-map.json").map || {};
  const utahFiles = { "2025GS": "db/vr-utah-member-map.json", "2024GS": "db/vr-utah-member-map-2024GS.json", "2023GS": "db/vr-utah-member-map-2023GS.json" };
  const utah = {};
  for (const [s, f] of Object.entries(utahFiles)) {
    const ch = {};
    for (const [h, m] of Object.entries(read(root, f).chambers || {})) ch[h] = m;
    utah[s] = ch;
  }
  return { people, canon, federal, utah };
}

// "Rep. Dominguez, Rosalba" → { last: "dominguez", first: "rosalba" }
function utahName(n) {
  const m = /^(?:Rep\.|Sen\.)\s*([^,]+),\s*(.+)$/.exec(String(n || "").trim());
  return m ? { last: norm(m[1]), first: norm(m[2].split(/\s+/)[0]) } : null;
}

// One roster id for one Utah sponsor, or "". The session's roll-call name table
// (whose keys are "Surname, I." in one chamber) must hold exactly one entry with
// that surname and first initial, and the roster's own display name must carry
// the same surname. 2026GS has no roll-call table of its own; it is matched
// against 2025GS's, the sitting legislature's, under the same two checks.
function utahPid(T, sitting, p) {
  const nm = utahName(p.n);
  if (!nm || !nm.first) return "";
  const table = (T.utah[sitting] || (sitting === "2026GS" ? T.utah["2025GS"] : null) || {})[p.h] || {};
  const hits = Object.entries(table).filter(([k]) => {
    const [last, ini] = k.split(",").map((x) => x.trim());
    if (norm(last) !== nm.last) return false;
    const i = norm(ini);
    return !i || i[0] === nm.first[0] || nm.first.startsWith(i);
  });
  if (hits.length !== 1) return "";
  const pid = T.canon(hits[0][1]);
  if (!pid) return "";
  const roster = norm(String((T.people[pid] || {}).n || "").split(/\s+/).slice(-1)[0]);
  const rosterFull = norm((T.people[pid] || {}).n || "");
  if (roster !== nm.last && !rosterFull.endsWith(nm.last)) return "";
  return pid;
}

export function resolveSponsors(T, sitting, rec) {
  const linked = [];
  const unlinked = { sponsor: 0, floor_sponsor: 0, cosponsor: 0 };
  const seen = new Set();
  for (const p of (rec && rec.sp) || []) {
    let pid = "";
    if (isUtah(sitting)) pid = utahPid(T, sitting, p);
    else if (p.id && T.federal[p.id]) pid = T.canon(T.federal[p.id]);
    if (pid && !seen.has(pid)) { seen.add(pid); linked.push({ r: p.r, p: pid, n: T.people[pid].n }); }
    else if (!pid) unlinked[p.r] = (unlinked[p.r] || 0) + 1;
  }
  return { linked, unlinked };
}
