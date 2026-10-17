#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-room-for-residents.mjs — the rooms stay with the people who live there
// ─────────────────────────────────────────────────────────────────────────────
// The locked line says WHO gets a voice that counts. One short sentence now
// says why, in two places, and adds no gate:
//
//   every board    under the general room (a sibling of district-board.js's
//                  frame, so district-composer.js's repaint never wipes it)
//   /voice cards   under the Open board door, on a seat with a board only
//
// WHAT THIS SUITE PROVES:
//   1. Every board document on disk (hand-opened, generated, statewide) carries
//      the composer host, so the general room paints, and the painted board
//      puts the sentence directly under that room, once.
//   2. /voice cards for boarded seats carry it under the door; cards for seats
//      without a board do not.
//   3. The locked line is unchanged, in the composer, the server core and every
//      document.
//   4. No membership, stock, premium, equity or other sales word in the copy.
//   5. MUTATION: removing the sentence, or adding sales language, fails.
//
//   node scripts/test-room-for-residents.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { LOCKED_LINE as CORE_LOCKED } from "../netlify/lib/district-board-voice-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ room for residents: STALE HARNESS — ${m}`); process.exit(2); } };

// Fixed here, so "word for word" is this string and not whatever the tree says.
const LINE = "This room is for the people who live in this district. Outside noise stays outside.";
const LOCKED = "Only verified residents of this seat get a voice that counts.";
const BANNED = /\bmembers?\b|\bmembership\b|\bstocks?\b|\bshares?\b|\bshareholders?\b|\bpremium\b|\bequity\b|\binvest|\bearn|\bprofits?\b|\bsubscri|\bpaid\b|\bpay\b|\bupgrade\b|\bjoin\b|\bform\s*c\b/i;

const SRC = {
  board: R("district-board.js"),
  dv: R("district-voice.js"),
  vr: R("voice-room.js"),
  composer: R("district-composer.js"),
};
const DOCS = readdirSync(ROOT).filter((f) => /^district-ut-[a-z0-9-]+\.html$/.test(f)).sort();
must(DOCS.length >= 88, `expected at least 88 board documents, found ${DOCS.length}`);
const DOC_SRC = Object.fromEntries(DOCS.map((f) => [f, R(f)]));

const unesc = (h) => String(h).replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

// ── THE BOARD, MOUNTED THE WAY A DOCUMENT MOUNTS IT ─────────────────────────
function mountBoard(alias, src) {
  const win = makeSandbox();
  win.__PDX_DISTRICT_BOARD_SEAT = alias;
  win.document.getElementById = (id) => (id === "pdx-district-composer" ? {} : null);
  const ctx = vm.createContext(win);
  for (const f of ["cmp-data.js", "issue-map.js"]) vm.runInContext(R(f), ctx, { filename: f });
  vm.runInContext(src, ctx, { filename: "district-board.js" });
  const M = win.PDXDistrictBoard;
  const el = { innerHTML: "", getAttribute: (k) => (k === "data-pdxdb-seat" ? alias : null),
    querySelector() { return null; }, contains() { return false; } };
  const mounted = !!(M && M.mount(el));
  return { M, mounted, html: el.innerHTML };
}

// ── /voice, booted the way voice.html boots it ──────────────────────────────
function hub(S) {
  const win = makeSandbox();
  win.document.getElementById = () => null;
  win.__PDX_VOICE_DOC = true;
  win.location = { href: "https://politidex.fyi/voice", pathname: "/voice", search: "", hash: "", origin: "https://politidex.fyi", assign() {}, replace() {} };
  win.PROFILES = {};
  win.CMP_DATA = {};
  win._pdxPersonById = () => null;
  const ctx = vm.createContext(win);
  vm.runInContext(S.dv, ctx, { filename: "district-voice.js" });
  vm.runInContext(S.vr, ctx, { filename: "voice-room.js" });
  return { V: win.PDXVoice, VR: win.PDXVoiceRoom };
}

// The paragraph straight after the general room's frame, whatever its class.
const GENERAL_THEN = /<section class="pdxdb-band pdxdb-band--general"[\s\S]*?<\/section>(<p\b[^>]*>([\s\S]*?)<\/p>)?/;

