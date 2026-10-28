// ─────────────────────────────────────────────────────────────────────────────
// District board composer — THE GATE (every district board)
// ─────────────────────────────────────────────────────────────────────────────
// This is the one place a board takes a voice. It opened on FIVE named seats —
// SD-3, then the Layton cluster's HD-16, SD-7, HD-15 and UT-2 — and now covers
// every seat that has a board: SD-6, every generated district board and the
// three statewide boards (ut-gov and both U.S. Senate seats), every other
// state's U.S. House and U.S. Senate board, and the contested State House and
// State Senate boards of the thirteen density states (STATE_LEG_VOICED_STATES
// in scripts/gen-district-boards.mjs). The allow-list
// below is still ROWS, never a pattern, for the same reason BOARD_SEATS in
// district-board.mts is: a seat with no board must never take a post. The
// generated rows are written by scripts/gen-district-boards.mjs from the same
// plan that writes BOARD_SEATS, so the two lists cannot drift.
//
// ── THE GATE, AND IT FAILS CLOSED ───────────────────────────────────────────
// A post is accepted only when BOTH are true on the server:
//
//   1. signed in       a verified, non-anonymous Firebase identity.
//   2. verified_seat   the account carries a residency row for THIS seat whose
//      === this seat   status is 'verified' AND whose method is 'vendor' — the
//                      ID check (Didit). A 'location_match'
//                      row does NOT open this composer: that method is a
//                      consistency check on a location the reader typed, and a
//                      typed location or zip is not proof of residency.
//
// THE ONLY WRITER OF method = 'vendor' is the signed Didit decision webhook
// (netlify/lib/residency-vendor-core.mjs), and it writes the seat the session
// was started from plus every other composer seat the reader's saved location
// resolved at start (the hallway's resolver, bound into the signed session).
// Until a row lands for THIS seat the gate
// refuses, and the composer is on the page, disabled, with the locked line. It
// is NOT faked verified — there is no flag, env var or test hook that turns it on.
//
// ── A REFUSAL WRITES NOTHING ────────────────────────────────────────────────
// Every refusal returns before the store's insert is reachable. The gate is
// asked BEFORE the issue and the body are even looked at, so an unverified
// caller learns only that they are unverified (403) and a verified one learns
// what was wrong with the post (400).
//
// ── NO PERSON ON THE WIRE ───────────────────────────────────────────────────
// A post goes out as { id, issueKey, body, createdAt, mine } and nothing else:
// no author hash, no uid, no name, no email, no address. `mine` is computed here
// by comparing hashes so the wire carries nothing that could group one person's
// posts. The store is voice_takes, the seat-scoped table band 2 already counts,
// so a post moves "People who answered a poll or wrote a comment" from the same
// rows the counts endpoint reads.
//
// ── THE DAILY CAP, AFTER THE GATE ───────────────────────────────────────────
// A verified resident who is not a member gets ONE comment a Mountain-time
// calendar day on this seat
// (netlify/lib/membership-core.mjs). The cap is asked only AFTER the residency
// gate and the post checks have passed, so membership can never stand in for a
// vendor row: a member with no row for this seat is 403 like anybody else. A
// second comment the same day is 429 with CAP_COPY.comment and
// writes nothing. The GET never carries the flag or an account id.
//
// ── WHO MAY START THE CHECK ─────────────────────────────────────────────────
// ONE CHECK COVERS EVERY RESOLVED SEAT. The GET answers `voice.canVerify` —
// true for any signed-in reader unverified on THIS seat and holding no
// verified vendor row on ANY composer seat — and the composer
// paints the proof button on that alone. It is the caller's own permission,
// not the flag: a verified resident reads false member or not, so a member and
// a non-member who can both post still read byte-identical JSON.
// POST /api/residency-verify asks the same canVerifyHere() and is 403 without it.
//
// ── THE GENERAL ROOM ────────────────────────────────────────────────────────
// Every board's first thread. `room: "general"` on a POST, `?room=general` on a
// GET. A general comment is a voice_takes row with no issue and a holder_pid:
// the seat's sitting member AT WRITE TIME, from netlify/lib/seat-holders.mjs via
// general-room-core.mjs — never a pid the caller sent. A GET may ask for a
// previous holder's thread with `&holder=<pid>`, and only a pid that table lists
// for THIS seat is answered; that thread is read-only (`canPost` is false
// there). Same gate, same daily cap, same public shape as an issue comment.
//
// ── LIKES ───────────────────────────────────────────────────────────────────
// `{ seat, action: "like", postId }`. One like per verified resident per
// comment: the liker is the same seat-scoped hash, and the store's unique index
// makes a second like a no-op (200, same count, nothing written). The gate is
// the composer's gate, asked first, so an unverified caller is 403 and writes
// nothing. A comment from another seat is 404. Every post on the wire carries
// `likes` (a count) and `liked` (whether THIS caller liked it, computed here
// like `mine`) — never who.
//
// Pure over injected dependencies, so scripts/test-district-board-composer.mjs
// drives the real handler against an in-memory fake and asserts what was
// written — no database, no network.

import crypto from "node:crypto";
import { authorHash, normalizeSeatKey } from "./district-voice-core.mjs";
import { CAP_COPY, DAILY_COMMENTS, dayStart, memberFor } from "./membership-core.mjs";
import { holderFor, previousFor, threadFor } from "./general-room-core.mjs";

