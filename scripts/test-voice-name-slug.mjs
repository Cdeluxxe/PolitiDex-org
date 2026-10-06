#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-voice-name-slug.mjs — one address per person, and a slug is not a person
// ─────────────────────────────────────────────────────────────────────────────
// THE DEFECT THIS PINS
//
// The board and Who Represents Me name Celeste Maloy at /p/maloy. The live
// profile is filed under `celeste_maloy`. /voice asked the live index for the
// roster id, missed, and printed "No sitting member on hand for this seat" until
// a hand-added PDX_PROFILE_ALIAS row papered over it. Trevor Lee (`trevor_lee` /
// `tlee`) and Ariel Defay (`ariel_defay` / `defay_h15`) were the same split, and
// the next officeholder filed under a name slug would have failed the same way.
//
// THE RULE. When the gate has a roster id and the live index has no named
// document under it, it slugs that roster row's own display name — read from
// roster-names.js, generated out of cmp-data.js and pinned to it here — and takes
// the live document filed under that slug only if exactly one roster row and
// exactly one live document carry it. The seat keeps the roster id.
//
// THE RULES THIS HARNESS HOLDS
//
//   1. THE NAME TABLE IS GENERATED, CURRENT, ON /voice AND PRECACHED, and /voice
//      still loads no bundled roster.
//   2. COLD /voice, PDX_PROFILE_ALIAS ROWS REMOVED: Maloy, Lee and Defay are each
//      named at their roster address, never at the slug.
//   3. A SLUG TWO ROSTER ROWS SHARE NAMES NOBODY: the empty sentence, no "yet".
//      Nothing matches on a last name.
//   4. THE MUTATION: with the unique-slug rule removed, the empty sentence comes
//      back and the rule-2 checks fail.
//   5. /p/<slug> REDIRECTS to /p/<roster id>, ahead of the /p/* rewrite.
//   6. THE IDENTITY GUARD: a PDX_PROFILE_ALIAS row is legal only if ACCT_ALIAS
//      already holds the same pair (rows that predate the guard are frozen by
//      name). STANCE_ALIASES is not that owner. ACCT_ALIAS holds celeste_maloy.
//
//   node scripts/test-voice-name-slug.mjs
//
// No database, no network: every source of truth here is a committed file.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildRows, render } from "./gen-roster-names.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const RN = R("roster-names.js");
const SM = R("seated-member.js");
const PA = R("profile-alias.js");
const PE = R("profile-evidence.js");
const LOC = R("voter-hub-location.js");
const DV = R("district-voice.js");
const VR = R("voice-room.js");
const VOICE_HTML = R("voice.html");
const SW = R("sw.js");
const TOML = R("netlify.toml");

let passed = 0;
const fails = [];
const ok = (c, m) => { if (c) passed++; else fails.push(m); };
const must = (c, m) => { ok(c, m); if (!c) { report(); process.exit(1); } };
const eq = (a, b, m) => ok(a === b, `${m}\n    expected: ${JSON.stringify(b)}\n    actual:   ${JSON.stringify(a)}`);
const has = (s, n, m) => ok(String(s).indexOf(n) !== -1, m);
const no = (s, n, m) => ok(String(s).indexOf(n) === -1, m);
const section = (t) => console.log(`\n   ── ${t}`);
function report() {
  if (fails.length) {
    console.log(`\n✗ voice name slug: ${fails.length} failing of ${passed + fails.length}\n`);
    fails.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    console.log("");
  } else {
    console.log(`\n✓ voice name slug: ${passed} checks passed — one address per person`);
  }
}

// An object literal declared as `window.X = window.X || {`, lifted by brace match.
function lift(src, decl) {
  const at = src.indexOf(decl);
  if (at < 0) return null;
  const open = src.indexOf("{", at + decl.length - 1);
  let d = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") d++;
    else if (src[i] === "}") { d--; if (!d) return vm.runInNewContext(`(${src.slice(open, i + 1)})`); }
  }
  return null;
}
const ACCT = lift(PE, "window.ACCT_ALIAS = window.ACCT_ALIAS || {");
const PPA = lift(PE, "window.PDX_PROFILE_ALIAS = window.PDX_PROFILE_ALIAS || {");
const NAMES = lift(RN, "window.PDX_ROSTER_NAMES = window.PDX_ROSTER_NAMES || {");
must(!!ACCT && !!PPA && !!NAMES, "could not lift ACCT_ALIAS, PDX_PROFILE_ALIAS or PDX_ROSTER_NAMES");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the name table is generated, current, on /voice and precached");
eq(RN, render(buildRows()),
  "roster-names.js is not what scripts/gen-roster-names.mjs writes — re-run the generator, never hand-edit");
