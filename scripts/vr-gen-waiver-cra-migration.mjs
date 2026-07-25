// ─────────────────────────────────────────────────────────────────────────────
// vr-gen-waiver-cra-migration.mjs — real roll calls for the California waiver CRAs
// ─────────────────────────────────────────────────────────────────────────────
// H.J.Res. 88 (Advanced Clean Cars II) and H.J.Res. 89 (Advanced Clean Trucks) were
// already in the corpus and already mapped to `states_federal_power` — the EPA rules
// they disapproved are literally titled "Waiver of Preemption" — but they carried NO
// roll calls, so they contributed nothing to any member's vote depth. This script
// attaches their FOUR real passage votes (House 112/114, Senate 277/281) so the
// existing curated mapping finally does work.
//
//   node scripts/vr-gen-waiver-cra-migration.mjs --json   # inspect resolved data
//   node scripts/vr-gen-waiver-cra-migration.mjs > \
//     netlify/database/migrations/<ts>_seed_waiver_cra_rollcalls.sql
//
// Provenance: every position comes from the official clerk.house.gov / senate.gov
// roll-call XML fetched at run time — no vote is invented, and the printed SQL cites
// the document each roll call came from.
//
// Member identity: the XML carries no roster slug. House rows carry a bioguide id, so
// they resolve through db/vr-member-map.json first. Everything else resolves on
// (surname, state) against the COMMITTED rosters (cmp-data.js, spotlights-data.js,
// the member map's review list), and only when the match is UNIQUE. Unresolved names
// are reported on stderr and dropped — never guessed.
//
// Additive + re-runnable in the house style of 20260725020000: measures are
// find-or-create by natural key, roll calls ON CONFLICT (chamber,congress,session,
// roll_number) DO NOTHING, member votes ON CONFLICT (rollcall_id,politician_id)
// DO NOTHING, mappings ON CONFLICT (measure_id,issue_key) DO NOTHING. Changes no
// schema and never edits a prior migration.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import vm from "node:vm";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36";
const CONGRESS = 119;
const SESSION = 1;
const JSON_MODE = process.argv.includes("--json");

// ── The four votes ───────────────────────────────────────────────────────────
// Both measures already exist in vr_measures (measure_type 'resolution', chamber
// 'house') with a curated states_federal_power mapping at weight 40 / yea_opposes.
// The Motions to Proceed (Senate 276/280) are deliberately NOT here: procedural
// votes differentiate nobody on the merits, per the wave's own rules.
const MEASURES = {
  "H.J.Res. 88": {
    measureType: "resolution", congress: CONGRESS, chamber: "house", number: "H.J.Res. 88",
    title: "Providing for congressional disapproval of the Environmental Protection Agency waiver for the California Advanced Clean Cars II regulations",
    sourceUrl: "https://www.congress.gov/bill/119th-congress/house-joint-resolution/88",
    status: "enacted",
    rationale:
      "The EPA action disapproved here is titled \"California State Motor Vehicle and Engine Pollution Control Standards; Advanced Clean Cars II; Waiver of Preemption\" — the operative question is whether California keeps Clean Air Act waiver authority to set its own vehicle standards. A yea revokes that state authority.",
  },
  "H.J.Res. 89": {
    measureType: "resolution", congress: CONGRESS, chamber: "house", number: "H.J.Res. 89",
    title: "Providing for congressional disapproval of the Environmental Protection Agency waiver for the California Advanced Clean Trucks regulations",
    sourceUrl: "https://www.congress.gov/bill/119th-congress/house-joint-resolution/89",
    status: "enacted",
    rationale:
      "Companion disapproval of the Advanced Clean Trucks preemption waiver: a yea strips California's Clean Air Act authority to set truck standards other states may then adopt. Same state-vs-federal question as H.J.Res. 88, asked about a different waiver.",
  },
};
const ROLLCALLS = [
  { chamber: "house", roll: 114, number: "H.J.Res. 88" },
  { chamber: "house", roll: 112, number: "H.J.Res. 89" },
  { chamber: "senate", roll: 277, number: "H.J.Res. 88" },
  { chamber: "senate", roll: 281, number: "H.J.Res. 89" },
];