// NAMED ROWS. Canonical seat key → the board alias the flag is spelled in. A
// verified flag for one of these seats opens that seat's box and no other.
export const COMPOSER_SEATS = {
  "ut-statesenate-3": "ut-sd-3",
  "ut-statehouse-16": "ut-hd-16",
  "ut-statesenate-7": "ut-sd-7",
  "ut-statehouse-15": "ut-hd-15",
  "ut-house-2": "ut-cd-2",
  "ut-statesenate-6": "ut-sd-6",
  // @generated district-boards begin — scripts/gen-district-boards.mjs writes every line up to the end marker, do not edit by hand
  "ut-statehouse-4": "ut-hd-4",
  "ut-statehouse-5": "ut-hd-5",
  "ut-statehouse-6": "ut-hd-6",
  "ut-statehouse-9": "ut-hd-9",
  "ut-statehouse-10": "ut-hd-10",
  "ut-statehouse-11": "ut-hd-11",
  "ut-statehouse-12": "ut-hd-12",
  "ut-statehouse-14": "ut-hd-14",
  "ut-statehouse-19": "ut-hd-19",
  "ut-statehouse-21": "ut-hd-21",
  "ut-statehouse-22": "ut-hd-22",
  "ut-statehouse-23": "ut-hd-23",
  "ut-statehouse-24": "ut-hd-24",
  "ut-statehouse-25": "ut-hd-25",
  "ut-statehouse-28": "ut-hd-28",
  "ut-statehouse-29": "ut-hd-29",
  "ut-statehouse-30": "ut-hd-30",
  "ut-statehouse-31": "ut-hd-31",
  "ut-statehouse-33": "ut-hd-33",
  "ut-statehouse-34": "ut-hd-34",
  "ut-statehouse-36": "ut-hd-36",
  "ut-statehouse-37": "ut-hd-37",
  "ut-statehouse-39": "ut-hd-39",
  "ut-statehouse-41": "ut-hd-41",
  "ut-statehouse-42": "ut-hd-42",
  "ut-statehouse-43": "ut-hd-43",
  "ut-statehouse-44": "ut-hd-44",
  "ut-statehouse-45": "ut-hd-45",
  "ut-statehouse-46": "ut-hd-46",
  "ut-statehouse-49": "ut-hd-49",
  "ut-statehouse-50": "ut-hd-50",
  "ut-statehouse-51": "ut-hd-51",
  "ut-statehouse-52": "ut-hd-52",
  "ut-statehouse-53": "ut-hd-53",
  "ut-statehouse-55": "ut-hd-55",
  "ut-statehouse-56": "ut-hd-56",
  "ut-statehouse-59": "ut-hd-59",
  "ut-statehouse-60": "ut-hd-60",
  "ut-statehouse-61": "ut-hd-61",
  "ut-statehouse-63": "ut-hd-63",
  "ut-statehouse-64": "ut-hd-64",
  "ut-statehouse-65": "ut-hd-65",
  "ut-statehouse-66": "ut-hd-66",
  "ut-statehouse-67": "ut-hd-67",
  "ut-statehouse-68": "ut-hd-68",
  "ut-statehouse-69": "ut-hd-69",
  "ut-statehouse-70": "ut-hd-70",
  "ut-statehouse-71": "ut-hd-71",
  "ut-statehouse-73": "ut-hd-73",
  "ut-statehouse-75": "ut-hd-75",
  "ut-statesenate-1": "ut-sd-1",
  "ut-statesenate-2": "ut-sd-2",
  "ut-statesenate-4": "ut-sd-4",
  "ut-statesenate-5": "ut-sd-5",
  "ut-statesenate-8": "ut-sd-8",
  "ut-statesenate-9": "ut-sd-9",
  "ut-statesenate-10": "ut-sd-10",
  "ut-statesenate-11": "ut-sd-11",
  "ut-statesenate-12": "ut-sd-12",
  "ut-statesenate-13": "ut-sd-13",
  "ut-statesenate-14": "ut-sd-14",
  "ut-statesenate-15": "ut-sd-15",
  "ut-statesenate-16": "ut-sd-16",
  "ut-statesenate-17": "ut-sd-17",
  "ut-statesenate-18": "ut-sd-18",
  "ut-statesenate-19": "ut-sd-19",
  "ut-statesenate-20": "ut-sd-20",
  "ut-statesenate-21": "ut-sd-21",
  "ut-statesenate-22": "ut-sd-22",
  "ut-statesenate-23": "ut-sd-23",
  "ut-statesenate-24": "ut-sd-24",
  "ut-statesenate-25": "ut-sd-25",
  "ut-statesenate-26": "ut-sd-26",
  "ut-statesenate-27": "ut-sd-27",
  "ut-statesenate-28": "ut-sd-28",
  "ut-statesenate-29": "ut-sd-29",
  "ut-house-1": "ut-cd-1",
  "ut-house-3": "ut-cd-3",
  "ut-house-4": "ut-cd-4",
  "ut-gov": "ut-gov",
  "ut-us-senate-curtis": "ut-us-senate-curtis",
  "ut-us-senate-lee": "ut-us-senate-lee",
  "al-house-1": "al-cd-1",
  "al-house-2": "al-cd-2",
  "al-house-3": "al-cd-3",
  "al-house-4": "al-cd-4",
  "al-house-5": "al-cd-5",
  "al-house-6": "al-cd-6",
  "al-house-7": "al-cd-7",
  "al-us-senate-britt": "al-us-senate-britt",
  "al-us-senate-tommy_tuberville": "al-us-senate-tommy_tuberville",
  "ak-house-1": "ak-cd-1",
  "ak-us-senate-murkowski": "ak-us-senate-murkowski",
  "ak-us-senate-dan_sullivan": "ak-us-senate-dan_sullivan",
  "az-house-1": "az-cd-1",
  "az-house-2": "az-cd-2",
  "az-house-3": "az-cd-3",
  "az-house-4": "az-cd-4",
  "az-house-5": "az-cd-5",
  "az-house-6": "az-cd-6",
  "az-house-7": "az-cd-7",
  "az-house-8": "az-cd-8",
  "az-house-9": "az-cd-9",
  "az-us-senate-mark_kelly": "az-us-senate-mark_kelly",
  "az-us-senate-gallego": "az-us-senate-gallego",
  "ar-house-1": "ar-cd-1",
  "ar-house-3": "ar-cd-3",
  "ar-house-4": "ar-cd-4",
  "ar-us-senate-cotton": "ar-us-senate-cotton",
  "ar-us-senate-boozman": "ar-us-senate-boozman",
  "ca-house-1": "ca-cd-1",
  "ca-house-3": "ca-cd-3",
  "ca-house-4": "ca-cd-4",
  "ca-house-5": "ca-cd-5",
  "ca-house-6": "ca-cd-6",
  "ca-house-7": "ca-cd-7",
  "ca-house-8": "ca-cd-8",
  "ca-house-9": "ca-cd-9",
  "ca-house-10": "ca-cd-10",
  "ca-house-11": "ca-cd-11",
  "ca-house-12": "ca-cd-12",
  "ca-house-13": "ca-cd-13",
  "ca-house-15": "ca-cd-15",
  "ca-house-16": "ca-cd-16",
  "ca-house-19": "ca-cd-19",
  "ca-house-20": "ca-cd-20",
  "ca-house-21": "ca-cd-21",
  "ca-house-22": "ca-cd-22",
  "ca-house-23": "ca-cd-23",
  "ca-house-24": "ca-cd-24",
  "ca-house-25": "ca-cd-25",
  "ca-house-26": "ca-cd-26",
  "ca-house-27": "ca-cd-27",
  "ca-house-28": "ca-cd-28",
  "ca-house-29": "ca-cd-29",
  "ca-house-30": "ca-cd-30",
  "ca-house-31": "ca-cd-31",
  "ca-house-32": "ca-cd-32",
  "ca-house-34": "ca-cd-34",
  "ca-house-35": "ca-cd-35",
  "ca-house-37": "ca-cd-37",
  "ca-house-38": "ca-cd-38",
  "ca-house-40": "ca-cd-40",
  "ca-house-41": "ca-cd-41",
  "ca-house-44": "ca-cd-44",
  "ca-house-45": "ca-cd-45",
  "ca-house-46": "ca-cd-46",
  "ca-house-47": "ca-cd-47",
  "ca-house-48": "ca-cd-48",
  "ca-house-49": "ca-cd-49",
  "ca-house-50": "ca-cd-50",
  "ca-house-51": "ca-cd-51",
  "ca-house-52": "ca-cd-52",
  "ca-us-senate-schiff": "ca-us-senate-schiff",
  "ca-us-senate-padilla": "ca-us-senate-padilla",
  "co-house-3": "co-cd-3",
  "co-house-5": "co-cd-5",
  "co-house-6": "co-cd-6",
  "co-house-7": "co-cd-7",
  "co-house-8": "co-cd-8",
  "co-us-senate-bennet": "co-us-senate-bennet",
  "co-us-senate-hickenlooper": "co-us-senate-hickenlooper",
  "ct-house-1": "ct-cd-1",
  "ct-house-2": "ct-cd-2",
  "ct-house-5": "ct-cd-5",
  "ct-us-senate-chris_murphy": "ct-us-senate-chris_murphy",
  "ct-us-senate-blumenthal": "ct-us-senate-blumenthal",
  "de-us-senate-coons": "de-us-senate-coons",
  "de-us-senate-blunt_rochester": "de-us-senate-blunt_rochester",
  "fl-house-1": "fl-cd-1",
  "fl-house-2": "fl-cd-2",
  "fl-house-3": "fl-cd-3",
  "fl-house-4": "fl-cd-4",
  "fl-house-5": "fl-cd-5",
  "fl-house-6": "fl-cd-6",
  "fl-house-7": "fl-cd-7",
  "fl-house-8": "fl-cd-8",
  "fl-house-9": "fl-cd-9",
  "fl-house-11": "fl-cd-11",
  "fl-house-12": "fl-cd-12",
  "fl-house-14": "fl-cd-14",
  "fl-house-15": "fl-cd-15",
  "fl-house-16": "fl-cd-16",
  "fl-house-17": "fl-cd-17",
  "fl-house-18": "fl-cd-18",
  "fl-house-22": "fl-cd-22",
  "fl-house-23": "fl-cd-23",
  "fl-house-24": "fl-cd-24",
  "fl-house-25": "fl-cd-25",
  "fl-house-26": "fl-cd-26",
  "fl-house-27": "fl-cd-27",
  "fl-house-28": "fl-cd-28",
  "fl-us-senate-ashley_moody": "fl-us-senate-ashley_moody",
  "fl-us-senate-rick_scott": "fl-us-senate-rick_scott",
  "ga-house-1": "ga-cd-1",
  "ga-house-2": "ga-cd-2",
  "ga-house-3": "ga-cd-3",
  "ga-house-4": "ga-cd-4",
  "ga-house-5": "ga-cd-5",
  "ga-house-6": "ga-cd-6",
  "ga-house-7": "ga-cd-7",
  "ga-house-8": "ga-cd-8",
  "ga-house-9": "ga-cd-9",
  "ga-house-10": "ga-cd-10",
  "ga-house-11": "ga-cd-11",
  "ga-house-12": "ga-cd-12",
  "ga-house-14": "ga-cd-14",
  "ga-us-senate-jon_ossoff": "ga-us-senate-jon_ossoff",
  "ga-us-senate-warnock": "ga-us-senate-warnock",
  "hi-house-1": "hi-cd-1",
  "hi-house-2": "hi-cd-2",
  "hi-us-senate-hirono": "hi-us-senate-hirono",
  "hi-us-senate-schatz": "hi-us-senate-schatz",
  "id-house-1": "id-cd-1",
  "id-house-2": "id-cd-2",
  "id-us-senate-risch": "id-us-senate-risch",
  "id-us-senate-crapo": "id-us-senate-crapo",
  "il-house-1": "il-cd-1",
  "il-house-2": "il-cd-2",
  "il-house-4": "il-cd-4",
  "il-house-5": "il-cd-5",
  "il-house-6": "il-cd-6",
  "il-house-7": "il-cd-7",
  "il-house-10": "il-cd-10",
  "il-house-11": "il-cd-11",
  "il-house-13": "il-cd-13",
  "il-house-14": "il-cd-14",
  "il-house-15": "il-cd-15",
  "il-house-16": "il-cd-16",
  "il-house-17": "il-cd-17",
  "il-us-senate-durbin": "il-us-senate-durbin",
  "il-us-senate-duckworth": "il-us-senate-duckworth",
  "in-house-1": "in-cd-1",
  "in-house-2": "in-cd-2",
  "in-house-3": "in-cd-3",
  "in-house-4": "in-cd-4",
  "in-house-5": "in-cd-5",
  "in-house-6": "in-cd-6",
  "in-house-7": "in-cd-7",
  "in-house-8": "in-cd-8",
  "in-house-9": "in-cd-9",
  "in-us-senate-banks": "in-us-senate-banks",
  "in-us-senate-todd_young": "in-us-senate-todd_young",
  "ia-house-1": "ia-cd-1",
  "ia-house-2": "ia-cd-2",
  "ia-house-3": "ia-cd-3",
  "ia-house-4": "ia-cd-4",
  "ia-us-senate-grassley": "ia-us-senate-grassley",
  "ia-us-senate-ernst": "ia-us-senate-ernst",
  "ks-house-1": "ks-cd-1",
  "ks-house-2": "ks-cd-2",
  "ks-house-3": "ks-cd-3",
  "ks-house-4": "ks-cd-4",
  "ks-us-senate-roger_marshall": "ks-us-senate-roger_marshall",
  "ks-us-senate-jerry_moran": "ks-us-senate-jerry_moran",
  "ky-house-3": "ky-cd-3",
  "ky-house-5": "ky-cd-5",
  "ky-house-6": "ky-cd-6",
  "ky-us-senate-mcconnell": "ky-us-senate-mcconnell",
  "ky-us-senate-rand_paul": "ky-us-senate-rand_paul",
  "la-house-2": "la-cd-2",
  "la-house-3": "la-cd-3",
  "la-house-5": "la-cd-5",
  "la-house-6": "la-cd-6",
  "la-us-senate-kennedy_john": "la-us-senate-kennedy_john",
  "la-us-senate-cassidy": "la-us-senate-cassidy",
  "me-us-senate-collins": "me-us-senate-collins",
  "me-us-senate-angus_king": "me-us-senate-angus_king",
  "md-house-2": "md-cd-2",
  "md-house-3": "md-cd-3",
  "md-house-4": "md-cd-4",
  "md-house-6": "md-cd-6",
  "md-house-7": "md-cd-7",
  "md-us-senate-alsobrooks": "md-us-senate-alsobrooks",
  "md-us-senate-van_hollen": "md-us-senate-van_hollen",
  "ma-house-3": "ma-cd-3",
  "ma-house-8": "ma-cd-8",
  "ma-house-9": "ma-cd-9",
  "ma-us-senate-warren": "ma-us-senate-warren",
  "ma-us-senate-markey": "ma-us-senate-markey",
  "mi-house-1": "mi-cd-1",
  "mi-house-2": "mi-cd-2",
  "mi-house-3": "mi-cd-3",
  "mi-house-4": "mi-cd-4",
  "mi-house-7": "mi-cd-7",
  "mi-house-8": "mi-cd-8",
  "mi-house-10": "mi-cd-10",
  "mi-house-11": "mi-cd-11",
  "mi-house-13": "mi-cd-13",
  "mi-us-senate-slotkin": "mi-us-senate-slotkin",
  "mi-us-senate-peters": "mi-us-senate-peters",
  "mn-house-1": "mn-cd-1",
  "mn-house-3": "mn-cd-3",
  "mn-house-4": "mn-cd-4",
  "mn-house-7": "mn-cd-7",
  "mn-house-8": "mn-cd-8",
  "mn-us-senate-klobuchar": "mn-us-senate-klobuchar",
  "mn-us-senate-tina_smith": "mn-us-senate-tina_smith",
  "ms-house-1": "ms-cd-1",
  "ms-house-2": "ms-cd-2",
  "ms-house-3": "ms-cd-3",
  "ms-house-4": "ms-cd-4",
  "ms-us-senate-wicker": "ms-us-senate-wicker",
  "ms-us-senate-hyde_smith": "ms-us-senate-hyde_smith",
  "mo-house-1": "mo-cd-1",
  "mo-house-2": "mo-cd-2",
  "mo-house-3": "mo-cd-3",
  "mo-house-4": "mo-cd-4",
  "mo-house-5": "mo-cd-5",
  "mo-house-7": "mo-cd-7",
  "mo-us-senate-hawley": "mo-us-senate-hawley",
  "mo-us-senate-schmitt": "mo-us-senate-schmitt",
  "mt-house-1": "mt-cd-1",
  "mt-house-2": "mt-cd-2",
  "mt-us-senate-sheehy": "mt-us-senate-sheehy",
  "mt-us-senate-daines": "mt-us-senate-daines",
  "ne-house-1": "ne-cd-1",
  "ne-house-3": "ne-cd-3",
  "ne-us-senate-deb_fischer": "ne-us-senate-deb_fischer",
  "ne-us-senate-ricketts": "ne-us-senate-ricketts",
  "nv-house-1": "nv-cd-1",
  "nv-house-2": "nv-cd-2",
  "nv-house-3": "nv-cd-3",
  "nv-house-4": "nv-cd-4",
  "nv-us-senate-rosen": "nv-us-senate-rosen",
  "nv-us-senate-cortez_masto": "nv-us-senate-cortez_masto",
  "nh-house-1": "nh-cd-1",
  "nh-house-2": "nh-cd-2",
  "nh-us-senate-shaheen": "nh-us-senate-shaheen",
  "nh-us-senate-maggie_hassan": "nh-us-senate-maggie_hassan",
  "nj-house-1": "nj-cd-1",
  "nj-house-2": "nj-cd-2",
  "nj-house-3": "nj-cd-3",
  "nj-house-4": "nj-cd-4",
  "nj-house-7": "nj-cd-7",
  "nj-house-8": "nj-cd-8",
  "nj-house-9": "nj-cd-9",
  "nj-house-10": "nj-cd-10",
  "nj-house-11": "nj-cd-11",
  "nj-house-12": "nj-cd-12",
  "nj-us-senate-booker": "nj-us-senate-booker",
  "nj-us-senate-andy_kim": "nj-us-senate-andy_kim",
  "nm-house-1": "nm-cd-1",
  "nm-house-2": "nm-cd-2",
  "nm-house-3": "nm-cd-3",
  "nm-us-senate-heinrich": "nm-us-senate-heinrich",
  "nm-us-senate-lujan": "nm-us-senate-lujan",
  "ny-house-1": "ny-cd-1",
  "ny-house-4": "ny-cd-4",
  "ny-house-6": "ny-cd-6",
  "ny-house-7": "ny-cd-7",
  "ny-house-11": "ny-cd-11",
  "ny-house-13": "ny-cd-13",
  "ny-house-16": "ny-cd-16",
  "ny-house-18": "ny-cd-18",
  "ny-house-19": "ny-cd-19",
  "ny-house-20": "ny-cd-20",
  "ny-house-22": "ny-cd-22",
  "ny-house-23": "ny-cd-23",
  "ny-house-24": "ny-cd-24",
  "ny-house-25": "ny-cd-25",
  "ny-house-26": "ny-cd-26",
  "ny-us-senate-schumer": "ny-us-senate-schumer",
  "ny-us-senate-gillibrand": "ny-us-senate-gillibrand",
  "nc-house-1": "nc-cd-1",
  "nc-house-2": "nc-cd-2",
  "nc-house-3": "nc-cd-3",
  "nc-house-4": "nc-cd-4",
  "nc-house-6": "nc-cd-6",
  "nc-house-7": "nc-cd-7",
  "nc-house-8": "nc-cd-8",
  "nc-house-10": "nc-cd-10",
  "nc-house-11": "nc-cd-11",
  "nc-house-12": "nc-cd-12",
  "nc-house-13": "nc-cd-13",
  "nc-house-14": "nc-cd-14",
  "nc-us-senate-ted_budd": "nc-us-senate-ted_budd",
  "nc-us-senate-tillis": "nc-us-senate-tillis",
  "nd-house-1": "nd-cd-1",
  "nd-us-senate-kevin_cramer": "nd-us-senate-kevin_cramer",
  "nd-us-senate-hoeven": "nd-us-senate-hoeven",
  "oh-house-2": "oh-cd-2",
  "oh-house-3": "oh-cd-3",
  "oh-house-5": "oh-cd-5",
  "oh-house-6": "oh-cd-6",
  "oh-house-7": "oh-cd-7",
  "oh-house-8": "oh-cd-8",
  "oh-house-9": "oh-cd-9",
  "oh-house-10": "oh-cd-10",
  "oh-house-11": "oh-cd-11",
  "oh-house-12": "oh-cd-12",
  "oh-house-13": "oh-cd-13",
  "oh-house-14": "oh-cd-14",
  "oh-house-15": "oh-cd-15",
  "oh-us-senate-moreno": "oh-us-senate-moreno",
  "oh-us-senate-jon_husted": "oh-us-senate-jon_husted",
  "ok-house-2": "ok-cd-2",
  "ok-house-3": "ok-cd-3",
  "ok-house-5": "ok-cd-5",
  "ok-us-senate-lankford": "ok-us-senate-lankford",
  "ok-us-senate-alan_armstrong": "ok-us-senate-alan_armstrong",
  "or-house-1": "or-cd-1",
  "or-house-2": "or-cd-2",
  "or-house-3": "or-cd-3",
  "or-house-4": "or-cd-4",
  "or-house-5": "or-cd-5",
  "or-house-6": "or-cd-6",
  "or-us-senate-wyden": "or-us-senate-wyden",
  "or-us-senate-merkley": "or-us-senate-merkley",
  "pa-house-3": "pa-cd-3",
  "pa-house-4": "pa-cd-4",
  "pa-house-5": "pa-cd-5",
  "pa-house-6": "pa-cd-6",
  "pa-house-7": "pa-cd-7",
  "pa-house-8": "pa-cd-8",
  "pa-house-9": "pa-cd-9",
  "pa-house-10": "pa-cd-10",
  "pa-house-11": "pa-cd-11",
  "pa-house-13": "pa-cd-13",
  "pa-house-14": "pa-cd-14",
  "pa-house-16": "pa-cd-16",
  "pa-house-17": "pa-cd-17",
  "pa-us-senate-fetterman": "pa-us-senate-fetterman",
  "pa-us-senate-mccormick": "pa-us-senate-mccormick",
  "ri-house-1": "ri-cd-1",
  "ri-house-2": "ri-cd-2",
  "ri-us-senate-reed": "ri-us-senate-reed",
  "ri-us-senate-whitehouse": "ri-us-senate-whitehouse",
  "sc-house-2": "sc-cd-2",
  "sc-house-3": "sc-cd-3",
  "sc-house-4": "sc-cd-4",
  "sc-house-5": "sc-cd-5",
  "sc-house-7": "sc-cd-7",
  "sc-us-senate-graham": "sc-us-senate-graham",
  "sc-us-senate-tim_scott": "sc-us-senate-tim_scott",
  "sd-house-1": "sd-cd-1",
  "sd-us-senate-thune": "sd-us-senate-thune",
  "sd-us-senate-mike_rounds": "sd-us-senate-mike_rounds",
  "tn-house-1": "tn-cd-1",
  "tn-house-2": "tn-cd-2",
  "tn-house-3": "tn-cd-3",
  "tn-house-4": "tn-cd-4",
  "tn-house-5": "tn-cd-5",
  "tn-house-6": "tn-cd-6",
  "tn-house-7": "tn-cd-7",
  "tn-house-8": "tn-cd-8",
  "tn-house-9": "tn-cd-9",
  "tn-us-senate-hagerty": "tn-us-senate-hagerty",
  "tn-us-senate-blackburn": "tn-us-senate-blackburn",
  "tx-house-1": "tx-cd-1",
  "tx-house-3": "tx-cd-3",
  "tx-house-4": "tx-cd-4",
  "tx-house-5": "tx-cd-5",
  "tx-house-6": "tx-cd-6",
  "tx-house-7": "tx-cd-7",
  "tx-house-8": "tx-cd-8",
  "tx-house-9": "tx-cd-9",
  "tx-house-10": "tx-cd-10",
  "tx-house-12": "tx-cd-12",
  "tx-house-13": "tx-cd-13",
  "tx-house-14": "tx-cd-14",
  "tx-house-15": "tx-cd-15",
  "tx-house-16": "tx-cd-16",
  "tx-house-17": "tx-cd-17",
  "tx-house-18": "tx-cd-18",
  "tx-house-20": "tx-cd-20",
  "tx-house-22": "tx-cd-22",
  "tx-house-24": "tx-cd-24",
  "tx-house-26": "tx-cd-26",
  "tx-house-27": "tx-cd-27",
  "tx-house-28": "tx-cd-28",
  "tx-house-29": "tx-cd-29",
  "tx-house-31": "tx-cd-31",
  "tx-house-32": "tx-cd-32",
  "tx-house-33": "tx-cd-33",
  "tx-house-34": "tx-cd-34",
  "tx-house-37": "tx-cd-37",
  "tx-house-38": "tx-cd-38",
  "tx-us-senate-cruz": "tx-us-senate-cruz",
  "tx-us-senate-john_cornyn": "tx-us-senate-john_cornyn",
  "vt-house-1": "vt-cd-1",
  "vt-us-senate-welch": "vt-us-senate-welch",
  "vt-us-senate-sanders": "vt-us-senate-sanders",
  "va-house-1": "va-cd-1",
  "va-house-2": "va-cd-2",
  "va-house-4": "va-cd-4",
  "va-house-5": "va-cd-5",
  "va-house-6": "va-cd-6",
  "va-house-7": "va-cd-7",
  "va-house-8": "va-cd-8",
  "va-house-9": "va-cd-9",
  "va-house-10": "va-cd-10",
  "va-house-11": "va-cd-11",
  "va-us-senate-kaine": "va-us-senate-kaine",
  "va-us-senate-warner": "va-us-senate-warner",
  "wa-house-4": "wa-cd-4",
  "wa-house-5": "wa-cd-5",
  "wa-house-6": "wa-cd-6",
  "wa-house-8": "wa-cd-8",
  "wa-house-10": "wa-cd-10",
  "wa-us-senate-murray": "wa-us-senate-murray",
  "wa-us-senate-cantwell": "wa-us-senate-cantwell",
  "wv-house-1": "wv-cd-1",
  "wv-house-2": "wv-cd-2",
  "wv-us-senate-capito": "wv-us-senate-capito",
  "wv-us-senate-jim_justice": "wv-us-senate-jim_justice",
  "wi-house-2": "wi-cd-2",
  "wi-house-3": "wi-cd-3",
  "wi-house-4": "wi-cd-4",
  "wi-house-5": "wi-cd-5",
  "wi-house-6": "wi-cd-6",
  "wi-house-7": "wi-cd-7",
  "wi-house-8": "wi-cd-8",
  "wi-us-senate-ron_johnson": "wi-us-senate-ron_johnson",
  "wi-us-senate-tammy_baldwin": "wi-us-senate-tammy_baldwin",
  "wy-house-1": "wy-cd-1",
  "wy-us-senate-barrasso": "wy-us-senate-barrasso",
  "wy-us-senate-lummis": "wy-us-senate-lummis",
  "az-statesenate-2": "az-sd-2",
  "az-statesenate-23": "az-sd-23",
  "az-statesenate-9": "az-sd-9",
  "az-statesenate-4": "az-sd-4",
  "ca-statehouse-7": "ca-hd-7",
  "ca-statehouse-36": "ca-hd-36",
  "ca-statehouse-47": "ca-hd-47",
  "ca-statehouse-58": "ca-hd-58",
  "ca-statehouse-74": "ca-hd-74",
  "ca-statesenate-16": "ca-sd-16",
  "ca-statesenate-38": "ca-sd-38",
  "co-statesenate-11": "co-sd-11",
  "co-statesenate-15": "co-sd-15",
  "co-statesenate-21": "co-sd-21",
  "co-statesenate-30": "co-sd-30",
  "co-statehouse-19": "co-hd-19",
  "co-statehouse-25": "co-hd-25",
  "co-statehouse-33": "co-hd-33",
  "co-statehouse-43": "co-hd-43",
  "co-statehouse-46": "co-hd-46",
  "co-statehouse-50": "co-hd-50",
  "co-statehouse-59": "co-hd-59",
  "fl-statehouse-35": "fl-hd-35",
  "fl-statehouse-65": "fl-hd-65",
  "fl-statehouse-87": "fl-hd-87",
  "fl-statehouse-89": "fl-hd-89",
  "fl-statehouse-93": "fl-hd-93",
  "fl-statehouse-101": "fl-hd-101",
  "fl-statehouse-106": "fl-hd-106",
  "fl-statesenate-10": "fl-sd-10",
  "fl-statesenate-14": "fl-sd-14",
  "fl-statesenate-38": "fl-sd-38",
  "ga-statesenate-37": "ga-sd-37",
  "ga-statesenate-48": "ga-sd-48",
  "ga-statehouse-151": "ga-hd-151",
  "ga-statehouse-105": "ga-hd-105",
  "ga-statehouse-154": "ga-hd-154",
  "ga-statehouse-48": "ga-hd-48",
  "ga-statehouse-44": "ga-hd-44",
  "ga-statehouse-99": "ga-hd-99",
  "ga-statehouse-53": "ga-hd-53",
  "il-statesenate-57": "il-sd-57",
  "il-statesenate-36": "il-sd-36",
  "il-statesenate-56": "il-sd-56",
  "il-statesenate-26": "il-sd-26",
  "il-statesenate-24": "il-sd-24",
  "il-statesenate-48": "il-sd-48",
  "il-statehouse-76": "il-hd-76",
  "il-statehouse-97": "il-hd-97",
  "il-statehouse-70": "il-hd-70",
  "il-statehouse-52": "il-hd-52",
  "il-statehouse-114": "il-hd-114",
  "il-statehouse-104": "il-hd-104",
  "il-statehouse-112": "il-hd-112",
  "il-statehouse-65": "il-hd-65",
  "mi-statesenate-35": "mi-sd-35",
  "mi-statesenate-9": "mi-sd-9",
  "mi-statehouse-109": "mi-hd-109",
  "mi-statehouse-86": "mi-hd-86",
  "mi-statehouse-44": "mi-hd-44",
  "mi-statehouse-27": "mi-hd-27",
  "mi-statehouse-46": "mi-hd-46",
  "mi-statehouse-28": "mi-hd-28",
  "mi-statehouse-55": "mi-hd-55",
  "mi-statehouse-61": "mi-hd-61",
  "mn-statesenate-3": "mn-sd-3",
  "mn-statesenate-4": "mn-sd-4",
  "mn-statesenate-14": "mn-sd-14",
  "mn-statesenate-32": "mn-sd-32",
  "mn-statesenate-33": "mn-sd-33",
  "mn-statesenate-35": "mn-sd-35",
  "mn-statesenate-41": "mn-sd-41",
  "mn-statesenate-48": "mn-sd-48",
  "mn-statehouse-6": "mn-hd-6",
  "mn-statehouse-35": "mn-hd-35",
  "mn-statehouse-63": "mn-hd-63",
  "mn-statehouse-64": "mn-hd-64",
  "mn-statehouse-67": "mn-hd-67",
  "mn-statehouse-69": "mn-hd-69",
  "mn-statehouse-70": "mn-hd-70",
  "mn-statehouse-81": "mn-hd-81",
  "mn-statehouse-89": "mn-hd-89",
  "mn-statehouse-96": "mn-hd-96",
  "mn-statehouse-107": "mn-hd-107",
  "ny-statesenate-43": "ny-sd-43",
  "ny-statesenate-39": "ny-sd-39",
  "ny-statesenate-44": "ny-sd-44",
  "ny-statesenate-38": "ny-sd-38",
  "ny-statehouse-107": "ny-hd-107",
  "ny-statehouse-46": "ny-hd-46",
  "ny-statehouse-143": "ny-hd-143",
  "ny-statehouse-21": "ny-hd-21",
  "ny-statehouse-97": "ny-hd-97",
  "nc-statesenate-7": "nc-sd-7",
  "nc-statesenate-11": "nc-sd-11",
  "nc-statesenate-42": "nc-sd-42",
  "nc-statesenate-18": "nc-sd-18",
  "nc-statehouse-25": "nc-hd-25",
  "nc-statehouse-105": "nc-hd-105",
  "nc-statehouse-98": "nc-hd-98",
  "nc-statehouse-37": "nc-hd-37",
  "oh-statesenate-29": "oh-sd-29",
  "oh-statehouse-10": "oh-hd-10",
  "oh-statehouse-17": "oh-hd-17",
  "oh-statehouse-36": "oh-hd-36",
  "oh-statehouse-60": "oh-hd-60",
  "pa-statesenate-40": "pa-sd-40",
  "pa-statesenate-16": "pa-sd-16",
  "pa-statesenate-6": "pa-sd-6",
  "pa-statesenate-36": "pa-sd-36",
  "pa-statesenate-24": "pa-sd-24",
  "pa-statehouse-72": "pa-hd-72",
  "pa-statehouse-12": "pa-hd-12",
  "pa-statehouse-137": "pa-hd-137",
  "pa-statehouse-142": "pa-hd-142",
  "pa-statehouse-144": "pa-hd-144",
  "pa-statehouse-18": "pa-hd-18",
  "pa-statehouse-160": "pa-hd-160",
  "tx-statesenate-19": "tx-sd-19",
  "tx-statehouse-34": "tx-hd-34",
  "tx-statehouse-37": "tx-hd-37",
  "tx-statehouse-52": "tx-hd-52",
  "tx-statehouse-61": "tx-hd-61",
  "tx-statehouse-67": "tx-hd-67",
  "tx-statehouse-70": "tx-hd-70",
  "tx-statehouse-74": "tx-hd-74",
  "tx-statehouse-108": "tx-hd-108",
  "tx-statehouse-112": "tx-hd-112",
  "tx-statehouse-121": "tx-hd-121",
  "tx-statehouse-138": "tx-hd-138",
  "tx-statesenate-9": "tx-sd-9",
  "tx-statesenate-21": "tx-sd-21",
  "wa-statesenate-26": "wa-sd-26",
  "wa-statesenate-35": "wa-sd-35",
  "wa-statehouse-10-p1": "wa-hd-10-p1",
  "wa-statehouse-10-p2": "wa-hd-10-p2",
  "wa-statehouse-17-p1": "wa-hd-17-p1",
  "wa-statehouse-17-p2": "wa-hd-17-p2",
  "wa-statehouse-18-p1": "wa-hd-18-p1",
  "wa-statehouse-18-p2": "wa-hd-18-p2",
  "wa-statehouse-26-p1": "wa-hd-26-p1",
  "wi-statesenate-17": "wi-sd-17",
  "wi-statesenate-31": "wi-sd-31",
  "wi-statehouse-26": "wi-hd-26",
  "wi-statehouse-30": "wi-hd-30",
  "wi-statehouse-51": "wi-hd-51",
  "wi-statehouse-61": "wi-hd-61",
  "wi-statehouse-85": "wi-hd-85",
  "wi-statehouse-88": "wi-hd-88",
  "wi-statehouse-89": "wi-hd-89",
  "wi-statehouse-91": "wi-hd-91",
  "wi-statehouse-92": "wi-hd-92",
  "wi-statehouse-94": "wi-hd-94",
  // @generated district-boards end
};

