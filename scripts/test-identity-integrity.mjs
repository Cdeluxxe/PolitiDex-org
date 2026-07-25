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
//
// politician-stances.js is loaded into the SAME sandbox first, because that is how
// the page loads them and because _resolveStanceList() reads ISSUE_STANCE_DATA as a
// bare global — without it the resolver short-circuits to null and section 7 would
// be testing nothing.
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
  const sandbox = vm.createContext(ctx);
  vm.runInContext(read("politician-stances.js"), sandbox,
    { filename: "politician-stances.js" });
  vm.runInContext(read("stance-helpers.js"), sandbox,
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
// Read the stance table off the helpers sandbox, which now loads it: that way the
// table this file inspects is the SAME object _resolveStanceList() resolves against,
// so a resolved block can be identified by reference rather than by guesswork.
const STANCES = win.ISSUE_STANCE_DATA || loadGlobal("politician-stances.js", "ISSUE_STANCE_DATA");
const SPOTLIGHTS = loadGlobal("spotlights-data.js", "SPOTLIGHTS", "PDX_SPOTLIGHTS");
const ROSTER = loadGlobal("cmp-data.js", "CMP_DATA");
const memberMap = JSON.parse(read("db/vr-member-map.json"));

// index.html is a single 60k-line document, not a module, so a table declared in it
// is lifted out by brace-matching from its declaration and evaluated on its own.
// Shared by ACCT_ALIAS below and by the Utah map invariants in section 10.
const INDEX_HTML = read("index.html");
function liftObjectLiteral(decl, label) {
  const start = INDEX_HTML.indexOf(decl);
  if (start === -1) return null;
  const open = INDEX_HTML.indexOf("{", start);
  if (open === -1) return null;
  let depth = 0, end = -1;
  for (let i = open; i < INDEX_HTML.length; i++) {
    const ch = INDEX_HTML[i];
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return null;
  const ctx = { JSON };
  ctx.window = ctx; ctx.globalThis = ctx;
  try {
    return vm.runInContext(`(${INDEX_HTML.slice(open, end + 1)})`, vm.createContext(ctx),
      { filename: `index.html:${label}` });
  } catch { return null; }
}

// ── ACCT_ALIAS — the third client alias table, and the one that hid a real bug ──
// index.html declares `window.ACCT_ALIAS`: CMP_DATA/browse-directory pid → the
// curated Spotlight key for the same person. Many Utah legislators deliberately
// carry two ids — a browse pid (`ray_ward`, `brady_brammer`, `dmccay`) and a
// curated pid (`rward`, `brammer_s21`, `mccay_s11`) — and this table is the bridge.
// The browse-layer partner usually has NO cmp-data.js record, so section 6's
// `ROSTER[card.id]` lookup missed every card keyed on one: Ray Ward's card said
// "Utah State Senator" while the roster said Representative, and this harness
// reported 5,415 passing assertions anyway. Following the alias closes that hole.
const ACCT_ALIAS = liftObjectLiteral("window.ACCT_ALIAS = window.ACCT_ALIAS ||", "ACCT_ALIAS") || {};

ok(Object.keys(ALIASES).length > 0, "alias file: declares at least one retirement");
ok(STANCES && typeof STANCES === "object", "politician-stances.js: exposed a stance table");
ok(SPOTLIGHTS && typeof SPOTLIGHTS === "object", "spotlights-data.js: exposed spotlight data");
ok(ROSTER && Object.keys(ROSTER || {}).length > 100, "cmp-data.js: exposed the roster index");
// If the declaration is ever renamed, the extraction above silently yields {} and
// section 6 quietly narrows back to its pre-fix coverage. Assert the table loaded,
// and assert a known bridge resolves, so the failure is loud instead.
ok(Object.keys(ACCT_ALIAS).length > 0,
  "index.html: window.ACCT_ALIAS was extracted (section 6 needs it to follow browse → curated ids)");
ok(ACCT_ALIAS.ray_ward === "rward",
  "index.html: ACCT_ALIAS still bridges 'ray_ward' → 'rward' (the mismatch this check exists for)");


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
//
// An explicit past year range is the same claim in a different grammar: a card
// labelled "Utah House 2019–2024" is describing Sen. Brady Brammer's House tenure,
// not asserting he sits in the House now. Treating the range as time-qualifying is
// what lets a card be honestly dated instead of flat-swapped to his current title.
const YEAR_RANGE = /\b(?:1[89]|20)\d{2}\s*[–—-]\s*(?:(?:1[89]|20)\d{2}|present)\b/i;
const timeQualified = (s) =>
  /\bFormer\b|\bcandidate\b|\bNominee\b|\bElect\b/i.test(s || "") || YEAR_RANGE.test(s || "");

// Card id → roster record, following ACCT_ALIAS the way index.html does. A card
// keyed on a browse-directory pid (`ray_ward`) has no cmp-data.js record of its
// own; its curated partner (`rward`) does, and that is the record the app renders
// and therefore the record the label must agree with.
const rosterFor = (id) =>
  (ROSTER && (ROSTER[id] || (ACCT_ALIAS[id] && ROSTER[ACCT_ALIAS[id]]))) || null;

let labelChecked = 0;
let aliasResolved = 0;
for (const c of cards) {
  const rec = rosterFor(c.id);
  if (!rec || timeQualified(c.office) || timeQualified(rec.office)) continue;
  labelChecked++;
  if (ROSTER && !ROSTER[c.id]) aliasResolved++;

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
// Coverage assertion, not a data assertion: if this drops to zero the ACCT_ALIAS
// fall-through has stopped reaching any card and the Ray Ward hole has reopened.
ok(aliasResolved > 0,
  "spotlights: at least one card was label-checked via ACCT_ALIAS (browse pid → curated roster record)");

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
// Resolve the way the app does, not by assuming the block key equals the id.
// ISSUE_STANCE_DATA is keyed by the roster id for most officials but by a
// display-name slug for a large set of state legislators (`kirk_cullimore`,
// `mike_mckell`, `daniel_mccay` …), with STANCE_ALIASES and the name-slug fallback
// in _resolveStanceList() bridging the two. Keying off STANCES[pid] outright would
// fail a correct merge onto one of those ids — and, worse, would push the fix toward
// renaming the block instead of wiring the bridge.
const resolveBlock = (pid) => (typeof win._resolveStanceList === "function"
  ? win._resolveStanceList(pid, (ROSTER || {})[pid])
  : (STANCES || {})[pid]);
ok(Array.isArray(resolveBlock(Object.values(ALIASES)[0])),
  "resolver: _resolveStanceList() must resolve a real block inside the sandbox — if it " +
  "returns null for every id, section 7 is vacuously green");
// The ISSUE_STANCE_DATA key each canonical id lands on, so the duplicate-topic hard
// failure below follows the merge even when the block is keyed by name slug.
const MERGED_BLOCK_KEYS = new Set();
for (const pid of MERGE_TARGETS) {
  const block = resolveBlock(pid);
  if (!Array.isArray(block)) continue;
  for (const [key, val] of Object.entries(STANCES || {}))
    if (val === block) MERGED_BLOCK_KEYS.add(key);
}
const dupeTopics = [];
for (const [pid, block] of Object.entries(STANCES || {})) {
  if (!Array.isArray(block)) continue;
  const topics = block.map((s) => s && s.topic).filter(Boolean);
  const dupes = [...new Set(topics.filter((t, i) => topics.indexOf(t) !== i))];
  if (!dupes.length) continue;
  dupeTopics.push({ pid, dupes });
  if (MERGE_TARGETS.has(pid) || MERGED_BLOCK_KEYS.has(pid))
    failures.push(
      `merged block: '${pid}' repeats topic ${JSON.stringify(dupes)} — findStance() only ever ` +
      `returns the first, so the merge silently dropped the later card`);
}
for (const pid of MERGE_TARGETS) {
  const block = resolveBlock(pid);
  ok(Array.isArray(block) && block.length > 0,
    `merged block: '${pid}' is the canonical id of a merge but resolves no stance block — the ` +
    `retired id's curated content was dropped instead of folded in (a name-slug block needs a ` +
    `STANCE_ALIASES bridge or a roster record whose name slugifies to the block key)`);
}

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

// ── 9. No two live roster ids claim the same person ─────────────────────────
// The generator of this whole class of bug, caught at the source instead of by an
// ad-hoc sweep. Two cmp-data.js records with the same display name are two search
// results, two scores, two offices and two profiles for one human being — which is
// exactly how `susan_collins`/`collins`, `kennedy_rfk`/`rfkjr` and
// `kcullimore`/`cullimore_s19` each shipped. Retired ids are excluded (they are
// supposed to be gone from the roster, which section 3's siblings cover) and so is
// an already-declared canonical/retired pair.
//
// Deliberately name-based rather than fuzzy: a surname-similarity check flags real
// relatives who both hold office (Utah alone has several), and a guard that cries
// wolf gets muted. Exact same name is the signal that is almost never legitimate —
// and when it IS legitimate (two officials genuinely sharing a name), the fix is to
// make the roster labels distinguish them, which is what the app needs anyway.
const byName = new Map();
for (const [id, rec] of Object.entries(ROSTER || {})) {
  if (!rec || typeof rec.name !== "string" || RETIRED.has(id)) continue;
  const key = rec.name.toLowerCase().replace(/[^a-z]+/g, " ").trim();
  if (!key) continue;
  if (!byName.has(key)) byName.set(key, []);
  byName.get(key).push(id);
}
let nameChecked = 0;
for (const [key, ids] of byName) {
  if (ids.length < 2) continue;
  nameChecked++;
  const detail = ids.map((i) => `${i} ("${ROSTER[i].office} / ${ROSTER[i].state}")`).join(" vs ");
  failures.push(
    `duplicate identity: ${ids.length} live roster ids share the name "${key}" — ${detail}. ` +
    `If it is one person, merge them and record the retirement in db/vr-pid-aliases.json; if ` +
    `they are genuinely different people, make the roster names distinguish them (e.g. a ` +
    `"Jr."/"Sr." suffix) so search, comparison and My Team cannot conflate them`);
}
ok(byName.size > 100,
  "duplicate identity: the roster name index must actually be populated, or this check is " +
  "vacuously green");

// ── 10. The Utah district maps may not disagree with each other ─────────────
// Section 9 catches one person becoming two ids. This catches the mirror image:
// one id being placed in two contradictory seats by two tables that nothing ever
// compared. index.html carries four independent Utah legislature maps —
//
//   _UTAH_SENATE_INFO          pid → { d: district, c: county }  (sitting senators)
//   _UTAH_SENATE_COUNTY        district → county                 (by-number fallback)
//   KR_STATE_SENATE_INCUMBENTS district → pid                    (Key Races wiring)
//   KR_STATE_HOUSE_INCUMBENTS  district → pid                    (House equivalent)
//
// — and until July 2026 nothing asserted they agreed. All three bug classes below
// were live at once, and the suite was fully green:
//
//   1. KR_STATE_SENATE_INCUMBENTS[22] pointed at `brammer_s21`, whose
//      _UTAH_SENATE_INFO district is 21; [24] pointed at `kgrover`, whose district
//      is 23. Senate President Stuart Adams was in neither map. Root cause: Utah's
//      post-2020 redistricting renumbered many seats, several ids still encode the
//      OLD number in their suffix (`mccay_s11` sits in District 18,
//      `lincoln_fillmore_s11` in District 17), and the maps were keyed off the
//      suffix rather than the district.
//   2. `rward` (Ray Ward, a HOUSE member) sat in _UTAH_SENATE_INFO at d:19 while
//      also being the House incumbent for district 19 — one person, both chambers.
//   3. `bwilson` (Brad Wilson, House Speaker, resigned Nov 2023, never a senator)
//      and `cbramble` (Curt Bramble, retired Dec 2024) were both still listed as
//      sitting senators, Bramble at a district a sitting senator now holds.
//
// Assertion strategy is deliberately ONE-DIRECTIONAL for the info↔incumbent link.
// Seven incumbent ids (`chris_wilson_s2`, `fillerup_s3`, `jen_plumb_s9`,
// `lincoln_fillmore_s11`, `ron_winterton_s20`, `hinkins_s26`, `derrin_owens_s27`)
// have no _UTAH_SENATE_INFO entry AND no cmp-data.js record. Requiring the reverse
// direction would fail on that pre-existing debt on day one, and a guard that fails
// for reasons the reader can't act on is a guard that gets commented out. They are
// reported as a note instead, so the debt is visible without being fatal.
const SENATE_INFO = liftObjectLiteral("var _UTAH_SENATE_INFO = {", "_UTAH_SENATE_INFO");
const SENATE_COUNTY = liftObjectLiteral("var _UTAH_SENATE_COUNTY = {", "_UTAH_SENATE_COUNTY");
const SENATE_INC = liftObjectLiteral("var KR_STATE_SENATE_INCUMBENTS = {", "KR_STATE_SENATE_INCUMBENTS");
const HOUSE_INC = liftObjectLiteral("var KR_STATE_HOUSE_INCUMBENTS = {", "KR_STATE_HOUSE_INCUMBENTS");

// A failed lift yields null, which would make every check below vacuously true —
// the exact failure mode this harness exists to prevent. Assert the extraction
// first, and gate the rest on it, so a renamed declaration is loud.
ok(SENATE_INFO && Object.keys(SENATE_INFO).length > 5,
  "utah maps: _UTAH_SENATE_INFO was extracted from index.html (renamed or moved?)");
ok(SENATE_COUNTY && Object.keys(SENATE_COUNTY).length > 20,
  "utah maps: _UTAH_SENATE_COUNTY was extracted from index.html (renamed or moved?)");
ok(SENATE_INC && Object.keys(SENATE_INC).length > 10,
  "utah maps: KR_STATE_SENATE_INCUMBENTS was extracted from index.html (renamed or moved?)");
ok(HOUSE_INC && Object.keys(HOUSE_INC).length > 10,
  "utah maps: KR_STATE_HOUSE_INCUMBENTS was extracted from index.html (renamed or moved?)");

const orphanIncumbents = [];   // incumbent ids with no _UTAH_SENATE_INFO entry (note only)
let infoChecked = 0, countyChecked = 0, chamberChecked = 0;

if (SENATE_INFO && SENATE_COUNTY && SENATE_INC && HOUSE_INC) {
  // ── 10a. Info → Incumbent agreement ──────────────────────────────────────
  // The bug in class 1, stated directly: the person the info map places in
  // district N must be the person the Key Races wiring calls district N's
  // incumbent. `_krGenericRace()` and the INC.state_senator lookup both read
  // KR_STATE_SENATE_INCUMBENTS, while the browse tree's "District N (County)"
  // label reads _UTAH_SENATE_INFO — so a disagreement shows one senator's name
  // over another senator's seat, with nothing erroring.
  for (const [pid, info] of Object.entries(SENATE_INFO)) {
    infoChecked++;
    const at = SENATE_INC[info.d];
    ok(at === pid,
      `utah maps: _UTAH_SENATE_INFO puts '${pid}' in Senate district ${info.d}, but ` +
      `KR_STATE_SENATE_INCUMBENTS[${info.d}] is ${at === undefined ? "absent" : `'${at}'`} — ` +
      `the browse tree and the Key Races wiring would name different senators for the same ` +
      `seat. Note that several ids encode a PRE-2023 district in their suffix, so key off ` +
      `_UTAH_SENATE_INFO[pid].d, never the suffix`);
  }

  // ── 10b. County consistency where both tables carry one ───────────────────
  // _UTAH_SENATE_COUNTY is the by-number fallback consulted for any senator NOT
  // in _UTAH_SENATE_INFO (both in the district label at _getPoliticianDistrict-
  // OrCounty and in the county-relevance matcher). When the two tables disagree
  // about the same district, which county a person appears under depends on
  // which code path reached them first.
  for (const [pid, info] of Object.entries(SENATE_INFO)) {
    if (!info.c || !SENATE_COUNTY[info.d]) continue;
    countyChecked++;
    ok(info.c === SENATE_COUNTY[info.d],
      `utah maps: _UTAH_SENATE_INFO['${pid}'] says district ${info.d} is in ${info.c}, but ` +
      `_UTAH_SENATE_COUNTY[${info.d}] says ${SENATE_COUNTY[info.d]} — the label path and the ` +
      `county-relevance matcher would place the same seat in two different counties`);
  }

  // ── 10c. No pid in both chambers' incumbent maps ───────────────────────────
  // The Ray Ward class, mechanically. One person cannot hold a House seat and a
  // Senate seat, so this fires whether the chamber was mislabelled or the pid was
  // simply copied into the wrong table.
  const houseByPid = new Map();
  for (const [d, pid] of Object.entries(HOUSE_INC)) if (pid) houseByPid.set(pid, d);
  for (const [d, pid] of Object.entries(SENATE_INC)) {
    if (!pid) continue;
    chamberChecked++;
    ok(!houseByPid.has(pid),
      `utah maps: '${pid}' is the incumbent for Senate district ${d} AND House district ` +
      `${houseByPid.get(pid)} — one person cannot sit in both chambers. Decide the real ` +
      `chamber and remove the other entry (this is how Ray Ward stayed a "senator")`);
  }

  // ── 10d. Nobody former, retired, or non-senate in the sitting Senate map ───
  // The Brad Wilson / Curt Bramble class, mechanically. _UTAH_SENATE_INFO is
  // documented as SITTING senators only; a former member in it occupies a district
  // that a current senator holds, and the browse tree renders them as that seat.
  // Ids with no cmp-data.js record are skipped, not failed — some sitting senators
  // are legitimately browse-directory-only, and there is no roster claim to check.
  for (const [pid, info] of Object.entries(SENATE_INFO)) {
    const rec = ROSTER && ROSTER[pid];
    if (!rec) continue;
    const office = rec.office || "";
    ok(/senat/i.test(office),
      `utah maps: _UTAH_SENATE_INFO lists '${pid}' as the sitting senator for district ` +
      `${info.d}, but the roster office is "${office}" — this map is Senate-only`);
    ok(!/former/i.test(office),
      `utah maps: _UTAH_SENATE_INFO lists '${pid}' at district ${info.d}, but the roster ` +
      `office is "${office}" — a FORMER member occupies a seat a sitting senator holds; ` +
      `move them out of this map (their curated record stays)`);
    ok(!rec.termEnd,
      `utah maps: _UTAH_SENATE_INFO lists '${pid}' at district ${info.d}, but the roster ` +
      `carries termEnd "${rec.termEnd}" — a present termEnd marks a FORMER office, so they ` +
      `are not a sitting senator`);
  }

  // ── 10e. Non-fatal: incumbent ids the info map does not know ───────────────
  for (const [d, pid] of Object.entries(SENATE_INC)) {
    if (!pid || SENATE_INFO[pid]) continue;
    orphanIncumbents.push({ d, pid, hasRoster: !!(ROSTER && ROSTER[pid]) });
  }
}
ok(infoChecked > 0, "utah maps: at least one _UTAH_SENATE_INFO entry was checked");
ok(chamberChecked > 0, "utah maps: at least one Senate incumbent was cross-chamber checked");
ok(countyChecked > 0, "utah maps: at least one district county was cross-checked");

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
  `(${idChecked} id-resolved, ${labelChecked} label-checked vs roster) · ` +
  `${byName.size} distinct roster names, ${nameChecked} shared by 2+ live ids`);
console.log(`  utah maps: ${infoChecked} sitting senator(s) cross-checked against ` +
  `KR_STATE_SENATE_INCUMBENTS · ${countyChecked} district counties agree · ` +
  `${chamberChecked} Senate incumbent(s) checked for a House collision`);
if (orphanIncumbents.length) {
  const rosterless = orphanIncumbents.filter((o) => !o.hasRoster).length;
  console.log(`  note: ${orphanIncumbents.length} Senate incumbent id(s) have no ` +
    `_UTAH_SENATE_INFO entry, so their district and county are unverified — ` +
    `${rosterless} of them also have no cmp-data.js record. Pre-existing debt; the ` +
    `info→incumbent assertion is one-directional until it is paid down:`);
  for (const { d, pid, hasRoster } of orphanIncumbents)
    console.log(`    · district ${d}: ${pid}${hasRoster ? "" : " (no roster record)"}`);
}
if (dupeTopics.length) {
  console.log(`  note: ${dupeTopics.length} stance block(s) repeat a topic string, so the later ` +
    `card is unreachable via findStance() — pre-existing, not merge-related:`);
  for (const { pid, dupes } of dupeTopics) console.log(`    · ${pid}: ${dupes.join(", ")}`);
}