// ── Identity index over the committed rosters ────────────────────────────────
const ST = { Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT", Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY" };

const fold = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "");
const strip = (n) => fold(n).replace(/,?\s+(Jr\.|Sr\.|III|II|IV)$/i, "").trim();
// Every trailing-word suffix of a name, longest first, so multi-word surnames
// ("Lisa Blunt Rochester" → "blunt rochester") key correctly.
const suffixes = (n) => {
  const p = strip(n).split(/\s+/).map((w) => w.toLowerCase());
  const out = [];
  for (let i = Math.max(0, p.length - 3); i < p.length; i++) out.push(p.slice(i).join(" "));
  return out.sort((a, b) => b.length - a.length);
};
const SENATE_OFFICE = /^(U\.S\. Senat|Senate |Assistant Senate)/;
const HOUSE_OFFICE = /^(U\.S\. Represent|House |Speaker of the House|Assistant House|House Democratic|House Republican)/;
const chamberOf = (office) =>
  SENATE_OFFICE.test(office) ? "senate" : HOUSE_OFFICE.test(office) ? "house" : null;

const index = { senate: new Map(), house: new Map() }; // "surname|ST" -> Map(slug -> source)
const addKey = (chamber, key, slug, src) => {
  if (!chamber) return;
  const m = index[chamber];
  if (!m.has(key)) m.set(key, new Map());
  if (!m.get(key).has(slug)) m.get(key).set(slug, src);
};

const memberMap = JSON.parse(readFileSync(resolve(REPO, "db/vr-member-map.json"), "utf8"));
const MAP = memberMap.map || {};
for (const m of memberMap.members || []) {
  const slug = MAP[m.bioguide];
  if (!slug || !m.name || !m.state || !m.chamber) continue;
  for (const s of suffixes(m.name)) addKey(m.chamber, `${s}|${m.state}`, slug, "member-map");
}

const loadGlobal = (file, globalName) => {
  const ctx = { console };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.runInContext(readFileSync(resolve(REPO, file), "utf8"), vm.createContext(ctx), { filename: file });
  return ctx[globalName];
};

// cmp-data.js — {slug: {name, office, state}}. House rows carry the district in the
// same field ("Utah · District 3"), so take the state name before the separator.
for (const [slug, rec] of Object.entries(loadGlobal("cmp-data.js", "CMP_DATA") || {})) {
  const office = String(rec?.office || "");
  const chamber = chamberOf(office); // "Connecticut State Senator" starts with the state → null
  const st = ST[String(rec?.state || "").split("·")[0].trim()];
  if (!chamber || !st || !rec?.name) continue;
  for (const s of suffixes(rec.name)) addKey(chamber, `${s}|${st}`, slug, "cmp-data");
}

// spotlights-data.js — records whose office carries the state after a "·"
{
  const seen = new Set();
  (function walk(node) {
    if (!node || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) { for (const v of node) walk(v); return; }
    if (typeof node.id === "string" && typeof node.name === "string" && typeof node.office === "string") {
      const office = node.office.trim();
      const m = /·\s*([^·]+)$/.exec(office);
      const st = m ? ST[m[1].trim()] : null;
      const chamber = chamberOf(office) || (/Senat/.test(office) ? "senate" : /Represent|House/.test(office) ? "house" : null);
      if (st && chamber) for (const s of suffixes(node.name)) addKey(chamber, `${s}|${st}`, node.id, "spotlights");
    }
    for (const v of Object.values(node)) walk(v);
  })(loadGlobal("spotlights-data.js", "SPOTLIGHTS"));
}