export const POST_MAX = 280;
export const POSTS_CAP = 20;

// The hub's own line, verbatim — index.html and /voice already print "Only
// verified residents of that seat get a voice that counts"; on the board itself
// the seat is THIS one.
export const LOCKED_LINE = "Only verified residents of this seat get a voice that counts.";

export const COPY = {
  noSeat: "This board does not take posts.",
  signedOut: "Sign in to start. Reading stays open to everyone.",
  unverified: "Posting opens after an ID and address check for this seat. " +
    "A typed address, zip or saved location is not accepted as proof.",
  open: "You are a verified resident of this seat. Posts are public and carry no name.",
  // A reader whose one check already ran and did not name this seat. Names no
  // price and no plan; boards carry no money copy.
  alreadyChecked: "Your ID and address check is already done. It covered the seats your saved location named when you ran it, and this seat was not one of them.",
  noIssue: "Choose an issue from this seat's table.",
  empty: "Write something first.",
  tooLong: "Keep it to " + POST_MAX + " characters.",
  emptyFeed: "No posts on hand for this seat.",
  emptyGeneral: "No general comments for this officeholder on this seat yet.",
  noHolder: "This seat has no sitting member on file, so it has no general room.",
  noPost: "That comment is not on this board.",
};

// A statewide board's key IS its canonical key (ut-gov, ut-us-senate-<pid>);
// the same shape district-board.mts and gen-district-boards.mjs accept.
export const STATEWIDE_KEY_RE = /^[a-z]{2}-(?:gov|us-senate-[a-z][a-z0-9_]*)$/;

