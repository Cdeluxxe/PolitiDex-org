#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-district-voice.mjs — District Voice fails closed, and it is a PLACE
// rather than a score, a match percentage or a comment section on a person
// ─────────────────────────────────────────────────────────────────────────────
// Slice 1 is one Utah seat where a verified neighbour can (1) see who sits in it,
// (2) answer one live question on an issue that seat actually touches, and (3)
// post one short take keyed to an existing ISSUE_MAP key. That sentence is the
// product rule, and every assertion below is one of its edges.
//
//   1. ONE ADDRESS, ONE DISTRICT MAP. /d/ut-statehouse-68 is canonical.
//      /d/ut-hd-68 is an ALIAS that normalizes to it — the same place, the same
//      row, one spelling out. The gate, the client and the district file all
//      normalize identically, and the alias is deliberately not crawled.
//   2. THE FLAGSHIP FILE MOUNTS. HD-68 with Chew's pid on the letterhead, ONE
//      poll slot, zero takes → an honest empty SENTENCE, never a fake feed.
//   3. READ IS FREE, VOICE IS GATED. A signed-out reader with no account, no
//      location and no residency gets the question, the counts and every take.
//      Only the two writes are gated, by the same claim, in the same order.
//   4. FAIL CLOSED, EXHAUSTIVELY. no seat → no write. no issue → no write.
//      unverified → no write. verified for a DIFFERENT seat → no write. bad body
//      → no write. And no combination of inputs reaches an allow without every
//      condition being affirmatively true — checked over the whole product, not
//      by example.
//   5. AN UNKNOWN issueKey IS REFUSED THREE TIMES: by the gate, by the
//      vocabulary read in the Function, and by the foreign key in the schema.
//   6. COUNTS, NOT A SCORE. One integer per option and the number of people who
//      answered. No percentage, no proportion, no bar, no leader, no composite
//      and no "district mood" number anywhere in the core, the Function, the
//      client or the sheet.
//   7. THE WALLS. Voice writes no formal act, stance, Direction Match, finance or
//      baseline; it takes, stores and returns no pid; it has no party field, no
//      upvote and no reply. And the twin boot holds: cox / lee / chew_h68 read
//      byte-identical on DM, Word vs Action and the finance lane with
//      district-voice.js loaded and without.
//   8. THE COPY. The required sentence is on the file. The banned register — team
//      loyalty, mandate percentages, approval rating, "the district believes" —
//      is in none of the four shipped files.
//   9. TWO MOUNTS, NO NEW NAV. The seat row in Who Represents Me and one quiet
//      link on the sitting member's person file. No top-nav destination.
//
//   node scripts/test-district-voice.mjs
//
// The gate is IMPORTED from the same .mjs the Function imports, so the refusals
// checked here are literally the refusals that ship. The client modules run in a
// node:vm sandbox with a small real DOM and the REAL seat resolver from
// ballot-breakdown.js, so "the honest empty renders" and "Chew is on the
// letterhead" are observed rather than asserted about source text.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import {
  COPY as CORE_COPY,
  COUNTY_STATEHOUSE,
  ISSUE_KEY_RE,
  OPTION_KEY_RE,
  POLL_OPTIONS_MAX,
  POLL_OPTIONS_MIN,
  RESIDENCY_METHODS,
  RESIDENCY_STATUSES,
  RESIDENCY_VERIFIER,
  SEAT_ALIAS_RE,
  SEAT_KEY_RE,
  SEAT_PATH_RE,
  SEAT_PREFIX,
  TAKES_CAP,
  TAKE_MAX,
  VOICE_SEATS,
  VOICE_STATES,
  authorHash,
  composerState,
  decideAnswer,
  decideTake,
  isSeatAlias,
  neighborLine,
  normalizeCounty,
  normalizeSeatKey,
  normalizeTakeBody,
  pollCountLine,
  pollCounts,
  residencyClaim,
  residencyNote,
  seatFromLocation,
  seatFromPath,
  seatPath,
  stateAllowed,
  takeBodyTooLong,
  verifyVendor,
  voiceShipped,
} from "../netlify/lib/district-voice-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const CORE_SRC = R("netlify/lib/district-voice-core.mjs");
const FN_SRC = R("netlify/functions/district-voice.mts");
const VOICE_SRC = R("district-voice.js");
const VOICE_CSS = R("district-voice.css");
const FILE_SRC = R("district-file.js");
const FILE_CSS = R("district-file.css");
const ROOM_SRC = R("district-room.js");
const BALLOT_SRC = R("ballot-breakdown.js");
const PERSON_SRC = R("person-file.js");
const PERSON_CSS = R("person-file.css");
const WRM_SRC = R("who-represents-me.js");
const SCHEMA = R("db/schema.ts");
const INDEX = R("index.html");
const TOML = R("netlify.toml");
const SITEMAP = R("sitemap.xml");
const GEN_SITEMAP = R("scripts/gen-sitemap.mjs");
const MIG_TABLES = R("netlify/database/migrations/20261103000000_create_voice_tables/migration.sql");
const MIG_SEED = R("netlify/database/migrations/20261104000000_seed_voice_hd68_poll.sql");