// Documented identity overrides. Both of the splits this block was written to work
// around have since been fixed at the source (July 2026); the pins stay because the
// generator should keep producing the same ids regardless of member-map state.
//  · Susan Collins is canonically `collins`. She used to also accumulate rows under
//    `susan_collins` (the portrait key the member map was generated from); those were
//    merged into `collins` and the retirement is recorded in db/vr-pid-aliases.json.
//  · `kennedy` is Rep. Mike Kennedy (R-UT); Sen. John Kennedy is `kennedy_john`.
//    spotlights-data.js used to label the `kennedy` card as the Louisiana senator —
//    the label is corrected, but pin both ids so a future edit can't re-cross them.
const OVERRIDE = {
  senate: { "collins|ME": "collins", "kennedy|LA": "kennedy_john" },
  house: { "kennedy|UT": "kennedy" },
};

// XML display names carry noise: "Alsobrooks (D-MD)", "Hern (OK)", "Frankel, Lois".
// Expand one raw name into the candidates worth trying, most specific first.
const nameCandidates = (raw) => {
  const clean = fold(String(raw || "")).replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const m = /^([^,]+),\s*(.+)$/.exec(clean); // "Frankel, Lois" → "Lois Frankel", "Frankel"
  return m ? [`${m[2]} ${m[1]}`, m[1]] : [clean];
};

function resolveMember({ chamber, names, state, bioguide }) {
  if (bioguide && MAP[bioguide]) return { slug: MAP[bioguide], src: "bioguide" };
  let ambiguous = null;
  // Candidates run most-specific first ("Lois Frankel" before "Frankel"), and each
  // candidate's own surname suffixes run longest first, so a fuller name wins.
  for (const name of names.filter(Boolean).flatMap(nameCandidates)) {
    for (const s of suffixes(name)) {
      const key = `${s}|${state}`;
      if (OVERRIDE[chamber]?.[key]) return { slug: OVERRIDE[chamber][key], src: "override" };
      const cand = index[chamber].get(key);
      if (!cand) continue;
      const slugs = [...cand.keys()];
      if (slugs.length === 1) return { slug: slugs[0], src: cand.get(slugs[0]) };
      ambiguous = slugs; // keep looking: a more specific candidate may disambiguate
    }
  }
  return { slug: null, src: null, ambiguous };
}

// ── XML helpers ──────────────────────────────────────────────────────────────
const tag = (xml, name) => {
  const m = xml.match(new RegExp("<" + name + ">([\\s\\S]*?)</" + name + ">"));
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
};
const normPosition = (cast) => {
  const s = fold(String(cast || "")).toLowerCase().trim();
  if (s === "yea" || s === "yes" || s === "aye") return "yea";
  if (s === "nay" || s === "no") return "nay";
  if (s === "present") return "present";
  return "not_voting";
};
const normParty = (p) => {
  const s = String(p || "").toUpperCase();
  return s.startsWith("R") ? "R" : s.startsWith("D") ? "D" : "I";
};
// senate.gov: "May 22, 2025,  10:30 AM"; clerk.house.gov: "1-May-2025" + "10:37".
// Every vote here falls inside EDT, so pin -04:00 for a stable real timestamp.
const toISO = (text) => {
  const d = new Date(String(text).replace(/,\s*$/, "").replace(/\s+/g, " ").trim() + " GMT-0400");
  if (Number.isNaN(d.getTime())) throw new Error(`Unparseable vote date: "${text}"`);
  return d.toISOString();
};