// A SEAT ELECTED BY POSITION (Washington's House: two seats per district) is a
// third shape beside the district and the statewide one, so normalizeSeatKey()
// — the District Room's vocabulary — is not widened for it. The canonical key
// is <code>-statehouse-<n>-p<k>, the alias <code>-hd-<n>-p<k>; the same shape
// district-board.mts, district-board.js and district-voice.js accept. A shape,
// not a list: COMPOSER_SEATS is the list.
export const POSITION_KEY_RE = /^[a-z]{2}-statehouse-[1-9][0-9]*-p[1-9]$/;
const POSITION_ALIAS_RE = /^([a-z]{2})-hd-([1-9][0-9]*)-(p[1-9])$/;
export function positionSeatKey(raw) {
  const s = String(raw == null ? "" : raw).trim().toLowerCase();
  if (POSITION_KEY_RE.test(s)) return s;
  const m = POSITION_ALIAS_RE.exec(s);
  return m ? `${m[1]}-statehouse-${m[2]}-${m[3]}` : "";
}

// The canonical seat if it has a composer, else ''.
export function composerSeat(raw) {
  const s = String(raw == null ? "" : raw).trim().toLowerCase();
  const k = STATEWIDE_KEY_RE.test(s) ? s : (positionSeatKey(s) || normalizeSeatKey(s));
  return k && Object.prototype.hasOwnProperty.call(COMPOSER_SEATS, k) ? k : "";
}

