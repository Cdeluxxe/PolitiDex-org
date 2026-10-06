#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-voice-exclusivity-copy.mjs — the room is the seat's, said where a stranger reads
// ─────────────────────────────────────────────────────────────────────────────
// The locked line says only a verified resident of a seat gets a voice that
// counts. Four surfaces now say the other half too, in one sentence each, and
// no new door, composer or board came with them:
//
//   homepage card   the room is the district, not the open internet
//   /voice header   a comment or vote from outside the seat is not a voice there
//   board footer    the board is that seat's room; another seat's flag opens nothing
//   /me membership  paying does not put you in a district you do not live in
//
// WHAT THIS SUITE PROVES:
//   1. Each surface, sliced the way a reader sees it, carries its sentence.
//   2. No "demand" on any of the four surfaces, and no stock, share, earn,
//      Form C or premium in the new sentences. No "yet" on /voice.
//   3. The locked line is still verbatim; the footer is the same on every board
//      (generated, statewide, hand-written composer boards).
//   4. The /me cap sentence stays, and the 429 cap lines carry no pitch.
//   5. MUTATION: deleting any one sentence fails the checks.
//   6. The homepage coverage count is BOARD_ROUTES.length, which is 88.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { CAP_COPY } from "../netlify/lib/membership-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ voice exclusivity copy: STALE HARNESS — ${m}`); process.exit(1); } };

const SENT = {
  home: "The room is the district, not the open internet: it is for the neighbors of that seat, not anyone with an account.",
  voice: "A comment or a vote from outside the seat is not a voice in that room.",
  board: "This board is this seat’s room, and a flag for another seat does not open it.",
  me: "Paying does not put you in a district you do not live in.",
};
const LOCKED = (R("district-composer.js").match(/var LOCKED_LINE = '([^']+)';/) || [])[1];
must(LOCKED, "district-composer.js no longer declares LOCKED_LINE in a readable shape");

const BANNED_NEW = /\bstocks?\b|\bshares?\b|\bshareholders?\b|\bearn(?:s|ed|ing|ings)?\b|\bform\s*c\b|\bpremium\b|\bequity\b|\bdemand/i;
const DEMAND = /\bdemand/i;

const textOf = (h) => String(h)
  .replace(/<!--[\s\S]*?-->/g, " ")
  .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&mdash;/g, "—").replace(/&amp;/g, "&")
  .replace(/\s+/g, " ").trim();