const HD68 = "ut-statehouse-68";
const HD68_ALIAS = "ut-hd-68";
const CHEW = "chew_h68";
const FLAGSHIP_ISSUE = "lands_preserve";

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const no = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
// A probe that finds nothing fails loudly, or a rename turns this whole file
// into a very fast, very green no-op.
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ district-voice: STALE PROBE — ${msg}`);
  process.exit(2);
};

// Comments in this repo have to be able to name what the code refuses to build
// ("no party letter", "not a leaderboard", "no percentage"), so every
// source-level refusal runs over a comment-stripped copy.
const strip = (src) =>
  String(src).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

const CORE_CODE = strip(CORE_SRC);
const FN_CODE = strip(FN_SRC);
const VOICE_CODE = strip(VOICE_SRC);
const FILE_CODE = strip(FILE_SRC);
const CSS_CODE = String(VOICE_CSS).replace(/\/\*[\s\S]*?\*\//g, " ");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · One address, and one district map");

eq(SEAT_PREFIX, "/d/", "Voice lives under the district file's own prefix");
eq(normalizeSeatKey(HD68), HD68, "the canonical key normalizes to itself");
eq(normalizeSeatKey(HD68_ALIAS), HD68,
  "the alias /d/ut-hd-68 normalizes to the canonical /d/ut-statehouse-68");
eq(normalizeSeatKey("UT-HD-68"), HD68, "and case is not a second spelling");
eq(normalizeSeatKey(" ut-hd-68 "), HD68, "and neither is whitespace");
eq(isSeatAlias(HD68_ALIAS), true, "the alias knows it is one");
eq(isSeatAlias(HD68), false, "and the canonical key is not an alias of itself");
eq(normalizeSeatKey("ut-sd-6"), "ut-statesenate-6", "sd aliases the state senate");
eq(normalizeSeatKey("ut-cd-2"), "ut-house-2", "cd aliases the U.S. House");

// NO SECOND DISTRICT MAP. The alias is a SPELLING, so every alias must resolve to
// a key the canonical shape already accepts — an alias that composed a key the
// canonical pattern refuses would be a second vocabulary.
for (const raw of ["ut-hd-1", "ut-hd-68", "ut-sd-29", "ut-cd-4", "ca-hd-12"]) {
  const k = normalizeSeatKey(raw);
  ok(SEAT_KEY_RE.test(k), `${raw} normalizes to a key the canonical shape accepts (got ${k})`);
}
// And nothing else is a seat.
for (const bad of ["", " ", "ut-68", "ut-hd-0", "ut-hd", "hd-68", "ut-xd-68",
  "ut-statehouse-68/lands_preserve", "ut-statehouse-0", "utstatehouse68",
  "ut-hd-68-extra", "../ut-hd-68", "ut-hd-68?x=1"]) {
  eq(normalizeSeatKey(bad), "", `"${bad}" is not a seat`);
  eq(seatPath(bad), "", `"${bad}" builds no address`);
}

eq(seatPath(HD68_ALIAS), "/d/" + HD68, "an alias builds the CANONICAL address, never its own");
eq(seatFromPath("/d/" + HD68_ALIAS), HD68, "arriving on the alias resolves the canonical seat");
eq(seatFromPath("/d/" + HD68), HD68, "and so does arriving on the canonical one");
eq(seatFromPath("/d/" + HD68 + "/"), HD68, "a trailing slash is not a second address");
// One segment. Two segments is the District Room's address, and Voice does not
// answer for it.
eq(seatFromPath("/d/" + HD68 + "/" + FLAGSHIP_ISSUE), "",
  "a room's two-segment address is not a seat file");
eq(seatFromPath("/p/" + CHEW), "", "a person file is not a seat file");
ok(SEAT_PATH_RE.test("/d/" + HD68) && !SEAT_PATH_RE.test("/d/a/b"),
  "the path pattern takes one segment and refuses two");

// ONE SEAT SHIPS, and the allow-list is the whole of it.
eq(Object.keys(VOICE_SEATS).length, 1, "exactly one seat has a Voice in slice 1");
eq(Object.keys(VOICE_SEATS)[0], HD68, "and it is HD-68, spelled canonically");
eq(voiceShipped(HD68), true, "HD-68 has a Voice");
eq(voiceShipped(HD68_ALIAS), true, "and the alias reaches it");
eq(voiceShipped("ut-statehouse-67"), false,
  "HD-67 is mapped and real and has no Voice yet — which is true, and is the answer");
eq(voiceShipped("ut-house-2"), false, "no congressional seat has one");

// THE CLIENT AND THE GATE SPELL IT IDENTICALLY. Two copies of a pattern is two
// answers; the suite is where they are held to being one.
const CLIENT_SEAT_RE = /var SEAT_KEY_RE = (\/.*\/);/.exec(VOICE_SRC);
const CLIENT_ALIAS_RE = /var ALIAS_RE = (\/.*\/);/.exec(VOICE_SRC);
must(CLIENT_SEAT_RE && CLIENT_ALIAS_RE, "district-voice.js no longer declares its two patterns");
eq(CLIENT_SEAT_RE[1], String(SEAT_KEY_RE), "the client's seat pattern is the gate's");
eq(CLIENT_ALIAS_RE[1], String(SEAT_ALIAS_RE), "the client's alias pattern is the gate's");

// THE DISTRICT FILE NORMALIZES TOO, so a cold arrival on the alias opens the file
// instead of falling through to the front page.
has(FILE_SRC, "var ALIAS_RE", "district-file.js learned the alias");
has(FILE_SRC, "function normalizeKey", "and normalizes every spelling in one place");

// The rewrite that serves a cold arrival.
has(TOML, 'from = "/d/*"', "netlify.toml still serves /d/* this same index.html");

// AND THE SHORT SPELLING IS SETTLED BY THE SERVER, NOT ONLY BY THE CLIENT.
// The client normalizes, and that is what moves the address bar for a reader who
// is already running the app. It is NOT what saves a cold visit: a pasted
// /d/ut-hd-68 with the wildcard rewrite in front of it would be served
// index.html at 200 and the alias would become a second permanent address for
// one seat. The exact 301 below settles it before a byte of JavaScript runs, so
// "it must not fall through to the homepage" is true whether or not this file's
// scripts load at all.
{
  const alias1 = TOML.indexOf('from = "/d/ut-hd-68"');
  const alias2 = TOML.indexOf('from = "/d/ut-hd-68/*"');
  const wild = TOML.indexOf('from = "/d/*"');
  ok(alias1 >= 0, "netlify.toml redirects the alias /d/ut-hd-68");
  ok(alias2 >= 0, "and the alias form of a room address too");
  // ORDER IS THE RULE. Netlify takes the first match, so the wildcard standing
  // ahead of these would swallow them and the redirect would never run.
  ok(alias1 < wild, "the alias rule stands BEFORE the /d/* wildcard rewrite");
  ok(alias2 < wild, "and so does the alias room rule");
  const block = TOML.slice(alias1, wild);
  has(block, 'to = "/d/' + HD68 + '"', "the alias points at the canonical seat address");
  has(block, "status = 301", "as a permanent redirect — the alias is a nickname, not a page");
  has(block, "force = true", "and it fires even though nothing else claims that path");
  has(block, 'to = "/d/' + HD68 + '/:splat"',
    "and an alias room address keeps its issue segment on the way over");
  // No rule moves the canonical address anywhere. One 301, one direction.
  no(TOML, 'from = "/d/' + HD68 + '"',
    "and nothing redirects the canonical address — the normalization runs one way");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · Read is free and ungated. Only the two writes are gated.");

// THE READ TAKES NO TOKEN AND DEMANDS NONE. The Function's GET calls verifyUser()
// only to personalize, and there is no path where a missing token turns a read
// into a refusal.
const readFn = /async function readSeat\([\s\S]*?\n}/.exec(FN_CODE);
must(readFn, "readSeat() was renamed — the read-is-open probe is stale");
no(readFn[0], "401", "the seat read never answers 401");
no(readFn[0], "signed_out", "and never refuses a signed-out reader");
has(readFn[0], "verifyUser", "it still asks who is looking, to mark their own take");

// A signed-out reader gets a composer that is CLOSED with a sentence, not a
// hidden block.
const anon = composerState(residencyClaim(null, null, "", HD68), HD68);
eq(anon.canPost, false, "a signed-out reader cannot post");
ok(anon.note.length > 20, "and is told why in a sentence");
has(anon.note, "Reading stays open", "which says out loud that reading is not gated");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · Residency: a consistency check on the reader's own datum");

eq(VOICE_STATES.length, 1, "one state in this pass");
eq(VOICE_STATES[0], "UT", "and it is Utah, the only state whose districts resolve");
eq(stateAllowed("Utah"), true, "the saved location's own spelling is accepted");
eq(stateAllowed("UT"), true, "and so is the postal code");
for (const s of ["", "Idaho", "ID", "National", "Nevada"]) {
  eq(stateAllowed(s), false, `"${s}" is not in scope for Voice`);
}

eq(normalizeCounty("Uintah County"), "uintah", "the county's stored spelling normalizes");
eq(normalizeCounty("  UINTAH  county "), "uintah", "and so does its noisy one");
eq(normalizeCounty("Salt Lake County"), "salt lake", "a two-word county keeps its space");

// THE PAIR MUST BE REAL IN BOTH DIRECTIONS. A county the map holds AND a house
// district that county actually contains.
eq(seatFromLocation({ state: "Utah", county: "Uintah County", houseDistrict: 68 }), HD68,
  "Uintah County + 68 is a real pair and resolves to HD-68");
eq(seatFromLocation({ state: "Utah", county: "Daggett", houseDistrict: "68" }), HD68,
  "Daggett County is in HD-68 too");
eq(seatFromLocation({ state: "Utah", county: "Duchesne County", houseDistrict: 67 }), "ut-statehouse-67",
  "Duchesne County resolves to its own seat, HD-67");
// THE INCONSISTENT CLAIM. Salt Lake County does not contain 68, so pairing them
// resolves to nothing at all rather than to HD-68.
eq(seatFromLocation({ state: "Utah", county: "Salt Lake County", houseDistrict: 68 }), "",
  "Salt Lake County + 68 is not a real pair and reaches no seat");
eq(seatFromLocation({ state: "Utah", county: "Uintah County", houseDistrict: 22 }), "",
  "and neither is Uintah County + 22");
// FAIL CLOSED on every kind of missing or unusable datum.
for (const [loc, why] of [
  [null, "no location object at all"],
  [{}, "an empty location"],
  [{ state: "Utah" }, "a state with no county"],
  [{ state: "Utah", county: "Uintah" }, "a county with no district"],
  [{ state: "Utah", county: "Nowhere", houseDistrict: 68 }, "a county the map does not hold"],
  [{ state: "Idaho", county: "Ada", houseDistrict: 1 }, "a location outside Utah"],
  [{ state: "Utah", county: "Uintah", houseDistrict: 0 }, "district zero"],
  [{ state: "Utah", county: "Uintah", houseDistrict: -68 }, "a negative district"],
  [{ state: "Utah", county: "Uintah", houseDistrict: "sixty-eight" }, "a district that is not a number"],
]) {
  eq(seatFromLocation(loc), "", `${why} resolves no seat`);
}

// Every district named in the county map is a seat the canonical shape accepts,
// so this table cannot place somebody in a key the app does not map.
for (const [county, districts] of Object.entries(COUNTY_STATEHOUSE)) {
  ok(Array.isArray(districts) && districts.length > 0, `${county} names at least one district`);
  for (const n of districts) {
    ok(SEAT_KEY_RE.test(`ut-statehouse-${n}`), `${county}/${n} composes a real seat key`);
  }
}
// HD-68 is reachable from exactly the two counties the curated map puts in it.
const hd68Counties = Object.entries(COUNTY_STATEHOUSE)
  .filter(([, ds]) => ds.includes(68)).map(([c]) => c).sort();
eq(JSON.stringify(hd68Counties), JSON.stringify(["daggett", "uintah"]),
  "HD-68 is reachable from Uintah and Daggett and from nowhere else");

// ── THE CLAIM, AND WHAT OUTRANKS WHAT ───────────────────────────────────────
const signedIn = { uid: "uid-neighbour", isAnonymous: false };
const anonUser = { uid: "uid-anon", isAnonymous: true };
const verifiedRow = { status: "verified", method: "location_match" };
const pendingRow = { status: "pending", method: "location_match" };
const revokedRow = { status: "revoked", method: "location_match" };
const vendorRow = { status: "verified", method: "vendor" };

eq(residencyClaim(null, null, HD68, HD68).reason, "signed_out",
  "no caller is signed out, whatever their location says");
eq(residencyClaim(null, verifiedRow, HD68, HD68).verified, false,
  "and a stored row does not sign anybody in");
eq(residencyClaim(anonUser, verifiedRow, HD68, HD68).verified, false,
  "an anonymous session is a browser, not a neighbour");
eq(residencyClaim(signedIn, null, "", HD68).reason, "no_location",
  "signed in with no usable location is read-only, and says which");
eq(residencyClaim(signedIn, null, "ut-statehouse-67", HD68).reason, "wrong_district",
  "a location that resolves elsewhere gets its own reason, not 'verify to post'");
eq(residencyClaim(signedIn, null, "ut-statehouse-67", HD68).seatKey, "ut-statehouse-67",
  "and the claim reports the seat it IS good for, never the one asked about");
eq(residencyClaim(signedIn, revokedRow, HD68, HD68).reason, "revoked",
  "a reviewer's revocation outranks a location that would otherwise match");
eq(residencyClaim(signedIn, revokedRow, HD68, HD68).verified, false,
  "and revoked cannot write");
eq(residencyClaim(signedIn, vendorRow, "", HD68).verified, true,
  "an identity check is about the person, so it does not need a live location");
eq(residencyClaim(signedIn, vendorRow, "", HD68).method, "vendor",
  "and it says which method verified them");

// A LIVE MATCH IS REQUIRED FOR location_match, EVERY TIME. Both the row and the
// current location, so changing the saved location closes the composer at once.
eq(residencyClaim(signedIn, verifiedRow, HD68, HD68).verified, true,
  "a stored row plus a live match verifies");
eq(residencyClaim(signedIn, verifiedRow, "ut-statehouse-67", HD68).verified, false,
  "the stored row alone grants nothing once the location moved");
eq(residencyClaim(signedIn, null, HD68, HD68).verified, true,
  "and a first-time match verifies without a row already existing");
eq(residencyClaim(signedIn, pendingRow, HD68, HD68).verified, true,
  "a pending row does not block a live match");
eq(residencyClaim(signedIn, verifiedRow, HD68, "").reason, "no_seat",
  "and no seat is no claim");

// Every reason has a sentence, and no reason falls through to a blank.
for (const reason of ["signed_out", "no_location", "wrong_district", "revoked", "no_seat"]) {
  const note = residencyNote({ reason });
  ok(typeof note === "string" && note.length > 20, `"${reason}" has a real sentence`);
}

// THE VENDOR SEAM IS UNUSED. It throws rather than returning a soft false.
eq(RESIDENCY_VERIFIER, null, "no identity vendor is wired");
let threw = false;
try { verifyVendor(); } catch (e) { threw = true; }
eq(threw, true, "verifyVendor() throws rather than quietly verifying somebody");
eq(RESIDENCY_METHODS.length, 2, "two methods exist");
eq(RESIDENCY_METHODS.includes("location_match"), true, "the one slice 1 writes");
eq(RESIDENCY_METHODS.includes("vendor"), true, "and the one reserved for the ID check");
for (const vendor of ["stripe", "veriff", "onfido", "persona", "plaid"]) {
  no(CORE_CODE.toLowerCase(), vendor, `the gate calls no ID vendor (${vendor})`);
  no(FN_CODE.toLowerCase(), vendor, `the Function calls no ID vendor (${vendor})`);
  no(VOICE_CODE.toLowerCase(), vendor, `the client calls no ID vendor (${vendor})`);
}
no(FN_CODE, "charge", "nothing in the Function charges anybody");
no(VOICE_CODE, "charge", "and neither does the client");
eq(JSON.stringify(RESIDENCY_STATUSES), JSON.stringify(["pending", "verified", "revoked"]),
  "three statuses, and 'verified' is the only one that writes");

// ── NO UID IS STORED, AND THE HASH IS SEAT-SCOPED ───────────────────────────
const h68 = authorHash("uid-abc", HD68);
const h67 = authorHash("uid-abc", "ut-statehouse-67");
ok(/^[0-9a-f]{32}$/.test(h68), "the author hash is a truncated hex digest");
eq(authorHash("uid-abc", HD68_ALIAS), h68,
  "the alias hashes to the same author as the canonical key — one person, one place");
ok(h68 !== h67, "the same person hashes differently per seat, so two seats cannot be joined");
eq(authorHash("", HD68), "", "no uid is no author");
eq(authorHash("uid-abc", ""), "", "and no seat is no author");
eq(authorHash("uid-abc", "not-a-seat"), "", "nor is a malformed one");
// The uid must not appear in any voice_* column.
for (const t of ["voice_takes", "voice_poll_answers", "voice_residency"]) {
  const block = new RegExp(`"${t}"[\\s\\S]*?\\n\\);`).exec(MIG_TABLES);
  must(block, `${t} is no longer in the migration — the no-uid probe is stale`);
  no(block[0], '"uid"', `${t} stores no uid`);
  has(block[0], '"author_hash"', `${t} stores the seat-scoped hash instead`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · Fail closed — exhaustively, not by example");

const seatRow = { seatKey: HD68 };
const goodClaim = { verified: true, seatKey: HD68, reason: "verified", method: "location_match" };

// THE WHOLE PRODUCT of the take gate's inputs. An allow must require every
// condition to be affirmatively true; nothing may fall through to ok.
{
  const seats = [null, { seatKey: "" }, { seatKey: "ut-statehouse-67" }, seatRow];
  const issues = ["", "Not A Key!", "lands-preserve", FLAGSHIP_ISSUE];
  const issueOks = [false, true];
  const claims = [
    null,
    { verified: false, seatKey: null, reason: "signed_out" },
    { verified: false, seatKey: null, reason: "no_location" },
    { verified: false, seatKey: null, reason: "revoked" },
    { verified: true, seatKey: "ut-statehouse-67", reason: "verified" },
    goodClaim,
  ];
  const bodies = ["", "   ", "\n\n", "x".repeat(TAKE_MAX + 1), "A real sentence."];
  let allowed = 0, total = 0;
  for (const seat of seats) {
    for (const issueKey of issues) {
      for (const issueOk of issueOks) {
        for (const residency of claims) {
          for (const body of bodies) {
            total++;
            const v = decideTake({ seat, issueKey, issueOk, residency, body });
            if (!v.ok) {
              ok(v.status >= 400 && v.status <= 404, "a refusal carries a 4xx status");
              ok(typeof v.message === "string" && v.message.length > 0,
                "and a sentence the reader can read");
              continue;
            }
            allowed++;
            // The five conditions, re-derived from the inputs rather than
            // trusted from the verdict.
            ok(seat === seatRow, "an allow required the shipped seat");
            ok(issueKey === FLAGSHIP_ISSUE && issueOk === true,
              "an allow required an issue key the vocabulary holds");
            ok(residency === goodClaim, "an allow required a verified claim for THIS seat");
            ok(body === "A real sentence.", "an allow required a real body");
            eq(v.seatKey, HD68, "and the allow carries the canonical seat");
          }
        }
      }
    }
  }
  eq(allowed, 1, `exactly one of ${total} input combinations may write a take`);
  console.log(`      ${total} take-gate combinations, 1 allow`);
}

// THE SAME, for the poll answer.
{
  const poll = {
    id: 1, seatKey: HD68, active: true,
    options: [{ optionKey: "preserve" }, { optionKey: "multiuse" }, { optionKey: "depends" }],
  };
  const polls = [
    null,
    { ...poll, active: false },
    { ...poll, seatKey: "ut-statehouse-67" },
    { ...poll, options: [] },
    poll,
  ];
  const claims = [
    null,
    { verified: false, seatKey: null, reason: "signed_out" },
    { verified: false, seatKey: null, reason: "no_location" },
    { verified: true, seatKey: "ut-statehouse-67", reason: "verified" },
    goodClaim,
  ];
  const options = ["", "Not An Option!", "not_an_option", "preserve"];
  let allowed = 0, total = 0;
  for (const seat of [null, seatRow]) {
    for (const p of polls) {
      for (const residency of claims) {
        for (const optionKey of options) {
          total++;
          const v = decideAnswer({ seat, poll: p, residency, optionKey });
          if (!v.ok) { ok(v.status >= 400 && v.status <= 404, "a refusal carries a 4xx status"); continue; }
          allowed++;
          ok(seat === seatRow, "an allow required the shipped seat");
          ok(p === poll, "an allow required THIS seat's live poll");
          ok(residency === goodClaim, "an allow required a verified claim for THIS seat");
          ok(optionKey === "preserve", "an allow required one of the poll's own options");
        }
      }
    }
  }
  eq(allowed, 1, `exactly one of ${total} input combinations may answer the poll`);
  console.log(`      ${total} answer-gate combinations, 1 allow`);

  // Case and stray whitespace are not second option keys — they fold, and the
  // verdict reports the folded key so the row written matches the option's own.
  const folded = decideAnswer({ seat: seatRow, poll, residency: goodClaim, optionKey: "  PRESERVE " });
  eq(folded.ok, true, "an option key arrives folded rather than refused for its case");
  eq(folded.optionKey, "preserve", "and the verdict carries the poll's own spelling of it");
  eq(folded.pollId, poll.id, "with the poll it belongs to");
}

// ── THE NAMED CASES FROM THE BRIEF ──────────────────────────────────────────
// An unverified user cannot POST.
{
  const v = decideTake({
    seat: seatRow, issueKey: FLAGSHIP_ISSUE, issueOk: true,
    residency: residencyClaim(signedIn, null, "", HD68), body: "Hello, neighbours.",
  });
  eq(v.ok, false, "an unverified user cannot post a take");
  eq(v.status, 403, "and it is a 403, not a silent drop");
  eq(v.reason, "no_location", "the reason is the honest one: we hold no location");
  const a = decideAnswer({
    seat: seatRow,
    poll: { id: 1, seatKey: HD68, active: true, options: [{ optionKey: "preserve" }] },
    residency: residencyClaim(signedIn, null, "", HD68), optionKey: "preserve",
  });
  eq(a.ok, false, "and cannot answer the poll either");
  eq(a.reason, "no_location", "for the same reason, from the same claim");
}
// A signed-out caller is a 401 rather than a 403 — different fact, different code.
{
  const v = decideTake({
    seat: seatRow, issueKey: FLAGSHIP_ISSUE, issueOk: true,
    residency: residencyClaim(null, null, HD68, HD68), body: "Hello.",
  });
  eq(v.status, 401, "a signed-out caller gets 401");
}
// A location in ANOTHER district cannot post to HD-68.
{
  const claim = residencyClaim(
    signedIn, verifiedRow,
    seatFromLocation({ state: "Utah", county: "Duchesne County", houseDistrict: 67 }),
    HD68
  );
  eq(claim.verified, false, "a Duchesne County neighbour is not verified for HD-68");
  eq(claim.reason, "wrong_district", "and the reason names it");
  const v = decideTake({
    seat: seatRow, issueKey: FLAGSHIP_ISSUE, issueOk: true,
    residency: claim, body: "About HD-68…",
  });
  eq(v.ok, false, "so they cannot post to HD-68");
  eq(v.status, 403, "with a 403");
  has(v.message, "different seat", "and a sentence that says their location is elsewhere");
  // And they ARE verified for their own seat, which is the point.
  eq(residencyClaim(signedIn, verifiedRow, "ut-statehouse-67", "ut-statehouse-67").verified, true,
    "the same reader is verified for the seat they actually live in");
}
// A take with an unknown issueKey is refused.
{
  for (const [issueKey, issueOk, why] of [
    ["", false, "an empty issue key"],
    ["not_in_issue_map", false, "a well-shaped key the vocabulary does not hold"],
    ["Lands Preserve", false, "a key that is not even the right shape"],
    ["lands-preserve", false, "a hyphenated near-miss"],
    [FLAGSHIP_ISSUE, false, "the real key when the vocabulary read did not confirm it"],
  ]) {
    const v = decideTake({
      seat: seatRow, issueKey, issueOk, residency: goodClaim, body: "A take.",
    });
    eq(v.ok, false, `${why} is refused`);
    eq(v.status, 404, `${why} is a 404 — we have no issue by that name`);
    eq(v.code, "no_issue", `${why} says which`);
  }
  ok(ISSUE_KEY_RE.test(FLAGSHIP_ISSUE), "the flagship key is a well-shaped ISSUE_MAP key");
}
// THE THIRD REFUSAL, the one no code path can forget: the foreign key.
has(MIG_TABLES, '"dd_issue_keys"("issue_key")',
  "voice_takes.issue_key is a foreign key into the shipped vocabulary");
has(MIG_TABLES, '"dd_districts"("district_id")',
  "and every seat_key is a foreign key into the district table");
{
  const takes = /"voice_takes"[\s\S]*?\n\);/.exec(MIG_TABLES);
  must(takes, "voice_takes left the migration");
  has(MIG_TABLES, "voice_takes_body_len_check", "the 280 ceiling is a CHECK, not a client rule");
}

// ── THE BODY ────────────────────────────────────────────────────────────────
eq(TAKE_MAX, 280, "a take is 280 characters");
eq(normalizeTakeBody("  a   take \n here "), "a take here", "whitespace collapses");
eq(normalizeTakeBody("x".repeat(TAKE_MAX)), "x".repeat(TAKE_MAX), "280 is allowed");
eq(normalizeTakeBody("x".repeat(TAKE_MAX + 1)), "", "281 is not");
eq(takeBodyTooLong("x".repeat(TAKE_MAX + 1)), true, "and the gate can say WHICH refusal it is");
eq(takeBodyTooLong("x".repeat(TAKE_MAX)), false, "280 is not too long");
// A wall of newlines cannot buy somebody twenty lines of the feed.
eq(normalizeTakeBody("a\n\n\n\n\n\n\n\n\n\nb"), "a b", "newlines cannot be used as height");
{
  const long = decideTake({ seat: seatRow, issueKey: FLAGSHIP_ISSUE, issueOk: true,
    residency: goodClaim, body: "x".repeat(TAKE_MAX + 1) });
  eq(long.code, "too_long", "281 characters is refused as too long");
  const empty = decideTake({ seat: seatRow, issueKey: FLAGSHIP_ISSUE, issueOk: true,
    residency: goodClaim, body: "   " });
  eq(empty.code, "empty_body", "and whitespace is refused as empty — a different fact");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · Counts, not a score. No percentage anywhere.");

// NO PERCENT SIGN IN ANY SHIPPED FILE'S CODE. Comments may name what is refused;
// code may not compute it.
for (const [name, code] of [["the gate", CORE_CODE], ["the Function", FN_CODE],
  ["the client", VOICE_CODE]]) {
  no(code, "%", `${name} contains no percent sign`);
}
// And no arithmetic that could only be a proportion.
for (const [name, code] of [["the gate", CORE_CODE], ["the Function", FN_CODE], ["the client", VOICE_CODE]]) {
  no(code, "* 100", `${name} scales nothing to a hundred`);
  no(code, "/ total", `${name} divides nothing by a total`);
  no(code, "toFixed", `${name} formats no decimal figure`);
}
for (const word of ["percent", "percentage", "pct", "share", "ratio", "proportion", "score",
  "grade", "rating", "mood", "index", "average", "composite"]) {
  const re = new RegExp(`\\b${word}\\b`, "i");
  ok(!re.test(CORE_CODE), `the gate computes no "${word}"`);
  ok(!re.test(VOICE_CODE), `the client renders no "${word}"`);
}
// NOTHING IN THE SHEET SCALES WITH A COUNT. A percentage is the shape a
// proportion takes in CSS, so every one in the sheet has to be a CONSTANT that
// fills its own box — 100% on a field or a button — rather than a length some
// number could set. And no rule may read a custom property or a gradient stop,
// which is the other way a tally becomes a bar.
for (const m of CSS_CODE.matchAll(/(-?[\d.]+)%/g)) {
  eq(m[1], "100", `every percentage in the sheet is a constant 100% (found ${m[0]})`);
}
for (const prop of ["flex-basis", "transform: scale", "linear-gradient", "conic-gradient",
  "var(--pdxv-count", "var(--pdxv-fill", "attr("]) {
  no(CSS_CODE, prop, `no rule in the sheet could draw a count as a length (${prop})`);
}
// And the counts are printed at a fixed size, in a figure face that lines up.
has(CSS_CODE, "tabular-nums", "counts are set in tabular figures so they line up as numbers");

// The tally: one integer per option, in the poll's own order.
const OPTIONS = [
  { optionKey: "preserve", label: "Keeping them preserved" },
  { optionKey: "multiuse", label: "Opening more for development and grazing" },
  { optionKey: "depends", label: "Depends on the parcel" },
];
{
  const t = pollCounts(OPTIONS, [{ optionKey: "preserve", count: 7 }, { optionKey: "depends", count: 2 }]);
  eq(t.counts.length, 3, "every option is reported, including the ones nobody picked");
  eq(t.counts[0].optionKey, "preserve", "in the poll's own order");
  eq(t.counts[0].count, 7, "with its integer");
  eq(t.counts[2].count, 2, "and so is the third");
  eq(t.counts[1].count, 0, "an option with no answers is a zero, not a missing row");
  eq(t.answered, 9, "and `answered` is the number of PEOPLE, not a score for the place");
  for (const c of t.counts) {
    eq(Number.isInteger(c.count), true, `${c.optionKey}'s count is an integer`);
  }
  // NOT A COMPOSITE. The result object carries counts and a headcount and
  // nothing that combines the options into one number.
  eq(JSON.stringify(Object.keys(t)), JSON.stringify(["counts", "answered"]),
    "the tally has exactly two fields: the counts, and how many people answered");
  for (const k of ["leader", "winner", "top", "margin", "mood", "net", "average", "mean"]) {
    eq(Object.prototype.hasOwnProperty.call(t, k), false, `and no "${k}"`);
  }
  // The sentence is integers and labels — never a proportion, never "leading".
  const line = pollCountLine(t);
  has(line, "7 keeping them preserved", "the count line prints integers next to words");
  no(line, "%", "and no percentage");
  for (const bad of ["leading", "wins", "ahead", "majority", "mandate"]) {
    no(line.toLowerCase(), bad, `and never "${bad}"`);
  }
}
// Zero answers is a sentence.
eq(pollCountLine(pollCounts(OPTIONS, [])), CORE_COPY.emptyAnswers,
  "no answers yet is a sentence, not a row of zeroes dressed as a result");