// THE SEAT-SCOPED AUTHOR HASH for a composer seat. A district seat is exactly
// authorHash() (so every row already written keeps its hash); a statewide seat,
// which normalizeSeatKey() does not speak, is the same sha256(uid + ':' + seat)
// over its own key, and so is a seat elected by position. '' for a seat with no
// composer or an empty uid.
export function seatHash(uid, seatKey) {
  const k = composerSeat(seatKey);
  const u = String(uid == null ? "" : uid).trim();
  if (!k || !u) return "";
  if (!STATEWIDE_KEY_RE.test(k) && !POSITION_KEY_RE.test(k)) return authorHash(u, k);
  return crypto.createHash("sha256").update(`${u}:${k}`).digest("hex").slice(0, 32);
}

// THE FLAG. The alias of the seat this account is VENDOR-verified for, or ''.
// A pending, revoked or location_match row answers '' — never a seat.
export function verifiedSeat(row, seatKey) {
  if (!row || typeof row !== "object") return "";
  if (row.status !== "verified" || row.method !== "vendor") return "";
  const k = composerSeat(row.seatKey || seatKey);
  return k ? COMPOSER_SEATS[k] : "";
}

// The gate over RESOLVED inputs. `user` is the server-verified identity or null;
// `row` is voice_residency for (this account, this seat) or null.
export function gate(user, row, seatKey) {
  const k = composerSeat(seatKey);
  if (!k) return { ok: false, status: 404, code: "no_seat", message: COPY.noSeat };
  if (!user || user.isAnonymous || !user.uid) {
    return { ok: false, status: 403, code: "signed_out", message: LOCKED_LINE, note: COPY.signedOut };
  }
  if (verifiedSeat(row, k) !== COMPOSER_SEATS[k]) {
    return { ok: false, status: 403, code: "unverified", message: LOCKED_LINE, note: COPY.unverified };
  }
  return { ok: true, seatKey: k };
}