// ── THE FOUR SLICES ─────────────────────────────────────────────────────────
function homeSlice(src) {
  const a = src.indexOf("<!-- pdx:home-voice-gate:begin -->");
  const b = src.indexOf("<!-- pdx:home-voice-gate:end -->");
  return a >= 0 && b > a ? src.slice(a, b) : "";
}
function voiceSlice(src) {
  const m = /<p class="pdxvr-sub">([\s\S]*?)<\/p>/.exec(src);
  return m ? textOf(m[1]) : "";
}
function hubHd(dv) {
  const at = dv.indexOf("hubHd:");
  if (at < 0) return "";
  const end = dv.indexOf("',\n", at);
  return (dv.slice(at, end + 2).match(/'(?:[^'\\]|\\.)*'/g) || []).map((q) => q.slice(1, -1)).join("");
}
function meSlice(src) {
  return textOf((src.match(/<!-- pdx:me-membership:begin[\s\S]*?<!-- pdx:me-membership:end -->/) || [""])[0]);
}
function boardFeet(alias, src) {
  const win = makeSandbox();
  win.__PDX_DISTRICT_BOARD_SEAT = alias;
  const ctx = vm.createContext(win);
  for (const f of ["cmp-data.js", "issue-map.js"]) vm.runInContext(R(f), ctx, { filename: f });
  vm.runInContext(src, ctx, { filename: "district-board.js" });
  const M = win.PDXDistrictBoard;
  const el = { innerHTML: "", getAttribute: (k) => (k === "data-pdxdb-seat" ? alias : null),
    querySelector() { return null; }, contains() { return false; } };
  if (!(M && M.mount(el))) return { M, feet: [] };
  // The footer that carries the locked line: band 3's (the table band). Band 2
  // has a footer of its own about how residency is used, and it is not this one.
  const table = (/<section class="pdxdb-band pdxdb-band--table"[\s\S]*?<\/section>/.exec(el.innerHTML) || [""])[0];
  const feet = [...table.matchAll(/<p class="pdxdb-foot">([\s\S]*?)<\/p>/g)]
    .map((m) => m[1].replace(/&#39;/g, "'").replace(/&amp;/g, "&"));
  return { M, feet };
}
// Generated, statewide and hand-written composer boards.
const BOARDS = ["ut-hd-29", "ut-sd-6", "ut-gov", "ut-us-senate-lee", "ut-sd-3", "ut-hd-16", "ut-cd-2"];

// Every check, against whatever sources it is handed, so a mutation runs the
// same checks the tree does.
function check(S) {
  const out = [];
  const need = (c, m) => { if (!c) out.push(m); };

  // Homepage card.
  const gate = homeSlice(S.index);
  const card = textOf(gate);
  need(card.length > 120, "home: the card slice is too thin");
  need(card.indexOf(SENT.home) >= 0, "home: the exclusivity sentence is missing");
  need(!DEMAND.test(card), "home: the card says demand");
  need((gate.match(/<a\b/g) || []).length === 1, "home: the card is not one anchor");
  need(/<a class="pdxhv-door"[^>]*href="\/voice"/.test(gate), "home: the one anchor is not /voice");
  need(/\.pdxhv-card\{[^}]*rgba\(245,200,66/.test(gate), "home: the gold edge is gone");
  // In the body: after the line, before the door.
  const lineAt = card.indexOf("Only verified residents of that seat get a voice that counts.");
  const doorAt = card.indexOf("Find your rooms");
  const sAt = card.indexOf(SENT.home);
  need(lineAt >= 0 && sAt > lineAt && doorAt > sAt, "home: the sentence is not in the body, between the line and the door");

  // /voice header, in the document and in the owner's copy.
  const sub = voiceSlice(S.voice);
  need(sub.indexOf(SENT.voice) >= 0, "/voice: the header lacks the exclusivity sentence");
  need(sub.indexOf("Anyone can read a board. Only verified residents of that seat get a voice that counts.") >= 0,
    "/voice: the existing read/voice line is gone");
  need(!/\byet\b/i.test(sub), "/voice: the header says yet");
  need(!DEMAND.test(sub), "/voice: the header says demand");
  const hd = hubHd(S.dv);
  need(hd === sub, `/voice: district-voice.js's hubHd and the document's header differ (${JSON.stringify(hd)})`);

  // Board footer, on every kind of board.
  for (const alias of BOARDS) {
    const { M, feet } = boardFeet(alias, S.board);
    need(feet.length > 0, `${alias}: the board printed no footer`);
    for (const f of feet) {
      need(f.indexOf(SENT.board) >= 0, `${alias}: the footer lacks the seat-room sentence`);
      need(f.indexOf(LOCKED) >= 0, `${alias}: the footer lost the locked line`);
      need(!DEMAND.test(f), `${alias}: the footer says demand`);
    }
    need(!!M && M.COPY && M.COPY.voiceFoot === feet[0], `${alias}: the footer is not COPY.voiceFoot`);
  }

  // /me membership block.
  const me = meSlice(S.me);
  need(me.indexOf(SENT.me) >= 0, "/me: the membership block lacks the district sentence");
  need(/membership does not verify residency and does not open a seat/i.test(me), "/me: the residency half is gone");
  need(/\$20 a year removes the cap/i.test(me), "/me: the cap sentence is gone");
  need(!DEMAND.test(me), "/me: the block says demand");
  return out;
}

const TREE = {
  index: R("index.html"), voice: R("voice.html"), dv: R("district-voice.js"),
  board: R("district-board.js"), me: R("me.html"),
};

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the four surfaces carry the sentence");
// ═════════════════════════════════════════════════════════════════════════════
{
  const f = check(TREE);
  eq(f.join(" | "), "", "the tree passes every surface check");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the new copy is clean");
// ═════════════════════════════════════════════════════════════════════════════
for (const [k, s] of Object.entries(SENT)) {
  ok(!BANNED_NEW.test(s), `${k}: the new sentence carries a banned word — ${s}`);
  ok(!/\byet\b/i.test(s), `${k}: the new sentence says yet`);
  ok(s.indexOf(LOCKED) < 0, `${k}: the new sentence is not a second copy of the locked line`);
}
ok(!/\d/.test(SENT.home), "home: the new sentence prints no figure (the card face carries none)");
// The banned sweep itself catches what it should.
for (const w of ["stock", "shares", "earn", "Form C", "premium", "demand"]) {
  ok(BANNED_NEW.test(`A sentence with ${w} in it.`), `the banned sweep misses "${w}"`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the locked line stays verbatim, and the cap lines carry no pitch");
// ═════════════════════════════════════════════════════════════════════════════
eq(LOCKED, "Only verified residents of this seat get a voice that counts.", "the locked line");
for (const f of ["district-ut-sd-3.html", "district-ut-hd-16.html", "district-ut-sd-7.html", "district-ut-hd-15.html", "district-ut-cd-2.html"]) {
  ok(R(f).indexOf(`data-pdxdc-locked="1">${LOCKED}</p>`) >= 0, `${f}: the locked line is still served verbatim`);
}
for (const [k, line] of Object.entries(CAP_COPY)) {
  ok(!/\$|member|upgrade|pay|unlock|premium|subscribe|join/i.test(line), `429 ${k}: the cap line is not a pitch — ${line}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · mutation: deleting any one sentence fails");
// ═════════════════════════════════════════════════════════════════════════════
{
  const strip = (src, s) => src.split(s).join("");
  const voiceTwoLines = (src) => src.replace(/ A comment or a vote from outside the seat is not a voice in that room\./g, "")
    .replace(/A comment or a vote from outside\s+the seat is not a voice in that room\./g, "");
  const MUT = [
    ["home", { ...TREE, index: strip(TREE.index, SENT.home) }],
    ["/voice document", { ...TREE, voice: voiceTwoLines(TREE.voice) }],
    ["board", { ...TREE, board: TREE.board.replace(/\s*\+\s*'This board is this seat’s room, and a flag for another seat does not open it\.'/, "") }],
    ["/me", { ...TREE, me: strip(TREE.me, " " + SENT.me) }],
  ];
  for (const [name, S] of MUT) {
    const changed = Object.keys(S).some((k) => S[k] !== TREE[k]);
    must(changed, `mutation ${name}: the sentence could not be found to delete`);
    ok(check(S).length > 0, `mutation: deleting the ${name} sentence passed the checks`);
  }
  // A "demand" slipped onto a surface is caught too.
  ok(check({ ...TREE, me: TREE.me.replace(SENT.me, SENT.me + " Demand a seat.") }).length > 0,
    "mutation: a demand on /me passed the checks");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · nothing new: BOARD_ROUTES is 88 and the homepage counts it");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = makeSandbox();
  vm.runInContext(TREE.dv, vm.createContext(w), { filename: "district-voice.js" });
  const n = Object.keys(w.PDXVoice.BOARD_ROUTES).length;
  eq(n, 88, "BOARD_ROUTES length");
  const ONES = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  const spell = (k) => k < 20 ? ONES[k] : k < 100 ? TENS[Math.floor(k / 10)] + (k % 10 ? "-" + ONES[k % 10] : "") : String(k);
  const word = spell(n);
  const card = textOf(homeSlice(TREE.index));
  ok(card.indexOf(`${word[0].toUpperCase() + word.slice(1)} seats have a board on file today.`) >= 0,
    "the homepage coverage sentence counts BOARD_ROUTES.length");
  ok(!/from\s*=\s*"\/district\/\*"/.test(R("netlify.toml")), "no /district/* splat");
  ok(R("district-composer.js").indexOf("var COMPOSER_SEATS") >= 0, "the composer allow-list is still where it was");
}

if (failures.length) {
  console.log(`\n   ${passed} passed, ${failures.length} failed\n`);
  for (const f of failures) console.log(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`\n   ✓ voice exclusivity copy: all ${passed} assertions passed`);
