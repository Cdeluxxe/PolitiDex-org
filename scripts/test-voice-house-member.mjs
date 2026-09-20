#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-voice-house-member.mjs — the Voice hallway names the State House member
// ─────────────────────────────────────────────────────────────────────────────
// THE LIVE DEFECT THIS PINS
//
// /voice printed, on the Utah State House card:
//
//     No sitting member on hand for this seat.
//
// for readers whose Who Represents Me band, on the front page, in the same
// session, named the member by name — HD-68 from Lapoint (Scott Chew), HD-29
// from Fillmore (Bridger Bolinder). The State Senate row and both U.S. rows on
// the same card list resolved. That sentence is the one that means "nobody holds
// this seat", so the hallway reported a vacancy that does not exist.
//
// IT WAS NOT THE SEAT LIST. pdxRepsForMe() is the one seat list; the front-page
// band and the hallway both read it and neither has a second one. What differed
// was the ROSTER its own gate could KEY:
//
//   · voice.html carries no cmp-data.js (384 KB) and no ballot-breakdown.js
//     (407 KB) by design, so the State House pid can only come from the memo the
//     front page wrote — loc.resolved.statehouse — and the only people index on
//     the document is the live Firestore one, window.PROFILES.
//   · For a handful of officeholders the live document is filed under the slug of
//     their display name while the roster record sits under the legislative id
//     the seat resolves to: `scott_chew` holds the document, `chew_h68` holds the
//     record and the 90-act formal file.
//   · _pdxRosterKeeps() asked window.PROFILES for `chew_h68`, got nothing, and
//     read that as the member having LEFT the roster — so the resolver dropped a
//     pid it had itself resolved correctly, and the card printed the empty
//     sentence. `rwinterton` and `kennedy` survived because their pids are their
//     own document ids, which is exactly why only the House row was wrong.
//
// WHAT THE FIX IS, AND WHAT IT IS NOT. The raw miss is now JOINED through
// PDX_PROFILE_ALIAS read in reverse — this repo's standing assertion that the id
// on its left names the same officeholder as the id on its right, the table
// person-file's canonId, PDXPersonLink's href and data-hygiene's _hyCanonId all
// already read. It is a read, in the gate, in one place. No second seat-holder
// table, no second sitting-member lookup, no person named in the resolver, and
// nothing written to any roster.
//
// THE RULES THIS HARNESS HOLDS
//
//   1. THE RULING IS ON THE LEAN DOCUMENT, AND IT IS ONE LITERAL. profile-alias.js
//      carries profile-evidence.js's table byte for byte, declares no resolver and
//      reads no record; voice.html loads it and still loads none of the four
//      modules the address exists to not load; the worker precaches it.
//   2. THE JOIN IS IN THE GATE AND THE GATE IS STILL THE GATE. One record read,
//      published once, asked by the surface that prints the name.
//   3. DRIVEN, WITH THE REAL RESOLVER, TWICE. The same reader resolved on a
//      document with the curated tables, the memo that walk actually wrote, and
//      then resolved again on a lean document with only the live index — and the
//      State House name the hallway prints equals the name the front-page band
//      prints. Lapoint/HD-68 and Fillmore/HD-29.
//   4. AND THE JOIN IS WHAT DOES IT. The same lean reader, with the ruling taken
//      off the page, goes back to the empty sentence — so rule 3 is not passing
//      for some other reason.
//   5. A ROSTER HOLE IS STILL A ROSTER HOLE. A pid the live index holds under
//      NEITHER spelling stays empty, with the copy unchanged and no "yet".
//   6. NOTHING ELSE MOVED. BOARD_ROUTES is still one row, /district/ut-sd-3 is
//      byte-identical to HEAD, and no map, board, splat, equity string or score
//      came with this.
//
//   node scripts/test-voice-house-member.mjs
//
// No database, no network: every source of truth here is a committed file.

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const PA = R("profile-alias.js");
const PE = R("profile-evidence.js");
const LOC = R("voter-hub-location.js");
const VR = R("voice-room.js");
const DV = R("district-voice.js");
const VOICE_HTML = R("voice.html");
const SW = R("sw.js");