// THE ONE CHECK. One vendor check covers every composer seat the reader's
// saved location resolved when they ran it, so an account that already holds a
// VERIFIED vendor row on any composer seat has nothing left to start. The alias
// of the first such seat, or ''. Read from voice_residency itself, so no counter
// is kept: the seat-scoped hash is recomputed for each named seat. A revoked
// row elsewhere does not count — it is not a verification.
//
// With a board on every seat that is one lookup per row, so a store may offer
// findVendorVerified(pairs) → rows { seatKey, authorHash, status, method }: one
// query for every (seat, hash) pair at once. Only a row whose seat AND hash are
// one of the pairs counts. Without it, the per-seat findResidency() walk.
export async function anyVerifiedSeat(deps, uid) {
  if (!deps || !uid) return "";
  const pairs = [];
  for (const k of Object.keys(COMPOSER_SEATS)) {
    const h = seatHash(uid, k);
    if (h) pairs.push({ seatKey: k, authorHash: h });
  }
  if (typeof deps.findVendorVerified === "function") {
    const rows = (await deps.findVendorVerified(pairs)) || [];
    for (const p of pairs) {
      const hit = rows.some((r) => r && r.seatKey === p.seatKey && r.authorHash === p.authorHash &&
        r.method === "vendor" && r.status === "verified");
      if (hit) return COMPOSER_SEATS[p.seatKey];
    }
    return "";
  }
  if (typeof deps.findResidency !== "function") return "";
  for (const p of pairs) {
    const row = await deps.findResidency(p.seatKey, p.authorHash);
    if (row && row.method === "vendor" && row.status === "verified") return COMPOSER_SEATS[p.seatKey];
  }
  return "";
}

