#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// UTAH FLOOR NAME ADMIT — the printed names the roster grew into
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS FIXES, AND WHY IT IS NOT A NEW SCRAPER. Waves 1–2 ingested three
// Utah general sessions of floor roll calls. Every printed name on a vote page
// was resolved against a HUMAN-REVIEWED map or dropped, and the two later
// sessions dropped a residue: 18 printed names in 2024GS and 20 in 2023GS were
// left in `unmapped` because, at the time, the people behind them were on no
// PolitiDex roster at all. The maps said so in writing and called it a roster
// decision for a later wave.
//
// The roster then grew — wave 2's own identity-only records, and the committee
// waves' roster door — and nothing went back to the floor maps. So the position
// is this: the votes are parsed, the people are on the roster, the identity has
// already been reviewed and accepted for the SAME session in the SAME chamber
// from the SAME printed surname and initial in the committee map, and the floor
// ledger still drops them. That is the leftover this file admits. No page is
// re-parsed for a new fact; one fence that had gone stale is re-run.
//
//   node scripts/vr-utah-name-admit.mjs --report        # read-only, prints the gates
//   node scripts/vr-utah-name-admit.mjs --write         # rewrites the two maps
//
// ── THE THREE GATES, ALL OF WHICH MUST PASS ─────────────────────────────────
//  1. THE SHIPPED UNIQUENESS RULE. scripts/vr-utah-ingest.mjs --collect must
//     resolve the printed form on its own, through proposeMember(): surname match
//     plus a compatible first name or initial, and EXACTLY ONE candidate in the
//     whole Utah roster pool. No rule is widened here and no rule is written here
//     — the draft is read, not re-derived.
//  2. THE SAME SESSION'S REVIEWED COMMITTEE MAP. db/vr-utah-committee-map-<S>.json
//     must already carry the same person under the same surname and the same
//     initial, in the same chamber, with its own `confirmedBy` line. That file is
//     human-accepted; this gate reuses a decision already made rather than making
//     a new one. A name the committee map REFUSED stays refused here — Johnson,
//     Judkins, Lyman and Kennedy are refused in both files for reasons those files
//     state, and this pass does not overturn them.
//  3. THE LEGISLATURE'S OWN ROSTER FOR THAT YEAR. le.utah.gov/asp/roster/roster.asp
//     ?year=YYYY prints full name, chamber, party and district for everyone who
//     actually served. The admitted full name must appear there, in the chamber the
//     roll call was held in, and its chamber/party/district must agree with the
//     committee map's `confirmedBy` string character for character. This is the gate
//     that rules out the successor error, and it is the same check
//     db/vr-utah-member-map-2024GS.json's own `_howReviewed` describes.
//
// ── AND IT MERGES FORWARD, NEVER OVERWRITES ─────────────────────────────────
// The draft map is NOT copied over the shipped map. Re-running --collect today
// LOSES reviewed decisions: "Brammer, B.", "Musselman, C.R.", "Stratton, K." and
// "Walter, N." are mapped in the shipped files and the uniqueness rule can no
// longer reproduce them, because the roster has since gained a name that makes the
// surname ambiguous. A reviewed decision is not deleted by a rule regression. So
// every shipped entry survives untouched and the only edit is additive: an admitted
// printed form moves out of `unmapped` and into `chambers`.
//
// NO FUZZY MATCHING, AND NO GUESSING ANYBODY ONTO THE ROSTER. Nothing here adds a
// roster record, and nothing here resolves a name the shipped rule leaves
// ambiguous. Gate 1 is fail-closed by construction; gates 2 and 3 can only ever
// remove candidates.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const P = (...a) => path.join(ROOT, ...a);
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const CACHE = val("--cache", "/tmp/vr-utah-cache");
const WRITE = has("--write");