eq(NAMES.maloy, "Celeste Maloy", "names: maloy is not Celeste Maloy");
eq(NAMES.tlee, "Trevor Lee", "names: tlee is not Trevor Lee");
eq(NAMES.defay_h15, "Ariel Defay", "names: defay_h15 is not Ariel Defay");
ok(!("celeste_maloy" in NAMES) && !("trevor_lee" in NAMES) && !("ariel_defay" in NAMES),
  "names: a display-name slug is listed as a roster row of its own");
const srcs = [...VOICE_HTML.matchAll(/<script\b[^>]*\bsrc="(\/[^"]+)"/g)].map((m) => m[1]);
ok(srcs.indexOf("/roster-names.js") > 0 && srcs.indexOf("/roster-names.js") < srcs.indexOf("/voter-hub-location.js"),
  "voice.html: /roster-names.js is not loaded ahead of the resolver");
["cmp-data.js", "ballot-breakdown.js", "profile-evidence.js"].forEach((f) =>
  ok(srcs.indexOf("/" + f) < 0, `voice.html: loads /${f} — the name table exists so it does not have to`));
const VER = Number((/const CACHE_VERSION = 'v(\d+)'/.exec(SW) || [, 0])[1]);
ok(VER >= 306, `sw: CACHE_VERSION is v${VER}; the hallway's precached scripts changed and it must move`);
const SHELL = (/const SHELL_ASSETS = \[([\s\S]*?)\n\];/.exec(SW) || [, ""])[1];
has(SHELL, "'/roster-names.js'", "sw: /roster-names.js is not precached");
const RN_CODE = RN.replace(/\/\*[\s\S]*?\*\//g, " ");
["PROFILES", "CMP_DATA"].forEach((s) =>
  no(RN_CODE, s, `roster-names.js reads ${s} — it is one literal and nothing else`));
eq((RN_CODE.match(/function/g) || []).length, 1, "roster-names.js declares a function beyond its wrapper");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · cold /voice, alias rows removed: named at the roster address");

const swFrom = LOC.indexOf("var _pdxStatewideCache = {};");
const resTo = LOC.indexOf("window._vhSyncDistrictStrip = function()", swFrom);
must(swFrom !== -1 && resTo > swFrom, "voter-hub-location.js: the resolver slice is gone");
const RESOLVER = LOC.slice(swFrom, resTo);
const RET_SRC = (() => {
  const at = LOC.indexOf("window.PDXReturn = (function () {");
  const end = LOC.indexOf("\n  })();", at);
  return LOC.slice(at, end + "\n  })();".length);
})();
const RULE = "    var twin = _pdxSlugTwin(pid);\n    if (twin) return twin;\n";
must(RESOLVER.indexOf(RULE) > 0, "voter-hub-location.js: the unique-slug rule is not in the gate");

// The live index of a cold private window: each of the three filed ONLY under
// the slug of their display name. Their PDX_PROFILE_ALIAS rows are taken off.
const LIVE = {
  celeste_maloy: { name: "Celeste Maloy", office: "U.S. Representative", state: "Utah · District 2", party: "R" },
  trevor_lee: { name: "Trevor Lee", office: "Utah State Representative", state: "UT District 16", party: "R" },
  ariel_defay: { name: "Ariel Defay", office: "Utah State Representative", state: "UT District 15", party: "R" },
  sadams: { name: "Stuart Adams", office: "Utah State Senator", state: "UT District 7", party: "R" },
  jstevenson: { name: "Jerry Stevenson", office: "Utah State Senator", state: "UT District 6", party: "R" },
};
const SLUG_ROWS = ["celeste_maloy", "trevor_lee", "ariel_defay"];
const strippedAlias = () => {
  const t = JSON.parse(JSON.stringify(PPA));
  SLUG_ROWS.forEach((k) => { delete t[k]; });
  return t;
};
const READERS = [
  { who: "Layton HD-16", loc: { state: "Utah", city: "Layton", county: "Davis County", district: "2", stateSenateDistrict: "7", stateHouseDistrict: "16" } },
  { who: "Layton HD-15", loc: { state: "Utah", city: "Layton", county: "Davis County", district: "2", stateSenateDistrict: "6", stateHouseDistrict: "15" } },
];

function voiceCtx(loc, o) {
  o = o || {};
  const win = makeSandbox();
  win.Date = { now: () => 1000000 };
  const mk = (id) => ({ id, innerHTML: "", _attrs: {}, setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null; } });
  const els = { "pdx-voice-standing": mk("pdx-voice-standing"), "pdx-voice-seats": mk("pdx-voice-seats") };
  win.document.getElementById = (id) => els[id] || null;
  win.__PDX_VOICE_DOC = true;
  win.location = { href: "https://politidex.fyi/voice", pathname: "/voice", search: "", hash: "", origin: "https://politidex.fyi", assign() {}, replace() {} };
  win._hasUserLocation = true;
  win._currentVoterLocation = JSON.parse(JSON.stringify(loc));
  win.PROFILES = JSON.parse(JSON.stringify(o.live || LIVE));
  const ctx = vm.createContext(win);
  vm.runInContext(PA, ctx, { filename: "profile-alias.js" });
  win.PDX_PROFILE_ALIAS = o.alias || strippedAlias();
  vm.runInContext(o.names || RN, ctx, { filename: "roster-names.js" });
  vm.runInContext(SM, ctx, { filename: "seated-member.js" });
  vm.runInContext(o.resolver || RESOLVER, ctx, { filename: "voter-hub-location.js[pdxRepsForMe]" });
  vm.runInContext(RET_SRC, ctx, { filename: "voter-hub-location.js#PDXReturn" });
  vm.runInContext(DV, ctx, { filename: "district-voice.js" });
  vm.runInContext(VR, ctx, { filename: "voice-room.js" });
  win.PDXVoiceRoom.paint();
  return { win, html: els["pdx-voice-seats"].innerHTML };
}
const cardFor = (html, label) => String(html).split('<li class="pdxvr-seat"')
  .filter((p) => p.indexOf(label) !== -1)[0] || "";