// May THIS caller start the vendor check on THIS seat? Any signed-in reader
// (membership is never asked) not revoked here and holding no verified vendor
// row on any composer seat. Fails closed: any missing dep or lookup error is a
// no. It is the caller's own permission, never the flag or an account id.
export async function canVerifyHere(deps, user, row, seatKey) {
  if (!user || user.isAnonymous || !user.uid) return { ok: false };
  if (row && (row.status === "revoked" || (row.status === "verified" && row.method === "vendor"))) return { ok: false };
  try {
    if (await anyVerifiedSeat(deps, user.uid)) return { ok: false, alreadyChecked: true };
  } catch {
    return { ok: false };
  }
  return { ok: true };
}

export function normalizeBody(v) {
  return String(v == null ? "" : v).replace(/\r\n?/g, "\n").trim();
}

// The post's own checks, asked only AFTER the gate has let the caller through.
export function checkPost(input) {
  const issueKey = String(input?.issueKey == null ? "" : input.issueKey).trim().toLowerCase();
  if (!issueKey || !/^[a-z0-9_]+$/.test(issueKey) || !input?.issueOk) {
    return { ok: false, status: 400, code: "bad_issue", message: COPY.noIssue };
  }
  const body = normalizeBody(input?.body);
  if (!body) return { ok: false, status: 400, code: "empty", message: COPY.empty };
  if ([...body].length > POST_MAX) return { ok: false, status: 400, code: "too_long", message: COPY.tooLong };
  return { ok: true, issueKey, body };
}

// The only shape a post ever leaves in. Whitelisted field by field, so a store
// row carrying an author hash cannot pass one through by being spread.
// `likes` is the read of likeCounts() keyed by post id: { n, mine } — a count
// and whether the viewer is in it, never a liker.
export function publicPost(row, viewerHash, likes) {
  const l = likes && likes[row.id];
  return {
    id: row.id,
    issueKey: row.issueKey == null ? "" : row.issueKey,
    body: row.body,
    createdAt: row.createdAt,
    mine: !!viewerHash && row.authorHash === viewerHash,
    likes: l ? Math.max(0, Math.floor(Number(l.n) || 0)) : 0,
    liked: !!(l && l.mine === true && viewerHash),
  };
}

// The like counts for a page of posts, as { id → { n, mine } }. An absent or
// failing store answers zeros: a count that could not be read is not invented.
async function likesFor(deps, ids, viewerHash) {
  const out = {};
  if (!ids.length || typeof deps.likeCounts !== "function") return out;
  try {
    const rows = (await deps.likeCounts(ids, viewerHash || "")) || [];
    for (const r of rows) {
      if (r && ids.includes(r.takeId)) out[r.takeId] = { n: r.n, mine: r.mine === true };
    }
  } catch {
    return {};
  }
  return out;
}

export function generalOf(seatKey, thread, table) {
  const cur = holderFor(seatKey, table);
  return {
    holder: { pid: thread.pid, name: thread.name },
    current: thread.current === true,
    currentHolder: cur ? { pid: cur.pid, name: cur.name } : null,
    previous: previousFor(seatKey, table).map((h) => ({ pid: h.pid, name: h.name })),
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      // Personalized (`mine`, `canPost`), so never shared by a cache.
      "cache-control": "private, no-store",
    },
  });
}

// The seat → holder table: netlify/lib/seat-holders.mjs, unless a caller hands
// the handler a rolled table (the suite's simulated roster change). The
// Function never passes one.
function holdersOf(deps) {
  return deps && deps.holders && typeof deps.holders === "object" ? deps.holders : undefined;
}

function capRefusal() {
  return json({ error: CAP_COPY.comment, code: "daily_cap" }, 429);
}

