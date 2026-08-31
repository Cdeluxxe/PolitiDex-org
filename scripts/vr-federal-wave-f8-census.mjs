// ════════════════════════════════════════════════════════════════════════════
// Federal wave F8 — census: the roster three, and the Senate energy pool
// ════════════════════════════════════════════════════════════════════════════
//
// The F8 brief asks two questions in one order, and this file answers both so the
// answers can be checked instead of trusted.
//
// FIRST: the three senators. Wave F7 ingested a Senate slice and recorded a roster
// gap rather than fixing it — Husted, Hyde-Smith and Armstrong were absent from
// db/vr-member-map.json, so every Senate roll in the corpus lost the same three rows.
// Step 0 below re-verifies each of the three by BOTH paths the admission claims:
// name+state → Bioguide in legislators-current.json, and the <lis_member_id> the
// Senate's own roll XML records → id.lis in the same dataset. It also asserts the
// portrait host is one of the six netlify.toml already allows, that the slug is
// admitted in db/vr-roster-admitted.json, and that the generated map resolves it.
//
// SECOND: is there a Senate energy or permitting roll left to ingest? The brief's
// premise is that /p/lee and /p/curtis show a thin Climate folder because senators
// never vote the House energy bills F6 admitted. Steps 1–6 walk the same funnel F7's
// census walked, with one step added at the end: of the rolls that survive the form
// gate, rule 11 and the standing refusal record, which are about energy at all?
//
// AND A THIRD THING THE BRIEF DID NOT ASK FOR, BECAUSE A FUNNEL CAN BE WRONG IN THE
// DIRECTION THAT FLATTERS IT. A funnel that returns nothing is indistinguishable from
// a funnel with a broken filter — F6 shipped exactly that bug, reading <vote_tally>'s
// display string so that "51-42" parsed as 5142 and every Senate roll looked
// unanimous. So step 7 scans ALL listed rolls for energy vocabulary independently of
// the funnel and reports where each hit died. If step 6 says the pool is empty and
// step 7 finds energy rolls the funnel never saw, the funnel is the thing that is
// wrong.
//
// Step 8 then reads the four keys' actual inventory out of the database, because the
// question "does /p/lee have a thin Climate folder for want of a Senate roll?" is
// answerable from the record and should not be inferred from the funnel either.
//
// THE TALLY COMES FROM <yeas>/<nays>, NEVER FROM <vote_tally>. See above.
// THE FORM GATE IS COPIED FROM scripts/test-vr-vote-seed.mjs, NOT REWRITTEN: a census
// with a looser gate than the guard offers rolls the guard will refuse.
// THE REFUSAL RECORD IS READ FROM THE SHIPPED SEEDS' `measure` AND `roll` FIELDS ONLY.
// Scanning reason paragraphs for bill numbers would refuse a measure merely because an
// earlier wave mentioned it in passing.
//
// Usage: node scripts/vr-federal-wave-f8-census.mjs [--json]
//        F8_XML_DIR overrides the XML cache (default /tmp/f8xml).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = process.env.F8_XML_DIR || "/tmp/f8xml";
const AS_JSON = process.argv.includes("--json");