eq(pollCountLine(null), CORE_COPY.emptyAnswers, "and so is no tally at all");
// A count for an option that no longer exists is dropped rather than invented.
{
  const t = pollCounts(OPTIONS, [{ optionKey: "gone", count: 99 }]);
  eq(t.counts.length, 3, "a stale option key adds no row");
  eq(t.answered, 0, "and does not inflate the headcount");
}

// Verified neighbours: one integer, and a sentence when it is zero. Never divided.
eq(neighborLine(0), CORE_COPY.emptyNeighbors, "zero verified neighbours is a sentence");
eq(neighborLine(null), CORE_COPY.emptyNeighbors, "and so is not knowing");
eq(neighborLine(1), "1 verified neighbor in this seat.", "one is singular");
eq(neighborLine(12), "12 verified neighbors in this seat.", "and twelve is an integer");
no(neighborLine(12), "%", "never a share of the district");

// ── ONE ACTIVE POLL PER SEAT, AND 2–4 OPTIONS ───────────────────────────────
eq(POLL_OPTIONS_MIN, 2, "two options minimum — one option is not a question");
eq(POLL_OPTIONS_MAX, 4, "four maximum — five is a survey");
has(MIG_TABLES, "voice_polls_one_active_per_seat",
  "one active poll per seat is a property of the schema, not a rule a caller remembers");
has(MIG_TABLES, 'WHERE "active"', "enforced by a partial unique index");
has(MIG_TABLES, "voice_poll_answers_poll_author_unique",
  "one answer per person per poll, so a count cannot double-count anybody");
// The composite foreign key: an answer can never name an option that does not exist.
has(MIG_TABLES, "voice_poll_options_poll_key_unique", "the composite the answer's FK points at");
has(MIG_TABLES, 'REFERENCES "voice_poll_options"("poll_id","option_key")',
  "and the answer's option is a foreign key into that composite");

// The seeded flagship poll: issue-sided options, never candidate names.
has(MIG_SEED, `'${HD68}'`, "the seed is for HD-68, spelled canonically");
has(MIG_SEED, `'${FLAGSHIP_ISSUE}'`, `and tied to ${FLAGSHIP_ISSUE}`);
{
  const opts = [...MIG_SEED.matchAll(/\('([a-z0-9_]+)',\s*'([^']+)',\s*(\d+)\)/g)];
  eq(opts.length >= POLL_OPTIONS_MIN && opts.length <= POLL_OPTIONS_MAX, true,
    `the seeded poll has ${opts.length} options, within 2–4`);
  for (const [, key, label] of opts) {
    ok(OPTION_KEY_RE.test(key), `"${key}" is a well-shaped option key`);
    // NEVER CANDIDATE NAMES AS THE ONLY AXIS.
    no(label.toLowerCase(), "chew", `option "${label}" is a side of the issue, not a person`);
    for (const party of ["republican", "democrat", "gop", "libertarian"]) {
      no(label.toLowerCase(), party, `option "${label}" names no party`);
    }
  }
  has(MIG_SEED, "ON CONFLICT", "the seed is idempotent");
  has(MIG_SEED, "WHERE EXISTS", "and it refuses to seed a poll for a seat or issue that does not exist");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · The copy — one required sentence, and a banned register");

eq(CORE_COPY.frame, "Verified neighbors. Not a poll of the internet. Not how the member voted.",
  "the required sentence, verbatim, in the gate");
// The client prints the gate's sentence, not its own paraphrase.
{
  const m = /frame: '([^']+)'/.exec(VOICE_SRC);
  must(m, "district-voice.js no longer declares COPY.frame");
  eq(m[1], CORE_COPY.frame, "and the client's copy of it is byte-identical");
}
// The Function ships it with the payload, so the block cannot render without it.
has(FN_CODE, "frame: COPY.frame", "the read sends the required sentence with the payload");