const EMPTY = "No sitting member on hand for this seat.";
const ON_FILE = "The member who holds this seat is on file";

const CASES = [
  { reader: READERS[0], label: "U.S. House District 2", pid: "maloy", slug: "celeste_maloy", name: "Celeste Maloy" },
  { reader: READERS[0], label: "State House District 16", pid: "tlee", slug: "trevor_lee", name: "Trevor Lee" },
  { reader: READERS[1], label: "State House District 15", pid: "defay_h15", slug: "ariel_defay", name: "Ariel Defay" },
];
const faults = (html, c) => {
  const f = [];
  const card = cardFor(html, c.label);
  if (!card) return [`no ${c.label} card`];
  if (card.indexOf(`Sitting member: <a class="pdxvr-name" href="/p/${c.pid}">${c.name}</a>`) < 0)
    f.push(`the card does not print Sitting member: ${c.name} at /p/${c.pid}`);
  if (card.indexOf(`/p/${c.slug}`) >= 0) f.push(`the card advertises /p/${c.slug}`);
  if (card.indexOf(EMPTY) >= 0) f.push("the card prints the empty sentence");
  if (card.indexOf(ON_FILE) >= 0) f.push("the card prints the on-file sentence");
  return f;
};

for (const c of CASES) {
  const v = voiceCtx(c.reader.loc);
  eq(JSON.stringify(faults(v.html, c)), "[]", `${c.reader.who}: ${c.label} on a cold /voice with no alias row`);
  eq(v.win.pdxRosterRec(c.pid) && v.win.pdxRosterRec(c.pid).name, c.name,
    `${c.reader.who}: the gate's published read cannot name ${c.pid} from the document under ${c.slug}`);
  ok(!(v.win.PDX_PROFILE_ALIAS || {})[c.slug], `${c.reader.who}: the ${c.slug} alias row is still on the page — the rule is not what is being tested`);
}
// The congressional slot holds the roster id, not the slug the live row is filed under.
eq(voiceCtx(READERS[0].loc).win._pdxUsHouseSeat("Utah", "2"), "maloy",
  "the congressional join seats celeste_maloy instead of the roster id maloy");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · a slug two roster rows share names nobody; no last-name merge");
{
  // A second roster row with the same display name: two people, one slug.
  const twoNames = RN.replace("    maloy: 'Celeste Maloy',", "    maloy: 'Celeste Maloy',\n    maloy_ut_other: 'Celeste Maloy',");
  must(twoNames !== RN, "the shared-slug fixture found no maloy row to double");
  const v = voiceCtx(READERS[0].loc, { names: twoNames });
  const card = cardFor(v.html, "U.S. House District 2");
  has(card, EMPTY, "shared slug: the CD-2 card does not keep the empty sentence");
  no(card, "Celeste Maloy", "shared slug: a name was printed for a slug two roster rows carry");
  no(card.toLowerCase(), "yet", "shared slug: the card says \"yet\"");
  // Two LIVE documents carrying the slug is the same refusal from the other side.
  const live2 = JSON.parse(JSON.stringify(LIVE));
  live2.celeste_maloy_2 = { name: "Celeste Maloy", office: "U.S. Representative", state: "Utah", party: "R" };
  const v2 = voiceCtx(READERS[0].loc, { live: live2 });
  const card2 = cardFor(v2.html, "U.S. House District 2");
  no(card2, "Sitting member: <a", "two live documents with one slug: the card picked one of them");
  no(card2.toLowerCase(), "yet", "two live documents with one slug: the card says \"yet\"");
  // A LAST NAME IS NOT A SLUG. Cory Maloy's document does not name UT-2.
  const live3 = JSON.parse(JSON.stringify(LIVE));
  delete live3.celeste_maloy;
  live3.cory_maloy = { name: "Cory Maloy", office: "U.S. Representative", state: "Utah · District 2", party: "R" };
  const v3 = voiceCtx(READERS[0].loc, { live: live3 });
  eq(v3.win.pdxRosterRec("maloy"), null, "last name: maloy was joined to cory_maloy");
  no(cardFor(v3.html, "U.S. House District 2"), 'href="/p/maloy"', "last name: Cory Maloy's row seated maloy");
  // THE JOHNSONS STAY SEPARATE: John Johnson's seat is not filled by another Johnson.
  const v4 = voiceCtx(READERS[0].loc, { live: { ...LIVE, jjohnson: { name: "Jen Johnson", office: "x", state: "UT" } } });
  eq(v4.win.pdxRosterRec("john_johnson"), null, "johnson: john_johnson was joined to another Johnson");
  // AND A SLUG THAT IS ANOTHER ROSTER ROW'S OWN ID IS THAT PERSON'S FILE.
  const swapped = RN.replace("    tlee: 'Trevor Lee',", "    tlee: 'Stuart Adams',");
  must(swapped !== RN, "the id-collision fixture found no tlee row");
  const v5 = voiceCtx(READERS[0].loc, { names: swapped, live: { ...LIVE, stuart_adams: LIVE.sadams } });
  ok(v5.win.pdxRosterRec("tlee") === null || v5.win.pdxRosterRec("tlee").name !== "Stuart Adams",
    "id collision: tlee was named off a document another roster row's name slug owns");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · mutation: without the unique-slug rule the empty sentence returns");
{
  const mut = RESOLVER.replace(RULE, "");
  must(mut !== RESOLVER, "the mutation found nothing to remove");
  for (const c of CASES) {
    const v = voiceCtx(c.reader.loc, { resolver: mut });
    const card = cardFor(v.html, c.label);
    ok(faults(v.html, c).length > 0, `mutation: ${c.label} still names ${c.name} with the unique-slug rule removed`);
    ok(card.indexOf(EMPTY) >= 0 || card.indexOf(ON_FILE) >= 0,
      `mutation: ${c.label} does not fall back to the empty sentence`);
    no(card.toLowerCase(), "yet", `mutation: ${c.label} says "yet"`);
  }
  // And it is the CD-2 empty sentence exactly, which is the reported defect.
  has(cardFor(voiceCtx(READERS[0].loc, { resolver: mut }).html, "U.S. House District 2"), EMPTY,
    "mutation: the CD-2 card did not return to \"No sitting member on hand for this seat.\"");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · /p/<display-name slug> redirects to /p/<roster id>");
{
  const rules = [...TOML.matchAll(/\[\[redirects\]\]\s*\n((?:[ \t]*[a-z_]+\s*=.*\n?)+)/g)].map((m) => {
    const r = {};
    for (const l of m[1].split("\n")) {
      const kv = /^\s*([a-z_]+)\s*=\s*(.+?)\s*$/.exec(l);
      if (kv) r[kv[1]] = kv[2].replace(/^"|"$/g, "");
    }
    return r;
  });
  const match = (from, path) => from === path || (from.endsWith("/*") && path.startsWith(from.slice(0, -1)));
  const firstFor = (path) => rules.filter((r) => r.from && match(r.from, path))[0] || null;
  for (const [slug, pid] of [["celeste_maloy", "maloy"], ["trevor_lee", "tlee"], ["ariel_defay", "defay_h15"]]) {
    const r = firstFor(`/p/${slug}`);
    must(!!r, `redirect: nothing in netlify.toml claims /p/${slug}`);
    eq(r.to, `/p/${pid}`, `redirect: /p/${slug} does not go to /p/${pid}`);
    eq(r.status, "301", `redirect: /p/${slug} is served (status ${r.status}) rather than redirected — a second file`);
    eq(r.force, "true", `redirect: /p/${slug} is not forced`);
    eq(ACCT[slug], pid, `redirect: /p/${slug} → /p/${pid} is not a pair ACCT_ALIAS holds`);
    eq(NAMES[pid] && NAMES[pid].toLowerCase().replace(/[^a-z0-9]+/g, "_"), slug,
      `redirect: ${slug} is not the slug of ${pid}'s own display name`);
  }
  // The roster address itself is still the served person file.
  const own = firstFor("/p/maloy");
  ok(own && own.to === "/person.html" && own.status === "200", "redirect: /p/maloy is no longer served the person file");
  // Every /p/<x> redirect in the file is a pair ACCT_ALIAS holds.
  rules.filter((r) => /^\/p\/[a-z0-9_]+$/.test(r.from || "")).forEach((r) => {
    const from = r.from.slice(3), to = String(r.to || "").slice(3);
    eq(ACCT[from], to, `redirect: /p/${from} → /p/${to} is not a pair ACCT_ALIAS holds`);
  });
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the identity guard: a PDX_PROFILE_ALIAS row needs ACCT_ALIAS's pair");
{
  eq(ACCT.celeste_maloy, "maloy", "ACCT_ALIAS does not hold celeste_maloy → maloy");
  eq(ACCT.trevor_lee, "tlee", "ACCT_ALIAS does not hold trevor_lee → tlee");
  eq(ACCT.ariel_defay, "defay_h15", "ACCT_ALIAS does not hold ariel_defay → defay_h15");
  // The rows that predate this guard, frozen by name. Nothing may join this
  // list: a new row is legal only where ACCT_ALIAS already holds the same pair.
  // STANCE_ALIASES is not that owner, and it is not read here.
  const PREDATES_GUARD = new Set([
    "kivory=ivory_h39", "wharper=harper_s16", "seliason=eliason_h45", "klisonbee=lisonbee_h14",
    "dmccay=mccay_s11", "jteuscher=teuscher_h44", "ken_ivory=ivory_h39", "eliason=eliason_h45",
    "teuscher=teuscher_h44", "lisonbee=lisonbee_h14", "mccay=mccay_s11", "bridger_bolinder=bolinder_h68", "casey_snider=snider_h5",
    "cory_maloy=cory_maloy_h52", "curt_bramble=cbramble", "don_ipson=dipson", "jerry_stevenson=jstevenson",
    "jill_koford=koford_h10", "luz_escamilla=lescamilla", "matthew_gwynn=gwynn_h6", "nate_blouin=blouin_s13",
    "phil_lyman=lyman", "scott_chew=chew_h68", "scott_sandall=ssandall", "stephen_l_whyte=whyte_h63",
    "stuart_adams=sadams", "tiara_auxier=auxier_h4", "todd_weiler=tweiler", "troy_shelley=shelley_h66",
  ]);
  const unruled = Object.entries(PPA)
    .filter(([k, v]) => ACCT[k] !== v && !PREDATES_GUARD.has(`${k}=${v}`))
    .map(([k, v]) => `${k}=${v}`);
  eq(JSON.stringify(unruled), "[]",
    "PDX_PROFILE_ALIAS holds rows ACCT_ALIAS has not ruled on — add the pair to ACCT_ALIAS first, or drop the row");
  // And the guard is not a hole: an invented pair is refused.
  ok(ACCT.celeste_maloy !== "kennedy" && !PREDATES_GUARD.has("celeste_maloy=kennedy"),
    "the guard would accept a pair ACCT_ALIAS does not hold");
  // The three slug rows are now ACCT_ALIAS pairs, not grandfathered ones.
  SLUG_ROWS.forEach((k) => ok(!PREDATES_GUARD.has(`${k}=${PPA[k]}`), `guard: ${k} is grandfathered instead of ruled`));
}

report();
process.exit(fails.length ? 1 : 0);
