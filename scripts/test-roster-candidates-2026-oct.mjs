#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-roster-candidates-2026-oct.mjs — current candidates outside Utah, each
// with a person file and none of them seated
// ─────────────────────────────────────────────────────────────────────────────
// cmp-data.js's "Current candidates outside Utah" block adds one identity row
// per nominee for U.S. Senate, U.S. House and the statewide offices the roster
// already tracks, read from each state's official candidate list or certified
// ballot on 2026-10-21, where the roster held nobody by that name.
// db/roster-candidates-2026-oct.json is the record of the pass: every state's
// outcome and source, every admitted row as filed, every alias, every skip.
//
// WHAT THIS SUITE PROVES:
//   1. Every state outside Utah has an outcome. A checked state added exactly
//      the rows the record names for it; a skipped state (no readable official
//      source) added zero.
//   2. Each new row carries the name, the office and district sought, and the
//      party exactly as the official source printed it; `candidate: true`,
//      inert.
//   3. Each new person file opens on the office sought, calls them a
//      candidate, and never says they hold the seat.
//   4. Nothing else moved: with this block carved out the roster is byte-
//      identical to HEAD — every sitting member and every Utah batch.
//   5. No duplicate pid; each filing-spelling alias reaches the sitting
//      member's own record.
//   6. No candidate is seated: every U.S. House, U.S. Senate and governor
//      lookup in all fifty states answers exactly as it did without the batch,
//      the board plan is unchanged, and /voice seats no candidate.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { carveDeclaredAdmissions, DECLARED_ADMISSIONS } from "./v103-chrome-seams.mjs";
import { planBoards, FEDERAL_READ_ONLY_SEATS, FEDERAL_STATES } from "./gen-district-boards.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const HEAD = (f) => {
  try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
};

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${String(n).slice(0, 80)}" missing`);
const section = (t) => console.log(`\n   ── ${t}`);
function report() {
  if (failures.length) {
    console.log(`\n   ${passed} passed, ${failures.length} failed\n`);
    for (const f of failures.slice(0, 60)) console.log(`   ✗ ${f}`);
    process.exit(1);
  }
  console.log(`\n   ✓ candidates outside Utah 2026: all ${passed} assertions passed`);
}
const must = (c, m) => { if (!c) { failures.push(`FIXTURE: ${m}`); report(); } else passed++; };

const REC = JSON.parse(R("db/roster-candidates-2026-oct.json"));
const BANNER = "// ── Current candidates outside Utah, 2026 general election, official state lists (Oct 2026)";
// FOUR OF THESE WERE SITTING LEGISLATORS held only as their candidacy. The
// four-state pass (Maine, Colorado, Minnesota, Nevada) seated them — the row now
// names the seat they hold — and moved the candidacy, exactly as filed, to
// window.CMP_CANDIDACIES; test-four-state-deepen.mjs holds those four, and this
// suite holds every other row to this record.
// The Mississippi, Vermont, Michigan and Tennessee pass seated seven more the
// same way (test-ms-vt-mi-tn-deepen.mjs holds them).
const SEATED = new Set(["db/roster-state-legislators-me-co-mn-nv-2026-oct.json", "db/roster-state-legislators-ms-vt-mi-tn-2026-oct.json"]
  .flatMap((f) => JSON.parse(R(f)).seatedFromCandidacy.map((r) => r.pid)));
const NEW = REC.rows.map((r) => r.pid);
const NEWSET = new Set(NEW);
const SRC = R("cmp-data.js");
const roster = (src) => { const w = makeSandbox(); vm.runInContext(src, vm.createContext(w), { filename: "cmp-data.js" }); return w.CMP_DATA; };
const RO = roster(SRC);
// THIS block carved out, and only this one: it is the last block in the file.
const at = SRC.indexOf(BANNER);
must(at > 0 && SRC.lastIndexOf(",\n", at) === at - 2 && SRC.indexOf("\n// ── ", at + BANNER.length) < 0,
  "the batch is not the last declared block in cmp-data.js");
const BASE_SRC = SRC.slice(0, at - 2) + SRC.slice(SRC.lastIndexOf("\n});"));
const BASE = roster(BASE_SRC);
const STATE_BY_CODE = Object.fromEntries(FEDERAL_STATES.map((s) => [s.code, s]));
const R_RE = /^(?:Republican(?: Party(?: of Florida)?)?|REPUBLICAN|REP|Rep|R)(?:$|,)/;
const D_RE = /^(?:Democratic(?: Party)?|Florida Democratic Party|Democrat|DEMOCRATIC|DEMOCRAT|DEM|Dem|D|Democratic-Farmer-Labor|Democratic-NPL|DEM\/PROG)(?:$|,)/;

