#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Identity integrity — one person, one politician_id, one label
// ─────────────────────────────────────────────────────────────────────────────
// THE BUG CLASS THIS EXISTS TO PREVENT
//
// `politician_id` is free text. There is no `politicians` table and no foreign key
// (db/schema.ts) — vr_member_votes.politician_id, vr_positions.politician_id and
// the client's stance/roster keys are four independent strings that happen to
// agree. When they stop agreeing, nothing errors; the person just quietly becomes
// two people, and every depth count, Official Record %, and Say-vs-Do comparison
// is computed on half a record. Two live instances, both found in July 2026:
//
//   1. Sen. Susan Collins existed as BOTH `collins` (the cmp-data roster id and
//      the id carrying her curated stance block) and `susan_collins` (the
//      BROWSE_PHOTOS portrait key, which scripts/vr-gen-member-map.mjs turns into
//      db/vr-member-map.json, which netlify/lib/vr-ingest.ts writes rows under).
//      19 votes landed on one id, 3 on the other, and H.R. 1 Senate roll 372 was
//      recorded under both — double-counted in her own record.
//   2. spotlights-data.js carried a card `{ id: 'kennedy', name: 'John Kennedy',
//      office: 'U.S. Senator · Louisiana' }`. `kennedy` is Rep. Mike Kennedy
//      (R-UT); Sen. John Kennedy is `kennedy_john`. The id was right and the label
//      was wrong, so the card rendered a Louisiana senator's name and office over
//      a Utah representative's stance, and tapping it opened his profile.
//
// Those are two halves of one class: **an id can drift from its label, and a
// person can drift into two ids.** Three files must agree for a merge to hold —
// db/vr-pid-aliases.json (server write + read path), STANCE_ALIASES and
// PDX_PID_ALIASES (both in stance-helpers.js, client side) — and stance-helpers.js
// says so in a comment, which is exactly the kind of promise that rots. This
// harness turns all of it into assertions.
//
//   node scripts/test-identity-integrity.mjs
//
// No database, no network — every source of truth here is a committed file.
// Exit code is non-zero on failure so it can gate CI.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };

// ── Sources of truth ─────────────────────────────────────────────────────────
const aliasFile = JSON.parse(read("db/vr-pid-aliases.json"));
const ALIASES = aliasFile.aliases || {};
const RETIRED = new Set(Object.keys(ALIASES));

