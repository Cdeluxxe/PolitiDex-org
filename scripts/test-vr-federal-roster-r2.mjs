#!/usr/bin/env node
//
// test-vr-federal-roster-r2.mjs — the fence around roster wave federal_roster_r2_sep2026.
//
// WHAT THIS WAVE IS. R1 admitted 315 sitting House members and left a hole it had already
// named. Its arithmetic was "candidates = sitting members MINUS the ones
// db/vr-member-map.json already carries", and it counted 116 in that second group. Those
// 116 were skipped as already-solved, which was true of the MAP and not true of the
// ROSTER: twelve of them had a Bioguide in the map — so their votes resolved, and had
// been resolving for waves — and no row in CMP_DATA at all.
//
// That is the worst of both halves. The ingest attributes real roll-call cells to the pid;
// nothing in the app can name the person those cells belong to.
// scripts/gen-crawl-record.mjs printed the consequence on every run — "12 seeded pid(s)
// are on no roster record and were skipped" — and that line is the wave's whole reason to
// exist. R2 writes twelve identity rows and nothing else.
//
// WHAT THAT MEANS FOR THIS FILE. A roster wave cannot get a tally wrong; it can get a
// PERSON wrong. So:
//
//   1. the twelve exist, exactly once each, and are identity and nothing else
//   2. one person, one current file — including the five surname near-misses this wave
//      deliberately did NOT fold together, and Oklahoma's two current senators
//   3. the crawl record no longer skips them, and the residual is named
//   4. the mullin office correction moved the LABEL and nothing that is judged
//   5. no party word in anything a reader sees; party is a chip, never a sort
//   6. no Direction Match drift and no formal-brief drift — twin boot, HEAD vs this tree
//   7. ship discipline: the cache version moved, the census is current, the sitemap
//      admitted only who the existing floor admits, and the identity wall did not soften
//
// It reads the working tree and the committed seeds. It opens no socket and needs no
// database. Sections 4, 6 and 7 diff against HEAD, so they are meaningful only while the
// wave's diff is uncommitted — the same twin-boot contract R1's harness runs on.
//
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCrawlRecord } from "./gen-crawl-record.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));
const HEAD = (f) => {
  try {
    return execFileSync("git", ["show", `HEAD:${f}`],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  } catch { return null; }
};

const WAVE = "federal_roster_r2_sep2026";
const ROSTER_SIZE = 1120;          // 1108 after R1 + the twelve below
const HOUSE_ADMITTED = 9;
const SENATE_ADMITTED = 3;

const failures = [];
let passed = 0;
const ok = (c, m) => { if (c) { passed++; return true; } failures.push(m); return false; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);

const census = J("db/vr-federal-roster-r2-census.json");
const memberMap = J("db/vr-member-map.json");
const pidAliases = J("db/vr-pid-aliases.json");
const shareIndex = J("db/share-index.json");
const ADM = census.admitted;

// ═══════════════════════════════════════════════════════════════════════════════
section("1 · the twelve exist, exactly once, and are identity and nothing else");
// ═══════════════════════════════════════════════════════════════════════════════
// The scope is asserted before anything is checked against it, because a census that
// quietly shrank its own list would make every count below pass.
eq(census.wave, WAVE, "the census is not this wave's census");
eq(ADM.length, HOUSE_ADMITTED + SENATE_ADMITTED, "the census does not admit twelve people");
eq(census.refused.length, 0,
  "the census records a refusal — the wave shipped twelve rows, so a refusal here means the census and the tree disagree about who was admitted");
eq(ADM.filter((a) => a.chamber === "house").length, HOUSE_ADMITTED, "the House half is not nine");
eq(ADM.filter((a) => a.chamber === "senate").length, SENATE_ADMITTED, "the Senate half is not three");

let CMP = null;
{
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  try { vm.runInContext(R("cmp-data.js"), ctx, { filename: "cmp-data.js" }); }
  catch (e) { failures.push(`cmp-data.js does not boot: ${e.message}`); }
  CMP = win.CMP_DATA || null;
}

if (ok(!!CMP, "CMP_DATA did not boot")) {
  eq(Object.keys(CMP).length, ROSTER_SIZE, "the roster is not the size this wave leaves it");

  // EXACTLY ONE ROW EACH. A roster key cannot literally repeat — an object literal with a
  // duplicate key keeps the last one silently — so "exactly one" is checked the way a
  // reader would hit it: one row under this id, and no OTHER row that is this same person.
  const src = R("cmp-data.js");
  for (const a of ADM) {
    const rec = CMP[a.slug];
    if (!ok(!!rec, `${a.slug} was admitted but has no CMP_DATA row`)) continue;

    const declarations = [...src.matchAll(new RegExp(`^\\s*"${a.slug}"\\s*:\\s*\\{`, "gm"))].length;
    eq(declarations, 1, `${a.slug} is declared ${declarations} time(s) in cmp-data.js — a later ` +
      `duplicate key silently wins and the row a reviewer read is not the row that ships`);

    // IDENTITY AND NOTHING ELSE.
    eq(rec.score, null, `${a.slug}: score is ${JSON.stringify(rec.score)} — nothing has been measured, ` +
      `and a 0 is a claim where null is the absence of one`);
    eq(rec.kept, 0, `${a.slug}: kept is not 0`);
    eq(rec.broken, 0, `${a.slug}: broken is not 0`);
    eq(rec.pending, 0, `${a.slug}: pending is not 0`);
    eq(JSON.stringify(rec.issues), "[]", `${a.slug}: issues is not empty — this wave harvests no stance`);
    ok(!("publishable" in rec), `${a.slug}: a publishable flag was set by hand`);
    for (const k of ["bio", "quote", "tagline", "summary", "promises", "stances", "accountability"]) {
      ok(!(k in rec), `${a.slug}: carries '${k}' — identity only means identity only`);
    }
    // The row's whole field set, so a field nobody argued for cannot arrive unnoticed.
    eq(Object.keys(rec).sort().join(","),
      "broken,icon,issues,kept,name,office,party,pending,score,state",
      `${a.slug}: the row's shape is not the identity-only shape`);

    // THE SEAT, in the form the roster already uses.
    eq(rec.name, a.name, `${a.slug}: the row's name is not the name the census admitted`);
    eq(rec.office, a.chamber === "house" ? "U.S. Representative" : "U.S. Senator",
      `${a.slug}: office is not the roster's one spelling for this chamber`);
    eq(rec.state, a.stateLabel, `${a.slug}: the seat label is not the one the census recorded`);
    if (a.chamber === "house") {
      ok(new RegExp(`^${a.stateFull.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} · ${a.state}-(?:\\d{2}|AL)$`).test(rec.state),
        `${a.slug}: "${rec.state}" is not the "<Full State> · <ST>-<NN>" form a House seat uses`);
      // The federal district lives in `state`, not in `district` — that field is the state
      // legislature's ("SD 19") and no federal row in the roster uses it.
      ok(!("district" in rec), `${a.slug}: carries a 'district' field, which in this roster means a state-legislative seat`);
    } else {
      eq(rec.state, a.stateFull, `${a.slug}: a Senate seat carries the bare state name (see lee, curtis)`);
    }
    ok(!("termEnd" in rec), `${a.slug}: carries termEnd, which marks a FORMER office — these twelve are sitting members`);
  }

  // ── the slug's Bioguide, held in BOTH directions by every source that claims it ──
  // Verifying that A000383 is Alan Armstrong does not verify that `alan_armstrong` points
  // at A000383. Those are different claims and only the second decides where a vote lands.
  const mapBySlug = new Map();
  for (const [bio, slug] of Object.entries(memberMap.map || {})) {
    if (!mapBySlug.has(slug)) mapBySlug.set(slug, []);
    mapBySlug.get(slug).push(bio);
  }
  const seedSrc = R("scripts/vr-gen-member-map.mjs");
  const seedBlock = seedSrc.slice(seedSrc.indexOf("const SEED_SLUGS = {"),
    seedSrc.indexOf("\n};", seedSrc.indexOf("const SEED_SLUGS = {")));
  const SEED = Object.fromEntries([...seedBlock.matchAll(/([a-z0-9_]+):\s*"([A-Z][0-9]+)"/g)].map((m) => [m[1], m[2]]));

  const hub = R("compare-hub.js");
  const photoBlock = hub.slice(hub.indexOf("var BROWSE_PHOTOS = {"), hub.indexOf("\n    };", hub.indexOf("var BROWSE_PHOTOS = {")));
  const PORTRAIT = Object.fromEntries([...photoBlock.matchAll(/([a-z0-9_]+):\s*'(https:\/\/[^']+)'/g)].map((m) => [m[1], m[2]]));
  const portraitBio = (url) =>
    (/\/congress\/450x550\/([A-Z][0-9]+)\.jpg$/.exec(url) || /\/bioguide\/photo\/[A-Z]\/([A-Z][0-9]+)\.jpg$/.exec(url) || [])[1] || null;

  // The allowlist is netlify.toml's, read rather than restated, so a host that leaves the
  // allowlist fails here instead of 404ing in production.
  const toml = R("netlify.toml");
  const allowBlock = toml.slice(toml.indexOf("[images]"));
  // The entries are TOML-escaped regexes — "https://raw\\.githubusercontent\\.com/.*" — so the
  // backslashes come out before the host does.
  const ALLOWED = new Set([...allowBlock.matchAll(/"https:\/\/([a-zA-Z0-9.\\\-]+)\//g)]
    .map((m) => m[1].replace(/\\/g, "")));
  ok(ALLOWED.size > 2, `netlify.toml's [images] remote_images allowlist did not parse (${ALLOWED.size} hosts)`);

  const bioSeen = new Map();
  for (const a of ADM) {
    const claims = { census: a.bioguide, "db/vr-member-map.json": (mapBySlug.get(a.slug) || [])[0] || null };
    if (SEED[a.slug]) claims["SEED_SLUGS"] = SEED[a.slug];
    const url = PORTRAIT[a.slug] || null;
    if (url && portraitBio(url)) claims["BROWSE_PHOTOS portrait"] = portraitBio(url);

    const distinct = [...new Set(Object.values(claims).filter(Boolean))];
    eq(distinct.length, 1, `${a.slug}: its sources name ${distinct.length} different Bioguides — ` +
      Object.entries(claims).map(([k, v]) => `${k}=${v}`).join(", ") +
      ` (a wrong Bioguide re-homes one member's whole voting record and looks fine from both ends)`);
    ok(Object.keys(claims).length >= 2,
      `${a.slug}: only one source asserts its Bioguide, so nothing can contradict it`);

    // The reverse direction: no OTHER slug in the map may hold this Bioguide.
    eq((memberMap.map || {})[a.bioguide], a.slug,
      `db/vr-member-map.json does not resolve ${a.bioguide} to ${a.slug}`);
    const prior = bioSeen.get(a.bioguide);
    ok(!prior, `${prior} and ${a.slug} are pointed at the same person (${a.bioguide})`);
    bioSeen.set(a.bioguide, a.slug);

    // The portrait itself.
    if (ok(!!url, `${a.slug} has no BROWSE_PHOTOS portrait`)) {
      const host = new URL(url).host;
      ok(ALLOWED.has(host), `${a.slug}: portrait host ${host} is not in netlify.toml's remote_images allowlist`);
      eq(a.photo && a.photo.host, host, `${a.slug}: the census recorded a different portrait host`);
    }
  }

  // Verified twice, and the census says by what. A record that names only one document is
  // the single-source position the Kennedy collision came out of.
  for (const a of ADM) {
    ok((a.verifiedBy || []).length >= 3,
      `${a.slug}: the census records ${(a.verifiedBy || []).length} verification source(s)`);
    const chamberDoc = a.chamber === "house" ? "clerk MemberData.xml" : "senate.gov contact roster";
    ok(a.verifiedBy.some((v) => v.startsWith(chamberDoc)), `${a.slug}: no ${chamberDoc} verification recorded`);
    ok(a.verifiedBy.some((v) => v.startsWith("legislators-current")), `${a.slug}: no congress-legislators verification recorded`);
  }

  // The two slugs whose portrait URL carries no Bioguide are the ones asserted by hand and
  // by nothing else, so their SEED_NAMES declaration must still exist (section 7 proves it
  // is still enforced).
  const handOnly = ADM.filter((a) => a.photo && !a.photo.carriesBioguide).map((a) => a.slug).sort();
  eq(handOnly.join(", "), "alan_armstrong, jon_husted",
    "the set of slugs whose Bioguide is asserted only by hand changed — that set drives section 7's identity-wall check");
}

// ═══════════════════════════════════════════════════════════════════════════════
section("2 · one person, one current file — the near-misses stay two people");
// ═══════════════════════════════════════════════════════════════════════════════
// The failure a reader would see: search "Lee" and get two openable current files for one
// senator, or "Armstrong" and get a governor filed as an Oklahoma senator.
if (CMP) {
  // NO DUPLICATE DISTRICT FILE. Every current federal seat on the board, counted, so the
  // check is not scoped to the wave's own rows — a duplicate needs only one of the two
  // files to be new.
  const isCurrent = (rec) => !/former|ex-|candidate|nominee|challenger/i.test(String(rec.office || ""))
    && !rec.termEnd;
  const houseSeats = new Map();
  const senateSeats = new Map();
  for (const [pid, rec] of Object.entries(CMP)) {
    if (!rec || !isCurrent(rec)) continue;
    if (rec.office === "U.S. Representative") {
      const m = /^(.+) · ([A-Z]{2})-(\d{2}|AL)$/.exec(String(rec.state || ""));
      if (!m) continue;
      const key = `${m[2]}-${m[3]}`;
      if (!houseSeats.has(key)) houseSeats.set(key, []);
      houseSeats.get(key).push(pid);
    } else if (rec.office === "U.S. Senator") {
      const key = String(rec.state || "");
      if (!senateSeats.has(key)) senateSeats.set(key, []);
      senateSeats.get(key).push(pid);
    }
  }
  const doubleHouse = [...houseSeats].filter(([, pids]) => pids.length > 1)
    .map(([k, pids]) => `${k}: ${pids.join(" + ")}`);
  eq(doubleHouse.join(" | "), "", "two current files hold one U.S. House district");
  // Not 435: the roster carries a file for the districts it has admitted, not for every
  // seat in the chamber. The number only has to be big enough that a duplicate anywhere in
  // the House would have been seen.
  ok(houseSeats.size > 300, `the House seat sweep was wide enough to mean something (${houseSeats.size} districts)`);

  // A state has two Senate seats, so three current senator files in one state is the
  // Oklahoma defect this wave fixed and the shape it must not come back in.
  const tripleSenate = [...senateSeats].filter(([, pids]) => pids.length > 2)
    .map(([k, pids]) => `${k}: ${pids.join(" + ")}`);
  eq(tripleSenate.join(" | "), "", "a state has more than two current U.S. Senator files");
  const okSen = (senateSeats.get("Oklahoma") || []).sort();
  eq(okSen.join(", "), "alan_armstrong, lankford",
    "Oklahoma's current Senate files are not lankford + armstrong");

  // THE FIVE WRITTEN NON-MERGES. Every pair named in the census is still two files, and no
  // alias was written across any of them — the mike_rogers rule, applied forward.
  eq(census.nonMerges.length, 5, "the census does not record five deliberate non-merges");
  let pairs = 0;
  for (const n of census.nonMerges) {
    ok(!!CMP[n.slug], `${n.slug}: the non-merge names a slug with no row`);
    for (const other of n.notTheSamePersonAs) {
      pairs++;
      ok(!!CMP[other.pid], `${other.pid}: the non-merge names a file that no longer exists — ` +
        `if it was folded away, that is the merge this entry says did not happen`);
      ok(CMP[other.pid] && CMP[other.pid].name !== CMP[n.slug].name || !CMP[other.pid],
        `${n.slug} and ${other.pid} now publish the identical name "${other.name}" — two files under one name is the ` +
        `search failure this record exists to prevent`);
      eq(pidAliases[other.pid], undefined, `db/vr-pid-aliases.json now retires ${other.pid} — this wave writes no alias across people`);
      eq(pidAliases[n.slug], undefined, `db/vr-pid-aliases.json now retires ${n.slug} — this wave writes no alias across people`);
    }
  }
  ok(pairs >= 25, `only ${pairs} near-miss pairs were checked`);

  // The two the brief names by hand, spelled out so a regression names them too.
  eq(CMP.susie_lee && CMP.susie_lee.office, "U.S. Representative", "susie_lee is not on file as a U.S. Representative");
  eq(CMP.lee && CMP.lee.office, "U.S. Senator", "lee (Mike Lee) stopped being a U.S. Senator");
  ok(CMP.kelly_armstrong && !/senator/i.test(String(CMP.kelly_armstrong.office || "")),
    "kelly_armstrong (Gov, ND) is filed as a senator — that is the Armstrong collision");
  eq(CMP.alan_armstrong && CMP.alan_armstrong.state, "Oklahoma", "alan_armstrong is not on file in Oklahoma");

  // One current file per person on the SEARCH surface too, since that is where a reader
  // would meet the duplicate.
  for (const a of ADM) {
    const row = (shareIndex.people || {})[a.slug];
    if (!ok(!!row, `${a.slug} is not in db/share-index.json — re-run scripts/gen-share-index.mjs`)) continue;
    eq(row.n, a.name, `${a.slug}: the share index publishes a different name than the roster`);
    const twins = Object.entries(shareIndex.people)
      .filter(([pid, r]) => pid !== a.slug && r.n === a.name && r.o === row.o && r.s === row.s);
    eq(twins.map(([p]) => p).join(", "), "", `${a.slug}: a second current file publishes the same name, office and seat`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
section("3 · the crawl record no longer skips them, and the residual is named");
// ═══════════════════════════════════════════════════════════════════════════════
// This is the line that justified the wave. It must now be zero, and the twelve must
// actually be reachable — a pid on the roster that the crawl record still cannot read is
// the same defect wearing a name.
{
  const crawl = await buildCrawlRecord(ROOT);
  const stats = crawl.stats || {};
  const seeded = stats.seededOnNoRoster || stats.seededPidsOnNoRoster || stats.skippedSeeded || null;
  if (Array.isArray(seeded)) {
    const still = seeded.filter((s) => ADM.some((a) => a.slug === (s.slug || s)));
    eq(still.length, 0, `the crawl record still lists ${still.length} of the twelve as seeded pids on no roster record`);
    eq(seeded.length, 0, `the crawl record still skips ${seeded.length} seeded pid(s): ` +
      seeded.map((s) => s.slug || s).join(", "));
  } else if (typeof seeded === "number") {
    eq(seeded, 0, "the crawl record still reports seeded pids on no roster record");
  } else {
    // The generator reports this by name; if the stats shape changes, fall back to the
    // claim the line actually makes and check it directly.
    const roster = new Set(Object.keys(CMP || {}));
    const orphans = Object.keys(memberMap.map || {})
      .map((b) => memberMap.map[b])
      .filter((slug) => !roster.has(slug));
    eq([...new Set(orphans)].sort().join(", "), "",
      "db/vr-member-map.json still resolves votes to slug(s) with no roster row — a pid whose votes " +
      "attach and whose person nothing can name is exactly the hole this wave closed");
  }

  // Eleven of the twelve now carry formal lines. alan_armstrong does not, and that is
  // correct rather than tolerated: he was sworn 2026-03-24 and the stored corpus predates
  // him. It is asserted by name so "nobody has any lines" cannot pass as success.
  const withLines = ADM.filter((a) => (crawl.personRecord || {})[a.slug]);
  const without = ADM.filter((a) => !(crawl.personRecord || {})[a.slug]).map((a) => a.slug).sort();
  eq(without.join(", "), "alan_armstrong",
    "the set of admitted members with no formal record changed — eleven had votes waiting for a name, " +
    "and only the senator sworn after the stored corpus should have none");
  eq(withLines.length, 11, "eleven of the twelve should now carry formal-pattern lines");
  for (const a of withLines) {
    const lines = (crawl.personRecord || {})[a.slug];
    ok(Object.keys(lines).length > 0, `${a.slug}: has a crawl record with no lines in it`);
  }

  // And those lines reach the shipped index, which is what the crawler and the person
  // file's pre-JS header actually read.
  for (const a of withLines) {
    ok(!!(shareIndex.personRecord || {})[a.slug],
      `${a.slug} has formal lines but none in db/share-index.json — re-run scripts/gen-share-index.mjs`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
section("4 · the mullin correction moved the label and nothing that is judged");
// ═══════════════════════════════════════════════════════════════════════════════
// Admitting alan_armstrong to Oklahoma's Class II seat made mullin's "U.S. Senator ·
// Oklahoma" label stale, and a stale label on a published file is a claim about who holds a
// seat. Corrected in place on R1's rfine precedent. The risk in an in-place correction is
// that it becomes a rewrite, so this section is mostly about what did NOT move.
{
  const fix = census.labelCorrection;
  if (ok(!!fix, "the census records no mullin label correction")) {
    eq(fix.slug, "mullin", "the label correction is not about mullin");
    eq(fix.isMerge, false, "the census calls the mullin correction a merge");
    eq(fix.isDeletion, false, "the census calls the mullin correction a deletion");
    eq(fix.aliasWritten, false, "the census records an alias written for the mullin correction");
    ok(/rfine/.test(String(fix.precedent || "")), "the census does not cite the rfine precedent");
    ok(/not a merge/i.test(String(fix.reason || "")), "the census's reason does not state that this is not a merge");
  }

  const now = CMP && CMP.mullin;
  const before = (() => {
    const src = HEAD("cmp-data.js");
    if (!src) return null;
    const win = makeSandbox();
    const ctx = vm.createContext(win);
    try { vm.runInContext(src, ctx, { filename: "cmp-data.js" }); } catch { return null; }
    return (win.CMP_DATA || {}).mullin || null;
  })();

  if (ok(!!now, "mullin has no roster row — the correction was supposed to KEEP his file")) {
    eq(now.office, "Former U.S. Senator", "mullin's office was not corrected to the former-office label");
    eq(now.state, "Oklahoma", "mullin's seat label is not the bare state name (the browse tree groups a '·'-joined label by its last segment)");
    eq(now.termStart, "2023-01", "mullin has no termStart, so the tenure pill cannot render 'Served …'");
    eq(now.termEnd, "2026-03", "mullin has no termEnd — that is the field the app reads for a FORMER office");

    // The two flags the app actually reads, exercised rather than assumed.
    const vh = makeSandbox();
    const vctx = vm.createContext(vh);
    try { vm.runInContext(R("voter-hub-location.js"), vctx, { filename: "voter-hub-location.js" }); } catch { /* tolerated */ }
    const status = vh._pdxOfficeStatus || (vh.window && vh.window._pdxOfficeStatus);
    if (ok(typeof status === "function", "_pdxOfficeStatus did not boot, so the incumbent chip could not be exercised")) {
      eq(status(now), "former", "the app still reads mullin as currently in office — the incumbent chip would contradict the roster");
      eq(status(CMP.alan_armstrong), "office", "the app does not read alan_armstrong as currently in office");
      eq(status(CMP.lankford), "office", "the app does not read lankford as currently in office");
    }
    const tenure = vh._pdxTenure || (vh.window && vh.window._pdxTenure);
    if (typeof tenure === "function") {
      const t = tenure(now);
      ok(t && t.current === false, "the tenure model still calls mullin a current officeholder");
    }

    // NOTHING JUDGED MOVED. Read from HEAD, not from the census, so the census cannot
    // vouch for itself.
    if (ok(!!before, "HEAD:cmp-data.js did not boot, so the mullin correction could not be diffed (commit state?)")) {
      for (const k of ["name", "party", "icon", "score", "kept", "broken", "pending"]) {
        eq(JSON.stringify(now[k]), JSON.stringify(before[k]),
          `mullin's ${k} moved — an identity-only office correction touches the label and nothing that is judged`);
      }
      eq(JSON.stringify(now.issues), JSON.stringify(before.issues), "mullin's issue chips moved");
      eq(before.office, "U.S. Senator", "HEAD did not have mullin as a sitting U.S. Senator, so this is not the correction the census describes");
      // Exactly which keys changed, so a field arriving under cover of this fix is named.
      const moved = [...new Set([...Object.keys(before), ...Object.keys(now)])]
        .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(now[k])).sort();
      eq(moved.join(", "), "office, termEnd, termStart", "the mullin correction moved fields beyond the office label and its dates");
    }
  }

  // NOT A MERGE, at the level the ingest reads. Two ids, two Bioguides, no alias.
  eq(pidAliases.mullin, undefined, "db/vr-pid-aliases.json retires mullin — the decision was to KEEP his file, not to alias it");
  eq(pidAliases.alan_armstrong, undefined, "db/vr-pid-aliases.json retires alan_armstrong");
  const stanceMirror = R("stance-helpers.js");
  ok(!/mullin\s*:\s*['"]alan_armstrong/.test(stanceMirror) && !/alan_armstrong\s*:\s*['"]mullin/.test(stanceMirror),
    "the PDX_PID_ALIASES client mirror aliases mullin and alan_armstrong to each other");
  eq((memberMap.map || {}).M001190, "mullin", "db/vr-member-map.json no longer resolves M001190 to mullin — his votes must stay his");
  eq((memberMap.map || {}).A000383, "alan_armstrong", "db/vr-member-map.json does not resolve A000383 to alan_armstrong");
  const mullinMember = (memberMap.members || []).find((m) => m.slug === "mullin" || m.bioguide === "M001190");
  if (mullinMember && "serving119" in mullinMember) {
    eq(mullinMember.serving119, false, "db/vr-member-map.json still has mullin serving in the 119th, so the map and the roster disagree again");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
section("5 · no party word in reader copy; party is a chip, never a sort");
// ═══════════════════════════════════════════════════════════════════════════════
{
  const PARTY = /\b(Republican|Democrat|Democratic|GOP|partisan|bipartisan|left-wing|right-wing|conservative|liberal)\b/i;
  let scanned = 0;
  const scan = (text, where) => {
    scanned++;
    const m = PARTY.exec(String(text || ""));
    ok(!m, `${where} names a party ("${m && m[0]}") — the record is the formal record`);
  };
  if (CMP) for (const a of ADM.concat([{ slug: "mullin" }])) {
    const rec = CMP[a.slug]; if (!rec) continue;
    scan(rec.name, `${a.slug} name`);
    scan(rec.office, `${a.slug} office`);
    scan(rec.state, `${a.slug} state`);
    ok(/^[A-Z](\s*\([A-Z] caucus\))?$/.test(String(rec.party || "")),
      `${a.slug}: party '${rec.party}' is prose, not a chip`);
  }
  // The census is a shipped document too, and it names the parties it verified against.
  // Its PROSE is held to the same rule; the per-person party field is the chip.
  for (const a of ADM) {
    eq(a.party, CMP ? (CMP[a.slug] || {}).party : a.party, `${a.slug}: the census and the roster disagree about the party chip`);
  }
  ok(scanned >= 39, `only ${scanned} reader strings were scanned for party language`);

  // NEVER A SORT, NEVER A SCORE, in the engine files this wave's rows now flow through.
  for (const f of ["compare-hub.js", "consistency.js", "word-action.js", "voting-record.js", "publication-floor.js"]) {
    const src = R(f);
    const bad = [...src.matchAll(/\.sort\([^)]{0,200}\.party\b/g)].map((m) => m[0].slice(0, 60));
    eq(bad.join(" | "), "", `${f} sorts on party`);
    const scored = [...src.matchAll(/(?:score|pct|kept|broken|weight)\s*[-+*/]?=[^;\n]{0,80}\.party\b/g)].map((m) => m[0].slice(0, 60));
    eq(scored.join(" | "), "", `${f} scores on party`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
section("6 · no Direction Match or formal-brief drift — twin boot, HEAD vs this tree");
// ═══════════════════════════════════════════════════════════════════════════════
// This wave writes identity ROWS. It states no position, harvests no stance, moves no floor
// and touches no support_meaning, so every Direction Match input for a person who already
// had one is the same object it was. lee, curtis, bmoore and aaron_bean are named because
// they are the four the brief pins; the sweep runs on everyone HEAD had, because a formula
// that drifted would not have the courtesy to drift only on four.
{
  const PINNED = ["lee", "curtis", "bmoore", "aaron_bean"];
  const FILES = ["cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
    "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
    "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
    "consistency.js", "voting-record.js", "word-action.js", "issue-scope.js"];
  const boot = (get) => {
    const win = makeSandbox();
    const ctx = vm.createContext(win);
    for (const f of FILES) {
      const s = get(f);
      if (s === null) continue;
      try { vm.runInContext(s, ctx, { filename: f }); } catch { /* tolerated, as R1 does */ }
    }
    return win;
  };
  const head = boot(HEAD);
  const work = boot((f) => R(f));

  // ONLY cmp-data.js may differ. A roster wave has no business in the engine.
  const touched = FILES.filter((f) => { const h = HEAD(f); return h !== null && h !== R(f); });
  eq(touched.join(", "), "cmp-data.js",
    "a roster wave changed a booted file other than the roster — identity is the only thing it admits");

  if (ok(!!(head.PDXWordAction && head.PDXWordAction.read), "the pre-wave engine did not boot from HEAD (skipping the sweep)")
    && ok(!!(work.PDXWordAction && work.PDXWordAction.read), "the current engine did not boot")) {
    const PIDS = Object.keys(head.CMP_DATA || {});
    ok(PIDS.length > 1000, `the pre-wave roster booted (${PIDS.length} profiles)`);
    eq(Object.keys(work.CMP_DATA || {}).length, PIDS.length + ADM.length,
      "the roster did not grow by exactly the twelve this wave admits");
    eq(PIDS.filter((p) => !work.CMP_DATA[p]).length, 0, "the wave dropped someone HEAD had");
    // And none of the twelve was already there — an admission of someone who already had a
    // row is how a person gets two files.
    eq(ADM.filter((a) => head.CMP_DATA[a.slug]).map((a) => a.slug).join(", "), "",
      "this wave admitted someone who already had a roster row at HEAD");

    const READ_KEYS = ["pct", "publishable", "word", "testedWeight"];
    const COV_KEYS = ["word", "scorable", "tested", "untested", "issueLinked",
      "notIssueLinked", "recordDerived", "warming"];
    let dm = 0, dmBad = 0;
    for (const pid of PIDS) {
      let a = null, b = null;
      try { a = head.PDXWordAction.read(pid); } catch { continue; }
      try { b = work.PDXWordAction.read(pid); } catch { b = null; }
      if (!a) continue;
      if (!b) { dmBad++; failures.push(`${pid}: Direction Match stopped returning`); continue; }
      dm++;
      for (const k of READ_KEYS) if (b[k] !== a[k]) { dmBad++; failures.push(`${pid}: DM ${k} moved — ${JSON.stringify(a[k])} → ${JSON.stringify(b[k])}`); }
      const ca = a.coverage || {}, cb = b.coverage || {};
      for (const k of COV_KEYS) if (cb[k] !== ca[k]) { dmBad++; failures.push(`${pid}: DM coverage.${k} moved`); }
    }
    ok(dm > 100, `the Direction Match sweep was wide enough to mean something (${dm} profiles)`);
    eq(dmBad, 0, "Direction Match drifted — a roster wave states no position, moves no floor and rescores nobody");

    // THE FOUR THE BRIEF PINS, byte for byte.
    for (const pid of PINNED) {
      const a = head.PDXWordAction.read(pid);
      const b = work.PDXWordAction.read(pid);
      if (!ok(!!a && !!b, `${pid}: Direction Match does not read on both sides`)) continue;
      eq(JSON.stringify(b), JSON.stringify(a), `/p/${pid}: Direction Match is not byte-identical across the wave`);
      const sa = head.PDXWordAction.scopedRead(pid, head.CMP_DATA[pid]);
      const sb = work.PDXWordAction.scopedRead(pid, work.CMP_DATA[pid]);
      if (!ok(!!sa && !!sb, `${pid}: the scoped read does not return on both sides`)) continue;
      eq(JSON.stringify(sb), JSON.stringify(sa), `/p/${pid}: the scoped read moved`);
    }

    // Nobody's judged surface moved, on the whole roster, not just the four.
    let judged = 0;
    for (const pid of PIDS) {
      const a = head.CMP_DATA[pid], b = work.CMP_DATA[pid];
      if (!a || !b) continue;
      if (pid === "mullin") continue;            // section 4 owns this one, field by field
      judged++;
      for (const k of ["score", "kept", "broken", "pending", "issues", "promises"]) {
        if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) {
          failures.push(`${pid}: ${k} moved on a wave that measures nothing`);
        } else passed++;
      }
    }
    ok(judged > 1000, `the judged-surface sweep covered ${judged} pre-wave records`);
  }

  // THE FORMAL BRIEFS, byte for byte, from the shipped index rather than from a re-derivation
  // — db/share-index.json is what the crawler and the pre-JS person header actually read, and
  // HEAD's copy is the pre-wave brief.
  const headIndex = (() => { const s = HEAD("db/share-index.json"); try { return s ? JSON.parse(s) : null; } catch { return null; } })();
  if (ok(!!headIndex, "HEAD:db/share-index.json is unreadable, so the formal briefs could not be diffed")) {
    for (const pid of PINNED) {
      const a = (headIndex.personRecord || {})[pid];
      const b = (shareIndex.personRecord || {})[pid];
      if (!ok(!!a && !!b, `${pid}: no formal brief on one side of the wave`)) continue;
      eq(JSON.stringify(b), JSON.stringify(a), `/p/${pid}: the formal brief is not byte-identical across the wave`);
    }
    // And nobody else's brief moved either.
    const drifted = Object.keys(headIndex.personRecord || {})
      .filter((pid) => JSON.stringify((shareIndex.personRecord || {})[pid]) !== JSON.stringify(headIndex.personRecord[pid]));
    eq(drifted.slice(0, 8).join(", "), "", `${drifted.length} pre-wave formal brief(s) moved on a wave that re-pulled no roll`);
    // The index grew by the eleven who had votes waiting and no name, and by nobody else.
    eq(Object.keys(shareIndex.personRecord || {}).length - Object.keys(headIndex.personRecord || {}).length, 11,
      "the formal-brief index did not grow by exactly the eleven admitted members whose votes were already stored");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
section("7 · ship discipline — cache, census, floor, and the identity wall");
// ═══════════════════════════════════════════════════════════════════════════════
{
  // THE CACHE VERSION. /cmp-data.js is on the precache manifest, so an unbumped edit ships
  // to nobody who has already visited: a warm device would keep a roster with no row for
  // /p/hyde_smith and would still show three sitting senators in Oklahoma.
  const sw = R("sw.js");
  const swHead = HEAD("sw.js");
  const ver = (s) => (/const CACHE_VERSION = '([^']+)'/.exec(s || "") || [])[1] || null;
  ok(/'\/cmp-data\.js'/.test(sw), "cmp-data.js is no longer a precached SHELL_ASSET — if that is deliberate, this check needs rewriting, not deleting");
  if (ok(!!swHead, "HEAD:sw.js is unreadable, so the cache bump could not be checked")) {
    ok(ver(sw) && ver(sw) !== ver(swHead),
      `CACHE_VERSION is still ${ver(sw)} — this wave edits a precached shell asset, so every returning ` +
      `reader would keep the pre-wave roster`);
    // The log's house form is "// vNN - TITLE" with an ASCII hyphen, which
    // scripts/test-vote-chip-outranks-empty.mjs requires by name; an em dash there passes
    // this check and fails that one, so both marks are accepted here and the house form is
    // what actually shipped.
    ok(new RegExp(`^// ${ver(sw)} [-—]`, "m").test(sw), `sw.js has no note explaining what ${ver(sw)} ships`);
  }

  // THE CENSUS IS THE LEDGER, so it must still be what its generator would write.
  try {
    execFileSync("node", ["scripts/vr-federal-roster-r2-census.mjs", "--check"],
      { cwd: ROOT, encoding: "utf8", stdio: "pipe" });
    passed++;
  } catch (e) {
    failures.push("db/vr-federal-roster-r2-census.json is not what its generator would write now — " +
      "re-run scripts/vr-federal-roster-r2-census.mjs (network needed)");
  }
  eq(census.waveApplied, true, "the census does not agree that the wave has been applied to the roster");
  eq(census.rosterSizeAfter, ROSTER_SIZE, "the census's post-wave roster size is not the roster's size");

  // THE FLOOR WAS NOT MOVED BY HAND. The nine House members clear it on the rules that were
  // already there because their votes were already stored; the three senators do not, and
  // saying so is the point — an identity row is not a publication.
  const floorSrc = R("publication-floor.js");
  const floorHead = HEAD("publication-floor.js");
  if (floorHead !== null) eq(floorSrc, floorHead, "publication-floor.js was edited by a wave that is not allowed to move the floor");
  const sitemap = R("sitemap.xml");
  const sitemapHead = HEAD("sitemap.xml");
  if (ok(sitemapHead !== null, "HEAD:sitemap.xml is unreadable, so the sitemap delta could not be checked")) {
    const urls = (s) => new Set([...s.matchAll(/\/p\/([a-z0-9_]+)</g)].map((m) => m[1]));
    const beforeU = urls(sitemapHead), afterU = urls(sitemap);
    const gained = [...afterU].filter((p) => !beforeU.has(p)).sort();
    const lost = [...beforeU].filter((p) => !afterU.has(p)).sort();
    eq(gained.join(", "),
      ADM.filter((a) => a.chamber === "house").map((a) => a.slug).sort().join(", "),
      "the sitemap did not gain exactly the nine House members the existing floor admits");
    eq(lost.join(", "), "", "the sitemap lost an address — this wave publishes, it does not unpublish");
    for (const a of ADM.filter((x) => x.chamber === "senate")) {
      ok(!afterU.has(a.slug), `${a.slug} is in the sitemap — the three senators do not clear the floor, ` +
        `and an identity row must not be enough to publish an address`);
    }
    ok(afterU.has("mullin"), "mullin left the sitemap — the correction was a label fix, not an unpublication");
  }

  // THE IDENTITY WALL DID NOT SOFTEN. Publishing a name for the three SEED_NAMES slugs is
  // exactly what would have turned their strict compare off under the old rule ("app-published
  // name wins; delete the line"), leaving a surname-only test that cannot tell Alan Armstrong
  // (Sen, OK) from Kelly Armstrong (Gov, ND).
  const gen = R("scripts/vr-gen-member-map.mjs");
  const namesBlock = gen.slice(gen.indexOf("const SEED_NAMES = {"), gen.indexOf("\n};", gen.indexOf("const SEED_NAMES = {")));
  const SEED_NAMES = Object.fromEntries([...namesBlock.matchAll(/([a-z0-9_]+):\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]));
  eq(Object.keys(SEED_NAMES).sort().join(", "), "alan_armstrong, hyde_smith, jon_husted",
    "the SEED_NAMES declarations changed — these are the slugs whose Bioguide nothing but a hand-typed table asserts");
  ok(/if \(handDeclared\) \{/.test(gen),
    "checkNamesAgree() no longer runs its strict compare on a hand-declared name — the exact-name branch " +
    "is the only thing that separates Alan Armstrong from Kelly Armstrong");
  ok(!/if \(!names\.has\(slug\)\) \{\s*\n\s*if \(normName\(app\) === normName\(auth\.name\)\)/.test(gen),
    "checkNamesAgree() still gates its strict compare on the app publishing NO name, so R2's twelve rows " +
    "silently downgraded three slugs to a surname-only test");
  ok(/the roster and the hand-declared identity have drifted/.test(gen),
    "checkNamesAgree() no longer cross-checks the app-published name against the hand declaration");
  // The declarations still match the official record the census read.
  for (const [slug, declared] of Object.entries(SEED_NAMES)) {
    const a = ADM.find((x) => x.slug === slug);
    if (!ok(!!a, `SEED_NAMES declares ${slug}, who is not in this wave`)) continue;
    eq(declared, a.officialRecordName, `SEED_NAMES's "${declared}" is not ${slug}'s official-record name`);
    if (CMP) eq((CMP[slug] || {}).name, declared,
      `${slug}: the roster publishes a name the hand declaration does not match`);
  }

  // No new rolls, no new keys, no stance harvest, and nothing in the measure-issue tables.
  const untouched = ["formal-index.js", "db/vr-measure-identity.json", "db/vr-issue-seed.json",
    "db/issue-keys.json", "politician-stances-core.js", "politician-stances-ext.js",
    "db/vr-pid-aliases.json", "db/vr-roster-admitted.json", "db/vr-member-map.json",
    "compare-hub.js", "publication-floor.js", "stance-helpers.js", "alignment-tool.js"];
  for (const f of untouched) {
    const h = HEAD(f);
    if (!ok(h !== null, `${f} is not in HEAD, so "unchanged" could not be checked — if the file moved, fix this list`)) continue;
    eq(R(f), h, `${f} was modified — this wave admits identity and nothing else`);
  }
  // And no migration: this wave writes no SQL. The vote cells it makes readable were
  // already in the database, attributed, waiting for a roster row to name them.
  const migsNow = readdirSync(join(ROOT, "netlify/database/migrations")).filter((f) => f.endsWith(".sql")).sort();
  const migsHead = (() => {
    try {
      return execFileSync("git", ["ls-tree", "--name-only", "HEAD", "netlify/database/migrations/"],
        { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
        .split("\n").filter((l) => l.endsWith(".sql")).map((l) => l.split("/").pop()).sort();
    } catch { return null; }
  })();
  if (migsHead && migsHead.length) {
    eq(migsNow.filter((m) => !migsHead.includes(m)).join(", "), "",
      "this wave added a migration — it re-pulls no roll and writes no cell, so there is nothing for SQL to do");
    eq(migsHead.filter((m) => !migsNow.includes(m)).join(", "), "",
      "an applied migration was deleted or renamed");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.log(`\n  ✗ roster R2: ${failures.length} of ${failures.length + passed} checks failed\n`);
  for (const f of failures.slice(0, 60)) console.log(`    · ${f}`);
  if (failures.length > 60) console.log(`    … and ${failures.length - 60} more`);
  process.exit(1);
}
console.log(`\n  ✓ roster R2: all ${passed} checks passed`);
console.log(`    12 mapped-but-rosterless pids → 12 identity rows (${HOUSE_ADMITTED} House, ${SENATE_ADMITTED} Senate) · ` +
  `roster ${census.rosterSizeBefore} → ${ROSTER_SIZE}`);
console.log(`    ${census.nonMerges.length} written non-merges · 1 label correction (mullin, not a merge) · ` +
  `0 new rolls, 0 new mappings, 0 new keys, 0 stances, 0 floors moved`);
console.log(`    ${HOUSE_ADMITTED} addresses published by the existing floor · 3 senators still below it, by name`);