const SESSIONS = [["2024GS", 2024], ["2023GS", 2023]];
const floorMapFile = (s) => P("db", s === "2025GS" ? "vr-utah-member-map.json" : `vr-utah-member-map-${s}.json`);
const cmteMapFile = (s) => P("db", s === "2025GS" ? "vr-utah-committee-map.json" : `vr-utah-committee-map-${s}.json`);
const draftFile = (s) => path.join(CACHE, `vr-utah-member-map.${s}.draft.json`);
const J = (f) => JSON.parse(fs.readFileSync(f, "utf8"));

// ── gate 3's source ─────────────────────────────────────────────────────────
// Same WAF discipline as the ingests: curl with a browser UA, and a rejection page
// is a hard error rather than an empty roster that would silently pass nobody.
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
function yearRoster(year) {
  const f = path.join(CACHE, `roster-${year}.html`);
  let html;
  if (fs.existsSync(f) && fs.statSync(f).size > 0) html = fs.readFileSync(f, "utf8");
  else {
    html = execFileSync("curl", ["-sS", "--max-time", "60", "-A", UA, "-H", "Accept: */*",
      "-H", "Accept-Language: en-US,en;q=0.9",
      `https://le.utah.gov/asp/roster/roster.asp?year=${year}`], { encoding: "utf8" });
    if (/Request Rejected|The requested URL was rejected/i.test(html.slice(0, 400))) {
      throw new Error(`source refused the request: roster ${year}`);
    }
    fs.mkdirSync(CACHE, { recursive: true });
    fs.writeFileSync(f, html);
  }
  // <tr><td>Garner, Brett</td><td>Representative</td><td>Democrat</td><td>31</td></tr>
  const out = new Map();
  const re = /<tr>\s*<td>([^<]+)<\/td>\s*<td>(Representative|Senator)<\/td>\s*<td>([^<]*)<\/td>\s*<td>([^<]*)<\/td>/gi;
  let m;
  while ((m = re.exec(html))) {
    const name = m[1].replace(/&amp;/g, "&").trim();
    out.set(name, { name, office: m[2].trim(), party: m[3].trim(), district: m[4].trim() });
  }
  if (out.size < 90) throw new Error(`roster ${year} parsed only ${out.size} rows — refusing to gate on that`);
  return out;
}

const surInit = (printed) => {
  const i = printed.indexOf(",");
  const surname = (i > 0 ? printed.slice(0, i) : printed).trim();
  const rest = (i > 0 ? printed.slice(i + 1) : "").trim();
  return { surname, initial: (rest.replace(/[^A-Za-z]/g, "")[0] || "").toUpperCase() };
};
const CH_WORD = { H: "Representative", S: "Senator" };

