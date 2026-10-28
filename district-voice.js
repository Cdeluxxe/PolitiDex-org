/* ─────────────────────────────────────────────────────────────────────────────
   district-voice.js — District Voice, slice 1: the belonging layer on a seat file
   ─────────────────────────────────────────────────────────────────────────────
   THE PLACE, NOT A PROFILE. This module paints the top of /d/<seatKey>: one live
   question a verified neighbour in that seat can answer, the short takes those
   neighbours have posted, and the seat's latest formal act on the question's
   issue. It hangs off a SEAT and never off a pid — there is no politician id in
   any request this file sends or any row it writes, so a take cannot become a
   comment on a person even if the seat changes hands tomorrow.

   NOT A SCORE, NOT A THIRD MATCH, NOT A COMMENT SECTION. The poll prints one
   integer per option and the number of people who answered. There is no
   percentage in this file — none is computed and none is rendered — no bar, no
   fill, no ring, no leader, no winner and no composite. A proportion drawn as a
   length reads as a grade, and a neighbour's answer is not a grade. Nothing here
   reads or writes Direction Match, Word vs Action, the finance lane, a stance, a
   formal act or a baseline: the ONE record read below is the same public
   /api/voting-record GET any signed-out reader can make, and it is read-only.

   NO PARTY, ANYWHERE. No party letter, no party colour, no caucus, no team
   language, no "loyalty" and no sort that party could reach. Takes are NEWEST
   FIRST and that is the only order — there is no sort control, because a feed
   with an order knob is a leaderboard with a conversation's manners. No upvote,
   no like, no reaction, no reply box: slice 2 owns threads and this file cannot
   express one.

   ── READING IS OPEN. WRITING IS RESIDENCY-GATED. ───────────────────────────
   The public record stays free and ungated. A signed-out visitor with no
   account, no location and no residency sees the question, the counts, every
   take and the record strip — the GET below carries no Authorization header when
   there is nobody to mint one for, and there is no branch that hides a block
   behind sign-in. What is gated is the two WRITES.

   THE COMPOSER IS THE SERVER'S ANSWER, NOT THIS FILE'S OPINION. Whether a reader
   may post or answer is decided in netlify/lib/district-voice-core.mjs and
   returned by /api/district-voice as `voice.canPost` plus the sentence to print
   when it is false. This module RENDERS that answer and never computes one: a UI
   that decides for itself who may type is a UI that will eventually disagree
   with the gate. There is no branch below that opens the composer on anything
   other than canPost === true, and the server re-runs the same check on the
   write regardless of what got painted.

   THE CLAIM IS THE READER'S OWN SAVED BALLOT LOCATION. claim() below reads the
   county and state house district the reader already chose — through
   pdxRepsForMe(), the app's one resolver, so this file does not become a second
   answer about where somebody lives — and sends those three fields with the
   read and with every write. The server checks them for CONSISTENCY (a county it
   maps, and a house district that county actually contains) and matches them
   against this seat. That is not an identity check and this file never calls it
   one. Fail closed: no location means read-only, and the sentence says why.

   NO IDENTITY VENDOR IS LIVE. verify() below is the seam Stripe Identity or
   Veriff lands in. It is called by nothing in this repo, performs no upload, no
   third-party round trip and NO CHARGE, and it REJECTS rather than resolving
   false — so wiring a vendor in is a deliberate act and never an accident that
   quietly verifies somebody.

   HONEST EMPTY. Zero takes is a sentence. Zero verified neighbours is a
   sentence. No formal act on the question's issue is a sentence. None of the
   three is a placeholder row, a skeleton, a sample take or a seeded feed — a
   fake feed in a place that is supposed to prove neighbours are real is the one
   lie this whole slice exists to avoid.
   ───────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var API = '/api/district-voice';
  var RECORD_API = '/api/voting-record/member/';

  // The canonical seat key, and the alias. `ut-hd-68` is 'ut-statehouse-68'
  // written short — one place, one row, two spellings, NO SECOND DISTRICT MAP.
  // Mirrored from netlify/lib/district-voice-core.mjs rather than imported
  // because this file is loaded as a plain script; the suite asserts the two
  // agree on the same strings.
  var SEAT_KEY_RE = /^[a-z]{2}-(?:house|statesenate|statehouse)-[1-9][0-9]*$/;
  var ALIAS_RE = /^([a-z]{2})-(hd|sd|cd)-([1-9][0-9]*)$/;
  var ALIAS_CHAMBERS = { hd: 'statehouse', sd: 'statesenate', cd: 'house' };

  // THE WHOLE ALLOW-LIST. Adding a seat is adding a line.
  var VOICE_SEATS = { 'ut-statehouse-68': 1 };

  // ── THE BOARD ALLOW-LIST, AND IT IS ONE TABLE ─────────────────────────────
  // seatKey → the board's own address. SIX ROWS TODAY, and adding a seat is
  // still adding a row: no pattern, no splat, no `/district/<anything>` rewrite
  // that answers for districts this app has never drawn. netlify.toml rewrites
  // exactly these six addresses and nothing else, which is why a table and not
  // a map — the regex form of this list would print a door for all 75 Utah
  // House districts, 72 of which have no document behind them.
  //
  // IT IS NOT VOICE_SEATS. VOICE_SEATS is "does this seat have a Voice block in
  // its district file at /d/<seat-key>"; this is "does this seat have a BOARD at
  // its own document". They are different questions with different answers — HD-68
  // is in the first and not the second, SD-3 is in the second and not the first —
  // and a surface that conflated them would offer a reader a room that is not
  // there. /voice asks THIS one, because a hallway prints doors that open.
  //
  // WRONG-SEAT EXCLUSIVITY IS STILL THE PRODUCT, and six rows do not soften it.
  // A reader whose saved location resolves Davis County HD-14 gets an HD-14 card
  // with NO DOOR — HD-15 and HD-16 are both next door and neither board is
  // theirs, which is a sharper test of this table than HD-68 ever was. Layton is
  // not North Ogden, HD-14 is not HD-15, and a board labelled "yours" for
  // somebody who cannot vote in it is the one lie this whole lane exists to
  // avoid.
  //
  // HD-15 MOVED SIDES IN THIS PASS AND HD-14 TOOK ITS PLACE AS THE EXAMPLE.
  // That substitution is the point: the counter-example has to be a seat that
  // really has no document, or the paragraph stops being a test of anything.
  // HD-14 has a member on the roster (lisonbee_h14), a person file, and no
  // board — exactly the shape HD-15 had until this row existed.
  //
  // SD-6 IS THE SIXTH, AND IT IS THE SENATE HALF OF THE SAME RULE. Davis
  // County's curated slate already named Jerry Stevenson on State Senate
  // District 6, so a Davis reader resolving SD-6 got "Sitting member: Jerry
  // Stevenson" over "this room is not open". The row below opens that door and
  // no other: seatPidFor() still weighs every pid against the card's own
  // chamber and number, so Stevenson never sits on the SD-7 card, and SD-8 is
  // still a seat with no document.
  var BOARD_ROUTES = {
    'ut-statesenate-3': '/district/ut-sd-3',
    'ut-statehouse-16': '/district/ut-hd-16',
    'ut-statesenate-7': '/district/ut-sd-7',
    'ut-house-2': '/district/ut-cd-2',
    'ut-statehouse-15': '/district/ut-hd-15',
    'ut-statesenate-6': '/district/ut-sd-6',
    // Every other seat the roster names a sitting member for, one row each —
    // generated, never a pattern. A seat with no pid is not here, so its card
    // still says the room is not open.
    // @generated district-boards begin — scripts/gen-district-boards.mjs writes every line up to the end marker, do not edit by hand
    'ut-statehouse-4': '/district/ut-hd-4',
    'ut-statehouse-5': '/district/ut-hd-5',
    'ut-statehouse-6': '/district/ut-hd-6',
    'ut-statehouse-9': '/district/ut-hd-9',
    'ut-statehouse-10': '/district/ut-hd-10',
    'ut-statehouse-11': '/district/ut-hd-11',
    'ut-statehouse-12': '/district/ut-hd-12',
    'ut-statehouse-14': '/district/ut-hd-14',
    'ut-statehouse-19': '/district/ut-hd-19',
    'ut-statehouse-21': '/district/ut-hd-21',
    'ut-statehouse-22': '/district/ut-hd-22',
    'ut-statehouse-23': '/district/ut-hd-23',
    'ut-statehouse-24': '/district/ut-hd-24',
    'ut-statehouse-25': '/district/ut-hd-25',
    'ut-statehouse-28': '/district/ut-hd-28',
    'ut-statehouse-29': '/district/ut-hd-29',
    'ut-statehouse-30': '/district/ut-hd-30',
    'ut-statehouse-31': '/district/ut-hd-31',
    'ut-statehouse-33': '/district/ut-hd-33',
    'ut-statehouse-34': '/district/ut-hd-34',
    'ut-statehouse-36': '/district/ut-hd-36',
    'ut-statehouse-37': '/district/ut-hd-37',
    'ut-statehouse-39': '/district/ut-hd-39',
    'ut-statehouse-41': '/district/ut-hd-41',
    'ut-statehouse-42': '/district/ut-hd-42',
    'ut-statehouse-43': '/district/ut-hd-43',
    'ut-statehouse-44': '/district/ut-hd-44',
    'ut-statehouse-45': '/district/ut-hd-45',
    'ut-statehouse-46': '/district/ut-hd-46',
    'ut-statehouse-49': '/district/ut-hd-49',
    'ut-statehouse-50': '/district/ut-hd-50',
    'ut-statehouse-51': '/district/ut-hd-51',
    'ut-statehouse-52': '/district/ut-hd-52',
    'ut-statehouse-53': '/district/ut-hd-53',
    'ut-statehouse-55': '/district/ut-hd-55',
    'ut-statehouse-56': '/district/ut-hd-56',
    'ut-statehouse-59': '/district/ut-hd-59',
    'ut-statehouse-60': '/district/ut-hd-60',
    'ut-statehouse-61': '/district/ut-hd-61',
    'ut-statehouse-63': '/district/ut-hd-63',
    'ut-statehouse-64': '/district/ut-hd-64',
    'ut-statehouse-65': '/district/ut-hd-65',
    'ut-statehouse-66': '/district/ut-hd-66',
    'ut-statehouse-67': '/district/ut-hd-67',
    'ut-statehouse-68': '/district/ut-hd-68',
    'ut-statehouse-69': '/district/ut-hd-69',
    'ut-statehouse-70': '/district/ut-hd-70',
    'ut-statehouse-71': '/district/ut-hd-71',
    'ut-statehouse-73': '/district/ut-hd-73',
    'ut-statehouse-75': '/district/ut-hd-75',
    'ut-statesenate-1': '/district/ut-sd-1',
    'ut-statesenate-2': '/district/ut-sd-2',
    'ut-statesenate-4': '/district/ut-sd-4',
    'ut-statesenate-5': '/district/ut-sd-5',
    'ut-statesenate-8': '/district/ut-sd-8',
    'ut-statesenate-9': '/district/ut-sd-9',
    'ut-statesenate-10': '/district/ut-sd-10',
    'ut-statesenate-11': '/district/ut-sd-11',
    'ut-statesenate-12': '/district/ut-sd-12',
    'ut-statesenate-13': '/district/ut-sd-13',
    'ut-statesenate-14': '/district/ut-sd-14',
    'ut-statesenate-15': '/district/ut-sd-15',
    'ut-statesenate-16': '/district/ut-sd-16',
    'ut-statesenate-17': '/district/ut-sd-17',
    'ut-statesenate-18': '/district/ut-sd-18',
    'ut-statesenate-19': '/district/ut-sd-19',
    'ut-statesenate-20': '/district/ut-sd-20',
    'ut-statesenate-21': '/district/ut-sd-21',
    'ut-statesenate-22': '/district/ut-sd-22',
    'ut-statesenate-23': '/district/ut-sd-23',
    'ut-statesenate-24': '/district/ut-sd-24',
    'ut-statesenate-25': '/district/ut-sd-25',
    'ut-statesenate-26': '/district/ut-sd-26',
    'ut-statesenate-27': '/district/ut-sd-27',
    'ut-statesenate-28': '/district/ut-sd-28',
    'ut-statesenate-29': '/district/ut-sd-29',
    'ut-house-1': '/district/ut-cd-1',
    'ut-house-3': '/district/ut-cd-3',
    'ut-house-4': '/district/ut-cd-4',
    'ut-gov': '/district/ut-gov',
    'ut-us-senate-curtis': '/district/ut-us-senate-curtis',
    'ut-us-senate-lee': '/district/ut-us-senate-lee',
    'al-house-1': '/district/al-cd-1',
    'al-house-2': '/district/al-cd-2',
    'al-house-3': '/district/al-cd-3',
    'al-house-4': '/district/al-cd-4',
    'al-house-5': '/district/al-cd-5',
    'al-house-6': '/district/al-cd-6',
    'al-house-7': '/district/al-cd-7',
    'al-us-senate-britt': '/district/al-us-senate-britt',
    'al-us-senate-tommy_tuberville': '/district/al-us-senate-tommy_tuberville',
    'ak-house-1': '/district/ak-cd-1',
    'ak-us-senate-murkowski': '/district/ak-us-senate-murkowski',
    'ak-us-senate-dan_sullivan': '/district/ak-us-senate-dan_sullivan',
    'az-house-1': '/district/az-cd-1',
    'az-house-2': '/district/az-cd-2',
    'az-house-3': '/district/az-cd-3',
    'az-house-4': '/district/az-cd-4',
    'az-house-5': '/district/az-cd-5',
    'az-house-6': '/district/az-cd-6',
    'az-house-7': '/district/az-cd-7',
    'az-house-8': '/district/az-cd-8',
    'az-house-9': '/district/az-cd-9',
    'az-us-senate-mark_kelly': '/district/az-us-senate-mark_kelly',
    'az-us-senate-gallego': '/district/az-us-senate-gallego',
    'ar-house-1': '/district/ar-cd-1',
    'ar-house-3': '/district/ar-cd-3',
    'ar-house-4': '/district/ar-cd-4',
    'ar-us-senate-cotton': '/district/ar-us-senate-cotton',
    'ar-us-senate-boozman': '/district/ar-us-senate-boozman',
    'ca-house-1': '/district/ca-cd-1',
    'ca-house-3': '/district/ca-cd-3',
    'ca-house-4': '/district/ca-cd-4',
    'ca-house-5': '/district/ca-cd-5',
    'ca-house-6': '/district/ca-cd-6',
    'ca-house-7': '/district/ca-cd-7',
    'ca-house-8': '/district/ca-cd-8',
    'ca-house-9': '/district/ca-cd-9',
    'ca-house-10': '/district/ca-cd-10',
    'ca-house-11': '/district/ca-cd-11',
    'ca-house-12': '/district/ca-cd-12',
    'ca-house-13': '/district/ca-cd-13',
    'ca-house-15': '/district/ca-cd-15',
    'ca-house-16': '/district/ca-cd-16',
    'ca-house-19': '/district/ca-cd-19',
    'ca-house-20': '/district/ca-cd-20',
    'ca-house-21': '/district/ca-cd-21',
    'ca-house-22': '/district/ca-cd-22',
    'ca-house-23': '/district/ca-cd-23',
    'ca-house-24': '/district/ca-cd-24',
    'ca-house-25': '/district/ca-cd-25',
    'ca-house-26': '/district/ca-cd-26',
    'ca-house-27': '/district/ca-cd-27',
    'ca-house-28': '/district/ca-cd-28',
    'ca-house-29': '/district/ca-cd-29',
    'ca-house-30': '/district/ca-cd-30',
    'ca-house-31': '/district/ca-cd-31',
    'ca-house-32': '/district/ca-cd-32',
    'ca-house-34': '/district/ca-cd-34',
    'ca-house-35': '/district/ca-cd-35',
    'ca-house-37': '/district/ca-cd-37',
    'ca-house-38': '/district/ca-cd-38',
    'ca-house-40': '/district/ca-cd-40',
    'ca-house-41': '/district/ca-cd-41',
    'ca-house-44': '/district/ca-cd-44',
    'ca-house-45': '/district/ca-cd-45',
    'ca-house-46': '/district/ca-cd-46',
    'ca-house-47': '/district/ca-cd-47',
    'ca-house-48': '/district/ca-cd-48',
    'ca-house-49': '/district/ca-cd-49',
    'ca-house-50': '/district/ca-cd-50',
    'ca-house-51': '/district/ca-cd-51',
    'ca-house-52': '/district/ca-cd-52',
    'ca-us-senate-schiff': '/district/ca-us-senate-schiff',
    'ca-us-senate-padilla': '/district/ca-us-senate-padilla',
    'co-house-1': '/district/co-cd-1',
    'co-house-2': '/district/co-cd-2',
    'co-house-3': '/district/co-cd-3',
    'co-house-4': '/district/co-cd-4',
    'co-house-5': '/district/co-cd-5',
    'co-house-6': '/district/co-cd-6',
    'co-house-7': '/district/co-cd-7',
    'co-house-8': '/district/co-cd-8',
    'co-us-senate-bennet': '/district/co-us-senate-bennet',
    'co-us-senate-hickenlooper': '/district/co-us-senate-hickenlooper',
    'ct-house-1': '/district/ct-cd-1',
    'ct-house-2': '/district/ct-cd-2',
    'ct-house-5': '/district/ct-cd-5',
    'ct-us-senate-chris_murphy': '/district/ct-us-senate-chris_murphy',
    'ct-us-senate-blumenthal': '/district/ct-us-senate-blumenthal',
    'de-us-senate-coons': '/district/de-us-senate-coons',
    'de-us-senate-blunt_rochester': '/district/de-us-senate-blunt_rochester',
    'fl-house-1': '/district/fl-cd-1',
    'fl-house-2': '/district/fl-cd-2',
    'fl-house-3': '/district/fl-cd-3',
    'fl-house-4': '/district/fl-cd-4',
    'fl-house-5': '/district/fl-cd-5',
    'fl-house-6': '/district/fl-cd-6',
    'fl-house-7': '/district/fl-cd-7',
    'fl-house-8': '/district/fl-cd-8',
    'fl-house-9': '/district/fl-cd-9',
    'fl-house-11': '/district/fl-cd-11',
    'fl-house-12': '/district/fl-cd-12',
    'fl-house-14': '/district/fl-cd-14',
    'fl-house-15': '/district/fl-cd-15',
    'fl-house-16': '/district/fl-cd-16',
    'fl-house-17': '/district/fl-cd-17',
    'fl-house-18': '/district/fl-cd-18',
    'fl-house-22': '/district/fl-cd-22',
    'fl-house-23': '/district/fl-cd-23',
    'fl-house-24': '/district/fl-cd-24',
    'fl-house-25': '/district/fl-cd-25',
    'fl-house-26': '/district/fl-cd-26',
    'fl-house-27': '/district/fl-cd-27',
    'fl-house-28': '/district/fl-cd-28',
    'fl-us-senate-ashley_moody': '/district/fl-us-senate-ashley_moody',
    'fl-us-senate-rick_scott': '/district/fl-us-senate-rick_scott',
    'ga-house-1': '/district/ga-cd-1',
    'ga-house-2': '/district/ga-cd-2',
    'ga-house-3': '/district/ga-cd-3',
    'ga-house-4': '/district/ga-cd-4',
    'ga-house-5': '/district/ga-cd-5',
    'ga-house-6': '/district/ga-cd-6',
    'ga-house-7': '/district/ga-cd-7',
    'ga-house-8': '/district/ga-cd-8',
    'ga-house-9': '/district/ga-cd-9',
    'ga-house-10': '/district/ga-cd-10',
    'ga-house-11': '/district/ga-cd-11',
    'ga-house-12': '/district/ga-cd-12',
    'ga-house-14': '/district/ga-cd-14',
    'ga-us-senate-jon_ossoff': '/district/ga-us-senate-jon_ossoff',
    'ga-us-senate-warnock': '/district/ga-us-senate-warnock',
    'hi-house-1': '/district/hi-cd-1',
    'hi-house-2': '/district/hi-cd-2',
    'hi-us-senate-hirono': '/district/hi-us-senate-hirono',
    'hi-us-senate-schatz': '/district/hi-us-senate-schatz',
    'id-house-1': '/district/id-cd-1',
    'id-house-2': '/district/id-cd-2',
    'id-us-senate-risch': '/district/id-us-senate-risch',
    'id-us-senate-crapo': '/district/id-us-senate-crapo',
    'il-house-1': '/district/il-cd-1',
    'il-house-2': '/district/il-cd-2',
    'il-house-4': '/district/il-cd-4',
    'il-house-5': '/district/il-cd-5',
    'il-house-6': '/district/il-cd-6',
    'il-house-7': '/district/il-cd-7',
    'il-house-10': '/district/il-cd-10',
    'il-house-11': '/district/il-cd-11',
    'il-house-13': '/district/il-cd-13',
    'il-house-14': '/district/il-cd-14',
    'il-house-15': '/district/il-cd-15',
    'il-house-16': '/district/il-cd-16',
    'il-house-17': '/district/il-cd-17',
    'il-us-senate-durbin': '/district/il-us-senate-durbin',
    'il-us-senate-duckworth': '/district/il-us-senate-duckworth',
    'in-house-1': '/district/in-cd-1',
    'in-house-2': '/district/in-cd-2',
    'in-house-3': '/district/in-cd-3',
    'in-house-4': '/district/in-cd-4',
    'in-house-5': '/district/in-cd-5',
    'in-house-6': '/district/in-cd-6',
    'in-house-7': '/district/in-cd-7',
    'in-house-8': '/district/in-cd-8',
    'in-house-9': '/district/in-cd-9',
    'in-us-senate-banks': '/district/in-us-senate-banks',
    'in-us-senate-todd_young': '/district/in-us-senate-todd_young',
    'ia-house-1': '/district/ia-cd-1',
    'ia-house-2': '/district/ia-cd-2',
    'ia-house-3': '/district/ia-cd-3',
    'ia-house-4': '/district/ia-cd-4',
    'ia-us-senate-grassley': '/district/ia-us-senate-grassley',
    'ia-us-senate-ernst': '/district/ia-us-senate-ernst',
    'ks-house-1': '/district/ks-cd-1',
    'ks-house-2': '/district/ks-cd-2',
    'ks-house-3': '/district/ks-cd-3',
    'ks-house-4': '/district/ks-cd-4',
    'ks-us-senate-roger_marshall': '/district/ks-us-senate-roger_marshall',
    'ks-us-senate-jerry_moran': '/district/ks-us-senate-jerry_moran',
    'ky-house-3': '/district/ky-cd-3',
    'ky-house-5': '/district/ky-cd-5',
    'ky-house-6': '/district/ky-cd-6',
    'ky-us-senate-mcconnell': '/district/ky-us-senate-mcconnell',
    'ky-us-senate-rand_paul': '/district/ky-us-senate-rand_paul',
    'la-house-2': '/district/la-cd-2',
    'la-house-3': '/district/la-cd-3',
    'la-house-5': '/district/la-cd-5',
    'la-house-6': '/district/la-cd-6',
    'la-us-senate-kennedy_john': '/district/la-us-senate-kennedy_john',
    'la-us-senate-cassidy': '/district/la-us-senate-cassidy',
    'me-house-1': '/district/me-cd-1',
    'me-house-2': '/district/me-cd-2',
    'me-us-senate-collins': '/district/me-us-senate-collins',
    'me-us-senate-angus_king': '/district/me-us-senate-angus_king',
    'md-house-2': '/district/md-cd-2',
    'md-house-3': '/district/md-cd-3',
    'md-house-4': '/district/md-cd-4',
    'md-house-6': '/district/md-cd-6',
    'md-house-7': '/district/md-cd-7',
    'md-us-senate-alsobrooks': '/district/md-us-senate-alsobrooks',
    'md-us-senate-van_hollen': '/district/md-us-senate-van_hollen',
    'ma-house-3': '/district/ma-cd-3',
    'ma-house-8': '/district/ma-cd-8',
    'ma-house-9': '/district/ma-cd-9',
    'ma-us-senate-warren': '/district/ma-us-senate-warren',
    'ma-us-senate-markey': '/district/ma-us-senate-markey',
    'mi-house-1': '/district/mi-cd-1',
    'mi-house-2': '/district/mi-cd-2',
    'mi-house-3': '/district/mi-cd-3',
    'mi-house-4': '/district/mi-cd-4',
    'mi-house-5': '/district/mi-cd-5',
    'mi-house-6': '/district/mi-cd-6',
    'mi-house-7': '/district/mi-cd-7',
    'mi-house-8': '/district/mi-cd-8',
    'mi-house-9': '/district/mi-cd-9',
    'mi-house-10': '/district/mi-cd-10',
    'mi-house-11': '/district/mi-cd-11',
    'mi-house-12': '/district/mi-cd-12',
    'mi-house-13': '/district/mi-cd-13',
    'mi-us-senate-slotkin': '/district/mi-us-senate-slotkin',
    'mi-us-senate-peters': '/district/mi-us-senate-peters',
    'mn-house-1': '/district/mn-cd-1',
    'mn-house-2': '/district/mn-cd-2',
    'mn-house-3': '/district/mn-cd-3',
    'mn-house-4': '/district/mn-cd-4',
    'mn-house-5': '/district/mn-cd-5',
    'mn-house-6': '/district/mn-cd-6',
    'mn-house-7': '/district/mn-cd-7',
    'mn-house-8': '/district/mn-cd-8',
    'mn-us-senate-klobuchar': '/district/mn-us-senate-klobuchar',
    'mn-us-senate-tina_smith': '/district/mn-us-senate-tina_smith',
    'ms-house-1': '/district/ms-cd-1',
    'ms-house-2': '/district/ms-cd-2',
    'ms-house-3': '/district/ms-cd-3',
    'ms-house-4': '/district/ms-cd-4',
    'ms-us-senate-wicker': '/district/ms-us-senate-wicker',
    'ms-us-senate-hyde_smith': '/district/ms-us-senate-hyde_smith',
    'mo-house-1': '/district/mo-cd-1',
    'mo-house-2': '/district/mo-cd-2',
    'mo-house-3': '/district/mo-cd-3',
    'mo-house-4': '/district/mo-cd-4',
    'mo-house-5': '/district/mo-cd-5',
    'mo-house-7': '/district/mo-cd-7',
    'mo-us-senate-hawley': '/district/mo-us-senate-hawley',
    'mo-us-senate-schmitt': '/district/mo-us-senate-schmitt',
    'mt-house-1': '/district/mt-cd-1',
    'mt-house-2': '/district/mt-cd-2',
    'mt-us-senate-sheehy': '/district/mt-us-senate-sheehy',
    'mt-us-senate-daines': '/district/mt-us-senate-daines',
    'ne-house-1': '/district/ne-cd-1',
    'ne-house-2': '/district/ne-cd-2',
    'ne-house-3': '/district/ne-cd-3',
    'ne-us-senate-deb_fischer': '/district/ne-us-senate-deb_fischer',
    'ne-us-senate-ricketts': '/district/ne-us-senate-ricketts',
    'nv-house-1': '/district/nv-cd-1',
    'nv-house-2': '/district/nv-cd-2',
    'nv-house-3': '/district/nv-cd-3',
    'nv-house-4': '/district/nv-cd-4',
    'nv-us-senate-rosen': '/district/nv-us-senate-rosen',
    'nv-us-senate-cortez_masto': '/district/nv-us-senate-cortez_masto',
    'nh-house-1': '/district/nh-cd-1',
    'nh-house-2': '/district/nh-cd-2',
    'nh-us-senate-shaheen': '/district/nh-us-senate-shaheen',
    'nh-us-senate-maggie_hassan': '/district/nh-us-senate-maggie_hassan',
    'nj-house-1': '/district/nj-cd-1',
    'nj-house-2': '/district/nj-cd-2',
    'nj-house-3': '/district/nj-cd-3',
    'nj-house-4': '/district/nj-cd-4',
    'nj-house-7': '/district/nj-cd-7',
    'nj-house-8': '/district/nj-cd-8',
    'nj-house-9': '/district/nj-cd-9',
    'nj-house-10': '/district/nj-cd-10',
    'nj-house-11': '/district/nj-cd-11',
    'nj-house-12': '/district/nj-cd-12',
    'nj-us-senate-booker': '/district/nj-us-senate-booker',
    'nj-us-senate-andy_kim': '/district/nj-us-senate-andy_kim',
    'nm-house-1': '/district/nm-cd-1',
    'nm-house-2': '/district/nm-cd-2',
    'nm-house-3': '/district/nm-cd-3',
    'nm-us-senate-heinrich': '/district/nm-us-senate-heinrich',
    'nm-us-senate-lujan': '/district/nm-us-senate-lujan',
    'ny-house-1': '/district/ny-cd-1',
    'ny-house-4': '/district/ny-cd-4',
    'ny-house-6': '/district/ny-cd-6',
    'ny-house-7': '/district/ny-cd-7',
    'ny-house-11': '/district/ny-cd-11',
    'ny-house-13': '/district/ny-cd-13',
    'ny-house-16': '/district/ny-cd-16',
    'ny-house-18': '/district/ny-cd-18',
    'ny-house-19': '/district/ny-cd-19',
    'ny-house-20': '/district/ny-cd-20',
    'ny-house-22': '/district/ny-cd-22',
    'ny-house-23': '/district/ny-cd-23',
    'ny-house-24': '/district/ny-cd-24',
    'ny-house-25': '/district/ny-cd-25',
    'ny-house-26': '/district/ny-cd-26',
    'ny-us-senate-schumer': '/district/ny-us-senate-schumer',
    'ny-us-senate-gillibrand': '/district/ny-us-senate-gillibrand',
    'nc-house-1': '/district/nc-cd-1',
    'nc-house-2': '/district/nc-cd-2',
    'nc-house-3': '/district/nc-cd-3',
    'nc-house-4': '/district/nc-cd-4',
    'nc-house-6': '/district/nc-cd-6',
    'nc-house-7': '/district/nc-cd-7',
    'nc-house-8': '/district/nc-cd-8',
    'nc-house-10': '/district/nc-cd-10',
    'nc-house-11': '/district/nc-cd-11',
    'nc-house-12': '/district/nc-cd-12',
    'nc-house-13': '/district/nc-cd-13',
    'nc-house-14': '/district/nc-cd-14',
    'nc-us-senate-ted_budd': '/district/nc-us-senate-ted_budd',
    'nc-us-senate-tillis': '/district/nc-us-senate-tillis',
    'nd-house-1': '/district/nd-cd-1',
    'nd-us-senate-kevin_cramer': '/district/nd-us-senate-kevin_cramer',
    'nd-us-senate-hoeven': '/district/nd-us-senate-hoeven',
    'oh-house-2': '/district/oh-cd-2',
    'oh-house-3': '/district/oh-cd-3',
    'oh-house-5': '/district/oh-cd-5',
    'oh-house-6': '/district/oh-cd-6',
    'oh-house-7': '/district/oh-cd-7',
    'oh-house-8': '/district/oh-cd-8',
    'oh-house-9': '/district/oh-cd-9',
    'oh-house-10': '/district/oh-cd-10',
    'oh-house-11': '/district/oh-cd-11',
    'oh-house-12': '/district/oh-cd-12',
    'oh-house-13': '/district/oh-cd-13',
    'oh-house-14': '/district/oh-cd-14',
    'oh-house-15': '/district/oh-cd-15',
    'oh-us-senate-moreno': '/district/oh-us-senate-moreno',
    'oh-us-senate-jon_husted': '/district/oh-us-senate-jon_husted',
    'ok-house-2': '/district/ok-cd-2',
    'ok-house-3': '/district/ok-cd-3',
    'ok-house-5': '/district/ok-cd-5',
    'ok-us-senate-lankford': '/district/ok-us-senate-lankford',
    'ok-us-senate-alan_armstrong': '/district/ok-us-senate-alan_armstrong',
    'or-house-1': '/district/or-cd-1',
    'or-house-2': '/district/or-cd-2',
    'or-house-3': '/district/or-cd-3',
    'or-house-4': '/district/or-cd-4',
    'or-house-5': '/district/or-cd-5',
    'or-house-6': '/district/or-cd-6',
    'or-us-senate-wyden': '/district/or-us-senate-wyden',
    'or-us-senate-merkley': '/district/or-us-senate-merkley',
    'pa-house-3': '/district/pa-cd-3',
    'pa-house-4': '/district/pa-cd-4',
    'pa-house-5': '/district/pa-cd-5',
    'pa-house-6': '/district/pa-cd-6',
    'pa-house-7': '/district/pa-cd-7',
    'pa-house-8': '/district/pa-cd-8',
    'pa-house-9': '/district/pa-cd-9',
    'pa-house-10': '/district/pa-cd-10',
    'pa-house-11': '/district/pa-cd-11',
    'pa-house-13': '/district/pa-cd-13',
    'pa-house-14': '/district/pa-cd-14',
    'pa-house-16': '/district/pa-cd-16',
    'pa-house-17': '/district/pa-cd-17',
    'pa-us-senate-fetterman': '/district/pa-us-senate-fetterman',
    'pa-us-senate-mccormick': '/district/pa-us-senate-mccormick',
    'ri-house-1': '/district/ri-cd-1',
    'ri-house-2': '/district/ri-cd-2',
    'ri-us-senate-reed': '/district/ri-us-senate-reed',
    'ri-us-senate-whitehouse': '/district/ri-us-senate-whitehouse',
    'sc-house-2': '/district/sc-cd-2',
    'sc-house-3': '/district/sc-cd-3',
    'sc-house-4': '/district/sc-cd-4',
    'sc-house-5': '/district/sc-cd-5',
    'sc-house-7': '/district/sc-cd-7',
    'sc-us-senate-graham': '/district/sc-us-senate-graham',
    'sc-us-senate-tim_scott': '/district/sc-us-senate-tim_scott',
    'sd-house-1': '/district/sd-cd-1',
    'sd-us-senate-thune': '/district/sd-us-senate-thune',
    'sd-us-senate-mike_rounds': '/district/sd-us-senate-mike_rounds',
    'tn-house-1': '/district/tn-cd-1',
    'tn-house-2': '/district/tn-cd-2',
    'tn-house-3': '/district/tn-cd-3',
    'tn-house-4': '/district/tn-cd-4',
    'tn-house-5': '/district/tn-cd-5',
    'tn-house-6': '/district/tn-cd-6',
    'tn-house-7': '/district/tn-cd-7',
    'tn-house-8': '/district/tn-cd-8',
    'tn-house-9': '/district/tn-cd-9',
    'tn-us-senate-hagerty': '/district/tn-us-senate-hagerty',
    'tn-us-senate-blackburn': '/district/tn-us-senate-blackburn',
    'tx-house-1': '/district/tx-cd-1',
    'tx-house-3': '/district/tx-cd-3',
    'tx-house-4': '/district/tx-cd-4',
    'tx-house-5': '/district/tx-cd-5',
    'tx-house-6': '/district/tx-cd-6',
    'tx-house-7': '/district/tx-cd-7',
    'tx-house-8': '/district/tx-cd-8',
    'tx-house-9': '/district/tx-cd-9',
    'tx-house-10': '/district/tx-cd-10',
    'tx-house-12': '/district/tx-cd-12',
    'tx-house-13': '/district/tx-cd-13',
    'tx-house-14': '/district/tx-cd-14',
    'tx-house-15': '/district/tx-cd-15',
    'tx-house-16': '/district/tx-cd-16',
    'tx-house-17': '/district/tx-cd-17',
    'tx-house-18': '/district/tx-cd-18',
    'tx-house-20': '/district/tx-cd-20',
    'tx-house-22': '/district/tx-cd-22',
    'tx-house-24': '/district/tx-cd-24',
    'tx-house-26': '/district/tx-cd-26',
    'tx-house-27': '/district/tx-cd-27',
    'tx-house-28': '/district/tx-cd-28',
    'tx-house-29': '/district/tx-cd-29',
    'tx-house-31': '/district/tx-cd-31',
    'tx-house-32': '/district/tx-cd-32',
    'tx-house-33': '/district/tx-cd-33',
    'tx-house-34': '/district/tx-cd-34',
    'tx-house-37': '/district/tx-cd-37',
    'tx-house-38': '/district/tx-cd-38',
    'tx-us-senate-cruz': '/district/tx-us-senate-cruz',
    'tx-us-senate-john_cornyn': '/district/tx-us-senate-john_cornyn',
    'vt-house-1': '/district/vt-cd-1',
    'vt-us-senate-welch': '/district/vt-us-senate-welch',
    'vt-us-senate-sanders': '/district/vt-us-senate-sanders',
    'va-house-1': '/district/va-cd-1',
    'va-house-2': '/district/va-cd-2',
    'va-house-4': '/district/va-cd-4',
    'va-house-5': '/district/va-cd-5',
    'va-house-6': '/district/va-cd-6',
    'va-house-7': '/district/va-cd-7',
    'va-house-8': '/district/va-cd-8',
    'va-house-9': '/district/va-cd-9',
    'va-house-10': '/district/va-cd-10',
    'va-house-11': '/district/va-cd-11',
    'va-us-senate-kaine': '/district/va-us-senate-kaine',
    'va-us-senate-warner': '/district/va-us-senate-warner',
    'wa-house-4': '/district/wa-cd-4',
    'wa-house-5': '/district/wa-cd-5',
    'wa-house-6': '/district/wa-cd-6',
    'wa-house-8': '/district/wa-cd-8',
    'wa-house-10': '/district/wa-cd-10',
    'wa-us-senate-murray': '/district/wa-us-senate-murray',
    'wa-us-senate-cantwell': '/district/wa-us-senate-cantwell',
    'wv-house-1': '/district/wv-cd-1',
    'wv-house-2': '/district/wv-cd-2',
    'wv-us-senate-capito': '/district/wv-us-senate-capito',
    'wv-us-senate-jim_justice': '/district/wv-us-senate-jim_justice',
    'wi-house-2': '/district/wi-cd-2',
    'wi-house-3': '/district/wi-cd-3',
    'wi-house-4': '/district/wi-cd-4',
    'wi-house-5': '/district/wi-cd-5',
    'wi-house-6': '/district/wi-cd-6',
    'wi-house-7': '/district/wi-cd-7',
    'wi-house-8': '/district/wi-cd-8',
    'wi-us-senate-ron_johnson': '/district/wi-us-senate-ron_johnson',
    'wi-us-senate-tammy_baldwin': '/district/wi-us-senate-tammy_baldwin',
    'wy-house-1': '/district/wy-cd-1',
    'wy-us-senate-barrasso': '/district/wy-us-senate-barrasso',
    'wy-us-senate-lummis': '/district/wy-us-senate-lummis',
    'ak-gov': '/district/ak-gov',
    'co-gov': '/district/co-gov',
    'id-gov': '/district/id-gov',
    'me-gov': '/district/me-gov',
    'mi-gov': '/district/mi-gov',
    'mn-gov': '/district/mn-gov',
    'ms-gov': '/district/ms-gov',
    'mt-gov': '/district/mt-gov',
    'ne-gov': '/district/ne-gov',
    'nv-gov': '/district/nv-gov',
    'ri-gov': '/district/ri-gov',
    'sd-gov': '/district/sd-gov',
    'tn-gov': '/district/tn-gov',
    'vt-gov': '/district/vt-gov',
    'ak-statehouse-1': '/district/ak-hd-1',
    'ak-statehouse-10': '/district/ak-hd-10',
    'ak-statehouse-11': '/district/ak-hd-11',
    'ak-statehouse-12': '/district/ak-hd-12',
    'ak-statehouse-13': '/district/ak-hd-13',
    'ak-statehouse-14': '/district/ak-hd-14',
    'ak-statehouse-15': '/district/ak-hd-15',
    'ak-statehouse-16': '/district/ak-hd-16',
    'ak-statehouse-17': '/district/ak-hd-17',
    'ak-statehouse-18': '/district/ak-hd-18',
    'ak-statehouse-19': '/district/ak-hd-19',
    'ak-statehouse-2': '/district/ak-hd-2',
    'ak-statehouse-20': '/district/ak-hd-20',
    'ak-statehouse-21': '/district/ak-hd-21',
    'ak-statehouse-22': '/district/ak-hd-22',
    'ak-statehouse-23': '/district/ak-hd-23',
    'ak-statehouse-24': '/district/ak-hd-24',
    'ak-statehouse-25': '/district/ak-hd-25',
    'ak-statehouse-26': '/district/ak-hd-26',
    'ak-statehouse-27': '/district/ak-hd-27',
    'ak-statehouse-28': '/district/ak-hd-28',
    'ak-statehouse-29': '/district/ak-hd-29',
    'ak-statehouse-3': '/district/ak-hd-3',
    'ak-statehouse-30': '/district/ak-hd-30',
    'ak-statehouse-31': '/district/ak-hd-31',
    'ak-statehouse-32': '/district/ak-hd-32',
    'ak-statehouse-33': '/district/ak-hd-33',
    'ak-statehouse-34': '/district/ak-hd-34',
    'ak-statehouse-35': '/district/ak-hd-35',
    'ak-statehouse-36': '/district/ak-hd-36',
    'ak-statehouse-37': '/district/ak-hd-37',
    'ak-statehouse-38': '/district/ak-hd-38',
    'ak-statehouse-39': '/district/ak-hd-39',
    'ak-statehouse-4': '/district/ak-hd-4',
    'ak-statehouse-40': '/district/ak-hd-40',
    'ak-statehouse-5': '/district/ak-hd-5',
    'ak-statehouse-6': '/district/ak-hd-6',
    'ak-statehouse-7': '/district/ak-hd-7',
    'ak-statehouse-8': '/district/ak-hd-8',
    'ak-statehouse-9': '/district/ak-hd-9',
    'ak-statesenate-1': '/district/ak-sd-1',
    'ak-statesenate-2': '/district/ak-sd-2',
    'ak-statesenate-3': '/district/ak-sd-3',
    'ak-statesenate-4': '/district/ak-sd-4',
    'ak-statesenate-5': '/district/ak-sd-5',
    'ak-statesenate-6': '/district/ak-sd-6',
    'ak-statesenate-7': '/district/ak-sd-7',
    'ak-statesenate-8': '/district/ak-sd-8',
    'ak-statesenate-9': '/district/ak-sd-9',
    'ak-statesenate-10': '/district/ak-sd-10',
    'ak-statesenate-11': '/district/ak-sd-11',
    'ak-statesenate-12': '/district/ak-sd-12',
    'ak-statesenate-13': '/district/ak-sd-13',
    'ak-statesenate-14': '/district/ak-sd-14',
    'ak-statesenate-15': '/district/ak-sd-15',
    'ak-statesenate-16': '/district/ak-sd-16',
    'ak-statesenate-17': '/district/ak-sd-17',
    'ak-statesenate-18': '/district/ak-sd-18',
    'ak-statesenate-19': '/district/ak-sd-19',
    'ak-statesenate-20': '/district/ak-sd-20',
    'az-statesenate-2': '/district/az-sd-2',
    'az-statesenate-23': '/district/az-sd-23',
    'az-statesenate-9': '/district/az-sd-9',
    'az-statesenate-4': '/district/az-sd-4',
    'ca-statehouse-7': '/district/ca-hd-7',
    'ca-statehouse-36': '/district/ca-hd-36',
    'ca-statehouse-47': '/district/ca-hd-47',
    'ca-statehouse-58': '/district/ca-hd-58',
    'ca-statehouse-74': '/district/ca-hd-74',
    'ca-statesenate-16': '/district/ca-sd-16',
    'ca-statesenate-38': '/district/ca-sd-38',
    'co-statesenate-33': '/district/co-sd-33',
    'co-statehouse-13': '/district/co-hd-13',
    'co-statesenate-32': '/district/co-sd-32',
    'co-statesenate-6': '/district/co-sd-6',
    'co-statesenate-11': '/district/co-sd-11',
    'co-statesenate-15': '/district/co-sd-15',
    'co-statesenate-21': '/district/co-sd-21',
    'co-statesenate-30': '/district/co-sd-30',
    'co-statehouse-19': '/district/co-hd-19',
    'co-statehouse-25': '/district/co-hd-25',
    'co-statehouse-33': '/district/co-hd-33',
    'co-statehouse-43': '/district/co-hd-43',
    'co-statehouse-46': '/district/co-hd-46',
    'co-statehouse-50': '/district/co-hd-50',
    'co-statehouse-59': '/district/co-hd-59',
    'co-statehouse-1': '/district/co-hd-1',
    'co-statehouse-2': '/district/co-hd-2',
    'co-statehouse-3': '/district/co-hd-3',
    'co-statehouse-4': '/district/co-hd-4',
    'co-statehouse-5': '/district/co-hd-5',
    'co-statehouse-6': '/district/co-hd-6',
    'co-statehouse-7': '/district/co-hd-7',
    'co-statehouse-8': '/district/co-hd-8',
    'co-statehouse-9': '/district/co-hd-9',
    'co-statehouse-10': '/district/co-hd-10',
    'co-statehouse-11': '/district/co-hd-11',
    'co-statehouse-12': '/district/co-hd-12',
    'co-statehouse-14': '/district/co-hd-14',
    'co-statehouse-15': '/district/co-hd-15',
    'co-statehouse-16': '/district/co-hd-16',
    'co-statehouse-17': '/district/co-hd-17',
    'co-statehouse-18': '/district/co-hd-18',
    'co-statehouse-20': '/district/co-hd-20',
    'co-statehouse-21': '/district/co-hd-21',
    'co-statehouse-22': '/district/co-hd-22',
    'co-statehouse-23': '/district/co-hd-23',
    'co-statehouse-24': '/district/co-hd-24',
    'co-statehouse-26': '/district/co-hd-26',
    'co-statehouse-27': '/district/co-hd-27',
    'co-statehouse-28': '/district/co-hd-28',
    'co-statehouse-29': '/district/co-hd-29',
    'co-statehouse-30': '/district/co-hd-30',
    'co-statehouse-31': '/district/co-hd-31',
    'co-statehouse-32': '/district/co-hd-32',
    'co-statehouse-34': '/district/co-hd-34',
    'co-statehouse-35': '/district/co-hd-35',
    'co-statehouse-36': '/district/co-hd-36',
    'co-statehouse-37': '/district/co-hd-37',
    'co-statehouse-38': '/district/co-hd-38',
    'co-statehouse-39': '/district/co-hd-39',
    'co-statehouse-40': '/district/co-hd-40',
    'co-statehouse-41': '/district/co-hd-41',
    'co-statehouse-42': '/district/co-hd-42',
    'co-statehouse-44': '/district/co-hd-44',
    'co-statehouse-45': '/district/co-hd-45',
    'co-statehouse-47': '/district/co-hd-47',
    'co-statehouse-48': '/district/co-hd-48',
    'co-statehouse-49': '/district/co-hd-49',
    'co-statehouse-51': '/district/co-hd-51',
    'co-statehouse-52': '/district/co-hd-52',
    'co-statehouse-53': '/district/co-hd-53',
    'co-statehouse-54': '/district/co-hd-54',
    'co-statehouse-55': '/district/co-hd-55',
    'co-statehouse-56': '/district/co-hd-56',
    'co-statehouse-57': '/district/co-hd-57',
    'co-statehouse-58': '/district/co-hd-58',
    'co-statehouse-60': '/district/co-hd-60',
    'co-statehouse-61': '/district/co-hd-61',
    'co-statehouse-62': '/district/co-hd-62',
    'co-statehouse-63': '/district/co-hd-63',
    'co-statehouse-64': '/district/co-hd-64',
    'co-statehouse-65': '/district/co-hd-65',
    'co-statesenate-1': '/district/co-sd-1',
    'co-statesenate-2': '/district/co-sd-2',
    'co-statesenate-3': '/district/co-sd-3',
    'co-statesenate-5': '/district/co-sd-5',
    'co-statesenate-7': '/district/co-sd-7',
    'co-statesenate-8': '/district/co-sd-8',
    'co-statesenate-9': '/district/co-sd-9',
    'co-statesenate-10': '/district/co-sd-10',
    'co-statesenate-12': '/district/co-sd-12',
    'co-statesenate-13': '/district/co-sd-13',
    'co-statesenate-14': '/district/co-sd-14',
    'co-statesenate-16': '/district/co-sd-16',
    'co-statesenate-17': '/district/co-sd-17',
    'co-statesenate-18': '/district/co-sd-18',
    'co-statesenate-19': '/district/co-sd-19',
    'co-statesenate-20': '/district/co-sd-20',
    'co-statesenate-22': '/district/co-sd-22',
    'co-statesenate-23': '/district/co-sd-23',
    'co-statesenate-24': '/district/co-sd-24',
    'co-statesenate-25': '/district/co-sd-25',
    'co-statesenate-26': '/district/co-sd-26',
    'co-statesenate-27': '/district/co-sd-27',
    'co-statesenate-28': '/district/co-sd-28',
    'co-statesenate-29': '/district/co-sd-29',
    'co-statesenate-31': '/district/co-sd-31',
    'co-statesenate-34': '/district/co-sd-34',
    'co-statesenate-35': '/district/co-sd-35',
    'co-statesenate-4': '/district/co-sd-4',
    'fl-statehouse-35': '/district/fl-hd-35',
    'fl-statehouse-65': '/district/fl-hd-65',
    'fl-statehouse-87': '/district/fl-hd-87',
    'fl-statehouse-89': '/district/fl-hd-89',
    'fl-statehouse-93': '/district/fl-hd-93',
    'fl-statehouse-101': '/district/fl-hd-101',
    'fl-statehouse-106': '/district/fl-hd-106',
    'fl-statesenate-10': '/district/fl-sd-10',
    'fl-statesenate-14': '/district/fl-sd-14',
    'fl-statesenate-38': '/district/fl-sd-38',
    'ga-statesenate-37': '/district/ga-sd-37',
    'ga-statesenate-48': '/district/ga-sd-48',
    'ga-statehouse-151': '/district/ga-hd-151',
    'ga-statehouse-105': '/district/ga-hd-105',
    'ga-statehouse-154': '/district/ga-hd-154',
    'ga-statehouse-48': '/district/ga-hd-48',
    'ga-statehouse-44': '/district/ga-hd-44',
    'ga-statehouse-99': '/district/ga-hd-99',
    'ga-statehouse-53': '/district/ga-hd-53',
    'id-statehouse-10-p1': '/district/id-hd-10-p1',
    'id-statehouse-10-p2': '/district/id-hd-10-p2',
    'id-statehouse-11-p1': '/district/id-hd-11-p1',
    'id-statehouse-11-p2': '/district/id-hd-11-p2',
    'id-statehouse-12-p1': '/district/id-hd-12-p1',
    'id-statehouse-12-p2': '/district/id-hd-12-p2',
    'id-statehouse-13-p1': '/district/id-hd-13-p1',
    'id-statehouse-13-p2': '/district/id-hd-13-p2',
    'id-statehouse-14-p1': '/district/id-hd-14-p1',
    'id-statehouse-14-p2': '/district/id-hd-14-p2',
    'id-statehouse-15-p1': '/district/id-hd-15-p1',
    'id-statehouse-15-p2': '/district/id-hd-15-p2',
    'id-statehouse-16-p1': '/district/id-hd-16-p1',
    'id-statehouse-16-p2': '/district/id-hd-16-p2',
    'id-statehouse-17-p1': '/district/id-hd-17-p1',
    'id-statehouse-17-p2': '/district/id-hd-17-p2',
    'id-statehouse-18-p1': '/district/id-hd-18-p1',
    'id-statehouse-18-p2': '/district/id-hd-18-p2',
    'id-statehouse-19-p1': '/district/id-hd-19-p1',
    'id-statehouse-19-p2': '/district/id-hd-19-p2',
    'id-statehouse-1-p1': '/district/id-hd-1-p1',
    'id-statehouse-1-p2': '/district/id-hd-1-p2',
    'id-statehouse-20-p1': '/district/id-hd-20-p1',
    'id-statehouse-20-p2': '/district/id-hd-20-p2',
    'id-statehouse-21-p1': '/district/id-hd-21-p1',
    'id-statehouse-21-p2': '/district/id-hd-21-p2',
    'id-statehouse-22-p1': '/district/id-hd-22-p1',
    'id-statehouse-22-p2': '/district/id-hd-22-p2',
    'id-statehouse-23-p1': '/district/id-hd-23-p1',
    'id-statehouse-23-p2': '/district/id-hd-23-p2',
    'id-statehouse-24-p1': '/district/id-hd-24-p1',
    'id-statehouse-24-p2': '/district/id-hd-24-p2',
    'id-statehouse-25-p1': '/district/id-hd-25-p1',
    'id-statehouse-25-p2': '/district/id-hd-25-p2',
    'id-statehouse-26-p1': '/district/id-hd-26-p1',
    'id-statehouse-26-p2': '/district/id-hd-26-p2',
    'id-statehouse-27-p1': '/district/id-hd-27-p1',
    'id-statehouse-27-p2': '/district/id-hd-27-p2',
    'id-statehouse-28-p1': '/district/id-hd-28-p1',
    'id-statehouse-28-p2': '/district/id-hd-28-p2',
    'id-statehouse-29-p1': '/district/id-hd-29-p1',
    'id-statehouse-29-p2': '/district/id-hd-29-p2',
    'id-statehouse-2-p1': '/district/id-hd-2-p1',
    'id-statehouse-2-p2': '/district/id-hd-2-p2',
    'id-statehouse-30-p1': '/district/id-hd-30-p1',
    'id-statehouse-30-p2': '/district/id-hd-30-p2',
    'id-statehouse-31-p1': '/district/id-hd-31-p1',
    'id-statehouse-31-p2': '/district/id-hd-31-p2',
    'id-statehouse-32-p1': '/district/id-hd-32-p1',
    'id-statehouse-32-p2': '/district/id-hd-32-p2',
    'id-statehouse-33-p1': '/district/id-hd-33-p1',
    'id-statehouse-33-p2': '/district/id-hd-33-p2',
    'id-statehouse-34-p1': '/district/id-hd-34-p1',
    'id-statehouse-34-p2': '/district/id-hd-34-p2',
    'id-statehouse-35-p1': '/district/id-hd-35-p1',
    'id-statehouse-35-p2': '/district/id-hd-35-p2',
    'id-statehouse-3-p1': '/district/id-hd-3-p1',
    'id-statehouse-3-p2': '/district/id-hd-3-p2',
    'id-statehouse-4-p1': '/district/id-hd-4-p1',
    'id-statehouse-4-p2': '/district/id-hd-4-p2',
    'id-statehouse-5-p1': '/district/id-hd-5-p1',
    'id-statehouse-5-p2': '/district/id-hd-5-p2',
    'id-statehouse-6-p1': '/district/id-hd-6-p1',
    'id-statehouse-6-p2': '/district/id-hd-6-p2',
    'id-statehouse-7-p1': '/district/id-hd-7-p1',
    'id-statehouse-7-p2': '/district/id-hd-7-p2',
    'id-statehouse-8-p1': '/district/id-hd-8-p1',
    'id-statehouse-8-p2': '/district/id-hd-8-p2',
    'id-statehouse-9-p1': '/district/id-hd-9-p1',
    'id-statehouse-9-p2': '/district/id-hd-9-p2',
    'id-statesenate-1': '/district/id-sd-1',
    'id-statesenate-10': '/district/id-sd-10',
    'id-statesenate-11': '/district/id-sd-11',
    'id-statesenate-12': '/district/id-sd-12',
    'id-statesenate-13': '/district/id-sd-13',
    'id-statesenate-14': '/district/id-sd-14',
    'id-statesenate-15': '/district/id-sd-15',
    'id-statesenate-16': '/district/id-sd-16',
    'id-statesenate-17': '/district/id-sd-17',
    'id-statesenate-18': '/district/id-sd-18',
    'id-statesenate-19': '/district/id-sd-19',
    'id-statesenate-2': '/district/id-sd-2',
    'id-statesenate-20': '/district/id-sd-20',
    'id-statesenate-21': '/district/id-sd-21',
    'id-statesenate-22': '/district/id-sd-22',
    'id-statesenate-23': '/district/id-sd-23',
    'id-statesenate-24': '/district/id-sd-24',
    'id-statesenate-25': '/district/id-sd-25',
    'id-statesenate-26': '/district/id-sd-26',
    'id-statesenate-27': '/district/id-sd-27',
    'id-statesenate-28': '/district/id-sd-28',
    'id-statesenate-29': '/district/id-sd-29',
    'id-statesenate-3': '/district/id-sd-3',
    'id-statesenate-30': '/district/id-sd-30',
    'id-statesenate-31': '/district/id-sd-31',
    'id-statesenate-32': '/district/id-sd-32',
    'id-statesenate-33': '/district/id-sd-33',
    'id-statesenate-34': '/district/id-sd-34',
    'id-statesenate-35': '/district/id-sd-35',
    'id-statesenate-4': '/district/id-sd-4',
    'id-statesenate-5': '/district/id-sd-5',
    'id-statesenate-6': '/district/id-sd-6',
    'id-statesenate-7': '/district/id-sd-7',
    'id-statesenate-8': '/district/id-sd-8',
    'id-statesenate-9': '/district/id-sd-9',
    'il-statesenate-57': '/district/il-sd-57',
    'il-statesenate-36': '/district/il-sd-36',
    'il-statesenate-56': '/district/il-sd-56',
    'il-statesenate-26': '/district/il-sd-26',
    'il-statesenate-24': '/district/il-sd-24',
    'il-statesenate-48': '/district/il-sd-48',
    'il-statehouse-76': '/district/il-hd-76',
    'il-statehouse-97': '/district/il-hd-97',
    'il-statehouse-70': '/district/il-hd-70',
    'il-statehouse-52': '/district/il-hd-52',
    'il-statehouse-114': '/district/il-hd-114',
    'il-statehouse-104': '/district/il-hd-104',
    'il-statehouse-112': '/district/il-hd-112',
    'il-statehouse-65': '/district/il-hd-65',
    'me-statehouse-132': '/district/me-hd-132',
    'me-statehouse-1': '/district/me-hd-1',
    'me-statehouse-2': '/district/me-hd-2',
    'me-statehouse-3': '/district/me-hd-3',
    'me-statehouse-4': '/district/me-hd-4',
    'me-statehouse-5': '/district/me-hd-5',
    'me-statehouse-6': '/district/me-hd-6',
    'me-statehouse-7': '/district/me-hd-7',
    'me-statehouse-8': '/district/me-hd-8',
    'me-statehouse-9': '/district/me-hd-9',
    'me-statehouse-10': '/district/me-hd-10',
    'me-statehouse-11': '/district/me-hd-11',
    'me-statehouse-12': '/district/me-hd-12',
    'me-statehouse-13': '/district/me-hd-13',
    'me-statehouse-14': '/district/me-hd-14',
    'me-statehouse-15': '/district/me-hd-15',
    'me-statehouse-16': '/district/me-hd-16',
    'me-statehouse-17': '/district/me-hd-17',
    'me-statehouse-18': '/district/me-hd-18',
    'me-statehouse-19': '/district/me-hd-19',
    'me-statehouse-20': '/district/me-hd-20',
    'me-statehouse-21': '/district/me-hd-21',
    'me-statehouse-22': '/district/me-hd-22',
    'me-statehouse-23': '/district/me-hd-23',
    'me-statehouse-24': '/district/me-hd-24',
    'me-statehouse-25': '/district/me-hd-25',
    'me-statehouse-26': '/district/me-hd-26',
    'me-statehouse-27': '/district/me-hd-27',
    'me-statehouse-28': '/district/me-hd-28',
    'me-statehouse-29': '/district/me-hd-29',
    'me-statehouse-30': '/district/me-hd-30',
    'me-statehouse-31': '/district/me-hd-31',
    'me-statehouse-32': '/district/me-hd-32',
    'me-statehouse-33': '/district/me-hd-33',
    'me-statehouse-34': '/district/me-hd-34',
    'me-statehouse-35': '/district/me-hd-35',
    'me-statehouse-36': '/district/me-hd-36',
    'me-statehouse-37': '/district/me-hd-37',
    'me-statehouse-38': '/district/me-hd-38',
    'me-statehouse-39': '/district/me-hd-39',
    'me-statehouse-40': '/district/me-hd-40',
    'me-statehouse-41': '/district/me-hd-41',
    'me-statehouse-42': '/district/me-hd-42',
    'me-statehouse-43': '/district/me-hd-43',
    'me-statehouse-44': '/district/me-hd-44',
    'me-statehouse-45': '/district/me-hd-45',
    'me-statehouse-46': '/district/me-hd-46',
    'me-statehouse-47': '/district/me-hd-47',
    'me-statehouse-48': '/district/me-hd-48',
    'me-statehouse-49': '/district/me-hd-49',
    'me-statehouse-50': '/district/me-hd-50',
    'me-statehouse-51': '/district/me-hd-51',
    'me-statehouse-52': '/district/me-hd-52',
    'me-statehouse-53': '/district/me-hd-53',
    'me-statehouse-54': '/district/me-hd-54',
    'me-statehouse-55': '/district/me-hd-55',
    'me-statehouse-56': '/district/me-hd-56',
    'me-statehouse-57': '/district/me-hd-57',
    'me-statehouse-58': '/district/me-hd-58',
    'me-statehouse-59': '/district/me-hd-59',
    'me-statehouse-60': '/district/me-hd-60',
    'me-statehouse-61': '/district/me-hd-61',
    'me-statehouse-62': '/district/me-hd-62',
    'me-statehouse-63': '/district/me-hd-63',
    'me-statehouse-64': '/district/me-hd-64',
    'me-statehouse-65': '/district/me-hd-65',
    'me-statehouse-66': '/district/me-hd-66',
    'me-statehouse-67': '/district/me-hd-67',
    'me-statehouse-68': '/district/me-hd-68',
    'me-statehouse-69': '/district/me-hd-69',
    'me-statehouse-70': '/district/me-hd-70',
    'me-statehouse-71': '/district/me-hd-71',
    'me-statehouse-72': '/district/me-hd-72',
    'me-statehouse-73': '/district/me-hd-73',
    'me-statehouse-74': '/district/me-hd-74',
    'me-statehouse-75': '/district/me-hd-75',
    'me-statehouse-76': '/district/me-hd-76',
    'me-statehouse-77': '/district/me-hd-77',
    'me-statehouse-78': '/district/me-hd-78',
    'me-statehouse-79': '/district/me-hd-79',
    'me-statehouse-80': '/district/me-hd-80',
    'me-statehouse-81': '/district/me-hd-81',
    'me-statehouse-82': '/district/me-hd-82',
    'me-statehouse-83': '/district/me-hd-83',
    'me-statehouse-84': '/district/me-hd-84',
    'me-statehouse-85': '/district/me-hd-85',
    'me-statehouse-86': '/district/me-hd-86',
    'me-statehouse-87': '/district/me-hd-87',
    'me-statehouse-88': '/district/me-hd-88',
    'me-statehouse-89': '/district/me-hd-89',
    'me-statehouse-90': '/district/me-hd-90',
    'me-statehouse-91': '/district/me-hd-91',
    'me-statehouse-92': '/district/me-hd-92',
    'me-statehouse-93': '/district/me-hd-93',
    'me-statehouse-94': '/district/me-hd-94',
    'me-statehouse-95': '/district/me-hd-95',
    'me-statehouse-96': '/district/me-hd-96',
    'me-statehouse-97': '/district/me-hd-97',
    'me-statehouse-98': '/district/me-hd-98',
    'me-statehouse-99': '/district/me-hd-99',
    'me-statehouse-100': '/district/me-hd-100',
    'me-statehouse-101': '/district/me-hd-101',
    'me-statehouse-102': '/district/me-hd-102',
    'me-statehouse-103': '/district/me-hd-103',
    'me-statehouse-104': '/district/me-hd-104',
    'me-statehouse-105': '/district/me-hd-105',
    'me-statehouse-106': '/district/me-hd-106',
    'me-statehouse-107': '/district/me-hd-107',
    'me-statehouse-108': '/district/me-hd-108',
    'me-statehouse-109': '/district/me-hd-109',
    'me-statehouse-110': '/district/me-hd-110',
    'me-statehouse-111': '/district/me-hd-111',
    'me-statehouse-112': '/district/me-hd-112',
    'me-statehouse-113': '/district/me-hd-113',
    'me-statehouse-114': '/district/me-hd-114',
    'me-statehouse-115': '/district/me-hd-115',
    'me-statehouse-116': '/district/me-hd-116',
    'me-statehouse-117': '/district/me-hd-117',
    'me-statehouse-118': '/district/me-hd-118',
    'me-statehouse-119': '/district/me-hd-119',
    'me-statehouse-120': '/district/me-hd-120',
    'me-statehouse-121': '/district/me-hd-121',
    'me-statehouse-122': '/district/me-hd-122',
    'me-statehouse-123': '/district/me-hd-123',
    'me-statehouse-124': '/district/me-hd-124',
    'me-statehouse-125': '/district/me-hd-125',
    'me-statehouse-126': '/district/me-hd-126',
    'me-statehouse-127': '/district/me-hd-127',
    'me-statehouse-128': '/district/me-hd-128',
    'me-statehouse-129': '/district/me-hd-129',
    'me-statehouse-130': '/district/me-hd-130',
    'me-statehouse-131': '/district/me-hd-131',
    'me-statehouse-133': '/district/me-hd-133',
    'me-statehouse-134': '/district/me-hd-134',
    'me-statehouse-135': '/district/me-hd-135',
    'me-statehouse-136': '/district/me-hd-136',
    'me-statehouse-137': '/district/me-hd-137',
    'me-statehouse-138': '/district/me-hd-138',
    'me-statehouse-139': '/district/me-hd-139',
    'me-statehouse-140': '/district/me-hd-140',
    'me-statehouse-141': '/district/me-hd-141',
    'me-statehouse-142': '/district/me-hd-142',
    'me-statehouse-143': '/district/me-hd-143',
    'me-statehouse-144': '/district/me-hd-144',
    'me-statehouse-145': '/district/me-hd-145',
    'me-statehouse-146': '/district/me-hd-146',
    'me-statehouse-147': '/district/me-hd-147',
    'me-statehouse-148': '/district/me-hd-148',
    'me-statehouse-149': '/district/me-hd-149',
    'me-statehouse-150': '/district/me-hd-150',
    'me-statehouse-151': '/district/me-hd-151',
    'me-statesenate-1': '/district/me-sd-1',
    'me-statesenate-2': '/district/me-sd-2',
    'me-statesenate-3': '/district/me-sd-3',
    'me-statesenate-4': '/district/me-sd-4',
    'me-statesenate-5': '/district/me-sd-5',
    'me-statesenate-6': '/district/me-sd-6',
    'me-statesenate-7': '/district/me-sd-7',
    'me-statesenate-8': '/district/me-sd-8',
    'me-statesenate-9': '/district/me-sd-9',
    'me-statesenate-10': '/district/me-sd-10',
    'me-statesenate-11': '/district/me-sd-11',
    'me-statesenate-12': '/district/me-sd-12',
    'me-statesenate-13': '/district/me-sd-13',
    'me-statesenate-14': '/district/me-sd-14',
    'me-statesenate-15': '/district/me-sd-15',
    'me-statesenate-16': '/district/me-sd-16',
    'me-statesenate-17': '/district/me-sd-17',
    'me-statesenate-19': '/district/me-sd-19',
    'me-statesenate-20': '/district/me-sd-20',
    'me-statesenate-21': '/district/me-sd-21',
    'me-statesenate-22': '/district/me-sd-22',
    'me-statesenate-23': '/district/me-sd-23',
    'me-statesenate-24': '/district/me-sd-24',
    'me-statesenate-25': '/district/me-sd-25',
    'me-statesenate-26': '/district/me-sd-26',
    'me-statesenate-27': '/district/me-sd-27',
    'me-statesenate-28': '/district/me-sd-28',
    'me-statesenate-29': '/district/me-sd-29',
    'me-statesenate-30': '/district/me-sd-30',
    'me-statesenate-31': '/district/me-sd-31',
    'me-statesenate-32': '/district/me-sd-32',
    'me-statesenate-33': '/district/me-sd-33',
    'me-statesenate-34': '/district/me-sd-34',
    'me-statesenate-35': '/district/me-sd-35',
    'me-statesenate-18': '/district/me-sd-18',
    'mi-statehouse-24': '/district/mi-hd-24',
    'mi-statesenate-29': '/district/mi-sd-29',
    'mi-statehouse-42': '/district/mi-hd-42',
    'mi-statesenate-20': '/district/mi-sd-20',
    'mi-statesenate-7': '/district/mi-sd-7',
    'mi-statesenate-8': '/district/mi-sd-8',
    'mi-statesenate-18': '/district/mi-sd-18',
    'mi-statesenate-21': '/district/mi-sd-21',
    'mi-statesenate-13': '/district/mi-sd-13',
    'mi-statesenate-16': '/district/mi-sd-16',
    'mi-statesenate-32': '/district/mi-sd-32',
    'mi-statesenate-4': '/district/mi-sd-4',
    'mi-statesenate-6': '/district/mi-sd-6',
    'mi-statesenate-3': '/district/mi-sd-3',
    'mi-statesenate-27': '/district/mi-sd-27',
    'mi-statesenate-26': '/district/mi-sd-26',
    'mi-statesenate-37': '/district/mi-sd-37',
    'mi-statesenate-1': '/district/mi-sd-1',
    'mi-statesenate-35': '/district/mi-sd-35',
    'mi-statesenate-34': '/district/mi-sd-34',
    'mi-statesenate-12': '/district/mi-sd-12',
    'mi-statesenate-36': '/district/mi-sd-36',
    'mi-statesenate-30': '/district/mi-sd-30',
    'mi-statesenate-15': '/district/mi-sd-15',
    'mi-statesenate-24': '/district/mi-sd-24',
    'mi-statesenate-11': '/district/mi-sd-11',
    'mi-statesenate-25': '/district/mi-sd-25',
    'mi-statesenate-17': '/district/mi-sd-17',
    'mi-statesenate-38': '/district/mi-sd-38',
    'mi-statesenate-33': '/district/mi-sd-33',
    'mi-statesenate-5': '/district/mi-sd-5',
    'mi-statesenate-23': '/district/mi-sd-23',
    'mi-statesenate-2': '/district/mi-sd-2',
    'mi-statesenate-14': '/district/mi-sd-14',
    'mi-statesenate-28': '/district/mi-sd-28',
    'mi-statesenate-22': '/district/mi-sd-22',
    'mi-statesenate-31': '/district/mi-sd-31',
    'mi-statesenate-9': '/district/mi-sd-9',
    'mi-statesenate-10': '/district/mi-sd-10',
    'mi-statehouse-98': '/district/mi-hd-98',
    'mi-statehouse-60': '/district/mi-hd-60',
    'mi-statehouse-71': '/district/mi-hd-71',
    'mi-statehouse-96': '/district/mi-hd-96',
    'mi-statehouse-97': '/district/mi-hd-97',
    'mi-statehouse-109': '/district/mi-hd-109',
    'mi-statehouse-49': '/district/mi-hd-49',
    'mi-statehouse-105': '/district/mi-hd-105',
    'mi-statehouse-30': '/district/mi-hd-30',
    'mi-statehouse-36': '/district/mi-hd-36',
    'mi-statehouse-106': '/district/mi-hd-106',
    'mi-statehouse-86': '/district/mi-hd-86',
    'mi-statehouse-29': '/district/mi-hd-29',
    'mi-statehouse-107': '/district/mi-hd-107',
    'mi-statehouse-101': '/district/mi-hd-101',
    'mi-statehouse-44': '/district/mi-hd-44',
    'mi-statehouse-67': '/district/mi-hd-67',
    'mi-statehouse-65': '/district/mi-hd-65',
    'mi-statehouse-52': '/district/mi-hd-52',
    'mi-statehouse-99': '/district/mi-hd-99',
    'mi-statehouse-34': '/district/mi-hd-34',
    'mi-statehouse-78': '/district/mi-hd-78',
    'mi-statehouse-93': '/district/mi-hd-93',
    'mi-statehouse-57': '/district/mi-hd-57',
    'mi-statehouse-100': '/district/mi-hd-100',
    'mi-statehouse-45': '/district/mi-hd-45',
    'mi-statehouse-27': '/district/mi-hd-27',
    'mi-statehouse-51': '/district/mi-hd-51',
    'mi-statehouse-110': '/district/mi-hd-110',
    'mi-statehouse-68': '/district/mi-hd-68',
    'mi-statehouse-89': '/district/mi-hd-89',
    'mi-statehouse-72': '/district/mi-hd-72',
    'mi-statehouse-92': '/district/mi-hd-92',
    'mi-statehouse-91': '/district/mi-hd-91',
    'mi-statehouse-37': '/district/mi-hd-37',
    'mi-statehouse-64': '/district/mi-hd-64',
    'mi-statehouse-90': '/district/mi-hd-90',
    'mi-statehouse-108': '/district/mi-hd-108',
    'mi-statehouse-79': '/district/mi-hd-79',
    'mi-statehouse-58': '/district/mi-hd-58',
    'mi-statehouse-104': '/district/mi-hd-104',
    'mi-statehouse-46': '/district/mi-hd-46',
    'mi-statehouse-66': '/district/mi-hd-66',
    'mi-statehouse-95': '/district/mi-hd-95',
    'mi-statehouse-85': '/district/mi-hd-85',
    'mi-statehouse-43': '/district/mi-hd-43',
    'mi-statehouse-62': '/district/mi-hd-62',
    'mi-statehouse-54': '/district/mi-hd-54',
    'mi-statehouse-28': '/district/mi-hd-28',
    'mi-statehouse-55': '/district/mi-hd-55',
    'mi-statehouse-102': '/district/mi-hd-102',
    'mi-statehouse-88': '/district/mi-hd-88',
    'mi-statehouse-39': '/district/mi-hd-39',
    'mi-statehouse-50': '/district/mi-hd-50',
    'mi-statehouse-35': '/district/mi-hd-35',
    'mi-statehouse-59': '/district/mi-hd-59',
    'mi-statehouse-38': '/district/mi-hd-38',
    'mi-statehouse-20': '/district/mi-hd-20',
    'mi-statehouse-21': '/district/mi-hd-21',
    'mi-statehouse-73': '/district/mi-hd-73',
    'mi-statehouse-15': '/district/mi-hd-15',
    'mi-statehouse-53': '/district/mi-hd-53',
    'mi-statehouse-1': '/district/mi-hd-1',
    'mi-statehouse-103': '/district/mi-hd-103',
    'mi-statehouse-48': '/district/mi-hd-48',
    'mi-statehouse-77': '/district/mi-hd-77',
    'mi-statehouse-12': '/district/mi-hd-12',
    'mi-statehouse-3': '/district/mi-hd-3',
    'mi-statehouse-83': '/district/mi-hd-83',
    'mi-statehouse-33': '/district/mi-hd-33',
    'mi-statehouse-84': '/district/mi-hd-84',
    'mi-statehouse-82': '/district/mi-hd-82',
    'mi-statehouse-25': '/district/mi-hd-25',
    'mi-statehouse-74': '/district/mi-hd-74',
    'mi-statehouse-18': '/district/mi-hd-18',
    'mi-statehouse-22': '/district/mi-hd-22',
    'mi-statehouse-2': '/district/mi-hd-2',
    'mi-statehouse-40': '/district/mi-hd-40',
    'mi-statehouse-56': '/district/mi-hd-56',
    'mi-statehouse-69': '/district/mi-hd-69',
    'mi-statehouse-14': '/district/mi-hd-14',
    'mi-statehouse-61': '/district/mi-hd-61',
    'mi-statehouse-31': '/district/mi-hd-31',
    'mi-statehouse-23': '/district/mi-hd-23',
    'mi-statehouse-7': '/district/mi-hd-7',
    'mi-statehouse-70': '/district/mi-hd-70',
    'mi-statehouse-94': '/district/mi-hd-94',
    'mi-statehouse-10': '/district/mi-hd-10',
    'mi-statehouse-17': '/district/mi-hd-17',
    'mi-statehouse-6': '/district/mi-hd-6',
    'mi-statehouse-47': '/district/mi-hd-47',
    'mi-statehouse-41': '/district/mi-hd-41',
    'mi-statehouse-8': '/district/mi-hd-8',
    'mi-statehouse-80': '/district/mi-hd-80',
    'mi-statehouse-87': '/district/mi-hd-87',
    'mi-statehouse-19': '/district/mi-hd-19',
    'mi-statehouse-9': '/district/mi-hd-9',
    'mi-statehouse-75': '/district/mi-hd-75',
    'mi-statehouse-26': '/district/mi-hd-26',
    'mi-statehouse-5': '/district/mi-hd-5',
    'mi-statehouse-32': '/district/mi-hd-32',
    'mi-statehouse-76': '/district/mi-hd-76',
    'mi-statehouse-81': '/district/mi-hd-81',
    'mi-statehouse-13': '/district/mi-hd-13',
    'mi-statehouse-16': '/district/mi-hd-16',
    'mi-statehouse-4': '/district/mi-hd-4',
    'mi-statehouse-63': '/district/mi-hd-63',
    'mi-statesenate-19': '/district/mi-sd-19',
    'mi-statehouse-11': '/district/mi-hd-11',
    'mn-statesenate-64': '/district/mn-sd-64',
    'mn-statehouse-25': '/district/mn-hd-25',
    'mn-statesenate-59': '/district/mn-sd-59',
    'mn-statesenate-1': '/district/mn-sd-1',
    'mn-statesenate-3': '/district/mn-sd-3',
    'mn-statesenate-4': '/district/mn-sd-4',
    'mn-statesenate-14': '/district/mn-sd-14',
    'mn-statesenate-32': '/district/mn-sd-32',
    'mn-statesenate-33': '/district/mn-sd-33',
    'mn-statesenate-35': '/district/mn-sd-35',
    'mn-statesenate-41': '/district/mn-sd-41',
    'mn-statesenate-48': '/district/mn-sd-48',
    'mn-statehouse-6': '/district/mn-hd-6',
    'mn-statehouse-27': '/district/mn-hd-27',
    'mn-statehouse-35': '/district/mn-hd-35',
    'mn-statehouse-63': '/district/mn-hd-63',
    'mn-statehouse-64': '/district/mn-hd-64',
    'mn-statehouse-67': '/district/mn-hd-67',
    'mn-statehouse-69': '/district/mn-hd-69',
    'mn-statehouse-70': '/district/mn-hd-70',
    'mn-statehouse-81': '/district/mn-hd-81',
    'mn-statehouse-82': '/district/mn-hd-82',
    'mn-statehouse-89': '/district/mn-hd-89',
    'mn-statehouse-96': '/district/mn-hd-96',
    'mn-statehouse-107': '/district/mn-hd-107',
    'mn-statehouse-1': '/district/mn-hd-1',
    'mn-statehouse-2': '/district/mn-hd-2',
    'mn-statehouse-3': '/district/mn-hd-3',
    'mn-statehouse-4': '/district/mn-hd-4',
    'mn-statehouse-5': '/district/mn-hd-5',
    'mn-statehouse-7': '/district/mn-hd-7',
    'mn-statehouse-8': '/district/mn-hd-8',
    'mn-statehouse-9': '/district/mn-hd-9',
    'mn-statehouse-10': '/district/mn-hd-10',
    'mn-statehouse-11': '/district/mn-hd-11',
    'mn-statehouse-12': '/district/mn-hd-12',
    'mn-statehouse-13': '/district/mn-hd-13',
    'mn-statehouse-14': '/district/mn-hd-14',
    'mn-statehouse-15': '/district/mn-hd-15',
    'mn-statehouse-16': '/district/mn-hd-16',
    'mn-statehouse-17': '/district/mn-hd-17',
    'mn-statehouse-18': '/district/mn-hd-18',
    'mn-statehouse-19': '/district/mn-hd-19',
    'mn-statehouse-20': '/district/mn-hd-20',
    'mn-statehouse-21': '/district/mn-hd-21',
    'mn-statehouse-22': '/district/mn-hd-22',
    'mn-statehouse-23': '/district/mn-hd-23',
    'mn-statehouse-24': '/district/mn-hd-24',
    'mn-statehouse-26': '/district/mn-hd-26',
    'mn-statehouse-28': '/district/mn-hd-28',
    'mn-statehouse-29': '/district/mn-hd-29',
    'mn-statehouse-30': '/district/mn-hd-30',
    'mn-statehouse-31': '/district/mn-hd-31',
    'mn-statehouse-32': '/district/mn-hd-32',
    'mn-statehouse-33': '/district/mn-hd-33',
    'mn-statehouse-34': '/district/mn-hd-34',
    'mn-statehouse-36': '/district/mn-hd-36',
    'mn-statehouse-37': '/district/mn-hd-37',
    'mn-statehouse-38': '/district/mn-hd-38',
    'mn-statehouse-39': '/district/mn-hd-39',
    'mn-statehouse-40': '/district/mn-hd-40',
    'mn-statehouse-41': '/district/mn-hd-41',
    'mn-statehouse-42': '/district/mn-hd-42',
    'mn-statehouse-43': '/district/mn-hd-43',
    'mn-statehouse-44': '/district/mn-hd-44',
    'mn-statehouse-45': '/district/mn-hd-45',
    'mn-statehouse-46': '/district/mn-hd-46',
    'mn-statehouse-47': '/district/mn-hd-47',
    'mn-statehouse-48': '/district/mn-hd-48',
    'mn-statehouse-49': '/district/mn-hd-49',
    'mn-statehouse-50': '/district/mn-hd-50',
    'mn-statehouse-51': '/district/mn-hd-51',
    'mn-statehouse-52': '/district/mn-hd-52',
    'mn-statehouse-53': '/district/mn-hd-53',
    'mn-statehouse-54': '/district/mn-hd-54',
    'mn-statehouse-55': '/district/mn-hd-55',
    'mn-statehouse-56': '/district/mn-hd-56',
    'mn-statehouse-57': '/district/mn-hd-57',
    'mn-statehouse-58': '/district/mn-hd-58',
    'mn-statehouse-59': '/district/mn-hd-59',
    'mn-statehouse-60': '/district/mn-hd-60',
    'mn-statehouse-61': '/district/mn-hd-61',
    'mn-statehouse-62': '/district/mn-hd-62',
    'mn-statehouse-65': '/district/mn-hd-65',
    'mn-statehouse-66': '/district/mn-hd-66',
    'mn-statehouse-68': '/district/mn-hd-68',
    'mn-statehouse-71': '/district/mn-hd-71',
    'mn-statehouse-72': '/district/mn-hd-72',
    'mn-statehouse-73': '/district/mn-hd-73',
    'mn-statehouse-74': '/district/mn-hd-74',
    'mn-statehouse-75': '/district/mn-hd-75',
    'mn-statehouse-76': '/district/mn-hd-76',
    'mn-statehouse-77': '/district/mn-hd-77',
    'mn-statehouse-78': '/district/mn-hd-78',
    'mn-statehouse-79': '/district/mn-hd-79',
    'mn-statehouse-80': '/district/mn-hd-80',
    'mn-statehouse-83': '/district/mn-hd-83',
    'mn-statehouse-84': '/district/mn-hd-84',
    'mn-statehouse-85': '/district/mn-hd-85',
    'mn-statehouse-86': '/district/mn-hd-86',
    'mn-statehouse-87': '/district/mn-hd-87',
    'mn-statehouse-88': '/district/mn-hd-88',
    'mn-statehouse-90': '/district/mn-hd-90',
    'mn-statehouse-91': '/district/mn-hd-91',
    'mn-statehouse-92': '/district/mn-hd-92',
    'mn-statehouse-93': '/district/mn-hd-93',
    'mn-statehouse-94': '/district/mn-hd-94',
    'mn-statehouse-95': '/district/mn-hd-95',
    'mn-statehouse-97': '/district/mn-hd-97',
    'mn-statehouse-98': '/district/mn-hd-98',
    'mn-statehouse-99': '/district/mn-hd-99',
    'mn-statehouse-100': '/district/mn-hd-100',
    'mn-statehouse-101': '/district/mn-hd-101',
    'mn-statehouse-102': '/district/mn-hd-102',
    'mn-statehouse-103': '/district/mn-hd-103',
    'mn-statehouse-104': '/district/mn-hd-104',
    'mn-statehouse-105': '/district/mn-hd-105',
    'mn-statehouse-106': '/district/mn-hd-106',
    'mn-statehouse-108': '/district/mn-hd-108',
    'mn-statehouse-109': '/district/mn-hd-109',
    'mn-statehouse-110': '/district/mn-hd-110',
    'mn-statehouse-111': '/district/mn-hd-111',
    'mn-statehouse-112': '/district/mn-hd-112',
    'mn-statehouse-113': '/district/mn-hd-113',
    'mn-statehouse-114': '/district/mn-hd-114',
    'mn-statehouse-115': '/district/mn-hd-115',
    'mn-statehouse-116': '/district/mn-hd-116',
    'mn-statehouse-117': '/district/mn-hd-117',
    'mn-statehouse-118': '/district/mn-hd-118',
    'mn-statehouse-119': '/district/mn-hd-119',
    'mn-statehouse-120': '/district/mn-hd-120',
    'mn-statehouse-121': '/district/mn-hd-121',
    'mn-statehouse-122': '/district/mn-hd-122',
    'mn-statehouse-123': '/district/mn-hd-123',
    'mn-statehouse-124': '/district/mn-hd-124',
    'mn-statehouse-125': '/district/mn-hd-125',
    'mn-statehouse-126': '/district/mn-hd-126',
    'mn-statehouse-127': '/district/mn-hd-127',
    'mn-statehouse-128': '/district/mn-hd-128',
    'mn-statehouse-129': '/district/mn-hd-129',
    'mn-statehouse-130': '/district/mn-hd-130',
    'mn-statehouse-131': '/district/mn-hd-131',
    'mn-statehouse-132': '/district/mn-hd-132',
    'mn-statehouse-133': '/district/mn-hd-133',
    'mn-statehouse-134': '/district/mn-hd-134',
    'mn-statesenate-2': '/district/mn-sd-2',
    'mn-statesenate-5': '/district/mn-sd-5',
    'mn-statesenate-6': '/district/mn-sd-6',
    'mn-statesenate-7': '/district/mn-sd-7',
    'mn-statesenate-8': '/district/mn-sd-8',
    'mn-statesenate-9': '/district/mn-sd-9',
    'mn-statesenate-10': '/district/mn-sd-10',
    'mn-statesenate-11': '/district/mn-sd-11',
    'mn-statesenate-12': '/district/mn-sd-12',
    'mn-statesenate-13': '/district/mn-sd-13',
    'mn-statesenate-15': '/district/mn-sd-15',
    'mn-statesenate-16': '/district/mn-sd-16',
    'mn-statesenate-17': '/district/mn-sd-17',
    'mn-statesenate-18': '/district/mn-sd-18',
    'mn-statesenate-19': '/district/mn-sd-19',
    'mn-statesenate-20': '/district/mn-sd-20',
    'mn-statesenate-21': '/district/mn-sd-21',
    'mn-statesenate-22': '/district/mn-sd-22',
    'mn-statesenate-23': '/district/mn-sd-23',
    'mn-statesenate-24': '/district/mn-sd-24',
    'mn-statesenate-25': '/district/mn-sd-25',
    'mn-statesenate-26': '/district/mn-sd-26',
    'mn-statesenate-27': '/district/mn-sd-27',
    'mn-statesenate-28': '/district/mn-sd-28',
    'mn-statesenate-29': '/district/mn-sd-29',
    'mn-statesenate-30': '/district/mn-sd-30',
    'mn-statesenate-31': '/district/mn-sd-31',
    'mn-statesenate-34': '/district/mn-sd-34',
    'mn-statesenate-36': '/district/mn-sd-36',
    'mn-statesenate-37': '/district/mn-sd-37',
    'mn-statesenate-38': '/district/mn-sd-38',
    'mn-statesenate-39': '/district/mn-sd-39',
    'mn-statesenate-40': '/district/mn-sd-40',
    'mn-statesenate-42': '/district/mn-sd-42',
    'mn-statesenate-43': '/district/mn-sd-43',
    'mn-statesenate-44': '/district/mn-sd-44',
    'mn-statesenate-45': '/district/mn-sd-45',
    'mn-statesenate-46': '/district/mn-sd-46',
    'mn-statesenate-47': '/district/mn-sd-47',
    'mn-statesenate-49': '/district/mn-sd-49',
    'mn-statesenate-50': '/district/mn-sd-50',
    'mn-statesenate-51': '/district/mn-sd-51',
    'mn-statesenate-52': '/district/mn-sd-52',
    'mn-statesenate-53': '/district/mn-sd-53',
    'mn-statesenate-55': '/district/mn-sd-55',
    'mn-statesenate-56': '/district/mn-sd-56',
    'mn-statesenate-57': '/district/mn-sd-57',
    'mn-statesenate-58': '/district/mn-sd-58',
    'mn-statesenate-60': '/district/mn-sd-60',
    'mn-statesenate-61': '/district/mn-sd-61',
    'mn-statesenate-62': '/district/mn-sd-62',
    'mn-statesenate-63': '/district/mn-sd-63',
    'mn-statesenate-65': '/district/mn-sd-65',
    'mn-statesenate-66': '/district/mn-sd-66',
    'mn-statesenate-67': '/district/mn-sd-67',
    'mn-statesenate-54': '/district/mn-sd-54',
    'ms-statehouse-1': '/district/ms-hd-1',
    'ms-statehouse-2': '/district/ms-hd-2',
    'ms-statehouse-3': '/district/ms-hd-3',
    'ms-statehouse-4': '/district/ms-hd-4',
    'ms-statehouse-5': '/district/ms-hd-5',
    'ms-statehouse-6': '/district/ms-hd-6',
    'ms-statehouse-7': '/district/ms-hd-7',
    'ms-statehouse-8': '/district/ms-hd-8',
    'ms-statehouse-9': '/district/ms-hd-9',
    'ms-statehouse-10': '/district/ms-hd-10',
    'ms-statehouse-11': '/district/ms-hd-11',
    'ms-statehouse-12': '/district/ms-hd-12',
    'ms-statehouse-13': '/district/ms-hd-13',
    'ms-statehouse-14': '/district/ms-hd-14',
    'ms-statehouse-15': '/district/ms-hd-15',
    'ms-statehouse-16': '/district/ms-hd-16',
    'ms-statehouse-17': '/district/ms-hd-17',
    'ms-statehouse-18': '/district/ms-hd-18',
    'ms-statehouse-19': '/district/ms-hd-19',
    'ms-statehouse-20': '/district/ms-hd-20',
    'ms-statehouse-21': '/district/ms-hd-21',
    'ms-statehouse-22': '/district/ms-hd-22',
    'ms-statehouse-23': '/district/ms-hd-23',
    'ms-statehouse-24': '/district/ms-hd-24',
    'ms-statehouse-25': '/district/ms-hd-25',
    'ms-statehouse-26': '/district/ms-hd-26',
    'ms-statehouse-27': '/district/ms-hd-27',
    'ms-statehouse-28': '/district/ms-hd-28',
    'ms-statehouse-29': '/district/ms-hd-29',
    'ms-statehouse-30': '/district/ms-hd-30',
    'ms-statehouse-31': '/district/ms-hd-31',
    'ms-statehouse-32': '/district/ms-hd-32',
    'ms-statehouse-33': '/district/ms-hd-33',
    'ms-statehouse-34': '/district/ms-hd-34',
    'ms-statehouse-35': '/district/ms-hd-35',
    'ms-statehouse-36': '/district/ms-hd-36',
    'ms-statehouse-37': '/district/ms-hd-37',
    'ms-statehouse-38': '/district/ms-hd-38',
    'ms-statehouse-39': '/district/ms-hd-39',
    'ms-statehouse-40': '/district/ms-hd-40',
    'ms-statehouse-41': '/district/ms-hd-41',
    'ms-statehouse-42': '/district/ms-hd-42',
    'ms-statehouse-43': '/district/ms-hd-43',
    'ms-statehouse-44': '/district/ms-hd-44',
    'ms-statehouse-45': '/district/ms-hd-45',
    'ms-statehouse-46': '/district/ms-hd-46',
    'ms-statehouse-47': '/district/ms-hd-47',
    'ms-statehouse-48': '/district/ms-hd-48',
    'ms-statehouse-49': '/district/ms-hd-49',
    'ms-statehouse-50': '/district/ms-hd-50',
    'ms-statehouse-51': '/district/ms-hd-51',
    'ms-statehouse-52': '/district/ms-hd-52',
    'ms-statehouse-53': '/district/ms-hd-53',
    'ms-statehouse-54': '/district/ms-hd-54',
    'ms-statehouse-55': '/district/ms-hd-55',
    'ms-statehouse-56': '/district/ms-hd-56',
    'ms-statehouse-57': '/district/ms-hd-57',
    'ms-statehouse-58': '/district/ms-hd-58',
    'ms-statehouse-59': '/district/ms-hd-59',
    'ms-statehouse-60': '/district/ms-hd-60',
    'ms-statehouse-61': '/district/ms-hd-61',
    'ms-statehouse-62': '/district/ms-hd-62',
    'ms-statehouse-63': '/district/ms-hd-63',
    'ms-statehouse-64': '/district/ms-hd-64',
    'ms-statehouse-65': '/district/ms-hd-65',
    'ms-statehouse-66': '/district/ms-hd-66',
    'ms-statehouse-67': '/district/ms-hd-67',
    'ms-statehouse-68': '/district/ms-hd-68',
    'ms-statehouse-69': '/district/ms-hd-69',
    'ms-statehouse-71': '/district/ms-hd-71',
    'ms-statehouse-72': '/district/ms-hd-72',
    'ms-statehouse-73': '/district/ms-hd-73',
    'ms-statehouse-74': '/district/ms-hd-74',
    'ms-statehouse-75': '/district/ms-hd-75',
    'ms-statehouse-76': '/district/ms-hd-76',
    'ms-statehouse-78': '/district/ms-hd-78',
    'ms-statehouse-79': '/district/ms-hd-79',
    'ms-statehouse-80': '/district/ms-hd-80',
    'ms-statehouse-81': '/district/ms-hd-81',
    'ms-statehouse-82': '/district/ms-hd-82',
    'ms-statehouse-83': '/district/ms-hd-83',
    'ms-statehouse-84': '/district/ms-hd-84',
    'ms-statehouse-85': '/district/ms-hd-85',
    'ms-statehouse-86': '/district/ms-hd-86',
    'ms-statehouse-87': '/district/ms-hd-87',
    'ms-statehouse-88': '/district/ms-hd-88',
    'ms-statehouse-89': '/district/ms-hd-89',
    'ms-statehouse-90': '/district/ms-hd-90',
    'ms-statehouse-91': '/district/ms-hd-91',
    'ms-statehouse-92': '/district/ms-hd-92',
    'ms-statehouse-93': '/district/ms-hd-93',
    'ms-statehouse-94': '/district/ms-hd-94',
    'ms-statehouse-95': '/district/ms-hd-95',
    'ms-statehouse-96': '/district/ms-hd-96',
    'ms-statehouse-97': '/district/ms-hd-97',
    'ms-statehouse-98': '/district/ms-hd-98',
    'ms-statehouse-99': '/district/ms-hd-99',
    'ms-statehouse-100': '/district/ms-hd-100',
    'ms-statehouse-101': '/district/ms-hd-101',
    'ms-statehouse-102': '/district/ms-hd-102',
    'ms-statehouse-103': '/district/ms-hd-103',
    'ms-statehouse-104': '/district/ms-hd-104',
    'ms-statehouse-105': '/district/ms-hd-105',
    'ms-statehouse-106': '/district/ms-hd-106',
    'ms-statehouse-107': '/district/ms-hd-107',
    'ms-statehouse-108': '/district/ms-hd-108',
    'ms-statehouse-109': '/district/ms-hd-109',
    'ms-statehouse-110': '/district/ms-hd-110',
    'ms-statehouse-111': '/district/ms-hd-111',
    'ms-statehouse-112': '/district/ms-hd-112',
    'ms-statehouse-113': '/district/ms-hd-113',
    'ms-statehouse-114': '/district/ms-hd-114',
    'ms-statehouse-115': '/district/ms-hd-115',
    'ms-statehouse-116': '/district/ms-hd-116',
    'ms-statehouse-117': '/district/ms-hd-117',
    'ms-statehouse-118': '/district/ms-hd-118',
    'ms-statehouse-120': '/district/ms-hd-120',
    'ms-statehouse-121': '/district/ms-hd-121',
    'ms-statehouse-122': '/district/ms-hd-122',
    'ms-statesenate-1': '/district/ms-sd-1',
    'ms-statesenate-2': '/district/ms-sd-2',
    'ms-statesenate-3': '/district/ms-sd-3',
    'ms-statesenate-4': '/district/ms-sd-4',
    'ms-statesenate-5': '/district/ms-sd-5',
    'ms-statesenate-6': '/district/ms-sd-6',
    'ms-statesenate-7': '/district/ms-sd-7',
    'ms-statesenate-8': '/district/ms-sd-8',
    'ms-statesenate-9': '/district/ms-sd-9',
    'ms-statesenate-10': '/district/ms-sd-10',
    'ms-statesenate-11': '/district/ms-sd-11',
    'ms-statesenate-12': '/district/ms-sd-12',
    'ms-statesenate-13': '/district/ms-sd-13',
    'ms-statesenate-14': '/district/ms-sd-14',
    'ms-statesenate-15': '/district/ms-sd-15',
    'ms-statesenate-16': '/district/ms-sd-16',
    'ms-statesenate-17': '/district/ms-sd-17',
    'ms-statesenate-18': '/district/ms-sd-18',
    'ms-statesenate-19': '/district/ms-sd-19',
    'ms-statesenate-20': '/district/ms-sd-20',
    'ms-statesenate-21': '/district/ms-sd-21',
    'ms-statesenate-22': '/district/ms-sd-22',
    'ms-statesenate-23': '/district/ms-sd-23',
    'ms-statesenate-24': '/district/ms-sd-24',
    'ms-statesenate-25': '/district/ms-sd-25',
    'ms-statesenate-26': '/district/ms-sd-26',
    'ms-statesenate-27': '/district/ms-sd-27',
    'ms-statesenate-28': '/district/ms-sd-28',
    'ms-statesenate-29': '/district/ms-sd-29',
    'ms-statesenate-30': '/district/ms-sd-30',
    'ms-statesenate-31': '/district/ms-sd-31',
    'ms-statesenate-32': '/district/ms-sd-32',
    'ms-statesenate-33': '/district/ms-sd-33',
    'ms-statesenate-35': '/district/ms-sd-35',
    'ms-statesenate-36': '/district/ms-sd-36',
    'ms-statesenate-37': '/district/ms-sd-37',
    'ms-statesenate-38': '/district/ms-sd-38',
    'ms-statesenate-39': '/district/ms-sd-39',
    'ms-statesenate-40': '/district/ms-sd-40',
    'ms-statesenate-41': '/district/ms-sd-41',
    'ms-statesenate-42': '/district/ms-sd-42',
    'ms-statesenate-43': '/district/ms-sd-43',
    'ms-statesenate-44': '/district/ms-sd-44',
    'ms-statesenate-45': '/district/ms-sd-45',
    'ms-statesenate-46': '/district/ms-sd-46',
    'ms-statesenate-47': '/district/ms-sd-47',
    'ms-statesenate-48': '/district/ms-sd-48',
    'ms-statesenate-49': '/district/ms-sd-49',
    'ms-statesenate-50': '/district/ms-sd-50',
    'ms-statesenate-51': '/district/ms-sd-51',
    'ms-statesenate-52': '/district/ms-sd-52',
    'ms-statehouse-119': '/district/ms-hd-119',
    'mt-statehouse-1': '/district/mt-hd-1',
    'mt-statehouse-10': '/district/mt-hd-10',
    'mt-statehouse-100': '/district/mt-hd-100',
    'mt-statehouse-11': '/district/mt-hd-11',
    'mt-statehouse-12': '/district/mt-hd-12',
    'mt-statehouse-13': '/district/mt-hd-13',
    'mt-statehouse-14': '/district/mt-hd-14',
    'mt-statehouse-15': '/district/mt-hd-15',
    'mt-statehouse-16': '/district/mt-hd-16',
    'mt-statehouse-17': '/district/mt-hd-17',
    'mt-statehouse-18': '/district/mt-hd-18',
    'mt-statehouse-19': '/district/mt-hd-19',
    'mt-statehouse-2': '/district/mt-hd-2',
    'mt-statehouse-20': '/district/mt-hd-20',
    'mt-statehouse-21': '/district/mt-hd-21',
    'mt-statehouse-22': '/district/mt-hd-22',
    'mt-statehouse-23': '/district/mt-hd-23',
    'mt-statehouse-24': '/district/mt-hd-24',
    'mt-statehouse-25': '/district/mt-hd-25',
    'mt-statehouse-26': '/district/mt-hd-26',
    'mt-statehouse-27': '/district/mt-hd-27',
    'mt-statehouse-28': '/district/mt-hd-28',
    'mt-statehouse-29': '/district/mt-hd-29',
    'mt-statehouse-3': '/district/mt-hd-3',
    'mt-statehouse-30': '/district/mt-hd-30',
    'mt-statehouse-31': '/district/mt-hd-31',
    'mt-statehouse-32': '/district/mt-hd-32',
    'mt-statehouse-33': '/district/mt-hd-33',
    'mt-statehouse-34': '/district/mt-hd-34',
    'mt-statehouse-35': '/district/mt-hd-35',
    'mt-statehouse-36': '/district/mt-hd-36',
    'mt-statehouse-37': '/district/mt-hd-37',
    'mt-statehouse-38': '/district/mt-hd-38',
    'mt-statehouse-39': '/district/mt-hd-39',
    'mt-statehouse-4': '/district/mt-hd-4',
    'mt-statehouse-40': '/district/mt-hd-40',
    'mt-statehouse-41': '/district/mt-hd-41',
    'mt-statehouse-42': '/district/mt-hd-42',
    'mt-statehouse-43': '/district/mt-hd-43',
    'mt-statehouse-44': '/district/mt-hd-44',
    'mt-statehouse-45': '/district/mt-hd-45',
    'mt-statehouse-46': '/district/mt-hd-46',
    'mt-statehouse-47': '/district/mt-hd-47',
    'mt-statehouse-48': '/district/mt-hd-48',
    'mt-statehouse-49': '/district/mt-hd-49',
    'mt-statehouse-5': '/district/mt-hd-5',
    'mt-statehouse-50': '/district/mt-hd-50',
    'mt-statehouse-51': '/district/mt-hd-51',
    'mt-statehouse-52': '/district/mt-hd-52',
    'mt-statehouse-53': '/district/mt-hd-53',
    'mt-statehouse-54': '/district/mt-hd-54',
    'mt-statehouse-55': '/district/mt-hd-55',
    'mt-statehouse-56': '/district/mt-hd-56',
    'mt-statehouse-57': '/district/mt-hd-57',
    'mt-statehouse-58': '/district/mt-hd-58',
    'mt-statehouse-59': '/district/mt-hd-59',
    'mt-statehouse-6': '/district/mt-hd-6',
    'mt-statehouse-60': '/district/mt-hd-60',
    'mt-statehouse-61': '/district/mt-hd-61',
    'mt-statehouse-62': '/district/mt-hd-62',
    'mt-statehouse-63': '/district/mt-hd-63',
    'mt-statehouse-64': '/district/mt-hd-64',
    'mt-statehouse-65': '/district/mt-hd-65',
    'mt-statehouse-66': '/district/mt-hd-66',
    'mt-statehouse-67': '/district/mt-hd-67',
    'mt-statehouse-68': '/district/mt-hd-68',
    'mt-statehouse-69': '/district/mt-hd-69',
    'mt-statehouse-7': '/district/mt-hd-7',
    'mt-statehouse-70': '/district/mt-hd-70',
    'mt-statehouse-71': '/district/mt-hd-71',
    'mt-statehouse-72': '/district/mt-hd-72',
    'mt-statehouse-73': '/district/mt-hd-73',
    'mt-statehouse-74': '/district/mt-hd-74',
    'mt-statehouse-75': '/district/mt-hd-75',
    'mt-statehouse-76': '/district/mt-hd-76',
    'mt-statehouse-77': '/district/mt-hd-77',
    'mt-statehouse-78': '/district/mt-hd-78',
    'mt-statehouse-79': '/district/mt-hd-79',
    'mt-statehouse-8': '/district/mt-hd-8',
    'mt-statehouse-80': '/district/mt-hd-80',
    'mt-statehouse-81': '/district/mt-hd-81',
    'mt-statehouse-82': '/district/mt-hd-82',
    'mt-statehouse-83': '/district/mt-hd-83',
    'mt-statehouse-84': '/district/mt-hd-84',
    'mt-statehouse-85': '/district/mt-hd-85',
    'mt-statehouse-86': '/district/mt-hd-86',
    'mt-statehouse-87': '/district/mt-hd-87',
    'mt-statehouse-88': '/district/mt-hd-88',
    'mt-statehouse-89': '/district/mt-hd-89',
    'mt-statehouse-9': '/district/mt-hd-9',
    'mt-statehouse-90': '/district/mt-hd-90',
    'mt-statehouse-91': '/district/mt-hd-91',
    'mt-statehouse-92': '/district/mt-hd-92',
    'mt-statehouse-93': '/district/mt-hd-93',
    'mt-statehouse-94': '/district/mt-hd-94',
    'mt-statehouse-95': '/district/mt-hd-95',
    'mt-statehouse-96': '/district/mt-hd-96',
    'mt-statehouse-97': '/district/mt-hd-97',
    'mt-statehouse-98': '/district/mt-hd-98',
    'mt-statehouse-99': '/district/mt-hd-99',
    'mt-statesenate-1': '/district/mt-sd-1',
    'mt-statesenate-10': '/district/mt-sd-10',
    'mt-statesenate-11': '/district/mt-sd-11',
    'mt-statesenate-12': '/district/mt-sd-12',
    'mt-statesenate-13': '/district/mt-sd-13',
    'mt-statesenate-14': '/district/mt-sd-14',
    'mt-statesenate-15': '/district/mt-sd-15',
    'mt-statesenate-16': '/district/mt-sd-16',
    'mt-statesenate-17': '/district/mt-sd-17',
    'mt-statesenate-18': '/district/mt-sd-18',
    'mt-statesenate-19': '/district/mt-sd-19',
    'mt-statesenate-2': '/district/mt-sd-2',
    'mt-statesenate-20': '/district/mt-sd-20',
    'mt-statesenate-21': '/district/mt-sd-21',
    'mt-statesenate-22': '/district/mt-sd-22',
    'mt-statesenate-23': '/district/mt-sd-23',
    'mt-statesenate-24': '/district/mt-sd-24',
    'mt-statesenate-25': '/district/mt-sd-25',
    'mt-statesenate-26': '/district/mt-sd-26',
    'mt-statesenate-27': '/district/mt-sd-27',
    'mt-statesenate-28': '/district/mt-sd-28',
    'mt-statesenate-29': '/district/mt-sd-29',
    'mt-statesenate-3': '/district/mt-sd-3',
    'mt-statesenate-30': '/district/mt-sd-30',
    'mt-statesenate-31': '/district/mt-sd-31',
    'mt-statesenate-32': '/district/mt-sd-32',
    'mt-statesenate-33': '/district/mt-sd-33',
    'mt-statesenate-34': '/district/mt-sd-34',
    'mt-statesenate-35': '/district/mt-sd-35',
    'mt-statesenate-36': '/district/mt-sd-36',
    'mt-statesenate-37': '/district/mt-sd-37',
    'mt-statesenate-38': '/district/mt-sd-38',
    'mt-statesenate-39': '/district/mt-sd-39',
    'mt-statesenate-4': '/district/mt-sd-4',
    'mt-statesenate-40': '/district/mt-sd-40',
    'mt-statesenate-41': '/district/mt-sd-41',
    'mt-statesenate-42': '/district/mt-sd-42',
    'mt-statesenate-43': '/district/mt-sd-43',
    'mt-statesenate-44': '/district/mt-sd-44',
    'mt-statesenate-45': '/district/mt-sd-45',
    'mt-statesenate-46': '/district/mt-sd-46',
    'mt-statesenate-47': '/district/mt-sd-47',
    'mt-statesenate-48': '/district/mt-sd-48',
    'mt-statesenate-49': '/district/mt-sd-49',
    'mt-statesenate-5': '/district/mt-sd-5',
    'mt-statesenate-50': '/district/mt-sd-50',
    'mt-statesenate-6': '/district/mt-sd-6',
    'mt-statesenate-7': '/district/mt-sd-7',
    'mt-statesenate-8': '/district/mt-sd-8',
    'mt-statesenate-9': '/district/mt-sd-9',
    'ne-statesenate-1': '/district/ne-sd-1',
    'ne-statesenate-10': '/district/ne-sd-10',
    'ne-statesenate-11': '/district/ne-sd-11',
    'ne-statesenate-12': '/district/ne-sd-12',
    'ne-statesenate-13': '/district/ne-sd-13',
    'ne-statesenate-14': '/district/ne-sd-14',
    'ne-statesenate-15': '/district/ne-sd-15',
    'ne-statesenate-16': '/district/ne-sd-16',
    'ne-statesenate-17': '/district/ne-sd-17',
    'ne-statesenate-18': '/district/ne-sd-18',
    'ne-statesenate-19': '/district/ne-sd-19',
    'ne-statesenate-2': '/district/ne-sd-2',
    'ne-statesenate-20': '/district/ne-sd-20',
    'ne-statesenate-21': '/district/ne-sd-21',
    'ne-statesenate-22': '/district/ne-sd-22',
    'ne-statesenate-23': '/district/ne-sd-23',
    'ne-statesenate-24': '/district/ne-sd-24',
    'ne-statesenate-25': '/district/ne-sd-25',
    'ne-statesenate-26': '/district/ne-sd-26',
    'ne-statesenate-27': '/district/ne-sd-27',
    'ne-statesenate-28': '/district/ne-sd-28',
    'ne-statesenate-29': '/district/ne-sd-29',
    'ne-statesenate-3': '/district/ne-sd-3',
    'ne-statesenate-30': '/district/ne-sd-30',
    'ne-statesenate-31': '/district/ne-sd-31',
    'ne-statesenate-32': '/district/ne-sd-32',
    'ne-statesenate-33': '/district/ne-sd-33',
    'ne-statesenate-34': '/district/ne-sd-34',
    'ne-statesenate-35': '/district/ne-sd-35',
    'ne-statesenate-36': '/district/ne-sd-36',
    'ne-statesenate-37': '/district/ne-sd-37',
    'ne-statesenate-38': '/district/ne-sd-38',
    'ne-statesenate-39': '/district/ne-sd-39',
    'ne-statesenate-4': '/district/ne-sd-4',
    'ne-statesenate-40': '/district/ne-sd-40',
    'ne-statesenate-41': '/district/ne-sd-41',
    'ne-statesenate-42': '/district/ne-sd-42',
    'ne-statesenate-43': '/district/ne-sd-43',
    'ne-statesenate-44': '/district/ne-sd-44',
    'ne-statesenate-45': '/district/ne-sd-45',
    'ne-statesenate-46': '/district/ne-sd-46',
    'ne-statesenate-47': '/district/ne-sd-47',
    'ne-statesenate-48': '/district/ne-sd-48',
    'ne-statesenate-49': '/district/ne-sd-49',
    'ne-statesenate-5': '/district/ne-sd-5',
    'ne-statesenate-6': '/district/ne-sd-6',
    'ne-statesenate-7': '/district/ne-sd-7',
    'ne-statesenate-8': '/district/ne-sd-8',
    'ne-statesenate-9': '/district/ne-sd-9',
    'nv-statesenate-6': '/district/nv-sd-6',
    'nv-statesenate-17': '/district/nv-sd-17',
    'nv-statesenate-8': '/district/nv-sd-8',
    'nv-statesenate-9': '/district/nv-sd-9',
    'nv-statesenate-12': '/district/nv-sd-12',
    'nv-statehouse-4': '/district/nv-hd-4',
    'nv-statehouse-21': '/district/nv-hd-21',
    'nv-statehouse-25': '/district/nv-hd-25',
    'nv-statehouse-35': '/district/nv-hd-35',
    'nv-statehouse-37': '/district/nv-hd-37',
    'nv-statehouse-1': '/district/nv-hd-1',
    'nv-statehouse-2': '/district/nv-hd-2',
    'nv-statehouse-3': '/district/nv-hd-3',
    'nv-statehouse-5': '/district/nv-hd-5',
    'nv-statehouse-6': '/district/nv-hd-6',
    'nv-statehouse-7': '/district/nv-hd-7',
    'nv-statehouse-8': '/district/nv-hd-8',
    'nv-statehouse-9': '/district/nv-hd-9',
    'nv-statehouse-10': '/district/nv-hd-10',
    'nv-statehouse-11': '/district/nv-hd-11',
    'nv-statehouse-12': '/district/nv-hd-12',
    'nv-statehouse-13': '/district/nv-hd-13',
    'nv-statehouse-14': '/district/nv-hd-14',
    'nv-statehouse-15': '/district/nv-hd-15',
    'nv-statehouse-16': '/district/nv-hd-16',
    'nv-statehouse-17': '/district/nv-hd-17',
    'nv-statehouse-18': '/district/nv-hd-18',
    'nv-statehouse-19': '/district/nv-hd-19',
    'nv-statehouse-20': '/district/nv-hd-20',
    'nv-statehouse-22': '/district/nv-hd-22',
    'nv-statehouse-23': '/district/nv-hd-23',
    'nv-statehouse-24': '/district/nv-hd-24',
    'nv-statehouse-26': '/district/nv-hd-26',
    'nv-statehouse-27': '/district/nv-hd-27',
    'nv-statehouse-28': '/district/nv-hd-28',
    'nv-statehouse-29': '/district/nv-hd-29',
    'nv-statehouse-30': '/district/nv-hd-30',
    'nv-statehouse-31': '/district/nv-hd-31',
    'nv-statehouse-32': '/district/nv-hd-32',
    'nv-statehouse-33': '/district/nv-hd-33',
    'nv-statehouse-34': '/district/nv-hd-34',
    'nv-statehouse-36': '/district/nv-hd-36',
    'nv-statehouse-38': '/district/nv-hd-38',
    'nv-statehouse-39': '/district/nv-hd-39',
    'nv-statehouse-40': '/district/nv-hd-40',
    'nv-statehouse-41': '/district/nv-hd-41',
    'nv-statehouse-42': '/district/nv-hd-42',
    'nv-statesenate-1': '/district/nv-sd-1',
    'nv-statesenate-2': '/district/nv-sd-2',
    'nv-statesenate-3': '/district/nv-sd-3',
    'nv-statesenate-4': '/district/nv-sd-4',
    'nv-statesenate-7': '/district/nv-sd-7',
    'nv-statesenate-10': '/district/nv-sd-10',
    'nv-statesenate-11': '/district/nv-sd-11',
    'nv-statesenate-13': '/district/nv-sd-13',
    'nv-statesenate-14': '/district/nv-sd-14',
    'nv-statesenate-15': '/district/nv-sd-15',
    'nv-statesenate-16': '/district/nv-sd-16',
    'nv-statesenate-18': '/district/nv-sd-18',
    'nv-statesenate-19': '/district/nv-sd-19',
    'nv-statesenate-20': '/district/nv-sd-20',
    'nv-statesenate-21': '/district/nv-sd-21',
    'nv-statesenate-5': '/district/nv-sd-5',
    'ny-statesenate-43': '/district/ny-sd-43',
    'ny-statesenate-39': '/district/ny-sd-39',
    'ny-statesenate-44': '/district/ny-sd-44',
    'ny-statesenate-38': '/district/ny-sd-38',
    'ny-statehouse-107': '/district/ny-hd-107',
    'ny-statehouse-46': '/district/ny-hd-46',
    'ny-statehouse-143': '/district/ny-hd-143',
    'ny-statehouse-21': '/district/ny-hd-21',
    'ny-statehouse-97': '/district/ny-hd-97',
    'nc-statesenate-7': '/district/nc-sd-7',
    'nc-statesenate-11': '/district/nc-sd-11',
    'nc-statesenate-42': '/district/nc-sd-42',
    'nc-statesenate-18': '/district/nc-sd-18',
    'nc-statehouse-25': '/district/nc-hd-25',
    'nc-statehouse-105': '/district/nc-hd-105',
    'nc-statehouse-98': '/district/nc-hd-98',
    'nc-statehouse-37': '/district/nc-hd-37',
    'oh-statesenate-29': '/district/oh-sd-29',
    'oh-statehouse-10': '/district/oh-hd-10',
    'oh-statehouse-17': '/district/oh-hd-17',
    'oh-statehouse-36': '/district/oh-hd-36',
    'oh-statehouse-60': '/district/oh-hd-60',
    'pa-statesenate-40': '/district/pa-sd-40',
    'pa-statesenate-16': '/district/pa-sd-16',
    'pa-statesenate-6': '/district/pa-sd-6',
    'pa-statesenate-36': '/district/pa-sd-36',
    'pa-statesenate-24': '/district/pa-sd-24',
    'pa-statehouse-72': '/district/pa-hd-72',
    'pa-statehouse-12': '/district/pa-hd-12',
    'pa-statehouse-137': '/district/pa-hd-137',
    'pa-statehouse-142': '/district/pa-hd-142',
    'pa-statehouse-144': '/district/pa-hd-144',
    'pa-statehouse-18': '/district/pa-hd-18',
    'pa-statehouse-160': '/district/pa-hd-160',
    'ri-statehouse-1': '/district/ri-hd-1',
    'ri-statehouse-10': '/district/ri-hd-10',
    'ri-statehouse-11': '/district/ri-hd-11',
    'ri-statehouse-12': '/district/ri-hd-12',
    'ri-statehouse-13': '/district/ri-hd-13',
    'ri-statehouse-14': '/district/ri-hd-14',
    'ri-statehouse-15': '/district/ri-hd-15',
    'ri-statehouse-16': '/district/ri-hd-16',
    'ri-statehouse-17': '/district/ri-hd-17',
    'ri-statehouse-18': '/district/ri-hd-18',
    'ri-statehouse-19': '/district/ri-hd-19',
    'ri-statehouse-2': '/district/ri-hd-2',
    'ri-statehouse-20': '/district/ri-hd-20',
    'ri-statehouse-21': '/district/ri-hd-21',
    'ri-statehouse-22': '/district/ri-hd-22',
    'ri-statehouse-23': '/district/ri-hd-23',
    'ri-statehouse-24': '/district/ri-hd-24',
    'ri-statehouse-25': '/district/ri-hd-25',
    'ri-statehouse-26': '/district/ri-hd-26',
    'ri-statehouse-27': '/district/ri-hd-27',
    'ri-statehouse-28': '/district/ri-hd-28',
    'ri-statehouse-29': '/district/ri-hd-29',
    'ri-statehouse-3': '/district/ri-hd-3',
    'ri-statehouse-30': '/district/ri-hd-30',
    'ri-statehouse-32': '/district/ri-hd-32',
    'ri-statehouse-33': '/district/ri-hd-33',
    'ri-statehouse-34': '/district/ri-hd-34',
    'ri-statehouse-35': '/district/ri-hd-35',
    'ri-statehouse-36': '/district/ri-hd-36',
    'ri-statehouse-37': '/district/ri-hd-37',
    'ri-statehouse-38': '/district/ri-hd-38',
    'ri-statehouse-39': '/district/ri-hd-39',
    'ri-statehouse-4': '/district/ri-hd-4',
    'ri-statehouse-40': '/district/ri-hd-40',
    'ri-statehouse-41': '/district/ri-hd-41',
    'ri-statehouse-42': '/district/ri-hd-42',
    'ri-statehouse-43': '/district/ri-hd-43',
    'ri-statehouse-44': '/district/ri-hd-44',
    'ri-statehouse-45': '/district/ri-hd-45',
    'ri-statehouse-46': '/district/ri-hd-46',
    'ri-statehouse-47': '/district/ri-hd-47',
    'ri-statehouse-48': '/district/ri-hd-48',
    'ri-statehouse-49': '/district/ri-hd-49',
    'ri-statehouse-5': '/district/ri-hd-5',
    'ri-statehouse-50': '/district/ri-hd-50',
    'ri-statehouse-51': '/district/ri-hd-51',
    'ri-statehouse-52': '/district/ri-hd-52',
    'ri-statehouse-53': '/district/ri-hd-53',
    'ri-statehouse-54': '/district/ri-hd-54',
    'ri-statehouse-55': '/district/ri-hd-55',
    'ri-statehouse-56': '/district/ri-hd-56',
    'ri-statehouse-57': '/district/ri-hd-57',
    'ri-statehouse-58': '/district/ri-hd-58',
    'ri-statehouse-59': '/district/ri-hd-59',
    'ri-statehouse-6': '/district/ri-hd-6',
    'ri-statehouse-60': '/district/ri-hd-60',
    'ri-statehouse-61': '/district/ri-hd-61',
    'ri-statehouse-62': '/district/ri-hd-62',
    'ri-statehouse-63': '/district/ri-hd-63',
    'ri-statehouse-64': '/district/ri-hd-64',
    'ri-statehouse-65': '/district/ri-hd-65',
    'ri-statehouse-66': '/district/ri-hd-66',
    'ri-statehouse-67': '/district/ri-hd-67',
    'ri-statehouse-68': '/district/ri-hd-68',
    'ri-statehouse-69': '/district/ri-hd-69',
    'ri-statehouse-7': '/district/ri-hd-7',
    'ri-statehouse-70': '/district/ri-hd-70',
    'ri-statehouse-71': '/district/ri-hd-71',
    'ri-statehouse-72': '/district/ri-hd-72',
    'ri-statehouse-73': '/district/ri-hd-73',
    'ri-statehouse-74': '/district/ri-hd-74',
    'ri-statehouse-75': '/district/ri-hd-75',
    'ri-statehouse-8': '/district/ri-hd-8',
    'ri-statehouse-9': '/district/ri-hd-9',
    'ri-statesenate-1': '/district/ri-sd-1',
    'ri-statesenate-10': '/district/ri-sd-10',
    'ri-statesenate-11': '/district/ri-sd-11',
    'ri-statesenate-12': '/district/ri-sd-12',
    'ri-statesenate-13': '/district/ri-sd-13',
    'ri-statesenate-14': '/district/ri-sd-14',
    'ri-statesenate-15': '/district/ri-sd-15',
    'ri-statesenate-16': '/district/ri-sd-16',
    'ri-statesenate-17': '/district/ri-sd-17',
    'ri-statesenate-18': '/district/ri-sd-18',
    'ri-statesenate-19': '/district/ri-sd-19',
    'ri-statesenate-2': '/district/ri-sd-2',
    'ri-statesenate-20': '/district/ri-sd-20',
    'ri-statesenate-21': '/district/ri-sd-21',
    'ri-statesenate-22': '/district/ri-sd-22',
    'ri-statesenate-23': '/district/ri-sd-23',
    'ri-statesenate-24': '/district/ri-sd-24',
    'ri-statesenate-25': '/district/ri-sd-25',
    'ri-statesenate-26': '/district/ri-sd-26',
    'ri-statesenate-27': '/district/ri-sd-27',
    'ri-statesenate-28': '/district/ri-sd-28',
    'ri-statesenate-29': '/district/ri-sd-29',
    'ri-statesenate-3': '/district/ri-sd-3',
    'ri-statesenate-30': '/district/ri-sd-30',
    'ri-statesenate-31': '/district/ri-sd-31',
    'ri-statesenate-32': '/district/ri-sd-32',
    'ri-statesenate-33': '/district/ri-sd-33',
    'ri-statesenate-34': '/district/ri-sd-34',
    'ri-statesenate-35': '/district/ri-sd-35',
    'ri-statesenate-36': '/district/ri-sd-36',
    'ri-statesenate-37': '/district/ri-sd-37',
    'ri-statesenate-38': '/district/ri-sd-38',
    'ri-statesenate-4': '/district/ri-sd-4',
    'ri-statesenate-5': '/district/ri-sd-5',
    'ri-statesenate-6': '/district/ri-sd-6',
    'ri-statesenate-7': '/district/ri-sd-7',
    'ri-statesenate-8': '/district/ri-sd-8',
    'ri-statesenate-9': '/district/ri-sd-9',
    'sd-statehouse-1-p1': '/district/sd-hd-1-p1',
    'sd-statehouse-1-p2': '/district/sd-hd-1-p2',
    'sd-statehouse-10-p1': '/district/sd-hd-10-p1',
    'sd-statehouse-10-p2': '/district/sd-hd-10-p2',
    'sd-statehouse-11-p1': '/district/sd-hd-11-p1',
    'sd-statehouse-11-p2': '/district/sd-hd-11-p2',
    'sd-statehouse-12-p1': '/district/sd-hd-12-p1',
    'sd-statehouse-12-p2': '/district/sd-hd-12-p2',
    'sd-statehouse-13-p1': '/district/sd-hd-13-p1',
    'sd-statehouse-13-p2': '/district/sd-hd-13-p2',
    'sd-statehouse-14-p1': '/district/sd-hd-14-p1',
    'sd-statehouse-14-p2': '/district/sd-hd-14-p2',
    'sd-statehouse-15-p1': '/district/sd-hd-15-p1',
    'sd-statehouse-15-p2': '/district/sd-hd-15-p2',
    'sd-statehouse-16-p1': '/district/sd-hd-16-p1',
    'sd-statehouse-16-p2': '/district/sd-hd-16-p2',
    'sd-statehouse-17-p1': '/district/sd-hd-17-p1',
    'sd-statehouse-17-p2': '/district/sd-hd-17-p2',
    'sd-statehouse-18-p1': '/district/sd-hd-18-p1',
    'sd-statehouse-18-p2': '/district/sd-hd-18-p2',
    'sd-statehouse-19-p1': '/district/sd-hd-19-p1',
    'sd-statehouse-19-p2': '/district/sd-hd-19-p2',
    'sd-statehouse-2-p1': '/district/sd-hd-2-p1',
    'sd-statehouse-2-p2': '/district/sd-hd-2-p2',
    'sd-statehouse-20-p1': '/district/sd-hd-20-p1',
    'sd-statehouse-20-p2': '/district/sd-hd-20-p2',
    'sd-statehouse-21-p1': '/district/sd-hd-21-p1',
    'sd-statehouse-21-p2': '/district/sd-hd-21-p2',
    'sd-statehouse-22-p1': '/district/sd-hd-22-p1',
    'sd-statehouse-22-p2': '/district/sd-hd-22-p2',
    'sd-statehouse-23-p1': '/district/sd-hd-23-p1',
    'sd-statehouse-23-p2': '/district/sd-hd-23-p2',
    'sd-statehouse-24-p1': '/district/sd-hd-24-p1',
    'sd-statehouse-24-p2': '/district/sd-hd-24-p2',
    'sd-statehouse-25-p1': '/district/sd-hd-25-p1',
    'sd-statehouse-25-p2': '/district/sd-hd-25-p2',
    'sd-statehouse-34': '/district/sd-hd-34',
    'sd-statehouse-35': '/district/sd-hd-35',
    'sd-statehouse-26-p1': '/district/sd-hd-26-p1',
    'sd-statehouse-26-p2': '/district/sd-hd-26-p2',
    'sd-statehouse-36': '/district/sd-hd-36',
    'sd-statehouse-37': '/district/sd-hd-37',
    'sd-statehouse-27-p1': '/district/sd-hd-27-p1',
    'sd-statehouse-27-p2': '/district/sd-hd-27-p2',
    'sd-statehouse-3-p1': '/district/sd-hd-3-p1',
    'sd-statehouse-3-p2': '/district/sd-hd-3-p2',
    'sd-statehouse-28-p1': '/district/sd-hd-28-p1',
    'sd-statehouse-28-p2': '/district/sd-hd-28-p2',
    'sd-statehouse-29-p1': '/district/sd-hd-29-p1',
    'sd-statehouse-29-p2': '/district/sd-hd-29-p2',
    'sd-statehouse-30-p1': '/district/sd-hd-30-p1',
    'sd-statehouse-30-p2': '/district/sd-hd-30-p2',
    'sd-statehouse-31-p1': '/district/sd-hd-31-p1',
    'sd-statehouse-31-p2': '/district/sd-hd-31-p2',
    'sd-statehouse-32-p1': '/district/sd-hd-32-p1',
    'sd-statehouse-32-p2': '/district/sd-hd-32-p2',
    'sd-statehouse-33-p1': '/district/sd-hd-33-p1',
    'sd-statehouse-33-p2': '/district/sd-hd-33-p2',
    'sd-statehouse-4-p1': '/district/sd-hd-4-p1',
    'sd-statehouse-4-p2': '/district/sd-hd-4-p2',
    'sd-statehouse-5-p1': '/district/sd-hd-5-p1',
    'sd-statehouse-5-p2': '/district/sd-hd-5-p2',
    'sd-statehouse-6-p1': '/district/sd-hd-6-p1',
    'sd-statehouse-6-p2': '/district/sd-hd-6-p2',
    'sd-statehouse-7-p1': '/district/sd-hd-7-p1',
    'sd-statehouse-7-p2': '/district/sd-hd-7-p2',
    'sd-statehouse-8-p1': '/district/sd-hd-8-p1',
    'sd-statehouse-8-p2': '/district/sd-hd-8-p2',
    'sd-statehouse-9-p1': '/district/sd-hd-9-p1',
    'sd-statehouse-9-p2': '/district/sd-hd-9-p2',
    'sd-statesenate-1': '/district/sd-sd-1',
    'sd-statesenate-10': '/district/sd-sd-10',
    'sd-statesenate-11': '/district/sd-sd-11',
    'sd-statesenate-12': '/district/sd-sd-12',
    'sd-statesenate-13': '/district/sd-sd-13',
    'sd-statesenate-14': '/district/sd-sd-14',
    'sd-statesenate-15': '/district/sd-sd-15',
    'sd-statesenate-16': '/district/sd-sd-16',
    'sd-statesenate-17': '/district/sd-sd-17',
    'sd-statesenate-18': '/district/sd-sd-18',
    'sd-statesenate-19': '/district/sd-sd-19',
    'sd-statesenate-2': '/district/sd-sd-2',
    'sd-statesenate-20': '/district/sd-sd-20',
    'sd-statesenate-21': '/district/sd-sd-21',
    'sd-statesenate-22': '/district/sd-sd-22',
    'sd-statesenate-23': '/district/sd-sd-23',
    'sd-statesenate-24': '/district/sd-sd-24',
    'sd-statesenate-25': '/district/sd-sd-25',
    'sd-statesenate-26': '/district/sd-sd-26',
    'sd-statesenate-27': '/district/sd-sd-27',
    'sd-statesenate-28': '/district/sd-sd-28',
    'sd-statesenate-29': '/district/sd-sd-29',
    'sd-statesenate-3': '/district/sd-sd-3',
    'sd-statesenate-30': '/district/sd-sd-30',
    'sd-statesenate-31': '/district/sd-sd-31',
    'sd-statesenate-32': '/district/sd-sd-32',
    'sd-statesenate-33': '/district/sd-sd-33',
    'sd-statesenate-34': '/district/sd-sd-34',
    'sd-statesenate-35': '/district/sd-sd-35',
    'sd-statesenate-4': '/district/sd-sd-4',
    'sd-statesenate-5': '/district/sd-sd-5',
    'sd-statesenate-6': '/district/sd-sd-6',
    'sd-statesenate-7': '/district/sd-sd-7',
    'sd-statesenate-8': '/district/sd-sd-8',
    'sd-statesenate-9': '/district/sd-sd-9',
    'tn-statehouse-25': '/district/tn-hd-25',
    'tn-statesenate-5': '/district/tn-sd-5',
    'tn-statesenate-27': '/district/tn-sd-27',
    'tn-statesenate-29': '/district/tn-sd-29',
    'tn-statesenate-15': '/district/tn-sd-15',
    'tn-statesenate-16': '/district/tn-sd-16',
    'tn-statesenate-7': '/district/tn-sd-7',
    'tn-statesenate-20': '/district/tn-sd-20',
    'tn-statesenate-3': '/district/tn-sd-3',
    'tn-statesenate-10': '/district/tn-sd-10',
    'tn-statesenate-18': '/district/tn-sd-18',
    'tn-statesenate-4': '/district/tn-sd-4',
    'tn-statesenate-2': '/district/tn-sd-2',
    'tn-statesenate-28': '/district/tn-sd-28',
    'tn-statesenate-25': '/district/tn-sd-25',
    'tn-statesenate-30': '/district/tn-sd-30',
    'tn-statesenate-33': '/district/tn-sd-33',
    'tn-statesenate-1': '/district/tn-sd-1',
    'tn-statesenate-6': '/district/tn-sd-6',
    'tn-statesenate-19': '/district/tn-sd-19',
    'tn-statesenate-17': '/district/tn-sd-17',
    'tn-statesenate-22': '/district/tn-sd-22',
    'tn-statesenate-14': '/district/tn-sd-14',
    'tn-statesenate-23': '/district/tn-sd-23',
    'tn-statesenate-32': '/district/tn-sd-32',
    'tn-statesenate-8': '/district/tn-sd-8',
    'tn-statesenate-9': '/district/tn-sd-9',
    'tn-statesenate-24': '/district/tn-sd-24',
    'tn-statesenate-26': '/district/tn-sd-26',
    'tn-statesenate-11': '/district/tn-sd-11',
    'tn-statesenate-13': '/district/tn-sd-13',
    'tn-statesenate-12': '/district/tn-sd-12',
    'tn-statesenate-21': '/district/tn-sd-21',
    'tn-statehouse-7': '/district/tn-hd-7',
    'tn-statehouse-12': '/district/tn-hd-12',
    'tn-statehouse-69': '/district/tn-hd-69',
    'tn-statehouse-37': '/district/tn-hd-37',
    'tn-statehouse-51': '/district/tn-hd-51',
    'tn-statehouse-46': '/district/tn-hd-46',
    'tn-statehouse-47': '/district/tn-hd-47',
    'tn-statehouse-60': '/district/tn-hd-60',
    'tn-statehouse-61': '/district/tn-hd-61',
    'tn-statehouse-41': '/district/tn-hd-41',
    'tn-statehouse-87': '/district/tn-hd-87',
    'tn-statehouse-71': '/district/tn-hd-71',
    'tn-statehouse-16': '/district/tn-hd-16',
    'tn-statehouse-64': '/district/tn-hd-64',
    'tn-statehouse-85': '/district/tn-hd-85',
    'tn-statehouse-55': '/district/tn-hd-55',
    'tn-statehouse-23': '/district/tn-hd-23',
    'tn-statehouse-1': '/district/tn-hd-1',
    'tn-statehouse-76': '/district/tn-hd-76',
    'tn-statehouse-18': '/district/tn-hd-18',
    'tn-statehouse-54': '/district/tn-hd-54',
    'tn-statehouse-70': '/district/tn-hd-70',
    'tn-statehouse-10': '/district/tn-hd-10',
    'tn-statehouse-11': '/district/tn-hd-11',
    'tn-statehouse-17': '/district/tn-hd-17',
    'tn-statehouse-56': '/district/tn-hd-56',
    'tn-statehouse-32': '/district/tn-hd-32',
    'tn-statehouse-94': '/district/tn-hd-94',
    'tn-statehouse-97': '/district/tn-hd-97',
    'tn-statehouse-67': '/district/tn-hd-67',
    'tn-statehouse-77': '/district/tn-hd-77',
    'tn-statehouse-28': '/district/tn-hd-28',
    'tn-statehouse-40': '/district/tn-hd-40',
    'tn-statehouse-93': '/district/tn-hd-93',
    'tn-statehouse-91': '/district/tn-hd-91',
    'tn-statehouse-72': '/district/tn-hd-72',
    'tn-statehouse-5': '/district/tn-hd-5',
    'tn-statehouse-30': '/district/tn-hd-30',
    'tn-statehouse-59': '/district/tn-hd-59',
    'tn-statehouse-9': '/district/tn-hd-9',
    'tn-statehouse-6': '/district/tn-hd-6',
    'tn-statehouse-3': '/district/tn-hd-3',
    'tn-statehouse-22': '/district/tn-hd-22',
    'tn-statehouse-2': '/district/tn-hd-2',
    'tn-statehouse-82': '/district/tn-hd-82',
    'tn-statehouse-90': '/district/tn-hd-90',
    'tn-statehouse-52': '/district/tn-hd-52',
    'tn-statehouse-4': '/district/tn-hd-4',
    'tn-statehouse-38': '/district/tn-hd-38',
    'tn-statehouse-66': '/district/tn-hd-66',
    'tn-statehouse-89': '/district/tn-hd-89',
    'tn-statehouse-44': '/district/tn-hd-44',
    'tn-statehouse-75': '/district/tn-hd-75',
    'tn-statehouse-99': '/district/tn-hd-99',
    'tn-statehouse-78': '/district/tn-hd-78',
    'tn-statehouse-58': '/district/tn-hd-58',
    'tn-statehouse-57': '/district/tn-hd-57',
    'tn-statehouse-68': '/district/tn-hd-68',
    'tn-statehouse-62': '/district/tn-hd-62',
    'tn-statehouse-79': '/district/tn-hd-79',
    'tn-statehouse-26': '/district/tn-hd-26',
    'tn-statehouse-63': '/district/tn-hd-63',
    'tn-statehouse-15': '/district/tn-hd-15',
    'tn-statehouse-88': '/district/tn-hd-88',
    'tn-statehouse-50': '/district/tn-hd-50',
    'tn-statehouse-81': '/district/tn-hd-81',
    'tn-statehouse-8': '/district/tn-hd-8',
    'tn-statehouse-98': '/district/tn-hd-98',
    'tn-statehouse-53': '/district/tn-hd-53',
    'tn-statehouse-36': '/district/tn-hd-36',
    'tn-statehouse-24': '/district/tn-hd-24',
    'tn-statehouse-74': '/district/tn-hd-74',
    'tn-statehouse-65': '/district/tn-hd-65',
    'tn-statehouse-27': '/district/tn-hd-27',
    'tn-statehouse-34': '/district/tn-hd-34',
    'tn-statehouse-39': '/district/tn-hd-39',
    'tn-statehouse-21': '/district/tn-hd-21',
    'tn-statehouse-96': '/district/tn-hd-96',
    'tn-statehouse-33': '/district/tn-hd-33',
    'tn-statehouse-80': '/district/tn-hd-80',
    'tn-statehouse-43': '/district/tn-hd-43',
    'tn-statehouse-35': '/district/tn-hd-35',
    'tn-statehouse-49': '/district/tn-hd-49',
    'tn-statehouse-13': '/district/tn-hd-13',
    'tn-statehouse-20': '/district/tn-hd-20',
    'tn-statehouse-48': '/district/tn-hd-48',
    'tn-statehouse-73': '/district/tn-hd-73',
    'tn-statehouse-95': '/district/tn-hd-95',
    'tn-statehouse-29': '/district/tn-hd-29',
    'tn-statehouse-92': '/district/tn-hd-92',
    'tn-statehouse-83': '/district/tn-hd-83',
    'tn-statehouse-42': '/district/tn-hd-42',
    'tn-statehouse-19': '/district/tn-hd-19',
    'tn-statehouse-14': '/district/tn-hd-14',
    'tn-statehouse-45': '/district/tn-hd-45',
    'tn-statesenate-31': '/district/tn-sd-31',
    'tn-statehouse-86': '/district/tn-hd-86',
    'tx-statesenate-19': '/district/tx-sd-19',
    'tx-statehouse-34': '/district/tx-hd-34',
    'tx-statehouse-37': '/district/tx-hd-37',
    'tx-statehouse-52': '/district/tx-hd-52',
    'tx-statehouse-61': '/district/tx-hd-61',
    'tx-statehouse-67': '/district/tx-hd-67',
    'tx-statehouse-70': '/district/tx-hd-70',
    'tx-statehouse-74': '/district/tx-hd-74',
    'tx-statehouse-108': '/district/tx-hd-108',
    'tx-statehouse-112': '/district/tx-hd-112',
    'tx-statehouse-121': '/district/tx-hd-121',
    'tx-statehouse-138': '/district/tx-hd-138',
    'tx-statesenate-9': '/district/tx-sd-9',
    'tx-statesenate-21': '/district/tx-sd-21',
    'vt-statehouse-1-p1': '/district/vt-hd-1-p1',
    'vt-statehouse-1-p2': '/district/vt-hd-1-p2',
    'vt-statehouse-2': '/district/vt-hd-2',
    'vt-statehouse-3-p1': '/district/vt-hd-3-p1',
    'vt-statehouse-3-p2': '/district/vt-hd-3-p2',
    'vt-statehouse-4-p1': '/district/vt-hd-4-p1',
    'vt-statehouse-4-p2': '/district/vt-hd-4-p2',
    'vt-statehouse-5': '/district/vt-hd-5',
    'vt-statehouse-6': '/district/vt-hd-6',
    'vt-statehouse-7': '/district/vt-hd-7',
    'vt-statehouse-8-p1': '/district/vt-hd-8-p1',
    'vt-statehouse-8-p2': '/district/vt-hd-8-p2',
    'vt-statehouse-9': '/district/vt-hd-9',
    'vt-statehouse-10-p1': '/district/vt-hd-10-p1',
    'vt-statehouse-10-p2': '/district/vt-hd-10-p2',
    'vt-statehouse-11-p1': '/district/vt-hd-11-p1',
    'vt-statehouse-11-p2': '/district/vt-hd-11-p2',
    'vt-statehouse-12': '/district/vt-hd-12',
    'vt-statehouse-13': '/district/vt-hd-13',
    'vt-statehouse-14-p1': '/district/vt-hd-14-p1',
    'vt-statehouse-14-p2': '/district/vt-hd-14-p2',
    'vt-statehouse-15-p1': '/district/vt-hd-15-p1',
    'vt-statehouse-15-p2': '/district/vt-hd-15-p2',
    'vt-statehouse-16': '/district/vt-hd-16',
    'vt-statehouse-17': '/district/vt-hd-17',
    'vt-statehouse-18': '/district/vt-hd-18',
    'vt-statehouse-19': '/district/vt-hd-19',
    'vt-statehouse-20': '/district/vt-hd-20',
    'vt-statehouse-21': '/district/vt-hd-21',
    'vt-statehouse-22-p1': '/district/vt-hd-22-p1',
    'vt-statehouse-22-p2': '/district/vt-hd-22-p2',
    'vt-statehouse-23': '/district/vt-hd-23',
    'vt-statehouse-24': '/district/vt-hd-24',
    'vt-statehouse-25': '/district/vt-hd-25',
    'vt-statehouse-26-p1': '/district/vt-hd-26-p1',
    'vt-statehouse-26-p2': '/district/vt-hd-26-p2',
    'vt-statehouse-27-p1': '/district/vt-hd-27-p1',
    'vt-statehouse-27-p2': '/district/vt-hd-27-p2',
    'vt-statehouse-28-p1': '/district/vt-hd-28-p1',
    'vt-statehouse-28-p2': '/district/vt-hd-28-p2',
    'vt-statehouse-29-p1': '/district/vt-hd-29-p1',
    'vt-statehouse-29-p2': '/district/vt-hd-29-p2',
    'vt-statehouse-30': '/district/vt-hd-30',
    'vt-statehouse-31-p1': '/district/vt-hd-31-p1',
    'vt-statehouse-31-p2': '/district/vt-hd-31-p2',
    'vt-statehouse-32-p1': '/district/vt-hd-32-p1',
    'vt-statehouse-32-p2': '/district/vt-hd-32-p2',
    'vt-statehouse-33-p1': '/district/vt-hd-33-p1',
    'vt-statehouse-33-p2': '/district/vt-hd-33-p2',
    'vt-statehouse-34-p1': '/district/vt-hd-34-p1',
    'vt-statehouse-34-p2': '/district/vt-hd-34-p2',
    'vt-statehouse-35-p1': '/district/vt-hd-35-p1',
    'vt-statehouse-35-p2': '/district/vt-hd-35-p2',
    'vt-statehouse-36-p1': '/district/vt-hd-36-p1',
    'vt-statehouse-36-p2': '/district/vt-hd-36-p2',
    'vt-statehouse-37': '/district/vt-hd-37',
    'vt-statehouse-38': '/district/vt-hd-38',
    'vt-statehouse-39': '/district/vt-hd-39',
    'vt-statehouse-40': '/district/vt-hd-40',
    'vt-statehouse-41-p1': '/district/vt-hd-41-p1',
    'vt-statehouse-41-p2': '/district/vt-hd-41-p2',
    'vt-statehouse-42-p1': '/district/vt-hd-42-p1',
    'vt-statehouse-42-p2': '/district/vt-hd-42-p2',
    'vt-statehouse-43': '/district/vt-hd-43',
    'vt-statehouse-44': '/district/vt-hd-44',
    'vt-statehouse-45': '/district/vt-hd-45',
    'vt-statehouse-46-p1': '/district/vt-hd-46-p1',
    'vt-statehouse-46-p2': '/district/vt-hd-46-p2',
    'vt-statehouse-47': '/district/vt-hd-47',
    'vt-statehouse-48': '/district/vt-hd-48',
    'vt-statehouse-49-p1': '/district/vt-hd-49-p1',
    'vt-statehouse-49-p2': '/district/vt-hd-49-p2',
    'vt-statehouse-50-p1': '/district/vt-hd-50-p1',
    'vt-statehouse-50-p2': '/district/vt-hd-50-p2',
    'vt-statehouse-51': '/district/vt-hd-51',
    'vt-statehouse-52': '/district/vt-hd-52',
    'vt-statehouse-53': '/district/vt-hd-53',
    'vt-statehouse-54-p1': '/district/vt-hd-54-p1',
    'vt-statehouse-54-p2': '/district/vt-hd-54-p2',
    'vt-statehouse-55': '/district/vt-hd-55',
    'vt-statehouse-56-p1': '/district/vt-hd-56-p1',
    'vt-statehouse-56-p2': '/district/vt-hd-56-p2',
    'vt-statehouse-57': '/district/vt-hd-57',
    'vt-statehouse-58-p1': '/district/vt-hd-58-p1',
    'vt-statehouse-58-p2': '/district/vt-hd-58-p2',
    'vt-statehouse-59': '/district/vt-hd-59',
    'vt-statehouse-60': '/district/vt-hd-60',
    'vt-statehouse-61': '/district/vt-hd-61',
    'vt-statehouse-62': '/district/vt-hd-62',
    'vt-statehouse-63-p1': '/district/vt-hd-63-p1',
    'vt-statehouse-63-p2': '/district/vt-hd-63-p2',
    'vt-statehouse-64': '/district/vt-hd-64',
    'vt-statehouse-65': '/district/vt-hd-65',
    'vt-statehouse-66': '/district/vt-hd-66',
    'vt-statehouse-67': '/district/vt-hd-67',
    'vt-statehouse-68-p1': '/district/vt-hd-68-p1',
    'vt-statehouse-68-p2': '/district/vt-hd-68-p2',
    'vt-statehouse-69': '/district/vt-hd-69',
    'vt-statehouse-70-p1': '/district/vt-hd-70-p1',
    'vt-statehouse-70-p2': '/district/vt-hd-70-p2',
    'vt-statehouse-71': '/district/vt-hd-71',
    'vt-statehouse-72': '/district/vt-hd-72',
    'vt-statehouse-73': '/district/vt-hd-73',
    'vt-statehouse-74': '/district/vt-hd-74',
    'vt-statehouse-75': '/district/vt-hd-75',
    'vt-statehouse-76': '/district/vt-hd-76',
    'vt-statehouse-77': '/district/vt-hd-77',
    'vt-statehouse-78': '/district/vt-hd-78',
    'vt-statehouse-79': '/district/vt-hd-79',
    'vt-statehouse-80': '/district/vt-hd-80',
    'vt-statehouse-81': '/district/vt-hd-81',
    'vt-statehouse-82': '/district/vt-hd-82',
    'vt-statehouse-83': '/district/vt-hd-83',
    'vt-statehouse-84-p1': '/district/vt-hd-84-p1',
    'vt-statehouse-84-p2': '/district/vt-hd-84-p2',
    'vt-statehouse-85': '/district/vt-hd-85',
    'vt-statehouse-86': '/district/vt-hd-86',
    'vt-statehouse-87': '/district/vt-hd-87',
    'vt-statehouse-88': '/district/vt-hd-88',
    'vt-statehouse-89': '/district/vt-hd-89',
    'vt-statehouse-90': '/district/vt-hd-90',
    'vt-statehouse-91-p1': '/district/vt-hd-91-p1',
    'vt-statehouse-91-p2': '/district/vt-hd-91-p2',
    'vt-statehouse-92-p1': '/district/vt-hd-92-p1',
    'vt-statehouse-92-p2': '/district/vt-hd-92-p2',
    'vt-statehouse-93-p1': '/district/vt-hd-93-p1',
    'vt-statehouse-93-p2': '/district/vt-hd-93-p2',
    'vt-statehouse-94-p1': '/district/vt-hd-94-p1',
    'vt-statehouse-94-p2': '/district/vt-hd-94-p2',
    'vt-statehouse-95': '/district/vt-hd-95',
    'vt-statehouse-96': '/district/vt-hd-96',
    'vt-statehouse-97-p1': '/district/vt-hd-97-p1',
    'vt-statehouse-97-p2': '/district/vt-hd-97-p2',
    'vt-statehouse-98-p1': '/district/vt-hd-98-p1',
    'vt-statehouse-98-p2': '/district/vt-hd-98-p2',
    'vt-statehouse-99': '/district/vt-hd-99',
    'vt-statehouse-100-p1': '/district/vt-hd-100-p1',
    'vt-statehouse-100-p2': '/district/vt-hd-100-p2',
    'vt-statehouse-101': '/district/vt-hd-101',
    'vt-statehouse-102-p1': '/district/vt-hd-102-p1',
    'vt-statehouse-102-p2': '/district/vt-hd-102-p2',
    'vt-statehouse-103': '/district/vt-hd-103',
    'vt-statehouse-104': '/district/vt-hd-104',
    'vt-statehouse-105-p1': '/district/vt-hd-105-p1',
    'vt-statehouse-105-p2': '/district/vt-hd-105-p2',
    'vt-statehouse-106': '/district/vt-hd-106',
    'vt-statehouse-107': '/district/vt-hd-107',
    'vt-statehouse-108': '/district/vt-hd-108',
    'vt-statehouse-109-p1': '/district/vt-hd-109-p1',
    'vt-statehouse-109-p2': '/district/vt-hd-109-p2',
    'vt-statesenate-1-p1': '/district/vt-sd-1-p1',
    'vt-statesenate-1-p2': '/district/vt-sd-1-p2',
    'vt-statesenate-2-p1': '/district/vt-sd-2-p1',
    'vt-statesenate-2-p2': '/district/vt-sd-2-p2',
    'vt-statesenate-3': '/district/vt-sd-3',
    'vt-statesenate-4-p1': '/district/vt-sd-4-p1',
    'vt-statesenate-4-p2': '/district/vt-sd-4-p2',
    'vt-statesenate-4-p3': '/district/vt-sd-4-p3',
    'vt-statesenate-5': '/district/vt-sd-5',
    'vt-statesenate-6-p1': '/district/vt-sd-6-p1',
    'vt-statesenate-6-p2': '/district/vt-sd-6-p2',
    'vt-statesenate-6-p3': '/district/vt-sd-6-p3',
    'vt-statesenate-7': '/district/vt-sd-7',
    'vt-statesenate-8-p1': '/district/vt-sd-8-p1',
    'vt-statesenate-8-p2': '/district/vt-sd-8-p2',
    'vt-statesenate-9': '/district/vt-sd-9',
    'vt-statesenate-10': '/district/vt-sd-10',
    'vt-statesenate-11': '/district/vt-sd-11',
    'vt-statesenate-12': '/district/vt-sd-12',
    'vt-statesenate-13-p1': '/district/vt-sd-13-p1',
    'vt-statesenate-13-p2': '/district/vt-sd-13-p2',
    'vt-statesenate-13-p3': '/district/vt-sd-13-p3',
    'vt-statesenate-14-p1': '/district/vt-sd-14-p1',
    'vt-statesenate-14-p2': '/district/vt-sd-14-p2',
    'vt-statesenate-14-p3': '/district/vt-sd-14-p3',
    'vt-statesenate-15-p1': '/district/vt-sd-15-p1',
    'vt-statesenate-15-p2': '/district/vt-sd-15-p2',
    'vt-statesenate-16-p1': '/district/vt-sd-16-p1',
    'vt-statesenate-16-p2': '/district/vt-sd-16-p2',
    'vt-statesenate-16-p3': '/district/vt-sd-16-p3',
    'wa-statesenate-26': '/district/wa-sd-26',
    'wa-statesenate-35': '/district/wa-sd-35',
    'wa-statehouse-10-p1': '/district/wa-hd-10-p1',
    'wa-statehouse-10-p2': '/district/wa-hd-10-p2',
    'wa-statehouse-17-p1': '/district/wa-hd-17-p1',
    'wa-statehouse-17-p2': '/district/wa-hd-17-p2',
    'wa-statehouse-18-p1': '/district/wa-hd-18-p1',
    'wa-statehouse-18-p2': '/district/wa-hd-18-p2',
    'wa-statehouse-26-p1': '/district/wa-hd-26-p1',
    'wi-statesenate-17': '/district/wi-sd-17',
    'wi-statesenate-31': '/district/wi-sd-31',
    'wi-statehouse-26': '/district/wi-hd-26',
    'wi-statehouse-30': '/district/wi-hd-30',
    'wi-statehouse-51': '/district/wi-hd-51',
    'wi-statehouse-61': '/district/wi-hd-61',
    'wi-statehouse-85': '/district/wi-hd-85',
    'wi-statehouse-88': '/district/wi-hd-88',
    'wi-statehouse-89': '/district/wi-hd-89',
    'wi-statehouse-91': '/district/wi-hd-91',
    'wi-statehouse-92': '/district/wi-hd-92',
    'wi-statehouse-94': '/district/wi-hd-94',
    // @generated district-boards end
  };

  // The state name the saved location stores → the postal code a seat key is
  // composed with. MIRRORED, spelling for spelling, from district-room.js's
  // STATE_CODE — the suite holds the two copies to one answer — because this
  // file loads as a plain script and cannot import it. A state that is not in
  // this table composes no seat key, which is the honest answer for a state
  // whose legislative districts this app does not draw.
  var STATE_CODE = { utah: 'ut' };

  // THE STATES THIS LANE ACCEPTS A CLAIM FROM, and the prefix a claimed seat key
  // is composed with. Both mirrored from netlify/lib/district-voice-core.mjs —
  // VOICE_STATES and the `ut-statehouse-${n}` seatFromLocation() composes —
  // rather than imported, because this file loads as a plain script. The suite
  // holds the two copies to one answer. Utah only in this pass, for the reason
  // DISTRICT_MAPS.md gives: the app resolves legislative districts in Utah and
  // nowhere else, and a claim for a district the app cannot resolve is a
  // confidently wrong district.
  var VOICE_STATES = ['UT'];
  var SEAT_STATE = 'ut';

  var TAKE_MAX = 280;
  var TAKES_CAP = 20;

  var COPY = {
    kick: 'District Voice',
    // REQUIRED ON THE FILE, verbatim. Rendered unconditionally by render(), so
    // the block cannot paint without it.
    frame: 'Verified neighbors. Not a poll of the internet. Not how the member voted.',
    pollHd: 'One live question',
    pollCounts: 'Answers so far',
    takesHd: 'Neighbor takes',
    takesNote: 'Newest first. One short take, keyed to an issue this seat touches.',
    weekHd: 'This week',
    // Three states, three sentences. See netlify/lib/district-voice-core.mjs,
    // which owns these strings; {issue} is filled here with the issue's printed
    // label, because the label lives in this file's issue vocabulary.
    weekBusy: 'Checking this seat\u2019s formal record on {issue}\u2026',
    weekNone: 'The record holds no formal act on {issue} for this seat.',
    weekUnread: 'We could not read this seat\u2019s formal record just now.',
    emptyTakes: 'No takes yet. Nobody has posted in this seat.',
    emptyNeighbors: 'No verified neighbors in this seat yet.',
    // THE ONE SENTENCE A ZERO-ANSWER QUESTION GETS. Three zeroes, "no answers"
    // and "no verified neighbors" stacked under one question were three ways of
    // saying nothing, and a reader had to read all three to learn it once. See
    // pollHtml() for which two stopped being printed.
    emptyAnswers: 'No answers yet.',
    busy: 'Reading this seat…',
    gone: 'We could not reach this seat’s Voice.',
    composeHd: 'Post a take',
    composePh: 'One short take, in your own words.',
    composeIssue: 'Issue',
    send: 'Post',
    sending: 'Posting…',
    sent: 'Posted.',
    answerSent: 'Answer recorded.',
    signIn: 'Sign in and set your ballot location to post here. Reading stays open.',
    // ── THE HALLWAY'S FOUR SENTENCES ───────────────────────────────────────
    // /voice prints these and so does /me's snapshot, so the desk and the
    // hallway cannot describe one reader's seat two different ways.
    //
    // "ON HAND", NEVER "YET". A board we have not built is not a board that is
    // coming — "yet" is a promise this app has not made, and the absence
    // grammar everywhere else in the record ("no formal record on file", "no
    // citable address on hand") is the same refusal. AND THERE IS NO 0/0 TABLE:
    // a seat with no board prints two sentences and a person link, never an
    // empty poll with three zeroes in it pretending to be a room.
    hubHd: 'District Voice is the rooms for your seats. This room is only the people who ' +
      'live in the seat. Neighbors read the same record and speak to that seat, not the ' +
      'internet. Anyone can read. Only a verified resident of that seat gets a voice that ' +
      'counts. This page lists the seats for the location on file.',
    boardOpen: 'Open board',
    // Under the Open board door on a boarded seat's card, and on that board
    // under its general room. Never on a seat without a board.
    boardRoomFor: 'This room is for the people who live in this district. Outside noise stays outside.',
    boardNone: 'Board not on hand for this seat.',
    boardWhy: 'we have the seat; this room is not open.'
  };

  function fn(x) { return typeof x === 'function'; }
  // ── THE ISSUE'S OWN COLOUR, BORROWED AND NEVER INVENTED ───────────────────
  // PDXIssueColors is the app's one answer to "what colour is this issue", and
  // it hands back the whole ` data-ic="on" style="--pdx-ic:…"` fragment ready to
  // drop inside an opening tag. A key that lands on no Core National Issue gets
  // an EMPTY fragment by that module's own design, and a boot without the module
  // gets one too — so the rail is a recognition aid that is simply absent when
  // there is nothing to recognise, never a neutral slate pretending to be one.
  //
  // A COLOUR IS NOT A VERDICT. It says "this is the lands take", never "this
  // take is right". Nothing downstream reads it, and no rule in the sheet lets a
  // count reach it.
  function icAttr(key) {
    try {
      var C = window.PDXIssueColors;
      if (!C || !fn(C.skin)) return '';
      var sk = C.skin(String(key == null ? '' : key), window.PDXIssueFamily);
      return (sk && sk.attr) ? String(sk.attr) : '';
    } catch (e) { return ''; }
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function el(id) { try { return document.getElementById(id); } catch (e) { return null; } }

  // ── THE ADDRESS ───────────────────────────────────────────────────────────
  // Every spelling in, ONE spelling out. Every caller starts here, so an alias
  // never reaches a request and the server only ever sees the canonical key.
  function normalizeSeatKey(raw) {
    var s = String(raw == null ? '' : raw).trim().toLowerCase();
    if (!s) return '';
    if (SEAT_KEY_RE.test(s)) return s;
    var m = ALIAS_RE.exec(s);
    if (!m) return '';
    var chamber = ALIAS_CHAMBERS[m[2]];
    if (!chamber) return '';
    var out = m[1] + '-' + chamber + '-' + m[3];
    return SEAT_KEY_RE.test(out) ? out : '';
  }
  function isAlias(raw) {
    var s = String(raw == null ? '' : raw).trim().toLowerCase();
    return !!s && !SEAT_KEY_RE.test(s) && !!normalizeSeatKey(s);
  }
  // Does this seat have a Voice? The one question the chrome asks before it
  // prints a control pointing here.
  function shipped(seatKey) {
    var k = normalizeSeatKey(seatKey);
    return !!k && Object.prototype.hasOwnProperty.call(VOICE_SEATS, k);
  }
  function path(seatKey) {
    var k = normalizeSeatKey(seatKey);
    return shipped(k) ? '/d/' + k : '';
  }

  // Does this seat have a BOARD at its own address, and what is it? '' for every
  // seat that does not — which is every seat but four — and '' is what a hallway
  // prints the empty grammar for rather than a door onto nothing. The ONE owner
  // of this question: a caller that built '/district/' + alias itself would be a
  // second answer, and the first thing a second answer does is outlive the row
  // that netlify.toml actually rewrites.
  // A seat elected by position (Washington's House), <code>-statehouse-<n>-p<k>,
  // alias <code>-hd-<n>-p<k>: a third shape BOARD_ROUTES accepts, beside the
  // statewide one, and like it never a /d/ seat key. Vermont's Senate elects by
  // position too, on the same shape: <code>-statesenate-<n>-p<k>, alias
  // <code>-sd-<n>-p<k>.
  var POSITION_KEY_RE = /^[a-z]{2}-state(?:house|senate)-[1-9][0-9]*-p[1-9]$/;
  function positionBoardKey(raw) {
    var s = String(raw == null ? '' : raw).trim().toLowerCase();
    if (POSITION_KEY_RE.test(s)) return s;
    var m = /^([a-z]{2})-(hd|sd)-([1-9][0-9]*)-(p[1-9])$/.exec(s);
    return m ? m[1] + '-' + (m[2] === 'sd' ? 'statesenate' : 'statehouse') + '-' + m[3] + '-' + m[4] : '';
  }
  function boardPath(seatKey) {
    var k = normalizeSeatKey(seatKey) || statewideBoardKey(seatKey) || positionBoardKey(seatKey);
    return (k && Object.prototype.hasOwnProperty.call(BOARD_ROUTES, k)) ? BOARD_ROUTES[k] : '';
  }

  // ── THE STATEWIDE BOARD KEYS, AND THEY ARE NOT SEAT KEYS ──────────────────
  // The governor and both U.S. Senate seats have boards now, and they are still
  // not districts: SEAT_KEY_RE, VOICE_SEATS and every /d/ address are untouched
  // by them, and seatKeyForLevel() still composes '' for a statewide level. This
  // is the second, separate shape BOARD_ROUTES accepts — `ut-gov`, and
  // `ut-us-senate-<pid>` for a Senate seat, keyed by the member who holds it
  // because the two seats are the same office twice and the resolver lists them
  // in no stable order. A shape, not a list: a statewide key with no row in
  // BOARD_ROUTES is a card that says the room is not open.
  var STATEWIDE_KEY_RE = /^[a-z]{2}-(?:gov|us-senate-[a-z][a-z0-9_]*)$/;
  function statewideBoardKey(raw) {
    var s = String(raw == null ? '' : raw).trim().toLowerCase();
    return STATEWIDE_KEY_RE.test(s) ? s : '';
  }
  // A statewide level's board key, or ''. Composed only through STATE_CODE, so
  // it is Utah's or nobody's. The governor's key is the seat's; a Senate seat's
  // needs the pid seatPidFor() already seated on the card, and a Senate card
  // with no holder resolved composes nothing — there is no way to say WHICH of
  // the two rooms it would open.
  function statewideKeyForLevel(level, stateName, pid) {
    if (!level || !level.statewide) return '';
    var st = String(stateName == null ? '' : stateName).trim().toLowerCase();
    var code = STATE_CODE[st] || '';
    if (!code) return '';
    var seat = String((level.seat || level.key) || '').trim().toLowerCase();
    if (seat === 'governor') return statewideBoardKey(code + '-gov');
    if (seat === 'senate') {
      var p = String(pid == null ? '' : pid).trim().toLowerCase();
      return p ? statewideBoardKey(code + '-us-senate-' + p) : '';
    }
    return '';
  }
  // ── THE U.S. HOUSE AND U.S. SENATE BOARD KEYS, IN EVERY STATE ─────────────
  // Every state's congressional and Senate seats can have a board now, and a
  // reader's location is the state's own name, so the hallway needs that name's
  // postal code to compose the key. THIS IS NOT STATE_CODE. STATE_CODE is the
  // one state whose LEGISLATIVE lines this app draws, and it still gates every
  // State House, State Senate and governor key; this table composes exactly two
  // shapes — `<code>-house-<n>` for a U.S. House card and `<code>-us-senate-<pid>`
  // for a Senate card — and nothing else. The suite holds it equal to the
  // generator's FEDERAL_STATES plus Utah. A key with no BOARD_ROUTES row is
  // still a card that says the room is not open.
  var FEDERAL_STATE_CODE = {
    alabama: 'al', alaska: 'ak', arizona: 'az', arkansas: 'ar', california: 'ca',
    colorado: 'co', connecticut: 'ct', delaware: 'de', florida: 'fl',
    georgia: 'ga', hawaii: 'hi', idaho: 'id', illinois: 'il', indiana: 'in',
    iowa: 'ia', kansas: 'ks', kentucky: 'ky', louisiana: 'la', maine: 'me',
    maryland: 'md', massachusetts: 'ma', michigan: 'mi', minnesota: 'mn',
    mississippi: 'ms', missouri: 'mo', montana: 'mt', nebraska: 'ne', nevada: 'nv',
    'new hampshire': 'nh', 'new jersey': 'nj', 'new mexico': 'nm',
    'new york': 'ny', 'north carolina': 'nc', 'north dakota': 'nd', ohio: 'oh',
    oklahoma: 'ok', oregon: 'or', pennsylvania: 'pa', 'rhode island': 'ri',
    'south carolina': 'sc', 'south dakota': 'sd', tennessee: 'tn', texas: 'tx',
    utah: 'ut', vermont: 'vt', virginia: 'va', washington: 'wa',
    'west virginia': 'wv', wisconsin: 'wi', wyoming: 'wy'
  };
  // A U.S. House or U.S. Senate level's board key, or ''. A Senate card needs
  // the pid seatPidFor() seated on it, for the reason statewideKeyForLevel()
  // gives; a House card needs only its district number, because the board asks
  // _pdxUsHouseSeat() for its own holder.
  function federalKeyForLevel(level, stateName, pid) {
    if (!level) return '';
    var st = String(stateName == null ? '' : stateName).trim().toLowerCase();
    var code = Object.prototype.hasOwnProperty.call(FEDERAL_STATE_CODE, st) ? FEDERAL_STATE_CODE[st] : '';
    if (!code) return '';
    var seat = String((level.seat || level.key) || '').trim().toLowerCase();
    if (level.statewide) {
      if (seat !== 'senate') return '';
      var p = String(pid == null ? '' : pid).trim().toLowerCase();
      return p ? statewideBoardKey(code + '-us-senate-' + p) : '';
    }
    if (seat !== 'house') return '';
    var num = String(level.district == null ? '' : level.district).replace(/[^0-9]/g, '');
    if (!num || num === '0') return '';
    return normalizeSeatKey(code + '-house-' + String(parseInt(num, 10)));
  }
  function boarded(seatKey) { return !!boardPath(seatKey); }
  function seatNumber(seatKey) {
    var k = normalizeSeatKey(seatKey);
    var m = /-([0-9]+)$/.exec(k);
    return m ? m[1] : '';
  }

  // ── THE VENDOR SEAM, AND IT IS UNUSED ─────────────────────────────────────
  // Stripe Identity / Veriff land here. Called by nothing in this repo: there is
  // no upload, no third-party round trip and NO CHARGE in this pass. It REJECTS
  // rather than resolving false so that wiring a vendor in has to be deliberate.
  function verify() {
    return Promise.reject(new Error('district-voice: no identity vendor is wired in this pass'));
  }

  // ── THE CALLER ────────────────────────────────────────────────────────────
  // Firebase's own handle, and NEVER an anonymous one: an anonymous session is a
  // browser, not a neighbour, and a per-browser uid must not be able to hold a
  // seat's residency.
  function fbAuth() {
    try { if (window.auth) return window.auth; } catch (e) {}
    return null;
  }
  function tokenUser() {
    var a = fbAuth();
    var cu = a && a.currentUser;
    if (!cu || cu.isAnonymous === true || !fn(cu.getIdToken)) return null;
    return cu;
  }
  // Resolves a token, or null when there is nobody to mint one for AND when the
  // mint itself fails. Null is not "signed out" to the caller — it just means the
  // request goes out unauthenticated, which for a READ is the normal case.
  function bearer(fresh) {
    var u = tokenUser();
    if (!u) return Promise.resolve(null);
    try {
      return Promise.resolve(u.getIdToken(!!fresh)).then(
        function (t) { return t || null; },
        function () { return null; }
      );
    } catch (e) { return Promise.resolve(null); }
  }

  function call(suffix, opts, fresh) {
    var o = opts || {};
    return bearer(fresh).then(function (t) {
      var headers = { 'Accept': 'application/json' };
      if (o.body) headers['Content-Type'] = 'application/json';
      if (t) headers['Authorization'] = 'Bearer ' + t;
      return fetch(API + (suffix || ''), {
        method: o.method || 'GET',
        headers: headers,
        body: o.body ? JSON.stringify(o.body) : undefined
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok, status: res.status, data: data || {} };
        });
      });
    }).catch(function () { return { ok: false, status: 0, data: {} }; });
  }

  // One retry, and only on a 401 for a reader we DO hold a handle for: that is a
  // stale token rather than a signed-out reader, so we mint a fresh one and ask
  // exactly once more instead of printing the signed-out sentence at somebody who
  // is signed in.
  function api(suffix, opts) {
    return call(suffix, opts, false).then(function (res) {
      if (res.status !== 401 || !tokenUser()) return res;
      return call(suffix, opts, true);
    });
  }

  // ── THE CLAIM ─────────────────────────────────────────────────────────────
  // The reader's OWN saved ballot location, read through pdxRepsForMe() — the
  // app's one resolver — so this file never becomes a second answer about where
  // somebody lives. Three fields, and they are the same three on the read and on
  // every write, so the claim that painted the composer is the claim the write is
  // judged on.
  //
  // Returns {} when there is no location. That is the fail-closed case and it is
  // sent as nothing rather than as a guess.
  function claim() {
    var out = { state: '', county: '', houseDistrict: '' };
    var loc = null;
    try { loc = window._currentVoterLocation || null; } catch (e) { loc = null; }
    var reps = null;
    try { reps = fn(window.pdxRepsForMe) ? window.pdxRepsForMe() : null; } catch (e) { reps = null; }

    out.state = String((reps && reps.state) || (loc && loc.state) || '');
    // The county the curated area resolved to, published by the resolver for
    // exactly this reason. _currentVoterLocation is the fallback, not the source.
    out.county = String((reps && reps.county) || (loc && loc.county) || '');

    var n = '';
    try {
      var levels = (reps && reps.levels) || [];
      for (var i = 0; i < levels.length; i++) {
        var lv = levels[i];
        if (lv && !lv.statewide && String(lv.seat || lv.key) === 'statehouse' && lv.district != null) {
          n = String(lv.district).replace(/[^0-9]/g, '');
          break;
        }
      }
    } catch (e) {}
    if (!n && loc) n = String(loc.stateHouseDistrict == null ? '' : loc.stateHouseDistrict).replace(/[^0-9]/g, '');
    out.houseDistrict = n;

    if (!out.state || !out.county || !out.houseDistrict) return {};
    return out;
  }

  // ── THE STATE THE CLAIM IS ALLOWED FROM ───────────────────────────────────
  // The core's stateAllowed(), spelled the same way: the saved location stores
  // either the postal code or the state's name, and both are the same state.
  function stateAllowed(state) {
    var st = String(state == null ? '' : state).trim().toLowerCase();
    if (!st) return false;
    if (st === 'utah') return true;
    return VOICE_STATES.indexOf(st.toUpperCase()) >= 0;
  }

  // ── THE READER'S OWN SEAT, FROM THE READER'S OWN SAVED LOCATION ───────────
  // claim() answers "where did this reader say they vote"; this answers "which
  // seat is that", and it is the ONE owner of that step on the client. A caller
  // that composed a seat key itself would be a second district map, which is the
  // exact defect claim() exists to avoid.
  //
  // IT IS NOT A VERIFICATION AND IT DOES NOT CLAIM TO BE. It returns the
  // canonical seat key the reader's saved state and State House district
  // compose to, or '' — and '' is the answer for no location, no district, a
  // state this lane does not accept, and a number that is not a seat. Whether
  // VOICE is OPEN in that seat is shipped()'s question and not this one, and
  // whether the SERVER will honour the claim is the server's: the gate in
  // netlify/lib/district-voice-core.mjs additionally checks that the claimed
  // county actually contains the claimed district, which is a table this file
  // does not carry and must not grow. So a surface may say "this is the seat
  // your saved location names" on this answer; the board itself is still where
  // the composer opens or does not.
  function seatForMe() {
    var c = {};
    try { c = claim() || {}; } catch (e) { c = {}; }
    if (!c.state || !c.county || !c.houseDistrict) return '';
    if (!stateAllowed(c.state)) return '';
    return normalizeSeatKey(SEAT_STATE + '-statehouse-' + c.houseDistrict);
  }

  // ── EVERY SEAT THE SAVED LOCATION RESOLVES, NOT "YOUR DISTRICT" ────────────
  // seatForMe() answers ONE seat, the State House one, because the /d/ lane is
  // keyed on it. /voice is not that lane: it is the hallway for the whole of
  // what this reader's location already named — state House, state Senate, U.S.
  // House, both U.S. Senate seats and the governor — and every one of those
  // comes from pdxRepsForMe(), the app's one resolver. NOTHING HERE RESOLVES A
  // LOCATION. This walks the levels that resolver already published and decides
  // two things per level: what the seat is called, and whether a board opens.
  //
  // A LEVEL'S SEAT KEY, or ''. The same composition district-room.js's
  // districtKeyFor() does, in the same order, and it is deliberately the only
  // arithmetic in this function: state name → code, chamber → canonical
  // chamber, district → digits. A statewide row composes nothing, which is
  // correct and not a miss — the U.S. Senate and the governor are not districts
  // and can never have a district board. normalizeSeatKey() is the chamber gate,
  // so there is no second list of chamber names here.
  function seatKeyForLevel(level, stateName) {
    if (!level || level.statewide) return '';
    var st = String(stateName == null ? '' : stateName).trim().toLowerCase();
    var code = STATE_CODE[st] || '';
    var seat = String((level.seat || level.key) || '').trim().toLowerCase();
    var num = String(level.district == null ? '' : level.district).replace(/[^0-9]/g, '');
    if (!code || !seat || !num || num === '0') return '';
    return normalizeSeatKey(code + '-' + seat + '-' + String(parseInt(num, 10)));
  }

  // ── WHO SITS IN THIS SEAT, FROM THE JOINS WHO REPRESENTS ME ALREADY USES ───
  // pdxRepsForMe() resolves the member for every level it publishes, and where
  // it can it hands the pid down on the level itself. On a LEAN DOCUMENT it
  // often cannot, and the reason is never that the seat is vacant:
  //
  //   · The two legislative lanes end at window.pdxSeatedMemberFor(), which is
  //     declared inside ballot-breakdown.js — 407 KB voice.html does not load.
  //     The call site was on the page, the function was not, and the resolver
  //     failed soft to null exactly as it is written to. So the hallway printed
  //     "No sitting member on hand for this seat" under an Open board door for
  //     HD-16 and SD-7, seats whose own boards name Trevor Lee and Stuart
  //     Adams. seated-member.js is that one lookup lifted out, ~4 KB of it, on
  //     the same terms profile-alias.js is already on this document.
  //   · The congressional lane ends at window._pdxUsHouseSeat(), which IS on
  //     this page — but it needs the roster, and the roster arrives with
  //     Firebase. A walk taken before it lands resolves nobody and nothing was
  //     asking again per seat.
  //
  // SO THE LEVEL'S OWN PID STILL WINS AND THIS IS ONLY EVER CONSULTED WHEN IT
  // IS BLANK. Nothing here can overrule the resolver, re-seat a level it
  // resolved, or answer for a seat it did not publish; the only thing it can do
  // is fill a blank the resolver itself would have filled on a fatter document.
  //
  // AND IT LIVES HERE RATHER THAN ONLY IN THE RESOLVER BECAUSE OF THE CACHE.
  // pdxRepsForMe() asks both of these joins itself, and on a first load that is
  // the end of it — the fill below finds nothing to do, which is correct. The
  // two files do not arrive together, though: voice.html, district-voice.js,
  // voice-room.js, seated-member.js and profile-alias.js are PRECACHED shell
  // assets, swapped as a set when CACHE_VERSION moves, while
  // voter-hub-location.js is RUNTIME-cached and unversioned (sw.js says so, in
  // those words, and says why). A warm device can therefore run this pass's
  // hallway against a resolver copy that predates the lane which asks
  // pdxSeatedMemberFor() at all — and the reader would see the empty sentence
  // under an open board door on a build that fixed it. The seat list's owner
  // asking the joins itself is what makes the answer not depend on which copy
  // of another module the cache handed over.
  //
  // TWO LANES, AND THEY ARE NOT INTERCHANGEABLE:
  //
  //   U.S. HOUSE → window._pdxUsHouseSeat(state, district), asked with the
  //   ROSTER'S OWN STATE STRING — reps.state, which is 'Utah', never 'UT'. That
  //   join matches on the district-qualified `state` field the roster records
  //   ("Utah · District 2", "Missouri · MO-5"), and _pdxStateName() reduces
  //   'UT' to "ut", which matches no record ever written. It is the only join
  //   asked for this lane: the curated congressional table seated-member.js
  //   carries is NOT consulted here, because a written-down congressional pid is
  //   a second answer to a question a court-ordered map can change, and the
  //   first thing a second answer does is outlive a redistricting. This lane is
  //   therefore NOT gated on the seat key — a Missouri reader's CD is a seat the
  //   federal roster can name, and it composes no seat key because this app does
  //   not draw Missouri's legislative lines.
  //
  //   STATE HOUSE / STATE SENATE → window.pdxSeatedMemberFor(seatKey, n), and
  //   this lane IS gated on the seat key, which is the whole of its state gate.
  //   That table is keyed on a district NUMBER inside a chamber and carries no
  //   state of its own, so asked bare it would answer 'tlee' for House District
  //   16 in any state on earth. seatKeyForLevel() composes a key only through
  //   STATE_CODE, which holds the one state whose legislative districts this app
  //   resolves — so a Missouri State House card asks nothing, names nobody, and
  //   keeps the honest empty sentence.
  //
  // AND '' IS AN ANSWER. An absent module, a cold roster and an empty join all
  // return '', the card prints the empty sentence, and there is no branch below
  // that can reach for a name from anywhere else.
  // AND THE GATE ON A JOINED PID IS THE RESOLVER'S, NOT A SECOND, STRICTER ONE.
  // pdxRepsForMe() decides which pids survive — _pdxRosterKeeps() is what
  // un-names a seat, and an empty roster is explicitly a page mid-load rather
  // than a resignation. Its own seated() lane hands down a district-table pid
  // without re-asking that gate, and the fill below stands in for exactly that
  // lane, so it does not re-ask it either. A stricter rule here would be the
  // same defect this pass is fixing, pointed the other way: the card would name
  // the member with one cached copy of the resolver and report a vacancy with
  // the other, and the reader would have no way to tell which they got. Policy
  // about who still holds a seat belongs to the resolver, in one file.
  function joinedPid(level, seatKey, stateName) {
    if (!level || level.statewide) return '';
    var n = String(level.district == null ? '' : level.district).replace(/[^0-9]/g, '');
    if (!n || n === '0') return '';
    var seat = String((level.seat || level.key) || '').trim().toLowerCase();
    var pid = '';
    if (seat === 'house') {
      try {
        if (!fn(window._pdxUsHouseSeat)) return '';
        pid = String(window._pdxUsHouseSeat(stateName, n) || '');
      } catch (e) { return ''; }
    } else {
      if (!seatKey) return '';
      try {
        if (!fn(window.pdxSeatedMemberFor)) return '';
        pid = String(window.pdxSeatedMemberFor(seatKey, n) || '');
      } catch (e2) { return ''; }
    }
    return pid;
  }

  // ── AND A PID FROM ANOTHER NUMBER CANNOT SIT ON THIS CARD ──────────────────
  // A card here is keyed by CHAMBER + NUMBER. It prints "State Senate District
  // 7", it opens a door into District 7's board, and the one thing it may not do
  // is name somebody who holds District 6 — which is exactly what it did. Inside
  // Utah the resolver's first source for a legislative pid is the CURATED COUNTY
  // SLATE, and a slate is a file about an election in a county rather than a map
  // of a district: Layton is HD-16 / SD-7, the Davis slate carries Jerry
  // Stevenson (SD-6) and Ariel Defay (HD-15), and so the District 7 card read
  // "Sitting member: Jerry Stevenson" above a board door into Stuart Adams's
  // room while Stevenson's own file, one tap away, said District 6. The District
  // 16 card printed "The member who holds this seat is on file" over Defay's
  // nameless row while the board beside it was Trevor Lee's.
  //
  // SO THE RESOLVER'S PID IS STILL READ FIRST, AND IT IS NOW READ WITH THE CARD'S
  // KEY IN HAND. window.pdxSeatClaim() — published by the resolver, beside the
  // congressional join, and the same read for every surface — says whether the
  // record that pid names claims this chamber and this number. Three answers,
  // and each one has exactly one honest move:
  //
  //   'mismatch' → DROP IT, AND NEVER PUT IT BACK. The card's key is a fact
  //     about the reader's address; the pid is a guess about an election. Nothing
  //     below may restore a dropped pid, and the empty sentence is a better
  //     answer than a confident wrong name.
  //   'match', and the record can be NAMED → keep it. This is the ordinary case
  //     and the resolver stays in charge of it.
  //   'unknown', or a match on a row too thin to name → ask the district table,
  //     and prefer its answer where it has one. A nameless row is the shape that
  //     produced "member on file" with no name, and the table's pid is the one
  //     keyed on this card's own chamber and number. Where the table has nothing
  //     the original pid is KEPT, because 'unknown' is a cold roster or a
  //     flattened payload, never a finding that somebody does not hold a seat —
  //     and a pid we cannot name yet still prints the "on file" sentence with a
  //     working door to the person file.
  //
  // WHY THE NAME IS WEIGHED HERE AND NOT IN joinedPid(). Two different questions
  // wearing the same word. joinedPid() must not re-ask whether a pid still holds
  // a seat — that ruling is the resolver's, made in one file (see above, and the
  // suite fences it). This asks whether the row the hallway is about to hand the
  // printer can be printed AS A NAME, which is the printer's own gate
  // (voice-room.js keeps only a lane that can name, and falls back to "on file"),
  // and the answer decides only whether a second, better-keyed lookup is worth
  // taking. It can never un-name a seat: the worst it does is swap a pid the
  // card could not name for one it can.
  //
  // AND A MISSING pdxSeatClaim IS 'unknown', NOT AN EXCUSE TO KEEP EVERYTHING.
  // voter-hub-location.js is runtime-cached and unversioned while this file is a
  // precached shell asset, so a warm device can run this pass's hallway against
  // a resolver copy that has never heard of this read. That copy degrades to
  // 'unknown' on every seat, the district table is asked for every card that has
  // a seat key, and the table is keyed on chamber and number — so the Layton
  // cards come out right anyway, by the longer road.
  function claimOf(pid, key, n) {
    try {
      if (!fn(window.pdxSeatClaim)) return 'unknown';
      return String(window.pdxSeatClaim(pid, key, n) || 'unknown');
    } catch (e) { return 'unknown'; }
  }

  // Can this pid be printed as a name on this document? The same roster read
  // voice-room.js prints from, asked once here so a nameless row can be improved
  // on rather than printed as "on file" beside a board that knows the name.
  function nameable(pid) {
    try {
      if (fn(window.pdxRosterName)) return !!window.pdxRosterName(pid);
      if (!fn(window.pdxRosterRec)) return false;
      var rec = window.pdxRosterRec(pid);
      return !!(rec && String(rec.name == null ? '' : rec.name).trim());
    } catch (e) { return false; }
  }

  function foreignLegislator(level, pid, stateName) {
    var seat = String((level && (level.seat || level.key)) || '').toLowerCase();
    if (seat !== 'statesenate' && seat !== 'statehouse') return false;
    var st = String(stateName == null ? '' : stateName).trim().toLowerCase();
    if (!st || st === 'utah') return false;
    var rec = null;
    try { if (fn(window.pdxRosterRec)) rec = window.pdxRosterRec(pid) || null; } catch (e) { rec = null; }
    try { if (!rec && window.CMP_DATA && window.CMP_DATA[pid]) rec = window.CMP_DATA[pid]; } catch (e2) {}
    var rs = rec ? String(rec.state == null ? '' : rec.state).split('\u00b7')[0].trim().toLowerCase() : '';
    return !!rs && rs !== st;
  }

  // THE ONE WALK FROM A RESOLVED LEVEL TO THE PID THAT MAY SIT ON ITS CARD.
  // Exported, because who-represents-me.js prints the same seats from the same
  // levels and took the same pid on sight; two copies of this would be two
  // different answers about who the reader's senator is, on two pages, in the
  // same visit.
  function seatPidFor(level, stateName, seatKey) {
    if (!level) return '';
    var key = seatKey == null ? seatKeyForLevel(level, stateName) : seatKey;
    var n = level.statewide ? '' : String(level.district == null ? '' : level.district).replace(/[^0-9]/g, '');
    var pid = String(level.pid == null ? '' : level.pid);
    // A STATEWIDE ROW HAS NO NUMBER TO DISAGREE WITH. Both U.S. Senate seats and
    // the governor are held statewide; there is no card key to check a claim
    // against and nothing here may touch those pids.
    // A LEGISLATIVE SEAT IS HELD IN ONE STATE. pdxSeatClaim() weighs chamber and
    // number and has no state to weigh, and "UT District 16" agrees with House
    // District 16 in every state that has one. Outside Utah, whose roster
    // writes its legislators "UT District N", a record that names a different
    // state cannot sit on this card. A record that names no state says nothing
    // and is left to the claim below.
    if (pid && !level.statewide && n && foreignLegislator(level, pid, stateName)) pid = '';
    if (pid && !level.statewide && n) {
      var claim = claimOf(pid, key || String((level.seat || level.key) || ''), n);
      if (claim === 'mismatch') {
        pid = '';
      } else if (claim !== 'match' || !nameable(pid)) {
        var better = joinedPid(level, key, stateName);
        if (better) pid = better;
      }
    }
    if (!pid) pid = joinedPid(level, key, stateName);
    return pid;
  }

  // ── WHO SITS IN IT, AS A NAME ─────────────────────────────────────────────
  // The display name for a seated pid, through the same roster read the board
  // and the hallway print from: pdxRosterName() where the resolver is on the
  // document, weighing whatever record a bundled reader already holds, and that
  // record's own name where it is not. '' when nothing here can name the pid —
  // never the pid itself, so a key cannot reach a seat line.
  function holderName(pid) {
    var id = String(pid == null ? '' : pid).trim();
    if (!id) return '';
    var held = null;
    try { if (fn(window._pdxPersonById)) held = window._pdxPersonById(id) || null; } catch (e) { held = null; }
    try { if (!held && window.CMP_DATA && window.CMP_DATA[id]) held = window.CMP_DATA[id]; } catch (e2) {}
    try { if (!held && window.PROFILES && window.PROFILES[id]) held = window.PROFILES[id]; } catch (e3) {}
    try {
      if (fn(window.pdxRosterName)) return String(window.pdxRosterName(id, held) || '').trim();
    } catch (e4) {}
    try {
      if (!held && fn(window.pdxRosterRec)) held = window.pdxRosterRec(id) || null;
    } catch (e5) { held = null; }
    var n = (held && held.name != null) ? String(held.name).trim() : '';
    return n === id ? '' : n;
  }

  // THE SEAT LINE, ONE WORDING FOR /me AND /voice. A seat with a board and a
  // nameable holder reads "<chamber> District <n> · <member>" — the seat and who
  // holds it, so a reader does not have to open the board to learn whose room it
  // is. A statewide seat reads "<office> · <member>", the board's own heading.
  // A seat with no board keeps its plain name and never carries a person: a
  // name beside a seat with no room would read as a door that is not there. A
  // boarded seat the roster cannot name yet keeps its plain name too, rather
  // than a guess.
  function seatLine(s) {
    if (!s) return '';
    var plain = String(s.name || '');
    var who = String(s.holder || '').trim();
    if (!s.board || !who) return plain;
    var label = String(s.label || '').trim();
    var where = s.statewide ? label
      : (label && s.districtName ? label + ' \u00b7 ' + s.districtName
      : (label && s.district ? label + ' District ' + s.district : ''));
    return where ? where + ' \u00b7 ' + who : plain;
  }

  // THE CARDS, IN THE RESOLVER'S OWN ORDER. One entry per seat this location
  // names, and each entry carries only fields the resolver already published:
  // the chamber's label, the district number it resolved, the county it resolved
  // to, the pid it seated and the board path the table above allows. NO COUNTS,
  // no activity, no "N neighbours" — a hallway says which rooms exist and says
  // nothing about how busy they are.
  //
  // WHAT IT DROPS, AND WHY EACH DROP IS THE QUIET ANSWER:
  //   · no saved location at all → [] , and the page prints the door that sets
  //     one. There is no default location on this page and no default seat.
  //   · a district row with no district → dropped. "State Senate" with no number
  //     is not a seat we can name, and a card naming a chamber and no district
  //     would read as a seat this reader does not have.
  //   · a statewide row is KEPT with no seat key. Both U.S. Senate seats and
  //     the governor are real seats this location resolves; they are not
  //     districts, and their door — where BOARD_ROUTES has a row for one — comes
  //     from statewideKeyForLevel(), never from a seat key.
  function seatsForMe() {
    var reps = null;
    try { reps = fn(window.pdxRepsForMe) ? window.pdxRepsForMe() : null; } catch (e) { reps = null; }
    if (!reps || !reps.located) return [];
    var levels = (reps && reps.levels) || [];
    var county = String((reps && reps.county) || '');
    var out = [];
    for (var i = 0; i < levels.length; i++) {
      var lv = levels[i];
      if (!lv) continue;
      var label = String(lv.label == null ? '' : lv.label).trim();
      if (!label) continue;
      var n = lv.statewide ? '' : String(lv.district == null ? '' : lv.district).replace(/[^0-9]/g, '');
      if (!lv.statewide && !n) continue;
      var seatKey = seatKeyForLevel(lv, reps.state);
      // THE RESOLVER'S PID FIRST, ALWAYS, CHECKED AGAINST THE CARD'S OWN KEY,
      // AND THE JOIN WHERE IT IS BLANK OR BELONGS TO ANOTHER NUMBER. See
      // seatPidFor() and joinedPid(): a lean document is why a blank happens, a
      // county slate is why a wrong number happens, and a vacancy is neither.
      var pid = seatPidFor(lv, reps.state, seatKey);
      // THE NAME IS THE FIELDS THE RESOLVER ALREADY PUBLISHED OR IT IS NOT A
      // NAME. Chamber, district, county — nothing composed from a geometry table
      // this file does not carry. A statewide row keeps the resolver's own
      // heading, which names the state instead of a district for the same reason.
      var row = {
        key: String(lv.key == null ? '' : lv.key),
        label: label,
        district: n,
        county: county,
        statewide: !!lv.statewide,
        districtName: lv.districtName || null,
        // A named-district state (Massachusetts) names the seat, never a
        // "District N" built from its internal key.
        name: lv.statewide
          ? String(lv.distLabel || label)
          : (lv.districtName ? label + ' \u00b7 ' + lv.districtName
                             : (label + ' District ' + n)) + (county ? ' \u00b7 ' + county : ''),
        seatKey: seatKey,
        pid: pid,
        // A statewide card's door is its own key's row, or nothing. See
        // statewideKeyForLevel(): seatKey stays '' for it either way.
        // A U.S. House or U.S. Senate card in any state falls through to
        // federalKeyForLevel(), which composes the same key Utah's already do.
        board: (lv.statewide ? boardPath(statewideKeyForLevel(lv, reps.state, pid)) : boardPath(seatKey)) ||
          boardPath(federalKeyForLevel(lv, reps.state, pid)),
        // THE KEY ONE RESIDENCY CHECK COVERS. A district card's seat key; a
        // statewide card's board key (ut-gov, ut-us-senate-<pid>), so the
        // composer's proof button names the governor and both U.S. Senate seats
        // alongside the districts. '' when neither composes.
        // A U.S. House or U.S. Senate card outside Utah has no Utah key, so its
        // federal board key is the one the check binds — only when that key has
        // a board, so the check never names a seat with no composer behind it.
        boardKey: (lv.statewide ? statewideKeyForLevel(lv, reps.state, pid) : seatKey) ||
          (boardPath(federalKeyForLevel(lv, reps.state, pid)) ? federalKeyForLevel(lv, reps.state, pid) : ''),
        // The sitting member's display name, '' when the roster cannot name the
        // pid, and the seat line both /me and /voice print. See seatLine().
        holder: holderName(pid)
      };
      row.line = seatLine(row);
      out.push(row);
    }
    return out;
  }

  function claimQuery() {
    var c = claim();
    var parts = [];
    if (c.state) parts.push('state=' + encodeURIComponent(c.state));
    if (c.county) parts.push('county=' + encodeURIComponent(c.county));
    if (c.houseDistrict) parts.push('houseDistrict=' + encodeURIComponent(c.houseDistrict));
    return parts.length ? '&' + parts.join('&') : '';
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  // THE POLL, AND IT IS THE LOUDEST THING ON THE PAGE. The question is set in the
  // app's display face at display size and every label around it is a kicker, so
  // a reader arriving cold reads the question first and the furniture second.
  // That is the whole of the hierarchy: nothing else on this seat competes with
  // it, and the sheet gives the three choices the only cards in the block.
  //
  // COUNTS ONLY, AND ONLY WHEN THERE IS ONE. One integer per option, printed as
  // an integer beside the option's own words. Deliberately NOT a bar, a ring, a
  // share or a proportion: this file computes no denominator, so there is nothing
  // here a reader could mistake for a mandate. The reader's own answer is marked,
  // and answering again replaces it rather than adding one.
  //
  // A ZERO IS NOT A RESULT, SO A ZERO IS NOT PRINTED. This block used to stack
  // three statements under an unanswered question — a nought beside all three
  // options, "Answers so far: No answers yet." and "No verified neighbors in this
  // seat yet." — which is three ways of saying the same nothing, and it made an
  // empty question look like a finished one with everybody at zero. Now the
  // count rides an option only when somebody has picked it, the tally sentence
  // is printed only when somebody has answered, and the neighbour headcount is
  // printed only when there is a neighbour to count. At zero the question gets
  // ONE sentence. Nothing was softened to get there: the sentence still refuses
  // to imply completeness, and every number that exists is still printed whole.
  function pollHtml(seatKey, payload) {
    var poll = payload && payload.poll;
    if (!poll) return '';
    var copy = (payload && payload.copy) || {};
    var canPost = !!(payload.voice && payload.voice.canPost);
    var opts = (poll.options || []).map(function (o) {
      var mine = poll.myAnswer && String(poll.myAnswer) === String(o.optionKey);
      var n = Number(o.count || 0);
      var inner =
        '<span class="pdxv-optlabel">' + esc(o.label) + '</span>' +
        (n > 0 ? '<span class="pdxv-optcount">' + esc(String(n)) + '</span>' : '');
      // A reader who cannot answer still SEES every option and every count.
      // Being told the numbers and told plainly why you are not in them is more
      // honest than hiding them.
      if (!canPost) {
        return '<li class="pdxv-opt' + (mine ? ' is-mine' : '') + '">' +
          '<span class="pdxv-optrow">' + inner + '</span></li>';
      }
      return '<li class="pdxv-opt' + (mine ? ' is-mine' : '') + '">' +
        '<button type="button" class="pdxv-optbtn" data-pdxv-answer="' + esc(o.optionKey) + '"' +
          (mine ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' +
          inner + '</button></li>';
    }).join('');

    // The tally is the gate's own sentence or it is the gate's own empty — this
    // file composes neither and prints exactly one of them.
    var tally = poll.answered
      ? '<p class="pdxv-countline">' + esc(copy.pollCounts || COPY.pollCounts) + ': ' +
          esc(String(poll.countLine || '')) + '</p>'
      : '<p class="pdxv-pollempty">' + esc(copy.emptyAnswers || COPY.emptyAnswers) + '</p>';

    // THE HEADCOUNT IS AN INTEGER OR IT IS ABSENT. A verified neighbour is a
    // real fact worth printing; zero of them under a question nobody has
    // answered is the same nothing the sentence above already said.
    var nbrs = payload.neighbors || null;
    var verified = Number((nbrs && nbrs.verified) || 0);
    var nbrLine = (verified > 0 && nbrs && nbrs.line)
      ? '<p class="pdxv-neighbors">' + esc(String(nbrs.line)) + '</p>'
      : '';

    return '<div class="pdxv-poll">' +
      '<p class="pdxv-blockhd">' + esc(copy.pollHd || COPY.pollHd) + '</p>' +
      '<p class="pdxv-q">' + esc(poll.question) + '</p>' +
      '<ul class="pdxv-opts">' + opts + '</ul>' +
      tally + nbrLine +
    '</div>';
  }

  // THE TAKES. Newest first, twenty, no identifier of who wrote one and no reply
  // box. A take carries the issue it is keyed to and nothing that could rank it:
  // there is no upvote, no like, no reaction and no order knob, so the only thing
  // one take has that another does not is having been posted later.
  //
  // THE RAIL IS THE ISSUE'S OWN COLOUR. Every take already named its issue in
  // words; the left edge now carries that issue's colour from the app's one
  // colour module, so a stack of takes reads as a stack of subjects at a glance
  // instead of as one undifferentiated column. Not a tier, not a temperature and
  // not a verdict — see icAttr(), and see the sheet for the rule that nothing on
  // a take may vary with anything except which issue it is about.
  //
  // ZERO TAKES IS A DASHED WELL WITH ONE SENTENCE IN IT, and — for a reader who
  // cannot post — the server's own sentence about why, in the same well. The
  // dashes are the point: a solid card with nothing in it reads as a thing that
  // failed to load, and a well that is visibly an outline reads as a space
  // nobody has filled yet, which is exactly what it is. Never a placeholder row,
  // never a skeleton and never a sample take.
  function takesHtml(payload, noteInWell) {
    var takes = (payload && payload.takes) || [];
    var copy = (payload && payload.copy) || {};
    var list;
    if (takes.length) {
      list = '<ul class="pdxv-takes">' + takes.map(function (t) {
        return '<li class="pdxv-take' + (t.mine ? ' is-mine' : '') + '"' +
            icAttr(t.issueKey) + '>' +
          '<span class="pdxv-takeissue">' + esc(issueLabel(t.issueKey)) + '</span>' +
          '<span class="pdxv-takebody">' + esc(t.body) + '</span>' +
        '</li>';
      }).join('') + '</ul>';
    } else {
      var voice = (payload && payload.voice) || {};
      list = '<div class="pdxv-well">' +
        '<p class="pdxv-empty">' + esc(copy.emptyTakes || COPY.emptyTakes) + '</p>' +
        (noteInWell
          ? '<p class="pdxv-closed">' + esc(voice.note || COPY.signIn) + '</p>'
          : '') +
      '</div>';
    }
    return '<div class="pdxv-takesblock">' +
      '<p class="pdxv-blockhd">' + esc(copy.takesHd || COPY.takesHd) + '</p>' +
      '<p class="pdxv-blocknote">' + esc(copy.takesNote || COPY.takesNote) + '</p>' +
      list +
    '</div>';
  }

  // THE COMPOSER. Painted on `canPost === true` and on nothing else. When it is
  // false the server's own sentence is printed in its place — this file writes no
  // refusal copy of its own, so the page and the gate cannot say different things.
  //
  // AND IT IS SAID ONCE. When there are no takes the refusal has already been
  // printed inside the empty well, beside the sentence it explains — that is the
  // one place on an empty seat where "nobody has posted" and "here is why you
  // cannot" belong together. `noteInWell` is render()'s answer to which of the
  // two slots got it, so the sentence is never printed twice and never dropped.
  function composerHtml(payload, noteInWell) {
    var voice = (payload && payload.voice) || {};
    if (voice.canPost !== true) {
      return noteInWell
        ? ''
        : '<p class="pdxv-closed">' + esc(voice.note || COPY.signIn) + '</p>';
    }
    var keys = issueChoices(payload);
    var opts = keys.map(function (k) {
      return '<option value="' + esc(k) + '">' + esc(issueLabel(k)) + '</option>';
    }).join('');
    return '<div class="pdxv-composer">' +
      '<p class="pdxv-blockhd">' + esc(COPY.composeHd) + '</p>' +
      '<label class="pdxv-clabel" for="pdxv-issue">' + esc(COPY.composeIssue) + '</label>' +
      '<select id="pdxv-issue" class="pdxv-select">' + opts + '</select>' +
      '<textarea id="pdxv-body" class="pdxv-body" maxlength="' + TAKE_MAX + '"' +
        ' placeholder="' + esc(COPY.composePh) + '"></textarea>' +
      '<div class="pdxv-crow">' +
        '<button type="button" class="pdxv-send" data-pdxv-send="1">' + esc(COPY.send) + '</button>' +
        '<span class="pdxv-count" id="pdxv-count">0 / ' + TAKE_MAX + '</span>' +
      '</div>' +
      '<p class="pdxv-say" id="pdxv-say" role="status"></p>' +
    '</div>';
  }

  // The issue keys a take may be keyed to: the poll's key, plus the keys this
  // seat's member actually has a formal record on. Every one of them is an
  // ISSUE_MAP key that came from the server — this file invents none, and the
  // server refuses any key that is not in the vocabulary regardless.
  function issueChoices(payload) {
    var out = [];
    var seen = {};
    var push = function (k) {
      var s = String(k == null ? '' : k).trim().toLowerCase();
      if (!s || seen[s]) return;
      seen[s] = 1;
      out.push(s);
    };
    if (payload && payload.poll && payload.poll.issueKey) push(payload.poll.issueKey);
    (_recordKeys || []).forEach(push);
    return out;
  }

  // THE RECORD STRIP. The seat's latest formal act on the question's issue, read
  // from the SAME public voting-record GET any signed-out reader can make. It is
  // read-only and one-way: nothing in this module writes, scores, re-dates or
  // reinterprets a formal act, and no take or answer touches it. When the record
  // holds nothing on that issue the strip says so — which is a fact about the
  // record, not a gap this file papers over.
  //
  // AND IT HAS THREE STATES, WHICH IS THE WHOLE POINT. The read can be out, it
  // can land on an empty record, and it can fail — and one sentence for all three
  // is the defect this replaces: the strip printed "no formal act … in the current
  // record" the instant the block painted, before anything had been asked, and
  // the wording made that read like a fetch still on its way. So:
  //   busy   — the record read is genuinely in flight. Said once, and it goes
  //            away, because every branch below repaints.
  //   act    — an act is on file, and it is printed as a link to its source.
  //   none   — the read landed and the record holds nothing on this issue. A
  //            final sentence naming the issue, with no "yet" and no "checking".
  //            This is HD-68's real answer today: the seat has no formal act on
  //            the poll's issue, and the strip says exactly that.
  //   unread — the read could not be made or did not come back. Its own sentence,
  //            because "we did not look" is not "there is nothing".
  //
  // ONE ISSUE, ONE QUESTION. The strip is keyed to the poll's issue and to
  // nothing else — no fallback key, no nearest neighbour, no invented mapping. An
  // act that came back on some other key is dropped rather than printed, because
  // a strip quietly answering a different question than the poll above it is
  // worse than an empty strip that names its question.
  function weekFill(tpl) {
    var issue = _payload && _payload.poll && _payload.poll.issueKey;
    return String(tpl == null ? '' : tpl)
      .replace(/\{issue\}/g, issueLabel(issue || ''));
  }

  function weekSentence(state) {
    var copy = (_payload && _payload.copy) || {};
    if (state === 'busy') return weekFill(copy.weekBusy || COPY.weekBusy);
    if (state === 'unread') return weekFill(copy.weekUnread || COPY.weekUnread);
    return weekFill(copy.weekNone || COPY.weekNone);
  }

  // AN ACT IS A BLOCK. NO ACT IS A FOOTNOTE. This is the one asymmetry in the
  // whole module and it is deliberate. When the record holds a formal act on the
  // question's issue, that act is a real thing a reader should be able to see and
  // open, so it gets a heading, the measure's own NUMBER, its title, its date and
  // a door to the record's own source. When the record holds nothing, the honest
  // sentence is still printed — it is never removed and never softened — but it
  // is printed as one quiet line under the question rather than as a third
  // full-weight section peering at the reader. A sentence that says "there is
  // nothing here" should not be the same size as a sentence that says what
  // happened; giving them equal billing is what made this page read as a stack of
  // equal-weight paragraphs in the first place.
  //
  // THE NUMBER IS THE MEASURE'S OWN. H.B. 256, S.B. 187 — the string the record
  // lane already publishes on the item, printed beside the title rather than
  // instead of it, because a reader who recognises the number and a reader who
  // recognises the subject are two different readers and neither one should have
  // to open the link to find out.
  function weekHtml() {
    var copy = (_payload && _payload.copy) || {};
    var act = _weekState === 'act' ? _week : null;
    if (act) {
      return '<div class="pdxv-week">' +
        '<p class="pdxv-blockhd">' + esc(copy.weekHd || COPY.weekHd) + '</p>' +
        '<a class="pdxv-weeklink" href="' + esc(act.href || '#') + '"' +
          (act.href ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' +
          '<span class="pdxv-weekid">' +
            (act.number ? '<span class="pdxv-weeknum">' + esc(act.number) + '</span>' : '') +
            '<span class="pdxv-weektitle">' + esc(act.title) + '</span>' +
          '</span>' +
          (act.date ? '<span class="pdxv-weekdate">' + esc(act.date) + '</span>' : '') +
        '</a>' +
      '</div>';
    }
    return '<p class="pdxv-week pdxv-week--quiet"' +
        (_weekState === 'busy' ? ' role="status"' : '') + '>' +
      '<span class="pdxv-weekkick">' + esc(copy.weekHd || COPY.weekHd) + '</span>' +
      '<span class="pdxv-weekline">' + esc(weekSentence(_weekState)) + '</span>' +
    '</p>';
  }

  function issueLabel(key) {
    var k = String(key == null ? '' : key);
    try {
      var M = window.ISSUE_MAP;
      if (M && M[k] && M[k].label) return String(M[k].label);
    } catch (e) {}
    return k.replace(/_/g, ' ');
  }

  // THE WHOLE BLOCK, in the order the brief sets: the live question, the
  // neighbours' takes, then the seat's latest formal act. The frame line is
  // rendered unconditionally above all three.
  function render(seatKey, payload) {
    var p = payload || {};
    var copy = p.copy || {};
    // WHICH SLOT HOLDS THE REFUSAL. On an empty seat the "you cannot post here"
    // sentence belongs in the well beside "nobody has posted here"; anywhere else
    // it belongs where the composer would have been. One answer, computed once,
    // so the two renderers below cannot both print it or both skip it.
    var noteInWell = !((p.takes || []).length) && (p.voice || {}).canPost !== true;
    return '<section class="pdxv" data-pdxv-seat="' + esc(normalizeSeatKey(seatKey)) + '">' +
      '<p class="pdxv-kick">' + esc(copy.kick || COPY.kick) + '</p>' +
      '<p class="pdxv-frame">' + esc(copy.frame || COPY.frame) + '</p>' +
      pollHtml(seatKey, p) +
      takesHtml(p, noteInWell) +
      composerHtml(p, noteInWell) +
      weekHtml() +
    '</section>';
  }

  // ── STATE ─────────────────────────────────────────────────────────────────
  var _seat = '';
  var _payload = null;
  var _mountId = '';
  var _recordKeys = [];
  var _week = null;
  // 'busy' | 'act' | 'none' | 'unread'. Starts busy because a fresh mount has a
  // read coming; every exit from loadWeek() moves it off busy, so the strip can
  // never be left saying it is still checking.
  var _weekState = 'busy';
  var _sending = false;

  function mountEl() { return _mountId ? el(_mountId) : null; }

  function repaint() {
    var host = mountEl();
    if (!host || !_seat || !_payload) return;
    try { host.innerHTML = render(_seat, _payload); } catch (e) {}
  }

  function say(msg) {
    var n = el('pdxv-say');
    if (n) { try { n.textContent = String(msg || ''); } catch (e) {} }
  }

  // ── LOAD ──────────────────────────────────────────────────────────────────
  // One GET for the seat, then one BEST-EFFORT record read for the strip. The
  // Voice blocks paint as soon as the first returns rather than behind the second,
  // so a neighbour never waits on the record to see the question — and a record
  // read that fails leaves the strip's honest sentence rather than an error.
  function mount(seatKey, mountId, recordKeys) {
    var k = normalizeSeatKey(seatKey);
    if (!shipped(k)) return false;
    _seat = k;
    _mountId = String(mountId || '');
    _payload = null;
    _week = null;
    _weekState = 'busy';
    if (Array.isArray(recordKeys)) _recordKeys = recordKeys.slice();

    var host = mountEl();
    if (host) {
      try {
        host.innerHTML = '<p class="pdxv-busy" role="status">' + esc(COPY.busy) + '</p>';
      } catch (e) {}
    }
    load();
    return true;
  }

  function load() {
    var k = _seat;
    return api('?seat=' + encodeURIComponent(k) + claimQuery(), { method: 'GET' })
      .then(function (res) {
        if (_seat !== k) return;
        if (!res.ok) {
          var host = mountEl();
          if (host) {
            try {
              host.innerHTML = '<p class="pdxv-empty">' +
                esc((res.data && res.data.error) || COPY.gone) + '</p>';
            } catch (e) {}
          }
          return;
        }
        _payload = res.data;
        repaint();
        loadWeek();
      });
  }

  // The seated member's pid, resolved CLIENT-side from the curated incumbent
  // table Door 2 already ships. It is used for one thing — the public record read
  // for the strip — and it is never sent to /api/district-voice, so no pid ever
  // reaches a voice_* row.
  function seatedPid() {
    try {
      if (!fn(window.pdxSeatedMemberFor)) return '';
      var pid = window.pdxSeatedMemberFor(_seat, seatNumber(_seat));
      return pid ? String(pid) : '';
    } catch (e) { return ''; }
  }

  // EVERY BRANCH SETTLES THE STRIP. There is no path out of this function that
  // leaves _weekState on 'busy', because the one thing the strip must never do is
  // keep saying it is checking when nothing is checking any more. A read that
  // cannot be made, a read that fails, a read that lands empty and a read that
  // lands on an act each set their own state and repaint.
  function settleWeek(k, state, act) {
    if (_seat !== k) return;
    _week = act || null;
    _weekState = state;
    repaint();
  }

  // ── WHICH ISSUES IS THIS ITEM FILED UNDER ─────────────────────────────────
  // A record item spells its issues as a LIST — `issues: [{issueKey, …}]` — and
  // the guard below used to ask only for `it.issueKey`, a field a real item does
  // not carry. So the guard was dead: it read undefined, skipped itself, and the
  // strip printed whatever came back regardless of what it was about. The read is
  // already keyed to one issue so nothing wrong was reaching the page, but a
  // guard that cannot fire is not a guard, and the ONE ISSUE, ONE QUESTION rule
  // above is only true while something enforces it. Both spellings are collected
  // here, so an item shaped either way is checked and neither shape is trusted.
  function itemIssueKeys(it) {
    var out = [];
    var push = function (v) {
      var t = String(v == null ? '' : v).trim().toLowerCase();
      if (t) out.push(t);
    };
    push(it && it.issueKey);
    push(it && it.issue);
    var list = (it && it.issues) || [];
    if (Object.prototype.toString.call(list) === '[object Array]') {
      for (var i = 0; i < list.length; i++) {
        push(list[i] && (list[i].issueKey || list[i].key));
      }
    }
    return out;
  }

  // THE DATE AS A READER READS IT. The record lane publishes an ISO timestamp,
  // and the strip was printing it raw — "2025-03-06T22:11:00.000Z" under a
  // heading that says "This week" is a machine's answer to a human question.
  // Reformatted to the day, in the month's own short name, and NOTHING is
  // recomputed: no timezone is applied, no relative wording is invented, and a
  // string that is not an ISO date is printed exactly as it arrived.
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function actDate(raw) {
    var t = String(raw == null ? '' : raw).trim();
    var m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})/.exec(t);
    if (!m) return t;
    var mi = Number(m[2]) - 1;
    if (!(mi >= 0 && mi < 12)) return t;
    return MONTHS[mi] + ' ' + String(Number(m[3])) + ', ' + m[1];
  }

  function loadWeek() {
    var k = _seat;
    var issue = _payload && _payload.poll && _payload.poll.issueKey;
    var pid = seatedPid();
    // Nothing to ask, or nobody to ask about. Not an empty record — we never
    // looked — so it says so rather than borrowing the empty's sentence.
    if (!issue || !pid) { settleWeek(k, 'unread', null); return; }
    var url = RECORD_API + encodeURIComponent(pid) +
      '?issue=' + encodeURIComponent(issue) + '&pageSize=1&sort=date';
    fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } })
      .then(function (res) { return res.ok ? res.json() : null; })
      .catch(function () { return null; })
      .then(function (data) {
        if (_seat !== k) return;
        if (!data) { settleWeek(k, 'unread', null); return; }
        var items = (data && (data.items || data.rows)) || [];
        var it = items[0];
        if (!it) { settleWeek(k, 'none', null); return; }
        // The read was keyed to the poll's issue, so an item on another key is a
        // surprise from the record lane and not something to print under a
        // heading the poll owns.
        var got = itemIssueKeys(it);
        var want = String(issue).trim().toLowerCase();
        if (got.length && got.indexOf(want) < 0) {
          settleWeek(k, 'none', null);
          return;
        }
        var src = it.source || {};
        var act = {
          number: String(it.number || ''),
          title: String(it.title || it.action || ''),
          date: actDate(it.date),
          href: String(src.url || '')
        };
        // An unprintable row is nothing on file, not a broken strip: there is no
        // heading without a title, and inventing one would be inventing an act.
        if (!act.title) { settleWeek(k, 'none', null); return; }
        settleWeek(k, 'act', act);
      });
  }

  // ── WRITES ────────────────────────────────────────────────────────────────
  // Both send the seat and the same three claim fields. Neither trusts what got
  // painted: the server re-runs the whole gate, and a refusal is printed as the
  // server's own sentence.
  function answer(optionKey) {
    var k = _seat;
    var c = claim();
    return api('/poll', {
      method: 'POST',
      body: {
        seat: k, optionKey: String(optionKey || ''),
        state: c.state, county: c.county, houseDistrict: c.houseDistrict
      }
    }).then(function (res) {
      if (_seat !== k) return;
      if (!res.ok) { say((res.data && res.data.error) || COPY.gone); return; }
      if (res.data && res.data.poll && _payload) {
        _payload.poll = res.data.poll;
        repaint();
        say(COPY.answerSent);
      }
    });
  }

  function send() {
    if (_sending) return Promise.resolve();
    var k = _seat;
    var issueNode = el('pdxv-issue');
    var bodyNode = el('pdxv-body');
    var issueKey = issueNode ? String(issueNode.value || '') : '';
    var body = bodyNode ? String(bodyNode.value || '') : '';
    if (!body.trim()) { say('Write something first.'); return Promise.resolve(); }
    _sending = true;
    say(COPY.sending);
    var c = claim();
    return api('/take', {
      method: 'POST',
      body: {
        seat: k, issueKey: issueKey, body: body,
        state: c.state, county: c.county, houseDistrict: c.houseDistrict
      }
    }).then(function (res) {
      _sending = false;
      if (_seat !== k) return;
      if (!res.ok) { say((res.data && res.data.error) || COPY.gone); return; }
      if (bodyNode) { try { bodyNode.value = ''; } catch (e) {} }
      // Re-read rather than splicing the new take in locally, so the feed a
      // neighbour sees after posting is the feed the server actually holds.
      return load().then(function () { say(COPY.sent); });
    }, function () { _sending = false; });
  }

  // ── WIRING ────────────────────────────────────────────────────────────────
  // Delegated once on the document, so a repaint never has to re-bind and a
  // control that is not painted cannot be reached.
  function wire() {
    try {
      document.addEventListener('click', function (ev) {
        var t = ev.target;
        for (var n = t; n && n !== document; n = n.parentNode) {
          if (!n.getAttribute) continue;
          var opt = n.getAttribute('data-pdxv-answer');
          if (opt) { ev.preventDefault(); answer(opt); return; }
          if (n.getAttribute('data-pdxv-send')) { ev.preventDefault(); send(); return; }
        }
      }, false);
      document.addEventListener('input', function (ev) {
        var t = ev.target;
        if (!t || t.id !== 'pdxv-body') return;
        var n = el('pdxv-count');
        if (n) {
          try { n.textContent = String(String(t.value || '').length) + ' / ' + TAKE_MAX; } catch (e) {}
        }
      }, false);
    } catch (e) {}
  }

  // The record issue keys, fed in by the district file once its own best-effort
  // record read lands. It only ever ADDS choices to the composer; the poll's key
  // is always there without it.
  function issues(keys) {
    if (!Array.isArray(keys)) return;
    _recordKeys = keys.slice();
    if (_payload) repaint();
  }

  // ── THE PERSON FILE'S ONE QUIET LINK ──────────────────────────────────────
  // Which Voice seat does this pid SIT IN, if any? Answered by asking the
  // curated incumbent table Door 2 already ships, per seat in the allow-list —
  // so it is the seat that names the member and never the member that names the
  // seat. Returns '' for everybody else, which is almost everybody.
  //
  // THE DIRECTION MATTERS. A person file gets a link TO a place; the place does
  // not get a feed of comments about the person. If Chew leaves the seat the
  // link moves to whoever holds it, and the takes do not follow them — they
  // belong to the district, which is the whole reason Voice is keyed on a seat.
  function seatForPid(pid) {
    var want = String(pid == null ? '' : pid).trim();
    if (!want) return '';
    var keys = Object.keys(VOICE_SEATS);
    for (var i = 0; i < keys.length; i++) {
      try {
        if (!fn(window.pdxSeatedMemberFor)) return '';
        var got = window.pdxSeatedMemberFor(keys[i], seatNumber(keys[i]));
        if (got && String(got) === want) return keys[i];
      } catch (e) {}
    }
    return '';
  }

  // ONE link, and a quiet one. No count on it, no "N neighbors talking", no
  // activity dot and no badge — a number here would turn a neighbour's sentence
  // into a metric on somebody's file, which is the exact thing this slice is
  // built not to do. It says where District Voice is and nothing about how busy
  // it is.
  //
  // WHERE IT GOES, AND WHY IT MOVED. It used to point at /d/<seat-key> — the
  // seat's own district file, which netlify.toml rewrites to index.html, so a
  // reader tapped a quiet link on a person file and paid 1.9 MB of front page.
  // It points at /voice now, which is 28 KB and is District Voice's home, and
  // for a reader with no saved location it points at the door that sets one,
  // carrying the intent to land back on /voice once it is set. Same gate, same
  // one seat, one twentieth of the bytes, and nobody is left standing on a
  // finder.
  //
  // AND IT IS NOT "THIS PERSON'S BOARD". /voice lists the seats the READER'S
  // location resolves, which for almost everybody who opens this file are not
  // this person's seat at all — that is the point. The label says District
  // Voice, not "neighbors in this seat", because the old label promised the
  // reader a room in somebody else's district. The one control that DOES answer
  // for this person's own seat is district-board.js's, beside this one, and it
  // still goes to that seat's board and nowhere else.
  //
  // THE GATE IS UNCHANGED. seatForPid() still decides whether there is a link at
  // all, so this appears on exactly the files it appeared on before.
  function personLinkHtml(pid) {
    var seat = seatForPid(pid);
    if (!seat) return '';
    var href = '/voice';
    var placed = false;
    try { placed = !!window._hasUserLocation; } catch (e) { placed = false; }
    if (!placed) {
      try {
        var R = window.PDXReturn;
        // /find, not /#who-represents-me: the finder is its own document now, so
        // the degraded door (PDXReturn absent) points at the picker rather than
        // at the front page that used to host it. Same strict-degradation rule as
        // voice-room.js's HREF_FINDER_BARE — no intent attached, and not a second
        // copy of how the intent is spelled.
        href = (R && fn(R.finderHref)) ? R.finderHref('/voice') : '/find';
      } catch (e2) { href = '/find'; }
    }
    return '<a class="pf-kick-voice" href="' + esc(href) + '"' +
      ' title="District Voice: the rooms for the seats YOU vote in. Anyone can' +
      ' read a board; only verified residents of that seat get a voice that' +
      ' counts. Not a comment section on this person, and not how they voted.">' +
      'District Voice</a>';
  }

  window.PDXVoice = {
    API: API,
    SEAT_KEY_RE: SEAT_KEY_RE,
    ALIAS_RE: ALIAS_RE,
    VOICE_SEATS: VOICE_SEATS,
    COPY: COPY,
    TAKE_MAX: TAKE_MAX,
    TAKES_CAP: TAKES_CAP,
    normalizeSeatKey: normalizeSeatKey,
    statewideKeyForLevel: statewideKeyForLevel,
    seatPidFor: seatPidFor,
    isAlias: isAlias,
    shipped: shipped,
    path: path,
    // THE BOARD ALLOW-LIST AND THE TWO QUESTIONS IT ANSWERS. Exported so /voice
    // and /me read the table rather than each carrying a row of it.
    BOARD_ROUTES: BOARD_ROUTES,
    STATE_CODE: STATE_CODE,
    FEDERAL_STATE_CODE: FEDERAL_STATE_CODE,
    federalKeyForLevel: federalKeyForLevel,
    boardPath: boardPath,
    boarded: boarded,
    seatKeyForLevel: seatKeyForLevel,
    seatsForMe: seatsForMe,
    holderName: holderName,
    seatLine: seatLine,
    claim: claim,
    VOICE_STATES: VOICE_STATES,
    stateAllowed: stateAllowed,
    seatForMe: seatForMe,
    mount: mount,
    issues: issues,
    // Exposed for the suite: the block's markup for a payload, asserted directly
    // rather than inferred from a live fetch.
    render: render,
    // THE VENDOR SEAM. Called by nothing in this repo. See the header.
    verify: verify,
    seatForPid: seatForPid,
    personLinkHtml: personLinkHtml,
    seat: function () { return _seat || null; },
    payload: function () { return _payload; },
    // Exposed for the suite: which of the strip's four states is showing, so
    // "still checking" / "nothing on file" / "we could not look" are asserted as
    // three different answers rather than guessed at from one sentence.
    weekState: function () { return _weekState; }
  };

  wire();
})();