function check(S, opts) {
  const out = [];
  const need = (c, m) => { if (!c) out.push(m); };
  const docs = (opts && opts.docs) || DOCS;

  // 1 · every board document
  for (const f of docs) {
    const doc = DOC_SRC[f];
    const alias = (/data-pdxdb-seat="([^"]+)"/.exec(doc) || [])[1];
    need(!!alias, `${f}: no seat declared on the board host`);
    if (!alias) continue;
    need(doc.includes(`id="pdx-district-composer" data-pdxdc-seat="${alias}"`), `${f}: no composer host, so no general room`);
    need(doc.includes(`<p class="pdxdc-locked" data-pdxdc-locked="1">${LOCKED}</p>`), `${f}: the served locked line changed`);
    let b;
    try { b = mountBoard(alias, S.board); } catch (e) { need(false, `${f}: the board threw (${e.message})`); continue; }
    need(b.mounted, `${f}: the board did not mount`);
    const m = GENERAL_THEN.exec(b.html);
    need(!!m, `${f}: the painted board has no general room`);
    need(!!(m && m[1]), `${f}: nothing printed under the general room`);
    if (m && m[1]) {
      need(/data-pdxdb-room-for=""/.test(m[1]), `${f}: the paragraph under the general room is not the room line`);
      need(unesc(m[2]) === LINE, `${f}: the line under the general room reads ${JSON.stringify(unesc(m[2]))}`);
      need(!BANNED.test(unesc(m[2])), `${f}: the room line carries a sales word`);
    }
    need(b.html.split("data-pdxdb-room-for").length === 2, `${f}: the room line prints more than once`);
  }

  // 2 · /voice cards
  let H;
  try { H = hub(S); } catch (e) { need(false, `/voice: the hub threw (${e.message})`); return out; }
  need(!!(H.V && H.VR && typeof H.VR.seatHtml === "function"), "/voice: the hub did not boot");
  if (!(H.V && H.VR)) return out;
  const boardFor = H.V.boardPath("ut-statesenate-3");
  need(!!boardFor, "/voice: SD-3 has no board route to test against");
  const on = H.VR.seatHtml({ name: "State Senate District 3", board: boardFor || "/district/ut-sd-3", pid: "" });
  const off = H.VR.seatHtml({ name: "State House District 17", board: "", pid: "" });
  const onText = unesc(on);
  const door = onText.indexOf('class="pdxvr-door"');
  const at = onText.indexOf(LINE);
  need(door >= 0, "/voice: a boarded card has no Open board door");
  need(at > door, "/voice: a boarded card lacks the room line under its Open board door");
  need(onText.split(LINE).length === 2, "/voice: the boarded card says the room line more than once");
  need(new RegExp(`<p class="pdxvr-roomfor">${LINE}</p>`).test(onText), "/voice: the room line is not its own paragraph");
  need(unesc(off).indexOf(LINE) < 0, "/voice: a card for a seat without a board carries the room line");
  need(/pdxvr-none/.test(off), "/voice: the no-board card lost its no-board sentence");
  need(H.V.COPY && H.V.COPY.boardRoomFor === LINE, "/voice: district-voice.js's boardRoomFor is not the line");
  need(!BANNED.test(String(H.V.COPY && H.V.COPY.boardRoomFor)), "/voice: the room line carries a sales word");
  // The header line stays as it shipped.
  need(String(H.V.COPY && H.V.COPY.hubHd).indexOf("Only a verified resident of that seat gets a voice that counts.") >= 0,
    "/voice: the header line changed");

  // 3 · the locked line
  need((S.composer.match(/var LOCKED_LINE = '([^']+)';/) || [])[1] === LOCKED, "composer: LOCKED_LINE changed");
  need(CORE_LOCKED === LOCKED, "server core: LOCKED_LINE changed");
  return out;
}

section("1–4 · the tree");
{
  const out = check(SRC);
  ok(out.length === 0, `the tree: ${out.slice(0, 8).join("; ")}`);
  if (!out.length) console.log(`      ✓ ${DOCS.length} board documents, /voice cards, locked line`);
  ok(!BANNED.test(LINE), "the fixed line itself carries no sales word");
  ok(/\.pdxdb-room-for\s*\{/.test(R("district-board.css")), "district-board.css styles the board line");
  ok(/\.pdxvr-roomfor\s*\{/.test(R("voice.html")), "voice.html styles the card line");
}

section("5 · mutation");
{
  const QUICK = ["district-ut-sd-3.html", "district-ut-hd-29.html", "district-ut-gov.html"];
  const SALES = "This room is for the people who live in this district. Members get premium access.";
  const swap = (src, from, to) => { must(src.includes(from), `mutation anchor missing: ${from.slice(0, 50)}`); return src.split(from).join(to); };
  const muts = [
    ["board: sentence removed", { board: swap(SRC.board, `'${LINE}'`, "''") }],
    ["board: sales language", { board: swap(SRC.board, `'${LINE}'`, `'${SALES}'`) }],
    ["board: printed inside the frame", { board: swap(SRC.board, "'</section>' +\n      // A sibling", "'' +\n      // A sibling").replace("esc(COPY.roomFor) + '</p>';", "esc(COPY.roomFor) + '</p></section>';") }],
    ["/voice: sentence removed", { dv: swap(SRC.dv, `'${LINE}'`, "''") }],
    ["/voice: sales language", { dv: swap(SRC.dv, `'${LINE}'`, `'${SALES}'`) }],
    ["/voice: printed on a seat without a board", { vr: swap(SRC.vr,
      "door = '<p class=\"pdxvr-none\">' +", "door = '<p class=\"pdxvr-roomfor\">' + esc(copy('boardRoomFor')) + '</p>' + '<p class=\"pdxvr-none\">' +") }],
    ["composer: locked line edited", { composer: swap(SRC.composer, `'${LOCKED}'`, "'Only verified residents can post.'") }],
  ];
  for (const [name, patch] of muts) {
    const out = check({ ...SRC, ...patch }, { docs: QUICK });
    ok(out.length > 0, `mutation "${name}" was not caught`);
  }
}

console.log(`\n${failures.length ? "✗" : "✓"} room for residents: ${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log(`   ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