async function fetchText(url) {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/xml,text/xml,*/*" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

const senateXml = (roll) =>
  `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${CONGRESS}${SESSION}/vote_${CONGRESS}_${SESSION}_${String(roll).padStart(5, "0")}.xml`;
const senateHtm = (roll) => senateXml(roll).replace(/\.xml$/, ".htm");
const houseXml = (roll) => `https://clerk.house.gov/evs/2025/roll${String(roll).padStart(3, "0")}.xml`;

async function pullSenate(entry) {
  const xml = await fetchText(senateXml(entry.roll));
  const doc = tag(xml, "document_name");
  if (doc.replace(/\s+/g, " ") !== entry.number)
    throw new Error(`roll ${entry.roll}: expected ${entry.number}, XML says "${doc}"`);
  const members = [...xml.matchAll(/<member>([\s\S]*?)<\/member>/g)].map((m) => {
    const g = (t) => tag(m[0], t);
    const state = g("state");
    const r = resolveMember({ chamber: "senate", names: [g("member_full"), g("last_name")], state });
    return {
      name: g("member_full") || `${g("first_name")} ${g("last_name")}`.trim(),
      surname: g("last_name"), state, party: normParty(g("party")),
      position: normPosition(g("vote_cast")), slug: r.slug, src: r.src, ambiguous: r.ambiguous || null,
    };
  });
  return {
    chamber: "senate", roll: entry.roll, number: entry.number,
    voteDate: toISO(tag(xml, "vote_date")),
    question: tag(xml, "vote_question_text") || tag(xml, "question") || null,
    actionType: "passage",
    result: /passed|agreed/i.test(tag(xml, "vote_result")) ? "passed" : "rejected",
    requiredMajority: tag(xml, "majority_requirement") === "3/5" ? "three_fifths" : tag(xml, "majority_requirement") === "2/3" ? "two_thirds" : "simple",
    totals: { yea: +tag(xml, "yeas") || 0, nay: +tag(xml, "nays") || 0, present: +tag(xml, "present") || 0, notVoting: +tag(xml, "absent") || 0 },
    sourceUrl: senateHtm(entry.roll), sourceLabel: "U.S. Senate",
    resultText: tag(xml, "vote_result"), desc: tag(xml, "vote_title"), members,
  };
}

async function pullHouse(entry) {
  const xml = await fetchText(houseXml(entry.roll));
  const legis = tag(xml, "legis-num").replace(/\s+/g, " ").trim();
  // "H J RES 88" (clerk) vs "H.J.Res. 88" (ours) — compare on alphanumerics only.
  const flat = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (flat(legis) !== flat(entry.number))
    throw new Error(`roll ${entry.roll}: expected ${entry.number}, XML says "${legis}"`);
  const timeM = xml.match(/<action-time[^>]*time-etz="([^"]+)"/);
  const members = [...xml.matchAll(/<recorded-vote>([\s\S]*?)<\/recorded-vote>/g)].map((m) => {
    const leg = m[1].match(/<legislator([^>]*)>([\s\S]*?)<\/legislator>/);
    const attrs = leg ? leg[1] : "";
    const at = (n) => (attrs.match(new RegExp(n + '="([^"]*)"')) || [, ""])[1];
    const surname = at("unaccented-name") || at("sort-field") || (leg ? leg[2] : "");
    const state = at("state");
    const r = resolveMember({ chamber: "house", names: [surname, at("sort-field")], state, bioguide: at("name-id") });
    return {
      name: leg ? fold(leg[2]).trim() : surname, surname, state, party: normParty(at("party")),
      position: normPosition(tag(m[1], "vote")), slug: r.slug, src: r.src, ambiguous: r.ambiguous || null,
    };
  });
  const yea = members.filter((x) => x.position === "yea").length;
  const nay = members.filter((x) => x.position === "nay").length;
  return {
    chamber: "house", roll: entry.roll, number: entry.number,
    voteDate: toISO(`${tag(xml, "action-date")} ${timeM ? timeM[1] : "12:00"}`),
    question: tag(xml, "vote-question") || null,
    actionType: "passage",
    result: /passed|agreed/i.test(tag(xml, "vote-result")) ? "passed" : "rejected",
    requiredMajority: "simple",
    totals: {
      yea, nay,
      present: members.filter((x) => x.position === "present").length,
      notVoting: members.filter((x) => x.position === "not_voting").length,
    },
    // Same canonical vote-page form the earlier House seed migrations cite.
    sourceUrl: `https://clerk.house.gov/Votes/2025${entry.roll}`,
    sourceLabel: "U.S. House Clerk",
    resultText: tag(xml, "vote-result"), desc: tag(xml, "vote-desc"), members,
  };
}

// Party-crossover flag from the majority position within each party, over the FULL
// chamber — same logic as crossoverFlags() in vr-normalize.ts.
function crossover(members) {
  const byParty = {};
  for (const m of members) {
    if (!m.party || (m.position !== "yea" && m.position !== "nay")) continue;
    (byParty[m.party] = byParty[m.party] || {})[m.position] = (byParty[m.party]?.[m.position] || 0) + 1;
  }
  const majority = {};
  for (const p of Object.keys(byParty)) majority[p] = (byParty[p].yea || 0) >= (byParty[p].nay || 0) ? "yea" : "nay";
  return (m) => {
    if (!m.party || (m.position !== "yea" && m.position !== "nay") || !majority[m.party]) return null;
    return m.position === majority[m.party] ? "with_party" : "against_party";
  };
}

// ── Pull ─────────────────────────────────────────────────────────────────────
const votes = [];
for (const entry of ROLLCALLS) {
  const v = entry.chamber === "senate" ? await pullSenate(entry) : await pullHouse(entry);
  votes.push(v);
  const un = v.members.filter((m) => !m.slug);
  process.stderr.write(
    `${v.chamber} roll ${v.roll} · ${v.number} · ${v.resultText} ${v.totals.yea}-${v.totals.nay} · ` +
    `${v.members.length} members, ${v.members.length - un.length} resolved\n`
  );
  if (un.length)
    process.stderr.write(`   dropped (no unique roster match): ${un.map((m) => `${m.surname}(${m.party}-${m.state})${m.ambiguous ? `[ambiguous:${m.ambiguous.join("/")}]` : ""}`).join(" ")}\n`);
}

if (JSON_MODE) {
  process.stdout.write(JSON.stringify(votes, null, 1) + "\n");
  process.exit(0);
}

// ── Emit SQL ─────────────────────────────────────────────────────────────────
const q = (s) => "'" + String(s == null ? "" : s).replace(/'/g, "''") + "'";
const qOrNull = (s) => (s == null ? "NULL" : q(s));
const varName = (n) => "m_" + n.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const L = [];
L.push("-- ─────────────────────────────────────────────────────────────────────────────");
L.push("-- Voting Record — real roll calls for the California waiver CRAs (data-only)");
L.push("-- ─────────────────────────────────────────────────────────────────────────────");
L.push("-- GENERATED by scripts/vr-gen-waiver-cra-migration.mjs — regenerate, do not hand-edit.");
L.push("--");
L.push("-- H.J.Res. 88 (Advanced Clean Cars II) and H.J.Res. 89 (Advanced Clean Trucks) were");
L.push("-- already in the corpus and already mapped to states_federal_power (weight 40,");
L.push("-- yea_opposes) — the EPA decisions they disapprove are titled \"Waiver of Preemption\"");
L.push("-- — but neither carried a single roll call, so the mapping moved no member's depth.");
L.push("-- This attaches their four real passage votes. No new issue mapping is invented:");
L.push("-- the inserts below are the existing curated rows, restated so the migration also");
L.push("-- works on a database provisioned from scratch.");
L.push("--");
L.push("-- Deliberately excluded: Senate 276 and 280, the Motions to Proceed on the same two");
L.push("-- resolutions. Procedural votes differentiate nobody on the merits. H.J.Res. 87 (the");
L.push("-- third same-day waiver CRA) is also excluded — see the wave report; it would count a");
L.push("-- third time for one question and is not in the corpus.");
L.push("--");
L.push("-- Provenance — every position traces to an official document:");
for (const v of votes)
  L.push(`--   ${v.chamber} roll ${v.roll} · ${v.number} · ${v.resultText} ${v.totals.yea}-${v.totals.nay} · ${v.chamber === "senate" ? senateXml(v.roll) : houseXml(v.roll)}`);
L.push("--");
L.push("-- Changes NO schema. Additive + re-runnable: measures find-or-create by natural key,");
L.push("-- roll calls ON CONFLICT (chamber,congress,session,roll_number) DO NOTHING, member");
L.push("-- votes ON CONFLICT (rollcall_id,politician_id) DO NOTHING, issue mappings ON CONFLICT");
L.push("-- (measure_id,issue_key) DO NOTHING. Never edits a prior migration.");
L.push("DO $$");
L.push("DECLARE");
for (const n of Object.keys(MEASURES)) L.push(`  ${varName(n)} integer;`);
L.push("  rc integer;");
L.push("BEGIN");

for (const [number, m] of Object.entries(MEASURES)) {
  const v = varName(number);
  L.push("");
  L.push(`  -- ${number} — ${m.title}`);
  L.push(`  SELECT id INTO ${v} FROM vr_measures WHERE measure_type = ${q(m.measureType)} AND congress = ${m.congress} AND chamber = ${q(m.chamber)} AND number = ${q(number)} LIMIT 1;`);
  L.push(`  IF ${v} IS NULL THEN`);
  L.push(`    INSERT INTO vr_measures (measure_type, congress, chamber, number, title, source_url, source_label, status)`);
  L.push(`    VALUES (${q(m.measureType)}, ${m.congress}, ${q(m.chamber)}, ${q(number)}, ${q(m.title)}, ${q(m.sourceUrl)}, 'Congress.gov', ${q(m.status)})`);
  L.push(`    RETURNING id INTO ${v};`);
  L.push(`  END IF;`);
}

for (const v of votes) {
  const mv = varName(v.number);
  const flag = crossover(v.members);
  const rows = v.members
    .filter((m) => m.slug)
    .map((m) => ({ pid: m.slug, position: m.position, isParty: flag(m) }))
    // one row per politician_id (the Collins override can only ever map one XML row)
    .filter((r, i, a) => a.findIndex((x) => x.pid === r.pid) === i)
    .sort((a, b) => (a.pid < b.pid ? -1 : 1));
  L.push("");
  L.push(`  -- ${v.chamber} roll call ${v.roll} — ${v.number}, ${v.question} (${v.resultText} ${v.totals.yea}-${v.totals.nay})`);
  L.push(`  -- ${v.chamber === "senate" ? senateXml(v.roll) : houseXml(v.roll)}`);
  L.push(`  INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)`);
  L.push(`  VALUES (${mv}, ${q(v.chamber)}, ${CONGRESS}, ${SESSION}, ${v.roll}, TIMESTAMPTZ ${q(v.voteDate)}, ${qOrNull(v.question)}, ${q(v.actionType)}, ${q(v.result)}, ${q(v.requiredMajority)}, ${q(JSON.stringify(v.totals))}::jsonb, ${q(v.sourceUrl)}, ${q(v.sourceLabel)})`);
  L.push(`  ON CONFLICT (chamber, congress, session, roll_number) DO NOTHING;`);
  L.push(`  SELECT id INTO rc FROM vr_rollcalls WHERE chamber = ${q(v.chamber)} AND congress = ${CONGRESS} AND session = ${SESSION} AND roll_number = ${v.roll} LIMIT 1;`);
  L.push(`  -- ${rows.length} of ${v.members.length} recorded members resolve to a roster id`);
  L.push(`  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES`);
  L.push(rows.map((r) => `    (rc, ${q(r.pid)}, ${q(r.position)}, ${r.isParty ? q(r.isParty) : "NULL"})`).join(",\n"));
  L.push(`  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;`);
}

L.push("");
L.push("  -- Curated states_federal_power mapping (already present in the live corpus;");
L.push("  -- restated for a from-scratch provision. Never clobbers a curated row.)");
for (const [number, m] of Object.entries(MEASURES)) {
  L.push(`  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)`);
  L.push(`  VALUES (${varName(number)}, 'states_federal_power', 40, false, 'yea_opposes', ${q(m.rationale)}, ${q(m.sourceUrl)})`);
  L.push(`  ON CONFLICT (measure_id, issue_key) DO NOTHING;`);
}
L.push("END $$;");
L.push("");
process.stdout.write(L.join("\n"));