// ═════════════════════════════════════════════════════════════════════════════
section("1 · every state outside Utah has an outcome, and the count is its own");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(Object.keys(REC.states).sort().join(","), FEDERAL_STATES.map((s) => s.code).sort().join(","), "the record covers every state outside Utah, and only those");
  const decl = DECLARED_ADMISSIONS.filter((d) => d.banner === BANNER)[0];
  must(!!decl, "v103-chrome-seams.mjs: the batch is not a declared admission");
  eq(decl.pids.join(","), NEW.join(","), "the declared admission is exactly the record's rows");
  for (const [code, s] of Object.entries(REC.states)) {
    const mine = NEW.filter((p) => REC.rows.find((r) => r.pid === p).state === code);
    const inRoster = Object.keys(RO).filter((p) => NEWSET.has(p) && RO[p].state === s.state);
    eq(inRoster.length, mine.length, `${code}: every row the record names for ${s.state} is on the roster, and no other`);
    eq(s.added, mine.length, `${code}: the recorded count is the rows`);
    if (s.checked) {
      ok(Array.isArray(s.sources) && s.sources.length > 0 && s.sources.every((u) => /^https?:\/\//.test(u)), `${code}: a checked state names its official source`);
      ok(s.officialCandidates === s.alreadyHeld + s.added + REC.skipped.filter((x) => x.state === code).length + REC.aliases.filter((x) => x.state === code).length,
        `${code}: every official candidate is held, added, aliased or skipped with a reason`);
      if (s.added === 0) eq(mine.length, 0, `${code}: checked, zero eligible — zero added`);
    } else {
      eq(s.outcome, "skipped", `${code}: unchecked means skipped`);
      ok(typeof s.reason === "string" && s.reason.length > 20, `${code}: the skip says why`);
      eq(mine.length, 0, `${code}: skipped — zero added`);
    }
  }
  for (const s of REC.skipped) ok(typeof s.why === "string" && s.why.length > 5, `${s.state} ${s.nameAsFiled}: skipped with a reason`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · each row: name, office, district, party as filed, a candidate, inert");
// ═════════════════════════════════════════════════════════════════════════════
const EQUITY = /\bequity\b|earn (?:a|your) share|\bshareholders?\b|\bdividends?\b|\bcrowdfund|\bform c\b/i;
for (const row of REC.rows) {
  if (SEATED.has(row.pid)) continue;
  const r = RO[row.pid];
  if (!ok(!!r, `${row.pid}: has a roster row`)) continue;
  const st = STATE_BY_CODE[row.state];
  eq(r.state, st.name, `${row.pid}: ${st.name}`);
  eq(r.name, row.name, `${row.pid}: the name`);
  const last = row.nameAsFiled.replace(/[“"‘(][^”"’)]*[”"’)]/g, " ").split(",")[0].trim().split(/\s+/).filter((w) => !/^(jr|sr|ii|iii|iv)\.?$/i.test(w)).pop() || "";
  const fold = (x) => String(x).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[’'`]/g, "'");
  ok(fold(r.name).indexOf(fold(last)) >= 0 || /,/.test(row.nameAsFiled),
    `${row.pid}: the name is the filer's own (${row.nameAsFiled} → ${r.name})`);
  eq(r.office, row.office, `${row.pid}: the office sought`);
  ok(/ Candidate(?: \([A-Z]{2}-(?:AL|\d+)\))?$/.test(r.office), `${row.pid}: the office string says candidate`);
  if (row.district) {
    eq(r.district, row.district, `${row.pid}: the district`);
    eq(r.office, `U.S. House Candidate (${row.state.toUpperCase()}-${st.seats === 1 ? "AL" : row.district})`, `${row.pid}: the district is in the office string`);
  } else ok(!("district" in r), `${row.pid}: a statewide office carries no district`);
  eq(r.partyFiled, row.partyAsFiled, `${row.pid}: the party exactly as filed`);
  eq(r.party, R_RE.test(r.partyFiled) ? "R" : D_RE.test(r.partyFiled) ? "D" : r.partyFiled, `${row.pid}: the roster code for that party`);
  eq(r.candidate, true, `${row.pid}: a candidate`);
  eq(r.candidacyStatus, "active", `${row.pid}: actively running`);
  eq(r.nextElection, "2026-11-03", `${row.pid}: on the November 3, 2026 ballot`);
  ok(r.score === null && r.kept === 0 && r.broken === 0 && r.pending === 0 && Array.isArray(r.issues) && r.issues.length === 0, `${row.pid}: inert`);
  ok(!EQUITY.test(JSON.stringify(r)), `${row.pid}: no equity language`);
}
ok(!EQUITY.test(SRC.slice(at)), "the block's comments carry no equity language");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · every new person file opens on the office sought, as a candidate");
// ═════════════════════════════════════════════════════════════════════════════
const FILES = [
  "cmp-data.js", "cmp-data-detail.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
  "stance-helpers.js", "alignment-tool.js", "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js", "profile-spine.js", "issue-colors.js",
  "my-stances.js", "voter-hub-location.js", "roster-keys.js", "seat-field.js", "person-link.js", "profile-evidence.js", "profiles-full.js",
];
const PH = R("person.html");
const PDX_AT = PH.indexOf("// ── PDXStance — shared canonical stance language");
const PDX_BLOCK = PDX_AT < 0 ? "" : PH.slice(PH.lastIndexOf("<script>", PDX_AT) + 8, PH.indexOf("</script>", PDX_AT));
function boot() {
  const w = makeSandbox();
  const by = {};
  const el = (id) => {
    const n = {
      id, innerHTML: "", textContent: "", style: { setProperty() {}, removeProperty() {} }, dataset: {}, children: [],
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute() {}, getAttribute() { return null; }, removeAttribute() {}, addEventListener() {}, removeEventListener() {},
      appendChild(c) { return c; }, querySelector() { return null; }, querySelectorAll() { return []; },
      insertAdjacentHTML() {}, remove() {}, focus() {}, scrollTo() {}, scrollIntoView() {},
    };
    if (id) by[id] = n;
    return n;
  };
  w.document.getElementById = (id) => by[id] || el(id);
  w.document.createElement = () => el("");
  w.__byId = by;
  w._pdxDisplayScore = () => "";
  w._likeCounts = {};
  if (typeof w.URLSearchParams !== "function") w.URLSearchParams = URLSearchParams;
  w.console = Object.assign({}, console, { log() {}, info() {}, warn() {} });
  const ctx = vm.createContext(w);
  w.__err = [];
  for (const f of FILES) { try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { w.__err.push(`${f}: ${e.message}`); } }
  try { vm.runInContext(PDX_BLOCK, ctx, { filename: "person.html#PDXStance" }); } catch (e) { w.__err.push(`PDXStance: ${e.message}`); }
  w.PROFILES = w.CMP_DATA;
  return w;
}
const visible = (h) => String(h).replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&rsquo;|&#39;/g, "’").replace(/&ldquo;|&rdquo;|&quot;/g, "\"").replace(/\s+/g, " ");
const W = boot();
must(typeof W.openModal === "function", `the person file did not boot — ${W.__err.join(" | ")}`);
const SEATED_WORDS = /\b(?:sitting member|holds this seat|holds the seat|currently serves|current member)\b/i;
const unesc = (s) => String(s).replace(/&#39;/g, "'");
for (const row of REC.rows) {
  if (SEATED.has(row.pid)) continue;
  if (W.__byId["modal-content"]) W.__byId["modal-content"].innerHTML = "";
  try { W.openModal(row.pid); } catch (e) { /* homepage chrome the harness does not carry */ }
  const text = visible((W.__byId["modal-content"] || {}).innerHTML || "");
  ok(text.length > 1500, `${row.pid}: the person file painted`);
  has(text, row.office, `${row.pid}: the file prints the office sought`);
  ok(text.indexOf("2026 Candidate") >= 0 || text.indexOf("Active Candidate") >= 0, `${row.pid}: the file calls them a current candidate`);
  ok(!SEATED_WORDS.test(text), `${row.pid}: never described as holding the seat (${(text.match(SEATED_WORDS) || [""])[0]})`);
  eq(W.PDXProfilePid(row.pid), row.pid, `/p/${row.pid} opens ${row.pid}'s own file`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · nothing else moved: every sitting member and every Utah batch");
// ═════════════════════════════════════════════════════════════════════════════
{
  const baseKeys = Object.keys(BASE);
  eq(Object.keys(RO).length, baseKeys.length + NEW.length, "roster length = the roster without this batch + the new candidates");
  ok(baseKeys.every((k) => JSON.stringify(BASE[k]) === JSON.stringify(RO[k])), "every other row is the same record");
  eq(Object.keys(RO).filter((k) => !BASE[k]).sort().join(","), NEW.slice().sort().join(","), "the only new keys are the new candidates");
  const sitting = (o) => Object.keys(o).filter((k) => !o[k].candidate && !/\bcandidate\b|\bnominee\b|\bformer\b/i.test(String(o[k].office || ""))).sort().join(",");
  // …but for the four seated members, whose rows still sit in this block.
  const sittingNow = sitting(RO).split(",").filter((k) => !SEATED.has(k)).join(",");
  eq(sittingNow, sitting(BASE), "the set of sitting members is unchanged");
  ok(REC.rows.every((r) => r.state !== "ut") && NEW.every((p) => !/^(?:Utah|UT\b)/.test(String(RO[p].state))), "no Utah row");
  const h = HEAD("cmp-data.js");
  if (h != null && h.indexOf(BANNER) < 0) eq(h, BASE_SRC, "with this batch carved out, cmp-data.js is byte-identical to HEAD");
  else if (h != null) eq(carveDeclaredAdmissions(h), carveDeclaredAdmissions(SRC), "with the declared batches carved out, cmp-data.js is byte-identical to HEAD");
  else passed++;
  for (const d of DECLARED_ADMISSIONS.filter((x) => x.banner !== BANNER && /utah|davis/i.test(x.wave + x.banner))) {
    ok(d.pids.every((p) => RO[p] && JSON.stringify(RO[p]) === JSON.stringify(BASE[p])), `${d.wave}: every Utah row unchanged`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · no duplicate pid; filing spellings reach the sitting member");
// ═════════════════════════════════════════════════════════════════════════════
{
  const keys = [...SRC.matchAll(/^\s*"([a-z0-9_]+)":\s*\{$/gm)].map((m) => m[1]);
  const count = new Map();
  for (const k of keys) count.set(k, (count.get(k) || 0) + 1);
  eq([...count].filter(([, n]) => n > 1).map(([k]) => k).join(","), "", "no pid is written twice in cmp-data.js");
  eq(new Set(NEW).size, NEW.length, "the record names each pid once");
  const AL = W.PDX_PROFILE_ALIAS || {}, AC = W.ACCT_ALIAS || {};
  for (const p of NEW) ok(!Object.prototype.hasOwnProperty.call(AL, p) && !Object.prototype.hasOwnProperty.call(AC, p), `${p}: not an alias key for somebody else`);
  const BRIDGES = { francisco_aguilar: "cisco_aguilar", gil_cisneros: "gilbert_cisneros", herb_conaway: "herbert_conaway", lou_correa: "j_correa", nelida_pou: "nellie_pou", suzanne_lee: "susie_lee" };
  for (const [k, v] of Object.entries(BRIDGES)) {
    eq(AL[k], v, `PDX_PROFILE_ALIAS: ${k} → ${v}`);
    eq(AC[k], v, `ACCT_ALIAS: ${k} → ${v}`);
    ok(!RO[k] && !!RO[v] && !RO[v].candidate, `${k}: no row of its own; ${v} is the sitting member's record`);
    eq(W.PDXProfilePid(k), v, `/p/${k} opens ${v}'s file`);
    for (const f of ["profile-alias.js", "index.html", "person.html"]) ok(new RegExp(`\\b${k}:\\s*'${v}'`).test(R(f)), `${f}: ${k} → ${v}`);
  }
  for (const a of REC.aliases) ok(!!RO[a.to] && !RO[a.to].candidate, `${a.nameAsFiled} (${a.state}): the alias target is a sitting member`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · no candidate is seated on any lookup, board or /voice card");
// ═════════════════════════════════════════════════════════════════════════════
const join_ = (cmp) => {
  const w = makeSandbox();
  const ctx = vm.createContext(w);
  w.CMP_DATA = undefined;
  vm.runInContext(cmp, ctx, { filename: "cmp-data.js" });
  for (const f of ["voter-hub-location.js", "seated-member.js"]) vm.runInContext(R(f), ctx, { filename: f });
  return w;
};
{
  const now = join_(SRC), before = join_(BASE_SRC);
  for (const st of FEDERAL_STATES.concat([{ code: "ut", name: "Utah", seats: 4 }])) {
    const a = now._pdxStatewideSeats(st.name), b = before._pdxStatewideSeats(st.name);
    eq(JSON.stringify({ s: (a.senators || []).slice().sort(), g: a.governor, x: !!a.ambiguous }),
      JSON.stringify({ s: (b.senators || []).slice().sort(), g: b.governor, x: !!b.ambiguous }), `${st.name}: both Senate seats and the governor answer as before`);
    for (let n = 1; n <= st.seats; n++) {
      const p = now._pdxUsHouseSeat(st.name, n) || "";
      eq(p, before._pdxUsHouseSeat(st.name, n) || "", `${st.code.toUpperCase()}-${n}: the U.S. House lookup answers as before`);
      ok(!NEWSET.has(p), `${st.code.toUpperCase()}-${n}: no candidate seated`);
    }
  }
}
{
  const { boards } = planBoards();
  // The contested Pennsylvania legislative boards (v469) are races, not candidates.
  // The whole-state passes' governor boards and read-only U.S. House boards
  // (sitting members; test-six-state-deepen.mjs, test-four-state-deepen.mjs) are
  // not candidate boards.
  eq(boards.filter((b) => !b.stateLeg && !b.outsideUtah && !FEDERAL_READ_ONLY_SEATS.has(b.seat)).length, 518, "the board plan is unchanged: no board opened for a candidate");
  // The four seated members hold their own seats' boards now; no one else here does.
  ok(!boards.some((b) => (NEWSET.has(b.pid) && !SEATED.has(b.pid)) || NEWSET.has(b.joinPid)), "no board names a candidate as its member");
  const LISTS = R("netlify/functions/district-board.mts") + R("netlify/lib/district-board-voice-core.mjs") + R("district-composer.js") +
    R("district-poll.js") + R("district-board.js") + R("district-voice.js") + R("netlify.toml");
  const lit = new Set([...LISTS.matchAll(/['"]([a-z][a-z0-9_]*)['"]/g)].map((m) => m[1]));
  ok(NEW.every((p) => SEATED.has(p) || !lit.has(p)), "no candidate is on any board, composer, poll or residency list");
}
{
  const LOC = R("voter-hub-location.js");
  const swFrom = LOC.indexOf("var _pdxStatewideCache = {};");
  const resTo = LOC.indexOf("window._vhSyncDistrictStrip = function()", swFrom);
  must(swFrom !== -1 && resTo > swFrom, "voter-hub-location.js: the resolver slice is gone");
  const a2 = LOC.indexOf("window.PDXReturn = (function () {");
  const RET = LOC.slice(a2, LOC.indexOf("\n  })();", a2) + "\n  })();".length);
  const SLICE = LOC.slice(swFrom, resTo);
  const PA = R("profile-alias.js"), SM = R("seated-member.js"), DV = R("district-voice.js"), VR = R("voice-room.js");
  const voice = (loc) => {
    const win = makeSandbox();
    let now = 1000000;
    win.Date = { now: () => now };
    const mk = (id) => ({ id, innerHTML: "", _a: {}, setAttribute(k, v) { this._a[k] = String(v); }, getAttribute(k) { return k in this._a ? this._a[k] : null; } });
    const els = { "pdx-voice-standing": mk("pdx-voice-standing"), "pdx-voice-seats": mk("pdx-voice-seats") };
    win.document.getElementById = (id) => els[id] || null;
    win.__PDX_VOICE_DOC = true;
    win.location = { href: "https://politidex.fyi/voice", pathname: "/voice", search: "", hash: "", origin: "https://politidex.fyi", assign() {}, replace() {} };
    win._hasUserLocation = true;
    win._currentVoterLocation = loc;
    win.PROFILES = RO;
    const ctx = vm.createContext(win);
    for (const [src, f] of [[PA, "profile-alias.js"], [SM, "seated-member.js"], [SLICE, "resolver"], [RET, "PDXReturn"], [DV, "district-voice.js"], [VR, "voice-room.js"]]) {
      vm.runInContext(src, ctx, { filename: f });
    }
    now += 20000;
    win.PDXVoiceRoom.paint();
    return { html: els["pdx-voice-seats"].innerHTML, seats: win.PDXVoice.seatsForMe() };
  };
  // One reader per checked state, in a congressional district a new candidate is running in.
  for (const [code, s] of Object.entries(REC.states)) {
    if (!s.checked || !s.added) continue;
    const row = REC.rows.find((r) => r.state === code && r.district) || REC.rows.find((r) => r.state === code);
    const { html, seats } = voice({ state: s.state, city: "", county: "", district: row.district || "1" });
    must(seats.length >= 3, `${code}: the hallway resolved no seats`);
    for (const c of seats) ok(!NEWSET.has(c.pid), `${code}: the ${c.key} card seats no candidate (${c.pid})`);
    const linked = [...String(html).matchAll(/href="\/p\/([a-z0-9_]+)"/g)].map((m) => m[1]);
    ok(!linked.some((p) => NEWSET.has(p)), `${code}: /voice links no candidate as a seat's member`);
  }
}

report();