// THE BANNED REGISTER, in all four shipped files.
const BANNED = [
  "team loyalty", "loyalty score", "mandate %", "mandate percentage",
  "approval rating", "approval %", "the district believes", "district believes",
  "the district wants", "district mood", "% approve", "% support",
];
for (const phrase of BANNED) {
  for (const [name, src] of [["the gate", CORE_CODE], ["the Function", FN_CODE],
    ["the client", VOICE_CODE], ["the sheet", CSS_CODE]]) {
    no(String(src).toLowerCase(), phrase, `${name} says "${phrase}"`);
  }
}
// No party language of any kind in what a reader can see.
for (const word of ["republican", "democrat", " gop", "caucus", "party", "team"]) {
  no(CORE_CODE.toLowerCase(), word, `the gate has no "${word}"`);
  no(VOICE_CODE.toLowerCase(), word, `the client has no "${word}"`);
}
// And the schema — where a party column is the thing that could actually be
// added later — says so in writing next to the columns it does have.
has(MIG_TABLES.toLowerCase(), "no party", "the migration names the party wall in writing");
// None of the verdict palette in the sheet — this is neighbours talking, not a
// judgement that came out right or wrong.
for (const hue of ["#4ade80", "#86efac", "#ef4444", "#f87171", "#dc2626", "#22c55e"]) {
  no(CSS_CODE.toLowerCase(), hue, `the sheet uses none of the verdict palette (${hue})`);
}
// Honest empties exist and are sentences.
for (const [k, v] of [["emptyTakes", CORE_COPY.emptyTakes],
  ["emptyNeighbors", CORE_COPY.emptyNeighbors], ["emptyAnswers", CORE_COPY.emptyAnswers],
  ["weekNone", CORE_COPY.weekNone]]) {
  ok(typeof v === "string" && /[.!]$/.test(v.trim()) && v.length > 12,
    `COPY.${k} is a sentence, not a placeholder ("${v}")`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · The walls — Voice writes nothing the record owns");

// THE FUNCTION IMPORTS EXACTLY THE FIVE VOICE TABLES PLUS TWO READ-ONLY LOOKUPS.
{
  const imports = /import \{([^}]*)\} from "\.\.\/\.\.\/db\/schema\.js";/.exec(FN_SRC);
  must(imports, "the Function's schema import was renamed — the walls probe is stale");
  const names = imports[1].split(",").map((s) => s.trim()).filter(Boolean).sort();
  eq(JSON.stringify(names), JSON.stringify([
    "ddDistricts", "ddIssueKeys", "voicePollAnswers", "voicePollOptions",
    "voicePolls", "voiceResidency", "voiceTakes",
  ]), "the Function can reach the five voice tables and the two lookups, and nothing else");
}
// So there is no statement in it that could write a formal act, a stance,
// Direction Match, finance or a baseline.
for (const table of ["vr_", "vrVotes", "vrMeasures", "cee_", "pdxForum", "ddPosts", "ddThreads",
  "ddPollVotes", "ddResidency", "finance", "ftm", "stance", "mandate", "consistency", "promise"]) {
  no(FN_CODE, table, `the Function does not reach ${table}`);
}
// NO PID. Not taken, not stored, not returned.
for (const [name, code] of [["the gate", CORE_CODE], ["the Function", FN_CODE]]) {
  no(code, "politicianId", `${name} takes no politician id`);
  no(code, "pid", `${name} has no pid`);
}
for (const t of ["voice_takes", "voice_polls", "voice_poll_options", "voice_poll_answers", "voice_residency"]) {
  const block = new RegExp(`CREATE TABLE IF NOT EXISTS "${t}"[\\s\\S]*?\\n\\);`).exec(MIG_TABLES);
  must(block, `${t} left the migration`);
  no(block[0], '"pid"', `${t} has no pid column`);
  no(block[0], '"politician', `${t} has no politician column`);
  no(block[0], '"party"', `${t} has no party column`);
  no(block[0], '"score"', `${t} has no score column`);
  no(block[0], '"upvote"', `${t} has no upvote column`);
  no(block[0], '"votes"', `${t} has no vote tally column`);
  no(block[0], '"parent', `${t} has no reply parent — slice 1 has no thread`);
}
// The client reads the record ONE way, and it is the public GET.
{
  const fetches = [...VOICE_CODE.matchAll(/fetch\(/g)];
  ok(fetches.length >= 1, "the client does fetch");
  has(VOICE_CODE, "/api/voting-record/member/", "the record strip reads the public record API");
  has(VOICE_CODE, "method: 'GET'", "and reads it with a GET");
  // No write to any record endpoint.
  for (const ep of ["/api/vr-", "/api/mandate", "/api/finance", "/api/community", "/api/threads"]) {
    no(VOICE_CODE, ep, `the client never calls ${ep}`);
  }
}
// Newest first, and there is no other order to ask for.
has(FN_CODE, "desc(voiceTakes.createdAt)", "takes come back newest first");
no(FN_CODE, "orderBy(asc", "and there is no ascending order");
for (const knob of ["sort", "rank", "order=", "top", "hot", "best"]) {
  no(FN_CODE.replace(/sortOrder|orderBy|\.desc\(\)/g, " "), knob,
    `there is no "${knob}" knob on the feed`);
}
eq(TAKES_CAP, 20, "the feed is capped at twenty");
has(FN_CODE, "limit(TAKES_CAP)", "and the cap is applied in the query, not in the client");

// ── THE TWIN BOOT ───────────────────────────────────────────────────────────
// Direction Match, Word vs Action and the finance lane read byte-identical with
// district-voice.js loaded and without it. Cox, Lee and Chew by name.
{
  const ENGINE_FILES = [
    "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
    "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
    "say-vs-do.js", "consistency.js", "voting-record.js", "issue-scope.js",
    "word-action.js", "finance-lane.js",
  ].filter((f) => existsSync(join(ROOT, f)));
  const ENGINES = ENGINE_FILES.map((f) => [f, R(f)]);

  const engineBoot = (withVoice) => {
    const w = makeSandbox();
    w.window = w;
    w.document = {
      readyState: "complete", body: null, cookie: "",
      addEventListener() {}, removeEventListener() {},
      getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
      createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, classList: { add() {} } }),
    };
    w.setTimeout = () => 0;
    w.clearTimeout = () => {};
    w.location = { pathname: "/", href: "https://www.politidex.fyi/", search: "", hash: "" };
    w.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
    w.fetch = () => Promise.resolve({ ok: false, status: 0, json: () => Promise.resolve({}) });
    const ctx = vm.createContext(w);
    for (const [f, src] of ENGINES) {
      try { vm.runInContext(src, ctx, { filename: f }); } catch (e) { /* the page's own guard */ }
    }
    w.PROFILES = w.CMP_DATA;
    if (withVoice) {
      try { vm.runInContext(VOICE_SRC, ctx, { filename: "district-voice.js" }); } catch (e) {}
    }
    return w;
  };

  const A = engineBoot(false);
  const B = engineBoot(true);
  must(B.PDXVoice && typeof B.PDXVoice === "object",
    "district-voice.js did not publish window.PDXVoice in the twin boot");
  must(A.PDXConsistency && typeof A.PDXConsistency.scopedOverall === "function",
    "consistency.js did not boot — the Direction Match half of the twin probe is stale");
  must(A.PDXWordAction && typeof A.PDXWordAction.heroHtml === "function",
    "word-action.js did not boot — the Word vs Action half of the twin probe is stale");
  must(A.PDXFinanceLane && typeof A.PDXFinanceLane.read === "function",
    "finance-lane.js did not boot — the finance half of the twin probe is stale");

  const prof = (w, pid) => (w.PROFILES && w.PROFILES[pid]) || null;
  let reads = 0;
  for (const pid of ["cox", "lee", CHEW]) {
    // Word vs Action — the formal brief.
    eq(String(B.PDXWordAction.heroHtml(pid, prof(B, pid)) || ""),
       String(A.PDXWordAction.heroHtml(pid, prof(A, pid)) || ""),
      `${pid}: Word vs Action is not byte-identical with district-voice.js loaded`);
    reads++;
    // Direction Match — every scope.
    for (const sc of Object.keys(A.PDXConsistency.SCOPES || {})) {
      eq(JSON.stringify(B.PDXConsistency.scopedOverall(sc, pid)),
         JSON.stringify(A.PDXConsistency.scopedOverall(sc, pid)),
        `${pid}/${sc}: Direction Match drifted with district-voice.js loaded`);
      reads++;
    }
    // Finance Public Integrity — the composition read.
    eq(JSON.stringify(B.PDXFinanceLane.read(pid) || null),
       JSON.stringify(A.PDXFinanceLane.read(pid) || null),
      `${pid}: the finance lane drifted with district-voice.js loaded`);
    reads++;
  }
  eq(JSON.stringify(B.PDXFinanceLane.coverage()), JSON.stringify(A.PDXFinanceLane.coverage()),
    "and the finance lane's own coverage sentence is unchanged");
  console.log(`      cox / lee / ${CHEW} · ${reads} engine reads, no drift`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · The flagship file mounts — Chew, one poll, an honest empty");

// A SMALL REAL DOM. The shared sandbox returns null from getElementById, which is
// exactly what these modules treat as "there is no page to build in".
function makeDom(pathname) {
  const win = makeSandbox();
  const nodes = [];
  function node(tag) {
    const n = {
      tagName: String(tag || "div").toUpperCase(),
      id: "", className: "", _html: "", textContent: "", value: "", hidden: false,
      children: [], parentNode: null, attrs: {}, disabled: false, scrollTop: 0,
      style: { setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener() {}, removeEventListener() {},
      appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
      insertBefore(c, ref) {
        c.parentNode = this;
        const i = this.children.indexOf(ref);
        if (i < 0) this.children.push(c); else this.children.splice(i, 0, c);
        return c;
      },
      querySelector() { return null; }, querySelectorAll() { return []; },
      closest() { return null; }, focus() {},
    };
    // A mock DOM that kept innerHTML as an inert string would make the two
    // containers whose ORDER is the product rule unobservable: the district file
    // builds them with one assignment and then hands one of them to Voice BY ID.
    // So assigning HTML here registers the ids that HTML declares as real child
    // nodes, in document order, and drops the ones it replaced.
    Object.defineProperty(n, "innerHTML", {
      enumerable: true, configurable: true,
      get() { return n._html; },
      set(html) {
        const s = String(html == null ? "" : html);
        n._html = s;
        const prune = (kid) => {
          kid.children.forEach(prune);
          const i = nodes.indexOf(kid);
          if (i >= 0) nodes.splice(i, 1);
        };
        n.children.forEach(prune);
        n.children = [];
        for (const m of s.matchAll(/<([a-zA-Z][\w-]*)[^>]*\sid="([^"]+)"/g)) {
          const child = node(m[1]);
          child.id = m[2];
          child.parentNode = n;
          n.children.push(child);
        }
      },
    });
    nodes.push(n);
    return n;
  }
  const body = node("body");
  const on = {};
  const doc = {
    readyState: "complete", cookie: "", body,
    head: node("head"), documentElement: node("html"),
    createElement: (t) => node(t),
    getElementById: (id) => nodes.find((n) => n.id === id) || null,
    querySelector: () => null, querySelectorAll: () => [],
    __on: on,
    addEventListener(type, fn) {
      if (typeof fn !== "function") return;
      (on[String(type)] = on[String(type)] || []).push(fn);
    },
    removeEventListener() {}, dispatchEvent() { return true; },
  };
  const queue = [];
  win.setTimeout = (f, ms) => { queue.push({ f, ms: Number(ms) || 0 }); return queue.length; };
  win.clearTimeout = () => {};
  win.document = doc;
  win.__nodes = nodes;
  win.__mk = (id) => { const n = node("div"); n.id = id; body.appendChild(n); return n; };
  win.location = {
    href: "https://www.politidex.fyi" + pathname,
    pathname, search: "", hash: "", origin: "https://www.politidex.fyi",
  };
  win.__pushed = [];
  win.history = { pushState(s, t, u) { win.__pushed.push(String(u)); }, replaceState() {} };
  win.flushTimers = () => {
    const due = queue.splice(0, queue.length);
    due.forEach((t) => { try { t.f(); } catch (e) {} });
  };
  return win;
}

// THE REAL RESOLVER, NOT A HAND-WRITTEN STUB. Who holds a seat is answered by
// window.pdxSeatedMemberFor in ballot-breakdown.js, so that file is booted and
// the REAL function is handed over. A stub written to match one argument shape is
// exactly how HD-68 once came to paint "we have not resolved who holds this seat"
// over a seat the curated map holds.
const BALLOT_WIN = (() => {
  const w = makeSandbox();
  w.window = w;
  w.document = {
    readyState: "complete", body: null, addEventListener() {}, removeEventListener() {},
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
  };
  w.setTimeout = () => 0;
  w.clearTimeout = () => {};
  w.location = { pathname: "/", href: "https://www.politidex.fyi/", search: "", hash: "" };
  w.fetch = () => Promise.resolve({ ok: false, status: 0, json: () => Promise.resolve({}) });
  vm.runInContext(BALLOT_SRC, vm.createContext(w), { filename: "ballot-breakdown.js" });
  return w;
})();
must(typeof BALLOT_WIN.pdxSeatedMemberFor === "function",
  "ballot-breakdown.js did not publish window.pdxSeatedMemberFor");
// The alias does NOT resolve through the raw resolver — which is precisely why
// normalization has to happen before anything asks it who sits here.
eq(BALLOT_WIN.pdxSeatedMemberFor(HD68), CHEW, "the curated map seats Chew in HD-68");
ok(!BALLOT_WIN.pdxSeatedMemberFor(HD68_ALIAS),
  "the raw resolver does not know the alias — which is why the key is normalized first");
eq(BALLOT_WIN.pdxSeatedMemberFor(normalizeSeatKey(HD68_ALIAS)), CHEW,
  "and normalizing it first reaches the same member");

const PEOPLE = {
  [CHEW]: { name: "Scott Chew", office: "Utah State Representative" },
};
const PERSON_LINK = {
  href: (pid) => "/p/" + pid,
  anchorHtml: (pid, label) => '<a href="/p/' + pid + '">' + label + "</a>",
};
const FAMILY = { label: (k) => String(k).replace(/_/g, " "), path: (k) => "/i/" + k };

// The seat payload the Function returns for a fresh seat: one poll, zero takes,
// zero verified neighbours, and a signed-out reader.
function seatPayload(over) {
  return Object.assign({
    seat: {
      seatKey: HD68, path: "/d/" + HD68, alias: false, state: "UT",
      seatClass: "statehouse", districtNumber: 68, label: "Utah State House District 68",
    },
    copy: {
      kick: CORE_COPY.kick, frame: CORE_COPY.frame, takesHd: CORE_COPY.takesHd,
      takesNote: CORE_COPY.takesNote, weekHd: CORE_COPY.weekHd,
      weekNone: CORE_COPY.weekNone, emptyTakes: CORE_COPY.emptyTakes,
    },
    poll: {
      id: 1, issueKey: FLAGSHIP_ISSUE,
      question: "On public lands in this district, which should state policy weigh more heavily?",
      options: OPTIONS.map((o) => ({ ...o, count: 0 })),
      answered: 0, countLine: CORE_COPY.emptyAnswers, myAnswer: null,
      heading: CORE_COPY.pollHd, countsLabel: CORE_COPY.pollCounts,
    },
    takes: [],
    takesEmpty: CORE_COPY.emptyTakes,
    neighbors: { verified: 0, line: CORE_COPY.emptyNeighbors },
    voice: { canPost: false, reason: "signed_out", note: CORE_COPY.closedSignedOut },
    limits: { takeMax: TAKE_MAX, takesCap: TAKES_CAP },
  }, over || {});
}

const ROOMS_PAYLOAD = {
  districtKey: HD68, seatKey: "statehouse", districtNumber: 68,
  label: "Utah State House District 68",
  rooms: [{ issueKey: FLAGSHIP_ISSUE, label: "lands preserve", posts: 0, line: "No answers yet." }],
};

// Boots the three client modules in the order index.html loads them.
function boot(pathname, opts) {
  const o = opts || {};
  const win = makeDom(pathname || "/");
  win.__calls = [];
  win.__posts = [];
  win.fetch = (url, init) => {
    const u = String(url);
    const i = init || {};
    win.__calls.push({ url: u, init: i });
    let status = 200;
    let data = {};
    if (u.indexOf("/api/district-voice") === 0) {
      if (String(i.method || "GET").toUpperCase() === "POST") {
        win.__posts.push({ url: u, body: JSON.parse(String(i.body || "{}")), headers: i.headers || {} });
        status = o.postStatus || 201;
        data = o.postData || { take: { id: 1, issueKey: FLAGSHIP_ISSUE, body: "ok", mine: true } };
      } else {
        data = o.payload || seatPayload();
      }
    } else if (u.indexOf("/api/district-room/district") === 0) {
      const wanted = decodeURIComponent(u.split("district=")[1] || "");
      if (wanted === HD68) data = ROOMS_PAYLOAD;
      else { status = 404; data = { error: "no district", code: "no_district" }; }
    } else if (u.indexOf("/api/voting-record/member/") === 0) {
      // o.recordStatus lets a probe make the RECORD read fail while the seat read
      // still lands, which is the one combination that separates "the record holds
      // nothing" from "we could not read the record".
      if (o.recordStatus) status = o.recordStatus;
      data = o.record || { rows: [{ issueKey: FLAGSHIP_ISSUE }] };
    }
    return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(data) });
  };
  Object.assign(win, {
    auth: { currentUser: o.currentUser || null },
    _pdxPersonById: (pid) => PEOPLE[pid] || null,
    pdxSeatedMemberFor: (k, n) => BALLOT_WIN.pdxSeatedMemberFor(k, n),
    PDXIssueFamily: FAMILY,
    PDXPersonLink: PERSON_LINK,
    _hasUserLocation: !!o.location,
    _currentVoterLocation: o.location || null,
    pdxRepsForMe: () => o.reps || null,
  }, o.extras || {});
  const ctx = vm.createContext(win);
  vm.runInContext(ROOM_SRC, ctx, { filename: "district-room.js" });
  vm.runInContext(VOICE_SRC, ctx, { filename: "district-voice.js" });
  vm.runInContext(FILE_SRC, ctx, { filename: "district-file.js" });
  return win;
}