// ── SOURCE ──────────────────────────────────────────────────────────────────
async function menu(session) {
  const local = join(CACHE, `s_119_${session}.xml`);
  if (existsSync(local)) return readFileSync(local, "utf8");
  const url = `https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_${session}.xml`;
  const res = await fetch(url, { headers: { "user-agent": "PolitiDex/1.0 (federal wave F8 census)" } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const body = await res.text();
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(local, body);
  return body;
}

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
};

function parseMenu(xml, session) {
  const out = [];
  for (const m of xml.matchAll(/<vote>([\s\S]*?)<\/vote>/g)) {
    const b = m[1];
    const roll = Number(tag(b, "vote_number"));
    const yea = Number(tag(b, "yeas"));
    const nay = Number(tag(b, "nays"));
    if (!Number.isInteger(roll) || roll <= 0) throw new Error(`session ${session}: unparseable vote_number "${tag(b, "vote_number")}"`);
    if (!Number.isInteger(yea) || !Number.isInteger(nay)) throw new Error(`senate 119/${session}/${roll}: unparseable tally (yeas "${tag(b, "yeas")}", nays "${tag(b, "nays")}")`);
    out.push({
      congress: 119, session, roll, chamber: "senate",
      date: tag(b, "vote_date"), issue: tag(b, "issue"), question: tag(b, "question"),
      result: tag(b, "result"), title: tag(b, "title"), yea, nay,
    });
  }
  return out;
}

// ── FORM GATE (copied from scripts/test-vr-vote-seed.mjs) ───────────────────
const DECISIVE = /^(on passage|on the motion \(motion to concur|on motion to concur|on concurring|on the conference report|on motion to suspend the rules and (pass|agree|concur))/i;
const PASSAGE_FORMS = [{ name: "joint resolution", question: /^on the joint resolution\b/i, number: /^(h|s)\.j\.\s*res\./i }];
const EXCEPTIONS = [
  { name: "amendment", question: /^on (agreeing to )?the amendment\b/i, number: /^(h|s)\.\s*amdt\./i },
  { name: "discharge", question: /^on the motion to discharge/i, number: /^(h|s)\.j\.\s*res\./i },
];
const MEASURE = /^(H\.R\.|S\.|H\.J\.\s?Res\.|S\.J\.\s?Res\.|H\.Res\.|S\.Res\.|H\.Con\.Res\.|S\.Con\.Res\.|H\.\s?Amdt\.|S\.\s?Amdt\.)\s*\d+/i;

function formGate(v) {
  const q = v.question, n = v.issue;
  if (/^PN/i.test(n)) return { admitted: false, why: "nomination" };
  if (!MEASURE.test(n)) return { admitted: false, why: `issue "${n}" is not a measure number` };
  if (DECISIVE.test(q)) return { admitted: true, form: "decisive" };
  for (const f of PASSAGE_FORMS) if (f.question.test(q) && f.number.test(n)) return { admitted: true, form: `passage form: ${f.name}` };
  for (const e of EXCEPTIONS) if (e.question.test(q) && e.number.test(n)) return { admitted: true, form: `exception: ${e.name}` };
  return { admitted: false, why: `question "${q}" is not an admitted decisive form for ${n}` };
}

// ── REFUSAL RECORD ──────────────────────────────────────────────────────────
const NUM_IN = /\b(H\.R\.|S\.|H\.J\.\s?Res\.|S\.J\.\s?Res\.|H\.Res\.|S\.Res\.|H\.Con\.Res\.|S\.Con\.Res\.|H\.\s?Amdt\.|S\.\s?Amdt\.)\s*(\d+)\b/gi;
const norm = (s) => s.replace(/\s+/g, " ").replace(/\.\s?/g, ". ").replace(/\s+$/, "").toUpperCase();
const ROLL_IN = /senate\s+(\d+)\/(\d)\/(\d+)/gi;

function refusalRecord() {
  const measures = new Map();
  const rolls = new Map();
  const files = ["f1", "f2", "f3", "f4", "f5", "f6", "f7"].map((w) => `vr-federal-mapping-seed-${w}.json`);
  for (const f of files) {
    const p = join(ROOT, "db", f);
    if (!existsSync(p)) continue;
    const j = JSON.parse(readFileSync(p, "utf8"));
    for (const key of ["declinedRollCalls", "declinedMappings", "declinedPromotes", "refusedThisWave"]) {
      // F7 named its block `refusedThisWave` and made it an object keyed by category
      // rather than an array. Flatten either shape; a wave that changed its own file
      // layout should not silently stop being read.
      const raw = j[key];
      const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? Object.values(raw).flat() : [];
      for (const it of list) {
        if (!it || typeof it !== "object") continue;
        for (const m of String(it.measure || "").matchAll(NUM_IN)) if (!measures.has(norm(m[0]))) measures.set(norm(m[0]), `${f}:${key}`);
        for (const m of String(it.roll || "").matchAll(ROLL_IN)) {
          const id = `${m[1]}/${m[2]}/${Number(m[3])}`;
          if (!rolls.has(id)) rolls.set(id, `${f}:${key}`);
        }
      }
    }
  }
  // The F8 brief's standing list, kept by name whether or not a seed field carries it.
  // Refusal-first, do not reopen: the three named bills, the F4 CRA/disapproval block,
  // the named appropriations vehicles, and F6's four study-and-report energy bills.
  for (const n of ["H.R. 1069", "H.R. 973", "S. 2503",
                   "H.R. 3015", "H.R. 3638", "H.R. 3109", "H.R. 3617",
                   "H.R. 5371", "H.R. 6500", "H.R. 3944", "H.R. 4553", "H.R. 8800",
                   "H.R. 1968", "H.R. 7148"])
    if (!measures.has(norm(n))) measures.set(norm(n), "F8 brief: refusal-first");
  return { measures, rolls };
}

// ── ALREADY ON FILE ─────────────────────────────────────────────────────────
const require = createRequire(import.meta.url);           // pg ships CJS only
const pg = require("pg");
async function db(fn) {
  const c = new pg.Client({ connectionString: process.env.NETLIFY_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try { return await fn(c); } finally { await c.end(); }
}

// ════════════════════════════════════════════════════════════════════════════
// STEP 0 — the roster three
// ════════════════════════════════════════════════════════════════════════════
// The brief: "Bioguide / LIS id verified twice. SEED_SLUGS + vr-roster-admitted +
// portrait in BROWSE_PHOTOS on an allowlisted host."
const THREE = {
  jon_husted:     { name: "Jon Husted",       bioguide: "H001104", lis: "S438", state: "OH" },
  hyde_smith:     { name: "Cindy Hyde-Smith", bioguide: "H001079", lis: "S395", state: "MS" },
  alan_armstrong: { name: "Alan Armstrong",   bioguide: "A000383", lis: "S440", state: "OK" },
};
// The six hosts netlify.toml's [images] remote_images allows and
// scripts/test-photo-coverage.mjs pins. A portrait outside them 404s through the Image
// CDN, which is how a share card ends up drawing a monogram for an admitted member.
const ALLOWED_HOSTS = ["raw.githubusercontent.com", "upload.wikimedia.org", "commons.wikimedia.org",
                       "bioguide.congress.gov", "le.utah.gov", "insurance.utah.gov"];

async function legislators(file, url) {
  const local = join(ROOT, "scripts", file);
  if (existsSync(local)) return JSON.parse(readFileSync(local, "utf8"));
  const r = await fetch(url);
  if (!r.ok) throw new Error(`could not load ${file}: ${r.status}`);
  return await r.json();
}

function browsePhotos() {
  const src = readFileSync(join(ROOT, "compare-hub.js"), "utf8");
  const out = {};
  for (const m of src.matchAll(/^\s{6}([a-z0-9_]+):\s*'([^']+)'/gm)) out[m[1]] = m[2];
  return out;
}

async function rosterThree() {
  const leg = await legislators("legislators-current.json", "https://unitedstates.github.io/congress-legislators/legislators-current.json");
  const photos = browsePhotos();
  const admitted = JSON.parse(readFileSync(join(ROOT, "db", "vr-roster-admitted.json"), "utf8"));
  const admittedSlugs = new Set(Object.values(admitted.waves).filter(Array.isArray).flat());
  const seedSrc = readFileSync(join(ROOT, "scripts", "vr-gen-member-map.mjs"), "utf8");
  const map = JSON.parse(readFileSync(join(ROOT, "db", "vr-member-map.json"), "utf8")).map || {};
  const rows = [];
  for (const [slug, who] of Object.entries(THREE)) {
    const checks = [];
    const fail = (s) => checks.push({ check: s, ok: false });
    const pass = (s, detail) => checks.push({ check: s, ok: true, detail });

    // Path 1 — name + state → Bioguide.
    const byName = leg.filter((p) => p.name.last === who.name.split(" ").slice(-1)[0]
      && p.terms[p.terms.length - 1].state === who.state
      && p.terms[p.terms.length - 1].type === "sen");
    if (byName.length !== 1) fail(`name+state matches ${byName.length} senators, not exactly one`);
    else if (byName[0].id.bioguide !== who.bioguide) fail(`name+state resolves to ${byName[0].id.bioguide}, not ${who.bioguide}`);
    else pass("verification path 1 — name + state → Bioguide", `${who.name} (${who.state}) → ${who.bioguide}`);

    // Path 2 — the LIS member id the Senate's own roll XML records → id.lis.
    const byLis = leg.filter((p) => p.id.lis === who.lis);
    if (byLis.length !== 1) fail(`LIS id ${who.lis} matches ${byLis.length} senators, not exactly one`);
    else if (byLis[0].id.bioguide !== who.bioguide) fail(`LIS ${who.lis} resolves to ${byLis[0].id.bioguide}, not ${who.bioguide}`);
    else pass("verification path 2 — LIS member id → Bioguide", `${who.lis} → ${who.bioguide}`);

    if (!new RegExp(`^\\s*${slug}:\\s*"${who.bioguide}"`, "m").test(seedSrc))
      fail(`scripts/vr-gen-member-map.mjs SEED_SLUGS does not carry ${slug}: "${who.bioguide}"`);
    else pass("SEED_SLUGS entry", `${slug}: "${who.bioguide}"`);

    if (!new RegExp(`^\\s*${slug}:\\s*"${who.name}"`, "m").test(seedSrc))
      fail(`scripts/vr-gen-member-map.mjs SEED_NAMES does not carry ${slug}: "${who.name}"`);
    else pass("SEED_NAMES entry — so the identity wall has a name to compare", `${slug}: "${who.name}"`);

    if (!admittedSlugs.has(slug)) fail("not in db/vr-roster-admitted.json");
    else pass("admitted to the roster ceiling", `db/vr-roster-admitted.json → ${Object.entries(admitted.waves).find(([, v]) => Array.isArray(v) && v.includes(slug))[0]}`);

    const url = photos[slug];
    if (!url) fail("no portrait in BROWSE_PHOTOS");
    else {
      const host = new URL(url).host;
      if (!ALLOWED_HOSTS.includes(host)) fail(`portrait host ${host} is not one of the six allowlisted in netlify.toml`);
      else pass("portrait on an allowlisted host", host);
    }

    if (map[who.bioguide] !== slug) fail(`db/vr-member-map.json resolves ${who.bioguide} to '${map[who.bioguide] ?? "nothing"}'`);
    else pass("generated member map resolves the Bioguide to this slug", `${who.bioguide} → ${slug}`);

    rows.push({ slug, ...who, checks, ok: checks.every((c) => c.ok) });
  }
  return rows;
}

// ════════════════════════════════════════════════════════════════════════════
// STEP 7 — the independent energy scan (see the header)
// ════════════════════════════════════════════════════════════════════════════
// Deliberately broad. A term here does not claim the roll is about energy; it claims
// the roll is worth explaining, and every hit gets an explanation.
const ENERGY_WORDS = /\b(energy|oil|gas|petroleum|pipeline|drill\w*|coal|nuclear|refiner\w*|permit\w*|nepa|leasing|lease sale|offshore|onshore|lng|liquefied natural|electric\w* (grid|generation|vehicle)|power plant|emissions?|greenhouse|carbon|climate|renewable|solar|wind|hydro\w*|geotherm\w*|methane|fossil|fuel|strategic petroleum|arctic|anwr|public lands?|federal lands?|mineral\w*|mining|critical minerals?|transmission|utility|utilities|epa|interior|ferc)\b/i;

// The three shapes a Senate energy roll most often takes that are not acts.
// Rule 31: a reserve fund, a point of order and a sense-of-the-Senate are not acts.
const RULE31 = /\b(reserve fund|point of order|sense of the senate|budget resolution|waive.*budget|emergency designation)\b/i;
const NOT_A_FORM = /^(on the motion to proceed|on cloture|on the cloture motion|on the motion to table|on the motion to recommit|on the motion to refer)/i;

// ════════════════════════════════════════════════════════════════════════════
// RUN
// ════════════════════════════════════════════════════════════════════════════
const three = await rosterThree();
const all = [...parseMenu(await menu(1), 1), ...parseMenu(await menu(2), 2)];
const listed = all.length;

const { onFileSet, keyInventory, memberActs } = await db(async (c) => {
  const of = await c.query("select session, roll_number from vr_rollcalls where chamber = 'senate' and congress = 119 and roll_number is not null");
  const inv = await c.query(`
    SELECT mi.issue_key, mi.is_primary, m.chamber, m.number, m.congress,
           (SELECT count(*) FROM vr_rollcalls r WHERE r.measure_id = m.id AND r.chamber = 'senate') senate_rolls,
           (SELECT count(*) FROM vr_rollcalls r JOIN vr_member_votes v ON v.rollcall_id = r.id
             WHERE r.measure_id = m.id AND r.chamber = 'senate') senate_cells
      FROM vr_measure_issues mi JOIN vr_measures m ON m.id = mi.measure_id
     WHERE mi.issue_key = ANY($1::text[])
     ORDER BY mi.issue_key, mi.is_primary DESC, m.chamber, m.number`,
    [["energy_production", "permitting_reform", "lands_energy", "climate_action"]]);
  const acts = await c.query(`
    SELECT v.politician_id, mi.issue_key, count(*) FILTER (WHERE mi.is_primary) primary_acts, count(*) acts
      FROM vr_member_votes v JOIN vr_rollcalls r ON r.id = v.rollcall_id
      JOIN vr_measures m ON m.id = r.measure_id JOIN vr_measure_issues mi ON mi.measure_id = m.id
     WHERE v.politician_id = ANY($1::text[]) AND mi.issue_key = ANY($2::text[]) AND v.position IN ('yea','nay')
     GROUP BY 1, 2 ORDER BY 1, 2`,
    [["lee", "curtis", "bmoore", "jon_husted", "hyde_smith", "alan_armstrong"],
     ["energy_production", "permitting_reform", "lands_energy", "climate_action"]]);
  return {
    onFileSet: new Set(of.rows.map((x) => `119/${x.session}/${x.roll_number}`)),
    keyInventory: inv.rows,
    memberActs: acts.rows,
  };
});
const REF = refusalRecord();

const funnel = [];
const step = (name, kept, dropped, note) => funnel.push({ step: name, from: kept.length + dropped.length, to: kept.length, note });
const measureOf = (v) => norm((v.issue.match(MEASURE) || [v.issue])[0]);

let pool = all;
const notOnFile = pool.filter((v) => !onFileSet.has(`119/${v.session}/${v.roll}`));
step("1. not already in vr_rollcalls", notOnFile, pool.filter((v) => !notOnFile.includes(v)), `-${pool.length - notOnFile.length} already on file (${onFileSet.size} Senate 119th rolls on file)`);
pool = notOnFile;

const formed = [], formRejects = [];
for (const v of pool) { const g = formGate(v); (g.admitted ? formed : formRejects).push(Object.assign(v, { _gate: g })); }
const byForm = {};
for (const v of formed) byForm[v._gate.form] = (byForm[v._gate.form] || 0) + 1;
step("2. rule 8/12 decisive question form", formed, formRejects, `-${formRejects.length}. Admitted: ${Object.entries(byForm).map(([k, n]) => `${n} ${k}`).join(", ")}`);
pool = formed;

const contested = pool.filter((v) => { const p = v.yea + v.nay; const l = Math.min(v.yea, v.nay); return p > 0 && l >= p / 10; });
step("3. contested at rule 11's one-tenth bar", contested, pool.filter((v) => !contested.includes(v)), `-${pool.length - contested.length}`);
pool = contested;

const survived = [], refused = [];
for (const v of pool) {
  const byName = REF.measures.get(measureOf(v));
  const byRoll = REF.rolls.get(`119/${v.session}/${v.roll}`);
  if (byName || byRoll) refused.push(Object.assign(v, { _refusedBy: byRoll ? `roll named in ${byRoll}` : `measure named in ${byName}` }));
  else survived.push(v);
}
step("4. refusal-first gate", survived, refused, `-${refused.length} already refused by name`);

// Step 5 — and this is the one the brief is actually asking about.
const energyPool = survived.filter((v) => ENERGY_WORDS.test(`${v.issue} ${v.title} ${v.question}`));
step("5. subject is energy / permitting / lands / climate", energyPool, survived.filter((v) => !energyPool.includes(v)),
  energyPool.length ? `${energyPool.length} candidate(s)` : "the surviving rolls are about something else");

// Step 7 — the independent scan, run over EVERY listed roll.
const scan = [];
for (const v of all) {
  if (!ENERGY_WORDS.test(`${v.issue} ${v.title} ${v.question}`)) continue;
  const id = `119/${v.session}/${v.roll}`;
  const g = formGate(v);
  const p = v.yea + v.nay, low = Math.min(v.yea, v.nay);
  let died;
  if (onFileSet.has(id)) died = "already in vr_rollcalls — ingested by an earlier wave";
  else if (REF.rolls.has(id)) died = `roll refused by name in ${REF.rolls.get(id)}`;
  else if (REF.measures.has(measureOf(v))) died = `measure refused by name in ${REF.measures.get(measureOf(v))}`;
  else if (RULE31.test(`${v.title} ${v.question}`)) died = "runbook rule 31 — a reserve fund, point of order or sense-of-the-Senate is not an act";
  else if (NOT_A_FORM.test(v.question)) died = `not an admitted form — "${v.question}" is a procedural motion, not a decisive question`;
  else if (!g.admitted) died = `form gate — ${g.why}`;
  else if (!(p > 0 && low >= p / 10)) died = `rule 11 — losing side ${low} of ${p} is under the one-tenth bar (uncontested)`;
  else died = "SURVIVES — this is a candidate the funnel should also have found";
  scan.push({ roll: id, measure: measureOf(v), issue: v.issue, question: v.question, tally: `${v.yea}-${v.nay}`, title: v.title, died });
}
const scanSurvivors = scan.filter((s) => s.died.startsWith("SURVIVES"));

// Step 8 — what the four keys actually hold, and what lee / curtis / bmoore hold on them.
const KEYS = ["energy_production", "permitting_reform", "lands_energy", "climate_action"];
const senateReachable = {};
for (const k of KEYS) {
  const rows = keyInventory.filter((r) => r.issue_key === k);
  const primaries = rows.filter((r) => r.is_primary);
  senateReachable[k] = {
    measures: rows.length,
    primaryMeasures: primaries.length,
    primaryWithASenateRoll: primaries.filter((r) => Number(r.senate_rolls) > 0)
      .map((r) => `${r.chamber} ${r.number} (${r.congress}), ${r.senate_cells} Senate cells`),
    housePrimaryWithNoSenateRoll: primaries.filter((r) => r.chamber === "house" && Number(r.senate_rolls) === 0).map((r) => `${r.number} (${r.congress})`),
  };
}
const actsBy = {};
for (const r of memberActs) (actsBy[r.politician_id] ||= {})[r.issue_key] = { acts: Number(r.acts), primaryActs: Number(r.primary_acts) };

const report = {
  wave: "F8", generated: new Date().toISOString().slice(0, 10),
  sources: [
    "senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.xml",
    "senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_2.xml",
    "vr_rollcalls / vr_measures / vr_measure_issues / vr_member_votes",
    "unitedstates.github.io/congress-legislators/legislators-current.json",
  ],
  rosterThree: three,
  rosterThreeAllVerified: three.every((t) => t.ok),
  listed: { total: listed, session1: all.filter((v) => v.session === 1).length, session2: all.filter((v) => v.session === 2).length },
  onFile: onFileSet.size,
  funnel,
  energyPool: energyPool.map((v) => ({ roll: `119/${v.session}/${v.roll}`, measure: measureOf(v), issue: v.issue, question: v.question, tally: `${v.yea}-${v.nay}`, form: v._gate.form, title: v.title })),
  nonEnergySurvivors: survived.filter((v) => !energyPool.includes(v)).map((v) => ({ roll: `119/${v.session}/${v.roll}`, measure: measureOf(v), question: v.question, tally: `${v.yea}-${v.nay}`, title: v.title })),
  refusedAtStep4: refused.map((v) => ({ roll: `119/${v.session}/${v.roll}`, measure: measureOf(v), refusedBy: v._refusedBy, tally: `${v.yea}-${v.nay}` })),
  independentEnergyScan: { hits: scan.length, survivors: scanSurvivors.length, rows: scan },
  keyInventory: senateReachable,
  actsHeld: actsBy,
};

if (AS_JSON) { console.log(JSON.stringify(report, null, 1)); }
else {
  console.log("── STEP 0: the roster three ───────────────────────────────────────────────");
  for (const t of three) {
    console.log(`  ${t.ok ? "✓" : "✗"} ${t.slug.padEnd(15)} ${t.name.padEnd(18)} ${t.bioguide}  LIS ${t.lis}  ${t.state}`);
    for (const c of t.checks) console.log(`      ${c.ok ? "✓" : "✗"} ${c.check}${c.detail ? ` — ${c.detail}` : ""}`);
  }
  console.log(`\n── STEPS 1-5: the Senate energy pool ──────────────────────────────────────`);
  console.log(`listed ${listed} (session 1: ${report.listed.session1}, session 2: ${report.listed.session2}); on file ${onFileSet.size}`);
  for (const f of funnel) console.log(`  ${f.step.padEnd(48)} ${String(f.from).padStart(5)} → ${String(f.to).padStart(4)}   ${f.note}`);
  console.log(`\nENERGY POOL: ${energyPool.length}`);
  for (const v of report.energyPool) console.log(`  ${v.roll.padEnd(10)} ${v.measure.padEnd(14)} ${v.tally.padEnd(8)} ${v.form.padEnd(22)} ${v.question}`);
  console.log(`\nNON-ENERGY SURVIVORS (left where they are): ${report.nonEnergySurvivors.length}`);
  for (const v of report.nonEnergySurvivors) console.log(`  ${v.roll.padEnd(10)} ${v.measure.padEnd(14)} ${v.tally.padEnd(8)} ${v.question}`);
  console.log(`\n── STEP 7: independent energy scan over all ${listed} listed rolls ─────────────`);
  console.log(`${scan.length} hit(s); ${scanSurvivors.length} survivor(s) the funnel should also have found`);
  const byDeath = {};
  for (const s of scan) { const k = s.died.split(" — ")[0]; byDeath[k] = (byDeath[k] || 0) + 1; }
  for (const [k, n] of Object.entries(byDeath).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${k}`);
  for (const s of scanSurvivors) console.log(`  SURVIVOR ${s.roll} ${s.measure} ${s.tally} ${s.question}`);
  console.log(`\n── STEP 8: what the four keys already hold ────────────────────────────────`);
  for (const k of KEYS) {
    const s = senateReachable[k];
    console.log(`  ${k}: ${s.measures} measures, ${s.primaryMeasures} PRIMARY`);
    console.log(`     PRIMARY reachable from a Senate roll: ${s.primaryWithASenateRoll.length ? s.primaryWithASenateRoll.join("; ") : "NONE"}`);
    console.log(`     PRIMARY on a House measure the Senate never voted: ${s.housePrimaryWithNoSenateRoll.length}`);
  }
  console.log("\n  acts held on the four keys (yea/nay only, acts / of which PRIMARY):");
  for (const slug of ["lee", "curtis", "bmoore", "jon_husted", "hyde_smith", "alan_armstrong"]) {
    const a = actsBy[slug] || {};
    console.log(`     ${slug.padEnd(15)} ` + KEYS.map((k) => `${k.split("_")[0]} ${a[k] ? `${a[k].acts}/${a[k].primaryActs}` : "0/0"}`).join("  "));
  }
}
