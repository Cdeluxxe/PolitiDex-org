/* ═══════════════════════════════════════════════════════════════════════════
   district-poll.js — ONE POLL PER ISSUE GROUP, on every composer board
   ───────────────────────────────────────────────────────────────────────────
   Loaded by every district board document, beside district-composer.js. It
   mounts only on a #pdx-district-poll host whose data-pdxdp-seat is on
   POLL_SEATS (named rows, the composer's own, no pattern — the generated rows
   are written by scripts/gen-district-boards.mjs).

   WHAT IT PAINTS. district-board.js owns band 3 ("On the table") and prints one
   <details> group per issue. After every board paint (the pdxdb:paint event)
   this module adds, to each issue group:

     · on the header, always: the count — "n votes". A CLOSED group shows that
       and nothing else; no widget is in its markup.
     · inside the group, only while it is OPEN: one poll — Support / Oppose /
       Not sure for that issue on this seat — with each option's count.

   THE BUTTONS ARE OFF UNTIL THE SERVER SAYS OTHERWISE. They are enabled only
   when GET /api/district-board-poll answers `voice.canVote: true`, which is the
   composer's gate: signed in AND a vendor-verified residency flag for THIS
   seat, which only the signed Didit decision writes. Without it the buttons
   are disabled and the locked line is printed. Nothing here can fake it — no
   local flag, no typed zip, no location claim. A failed read keeps them off
   and prints no count rather than a zero.

   Counts are integers off the wire; nothing here computes a proportion, a majority
   or a mood, and nothing is kept on the device. After a vote lands, band 2 is
   re-read through PDXDistrictBoard.refresh().
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var API = '/api/district-board-poll';
  var POLL_SEATS = {
    'ut-sd-3': 1, 'ut-hd-16': 1, 'ut-sd-7': 1, 'ut-hd-15': 1, 'ut-cd-2': 1, 'ut-sd-6': 1,
    // @generated district-boards begin — scripts/gen-district-boards.mjs writes every line up to the end marker, do not edit by hand
    'ut-hd-4': 1,
    'ut-hd-5': 1,
    'ut-hd-6': 1,
    'ut-hd-9': 1,
    'ut-hd-10': 1,
    'ut-hd-11': 1,
    'ut-hd-12': 1,
    'ut-hd-14': 1,
    'ut-hd-19': 1,
    'ut-hd-21': 1,
    'ut-hd-22': 1,
    'ut-hd-23': 1,
    'ut-hd-24': 1,
    'ut-hd-25': 1,
    'ut-hd-28': 1,
    'ut-hd-29': 1,
    'ut-hd-30': 1,
    'ut-hd-31': 1,
    'ut-hd-33': 1,
    'ut-hd-34': 1,
    'ut-hd-36': 1,
    'ut-hd-37': 1,
    'ut-hd-39': 1,
    'ut-hd-41': 1,
    'ut-hd-42': 1,
    'ut-hd-43': 1,
    'ut-hd-44': 1,
    'ut-hd-45': 1,
    'ut-hd-46': 1,
    'ut-hd-49': 1,
    'ut-hd-50': 1,
    'ut-hd-51': 1,
    'ut-hd-52': 1,
    'ut-hd-53': 1,
    'ut-hd-55': 1,
    'ut-hd-56': 1,
    'ut-hd-59': 1,
    'ut-hd-60': 1,
    'ut-hd-61': 1,
    'ut-hd-63': 1,
    'ut-hd-64': 1,
    'ut-hd-65': 1,
    'ut-hd-66': 1,
    'ut-hd-67': 1,
    'ut-hd-68': 1,
    'ut-hd-69': 1,
    'ut-hd-70': 1,
    'ut-hd-71': 1,
    'ut-hd-73': 1,
    'ut-hd-75': 1,
    'ut-sd-1': 1,
    'ut-sd-2': 1,
    'ut-sd-4': 1,
    'ut-sd-5': 1,
    'ut-sd-8': 1,
    'ut-sd-9': 1,
    'ut-sd-10': 1,
    'ut-sd-11': 1,
    'ut-sd-12': 1,
    'ut-sd-13': 1,
    'ut-sd-14': 1,
    'ut-sd-15': 1,
    'ut-sd-16': 1,
    'ut-sd-17': 1,
    'ut-sd-18': 1,
    'ut-sd-19': 1,
    'ut-sd-20': 1,
    'ut-sd-21': 1,
    'ut-sd-22': 1,
    'ut-sd-23': 1,
    'ut-sd-24': 1,
    'ut-sd-25': 1,
    'ut-sd-26': 1,
    'ut-sd-27': 1,
    'ut-sd-28': 1,
    'ut-sd-29': 1,
    'ut-cd-1': 1,
    'ut-cd-3': 1,
    'ut-cd-4': 1,
    'ut-gov': 1,
    'ut-us-senate-curtis': 1,
    'ut-us-senate-lee': 1,
    'al-cd-1': 1,
    'al-cd-2': 1,
    'al-cd-3': 1,
    'al-cd-4': 1,
    'al-cd-5': 1,
    'al-cd-6': 1,
    'al-cd-7': 1,
    'al-us-senate-britt': 1,
    'al-us-senate-tommy_tuberville': 1,
    'ak-cd-1': 1,
    'ak-us-senate-murkowski': 1,
    'ak-us-senate-dan_sullivan': 1,
    'az-cd-1': 1,
    'az-cd-2': 1,
    'az-cd-3': 1,
    'az-cd-4': 1,
    'az-cd-5': 1,
    'az-cd-6': 1,
    'az-cd-7': 1,
    'az-cd-8': 1,
    'az-cd-9': 1,
    'az-us-senate-mark_kelly': 1,
    'az-us-senate-gallego': 1,
    'ar-cd-1': 1,
    'ar-cd-3': 1,
    'ar-cd-4': 1,
    'ar-us-senate-cotton': 1,
    'ar-us-senate-boozman': 1,
    'ca-cd-1': 1,
    'ca-cd-3': 1,
    'ca-cd-4': 1,
    'ca-cd-5': 1,
    'ca-cd-6': 1,
    'ca-cd-7': 1,
    'ca-cd-8': 1,
    'ca-cd-9': 1,
    'ca-cd-10': 1,
    'ca-cd-11': 1,
    'ca-cd-12': 1,
    'ca-cd-13': 1,
    'ca-cd-15': 1,
    'ca-cd-16': 1,
    'ca-cd-19': 1,
    'ca-cd-20': 1,
    'ca-cd-21': 1,
    'ca-cd-22': 1,
    'ca-cd-23': 1,
    'ca-cd-24': 1,
    'ca-cd-25': 1,
    'ca-cd-26': 1,
    'ca-cd-27': 1,
    'ca-cd-28': 1,
    'ca-cd-29': 1,
    'ca-cd-30': 1,
    'ca-cd-31': 1,
    'ca-cd-32': 1,
    'ca-cd-34': 1,
    'ca-cd-35': 1,
    'ca-cd-37': 1,
    'ca-cd-38': 1,
    'ca-cd-40': 1,
    'ca-cd-41': 1,
    'ca-cd-44': 1,
    'ca-cd-45': 1,
    'ca-cd-46': 1,
    'ca-cd-47': 1,
    'ca-cd-48': 1,
    'ca-cd-49': 1,
    'ca-cd-50': 1,
    'ca-cd-51': 1,
    'ca-cd-52': 1,
    'ca-us-senate-schiff': 1,
    'ca-us-senate-padilla': 1,
    'co-cd-3': 1,
    'co-cd-5': 1,
    'co-cd-6': 1,
    'co-cd-7': 1,
    'co-cd-8': 1,
    'co-us-senate-bennet': 1,
    'co-us-senate-hickenlooper': 1,
    'ct-cd-1': 1,
    'ct-cd-2': 1,
    'ct-cd-5': 1,
    'ct-us-senate-chris_murphy': 1,
    'ct-us-senate-blumenthal': 1,
    'de-us-senate-coons': 1,
    'de-us-senate-blunt_rochester': 1,
    'fl-cd-1': 1,
    'fl-cd-2': 1,
    'fl-cd-3': 1,
    'fl-cd-4': 1,
    'fl-cd-5': 1,
    'fl-cd-6': 1,
    'fl-cd-7': 1,
    'fl-cd-8': 1,
    'fl-cd-9': 1,
    'fl-cd-11': 1,
    'fl-cd-12': 1,
    'fl-cd-14': 1,
    'fl-cd-15': 1,
    'fl-cd-16': 1,
    'fl-cd-17': 1,
    'fl-cd-18': 1,
    'fl-cd-22': 1,
    'fl-cd-23': 1,
    'fl-cd-24': 1,
    'fl-cd-25': 1,
    'fl-cd-26': 1,
    'fl-cd-27': 1,
    'fl-cd-28': 1,
    'fl-us-senate-ashley_moody': 1,
    'fl-us-senate-rick_scott': 1,
    'ga-cd-1': 1,
    'ga-cd-2': 1,
    'ga-cd-3': 1,
    'ga-cd-4': 1,
    'ga-cd-5': 1,
    'ga-cd-6': 1,
    'ga-cd-7': 1,
    'ga-cd-8': 1,
    'ga-cd-9': 1,
    'ga-cd-10': 1,
    'ga-cd-11': 1,
    'ga-cd-12': 1,
    'ga-cd-14': 1,
    'ga-us-senate-jon_ossoff': 1,
    'ga-us-senate-warnock': 1,
    'hi-cd-1': 1,
    'hi-cd-2': 1,
    'hi-us-senate-hirono': 1,
    'hi-us-senate-schatz': 1,
    'id-cd-1': 1,
    'id-cd-2': 1,
    'id-us-senate-risch': 1,
    'id-us-senate-crapo': 1,
    'il-cd-1': 1,
    'il-cd-2': 1,
    'il-cd-4': 1,
    'il-cd-5': 1,
    'il-cd-6': 1,
    'il-cd-7': 1,
    'il-cd-10': 1,
    'il-cd-11': 1,
    'il-cd-13': 1,
    'il-cd-14': 1,
    'il-cd-15': 1,
    'il-cd-16': 1,
    'il-cd-17': 1,
    'il-us-senate-durbin': 1,
    'il-us-senate-duckworth': 1,
    'in-cd-1': 1,
    'in-cd-2': 1,
    'in-cd-3': 1,
    'in-cd-4': 1,
    'in-cd-5': 1,
    'in-cd-6': 1,
    'in-cd-7': 1,
    'in-cd-8': 1,
    'in-cd-9': 1,
    'in-us-senate-banks': 1,
    'in-us-senate-todd_young': 1,
    'ia-cd-1': 1,
    'ia-cd-2': 1,
    'ia-cd-3': 1,
    'ia-cd-4': 1,
    'ia-us-senate-grassley': 1,
    'ia-us-senate-ernst': 1,
    'ks-cd-1': 1,
    'ks-cd-2': 1,
    'ks-cd-3': 1,
    'ks-cd-4': 1,
    'ks-us-senate-roger_marshall': 1,
    'ks-us-senate-jerry_moran': 1,
    'ky-cd-3': 1,
    'ky-cd-5': 1,
    'ky-cd-6': 1,
    'ky-us-senate-mcconnell': 1,
    'ky-us-senate-rand_paul': 1,
    'la-cd-2': 1,
    'la-cd-3': 1,
    'la-cd-5': 1,
    'la-cd-6': 1,
    'la-us-senate-kennedy_john': 1,
    'la-us-senate-cassidy': 1,
    'me-us-senate-collins': 1,
    'me-us-senate-angus_king': 1,
    'md-cd-2': 1,
    'md-cd-3': 1,
    'md-cd-4': 1,
    'md-cd-6': 1,
    'md-cd-7': 1,
    'md-us-senate-alsobrooks': 1,
    'md-us-senate-van_hollen': 1,
    'ma-cd-3': 1,
    'ma-cd-8': 1,
    'ma-cd-9': 1,
    'ma-us-senate-warren': 1,
    'ma-us-senate-markey': 1,
    'mi-cd-1': 1,
    'mi-cd-2': 1,
    'mi-cd-3': 1,
    'mi-cd-4': 1,
    'mi-cd-7': 1,
    'mi-cd-8': 1,
    'mi-cd-10': 1,
    'mi-cd-11': 1,
    'mi-cd-13': 1,
    'mi-us-senate-slotkin': 1,
    'mi-us-senate-peters': 1,
    'mn-cd-1': 1,
    'mn-cd-3': 1,
    'mn-cd-4': 1,
    'mn-cd-7': 1,
    'mn-cd-8': 1,
    'mn-us-senate-klobuchar': 1,
    'mn-us-senate-tina_smith': 1,
    'ms-cd-1': 1,
    'ms-cd-2': 1,
    'ms-cd-3': 1,
    'ms-cd-4': 1,
    'ms-us-senate-wicker': 1,
    'ms-us-senate-hyde_smith': 1,
    'mo-cd-1': 1,
    'mo-cd-2': 1,
    'mo-cd-3': 1,
    'mo-cd-4': 1,
    'mo-cd-5': 1,
    'mo-cd-7': 1,
    'mo-us-senate-hawley': 1,
    'mo-us-senate-schmitt': 1,
    'mt-cd-1': 1,
    'mt-cd-2': 1,
    'mt-us-senate-sheehy': 1,
    'mt-us-senate-daines': 1,
    'ne-cd-1': 1,
    'ne-cd-3': 1,
    'ne-us-senate-deb_fischer': 1,
    'ne-us-senate-ricketts': 1,
    'nv-cd-1': 1,
    'nv-cd-2': 1,
    'nv-cd-3': 1,
    'nv-cd-4': 1,
    'nv-us-senate-rosen': 1,
    'nv-us-senate-cortez_masto': 1,
    'nh-cd-1': 1,
    'nh-cd-2': 1,
    'nh-us-senate-shaheen': 1,
    'nh-us-senate-maggie_hassan': 1,
    'nj-cd-1': 1,
    'nj-cd-2': 1,
    'nj-cd-3': 1,
    'nj-cd-4': 1,
    'nj-cd-7': 1,
    'nj-cd-8': 1,
    'nj-cd-9': 1,
    'nj-cd-10': 1,
    'nj-cd-11': 1,
    'nj-cd-12': 1,
    'nj-us-senate-booker': 1,
    'nj-us-senate-andy_kim': 1,
    'nm-cd-1': 1,
    'nm-cd-2': 1,
    'nm-cd-3': 1,
    'nm-us-senate-heinrich': 1,
    'nm-us-senate-lujan': 1,
    'ny-cd-1': 1,
    'ny-cd-4': 1,
    'ny-cd-6': 1,
    'ny-cd-7': 1,
    'ny-cd-11': 1,
    'ny-cd-13': 1,
    'ny-cd-16': 1,
    'ny-cd-18': 1,
    'ny-cd-19': 1,
    'ny-cd-20': 1,
    'ny-cd-22': 1,
    'ny-cd-23': 1,
    'ny-cd-24': 1,
    'ny-cd-25': 1,
    'ny-cd-26': 1,
    'ny-us-senate-schumer': 1,
    'ny-us-senate-gillibrand': 1,
    'nc-cd-1': 1,
    'nc-cd-2': 1,
    'nc-cd-3': 1,
    'nc-cd-4': 1,
    'nc-cd-6': 1,
    'nc-cd-7': 1,
    'nc-cd-8': 1,
    'nc-cd-10': 1,
    'nc-cd-11': 1,
    'nc-cd-12': 1,
    'nc-cd-13': 1,
    'nc-cd-14': 1,
    'nc-us-senate-ted_budd': 1,
    'nc-us-senate-tillis': 1,
    'nd-cd-1': 1,
    'nd-us-senate-kevin_cramer': 1,
    'nd-us-senate-hoeven': 1,
    'oh-cd-2': 1,
    'oh-cd-3': 1,
    'oh-cd-5': 1,
    'oh-cd-6': 1,
    'oh-cd-7': 1,
    'oh-cd-8': 1,
    'oh-cd-9': 1,
    'oh-cd-10': 1,
    'oh-cd-11': 1,
    'oh-cd-12': 1,
    'oh-cd-13': 1,
    'oh-cd-14': 1,
    'oh-cd-15': 1,
    'oh-us-senate-moreno': 1,
    'oh-us-senate-jon_husted': 1,
    'ok-cd-2': 1,
    'ok-cd-3': 1,
    'ok-cd-5': 1,
    'ok-us-senate-lankford': 1,
    'ok-us-senate-alan_armstrong': 1,
    'or-cd-1': 1,
    'or-cd-2': 1,
    'or-cd-3': 1,
    'or-cd-4': 1,
    'or-cd-5': 1,
    'or-cd-6': 1,
    'or-us-senate-wyden': 1,
    'or-us-senate-merkley': 1,
    'pa-cd-3': 1,
    'pa-cd-4': 1,
    'pa-cd-5': 1,
    'pa-cd-6': 1,
    'pa-cd-7': 1,
    'pa-cd-8': 1,
    'pa-cd-9': 1,
    'pa-cd-10': 1,
    'pa-cd-11': 1,
    'pa-cd-13': 1,
    'pa-cd-14': 1,
    'pa-cd-16': 1,
    'pa-cd-17': 1,
    'pa-us-senate-fetterman': 1,
    'pa-us-senate-mccormick': 1,
    'ri-cd-1': 1,
    'ri-cd-2': 1,
    'ri-us-senate-reed': 1,
    'ri-us-senate-whitehouse': 1,
    'sc-cd-2': 1,
    'sc-cd-3': 1,
    'sc-cd-4': 1,
    'sc-cd-5': 1,
    'sc-cd-7': 1,
    'sc-us-senate-graham': 1,
    'sc-us-senate-tim_scott': 1,
    'sd-cd-1': 1,
    'sd-us-senate-thune': 1,
    'sd-us-senate-mike_rounds': 1,
    'tn-cd-1': 1,
    'tn-cd-2': 1,
    'tn-cd-3': 1,
    'tn-cd-4': 1,
    'tn-cd-5': 1,
    'tn-cd-6': 1,
    'tn-cd-7': 1,
    'tn-cd-8': 1,
    'tn-cd-9': 1,
    'tn-us-senate-hagerty': 1,
    'tn-us-senate-blackburn': 1,
    'tx-cd-1': 1,
    'tx-cd-3': 1,
    'tx-cd-4': 1,
    'tx-cd-5': 1,
    'tx-cd-6': 1,
    'tx-cd-7': 1,
    'tx-cd-8': 1,
    'tx-cd-9': 1,
    'tx-cd-10': 1,
    'tx-cd-12': 1,
    'tx-cd-13': 1,
    'tx-cd-14': 1,
    'tx-cd-15': 1,
    'tx-cd-16': 1,
    'tx-cd-17': 1,
    'tx-cd-18': 1,
    'tx-cd-20': 1,
    'tx-cd-22': 1,
    'tx-cd-24': 1,
    'tx-cd-26': 1,
    'tx-cd-27': 1,
    'tx-cd-28': 1,
    'tx-cd-29': 1,
    'tx-cd-31': 1,
    'tx-cd-32': 1,
    'tx-cd-33': 1,
    'tx-cd-34': 1,
    'tx-cd-37': 1,
    'tx-cd-38': 1,
    'tx-us-senate-cruz': 1,
    'tx-us-senate-john_cornyn': 1,
    'vt-cd-1': 1,
    'vt-us-senate-welch': 1,
    'vt-us-senate-sanders': 1,
    'va-cd-1': 1,
    'va-cd-2': 1,
    'va-cd-4': 1,
    'va-cd-5': 1,
    'va-cd-6': 1,
    'va-cd-7': 1,
    'va-cd-8': 1,
    'va-cd-9': 1,
    'va-cd-10': 1,
    'va-cd-11': 1,
    'va-us-senate-kaine': 1,
    'va-us-senate-warner': 1,
    'wa-cd-4': 1,
    'wa-cd-5': 1,
    'wa-cd-6': 1,
    'wa-cd-8': 1,
    'wa-cd-10': 1,
    'wa-us-senate-murray': 1,
    'wa-us-senate-cantwell': 1,
    'wv-cd-1': 1,
    'wv-cd-2': 1,
    'wv-us-senate-capito': 1,
    'wv-us-senate-jim_justice': 1,
    'wi-cd-2': 1,
    'wi-cd-3': 1,
    'wi-cd-4': 1,
    'wi-cd-5': 1,
    'wi-cd-6': 1,
    'wi-cd-7': 1,
    'wi-cd-8': 1,
    'wi-us-senate-ron_johnson': 1,
    'wi-us-senate-tammy_baldwin': 1,
    'wy-cd-1': 1,
    'wy-us-senate-barrasso': 1,
    'wy-us-senate-lummis': 1,
    'az-sd-2': 1,
    'az-sd-23': 1,
    'az-sd-9': 1,
    'az-sd-4': 1,
    'ca-hd-7': 1,
    'ca-hd-36': 1,
    'ca-hd-47': 1,
    'ca-hd-58': 1,
    'ca-hd-74': 1,
    'ca-sd-16': 1,
    'ca-sd-38': 1,
    'co-sd-11': 1,
    'co-sd-15': 1,
    'co-sd-21': 1,
    'co-sd-30': 1,
    'co-hd-19': 1,
    'co-hd-25': 1,
    'co-hd-33': 1,
    'co-hd-43': 1,
    'co-hd-46': 1,
    'co-hd-50': 1,
    'co-hd-59': 1,
    'fl-hd-35': 1,
    'fl-hd-65': 1,
    'fl-hd-87': 1,
    'fl-hd-89': 1,
    'fl-hd-93': 1,
    'fl-hd-101': 1,
    'fl-hd-106': 1,
    'fl-sd-10': 1,
    'fl-sd-14': 1,
    'fl-sd-38': 1,
    'ga-sd-37': 1,
    'ga-sd-48': 1,
    'ga-hd-151': 1,
    'ga-hd-105': 1,
    'ga-hd-154': 1,
    'ga-hd-48': 1,
    'ga-hd-44': 1,
    'ga-hd-99': 1,
    'ga-hd-53': 1,
    'il-sd-57': 1,
    'il-sd-36': 1,
    'il-sd-56': 1,
    'il-sd-26': 1,
    'il-sd-24': 1,
    'il-sd-48': 1,
    'il-hd-76': 1,
    'il-hd-97': 1,
    'il-hd-70': 1,
    'il-hd-52': 1,
    'il-hd-114': 1,
    'il-hd-104': 1,
    'il-hd-112': 1,
    'il-hd-65': 1,
    'mi-sd-35': 1,
    'mi-sd-9': 1,
    'mi-hd-109': 1,
    'mi-hd-86': 1,
    'mi-hd-44': 1,
    'mi-hd-27': 1,
    'mi-hd-46': 1,
    'mi-hd-28': 1,
    'mi-hd-55': 1,
    'mi-hd-61': 1,
    'mn-sd-3': 1,
    'mn-sd-4': 1,
    'mn-sd-14': 1,
    'mn-sd-32': 1,
    'mn-sd-33': 1,
    'mn-sd-35': 1,
    'mn-sd-41': 1,
    'mn-sd-48': 1,
    'mn-hd-6': 1,
    'mn-hd-35': 1,
    'mn-hd-63': 1,
    'mn-hd-64': 1,
    'mn-hd-67': 1,
    'mn-hd-69': 1,
    'mn-hd-70': 1,
    'mn-hd-81': 1,
    'mn-hd-89': 1,
    'mn-hd-96': 1,
    'mn-hd-107': 1,
    'ny-sd-43': 1,
    'ny-sd-39': 1,
    'ny-sd-44': 1,
    'ny-sd-38': 1,
    'ny-hd-107': 1,
    'ny-hd-46': 1,
    'ny-hd-143': 1,
    'ny-hd-21': 1,
    'ny-hd-97': 1,
    'nc-sd-7': 1,
    'nc-sd-11': 1,
    'nc-sd-42': 1,
    'nc-sd-18': 1,
    'nc-hd-25': 1,
    'nc-hd-105': 1,
    'nc-hd-98': 1,
    'nc-hd-37': 1,
    'oh-sd-29': 1,
    'oh-hd-10': 1,
    'oh-hd-17': 1,
    'oh-hd-36': 1,
    'oh-hd-60': 1,
    'pa-sd-40': 1,
    'pa-sd-16': 1,
    'pa-sd-6': 1,
    'pa-sd-36': 1,
    'pa-sd-24': 1,
    'pa-hd-72': 1,
    'pa-hd-12': 1,
    'pa-hd-137': 1,
    'pa-hd-142': 1,
    'pa-hd-144': 1,
    'pa-hd-18': 1,
    'pa-hd-160': 1,
    'tx-sd-19': 1,
    'tx-hd-34': 1,
    'tx-hd-37': 1,
    'tx-hd-52': 1,
    'tx-hd-61': 1,
    'tx-hd-67': 1,
    'tx-hd-70': 1,
    'tx-hd-74': 1,
    'tx-hd-108': 1,
    'tx-hd-112': 1,
    'tx-hd-121': 1,
    'tx-hd-138': 1,
    'tx-sd-9': 1,
    'tx-sd-21': 1,
    'wa-sd-26': 1,
    'wa-sd-35': 1,
    'wa-hd-10-p1': 1,
    'wa-hd-10-p2': 1,
    'wa-hd-17-p1': 1,
    'wa-hd-17-p2': 1,
    'wa-hd-18-p1': 1,
    'wa-hd-18-p2': 1,
    'wa-hd-26-p1': 1,
    'wi-sd-17': 1,
    'wi-sd-31': 1,
    'wi-hd-26': 1,
    'wi-hd-30': 1,
    'wi-hd-51': 1,
    'wi-hd-61': 1,
    'wi-hd-85': 1,
    'wi-hd-88': 1,
    'wi-hd-89': 1,
    'wi-hd-91': 1,
    'wi-hd-92': 1,
    'wi-hd-94': 1,
    // @generated district-boards end
  };
  var CHOICES = [
    { key: 'support', label: 'Support' },
    { key: 'oppose', label: 'Oppose' },
    { key: 'not_sure', label: 'Not sure' }
  ];
  // ONE ISSUE ASKS WHICH WAY. Get Money Out of Politics carries its own question
  // and seven named options; the server's ISSUE_CHOICES (district-board-poll-core)
  // is the list it accepts, and every other issue keeps the three poles above.
  var ISSUE_POLLS = {
    campaign_finance: {
      legend: 'What is the best way to get money out of politics?',
      choices: [
        { key: 'cap_individual', label: 'Cap individual donations' },
        { key: 'cap_total', label: 'Cap the total a campaign can raise' },
        { key: 'public_match', label: 'Public financing or small-donor matching' },
        { key: 'cooling_off', label: 'A longer cooling-off before lobbying' },
        { key: 'ban_stock_buys', label: 'Ban members’ personal trading while in office' },
        { key: 'dark_money', label: 'Stronger dark-money disclosure' },
        { key: 'none', label: 'None of these' }
      ]
    }
  };
  function choicesFor(key) {
    return Object.prototype.hasOwnProperty.call(ISSUE_POLLS, key) ? ISSUE_POLLS[key].choices : CHOICES;
  }
  function legendFor(key) {
    if (Object.prototype.hasOwnProperty.call(ISSUE_POLLS, key)) return ISSUE_POLLS[key].legend;
    return COPY.legend + issueLabel(key) + COPY.legendTail;
  }
  var LOCKED_LINE = 'Only verified residents of this seat get a voice that counts.';
  var COPY = {
    legend: 'On this seat, where do you stand on ',
    legendTail: '?',
    wait: 'Reading votes…',
    unread: 'We could not read this poll’s votes just now. This is not an empty poll — it is a read that failed.',
    unreadNote: 'Voting stays off until this board can confirm who you are.',
    failed: 'That vote did not go through.',
    // A daily-cap refusal (429 daily_cap), said without the server's
    // membership wording.
    notTaken: 'That vote did not go through. This seat is not taking another vote from this account right now.',
    saved: 'Vote saved. You can change it.',
    mine: 'Your vote',
    foot: 'Votes carry no name. Counts only.'
  };

  var CSS =
    '.pdxdp-n{margin-left:.6rem;font-size:.76rem;color:#93a8c6;font-variant-numeric:tabular-nums;white-space:nowrap}' +
    '.pdxdp-poll{margin:.2rem 0 .7rem;padding:.6rem .7rem;border:1px solid #1d2b45;border-radius:8px;background:#0c1526}' +
    '.pdxdp-fs{margin:0;padding:0;border:0;display:grid;gap:.45rem}' +
    '.pdxdp-lg{padding:0;font-size:.86rem;color:#dbe6f7}' +
    '.pdxdp-opts{display:flex;flex-wrap:wrap;gap:.4rem}' +
    '.pdxdp-opt{display:inline-flex;align-items:center;gap:.45rem;padding:.35rem .7rem;border:1px solid #2a3c5e;border-radius:999px;background:#101c33;color:#dbe6f7;font:inherit;font-size:.84rem;cursor:pointer}' +
    '.pdxdp-opt[aria-pressed="true"]{border-color:#7fb2ff;background:#16284a}' +
    '.pdxdp-opt:disabled{opacity:.55;cursor:not-allowed}' +
    '.pdxdp-opt:focus-visible{outline:2px solid #7fb2ff;outline-offset:2px}' +
    '.pdxdp-c{font-size:.76rem;color:#93a8c6;font-variant-numeric:tabular-nums}' +
    '.pdxdp-locked,.pdxdp-note,.pdxdp-status{margin:0;font-size:.78rem;color:#93a8c6}' +
    '.pdxdp-locked{color:#c4b58a}';

  function fn(v) { return typeof v === 'function'; }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function votesWord(n) { return n === 1 ? '1 vote' : n + ' votes'; }

  // ── THE CALLER ────────────────────────────────────────────────────────────
  function tokenUser() {
    try {
      var cu = window.auth && window.auth.currentUser;
      if (!cu || cu.isAnonymous === true || !fn(cu.getIdToken)) return null;
      return cu;
    } catch (e) { return null; }
  }
  function bearer() {
    var u = tokenUser();
    if (!u) return Promise.resolve(null);
    try {
      return Promise.resolve(u.getIdToken()).then(function (t) { return t || null; }, function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }
  function call(method, query, body) {
    return bearer().then(function (t) {
      var headers = { 'Accept': 'application/json' };
      if (body) headers['Content-Type'] = 'application/json';
      if (t) headers['Authorization'] = 'Bearer ' + t;
      return fetch(API + (query || ''), {
        method: method,
        headers: headers,
        cache: 'no-store',
        body: body ? JSON.stringify(body) : undefined
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok, status: res.status, data: data || {} };
        });
      });
    }).catch(function () { return { ok: false, status: 0, data: {} }; });
  }

  function issueLabel(key) {
    try {
      var B = window.PDXDistrictBoard;
      if (B && fn(B.issueLabel)) return B.issueLabel(key) || '';
    } catch (e) {}
    return '';
  }

  // ── STATE ─────────────────────────────────────────────────────────────────
  var _seat = '';
  var _read = null;      // null = in flight, false = failed, else the payload
  var _polls = {};       // issueKey → { support, oppose, not_sure, total }
  var _mine = {};        // issueKey → the caller's own choice
  var _busy = {};
  var _status = {};

  function canVote() {
    return !!(_read && _read.voice && _read.voice.canVote === true);
  }
  function tally(key) {
    return _polls[key] || { support: 0, oppose: 0, not_sure: 0, total: 0 };
  }

  function boardEl() {
    try { return document.getElementById('pdx-district-board'); } catch (e) { return null; }
  }

  // THE WIDGET, for one OPEN issue group.
  function pollHtml(key) {
    var h = '<div class="pdxdp-poll" data-pdxdp-poll="' + esc(key) + '">' +
      '<fieldset class="pdxdp-fs">' +
        '<legend class="pdxdp-lg">' + esc(legendFor(key)) + '</legend>';
    if (_read === null) {
      h += '<p class="pdxdp-status" role="status">' + esc(COPY.wait) + '</p>';
    } else if (_read === false) {
      h += '<p class="pdxdp-status">' + esc(COPY.unread) + '</p>';
    }
    var open = canVote() && !_busy[key];
    var dis = open ? '' : ' disabled aria-disabled="true"';
    var t = tally(key);
    h += '<div class="pdxdp-opts">';
    var opts = choicesFor(key);
    for (var i = 0; i < opts.length; i++) {
      var c = opts[i];
      var pressed = _mine[key] === c.key;
      h += '<button type="button" class="pdxdp-opt" data-pdxdp-choice="' + c.key + '"' +
        ' data-pdxdp-issue="' + esc(key) + '" aria-pressed="' + (pressed ? 'true' : 'false') + '"' + dis + '>' +
        esc(c.label) +
        (_read ? '<span class="pdxdp-c">' + (t[c.key] || 0) + '</span>' : '') +
      '</button>';
    }
    h += '</div>';
    if (!canVote()) {
      var v = (_read && _read.voice) || {};
      h += '<p class="pdxdp-locked" data-pdxdp-locked="1">' + esc(v.line || LOCKED_LINE) + '</p>';
      var note = _read === false ? COPY.unreadNote : (v.note || '');
      if (note) h += '<p class="pdxdp-note">' + esc(note) + '</p>';
    }
    if (_status[key]) h += '<p class="pdxdp-status" role="status">' + esc(_status[key]) + '</p>';
    h += '<p class="pdxdp-note">' + esc(COPY.foot) + '</p>';
    return h + '</fieldset></div>';
  }

  // One group: the header count always; the widget only while it is open.
  function decorateGroup(d) {
    var key = (d.getAttribute && d.getAttribute('data-pdxdb-group')) || '';
    if (!key) return;                       // the unfiled rows are not an issue
    var sum = d.querySelector('.pdxdb-group-h');
    if (sum) {
      var n = sum.querySelector('[data-pdxdp-count]');
      if (!n) {
        sum.insertAdjacentHTML('beforeend', '<span class="pdxdp-n" data-pdxdp-count=""></span>');
        n = sum.querySelector('[data-pdxdp-count]');
      }
      var text = _read ? votesWord(tally(key).total) : '';
      n.textContent = text;
      n.setAttribute('data-pdxdp-count', _read ? String(tally(key).total) : '');
    }
    var w = d.querySelector('[data-pdxdp-poll]');
    if (w && w.parentNode) w.parentNode.removeChild(w);
    if (d.open && sum) sum.insertAdjacentHTML('afterend', pollHtml(key));
  }

  function decorate() {
    var el = boardEl();
    if (!el || !fn(el.querySelectorAll)) return;
    var groups = el.querySelectorAll('details[data-pdxdb-group]');
    for (var i = 0; i < groups.length; i++) decorateGroup(groups[i]);
  }

  function load() {
    return call('GET', '?seat=' + encodeURIComponent(_seat)).then(function (res) {
      if (!res.ok || !res.data || !Array.isArray(res.data.polls)) {
        _read = false;
        _polls = {};
        _mine = {};
      } else {
        _read = res.data;
        _polls = {};
        for (var i = 0; i < res.data.polls.length; i++) {
          var p = res.data.polls[i];
          if (p && p.issueKey) _polls[p.issueKey] = p;
        }
        _mine = (res.data.mine && typeof res.data.mine === 'object') ? res.data.mine : {};
      }
      decorate();
    });
  }

  function vote(key, choice) {
    if (!key || _busy[key] || !canVote()) return;
    _busy[key] = true;
    _status[key] = '';
    decorate();
    call('POST', '', { seat: _seat, issueKey: key, choice: choice }).then(function (res) {
      _busy[key] = false;
      if (res.ok && res.data && res.data.poll) {
        _polls[key] = res.data.poll;
        _mine[key] = res.data.mine || choice;
        _status[key] = COPY.saved;
        try {
          var B = window.PDXDistrictBoard;
          if (B && fn(B.refresh)) B.refresh();
        } catch (e) {}
      } else if (res.status === 403) {
        _read = _read || {};
        _read.voice = { canVote: false, reason: res.data.code || '', line: res.data.error || LOCKED_LINE, note: res.data.note || '' };
        _status[key] = '';
      } else if (res.status === 429 || (res.data && res.data.code === 'daily_cap')) {
        _status[key] = COPY.notTaken;
      } else {
        _status[key] = (res.data && res.data.error) || COPY.failed;
      }
      decorate();
    });
  }

  var _wired = null;
  function wireBoard() {
    var el = boardEl();
    if (!el || _wired === el || !fn(el.addEventListener)) return;
    _wired = el;
    // `toggle` does not bubble, so it is caught on the way down.
    el.addEventListener('toggle', function (ev) {
      var d = ev && ev.target;
      if (d && d.getAttribute && d.hasAttribute && d.hasAttribute('data-pdxdb-group')) decorateGroup(d);
    }, true);
    el.addEventListener('click', function (ev) {
      var t = ev && ev.target;
      var b = t && fn(t.closest) ? t.closest('[data-pdxdp-choice]') : null;
      if (!b || b.disabled) return;
      vote(b.getAttribute('data-pdxdp-issue') || '', b.getAttribute('data-pdxdp-choice') || '');
    });
  }

  function injectCss() {
    try {
      if (document.getElementById('pdxdp-css')) return;
      var s = document.createElement('style');
      s.id = 'pdxdp-css';
      s.textContent = CSS;
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {}
  }

  function mount(host) {
    var el = host || document.getElementById('pdx-district-poll');
    if (!el) return false;
    var seat = String(el.getAttribute('data-pdxdp-seat') || '').toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(POLL_SEATS, seat)) return false;
    _seat = seat;
    injectCss();
    wireBoard();
    decorate();
    load();
    try {
      if (window.auth && fn(window.auth.onAuthStateChanged)) {
        window.auth.onAuthStateChanged(function () { load(); });
      }
    } catch (e) {}
    // The board rebuilds band 3 on every paint; decorate the fresh groups.
    try {
      document.addEventListener('pdxdb:paint', function () { wireBoard(); decorate(); });
    } catch (e) {}
    return true;
  }

  window.PDXDistrictPoll = {
    API: API,
    POLL_SEATS: POLL_SEATS,
    CHOICES: CHOICES,
    ISSUE_POLLS: ISSUE_POLLS,
    choicesFor: choicesFor,
    LOCKED_LINE: LOCKED_LINE,
    COPY: COPY,
    mount: mount,
    canVote: canVote,
    pollHtml: pollHtml,
    refresh: function () { if (_seat) load(); }
  };

  function go() { mount(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
})();