async function settle(win) {
  for (let i = 0; i < 4; i++) {
    win.flushTimers();
    for (let j = 0; j < 20; j++) await Promise.resolve();
  }
}

// ── A COLD ARRIVAL ON THE CANONICAL ADDRESS ─────────────────────────────────
{
  const w = boot("/d/" + HD68);
  must(w.PDXVoice && w.PDXDistrictFile, "the modules did not boot together");
  await settle(w);

  const head = w.document.getElementById("pdx-district-file-head");
  const voice = w.document.getElementById("pdx-district-file-voice");
  const rooms = w.document.getElementById("pdx-district-file-rooms");
  must(head && voice && rooms, "the file did not paint its letterhead and its two halves");

  // BLOCK ONE: the seat, and the sitting member as a link to their person file.
  has(head.innerHTML, "District 68", "the letterhead names the district");
  has(head.innerHTML, "Scott Chew", "and the sitting member");
  has(head.innerHTML, '"/p/' + CHEW + '"', "as a link to their canonical person file");

  // THE REQUIRED SENTENCE IS ON THE FILE.
  has(voice.innerHTML, CORE_COPY.frame, "the required frame sentence is on the file");
  // ONE POLL SLOT, with its question and every option.
  has(voice.innerHTML, "which should state policy weigh more heavily",
    "the one live question is painted");
  for (const o of OPTIONS) {
    has(voice.innerHTML, o.label, `option "${o.label}" is painted`);
  }
  eq((voice.innerHTML.match(/class="pdxv-q"/g) || []).length, 1,
    "exactly ONE poll question — one active poll per seat");
  // ZERO TAKES → AN HONEST EMPTY SENTENCE, not a fake feed.
  has(voice.innerHTML, CORE_COPY.emptyTakes, "zero takes is a sentence");
  no(voice.innerHTML, "pdxv-take ", "and there is no take row painted");
  eq((voice.innerHTML.match(/class="pdxv-takes"/g) || []).length, 0,
    "the takes list is not painted at all when there are none");
  // ZERO IS ONE SENTENCE, NOT THREE. A seat nobody has answered yet used to print
  // three zeroes beside the three choices, then "No answers yet.", then "No
  // verified neighbors in this seat yet." — three different ways of saying the
  // same nothing, stacked, which reads as a page that is broken rather than as a
  // question nobody has reached. The one that survives is the one that answers
  // the question a reader actually has about the block above it.
  //
  // THIS IS NOT A SOFTENING OF THE EMPTY RULE, it is the empty rule applied once
  // instead of three times: no placeholder row, no skeleton, no sample feed, no
  // zero dressed as a result, and nothing that implies an answer exists. The
  // headcount sentence comes back the moment there is a headcount to print —
  // asserted below — and the gate still owns the string either way.
  has(voice.innerHTML, CORE_COPY.emptyAnswers, "no answers yet is the one sentence");
  no(voice.innerHTML, CORE_COPY.emptyNeighbors,
    "and the third way of saying nothing is not stacked under it");
  ok(typeof CORE_COPY.emptyNeighbors === "string" && CORE_COPY.emptyNeighbors.length > 12,
    "the gate still owns that sentence for the seats that need it");
  // A SIGNED-OUT READER SEES THE CLOSED NOTE, and no composer.
  has(voice.innerHTML, CORE_COPY.closedSignedOut, "the closed note says why, in the server's words");
  no(voice.innerHTML, "pdxv-body", "and no composer is painted for them");
  no(voice.innerHTML, "pdxv-optbtn", "nor a pressable option");
  // …but every option IS visible to them, in full, and so is any count there is
  // to see. AT ZERO THERE IS NO COUNT TO SEE: a nought beside a choice is not a
  // fact about that choice, it is the absence of one, and printing three of them
  // makes an unanswered question look like a result that came in flat. The
  // sentence above says the same thing once and truthfully.
  no(voice.innerHTML, "pdxv-optcount",
    "no count chips at zero — three noughts are not three results");
  for (const o of OPTIONS) {
    has(voice.innerHTML, o.label, `but "${o.label}" is still fully printed for them`);
  }

  // AND THE COUNTS ARE VISIBLE TO A READER WHO CANNOT ANSWER, the moment any
  // exist. This is the other half of that rule and it is asserted on a second
  // boot of the same signed-out reader, against a seat where neighbours HAVE
  // answered: they see the same choices and the same integers as somebody who
  // could press one. Reading is open — what is gated is answering.
  {
    const wCounts = boot("/d/" + HD68, {
      payload: seatPayload({
        neighbors: { verified: 9, line: "9 verified neighbors in this seat." },
        poll: Object.assign(seatPayload().poll, {
          options: [
            { ...OPTIONS[0], count: 7 },
            { ...OPTIONS[1], count: 0 },
            { ...OPTIONS[2], count: 2 },
          ],
          answered: 9,
          countLine: "7 keeping them preserved · 0 opening more for development and grazing · 2 depends on the parcel",
        }),
      }),
    });
    await settle(wCounts);
    const vc = wCounts.document.getElementById("pdx-district-file-voice");
    const seen = vc ? vc.innerHTML : "";
    has(seen, "pdxv-optcount", "a signed-out reader sees the counts when there are counts");
    has(seen, ">7<", "seven is printed as seven");
    has(seen, ">2<", "and two as two");
    no(seen, "pdxv-optbtn", "and still has nothing to press");
    no(seen, "%", "no percentage came with them");
    no(seen, CORE_COPY.emptyAnswers,
      "and the no-answers sentence is gone, because there are answers");
  }

  // NO PID, NO PARTY, NO PERCENTAGE ANYWHERE IN THE VOICE BLOCK.
  no(voice.innerHTML, "%", "no percentage in the painted block");
  for (const bad of ["Republican", "Democrat", "GOP", "Direction Match", "grade", "score"]) {
    no(voice.innerHTML, bad, `the Voice block paints no "${bad}"`);
  }
  no(voice.innerHTML, CHEW, "and no pid — a take belongs to the seat, not the member");

  // VOICE BLOCKS FIRST, THE SEAT'S BALLOT STRIP UNDER THEM, ISSUE ROOMS UNDER
  // BOTH. This boot does NOT load district-ballot.js, so the middle container is
  // present and EMPTY — which is the guarantee being asserted here: the file
  // emits the slot, the strip's absence paints nothing into it, and the order of
  // what a reader actually sees is unchanged from the file that shipped before
  // the strip existed. The strip's own contents are asserted in
  // test-district-ballot.mjs.
  const scroll = w.document.getElementById("pdx-district-file-scroll");
  const order = scroll.children.map((c) => c.id);
  eq(JSON.stringify(order),
    JSON.stringify(["pdx-district-file-voice", "pdx-district-file-ballot",
      "pdx-district-file-rooms"]),
    "Voice is painted first, the ballot slot second, the issue rooms under both");
  eq(w.document.getElementById("pdx-district-file-ballot").innerHTML, "",
    "and with district-ballot.js absent that slot paints nothing at all");
  // The rooms are still there, and still at their own addresses.
  has(rooms.innerHTML, "Issue rooms", "the issue rooms list is still on the file");
  has(rooms.innerHTML, "/d/" + HD68 + "/" + FLAGSHIP_ISSUE,
    "and a room still lives at its own two-segment URL");

  // THE READ WENT OUT WITH NO AUTHORIZATION HEADER — reading is open.
  const reads = w.__calls.filter((c) => c.url.indexOf("/api/district-voice") === 0);
  ok(reads.length >= 1, "the seat was read");
  for (const r of reads) {
    eq(!!(r.init.headers || {}).Authorization, false,
      "the seat read carries no Authorization header for a signed-out reader");
  }
  // And it asked for the canonical seat.
  has(reads[0].url, "seat=" + HD68, "the read asks for the canonical seat key");
  eq(w.__posts.length, 0, "reading the seat wrote nothing");
}

// ── A COLD ARRIVAL ON THE ALIAS ─────────────────────────────────────────────
{
  const w = boot("/d/" + HD68_ALIAS);
  await settle(w);
  const voice = w.document.getElementById("pdx-district-file-voice");
  must(voice, "the alias did not open the district file");
  has(voice.innerHTML, CORE_COPY.frame, "the alias opens the same file, with the same frame");
  eq(w.PDXDistrictFile.district(), HD68, "and the file knows itself by the canonical key");
  // The address bar is moved to the canonical URL, so a shared link is canonical.
  ok(w.__pushed.includes("/d/" + HD68),
    `the alias normalizes the address to /d/${HD68} (pushed: ${JSON.stringify(w.__pushed)})`);
  ok(!w.__pushed.includes("/d/" + HD68_ALIAS), "and never pushes the alias itself");
  // The read still asks for the canonical key — the alias never reaches the API.
  const reads = w.__calls.filter((c) => c.url.indexOf("/api/district-voice") === 0);
  ok(reads.length >= 1, "the alias arrival still read the seat");
  has(reads[0].url, "seat=" + HD68, "and asked for the canonical key");
  no(reads[0].url, HD68_ALIAS, "the alias is never sent to the API");
}

// ── A SEAT WITH NO VOICE PAINTS NO VOICE ────────────────────────────────────
{
  const w = boot("/");
  eq(w.PDXVoice.shipped("ut-statehouse-67"), false, "HD-67 has no Voice");
  eq(w.PDXVoice.mount("ut-statehouse-67", "nowhere"), false,
    "and mounting it is refused rather than painting an empty poll");
  eq(w.PDXVoice.path("ut-statehouse-67"), "", "and it builds no Voice address");
}

