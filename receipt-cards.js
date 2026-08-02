/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — Vote-derived share cards  ·  window.PDXReceiptCards
   ────────────────────────────────────────────────────────────────────────────
   A SECOND FEED into the share-card renderer that already ships in say-vs-do.js.

   say-vs-do.js builds its cards from window.ACCT_SPOTLIGHT — the curated public
   record — and deliberately drops `category === 'voting'` at its collect()
   chokepoint, because formal legislative actions belong to the OFFICIAL RECORD,
   not to Say-vs-Do. That boundary is correct and this file does not touch it.
   The consequence, though, was that the strongest, most checkable material the
   app holds — a member's own floor vote lined up against their own stated
   position on the same ISSUE_MAP key — could not leave the app as an image.

   This module fixes exactly that, additively:

     • It reads the Official Record side ONLY: warm vr_* records from
       PDXVotingRecord, judged by the SAME shared engine every other surface
       uses (window._issueRecordSummary / _measureComponentBreakdown in
       stance-helpers.js). It re-implements no verdict logic of its own.
     • It emits objects in the shape renderCanvas(r) already consumes, and hands
       them to PDXReceipts.share(cardObject, btn) — which already accepts a
       receipt OBJECT, so the image pipeline, the native share sheet, the
       desktop fallback menu and the one-tap mobile flow are reused verbatim.
     • NOTHING here is added to PDXReceipts.collect(). No Official Record verdict
       enters a Say-vs-Do score, count, percentage or ranking. The two systems
       stay separated exactly as consistency.js locks them; this file only lets
       one of them produce a picture.

   WHAT MAKES A CARD ELIGIBLE — the trust guards (see GUARDS below). A card is
   built only when every guard passes. Every guard fails CLOSED: an unknown or
   unreadable condition blocks the card rather than shipping it. A refutable
   receipt costs more than a missing one.

   The public surface:
     PDXReceiptCards.warm(pid)            → Promise, loads the record if needed
     PDXReceiptCards.cardsFor(pid, opts)  → every eligible card, strongest first
     PDXReceiptCards.contradiction(pid)   → strongest eligible contradiction card
     PDXReceiptCards.consistency(pid)     → strongest eligible consistency card
     PDXReceiptCards.omnibus(pid, number) → the "one vote, two outcomes" card
     PDXReceiptCards.find(pid, issueKey)  → one card by issue (deep links)
     PDXReceiptCards.share(card, btn)     → one tap → image (via PDXReceipts)
     PDXReceiptCards.audit(pid)           → why each candidate was kept/blocked
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXReceiptCards) return; // idempotent

  var SHARE_HASH = 'record';               // #record=<pid>~<issueKey>
  var METHOD_URL = 'politidex.fyi/#methodology';

  // ══════════════════════════════════════════════════════════════════════════
  // TRUST GUARDS
  // ──────────────────────────────────────────────────────────────────────────
  // Each guard names the defect it exists to stop, so a future reader can tell
  // whether it is still needed. Guards 1–4 are the four required before any card
  // is share-eligible; 5–9 are structural minimums a shareable image needs to
  // survive being screenshotted away from the app. Guards 10 and 11 are two
  // additional exclusions found while wiring this up — both are documented in
  // the same terms and both fail closed. Guards 12–14 are what a SKEPTIC needs:
  // an address that can be derived for the roll call (12), a plain-English
  // statement, on a disapproval resolution, of what a Yea actually did (13), and
  // — because a derived address is a construction and not yet evidence — proof
  // that the address was FETCHED and found to name that vote (14).
  // ══════════════════════════════════════════════════════════════════════════

  // ── Guard 1 · nominations are never share-card eligible ───────────────────
  // Confirmation votes are mapped into vr_measure_issues as POLICY PROXIES — a
  // vote on an HHS nominee carries `healthcare` at weight 100, a vote on an FBI
  // nominee carries `tough_on_crime` and `gov_transparency` in opposite
  // directions. That is a defensible aggregate signal inside the app, next to
  // its own provenance. It is not defensible on a card that has left the app,
  // where "the record shows: voted Yea on healthcare" would rest on a vote about
  // a PERSON. The eight nomination measures in the ledger touch 839 distinct
  // (member, issue) pairs, so this is the single largest exclusion here.
  var BLOCKED_MEASURE_TYPES = { nomination: 'A confirmation vote is mapped as a policy proxy; it cannot carry a policy claim off-app.' };

  // ── Guard 3 · issue keys whose semantics are not coherent ─────────────────
  // `tariffs_authority` collects stances filed as SUPPORT that mean opposite
  // things: one member's support is "the Constitution gives Congress — not the
  // president — the power to set tariffs", another's support is "defends broad
  // presidential authority to impose tariffs quickly without waiting on
  // Congress". A single measure mapping (S.J.Res. 37, yea_supports) cannot be
  // right for both readings, so members who filed the congressional-authority
  // position score backwards. Until the key is split, or every stance under it
  // is re-filed to one meaning, nothing on this key ships.
  var BLOCKED_ISSUE_KEYS = {
    tariffs_authority: 'Support-filed stances under this key carry opposite meanings (congressional authority vs presidential authority), so the single measure mapping reads backwards for one of them.'
  };

  // Keys that are not structurally broken but are not cleared for the first
  // public wave either. Separate from BLOCKED_ISSUE_KEYS so the audit can say
  // which of the two it is, and so lifting a hold does not touch a guard.
  var WAVE1_HOLD_ISSUE_KEYS = {
    america_first_fp: 'held out of wave 1 — the key still carries two readings (America-First framing and war-powers restraint), and a finished card cannot show which one the verdict was scored against'
  };

  // ── Guard 4 · america_first_fp resting on a restraint position ────────────
  // `america_first_fp` is doing double duty, and the ledger shows it on BOTH
  // sides of the card.
  //
  //   The SAID side: some stances filed under it are America-First framed; others
  //   are anti-interventionist / war-powers restraint positions that happen to
  //   share a non-interventionist conclusion.
  //
  //   The DID side: four of the eleven measures mapped to `america_first_fp` are
  //   ALSO mapped to `restraint` — the Iran, Lebanon and Ukraine war-powers
  //   measures (H.Con.Res. 89, H.Con.Res. 108, S.J.Res. 59, H.Amdt. 252). A card
  //   that judged "America First" by a war-powers withdrawal vote would be
  //   resting on a restraint position no matter which side carried it.
  //
  // A `restraint` key already exists and is already mapped, so the durable fix is
  // re-filing under it. Until that happens both sides are held: the stance side by
  // pid and by stance language, the measure side by the measure's own dual
  // mapping. `restraint` itself is unaffected and fully shippable.
  var AFP_KEY = 'america_first_fp';
  var RESTRAINT_KEY = 'restraint';
  var AFP_RESTRAINT_PIDS = { aoc: 1, khanna: 1, tlaib: 1, jayapal: 1, lee: 1 };
  // Belt-and-braces on the same defect: a restraint-framed stance filed under
  // america_first_fp by a pid not in the list above is still blocked. This only
  // ever REMOVES a card, so a false positive costs a share, not a reader's trust.
  var AFP_RESTRAINT_RE = /(endless war|forever war|war powers|unauthoriz|military intervention|bring (?:the )?troops home|diplomacy first|de-?escalat|withdraw(?:al)? from|arms sales)/i;

  // ── Guard 10 · a SAID side that is itself a vote (circular receipt) ───────
  // At least one stance in the corpus is written as "Voted against an amendment
  // (H.Amdt. 252)…". Using that as the "They said" line would produce a card
  // whose two halves are the same fact, and would quietly move a formal
  // legislative action onto the Say-vs-Do side of the card — the exact boundary
  // consistency.js locks. Any stance text that cites a measure number or opens
  // with a vote verb is refused as a SAID side.
  var MEASURE_CITE_RE = /\b(?:H\.?R\.?|S\.?|H\.?J\.?\s?Res\.?|S\.?J\.?\s?Res\.?|H\.?\s?Res\.?|S\.?\s?Res\.?|H\.?\s?Amdt\.?|S\.?\s?Amdt\.?|P\.?N\.?)\s?\d+/i;
  var VOTE_VERB_RE = /\b(voted|vote[sd]? (?:for|against)|cosponsor|co-sponsor|sponsored|roll call)\b/i;

  // ── Guard 11 · duplicated measure identity ────────────────────────────────
  // Two vr_measures rows for the same bill number each carried the same curated
  // issue mapping, so the same bill appeared twice under one issue. The durable
  // fix is the migration that merges those identities
  // (20260802000000_vr_merge_duplicate_joint_resolution_identities.sql). This is
  // the client-side backstop for a database that has not applied it yet: if the
  // warm record set shows one bill NUMBER arriving under two different
  // measureIds on the same issue, no card cites that bill.

  // ══════════════════════════════════════════════════════════════════════════
  // small helpers — all read-only, all guarded (every source loads async)
  // ══════════════════════════════════════════════════════════════════════════
  function canonPid(id) {
    try { return (window.PDXCanonicalPid && window.PDXCanonicalPid(id)) || id; } catch (e) { return id; }
  }
  function polRec(id) {
    var p = null;
    try { if (window.PROFILES && window.PROFILES[id]) p = window.PROFILES[id]; } catch (e) {}
    if (!p) { try { if (window.CMP_DATA && window.CMP_DATA[id]) p = window.CMP_DATA[id]; } catch (e) {} }
    return p;
  }
  function prettyName(id) {
    return String(id || '').replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  function partyChip(raw) {
    var p = String(raw || '').trim().toUpperCase();
    if (!p) return null;
    var c = p.charAt(0);
    if (c === 'R') return { label: 'R', color: '#f87171' };
    if (c === 'D') return { label: 'D', color: '#60a5fa' };
    if (c === 'I') return { label: 'IND', color: '#a78bfa' };
    return { label: p.slice(0, 3), color: '#94a3b8' };
  }
  // Same icon/label split say-vs-do.js uses, so both feeds print the same chip.
  function issueMeta(key) {
    var im = (window.ISSUE_MAP) || {};
    var def = key && im[key];
    if (!def || !def.label) return null;
    var m = String(def.label).match(/^\s*(\p{Extended_Pictographic}(?:️)?)\s*(.*)$/u);
    return m ? { icon: m[1], label: m[2] || def.label } : { icon: '🎯', label: def.label };
  }
  function issueLabel(key) {
    var im = issueMeta(key);
    return im ? im.label : String(key || '');
  }
  function titleCase(s) {
    return String(s || '').replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  function stanceWord(stance) {
    if (stance === 'support') return 'Supports';
    if (stance === 'oppose') return 'Opposes';
    if (stance === 'mixed') return 'Mixed on';
    return 'On';
  }
  function yearOf(d) {
    var m = String(d || '').match(/(19|20)\d{2}/g);
    return m ? parseInt(m[m.length - 1], 10) : 0;
  }
  // 2025-05-01T14:20:00.000Z → 2025-05-01. The card prints a date a reader can
  // match against the Clerk's own record, not a localized rendering of it.
  function dayOf(d) {
    var s = String(d || '');
    var m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : s;
  }
  // ══════════════════════════════════════════════════════════════════════════
  // CANONICAL CITATION  ·  the address printed on the image
  // ──────────────────────────────────────────────────────────────────────────
  // A card is only checkable if the URL on it lands a stranger on the roll call
  // it quotes. The URL the ingest happened to store often does not: 136 of the
  // roll calls in the ledger are sourced to `api.congress.gov/v3/house-vote/...`
  // (a JSON endpoint that returns an API-key error in a browser), and a handful
  // are sourced to a bill's all-actions page, a GovTrack bill page, or a member's
  // own press release — none of which show the vote.
  //
  // So the citation is DERIVED, not copied, from the one thing that identifies a
  // roll call unambiguously: (chamber, congress, session, roll number). Both
  // public chambers publish a stable page keyed on exactly that, and both shapes
  // are confirmed against roll calls already stored in this shape:
  //
  //   House   https://clerk.house.gov/Votes/<calendar year><roll>        (unpadded)
  //   Senate  https://www.senate.gov/legislative/LIS/roll_call_votes/
  //             vote<congress><session>/vote_<congress>_<session>_<roll>.htm
  //                                                        (roll padded to five)
  //
  // The tuple comes from the record item when the server sends it, and is
  // otherwise recovered from an api.congress.gov or GovTrack VOTE url, both of
  // which encode it in their path. A URL already in canonical form is passed
  // through untouched. Anything else yields null and guard 12 refuses the card:
  // a receipt whose address does not resolve is worse than no receipt.
  // ══════════════════════════════════════════════════════════════════════════

  // Both derived shapes stay well inside this; it exists so a future source shape
  // cannot silently push the footer line past the card's printable width. The
  // renderer additionally shrinks the line to fit — neither layer ever elides.
  var VERIFY_MAX = 96;
  var API_VOTE_RE = /api\.congress\.gov\/v3\/(house|senate)-vote\/(\d+)\/(\d+)\/(\d+)/i;
  var GOVTRACK_VOTE_RE = /govtrack\.us\/congress\/votes\/(\d+)-(\d{4})\/([hs])(\d+)/i;
  var CANON_CLERK_RE = /^https:\/\/clerk\.house\.gov\/Votes\/\d{5,}$/i;
  var CANON_LIS_RE = /^https:\/\/(?:www\.)?senate\.gov\/legislative\/LIS\/roll_call_votes\/vote\d+\/vote_\d+_\d+_\d{5}\.htm$/i;

  function intOf(v) {
    var n = parseInt(v, 10);
    return (isFinite(n) && n > 0) ? n : 0;
  }
  function padRoll(n) {
    var s = String(n);
    while (s.length < 5) s = '0' + s;
    return s;
  }
  // Congress N convenes in 1789 + 2(N-1); its first session is that calendar year.
  // Used only to recover a session from a GovTrack path, which carries the year
  // instead. Returns 0 when the pair is not a session of that congress, so a bad
  // parse fails closed rather than producing a URL for the wrong vote.
  function sessionOfYear(congress, year) {
    var s = year - (1789 + 2 * (congress - 1)) + 1;
    return (s === 1 || s === 2) ? s : 0;
  }
  // (congress, session, roll) or null. Explicit fields first — they come straight
  // from vr_rollcalls — then whatever the stored URL encodes.
  function rollTuple(item) {
    if (!item) return null;
    var c = intOf(item.congress), s = intOf(item.session), r = intOf(item.rollNumber);
    var url = String((item.source && item.source.url) || '');
    if (!(c && s && r)) {
      var a = url.match(API_VOTE_RE);
      if (a) { c = intOf(a[2]); s = intOf(a[3]); r = intOf(a[4]); }
    }
    if (!(c && s && r)) {
      var g = url.match(GOVTRACK_VOTE_RE);
      if (g) { c = intOf(g[1]); r = intOf(g[4]); s = sessionOfYear(c, intOf(g[2])); }
    }
    return (c && s && r) ? { congress: c, session: s, roll: r } : null;
  }
  // scheme and www stripped so the address fits a footer line and still reads as
  // something you can type. Nothing else is removed — no path is shortened and no
  // ellipsis is ever added, because a URL you cannot retype is not a citation.
  // (No source URL in the ledger carries a query or a fragment, and one that did
  // would be refused below rather than silently truncated.)
  function printableUrl(u) {
    return String(u || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  }
  function cite(url, label) {
    if (/[?#]/.test(url)) return null;         // a stripped query would cite the wrong thing
    var print = printableUrl(url);
    if (!print || print.length > VERIFY_MAX) return null;
    return { url: url, print: print, label: label };
  }
  // The public roll-call page for this vote, or null when one cannot be derived.
  function canonicalCitation(item) {
    if (!item || item.kind !== 'vote') return null;
    var url = String((item.source && item.source.url) || '').trim();
    // Already the page we would have built.
    if (CANON_CLERK_RE.test(url)) return cite(url, 'U.S. House Clerk');
    if (CANON_LIS_RE.test(url)) return cite(url, 'U.S. Senate');
    var t = rollTuple(item);
    if (!t) return null;
    var chamber = String(item.chamber || '').toLowerCase();
    if (chamber === 'house') {
      // The Clerk keys its vote pages on the CALENDAR year of the vote, not on the
      // congress — so a card with no usable date has no derivable address.
      var y = yearOf(item.date);
      if (!y) return null;
      return cite('https://clerk.house.gov/Votes/' + y + t.roll, 'U.S. House Clerk · roll call ' + t.roll);
    }
    if (chamber === 'senate') {
      return cite('https://www.senate.gov/legislative/LIS/roll_call_votes/vote' + t.congress + t.session +
        '/vote_' + t.congress + '_' + t.session + '_' + padRoll(t.roll) + '.htm',
        'U.S. Senate · roll call ' + t.roll);
    }
    return null;
  }
  function positionMapFor(pid) {
    try {
      var d = polRec(pid);
      if (window._polPositionMap) return window._polPositionMap(pid, d) || {};
    } catch (e) {}
    return {};
  }
  function recordsFor(pid) {
    try {
      if (window.PDXVotingRecord && typeof window.PDXVotingRecord.memberRecords === 'function') {
        return window.PDXVotingRecord.memberRecords(pid) || null;
      }
    } catch (e) {}
    return null;
  }
  function mappingOn(item, issueKey) {
    var list = (item && Array.isArray(item.issues)) ? item.issues : [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].issueKey === issueKey) return list[i];
    }
    return null;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GUARD EVALUATION
  // ──────────────────────────────────────────────────────────────────────────
  // Each function returns '' when the guard passes, or a plain-language reason
  // when it blocks. The reasons are what audit() reports and what the Part-4
  // exclusion list is generated from — they are not decoration.
  // ══════════════════════════════════════════════════════════════════════════

  // Guards 1, 5–8: is this ONE record citable on a card at all?
  function blockRecord(item) {
    if (!item) return 'no record';
    // Guard 1 — nominations.
    var mt = String(item.measureType || '').toLowerCase();
    if (BLOCKED_MEASURE_TYPES[mt]) return BLOCKED_MEASURE_TYPES[mt];
    // Guard 5 — a card says "the record shows … voted <position>". Only an actual
    // recorded yea/nay does. Positions (co-sponsorships, amicus filings,
    // litigation, executive actions) are real record, but they are not votes and
    // this feed does not claim they are.
    if (item.kind !== 'vote') return 'not a recorded floor vote (' + (item.kind || 'unknown') + ')';
    if (item.position !== 'yea' && item.position !== 'nay') {
      return 'no directional vote recorded (' + (item.position || 'none') + ')';
    }
    // Guard 6 — procedural votes are down-weighted inside the app for good
    // reason: a yea on a motion to table is not a yea on the bill. Off-app,
    // where the nuance cannot travel with the image, they do not ship at all.
    if (item.isProcedural || item.advanceInverted) return 'procedural vote — the question does not read plainly off-app';
    // Guard 7 — the four things the card must print. A missing one makes the card
    // uncheckable, which is the only thing worse than not shipping it.
    if (!item.number) return 'measure has no bill number to cite';
    if (!item.action) return 'roll call has no recorded question';
    if (!item.date) return 'record carries no date';
    if (!item.source || !item.source.url) return 'record carries no source URL';
    // Guard 8 — a provisional title ("Roll call 310") names nothing a reader can
    // look up, and the card's supporting line is built from the title.
    if (/^roll\s*call\b/i.test(String(item.title || ''))) return 'measure title is still provisional';
    return '';
  }

  // ── Guard 12 · the card must print an address that resolves ───────────────
  // See CANONICAL CITATION above. Failing this means we know which roll call the
  // card quotes but cannot point a stranger at a page that shows it — most often
  // because the roll number was never captured (the vote is sourced to a bill's
  // all-actions page or a chamber's vote index, neither of which identifies it).
  function blockCitation(item) {
    if (canonicalCitation(item)) return '';
    var u = String((item && item.source && item.source.url) || '');
    if (/api\.congress\.gov/i.test(u)) {
      return 'the only stored source is an api.congress.gov endpoint and the roll-call number is missing, so no public roll-call page can be derived';
    }
    return 'no canonical public roll-call page can be derived for this vote (stored source is not a roll-call page and the roll number is missing)';
  }

  // ── Guard 14 · the citation has to have been READ, not just built ──────────
  // canonicalCitation constructs an address. Construction is not verification:
  // it is right only if the roll number is right AND the chamber's URL scheme is
  // what we believe it is, and it is a dead link — or, worse, a link to somebody
  // else's vote — if either slips. scripts/vr-check-citations.mjs fetches every
  // derivable citation and reads the page, and anything it could not confirm is
  // listed here. The list is generated, not hand-written; scripts/test-receipt-
  // cards.mjs re-derives it from db/vr-citation-check.json on every run, so it
  // cannot drift away from the evidence, and `--verify` re-checks it live.
  //
  // Only citations the check REFUSED appear here — an empty list is the healthy
  // state. This is a denylist rather than an allowlist on purpose: an allowlist
  // would silently un-publish every newly ingested roll call until someone
  // re-ran a network script, which trades a rare wrong link for a routine
  // outage. The report says plainly which addresses were read and when.
  //
  // ENTRY SHAPE — { measure, why }. `measure` is the measure the CHAMBER'S OWN
  // RECORD names for that roll call, copied from the evidence file's `pageMeasure`.
  // It is what keeps this guard correct in both deploy orderings when a repair
  // migration is in flight: while the ledger still names the wrong bill the card
  // disagrees with the page and is refused, and the moment the migration lands and
  // the card names what the page names, it publishes — no second deploy, and no
  // window in which a card prints the wrong bill. An entry with no `measure` (a
  // dead link, or a page that does not name its own roll call) is refused
  // unconditionally, because there is nothing a corrected ledger could come to
  // agree with.
  var UNRESOLVED_CITATIONS = {
    // Empty, and that is the healthy state — see the note above. It is not empty
    // because the guard was relaxed: the sweep recorded in db/vr-citation-check.json
    // fetched all 138 distinct citations, read each chamber's structured record, and
    // refused none of them.
    //
    // It previously held two entries, Senate roll 119-1-7 and House roll 119-1-23,
    // both votes on S. 5 that the ledger had filed under H.R. 29. Migration
    // 20260804000000_vr_repair_laken_riley_measure_identity.sql repaired the ledger
    // and has deployed, so the cards and the chamber records now name the same bill
    // and there is nothing left to refuse. The entries are dropped rather than kept
    // as history because scripts/test-receipt-cards.mjs asserts this list is exactly
    // the set of citations the evidence file could not confirm — a stale entry here
    // is drift, and drift is the one thing that can make this guard wrong.
    //
    // The guard itself is unchanged and still fails closed: the next sweep that
    // cannot confirm a citation puts it back, and the measure-aware behaviour is
    // covered by fixtures in the test rather than by whatever happens to be listed.
  };
  // "S. 5", "S 5" and "S.5" are the same bill written three ways, and the two
  // chambers punctuate differently, so agreement is judged on the bare token.
  function sameMeasure(a, b) {
    var na = String(a || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    var nb = String(b || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return !!na && na === nb;
  }
  function blockUnverifiedCitation(item) {
    var cit = canonicalCitation(item);
    if (!cit) return '';                       // guard 12 already refused it
    var entry = UNRESOLVED_CITATIONS[cit.url];
    if (!entry) return '';
    // The card now names the same measure the page does: the mismatch this entry
    // was recorded for has been repaired, and the citation checks out.
    if (entry.measure && sameMeasure(item.number, entry.measure)) return '';
    return entry.why;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PLAIN-ENGLISH OPERATIVE EFFECT  ·  disapproval resolutions
  // ──────────────────────────────────────────────────────────────────────────
  // "Providing for congressional disapproval under chapter 8 of title 5, United
  // States Code, of the rule submitted by the Internal Revenue Service relating
  // to gross proceeds reporting by brokers…" tells a reader what the resolution
  // is ABOUT. It does not tell them that voting Yea CANCELLED that rule — and on
  // a Congressional Review Act resolution the direction is the whole meaning of
  // the vote. A reader who does not already know how the CRA works can read the
  // title, read "Voted Yea", and get the vote exactly backwards.
  //
  // So a disapproval card must carry a sentence that says what a Yea did, and
  // that sentence is QUOTED, never composed: the curators already wrote one into
  // vr_measure_issues.rationale ("…a yea rolls back the mandate", "…a yea strikes
  // the CFPB overdraft regulation off the books"). The operative effect is a
  // property of the MEASURE, not of the issue the card names, so any of the
  // measure's own mappings may supply it — the card's own mapping is preferred,
  // and the sentence is printed FIRST so it is the one clause that can never be
  // pushed off the bottom of the supporting block. If no rationale states it,
  // guard 13 refuses the card rather than letting the title speak for the vote.
  // ══════════════════════════════════════════════════════════════════════════
  var DISAPPROVAL_RE = /\b(?:disapprov|nullif)|terminat\w*\s+the\s+national\s+emergency/i;
  var YEA_CLAUSE_RE = /\ba yea\b[^.;]*/i;

  function isDisapproval(item) {
    return !!(item && DISAPPROVAL_RE.test(String(item.title || '')));
  }
  // { text, fromSelected } or null. `text` is the curators' own clause, lifted
  // whole and given a capital and a full stop; no wording is added to it.
  function yeaEffect(item, mapping) {
    var list = (item && Array.isArray(item.issues)) ? item.issues : [];
    var ordered = [];
    if (mapping) ordered.push(mapping);
    list.forEach(function (m) { if (m && m !== mapping) ordered.push(m); });
    for (var i = 0; i < ordered.length; i++) {
      var raw = String((ordered[i] && ordered[i].rationale) || '').replace(/\s+/g, ' ').trim();
      var hit = raw.match(YEA_CLAUSE_RE);
      if (!hit) continue;
      var s = hit[0].trim().replace(/[.;,]+$/, '');
      if (!s) continue;
      return { text: s.charAt(0).toUpperCase() + s.slice(1) + '.', fromSelected: i === 0 && !!mapping };
    }
    return null;
  }

  // What is left of a rationale once the "a yea …" clause has been lifted out of
  // it and promoted to its own tier. Cutting a clause out of the middle or the
  // end of a curated sentence leaves the punctuation that joined it behind, and
  // that punctuation then prints. The live ledger had one of these on public
  // view: "…whose entire operative effect is to nullify a federal rule; ." — the
  // semicolon that introduced the clause, then the full stop that ended it, with
  // nothing between them. A card that cannot punctuate itself is not evidence a
  // reader will trust with anything harder.
  //
  // Only the seam is repaired: separators orphaned at the cut, then a full stop
  // restored if the surviving words lost theirs. No word of the curators' text is
  // rewritten, and a remainder that is only punctuation collapses to nothing so
  // the segment drops out entirely rather than shipping as a stray mark.
  function tidyRemainder(s) {
    var t = String(s || '').replace(/\s+/g, ' ').trim();
    t = t.replace(/[\s;,]+([.!?])\s*$/, '$1');   // "rule; ."  → "rule."
    t = t.replace(/[\s;,]+$/, '');               // "rule;"    → "rule"
    if (!/[A-Za-z0-9)\]"'”’]/.test(t)) return '';
    if (!/[.!?]["'”’)\]]?$/.test(t)) t += '.';
    return t;
  }

  function blockPlainEffect(item, issueKey) {
    if (!isDisapproval(item)) return '';
    if (yeaEffect(item, mappingOn(item, issueKey))) return '';
    return 'this is a disapproval-style resolution and no curated rationale states in plain words what a Yea did — the title alone would let a reader read the vote backwards';
  }

  // Guards 3, 4: is this ISSUE key shippable for this member, on this record?
  function blockIssue(pid, issueKey, stanceText, item) {
    if (!issueKey) return 'record is not mapped to a curated issue';
    if (BLOCKED_ISSUE_KEYS[issueKey]) return BLOCKED_ISSUE_KEYS[issueKey];
    if (!issueMeta(issueKey)) return 'issue key is not in the live ISSUE_MAP';
    if (issueKey === AFP_KEY) {
      if (AFP_RESTRAINT_PIDS[canonPid(pid)] || AFP_RESTRAINT_PIDS[pid]) {
        return 'stance is a restraint position filed under america_first_fp — hold until it is re-filed under `restraint`';
      }
      if (stanceText && AFP_RESTRAINT_RE.test(String(stanceText))) {
        return 'stance text reads as a restraint position filed under america_first_fp — hold until it is re-filed under `restraint`';
      }
      // The measure side of the same defect, read off the measure's own mappings:
      // if the cited vote is ALSO curated as `restraint`, the card rests on a
      // restraint position whichever side of it the member came down on.
      if (item && mappingOn(item, RESTRAINT_KEY)) {
        return 'the cited vote is curated as both america_first_fp and `restraint` — the card would rest on a restraint position; hold until the keys are separated';
      }
    }
    return '';
  }

  // Not a guard. A guard says a card is structurally refutable; a wave hold says
  // a card we could build is not cleared to go out yet. They are kept apart so
  // the audit can name which one stopped a card, and so lifting a hold is one
  // deletion that cannot weaken a guard by accident.
  //
  // The america_first_fp hold: guard 4 above catches the cards provably resting
  // on a restraint position. What it cannot catch is the residual ambiguity in
  // the KEY ITSELF — a reader looking at a finished card has no way to tell which
  // reading of "America First Foreign Policy" the verdict was scored against, and
  // both readings are live in the stance data. In the app the stance text sits
  // next to the verdict and settles it; on a PNG it does not travel.
  function wave1Hold(issueKey) {
    return WAVE1_HOLD_ISSUE_KEYS[issueKey] || '';
  }

  // Guard 10: is this SAID side a stated position, rather than a vote?
  function blockStance(text) {
    var s = String(text || '').trim();
    if (!s) return 'no stated position on this issue to line the vote up against';
    if (MEASURE_CITE_RE.test(s)) return 'stated position cites a measure number — it is itself vote-derived, so the card would be circular';
    if (VOTE_VERB_RE.test(s)) return 'stated position is written as a vote — it is itself vote-derived, so the card would be circular';
    return '';
  }

  // Guard 11: does one bill number reach this issue through two measure ids?
  function blockDuplicateIdentity(records, issueKey, number) {
    if (!number) return '';
    var ids = {}, n = 0;
    (records || []).forEach(function (it) {
      if (!it || it.number !== number) return;
      if (!mappingOn(it, issueKey)) return;
      var id = String(it.measureId == null ? '' : it.measureId);
      if (!ids[id]) { ids[id] = 1; n++; }
    });
    return n > 1 ? 'bill ' + number + ' reaches this issue through ' + n + ' separate measure rows — duplicate identity not yet merged' : '';
  }

  // Guard 9 (verdict stability): the card's verdict must be the SAME verdict the
  // member's own profile shows for this issue, computed over the WHOLE record —
  // not just over the votes a card is allowed to cite. Without this a member
  // whose net record on healthcare is consistent (because most of the weight sits
  // on a nomination proxy) could still yield a "contradicts" card built from the
  // one substantive bill, and the card would disagree with the page it links to.
  // Anyone who followed the link would be right to call the card wrong.
  function stableVerdict(summary, want) {
    if (!summary) return 'no record summary for this issue';
    if (summary.netVerdict !== want) {
      return 'net record verdict on this issue is "' + summary.netVerdict + '", not "' + want + '" — a ' + want + ' card would contradict the profile it links to';
    }
    return '';
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CARD CONSTRUCTION
  // ──────────────────────────────────────────────────────────────────────────
  // The object below is exactly what say-vs-do.js's renderCanvas(r) draws. Three
  // fields are new and OPTIONAL there, so curated receipts are unaffected:
  //   r.verifyUrl — the citable source URL, printed in the footer
  //   r.method    — the visible method link, printed under it
  //   r.split     — the omnibus "one vote, N issues" block
  // Everything else (pid/name/sub/party/issue/said/headline/facts/date/source/
  // impact/verdict) is the pre-existing receipt contract.
  // ══════════════════════════════════════════════════════════════════════════

  var VERDICTS = {
    contradicts: { key: 'contradicts', cls: 'v-contradicts', ico: '⚠', label: 'Says One Thing · Voted Another', rank: 5 },
    consistent:  { key: 'consistent',  cls: 'v-consistent',  ico: '✓', label: 'Vote Matched The Words',        rank: 2 },
    omnibus:     { key: 'omnibus',     cls: 'v-omnibus',     ico: '⇅', label: 'One Vote · Two Outcomes',       rank: 4 }
  };

  // "H.J.Res. 78 · On Passage · Voted Yea" — bill, question, position, in the same
  // order and the same words the profile's Official Record proof line uses. Built
  // from PDXConsistency.proof.proofText when that module is loaded so the two can
  // never drift; the local fallback prints the identical string.
  function proofLine(item) {
    var t = '';
    try {
      if (window.PDXConsistency && window.PDXConsistency.proof &&
          typeof window.PDXConsistency.proof.proofText === 'function') {
        t = window.PDXConsistency.proof.proofText(item) || '';
      }
    } catch (e) {}
    if (!t) {
      var parts = [];
      if (item.number) parts.push(String(item.number));
      else if (item.title) parts.push(String(item.title));
      if (item.action) parts.push(String(item.action));
      if (item.position) parts.push('Voted ' + titleCase(item.position));
      t = parts.join(' · ');
    }
    // Two roll calls in the ledger carry a question that repeats the measure
    // number it belongs to ("On the Joint Resolution H.J.Res. 88"), which reads as
    // a stutter once the number is already the first field — and one of them is
    // the single most-cited measure here. Collapse the repeat on the CARD only:
    // the profile row keeps the Clerk's question verbatim, and nothing but the
    // duplicated number is removed.
    var num = String((item && item.number) || '');
    if (num && t.split(num).length > 2) {
      var seg = t.split(' · ');
      for (var i = 1; i < seg.length; i++) {
        var stripped = seg[i].split(num).join(' ').replace(/\s{2,}/g, ' ').trim();
        if (stripped) seg[i] = stripped;
      }
      t = seg.join(' · ');
    }
    return t;
  }

  // The supporting line under the headline: what the bill is, how the chamber
  // came down, and — when the mapping carries one — the curated rationale for why
  // this bill speaks to this issue. Every clause is quoted from stored data.
  //
  // On a disapproval resolution the curators' plain-English "what a Yea did"
  // clause leads, because it is the clause a reader cannot reconstruct from the
  // title and the only one the line budget must never drop. When that clause came
  // from THIS mapping's own rationale, it is removed from the rationale so the
  // card states it once rather than twice.
  // The supporting block, as SEGMENTS in descending order of load-bearing-ness:
  //
  //   0  what a Yea actually did, in plain words   (disapproval measures only)
  //   1  the measure's own title
  //   2  the mapping rationale
  //   3  chamber · result
  //
  // Segments 0 and 1 are PROTECTED. The card canvas has a finite number of fact
  // lines and used to spend them first-come-first-served on one long string, so a
  // wordy rationale could push the cut into the bill title and ship a card whose
  // measure trails off mid-name — the one string on the block a reader needs
  // intact to look the vote up for themselves. Keeping the parts separate lets the
  // renderer drop whole trailing segments until the block fits, so what is lost is
  // the least load-bearing sentence rather than the middle of the title.
  //
  // `facts` stays the joined string: it is what the pasted caption and every
  // non-canvas surface read, and neither of those is line-limited, so they keep
  // the whole thing.
  var FACTS_PROTECTED = 2;
  function supportingParts(item, mapping) {
    var parts = [];
    var rat = (mapping && mapping.rationale) ? String(mapping.rationale).replace(/\s+/g, ' ').trim() : '';
    if (isDisapproval(item)) {
      var eff = yeaEffect(item, mapping);
      if (eff) {
        parts.push(eff.text);
        if (eff.fromSelected) rat = tidyRemainder(rat.replace(YEA_CLAUSE_RE, ''));
      }
    }
    // Index 1 is always the title slot, even when the measure has no operative-
    // effect sentence in front of it, so the protected prefix is a fixed length
    // and the renderer never has to guess which segment is the title.
    if (parts.length === 0) parts.push('');
    parts.push(item.title ? String(item.title).replace(/\s+/g, ' ').trim() : '');
    if (rat) parts.push(rat);
    var tail = [];
    if (item.chamber) tail.push(titleCase(item.chamber));
    if (item.result) tail.push(String(item.result));
    if (tail.length) parts.push(tail.join(' · '));
    return parts;
  }
  function supportingText(item, mapping) {
    return supportingParts(item, mapping).filter(Boolean).join(' — ');
  }

  function baseCard(pid, item, issueKey, stance, verdict) {
    var d = polRec(pid);
    var name = (d && d.name) || prettyName(pid);
    var sub = d
      ? [d.office, d.district, d.state].map(function (x) { return String(x == null ? '' : x).trim(); })
          .filter(Boolean).join(' · ')
      : '';
    var photo = '';
    try { if (typeof window._getPhotoUrl === 'function') photo = window._getPhotoUrl(pid) || ''; } catch (e) {}
    var mapping = mappingOn(item, issueKey);
    var date = dayOf(item.date);
    // Guard 12 has already refused anything this cannot resolve, so a built card
    // always cites a page a stranger can open.
    var citation = canonicalCitation(item) || { url: '', print: '', label: 'Official record' };

    return {
      // identity
      pid: pid, name: name, sub: sub, party: d ? partyChip(d.party) : null,
      photo: photo, hasOffice: !!(d && (d.office || d.district)),
      // issue
      issueKey: issueKey, issue: issueMeta(issueKey),
      // SAID — the stated position, verbatim
      said: { text: stance.text || stance.topic || '', word: stanceWord(stance.stance) },
      // ── Chronology honesty ────────────────────────────────────────────────
      // Stance blocks carry no date — not one of the 5,041 in the corpus does. A
      // card headed "THEY SAID" above a dated vote therefore asserts a sequence
      // the data cannot support: a reader would take it to mean the words came
      // first and the vote broke them, which on some of these pairs is simply not
      // known. Inventing a date is out, and refusing every contradiction card
      // would throw away the whole feed, so the card stops making the claim: a
      // present-tense label for an undated position, and a line that says so
      // outright. The verdict itself is unaffected — it never depended on order,
      // only on whether the position and the vote point the same way.
      saidLabel: 'THEIR STATED POSITION',
      saidNote: 'Stated position is undated — this card does not claim it came before the vote.',
      // DID — bill, question, position, date
      headline: proofLine(item),
      facts: supportingText(item, mapping),
      // The same content the renderer can shorten a segment at a time. Empty
      // slots are kept so index 1 is always the title; the canvas skips them.
      factParts: supportingParts(item, mapping),
      factProtected: FACTS_PROTECTED,
      why: '',
      date: date,
      source: { url: citation.url, label: citation.label },
      // renderer hints
      category: 'official_record',
      impact: verdict.key === 'contradicts' ? 'negative' : 'positive',
      verdict: verdict,
      verifyUrl: citation.print,
      method: 'HOW THIS IS JUDGED: ' + METHOD_URL,
      // Provenance a caller (or a test) can read without re-deriving it. `origin`
      // is what keeps this feed identifiable downstream: nothing that carries it
      // may be counted into a Say-vs-Do score. `sourceStored` is the URL the
      // ingest recorded — kept so the derivation is auditable, never printed.
      origin: 'official_record',
      sourceStored: (item.source && item.source.url) || '',
      measureNumber: item.number || '',
      rollcallId: item.rollcallId || null,
      hash: '#' + SHARE_HASH + '=' + encodeURIComponent(pid) + '~' + encodeURIComponent(issueKey),
      score: 0
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CANDIDATE ENUMERATION
  // ──────────────────────────────────────────────────────────────────────────
  // For one member: every (issue, cited vote) pair the engine already ranks,
  // annotated with the guard verdict. Returns candidates in BOTH states so
  // audit() can report the exclusions rather than only the survivors.
  // ══════════════════════════════════════════════════════════════════════════
  function candidates(pid) {
    pid = canonPid(pid);
    var records = recordsFor(pid);
    if (!records || !records.length) return [];
    if (typeof window._issueRecordSummary !== 'function') return [];

    var pm = positionMapFor(pid);
    // Group the member's records by every issue they map to — the same grouping
    // _polRecordMap does, kept local so a card never depends on a whole-profile
    // map being built first.
    var byIssue = {};
    records.forEach(function (it) {
      if (!it || !Array.isArray(it.issues)) return;
      it.issues.forEach(function (m) {
        if (!m || !m.issueKey) return;
        (byIssue[m.issueKey] = byIssue[m.issueKey] || []).push(it);
      });
    });

    var out = [];
    Object.keys(byIssue).forEach(function (issueKey) {
      var pos = pm[issueKey];
      var stance = pos ? pos.stance : null;
      // The engine's own aggregate over the FULL record for this issue. This is
      // the number the profile shows, and guard 9 holds the card to it.
      var summary = window._issueRecordSummary(issueKey, stance, byIssue[issueKey]);

      [['contradicts', summary.topContradiction], ['consistent', summary.topConsistent]]
        .forEach(function (pair) {
          var want = pair[0], item = pair[1];
          if (!item) return;
          var cand = {
            pid: pid, issueKey: issueKey, want: want, item: item,
            summary: summary, stance: pos || null, blocked: ''
          };
          // Guard order is the order a reader would check them in: is the issue
          // shippable, is there a real stated position, is the cited vote
          // citable, can it be pointed at, does it read plainly, is the identity
          // clean, does the verdict hold.
          cand.blocked =
            blockIssue(pid, issueKey, pos && pos.text, item) ||
            (pos ? '' : 'no stated position on this issue to line the vote up against') ||
            blockStance(pos && pos.text) ||
            blockRecord(item) ||
            blockCitation(item) ||
            blockUnverifiedCitation(item) ||
            blockPlainEffect(item, issueKey) ||
            blockDuplicateIdentity(records, issueKey, item.number) ||
            stableVerdict(summary, want) ||
            wave1Hold(issueKey);
          out.push(cand);
        });
    });

    // Strongest first: decisiveness of the issue verdict, then the weight of the
    // cited vote, then recency. Contradictions and consistencies are ranked in
    // the same units so neither is structurally favoured.
    out.forEach(function (c) {
      var mapping = mappingOn(c.item, c.issueKey);
      var w = (mapping && typeof mapping.weight === 'number') ? mapping.weight : 100;
      var margin = Math.abs(c.summary.contradictScore - c.summary.consistentScore);
      c.strength = w + margin + Math.max(0, yearOf(c.item.date) - 2000) + (c.summary.total > 1 ? 25 : 0);
    });
    out.sort(function (a, b) { return b.strength - a.strength; });
    return out;
  }

  function toCard(cand) {
    if (!cand || cand.blocked) return null;
    var card = baseCard(cand.pid, cand.item, cand.issueKey, cand.stance, VERDICTS[cand.want]);
    card.score = cand.strength;
    card.recordSummary = {
      total: cand.summary.total,
      consistent: cand.summary.consistent,
      contradicts: cand.summary.contradicts,
      netVerdict: cand.summary.netVerdict
    };
    return card;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // THE OMNIBUS SPLIT CARD  ·  "one vote, two outcomes"
  // ──────────────────────────────────────────────────────────────────────────
  // Built on top of an ordinary eligible card, never instead of one: the same
  // member, the same stated position, the same single cited vote, the same
  // guards. What it adds is the disclosure that the one vote it cites moved
  // several curated issues at once, and in opposite directions — read straight
  // off _measureComponentBreakdown, the same primitive the H.R. 1 Showcase and
  // the profile's multi-issue note use. It invents no mapping and re-weights
  // nothing; it only names what the mapping already says.
  //   One claim per card is preserved: the claim is still "this member's stated
  //   position on THIS issue vs their vote", and the split is the context that
  //   makes that vote legible rather than a second claim.
  // ══════════════════════════════════════════════════════════════════════════
  function splitFor(item, issueKey) {
    if (typeof window._measureComponentBreakdown !== 'function') return null;
    var brk;
    try { brk = window._measureComponentBreakdown(item, {}, { labelFn: issueLabel }); }
    catch (e) { return null; }
    if (!brk || !brk.isOmnibus) return null;
    var advances = [], opposes = [], self = null;
    brk.components.forEach(function (c) {
      if (self === null && c.issueKey === issueKey) { self = c; return; }
      if (c.effect === 'advances') advances.push(c.label);
      else if (c.effect === 'opposes') opposes.push(c.label);
    });
    if (self) {
      // The focus issue belongs on its own side of the split, first, so the card
      // never appears to leave out the issue it is judging.
      if (self.effect === 'advances') advances.unshift(self.label);
      else if (self.effect === 'opposes') opposes.unshift(self.label);
    }
    // Only a genuine split is worth a different card. A bill that pushes six
    // issues the same way is an ordinary vote with a long mapping list.
    if (!advances.length || !opposes.length) return null;
    return {
      count: brk.count,
      advances: advances,
      opposes: opposes,
      focusKey: issueKey,
      focusEffect: self ? self.effect : 'none'
    };
  }

  function omnibus(pid, number) {
    var want = number ? String(number).toUpperCase().replace(/\s+/g, ' ') : '';
    var list = candidates(pid).filter(function (c) {
      if (c.blocked) return false;
      if (!want) return true;
      return String(c.item.number || '').toUpperCase().replace(/\s+/g, ' ') === want;
    });
    for (var i = 0; i < list.length; i++) {
      var split = splitFor(list[i].item, list[i].issueKey);
      if (!split) continue;
      var card = toCard(list[i]);
      if (!card) continue;
      card.split = split;
      // The stamp changes because the CLAIM the reader should take away changes:
      // the same vote moved this issue one way and others the other way. The
      // underlying say-vs-do verdict is preserved on the card for anyone reading
      // it programmatically.
      card.saydoVerdict = card.verdict;
      card.verdict = VERDICTS.omnibus;
      card.impact = card.saydoVerdict.key === 'contradicts' ? 'negative' : 'positive';
      return card;
    }
    return null;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC READS
  // ══════════════════════════════════════════════════════════════════════════
  function cardsFor(pid, opts) {
    opts = opts || {};
    var cards = [];
    candidates(pid).forEach(function (c) {
      var card = toCard(c);
      if (!card) return;
      if (opts.want && card.verdict.key !== opts.want) return;
      if (opts.issueKey && card.issueKey !== opts.issueKey) return;
      // One card per (member, issue): the strongest one. A member with a stated
      // position and a mixed record does not get two cards arguing with each
      // other.
      for (var i = 0; i < cards.length; i++) if (cards[i].issueKey === card.issueKey) return;
      cards.push(card);
    });
    return cards;
  }
  function firstOf(pid, want) {
    var list = cardsFor(pid, { want: want });
    return list.length ? list[0] : null;
  }
  function contradiction(pid) { return firstOf(pid, 'contradicts'); }
  function consistency(pid) { return firstOf(pid, 'consistent'); }
  function find(pid, issueKey) {
    if (!pid) return null;
    var list = cardsFor(pid, issueKey ? { issueKey: issueKey } : {});
    return list.length ? list[0] : null;
  }
  // Every candidate with the reason it was kept or dropped. This is the surface
  // the Wave-1 exclusion list is read off, and the surface the tests assert on.
  function audit(pid) {
    return candidates(pid).map(function (c) {
      return {
        pid: c.pid, issueKey: c.issueKey, want: c.want,
        measure: c.item.number || '', measureType: c.item.measureType || '',
        question: c.item.action || '', position: c.item.position || '',
        date: dayOf(c.item.date), netVerdict: c.summary.netVerdict,
        eligible: !c.blocked, reason: c.blocked || 'eligible'
      };
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WARMING  ·  the record has to be in the sync cache before a card exists
  // ──────────────────────────────────────────────────────────────────────────
  // Mirrors consistency.js's queueWarm: one attempt per member, resolves to
  // whatever is warm afterwards. Never throws — a card that cannot be built is
  // simply not offered.
  // ══════════════════════════════════════════════════════════════════════════
  var _warmed = {};
  function warm(pid) {
    pid = canonPid(pid);
    if (!pid) return Promise.resolve(null);
    if (recordsFor(pid)) return Promise.resolve(recordsFor(pid));
    if (_warmed[pid]) return _warmed[pid];
    var VR = window.PDXVotingRecord;
    if (!VR || typeof VR.fetchMember !== 'function') return Promise.resolve(null);
    _warmed[pid] = VR.fetchMember(pid, { pageSize: 100 }).then(function (data) {
      if (data && data.items && data.items.length && typeof VR.noteMember === 'function') {
        VR.noteMember(pid, data.items);
      }
      return recordsFor(pid);
    }).catch(function () { return null; });
    return _warmed[pid];
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SHARE  ·  one tap, straight through the existing pipeline
  // ──────────────────────────────────────────────────────────────────────────
  // PDXReceipts.share() already accepts a receipt OBJECT (it branches on
  // `idOrReceipt.verdict`), so a vote-derived card needs no new image code, no
  // new share sheet and no new fallback menu. Mobile stays one tap: the button
  // handler calls share(pid) and the record is warmed inside that same gesture.
  // ══════════════════════════════════════════════════════════════════════════
  function share(cardOrPid, btn) {
    var card = (cardOrPid && cardOrPid.verdict) ? cardOrPid : null;
    if (card) return doShare(card, btn);
    var pid = cardOrPid;
    var ready = find(pid);
    if (ready) return doShare(ready, btn);
    // Not warm yet — fetch, then share. Still one tap for the reader.
    return warm(pid).then(function () {
      var c = find(pid);
      if (c) return doShare(c, btn);
      if (window.PDXReceipts && typeof window.PDXReceipts.share === 'function') {
        // Nothing eligible on the record side. Fall back to the curated feed
        // rather than telling the reader nothing exists.
        return window.PDXReceipts.share(pid, btn);
      }
      return null;
    });
  }
  function doShare(card, btn) {
    if (!window.PDXReceipts || typeof window.PDXReceipts.share !== 'function') return null;
    return window.PDXReceipts.share(card, btn);
  }
  function renderImage(card) {
    if (!window.PDXReceipts || typeof window.PDXReceipts.renderImage !== 'function') {
      return Promise.reject(new Error('share pipeline not loaded'));
    }
    return window.PDXReceipts.renderImage(card);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SHARE AFFORDANCE  ·  markup + fail-closed hydration
  // ──────────────────────────────────────────────────────────────────────────
  // A host surface must not decide for itself whether a card is shareable: to do
  // that it would have to re-implement the guards, and a second copy of a guard is
  // a guard that drifts. So both the markup and the eligibility check live here,
  // beside the guards themselves.
  //
  //   buttonHtml(opts) → a button that renders HIDDEN and marked pending. It
  //                      promises nothing until this module has built the card.
  //   hydrate(root)    → warms each pid once, then for every pending button either
  //                      REVEALS it (a card exists and passed every guard) or
  //                      REMOVES it from the DOM (no card).
  //
  // Fail closed in the literal sense: the default state of the affordance is
  // invisible. If the record never arrives, the fetch fails, or any guard blocks,
  // the reader is never offered a share that cannot be honoured — and the host
  // surface never has to know which guard said no.
  // ══════════════════════════════════════════════════════════════════════════
  var _ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function escA(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return _ESC[c]; });
  }

  // opts: { pid, issueKey, measure, block, stopKeys }
  //   issueKey → the card for that one issue (profile row, gap sheet)
  //   measure  → the omnibus split card for that bill (H.R. 1 Showcase)
  //   block    → full-width, for a mobile bottom sheet
  //   stopKeys → the host row is itself keyboard-activatable, so keep Enter/Space
  //              on this button from bubbling into the row's own handler
  function buttonHtml(opts) {
    opts = opts || {};
    if (!opts.pid) return '';
    return '<button type="button" class="pdxrc-share-btn' + (opts.block ? ' pdxrc-block' : '') + '"' +
      ' hidden data-pdxrc-pending="1"' +
      ' data-pid="' + escA(opts.pid) + '"' +
      (opts.issueKey ? ' data-issue="' + escA(opts.issueKey) + '"' : '') +
      (opts.measure ? ' data-measure="' + escA(opts.measure) + '"' : '') +
      (opts.stopKeys ? ' onkeydown="event.stopPropagation()"' : '') +
      ' aria-label="Share this Official Record card as an image">' +
      '<span class="pdxrc-ico" aria-hidden="true">🏛️</span>' +
      '<span class="pdxrc-lbl">Share</span></button>';
  }

  // The one place a button's attributes are turned into a card, used by BOTH the
  // hydrator and the click delegate — so what a button reveals and what it shares
  // can never be two different things.
  function cardForButton(btn) {
    if (!btn) return null;
    var pid = btn.getAttribute('data-pid');
    if (!pid) return null;
    var iss = btn.getAttribute('data-issue') || '';
    var num = btn.getAttribute('data-measure') || '';
    if (num) return omnibus(pid, num);
    return iss ? find(pid, iss) : find(pid);
  }

  function dropBtn(btn) { if (btn && btn.parentNode) btn.parentNode.removeChild(btn); }

  function revealBtn(btn, card) {
    var omni = card.verdict.key === 'omnibus';
    // What the reader is about to send, named on the control itself. The bill
    // number and the issue are the two things that make the image checkable, so
    // they are what the tooltip and the accessible name say.
    var what = [card.measureNumber, card.issue && card.issue.label].filter(Boolean).join(' · ');
    btn.classList.add('pdxrc-' + card.verdict.cls);
    btn.innerHTML = '<span class="pdxrc-ico" aria-hidden="true">' + (omni ? '⇅' : '🏛️') + '</span>' +
      '<span class="pdxrc-lbl">' + escA(omni ? 'Share this split vote' : 'Share this vote') + '</span>';
    btn.setAttribute('title', 'Share ' + (what || 'this vote') +
      ' as an image — the card prints the bill, the question, the vote, the date, the source URL and how it was judged.');
    btn.setAttribute('aria-label', 'Share ' + (what || 'this vote') + ' as an Official Record image');
    btn.removeAttribute('data-pdxrc-pending');
    btn.removeAttribute('hidden');
  }

  // Resolves to the number of buttons revealed. Safe to call on every repaint: a
  // button is only ever looked at while it still carries data-pdxrc-pending.
  function hydrate(root) {
    var scope = root || document;
    var list = null;
    try { list = scope.querySelectorAll('.pdxrc-share-btn[data-pdxrc-pending]'); } catch (e) { list = null; }
    if (!list || !list.length) return Promise.resolve(0);
    var byPid = {}, i, p;
    for (i = 0; i < list.length; i++) {
      p = list[i].getAttribute('data-pid');
      if (!p) { dropBtn(list[i]); continue; }
      (byPid[p] = byPid[p] || []).push(list[i]);
    }
    var shown = 0;
    var pids = Object.keys(byPid);
    return Promise.all(pids.map(function (pid) {
      return warm(pid).then(null, function () { return null; }).then(function () {
        byPid[pid].forEach(function (btn) {
          if (!btn.parentNode) return;
          var card = null;
          try { card = cardForButton(btn); } catch (e) { card = null; }
          if (card) { revealBtn(btn, card); shown++; } else dropBtn(btn);
        });
      });
    })).then(function () { return shown; });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ONE-TAP BUTTON DELEGATE + DEEP LINK
  // ──────────────────────────────────────────────────────────────────────────
  // `.pdxrc-share-btn[data-pid]` (optionally with data-issue / data-measure)
  // shares a vote-derived card. Bound once, at the document level, like the
  // Say-vs-Do delegate it sits beside.
  //
  // #record=<pid>~<issueKey> lands a reader on the Official Record gap view for
  // that exact (member, issue) — PDXConsistency.openGap, the surface that shows
  // the vote, its question and its source. It deliberately does NOT open the
  // Say-vs-Do receipt lightbox: a formal legislative action must not appear on a
  // Say-vs-Do surface, and a card that linked there would breach the same
  // boundary it was built to respect.
  // ══════════════════════════════════════════════════════════════════════════
  function bindDelegate() {
    if (window._pdxrcBound) return;
    window._pdxrcBound = true;
    document.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest && e.target.closest('.pdxrc-share-btn');
      if (!btn) return;
      e.preventDefault(); e.stopPropagation();
      var pid = btn.getAttribute('data-pid');
      if (!pid) return;
      var go = function () {
        var card = cardForButton(btn);
        if (card) return doShare(card, btn);
        return share(pid, btn);
      };
      if (recordsFor(canonPid(pid))) go(); else warm(pid).then(go);
    }, true);
  }

  // Every card prints `politidex.fyi/#methodology` as its visible method link, so
  // that hash has to LAND somewhere: before this, it resolved to the homepage with a
  // fragment nothing read, which makes the most important promise on the card — that
  // you can check how it was judged — the one promise it failed to keep. Handled here
  // rather than in consistency.js because this is the module that prints the link.
  var _methodTries = 0;
  function openMethodSheet() {
    try {
      if (window.PDXConsistency && typeof window.PDXConsistency.openMethodology === 'function') {
        // 'cards' focuses the row that states the share-card rules specifically —
        // the question a reader who tapped the card's method line actually asked.
        window.PDXConsistency.openMethodology('cards');
        return true;
      }
    } catch (e) {}
    return false;
  }
  function handleMethodHash(retry) {
    if (!/^#methodolog/i.test(String(location.hash || ''))) { _methodTries = 0; return false; }
    if (!retry) _methodTries = 0;
    if (openMethodSheet()) { _methodTries = 0; return true; }
    // A reader arriving cold from a shared image may beat consistency.js to the DOM.
    if (_methodTries++ < 20) setTimeout(function () { handleMethodHash(true); }, 250);
    return true;
  }

  var _hashTries = 0;
  function handleHash(retry) {
    var m = (location.hash || '').match(/^#record=([^~&]+)(?:~([^&]+))?/);
    if (!m) { _hashTries = 0; return; }
    var pid = '', iss = '';
    try { pid = decodeURIComponent(m[1]); } catch (e) { pid = m[1]; }
    try { iss = m[2] ? decodeURIComponent(m[2]) : ''; } catch (e) { iss = m[2] || ''; }
    if (!retry) _hashTries = 0;
    var open = function () {
      if (window.PDXConsistency && typeof window.PDXConsistency.openGap === 'function' && iss) {
        window.PDXConsistency.openGap(pid, iss);
        return true;
      }
      if (typeof window.showProfile === 'function') { window.showProfile(pid); return true; }
      return false;
    };
    // The record arrives asynchronously, so an unresolved link retries briefly
    // rather than flashing an empty view — the same contract say-vs-do.js uses.
    if (recordsFor(canonPid(pid)) && open()) { _hashTries = 0; return; }
    if (_hashTries === 0) { try { warm(pid); } catch (e) {} }
    if (_hashTries++ < 10) setTimeout(function () { handleHash(true); }, 700);
    else open();
  }

  window.PDXReceiptCards = {
    // reads
    cardsFor: cardsFor,
    contradiction: contradiction,
    consistency: consistency,
    omnibus: omnibus,
    find: find,
    audit: audit,
    // actions
    warm: warm,
    share: share,
    renderImage: renderImage,
    // share affordance — the ONLY way a host surface should offer a share, so the
    // guards decide what is offered rather than each surface guessing.
    buttonHtml: buttonHtml,
    hydrate: hydrate,
    // exposed so scripts/test-receipt-cards.mjs can assert on the guards
    // themselves rather than only on their effects, and so a future reader can
    // see the exclusion list without reading the whole file.
    guards: {
      blockRecord: blockRecord,
      blockIssue: blockIssue,
      blockStance: blockStance,
      blockCitation: blockCitation,
      blockUnverifiedCitation: blockUnverifiedCitation,
      unresolvedCitations: UNRESOLVED_CITATIONS,
      blockPlainEffect: blockPlainEffect,
      blockDuplicateIdentity: blockDuplicateIdentity,
      stableVerdict: stableVerdict,
      wave1Hold: wave1Hold,
      blockedMeasureTypes: BLOCKED_MEASURE_TYPES,
      blockedIssueKeys: BLOCKED_ISSUE_KEYS,
      wave1HoldIssueKeys: WAVE1_HOLD_ISSUE_KEYS,
      restraintPids: AFP_RESTRAINT_PIDS
    },
    VERDICTS: VERDICTS,
    METHOD_URL: METHOD_URL,
    // pure, testable pieces
    canonicalCitation: canonicalCitation,
    isDisapproval: isDisapproval,
    yeaEffect: yeaEffect,
    tidyRemainder: tidyRemainder,
    proofLine: proofLine,
    splitFor: splitFor,
    candidates: candidates,
    // The arrival half of a share. A card's `hash` is what travels; handleHash is
    // what the recipient's browser runs when they tap it. Exposed so
    // scripts/test-receipt-cards.mjs can assert the round trip on the real router
    // — card.hash in, openGap(pid, issue) out, same pid and same issue — instead
    // of trusting that the two halves were written to agree.
    handleHash: handleHash
  };

  function boot() {
    try { bindDelegate(); } catch (e) {}
    try { handleMethodHash(); } catch (e) {}
    try { handleHash(); } catch (e) {}
    window.addEventListener('hashchange', function () {
      try { handleMethodHash(); } catch (e) {}
      try { handleHash(); } catch (e) {}
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