function decide(session, year) {
  const floor = J(floorMapFile(session));
  const draft = J(draftFile(session));
  const cmte = J(cmteMapFile(session));
  const roster = yearRoster(year);
  const rows = [];
  for (const ch of ["H", "S"]) {
    for (const u of (floor.unmapped || {})[ch] || []) {
      const r = { session, chamber: ch, printed: u.printed, gates: {}, admit: false, pid: null, why: "" };
      // gate 1
      const draftPid = (draft.chambers[ch] || {})[u.printed] || null;
      r.gates.uniqueness = draftPid ? `ok → ${draftPid}` : "no — the shipped rule leaves it unresolved";
      // gate 2
      const { surname, initial } = surInit(u.printed);
      const hit = Object.entries((cmte.printedForms || {})[ch] || {}).filter(([k]) => {
        const m = /^(?:Rep|Sen)\.\s+([A-Z])\.?\s+(.+)$/.exec(k);
        return m && m[2].trim() === surname && m[1] === initial;
      });
      const refused = ((cmte._refusedNames || {})[ch] || []).some((x) => x.includes(surname));
      const cPid = hit.length === 1 ? (hit[0][1].politicianId || null) : null;
      r.gates.committeeMap = refused ? "no — REFUSED in the reviewed committee map"
        : hit.length !== 1 ? `no — ${hit.length} accepted committee form(s) match`
        : `ok → ${cPid} (${hit[0][0]})`;
      r.confirmedBy = hit.length === 1 ? (hit[0][1].confirmedBy || "") : "";
      // gate 3
      const full = r.confirmedBy.split("·")[0].trim();
      const rr = full ? roster.get(full) : null;
      const want = r.confirmedBy.split("·").map((x) => x.trim());
      r.gates.yearRoster = !rr ? `no — "${full || "(no confirmedBy)"}" is not in the ${year} roster`
        : rr.office !== CH_WORD[ch] ? `no — the ${year} roster seats ${full} as ${rr.office}, not ${CH_WORD[ch]}`
        : (want[1] !== rr.office || want[2] !== rr.party || want[3] !== rr.district)
          ? `no — confirmedBy says ${want.slice(1).join(" · ")}, the ${year} roster says ${rr.office} · ${rr.party} · ${rr.district}`
          : `ok — ${year} roster: ${rr.name} · ${rr.office} · ${rr.party} · ${rr.district}`;
      const pass = Object.values(r.gates).every((g) => g.startsWith("ok"));
      if (pass && draftPid && cPid && draftPid === cPid) { r.admit = true; r.pid = draftPid; }
      else if (pass) r.gates.agreement = "no — the two reviewed paths name different people";
      rows.push(r);
    }
  }
  return { floor, rows };
}

const ADMITTED_NOTE = (session, year, n) =>
  `WAVE 9 NAME ADMIT (${n} printed form(s)). These forms sat in \`unmapped\` because, when ` +
  `this map was written, the people behind them were on no PolitiDex roster. They are on it now, ` +
  `and their identity had already been reviewed and accepted for THIS session and THIS chamber, ` +
  `from the same printed surname and initial, in db/${path.basename(cmteMapFile(session))}. Each one ` +
  `passed three gates before moving here: scripts/vr-utah-ingest.mjs --collect resolved it on its ` +
  `own through the unchanged uniqueness rule; the reviewed committee map already carried the same ` +
  `person under the same surname and initial; and the legislature's own roster for ${year} ` +
  `(https://le.utah.gov/asp/roster/roster.asp?year=${year}) seats that full name in that chamber ` +
  `with the party and district the committee map's confirmedBy line claims. \`confirmedByDistrict\` ` +
  `is false for every one of them and says so honestly: the vote page prints no district for a ` +
  `member who had left by the time it was served, so the district could not confirm and the ` +
  `session roster did the confirming instead. No roster record was created, no name was resolved ` +
  `that the shipped rule leaves ambiguous, and nothing already in this file was changed — the ` +
  `edit is additive. Rebuilt and re-checked by scripts/vr-utah-name-admit.mjs --report.`;

const REMAINDER_NOTE = (session, year, floor, park) => {
  const left = ["H", "S"].flatMap((ch) => (floor.unmapped[ch] || []).map((u) => `"${u.printed}"`));
  const briscoe = park.some((r) => r.printed.startsWith("Briscoe"));
  return `${left.length} printed form(s) are still unattributed: ${left.join(", ")}. Their votes are ` +
    `counted and disclosed by the migration and by scripts/test-vr-utah-record.mjs, and attributed to ` +
    `nobody. This is no longer a roster gap waiting on a snapshot — wave 9 went back to it with a ` +
    `source (the legislature's own ${year} roster) and admitted everyone it could. What is left is ` +
    `refused on the merits, not for want of a wave: Johnson, Judkins, Lyman and Kennedy are each ` +
    `refused by name in \`_refusalNames\`/\`_refusalNotes\` here and in db/${path.basename(cmteMapFile(session))}, ` +
    `because the only roster record carrying the printed name holds a NON-legislative office and the ` +
    `vote page prints no district to confirm against.` +
    (briscoe ? ` "Briscoe, J." is a different failure and worth naming plainly: the uniqueness rule ` +
      `does resolve it, but this session's reviewed committee map carries no accepted form for the ` +
      `surname, so the second gate has nothing to agree with and the admit fails closed. One reviewed ` +
      `path is not two.` : ``) +
    ` Nothing here may be closed by inference from a vote page.`;
};