// stance-helpers.js is a browser IIFE; run it in a DOM-less sandbox to read the
// two client alias tables as values rather than regexing them out of the source.
function loadStanceHelpers() {
  const noopEl = () => ({ style: {}, textContent: "", setAttribute() {}, appendChild() {} });
  const ctx = {
    console,
    document: {
      readyState: "complete", head: noopEl(), documentElement: noopEl(),
      createElement: noopEl, getElementById: () => null,
      querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
    },
    setTimeout, clearTimeout, JSON, Math, Date,
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  vm.runInContext(read("stance-helpers.js"), vm.createContext(ctx),
    { filename: "stance-helpers.js" });
  return ctx.window;
}
const win = loadStanceHelpers();

// politician-stances.js and spotlights-data.js are plain global assignments; a
// bare sandbox with `window` is enough to get their data out.
function loadGlobal(file, ...names) {
  const ctx = { console, JSON, Math, Date };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  vm.runInContext(read(file), vm.createContext(ctx), { filename: file });
  for (const n of names) if (ctx[n]) return ctx[n];
  return undefined;
}
const STANCES = loadGlobal("politician-stances.js", "ISSUE_STANCE_DATA");
const SPOTLIGHTS = loadGlobal("spotlights-data.js", "SPOTLIGHTS", "PDX_SPOTLIGHTS");
const ROSTER = loadGlobal("cmp-data.js", "CMP_DATA");
const memberMap = JSON.parse(read("db/vr-member-map.json"));

ok(Object.keys(ALIASES).length > 0, "alias file: declares at least one retirement");
ok(STANCES && typeof STANCES === "object", "politician-stances.js: exposed a stance table");
ok(SPOTLIGHTS && typeof SPOTLIGHTS === "object", "spotlights-data.js: exposed spotlight data");
ok(ROSTER && Object.keys(ROSTER || {}).length > 100, "cmp-data.js: exposed the roster index");

// ── 1. The three alias declarations agree ────────────────────────────────────
// A retirement recorded on the server but not the client means the client keeps
// its own cache under the dead id (voting-record.js `_records[id]`) and asks the
// API for a member that no longer has rows. The reverse means the ingest keeps
// writing the dead id. Either direction re-opens the split.
const clientStance = win.STANCE_ALIASES || {};
const clientPid = win.PDX_PID_ALIASES || {};
for (const [retired, canonical] of Object.entries(ALIASES)) {
  ok(clientPid[retired] === canonical,
    `alias parity: PDX_PID_ALIASES must map ${retired} → ${canonical} ` +
    `(got ${JSON.stringify(clientPid[retired])})`);
  ok(clientStance[retired] === canonical,
    `alias parity: STANCE_ALIASES must map ${retired} → ${canonical} ` +
    `(got ${JSON.stringify(clientStance[retired])})`);
}
// PDX_PID_ALIASES is the voting-record mirror of the server file and nothing else;
// STANCE_ALIASES legitimately carries unrelated stance-only bridges, so it is only
// checked in the one direction above.
for (const retired of Object.keys(clientPid)) {
  ok(RETIRED.has(retired),
    `alias parity: PDX_PID_ALIASES carries '${retired}', which db/vr-pid-aliases.json ` +
    `does not retire — add it there or drop it here`);
}
ok(typeof win.PDXCanonicalPid === "function", "client: PDXCanonicalPid() is exported");
for (const [retired, canonical] of Object.entries(ALIASES))
  ok(win.PDXCanonicalPid(retired) === canonical,
    `client: PDXCanonicalPid('${retired}') resolves to '${canonical}'`);
ok(win.PDXCanonicalPid("collins") === "collins",
  "client: PDXCanonicalPid() is the identity on a canonical id");
ok(win.PDXCanonicalPid(undefined) === undefined,
  "client: PDXCanonicalPid() passes a falsy id through untouched");

// ── 2. Aliases terminate, and never point at another alias ───────────────────
for (const [retired, canonical] of Object.entries(ALIASES)) {
  ok(retired !== canonical, `alias shape: ${retired} may not alias to itself`);
  ok(!RETIRED.has(canonical),
    `alias shape: ${retired} → ${canonical}, but ${canonical} is itself retired — ` +
    `canonicalization is a single hop, so chains silently resolve to a dead id`);
}

// ── 3. No committed data still uses a retired id ─────────────────────────────
// The migration re-keys the rows that exist. If a committed file still names the
// retired id, the next ingest or the next seed re-creates it.
for (const retired of RETIRED) {
  ok(!(retired in (STANCES || {})),
    `retired id: politician-stances.js still has a '${retired}' block — fold it into ` +
    `'${ALIASES[retired]}' (then re-run scripts/split-stances.mjs)`);
  ok(!Object.values(memberMap.map || {}).includes(retired),
    `retired id: db/vr-member-map.json still maps a bioguide to '${retired}' — the ingest ` +
    `would write rows under it again`);
  ok(!(memberMap.members || []).some((m) => m.slug === retired),
    `retired id: db/vr-member-map.json members[] still lists slug '${retired}'`);
}

// ── 4. Spotlight cards point at real, canonical ids ──────────────────────────
// Walk every nested array in spotlights-data.js and collect card-shaped objects.
//
// A card is identified by `id` plus ONE of the two ways a group states a position:
// `topic` (the usual form — findStance() looks the string up in the stance block) or
// `posText` (the position written inline on the card). Requiring `topic` alone was a
// real gap: the retired `kennedy_rfk` id shipped a posText-only card in the MAHA
// spotlight, and this harness could not see it, so sections 4–6 said the merge was
// clean while a retired id was still on screen. Keying off either field closes that.
const cards = [];
(function walk(node) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { for (const v of node) walk(v); return; }
  if (typeof node.id === "string" &&
      (typeof node.topic === "string" || typeof node.posText === "string")) cards.push(node);
  for (const v of Object.values(node)) walk(v);
})(SPOTLIGHTS);
ok(cards.length > 0, "spotlights: found politician cards to check");
// The gap above is only closed while posText-only cards are actually reaching this
// list — assert that rather than trusting the walk.
ok(cards.some((c) => typeof c.topic !== "string" && typeof c.posText === "string"),
  "spotlights: the card walk must also collect posText-only cards (no `topic` field)");
const cardWhat = (c) => c.topic || (c.posText ? String(c.posText).slice(0, 60) + "…" : "(no position)");