// deps:
//   verifyUser(req)                 → { uid, isAnonymous } | null
//   findResidency(seatKey, hash)    → { seatKey, status, method } | null
//   issueExists(issueKey)           → boolean
//   listPosts(seatKey, cap, issueKey?) → rows (with authorHash), newest first; one issue when given
//   listGeneral(seatKey, holderPid, cap) → general rows (holderPid, no issue), newest first
//   insertPost({ seatKey, issueKey, holderPid?, body, authorHash, capSince? }) → row | null
//                                   (with capSince: inserts only if this author
//                                   has no post on this seat since then; null if not)
//   findMembership(accountHash)     → voice_membership row | null
//   countPostsSince(seatKey, hash, since) → integer
//   findTake(id)                    → { id, seatKey } | null
//   insertLike({ takeId, seatKey, likerHash }) → true if written, false if already liked
//   likeCounts(ids, viewerHash)     → [{ takeId, n, mine }]   (counts; never a liker)
//   holders                         → seat → { pid, name, previous } (optional; defaults to SEAT_HOLDERS)
//   limit(req, user)                → Response | null   (optional)
//   now()                           → Date              (optional)
export async function handle(req, deps) {
  const method = String(req.method || "GET").toUpperCase();
  const url = new URL(req.url);

  if (method === "GET") {
    const seatKey = composerSeat(url.searchParams.get("seat"));
    if (!seatKey) return json({ error: COPY.noSeat, code: "no_seat" }, 404);
    const user = await deps.verifyUser(req);
    const hash = user && !user.isAnonymous ? seatHash(user.uid, seatKey) : "";
    const row = hash ? await deps.findResidency(seatKey, hash) : null;
    const verdict = gate(user, row, seatKey);
    const check = verdict.code === "unverified" ? await canVerifyHere(deps, user, row, seatKey) : { ok: false };
    // ONE ISSUE'S COMMENTS, ON ASK. `?issue=<key>` narrows the read to that
    // issue's posts on this seat — the topic jump from an issue file lands on
    // them — under the same cap and the same public shape. A key of the wrong
    // shape is ignored rather than refused, so the read falls back to the whole
    // feed. Reading is open to everyone either way; nothing here writes.
    const voiceOf = (open) => ({
      canPost: open,
      reason: verdict.ok ? (open ? "verified" : "previous_holder") : verdict.code,
      line: verdict.ok ? "" : LOCKED_LINE,
      note: verdict.ok ? (open ? COPY.open : "") : (check.alreadyChecked ? COPY.alreadyChecked : verdict.note || ""),
      canVerify: check.ok === true,
    });
    if (url.searchParams.get("room") === "general") {
      const thread = threadFor(seatKey, url.searchParams.get("holder"), holdersOf(deps));
      if (!thread) return json({ error: COPY.noHolder, code: "no_holder" }, 404);
      const grows = typeof deps.listGeneral === "function"
        ? ((await deps.listGeneral(seatKey, thread.pid, POSTS_CAP)) || [])
        : [];
      // Only this holder's general rows, whatever a store hands back.
      const mineRows = grows.filter((r) => r && !r.issueKey && r.holderPid === thread.pid);
      const likes = await likesFor(deps, mineRows.map((r) => r.id), hash);
      const gposts = mineRows.map((r) => publicPost(r, hash, likes));
      return json({
        seat: COMPOSER_SEATS[seatKey],
        room: "general",
        general: generalOf(seatKey, thread, holdersOf(deps)),
        posts: gposts,
        postsEmpty: gposts.length ? "" : COPY.emptyGeneral,
        // A previous holder's thread is read-only: comments go to the sitting member.
        voice: voiceOf(verdict.ok && thread.current === true),
        limits: { postMax: POST_MAX, postsCap: POSTS_CAP },
      });
    }
    const issueRaw = String(url.searchParams.get("issue") || "").trim().toLowerCase();
    const issueKey = /^[a-z0-9_]+$/.test(issueRaw) ? issueRaw : "";
    const rows = issueKey
      ? await deps.listPosts(seatKey, POSTS_CAP, issueKey)
      : await deps.listPosts(seatKey, POSTS_CAP);
    // Issue comments only: a general-room row has no issue and is not in this feed.
    const kept = (rows || []).filter((r) => r && r.issueKey && (!issueKey || r.issueKey === issueKey));
    const likes = await likesFor(deps, kept.map((r) => r.id), hash);
    const posts = kept.map((r) => publicPost(r, hash, likes));
    return json({
      seat: COMPOSER_SEATS[seatKey],
      issue: issueKey,
      posts,
      postsEmpty: posts.length ? "" : COPY.emptyFeed,
      voice: {
        canPost: verdict.ok,
        reason: verdict.ok ? "verified" : verdict.code,
        line: verdict.ok ? "" : LOCKED_LINE,
        note: verdict.ok ? COPY.open : (check.alreadyChecked ? COPY.alreadyChecked : verdict.note || ""),
        // The proof button paints only on this. A signed-out reader, a
        // non-member and a verified resident all read false.
        canVerify: check.ok === true,
      },
      limits: { postMax: POST_MAX, postsCap: POSTS_CAP },
    });
  }

  if (method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload = {};
  try { payload = (await req.json()) || {}; } catch { payload = {}; }

  const seatKey = composerSeat(payload.seat);
  if (!seatKey) return json({ error: COPY.noSeat, code: "no_seat" }, 404);

  const user = await deps.verifyUser(req);
  if (deps.limit) {
    const limited = await deps.limit(req, user);
    if (limited) return limited;
  }
  const hash = user && !user.isAnonymous ? seatHash(user.uid, seatKey) : "";
  const row = hash ? await deps.findResidency(seatKey, hash) : null;

  const verdict = gate(user, row, seatKey);
  if (!verdict.ok || !hash) {
    return json({
      error: verdict.message || LOCKED_LINE,
      note: verdict.note || COPY.signedOut,
      code: verdict.code || "signed_out",
    }, verdict.status || 403);
  }

  if (payload.action === "like") return like(deps, verdict.seatKey, hash, payload.postId);

  let values;
  if (payload.room === "general") {
    // The holder is the seat's sitting member NOW; a pid in the payload is ignored.
    const holder = holderFor(verdict.seatKey, holdersOf(deps));
    if (!holder) return json({ error: COPY.noHolder, code: "no_holder" }, 404);
    const body = normalizeBody(payload.body);
    if (!body) return json({ error: COPY.empty, code: "empty" }, 400);
    if ([...body].length > POST_MAX) return json({ error: COPY.tooLong, code: "too_long" }, 400);
    values = { seatKey: verdict.seatKey, issueKey: null, holderPid: holder.pid, body, authorHash: hash };
  } else {
    const issueRaw = String(payload.issueKey == null ? "" : payload.issueKey).trim().toLowerCase();
    const issueOk = /^[a-z0-9_]+$/.test(issueRaw) ? !!(await deps.issueExists(issueRaw)) : false;
    const post = checkPost({ issueKey: issueRaw, issueOk, body: payload.body });
    if (!post.ok) return json({ error: post.message, code: post.code }, post.status);
    values = { seatKey: verdict.seatKey, issueKey: post.issueKey, body: post.body, authorHash: hash };
  }
  let saved;
  if (await memberFor(deps, user)) {
    saved = await deps.insertPost(values);
  } else {
    // FAILS CLOSED: no counter means no comment, not an uncapped one.
    const since = dayStart(deps.now ? deps.now() : new Date());
    const used = typeof deps.countPostsSince === "function"
      ? Number(await deps.countPostsSince(verdict.seatKey, hash, since))
      : Infinity;
    if (!(used < DAILY_COMMENTS)) return capRefusal();
    saved = await deps.insertPost({ ...values, capSince: since });
    if (!saved) return capRefusal();
  }
  const out = publicPost({ ...saved, authorHash: hash }, hash);
  return json(values.holderPid ? { post: out, room: "general", holder: values.holderPid } : { post: out }, 201);
}

// One like, after the gate. Idempotent: the store's unique index answers a
// second like with no row, and the reply is the same count either way.
async function like(deps, seatKey, hash, rawId) {
  const postId = Number(rawId);
  if (!Number.isInteger(postId) || postId < 1) return json({ error: COPY.noPost, code: "no_post" }, 404);
  const take = typeof deps.findTake === "function" ? await deps.findTake(postId) : null;
  if (!take || take.seatKey !== seatKey) return json({ error: COPY.noPost, code: "no_post" }, 404);
  const added = !!(await deps.insertLike({ takeId: postId, seatKey, likerHash: hash }));
  const likes = await likesFor(deps, [postId], hash);
  const l = likes[postId];
  return json({
    postId,
    likes: l ? Math.max(0, Math.floor(Number(l.n) || 0)) : 0,
    liked: true,
    added,
  });
}