let totalAdmit = 0, totalPark = 0;
for (const [session, year] of SESSIONS) {
  const { floor, rows } = decide(session, year);
  const admit = rows.filter((r) => r.admit);
  const park = rows.filter((r) => !r.admit);
  totalAdmit += admit.length; totalPark += park.length;
  console.log(`\n${session} — ${admit.length} admitted, ${park.length} still parked`);
  for (const r of admit) {
    console.log(`  ADMIT  ${r.chamber} ${r.printed.padEnd(18)} → ${r.pid}`);
    for (const [g, v] of Object.entries(r.gates)) console.log(`           ${g.padEnd(14)} ${v}`);
  }
  for (const r of park) {
    const no = Object.entries(r.gates).filter(([, v]) => !v.startsWith("ok"));
    console.log(`  park   ${r.chamber} ${r.printed.padEnd(18)} ${no.map(([g, v]) => `${g}: ${v}`).join(" | ")}`);
  }
  if (!WRITE) continue;
  const admitted = new Set(admit.map((r) => `${r.chamber}|${r.printed}`));
  for (const r of admit) {
    if (floor.chambers[r.chamber][r.printed]) throw new Error(`${session} ${r.printed} is already mapped — refusing to overwrite`);
    floor.chambers[r.chamber][r.printed] = r.pid;
    floor.confirmedByDistrict[r.chamber][r.printed] = false;
  }
  for (const ch of ["H", "S"]) {
    floor.chambers[ch] = Object.fromEntries(Object.entries(floor.chambers[ch]).sort(([a], [b]) => a.localeCompare(b)));
    floor.confirmedByDistrict[ch] = Object.fromEntries(Object.entries(floor.confirmedByDistrict[ch]).sort(([a], [b]) => a.localeCompare(b)));
    floor.unmapped[ch] = (floor.unmapped[ch] || []).filter((u) => !admitted.has(`${ch}|${u.printed}`));
  }
  floor._wave9NameAdmit = ADMITTED_NOTE(session, year, admit.length);
  // Machine-readable alongside the prose, so the migration generator can emit exactly the
  // rows this wave is responsible for instead of re-deriving them from a diff of SQL.
  floor._wave9Admitted = Object.fromEntries(["H", "S"].flatMap((ch) =>
    admit.filter((r) => r.chamber === ch).map((r) => [`${ch} ${r.printed}`, r.pid])));
  // The note that USED to say adding these people was "a roster decision for a later
  // wave" is now stale for the ones this wave admitted, so it is re-stated for the
  // residue rather than left claiming a gap that has closed.
  floor._unmappedIsCoverage = REMAINDER_NOTE(session, year, floor, park);
  // Prose notes lead the file, then provenance, then data — the order every other
  // Utah map ships in. An appended key would sort the new note after `unmapped`.
  const LEAD = ["_comment", "_howReviewed", "_collisionsThatUsedToBeRefused", "_crossChamberNotes",
    "_refusedNames", "_refusalNotes", "_federalMoveNotes", "_unmappedIsCoverage", "_wave9NameAdmit",
    "_wave9Admitted"];
  const ordered = {};
  for (const k of LEAD) if (k in floor) ordered[k] = floor[k];
  for (const k of Object.keys(floor)) if (!(k in ordered)) ordered[k] = floor[k];
  fs.writeFileSync(floorMapFile(session), JSON.stringify(ordered, null, 2) + "\n");
  console.log(`  written → db/${path.basename(floorMapFile(session))}`);
}
console.log(`\ntotal: ${totalAdmit} admitted · ${totalPark} still parked${WRITE ? "" : "   (read-only — pass --write)"}`);