// ── THE COMPOSER OPENS ON THE SERVER'S ANSWER AND ON NOTHING ELSE ───────────
{
  const w = boot("/d/" + HD68, {
    currentUser: { uid: "uid-neighbour", isAnonymous: false, getIdToken: () => Promise.resolve("tok") },
    location: { state: "Utah", county: "Uintah County", district: "1", stateHouseDistrict: "68" },
    reps: {
      located: true, state: "Utah", county: "Uintah County", districtsResolvable: true,
      levels: [{ key: "statehouse", seat: "statehouse", statewide: false, district: 68 }],
    },
    payload: seatPayload({
      voice: { canPost: true, reason: "verified", note: "" },
      neighbors: { verified: 3, line: "3 verified neighbors in this seat." },
      poll: Object.assign(seatPayload().poll, {
        options: [
          { optionKey: "preserve", label: "Keeping them preserved", count: 2 },
          { optionKey: "multiuse", label: "Opening more for development and grazing", count: 1 },
          { optionKey: "depends", label: "Depends on the parcel", count: 0 },
        ],
        answered: 3, countLine: "2 keeping them preserved · 1 opening more for development and grazing · 0 depends on the parcel",
        myAnswer: "preserve",
      }),
      takes: [
        { id: 2, issueKey: FLAGSHIP_ISSUE, body: "The Book Cliffs road matters here.", mine: false },
        { id: 1, issueKey: FLAGSHIP_ISSUE, body: "Grazing permits are the real question.", mine: true },
      ],
      takesEmpty: "",
    }),
  });
  await settle(w);
  const voice = w.document.getElementById("pdx-district-file-voice");
  must(voice, "the verified neighbour's file did not paint");

  has(voice.innerHTML, "pdxv-body", "a verified neighbour gets a composer");
  has(voice.innerHTML, 'maxlength="' + TAKE_MAX + '"', "with the 280 ceiling on the field");
  has(voice.innerHTML, "pdxv-optbtn", "and pressable options");
  has(voice.innerHTML, 'aria-pressed="true"', "with their own answer marked");
  no(voice.innerHTML, CORE_COPY.closedSignedOut, "and no closed note");
  // The takes render, newest first, with no author identifier of any kind.
  has(voice.innerHTML, "The Book Cliffs road matters here.", "a take renders");
  ok(voice.innerHTML.indexOf("The Book Cliffs road") < voice.innerHTML.indexOf("Grazing permits"),
    "newest first, in the order the server sent");
  no(voice.innerHTML, "author", "no author identifier is painted on a take");
  no(voice.innerHTML, "uid-", "and certainly no uid");
  // COUNTS, AS INTEGERS, AND NO PERCENTAGE.
  has(voice.innerHTML, ">2<", "an option's count is painted as an integer");
  no(voice.innerHTML, "%", "and there is no percentage on a poll with answers");
  // The composer's issue list only offers ISSUE_MAP keys that came from the server.
  const issueOpts = [...voice.innerHTML.matchAll(/<option value="([^"]*)"/g)].map((m) => m[1]);
  ok(issueOpts.length >= 1, "the composer offers at least one issue");
  for (const k of issueOpts) {
    ok(ISSUE_KEY_RE.test(k), `"${k}" is a well-shaped ISSUE_MAP key`);
  }
  has(JSON.stringify(issueOpts), FLAGSHIP_ISSUE, "including the poll's own key");

  // THE CLAIM TRAVELS WITH THE WRITE, and it is the reader's own saved location.
  const c = w.PDXVoice.claim();
  eq(c.county, "Uintah County", "the claim carries the county the resolver published");
  eq(c.houseDistrict, "68", "and the state house district it resolved");
  eq(seatFromLocation(c), HD68, "and that claim resolves to HD-68 through the real gate");
}

// FAIL CLOSED IN THE CLIENT TOO: no location is an empty claim, not a guess.
{
  const w = boot("/", { reps: { located: false, state: "", county: "", levels: [] } });
  eq(JSON.stringify(w.PDXVoice.claim()), "{}",
    "no location sends no claim at all rather than a partial guess");
  const w2 = boot("/", {
    reps: {
      located: true, state: "Utah", county: "Uintah County", districtsResolvable: true,
      levels: [{ key: "statehouse", seat: "statehouse", statewide: false, district: null }],
    },
  });
  eq(JSON.stringify(w2.PDXVoice.claim()), "{}",
    "a county with no resolved house district is not half a claim, it is none");
}