for (const c of cards)
  ok(!RETIRED.has(c.id),
    `spotlight: card '${c.name || c.id}' / '${cardWhat(c)}' uses retired id '${c.id}' — ` +
    `re-key it to '${ALIASES[c.id]}'`);

// ── 5. Every spotlight card resolves to a person the app knows ───────────────
// A card whose id appears in neither the roster (cmp-data.js) nor the stance table
// is an orphan: recFor() returns nothing, so nameFor()/officeFor()/iconFor() fall
// back to the card literal, findStance() returns null, and tapping it navigates to
// a profile that does not exist.
//
// Deliberately NOT checked: that `card.topic` matches a stance topic exactly.
// findStance() (index.html) tries the topic string first and then falls back to the
// group's communityIssueKeys, returning null when neither hits — which renders an
// honest "No Clear Position" rather than anything broken. Requiring an exact topic
// match would fail hundreds of intentionally-worded cards.
let idChecked = 0;
for (const c of cards) {
  const known = (ROSTER && ROSTER[c.id]) || (STANCES && STANCES[c.id]);
  idChecked++;
  ok(!!known,
    `orphan card: spotlight '${c.name || c.id}' / '${cardWhat(c)}' uses id '${c.id}', which is in ` +
    `neither cmp-data.js nor politician-stances.js — it can never resolve a profile`);
}
ok(idChecked > 0, "spotlights: at least one card id was resolved");

// ── 6. A card's label may not contradict the roster ──────────────────────────
// The stale-Kennedy bug in plain form. nameFor()/officeFor() prefer the roster
// record over the card literal, so a card can name the wrong person for a long
// time without anyone seeing it on screen — but search, sharing, and any surface
// that reads the card directly still show the bad label.
//
// Deliberately NOT checked: the exact office wording. Spotlight groups vary it on
// purpose to give each card its own context ("Senate Budget Chair · Rhode Island"
// in one group, "Senate EPW Ranking Member · Rhode Island" in another), and both
// are true. What cannot vary is the STATE and the CHAMBER — those are facts about
// the person, and getting either wrong means the card is about someone else.
const STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina",
  "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
  "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
];
// Longest-first so "West Virginia" is never read as "Virginia". A state name that
// is part of a locality ("Washington County Commissioner · Utah") names a place
// inside another state, not the state itself, so it is not a state reference.
const STATES_BY_LENGTH = [...STATES].sort((a, b) => b.length - a.length);
function statesIn(s) {
  const t = s || "";
  return STATES_BY_LENGTH.filter((st) => {
    const i = t.indexOf(st);
    if (i === -1) return false;
    return !/^\s+(County|Parish|Borough|City|Township|District)\b/.test(t.slice(i + st.length));
  });
}

// Chamber from free text. Returns null when the string names neither or both — an
// unknown is skipped rather than guessed, because a wrong guess here is a false
// failure and false failures get harnesses switched off.
function chamberIn(s) {
  const t = s || "";
  const senate = /\bSenator\b|\bSenate\b/.test(t);
  const house = /\bRepresentative\b|\bHouse\b|\bCongress(?:man|woman)\b/.test(t);
  if (senate === house) return null;
  return senate ? "senate" : "house";
}
// Past or prospective offices legitimately disagree with the current roster row
// (a former House member running for Senate is both things at different times).
const timeQualified = (s) => /\bFormer\b|\bcandidate\b|\bNominee\b|\bElect\b/i.test(s || "");

let labelChecked = 0;
for (const c of cards) {
  const rec = ROSTER && ROSTER[c.id];
  if (!rec || timeQualified(c.office) || timeQualified(rec.office)) continue;
  labelChecked++;

  // A card may legitimately name more than one state ("Washington County
  // Commissioner · Utah"); the roster's state only has to be one of them.
  const cardStates = statesIn(c.office);
  const rosterState = statesIn(rec.state)[0] || statesIn(rec.office)[0] || null;
  if (cardStates.length && rosterState)
    ok(cardStates.includes(rosterState),
      `label vs roster: spotlight card '${c.name || c.id}' / '${cardWhat(c)}' places id '${c.id}' ` +
      `in ${cardStates.join("/")}, but the roster has ${rosterState} — the card is about ` +
      `someone else`);

  const cardChamber = chamberIn(c.office);
  const rosterChamber = chamberIn(rec.office);
  if (cardChamber && rosterChamber)
    ok(cardChamber === rosterChamber,
      `label vs roster: spotlight card '${c.name || c.id}' / '${cardWhat(c)}' calls id '${c.id}' ` +
      `${cardChamber}, but the roster has ${rosterChamber}`);

  // Surnames must match. First names vary by usage ("J.D." / "JD", "Mike" /
  // "Michael"), so only the last token is compared.
  const surname = (n) => (n || "").trim().split(/\s+/).pop().replace(/[.,]/g, "").toLowerCase();
  if (c.name && rec.name)
    ok(surname(c.name) === surname(rec.name),
      `label vs roster: spotlight card names id '${c.id}' '${c.name}', roster says '${rec.name}'`);
}
ok(labelChecked > 0, "spotlights: at least one card was label-checked against the roster");

