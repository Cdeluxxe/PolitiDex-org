#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// vr-blank-pair-census.mjs — which federal measure-and-issue pairs print nothing
// under their row, ranked by how many members carry the row
// ─────────────────────────────────────────────────────────────────────────────
// A row in an issue drawer prints one short effect line when consistency.js
// holds one for the pair: a _DOS_EFFECT line, or a stored `did` in _DOS_MECH that
// already meets the row rule (one sentence, 140 characters or fewer, ending on a
// stop, no method word). A pair named in _DOS_POINTER prints a pointer to a
// sibling's line instead. Every other mapped pair prints nothing.
//
// This census reads every federal vr_measure_issues pair from the live record,
// counts the distinct members with a row on the measure (a recorded vote on any
// of its roll calls, or a stored position), applies the same row rule the
// renderer applies, and lists the pairs that print nothing, highest volume
// first, with the stored text a line could be written from: the measure's
// title, summary and status, the pair's rationale, the act's roll calls, and the
// lines its sibling pairs already print.
//
// Read-only. Nothing here writes a line, a mapping or a key.
//
//   node scripts/vr-blank-pair-census.mjs              # ranked table
//   node scripts/vr-blank-pair-census.mjs --top 60
//   node scripts/vr-blank-pair-census.mjs --json       # full records
//
// Requires NETLIFY_DB_URL.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import pg from "pg";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = readFileSync(join(ROOT, "consistency.js"), "utf8");
const args = process.argv.slice(2);
const TOP = args.includes("--top") ? Number(args[args.indexOf("--top") + 1]) : 40;
const JSON_OUT = args.includes("--json");

function table(name) {
  const at = SRC.indexOf(`var ${name} = {`);
  if (at < 0) throw new Error(`${name} not found in consistency.js`);
  const end = SRC.indexOf("\n  };", at);
  return vm.runInNewContext("(" + SRC.slice(at + `var ${name} = `.length, end + 4) + ")");
}
const EFFECT = table("_DOS_EFFECT"), MECH = table("_DOS_MECH"), POINTER = table("_DOS_POINTER");
const METHOD = (() => {
  const m = SRC.match(/var _DOS_EFFECT_METHOD = (\/.+\/[a-z]*);/);
  return vm.runInNewContext(m[1]);
})();
// The renderer's row rule (_dosEffectOk), verbatim in effect.
function rowOk(raw) {
  const s = String(raw == null ? "" : raw).replace(/\s+/g, " ").trim();
  if (!s || s.length > 140 || !/[.!?]$/.test(s)) return "";
  if (/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US"))) return "";
  if (METHOD.test(s)) return "";
  return s;
}
const printed = (k) => rowOk(EFFECT[k] || (MECH[k] && MECH[k].did) || "");

if (!process.env.NETLIFY_DB_URL) { console.error("NETLIFY_DB_URL is not set"); process.exit(2); }
const client = new pg.Client({ connectionString: process.env.NETLIFY_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
const { rows } = await client.query(`
  WITH members AS (
    SELECT rc.measure_id, mv.politician_id FROM vr_rollcalls rc JOIN vr_member_votes mv ON mv.rollcall_id = rc.id
    UNION
    SELECT p.measure_id, p.politician_id FROM vr_positions p
  )
  SELECT m.id, m.number, m.congress, m.measure_type, m.title, m.summary, m.status,
         mi.issue_key, mi.weight, mi.is_primary, mi.rationale,
         (SELECT count(DISTINCT politician_id) FROM members x WHERE x.measure_id = m.id)::int AS members,
         (SELECT json_agg(json_build_object('chamber', rc.chamber, 'session', rc.session, 'roll', rc.roll_number,
                 'question', rc.question, 'result', rc.result, 'yea', (rc.totals->>'yea')::int, 'nay', (rc.totals->>'nay')::int)
                 ORDER BY rc.vote_date)
            FROM vr_rollcalls rc WHERE rc.measure_id = m.id) AS rolls,
         (SELECT array_agg(mi2.issue_key ORDER BY mi2.weight DESC, mi2.issue_key) FROM vr_measure_issues mi2 WHERE mi2.measure_id = m.id) AS issues
    FROM vr_measure_issues mi JOIN vr_measures m ON m.id = mi.measure_id
   WHERE m.congress IS NOT NULL AND m.number IS NOT NULL`);
await client.end();

const out = [];
for (const r of rows) {
  const act = `${String(r.number).trim()}|${r.congress}`;
  const key = `${act}|${r.issue_key}`;
  if (printed(key) || POINTER[key] || !r.members) continue;
  const siblings = {};
  for (const ik of r.issues || []) if (ik !== r.issue_key && printed(`${act}|${ik}`)) siblings[ik] = printed(`${act}|${ik}`);
  out.push({
    key, act, issue: r.issue_key, members: r.members, measureType: r.measure_type, status: r.status,
    title: r.title, summary: r.summary || "", weight: r.weight, isPrimary: r.is_primary, rationale: r.rationale || "",
    did: (MECH[key] && MECH[key].did) || null, rolls: r.rolls || [], siblings,
  });
}
out.sort((a, b) => b.members - a.members || a.key.localeCompare(b.key));
if (JSON_OUT) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
console.log(`${out.length} federal pairs print nothing under the row; the top ${Math.min(TOP, out.length)}:\n`);
for (const p of out.slice(0, TOP)) {
  console.log(`${String(p.members).padStart(4)}  ${p.key}  [${p.status}]  ${Object.keys(p.siblings).length} sibling line(s)${p.did ? "  · stores a did the row rule refuses" : ""}`);
}