// THE CLIENT'S VENDOR SEAM REJECTS.
{
  const w = boot("/");
  eq(typeof w.PDXVoice.verify, "function", "window.PDXVoice.verify() is the vendor seam");
  let rejected = false;
  await w.PDXVoice.verify().catch(() => { rejected = true; });
  eq(rejected, true, "and it rejects rather than quietly verifying somebody");
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · Two mounts, no new nav destination");

// (a) The seat row in Who Represents Me — through the mount that is already there.
has(WRM_SRC, "seatMountHtml", "Who Represents Me still renders the seat mount");
has(ROOM_SRC, "VOICE_LINK", "and that mount names District Voice where Voice ships");
has(ROOM_SRC, "Neighbors in this seat", "with the link the brief asks for");
{
  const w = boot("/");
  const DR = w.PDXDistrictRoom;
  must(DR && typeof DR.seatMountHtml === "function", "the seat mount was renamed");
  // The state house seat Voice ships for.
  const voiced = DR.seatMountHtml(
    { key: "statehouse", seat: "statehouse", statewide: false, district: 68, distLabel: "Utah State House · District 68" },
    "Utah"
  );
  has(voiced, "/d/" + HD68, "the HD-68 seat row links to the seat's district file");
  has(voiced, "Neighbors in this seat", "and names it District Voice's own link");
  // ONE link, not two doors into one room.
  eq((String(voiced).match(/href="\/d\/ut-statehouse-68"/g) || []).length, 1,
    "exactly one control points at the file");
  // A seat with no Voice keeps exactly today's label.
  const plain = DR.seatMountHtml(
    { key: "statehouse", seat: "statehouse", statewide: false, district: 67, distLabel: "Utah State House · District 67" },
    "Utah"
  );
  no(plain, "Neighbors in this seat", "a seat with no Voice does not advertise one");
  // A statewide row composes no district and gets nothing.
  eq(DR.seatMountHtml({ key: "governor", seat: "governor", statewide: true }, "Utah"), "",
    "a statewide seat has no district and no Voice");
}

// (b) ONE quiet link on the sitting member's person file.
has(PERSON_SRC, "function voiceLink", "person-file.js has the one quiet link");
has(PERSON_SRC, "PDXVoice.personLinkHtml", "rendered by PDXVoice, so the allow-list lives in one place");
has(PERSON_CSS, ".pf-kick-voice", "and it has a style of its own");
{
  const w = boot("/");
  const V = w.PDXVoice;
  eq(V.seatForPid(CHEW), HD68, "Chew sits in the seat Voice ships for");
  const link = V.personLinkHtml(CHEW);
  has(link, "/d/" + HD68, "so his person file links to that seat's place");
  has(link, "Neighbors in this seat", "with the brief's own label");
  eq((String(link).match(/<a /g) || []).length, 1, "ONE anchor, not a block of them");
  // NO NUMBER ON IT. A tally of neighbours' sentences on somebody's dossier would
  // be a metric about the person.
  no(link, "%", "no percentage on the person-file link");
  ok(!/\d/.test(String(link).replace(/ut-statehouse-68|pf-kick-voice/g, "")),
    "and no count, badge or tally of any kind");
  // Everybody else gets nothing.
  for (const pid of ["cox", "lee", "curtis", "", null, "not_a_person"]) {
    eq(V.personLinkHtml(pid), "", `${JSON.stringify(pid)} gets no Voice link`);
  }
}

// NO NEW TOP-NAV DESTINATION. Voice is registered as a script and a sheet and
// appears nowhere in the nav.
has(INDEX, '<script defer src="/district-voice.js"></script>', "district-voice.js is registered");
has(INDEX, 'href="/district-voice.css"', "and so is its sheet");
{
  // Every nav anchor in the document, and none of them is a Voice destination.
  const navs = [...INDEX.matchAll(/<nav[\s\S]*?<\/nav>/g)].join(" ");
  no(navs, "district-voice", "no nav element mentions District Voice");
  no(navs, "/d/ut-", "and no nav element links to a district file");
  // The two data-hooks that open Voice's page are the two mounts, and both are
  // inside Door 2's own modules rather than in the chrome.
  no(INDEX, "PDXVoice.mount", "index.html does not mount Voice itself");
}

// ═════════════════════════════════════════════════════════════════════════════
section("10 · The sitemap — the canonical seat, and not one URL per person");

has(SITEMAP, "<loc>https://www.politidex.fyi/d/" + HD68 + "</loc>",
  "the canonical seat file is crawled");
eq((SITEMAP.match(/\/d\//g) || []).length, 1,
  "exactly ONE /d/ address in the sitemap");
no(SITEMAP, HD68_ALIAS, "the alias is not advertised — two URLs for one page is one too many");
no(SITEMAP, "/d/ut-statehouse-68/", "and no room URL was added either");
// NOT ONE ADDRESS PER PERSON.
no(SITEMAP, "/d/" + CHEW, "there is no Voice URL for a member");
{
  const dLines = [...SITEMAP.matchAll(/<loc>[^<]*\/d\/([^<]*)<\/loc>/g)].map((m) => m[1]);
  for (const k of dLines) {
    ok(SEAT_KEY_RE.test(k), `every crawled /d/ address is a canonical seat key (${k})`);
    ok(voiceShipped(k) || Object.prototype.hasOwnProperty.call(VOICE_SEATS, k) === false,
      `${k} is a district the app ships a file for`);
  }
}
// The generator publishes it only when BOTH conditions hold.
has(GEN_SITEMAP, "function districtAddresses", "the generator enumerates district addresses");
has(GEN_SITEMAP, "var\\s+SHIPPED".replace("\\s+", "\\s+"), "reading the app's own allow-list");
has(GEN_SITEMAP, "20261029000000_create_dd_district_discussion_tables",
  "and requiring the seat to actually exist as a dd_districts row");

// ═════════════════════════════════════════════════════════════════════════════
section("11 · The migrations land after the tail, and touch nothing applied");

{
  const dir = join(ROOT, "netlify/database/migrations");
  const stamps = readdirSync(dir)
    .map((n) => /^(\d{14})/.exec(n))
    .filter(Boolean)
    .map((m) => m[1])
    .sort();
  const APPLIED_TAIL = "20261102000000";
  eq(stamps.includes("20261103000000"), true, "the voice tables migration is in the tree");
  eq(stamps.includes("20261104000000"), true, "and so is the flagship poll seed");
  ok("20261103000000" > APPLIED_TAIL, "the tables migration is stamped after the applied tail");
  ok("20261104000000" > "20261103000000", "and the seed lands after the tables it fills");
  // Nothing between the applied tail and the new ones — the new stamps are the end
  // of the tree, not the middle of it.
  const after = stamps.filter((s) => s > APPLIED_TAIL);
  eq(JSON.stringify(after), JSON.stringify(["20261103000000", "20261104000000"]),
    "the two new migrations are the whole tail");

  // ── AND THE VOICE DDL EXISTS IN EXACTLY ONE PLACE IN THE TREE ─────────────
  // `drizzle-kit generate` stamps the WALL CLOCK, and this repo's hand-versioned
  // migrations run ahead of the calendar — so a generated file lands with a stamp
  // that sorts BEHIND migrations already applied, in the MIDDLE of the tree, and
  // the platform rejects the whole deploy for it. That is not a hypothetical: the
  // generated companion to this pass came out as 20260910040405_good_champions and
  // failed the build, which is why the hand-set 20261103000000 above carries the
  // generated snapshot.json in a directory rather than a second migration existing
  // beside it.
  //
  // The stamp assertions above cannot catch that on their own: a wall-clock stamp
  // is BELOW the applied tail, so it never appears in `after`. This one can, and
  // it does not care what the stray file is called or where it sorts — it asserts
  // that the whole tree creates each voice_* table exactly ONCE. A second copy of
  // the DDL is a second migration, whatever its name.
  const voiceDDL = [];
  const walk = (name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      for (const inner of readdirSync(p)) {
        if (inner.endsWith(".sql")) voiceDDL.push([`${name}/${inner}`, readFileSync(join(p, inner), "utf8")]);
      }
      return;
    }
    if (name.endsWith(".sql")) voiceDDL.push([name, readFileSync(p, "utf8")]);
  };
  for (const n of readdirSync(dir)) walk(n);
  for (const t of ["voice_polls", "voice_poll_options", "voice_poll_answers",
                   "voice_takes", "voice_residency"]) {
    const owners = voiceDDL
      .filter(([, sql]) => new RegExp(`CREATE TABLE (IF NOT EXISTS )?"${t}"`).test(sql))
      .map(([n]) => n);
    eq(owners.length, 1,
      `${t} is created by exactly one migration (${owners.join(", ") || "none"})`);
    eq(owners[0], "20261103000000_create_voice_tables/migration.sql",
      `${t}'s one owner is the hand-stamped migration`);
  }
}
// Every CREATE is idempotent and every foreign key is added defensively, so a
// re-run cannot fail on an object that already exists.
{
  const creates = [...MIG_TABLES.matchAll(/CREATE TABLE (IF NOT EXISTS )?"/g)];
  ok(creates.length === 5, `five tables are created (found ${creates.length})`);
  for (const c of creates) {
    ok(!!c[1], "every CREATE TABLE is IF NOT EXISTS");
  }
  const idx = [...MIG_TABLES.matchAll(/CREATE (UNIQUE )?INDEX (IF NOT EXISTS )?"/g)];
  ok(idx.length >= 8, `the indexes are created (found ${idx.length})`);
  for (const c of idx) ok(!!c[2], "every CREATE INDEX is IF NOT EXISTS");
  has(MIG_TABLES, "duplicate_object", "and every foreign key is added inside a guard");
}
// The schema mirror exists so the Function can import the tables.
for (const t of ["voicePolls", "voicePollOptions", "voicePollAnswers", "voiceTakes", "voiceResidency"]) {
  has(SCHEMA, `export const ${t} = pgTable(`, `db/schema.ts declares ${t}`);
}
// AND dd_* IS UNTOUCHED. The District Room's own gate keeps its answer, which is
// what makes "the record engines are byte-identical" true of the room as well.
{
  const roomCore = R("netlify/lib/district-room-core.mjs");
  has(roomCore, "RESIDENCY_METHODS_NEVER_VERIFY",
    "the District Room still forbids a location pin from ever verifying");
  has(roomCore, "location_pin", "and still names it");
  // Voice has its own table and its own methods rather than widening the room's.
  no(CORE_CODE, "location_pin", "Voice does not touch the room's pin method");
  no(CORE_CODE, "self_attest", "nor its attestation method");
  has(MIG_TABLES, "voice_residency_method_check", "Voice's methods are its own CHECK");
}

// ═════════════════════════════════════════════════════════════════════════════
section("12 · Slice 1.1 hygiene — one lede, one alias, three record states, one working link");

// ── (1) ONE LEDE ────────────────────────────────────────────────────────────
// Two sentences were stacked at the top of a Voice seat: the district file's
// rooms lede ("Neighbors, issue by issue…") and Voice's required frame line
// ("Verified neighbors. Not a poll of the internet…"). Both are true and neither
// is rewritten here. What is fixed is that only ONE of them leads a given file:
// where Voice is mounted, Voice's frame is the frame, and the rooms lede — which
// describes the rooms list further down — stops claiming the top of the page.
{
  const w = boot("/d/" + HD68);
  await settle(w);
  const head = w.document.getElementById("pdx-district-file-head");
  const voice = w.document.getElementById("pdx-district-file-voice");
  must(head && voice, "the flagship file did not paint — the lede probe is stale");

  const ROOMS_LEDE = w.PDXDistrictFile.COPY.line;
  ok(typeof ROOMS_LEDE === "string" && ROOMS_LEDE.length > 20,
    "district-file.js still owns the rooms lede in exactly one place");
  has(ROOMS_LEDE, "Posting takes a reviewer grant",
    "and it is still the sentence about who may post in a room");

  // NOT ON A VOICE SEAT — not in the letterhead and not anywhere else on the page.
  no(head.innerHTML, ROOMS_LEDE, "the rooms lede is not printed above Voice");
  const painted = w.__nodes.map((n) => n.innerHTML).join(" ");
  no(painted, ROOMS_LEDE, "and not anywhere else on the file either");
  eq((painted.match(/pdxdf-line/g) || []).length, 0,
    "the lede's own element is not painted at all on a Voice seat");

  // AND VOICE'S SENTENCE IS STILL THERE, ONCE, VERBATIM.
  has(voice.innerHTML, CORE_COPY.frame, "Voice's required frame sentence still leads the block");
  eq((painted.match(/Verified neighbors\. Not a poll of the internet\./g) || []).length, 1,
    "exactly one frame sentence — one lede, not two, and not two copies of one");

  // THE TWIN-BOOT GUARANTEE, OBSERVED RATHER THAN ASSUMED. A device that took
  // district-file.js and not district-voice.js — or a seat Voice has not opened —
  // is a ROOMS-ONLY file, and a rooms-only file keeps the lede it always had. The
  // answer comes from PDXVoice rather than from a second allow-list in the file,
  // so dropping PDXVoice off the page is exactly that case.
  w.PDXVoice = null;
  w.PDXDistrictFile.close();
  eq(w.PDXDistrictFile.enter(HD68), true, "the file still opens with no Voice on the page");
  await settle(w);
  const head2 = w.document.getElementById("pdx-district-file-head");
  has(head2.innerHTML, ROOMS_LEDE,
    "and a rooms-only file prints the rooms lede, byte-identical to before Voice existed");
}
// The rooms-only seat is also the whole of scripts/test-district-file.mjs, which
// never boots district-voice.js — so that suite is the standing regression for
// the sentence this one asserts is absent.
has(R("scripts/test-district-file.mjs"), "Neighbors, issue by issue",
  "the rooms-only suite still asserts the lede it owns");
has(R("scripts/test-district-file.mjs"), 'eq(!!WA.PDXVoice, false',
  "and it still asserts Voice is not on the page, which is what makes it that case");
// The file asks Voice rather than keeping a second copy of the allow-list.
has(FILE_SRC, "function voiceHere", "district-file.js asks one question about Voice");
has(FILE_CODE, "window.PDXVoice", "and asks PDXVoice itself");
eq((FILE_CODE.match(/'ut-statehouse-68'/g) || []).length, 1,
  "the seat is named exactly once in district-file.js — its own SHIPPED line");

// ── (2) THE ALIAS, BOTH SPELLINGS, ONE FILE ─────────────────────────────────
// The edge rule is asserted in section 1. This is the other half: with the
// scripts running, BOTH spellings open the same file and the bar ends up on the
// canonical address. Neither one reaches the homepage.
for (const spelling of [HD68, HD68_ALIAS]) {
  const w = boot("/d/" + spelling);
  await settle(w);
  eq(w.PDXDistrictFile.isOpen(), true, `/d/${spelling} opens the district file`);
  eq(w.PDXDistrictFile.district(), HD68, `/d/${spelling} opens the canonical seat`);
  eq(w.PDXVoice.seat(), HD68, `and Voice mounted on the canonical seat from /d/${spelling}`);
  const voice = w.document.getElementById("pdx-district-file-voice");
  must(voice, `/d/${spelling} painted no Voice block`);
  has(voice.innerHTML, CORE_COPY.frame, `/d/${spelling} is the same file, with the same frame`);
  // The bar reads /d/ut-statehouse-68 either way: already there, or moved there.
  const barred = spelling === HD68
    ? w.location.pathname === "/d/" + HD68
    : w.__pushed.includes("/d/" + HD68);
  ok(barred, `/d/${spelling} leaves the reader standing at /d/${HD68}`);
  no(JSON.stringify(w.__pushed), HD68_ALIAS, `/d/${spelling} never pushes the alias`);
  // AND IT IS NOT THE HOMEPAGE. Nothing pushed '/' and the panel is up.
  ok(!w.__pushed.includes("/"), `/d/${spelling} did not fall through to the homepage`);
}

// ── (3) THIS WEEK — THREE STATES, THREE SENTENCES ───────────────────────────
// The strip printed one hedged sentence in all three of "the read is out", "the
// record is empty" and "the read failed". The middle one is HD-68's real answer
// — Chew has no formal act on lands_preserve, and every lands_preserve measure
// in the index is a U.S. House measure a state representative cannot vote on —
// so the empty has to read as FINAL, and the other two have to stop borrowing it.
const WEEK_ISSUE_LABEL = "lands preserve";
const weekSay = (tpl) => String(tpl).replace(/\{issue\}/g, WEEK_ISSUE_LABEL);
const WEEK_BUSY = weekSay(CORE_COPY.weekBusy);
const WEEK_NONE = weekSay(CORE_COPY.weekNone);
const WEEK_UNREAD = weekSay(CORE_COPY.weekUnread);

// The three sentences are three different sentences, owned in one place, and the
// old hedge is gone from the tree.
ok(new Set([WEEK_BUSY, WEEK_NONE, WEEK_UNREAD]).size === 3,
  "the three record states have three distinct sentences");
has(CORE_COPY.weekNone, "{issue}", "the empty names the issue it is empty about");
ok(/[.]$/.test(CORE_COPY.weekNone.trim()), "and it is a finished sentence");
// Over comment-stripped copies, so the comment explaining what the old sentence
// got wrong is allowed to quote it — the repo's own convention for a refusal.
for (const [name, src] of [["the gate", CORE_CODE], ["the client", VOICE_CODE],
  ["the Function", FN_CODE]]) {
  no(src, "in the current record", `${name} no longer hedges with "the current record"`);
}
for (const s of [CORE_COPY.weekNone, CORE_COPY.weekUnread]) {
  no(s, "yet", `"${s}" does not promise a later answer`);
  no(s, "Checking", `"${s}" does not read as a fetch still coming`);
  no(s, "%", `"${s}" carries no percentage`);
}
// All three travel with the payload, so the client never has to invent one.
for (const k of ["weekBusy", "weekNone", "weekUnread"]) {
  has(FN_CODE, `${k}: COPY.${k}`, `the read ships COPY.${k} with the payload`);
}

// (3a) THE READ IS OUT → it says so, once, and it is a live region.
{
  const w = boot("/");
  const payload = seatPayload();
  w.fetch = (url) => {
    const u = String(url);
    // The record read never lands. The seat read does.
    if (u.indexOf("/api/voting-record/member/") === 0) return new Promise(() => {});
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(payload) });
  };
  const host = w.__mk("pdxv-week-probe");
  eq(w.PDXVoice.mount(HD68, "pdxv-week-probe", []), true, "the block mounted for the strip probe");
  await settle(w);
  eq(w.PDXVoice.weekState(), "busy", "with the record read outstanding the strip is still checking");
  has(host.innerHTML, WEEK_BUSY, "and says so, naming the issue it is checking");
  no(host.innerHTML, WEEK_NONE, "it does NOT print the empty before anything was looked at");
  no(host.innerHTML, WEEK_UNREAD, "nor the unread sentence");
  has(host.innerHTML, 'role="status"', "the checking line is announced, because it will change");
}

// (3b) THE RECORD IS EMPTY → one final sentence, naming the issue. HD-68's case.
{
  const w = boot("/d/" + HD68);
  await settle(w);
  const voice = w.document.getElementById("pdx-district-file-voice");
  must(voice, "the flagship file painted no Voice block — the strip probe is stale");
  eq(w.PDXVoice.weekState(), "none",
    "the read landed and the record holds no formal act on this seat's issue");
  has(voice.innerHTML, CORE_COPY.weekHd, "the strip still has its heading");
  has(voice.innerHTML, WEEK_NONE, "and one final sentence under it, naming the issue");
  no(voice.innerHTML, WEEK_BUSY, "nothing is still being checked");
  no(voice.innerHTML, WEEK_UNREAD, "and nothing failed");
  no(voice.innerHTML, "pdxv-weeklink", "there is no act link, because there is no act");
  no(voice.innerHTML, "%", "and no percentage on the strip");
  // THE POLL IS NOT RETARGETED. The empty strip is about the poll's issue, and
  // the poll is still asking what it was seeded to ask.
  eq(w.PDXVoice.payload().poll.issueKey, FLAGSHIP_ISSUE,
    "the poll still asks about the issue it was seeded on");
  has(voice.innerHTML, "which should state policy weigh more heavily",
    "and the question itself is untouched");
}

// (3c) THE READ FAILED → its own sentence. "We did not look" is not "there is
// nothing", and the strip is not allowed to say the second when it means the first.
{
  const w = boot("/d/" + HD68, { recordStatus: 500 });
  await settle(w);
  const voice = w.document.getElementById("pdx-district-file-voice");
  eq(w.PDXVoice.weekState(), "unread", "a record read that fails is not an empty record");
  has(voice.innerHTML, WEEK_UNREAD, "and it says which of the two happened");
  no(voice.innerHTML, WEEK_NONE, "without claiming the record is empty");
  no(voice.innerHTML, WEEK_BUSY, "and without leaving the strip checking forever");
  // The rest of the block is unharmed — the strip is best effort, as it always was.
  has(voice.innerHTML, CORE_COPY.frame, "the frame sentence survives a failed record read");
  has(voice.innerHTML, "which should state policy weigh more heavily",
    "and so does the question");
}

// (3d) NO SEAT-HOLDER TO ASK ABOUT → also unread, never empty.
{
  const w = boot("/", { extras: { pdxSeatedMemberFor: () => "" } });
  const host = w.__mk("pdxv-week-nopid");
  w.PDXVoice.mount(HD68, "pdxv-week-nopid", []);
  await settle(w);
  eq(w.PDXVoice.weekState(), "unread",
    "with nobody resolved to ask about, the record was not read — and the strip says that");
  has(host.innerHTML, WEEK_UNREAD, "in the unread sentence, not the empty one");
  no(host.innerHTML, WEEK_NONE, "the empty is reserved for a read that actually landed");
}

// (3e) AN ACT ON FILE → it is printed, as a link to its own source.
{
  const ACT = {
    title: "H.B. 214 — Senate concurrence",
    date: "Feb 11, 2026",
    issueKey: FLAGSHIP_ISSUE,
    source: { url: "https://le.utah.gov/~2026/bills/static/HB0214.html" },
  };
  const w = boot("/d/" + HD68, { record: { items: [ACT] } });
  await settle(w);
  const voice = w.document.getElementById("pdx-district-file-voice");
  eq(w.PDXVoice.weekState(), "act", "an act on file is an act on file");
  has(voice.innerHTML, "pdxv-weeklink", "and it is printed as a link");
  has(voice.innerHTML, ACT.title, "with the act's own title");
  has(voice.innerHTML, ACT.date, "and its date");
  has(voice.innerHTML, ACT.source.url, "pointing at the record's own source");
  has(voice.innerHTML, 'rel="noopener noreferrer"', "opened safely");
  no(voice.innerHTML, WEEK_NONE, "and the empty sentence is gone");
  no(voice.innerHTML, WEEK_BUSY, "and so is the checking one");
  no(voice.innerHTML, "%", "an act is a thing that happened, not a percentage");
}

// (3f) AN ACT ON A DIFFERENT KEY IS DROPPED, NOT PRINTED. The strip and the poll
// ask about the same issue or the strip says nothing. No fallback key, no nearest
// neighbour and no invented mapping — a strip quietly answering a different
// question than the poll above it is worse than an empty strip that names its own.
{
  const w = boot("/d/" + HD68, {
    record: {
      items: [{
        title: "H.B. 9 — passage", date: "Jan 30, 2026", issueKey: "guns",
        source: { url: "https://example.invalid/hb9" },
      }],
    },
  });
  await settle(w);
  const voice = w.document.getElementById("pdx-district-file-voice");
  eq(w.PDXVoice.weekState(), "none", "an act on another issue is not this issue's act");
  no(voice.innerHTML, "H.B. 9", "so it is not printed under a heading the poll owns");
  no(voice.innerHTML, "guns", "and the other issue is not named on the file at all");
  has(voice.innerHTML, WEEK_NONE, "the strip says what it honestly has: nothing on this key");
}

// ── (4) THE PERSON LINK IS A REAL CONTROL ───────────────────────────────────
// "Neighbors in this seat" was already a real anchor with a real href. What it
// was not was a working control: the person modal and this panel share z-index 50
// and document order decides, so the file opened UNDERNEATH the modal the reader
// tapped it in. The file now hands the person file off on the way in.
{
  const w = boot("/");
  // The person modal, up, exactly as index.html and openModal leave it.
  const over = w.__mk("modal-overlay");
  over.style.display = "flex";
  const closes = [];
  w.closeModal = () => {
    // Recorded at CALL time, so "before the address moved" is observed and not
    // inferred: closeModal hands the bar back through PDXPerson.restore(), and
    // this file's stamp has to happen after that, never before it.
    closes.push({ pushed: w.__pushed.length });
    over.style.display = "none";
  };

  const link = w.PDXVoice.personLinkHtml(CHEW);
  has(link, 'data-pdxdf-open="' + HD68 + '"', "the link carries the seat the file opens on");
  has(link, 'href="/d/' + HD68 + '"', "and is a real address that can be copied or opened in a tab");
  // STILL ONE QUIET LINE. No chip, no count, no activity dot.
  eq((String(link).match(/<a /g) || []).length, 1, "still exactly one anchor");
  no(link, "pdxv-dot", "no activity dot");
  no(link, "pdxv-chip", "no chip");
  ok(!/\d/.test(String(link).replace(/ut-statehouse-68|pf-kick-voice/g, "")),
    "and no count of any kind");

  eq(w.PDXDistrictFile.enter(HD68), true, "tapping it opens the district file");
  eq(closes.length, 1, "and closes the person file it was tapped in, exactly once");
  eq(closes[0].pushed, 0, "before this file took the address, not after");
  eq(w.PDXDistrictFile.isOpen(), true, "the file is the surface the reader is left on");
  ok(w.__pushed.includes("/d/" + HD68), "standing at the seat's canonical address");
  eq(over.style.display, "none", "with nothing of the person modal left lurking over it");
  await settle(w);
  const voice = w.document.getElementById("pdx-district-file-voice");
  must(voice, "the file opened from the person link painted no Voice block");
  has(voice.innerHTML, CORE_COPY.frame, "and it is the same file, with the same frame");
}

// A MODAL THAT IS NOT UP IS NOT TOUCHED. closeModal() rewrites the address on the
// way out, so calling it for a reader who never opened a person file would move
// the bar for no reason.
{
  const w = boot("/");
  const over = w.__mk("modal-overlay");
  over.style.display = "none";
  let called = 0;
  w.closeModal = () => { called++; };
  eq(w.PDXDistrictFile.enter(HD68), true, "the file opens with no person modal up");
  eq(called, 0, "and closeModal is not called on a modal that was already closed");
}
// And a page with no person modal at all — every other surface Voice's link is
// not on — opens the file without reaching for one.
{
  const w = boot("/");
  let called = 0;
  w.closeModal = () => { called++; };
  eq(w.PDXDistrictFile.enter(HD68), true, "the file opens on a page with no person modal");
  eq(called, 0, "and asks nothing of closeModal");
}
// Lee and Cox are not in this seat, so the link is absent from their files —
// asserted in section 9 over the real builder, and the reason it holds is that
// the seat is resolved from the curated incumbent table rather than guessed.
eq(boot("/").PDXVoice.personLinkHtml("lee"), "", "Lee gets no link");
eq(boot("/").PDXVoice.personLinkHtml("cox"), "", "and neither does Cox");

// ═════════════════════════════════════════════════════════════════════════════
section("13 · the block reads as a place — one loud question, one empty sentence");

// ── THE QUESTION IS THE LOUDEST THING IN THE BLOCK ──────────────────────────
// Every block on this seat was a labelled paragraph at the same size under an
// accent-blue uppercase kicker, so the one thing on the page asking the reader
// for something looked exactly like the five things telling them something. The
// question is now the display face at display size; every label is the kicker
// face in slate.
ok(/\.pdxv-q\s*\{[^}]*Bebas Neue/.test(CSS_CODE), "the question is set in the display face");
ok(/\.pdxv-q\s*\{[^}]*clamp\(/.test(CSS_CODE),
  "sized against the VIEWPORT — and there is no count in the world that moves it");
ok(/\.pdxv-q\s*\{[^}]*#f0f9ff/.test(CSS_CODE), "at the block's brightest ink");
for (const kicker of ["pdxv-blockhd", "pdxv-kick", "pdxv-clabel", "pdxv-weekkick", "pdxv-takeissue"]) {
  ok(new RegExp("\\." + kicker + "[^{]*\\{[^}]*Barlow Condensed").test(CSS_CODE),
    `.${kicker} is set in the small kicker face`);
  ok(!new RegExp("\\." + kicker + "[^{]*\\{[^}]*Bebas Neue").test(CSS_CODE),
    `and .${kicker} is not set in the display face — a label may not out-shout the question`);
}

// ── THREE CARDS, AND EVERY CARD IS THE SAME CARD ────────────────────────────
// The choices were thin full-width rows indistinguishable from the composer's
// own controls. They are cards now, and they are equal BY CONSTRUCTION: one grid
// track each, one min-height, one padding, one border. No arrangement of counts
// can make one choice bigger, brighter or first.
ok(/\.pdxv-opts\s*\{[^}]*display:\s*grid/.test(CSS_CODE), "the choices are a grid of cards");
ok(/\.pdxv-opts\s*\{[^}]*auto-fit/.test(CSS_CODE),
  "which wraps on the viewport's width and on nothing else");
ok(/min-height:\s*\d+px/.test(CSS_CODE),
  "and the card has a constant min-height, so a card with no count is the size of one with a count");
// The count chip is one fixed size. This is the whole treatment a count gets.
ok(/\.pdxv-optcount\s*\{[^}]*tabular-nums/.test(CSS_CODE), "the count is in tabular figures");
ok(/\.pdxv-optcount\s*\{[^}]*padding:\s*[\d.]+px\s+[\d.]+px/.test(CSS_CODE),
  "in a chip with a constant padding — never a length a number could set");

// ── THE DASHED WELL, AND ONE EMPTY STATE INSTEAD OF TWO ─────────────────────
// Zero takes plus a reader who cannot post used to be two stacked boxes: an
// empty-takes sentence, then a closed note under it. It is one outline now,
// holding the sentence and the server's own reason. A solid empty card reads as
// something that failed to load; dashes read as a space nobody has filled.
ok(/\.pdxv-well\s*\{[^}]*border:\s*1px dashed/.test(CSS_CODE),
  "the empty-takes well is a dashed outline, not a card");
{
  const w = boot("/d/" + HD68);
  await settle(w);
  const voice = w.document.getElementById("pdx-district-file-voice");
  const seen = voice ? voice.innerHTML : "";
  has(seen, "pdxv-well", "a signed-out reader with no takes gets the well");
  has(seen, CORE_COPY.emptyTakes, "holding the one empty sentence");
  has(seen, CORE_COPY.closedSignedOut, "and the server's own reason, inside the same outline");
  eq((seen.match(/pdxv-closed/g) || []).length, 1,
    "printed once — the closed note is not also stacked under the well");
  eq((seen.match(/pdxv-well/g) || []).length, 1, "and there is exactly one well");
}
// A reader who CAN post gets the composer, not the well's note — the well is for
// the case where there is nothing to read and nothing to write.
{
  const w = boot("/d/" + HD68, {
    currentUser: { uid: "u", isAnonymous: false, getIdToken: () => Promise.resolve("t") },
    payload: seatPayload({ voice: { canPost: true, reason: "verified", note: "" } }),
  });
  await settle(w);
  const voice = w.document.getElementById("pdx-district-file-voice");
  const seen = voice ? voice.innerHTML : "";
  has(seen, "pdxv-body", "a verified neighbour still gets the composer");
  has(seen, CORE_COPY.emptyTakes, "and still reads the honest empty above it");
  no(seen, "pdxv-closed", "with no closed note, because nothing is closed to them");
}

// ── THE RECORD STRIP SAYS WHICH IT MEANS BY ITS SHAPE ───────────────────────
// An act is a block with the bill's own number on it and a door to the record.
// No act is ONE QUIET LINE under the question — an aside, demoted, not a peer
// section with a heading and an empty state of its own.
{
  const w = boot("/d/" + HD68, {
    record: {
      items: [{
        number: "H.B. 256",
        title: "Municipal and County Zoning Amendments",
        date: "2025-03-06",
        issueKey: FLAGSHIP_ISSUE,
        source: { url: "https://le.utah.gov/~2025/bills/static/HB0256.html" },
      }],
    },
  });
  await settle(w);
  const voice = w.document.getElementById("pdx-district-file-voice");
  const seen = voice ? voice.innerHTML : "";
  has(seen, "pdxv-weeklink", "a landed act is a block with a door");
  has(seen, "H.B. 256", "carrying the bill's own number");
  has(seen, "pdxv-weeknum", "printed as the citation it is");
  has(seen, "Municipal and County Zoning Amendments", "and the bill's own title");
  has(seen, "Mar 6, 2025", "with the date in the app's own long form");
  no(seen, "2025-03-06", "rather than the wire format it arrived in");
  has(seen, "https://le.utah.gov/~2025/bills/static/HB0256.html", "and the record's own source");
  no(seen, "pdxv-week--quiet", "and no quiet line, because there is an act");
  no(seen, "%", "an act is a thing that happened, not a percentage");
}
// AN ACT WITH NO NUMBER IS STILL AN ACT. The number is printed when the record
// carries one and omitted when it does not — no placeholder citation.
{
  const w = boot("/d/" + HD68, {
    record: { items: [{ title: "Senate concurrence", date: "Feb 11, 2026",
      issueKey: FLAGSHIP_ISSUE, source: { url: "https://example.test/x" } }] },
  });
  await settle(w);
  const seen = w.document.getElementById("pdx-district-file-voice").innerHTML;
  has(seen, "pdxv-weeklink", "an act with no number is still printed");
  has(seen, "Senate concurrence", "under its own title");
  no(seen, "pdxv-weeknum", "with no empty citation slot");
}
// AN ACT THAT NAMES NO ISSUE AT ALL IS TRUSTED. The record was asked for this
// member AND this issue, so an item that carries no key of its own is an answer
// to that question — the guard drops items that name a DIFFERENT issue, not items
// that name none. Dropping those would empty the strip on every record whose rows
// do not repeat the key back.
{
  const w = boot("/d/" + HD68, {
    record: { items: [{ title: "Third reading", date: "Jan 5, 2026",
      source: { url: "https://example.test/y" } }] },
  });
  await settle(w);
  eq(w.PDXVoice.weekState(), "act", "an item with no issue key of its own is this issue's act");
  has(w.document.getElementById("pdx-district-file-voice").innerHTML, "Third reading",
    "and it is printed");
}
// THE QUIET LINE IS DEMOTED, IN THE SHEET. No heading, no card, no border — the
// kicker is smaller and greyer than every other kicker in the block, because it
// labels an aside rather than a section.
{
  const w = boot("/d/" + HD68, { record: { items: [] } });
  await settle(w);
  const seen = w.document.getElementById("pdx-district-file-voice").innerHTML;
  has(seen, "pdxv-week--quiet", "no act is one quiet line");
  has(seen, WEEK_NONE, "saying honestly that there is nothing on this key");
  no(seen, "pdxv-weeklink", "with no door to a record that does not exist");
  // One line, not a section: the kicker and the sentence share one element.
  eq((seen.match(/pdxv-week--quiet/g) || []).length, 1, "printed once");
  has(seen, "pdxv-weekkick", "with a kicker rather than a heading");
}
ok(/\.pdxv-week--quiet\s*\{[^}]*padding:\s*0/.test(CSS_CODE),
  "the quiet line has no padding — it is a line, not a panel");
ok(!/\.pdxv-week--quiet\s*\{[^}]*border:/.test(CSS_CODE), "and no border");

// ── THE TAKE'S RAIL IS THE SUBJECT, AND IT IS BORROWED ─────────────────────
// The rail carries the issue's colour from PDXIssueColors through inline
// --pdx-ic* properties, so this sheet holds no per-issue rule and cannot
// disagree with any other surface. THIS SUITE LOADS NO COLOUR MODULE, which is
// the fail-soft case: the neutral rail, and no data-ic at all.
has(CSS_CODE, 'data-ic="on"', "the sheet dresses a resolved issue colour");
ok(/\.pdxv-take\s*\{[^}]*border-left:\s*3px/.test(CSS_CODE),
  "the rail is 3px on every take — it says which issue, never how much");
ok(/\.pdxv-take\[data-ic="on"\]\s*\{\s*border-left-color:\s*var\(--pdx-ic\)/.test(CSS_CODE),
  "and a resolved key changes its colour, not its width");
has(VOICE_CODE, "window.PDXIssueColors", "the client asks the module that owns the mapping");
has(VOICE_CODE, "C.skin(", "through the same skin() resolver every other surface uses");
ok(!/#[0-9a-f]{6}/i.test(VOICE_CODE), "and hard-codes no colour of its own");

// ═════════════════════════════════════════════════════════════════════════════
// ── Result ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  failures.forEach((f) => console.error(`   ✗ ${f}`));
  console.error(`\n✗ district-voice: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ district-voice: all ${passed} assertions passed`);
console.log("   one address + one alias · read free, writes gated · 2 gates exhaustive, 1 allow each · " +
  "counts not percentages · Chew on the letterhead, honest empty · 2 mounts, no new nav · " +
  "1 canonical sitemap URL · twin boot: DM / WVA / finance unchanged · " +
  "one lede · both spellings · 3 record states · the person link opens the file");