// ── 7. No duplicate topic strings inside a merged stance block ──────────────
// findStance() returns the FIRST topic match (index.html), so a repeated topic
// makes the later card unreachable — the specific way a careless merge loses
// content, since both blocks tend to cover the same ground under the same wording.
//
// Hard failure is scoped to the ids a merge has actually written to. The wider
// corpus has pre-existing duplicates that predate this harness and are a separate
// clean-up; they are reported below so they don't stay invisible, but they do not
// gate CI, because a guard that fails on unrelated debt gets switched off.
const MERGE_TARGETS = new Set(Object.values(ALIASES));
const dupeTopics = [];
for (const [pid, block] of Object.entries(STANCES || {})) {
  if (!Array.isArray(block)) continue;
  const topics = block.map((s) => s && s.topic).filter(Boolean);
  const dupes = [...new Set(topics.filter((t, i) => topics.indexOf(t) !== i))];
  if (!dupes.length) continue;
  dupeTopics.push({ pid, dupes });
  if (MERGE_TARGETS.has(pid))
    failures.push(
      `merged block: '${pid}' repeats topic ${JSON.stringify(dupes)} — findStance() only ever ` +
      `returns the first, so the merge silently dropped the later card`);
}
for (const pid of MERGE_TARGETS)
  ok(Array.isArray((STANCES || {})[pid]) && STANCES[pid].length > 0,
    `merged block: '${pid}' is the canonical id of a merge but has no stance block — the ` +
    `retired id's curated content was dropped instead of folded in`);

// ── 8. Every retirement records how the merge was actually done ─────────────
// The alias file is a read-path safety net, not the merge itself. A retirement whose
// rows are still split in the database leaves the depth counts halved, and the alias
// only hides that on ids the client happens to ask about — so the note has to say
// where the row-level merge happened, and it has to be auditable.
//
// Two legitimate forms:
//   • a migration filename — the normal case, where the id held vr_* rows;
//   • an explicit "no DB rows" statement — a person who never had any (a cabinet
//     officer casts no roll calls, so the split was purely curated content). There
//     is no migration to name because there was nothing in the database to move;
//     demanding one would only invite a no-op migration written to satisfy a test.
// The note must state which, in a form a reader can check against the branch DB.
const note = aliasFile.notes || {};
const NAMES_MIGRATION = /migrations\/\d+.*\.sql/;
const NO_DB_ROWS = /\bno\b[^.]{0,20}\bdb rows\b/i;
for (const retired of RETIRED)
  ok(typeof note[retired] === "string" &&
     (NAMES_MIGRATION.test(note[retired]) || NO_DB_ROWS.test(note[retired])),
    `provenance: db/vr-pid-aliases.json notes['${retired}'] must either name the migration ` +
    `that merged it, or state that it held no DB rows, so the merge can be audited`);

// ── report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ identity integrity: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  ✗ " + f);
  console.error("");
  process.exit(1);
}
console.log(`✓ identity integrity: all ${passed} assertions passed`);
console.log(`  ${RETIRED.size} retired id(s) [${[...RETIRED].join(", ")}] · ` +
  `${Object.keys(STANCES || {}).length} stance blocks · ${cards.length} spotlight cards ` +
  `(${idChecked} id-resolved, ${labelChecked} label-checked vs roster)`);
if (dupeTopics.length) {
  console.log(`  note: ${dupeTopics.length} stance block(s) repeat a topic string, so the later ` +
    `card is unreachable via findStance() — pre-existing, not merge-related:`);
  for (const { pid, dupes } of dupeTopics) console.log(`    · ${pid}: ${dupes.join(", ")}`);
}