let passed = 0;
const fails = [];
const ok = (c, m) => { if (c) passed++; else fails.push(m); };
const must = (c, m) => { ok(c, m); if (!c) { report(); process.exit(1); } };
const eq = (a, b, m) => ok(a === b, `${m}\n    expected: ${JSON.stringify(b)}\n    actual:   ${JSON.stringify(a)}`);
const has = (s, n, m) => ok(String(s).indexOf(n) !== -1, m);
const no = (s, n, m) => ok(String(s).indexOf(n) === -1, m);
const section = (t) => console.log(`\n   ── ${t}`);
// EVERY RULE BELOW IS ABOUT CODE, NOT ABOUT PROSE. These files explain
// themselves at length and name the things they deliberately do NOT do, so a
// "this file must not read PROFILES" rule asked of the raw text would fail on the
// sentence saying it does not. Comments out, then ask.
const code = (src) => String(src)
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .split("\n").map((l) => l.replace(/(^|[^:"'`\\])\/\/.*$/, "$1")).join("\n");
const PA_CODE = code(PA);
const VR_CODE = code(VR);
function report() {
  if (fails.length) {
    console.log(`\n✗ voice house member: ${fails.length} failing of ${passed + fails.length}\n`);
    fails.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    console.log("");
  } else {
    console.log(`\n✓ voice house member: ${passed} checks passed`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 1 · ONE RULING, ONE LITERAL, ON THE LEAN DOCUMENT
// ═════════════════════════════════════════════════════════════════════════════
section("1 · the retired-key bridge is on /voice, copied verbatim, and nothing else");

// THE BYTE PIN. profile-evidence.js stays the source of truth — the file with the
// reasoning, and the file an entry is added to. profile-alias.js is a copy of
// exactly that statement, and if the two drift this fails rather than letting two
// documents hold two opinions about who is one person.
const AT = PE.indexOf("    window.PDX_PROFILE_ALIAS = window.PDX_PROFILE_ALIAS || {");
must(AT > 0, "profile-evidence.js no longer declares PDX_PROFILE_ALIAS as one literal statement");
const END = PE.indexOf("\n    };", AT);
must(END > AT, "the PDX_PROFILE_ALIAS literal in profile-evidence.js has no closing line this suite can find");
const TABLE_SRC = PE.slice(AT, END + "\n    };".length);
const lineOf = (src, idx) => src.slice(0, idx).split("\n").length;
const a = lineOf(PE, AT), b = lineOf(PE, END + "\n    };".length);
has(PA, `COPIED VERBATIM FROM profile-evidence.js LINES ${a}–${b}`,
  "bridge: profile-alias.js does not declare which lines of profile-evidence.js it copied — a mirror\n" +
  "    with no stated source is a second opinion waiting to happen");
ok(PA.indexOf(TABLE_SRC) > 0,
  `bridge: profile-evidence.js lines ${a}–${b} are not present in profile-alias.js byte for byte — either the\n` +
  "    copy drifted or the declared range is stale. Re-derive it from profile-evidence.js, do not hand-edit");

// BOTH ASSIGNMENTS ARE GUARDED, so a document carrying both files has one table
// whatever the script order resolves to.
const guard = /window\.PDX_PROFILE_ALIAS = window\.PDX_PROFILE_ALIAS \|\|/;
ok(guard.test(PA), "bridge: profile-alias.js assigns PDX_PROFILE_ALIAS unguarded — on index.html it would clobber the owner's table");
ok(guard.test(PE), "bridge: profile-evidence.js assigns PDX_PROFILE_ALIAS unguarded — the bridge would be overwritten on the documents that have both");

// AND IT IS THE TABLE AND NOTHING ELSE. No resolver, no record read, no roster,
// no seat: the reasons it is 7 KB instead of 68 KB.
[["PDXProfilePid", "the resolver — that stays in profile-evidence.js, which is the file with the records"],
  ["ACCT_ALIAS", "the curated-key table, which answers a different question"],
  ["PROFILES", "a roster read — this file rules on ids, it does not look anybody up"],
  ["CMP_DATA", "a roster read — this file rules on ids, it does not look anybody up"],
  ["pdxRepsForMe", "the seat list"],
  ["statehouse", "a seat key"]]
  .forEach(([s, why]) => no(PA_CODE, s, `bridge: profile-alias.js reads ${s} — ${why}`));

// THE DOCUMENT LOADS IT, AND STILL LOADS NONE OF WHAT IT EXISTS TO NOT LOAD.
has(VOICE_HTML, '<script defer src="/profile-alias.js"></script>',
  "bridge: voice.html does not load the bridge, so the ruling is not on the page and the gate cannot read it");
["cmp-data.js", "ballot-breakdown.js", "profile-evidence.js", "compare-hub.js"].forEach((f) =>
  ok(!new RegExp(`<script[^>]*src="/${f.replace(".", "\\.")}"`).test(VOICE_HTML),
    `bridge: voice.html now loads ${f} — the seat's member is not worth re-linking the homepage stack for`));
const srcs = [...VOICE_HTML.matchAll(/<script\b[^>]*\bsrc="(\/[^"]+)"/g)].map((m) => m[1]);
ok(srcs.indexOf("/profile-alias.js") > srcs.indexOf("/person-link.js"),
  "bridge: the bridge is loaded before person-link.js — order is not load-bearing here, but the document's\n" +
  "    script block should read in the order the page depends on things");
ok(srcs.indexOf("/profile-alias.js") < srcs.indexOf("/voter-hub-location.js"),
  "bridge: the bridge is loaded after the resolver — both are deferred so this is not a bug today, and it\n" +
  "    should still read as the table arriving before its reader");

// THE WORKER SHIPS IT WITH THE ROOM.
const VER = (/const CACHE_VERSION = '(v\d+)'/.exec(SW) || [, ""])[1];
ok(/^v\d+$/.test(VER) && Number(VER.slice(1)) >= 232,
  `sw: CACHE_VERSION is "${VER}" — a new shell asset shipped and a warm device would keep serving a voice.html\n` +
  "    that never requests it");
const SHELL = (/const SHELL_ASSETS = \[([\s\S]*?)\n\];/.exec(SW) || [, ""])[1];
must(!!SHELL, "sw.js no longer declares SHELL_ASSETS as one literal array");
has(SHELL, "'/profile-alias.js'",
  "sw: /profile-alias.js is not precached — offline, /voice would describe a named member as merely 'on file'");


// ═════════════════════════════════════════════════════════════════════════════
// 2 · THE JOIN IS IN THE GATE, AND THE GATE IS STILL ONE READ
// ═════════════════════════════════════════════════════════════════════════════
section("2 · one roster read, joined once, published once");

has(LOC, "function _pdxRosterRaw(pid)",
  "gate: the raw key lookup is no longer its own function, so there is nowhere for the join to sit above it");
has(LOC, "function _pdxAliasKeys(pid)",
  "gate: voter-hub-location.js no longer derives the retired spellings of a pid — the gate is back to a raw\n" +
  "    key lookup and will un-name a seat whose row is filed under another key");
has(LOC, "window.PDX_PROFILE_ALIAS",
  "gate: the join no longer reads PDX_PROFILE_ALIAS, which means it is reading some second table of its own");
has(LOC, "window.pdxRosterRec = function (pid)",
  "gate: the joined record read is not published, so the surface that prints the name has to key the index\n" +
  "    itself and the two can disagree again");
// THE GATE'S OWN RULE IS UNCHANGED: an empty roster still abstains, and only a
// pid the roster genuinely does not hold may un-name a seat.
has(LOC, "if (!_pdxRosterSize()) return true;",
  "gate: _pdxRosterKeeps no longer abstains while the roster is empty — a page mid-load would start\n" +
  "    reporting resignations");
// AND THE JOIN IS ONE HOP, NOT A CHAIN. A canonical id reaches the retired
// spellings of itself and stops; nothing walks from one alias value to another.
const joinAt = LOC.indexOf("function _pdxAliasKeys(pid)");
const joinBlk = code(LOC.slice(joinAt, LOC.indexOf("function _pdxRosterRec(pid)", joinAt)));
eq((joinBlk.match(/_pdxAliasKeys\(/g) || []).length, 1,
  "gate: the reverse read calls itself — a chain through alias values can land on a third person, and\n" +
  "    the rule is one hop from a canonical id to the retired spellings of itself");
const recBlk = code(LOC.slice(LOC.indexOf("function _pdxRosterRec(pid)"), LOC.indexOf("window.pdxRosterRec")));
has(recBlk, "_pdxRosterRaw(keys[i])",
  "gate: the joined lookup does not read the raw index under the retired key, so the join resolves a key\n" +
  "    and then asks nobody for the row");
has(joinBlk, "if (t !== _pdxAliasSrc)",
  "gate: the reverse index is rebuilt on every call — the gate is asked once per seat per repaint");

// AND THE ONE READ RETURNS THE ROW THAT CAN NAME THEM. A bulk Firestore load
// writes a `__lite` row for every document it lists, so the canonical key can be
// holding a thin row while the full document sits under the retired spelling.
// First-row-wins answered the gate correctly and the card wrongly: the seat kept
// its member and the hallway described them instead of naming them. The walk now
// prefers a row with a name — and still returns `first` when no row has one, so
// the gate's truthiness test reads exactly the answer it read before.
has(LOC, "function _pdxRosterName(rec)",
  "gate: the joined read no longer tests whether a row can name the person, so a thin row under the\n" +
  "    canonical key shadows the full document filed under the slug");
has(recBlk, "if (_pdxRosterName(alt)) return alt;",
  "gate: the walk does not prefer the row that names the person — it stops on the first row it finds,\n" +
  "    which is the lite-row defect");
has(recBlk, "if (alt && !first) first = alt;",
  "gate: the walk forgets the rows it could not name, so it can now return null for a pid the roster\n" +
  "    does hold — that is the gate's existence answer changing, and it must not");

// THE SURFACE ASKS THE RESOLVER, IT DOES NOT LOOK ANYBODY UP TWICE.
has(VR, "window.pdxRosterRec",
  "card: voice-room.js does not read the resolver's record read, so the name and the gate are two answers again");
no(VR_CODE, "PDX_PROFILE_ALIAS",
  "card: voice-room.js reads the alias table itself — that is a second lookup in the file whose whole rule is\n" +
  "    that it borrows every fact");
no(VR_CODE, "pdxSeatedMemberFor",
  "card: voice-room.js now asks the district-file seat lookup — pdxRepsForMe() is the seat list");

// AND IT ASKS THE JOIN FIRST, AND NO LANE ENDS THE WALK BY ANSWERING "NOBODY".
// personOf used to open with `return window._pdxPersonById(pid) || null` — a
// reader that keys the bundled roster only, returning its own null as the final
// answer, on a document where the row is filed under a retired spelling. The
// order is the defect, so the order is pinned.
{
  const pAt = VR_CODE.indexOf("function personOf(pid)");
  must(pAt > 0, "card: voice-room.js has no personOf() — this suite no longer knows where the name comes from");
  const pBlk = VR_CODE.slice(pAt, VR_CODE.indexOf("function personHref(pid)", pAt));
  const joinIdx = pBlk.indexOf("window.pdxRosterRec");
  const cmpIdx = pBlk.indexOf("window._pdxPersonById");
  ok(joinIdx !== -1, "card: personOf does not ask the resolver's published read at all");
  ok(cmpIdx === -1 || joinIdx < cmpIdx,
    "card: personOf asks compare-table.js's roster reader before the gate's own join, so a pid whose row is\n" +
    "    filed under a retired spelling comes back null and the walk ends before the join is consulted");
  no(pBlk, "return window._pdxPersonById(pid) || null;",
    "card: the first lane still returns its own null as the final answer");
  has(VR_CODE, "function named(p)",
    "card: nothing tests whether a row can name the person, so a row with no name counts as an answer");
  eq((pBlk.match(/if \(named\(r\)\) return r;/g) || []).length, 4,
    "card: a lane in personOf keeps a row it cannot name — every lane must hand a nameless row on to the\n" +
    "    next one, or the thinnest index on the page wins");
}
// AND THE COPY IS UNCHANGED. No "yet", and the empty sentence still exists for
// the case where the roster really is empty of this member.
has(VR, "No sitting member on hand for this seat.",
  "copy: the empty sentence was reworded or removed — it is still the right sentence when the roster holds nobody");
no(VR, "on hand for this seat yet",
  'copy: the empty sentence grew a "yet" — the hallway does not promise a member is coming');

// ═════════════════════════════════════════════════════════════════════════════
// 3 · DRIVEN: THE SAME READER, THE SAME SEAT LIST, TWO DOCUMENTS
// ═════════════════════════════════════════════════════════════════════════════
section("3 · the hallway prints the name the front-page band prints");

// The resolver is sliced out of its owner and run for real, from the statewide
// helper (the two U.S. Senate rows and the Governor resolve through it) down to
// the strip that consumes it — the same slice scripts/test-who-represents-me.mjs
// drives, so the two suites cannot be testing two different resolvers.
const swFrom = LOC.indexOf("var _pdxStatewideCache = {};");
const resTo = LOC.indexOf("window._vhSyncDistrictStrip = function()", swFrom);
must(swFrom !== -1 && resTo > swFrom,
  "voter-hub-location.js no longer runs from _pdxStatewideCache down to _vhSyncDistrictStrip — the resolver\n" +
  "  slice this suite and test-who-represents-me.mjs both drive is gone");
const RESOLVER = LOC.slice(swFrom, resTo);
const RET_SRC = (() => {
  const at = LOC.indexOf("window.PDXReturn = (function () {");
  must(at > 0, "voter-hub-location.js no longer declares window.PDXReturn");
  const end = LOC.indexOf("\n  })();", at);
  return LOC.slice(at, end + "\n  })();".length);
})();

// The table, lifted out of the file the lean document actually loads.
const ALIAS = (() => {
  const ctx = { window: {} };
  ctx.window.window = ctx.window;
  new Function("window", PA)(ctx.window);
  return ctx.window.PDX_PROFILE_ALIAS;
})();
must(ALIAS && ALIAS.scott_chew === "chew_h68" && ALIAS.bridger_bolinder === "bolinder_h68",
  "bridge: profile-alias.js does not bridge scott_chew → chew_h68 and bridger_bolinder → bolinder_h68, which\n" +
  "  are the two fixtures in the report");

// THE TWO READERS. Areas ballot-breakdown.js curates (uintah/HD-68 and
// millard/HD-29, synthesised from KEY_RACES_LOCATIONS because they carry all
// three district numbers), so the front page really does resolve these seats.
const SEATS = [
  {
    who: "Lapoint", loc: { state: "Utah", city: "Lapoint", county: "Uintah County", district: "3" },
    area: "Vernal, Uintah County", hd: "3", sd: "20", ld: "68",
    canon: "chew_h68", filed: "scott_chew", name: "Scott Chew",
  },
  {
    who: "Fillmore", loc: { state: "Utah", city: "Fillmore", county: "Millard County", district: "4" },
    area: "Fillmore, Millard County", hd: "4", sd: "27", ld: "29",
    canon: "bolinder_h68", filed: "bridger_bolinder", name: "Bridger Bolinder",
  },
];

// The curated roster the FRONT PAGE has: canonical keys, because cmp-data.js is
// keyed on the roster id. This is the index _pdxPersonById reads and the band
// composes its name from.
const CMP = {
  rwinterton: { name: "Rex Winterton", office: "Utah State Senator", state: "UT District 20", party: "R" },
  swayne: { name: "Scott Wayne", office: "Utah State Senator", state: "UT District 27", party: "R" },
  kennedy: { name: "Mike Kennedy", office: "U.S. Representative", state: "Utah · UT-3", party: "R" },
  umoore: { name: "Burgess Moore", office: "U.S. Representative", state: "Utah · UT-4", party: "R" },
  chew_h68: { name: "Scott Chew", office: "Utah State Representative", state: "UT District 68", party: "R" },
  bolinder_h68: { name: "Bridger Bolinder", office: "Utah State Representative", state: "UT District 29", party: "R" },
};
const SEN_BY_D = { 20: "rwinterton", 27: "swayne" };
const USH_BY_D = { 3: "kennedy", 4: "umoore" };

// And the LIVE index the lean document has: the same people, but each State House
// member's document filed under the slug of their display name, which is the
// shape the defect lives in. Nobody is added and nobody is renamed — this is two
// spellings of the same roster.
function liveIndex(s) {
  const out = {};
  out[SEN_BY_D[s.sd]] = CMP[SEN_BY_D[s.sd]];
  out[USH_BY_D[s.hd]] = CMP[USH_BY_D[s.hd]];
  out[s.filed] = CMP[s.canon];
  return out;
}

// ── THE FRONT PAGE ────────────────────────────────────────────────────────────
// Curated tables present, so the walk resolves the seats itself, and then writes
// the memo through the one write path — pdxRememberResolved(). The memo the lean
// document reads below is the one this walk actually produced, not a fixture.
function homeCtx(s) {
  const ctx = {
    console, Math, JSON, String, Array, Object, Number, Boolean, RegExp, Date,
    _hasUserLocation: true,
    _currentVoterLocation: JSON.parse(JSON.stringify(s.loc)),
    CMP_DATA: CMP,
    _pdxPersonById: (pid) => CMP[pid] || null,
    _pdxVoterBallot: () => ({
      districts: { house: s.hd, senate: s.sd, lower: s.ld },
      byOffice: {
        representative: { incumbentPid: USH_BY_D[s.hd] },
        state_senator: { incumbentPid: SEN_BY_D[s.sd] },
        state_rep: { incumbentPid: s.canon },
      },
    }),
    keyRacesRelevantData: () => ({ matched: true, label: s.area, byRace: {} }),
    _pdxHouseRedistrict: () => ({ changed: false }),
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(RESOLVER, ctx, { filename: "voter-hub-location.js[pdxRepsForMe]" });
  return ctx;
}

// ── THE LEAN DOCUMENT ─────────────────────────────────────────────────────────
// No CMP_DATA, no _pdxPersonById, no _pdxVoterBallot, no keyRacesRelevantData —
// exactly what voice.html loads. One live index, and the memo the front page
// wrote. `bridge:false` takes the ruling off the page, which is rule 4.
function voiceCtx(s, memo, opts) {
  const o = opts || {};
  const win = makeSandbox();
  let now = 1000000;
  win.Date = { now: () => now };
  const mk = (id) => ({
    id, innerHTML: "", _attrs: {},
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null; },
  });
  const els = { "pdx-voice-standing": mk("pdx-voice-standing"), "pdx-voice-seats": mk("pdx-voice-seats") };
  win.document.getElementById = (id) => els[id] || null;
  win.__PDX_VOICE_DOC = true;
  win.location = { href: "https://www.politidex.fyi/voice", pathname: "/voice", search: "", hash: "", origin: "https://www.politidex.fyi", assign() {}, replace() {} };
  win._hasUserLocation = true;
  const loc = JSON.parse(JSON.stringify(s.loc));
  loc.resolved = JSON.parse(JSON.stringify(memo));
  win._currentVoterLocation = loc;
  win.PROFILES = o.live || liveIndex(s);
  if (o.bridge !== false) win.PDX_PROFILE_ALIAS = JSON.parse(JSON.stringify(ALIAS));
  // Rule 7 hands this document compare-table.js's reader, which /voice does not
  // load — the resolver slice never reads it (one comment, no call), so this
  // reaches voice-room.js's personOf and nothing else.
  if (o.personById) win._pdxPersonById = o.personById;
  const ctx = vm.createContext(win);
  vm.runInContext(RESOLVER, ctx, { filename: "voter-hub-location.js[pdxRepsForMe]" });
  vm.runInContext(RET_SRC, ctx, { filename: "voter-hub-location.js#PDXReturn" });
  vm.runInContext(DV, ctx, { filename: "district-voice.js" });
  vm.runInContext(VR, ctx, { filename: "voice-room.js" });
  return { win, paint: () => win.PDXVoiceRoom.paint(), list: () => els["pdx-voice-seats"].innerHTML };
}

const lvl = (reps, k) => (reps.levels || []).filter((l) => l.key === k)[0] || null;
// ONE CARD, NOT THE LIST. Both U.S. Senate rows and the Governor row resolve
// nobody on a lean document with no statewide roster, and they print the empty
// sentence because that is the truth about them — so every rule below reads the
// State House <li> and only that one.
const houseCard = (html, s) => {
  const parts = String(html).split('<li class="pdxvr-seat"');
  for (const part of parts) {
    if (part.indexOf("pdxvr-chamber") !== -1 && part.indexOf("District " + s.ld) !== -1) return part;
  }
  return "";
};
// The front-page band's own composition, as who-represents-me.js row() does it:
// the pid is the gate, and the name is the display record's or nothing.
const bandName = (ctx, reps) => {
  const l = lvl(reps, "statehouse");
  if (!l || !l.pid) return "";
  const p = ctx._pdxPersonById(l.pid);
  return (p && p.name) || "";
};

for (const s of SEATS) {
  // 1. The front page resolves the seat and remembers it.
  const home = homeCtx(s);
  const hReps = home.pdxRepsForMe();
  eq(lvl(hReps, "statehouse").district, s.ld,
    `${s.who}: the front page did not resolve HD-${s.ld} — the fixture's curated area changed and this suite is\n` +
    "    no longer testing the reported seat");
  eq(lvl(hReps, "statehouse").pid, s.canon,
    `${s.who}: the front page did not resolve the State House seat to ${s.canon}`);
  const HOME_NAME = bandName(home, hReps);
  eq(HOME_NAME, s.name, `${s.who}: the front-page band does not name ${s.name}, so there is nothing to match`);
  eq(home.pdxRememberResolved(), true, `${s.who}: pdxRememberResolved() declined to write the memo the lean document reads`);
  const memo = home._currentVoterLocation.resolved;
  must(!!memo && !!memo.statehouse,
    `${s.who}: the one write path recorded no statehouse entry, so /voice has nothing to read and this suite\n` +
    "  would be testing a blank rather than a join");
  eq(memo.statehouse.pid, s.canon, `${s.who}: the memo remembered a State House pid other than ${s.canon}`);

  // 2. The lean document resolves the same seat from that memo.
  const v = voiceCtx(s, memo);
  const vReps = v.win.pdxRepsForMe();
  eq(lvl(vReps, "statesenate").pid, SEN_BY_D[s.sd],
    `${s.who}: /voice lost the State Senate pid too — that row resolved before this pass and must keep doing so`);
  eq(lvl(vReps, "house").pid, USH_BY_D[s.hd],
    `${s.who}: /voice lost the U.S. House pid — that row resolved before this pass and must keep doing so`);
  eq(lvl(vReps, "statehouse").pid, s.canon,
    `${s.who}: /voice still drops the State House pid. The gate is keying the live index rawly, finding the\n` +
    `    document under "${s.filed}" instead of "${s.canon}", and reading that as the member having left office`);

  // 3. And the card prints the same name the band printed.
  eq(v.win.pdxRosterRec(s.canon) && v.win.pdxRosterRec(s.canon).name, s.name,
    `${s.who}: the published record read cannot name ${s.canon} on a document whose index files it under\n` +
    `    "${s.filed}"`);
  v.paint();
  const list = houseCard(v.list(), s);
  must(!!list, `${s.who}: the hallway painted no State House card at all for HD-${s.ld}`);
  has(list, `Sitting member: <a class="pdxvr-name" href="/p/${s.canon}">${s.name}</a>`,
    `${s.who}: the hallway's State House card does not print "${s.name}" at the canonical address`);
  has(list, HOME_NAME, `${s.who}: the hallway prints a different name than the front-page band's "${HOME_NAME}"`);
  no(list, "No sitting member on hand for this seat",
    `${s.who}: the hallway still reports a vacancy on a seat both surfaces resolved`);
  no(list, `/p/${s.filed}`,
    `${s.who}: the card advertises the retired address — the join resolves who the person IS, it does not\n` +
    "    publish a second address for them");
  no(list, "The member who holds this seat is on file",
    `${s.who}: the card fell back to describing the member instead of naming them`);

  // 4. RULE 4 — and it is the ruling that does it. Same reader, same index, same
  //    memo, with PDX_PROFILE_ALIAS off the page.
  const bare = voiceCtx(s, memo, { bridge: false });
  eq(lvl(bare.win.pdxRepsForMe(), "statehouse").pid, null,
    `${s.who}: the State House pid survives with the ruling off the page, so section 3 is passing for some\n` +
    "    reason other than the join and would keep passing if the join were removed");
  bare.paint();
  has(houseCard(bare.list(), s), "No sitting member on hand for this seat",
    `${s.who}: with no ruling on the page the card does not fall back to the empty sentence, which means the\n` +
    "    sentence is now unreachable and the copy is dead");

  // 5. RULE 5 — a row the live index holds under NEITHER spelling is a roster
  //    hole, and a roster hole stays empty. HD-15's defay_h15 is bridged only in
  //    ACCT_ALIAS, so this is the real shape of the remaining gap.
  const holed = liveIndex(s);
  delete holed[s.filed];
  const hole = voiceCtx(s, memo, { live: holed });
  eq(lvl(hole.win.pdxRepsForMe(), "statehouse").pid, null,
    `${s.who}: a State House member the live index holds under neither spelling is still being named — the\n` +
    "    join must find a row, never invent one");
  hole.paint();
  has(houseCard(hole.list(), s), "No sitting member on hand for this seat",
    `${s.who}: a genuine roster hole does not print the empty sentence`);
  no(houseCard(hole.list(), s), "yet",
    `${s.who}: the roster-hole card promises a member is coming`);

  // 6. RULE 6 — TWO ROWS FOR ONE OFFICEHOLDER, AND ONLY ONE OF THEM HAS A NAME.
  //    The live index holds a thin `__lite` row under the canonical key and the
  //    full document under the slug, which is what a bulk load leaves behind.
  //    The gate was never wrong here — the canonical key has a row — so the seat
  //    kept its member and the card described them instead of naming them.
  const lite = liveIndex(s);
  lite[s.canon] = { __lite: true, office: "Utah State Representative", state: "UT District " + s.ld };
  const two = voiceCtx(s, memo, { live: lite });
  eq(lvl(two.win.pdxRepsForMe(), "statehouse").pid, s.canon,
    `${s.who}: the State House pid is dropped when the canonical key holds a thin row — the gate's existence\n` +
    "    answer changed, and a row it can see is a person it holds");
  eq(two.win.pdxRosterRec(s.canon) && two.win.pdxRosterRec(s.canon).name, s.name,
    `${s.who}: the published read returns the thin row rather than the one that names ${s.name}`);
  two.paint();
  const twoCard = houseCard(two.list(), s);
  has(twoCard, `Sitting member: <a class="pdxvr-name" href="/p/${s.canon}">${s.name}</a>`,
    `${s.who}: with a thin row under "${s.canon}" and the document under "${s.filed}", the card does not print\n` +
    `    "${s.name}" — the thinnest row on the page won`);
  no(twoCard, "The member who holds this seat is on file",
    `${s.who}: the card describes the member it could have named one key away`);
  no(twoCard, "No sitting member on hand for this seat",
    `${s.who}: the card reports a vacancy on a seat holding two rows for the same person`);

  // 7. RULE 7 — A DOCUMENT THAT CARRIES compare-table.js's READER. Its answer
  //    for a pid whose row is filed under a retired spelling is null, and null
  //    is not the end of the walk: the join above it already answered.
  const withCmp = voiceCtx(s, memo, { personById: () => null });
  withCmp.paint();
  const cmpCard = houseCard(withCmp.list(), s);
  has(cmpCard, `Sitting member: <a class="pdxvr-name" href="/p/${s.canon}">${s.name}</a>`,
    `${s.who}: a document carrying _pdxPersonById loses the name again — that reader's null is ending the\n` +
    "    walk before the join is asked");
  no(cmpCard, "The member who holds this seat is on file",
    `${s.who}: _pdxPersonById's null demoted a named member to a description`);
}

// AND THE TABLE ITSELF CANNOT NAME A LIVE ROSTER ID AS A RETIRED SPELLING, which
// is what keeps the reverse read from ever reaching a second person. The forward
// invariant is profile-evidence.js's and scripts/test-identity-integrity.mjs §11
// enforces it; this is the half the reverse read depends on.
{
  const rev = {};
  Object.keys(ALIAS).forEach((k) => { (rev[ALIAS[k]] = rev[ALIAS[k]] || []).push(k); });
  Object.keys(rev).forEach((canon) => {
    ok(!Object.prototype.hasOwnProperty.call(ALIAS, canon),
      `bridge: "${canon}" is both an alias TARGET and an alias KEY, so the reverse read could hop twice and\n` +
      "    land on a third id");
  });
  ok(Object.keys(rev).length > 0, "bridge: the reverse of the table is empty, so the join can never fire");
}

// ═════════════════════════════════════════════════════════════════════════════
// 4 · NOTHING ELSE MOVED
// ═════════════════════════════════════════════════════════════════════════════
section("4 · one board row, one untouched board, and no new surface");

const BR = (/var BOARD_ROUTES = \{([\s\S]*?)\n  \};/.exec(DV) || [, ""])[1];
must(!!BR, "district-voice.js no longer declares BOARD_ROUTES as one literal");
eq((BR.match(/:\s*'\//g) || []).length, 1,
  "boards: BOARD_ROUTES is no longer exactly one row — this pass names a member, it does not open a room");
has(BR, "'/district/ut-sd-3'", "boards: the one row is no longer SD-3's address");

const HEAD = (f) => {
  try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 }); }
  catch (e) { return null; }
};
[["district-ut-sd-3.html", "the one board's document"],
  ["district-board.js", "the one board's engine"],
  ["ballot-breakdown.js", "the curated race tables"],
  ["who-represents-me.js", "the front-page band — it already read the right field"],
  ["district-voice.js", "the seat list and the allow-list"],
  ["profile-evidence.js", "the table's owner"]].forEach(([f, why]) => {
    const h = HEAD(f);
    if (h == null) { passed++; return; }  // no git object here; the byte pins above still hold
    eq(R(f), h, `untouched: ${f} changed in this pass and it should not have — ${why}`);
  });

// No map, no splat, no equity copy, no score.
no(PA, "leaflet", "scope: the bridge mentions Leaflet");
no(VR_CODE, "equity", "scope: the hallway grew equity copy");
no(VR_CODE, "score", "scope: the hallway grew a score");
ok(!/\/district\/\*/.test(DV), "scope: district-voice.js splatted /district/*");

report();
process.exit(fails.length ? 1 : 0);
